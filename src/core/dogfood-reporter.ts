// src/core/dogfood-reporter.ts

/**
 * Dogfood Reporter - Internal Analytics & Case Study Generator
 *
 * Aggregates session data to generate internal case studies and validate
 * Code Guardian Studio's effectiveness on real codebases.
 *
 * Features:
 * - Aggregated analysis across sessions
 * - Before/after Tech Debt Index comparison
 * - Trend tracking and visualization
 * - Case study markdown generation
 */

import * as fs from 'fs';
import * as path from 'path';
import { SessionStorage, SessionSnapshot, TechDebtIndexBreakdown } from '../modules/code-optimizer/session-storage.js';
import { MultiRepoConfigManager, getMultiRepoConfigManager, ResolvedRepo } from './multi-repo-config.js';
import { Logger } from './logger.js';
import {
  getGrade,
  getTrendEmoji,
  generateCaseStudyMarkdown,
} from './dogfood-markdown.js';

// ═══════════════════════════════════════════════════════════════
//                      TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Aggregated analysis result for a repository
 */
export interface AggregatedAnalysis {
  repoName: string;
  repoPath: string;

  // Session metadata
  totalSessions: number;
  timeSpan: {
    firstSession: Date;
    lastSession: Date;
    durationDays: number;
  };

  // Tech Debt Index analysis
  techDebtIndex: {
    initial: number;
    initialGrade: string;
    latest: number;
    latestGrade: string;
    delta: number;
    percentChange: number;
    trend: 'improving' | 'stable' | 'degrading';
  };

  // Hotspot analysis
  hotspots: {
    initialCount: number;
    latestCount: number;
    delta: number;
    initialTotalScore: number;
    latestTotalScore: number;
    scoreReduction: number;
  };

  // Complexity analysis
  complexity: {
    initialAvg: number;
    latestAvg: number;
    delta: number;
    percentChange: number;
  };

  // File analysis
  files: {
    initialHighComplexity: number;
    latestHighComplexity: number;
    initialLargeFiles: number;
    latestLargeFiles: number;
    totalFiles: number;
    totalLOC: number;
  };

  // Session history (for trend table)
  sessionHistory: Array<{
    sessionId: string;
    date: string;
    techDebtIndex: number;
    grade: string;
    hotspots: number;
    avgComplexity: number;
  }>;
}

/**
 * Options for dogfood report generation
 */
export interface DogfoodReportOptions {
  /** Repository name (or null for all repos) */
  repoName?: string;
  /** Maximum number of sessions to consider */
  limit?: number;
  /** Output path for the case study markdown */
  outputPath?: string;
  /** Include session history table */
  includeHistory?: boolean;
}

/**
 * Result of case study generation
 */
export interface CaseStudyResult {
  success: boolean;
  outputPath: string;
  analysis: AggregatedAnalysis;
  markdown: string;
}

// ═══════════════════════════════════════════════════════════════
//                      DOGFOOD REPORTER
// ═══════════════════════════════════════════════════════════════

export class DogfoodReporter {
  private projectRoot: string;
  private sessionStorage: SessionStorage;
  private multiRepoManager: MultiRepoConfigManager;
  private logger: Logger;

  constructor(projectRoot: string = process.cwd(), logger?: Logger) {
    this.projectRoot = path.isAbsolute(projectRoot)
      ? projectRoot
      : path.resolve(projectRoot);
    this.sessionStorage = new SessionStorage(this.projectRoot);
    this.multiRepoManager = getMultiRepoConfigManager(this.projectRoot);
    this.logger = logger || new Logger('info', 'DogfoodReporter');
  }

  // -----------------------------------------------------------------
  //                      PUBLIC METHODS
  // -----------------------------------------------------------------

  /**
   * Get aggregated analysis for a repository
   */
  getAggregatedAnalysis(repoName?: string, limit?: number): AggregatedAnalysis | null {
    // Load sessions for the repo
    const { sessions } = this.sessionStorage.listSessions({
      repoName,
      limit,
    });

    if (sessions.length === 0) {
      this.logger.warn(`No sessions found for repo: ${repoName || 'all'}`);
      return null;
    }

    // Sort by timestamp ascending (oldest first for analysis)
    const sortedSessions = [...sessions].sort((a, b) => a.timestamp - b.timestamp);

    const firstSession = sortedSessions[0];
    const lastSession = sortedSessions[sortedSessions.length - 1];

    // Calculate time span
    const timeSpan = {
      firstSession: new Date(firstSession.timestamp),
      lastSession: new Date(lastSession.timestamp),
      durationDays: Math.ceil(
        (lastSession.timestamp - firstSession.timestamp) / (1000 * 60 * 60 * 24)
      ),
    };

    // Tech Debt Index analysis
    const initialTDI = firstSession.summary.techDebtIndex;
    const latestTDI = lastSession.summary.techDebtIndex;
    const tdiDelta = latestTDI - initialTDI;
    const tdiPercentChange = initialTDI > 0 ? (tdiDelta / initialTDI) * 100 : 0;

    let tdiTrend: 'improving' | 'stable' | 'degrading' = 'stable';
    if (tdiDelta < -5) tdiTrend = 'improving';
    else if (tdiDelta > 5) tdiTrend = 'degrading';

    // Hotspot analysis
    const initialHotspots = firstSession.summary.totalHotspots;
    const latestHotspots = lastSession.summary.totalHotspots;
    const initialHotspotScore = firstSession.summary.totalHotspotScore || 0;
    const latestHotspotScore = lastSession.summary.totalHotspotScore || 0;

    // Complexity analysis
    const initialAvgComplexity = firstSession.summary.avgComplexity;
    const latestAvgComplexity = lastSession.summary.avgComplexity;
    const complexityDelta = latestAvgComplexity - initialAvgComplexity;
    const complexityPercentChange = initialAvgComplexity > 0
      ? (complexityDelta / initialAvgComplexity) * 100
      : 0;

    // File analysis
    const initialHighComplexity = firstSession.summary.highComplexityFiles || 0;
    const latestHighComplexity = lastSession.summary.highComplexityFiles || 0;
    const initialLargeFiles = firstSession.summary.largeFiles || 0;
    const latestLargeFiles = lastSession.summary.largeFiles || 0;

    // Session history for trend table
    const sessionHistory = sortedSessions.map(s => ({
      sessionId: s.sessionId,
      date: new Date(s.timestamp).toISOString().split('T')[0],
      techDebtIndex: s.summary.techDebtIndex,
      grade: getGrade(s.summary.techDebtIndex),
      hotspots: s.summary.totalHotspots,
      avgComplexity: Math.round(s.summary.avgComplexity * 10) / 10,
    }));

    // Determine effective repo name and path
    const effectiveRepoName = repoName || lastSession.repoName || 'default';
    const resolvedRepo = this.multiRepoManager.getRepo(effectiveRepoName);
    const repoPath = resolvedRepo?.relativePath || '.';

    return {
      repoName: effectiveRepoName,
      repoPath,
      totalSessions: sessions.length,
      timeSpan,
      techDebtIndex: {
        initial: initialTDI,
        initialGrade: getGrade(initialTDI),
        latest: latestTDI,
        latestGrade: getGrade(latestTDI),
        delta: tdiDelta,
        percentChange: tdiPercentChange,
        trend: tdiTrend,
      },
      hotspots: {
        initialCount: initialHotspots,
        latestCount: latestHotspots,
        delta: latestHotspots - initialHotspots,
        initialTotalScore: initialHotspotScore,
        latestTotalScore: latestHotspotScore,
        scoreReduction: initialHotspotScore - latestHotspotScore,
      },
      complexity: {
        initialAvg: initialAvgComplexity,
        latestAvg: latestAvgComplexity,
        delta: complexityDelta,
        percentChange: complexityPercentChange,
      },
      files: {
        initialHighComplexity,
        latestHighComplexity,
        initialLargeFiles,
        latestLargeFiles,
        totalFiles: lastSession.summary.filesAnalyzed,
        totalLOC: lastSession.summary.linesOfCode,
      },
      sessionHistory,
    };
  }

  /**
   * Generate a case study markdown report
   */
  generateCaseStudy(options: DogfoodReportOptions = {}): CaseStudyResult | null {
    const {
      repoName,
      limit = 50,
      outputPath,
      includeHistory = true,
    } = options;

    // Get aggregated analysis
    const analysis = this.getAggregatedAnalysis(repoName, limit);
    if (!analysis) {
      return null;
    }

    // Generate markdown
    const markdown = generateCaseStudyMarkdown(analysis, includeHistory);

    // Determine output path
    const date = new Date().toISOString().split('T')[0];
    const reportsDir = path.join(this.projectRoot, 'docs', 'reports');
    const defaultOutputPath = path.join(
      reportsDir,
      `case-study-${analysis.repoName}-${date}.md`
    );
    const finalOutputPath = outputPath || defaultOutputPath;

    // Ensure reports directory exists
    const outputDir = path.dirname(finalOutputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write the report
    fs.writeFileSync(finalOutputPath, markdown, 'utf-8');
    this.logger.info(`Case study generated: ${finalOutputPath}`);

    return {
      success: true,
      outputPath: finalOutputPath,
      analysis,
      markdown,
    };
  }

  /**
   * Get summary for all configured repos
   */
  getAllReposSummary(): Map<string, AggregatedAnalysis | null> {
    const results = new Map<string, AggregatedAnalysis | null>();

    // Get all configured repos
    const repos = this.multiRepoManager.getAllRepos();

    if (repos.length === 0) {
      // Single repo mode - use default
      const analysis = this.getAggregatedAnalysis();
      if (analysis) {
        results.set(analysis.repoName, analysis);
      }
      return results;
    }

    // Multi-repo mode
    for (const repo of repos) {
      const analysis = this.getAggregatedAnalysis(repo.name);
      results.set(repo.name, analysis);
    }

    return results;
  }

  /**
   * Print summary to console
   */
  printSummary(analysis: AggregatedAnalysis): void {
    const { techDebtIndex, hotspots, complexity, files, timeSpan, totalSessions } = analysis;

    console.log('\n' + '='.repeat(60));
    console.log(`  DOGFOOD REPORT: ${analysis.repoName}`);
    console.log('='.repeat(60));

    console.log(`\nRepository: ${analysis.repoName} (${analysis.repoPath})`);
    console.log(`Sessions analyzed: ${totalSessions}`);
    console.log(`Time span: ${timeSpan.durationDays} days`);
    console.log(`  First: ${timeSpan.firstSession.toISOString().split('T')[0]}`);
    console.log(`  Last:  ${timeSpan.lastSession.toISOString().split('T')[0]}`);

    console.log('\n--- Tech Debt Index ---');
    console.log(`Initial: ${techDebtIndex.initial} (Grade ${techDebtIndex.initialGrade})`);
    console.log(`Latest:  ${techDebtIndex.latest} (Grade ${techDebtIndex.latestGrade})`);
    console.log(`Change:  ${techDebtIndex.delta > 0 ? '+' : ''}${techDebtIndex.delta} (${techDebtIndex.percentChange.toFixed(1)}%)`);
    console.log(`Trend:   ${getTrendEmoji(techDebtIndex.trend)} ${techDebtIndex.trend}`);

    console.log('\n--- Hotspots ---');
    console.log(`Initial: ${hotspots.initialCount} hotspots (score: ${hotspots.initialTotalScore})`);
    console.log(`Latest:  ${hotspots.latestCount} hotspots (score: ${hotspots.latestTotalScore})`);
    console.log(`Change:  ${hotspots.delta > 0 ? '+' : ''}${hotspots.delta} hotspots`);
    if (hotspots.scoreReduction > 0) {
      console.log(`Score reduction: ${hotspots.scoreReduction} points`);
    }

    console.log('\n--- Complexity ---');
    console.log(`Initial avg: ${complexity.initialAvg.toFixed(1)}`);
    console.log(`Latest avg:  ${complexity.latestAvg.toFixed(1)}`);
    console.log(`Change:      ${complexity.delta > 0 ? '+' : ''}${complexity.delta.toFixed(1)} (${complexity.percentChange.toFixed(1)}%)`);

    console.log('\n--- Files ---');
    console.log(`Total files: ${files.totalFiles} (${files.totalLOC.toLocaleString()} LOC)`);
    console.log(`High complexity: ${files.initialHighComplexity} -> ${files.latestHighComplexity}`);
    console.log(`Large files:     ${files.initialLargeFiles} -> ${files.latestLargeFiles}`);

    console.log('\n' + '='.repeat(60) + '\n');
  }

}

// ═══════════════════════════════════════════════════════════════
//                      HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Create a DogfoodReporter instance
 */
export function createDogfoodReporter(
  projectRoot: string = process.cwd(),
  logger?: Logger
): DogfoodReporter {
  return new DogfoodReporter(projectRoot, logger);
}
