// src/modules/memory/memory.service.ts

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

import { Memory, MemoryType, MemoryModuleConfig } from '../../core/types.js';
import { EventBus } from '../../core/event-bus.js';
import { Logger } from '../../core/logger.js';
import {
  StoreMemoryParams,
  RecallMemoryParams,
  MemorySummary,
  MemorySearchResult,
  MemoryDbRow,
  MemoryModuleStatus,
} from './memory.types.js';

// ═══════════════════════════════════════════════════════════════
//                      MEMORY SERVICE CLASS
// ═══════════════════════════════════════════════════════════════

export class MemoryService {
  private db: Database.Database | null = null;
  private memories: Map<string, Memory> = new Map();
  private initialized: boolean = false;

  constructor(
    private config: MemoryModuleConfig,
    private eventBus: EventBus,
    private logger: Logger
  ) {}

  /**
   * Initialize the memory service
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      this.logger.info('Memory module disabled');
      return;
    }

    if (this.initialized) {
      this.logger.warn('Memory service already initialized');
      return;
    }

    try {
      // Ensure directory exists
      const dbDir = dirname(this.config.persistPath);
      if (!existsSync(dbDir)) {
        mkdirSync(dbDir, { recursive: true });
      }

      // Initialize SQLite database
      this.db = new Database(this.config.persistPath);
      this.createTables();
      await this.loadFromDb();

      this.initialized = true;
      this.logger.info(`Memory module initialized with ${this.memories.size} items`);

      // Emit event
      this.eventBus.emit({
        type: 'memory:store',
        timestamp: new Date(),
        data: { action: 'initialized', count: this.memories.size },
        source: 'MemoryService',
      });
    } catch (error) {
      this.logger.error('Failed to initialize memory service', error);
      throw error;
    }
  }

  /**
   * Shutdown the memory service
   */
  async shutdown(): Promise<void> {
    if (this.config.autoSave) {
      await this.savePersistent();
    }

    if (this.db) {
      this.db.close();
      this.db = null;
    }

    this.initialized = false;
    this.logger.info('Memory service shutdown');
  }

  // ═══════════════════════════════════════════════════════════════
  //                      PUBLIC METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Store a new memory
   */
  async store(params: StoreMemoryParams): Promise<Memory> {
    this.ensureInitialized();

    const memory: Memory = {
      id: randomUUID(),
      content: params.content,
      type: params.type,
      importance: Math.min(10, Math.max(1, params.importance)),
      tags: params.tags || [],
      createdAt: new Date(),
      accessedAt: new Date(),
      accessCount: 0,
      metadata: params.metadata,
    };

    // Check for duplicates
    const duplicate = this.findSimilar(memory.content);
    if (duplicate) {
      // Update existing instead of creating new
      duplicate.importance = Math.max(duplicate.importance, memory.importance);
      duplicate.accessedAt = new Date();
      duplicate.accessCount++;

      // Merge tags
      const mergedTags = [...new Set([...duplicate.tags, ...memory.tags])];
      duplicate.tags = mergedTags;

      await this.updateInDb(duplicate);

      this.logger.debug(`Memory updated (duplicate): ${duplicate.id}`);
      return duplicate;
    }

    // Store new memory
    this.memories.set(memory.id, memory);
    await this.insertToDb(memory);

    // Enforce max items
    await this.enforceLimit();

    // Emit event
    this.eventBus.emit({
      type: 'memory:store',
      timestamp: new Date(),
      data: { id: memory.id, type: memory.type },
      source: 'MemoryService',
    });

    this.logger.debug(`Memory stored: ${memory.id}`);
    return memory;
  }

  /**
   * Recall memories based on query
   */
  async recall(params: RecallMemoryParams): Promise<Memory[]> {
    this.ensureInitialized();

    const limit = params.limit || 10;
    const query = params.query.toLowerCase();

    let results = Array.from(this.memories.values());

    // Filter by type if specified
    if (params.type) {
      results = results.filter(m => m.type === params.type);
    }

    // Filter by minimum importance
    if (params.minImportance) {
      results = results.filter(m => m.importance >= params.minImportance!);
    }

    // Filter by tags
    if (params.tags && params.tags.length > 0) {
      results = results.filter(m =>
        params.tags!.some(tag => m.tags.includes(tag))
      );
    }

    // Score by relevance
    const scored: MemorySearchResult[] = results.map(memory => {
      let score = 0;
      let matchType: MemorySearchResult['matchType'] = 'partial';

      // Exact content match
      if (memory.content.toLowerCase() === query) {
        score += 20;
        matchType = 'exact';
      }
      // Partial content match
      else if (memory.content.toLowerCase().includes(query)) {
        score += 10;
        matchType = 'partial';
      }

      // Tag match
      for (const tag of memory.tags) {
        if (tag.toLowerCase().includes(query)) {
          score += 5;
          if (matchType !== 'exact') matchType = 'tag';
        }
      }

      // Word-level matching
      const queryWords = query.split(/\s+/);
      const contentWords = memory.content.toLowerCase().split(/\s+/);
      for (const qWord of queryWords) {
        if (contentWords.some(cWord => cWord.includes(qWord))) {
          score += 2;
        }
      }

      // Importance boost
      score += memory.importance;

      // Recency boost (memories accessed recently get higher scores)
      const daysSinceAccess = (Date.now() - memory.accessedAt.getTime()) / (1000 * 60 * 60 * 24);
      score -= Math.min(5, daysSinceAccess * 0.1);

      // Access count boost
      score += Math.min(3, memory.accessCount * 0.5);

      return { memory, score, matchType };
    });

    // Sort by score and take top results
    const topResults = scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // Update access times for returned memories
    for (const result of topResults) {
      result.memory.accessedAt = new Date();
      result.memory.accessCount++;
      await this.updateInDb(result.memory);
    }

    // Emit event
    this.eventBus.emit({
      type: 'memory:recall',
      timestamp: new Date(),
      data: { query: params.query, resultCount: topResults.length },
      source: 'MemoryService',
    });

    return topResults.map(r => r.memory);
  }

  /**
   * Forget (delete) a memory
   */
  async forget(id: string): Promise<boolean> {
    this.ensureInitialized();

    if (!this.memories.has(id)) {
      return false;
    }

    this.memories.delete(id);
    this.db!.prepare('DELETE FROM memories WHERE id = ?').run(id);

    // Emit event
    this.eventBus.emit({
      type: 'memory:forget',
      timestamp: new Date(),
      data: { id },
      source: 'MemoryService',
    });

    this.logger.debug(`Memory deleted: ${id}`);
    return true;
  }

  /**
   * Get memory by ID
   */
  async get(id: string): Promise<Memory | undefined> {
    this.ensureInitialized();
    return this.memories.get(id);
  }

  /**
   * Get all memories
   */
  async getAll(): Promise<Memory[]> {
    this.ensureInitialized();
    return Array.from(this.memories.values());
  }

  /**
   * Get memory summary
   */
  async getSummary(): Promise<MemorySummary> {
    this.ensureInitialized();

    const all = Array.from(this.memories.values());

    const byType: Record<string, number> = {};
    for (const memory of all) {
      byType[memory.type] = (byType[memory.type] || 0) + 1;
    }

    const recentlyAccessed = [...all]
      .sort((a, b) => b.accessedAt.getTime() - a.accessedAt.getTime())
      .slice(0, 5);

    const mostImportant = [...all]
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 5);

    const dates = all.map(m => m.createdAt.getTime());

    return {
      total: all.length,
      byType,
      recentlyAccessed,
      mostImportant,
      oldestMemory: dates.length > 0 ? new Date(Math.min(...dates)) : undefined,
      newestMemory: dates.length > 0 ? new Date(Math.max(...dates)) : undefined,
    };
  }

  /**
   * Get module status
   */
  getStatus(): MemoryModuleStatus {
    const total = this.memories.size;
    const lastMemory = Array.from(this.memories.values())
      .sort((a, b) => b.accessedAt.getTime() - a.accessedAt.getTime())[0];

    return {
      enabled: this.config.enabled,
      totalMemories: total,
      dbPath: this.config.persistPath,
      lastAccessed: lastMemory?.accessedAt,
      memoryUsage: {
        used: total,
        max: this.config.maxItems,
        percentage: Math.round((total / this.config.maxItems) * 100),
      },
    };
  }

  /**
   * Get snapshot of all memories
   */
  getSnapshot(): Memory[] {
    return Array.from(this.memories.values());
  }

  /**
   * Load memories from snapshot
   */
  async loadSnapshot(memories: Memory[]): Promise<void> {
    this.ensureInitialized();

    this.memories.clear();

    for (const memory of memories) {
      this.memories.set(memory.id, memory);
      await this.insertToDb(memory);
    }

    this.logger.info(`Loaded ${memories.length} memories from snapshot`);
  }

  /**
   * Save all memories to persistent storage
   */
  async savePersistent(): Promise<number> {
    this.ensureInitialized();

    const count = this.memories.size;
    this.logger.info(`Saved ${count} memories to persistent storage`);
    return count;
  }

  /**
   * Load memories from persistent storage
   */
  async loadPersistent(): Promise<number> {
    await this.loadFromDb();
    return this.memories.size;
  }

  // ═══════════════════════════════════════════════════════════════
  //                      PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════

  private ensureInitialized(): void {
    if (!this.initialized || !this.db) {
      throw new Error('Memory service not initialized');
    }
  }

  private createTables(): void {
    this.db!.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        type TEXT NOT NULL,
        importance INTEGER NOT NULL,
        tags TEXT NOT NULL,
        created_at TEXT NOT NULL,
        accessed_at TEXT NOT NULL,
        access_count INTEGER DEFAULT 0,
        metadata TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
      CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance);
      CREATE INDEX IF NOT EXISTS idx_memories_accessed_at ON memories(accessed_at);
    `);
  }

  private async loadFromDb(): Promise<void> {
    if (!this.db) return;

    const rows = this.db.prepare(`
      SELECT * FROM memories
      ORDER BY importance DESC, accessed_at DESC
      LIMIT ?
    `).all(this.config.maxItems) as MemoryDbRow[];

    for (const row of rows) {
      const memory: Memory = {
        id: row.id,
        content: row.content,
        type: row.type as MemoryType,
        importance: row.importance,
        tags: JSON.parse(row.tags),
        createdAt: new Date(row.created_at),
        accessedAt: new Date(row.accessed_at),
        accessCount: row.access_count,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      };
      this.memories.set(memory.id, memory);
    }
  }

  private async insertToDb(memory: Memory): Promise<void> {
    if (!this.db) return;

    this.db.prepare(`
      INSERT OR REPLACE INTO memories
      (id, content, type, importance, tags, created_at, accessed_at, access_count, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      memory.id,
      memory.content,
      memory.type,
      memory.importance,
      JSON.stringify(memory.tags),
      memory.createdAt.toISOString(),
      memory.accessedAt.toISOString(),
      memory.accessCount,
      memory.metadata ? JSON.stringify(memory.metadata) : null
    );
  }

  private async updateInDb(memory: Memory): Promise<void> {
    if (!this.db) return;

    this.db.prepare(`
      UPDATE memories
      SET importance = ?, tags = ?, accessed_at = ?, access_count = ?, metadata = ?
      WHERE id = ?
    `).run(
      memory.importance,
      JSON.stringify(memory.tags),
      memory.accessedAt.toISOString(),
      memory.accessCount,
      memory.metadata ? JSON.stringify(memory.metadata) : null,
      memory.id
    );
  }

  private findSimilar(content: string): Memory | undefined {
    const normalized = content.toLowerCase().trim();

    for (const memory of this.memories.values()) {
      const memoryNormalized = memory.content.toLowerCase().trim();

      // Exact match
      if (memoryNormalized === normalized) {
        return memory;
      }

      // High overlap check
      const overlap = this.calculateOverlap(normalized, memoryNormalized);
      if (overlap > 0.8) {
        return memory;
      }
    }

    return undefined;
  }

  private calculateOverlap(a: string, b: string): number {
    const wordsA = new Set(a.split(/\s+/).filter(w => w.length > 2));
    const wordsB = new Set(b.split(/\s+/).filter(w => w.length > 2));

    if (wordsA.size === 0 || wordsB.size === 0) {
      return 0;
    }

    let intersection = 0;
    for (const word of wordsA) {
      if (wordsB.has(word)) {
        intersection++;
      }
    }

    return intersection / Math.max(wordsA.size, wordsB.size);
  }

  private async enforceLimit(): Promise<void> {
    if (this.memories.size <= this.config.maxItems) {
      return;
    }

    // Sort by composite score (importance + recency)
    const sorted = Array.from(this.memories.values())
      .sort((a, b) => {
        const scoreA = a.importance * 10 - (Date.now() - a.accessedAt.getTime()) / (1000 * 60 * 60);
        const scoreB = b.importance * 10 - (Date.now() - b.accessedAt.getTime()) / (1000 * 60 * 60);
        return scoreA - scoreB; // Lower scores first (to be removed)
      });

    const toRemove = sorted.slice(0, this.memories.size - this.config.maxItems);

    for (const memory of toRemove) {
      await this.forget(memory.id);
    }

    this.logger.debug(`Removed ${toRemove.length} memories to enforce limit`);
  }
}
