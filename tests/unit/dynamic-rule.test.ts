// tests/unit/dynamic-rule.test.ts
// DynamicRule Unit Tests

// Using vitest globals
import { DynamicRule } from '../../src/modules/guard/rules/dynamic.rule.js';
import type { CustomRule } from '../../src/core/types.js';

describe('DynamicRule', () => {
  describe('constructor', () => {
    it('creates rule with string pattern', () => {
      const config: CustomRule = {
        name: 'no-console',
        pattern: 'console.log',
        message: 'No console.log allowed',
        severity: 'warning',
      };

      const rule = new DynamicRule(config);

      expect(rule.name).toBe('custom:no-console');
      expect(rule.description).toBe('No console.log allowed');
      expect(rule.enabled).toBe(true);
      expect(rule.category).toBe('custom');
    });

    it('creates rule with regex literal pattern', () => {
      const config: CustomRule = {
        name: 'no-debugger',
        pattern: '/debugger;?/gi',
        message: 'No debugger statements',
        severity: 'error',
      };

      const rule = new DynamicRule(config);

      expect(rule.name).toBe('custom:no-debugger');
      expect(rule.enabled).toBe(true);
    });

    it('creates rule with regex flags', () => {
      const config: CustomRule = {
        name: 'test-pattern',
        pattern: '/TODO/i',
        message: 'Found TODO',
        severity: 'warning',
      };

      const rule = new DynamicRule(config);

      expect(rule.enabled).toBe(true);
    });

    it('disables rule on invalid regex', () => {
      const config: CustomRule = {
        name: 'invalid-regex',
        pattern: '/[invalid/',
        message: 'Invalid pattern',
        severity: 'error',
      };

      const rule = new DynamicRule(config);

      expect(rule.enabled).toBe(false);
    });

    it('handles severity levels', () => {
      const warningRule = new DynamicRule({
        name: 'warn-test',
        pattern: 'test',
        message: 'Warning',
        severity: 'warning',
      });

      const errorRule = new DynamicRule({
        name: 'error-test',
        pattern: 'test',
        message: 'Error',
        severity: 'error',
      });

      const blockRule = new DynamicRule({
        name: 'block-test',
        pattern: 'test',
        message: 'Block',
        severity: 'block',
      });

      expect(warningRule).toBeDefined();
      expect(errorRule).toBeDefined();
      expect(blockRule).toBeDefined();
    });
  });

  describe('validate()', () => {
    it('returns empty array for non-matching code', () => {
      const rule = new DynamicRule({
        name: 'no-console',
        pattern: 'console.log',
        message: 'No console.log',
        severity: 'warning',
      });

      const issues = rule.validate('const x = 1;', 'test.ts');

      expect(issues).toEqual([]);
    });

    it('detects single match', () => {
      const rule = new DynamicRule({
        name: 'no-console',
        pattern: 'console.log',
        message: 'No console.log',
        severity: 'warning',
      });

      const code = 'console.log("hello");';
      const issues = rule.validate(code, 'test.ts');

      expect(issues.length).toBe(1);
      expect(issues[0].rule).toBe('custom:no-console');
      expect(issues[0].severity).toBe('warning');
      expect(issues[0].message).toBe('No console.log');
      expect(issues[0].location.file).toBe('test.ts');
      expect(issues[0].location.line).toBe(1);
    });

    it('detects multiple matches on same line', () => {
      const rule = new DynamicRule({
        name: 'no-var',
        pattern: 'var',
        message: 'Use const/let instead',
        severity: 'warning',
      });

      const code = 'var x = 1; var y = 2;';
      const issues = rule.validate(code, 'test.ts');

      expect(issues.length).toBe(2);
    });

    it('detects matches on multiple lines', () => {
      const rule = new DynamicRule({
        name: 'no-console',
        pattern: 'console',
        message: 'No console',
        severity: 'error',
      });

      const code = `console.log("1");
const x = 1;
console.warn("2");`;

      const issues = rule.validate(code, 'test.ts');

      expect(issues.length).toBe(2);
      expect(issues[0].location.line).toBe(1);
      expect(issues[1].location.line).toBe(3);
    });

    it('includes column information', () => {
      const rule = new DynamicRule({
        name: 'test',
        pattern: 'DEBUG',
        message: 'No DEBUG',
        severity: 'warning',
      });

      const code = '    DEBUG = true;';
      const issues = rule.validate(code, 'test.ts');

      expect(issues.length).toBe(1);
      expect(issues[0].location.column).toBe(5); // 1-indexed
    });

    it('includes code snippet', () => {
      const rule = new DynamicRule({
        name: 'test',
        pattern: 'TODO',
        message: 'Found TODO',
        severity: 'warning',
      });

      const code = '  // TODO: fix this  ';
      const issues = rule.validate(code, 'test.ts');

      expect(issues.length).toBe(1);
      expect(issues[0].location.snippet).toBe('// TODO: fix this');
    });

    it('provides suggestion with match', () => {
      const rule = new DynamicRule({
        name: 'test',
        pattern: 'FIXME',
        message: 'Found FIXME',
        severity: 'warning',
      });

      const issues = rule.validate('// FIXME: broken', 'test.ts');

      expect(issues[0].suggestion).toContain('FIXME');
    });

    it('sets autoFixable to false', () => {
      const rule = new DynamicRule({
        name: 'test',
        pattern: 'test',
        message: 'Test',
        severity: 'warning',
      });

      const issues = rule.validate('test', 'test.ts');

      expect(issues[0].autoFixable).toBe(false);
    });

    it('handles regex with flags', () => {
      const rule = new DynamicRule({
        name: 'case-insensitive',
        pattern: '/todo/gi',
        message: 'Found TODO',
        severity: 'warning',
      });

      const code = `TODO: uppercase
todo: lowercase
Todo: mixed`;

      const issues = rule.validate(code, 'test.ts');

      expect(issues.length).toBe(3);
    });

    it('handles empty code', () => {
      const rule = new DynamicRule({
        name: 'test',
        pattern: 'test',
        message: 'Test',
        severity: 'warning',
      });

      const issues = rule.validate('', 'test.ts');

      expect(issues).toEqual([]);
    });

    it('handles code with only newlines', () => {
      const rule = new DynamicRule({
        name: 'test',
        pattern: 'test',
        message: 'Test',
        severity: 'warning',
      });

      const issues = rule.validate('\n\n\n', 'test.ts');

      expect(issues).toEqual([]);
    });

    it('reports block severity', () => {
      const rule = new DynamicRule({
        name: 'blocked-pattern',
        pattern: 'eval\\(',
        message: 'eval is not allowed',
        severity: 'block',
      });

      const issues = rule.validate('eval(userInput)', 'test.ts');

      expect(issues.length).toBe(1);
      expect(issues[0].severity).toBe('block');
    });

    it('handles special regex characters in string pattern', () => {
      const rule = new DynamicRule({
        name: 'bracket-test',
        pattern: '\\[\\]',
        message: 'Found empty array brackets',
        severity: 'warning',
      });

      const issues = rule.validate('const arr = [];', 'test.ts');

      expect(issues.length).toBe(1);
    });
  });

  describe('disabled rule', () => {
    it('is disabled when regex is invalid', () => {
      const rule = new DynamicRule({
        name: 'invalid',
        pattern: '/[/',
        message: 'Invalid',
        severity: 'error',
      });

      // Rule should be disabled due to invalid regex
      expect(rule.enabled).toBe(false);
    });
  });
});
