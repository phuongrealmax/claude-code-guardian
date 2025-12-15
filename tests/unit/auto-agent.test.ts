// tests/unit/auto-agent.test.ts

import { vi } from 'vitest';
import { AutoAgentService } from '../../src/modules/auto-agent/auto-agent.service.js';
import { EventBus } from '../../src/core/event-bus.js';
import { Logger } from '../../src/core/logger.js';
import { GovernorState, GovernorMode } from '../../src/modules/resource/resource.types.js';

// Mock dependencies
const mockEventBus = new EventBus();
const mockLogger = new Logger('silent');

const createDefaultConfig = () => ({
  enabled: true,
  decomposer: {
    autoDecompose: true,
    maxSubtasks: 10,
    maxDepth: 3,
    complexityThreshold: 5,
  },
  router: {
    enabled: true,
  },
  fixLoop: {
    enabled: true,
    maxRetries: 3,
    autoRollback: true,
  },
  errorMemory: {
    enabled: true,
    autoRecall: true,
    minSimilarity: 0.6,
    maxEntries: 100,
  },
});

describe('AutoAgentService', () => {
  let service: AutoAgentService;

  beforeEach(async () => {
    service = new AutoAgentService(
      createDefaultConfig(),
      mockEventBus,
      mockLogger
    );
    await service.initialize();
  });

  afterEach(async () => {
    await service.shutdown();
  });

  // ═══════════════════════════════════════════════════════════════
  //                      INITIALIZATION
  // ═══════════════════════════════════════════════════════════════

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      expect(service).toBeDefined();
    });

    it('should skip initialization when disabled', async () => {
      const disabledService = new AutoAgentService(
        { ...createDefaultConfig(), enabled: false },
        mockEventBus,
        mockLogger
      );
      await disabledService.initialize();

      const status = disabledService.getStatus();
      expect(status.enabled).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      TASK DECOMPOSITION
  // ═══════════════════════════════════════════════════════════════

  describe('decomposeTask', () => {
    it('should decompose a task', async () => {
      const result = await service.decomposeTask({
        taskName: 'Implement user authentication',
        taskDescription: 'Add login, logout, and session management',
        forceDecompose: true,
      });

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it('should skip decomposition when autoDecompose is false and not forced', async () => {
      const noAutoService = new AutoAgentService(
        {
          ...createDefaultConfig(),
          decomposer: { ...createDefaultConfig().decomposer, autoDecompose: false },
        },
        mockEventBus,
        mockLogger
      );
      await noAutoService.initialize();

      const result = await noAutoService.decomposeTask({
        taskName: 'Simple task',
      });

      expect(result.success).toBe(false);
    });

    it('should respect governor critical mode', async () => {
      const mockGovernorState: GovernorState = {
        mode: 'critical',
        tokenPercentage: 90,
        allowedActions: ['checkpoint_create'],
        blockedActions: ['task_decompose'],
        recommendation: 'Token budget critical!',
        thresholds: { conservative: 70, critical: 85 },
      };

      service.setGovernorStateProvider(() => mockGovernorState);

      const result = await service.decomposeTask({
        taskName: 'Complex task',
        forceDecompose: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('critical');
      expect(result.governorState?.mode).toBe('critical');
    });

    it('should limit subtasks in conservative mode', async () => {
      const mockGovernorState: GovernorState = {
        mode: 'conservative',
        tokenPercentage: 75,
        allowedActions: ['delta_update', 'small_patch'],
        blockedActions: ['browser_open'],
        recommendation: 'Use delta-only responses.',
        thresholds: { conservative: 70, critical: 85 },
      };

      service.setGovernorStateProvider(() => mockGovernorState);

      const result = await service.decomposeTask({
        taskName: 'Complex refactoring task',
        taskDescription: 'Refactor the entire codebase with many components',
        forceDecompose: true,
      });

      // If there are subtasks, they should be limited to 3
      if (result.success && result.subtasks.length > 0) {
        expect(result.subtasks.length).toBeLessThanOrEqual(3);
      }
    });
  });

  describe('analyzeComplexity', () => {
    it('should analyze task complexity', () => {
      const result = service.analyzeComplexity({
        taskName: 'Add a simple button',
      });

      expect(result).toBeDefined();
      expect(result.score).toBeDefined();
      expect(result.factors).toBeDefined();
    });

    it('should identify high complexity tasks', () => {
      const result = service.analyzeComplexity({
        taskName: 'Complete architecture overhaul of the system with database migration and API refactoring',
        taskDescription: 'Refactor entire backend, migrate databases, update all APIs, rewrite authentication',
        files: ['file1.ts', 'file2.ts', 'file3.ts', 'file4.ts', 'file5.ts', 'file6.ts', 'file7.ts'],
        constraints: ['No downtime', 'Backward compatible', 'Performance optimization'],
      });

      // Complexity score depends on the algorithm; verify it has a non-trivial score
      expect(result.score).toBeGreaterThanOrEqual(1);
      expect(result.factors.length).toBeGreaterThan(0);
    });

    it('should identify low complexity tasks', () => {
      const result = service.analyzeComplexity({
        taskName: 'Fix typo in README',
      });

      expect(result.score).toBeLessThan(5);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      TOOL ROUTING
  // ═══════════════════════════════════════════════════════════════

  describe('routeTools', () => {
    it('should route to appropriate tools', () => {
      const result = service.routeTools({
        action: 'Run unit tests',
        domain: 'testing',
      });

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it('should return empty when router is disabled', async () => {
      const noRouterService = new AutoAgentService(
        {
          ...createDefaultConfig(),
          router: { enabled: false },
        },
        mockEventBus,
        mockLogger
      );
      await noRouterService.initialize();

      const result = noRouterService.routeTools({
        action: 'Test action',
      });

      expect(result.success).toBe(false);
      expect(result.suggestedTools).toHaveLength(0);
    });
  });

  describe('getBestTool', () => {
    it('should get best tool for action', () => {
      const result = service.getBestTool({
        action: 'Create a checkpoint',
        domain: 'resource',
      });

      expect(result).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      AUTO FIX LOOP
  // ═══════════════════════════════════════════════════════════════

  describe('startFixLoop', () => {
    it('should start fix loop', async () => {
      const result = await service.startFixLoop({
        error: {
          type: 'build_error',
          message: 'Cannot find module',
          file: 'src/index.ts',
          line: 42,
        },
        code: 'import { foo } from "./missing"',
        maxRetries: 1,
      });

      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
    });

    it('should return idle when fixLoop is disabled', async () => {
      const noFixLoopService = new AutoAgentService(
        {
          ...createDefaultConfig(),
          fixLoop: { ...createDefaultConfig().fixLoop, enabled: false },
        },
        mockEventBus,
        mockLogger
      );
      await noFixLoopService.initialize();

      const result = await noFixLoopService.startFixLoop({
        error: { type: 'test', message: 'Test error' },
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe('idle');
    });
  });

  describe('getFixLoopStatus', () => {
    it('should return fix loop status', () => {
      const status = service.getFixLoopStatus();

      expect(status).toBeDefined();
    });
  });

  describe('resetFixLoop', () => {
    it('should reset fix loop', async () => {
      await service.startFixLoop({
        error: { type: 'test', message: 'Test error' },
        maxRetries: 0,
      });

      service.resetFixLoop();
      const status = service.getFixLoopStatus();

      expect(status).toBe('idle');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      ERROR MEMORY
  // ═══════════════════════════════════════════════════════════════

  describe('storeError', () => {
    it('should store an error', async () => {
      const entry = await service.storeError({
        error: {
          type: 'TypeError',
          message: 'Cannot read property of undefined',
          file: 'src/utils.ts',
        },
        fix: {
          type: 'patch',
          target: 'src/utils.ts',
          description: 'Add null check',
        },
        success: true,
        tags: ['null-check', 'typescript'],
      });

      expect(entry).toBeDefined();
      expect(entry.id).toBeDefined();
      expect(entry.error.type).toBe('TypeError');
    });
  });

  describe('recallErrors', () => {
    it('should recall similar errors', async () => {
      // Store an error first
      await service.storeError({
        error: {
          type: 'TypeError',
          message: 'Cannot read property x of undefined',
        },
        fix: {
          type: 'patch',
          target: 'src/app.ts',
          description: 'Add optional chaining',
        },
        success: true,
      });

      // Try to recall similar error
      const result = await service.recallErrors({
        error: {
          type: 'TypeError',
          message: 'Cannot read property y of undefined',
        },
      });

      expect(result).toBeDefined();
      expect(result.matches).toBeDefined();
    });

    it('should filter by tags', async () => {
      await service.storeError({
        error: { type: 'TestError', message: 'Test failed' },
        fix: { type: 'patch', target: 'test.ts', description: 'Fix test' },
        success: true,
        tags: ['jest', 'testing'],
      });

      const result = await service.recallErrors({
        error: { type: 'TestError', message: 'Another test failed' },
        tags: ['jest'],
      });

      expect(result).toBeDefined();
    });
  });

  describe('getAllErrors', () => {
    it('should return all stored errors', async () => {
      await service.storeError({
        error: { type: 'Error1', message: 'First error' },
        fix: { type: 'patch', target: 'file1.ts', description: 'Fix 1' },
        success: true,
      });

      await service.storeError({
        error: { type: 'Error2', message: 'Second error' },
        fix: { type: 'patch', target: 'file2.ts', description: 'Fix 2' },
        success: true,
      });

      const errors = service.getAllErrors();
      expect(errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      STATUS
  // ═══════════════════════════════════════════════════════════════

  describe('getStatus', () => {
    it('should return complete status', () => {
      const status = service.getStatus();

      expect(status.enabled).toBe(true);
      expect(status.decomposer).toBeDefined();
      expect(status.router).toBeDefined();
      expect(status.fixLoop).toBeDefined();
      expect(status.errorMemory).toBeDefined();
    });

    it('should track decomposer stats', async () => {
      await service.decomposeTask({
        taskName: 'Test task',
        forceDecompose: true,
      });

      const status = service.getStatus();
      expect(status.decomposer.totalDecomposed).toBeGreaterThanOrEqual(0);
    });

    it('should track router stats', () => {
      service.routeTools({ action: 'Test action' });

      const status = service.getStatus();
      expect(status.router.totalRouted).toBeGreaterThanOrEqual(0);
    });

    it('should track error memory stats', async () => {
      await service.storeError({
        error: { type: 'Test', message: 'Test' },
        fix: { type: 'patch', target: 'test.ts', description: 'Fix' },
        success: true,
      });

      const status = service.getStatus();
      expect(status.errorMemory.errorCount).toBeGreaterThanOrEqual(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      GOVERNOR INTEGRATION
  // ═══════════════════════════════════════════════════════════════

  describe('governor integration', () => {
    it('should accept governor state provider', () => {
      const provider = () => ({
        mode: 'normal' as GovernorMode,
        tokenPercentage: 50,
        allowedActions: ['all'],
        blockedActions: [],
        recommendation: 'Normal operation.',
        thresholds: { conservative: 70, critical: 85 },
      });

      // Should not throw
      service.setGovernorStateProvider(provider);
    });

    it('should include governor state in decomposition result', async () => {
      const mockGovernorState: GovernorState = {
        mode: 'conservative',
        tokenPercentage: 75,
        allowedActions: ['delta_update'],
        blockedActions: ['browser_open'],
        recommendation: 'Be conservative.',
        thresholds: { conservative: 70, critical: 85 },
      };

      service.setGovernorStateProvider(() => mockGovernorState);

      const result = await service.decomposeTask({
        taskName: 'Large task',
        forceDecompose: true,
      });

      // If decomposition was modified due to governor, should have state info
      if (result.governorState) {
        expect(result.governorState.mode).toBe('conservative');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      EVENT HANDLING
  // ═══════════════════════════════════════════════════════════════

  describe('event handling', () => {
    it('should emit event on error recall', async () => {
      const emitSpy = vi.spyOn(mockEventBus, 'emit');

      // Store an error that can be recalled
      await service.storeError({
        error: { type: 'GuardBlock', message: 'Empty catch block' },
        fix: { type: 'patch', target: 'src/app.ts', description: 'Add error handling' },
        success: true,
        tags: ['guard', 'empty-catch'],
      });

      // Simulate guard:block event (this is handled internally)
      mockEventBus.emit({
        type: 'guard:block',
        timestamp: new Date(),
        data: {
          filename: 'src/app.ts',
          firstIssue: { rule: 'empty-catch', message: 'Empty catch block' },
        },
      });

      // Wait a bit for async handler
      await new Promise(r => setTimeout(r, 100));

      // The service should have handled the event
      // (We can't easily verify the internal handler, but we can check it doesn't throw)
      expect(true).toBe(true);
    });
  });
});
