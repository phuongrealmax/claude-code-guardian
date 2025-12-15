// src/modules/session/session.service.ts
// Session persistence and resume service

import { writeFileSync, readFileSync, existsSync, mkdirSync, renameSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { randomUUID } from 'crypto';
import { EventBus, CCGEventType, CCGEvent } from '../../core/event-bus.js';
import { Logger } from '../../core/logger.js';
import {
  SessionConfig,
  SessionExportV1,
  SessionTimelineEvent,
  SessionStatus,
  ResumeOffer,
  DEFAULT_SESSION_CONFIG,
} from './session.types.js';

// Adapter interface for modules that can export/import session state
export interface SessionStateProvider {
  exportSessionState?(): Promise<unknown> | unknown;
  importSessionState?(state: unknown): Promise<void> | void;
}

export interface SessionModules {
  workflow?: SessionStateProvider;
  latent?: SessionStateProvider;
  resource?: SessionStateProvider;
  memory?: SessionStateProvider;
}

export class SessionService {
  private sessionDir: string;
  private current: SessionExportV1;
  private dirty = false;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private modules: SessionModules = {};
  private subscriptionIds: string[] = [];

  constructor(
    private config: SessionConfig,
    private eventBus: EventBus,
    private logger: Logger,
    private projectRoot: string
  ) {
    this.sessionDir = join(projectRoot, config.sessionDir);
    const now = new Date().toISOString();
    this.current = {
      version: '1',
      sessionId: randomUUID(),
      createdAt: now,
      updatedAt: now,
      modules: {},
      latestCheckpointId: null,
      timeline: [],
      metadata: {
        projectRoot,
        ccgVersion: '4.0.0',
        resumeCount: 0,
      },
    };
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) return;

    // Ensure session directory exists
    if (!existsSync(this.sessionDir)) {
      mkdirSync(this.sessionDir, { recursive: true });
    }

    // Subscribe to key events for auto-save
    if (this.config.autoSave) {
      this.setupEventListeners();
    }

    this.logger.info(`Session module initialized: ${this.current.sessionId}`);
  }

  /**
   * Register modules that can provide session state
   */
  setModules(modules: SessionModules): void {
    this.modules = modules;
    this.logger.debug('Session modules registered');
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.current.sessionId;
  }

  /**
   * Get current session state (read-only)
   */
  getState(): Readonly<SessionExportV1> {
    return this.current;
  }

  /**
   * Get session status summary
   */
  getStatus(): SessionStatus {
    return {
      sessionId: this.current.sessionId,
      createdAt: this.current.createdAt,
      updatedAt: this.current.updatedAt,
      timelineCount: this.current.timeline.length,
      latestCheckpointId: this.current.latestCheckpointId,
      dirty: this.dirty,
      autoSaveEnabled: this.config.autoSave,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //                      STATE HYDRATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Hydrate session state from registered modules
   */
  async hydrateFromModules(): Promise<void> {
    try {
      if (this.modules.workflow?.exportSessionState) {
        this.current.modules.workflow = await this.modules.workflow.exportSessionState();
      }
      if (this.modules.latent?.exportSessionState) {
        this.current.modules.latent = await this.modules.latent.exportSessionState();
      }
      if (this.modules.resource?.exportSessionState) {
        this.current.modules.resource = await this.modules.resource.exportSessionState();
      }
      if (this.modules.memory?.exportSessionState) {
        this.current.modules.memory = await this.modules.memory.exportSessionState();
      }

      this.touch();
      this.logger.debug('Session hydrated from modules');
    } catch (error) {
      this.logger.error('Failed to hydrate session from modules:', error);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //                      TIMELINE EVENTS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Record an event to the timeline
   */
  recordEvent(event: SessionTimelineEvent): void {
    this.current.timeline.push(event);

    // Trim timeline if needed
    if (this.current.timeline.length > this.config.maxTimelineEvents) {
      this.current.timeline = this.current.timeline.slice(-this.config.maxTimelineEvents);
    }

    this.touch();
    this.scheduleSave();
  }

  /**
   * Record event from CCGEvent
   */
  recordCCGEvent(event: CCGEvent, summary?: string): void {
    this.recordEvent({
      ts: event.timestamp.toISOString(),
      type: event.type,
      summary: summary || this.summarizeEvent(event),
      data: event.data,
    });
  }

  /**
   * Get timeline events
   */
  getTimeline(limit?: number): SessionTimelineEvent[] {
    const maxLimit = Math.min(limit || 50, this.config.maxTimelineEvents);
    return this.current.timeline.slice(-maxLimit);
  }

  // ═══════════════════════════════════════════════════════════════
  //                      PERSISTENCE
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get default session file path
   */
  getDefaultSessionFilePath(): string {
    return join(this.sessionDir, `session-${this.current.sessionId}.json`);
  }

  /**
   * Atomic write JSON to file (write temp -> rename)
   */
  private atomicWriteJson(filePath: string, data: unknown): void {
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const tmp = `${filePath}.tmp`;
    writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    renameSync(tmp, filePath);
  }

  /**
   * Save current session to file
   */
  async save(filePath?: string): Promise<string> {
    const targetPath = filePath || this.getDefaultSessionFilePath();

    // Hydrate latest state from modules before saving
    await this.hydrateFromModules();

    this.atomicWriteJson(targetPath, this.current);
    this.dirty = false;

    this.logger.debug(`Session saved to ${targetPath}`);
    return targetPath;
  }

  /**
   * Schedule a debounced save
   */
  scheduleSave(): void {
    if (!this.config.autoSave) return;
    if (this.saveTimer) return;

    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.save().catch(err => {
        this.logger.error('Auto-save failed:', err);
      });
    }, this.config.autoSaveDebounceMs);
  }

  /**
   * Load session from file
   */
  async loadFromFile(filePath: string): Promise<SessionExportV1> {
    if (!existsSync(filePath)) {
      throw new Error(`Session file not found: ${filePath}`);
    }

    const raw = readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as SessionExportV1;

    if (!parsed || parsed.version !== '1' || !parsed.sessionId) {
      throw new Error('Invalid session file (version/sessionId missing)');
    }

    // Store previous session ID for logging
    const previousSessionId = this.current.sessionId;

    // Replace current state
    this.current = parsed;
    this.current.metadata = this.current.metadata || {};
    this.current.metadata.resumeCount = (this.current.metadata.resumeCount || 0) + 1;
    this.touch();

    // Apply state back to modules
    await this.applyStateToModules();

    this.logger.info(`Session resumed: ${parsed.sessionId} (was: ${previousSessionId})`);
    return this.current;
  }

  /**
   * Apply loaded session state to modules
   */
  private async applyStateToModules(): Promise<void> {
    try {
      if (this.modules.workflow?.importSessionState && this.current.modules.workflow) {
        await this.modules.workflow.importSessionState(this.current.modules.workflow);
      }
      if (this.modules.latent?.importSessionState && this.current.modules.latent) {
        await this.modules.latent.importSessionState(this.current.modules.latent);
      }
      if (this.modules.resource?.importSessionState && this.current.modules.resource) {
        await this.modules.resource.importSessionState(this.current.modules.resource);
      }
      if (this.modules.memory?.importSessionState && this.current.modules.memory) {
        await this.modules.memory.importSessionState(this.current.modules.memory);
      }

      this.logger.debug('Session state applied to modules');
    } catch (error) {
      this.logger.error('Failed to apply session state to modules:', error);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //                      RESUME DETECTION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Find the most recent session file for resume
   */
  findLatestSession(): string | null {
    if (!existsSync(this.sessionDir)) return null;

    const files = readdirSync(this.sessionDir)
      .filter(f => f.startsWith('session-') && f.endsWith('.json'))
      .map(f => ({
        name: f,
        path: join(this.sessionDir, f),
        mtime: statSync(join(this.sessionDir, f)).mtime,
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    return files.length > 0 ? files[0].path : null;
  }

  /**
   * Get resume offer for reconnecting clients
   */
  getResumeOffer(): ResumeOffer {
    const latestSession = this.findLatestSession();

    if (!latestSession) {
      return { available: false };
    }

    try {
      const raw = readFileSync(latestSession, 'utf8');
      const session = JSON.parse(raw) as SessionExportV1;

      return {
        available: true,
        sessionId: session.sessionId,
        sessionFile: latestSession,
        updatedAt: session.updatedAt,
        timelineCount: session.timeline.length,
        taskInProgress: this.extractTaskInProgress(session),
      };
    } catch {
      return { available: false };
    }
  }

  /**
   * Extract task in progress from session for resume offer
   */
  private extractTaskInProgress(session: SessionExportV1): string | undefined {
    // Look for recent task events in timeline
    const taskEvents = session.timeline
      .filter(e => e.type.startsWith('task:'))
      .slice(-1);

    if (taskEvents.length > 0) {
      return taskEvents[0].summary;
    }
    return undefined;
  }

  // ═══════════════════════════════════════════════════════════════
  //                      EXPORT / REPLAY
  // ═══════════════════════════════════════════════════════════════

  /**
   * Export session to a specific file
   */
  async exportToFile(outputPath: string): Promise<{ outputPath: string; sessionId: string }> {
    await this.save(outputPath);
    return { outputPath, sessionId: this.current.sessionId };
  }

  /**
   * Replay timeline events (dry-run for debugging)
   */
  replay(options: { from?: number; to?: number } = {}): {
    sessionId: string;
    count: number;
    events: SessionTimelineEvent[];
  } {
    const { from = 0, to } = options;
    const events = this.current.timeline.slice(from, to ?? this.current.timeline.length);
    return {
      sessionId: this.current.sessionId,
      count: events.length,
      events,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //                      EVENT LISTENERS
  // ═══════════════════════════════════════════════════════════════

  private setupEventListeners(): void {
    const autoSaveEvents: CCGEventType[] = [
      'task:complete',
      'task:fail',
      'latent:phase:transition',
      'latent:task:completed',
      'resource:checkpoint',
      'session:end',
    ];

    for (const eventType of autoSaveEvents) {
      const id = this.eventBus.on(eventType, (event) => {
        this.recordCCGEvent(event);
      });
      this.subscriptionIds.push(id);
    }

    // Track checkpoint creation
    const checkpointId = this.eventBus.on('resource:checkpoint', (event) => {
      const data = event.data as { checkpointId?: string } | undefined;
      if (data?.checkpointId) {
        this.current.latestCheckpointId = data.checkpointId;
        this.touch();
      }
    });
    this.subscriptionIds.push(checkpointId);

    this.logger.debug(`Session auto-save listening to ${autoSaveEvents.length} event types`);
  }

  /**
   * Create event summary from CCGEvent
   */
  private summarizeEvent(event: CCGEvent): string {
    const data = event.data as Record<string, unknown> | undefined;

    switch (event.type) {
      case 'task:complete':
        return data?.name ? `Completed: ${data.name}` : 'Task completed';
      case 'task:fail':
        return data?.reason ? `Failed: ${data.reason}` : 'Task failed';
      case 'latent:phase:transition':
        return data?.from && data?.to ? `Phase: ${data.from} → ${data.to}` : 'Phase transition';
      case 'resource:checkpoint':
        return data?.checkpointId ? `Checkpoint: ${data.checkpointId}` : 'Checkpoint created';
      default:
        return event.type;
    }
  }

  private touch(): void {
    this.current.updatedAt = new Date().toISOString();
    this.dirty = true;
  }

  /**
   * Cleanup on shutdown
   */
  async shutdown(): Promise<void> {
    // Cancel pending save timer
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }

    // Final save
    if (this.dirty) {
      await this.save();
    }

    // Unsubscribe from events
    for (const id of this.subscriptionIds) {
      this.eventBus.off(id);
    }
    this.subscriptionIds = [];

    this.logger.info(`Session ${this.current.sessionId} shutdown complete`);
  }
}
