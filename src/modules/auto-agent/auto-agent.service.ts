// src/modules/auto-agent/auto-agent.service.ts
/**
 * AutoAgent Service
 *
 * Main orchestrator for autonomous agent capabilities.
 * Coordinates TaskDecomposer, ToolRouter, AutoFixLoop, and ErrorMemory.
 */

import { Logger } from '../../core/logger.js';
import { EventBus } from '../../core/event-bus.js';
import { TaskDecomposer } from './task-decomposer.js';
import { ToolRouter } from './tool-router.js';
import { AutoFixLoop } from './auto-fix-loop.js';
import { ErrorMemory } from './error-memory.js';
import {
  AutoAgentModuleConfig,
  AutoAgentStatus,
  DecomposeParams,
  DecomposeResult,
  RouteToolParams,
  ToolRouteResult,
  StartFixLoopParams,
  FixLoopResult,
  StoreErrorParams,
  RecallErrorsParams,
  RecallErrorsResult,
  ErrorMemoryEntry,
} from './auto-agent.types.js';
import { GovernorState } from '../resource/resource.types.js';

export class AutoAgentService {
  private config: AutoAgentModuleConfig;
  private logger: Logger;
  private eventBus: EventBus;

  // Sub-services
  private decomposer: TaskDecomposer;
  private router: ToolRouter;
  private fixLoop: AutoFixLoop;
  private errorMemory: ErrorMemory;

  // Token Budget Governor integration
  private governorStateProvider?: () => GovernorState;

  // Checkpoint integration for large plans
  private checkpointProvider?: (params: {
    name: string;
    reason: string;
    metadata?: Record<string, unknown>;
  }) => Promise<{ id: string; name: string } | null>;

  // Config for large plan checkpoint threshold
  private largePlanThreshold = 5; // Checkpoint if plan has >= 5 subtasks

  constructor(
    config: AutoAgentModuleConfig,
    eventBus: EventBus,
    logger: Logger
  ) {
    this.config = config;
    this.logger = logger;
    this.eventBus = eventBus;

    // Initialize sub-services
    this.decomposer = new TaskDecomposer(config.decomposer, logger, eventBus);
    this.router = new ToolRouter(config.router, logger, eventBus);
    this.fixLoop = new AutoFixLoop(config.fixLoop, logger, eventBus);
    this.errorMemory = new ErrorMemory(config.errorMemory, logger, eventBus);
  }

  // ═══════════════════════════════════════════════════════════════
  //                      LIFECYCLE
  // ═══════════════════════════════════════════════════════════════

  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      this.logger.info('AutoAgent module is disabled');
      return;
    }

    this.logger.info('Initializing AutoAgent service...');

    // Setup event listeners for auto-features
    this.setupEventListeners();

    this.logger.info('AutoAgent service initialized');
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down AutoAgent service...');
    // Cleanup if needed
    this.logger.info('AutoAgent service shutdown complete');
  }

  /**
   * Set the governor state provider for token budget integration
   */
  setGovernorStateProvider(provider: () => GovernorState): void {
    this.governorStateProvider = provider;
    this.logger.debug('Governor state provider set');
  }

  /**
   * Set the checkpoint provider for auto-checkpoint on large plans
   */
  setCheckpointProvider(provider: (params: {
    name: string;
    reason: string;
    metadata?: Record<string, unknown>;
  }) => Promise<{ id: string; name: string } | null>): void {
    this.checkpointProvider = provider;
    this.logger.debug('Checkpoint provider set');
  }

  /**
   * Set the large plan threshold for auto-checkpoint
   * @param threshold - Number of subtasks that triggers checkpoint (default: 5)
   */
  setLargePlanThreshold(threshold: number): void {
    this.largePlanThreshold = threshold;
    this.logger.debug(`Large plan threshold set to ${threshold}`);
  }

  // ═══════════════════════════════════════════════════════════════
  //                      TASK DECOMPOSITION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Decompose a task into subtasks
   * Respects token budget governor state:
   * - Critical mode: Blocks task decomposition entirely
   * - Conservative mode: Limits subtasks to 3 maximum
   */
  async decomposeTask(params: DecomposeParams): Promise<DecomposeResult> {
    // Check governor state first
    if (this.governorStateProvider) {
      const governorState = this.governorStateProvider();

      if (governorState.mode === 'critical') {
        this.logger.warn('Task decomposition blocked: Token budget in critical mode');
        return {
          success: false,
          taskId: '',
          complexity: { score: 0, factors: [], suggestDecompose: false, estimatedSubtasks: 0 },
          subtasks: [],
          suggestedOrder: [],
          error: 'Token budget critical. Cannot create new tasks.',
          governorState: {
            mode: governorState.mode,
            recommendation: governorState.recommendation,
          },
        };
      }

      if (governorState.mode === 'conservative') {
        this.logger.info('Task decomposition in conservative mode: limiting subtasks');
      }
    }

    if (!this.config.decomposer.autoDecompose && !params.forceDecompose) {
      return {
        success: false,
        taskId: '',
        complexity: { score: 0, factors: [], suggestDecompose: false, estimatedSubtasks: 0 },
        subtasks: [],
        suggestedOrder: [],
      };
    }

    // Perform decomposition
    const result = await this.decomposer.decompose(params);

    // Apply governor constraints if in conservative mode
    if (this.governorStateProvider) {
      const governorState = this.governorStateProvider();

      if (governorState.mode === 'conservative' && result.subtasks.length > 3) {
        this.logger.info(`Limiting subtasks from ${result.subtasks.length} to 3 due to token budget`);
        result.subtasks = result.subtasks.slice(0, 3);
        result.suggestedOrder = result.suggestedOrder.slice(0, 3);
        result.subtasks.forEach(t => {
          t.note = 'Limited due to token budget (conservative mode)';
        });
        result.governorState = {
          mode: governorState.mode,
          recommendation: governorState.recommendation,
          note: 'Subtasks limited to 3 due to conservative token budget',
        };
      }
    }

    // Auto-checkpoint for large plans
    if (this.checkpointProvider && result.success && result.subtasks.length >= this.largePlanThreshold) {
      this.logger.info(`Large plan detected (${result.subtasks.length} subtasks >= ${this.largePlanThreshold}), creating checkpoint`);

      try {
        const checkpoint = await this.checkpointProvider({
          name: `large-plan-${result.taskId || 'unknown'}`,
          reason: 'before_risky_operation',
          metadata: {
            taskName: params.taskName,
            subtaskCount: result.subtasks.length,
            complexity: result.complexity.score,
            trigger: 'large_plan_decomposition',
          },
        });

        if (checkpoint) {
          result.checkpointCreated = {
            id: checkpoint.id,
            name: checkpoint.name,
            reason: `Auto-checkpoint before large plan (${result.subtasks.length} subtasks)`,
          };

          this.logger.info(`Checkpoint created: ${checkpoint.name} (${checkpoint.id})`);

          // Emit event
          this.eventBus.emit({
            type: 'auto-agent:checkpoint',
            timestamp: new Date(),
            data: {
              checkpointId: checkpoint.id,
              trigger: 'large_plan',
              subtaskCount: result.subtasks.length,
              taskId: result.taskId,
            },
            source: 'AutoAgentService',
          });
        }
      } catch (error) {
        this.logger.error('Failed to create checkpoint for large plan:', error);
        // Don't fail the decomposition if checkpoint fails
      }
    }

    return result;
  }

  /**
   * Analyze task complexity
   */
  analyzeComplexity(params: DecomposeParams) {
    return this.decomposer.analyzeComplexity(params);
  }

  // ═══════════════════════════════════════════════════════════════
  //                      TOOL ROUTING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Route to appropriate tools
   */
  routeTools(params: RouteToolParams): ToolRouteResult {
    if (!this.config.router.enabled) {
      return {
        success: false,
        suggestedTools: [],
        matchedRules: [],
        confidence: 0,
      };
    }

    return this.router.route(params);
  }

  /**
   * Get best tool for action
   */
  getBestTool(params: RouteToolParams) {
    return this.router.getBestTool(params);
  }

  // ═══════════════════════════════════════════════════════════════
  //                      AUTO FIX LOOP
  // ═══════════════════════════════════════════════════════════════

  /**
   * Start fix loop
   */
  async startFixLoop(params: StartFixLoopParams): Promise<FixLoopResult> {
    if (!this.config.fixLoop.enabled) {
      return {
        success: false,
        status: 'idle',
        attempts: [],
        totalAttempts: 0,
        rolledBack: false,
      };
    }

    // First, recall similar errors
    if (this.config.errorMemory.autoRecall) {
      const recalled = await this.errorMemory.recall({ error: params.error });
      if (recalled.suggestedFix && recalled.confidence > 0.7) {
        this.logger.info(`Found high-confidence fix from memory (${recalled.confidence})`);
        // Could inject suggested fix here
      }
    }

    return this.fixLoop.startFixLoop(params);
  }

  /**
   * Get fix loop status
   */
  getFixLoopStatus() {
    return this.fixLoop.getStatus();
  }

  /**
   * Reset fix loop
   */
  resetFixLoop() {
    this.fixLoop.reset();
  }

  // ═══════════════════════════════════════════════════════════════
  //                      ERROR MEMORY
  // ═══════════════════════════════════════════════════════════════

  /**
   * Store error and fix
   */
  async storeError(params: StoreErrorParams): Promise<ErrorMemoryEntry> {
    return this.errorMemory.store(params);
  }

  /**
   * Recall similar errors
   */
  async recallErrors(params: RecallErrorsParams): Promise<RecallErrorsResult> {
    return this.errorMemory.recall(params);
  }

  /**
   * Get all stored errors
   */
  getAllErrors() {
    return this.errorMemory.getAll();
  }

  // ═══════════════════════════════════════════════════════════════
  //                      STATUS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get module status
   */
  getStatus(): AutoAgentStatus {
    const decomposerStats = this.decomposer.getStats();
    const routerStats = this.router.getStats();
    const fixLoopStats = this.fixLoop.getStats();
    const errorMemoryStats = this.errorMemory.getStats();

    return {
      enabled: this.config.enabled,
      decomposer: {
        enabled: this.config.decomposer.autoDecompose,
        totalDecomposed: decomposerStats.totalDecomposed,
        avgSubtasks: decomposerStats.avgSubtasks,
      },
      router: {
        enabled: this.config.router.enabled,
        rulesCount: routerStats.rulesCount,
        totalRouted: routerStats.totalRouted,
      },
      fixLoop: {
        enabled: this.config.fixLoop.enabled,
        currentStatus: this.fixLoop.getStatus(),
        totalLoops: fixLoopStats.totalLoops,
        successRate: fixLoopStats.successRate,
      },
      errorMemory: {
        enabled: this.config.errorMemory.enabled,
        errorCount: errorMemoryStats.errorCount,
        patternCount: errorMemoryStats.patternCount,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //                      PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Setup event listeners for auto-features
   */
  private setupEventListeners(): void {
    // Auto-store errors from fix loop
    this.eventBus.on('auto-agent:fix:success', async (event) => {
      const data = event.data as { fix: { target: string; description: string } };
      await this.errorMemory.store({
        error: { type: 'fix', message: 'Auto-fixed error' },
        fix: {
          type: 'patch',
          target: data.fix.target,
          description: data.fix.description,
        },
        success: true,
        tags: ['auto-fix'],
      });
    });

    this.eventBus.on('auto-agent:fix:failed', async (event) => {
      const data = event.data as { attempts: number };
      if (data.attempts > 0) {
        await this.errorMemory.store({
          error: { type: 'fix', message: 'Failed to auto-fix' },
          fix: { type: 'custom', target: '', description: 'No fix found' },
          success: false,
          tags: ['auto-fix-failed'],
        });
      }
    });

    // Auto-decompose on task creation (if enabled)
    this.eventBus.on('task:create', async (event) => {
      if (this.config.decomposer.autoDecompose) {
        const data = event.data as { task?: { name: string; description?: string } } | undefined;
        const task = data?.task;
        if (task) {
          await this.decomposeTask({
            taskName: task.name,
            taskDescription: task.description,
          });
        }
      }
    });

    // NEW: Auto-recall on guard block
    this.eventBus.on('guard:block', async (event) => {
      if (!this.config.errorMemory.autoRecall) return;

      const data = event.data as {
        filename: string;
        rules?: string[];
        reasons?: string[];
        firstIssue?: { rule: string; message: string; suggestion?: string };
      };

      this.logger.debug(`Auto-recalling for guard block: ${data.filename}`);

      const errorInfo = {
        type: data.firstIssue?.rule || 'guard_block',
        message: data.firstIssue?.message || data.reasons?.join('; ') || 'Guard blocked',
        file: data.filename,
      };

      try {
        const recalled = await this.errorMemory.recall({
          error: errorInfo,
          limit: 3,
          minSimilarity: 0.5,
        });

        if (recalled.suggestedFix) {
          this.logger.info(`Found similar error fix for ${data.filename} (confidence: ${recalled.confidence})`);
          this.eventBus.emit({
            type: 'auto-agent:error:recalled',
            timestamp: new Date(),
            data: {
              trigger: 'guard:block',
              errorInfo,
              suggestedFix: recalled.suggestedFix,
              confidence: recalled.confidence,
              matches: recalled.matches?.slice(0, 2),
            },
            source: 'AutoAgentService',
          });
        }
      } catch (err) {
        this.logger.warn('Error during auto-recall for guard block:', err);
      }
    });

    // NEW: Auto-recall on test failure
    this.eventBus.on('test:fail', async (event) => {
      if (!this.config.errorMemory.autoRecall) return;

      const data = event.data as {
        testFile?: string;
        error?: string;
        message?: string;
        testName?: string;
      };

      this.logger.debug(`Auto-recalling for test failure: ${data.testFile}`);

      const errorInfo = {
        type: 'test_failure',
        message: data.error || data.message || 'Test failed',
        file: data.testFile,
      };

      try {
        const recalled = await this.errorMemory.recall({
          error: errorInfo,
          limit: 3,
          minSimilarity: 0.4,
        });

        if (recalled.suggestedFix) {
          this.logger.info(`Found similar test fix for ${data.testFile} (confidence: ${recalled.confidence})`);
          this.eventBus.emit({
            type: 'auto-agent:error:recalled',
            timestamp: new Date(),
            data: {
              trigger: 'test:fail',
              errorInfo,
              suggestedFix: recalled.suggestedFix,
              confidence: recalled.confidence,
              matches: recalled.matches?.slice(0, 2),
            },
            source: 'AutoAgentService',
          });
        }
      } catch (err) {
        this.logger.warn('Error during auto-recall for test failure:', err);
      }
    });

    this.logger.debug('AutoAgent event listeners registered');
  }
}
