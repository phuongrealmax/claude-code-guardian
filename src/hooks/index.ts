// ═══════════════════════════════════════════════════════════════
//                      HOOKS MODULE EXPORTS
// ═══════════════════════════════════════════════════════════════

export * from './types.js';
export * from './hook-handler.js';
export { SessionStartHook } from './session-start.hook.js';
export { PreToolCallHook } from './pre-tool-call.hook.js';
export { PostToolCallHook } from './post-tool-call.hook.js';
export { SessionEndHook } from './session-end.hook.js';

import { HookType, HookContext, HookResult } from './types.js';
import { Modules, HookHandler } from './hook-handler.js';
import { SessionStartHook } from './session-start.hook.js';
import { PreToolCallHook } from './pre-tool-call.hook.js';
import { PostToolCallHook } from './post-tool-call.hook.js';
import { SessionEndHook } from './session-end.hook.js';
import { Logger } from '../core/logger.js';
import { ConfigManager } from '../core/config-manager.js';
import { StateManager } from '../core/state-manager.js';
import { EventBus } from '../core/event-bus.js';

// ═══════════════════════════════════════════════════════════════
//                      HOOK ROUTER
// ═══════════════════════════════════════════════════════════════

export class HookRouter {
  constructor(
    private modules: Modules,
    private logger: Logger,
    private config: ConfigManager,
    private state: StateManager,
    private eventBus: EventBus
  ) {}

  async executeHook(
    hookType: HookType,
    input: unknown,
    context: HookContext
  ): Promise<HookResult> {
    let handler: HookHandler;

    switch (hookType) {
      case 'session-start':
        handler = new SessionStartHook(
          this.modules, context, this.logger,
          this.config, this.state, this.eventBus
        );
        break;

      case 'pre-tool':
        handler = new PreToolCallHook(
          this.modules, context, this.logger,
          this.config, this.state, this.eventBus
        );
        break;

      case 'post-tool':
        handler = new PostToolCallHook(
          this.modules, context, this.logger,
          this.config, this.state, this.eventBus
        );
        break;

      case 'session-end':
        handler = new SessionEndHook(
          this.modules, context, this.logger,
          this.config, this.state, this.eventBus
        );
        break;

      default:
        return {
          success: false,
          message: `Unknown hook type: ${hookType}`,
        };
    }

    return handler.execute(input);
  }
}
