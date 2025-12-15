// src/core/dogfood-markdown.ts

/**
 * Dogfood Markdown Generator
 *
 * Markdown generation utilities for dogfood case study reports.
 * Extracted from dogfood-reporter.ts for better modularity.
 */

import { AggregatedAnalysis } from './dogfood-reporter.js';

// ═══════════════════════════════════════════════════════════════
//                      FORMATTING UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Get letter grade from index
 */
export function getGrade(index: number): string {
  if (index <= 20) return 'A';
  if (index <= 40) return 'B';
  if (index <= 60) return 'C';
  if (index <= 80) return 'D';
  return 'F';
}

/**
 * Format delta with sign
 */
export function formatDelta(delta: number, decimals: number = 0): string {
  const formatted = decimals > 0 ? delta.toFixed(decimals) : Math.round(delta).toString();
  if (delta > 0) return `+${formatted}`;
  if (delta < 0) return formatted;
  return '0';
}

/**
 * Format grade change
 */
export function formatGradeChange(before: string, after: string): string {
  if (before === after) return '-';
  return before > after ? `${before} -> ${after}` : `${before} -> ${after}`;
}

/**
 * Format trend for display
 */
export function formatTrend(trend: 'improving' | 'stable' | 'degrading'): string {
  switch (trend) {
    case 'improving': return 'Improving';
    case 'degrading': return 'Degrading';
    default: return 'Stable';
  }
}

/**
 * Get trend emoji
 */
export function getTrendEmoji(trend: 'improving' | 'stable' | 'degrading'): string {
  switch (trend) {
    case 'improving': return '\u2705';
    case 'degrading': return '\u26A0\uFE0F';
    default: return '\u27A1\uFE0F';
  }
}

/**
 * Get trend arrow for ASCII chart
 */
export function getTrendArrow(trend: 'improving' | 'stable' | 'degrading'): string {
  switch (trend) {
    case 'improving': return '\u2193';
    case 'degrading': return '\u2191';
    default: return '\u2192';
  }
}

// ═══════════════════════════════════════════════════════════════
//                      MARKDOWN GENERATORS
// ═══════════════════════════════════════════════════════════════

/**
 * Generate key improvements bullet points
 */
export function generateKeyImprovements(analysis: AggregatedAnalysis): string {
  const improvements: string[] = [];
  const { techDebtIndex, hotspots, complexity, files } = analysis;

  // Tech Debt Index improvement
  if (techDebtIndex.delta < 0) {
    improvements.push(
      `Tech Debt Index reduced by ${Math.abs(techDebtIndex.delta)} points (${Math.abs(techDebtIndex.percentChange).toFixed(1)}% improvement)`
    );
  }

  // Grade improvement
  if (techDebtIndex.latestGrade < techDebtIndex.initialGrade) {
    improvements.push(
      `Grade improved from ${techDebtIndex.initialGrade} to ${techDebtIndex.latestGrade}`
    );
  }

  // Hotspot reduction
  if (hotspots.delta < 0) {
    improvements.push(
      `Hotspots reduced from ${hotspots.initialCount} to ${hotspots.latestCount} (${Math.abs(hotspots.delta)} fewer)`
    );
  }

  // Score reduction
  if (hotspots.scoreReduction > 0) {
    improvements.push(
      `Total hotspot score reduced by ${hotspots.scoreReduction} points`
    );
  }

  // Complexity reduction
  if (complexity.delta < 0) {
    improvements.push(
      `Average complexity reduced by ${Math.abs(complexity.delta).toFixed(1)} (${Math.abs(complexity.percentChange).toFixed(1)}%)`
    );
  }

  // High-complexity files reduction
  const highComplexityDelta = files.latestHighComplexity - files.initialHighComplexity;
  if (highComplexityDelta < 0) {
    improvements.push(
      `High-complexity files reduced from ${files.initialHighComplexity} to ${files.latestHighComplexity}`
    );
  }

  // Large files reduction
  const largeFilesDelta = files.latestLargeFiles - files.initialLargeFiles;
  if (largeFilesDelta < 0) {
    improvements.push(
      `Large files (>500 LOC) reduced from ${files.initialLargeFiles} to ${files.latestLargeFiles}`
    );
  }

  if (improvements.length === 0) {
    // No improvements - note areas that got worse or stayed the same
    const concerns: string[] = [];

    if (techDebtIndex.delta > 5) {
      concerns.push(`Tech Debt Index increased by ${techDebtIndex.delta} points - investigate root cause`);
    }
    if (hotspots.delta > 0) {
      concerns.push(`Hotspot count increased by ${hotspots.delta} - new tech debt introduced`);
    }
    if (complexity.delta > 0) {
      concerns.push(`Average complexity increased by ${complexity.delta.toFixed(1)}`);
    }

    if (concerns.length > 0) {
      return '### Areas for Attention\n\n' + concerns.map(c => `- ${c}`).join('\n');
    }

    return '- Metrics remained stable during the analysis period';
  }

  return improvements.map(i => `- ${i}`).join('\n');
}

/**
 * Generate markdown content for the case study
 */
export function generateCaseStudyMarkdown(analysis: AggregatedAnalysis, includeHistory: boolean): string {
  const { techDebtIndex, hotspots, complexity, files, timeSpan, totalSessions } = analysis;
  const date = new Date().toISOString().split('T')[0];

  let md = `# Case Study: ${analysis.repoName}

> Internal dogfood report generated by Code Guardian Studio
> Generated: ${date}

## Overview

| Metric | Value |
|--------|-------|
| Repository | \`${analysis.repoName}\` |
| Path | \`${analysis.repoPath}\` |
| Total Files | ${files.totalFiles.toLocaleString()} |
| Lines of Code | ${files.totalLOC.toLocaleString()} |
| Sessions Analyzed | ${totalSessions} |
| Time Span | ${timeSpan.durationDays} days |
| First Analysis | ${timeSpan.firstSession.toISOString().split('T')[0]} |
| Latest Analysis | ${timeSpan.lastSession.toISOString().split('T')[0]} |

---

## Tech Debt Index

The Tech Debt Index measures overall code health on a 0-100 scale (lower is better).

| | Before | After | Change |
|---|:---:|:---:|:---:|
| **Index** | ${techDebtIndex.initial} | ${techDebtIndex.latest} | ${formatDelta(techDebtIndex.delta)} |
| **Grade** | ${techDebtIndex.initialGrade} | ${techDebtIndex.latestGrade} | ${formatGradeChange(techDebtIndex.initialGrade, techDebtIndex.latestGrade)} |

**Trend:** ${getTrendEmoji(techDebtIndex.trend)} ${formatTrend(techDebtIndex.trend)} (${techDebtIndex.percentChange > 0 ? '+' : ''}${techDebtIndex.percentChange.toFixed(1)}%)

### Grade Scale

| Grade | Range | Meaning |
|:---:|:---:|---|
| A | 0-20 | Excellent - minimal tech debt |
| B | 21-40 | Good - healthy codebase |
| C | 41-60 | Fair - some attention needed |
| D | 61-80 | Poor - significant debt |
| F | 81-100 | Critical - urgent refactoring needed |

---

## Hotspots Analysis

Hotspots are files flagged for high complexity, size, or code debt.

| Metric | Before | After | Change |
|--------|:---:|:---:|:---:|
| **Hotspot Count** | ${hotspots.initialCount} | ${hotspots.latestCount} | ${formatDelta(hotspots.delta)} |
| **Total Hotspot Score** | ${hotspots.initialTotalScore} | ${hotspots.latestTotalScore} | ${formatDelta(-hotspots.scoreReduction)} |

${hotspots.scoreReduction > 0 ? `**Score Reduction:** ${hotspots.scoreReduction} points reduced` : ''}

---

## Complexity Metrics

| Metric | Before | After | Change |
|--------|:---:|:---:|:---:|
| **Avg Complexity** | ${complexity.initialAvg.toFixed(1)} | ${complexity.latestAvg.toFixed(1)} | ${formatDelta(complexity.delta, 1)} |
| **High-Complexity Files** | ${files.initialHighComplexity} | ${files.latestHighComplexity} | ${formatDelta(files.latestHighComplexity - files.initialHighComplexity)} |
| **Large Files (>500 LOC)** | ${files.initialLargeFiles} | ${files.latestLargeFiles} | ${formatDelta(files.latestLargeFiles - files.initialLargeFiles)} |

---

## Key Improvements

${generateKeyImprovements(analysis)}

---

`;

  if (includeHistory && analysis.sessionHistory.length > 1) {
    md += `## Session History

| Date | Tech Debt Index | Grade | Hotspots | Avg Complexity |
|------|:---:|:---:|:---:|:---:|
`;
    for (const session of analysis.sessionHistory) {
      md += `| ${session.date} | ${session.techDebtIndex} | ${session.grade} | ${session.hotspots} | ${session.avgComplexity} |\n`;
    }

    md += `
---

`;
  }

  md += `## Trend Visualization

\`\`\`
Tech Debt Index Over Time (lower is better)
${'─'.repeat(50)}
`;

  // Simple ASCII chart
  const maxIndex = Math.max(...analysis.sessionHistory.map(s => s.techDebtIndex), 100);
  const chartWidth = 30;

  for (const session of analysis.sessionHistory) {
    const barLength = Math.round((session.techDebtIndex / maxIndex) * chartWidth);
    const bar = '\u2588'.repeat(barLength) + '\u2591'.repeat(chartWidth - barLength);
    md += `${session.date}  ${bar}  ${session.techDebtIndex} (${session.grade})\n`;
  }

  md += `${'─'.repeat(50)}
Trend: ${getTrendArrow(techDebtIndex.trend)} ${techDebtIndex.trend.charAt(0).toUpperCase() + techDebtIndex.trend.slice(1)}
\`\`\`

---

## Internal Notes

_This section is for internal use. Add observations and learnings here._

- [ ] Document any manual refactoring done alongside CCG recommendations
- [ ] Note any false positives or areas where CCG could improve
- [ ] Record feedback from developers who used the tool
- [ ] Capture any performance observations (scan time, accuracy)

---

_Generated by Code Guardian Studio v1.0 - Internal Dogfood Report_
`;

  return md;
}
