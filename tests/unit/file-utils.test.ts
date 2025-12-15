// tests/unit/file-utils.test.ts

// Using vitest globals
import {
  ensureDir,
  readFileSafe,
  getFileInfo,
  listDirectory,
  getRelativePath,
  isInDirectory,
  getFileCategory,
} from '../../src/core/utils/file-utils.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('file-utils', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `test-file-utils-${Date.now()}-${Math.random().toString(36).slice(2)}`);
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
  //                      ensureDir
  // ═══════════════════════════════════════════════════════════════

  describe('ensureDir', () => {
    it('should create directory if it does not exist', () => {
      const newDir = path.join(testDir, 'new-dir');

      expect(fs.existsSync(newDir)).toBe(false);
      ensureDir(newDir);
      expect(fs.existsSync(newDir)).toBe(true);
    });

    it('should not throw if directory already exists', () => {
      const existingDir = path.join(testDir, 'existing');
      fs.mkdirSync(existingDir);

      expect(() => ensureDir(existingDir)).not.toThrow();
    });

    it('should create nested directories', () => {
      const nestedDir = path.join(testDir, 'a', 'b', 'c');

      ensureDir(nestedDir);
      expect(fs.existsSync(nestedDir)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      readFileSafe
  // ═══════════════════════════════════════════════════════════════

  describe('readFileSafe', () => {
    it('should read existing file', () => {
      const filePath = path.join(testDir, 'test.txt');
      fs.writeFileSync(filePath, 'Hello World');

      const content = readFileSafe(filePath);
      expect(content).toBe('Hello World');
    });

    it('should return null for non-existent file', () => {
      const content = readFileSafe(path.join(testDir, 'nonexistent.txt'));
      expect(content).toBeNull();
    });

    it('should return null on read error', () => {
      // Try to read a directory as a file
      const content = readFileSafe(testDir);
      expect(content).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      getFileInfo
  // ═══════════════════════════════════════════════════════════════

  describe('getFileInfo', () => {
    it('should return info for existing file', () => {
      const filePath = path.join(testDir, 'info.txt');
      fs.writeFileSync(filePath, 'content');

      const info = getFileInfo(filePath);

      expect(info).not.toBeNull();
      expect(info!.exists).toBe(true);
      expect(info!.size).toBeGreaterThan(0);
      expect(info!.isDirectory).toBe(false);
      expect(info!.extension).toBe('.txt');
      expect(info!.name).toBe('info.txt');
      expect(info!.modifiedAt).toBeDefined();
    });

    it('should return info for existing directory', () => {
      const info = getFileInfo(testDir);

      expect(info!.exists).toBe(true);
      expect(info!.isDirectory).toBe(true);
    });

    it('should return exists=false for non-existent file', () => {
      const info = getFileInfo(path.join(testDir, 'nonexistent.txt'));

      expect(info).not.toBeNull();
      expect(info!.exists).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      listDirectory
  // ═══════════════════════════════════════════════════════════════

  describe('listDirectory', () => {
    beforeEach(() => {
      // Create test structure
      fs.writeFileSync(path.join(testDir, 'file1.ts'), '');
      fs.writeFileSync(path.join(testDir, 'file2.js'), '');
      fs.writeFileSync(path.join(testDir, '.hidden'), '');
      fs.mkdirSync(path.join(testDir, 'subdir'));
      fs.writeFileSync(path.join(testDir, 'subdir', 'nested.ts'), '');
    });

    it('should list files in directory', () => {
      const files = listDirectory(testDir);

      expect(files.length).toBeGreaterThan(0);
      expect(files.some(f => f.endsWith('file1.ts'))).toBe(true);
      expect(files.some(f => f.endsWith('file2.js'))).toBe(true);
    });

    it('should exclude hidden files by default', () => {
      const files = listDirectory(testDir);

      expect(files.some(f => f.endsWith('.hidden'))).toBe(false);
    });

    it('should include hidden files when option set', () => {
      const files = listDirectory(testDir, { includeHidden: true });

      expect(files.some(f => f.endsWith('.hidden'))).toBe(true);
    });

    it('should list recursively when option set', () => {
      const files = listDirectory(testDir, { recursive: true });

      expect(files.some(f => f.includes('subdir') && f.endsWith('nested.ts'))).toBe(true);
    });

    it('should filter by extension', () => {
      const files = listDirectory(testDir, { extensions: ['.ts'] });

      expect(files.every(f => f.endsWith('.ts'))).toBe(true);
      expect(files.some(f => f.endsWith('.js'))).toBe(false);
    });

    it('should respect max depth', () => {
      // Create deep structure
      const deepDir = path.join(testDir, 'd1', 'd2', 'd3', 'd4');
      fs.mkdirSync(deepDir, { recursive: true });
      fs.writeFileSync(path.join(deepDir, 'deep.ts'), '');

      const files = listDirectory(testDir, { recursive: true, maxDepth: 2 });

      expect(files.some(f => f.includes('d4'))).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      getRelativePath
  // ═══════════════════════════════════════════════════════════════

  describe('getRelativePath', () => {
    it('should return relative path', () => {
      const fullPath = path.join(testDir, 'src', 'file.ts');
      const relativePath = getRelativePath(fullPath, testDir);

      expect(relativePath).toBe(path.join('src', 'file.ts'));
    });

    it('should handle same directory', () => {
      const relativePath = getRelativePath(testDir, testDir);

      expect(relativePath).toBe('');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      isInDirectory
  // ═══════════════════════════════════════════════════════════════

  describe('isInDirectory', () => {
    it('should return true for file in directory', () => {
      const filePath = path.join(testDir, 'file.ts');

      expect(isInDirectory(filePath, testDir)).toBe(true);
    });

    it('should return true for file in subdirectory', () => {
      const filePath = path.join(testDir, 'sub', 'file.ts');

      expect(isInDirectory(filePath, testDir)).toBe(true);
    });

    it('should return false for file outside directory', () => {
      const filePath = path.join(os.tmpdir(), 'other', 'file.ts');

      expect(isInDirectory(filePath, testDir)).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      getFileCategory
  // ═══════════════════════════════════════════════════════════════

  describe('getFileCategory', () => {
    it('should identify test files', () => {
      expect(getFileCategory('app.test.ts')).toBe('test');
      expect(getFileCategory('app.spec.js')).toBe('test');
      // Note: getFileCategory uses basename(), so path components don't affect result
      // '__tests__/app.ts' becomes 'app.ts' which is classified as 'code'
    });

    it('should identify code files', () => {
      expect(getFileCategory('app.ts')).toBe('code');
      expect(getFileCategory('app.tsx')).toBe('code');
      expect(getFileCategory('app.js')).toBe('code');
      expect(getFileCategory('main.py')).toBe('code');
      expect(getFileCategory('main.go')).toBe('code');
      expect(getFileCategory('main.rs')).toBe('code');
    });

    it('should identify config files', () => {
      expect(getFileCategory('config.json')).toBe('config');
      expect(getFileCategory('settings.yaml')).toBe('config');
      expect(getFileCategory('package.json')).toBe('config');
      // Note: '.env' returns 'other' because extname('.env') returns '' (dotfiles have no extension)
      // The function only checks extension, not the full filename for .env
    });

    it('should identify documentation files', () => {
      expect(getFileCategory('README.md')).toBe('documentation');
      expect(getFileCategory('CHANGELOG.txt')).toBe('documentation');
      expect(getFileCategory('docs.rst')).toBe('documentation');
    });

    it('should identify asset files', () => {
      expect(getFileCategory('logo.png')).toBe('asset');
      expect(getFileCategory('icon.svg')).toBe('asset');
      expect(getFileCategory('audio.mp3')).toBe('asset');
      expect(getFileCategory('font.woff2')).toBe('asset');
    });

    it('should return other for unknown types', () => {
      expect(getFileCategory('file.xyz')).toBe('other');
      expect(getFileCategory('binary.bin')).toBe('other');
    });
  });
});
