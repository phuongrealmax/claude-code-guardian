// src/core/ccg-run/index.ts
/**
 * CCG Run Service - Single Entrypoint Orchestrator
 *
 * Provides a unified entrypoint for natural language commands.
 * Translates prompts to tool sequences and executes them.
 *
 * Flow:
 * 1. Create workflow task
 * 2. Translate prompt to tool steps
 * 3. Execute steps sequentially
 * 4. Persist report
 * 5. Return summary
 */

import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

import {
  CCGRunInput,
  CCGRunOutput,
  TranslatedSpec,
  InternalHandlers,
  ValidationResult,
  ExecutionResult,
  NextToolCall,
  FallbackGuidance,
} from './types.js';
import { translatePrompt, translateWithTinyPlanner } from './prompt-translator.js';
import { buildInternalHandlers, getHandler, getAvailableTools } from './handlers.js';
import { CCGModules } from '../../server-handlers.js';
import { StateManager } from '../state-manager.js';
import { Logger } from '../logger.js';

// ═══════════════════════════════════════════════════════════════
//                      TYPES
// ═══════════════════════════════════════════════════════════════

export interface CCGRunServiceDeps {
  modules: CCGModules;
  stateManager: StateManager;
  logger: Logger;
  projectRoot: string;
}

interface StepResult {
  tool: string;
  success: boolean;
  result?: unknown;
  error?: string;
  durationMs: number;
}

// ═══════════════════════════════════════════════════════════════
//                      SERVICE CLASS
// ═══════════════════════════════════════════════════════════════

export class CCGRunService {
  private modules: CCGModules;
  private stateManager: StateManager;
  private logger: Logger;
  private projectRoot: string;
  private handlers: InternalHandlers;

  constructor(deps: CCGRunServiceDeps) {
    this.modules = deps.modules;
    this.stateManager = deps.stateManager;
    this.logger = deps.logger || new Logger('info', 'CCGRunService');
    this.projectRoot = deps.projectRoot;

    // Build internal handlers map
    this.handlers = buildInternalHandlers({
      modules: this.modules,
      stateManager: this.stateManager,
    });

    this.logger.debug(`CCGRunService initialized with ${getAvailableTools(this.handlers).length} handlers`);
  }

  /**
   * Execute a natural language command
   */
  async run(input: CCGRunInput): Promise<CCGRunOutput> {
    const taskId = `ccg-run-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const startTime = Date.now();

    this.logger.info(`Starting ccg_run: taskId=${taskId}, prompt="${input.prompt.slice(0, 50)}..."`);

    // Initialize output structure
    const output: CCGRunOutput = {
      taskId,
      taskStatus: 'pending',
      supported: true,
      confidence: 0,
      translationSource: 'pattern',
      validation: {
        passed: false,
        checks: [],
      },
      execution: {
        stepsTotal: 0,
        stepsCompleted: 0,
        stepsFailed: 0,
        totalDurationMs: 0,
        steps: [],
      },
    };

    let workflowTaskId: string | undefined;

    try {
      // Step A: Create workflow task
      workflowTaskId = await this.createWorkflowTask(taskId, input.prompt);

      // Step B: Translate prompt
      const spec = await this.translatePrompt(input);
      output.confidence = spec.confidence;
      output.translationSource = spec.source;
      output.execution.stepsTotal = spec.steps.length;

      // Validate translation
      output.validation = this.validateSpec(spec);

      // Check for no-match case:
      // - No steps at all, OR
      // - has_steps validation check failed, OR
      // - confidence below threshold (0.5) - indicates fallback/no-pattern match
      const hasStepsCheckPassed = output.validation.checks.find(c => c.check === 'has_steps')?.passed ?? false;
      const confidenceCheckPassed = output.validation.checks.find(c => c.check === 'confidence_threshold')?.passed ?? false;
      const isNoMatch = spec.steps.length === 0 || !hasStepsCheckPassed || !confidenceCheckPassed;

      if (isNoMatch) {
        // No matching pattern - return structured fallback guidance
        output.supported = false;
        output.reason = 'NO_MATCHING_PATTERN';
        output.taskStatus = 'blocked';
        output.fallbackGuidance = this.buildFallbackGuidance();

        // Update workflow task to blocked (not complete)
        if (workflowTaskId) {
          await this.updateWorkflowTaskBlocked(workflowTaskId, 'NO_MATCHING_PATTERN');
        }
      } else if (!input.dryRun && output.validation.passed) {
        // Step C: Execute if not dry run and validation passed
        const execResult = await this.executeSteps(spec, output);
        output.execution = execResult;
        output.taskStatus = execResult.stepsFailed > 0 ? 'failed' : 'completed';

        // Step D: Complete workflow task
        if (workflowTaskId) {
          await this.completeWorkflowTask(workflowTaskId, output.taskStatus === 'completed');
        }
      } else if (input.dryRun && output.validation.passed) {
        // Dry run with passing validation - show pending with next tool calls
        output.taskStatus = 'pending';
        output.nextToolCalls = this.buildNextToolCalls(spec);

        if (workflowTaskId) {
          await this.completeWorkflowTask(workflowTaskId, false);
        }
      } else {
        // Validation failed (dryRun or not) - blocked
        output.taskStatus = 'blocked';
        output.nextToolCalls = this.buildNextToolCalls(spec);

        if (workflowTaskId) {
          await this.completeWorkflowTask(workflowTaskId, false);
        }
      }
    } catch (error) {
      output.taskStatus = 'failed';
      output.error = error instanceof Error ? error.message : String(error);
      this.logger.error(`ccg_run failed: ${output.error}`);

      // Mark workflow task as failed
      if (workflowTaskId) {
        await this.failWorkflowTask(workflowTaskId, output.error);
      }
    }

    // Step E: Persist report
    output.execution.totalDurationMs = Date.now() - startTime;

    if (input.persistReport !== false) {
      try {
        output.reportPath = await this.persistReport(taskId, input, output);
      } catch (reportError) {
        this.logger.warn(`Failed to persist report: ${reportError}`);
      }
    }

    this.logger.info(`ccg_run complete: taskId=${taskId}, status=${output.taskStatus}, duration=${output.execution.totalDurationMs}ms`);

    return output;
  }

  // ═══════════════════════════════════════════════════════════════
  //                      WORKFLOW TASK MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  private async createWorkflowTask(taskId: string, prompt: string): Promise<string | undefined> {
    try {
      const handler = getHandler(this.handlers, 'workflow_task_create');
      const result = await handler({
        name: `CCG Run: ${prompt.slice(0, 30)}...`,
        description: prompt,
        priority: 'medium',
        tags: ['ccg-run', 'auto'],
      }) as { taskId?: string };

      if (result?.taskId) {
        // Start the task
        const startHandler = getHandler(this.handlers, 'workflow_task_start');
        await startHandler({ taskId: result.taskId });
        return result.taskId;
      }
    } catch (error) {
      this.logger.warn(`Failed to create workflow task: ${error}`);
    }
    return undefined;
  }

  private async completeWorkflowTask(taskId: string, success: boolean): Promise<void> {
    try {
      if (success) {
        const handler = getHandler(this.handlers, 'workflow_task_complete');
        await handler({ taskId });
      } else {
        const handler = getHandler(this.handlers, 'workflow_task_update');
        await handler({ taskId, status: 'blocked' });
      }
    } catch (error) {
      this.logger.warn(`Failed to complete workflow task: ${error}`);
    }
  }

  private async failWorkflowTask(taskId: string, reason: string): Promise<void> {
    try {
      const handler = getHandler(this.handlers, 'workflow_task_fail');
      await handler({ taskId, reason });
    } catch (error) {
      this.logger.warn(`Failed to fail workflow task: ${error}`);
    }
  }

  private async updateWorkflowTaskBlocked(taskId: string, reason: string): Promise<void> {
    try {
      const handler = getHandler(this.handlers, 'workflow_task_update');
      await handler({ taskId, status: 'blocked' });
      // Add note explaining why blocked
      const noteHandler = getHandler(this.handlers, 'workflow_task_note');
      await noteHandler({ taskId, content: `Blocked: ${reason}`, type: 'blocker' });
    } catch (error) {
      this.logger.warn(`Failed to update workflow task as blocked: ${error}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //                      PROMPT TRANSLATION
  // ═══════════════════════════════════════════════════════════════

  private async translatePrompt(input: CCGRunInput): Promise<TranslatedSpec> {
    const mode = input.translationMode || 'auto';

    // Try TinyPlanner first if mode allows
    if (mode === 'auto' || mode === 'tiny') {
      const tinyResult = await translateWithTinyPlanner(
        input.prompt,
        getAvailableTools(this.handlers)
      );

      if (tinyResult) {
        return {
          steps: tinyResult.steps.map((s) => ({
            tool: s.tool,
            args: s.args,
          })),
          confidence: tinyResult.confidence,
          source: 'tiny',
        };
      }
    }

    // Fall back to pattern matching
    if (mode === 'auto' || mode === 'pattern') {
      return translatePrompt(input.prompt);
    }

    // If mode is 'claude', return empty spec (Claude will handle)
    return {
      steps: [],
      confidence: 0,
      source: 'pattern',
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //                      VALIDATION
  // ═══════════════════════════════════════════════════════════════

  private validateSpec(spec: TranslatedSpec): ValidationResult {
    const checks: Array<{ check: string; passed: boolean; message?: string }> = [];

    // Check 1: Has steps
    const hasSteps = spec.steps.length > 0;
    checks.push({
      check: 'has_steps',
      passed: hasSteps,
      message: hasSteps ? undefined : 'No tool steps generated from prompt',
    });

    // Check 2: All tools exist
    const missingTools: string[] = [];
    for (const step of spec.steps) {
      try {
        getHandler(this.handlers, step.tool);
      } catch {
        missingTools.push(step.tool);
      }
    }
    const allToolsExist = missingTools.length === 0;
    checks.push({
      check: 'tools_exist',
      passed: allToolsExist,
      message: allToolsExist ? undefined : `Missing handlers: ${missingTools.join(', ')}`,
    });

    // Check 3: Confidence threshold
    const CONFIDENCE_THRESHOLD = 0.5;
    const confidenceOk = spec.confidence >= CONFIDENCE_THRESHOLD;
    checks.push({
      check: 'confidence_threshold',
      passed: confidenceOk,
      message: confidenceOk
        ? undefined
        : `Confidence ${spec.confidence} below threshold ${CONFIDENCE_THRESHOLD}`,
    });

    return {
      passed: checks.every((c) => c.passed),
      checks,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //                      EXECUTION
  // ═══════════════════════════════════════════════════════════════

  private async executeSteps(
    spec: TranslatedSpec,
    output: CCGRunOutput
  ): Promise<ExecutionResult> {
    const result: ExecutionResult = {
      stepsTotal: spec.steps.length,
      stepsCompleted: 0,
      stepsFailed: 0,
      totalDurationMs: 0,
      steps: [],
    };

    for (const step of spec.steps) {
      const stepStart = Date.now();
      const stepResult: StepResult = {
        tool: step.tool,
        success: false,
        durationMs: 0,
      };

      try {
        const handler = getHandler(this.handlers, step.tool);
        stepResult.result = await handler(step.args);
        stepResult.success = true;
        result.stepsCompleted++;
      } catch (error) {
        stepResult.error = error instanceof Error ? error.message : String(error);
        result.stepsFailed++;
        this.logger.warn(`Step ${step.tool} failed: ${stepResult.error}`);
      }

      stepResult.durationMs = Date.now() - stepStart;
      result.steps.push(stepResult);
    }

    return result;
  }

  // ═══════════════════════════════════════════════════════════════
  //                      REPORTING
  // ═══════════════════════════════════════════════════════════════

  private buildNextToolCalls(spec: TranslatedSpec): NextToolCall[] {
    return spec.steps.map((step) => ({
      tool: step.tool,
      args: step.args,
      reason: `Translated from prompt with confidence ${spec.confidence}`,
    }));
  }

  private buildFallbackGuidance(): FallbackGuidance {
    return {
      summary: 'This looks like a setup/config request outside current task patterns.',
      suggestedNext: [
        'If you intended a CCG task, rephrase as an action on repo/code/tests/guards.',
        'If you intended MCP/global setup, follow the setup doc or configure outside CCG-runner.',
      ],
      examples: [
        '/ccg "run guard_validate for frontend"',
        '/ccg "run testing_run scope=affected"',
        '/ccg "analyze repo and propose fix plan"',
      ],
    };
  }

  private async persistReport(
    taskId: string,
    input: CCGRunInput,
    output: CCGRunOutput
  ): Promise<string> {
    const reportDir = input.reportDir || path.join(this.projectRoot, '.ccg', 'reports', 'ccg-run');

    // Ensure directory exists
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const reportPath = path.join(reportDir, `${taskId}.json`);
    const report = {
      taskId,
      timestamp: new Date().toISOString(),
      input: {
        prompt: input.prompt,
        dryRun: input.dryRun,
        translationMode: input.translationMode,
      },
      output,
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    this.logger.debug(`Report persisted: ${reportPath}`);

    return reportPath;
  }
}

// ═══════════════════════════════════════════════════════════════
//                      TOOL DEFINITION
// ═══════════════════════════════════════════════════════════════

export const CCG_RUN_TOOL_DEFINITION = {
  name: 'ccg_run',
  description:
    'Single entrypoint for natural language CCG commands. Translates prompts to tool sequences and executes them. Use this when the user provides a natural language request for CCG operations.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      prompt: {
        type: 'string',
        description: 'Natural language command (e.g., "analyze code", "run tests", "check memory")',
      },
      dryRun: {
        type: 'boolean',
        description: 'If true, translate but do not execute. Returns nextToolCalls.',
        default: false,
      },
      persistReport: {
        type: 'boolean',
        description: 'Persist report JSON even on error',
        default: true,
      },
      translationMode: {
        type: 'string',
        enum: ['auto', 'pattern', 'claude', 'tiny'],
        description:
          'Translation mode: auto (try tiny then pattern), pattern (regex only), claude (defer to Claude), tiny (external TinyPlanner only)',
        default: 'auto',
      },
      reportDir: {
        type: 'string',
        description: 'Custom directory for report output',
      },
    },
    required: ['prompt'],
  },
};

// ═══════════════════════════════════════════════════════════════
//                      EXPORTS
// ═══════════════════════════════════════════════════════════════

export { CCGRunInput, CCGRunOutput, TranslatedSpec, InternalHandlers } from './types.js';
export { translatePrompt, translateWithTinyPlanner } from './prompt-translator.js';
export { buildInternalHandlers, getHandler, getAvailableTools } from './handlers.js';
