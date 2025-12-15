// src/modules/auto-agent/index.ts
/**
 * AutoAgent Module v3.0
 *
 * Provides autonomous agent capabilities:
 * - TaskDecomposer: Break complex tasks into subtasks (linear)
 * - TaskGraph: DAG-based task orchestration (NEW - parallel execution)
 * - ToolRouter: Auto-select appropriate tools
 * - AutoFixLoop: Self-healing error correction
 * - ErrorMemory: Learn from errors
 */

import { EventBus } from '../../core/event-bus.js';
import { Logger } from '../../core/logger.js';
import { AutoAgentModuleConfig } from './auto-agent.types.js';
import { AutoAgentService } from './auto-agent.service.js';
import { createAutoAgentTools } from './auto-agent.tools.js';
import { TaskGraphService } from './task-graph.js';
import { createTaskGraphTools, TASK_GRAPH_TOOL_DEFINITIONS } from './task-graph.tools.js';
import { GovernorState } from '../resource/resource.types.js';

// Re-export types
export * from './auto-agent.types.js';
export { AutoAgentService } from './auto-agent.service.js';
export { TaskDecomposer } from './task-decomposer.js';
export { ToolRouter } from './tool-router.js';
export { AutoFixLoop } from './auto-fix-loop.js';
export { ErrorMemory } from './error-memory.js';

// NEW: TaskGraph exports
export { TaskGraphService } from './task-graph.js';
export type { TaskGraph, TaskNode, GraphAnalysis, CreateGraphParams } from './task-graph.js';
export { createTaskGraphTools, TASK_GRAPH_TOOL_DEFINITIONS } from './task-graph.tools.js';

// Default configuration
export const DEFAULT_AUTO_AGENT_CONFIG: AutoAgentModuleConfig = {
  enabled: true,

  decomposer: {
    maxSubtasks: 10,
    autoDecompose: true,
    minComplexityForDecompose: 4,
  },

  router: {
    enabled: true,
    routingRules: [],
    fallbackAgent: undefined,
  },

  fixLoop: {
    enabled: true,
    maxRetries: 3,
    retryDelayMs: 1000,
    autoRollbackOnFail: true,
  },

  errorMemory: {
    enabled: true,
    maxErrors: 100,
    deduplicateThreshold: 0.8,
    autoRecall: true,
  },
};

/**
 * AutoAgent Module Class v3.0
 */
export class AutoAgentModule {
  private service: AutoAgentService;
  private taskGraphService: TaskGraphService;
  private config: AutoAgentModuleConfig;
  private logger: Logger;

  constructor(
    config: Partial<AutoAgentModuleConfig>,
    eventBus: EventBus,
    logger: Logger
  ) {
    this.logger = logger;

    // Merge with defaults
    this.config = {
      ...DEFAULT_AUTO_AGENT_CONFIG,
      ...config,
      decomposer: { ...DEFAULT_AUTO_AGENT_CONFIG.decomposer, ...config.decomposer },
      router: { ...DEFAULT_AUTO_AGENT_CONFIG.router, ...config.router },
      fixLoop: { ...DEFAULT_AUTO_AGENT_CONFIG.fixLoop, ...config.fixLoop },
      errorMemory: { ...DEFAULT_AUTO_AGENT_CONFIG.errorMemory, ...config.errorMemory },
    };

    this.service = new AutoAgentService(this.config, eventBus, logger);

    // NEW: Initialize TaskGraph service
    this.taskGraphService = new TaskGraphService(logger, eventBus);
  }

  async initialize(): Promise<void> {
    await this.service.initialize();
    this.logger.info('AutoAgent Module v3.0 initialized with TaskGraph DAG support');
  }

  async shutdown(): Promise<void> {
    await this.service.shutdown();
  }

  getService(): AutoAgentService {
    return this.service;
  }

  getTaskGraphService(): TaskGraphService {
    return this.taskGraphService;
  }

  /**
   * Set the governor state provider for token budget integration
   * This allows AutoAgent to respect token budget limits when decomposing tasks
   */
  setGovernorStateProvider(provider: () => GovernorState): void {
    this.service.setGovernorStateProvider(provider);
    this.logger.debug('Governor state provider configured for AutoAgent');
  }

  getTools() {
    return createAutoAgentTools(this.service);
  }

  /**
   * Get TaskGraph tools for MCP registration
   */
  getTaskGraphTools() {
    return createTaskGraphTools(this.taskGraphService);
  }

  /**
   * Get all tool definitions for MCP
   */
  getAllToolDefinitions() {
    const baseTools = this.getTools().map(t => ({ name: t.name, description: t.description }));
    return [...baseTools, ...TASK_GRAPH_TOOL_DEFINITIONS];
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Handle MCP tool calls routed from server
   */
  async handleTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    // Check TaskGraph tools first
    const taskGraphTools = this.getTaskGraphTools();
    if (name in taskGraphTools) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (taskGraphTools as any)[name].handler(args);
    }

    // Fall back to base AutoAgent tools
    const tools = this.getTools();
    const tool = tools.find(t => t.name === name);

    if (!tool) {
      throw new Error(`Unknown auto-agent tool: ${name}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return tool.handler(args as any);
  }
}
