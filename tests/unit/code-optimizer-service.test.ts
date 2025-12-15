// tests/unit/code-optimizer-service.test.ts
// CodeOptimizerService Unit Tests

import { vi } from 'vitest';
import { CodeOptimizerService } from '../../src/modules/code-optimizer/code-optimizer.service.js';
import { EventBus } from '../../src/core/event-bus.js';
import { Logger } from '../../src/core/logger.js';

// Mock dependencies
vi.mock('../../src/modules/code-optimizer/repo-scanner.js', () => ({
  scanRepository: vi.fn().mockResolvedValue({
    rootPath: '/test',
    totalFiles: 10,
    totalLinesApprox: 1000,
    files: [
      { path: 'src/index.ts', size: 100, extension: '.ts' },
      { path: 'src/utils.ts', size: 200, extension: '.ts' },
      { path: 'README.md', size: 50, extension: '.md' },
    ],
    largestFiles: [],
    largestFolders: [],
    extensionBreakdown: {},
  }),
}));

vi.mock('../../src/modules/code-optimizer/metrics.js', () => ({
  computeMetrics: vi.fn().mockResolvedValue({
    files: [
      {
        path: 'src/index.ts',
        lines: 100,
        codeLines: 80,
        commentLines: 10,
        blankLines: 10,
        maxNestingDepth: 3,
        branchScore: 5,
        todoCount: 1,
        fixmeCount: 0,
        complexityScore: 15,
      },
    ],
    aggregate: {
      totalLines: 100,
      avgComplexityScore: 15,
      totalTodos: 1,
      totalFixmes: 0,
    },
  }),
}));

vi.mock('../../src/modules/code-optimizer/hotspots.js', () => ({
  selectHotspots: vi.fn().mockReturnValue({
    hotspots: [
      {
        path: 'src/index.ts',
        score: 85,
        reasons: ['High complexity'],
        suggestedGoal: 'refactor',
      },
    ],
    summary: {
      totalAnalyzed: 1,
      hotspotsFound: 1,
      topReason: 'High complexity',
    },
  }),
}));

vi.mock('../../src/modules/code-optimizer/refactor-plan.js', () => ({
  buildRefactorPlan: vi.fn().mockReturnValue({
    plans: [
      {
        file: 'src/index.ts',
        steps: [{ phase: 'analysis', description: 'Analyze complexity' }],
      },
    ],
    summary: {
      totalFiles: 1,
      totalSteps: 1,
      estimatedTotalEffort: 'low',
    },
  }),
}));

vi.mock('../../src/modules/code-optimizer/report-generator.js', () => ({
  generateReport: vi.fn().mockReturnValue({
    reportPath: 'docs/reports/test-report.md',
    markdown: '# Report',
    summary: {
      hotspotsAnalyzed: 1,
      filesChanged: 2,
    },
  }),
}));

vi.mock('../../src/modules/code-optimizer/session-storage.js', () => ({
  SessionStorage: vi.fn().mockImplementation(() => ({
    saveSession: vi.fn(),
    listSessions: vi.fn().mockReturnValue({ sessions: [] }),
  })),
}));

describe('CodeOptimizerService', () => {
  let service: CodeOptimizerService;
  let eventBus: EventBus;
  let logger: Logger;

  beforeEach(() => {
    vi.clearAllMocks();
    eventBus = new EventBus();
    logger = new Logger('info', 'TestCodeOptimizer');
    service = new CodeOptimizerService(
      { enabled: true },
      eventBus,
      logger,
      '/test/project'
    );
  });

  describe('constructor', () => {
    it('creates service with default config', () => {
      const svc = new CodeOptimizerService({}, eventBus, logger);
      expect(svc).toBeDefined();
    });

    it('creates service with custom config', () => {
      const svc = new CodeOptimizerService(
        { enabled: false, maxFilesToScan: 500 },
        eventBus,
        logger
      );
      expect(svc).toBeDefined();
    });

    it('uses provided project root', () => {
      const svc = new CodeOptimizerService(
        {},
        eventBus,
        logger,
        '/custom/path'
      );
      expect(svc).toBeDefined();
    });
  });

  describe('initialize()', () => {
    it('initializes when enabled', async () => {
      await expect(service.initialize()).resolves.not.toThrow();
    });

    it('skips initialization when disabled', async () => {
      const disabledService = new CodeOptimizerService(
        { enabled: false },
        eventBus,
        logger
      );
      await expect(disabledService.initialize()).resolves.not.toThrow();
    });
  });

  describe('shutdown()', () => {
    it('shuts down cleanly', async () => {
      await service.initialize();
      await expect(service.shutdown()).resolves.not.toThrow();
    });

    it('clears caches on shutdown', async () => {
      await service.initialize();
      // Run some operations to populate cache
      await service.scanRepository({});
      await service.shutdown();

      const status = service.getStatus();
      expect(status.cachedMetrics).toBe(0);
    });
  });

  describe('scanRepository()', () => {
    it('scans repository with defaults', async () => {
      const result = await service.scanRepository({});

      expect(result.totalFiles).toBe(10);
      expect(result.totalLinesApprox).toBe(1000);
    });

    it('scans with custom root path', async () => {
      const result = await service.scanRepository({
        rootPath: '/custom/path',
      });

      expect(result).toBeDefined();
    });

    it('scans with custom patterns', async () => {
      const result = await service.scanRepository({
        includePatterns: ['**/*.ts'],
        excludePatterns: ['node_modules/**'],
      });

      expect(result).toBeDefined();
    });

    it('scans with max files limit', async () => {
      const result = await service.scanRepository({
        maxFiles: 100,
      });

      expect(result).toBeDefined();
    });

    it('emits scan_complete event', async () => {
      const events: unknown[] = [];
      eventBus.on('code-optimizer:scan_complete', (e) => events.push(e));

      await service.scanRepository({});

      expect(events.length).toBe(1);
    });

    it('caches scan result', async () => {
      await service.scanRepository({});

      const status = service.getStatus();
      expect(status.lastScan).toBeDefined();
    });
  });

  describe('computeMetrics()', () => {
    it('computes metrics for files', async () => {
      const result = await service.computeMetrics({
        files: ['src/index.ts'],
      });

      expect(result.files.length).toBe(1);
      expect(result.aggregate.avgComplexityScore).toBe(15);
    });

    it('computes with custom max file size', async () => {
      const result = await service.computeMetrics({
        files: ['src/index.ts'],
        maxFileSizeBytes: 1024 * 1024,
      });

      expect(result).toBeDefined();
    });

    it('emits metrics_computed event', async () => {
      const events: unknown[] = [];
      eventBus.on('code-optimizer:metrics_computed', (e) => events.push(e));

      await service.computeMetrics({ files: ['src/index.ts'] });

      expect(events.length).toBe(1);
    });

    it('caches metrics when caching enabled', async () => {
      const cachingService = new CodeOptimizerService(
        { enabled: true, cacheResults: true },
        eventBus,
        logger
      );

      await cachingService.computeMetrics({ files: ['src/index.ts'] });

      const status = cachingService.getStatus();
      expect(status.cachedMetrics).toBe(1);
    });
  });

  describe('detectHotspots()', () => {
    it('detects hotspots from metrics', () => {
      const result = service.detectHotspots({
        metrics: [
          {
            path: 'src/index.ts',
            lines: 100,
            maxNestingDepth: 3,
            branchScore: 5,
            todoCount: 1,
            fixmeCount: 0,
            complexityScore: 15,
          },
        ],
        maxResults: 10,
        strategy: 'mixed',
      });

      expect(result.hotspots.length).toBe(1);
      expect(result.summary.topReason).toBe('High complexity');
    });

    it('detects with size strategy', () => {
      const result = service.detectHotspots({
        metrics: [
          {
            path: 'src/index.ts',
            lines: 500,
            maxNestingDepth: 2,
            branchScore: 3,
            todoCount: 0,
            fixmeCount: 0,
            complexityScore: 10,
          },
        ],
        strategy: 'size',
      });

      expect(result).toBeDefined();
    });

    it('detects with complexity strategy', () => {
      const result = service.detectHotspots({
        metrics: [
          {
            path: 'src/complex.ts',
            lines: 100,
            maxNestingDepth: 8,
            branchScore: 20,
            todoCount: 5,
            fixmeCount: 3,
            complexityScore: 50,
          },
        ],
        strategy: 'complexity',
      });

      expect(result).toBeDefined();
    });

    it('emits hotspots_detected event', () => {
      const events: unknown[] = [];
      eventBus.on('code-optimizer:hotspots_detected', (e) => events.push(e));

      service.detectHotspots({
        metrics: [
          {
            path: 'src/index.ts',
            lines: 100,
            maxNestingDepth: 3,
            branchScore: 5,
            todoCount: 1,
            fixmeCount: 0,
            complexityScore: 15,
          },
        ],
      });

      expect(events.length).toBe(1);
    });

    it('respects maxResults', () => {
      const result = service.detectHotspots({
        metrics: [
          { path: 'a.ts', lines: 100, maxNestingDepth: 3, branchScore: 5, todoCount: 1, fixmeCount: 0, complexityScore: 15 },
          { path: 'b.ts', lines: 200, maxNestingDepth: 4, branchScore: 6, todoCount: 2, fixmeCount: 1, complexityScore: 20 },
        ],
        maxResults: 1,
      });

      expect(result.hotspots.length).toBeLessThanOrEqual(1);
    });
  });

  describe('generateRefactorPlan()', () => {
    it('generates plan from hotspots', () => {
      const result = service.generateRefactorPlan({
        hotspots: [
          { path: 'src/index.ts', score: 85, reason: 'High complexity' },
        ],
        goal: 'readability',
      });

      expect(result.plans.length).toBe(1);
      expect(result.summary.totalFiles).toBe(1);
    });

    it('generates with different goals', () => {
      const goals = ['readability', 'performance', 'architecture', 'testing', 'mixed'] as const;

      for (const goal of goals) {
        const result = service.generateRefactorPlan({
          hotspots: [{ path: 'src/index.ts', score: 85, reason: 'test' }],
          goal,
        });
        expect(result).toBeDefined();
      }
    });

    it('generates with constraints', () => {
      const result = service.generateRefactorPlan({
        hotspots: [{ path: 'src/index.ts', score: 85, reason: 'test' }],
        goal: 'readability',
        constraints: ['No breaking changes', 'Must pass tests'],
      });

      expect(result).toBeDefined();
    });

    it('emits plan_generated event', () => {
      const events: unknown[] = [];
      eventBus.on('code-optimizer:plan_generated', (e) => events.push(e));

      service.generateRefactorPlan({
        hotspots: [{ path: 'src/index.ts', score: 85, reason: 'test' }],
        goal: 'readability',
      });

      expect(events.length).toBe(1);
    });

    it('tracks active optimization', () => {
      service.generateRefactorPlan({
        hotspots: [{ path: 'src/index.ts', score: 85, reason: 'test' }],
        goal: 'readability',
      });

      const status = service.getStatus();
      expect(status.activeOptimizations).toBe(1);
    });
  });

  describe('recordOptimization()', () => {
    it('records optimization session', async () => {
      const result = await service.recordOptimization({
        sessionId: 'test-session-1',
        summary: 'Refactored index.ts',
        filesChanged: ['src/index.ts'],
        testsStatus: 'passed',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('test-session-1');
    });

    it('records with test failure', async () => {
      const result = await service.recordOptimization({
        sessionId: 'test-session-2',
        summary: 'Partial refactor',
        filesChanged: ['src/index.ts'],
        testsStatus: 'failed',
      });

      expect(result.success).toBe(true);
    });

    it('records with metrics improvement', async () => {
      const result = await service.recordOptimization({
        sessionId: 'test-session-3',
        summary: 'Improved complexity',
        filesChanged: ['src/index.ts'],
        testsStatus: 'passed',
        metricsImprovement: {
          before: { totalLines: 500, avgComplexity: 30 },
          after: { totalLines: 450, avgComplexity: 20 },
        },
      });

      expect(result.success).toBe(true);
    });

    it('emits optimization_recorded event', async () => {
      const events: unknown[] = [];
      eventBus.on('code-optimizer:optimization_recorded', (e) => events.push(e));

      await service.recordOptimization({
        sessionId: 'test-session-4',
        summary: 'Test',
        filesChanged: [],
        testsStatus: 'skipped',
      });

      expect(events.length).toBe(1);
    });
  });

  describe('generateReport()', () => {
    it('generates report with minimal input', () => {
      const result = service.generateReport({
        sessionId: 'report-session-1',
      });

      expect(result.reportPath).toContain('test-report.md');
      expect(result.markdown).toBe('# Report');
    });

    it('generates report with full input', () => {
      const result = service.generateReport({
        sessionId: 'report-session-2',
        repoName: 'test-repo',
        strategy: 'mixed',
        scanResult: {
          rootPath: '/test',
          totalFiles: 10,
          totalLinesApprox: 1000,
          files: [],
          largestFiles: [],
          largestFolders: [],
          extensionBreakdown: {},
        },
        metricsBefore: {
          files: [],
          aggregate: { totalLines: 100, avgComplexityScore: 15, totalTodos: 1, totalFixmes: 0 },
        },
        metricsAfter: {
          files: [],
          aggregate: { totalLines: 90, avgComplexityScore: 10, totalTodos: 0, totalFixmes: 0 },
        },
        hotspots: {
          hotspots: [],
          summary: { totalAnalyzed: 0, hotspotsFound: 0, topReason: 'None' },
        },
        filesChanged: ['src/index.ts'],
        testsStatus: 'passed',
        testsPassed: 10,
        testsFailed: 0,
      });

      expect(result).toBeDefined();
    });

    it('emits report_generated event', () => {
      const events: unknown[] = [];
      eventBus.on('code-optimizer:report_generated', (e) => events.push(e));

      service.generateReport({ sessionId: 'report-session-3' });

      expect(events.length).toBe(1);
    });
  });

  describe('quickAnalysis()', () => {
    it('performs quick analysis with defaults', async () => {
      const result = await service.quickAnalysis();

      expect(result.scan).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.hotspots).toBeDefined();
    });

    it('performs quick analysis with custom options', async () => {
      const result = await service.quickAnalysis({
        maxFiles: 500,
        maxHotspots: 10,
        strategy: 'complexity',
      });

      expect(result.scan).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.hotspots).toBeDefined();
    });

    it('filters source files only', async () => {
      const result = await service.quickAnalysis();

      // Should have filtered out non-source files (like .md)
      expect(result.metrics).toBeDefined();
    });
  });

  describe('getStatus()', () => {
    it('returns status when enabled', () => {
      const status = service.getStatus();

      expect(status.enabled).toBe(true);
      expect(status.cachedMetrics).toBe(0);
      expect(status.activeOptimizations).toBe(0);
    });

    it('returns status when disabled', () => {
      const disabledService = new CodeOptimizerService(
        { enabled: false },
        eventBus,
        logger
      );

      const status = disabledService.getStatus();
      expect(status.enabled).toBe(false);
    });

    it('includes last scan info after scanning', async () => {
      await service.scanRepository({});

      const status = service.getStatus();
      expect(status.lastScan).toBeDefined();
      expect(status.lastScan?.filesScanned).toBe(10);
    });

    it('tracks cached metrics count', async () => {
      const cachingService = new CodeOptimizerService(
        { enabled: true, cacheResults: true },
        eventBus,
        logger
      );

      await cachingService.computeMetrics({ files: ['a.ts'] });
      await cachingService.computeMetrics({ files: ['b.ts'] });

      const status = cachingService.getStatus();
      expect(status.cachedMetrics).toBe(2);
    });

    it('tracks active optimizations', () => {
      service.generateRefactorPlan({
        hotspots: [{ path: 'a.ts', score: 80, reason: 'test' }],
        goal: 'readability',
      });

      const status = service.getStatus();
      // Each call adds a new optimization session
      expect(status.activeOptimizations).toBeGreaterThanOrEqual(1);
    });
  });
});
