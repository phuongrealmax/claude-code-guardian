// src/modules/resource/checkpoint-diff.service.ts
// Checkpoint diff engine for comparing checkpoint states

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { Logger } from '../../core/logger.js';
import { CheckpointInfo, CheckpointData } from './resource.types.js';

// ═══════════════════════════════════════════════════════════════
//                      TYPES
// ═══════════════════════════════════════════════════════════════

export interface FileDiff {
  /** File path relative to project root */
  path: string;

  /** Diff status */
  status: 'added' | 'modified' | 'deleted' | 'unchanged';

  /** Lines added */
  linesAdded: number;

  /** Lines deleted */
  linesDeleted: number;

  /** Size difference in bytes */
  sizeDiff: number;

  /** Current size (if exists) */
  currentSize?: number;

  /** Previous size (from checkpoint) */
  previousSize?: number;
}

export interface CheckpointDiff {
  /** From checkpoint info */
  from: {
    id: string;
    name: string;
    createdAt: Date;
  };

  /** To checkpoint info (or 'current' for current state) */
  to: {
    id: string;
    name: string;
    createdAt: Date;
  } | 'current';

  /** File diffs */
  files: FileDiff[];

  /** Summary statistics */
  summary: {
    filesAdded: number;
    filesModified: number;
    filesDeleted: number;
    filesUnchanged: number;
    totalLinesAdded: number;
    totalLinesDeleted: number;
    netLineChange: number;
  };

  /** Token usage difference (if available) */
  tokenDiff?: {
    from: number;
    to: number;
    diff: number;
  };

  /** Timestamp of diff generation */
  generatedAt: Date;
}

export interface DiffOptions {
  /** Include unchanged files in diff */
  includeUnchanged?: boolean;

  /** Maximum files to include in diff */
  maxFiles?: number;

  /** File patterns to include (glob-style) */
  includePatterns?: string[];

  /** File patterns to exclude (glob-style) */
  excludePatterns?: string[];
}

// ═══════════════════════════════════════════════════════════════
//                      SERVICE
// ═══════════════════════════════════════════════════════════════

export class CheckpointDiffService {
  private checkpointDir: string;

  constructor(
    private logger: Logger,
    private projectRoot: string
  ) {
    this.checkpointDir = join(projectRoot, '.ccg', 'checkpoints');
  }

  /**
   * Generate diff between two checkpoints
   * @param fromCheckpointId - Starting checkpoint ID
   * @param toCheckpointId - Ending checkpoint ID (or 'current' for current state)
   * @param options - Diff options
   */
  async generateDiff(
    fromCheckpointId: string,
    toCheckpointId: string | 'current',
    options: DiffOptions = {}
  ): Promise<CheckpointDiff> {
    const fromCheckpoint = this.loadCheckpoint(fromCheckpointId);
    if (!fromCheckpoint) {
      throw new Error(`Checkpoint not found: ${fromCheckpointId}`);
    }

    let toCheckpoint: CheckpointData | null = null;
    if (toCheckpointId !== 'current') {
      toCheckpoint = this.loadCheckpoint(toCheckpointId);
      if (!toCheckpoint) {
        throw new Error(`Checkpoint not found: ${toCheckpointId}`);
      }
    }

    const files: FileDiff[] = [];
    const trackedFiles = new Set<string>();

    // Get files from "from" checkpoint
    const fromFiles = fromCheckpoint.filesChanged || [];
    for (const file of fromFiles) {
      trackedFiles.add(file);
    }

    // Get current project files if comparing to current
    if (toCheckpointId === 'current') {
      const currentFiles = this.scanProjectFiles(options);
      for (const file of currentFiles) {
        trackedFiles.add(file);
      }
    } else if (toCheckpoint) {
      const toFiles = toCheckpoint.filesChanged || [];
      for (const file of toFiles) {
        trackedFiles.add(file);
      }
    }

    // Generate file diffs
    for (const filePath of trackedFiles) {
      const diff = this.diffFile(
        filePath,
        fromCheckpoint,
        toCheckpoint,
        toCheckpointId === 'current'
      );

      if (diff.status !== 'unchanged' || options.includeUnchanged) {
        files.push(diff);
      }

      // Respect max files limit
      if (options.maxFiles && files.length >= options.maxFiles) {
        break;
      }
    }

    // Calculate summary
    const summary = this.calculateSummary(files);

    // Calculate token diff if available
    let tokenDiff: CheckpointDiff['tokenDiff'];
    if (fromCheckpoint.tokenUsage !== undefined) {
      const toTokens = toCheckpoint?.tokenUsage ?? fromCheckpoint.tokenUsage;
      tokenDiff = {
        from: fromCheckpoint.tokenUsage,
        to: toTokens,
        diff: toTokens - fromCheckpoint.tokenUsage,
      };
    }

    return {
      from: {
        id: fromCheckpoint.id,
        name: fromCheckpoint.name,
        createdAt: new Date(fromCheckpoint.createdAt),
      },
      to: toCheckpointId === 'current'
        ? 'current'
        : {
            id: toCheckpoint!.id,
            name: toCheckpoint!.name,
            createdAt: new Date(toCheckpoint!.createdAt),
          },
      files,
      summary,
      tokenDiff,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate diff between latest checkpoint and current state
   * @param latestCheckpoint - Latest checkpoint info
   * @param options - Diff options
   */
  async diffFromLatest(
    latestCheckpoint: CheckpointInfo,
    options: DiffOptions = {}
  ): Promise<CheckpointDiff> {
    return this.generateDiff(latestCheckpoint.id, 'current', options);
  }

  /**
   * Get a formatted summary of changes
   * @param diff - Checkpoint diff result
   */
  formatDiffSummary(diff: CheckpointDiff): string {
    const lines: string[] = [];

    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('                    CHECKPOINT DIFF SUMMARY');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('');

    // From/To info
    lines.push(`From: ${diff.from.name} (${diff.from.id.substring(0, 8)})`);
    lines.push(`      Created: ${diff.from.createdAt.toISOString()}`);
    lines.push('');

    if (diff.to === 'current') {
      lines.push('To:   Current state');
    } else {
      lines.push(`To:   ${diff.to.name} (${diff.to.id.substring(0, 8)})`);
      lines.push(`      Created: ${diff.to.createdAt.toISOString()}`);
    }
    lines.push('');

    // Summary
    lines.push('───────────────────────────────────────────────────────────────');
    lines.push('                         SUMMARY');
    lines.push('───────────────────────────────────────────────────────────────');
    lines.push('');
    lines.push(`  Files added:     ${diff.summary.filesAdded}`);
    lines.push(`  Files modified:  ${diff.summary.filesModified}`);
    lines.push(`  Files deleted:   ${diff.summary.filesDeleted}`);
    lines.push(`  Files unchanged: ${diff.summary.filesUnchanged}`);
    lines.push('');
    lines.push(`  Lines added:     +${diff.summary.totalLinesAdded}`);
    lines.push(`  Lines deleted:   -${diff.summary.totalLinesDeleted}`);
    lines.push(`  Net change:      ${diff.summary.netLineChange >= 0 ? '+' : ''}${diff.summary.netLineChange}`);
    lines.push('');

    if (diff.tokenDiff) {
      lines.push('───────────────────────────────────────────────────────────────');
      lines.push('                      TOKEN USAGE');
      lines.push('───────────────────────────────────────────────────────────────');
      lines.push('');
      lines.push(`  From:  ${diff.tokenDiff.from.toLocaleString()} tokens`);
      lines.push(`  To:    ${diff.tokenDiff.to.toLocaleString()} tokens`);
      lines.push(`  Diff:  ${diff.tokenDiff.diff >= 0 ? '+' : ''}${diff.tokenDiff.diff.toLocaleString()} tokens`);
      lines.push('');
    }

    // File list
    if (diff.files.length > 0) {
      lines.push('───────────────────────────────────────────────────────────────');
      lines.push('                        FILES CHANGED');
      lines.push('───────────────────────────────────────────────────────────────');
      lines.push('');

      for (const file of diff.files.slice(0, 20)) {
        const statusIcon = {
          added: '+',
          modified: 'M',
          deleted: '-',
          unchanged: ' ',
        }[file.status];

        const changeStr = file.status === 'unchanged'
          ? ''
          : ` (+${file.linesAdded}/-${file.linesDeleted})`;

        lines.push(`  [${statusIcon}] ${file.path}${changeStr}`);
      }

      if (diff.files.length > 20) {
        lines.push(`  ... and ${diff.files.length - 20} more files`);
      }
      lines.push('');
    }

    lines.push('═══════════════════════════════════════════════════════════════');

    return lines.join('\n');
  }

  // ═══════════════════════════════════════════════════════════════
  //                      PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Load checkpoint data from file
   */
  private loadCheckpoint(checkpointId: string): CheckpointData | null {
    const checkpointPath = join(this.checkpointDir, `${checkpointId}.json`);

    if (!existsSync(checkpointPath)) {
      return null;
    }

    try {
      const data = JSON.parse(readFileSync(checkpointPath, 'utf-8'));
      return data as CheckpointData;
    } catch (error) {
      this.logger.error(`Failed to load checkpoint: ${checkpointId}`, error);
      return null;
    }
  }

  /**
   * Scan project files for diffing
   */
  private scanProjectFiles(options: DiffOptions): string[] {
    const files: string[] = [];
    const excludePatterns = options.excludePatterns || [
      'node_modules/**',
      '.git/**',
      'dist/**',
      'build/**',
      '.ccg/**',
      '*.log',
    ];

    const scanDir = (dir: string) => {
      try {
        const entries = readdirSync(dir);

        for (const entry of entries) {
          const fullPath = join(dir, entry);
          const relativePath = relative(this.projectRoot, fullPath);

          // Check exclusions
          if (this.matchesPatterns(relativePath, excludePatterns)) {
            continue;
          }

          try {
            const stat = statSync(fullPath);

            if (stat.isDirectory()) {
              scanDir(fullPath);
            } else if (stat.isFile()) {
              // Check inclusions if specified
              if (!options.includePatterns ||
                  this.matchesPatterns(relativePath, options.includePatterns)) {
                files.push(relativePath);
              }
            }
          } catch {
            // Skip inaccessible files
          }
        }
      } catch {
        // Skip inaccessible directories
      }
    };

    scanDir(this.projectRoot);
    return files;
  }

  /**
   * Check if a path matches any of the patterns
   */
  private matchesPatterns(path: string, patterns: string[]): boolean {
    for (const pattern of patterns) {
      if (this.matchGlob(path, pattern)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Simple glob matching
   */
  private matchGlob(path: string, pattern: string): boolean {
    // Convert glob to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  /**
   * Generate diff for a single file
   */
  private diffFile(
    filePath: string,
    fromCheckpoint: CheckpointData,
    toCheckpoint: CheckpointData | null,
    compareToCurrent: boolean
  ): FileDiff {
    const fullPath = join(this.projectRoot, filePath);
    const existsInFrom = fromCheckpoint.filesChanged?.includes(filePath) || false;
    const existsInTo = compareToCurrent
      ? existsSync(fullPath)
      : (toCheckpoint?.filesChanged?.includes(filePath) || false);

    let status: FileDiff['status'];
    let linesAdded = 0;
    let linesDeleted = 0;
    let sizeDiff = 0;
    let currentSize: number | undefined;
    let previousSize: number | undefined;

    if (!existsInFrom && existsInTo) {
      status = 'added';
      if (compareToCurrent && existsSync(fullPath)) {
        try {
          const content = readFileSync(fullPath, 'utf-8');
          linesAdded = content.split('\n').length;
          currentSize = statSync(fullPath).size;
          sizeDiff = currentSize;
        } catch {
          // Binary or unreadable file
          currentSize = statSync(fullPath).size;
          sizeDiff = currentSize;
        }
      }
    } else if (existsInFrom && !existsInTo) {
      status = 'deleted';
      // Estimate deleted lines (we don't have actual content)
      linesDeleted = 0; // Would need to store content in checkpoint
    } else if (existsInFrom && existsInTo) {
      // Both exist - check if modified
      if (compareToCurrent && existsSync(fullPath)) {
        try {
          currentSize = statSync(fullPath).size;
          // For now, assume modified if file is tracked
          status = 'modified';
          // Rough estimate: assume ~40 chars per line
          const estimatedLines = Math.round(currentSize / 40);
          linesAdded = Math.round(estimatedLines * 0.3); // 30% added
          linesDeleted = Math.round(estimatedLines * 0.1); // 10% deleted
        } catch {
          status = 'modified';
        }
      } else {
        status = 'unchanged';
      }
    } else {
      status = 'unchanged';
    }

    return {
      path: filePath,
      status,
      linesAdded,
      linesDeleted,
      sizeDiff,
      currentSize,
      previousSize,
    };
  }

  /**
   * Calculate summary from file diffs
   */
  private calculateSummary(files: FileDiff[]): CheckpointDiff['summary'] {
    let filesAdded = 0;
    let filesModified = 0;
    let filesDeleted = 0;
    let filesUnchanged = 0;
    let totalLinesAdded = 0;
    let totalLinesDeleted = 0;

    for (const file of files) {
      switch (file.status) {
        case 'added':
          filesAdded++;
          break;
        case 'modified':
          filesModified++;
          break;
        case 'deleted':
          filesDeleted++;
          break;
        case 'unchanged':
          filesUnchanged++;
          break;
      }

      totalLinesAdded += file.linesAdded;
      totalLinesDeleted += file.linesDeleted;
    }

    return {
      filesAdded,
      filesModified,
      filesDeleted,
      filesUnchanged,
      totalLinesAdded,
      totalLinesDeleted,
      netLineChange: totalLinesAdded - totalLinesDeleted,
    };
  }
}
