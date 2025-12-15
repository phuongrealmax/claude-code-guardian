// tests/unit/dogfood-markdown.test.ts

// Using vitest globals
import {
  getGrade,
  formatDelta,
  formatGradeChange,
  formatTrend,
  getTrendEmoji,
  getTrendArrow,
  generateKeyImprovements,
  generateCaseStudyMarkdown,
} from '../../src/core/dogfood-markdown.js';
import { AggregatedAnalysis } from '../../src/core/dogfood-reporter.js';

describe('dogfood-markdown', () => {
  // ═══════════════════════════════════════════════════════════════
  //                      getGrade
  // ═══════════════════════════════════════════════════════════════

  describe('getGrade', () => {
    it('should return A for index 0-20', () => {
      expect(getGrade(0)).toBe('A');
      expect(getGrade(10)).toBe('A');
      expect(getGrade(20)).toBe('A');
    });

    it('should return B for index 21-40', () => {
      expect(getGrade(21)).toBe('B');
      expect(getGrade(30)).toBe('B');
      expect(getGrade(40)).toBe('B');
    });

    it('should return C for index 41-60', () => {
      expect(getGrade(41)).toBe('C');
      expect(getGrade(50)).toBe('C');
      expect(getGrade(60)).toBe('C');
    });

    it('should return D for index 61-80', () => {
      expect(getGrade(61)).toBe('D');
      expect(getGrade(70)).toBe('D');
      expect(getGrade(80)).toBe('D');
    });

    it('should return F for index above 80', () => {
      expect(getGrade(81)).toBe('F');
      expect(getGrade(90)).toBe('F');
      expect(getGrade(100)).toBe('F');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      formatDelta
  // ═══════════════════════════════════════════════════════════════

  describe('formatDelta', () => {
    it('should format positive delta with plus sign', () => {
      expect(formatDelta(10)).toBe('+10');
      expect(formatDelta(5)).toBe('+5');
    });

    it('should format negative delta with minus sign', () => {
      expect(formatDelta(-10)).toBe('-10');
      expect(formatDelta(-5)).toBe('-5');
    });

    it('should format zero as 0', () => {
      expect(formatDelta(0)).toBe('0');
    });

    it('should handle decimals parameter', () => {
      expect(formatDelta(10.567, 2)).toBe('+10.57');
      expect(formatDelta(-5.123, 1)).toBe('-5.1');
      expect(formatDelta(0, 2)).toBe('0');
    });

    it('should round when no decimals specified', () => {
      expect(formatDelta(10.7)).toBe('+11');
      expect(formatDelta(-5.3)).toBe('-5');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      formatGradeChange
  // ═══════════════════════════════════════════════════════════════

  describe('formatGradeChange', () => {
    it('should return dash for same grade', () => {
      expect(formatGradeChange('A', 'A')).toBe('-');
      expect(formatGradeChange('B', 'B')).toBe('-');
    });

    it('should format grade improvement (higher grade is lower letter)', () => {
      expect(formatGradeChange('B', 'A')).toBe('B -> A');
      expect(formatGradeChange('C', 'B')).toBe('C -> B');
      expect(formatGradeChange('F', 'A')).toBe('F -> A');
    });

    it('should format grade degradation', () => {
      expect(formatGradeChange('A', 'B')).toBe('A -> B');
      expect(formatGradeChange('A', 'F')).toBe('A -> F');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      formatTrend
  // ═══════════════════════════════════════════════════════════════

  describe('formatTrend', () => {
    it('should format improving trend', () => {
      expect(formatTrend('improving')).toBe('Improving');
    });

    it('should format degrading trend', () => {
      expect(formatTrend('degrading')).toBe('Degrading');
    });

    it('should format stable trend', () => {
      expect(formatTrend('stable')).toBe('Stable');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      getTrendEmoji
  // ═══════════════════════════════════════════════════════════════

  describe('getTrendEmoji', () => {
    it('should return checkmark for improving', () => {
      expect(getTrendEmoji('improving')).toBe('\u2705');
    });

    it('should return warning for degrading', () => {
      expect(getTrendEmoji('degrading')).toBe('\u26A0\uFE0F');
    });

    it('should return arrow for stable', () => {
      expect(getTrendEmoji('stable')).toBe('\u27A1\uFE0F');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      getTrendArrow
  // ═══════════════════════════════════════════════════════════════

  describe('getTrendArrow', () => {
    it('should return down arrow for improving (lower is better)', () => {
      expect(getTrendArrow('improving')).toBe('\u2193');
    });

    it('should return up arrow for degrading', () => {
      expect(getTrendArrow('degrading')).toBe('\u2191');
    });

    it('should return right arrow for stable', () => {
      expect(getTrendArrow('stable')).toBe('\u2192');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      generateKeyImprovements
  // ═══════════════════════════════════════════════════════════════

  describe('generateKeyImprovements', () => {
    const createAnalysis = (overrides: Partial<AggregatedAnalysis> = {}): AggregatedAnalysis => ({
      repoName: 'test-repo',
      repoPath: '/test/path',
      totalSessions: 3,
      timeSpan: {
        firstSession: new Date('2024-01-01'),
        lastSession: new Date('2024-01-10'),
        durationDays: 10,
      },
      techDebtIndex: {
        initial: 50,
        latest: 40,
        delta: -10,
        percentChange: -20,
        trend: 'improving',
        initialGrade: 'C',
        latestGrade: 'B',
      },
      hotspots: {
        initialCount: 10,
        latestCount: 8,
        delta: -2,
        initialTotalScore: 100,
        latestTotalScore: 80,
        scoreReduction: 20,
      },
      complexity: {
        initialAvg: 15,
        latestAvg: 12,
        delta: -3,
        percentChange: -20,
        trend: 'improving',
      },
      files: {
        totalFiles: 100,
        totalLOC: 10000,
        initialHighComplexity: 10,
        latestHighComplexity: 8,
        initialLargeFiles: 5,
        latestLargeFiles: 3,
      },
      sessionHistory: [],
      ...overrides,
    });

    it('should include tech debt improvement', () => {
      const analysis = createAnalysis();
      const result = generateKeyImprovements(analysis);

      expect(result).toContain('Tech Debt Index reduced by 10 points');
      expect(result).toContain('20.0% improvement');
    });

    it('should include grade improvement', () => {
      const analysis = createAnalysis();
      const result = generateKeyImprovements(analysis);

      expect(result).toContain('Grade improved from C to B');
    });

    it('should include hotspot reduction', () => {
      const analysis = createAnalysis();
      const result = generateKeyImprovements(analysis);

      expect(result).toContain('Hotspots reduced from 10 to 8');
    });

    it('should include score reduction', () => {
      const analysis = createAnalysis();
      const result = generateKeyImprovements(analysis);

      expect(result).toContain('Total hotspot score reduced by 20 points');
    });

    it('should include complexity reduction', () => {
      const analysis = createAnalysis();
      const result = generateKeyImprovements(analysis);

      expect(result).toContain('Average complexity reduced by 3.0');
    });

    it('should include high-complexity files reduction', () => {
      const analysis = createAnalysis();
      const result = generateKeyImprovements(analysis);

      expect(result).toContain('High-complexity files reduced from 10 to 8');
    });

    it('should include large files reduction', () => {
      const analysis = createAnalysis();
      const result = generateKeyImprovements(analysis);

      expect(result).toContain('Large files (>500 LOC) reduced from 5 to 3');
    });

    it('should return stable message when no improvements', () => {
      const analysis = createAnalysis({
        techDebtIndex: {
          initial: 40,
          latest: 40,
          delta: 0,
          percentChange: 0,
          trend: 'stable',
          initialGrade: 'B',
          latestGrade: 'B',
        },
        hotspots: {
          initialCount: 5,
          latestCount: 5,
          delta: 0,
          initialTotalScore: 50,
          latestTotalScore: 50,
          scoreReduction: 0,
        },
        complexity: {
          initialAvg: 10,
          latestAvg: 10,
          delta: 0,
          percentChange: 0,
          trend: 'stable',
        },
        files: {
          totalFiles: 100,
          totalLOC: 10000,
          initialHighComplexity: 5,
          latestHighComplexity: 5,
          initialLargeFiles: 3,
          latestLargeFiles: 3,
        },
      });
      const result = generateKeyImprovements(analysis);

      expect(result).toContain('Metrics remained stable');
    });

    it('should show areas for attention when metrics got worse', () => {
      const analysis = createAnalysis({
        techDebtIndex: {
          initial: 40,
          latest: 50,
          delta: 10,
          percentChange: 25,
          trend: 'degrading',
          initialGrade: 'B',
          latestGrade: 'C',
        },
        hotspots: {
          initialCount: 5,
          latestCount: 8,
          delta: 3,
          initialTotalScore: 50,
          latestTotalScore: 80,
          scoreReduction: -30,
        },
        complexity: {
          initialAvg: 10,
          latestAvg: 12,
          delta: 2,
          percentChange: 20,
          trend: 'degrading',
        },
        files: {
          totalFiles: 100,
          totalLOC: 10000,
          initialHighComplexity: 5,
          latestHighComplexity: 8,
          initialLargeFiles: 3,
          latestLargeFiles: 5,
        },
      });
      const result = generateKeyImprovements(analysis);

      expect(result).toContain('Areas for Attention');
      expect(result).toContain('Tech Debt Index increased');
      expect(result).toContain('Hotspot count increased');
      expect(result).toContain('Average complexity increased');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      generateCaseStudyMarkdown
  // ═══════════════════════════════════════════════════════════════

  describe('generateCaseStudyMarkdown', () => {
    const createAnalysis = (): AggregatedAnalysis => ({
      repoName: 'test-repo',
      repoPath: '/test/path',
      totalSessions: 3,
      timeSpan: {
        firstSession: new Date('2024-01-01'),
        lastSession: new Date('2024-01-10'),
        durationDays: 10,
      },
      techDebtIndex: {
        initial: 50,
        latest: 40,
        delta: -10,
        percentChange: -20,
        trend: 'improving',
        initialGrade: 'C',
        latestGrade: 'B',
      },
      hotspots: {
        initialCount: 10,
        latestCount: 8,
        delta: -2,
        initialTotalScore: 100,
        latestTotalScore: 80,
        scoreReduction: 20,
      },
      complexity: {
        initialAvg: 15,
        latestAvg: 12,
        delta: -3,
        percentChange: -20,
        trend: 'improving',
      },
      files: {
        totalFiles: 100,
        totalLOC: 10000,
        initialHighComplexity: 10,
        latestHighComplexity: 8,
        initialLargeFiles: 5,
        latestLargeFiles: 3,
      },
      sessionHistory: [
        { date: '2024-01-01', techDebtIndex: 50, grade: 'C', hotspots: 10, avgComplexity: 15 },
        { date: '2024-01-05', techDebtIndex: 45, grade: 'B', hotspots: 9, avgComplexity: 13 },
        { date: '2024-01-10', techDebtIndex: 40, grade: 'B', hotspots: 8, avgComplexity: 12 },
      ],
    });

    it('should include case study header', () => {
      const analysis = createAnalysis();
      const result = generateCaseStudyMarkdown(analysis, false);

      expect(result).toContain('# Case Study: test-repo');
    });

    it('should include overview table', () => {
      const analysis = createAnalysis();
      const result = generateCaseStudyMarkdown(analysis, false);

      expect(result).toContain('## Overview');
      expect(result).toContain('Repository');
      expect(result).toContain('`test-repo`');
      expect(result).toContain('Total Files');
      expect(result).toContain('100');
      expect(result).toContain('Lines of Code');
      expect(result).toContain('10,000');
    });

    it('should include tech debt index section', () => {
      const analysis = createAnalysis();
      const result = generateCaseStudyMarkdown(analysis, false);

      expect(result).toContain('## Tech Debt Index');
      expect(result).toContain('**Index**');
      expect(result).toContain('50');
      expect(result).toContain('40');
      expect(result).toContain('-10');
    });

    it('should include hotspots analysis', () => {
      const analysis = createAnalysis();
      const result = generateCaseStudyMarkdown(analysis, false);

      expect(result).toContain('## Hotspots Analysis');
      expect(result).toContain('**Hotspot Count**');
    });

    it('should include complexity metrics', () => {
      const analysis = createAnalysis();
      const result = generateCaseStudyMarkdown(analysis, false);

      expect(result).toContain('## Complexity Metrics');
      expect(result).toContain('**Avg Complexity**');
    });

    it('should include key improvements', () => {
      const analysis = createAnalysis();
      const result = generateCaseStudyMarkdown(analysis, false);

      expect(result).toContain('## Key Improvements');
    });

    it('should include trend visualization', () => {
      const analysis = createAnalysis();
      const result = generateCaseStudyMarkdown(analysis, false);

      expect(result).toContain('## Trend Visualization');
      expect(result).toContain('Tech Debt Index Over Time');
    });

    it('should include session history when requested', () => {
      const analysis = createAnalysis();
      const result = generateCaseStudyMarkdown(analysis, true);

      expect(result).toContain('## Session History');
      expect(result).toContain('2024-01-01');
      expect(result).toContain('2024-01-05');
      expect(result).toContain('2024-01-10');
    });

    it('should not include session history when not requested', () => {
      const analysis = createAnalysis();
      const result = generateCaseStudyMarkdown(analysis, false);

      // Should have trend visualization but not the session history table
      expect(result).not.toContain('## Session History');
    });

    it('should include internal notes section', () => {
      const analysis = createAnalysis();
      const result = generateCaseStudyMarkdown(analysis, false);

      expect(result).toContain('## Internal Notes');
      expect(result).toContain('Generated by Code Guardian Studio');
    });
  });
});
