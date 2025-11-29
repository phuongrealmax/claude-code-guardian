import { HookHandler, Modules } from './hook-handler.js';
import {
  SessionStartInput,
  SessionStartResult,
  TaskResume,
  ProcessInfo,
  HookContext,
  HookWarning
} from './types.js';
import { Logger } from '../core/logger.js';
import { ConfigManager } from '../core/config-manager.js';
import { StateManager } from '../core/state-manager.js';
import { EventBus } from '../core/event-bus.js';
import { v4 as uuid } from 'uuid';

export class SessionStartHook extends HookHandler {
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

  async execute(input: SessionStartInput): Promise<SessionStartResult> {
    const startTime = Date.now();
    const warnings: HookWarning[] = [];

    this.logger.info('Session start hook executing...');

    try {
      // ═══════════════════════════════════════════════════════════
      // STEP 1: Initialize session
      // ═══════════════════════════════════════════════════════════
      const sessionId = uuid();
      this.state.setSession({
        id: sessionId,
        startedAt: new Date(),
        projectPath: input.projectPath,
        status: 'active',
      });

      // ═══════════════════════════════════════════════════════════
      // STEP 2: Load persistent memory
      // ═══════════════════════════════════════════════════════════
      let memoryLoaded = 0;
      try {
        const memorySummary = await this.modules.memory.getSummary();
        memoryLoaded = memorySummary.total;

        if (memoryLoaded > 0) {
          this.logger.info(`Loaded ${memoryLoaded} memory items`);
        }
      } catch (error) {
        warnings.push(this.createWarning(
          'warning',
          'Failed to load memory',
          'Memory will start fresh this session'
        ));
      }

      // ═══════════════════════════════════════════════════════════
      // STEP 3: Check and list running processes
      // ═══════════════════════════════════════════════════════════
      const runningProcesses: ProcessInfo[] = [];
      try {
        const processes = await this.modules.process.getRunningProcesses();
        for (const proc of processes) {
          runningProcesses.push({
            pid: proc.pid,
            name: proc.name || 'unknown',
            port: proc.port,
          });
        }

        // Check for zombie processes
        const zombies = runningProcesses.filter(p => p.name === 'zombie');
        if (zombies.length > 0) {
          warnings.push(this.createWarning(
            'warning',
            `Found ${zombies.length} zombie process(es)`,
            'Use /ccg process cleanup to remove them'
          ));
        }
      } catch (error) {
        this.logger.warn('Failed to check processes:', error);
      }

      // ═══════════════════════════════════════════════════════════
      // STEP 4: Load pending tasks
      // ═══════════════════════════════════════════════════════════
      const pendingTasks: TaskResume[] = [];
      try {
        const taskList = this.modules.workflow.getTasks({
          status: ['pending', 'in_progress', 'paused'],
        });

        for (const task of taskList) {
          const checkpoints = task.checkpoints || [];
          pendingTasks.push({
            id: task.id,
            name: task.name,
            progress: task.progress,
            status: task.status,
            lastCheckpoint: checkpoints[checkpoints.length - 1],
          });
        }

        // Find in-progress task
        const inProgress = pendingTasks.find(t => t.status === 'in_progress');
        if (inProgress) {
          warnings.push(this.createWarning(
            'info',
            `Resume available: "${inProgress.name}" (${inProgress.progress}% complete)`,
            'Type /ccg task resume to continue'
          ));
        }
      } catch (error) {
        this.logger.warn('Failed to load tasks:', error);
      }

      // ═══════════════════════════════════════════════════════════
      // STEP 5: Get resource status
      // ═══════════════════════════════════════════════════════════
      let resourceStatus = {
        tokensUsed: 0,
        tokensEstimated: 200000,
        percentage: 0,
      };

      try {
        const status = this.modules.resource.getStatus();
        resourceStatus = {
          tokensUsed: status.tokens.used,
          tokensEstimated: status.tokens.estimated,
          percentage: status.tokens.percentage,
        };
      } catch (error) {
        this.logger.warn('Failed to get resource status:', error);
      }

      // ═══════════════════════════════════════════════════════════
      // STEP 6: Scan documents
      // ═══════════════════════════════════════════════════════════
      try {
        await this.modules.documents.scanDocuments();
      } catch (error) {
        this.logger.warn('Failed to scan documents:', error);
      }

      // ═══════════════════════════════════════════════════════════
      // STEP 7: Build welcome message
      // ═══════════════════════════════════════════════════════════
      const welcomeMessage = this.buildWelcomeMessage({
        memoryLoaded,
        pendingTasks,
        runningProcesses,
        resourceStatus,
      });

      // Emit session start event
      this.eventBus.emit({
        type: 'session:start',
        sessionId,
        timestamp: new Date(),
      });

      const duration = Date.now() - startTime;
      this.logger.info(`Session start completed in ${duration}ms`);

      return {
        success: true,
        message: welcomeMessage,
        warnings,
        data: {
          sessionId,
          memoryLoaded,
          pendingTasks,
          runningProcesses,
          resourceStatus,
          welcomeMessage,
        },
      };

    } catch (error) {
      this.logger.error('Session start failed:', error);

      return {
        success: false,
        message: `Session start failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        warnings,
        data: {
          sessionId: '',
          memoryLoaded: 0,
          pendingTasks: [],
          runningProcesses: [],
          resourceStatus: { tokensUsed: 0, tokensEstimated: 200000, percentage: 0 },
          welcomeMessage: 'Session start failed',
        },
      };
    }
  }

  private buildWelcomeMessage(data: {
    memoryLoaded: number;
    pendingTasks: TaskResume[];
    runningProcesses: ProcessInfo[];
    resourceStatus: { tokensUsed: number; tokensEstimated: number; percentage: number };
  }): string {
    const lines: string[] = [];

    lines.push('');
    lines.push('  CLAUDE CODE GUARDIAN - Session Started');
    lines.push('===============================================');
    lines.push('');

    // Memory status
    if (data.memoryLoaded > 0) {
      lines.push(`Memory: ${data.memoryLoaded} items loaded`);
    } else {
      lines.push('Memory: Fresh session');
    }

    // Task status
    const inProgress = data.pendingTasks.find(t => t.status === 'in_progress');
    const pending = data.pendingTasks.filter(t => t.status === 'pending');
    const paused = data.pendingTasks.filter(t => t.status === 'paused');

    if (inProgress) {
      lines.push(`Active Task: "${inProgress.name}" - ${inProgress.progress}% complete`);
    }
    if (pending.length > 0) {
      lines.push(`Pending Tasks: ${pending.length}`);
    }
    if (paused.length > 0) {
      lines.push(`Paused Tasks: ${paused.length}`);
    }

    // Process status
    if (data.runningProcesses.length > 0) {
      const ports = data.runningProcesses
        .filter(p => p.port)
        .map(p => p.port)
        .join(', ');
      lines.push(`Processes: ${data.runningProcesses.length} running${ports ? ` (ports: ${ports})` : ''}`);
    }

    // Resource status
    lines.push(`Resources: ${data.resourceStatus.percentage}% token usage`);

    lines.push('');
    lines.push('Quick Commands:');
    lines.push('   /ccg status  - View full status');
    lines.push('   /ccg task    - Manage tasks');
    lines.push('   /ccg help    - All commands');
    lines.push('');
    lines.push('===============================================');

    return lines.join('\n');
  }
}
