// tests/unit/code-analyzer.test.ts

// Using vitest globals
import {
  detectLanguage,
  analyzeCode,
  containsEmoji,
  containsProblematicUnicode,
  findEmptyCatchBlocks,
  findCommentedCode,
} from '../../src/core/utils/code-analyzer.js';

describe('code-analyzer', () => {
  // ═══════════════════════════════════════════════════════════════
  //                      detectLanguage
  // ═══════════════════════════════════════════════════════════════

  describe('detectLanguage', () => {
    it('should detect TypeScript', () => {
      expect(detectLanguage('file.ts')).toBe('typescript');
    });

    it('should detect TypeScript React', () => {
      expect(detectLanguage('file.tsx')).toBe('typescript-react');
    });

    it('should detect JavaScript', () => {
      expect(detectLanguage('file.js')).toBe('javascript');
    });

    it('should detect JavaScript React', () => {
      expect(detectLanguage('file.jsx')).toBe('javascript-react');
    });

    it('should detect Python', () => {
      expect(detectLanguage('file.py')).toBe('python');
    });

    it('should detect Go', () => {
      expect(detectLanguage('file.go')).toBe('go');
    });

    it('should detect Rust', () => {
      expect(detectLanguage('file.rs')).toBe('rust');
    });

    it('should detect Java', () => {
      expect(detectLanguage('file.java')).toBe('java');
    });

    it('should detect C#', () => {
      expect(detectLanguage('file.cs')).toBe('csharp');
    });

    it('should detect JSON', () => {
      expect(detectLanguage('file.json')).toBe('json');
    });

    it('should detect YAML', () => {
      expect(detectLanguage('file.yaml')).toBe('yaml');
      expect(detectLanguage('file.yml')).toBe('yaml');
    });

    it('should return unknown for unsupported extensions', () => {
      expect(detectLanguage('file.xyz')).toBe('unknown');
    });

    it('should handle file without extension', () => {
      expect(detectLanguage('Makefile')).toBe('unknown');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      analyzeCode
  // ═══════════════════════════════════════════════════════════════

  describe('analyzeCode', () => {
    it('should count lines', () => {
      const code = `line1
line2
line3`;
      const result = analyzeCode(code, 'javascript');

      expect(result.lines).toBe(3);
    });

    it('should count JavaScript functions', () => {
      const code = `function foo() {}
const bar = () => {};
let baz = async () => {};
var qux = function() {};`;
      const result = analyzeCode(code, 'javascript');

      expect(result.functions).toBeGreaterThanOrEqual(3);
    });

    it('should count Python functions', () => {
      const code = `def foo():
    pass
def bar(x, y):
    return x + y`;
      const result = analyzeCode(code, 'python');

      expect(result.functions).toBe(2);
    });

    it('should count classes', () => {
      const code = `class Foo {}
export class Bar {}
abstract class Baz {}`;
      const result = analyzeCode(code, 'typescript');

      expect(result.classes).toBe(3);
    });

    it('should count Python classes', () => {
      const code = `class Foo:
    pass
class Bar:
    pass`;
      const result = analyzeCode(code, 'python');

      expect(result.classes).toBe(2);
    });

    it('should count imports', () => {
      const code = `import fs from 'fs';
import { join } from 'path';
from os import path`;
      const result = analyzeCode(code, 'javascript');

      expect(result.imports).toBe(3);
    });

    it('should count exports', () => {
      const code = `export function foo() {}
export const bar = 1;
export default class Baz {}`;
      const result = analyzeCode(code, 'typescript');

      expect(result.exports).toBe(3);
    });

    it('should count comments', () => {
      const code = `// Comment 1
# Comment 2
/* Comment 3 */
* Comment 4`;
      const result = analyzeCode(code, 'javascript');

      expect(result.comments).toBe(4);
    });

    it('should detect low complexity', () => {
      const code = `function foo() {
  return 1;
}`;
      const result = analyzeCode(code, 'javascript');

      expect(result.complexity).toBe('low');
    });

    it('should detect medium complexity', () => {
      // Create code with ~15 functions
      const functions = Array(15).fill('function fn() {}').join('\n');
      const result = analyzeCode(functions, 'javascript');

      expect(result.complexity).toBe('medium');
    });

    it('should detect high complexity', () => {
      // Create code with many functions or long file
      const functions = Array(25).fill('function fn() {}').join('\n');
      const result = analyzeCode(functions, 'javascript');

      expect(result.complexity).toBe('high');
    });

    it('should return language in result', () => {
      const result = analyzeCode('code', 'python');

      expect(result.language).toBe('python');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      containsEmoji
  // ═══════════════════════════════════════════════════════════════

  describe('containsEmoji', () => {
    it('should detect emoji', () => {
      expect(containsEmoji('Hello 😀')).toBe(true);
      expect(containsEmoji('Test 🎉')).toBe(true);
      expect(containsEmoji('Code 🚀')).toBe(true);
    });

    it('should return false for no emoji', () => {
      expect(containsEmoji('Hello World')).toBe(false);
      expect(containsEmoji('const x = 1;')).toBe(false);
    });

    it('should detect various emoji types', () => {
      expect(containsEmoji('🌟')).toBe(true); // Weather/nature
      expect(containsEmoji('✅')).toBe(true); // Symbols
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      containsProblematicUnicode
  // ═══════════════════════════════════════════════════════════════

  describe('containsProblematicUnicode', () => {
    it('should detect non-breaking space', () => {
      expect(containsProblematicUnicode('Hello\u00A0World')).toBe(true);
    });

    it('should detect zero-width space', () => {
      expect(containsProblematicUnicode('Hello\u200BWorld')).toBe(true);
    });

    it('should detect ideographic space', () => {
      expect(containsProblematicUnicode('Hello\u3000World')).toBe(true);
    });

    it('should return false for normal text', () => {
      expect(containsProblematicUnicode('Hello World')).toBe(false);
      expect(containsProblematicUnicode('const x = 1;')).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      findEmptyCatchBlocks
  // ═══════════════════════════════════════════════════════════════

  describe('findEmptyCatchBlocks', () => {
    it('should find single-line empty catch', () => {
      const code = `try { foo(); } catch (e) { }`;
      const results = findEmptyCatchBlocks(code);

      expect(results).toHaveLength(1);
      expect(results[0].line).toBe(1);
    });

    it('should find multi-line empty catch', () => {
      const code = `try {
  foo();
} catch (e) {
}`;
      const results = findEmptyCatchBlocks(code);

      expect(results).toHaveLength(1);
    });

    it('should return empty for non-empty catch', () => {
      const code = `try {
  foo();
} catch (e) {
  console.error(e);
}`;
      const results = findEmptyCatchBlocks(code);

      expect(results).toHaveLength(0);
    });

    it('should find multiple empty catches', () => {
      const code = `try { a(); } catch (e) { }
try { b(); } catch (e) { }`;
      const results = findEmptyCatchBlocks(code);

      expect(results).toHaveLength(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      findCommentedCode
  // ═══════════════════════════════════════════════════════════════

  describe('findCommentedCode', () => {
    it('should find commented code blocks', () => {
      const code = `const x = 1;
// const y = 2;
// return y * 2;
// console.log(y);
const z = 3;`;
      const results = findCommentedCode(code);

      expect(results).toHaveLength(1);
      expect(results[0].startLine).toBe(2);
    });

    it('should not flag short comments', () => {
      const code = `// TODO: fix this
// Another comment
const x = 1;`;
      const results = findCommentedCode(code);

      expect(results).toHaveLength(0);
    });

    it('should return empty for regular comments', () => {
      const code = `// This is a description
// of the function below
function foo() {}`;
      const results = findCommentedCode(code);

      expect(results).toHaveLength(0);
    });

    it('should detect code-like patterns', () => {
      const code = `// if (condition) {
// doSomething();
// }
const x = 1;`;
      const results = findCommentedCode(code);

      expect(results).toHaveLength(1);
    });
  });
});
