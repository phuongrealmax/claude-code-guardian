// tests/unit/rag-tools.test.ts

// Using vitest globals
import { RAG_TOOL_DEFINITIONS } from '../../src/modules/rag/rag.tools.js';

describe('rag.tools', () => {
  // ═══════════════════════════════════════════════════════════════
  //                      RAG_TOOL_DEFINITIONS
  // ═══════════════════════════════════════════════════════════════

  describe('RAG_TOOL_DEFINITIONS', () => {
    it('should be an array of tool definitions', () => {
      expect(Array.isArray(RAG_TOOL_DEFINITIONS)).toBe(true);
      expect(RAG_TOOL_DEFINITIONS.length).toBeGreaterThan(0);
    });

    it('should include rag_build_index tool', () => {
      const tool = RAG_TOOL_DEFINITIONS.find(t => t.name === 'rag_build_index');

      expect(tool).toBeDefined();
      expect(tool!.description).toContain('RAG index');
    });

    it('should include rag_query tool', () => {
      const tool = RAG_TOOL_DEFINITIONS.find(t => t.name === 'rag_query');

      expect(tool).toBeDefined();
      expect(tool!.description).toContain('Semantic search');
    });

    it('should include rag_related_code tool', () => {
      const tool = RAG_TOOL_DEFINITIONS.find(t => t.name === 'rag_related_code');

      expect(tool).toBeDefined();
      expect(tool!.description).toContain('similar');
    });

    it('should include rag_status tool', () => {
      const tool = RAG_TOOL_DEFINITIONS.find(t => t.name === 'rag_status');

      expect(tool).toBeDefined();
      expect(tool!.description).toContain('status');
    });

    it('should include rag_clear_index tool', () => {
      const tool = RAG_TOOL_DEFINITIONS.find(t => t.name === 'rag_clear_index');

      expect(tool).toBeDefined();
      expect(tool!.description).toContain('Clear');
    });

    it('should include rag_get_chunk tool', () => {
      const tool = RAG_TOOL_DEFINITIONS.find(t => t.name === 'rag_get_chunk');

      expect(tool).toBeDefined();
      expect(tool!.description).toContain('chunk');
    });

    it('should have valid structure for all tools', () => {
      RAG_TOOL_DEFINITIONS.forEach(tool => {
        expect(tool.name).toBeDefined();
        expect(typeof tool.name).toBe('string');
        expect(tool.description).toBeDefined();
        expect(typeof tool.description).toBe('string');
      });
    });

    it('should have exactly 6 tool definitions', () => {
      expect(RAG_TOOL_DEFINITIONS.length).toBe(6);
    });

    it('should have unique tool names', () => {
      const names = RAG_TOOL_DEFINITIONS.map(t => t.name);
      const uniqueNames = new Set(names);

      expect(uniqueNames.size).toBe(names.length);
    });

    it('should have all names prefixed with rag_', () => {
      RAG_TOOL_DEFINITIONS.forEach(tool => {
        expect(tool.name.startsWith('rag_')).toBe(true);
      });
    });

    it('should have non-empty descriptions', () => {
      RAG_TOOL_DEFINITIONS.forEach(tool => {
        expect(tool.description.length).toBeGreaterThan(10);
      });
    });
  });
});
