import { HookContext, HookResult, HookWarning } from './types.js';
import { Logger } from '../core/logger.js';
import { ConfigManager } from '../core/config-manager.js';
import { StateManager } from '../core/state-manager.js';
import { EventBus } from '../core/event-bus.js';

// Module imports - use Module classes
import { MemoryModule } from '../modules/memory/index.js';
import { GuardModule } from '../modules/guard/index.js';
import { ProcessModule } from '../modules/process/index.js';
import { ResourceModule } from '../modules/resource/index.js';
import { WorkflowModule } from '../modules/workflow/index.js';
import { TestingModule } from '../modules/testing/index.js';
import { DocumentsModule } from '../modules/documents/index.js';

export interface Modules {
  memory: MemoryModule;
  guard: GuardModule;
  process: ProcessModule;
  resource: ResourceModule;
  workflow: WorkflowModule;
  testing: TestingModule;
  documents: DocumentsModule;
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
