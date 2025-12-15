// tests/unit/workflow.test.ts

import { vi } from 'vitest';
import { join } from 'path';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { WorkflowService } from '../../src/modules/workflow/workflow.service.js';
import { EventBus } from '../../src/core/event-bus.js';
import { Logger } from '../../src/core/logger.js';
import { StateManager } from '../../src/core/state-manager.js';
import {
  CompletionGatesService,
  createGuardEvidence,
  createTestEvidence,
} from '../../src/core/completion-gates.js';

// Test project root
// Test root is now dynamically generated per test in beforeEach

// Mock dependencies
const mockEventBus = new EventBus();
const mockLogger = new Logger('silent');

describe('WorkflowService', () => {
  let service: WorkflowService;
  let testRoot: string;

  beforeEach(async () => {
    // Use unique test root per test to avoid file locking conflicts
    testRoot = join(process.cwd(), `.workflow-test-${Date.now()}-${Math.random().toString(36).substr(2)}`);

    // Clean up and create test directory
    if (existsSync(testRoot)) {
      try {
        rmSync(testRoot, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors on Windows
      }
    }
    mkdirSync(testRoot, { recursive: true });

    service = new WorkflowService(
      {
        enabled: true,
        autoCleanupEnabled: false,
        completedRetentionDays: 1,
        maxCompletedTasks: 10,
      },
      mockEventBus,
      mockLogger,
      testRoot
    );
    await service.initialize();
  });

  afterEach(async () => {
    // Small delay to allow file handles to close on Windows
    await new Promise(r => setTimeout(r, 50));
    // Cleanup
    if (existsSync(testRoot)) {
      try {
        rmSync(testRoot, { recursive: true, force: true });
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

    it('should create tasks directory on initialize', async () => {
      const tasksDir = join(testRoot, '.ccg', 'tasks');
      expect(existsSync(tasksDir)).toBe(true);
    });

    it('should skip initialization when disabled', async () => {
      const disabledService = new WorkflowService(
        { enabled: false },
        mockEventBus,
        mockLogger,
        testRoot
      );
      await disabledService.initialize();
      // Should not throw and should be disabled
      expect(disabledService.getStatus().totalTasks).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      TASK CRUD
  // ═══════════════════════════════════════════════════════════════

  describe('createTask', () => {
    it('should create a task with default values', async () => {
      const task = await service.createTask({ name: 'Test Task' });

      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(task.name).toBe('Test Task');
      expect(task.status).toBe('pending');
      expect(task.progress).toBe(0);
      expect(task.priority).toBe('medium');
      expect(task.tags).toEqual([]);
    });

    it('should create a task with custom values', async () => {
      const task = await service.createTask({
        name: 'Important Task',
        description: 'A very important task',
        priority: 'critical',
        tags: ['urgent', 'backend'],
        estimatedTokens: 5000,
      });

      expect(task.name).toBe('Important Task');
      expect(task.description).toBe('A very important task');
      expect(task.priority).toBe('critical');
      expect(task.tags).toEqual(['urgent', 'backend']);
      expect(task.estimatedTokens).toBe(5000);
    });

    it('should persist task to disk', async () => {
      const task = await service.createTask({ name: 'Persistent Task' });
      const taskFile = join(testRoot, '.ccg', 'tasks', `${task.id}.json`);
      expect(existsSync(taskFile)).toBe(true);
    });

    it('should create subtask and link to parent', async () => {
      const parent = await service.createTask({ name: 'Parent Task' });
      const child = await service.createTask({
        name: 'Child Task',
        parentId: parent.id,
      });

      expect(child.parentId).toBe(parent.id);

      const updatedParent = service.getTask(parent.id);
      expect(updatedParent?.subtasks).toContain(child.id);
    });
  });

  describe('startTask', () => {
    it('should start a task', async () => {
      const task = await service.createTask({ name: 'Task to Start' });
      const started = await service.startTask(task.id);

      expect(started?.status).toBe('in_progress');
      expect(service.getCurrentTask()?.id).toBe(task.id);
    });

    it('should return null for non-existent task', async () => {
      const result = await service.startTask('non-existent-id');
      expect(result).toBeNull();
    });

    it('should pause previous task when starting new one', async () => {
      const task1 = await service.createTask({ name: 'Task 1' });
      const task2 = await service.createTask({ name: 'Task 2' });

      await service.startTask(task1.id);
      await service.startTask(task2.id);

      const updatedTask1 = service.getTask(task1.id);
      expect(updatedTask1?.status).toBe('paused');
      expect(service.getCurrentTask()?.id).toBe(task2.id);
    });
  });

  describe('updateTask', () => {
    it('should update task status', async () => {
      const task = await service.createTask({ name: 'Task to Update' });
      const updated = await service.updateTask(task.id, { status: 'blocked' });

      expect(updated?.status).toBe('blocked');
    });

    it('should update task progress', async () => {
      const task = await service.createTask({ name: 'Task with Progress' });
      const updated = await service.updateTask(task.id, { progress: 50 });

      expect(updated?.progress).toBe(50);
    });

    it('should clamp progress between 0 and 100', async () => {
      const task = await service.createTask({ name: 'Task with Progress' });

      await service.updateTask(task.id, { progress: -10 });
      expect(service.getTask(task.id)?.progress).toBe(0);

      await service.updateTask(task.id, { progress: 150 });
      expect(service.getTask(task.id)?.progress).toBe(100);
    });

    it('should return null for non-existent task', async () => {
      const result = await service.updateTask('non-existent', { progress: 50 });
      expect(result).toBeNull();
    });
  });

  describe('completeTask', () => {
    it('should complete a task (no gates without StateManager)', async () => {
      const task = await service.createTask({ name: 'Task to Complete' });
      await service.startTask(task.id);
      const result = await service.completeTask(task.id);

      // Without StateManager, gates are bypassed
      expect(result.status).toBe('completed');
      expect(result.task?.status).toBe('completed');
      expect(result.task?.progress).toBe(100);
      expect(result.task?.completedAt).toBeDefined();
    });

    it('should record actual tokens', async () => {
      const task = await service.createTask({ name: 'Task with Tokens' });
      const result = await service.completeTask(task.id, 3500);

      expect(result.task?.actualTokens).toBe(3500);
    });

    it('should clear current task on completion', async () => {
      const task = await service.createTask({ name: 'Current Task' });
      await service.startTask(task.id);
      expect(service.getCurrentTask()?.id).toBe(task.id);

      await service.completeTask(task.id);
      expect(service.getCurrentTask()).toBeUndefined();
    });

    it('should return blocked status for non-existent task', async () => {
      const result = await service.completeTask('non-existent-id');
      expect(result.status).toBe('blocked');
      expect(result.message).toContain('not found');
    });
  });

  describe('pauseTask', () => {
    it('should pause an in-progress task', async () => {
      const task = await service.createTask({ name: 'Task to Pause' });
      await service.startTask(task.id);
      const paused = await service.pauseTask(task.id);

      expect(paused?.status).toBe('paused');
    });

    it('should not pause a task that is not in progress', async () => {
      const task = await service.createTask({ name: 'Pending Task' });
      const paused = await service.pauseTask(task.id);

      expect(paused?.status).toBe('pending'); // Status unchanged
    });

    it('should clear current task on pause', async () => {
      const task = await service.createTask({ name: 'Current Task' });
      await service.startTask(task.id);
      await service.pauseTask(task.id);

      expect(service.getCurrentTask()).toBeUndefined();
    });
  });

  describe('failTask', () => {
    it('should fail a task', async () => {
      const task = await service.createTask({ name: 'Task to Fail' });
      const failed = await service.failTask(task.id);

      expect(failed?.status).toBe('failed');
    });

    it('should add failure reason as note', async () => {
      const task = await service.createTask({ name: 'Task to Fail' });
      const failed = await service.failTask(task.id, 'Build error');

      expect(failed?.notes.length).toBe(1);
      expect(failed?.notes[0].content).toContain('Build error');
    });

    it('should clear current task on failure', async () => {
      const task = await service.createTask({ name: 'Current Task' });
      await service.startTask(task.id);
      await service.failTask(task.id);

      expect(service.getCurrentTask()).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      TASK NOTES & FILES
  // ═══════════════════════════════════════════════════════════════

  describe('addNote', () => {
    it('should add a note to a task', async () => {
      const task = await service.createTask({ name: 'Task with Notes' });
      const note = await service.addNote(task.id, 'Important decision made');

      expect(note).toBeDefined();
      expect(note?.content).toBe('Important decision made');
      expect(note?.type).toBe('note');
    });

    it('should add note with custom type', async () => {
      const task = await service.createTask({ name: 'Task with Decision' });
      const note = await service.addNote(task.id, 'Use REST instead of GraphQL', 'decision');

      expect(note?.type).toBe('decision');
    });

    it('should return null for non-existent task', async () => {
      const note = await service.addNote('non-existent', 'Some note');
      expect(note).toBeNull();
    });
  });

  describe('addAffectedFile', () => {
    it('should add affected file to task', async () => {
      const task = await service.createTask({ name: 'Task with Files' });
      const result = await service.addAffectedFile(task.id, 'src/index.ts');

      expect(result).toBe(true);
      expect(service.getTask(task.id)?.filesAffected).toContain('src/index.ts');
    });

    it('should not duplicate files', async () => {
      const task = await service.createTask({ name: 'Task with Files' });
      await service.addAffectedFile(task.id, 'src/index.ts');
      await service.addAffectedFile(task.id, 'src/index.ts');

      expect(service.getTask(task.id)?.filesAffected.length).toBe(1);
    });

    it('should return false for non-existent task', async () => {
      const result = await service.addAffectedFile('non-existent', 'file.ts');
      expect(result).toBe(false);
    });
  });

  describe('addCheckpoint', () => {
    it('should add checkpoint to task', async () => {
      const task = await service.createTask({ name: 'Task with Checkpoints' });
      const result = await service.addCheckpoint(task.id, 'checkpoint-123');

      expect(result).toBe(true);
      expect(service.getTask(task.id)?.checkpoints).toContain('checkpoint-123');
    });

    it('should return false for non-existent task', async () => {
      const result = await service.addCheckpoint('non-existent', 'checkpoint');
      expect(result).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      TASK QUERIES
  // ═══════════════════════════════════════════════════════════════

  describe('getTask', () => {
    it('should return task by ID', async () => {
      const task = await service.createTask({ name: 'Get Me' });
      const found = service.getTask(task.id);

      expect(found?.name).toBe('Get Me');
    });

    it('should return undefined for non-existent task', () => {
      const found = service.getTask('non-existent');
      expect(found).toBeUndefined();
    });
  });

  describe('getCurrentTask', () => {
    it('should return current in-progress task', async () => {
      const task = await service.createTask({ name: 'Current' });
      await service.startTask(task.id);

      expect(service.getCurrentTask()?.id).toBe(task.id);
    });

    it('should return undefined when no task is in progress', () => {
      expect(service.getCurrentTask()).toBeUndefined();
    });
  });

  describe('getTasks', () => {
    beforeEach(async () => {
      // Clean up any existing tasks first
      await service.clearAllTasks();
      await service.createTask({ name: 'Low Priority', priority: 'low', tags: ['backend'] });
      await service.createTask({ name: 'High Priority', priority: 'high', tags: ['frontend'] });
      await service.createTask({ name: 'Critical', priority: 'critical', tags: ['urgent'] });
    });

    it('should return all tasks', () => {
      const tasks = service.getTasks();
      expect(tasks.length).toBe(3);
    });

    it('should filter by status', async () => {
      const tasks = service.getTasks();
      const task = tasks[0];
      await service.startTask(task.id);

      const inProgress = service.getTasks({ status: 'in_progress' });
      expect(inProgress.length).toBe(1);
    });

    it('should filter by priority', () => {
      const critical = service.getTasks({ priority: 'critical' });
      expect(critical.length).toBe(1);
      expect(critical[0].name).toBe('Critical');
    });

    it('should filter by multiple priorities', () => {
      const highAndCritical = service.getTasks({ priority: ['high', 'critical'] });
      expect(highAndCritical.length).toBe(2);
    });

    it('should filter by tags', () => {
      const backend = service.getTasks({ tags: ['backend'] });
      expect(backend.length).toBe(1);
      expect(backend[0].name).toBe('Low Priority');
    });

    it('should sort by priority (critical first)', () => {
      const tasks = service.getTasks();
      expect(tasks[0].priority).toBe('critical');
      expect(tasks[1].priority).toBe('high');
      expect(tasks[2].priority).toBe('low');
    });
  });

  describe('getPendingTasks', () => {
    it('should return pending, paused, and blocked tasks', async () => {
      const t1 = await service.createTask({ name: 'Pending' });
      const t2 = await service.createTask({ name: 'In Progress' });
      const t3 = await service.createTask({ name: 'Paused' });

      await service.startTask(t2.id);
      // t2 is now in_progress, t1 and t3 are pending

      await service.startTask(t3.id);
      // t3 is now in_progress, t2 is paused, t1 is pending

      await service.pauseTask(t3.id);
      // t3 is now paused, t2 is paused, t1 is pending
      // All 3 are pending/paused, so getPendingTasks returns 3

      const pending = service.getPendingTasks();
      expect(pending.length).toBe(3); // t1=pending, t2=paused, t3=paused
      expect(pending.some(t => t.name === 'Pending')).toBe(true);
      expect(pending.some(t => t.name === 'Paused')).toBe(true);
      expect(pending.some(t => t.name === 'In Progress' && t.status === 'paused')).toBe(true);
    });
  });

  describe('getTaskList', () => {
    it('should return task summaries', async () => {
      await service.createTask({ name: 'Task 1' });
      await service.createTask({ name: 'Task 2' });

      const list = service.getTaskList();
      expect(list.length).toBe(2);
      expect(list[0]).toHaveProperty('id');
      expect(list[0]).toHaveProperty('name');
      expect(list[0]).toHaveProperty('status');
      expect(list[0]).toHaveProperty('progress');
      expect(list[0]).toHaveProperty('priority');
    });
  });

  describe('getStatus', () => {
    it('should return workflow status', async () => {
      await service.createTask({ name: 'Pending Task' });
      const task = await service.createTask({ name: 'In Progress Task' });
      await service.startTask(task.id);

      const status = service.getStatus();

      expect(status.totalTasks).toBe(2);
      expect(status.pendingCount).toBe(1);
      expect(status.inProgressCount).toBe(1);
      expect(status.currentTask?.id).toBe(task.id);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      CLEANUP
  // ═══════════════════════════════════════════════════════════════

  describe('deleteTask', () => {
    it('should delete a task', async () => {
      const task = await service.createTask({ name: 'To Delete' });
      const result = await service.deleteTask(task.id);

      expect(result).toBe(true);
      expect(service.getTask(task.id)).toBeUndefined();
    });

    it('should remove task file from disk', async () => {
      const task = await service.createTask({ name: 'To Delete' });
      const taskFile = join(testRoot, '.ccg', 'tasks', `${task.id}.json`);
      expect(existsSync(taskFile)).toBe(true);

      await service.deleteTask(task.id);
      expect(existsSync(taskFile)).toBe(false);
    });

    it('should unlink from parent on delete', async () => {
      const parent = await service.createTask({ name: 'Parent' });
      const child = await service.createTask({ name: 'Child', parentId: parent.id });

      await service.deleteTask(child.id);

      const updatedParent = service.getTask(parent.id);
      expect(updatedParent?.subtasks).not.toContain(child.id);
    });

    it('should return false for non-existent task', async () => {
      const result = await service.deleteTask('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('cleanupCompletedTasks', () => {
    it('should cleanup old completed tasks', async () => {
      // Create and complete tasks
      const task = await service.createTask({ name: 'Old Task' });
      await service.completeTask(task.id);

      // Modify completed date to be old
      const oldTask = service.getTask(task.id);
      if (oldTask) {
        oldTask.completedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
        oldTask.updatedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      }

      const deleted = await service.cleanupCompletedTasks();
      expect(deleted).toBeGreaterThan(0);
    });

    it('should keep recent completed tasks', async () => {
      const task = await service.createTask({ name: 'Recent Task' });
      await service.completeTask(task.id);

      const deleted = await service.cleanupCompletedTasks();
      expect(deleted).toBe(0);
      expect(service.getTask(task.id)).toBeDefined();
    });
  });

  describe('clearCompletedTasks', () => {
    it('should clear all completed tasks', async () => {
      const t1 = await service.createTask({ name: 'Task 1' });
      const t2 = await service.createTask({ name: 'Task 2' });
      const t3 = await service.createTask({ name: 'Task 3' });

      await service.completeTask(t1.id);
      await service.completeTask(t2.id);
      // t3 remains pending

      const cleared = await service.clearCompletedTasks();
      expect(cleared).toBe(2);
      expect(service.getTasks().length).toBe(1);
      expect(service.getTask(t3.id)).toBeDefined();
    });
  });

  describe('clearAllTasks', () => {
    it('should clear all tasks', async () => {
      await service.createTask({ name: 'Task 1' });
      await service.createTask({ name: 'Task 2' });
      await service.createTask({ name: 'Task 3' });

      const cleared = await service.clearAllTasks();
      expect(cleared).toBe(3);
      expect(service.getTasks().length).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      PERSISTENCE
  // ═══════════════════════════════════════════════════════════════

  describe('persistence', () => {
    it('should load tasks on initialization', async () => {
      // Create tasks with unique names
      const ts = Date.now();
      await service.createTask({ name: `Persistent_1_${ts}` });
      await service.createTask({ name: `Persistent_2_${ts}` });

      // Create new service instance to test loading using SAME testRoot
      const newService = new WorkflowService(
        { enabled: true, autoCleanupEnabled: false },
        mockEventBus,
        mockLogger,
        testRoot  // Same testRoot as the original service
      );
      await newService.initialize();

      const tasks = newService.getTasks();
      expect(tasks.length).toBe(2);
      expect(tasks.some(t => t.name === `Persistent_1_${ts}`)).toBe(true);
      expect(tasks.some(t => t.name === `Persistent_2_${ts}`)).toBe(true);
    });

    it('should resume in-progress task on initialization', async () => {
      const task = await service.createTask({ name: 'In Progress Unique' });
      await service.startTask(task.id);

      // Create new service instance using SAME testRoot
      const newService = new WorkflowService(
        { enabled: true, autoCleanupEnabled: false },
        mockEventBus,
        mockLogger,
        testRoot  // Same testRoot as the original service
      );
      await newService.initialize();

      expect(newService.getCurrentTask()?.id).toBe(task.id);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      EVENT EMISSION
  // ═══════════════════════════════════════════════════════════════

  describe('events', () => {
    it('should emit task:start event', async () => {
      const emitSpy = vi.spyOn(mockEventBus, 'emit');
      const task = await service.createTask({ name: 'Event Test' });
      await service.startTask(task.id);

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'task:start',
          data: expect.objectContaining({ task: expect.anything() }),
        })
      );
    });

    it('should emit task:complete event (without gates)', async () => {
      const emitSpy = vi.spyOn(mockEventBus, 'emit');
      const task = await service.createTask({ name: 'Event Test' });
      const result = await service.completeTask(task.id);

      // Without StateManager, gates are bypassed, so task:complete should be emitted
      expect(result.status).toBe('completed');
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'task:complete',
          data: expect.objectContaining({ task: expect.anything() }),
        })
      );
    });

    it('should emit task:fail event', async () => {
      const emitSpy = vi.spyOn(mockEventBus, 'emit');
      const task = await service.createTask({ name: 'Event Test' });
      await service.failTask(task.id, 'Test failure');

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'task:fail',
          data: expect.objectContaining({ task: expect.anything() }),
        })
      );
    });
  });
});

// ═══════════════════════════════════════════════════════════════
//                      COMPLETION GATES INTEGRATION
// ═══════════════════════════════════════════════════════════════

describe('WorkflowService with Completion Gates', () => {
  let service: WorkflowService;
  let stateManager: StateManager;
  let testRoot: string;
  const mockEventBus = new EventBus();
  const mockLogger = new Logger('silent');

  beforeEach(async () => {
    testRoot = join(process.cwd(), `.workflow-gate-test-${Date.now()}-${Math.random().toString(36).substr(2)}`);
    if (existsSync(testRoot)) {
      try {
        rmSync(testRoot, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors on Windows
      }
    }
    mkdirSync(testRoot, { recursive: true });

    // Create StateManager for gates
    stateManager = new StateManager(testRoot, mockLogger, mockEventBus);
    stateManager.createSession(testRoot);

    // Create service with gates enabled
    service = new WorkflowService(
      {
        enabled: true,
        autoCleanupEnabled: false,
        completedRetentionDays: 1,
        maxCompletedTasks: 10,
        gatesEnabled: true,
      },
      mockEventBus,
      mockLogger,
      testRoot,
      { stateManager }
    );
    await service.initialize();
  });

  afterEach(async () => {
    stateManager.dispose();
    await new Promise(r => setTimeout(r, 50));
    if (existsSync(testRoot)) {
      try {
        rmSync(testRoot, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors on Windows
      }
    }
  });

  // Scenario 1: Missing evidence (both guard and test)
  describe('Scenario 1: Missing evidence', () => {
    it('should return pending when no evidence exists', async () => {
      const task = await service.createTask({ name: 'Task without evidence' });
      const result = await service.completeTask(task.id);

      expect(result.status).toBe('pending');
      expect(result.gate?.status).toBe('pending');
      expect(result.gate?.missingEvidence).toContain('guard');
      expect(result.gate?.missingEvidence).toContain('test');
      expect(result.task?.status).not.toBe('completed');
    });

    it('should suggest next tool calls when evidence is missing', async () => {
      const task = await service.createTask({ name: 'Task needing evidence' });
      const result = await service.completeTask(task.id);

      expect(result.gate?.nextToolCalls).toBeDefined();
      expect(result.gate?.nextToolCalls?.length).toBeGreaterThan(0);
      expect(result.gate?.nextToolCalls?.some(c => c.tool === 'guard_validate')).toBe(true);
      expect(result.gate?.nextToolCalls?.some(c => c.tool === 'testing_run')).toBe(true);
    });
  });

  // Scenario 2: Guard-only required (guard passes, no test required)
  describe('Scenario 2: Guard-only evidence', () => {
    it('should return pending when only guard evidence exists but test is required', async () => {
      // Set guard evidence as passed
      stateManager.setGuardEvidence(createGuardEvidence('passed', 'report-123'));

      const task = await service.createTask({ name: 'Guard-only task' });
      const result = await service.completeTask(task.id);

      // With default policy requiring both, should still be pending (missing test)
      expect(result.status).toBe('pending');
      expect(result.gate?.missingEvidence).toContain('test');
      expect(result.gate?.missingEvidence).not.toContain('guard');
    });

    it('should complete when guard passes and test is not required', async () => {
      // Configure gate policy to not require tests
      service.updateGatePolicy({ requireTest: false });

      // Set guard evidence as passed
      stateManager.setGuardEvidence(createGuardEvidence('passed', 'report-123'));

      const task = await service.createTask({ name: 'Guard-only task' });
      const result = await service.completeTask(task.id);

      expect(result.status).toBe('completed');
      expect(result.task?.status).toBe('completed');
    });
  });

  // Scenario 3: Test-only required (test passes, no guard required)
  describe('Scenario 3: Test-only evidence', () => {
    it('should return pending when only test evidence exists but guard is required', async () => {
      // Set test evidence as passed
      stateManager.setTestEvidence(createTestEvidence('passed', 'run-123'));

      const task = await service.createTask({ name: 'Test-only task' });
      const result = await service.completeTask(task.id);

      // With default policy requiring both, should still be pending (missing guard)
      expect(result.status).toBe('pending');
      expect(result.gate?.missingEvidence).toContain('guard');
      expect(result.gate?.missingEvidence).not.toContain('test');
    });

    it('should complete when test passes and guard is not required', async () => {
      // Configure gate policy to not require guard
      service.updateGatePolicy({ requireGuard: false });

      // Set test evidence as passed
      stateManager.setTestEvidence(createTestEvidence('passed', 'run-123'));

      const task = await service.createTask({ name: 'Test-only task' });
      const result = await service.completeTask(task.id);

      expect(result.status).toBe('completed');
      expect(result.task?.status).toBe('completed');
    });
  });

  // Scenario 4: Guard fail
  describe('Scenario 4: Guard failure', () => {
    it('should return blocked when guard evidence shows failure', async () => {
      // Set guard evidence as failed
      stateManager.setGuardEvidence(createGuardEvidence('failed', 'report-fail', ['no_fake_tests', 'no_empty_catch']));
      stateManager.setTestEvidence(createTestEvidence('passed', 'run-123'));

      const task = await service.createTask({ name: 'Guard-failed task' });
      const result = await service.completeTask(task.id);

      expect(result.status).toBe('blocked');
      expect(result.gate?.status).toBe('blocked');
      expect(result.gate?.failingEvidence?.some(f => f.type === 'guard')).toBe(true);
      expect(result.gate?.blockedReason).toContain('guard');
    });

    it('should include failing rules in result', async () => {
      stateManager.setGuardEvidence(createGuardEvidence('failed', 'report-fail', ['no_fake_tests', 'no_empty_catch']));
      stateManager.setTestEvidence(createTestEvidence('passed', 'run-123'));

      const task = await service.createTask({ name: 'Guard-failed task' });
      const result = await service.completeTask(task.id);

      const guardFailure = result.gate?.failingEvidence?.find(f => f.type === 'guard');
      expect(guardFailure?.details).toContain('no_fake_tests');
      expect(guardFailure?.details).toContain('no_empty_catch');
    });
  });

  // Scenario 5: Test fail
  describe('Scenario 5: Test failure', () => {
    it('should return blocked when test evidence shows failure', async () => {
      // Set guard evidence as passed, test as failed
      stateManager.setGuardEvidence(createGuardEvidence('passed', 'report-123'));
      stateManager.setTestEvidence(createTestEvidence('failed', 'run-fail', {
        failingTests: ['test1.spec.ts', 'test2.spec.ts'],
        consoleErrorsCount: 3,
      }));

      const task = await service.createTask({ name: 'Test-failed task' });
      const result = await service.completeTask(task.id);

      expect(result.status).toBe('blocked');
      expect(result.gate?.status).toBe('blocked');
      expect(result.gate?.failingEvidence?.some(f => f.type === 'test')).toBe(true);
    });

    it('should include failing tests in result', async () => {
      stateManager.setGuardEvidence(createGuardEvidence('passed', 'report-123'));
      stateManager.setTestEvidence(createTestEvidence('failed', 'run-fail', {
        failingTests: ['test1.spec.ts', 'test2.spec.ts'],
      }));

      const task = await service.createTask({ name: 'Test-failed task' });
      const result = await service.completeTask(task.id);

      const testFailure = result.gate?.failingEvidence?.find(f => f.type === 'test');
      expect(testFailure?.details).toContain('test1.spec.ts');
      expect(testFailure?.details).toContain('test2.spec.ts');
    });
  });

  // Scenario 6: Both pass
  describe('Scenario 6: Both pass', () => {
    it('should complete task when both guard and test pass', async () => {
      // Set both evidences as passed
      stateManager.setGuardEvidence(createGuardEvidence('passed', 'report-123'));
      stateManager.setTestEvidence(createTestEvidence('passed', 'run-123'));

      const task = await service.createTask({ name: 'Both-pass task' });
      const result = await service.completeTask(task.id);

      expect(result.status).toBe('completed');
      expect(result.task?.status).toBe('completed');
      expect(result.task?.completedAt).toBeDefined();
      expect(result.message).toContain('completed successfully');
    });

    it('should emit task:complete event when gates pass', async () => {
      const emitSpy = vi.spyOn(mockEventBus, 'emit');

      stateManager.setGuardEvidence(createGuardEvidence('passed', 'report-123'));
      stateManager.setTestEvidence(createTestEvidence('passed', 'run-123'));

      const task = await service.createTask({ name: 'Both-pass task' });
      await service.completeTask(task.id);

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'task:complete',
        })
      );
    });

    it('should record gate_passed timeline event', async () => {
      stateManager.setGuardEvidence(createGuardEvidence('passed', 'report-123'));
      stateManager.setTestEvidence(createTestEvidence('passed', 'run-123'));

      const task = await service.createTask({ name: 'Both-pass task' });
      await service.completeTask(task.id);

      const timeline = stateManager.getTimeline();
      const gateEvent = timeline.find(e => e.type === 'workflow:gate_passed');
      expect(gateEvent).toBeDefined();
      expect(gateEvent?.data.taskId).toBe(task.id);
    });
  });

  // Additional: Gates disabled
  describe('Gates disabled', () => {
    it('should complete task without evidence when gates are disabled', async () => {
      service.setGatesEnabled(false);

      const task = await service.createTask({ name: 'No-gates task' });
      const result = await service.completeTask(task.id);

      expect(result.status).toBe('completed');
      expect(result.task?.status).toBe('completed');
    });
  });

  // Additional: Force complete
  describe('Force complete', () => {
    it('should complete task bypassing gates with forceCompleteTask', async () => {
      // No evidence set
      const task = await service.createTask({ name: 'Force complete task' });
      const result = await service.forceCompleteTask(task.id);

      expect(result?.status).toBe('completed');
    });
  });

  // Additional: Timeline events for gate status
  describe('Timeline events', () => {
    it('should record gate_pending timeline event when evidence missing', async () => {
      const task = await service.createTask({ name: 'Pending task' });
      await service.completeTask(task.id);

      const timeline = stateManager.getTimeline();
      const gateEvent = timeline.find(e => e.type === 'workflow:gate_pending');
      expect(gateEvent).toBeDefined();
      expect(gateEvent?.data.taskId).toBe(task.id);
      expect(gateEvent?.data.missingEvidence).toContain('guard');
    });

    it('should record gate_blocked timeline event when evidence fails', async () => {
      stateManager.setGuardEvidence(createGuardEvidence('failed', 'report-fail', ['rule1']));
      stateManager.setTestEvidence(createTestEvidence('passed', 'run-123'));

      const task = await service.createTask({ name: 'Blocked task' });
      await service.completeTask(task.id);

      const timeline = stateManager.getTimeline();
      const gateEvent = timeline.find(e => e.type === 'workflow:gate_blocked');
      expect(gateEvent).toBeDefined();
      expect(gateEvent?.data.taskId).toBe(task.id);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      TASK 5.2: nextToolCalls
  // ═══════════════════════════════════════════════════════════════

  describe('nextToolCalls suggestions', () => {
    it('should suggest both guard_validate and testing_run when both missing (in order)', async () => {
      const task = await service.createTask({ name: 'Missing both task' });
      const result = await service.completeTask(task.id);

      expect(result.status).toBe('pending');
      expect(result.gate?.nextToolCalls).toBeDefined();
      expect(result.gate?.nextToolCalls?.length).toBe(2);

      // Guard should come first (lower priority)
      const guardCall = result.gate?.nextToolCalls?.find(c => c.tool === 'guard_validate');
      const testCall = result.gate?.nextToolCalls?.find(c => c.tool === 'testing_run');

      expect(guardCall).toBeDefined();
      expect(testCall).toBeDefined();
      expect(guardCall!.priority).toBeLessThan(testCall!.priority);
    });

    it('should only suggest guard_validate when only guard is missing', async () => {
      // Test passes but guard missing
      service.updateGatePolicy({ requireGuard: true, requireTest: false });

      const task = await service.createTask({ name: 'Guard only task' });
      const result = await service.completeTask(task.id);

      expect(result.status).toBe('pending');
      expect(result.gate?.nextToolCalls?.length).toBe(1);
      expect(result.gate?.nextToolCalls?.[0].tool).toBe('guard_validate');
    });

    it('should only suggest testing_run when only test is missing', async () => {
      // Guard passes but test missing
      service.updateGatePolicy({ requireGuard: false, requireTest: true });

      const task = await service.createTask({ name: 'Test only task' });
      const result = await service.completeTask(task.id);

      expect(result.status).toBe('pending');
      expect(result.gate?.nextToolCalls?.length).toBe(1);
      expect(result.gate?.nextToolCalls?.[0].tool).toBe('testing_run');
    });

    it('should suggest guard_validate rerun when guard fails', async () => {
      stateManager.setGuardEvidence(createGuardEvidence('failed', 'report-fail', ['no_fake_tests']));
      stateManager.setTestEvidence(createTestEvidence('passed', 'run-123'));

      const task = await service.createTask({ name: 'Guard failed task' });
      const result = await service.completeTask(task.id);

      expect(result.status).toBe('blocked');
      const guardCall = result.gate?.nextToolCalls?.find(c => c.tool === 'guard_validate');
      expect(guardCall).toBeDefined();
      expect(guardCall?.reason).toContain('Guard failed');
      expect(guardCall?.reason).toContain('re-run');
    });

    it('should suggest testing_run rerun when tests fail', async () => {
      stateManager.setGuardEvidence(createGuardEvidence('passed', 'report-123'));
      stateManager.setTestEvidence(createTestEvidence('failed', 'run-fail', {
        failingTests: ['test1.spec.ts'],
      }));

      const task = await service.createTask({ name: 'Tests failed task' });
      const result = await service.completeTask(task.id);

      expect(result.status).toBe('blocked');
      const testCall = result.gate?.nextToolCalls?.find(c => c.tool === 'testing_run');
      expect(testCall).toBeDefined();
      expect(testCall?.reason).toContain('Tests failed');
      expect(testCall?.reason).toContain('re-run');
    });

    it('should not include nextToolCalls when gates are disabled', async () => {
      service.setGatesEnabled(false);

      const task = await service.createTask({ name: 'No gates task' });
      const result = await service.completeTask(task.id);

      expect(result.status).toBe('completed');
      expect(result.gate).toBeUndefined();
    });

    it('should include priority in nextToolCalls', async () => {
      const task = await service.createTask({ name: 'Priority test task' });
      const result = await service.completeTask(task.id);

      expect(result.gate?.nextToolCalls).toBeDefined();
      for (const call of result.gate?.nextToolCalls || []) {
        expect(typeof call.priority).toBe('number');
      }
    });

    it('should include taskId in nextToolCalls args', async () => {
      const task = await service.createTask({ name: 'TaskId args task' });
      const result = await service.completeTask(task.id);

      expect(result.gate?.nextToolCalls).toBeDefined();
      for (const call of result.gate?.nextToolCalls || []) {
        expect(call.args.taskId).toBe(task.id);
      }
    });

    it('should include scope=affected in testing_run args', async () => {
      const task = await service.createTask({ name: 'Scope test task' });
      const result = await service.completeTask(task.id);

      const testCall = result.gate?.nextToolCalls?.find(c => c.tool === 'testing_run');
      expect(testCall?.args.scope).toBe('affected');
    });

    it('should include ruleset=frontend for frontend tasks', async () => {
      const task = await service.createTask({ name: 'Frontend component task', tags: ['frontend'] });
      const result = await service.completeTask(task.id);

      const guardCall = result.gate?.nextToolCalls?.find(c => c.tool === 'guard_validate');
      expect(guardCall?.args.ruleset).toBe('frontend');
    });

    it('should include ruleset=backend for backend tasks', async () => {
      const task = await service.createTask({ name: 'Backend API task', tags: ['backend'] });
      const result = await service.completeTask(task.id);

      const guardCall = result.gate?.nextToolCalls?.find(c => c.tool === 'guard_validate');
      expect(guardCall?.args.ruleset).toBe('backend');
    });
  });

  // Timeline payload metadata-only verification
  describe('Timeline payload size', () => {
    it('should keep timeline event payload metadata-only (no large data)', async () => {
      stateManager.setGuardEvidence(createGuardEvidence('failed', 'report-fail', [
        'rule1', 'rule2', 'rule3', 'rule4', 'rule5',
        'rule6', 'rule7', 'rule8', 'rule9', 'rule10',
      ]));
      stateManager.setTestEvidence(createTestEvidence('passed', 'run-123'));

      const task = await service.createTask({ name: 'Large payload task' });
      await service.completeTask(task.id);

      const timeline = stateManager.getTimeline();
      const gateEvent = timeline.find(e => e.type === 'workflow:gate_blocked');

      expect(gateEvent).toBeDefined();
      // Ensure no large data in payload
      expect(gateEvent?.data.taskId).toBeDefined();
      expect(gateEvent?.data.taskName).toBeDefined();
      expect(gateEvent?.data.gateStatus).toBeDefined();
      // failingEvidence should be summarized (type, reason only), not full details
      const failingEvidence = gateEvent?.data.failingEvidence;
      if (failingEvidence) {
        for (const fe of failingEvidence) {
          expect(fe.type).toBeDefined();
          expect(fe.reason).toBeDefined();
          // Should NOT include full details array in timeline
          expect(fe.details).toBeUndefined();
        }
      }
    });
  });
});
