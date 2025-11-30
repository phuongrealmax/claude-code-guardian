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
  TokenUsage
} from './resource.types.js';

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

    return warnings;
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
  }): Promise<CheckpointInfo> {
    const { name, reason, metadata = {} } = params;

    const checkpointId = uuid();
    const checkpointName = name || `checkpoint-${Date.now()}`;

    // Ensure checkpoint directory exists
    if (!existsSync(this.checkpointDir)) {
      mkdirSync(this.checkpointDir, { recursive: true });
    }

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

    this.logger.info(`Checkpoint created: ${checkpointName} (${checkpointId})`);

    return info;
  }

  async restoreCheckpoint(checkpointId: string): Promise<CheckpointData | null> {
    const checkpointPath = join(this.checkpointDir, `${checkpointId}.json`);

    if (!existsSync(checkpointPath)) {
      this.logger.error(`Checkpoint not found: ${checkpointId}`);
      return null;
    }

    const data = JSON.parse(readFileSync(checkpointPath, 'utf-8')) as CheckpointData;

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
}
