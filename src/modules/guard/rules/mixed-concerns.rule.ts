// src/modules/guard/rules/mixed-concerns.rule.ts

import { ValidationIssue } from '../../../core/types.js';
import { IGuardRule, RuleCategory } from '../guard.types.js';

// ═══════════════════════════════════════════════════════════════
//                      MIXED CONCERNS RULE
// ═══════════════════════════════════════════════════════════════

/**
 * Detects files with mixed concerns (HTML/CSS/JS all in one).
 * While some frameworks (Vue, Svelte) intentionally combine these,
 * this rule flags excessive mixing that hurts maintainability.
 *
 * Checks for:
 * - <style> tags inside .tsx/.jsx files (not recommended)
 * - <script> tags with complex logic inside HTML
 * - CSS in template literals > 200 chars
 * - Direct DOM manipulation in React components
 * - Excessive string HTML (innerHTML patterns)
 */
export class MixedConcernsRule implements IGuardRule {
  name = 'mixed-concerns';
  enabled = true;
  description = 'Detects mixed HTML/CSS/JS patterns that hurt maintainability';
  category: RuleCategory = 'quality';

  // Thresholds
  private readonly cssInJsThreshold = 200;        // CSS in JS > 200 chars
  private readonly inlineScriptThreshold = 100;   // Script in HTML > 100 chars
  private readonly innerHtmlCount = 3;            // > 3 innerHTML usages

  validate(code: string, filename: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const lines = code.split('\n');

    // Different checks for different file types
    const isReact = this.isReactFile(filename);
    const isHtml = this.isHtmlFile(filename);
    const isVueSvelte = this.isVueSvelteFile(filename);

    if (isReact) {
      issues.push(...this.checkReactMixedConcerns(code, lines, filename));
    }

    if (isHtml) {
      issues.push(...this.checkHtmlMixedConcerns(code, lines, filename));
    }

    // For Vue/Svelte, we're more lenient since they're designed for SFCs
    // but still check for extreme cases
    if (isVueSvelte) {
      issues.push(...this.checkSfcMixedConcerns(code, lines, filename));
    }

    // Universal checks
    issues.push(...this.checkDomManipulation(code, lines, filename));
    issues.push(...this.checkInnerHtml(code, lines, filename));

    return issues;
  }

  // ═══════════════════════════════════════════════════════════════
  //                      FILE TYPE CHECKS
  // ═══════════════════════════════════════════════════════════════

  private isReactFile(filename: string): boolean {
    const lower = filename.toLowerCase();
    return lower.endsWith('.tsx') || lower.endsWith('.jsx');
  }

  private isHtmlFile(filename: string): boolean {
    const lower = filename.toLowerCase();
    return lower.endsWith('.html') || lower.endsWith('.htm');
  }

  private isVueSvelteFile(filename: string): boolean {
    const lower = filename.toLowerCase();
    return lower.endsWith('.vue') || lower.endsWith('.svelte');
  }

  // ═══════════════════════════════════════════════════════════════
  //                      REACT CHECKS
  // ═══════════════════════════════════════════════════════════════

  private checkReactMixedConcerns(code: string, lines: string[], filename: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check for <style> tags in React files
    const styleTagMatch = code.match(/<style[^>]*>[\s\S]*?<\/style>/gi);
    if (styleTagMatch) {
      const line = this.getLineNumber(code, code.indexOf(styleTagMatch[0]));
      issues.push({
        rule: this.name,
        severity: 'warning',
        message: 'Found <style> tag in React file. Use CSS modules or styled-components instead.',
        location: {
          file: filename,
          line,
          snippet: this.getSnippet(lines, line),
        },
        suggestion: 'Import styles from a .css/.scss file, use CSS modules, or styled-components.',
        autoFixable: false,
      });
    }

    // Check for CSS in template literals (styled-components is fine, but raw CSS strings are not)
    const cssTemplateLiteralPattern = /(?<!styled\.[a-z]+)(?<!css)`[^`]*(?:background|color|margin|padding|display|flex|grid|position|width|height|border)[^`]{200,}`/gi;
    const cssMatches = code.match(cssTemplateLiteralPattern);
    if (cssMatches) {
      for (const match of cssMatches) {
        const index = code.indexOf(match);
        const line = this.getLineNumber(code, index);
        issues.push({
          rule: this.name,
          severity: 'warning',
          message: `Large CSS string (${match.length} chars) found in template literal. Consider extracting to stylesheet.`,
          location: {
            file: filename,
            line,
            snippet: this.getSnippet(lines, line),
          },
          suggestion: 'Use styled-components, CSS modules, or external stylesheets for large style blocks.',
          autoFixable: false,
        });
      }
    }

    // Check for createGlobalStyle with very long content
    const globalStylePattern = /createGlobalStyle`[\s\S]{500,}?`/g;
    if (globalStylePattern.test(code)) {
      issues.push({
        rule: this.name,
        severity: 'info',
        message: 'Large createGlobalStyle block found. Consider moving to a separate GlobalStyles component.',
        location: {
          file: filename,
          line: 1,
          snippet: lines[0],
        },
        suggestion: 'Create a dedicated GlobalStyles.ts file for global styles.',
        autoFixable: false,
      });
    }

    return issues;
  }

  // ═══════════════════════════════════════════════════════════════
  //                      HTML CHECKS
  // ═══════════════════════════════════════════════════════════════

  private checkHtmlMixedConcerns(code: string, lines: string[], filename: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check for large inline <script> tags
    const scriptPattern = /<script[^>]*>([^<]*(?:<(?!\/script>)[^<]*)*)<\/script>/gi;
    let match;

    while ((match = scriptPattern.exec(code)) !== null) {
      const scriptContent = match[1].trim();

      // Skip empty scripts and external script tags
      if (!scriptContent || match[0].includes('src=')) {
        continue;
      }

      if (scriptContent.length > this.inlineScriptThreshold) {
        const line = this.getLineNumber(code, match.index);
        issues.push({
          rule: this.name,
          severity: 'warning',
          message: `Inline script has ${scriptContent.length} chars (threshold: ${this.inlineScriptThreshold}). Extract to external .js file.`,
          location: {
            file: filename,
            line,
            snippet: this.getSnippet(lines, line),
          },
          suggestion: 'Move JavaScript to an external .js file and import with <script src="...">.',
          autoFixable: false,
        });
      }
    }

    // Check for large inline <style> tags
    const inlineStylePattern = /<style[^>]*>([^<]*(?:<(?!\/style>)[^<]*)*)<\/style>/gi;
    while ((match = inlineStylePattern.exec(code)) !== null) {
      const styleContent = match[1].trim();

      if (styleContent.length > this.cssInJsThreshold) {
        const line = this.getLineNumber(code, match.index);
        issues.push({
          rule: this.name,
          severity: 'warning',
          message: `Inline style block has ${styleContent.length} chars. Extract to external .css file.`,
          location: {
            file: filename,
            line,
            snippet: this.getSnippet(lines, line),
          },
          suggestion: 'Move styles to an external .css file and link with <link rel="stylesheet">.',
          autoFixable: false,
        });
      }
    }

    return issues;
  }

  // ═══════════════════════════════════════════════════════════════
  //                      VUE/SVELTE CHECKS
  // ═══════════════════════════════════════════════════════════════

  private checkSfcMixedConcerns(code: string, lines: string[], filename: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // For Vue/Svelte, check if <style> section is excessively large
    const styleMatch = code.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    if (styleMatch && styleMatch[1].length > 1000) {
      issues.push({
        rule: this.name,
        severity: 'info',
        message: `Style section has ${styleMatch[1].length} chars. Consider extracting complex styles.`,
        location: {
          file: filename,
          line: this.getLineNumber(code, styleMatch.index || 0),
          snippet: '<style>...',
        },
        suggestion: 'Extract shared styles to a separate SCSS file and import, keeping only component-specific styles in SFC.',
        autoFixable: false,
      });
    }

    // Check if <script> section is excessively large
    const scriptMatch = code.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    if (scriptMatch && scriptMatch[1].length > 1500) {
      issues.push({
        rule: this.name,
        severity: 'info',
        message: `Script section has ${scriptMatch[1].length} chars. Consider extracting logic to composables/utilities.`,
        location: {
          file: filename,
          line: this.getLineNumber(code, scriptMatch.index || 0),
          snippet: '<script>...',
        },
        suggestion: 'Extract complex logic to composables (Vue) or stores (Svelte) for better reusability.',
        autoFixable: false,
      });
    }

    return issues;
  }

  // ═══════════════════════════════════════════════════════════════
  //                      UNIVERSAL CHECKS
  // ═══════════════════════════════════════════════════════════════

  private checkDomManipulation(code: string, lines: string[], filename: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Skip if not a React file (DOM manipulation is expected in vanilla JS)
    if (!this.isReactFile(filename)) {
      return issues;
    }

    // Check for direct DOM manipulation in React
    const domPatterns = [
      { pattern: /document\.getElementById/g, name: 'getElementById' },
      { pattern: /document\.querySelector/g, name: 'querySelector' },
      { pattern: /document\.getElementsBy/g, name: 'getElementsBy*' },
      { pattern: /\.classList\./g, name: 'classList manipulation' },
      { pattern: /\.setAttribute\(/g, name: 'setAttribute' },
      { pattern: /\.style\s*\./g, name: 'direct style manipulation' },
    ];

    for (const { pattern, name } of domPatterns) {
      const matches = code.match(pattern);
      if (matches && matches.length > 0) {
        const firstMatch = pattern.exec(code);
        const line = firstMatch ? this.getLineNumber(code, firstMatch.index) : 1;

        issues.push({
          rule: this.name,
          severity: 'warning',
          message: `Found ${matches.length} usage(s) of ${name} in React file. Use React refs or state instead.`,
          location: {
            file: filename,
            line,
            snippet: this.getSnippet(lines, line),
          },
          suggestion: 'Use useRef() for DOM access, or manage via React state/props. Direct DOM manipulation bypasses React.',
          autoFixable: false,
        });
      }
      // Reset regex lastIndex
      pattern.lastIndex = 0;
    }

    return issues;
  }

  private checkInnerHtml(code: string, lines: string[], filename: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check for innerHTML/dangerouslySetInnerHTML usage
    const innerHtmlPatterns = [
      { pattern: /\.innerHTML\s*=/g, name: 'innerHTML', severity: 'error' as const },
      { pattern: /\.outerHTML\s*=/g, name: 'outerHTML', severity: 'error' as const },
      { pattern: /dangerouslySetInnerHTML/g, name: 'dangerouslySetInnerHTML', severity: 'warning' as const },
      { pattern: /v-html\s*=/g, name: 'v-html', severity: 'warning' as const },
      { pattern: /\{@html\s/g, name: '{@html}', severity: 'warning' as const },
    ];

    for (const { pattern, name, severity } of innerHtmlPatterns) {
      const matches = code.match(pattern);
      if (matches && matches.length >= this.innerHtmlCount) {
        issues.push({
          rule: this.name,
          severity,
          message: `Found ${matches.length} usages of ${name}. This is a potential XSS risk and mixes concerns.`,
          location: {
            file: filename,
            line: 1,
            snippet: lines[0],
          },
          suggestion: `Minimize ${name} usage. Consider creating proper components instead of injecting HTML strings.`,
          autoFixable: false,
        });
      }
      pattern.lastIndex = 0;
    }

    return issues;
  }

  // ═══════════════════════════════════════════════════════════════
  //                      HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  private getLineNumber(code: string, index: number): number {
    return code.substring(0, index).split('\n').length;
  }

  private getSnippet(lines: string[], lineNumber: number): string {
    const line = lines[lineNumber - 1] || '';
    return line.trim().slice(0, 80) + (line.length > 80 ? '...' : '');
  }
}
