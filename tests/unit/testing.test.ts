// tests/unit/testing.test.ts

import { vi } from 'vitest';
import { TestingService } from '../../src/modules/testing/testing.service.js';
import { EventBus } from '../../src/core/event-bus.js';
import { Logger } from '../../src/core/logger.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Mock EventBus and Logger
const mockEventBus = new EventBus();
const mockLogger = new Logger('silent');

// Create minimal test config
const createTestConfig = (overrides = {}) => ({
  enabled: true,
  testCommand: 'npm test',
  testDirectory: 'tests',
  browser: {
    enabled: false,
    launchOptions: {},
    defaultTimeout: 5000,
  },
  cleanup: {
    autoCleanTestData: true,
    testDataPrefix: 'test_',
    testDataLocations: ['tmp', 'temp'],
  },
  ...overrides,
});

describe('TestingService', () => {
  let service: TestingService;
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `test-testing-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testDir, { recursive: true });
    service = new TestingService(createTestConfig(), mockEventBus, mockLogger, testDir);
  });

  afterEach(() => {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // ═══════════════════════════════════════════════════════════════
  //                      INITIALIZATION
  // ═══════════════════════════════════════════════════════════════

  describe('initialization', () => {
    it('should initialize service', async () => {
      await service.initialize();
      expect(service).toBeDefined();
    });

    it('should skip initialization when disabled', async () => {
      const disabledService = new TestingService(
        createTestConfig({ enabled: false }),
        mockEventBus,
        mockLogger,
        testDir
      );
      await disabledService.initialize();
      expect(disabledService.getStatus().enabled).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      BUILD TEST COMMAND
  // ═══════════════════════════════════════════════════════════════

  describe('buildTestCommand', () => {
    it('should build basic test command', () => {
      // Access private method via any cast
      const cmd = (service as any).buildTestCommand({});
      expect(cmd).toBe('npm test');
    });

    it('should add files to command', () => {
      const cmd = (service as any).buildTestCommand({
        files: ['test1.ts', 'test2.ts'],
      });
      expect(cmd).toBe('npm test test1.ts test2.ts');
    });

    it('should add grep for jest', () => {
      const jestService = new TestingService(
        createTestConfig({ testCommand: 'jest' }),
        mockEventBus,
        mockLogger,
        testDir
      );
      const cmd = (jestService as any).buildTestCommand({
        grep: 'should pass',
      });
      expect(cmd).toContain('-t "should pass"');
    });

    it('should add grep for vitest', () => {
      const vitestService = new TestingService(
        createTestConfig({ testCommand: 'vitest' }),
        mockEventBus,
        mockLogger,
        testDir
      );
      const cmd = (vitestService as any).buildTestCommand({
        grep: 'should pass',
      });
      expect(cmd).toContain('--grep "should pass"');
    });

    it('should add grep for mocha', () => {
      const mochaService = new TestingService(
        createTestConfig({ testCommand: 'mocha' }),
        mockEventBus,
        mockLogger,
        testDir
      );
      const cmd = (mochaService as any).buildTestCommand({
        grep: 'should pass',
      });
      expect(cmd).toContain('--grep "should pass"');
    });

    it('should add coverage flag for jest', () => {
      const jestService = new TestingService(
        createTestConfig({ testCommand: 'jest' }),
        mockEventBus,
        mockLogger,
        testDir
      );
      const cmd = (jestService as any).buildTestCommand({
        coverage: true,
      });
      expect(cmd).toContain('--coverage');
    });

    it('should add coverage flag for vitest', () => {
      const vitestService = new TestingService(
        createTestConfig({ testCommand: 'vitest' }),
        mockEventBus,
        mockLogger,
        testDir
      );
      const cmd = (vitestService as any).buildTestCommand({
        coverage: true,
      });
      expect(cmd).toContain('--coverage');
    });

    it('should combine multiple options', () => {
      const cmd = (service as any).buildTestCommand({
        files: ['test.ts'],
        coverage: true,
      });
      expect(cmd).toContain('test.ts');
      // npm test doesn't support --coverage directly
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      PARSE TEST OUTPUT
  // ═══════════════════════════════════════════════════════════════

  describe('parseTestOutput', () => {
    it('should parse passed tests count', () => {
      // Regex expects "N pass" or "N passed" without "tests" in between
      const output = '10 passed';
      const result = (service as any).parseTestOutput(output, '');

      expect(result.passed).toBe(10);
    });

    it('should parse failed tests count', () => {
      const output = '3 failed';
      const result = (service as any).parseTestOutput(output, '');

      expect(result.failed).toBe(3);
    });

    it('should parse skipped tests count', () => {
      const output = '2 skipped';
      const result = (service as any).parseTestOutput(output, '');

      expect(result.skipped).toBe(2);
    });

    it('should parse vitest style output', () => {
      const output = '15 passing\n2 failing\n1 skipped';
      const result = (service as any).parseTestOutput(output, '');

      expect(result.passed).toBe(15);
      expect(result.failed).toBe(2);
      expect(result.skipped).toBe(1);
    });

    it('should parse individual test lines', () => {
      const output = `
        ✓ should pass test (10 ms)
        ✗ should fail test (5 ms)
        ○ should skip test
      `;
      const result = (service as any).parseTestOutput(output, '');

      expect(result.tests.length).toBeGreaterThan(0);
    });

    it('should parse coverage from output', () => {
      const output = `
        All files      |   85.5 |    72.3 |   90.1 |   85.5
      `;
      const result = (service as any).parseTestOutput(output, '');

      expect(result.coverage).toBeDefined();
      expect(result.coverage.statements).toBe(85.5);
      expect(result.coverage.branches).toBe(72.3);
      expect(result.coverage.functions).toBe(90.1);
      expect(result.coverage.lines).toBe(85.5);
    });

    it('should handle output without coverage', () => {
      const output = '5 tests passed';
      const result = (service as any).parseTestOutput(output, '');

      expect(result.coverage).toBeUndefined();
    });

    it('should generate summary', () => {
      const output = '10 passed\n2 failed\n1 skipped';
      const result = (service as any).parseTestOutput(output, '');

      expect(result.summary).toContain('10 passed');
      expect(result.summary).toContain('2 failed');
      expect(result.summary).toContain('1 skipped');
    });

    it('should combine stdout and stderr', () => {
      const stdout = '5 passed';
      const stderr = '1 failed';
      const result = (service as any).parseTestOutput(stdout, stderr);

      expect(result.passed).toBe(5);
      expect(result.failed).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      FIND RELATED TEST FILES
  // ═══════════════════════════════════════════════════════════════

  describe('findRelatedTestFiles', () => {
    it('should return empty array for no matches', () => {
      const result = (service as any).findRelatedTestFiles(['src/unknown.ts']);

      expect(result).toEqual([]);
    });

    it('should find .test.ts files', () => {
      // Create a test file
      fs.writeFileSync(path.join(testDir, 'utils.test.ts'), '');

      const result = (service as any).findRelatedTestFiles(['src/utils.ts']);

      expect(result).toContain('utils.test.ts');
    });

    it('should find .spec.ts files', () => {
      fs.writeFileSync(path.join(testDir, 'helper.spec.ts'), '');

      const result = (service as any).findRelatedTestFiles(['src/helper.ts']);

      expect(result).toContain('helper.spec.ts');
    });

    it('should find __tests__ files', () => {
      fs.mkdirSync(path.join(testDir, '__tests__'), { recursive: true });
      fs.writeFileSync(path.join(testDir, '__tests__', 'component.ts'), '');

      const result = (service as any).findRelatedTestFiles(['src/component.tsx']);

      expect(result).toContain('__tests__/component.ts');
    });

    it('should deduplicate results', () => {
      fs.writeFileSync(path.join(testDir, 'utils.test.ts'), '');

      const result = (service as any).findRelatedTestFiles([
        'src/utils.ts',
        'src/utils.tsx',
      ]);

      // Should only have one entry
      expect(result.filter((f: string) => f === 'utils.test.ts').length).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      RUN AFFECTED TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('runAffectedTests', () => {
    it('should return empty results when no related tests found', async () => {
      const result = await service.runAffectedTests(['src/unknown.ts']);

      expect(result.passed).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.tests).toEqual([]);
      expect(result.summary).toContain('No related test files found');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      CLEANUP
  // ═══════════════════════════════════════════════════════════════

  describe('cleanup', () => {
    it('should skip cleanup when autoCleanTestData is false', async () => {
      const noCleanService = new TestingService(
        createTestConfig({
          cleanup: {
            autoCleanTestData: false,
            testDataPrefix: 'test_',
            testDataLocations: [],
          },
        }),
        mockEventBus,
        mockLogger,
        testDir
      );

      const result = await noCleanService.cleanup();

      expect(result.filesRemoved).toBe(0);
      expect(result.locations).toEqual([]);
    });

    it('should clean test data files', async () => {
      // Create temp directory with test files
      const tmpDir = path.join(testDir, 'tmp');
      fs.mkdirSync(tmpDir, { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'test_data.json'), '{}');
      fs.writeFileSync(path.join(tmpDir, 'mock_data.json'), '{}');
      fs.writeFileSync(path.join(tmpDir, 'real_data.json'), '{}');

      const result = await service.cleanup();

      // Should have removed test_ and mock files
      expect(result.filesRemoved).toBeGreaterThanOrEqual(2);
      expect(result.locations).toContain('tmp');
    });

    it('should handle missing directories gracefully', async () => {
      const result = await service.cleanup();

      // Should not throw, even if directories don't exist
      expect(result.filesRemoved).toBeGreaterThanOrEqual(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      STATUS
  // ═══════════════════════════════════════════════════════════════

  describe('getStatus', () => {
    it('should return enabled status', () => {
      const status = service.getStatus();

      expect(status.enabled).toBe(true);
    });

    it('should return undefined lastResults initially', () => {
      const status = service.getStatus();

      expect(status.lastResults).toBeUndefined();
    });

    it('should return browser session count', () => {
      const status = service.getStatus();

      expect(status.browserSessions).toBe(0);
    });
  });

  describe('getLastResults', () => {
    it('should return undefined initially', () => {
      const results = service.getLastResults();

      expect(results).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      BROWSER DELEGATION
  // ═══════════════════════════════════════════════════════════════

  describe('browser methods', () => {
    it('should expose getBrowserAnalysis', () => {
      expect(typeof service.getBrowserAnalysis).toBe('function');
    });

    it('should expose closeBrowser', () => {
      expect(typeof service.closeBrowser).toBe('function');
    });

    it('should expose closeAllBrowsers', () => {
      expect(typeof service.closeAllBrowsers).toBe('function');
    });

    it('should expose openBrowser', () => {
      expect(typeof service.openBrowser).toBe('function');
    });

    it('should expose takeScreenshot', () => {
      expect(typeof service.takeScreenshot).toBe('function');
    });

    it('should expose getConsoleLogs', () => {
      expect(typeof service.getConsoleLogs).toBe('function');
    });

    it('should expose getNetworkRequests', () => {
      expect(typeof service.getNetworkRequests).toBe('function');
    });

    it('should expose getBrowserErrors', () => {
      expect(typeof service.getBrowserErrors).toBe('function');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      OBSERVABILITY (Task 5.3)
  // ═══════════════════════════════════════════════════════════════

  describe('observability', () => {
    describe('buildObservability', () => {
      it('should build observability with passed status when no failures', () => {
        const results = {
          passed: 5,
          failed: 0,
          skipped: 0,
          duration: 1000,
          tests: [],
          summary: '5 passed',
        };

        const observability = (service as any).buildObservability('run-123', results);

        expect(observability.status).toBe('passed');
        expect(observability.runId).toBe('run-123');
        expect(observability.healthScore).toBe(100);
        expect(observability.failingTests).toEqual([]);
        expect(observability.summary).toContain('5 test(s) passed');
      });

      it('should build observability with failed status when tests fail', () => {
        const results = {
          passed: 3,
          failed: 2,
          skipped: 0,
          duration: 1000,
          tests: [
            { name: 'test 1', file: 'test.ts', status: 'failed', duration: 100, assertions: 1 },
            { name: 'test 2', file: 'test.ts', status: 'failed', duration: 100, assertions: 1 },
          ],
          summary: '3 passed, 2 failed',
        };

        const observability = (service as any).buildObservability('run-456', results);

        expect(observability.status).toBe('failed');
        expect(observability.healthScore).toBeLessThan(100);
        expect(observability.failingTests).toHaveLength(2);
        expect(observability.failingTests).toContain('test 1');
        expect(observability.failingTests).toContain('test 2');
        expect(observability.summary).toContain('2 test(s) failed');
      });

      it('should build observability with skipped status when all skipped', () => {
        const results = {
          passed: 0,
          failed: 0,
          skipped: 3,
          duration: 100,
          tests: [],
          summary: '3 skipped',
        };

        const observability = (service as any).buildObservability('run-789', results);

        expect(observability.status).toBe('skipped');
      });

      it('should cap failing tests at 10', () => {
        const tests = Array.from({ length: 15 }, (_, i) => ({
          name: `test ${i + 1}`,
          file: 'test.ts',
          status: 'failed' as const,
          duration: 100,
          assertions: 1,
        }));

        const results = {
          passed: 0,
          failed: 15,
          skipped: 0,
          duration: 1000,
          tests,
          summary: '15 failed',
        };

        const observability = (service as any).buildObservability('run-cap', results);

        expect(observability.failingTests.length).toBe(10);
      });

      it('should include console and network in observability structure', () => {
        const results = {
          passed: 1,
          failed: 0,
          skipped: 0,
          duration: 100,
          tests: [],
          summary: '1 passed',
        };

        const observability = (service as any).buildObservability('run-struct', results);

        // Verify structure
        expect(observability.console).toBeDefined();
        expect(observability.console.errors).toBeInstanceOf(Array);
        expect(observability.console.warnings).toBeInstanceOf(Array);
        expect(observability.console.errorCount).toBe(0);
        expect(observability.console.warningCount).toBe(0);

        expect(observability.network).toBeDefined();
        expect(observability.network.failures).toBeInstanceOf(Array);
        expect(observability.network.timeouts).toBeInstanceOf(Array);
        expect(observability.network.failureCount).toBe(0);
        expect(observability.network.timeoutCount).toBe(0);
      });

      it('should have ISO timestamp', () => {
        const results = {
          passed: 1,
          failed: 0,
          skipped: 0,
          duration: 100,
          tests: [],
          summary: '1 passed',
        };

        const observability = (service as any).buildObservability('run-ts', results);

        expect(observability.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      });

      it('should reduce health score based on test failures', () => {
        const results = {
          passed: 0,
          failed: 5,
          skipped: 0,
          duration: 1000,
          tests: [],
          summary: '5 failed',
        };

        const observability = (service as any).buildObservability('run-health', results);

        // 100 - (5 * 10) = 50
        expect(observability.healthScore).toBe(50);
      });
    });

    describe('StateManager integration', () => {
      it('should set state manager', () => {
        const mockStateManager = {
          setTestEvidence: vi.fn(),
        };

        service.setStateManager(mockStateManager as any);

        // Service should have stateManager set (verify via internal state or behavior)
        expect((service as any).stateManager).toBe(mockStateManager);
      });

      it('should set current task ID', () => {
        service.setCurrentTaskId('task-123');

        expect((service as any).currentTaskId).toBe('task-123');
      });

      it('should clear current task ID when undefined', () => {
        service.setCurrentTaskId('task-123');
        service.setCurrentTaskId(undefined);

        expect((service as any).currentTaskId).toBeUndefined();
      });
    });

    describe('evidence persistence', () => {
      it('should skip persistence when stateManager not set', () => {
        const results = {
          passed: 1,
          failed: 0,
          skipped: 0,
          duration: 100,
          tests: [],
          summary: '1 passed',
        };
        const observability = (service as any).buildObservability('run-no-sm', results);

        // Should not throw when stateManager is not set
        expect(() => {
          (service as any).persistTestEvidence('run-no-sm', results, observability);
        }).not.toThrow();
      });

      it('should persist evidence to stateManager when set', () => {
        const mockStateManager = {
          setTestEvidence: vi.fn(),
        };
        service.setStateManager(mockStateManager as any);

        const results = {
          passed: 5,
          failed: 0,
          skipped: 0,
          duration: 100,
          tests: [],
          summary: '5 passed',
        };
        const observability = (service as any).buildObservability('run-persist', results);

        (service as any).persistTestEvidence('run-persist', results, observability);

        expect(mockStateManager.setTestEvidence).toHaveBeenCalledTimes(1);
        const evidence = mockStateManager.setTestEvidence.mock.calls[0][0];
        expect(evidence.status).toBe('passed');
        expect(evidence.runId).toBe('run-persist');
      });

      it('should include taskId in evidence when set', () => {
        const mockStateManager = {
          setTestEvidence: vi.fn(),
        };
        service.setStateManager(mockStateManager as any);
        service.setCurrentTaskId('task-abc');

        const results = {
          passed: 1,
          failed: 0,
          skipped: 0,
          duration: 100,
          tests: [],
          summary: '1 passed',
        };
        const observability = (service as any).buildObservability('run-task', results);

        (service as any).persistTestEvidence('run-task', results, observability);

        const evidence = mockStateManager.setTestEvidence.mock.calls[0][0];
        expect(evidence.taskId).toBe('task-abc');
      });

      it('should include console/network counts in evidence', () => {
        const mockStateManager = {
          setTestEvidence: vi.fn(),
        };
        service.setStateManager(mockStateManager as any);

        const results = {
          passed: 1,
          failed: 0,
          skipped: 0,
          duration: 100,
          tests: [],
          summary: '1 passed',
        };
        // Manually create observability with counts
        const observability = {
          runId: 'run-counts',
          timestamp: new Date().toISOString(),
          status: 'passed' as const,
          console: { errors: [], warnings: [], errorCount: 3, warningCount: 2 },
          network: { failures: [], timeouts: [], failureCount: 1, timeoutCount: 0 },
          summary: '1 passed',
          failingTests: [],
          healthScore: 80,
        };

        (service as any).persistTestEvidence('run-counts', results, observability);

        const evidence = mockStateManager.setTestEvidence.mock.calls[0][0];
        expect(evidence.consoleErrorsCount).toBe(3);
        expect(evidence.networkFailuresCount).toBe(1);
      });
    });

    describe('testing:failure event', () => {
      it('should emit testing:failure event on test failure', () => {
        const emittedEvents: any[] = [];
        mockEventBus.on('testing:failure', (event) => {
          emittedEvents.push(event);
        });

        const results = {
          passed: 0,
          failed: 2,
          skipped: 0,
          duration: 100,
          tests: [
            { name: 'fail1', file: 'test.ts', status: 'failed' as const, duration: 50, assertions: 1 },
          ],
          summary: '2 failed',
        };
        const observability = (service as any).buildObservability('run-event', results);

        (service as any).emitTestFailureEvent('run-event', results, observability);

        // Should have emitted testing:failure
        const failureEvent = emittedEvents.find(e => e.type === 'testing:failure');
        expect(failureEvent).toBeDefined();
        expect(failureEvent.data.runId).toBe('run-event');
        expect(failureEvent.data.failedCount).toBe(2);
        expect(failureEvent.data.healthScore).toBeDefined();
      });

      it('should include metadata-only payload (no large data)', () => {
        const emittedEvents: any[] = [];
        mockEventBus.on('testing:failure', (event) => {
          emittedEvents.push(event);
        });

        const results = {
          passed: 0,
          failed: 1,
          skipped: 0,
          duration: 100,
          tests: [],
          summary: '1 failed',
        };
        const observability = (service as any).buildObservability('run-meta', results);

        (service as any).emitTestFailureEvent('run-meta', results, observability);

        const failureEvent = emittedEvents.find(e => e.type === 'testing:failure');
        expect(failureEvent.data).toBeDefined();
        // Should have metadata fields
        expect(failureEvent.data.runId).toBeDefined();
        expect(failureEvent.data.failedCount).toBeDefined();
        expect(failureEvent.data.consoleErrorCount).toBeDefined();
        expect(failureEvent.data.networkFailureCount).toBeDefined();
        expect(failureEvent.data.healthScore).toBeDefined();
        // Should NOT have large arrays
        expect(failureEvent.data.tests).toBeUndefined();
        expect(failureEvent.data.consoleErrors).toBeUndefined();
        expect(failureEvent.data.networkFailures).toBeUndefined();
      });

      it('should include taskId in event when set', () => {
        const emittedEvents: any[] = [];
        mockEventBus.on('testing:failure', (event) => {
          emittedEvents.push(event);
        });

        service.setCurrentTaskId('task-event');

        const results = {
          passed: 0,
          failed: 1,
          skipped: 0,
          duration: 100,
          tests: [],
          summary: '1 failed',
        };
        const observability = (service as any).buildObservability('run-task-event', results);

        (service as any).emitTestFailureEvent('run-task-event', results, observability);

        const failureEvent = emittedEvents.find(e => e.type === 'testing:failure');
        expect(failureEvent.data.taskId).toBe('task-event');
      });

      it('should also emit test:fail event for backwards compatibility', () => {
        const emittedEvents: any[] = [];
        mockEventBus.on('test:fail', (event) => {
          emittedEvents.push(event);
        });

        const results = {
          passed: 0,
          failed: 1,
          skipped: 0,
          duration: 100,
          tests: [],
          summary: '1 failed',
        };
        const observability = (service as any).buildObservability('run-compat', results);

        (service as any).emitTestFailureEvent('run-compat', results, observability);

        // Should have emitted test:fail
        const failEvent = emittedEvents.find(e => e.type === 'test:fail');
        expect(failEvent).toBeDefined();
        expect(failEvent.data.results).toBeDefined();
      });
    });

    describe('getLastObservability', () => {
      it('should return undefined initially', () => {
        expect(service.getLastObservability()).toBeUndefined();
      });
    });
  });
});
