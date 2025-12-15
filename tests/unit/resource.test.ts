// tests/unit/resource.test.ts

import { vi } from 'vitest';
import { join } from 'path';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { ResourceService } from '../../src/modules/resource/resource.service.js';
import { EventBus } from '../../src/core/event-bus.js';
import { Logger } from '../../src/core/logger.js';

// Test project root
const TEST_ROOT = join(process.cwd(), '.resource-test-temp');

// Mock dependencies
const mockEventBus = new EventBus();
const mockLogger = new Logger('silent');

describe('ResourceService', () => {
  let service: ResourceService;

  beforeEach(async () => {
    // Clean up and create test directory
    if (existsSync(TEST_ROOT)) {
      rmSync(TEST_ROOT, { recursive: true, force: true });
    }
    mkdirSync(join(TEST_ROOT, '.ccg'), { recursive: true });

    service = new ResourceService(
      {
        enabled: true,
        warningThreshold: 70,
        pauseThreshold: 85,
        checkpoints: {
          auto: false, // Disable auto checkpoints in tests
          thresholds: [50, 70, 85],
          maxCheckpoints: 10,
        },
      },
      mockEventBus,
      mockLogger,
      TEST_ROOT
    );
    await service.initialize();
  });

  afterEach(async () => {
    // Cleanup
    if (existsSync(TEST_ROOT)) {
      rmSync(TEST_ROOT, { recursive: true, force: true });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  //                      INITIALIZATION
  // ═══════════════════════════════════════════════════════════════

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      expect(service).toBeDefined();
    });

    it('should create checkpoints directory', async () => {
      const checkpointDir = join(TEST_ROOT, '.ccg', 'checkpoints');
      expect(existsSync(checkpointDir)).toBe(true);
    });

    it('should skip initialization when disabled', async () => {
      const disabledService = new ResourceService(
        {
          enabled: false,
          warningThreshold: 70,
          pauseThreshold: 85,
          checkpoints: { auto: false, thresholds: [], maxCheckpoints: 10 },
        },
        mockEventBus,
        mockLogger,
        TEST_ROOT
      );
      await disabledService.initialize();
      // Should not throw
      expect(disabledService.getStatus().tokens.used).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      TOKEN MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  describe('updateTokenUsage', () => {
    it('should update token usage', () => {
      const status = service.updateTokenUsage(50000);

      expect(status.tokens.used).toBe(50000);
      expect(status.tokens.percentage).toBe(25); // 50000/200000
    });

    it('should update estimated tokens', () => {
      const status = service.updateTokenUsage(50000, 100000);

      expect(status.tokens.used).toBe(50000);
      expect(status.tokens.estimated).toBe(100000);
      expect(status.tokens.percentage).toBe(50); // 50000/100000
    });

    it('should calculate remaining tokens', () => {
      const status = service.updateTokenUsage(50000);

      expect(status.tokens.remaining).toBe(150000);
    });
  });

  describe('getStatus', () => {
    it('should return resource status', () => {
      const status = service.getStatus();

      expect(status.tokens).toBeDefined();
      expect(status.checkpoints).toBeDefined();
      expect(status.warnings).toBeDefined();
    });

    it('should return warning when token usage is high', () => {
      service.updateTokenUsage(150000); // 75%

      const status = service.getStatus();
      expect(status.warnings.some(w => w.level === 'warning')).toBe(true);
    });

    it('should return critical warning when token usage is critical', () => {
      service.updateTokenUsage(180000); // 90%

      const status = service.getStatus();
      expect(status.warnings.some(w => w.level === 'critical')).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      TOKEN BUDGET GOVERNOR
  // ═══════════════════════════════════════════════════════════════

  describe('getGovernorState', () => {
    it('should return normal mode when usage is low', () => {
      service.updateTokenUsage(50000); // 25%

      const state = service.getGovernorState();

      expect(state.mode).toBe('normal');
      expect(state.allowedActions).toContain('all');
      expect(state.blockedActions).toHaveLength(0);
    });

    it('should return conservative mode at 70%', () => {
      service.updateTokenUsage(140000); // 70%

      const state = service.getGovernorState();

      expect(state.mode).toBe('conservative');
      expect(state.blockedActions).toContain('browser_open');
      expect(state.blockedActions).toContain('full_test_suite');
    });

    it('should return critical mode at 85%', () => {
      service.updateTokenUsage(170000); // 85%

      const state = service.getGovernorState();

      expect(state.mode).toBe('critical');
      expect(state.blockedActions).toContain('task_decompose');
      expect(state.blockedActions).toContain('new_task_create');
      expect(state.allowedActions).toContain('checkpoint_create');
      expect(state.allowedActions).toContain('finish_task');
    });

    it('should include thresholds in state', () => {
      const state = service.getGovernorState();

      expect(state.thresholds.conservative).toBe(70);
      expect(state.thresholds.critical).toBe(85);
    });
  });

  describe('isActionAllowed', () => {
    it('should allow all actions in normal mode', () => {
      service.updateTokenUsage(50000); // 25%

      expect(service.isActionAllowed('browser_open').allowed).toBe(true);
      expect(service.isActionAllowed('full_test_suite').allowed).toBe(true);
      expect(service.isActionAllowed('task_decompose').allowed).toBe(true);
    });

    it('should block heavy actions in conservative mode', () => {
      service.updateTokenUsage(145000); // ~73%

      const browserResult = service.isActionAllowed('browser_open');
      expect(browserResult.allowed).toBe(false);
      expect(browserResult.reason).toContain('conservative');
    });

    it('should block most actions in critical mode', () => {
      service.updateTokenUsage(175000); // ~88%

      expect(service.isActionAllowed('task_decompose').allowed).toBe(false);
      expect(service.isActionAllowed('new_task_create').allowed).toBe(false);

      // But allow critical actions
      expect(service.isActionAllowed('checkpoint_create').allowed).toBe(true);
      expect(service.isActionAllowed('finish_task').allowed).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      TASK ESTIMATION
  // ═══════════════════════════════════════════════════════════════

  describe('estimateTask', () => {
    it('should estimate simple task', () => {
      const estimate = service.estimateTask({
        description: 'Fix a small bug',
      });

      expect(estimate.complexity).toBe('low');
      expect(estimate.estimatedTokens).toBeLessThan(5000);
      expect(estimate.canComplete).toBe(true);
    });

    it('should estimate complex task', () => {
      const estimate = service.estimateTask({
        description: 'Refactor the entire authentication system',
        filesCount: 10,
        linesEstimate: 500,
      });

      expect(estimate.complexity).toBe('high');
      expect(estimate.estimatedTokens).toBeGreaterThan(5000);
      expect(estimate.suggestBreakdown).toBe(true);
    });

    it('should estimate very high complexity', () => {
      const estimate = service.estimateTask({
        description: 'Complete architecture overhaul',
        filesCount: 20,
      });

      expect(estimate.complexity).toBe('very_high');
      expect(estimate.breakdownSuggestions).toBeDefined();
      expect(estimate.breakdownSuggestions!.length).toBeGreaterThan(0);
    });

    it('should include tests in estimation', () => {
      const withoutTests = service.estimateTask({
        description: 'Add a feature',
      });

      const withTests = service.estimateTask({
        description: 'Add a feature',
        hasTests: true,
      });

      expect(withTests.estimatedTokens).toBeGreaterThan(withoutTests.estimatedTokens);
    });

    it('should include browser testing in estimation', () => {
      const withoutBrowser = service.estimateTask({
        description: 'Add a feature',
      });

      const withBrowser = service.estimateTask({
        description: 'Add a feature',
        hasBrowserTesting: true,
      });

      expect(withBrowser.estimatedTokens).toBeGreaterThan(withoutBrowser.estimatedTokens);
    });

    it('should warn if cannot complete', () => {
      service.updateTokenUsage(195000); // 97.5%

      const estimate = service.estimateTask({
        description: 'Implement a complex feature',
        filesCount: 5,
      });

      expect(estimate.canComplete).toBe(false);
      expect(estimate.warningMessage).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      CHECKPOINT MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  describe('createCheckpoint', () => {
    it('should create a checkpoint', async () => {
      const checkpoint = await service.createCheckpoint({
        name: 'test-checkpoint',
        reason: 'manual',
      });

      expect(checkpoint).toBeDefined();
      expect(checkpoint.id).toBeDefined();
      expect(checkpoint.name).toBe('test-checkpoint');
      expect(checkpoint.reason).toBe('manual');
    });

    it('should save checkpoint to disk', async () => {
      const checkpoint = await service.createCheckpoint({
        name: 'disk-checkpoint',
        reason: 'manual',
      });

      const checkpointPath = join(TEST_ROOT, '.ccg', 'checkpoints', `${checkpoint.id}.json`);
      expect(existsSync(checkpointPath)).toBe(true);
    });

    it('should record current token usage', async () => {
      service.updateTokenUsage(100000);

      const checkpoint = await service.createCheckpoint({
        name: 'token-checkpoint',
        reason: 'manual',
      });

      expect(checkpoint.tokenUsage).toBe(100000);
    });

    it('should include resume state', async () => {
      const checkpoint = await service.createCheckpoint({
        name: 'resume-checkpoint',
        reason: 'manual',
        nextActions: ['Continue implementation'],
        summary: 'Working on feature X',
      });

      const restored = await service.restoreCheckpoint(checkpoint.id);
      expect(restored?.resumeState).toBeDefined();
      expect(restored?.resumeState?.nextActions).toContain('Continue implementation');
      expect(restored?.resumeState?.summary).toBe('Working on feature X');
    });
  });

  describe('listCheckpoints', () => {
    it('should list all checkpoints', async () => {
      await service.createCheckpoint({ name: 'cp-1', reason: 'manual' });
      await service.createCheckpoint({ name: 'cp-2', reason: 'manual' });
      await service.createCheckpoint({ name: 'cp-3', reason: 'manual' });

      const checkpoints = service.listCheckpoints();
      expect(checkpoints.length).toBe(3);
    });

    it('should sort by date (newest first)', async () => {
      await service.createCheckpoint({ name: 'first', reason: 'manual' });
      await new Promise(r => setTimeout(r, 10)); // Small delay
      await service.createCheckpoint({ name: 'second', reason: 'manual' });

      const checkpoints = service.listCheckpoints();
      expect(checkpoints[0].name).toBe('second');
      expect(checkpoints[1].name).toBe('first');
    });
  });

  describe('restoreCheckpoint', () => {
    it('should restore checkpoint data', async () => {
      service.updateTokenUsage(75000);
      const created = await service.createCheckpoint({
        name: 'restore-test',
        reason: 'manual',
        metadata: { testKey: 'testValue' },
      });

      const restored = await service.restoreCheckpoint(created.id);

      expect(restored).toBeDefined();
      expect(restored?.name).toBe('restore-test');
      expect(restored?.tokenUsage).toBe(75000);
      expect(restored?.metadata?.testKey).toBe('testValue');
    });

    it('should return null for non-existent checkpoint', async () => {
      const restored = await service.restoreCheckpoint('non-existent');
      expect(restored).toBeNull();
    });
  });

  describe('deleteCheckpoint', () => {
    it('should delete a checkpoint', async () => {
      const checkpoint = await service.createCheckpoint({
        name: 'to-delete',
        reason: 'manual',
      });

      const result = await service.deleteCheckpoint(checkpoint.id);
      expect(result).toBe(true);

      const checkpoints = service.listCheckpoints();
      expect(checkpoints.find(c => c.id === checkpoint.id)).toBeUndefined();
    });

    it('should return false for non-existent checkpoint', async () => {
      const result = await service.deleteCheckpoint('non-existent');
      expect(result).toBe(false);
    });

    it('should remove checkpoint file', async () => {
      const checkpoint = await service.createCheckpoint({
        name: 'file-delete',
        reason: 'manual',
      });

      const checkpointPath = join(TEST_ROOT, '.ccg', 'checkpoints', `${checkpoint.id}.json`);
      expect(existsSync(checkpointPath)).toBe(true);

      await service.deleteCheckpoint(checkpoint.id);
      expect(existsSync(checkpointPath)).toBe(false);
    });
  });

  describe('checkpoint limit enforcement', () => {
    it('should enforce max checkpoints', async () => {
      const limitedService = new ResourceService(
        {
          enabled: true,
          warningThreshold: 70,
          pauseThreshold: 85,
          checkpoints: {
            auto: false,
            thresholds: [],
            maxCheckpoints: 3,
          },
        },
        mockEventBus,
        mockLogger,
        TEST_ROOT
      );
      await limitedService.initialize();

      // Create more than max
      await limitedService.createCheckpoint({ name: 'cp-1', reason: 'manual' });
      await limitedService.createCheckpoint({ name: 'cp-2', reason: 'manual' });
      await limitedService.createCheckpoint({ name: 'cp-3', reason: 'manual' });
      await limitedService.createCheckpoint({ name: 'cp-4', reason: 'manual' });

      const checkpoints = limitedService.listCheckpoints();
      expect(checkpoints.length).toBe(3);
      // Oldest should be removed
      expect(checkpoints.find(c => c.name === 'cp-1')).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      RESUME STATE PROVIDER
  // ═══════════════════════════════════════════════════════════════

  describe('resumeStateProvider', () => {
    it('should use provider when creating checkpoint', async () => {
      const mockProvider = {
        getCurrentTask: vi.fn().mockResolvedValue({ id: 'task-1', name: 'Test Task', status: 'in_progress' }),
        getActiveLatentContext: vi.fn().mockResolvedValue({ taskId: 'latent-1', phase: 'impl' }),
        getRecentFailures: vi.fn().mockResolvedValue([]),
      };

      service.setResumeStateProvider(mockProvider);

      const checkpoint = await service.createCheckpoint({
        name: 'provider-test',
        reason: 'manual',
      });

      const restored = await service.restoreCheckpoint(checkpoint.id);

      expect(restored?.resumeState?.currentTaskId).toBe('task-1');
      expect(restored?.resumeState?.currentTaskName).toBe('Test Task');
      expect(restored?.resumeState?.activeLatentTaskId).toBe('latent-1');
      expect(restored?.resumeState?.activeLatentPhase).toBe('impl');
    });

    it('should handle provider errors gracefully', async () => {
      const mockProvider = {
        getCurrentTask: vi.fn().mockRejectedValue(new Error('Provider error')),
        getActiveLatentContext: vi.fn().mockRejectedValue(new Error('Provider error')),
        getRecentFailures: vi.fn().mockRejectedValue(new Error('Provider error')),
      };

      service.setResumeStateProvider(mockProvider);

      // Should not throw
      const checkpoint = await service.createCheckpoint({
        name: 'error-test',
        reason: 'manual',
      });

      expect(checkpoint).toBeDefined();
    });
  });

  describe('getLatestResumeState', () => {
    it('should return null when no checkpoints', async () => {
      const state = await service.getLatestResumeState();
      expect(state).toBeNull();
    });

    it('should return resume state from latest checkpoint', async () => {
      await service.createCheckpoint({
        name: 'with-resume',
        reason: 'manual',
        nextActions: ['Do something'],
        summary: 'Test summary',
      });

      const state = await service.getLatestResumeState();

      expect(state).toBeDefined();
      expect(state?.summary).toBe('Test summary');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      EVENTS
  // ═══════════════════════════════════════════════════════════════

  describe('events', () => {
    it('should emit warning event at warning threshold', () => {
      const emitSpy = vi.spyOn(mockEventBus, 'emit');

      // Enable auto checkpoints for threshold checking
      const autoService = new ResourceService(
        {
          enabled: true,
          warningThreshold: 70,
          pauseThreshold: 85,
          checkpoints: { auto: true, thresholds: [50, 70, 85], maxCheckpoints: 10 },
        },
        mockEventBus,
        mockLogger,
        TEST_ROOT
      );

      autoService.updateTokenUsage(150000); // 75%

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'resource:warning',
        })
      );
    });

    it('should emit critical event at pause threshold', () => {
      const emitSpy = vi.spyOn(mockEventBus, 'emit');

      const autoService = new ResourceService(
        {
          enabled: true,
          warningThreshold: 70,
          pauseThreshold: 85,
          checkpoints: { auto: true, thresholds: [50, 70, 85], maxCheckpoints: 10 },
        },
        mockEventBus,
        mockLogger,
        TEST_ROOT
      );

      autoService.updateTokenUsage(180000); // 90%

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'resource:critical',
        })
      );
    });

    it('should emit governor critical event', () => {
      const emitSpy = vi.spyOn(mockEventBus, 'emit');

      service.updateTokenUsage(175000); // ~88%
      service.getGovernorState(); // Trigger governor check

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'resource:governor:critical',
        })
      );
    });
  });
});
