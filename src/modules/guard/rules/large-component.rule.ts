// src/modules/guard/rules/large-component.rule.ts

import { ValidationIssue } from '../../../core/types.js';
import { IGuardRule, RuleCategory } from '../guard.types.js';

// ═══════════════════════════════════════════════════════════════
//                      LARGE COMPONENT RULE
// ═══════════════════════════════════════════════════════════════

/**
 * Detects component files that are too large and should be split.
 * Large components are harder to maintain, test, and understand.
 *
 * Thresholds:
 * - > 300 lines: warning
 * - > 500 lines: error (strongly recommend splitting)
 * - > 800 lines: block (component is too large)
 */
export class LargeComponentRule implements IGuardRule {
  name = 'large-component';
  enabled = true;
  description = 'Detects component files that are too large and should be split';
  category: RuleCategory = 'quality';

  // Configurable thresholds
  private readonly warningThreshold = 300;
  private readonly errorThreshold = 500;
  private readonly blockThreshold = 800;

  // Component file extensions
  private readonly componentExtensions = [
    '.tsx',      // React TypeScript
    '.jsx',      // React JavaScript
    '.vue',      // Vue.js
    '.svelte',   // Svelte
    '.component.ts',   // Angular
    '.component.js',   // Angular JS
  ];

  validate(code: string, filename: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Only check component files
    if (!this.isComponentFile(filename)) {
      return issues;
    }

    const lines = code.split('\n');
    const lineCount = lines.length;

    // Check against thresholds
    if (lineCount > this.blockThreshold) {
      issues.push({
        rule: this.name,
        severity: 'block',
        message: `Component has ${lineCount} lines (max: ${this.blockThreshold}). This is too large and must be split.`,
        location: {
          file: filename,
          line: 1,
          snippet: this.getFirstLines(lines, 3),
        },
        suggestion: this.generateSuggestion(lineCount, code),
        autoFixable: false,
      });
    } else if (lineCount > this.errorThreshold) {
      issues.push({
        rule: this.name,
        severity: 'error',
        message: `Component has ${lineCount} lines (recommended max: ${this.errorThreshold}). Strongly recommend splitting.`,
        location: {
          file: filename,
          line: 1,
          snippet: this.getFirstLines(lines, 3),
        },
        suggestion: this.generateSuggestion(lineCount, code),
        autoFixable: false,
      });
    } else if (lineCount > this.warningThreshold) {
      issues.push({
        rule: this.name,
        severity: 'warning',
        message: `Component has ${lineCount} lines (threshold: ${this.warningThreshold}). Consider splitting into smaller components.`,
        location: {
          file: filename,
          line: 1,
          snippet: this.getFirstLines(lines, 3),
        },
        suggestion: this.generateSuggestion(lineCount, code),
        autoFixable: false,
      });
    }

    return issues;
  }

  // ═══════════════════════════════════════════════════════════════
  //                      PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════

  private isComponentFile(filename: string): boolean {
    const lowerFilename = filename.toLowerCase();
    return this.componentExtensions.some(ext =>
      lowerFilename.endsWith(ext)
    );
  }

  private getFirstLines(lines: string[], count: number): string {
    return lines.slice(0, count).join('\n');
  }

  private generateSuggestion(lineCount: number, code: string): string {
    const suggestions: string[] = [];

    // Analyze code to provide specific suggestions
    const hasMultipleComponents = this.countComponents(code);
    const hasLongFunctions = this.hasLongFunctions(code);
    const hasInlineStyles = /style\s*=\s*\{\s*\{/.test(code);
    const hasComplexState = this.countStateHooks(code);
    const hasMultipleUseEffects = this.countUseEffects(code);

    if (hasMultipleComponents > 1) {
      suggestions.push(`Extract ${hasMultipleComponents - 1} sub-component(s) into separate files`);
    }

    if (hasLongFunctions > 0) {
      suggestions.push(`Extract ${hasLongFunctions} long function(s) into custom hooks or utilities`);
    }

    if (hasInlineStyles) {
      suggestions.push('Move inline styles to CSS modules or styled-components');
    }

    if (hasComplexState > 3) {
      suggestions.push(`Consider using useReducer or a state management library (found ${hasComplexState} useState hooks)`);
    }

    if (hasMultipleUseEffects > 3) {
      suggestions.push(`Extract ${hasMultipleUseEffects} useEffect hooks into custom hooks`);
    }

    if (suggestions.length === 0) {
      suggestions.push('Break down into smaller, focused components');
      suggestions.push('Extract reusable logic into custom hooks');
      suggestions.push('Move utility functions to separate files');
    }

    return suggestions.join('. ') + '.';
  }

  private countComponents(code: string): number {
    // Count function/class components
    const functionComponents = (code.match(/(?:function|const)\s+[A-Z][a-zA-Z]*\s*(?:=\s*)?\([^)]*\)\s*(?::\s*[^{]+)?\s*(?:=>)?\s*\{?/g) || []).length;
    const classComponents = (code.match(/class\s+[A-Z][a-zA-Z]*\s+extends\s+(?:React\.)?(?:Component|PureComponent)/g) || []).length;
    return functionComponents + classComponents;
  }

  private hasLongFunctions(code: string): number {
    // Simple heuristic: count functions > 50 lines
    const functionMatches = code.match(/(?:function|const\s+\w+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>|(?:async\s+)?(?:function|\w+)\s*\([^)]*\)\s*\{)/g) || [];
    let longFunctions = 0;

    // This is a simplified check - in reality we'd need proper parsing
    const lines = code.split('\n');
    let inFunction = false;
    let functionLines = 0;
    let braceCount = 0;

    for (const line of lines) {
      if (line.match(/(?:function|=>|^\s*\w+\s*\([^)]*\)\s*\{)/)) {
        inFunction = true;
        functionLines = 0;
        braceCount = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      }

      if (inFunction) {
        functionLines++;
        braceCount += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;

        if (braceCount <= 0) {
          if (functionLines > 50) {
            longFunctions++;
          }
          inFunction = false;
        }
      }
    }

    return longFunctions;
  }

  private countStateHooks(code: string): number {
    return (code.match(/useState\s*[<(]/g) || []).length;
  }

  private countUseEffects(code: string): number {
    return (code.match(/useEffect\s*\(/g) || []).length;
  }
}
