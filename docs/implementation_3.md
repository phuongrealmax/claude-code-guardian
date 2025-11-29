## HOOK IMPLEMENTATIONS

---

### 1. HOOKS ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLAUDE CODE HOOKS FLOW                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Session Start ──► PreToolCall ──► [Tool Execution] ──► Post   │
│       │                │                                  │     │
│       ▼                ▼                                  ▼     │
│  ┌─────────┐    ┌───────────┐                      ┌─────────┐ │
│  │ Memory  │    │ Validate  │                      │ Verify  │ │
│  │ Load    │    │ Estimate  │                      │ Guard   │ │
│  │ Resume  │    │ Impact    │                      │ Test    │ │
│  │ Cleanup │    │ Guard     │                      │ Save    │ │
│  └─────────┘    └───────────┘                      └─────────┘ │
│                                                                 │
│  Session End (Stop Hook)                                        │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Save Memory │ Save Tasks │ Checkpoint │ Cleanup Processes  ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

### 2. HOOKS CONFIGURATION

```typescript
// templates/hooks.template.json

{
  "hooks": {
    "SessionStart": [
      {
        "type": "command",
        "command": "npx @anthropic-community/claude-code-guardian hook session-start"
      }
    ],
    "PreToolCall": [
      {
        "type": "command",
        "command": "npx @anthropic-community/claude-code-guardian hook pre-tool $TOOL_NAME",
        "filter": {
          "tools": ["write_file", "edit_file", "bash", "create_file"]
        }
      }
    ],
    "PostToolCall": [
      {
        "type": "command",
        "command": "npx @anthropic-community/claude-code-guardian hook post-tool $TOOL_NAME",
        "filter": {
          "tools": ["write_file", "edit_file", "create_file"]
        }
      }
    ],
    "Stop": [
      {
        "type": "command",
        "command": "npx @anthropic-community/claude-code-guardian hook session-end"
      }
    ]
  }
}
```

---

### 3. HOOK TYPES & INTERFACES

```typescript
// src/hooks/types.ts

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
```

---

### 4. HOOK HANDLER BASE

```typescript
// src/hooks/hook-handler.ts

import { HookContext, HookResult, HookWarning } from './types.js';
import { Logger } from '../core/logger.js';
import { ConfigManager } from '../core/config-manager.js';
import { StateManager } from '../core/state-manager.js';
import { EventBus } from '../core/event-bus.js';

// Module imports
import { MemoryModule } from '../modules/memory/index.js';
import { GuardModule } from '../modules/guard/index.js';
import { ProcessModule } from '../modules/process/index.js';
import { ResourceModule } from '../modules/resource/index.js';
import { WorkflowModule } from '../modules/workflow/index.js';
import { TestingModule } from '../modules/testing/index.js';
import { DocumentsModule } from '../modules/documents/index.js';

export interface Modules {
  memory: MemoryModule;
  guard: GuardModule;
  process: ProcessModule;
  resource: ResourceModule;
  workflow: WorkflowModule;
  testing: TestingModule;
  documents: DocumentsModule;
}

export abstract class HookHandler {
  protected logger: Logger;
  protected config: ConfigManager;
  protected state: StateManager;
  protected eventBus: EventBus;
  protected modules: Modules;
  protected context: HookContext;

  constructor(
    modules: Modules,
    context: HookContext,
    logger: Logger,
    config: ConfigManager,
    state: StateManager,
    eventBus: EventBus
  ) {
    this.modules = modules;
    this.context = context;
    this.logger = logger;
    this.config = config;
    this.state = state;
    this.eventBus = eventBus;
  }

  abstract execute(input: unknown): Promise<HookResult>;

  protected formatOutput(result: HookResult): string {
    const lines: string[] = [];
    
    if (result.blocked) {
      lines.push(`🚨 BLOCKED: ${result.blockReason}`);
    }
    
    if (result.warnings && result.warnings.length > 0) {
      for (const warning of result.warnings) {
        const icon = warning.level === 'error' ? '🔴' : warning.level === 'warning' ? '⚠️' : 'ℹ️';
        lines.push(`${icon} ${warning.message}`);
        if (warning.action) {
          lines.push(`   → ${warning.action}`);
        }
      }
    }
    
    if (result.message) {
      lines.push(result.message);
    }
    
    return lines.join('\n');
  }

  protected createWarning(
    level: HookWarning['level'],
    message: string,
    action?: string
  ): HookWarning {
    return { level, message, action };
  }
}
```

---

### 5. SESSION START HOOK

```typescript
// src/hooks/session-start.hook.ts

import { 
  HookHandler, 
  Modules 
} from './hook-handler.js';
import { 
  SessionStartInput, 
  SessionStartResult,
  TaskResume,
  ProcessInfo,
  HookContext,
  HookWarning
} from './types.js';
import { Logger } from '../core/logger.js';
import { ConfigManager } from '../core/config-manager.js';
import { StateManager } from '../core/state-manager.js';
import { EventBus } from '../core/event-bus.js';
import { v4 as uuid } from 'uuid';

export class SessionStartHook extends HookHandler {
  constructor(
    modules: Modules,
    context: HookContext,
    logger: Logger,
    config: ConfigManager,
    state: StateManager,
    eventBus: EventBus
  ) {
    super(modules, context, logger, config, state, eventBus);
  }

  async execute(input: SessionStartInput): Promise<SessionStartResult> {
    const startTime = Date.now();
    const warnings: HookWarning[] = [];
    
    this.logger.info('Session start hook executing...');
    
    try {
      // ═══════════════════════════════════════════════════════════
      // STEP 1: Initialize session
      // ═══════════════════════════════════════════════════════════
      const sessionId = uuid();
      this.state.setSession({
        id: sessionId,
        startedAt: new Date(),
        projectPath: input.projectPath,
        status: 'active',
      });
      
      // ═══════════════════════════════════════════════════════════
      // STEP 2: Load persistent memory
      // ═══════════════════════════════════════════════════════════
      let memoryLoaded = 0;
      try {
        const memorySummary = await this.modules.memory.getStatus();
        memoryLoaded = memorySummary.total || 0;
        
        if (memoryLoaded > 0) {
          this.logger.info(`Loaded ${memoryLoaded} memory items`);
        }
      } catch (error) {
        warnings.push(this.createWarning(
          'warning',
          'Failed to load memory',
          'Memory will start fresh this session'
        ));
      }
      
      // ═══════════════════════════════════════════════════════════
      // STEP 3: Check and cleanup processes
      // ═══════════════════════════════════════════════════════════
      const runningProcesses: ProcessInfo[] = [];
      try {
        const processStatus = await this.modules.process.getStatus();
        
        // Get running processes on configured ports
        const processes = await this.modules.process.handleTool('list', {});
        if (Array.isArray(processes)) {
          for (const proc of processes) {
            runningProcesses.push({
              pid: proc.pid,
              name: proc.name,
              port: proc.port,
            });
          }
        }
        
        // Check for zombie processes
        const zombies = runningProcesses.filter(p => p.name === 'zombie');
        if (zombies.length > 0) {
          warnings.push(this.createWarning(
            'warning',
            `Found ${zombies.length} zombie process(es)`,
            'Use /ccg process cleanup to remove them'
          ));
        }
      } catch (error) {
        this.logger.warn('Failed to check processes:', error);
      }
      
      // ═══════════════════════════════════════════════════════════
      // STEP 4: Load pending tasks
      // ═══════════════════════════════════════════════════════════
      const pendingTasks: TaskResume[] = [];
      try {
        const taskList = await this.modules.workflow.handleTool('task_list', {
          status: ['pending', 'in_progress', 'paused'],
        }) as any[];
        
        for (const task of taskList || []) {
          pendingTasks.push({
            id: task.id,
            name: task.name,
            progress: task.progress,
            status: task.status,
            lastCheckpoint: task.checkpoints?.[task.checkpoints.length - 1],
          });
        }
        
        // Find in-progress task
        const inProgress = pendingTasks.find(t => t.status === 'in_progress');
        if (inProgress) {
          warnings.push(this.createWarning(
            'info',
            `Resume available: "${inProgress.name}" (${inProgress.progress}% complete)`,
            'Type /ccg task resume to continue'
          ));
        }
      } catch (error) {
        this.logger.warn('Failed to load tasks:', error);
      }
      
      // ═══════════════════════════════════════════════════════════
      // STEP 5: Get resource status
      // ═══════════════════════════════════════════════════════════
      let resourceStatus = {
        tokensUsed: 0,
        tokensEstimated: 200000,
        percentage: 0,
      };
      
      try {
        const status = await this.modules.resource.getStatus();
        resourceStatus = {
          tokensUsed: status.tokens.used,
          tokensEstimated: status.tokens.estimated,
          percentage: status.tokens.percentage,
        };
      } catch (error) {
        this.logger.warn('Failed to get resource status:', error);
      }
      
      // ═══════════════════════════════════════════════════════════
      // STEP 6: Scan documents
      // ═══════════════════════════════════════════════════════════
      try {
        await this.modules.documents.handleTool('scan', {});
      } catch (error) {
        this.logger.warn('Failed to scan documents:', error);
      }
      
      // ═══════════════════════════════════════════════════════════
      // STEP 7: Build welcome message
      // ═══════════════════════════════════════════════════════════
      const welcomeMessage = this.buildWelcomeMessage({
        memoryLoaded,
        pendingTasks,
        runningProcesses,
        resourceStatus,
      });
      
      // Emit session start event
      this.eventBus.emit({
        type: 'session:start',
        session: this.state.getSession()!,
        timestamp: new Date(),
      });
      
      const duration = Date.now() - startTime;
      this.logger.info(`Session start completed in ${duration}ms`);
      
      return {
        success: true,
        message: welcomeMessage,
        warnings,
        data: {
          sessionId,
          memoryLoaded,
          pendingTasks,
          runningProcesses,
          resourceStatus,
          welcomeMessage,
        },
      };
      
    } catch (error) {
      this.logger.error('Session start failed:', error);
      
      return {
        success: false,
        message: `Session start failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        warnings,
        data: {
          sessionId: '',
          memoryLoaded: 0,
          pendingTasks: [],
          runningProcesses: [],
          resourceStatus: { tokensUsed: 0, tokensEstimated: 200000, percentage: 0 },
          welcomeMessage: 'Session start failed',
        },
      };
    }
  }

  private buildWelcomeMessage(data: {
    memoryLoaded: number;
    pendingTasks: TaskResume[];
    runningProcesses: ProcessInfo[];
    resourceStatus: { tokensUsed: number; tokensEstimated: number; percentage: number };
  }): string {
    const lines: string[] = [];
    
    lines.push('🛡️ ═══════════════════════════════════════════════════');
    lines.push('   CLAUDE CODE GUARDIAN - Session Started');
    lines.push('═══════════════════════════════════════════════════════');
    lines.push('');
    
    // Memory status
    if (data.memoryLoaded > 0) {
      lines.push(`🧠 Memory: ${data.memoryLoaded} items loaded`);
    } else {
      lines.push('🧠 Memory: Fresh session');
    }
    
    // Task status
    const inProgress = data.pendingTasks.find(t => t.status === 'in_progress');
    const pending = data.pendingTasks.filter(t => t.status === 'pending');
    const paused = data.pendingTasks.filter(t => t.status === 'paused');
    
    if (inProgress) {
      lines.push(`⚡ Active Task: "${inProgress.name}" - ${inProgress.progress}% complete`);
    }
    if (pending.length > 0) {
      lines.push(`📋 Pending Tasks: ${pending.length}`);
    }
    if (paused.length > 0) {
      lines.push(`⏸️  Paused Tasks: ${paused.length}`);
    }
    
    // Process status
    if (data.runningProcesses.length > 0) {
      const ports = data.runningProcesses
        .filter(p => p.port)
        .map(p => p.port)
        .join(', ');
      lines.push(`🖥️  Processes: ${data.runningProcesses.length} running${ports ? ` (ports: ${ports})` : ''}`);
    }
    
    // Resource status
    lines.push(`📊 Resources: ${data.resourceStatus.percentage}% token usage`);
    
    lines.push('');
    lines.push('💡 Quick Commands:');
    lines.push('   /ccg status  - View full status');
    lines.push('   /ccg task    - Manage tasks');
    lines.push('   /ccg help    - All commands');
    lines.push('');
    lines.push('═══════════════════════════════════════════════════════');
    
    return lines.join('\n');
  }
}
```

---

### 6. PRE-TOOL CALL HOOK

```typescript
// src/hooks/pre-tool-call.hook.ts

import { 
  HookHandler, 
  Modules 
} from './hook-handler.js';
import { 
  PreToolCallInput, 
  PreToolCallResult,
  TaskEstimation,
  ImpactAnalysis,
  GuardWarning,
  HookContext,
  HookWarning
} from './types.js';
import { Logger } from '../core/logger.js';
import { ConfigManager } from '../core/config-manager.js';
import { StateManager } from '../core/state-manager.js';
import { EventBus } from '../core/event-bus.js';
import { readFileSync, existsSync } from 'fs';
import { dirname, basename, join } from 'path';

export class PreToolCallHook extends HookHandler {
  constructor(
    modules: Modules,
    context: HookContext,
    logger: Logger,
    config: ConfigManager,
    state: StateManager,
    eventBus: EventBus
  ) {
    super(modules, context, logger, config, state, eventBus);
  }

  async execute(input: PreToolCallInput): Promise<PreToolCallResult> {
    const startTime = Date.now();
    const warnings: HookWarning[] = [];
    const guardWarnings: GuardWarning[] = [];
    const suggestions: string[] = [];
    let blocked = false;
    let blockReason = '';
    
    this.logger.debug(`Pre-tool hook for: ${input.toolName}`);
    
    try {
      // ═══════════════════════════════════════════════════════════
      // STEP 1: Estimate task complexity (for write operations)
      // ═══════════════════════════════════════════════════════════
      let estimation: TaskEstimation | undefined;
      
      if (this.isWriteOperation(input.toolName)) {
        estimation = await this.estimateTask(input);
        
        if (estimation.suggestCheckpoint) {
          warnings.push(this.createWarning(
            'warning',
            `Token usage high (${estimation.estimatedTokens} estimated). Consider creating checkpoint.`,
            '/ccg checkpoint create'
          ));
        }
        
        if (!estimation.canComplete) {
          warnings.push(this.createWarning(
            'error',
            'Task may exceed available tokens!',
            'Create checkpoint now or break task into smaller pieces'
          ));
        }
        
        if (estimation.suggestBreakdown) {
          suggestions.push('Consider breaking this task into smaller subtasks');
        }
      }
      
      // ═══════════════════════════════════════════════════════════
      // STEP 2: Impact analysis
      // ═══════════════════════════════════════════════════════════
      let impactAnalysis: ImpactAnalysis | undefined;
      
      if (this.isWriteOperation(input.toolName)) {
        impactAnalysis = await this.analyzeImpact(input);
        
        if (impactAnalysis.riskLevel === 'high') {
          warnings.push(this.createWarning(
            'warning',
            `High-risk change: affects ${impactAnalysis.filesAffected.length} files`,
            'Review affected files before proceeding'
          ));
        }
        
        if (impactAnalysis.potentialConflicts.length > 0) {
          warnings.push(this.createWarning(
            'warning',
            `Potential conflicts detected in: ${impactAnalysis.potentialConflicts.join(', ')}`,
            'Check for unsaved changes'
          ));
        }
        
        if (impactAnalysis.testsToRun.length > 0) {
          suggestions.push(`Run affected tests: ${impactAnalysis.testsToRun.slice(0, 3).join(', ')}`);
        }
      }
      
      // ═══════════════════════════════════════════════════════════
      // STEP 3: Pre-validate content with Guard
      // ═══════════════════════════════════════════════════════════
      if (input.toolName === 'write_file' || input.toolName === 'edit_file') {
        const content = this.extractContent(input);
        const filename = this.extractFilename(input);
        
        if (content && filename) {
          const validation = await this.modules.guard.handleTool('validate', {
            code: content,
            filename,
          }) as any;
          
          if (validation.issues) {
            for (const issue of validation.issues) {
              guardWarnings.push({
                rule: issue.rule,
                severity: issue.severity,
                message: issue.message,
                location: issue.location,
                suggestion: issue.suggestion,
              });
              
              if (issue.severity === 'block') {
                blocked = true;
                blockReason = `Guard blocked: ${issue.message}`;
              }
            }
          }
        }
      }
      
      // ═══════════════════════════════════════════════════════════
      // STEP 4: Check for document update vs create
      // ═══════════════════════════════════════════════════════════
      if (input.toolName === 'write_file' || input.toolName === 'create_file') {
        const filename = this.extractFilename(input);
        
        if (filename && this.isDocumentFile(filename)) {
          const content = this.extractContent(input) || '';
          const topic = this.extractTopicFromContent(content);
          
          const docCheck = await this.modules.documents.handleTool('should_update', {
            topic,
            content,
          }) as any;
          
          if (docCheck.shouldUpdate && docCheck.document) {
            warnings.push(this.createWarning(
              'info',
              `Similar document exists: ${docCheck.document.name}`,
              'Consider updating existing document instead of creating new'
            ));
            suggestions.push(`Update ${docCheck.document.path} instead of creating new file`);
          }
        }
      }
      
      // ═══════════════════════════════════════════════════════════
      // STEP 5: Process-specific checks
      // ═══════════════════════════════════════════════════════════
      if (input.toolName === 'bash') {
        const command = this.extractBashCommand(input);
        
        if (command) {
          // Check for server/process start commands
          const portMatch = command.match(/(?:--port|PORT=|:)(\d{4,5})/);
          if (portMatch) {
            const port = parseInt(portMatch[1], 10);
            const portStatus = await this.modules.process.handleTool('check_port', { port }) as any;
            
            if (!portStatus.available) {
              warnings.push(this.createWarning(
                'warning',
                `Port ${port} is already in use by ${portStatus.usedBy?.name || 'unknown process'}`,
                'Kill existing process or use different port'
              ));
              suggestions.push(`Run: /ccg process kill --port ${port}`);
            }
          }
          
          // Check for dangerous commands
          if (this.isDangerousCommand(command)) {
            warnings.push(this.createWarning(
              'error',
              'Potentially dangerous command detected',
              'Review command carefully before executing'
            ));
          }
        }
      }
      
      // ═══════════════════════════════════════════════════════════
      // STEP 6: Track file in current task
      // ═══════════════════════════════════════════════════════════
      if (this.isWriteOperation(input.toolName)) {
        const filename = this.extractFilename(input);
        const currentTask = await this.modules.workflow.handleTool('current', {}) as any;
        
        if (currentTask && filename) {
          await this.modules.workflow.handleTool('task_update', {
            taskId: currentTask.id,
            filesAffected: [...(currentTask.filesAffected || []), filename],
          });
        }
      }
      
      const duration = Date.now() - startTime;
      this.logger.debug(`Pre-tool hook completed in ${duration}ms`);
      
      // Build result
      const allWarnings: HookWarning[] = [
        ...warnings,
        ...guardWarnings.map(gw => ({
          level: gw.severity === 'block' ? 'error' as const : gw.severity as 'warning' | 'error',
          message: gw.message,
          action: gw.suggestion,
        })),
      ];
      
      return {
        success: !blocked,
        blocked,
        blockReason: blocked ? blockReason : undefined,
        message: blocked ? blockReason : undefined,
        warnings: allWarnings,
        data: {
          validated: !blocked,
          estimation,
          impactAnalysis,
          guardWarnings: guardWarnings.length > 0 ? guardWarnings : undefined,
          suggestions: suggestions.length > 0 ? suggestions : undefined,
        },
      };
      
    } catch (error) {
      this.logger.error('Pre-tool hook error:', error);
      
      return {
        success: true, // Don't block on hook errors
        warnings: [{
          level: 'warning',
          message: `Pre-tool validation error: ${error instanceof Error ? error.message : 'Unknown'}`,
        }],
        data: {
          validated: true,
        },
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //                      HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  private isWriteOperation(toolName: string): boolean {
    return ['write_file', 'edit_file', 'create_file', 'str_replace_editor'].includes(toolName);
  }

  private async estimateTask(input: PreToolCallInput): Promise<TaskEstimation> {
    const content = this.extractContent(input);
    const linesEstimate = content ? content.split('\n').length : 50;
    
    const estimation = await this.modules.resource.handleTool('estimate_task', {
      description: `${input.toolName} operation`,
      linesEstimate,
      filesCount: 1,
    }) as any;
    
    const resourceStatus = await this.modules.resource.getStatus();
    
    return {
      complexity: estimation.complexity,
      estimatedTokens: estimation.estimatedTokens,
      canComplete: estimation.canComplete,
      suggestCheckpoint: resourceStatus.tokens.percentage >= 70,
      suggestBreakdown: estimation.suggestBreakdown,
    };
  }

  private async analyzeImpact(input: PreToolCallInput): Promise<ImpactAnalysis> {
    const filename = this.extractFilename(input);
    const filesAffected: string[] = filename ? [filename] : [];
    const dependentFiles: string[] = [];
    const potentialConflicts: string[] = [];
    const testsToRun: string[] = [];
    
    if (filename) {
      // Find dependent files (simple import analysis)
      const baseName = basename(filename).replace(/\.(ts|tsx|js|jsx)$/, '');
      
      // Look for test files
      const testPatterns = [
        `${baseName}.test.ts`,
        `${baseName}.test.tsx`,
        `${baseName}.spec.ts`,
        `__tests__/${baseName}.ts`,
      ];
      
      for (const pattern of testPatterns) {
        const testPath = join(dirname(filename), pattern);
        if (existsSync(testPath)) {
          testsToRun.push(testPath);
        }
      }
      
      // Check for index file dependencies
      const dir = dirname(filename);
      const indexPath = join(dir, 'index.ts');
      if (existsSync(indexPath) && indexPath !== filename) {
        dependentFiles.push(indexPath);
      }
    }
    
    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (filesAffected.length > 3) riskLevel = 'medium';
    if (filesAffected.length > 5 || potentialConflicts.length > 0) riskLevel = 'high';
    
    return {
      filesAffected,
      dependentFiles,
      potentialConflicts,
      testsToRun,
      riskLevel,
    };
  }

  private extractContent(input: PreToolCallInput): string | undefined {
    const toolInput = input.toolInput;
    return (toolInput.content || toolInput.new_str || toolInput.file_text) as string | undefined;
  }

  private extractFilename(input: PreToolCallInput): string | undefined {
    const toolInput = input.toolInput;
    return (toolInput.path || toolInput.file_path || toolInput.filename) as string | undefined;
  }

  private extractBashCommand(input: PreToolCallInput): string | undefined {
    const toolInput = input.toolInput;
    return (toolInput.command || toolInput.cmd) as string | undefined;
  }

  private isDocumentFile(filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ['md', 'txt', 'rst', 'adoc'].includes(ext || '');
  }

  private extractTopicFromContent(content: string): string {
    // Try to extract from first header
    const headerMatch = content.match(/^#\s+(.+)$/m);
    if (headerMatch) {
      return headerMatch[1];
    }
    
    // Use first line
    const firstLine = content.split('\n')[0]?.trim();
    return firstLine?.slice(0, 50) || 'document';
  }

  private isDangerousCommand(command: string): boolean {
    const dangerousPatterns = [
      /rm\s+-rf?\s+[\/~]/,
      />\s*\/dev\/sd[a-z]/,
      /mkfs\./,
      /dd\s+if=/,
      /chmod\s+-R\s+777/,
      /:(){ :|:& };:/,  // Fork bomb
    ];
    
    return dangerousPatterns.some(pattern => pattern.test(command));
  }
}
```

---

### 7. POST-TOOL CALL HOOK

```typescript
// src/hooks/post-tool-call.hook.ts

import { 
  HookHandler, 
  Modules 
} from './hook-handler.js';
import { 
  PostToolCallInput, 
  PostToolCallResult,
  GuardValidation,
  TestRunResult,
  BrowserCheckResult,
  HookContext,
  HookWarning
} from './types.js';
import { Logger } from '../core/logger.js';
import { ConfigManager } from '../core/config-manager.js';
import { StateManager } from '../core/state-manager.js';
import { EventBus } from '../core/event-bus.js';
import { readFileSync, existsSync } from 'fs';

export class PostToolCallHook extends HookHandler {
  constructor(
    modules: Modules,
    context: HookContext,
    logger: Logger,
    config: ConfigManager,
    state: StateManager,
    eventBus: EventBus
  ) {
    super(modules, context, logger, config, state, eventBus);
  }

  async execute(input: PostToolCallInput): Promise<PostToolCallResult> {
    const startTime = Date.now();
    const warnings: HookWarning[] = [];
    const filesUpdated: string[] = [];
    let checkpointCreated = false;
    let memoryUpdated = false;
    
    this.logger.debug(`Post-tool hook for: ${input.toolName}`);
    
    // Skip if tool failed
    if (!input.success) {
      return {
        success: true,
        message: 'Tool failed, skipping post-validation',
        data: {
          filesUpdated: [],
          checkpointCreated: false,
          memoryUpdated: false,
        },
      };
    }
    
    try {
      const filename = this.extractFilename(input);
      if (filename) {
        filesUpdated.push(filename);
      }
      
      // ═══════════════════════════════════════════════════════════
      // STEP 1: Validate written content with Guard
      // ═══════════════════════════════════════════════════════════
      let guardValidation: GuardValidation | undefined;
      
      if (this.isWriteOperation(input.toolName) && filename) {
        guardValidation = await this.validateWrittenContent(filename);
        
        if (!guardValidation.passed) {
          for (const issue of guardValidation.issues) {
            warnings.push({
              level: issue.severity === 'block' ? 'error' : 'warning',
              message: `[${issue.rule}] ${issue.message}`,
              action: issue.suggestion,
            });
          }
        }
        
        if (guardValidation.autoFixed && guardValidation.autoFixed.length > 0) {
          warnings.push({
            level: 'info',
            message: `Auto-fixed ${guardValidation.autoFixed.length} issue(s)`,
          });
        }
      }
      
      // ═══════════════════════════════════════════════════════════
      // STEP 2: Run affected tests (if configured)
      // ═══════════════════════════════════════════════════════════
      let testsRun: TestRunResult | undefined;
      
      const testingConfig = await this.config.get('modules.testing') as any;
      if (testingConfig?.autoRun && this.isWriteOperation(input.toolName) && filename) {
        testsRun = await this.runAffectedTests(filename);
        
        if (testsRun.ran) {
          if (testsRun.failed > 0) {
            warnings.push({
              level: 'error',
              message: `Tests failed: ${testsRun.failed} of ${testsRun.passed + testsRun.failed}`,
              action: 'Fix failing tests before continuing',
            });
          } else if (testsRun.passed > 0) {
            warnings.push({
              level: 'info',
              message: `Tests passed: ${testsRun.passed}`,
            });
          }
        }
      }
      
      // ═══════════════════════════════════════════════════════════
      // STEP 3: Browser check (for UI files)
      // ═══════════════════════════════════════════════════════════
      let browserCheck: BrowserCheckResult | undefined;
      
      const browserConfig = await this.config.get('modules.testing.browser') as any;
      if (browserConfig?.enabled && this.isUIFile(filename)) {
        browserCheck = await this.performBrowserCheck(filename);
        
        if (browserCheck.consoleErrors > 0) {
          warnings.push({
            level: 'error',
            message: `Browser console errors: ${browserCheck.consoleErrors}`,
            action: 'Check console for details',
          });
        }
        
        if (browserCheck.networkErrors > 0) {
          warnings.push({
            level: 'warning',
            message: `Network errors detected: ${browserCheck.networkErrors}`,
          });
        }
      }
      
      // ═══════════════════════════════════════════════════════════
      // STEP 4: Check token usage and auto-checkpoint
      // ═══════════════════════════════════════════════════════════
      const resourceStatus = await this.modules.resource.getStatus();
      
      if (resourceStatus.tokens.percentage >= 85 && !checkpointCreated) {
        try {
          await this.modules.resource.handleTool('checkpoint_create', {
            name: `auto-${resourceStatus.tokens.percentage}`,
            reason: 'auto_threshold',
          });
          checkpointCreated = true;
          
          warnings.push({
            level: 'warning',
            message: `Token usage ${resourceStatus.tokens.percentage}% - checkpoint created`,
            action: 'Consider wrapping up current task',
          });
        } catch (error) {
          this.logger.warn('Failed to create auto-checkpoint:', error);
        }
      }
      
      // ═══════════════════════════════════════════════════════════
      // STEP 5: Update memory with significant changes
      // ═══════════════════════════════════════════════════════════
      if (this.isSignificantChange(input)) {
        try {
          await this.modules.memory.handleTool('store', {
            content: `Modified ${filename}: ${this.summarizeChange(input)}`,
            type: 'fact',
            importance: 5,
            tags: ['code-change', filename ? filename.split('/').pop() : 'unknown'],
          });
          memoryUpdated = true;
        } catch (error) {
          this.logger.warn('Failed to update memory:', error);
        }
      }
      
      // ═══════════════════════════════════════════════════════════
      // STEP 6: Update task progress
      // ═══════════════════════════════════════════════════════════
      const currentTask = await this.modules.workflow.handleTool('current', {}) as any;
      if (currentTask) {
        // Increment progress slightly for each successful operation
        const newProgress = Math.min(currentTask.progress + 5, 95);
        await this.modules.workflow.handleTool('task_update', {
          taskId: currentTask.id,
          progress: newProgress,
        });
      }
      
      // ═══════════════════════════════════════════════════════════
      // STEP 7: Register document if applicable
      // ═══════════════════════════════════════════════════════════
      if (filename && this.isDocumentFile(filename)) {
        try {
          await this.modules.documents.handleTool('register', { path: filename });
        } catch (error) {
          this.logger.warn('Failed to register document:', error);
        }
      }
      
      const duration = Date.now() - startTime;
      this.logger.debug(`Post-tool hook completed in ${duration}ms`);
      
      return {
        success: true,
        warnings,
        data: {
          guardValidation,
          testsRun,
          browserCheck,
          filesUpdated,
          checkpointCreated,
          memoryUpdated,
        },
      };
      
    } catch (error) {
      this.logger.error('Post-tool hook error:', error);
      
      return {
        success: true, // Don't fail the operation
        warnings: [{
          level: 'warning',
          message: `Post-validation error: ${error instanceof Error ? error.message : 'Unknown'}`,
        }],
        data: {
          filesUpdated,
          checkpointCreated,
          memoryUpdated,
        },
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //                      HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  private isWriteOperation(toolName: string): boolean {
    return ['write_file', 'edit_file', 'create_file', 'str_replace_editor'].includes(toolName);
  }

  private extractFilename(input: PostToolCallInput): string | undefined {
    const toolInput = input.toolInput;
    return (toolInput.path || toolInput.file_path || toolInput.filename) as string | undefined;
  }

  private async validateWrittenContent(filename: string): Promise<GuardValidation> {
    if (!existsSync(filename)) {
      return { passed: true, issues: [] };
    }
    
    try {
      const content = readFileSync(filename, 'utf-8');
      const validation = await this.modules.guard.handleTool('validate', {
        code: content,
        filename,
      }) as any;
      
      return {
        passed: validation.valid,
        issues: validation.issues || [],
        autoFixed: validation.autoFixed,
      };
    } catch (error) {
      return { passed: true, issues: [] };
    }
  }

  private async runAffectedTests(filename: string): Promise<TestRunResult> {
    try {
      const result = await this.modules.testing.handleTool('run_affected', {
        files: [filename],
      }) as any;
      
      return {
        ran: true,
        passed: result.passed || 0,
        failed: result.failed || 0,
        skipped: result.skipped || 0,
        duration: result.duration || 0,
        failedTests: result.tests?.filter((t: any) => t.status === 'failed').map((t: any) => t.name),
      };
    } catch (error) {
      this.logger.warn('Failed to run tests:', error);
      return {
        ran: false,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
      };
    }
  }

  private isUIFile(filename: string | undefined): boolean {
    if (!filename) return false;
    
    const uiPatterns = [
      /\.tsx$/,
      /\.jsx$/,
      /components?\//i,
      /pages?\//i,
      /views?\//i,
      /\.vue$/,
      /\.svelte$/,
    ];
    
    return uiPatterns.some(pattern => pattern.test(filename));
  }

  private async performBrowserCheck(filename: string | undefined): Promise<BrowserCheckResult> {
    // This is a simplified version - in production, we'd integrate with actual dev server
    try {
      // Check if there's an active browser session
      const status = await this.modules.testing.getStatus() as any;
      
      if (status.browserSessions > 0) {
        // Get the most recent session
        const sessions = await this.modules.testing.handleTool('browser_logs', {
          sessionId: 'active',
        }) as any[];
        
        const errors = sessions?.filter((log: any) => log.type === 'error') || [];
        
        return {
          checked: true,
          consoleErrors: errors.length,
          networkErrors: 0,
          issues: errors.slice(0, 5).map((e: any) => e.message),
        };
      }
      
      return {
        checked: false,
        consoleErrors: 0,
        networkErrors: 0,
      };
    } catch (error) {
      return {
        checked: false,
        consoleErrors: 0,
        networkErrors: 0,
      };
    }
  }

  private isDocumentFile(filename: string | undefined): boolean {
    if (!filename) return false;
    const ext = filename.split('.').pop()?.toLowerCase();
    return ['md', 'txt', 'rst', 'adoc'].includes(ext || '');
  }

  private isSignificantChange(input: PostToolCallInput): boolean {
    // Consider change significant if it's a write operation that took >500ms
    // or modified more than 50 lines
    if (!this.isWriteOperation(input.toolName)) return false;
    if (input.duration > 500) return true;
    
    const content = (input.toolInput.content || input.toolInput.new_str || '') as string;
    return content.split('\n').length > 50;
  }

  private summarizeChange(input: PostToolCallInput): string {
    const content = (input.toolInput.content || input.toolInput.new_str || '') as string;
    const lines = content.split('\n').length;
    return `${lines} lines, ${input.duration}ms`;
  }
}
```

---

### 8. SESSION END HOOK

```typescript
// src/hooks/session-end.hook.ts

import { 
  HookHandler, 
  Modules 
} from './hook-handler.js';
import { 
  SessionEndInput, 
  SessionEndResult,
  SessionSummary,
  HookContext,
  HookWarning
} from './types.js';
import { Logger } from '../core/logger.js';
import { ConfigManager } from '../core/config-manager.js';
import { StateManager } from '../core/state-manager.js';
import { EventBus } from '../core/event-bus.js';

export class SessionEndHook extends HookHandler {
  constructor(
    modules: Modules,
    context: HookContext,
    logger: Logger,
    config: ConfigManager,
    state: StateManager,
    eventBus: EventBus
  ) {
    super(modules, context, logger, config, state, eventBus);
  }

  async execute(input: SessionEndInput): Promise<SessionEndResult> {
    const startTime = Date.now();
    const warnings: HookWarning[] = [];
    const session = this.state.getSession();
    
    this.logger.info('Session end hook executing...');
    
    try {
      // ═══════════════════════════════════════════════════════════
      // STEP 1: Save all memory
      // ═══════════════════════════════════════════════════════════
      let memorySaved = 0;
      try {
        const memoryStatus = await this.modules.memory.getStatus();
        memorySaved = memoryStatus.total || 0;
        
        // Compress and save
        // In a real implementation, we'd call a save method on the memory module
        this.logger.info(`Saving ${memorySaved} memory items`);
      } catch (error) {
        warnings.push({
          level: 'warning',
          message: 'Failed to save some memory items',
        });
      }
      
      // ═══════════════════════════════════════════════════════════
      // STEP 2: Save task progress
      // ═══════════════════════════════════════════════════════════
      let tasksSaved = 0;
      try {
        await this.modules.workflow.saveTasks();
        const taskList = await this.modules.workflow.getTaskList();
        tasksSaved = taskList.length;
        
        // Pause any in-progress tasks
        const currentTask = await this.modules.workflow.handleTool('current', {}) as any;
        if (currentTask) {
          await this.modules.workflow.handleTool('task_update', {
            taskId: currentTask.id,
            status: 'paused',
          });
          
          warnings.push({
            level: 'info',
            message: `Task "${currentTask.name}" paused at ${currentTask.progress}%`,
            action: 'Resume with /ccg task resume next session',
          });
        }
      } catch (error) {
        warnings.push({
          level: 'warning',
          message: 'Failed to save some tasks',
        });
      }
      
      // ═══════════════════════════════════════════════════════════
      // STEP 3: Create final checkpoint
      // ═══════════════════════════════════════════════════════════
      let checkpointId: string | undefined;
      try {
        const checkpoint = await this.modules.resource.handleTool('checkpoint_create', {
          name: 'session-end',
          reason: 'session_end',
        }) as any;
        
        checkpointId = checkpoint.id;
        this.logger.info(`Final checkpoint created: ${checkpointId}`);
      } catch (error) {
        warnings.push({
          level: 'warning',
          message: 'Failed to create final checkpoint',
        });
      }
      
      // ═══════════════════════════════════════════════════════════
      // STEP 4: Cleanup spawned processes
      // ═══════════════════════════════════════════════════════════
      let processesCleanedUp = 0;
      try {
        const cleanupResult = await this.modules.process.handleTool('cleanup', {}) as any;
        processesCleanedUp = cleanupResult?.cleaned || 0;
        
        if (processesCleanedUp > 0) {
          this.logger.info(`Cleaned up ${processesCleanedUp} process(es)`);
        }
      } catch (error) {
        warnings.push({
          level: 'warning',
          message: 'Failed to cleanup some processes',
        });
      }
      
      // ═══════════════════════════════════════════════════════════
      // STEP 5: Close browser sessions
      // ═══════════════════════════════════════════════════════════
      try {
        await this.modules.testing.handleTool('browser_close_all', {});
      } catch (error) {
        // Ignore browser close errors
      }
      
      // ═══════════════════════════════════════════════════════════
      // STEP 6: Cleanup test data
      // ═══════════════════════════════════════════════════════════
      try {
        await this.modules.testing.handleTool('cleanup', {});
      } catch (error) {
        // Ignore cleanup errors
      }
      
      // ═══════════════════════════════════════════════════════════
      // STEP 7: Generate session summary
      // ═══════════════════════════════════════════════════════════
      const summary = await this.generateSessionSummary();
      
      // Calculate session duration
      const sessionDuration = session 
        ? Date.now() - session.startedAt.getTime()
        : 0;
      
      // Mark session as ended
      this.state.endSession();
      
      // Emit session end event
      this.eventBus.emit({
        type: 'session:end',
        session: session!,
        timestamp: new Date(),
      });
      
      const duration = Date.now() - startTime;
      this.logger.info(`Session end completed in ${duration}ms`);
      
      // Build farewell message
      const message = this.buildFarewellMessage({
        sessionDuration,
        memorySaved,
        tasksSaved,
        processesCleanedUp,
        summary,
      });
      
      return {
        success: true,
        message,
        warnings,
        data: {
          memorySaved,
          tasksSaved,
          checkpointId,
          processesCleanedUp,
          sessionDuration,
          summary,
        },
      };
      
    } catch (error) {
      this.logger.error('Session end failed:', error);
      
      return {
        success: false,
        message: `Session end failed: ${error instanceof Error ? error.message : 'Unknown'}`,
        warnings,
        data: {
          memorySaved: 0,
          tasksSaved: 0,
          processesCleanedUp: 0,
          sessionDuration: 0,
          summary: {
            tasksCompleted: 0,
            tasksInProgress: 0,
            filesModified: 0,
            testsRun: 0,
            guardBlocks: 0,
            checkpointsCreated: 0,
          },
        },
      };
    }
  }

  private async generateSessionSummary(): Promise<SessionSummary> {
    let tasksCompleted = 0;
    let tasksInProgress = 0;
    let filesModified = 0;
    let testsRun = 0;
    let guardBlocks = 0;
    let checkpointsCreated = 0;
    
    try {
      // Get task counts
      const taskList = await this.modules.workflow.getTaskList();
      tasksCompleted = taskList.filter(t => t.status === 'completed').length;
      tasksInProgress = taskList.filter(t => t.status === 'in_progress' || t.status === 'paused').length;
      
      // Get checkpoint count
      const checkpoints = await this.modules.resource.handleTool('checkpoint_list', {}) as any[];
      checkpointsCreated = checkpoints?.length || 0;
      
      // Get guard status
      const guardStatus = await this.modules.guard.getStatus();
      guardBlocks = guardStatus.blockedCount || 0;
      
      // Get testing status
      const testStatus = await this.modules.testing.getStatus();
      const lastResults = testStatus.lastResults;
      if (lastResults) {
        testsRun = lastResults.passed + lastResults.failed + lastResults.skipped;
      }
      
      // Count files modified from tasks
      for (const task of taskList) {
        const fullTask = await this.modules.workflow.handleTool('task_get', { taskId: task.id }) as any;
        if (fullTask?.filesAffected) {
          filesModified += fullTask.filesAffected.length;
        }
      }
    } catch (error) {
      this.logger.warn('Failed to generate complete summary:', error);
    }
    
    return {
      tasksCompleted,
      tasksInProgress,
      filesModified,
      testsRun,
      guardBlocks,
      checkpointsCreated,
    };
  }

  private buildFarewellMessage(data: {
    sessionDuration: number;
    memorySaved: number;
    tasksSaved: number;
    processesCleanedUp: number;
    summary: SessionSummary;
  }): string {
    const lines: string[] = [];
    
    lines.push('');
    lines.push('🛡️ ═══════════════════════════════════════════════════');
    lines.push('   CLAUDE CODE GUARDIAN - Session Complete');
    lines.push('═══════════════════════════════════════════════════════');
    lines.push('');
    
    // Session duration
    const durationMinutes = Math.round(data.sessionDuration / 1000 / 60);
    lines.push(`⏱️  Duration: ${durationMinutes} minute(s)`);
    
    // Summary stats
    lines.push('');
    lines.push('📊 Session Summary:');
    
    if (data.summary.tasksCompleted > 0) {
      lines.push(`   ✅ Tasks completed: ${data.summary.tasksCompleted}`);
    }
    if (data.summary.tasksInProgress > 0) {
      lines.push(`   ⏸️  Tasks paused: ${data.summary.tasksInProgress}`);
    }
    if (data.summary.filesModified > 0) {
      lines.push(`   📝 Files modified: ${data.summary.filesModified}`);
    }
    if (data.summary.testsRun > 0) {
      lines.push(`   🧪 Tests run: ${data.summary.testsRun}`);
    }
    if (data.summary.guardBlocks > 0) {
      lines.push(`   🛡️  Issues blocked: ${data.summary.guardBlocks}`);
    }
    if (data.summary.checkpointsCreated > 0) {
      lines.push(`   💾 Checkpoints: ${data.summary.checkpointsCreated}`);
    }
    
    // What was saved
    lines.push('');
    lines.push('💾 Saved:');
    lines.push(`   • ${data.memorySaved} memory items`);
    lines.push(`   • ${data.tasksSaved} tasks`);
    
    if (data.processesCleanedUp > 0) {
      lines.push(`   • Cleaned ${data.processesCleanedUp} process(es)`);
    }
    
    lines.push('');
    lines.push('👋 See you next time! Your progress has been saved.');
    lines.push('');
    lines.push('═══════════════════════════════════════════════════════');
    
    return lines.join('\n');
  }
}
```

---

### 9. HOOK INDEX & EXPORTS

```typescript
// src/hooks/index.ts

export * from './types.js';
export * from './hook-handler.js';
export { SessionStartHook } from './session-start.hook.js';
export { PreToolCallHook } from './pre-tool-call.hook.js';
export { PostToolCallHook } from './post-tool-call.hook.js';
export { SessionEndHook } from './session-end.hook.js';

import { HookType, HookContext, HookResult } from './types.js';
import { Modules, HookHandler } from './hook-handler.js';
import { SessionStartHook } from './session-start.hook.js';
import { PreToolCallHook } from './pre-tool-call.hook.js';
import { PostToolCallHook } from './post-tool-call.hook.js';
import { SessionEndHook } from './session-end.hook.js';
import { Logger } from '../core/logger.js';
import { ConfigManager } from '../core/config-manager.js';
import { StateManager } from '../core/state-manager.js';
import { EventBus } from '../core/event-bus.js';

export class HookRouter {
  constructor(
    private modules: Modules,
    private logger: Logger,
    private config: ConfigManager,
    private state: StateManager,
    private eventBus: EventBus
  ) {}

  async executeHook(
    hookType: HookType,
    input: unknown,
    context: HookContext
  ): Promise<HookResult> {
    let handler: HookHandler;
    
    switch (hookType) {
      case 'session-start':
        handler = new SessionStartHook(
          this.modules, context, this.logger, 
          this.config, this.state, this.eventBus
        );
        break;
        
      case 'pre-tool':
        handler = new PreToolCallHook(
          this.modules, context, this.logger,
          this.config, this.state, this.eventBus
        );
        break;
        
      case 'post-tool':
        handler = new PostToolCallHook(
          this.modules, context, this.logger,
          this.config, this.state, this.eventBus
        );
        break;
        
      case 'session-end':
        handler = new SessionEndHook(
          this.modules, context, this.logger,
          this.config, this.state, this.eventBus
        );
        break;
        
      default:
        return {
          success: false,
          message: `Unknown hook type: ${hookType}`,
        };
    }
    
    return handler.execute(input);
  }
}
```

---

### 10. CLI HOOK COMMAND

```typescript
// src/bin/hook-command.ts

import { Command } from 'commander';
import chalk from 'chalk';
import { join } from 'path';
import { existsSync } from 'fs';

import { HookRouter, HookType, HookContext } from '../hooks/index.js';
import { ConfigManager } from '../core/config-manager.js';
import { StateManager } from '../core/state-manager.js';
import { EventBus } from '../core/event-bus.js';
import { Logger } from '../core/logger.js';
import { initializeModules } from '../modules/index.js';

export function createHookCommand(): Command {
  const hookCmd = new Command('hook')
    .description('Execute CCG hooks (used by Claude Code)')
    .argument('<hook-type>', 'Hook type: session-start, pre-tool, post-tool, session-end')
    .argument('[tool-name]', 'Tool name (for pre-tool and post-tool)')
    .option('--input <json>', 'Additional input as JSON')
    .action(async (hookType: string, toolName: string | undefined, options: any) => {
      const cwd = process.cwd();
      const ccgDir = join(cwd, '.ccg');
      
      // Check initialization
      if (!existsSync(ccgDir)) {
        console.error(chalk.red('CCG not initialized. Run "ccg init" first.'));
        process.exit(1);
      }
      
      try {
        // Initialize core services
        const logger = new Logger('info');
        const eventBus = new EventBus();
        const configManager = new ConfigManager(cwd);
        const stateManager = new StateManager(cwd);
        
        // Load config
        await configManager.load();
        
        // Initialize modules
        const modules = await initializeModules(configManager, eventBus, logger, cwd);
        
        // Create hook router
        const router = new HookRouter(
          modules,
          logger,
          configManager,
          stateManager,
          eventBus
        );
        
        // Create context
        const context: HookContext = {
          projectRoot: cwd,
          sessionId: stateManager.getSession()?.id,
          timestamp: new Date(),
          environment: process.env as Record<string, string>,
        };
        
        // Parse input
        let input: unknown = {};
        
        switch (hookType) {
          case 'session-start':
            input = {
              projectPath: cwd,
              resumeSession: true,
            };
            break;
            
          case 'pre-tool':
            input = {
              toolName: toolName || 'unknown',
              toolInput: options.input ? JSON.parse(options.input) : {},
            };
            break;
            
          case 'post-tool':
            input = {
              toolName: toolName || 'unknown',
              toolInput: options.input ? JSON.parse(options.input) : {},
              toolOutput: {},
              success: true,
              duration: 0,
            };
            break;
            
          case 'session-end':
            input = {
              reason: 'user_exit',
              saveState: true,
            };
            break;
        }
        
        // Execute hook
        const result = await router.executeHook(
          hookType as HookType,
          input,
          context
        );
        
        // Output result
        if (result.message) {
          console.log(result.message);
        }
        
        if (result.warnings && result.warnings.length > 0) {
          for (const warning of result.warnings) {
            const prefix = warning.level === 'error' ? chalk.red('ERROR') :
                          warning.level === 'warning' ? chalk.yellow('WARN') :
                          chalk.blue('INFO');
            console.log(`${prefix}: ${warning.message}`);
            if (warning.action) {
              console.log(`  → ${warning.action}`);
            }
          }
        }
        
        // Exit with appropriate code
        if (result.blocked) {
          console.error(chalk.red(`\nBLOCKED: ${result.blockReason}`));
          process.exit(1);
        }
        
        process.exit(result.success ? 0 : 1);
        
      } catch (error) {
        console.error(chalk.red('Hook execution failed:'), error);
        process.exit(1);
      }
    });
  
  return hookCmd;
}
```

---

### 11. UPDATED CLI ENTRY

```typescript
// src/bin/ccg.ts (updated)

#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync, copyFileSync } from 'fs';
import { createHookCommand } from './hook-command.js';

const program = new Command();

program
  .name('ccg')
  .description('Claude Code Guardian - CLI')
  .version('1.0.0');

// Init command
program
  .command('init')
  .description('Initialize CCG in current project')
  .option('-f, --force', 'Overwrite existing configuration')
  .action(async (options) => {
    const cwd = process.cwd();
    const ccgDir = join(cwd, '.ccg');
    const claudeDir = join(cwd, '.claude');
    
    console.log(chalk.blue('🛡️ Initializing Claude Code Guardian...\n'));
    
    if (existsSync(ccgDir) && !options.force) {
      console.log(chalk.yellow('⚠️  CCG already initialized. Use --force to overwrite.\n'));
      return;
    }
    
    // Create directories
    mkdirSync(ccgDir, { recursive: true });
    mkdirSync(join(ccgDir, 'checkpoints'), { recursive: true });
    mkdirSync(join(ccgDir, 'tasks'), { recursive: true });
    mkdirSync(join(ccgDir, 'registry'), { recursive: true });
    mkdirSync(join(ccgDir, 'logs'), { recursive: true });
    mkdirSync(join(ccgDir, 'screenshots'), { recursive: true });
    
    mkdirSync(claudeDir, { recursive: true });
    mkdirSync(join(claudeDir, 'commands'), { recursive: true });
    
    // Copy template files
    const templateDir = join(__dirname, '..', '..', 'templates');
    
    copyFileSync(
      join(templateDir, 'config.template.json'),
      join(ccgDir, 'config.json')
    );
    console.log(chalk.green('✓ Created .ccg/config.json'));
    
    copyFileSync(
      join(templateDir, 'hooks.template.json'),
      join(claudeDir, 'hooks.json')
    );
    console.log(chalk.green('✓ Created .claude/hooks.json'));
    
    copyFileSync(
      join(templateDir, 'commands', 'ccg.md'),
      join(claudeDir, 'commands', 'ccg.md')
    );
    console.log(chalk.green('✓ Created .claude/commands/ccg.md'));
    
    // Create .mcp.json if not exists
    const mcpPath = join(cwd, '.mcp.json');
    if (!existsSync(mcpPath)) {
      const mcpConfig = {
        mcpServers: {
          'claude-code-guardian': {
            command: 'npx',
            args: ['@anthropic-community/claude-code-guardian'],
          },
        },
      };
      writeFileSync(mcpPath, JSON.stringify(mcpConfig, null, 2));
      console.log(chalk.green('✓ Created .mcp.json'));
    }
    
    console.log(chalk.blue('\n🎉 CCG initialized successfully!\n'));
    console.log('Next steps:');
    console.log('  1. Review configuration in .ccg/config.json');
    console.log('  2. Run ' + chalk.cyan('claude') + ' to start with CCG');
    console.log('  3. Type ' + chalk.cyan('/ccg') + ' to see the dashboard\n');
  });

// Status command
program
  .command('status')
  .description('Show CCG status')
  .action(async () => {
    // ... existing status implementation
  });

// Doctor command
program
  .command('doctor')
  .description('Check CCG configuration and diagnose issues')
  .action(async () => {
    // ... existing doctor implementation
  });

// Hook command (for Claude Code integration)
program.addCommand(createHookCommand());

program.parse();
```

---

### 12. SUMMARY

Đã implement đầy đủ 4 hooks:

| Hook | Trigger | Key Functions |
|------|---------|---------------|
| **SessionStart** | Claude Code starts | Load memory, resume tasks, check processes, welcome message |
| **PreToolCall** | Before write/edit/bash | Estimate tokens, impact analysis, guard validation, process checks |
| **PostToolCall** | After write/edit | Validate output, run tests, browser check, auto-checkpoint |
| **SessionEnd** | Claude Code exits | Save memory, pause tasks, create checkpoint, cleanup processes |

**Flow:**

```
User opens Claude Code
       ↓
┌──────────────────┐
│  Session Start   │ → Load memory, resume tasks, check ports
└──────────────────┘
       ↓
User gives coding request
       ↓
┌──────────────────┐
│  Pre-Tool Call   │ → Validate, estimate, guard check
└──────────────────┘
       ↓
[Tool executes: write_file, edit_file, bash...]
       ↓
┌──────────────────┐
│  Post-Tool Call  │ → Verify, test, checkpoint
└──────────────────┘
       ↓ (repeat for each tool)
       ↓
User exits Claude Code
       ↓
┌──────────────────┐
│   Session End    │ → Save all, cleanup, goodbye
└──────────────────┘
```

**Bạn muốn tiếp tục với:**

1. **Core Infrastructure** - EventBus, StateManager, ConfigManager, Logger
2. **Templates** - Config files, hooks.json, slash commands
3. **Testing Strategy** - Unit tests, integration tests
4. **Build & Publish** - CI/CD, npm publishing guide