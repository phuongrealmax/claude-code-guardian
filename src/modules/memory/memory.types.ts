// src/modules/memory/memory.types.ts

// Re-export core types used by Memory module
export {
  Memory,
  MemoryType,
  MemoryModuleConfig,
  MemorySnapshot,
} from '../../core/types.js';

// ═══════════════════════════════════════════════════════════════
//                      MEMORY MODULE SPECIFIC TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Parameters for storing a new memory
 */
export interface StoreMemoryParams {
  content: string;
  type: import('../../core/types.js').MemoryType;
  importance: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Parameters for recalling memories
 */
export interface RecallMemoryParams {
  query: string;
  type?: import('../../core/types.js').MemoryType;
  limit?: number;
  minImportance?: number;
  tags?: string[];
}

/**
 * Memory summary response
 */
export interface MemorySummary {
  total: number;
  byType: Record<string, number>;
  recentlyAccessed: import('../../core/types.js').Memory[];
  mostImportant: import('../../core/types.js').Memory[];
  oldestMemory?: Date;
  newestMemory?: Date;
}

/**
 * Memory search result with relevance score
 */
export interface MemorySearchResult {
  memory: import('../../core/types.js').Memory;
  score: number;
  matchType: 'exact' | 'partial' | 'tag' | 'semantic';
}

/**
 * Memory database row (SQLite)
 */
export interface MemoryDbRow {
  id: string;
  content: string;
  type: string;
  importance: number;
  tags: string; // JSON stringified
  created_at: string;
  accessed_at: string;
  access_count: number;
  metadata: string | null; // JSON stringified
}

/**
 * Memory module status
 */
export interface MemoryModuleStatus {
  enabled: boolean;
  totalMemories: number;
  dbPath: string;
  lastAccessed?: Date;
  memoryUsage: {
    used: number;
    max: number;
    percentage: number;
  };
}
