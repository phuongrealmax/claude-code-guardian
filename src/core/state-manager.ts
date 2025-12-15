// src/core/state-manager.ts

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { randomUUID } from 'crypto';
import { Logger } from './logger.js';
import { EventBus } from './event-bus.js';
import type { GuardEvidence, TestEvidence, EvidenceState } from './completion-gates.js';

// ═══════════════════════════════════════════════════════════════
//                      STATE TYPES
// ═══════════════════════════════════════════════════════════════

export interface Session {
  id: string;
  startedAt: Date;
  endedAt?: Date;
  projectPath: string;
  status: SessionStatus;
  tokenUsage: TokenUsage;
  currentTaskId?: string;
  metadata: Record<string, unknown>;
  timeline?: SessionEvent[];
  evidence?: EvidenceState;
}

export interface SessionEvent {
  id: string;
  type: SessionEventType;
  timestamp: Date;
  data: Record<string, unknown>;
  summary?: string;
}

export type SessionEventType =
  | 'checkpoint_created'
  | 'checkpoint_restored'
  | 'task_started'
  | 'task_completed'
  | 'risk_detected'
  | 'guard_block'
  | 'governor_warning'
  | 'large_plan_detected'
  | 'workflow:gate_passed'
  | 'workflow:gate_pending'
  | 'workflow:gate_blocked';

export type SessionStatus = 'active' | 'paused' | 'ended';

export interface TokenUsage {
  used: number;
  estimated: number;
  percentage: number;
  lastUpdated: Date;
}

export interface GlobalState {
  session?: Session;
  lastSessionId?: string;
  installId: string;
  firstRun: boolean;
  stats: SessionStats;
}

export interface SessionStats {
  totalSessions: number;
  totalTasksCompleted: number;
  totalFilesModified: number;
  totalTestsRun: number;
  totalGuardBlocks: number;
  totalCheckpoints: number;
}

// ═══════════════════════════════════════════════════════════════
//                      STATE MANAGER CLASS
// ═══════════════════════════════════════════════════════════════

export class StateManager {
  private state: GlobalState;
  private statePath: string;
  private logger: Logger;
  private eventBus?: EventBus;
  private autoSaveInterval?: ReturnType<typeof setInterval>;

  constructor(
    projectRoot: string = process.cwd(),
    logger?: Logger,
    eventBus?: EventBus
  ) {
    this.statePath = join(projectRoot, '.ccg', 'state.json');
    this.logger = logger || new Logger('info', 'StateManager');
    this.eventBus = eventBus;

    // Initialize with defaults
    this.state = this.getDefaultState();

    // Load existing state
    this.load();

    // Start auto-save
    this.startAutoSave();
  }

  // ═══════════════════════════════════════════════════════════════
  //                      SESSION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Create a new session
   */
  createSession(projectPath?: string): Session {
    const session: Session = {
      id: randomUUID(),
      startedAt: new Date(),
      projectPath: projectPath || process.cwd(),
      status: 'active',
      tokenUsage: {
        used: 0,
        estimated: 200000,
        percentage: 0,
        lastUpdated: new Date(),
      },
      metadata: {},
      timeline: [],
    };

    this.state.session = session;
    this.state.lastSessionId = session.id;
    this.state.stats.totalSessions++;

    // Mark first run as done
    if (this.state.firstRun) {
      this.state.firstRun = false;
    }

    this.save();
    this.logger.info(`Session created: ${session.id}`);

    return session;
  }

  /**
   * Set session data
   */
  setSession(sessionData: Partial<Session>): void {
    if (!this.state.session) {
      this.createSession(sessionData.projectPath);
    }

    this.state.session = {
      ...this.state.session!,
      ...sessionData,
    };

    this.save();
  }

  /**
   * Get current session
   */
  getSession(): Session | undefined {
    return this.state.session;
  }

  /**
   * End current session
   */
  endSession(): Session | undefined {
    if (!this.state.session) {
      return undefined;
    }

    this.state.session.status = 'ended';
    this.state.session.endedAt = new Date();

    const session = { ...this.state.session };

    // Keep reference but clear current
    this.state.lastSessionId = session.id;
    this.state.session = undefined;

    this.save();
    this.logger.info(`Session ended: ${session.id}`);

    return session;
  }

  /**
   * Pause current session
   */
  pauseSession(): void {
    if (this.state.session) {
      this.state.session.status = 'paused';
      this.save();
    }
  }

  /**
   * Resume current session
   */
  resumeSession(): void {
    if (this.state.session && this.state.session.status === 'paused') {
      this.state.session.status = 'active';
      this.save();
    }
  }

  /**
   * Check if session is active
   */
  isSessionActive(): boolean {
    return this.state.session?.status === 'active';
  }

  // ═══════════════════════════════════════════════════════════════
  //                      TOKEN TRACKING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Update token usage
   */
  updateTokenUsage(used: number, estimated?: number): TokenUsage | undefined {
    if (!this.state.session) {
      return undefined;
    }

    this.state.session.tokenUsage.used = used;
    if (estimated !== undefined) {
      this.state.session.tokenUsage.estimated = estimated;
    }
    this.state.session.tokenUsage.percentage = Math.round(
      (used / this.state.session.tokenUsage.estimated) * 100
    );
    this.state.session.tokenUsage.lastUpdated = new Date();

    // Don't save on every token update (too frequent)
    // Will be saved by auto-save

    return this.state.session.tokenUsage;
  }

  /**
   * Get token usage
   */
  getTokenUsage(): TokenUsage | undefined {
    return this.state.session?.tokenUsage;
  }

  // ═══════════════════════════════════════════════════════════════
  //                      TASK TRACKING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Set current task
   */
  setCurrentTask(taskId: string | undefined): void {
    if (this.state.session) {
      this.state.session.currentTaskId = taskId;
      this.save();
    }
  }

  /**
   * Get current task ID
   */
  getCurrentTaskId(): string | undefined {
    return this.state.session?.currentTaskId;
  }

  // ═══════════════════════════════════════════════════════════════
  //                      SESSION TIMELINE
  // ═══════════════════════════════════════════════════════════════

  /**
   * Add an event to the session timeline
   */
  addTimelineEvent(
    type: SessionEventType,
    data: Record<string, unknown>,
    summary?: string
  ): SessionEvent | undefined {
    if (!this.state.session) {
      return undefined;
    }

    if (!this.state.session.timeline) {
      this.state.session.timeline = [];
    }

    const event: SessionEvent = {
      id: randomUUID(),
      type,
      timestamp: new Date(),
      data,
      summary,
    };

    this.state.session.timeline.push(event);

    // Keep timeline size manageable (last 100 events)
    if (this.state.session.timeline.length > 100) {
      this.state.session.timeline = this.state.session.timeline.slice(-100);
    }

    // Emit event for real-time tracking
    if (this.eventBus) {
      this.eventBus.emit({
        type: 'session:event',
        timestamp: new Date(),
        data: { event },
        source: 'StateManager',
      });
    }

    this.save();
    return event;
  }

  /**
   * Get session timeline
   */
  getTimeline(): SessionEvent[] {
    return this.state.session?.timeline || [];
  }

  /**
   * Get timeline events by type
   */
  getTimelineByType(type: SessionEventType): SessionEvent[] {
    return (this.state.session?.timeline || []).filter(e => e.type === type);
  }

  // ═══════════════════════════════════════════════════════════════
  //                      STATISTICS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Increment a stat counter
   */
  incrementStat(stat: keyof SessionStats, amount: number = 1): void {
    this.state.stats[stat] += amount;
  }

  /**
   * Get all stats
   */
  getStats(): SessionStats {
    return { ...this.state.stats };
  }

  /**
   * Reset stats
   */
  resetStats(): void {
    this.state.stats = this.getDefaultStats();
    this.save();
  }

  // ═══════════════════════════════════════════════════════════════
  //                      METADATA
  // ═══════════════════════════════════════════════════════════════

  /**
   * Set session metadata
   */
  setMetadata(key: string, value: unknown): void {
    if (this.state.session) {
      this.state.session.metadata[key] = value;
    }
  }

  /**
   * Get session metadata
   */
  getMetadata<T = unknown>(key: string): T | undefined {
    return this.state.session?.metadata[key] as T | undefined;
  }

  // ═══════════════════════════════════════════════════════════════
  //                      EVIDENCE STATE
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get current evidence state (for gate evaluation)
   */
  getEvidenceState(): EvidenceState {
    if (!this.state.session?.evidence) {
      return { lastGuardRun: null, lastTestRun: null };
    }
    return { ...this.state.session.evidence };
  }

  /**
   * Set guard verification evidence
   */
  setGuardEvidence(evidence: GuardEvidence | null): void {
    if (this.state.session) {
      if (!this.state.session.evidence) {
        this.state.session.evidence = { lastGuardRun: null, lastTestRun: null };
      }
      this.state.session.evidence.lastGuardRun = evidence;
      this.save();
      this.logger.debug('Guard evidence updated', { status: evidence?.status });
    }
  }

  /**
   * Set test verification evidence
   */
  setTestEvidence(evidence: TestEvidence | null): void {
    if (this.state.session) {
      if (!this.state.session.evidence) {
        this.state.session.evidence = { lastGuardRun: null, lastTestRun: null };
      }
      this.state.session.evidence.lastTestRun = evidence;
      this.save();
      this.logger.debug('Test evidence updated', { status: evidence?.status });
    }
  }

  /**
   * Clear all evidence (e.g., when starting new task)
   */
  clearEvidence(): void {
    if (this.state.session) {
      this.state.session.evidence = { lastGuardRun: null, lastTestRun: null };
      this.save();
      this.logger.debug('Evidence cleared');
    }
  }

  /**
   * Check if evidence exists for current task
   */
  hasEvidenceForTask(taskId: string): { hasGuard: boolean; hasTest: boolean } {
    const evidence = this.state.session?.evidence;
    return {
      hasGuard: evidence?.lastGuardRun?.taskId === taskId && evidence.lastGuardRun.status === 'passed',
      hasTest: evidence?.lastTestRun?.taskId === taskId && evidence.lastTestRun.status === 'passed',
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //                      GLOBAL STATE
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get install ID (unique per installation)
   */
  getInstallId(): string {
    return this.state.installId;
  }

  /**
   * Check if first run
   */
  isFirstRun(): boolean {
    return this.state.firstRun;
  }

  /**
   * Get last session ID
   */
  getLastSessionId(): string | undefined {
    return this.state.lastSessionId;
  }

  /**
   * Get entire state (for debugging)
   */
  getFullState(): GlobalState {
    return { ...this.state };
  }

  // ═══════════════════════════════════════════════════════════════
  //                      PERSISTENCE
  // ═══════════════════════════════════════════════════════════════

  /**
   * Load state from file
   */
  load(): void {
    if (!existsSync(this.statePath)) {
      this.logger.debug('No state file found, using defaults');
      return;
    }

    try {
      const content = readFileSync(this.statePath, 'utf-8');
      const loaded = JSON.parse(content);

      // Merge with defaults to handle new fields
      this.state = {
        ...this.getDefaultState(),
        ...loaded,
        stats: {
          ...this.getDefaultStats(),
          ...(loaded.stats || {}),
        },
      };

      // Convert date strings back to Date objects
      if (this.state.session) {
        this.state.session.startedAt = new Date(this.state.session.startedAt);
        if (this.state.session.endedAt) {
          this.state.session.endedAt = new Date(this.state.session.endedAt);
        }
        this.state.session.tokenUsage.lastUpdated = new Date(
          this.state.session.tokenUsage.lastUpdated
        );
      }

      this.logger.debug('State loaded');
    } catch (error) {
      this.logger.error('Failed to load state', error);
    }
  }

  /**
   * Save state to file
   */
  save(): void {
    try {
      const dir = dirname(this.statePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      writeFileSync(this.statePath, JSON.stringify(this.state, null, 2), 'utf-8');
      this.logger.debug('State saved');
    } catch (error) {
      this.logger.error('Failed to save state', error);
    }
  }

  /**
   * Reset state to defaults
   */
  reset(): void {
    const installId = this.state.installId; // Keep install ID
    this.state = {
      ...this.getDefaultState(),
      installId,
      firstRun: false,
    };
    this.save();
    this.logger.info('State reset');
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    this.save();
  }

  // ═══════════════════════════════════════════════════════════════
  //                      PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════

  private getDefaultState(): GlobalState {
    return {
      installId: randomUUID(),
      firstRun: true,
      stats: this.getDefaultStats(),
    };
  }

  private getDefaultStats(): SessionStats {
    return {
      totalSessions: 0,
      totalTasksCompleted: 0,
      totalFilesModified: 0,
      totalTestsRun: 0,
      totalGuardBlocks: 0,
      totalCheckpoints: 0,
    };
  }

  private startAutoSave(): void {
    // Auto-save every 30 seconds
    this.autoSaveInterval = setInterval(() => {
      if (this.state.session) {
        this.save();
      }
    }, 30000);

    // Allow process to exit even if interval is pending
    // This prevents the CLI from hanging after commands complete
    this.autoSaveInterval.unref();
  }
}

// ═══════════════════════════════════════════════════════════════
//                      SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════

let globalStateManager: StateManager | null = null;

export function getGlobalStateManager(projectRoot?: string): StateManager {
  if (!globalStateManager) {
    globalStateManager = new StateManager(projectRoot);
  }
  return globalStateManager;
}

export function resetGlobalStateManager(): void {
  if (globalStateManager) {
    globalStateManager.dispose();
  }
  globalStateManager = null;
}
