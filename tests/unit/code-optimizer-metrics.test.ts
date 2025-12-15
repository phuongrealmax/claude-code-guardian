// tests/unit/code-optimizer-metrics.test.ts

// Using vitest globals
import { computeMetrics, quickComplexityCheck } from '../../src/modules/code-optimizer/metrics.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('code-optimizer/metrics', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `test-metrics-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // ═══════════════════════════════════════════════════════════════
  //                      computeMetrics
  // ═══════════════════════════════════════════════════════════════

  describe('computeMetrics', () => {
    it('should return empty results for empty input', async () => {
      const result = await computeMetrics({ files: [] }, testDir);

      expect(result.files).toHaveLength(0);
      expect(result.aggregate.totalFiles).toBe(0);
    });

    it('should skip non-existent files', async () => {
      const result = await computeMetrics({ files: ['nonexistent.ts'] }, testDir);

      expect(result.files).toHaveLength(0);
    });

    it('should compute metrics for a simple file', async () => {
      const code = `// Simple file
function hello() {
  console.log("Hello");
}
`;
      fs.writeFileSync(path.join(testDir, 'simple.ts'), code);

      const result = await computeMetrics({ files: ['simple.ts'] }, testDir);

      expect(result.files).toHaveLength(1);
      expect(result.files[0].lines).toBe(5);
      expect(result.files[0].commentLines).toBe(1);
    });

    it('should count code lines correctly', async () => {
      const code = `// Comment
function test() {
  const x = 1;
  return x;
}
// Another comment`;
      fs.writeFileSync(path.join(testDir, 'test.ts'), code);

      const result = await computeMetrics({ files: ['test.ts'] }, testDir);

      expect(result.files[0].codeLines).toBe(4);
      expect(result.files[0].commentLines).toBe(2);
      expect(result.files[0].blankLines).toBe(0);
    });

    it('should count TODOs and FIXMEs', async () => {
      const code = `// TODO: fix this
function broken() {
  // FIXME: urgent
  return null; // TODO: improve
}
`;
      fs.writeFileSync(path.join(testDir, 'todo.ts'), code);

      const result = await computeMetrics({ files: ['todo.ts'] }, testDir);

      expect(result.files[0].todoCount).toBe(2);
      expect(result.files[0].fixmeCount).toBe(1);
    });

    it('should track nesting depth', async () => {
      const code = `function outer() {
  if (true) {
    for (let i = 0; i < 10; i++) {
      while (true) {
        // Deep
      }
    }
  }
}`;
      fs.writeFileSync(path.join(testDir, 'nested.ts'), code);

      const result = await computeMetrics({ files: ['nested.ts'] }, testDir);

      expect(result.files[0].maxNestingDepth).toBeGreaterThanOrEqual(4);
    });

    it('should count branch keywords', async () => {
      const code = `function complex(x) {
  if (x > 0) {
    return true;
  } else if (x < 0) {
    return false;
  }
  for (let i = 0; i < x; i++) {
    while (i > 0) {
      i--;
    }
  }
  switch (x) {
    case 1: break;
    case 2: break;
  }
  try {
    throw new Error();
  } catch (e) {
    return null;
  }
}`;
      fs.writeFileSync(path.join(testDir, 'branches.ts'), code);

      const result = await computeMetrics({ files: ['branches.ts'] }, testDir);

      const counts = result.files[0].branchKeywordsCount;
      expect(counts.if).toBeGreaterThan(0);
      expect(counts.elseIf).toBeGreaterThan(0);
      expect(counts.for).toBeGreaterThan(0);
      expect(counts.while).toBeGreaterThan(0);
      expect(counts.switch).toBeGreaterThan(0);
      expect(counts.catch).toBeGreaterThan(0);
    });

    it('should handle multi-line comments', async () => {
      const code = `/*
 * Multi-line comment
 * with multiple lines
 */
function test() {
  return 1;
}`;
      fs.writeFileSync(path.join(testDir, 'multiline.ts'), code);

      const result = await computeMetrics({ files: ['multiline.ts'] }, testDir);

      expect(result.files[0].commentLines).toBe(4);
    });

    it('should calculate aggregate metrics', async () => {
      const file1 = `function a() { return 1; }`;
      const file2 = `function b() { return 2; }`;
      fs.writeFileSync(path.join(testDir, 'a.ts'), file1);
      fs.writeFileSync(path.join(testDir, 'b.ts'), file2);

      const result = await computeMetrics({ files: ['a.ts', 'b.ts'] }, testDir);

      expect(result.aggregate.totalFiles).toBe(2);
      expect(result.aggregate.totalLines).toBe(2);
    });

    it('should skip files larger than max size', async () => {
      const largeContent = 'x'.repeat(1000000); // 1MB
      fs.writeFileSync(path.join(testDir, 'large.ts'), largeContent);

      const result = await computeMetrics(
        { files: ['large.ts'], maxFileSizeBytes: 500000 },
        testDir
      );

      expect(result.files).toHaveLength(0);
    });

    it('should normalize path separators', async () => {
      fs.writeFileSync(path.join(testDir, 'test.ts'), 'const x = 1;');

      const result = await computeMetrics({ files: ['test.ts'] }, testDir);

      expect(result.files[0].path).not.toContain('\\');
    });

    it('should count ternary operators', async () => {
      const code = `const x = a ? b : c;
const y = d ? e : f;`;
      fs.writeFileSync(path.join(testDir, 'ternary.ts'), code);

      const result = await computeMetrics({ files: ['ternary.ts'] }, testDir);

      expect(result.files[0].branchKeywordsCount.ternary).toBeGreaterThanOrEqual(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      quickComplexityCheck
  // ═══════════════════════════════════════════════════════════════

  describe('quickComplexityCheck', () => {
    it('should return not complex for simple code', () => {
      const code = `function simple() {
  return 1;
}`;
      const result = quickComplexityCheck(code);

      expect(result.isComplex).toBe(false);
      expect(result.reasons).toHaveLength(0);
    });

    it('should detect large files', () => {
      const code = Array(600).fill('const x = 1;').join('\n');

      const result = quickComplexityCheck(code);

      expect(result.isComplex).toBe(true);
      expect(result.reasons.some(r => r.includes('Large file'))).toBe(true);
    });

    it('should detect deep nesting', () => {
      const code = `function test() {
  if (true) {
    if (true) {
      if (true) {
        if (true) {
          if (true) {
            if (true) {
              // Very nested
            }
          }
        }
      }
    }
  }
}`;
      const result = quickComplexityCheck(code);

      expect(result.isComplex).toBe(true);
      expect(result.reasons.some(r => r.includes('Deep nesting'))).toBe(true);
    });

    it('should detect many conditionals', () => {
      const lines = Array(25).fill('if (x) { y++; }').join('\n');

      const result = quickComplexityCheck(lines);

      expect(result.isComplex).toBe(true);
      expect(result.reasons.some(r => r.includes('Many conditionals'))).toBe(true);
    });

    it('should detect many TODOs', () => {
      const code = `// TODO: a
// TODO: b
// TODO: c
// TODO: d
// TODO: e
// TODO: f`;

      const result = quickComplexityCheck(code);

      expect(result.isComplex).toBe(true);
      expect(result.reasons.some(r => r.includes('Many TODOs'))).toBe(true);
    });

    it('should combine multiple reasons', () => {
      const lines = Array(600).fill('if (x) { y++; }').join('\n');
      const result = quickComplexityCheck(lines);

      expect(result.reasons.length).toBeGreaterThanOrEqual(2);
    });
  });
});
