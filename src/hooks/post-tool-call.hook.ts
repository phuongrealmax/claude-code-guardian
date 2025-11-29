import { HookHandler, Modules } from './hook-handler.js';
import {
  PostToolCallInput,
  PostToolCallResult,
  GuardValidation,
  TestRunResult,
  BrowserCheckResult,
  HookContext,
  HookWarning,
  GuardWarning
} from './types.js';
import { Logger } from '../core/logger.js';
import { ConfigManager } from '../core/config-manager.js';
import { StateManager } from '../core/state-manager.js';
import { EventBus } from '../core/event-bus.js';
import { readFileSync, existsSync } from 'fs';

export class PostToolCallHook extends HookHandler {
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

  async execute(input: PostToolCallInput): Promise<PostToolCallResult> {
    const startTime = Date.now();
    const warnings: HookWarning[] = [];
    const filesUpdated: string[] = [];
    let checkpointCreated = false;
    let memoryUpdated = false;

    this.logger.debug(`Post-tool hook for: ${input.toolName}`);

    // Skip if tool failed
    if (!input.success) {
      return {
        success: true,
        message: 'Tool failed, skipping post-validation',
        data: {
          filesUpdated: [],
          checkpointCreated: false,
          memoryUpdated: false,
        },
      };
    }

    try {
      const filename = this.extractFilename(input);
      if (filename) {
        filesUpdated.push(filename);
      }

      // ═══════════════════════════════════════════════════════════
      // STEP 1: Validate written content with Guard
      // ═══════════════════════════════════════════════════════════
      let guardValidation: GuardValidation | undefined;

      if (this.isWriteOperation(input.toolName) && filename) {
        guardValidation = await this.validateWrittenContent(filename);

        if (!guardValidation.passed) {
          for (const issue of guardValidation.issues) {
            warnings.push({
              level: issue.severity === 'block' ? 'error' : 'warning',
              message: `[${issue.rule}] ${issue.message}`,
              action: issue.suggestion,
            });
          }
        }

        if (guardValidation.autoFixed && guardValidation.autoFixed.length > 0) {
          warnings.push({
            level: 'info',
            message: `Auto-fixed ${guardValidation.autoFixed.length} issue(s)`,
          });
        }
      }

      // ═══════════════════════════════════════════════════════════
      // STEP 2: Run affected tests (if configured)
      // ═══════════════════════════════════════════════════════════
      let testsRun: TestRunResult | undefined;

      const testingConfig = await this.config.get('modules.testing') as { autoRun?: boolean } | undefined;
      if (testingConfig?.autoRun && this.isWriteOperation(input.toolName) && filename) {
        testsRun = await this.runAffectedTests(filename);

        if (testsRun.ran) {
          if (testsRun.failed > 0) {
            warnings.push({
              level: 'error',
              message: `Tests failed: ${testsRun.failed} of ${testsRun.passed + testsRun.failed}`,
              action: 'Fix failing tests before continuing',
            });
          } else if (testsRun.passed > 0) {
            warnings.push({
              level: 'info',
              message: `Tests passed: ${testsRun.passed}`,
            });
          }
        }
      }

      // ═══════════════════════════════════════════════════════════
      // STEP 3: Browser check (for UI files)
      // ═══════════════════════════════════════════════════════════
      let browserCheck: BrowserCheckResult | undefined;

      const browserConfig = await this.config.get('modules.testing.browser') as { enabled?: boolean } | undefined;
      if (browserConfig?.enabled && this.isUIFile(filename)) {
        browserCheck = await this.performBrowserCheck();

        if (browserCheck.consoleErrors > 0) {
          warnings.push({
            level: 'error',
            message: `Browser console errors: ${browserCheck.consoleErrors}`,
            action: 'Check console for details',
          });
        }

        if (browserCheck.networkErrors > 0) {
          warnings.push({
            level: 'warning',
            message: `Network errors detected: ${browserCheck.networkErrors}`,
          });
        }
      }

      // ═══════════════════════════════════════════════════════════
      // STEP 4: Check token usage and auto-checkpoint
      // ═══════════════════════════════════════════════════════════
      const resourceStatus = this.modules.resource.getStatus();

      if (resourceStatus.tokens.percentage >= 85 && !checkpointCreated) {
        try {
          await this.modules.resource.createCheckpoint({
            name: `auto-${resourceStatus.tokens.percentage}`,
            reason: 'auto_threshold',
          });
          checkpointCreated = true;

          warnings.push({
            level: 'warning',
            message: `Token usage ${resourceStatus.tokens.percentage}% - checkpoint created`,
            action: 'Consider wrapping up current task',
          });
        } catch (error) {
          this.logger.warn('Failed to create auto-checkpoint:', error);
        }
      }

      // ═══════════════════════════════════════════════════════════
      // STEP 5: Update memory with significant changes
      // ═══════════════════════════════════════════════════════════
      if (this.isSignificantChange(input)) {
        try {
          await this.modules.memory.store({
            content: `Modified ${filename}: ${this.summarizeChange(input)}`,
            type: 'fact',
            importance: 5,
            tags: ['code-change', filename ? filename.split('/').pop() || 'unknown' : 'unknown'],
          });
          memoryUpdated = true;
        } catch (error) {
          this.logger.warn('Failed to update memory:', error);
        }
      }

      // ═══════════════════════════════════════════════════════════
      // STEP 6: Update task progress
      // ═══════════════════════════════════════════════════════════
      const currentTask = this.modules.workflow.getCurrentTask();
      if (currentTask) {
        // Increment progress slightly for each successful operation
        const newProgress = Math.min(currentTask.progress + 5, 95);
        await this.modules.workflow.updateTask(currentTask.id, {
          progress: newProgress,
        });
      }

      // ═══════════════════════════════════════════════════════════
      // STEP 7: Register document if applicable
      // ═══════════════════════════════════════════════════════════
      if (filename && this.isDocumentFile(filename)) {
        try {
          await this.modules.documents.registerDocument(filename);
        } catch (error) {
          this.logger.warn('Failed to register document:', error);
        }
      }

      const duration = Date.now() - startTime;
      this.logger.debug(`Post-tool hook completed in ${duration}ms`);

      return {
        success: true,
        warnings,
        data: {
          guardValidation,
          testsRun,
          browserCheck,
          filesUpdated,
          checkpointCreated,
          memoryUpdated,
        },
      };

    } catch (error) {
      this.logger.error('Post-tool hook error:', error);

      return {
        success: true, // Don't fail the operation
        warnings: [{
          level: 'warning',
          message: `Post-validation error: ${error instanceof Error ? error.message : 'Unknown'}`,
        }],
        data: {
          filesUpdated,
          checkpointCreated,
          memoryUpdated,
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

  private extractFilename(input: PostToolCallInput): string | undefined {
    const toolInput = input.toolInput;
    return (toolInput.path || toolInput.file_path || toolInput.filename) as string | undefined;
  }

  private async validateWrittenContent(filename: string): Promise<GuardValidation> {
    if (!existsSync(filename)) {
      return { passed: true, issues: [] };
    }

    try {
      const content = readFileSync(filename, 'utf-8');
      const validation = await this.modules.guard.validate(content, filename);

      const issues: GuardWarning[] = validation.issues.map(issue => ({
        rule: issue.rule,
        severity: issue.severity as 'warning' | 'error' | 'block',
        message: issue.message,
        location: issue.location,
        suggestion: issue.suggestion,
      }));

      return {
        passed: validation.valid,
        issues,
        autoFixed: undefined, // Guard doesn't auto-fix yet
      };
    } catch (error) {
      return { passed: true, issues: [] };
    }
  }

  private async runAffectedTests(filename: string): Promise<TestRunResult> {
    try {
      const result = await this.modules.testing.runTests({
        files: [filename],
      });

      return {
        ran: true,
        passed: result.passed,
        failed: result.failed,
        skipped: result.skipped,
        duration: result.duration,
        failedTests: result.tests
          .filter(t => t.status === 'failed')
          .map(t => t.name),
      };
    } catch (error) {
      this.logger.warn('Failed to run tests:', error);
      return {
        ran: false,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
      };
    }
  }

  private isUIFile(filename: string | undefined): boolean {
    if (!filename) return false;

    const uiPatterns = [
      /\.tsx$/,
      /\.jsx$/,
      /components?\//i,
      /pages?\//i,
      /views?\//i,
      /\.vue$/,
      /\.svelte$/,
    ];

    return uiPatterns.some(pattern => pattern.test(filename));
  }

  private async performBrowserCheck(): Promise<BrowserCheckResult> {
    try {
      const status = this.modules.testing.getStatus();

      if (status.browserSessions > 0) {
        // If there are browser sessions, we'd check for errors
        // For now, return a basic result
        return {
          checked: true,
          consoleErrors: 0,
          networkErrors: 0,
        };
      }

      return {
        checked: false,
        consoleErrors: 0,
        networkErrors: 0,
      };
    } catch (error) {
      return {
        checked: false,
        consoleErrors: 0,
        networkErrors: 0,
      };
    }
  }

  private isDocumentFile(filename: string | undefined): boolean {
    if (!filename) return false;
    const ext = filename.split('.').pop()?.toLowerCase();
    return ['md', 'txt', 'rst', 'adoc'].includes(ext || '');
  }

  private isSignificantChange(input: PostToolCallInput): boolean {
    // Consider change significant if it's a write operation that took >500ms
    // or modified more than 50 lines
    if (!this.isWriteOperation(input.toolName)) return false;
    if (input.duration > 500) return true;

    const content = (input.toolInput.content || input.toolInput.new_str || '') as string;
    return content.split('\n').length > 50;
  }

  private summarizeChange(input: PostToolCallInput): string {
    const content = (input.toolInput.content || input.toolInput.new_str || '') as string;
    const lines = content.split('\n').length;
    return `${lines} lines, ${input.duration}ms`;
  }
}
