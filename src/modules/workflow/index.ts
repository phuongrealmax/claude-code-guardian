// src/modules/workflow/index.ts

import { WorkflowService } from './workflow.service.js';
import { getWorkflowTools } from './workflow.tools.js';
import { WorkflowModuleConfig } from '../../core/types.js';
import { EventBus } from '../../core/event-bus.js';
import { Logger } from '../../core/logger.js';
import { StateManager } from '../../core/state-manager.js';
import { CompletionGatesService, GatePolicyConfig } from '../../core/completion-gates.js';
import { TaskNote } from './workflow.types.js';

export interface WorkflowModuleOptions {
  stateManager?: StateManager;
  completionGates?: CompletionGatesService;
  gatePolicy?: Partial<GatePolicyConfig>;
}

export class WorkflowModule {
  private service: WorkflowService;

  constructor(
    config: WorkflowModuleConfig,
    eventBus: EventBus,
    logger: Logger,
    projectRoot?: string,
    options?: WorkflowModuleOptions
  ) {
    this.service = new WorkflowService(config, eventBus, logger, projectRoot, options);
  }

  /**
   * Set state manager for gate evaluation (deferred initialization)
   */
  setStateManager(stateManager: StateManager): void {
    this.service.setStateManager(stateManager);
  }

  /**
   * Enable or disable completion gates
   */
  setGatesEnabled(enabled: boolean): void {
    this.service.setGatesEnabled(enabled);
  }

  /**
   * Update gate policy configuration
   */
  updateGatePolicy(config: Partial<GatePolicyConfig>): void {
    this.service.updateGatePolicy(config);
  }

  async initialize(): Promise<void> {
    await this.service.initialize();
  }

  getTools() {
    return getWorkflowTools();
  }

  async handleTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    switch (toolName) {
      case 'workflow_task_create':
        return this.service.createTask({
          name: args.name as string,
          description: args.description as string | undefined,
          priority: args.priority as 'low' | 'medium' | 'high' | 'critical' | undefined,
          parentId: args.parentId as string | undefined,
          estimatedTokens: args.estimatedTokens as number | undefined,
          tags: args.tags as string[] | undefined,
        });

      case 'workflow_task_start':
        return this.service.startTask(args.taskId as string);

      case 'workflow_task_update':
        return this.service.updateTask(args.taskId as string, {
          progress: args.progress as number | undefined,
          status: args.status as 'pending' | 'in_progress' | 'paused' | 'blocked' | 'completed' | 'failed' | undefined,
        });

      case 'workflow_task_complete':
        return this.service.completeTask(
          args.taskId as string,
          args.actualTokens as number | undefined
        );

      case 'workflow_task_pause':
        return this.service.pauseTask(args.taskId as string);

      case 'workflow_task_fail':
        return this.service.failTask(
          args.taskId as string,
          args.reason as string | undefined
        );

      case 'workflow_task_note':
        return this.service.addNote(
          args.taskId as string,
          args.content as string,
          (args.type as TaskNote['type']) || 'note'
        );

      case 'workflow_task_list':
        return this.service.getTasks({
          status: args.status as string[] | undefined,
          priority: args.priority as string[] | undefined,
        } as any);

      case 'workflow_current':
        return this.service.getCurrentTask();

      case 'workflow_status':
        return this.service.getStatus();

      case 'workflow_task_delete':
        return this.service.deleteTask(args.taskId as string);

      case 'workflow_cleanup': {
        const clearAll = args.clearAll as boolean | undefined;
        if (clearAll) {
          return { deleted: await this.service.clearAllTasks(), type: 'all' };
        } else {
          return { deleted: await this.service.clearCompletedTasks(), type: 'completed' };
        }
      }

      default:
        throw new Error(`Unknown workflow tool: ${toolName}`);
    }
  }

  getStatus() {
    return this.service.getStatus();
  }

  getTaskList() {
    return this.service.getTaskList();
  }

  async loadPendingTasks() {
    return this.service.loadPendingTasks();
  }

  async saveTasks() {
    return this.service.saveTasks();
  }

  async shutdown(): Promise<void> {
    await this.service.saveTasks();
  }

  // ═══════════════════════════════════════════════════════════════
  //                      WRAPPER METHODS
  // ═══════════════════════════════════════════════════════════════

  getCurrentTask() {
    return this.service.getCurrentTask();
  }

  getTasks(filter?: Parameters<typeof this.service.getTasks>[0]) {
    return this.service.getTasks(filter);
  }

  async updateTask(taskId: string, params: { progress?: number; status?: 'pending' | 'in_progress' | 'paused' | 'blocked' | 'completed' | 'failed' }) {
    return this.service.updateTask(taskId, params);
  }

  async pauseTask(taskId: string) {
    return this.service.pauseTask(taskId);
  }

  async addAffectedFile(taskId: string, filePath: string) {
    return this.service.addAffectedFile(taskId, filePath);
  }

  async createTask(params: Parameters<typeof this.service.createTask>[0]) {
    return this.service.createTask(params);
  }

  async startTask(taskId: string) {
    return this.service.startTask(taskId);
  }

  async completeTask(taskId: string, actualTokens?: number) {
    return this.service.completeTask(taskId, actualTokens);
  }

  /**
   * Force complete a task, bypassing gates
   */
  async forceCompleteTask(taskId: string, actualTokens?: number) {
    return this.service.forceCompleteTask(taskId, actualTokens);
  }
}

export { WorkflowService } from './workflow.service.js';
export { getWorkflowTools } from './workflow.tools.js';
export * from './workflow.types.js';
