// src/modules/code-optimizer/session-storage.ts

/**
 * Session Storage for Code Optimizer
 *
 * Stores optimization session snapshots to .ccg/sessions/ for:
 * - Before/after comparison
 * - Session history tracking
 * - Trend analysis (Team tier)
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  ScanRepositoryOutput,
  MetricsOutput,
  HotspotsOutput,
} from './types.js';

// ═══════════════════════════════════════════════════════════════
//                      TYPES
// ═══════════════════════════════════════════════════════════════

export interface SessionSnapshot {
  sessionId: string;
  timestamp: number;
  repoName: string;
  strategy: 'size' | 'complexity' | 'mixed';

  // Analysis results
  scan: ScanRepositoryOutput;
  metrics: MetricsOutput;
  hotspots: HotspotsOutput;

  // Summary metrics for quick access
  summary: {
    filesAnalyzed: number;
    avgComplexity: number;
    totalHotspots: number;
    topHotspotScore: number;
    linesOfCode: number;
  };
}

export interface SessionFilter {
  repoName?: string;
  startDate?: number; // Unix timestamp
  endDate?: number;
  strategy?: 'size' | 'complexity' | 'mixed';
  limit?: number;
}

export interface SessionListResult {
  sessions: SessionSnapshot[];
  total: number;
}

// ═══════════════════════════════════════════════════════════════
//                      SESSION STORAGE
// ═══════════════════════════════════════════════════════════════

export class SessionStorage {
  private sessionsDir: string;

  constructor(projectRoot: string = process.cwd()) {
    this.sessionsDir = path.join(projectRoot, '.ccg', 'sessions');
    this.ensureSessionsDir();
  }

  private ensureSessionsDir(): void {
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  /**
   * Save a session snapshot
   */
  saveSession(
    sessionId: string,
    repoName: string,
    strategy: 'size' | 'complexity' | 'mixed',
    scan: ScanRepositoryOutput,
    metrics: MetricsOutput,
    hotspots: HotspotsOutput
  ): void {
    const snapshot: SessionSnapshot = {
      sessionId,
      timestamp: Date.now(),
      repoName,
      strategy,
      scan,
      metrics,
      hotspots,
      summary: {
        filesAnalyzed: metrics.files.length,
        avgComplexity: metrics.aggregate.avgComplexityScore,
        totalHotspots: hotspots.hotspots.length,
        topHotspotScore: hotspots.hotspots[0]?.score || 0,
        linesOfCode: scan.totalLinesApprox,
      },
    };

    const filename = `${sessionId}.json`;
    const filepath = path.join(this.sessionsDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(snapshot, null, 2), 'utf-8');
  }

  /**
   * Load a session snapshot by ID
   */
  loadSession(sessionId: string): SessionSnapshot | null {
    const filename = `${sessionId}.json`;
    const filepath = path.join(this.sessionsDir, filename);

    if (!fs.existsSync(filepath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(filepath, 'utf-8');
      return JSON.parse(content) as SessionSnapshot;
    } catch (error) {
      console.error(`Failed to load session ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * List sessions with optional filtering
   */
  listSessions(filter?: SessionFilter): SessionListResult {
    this.ensureSessionsDir();

    const files = fs.readdirSync(this.sessionsDir)
      .filter(f => f.endsWith('.json'));

    let sessions: SessionSnapshot[] = [];

    for (const file of files) {
      try {
        const filepath = path.join(this.sessionsDir, file);
        const content = fs.readFileSync(filepath, 'utf-8');
        const snapshot = JSON.parse(content) as SessionSnapshot;
        sessions.push(snapshot);
      } catch (error) {
        console.error(`Failed to parse session file ${file}:`, error);
      }
    }

    // Apply filters
    if (filter) {
      if (filter.repoName) {
        sessions = sessions.filter(s => s.repoName === filter.repoName);
      }

      if (filter.startDate) {
        sessions = sessions.filter(s => s.timestamp >= filter.startDate!);
      }

      if (filter.endDate) {
        sessions = sessions.filter(s => s.timestamp <= filter.endDate!);
      }

      if (filter.strategy) {
        sessions = sessions.filter(s => s.strategy === filter.strategy);
      }
    }

    // Sort by timestamp descending (newest first)
    sessions.sort((a, b) => b.timestamp - a.timestamp);

    // Apply limit
    const total = sessions.length;
    if (filter?.limit) {
      sessions = sessions.slice(0, filter.limit);
    }

    return { sessions, total };
  }

  /**
   * Get the most recent session for a repository
   */
  getLatestSession(repoName?: string): SessionSnapshot | null {
    const result = this.listSessions({
      repoName,
      limit: 1,
    });

    return result.sessions[0] || null;
  }

  /**
   * Delete old sessions (keep last N sessions)
   */
  cleanupOldSessions(keepCount: number = 50): number {
    const { sessions } = this.listSessions();

    if (sessions.length <= keepCount) {
      return 0;
    }

    const toDelete = sessions.slice(keepCount);
    let deleted = 0;

    for (const session of toDelete) {
      const filename = `${session.sessionId}.json`;
      const filepath = path.join(this.sessionsDir, filename);

      try {
        fs.unlinkSync(filepath);
        deleted++;
      } catch (error) {
        console.error(`Failed to delete session ${session.sessionId}:`, error);
      }
    }

    return deleted;
  }

  /**
   * Calculate improvement metrics between two sessions
   */
  calculateImprovement(
    beforeSession: SessionSnapshot,
    afterSession: SessionSnapshot
  ): {
    complexityDelta: number;
    complexityPercentChange: number;
    hotspotsDelta: number;
    hotspotsPercentChange: number;
    filesAnalyzedDelta: number;
  } {
    const beforeComplexity = beforeSession.summary.avgComplexity;
    const afterComplexity = afterSession.summary.avgComplexity;
    const complexityDelta = afterComplexity - beforeComplexity;
    const complexityPercentChange = beforeComplexity > 0
      ? ((complexityDelta / beforeComplexity) * 100)
      : 0;

    const beforeHotspots = beforeSession.summary.totalHotspots;
    const afterHotspots = afterSession.summary.totalHotspots;
    const hotspotsDelta = afterHotspots - beforeHotspots;
    const hotspotsPercentChange = beforeHotspots > 0
      ? ((hotspotsDelta / beforeHotspots) * 100)
      : 0;

    const beforeFiles = beforeSession.summary.filesAnalyzed;
    const afterFiles = afterSession.summary.filesAnalyzed;
    const filesAnalyzedDelta = afterFiles - beforeFiles;

    return {
      complexityDelta,
      complexityPercentChange,
      hotspotsDelta,
      hotspotsPercentChange,
      filesAnalyzedDelta,
    };
  }
}
