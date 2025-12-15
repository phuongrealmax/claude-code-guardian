// src/modules/resource/auto-checkpoint.service.ts
// Automatic checkpoint triggers based on risk classification

import { EventBus } from '../../core/event-bus.js';
import { Logger } from '../../core/logger.js';
import { GuardService, RiskClassification, RiskLevel } from '../guard/index.js';
import { ResourceService } from './resource.service.js';
import { CheckpointInfo, CheckpointReason } from './resource.types.js';

// ═══════════════════════════════════════════════════════════════
//                      TYPES
// ═══════════════════════════════════════════════════════════════

export interface AutoCheckpointConfig {
  /** Enable auto-checkpoint on risky operations */
  enabled: boolean;

  /** Minimum time between checkpoints (ms) */
  minIntervalMs: number;

  /** Risk levels that trigger checkpoint */
  triggerLevels: RiskLevel[];

  /** Enable checkpoint on git operations */
  checkpointOnGit: boolean;

  /** Enable checkpoint on large file edits */
  checkpointOnLargeEdit: boolean;

  /** Threshold for large edit (lines) */
  largeEditThreshold: number;
}

export const DEFAULT_AUTO_CHECKPOINT_CONFIG: AutoCheckpointConfig = {
  enabled: true,
  minIntervalMs: 30000, // 30 seconds
  triggerLevels: ['HIGH', 'BLOCK'],
  checkpointOnGit: true,
  checkpointOnLargeEdit: true,
  largeEditThreshold: 100,
};

export interface AutoCheckpointResult {
  /** Risk classification result */
  risk: RiskClassification;

  /** Whether a checkpoint was created */
  checkpointCreated: boolean;

  /** Checkpoint info if created */
  checkpoint?: CheckpointInfo;

  /** Why checkpoint was/wasn't created */
  reason: string;

  /** Should the action be blocked? */
  blocked: boolean;
}

// ═══════════════════════════════════════════════════════════════
//                      SERVICE
// ═══════════════════════════════════════════════════════════════

export class AutoCheckpointService {
  private lastCheckpointTime: number = 0;
  private checkpointCount: number = 0;

  constructor(
    private config: AutoCheckpointConfig,
    private guardService: GuardService,
    private resourceService: ResourceService,
    private eventBus: EventBus,
    private logger: Logger
  ) {}

  /**
   * Initialize the service and set up event listeners
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      this.logger.debug('Auto-checkpoint disabled');
      return;
    }

    this.logger.info('Auto-checkpoint service initialized');
  }

  /**
   * Check risk and auto-checkpoint if needed before executing an action
   * @param action - Command or action to evaluate
   * @param context - Additional context for checkpoint
   * @returns AutoCheckpointResult with risk info and checkpoint status
   */
  async checkAndAutoCheckpoint(
    action: string,
    context?: {
      files?: string[];
      linesChanged?: number;
      description?: string;
    }
  ): Promise<AutoCheckpointResult> {
    // Classify the risk
    const risk = this.guardService.classifyRisk(action);

    // Check if action should be blocked
    if (risk.level === 'BLOCK') {
      this.logger.warn(`Action blocked: ${risk.reason}`);

      // Still create checkpoint before blocking for safety
      const checkpoint = await this.createRiskyOperationCheckpoint(
        action,
        risk,
        context?.description || 'Blocked risky operation',
        context?.files
      );

      // Emit block event
      this.eventBus.emit({
        type: 'guard:block',
        timestamp: new Date(),
        data: {
          action: action.substring(0, 200),
          risk,
          checkpointId: checkpoint?.id,
        },
        source: 'AutoCheckpointService',
      });

      return {
        risk,
        checkpointCreated: !!checkpoint,
        checkpoint: checkpoint || undefined,
        reason: `Action blocked: ${risk.reason}`,
        blocked: true,
      };
    }

    // Check if we should create a checkpoint
    const shouldCheckpoint = this.shouldCreateCheckpoint(risk, context?.linesChanged);

    if (!shouldCheckpoint.should) {
      return {
        risk,
        checkpointCreated: false,
        reason: shouldCheckpoint.reason,
        blocked: false,
      };
    }

    // Create checkpoint
    const checkpoint = await this.createRiskyOperationCheckpoint(
      action,
      risk,
      context?.description || `Before ${risk.category} operation`,
      context?.files
    );

    if (checkpoint) {
      this.logger.info(`Auto-checkpoint created: ${checkpoint.name} (${risk.level} risk)`);
    }

    return {
      risk,
      checkpointCreated: !!checkpoint,
      checkpoint: checkpoint || undefined,
      reason: checkpoint ? `Checkpoint created for ${risk.level} risk operation` : 'Checkpoint creation failed',
      blocked: false,
    };
  }

  /**
   * Check if a batch of commands would trigger checkpoint
   * @param commands - Array of commands to check
   * @returns Highest risk and whether checkpoint is needed
   */
  async checkBatchRisk(commands: string[]): Promise<{
    highestRisk: RiskLevel;
    shouldCheckpoint: boolean;
    riskyCommands: Array<{ command: string; risk: RiskClassification }>;
  }> {
    const classifications = this.guardService.classifyRiskBatch(commands);
    const highestRisk = this.guardService.getHighestRiskLevel(classifications);

    const riskyCommands = commands
      .map((cmd, i) => ({ command: cmd, risk: classifications[i] }))
      .filter(item => this.config.triggerLevels.includes(item.risk.level));

    const shouldCheckpoint = this.config.triggerLevels.includes(highestRisk);

    return {
      highestRisk,
      shouldCheckpoint,
      riskyCommands,
    };
  }

  /**
   * Auto-checkpoint for git operations
   * @param gitCommand - Git command being executed
   * @param files - Files involved in the operation
   */
  async checkGitOperation(
    gitCommand: string,
    files?: string[]
  ): Promise<AutoCheckpointResult> {
    if (!this.config.checkpointOnGit) {
      return {
        risk: { level: 'LOW', reason: 'Git checkpoint disabled', category: 'git', shouldCheckpoint: false },
        checkpointCreated: false,
        reason: 'Git checkpoints disabled in config',
        blocked: false,
      };
    }

    return this.checkAndAutoCheckpoint(gitCommand, {
      files,
      description: `Before git operation: ${gitCommand.substring(0, 50)}`,
    });
  }

  /**
   * Auto-checkpoint for large file edits
   * @param files - Files being edited
   * @param linesChanged - Total lines being changed
   * @param description - Description of the edit
   */
  async checkLargeEdit(
    files: string[],
    linesChanged: number,
    description?: string
  ): Promise<AutoCheckpointResult> {
    if (!this.config.checkpointOnLargeEdit) {
      return {
        risk: { level: 'LOW', reason: 'Large edit checkpoint disabled', category: 'filesystem', shouldCheckpoint: false },
        checkpointCreated: false,
        reason: 'Large edit checkpoints disabled in config',
        blocked: false,
      };
    }

    if (linesChanged < this.config.largeEditThreshold) {
      return {
        risk: { level: 'LOW', reason: 'Edit size below threshold', category: 'filesystem', shouldCheckpoint: false },
        checkpointCreated: false,
        reason: `Edit size (${linesChanged} lines) below threshold (${this.config.largeEditThreshold})`,
        blocked: false,
      };
    }

    // Large edit - bypass trigger level check, only check throttling
    const timeSinceLastCheckpoint = Date.now() - this.lastCheckpointTime;
    if (this.lastCheckpointTime > 0 && timeSinceLastCheckpoint < this.config.minIntervalMs) {
      return {
        risk: { level: 'MEDIUM', reason: 'Large file edit', category: 'filesystem', shouldCheckpoint: true },
        checkpointCreated: false,
        reason: `Too soon since last checkpoint (${Math.round(timeSinceLastCheckpoint / 1000)}s < ${this.config.minIntervalMs / 1000}s)`,
        blocked: false,
      };
    }

    const checkpoint = await this.resourceService.createCheckpoint({
      name: `large-edit-${files.length}-files`,
      reason: 'before_risky_operation' as CheckpointReason,
      metadata: {
        files,
        linesChanged,
        trigger: 'large_edit',
      },
      summary: description || `Large edit: ${linesChanged} lines across ${files.length} files`,
    });

    if (checkpoint) {
      this.lastCheckpointTime = Date.now();
      this.checkpointCount++;
    }

    return {
      risk: { level: 'MEDIUM', reason: 'Large file edit', category: 'filesystem', shouldCheckpoint: true },
      checkpointCreated: !!checkpoint,
      checkpoint: checkpoint || undefined,
      reason: checkpoint ? `Checkpoint created for large edit (${linesChanged} lines)` : 'Checkpoint creation failed',
      blocked: false,
    };
  }

  /**
   * Get auto-checkpoint statistics
   */
  getStats(): {
    enabled: boolean;
    checkpointCount: number;
    lastCheckpointTime: number | null;
    triggerLevels: RiskLevel[];
  } {
    return {
      enabled: this.config.enabled,
      checkpointCount: this.checkpointCount,
      lastCheckpointTime: this.lastCheckpointTime > 0 ? this.lastCheckpointTime : null,
      triggerLevels: this.config.triggerLevels,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //                      PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Determine if we should create a checkpoint based on risk and throttling
   */
  private shouldCreateCheckpoint(
    risk: RiskClassification,
    linesChanged?: number
  ): { should: boolean; reason: string } {
    if (!this.config.enabled) {
      return { should: false, reason: 'Auto-checkpoint disabled' };
    }

    // Check if risk level triggers checkpoint
    if (!this.config.triggerLevels.includes(risk.level)) {
      return { should: false, reason: `Risk level ${risk.level} does not trigger checkpoint` };
    }

    // Check minimum interval
    const timeSinceLastCheckpoint = Date.now() - this.lastCheckpointTime;
    if (timeSinceLastCheckpoint < this.config.minIntervalMs) {
      return {
        should: false,
        reason: `Too soon since last checkpoint (${Math.round(timeSinceLastCheckpoint / 1000)}s < ${this.config.minIntervalMs / 1000}s)`,
      };
    }

    // Large edits always trigger regardless of normal threshold (if enabled)
    if (linesChanged && linesChanged >= this.config.largeEditThreshold) {
      return { should: true, reason: `Large edit: ${linesChanged} lines` };
    }

    return { should: true, reason: `${risk.level} risk operation: ${risk.reason}` };
  }

  /**
   * Create a checkpoint for a risky operation
   */
  private async createRiskyOperationCheckpoint(
    action: string,
    risk: RiskClassification,
    summary: string,
    files?: string[]
  ): Promise<CheckpointInfo | null> {
    try {
      const checkpoint = await this.resourceService.createCheckpoint({
        name: `risk-${risk.level.toLowerCase()}-${risk.category}`,
        reason: 'before_risky_operation' as CheckpointReason,
        metadata: {
          action: action.substring(0, 500),
          riskLevel: risk.level,
          riskCategory: risk.category,
          riskReason: risk.reason,
          matchedPattern: risk.matchedPattern,
          files,
        },
        summary,
      });

      this.lastCheckpointTime = Date.now();
      this.checkpointCount++;

      // Emit event
      this.eventBus.emit({
        type: 'resource:checkpoint',
        timestamp: new Date(),
        data: {
          checkpointId: checkpoint.id,
          trigger: 'risky_operation',
          riskLevel: risk.level,
          riskCategory: risk.category,
        },
        source: 'AutoCheckpointService',
      });

      return checkpoint;
    } catch (error) {
      this.logger.error('Failed to create auto-checkpoint:', error);
      return null;
    }
  }
}
