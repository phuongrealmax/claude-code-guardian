// src/modules/guard/guard.tools.ts

/**
 * MCP Tool definitions for Guard Module
 */

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

// ═══════════════════════════════════════════════════════════════
//                      GUARD TOOLS DEFINITION
// ═══════════════════════════════════════════════════════════════

export function getGuardTools(): MCPTool[] {
  return [
    {
      name: 'guard_validate',
      description: 'Validate code for common issues like fake tests, disabled features, empty catch blocks, and emoji in code. Use this before committing code changes.',
      inputSchema: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'The source code to validate',
          },
          filename: {
            type: 'string',
            description: 'Name of the file (used to determine file type and applicable rules)',
          },
          strict: {
            type: 'boolean',
            default: false,
            description: 'If true, treat warnings as blocking errors',
          },
          rules: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific rules to run (optional, runs all if not specified)',
          },
        },
        required: ['code', 'filename'],
      },
    },
    {
      name: 'guard_check_test',
      description: 'Analyze a test file for fake tests (tests without assertions). Use this to ensure test quality.',
      inputSchema: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'The test file source code',
          },
          filename: {
            type: 'string',
            description: 'Name of the test file',
          },
        },
        required: ['code', 'filename'],
      },
    },
    {
      name: 'guard_rules',
      description: 'List all available guard rules and their status.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'guard_toggle_rule',
      description: 'Enable or disable a specific guard rule.',
      inputSchema: {
        type: 'object',
        properties: {
          rule: {
            type: 'string',
            description: 'Name of the rule to toggle',
          },
          enabled: {
            type: 'boolean',
            description: 'Whether to enable (true) or disable (false) the rule',
          },
        },
        required: ['rule', 'enabled'],
      },
    },
    {
      name: 'guard_status',
      description: 'Get the current status of the guard module including stats.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  ];
}

// ═══════════════════════════════════════════════════════════════
//                      RESULT FORMATTERS
// ═══════════════════════════════════════════════════════════════

/**
 * Format validation result for display
 */
export function formatValidationResult(result: {
  valid: boolean;
  blocked: boolean;
  issues: Array<{
    rule: string;
    severity: string;
    message: string;
    location?: { file: string; line: number; snippet?: string };
    suggestion?: string;
  }>;
  suggestions: string[];
}): string {
  const lines: string[] = [];

  if (result.valid && result.issues.length === 0) {
    lines.push('Validation PASSED - No issues found');
    return lines.join('\n');
  }

  if (result.blocked) {
    lines.push('Validation BLOCKED - Critical issues found');
  } else {
    lines.push(`Validation completed with ${result.issues.length} issue(s)`);
  }
  lines.push('');

  // Group issues by severity
  const blocked = result.issues.filter(i => i.severity === 'block');
  const errors = result.issues.filter(i => i.severity === 'error');
  const warnings = result.issues.filter(i => i.severity === 'warning');
  const info = result.issues.filter(i => i.severity === 'info');

  if (blocked.length > 0) {
    lines.push(`BLOCKING (${blocked.length}):`);
    for (const issue of blocked) {
      lines.push(formatIssue(issue));
    }
    lines.push('');
  }

  if (errors.length > 0) {
    lines.push(`ERRORS (${errors.length}):`);
    for (const issue of errors) {
      lines.push(formatIssue(issue));
    }
    lines.push('');
  }

  if (warnings.length > 0) {
    lines.push(`WARNINGS (${warnings.length}):`);
    for (const issue of warnings) {
      lines.push(formatIssue(issue));
    }
    lines.push('');
  }

  if (info.length > 0) {
    lines.push(`INFO (${info.length}):`);
    for (const issue of info) {
      lines.push(formatIssue(issue));
    }
    lines.push('');
  }

  if (result.suggestions.length > 0) {
    lines.push('SUGGESTIONS:');
    for (const suggestion of result.suggestions) {
      lines.push(`  - ${suggestion}`);
    }
  }

  return lines.join('\n');
}

function formatIssue(issue: {
  rule: string;
  severity: string;
  message: string;
  location?: { file: string; line: number; snippet?: string };
  suggestion?: string;
}): string {
  const parts: string[] = [];

  const icon = {
    block: '[X]',
    error: '[E]',
    warning: '[W]',
    info: '[I]',
  }[issue.severity] || '[?]';

  parts.push(`  ${icon} [${issue.rule}] ${issue.message}`);

  if (issue.location) {
    parts.push(`      at ${issue.location.file}:${issue.location.line}`);
    if (issue.location.snippet) {
      parts.push(`      > ${issue.location.snippet.slice(0, 60)}...`);
    }
  }

  return parts.join('\n');
}

/**
 * Format test analysis result
 */
export function formatTestAnalysis(analysis: {
  hasAssertions: boolean;
  assertionCount: number;
  testCount: number;
  suspiciousTests: string[];
  skippedTests: string[];
}): string {
  const lines: string[] = [
    '=== Test Analysis ===',
    `Tests found: ${analysis.testCount}`,
    `Assertions: ${analysis.assertionCount}`,
    `Has assertions: ${analysis.hasAssertions ? 'Yes' : 'NO - This file may contain fake tests!'}`,
  ];

  if (analysis.suspiciousTests.length > 0) {
    lines.push('');
    lines.push('Suspicious tests (no assertions):');
    for (const test of analysis.suspiciousTests) {
      lines.push(`  - ${test}`);
    }
  }

  if (analysis.skippedTests.length > 0) {
    lines.push('');
    lines.push('Skipped tests:');
    for (const test of analysis.skippedTests) {
      lines.push(`  - ${test}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format rules list
 */
export function formatRulesList(rules: Array<{
  name: string;
  enabled: boolean;
  category: string;
}>): string {
  if (rules.length === 0) {
    return 'No rules configured.';
  }

  const lines = ['=== Guard Rules ===', ''];

  // Group by category
  const byCategory: Record<string, typeof rules> = {};
  for (const rule of rules) {
    if (!byCategory[rule.category]) {
      byCategory[rule.category] = [];
    }
    byCategory[rule.category].push(rule);
  }

  for (const [category, categoryRules] of Object.entries(byCategory)) {
    lines.push(`${category.toUpperCase()}:`);
    for (const rule of categoryRules) {
      const status = rule.enabled ? '[ON] ' : '[OFF]';
      lines.push(`  ${status} ${rule.name}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
