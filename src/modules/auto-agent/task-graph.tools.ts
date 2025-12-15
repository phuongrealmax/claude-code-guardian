/**
 * TaskGraph MCP Tools
 */

import { z } from 'zod';
import {
  TaskGraphService,
  CreateGraphParams,
  TaskPhase,
  NodeCompletionResult,
  WorkflowGraph,
  WorkflowNode,
  WorkflowEdge,
} from './task-graph.js';
import { TASK_TEMPLATES } from './task-graph-templates.js';
import { WorkflowExecutor, TaskRunner } from './workflow-executor.js';

/**
 * Create TaskGraph MCP tools
 */
export function createTaskGraphTools(taskGraphService: TaskGraphService) {
  return {
    // ═══════════════════════════════════════════════════════════════
    //          NEW: Workflow Start (Template-based DAG Creation)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Start a workflow from a template - combines graph creation with first executable nodes
     * This is the primary entry point for starting gated workflows
     */
    auto_workflow_start: {
      description: `Start a gated workflow from a template. Creates a DAG task graph and returns the first nodes to execute.

Available templates:
- feature: Full feature development (${TASK_TEMPLATES.feature?.length || 0} steps)
- bugfix: Bug fixing workflow (${TASK_TEMPLATES.bugfix?.length || 0} steps)
- refactor: Code refactoring (${TASK_TEMPLATES.refactor?.length || 0} steps)
- review: Code review workflow (${TASK_TEMPLATES.review?.length || 0} steps)

Gates are enforced on impl/test/review phases - nodes cannot complete without required evidence.`,
      parameters: z.object({
        name: z.string().describe('Name for this workflow (e.g., "Add user authentication")'),
        taskType: z.enum(['feature', 'bugfix', 'refactor', 'review']).describe('Workflow template type'),
        description: z.string().optional().describe('Detailed description of the task'),
        files: z.array(z.string()).optional().describe('Files involved in this workflow'),
        constraints: z.array(z.string()).optional().describe('Constraints to follow'),
      }),
      handler: async (params: {
        name: string;
        taskType: 'feature' | 'bugfix' | 'refactor' | 'review';
        description?: string;
        files?: string[];
        constraints?: string[];
      }) => {
        // Create the graph
        const graph = taskGraphService.createGraph({
          name: params.name,
          description: params.description,
          taskType: params.taskType,
          files: params.files,
          constraints: params.constraints,
        });

        // Get analysis
        const analysis = taskGraphService.analyzeGraph(graph.id);

        // Get first nodes ready for execution
        const nextNodes = taskGraphService.getNextNodes(graph.id);

        // Get all nodes with their gate requirements
        const nodesList = Array.from(graph.nodes.values()).map(n => ({
          id: n.id,
          name: n.name,
          phase: n.phase,
          status: n.status,
          gateRequired: n.gateRequired,
          estimatedTokens: n.estimatedTokens,
          dependsOn: n.dependsOn.length,
        }));

        // Count gated nodes
        const gatedNodes = nodesList.filter(n => n.gateRequired).length;

        return {
          success: true,
          workflow: {
            graphId: graph.id,
            name: graph.name,
            taskType: params.taskType,
            description: params.description,
          },
          summary: {
            totalNodes: graph.nodes.size,
            gatedNodes,
            estimatedTokens: graph.totalEstimatedTokens,
            parallelGroups: analysis?.parallelizableGroups.length || 0,
            criticalPathLength: analysis?.criticalPathLength || 0,
          },
          nextNodes: nextNodes.map(n => ({
            id: n.id,
            name: n.name,
            phase: n.phase,
            tools: n.tools,
            priority: n.priority,
            gateRequired: n.gateRequired,
          })),
          allNodes: nodesList,
          instructions: [
            `Workflow "${params.name}" created with ${graph.nodes.size} nodes`,
            `${gatedNodes} nodes have completion gates (impl/test/review phases)`,
            `Start with: ${nextNodes.map(n => n.name).join(', ')}`,
            'Use auto_start_node to begin, auto_complete_node when done',
            'Gated nodes require evidence (guard validation, test results) to complete',
          ],
        };
      },
    },

    // Create a new task graph
    auto_create_graph: {
      description: 'Create a new DAG-based task graph for complex multi-step tasks. Supports parallel execution and dependency management.',
      parameters: z.object({
        name: z.string().describe('Name of the task graph'),
        description: z.string().optional().describe('Task description'),
        taskType: z.enum(['feature', 'bugfix', 'refactor', 'review', 'custom']).describe('Type of task (determines template)'),
        files: z.array(z.string()).optional().describe('Files involved in the task'),
        constraints: z.array(z.string()).optional().describe('Constraints to follow'),
      }),
      handler: async (params: CreateGraphParams) => {
        const graph = taskGraphService.createGraph(params);
        const analysis = taskGraphService.analyzeGraph(graph.id);

        return {
          success: true,
          graphId: graph.id,
          name: graph.name,
          nodeCount: graph.nodes.size,
          estimatedTokens: graph.totalEstimatedTokens,
          parallelGroups: analysis?.parallelizableGroups.length || 0,
          criticalPathLength: analysis?.criticalPathLength || 0,
          message: `Created task graph "${params.name}" with ${graph.nodes.size} nodes`,
        };
      },
    },

    // Get next executable nodes
    auto_get_next_nodes: {
      description: 'Get the next nodes that are ready to execute. Returns nodes with all dependencies completed.',
      parameters: z.object({
        graphId: z.string().describe('Graph ID'),
      }),
      handler: async (params: { graphId: string }) => {
        const nodes = taskGraphService.getNextNodes(params.graphId);

        if (nodes.length === 0) {
          return {
            success: true,
            nodes: [],
            message: 'No nodes ready for execution',
          };
        }

        return {
          success: true,
          count: nodes.length,
          nodes: nodes.map(n => ({
            id: n.id,
            name: n.name,
            phase: n.phase,
            tools: n.tools,
            estimatedTokens: n.estimatedTokens,
            priority: n.priority,
          })),
          canParallelize: nodes.length > 1,
          message: `${nodes.length} nodes ready for execution`,
        };
      },
    },

    // Start executing a node
    auto_start_node: {
      description: 'Mark a node as started/running.',
      parameters: z.object({
        graphId: z.string().describe('Graph ID'),
        nodeId: z.string().describe('Node ID to start'),
      }),
      handler: async (params: { graphId: string; nodeId: string }) => {
        const node = taskGraphService.startNode(params.graphId, params.nodeId);

        if (!node) {
          return {
            success: false,
            message: 'Node not found or not ready',
          };
        }

        return {
          success: true,
          node: {
            id: node.id,
            name: node.name,
            phase: node.phase,
            tools: node.tools,
            files: node.files,
          },
          message: `Started node "${node.name}"`,
        };
      },
    },

    // Complete a node (with gate checking)
    auto_complete_node: {
      description: `Mark a node as completed. Uses Completion Gates by default.

For gated nodes (impl/test/review phases):
- Checks if required evidence exists (guard validation, test results)
- Returns gate status if blocked, with suggested tool calls
- Only completes if gates pass

Use bypassGates=true only for analysis/plan phases or when manually overriding.`,
      parameters: z.object({
        graphId: z.string().describe('Graph ID'),
        nodeId: z.string().describe('Node ID to complete'),
        result: z.any().optional().describe('Result data from execution'),
        tokensUsed: z.number().optional().describe('Actual tokens consumed'),
        bypassGates: z.boolean().optional().describe('Skip gate checking (default: false)'),
      }),
      handler: async (params: {
        graphId: string;
        nodeId: string;
        result?: unknown;
        tokensUsed?: number;
        bypassGates?: boolean;
      }) => {
        // Use gated completion by default
        if (!params.bypassGates) {
          const result = taskGraphService.tryCompleteNode(
            params.graphId,
            params.nodeId,
            params.result,
            params.tokensUsed
          );

          if (!result.success) {
            // Gate blocked or node not found
            if (result.gateResult) {
              return {
                success: false,
                gateBlocked: true,
                gateStatus: result.gateResult.status,
                node: result.node ? {
                  id: result.node.id,
                  name: result.node.name,
                  phase: result.node.phase,
                } : undefined,
                missingEvidence: result.gateResult.missingEvidence,
                failingEvidence: result.gateResult.failingEvidence.map(f => ({
                  type: f.type,
                  reason: f.reason,
                })),
                nextToolCalls: result.gateResult.nextToolCalls,
                message: result.blockedReason || `Gate ${result.gateResult.status}: Need evidence before completion`,
                hint: 'Run the suggested tool calls to provide evidence, then try completing again',
              };
            }
            return {
              success: false,
              message: result.blockedReason || 'Node not found',
            };
          }

          // Gate passed
          const nextNodes = taskGraphService.getNextNodes(params.graphId);
          return {
            success: true,
            completed: {
              id: result.node!.id,
              name: result.node!.name,
              phase: result.node!.phase,
            },
            gateStatus: result.gateResult?.status || 'passed',
            nextNodesReady: nextNodes.length,
            nextNodes: nextNodes.slice(0, 3).map(n => ({
              id: n.id,
              name: n.name,
              phase: n.phase,
              priority: n.priority,
              gateRequired: n.gateRequired,
            })),
            message: `Completed "${result.node!.name}" (gate: passed), ${nextNodes.length} nodes now ready`,
          };
        }

        // Bypass gates - use audited bypass method
        const node = taskGraphService.completeNodeBypass(
          params.graphId,
          params.nodeId,
          params.result,
          params.tokensUsed,
          'MCP tool: bypassGates=true'
        );

        if (!node) {
          return {
            success: false,
            message: 'Node not found',
          };
        }

        const nextNodes = taskGraphService.getNextNodes(params.graphId);

        return {
          success: true,
          completed: {
            id: node.id,
            name: node.name,
            phase: node.phase,
          },
          gateBypassed: true,
          auditEmitted: true,
          nextNodesReady: nextNodes.length,
          nextNodes: nextNodes.slice(0, 3).map(n => ({
            id: n.id,
            name: n.name,
            priority: n.priority,
          })),
          message: `Completed "${node.name}" (gates bypassed - audited), ${nextNodes.length} nodes now ready`,
        };
      },
    },

    // Fail a node
    auto_fail_node: {
      description: 'Mark a node as failed. Will retry if under max retries, otherwise skip dependents.',
      parameters: z.object({
        graphId: z.string().describe('Graph ID'),
        nodeId: z.string().describe('Node ID that failed'),
        error: z.string().describe('Error message'),
      }),
      handler: async (params: { graphId: string; nodeId: string; error: string }) => {
        const node = taskGraphService.failNode(params.graphId, params.nodeId, params.error);

        if (!node) {
          return {
            success: false,
            message: 'Node not found',
          };
        }

        return {
          success: true,
          node: {
            id: node.id,
            name: node.name,
            status: node.status,
            retryCount: node.retryCount,
            maxRetries: node.maxRetries,
          },
          willRetry: node.status === 'ready',
          message: node.status === 'ready'
            ? `Will retry "${node.name}" (${node.retryCount}/${node.maxRetries})`
            : `Node "${node.name}" failed permanently`,
        };
      },
    },

    // Analyze graph
    auto_analyze_graph: {
      description: 'Get detailed analysis of task graph including critical path, parallelization opportunities, and progress.',
      parameters: z.object({
        graphId: z.string().describe('Graph ID'),
      }),
      handler: async (params: { graphId: string }) => {
        const graph = taskGraphService.getGraph(params.graphId);
        const analysis = taskGraphService.analyzeGraph(params.graphId);

        if (!graph || !analysis) {
          return {
            success: false,
            message: 'Graph not found',
          };
        }

        return {
          success: true,
          graph: {
            id: graph.id,
            name: graph.name,
            status: graph.status,
            currentPhase: graph.currentPhase,
          },
          analysis: {
            progress: `${analysis.progress}%`,
            nodes: {
              total: analysis.totalNodes,
              completed: analysis.completedNodes,
              pending: analysis.pendingNodes,
              running: analysis.runningNodes,
              failed: analysis.failedNodes,
            },
            criticalPath: {
              length: analysis.criticalPath.length,
              estimatedTokens: analysis.criticalPathLength,
              nodeIds: analysis.criticalPath,
            },
            parallelGroups: analysis.parallelizableGroups.length,
            maxParallelism: Math.max(...analysis.parallelizableGroups.map(g => g.length)),
            estimatedRemainingTokens: analysis.estimatedRemainingTokens,
          },
          tokens: {
            estimated: graph.totalEstimatedTokens,
            actual: graph.actualTokensUsed,
          },
        };
      },
    },

    // List all graphs
    auto_list_graphs: {
      description: 'List all task graphs with their status.',
      parameters: z.object({}),
      handler: async () => {
        const graphs = taskGraphService.listGraphs();

        return {
          success: true,
          count: graphs.length,
          graphs: graphs.map(g => {
            const analysis = taskGraphService.analyzeGraph(g.id);
            return {
              id: g.id,
              name: g.name,
              status: g.status,
              progress: analysis ? `${analysis.progress}%` : '0%',
              nodes: g.nodes.size,
              createdAt: g.createdAt.toISOString(),
            };
          }),
        };
      },
    },

    // Get graph status summary
    auto_graph_status: {
      description: 'Get overall TaskGraph service statistics.',
      parameters: z.object({}),
      handler: async () => {
        const stats = taskGraphService.getStats();

        return {
          success: true,
          stats,
          formatted: [
            `Total Graphs: ${stats.totalGraphs}`,
            `Active: ${stats.activeGraphs}`,
            `Completed: ${stats.completedGraphs}`,
            `Total Nodes: ${stats.totalNodes}`,
            `Completed Nodes: ${stats.completedNodes}`,
          ].join('\n'),
        };
      },
    },

    // Delete a graph
    auto_delete_graph: {
      description: 'Delete a task graph.',
      parameters: z.object({
        graphId: z.string().describe('Graph ID to delete'),
      }),
      handler: async (params: { graphId: string }) => {
        const success = taskGraphService.deleteGraph(params.graphId);

        return {
          success,
          message: success ? 'Graph deleted' : 'Graph not found',
        };
      },
    },

    // Run graph (orchestrate execution)
    auto_run_graph: {
      description: 'Get execution plan for running the entire graph. Returns ordered batches of nodes.',
      parameters: z.object({
        graphId: z.string().describe('Graph ID'),
        maxParallel: z.number().optional().describe('Max parallel nodes (default: 3)'),
      }),
      handler: async (params: { graphId: string; maxParallel?: number }) => {
        const analysis = taskGraphService.analyzeGraph(params.graphId);

        if (!analysis) {
          return {
            success: false,
            message: 'Graph not found',
          };
        }

        const graph = taskGraphService.getGraph(params.graphId)!;
        const maxParallel = params.maxParallel || 3;

        // Build execution plan
        const executionPlan: { batch: number; nodes: { id: string; name: string; phase: string }[] }[] = [];

        analysis.parallelizableGroups.forEach((group, batchIndex) => {
          const nodes = group
            .map(id => graph.nodes.get(id)!)
            .filter(n => n.status !== 'completed' && n.status !== 'skipped')
            .slice(0, maxParallel);

          if (nodes.length > 0) {
            executionPlan.push({
              batch: batchIndex + 1,
              nodes: nodes.map(n => ({
                id: n.id,
                name: n.name,
                phase: n.phase,
              })),
            });
          }
        });

        return {
          success: true,
          graphId: params.graphId,
          totalBatches: executionPlan.length,
          estimatedTokens: analysis.estimatedRemainingTokens,
          executionPlan,
          criticalPath: analysis.criticalPath.map(id => {
            const node = graph.nodes.get(id);
            return node ? node.name : id;
          }),
        };
      },
    },

    // ═══════════════════════════════════════════════════════════════
    //          Sprint 7: Workflow DAG Executor
    // ═══════════════════════════════════════════════════════════════

    /**
     * Execute a WorkflowGraph with DAG-based execution
     * Supports parallelism, decision branching, and completion gates
     */
    auto_workflow_execute: {
      description: `Execute a DAG-based workflow graph with support for:
- Parallel execution (configurable concurrency)
- Decision branching (conditional edges)
- Completion gates integration (guard + test evidence required)
- Bypass option for analysis/plan phases

Returns execution summary with node states and any blocked nodes.`,
      parameters: z.object({
        graph: z.object({
          version: z.string().default('1.0'),
          entry: z.string().describe('Entry node ID'),
          nodes: z.array(z.object({
            id: z.string(),
            kind: z.enum(['task', 'decision', 'join']),
            label: z.string().optional(),
            payload: z.record(z.string(), z.unknown()).optional(),
            phase: z.enum(['analysis', 'plan', 'impl', 'review', 'test']).optional(),
            gateRequired: z.boolean().optional(),
            gatePolicy: z.object({
              requireGuard: z.boolean().optional(),
              requireTest: z.boolean().optional(),
              maxAgeMs: z.number().optional(),
            }).optional(),
            timeoutMs: z.number().optional(),
            retries: z.number().optional(),
            onError: z.enum(['fail', 'skip', 'continue']).optional(),
          })),
          edges: z.array(z.object({
            from: z.string(),
            to: z.string(),
            condition: z.object({
              type: z.enum(['equals', 'exists', 'truthy']),
              path: z.string(),
              value: z.unknown().optional(),
            }).optional(),
          })),
          defaults: z.object({
            gateRequired: z.boolean().optional(),
            gatePolicy: z.object({
              requireGuard: z.boolean().optional(),
              requireTest: z.boolean().optional(),
              maxAgeMs: z.number().optional(),
            }).optional(),
            timeoutMs: z.number().optional(),
            retries: z.number().optional(),
          }).optional(),
        }).describe('Workflow graph definition'),
        context: z.record(z.string(), z.unknown()).optional().describe('Initial execution context'),
        concurrencyLimit: z.number().min(1).max(10).optional().describe('Max parallel nodes (default: 1)'),
        bypassGates: z.boolean().optional().describe('Bypass gate checking (use for analysis/plan)'),
      }),
      handler: async (params: {
        graph: WorkflowGraph;
        context?: Record<string, unknown>;
        concurrencyLimit?: number;
        bypassGates?: boolean;
      }) => {
        const executor = new WorkflowExecutor({
          concurrencyLimit: params.concurrencyLimit || 1,
          bypassGates: params.bypassGates || false,
        });

        try {
          const summary = await executor.execute(
            params.graph,
            params.context || {},
            {
              concurrencyLimit: params.concurrencyLimit,
              bypassGates: params.bypassGates,
            }
          );

          // Convert Maps to plain objects for JSON serialization
          const nodeStates: Record<string, string> = {};
          const nodeResults: Record<string, unknown> = {};

          summary.nodeStates.forEach((state, id) => {
            nodeStates[id] = state;
          });

          summary.nodeResults.forEach((result, id) => {
            nodeResults[id] = result;
          });

          return {
            success: summary.status === 'completed',
            graphId: summary.graphId,
            status: summary.status,
            nodeStates,
            nodeResults,
            blockedNodes: summary.blockedNodes,
            skippedNodes: summary.skippedNodes,
            failedNodes: summary.failedNodes,
            completedNodes: summary.completedNodes,
            durationMs: summary.totalDurationMs,
            nextActions: summary.blockedNodes.length > 0
              ? summary.blockedNodes.map(id => {
                  const result = summary.nodeResults.get(id);
                  return {
                    nodeId: id,
                    action: 'Run required gate tools',
                    nextToolCalls: result?.nextToolCalls || [],
                  };
                })
              : undefined,
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return {
            success: false,
            error: message,
          };
        }
      },
    },
  };
}

export const TASK_GRAPH_TOOL_DEFINITIONS = [
  // Primary workflow entry point (NEW - Sprint 6)
  { name: 'auto_workflow_start', description: 'Start a gated workflow from template (feature/bugfix/refactor/review)' },
  // Sprint 7: DAG Workflow Executor
  { name: 'auto_workflow_execute', description: 'Execute a DAG workflow graph with parallelism, branching, and gates' },
  // Graph management
  { name: 'auto_create_graph', description: 'Create a DAG-based task graph (low-level)' },
  { name: 'auto_get_next_nodes', description: 'Get next executable nodes' },
  { name: 'auto_start_node', description: 'Start executing a node' },
  { name: 'auto_complete_node', description: 'Complete a node (with gate checking)' },
  { name: 'auto_fail_node', description: 'Mark a node as failed' },
  { name: 'auto_analyze_graph', description: 'Analyze graph structure and progress' },
  { name: 'auto_list_graphs', description: 'List all task graphs' },
  { name: 'auto_graph_status', description: 'Get TaskGraph service stats' },
  { name: 'auto_delete_graph', description: 'Delete a graph' },
  { name: 'auto_run_graph', description: 'Get execution plan for a graph' },
];
