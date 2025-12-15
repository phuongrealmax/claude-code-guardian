// tests/unit/repo-scanner.test.ts

// Using vitest globals
import {
  scanRepository,
  getLanguageFromExtension,
  isSourceCodeFile,
  isTestFile,
} from '../../src/modules/code-optimizer/repo-scanner.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('repo-scanner', () => {
  // ═══════════════════════════════════════════════════════════════
  //                      getLanguageFromExtension
  // ═══════════════════════════════════════════════════════════════

  describe('getLanguageFromExtension', () => {
    it('should detect TypeScript', () => {
      expect(getLanguageFromExtension('.ts')).toBe('typescript');
      expect(getLanguageFromExtension('.tsx')).toBe('typescript');
    });

    it('should detect JavaScript', () => {
      expect(getLanguageFromExtension('.js')).toBe('javascript');
      expect(getLanguageFromExtension('.jsx')).toBe('javascript');
    });

    it('should detect Python', () => {
      expect(getLanguageFromExtension('.py')).toBe('python');
    });

    it('should detect Go', () => {
      expect(getLanguageFromExtension('.go')).toBe('go');
    });

    it('should detect Rust', () => {
      expect(getLanguageFromExtension('.rs')).toBe('rust');
    });

    it('should detect Java', () => {
      expect(getLanguageFromExtension('.java')).toBe('java');
    });

    it('should detect Kotlin', () => {
      expect(getLanguageFromExtension('.kt')).toBe('kotlin');
    });

    it('should detect C#', () => {
      expect(getLanguageFromExtension('.cs')).toBe('csharp');
    });

    it('should detect C/C++', () => {
      expect(getLanguageFromExtension('.c')).toBe('c');
      expect(getLanguageFromExtension('.cpp')).toBe('cpp');
      expect(getLanguageFromExtension('.h')).toBe('c');
    });

    it('should detect Vue', () => {
      expect(getLanguageFromExtension('.vue')).toBe('vue');
    });

    it('should detect Svelte', () => {
      expect(getLanguageFromExtension('.svelte')).toBe('svelte');
    });

    it('should return unknown for unsupported extensions', () => {
      expect(getLanguageFromExtension('.xyz')).toBe('unknown');
      expect(getLanguageFromExtension('.abc')).toBe('unknown');
    });

    it('should handle case insensitivity', () => {
      expect(getLanguageFromExtension('.TS')).toBe('typescript');
      expect(getLanguageFromExtension('.Py')).toBe('python');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      isSourceCodeFile
  // ═══════════════════════════════════════════════════════════════

  describe('isSourceCodeFile', () => {
    it('should identify TypeScript as source code', () => {
      expect(isSourceCodeFile('.ts')).toBe(true);
      expect(isSourceCodeFile('.tsx')).toBe(true);
    });

    it('should identify JavaScript as source code', () => {
      expect(isSourceCodeFile('.js')).toBe(true);
      expect(isSourceCodeFile('.jsx')).toBe(true);
      expect(isSourceCodeFile('.mjs')).toBe(true);
      expect(isSourceCodeFile('.cjs')).toBe(true);
    });

    it('should identify Python as source code', () => {
      expect(isSourceCodeFile('.py')).toBe(true);
    });

    it('should identify compiled languages as source code', () => {
      expect(isSourceCodeFile('.go')).toBe(true);
      expect(isSourceCodeFile('.rs')).toBe(true);
      expect(isSourceCodeFile('.java')).toBe(true);
      expect(isSourceCodeFile('.c')).toBe(true);
      expect(isSourceCodeFile('.cpp')).toBe(true);
    });

    it('should not identify config files as source code', () => {
      expect(isSourceCodeFile('.json')).toBe(false);
      expect(isSourceCodeFile('.yaml')).toBe(false);
      expect(isSourceCodeFile('.xml')).toBe(false);
    });

    it('should not identify documentation as source code', () => {
      expect(isSourceCodeFile('.md')).toBe(false);
      expect(isSourceCodeFile('.txt')).toBe(false);
    });

    it('should handle case insensitivity', () => {
      expect(isSourceCodeFile('.TS')).toBe(true);
      expect(isSourceCodeFile('.PY')).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      isTestFile
  // ═══════════════════════════════════════════════════════════════

  describe('isTestFile', () => {
    it('should identify .test.ts files', () => {
      expect(isTestFile('app.test.ts')).toBe(true);
      expect(isTestFile('utils.test.tsx')).toBe(true);
    });

    it('should identify .spec.ts files', () => {
      expect(isTestFile('app.spec.ts')).toBe(true);
      expect(isTestFile('utils.spec.js')).toBe(true);
    });

    it('should identify _test.ts files', () => {
      expect(isTestFile('app_test.ts')).toBe(true);
    });

    it('should identify _spec.ts files', () => {
      expect(isTestFile('app_spec.ts')).toBe(true);
    });

    it('should identify test_ prefix files', () => {
      expect(isTestFile('test_app.ts')).toBe(true);
    });

    it('should identify files in __tests__ directory', () => {
      expect(isTestFile('__tests__/app.ts')).toBe(true);
    });

    it('should identify files in tests directory', () => {
      expect(isTestFile('tests/app.ts')).toBe(true);
      expect(isTestFile('test/app.ts')).toBe(true);
    });

    it('should identify Python test files', () => {
      expect(isTestFile('app.test.py')).toBe(true);
      expect(isTestFile('app_test.py')).toBe(true);
      expect(isTestFile('test_app.py')).toBe(true);
    });

    it('should not identify regular source files as tests', () => {
      expect(isTestFile('app.ts')).toBe(false);
      expect(isTestFile('utils.js')).toBe(false);
      expect(isTestFile('service.py')).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      scanRepository
  // ═══════════════════════════════════════════════════════════════

  describe('scanRepository', () => {
    let testDir: string;

    beforeEach(() => {
      testDir = path.join(os.tmpdir(), `test-repo-scanner-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      fs.mkdirSync(testDir, { recursive: true });
    });

    afterEach(() => {
      try {
        fs.rmSync(testDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    });

    it('should throw for non-existent path', async () => {
      await expect(scanRepository({ rootPath: '/nonexistent/path' })).rejects.toThrow('does not exist');
    });

    it('should scan empty directory', async () => {
      const result = await scanRepository({ rootPath: testDir });

      expect(result.totalFiles).toBe(0);
      expect(result.files).toHaveLength(0);
    });

    it('should scan directory with files', async () => {
      fs.writeFileSync(path.join(testDir, 'file1.ts'), 'const x = 1;');
      fs.writeFileSync(path.join(testDir, 'file2.js'), 'const y = 2;');

      const result = await scanRepository({ rootPath: testDir });

      expect(result.totalFiles).toBe(2);
      expect(result.files.some(f => f.path === 'file1.ts')).toBe(true);
    });

    it('should respect maxFiles limit', async () => {
      for (let i = 0; i < 10; i++) {
        fs.writeFileSync(path.join(testDir, `file${i}.ts`), `const x${i} = ${i};`);
      }

      const result = await scanRepository({ rootPath: testDir, maxFiles: 5 });

      expect(result.totalFiles).toBe(5);
    });

    it('should exclude patterns', async () => {
      fs.mkdirSync(path.join(testDir, 'node_modules'));
      fs.writeFileSync(path.join(testDir, 'src.ts'), 'code');
      fs.writeFileSync(path.join(testDir, 'node_modules', 'dep.ts'), 'dep');

      const result = await scanRepository({
        rootPath: testDir,
        excludePatterns: ['**/node_modules/**'],
      });

      expect(result.files.some(f => f.path.includes('node_modules'))).toBe(false);
      expect(result.files.some(f => f.path === 'src.ts')).toBe(true);
    });

    it('should include file size and line estimate', async () => {
      fs.writeFileSync(path.join(testDir, 'test.ts'), 'const x = 1;\nconst y = 2;\n');

      const result = await scanRepository({ rootPath: testDir });

      expect(result.files[0].sizeBytes).toBeGreaterThan(0);
      expect(result.files[0].linesApprox).toBeGreaterThan(0);
    });

    it('should track top large files', async () => {
      fs.writeFileSync(path.join(testDir, 'small.ts'), 'x');
      fs.writeFileSync(path.join(testDir, 'large.ts'), 'y'.repeat(1000));

      const result = await scanRepository({ rootPath: testDir });

      expect(result.topLargeFiles.length).toBeGreaterThan(0);
      expect(result.topLargeFiles[0].path).toBe('large.ts');
    });

    it('should normalize path separators', async () => {
      fs.mkdirSync(path.join(testDir, 'src'));
      fs.writeFileSync(path.join(testDir, 'src', 'file.ts'), 'code');

      const result = await scanRepository({ rootPath: testDir });

      expect(result.files[0].path).not.toContain('\\');
      expect(result.files[0].path).toBe('src/file.ts');
    });
  });
});
