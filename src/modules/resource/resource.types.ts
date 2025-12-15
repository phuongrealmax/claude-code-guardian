// src/modules/resource/resource.types.ts

export interface ResourceStatus {
  tokens: {
    used: number;
    estimated: number;
    percentage: number;
    remaining: number;
  };
  checkpoints: {
    count: number;
    lastCheckpoint?: CheckpointInfo;
    autoEnabled: boolean;
  };
  warnings: ResourceWarning[];
}

export interface CheckpointInfo {
  id: string;
  name: string;
  createdAt: Date;
  tokenUsage: number;
  reason: string;
  size: number;
}

export interface ResourceWarning {
  level: 'info' | 'warning' | 'critical';
  message: string;
  action?: string;
}

export interface TaskEstimate {
  complexity: 'low' | 'medium' | 'high' | 'very_high';
  estimatedTokens: number;
  estimatedTime: string;
  suggestBreakdown: boolean;
  breakdownSuggestions?: string[];
  canComplete: boolean;
  warningMessage?: string;
}

export interface CheckpointData {
  id: string;
  name: string;
  createdAt: Date;
  reason: CheckpointReason;
  tokenUsage: number;
  session: {
    id: string;
    startedAt: Date;
  };
  memory: unknown[];
  tasks: unknown[];
  filesChanged: string[];
  metadata: Record<string, unknown>;

  // P1: Session Context Restore - Resume state for new sessions
  resumeState?: ResumeState;
}

/**
 * ResumeState - Saved context to restore session accurately
 */
export interface ResumeState {
  // Current task being worked on
  currentTaskId: string | null;
  currentTaskName: string | null;

  // Last completed step/action
  lastCompletedStep: string | null;

  // Suggested next actions for continuation
  nextActions: string[];

  // Tools that will be needed
  requiredTools: string[];

  // Recent failures to avoid repeating
  recentFailures: Array<{
    type: string;
    message: string;
    timestamp: Date;
  }>;

  // Active latent context (if any)
  activeLatentTaskId: string | null;
  activeLatentPhase: string | null;

  // Summary for quick resume
  summary: string;
}

export type CheckpointReason =
  | 'auto_threshold'
  | 'manual'
  | 'task_complete'
  | 'session_end'
  | 'error_recovery'
  | 'before_risky_operation';

export interface TokenUsage {
  used: number;
  estimated: number;
  percentage: number;
  lastUpdated: Date;
}

// ═══════════════════════════════════════════════════════════════
//                      TOKEN BUDGET GOVERNOR
// ═══════════════════════════════════════════════════════════════

export type GovernorMode = 'normal' | 'conservative' | 'critical';

export interface GovernorState {
  mode: GovernorMode;
  tokenPercentage: number;
  allowedActions: string[];
  blockedActions: string[];
  recommendation: string;
  thresholds: {
    conservative: number; // 70%
    critical: number;     // 85%
  };
}
