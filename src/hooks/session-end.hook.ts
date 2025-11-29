import { HookHandler, Modules } from './hook-handler.js';
import {
  SessionEndInput,
  SessionEndResult,
  SessionSummary,
  HookContext,
  HookWarning
} from './types.js';
import { Logger } from '../core/logger.js';
import { ConfigManager } from '../core/config-manager.js';
import { StateManager } from '../core/state-manager.js';
import { EventBus } from '../core/event-bus.js';

export class SessionEndHook extends HookHandler {
  constructor(
    modules: Modules,
    context: HookContext,
    logger: Logger,
    config: ConfigManager,
    state: StateManager,
    eventBus: EventBus
  ) {
    super(modules, context, logger, config, state, eventBus);
  }

  async execute(_input: SessionEndInput): Promise<SessionEndResult> {
    const startTime = Date.now();
    const warnings: HookWarning[] = [];
    const session = this.state.getSession();

    this.logger.info('Session end hook executing...');

    try {
      // ═══════════════════════════════════════════════════════════
      // STEP 1: Save all memory
      // ═══════════════════════════════════════════════════════════
      let memorySaved = 0;
      try {
        const memorySummary = await this.modules.memory.getSummary();
        memorySaved = memorySummary.total;

        this.logger.info(`Saving ${memorySaved} memory items`);
      } catch (error) {
        warnings.push({
          level: 'warning',
          message: 'Failed to save some memory items',
        });
      }

      // ═══════════════════════════════════════════════════════════
      // STEP 2: Save task progress
      // ═══════════════════════════════════════════════════════════
      let tasksSaved = 0;
      try {
        await this.modules.workflow.saveTasks();
        const taskList = this.modules.workflow.getTaskList();
        tasksSaved = taskList.length;

        // Pause any in-progress tasks
        const currentTask = this.modules.workflow.getCurrentTask();
        if (currentTask) {
          await this.modules.workflow.pauseTask(currentTask.id);

          warnings.push({
            level: 'info',
            message: `Task "${currentTask.name}" paused at ${currentTask.progress}%`,
            action: 'Resume with /ccg task resume next session',
          });
        }
      } catch (error) {
        warnings.push({
          level: 'warning',
          message: 'Failed to save some tasks',
        });
      }

      // ═══════════════════════════════════════════════════════════
      // STEP 3: Create final checkpoint
      // ═══════════════════════════════════════════════════════════
      let checkpointId: string | undefined;
      try {
        const checkpoint = await this.modules.resource.createCheckpoint({
          name: 'session-end',
          reason: 'session_end',
        });

        checkpointId = checkpoint.id;
        this.logger.info(`Final checkpoint created: ${checkpointId}`);
      } catch (error) {
        warnings.push({
          level: 'warning',
          message: 'Failed to create final checkpoint',
        });
      }

      // ═══════════════════════════════════════════════════════════
      // STEP 4: Cleanup spawned processes
      // ═══════════════════════════════════════════════════════════
      let processesCleanedUp = 0;
      try {
        const cleanupResult = await this.modules.process.cleanupSpawned();
        processesCleanedUp = cleanupResult.cleaned;

        if (processesCleanedUp > 0) {
          this.logger.info(`Cleaned up ${processesCleanedUp} process(es)`);
        }
      } catch (error) {
        warnings.push({
          level: 'warning',
          message: 'Failed to cleanup some processes',
        });
      }

      // ═══════════════════════════════════════════════════════════
      // STEP 5: Generate session summary
      // ═══════════════════════════════════════════════════════════
      const summary = await this.generateSessionSummary();

      // Calculate session duration
      const sessionDuration = session
        ? Date.now() - session.startedAt.getTime()
        : 0;

      // Mark session as ended
      this.state.endSession();

      // Emit session end event
      this.eventBus.emit({
        type: 'session:end',
        sessionId: session?.id,
        timestamp: new Date(),
      });

      const duration = Date.now() - startTime;
      this.logger.info(`Session end completed in ${duration}ms`);

      // Build farewell message
      const message = this.buildFarewellMessage({
        sessionDuration,
        memorySaved,
        tasksSaved,
        processesCleanedUp,
        summary,
      });

      return {
        success: true,
        message,
        warnings,
        data: {
          memorySaved,
          tasksSaved,
          checkpointId,
          processesCleanedUp,
          sessionDuration,
          summary,
        },
      };

    } catch (error) {
      this.logger.error('Session end failed:', error);

      return {
        success: false,
        message: `Session end failed: ${error instanceof Error ? error.message : 'Unknown'}`,
        warnings,
        data: {
          memorySaved: 0,
          tasksSaved: 0,
          processesCleanedUp: 0,
          sessionDuration: 0,
          summary: {
            tasksCompleted: 0,
            tasksInProgress: 0,
            filesModified: 0,
            testsRun: 0,
            guardBlocks: 0,
            checkpointsCreated: 0,
          },
        },
      };
    }
  }

  private async generateSessionSummary(): Promise<SessionSummary> {
    let tasksCompleted = 0;
    let tasksInProgress = 0;
    let filesModified = 0;
    let testsRun = 0;
    let guardBlocks = 0;
    let checkpointsCreated = 0;

    try {
      // Get task counts
      const taskList = this.modules.workflow.getTasks();
      tasksCompleted = taskList.filter(t => t.status === 'completed').length;
      tasksInProgress = taskList.filter(t => t.status === 'in_progress' || t.status === 'paused').length;

      // Get checkpoint count
      const resourceStatus = this.modules.resource.getStatus();
      checkpointsCreated = resourceStatus.checkpoints.count;

      // Get guard status
      const guardStatus = this.modules.guard.getStatus();
      guardBlocks = guardStatus.stats.blockedCount;

      // Get testing status
      const testStatus = this.modules.testing.getStatus();
      const lastResults = testStatus.lastResults;
      if (lastResults) {
        testsRun = lastResults.passed + lastResults.failed + lastResults.skipped;
      }

      // Count files modified from tasks
      for (const task of taskList) {
        filesModified += task.filesAffected?.length || 0;
      }
    } catch (error) {
      this.logger.warn('Failed to generate complete summary:', error);
    }

    return {
      tasksCompleted,
      tasksInProgress,
      filesModified,
      testsRun,
      guardBlocks,
      checkpointsCreated,
    };
  }

  private buildFarewellMessage(data: {
    sessionDuration: number;
    memorySaved: number;
    tasksSaved: number;
    processesCleanedUp: number;
    summary: SessionSummary;
  }): string {
    const lines: string[] = [];

    lines.push('');
    lines.push('  CLAUDE CODE GUARDIAN - Session Complete');
    lines.push('===============================================');
    lines.push('');

    // Session duration
    const durationMinutes = Math.round(data.sessionDuration / 1000 / 60);
    lines.push(`Duration: ${durationMinutes} minute(s)`);

    // Summary stats
    lines.push('');
    lines.push('Session Summary:');

    if (data.summary.tasksCompleted > 0) {
      lines.push(`   Tasks completed: ${data.summary.tasksCompleted}`);
    }
    if (data.summary.tasksInProgress > 0) {
      lines.push(`   Tasks paused: ${data.summary.tasksInProgress}`);
    }
    if (data.summary.filesModified > 0) {
      lines.push(`   Files modified: ${data.summary.filesModified}`);
    }
    if (data.summary.testsRun > 0) {
      lines.push(`   Tests run: ${data.summary.testsRun}`);
    }
    if (data.summary.guardBlocks > 0) {
      lines.push(`   Guard rules active: ${data.summary.guardBlocks}`);
    }
    if (data.summary.checkpointsCreated > 0) {
      lines.push(`   Checkpoints: ${data.summary.checkpointsCreated}`);
    }

    // What was saved
    lines.push('');
    lines.push('Saved:');
    lines.push(`   * ${data.memorySaved} memory items`);
    lines.push(`   * ${data.tasksSaved} tasks`);

    if (data.processesCleanedUp > 0) {
      lines.push(`   * Cleaned ${data.processesCleanedUp} process(es)`);
    }

    lines.push('');
    lines.push('See you next time! Your progress has been saved.');
    lines.push('');
    lines.push('===============================================');

    return lines.join('\n');
  }
}
