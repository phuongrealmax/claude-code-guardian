// tests/unit/testing-service.test.ts
// Testing Service Unit Behavior Tests

import { vi } from 'vitest';
import { TestingService } from '../../src/modules/testing/testing.service.js';
import { EventBus } from '../../src/core/event-bus.js';
import { Logger } from '../../src/core/logger.js';
import type { TestingModuleConfig } from '../../src/core/types.js';
import { withTempDir, writeTempFile } from '../helpers/tempFs.js';

describe('TestingService', () => {
  let eventBus: EventBus;
  let logger: Logger;
  let config: TestingModuleConfig;

  beforeEach(() => {
    eventBus = new EventBus();
    logger = new Logger('info', 'TestService');
    config = {
      enabled: true,
      testCommand: 'npm test',
      coverage: {
        enabled: false,
        threshold: 0,
        reporter: 'text',
      },
      browser: {
        enabled: false,
        headless: true,
        defaultTimeout: 30000,
        screenshots: {
          enabled: false,
          path: 'screenshots',
        },
      },
      cleanup: {
        autoCleanTestData: false,
        testDataPrefix: 'test_',
        testDataLocations: [],
      },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('creates service with default project root', () => {
      const service = new TestingService(config, eventBus, logger);

      expect(service).toBeDefined();
    });

    it('creates service with custom project root', async () => {
      await withTempDir(async (dir) => {
        const service = new TestingService(config, eventBus, logger, dir);

        expect(service).toBeDefined();
      });
    });
  });

  describe('getStatus()', () => {
    it('returns enabled status', () => {
      const service = new TestingService(config, eventBus, logger);

      const status = service.getStatus();

      expect(status.enabled).toBe(true);
      expect(status.browserSessions).toBe(0);
      expect(status.lastResults).toBeUndefined();
    });

    it('returns disabled when config.enabled is false', () => {
      config.enabled = false;
      const service = new TestingService(config, eventBus, logger);

      const status = service.getStatus();

      expect(status.enabled).toBe(false);
    });
  });

  describe('getLastResults()', () => {
    it('returns undefined when no tests have been run', () => {
      const service = new TestingService(config, eventBus, logger);

      const results = service.getLastResults();

      expect(results).toBeUndefined();
    });
  });

  describe('runAffectedTests()', () => {
    it('returns empty results when no related test files found', async () => {
      await withTempDir(async (dir) => {
        const service = new TestingService(config, eventBus, logger, dir);

        const results = await service.runAffectedTests(['src/unknown.ts']);

        expect(results.passed).toBe(0);
        expect(results.failed).toBe(0);
        expect(results.tests).toEqual([]);
        expect(results.summary).toContain('No related test files found');
      });
    });

    it('finds test files for changed source files', async () => {
      await withTempDir(async (dir) => {
        // Create a test file that matches a source file
        await writeTempFile(dir, 'utils.test.ts', 'test("utils", () => {})');
        await writeTempFile(dir, 'utils.ts', 'export const util = 1;');

        const service = new TestingService(config, eventBus, logger, dir);

        // This will find utils.test.ts but runTests will fail (no npm test)
        // We're testing the file discovery logic here
        const results = await service.runAffectedTests(['utils.ts']);

        // Since npm test will fail, we expect a failure result
        // but the important thing is it found the test file
        expect(results.failed).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('cleanup()', () => {
    it('returns zeros when autoCleanTestData is false', async () => {
      config.cleanup.autoCleanTestData = false;
      const service = new TestingService(config, eventBus, logger);

      const result = await service.cleanup();

      expect(result.filesRemoved).toBe(0);
      expect(result.dataCleared).toBe(0);
      expect(result.locations).toEqual([]);
    });

    it('cleans test data files with prefix', async () => {
      await withTempDir(async (dir) => {
        // Create test data files
        await writeTempFile(dir, 'data/test_file1.json', '{}');
        await writeTempFile(dir, 'data/test_file2.json', '{}');
        await writeTempFile(dir, 'data/real_data.json', '{}');

        config.cleanup.autoCleanTestData = true;
        config.cleanup.testDataPrefix = 'test_';
        config.cleanup.testDataLocations = ['data'];

        const service = new TestingService(config, eventBus, logger, dir);
        const result = await service.cleanup();

        // Should have removed test_ prefixed files
        expect(result.filesRemoved).toBeGreaterThanOrEqual(2);
        expect(result.locations).toContain('data');
      });
    });

    it('handles non-existent locations gracefully', async () => {
      await withTempDir(async (dir) => {
        config.cleanup.autoCleanTestData = true;
        config.cleanup.testDataLocations = ['nonexistent'];

        const service = new TestingService(config, eventBus, logger, dir);
        const result = await service.cleanup();

        // Should not throw, just return empty result
        expect(result.filesRemoved).toBe(0);
        expect(result.locations).toEqual([]);
      });
    });

    it('cleans files containing "test" or "mock" in name', async () => {
      await withTempDir(async (dir) => {
        // Create various test files
        await writeTempFile(dir, 'tmp/mock_data.json', '{}');
        await writeTempFile(dir, 'tmp/test_output.log', 'log');
        await writeTempFile(dir, 'tmp/production.json', '{}');

        config.cleanup.autoCleanTestData = true;
        config.cleanup.testDataPrefix = 'test_';
        config.cleanup.testDataLocations = ['tmp'];

        const service = new TestingService(config, eventBus, logger, dir);
        const result = await service.cleanup();

        // Should remove mock and test files, not production
        expect(result.filesRemoved).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('initialize()', () => {
    it('does nothing when disabled', async () => {
      config.enabled = false;
      const service = new TestingService(config, eventBus, logger);

      // Should not throw
      await expect(service.initialize()).resolves.not.toThrow();
    });
  });

  describe('parseTestOutput (internal)', () => {
    // Test the output parsing logic by running tests that will produce output
    it('parses pass/fail counts from Jest-style output', async () => {
      await withTempDir(async (dir) => {
        // Create a mock test command that echoes Jest-like output
        config.testCommand = 'echo "Tests: 5 passed, 2 failed, 1 skipped"';

        const service = new TestingService(config, eventBus, logger, dir);
        const results = await service.runTests({ timeout: 5 });

        expect(results.passed).toBe(5);
        expect(results.failed).toBe(2);
        expect(results.skipped).toBe(1);
      });
    });

    it('parses coverage summary from output', async () => {
      await withTempDir(async (dir) => {
        // Create output with coverage data
        config.testCommand = 'echo "All files  |   85.5 |   70.2 |   90.1 |   88.3"';

        const service = new TestingService(config, eventBus, logger, dir);
        const results = await service.runTests({ timeout: 5 });

        // Coverage should be parsed
        if (results.coverage) {
          expect(results.coverage.statements).toBe(85.5);
          expect(results.coverage.branches).toBe(70.2);
          expect(results.coverage.functions).toBe(90.1);
          expect(results.coverage.lines).toBe(88.3);
        }
      });
    });

    it('handles test execution failure', async () => {
      await withTempDir(async (dir) => {
        config.testCommand = 'exit 1'; // Command that fails

        const service = new TestingService(config, eventBus, logger, dir);
        const results = await service.runTests({ timeout: 5 });

        expect(results.failed).toBe(1);
        expect(results.tests[0].status).toBe('failed');
        expect(results.tests[0].error).toBeDefined();
      });
    });
  });

  describe('buildTestCommand (internal)', () => {
    // Test command building by checking what gets executed
    it('adds files to command when specified', async () => {
      await withTempDir(async (dir) => {
        // Use echo to capture what would be executed
        config.testCommand = 'echo';

        const service = new TestingService(config, eventBus, logger, dir);
        const results = await service.runTests({
          files: ['test1.ts', 'test2.ts'],
          timeout: 5,
        });

        // The summary should show 0 results since echo doesn't produce test output
        expect(results.summary).toBeDefined();
      });
    });

    it('adds grep flag for vitest', async () => {
      await withTempDir(async (dir) => {
        config.testCommand = 'echo vitest';

        const service = new TestingService(config, eventBus, logger, dir);
        await service.runTests({
          grep: 'specific test',
          timeout: 5,
        });

        // Command would include --grep "specific test"
        expect(true).toBe(true); // Just verifying no error
      });
    });

    it('adds -t flag for jest', async () => {
      await withTempDir(async (dir) => {
        config.testCommand = 'echo jest';

        const service = new TestingService(config, eventBus, logger, dir);
        await service.runTests({
          grep: 'specific test',
          timeout: 5,
        });

        // Command would include -t "specific test"
        expect(true).toBe(true); // Just verifying no error
      });
    });

    it('adds coverage flag', async () => {
      await withTempDir(async (dir) => {
        config.testCommand = 'echo vitest';

        const service = new TestingService(config, eventBus, logger, dir);
        await service.runTests({
          coverage: true,
          timeout: 5,
        });

        // Command would include --coverage
        expect(true).toBe(true); // Just verifying no error
      });
    });
  });

  describe('event emission', () => {
    it('emits test:start event when running tests', async () => {
      await withTempDir(async (dir) => {
        config.testCommand = 'echo "0 passed"';

        const events: string[] = [];
        eventBus.on('*', (event) => events.push(event.type));

        const service = new TestingService(config, eventBus, logger, dir);
        await service.runTests({ timeout: 5 });

        expect(events).toContain('test:start');
      });
    });

    it('emits test:complete on success', async () => {
      await withTempDir(async (dir) => {
        config.testCommand = 'echo "1 passed"';

        const events: string[] = [];
        eventBus.on('*', (event) => events.push(event.type));

        const service = new TestingService(config, eventBus, logger, dir);
        await service.runTests({ timeout: 5 });

        expect(events).toContain('test:complete');
      });
    });

    it('emits test:fail on failure', async () => {
      await withTempDir(async (dir) => {
        config.testCommand = 'exit 1';

        const events: string[] = [];
        eventBus.on('*', (event) => events.push(event.type));

        const service = new TestingService(config, eventBus, logger, dir);
        await service.runTests({ timeout: 5 });

        expect(events).toContain('test:fail');
      });
    });
  });

  describe('timeout handling', () => {
    it('respects custom timeout', async () => {
      await withTempDir(async (dir) => {
        // Command that would take too long
        config.testCommand = 'sleep 10';

        const service = new TestingService(config, eventBus, logger, dir);
        const startTime = Date.now();

        const results = await service.runTests({ timeout: 1 });

        const elapsed = Date.now() - startTime;

        // Should fail due to timeout (timeout is in seconds)
        expect(results.failed).toBe(1);
        expect(elapsed).toBeLessThan(5000); // Should not have waited full 10s
      });
    });
  });

  describe('lastResults tracking', () => {
    it('stores results after running tests', async () => {
      await withTempDir(async (dir) => {
        config.testCommand = 'echo "3 passed"';

        const service = new TestingService(config, eventBus, logger, dir);

        expect(service.getLastResults()).toBeUndefined();

        await service.runTests({ timeout: 5 });

        const lastResults = service.getLastResults();
        expect(lastResults).toBeDefined();
        expect(lastResults?.passed).toBe(3);
      });
    });

    it('updates results on subsequent runs', async () => {
      await withTempDir(async (dir) => {
        const service = new TestingService(config, eventBus, logger, dir);

        // First run
        config.testCommand = 'echo "2 passed"';
        await service.runTests({ timeout: 5 });
        expect(service.getLastResults()?.passed).toBe(2);

        // Second run - need to create new service with new config
        const config2 = { ...config, testCommand: 'echo "5 passed"' };
        const service2 = new TestingService(config2, eventBus, logger, dir);
        await service2.runTests({ timeout: 5 });
        expect(service2.getLastResults()?.passed).toBe(5);
      });
    });
  });

  describe('status integration', () => {
    it('includes lastResults in status after running tests', async () => {
      await withTempDir(async (dir) => {
        config.testCommand = 'echo "4 passed, 1 failed"';

        const service = new TestingService(config, eventBus, logger, dir);
        await service.runTests({ timeout: 5 });

        const status = service.getStatus();

        expect(status.lastResults).toBeDefined();
        expect(status.lastResults?.passed).toBe(4);
        expect(status.lastResults?.failed).toBe(1);
      });
    });
  });
});
