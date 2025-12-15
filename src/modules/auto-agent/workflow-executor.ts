// src/modules/auto-agent/workflow-executor.ts
/**
 * Workflow Executor - DAG-based Workflow Execution Engine (Sprint 7)
 *
 * Features:
 * - Topological execution with ready queue
 * - Configurable concurrency limit
 * - Decision node branching with edge conditions
 * - Join nodes for convergence
 * - Completion Gates integration (freshness + precedence)
 * - Audit trail for bypass operations
 * - Timeline events for observability
 */

import { v4 as uuid } from 'uuid';
import { Logger } from '../../core/logger.js';
import { EventBus, CCGEvent } from '../../core/event-bus.js';
import { StateManager } from '../../core/state-manager.js';
import {
  CompletionGatesService,
  GatePolicyConfig,
  GatePolicyResult,
  EvidenceState,
  GateEvaluationContext,
} from '../../core/completion-gates.js';
import {
  WorkflowGraph,
  WorkflowNode,
  WorkflowEdge,
  WorkflowNodeState,
  WorkflowNodeResult,
  WorkflowExecutionSummary,
  evaluateEdgeCondition,
  getEffectiveGateRequired,
} from './task-graph.js';

// ═══════════════════════════════════════════════════════════════
//                         TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Task runner function type - injected for testability
 */
export type TaskRunner = (
  node: WorkflowNode,
  context: Record<string, unknown>
) => Promise<{ output?: unknown; error?: string }>;

/**
 * Executor dependencies
 */
export interface WorkflowExecutorDeps {
  stateManager?: StateManager;
  gates?: CompletionGatesService;
  eventBus?: EventBus;
  logger?: Logger;
  concurrencyLimit?: number;
  runner?: TaskRunner;
  bypassGates?: boolean;
}

/**
 * Executor options for a single execution
 */
export interface ExecuteOptions {
  bypassGates?: boolean;
  concurrencyLimit?: number;
}

/**
 * Internal node tracking state
 */
interface NodeExecutionState {
  state: WorkflowNodeState;
  result?: WorkflowNodeResult;
  retryCount: number;
}

// ═══════════════════════════════════════════════════════════════
//                      WORKFLOW EXECUTOR
// ═══════════════════════════════════════════════════════════════

export class WorkflowExecutor {
  private stateManager?: StateManager;
  private gates: CompletionGatesService;
  private eventBus?: EventBus;
  private logger: Logger;
  private concurrencyLimit: number;
  private runner: TaskRunner;
  private bypassGatesGlobal: boolean;

  constructor(deps: WorkflowExecutorDeps = {}) {
    this.stateManager = deps.stateManager;
    this.gates = deps.gates || new CompletionGatesService();
    this.eventBus = deps.eventBus;
    this.logger = deps.logger || new Logger('info', 'WorkflowExecutor');
    this.concurrencyLimit = deps.concurrencyLimit || 1;
    this.runner = deps.runner || this.defaultRunner.bind(this);
    this.bypassGatesGlobal = deps.bypassGates || false;
  }

  /**
   * Execute a workflow graph
   */
  async execute(
    graph: WorkflowGraph,
    context: Record<string, unknown> = {},
    options: ExecuteOptions = {}
  ): Promise<WorkflowExecutionSummary> {
    const graphId = uuid();
    const startedAt = new Date();
    const effectiveConcurrency = options.concurrencyLimit ?? this.concurrencyLimit;
    const effectiveBypassGates = options.bypassGates ?? this.bypassGatesGlobal;

    this.logger.info(`Executing workflow graph (${graph.nodes.length} nodes, concurrency: ${effectiveConcurrency})`);

    // 1. Validate DAG
    this.validateGraph(graph);

    // 2. Build adjacency and indegree maps
    const { adjacency, indegree, reverseAdjacency } = this.buildGraphMaps(graph);

    // 3. Initialize node states
    const nodeStates = new Map<string, NodeExecutionState>();
    for (const node of graph.nodes) {
      nodeStates.set(node.id, { state: 'pending', retryCount: 0 });
    }

    // 4. Mutable execution context
    const execContext: Record<string, unknown> = { ...context };

    // 5. Track running count for concurrency
    const runningNodes = new Set<string>();
    const nodePromises = new Map<string, Promise<void>>();

    // 6. Ready queue - nodes with indegree 0 and not skipped
    const readyQueue: string[] = [];
    const indegreeCopy = new Map(indegree);

    // Initialize ready queue with entry and other root nodes
    for (const [nodeId, deg] of indegreeCopy) {
      if (deg === 0) {
        readyQueue.push(nodeId);
      }
    }

    // 7. Execute until all nodes are processed
    while (readyQueue.length > 0 || runningNodes.size > 0) {
      // Start nodes up to concurrency limit
      while (readyQueue.length > 0 && runningNodes.size < effectiveConcurrency) {
        const nodeId = readyQueue.shift()!;
        const nodeState = nodeStates.get(nodeId)!;

        // Skip if already processed (skipped/failed)
        if (nodeState.state !== 'pending') {
          continue;
        }

        const node = graph.nodes.find(n => n.id === nodeId)!;

        // Start execution
        runningNodes.add(nodeId);
        nodeState.state = 'running';

        this.emitEvent('taskgraph:node:started', {
          graphId,
          nodeId,
          name: node.label || node.id,
          kind: node.kind,
        });

        // Execute node asynchronously
        const promise = this.executeNode(
          node,
          graph,
          execContext,
          effectiveBypassGates,
          nodeStates
        ).then((result) => {
          runningNodes.delete(nodeId);
          nodeState.result = result;
          nodeState.state = result.status;

          // Handle completion
          if (result.status === 'done') {
            // Store output in context
            if (result.output !== undefined) {
              execContext[`node_${nodeId}`] = result.output;
              execContext[`results`] = {
                ...(execContext[`results`] as Record<string, unknown> || {}),
                [nodeId]: result.output,
              };
            }

            this.emitEvent('taskgraph:node:completed', {
              graphId,
              nodeId,
              name: node.label || node.id,
            });

            // Process outgoing edges for decision nodes
            if (node.kind === 'decision') {
              this.processDecisionNode(
                node,
                graph,
                execContext,
                nodeStates,
                adjacency,
                reverseAdjacency,
                indegreeCopy,
                readyQueue,
                graphId
              );
            } else {
              // For task/join nodes, decrement indegree of all successors
              this.decrementSuccessors(
                nodeId,
                adjacency,
                indegreeCopy,
                readyQueue,
                nodeStates
              );
            }
          } else if (result.status === 'blocked') {
            this.emitEvent('taskgraph:node:gated', {
              graphId,
              nodeId,
              name: node.label || node.id,
              gateStatus: result.gateResult?.status,
              missingEvidence: result.gateResult?.missingEvidence,
              nextToolCalls: result.gateResult?.nextToolCalls,
            });
          } else if (result.status === 'skipped') {
            this.emitEvent('taskgraph:node:skipped', {
              graphId,
              nodeId,
              name: node.label || node.id,
              reason: result.reason || 'Skipped due to decision branch',
            });

            // Skip downstream nodes
            this.skipDownstream(nodeId, adjacency, nodeStates, graphId);
          } else if (result.status === 'failed') {
            this.emitEvent('taskgraph:node:failed', {
              graphId,
              nodeId,
              name: node.label || node.id,
              error: result.reason,
            });

            // Handle onError policy
            const onError = node.onError || 'fail';
            if (onError === 'skip' || onError === 'continue') {
              // Continue execution but mark downstream as potentially affected
              this.decrementSuccessors(
                nodeId,
                adjacency,
                indegreeCopy,
                readyQueue,
                nodeStates
              );
            }
          }
        });

        nodePromises.set(nodeId, promise);
      }

      // Wait for at least one running node to complete
      if (runningNodes.size > 0) {
        const runningPromises = Array.from(runningNodes).map(
          id => nodePromises.get(id)!
        );
        await Promise.race(runningPromises);
      }
    }

    // 8. Wait for all remaining promises
    await Promise.all(nodePromises.values());

    // 9. Build summary
    const completedAt = new Date();
    const summary = this.buildSummary(
      graphId,
      nodeStates,
      startedAt,
      completedAt
    );

    this.emitEvent('taskgraph:workflow:completed', {
      graphId,
      status: summary.status,
      completedNodes: summary.completedNodes.length,
      blockedNodes: summary.blockedNodes.length,
      skippedNodes: summary.skippedNodes.length,
      failedNodes: summary.failedNodes.length,
      durationMs: summary.totalDurationMs,
    });

    this.logger.info(`Workflow completed: ${summary.status} (${summary.totalDurationMs}ms)`);

    return summary;
  }

  // ─────────────────────────────────────────────────────────────
  //                    VALIDATION
  // ─────────────────────────────────────────────────────────────

  /**
   * Validate the workflow graph (DAG check + reference validation)
   */
  private validateGraph(graph: WorkflowGraph): void {
    const nodeIds = new Set(graph.nodes.map(n => n.id));

    // Check entry exists
    if (!nodeIds.has(graph.entry)) {
      throw new Error(`Invalid workflow graph: entry node '${graph.entry}' not found`);
    }

    // Check all edge references exist
    for (const edge of graph.edges) {
      if (!nodeIds.has(edge.from)) {
        throw new Error(`Invalid workflow graph: edge 'from' node '${edge.from}' not found`);
      }
      if (!nodeIds.has(edge.to)) {
        throw new Error(`Invalid workflow graph: edge 'to' node '${edge.to}' not found`);
      }
    }

    // Check for cycles using DFS
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const outgoing = graph.edges.filter(e => e.from === nodeId);
      for (const edge of outgoing) {
        if (!visited.has(edge.to)) {
          if (hasCycle(edge.to)) return true;
        } else if (recursionStack.has(edge.to)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of graph.nodes) {
      if (!visited.has(node.id)) {
        if (hasCycle(node.id)) {
          throw new Error('Invalid workflow graph: cycle detected - DAG constraint violated');
        }
      }
    }
  }

  /**
   * Build adjacency list and indegree map
   */
  private buildGraphMaps(graph: WorkflowGraph): {
    adjacency: Map<string, string[]>;
    reverseAdjacency: Map<string, string[]>;
    indegree: Map<string, number>;
  } {
    const adjacency = new Map<string, string[]>();
    const reverseAdjacency = new Map<string, string[]>();
    const indegree = new Map<string, number>();

    // Initialize
    for (const node of graph.nodes) {
      adjacency.set(node.id, []);
      reverseAdjacency.set(node.id, []);
      indegree.set(node.id, 0);
    }

    // Build from edges
    for (const edge of graph.edges) {
      adjacency.get(edge.from)!.push(edge.to);
      reverseAdjacency.get(edge.to)!.push(edge.from);
      indegree.set(edge.to, indegree.get(edge.to)! + 1);
    }

    return { adjacency, reverseAdjacency, indegree };
  }

  // ─────────────────────────────────────────────────────────────
  //                    NODE EXECUTION
  // ─────────────────────────────────────────────────────────────

  /**
   * Execute a single node
   */
  private async executeNode(
    node: WorkflowNode,
    graph: WorkflowGraph,
    context: Record<string, unknown>,
    bypassGates: boolean,
    nodeStates: Map<string, NodeExecutionState>
  ): Promise<WorkflowNodeResult> {
    try {
      switch (node.kind) {
        case 'task':
          return await this.executeTaskNode(node, graph, context, bypassGates);
        case 'decision':
          return this.executeDecisionNode(node, context);
        case 'join':
          return await this.executeJoinNode(node, nodeStates, graph, context);
        default:
          return { status: 'failed', reason: `Unknown node kind: ${node.kind}` };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Node ${node.id} execution error: ${message}`);
      return { status: 'failed', reason: message };
    }
  }

  /**
   * Execute a task node with gate checking
   */
  private async executeTaskNode(
    node: WorkflowNode,
    graph: WorkflowGraph,
    context: Record<string, unknown>,
    bypassGates: boolean
  ): Promise<WorkflowNodeResult> {
    // Run the task
    const result = await this.runner(node, context);

    if (result.error) {
      return { status: 'failed', reason: result.error };
    }

    // Check gates if required
    const gateRequired = getEffectiveGateRequired(node, graph.defaults);

    if (gateRequired && !bypassGates) {
      const gateResult = this.evaluateGates(node, graph);

      if (gateResult.status !== 'passed') {
        return {
          status: 'blocked',
          output: result.output,
          gateResult,
          nextToolCalls: gateResult.nextToolCalls?.map(c => ({
            tool: c.tool,
            args: c.args,
            reason: c.reason,
          })),
        };
      }
    } else if (gateRequired && bypassGates) {
      // Emit bypass audit event
      this.emitEvent('taskgraph:node:bypass_gates', {
        nodeId: node.id,
        name: node.label || node.id,
        phase: node.phase,
        gateRequired: true,
        reason: 'bypassGates=true in executor options',
      });
    }

    return { status: 'done', output: result.output };
  }

  /**
   * Execute a decision node - produces output for edge evaluation
   */
  private executeDecisionNode(
    node: WorkflowNode,
    context: Record<string, unknown>
  ): WorkflowNodeResult {
    // Decision nodes use payload to determine output
    // The output is used to evaluate edge conditions
    const output = node.payload || {};
    return { status: 'done', output };
  }

  /**
   * Execute a join node - waits for all predecessors
   */
  private async executeJoinNode(
    node: WorkflowNode,
    nodeStates: Map<string, NodeExecutionState>,
    graph: WorkflowGraph,
    context: Record<string, unknown>
  ): Promise<WorkflowNodeResult> {
    // Join is ready when all incoming nodes are done or skipped
    const incoming = graph.edges.filter(e => e.to === node.id);
    const allReady = incoming.every(e => {
      const state = nodeStates.get(e.from)?.state;
      return state === 'done' || state === 'skipped';
    });

    if (allReady) {
      // Call runner for consistency (allows tracking in tests)
      const result = await this.runner(node, context);
      return { status: 'done', output: result.output };
    }

    return { status: 'pending' };
  }

  // ─────────────────────────────────────────────────────────────
  //                    GATE EVALUATION
  // ─────────────────────────────────────────────────────────────

  /**
   * Evaluate completion gates for a node
   */
  private evaluateGates(node: WorkflowNode, graph: WorkflowGraph): GatePolicyResult {
    const evidence = this.getEvidenceState();

    const context: GateEvaluationContext = {
      taskId: node.id,
      taskType: node.phase,
      taskName: node.label,
    };

    // Apply node-specific policy if present
    const effectivePolicy: Partial<GatePolicyConfig> = {
      ...(graph.defaults?.gatePolicy || {}),
      ...(node.gatePolicy || {}),
    };

    if (Object.keys(effectivePolicy).length > 0) {
      this.gates.updateConfig(effectivePolicy);
    }

    return this.gates.evaluateCompletionGates(evidence, context);
  }

  /**
   * Get evidence state from StateManager
   */
  private getEvidenceState(): EvidenceState {
    if (!this.stateManager) {
      return { lastGuardRun: null, lastTestRun: null };
    }
    return this.stateManager.getEvidenceState();
  }

  // ─────────────────────────────────────────────────────────────
  //                    DECISION BRANCHING
  // ─────────────────────────────────────────────────────────────

  /**
   * Process decision node - evaluate conditions and mark unchosen branches as skipped
   */
  private processDecisionNode(
    node: WorkflowNode,
    graph: WorkflowGraph,
    context: Record<string, unknown>,
    nodeStates: Map<string, NodeExecutionState>,
    adjacency: Map<string, string[]>,
    reverseAdjacency: Map<string, string[]>,
    indegreeCopy: Map<string, number>,
    readyQueue: string[],
    graphId: string
  ): void {
    // Get outgoing edges
    const outgoingEdges = graph.edges.filter(e => e.from === node.id);

    // Evaluate each edge condition
    const chosenEdges: WorkflowEdge[] = [];
    const unchosenEdges: WorkflowEdge[] = [];

    for (const edge of outgoingEdges) {
      if (evaluateEdgeCondition(edge.condition, context)) {
        chosenEdges.push(edge);
      } else {
        unchosenEdges.push(edge);
      }
    }

    // Decrement indegree for chosen successors
    for (const edge of chosenEdges) {
      const newIndegree = indegreeCopy.get(edge.to)! - 1;
      indegreeCopy.set(edge.to, newIndegree);
      if (newIndegree === 0 && nodeStates.get(edge.to)!.state === 'pending') {
        readyQueue.push(edge.to);
      }
    }

    // Mark unchosen branches as skipped and propagate
    for (const edge of unchosenEdges) {
      this.markNodeAndDescendantsSkipped(
        edge.to,
        node,
        nodeStates,
        adjacency,
        reverseAdjacency,
        indegreeCopy,
        readyQueue,
        graphId
      );
    }
  }

  /**
   * Recursively mark a node and its exclusive descendants as skipped
   */
  private markNodeAndDescendantsSkipped(
    nodeId: string,
    decisionNode: WorkflowNode,
    nodeStates: Map<string, NodeExecutionState>,
    adjacency: Map<string, string[]>,
    reverseAdjacency: Map<string, string[]>,
    indegreeCopy: Map<string, number>,
    readyQueue: string[],
    graphId: string
  ): void {
    const targetState = nodeStates.get(nodeId)!;

    // Skip if already processed
    if (targetState.state !== 'pending') {
      return;
    }

    // Check if this node is exclusively reachable via skipped/unchosen edges
    const allIncomingSkipped = reverseAdjacency.get(nodeId)!.every(fromId => {
      if (fromId === decisionNode.id) return true; // This is the unchosen edge
      const fromState = nodeStates.get(fromId)?.state;
      return fromState === 'skipped';
    });

    if (allIncomingSkipped) {
      // Mark as skipped
      targetState.state = 'skipped';
      targetState.result = {
        status: 'skipped',
        reason: `Decision '${decisionNode.label || decisionNode.id}' chose different branch`,
      };

      // Emit skipped event
      this.emitEvent('taskgraph:node:skipped', {
        graphId,
        nodeId,
        reason: `Decision '${decisionNode.label || decisionNode.id}' chose different branch`,
      });

      // Decrement indegree of successors (so join nodes can still be scheduled)
      const successors = adjacency.get(nodeId) || [];
      for (const succId of successors) {
        const newIndegree = indegreeCopy.get(succId)! - 1;
        indegreeCopy.set(succId, newIndegree);

        // Recursively process successors that might now be exclusively skipped
        this.markNodeAndDescendantsSkipped(
          succId,
          decisionNode,
          nodeStates,
          adjacency,
          reverseAdjacency,
          indegreeCopy,
          readyQueue,
          graphId
        );

        // If successor isn't skipped and indegree is 0, queue it
        const succState = nodeStates.get(succId)!;
        if (succState.state === 'pending' && indegreeCopy.get(succId) === 0) {
          readyQueue.push(succId);
        }
      }
    }
  }

  /**
   * Decrement indegree for all successors of a completed node
   */
  private decrementSuccessors(
    nodeId: string,
    adjacency: Map<string, string[]>,
    indegreeCopy: Map<string, number>,
    readyQueue: string[],
    nodeStates: Map<string, NodeExecutionState>
  ): void {
    const successors = adjacency.get(nodeId) || [];
    for (const succId of successors) {
      const newIndegree = indegreeCopy.get(succId)! - 1;
      indegreeCopy.set(succId, newIndegree);
      if (newIndegree === 0) {
        const state = nodeStates.get(succId)!;
        if (state.state === 'pending') {
          readyQueue.push(succId);
        }
      }
    }
  }

  /**
   * Skip all downstream nodes (used when a branch is not chosen)
   */
  private skipDownstream(
    nodeId: string,
    adjacency: Map<string, string[]>,
    nodeStates: Map<string, NodeExecutionState>,
    graphId: string
  ): void {
    const successors = adjacency.get(nodeId) || [];
    for (const succId of successors) {
      const state = nodeStates.get(succId)!;
      if (state.state === 'pending') {
        state.state = 'skipped';
        state.result = {
          status: 'skipped',
          reason: `Predecessor '${nodeId}' was skipped`,
        };

        this.emitEvent('taskgraph:node:skipped', {
          graphId,
          nodeId: succId,
          reason: `Predecessor '${nodeId}' was skipped`,
        });

        // Recursively skip downstream
        this.skipDownstream(succId, adjacency, nodeStates, graphId);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  //                    SUMMARY & EVENTS
  // ─────────────────────────────────────────────────────────────

  /**
   * Build execution summary
   */
  private buildSummary(
    graphId: string,
    nodeStates: Map<string, NodeExecutionState>,
    startedAt: Date,
    completedAt: Date
  ): WorkflowExecutionSummary {
    const stateMap = new Map<string, WorkflowNodeState>();
    const resultMap = new Map<string, WorkflowNodeResult>();
    const blockedNodes: string[] = [];
    const skippedNodes: string[] = [];
    const failedNodes: string[] = [];
    const completedNodes: string[] = [];

    for (const [nodeId, exec] of nodeStates) {
      stateMap.set(nodeId, exec.state);
      if (exec.result) {
        resultMap.set(nodeId, exec.result);
      }

      switch (exec.state) {
        case 'done':
          completedNodes.push(nodeId);
          break;
        case 'blocked':
          blockedNodes.push(nodeId);
          break;
        case 'skipped':
          skippedNodes.push(nodeId);
          break;
        case 'failed':
          failedNodes.push(nodeId);
          break;
      }
    }

    // Determine overall status
    let status: 'completed' | 'failed' | 'blocked' = 'completed';
    if (blockedNodes.length > 0) {
      status = 'blocked';
    } else if (failedNodes.length > 0) {
      status = 'failed';
    }

    return {
      graphId,
      status,
      nodeStates: stateMap,
      nodeResults: resultMap,
      blockedNodes,
      skippedNodes,
      failedNodes,
      completedNodes,
      startedAt,
      completedAt,
      totalDurationMs: completedAt.getTime() - startedAt.getTime(),
    };
  }

  /**
   * Emit event via EventBus
   */
  private emitEvent(type: string, data: Record<string, unknown>): void {
    if (!this.eventBus) return;

    this.eventBus.emit({
      type: type as CCGEvent['type'],
      timestamp: new Date(),
      data,
    });
  }

  /**
   * Default task runner (stub - should be injected for real use)
   */
  private async defaultRunner(
    node: WorkflowNode,
    _context: Record<string, unknown>
  ): Promise<{ output?: unknown; error?: string }> {
    this.logger.debug(`Default runner executing node: ${node.id}`);
    return { output: { nodeId: node.id, executed: true } };
  }
}
