// tests/unit/code-optimizer-hotspots.test.ts

// Using vitest globals
import {
  selectHotspots,
  groupHotspotsByGoal,
  getPriorityOrder,
  filterByScore,
} from '../../src/modules/code-optimizer/hotspots.js';

describe('code-optimizer/hotspots', () => {
  const createMetric = (overrides = {}) => ({
    path: 'src/test.ts',
    lines: 100,
    codeLines: 80,
    commentLines: 10,
    blankLines: 10,
    maxNestingDepth: 3,
    branchScore: 15,
    complexityScore: 25,
    todoCount: 2,
    fixmeCount: 0,
    branchKeywordsCount: {
      if: 5, elseIf: 2, switch: 0, case: 0,
      for: 3, while: 1, catch: 1, ternary: 2,
    },
    ...overrides,
  });

  // ═══════════════════════════════════════════════════════════════
  //                      selectHotspots
  // ═══════════════════════════════════════════════════════════════

  describe('selectHotspots', () => {
    it('should return empty list for empty metrics', () => {
      const result = selectHotspots({ metrics: [] });

      expect(result.hotspots).toHaveLength(0);
      expect(result.summary.hotspotsFound).toBe(0);
    });

    it('should filter by minimum thresholds', () => {
      const metrics = [
        createMetric({ path: 'small.ts', lines: 20, complexityScore: 5, maxNestingDepth: 1 }),
        createMetric({ path: 'large.ts', lines: 200, complexityScore: 30, maxNestingDepth: 4 }),
      ];

      const result = selectHotspots({ metrics });

      expect(result.hotspots).toHaveLength(1);
      expect(result.hotspots[0].path).toBe('large.ts');
    });

    it('should use size strategy', () => {
      const metrics = [
        createMetric({ path: 'complex.ts', lines: 100, complexityScore: 80 }),
        createMetric({ path: 'large.ts', lines: 500, complexityScore: 20 }),
      ];

      const result = selectHotspots({ metrics, strategy: 'size' });

      expect(result.hotspots[0].path).toBe('large.ts');
      expect(result.summary.strategy).toBe('size');
    });

    it('should use complexity strategy', () => {
      const metrics = [
        createMetric({ path: 'large.ts', lines: 500, complexityScore: 20, maxNestingDepth: 2 }),
        createMetric({ path: 'complex.ts', lines: 100, complexityScore: 80, maxNestingDepth: 6 }),
      ];

      const result = selectHotspots({ metrics, strategy: 'complexity' });

      expect(result.hotspots[0].path).toBe('complex.ts');
    });

    it('should limit results with maxResults', () => {
      const metrics = Array.from({ length: 50 }, (_, i) =>
        createMetric({ path: `file${i}.ts`, lines: 100 + i * 10 })
      );

      const result = selectHotspots({ metrics, maxResults: 5 });

      expect(result.hotspots).toHaveLength(5);
    });

    it('should include rank in hotspots', () => {
      const metrics = [
        createMetric({ path: 'file1.ts', lines: 200 }),
        createMetric({ path: 'file2.ts', lines: 300 }),
      ];

      const result = selectHotspots({ metrics });

      expect(result.hotspots[0].rank).toBe(1);
      expect(result.hotspots[1].rank).toBe(2);
    });

    it('should include reasons in hotspots', () => {
      const metrics = [
        createMetric({ path: 'complex.ts', lines: 900, complexityScore: 70, maxNestingDepth: 7 }),
      ];

      const result = selectHotspots({ metrics });

      expect(result.hotspots[0].reasons.length).toBeGreaterThan(0);
      expect(result.hotspots[0].reasons.some(r => r.includes('Very large file'))).toBe(true);
    });

    it('should include suggested goal', () => {
      const metrics = [createMetric({ path: 'test.ts', lines: 100 })];

      const result = selectHotspots({ metrics });

      expect(result.hotspots[0].suggestedGoal).toBeDefined();
    });

    it('should include metrics in hotspot', () => {
      const metrics = [createMetric({ path: 'test.ts', lines: 200, maxNestingDepth: 4 })];

      const result = selectHotspots({ metrics });

      expect(result.hotspots[0].metrics).toBeDefined();
      expect(result.hotspots[0].metrics.lines).toBe(200);
      expect(result.hotspots[0].metrics.nesting).toBe(4);
    });

    it('should identify top reason in summary', () => {
      const metrics = [
        createMetric({ path: 'file1.ts', lines: 900, maxNestingDepth: 3 }),
        createMetric({ path: 'file2.ts', lines: 800, maxNestingDepth: 3 }),
      ];

      const result = selectHotspots({ metrics });

      expect(result.summary.topReason).toBeDefined();
    });

    it('should use custom thresholds', () => {
      const metrics = [
        createMetric({ path: 'small.ts', lines: 30, complexityScore: 10, maxNestingDepth: 2 }),
      ];

      const result = selectHotspots({
        metrics,
        thresholds: { minLines: 20, minComplexity: 5, minNesting: 1 },
      });

      expect(result.hotspots).toHaveLength(1);
    });

    it('should include files with FIXMEs', () => {
      const metrics = [
        createMetric({ path: 'fixme.ts', lines: 30, fixmeCount: 1 }),
      ];

      const result = selectHotspots({ metrics });

      expect(result.hotspots).toHaveLength(1);
    });

    it('should include files with many TODOs', () => {
      const metrics = [
        createMetric({ path: 'todo.ts', lines: 30, todoCount: 5 }),
      ];

      const result = selectHotspots({ metrics });

      expect(result.hotspots).toHaveLength(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      SUGGESTED GOALS
  // ═══════════════════════════════════════════════════════════════

  describe('suggested goals', () => {
    it('should suggest split-module for large deeply nested files', () => {
      const metrics = [
        createMetric({ path: 'huge.ts', lines: 700, maxNestingDepth: 5 }),
      ];

      const result = selectHotspots({ metrics });

      expect(result.hotspots[0].suggestedGoal).toBe('split-module');
    });

    it('should suggest simplify for deeply nested files', () => {
      const metrics = [
        createMetric({ path: 'nested.ts', lines: 100, maxNestingDepth: 6 }),
      ];

      const result = selectHotspots({ metrics });

      expect(result.hotspots[0].suggestedGoal).toBe('simplify');
    });

    it('should suggest refactor for high FIXME count', () => {
      const metrics = [
        createMetric({ path: 'fixme.ts', lines: 100, fixmeCount: 3 }),
      ];

      const result = selectHotspots({ metrics });

      expect(result.hotspots[0].suggestedGoal).toBe('refactor');
    });

    it('should suggest document for many TODOs', () => {
      const metrics = [
        createMetric({ path: 'todo.ts', lines: 100, todoCount: 6, complexityScore: 10 }),
      ];

      const result = selectHotspots({ metrics });

      expect(result.hotspots[0].suggestedGoal).toBe('document');
    });

    it('should suggest add-tests for complex non-test files', () => {
      const metrics = [
        createMetric({ path: 'service.ts', lines: 100, complexityScore: 25 }),
      ];

      const result = selectHotspots({ metrics });

      expect(result.hotspots[0].suggestedGoal).toBe('add-tests');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      UTILITY FUNCTIONS
  // ═══════════════════════════════════════════════════════════════

  describe('groupHotspotsByGoal', () => {
    it('should group hotspots by suggested goal', () => {
      const hotspots = [
        { path: 'a.ts', score: 50, reasons: [], suggestedGoal: 'refactor' as const, rank: 1, metrics: {} as any },
        { path: 'b.ts', score: 40, reasons: [], suggestedGoal: 'add-tests' as const, rank: 2, metrics: {} as any },
        { path: 'c.ts', score: 30, reasons: [], suggestedGoal: 'refactor' as const, rank: 3, metrics: {} as any },
      ];

      const groups = groupHotspotsByGoal(hotspots);

      expect(groups.refactor).toHaveLength(2);
      expect(groups['add-tests']).toHaveLength(1);
      expect(groups['split-module']).toHaveLength(0);
    });

    it('should return empty arrays for unused goals', () => {
      const groups = groupHotspotsByGoal([]);

      expect(groups.refactor).toEqual([]);
      expect(groups['add-tests']).toEqual([]);
      expect(groups['split-module']).toEqual([]);
      expect(groups.simplify).toEqual([]);
      expect(groups.document).toEqual([]);
    });
  });

  describe('getPriorityOrder', () => {
    it('should return paths sorted by score descending', () => {
      const hotspots = [
        { path: 'low.ts', score: 10, reasons: [], suggestedGoal: 'refactor' as const, rank: 3, metrics: {} as any },
        { path: 'high.ts', score: 90, reasons: [], suggestedGoal: 'refactor' as const, rank: 1, metrics: {} as any },
        { path: 'mid.ts', score: 50, reasons: [], suggestedGoal: 'refactor' as const, rank: 2, metrics: {} as any },
      ];

      const order = getPriorityOrder(hotspots);

      expect(order).toEqual(['high.ts', 'mid.ts', 'low.ts']);
    });

    it('should return empty array for empty input', () => {
      expect(getPriorityOrder([])).toEqual([]);
    });
  });

  describe('filterByScore', () => {
    it('should filter hotspots by minimum score', () => {
      const hotspots = [
        { path: 'low.ts', score: 10, reasons: [], suggestedGoal: 'refactor' as const, rank: 1, metrics: {} as any },
        { path: 'high.ts', score: 90, reasons: [], suggestedGoal: 'refactor' as const, rank: 2, metrics: {} as any },
      ];

      const filtered = filterByScore(hotspots, 50);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].path).toBe('high.ts');
    });

    it('should include hotspots at exact threshold', () => {
      const hotspots = [
        { path: 'exact.ts', score: 50, reasons: [], suggestedGoal: 'refactor' as const, rank: 1, metrics: {} as any },
      ];

      const filtered = filterByScore(hotspots, 50);

      expect(filtered).toHaveLength(1);
    });
  });
});
