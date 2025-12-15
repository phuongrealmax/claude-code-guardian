// src/modules/auto-agent/auto-agent.types.ts
/**
 * Auto-Agent Module Types
 *
 * Types for autonomous agent capabilities:
 * - TaskDecomposer: Break complex tasks into subtasks
 * - ToolRouter: Auto-select appropriate tools
 * - AutoFixLoop: Self-healing error correction
 * - ErrorMemory: Learn from errors
 */

// ═══════════════════════════════════════════════════════════════
//                      CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export interface AutoAgentModuleConfig {
  enabled: boolean;

  // TaskDecomposer settings
  decomposer: {
    maxSubtasks: number;           // Max subtasks per task (default: 10)
    autoDecompose: boolean;        // Auto-decompose on task create
    minComplexityForDecompose: number; // 1-10, threshold for auto-decompose
  };

  // ToolRouter settings
  router: {
    enabled: boolean;
    routingRules: ToolRoutingRule[];
    fallbackAgent?: string;
  };

  // AutoFixLoop settings
  fixLoop: {
    enabled: boolean;
    maxRetries: number;            // Max fix attempts (default: 3)
    retryDelayMs: number;          // Delay between retries
    autoRollbackOnFail: boolean;   // Rollback if all retries fail
  };

  // ErrorMemory settings
  errorMemory: {
    enabled: boolean;
    maxErrors: number;             // Max errors to remember
    deduplicateThreshold: number;  // Similarity threshold for dedup (0-1)
    autoRecall: boolean;           // Auto-recall errors before task
  };
}

// ═══════════════════════════════════════════════════════════════
//                      TASK DECOMPOSER
// ═══════════════════════════════════════════════════════════════

export interface TaskComplexityAnalysis {
  score: number;                   // 1-10 complexity score
  factors: ComplexityFactor[];
  suggestDecompose: boolean;
  estimatedSubtasks: number;
}

export interface ComplexityFactor {
  name: string;
  weight: number;                  // 0-1 contribution to score
  description: string;
}

export interface SubtaskDefinition {
  id: string;
  name: string;
  description: string;
  order: number;
  dependsOn: string[];             // IDs of prerequisite subtasks
  estimatedTokens: number;
  phase: 'analysis' | 'plan' | 'impl' | 'review';
  tools: string[];                 // Suggested tools
  files?: string[];                // Files to modify
  note?: string;                   // Optional note (e.g., governor constraints)
}

export interface DecomposeResult {
  success: boolean;
  taskId: string;
  complexity: TaskComplexityAnalysis;
  subtasks: SubtaskDefinition[];
  suggestedOrder: string[];        // Ordered subtask IDs
  error?: string;                  // Error message if blocked
  governorState?: {                // Token budget governor state
    mode: string;
    recommendation: string;
    note?: string;
  };
  checkpointCreated?: {            // Auto-checkpoint for large plans
    id: string;
    name: string;
    reason: string;
  };
}

export interface DecomposeParams {
  taskName: string;
  taskDescription?: string;
  context?: {
    files?: string[];
    constraints?: string[];
    domain?: string;
  };
  forceDecompose?: boolean;
}

// ═══════════════════════════════════════════════════════════════
//                      TOOL ROUTER
// ═══════════════════════════════════════════════════════════════

export interface ToolRoutingRule {
  id: string;
  name: string;
  pattern: string;                 // Regex or keyword pattern
  matchType: 'keyword' | 'regex' | 'file_pattern' | 'domain';
  tools: string[];                 // Tools to suggest
  priority: number;                // Higher = more specific
  conditions?: RoutingCondition[];
}

export interface RoutingCondition {
  type: 'file_exists' | 'has_content' | 'phase' | 'custom';
  value: string;
  negate?: boolean;
}

export interface ToolRouteResult {
  success: boolean;
  suggestedTools: SuggestedTool[];
  matchedRules: string[];
  confidence: number;              // 0-1 confidence score
}

export interface SuggestedTool {
  name: string;
  reason: string;
  priority: number;
  params?: Record<string, unknown>;
}

export interface RouteToolParams {
  action: string;                  // What needs to be done
  context?: {
    phase?: string;
    files?: string[];
    currentTask?: string;
    domain?: string;
  };
}

// ═══════════════════════════════════════════════════════════════
//                      AUTO FIX LOOP
// ═══════════════════════════════════════════════════════════════

export type FixLoopStatus = 'idle' | 'running' | 'success' | 'failed' | 'rolled_back';

export interface FixAttempt {
  id: string;
  attemptNumber: number;
  timestamp: Date;
  error: ErrorInfo;
  fix: FixAction;
  result: 'success' | 'failed' | 'partial';
  durationMs: number;
}

export interface ErrorInfo {
  type: string;                    // Error type (e.g., 'build', 'test', 'guard')
  message: string;
  file?: string;
  line?: number;
  code?: string;                   // Error code if any
  stackTrace?: string;
}

export interface FixAction {
  type: 'patch' | 'rollback' | 'config' | 'dependency' | 'custom';
  target: string;
  description: string;
  patch?: string;
  command?: string;
}

export interface FixLoopResult {
  success: boolean;
  status: FixLoopStatus;
  attempts: FixAttempt[];
  totalAttempts: number;
  finalError?: ErrorInfo;
  rolledBack: boolean;
}

export interface StartFixLoopParams {
  error: ErrorInfo;
  context: {
    taskId?: string;
    latentContextId?: string;
    files?: string[];
  };
  maxRetries?: number;
}

// ═══════════════════════════════════════════════════════════════
//                      ERROR MEMORY
// ═══════════════════════════════════════════════════════════════

export interface ErrorMemoryEntry {
  id: string;
  error: ErrorInfo;
  fix: FixAction;
  success: boolean;
  createdAt: Date;
  accessCount: number;
  lastAccessedAt: Date;
  tags: string[];
  similarity?: number;             // Computed similarity to current error
}

export interface ErrorPattern {
  id: string;
  pattern: string;                 // Regex pattern
  errorType: string;
  fixTemplate: FixAction;
  occurrences: number;
  successRate: number;
}

export interface RecallErrorsParams {
  error?: ErrorInfo;
  tags?: string[];
  limit?: number;
  minSimilarity?: number;
}

export interface RecallErrorsResult {
  matches: ErrorMemoryEntry[];
  suggestedFix?: FixAction;
  confidence: number;
}

export interface StoreErrorParams {
  error: ErrorInfo;
  fix: FixAction;
  success: boolean;
  tags?: string[];
}

// ═══════════════════════════════════════════════════════════════
//                      MODULE STATUS
// ═══════════════════════════════════════════════════════════════

export interface AutoAgentStatus {
  enabled: boolean;

  decomposer: {
    enabled: boolean;
    totalDecomposed: number;
    avgSubtasks: number;
  };

  router: {
    enabled: boolean;
    rulesCount: number;
    totalRouted: number;
  };

  fixLoop: {
    enabled: boolean;
    currentStatus: FixLoopStatus;
    totalLoops: number;
    successRate: number;
  };

  errorMemory: {
    enabled: boolean;
    errorCount: number;
    patternCount: number;
  };
}

// ═══════════════════════════════════════════════════════════════
//                      EVENTS
// ═══════════════════════════════════════════════════════════════

export type AutoAgentEventType =
  | 'auto-agent:task:decomposed'
  | 'auto-agent:tool:routed'
  | 'auto-agent:fix:started'
  | 'auto-agent:fix:attempt'
  | 'auto-agent:fix:success'
  | 'auto-agent:fix:failed'
  | 'auto-agent:fix:rollback'
  | 'auto-agent:error:stored'
  | 'auto-agent:error:recalled';
