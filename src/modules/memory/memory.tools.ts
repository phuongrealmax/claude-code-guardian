// src/modules/memory/memory.tools.ts

/**
 * MCP Tool definitions for Memory Module
 */

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

// ═══════════════════════════════════════════════════════════════
//                      MEMORY TOOLS DEFINITION
// ═══════════════════════════════════════════════════════════════

export function getMemoryTools(): MCPTool[] {
  return [
    {
      name: 'memory_store',
      description: 'Store information in persistent memory for later recall. Use this to remember important decisions, facts, code patterns, errors, and conventions.',
      inputSchema: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: 'The information to store (be specific and detailed)',
          },
          type: {
            type: 'string',
            enum: ['decision', 'fact', 'code_pattern', 'error', 'note', 'convention', 'architecture'],
            description: 'Type of memory: decision (choices made), fact (learned info), code_pattern (reusable code), error (mistakes to avoid), note (general), convention (project rules), architecture (system design)',
          },
          importance: {
            type: 'number',
            minimum: 1,
            maximum: 10,
            description: 'Importance level from 1 (low) to 10 (critical). Use 8-10 for must-remember items.',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Tags for categorization and easier recall (e.g., ["auth", "security", "api"])',
          },
        },
        required: ['content', 'type', 'importance'],
      },
    },
    {
      name: 'memory_recall',
      description: 'Search and retrieve stored memories. Use this to remember past decisions, patterns, and learned information.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query - keywords or phrases to find relevant memories',
          },
          type: {
            type: 'string',
            enum: ['decision', 'fact', 'code_pattern', 'error', 'note', 'convention', 'architecture'],
            description: 'Filter by memory type (optional)',
          },
          limit: {
            type: 'number',
            default: 10,
            description: 'Maximum number of results to return (default: 10)',
          },
          minImportance: {
            type: 'number',
            minimum: 1,
            maximum: 10,
            description: 'Minimum importance level to include (optional)',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Filter by tags - memories must have at least one matching tag (optional)',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'memory_forget',
      description: 'Remove a specific memory by its ID. Use sparingly - only for outdated or incorrect information.',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The ID of the memory to remove',
          },
        },
        required: ['id'],
      },
    },
    {
      name: 'memory_summary',
      description: 'Get a summary of all stored memories including counts by type, most important, and recently accessed.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'memory_list',
      description: 'List all memories, optionally filtered by type. Useful for reviewing stored knowledge.',
      inputSchema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['decision', 'fact', 'code_pattern', 'error', 'note', 'convention', 'architecture'],
            description: 'Filter by memory type (optional)',
          },
          limit: {
            type: 'number',
            default: 20,
            description: 'Maximum number of memories to return (default: 20)',
          },
          sortBy: {
            type: 'string',
            enum: ['importance', 'recent', 'accessed', 'created'],
            default: 'importance',
            description: 'Sort order: importance (highest first), recent (recently created), accessed (recently used), created (oldest first)',
          },
        },
        required: [],
      },
    },
  ];
}

// ═══════════════════════════════════════════════════════════════
//                      TOOL RESULT FORMATTERS
// ═══════════════════════════════════════════════════════════════

/**
 * Format memory for display
 */
export function formatMemoryResult(memory: {
  id: string;
  content: string;
  type: string;
  importance: number;
  tags: string[];
  createdAt: Date;
  accessedAt: Date;
  accessCount: number;
}): string {
  const lines = [
    `ID: ${memory.id}`,
    `Type: ${memory.type}`,
    `Importance: ${'★'.repeat(memory.importance)}${'☆'.repeat(10 - memory.importance)} (${memory.importance}/10)`,
    `Tags: ${memory.tags.length > 0 ? memory.tags.join(', ') : '(none)'}`,
    `Created: ${memory.createdAt.toISOString()}`,
    `Last Accessed: ${memory.accessedAt.toISOString()} (${memory.accessCount} times)`,
    ``,
    `Content:`,
    memory.content,
  ];

  return lines.join('\n');
}

/**
 * Format memory list for display
 */
export function formatMemoryList(memories: Array<{
  id: string;
  content: string;
  type: string;
  importance: number;
  tags: string[];
}>): string {
  if (memories.length === 0) {
    return 'No memories found.';
  }

  return memories.map((m, i) => {
    const preview = m.content.length > 80 ? m.content.slice(0, 80) + '...' : m.content;
    const stars = '★'.repeat(Math.min(m.importance, 5));
    return `${i + 1}. [${m.type}] ${stars} ${preview}\n   ID: ${m.id} | Tags: ${m.tags.join(', ') || 'none'}`;
  }).join('\n\n');
}

/**
 * Format summary for display
 */
export function formatSummary(summary: {
  total: number;
  byType: Record<string, number>;
  recentlyAccessed: Array<{ id: string; content: string; type: string }>;
  mostImportant: Array<{ id: string; content: string; importance: number }>;
}): string {
  const lines = [
    `=== Memory Summary ===`,
    `Total Memories: ${summary.total}`,
    ``,
    `By Type:`,
    ...Object.entries(summary.byType).map(([type, count]) => `  - ${type}: ${count}`),
    ``,
    `Recently Accessed:`,
    ...summary.recentlyAccessed.slice(0, 3).map(m =>
      `  - [${m.type}] ${m.content.slice(0, 50)}...`
    ),
    ``,
    `Most Important:`,
    ...summary.mostImportant.slice(0, 3).map(m =>
      `  - (${m.importance}/10) ${m.content.slice(0, 50)}...`
    ),
  ];

  return lines.join('\n');
}
