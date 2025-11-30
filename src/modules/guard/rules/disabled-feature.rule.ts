// src/modules/guard/rules/disabled-feature.rule.ts

import { ValidationIssue } from '../../../core/types.js';
import { IGuardRule, RuleCategory } from '../guard.types.js';

// ═══════════════════════════════════════════════════════════════
//                      DISABLED FEATURE RULE
// ═══════════════════════════════════════════════════════════════

/**
 * Detects code that has been disabled or commented out,
 * especially security-critical features.
 */
export class DisabledFeatureRule implements IGuardRule {
  name = 'disabled-feature';
  enabled = true;
  description = 'Detects disabled features and commented-out security code';
  category: RuleCategory = 'security';

  // Patterns that indicate disabled code
  private disabledPatterns: Array<{ pattern: RegExp; message: string }> = [
    {
      pattern: /\/\/\s*(?:TODO|FIXME|HACK|XXX):\s*(?:disabled|skip|temp|remove)/i,
      message: 'Code marked as temporarily disabled',
    },
    {
      pattern: /\/\/\s*(?:TODO|FIXME):\s*(?:re-?enable|uncomment|restore)/i,
      message: 'Code marked for re-enabling later',
    },
    {
      pattern: /if\s*\(\s*false\s*\)/,
      message: 'Code disabled with if(false)',
    },
    {
      pattern: /if\s*\(\s*0\s*\)/,
      message: 'Code disabled with if(0)',
    },
    {
      pattern: /return\s*;\s*\/\/.*(?:skip|disable|temp|todo)/i,
      message: 'Early return used to skip code temporarily',
    },
    {
      pattern: /\/\*\s*(?:DISABLED|SKIP|TEMP)/i,
      message: 'Block comment marking disabled code',
    },
    {
      pattern: /\/\/\s*(?:temporarily|temp)\s+(?:disabled|removed|commented)/i,
      message: 'Code temporarily disabled',
    },
  ];

  // Critical features that should never be disabled
  private criticalPatterns: Array<{ pattern: RegExp; category: string }> = [
    { pattern: /auth(?:enticate|orize|entication)?/i, category: 'authentication' },
    { pattern: /login|logout|signIn|signOut/i, category: 'authentication' },
    { pattern: /session|token/i, category: 'session management' },
    { pattern: /validate|verify|check/i, category: 'validation' },
    { pattern: /sanitize|escape|encode/i, category: 'input sanitization' },
    { pattern: /xss|csrf|sql|injection/i, category: 'security protection' },
    { pattern: /encrypt|decrypt|hash/i, category: 'cryptography' },
    { pattern: /permission|role|access/i, category: 'access control' },
    { pattern: /middleware|interceptor|guard/i, category: 'middleware' },
    { pattern: /rate.?limit|throttle/i, category: 'rate limiting' },
  ];

  validate(code: string, filename: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const lines = code.split('\n');

    // Check for disabled patterns
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const { pattern, message } of this.disabledPatterns) {
        if (pattern.test(line)) {
          const isCritical = this.isCriticalCode(line);

          issues.push({
            rule: this.name,
            severity: isCritical ? 'block' : 'warning',
            message: isCritical
              ? `CRITICAL: ${message} - affects security-sensitive code`
              : message,
            location: {
              file: filename,
              line: i + 1,
              snippet: line.trim().slice(0, 100),
            },
            suggestion: isCritical
              ? 'Do not disable security-critical features. Fix the underlying issue.'
              : 'Remove disabled code or properly implement the feature',
            autoFixable: false,
          });
        }
      }
    }

    // Check for empty functions with critical names
    const emptyFunctions = this.findEmptyFunctions(code, filename);
    issues.push(...emptyFunctions);

    // Check for large commented-out blocks
    const commentedBlocks = this.findLargeCommentedBlocks(code, filename);
    issues.push(...commentedBlocks);

    // Check for commented-out critical code (if/validation statements)
    const commentedCritical = this.findCommentedCriticalCode(code, filename);
    issues.push(...commentedCritical);

    return issues;
  }

  /**
   * Find commented-out code that contains critical validation logic
   */
  private findCommentedCriticalCode(code: string, filename: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const lines = code.split('\n');

    // Patterns for commented-out critical code
    const criticalCodePatterns = [
      { pattern: /\/\/\s*if\s*\(\s*!?\s*validate/i, message: 'Commented-out validation check' },
      { pattern: /\/\/\s*if\s*\(\s*!?\s*auth/i, message: 'Commented-out authentication check' },
      { pattern: /\/\/\s*if\s*\(\s*!?\s*check/i, message: 'Commented-out security check' },
      { pattern: /\/\/\s*if\s*\(\s*!?\s*verify/i, message: 'Commented-out verification check' },
      { pattern: /\/\/\s*if\s*\(\s*!?\s*isValid/i, message: 'Commented-out validity check' },
      { pattern: /\/\/\s*if\s*\(\s*!?\s*has(?:Permission|Access|Role)/i, message: 'Commented-out permission check' },
      { pattern: /\/\/\s*throw\s+(?:new\s+)?(?:Error|Exception)/i, message: 'Commented-out error throw' },
      { pattern: /\/\/\s*return\s+(?:false|null|undefined)\s*;?\s*\/\/.*(?:invalid|error|fail)/i, message: 'Commented-out error return' },
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const { pattern, message } of criticalCodePatterns) {
        if (pattern.test(line)) {
          // Check if next lines are also commented (part of same block)
          let endLine = i;
          for (let j = i + 1; j < lines.length && j < i + 5; j++) {
            if (lines[j].trim().startsWith('//')) {
              endLine = j;
            } else {
              break;
            }
          }

          const category = this.getCriticalCategory(line);
          issues.push({
            rule: this.name,
            severity: 'block',
            message: category
              ? `CRITICAL: ${message} - ${category} code has been commented out`
              : `CRITICAL: ${message}`,
            location: {
              file: filename,
              line: i + 1,
              endLine: endLine + 1,
              snippet: line.trim().slice(0, 100),
            },
            suggestion: 'Do not comment out security validation. Remove or fix the code properly.',
            autoFixable: false,
          });
          break; // Only report once per line
        }
      }
    }

    return issues;
  }

  // ═══════════════════════════════════════════════════════════════
  //                      PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════

  private isCriticalCode(text: string): boolean {
    return this.criticalPatterns.some(({ pattern }) => pattern.test(text));
  }

  private getCriticalCategory(text: string): string | undefined {
    for (const { pattern, category } of this.criticalPatterns) {
      if (pattern.test(text)) {
        return category;
      }
    }
    return undefined;
  }

  private findEmptyFunctions(code: string, filename: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const lines = code.split('\n');

    // Pattern for functions with empty or near-empty bodies
    const emptyPatterns = [
      // function name() { } or function name() { return; }
      /(?:export\s+)?(?:async\s+)?function\s+(\w+)[^{]*{\s*(?:return\s*;?)?\s*}/,
      // const name = () => { } or const name = async () => { }
      /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*(?::\s*\w+)?\s*=>\s*{\s*(?:return\s*;?)?\s*}/,
      // const name = () => undefined
      /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*(?:undefined|null|void\s*0)/,
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const pattern of emptyPatterns) {
        const match = line.match(pattern);
        if (match) {
          const funcName = match[1];
          const category = this.getCriticalCategory(funcName);

          if (category) {
            issues.push({
              rule: this.name,
              severity: 'block',
              message: `Critical ${category} function "${funcName}" has empty implementation`,
              location: {
                file: filename,
                line: i + 1,
                snippet: line.trim().slice(0, 100),
              },
              suggestion: 'Implement the function properly or throw NotImplementedError',
              autoFixable: false,
            });
          }
        }
      }
    }

    return issues;
  }

  private findLargeCommentedBlocks(code: string, filename: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const lines = code.split('\n');

    let inBlockComment = false;
    let blockStart = 0;
    let blockContent = '';
    let consecutiveLineComments = 0;
    let lineCommentStart = 0;
    let lineCommentContent = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Track multi-line comments
      if (line.startsWith('/*') && !line.includes('*/')) {
        inBlockComment = true;
        blockStart = i + 1;
        blockContent = line;
        continue;
      }

      if (inBlockComment) {
        blockContent += '\n' + line;
        if (line.includes('*/')) {
          inBlockComment = false;
          // Check if it's a large block (> 5 lines) with code-like content
          const lineCount = blockContent.split('\n').length;
          if (lineCount > 5 && this.looksLikeCode(blockContent)) {
            const category = this.getCriticalCategory(blockContent);
            issues.push({
              rule: this.name,
              severity: category ? 'block' : 'warning',
              message: category
                ? `Large block of ${category} code has been commented out`
                : 'Large block of code has been commented out',
              location: {
                file: filename,
                line: blockStart,
                endLine: i + 1,
                snippet: blockContent.slice(0, 100),
              },
              suggestion: 'Remove commented code or restore it properly',
              autoFixable: false,
            });
          }
          blockContent = '';
        }
        continue;
      }

      // Track consecutive line comments
      if (line.startsWith('//') && !line.startsWith('///')) {
        if (consecutiveLineComments === 0) {
          lineCommentStart = i + 1;
        }
        consecutiveLineComments++;
        lineCommentContent += line.slice(2) + '\n';
      } else {
        if (consecutiveLineComments >= 5 && this.looksLikeCode(lineCommentContent)) {
          const category = this.getCriticalCategory(lineCommentContent);
          issues.push({
            rule: this.name,
            severity: category ? 'error' : 'info',
            message: category
              ? `Commented-out code contains ${category} logic`
              : 'Multiple lines of code have been commented out',
            location: {
              file: filename,
              line: lineCommentStart,
              endLine: i,
              snippet: lineCommentContent.slice(0, 100),
            },
            suggestion: 'Remove commented code if no longer needed',
            autoFixable: false,
          });
        }
        consecutiveLineComments = 0;
        lineCommentContent = '';
      }
    }

    return issues;
  }

  private looksLikeCode(text: string): boolean {
    const codePatterns = [
      /function\s+\w+/,
      /const\s+\w+\s*=/,
      /let\s+\w+\s*=/,
      /if\s*\(/,
      /for\s*\(/,
      /while\s*\(/,
      /return\s+/,
      /=>/,
      /\.\w+\(/,
      /import\s+/,
      /export\s+/,
    ];

    return codePatterns.some(pattern => pattern.test(text));
  }
}
