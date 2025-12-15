// src/modules/code-optimizer/report-sections-advanced.ts

/**
 * Advanced Report Sections for Team/Enterprise License
 *
 * Extracted from report-generator.ts for better modularity.
 */

import { MetricsOutput, HotspotsOutput } from './types.js';
import { SessionStorage, type SessionSnapshot } from './session-storage.js';

// ═══════════════════════════════════════════════════════════════
//                  TECH DEBT INDEX SECTION
// ═══════════════════════════════════════════════════════════════

export function generateTechDebtIndexSection(
  currentHotspots: HotspotsOutput,
  currentMetrics: MetricsOutput,
  scanResult: { totalLinesApprox: number },
  previousSession: SessionSnapshot | null | undefined,
  sessionStorage: SessionStorage,
  repoName: string
): string {
  // Calculate current Tech Debt Index
  const highComplexityFiles = currentMetrics.files.filter(f => f.complexityScore > 50).length;
  const largeFiles = currentMetrics.files.filter(f => f.lines > 500).length;
  const totalHotspotScore = currentHotspots.hotspots.reduce((sum, h) => sum + h.score, 0);

  const currentIndex = sessionStorage.calculateTechDebtIndex(
    currentHotspots.summary.hotspotsFound,
    totalHotspotScore,
    currentMetrics.aggregate.avgComplexityScore,
    highComplexityFiles,
    largeFiles,
    currentMetrics.files.length,
    scanResult.totalLinesApprox
  );

  // Get grade
  const { grade, gradeEmoji, interpretation } = getTechDebtGrade(currentIndex);

  let content = `## Tech Debt Index

> Your codebase health at a glance (Team/Enterprise feature)

### Current Score

| ${gradeEmoji} Grade **${grade}** | Index: **${currentIndex}/100** |
|:---:|:---:|

*${interpretation}*

`;

  // Calculate component breakdown
  const breakdown = calculateScoreBreakdown(
    currentHotspots,
    currentMetrics,
    scanResult,
    totalHotspotScore,
    highComplexityFiles,
    largeFiles
  );

  content += `### Score Breakdown

| Component | Score | Max | Description |
|-----------|-------|-----|-------------|
| Hotspots | ${breakdown.hotspotComponent} | 40 | Based on hotspot count and total score |
| Complexity | ${breakdown.complexityComponent} | 30 | Based on avg complexity and high-complexity files |
| File Size | ${breakdown.sizeComponent} | 20 | Based on large file ratio |
| Debt Density | ${breakdown.densityComponent} | 10 | Hotspots per 1000 LOC |
| **Total** | **${currentIndex}** | **100** | Lower is better |

`;

  // Show delta if previous session exists
  if (previousSession && previousSession.summary.techDebtIndex !== undefined) {
    const prevIndex = previousSession.summary.techDebtIndex;
    const delta = currentIndex - prevIndex;
    const deltaEmoji = delta < 0 ? '📉' : delta > 0 ? '📈' : '➡️';
    const deltaText = delta < 0 ? 'improved' : delta > 0 ? 'increased' : 'unchanged';

    content += `### Change from Previous

| Previous | Current | Delta |
|----------|---------|-------|
| ${prevIndex} | ${currentIndex} | ${deltaEmoji} ${delta > 0 ? '+' : ''}${delta} (${deltaText}) |

`;
  }

  return content;
}

function getTechDebtGrade(index: number): { grade: string; gradeEmoji: string; interpretation: string } {
  if (index <= 20) {
    return {
      grade: 'A',
      gradeEmoji: '🟢',
      interpretation: 'Excellent! Your codebase is well-maintained with minimal tech debt.',
    };
  } else if (index <= 40) {
    return {
      grade: 'B',
      gradeEmoji: '🟢',
      interpretation: 'Good condition. A few areas could use attention, but overall healthy.',
    };
  } else if (index <= 60) {
    return {
      grade: 'C',
      gradeEmoji: '🟡',
      interpretation: 'Fair. Tech debt is accumulating - consider allocating time for cleanup.',
    };
  } else if (index <= 80) {
    return {
      grade: 'D',
      gradeEmoji: '🟠',
      interpretation: 'Poor. Significant tech debt is impacting maintainability. Prioritize refactoring.',
    };
  } else {
    return {
      grade: 'F',
      gradeEmoji: '🔴',
      interpretation: 'Critical! High tech debt is likely causing bugs and slowing development.',
    };
  }
}

function calculateScoreBreakdown(
  currentHotspots: HotspotsOutput,
  currentMetrics: MetricsOutput,
  scanResult: { totalLinesApprox: number },
  totalHotspotScore: number,
  highComplexityFiles: number,
  largeFiles: number
): {
  hotspotComponent: number;
  complexityComponent: number;
  sizeComponent: number;
  densityComponent: number;
} {
  const hotspotCountScore = Math.min(currentHotspots.summary.hotspotsFound / 20, 1) * 20;
  const hotspotScoreComponent = Math.min(totalHotspotScore / 1000, 1) * 20;
  const hotspotComponent = Math.round(hotspotCountScore + hotspotScoreComponent);

  const complexityBase = Math.min(Math.max(currentMetrics.aggregate.avgComplexityScore - 20, 0) / 30, 1) * 15;
  const highComplexityPenalty = Math.min(highComplexityFiles / 10, 1) * 15;
  const complexityComponent = Math.round(complexityBase + highComplexityPenalty);

  const largeFileRatio = currentMetrics.files.length > 0 ? largeFiles / currentMetrics.files.length : 0;
  const sizeComponent = Math.round(Math.min(largeFileRatio * 4, 1) * 20);

  const debtDensity = scanResult.totalLinesApprox > 0
    ? (currentHotspots.summary.hotspotsFound / (scanResult.totalLinesApprox / 1000))
    : 0;
  const densityComponent = Math.round(Math.min(debtDensity / 5, 1) * 10);

  return { hotspotComponent, complexityComponent, sizeComponent, densityComponent };
}

// ═══════════════════════════════════════════════════════════════
//                  TECH DEBT SUMMARY SECTION
// ═══════════════════════════════════════════════════════════════

export function generateTechDebtSummary(
  currentHotspots: HotspotsOutput,
  currentMetrics: MetricsOutput,
  previousSession?: SessionSnapshot | null
): string {
  let content = `## Tech Debt Summary

> This section is available with Team/Enterprise license.

`;

  const currentHotspotCount = currentHotspots.summary.hotspotsFound;
  const currentTotalScore = currentHotspots.hotspots.reduce((sum, h) => sum + h.score, 0);
  const currentHighComplexityFiles = currentMetrics.files.filter(f => f.complexityScore > 50).length;
  const currentLargeFiles = currentMetrics.files.filter(f => f.lines > 500).length;

  if (previousSession) {
    content += generateComparisonTable(
      previousSession,
      currentHotspotCount,
      currentTotalScore,
      currentHighComplexityFiles,
      currentLargeFiles
    );
  } else {
    content += `### Current State

| Metric | Value |
|--------|-------|
| Total Hotspots | ${currentHotspotCount} |
| Total Hotspot Score | ${currentTotalScore.toFixed(0)} |
| High-complexity files (>50) | ${currentHighComplexityFiles} |
| Large files (>500 LOC) | ${currentLargeFiles} |

*This is your first analysis. Run another analysis after making improvements to see progress!*
`;
  }

  return content;
}

function generateComparisonTable(
  previousSession: SessionSnapshot,
  currentHotspotCount: number,
  currentTotalScore: number,
  currentHighComplexityFiles: number,
  currentLargeFiles: number
): string {
  const prevHotspotCount = previousSession.summary.totalHotspots;
  const prevTotalScore = previousSession.hotspots.hotspots.reduce((sum, h) => sum + h.score, 0);
  const prevHighComplexityFiles = previousSession.metrics.files.filter((f: any) => f.complexityScore > 50).length;
  const prevLargeFiles = previousSession.metrics.files.filter((f: any) => f.lines > 500).length;

  const formatDelta = (delta: number): string => {
    if (delta === 0) return '—';
    const sign = delta > 0 ? '+' : '';
    const color = delta > 0 ? '🔴' : '🟢';
    return `${color} ${sign}${delta}`;
  };

  const formatPercent = (prev: number, curr: number): string => {
    if (prev === 0) return 'N/A';
    const pct = ((curr - prev) / prev) * 100;
    const sign = pct > 0 ? '+' : '';
    return `${sign}${pct.toFixed(0)}%`;
  };

  const hotspotDelta = currentHotspotCount - prevHotspotCount;
  const scoreDelta = currentTotalScore - prevTotalScore;
  const complexityDelta = currentHighComplexityFiles - prevHighComplexityFiles;
  const sizeDelta = currentLargeFiles - prevLargeFiles;

  return `### Comparison with Previous Session

| Metric | Previous | Current | Delta | Change |
|--------|----------|---------|-------|--------|
| Hotspots | ${prevHotspotCount} | ${currentHotspotCount} | ${formatDelta(hotspotDelta)} | ${formatPercent(prevHotspotCount, currentHotspotCount)} |
| Total Score | ${prevTotalScore.toFixed(0)} | ${currentTotalScore.toFixed(0)} | ${formatDelta(Math.round(scoreDelta))} | ${formatPercent(prevTotalScore, currentTotalScore)} |
| High-complexity files (>50) | ${prevHighComplexityFiles} | ${currentHighComplexityFiles} | ${formatDelta(complexityDelta)} | ${formatPercent(prevHighComplexityFiles, currentHighComplexityFiles)} |
| Large files (>500 LOC) | ${prevLargeFiles} | ${currentLargeFiles} | ${formatDelta(sizeDelta)} | ${formatPercent(prevLargeFiles, currentLargeFiles)} |

*Previous session: ${previousSession.sessionId} (${new Date(previousSession.timestamp).toLocaleDateString()})*
`;
}

// ═══════════════════════════════════════════════════════════════
//                  BEFORE VS AFTER SECTION
// ═══════════════════════════════════════════════════════════════

export function generateBeforeAfterSection(
  previousSession: SessionSnapshot,
  currentHotspots: HotspotsOutput,
  currentMetrics: MetricsOutput
): string {
  let content = `## Before vs After

> Track your progress over time with session comparisons.

`;

  const prevDate = new Date(previousSession.timestamp).toLocaleDateString();
  const currDate = new Date().toLocaleDateString();

  content += `| Aspect | Before (${prevDate}) | After (${currDate}) |
|--------|----------------------|---------------------|
| Files Analyzed | ${previousSession.summary.filesAnalyzed} | ${currentMetrics.files.length} |
| Avg Complexity | ${previousSession.summary.avgComplexity.toFixed(1)} | ${currentMetrics.aggregate.avgComplexityScore.toFixed(1)} |
| Hotspots | ${previousSession.summary.totalHotspots} | ${currentHotspots.summary.hotspotsFound} |
| Top Hotspot Score | ${previousSession.summary.topHotspotScore.toFixed(1)} | ${currentHotspots.hotspots[0]?.score.toFixed(1) || 0} |
`;

  // Highlight improvements
  const complexityImproved = currentMetrics.aggregate.avgComplexityScore < previousSession.summary.avgComplexity;
  const hotspotsReduced = currentHotspots.summary.hotspotsFound < previousSession.summary.totalHotspots;

  if (complexityImproved || hotspotsReduced) {
    content += `\n### Improvements\n\n`;
    if (complexityImproved) {
      const reduction = previousSession.summary.avgComplexity - currentMetrics.aggregate.avgComplexityScore;
      content += `- Complexity reduced by ${reduction.toFixed(1)} points\n`;
    }
    if (hotspotsReduced) {
      const reduction = previousSession.summary.totalHotspots - currentHotspots.summary.hotspotsFound;
      content += `- ${reduction} fewer hotspots\n`;
    }
  }

  return content;
}

// ═══════════════════════════════════════════════════════════════
//                  ROI SECTION
// ═══════════════════════════════════════════════════════════════

export function generateROISection(
  previousSession: SessionSnapshot,
  currentHotspots?: HotspotsOutput,
  currentMetrics?: MetricsOutput
): string {
  let content = `## ROI Notes

> Understand the business value of your optimization efforts.

`;

  if (!currentHotspots || !currentMetrics) {
    content += `_Complete an optimization session to see ROI estimates._\n`;
    return content;
  }

  const hotspotsReduced = previousSession.summary.totalHotspots - currentHotspots.summary.hotspotsFound;
  const complexityReduced = previousSession.summary.avgComplexity - currentMetrics.aggregate.avgComplexityScore;

  // Estimate time savings (very rough estimates)
  const estimatedHoursSaved = hotspotsReduced > 0 ? hotspotsReduced * 2 : 0;
  const estimatedReviewMinutes = complexityReduced > 0 ? complexityReduced * 15 : 0;

  content += `### Estimated Benefits

`;

  if (hotspotsReduced > 0) {
    content += `- **${hotspotsReduced} hotspots addressed**: Estimated ~${estimatedHoursSaved} hours of future maintenance avoided\n`;
  }

  if (complexityReduced > 0) {
    content += `- **Complexity reduced by ${complexityReduced.toFixed(1)}**: Easier code reviews, ~${Math.round(estimatedReviewMinutes)} minutes saved per review cycle\n`;
  }

  if (hotspotsReduced <= 0 && complexityReduced <= 0) {
    content += `- No measurable improvement yet. Continue addressing hotspots to see benefits.\n`;
  }

  content += `
### Tips for Maximizing ROI

1. **Focus on high-score hotspots first** - they represent the biggest maintenance burden
2. **Track progress weekly** - run \`ccg code-optimize --report\` regularly
3. **Set team goals** - aim to reduce total hotspot score by 20% per sprint
`;

  return content;
}

// ═══════════════════════════════════════════════════════════════
//                  UPGRADE PROMPT
// ═══════════════════════════════════════════════════════════════

export function generateUpgradePrompt(): string {
  return `## Unlock Advanced Reports

> **Upgrade to Team** for powerful insights:
>
> - **Tech Debt Summary**: Track hotspots, complexity, and file metrics over time
> - **Before vs After**: Visual comparisons between analysis sessions
> - **ROI Notes**: Estimate time and cost savings from your improvements
> - **Trend Analysis**: See your codebase health trajectory
>
> Visit [codeguardian.studio/pricing](https://codeguardian.studio/pricing) to upgrade.
>
> Or run \`ccg activate\` if you have a license key.
`;
}
