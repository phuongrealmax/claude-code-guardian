// src/modules/latent/latent-patch.ts

/**
 * Patch Application Logic for Latent Service
 *
 * Handles applying unified diff patches to files.
 */

import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';
import { Logger } from '../../core/logger.js';
import { AppliedPatch } from './latent.types.js';

export interface ApplyPatchOptions {
  target: string;
  patch: string;
  dryRun?: boolean;
}

/**
 * PatchApplicator - Handles patch application to files
 */
export class PatchApplicator {
  constructor(
    private projectRoot: string,
    private logger: Logger
  ) {}

  /**
   * Apply a patch to a file
   */
  async applyPatch(options: ApplyPatchOptions): Promise<AppliedPatch> {
    const { target, patch, dryRun = false } = options;

    const targetPath = join(this.projectRoot, target);
    const result: AppliedPatch = {
      target,
      patch,
      appliedAt: new Date(),
      success: false,
    };

    try {
      if (dryRun) {
        this.logger.info(`[DRY RUN] Would apply patch to: ${target}`);
        result.success = true;
      } else {
        await this.applyPatchToFile(targetPath, patch);
        result.success = true;
      }

      this.logger.info(`Applied patch to: ${target}`);
    } catch (error) {
      result.success = false;
      result.error = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to apply patch to ${target}: ${result.error}`);
    }

    return result;
  }

  /**
   * Apply patch to file (internal implementation)
   */
  private async applyPatchToFile(filePath: string, patch: string): Promise<void> {
    if (!existsSync(filePath)) {
      // If file doesn't exist and patch starts with creating it
      if (patch.includes('+++ b/') || patch.includes('+++ new')) {
        const lines = patch.split('\n');
        const content: string[] = [];
        for (const line of lines) {
          if (line.startsWith('+') && !line.startsWith('+++')) {
            content.push(line.substring(1));
          }
        }
        await mkdir(dirname(filePath), { recursive: true });
        await writeFile(filePath, content.join('\n'));
        return;
      }
      throw new Error(`File not found: ${filePath}`);
    }

    // For existing files, use git apply or manual patching
    try {
      // Try git apply first
      const tempPatchFile = join(this.projectRoot, '.ccg', 'temp.patch');
      await mkdir(dirname(tempPatchFile), { recursive: true });
      await writeFile(tempPatchFile, patch);
      execSync(`git apply ${tempPatchFile}`, { cwd: this.projectRoot });
    } catch {
      // Fallback: manual simple patching
      const currentContent = await readFile(filePath, 'utf-8');
      const patchedContent = this.manualPatch(currentContent, patch);
      await writeFile(filePath, patchedContent);
    }
  }

  /**
   * Manual patch application (simplified unified diff)
   */
  private manualPatch(content: string, patch: string): string {
    const lines = content.split('\n');
    const patchLines = patch.split('\n');
    const result: string[] = [];
    let contentIndex = 0;

    for (const patchLine of patchLines) {
      if (patchLine.startsWith('@@')) {
        // Parse hunk header
        const match = patchLine.match(/@@ -(\d+),?(\d+)? \+(\d+),?(\d+)? @@/);
        if (match) {
          const startLine = parseInt(match[1], 10) - 1;
          // Copy lines up to the start
          while (contentIndex < startLine) {
            result.push(lines[contentIndex++]);
          }
        }
      } else if (patchLine.startsWith('-') && !patchLine.startsWith('---')) {
        // Remove line - skip in original
        contentIndex++;
      } else if (patchLine.startsWith('+') && !patchLine.startsWith('+++')) {
        // Add line
        result.push(patchLine.substring(1));
      } else if (patchLine.startsWith(' ')) {
        // Context line
        result.push(lines[contentIndex++]);
      }
    }

    // Copy remaining lines
    while (contentIndex < lines.length) {
      result.push(lines[contentIndex++]);
    }

    return result.join('\n');
  }
}
