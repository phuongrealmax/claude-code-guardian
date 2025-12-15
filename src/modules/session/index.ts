// src/modules/session/index.ts
// Session module exports

export { SessionService, type SessionModules, type SessionStateProvider } from './session.service.js';
export {
  getSessionToolDefinitions,
  createSessionToolHandlers,
  type SessionToolHandlers,
} from './session.tools.js';
export {
  type SessionConfig,
  type SessionExportV1,
  type SessionTimelineEvent,
  type SessionStatus,
  type ResumeOffer,
  DEFAULT_SESSION_CONFIG,
} from './session.types.js';

import { EventBus } from '../../core/event-bus.js';
import { Logger } from '../../core/logger.js';
import { SessionService } from './session.service.js';
import { SessionConfig, DEFAULT_SESSION_CONFIG } from './session.types.js';
import { getSessionToolDefinitions, createSessionToolHandlers } from './session.tools.js';

/**
 * Session Module - manages session persistence and resume
 */
export class SessionModule {
  private service: SessionService;
  private handlers: ReturnType<typeof createSessionToolHandlers>;

  constructor(
    config: Partial<SessionConfig>,
    eventBus: EventBus,
    logger: Logger,
    projectRoot: string
  ) {
    const fullConfig = { ...DEFAULT_SESSION_CONFIG, ...config };
    this.service = new SessionService(fullConfig, eventBus, logger, projectRoot);
    this.handlers = createSessionToolHandlers(this.service);
  }

  async initialize(): Promise<void> {
    await this.service.initialize();
  }

  async shutdown(): Promise<void> {
    await this.service.shutdown();
  }

  getService(): SessionService {
    return this.service;
  }

  getTools() {
    return getSessionToolDefinitions();
  }

  getHandlers() {
    return this.handlers;
  }

  /**
   * Handle tool calls
   */
  async handleTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const handler = this.handlers[name as keyof typeof this.handlers];
    if (!handler) {
      throw new Error(`Unknown session tool: ${name}`);
    }
    return await handler(args as any);
  }
}
