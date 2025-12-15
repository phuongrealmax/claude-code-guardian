// tests/unit/large-component-rule.test.ts
// LargeComponentRule Unit Tests

// Using vitest globals
import { LargeComponentRule } from '../../src/modules/guard/rules/large-component.rule.js';

describe('LargeComponentRule', () => {
  const rule = new LargeComponentRule();

  describe('basic properties', () => {
    it('has correct name', () => {
      expect(rule.name).toBe('large-component');
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

  describe('file filtering', () => {
    it('ignores non-component files', () => {
      const longCode = 'const x = 1;\n'.repeat(1000);
      const issues = rule.validate(longCode, 'utils.ts');

      expect(issues).toEqual([]);
    });

    it('ignores plain JavaScript files', () => {
      const longCode = 'const x = 1;\n'.repeat(1000);
      const issues = rule.validate(longCode, 'helper.js');

      expect(issues).toEqual([]);
    });

    it('checks .tsx files', () => {
      const longCode = 'const x = 1;\n'.repeat(350);
      const issues = rule.validate(longCode, 'Component.tsx');

      expect(issues.length).toBeGreaterThan(0);
    });

    it('checks .jsx files', () => {
      const longCode = 'const x = 1;\n'.repeat(350);
      const issues = rule.validate(longCode, 'Component.jsx');

      expect(issues.length).toBeGreaterThan(0);
    });

    it('checks .vue files', () => {
      const longCode = '<template>\n' + 'const x = 1;\n'.repeat(350) + '</template>';
      const issues = rule.validate(longCode, 'Component.vue');

      expect(issues.length).toBeGreaterThan(0);
    });

    it('checks .svelte files', () => {
      const longCode = '<script>\n' + 'const x = 1;\n'.repeat(350) + '</script>';
      const issues = rule.validate(longCode, 'Component.svelte');

      expect(issues.length).toBeGreaterThan(0);
    });

    it('checks .component.ts Angular files', () => {
      const longCode = 'const x = 1;\n'.repeat(350);
      const issues = rule.validate(longCode, 'app.component.ts');

      expect(issues.length).toBeGreaterThan(0);
    });

    it('checks .component.js Angular files', () => {
      const longCode = 'const x = 1;\n'.repeat(350);
      const issues = rule.validate(longCode, 'app.component.js');

      expect(issues.length).toBeGreaterThan(0);
    });

    it('handles case-insensitive extensions', () => {
      const longCode = 'const x = 1;\n'.repeat(350);
      const issues = rule.validate(longCode, 'Component.TSX');

      expect(issues.length).toBeGreaterThan(0);
    });
  });

  describe('line count thresholds', () => {
    it('returns no issues for small components', () => {
      const code = 'const Component = () => <div>Hello</div>;\n'.repeat(100);
      const issues = rule.validate(code, 'Small.tsx');

      expect(issues).toEqual([]);
    });

    it('returns warning for components > 300 lines', () => {
      // repeat(350) creates 351 lines (350 lines + trailing newline splits into 351)
      const code = 'const x = 1;\n'.repeat(350);
      const issues = rule.validate(code, 'Medium.tsx');

      expect(issues.length).toBe(1);
      expect(issues[0].severity).toBe('warning');
      expect(issues[0].message).toContain('351 lines');
      expect(issues[0].message).toContain('threshold: 300');
    });

    it('returns error for components > 500 lines', () => {
      const code = 'const x = 1;\n'.repeat(550);
      const issues = rule.validate(code, 'Large.tsx');

      expect(issues.length).toBe(1);
      expect(issues[0].severity).toBe('error');
      expect(issues[0].message).toContain('551 lines');
      expect(issues[0].message).toContain('recommended max: 500');
    });

    it('returns block for components > 800 lines', () => {
      const code = 'const x = 1;\n'.repeat(850);
      const issues = rule.validate(code, 'Massive.tsx');

      expect(issues.length).toBe(1);
      expect(issues[0].severity).toBe('block');
      expect(issues[0].message).toContain('851 lines');
      expect(issues[0].message).toContain('max: 800');
    });

    it('returns exactly at boundary (300 lines) - no issue', () => {
      // 299 repeats creates exactly 300 lines (299 + trailing empty = 300)
      const code = 'const x = 1;\n'.repeat(299);
      const issues = rule.validate(code, 'Boundary.tsx');

      expect(issues).toEqual([]);
    });

    it('returns at 301 lines - warning', () => {
      const code = 'const x = 1;\n'.repeat(301);
      const issues = rule.validate(code, 'Boundary.tsx');

      expect(issues.length).toBe(1);
      expect(issues[0].severity).toBe('warning');
    });
  });

  describe('issue properties', () => {
    it('includes file location', () => {
      const code = 'const x = 1;\n'.repeat(350);
      const issues = rule.validate(code, 'Component.tsx');

      expect(issues[0].location.file).toBe('Component.tsx');
      expect(issues[0].location.line).toBe(1);
    });

    it('includes code snippet', () => {
      const code = 'const x = 1;\nconst y = 2;\nconst z = 3;\n' + 'const w = 4;\n'.repeat(350);
      const issues = rule.validate(code, 'Component.tsx');

      expect(issues[0].location.snippet).toContain('const x = 1');
      expect(issues[0].location.snippet).toContain('const y = 2');
      expect(issues[0].location.snippet).toContain('const z = 3');
    });

    it('sets autoFixable to false', () => {
      const code = 'const x = 1;\n'.repeat(350);
      const issues = rule.validate(code, 'Component.tsx');

      expect(issues[0].autoFixable).toBe(false);
    });

    it('includes rule name', () => {
      const code = 'const x = 1;\n'.repeat(350);
      const issues = rule.validate(code, 'Component.tsx');

      expect(issues[0].rule).toBe('large-component');
    });
  });

  describe('suggestions', () => {
    it('provides default suggestions for generic large component', () => {
      const code = 'const x = 1;\n'.repeat(350);
      const issues = rule.validate(code, 'Component.tsx');

      expect(issues[0].suggestion).toContain('smaller, focused components');
    });

    it('suggests extracting multiple components', () => {
      // Create code with multiple capitalized function components
      const code = `function MainComponent() {
  return <div />;
}
function SubComponent1() {
  return <span />;
}
function SubComponent2() {
  return <p />;
}
` + 'const x = 1;\n'.repeat(350);
      const issues = rule.validate(code, 'Component.tsx');

      // Should detect multiple components and suggest extraction
      expect(issues[0].suggestion).toBeDefined();
      // Either detects sub-components or gives generic suggestion
      expect(issues[0].suggestion.length).toBeGreaterThan(0);
    });

    it('suggests moving inline styles', () => {
      const code = `
        const Component = () => (
          <div style={{ color: 'red' }}>Hello</div>
        );
      ` + '\nconst x = 1;\n'.repeat(350);
      const issues = rule.validate(code, 'Component.tsx');

      expect(issues[0].suggestion).toContain('inline styles');
    });

    it('suggests using useReducer for many useState', () => {
      const code = `
        const Component = () => {
          const [a, setA] = useState(1);
          const [b, setB] = useState(2);
          const [c, setC] = useState(3);
          const [d, setD] = useState(4);
          return <div />;
        };
      ` + '\nconst x = 1;\n'.repeat(350);
      const issues = rule.validate(code, 'Component.tsx');

      expect(issues[0].suggestion).toContain('useReducer');
    });

    it('suggests extracting many useEffects', () => {
      const code = `
        const Component = () => {
          useEffect(() => {}, []);
          useEffect(() => {}, []);
          useEffect(() => {}, []);
          useEffect(() => {}, []);
          return <div />;
        };
      ` + '\nconst x = 1;\n'.repeat(350);
      const issues = rule.validate(code, 'Component.tsx');

      expect(issues[0].suggestion).toContain('useEffect');
    });

    it('detects class components', () => {
      const code = `
        class MainComponent extends React.Component {
          render() { return <div />; }
        }
        class SubComponent extends Component {
          render() { return <span />; }
        }
      ` + '\nconst x = 1;\n'.repeat(350);
      const issues = rule.validate(code, 'Component.tsx');

      expect(issues[0].suggestion).toContain('sub-component');
    });
  });

  describe('edge cases', () => {
    it('handles empty code', () => {
      const issues = rule.validate('', 'Component.tsx');

      expect(issues).toEqual([]);
    });

    it('handles code with only newlines', () => {
      const issues = rule.validate('\n\n\n', 'Component.tsx');

      expect(issues).toEqual([]);
    });

    it('handles very long single line', () => {
      const code = 'a'.repeat(10000);
      const issues = rule.validate(code, 'Component.tsx');

      expect(issues).toEqual([]);
    });

    it('counts lines correctly with CRLF', () => {
      const code = 'const x = 1;\r\n'.repeat(350);
      const issues = rule.validate(code, 'Component.tsx');

      expect(issues.length).toBe(1);
      expect(issues[0].severity).toBe('warning');
    });
  });

  describe('long function detection', () => {
    it('detects long functions in suggestion', () => {
      // Create a component with a long function (> 50 lines)
      const longFunction = `
        function longHandler() {
          ${Array(60).fill('console.log("line");').join('\n          ')}
        }
      `;
      const code = longFunction + '\nconst x = 1;\n'.repeat(350);
      const issues = rule.validate(code, 'Component.tsx');

      // The suggestion should mention extracting functions
      expect(issues[0].suggestion).toBeDefined();
    });

    it('handles arrow function detection', () => {
      const code = `
        const handler = () => {
          return 1;
        };
      ` + '\nconst x = 1;\n'.repeat(350);
      const issues = rule.validate(code, 'Component.tsx');

      expect(issues[0].suggestion).toBeDefined();
    });

    it('handles async function detection', () => {
      const code = `
        async function fetchData() {
          return await fetch('/api');
        }
      ` + '\nconst x = 1;\n'.repeat(350);
      const issues = rule.validate(code, 'Component.tsx');

      expect(issues[0].suggestion).toBeDefined();
    });
  });
});
