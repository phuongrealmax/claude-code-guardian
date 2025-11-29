// src/modules/guard/rules/emoji-code.rule.ts

import { ValidationIssue } from '../../../core/types.js';
import { IGuardRule, RuleCategory } from '../guard.types.js';

// ═══════════════════════════════════════════════════════════════
//                      EMOJI CODE RULE
// ═══════════════════════════════════════════════════════════════

/**
 * Detects emoji characters in source code.
 * Emoji in code can cause encoding issues, IDE problems,
 * and reduce code readability.
 */
export class EmojiCodeRule implements IGuardRule {
  name = 'emoji-code';
  enabled = true;
  description = 'Detects emoji characters in source code';
  category: RuleCategory = 'convention';

  // Regex to match emoji characters
  // This covers most common emoji ranges in Unicode
  private emojiPattern = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{231A}-\u{231B}]|[\u{23E9}-\u{23F3}]|[\u{23F8}-\u{23FA}]|[\u{25AA}-\u{25AB}]|[\u{25B6}]|[\u{25C0}]|[\u{25FB}-\u{25FE}]|[\u{2614}-\u{2615}]|[\u{2648}-\u{2653}]|[\u{267F}]|[\u{2693}]|[\u{26A1}]|[\u{26AA}-\u{26AB}]|[\u{26BD}-\u{26BE}]|[\u{26C4}-\u{26C5}]|[\u{26CE}]|[\u{26D4}]|[\u{26EA}]|[\u{26F2}-\u{26F3}]|[\u{26F5}]|[\u{26FA}]|[\u{26FD}]|[\u{2702}]|[\u{2705}]|[\u{2708}-\u{270D}]|[\u{270F}]|[\u{2712}]|[\u{2714}]|[\u{2716}]|[\u{271D}]|[\u{2721}]|[\u{2728}]|[\u{2733}-\u{2734}]|[\u{2744}]|[\u{2747}]|[\u{274C}]|[\u{274E}]|[\u{2753}-\u{2755}]|[\u{2757}]|[\u{2763}-\u{2764}]|[\u{2795}-\u{2797}]|[\u{27A1}]|[\u{27B0}]|[\u{27BF}]|[\u{2934}-\u{2935}]|[\u{2B05}-\u{2B07}]|[\u{2B1B}-\u{2B1C}]|[\u{2B50}]|[\u{2B55}]|[\u{3030}]|[\u{303D}]|[\u{3297}]|[\u{3299}]/gu;

  // File types where emoji might be acceptable
  private allowedExtensions = [
    '.md',
    '.markdown',
    '.txt',
    '.json',  // in data files
    '.yaml',
    '.yml',
  ];

  // Contexts where emoji are allowed
  private allowedContexts = [
    /^\s*\/\//,           // Single line comments
    /^\s*\/\*/,           // Block comment start
    /^\s*\*/,             // Block comment continuation
    /^\s*#/,              // Hash comments (Python, shell, etc.)
    /console\.\w+\s*\(/,  // Console output
    /log\.\w+\s*\(/,      // Logger output
    /['"`].*['"`]/,       // Strings (will be checked separately)
  ];

  validate(code: string, filename: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Skip allowed file types
    if (this.isAllowedFileType(filename)) {
      return issues;
    }

    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const emojis = this.findEmojis(line);

      if (emojis.length > 0) {
        const context = this.getLineContext(line);

        // Check if it's in an allowed context
        if (context === 'string') {
          // Emoji in strings - warning level
          issues.push({
            rule: this.name,
            severity: 'warning',
            message: `Emoji found in string: ${emojis.join(' ')}`,
            location: {
              file: filename,
              line: i + 1,
              snippet: line.trim().slice(0, 80),
            },
            suggestion: 'Consider using ASCII text or escape sequences instead of emoji',
            autoFixable: false,
          });
        } else if (context === 'comment') {
          // Emoji in comments - info level (less critical)
          issues.push({
            rule: this.name,
            severity: 'info',
            message: `Emoji found in comment: ${emojis.join(' ')}`,
            location: {
              file: filename,
              line: i + 1,
              snippet: line.trim().slice(0, 80),
            },
            suggestion: 'Emoji in comments may cause display issues in some editors',
            autoFixable: false,
          });
        } else {
          // Emoji in code - error level
          issues.push({
            rule: this.name,
            severity: 'error',
            message: `Emoji in code: ${emojis.join(' ')} - can cause encoding issues`,
            location: {
              file: filename,
              line: i + 1,
              snippet: line.trim().slice(0, 80),
            },
            suggestion: 'Remove emoji from code. Use ASCII characters only.',
            autoFixable: true,
          });
        }
      }
    }

    // Check for emoji in variable/function names (very bad)
    const identifierEmojis = this.findEmojiInIdentifiers(code, filename);
    issues.push(...identifierEmojis);

    return issues;
  }

  // ═══════════════════════════════════════════════════════════════
  //                      PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════

  private isAllowedFileType(filename: string): boolean {
    return this.allowedExtensions.some(ext =>
      filename.toLowerCase().endsWith(ext)
    );
  }

  private findEmojis(text: string): string[] {
    const matches = text.match(this.emojiPattern);
    return matches ? [...new Set(matches)] : [];
  }

  private getLineContext(line: string): 'code' | 'string' | 'comment' {
    const trimmed = line.trim();

    // Check if line is a comment
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') ||
        trimmed.startsWith('*') || trimmed.startsWith('#')) {
      return 'comment';
    }

    // Check if emoji appears to be inside a string
    // This is a simplified check - a proper AST would be better
    const stringPattern = /(['"`]).*[\u{1F300}-\u{1FAFF}].*\1/gu;
    if (stringPattern.test(line)) {
      return 'string';
    }

    return 'code';
  }

  private findEmojiInIdentifiers(code: string, filename: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const lines = code.split('\n');

    // Patterns for identifier declarations
    const identifierPatterns = [
      /(?:const|let|var)\s+(\S+)\s*=/,
      /function\s+(\S+)\s*\(/,
      /class\s+(\S+)/,
      /(?:async\s+)?(\S+)\s*\([^)]*\)\s*{/,
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const pattern of identifierPatterns) {
        const match = line.match(pattern);
        if (match && match[1]) {
          const identifier = match[1];
          const emojis = this.findEmojis(identifier);

          if (emojis.length > 0) {
            issues.push({
              rule: this.name,
              severity: 'block',
              message: `Emoji in identifier name "${identifier}" - this will cause serious issues`,
              location: {
                file: filename,
                line: i + 1,
                snippet: line.trim().slice(0, 80),
              },
              suggestion: 'Use only ASCII alphanumeric characters and underscores in identifiers',
              autoFixable: false,
            });
          }
        }
      }
    }

    return issues;
  }
}
