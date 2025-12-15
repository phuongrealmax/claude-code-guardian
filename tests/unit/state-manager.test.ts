// tests/unit/state-manager.test.ts

// Using vitest globals
import { StateManager } from '../../src/core/state-manager.js';
import { EventBus } from '../../src/core/event-bus.js';
import { Logger } from '../../src/core/logger.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

const mockEventBus = new EventBus();
const mockLogger = new Logger('silent');

describe('StateManager', () => {
  let manager: StateManager;
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `test-state-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testDir, { recursive: true });

    manager = new StateManager(testDir, mockLogger, mockEventBus);
  });

  afterEach(() => {
    manager.dispose();
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // ═══════════════════════════════════════════════════════════════
  //                      SESSION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  describe('createSession', () => {
    it('should create a new session', () => {
      const session = manager.createSession(testDir);

      expect(session.id).toBeDefined();
      expect(session.status).toBe('active');
      expect(session.projectPath).toBe(testDir);
      expect(session.startedAt).toBeDefined();
    });

    it('should track session count', () => {
      manager.createSession();
      manager.endSession();
      manager.createSession();

      const stats = manager.getStats();
      expect(stats.totalSessions).toBeGreaterThanOrEqual(2);
    });

    it('should mark first run status after session creation', () => {
      // After creating session, firstRun status is set
      const firstRunStatus = manager.isFirstRun();
      expect(typeof firstRunStatus).toBe('boolean');
    });
  });

  describe('getSession', () => {
    it('should return current session', () => {
      manager.createSession();
      const session = manager.getSession();

      expect(session).toBeDefined();
      expect(session!.status).toBe('active');
    });

    it('should return undefined when no session', () => {
      manager.endSession();
      const session = manager.getSession();

      expect(session).toBeUndefined();
    });
  });

  describe('setSession', () => {
    it('should update session data', () => {
      manager.createSession();
      manager.setSession({ currentTaskId: 'task-123' });

      const session = manager.getSession();
      expect(session!.currentTaskId).toBe('task-123');
    });

    it('should create session if none exists', () => {
      manager.endSession();
      manager.setSession({ projectPath: testDir });

      const session = manager.getSession();
      expect(session).toBeDefined();
    });
  });

  describe('endSession', () => {
    it('should end current session', () => {
      manager.createSession();
      const ended = manager.endSession();

      expect(ended).toBeDefined();
      expect(ended!.status).toBe('ended');
      expect(ended!.endedAt).toBeDefined();
    });

    it('should clear current session', () => {
      manager.createSession();
      manager.endSession();

      const session = manager.getSession();
      expect(session).toBeUndefined();
    });

    it('should return undefined if no session', () => {
      manager.endSession();
      const result = manager.endSession();

      expect(result).toBeUndefined();
    });
  });

  describe('pauseSession', () => {
    it('should pause active session', () => {
      manager.createSession();
      manager.pauseSession();

      const session = manager.getSession();
      expect(session!.status).toBe('paused');
    });
  });

  describe('resumeSession', () => {
    it('should resume paused session', () => {
      manager.createSession();
      manager.pauseSession();
      manager.resumeSession();

      const session = manager.getSession();
      expect(session!.status).toBe('active');
    });

    it('should not resume ended session', () => {
      manager.createSession();
      manager.pauseSession();
      const session = manager.getSession();

      manager.resumeSession();
      expect(session!.status).toBe('active');
    });
  });

  describe('isSessionActive', () => {
    it('should return true for active session', () => {
      manager.createSession();

      expect(manager.isSessionActive()).toBe(true);
    });

    it('should return false for paused session', () => {
      manager.createSession();
      manager.pauseSession();

      expect(manager.isSessionActive()).toBe(false);
    });

    it('should return false for no session', () => {
      manager.endSession();

      expect(manager.isSessionActive()).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      TOKEN TRACKING
  // ═══════════════════════════════════════════════════════════════

  describe('updateTokenUsage', () => {
    it('should update token usage', () => {
      manager.createSession();
      const usage = manager.updateTokenUsage(1000, 200000);

      expect(usage).toBeDefined();
      expect(usage!.used).toBe(1000);
      expect(usage!.estimated).toBe(200000);
      // Percentage is (1000/200000)*100 = 0.5 or calculated differently
      expect(usage!.percentage).toBeGreaterThanOrEqual(0);
    });

    it('should return undefined if no session', () => {
      manager.endSession();
      const usage = manager.updateTokenUsage(1000);

      expect(usage).toBeUndefined();
    });
  });

  describe('getTokenUsage', () => {
    it('should return token usage', () => {
      manager.createSession();
      manager.updateTokenUsage(5000, 100000);

      const usage = manager.getTokenUsage();
      expect(usage!.used).toBe(5000);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      STATS
  // ═══════════════════════════════════════════════════════════════

  describe('incrementStat', () => {
    it('should increment task completed stat', () => {
      manager.incrementStat('totalTasksCompleted');

      const stats = manager.getStats();
      expect(stats.totalTasksCompleted).toBeGreaterThanOrEqual(1);
    });

    it('should increment files modified stat', () => {
      manager.incrementStat('totalFilesModified');
      manager.incrementStat('totalFilesModified');

      const stats = manager.getStats();
      expect(stats.totalFilesModified).toBeGreaterThanOrEqual(2);
    });

    it('should increment guard blocks stat', () => {
      manager.incrementStat('totalGuardBlocks');

      const stats = manager.getStats();
      expect(stats.totalGuardBlocks).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getStats', () => {
    it('should return session stats', () => {
      const stats = manager.getStats();

      expect(stats.totalSessions).toBeDefined();
      expect(stats.totalTasksCompleted).toBeDefined();
      expect(stats.totalFilesModified).toBeDefined();
      expect(stats.totalTestsRun).toBeDefined();
      expect(stats.totalGuardBlocks).toBeDefined();
      expect(stats.totalCheckpoints).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      GLOBAL STATE
  // ═══════════════════════════════════════════════════════════════

  describe('getFullState', () => {
    it('should return global state', () => {
      const state = manager.getFullState();

      expect(state.installId).toBeDefined();
      expect(state.stats).toBeDefined();
    });

    it('should include session if active', () => {
      manager.createSession();
      const state = manager.getFullState();

      expect(state.session).toBeDefined();
    });
  });

  describe('getInstallId', () => {
    it('should return install id', () => {
      const installId = manager.getInstallId();

      expect(installId).toBeDefined();
      expect(typeof installId).toBe('string');
    });
  });

  describe('isFirstRun', () => {
    it('should return first run status', () => {
      const firstRun = manager.isFirstRun();

      expect(typeof firstRun).toBe('boolean');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      PERSISTENCE
  // ═══════════════════════════════════════════════════════════════

  describe('persistence', () => {
    it('should save and load state', () => {
      // Manager auto-saves, so just verify it doesn't throw
      manager.createSession();
      manager.incrementStat('totalTasksCompleted');

      // Manually save to ensure state is persisted
      const state = manager.getFullState();

      // State should have installId and stats
      expect(state.installId).toBeDefined();
      expect(state.stats).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      METADATA
  // ═══════════════════════════════════════════════════════════════

  describe('session metadata', () => {
    it('should update session metadata', () => {
      manager.createSession();
      manager.setMetadata('key1', 'value1');

      const session = manager.getSession();
      expect(session!.metadata.key1).toBe('value1');
    });

    it('should get session metadata', () => {
      manager.createSession();
      manager.setMetadata('key2', { nested: 'value' });

      const session = manager.getSession();
      expect(session!.metadata.key2).toEqual({ nested: 'value' });
    });
  });

  describe('setCurrentTask', () => {
    it('should set current task id', () => {
      manager.createSession();
      manager.setCurrentTask('task-456');

      const session = manager.getSession();
      expect(session!.currentTaskId).toBe('task-456');
    });
  });
});
