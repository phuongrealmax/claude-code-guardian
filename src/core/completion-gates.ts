// src/core/completion-gates.ts
/**
 * Completion Gates - Evidence-driven task completion
 *
 * Prevents tasks from being marked complete without verification evidence.
 * Enforces policy-driven gate checks requiring guard_validate and testing_run
 * to pass before completion is allowed.
 */

import { Logger } from './logger.js';

// ═══════════════════════════════════════════════════════════════
//                      TYPES
// ═══════════════════════════════════════════════════════════════

export type GateEvidenceType = 'guard' | 'test';
export type EvidenceStatus = 'passed' | 'failed' | 'skipped';
export type GateStatus = 'passed' | 'blocked' | 'pending';

/**
 * Guard verification evidence
 */
export interface GuardEvidence {
  timestamp: string; // ISO string
  status: EvidenceStatus;
  reportId: string;
  failingRules: string[]; // capped to MAX_DETAILS_COUNT
  taskId?: string;
}

/**
 * Test verification evidence
 */
export interface TestEvidence {
  timestamp: string; // ISO string
  status: EvidenceStatus;
  runId: string;
  failingTests: string[]; // capped to MAX_DETAILS_COUNT
  consoleErrorsCount: number;
  networkFailuresCount: number;
  taskId?: string;
}

/**
 * Combined evidence state
 */
export interface EvidenceState {
  lastGuardRun: GuardEvidence | null;
  lastTestRun: TestEvidence | null;
}

/**
 * Failing evidence details
 */
export interface FailingEvidence {
  type: GateEvidenceType;
  reason: string;
  runId?: string; // guard.reportId or test.runId
  details?: string[]; // failingRules / failingTests (capped)
}

/**
 * Suggested tool call to obtain missing evidence
 */
export interface NextToolCall {
  tool: 'guard_validate' | 'testing_run';
  args: Record<string, unknown>;
  reason: string;
  priority: number; // lower = earlier (0 highest)
}

/**
 * Gate policy evaluation result
 */
export interface GatePolicyResult {
  status: GateStatus;
  missingEvidence: GateEvidenceType[];
  failingEvidence: FailingEvidence[];
  nextToolCalls?: NextToolCall[];
  blockedReason?: string;
}

/**
 * Gate policy configuration
 */
export interface GatePolicyConfig {
  requireGuard: boolean;
  requireTest: boolean;
  strictTaskScope: boolean; // require evidence.taskId to match
  maxDetailItems: number; // cap for failingRules/failingTests
  maxAgeMs?: number; // evidence freshness: max age in ms (default: 5 minutes)
  guardArgs?: Record<string, unknown>; // default args for guard_validate
  testArgs?: Record<string, unknown>; // default args for testing_run
}

/**
 * Context for gate evaluation
 */
export interface GateEvaluationContext {
  taskId?: string;
  taskType?: string; // 'frontend', 'backend', 'refactor', etc.
  taskName?: string;
}

// ═══════════════════════════════════════════════════════════════
//                      CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const MAX_DETAILS_COUNT = 10;
export const DEFAULT_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

export const DEFAULT_GATE_POLICY: GatePolicyConfig = {
  requireGuard: true,
  requireTest: true,
  strictTaskScope: false, // by default, accept any recent evidence
  maxDetailItems: MAX_DETAILS_COUNT,
  maxAgeMs: DEFAULT_MAX_AGE_MS,
};

// ═══════════════════════════════════════════════════════════════
//                      COMPLETION GATES SERVICE
// ═══════════════════════════════════════════════════════════════

export class CompletionGatesService {
  private config: GatePolicyConfig;
  private logger: Logger;

  constructor(config?: Partial<GatePolicyConfig>, logger?: Logger) {
    this.config = { ...DEFAULT_GATE_POLICY, ...config };
    this.logger = logger || new Logger('info', 'CompletionGates');
  }

  /**
   * Evaluate completion gates based on evidence state
   */
  evaluateCompletionGates(
    evidence: EvidenceState,
    context: GateEvaluationContext = {}
  ): GatePolicyResult {
    const missingEvidence: GateEvidenceType[] = [];
    const failingEvidence: FailingEvidence[] = [];

    // Check guard evidence
    if (this.config.requireGuard) {
      const guardResult = this.evaluateGuardEvidence(evidence.lastGuardRun, context);
      if (guardResult.missing) {
        missingEvidence.push('guard');
      }
      if (guardResult.failing) {
        failingEvidence.push(guardResult.failing);
      }
    }

    // Check test evidence
    if (this.config.requireTest) {
      const testResult = this.evaluateTestEvidence(evidence.lastTestRun, context);
      if (testResult.missing) {
        missingEvidence.push('test');
      }
      if (testResult.failing) {
        failingEvidence.push(testResult.failing);
      }
    }

    // Determine status
    const status = this.determineStatus(missingEvidence, failingEvidence);

    // Build result
    const result: GatePolicyResult = {
      status,
      missingEvidence,
      failingEvidence,
    };

    // Add next tool calls if not passed
    if (status !== 'passed') {
      result.nextToolCalls = this.buildNextToolCalls(missingEvidence, failingEvidence, context);
      result.blockedReason = this.buildBlockedReason(status, missingEvidence, failingEvidence);
    }

    this.logger.debug(`Gate evaluation: ${status}`, {
      missingEvidence,
      failingEvidence: failingEvidence.map(f => f.type),
      context,
    });

    return result;
  }

  /**
   * Update gate policy configuration
   */
  updateConfig(config: Partial<GatePolicyConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): GatePolicyConfig {
    return { ...this.config };
  }

  // ═══════════════════════════════════════════════════════════════
  //                      PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Check if evidence timestamp is too old (stale)
   */
  private isEvidenceStale(timestamp: string): boolean {
    if (!this.config.maxAgeMs) return false;
    const evidenceTime = new Date(timestamp).getTime();
    const now = Date.now();
    return (now - evidenceTime) > this.config.maxAgeMs;
  }

  private evaluateGuardEvidence(
    evidence: GuardEvidence | null,
    context: GateEvaluationContext
  ): { missing: boolean; failing: FailingEvidence | null } {
    // Missing if null or skipped
    if (!evidence || evidence.status === 'skipped') {
      return { missing: true, failing: null };
    }

    // Missing if stale (older than maxAgeMs)
    if (this.isEvidenceStale(evidence.timestamp)) {
      return { missing: true, failing: null };
    }

    // Check task scope if strict mode
    if (this.config.strictTaskScope && context.taskId && evidence.taskId !== context.taskId) {
      return { missing: true, failing: null };
    }

    // Failing if status is failed
    if (evidence.status === 'failed') {
      return {
        missing: false,
        failing: {
          type: 'guard',
          reason: this.buildGuardFailureReason(evidence),
          runId: evidence.reportId,
          details: evidence.failingRules.slice(0, this.config.maxDetailItems),
        },
      };
    }

    // Passed
    return { missing: false, failing: null };
  }

  private evaluateTestEvidence(
    evidence: TestEvidence | null,
    context: GateEvaluationContext
  ): { missing: boolean; failing: FailingEvidence | null } {
    // Missing if null or skipped
    if (!evidence || evidence.status === 'skipped') {
      return { missing: true, failing: null };
    }

    // Missing if stale (older than maxAgeMs)
    if (this.isEvidenceStale(evidence.timestamp)) {
      return { missing: true, failing: null };
    }

    // Check task scope if strict mode
    if (this.config.strictTaskScope && context.taskId && evidence.taskId !== context.taskId) {
      return { missing: true, failing: null };
    }

    // Failing if status is failed
    if (evidence.status === 'failed') {
      return {
        missing: false,
        failing: {
          type: 'test',
          reason: this.buildTestFailureReason(evidence),
          runId: evidence.runId,
          details: evidence.failingTests.slice(0, this.config.maxDetailItems),
        },
      };
    }

    // Passed
    return { missing: false, failing: null };
  }

  private determineStatus(
    missingEvidence: GateEvidenceType[],
    failingEvidence: FailingEvidence[]
  ): GateStatus {
    // Any failing evidence = blocked
    if (failingEvidence.length > 0) {
      return 'blocked';
    }

    // Any missing evidence = pending
    if (missingEvidence.length > 0) {
      return 'pending';
    }

    // All evidence present and passed
    return 'passed';
  }

  private buildNextToolCalls(
    missingEvidence: GateEvidenceType[],
    failingEvidence: FailingEvidence[],
    context: GateEvaluationContext
  ): NextToolCall[] {
    const calls: NextToolCall[] = [];
    let priority = 0;

    // Build context-aware args
    const guardArgs = this.buildGuardArgs(context);
    const testArgs = this.buildTestArgs(context);

    // For missing evidence, suggest running the tool
    // Guard always runs first (lower priority = earlier)
    if (missingEvidence.includes('guard')) {
      calls.push({
        tool: 'guard_validate',
        args: guardArgs,
        reason: 'Missing guard verification evidence',
        priority: priority++,
      });
    }

    if (missingEvidence.includes('test')) {
      calls.push({
        tool: 'testing_run',
        args: testArgs,
        reason: 'Missing test verification evidence',
        priority: priority++,
      });
    }

    // For failing evidence, suggest re-running after fix
    for (const failing of failingEvidence) {
      if (failing.type === 'guard') {
        calls.push({
          tool: 'guard_validate',
          args: guardArgs,
          reason: `Guard failed: ${failing.reason}; re-run after applying fixes`,
          priority: priority++,
        });
      } else if (failing.type === 'test') {
        calls.push({
          tool: 'testing_run',
          args: testArgs,
          reason: `Tests failed: ${failing.reason}; re-run after applying fixes`,
          priority: priority++,
        });
      }
    }

    // Sort by priority (stable)
    return calls.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Build guard_validate args based on context
   */
  private buildGuardArgs(context: GateEvaluationContext): Record<string, unknown> {
    const args: Record<string, unknown> = { ...this.config.guardArgs };

    // Add taskId if available
    if (context.taskId) {
      args.taskId = context.taskId;
    }

    // Add ruleset based on task type
    if (context.taskType === 'frontend') {
      args.ruleset = 'frontend';
    } else if (context.taskType === 'backend') {
      args.ruleset = 'backend';
    }

    return args;
  }

  /**
   * Build testing_run args based on context
   */
  private buildTestArgs(context: GateEvaluationContext): Record<string, unknown> {
    const args: Record<string, unknown> = { ...this.config.testArgs };

    // Add taskId if available
    if (context.taskId) {
      args.taskId = context.taskId;
    }

    // Default scope to 'affected' for efficiency, fallback to 'full' if needed
    if (!args.scope) {
      args.scope = 'affected';
    }

    return args;
  }

  private buildBlockedReason(
    status: GateStatus,
    missingEvidence: GateEvidenceType[],
    failingEvidence: FailingEvidence[]
  ): string {
    if (status === 'pending') {
      const missing = missingEvidence.join(', ');
      return `Missing verification evidence: ${missing}. Run required tools before completing.`;
    }

    if (status === 'blocked') {
      const failing = failingEvidence.map(f => f.type).join(', ');
      const reasons = failingEvidence.map(f => f.reason).join('; ');
      return `Verification failed for: ${failing}. ${reasons}`;
    }

    return '';
  }

  private buildGuardFailureReason(evidence: GuardEvidence): string {
    const count = evidence.failingRules.length;
    if (count === 0) {
      return 'Guard validation failed';
    }
    if (count === 1) {
      return `Guard failed: ${evidence.failingRules[0]}`;
    }
    return `Guard failed: ${count} rules violated`;
  }

  private buildTestFailureReason(evidence: TestEvidence): string {
    const parts: string[] = [];

    const testCount = evidence.failingTests.length;
    if (testCount > 0) {
      parts.push(`${testCount} failing test${testCount > 1 ? 's' : ''}`);
    }

    if (evidence.consoleErrorsCount > 0) {
      parts.push(`${evidence.consoleErrorsCount} console error${evidence.consoleErrorsCount > 1 ? 's' : ''}`);
    }

    if (evidence.networkFailuresCount > 0) {
      parts.push(`${evidence.networkFailuresCount} network failure${evidence.networkFailuresCount > 1 ? 's' : ''}`);
    }

    if (parts.length === 0) {
      return 'Tests failed';
    }

    return parts.join(', ');
  }
}

// ═══════════════════════════════════════════════════════════════
//                      HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Create guard evidence from validation result
 */
export function createGuardEvidence(
  status: EvidenceStatus,
  reportId: string,
  failingRules: string[] = [],
  taskId?: string
): GuardEvidence {
  return {
    timestamp: new Date().toISOString(),
    status,
    reportId,
    failingRules: failingRules.slice(0, MAX_DETAILS_COUNT),
    taskId,
  };
}

/**
 * Create test evidence from test run result
 */
export function createTestEvidence(
  status: EvidenceStatus,
  runId: string,
  options: {
    failingTests?: string[];
    consoleErrorsCount?: number;
    networkFailuresCount?: number;
    taskId?: string;
  } = {}
): TestEvidence {
  return {
    timestamp: new Date().toISOString(),
    status,
    runId,
    failingTests: (options.failingTests || []).slice(0, MAX_DETAILS_COUNT),
    consoleErrorsCount: options.consoleErrorsCount || 0,
    networkFailuresCount: options.networkFailuresCount || 0,
    taskId: options.taskId,
  };
}

/**
 * Check if gate result allows completion
 */
export function canComplete(result: GatePolicyResult): boolean {
  return result.status === 'passed';
}

/**
 * Get formatted message for gate result
 */
export function formatGateResult(result: GatePolicyResult): string {
  if (result.status === 'passed') {
    return 'All completion gates passed. Task can be completed.';
  }

  const lines: string[] = [];
  lines.push(`Completion blocked: ${result.blockedReason}`);

  if (result.nextToolCalls && result.nextToolCalls.length > 0) {
    lines.push('');
    lines.push('Required actions:');
    for (const call of result.nextToolCalls) {
      lines.push(`  - ${call.tool}: ${call.reason}`);
    }
  }

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════
//                      SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════

let globalCompletionGates: CompletionGatesService | null = null;

export function getGlobalCompletionGates(config?: Partial<GatePolicyConfig>): CompletionGatesService {
  if (!globalCompletionGates) {
    globalCompletionGates = new CompletionGatesService(config);
  }
  return globalCompletionGates;
}

export function resetGlobalCompletionGates(): void {
  globalCompletionGates = null;
}
