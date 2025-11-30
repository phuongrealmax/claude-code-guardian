// src/modules/resource/index.ts

import { ResourceService } from './resource.service.js';
import { getResourceTools } from './resource.tools.js';
import { ResourceModuleConfig } from '../../core/types.js';
import { EventBus } from '../../core/event-bus.js';
import { Logger } from '../../core/logger.js';
import { CheckpointReason } from './resource.types.js';

export class ResourceModule {
  private service: ResourceService;

  constructor(
    config: ResourceModuleConfig,
    eventBus: EventBus,
    logger: Logger,
    projectRoot?: string
  ) {
    this.service = new ResourceService(config, eventBus, logger, projectRoot);
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
}

export { ResourceService } from './resource.service.js';
export { getResourceTools } from './resource.tools.js';
export * from './resource.types.js';
