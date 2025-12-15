// src/modules/guard/guard.types.ts

// Re-export core types
export {
  ValidationResult,
  ValidationIssue,
  CodeLocation,
  GuardModuleConfig,
  GuardRules,
  CustomRule,
} from '../../core/types.js';

// Re-export ruleset types
export {
  GuardRuleset,
  getRulesForRuleset,
  isValidRuleset,
  getAvailableRulesets,
  getRulesetDescription,
  RULESET_REGISTRY,
  FRONTEND_RULES,
  BACKEND_RULES,
  SECURITY_RULES,
  TESTING_RULES,
  DEFAULT_RULES,
} from './guard.rulesets.js';

// ═══════════════════════════════════════════════════════════════
//                      GUARD RULE INTERFACE
// ═══════════════════════════════════════════════════════════════

/**
 * Base interface for all guard rules
 */
export interface IGuardRule {
  /** Unique name of the rule */
  name: string;

  /** Whether the rule is currently enabled */
  enabled: boolean;

  /** Human-readable description */
  description: string;

  /** Rule category */
  category: RuleCategory;

  /**
   * Validate code against this rule
   * @param code - Source code to validate
   * @param filename - Name of the file being validated
   * @returns Array of validation issues found
   */
  validate(code: string, filename: string): import('../../core/types.js').ValidationIssue[];
}

export type RuleCategory =
  | 'testing'      // Test quality rules
  | 'security'     // Security-related rules
  | 'quality'      // Code quality rules
  | 'convention'   // Coding conventions
  | 'performance'  // Performance rules
  | 'custom';      // User-defined custom rules

// ═══════════════════════════════════════════════════════════════
//                      VALIDATION TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Options for code validation
 */
export interface ValidateOptions {
  /** Specific rules to run (if not specified, runs all enabled rules) */
  rules?: string[];

  /** Skip certain rules */
  skipRules?: string[];

  /** Treat warnings as errors */
  strict?: boolean;

  /** Include suggestions in output */
  includeSuggestions?: boolean;

  /** Ruleset to use (frontend, backend, security, testing, default) */
  ruleset?: import('./guard.rulesets.js').GuardRuleset;

  /** Task ID for evidence tagging */
  taskId?: string;
}

/**
 * Test file analysis result
 */
export interface TestAnalysis {
  /** Whether the file has any assertions */
  hasAssertions: boolean;

  /** Total number of assertions found */
  assertionCount: number;

  /** Number of test cases found */
  testCount: number;

  /** Names of tests without assertions */
  suspiciousTests: string[];

  /** Names of skipped tests */
  skippedTests: string[];
}

/**
 * Guard module status
 */
export interface GuardModuleStatus {
  enabled: boolean;
  strictMode: boolean;
  rules: RuleStatus[];
  stats: {
    validationsRun: number;
    issuesFound: number;
    blockedCount: number;
  };
}

export interface RuleStatus {
  name: string;
  enabled: boolean;
  category: RuleCategory;
  issuesFound: number;
}

// ═══════════════════════════════════════════════════════════════
//                      RISK CLASSIFICATION
// ═══════════════════════════════════════════════════════════════

/**
 * Risk level for actions/commands
 */
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'BLOCK';

/**
 * Risk classification result
 */
export interface RiskClassification {
  /** Overall risk level */
  level: RiskLevel;

  /** Reason for the classification */
  reason: string;

  /** Category of the action */
  category: RiskCategory;

  /** Matched pattern (if any) */
  matchedPattern?: string;

  /** Should auto-checkpoint before this action? */
  shouldCheckpoint: boolean;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Risk category for classification
 */
export type RiskCategory =
  | 'git'           // Git operations
  | 'filesystem'    // File system operations
  | 'shell'         // Shell/system commands
  | 'database'      // Database operations
  | 'network'       // Network operations
  | 'process'       // Process management
  | 'environment'   // Environment changes
  | 'unknown';      // Unclassified

/**
 * Risk pattern definition
 */
export interface RiskPattern {
  /** Pattern to match (regex or string) */
  pattern: RegExp | string;

  /** Risk level when matched */
  level: RiskLevel;

  /** Category */
  category: RiskCategory;

  /** Description of why this is risky */
  description: string;
}

// ═══════════════════════════════════════════════════════════════
//                      RESULT TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Extended validation result with formatting
 */
export interface ValidationResponse {
  success: boolean;
  valid: boolean;
  blocked: boolean;
  issueCount: number;
  issues: import('../../core/types.js').ValidationIssue[];
  suggestions: string[];
  formatted: string;
}

/**
 * Test check result
 */
export interface TestCheckResult {
  valid: boolean;
  issues: import('../../core/types.js').ValidationIssue[];
  analysis: TestAnalysis;
  formatted: string;
}

// ═══════════════════════════════════════════════════════════════
//                      GUARD EVIDENCE (for Completion Gates)
// ═══════════════════════════════════════════════════════════════

// Re-export GuardEvidence from completion-gates for use with StateManager
export { GuardEvidence } from '../../core/completion-gates.js';

/**
 * Detailed guard validation result for internal use.
 * Contains more information than GuardEvidence for debugging/logging.
 */
export interface DetailedGuardResult {
  /** Unique run ID */
  runId: string;

  /** ISO timestamp */
  timestamp: string;

  /** File that was validated */
  filename: string;

  /** Ruleset used (if any) */
  ruleset?: string;

  /** Whether validation passed */
  passed: boolean;

  /** Whether validation blocked */
  blocked: boolean;

  /** Number of issues found */
  issueCount: number;

  /** List of failing rule names */
  failingRules: string[];

  /** Top issues (capped to 5 for storage efficiency) */
  topIssues: Array<{
    rule: string;
    severity: string;
    message: string;
    line?: number;
  }>;

  /** Task ID this evidence belongs to */
  taskId?: string;
}
