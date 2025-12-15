// tests/unit/mixed-concerns-rule.test.ts
// MixedConcernsRule Unit Tests

// Using vitest globals
import { MixedConcernsRule } from '../../src/modules/guard/rules/mixed-concerns.rule.js';

describe('MixedConcernsRule', () => {
  const rule = new MixedConcernsRule();

  describe('basic properties', () => {
    it('has correct name', () => {
      expect(rule.name).toBe('mixed-concerns');
    });

    it('is enabled by default', () => {
      expect(rule.enabled).toBe(true);
    });

    it('has category quality', () => {
      expect(rule.category).toBe('quality');
    });

    it('has description', () => {
      expect(rule.description).toBeDefined();
      expect(rule.description.length).toBeGreaterThan(0);
    });
  });

  describe('file type detection', () => {
    it('ignores plain TypeScript files', () => {
      const code = '<style>body { color: red; }</style>';
      const issues = rule.validate(code, 'utils.ts');

      // Not a React file, so <style> tag is not flagged
      expect(issues).toEqual([]);
    });

    it('ignores plain JavaScript files', () => {
      const code = 'document.getElementById("test")';
      const issues = rule.validate(code, 'helper.js');

      // DOM manipulation only flagged in React files
      expect(issues).toEqual([]);
    });

    it('checks .tsx files', () => {
      const code = '<style>body { color: red; }</style>';
      const issues = rule.validate(code, 'Component.tsx');

      expect(issues.length).toBeGreaterThan(0);
    });

    it('checks .jsx files', () => {
      const code = '<style>body { color: red; }</style>';
      const issues = rule.validate(code, 'Component.jsx');

      expect(issues.length).toBeGreaterThan(0);
    });

    it('checks .html files', () => {
      const longScript = 'a'.repeat(150);
      const code = `<html><script>${longScript}</script></html>`;
      const issues = rule.validate(code, 'page.html');

      expect(issues.length).toBeGreaterThan(0);
    });

    it('checks .htm files', () => {
      const longScript = 'a'.repeat(150);
      const code = `<html><script>${longScript}</script></html>`;
      const issues = rule.validate(code, 'page.htm');

      expect(issues.length).toBeGreaterThan(0);
    });

    it('checks .vue files', () => {
      const longStyle = 'a'.repeat(1200);
      const code = `<template></template><style>${longStyle}</style>`;
      const issues = rule.validate(code, 'Component.vue');

      expect(issues.length).toBeGreaterThan(0);
    });

    it('checks .svelte files', () => {
      const longScript = 'a'.repeat(1600);
      const code = `<script>${longScript}</script>`;
      const issues = rule.validate(code, 'Component.svelte');

      expect(issues.length).toBeGreaterThan(0);
    });

    it('handles case-insensitive extensions', () => {
      const code = '<style>body { color: red; }</style>';
      const issues = rule.validate(code, 'Component.TSX');

      expect(issues.length).toBeGreaterThan(0);
    });
  });

  describe('React mixed concerns', () => {
    it('warns about <style> tags in React files', () => {
      const code = `
        const Component = () => (
          <div>
            <style>
              .container { background: red; }
            </style>
            <div className="container">Hello</div>
          </div>
        );
      `;
      const issues = rule.validate(code, 'Component.tsx');

      expect(issues.some(i => i.message.includes('<style> tag'))).toBe(true);
      expect(issues.some(i => i.severity === 'warning')).toBe(true);
    });

    it('suggests CSS modules or styled-components', () => {
      const code = '<style>.test { color: red; }</style>';
      const issues = rule.validate(code, 'Component.tsx');

      expect(issues.some(i => i.suggestion?.includes('CSS modules') || i.suggestion?.includes('styled-components'))).toBe(true);
    });

    it('ignores small CSS in template literals', () => {
      // CSS template literal less than 200 chars
      const code = `const styles = \`color: red; background: blue;\`;`;
      const issues = rule.validate(code, 'Component.tsx');

      // Should not flag small CSS
      const cssIssues = issues.filter(i => i.message.includes('CSS string'));
      expect(cssIssues.length).toBe(0);
    });

    it('warns about createGlobalStyle with large content', () => {
      const longCss = 'a'.repeat(600);
      const code = `const GlobalStyles = createGlobalStyle\`${longCss}\`;`;
      const issues = rule.validate(code, 'GlobalStyles.tsx');

      expect(issues.some(i => i.message.includes('createGlobalStyle'))).toBe(true);
      expect(issues.some(i => i.severity === 'info')).toBe(true);
    });
  });

  describe('HTML mixed concerns', () => {
    it('warns about large inline scripts', () => {
      const longScript = 'console.log("test");'.repeat(10); // > 100 chars
      const code = `
        <html>
          <head></head>
          <body>
            <script>${longScript}</script>
          </body>
        </html>
      `;
      const issues = rule.validate(code, 'page.html');

      expect(issues.some(i => i.message.includes('Inline script'))).toBe(true);
      expect(issues.some(i => i.suggestion?.includes('external .js file'))).toBe(true);
    });

    it('ignores external script tags', () => {
      const code = `
        <html>
          <script src="app.js"></script>
        </html>
      `;
      const issues = rule.validate(code, 'page.html');

      // External scripts are fine
      const scriptIssues = issues.filter(i => i.message.includes('Inline script'));
      expect(scriptIssues.length).toBe(0);
    });

    it('ignores small inline scripts', () => {
      const code = `
        <html>
          <script>console.log("hi");</script>
        </html>
      `;
      const issues = rule.validate(code, 'page.html');

      const scriptIssues = issues.filter(i => i.message.includes('Inline script'));
      expect(scriptIssues.length).toBe(0);
    });

    it('warns about large inline styles', () => {
      const longCss = '.rule { color: red; }'.repeat(20); // > 200 chars
      const code = `
        <html>
          <head>
            <style>${longCss}</style>
          </head>
        </html>
      `;
      const issues = rule.validate(code, 'page.html');

      expect(issues.some(i => i.message.includes('Inline style block'))).toBe(true);
      expect(issues.some(i => i.suggestion?.includes('external .css file'))).toBe(true);
    });

    it('ignores small inline styles', () => {
      const code = `
        <html>
          <style>body { margin: 0; }</style>
        </html>
      `;
      const issues = rule.validate(code, 'page.html');

      const styleIssues = issues.filter(i => i.message.includes('Inline style block'));
      expect(styleIssues.length).toBe(0);
    });
  });

  describe('Vue/Svelte mixed concerns', () => {
    it('warns about excessively large style section', () => {
      const longStyle = '.rule { color: red; }'.repeat(100); // > 1000 chars
      const code = `
        <template><div></div></template>
        <script>export default {}</script>
        <style>${longStyle}</style>
      `;
      const issues = rule.validate(code, 'Component.vue');

      expect(issues.some(i => i.message.includes('Style section'))).toBe(true);
      expect(issues.some(i => i.severity === 'info')).toBe(true);
    });

    it('warns about excessively large script section', () => {
      const longScript = 'const x = 1;'.repeat(200); // > 1500 chars
      const code = `
        <template><div></div></template>
        <script>${longScript}</script>
        <style>.test {}</style>
      `;
      const issues = rule.validate(code, 'Component.vue');

      expect(issues.some(i => i.message.includes('Script section'))).toBe(true);
      expect(issues.some(i => i.suggestion?.includes('composables'))).toBe(true);
    });

    it('ignores reasonably sized SFC sections', () => {
      const code = `
        <template><div>Hello</div></template>
        <script>export default { name: 'Test' }</script>
        <style>.test { color: red; }</style>
      `;
      const issues = rule.validate(code, 'Component.vue');

      const sfcIssues = issues.filter(i =>
        i.message.includes('Style section') || i.message.includes('Script section')
      );
      expect(sfcIssues.length).toBe(0);
    });

    it('works with Svelte files', () => {
      const longScript = 'let x = 1;'.repeat(200);
      const code = `
        <script>${longScript}</script>
        <div>Hello</div>
      `;
      const issues = rule.validate(code, 'Component.svelte');

      expect(issues.some(i => i.message.includes('Script section'))).toBe(true);
    });
  });

  describe('DOM manipulation checks', () => {
    it('warns about document.getElementById in React', () => {
      const code = `
        const Component = () => {
          useEffect(() => {
            document.getElementById('myDiv').focus();
          }, []);
          return <div id="myDiv" />;
        };
      `;
      const issues = rule.validate(code, 'Component.tsx');

      expect(issues.some(i => i.message.includes('getElementById'))).toBe(true);
      expect(issues.some(i => i.suggestion?.includes('useRef'))).toBe(true);
    });

    it('warns about document.querySelector in React', () => {
      const code = `
        const Component = () => {
          document.querySelector('.test');
          return <div className="test" />;
        };
      `;
      const issues = rule.validate(code, 'Component.jsx');

      expect(issues.some(i => i.message.includes('querySelector'))).toBe(true);
    });

    it('warns about document.getElementsBy* in React', () => {
      const code = `
        const Component = () => {
          document.getElementsByClassName('test');
          return <div />;
        };
      `;
      const issues = rule.validate(code, 'Component.tsx');

      expect(issues.some(i => i.message.includes('getElementsBy'))).toBe(true);
    });

    it('warns about classList manipulation in React', () => {
      const code = `
        const Component = () => {
          ref.current.classList.add('active');
          return <div />;
        };
      `;
      const issues = rule.validate(code, 'Component.tsx');

      expect(issues.some(i => i.message.includes('classList'))).toBe(true);
    });

    it('warns about setAttribute in React', () => {
      const code = `
        const Component = () => {
          element.setAttribute('data-test', 'value');
          return <div />;
        };
      `;
      const issues = rule.validate(code, 'Component.tsx');

      expect(issues.some(i => i.message.includes('setAttribute'))).toBe(true);
    });

    it('warns about direct style manipulation in React', () => {
      const code = `
        const Component = () => {
          element.style.display = 'none';
          return <div />;
        };
      `;
      const issues = rule.validate(code, 'Component.tsx');

      expect(issues.some(i => i.message.includes('style manipulation'))).toBe(true);
    });

    it('ignores DOM manipulation in non-React files', () => {
      const code = `
        document.getElementById('test');
        document.querySelector('.class');
      `;
      const issues = rule.validate(code, 'script.js');

      const domIssues = issues.filter(i =>
        i.message.includes('getElementById') || i.message.includes('querySelector')
      );
      expect(domIssues.length).toBe(0);
    });

    it('counts multiple DOM manipulation usages', () => {
      const code = `
        const Component = () => {
          document.getElementById('a');
          document.getElementById('b');
          document.getElementById('c');
          return <div />;
        };
      `;
      const issues = rule.validate(code, 'Component.tsx');

      expect(issues.some(i => i.message.includes('3 usage'))).toBe(true);
    });
  });

  describe('innerHTML checks', () => {
    it('warns about innerHTML usage with many occurrences', () => {
      const code = `
        element.innerHTML = '<p>1</p>';
        element.innerHTML = '<p>2</p>';
        element.innerHTML = '<p>3</p>';
        element.innerHTML = '<p>4</p>';
      `;
      const issues = rule.validate(code, 'script.ts');

      expect(issues.some(i => i.message.includes('innerHTML'))).toBe(true);
      expect(issues.some(i => i.severity === 'error')).toBe(true);
    });

    it('warns about outerHTML usage', () => {
      const code = `
        element.outerHTML = '<div>1</div>';
        element.outerHTML = '<div>2</div>';
        element.outerHTML = '<div>3</div>';
      `;
      const issues = rule.validate(code, 'script.ts');

      expect(issues.some(i => i.message.includes('outerHTML'))).toBe(true);
    });

    it('warns about dangerouslySetInnerHTML in React', () => {
      const code = `
        <div dangerouslySetInnerHTML={{ __html: content1 }} />
        <div dangerouslySetInnerHTML={{ __html: content2 }} />
        <div dangerouslySetInnerHTML={{ __html: content3 }} />
      `;
      const issues = rule.validate(code, 'Component.tsx');

      expect(issues.some(i => i.message.includes('dangerouslySetInnerHTML'))).toBe(true);
      expect(issues.some(i => i.severity === 'warning')).toBe(true);
    });

    it('warns about v-html in Vue', () => {
      const code = `
        <template>
          <div v-html="content1"></div>
          <div v-html="content2"></div>
          <div v-html="content3"></div>
        </template>
      `;
      const issues = rule.validate(code, 'Component.vue');

      expect(issues.some(i => i.message.includes('v-html'))).toBe(true);
    });

    it('warns about {@html} in Svelte', () => {
      const code = `
        {@html content1}
        {@html content2}
        {@html content3}
      `;
      const issues = rule.validate(code, 'Component.svelte');

      expect(issues.some(i => i.message.includes('{@html}'))).toBe(true);
    });

    it('ignores few innerHTML usages (under threshold)', () => {
      const code = `
        element.innerHTML = '<p>1</p>';
        element.innerHTML = '<p>2</p>';
      `;
      const issues = rule.validate(code, 'script.ts');

      const innerHtmlIssues = issues.filter(i => i.message.includes('innerHTML'));
      expect(innerHtmlIssues.length).toBe(0);
    });

    it('suggests creating components instead of HTML strings', () => {
      const code = `
        el.innerHTML = '<p>1</p>';
        el.innerHTML = '<p>2</p>';
        el.innerHTML = '<p>3</p>';
      `;
      const issues = rule.validate(code, 'script.ts');

      expect(issues.some(i => i.suggestion?.includes('component'))).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles empty code', () => {
      const issues = rule.validate('', 'Component.tsx');
      expect(issues).toEqual([]);
    });

    it('handles code with only whitespace', () => {
      const issues = rule.validate('   \n\n   ', 'Component.tsx');
      expect(issues).toEqual([]);
    });

    it('handles malformed HTML', () => {
      const code = '<style>.test { color: red; }'; // Missing close tag
      // Should not crash
      const issues = rule.validate(code, 'Component.tsx');
      expect(issues).toBeDefined();
    });

    it('handles multiple issues in same file', () => {
      const longScript = 'a'.repeat(200);
      const code = `
        <style>.test {}</style>
        <script>${longScript}</script>
        document.getElementById('test');
        element.innerHTML = '<p>1</p>';
        element.innerHTML = '<p>2</p>';
        element.innerHTML = '<p>3</p>';
      `;
      const issues = rule.validate(code, 'Component.tsx');

      // Should have multiple different issues
      expect(issues.length).toBeGreaterThan(1);
    });

    it('provides correct line numbers', () => {
      const code = `line1
line2
<style>.test {}</style>
line4`;
      const issues = rule.validate(code, 'Component.tsx');

      if (issues.length > 0) {
        expect(issues[0].location.line).toBe(3);
      }
    });

    it('provides code snippets', () => {
      const code = '<style>.test { color: red; }</style>';
      const issues = rule.validate(code, 'Component.tsx');

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].location.snippet).toBeDefined();
      expect(issues[0].location.snippet.length).toBeGreaterThan(0);
    });

    it('truncates long snippets', () => {
      const longLine = 'a'.repeat(200);
      const code = `<style>${longLine}</style>`;
      const issues = rule.validate(code, 'Component.tsx');

      if (issues.length > 0 && issues[0].location.snippet) {
        expect(issues[0].location.snippet.length).toBeLessThanOrEqual(83); // 80 + '...'
      }
    });
  });

  describe('issue properties', () => {
    it('includes rule name in all issues', () => {
      const code = '<style>.test {}</style>';
      const issues = rule.validate(code, 'Component.tsx');

      for (const issue of issues) {
        expect(issue.rule).toBe('mixed-concerns');
      }
    });

    it('sets autoFixable to false', () => {
      const code = '<style>.test {}</style>';
      const issues = rule.validate(code, 'Component.tsx');

      for (const issue of issues) {
        expect(issue.autoFixable).toBe(false);
      }
    });

    it('includes file in location', () => {
      const code = '<style>.test {}</style>';
      const issues = rule.validate(code, 'MyComponent.tsx');

      for (const issue of issues) {
        expect(issue.location.file).toBe('MyComponent.tsx');
      }
    });
  });
});
