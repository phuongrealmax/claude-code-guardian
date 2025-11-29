// src/modules/memory/index.ts

import { MemoryModuleConfig } from '../../core/types.js';
import { EventBus } from '../../core/event-bus.js';
import { Logger } from '../../core/logger.js';
import { MemoryService } from './memory.service.js';
import {
  getMemoryTools,
  formatMemoryResult,
  formatMemoryList,
  formatSummary,
  MCPTool,
} from './memory.tools.js';
import { StoreMemoryParams, RecallMemoryParams } from './memory.types.js';

// ═══════════════════════════════════════════════════════════════
//                      MEMORY MODULE CLASS
// ═══════════════════════════════════════════════════════════════

export class MemoryModule {
  private service: MemoryService;
  private logger: Logger;

  constructor(
    private config: MemoryModuleConfig,
    private eventBus: EventBus,
    parentLogger: Logger
  ) {
    this.logger = parentLogger.child('Memory');
    this.service = new MemoryService(config, eventBus, this.logger);
  }

  /**
   * Initialize the module
   */
  async initialize(): Promise<void> {
    await this.service.initialize();
  }

  /**
   * Shutdown the module
   */
  async shutdown(): Promise<void> {
    await this.service.shutdown();
  }

  /**
   * Get MCP tool definitions
   */
  getTools(): MCPTool[] {
    if (!this.config.enabled) {
      return [];
    }
    return getMemoryTools();
  }

  /**
   * Handle MCP tool call
   */
  async handleTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    if (!this.config.enabled) {
      return { error: 'Memory module is disabled' };
    }

    switch (toolName) {
      case 'store':
        return this.handleStore(args);

      case 'recall':
        return this.handleRecall(args);

      case 'forget':
        return this.handleForget(args);

      case 'summary':
        return this.handleSummary();

      case 'list':
        return this.handleList(args);

      default:
        throw new Error(`Unknown memory tool: ${toolName}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //                      TOOL HANDLERS
  // ═══════════════════════════════════════════════════════════════

  private async handleStore(args: Record<string, unknown>): Promise<unknown> {
    const params: StoreMemoryParams = {
      content: args.content as string,
      type: args.type as StoreMemoryParams['type'],
      importance: args.importance as number,
      tags: args.tags as string[] | undefined,
      metadata: args.metadata as Record<string, unknown> | undefined,
    };

    const memory = await this.service.store(params);

    return {
      success: true,
      memory: {
        id: memory.id,
        type: memory.type,
        importance: memory.importance,
        tags: memory.tags,
      },
      message: `Memory stored successfully with ID: ${memory.id}`,
      formatted: formatMemoryResult(memory),
    };
  }

  private async handleRecall(args: Record<string, unknown>): Promise<unknown> {
    const params: RecallMemoryParams = {
      query: args.query as string,
      type: args.type as RecallMemoryParams['type'],
      limit: args.limit as number | undefined,
      minImportance: args.minImportance as number | undefined,
      tags: args.tags as string[] | undefined,
    };

    const memories = await this.service.recall(params);

    if (memories.length === 0) {
      return {
        success: true,
        count: 0,
        memories: [],
        message: `No memories found matching "${params.query}"`,
      };
    }

    return {
      success: true,
      count: memories.length,
      memories: memories.map(m => ({
        id: m.id,
        content: m.content,
        type: m.type,
        importance: m.importance,
        tags: m.tags,
        accessCount: m.accessCount,
      })),
      formatted: formatMemoryList(memories),
    };
  }

  private async handleForget(args: Record<string, unknown>): Promise<unknown> {
    const id = args.id as string;
    const success = await this.service.forget(id);

    if (!success) {
      return {
        success: false,
        message: `Memory with ID "${id}" not found`,
      };
    }

    return {
      success: true,
      message: `Memory "${id}" has been forgotten`,
    };
  }

  private async handleSummary(): Promise<unknown> {
    const summary = await this.service.getSummary();

    return {
      success: true,
      summary,
      formatted: formatSummary(summary),
    };
  }

  private async handleList(args: Record<string, unknown>): Promise<unknown> {
    const type = args.type as string | undefined;
    const limit = (args.limit as number) || 20;
    const sortBy = (args.sortBy as string) || 'importance';

    let memories = await this.service.getAll();

    // Filter by type
    if (type) {
      memories = memories.filter(m => m.type === type);
    }

    // Sort
    switch (sortBy) {
      case 'importance':
        memories.sort((a, b) => b.importance - a.importance);
        break;
      case 'recent':
        memories.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      case 'accessed':
        memories.sort((a, b) => b.accessedAt.getTime() - a.accessedAt.getTime());
        break;
      case 'created':
        memories.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        break;
    }

    // Limit
    memories = memories.slice(0, limit);

    return {
      success: true,
      count: memories.length,
      memories: memories.map(m => ({
        id: m.id,
        content: m.content,
        type: m.type,
        importance: m.importance,
        tags: m.tags,
        createdAt: m.createdAt.toISOString(),
      })),
      formatted: formatMemoryList(memories),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //                      PUBLIC SERVICE METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get memory summary
   */
  async getSummary() {
    return this.service.getSummary();
  }

  /**
   * Get module status
   */
  getStatus() {
    return this.service.getStatus();
  }

  /**
   * Load from persistent storage
   */
  async loadPersistent(): Promise<number> {
    return this.service.loadPersistent();
  }

  /**
   * Save to persistent storage
   */
  async savePersistent(): Promise<void> {
    await this.service.savePersistent();
  }

  /**
   * Get memory snapshot
   */
  getSnapshot() {
    return this.service.getSnapshot();
  }

  /**
   * Load from snapshot
   */
  async loadSnapshot(memories: import('../../core/types.js').Memory[]): Promise<void> {
    return this.service.loadSnapshot(memories);
  }
}

// ═══════════════════════════════════════════════════════════════
//                      EXPORTS
// ═══════════════════════════════════════════════════════════════

export { MemoryService } from './memory.service.js';
export * from './memory.types.js';
export * from './memory.tools.js';
