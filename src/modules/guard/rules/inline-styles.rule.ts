// src/modules/guard/rules/inline-styles.rule.ts

import { ValidationIssue } from '../../../core/types.js';
import { IGuardRule, RuleCategory } from '../guard.types.js';

// ═══════════════════════════════════════════════════════════════
//                      INLINE STYLES RULE
// ═══════════════════════════════════════════════════════════════

/**
 * Detects excessive inline styles that should be extracted to CSS.
 * Inline styles make code harder to maintain and prevent style reuse.
 *
 * Checks for:
 * - style={{ ... }} with > 100 chars (React)
 * - style="..." with > 100 chars (HTML/Vue)
 * - :style="{ ... }" with > 100 chars (Vue)
 * - Multiple inline styles in same file (> 5 occurrences)
 */
export class InlineStylesRule implements IGuardRule {
  name = 'excessive-inline-styles';
  enabled = true;
  description = 'Detects excessive inline styles that should be extracted to CSS';
  category: RuleCategory = 'quality';

  // Thresholds
  private readonly charThreshold = 100;       // Single style > 100 chars
  private readonly countThreshold = 5;        // > 5 inline styles in file
  private readonly totalCharsThreshold = 500; // Total inline style chars > 500

  // File extensions to check
  private readonly targetExtensions = [
    '.tsx', '.jsx',     // React
    '.vue',             // Vue
    '.svelte',          // Svelte
    '.html', '.htm',    // HTML
  ];

  validate(code: string, filename: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Only check relevant file types
    if (!this.isTargetFile(filename)) {
      return issues;
    }

    const lines = code.split('\n');
    const inlineStyles = this.findAllInlineStyles(code, lines);

    // Check individual styles
    for (const style of inlineStyles) {
      if (style.length > this.charThreshold) {
        issues.push({
          rule: this.name,
          severity: 'warning',
          message: `Inline style has ${style.length} chars (threshold: ${this.charThreshold}). Extract to CSS.`,
          location: {
            file: filename,
            line: style.line,
            snippet: style.snippet,
          },
          suggestion: this.getSuggestion(filename, style.type),
          autoFixable: false,
        });
      }
    }

    // Check total count
    if (inlineStyles.length > this.countThreshold) {
      issues.push({
        rule: this.name,
        severity: 'warning',
        message: `File has ${inlineStyles.length} inline styles (threshold: ${this.countThreshold}). Consider extracting to a stylesheet.`,
        location: {
          file: filename,
          line: 1,
          snippet: lines[0],
        },
        suggestion: 'Create a CSS module or styled-components file to centralize styles.',
        autoFixable: false,
      });
    }

    // Check total chars
    const totalChars = inlineStyles.reduce((sum, s) => sum + s.length, 0);
    if (totalChars > this.totalCharsThreshold) {
      issues.push({
        rule: this.name,
        severity: 'error',
        message: `Total inline style chars: ${totalChars} (threshold: ${this.totalCharsThreshold}). Styles should be in separate file.`,
        location: {
          file: filename,
          line: 1,
          snippet: lines[0],
        },
        suggestion: 'Extract all inline styles to CSS modules, styled-components, or Tailwind classes.',
        autoFixable: false,
      });
    }

    return issues;
  }

  // ═══════════════════════════════════════════════════════════════
  //                      PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════

  private isTargetFile(filename: string): boolean {
    const lowerFilename = filename.toLowerCase();
    return this.targetExtensions.some(ext =>
      lowerFilename.endsWith(ext)
    );
  }

  private findAllInlineStyles(code: string, lines: string[]): Array<{
    line: number;
    length: number;
    snippet: string;
    type: 'react' | 'vue' | 'html';
  }> {
    const results: Array<{
      line: number;
      length: number;
      snippet: string;
      type: 'react' | 'vue' | 'html';
    }> = [];

    // Track position in code for line number calculation
    let currentPos = 0;

    // Pattern 1: React style={{ ... }}
    const reactPattern = /style\s*=\s*\{\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}\s*\}/g;
    let match;

    while ((match = reactPattern.exec(code)) !== null) {
      const styleContent = match[1];
      const line = this.getLineNumber(code, match.index);
      results.push({
        line,
        length: styleContent.length,
        snippet: this.getSnippet(lines, line),
        type: 'react',
      });
    }

    // Pattern 2: Vue :style="{ ... }" or v-bind:style="{ ... }"
    const vuePattern = /(?::|v-bind:)style\s*=\s*["']\s*\{([^}]+)\}\s*["']/g;
    while ((match = vuePattern.exec(code)) !== null) {
      const styleContent = match[1];
      const line = this.getLineNumber(code, match.index);
      results.push({
        line,
        length: styleContent.length,
        snippet: this.getSnippet(lines, line),
        type: 'vue',
      });
    }

    // Pattern 3: HTML style="..."
    const htmlPattern = /style\s*=\s*["']([^"']+)["']/g;
    while ((match = htmlPattern.exec(code)) !== null) {
      // Skip if it's a React/Vue style (already captured)
      const beforeMatch = code.substring(Math.max(0, match.index - 5), match.index);
      if (beforeMatch.includes('{{') || beforeMatch.includes(':') || beforeMatch.includes('v-bind')) {
        continue;
      }

      const styleContent = match[1];
      const line = this.getLineNumber(code, match.index);
      results.push({
        line,
        length: styleContent.length,
        snippet: this.getSnippet(lines, line),
        type: 'html',
      });
    }

    return results;
  }

  private getLineNumber(code: string, index: number): number {
    return code.substring(0, index).split('\n').length;
  }

  private getSnippet(lines: string[], lineNumber: number): string {
    const line = lines[lineNumber - 1] || '';
    return line.trim().slice(0, 80) + (line.length > 80 ? '...' : '');
  }

  private getSuggestion(filename: string, styleType: 'react' | 'vue' | 'html'): string {
    const isReact = filename.endsWith('.tsx') || filename.endsWith('.jsx');
    const isVue = filename.endsWith('.vue');

    if (isReact) {
      return 'Use CSS modules (import styles from "./Component.module.css"), styled-components, or Tailwind classes instead.';
    }

    if (isVue) {
      return 'Move styles to the <style> section of the SFC, or use scoped CSS.';
    }

    return 'Extract styles to an external CSS file or use utility classes (e.g., Tailwind).';
  }
}
