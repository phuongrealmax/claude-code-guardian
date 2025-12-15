// tests/unit/latent.test.ts

import { vi } from 'vitest';
import { join } from 'path';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { LatentService } from '../../src/modules/latent/latent.service.js';
import { EventBus } from '../../src/core/event-bus.js';
import { Logger } from '../../src/core/logger.js';
import { LatentPhase } from '../../src/modules/latent/latent.types.js';

// Test project root
const TEST_ROOT = join(process.cwd(), '.latent-test-temp');

// Mock dependencies
const mockEventBus = new EventBus();
const mockLogger = new Logger('silent');

describe('LatentService', () => {
  let service: LatentService;

  beforeEach(async () => {
    // Clean up and create test directory
    if (existsSync(TEST_ROOT)) {
      rmSync(TEST_ROOT, { recursive: true, force: true });
    }
    mkdirSync(join(TEST_ROOT, '.ccg'), { recursive: true });

    service = new LatentService(
      {
        enabled: true,
        maxContexts: 10,
        maxDecisions: 50,
        maxSummaryLength: 200,
        cleanupAfterMs: 0, // Disable auto cleanup in tests
        autoMerge: true,
        persist: false,
      },
      mockEventBus,
      mockLogger,
      TEST_ROOT
    );
    await service.initialize();
  });

  afterEach(async () => {
    await service.shutdown();
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

    it('should have no contexts initially', async () => {
      const contexts = await service.listContexts();
      expect(contexts.length).toBe(0);
    });

    it('should return initial status', () => {
      const status = service.getStatus();
      expect(status.enabled).toBe(true);
      expect(status.activeContexts).toBe(0);
      expect(status.totalCreated).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      CONTEXT CREATION
  // ═══════════════════════════════════════════════════════════════

  describe('createContext', () => {
    it('should create a context with default values', async () => {
      const context = await service.createContext({
        taskId: 'test-task-1',
      });

      expect(context).toBeDefined();
      expect(context.taskId).toBe('test-task-1');
      expect(context.phase).toBe('analysis');
      expect(context.version).toBe(1);
      expect(context.codeMap.files).toEqual([]);
      expect(context.constraints).toEqual([]);
      expect(context.decisions).toEqual([]);
    });

    it('should create a context with custom values', async () => {
      const context = await service.createContext({
        taskId: 'custom-task',
        phase: 'plan',
        constraints: ['No breaking changes', 'Must pass tests'],
        files: ['src/index.ts', 'src/utils.ts'],
        agentId: 'test-agent',
      });

      expect(context.phase).toBe('plan');
      expect(context.constraints).toEqual(['No breaking changes', 'Must pass tests']);
      expect(context.codeMap.files).toEqual(['src/index.ts', 'src/utils.ts']);
      expect(context.metadata.createdBy).toBe('test-agent');
    });

    it('should throw if context already exists', async () => {
      await service.createContext({ taskId: 'duplicate-task' });

      await expect(
        service.createContext({ taskId: 'duplicate-task' })
      ).rejects.toThrow('Context already exists');
    });

    it('should evict oldest context when limit reached', async () => {
      // Create service with low limit
      const limitedService = new LatentService(
        {
          enabled: true,
          maxContexts: 2,
          maxDecisions: 50,
          maxSummaryLength: 200,
          cleanupAfterMs: 0,
          autoMerge: true,
          persist: false,
        },
        mockEventBus,
        mockLogger,
        TEST_ROOT
      );
      await limitedService.initialize();

      await limitedService.createContext({ taskId: 'task-1' });
      await limitedService.createContext({ taskId: 'task-2' });
      await limitedService.createContext({ taskId: 'task-3' }); // Should evict task-1

      const contexts = await limitedService.listContexts();
      expect(contexts.length).toBe(2);
      expect(contexts.some(c => c.taskId === 'task-1')).toBe(false);

      await limitedService.shutdown();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      GET CONTEXT
  // ═══════════════════════════════════════════════════════════════

  describe('getContext', () => {
    it('should return context by taskId', async () => {
      await service.createContext({ taskId: 'get-test' });

      const context = await service.getContext({ taskId: 'get-test' });
      expect(context?.taskId).toBe('get-test');
    });

    it('should return null for non-existent taskId', async () => {
      const context = await service.getContext({ taskId: 'non-existent' });
      expect(context).toBeNull();
    });

    it('should return partial context when fields specified', async () => {
      await service.createContext({
        taskId: 'partial-test',
        constraints: ['test constraint'],
      });

      const context = await service.getContext({
        taskId: 'partial-test',
        fields: ['phase', 'constraints'],
      });

      expect(context?.phase).toBe('analysis');
      expect(context?.constraints).toEqual(['test constraint']);
      // Other fields should not be present in partial
    });
  });

  describe('getContextWithHistory', () => {
    it('should return context with history', async () => {
      await service.createContext({ taskId: 'history-test' });

      const result = await service.getContextWithHistory('history-test');

      expect(result).toBeDefined();
      expect(result?.context.taskId).toBe('history-test');
      expect(result?.history).toBeDefined();
      expect(result?.history.length).toBeGreaterThan(0); // Should have create entry
    });

    it('should return null for non-existent taskId', async () => {
      const result = await service.getContextWithHistory('non-existent');
      expect(result).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      UPDATE CONTEXT (DELTA)
  // ═══════════════════════════════════════════════════════════════

  describe('updateContext', () => {
    it('should update context with delta merge', async () => {
      await service.createContext({ taskId: 'update-test' });

      const updated = await service.updateContext({
        taskId: 'update-test',
        delta: {
          codeMap: { hotSpots: ['src/index.ts:42'] },
          risks: ['Potential performance issue'],
        },
        agentId: 'test-agent',
      });

      expect(updated.codeMap.hotSpots).toContain('src/index.ts:42');
      expect(updated.risks).toContain('Potential performance issue');
      expect(updated.version).toBe(2);
    });

    it('should merge decisions', async () => {
      await service.createContext({ taskId: 'decision-test' });

      await service.updateContext({
        taskId: 'decision-test',
        delta: {
          decisions: [{ id: 'D001', summary: 'First decision', rationale: 'Testing' }],
        },
      });

      await service.updateContext({
        taskId: 'decision-test',
        delta: {
          decisions: [{ id: 'D002', summary: 'Second decision', rationale: 'More testing' }],
        },
      });

      const context = await service.getContext({ taskId: 'decision-test' });
      expect(context?.decisions.length).toBe(2);
    });

    it('should throw if context not found', async () => {
      await expect(
        service.updateContext({
          taskId: 'non-existent',
          delta: { risks: ['test'] },
        })
      ).rejects.toThrow('Context not found');
    });

    it('should update metadata on each update', async () => {
      await service.createContext({ taskId: 'metadata-test', agentId: 'agent-1' });

      const updated = await service.updateContext({
        taskId: 'metadata-test',
        delta: { risks: ['test'] },
        agentId: 'agent-2',
      });

      expect(updated.metadata.lastUpdatedBy).toBe('agent-2');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      PHASE TRANSITIONS
  // ═══════════════════════════════════════════════════════════════

  describe('transitionPhase', () => {
    it('should transition from analysis to plan', async () => {
      await service.createContext({ taskId: 'phase-test' });

      const context = await service.transitionPhase({
        taskId: 'phase-test',
        toPhase: 'plan',
        summary: 'Analysis complete',
      });

      expect(context.phase).toBe('plan');
    });

    it('should transition from plan to impl', async () => {
      await service.createContext({ taskId: 'phase-test-2', phase: 'plan' });

      const context = await service.transitionPhase({
        taskId: 'phase-test-2',
        toPhase: 'impl',
        summary: 'Plan finalized',
      });

      expect(context.phase).toBe('impl');
    });

    it('should transition from impl to review', async () => {
      await service.createContext({ taskId: 'phase-test-3' });
      await service.transitionPhase({ taskId: 'phase-test-3', toPhase: 'impl' });

      const context = await service.transitionPhase({
        taskId: 'phase-test-3',
        toPhase: 'review',
        summary: 'Implementation done',
      });

      expect(context.phase).toBe('review');
    });

    it('should allow going back from impl to plan', async () => {
      await service.createContext({ taskId: 'back-test' });
      await service.transitionPhase({ taskId: 'back-test', toPhase: 'impl' });

      const context = await service.transitionPhase({
        taskId: 'back-test',
        toPhase: 'plan',
        summary: 'Found issues, need to replan',
      });

      expect(context.phase).toBe('plan');
    });

    it('should throw on invalid transition', async () => {
      await service.createContext({ taskId: 'invalid-test' });

      // analysis -> review is not valid (must go through plan or impl)
      await expect(
        service.transitionPhase({
          taskId: 'invalid-test',
          toPhase: 'review',
        })
      ).rejects.toThrow('Invalid phase transition');
    });

    it('should add decision with summary', async () => {
      await service.createContext({ taskId: 'decision-on-transition' });

      const context = await service.transitionPhase({
        taskId: 'decision-on-transition',
        toPhase: 'plan',
        summary: 'Identified root cause of bug',
      });

      expect(context.decisions.length).toBeGreaterThan(0);
      expect(context.decisions[0].summary).toContain('Identified root cause');
    });

    it('should throw if context not found', async () => {
      await expect(
        service.transitionPhase({
          taskId: 'non-existent',
          toPhase: 'plan',
        })
      ).rejects.toThrow('Context not found');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      COMPLETE TASK
  // ═══════════════════════════════════════════════════════════════

  describe('completeTask', () => {
    it('should complete a task', async () => {
      await service.createContext({ taskId: 'complete-test' });

      await service.completeTask('complete-test', 'All work done');

      const context = await service.getContext({ taskId: 'complete-test' });
      expect(context?.decisions.some(d => d.summary.includes('Task completed'))).toBe(true);
    });

    it('should throw if context not found', async () => {
      await expect(
        service.completeTask('non-existent', 'Done')
      ).rejects.toThrow('Context not found');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      DELETE CONTEXT
  // ═══════════════════════════════════════════════════════════════

  describe('deleteContext', () => {
    it('should delete a context', async () => {
      await service.createContext({ taskId: 'delete-test' });

      const result = await service.deleteContext('delete-test');
      expect(result).toBe(true);

      const context = await service.getContext({ taskId: 'delete-test' });
      expect(context).toBeNull();
    });

    it('should return false for non-existent context', async () => {
      const result = await service.deleteContext('non-existent');
      expect(result).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      LIST CONTEXTS
  // ═══════════════════════════════════════════════════════════════

  describe('listContexts', () => {
    it('should list all contexts', async () => {
      await service.createContext({ taskId: 'list-1' });
      await service.createContext({ taskId: 'list-2' });
      await service.createContext({ taskId: 'list-3' });

      const contexts = await service.listContexts();
      expect(contexts.length).toBe(3);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      VALIDATION
  // ═══════════════════════════════════════════════════════════════

  describe('validateResponse', () => {
    it('should validate a correct response', () => {
      const result = service.validateResponse({
        summary: 'Fixed the bug',
        contextDelta: { risks: ['None'] },
        actions: [{ type: 'edit_file', target: 'src/index.ts', description: 'Fix' }],
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect summary too long', () => {
      const longSummary = 'x'.repeat(250);
      const result = service.validateResponse({
        summary: longSummary,
        contextDelta: {},
        actions: [],
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'summary')).toBe(true);
    });

    it('should detect action without target', () => {
      const result = service.validateResponse({
        summary: 'Test',
        contextDelta: {},
        actions: [{ type: 'edit_file', target: '', description: 'Fix' }],
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'actions.target')).toBe(true);
    });

    it('should warn about action without description', () => {
      const result = service.validateResponse({
        summary: 'Test',
        contextDelta: {},
        actions: [{ type: 'edit_file', target: 'src/index.ts', description: '' }],
      });

      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      STATUS
  // ═══════════════════════════════════════════════════════════════

  describe('getStatus', () => {
    it('should return accurate status', async () => {
      await service.createContext({ taskId: 'status-1' });
      await service.createContext({ taskId: 'status-2' });
      await service.updateContext({
        taskId: 'status-1',
        delta: { risks: ['test'] },
      });

      const status = service.getStatus();

      expect(status.activeContexts).toBe(2);
      expect(status.totalCreated).toBe(2);
      expect(status.totalDeltasMerged).toBe(1);
      expect(status.phaseStats.analysis).toBe(2);
    });

    it('should track phase transitions', async () => {
      await service.createContext({ taskId: 'stats-test' });
      await service.transitionPhase({ taskId: 'stats-test', toPhase: 'plan' });

      const status = service.getStatus();
      expect(status.phaseStats.plan).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      EVENTS
  // ═══════════════════════════════════════════════════════════════

  describe('events', () => {
    it('should emit latent:context:created on create', async () => {
      const emitSpy = vi.spyOn(mockEventBus, 'emit');

      await service.createContext({ taskId: 'event-test' });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'latent:context:created',
        })
      );
    });

    it('should emit latent:context:updated on update', async () => {
      await service.createContext({ taskId: 'event-update' });
      const emitSpy = vi.spyOn(mockEventBus, 'emit');

      await service.updateContext({
        taskId: 'event-update',
        delta: { risks: ['test'] },
      });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'latent:context:updated',
        })
      );
    });

    it('should emit latent:phase:transition on phase change', async () => {
      await service.createContext({ taskId: 'event-phase' });
      const emitSpy = vi.spyOn(mockEventBus, 'emit');

      await service.transitionPhase({
        taskId: 'event-phase',
        toPhase: 'plan',
      });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'latent:phase:transition',
        })
      );
    });

    it('should emit latent:task:completed on complete', async () => {
      await service.createContext({ taskId: 'event-complete' });
      const emitSpy = vi.spyOn(mockEventBus, 'emit');

      await service.completeTask('event-complete', 'Done');

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'latent:task:completed',
        })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      DIFF EDITOR CONFIG
  // ═══════════════════════════════════════════════════════════════

  describe('diffEditor', () => {
    it('should configure diff editor', () => {
      service.configureDiffEditor({
        confirmPolicy: 'prompt',
        fuzzyThreshold: 0.7,
      });

      const config = service.getDiffEditorConfig();
      expect(config.confirmPolicy).toBe('prompt');
      expect(config.fuzzyThreshold).toBe(0.7);
    });

    it('should get pending confirms', () => {
      const pending = service.getPendingDiffConfirms();
      expect(pending).toBeDefined();
      expect(pending instanceof Map).toBe(true);
    });
  });
});
