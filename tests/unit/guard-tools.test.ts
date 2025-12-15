// tests/unit/guard-tools.test.ts

// Using vitest globals
import {
  getGuardTools,
  formatValidationResult,
  formatTestAnalysis,
  formatRulesList,
} from '../../src/modules/guard/guard.tools.js';

describe('Guard Tools', () => {
  // ═══════════════════════════════════════════════════════════════
  //                      TOOL DEFINITIONS
  // ═══════════════════════════════════════════════════════════════

  describe('getGuardTools', () => {
    it('should return array of tool definitions', () => {
      const tools = getGuardTools();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
    });

    it('should include guard_validate tool', () => {
      const tools = getGuardTools();
      const validateTool = tools.find(t => t.name === 'guard_validate');

      expect(validateTool).toBeDefined();
      expect(validateTool!.inputSchema.required).toContain('code');
      expect(validateTool!.inputSchema.required).toContain('filename');
    });

    it('should include guard_check_test tool', () => {
      const tools = getGuardTools();
      const checkTestTool = tools.find(t => t.name === 'guard_check_test');

      expect(checkTestTool).toBeDefined();
      expect(checkTestTool!.inputSchema.required).toContain('code');
      expect(checkTestTool!.inputSchema.required).toContain('filename');
    });

    it('should include guard_rules tool', () => {
      const tools = getGuardTools();
      const rulesTool = tools.find(t => t.name === 'guard_rules');

      expect(rulesTool).toBeDefined();
      expect(rulesTool!.inputSchema.required).toEqual([]);
    });

    it('should include guard_toggle_rule tool', () => {
      const tools = getGuardTools();
      const toggleTool = tools.find(t => t.name === 'guard_toggle_rule');

      expect(toggleTool).toBeDefined();
      expect(toggleTool!.inputSchema.required).toContain('rule');
      expect(toggleTool!.inputSchema.required).toContain('enabled');
    });

    it('should include guard_status tool', () => {
      const tools = getGuardTools();
      const statusTool = tools.find(t => t.name === 'guard_status');

      expect(statusTool).toBeDefined();
      expect(statusTool!.inputSchema.required).toEqual([]);
    });

    it('should have valid schema for all tools', () => {
      const tools = getGuardTools();

      for (const tool of tools) {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
        expect(Array.isArray(tool.inputSchema.required)).toBe(true);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      FORMAT VALIDATION RESULT
  // ═══════════════════════════════════════════════════════════════

  describe('formatValidationResult', () => {
    it('should format passing result', () => {
      const result = formatValidationResult({
        valid: true,
        blocked: false,
        issues: [],
        suggestions: [],
      });

      expect(result).toContain('Validation PASSED');
      expect(result).toContain('No issues found');
    });

    it('should format blocked result', () => {
      const result = formatValidationResult({
        valid: false,
        blocked: true,
        issues: [
          {
            rule: 'fake-test',
            severity: 'block',
            message: 'Test has no assertions',
          },
        ],
        suggestions: [],
      });

      expect(result).toContain('Validation BLOCKED');
      expect(result).toContain('BLOCKING (1)');
      expect(result).toContain('[fake-test]');
    });

    it('should format errors', () => {
      const result = formatValidationResult({
        valid: false,
        blocked: false,
        issues: [
          {
            rule: 'empty-catch',
            severity: 'error',
            message: 'Empty catch block detected',
          },
        ],
        suggestions: [],
      });

      expect(result).toContain('ERRORS (1)');
      expect(result).toContain('[empty-catch]');
    });

    it('should format warnings', () => {
      const result = formatValidationResult({
        valid: true,
        blocked: false,
        issues: [
          {
            rule: 'console-log',
            severity: 'warning',
            message: 'Console.log statement found',
          },
        ],
        suggestions: [],
      });

      expect(result).toContain('WARNINGS (1)');
      expect(result).toContain('[console-log]');
    });

    it('should format info issues', () => {
      const result = formatValidationResult({
        valid: true,
        blocked: false,
        issues: [
          {
            rule: 'todo',
            severity: 'info',
            message: 'TODO comment found',
          },
        ],
        suggestions: [],
      });

      expect(result).toContain('INFO (1)');
      expect(result).toContain('[todo]');
    });

    it('should include location if provided', () => {
      const result = formatValidationResult({
        valid: false,
        blocked: true,
        issues: [
          {
            rule: 'empty-catch',
            severity: 'block',
            message: 'Empty catch block',
            location: {
              file: 'src/app.ts',
              line: 42,
              snippet: 'catch (e) {}',
            },
          },
        ],
        suggestions: [],
      });

      expect(result).toContain('at src/app.ts:42');
      expect(result).toContain('catch (e) {}');
    });

    it('should include suggestions when there are issues', () => {
      // Note: suggestions are only shown when there are issues (not on clean pass)
      const result = formatValidationResult({
        valid: true,
        blocked: false,
        issues: [
          { rule: 'info-rule', severity: 'info', message: 'Info message' },
        ],
        suggestions: ['Consider using try-catch', 'Add error logging'],
      });

      expect(result).toContain('SUGGESTIONS:');
      expect(result).toContain('Consider using try-catch');
      expect(result).toContain('Add error logging');
    });

    it('should not show suggestions on clean pass', () => {
      // When valid=true and no issues, early return happens
      const result = formatValidationResult({
        valid: true,
        blocked: false,
        issues: [],
        suggestions: ['Some suggestion'],
      });

      expect(result).toContain('Validation PASSED');
      expect(result).not.toContain('SUGGESTIONS:');
    });

    it('should handle multiple severities', () => {
      const result = formatValidationResult({
        valid: false,
        blocked: true,
        issues: [
          { rule: 'rule1', severity: 'block', message: 'Block message' },
          { rule: 'rule2', severity: 'error', message: 'Error message' },
          { rule: 'rule3', severity: 'warning', message: 'Warning message' },
          { rule: 'rule4', severity: 'info', message: 'Info message' },
        ],
        suggestions: ['Suggestion 1'],
      });

      expect(result).toContain('BLOCKING (1)');
      expect(result).toContain('ERRORS (1)');
      expect(result).toContain('WARNINGS (1)');
      expect(result).toContain('INFO (1)');
      expect(result).toContain('SUGGESTIONS:');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      FORMAT TEST ANALYSIS
  // ═══════════════════════════════════════════════════════════════

  describe('formatTestAnalysis', () => {
    it('should format passing analysis', () => {
      const result = formatTestAnalysis({
        hasAssertions: true,
        assertionCount: 5,
        testCount: 3,
        suspiciousTests: [],
        skippedTests: [],
      });

      expect(result).toContain('Test Analysis');
      expect(result).toContain('Tests found: 3');
      expect(result).toContain('Assertions: 5');
      expect(result).toContain('Has assertions: Yes');
    });

    it('should flag missing assertions', () => {
      const result = formatTestAnalysis({
        hasAssertions: false,
        assertionCount: 0,
        testCount: 2,
        suspiciousTests: [],
        skippedTests: [],
      });

      expect(result).toContain('Has assertions: NO');
      expect(result).toContain('fake tests');
    });

    it('should list suspicious tests', () => {
      const result = formatTestAnalysis({
        hasAssertions: true,
        assertionCount: 3,
        testCount: 5,
        suspiciousTests: ['should do something', 'test empty'],
        skippedTests: [],
      });

      expect(result).toContain('Suspicious tests');
      expect(result).toContain('should do something');
      expect(result).toContain('test empty');
    });

    it('should list skipped tests', () => {
      const result = formatTestAnalysis({
        hasAssertions: true,
        assertionCount: 2,
        testCount: 4,
        suspiciousTests: [],
        skippedTests: ['skipped test 1', 'skipped test 2'],
      });

      expect(result).toContain('Skipped tests');
      expect(result).toContain('skipped test 1');
      expect(result).toContain('skipped test 2');
    });

    it('should handle both suspicious and skipped tests', () => {
      const result = formatTestAnalysis({
        hasAssertions: true,
        assertionCount: 1,
        testCount: 4,
        suspiciousTests: ['suspicious 1'],
        skippedTests: ['skipped 1'],
      });

      expect(result).toContain('Suspicious tests');
      expect(result).toContain('suspicious 1');
      expect(result).toContain('Skipped tests');
      expect(result).toContain('skipped 1');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      FORMAT RULES LIST
  // ═══════════════════════════════════════════════════════════════

  describe('formatRulesList', () => {
    it('should handle empty rules', () => {
      const result = formatRulesList([]);
      expect(result).toContain('No rules configured');
    });

    it('should format single rule', () => {
      const result = formatRulesList([
        { name: 'fake-test', enabled: true, category: 'test-quality' },
      ]);

      expect(result).toContain('Guard Rules');
      expect(result).toContain('TEST-QUALITY');
      expect(result).toContain('[ON]');
      expect(result).toContain('fake-test');
    });

    it('should show disabled rules', () => {
      const result = formatRulesList([
        { name: 'disabled-rule', enabled: false, category: 'security' },
      ]);

      expect(result).toContain('[OFF]');
      expect(result).toContain('disabled-rule');
    });

    it('should group by category', () => {
      const result = formatRulesList([
        { name: 'rule1', enabled: true, category: 'security' },
        { name: 'rule2', enabled: true, category: 'security' },
        { name: 'rule3', enabled: false, category: 'test-quality' },
      ]);

      expect(result).toContain('SECURITY');
      expect(result).toContain('TEST-QUALITY');
      expect(result).toContain('rule1');
      expect(result).toContain('rule2');
      expect(result).toContain('rule3');
    });

    it('should handle multiple categories', () => {
      const result = formatRulesList([
        { name: 'sec1', enabled: true, category: 'security' },
        { name: 'perf1', enabled: true, category: 'performance' },
        { name: 'test1', enabled: false, category: 'test-quality' },
      ]);

      expect(result).toContain('SECURITY');
      expect(result).toContain('PERFORMANCE');
      expect(result).toContain('TEST-QUALITY');
    });
  });
});
