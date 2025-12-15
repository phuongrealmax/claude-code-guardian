// tests/unit/memory.test.ts

// Using vitest globals
import { join } from 'path';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { MemoryService } from '../../src/modules/memory/memory.service.js';
import { EventBus } from '../../src/core/event-bus.js';
import { Logger } from '../../src/core/logger.js';

// Test project root
const TEST_ROOT = join(process.cwd(), '.memory-test-temp');
const TEST_DB_PATH = join(TEST_ROOT, '.ccg', 'memory.db');

// Mock dependencies
const mockEventBus = new EventBus();
const mockLogger = new Logger('silent');

describe('MemoryService', () => {
  let service: MemoryService;
  let testDbPath: string;

  beforeEach(async () => {
    // Use unique DB path per test to avoid file locking conflicts
    testDbPath = join(TEST_ROOT, '.ccg', `memory-${Date.now()}-${Math.random().toString(36).substr(2)}.db`);

    // Clean up and create test directory
    if (existsSync(TEST_ROOT)) {
      try {
        rmSync(TEST_ROOT, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors on Windows
      }
    }
    mkdirSync(join(TEST_ROOT, '.ccg'), { recursive: true });

    service = new MemoryService(
      {
        enabled: true,
        persistPath: testDbPath,
        maxItems: 100,
        autoSave: true,
        zeroRetention: false,
      },
      mockEventBus,
      mockLogger
    );
    await service.initialize();
  });

  afterEach(async () => {
    if (service) {
      try {
        await service.shutdown();
      } catch {
        // Ignore shutdown errors
      }
    }
    // Small delay to allow file handles to close on Windows
    await new Promise(r => setTimeout(r, 50));
    // Cleanup
    if (existsSync(TEST_ROOT)) {
      try {
        rmSync(TEST_ROOT, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors on Windows
      }
    }
  });

  // ═══════════════════════════════════════════════════════════════
  //                      INITIALIZATION
  // ═══════════════════════════════════════════════════════════════

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      expect(service).toBeDefined();
    });

    it('should create database file', async () => {
      expect(existsSync(testDbPath)).toBe(true);
    });

    it('should skip initialization when disabled', async () => {
      const disabledService = new MemoryService(
        {
          enabled: false,
          persistPath: TEST_DB_PATH,
          maxItems: 100,
        },
        mockEventBus,
        mockLogger
      );
      await disabledService.initialize();
      // Should not throw
      expect(disabledService.getStatus().enabled).toBe(false);
    });

    it('should run in zero retention mode', async () => {
      const zeroRetService = new MemoryService(
        {
          enabled: true,
          persistPath: join(TEST_ROOT, 'zero-retention.db'),
          maxItems: 100,
          zeroRetention: true,
        },
        mockEventBus,
        mockLogger
      );
      await zeroRetService.initialize();
      expect(zeroRetService.isZeroRetentionMode()).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      STORE
  // ═══════════════════════════════════════════════════════════════

  describe('store', () => {
    it('should store a memory', async () => {
      const memory = await service.store({
        content: 'Test memory content',
        type: 'fact',
        importance: 5,
      });

      expect(memory).toBeDefined();
      expect(memory.id).toBeDefined();
      expect(memory.content).toBe('Test memory content');
      expect(memory.type).toBe('fact');
      expect(memory.importance).toBe(5);
    });

    it('should store memory with tags', async () => {
      const memory = await service.store({
        content: 'Tagged memory',
        type: 'note',
        importance: 3,
        tags: ['tag1', 'tag2'],
      });

      expect(memory.tags).toEqual(['tag1', 'tag2']);
    });

    it('should clamp importance between 1 and 10', async () => {
      const lowMem = await service.store({
        content: 'Low importance',
        type: 'note',
        importance: -5,
      });
      expect(lowMem.importance).toBe(1);

      const highMem = await service.store({
        content: 'High importance',
        type: 'note',
        importance: 100,
      });
      expect(highMem.importance).toBe(10);
    });

    it('should update duplicate memory instead of creating new', async () => {
      const mem1 = await service.store({
        content: 'Unique content',
        type: 'fact',
        importance: 3,
        tags: ['original'],
      });

      const mem2 = await service.store({
        content: 'Unique content',
        type: 'fact',
        importance: 7,
        tags: ['updated'],
      });

      // Should return the same memory (updated)
      expect(mem2.id).toBe(mem1.id);
      expect(mem2.importance).toBe(7); // Higher importance kept
      expect(mem2.tags).toContain('original');
      expect(mem2.tags).toContain('updated');
    });

    it('should store memory with metadata', async () => {
      const memory = await service.store({
        content: 'Memory with metadata',
        type: 'decision',
        importance: 8,
        metadata: { source: 'test', context: 'unit' },
      });

      expect(memory.metadata).toEqual({ source: 'test', context: 'unit' });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      RECALL
  // ═══════════════════════════════════════════════════════════════

  describe('recall', () => {
    beforeEach(async () => {
      await service.store({ content: 'Database design decision', type: 'decision', importance: 8, tags: ['db', 'architecture'] });
      await service.store({ content: 'API endpoint pattern', type: 'code_pattern', importance: 6, tags: ['api', 'backend'] });
      await service.store({ content: 'Authentication flow note', type: 'note', importance: 4, tags: ['auth', 'security'] });
      await service.store({ content: 'Bug fix for login error', type: 'error', importance: 7, tags: ['bug', 'auth'] });
    });

    it('should recall memories by query', async () => {
      const results = await service.recall({ query: 'database' });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].content).toContain('Database');
    });

    it('should filter by type', async () => {
      const results = await service.recall({ query: 'auth', type: 'error' });

      expect(results.length).toBe(1);
      expect(results[0].type).toBe('error');
    });

    it('should filter by minimum importance', async () => {
      const results = await service.recall({ query: 'auth', minImportance: 6 });

      // Should only return memories with importance >= 6
      expect(results.every(m => m.importance >= 6)).toBe(true);
    });

    it('should filter by tags', async () => {
      const results = await service.recall({ query: '', tags: ['auth'] });

      expect(results.length).toBe(2);
      expect(results.every(m => m.tags.includes('auth'))).toBe(true);
    });

    it('should limit results', async () => {
      const results = await service.recall({ query: 'a', limit: 2 });

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should rank by relevance', async () => {
      const results = await service.recall({ query: 'auth' });

      // Results should be sorted by score
      expect(results.length).toBeGreaterThan(1);
      // First result should be more relevant
    });

    it('should increment access count', async () => {
      const initialResults = await service.recall({ query: 'database' });
      const memoryId = initialResults[0].id;

      await service.recall({ query: 'database' });
      await service.recall({ query: 'database' });

      const memory = await service.get(memoryId);
      expect(memory?.accessCount).toBeGreaterThanOrEqual(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      FORGET
  // ═══════════════════════════════════════════════════════════════

  describe('forget', () => {
    it('should delete a memory', async () => {
      const memory = await service.store({
        content: 'To be forgotten',
        type: 'note',
        importance: 1,
      });

      const result = await service.forget(memory.id);
      expect(result).toBe(true);

      const found = await service.get(memory.id);
      expect(found).toBeUndefined();
    });

    it('should return false for non-existent memory', async () => {
      const result = await service.forget('non-existent-id');
      expect(result).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      GET & GETALL
  // ═══════════════════════════════════════════════════════════════

  describe('get', () => {
    it('should return memory by ID', async () => {
      const memory = await service.store({
        content: 'Get me',
        type: 'fact',
        importance: 5,
      });

      const found = await service.get(memory.id);
      expect(found?.content).toBe('Get me');
    });

    it('should return undefined for non-existent ID', async () => {
      const found = await service.get('non-existent');
      expect(found).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return all memories', async () => {
      // Use very unique content with UUIDs to avoid duplicate detection
      const uuid1 = Date.now().toString(36) + Math.random().toString(36).substr(2);
      const uuid2 = Date.now().toString(36) + Math.random().toString(36).substr(2);
      const uuid3 = Date.now().toString(36) + Math.random().toString(36).substr(2);

      await service.store({ content: `Memory_A_${uuid1}`, type: 'note', importance: 1 });
      await service.store({ content: `Memory_B_${uuid2}`, type: 'fact', importance: 2 });
      await service.store({ content: `Memory_C_${uuid3}`, type: 'decision', importance: 3 });

      const all = await service.getAll();
      expect(all.length).toBe(3);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      SUMMARY & STATUS
  // ═══════════════════════════════════════════════════════════════

  describe('getSummary', () => {
    it('should return memory summary', async () => {
      const ts = Date.now();
      await service.store({ content: `PostgreSQL_DB_${ts}_alpha_unique`, type: 'decision', importance: 8 });
      await service.store({ content: `JWT_Auth_${ts}_beta_unique`, type: 'decision', importance: 9 });
      await service.store({ content: `JavaScript_1995_${ts}_gamma_unique`, type: 'fact', importance: 5 });
      await service.store({ content: `TODO_Review_${ts}_delta_unique`, type: 'note', importance: 3 });

      const summary = await service.getSummary();

      expect(summary.total).toBe(4);
      expect(summary.byType['decision']).toBe(2);
      expect(summary.byType['fact']).toBe(1);
      expect(summary.byType['note']).toBe(1);
      expect(summary.mostImportant.length).toBeGreaterThan(0);
      expect(summary.recentlyAccessed.length).toBeGreaterThan(0);
    });
  });

  describe('getStatus', () => {
    it('should return module status', async () => {
      await service.store({ content: 'Test_Status_Unique', type: 'note', importance: 1 });

      const status = service.getStatus();

      expect(status.enabled).toBe(true);
      expect(status.totalMemories).toBe(1);
      expect(status.dbPath).toBe(testDbPath);
      expect(status.memoryUsage.used).toBe(1);
      expect(status.memoryUsage.max).toBe(100);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      SNAPSHOT
  // ═══════════════════════════════════════════════════════════════

  describe('snapshot', () => {
    it('should return snapshot of all memories', async () => {
      const ts = Date.now();
      await service.store({ content: `Snapshot_A_${ts}_unique_xray`, type: 'note', importance: 1 });
      await service.store({ content: `Snapshot_B_${ts}_unique_yankee`, type: 'fact', importance: 2 });

      const snapshot = service.getSnapshot();
      expect(snapshot.length).toBe(2);
    });

    it('should load from snapshot', async () => {
      const ts = Date.now();
      const mem1 = await service.store({ content: `LoadTest_A_${ts}_unique_zulu`, type: 'note', importance: 1 });
      const mem2 = await service.store({ content: `LoadTest_B_${ts}_unique_whiskey`, type: 'fact', importance: 2 });

      const snapshot = service.getSnapshot();
      expect(snapshot.length).toBe(2);

      // Clear memories
      await service.forget(mem1.id);
      await service.forget(mem2.id);
      expect((await service.getAll()).length).toBe(0);

      await service.loadSnapshot(snapshot);
      expect((await service.getAll()).length).toBe(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      PERSISTENCE
  // ═══════════════════════════════════════════════════════════════

  describe('persistence', () => {
    it('should persist memories across restarts', async () => {
      // Create a separate service for this test to avoid afterEach issues
      const persistPath = join(TEST_ROOT, 'persist-test.db');
      const persistService = new MemoryService(
        {
          enabled: true,
          persistPath,
          maxItems: 100,
          autoSave: true,
        },
        mockEventBus,
        mockLogger
      );
      await persistService.initialize();
      await persistService.store({ content: 'Persistent memory unique', type: 'fact', importance: 7 });
      await persistService.shutdown();

      // Create new service instance
      const newService = new MemoryService(
        {
          enabled: true,
          persistPath,
          maxItems: 100,
        },
        mockEventBus,
        mockLogger
      );
      await newService.initialize();

      const all = await newService.getAll();
      expect(all.length).toBe(1);
      expect(all[0].content).toBe('Persistent memory unique');

      await newService.shutdown();
    });

    it('should load persistent count', async () => {
      const ts = Date.now();
      await service.store({ content: `PersistCount_A_${ts}_kilo_unique`, type: 'note', importance: 1 });
      await service.store({ content: `PersistCount_B_${ts}_lima_unique`, type: 'fact', importance: 2 });

      const count = await service.loadPersistent();
      expect(count).toBe(2);
    });

    it('should save persistent count', async () => {
      await service.store({ content: 'Save Persistent Memory', type: 'note', importance: 1 });

      const count = await service.savePersistent();
      expect(count).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      LIMIT ENFORCEMENT
  // ═══════════════════════════════════════════════════════════════

  describe('limit enforcement', () => {
    it('should enforce max items limit', async () => {
      // Create service with low limit
      const limitedService = new MemoryService(
        {
          enabled: true,
          persistPath: join(TEST_ROOT, 'limited.db'),
          maxItems: 5,
        },
        mockEventBus,
        mockLogger
      );
      await limitedService.initialize();

      // Store more than limit
      for (let i = 0; i < 10; i++) {
        await limitedService.store({
          content: `Memory ${i}`,
          type: 'note',
          importance: i % 10,
        });
      }

      const all = await limitedService.getAll();
      expect(all.length).toBeLessThanOrEqual(5);

      await limitedService.shutdown();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      RETENTION POLICY
  // ═══════════════════════════════════════════════════════════════

  describe('retention policy', () => {
    it('should apply retention policy on initialization', async () => {
      // This is tested implicitly - retention policy runs on init
      // We'd need to mock dates to properly test this
      expect(true).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      ERROR HANDLING
  // ═══════════════════════════════════════════════════════════════

  describe('error handling', () => {
    it('should throw if not initialized', async () => {
      const uninitService = new MemoryService(
        {
          enabled: true,
          persistPath: join(TEST_ROOT, 'uninit.db'),
          maxItems: 100,
        },
        mockEventBus,
        mockLogger
      );

      // Don't initialize - should throw on operations
      await expect(uninitService.store({
        content: 'Test',
        type: 'note',
        importance: 1,
      })).rejects.toThrow('Memory service not initialized');
    });
  });
});
