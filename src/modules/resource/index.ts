// src/modules/resource/index.ts

import { ResourceService } from './resource.service.js';
import { getResourceTools } from './resource.tools.js';
import { ResourceModuleConfig } from '../../core/types.js';
import { EventBus } from '../../core/event-bus.js';
import { Logger } from '../../core/logger.js';
import { CheckpointReason } from './resource.types.js';
import { CheckpointDiffService, DiffOptions } from './checkpoint-diff.service.js';

export class ResourceModule {
  private service: ResourceService;
  private diffService: CheckpointDiffService;

  constructor(
    config: ResourceModuleConfig,
    eventBus: EventBus,
    private logger: Logger,
    private projectRoot: string = process.cwd()
  ) {
    this.service = new ResourceService(config, eventBus, logger, projectRoot);
    this.diffService = new CheckpointDiffService(logger, projectRoot);
  }

  async initialize(): Promise<void> {
    await this.service.initialize();
  }

  getTools() {
    return getResourceTools();
  }

  async handleTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    switch (toolName) {
      case 'resource_status':
        return this.service.getStatus();

      case 'resource_update_tokens':
        return this.service.updateTokenUsage(
          args.used as number,
          args.estimated as number | undefined
        );

      case 'resource_estimate_task':
        return this.service.estimateTask({
          description: args.description as string,
          filesCount: args.filesCount as number | undefined,
          linesEstimate: args.linesEstimate as number | undefined,
          hasTests: args.hasTests as boolean | undefined,
          hasBrowserTesting: args.hasBrowserTesting as boolean | undefined,
        });

      case 'resource_checkpoint_create':
        return this.service.createCheckpoint({
          name: args.name as string | undefined,
          reason: (args.reason as CheckpointReason) || 'manual',
        });

      case 'resource_checkpoint_list':
        return this.service.listCheckpoints();

      case 'resource_checkpoint_restore':
        return this.service.restoreCheckpoint(args.checkpointId as string);

      case 'resource_checkpoint_delete':
        return this.service.deleteCheckpoint(args.checkpointId as string);

      // Token Budget Governor tools
      case 'resource_governor_state':
        return this.service.getGovernorState();

      case 'resource_action_allowed':
        return this.service.isActionAllowed(args.action as string);

      // Checkpoint Diff
      case 'resource_checkpoint_diff':
        return this.handleCheckpointDiff(args);

      default:
        throw new Error(`Unknown resource tool: ${toolName}`);
    }
  }

  async shutdown(): Promise<void> {
    // Cleanup logic if needed
  }

  // ═══════════════════════════════════════════════════════════════
  //                      WRAPPER METHODS
  // ═══════════════════════════════════════════════════════════════

  getStatus() {
    return this.service.getStatus();
  }

  async createCheckpoint(params: { name?: string; reason: CheckpointReason; metadata?: Record<string, unknown> }) {
    return this.service.createCheckpoint(params);
  }

  updateTokenUsage(used: number, estimated?: number) {
    return this.service.updateTokenUsage(used, estimated);
  }

  listCheckpoints() {
    return this.service.listCheckpoints();
  }

  // Token Budget Governor
  getGovernorState() {
    return this.service.getGovernorState();
  }

  isActionAllowed(action: string) {
    return this.service.isActionAllowed(action);
  }

  // P1: Session Context Restore
  setResumeStateProvider(provider: import('./resource.service.js').ResumeStateProvider) {
    this.service.setResumeStateProvider(provider);
  }

  // P1: Session Timeline Integration
  setStateManager(stateManager: import('../../core/state-manager.js').StateManager) {
    this.service.setStateManager(stateManager);
  }

  async getLatestResumeState() {
    return this.service.getLatestResumeState();
  }

  // Checkpoint Diff
  getDiffService() {
    return this.diffService;
  }

  // ═══════════════════════════════════════════════════════════════
  //                      PRIVATE HANDLERS
  // ═══════════════════════════════════════════════════════════════

  private async handleCheckpointDiff(args: Record<string, unknown>) {
    const fromCheckpointId = args.fromCheckpointId as string;
    const toCheckpointId = (args.toCheckpointId as string) || 'current';
    const options: DiffOptions = {
      includeUnchanged: args.includeUnchanged as boolean | undefined,
      maxFiles: args.maxFiles as number | undefined,
    };

    try {
      const diff = await this.diffService.generateDiff(
        fromCheckpointId,
        toCheckpointId,
        options
      );

      // Return both the diff data and formatted summary
      return {
        success: true,
        diff,
        formatted: this.diffService.formatDiffSummary(diff),
      };
    } catch (error) {
      this.logger.error('Checkpoint diff failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export { ResourceService, ResumeStateProvider } from './resource.service.js';
export { getResourceTools } from './resource.tools.js';
export * from './resource.types.js';
export {
  AutoCheckpointService,
  AutoCheckpointConfig,
  AutoCheckpointResult,
  DEFAULT_AUTO_CHECKPOINT_CONFIG,
} from './auto-checkpoint.service.js';
export {
  CheckpointDiffService,
  CheckpointDiff,
  FileDiff,
  DiffOptions,
} from './checkpoint-diff.service.js';
