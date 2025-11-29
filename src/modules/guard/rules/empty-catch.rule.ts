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

    // Also check for Promise.catch with empty handler
    const promiseCatches = this.findPromiseCatches(code, filename);
    issues.push(...promiseCatches);

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
