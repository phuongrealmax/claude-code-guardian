// src/modules/code-optimizer/report-generator.ts

/**
 * Report Generator for Code Optimizer
 *
 * Generates formatted markdown reports for optimization sessions.
 * Integrates with Documents module for registration and Memory for storage.
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

// ═══════════════════════════════════════════════════════════════
//                      REPORT GENERATOR
// ═══════════════════════════════════════════════════════════════

/**
 * Generate a formatted markdown report for an optimization session
 */
export function generateReport(
  input: GenerateReportInput,
  projectRoot: string,
  previousSession?: any | null
): GenerateReportOutput {
  const sections: ReportSection[] = [];
  const date = new Date().toISOString().split('T')[0];
  const repoName = input.repoName || path.basename(projectRoot);

  // Header
  sections.push({
    title: 'header',
    content: generateHeader(input.sessionId, repoName, date, input.strategy || 'mixed'),
  });

  // Overview Section
  if (input.scanResult) {
    sections.push({
      title: 'Overview',
      content: generateOverviewSection(input.scanResult),
    });
  }

  // Metrics Comparison (Before/After)
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

  // Footer
  sections.push({
    title: 'footer',
    content: generateFooter(),
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
  strategy: string
): string {
  return `# Guardian Optimization Report

**Repository**: ${repoName}
**Session ID**: ${sessionId}
**Date**: ${date}
**Strategy**: ${strategy}

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

function generateFooter(): string {
  return `---

*Generated by Claude Code Guardian v3.1 - Code Optimizer Module*

*Report generated on: ${new Date().toISOString()}*`;
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
