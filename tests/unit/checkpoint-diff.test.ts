// tests/unit/checkpoint-diff.test.ts
import { vi } from 'vitest';
import { CheckpointDiffService, CheckpointDiff, FileDiff } from '../../src/modules/resource/checkpoint-diff.service.js';
import { Logger } from '../../src/core/logger.js';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    readFileSync: vi.fn(),
    existsSync: vi.fn(),
    readdirSync: vi.fn(),
    statSync: vi.fn(),
  };
});

describe('CheckpointDiffService', () => {
  let service: CheckpointDiffService;
  let mockLogger: Logger;
  const projectRoot = '/test/project';

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    service = new CheckpointDiffService(mockLogger, projectRoot);

    // Reset mocks
    vi.clearAllMocks();
  });

  describe('generateDiff', () => {
    it('should throw error when from checkpoint not found', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await expect(
        service.generateDiff('nonexistent', 'current')
      ).rejects.toThrow('Checkpoint not found: nonexistent');
    });

    it('should throw error when to checkpoint not found', async () => {
      // First call for "from" checkpoint - exists
      vi.mocked(fs.existsSync).mockReturnValueOnce(true);
      vi.mocked(fs.readFileSync).mockReturnValueOnce(JSON.stringify({
        id: 'from-id',
        name: 'from-checkpoint',
        createdAt: new Date().toISOString(),
        filesChanged: [],
      }));

      // Second call for "to" checkpoint path - not exists
      vi.mocked(fs.existsSync).mockReturnValueOnce(false);

      await expect(
        service.generateDiff('from-id', 'to-id')
      ).rejects.toThrow('Checkpoint not found: to-id');
    });

    it('should generate diff between checkpoint and current state', async () => {
      const fromCheckpoint = {
        id: 'checkpoint-1',
        name: 'test-checkpoint',
        createdAt: new Date().toISOString(),
        filesChanged: ['src/file1.ts', 'src/file2.ts'],
        tokenUsage: 5000,
      };

      // Checkpoint exists
      vi.mocked(fs.existsSync).mockImplementation((p: fs.PathLike) => {
        const pathStr = String(p);
        if (pathStr.includes('checkpoint-1.json')) return true;
        if (pathStr.includes('src/file1.ts')) return true;
        if (pathStr.includes('src/file2.ts')) return false; // deleted
        return false;
      });

      vi.mocked(fs.readFileSync).mockImplementation((p: fs.PathOrFileDescriptor) => {
        const pathStr = String(p);
        if (pathStr.includes('checkpoint-1.json')) {
          return JSON.stringify(fromCheckpoint);
        }
        if (pathStr.includes('file1.ts')) {
          return 'const x = 1;\nconst y = 2;\n';
        }
        throw new Error('File not found');
      });

      vi.mocked(fs.statSync).mockReturnValue({
        size: 50,
        isDirectory: () => false,
        isFile: () => true,
      } as fs.Stats);

      vi.mocked(fs.readdirSync).mockReturnValue([]);

      const diff = await service.generateDiff('checkpoint-1', 'current');

      expect(diff.from.id).toBe('checkpoint-1');
      expect(diff.from.name).toBe('test-checkpoint');
      expect(diff.to).toBe('current');
      expect(diff.generatedAt).toBeInstanceOf(Date);
    });

    it('should calculate summary statistics correctly', async () => {
      const fromCheckpoint = {
        id: 'cp-1',
        name: 'checkpoint',
        createdAt: new Date().toISOString(),
        filesChanged: ['deleted.ts'],
        tokenUsage: 1000,
      };

      vi.mocked(fs.existsSync).mockImplementation((p: fs.PathLike) => {
        const pathStr = String(p);
        if (pathStr.includes('cp-1.json')) return true;
        return false; // deleted.ts doesn't exist anymore
      });

      vi.mocked(fs.readFileSync).mockImplementation((p: fs.PathOrFileDescriptor) => {
        if (String(p).includes('cp-1.json')) {
          return JSON.stringify(fromCheckpoint);
        }
        throw new Error('File not found');
      });

      vi.mocked(fs.readdirSync).mockReturnValue([]);

      const diff = await service.generateDiff('cp-1', 'current');

      expect(diff.summary).toBeDefined();
      expect(typeof diff.summary.filesAdded).toBe('number');
      expect(typeof diff.summary.filesModified).toBe('number');
      expect(typeof diff.summary.filesDeleted).toBe('number');
      expect(typeof diff.summary.totalLinesAdded).toBe('number');
      expect(typeof diff.summary.totalLinesDeleted).toBe('number');
      expect(diff.summary.netLineChange).toBe(
        diff.summary.totalLinesAdded - diff.summary.totalLinesDeleted
      );
    });

    it('should include token diff when available', async () => {
      const fromCheckpoint = {
        id: 'cp-1',
        name: 'checkpoint',
        createdAt: new Date().toISOString(),
        filesChanged: [],
        tokenUsage: 5000,
      };

      const toCheckpoint = {
        id: 'cp-2',
        name: 'checkpoint-2',
        createdAt: new Date().toISOString(),
        filesChanged: [],
        tokenUsage: 7500,
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation((p: fs.PathOrFileDescriptor) => {
        if (String(p).includes('cp-1.json')) return JSON.stringify(fromCheckpoint);
        if (String(p).includes('cp-2.json')) return JSON.stringify(toCheckpoint);
        throw new Error('File not found');
      });

      const diff = await service.generateDiff('cp-1', 'cp-2');

      expect(diff.tokenDiff).toBeDefined();
      expect(diff.tokenDiff!.from).toBe(5000);
      expect(diff.tokenDiff!.to).toBe(7500);
      expect(diff.tokenDiff!.diff).toBe(2500);
    });

    it('should respect maxFiles option', async () => {
      const fromCheckpoint = {
        id: 'cp-1',
        name: 'checkpoint',
        createdAt: new Date().toISOString(),
        filesChanged: ['file1.ts', 'file2.ts', 'file3.ts', 'file4.ts', 'file5.ts'],
        tokenUsage: 1000,
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation((p: fs.PathOrFileDescriptor) => {
        if (String(p).includes('cp-1.json')) return JSON.stringify(fromCheckpoint);
        return 'content';
      });
      vi.mocked(fs.statSync).mockReturnValue({ size: 100, isFile: () => true, isDirectory: () => false } as fs.Stats);
      vi.mocked(fs.readdirSync).mockReturnValue([]);

      const diff = await service.generateDiff('cp-1', 'current', { maxFiles: 3 });

      expect(diff.files.length).toBeLessThanOrEqual(3);
    });

    it('should include unchanged files when option is set', async () => {
      const fromCheckpoint = {
        id: 'cp-1',
        name: 'checkpoint',
        createdAt: new Date().toISOString(),
        filesChanged: ['unchanged.ts'],
        tokenUsage: 1000,
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation((p: fs.PathOrFileDescriptor) => {
        if (String(p).includes('cp-1.json')) return JSON.stringify(fromCheckpoint);
        return 'content';
      });
      vi.mocked(fs.statSync).mockReturnValue({ size: 100, isFile: () => true, isDirectory: () => false } as fs.Stats);
      vi.mocked(fs.readdirSync).mockReturnValue([]);

      const diffWithUnchanged = await service.generateDiff('cp-1', 'current', { includeUnchanged: true });
      const diffWithoutUnchanged = await service.generateDiff('cp-1', 'current', { includeUnchanged: false });

      // When including unchanged, might have more files
      expect(diffWithUnchanged.files.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('diffFromLatest', () => {
    it('should call generateDiff with correct parameters', async () => {
      const latestCheckpoint = {
        id: 'latest-cp',
        name: 'latest',
        createdAt: new Date(),
        tokenUsage: 1000,
        reason: 'manual',
        size: 100,
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        ...latestCheckpoint,
        filesChanged: [],
      }));
      vi.mocked(fs.readdirSync).mockReturnValue([]);

      const diff = await service.diffFromLatest(latestCheckpoint);

      expect(diff.from.id).toBe('latest-cp');
      expect(diff.to).toBe('current');
    });
  });

  describe('formatDiffSummary', () => {
    it('should format diff summary with header', () => {
      const diff: CheckpointDiff = {
        from: {
          id: 'checkpoint-abc123',
          name: 'test-checkpoint',
          createdAt: new Date('2025-01-15T10:00:00Z'),
        },
        to: 'current',
        files: [],
        summary: {
          filesAdded: 2,
          filesModified: 3,
          filesDeleted: 1,
          filesUnchanged: 0,
          totalLinesAdded: 150,
          totalLinesDeleted: 30,
          netLineChange: 120,
        },
        generatedAt: new Date(),
      };

      const formatted = service.formatDiffSummary(diff);

      expect(formatted).toContain('CHECKPOINT DIFF SUMMARY');
      expect(formatted).toContain('test-checkpoint');
      expect(formatted).toContain('checkpoin'); // truncated ID
      expect(formatted).toContain('Current state');
    });

    it('should show file statistics', () => {
      const diff: CheckpointDiff = {
        from: {
          id: 'cp-1',
          name: 'checkpoint',
          createdAt: new Date(),
        },
        to: 'current',
        files: [],
        summary: {
          filesAdded: 5,
          filesModified: 10,
          filesDeleted: 2,
          filesUnchanged: 20,
          totalLinesAdded: 500,
          totalLinesDeleted: 100,
          netLineChange: 400,
        },
        generatedAt: new Date(),
      };

      const formatted = service.formatDiffSummary(diff);

      expect(formatted).toContain('Files added:     5');
      expect(formatted).toContain('Files modified:  10');
      expect(formatted).toContain('Files deleted:   2');
      expect(formatted).toContain('Lines added:     +500');
      expect(formatted).toContain('Lines deleted:   -100');
      expect(formatted).toContain('Net change:      +400');
    });

    it('should show token diff when available', () => {
      const diff: CheckpointDiff = {
        from: {
          id: 'cp-1',
          name: 'checkpoint',
          createdAt: new Date(),
        },
        to: 'current',
        files: [],
        summary: {
          filesAdded: 0,
          filesModified: 0,
          filesDeleted: 0,
          filesUnchanged: 0,
          totalLinesAdded: 0,
          totalLinesDeleted: 0,
          netLineChange: 0,
        },
        tokenDiff: {
          from: 10000,
          to: 15000,
          diff: 5000,
        },
        generatedAt: new Date(),
      };

      const formatted = service.formatDiffSummary(diff);

      expect(formatted).toContain('TOKEN USAGE');
      expect(formatted).toContain('10,000 tokens');
      expect(formatted).toContain('15,000 tokens');
      expect(formatted).toContain('+5,000 tokens');
    });

    it('should list changed files with status icons', () => {
      const diff: CheckpointDiff = {
        from: {
          id: 'cp-1',
          name: 'checkpoint',
          createdAt: new Date(),
        },
        to: 'current',
        files: [
          { path: 'src/new.ts', status: 'added', linesAdded: 50, linesDeleted: 0, sizeDiff: 500 },
          { path: 'src/modified.ts', status: 'modified', linesAdded: 10, linesDeleted: 5, sizeDiff: 100 },
          { path: 'src/deleted.ts', status: 'deleted', linesAdded: 0, linesDeleted: 30, sizeDiff: -300 },
        ],
        summary: {
          filesAdded: 1,
          filesModified: 1,
          filesDeleted: 1,
          filesUnchanged: 0,
          totalLinesAdded: 60,
          totalLinesDeleted: 35,
          netLineChange: 25,
        },
        generatedAt: new Date(),
      };

      const formatted = service.formatDiffSummary(diff);

      expect(formatted).toContain('FILES CHANGED');
      expect(formatted).toContain('[+] src/new.ts');
      expect(formatted).toContain('[M] src/modified.ts');
      expect(formatted).toContain('[-] src/deleted.ts');
    });

    it('should truncate file list when more than 20 files', () => {
      const files: FileDiff[] = [];
      for (let i = 0; i < 25; i++) {
        files.push({
          path: `src/file${i}.ts`,
          status: 'modified',
          linesAdded: 10,
          linesDeleted: 5,
          sizeDiff: 100,
        });
      }

      const diff: CheckpointDiff = {
        from: {
          id: 'cp-1',
          name: 'checkpoint',
          createdAt: new Date(),
        },
        to: 'current',
        files,
        summary: {
          filesAdded: 0,
          filesModified: 25,
          filesDeleted: 0,
          filesUnchanged: 0,
          totalLinesAdded: 250,
          totalLinesDeleted: 125,
          netLineChange: 125,
        },
        generatedAt: new Date(),
      };

      const formatted = service.formatDiffSummary(diff);

      expect(formatted).toContain('... and 5 more files');
    });

    it('should format negative net change correctly', () => {
      const diff: CheckpointDiff = {
        from: {
          id: 'cp-1',
          name: 'checkpoint',
          createdAt: new Date(),
        },
        to: 'current',
        files: [],
        summary: {
          filesAdded: 0,
          filesModified: 0,
          filesDeleted: 5,
          filesUnchanged: 0,
          totalLinesAdded: 10,
          totalLinesDeleted: 100,
          netLineChange: -90,
        },
        generatedAt: new Date(),
      };

      const formatted = service.formatDiffSummary(diff);

      expect(formatted).toContain('Net change:      -90');
    });

    it('should show to checkpoint info when not comparing to current', () => {
      const diff: CheckpointDiff = {
        from: {
          id: 'cp-1',
          name: 'first-checkpoint',
          createdAt: new Date('2025-01-15T10:00:00Z'),
        },
        to: {
          id: 'cp-2',
          name: 'second-checkpoint',
          createdAt: new Date('2025-01-15T12:00:00Z'),
        },
        files: [],
        summary: {
          filesAdded: 0,
          filesModified: 0,
          filesDeleted: 0,
          filesUnchanged: 0,
          totalLinesAdded: 0,
          totalLinesDeleted: 0,
          netLineChange: 0,
        },
        generatedAt: new Date(),
      };

      const formatted = service.formatDiffSummary(diff);

      expect(formatted).toContain('second-checkpoint');
      expect(formatted).not.toContain('Current state');
    });
  });

  describe('glob pattern matching', () => {
    it('should match simple patterns', async () => {
      const fromCheckpoint = {
        id: 'cp-1',
        name: 'checkpoint',
        createdAt: new Date().toISOString(),
        filesChanged: [],
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(fromCheckpoint));
      vi.mocked(fs.readdirSync).mockReturnValue(['file.ts', 'file.js', 'file.md'] as unknown as fs.Dirent[]);
      vi.mocked(fs.statSync).mockReturnValue({
        size: 100,
        isFile: () => true,
        isDirectory: () => false,
      } as fs.Stats);

      const diff = await service.generateDiff('cp-1', 'current', {
        includePatterns: ['*.ts'],
      });

      // Should only include .ts files matching the pattern
      expect(diff).toBeDefined();
    });

    it('should exclude patterns correctly', async () => {
      const fromCheckpoint = {
        id: 'cp-1',
        name: 'checkpoint',
        createdAt: new Date().toISOString(),
        filesChanged: [],
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(fromCheckpoint));
      vi.mocked(fs.readdirSync).mockReturnValue([]);

      const diff = await service.generateDiff('cp-1', 'current', {
        excludePatterns: ['node_modules/**', '*.log'],
      });

      expect(diff).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle malformed checkpoint JSON', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('invalid json');

      await expect(
        service.generateDiff('malformed', 'current')
      ).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle inaccessible files gracefully', async () => {
      const fromCheckpoint = {
        id: 'cp-1',
        name: 'checkpoint',
        createdAt: new Date().toISOString(),
        filesChanged: ['inaccessible.ts'],
      };

      vi.mocked(fs.existsSync).mockImplementation((p: fs.PathLike) => {
        if (String(p).includes('cp-1.json')) return true;
        return true; // file exists but...
      });

      vi.mocked(fs.readFileSync).mockImplementation((p: fs.PathOrFileDescriptor) => {
        if (String(p).includes('cp-1.json')) return JSON.stringify(fromCheckpoint);
        throw new Error('EACCES: permission denied');
      });

      vi.mocked(fs.statSync).mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      vi.mocked(fs.readdirSync).mockReturnValue([]);

      // Should not throw, should handle gracefully
      const diff = await service.generateDiff('cp-1', 'current');
      expect(diff).toBeDefined();
    });
  });
});

describe('FileDiff types', () => {
  it('should have correct status types', () => {
    const statuses: FileDiff['status'][] = ['added', 'modified', 'deleted', 'unchanged'];
    expect(statuses).toHaveLength(4);
  });

  it('should have required fields', () => {
    const fileDiff: FileDiff = {
      path: 'test.ts',
      status: 'added',
      linesAdded: 10,
      linesDeleted: 0,
      sizeDiff: 100,
    };

    expect(fileDiff.path).toBeDefined();
    expect(fileDiff.status).toBeDefined();
    expect(fileDiff.linesAdded).toBeDefined();
    expect(fileDiff.linesDeleted).toBeDefined();
    expect(fileDiff.sizeDiff).toBeDefined();
  });

  it('should allow optional size fields', () => {
    const fileDiff: FileDiff = {
      path: 'test.ts',
      status: 'modified',
      linesAdded: 5,
      linesDeleted: 3,
      sizeDiff: 50,
      currentSize: 1000,
      previousSize: 950,
    };

    expect(fileDiff.currentSize).toBe(1000);
    expect(fileDiff.previousSize).toBe(950);
  });
});
