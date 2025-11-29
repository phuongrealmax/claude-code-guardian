import { HookContext, HookResult, HookWarning } from './types.js';
import { Logger } from '../core/logger.js';
import { ConfigManager } from '../core/config-manager.js';
import { StateManager } from '../core/state-manager.js';
import { EventBus } from '../core/event-bus.js';

// Module imports - use actual service types
import { MemoryService } from '../modules/memory/memory.service.js';
import { GuardService } from '../modules/guard/guard.service.js';
import { ProcessService } from '../modules/process/process.service.js';
import { ResourceService } from '../modules/resource/resource.service.js';
import { WorkflowService } from '../modules/workflow/workflow.service.js';
import { TestingService } from '../modules/testing/testing.service.js';
import { DocumentsService } from '../modules/documents/documents.service.js';

export interface Modules {
  memory: MemoryService;
  guard: GuardService;
  process: ProcessService;
  resource: ResourceService;
  workflow: WorkflowService;
  testing: TestingService;
  documents: DocumentsService;
}

export abstract class HookHandler {
  protected logger: Logger;
  protected config: ConfigManager;
  protected state: StateManager;
  protected eventBus: EventBus;
  protected modules: Modules;
  protected context: HookContext;

  constructor(
    modules: Modules,
    context: HookContext,
    logger: Logger,
    config: ConfigManager,
    state: StateManager,
    eventBus: EventBus
  ) {
    this.modules = modules;
    this.context = context;
    this.logger = logger;
    this.config = config;
    this.state = state;
    this.eventBus = eventBus;
  }

  abstract execute(input: unknown): Promise<HookResult>;

  protected formatOutput(result: HookResult): string {
    const lines: string[] = [];

    if (result.blocked) {
      lines.push(`BLOCKED: ${result.blockReason}`);
    }

    if (result.warnings && result.warnings.length > 0) {
      for (const warning of result.warnings) {
        const prefix = warning.level === 'error' ? '[ERROR]' : warning.level === 'warning' ? '[WARN]' : '[INFO]';
        lines.push(`${prefix} ${warning.message}`);
        if (warning.action) {
          lines.push(`   -> ${warning.action}`);
        }
      }
    }

    if (result.message) {
      lines.push(result.message);
    }

    return lines.join('\n');
  }

  protected createWarning(
    level: HookWarning['level'],
    message: string,
    action?: string
  ): HookWarning {
    return { level, message, action };
  }
}
