// src/modules/code-optimizer/report-generator.ts

/**
 * Report Generator for Code Optimizer
 *
 * Generates formatted markdown reports for optimization sessions.
 * Integrates with Documents module for registration and Memory for storage.
 *
 * License gating:
 * - Free (dev): Basic report with current metrics and hotspots
 * - Team/Enterprise: Advanced sections (Tech Debt Summary, Before vs After, ROI notes)
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  GenerateReportInput,
  GenerateReportOutput,
  ReportSection,
  MetricsOutput,
  HotspotsOutput,
  RefactorPlanOutput,
  ScanRepositoryOutput,
} from './types.js';
import { SessionStorage, type SessionSnapshot } from './session-storage.js';
import {
  generateTechDebtIndexSection,
  generateTechDebtSummary,
  generateBeforeAfterSection,
  generateROISection,
  generateUpgradePrompt,
} from './report-sections-advanced.js';

// ═══════════════════════════════════════════════════════════════
//                      LICENSE INTEGRATION
// ═══════════════════════════════════════════════════════════════

import {
  getCurrentTier,
  hasFeature,
  Features,
  type LicenseTier,
} from '../../core/license-integration.js';

/**
 * Check if a tier has access to advanced reports
 * Uses the license gateway to check feature access
 */
function hasAdvancedReports(): boolean {
  return hasFeature(Features.ADVANCED_REPORTS);
}

/**
 * Get current license tier from gateway
 */
function getCurrentLicenseTier(): LicenseTier {
  return getCurrentTier();
}

// ═══════════════════════════════════════════════════════════════
//                      REPORT GENERATOR
// ═══════════════════════════════════════════════════════════════

/**
 * Generate a formatted markdown report for an optimization session
 */
export function generateReport(
  input: GenerateReportInput,
  projectRoot: string,
  previousSession?: SessionSnapshot | null
): GenerateReportOutput {
  const sections: ReportSection[] = [];
  const date = new Date().toISOString().split('T')[0];
  const repoName = input.repoName || path.basename(projectRoot);

  // Check license tier for advanced features
  const licenseTier = getCurrentLicenseTier();
  const isAdvanced = hasAdvancedReports();

  // Header
  sections.push({
    title: 'header',
    content: generateHeader(input.sessionId, repoName, date, input.strategy || 'mixed', licenseTier),
  });

  // Overview Section
  if (input.scanResult) {
    sections.push({
      title: 'Overview',
      content: generateOverviewSection(input.scanResult),
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // TEAM+ ADVANCED SECTIONS: Tech Debt Index + Summary + Before vs After
  // ═══════════════════════════════════════════════════════════════
  if (isAdvanced && input.hotspots && input.metricsBefore && input.scanResult) {
    // Initialize session storage for trend data
    const sessionStorage = new SessionStorage(projectRoot);

    // Tech Debt Index (Team+ only)
    sections.push({
      title: 'Tech Debt Index',
      content: generateTechDebtIndexSection(
        input.hotspots,
        input.metricsBefore,
        input.scanResult,
        previousSession,
        sessionStorage,
        repoName
      ),
    });

    // Tech Debt Summary (Team+ only)
    sections.push({
      title: 'Tech Debt Summary',
      content: generateTechDebtSummary(input.hotspots, input.metricsBefore, previousSession),
    });

    // Before vs After comparison (Team+ only, when previous session exists)
    if (previousSession) {
      sections.push({
        title: 'Before vs After',
        content: generateBeforeAfterSection(previousSession, input.hotspots, input.metricsBefore),
      });
    }

    // Trend Chart (Team+ only, when multiple sessions exist)
    const trendChart = sessionStorage.generateTrendChart(repoName, 5);
    if (!trendChart.includes('Not enough data')) {
      sections.push({
        title: 'Trend',
        content: `## Trend\n\n${trendChart}`,
      });
    }
  }

  // Metrics Section (basic for all, enhanced for Team+)
  if (input.metricsBefore || input.metricsAfter) {
    sections.push({
      title: 'Metrics',
      content: generateMetricsSection(input.metricsBefore, input.metricsAfter),
    });
  }

  // Hotspots Section
  if (input.hotspots) {
    sections.push({
      title: 'Hotspots',
      content: generateHotspotsSection(input.hotspots),
    });
  }

  // Files Changed
  if (input.filesChanged && input.filesChanged.length > 0) {
    sections.push({
      title: 'Files Changed',
      content: generateFilesChangedSection(input.filesChanged, input.changesDescription),
    });
  }

  // Refactor Plan Summary
  if (input.refactorPlan) {
    sections.push({
      title: 'Refactor Plan',
      content: generateRefactorPlanSection(input.refactorPlan),
    });
  }

  // Test Results
  if (input.testsStatus) {
    sections.push({
      title: 'Test Results',
      content: generateTestResultsSection(input),
    });
  }

  // Next Iterations
  sections.push({
    title: 'Next Steps',
    content: generateNextStepsSection(input.hotspots),
  });

  // ROI Notes (Team+ only)
  if (isAdvanced && previousSession) {
    sections.push({
      title: 'ROI Notes',
      content: generateROISection(previousSession, input.hotspots, input.metricsBefore),
    });
  }

  // Free tier upgrade prompt
  if (!isAdvanced) {
    sections.push({
      title: 'Upgrade',
      content: generateUpgradePrompt(),
    });
  }

  // Footer
  sections.push({
    title: 'footer',
    content: generateFooter(licenseTier),
  });

  // Combine all sections
  const markdown = sections.map((s) => s.content).join('\n\n');

  // Calculate summary
  const summary = calculateSummary(input);

  // Determine output path
  const outputPath =
    input.outputPath || `docs/reports/optimization-${date}-${input.sessionId}.md`;
  const fullPath = path.join(projectRoot, outputPath);

  // Ensure directory exists
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write report
  fs.writeFileSync(fullPath, markdown, 'utf-8');

  return {
    success: true,
    reportPath: outputPath,
    markdown,
    sections,
    summary,
  };
}

// ═══════════════════════════════════════════════════════════════
//                      SECTION GENERATORS
// ═══════════════════════════════════════════════════════════════

function generateHeader(
  sessionId: string,
  repoName: string,
  date: string,
  strategy: string,
  licenseTier: LicenseTier
): string {
  const tierBadge = licenseTier === 'dev' ? '' : ` | **${licenseTier.toUpperCase()}** License`;
  return `# Code Guardian Optimization Report

**Repository**: ${repoName}
**Session ID**: ${sessionId}
**Date**: ${date}
**Strategy**: ${strategy}${tierBadge}

---`;
}

function generateOverviewSection(scan: ScanRepositoryOutput): string {
  return `## Overview

| Metric | Value |
|--------|-------|
| Total Files | ${scan.totalFiles.toLocaleString()} |
| Total Lines (approx) | ${scan.totalLinesApprox.toLocaleString()} |
| Root Path | \`${scan.rootPath}\` |

### Top Large Files
${scan.topLargeFiles
  .slice(0, 5)
  .map((f, i) => `${i + 1}. \`${f.path}\` (~${f.linesApprox.toLocaleString()} lines)`)
  .join('\n')}`;
}

function generateMetricsSection(
  before?: MetricsOutput,
  after?: MetricsOutput
): string {
  if (!before && !after) {
    return '## Metrics\n\n_No metrics data available._';
  }

  let content = '## Metrics\n\n';

  if (before && after) {
    // Before/After comparison
    const complexityChange = calculatePercentChange(
      before.aggregate.avgComplexityScore,
      after.aggregate.avgComplexityScore
    );
    const linesChange = calculatePercentChange(
      before.aggregate.totalLines,
      after.aggregate.totalLines
    );

    content += `### Comparison (Before → After)

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Files Analyzed | ${before.aggregate.totalFiles} | ${after.aggregate.totalFiles} | - |
| Total Lines | ${before.aggregate.totalLines.toLocaleString()} | ${after.aggregate.totalLines.toLocaleString()} | ${linesChange} |
| Avg Complexity | ${before.aggregate.avgComplexityScore.toFixed(1)} | ${after.aggregate.avgComplexityScore.toFixed(1)} | ${complexityChange} |
| TODOs | ${before.aggregate.totalTodos} | ${after.aggregate.totalTodos} | ${after.aggregate.totalTodos - before.aggregate.totalTodos} |
| FIXMEs | ${before.aggregate.totalFixmes} | ${after.aggregate.totalFixmes} | ${after.aggregate.totalFixmes - before.aggregate.totalFixmes} |`;
  } else {
    const metrics = before || after!;
    content += `### Current Metrics

| Metric | Value |
|--------|-------|
| Files Analyzed | ${metrics.aggregate.totalFiles} |
| Total Lines | ${metrics.aggregate.totalLines.toLocaleString()} |
| Code Lines | ${metrics.aggregate.totalCodeLines.toLocaleString()} |
| Avg Complexity | ${metrics.aggregate.avgComplexityScore.toFixed(1)} |
| TODOs | ${metrics.aggregate.totalTodos} |
| FIXMEs | ${metrics.aggregate.totalFixmes} |`;
  }

  return content;
}

function generateHotspotsSection(hotspots: HotspotsOutput): string {
  if (hotspots.hotspots.length === 0) {
    return '## Hotspots\n\n_No hotspots detected._';
  }

  let content = `## Hotspots

**Total Analyzed**: ${hotspots.summary.totalAnalyzed}
**Hotspots Found**: ${hotspots.summary.hotspotsFound}
**Top Reason**: ${hotspots.summary.topReason}

| Rank | File | Score | Reasons | Suggested |
|------|------|-------|---------|-----------|
`;

  for (const h of hotspots.hotspots.slice(0, 10)) {
    content += `| #${h.rank} | \`${h.path}\` | ${h.score.toFixed(1)} | ${h.reasons.slice(0, 2).join(', ')} | ${h.suggestedGoal} |\n`;
  }

  return content;
}

function generateFilesChangedSection(
  filesChanged: string[],
  descriptions?: string[]
): string {
  let content = `## Files Changed

**Total**: ${filesChanged.length} files

`;

  for (let i = 0; i < filesChanged.length; i++) {
    const file = filesChanged[i];
    const desc = descriptions?.[i] || '';
    content += `- \`${file}\`${desc ? ` - ${desc}` : ''}\n`;
  }

  return content;
}

function generateRefactorPlanSection(plan: RefactorPlanOutput): string {
  let content = `## Refactor Plan Summary

**Total Files**: ${plan.summary.totalFiles}
**Total Steps**: ${plan.summary.totalSteps}
**High-Risk Steps**: ${plan.summary.highRiskSteps}
**Estimated Effort**: ${plan.summary.estimatedTotalEffort}

### Workflow Phases
\`${plan.workflow.phases.join(' → ')}\`

### Files in Plan
`;

  for (const fp of plan.plan.slice(0, 10)) {
    content += `\n#### ${fp.file}
- **Goal**: ${fp.goal}
- **Priority**: ${fp.priority}
- **Effort**: ${fp.estimatedEffort}
- **Steps**: ${fp.steps.length}
`;
  }

  return content;
}

function generateTestResultsSection(input: GenerateReportInput): string {
  const statusEmoji = {
    passed: '✅',
    failed: '❌',
    partial: '⚠️',
    skipped: '⏭️',
  };

  let content = `## Test Results

**Status**: ${statusEmoji[input.testsStatus!]} ${input.testsStatus!.toUpperCase()}
`;

  if (input.testsPassed !== undefined || input.testsFailed !== undefined) {
    content += `
| Passed | Failed |
|--------|--------|
| ${input.testsPassed || 0} | ${input.testsFailed || 0} |
`;
  }

  if (input.testsRun && input.testsRun.length > 0) {
    content += `\n### Tests Run\n`;
    for (const test of input.testsRun.slice(0, 10)) {
      content += `- \`${test}\`\n`;
    }
  }

  return content;
}

function generateNextStepsSection(hotspots?: HotspotsOutput): string {
  let content = `## Next Steps

### Recommended Iterations

`;

  if (hotspots && hotspots.hotspots.length > 0) {
    const remaining = hotspots.hotspots.slice(0, 5);
    content += `Based on remaining hotspots:\n\n`;
    for (const h of remaining) {
      content += `1. **${h.path}** (score: ${h.score.toFixed(1)})\n   - Goal: ${h.suggestedGoal}\n   - Reasons: ${h.reasons.join(', ')}\n\n`;
    }
  } else {
    content += `- Run \`code_quick_analysis\` periodically to monitor code health\n`;
    content += `- Set up pre-commit hooks to catch complexity increases\n`;
    content += `- Consider adding more tests to high-complexity areas\n`;
  }

  return content;
}

function generateFooter(licenseTier: LicenseTier): string {
  const tierNote = licenseTier === 'dev'
    ? '\n\n*Free tier - Upgrade to Team for advanced reports*'
    : `\n\n*${licenseTier.charAt(0).toUpperCase() + licenseTier.slice(1)} license - Thank you for your support!*`;

  return `---

*Generated by Code Guardian Studio v3.1 - Code Optimizer Module*

*Report generated on: ${new Date().toISOString()}*${tierNote}`;
}

// ═══════════════════════════════════════════════════════════════
//                      HELPERS
// ═══════════════════════════════════════════════════════════════

function calculatePercentChange(before: number, after: number): string {
  if (before === 0) return 'N/A';
  const change = ((after - before) / before) * 100;
  const sign = change > 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}

function calculateSummary(input: GenerateReportInput): GenerateReportOutput['summary'] {
  const summary: GenerateReportOutput['summary'] = {
    hotspotsAnalyzed: input.hotspots?.summary.hotspotsFound || 0,
    filesChanged: input.filesChanged?.length || 0,
    testsStatus: input.testsStatus,
  };

  // Calculate complexity reduction
  if (input.metricsBefore && input.metricsAfter) {
    const complexityBefore = input.metricsBefore.aggregate.avgComplexityScore;
    const complexityAfter = input.metricsAfter.aggregate.avgComplexityScore;
    summary.complexityReduction = calculatePercentChange(complexityBefore, complexityAfter);

    const linesBefore = input.metricsBefore.aggregate.totalLines;
    const linesAfter = input.metricsAfter.aggregate.totalLines;
    summary.linesReduction = calculatePercentChange(linesBefore, linesAfter);
  }

  return summary;
}
