// src/modules/guard/rules/empty-catch.rule.ts

import { ValidationIssue } from '../../../core/types.js';
import { IGuardRule, RuleCategory } from '../guard.types.js';

// ═══════════════════════════════════════════════════════════════
//                      EMPTY CATCH RULE
// ═══════════════════════════════════════════════════════════════

/**
 * Detects empty catch blocks that swallow exceptions silently.
 * Empty catch blocks hide errors and make debugging difficult.
 */
export class EmptyCatchRule implements IGuardRule {
  name = 'empty-catch';
  enabled = true;
  description = 'Detects empty catch blocks that swallow exceptions';
  category: RuleCategory = 'quality';

  // Patterns that indicate proper error handling
  private validHandlingPatterns = [
    /console\.\w+\(/,           // console.log, console.error, etc.
    /logger\.\w+\(/,            // logger.error, etc.
    /log\.\w+\(/,               // log.error, etc.
    /throw\s+/,                 // re-throwing
    /return\s+/,                // returning a value
    /reject\s*\(/,              // Promise rejection
    /notify|alert|report/i,     // notification/reporting
    /emit\s*\(/,                // event emission
    /dispatch\s*\(/,            // action dispatch
    /setState\s*\(/,            // React state update
    /\w+Error\s*\(/,            // Custom error handling
    /captureException/,         // Sentry-style error capture
    /trackError/,               // Error tracking
    /handleError/,              // Error handler call
  ];

  // Comments that indicate intentional empty catch
  private intentionalPatterns = [
    /\/\/\s*(?:intentional|expected|ignore|suppress|ok|safe)/i,
    /\/\/\s*(?:error is expected|this is fine|fallback)/i,
    /\/\*.*(?:intentional|expected|ignore).*\*\//i,
  ];

  validate(code: string, filename: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Method 1: Find catch blocks with brace matching
    const catchBlocks = this.findCatchBlocks(code);

    for (const block of catchBlocks) {
      const isEmpty = this.isCatchEmpty(block.content);
      const isIntentional = this.isIntentionallyEmpty(block.content, block.context);

      if (isEmpty && !isIntentional) {
        issues.push({
          rule: this.name,
          severity: 'error',
          message: 'Empty catch block swallows exception silently',
          location: {
            file: filename,
            line: block.line,
            endLine: block.endLine,
            snippet: block.snippet,
          },
          suggestion: 'Log the error, re-throw it, or add a comment explaining why it\'s ignored',
          autoFixable: false,
        });
      }
    }

    // Method 2: Quick regex scan for common patterns
    const quickScanIssues = this.quickScanEmptyCatch(code, filename);

    // Merge issues, avoiding duplicates on same line
    const existingLines = new Set(issues.map(i => i.location?.line));
    for (const issue of quickScanIssues) {
      if (!existingLines.has(issue.location?.line)) {
        issues.push(issue);
      }
    }

    // Also check for Promise.catch with empty handler
    const promiseCatches = this.findPromiseCatches(code, filename);
    issues.push(...promiseCatches);

    return issues;
  }

  /**
   * Quick regex scan for obvious empty catch patterns
   */
  private quickScanEmptyCatch(code: string, filename: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = lines[i + 1] || '';
      const nextNextLine = lines[i + 2] || '';

      // Pattern 1: catch (e) { } on same line
      if (/catch\s*\([^)]*\)\s*{\s*}/.test(line)) {
        issues.push({
          rule: this.name,
          severity: 'error',
          message: 'Empty catch block swallows exception silently',
          location: { file: filename, line: i + 1, snippet: line.trim() },
          suggestion: 'Log the error or handle it appropriately',
          autoFixable: false,
        });
        continue;
      }

      // Pattern 2: catch (e) { // comment only }
      if (/catch\s*\([^)]*\)\s*{\s*$/.test(line)) {
        // Check if next lines only contain comments until closing brace
        let j = i + 1;
        let onlyComments = true;
        let foundCloseBrace = false;

        while (j < lines.length && j < i + 10) {
          const checkLine = lines[j].trim();

          if (checkLine === '}') {
            foundCloseBrace = true;
            break;
          }

          // Check if line has actual code (not just comments)
          const withoutComments = checkLine
            .replace(/\/\/.*$/, '')
            .replace(/\/\*.*?\*\//g, '')
            .trim();

          if (withoutComments && withoutComments !== '}') {
            // Check if it's actual error handling
            const hasHandling = this.validHandlingPatterns.some(p => p.test(checkLine));
            if (hasHandling) {
              onlyComments = false;
              break;
            }
          }
          j++;
        }

        if (foundCloseBrace && onlyComments) {
          // Check if intentional
          const blockContent = lines.slice(i, j + 1).join('\n');
          if (!this.isIntentionallyEmpty(blockContent, lines[i - 1] || '')) {
            issues.push({
              rule: this.name,
              severity: 'error',
              message: 'Catch block only contains comments - exception is swallowed',
              location: {
                file: filename,
                line: i + 1,
                endLine: j + 1,
                snippet: line.trim()
              },
              suggestion: 'Add proper error handling or at least log the error',
              autoFixable: false,
            });
          }
        }
      }
    }

    return issues;
  }

  // ═══════════════════════════════════════════════════════════════
  //                      PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════

  private findCatchBlocks(code: string): Array<{
    content: string;
    context: string;
    line: number;
    endLine: number;
    snippet: string;
  }> {
    const blocks: Array<{
      content: string;
      context: string;
      line: number;
      endLine: number;
      snippet: string;
    }> = [];
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Match catch block start
      const catchMatch = line.match(/catch\s*\(\s*(\w+)?\s*\)\s*{?/);
      if (catchMatch) {
        const startLine = i + 1;
        let braceCount = 0;
        let started = false;
        let endLine = startLine;
        let content = '';
        let context = i > 0 ? lines[i - 1] : '';

        // Find the catch block content
        for (let j = i; j < lines.length; j++) {
          const currentLine = lines[j];

          for (const char of currentLine) {
            if (char === '{') {
              braceCount++;
              started = true;
            } else if (char === '}') {
              braceCount--;
            }
          }

          if (started) {
            content += currentLine + '\n';
          }

          if (started && braceCount === 0) {
            endLine = j + 1;
            break;
          }
        }

        // Extract just the catch block body (between { and })
        const bodyMatch = content.match(/{\s*([\s\S]*?)\s*}/);
        const body = bodyMatch ? bodyMatch[1] : content;

        blocks.push({
          content: body.trim(),
          context,
          line: startLine,
          endLine,
          snippet: line.trim().slice(0, 60),
        });
      }
    }

    return blocks;
  }

  private isCatchEmpty(content: string): boolean {
    // Remove comments
    const withoutComments = content
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .trim();

    // If nothing left, it's empty
    if (withoutComments === '') {
      return true;
    }

    // Check if it only contains whitespace or the error variable
    if (/^(\s*_?\s*)?$/.test(withoutComments)) {
      return true;
    }

    // Check for valid handling patterns
    for (const pattern of this.validHandlingPatterns) {
      if (pattern.test(content)) {
        return false;
      }
    }

    // If there's actual code, not empty
    if (withoutComments.length > 0) {
      // But check if it's just a variable reference (like just `e` or `error`)
      if (/^\s*\w+\s*;?\s*$/.test(withoutComments)) {
        return true;
      }
      return false;
    }

    return true;
  }

  private isIntentionallyEmpty(content: string, context: string): boolean {
    const fullText = context + '\n' + content;

    for (const pattern of this.intentionalPatterns) {
      if (pattern.test(fullText)) {
        return true;
      }
    }

    return false;
  }

  private findPromiseCatches(code: string, filename: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Match .catch(() => {}) or .catch(e => {}) with empty body
      const emptyArrowMatch = line.match(/\.catch\s*\(\s*(?:\w+|\(\w*\))?\s*=>\s*{\s*}\s*\)/);
      if (emptyArrowMatch) {
        issues.push({
          rule: this.name,
          severity: 'error',
          message: 'Promise .catch() with empty handler swallows errors',
          location: {
            file: filename,
            line: i + 1,
            snippet: line.trim().slice(0, 60),
          },
          suggestion: 'Handle the error or at least log it',
          autoFixable: false,
        });
        continue;
      }

      // Match .catch(() => undefined) or .catch(() => null)
      const nullReturnMatch = line.match(/\.catch\s*\(\s*(?:\w+|\(\w*\))?\s*=>\s*(?:undefined|null|void\s*0)\s*\)/);
      if (nullReturnMatch) {
        issues.push({
          rule: this.name,
          severity: 'warning',
          message: 'Promise .catch() that silently returns null/undefined',
          location: {
            file: filename,
            line: i + 1,
            snippet: line.trim().slice(0, 60),
          },
          suggestion: 'Consider logging the error before returning',
          autoFixable: false,
        });
      }
    }

    return issues;
  }
}
