/**
 * TaskGraph - DAG-based Task Orchestration
 *
 * Replaces linear TaskDecomposer with a Directed Acyclic Graph
 * for better parallelism and dependency management.
 *
 * Key Features:
 * - Parallel task execution
 * - Critical path calculation
 * - Topological sorting
 * - Dynamic task insertion
 * - Execution state tracking
 */

import { v4 as uuid } from 'uuid';
import { Logger } from '../../core/logger.js';
import { EventBus } from '../../core/event-bus.js';
import { StateManager } from '../../core/state-manager.js';
import {
  CompletionGatesService,
  GatePolicyConfig,
  GatePolicyResult,
  EvidenceState,
  GateEvaluationContext,
} from '../../core/completion-gates.js';
import { TASK_TEMPLATES, DEPENDENCY_TEMPLATES } from './task-graph-templates.js';

// ═══════════════════════════════════════════════════════════════
//                         TYPES
// ═══════════════════════════════════════════════════════════════

export type TaskNodeStatus = 'pending' | 'ready' | 'running' | 'completed' | 'failed' | 'skipped';
export type TaskPhase = 'analysis' | 'plan' | 'impl' | 'review' | 'test';

export interface TaskNode {
  id: string;
  name: string;
  description: string;
  phase: TaskPhase;
  status: TaskNodeStatus;

  // Dependencies
  dependsOn: string[];       // IDs of nodes this depends on
  dependents: string[];      // IDs of nodes that depend on this

  // Execution
  estimatedTokens: number;
  actualTokens?: number;
  tools: string[];           // MCP tools to use
  result?: unknown;
  error?: string;

  // Timing
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;

  // Metadata
  files?: string[];
  priority: number;          // Higher = more important
  retryCount: number;
  maxRetries: number;

  // Gate conditions (Completion Gates integration)
  gatePolicy?: Partial<GatePolicyConfig>;  // Gate requirements for this node
  gateResult?: GatePolicyResult;           // Last gate evaluation result
  gateRequired: boolean;                   // Whether gates must pass to complete
}

export interface TaskGraph {
  id: string;
  name: string;
  description?: string;
  rootId: string;            // Entry point node

  nodes: Map<string, TaskNode>;
  edges: Map<string, string[]>;  // adjacency list: nodeId -> [dependentIds]

  // State
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  currentPhase: TaskPhase;

  // Metadata
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  totalEstimatedTokens: number;
  actualTokensUsed: number;
}

export interface GraphAnalysis {
  totalNodes: number;
  completedNodes: number;
  pendingNodes: number;
  runningNodes: number;
  failedNodes: number;

  criticalPath: string[];      // IDs of nodes on critical path
  criticalPathLength: number;  // Sum of estimated tokens
  parallelizableGroups: string[][]; // Groups that can run in parallel

  progress: number;            // 0-100
  estimatedRemainingTokens: number;
}

export interface CreateGraphParams {
  name: string;
  description?: string;
  taskType: 'feature' | 'bugfix' | 'refactor' | 'review' | 'custom';
  files?: string[];
  constraints?: string[];
  customNodes?: Partial<TaskNode>[];
}

/**
 * Result of attempting to complete a node with gate checking
 */
export interface NodeCompletionResult {
  success: boolean;
  node?: TaskNode;
  gateResult?: GatePolicyResult;
  blockedReason?: string;
}

// ═══════════════════════════════════════════════════════════════
//                    WORKFLOW GRAPH TYPES (Sprint 7)
// ═══════════════════════════════════════════════════════════════

/**
 * Workflow node state - matches TaskNodeStatus semantics
 * but adds 'blocked' for gate-blocked nodes
 */
export type WorkflowNodeState = 'pending' | 'running' | 'blocked' | 'skipped' | 'failed' | 'done';

/**
 * Workflow node kind
 * - task: Executable task node
 * - decision: Conditional branching based on context
 * - join: Waits for all incoming edges before proceeding
 */
export type WorkflowNodeKind = 'task' | 'decision' | 'join';

/**
 * Edge condition for conditional branching
 */
export interface EdgeCondition {
  type: 'equals' | 'exists' | 'truthy';
  path: string; // dot-notation path in context (e.g., 'result.status')
  value?: unknown; // for 'equals' type
}

/**
 * Workflow edge connecting nodes
 */
export interface WorkflowEdge {
  from: string;
  to: string;
  condition?: EdgeCondition; // Optional condition for decision nodes
}

/**
 * Workflow node definition
 */
export interface WorkflowNode {
  id: string;
  kind: WorkflowNodeKind;
  label?: string;
  payload?: Record<string, unknown>; // Node-specific data (e.g., runner args)

  // Phase and gating (precedence: explicit > phase default > global)
  phase?: TaskPhase;
  gateRequired?: boolean; // Explicit override
  gatePolicy?: Partial<GatePolicyConfig>;

  // Execution control
  timeoutMs?: number;
  retries?: number;
  onError?: 'fail' | 'skip' | 'continue';
}

/**
 * Complete Workflow Graph definition
 */
export interface WorkflowGraph {
  version: string; // Schema version (e.g., '1.0')
  entry: string; // Entry node ID
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  defaults?: {
    gateRequired?: boolean;
    gatePolicy?: Partial<GatePolicyConfig>;
    timeoutMs?: number;
    retries?: number;
  };
}

/**
 * Result of node execution
 */
export interface WorkflowNodeResult {
  status: WorkflowNodeState;
  output?: unknown;
  reason?: string;
  nextToolCalls?: Array<{ tool: string; args: Record<string, unknown>; reason: string }>;
  gateResult?: GatePolicyResult;
}

/**
 * Workflow execution summary
 */
export interface WorkflowExecutionSummary {
  graphId: string;
  status: 'completed' | 'failed' | 'blocked';
  nodeStates: Map<string, WorkflowNodeState>;
  nodeResults: Map<string, WorkflowNodeResult>;
  blockedNodes: string[];
  skippedNodes: string[];
  failedNodes: string[];
  completedNodes: string[];
  startedAt: Date;
  completedAt?: Date;
  totalDurationMs: number;
}

// ═══════════════════════════════════════════════════════════════
//                    WORKFLOW GRAPH HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Get a value from an object using dot-notation path
 * e.g., getPathValue({ result: { status: 'ok' } }, 'result.status') => 'ok'
 */
export function getPathValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Evaluate an edge condition against execution context
 */
export function evaluateEdgeCondition(
  condition: EdgeCondition | undefined,
  context: Record<string, unknown>
): boolean {
  // No condition = unconditional edge (always true)
  if (!condition) return true;

  const value = getPathValue(context, condition.path);

  switch (condition.type) {
    case 'equals':
      return value === condition.value;
    case 'exists':
      return value !== undefined && value !== null;
    case 'truthy':
      return Boolean(value);
    default:
      return false;
  }
}

/**
 * Determine effective gateRequired for a workflow node
 * Precedence: node explicit > phase default > graph defaults > global default
 */
export function getEffectiveGateRequired(
  node: WorkflowNode,
  graphDefaults?: WorkflowGraph['defaults']
): boolean {
  // 1. Explicit node override
  if (node.gateRequired !== undefined) {
    return node.gateRequired;
  }

  // 2. Phase-based default (impl, test, review require gates)
  const gatePhases: TaskPhase[] = ['impl', 'test', 'review'];
  if (node.phase && gatePhases.includes(node.phase)) {
    return true;
  }

  // 3. Graph-level defaults
  if (graphDefaults?.gateRequired !== undefined) {
    return graphDefaults.gateRequired;
  }

  // 4. Global default (false for analysis/plan, true otherwise)
  return false;
}

// ═══════════════════════════════════════════════════════════════
//                      TASK GRAPH SERVICE
// ═══════════════════════════════════════════════════════════════

export class TaskGraphService {
  private graphs: Map<string, TaskGraph> = new Map();
  private logger: Logger;
  private eventBus: EventBus;
  private stateManager?: StateManager;
  private completionGates: CompletionGatesService;

  constructor(logger: Logger, eventBus: EventBus, stateManager?: StateManager) {
    this.logger = logger;
    this.eventBus = eventBus;
    this.stateManager = stateManager;
    this.completionGates = new CompletionGatesService();
  }

  /**
   * Set StateManager for evidence retrieval (deferred initialization)
   */
  setStateManager(stateManager: StateManager): void {
    this.stateManager = stateManager;
  }

  /**
   * Update gate policy configuration
   */
  updateGatePolicy(config: Partial<GatePolicyConfig>): void {
    this.completionGates.updateConfig(config);
  }

  // ─────────────────────────────────────────────────────────────
  //                    CREATE & MANAGE
  // ─────────────────────────────────────────────────────────────

  /**
   * Create a new task graph from template
   */
  createGraph(params: CreateGraphParams): TaskGraph {
    const graphId = uuid();
    const nodes = new Map<string, TaskNode>();
    const edges = new Map<string, string[]>();

    // Get template
    const template = params.taskType === 'custom' && params.customNodes
      ? params.customNodes
      : TASK_TEMPLATES[params.taskType] || TASK_TEMPLATES.feature;

    const dependencies = DEPENDENCY_TEMPLATES[params.taskType] || [];

    // Create nodes
    const nodeIds: string[] = [];
    template.forEach((t, index) => {
      const nodeId = uuid();
      nodeIds.push(nodeId);

      // Determine if gates are required based on phase
      // impl, test, and review phases require gates by default
      const gatePhases: TaskPhase[] = ['impl', 'test', 'review'];
      const phase = t.phase || 'impl';
      const gateRequired = t.gateRequired ?? gatePhases.includes(phase);

      const node: TaskNode = {
        id: nodeId,
        name: t.name || `Task ${index + 1}`,
        description: t.description || '',
        phase,
        status: 'pending',
        dependsOn: [],
        dependents: [],
        estimatedTokens: t.estimatedTokens || 500,
        tools: t.tools || [],
        files: params.files,
        priority: t.priority || 5,
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date(),
        gateRequired,
        gatePolicy: t.gatePolicy,
      };

      nodes.set(nodeId, node);
      edges.set(nodeId, []);
    });

    // Apply dependencies
    dependencies.forEach(([dependent, dependsOn]) => {
      if (nodeIds[dependent] && nodeIds[dependsOn]) {
        const dependentNode = nodes.get(nodeIds[dependent])!;
        const dependsOnNode = nodes.get(nodeIds[dependsOn])!;

        dependentNode.dependsOn.push(nodeIds[dependsOn]);
        dependsOnNode.dependents.push(nodeIds[dependent]);

        edges.get(nodeIds[dependsOn])!.push(nodeIds[dependent]);
      }
    });

    // Mark root nodes as ready
    nodes.forEach(node => {
      if (node.dependsOn.length === 0) {
        node.status = 'ready';
      }
    });

    // Find root (first node with no dependencies)
    const rootId = nodeIds.find(id => nodes.get(id)!.dependsOn.length === 0) || nodeIds[0];

    // Calculate total estimated tokens
    let totalEstimated = 0;
    nodes.forEach(n => totalEstimated += n.estimatedTokens);

    const graph: TaskGraph = {
      id: graphId,
      name: params.name,
      description: params.description,
      rootId,
      nodes,
      edges,
      status: 'pending',
      currentPhase: 'analysis',
      createdAt: new Date(),
      totalEstimatedTokens: totalEstimated,
      actualTokensUsed: 0,
    };

    this.graphs.set(graphId, graph);

    this.eventBus.emit({
      type: 'taskgraph:created',
      timestamp: new Date(),
      data: { graphId, name: params.name, nodeCount: nodes.size },
    });

    this.logger.info(`Created TaskGraph "${params.name}" with ${nodes.size} nodes`);

    return graph;
  }

  /**
   * Get a graph by ID
   */
  getGraph(graphId: string): TaskGraph | undefined {
    return this.graphs.get(graphId);
  }

  /**
   * Delete a graph
   */
  deleteGraph(graphId: string): boolean {
    return this.graphs.delete(graphId);
  }

  /**
   * List all graphs
   */
  listGraphs(): TaskGraph[] {
    return Array.from(this.graphs.values());
  }

  // ─────────────────────────────────────────────────────────────
  //                    EXECUTION
  // ─────────────────────────────────────────────────────────────

  /**
   * Get next executable nodes (ready nodes with no pending dependencies)
   */
  getNextNodes(graphId: string): TaskNode[] {
    const graph = this.graphs.get(graphId);
    if (!graph) return [];

    const readyNodes: TaskNode[] = [];

    graph.nodes.forEach(node => {
      if (node.status === 'ready') {
        // Check all dependencies are completed
        const allDepsCompleted = node.dependsOn.every(depId => {
          const dep = graph.nodes.get(depId);
          return dep && dep.status === 'completed';
        });

        if (allDepsCompleted || node.dependsOn.length === 0) {
          readyNodes.push(node);
        }
      }
    });

    // Sort by priority (highest first)
    return readyNodes.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Start a node execution
   */
  startNode(graphId: string, nodeId: string): TaskNode | undefined {
    const graph = this.graphs.get(graphId);
    if (!graph) return undefined;

    const node = graph.nodes.get(nodeId);
    if (!node || node.status !== 'ready') return undefined;

    node.status = 'running';
    node.startedAt = new Date();

    if (graph.status === 'pending') {
      graph.status = 'running';
      graph.startedAt = new Date();
    }

    this.eventBus.emit({
      type: 'taskgraph:node:started',
      timestamp: new Date(),
      data: { graphId, nodeId, name: node.name },
    });

    return node;
  }

  /**
   * Complete a node (bypasses gate checking - use tryCompleteNode for gated completion)
   */
  completeNode(
    graphId: string,
    nodeId: string,
    result?: unknown,
    tokensUsed?: number
  ): TaskNode | undefined {
    const graph = this.graphs.get(graphId);
    if (!graph) return undefined;

    const node = graph.nodes.get(nodeId);
    if (!node) return undefined;

    return this.finalizeNodeCompletion(graph, node, result, tokensUsed);
  }

  /**
   * Complete a node with explicit gate bypass - emits audit event
   * Use this when intentionally bypassing gates (e.g., for analysis/plan phases)
   */
  completeNodeBypass(
    graphId: string,
    nodeId: string,
    result?: unknown,
    tokensUsed?: number,
    reason?: string
  ): TaskNode | undefined {
    const graph = this.graphs.get(graphId);
    if (!graph) return undefined;

    const node = graph.nodes.get(nodeId);
    if (!node) return undefined;

    // Emit audit trail for bypass
    this.eventBus.emit({
      type: 'taskgraph:node:bypass_gates',
      timestamp: new Date(),
      data: {
        graphId,
        nodeId,
        name: node.name,
        phase: node.phase,
        gateRequired: node.gateRequired,
        reason: reason || 'Manual bypass',
      },
    });

    this.logger.info(`Node "${node.name}" gates bypassed: ${reason || 'Manual bypass'}`);

    return this.finalizeNodeCompletion(graph, node, result, tokensUsed);
  }

  /**
   * Try to complete a node with gate checking
   * Returns gate result if blocked, completes if passed
   */
  tryCompleteNode(
    graphId: string,
    nodeId: string,
    result?: unknown,
    tokensUsed?: number
  ): { success: boolean; node?: TaskNode; gateResult?: GatePolicyResult; blockedReason?: string } {
    const graph = this.graphs.get(graphId);
    if (!graph) {
      return { success: false, blockedReason: 'Graph not found' };
    }

    const node = graph.nodes.get(nodeId);
    if (!node) {
      return { success: false, blockedReason: 'Node not found' };
    }

    // If gates not required, complete directly
    if (!node.gateRequired) {
      const completed = this.finalizeNodeCompletion(graph, node, result, tokensUsed);
      return { success: true, node: completed };
    }

    // Check gates
    const gateResult = this.evaluateNodeGates(node, graph);
    node.gateResult = gateResult;

    if (gateResult.status === 'passed') {
      const completed = this.finalizeNodeCompletion(graph, node, result, tokensUsed);
      return { success: true, node: completed, gateResult };
    }

    // Blocked or pending
    this.logger.info(`Node "${node.name}" gate check: ${gateResult.status}`, {
      missingEvidence: gateResult.missingEvidence,
      failingEvidence: gateResult.failingEvidence.map(f => f.type),
    });

    this.eventBus.emit({
      type: 'taskgraph:node:gated',
      timestamp: new Date(),
      data: {
        graphId,
        nodeId,
        name: node.name,
        gateStatus: gateResult.status,
        missingEvidence: gateResult.missingEvidence,
        nextToolCalls: gateResult.nextToolCalls,
      },
    });

    return {
      success: false,
      node,
      gateResult,
      blockedReason: gateResult.blockedReason,
    };
  }

  /**
   * Evaluate gates for a node
   */
  private evaluateNodeGates(node: TaskNode, graph: TaskGraph): GatePolicyResult {
    // Get evidence from StateManager
    const evidence = this.getEvidenceState();

    // Build context
    const context: GateEvaluationContext = {
      taskId: node.id,
      taskType: this.inferTaskType(graph.name),
      taskName: node.name,
    };

    // Apply node-specific policy if present
    if (node.gatePolicy) {
      this.completionGates.updateConfig(node.gatePolicy);
    }

    return this.completionGates.evaluateCompletionGates(evidence, context);
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

  /**
   * Infer task type from graph name for context-aware gate args
   */
  private inferTaskType(graphName: string): string | undefined {
    const lower = graphName.toLowerCase();
    if (lower.includes('frontend') || lower.includes('component') || lower.includes('ui')) {
      return 'frontend';
    }
    if (lower.includes('backend') || lower.includes('api') || lower.includes('server')) {
      return 'backend';
    }
    if (lower.includes('refactor')) {
      return 'refactor';
    }
    return undefined;
  }

  /**
   * Finalize node completion (internal helper)
   */
  private finalizeNodeCompletion(
    graph: TaskGraph,
    node: TaskNode,
    result?: unknown,
    tokensUsed?: number
  ): TaskNode {
    node.status = 'completed';
    node.completedAt = new Date();
    node.result = result;
    if (tokensUsed) {
      node.actualTokens = tokensUsed;
      graph.actualTokensUsed += tokensUsed;
    }

    // Update dependents to ready if all their deps are done
    node.dependents.forEach(depId => {
      const dependent = graph.nodes.get(depId);
      if (dependent && dependent.status === 'pending') {
        const allDepsCompleted = dependent.dependsOn.every(d => {
          const dep = graph.nodes.get(d);
          return dep && dep.status === 'completed';
        });
        if (allDepsCompleted) {
          dependent.status = 'ready';
        }
      }
    });

    // Check if graph is complete
    let allDone = true;
    graph.nodes.forEach(n => {
      if (n.status !== 'completed' && n.status !== 'skipped') {
        allDone = false;
      }
    });

    if (allDone) {
      graph.status = 'completed';
      graph.completedAt = new Date();

      this.eventBus.emit({
        type: 'taskgraph:completed',
        timestamp: new Date(),
        data: { graphId: graph.id, tokensUsed: graph.actualTokensUsed },
      });
    }

    this.eventBus.emit({
      type: 'taskgraph:node:completed',
      timestamp: new Date(),
      data: { graphId: graph.id, nodeId: node.id, name: node.name },
    });

    return node;
  }

  /**
   * Fail a node
   */
  failNode(graphId: string, nodeId: string, error: string): TaskNode | undefined {
    const graph = this.graphs.get(graphId);
    if (!graph) return undefined;

    const node = graph.nodes.get(nodeId);
    if (!node) return undefined;

    node.retryCount++;

    if (node.retryCount < node.maxRetries) {
      // Retry - set back to ready
      node.status = 'ready';
      node.error = error;
      this.logger.warn(`Node "${node.name}" failed, retrying (${node.retryCount}/${node.maxRetries})`);
    } else {
      // Max retries reached
      node.status = 'failed';
      node.error = error;
      node.completedAt = new Date();

      // Skip dependent nodes
      this.skipDependents(graph, nodeId);

      this.eventBus.emit({
        type: 'taskgraph:node:failed',
        timestamp: new Date(),
        data: { graphId, nodeId, name: node.name, error },
      });
    }

    return node;
  }

  /**
   * Skip all nodes that depend on a failed node
   */
  private skipDependents(graph: TaskGraph, nodeId: string): void {
    const node = graph.nodes.get(nodeId);
    if (!node) return;

    node.dependents.forEach(depId => {
      const dep = graph.nodes.get(depId);
      if (dep && dep.status === 'pending') {
        dep.status = 'skipped';
        this.skipDependents(graph, depId);
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  //                    ANALYSIS
  // ─────────────────────────────────────────────────────────────

  /**
   * Analyze graph state
   */
  analyzeGraph(graphId: string): GraphAnalysis | undefined {
    const graph = this.graphs.get(graphId);
    if (!graph) return undefined;

    let completed = 0, pending = 0, running = 0, failed = 0;

    graph.nodes.forEach(node => {
      switch (node.status) {
        case 'completed': completed++; break;
        case 'pending':
        case 'ready': pending++; break;
        case 'running': running++; break;
        case 'failed': failed++; break;
      }
    });

    // Calculate critical path (longest path by estimated tokens)
    const criticalPath = this.findCriticalPath(graph);

    // Find parallelizable groups
    const parallelGroups = this.findParallelGroups(graph);

    // Calculate remaining tokens
    let remainingTokens = 0;
    graph.nodes.forEach(node => {
      if (node.status !== 'completed' && node.status !== 'skipped') {
        remainingTokens += node.estimatedTokens;
      }
    });

    return {
      totalNodes: graph.nodes.size,
      completedNodes: completed,
      pendingNodes: pending,
      runningNodes: running,
      failedNodes: failed,
      criticalPath: criticalPath.map(n => n.id),
      criticalPathLength: criticalPath.reduce((sum, n) => sum + n.estimatedTokens, 0),
      parallelizableGroups: parallelGroups,
      progress: Math.round((completed / graph.nodes.size) * 100),
      estimatedRemainingTokens: remainingTokens,
    };
  }

  /**
   * Find critical path (longest path by tokens)
   */
  private findCriticalPath(graph: TaskGraph): TaskNode[] {
    const distances = new Map<string, number>();
    const parents = new Map<string, string>();

    // Initialize
    graph.nodes.forEach(node => {
      distances.set(node.id, node.dependsOn.length === 0 ? node.estimatedTokens : -Infinity);
    });

    // Topological sort order
    const sorted = this.topologicalSort(graph);

    // Calculate longest paths
    sorted.forEach(nodeId => {
      const node = graph.nodes.get(nodeId)!;
      const currentDist = distances.get(nodeId)!;

      node.dependents.forEach(depId => {
        const dep = graph.nodes.get(depId)!;
        const newDist = currentDist + dep.estimatedTokens;

        if (newDist > (distances.get(depId) || -Infinity)) {
          distances.set(depId, newDist);
          parents.set(depId, nodeId);
        }
      });
    });

    // Find end node with maximum distance
    let maxDist = -Infinity;
    let endNode = '';
    distances.forEach((dist, nodeId) => {
      if (dist > maxDist) {
        maxDist = dist;
        endNode = nodeId;
      }
    });

    // Reconstruct path
    const path: TaskNode[] = [];
    let current = endNode;
    while (current) {
      path.unshift(graph.nodes.get(current)!);
      current = parents.get(current)!;
    }

    return path;
  }

  /**
   * Topological sort
   */
  private topologicalSort(graph: TaskGraph): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = graph.nodes.get(nodeId)!;
      node.dependsOn.forEach(depId => visit(depId));
      result.push(nodeId);
    };

    graph.nodes.forEach((_, id) => visit(id));

    return result;
  }

  /**
   * Find groups of nodes that can run in parallel
   */
  private findParallelGroups(graph: TaskGraph): string[][] {
    const groups: string[][] = [];
    const processed = new Set<string>();

    // Group by "level" (distance from root)
    const levels = new Map<string, number>();

    const calculateLevel = (nodeId: string): number => {
      if (levels.has(nodeId)) return levels.get(nodeId)!;

      const node = graph.nodes.get(nodeId)!;
      if (node.dependsOn.length === 0) {
        levels.set(nodeId, 0);
        return 0;
      }

      const maxDepLevel = Math.max(...node.dependsOn.map(d => calculateLevel(d)));
      levels.set(nodeId, maxDepLevel + 1);
      return maxDepLevel + 1;
    };

    graph.nodes.forEach((_, id) => calculateLevel(id));

    // Group by level
    const levelGroups = new Map<number, string[]>();
    levels.forEach((level, nodeId) => {
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level)!.push(nodeId);
    });

    // Convert to array sorted by level
    const sortedLevels = Array.from(levelGroups.keys()).sort((a, b) => a - b);
    sortedLevels.forEach(level => {
      groups.push(levelGroups.get(level)!);
    });

    return groups;
  }

  /**
   * Get graph statistics
   */
  getStats() {
    let totalGraphs = 0;
    let completedGraphs = 0;
    let totalNodes = 0;
    let completedNodes = 0;

    this.graphs.forEach(graph => {
      totalGraphs++;
      if (graph.status === 'completed') completedGraphs++;

      graph.nodes.forEach(node => {
        totalNodes++;
        if (node.status === 'completed') completedNodes++;
      });
    });

    return {
      totalGraphs,
      completedGraphs,
      activeGraphs: totalGraphs - completedGraphs,
      totalNodes,
      completedNodes,
    };
  }
}
