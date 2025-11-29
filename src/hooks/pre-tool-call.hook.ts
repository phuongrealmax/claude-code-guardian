import { HookHandler, Modules } from './hook-handler.js';
import {
  PreToolCallInput,
  PreToolCallResult,
  TaskEstimation,
  ImpactAnalysis,
  GuardWarning,
  HookContext,
  HookWarning
} from './types.js';
import { Logger } from '../core/logger.js';
import { ConfigManager } from '../core/config-manager.js';
import { StateManager } from '../core/state-manager.js';
import { EventBus } from '../core/event-bus.js';
import { existsSync } from 'fs';
import { dirname, basename, join } from 'path';

export class PreToolCallHook extends HookHandler {
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

  async execute(input: PreToolCallInput): Promise<PreToolCallResult> {
    const startTime = Date.now();
    const warnings: HookWarning[] = [];
    const guardWarnings: GuardWarning[] = [];
    const suggestions: string[] = [];
    let blocked = false;
    let blockReason = '';

    this.logger.debug(`Pre-tool hook for: ${input.toolName}`);

    try {
      // ═══════════════════════════════════════════════════════════
      // STEP 1: Estimate task complexity (for write operations)
      // ═══════════════════════════════════════════════════════════
      let estimation: TaskEstimation | undefined;

      if (this.isWriteOperation(input.toolName)) {
        estimation = await this.estimateTask(input);

        if (estimation.suggestCheckpoint) {
          warnings.push(this.createWarning(
            'warning',
            `Token usage high (${estimation.estimatedTokens} estimated). Consider creating checkpoint.`,
            '/ccg checkpoint create'
          ));
        }

        if (!estimation.canComplete) {
          warnings.push(this.createWarning(
            'error',
            'Task may exceed available tokens!',
            'Create checkpoint now or break task into smaller pieces'
          ));
        }

        if (estimation.suggestBreakdown) {
          suggestions.push('Consider breaking this task into smaller subtasks');
        }
      }

      // ═══════════════════════════════════════════════════════════
      // STEP 2: Impact analysis
      // ═══════════════════════════════════════════════════════════
      let impactAnalysis: ImpactAnalysis | undefined;

      if (this.isWriteOperation(input.toolName)) {
        impactAnalysis = this.analyzeImpact(input);

        if (impactAnalysis.riskLevel === 'high') {
          warnings.push(this.createWarning(
            'warning',
            `High-risk change: affects ${impactAnalysis.filesAffected.length} files`,
            'Review affected files before proceeding'
          ));
        }

        if (impactAnalysis.potentialConflicts.length > 0) {
          warnings.push(this.createWarning(
            'warning',
            `Potential conflicts detected in: ${impactAnalysis.potentialConflicts.join(', ')}`,
            'Check for unsaved changes'
          ));
        }

        if (impactAnalysis.testsToRun.length > 0) {
          suggestions.push(`Run affected tests: ${impactAnalysis.testsToRun.slice(0, 3).join(', ')}`);
        }
      }

      // ═══════════════════════════════════════════════════════════
      // STEP 3: Pre-validate content with Guard
      // ═══════════════════════════════════════════════════════════
      if (input.toolName === 'write_file' || input.toolName === 'edit_file') {
        const content = this.extractContent(input);
        const filename = this.extractFilename(input);

        if (content && filename) {
          const validation = await this.modules.guard.validate(content, filename);

          for (const issue of validation.issues) {
            guardWarnings.push({
              rule: issue.rule,
              severity: issue.severity as 'warning' | 'error' | 'block',
              message: issue.message,
              location: issue.location,
              suggestion: issue.suggestion,
            });

            if (issue.severity === 'block') {
              blocked = true;
              blockReason = `Guard blocked: ${issue.message}`;
            }
          }
        }
      }

      // ═══════════════════════════════════════════════════════════
      // STEP 4: Process-specific checks
      // ═══════════════════════════════════════════════════════════
      if (input.toolName === 'bash') {
        const command = this.extractBashCommand(input);

        if (command) {
          // Check for server/process start commands
          const portMatch = command.match(/(?:--port|PORT=|:)(\d{4,5})/);
          if (portMatch) {
            const port = parseInt(portMatch[1], 10);
            const portStatus = await this.modules.process.checkPort(port);

            if (!portStatus.available) {
              warnings.push(this.createWarning(
                'warning',
                `Port ${port} is already in use by ${portStatus.usedBy || 'unknown process'}`,
                'Kill existing process or use different port'
              ));
              suggestions.push(`Run: /ccg process kill --port ${port}`);
            }
          }

          // Check for dangerous commands
          if (this.isDangerousCommand(command)) {
            warnings.push(this.createWarning(
              'error',
              'Potentially dangerous command detected',
              'Review command carefully before executing'
            ));
          }
        }
      }

      // ═══════════════════════════════════════════════════════════
      // STEP 5: Track file in current task
      // ═══════════════════════════════════════════════════════════
      if (this.isWriteOperation(input.toolName)) {
        const filename = this.extractFilename(input);
        const currentTask = this.modules.workflow.getCurrentTask();

        if (currentTask && filename) {
          await this.modules.workflow.addAffectedFile(currentTask.id, filename);
        }
      }

      const duration = Date.now() - startTime;
      this.logger.debug(`Pre-tool hook completed in ${duration}ms`);

      // Build result
      const allWarnings: HookWarning[] = [
        ...warnings,
        ...guardWarnings.map(gw => ({
          level: gw.severity === 'block' ? 'error' as const : gw.severity as 'warning' | 'error',
          message: gw.message,
          action: gw.suggestion,
        })),
      ];

      return {
        success: !blocked,
        blocked,
        blockReason: blocked ? blockReason : undefined,
        message: blocked ? blockReason : undefined,
        warnings: allWarnings,
        data: {
          validated: !blocked,
          estimation,
          impactAnalysis,
          guardWarnings: guardWarnings.length > 0 ? guardWarnings : undefined,
          suggestions: suggestions.length > 0 ? suggestions : undefined,
        },
      };

    } catch (error) {
      this.logger.error('Pre-tool hook error:', error);

      return {
        success: true, // Don't block on hook errors
        warnings: [{
          level: 'warning',
          message: `Pre-tool validation error: ${error instanceof Error ? error.message : 'Unknown'}`,
        }],
        data: {
          validated: true,
        },
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //                      HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  private isWriteOperation(toolName: string): boolean {
    return ['write_file', 'edit_file', 'create_file', 'str_replace_editor'].includes(toolName);
  }

  private async estimateTask(input: PreToolCallInput): Promise<TaskEstimation> {
    const content = this.extractContent(input);
    const linesEstimate = content ? content.split('\n').length : 50;

    // Simple estimation based on content size
    const estimatedTokens = Math.round(linesEstimate * 10); // ~10 tokens per line estimate
    const resourceStatus = this.modules.resource.getStatus();
    const remainingTokens = resourceStatus.tokens.estimated - resourceStatus.tokens.used;

    let complexity: 'low' | 'medium' | 'high' | 'very_high' = 'low';
    if (linesEstimate > 100) complexity = 'medium';
    if (linesEstimate > 300) complexity = 'high';
    if (linesEstimate > 500) complexity = 'very_high';

    return {
      complexity,
      estimatedTokens,
      canComplete: estimatedTokens < remainingTokens,
      suggestCheckpoint: resourceStatus.tokens.percentage >= 70,
      suggestBreakdown: linesEstimate > 200,
    };
  }

  private analyzeImpact(input: PreToolCallInput): ImpactAnalysis {
    const filename = this.extractFilename(input);
    const filesAffected: string[] = filename ? [filename] : [];
    const dependentFiles: string[] = [];
    const potentialConflicts: string[] = [];
    const testsToRun: string[] = [];

    if (filename) {
      // Find dependent files (simple import analysis)
      const baseName = basename(filename).replace(/\.(ts|tsx|js|jsx)$/, '');

      // Look for test files
      const testPatterns = [
        `${baseName}.test.ts`,
        `${baseName}.test.tsx`,
        `${baseName}.spec.ts`,
        `__tests__/${baseName}.ts`,
      ];

      for (const pattern of testPatterns) {
        const testPath = join(dirname(filename), pattern);
        if (existsSync(testPath)) {
          testsToRun.push(testPath);
        }
      }

      // Check for index file dependencies
      const dir = dirname(filename);
      const indexPath = join(dir, 'index.ts');
      if (existsSync(indexPath) && indexPath !== filename) {
        dependentFiles.push(indexPath);
      }
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (filesAffected.length > 3) riskLevel = 'medium';
    if (filesAffected.length > 5 || potentialConflicts.length > 0) riskLevel = 'high';

    return {
      filesAffected,
      dependentFiles,
      potentialConflicts,
      testsToRun,
      riskLevel,
    };
  }

  private extractContent(input: PreToolCallInput): string | undefined {
    const toolInput = input.toolInput;
    return (toolInput.content || toolInput.new_str || toolInput.file_text) as string | undefined;
  }

  private extractFilename(input: PreToolCallInput): string | undefined {
    const toolInput = input.toolInput;
    return (toolInput.path || toolInput.file_path || toolInput.filename) as string | undefined;
  }

  private extractBashCommand(input: PreToolCallInput): string | undefined {
    const toolInput = input.toolInput;
    return (toolInput.command || toolInput.cmd) as string | undefined;
  }

  private isDangerousCommand(command: string): boolean {
    const dangerousPatterns = [
      /rm\s+-rf?\s+[\/~]/,
      />\s*\/dev\/sd[a-z]/,
      /mkfs\./,
      /dd\s+if=/,
      /chmod\s+-R\s+777/,
      /:(){ :|:& };:/,  // Fork bomb
    ];

    return dangerousPatterns.some(pattern => pattern.test(command));
  }
}
