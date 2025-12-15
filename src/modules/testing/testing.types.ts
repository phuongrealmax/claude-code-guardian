// src/modules/testing/testing.types.ts

export interface TestResults {
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  tests: TestResult[];
  coverage?: CoverageReport;
  summary: string;
}

export interface TestResult {
  name: string;
  file: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  stack?: string;
  assertions: number;
}

export interface CoverageReport {
  lines: number;
  branches: number;
  functions: number;
  statements: number;
}

export interface BrowserSession {
  id: string;
  url: string;
  startedAt: Date;
  status: 'active' | 'closed';
  consoleLogs: ConsoleLog[];
  networkRequests: NetworkRequest[];
  screenshots: Screenshot[];
  errors: BrowserError[];
}

export interface ConsoleLog {
  type: 'log' | 'warn' | 'error' | 'info' | 'debug';
  message: string;
  timestamp: Date;
  source?: string;
  lineNumber?: number;
}

export interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  status: number;
  statusText: string;
  duration: number;
  size: number;
  type: string;
  error?: string;
  timestamp: Date;
}

export interface Screenshot {
  id: string;
  path: string;
  createdAt: Date;
  selector?: string;
  fullPage: boolean;
  width: number;
  height: number;
}

export interface BrowserError {
  message: string;
  source: string;
  lineNumber?: number;
  columnNumber?: number;
  stack?: string;
  timestamp: Date;
}

export interface TestRunOptions {
  files?: string[];
  grep?: string;
  coverage?: boolean;
  watch?: boolean;
  timeout?: number;
}

export interface BrowserOptions {
  headless?: boolean;
  viewport?: { width: number; height: number };
  timeout?: number;
}

export interface TestCleanupResult {
  filesRemoved: number;
  dataCleared: number;
  locations: string[];
}

export interface TestingModuleStatus {
  enabled: boolean;
  lastResults?: TestResults;
  browserSessions: number;
}

// Browser Analysis for Frontend Test Observability
export interface BrowserAnalysis {
  summary: string;
  consoleErrors: ConsoleLog[];
  consoleWarnings: ConsoleLog[];
  consoleInfo: ConsoleLog[];
  failedRequests: NetworkRequest[];
  slowRequests: NetworkRequest[];
  pageErrors: BrowserError[];
  healthScore: number; // 0-100
  issues: string[];
  recommendations: string[];
}

// ═══════════════════════════════════════════════════════════════
//                      OBSERVABILITY TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Prioritized observability output for test failures.
 * Priority: 1. Console (errors/warnings) 2. Network (failures) 3. Trace 4. Screenshot
 */
export interface TestingObservability {
  runId: string;
  timestamp: string; // ISO string
  status: 'passed' | 'failed' | 'skipped';

  // Primary diagnostic data (prioritized)
  console: ObservabilityConsole;
  network: ObservabilityNetwork;
  trace?: ObservabilityTrace;

  // Secondary (screenshot is supplementary)
  screenshot?: {
    path: string;
    captured: boolean;
  };

  // Summary for quick triage
  summary: string;
  failingTests: string[]; // capped to 10
  healthScore: number; // 0-100
}

export interface ObservabilityConsole {
  errors: Array<{
    message: string;
    source?: string;
    timestamp: string;
  }>;
  warnings: Array<{
    message: string;
    source?: string;
    timestamp: string;
  }>;
  errorCount: number;
  warningCount: number;
}

export interface ObservabilityNetwork {
  failures: Array<{
    url: string;
    method: string;
    status: number;
    error?: string;
    timestamp: string;
  }>;
  timeouts: Array<{
    url: string;
    method: string;
    duration: number;
  }>;
  failureCount: number;
  timeoutCount: number;
}

export interface ObservabilityTrace {
  available: boolean;
  path?: string;
  retryCount?: number;
}
