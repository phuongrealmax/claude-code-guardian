// tests/unit/workflow-executor.test.ts
/**
 * WorkflowExecutor Tests (Sprint 7)
 *
 * Tests:
 * 1. Topological order execution (serial)
 * 2. Parallel execution with concurrencyLimit
 * 3. Gate blocks node when evidence missing
 * 4. Gate blocks when evidence stale (freshness)
 * 5. Decision branching chooses correct edge
 * 6. Bypass gates emits audit event
 * 7. Cycle detection throws error
 */

import { vi } from 'vitest';
import {
  WorkflowExecutor,
  TaskRunner,
  WorkflowExecutorDeps,
} from '../../src/modules/auto-agent/workflow-executor.js';
import {
  WorkflowGraph,
  WorkflowNode,
  WorkflowEdge,
  evaluateEdgeCondition,
  getEffectiveGateRequired,
  getPathValue,
} from '../../src/modules/auto-agent/task-graph.js';
import { CompletionGatesService, EvidenceState, createGuardEvidence, createTestEvidence } from '../../src/core/completion-gates.js';
import { EventBus, CCGEvent } from '../../src/core/event-bus.js';
import { Logger } from '../../src/core/logger.js';

// ═══════════════════════════════════════════════════════════════
//                      TEST HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Create a simple linear graph: A -> B -> C
 */
function createLinearGraph(): WorkflowGraph {
  return {
    version: '1.0',
    entry: 'A',
    nodes: [
      { id: 'A', kind: 'task', label: 'Task A' },
      { id: 'B', kind: 'task', label: 'Task B' },
      { id: 'C', kind: 'task', label: 'Task C' },
    ],
    edges: [
      { from: 'A', to: 'B' },
      { from: 'B', to: 'C' },
    ],
  };
}

/**
 * Create a diamond graph: A -> B, A -> C, B -> D, C -> D
 */
function createDiamondGraph(): WorkflowGraph {
  return {
    version: '1.0',
    entry: 'A',
    nodes: [
      { id: 'A', kind: 'task', label: 'Start' },
      { id: 'B', kind: 'task', label: 'Branch B' },
      { id: 'C', kind: 'task', label: 'Branch C' },
      { id: 'D', kind: 'join', label: 'Join' },
    ],
    edges: [
      { from: 'A', to: 'B' },
      { from: 'A', to: 'C' },
      { from: 'B', to: 'D' },
      { from: 'C', to: 'D' },
    ],
  };
}

/**
 * Create a decision graph with conditional branching
 */
function createDecisionGraph(): WorkflowGraph {
  return {
    version: '1.0',
    entry: 'start',
    nodes: [
      { id: 'start', kind: 'task', label: 'Start' },
      { id: 'decision', kind: 'decision', label: 'Check Status', payload: { status: 'success' } },
      { id: 'success-path', kind: 'task', label: 'Success Handler' },
      { id: 'failure-path', kind: 'task', label: 'Failure Handler' },
      { id: 'end', kind: 'join', label: 'End' },
    ],
    edges: [
      { from: 'start', to: 'decision' },
      { from: 'decision', to: 'success-path', condition: { type: 'equals', path: 'results.decision.status', value: 'success' } },
      { from: 'decision', to: 'failure-path', condition: { type: 'equals', path: 'results.decision.status', value: 'failure' } },
      { from: 'success-path', to: 'end' },
      { from: 'failure-path', to: 'end' },
    ],
  };
}

/**
 * Create a gated graph with impl phase
 */
function createGatedGraph(): WorkflowGraph {
  return {
    version: '1.0',
    entry: 'A',
    nodes: [
      { id: 'A', kind: 'task', label: 'Analysis', phase: 'analysis' },
      { id: 'B', kind: 'task', label: 'Implementation', phase: 'impl', gateRequired: true },
    ],
    edges: [
      { from: 'A', to: 'B' },
    ],
  };
}

/**
 * Create a graph with a cycle (invalid)
 */
function createCyclicGraph(): WorkflowGraph {
  return {
    version: '1.0',
    entry: 'A',
    nodes: [
      { id: 'A', kind: 'task', label: 'Task A' },
      { id: 'B', kind: 'task', label: 'Task B' },
      { id: 'C', kind: 'task', label: 'Task C' },
    ],
    edges: [
      { from: 'A', to: 'B' },
      { from: 'B', to: 'C' },
      { from: 'C', to: 'A' }, // Cycle!
    ],
  };
}

/**
 * Fake EventBus for testing
 */
class FakeEventBus extends EventBus {
  public emittedEvents: CCGEvent[] = [];

  emit(event: CCGEvent): void {
    this.emittedEvents.push(event);
    super.emit(event);
  }

  getEventsByType(type: string): CCGEvent[] {
    return this.emittedEvents.filter(e => e.type === type);
  }

  clear(): void {
    this.emittedEvents = [];
  }
}

/**
 * Fake StateManager for evidence
 */
class FakeStateManager {
  private evidence: EvidenceState = { lastGuardRun: null, lastTestRun: null };

  setEvidence(evidence: EvidenceState): void {
    this.evidence = evidence;
  }

  getEvidenceState(): EvidenceState {
    return this.evidence;
  }
}

// ═══════════════════════════════════════════════════════════════
//                      HELPER FUNCTION TESTS
// ═══════════════════════════════════════════════════════════════

describe('Workflow Graph Helpers', () => {
  describe('getPathValue', () => {
    it('should get nested value', () => {
      const obj = { result: { status: 'ok', nested: { deep: 42 } } };
      expect(getPathValue(obj, 'result.status')).toBe('ok');
      expect(getPathValue(obj, 'result.nested.deep')).toBe(42);
    });

    it('should return undefined for missing path', () => {
      const obj = { a: 1 };
      expect(getPathValue(obj, 'b.c')).toBeUndefined();
    });

    it('should handle null in path', () => {
      const obj = { a: null };
      expect(getPathValue(obj, 'a.b')).toBeUndefined();
    });
  });

  describe('evaluateEdgeCondition', () => {
    it('should return true for no condition', () => {
      expect(evaluateEdgeCondition(undefined, {})).toBe(true);
    });

    it('should evaluate equals condition', () => {
      expect(evaluateEdgeCondition(
        { type: 'equals', path: 'status', value: 'ok' },
        { status: 'ok' }
      )).toBe(true);

      expect(evaluateEdgeCondition(
        { type: 'equals', path: 'status', value: 'ok' },
        { status: 'error' }
      )).toBe(false);
    });

    it('should evaluate exists condition', () => {
      expect(evaluateEdgeCondition(
        { type: 'exists', path: 'data' },
        { data: 'something' }
      )).toBe(true);

      expect(evaluateEdgeCondition(
        { type: 'exists', path: 'missing' },
        { data: 'something' }
      )).toBe(false);
    });

    it('should evaluate truthy condition', () => {
      expect(evaluateEdgeCondition(
        { type: 'truthy', path: 'flag' },
        { flag: true }
      )).toBe(true);

      expect(evaluateEdgeCondition(
        { type: 'truthy', path: 'flag' },
        { flag: false }
      )).toBe(false);

      expect(evaluateEdgeCondition(
        { type: 'truthy', path: 'count' },
        { count: 0 }
      )).toBe(false);

      expect(evaluateEdgeCondition(
        { type: 'truthy', path: 'count' },
        { count: 5 }
      )).toBe(true);
    });
  });

  describe('getEffectiveGateRequired', () => {
    it('should use explicit node value when set', () => {
      const node: WorkflowNode = { id: 'A', kind: 'task', gateRequired: false, phase: 'impl' };
      expect(getEffectiveGateRequired(node)).toBe(false);

      const node2: WorkflowNode = { id: 'B', kind: 'task', gateRequired: true, phase: 'analysis' };
      expect(getEffectiveGateRequired(node2)).toBe(true);
    });

    it('should use phase default for impl/test/review', () => {
      expect(getEffectiveGateRequired({ id: 'A', kind: 'task', phase: 'impl' })).toBe(true);
      expect(getEffectiveGateRequired({ id: 'B', kind: 'task', phase: 'test' })).toBe(true);
      expect(getEffectiveGateRequired({ id: 'C', kind: 'task', phase: 'review' })).toBe(true);
    });

    it('should return false for analysis/plan phases', () => {
      expect(getEffectiveGateRequired({ id: 'A', kind: 'task', phase: 'analysis' })).toBe(false);
      expect(getEffectiveGateRequired({ id: 'B', kind: 'task', phase: 'plan' })).toBe(false);
    });

    it('should use graph defaults', () => {
      const node: WorkflowNode = { id: 'A', kind: 'task' };
      expect(getEffectiveGateRequired(node, { gateRequired: true })).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
//                      EXECUTOR TESTS
// ═══════════════════════════════════════════════════════════════

describe('WorkflowExecutor', () => {
  let eventBus: FakeEventBus;
  let logger: Logger;
  let executionOrder: string[];
  let runner: TaskRunner;

  beforeEach(() => {
    eventBus = new FakeEventBus();
    logger = new Logger('error', 'Test');
    executionOrder = [];

    // Create deterministic runner that tracks execution order
    runner = async (node, ctx) => {
      executionOrder.push(node.id);
      return { output: { nodeId: node.id, executedAt: Date.now() } };
    };
  });

  // ─────────────────────────────────────────────────────────────
  //            1. TOPOLOGICAL ORDER EXECUTION
  // ─────────────────────────────────────────────────────────────

  describe('Topological Order Execution', () => {
    it('should execute nodes in correct topological order (serial)', async () => {
      const graph = createLinearGraph();
      const executor = new WorkflowExecutor({
        eventBus,
        logger,
        runner,
        concurrencyLimit: 1,
        bypassGates: true,
      });

      const summary = await executor.execute(graph, {});

      expect(summary.status).toBe('completed');
      expect(executionOrder).toEqual(['A', 'B', 'C']);
      expect(summary.completedNodes).toHaveLength(3);
    });

    it('should handle diamond graph with join node', async () => {
      const graph = createDiamondGraph();
      const executor = new WorkflowExecutor({
        eventBus,
        logger,
        runner,
        concurrencyLimit: 1,
        bypassGates: true,
      });

      const summary = await executor.execute(graph, {});

      expect(summary.status).toBe('completed');
      // A must be first, D must be last
      expect(executionOrder[0]).toBe('A');
      expect(executionOrder[executionOrder.length - 1]).toBe('D');
    });
  });

  // ─────────────────────────────────────────────────────────────
  //            2. PARALLEL EXECUTION
  // ─────────────────────────────────────────────────────────────

  describe('Parallel Execution', () => {
    it('should execute parallel branches with concurrencyLimit=2', async () => {
      const graph = createDiamondGraph();
      const startTimes: Record<string, number> = {};
      const endTimes: Record<string, number> = {};

      const parallelRunner: TaskRunner = async (node, ctx) => {
        startTimes[node.id] = Date.now();
        // Simulate async work
        await new Promise(resolve => setTimeout(resolve, 10));
        endTimes[node.id] = Date.now();
        executionOrder.push(node.id);
        return { output: { nodeId: node.id } };
      };

      const executor = new WorkflowExecutor({
        eventBus,
        logger,
        runner: parallelRunner,
        concurrencyLimit: 2,
        bypassGates: true,
      });

      const summary = await executor.execute(graph, {});

      expect(summary.status).toBe('completed');
      expect(summary.completedNodes).toHaveLength(4);

      // B and C should have overlapping execution (started before the other finished)
      // This verifies parallel execution is happening
      if (startTimes['B'] && startTimes['C']) {
        const bStartedBeforeCEnded = startTimes['B'] < endTimes['C'];
        const cStartedBeforeBEnded = startTimes['C'] < endTimes['B'];
        // At least one should be true if running in parallel
        expect(bStartedBeforeCEnded || cStartedBeforeBEnded).toBe(true);
      }
    });

    it('should respect concurrency limit', async () => {
      // Create a graph with 4 parallel tasks
      const graph: WorkflowGraph = {
        version: '1.0',
        entry: 'start',
        nodes: [
          { id: 'start', kind: 'task', label: 'Start' },
          { id: 'p1', kind: 'task', label: 'Parallel 1' },
          { id: 'p2', kind: 'task', label: 'Parallel 2' },
          { id: 'p3', kind: 'task', label: 'Parallel 3' },
          { id: 'p4', kind: 'task', label: 'Parallel 4' },
          { id: 'end', kind: 'join', label: 'End' },
        ],
        edges: [
          { from: 'start', to: 'p1' },
          { from: 'start', to: 'p2' },
          { from: 'start', to: 'p3' },
          { from: 'start', to: 'p4' },
          { from: 'p1', to: 'end' },
          { from: 'p2', to: 'end' },
          { from: 'p3', to: 'end' },
          { from: 'p4', to: 'end' },
        ],
      };

      let maxConcurrent = 0;
      let currentConcurrent = 0;

      const concurrencyTrackingRunner: TaskRunner = async (node, ctx) => {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
        await new Promise(resolve => setTimeout(resolve, 20));
        currentConcurrent--;
        executionOrder.push(node.id);
        return { output: { nodeId: node.id } };
      };

      const executor = new WorkflowExecutor({
        eventBus,
        logger,
        runner: concurrencyTrackingRunner,
        concurrencyLimit: 2,
        bypassGates: true,
      });

      await executor.execute(graph, {});

      // Max concurrent should not exceed limit (start runs first, then max 2 parallel)
      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });
  });

  // ─────────────────────────────────────────────────────────────
  //            3. GATE BLOCKS WHEN EVIDENCE MISSING
  // ─────────────────────────────────────────────────────────────

  describe('Gate Blocking (Missing Evidence)', () => {
    it('should block node when guard evidence is missing', async () => {
      const graph = createGatedGraph();
      const fakeStateManager = new FakeStateManager();
      // No evidence set - both guard and test missing

      const executor = new WorkflowExecutor({
        eventBus,
        logger,
        runner,
        stateManager: fakeStateManager as unknown as any,
        bypassGates: false, // Enforce gates
      });

      const summary = await executor.execute(graph, {});

      expect(summary.status).toBe('blocked');
      expect(summary.blockedNodes).toContain('B');
      expect(summary.completedNodes).toContain('A'); // Analysis phase completed

      // Check gate event was emitted
      const gatedEvents = eventBus.getEventsByType('taskgraph:node:gated');
      expect(gatedEvents.length).toBeGreaterThan(0);
      expect(gatedEvents[0].data).toHaveProperty('nodeId', 'B');
    });

    it('should include nextToolCalls when blocked', async () => {
      const graph = createGatedGraph();
      const fakeStateManager = new FakeStateManager();

      const executor = new WorkflowExecutor({
        eventBus,
        logger,
        runner,
        stateManager: fakeStateManager as unknown as any,
        bypassGates: false,
      });

      const summary = await executor.execute(graph, {});

      expect(summary.blockedNodes).toContain('B');
      const blockedResult = summary.nodeResults.get('B');
      expect(blockedResult).toBeDefined();
      expect(blockedResult?.gateResult?.nextToolCalls).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────
  //            4. GATE BLOCKS WHEN EVIDENCE STALE
  // ─────────────────────────────────────────────────────────────

  describe('Gate Blocking (Stale Evidence)', () => {
    it('should block node when evidence is stale', async () => {
      const graph = createGatedGraph();
      const fakeStateManager = new FakeStateManager();

      // Set stale evidence (10 minutes old, default maxAge is 5 minutes)
      const staleTimestamp = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      fakeStateManager.setEvidence({
        lastGuardRun: { ...createGuardEvidence('passed', 'guard-123'), timestamp: staleTimestamp },
        lastTestRun: { ...createTestEvidence('passed', 'test-456'), timestamp: staleTimestamp },
      });

      const executor = new WorkflowExecutor({
        eventBus,
        logger,
        runner,
        stateManager: fakeStateManager as unknown as any,
        bypassGates: false,
      });

      const summary = await executor.execute(graph, {});

      expect(summary.status).toBe('blocked');
      expect(summary.blockedNodes).toContain('B');

      // Verify the blocking is due to stale evidence (treated as missing)
      const blockedResult = summary.nodeResults.get('B');
      expect(blockedResult?.gateResult?.status).toBe('pending');
    });

    it('should pass when evidence is fresh', async () => {
      const graph = createGatedGraph();
      const fakeStateManager = new FakeStateManager();

      // Set fresh evidence
      const freshTimestamp = new Date().toISOString();
      fakeStateManager.setEvidence({
        lastGuardRun: { ...createGuardEvidence('passed', 'guard-123'), timestamp: freshTimestamp },
        lastTestRun: { ...createTestEvidence('passed', 'test-456'), timestamp: freshTimestamp },
      });

      const executor = new WorkflowExecutor({
        eventBus,
        logger,
        runner,
        stateManager: fakeStateManager as unknown as any,
        bypassGates: false,
      });

      const summary = await executor.execute(graph, {});

      expect(summary.status).toBe('completed');
      expect(summary.completedNodes).toContain('A');
      expect(summary.completedNodes).toContain('B');
    });
  });

  // ─────────────────────────────────────────────────────────────
  //            5. DECISION BRANCHING
  // ─────────────────────────────────────────────────────────────

  describe('Decision Branching', () => {
    it('should choose correct edge based on context (success path)', async () => {
      const graph = createDecisionGraph();

      const executor = new WorkflowExecutor({
        eventBus,
        logger,
        runner,
        bypassGates: true,
      });

      const summary = await executor.execute(graph, {});

      expect(summary.status).toBe('completed');
      expect(summary.completedNodes).toContain('start');
      expect(summary.completedNodes).toContain('decision');
      expect(summary.completedNodes).toContain('success-path');
      expect(summary.completedNodes).toContain('end');
      // Failure path should be skipped
      expect(summary.skippedNodes).toContain('failure-path');
    });

    it('should choose failure path when context indicates failure', async () => {
      // Modify the decision node's payload to indicate failure
      const graph: WorkflowGraph = {
        ...createDecisionGraph(),
        nodes: createDecisionGraph().nodes.map(n =>
          n.id === 'decision' ? { ...n, payload: { status: 'failure' } } : n
        ),
      };

      const executor = new WorkflowExecutor({
        eventBus,
        logger,
        runner,
        bypassGates: true,
      });

      const summary = await executor.execute(graph, {});

      expect(summary.status).toBe('completed');
      expect(summary.completedNodes).toContain('failure-path');
      expect(summary.skippedNodes).toContain('success-path');
    });

    it('should emit skipped event for unchosen branches', async () => {
      const graph = createDecisionGraph();

      const executor = new WorkflowExecutor({
        eventBus,
        logger,
        runner,
        bypassGates: true,
      });

      await executor.execute(graph, {});

      const skippedEvents = eventBus.getEventsByType('taskgraph:node:skipped');
      expect(skippedEvents.length).toBeGreaterThan(0);
      expect(skippedEvents.some(e => e.data && (e.data as Record<string, unknown>).nodeId === 'failure-path')).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  //            6. BYPASS GATES AUDIT
  // ─────────────────────────────────────────────────────────────

  describe('Bypass Gates Audit', () => {
    it('should emit bypass_gates audit event when gates are bypassed', async () => {
      const graph = createGatedGraph();

      const executor = new WorkflowExecutor({
        eventBus,
        logger,
        runner,
        bypassGates: true, // Bypass enabled
      });

      await executor.execute(graph, {});

      const bypassEvents = eventBus.getEventsByType('taskgraph:node:bypass_gates');
      expect(bypassEvents.length).toBeGreaterThan(0);

      // Find bypass event for gated node B
      const bypassForB = bypassEvents.find(e => (e.data as Record<string, unknown>).nodeId === 'B');
      expect(bypassForB).toBeDefined();
      expect(bypassForB?.data).toHaveProperty('gateRequired', true);
      expect(bypassForB?.data).toHaveProperty('reason');
    });

    it('should complete gated node when bypass is enabled', async () => {
      const graph = createGatedGraph();

      const executor = new WorkflowExecutor({
        eventBus,
        logger,
        runner,
        bypassGates: true,
      });

      const summary = await executor.execute(graph, {});

      expect(summary.status).toBe('completed');
      expect(summary.completedNodes).toContain('B');
      expect(summary.blockedNodes).toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────────────────────────
  //            7. CYCLE DETECTION
  // ─────────────────────────────────────────────────────────────

  describe('Cycle Detection', () => {
    it('should throw error for cyclic graph', async () => {
      const graph = createCyclicGraph();

      const executor = new WorkflowExecutor({
        eventBus,
        logger,
        runner,
        bypassGates: true,
      });

      await expect(executor.execute(graph, {})).rejects.toThrow(/cycle detected/i);
    });

    it('should throw error with clear message for invalid entry', async () => {
      const graph: WorkflowGraph = {
        version: '1.0',
        entry: 'nonexistent',
        nodes: [{ id: 'A', kind: 'task' }],
        edges: [],
      };

      const executor = new WorkflowExecutor({
        eventBus,
        logger,
        runner,
        bypassGates: true,
      });

      await expect(executor.execute(graph, {})).rejects.toThrow(/entry node.*not found/i);
    });

    it('should throw error for invalid edge reference', async () => {
      const graph: WorkflowGraph = {
        version: '1.0',
        entry: 'A',
        nodes: [{ id: 'A', kind: 'task' }],
        edges: [{ from: 'A', to: 'nonexistent' }],
      };

      const executor = new WorkflowExecutor({
        eventBus,
        logger,
        runner,
        bypassGates: true,
      });

      await expect(executor.execute(graph, {})).rejects.toThrow(/'to' node.*not found/i);
    });
  });

  // ─────────────────────────────────────────────────────────────
  //            EVENTS
  // ─────────────────────────────────────────────────────────────

  describe('Events', () => {
    it('should emit started event for each node', async () => {
      const graph = createLinearGraph();

      const executor = new WorkflowExecutor({
        eventBus,
        logger,
        runner,
        bypassGates: true,
      });

      await executor.execute(graph, {});

      const startedEvents = eventBus.getEventsByType('taskgraph:node:started');
      expect(startedEvents).toHaveLength(3);
    });

    it('should emit completed event for each successful node', async () => {
      const graph = createLinearGraph();

      const executor = new WorkflowExecutor({
        eventBus,
        logger,
        runner,
        bypassGates: true,
      });

      await executor.execute(graph, {});

      const completedEvents = eventBus.getEventsByType('taskgraph:node:completed');
      expect(completedEvents).toHaveLength(3);
    });

    it('should emit workflow:completed event at end', async () => {
      const graph = createLinearGraph();

      const executor = new WorkflowExecutor({
        eventBus,
        logger,
        runner,
        bypassGates: true,
      });

      await executor.execute(graph, {});

      const workflowEvents = eventBus.getEventsByType('taskgraph:workflow:completed');
      expect(workflowEvents).toHaveLength(1);
      expect(workflowEvents[0].data).toHaveProperty('status', 'completed');
    });
  });
});
