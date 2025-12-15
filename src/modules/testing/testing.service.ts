// src/modules/testing/testing.service.ts

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, readdirSync, rmSync, mkdirSync } from 'fs';
import { join, basename } from 'path';
import { randomUUID } from 'crypto';
import { TestingModuleConfig } from '../../core/types.js';
import { EventBus } from '../../core/event-bus.js';
import { Logger } from '../../core/logger.js';
import { StateManager } from '../../core/state-manager.js';
import { createTestEvidence, type TestEvidence } from '../../core/completion-gates.js';
import { BrowserService } from './browser/browser.service.js';
import {
  TestResults,
  TestResult,
  TestRunOptions,
  TestCleanupResult,
  TestingModuleStatus,
  BrowserAnalysis,
  TestingObservability,
} from './testing.types.js';

const execAsync = promisify(exec);

const MAX_FAILING_TESTS = 10;
const NETWORK_TIMEOUT_MS = 30000; // 30 seconds

export class TestingService {
  private browserService: BrowserService;
  private lastResults?: TestResults;
  private lastObservability?: TestingObservability;
  private stateManager?: StateManager;
  private currentTaskId?: string;

  constructor(
    private config: TestingModuleConfig,
    private eventBus: EventBus,
    private logger: Logger,
    private projectRoot: string = process.cwd()
  ) {
    this.browserService = new BrowserService(config.browser, logger, projectRoot);
  }

  /**
   * Set state manager for evidence persistence (deferred initialization)
   */
  setStateManager(stateManager: StateManager): void {
    this.stateManager = stateManager;
  }

  /**
   * Set current task ID for evidence tagging
   */
  setCurrentTaskId(taskId: string | undefined): void {
    this.currentTaskId = taskId;
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) return;

    await this.browserService.initialize();
    this.logger.info('Testing module initialized');
  }

  // ═══════════════════════════════════════════════════════════════
  //                      TEST RUNNING
  // ═══════════════════════════════════════════════════════════════

  async runTests(options: TestRunOptions = {}): Promise<TestResults> {
    const runId = randomUUID();

    this.eventBus.emit({
      type: 'test:start',
      timestamp: new Date(),
    });

    const command = this.buildTestCommand(options);
    const startTime = Date.now();

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.projectRoot,
        timeout: (options.timeout || 60) * 1000,
      });

      const results = this.parseTestOutput(stdout, stderr);
      results.duration = Date.now() - startTime;

      this.lastResults = results;

      // Build observability and persist evidence
      const observability = this.buildObservability(runId, results);
      this.lastObservability = observability;
      this.persistTestEvidence(runId, results, observability);

      // Emit appropriate event
      if (results.failed > 0) {
        this.emitTestFailureEvent(runId, results, observability);
      } else {
        this.eventBus.emit({
          type: 'test:complete',
          timestamp: new Date(),
          data: { results },
          source: 'TestingService',
        });
      }

      return results;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const results: TestResults = {
        passed: 0,
        failed: 1,
        skipped: 0,
        duration: Date.now() - startTime,
        tests: [{
          name: 'Test execution',
          file: '',
          status: 'failed',
          duration: 0,
          error: errorMessage,
          assertions: 0,
        }],
        summary: `Test execution failed: ${errorMessage}`,
      };

      this.lastResults = results;

      // Build observability and persist evidence for error case
      const observability = this.buildObservability(runId, results);
      this.lastObservability = observability;
      this.persistTestEvidence(runId, results, observability);
      this.emitTestFailureEvent(runId, results, observability);

      return results;
    }
  }

  async runAffectedTests(files: string[]): Promise<TestResults> {
    // Find test files that correspond to changed files
    const testFiles = this.findRelatedTestFiles(files);

    if (testFiles.length === 0) {
      return {
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        tests: [],
        summary: 'No related test files found',
      };
    }

    return this.runTests({ files: testFiles });
  }

  private buildTestCommand(options: TestRunOptions): string {
    let command = this.config.testCommand;

    if (options.files && options.files.length > 0) {
      command += ` ${options.files.join(' ')}`;
    }

    if (options.grep) {
      // Detect test runner and add appropriate flag
      if (command.includes('jest')) {
        command += ` -t "${options.grep}"`;
      } else if (command.includes('vitest') || command.includes('mocha')) {
        command += ` --grep "${options.grep}"`;
      }
    }

    if (options.coverage) {
      if (command.includes('jest') || command.includes('vitest')) {
        command += ' --coverage';
      }
    }

    return command;
  }

  private parseTestOutput(stdout: string, stderr: string): TestResults {
    const output = stdout + stderr;
    const tests: TestResult[] = [];
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    // Try to parse Jest/Vitest output
    const passMatch = output.match(/(\d+)\s+pass(?:ed|ing)?/i);
    const failMatch = output.match(/(\d+)\s+fail(?:ed|ing)?/i);
    const skipMatch = output.match(/(\d+)\s+skip(?:ped)?/i);

    if (passMatch) passed = parseInt(passMatch[1], 10);
    if (failMatch) failed = parseInt(failMatch[1], 10);
    if (skipMatch) skipped = parseInt(skipMatch[1], 10);

    // Parse individual test results
    const testLines = output.match(/(?:✓|✗|○|●)\s+(.+?)(?:\s+\((\d+)\s*ms\))?$/gm) || [];

    for (const line of testLines) {
      const isPassed = line.includes('✓') || line.includes('●');
      const isFailed = line.includes('✗');

      const nameMatch = line.match(/(?:✓|✗|○|●)\s+(.+?)(?:\s+\((\d+)\s*ms\))?$/);
      if (nameMatch) {
        tests.push({
          name: nameMatch[1].trim(),
          file: '',
          status: isPassed ? 'passed' : isFailed ? 'failed' : 'skipped',
          duration: nameMatch[2] ? parseInt(nameMatch[2], 10) : 0,
          assertions: 1,
        });
      }
    }

    // Parse coverage if present
    let coverage: TestResults['coverage'];
    const coverageMatch = output.match(/All files.*?\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)/);
    if (coverageMatch) {
      coverage = {
        statements: parseFloat(coverageMatch[1]),
        branches: parseFloat(coverageMatch[2]),
        functions: parseFloat(coverageMatch[3]),
        lines: parseFloat(coverageMatch[4]),
      };
    }

    const summary = `${passed} passed, ${failed} failed, ${skipped} skipped`;

    return {
      passed,
      failed,
      skipped,
      duration: 0,
      tests,
      coverage,
      summary,
    };
  }

  private findRelatedTestFiles(files: string[]): string[] {
    const testFiles: string[] = [];

    for (const file of files) {
      const baseName = basename(file).replace(/\.(ts|tsx|js|jsx)$/, '');

      // Common test file patterns
      const patterns = [
        `${baseName}.test.ts`,
        `${baseName}.test.tsx`,
        `${baseName}.test.js`,
        `${baseName}.spec.ts`,
        `${baseName}.spec.tsx`,
        `${baseName}.spec.js`,
        `__tests__/${baseName}.ts`,
        `__tests__/${baseName}.tsx`,
      ];

      // Check if any test files exist
      for (const pattern of patterns) {
        const testPath = join(this.projectRoot, pattern);
        if (existsSync(testPath)) {
          testFiles.push(pattern);
        }
      }
    }

    return [...new Set(testFiles)];
  }

  // ═══════════════════════════════════════════════════════════════
  //                      BROWSER TESTING
  // ═══════════════════════════════════════════════════════════════

  async openBrowser(url: string): Promise<string> {
    return this.browserService.openPage(url);
  }

  async takeScreenshot(sessionId: string, options?: {
    selector?: string;
    fullPage?: boolean;
  }): Promise<string> {
    return this.browserService.takeScreenshot(sessionId, options);
  }

  async getConsoleLogs(sessionId: string) {
    return this.browserService.getConsoleLogs(sessionId);
  }

  async getNetworkRequests(sessionId: string) {
    return this.browserService.getNetworkRequests(sessionId);
  }

  async getBrowserErrors(sessionId: string) {
    return this.browserService.getErrors(sessionId);
  }

  getBrowserAnalysis(sessionId: string): BrowserAnalysis {
    return this.browserService.getAnalysis(sessionId);
  }

  async closeBrowser(sessionId: string): Promise<void> {
    return this.browserService.closePage(sessionId);
  }

  async closeAllBrowsers(): Promise<void> {
    return this.browserService.closeAll();
  }

  // ═══════════════════════════════════════════════════════════════
  //                      TEST CLEANUP
  // ═══════════════════════════════════════════════════════════════

  async cleanup(): Promise<TestCleanupResult> {
    if (!this.config.cleanup.autoCleanTestData) {
      return { filesRemoved: 0, dataCleared: 0, locations: [] };
    }

    let filesRemoved = 0;
    const dataCleared = 0;
    const cleanedLocations: string[] = [];

    const prefix = this.config.cleanup.testDataPrefix;
    const locations = this.config.cleanup.testDataLocations;

    for (const location of locations) {
      const fullPath = join(this.projectRoot, location);

      if (!existsSync(fullPath)) continue;

      try {
        const files = readdirSync(fullPath);

        for (const file of files) {
          if (file.startsWith(prefix) || file.includes('test') || file.includes('mock')) {
            const filePath = join(fullPath, file);
            try {
              rmSync(filePath, { recursive: true, force: true });
              filesRemoved++;
            } catch {
              this.logger.warn(`Failed to remove: ${filePath}`);
            }
          }
        }

        cleanedLocations.push(location);
      } catch {
        this.logger.warn(`Failed to clean location: ${location}`);
      }
    }

    this.logger.info(`Test cleanup: ${filesRemoved} files removed from ${cleanedLocations.length} locations`);

    return {
      filesRemoved,
      dataCleared,
      locations: cleanedLocations,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //                      STATUS
  // ═══════════════════════════════════════════════════════════════

  getStatus(): TestingModuleStatus {
    return {
      enabled: this.config.enabled,
      lastResults: this.lastResults,
      browserSessions: this.browserService.getActiveSessions().length,
    };
  }

  getLastResults(): TestResults | undefined {
    return this.lastResults;
  }

  getLastObservability(): TestingObservability | undefined {
    return this.lastObservability;
  }

  // ═══════════════════════════════════════════════════════════════
  //                      OBSERVABILITY & EVIDENCE
  // ═══════════════════════════════════════════════════════════════

  /**
   * Build prioritized observability output from test results.
   * Priority: 1. Console 2. Network 3. Trace 4. Screenshot
   */
  private buildObservability(runId: string, results: TestResults): TestingObservability {
    // Get browser session data if available (for frontend tests)
    const activeSessions = this.browserService.getActiveSessions();
    let consoleErrors: Array<{ message: string; source?: string; timestamp: string }> = [];
    let consoleWarnings: Array<{ message: string; source?: string; timestamp: string }> = [];
    let networkFailures: Array<{ url: string; method: string; status: number; error?: string; timestamp: string }> = [];
    let networkTimeouts: Array<{ url: string; method: string; duration: number }> = [];
    let healthScore = 100;

    // Aggregate from all active browser sessions
    for (const sessionId of activeSessions) {
      const session = this.browserService.getSession(sessionId);
      if (!session) continue;

      // Console errors (priority 1)
      for (const log of session.consoleLogs) {
        if (log.type === 'error') {
          consoleErrors.push({
            message: log.message.substring(0, 500), // cap message length
            source: log.source,
            timestamp: log.timestamp.toISOString(),
          });
          healthScore -= 10;
        } else if (log.type === 'warn') {
          consoleWarnings.push({
            message: log.message.substring(0, 500),
            source: log.source,
            timestamp: log.timestamp.toISOString(),
          });
          healthScore -= 2;
        }
      }

      // Network failures (priority 2)
      for (const req of session.networkRequests) {
        if (req.status >= 400 || req.error) {
          networkFailures.push({
            url: req.url.substring(0, 200),
            method: req.method,
            status: req.status,
            error: req.error,
            timestamp: req.timestamp.toISOString(),
          });
          healthScore -= 5;
        }
        if (req.duration > NETWORK_TIMEOUT_MS) {
          networkTimeouts.push({
            url: req.url.substring(0, 200),
            method: req.method,
            duration: req.duration,
          });
          healthScore -= 3;
        }
      }

      // Page errors are critical
      healthScore -= session.errors.length * 15;
    }

    // Cap arrays to prevent bloat
    consoleErrors = consoleErrors.slice(0, MAX_FAILING_TESTS);
    consoleWarnings = consoleWarnings.slice(0, MAX_FAILING_TESTS);
    networkFailures = networkFailures.slice(0, MAX_FAILING_TESTS);
    networkTimeouts = networkTimeouts.slice(0, MAX_FAILING_TESTS);

    // Determine status
    const status: TestingObservability['status'] =
      results.failed > 0 ? 'failed' :
      results.skipped > 0 && results.passed === 0 ? 'skipped' : 'passed';

    // Reduce health score based on test failures
    healthScore -= results.failed * 10;
    healthScore = Math.max(0, Math.min(100, healthScore));

    // Extract failing test names
    const failingTests = results.tests
      .filter(t => t.status === 'failed')
      .map(t => t.name)
      .slice(0, MAX_FAILING_TESTS);

    // Build summary (prioritized: console > network > tests)
    const summaryParts: string[] = [];
    if (consoleErrors.length > 0) {
      summaryParts.push(`${consoleErrors.length} console error(s)`);
    }
    if (networkFailures.length > 0) {
      summaryParts.push(`${networkFailures.length} network failure(s)`);
    }
    if (results.failed > 0) {
      summaryParts.push(`${results.failed} test(s) failed`);
    }
    const summary = summaryParts.length > 0
      ? summaryParts.join(', ')
      : `${results.passed} test(s) passed`;

    return {
      runId,
      timestamp: new Date().toISOString(),
      status,
      console: {
        errors: consoleErrors,
        warnings: consoleWarnings,
        errorCount: consoleErrors.length,
        warningCount: consoleWarnings.length,
      },
      network: {
        failures: networkFailures,
        timeouts: networkTimeouts,
        failureCount: networkFailures.length,
        timeoutCount: networkTimeouts.length,
      },
      // Trace is optional - would come from Playwright trace if configured
      trace: undefined,
      // Screenshot is secondary - not captured by default in observability
      screenshot: undefined,
      summary,
      failingTests,
      healthScore,
    };
  }

  /**
   * Persist test evidence to StateManager for gate evaluation
   */
  private persistTestEvidence(
    runId: string,
    results: TestResults,
    observability: TestingObservability
  ): void {
    if (!this.stateManager) {
      this.logger.debug('StateManager not set, skipping evidence persistence');
      return;
    }

    const status: 'passed' | 'failed' | 'skipped' =
      results.failed > 0 ? 'failed' :
      results.skipped > 0 && results.passed === 0 ? 'skipped' : 'passed';

    const evidence = createTestEvidence(status, runId, {
      failingTests: observability.failingTests,
      consoleErrorsCount: observability.console.errorCount,
      networkFailuresCount: observability.network.failureCount,
      taskId: this.currentTaskId,
    });

    this.stateManager.setTestEvidence(evidence);
    this.logger.debug('Test evidence persisted', { runId, status, taskId: this.currentTaskId });
  }

  /**
   * Emit timeline event for test failure (metadata-only payload)
   */
  private emitTestFailureEvent(
    runId: string,
    results: TestResults,
    observability: TestingObservability
  ): void {
    // Emit test:fail event with results (existing behavior)
    this.eventBus.emit({
      type: 'test:fail',
      timestamp: new Date(),
      data: { results },
      source: 'TestingService',
    });

    // Emit testing:failure timeline event (metadata-only for StateManager)
    this.eventBus.emit({
      type: 'testing:failure',
      timestamp: new Date(),
      source: 'TestingService',
      data: {
        // Metadata only - no large payloads
        runId,
        failedCount: results.failed,
        consoleErrorCount: observability.console.errorCount,
        networkFailureCount: observability.network.failureCount,
        healthScore: observability.healthScore,
        taskId: this.currentTaskId,
      },
    });
  }
}
