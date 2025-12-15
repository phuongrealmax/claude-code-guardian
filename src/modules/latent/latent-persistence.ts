// src/modules/latent/latent-persistence.ts

/**
 * Persistence Logic for Latent Contexts
 *
 * Handles saving and loading latent contexts to/from disk.
 */

import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname } from 'path';
import { Logger } from '../../core/logger.js';
import { AgentLatentContext, ContextHistoryEntry } from './latent.types.js';

export interface PersistedData {
  contexts: [string, AgentLatentContext][];
  history: [string, ContextHistoryEntry[]][];
  stats: {
    totalCreated: number;
    totalDeltasMerged: number;
    totalPatchesApplied: number;
    phaseStats: Record<string, number>;
  };
}

/**
 * ContextPersistence - Handles persistence of latent contexts
 */
export class ContextPersistence {
  constructor(
    private persistPath: string,
    private logger: Logger
  ) {}

  /**
   * Persist contexts to disk
   */
  async save(
    contexts: Map<string, AgentLatentContext>,
    history: Map<string, ContextHistoryEntry[]>,
    stats: PersistedData['stats']
  ): Promise<void> {
    try {
      const data: PersistedData = {
        contexts: Array.from(contexts.entries()),
        history: Array.from(history.entries()),
        stats,
      };
      await mkdir(dirname(this.persistPath), { recursive: true });
      await writeFile(this.persistPath, JSON.stringify(data, null, 2));
      this.logger.debug(`Persisted ${contexts.size} contexts`);
    } catch (error) {
      this.logger.error(`Failed to persist contexts: ${error}`);
    }
  }

  /**
   * Load persisted contexts from disk
   */
  async load(): Promise<PersistedData | null> {
    if (!existsSync(this.persistPath)) {
      return null;
    }

    try {
      const content = await readFile(this.persistPath, 'utf-8');
      const data: PersistedData = JSON.parse(content);

      // Restore date objects for contexts
      for (const [, context] of data.contexts) {
        context.createdAt = new Date(context.createdAt);
        context.updatedAt = new Date(context.updatedAt);
      }

      // Restore date objects for history
      for (const [, entries] of data.history) {
        for (const entry of entries) {
          entry.timestamp = new Date(entry.timestamp);
        }
      }

      this.logger.info(`Loaded ${data.contexts.length} persisted contexts`);
      return data;
    } catch (error) {
      this.logger.error(`Failed to load persisted contexts: ${error}`);
      return null;
    }
  }
}
