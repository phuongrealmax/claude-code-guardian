// tests/unit/memory-tools.test.ts

// Using vitest globals
import {
  getMemoryTools,
  formatMemoryResult,
  formatMemoryList,
  formatSummary,
} from '../../src/modules/memory/memory.tools.js';

describe('memory.tools', () => {
  // ═══════════════════════════════════════════════════════════════
  //                      getMemoryTools
  // ═══════════════════════════════════════════════════════════════

  describe('getMemoryTools', () => {
    it('should return an array of tool definitions', () => {
      const tools = getMemoryTools();

      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
    });

    it('should include memory_store tool', () => {
      const tools = getMemoryTools();
      const storeTool = tools.find(t => t.name === 'memory_store');

      expect(storeTool).toBeDefined();
      expect(storeTool!.description).toContain('Store');
      expect(storeTool!.inputSchema.required).toContain('content');
      expect(storeTool!.inputSchema.required).toContain('type');
      expect(storeTool!.inputSchema.required).toContain('importance');
    });

    it('should include memory_recall tool', () => {
      const tools = getMemoryTools();
      const recallTool = tools.find(t => t.name === 'memory_recall');

      expect(recallTool).toBeDefined();
      expect(recallTool!.description).toContain('Search');
      expect(recallTool!.inputSchema.required).toContain('query');
    });

    it('should include memory_forget tool', () => {
      const tools = getMemoryTools();
      const forgetTool = tools.find(t => t.name === 'memory_forget');

      expect(forgetTool).toBeDefined();
      expect(forgetTool!.inputSchema.required).toContain('id');
    });

    it('should include memory_summary tool', () => {
      const tools = getMemoryTools();
      const summaryTool = tools.find(t => t.name === 'memory_summary');

      expect(summaryTool).toBeDefined();
      expect(summaryTool!.inputSchema.required).toEqual([]);
    });

    it('should include memory_list tool', () => {
      const tools = getMemoryTools();
      const listTool = tools.find(t => t.name === 'memory_list');

      expect(listTool).toBeDefined();
      expect(listTool!.inputSchema.properties).toHaveProperty('type');
      expect(listTool!.inputSchema.properties).toHaveProperty('limit');
      expect(listTool!.inputSchema.properties).toHaveProperty('sortBy');
    });

    it('should have valid inputSchema structure for all tools', () => {
      const tools = getMemoryTools();

      tools.forEach(tool => {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
        expect(Array.isArray(tool.inputSchema.required)).toBe(true);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      formatMemoryResult
  // ═══════════════════════════════════════════════════════════════

  describe('formatMemoryResult', () => {
    const createMemory = (overrides = {}) => ({
      id: 'mem-123',
      content: 'Test memory content',
      type: 'fact',
      importance: 7,
      tags: ['test', 'unit'],
      createdAt: new Date('2024-01-15T10:00:00Z'),
      accessedAt: new Date('2024-01-16T14:30:00Z'),
      accessCount: 5,
      ...overrides,
    });

    it('should format memory with all fields', () => {
      const memory = createMemory();
      const result = formatMemoryResult(memory);

      expect(result).toContain('ID: mem-123');
      expect(result).toContain('Type: fact');
      expect(result).toContain('Tags: test, unit');
      expect(result).toContain('Content:');
      expect(result).toContain('Test memory content');
    });

    it('should show importance as stars', () => {
      const memory = createMemory({ importance: 7 });
      const result = formatMemoryResult(memory);

      // 7 filled stars, 3 empty stars
      expect(result).toContain('★★★★★★★☆☆☆');
      expect(result).toContain('(7/10)');
    });

    it('should show 10 filled stars for max importance', () => {
      const memory = createMemory({ importance: 10 });
      const result = formatMemoryResult(memory);

      expect(result).toContain('★★★★★★★★★★');
      expect(result).toContain('(10/10)');
    });

    it('should show 10 empty stars for min importance', () => {
      const memory = createMemory({ importance: 0 });
      const result = formatMemoryResult(memory);

      expect(result).toContain('☆☆☆☆☆☆☆☆☆☆');
      expect(result).toContain('(0/10)');
    });

    it('should handle empty tags', () => {
      const memory = createMemory({ tags: [] });
      const result = formatMemoryResult(memory);

      expect(result).toContain('Tags: (none)');
    });

    it('should include created date', () => {
      const memory = createMemory();
      const result = formatMemoryResult(memory);

      expect(result).toContain('Created: 2024-01-15');
    });

    it('should include access info', () => {
      const memory = createMemory({ accessCount: 5 });
      const result = formatMemoryResult(memory);

      expect(result).toContain('Last Accessed:');
      expect(result).toContain('(5 times)');
    });

    it('should handle single access', () => {
      const memory = createMemory({ accessCount: 1 });
      const result = formatMemoryResult(memory);

      expect(result).toContain('(1 times)');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      formatMemoryList
  // ═══════════════════════════════════════════════════════════════

  describe('formatMemoryList', () => {
    it('should return "No memories found" for empty list', () => {
      const result = formatMemoryList([]);

      expect(result).toBe('No memories found.');
    });

    it('should format single memory', () => {
      const memories = [{
        id: 'mem-1',
        content: 'First memory',
        type: 'fact',
        importance: 3,
        tags: ['tag1'],
      }];

      const result = formatMemoryList(memories);

      expect(result).toContain('1.');
      expect(result).toContain('[fact]');
      expect(result).toContain('First memory');
      expect(result).toContain('ID: mem-1');
      expect(result).toContain('Tags: tag1');
    });

    it('should format multiple memories', () => {
      const memories = [
        { id: 'mem-1', content: 'First', type: 'fact', importance: 5, tags: [] },
        { id: 'mem-2', content: 'Second', type: 'decision', importance: 8, tags: ['important'] },
      ];

      const result = formatMemoryList(memories);

      expect(result).toContain('1.');
      expect(result).toContain('2.');
      expect(result).toContain('[fact]');
      expect(result).toContain('[decision]');
    });

    it('should truncate long content to 80 chars', () => {
      const longContent = 'A'.repeat(100);
      const memories = [{
        id: 'mem-1',
        content: longContent,
        type: 'note',
        importance: 5,
        tags: [],
      }];

      const result = formatMemoryList(memories);

      expect(result).toContain('A'.repeat(80) + '...');
      expect(result).not.toContain('A'.repeat(100));
    });

    it('should not truncate short content', () => {
      const memories = [{
        id: 'mem-1',
        content: 'Short content',
        type: 'note',
        importance: 5,
        tags: [],
      }];

      const result = formatMemoryList(memories);

      expect(result).toContain('Short content');
      expect(result).not.toContain('...');
    });

    it('should show stars based on importance (max 5)', () => {
      const memories = [
        { id: 'mem-1', content: 'Low', type: 'note', importance: 2, tags: [] },
        { id: 'mem-2', content: 'High', type: 'note', importance: 8, tags: [] },
      ];

      const result = formatMemoryList(memories);

      // importance 2 -> 2 stars
      expect(result).toContain('★★');
      // importance 8 capped at 5 stars
      expect(result).toContain('★★★★★');
    });

    it('should show "none" for empty tags', () => {
      const memories = [{
        id: 'mem-1',
        content: 'Content',
        type: 'note',
        importance: 1,
        tags: [],
      }];

      const result = formatMemoryList(memories);

      expect(result).toContain('Tags: none');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      formatSummary
  // ═══════════════════════════════════════════════════════════════

  describe('formatSummary', () => {
    const createSummary = (overrides = {}) => ({
      total: 10,
      byType: {
        fact: 4,
        decision: 3,
        note: 3,
      },
      recentlyAccessed: [
        { id: 'mem-1', content: 'Recent memory one with long content that should be truncated', type: 'fact' },
        { id: 'mem-2', content: 'Recent memory two', type: 'decision' },
        { id: 'mem-3', content: 'Recent memory three', type: 'note' },
        { id: 'mem-4', content: 'Recent memory four (should not show)', type: 'note' },
      ],
      mostImportant: [
        { id: 'imp-1', content: 'Important memory one with long content that should be truncated', importance: 10 },
        { id: 'imp-2', content: 'Important memory two', importance: 9 },
        { id: 'imp-3', content: 'Important memory three', importance: 8 },
        { id: 'imp-4', content: 'Important memory four (should not show)', importance: 7 },
      ],
      ...overrides,
    });

    it('should include summary header', () => {
      const summary = createSummary();
      const result = formatSummary(summary);

      expect(result).toContain('=== Memory Summary ===');
    });

    it('should show total count', () => {
      const summary = createSummary({ total: 42 });
      const result = formatSummary(summary);

      expect(result).toContain('Total Memories: 42');
    });

    it('should show breakdown by type', () => {
      const summary = createSummary();
      const result = formatSummary(summary);

      expect(result).toContain('By Type:');
      expect(result).toContain('- fact: 4');
      expect(result).toContain('- decision: 3');
      expect(result).toContain('- note: 3');
    });

    it('should show recently accessed memories (limited to 3)', () => {
      const summary = createSummary();
      const result = formatSummary(summary);

      expect(result).toContain('Recently Accessed:');
      expect(result).toContain('[fact]');
      expect(result).toContain('[decision]');
      expect(result).toContain('[note]');
      // Should not include 4th item
      expect(result).not.toContain('should not show');
    });

    it('should show most important memories (limited to 3)', () => {
      const summary = createSummary();
      const result = formatSummary(summary);

      expect(result).toContain('Most Important:');
      expect(result).toContain('(10/10)');
      expect(result).toContain('(9/10)');
      expect(result).toContain('(8/10)');
      // Should not include 4th item
      expect(result).not.toContain('(7/10)');
    });

    it('should truncate content previews to 50 chars', () => {
      const summary = createSummary();
      const result = formatSummary(summary);

      // Content is truncated at 50 chars with "..."
      expect(result).toContain('...');
    });

    it('should handle empty byType', () => {
      const summary = createSummary({ byType: {} });
      const result = formatSummary(summary);

      expect(result).toContain('By Type:');
      expect(result).toContain('Total Memories:');
    });

    it('should handle empty recently accessed', () => {
      const summary = createSummary({ recentlyAccessed: [] });
      const result = formatSummary(summary);

      expect(result).toContain('Recently Accessed:');
    });

    it('should handle empty most important', () => {
      const summary = createSummary({ mostImportant: [] });
      const result = formatSummary(summary);

      expect(result).toContain('Most Important:');
    });
  });
});
