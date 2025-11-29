// ═══════════════════════════════════════════════════════════════
//                      HOOK TYPES
// ═══════════════════════════════════════════════════════════════

export type HookType =
  | 'session-start'
  | 'pre-tool'
  | 'post-tool'
  | 'session-end';

export interface HookContext {
  projectRoot: string;
  sessionId?: string;
  timestamp: Date;
  environment: Record<string, string>;
}

export interface HookResult {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
  warnings?: HookWarning[];
  blocked?: boolean;
  blockReason?: string;
}

export interface HookWarning {
  level: 'info' | 'warning' | 'error';
  message: string;
  action?: string;
}

// ═══════════════════════════════════════════════════════════════
//                      SESSION START HOOK
// ═══════════════════════════════════════════════════════════════

export interface SessionStartInput {
  projectPath: string;
  resumeSession?: boolean;
}

export interface SessionStartResult extends HookResult {
  data: {
    sessionId: string;
    memoryLoaded: number;
    pendingTasks: TaskResume[];
    runningProcesses: ProcessInfo[];
    resourceStatus: ResourceStatus;
    welcomeMessage: string;
  };
}

export interface TaskResume {
  id: string;
  name: string;
  progress: number;
  status: string;
  lastCheckpoint?: string;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  port?: number;
}

export interface ResourceStatus {
  tokensUsed: number;
  tokensEstimated: number;
  percentage: number;
}

// ═══════════════════════════════════════════════════════════════
//                      PRE-TOOL CALL HOOK
// ═══════════════════════════════════════════════════════════════

export interface PreToolCallInput {
  toolName: string;
  toolInput: Record<string, unknown>;
  context?: {
    currentTask?: string;
    filesInScope?: string[];
  };
}

export interface PreToolCallResult extends HookResult {
  data: {
    validated: boolean;
    estimation?: TaskEstimation;
    impactAnalysis?: ImpactAnalysis;
    guardWarnings?: GuardWarning[];
    suggestions?: string[];
    modifiedInput?: Record<string, unknown>;
  };
}

export interface TaskEstimation {
  complexity: 'low' | 'medium' | 'high' | 'very_high';
  estimatedTokens: number;
  canComplete: boolean;
  suggestCheckpoint: boolean;
  suggestBreakdown: boolean;
}

export interface ImpactAnalysis {
  filesAffected: string[];
  dependentFiles: string[];
  potentialConflicts: string[];
  testsToRun: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface GuardWarning {
  rule: string;
  severity: 'warning' | 'error' | 'block';
  message: string;
  location?: {
    file: string;
    line: number;
  };
  suggestion?: string;
}

// ═══════════════════════════════════════════════════════════════
//                      POST-TOOL CALL HOOK
// ═══════════════════════════════════════════════════════════════

export interface PostToolCallInput {
  toolName: string;
  toolInput: Record<string, unknown>;
  toolOutput: Record<string, unknown>;
  success: boolean;
  duration: number;
}

export interface PostToolCallResult extends HookResult {
  data: {
    guardValidation?: GuardValidation;
    testsRun?: TestRunResult;
    browserCheck?: BrowserCheckResult;
    filesUpdated?: string[];
    checkpointCreated?: boolean;
    memoryUpdated?: boolean;
  };
}

export interface GuardValidation {
  passed: boolean;
  issues: GuardWarning[];
  autoFixed?: string[];
}

export interface TestRunResult {
  ran: boolean;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  failedTests?: string[];
}

export interface BrowserCheckResult {
  checked: boolean;
  screenshotPath?: string;
  consoleErrors: number;
  networkErrors: number;
  issues?: string[];
}

// ═══════════════════════════════════════════════════════════════
//                      SESSION END HOOK
// ═══════════════════════════════════════════════════════════════

export interface SessionEndInput {
  reason?: 'user_exit' | 'token_limit' | 'error' | 'timeout';
  saveState?: boolean;
}

export interface SessionEndResult extends HookResult {
  data: {
    memorySaved: number;
    tasksSaved: number;
    checkpointId?: string;
    processesCleanedUp: number;
    sessionDuration: number;
    summary: SessionSummary;
  };
}

export interface SessionSummary {
  tasksCompleted: number;
  tasksInProgress: number;
  filesModified: number;
  testsRun: number;
  guardBlocks: number;
  checkpointsCreated: number;
}
