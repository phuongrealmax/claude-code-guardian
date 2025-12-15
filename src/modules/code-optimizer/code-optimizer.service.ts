// src/modules/code-optimizer/code-optimizer.service.ts

/**
 * Code Optimizer Service
 *
 * Main service orchestrating repository scanning, metrics calculation,
 * hotspot detection, and refactor planning.
 */

import { EventBus } from '../../core/event-bus.js';
import { Logger } from '../../core/logger.js';
import { scanRepository } from './repo-scanner.js';
import { computeMetrics } from './metrics.js';
import { selectHotspots } from './hotspots.js';
import { buildRefactorPlan } from './refactor-plan.js';
import { generateReport as generateReportFn } from './report-generator.js';
import { SessionStorage } from './session-storage.js';
import {
  CodeOptimizerConfig,
  CodeOptimizerStatus,
  ScanRepositoryInput,
  ScanRepositoryOutput,
  MetricsInput,
  MetricsOutput,
  HotspotsInput,
  HotspotsOutput,
  RefactorPlanInput,
  RefactorPlanOutput,
  RecordOptimizationInput,
  RecordOptimizationOutput,
  GenerateReportInput,
  GenerateReportOutput,
  DEFAULT_CODE_OPTIMIZER_CONFIG,
} from './types.js';

// ═══════════════════════════════════════════════════════════════
//                      CODE OPTIMIZER SERVICE
// ═══════════════════════════════════════════════════════════════

export class CodeOptimizerService {
  private config: CodeOptimizerConfig;
  private logger: Logger;
  private eventBus: EventBus;
  private projectRoot: string;
  private sessionStorage: SessionStorage;

  // Cache
  private lastScan?: ScanRepositoryOutput;
  private cachedMetrics: Map<string, MetricsOutput> = new Map();
  private activeOptimizations: Set<string> = new Set();

  constructor(
    config: Partial<CodeOptimizerConfig>,
    eventBus: EventBus,
    logger: Logger,
    projectRoot: string = process.cwd()
  ) {
    this.config = { ...DEFAULT_CODE_OPTIMIZER_CONFIG, ...config };
    this.eventBus = eventBus;
    this.logger = logger;
    this.projectRoot = projectRoot;
    this.sessionStorage = new SessionStorage(projectRoot);
  }

  // ═══════════════════════════════════════════════════════════════
  //                      LIFECYCLE
  // ═══════════════════════════════════════════════════════════════

  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      this.logger.info('Code Optimizer module is disabled');
      return;
    }

    this.logger.info('Code Optimizer service initialized');
  }

  async shutdown(): Promise<void> {
    this.cachedMetrics.clear();
    this.activeOptimizations.clear();
    this.logger.info('Code Optimizer service shutdown');
  }

  // ═══════════════════════════════════════════════════════════════
  //                      REPOSITORY SCANNING
  // ═══════════════════════════════════════════════════════════════

  async scanRepository(input: ScanRepositoryInput): Promise<ScanRepositoryOutput> {
    this.logger.info('Scanning repository...', { rootPath: input.rootPath });

    const mergedInput: ScanRepositoryInput = {
      rootPath: input.rootPath || this.projectRoot,
      includePatterns: input.includePatterns,
      excludePatterns: input.excludePatterns || this.config.defaultExcludePatterns,
      maxFiles: input.maxFiles || this.config.maxFilesToScan,
    };

    const result = await scanRepository(mergedInput);

    // Cache result
    this.lastScan = result;

    // Emit event
    this.eventBus.emit({
      type: 'code-optimizer:scan_complete' as any,
      timestamp: new Date(),
      data: {
        totalFiles: result.totalFiles,
        totalLinesApprox: result.totalLinesApprox,
      },
      source: 'CodeOptimizerService',
    });

    this.logger.info(`Scan complete: ${result.totalFiles} files, ~${result.totalLinesApprox} lines`);
    return result;
  }

  // ═══════════════════════════════════════════════════════════════
  //                      METRICS
  // ═══════════════════════════════════════════════════════════════

  async computeMetrics(input: MetricsInput): Promise<MetricsOutput> {
    this.logger.info('Computing metrics...', { fileCount: input.files.length });

    const mergedInput: MetricsInput = {
      files: input.files,
      maxFileSizeBytes: input.maxFileSizeBytes || this.config.maxFileSizeBytes,
    };

    const result = await computeMetrics(mergedInput, this.projectRoot);

    // Cache result
    const cacheKey = input.files.sort().join(',');
    if (this.config.cacheResults) {
      this.cachedMetrics.set(cacheKey, result);

      // Clear cache after TTL (unref to not block process exit)
      const cacheTimeout = setTimeout(() => {
        this.cachedMetrics.delete(cacheKey);
      }, this.config.cacheTTLSeconds * 1000);
      cacheTimeout.unref();
    }

    // Emit event
    this.eventBus.emit({
      type: 'code-optimizer:metrics_computed' as any,
      timestamp: new Date(),
      data: {
        filesAnalyzed: result.files.length,
        avgComplexity: result.aggregate.avgComplexityScore,
      },
      source: 'CodeOptimizerService',
    });

    this.logger.info(`Metrics computed: ${result.files.length} files, avg complexity ${result.aggregate.avgComplexityScore}`);
    return result;
  }

  // ═══════════════════════════════════════════════════════════════
  //                      HOTSPOTS
  // ═══════════════════════════════════════════════════════════════

  detectHotspots(input: HotspotsInput): HotspotsOutput {
    this.logger.info('Detecting hotspots...', {
      metricsCount: input.metrics.length,
      strategy: input.strategy
    });

    const result = selectHotspots(input);

    // Emit event
    this.eventBus.emit({
      type: 'code-optimizer:hotspots_detected' as any,
      timestamp: new Date(),
      data: {
        hotspotsFound: result.hotspots.length,
        topReason: result.summary.topReason,
      },
      source: 'CodeOptimizerService',
    });

    this.logger.info(`Hotspots detected: ${result.hotspots.length}, top reason: ${result.summary.topReason}`);
    return result;
  }

  // ═══════════════════════════════════════════════════════════════
  //                      REFACTOR PLAN
  // ═══════════════════════════════════════════════════════════════

  generateRefactorPlan(input: RefactorPlanInput): RefactorPlanOutput {
    this.logger.info('Generating refactor plan...', {
      hotspotsCount: input.hotspots.length,
      goal: input.goal
    });

    const result = buildRefactorPlan(input);

    // Track active optimization
    const sessionId = `opt-${Date.now()}`;
    this.activeOptimizations.add(sessionId);

    // Emit event
    this.eventBus.emit({
      type: 'code-optimizer:plan_generated' as any,
      timestamp: new Date(),
      data: {
        totalFiles: result.summary.totalFiles,
        totalSteps: result.summary.totalSteps,
        estimatedEffort: result.summary.estimatedTotalEffort,
      },
      source: 'CodeOptimizerService',
    });

    this.logger.info(`Plan generated: ${result.summary.totalFiles} files, ${result.summary.totalSteps} steps`);
    return result;
  }

  // ═══════════════════════════════════════════════════════════════
  //                      RECORD OPTIMIZATION
  // ═══════════════════════════════════════════════════════════════

  async recordOptimization(input: RecordOptimizationInput): Promise<RecordOptimizationOutput> {
    this.logger.info('Recording optimization...', { sessionId: input.sessionId });

    // Remove from active optimizations
    this.activeOptimizations.delete(input.sessionId);

    // Emit event
    this.eventBus.emit({
      type: 'code-optimizer:optimization_recorded' as any,
      timestamp: new Date(),
      data: {
        sessionId: input.sessionId,
        filesChanged: input.filesChanged.length,
        testsStatus: input.testsStatus,
      },
      source: 'CodeOptimizerService',
    });

    // This would normally integrate with Memory module
    // For now, just return success
    return {
      success: true,
      message: `Optimization session ${input.sessionId} recorded. ${input.filesChanged.length} files changed.`,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //                      GENERATE REPORT
  // ═══════════════════════════════════════════════════════════════

  generateReport(input: GenerateReportInput): GenerateReportOutput {
    this.logger.info('Generating optimization report...', { sessionId: input.sessionId });

    // Save current session snapshot if we have all required data
    if (input.scanResult && input.metricsBefore && input.hotspots) {
      const repoName = input.repoName || require('path').basename(this.projectRoot);
      const strategy = input.strategy || 'mixed';

      try {
        this.sessionStorage.saveSession(
          input.sessionId,
          repoName,
          strategy,
          input.scanResult,
          input.metricsBefore,
          input.hotspots
        );
        this.logger.info(`Session snapshot saved: ${input.sessionId}`);
      } catch (error) {
        this.logger.warn(`Failed to save session snapshot: ${error}`);
      }
    }

    // Try to load previous session for before/after comparison
    let previousSession = null;
    if (input.repoName) {
      try {
        // Get the most recent session (excluding the current one)
        const sessions = this.sessionStorage.listSessions({
          repoName: input.repoName,
          limit: 2, // Get last 2 to ensure we skip current if it was just saved
        });

        // Use the second-to-last session if current was just saved,
        // otherwise use the most recent
        previousSession = sessions.sessions.find(
          s => s.sessionId !== input.sessionId
        ) || null;
      } catch (error) {
        this.logger.warn(`Failed to load previous session: ${error}`);
      }
    }

    // Generate report with previous session for comparison
    const result = generateReportFn(input, this.projectRoot, previousSession);

    // Emit event
    this.eventBus.emit({
      type: 'code-optimizer:report_generated' as any,
      timestamp: new Date(),
      data: {
        sessionId: input.sessionId,
        reportPath: result.reportPath,
        hotspotsAnalyzed: result.summary.hotspotsAnalyzed,
        filesChanged: result.summary.filesChanged,
      },
      source: 'CodeOptimizerService',
    });

    this.logger.info(`Report generated: ${result.reportPath}`);
    return result;
  }

  // ═══════════════════════════════════════════════════════════════
  //                      QUICK ANALYSIS (CONVENIENCE)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Quick analysis: scan -> metrics -> hotspots in one call
   */
  async quickAnalysis(options: {
    maxFiles?: number;
    maxHotspots?: number;
    strategy?: 'size' | 'complexity' | 'mixed';
  } = {}): Promise<{
    scan: ScanRepositoryOutput;
    metrics: MetricsOutput;
    hotspots: HotspotsOutput;
  }> {
    // Step 1: Scan
    const scan = await this.scanRepository({
      maxFiles: options.maxFiles || 1000,
    });

    // Step 2: Get source files for metrics
    const sourceFiles = scan.files
      .filter((f) => isSourceFile(f.extension))
      .slice(0, 200)
      .map((f) => f.path);

    // Step 3: Compute metrics
    const metrics = await this.computeMetrics({
      files: sourceFiles,
    });

    // Step 4: Detect hotspots
    const hotspots = this.detectHotspots({
      metrics: metrics.files.map((f) => ({
        path: f.path,
        lines: f.lines,
        maxNestingDepth: f.maxNestingDepth,
        branchScore: f.branchScore,
        todoCount: f.todoCount,
        fixmeCount: f.fixmeCount,
        complexityScore: f.complexityScore,
      })),
      maxResults: options.maxHotspots || 20,
      strategy: options.strategy || 'mixed',
    });

    return { scan, metrics, hotspots };
  }

  // ═══════════════════════════════════════════════════════════════
  //                      STATUS
  // ═══════════════════════════════════════════════════════════════

  getStatus(): CodeOptimizerStatus {
    return {
      enabled: this.config.enabled,
      lastScan: this.lastScan
        ? {
            timestamp: new Date(),
            rootPath: this.lastScan.rootPath,
            filesScanned: this.lastScan.totalFiles,
          }
        : undefined,
      cachedMetrics: this.cachedMetrics.size,
      activeOptimizations: this.activeOptimizations.size,
    };
  }
}

// ═══════════════════════════════════════════════════════════════
//                      HELPERS
// ═══════════════════════════════════════════════════════════════

function isSourceFile(extension: string): boolean {
  const sourceExtensions = new Set([
    '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
    '.py', '.rb', '.go', '.rs', '.java', '.kt', '.swift',
    '.c', '.cpp', '.h', '.hpp', '.cs', '.php',
    '.vue', '.svelte',
  ]);
  return sourceExtensions.has(extension.toLowerCase());
}
