// src/modules/guard/rules/fake-test.rule.ts

import { ValidationIssue, CodeLocation } from '../../../core/types.js';
import { IGuardRule, RuleCategory, TestAnalysis } from '../guard.types.js';

// ═══════════════════════════════════════════════════════════════
//                      FAKE TEST RULE
// ═══════════════════════════════════════════════════════════════

/**
 * Detects fake tests - tests that don't have any assertions.
 * A test without assertions doesn't actually verify anything.
 */
export class FakeTestRule implements IGuardRule {
  name = 'fake-test';
  enabled = true;
  description = 'Detects tests without assertions (fake tests)';
  category: RuleCategory = 'testing';

  // Patterns that indicate a real assertion
  private assertionPatterns = [
    /expect\s*\(/,
    /assert\s*[\.(]/,
    /\.toBe\(/,
    /\.toEqual\(/,
    /\.toMatch\(/,
    /\.toThrow\(/,
    /\.toHaveBeenCalled/,
    /\.toContain\(/,
    /\.toBeTruthy\(/,
    /\.toBeFalsy\(/,
    /\.toBeNull\(/,
    /\.toBeDefined\(/,
    /\.toBeUndefined\(/,
    /\.toBeGreaterThan\(/,
    /\.toBeLessThan\(/,
    /\.toHaveLength\(/,
    /\.toHaveProperty\(/,
    /\.rejects\./,
    /\.resolves\./,
    /should\./,
    /chai\./,
    /sinon\./,
    /\.verify\(/,
    /\.calledWith\(/,
  ];

  // Patterns that indicate a test function
  private testPatterns = [
    /(?:^|\s)it\s*\(\s*['"`]/,
    /(?:^|\s)test\s*\(\s*['"`]/,
    /it\.each/,
    /test\.each/,
  ];

  // Patterns for skipped tests
  private skipPatterns = [
    /it\.skip\s*\(/,
    /test\.skip\s*\(/,
    /xit\s*\(/,
    /xtest\s*\(/,
    /it\.todo\s*\(/,
    /test\.todo\s*\(/,
  ];

  validate(code: string, filename: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Only check test files
    if (!this.isTestFile(filename)) {
      return issues;
    }

    const testBlocks = this.findTestBlocks(code);

    for (const block of testBlocks) {
      // Skip if it's a skipped test
      if (block.isSkipped) {
        continue;
      }

      if (!this.hasAssertion(block.content)) {
        issues.push({
          rule: this.name,
          severity: 'block',
          message: `Test "${block.name}" has no assertions. This is a fake test that doesn't verify anything.`,
          location: {
            file: filename,
            line: block.startLine,
            endLine: block.endLine,
            snippet: this.getSnippet(block.content),
          },
          suggestion: 'Add expect() or assert() statements to verify the expected behavior',
          autoFixable: false,
        });
      }
    }

    // Check for test files with no tests
    if (testBlocks.length === 0 && this.looksLikeTestFile(code)) {
      issues.push({
        rule: this.name,
        severity: 'warning',
        message: 'This appears to be a test file but contains no test cases',
        location: { file: filename, line: 1 },
        suggestion: 'Add test cases using it() or test()',
        autoFixable: false,
      });
    }

    return issues;
  }

  /**
   * Analyze a test file for detailed statistics
   */
  analyzeTestFile(code: string): TestAnalysis {
    const testBlocks = this.findTestBlocks(code);
    let assertionCount = 0;
    const suspiciousTests: string[] = [];
    const skippedTests: string[] = [];

    for (const block of testBlocks) {
      if (block.isSkipped) {
        skippedTests.push(block.name);
        continue;
      }

      const blockAssertions = this.countAssertions(block.content);
      assertionCount += blockAssertions;

      if (blockAssertions === 0) {
        suspiciousTests.push(block.name);
      }
    }

    return {
      hasAssertions: assertionCount > 0,
      assertionCount,
      testCount: testBlocks.length,
      suspiciousTests,
      skippedTests,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //                      PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════

  private isTestFile(filename: string): boolean {
    return (
      /\.(test|spec)\.(ts|tsx|js|jsx|mjs)$/.test(filename) ||
      /__(tests?|spec)__/.test(filename) ||
      /\.test$/.test(filename)
    );
  }

  private looksLikeTestFile(code: string): boolean {
    return (
      /import.*(?:describe|it|test|expect)/.test(code) ||
      /require.*(?:jest|mocha|chai)/.test(code) ||
      /describe\s*\(/.test(code)
    );
  }

  private findTestBlocks(code: string): Array<{
    name: string;
    content: string;
    startLine: number;
    endLine: number;
    isSkipped: boolean;
  }> {
    const blocks: Array<{
      name: string;
      content: string;
      startLine: number;
      endLine: number;
      isSkipped: boolean;
    }> = [];
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for skipped tests
      let isSkipped = false;
      for (const pattern of this.skipPatterns) {
        if (pattern.test(line)) {
          isSkipped = true;
          break;
        }
      }

      // Match it() or test()
      const match = line.match(/(?:it|test)(?:\.skip|\.todo)?\s*\(\s*['"`]([^'"`]+)['"`]/);
      if (match) {
        const name = match[1];
        const startLine = i + 1;

        // Find the end of the test block using brace counting
        let braceCount = 0;
        let started = false;
        let endLine = startLine;
        let content = '';

        for (let j = i; j < lines.length; j++) {
          content += lines[j] + '\n';

          for (const char of lines[j]) {
            if (char === '{') {
              braceCount++;
              started = true;
            } else if (char === '}') {
              braceCount--;
            }
          }

          if (started && braceCount === 0) {
            endLine = j + 1;
            break;
          }
        }

        blocks.push({ name, content, startLine, endLine, isSkipped });
      }
    }

    return blocks;
  }

  private hasAssertion(code: string): boolean {
    return this.assertionPatterns.some(pattern => pattern.test(code));
  }

  private countAssertions(code: string): number {
    let count = 0;
    for (const pattern of this.assertionPatterns) {
      const matches = code.match(new RegExp(pattern.source, 'g'));
      if (matches) {
        count += matches.length;
      }
    }
    return count;
  }

  private getSnippet(content: string): string {
    const firstLine = content.split('\n')[0];
    return firstLine.length > 80 ? firstLine.slice(0, 80) + '...' : firstLine;
  }
}
