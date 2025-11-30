// src/core/types.ts

// ═══════════════════════════════════════════════════════════════
//                      CONFIGURATION TYPES
// ═══════════════════════════════════════════════════════════════

export interface CCGConfig {
  version: string;
  project: ProjectConfig;
  modules: ModulesConfig;
  notifications: NotificationConfig;
  conventions: ConventionsConfig;
}

export interface ProjectConfig {
  name: string;
  type: ProjectType;
  root: string;
}

export type ProjectType =
  | 'typescript-react'
  | 'typescript-node'
  | 'javascript'
  | 'python'
  | 'other';

// ═══════════════════════════════════════════════════════════════
//                      MODULE CONFIGS
// ═══════════════════════════════════════════════════════════════

export interface ModulesConfig {
  memory: MemoryModuleConfig;
  guard: GuardModuleConfig;
  process: ProcessModuleConfig;
  resource: ResourceModuleConfig;
  testing: TestingModuleConfig;
  documents: DocumentsModuleConfig;
  workflow: WorkflowModuleConfig;
  agents: AgentsModuleConfig;
}

export interface MemoryModuleConfig {
  enabled: boolean;
  maxItems: number;
  autoSave: boolean;
  persistPath: string;
  compressionEnabled: boolean;
}

export interface GuardModuleConfig {
  enabled: boolean;
  strictMode: boolean;
  rules: GuardRules;
}

export interface GuardRules {
  blockFakeTests: boolean;
  blockDisabledFeatures: boolean;
  blockEmptyCatch: boolean;
  blockEmojiInCode: boolean;
  blockSwallowedExceptions: boolean;
  blockSqlInjection?: boolean;        // Default: true
  blockHardcodedSecrets?: boolean;    // Default: true
  customRules?: CustomRule[];
}

export interface CustomRule {
  name: string;
  pattern: string;
  message: string;
  severity: 'warning' | 'error' | 'block';
}

export interface ProcessModuleConfig {
  enabled: boolean;
  ports: Record<string, number>;
  autoKillOnConflict: boolean;
  trackSpawnedProcesses: boolean;
}

export interface ResourceModuleConfig {
  enabled: boolean;
  checkpoints: CheckpointConfig;
  warningThreshold: number;
  pauseThreshold: number;
}

export interface CheckpointConfig {
  auto: boolean;
  thresholds: number[];
  maxCheckpoints: number;
  compressOld: boolean;
}

export interface TestingModuleConfig {
  enabled: boolean;
  autoRun: boolean;
  testCommand: string;
  browser: BrowserTestConfig;
  cleanup: TestCleanupConfig;
}

export interface BrowserTestConfig {
  enabled: boolean;
  headless: boolean;
  captureConsole: boolean;
  captureNetwork: boolean;
  screenshotOnError: boolean;
}

export interface TestCleanupConfig {
  autoCleanTestData: boolean;
  testDataPrefix: string;
  testDataLocations: string[];
}

export interface DocumentsModuleConfig {
  enabled: boolean;
  locations: Record<string, string>;
  updateInsteadOfCreate: boolean;
  namingConvention: string;
}

export interface WorkflowModuleConfig {
  enabled: boolean;
  autoTrackTasks: boolean;
  requireTaskForLargeChanges: boolean;
  largeChangeThreshold: number;
}

export interface AgentsModuleConfig {
  enabled: boolean;
  agentsFilePath: string;
  agentsDir: string;
  autoReload: boolean;
  defaultAgent?: string;
  enableCoordination: boolean;
}

// ═══════════════════════════════════════════════════════════════
//                      NOTIFICATION CONFIG
// ═══════════════════════════════════════════════════════════════

export interface NotificationConfig {
  showInline: boolean;
  showStatusBar: boolean;
  verbosity: 'minimal' | 'normal' | 'verbose';
  sound: SoundConfig;
}

export interface SoundConfig {
  enabled: boolean;
  criticalOnly: boolean;
}

// ═══════════════════════════════════════════════════════════════
//                      CONVENTIONS CONFIG
// ═══════════════════════════════════════════════════════════════

export interface ConventionsConfig {
  fileNaming: NamingConvention;
  variableNaming: NamingConvention;
  componentNaming: NamingConvention;
  noEmoji: boolean;
  noUnicode: boolean;
}

export type NamingConvention =
  | 'camelCase'
  | 'PascalCase'
  | 'snake_case'
  | 'kebab-case'
  | 'SCREAMING_SNAKE_CASE';

// ═══════════════════════════════════════════════════════════════
//                      MEMORY TYPES
// ═══════════════════════════════════════════════════════════════

export interface Memory {
  id: string;
  content: string;
  type: MemoryType;
  importance: number;
  tags: string[];
  createdAt: Date;
  accessedAt: Date;
  accessCount: number;
  metadata?: Record<string, unknown>;
}

export type MemoryType =
  | 'decision'
  | 'fact'
  | 'code_pattern'
  | 'error'
  | 'note'
  | 'convention'
  | 'architecture';

// ═══════════════════════════════════════════════════════════════
//                      TASK TYPES
// ═══════════════════════════════════════════════════════════════

export interface Task {
  id: string;
  name: string;
  description?: string;
  status: TaskStatus;
  progress: number;
  priority: TaskPriority;
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  parentId?: string;
  subtasks: string[];
  estimatedTokens?: number;
  actualTokens?: number;
  checkpoints: string[];
  notes: TaskNote[];
  filesAffected: string[];
  blockedBy?: string[];
  tags: string[];
}

export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'paused'
  | 'blocked'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface TaskNote {
  id: string;
  content: string;
  type: 'note' | 'decision' | 'blocker' | 'idea';
  createdAt: Date;
}

// ═══════════════════════════════════════════════════════════════
//                      VALIDATION TYPES
// ═══════════════════════════════════════════════════════════════

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  blocked: boolean;
  suggestions: string[];
}

export interface ValidationIssue {
  rule: string;
  severity: 'info' | 'warning' | 'error' | 'block';
  message: string;
  location?: CodeLocation;
  suggestion?: string;
  autoFixable: boolean;
}

export interface CodeLocation {
  file: string;
  line: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  snippet?: string;
}

// ═══════════════════════════════════════════════════════════════
//                      PROCESS TYPES
// ═══════════════════════════════════════════════════════════════

export interface ProcessInfo {
  pid: number;
  name: string;
  port?: number;
  command: string;
  startedAt: Date;
  status: ProcessStatus;
  spawnedBy: 'ccg' | 'user' | 'unknown';
}

export type ProcessStatus = 'running' | 'stopped' | 'zombie';

export interface PortStatus {
  port: number;
  available: boolean;
  usedBy?: ProcessInfo;
}

// ═══════════════════════════════════════════════════════════════
//                      DOCUMENT TYPES
// ═══════════════════════════════════════════════════════════════

export interface Document {
  id: string;
  path: string;
  name: string;
  type: DocumentType;
  createdAt: Date;
  updatedAt: Date;
  hash: string;
  size: number;
  description?: string;
  tags: string[];
  linkedFiles: string[];
}

export type DocumentType =
  | 'readme'
  | 'spec'
  | 'api'
  | 'guide'
  | 'changelog'
  | 'architecture'
  | 'config'
  | 'other';

// ═══════════════════════════════════════════════════════════════
//                      CHECKPOINT TYPES
// ═══════════════════════════════════════════════════════════════

export interface Checkpoint {
  id: string;
  taskId?: string;
  name: string;
  createdAt: Date;
  reason: CheckpointReason;
  tokenUsage: number;
  memorySnapshot: MemorySnapshot;
  taskSnapshot?: Task;
  metadata: Record<string, unknown>;
}

export type CheckpointReason =
  | 'auto_threshold'
  | 'manual'
  | 'task_complete'
  | 'session_end'
  | 'error_recovery'
  | 'before_risky_operation';

export interface MemorySnapshot {
  items: Memory[];
  compressedAt?: Date;
}

// ═══════════════════════════════════════════════════════════════
//                      TEST TYPES
// ═══════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════
//                      UTILITY TYPES
// ═══════════════════════════════════════════════════════════════

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>> &
  { [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>> }[Keys];

export type Awaitable<T> = T | Promise<T>;
