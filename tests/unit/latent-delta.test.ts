// tests/unit/latent-delta.test.ts

// Using vitest globals
import { DeltaMerger } from '../../src/modules/latent/latent-delta.js';
import { AgentLatentContext } from '../../src/modules/latent/latent.types.js';

describe('DeltaMerger', () => {
  let merger: DeltaMerger;
  let baseContext: AgentLatentContext;

  beforeEach(() => {
    merger = new DeltaMerger();
    baseContext = createBaseContext();
  });

  function createBaseContext(): AgentLatentContext {
    return {
      taskId: 'test-task',
      phase: 'analysis',
      codeMap: {
        files: ['src/file1.ts'],
        hotSpots: ['src/file1.ts:10'],
        components: ['ComponentA'],
      },
      constraints: ['No breaking changes'],
      decisions: [],
      risks: ['Risk A'],
      artifacts: {
        tests: ['test1.ts'],
        endpoints: ['/api/v1'],
        other: { key1: 'value1' },
      },
      metadata: { custom: 'data' },
      createdAt: new Date(),
      updatedAt: new Date(),
      history: [],
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //                      PHASE UPDATES
  // ═══════════════════════════════════════════════════════════════

  describe('phase updates', () => {
    it('should update phase when provided', () => {
      merger.merge(baseContext, { phase: 'impl' });

      expect(baseContext.phase).toBe('impl');
    });

    it('should not change phase when not provided', () => {
      merger.merge(baseContext, {});

      expect(baseContext.phase).toBe('analysis');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      CODE MAP MERGING
  // ═══════════════════════════════════════════════════════════════

  describe('codeMap merging', () => {
    it('should merge files with deduplication', () => {
      merger.merge(baseContext, {
        codeMap: {
          files: ['src/file1.ts', 'src/file2.ts'],
        },
      });

      expect(baseContext.codeMap.files).toContain('src/file1.ts');
      expect(baseContext.codeMap.files).toContain('src/file2.ts');
      expect(baseContext.codeMap.files.length).toBe(2); // Deduplicated
    });

    it('should merge hotSpots with deduplication', () => {
      merger.merge(baseContext, {
        codeMap: {
          hotSpots: ['src/file1.ts:10', 'src/file1.ts:20'],
        },
      });

      expect(baseContext.codeMap.hotSpots).toHaveLength(2);
      expect(baseContext.codeMap.hotSpots).toContain('src/file1.ts:20');
    });

    it('should merge components with deduplication', () => {
      merger.merge(baseContext, {
        codeMap: {
          components: ['ComponentA', 'ComponentB'],
        },
      });

      expect(baseContext.codeMap.components).toHaveLength(2);
      expect(baseContext.codeMap.components).toContain('ComponentB');
    });

    it('should handle empty codeMap delta', () => {
      merger.merge(baseContext, { codeMap: {} });

      expect(baseContext.codeMap.files).toEqual(['src/file1.ts']);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      CONSTRAINTS MERGING
  // ═══════════════════════════════════════════════════════════════

  describe('constraints merging', () => {
    it('should append constraints with deduplication', () => {
      merger.merge(baseContext, {
        constraints: ['No breaking changes', 'Must pass tests'],
      });

      expect(baseContext.constraints).toHaveLength(2);
      expect(baseContext.constraints).toContain('Must pass tests');
    });

    it('should handle empty constraints', () => {
      merger.merge(baseContext, { constraints: [] });

      expect(baseContext.constraints).toEqual(['No breaking changes']);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      RISKS MERGING
  // ═══════════════════════════════════════════════════════════════

  describe('risks merging', () => {
    it('should append risks with deduplication', () => {
      merger.merge(baseContext, {
        risks: ['Risk A', 'Risk B'],
      });

      expect(baseContext.risks).toHaveLength(2);
      expect(baseContext.risks).toContain('Risk B');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      DECISIONS MERGING
  // ═══════════════════════════════════════════════════════════════

  describe('decisions merging', () => {
    it('should add decisions with auto-generated IDs', () => {
      merger.merge(baseContext, {
        decisions: [
          { summary: 'Use approach A', rationale: 'Because...' },
        ],
      });

      expect(baseContext.decisions).toHaveLength(1);
      expect(baseContext.decisions[0].id).toBe('D001');
      expect(baseContext.decisions[0].summary).toBe('Use approach A');
      expect(baseContext.decisions[0].phase).toBe('analysis');
      expect(baseContext.decisions[0].createdAt).toBeDefined();
    });

    it('should use provided ID if given', () => {
      merger.merge(baseContext, {
        decisions: [
          { id: 'CUSTOM-001', summary: 'Custom decision' },
        ],
      });

      expect(baseContext.decisions[0].id).toBe('CUSTOM-001');
    });

    it('should increment IDs for multiple decisions', () => {
      merger.merge(baseContext, {
        decisions: [
          { summary: 'First' },
          { summary: 'Second' },
        ],
      });

      expect(baseContext.decisions[0].id).toBe('D001');
      expect(baseContext.decisions[1].id).toBe('D002');
    });

    it('should use decision phase if provided', () => {
      merger.merge(baseContext, {
        decisions: [
          { summary: 'Plan decision', phase: 'plan' },
        ],
      });

      expect(baseContext.decisions[0].phase).toBe('plan');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      ARTIFACTS MERGING
  // ═══════════════════════════════════════════════════════════════

  describe('artifacts merging', () => {
    it('should merge tests with deduplication', () => {
      merger.merge(baseContext, {
        artifacts: {
          tests: ['test1.ts', 'test2.ts'],
        },
      });

      expect(baseContext.artifacts.tests).toHaveLength(2);
      expect(baseContext.artifacts.tests).toContain('test2.ts');
    });

    it('should merge endpoints with deduplication', () => {
      merger.merge(baseContext, {
        artifacts: {
          endpoints: ['/api/v1', '/api/v2'],
        },
      });

      expect(baseContext.artifacts.endpoints).toHaveLength(2);
      expect(baseContext.artifacts.endpoints).toContain('/api/v2');
    });

    it('should merge other artifacts', () => {
      merger.merge(baseContext, {
        artifacts: {
          other: { key2: 'value2' },
        },
      });

      expect(baseContext.artifacts.other).toEqual({
        key1: 'value1',
        key2: 'value2',
      });
    });

    it('should override other artifacts on conflict', () => {
      merger.merge(baseContext, {
        artifacts: {
          other: { key1: 'updated' },
        },
      });

      expect(baseContext.artifacts.other.key1).toBe('updated');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      METADATA MERGING
  // ═══════════════════════════════════════════════════════════════

  describe('metadata merging', () => {
    it('should merge metadata', () => {
      merger.merge(baseContext, {
        metadata: { newKey: 'newValue' },
      });

      expect(baseContext.metadata).toEqual({
        custom: 'data',
        newKey: 'newValue',
      });
    });

    it('should override metadata on conflict', () => {
      merger.merge(baseContext, {
        metadata: { custom: 'updated' },
      });

      expect(baseContext.metadata.custom).toBe('updated');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      REMOVALS
  // ═══════════════════════════════════════════════════════════════

  describe('removals', () => {
    it('should remove constraints', () => {
      merger.merge(baseContext, {
        remove: { constraints: ['No breaking changes'] },
      });

      expect(baseContext.constraints).toHaveLength(0);
    });

    it('should remove risks', () => {
      merger.merge(baseContext, {
        remove: { risks: ['Risk A'] },
      });

      expect(baseContext.risks).toHaveLength(0);
    });

    it('should remove decisions by ID', () => {
      baseContext.decisions = [
        { id: 'D001', summary: 'Test', createdAt: new Date(), phase: 'analysis' },
      ];

      merger.merge(baseContext, {
        remove: { decisions: ['D001'] },
      });

      expect(baseContext.decisions).toHaveLength(0);
    });

    it('should remove files from codeMap', () => {
      merger.merge(baseContext, {
        remove: { files: ['src/file1.ts'] },
      });

      expect(baseContext.codeMap.files).toHaveLength(0);
    });

    it('should remove hotSpots from codeMap', () => {
      merger.merge(baseContext, {
        remove: { hotSpots: ['src/file1.ts:10'] },
      });

      expect(baseContext.codeMap.hotSpots).toHaveLength(0);
    });

    it('should handle empty remove object', () => {
      const originalFiles = [...baseContext.codeMap.files];
      merger.merge(baseContext, { remove: {} });

      expect(baseContext.codeMap.files).toEqual(originalFiles);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      COMBINED OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  describe('combined operations', () => {
    it('should handle multiple delta types in one merge', () => {
      merger.merge(baseContext, {
        phase: 'plan',
        codeMap: { files: ['src/new.ts'] },
        constraints: ['New constraint'],
        decisions: [{ summary: 'New decision' }],
        metadata: { updated: true },
      });

      expect(baseContext.phase).toBe('plan');
      expect(baseContext.codeMap.files).toContain('src/new.ts');
      expect(baseContext.constraints).toContain('New constraint');
      expect(baseContext.decisions).toHaveLength(1);
      expect(baseContext.metadata.updated).toBe(true);
    });

    it('should handle add and remove in same merge', () => {
      merger.merge(baseContext, {
        constraints: ['New constraint'],
        remove: { constraints: ['No breaking changes'] },
      });

      expect(baseContext.constraints).toEqual(['New constraint']);
    });
  });
});
