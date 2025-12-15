// tests/unit/task-graph-gated.test.ts
// Sprint 6: Tests for gated workflow execution

import { vi } from 'vitest';
import { TaskGraphService, TaskNode, TaskGraph } from '../../src/modules/auto-agent/task-graph.js';
import { createTaskGraphTools } from '../../src/modules/auto-agent/task-graph.tools.js';
import { EventBus } from '../../src/core/event-bus.js';
import { Logger } from '../../src/core/logger.js';
import { StateManager } from '../../src/core/state-manager.js';

// Mock logger
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  child: () => mockLogger,
} as unknown as Logger;

describe('TaskGraphService - Gated Workflow Execution', () => {
  let taskGraphService: TaskGraphService;
  let eventBus: EventBus;
  let mockStateManager: Partial<StateManager>;

  beforeEach(() => {
    vi.clearAllMocks();
    eventBus = new EventBus();

    // Mock StateManager with evidence state
    mockStateManager = {
      getEvidenceState: vi.fn().mockReturnValue({
        lastGuardRun: null,
        lastTestRun: null,
      }),
    };

    taskGraphService = new TaskGraphService(
      mockLogger,
      eventBus,
      mockStateManager as StateManager
    );
  });

  // ═══════════════════════════════════════════════════════════════
  //                    GATED NODE CREATION
  // ═══════════════════════════════════════════════════════════════

  describe('gated node creation', () => {
    it('should create nodes with gateRequired based on phase', () => {
      const graph = taskGraphService.createGraph({
        name: 'Test Feature',
        taskType: 'feature',
      });

      const nodes = Array.from(graph.nodes.values());

      // Analysis and plan phases should NOT require gates
      const analysisNodes = nodes.filter(n => n.phase === 'analysis');
      const planNodes = nodes.filter(n => n.phase === 'plan');
      analysisNodes.forEach(n => expect(n.gateRequired).toBe(false));
      planNodes.forEach(n => expect(n.gateRequired).toBe(false));

      // Impl, test, and review phases SHOULD require gates
      const implNodes = nodes.filter(n => n.phase === 'impl');
      const testNodes = nodes.filter(n => n.phase === 'test');
      const reviewNodes = nodes.filter(n => n.phase === 'review');
      implNodes.forEach(n => expect(n.gateRequired).toBe(true));
      testNodes.forEach(n => expect(n.gateRequired).toBe(true));
      reviewNodes.forEach(n => expect(n.gateRequired).toBe(true));
    });

    it('should apply gatePolicy from templates to nodes', () => {
      const graph = taskGraphService.createGraph({
        name: 'Test Feature',
        taskType: 'feature',
      });

      const nodes = Array.from(graph.nodes.values());
      const finalReview = nodes.find(n => n.name.includes('Final Review'));

      expect(finalReview).toBeDefined();
      expect(finalReview?.gatePolicy).toBeDefined();
      expect(finalReview?.gatePolicy?.requireGuard).toBe(true);
      expect(finalReview?.gatePolicy?.requireTest).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                    tryCompleteNode
  // ═══════════════════════════════════════════════════════════════

  describe('tryCompleteNode', () => {
    it('should complete non-gated nodes directly', () => {
      const graph = taskGraphService.createGraph({
        name: 'Test Feature',
        taskType: 'feature',
      });

      // Get an analysis node (not gated)
      const nodes = Array.from(graph.nodes.values());
      const analysisNode = nodes.find(n => n.phase === 'analysis' && n.status === 'ready');

      expect(analysisNode).toBeDefined();

      // Start it first
      taskGraphService.startNode(graph.id, analysisNode!.id);

      // Try complete - should succeed without evidence
      const result = taskGraphService.tryCompleteNode(graph.id, analysisNode!.id);

      expect(result.success).toBe(true);
      expect(result.node).toBeDefined();
      expect(result.node?.status).toBe('completed');
    });

    it('should block gated nodes without evidence', () => {
      const graph = taskGraphService.createGraph({
        name: 'Test Feature',
        taskType: 'feature',
      });

      // Complete analysis and plan nodes first to unlock impl
      const nodes = Array.from(graph.nodes.values());

      // Find and complete analysis nodes (bypass gates since they don't need them)
      const readyNodes = nodes.filter(n => n.status === 'ready');
      readyNodes.forEach(n => {
        taskGraphService.startNode(graph.id, n.id);
        taskGraphService.completeNode(graph.id, n.id); // bypass
      });

      // Now find an impl node
      const updatedGraph = taskGraphService.getGraph(graph.id)!;
      const implNodes = Array.from(updatedGraph.nodes.values()).filter(
        n => n.phase === 'impl' && n.status === 'ready'
      );

      if (implNodes.length > 0) {
        const implNode = implNodes[0];
        taskGraphService.startNode(graph.id, implNode.id);

        // Try complete - should be blocked (no evidence)
        const result = taskGraphService.tryCompleteNode(graph.id, implNode.id);

        expect(result.success).toBe(false);
        expect(result.gateResult).toBeDefined();
        expect(result.gateResult?.status).not.toBe('passed');
      }
    });

    it('should pass gated nodes with valid evidence', () => {
      // Update mock to return valid evidence
      (mockStateManager.getEvidenceState as ReturnType<typeof vi.fn>).mockReturnValue({
        lastGuardRun: {
          timestamp: new Date(),
          valid: true,
          blocked: false,
          issues: [],
        },
        lastTestRun: {
          timestamp: new Date(),
          passed: 10,
          failed: 0,
          success: true,
        },
      });

      const graph = taskGraphService.createGraph({
        name: 'Test Feature',
        taskType: 'feature',
      });

      // Complete analysis and plan nodes first to unlock impl
      const nodes = Array.from(graph.nodes.values());
      const readyNodes = nodes.filter(n => n.status === 'ready');
      readyNodes.forEach(n => {
        taskGraphService.startNode(graph.id, n.id);
        taskGraphService.completeNode(graph.id, n.id);
      });

      // Now find an impl node
      const updatedGraph = taskGraphService.getGraph(graph.id)!;
      const implNodes = Array.from(updatedGraph.nodes.values()).filter(
        n => n.phase === 'impl' && n.status === 'ready'
      );

      if (implNodes.length > 0) {
        const implNode = implNodes[0];
        taskGraphService.startNode(graph.id, implNode.id);

        // Try complete - should succeed with evidence
        const result = taskGraphService.tryCompleteNode(graph.id, implNode.id);

        expect(result.success).toBe(true);
        expect(result.node?.status).toBe('completed');
        expect(result.gateResult?.status).toBe('passed');
      }
    });

    it('should return missing evidence hints when blocked', () => {
      const graph = taskGraphService.createGraph({
        name: 'Test Feature',
        taskType: 'feature',
      });

      // Complete analysis nodes
      const nodes = Array.from(graph.nodes.values());
      const readyNodes = nodes.filter(n => n.status === 'ready');
      readyNodes.forEach(n => {
        taskGraphService.startNode(graph.id, n.id);
        taskGraphService.completeNode(graph.id, n.id);
      });

      // Find an impl node
      const updatedGraph = taskGraphService.getGraph(graph.id)!;
      const implNodes = Array.from(updatedGraph.nodes.values()).filter(
        n => n.phase === 'impl' && n.status === 'ready'
      );

      if (implNodes.length > 0) {
        const implNode = implNodes[0];
        taskGraphService.startNode(graph.id, implNode.id);

        const result = taskGraphService.tryCompleteNode(graph.id, implNode.id);

        expect(result.success).toBe(false);
        expect(result.gateResult?.missingEvidence).toBeDefined();
        expect(result.gateResult?.nextToolCalls).toBeDefined();
        expect(result.gateResult?.nextToolCalls?.length).toBeGreaterThan(0);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                    EVENTS
  // ═══════════════════════════════════════════════════════════════

  describe('gated events', () => {
    it('should emit taskgraph:node:bypass_gates when bypass used', () => {
      const events: { type: string; data?: unknown }[] = [];
      eventBus.on('taskgraph:node:bypass_gates', (e) => events.push({ type: 'bypass', data: e.data }));

      const graph = taskGraphService.createGraph({
        name: 'Test Bypass Audit',
        taskType: 'feature',
      });

      const nodes = Array.from(graph.nodes.values());
      const firstNode = nodes.find(n => n.status === 'ready')!;

      // Start and bypass complete
      taskGraphService.startNode(graph.id, firstNode.id);
      taskGraphService.completeNodeBypass(graph.id, firstNode.id, undefined, undefined, 'Test reason');

      expect(events.length).toBe(1);
      expect(events[0].type).toBe('bypass');
      expect((events[0].data as { reason: string }).reason).toBe('Test reason');
    });

    it('should emit taskgraph:node:gated when blocked', () => {
      const events: string[] = [];
      eventBus.on('taskgraph:node:gated', () => events.push('gated'));

      const graph = taskGraphService.createGraph({
        name: 'Test Feature',
        taskType: 'feature',
      });

      // Complete analysis nodes
      const nodes = Array.from(graph.nodes.values());
      const readyNodes = nodes.filter(n => n.status === 'ready');
      readyNodes.forEach(n => {
        taskGraphService.startNode(graph.id, n.id);
        taskGraphService.completeNode(graph.id, n.id);
      });

      // Find an impl node
      const updatedGraph = taskGraphService.getGraph(graph.id)!;
      const implNodes = Array.from(updatedGraph.nodes.values()).filter(
        n => n.phase === 'impl' && n.status === 'ready'
      );

      if (implNodes.length > 0) {
        const implNode = implNodes[0];
        taskGraphService.startNode(graph.id, implNode.id);
        taskGraphService.tryCompleteNode(graph.id, implNode.id);

        expect(events).toContain('gated');
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════
//                    MCP TOOLS
// ═══════════════════════════════════════════════════════════════

describe('TaskGraph MCP Tools - Gated Workflow', () => {
  let taskGraphService: TaskGraphService;
  let tools: ReturnType<typeof createTaskGraphTools>;
  let eventBus: EventBus;

  beforeEach(() => {
    vi.clearAllMocks();
    eventBus = new EventBus();
    taskGraphService = new TaskGraphService(mockLogger, eventBus);
    tools = createTaskGraphTools(taskGraphService);
  });

  describe('auto_workflow_start', () => {
    it('should create workflow and return gate info', async () => {
      const result = await tools.auto_workflow_start.handler({
        name: 'Add Authentication',
        taskType: 'feature',
        description: 'Add JWT authentication',
      });

      expect(result.success).toBe(true);
      expect(result.workflow.graphId).toBeDefined();
      expect(result.summary.gatedNodes).toBeGreaterThan(0);
      expect(result.nextNodes.length).toBeGreaterThan(0);
      expect(result.allNodes.length).toBeGreaterThan(0);
      expect(result.instructions.length).toBeGreaterThan(0);
    });

    it('should indicate gateRequired for each node', async () => {
      const result = await tools.auto_workflow_start.handler({
        name: 'Fix Bug',
        taskType: 'bugfix',
      });

      expect(result.success).toBe(true);

      // All nodes should have gateRequired field
      result.allNodes.forEach((node: { gateRequired: boolean }) => {
        expect(typeof node.gateRequired).toBe('boolean');
      });

      // Some should be gated, some not
      const gated = result.allNodes.filter((n: { gateRequired: boolean }) => n.gateRequired);
      const notGated = result.allNodes.filter((n: { gateRequired: boolean }) => !n.gateRequired);

      expect(gated.length).toBeGreaterThan(0);
      expect(notGated.length).toBeGreaterThan(0);
    });

    it('should return all template types', async () => {
      const types = ['feature', 'bugfix', 'refactor', 'review'] as const;

      for (const taskType of types) {
        const result = await tools.auto_workflow_start.handler({
          name: `Test ${taskType}`,
          taskType,
        });

        expect(result.success).toBe(true);
        expect(result.workflow.taskType).toBe(taskType);
        expect(result.summary.totalNodes).toBeGreaterThan(0);
      }
    });
  });

  describe('auto_complete_node with gates', () => {
    it('should block gated nodes without evidence by default', async () => {
      // Create workflow
      const workflow = await tools.auto_workflow_start.handler({
        name: 'Test Gated',
        taskType: 'bugfix',
      });

      const graphId = workflow.workflow.graphId;

      // Complete analysis nodes to get to impl
      const analysisNodes = workflow.allNodes.filter(
        (n: { phase: string; status: string }) => n.phase === 'analysis' && n.status === 'ready'
      );

      for (const node of analysisNodes) {
        await tools.auto_start_node.handler({ graphId, nodeId: node.id });
        await tools.auto_complete_node.handler({
          graphId,
          nodeId: node.id,
          bypassGates: true, // bypass for analysis
        });
      }

      // Get updated next nodes
      const nextResult = await tools.auto_get_next_nodes.handler({ graphId });
      const implNode = nextResult.nodes.find(
        (n: { phase: string }) => n.phase === 'impl'
      );

      if (implNode) {
        await tools.auto_start_node.handler({ graphId, nodeId: implNode.id });

        // Try complete without bypass - should be blocked
        const result = await tools.auto_complete_node.handler({
          graphId,
          nodeId: implNode.id,
        });

        expect(result.success).toBe(false);
        expect(result.gateBlocked).toBe(true);
        expect(result.nextToolCalls).toBeDefined();
        expect(result.hint).toBeDefined();
      }
    });

    it('should allow bypassGates for non-gated completion', async () => {
      const workflow = await tools.auto_workflow_start.handler({
        name: 'Test Bypass',
        taskType: 'bugfix',
      });

      const graphId = workflow.workflow.graphId;
      const firstNode = workflow.nextNodes[0];

      await tools.auto_start_node.handler({ graphId, nodeId: firstNode.id });

      // Complete with bypass
      const result = await tools.auto_complete_node.handler({
        graphId,
        nodeId: firstNode.id,
        bypassGates: true,
      });

      expect(result.success).toBe(true);
      expect(result.gateBypassed).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
//                    GATE POLICY PRECEDENCE (Hardening 2)
// ═══════════════════════════════════════════════════════════════

describe('Gate Policy Resolution Precedence', () => {
  let taskGraphService: TaskGraphService;
  let eventBus: EventBus;

  beforeEach(() => {
    vi.clearAllMocks();
    eventBus = new EventBus();
    taskGraphService = new TaskGraphService(mockLogger, eventBus);
  });

  /**
   * Precedence Order (documented):
   * 1. Explicit gateRequired from template node definition
   * 2. Phase-based default (impl, test, review phases require gates)
   * 3. Global default (gateRequired = false)
   */

  describe('precedence order tests', () => {
    it('should use explicit gateRequired=false over phase default', () => {
      // Create a custom graph with explicit gateRequired=false on an impl node
      const graph = taskGraphService.createGraph({
        name: 'Explicit Override Test',
        taskType: 'custom',
        customNodes: [
          {
            name: 'Impl without gates',
            phase: 'impl',
            gateRequired: false, // Explicit override: impl phase normally requires gates
            tools: [],
            estimatedTokens: 100,
            priority: 1,
          },
        ],
      });

      const nodes = Array.from(graph.nodes.values());
      const implNode = nodes.find(n => n.name === 'Impl without gates');

      expect(implNode).toBeDefined();
      expect(implNode?.phase).toBe('impl');
      // Explicit false should override phase default (impl normally requires gates)
      expect(implNode?.gateRequired).toBe(false);
    });

    it('should use explicit gateRequired=true over phase default', () => {
      // Create a custom graph with explicit gateRequired=true on an analysis node
      const graph = taskGraphService.createGraph({
        name: 'Explicit Enable Test',
        taskType: 'custom',
        customNodes: [
          {
            name: 'Analysis with gates',
            phase: 'analysis',
            gateRequired: true, // Explicit: analysis normally doesn't require gates
            tools: [],
            estimatedTokens: 100,
            priority: 1,
          },
        ],
      });

      const nodes = Array.from(graph.nodes.values());
      const analysisNode = nodes.find(n => n.name === 'Analysis with gates');

      expect(analysisNode).toBeDefined();
      expect(analysisNode?.phase).toBe('analysis');
      // Explicit true should override phase default (analysis normally doesn't require gates)
      expect(analysisNode?.gateRequired).toBe(true);
    });

    it('should fallback to phase default when no explicit value', () => {
      const graph = taskGraphService.createGraph({
        name: 'Phase Default Test',
        taskType: 'feature',
      });

      const nodes = Array.from(graph.nodes.values());

      // Check analysis nodes - phase default is false
      const analysisNodes = nodes.filter(n => n.phase === 'analysis');
      analysisNodes.forEach(n => {
        expect(n.gateRequired).toBe(false);
      });

      // Check impl nodes - phase default is true
      const implNodes = nodes.filter(n => n.phase === 'impl');
      implNodes.forEach(n => {
        expect(n.gateRequired).toBe(true);
      });

      // Check review nodes - phase default is true
      const reviewNodes = nodes.filter(n => n.phase === 'review');
      reviewNodes.forEach(n => {
        expect(n.gateRequired).toBe(true);
      });
    });

    it('should inherit gatePolicy from template when defined', () => {
      const graph = taskGraphService.createGraph({
        name: 'Policy Inheritance Test',
        taskType: 'feature',
      });

      const nodes = Array.from(graph.nodes.values());
      const finalReview = nodes.find(n => n.name.includes('Final Review'));

      // The final review task in feature template has explicit gatePolicy
      expect(finalReview).toBeDefined();
      expect(finalReview?.gatePolicy).toBeDefined();
      expect(finalReview?.gatePolicy?.requireGuard).toBe(true);
      expect(finalReview?.gatePolicy?.requireTest).toBe(true);
    });
  });
});
