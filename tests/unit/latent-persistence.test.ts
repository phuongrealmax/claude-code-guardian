// tests/unit/latent-persistence.test.ts

import { vi } from 'vitest';
import { ContextPersistence, PersistedData } from '../../src/modules/latent/latent-persistence.js';
import { AgentLatentContext, ContextHistoryEntry } from '../../src/modules/latent/latent.types.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('latent-persistence', () => {
  let testDir: string;
  let persistPath: string;
  let persistence: ContextPersistence;

  // Mock logger
  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setLevel: vi.fn(),
    child: vi.fn(() => mockLogger),
  };

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `test-latent-persistence-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testDir, { recursive: true });
    persistPath = path.join(testDir, 'latent-contexts.json');
    persistence = new ContextPersistence(persistPath, mockLogger as any);
    vi.clearAllMocks();
  });

  afterEach(() => {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // ═══════════════════════════════════════════════════════════════
  //                      Helper Functions
  // ═══════════════════════════════════════════════════════════════

  const createContext = (taskId: string): AgentLatentContext => ({
    taskId,
    phase: 'analysis',
    version: 1,
    codeMap: { files: [], hotSpots: [], components: [] },
    constraints: [],
    risks: [],
    decisions: [],
    artifacts: {},
    metadata: { phaseHistory: [] },
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
  });

  const createHistoryEntry = (): ContextHistoryEntry => ({
    timestamp: new Date('2024-01-15T10:00:00Z'),
    agentId: 'test-agent',
    operation: 'update',
    phase: 'analysis',
    deltaKeys: ['decisions'],
  });

  // ═══════════════════════════════════════════════════════════════
  //                      save() tests
  // ═══════════════════════════════════════════════════════════════

  describe('save', () => {
    it('should save empty contexts', async () => {
      const contexts = new Map<string, AgentLatentContext>();
      const history = new Map<string, ContextHistoryEntry[]>();
      const stats = {
        totalCreated: 0,
        totalDeltasMerged: 0,
        totalPatchesApplied: 0,
        phaseStats: {},
      };

      await persistence.save(contexts, history, stats);

      expect(fs.existsSync(persistPath)).toBe(true);
      const content = JSON.parse(fs.readFileSync(persistPath, 'utf-8'));
      expect(content.contexts).toEqual([]);
      expect(content.history).toEqual([]);
    });

    it('should save contexts with data', async () => {
      const contexts = new Map<string, AgentLatentContext>();
      contexts.set('task-1', createContext('task-1'));
      contexts.set('task-2', createContext('task-2'));

      const history = new Map<string, ContextHistoryEntry[]>();
      history.set('task-1', [createHistoryEntry()]);

      const stats = {
        totalCreated: 2,
        totalDeltasMerged: 5,
        totalPatchesApplied: 1,
        phaseStats: { analysis: 3, plan: 2 },
      };

      await persistence.save(contexts, history, stats);

      const content = JSON.parse(fs.readFileSync(persistPath, 'utf-8'));
      expect(content.contexts.length).toBe(2);
      expect(content.history.length).toBe(1);
      expect(content.stats.totalCreated).toBe(2);
    });

    it('should create directory if it does not exist', async () => {
      const nestedPath = path.join(testDir, 'nested', 'dir', 'contexts.json');
      const nestedPersistence = new ContextPersistence(nestedPath, mockLogger as any);

      const contexts = new Map<string, AgentLatentContext>();
      const history = new Map<string, ContextHistoryEntry[]>();
      const stats = {
        totalCreated: 0,
        totalDeltasMerged: 0,
        totalPatchesApplied: 0,
        phaseStats: {},
      };

      await nestedPersistence.save(contexts, history, stats);

      expect(fs.existsSync(nestedPath)).toBe(true);
    });

    it('should log debug message on success', async () => {
      const contexts = new Map<string, AgentLatentContext>();
      contexts.set('task-1', createContext('task-1'));

      const history = new Map<string, ContextHistoryEntry[]>();
      const stats = {
        totalCreated: 1,
        totalDeltasMerged: 0,
        totalPatchesApplied: 0,
        phaseStats: {},
      };

      await persistence.save(contexts, history, stats);

      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Persisted 1 contexts'));
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      load() tests
  // ═══════════════════════════════════════════════════════════════

  describe('load', () => {
    it('should return null if file does not exist', async () => {
      const result = await persistence.load();

      expect(result).toBeNull();
    });

    it('should load saved contexts', async () => {
      // First save some data
      const contexts = new Map<string, AgentLatentContext>();
      contexts.set('task-1', createContext('task-1'));

      const history = new Map<string, ContextHistoryEntry[]>();
      history.set('task-1', [createHistoryEntry()]);

      const stats = {
        totalCreated: 1,
        totalDeltasMerged: 3,
        totalPatchesApplied: 0,
        phaseStats: { analysis: 1 },
      };

      await persistence.save(contexts, history, stats);

      // Then load
      const result = await persistence.load();

      expect(result).not.toBeNull();
      expect(result!.contexts.length).toBe(1);
      expect(result!.contexts[0][0]).toBe('task-1');
      expect(result!.stats.totalCreated).toBe(1);
    });

    it('should restore Date objects for contexts', async () => {
      const contexts = new Map<string, AgentLatentContext>();
      contexts.set('task-1', createContext('task-1'));

      const history = new Map<string, ContextHistoryEntry[]>();
      const stats = {
        totalCreated: 1,
        totalDeltasMerged: 0,
        totalPatchesApplied: 0,
        phaseStats: {},
      };

      await persistence.save(contexts, history, stats);
      const result = await persistence.load();

      const loadedContext = result!.contexts[0][1];
      expect(loadedContext.createdAt).toBeInstanceOf(Date);
      expect(loadedContext.updatedAt).toBeInstanceOf(Date);
    });

    it('should restore Date objects for history entries', async () => {
      const contexts = new Map<string, AgentLatentContext>();
      contexts.set('task-1', createContext('task-1'));

      const history = new Map<string, ContextHistoryEntry[]>();
      history.set('task-1', [createHistoryEntry()]);

      const stats = {
        totalCreated: 1,
        totalDeltasMerged: 0,
        totalPatchesApplied: 0,
        phaseStats: {},
      };

      await persistence.save(contexts, history, stats);
      const result = await persistence.load();

      const loadedHistory = result!.history[0][1][0];
      expect(loadedHistory.timestamp).toBeInstanceOf(Date);
    });

    it('should log info message on successful load', async () => {
      const contexts = new Map<string, AgentLatentContext>();
      contexts.set('task-1', createContext('task-1'));

      const history = new Map<string, ContextHistoryEntry[]>();
      const stats = {
        totalCreated: 1,
        totalDeltasMerged: 0,
        totalPatchesApplied: 0,
        phaseStats: {},
      };

      await persistence.save(contexts, history, stats);
      await persistence.load();

      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Loaded 1 persisted contexts'));
    });

    it('should return null and log error for invalid JSON', async () => {
      fs.writeFileSync(persistPath, 'invalid json {{{');

      const result = await persistence.load();

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to load'));
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      Round-trip tests
  // ═══════════════════════════════════════════════════════════════

  describe('round-trip', () => {
    it('should preserve context data through save/load cycle', async () => {
      const originalContext = createContext('round-trip-task');
      originalContext.phase = 'impl';
      originalContext.version = 5;
      originalContext.constraints = ['constraint-1', 'constraint-2'];
      originalContext.risks = ['risk-1'];
      originalContext.decisions = [
        { id: 'D001', summary: 'Use JWT', rationale: 'Industry standard', phase: 'analysis' },
      ];

      const contexts = new Map<string, AgentLatentContext>();
      contexts.set(originalContext.taskId, originalContext);

      const history = new Map<string, ContextHistoryEntry[]>();
      const stats = {
        totalCreated: 1,
        totalDeltasMerged: 4,
        totalPatchesApplied: 0,
        phaseStats: { analysis: 1, plan: 1, impl: 2 },
      };

      await persistence.save(contexts, history, stats);
      const result = await persistence.load();

      const loadedContext = result!.contexts[0][1];
      expect(loadedContext.taskId).toBe('round-trip-task');
      expect(loadedContext.phase).toBe('impl');
      expect(loadedContext.version).toBe(5);
      expect(loadedContext.constraints).toEqual(['constraint-1', 'constraint-2']);
      expect(loadedContext.risks).toEqual(['risk-1']);
      expect(loadedContext.decisions.length).toBe(1);
      expect(loadedContext.decisions[0].id).toBe('D001');
    });

    it('should preserve stats through save/load cycle', async () => {
      const contexts = new Map<string, AgentLatentContext>();
      const history = new Map<string, ContextHistoryEntry[]>();
      const originalStats = {
        totalCreated: 10,
        totalDeltasMerged: 50,
        totalPatchesApplied: 5,
        phaseStats: { analysis: 10, plan: 15, impl: 20, review: 5 },
      };

      await persistence.save(contexts, history, originalStats);
      const result = await persistence.load();

      expect(result!.stats).toEqual(originalStats);
    });
  });
});
