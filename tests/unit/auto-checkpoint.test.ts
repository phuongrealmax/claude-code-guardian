// tests/unit/auto-checkpoint.test.ts
// Unit tests for AutoCheckpointService

import { vi } from 'vitest';
import {
  AutoCheckpointService,
  AutoCheckpointConfig,
  DEFAULT_AUTO_CHECKPOINT_CONFIG,
} from '../../src/modules/resource/index.js';
import { GuardService } from '../../src/modules/guard/index.js';
import { ResourceService } from '../../src/modules/resource/resource.service.js';
import { EventBus } from '../../src/core/event-bus.js';
import { Logger } from '../../src/core/logger.js';
import { GuardModuleConfig, ResourceModuleConfig } from '../../src/core/types.js';

describe('AutoCheckpointService', () => {
  let service: AutoCheckpointService;
  let guardService: GuardService;
  let resourceService: ResourceService;
  let mockEventBus: EventBus;
  let mockLogger: Logger;
  let config: AutoCheckpointConfig;

  const guardConfig: GuardModuleConfig = {
    enabled: true,
    strictMode: false,
    rules: {
      blockFakeTests: false,
      blockDisabledFeatures: false,
      blockEmptyCatch: false,
      blockEmojiInCode: false,
    },
  };

  const resourceConfig: ResourceModuleConfig = {
    enabled: true,
    warningThreshold: 70,
    pauseThreshold: 85,
    checkpoints: {
      auto: true,
      maxCheckpoints: 10,
      thresholds: [50, 70, 85],
    },
  };

  beforeEach(async () => {
    mockEventBus = {
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    } as unknown as EventBus;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn().mockReturnThis(),
    } as unknown as Logger;

    guardService = new GuardService(guardConfig, mockEventBus, mockLogger);
    await guardService.initialize();

    resourceService = new ResourceService(resourceConfig, mockEventBus, mockLogger);

    // Mock resourceService.createCheckpoint to avoid file system operations
    vi.spyOn(resourceService, 'createCheckpoint').mockResolvedValue({
      id: 'test-checkpoint-id',
      name: 'test-checkpoint',
      createdAt: new Date(),
      tokenUsage: 1000,
      reason: 'before_risky_operation',
      size: 100,
    });

    config = { ...DEFAULT_AUTO_CHECKPOINT_CONFIG };

    service = new AutoCheckpointService(
      config,
      guardService,
      resourceService,
      mockEventBus,
      mockLogger
    );

    await service.initialize();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  //                      BASIC FUNCTIONALITY
  // ═══════════════════════════════════════════════════════════════

  describe('Basic Functionality', () => {
    it('should initialize successfully', async () => {
      expect(service.getStats().enabled).toBe(true);
    });

    it('should track checkpoint count', async () => {
      await service.checkAndAutoCheckpoint('git reset --hard');
      const stats = service.getStats();
      expect(stats.checkpointCount).toBe(1);
    });

    it('should track last checkpoint time', async () => {
      await service.checkAndAutoCheckpoint('git reset --hard');
      const stats = service.getStats();
      expect(stats.lastCheckpointTime).not.toBeNull();
    });

    it('should report trigger levels', () => {
      const stats = service.getStats();
      expect(stats.triggerLevels).toContain('HIGH');
      expect(stats.triggerLevels).toContain('BLOCK');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      HIGH RISK OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  describe('HIGH Risk Operations', () => {
    it('should create checkpoint for git reset --hard', async () => {
      const result = await service.checkAndAutoCheckpoint('git reset --hard');

      expect(result.risk.level).toBe('HIGH');
      expect(result.checkpointCreated).toBe(true);
      expect(result.blocked).toBe(false);
      expect(result.checkpoint).toBeDefined();
    });

    it('should create checkpoint for rm -rf', async () => {
      const result = await service.checkAndAutoCheckpoint('rm -rf ./build');

      expect(result.risk.level).toBe('HIGH');
      expect(result.checkpointCreated).toBe(true);
    });

    it('should create checkpoint for DROP TABLE', async () => {
      const result = await service.checkAndAutoCheckpoint('DROP TABLE users');

      expect(result.risk.level).toBe('HIGH');
      expect(result.checkpointCreated).toBe(true);
    });

    it('should emit checkpoint event for HIGH risk', async () => {
      await service.checkAndAutoCheckpoint('git reset --hard');

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'resource:checkpoint',
          data: expect.objectContaining({
            trigger: 'risky_operation',
            riskLevel: 'HIGH',
          }),
        })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      BLOCK LEVEL OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  describe('BLOCK Level Operations', () => {
    it('should create checkpoint and block rm -rf /', async () => {
      const result = await service.checkAndAutoCheckpoint('rm -rf /');

      expect(result.risk.level).toBe('BLOCK');
      expect(result.checkpointCreated).toBe(true);
      expect(result.blocked).toBe(true);
    });

    it('should emit block event for BLOCK level', async () => {
      await service.checkAndAutoCheckpoint('rm -rf /');

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'guard:block',
          data: expect.objectContaining({
            risk: expect.objectContaining({ level: 'BLOCK' }),
          }),
        })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      LOW/MEDIUM RISK - NO CHECKPOINT
  // ═══════════════════════════════════════════════════════════════

  describe('LOW/MEDIUM Risk - No Checkpoint', () => {
    it('should NOT create checkpoint for git status', async () => {
      const result = await service.checkAndAutoCheckpoint('git status');

      expect(result.risk.level).toBe('LOW');
      expect(result.checkpointCreated).toBe(false);
      expect(result.blocked).toBe(false);
    });

    it('should NOT create checkpoint for ls command', async () => {
      const result = await service.checkAndAutoCheckpoint('ls -la');

      expect(result.risk.level).toBe('LOW');
      expect(result.checkpointCreated).toBe(false);
    });

    it('should NOT create checkpoint for git merge (MEDIUM)', async () => {
      const result = await service.checkAndAutoCheckpoint('git merge feature');

      expect(result.risk.level).toBe('MEDIUM');
      expect(result.checkpointCreated).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      THROTTLING
  // ═══════════════════════════════════════════════════════════════

  describe('Throttling', () => {
    it('should throttle checkpoints within min interval', async () => {
      // First checkpoint
      const result1 = await service.checkAndAutoCheckpoint('git reset --hard');
      expect(result1.checkpointCreated).toBe(true);

      // Second checkpoint immediately after - should be throttled
      const result2 = await service.checkAndAutoCheckpoint('git push --force');
      expect(result2.checkpointCreated).toBe(false);
      expect(result2.reason).toContain('Too soon');
    });

    it('should allow checkpoint after interval passes', async () => {
      // Create service with very short interval
      const shortIntervalConfig = { ...config, minIntervalMs: 10 };
      const shortService = new AutoCheckpointService(
        shortIntervalConfig,
        guardService,
        resourceService,
        mockEventBus,
        mockLogger
      );
      await shortService.initialize();

      // First checkpoint
      await shortService.checkAndAutoCheckpoint('git reset --hard');

      // Wait for interval to pass
      await new Promise(resolve => setTimeout(resolve, 20));

      // Second checkpoint - should be allowed
      const result2 = await shortService.checkAndAutoCheckpoint('git push --force');
      expect(result2.checkpointCreated).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      DISABLED STATE
  // ═══════════════════════════════════════════════════════════════

  describe('Disabled State', () => {
    it('should not create checkpoint when disabled', async () => {
      const disabledConfig = { ...config, enabled: false };
      const disabledService = new AutoCheckpointService(
        disabledConfig,
        guardService,
        resourceService,
        mockEventBus,
        mockLogger
      );

      const result = await disabledService.checkAndAutoCheckpoint('git reset --hard');

      expect(result.checkpointCreated).toBe(false);
      expect(result.reason).toContain('disabled');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      GIT OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  describe('Git Operations', () => {
    it('should handle git operation with checkGitOperation', async () => {
      const result = await service.checkGitOperation('git reset --hard', ['src/index.ts']);

      expect(result.risk.level).toBe('HIGH');
      expect(result.checkpointCreated).toBe(true);
    });

    it('should skip git checkpoint when disabled', async () => {
      const noGitConfig = { ...config, checkpointOnGit: false };
      const noGitService = new AutoCheckpointService(
        noGitConfig,
        guardService,
        resourceService,
        mockEventBus,
        mockLogger
      );

      const result = await noGitService.checkGitOperation('git reset --hard');

      expect(result.checkpointCreated).toBe(false);
      expect(result.reason).toContain('disabled');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      LARGE EDITS
  // ═══════════════════════════════════════════════════════════════

  describe('Large Edits', () => {
    it('should create checkpoint for large edit above threshold', async () => {
      const result = await service.checkLargeEdit(
        ['src/index.ts', 'src/utils.ts'],
        150, // Above default 100 threshold
        'Refactoring core modules'
      );

      expect(result.checkpointCreated).toBe(true);
    });

    it('should NOT create checkpoint for small edit', async () => {
      const result = await service.checkLargeEdit(
        ['src/index.ts'],
        50, // Below default 100 threshold
      );

      expect(result.checkpointCreated).toBe(false);
      expect(result.reason).toContain('below threshold');
    });

    it('should skip large edit checkpoint when disabled', async () => {
      const noEditConfig = { ...config, checkpointOnLargeEdit: false };
      const noEditService = new AutoCheckpointService(
        noEditConfig,
        guardService,
        resourceService,
        mockEventBus,
        mockLogger
      );

      const result = await noEditService.checkLargeEdit(['src/index.ts'], 500);

      expect(result.checkpointCreated).toBe(false);
      expect(result.reason).toContain('disabled');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      BATCH RISK CHECK
  // ═══════════════════════════════════════════════════════════════

  describe('Batch Risk Check', () => {
    it('should identify highest risk in batch', async () => {
      const commands = [
        'git status',      // LOW
        'git merge main',  // MEDIUM
        'git reset --hard', // HIGH
      ];

      const result = await service.checkBatchRisk(commands);

      expect(result.highestRisk).toBe('HIGH');
      expect(result.shouldCheckpoint).toBe(true);
      expect(result.riskyCommands.length).toBe(1);
    });

    it('should not require checkpoint for safe batch', async () => {
      const commands = [
        'git status',
        'git log',
        'ls -la',
      ];

      const result = await service.checkBatchRisk(commands);

      expect(result.highestRisk).toBe('LOW');
      expect(result.shouldCheckpoint).toBe(false);
      expect(result.riskyCommands.length).toBe(0);
    });

    it('should identify BLOCK level in batch', async () => {
      const commands = [
        'git status',
        'rm -rf /',  // BLOCK
      ];

      const result = await service.checkBatchRisk(commands);

      expect(result.highestRisk).toBe('BLOCK');
      expect(result.shouldCheckpoint).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      CHECKPOINT METADATA
  // ═══════════════════════════════════════════════════════════════

  describe('Checkpoint Metadata', () => {
    it('should include risk info in checkpoint metadata', async () => {
      await service.checkAndAutoCheckpoint('git reset --hard');

      expect(resourceService.createCheckpoint).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: 'before_risky_operation',
          metadata: expect.objectContaining({
            riskLevel: 'HIGH',
            riskCategory: 'git',
          }),
        })
      );
    });

    it('should include files in checkpoint metadata when provided', async () => {
      await service.checkAndAutoCheckpoint('git reset --hard', {
        files: ['src/index.ts', 'src/utils.ts'],
      });

      expect(resourceService.createCheckpoint).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            files: ['src/index.ts', 'src/utils.ts'],
          }),
        })
      );
    });

    it('should truncate long actions in metadata', async () => {
      const longAction = 'git reset --hard ' + 'x'.repeat(1000);
      await service.checkAndAutoCheckpoint(longAction);

      expect(resourceService.createCheckpoint).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            action: expect.any(String),
          }),
        })
      );

      const callArgs = (resourceService.createCheckpoint as any).mock.calls[0][0];
      expect(callArgs.metadata.action.length).toBeLessThanOrEqual(500);
    });
  });
});
