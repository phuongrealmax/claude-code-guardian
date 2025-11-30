// src/modules/agents/index.ts

/**
 * Agents Module
 *
 * Multi-agent architecture for specialized task delegation.
 * Inspired by Claude Enterprise Toolkit pattern.
 */

import { EventBus } from '../../core/event-bus.js';
import { Logger } from '../../core/logger.js';
import { AgentsService } from './agents.service.js';
import {
  AgentsModuleConfig,
  RegisterAgentParams,
  SelectAgentParams,
  CoordinateAgentsParams,
} from './agents.types.js';
import {
  getAgentsTools,
  formatAgent,
  formatAgentsList,
  formatSelection,
  formatCoordination,
  formatStatus,
  MCPTool,
} from './agents.tools.js';

// ═══════════════════════════════════════════════════════════════
//                      AGENTS MODULE CLASS
// ═══════════════════════════════════════════════════════════════

export class AgentsModule {
  private service: AgentsService;
  private logger: Logger;

  constructor(
    private config: AgentsModuleConfig,
    private eventBus: EventBus,
    parentLogger: Logger,
    private projectRoot: string
  ) {
    this.logger = parentLogger.child('Agents');
    this.service = new AgentsService(config, eventBus, this.logger, projectRoot);
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
    return getAgentsTools();
  }

  /**
   * Handle MCP tool call
   */
  async handleTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    if (!this.config.enabled) {
      return { error: 'Agents module is disabled' };
    }

    switch (toolName) {
      case 'list':
        return this.handleList(args);

      case 'get':
        return this.handleGet(args);

      case 'select':
        return this.handleSelect(args);

      case 'register':
        return this.handleRegister(args);

      case 'coordinate':
        return this.handleCoordinate(args);

      case 'reload':
        return this.handleReload();

      case 'status':
        return this.handleStatus();

      default:
        throw new Error(`Unknown agents tool: ${toolName}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //                      TOOL HANDLERS
  // ═══════════════════════════════════════════════════════════════

  private async handleList(args: Record<string, unknown>): Promise<unknown> {
    const enabledOnly = args.enabledOnly !== false;
    let agents = this.service.getAll();

    if (enabledOnly) {
      agents = agents.filter(a => a.enabled);
    }

    return {
      success: true,
      count: agents.length,
      agents: agents.map(a => ({
        id: a.id,
        name: a.name,
        role: a.role,
        enabled: a.enabled,
        specializations: a.specializations,
        responsibilityCount: a.responsibilities.length,
      })),
      formatted: formatAgentsList(agents),
    };
  }

  private async handleGet(args: Record<string, unknown>): Promise<unknown> {
    const agentId = args.agentId as string;
    const agent = this.service.get(agentId);

    if (!agent) {
      return {
        success: false,
        error: `Agent "${agentId}" not found`,
      };
    }

    return {
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        role: agent.role,
        enabled: agent.enabled,
        specializations: agent.specializations,
        responsibilities: agent.responsibilities,
        principles: agent.principles,
        delegationRules: agent.delegationRules.map(r => ({
          pattern: r.pattern,
          matchType: r.matchType,
          priority: r.priority,
        })),
        createdAt: agent.createdAt.toISOString(),
        updatedAt: agent.updatedAt.toISOString(),
      },
      formatted: formatAgent(agent),
    };
  }

  private async handleSelect(args: Record<string, unknown>): Promise<unknown> {
    const params: SelectAgentParams = {
      task: args.task as string,
      files: args.files as string[] | undefined,
      keywords: args.keywords as string[] | undefined,
      domain: args.domain as string | undefined,
    };

    const selection = this.service.selectAgent(params);

    if (!selection) {
      return {
        success: false,
        error: 'No suitable agent found for this task',
        suggestion: 'Consider registering a custom agent or providing more context',
      };
    }

    return {
      success: true,
      selection: {
        agentId: selection.agent.id,
        agentName: selection.agent.name,
        role: selection.agent.role,
        confidence: selection.confidence,
        reason: selection.reason,
        matchedRules: selection.matchedRules.map(r => r.pattern),
      },
      formatted: formatSelection(selection),
    };
  }

  private async handleRegister(args: Record<string, unknown>): Promise<unknown> {
    const params: RegisterAgentParams = {
      id: args.id as string,
      name: args.name as string,
      role: args.role as string,
      specializations: args.specializations as string[],
      responsibilities: args.responsibilities as string[],
      principles: args.principles as string[] | undefined,
    };

    // Check if agent already exists
    if (this.service.get(params.id)) {
      return {
        success: false,
        error: `Agent "${params.id}" already exists`,
      };
    }

    const agent = this.service.register(params);

    return {
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        role: agent.role,
      },
      message: `Agent "${agent.name}" registered successfully`,
      formatted: formatAgent(agent),
    };
  }

  private async handleCoordinate(args: Record<string, unknown>): Promise<unknown> {
    const params: CoordinateAgentsParams = {
      task: args.task as string,
      agentIds: args.agentIds as string[],
      mode: args.mode as 'sequential' | 'parallel' | 'review',
    };

    try {
      const result = this.service.coordinate(params);

      return {
        success: true,
        coordination: {
          taskId: result.taskId,
          status: result.status,
          agents: result.agents.map(a => a.id),
          plan: result.plan,
        },
        formatted: formatCoordination(result),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Coordination failed',
      };
    }
  }

  private async handleReload(): Promise<unknown> {
    await this.service.reload();
    const status = this.service.getStatus();

    return {
      success: true,
      message: 'Agents reloaded successfully',
      agentCount: status.totalAgents,
      activeAgents: status.activeAgents,
    };
  }

  private async handleStatus(): Promise<unknown> {
    const status = this.service.getStatus();

    return {
      success: true,
      status,
      formatted: formatStatus(status),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //                      PUBLIC SERVICE METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get module status
   */
  getStatus() {
    return this.service.getStatus();
  }

  /**
   * Select agent for a task
   */
  selectAgent(params: SelectAgentParams) {
    return this.service.selectAgent(params);
  }

  /**
   * Get agent by ID
   */
  getAgent(id: string) {
    return this.service.get(id);
  }

  /**
   * Get all agents
   */
  getAllAgents() {
    return this.service.getAll();
  }

  /**
   * Register a new agent
   */
  registerAgent(params: RegisterAgentParams) {
    return this.service.register(params);
  }

  /**
   * Coordinate multiple agents
   */
  coordinateAgents(params: CoordinateAgentsParams) {
    return this.service.coordinate(params);
  }

  /**
   * Reload agents from files
   */
  async reloadAgents() {
    return this.service.reload();
  }
}

// ═══════════════════════════════════════════════════════════════
//                      EXPORTS
// ═══════════════════════════════════════════════════════════════

export { AgentsService } from './agents.service.js';
export * from './agents.types.js';
export * from './agents.tools.js';
