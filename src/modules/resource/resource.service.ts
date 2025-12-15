// src/modules/resource/resource.service.ts

import { writeFileSync, readFileSync, existsSync, readdirSync, statSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import { v4 as uuid } from 'uuid';
import { ResourceModuleConfig } from '../../core/types.js';
import { EventBus } from '../../core/event-bus.js';
import { Logger } from '../../core/logger.js';
import {
  ResourceStatus,
  TaskEstimate,
  CheckpointData,
  CheckpointInfo,
  ResourceWarning,
  CheckpointReason,
  TokenUsage,
  GovernorState,
  GovernorMode,
  ResumeState
} from './resource.types.js';
import { StateManager, SessionEventType } from '../../core/state-manager.js';

// Provider interface for gathering resume state from other modules
export interface ResumeStateProvider {
  getCurrentTask(): Promise<{ id: string; name: string; status: string } | null>;
  getActiveLatentContext(): Promise<{ taskId: string; phase: string } | null>;
  getRecentFailures(): Promise<Array<{ type: string; message: string; timestamp: Date }>>;
}

export class ResourceService {
  private tokenUsage: TokenUsage = {
    used: 0,
    estimated: 200000,
    percentage: 0,
    lastUpdated: new Date(),
  };

  private checkpoints: CheckpointInfo[] = [];
  private checkpointDir: string;
  private lastAutoCheckpoint: number = 0;

  // P1: Resume state provider
  private resumeStateProvider?: ResumeStateProvider;

  // P1: StateManager for session timeline
  private stateManager?: StateManager;

  constructor(
    private config: ResourceModuleConfig,
    private eventBus: EventBus,
    private logger: Logger,
    private projectRoot: string = process.cwd()
  ) {
    this.checkpointDir = join(projectRoot, '.ccg', 'checkpoints');
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) return;

    // Ensure checkpoint directory exists
    if (!existsSync(this.checkpointDir)) {
      mkdirSync(this.checkpointDir, { recursive: true });
    }

    // Load existing checkpoints
    await this.loadCheckpoints();

    // Subscribe to events for auto-checkpoint
    // Wrap async handlers with error handling to prevent unhandled rejections
    this.eventBus.on('task:complete', () => {
      this.onTaskComplete().catch(err => {
        this.logger.error('Failed to handle task:complete event:', err);
      });
    });
    this.eventBus.on('session:end', () => {
      this.onSessionEnd().catch(err => {
        this.logger.error('Failed to handle session:end event:', err);
      });
    });

    this.logger.info(`Resource module initialized with ${this.checkpoints.length} checkpoints`);
  }

  /**
   * Set the resume state provider for gathering context from other modules
   */
  setResumeStateProvider(provider: ResumeStateProvider): void {
    this.resumeStateProvider = provider;
    this.logger.debug('Resume state provider configured');
  }

  /**
   * Set the state manager for session timeline tracking
   */
  setStateManager(stateManager: StateManager): void {
    this.stateManager = stateManager;
    this.logger.debug('StateManager configured for timeline tracking');
  }

  // ═══════════════════════════════════════════════════════════════
  //                      TOKEN MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  updateTokenUsage(used: number, estimated?: number): ResourceStatus {
    this.tokenUsage.used = used;
    if (estimated) {
      this.tokenUsage.estimated = estimated;
    }
    this.tokenUsage.percentage = Math.round((used / this.tokenUsage.estimated) * 100);
    this.tokenUsage.lastUpdated = new Date();

    // Check thresholds for auto-checkpoint
    this.checkThresholds();

    return this.getStatus();
  }

  getStatus(): ResourceStatus {
    const warnings = this.getWarnings();

    return {
      tokens: {
        used: this.tokenUsage.used,
        estimated: this.tokenUsage.estimated,
        percentage: this.tokenUsage.percentage,
        remaining: this.tokenUsage.estimated - this.tokenUsage.used,
      },
      checkpoints: {
        count: this.checkpoints.length,
        lastCheckpoint: this.checkpoints[0],
        autoEnabled: this.config.checkpoints.auto,
      },
      warnings,
    };
  }

  private getWarnings(): ResourceWarning[] {
    const warnings: ResourceWarning[] = [];
    const percentage = this.tokenUsage.percentage;

    if (percentage >= this.config.pauseThreshold) {
      warnings.push({
        level: 'critical',
        message: `Token usage critical: ${percentage}%. Save work immediately!`,
        action: 'Create checkpoint and consider ending session',
      });
    } else if (percentage >= this.config.warningThreshold) {
      warnings.push({
        level: 'warning',
        message: `Token usage high: ${percentage}%. Consider checkpointing.`,
        action: 'Create checkpoint or wrap up current task',
      });
    }

    // Suggest Latent Chain Mode when tokens > 80%
    if (percentage >= 80) {
      warnings.push({
        level: 'info',
        message: `Consider using Latent Chain Mode for remaining tasks.`,
        action: 'Use /ccg latent start to enable token-efficient mode (70-80% savings)',
      });

      // Emit event for Latent module integration
      this.eventBus.emit({
        type: 'resource:suggest:latent',
        timestamp: new Date(),
        data: { percentage, threshold: 80 },
      });
    }

    return warnings;
  }

  // ═══════════════════════════════════════════════════════════════
  //                      TOKEN BUDGET GOVERNOR
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get current governor state based on token usage.
   * - Normal (< 70%): All actions allowed
   * - Conservative (70-84%): Delta-only responses, no heavy operations
   * - Critical (≥ 85%): Checkpoint required, stop most operations
   */
  getGovernorState(): GovernorState {
    const percentage = this.tokenUsage.percentage;
    const CONSERVATIVE_THRESHOLD = 70;
    const CRITICAL_THRESHOLD = 85;

    let mode: GovernorMode;
    let allowedActions: string[];
    let blockedActions: string[];
    let recommendation: string;

    if (percentage >= CRITICAL_THRESHOLD) {
      mode = 'critical';
      allowedActions = [
        'checkpoint_create',
        'delta_update',
        'finish_task',
        'session_end',
        'memory_store',
      ];
      blockedActions = [
        'browser_open',
        'full_test_suite',
        'large_refactor',
        'task_decompose',
        'new_task_create',
        'multiple_file_edit',
      ];
      recommendation = 'Token budget critical! Finish current task immediately. Create checkpoint. No new tasks.';

      // Emit critical event
      this.eventBus.emit({
        type: 'resource:governor:critical',
        timestamp: new Date(),
        data: { percentage, mode },
        source: 'ResourceService',
      });

      // Record to session timeline
      this.recordTimelineEvent('governor_warning', {
        mode,
        tokenPercentage: percentage,
        recommendation,
      }, `Governor mode: ${mode} (${percentage}% tokens used)`);
    } else if (percentage >= CONSERVATIVE_THRESHOLD) {
      mode = 'conservative';
      allowedActions = [
        'checkpoint_create',
        'delta_update',
        'small_patch',
        'single_test',
        'memory_store',
        'memory_recall',
        'finish_task',
      ];
      blockedActions = [
        'browser_open',
        'full_test_suite',
        'large_refactor',
      ];
      recommendation = 'Token budget low. Use delta-only responses. Avoid heavy operations like browser testing or full test suites.';
    } else {
      mode = 'normal';
      allowedActions = ['all'];
      blockedActions = [];
      recommendation = 'Normal operation. All actions available.';
    }

    return {
      mode,
      tokenPercentage: percentage,
      allowedActions,
      blockedActions,
      recommendation,
      thresholds: {
        conservative: CONSERVATIVE_THRESHOLD,
        critical: CRITICAL_THRESHOLD,
      },
    };
  }

  /**
   * Check if a specific action is allowed by the governor
   */
  isActionAllowed(action: string): { allowed: boolean; reason?: string } {
    const state = this.getGovernorState();

    if (state.mode === 'normal') {
      return { allowed: true };
    }

    if (state.blockedActions.includes(action)) {
      return {
        allowed: false,
        reason: `Action "${action}" is blocked in ${state.mode} mode. ${state.recommendation}`,
      };
    }

    return { allowed: true };
  }

  private checkThresholds(): void {
    if (!this.config.checkpoints.auto) return;

    const percentage = this.tokenUsage.percentage;

    for (const threshold of this.config.checkpoints.thresholds) {
      if (percentage >= threshold && this.lastAutoCheckpoint < threshold) {
        this.logger.info(`Auto-checkpoint triggered at ${threshold}%`);
        this.createCheckpoint({
          name: `auto-${threshold}`,
          reason: 'auto_threshold',
        });
        this.lastAutoCheckpoint = threshold;

        // Emit event
        this.eventBus.emit({
          type: 'resource:checkpoint',
          timestamp: new Date(),
          data: { usage: this.tokenUsage },
          source: 'ResourceService',
        });

        break;
      }
    }

    // Emit warnings
    if (percentage >= this.config.pauseThreshold) {
      this.eventBus.emit({
        type: 'resource:critical',
        timestamp: new Date(),
        data: { usage: this.tokenUsage },
        source: 'ResourceService',
      });
    } else if (percentage >= this.config.warningThreshold) {
      this.eventBus.emit({
        type: 'resource:warning',
        timestamp: new Date(),
        data: { usage: this.tokenUsage },
        source: 'ResourceService',
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //                      TASK ESTIMATION
  // ═══════════════════════════════════════════════════════════════

  estimateTask(params: {
    description: string;
    filesCount?: number;
    linesEstimate?: number;
    hasTests?: boolean;
    hasBrowserTesting?: boolean;
  }): TaskEstimate {
    const {
      description,
      filesCount = 1,
      linesEstimate = 100,
      hasTests = false,
      hasBrowserTesting = false
    } = params;

    // Base estimation
    let baseTokens = 1000;

    // Complexity keywords
    const complexityIndicators: Record<string, string[]> = {
      low: ['fix', 'update', 'change', 'rename', 'simple', 'small', 'minor'],
      medium: ['add', 'create', 'implement', 'feature', 'component', 'function'],
      high: ['refactor', 'redesign', 'migrate', 'integrate', 'complex', 'system'],
      very_high: ['architecture', 'rewrite', 'overhaul', 'entire', 'complete', 'full'],
    };

    let complexity: 'low' | 'medium' | 'high' | 'very_high' = 'medium';
    const descLower = description.toLowerCase();

    for (const [level, keywords] of Object.entries(complexityIndicators)) {
      if (keywords.some(kw => descLower.includes(kw))) {
        complexity = level as 'low' | 'medium' | 'high' | 'very_high';
        break;
      }
    }

    // Multipliers
    const complexityMultiplier: Record<string, number> = {
      low: 1,
      medium: 2,
      high: 4,
      very_high: 8,
    };

    // Calculate tokens
    baseTokens *= complexityMultiplier[complexity];
    baseTokens += filesCount * 500;
    baseTokens += linesEstimate * 5;

    if (hasTests) {
      baseTokens *= 1.5;
    }

    if (hasBrowserTesting) {
      baseTokens *= 1.3;
    }

    // Round to nearest 500
    const estimatedTokens = Math.ceil(baseTokens / 500) * 500;

    // Time estimate (rough)
    const minutesPerThousandTokens = 2;
    const estimatedMinutes = Math.ceil(estimatedTokens / 1000) * minutesPerThousandTokens;
    const estimatedTime = estimatedMinutes < 60
      ? `${estimatedMinutes} minutes`
      : `${Math.ceil(estimatedMinutes / 60)} hour(s)`;

    // Check if can complete with remaining tokens
    const remaining = this.tokenUsage.estimated - this.tokenUsage.used;
    const canComplete = estimatedTokens < remaining * 0.8;

    // Breakdown suggestions for complex tasks
    const suggestBreakdown = complexity === 'high' || complexity === 'very_high';
    let breakdownSuggestions: string[] | undefined;

    if (suggestBreakdown) {
      breakdownSuggestions = this.generateBreakdownSuggestions(description, complexity);
    }

    return {
      complexity,
      estimatedTokens,
      estimatedTime,
      suggestBreakdown,
      breakdownSuggestions,
      canComplete,
      warningMessage: canComplete ? undefined :
        `Task may exceed available tokens. Consider breaking it down or creating a checkpoint first.`,
    };
  }

  private generateBreakdownSuggestions(_description: string, complexity: string): string[] {
    const suggestions: string[] = [];

    if (complexity === 'very_high') {
      suggestions.push('1. Start with architecture/design documentation');
      suggestions.push('2. Implement core data structures/types');
      suggestions.push('3. Build foundation/base components');
      suggestions.push('4. Add business logic layer by layer');
      suggestions.push('5. Implement tests for each layer');
      suggestions.push('6. Final integration and polish');
    } else {
      suggestions.push('1. Define interfaces and types first');
      suggestions.push('2. Implement core functionality');
      suggestions.push('3. Add error handling');
      suggestions.push('4. Write tests');
    }

    return suggestions;
  }

  // ═══════════════════════════════════════════════════════════════
  //                      CHECKPOINT MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  async createCheckpoint(params: {
    name?: string;
    reason: CheckpointReason;
    metadata?: Record<string, unknown>;
    nextActions?: string[];
    summary?: string;
  }): Promise<CheckpointInfo> {
    const { name, reason, metadata = {}, nextActions, summary } = params;

    const checkpointId = uuid();
    const checkpointName = name || `checkpoint-${Date.now()}`;

    // Ensure checkpoint directory exists
    if (!existsSync(this.checkpointDir)) {
      mkdirSync(this.checkpointDir, { recursive: true });
    }

    // P1: Gather resume state for session restore
    const resumeState = await this.gatherResumeState(nextActions, summary);

    // Gather data to checkpoint
    const checkpointData: CheckpointData = {
      id: checkpointId,
      name: checkpointName,
      createdAt: new Date(),
      reason,
      tokenUsage: this.tokenUsage.used,
      session: {
        id: 'current',
        startedAt: new Date(),
      },
      memory: [],
      tasks: [],
      filesChanged: [],
      metadata,
      resumeState,
    };

    // Save checkpoint
    const checkpointPath = join(this.checkpointDir, `${checkpointId}.json`);
    writeFileSync(checkpointPath, JSON.stringify(checkpointData, null, 2));

    const info: CheckpointInfo = {
      id: checkpointId,
      name: checkpointName,
      createdAt: new Date(),
      tokenUsage: this.tokenUsage.used,
      reason,
      size: statSync(checkpointPath).size,
    };

    this.checkpoints.unshift(info);

    // Enforce max checkpoints
    await this.enforceCheckpointLimit();

    // Record to session timeline
    this.recordTimelineEvent('checkpoint_created', {
      checkpointId,
      checkpointName,
      reason,
      tokenUsage: this.tokenUsage.used,
    }, `Checkpoint created: ${checkpointName}`);

    this.logger.info(`Checkpoint created: ${checkpointName} (${checkpointId})`);

    return info;
  }

  /**
   * P1: Gather resume state from all modules
   */
  private async gatherResumeState(
    nextActions?: string[],
    summary?: string
  ): Promise<ResumeState> {
    let currentTask: { id: string; name: string; status: string } | null = null;
    let activeLatent: { taskId: string; phase: string } | null = null;
    let recentFailures: Array<{ type: string; message: string; timestamp: Date }> = [];

    // Get state from provider if available
    if (this.resumeStateProvider) {
      try {
        currentTask = await this.resumeStateProvider.getCurrentTask();
        activeLatent = await this.resumeStateProvider.getActiveLatentContext();
        recentFailures = await this.resumeStateProvider.getRecentFailures();
      } catch (error) {
        this.logger.warn(`Failed to gather resume state: ${error}`);
      }
    }

    // Determine required tools based on context
    const requiredTools: string[] = [];
    if (currentTask) {
      requiredTools.push('workflow_task_update', 'workflow_task_complete');
    }
    if (activeLatent) {
      requiredTools.push('latent_context_get', 'latent_context_update');
    }
    if (this.tokenUsage.percentage >= 70) {
      requiredTools.push('resource_governor_state', 'resource_checkpoint_create');
    }

    // Build summary if not provided
    const autoSummary = summary || this.buildAutoSummary(currentTask, activeLatent);

    return {
      currentTaskId: currentTask?.id || null,
      currentTaskName: currentTask?.name || null,
      lastCompletedStep: null, // Will be populated by caller
      nextActions: nextActions || this.suggestNextActions(currentTask, activeLatent),
      requiredTools,
      recentFailures,
      activeLatentTaskId: activeLatent?.taskId || null,
      activeLatentPhase: activeLatent?.phase || null,
      summary: autoSummary,
    };
  }

  /**
   * Build auto summary from current state
   */
  private buildAutoSummary(
    currentTask: { id: string; name: string; status: string } | null,
    activeLatent: { taskId: string; phase: string } | null
  ): string {
    const parts: string[] = [];

    if (currentTask) {
      parts.push(`Working on: ${currentTask.name} (${currentTask.status})`);
    }
    if (activeLatent) {
      parts.push(`Latent phase: ${activeLatent.phase}`);
    }
    if (this.tokenUsage.percentage >= 70) {
      parts.push(`Token usage: ${this.tokenUsage.percentage}%`);
    }

    return parts.length > 0 ? parts.join('. ') : 'No active work.';
  }

  /**
   * Suggest next actions based on current state
   */
  private suggestNextActions(
    currentTask: { id: string; name: string; status: string } | null,
    activeLatent: { taskId: string; phase: string } | null
  ): string[] {
    const actions: string[] = [];

    if (currentTask) {
      if (currentTask.status === 'in_progress') {
        actions.push(`Continue task: ${currentTask.name}`);
      } else if (currentTask.status === 'paused') {
        actions.push(`Resume task: ${currentTask.name}`);
      }
    }

    if (activeLatent) {
      actions.push(`Continue latent context (${activeLatent.phase} phase)`);
    }

    if (this.tokenUsage.percentage >= 85) {
      actions.push('CRITICAL: Create checkpoint and wrap up');
    } else if (this.tokenUsage.percentage >= 70) {
      actions.push('Consider creating checkpoint');
    }

    if (actions.length === 0) {
      actions.push('Check workflow_task_list for pending tasks');
    }

    return actions;
  }

  /**
   * Get resume state from latest checkpoint
   */
  async getLatestResumeState(): Promise<ResumeState | null> {
    if (this.checkpoints.length === 0) {
      return null;
    }

    const latest = this.checkpoints[0];
    const checkpoint = await this.restoreCheckpoint(latest.id);
    return checkpoint?.resumeState || null;
  }

  async restoreCheckpoint(checkpointId: string): Promise<CheckpointData | null> {
    const checkpointPath = join(this.checkpointDir, `${checkpointId}.json`);

    if (!existsSync(checkpointPath)) {
      this.logger.error(`Checkpoint not found: ${checkpointId}`);
      return null;
    }

    const data = JSON.parse(readFileSync(checkpointPath, 'utf-8')) as CheckpointData;

    // Record to session timeline
    this.recordTimelineEvent('checkpoint_restored', {
      checkpointId,
      checkpointName: data.name,
      restoredTokenUsage: data.tokenUsage,
    }, `Checkpoint restored: ${data.name}`);

    this.logger.info(`Checkpoint restored: ${data.name}`);

    return data;
  }

  listCheckpoints(): CheckpointInfo[] {
    return this.checkpoints;
  }

  async deleteCheckpoint(checkpointId: string): Promise<boolean> {
    const checkpointPath = join(this.checkpointDir, `${checkpointId}.json`);

    if (!existsSync(checkpointPath)) {
      return false;
    }

    unlinkSync(checkpointPath);
    this.checkpoints = this.checkpoints.filter(c => c.id !== checkpointId);

    return true;
  }

  private async loadCheckpoints(): Promise<void> {
    if (!existsSync(this.checkpointDir)) {
      return;
    }

    const files = readdirSync(this.checkpointDir).filter(f => f.endsWith('.json'));

    for (const file of files) {
      try {
        const path = join(this.checkpointDir, file);
        const data = JSON.parse(readFileSync(path, 'utf-8')) as CheckpointData;

        this.checkpoints.push({
          id: data.id,
          name: data.name,
          createdAt: new Date(data.createdAt),
          tokenUsage: data.tokenUsage,
          reason: data.reason,
          size: statSync(path).size,
        });
      } catch (error) {
        this.logger.warn(`Failed to load checkpoint: ${file}`);
      }
    }

    // Sort by date, newest first
    this.checkpoints.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  private async enforceCheckpointLimit(): Promise<void> {
    const maxCheckpoints = this.config.checkpoints.maxCheckpoints;

    while (this.checkpoints.length > maxCheckpoints) {
      const oldest = this.checkpoints.pop();
      if (oldest) {
        await this.deleteCheckpoint(oldest.id);
      }
    }
  }

  private async onTaskComplete(): Promise<void> {
    if (this.config.checkpoints.auto) {
      await this.createCheckpoint({
        name: 'task-complete',
        reason: 'task_complete',
      });
    }
  }

  private async onSessionEnd(): Promise<void> {
    await this.createCheckpoint({
      name: 'session-end',
      reason: 'session_end',
    });
  }

  /**
   * Record an event to the session timeline
   */
  private recordTimelineEvent(
    type: SessionEventType,
    data: Record<string, unknown>,
    summary?: string
  ): void {
    if (this.stateManager) {
      this.stateManager.addTimelineEvent(type, data, summary);
    }
  }
}
