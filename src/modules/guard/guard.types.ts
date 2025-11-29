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
  | 'performance'; // Performance rules

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
