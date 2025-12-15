import {
  estimateTokens,
  estimateCodeTokens,
  estimateTaskComplexity,
} from '../../src/core/utils/token-estimator.js';
import {
  toCamelCase,
  toPascalCase,
  toKebabCase,
  toSnakeCase,
  toScreamingSnakeCase,
  truncate,
  pluralize,
  formatDuration,
  formatBytes,
  randomString,
  escapeRegex,
  isValidIdentifier,
} from '../../src/core/utils/string-utils.js';

describe('Utils', () => {
  describe('TokenEstimator', () => {
    describe('estimateTokens', () => {
      it('should estimate tokens for simple text', () => {
        const text = 'Hello world';
        const tokens = estimateTokens(text);
        expect(tokens).toBeGreaterThan(0);
        expect(tokens).toBeLessThan(20);
      });

      it('should return more tokens for longer text', () => {
        const shortText = 'Hello';
        const longText = 'Hello world, this is a much longer text with many words';

        const shortTokens = estimateTokens(shortText);
        const longTokens = estimateTokens(longText);

        expect(longTokens).toBeGreaterThan(shortTokens);
      });

      it('should handle empty string', () => {
        const tokens = estimateTokens('');
        expect(tokens).toBeGreaterThanOrEqual(0);
      });
    });

    describe('estimateCodeTokens', () => {
      it('should estimate tokens for code', () => {
        const code = `
          function hello() {
            console.log("Hello");
          }
        `;
        const tokens = estimateCodeTokens(code);
        expect(tokens).toBeGreaterThan(0);
      });

      it('should handle comments', () => {
        const code = `// This is a comment`;
        const tokens = estimateCodeTokens(code);
        expect(tokens).toBeGreaterThan(0);
      });

      it('should count operators', () => {
        const code = `const a = 1 + 2 * 3;`;
        const tokens = estimateCodeTokens(code);
        expect(tokens).toBeGreaterThan(5);
      });
    });

    describe('estimateTaskComplexity', () => {
      it('should estimate low complexity for simple tasks', () => {
        const task = 'Fix typo in README';
        const result = estimateTaskComplexity(task);
        expect(result.complexity).toBe('low');
        expect(result.tokenEstimate).toBe(1000);
      });

      it('should estimate medium complexity for feature tasks', () => {
        const task = 'Add new component for user profile';
        const result = estimateTaskComplexity(task);
        expect(result.complexity).toBe('medium');
        expect(result.tokenEstimate).toBe(3000);
      });

      it('should estimate high complexity for refactoring tasks', () => {
        const task = 'Refactor the API service layer';
        const result = estimateTaskComplexity(task);
        expect(result.complexity).toBe('high');
        expect(result.tokenEstimate).toBe(8000);
      });

      it('should estimate very high complexity for architecture tasks', () => {
        const task = 'Rewrite the entire authentication architecture';
        const result = estimateTaskComplexity(task);
        expect(result.complexity).toBe('very_high');
        expect(result.tokenEstimate).toBeGreaterThan(10000);
      });

      it('should include time estimate', () => {
        const task = 'Add feature';
        const result = estimateTaskComplexity(task);
        expect(result.timeEstimate).toBeDefined();
        expect(typeof result.timeEstimate).toBe('string');
      });
    });
  });

  describe('StringUtils', () => {
    describe('toCamelCase', () => {
      it('should convert kebab-case to camelCase', () => {
        expect(toCamelCase('hello-world')).toBe('helloWorld');
      });

      it('should convert snake_case to camelCase', () => {
        expect(toCamelCase('hello_world')).toBe('helloWorld');
      });

      it('should convert space separated to camelCase', () => {
        expect(toCamelCase('Hello World')).toBe('helloWorld');
      });

      it('should handle already camelCase', () => {
        expect(toCamelCase('helloWorld')).toBe('helloWorld');
      });
    });

    describe('toPascalCase', () => {
      it('should convert kebab-case to PascalCase', () => {
        expect(toPascalCase('hello-world')).toBe('HelloWorld');
      });

      it('should convert snake_case to PascalCase', () => {
        expect(toPascalCase('hello_world')).toBe('HelloWorld');
      });
    });

    describe('toKebabCase', () => {
      it('should convert PascalCase to kebab-case', () => {
        expect(toKebabCase('HelloWorld')).toBe('hello-world');
      });

      it('should convert camelCase to kebab-case', () => {
        expect(toKebabCase('helloWorld')).toBe('hello-world');
      });

      it('should convert spaces to hyphens', () => {
        expect(toKebabCase('Hello World')).toBe('hello-world');
      });
    });

    describe('toSnakeCase', () => {
      it('should convert PascalCase to snake_case', () => {
        expect(toSnakeCase('HelloWorld')).toBe('hello_world');
      });

      it('should convert camelCase to snake_case', () => {
        expect(toSnakeCase('helloWorld')).toBe('hello_world');
      });
    });

    describe('toScreamingSnakeCase', () => {
      it('should convert to SCREAMING_SNAKE_CASE', () => {
        expect(toScreamingSnakeCase('helloWorld')).toBe('HELLO_WORLD');
        expect(toScreamingSnakeCase('HelloWorld')).toBe('HELLO_WORLD');
      });
    });

    describe('truncate', () => {
      it('should not truncate short strings', () => {
        expect(truncate('Hello', 10)).toBe('Hello');
      });

      it('should truncate long strings with ellipsis', () => {
        expect(truncate('Hello World', 8)).toBe('Hello...');
      });

      it('should use custom ellipsis', () => {
        expect(truncate('Hello World', 8, '…')).toBe('Hello W…');
      });
    });

    describe('pluralize', () => {
      it('should not pluralize for count 1', () => {
        expect(pluralize('item', 1)).toBe('item');
      });

      it('should add s for regular words', () => {
        expect(pluralize('item', 2)).toBe('items');
      });

      it('should handle words ending in y', () => {
        expect(pluralize('category', 2)).toBe('categories');
      });

      it('should handle words ending in s', () => {
        expect(pluralize('class', 2)).toBe('classes');
      });

      it('should handle words ending in x', () => {
        expect(pluralize('box', 2)).toBe('boxes');
      });

      it('should handle words ending in ch', () => {
        expect(pluralize('match', 2)).toBe('matches');
      });
    });

    describe('formatDuration', () => {
      it('should format milliseconds', () => {
        expect(formatDuration(500)).toBe('500ms');
      });

      it('should format seconds', () => {
        expect(formatDuration(5000)).toBe('5s');
      });

      it('should format minutes', () => {
        expect(formatDuration(120000)).toBe('2m');
      });

      it('should format hours', () => {
        expect(formatDuration(7200000)).toBe('2h');
      });
    });

    describe('formatBytes', () => {
      it('should format bytes', () => {
        expect(formatBytes(500)).toBe('500 B');
      });

      it('should format kilobytes', () => {
        expect(formatBytes(1024)).toBe('1.0 KB');
      });

      it('should format megabytes', () => {
        expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
      });

      it('should format gigabytes', () => {
        expect(formatBytes(1024 * 1024 * 1024)).toBe('1.0 GB');
      });
    });

    describe('randomString', () => {
      it('should generate string of specified length', () => {
        const str = randomString(10);
        expect(str.length).toBe(10);
      });

      it('should use custom characters', () => {
        const str = randomString(10, 'abc');
        expect(str).toMatch(/^[abc]+$/);
      });

      it('should generate different strings', () => {
        const str1 = randomString(20);
        const str2 = randomString(20);
        expect(str1).not.toBe(str2);
      });
    });

    describe('escapeRegex', () => {
      it('should escape special regex characters', () => {
        expect(escapeRegex('a.b*c?d')).toBe('a\\.b\\*c\\?d');
      });

      it('should escape brackets', () => {
        expect(escapeRegex('[test]')).toBe('\\[test\\]');
      });

      it('should leave normal characters unchanged', () => {
        expect(escapeRegex('hello')).toBe('hello');
      });
    });

    describe('isValidIdentifier', () => {
      it('should accept valid identifiers', () => {
        expect(isValidIdentifier('hello')).toBe(true);
        expect(isValidIdentifier('_private')).toBe(true);
        expect(isValidIdentifier('$dollar')).toBe(true);
        expect(isValidIdentifier('camelCase')).toBe(true);
        expect(isValidIdentifier('PascalCase')).toBe(true);
      });

      it('should reject invalid identifiers', () => {
        expect(isValidIdentifier('123abc')).toBe(false);
        expect(isValidIdentifier('hello-world')).toBe(false);
        expect(isValidIdentifier('hello world')).toBe(false);
      });
    });
  });
});
