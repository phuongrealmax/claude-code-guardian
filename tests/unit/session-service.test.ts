// tests/unit/session-service.test.ts
// SessionService Unit Tests

import { vi } from 'vitest';
import { SessionService } from '../../src/modules/session/session.service.js';
import { EventBus } from '../../src/core/event-bus.js';
import { Logger } from '../../src/core/logger.js';
import { DEFAULT_SESSION_CONFIG } from '../../src/modules/session/session.types.js';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs
vi.mock('fs', () => ({
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  renameSync: vi.fn(),
  readdirSync: vi.fn(),
  statSync: vi.fn(),
}));

describe('SessionService', () => {
  let service: SessionService;
  let mockEventBus: EventBus;
  let mockLogger: Logger;

  beforeEach(() => {
    vi.clearAllMocks();

    mockEventBus = {
      on: vi.fn().mockReturnValue('sub-id'),
      off: vi.fn(),
      emit: vi.fn(),
    } as unknown as EventBus;

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as unknown as Logger;

    // Default fs mocks
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue([]);

    service = new SessionService(
      DEFAULT_SESSION_CONFIG,
      mockEventBus,
      mockLogger,
      '/test/project'
    );
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('constructor', () => {
    it('creates service with config', () => {
      expect(service).toBeDefined();
      expect(service.getSessionId()).toBeDefined();
    });

    it('generates unique session ID', () => {
      const service2 = new SessionService(
        DEFAULT_SESSION_CONFIG,
        mockEventBus,
        mockLogger,
        '/test/project'
      );
      expect(service.getSessionId()).not.toBe(service2.getSessionId());
    });
  });

  describe('initialize()', () => {
    it('creates session directory if not exists', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await service.initialize();

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('.ccg'),
        { recursive: true }
      );
    });

    it('sets up event listeners when autoSave enabled', async () => {
      await service.initialize();

      expect(mockEventBus.on).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Session module initialized')
      );
    });

    it('skips initialization when disabled', async () => {
      const disabledService = new SessionService(
        { ...DEFAULT_SESSION_CONFIG, enabled: false },
        mockEventBus,
        mockLogger,
        '/test/project'
      );

      await disabledService.initialize();

      expect(mockEventBus.on).not.toHaveBeenCalled();
    });
  });

  describe('getState()', () => {
    it('returns current session state', () => {
      const state = service.getState();

      expect(state.version).toBe('1');
      expect(state.sessionId).toBeDefined();
      expect(state.createdAt).toBeDefined();
      expect(state.updatedAt).toBeDefined();
      expect(state.timeline).toEqual([]);
    });
  });

  describe('getStatus()', () => {
    it('returns session status', () => {
      const status = service.getStatus();

      expect(status.sessionId).toBeDefined();
      expect(status.createdAt).toBeDefined();
      expect(status.timelineCount).toBe(0);
      expect(status.dirty).toBe(false);
      expect(status.autoSaveEnabled).toBe(true);
    });
  });

  describe('recordEvent()', () => {
    it('adds event to timeline', () => {
      service.recordEvent({
        ts: new Date().toISOString(),
        type: 'test:event',
        summary: 'Test event',
      });

      const state = service.getState();
      expect(state.timeline.length).toBe(1);
      expect(state.timeline[0].type).toBe('test:event');
    });

    it('trims timeline when exceeds max', () => {
      // Add more than maxTimelineEvents
      for (let i = 0; i < 350; i++) {
        service.recordEvent({
          ts: new Date().toISOString(),
          type: `test:event:${i}`,
        });
      }

      const state = service.getState();
      expect(state.timeline.length).toBe(DEFAULT_SESSION_CONFIG.maxTimelineEvents);
    });

    it('marks state as dirty', () => {
      service.recordEvent({
        ts: new Date().toISOString(),
        type: 'test:event',
      });

      expect(service.getStatus().dirty).toBe(true);
    });
  });

  describe('getTimeline()', () => {
    beforeEach(() => {
      for (let i = 0; i < 100; i++) {
        service.recordEvent({
          ts: new Date().toISOString(),
          type: `test:event:${i}`,
        });
      }
    });

    it('returns last N events', () => {
      const events = service.getTimeline(10);
      expect(events.length).toBe(10);
      expect(events[9].type).toBe('test:event:99');
    });

    it('defaults to 50 events', () => {
      const events = service.getTimeline();
      expect(events.length).toBe(50);
    });

    it('respects max limit', () => {
      const events = service.getTimeline(500);
      expect(events.length).toBeLessThanOrEqual(DEFAULT_SESSION_CONFIG.maxTimelineEvents);
    });
  });

  describe('save()', () => {
    it('writes session to file', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const savedPath = await service.save();

      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(fs.renameSync).toHaveBeenCalled();
      expect(savedPath).toContain('session-');
    });

    it('creates directory if not exists', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await service.save();

      expect(fs.mkdirSync).toHaveBeenCalled();
    });

    it('clears dirty flag after save', async () => {
      service.recordEvent({
        ts: new Date().toISOString(),
        type: 'test:event',
      });
      expect(service.getStatus().dirty).toBe(true);

      await service.save();

      expect(service.getStatus().dirty).toBe(false);
    });
  });

  describe('loadFromFile()', () => {
    const mockSessionData = {
      version: '1' as const,
      sessionId: 'test-session-id',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T01:00:00.000Z',
      modules: {},
      latestCheckpointId: 'cp-123',
      timeline: [
        { ts: '2024-01-01T00:30:00.000Z', type: 'task:complete', summary: 'Test' },
      ],
      metadata: { resumeCount: 1 },
    };

    it('loads session from file', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockSessionData));

      const loaded = await service.loadFromFile('/test/session.json');

      expect(loaded.sessionId).toBe('test-session-id');
      expect(loaded.timeline.length).toBe(1);
    });

    it('throws on invalid version', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        version: '2',
        sessionId: 'test',
      }));

      await expect(service.loadFromFile('/test/session.json'))
        .rejects.toThrow('Invalid session file');
    });

    it('throws on missing sessionId', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        version: '1',
      }));

      await expect(service.loadFromFile('/test/session.json'))
        .rejects.toThrow('Invalid session file');
    });

    it('throws on file not found', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await expect(service.loadFromFile('/test/session.json'))
        .rejects.toThrow('Session file not found');
    });

    it('increments resume count', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockSessionData));

      const loaded = await service.loadFromFile('/test/session.json');

      expect(loaded.metadata?.resumeCount).toBe(2);
    });
  });

  describe('findLatestSession()', () => {
    it('returns null when no sessions exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([]);

      expect(service.findLatestSession()).toBeNull();
    });

    it('returns null when directory not exists', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      expect(service.findLatestSession()).toBeNull();
    });

    it('returns most recent session file', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        'session-old.json',
        'session-new.json',
        'other-file.txt',
      ] as any);
      vi.mocked(fs.statSync)
        .mockReturnValueOnce({ mtime: new Date('2024-01-01') } as any)
        .mockReturnValueOnce({ mtime: new Date('2024-01-02') } as any);

      const result = service.findLatestSession();

      expect(result).toContain('session-new.json');
    });
  });

  describe('getResumeOffer()', () => {
    it('returns unavailable when no sessions', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([]);

      const offer = service.getResumeOffer();

      expect(offer.available).toBe(false);
    });

    it('returns resume offer with session info', () => {
      const mockSession = {
        version: '1',
        sessionId: 'resume-session',
        updatedAt: '2024-01-01T00:00:00.000Z',
        timeline: [
          { ts: '2024-01-01T00:00:00.000Z', type: 'task:complete', summary: 'Last task' },
        ],
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['session-test.json'] as any);
      vi.mocked(fs.statSync).mockReturnValue({ mtime: new Date() } as any);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockSession));

      const offer = service.getResumeOffer();

      expect(offer.available).toBe(true);
      expect(offer.sessionId).toBe('resume-session');
      expect(offer.taskInProgress).toBe('Last task');
    });
  });

  describe('replay()', () => {
    beforeEach(() => {
      for (let i = 0; i < 10; i++) {
        service.recordEvent({
          ts: new Date().toISOString(),
          type: `event:${i}`,
        });
      }
    });

    it('returns all events by default', () => {
      const result = service.replay();

      expect(result.count).toBe(10);
      expect(result.events.length).toBe(10);
    });

    it('slices from index', () => {
      const result = service.replay({ from: 5 });

      expect(result.count).toBe(5);
      expect(result.events[0].type).toBe('event:5');
    });

    it('slices to index', () => {
      const result = service.replay({ to: 3 });

      expect(result.count).toBe(3);
      expect(result.events[2].type).toBe('event:2');
    });

    it('slices range', () => {
      const result = service.replay({ from: 2, to: 5 });

      expect(result.count).toBe(3);
    });
  });

  describe('exportToFile()', () => {
    it('saves and returns path', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = await service.exportToFile('/test/export.json');

      expect(result.outputPath).toBe('/test/export.json');
      expect(result.sessionId).toBeDefined();
      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('shutdown()', () => {
    it('saves dirty state', async () => {
      service.recordEvent({
        ts: new Date().toISOString(),
        type: 'test:event',
      });

      await service.shutdown();

      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('unsubscribes from events', async () => {
      await service.initialize();

      await service.shutdown();

      expect(mockEventBus.off).toHaveBeenCalled();
    });
  });

  describe('setModules()', () => {
    it('sets module providers', () => {
      const mockModules = {
        workflow: { exportSessionState: vi.fn() },
        latent: { exportSessionState: vi.fn() },
      };

      service.setModules(mockModules);

      expect(mockLogger.debug).toHaveBeenCalledWith('Session modules registered');
    });
  });

  describe('hydrateFromModules()', () => {
    it('calls exportSessionState on modules', async () => {
      const mockWorkflow = { exportSessionState: vi.fn().mockResolvedValue({ tasks: [] }) };
      const mockLatent = { exportSessionState: vi.fn().mockResolvedValue({ contexts: [] }) };

      service.setModules({
        workflow: mockWorkflow,
        latent: mockLatent,
      });

      await service.hydrateFromModules();

      expect(mockWorkflow.exportSessionState).toHaveBeenCalled();
      expect(mockLatent.exportSessionState).toHaveBeenCalled();
    });

    it('handles modules without exportSessionState', async () => {
      service.setModules({
        workflow: {},
      });

      await expect(service.hydrateFromModules()).resolves.not.toThrow();
    });
  });
});
