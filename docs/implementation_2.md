## REMAINING MODULES IMPLEMENTATION

---

### 1. RESOURCE MODULE (Token & Checkpoint Management)

```typescript
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
  memory: any[];
  tasks: any[];
  filesChanged: string[];
  metadata: Record<string, unknown>;
}

export type CheckpointReason = 
  | 'auto_threshold' 
  | 'manual' 
  | 'task_complete' 
  | 'session_end'
  | 'error_recovery'
  | 'before_risky_operation';
```

```typescript
// src/modules/resource/resource.service.ts

import { writeFileSync, readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { v4 as uuid } from 'uuid';
import { 
  ResourceModuleConfig, 
  TokenUsage,
  ResourceStatus,
  TaskEstimate,
  CheckpointData,
  CheckpointInfo,
  ResourceWarning,
  CheckpointReason
} from '../../core/types.js';
import { EventBus } from '../../core/event-bus.js';
import { Logger } from '../../core/logger.js';

export class ResourceService {
  private tokenUsage: TokenUsage = {
    used: 0,
    estimated: 200000, // Default context window
    percentage: 0,
    lastUpdated: new Date(),
  };
  
  private checkpoints: CheckpointInfo[] = [];
  private checkpointDir: string;
  private lastAutoCheckpoint: number = 0;
  
  constructor(
    private config: ResourceModuleConfig,
    private eventBus: EventBus,
    private logger: Logger,
    private projectRoot: string = process.cwd()
  ) {
    this.checkpointDir = join(projectRoot, '.ccg', 'checkpoints');
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) return;
    
    // Load existing checkpoints
    await this.loadCheckpoints();
    
    // Subscribe to events for auto-checkpoint
    this.eventBus.on('task:complete', () => this.onTaskComplete());
    this.eventBus.on('session:end', () => this.onSessionEnd());
    
    this.logger.info(`Resource module initialized with ${this.checkpoints.length} checkpoints`);
  }

  // ═══════════════════════════════════════════════════════════════
  //                      TOKEN MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  updateTokenUsage(used: number, estimated?: number): ResourceStatus {
    this.tokenUsage.used = used;
    if (estimated) {
      this.tokenUsage.estimated = estimated;
    }
    this.tokenUsage.percentage = Math.round((used / this.tokenUsage.estimated) * 100);
    this.tokenUsage.lastUpdated = new Date();
    
    // Check thresholds for auto-checkpoint
    this.checkThresholds();
    
    return this.getStatus();
  }

  getStatus(): ResourceStatus {
    const warnings = this.getWarnings();
    
    return {
      tokens: {
        used: this.tokenUsage.used,
        estimated: this.tokenUsage.estimated,
        percentage: this.tokenUsage.percentage,
        remaining: this.tokenUsage.estimated - this.tokenUsage.used,
      },
      checkpoints: {
        count: this.checkpoints.length,
        lastCheckpoint: this.checkpoints[0],
        autoEnabled: this.config.checkpoints.auto,
      },
      warnings,
    };
  }

  private getWarnings(): ResourceWarning[] {
    const warnings: ResourceWarning[] = [];
    const percentage = this.tokenUsage.percentage;
    
    if (percentage >= this.config.pauseThreshold) {
      warnings.push({
        level: 'critical',
        message: `Token usage critical: ${percentage}%. Save work immediately!`,
        action: 'Create checkpoint and consider ending session',
      });
    } else if (percentage >= this.config.warningThreshold) {
      warnings.push({
        level: 'warning',
        message: `Token usage high: ${percentage}%. Consider checkpointing.`,
        action: 'Create checkpoint or wrap up current task',
      });
    }
    
    return warnings;
  }

  private checkThresholds(): void {
    if (!this.config.checkpoints.auto) return;
    
    const percentage = this.tokenUsage.percentage;
    
    for (const threshold of this.config.checkpoints.thresholds) {
      if (percentage >= threshold && this.lastAutoCheckpoint < threshold) {
        this.logger.info(`Auto-checkpoint triggered at ${threshold}%`);
        this.createCheckpoint({
          name: `auto-${threshold}`,
          reason: 'auto_threshold',
        });
        this.lastAutoCheckpoint = threshold;
        
        // Emit event
        this.eventBus.emit({
          type: 'resource:checkpoint',
          usage: this.tokenUsage,
          timestamp: new Date(),
        });
        
        break;
      }
    }
    
    // Emit warnings
    if (percentage >= this.config.pauseThreshold) {
      this.eventBus.emit({
        type: 'resource:critical',
        usage: this.tokenUsage,
        timestamp: new Date(),
      });
    } else if (percentage >= this.config.warningThreshold) {
      this.eventBus.emit({
        type: 'resource:warning',
        usage: this.tokenUsage,
        timestamp: new Date(),
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //                      TASK ESTIMATION
  // ═══════════════════════════════════════════════════════════════

  estimateTask(params: {
    description: string;
    filesCount?: number;
    linesEstimate?: number;
    hasTests?: boolean;
    hasBrowserTesting?: boolean;
  }): TaskEstimate {
    const { description, filesCount = 1, linesEstimate = 100, hasTests = false, hasBrowserTesting = false } = params;
    
    // Base estimation
    let baseTokens = 1000; // Minimum for any task
    
    // Complexity keywords
    const complexityIndicators = {
      low: ['fix', 'update', 'change', 'rename', 'simple', 'small', 'minor'],
      medium: ['add', 'create', 'implement', 'feature', 'component', 'function'],
      high: ['refactor', 'redesign', 'migrate', 'integrate', 'complex', 'system'],
      very_high: ['architecture', 'rewrite', 'overhaul', 'entire', 'complete', 'full'],
    };
    
    let complexity: 'low' | 'medium' | 'high' | 'very_high' = 'medium';
    const descLower = description.toLowerCase();
    
    for (const [level, keywords] of Object.entries(complexityIndicators)) {
      if (keywords.some(kw => descLower.includes(kw))) {
        complexity = level as any;
        break;
      }
    }
    
    // Multipliers
    const complexityMultiplier = {
      low: 1,
      medium: 2,
      high: 4,
      very_high: 8,
    };
    
    // Calculate tokens
    baseTokens *= complexityMultiplier[complexity];
    baseTokens += filesCount * 500; // Per file overhead
    baseTokens += linesEstimate * 5; // Per line estimate
    
    if (hasTests) {
      baseTokens *= 1.5; // Tests add 50%
    }
    
    if (hasBrowserTesting) {
      baseTokens *= 1.3; // Browser testing adds 30%
    }
    
    // Round to nearest 500
    const estimatedTokens = Math.ceil(baseTokens / 500) * 500;
    
    // Time estimate (rough)
    const minutesPerThousandTokens = 2;
    const estimatedMinutes = Math.ceil(estimatedTokens / 1000) * minutesPerThousandTokens;
    const estimatedTime = estimatedMinutes < 60 
      ? `${estimatedMinutes} minutes`
      : `${Math.ceil(estimatedMinutes / 60)} hour(s)`;
    
    // Check if can complete with remaining tokens
    const remaining = this.tokenUsage.estimated - this.tokenUsage.used;
    const canComplete = estimatedTokens < remaining * 0.8; // 20% buffer
    
    // Breakdown suggestions for complex tasks
    const suggestBreakdown = complexity === 'high' || complexity === 'very_high';
    let breakdownSuggestions: string[] | undefined;
    
    if (suggestBreakdown) {
      breakdownSuggestions = this.generateBreakdownSuggestions(description, complexity);
    }
    
    return {
      complexity,
      estimatedTokens,
      estimatedTime,
      suggestBreakdown,
      breakdownSuggestions,
      canComplete,
      warningMessage: canComplete ? undefined : 
        `Task may exceed available tokens. Consider breaking it down or creating a checkpoint first.`,
    };
  }

  private generateBreakdownSuggestions(description: string, complexity: string): string[] {
    const suggestions: string[] = [];
    
    if (complexity === 'very_high') {
      suggestions.push('1. Start with architecture/design documentation');
      suggestions.push('2. Implement core data structures/types');
      suggestions.push('3. Build foundation/base components');
      suggestions.push('4. Add business logic layer by layer');
      suggestions.push('5. Implement tests for each layer');
      suggestions.push('6. Final integration and polish');
    } else {
      suggestions.push('1. Define interfaces and types first');
      suggestions.push('2. Implement core functionality');
      suggestions.push('3. Add error handling');
      suggestions.push('4. Write tests');
    }
    
    return suggestions;
  }

  // ═══════════════════════════════════════════════════════════════
  //                      CHECKPOINT MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  async createCheckpoint(params: {
    name?: string;
    reason: CheckpointReason;
    metadata?: Record<string, unknown>;
  }): Promise<CheckpointInfo> {
    const { name, reason, metadata = {} } = params;
    
    const checkpointId = uuid();
    const checkpointName = name || `checkpoint-${Date.now()}`;
    
    // Gather data to checkpoint
    const checkpointData: CheckpointData = {
      id: checkpointId,
      name: checkpointName,
      createdAt: new Date(),
      reason,
      tokenUsage: this.tokenUsage.used,
      session: {
        id: 'current', // Would be actual session ID
        startedAt: new Date(),
      },
      memory: [], // Would be filled by memory module
      tasks: [], // Would be filled by workflow module
      filesChanged: [], // Would be tracked
      metadata,
    };
    
    // Save checkpoint
    const checkpointPath = join(this.checkpointDir, `${checkpointId}.json`);
    writeFileSync(checkpointPath, JSON.stringify(checkpointData, null, 2));
    
    const info: CheckpointInfo = {
      id: checkpointId,
      name: checkpointName,
      createdAt: new Date(),
      tokenUsage: this.tokenUsage.used,
      reason,
      size: statSync(checkpointPath).size,
    };
    
    this.checkpoints.unshift(info);
    
    // Enforce max checkpoints
    await this.enforceCheckpointLimit();
    
    this.logger.info(`Checkpoint created: ${checkpointName} (${checkpointId})`);
    
    return info;
  }

  async restoreCheckpoint(checkpointId: string): Promise<CheckpointData | null> {
    const checkpointPath = join(this.checkpointDir, `${checkpointId}.json`);
    
    if (!existsSync(checkpointPath)) {
      this.logger.error(`Checkpoint not found: ${checkpointId}`);
      return null;
    }
    
    const data = JSON.parse(readFileSync(checkpointPath, 'utf-8')) as CheckpointData;
    
    this.logger.info(`Checkpoint restored: ${data.name}`);
    
    return data;
  }

  listCheckpoints(): CheckpointInfo[] {
    return this.checkpoints;
  }

  async deleteCheckpoint(checkpointId: string): Promise<boolean> {
    const checkpointPath = join(this.checkpointDir, `${checkpointId}.json`);
    
    if (!existsSync(checkpointPath)) {
      return false;
    }
    
    const { unlinkSync } = await import('fs');
    unlinkSync(checkpointPath);
    
    this.checkpoints = this.checkpoints.filter(c => c.id !== checkpointId);
    
    return true;
  }

  private async loadCheckpoints(): Promise<void> {
    if (!existsSync(this.checkpointDir)) {
      return;
    }
    
    const files = readdirSync(this.checkpointDir).filter(f => f.endsWith('.json'));
    
    for (const file of files) {
      try {
        const path = join(this.checkpointDir, file);
        const data = JSON.parse(readFileSync(path, 'utf-8')) as CheckpointData;
        
        this.checkpoints.push({
          id: data.id,
          name: data.name,
          createdAt: new Date(data.createdAt),
          tokenUsage: data.tokenUsage,
          reason: data.reason,
          size: statSync(path).size,
        });
      } catch (error) {
        this.logger.warn(`Failed to load checkpoint: ${file}`);
      }
    }
    
    // Sort by date, newest first
    this.checkpoints.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  private async enforceCheckpointLimit(): Promise<void> {
    const maxCheckpoints = this.config.checkpoints.maxCheckpoints;
    
    while (this.checkpoints.length > maxCheckpoints) {
      const oldest = this.checkpoints.pop();
      if (oldest) {
        await this.deleteCheckpoint(oldest.id);
      }
    }
  }

  private async onTaskComplete(): Promise<void> {
    if (this.config.checkpoints.auto) {
      await this.createCheckpoint({
        name: 'task-complete',
        reason: 'task_complete',
      });
    }
  }

  private async onSessionEnd(): Promise<void> {
    await this.createCheckpoint({
      name: 'session-end',
      reason: 'session_end',
    });
  }
}
```

```typescript
// src/modules/resource/resource.tools.ts

import { Tool } from '@modelcontextprotocol/sdk/types.js';

export function getResourceTools(): Tool[] {
  return [
    {
      name: 'resource_status',
      description: 'Get current token usage and checkpoint status',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'resource_update_tokens',
      description: 'Update token usage tracking',
      inputSchema: {
        type: 'object',
        properties: {
          used: {
            type: 'number',
            description: 'Tokens used so far',
          },
          estimated: {
            type: 'number',
            description: 'Estimated total context window',
          },
        },
        required: ['used'],
      },
    },
    {
      name: 'resource_estimate_task',
      description: 'Estimate token usage for a task',
      inputSchema: {
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description: 'Task description',
          },
          filesCount: {
            type: 'number',
            description: 'Number of files to modify',
          },
          linesEstimate: {
            type: 'number',
            description: 'Estimated lines of code',
          },
          hasTests: {
            type: 'boolean',
            description: 'Whether task includes writing tests',
          },
          hasBrowserTesting: {
            type: 'boolean',
            description: 'Whether task includes browser testing',
          },
        },
        required: ['description'],
      },
    },
    {
      name: 'resource_checkpoint_create',
      description: 'Create a checkpoint to save current progress',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Checkpoint name',
          },
          reason: {
            type: 'string',
            enum: ['manual', 'before_risky_operation', 'task_complete'],
            description: 'Reason for checkpoint',
          },
        },
        required: [],
      },
    },
    {
      name: 'resource_checkpoint_list',
      description: 'List all checkpoints',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'resource_checkpoint_restore',
      description: 'Restore from a checkpoint',
      inputSchema: {
        type: 'object',
        properties: {
          checkpointId: {
            type: 'string',
            description: 'Checkpoint ID to restore',
          },
        },
        required: ['checkpointId'],
      },
    },
  ];
}
```

```typescript
// src/modules/resource/index.ts

import { ResourceService } from './resource.service.js';
import { getResourceTools } from './resource.tools.js';
import { ResourceModuleConfig } from '../../core/types.js';
import { EventBus } from '../../core/event-bus.js';
import { Logger } from '../../core/logger.js';

export class ResourceModule {
  private service: ResourceService;
  
  constructor(
    config: ResourceModuleConfig,
    eventBus: EventBus,
    logger: Logger
  ) {
    this.service = new ResourceService(config, eventBus, logger);
  }

  async initialize(): Promise<void> {
    await this.service.initialize();
  }

  getTools() {
    return getResourceTools();
  }

  async handleTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    switch (toolName) {
      case 'status':
        return this.service.getStatus();
        
      case 'update_tokens':
        return this.service.updateTokenUsage(
          args.used as number,
          args.estimated as number | undefined
        );
        
      case 'estimate_task':
        return this.service.estimateTask({
          description: args.description as string,
          filesCount: args.filesCount as number | undefined,
          linesEstimate: args.linesEstimate as number | undefined,
          hasTests: args.hasTests as boolean | undefined,
          hasBrowserTesting: args.hasBrowserTesting as boolean | undefined,
        });
        
      case 'checkpoint_create':
        return this.service.createCheckpoint({
          name: args.name as string | undefined,
          reason: (args.reason as any) || 'manual',
        });
        
      case 'checkpoint_list':
        return this.service.listCheckpoints();
        
      case 'checkpoint_restore':
        return this.service.restoreCheckpoint(args.checkpointId as string);
        
      default:
        throw new Error(`Unknown resource tool: ${toolName}`);
    }
  }

  getStatus() {
    return this.service.getStatus();
  }
}

export { ResourceService } from './resource.service.js';
export * from './resource.types.js';
```

---

### 2. WORKFLOW MODULE (Task & Progress Management)

```typescript
// src/modules/workflow/workflow.types.ts

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

export interface TaskCreateParams {
  name: string;
  description?: string;
  priority?: TaskPriority;
  parentId?: string;
  estimatedTokens?: number;
  tags?: string[];
}

export interface TaskUpdateParams {
  status?: TaskStatus;
  progress?: number;
  description?: string;
  priority?: TaskPriority;
}

export interface TaskFilter {
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  tags?: string[];
  parentId?: string | null;
}

export interface WorkflowStatus {
  currentTask?: Task;
  pendingCount: number;
  inProgressCount: number;
  completedToday: number;
  totalTasks: number;
}

export interface TaskSummary {
  id: string;
  name: string;
  status: TaskStatus;
  progress: number;
  priority: TaskPriority;
}
```

```typescript
// src/modules/workflow/workflow.service.ts

import { writeFileSync, readFileSync, existsSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { v4 as uuid } from 'uuid';
import {
  Task,
  TaskStatus,
  TaskPriority,
  TaskNote,
  TaskCreateParams,
  TaskUpdateParams,
  TaskFilter,
  WorkflowStatus,
  TaskSummary,
  WorkflowModuleConfig
} from '../../core/types.js';
import { EventBus } from '../../core/event-bus.js';
import { Logger } from '../../core/logger.js';

export class WorkflowService {
  private tasks: Map<string, Task> = new Map();
  private currentTaskId: string | null = null;
  private tasksDir: string;
  
  constructor(
    private config: WorkflowModuleConfig,
    private eventBus: EventBus,
    private logger: Logger,
    private projectRoot: string = process.cwd()
  ) {
    this.tasksDir = join(projectRoot, '.ccg', 'tasks');
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) return;
    
    await this.loadTasks();
    
    // Resume in-progress task if any
    const inProgress = Array.from(this.tasks.values()).find(t => t.status === 'in_progress');
    if (inProgress) {
      this.currentTaskId = inProgress.id;
      this.logger.info(`Resumed task: ${inProgress.name}`);
    }
    
    this.logger.info(`Workflow module initialized with ${this.tasks.size} tasks`);
  }

  // ═══════════════════════════════════════════════════════════════
  //                      TASK CRUD
  // ═══════════════════════════════════════════════════════════════

  async createTask(params: TaskCreateParams): Promise<Task> {
    const task: Task = {
      id: uuid(),
      name: params.name,
      description: params.description,
      status: 'pending',
      progress: 0,
      priority: params.priority || 'medium',
      startedAt: new Date(),
      updatedAt: new Date(),
      parentId: params.parentId,
      subtasks: [],
      estimatedTokens: params.estimatedTokens,
      checkpoints: [],
      notes: [],
      filesAffected: [],
      tags: params.tags || [],
    };
    
    this.tasks.set(task.id, task);
    
    // Add to parent's subtasks if applicable
    if (task.parentId) {
      const parent = this.tasks.get(task.parentId);
      if (parent) {
        parent.subtasks.push(task.id);
        await this.saveTask(parent);
      }
    }
    
    await this.saveTask(task);
    
    this.logger.info(`Task created: ${task.name} (${task.id})`);
    
    return task;
  }

  async startTask(taskId: string): Promise<Task | null> {
    const task = this.tasks.get(taskId);
    if (!task) {
      this.logger.error(`Task not found: ${taskId}`);
      return null;
    }
    
    // Pause current task if any
    if (this.currentTaskId && this.currentTaskId !== taskId) {
      await this.pauseTask(this.currentTaskId);
    }
    
    task.status = 'in_progress';
    task.updatedAt = new Date();
    this.currentTaskId = taskId;
    
    await this.saveTask(task);
    
    this.eventBus.emit({
      type: 'task:start',
      task,
      timestamp: new Date(),
    });
    
    this.logger.info(`Task started: ${task.name}`);
    
    return task;
  }

  async updateTask(taskId: string, params: TaskUpdateParams): Promise<Task | null> {
    const task = this.tasks.get(taskId);
    if (!task) return null;
    
    if (params.status !== undefined) task.status = params.status;
    if (params.progress !== undefined) task.progress = Math.min(100, Math.max(0, params.progress));
    if (params.description !== undefined) task.description = params.description;
    if (params.priority !== undefined) task.priority = params.priority;
    
    task.updatedAt = new Date();
    
    await this.saveTask(task);
    
    this.eventBus.emit({
      type: 'task:progress',
      task,
      timestamp: new Date(),
    });
    
    return task;
  }

  async completeTask(taskId: string, actualTokens?: number): Promise<Task | null> {
    const task = this.tasks.get(taskId);
    if (!task) return null;
    
    task.status = 'completed';
    task.progress = 100;
    task.completedAt = new Date();
    task.updatedAt = new Date();
    if (actualTokens) task.actualTokens = actualTokens;
    
    if (this.currentTaskId === taskId) {
      this.currentTaskId = null;
    }
    
    await this.saveTask(task);
    
    this.eventBus.emit({
      type: 'task:complete',
      task,
      timestamp: new Date(),
    });
    
    this.logger.info(`Task completed: ${task.name}`);
    
    return task;
  }

  async pauseTask(taskId: string): Promise<Task | null> {
    const task = this.tasks.get(taskId);
    if (!task) return null;
    
    if (task.status === 'in_progress') {
      task.status = 'paused';
      task.updatedAt = new Date();
      
      if (this.currentTaskId === taskId) {
        this.currentTaskId = null;
      }
      
      await this.saveTask(task);
      
      this.logger.info(`Task paused: ${task.name}`);
    }
    
    return task;
  }

  async failTask(taskId: string, reason?: string): Promise<Task | null> {
    const task = this.tasks.get(taskId);
    if (!task) return null;
    
    task.status = 'failed';
    task.updatedAt = new Date();
    
    if (reason) {
      task.notes.push({
        id: uuid(),
        content: `Failed: ${reason}`,
        type: 'note',
        createdAt: new Date(),
      });
    }
    
    if (this.currentTaskId === taskId) {
      this.currentTaskId = null;
    }
    
    await this.saveTask(task);
    
    this.eventBus.emit({
      type: 'task:fail',
      task,
      timestamp: new Date(),
    });
    
    return task;
  }

  // ═══════════════════════════════════════════════════════════════
  //                      TASK NOTES & FILES
  // ═══════════════════════════════════════════════════════════════

  async addNote(taskId: string, content: string, type: TaskNote['type'] = 'note'): Promise<TaskNote | null> {
    const task = this.tasks.get(taskId);
    if (!task) return null;
    
    const note: TaskNote = {
      id: uuid(),
      content,
      type,
      createdAt: new Date(),
    };
    
    task.notes.push(note);
    task.updatedAt = new Date();
    
    await this.saveTask(task);
    
    return note;
  }

  async addAffectedFile(taskId: string, filePath: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) return false;
    
    if (!task.filesAffected.includes(filePath)) {
      task.filesAffected.push(filePath);
      task.updatedAt = new Date();
      await this.saveTask(task);
    }
    
    return true;
  }

  async addCheckpoint(taskId: string, checkpointId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) return false;
    
    task.checkpoints.push(checkpointId);
    task.updatedAt = new Date();
    await this.saveTask(task);
    
    return true;
  }

  // ═══════════════════════════════════════════════════════════════
  //                      TASK QUERIES
  // ═══════════════════════════════════════════════════════════════

  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  getCurrentTask(): Task | undefined {
    return this.currentTaskId ? this.tasks.get(this.currentTaskId) : undefined;
  }

  getTasks(filter?: TaskFilter): Task[] {
    let tasks = Array.from(this.tasks.values());
    
    if (filter) {
      if (filter.status) {
        const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
        tasks = tasks.filter(t => statuses.includes(t.status));
      }
      
      if (filter.priority) {
        const priorities = Array.isArray(filter.priority) ? filter.priority : [filter.priority];
        tasks = tasks.filter(t => priorities.includes(t.priority));
      }
      
      if (filter.tags && filter.tags.length > 0) {
        tasks = tasks.filter(t => filter.tags!.some(tag => t.tags.includes(tag)));
      }
      
      if (filter.parentId !== undefined) {
        tasks = tasks.filter(t => t.parentId === filter.parentId);
      }
    }
    
    // Sort by priority then by date
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    tasks.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
    
    return tasks;
  }

  getTaskList(): TaskSummary[] {
    return this.getTasks().map(t => ({
      id: t.id,
      name: t.name,
      status: t.status,
      progress: t.progress,
      priority: t.priority,
    }));
  }

  getPendingTasks(): Task[] {
    return this.getTasks({ status: ['pending', 'paused', 'blocked'] });
  }

  getStatus(): WorkflowStatus {
    const tasks = Array.from(this.tasks.values());
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return {
      currentTask: this.getCurrentTask(),
      pendingCount: tasks.filter(t => t.status === 'pending').length,
      inProgressCount: tasks.filter(t => t.status === 'in_progress').length,
      completedToday: tasks.filter(t => 
        t.status === 'completed' && 
        t.completedAt && 
        t.completedAt >= today
      ).length,
      totalTasks: tasks.length,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //                      PERSISTENCE
  // ═══════════════════════════════════════════════════════════════

  private async loadTasks(): Promise<void> {
    if (!existsSync(this.tasksDir)) {
      return;
    }
    
    const files = readdirSync(this.tasksDir).filter(f => f.endsWith('.json'));
    
    for (const file of files) {
      try {
        const path = join(this.tasksDir, file);
        const data = JSON.parse(readFileSync(path, 'utf-8'));
        
        // Convert date strings back to Date objects
        const task: Task = {
          ...data,
          startedAt: new Date(data.startedAt),
          updatedAt: new Date(data.updatedAt),
          completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
          notes: data.notes.map((n: any) => ({
            ...n,
            createdAt: new Date(n.createdAt),
          })),
        };
        
        this.tasks.set(task.id, task);
      } catch (error) {
        this.logger.warn(`Failed to load task: ${file}`);
      }
    }
  }

  private async saveTask(task: Task): Promise<void> {
    const path = join(this.tasksDir, `${task.id}.json`);
    writeFileSync(path, JSON.stringify(task, null, 2));
  }

  async saveTasks(): Promise<void> {
    for (const task of this.tasks.values()) {
      await this.saveTask(task);
    }
  }

  async loadPendingTasks(): Promise<Task[]> {
    return this.getPendingTasks();
  }
}
```

```typescript
// src/modules/workflow/workflow.tools.ts

import { Tool } from '@modelcontextprotocol/sdk/types.js';

export function getWorkflowTools(): Tool[] {
  return [
    {
      name: 'workflow_task_create',
      description: 'Create a new task',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Task name',
          },
          description: {
            type: 'string',
            description: 'Task description',
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
            description: 'Task priority',
          },
          parentId: {
            type: 'string',
            description: 'Parent task ID for subtasks',
          },
          estimatedTokens: {
            type: 'number',
            description: 'Estimated tokens for task',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Tags for categorization',
          },
        },
        required: ['name'],
      },
    },
    {
      name: 'workflow_task_start',
      description: 'Start working on a task',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: {
            type: 'string',
            description: 'Task ID to start',
          },
        },
        required: ['taskId'],
      },
    },
    {
      name: 'workflow_task_update',
      description: 'Update task progress or status',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: {
            type: 'string',
            description: 'Task ID',
          },
          progress: {
            type: 'number',
            minimum: 0,
            maximum: 100,
            description: 'Progress percentage',
          },
          status: {
            type: 'string',
            enum: ['pending', 'in_progress', 'paused', 'blocked', 'completed', 'failed'],
            description: 'Task status',
          },
        },
        required: ['taskId'],
      },
    },
    {
      name: 'workflow_task_complete',
      description: 'Mark task as completed',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: {
            type: 'string',
            description: 'Task ID to complete',
          },
          actualTokens: {
            type: 'number',
            description: 'Actual tokens used',
          },
        },
        required: ['taskId'],
      },
    },
    {
      name: 'workflow_task_note',
      description: 'Add a note to a task',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: {
            type: 'string',
            description: 'Task ID',
          },
          content: {
            type: 'string',
            description: 'Note content',
          },
          type: {
            type: 'string',
            enum: ['note', 'decision', 'blocker', 'idea'],
            description: 'Note type',
          },
        },
        required: ['taskId', 'content'],
      },
    },
    {
      name: 'workflow_task_list',
      description: 'List tasks with optional filters',
      inputSchema: {
        type: 'object',
        properties: {
          status: {
            type: 'array',
            items: { 
              type: 'string',
              enum: ['pending', 'in_progress', 'paused', 'blocked', 'completed', 'failed'],
            },
            description: 'Filter by status',
          },
          priority: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
            },
            description: 'Filter by priority',
          },
        },
        required: [],
      },
    },
    {
      name: 'workflow_current',
      description: 'Get current task being worked on',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'workflow_status',
      description: 'Get workflow status summary',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  ];
}
```

```typescript
// src/modules/workflow/index.ts

import { WorkflowService } from './workflow.service.js';
import { getWorkflowTools } from './workflow.tools.js';
import { WorkflowModuleConfig } from '../../core/types.js';
import { EventBus } from '../../core/event-bus.js';
import { Logger } from '../../core/logger.js';

export class WorkflowModule {
  private service: WorkflowService;
  
  constructor(
    config: WorkflowModuleConfig,
    eventBus: EventBus,
    logger: Logger
  ) {
    this.service = new WorkflowService(config, eventBus, logger);
  }

  async initialize(): Promise<void> {
    await this.service.initialize();
  }

  getTools() {
    return getWorkflowTools();
  }

  async handleTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    switch (toolName) {
      case 'task_create':
        return this.service.createTask({
          name: args.name as string,
          description: args.description as string | undefined,
          priority: args.priority as any,
          parentId: args.parentId as string | undefined,
          estimatedTokens: args.estimatedTokens as number | undefined,
          tags: args.tags as string[] | undefined,
        });
        
      case 'task_start':
        return this.service.startTask(args.taskId as string);
        
      case 'task_update':
        return this.service.updateTask(args.taskId as string, {
          progress: args.progress as number | undefined,
          status: args.status as any,
        });
        
      case 'task_complete':
        return this.service.completeTask(
          args.taskId as string,
          args.actualTokens as number | undefined
        );
        
      case 'task_note':
        return this.service.addNote(
          args.taskId as string,
          args.content as string,
          args.type as any
        );
        
      case 'task_list':
        return this.service.getTasks({
          status: args.status as any,
          priority: args.priority as any,
        });
        
      case 'current':
        return this.service.getCurrentTask();
        
      case 'status':
        return this.service.getStatus();
        
      default:
        throw new Error(`Unknown workflow tool: ${toolName}`);
    }
  }

  getStatus() {
    return this.service.getStatus();
  }

  getTaskList() {
    return this.service.getTaskList();
  }

  async loadPendingTasks() {
    return this.service.loadPendingTasks();
  }

  async saveTasks() {
    return this.service.saveTasks();
  }
}

export { WorkflowService } from './workflow.service.js';
export * from './workflow.types.js';
```

---

### 3. TESTING MODULE (Test & Browser Testing)

```typescript
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
```

```typescript
// src/modules/testing/testing.service.ts

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, unlinkSync, readdirSync, rmSync } from 'fs';
import { join, basename } from 'path';
import { v4 as uuid } from 'uuid';
import {
  TestResults,
  TestResult,
  TestRunOptions,
  TestCleanupResult,
  TestingModuleConfig
} from '../../core/types.js';
import { EventBus } from '../../core/event-bus.js';
import { Logger } from '../../core/logger.js';
import { BrowserService } from './browser/browser.service.js';

const execAsync = promisify(exec);

export class TestingService {
  private browserService: BrowserService;
  private lastResults?: TestResults;
  
  constructor(
    private config: TestingModuleConfig,
    private eventBus: EventBus,
    private logger: Logger,
    private projectRoot: string = process.cwd()
  ) {
    this.browserService = new BrowserService(config.browser, logger);
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) return;
    
    this.logger.info('Testing module initialized');
  }

  // ═══════════════════════════════════════════════════════════════
  //                      TEST RUNNING
  // ═══════════════════════════════════════════════════════════════

  async runTests(options: TestRunOptions = {}): Promise<TestResults> {
    this.eventBus.emit({
      type: 'test:start',
      timestamp: new Date(),
    });
    
    const command = this.buildTestCommand(options);
    const startTime = Date.now();
    
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.projectRoot,
        timeout: (options.timeout || 60) * 1000,
      });
      
      const results = this.parseTestOutput(stdout, stderr);
      results.duration = Date.now() - startTime;
      
      this.lastResults = results;
      
      this.eventBus.emit({
        type: results.failed > 0 ? 'test:fail' : 'test:complete',
        results,
        timestamp: new Date(),
      });
      
      return results;
    } catch (error: any) {
      const results: TestResults = {
        passed: 0,
        failed: 1,
        skipped: 0,
        duration: Date.now() - startTime,
        tests: [{
          name: 'Test execution',
          file: '',
          status: 'failed',
          duration: 0,
          error: error.message,
          assertions: 0,
        }],
        summary: `Test execution failed: ${error.message}`,
      };
      
      this.lastResults = results;
      
      this.eventBus.emit({
        type: 'test:fail',
        results,
        timestamp: new Date(),
      });
      
      return results;
    }
  }

  async runAffectedTests(files: string[]): Promise<TestResults> {
    // Find test files that correspond to changed files
    const testFiles = this.findRelatedTestFiles(files);
    
    if (testFiles.length === 0) {
      return {
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        tests: [],
        summary: 'No related test files found',
      };
    }
    
    return this.runTests({ files: testFiles });
  }

  private buildTestCommand(options: TestRunOptions): string {
    let command = this.config.testCommand;
    
    if (options.files && options.files.length > 0) {
      command += ` ${options.files.join(' ')}`;
    }
    
    if (options.grep) {
      // Detect test runner and add appropriate flag
      if (command.includes('jest')) {
        command += ` -t "${options.grep}"`;
      } else if (command.includes('vitest') || command.includes('mocha')) {
        command += ` --grep "${options.grep}"`;
      }
    }
    
    if (options.coverage) {
      if (command.includes('jest') || command.includes('vitest')) {
        command += ' --coverage';
      }
    }
    
    return command;
  }

  private parseTestOutput(stdout: string, stderr: string): TestResults {
    const output = stdout + stderr;
    const tests: TestResult[] = [];
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    
    // Try to parse Jest/Vitest output
    const passMatch = output.match(/(\d+)\s+pass(?:ed|ing)?/i);
    const failMatch = output.match(/(\d+)\s+fail(?:ed|ing)?/i);
    const skipMatch = output.match(/(\d+)\s+skip(?:ped)?/i);
    
    if (passMatch) passed = parseInt(passMatch[1], 10);
    if (failMatch) failed = parseInt(failMatch[1], 10);
    if (skipMatch) skipped = parseInt(skipMatch[1], 10);
    
    // Parse individual test results
    const testLines = output.match(/(?:✓|✗|○|●)\s+(.+?)(?:\s+\((\d+)\s*ms\))?$/gm) || [];
    
    for (const line of testLines) {
      const isPassed = line.includes('✓') || line.includes('●');
      const isFailed = line.includes('✗');
      const isSkipped = line.includes('○');
      
      const nameMatch = line.match(/(?:✓|✗|○|●)\s+(.+?)(?:\s+\((\d+)\s*ms\))?$/);
      if (nameMatch) {
        tests.push({
          name: nameMatch[1].trim(),
          file: '',
          status: isPassed ? 'passed' : isFailed ? 'failed' : 'skipped',
          duration: nameMatch[2] ? parseInt(nameMatch[2], 10) : 0,
          assertions: 1,
        });
      }
    }
    
    // Parse coverage if present
    let coverage: TestResults['coverage'];
    const coverageMatch = output.match(/All files.*?\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)/);
    if (coverageMatch) {
      coverage = {
        statements: parseFloat(coverageMatch[1]),
        branches: parseFloat(coverageMatch[2]),
        functions: parseFloat(coverageMatch[3]),
        lines: parseFloat(coverageMatch[4]),
      };
    }
    
    const summary = `${passed} passed, ${failed} failed, ${skipped} skipped`;
    
    return {
      passed,
      failed,
      skipped,
      duration: 0,
      tests,
      coverage,
      summary,
    };
  }

  private findRelatedTestFiles(files: string[]): string[] {
    const testFiles: string[] = [];
    
    for (const file of files) {
      const baseName = basename(file).replace(/\.(ts|tsx|js|jsx)$/, '');
      
      // Common test file patterns
      const patterns = [
        `${baseName}.test.ts`,
        `${baseName}.test.tsx`,
        `${baseName}.test.js`,
        `${baseName}.spec.ts`,
        `${baseName}.spec.tsx`,
        `${baseName}.spec.js`,
        `__tests__/${baseName}.ts`,
        `__tests__/${baseName}.tsx`,
      ];
      
      // Check if any test files exist
      for (const pattern of patterns) {
        const testPath = join(this.projectRoot, pattern);
        if (existsSync(testPath)) {
          testFiles.push(pattern);
        }
      }
    }
    
    return [...new Set(testFiles)];
  }

  // ═══════════════════════════════════════════════════════════════
  //                      BROWSER TESTING
  // ═══════════════════════════════════════════════════════════════

  async openBrowser(url: string): Promise<string> {
    return this.browserService.openPage(url);
  }

  async takeScreenshot(sessionId: string, options?: {
    selector?: string;
    fullPage?: boolean;
  }): Promise<string> {
    return this.browserService.takeScreenshot(sessionId, options);
  }

  async getConsoleLogs(sessionId: string) {
    return this.browserService.getConsoleLogs(sessionId);
  }

  async getNetworkRequests(sessionId: string) {
    return this.browserService.getNetworkRequests(sessionId);
  }

  async getBrowserErrors(sessionId: string) {
    return this.browserService.getErrors(sessionId);
  }

  async closeBrowser(sessionId: string): Promise<void> {
    return this.browserService.closePage(sessionId);
  }

  async closeAllBrowsers(): Promise<void> {
    return this.browserService.closeAll();
  }

  // ═══════════════════════════════════════════════════════════════
  //                      TEST CLEANUP
  // ═══════════════════════════════════════════════════════════════

  async cleanup(): Promise<TestCleanupResult> {
    if (!this.config.cleanup.autoCleanTestData) {
      return { filesRemoved: 0, dataCleared: 0, locations: [] };
    }
    
    let filesRemoved = 0;
    let dataCleared = 0;
    const cleanedLocations: string[] = [];
    
    const prefix = this.config.cleanup.testDataPrefix;
    const locations = this.config.cleanup.testDataLocations;
    
    for (const location of locations) {
      const fullPath = join(this.projectRoot, location);
      
      if (!existsSync(fullPath)) continue;
      
      try {
        const files = readdirSync(fullPath);
        
        for (const file of files) {
          if (file.startsWith(prefix) || file.includes('test') || file.includes('mock')) {
            const filePath = join(fullPath, file);
            try {
              rmSync(filePath, { recursive: true, force: true });
              filesRemoved++;
            } catch (error) {
              this.logger.warn(`Failed to remove: ${filePath}`);
            }
          }
        }
        
        cleanedLocations.push(location);
      } catch (error) {
        this.logger.warn(`Failed to clean location: ${location}`);
      }
    }
    
    this.logger.info(`Test cleanup: ${filesRemoved} files removed from ${cleanedLocations.length} locations`);
    
    return {
      filesRemoved,
      dataCleared,
      locations: cleanedLocations,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //                      STATUS
  // ═══════════════════════════════════════════════════════════════

  getStatus(): {
    enabled: boolean;
    lastResults?: TestResults;
    browserSessions: number;
  } {
    return {
      enabled: this.config.enabled,
      lastResults: this.lastResults,
      browserSessions: this.browserService.getActiveSessions().length,
    };
  }

  getLastResults(): TestResults | undefined {
    return this.lastResults;
  }
}
```

```typescript
// src/modules/testing/browser/browser.service.ts

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { v4 as uuid } from 'uuid';
import {
  BrowserSession,
  ConsoleLog,
  NetworkRequest,
  Screenshot,
  BrowserError,
  BrowserTestConfig
} from '../../../core/types.js';
import { Logger } from '../../../core/logger.js';

export class BrowserService {
  private browser: Browser | null = null;
  private sessions: Map<string, {
    page: Page;
    context: BrowserContext;
    data: BrowserSession;
  }> = new Map();
  private screenshotDir: string;
  
  constructor(
    private config: BrowserTestConfig,
    private logger: Logger,
    private projectRoot: string = process.cwd()
  ) {
    this.screenshotDir = join(projectRoot, '.ccg', 'screenshots');
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) return;
    
    // Ensure screenshot directory exists
    if (!existsSync(this.screenshotDir)) {
      mkdirSync(this.screenshotDir, { recursive: true });
    }
  }

  async openPage(url: string): Promise<string> {
    // Lazy initialize browser
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: this.config.headless,
      });
    }
    
    const sessionId = uuid();
    const context = await this.browser.newContext();
    const page = await context.newPage();
    
    const session: BrowserSession = {
      id: sessionId,
      url,
      startedAt: new Date(),
      status: 'active',
      consoleLogs: [],
      networkRequests: [],
      screenshots: [],
      errors: [],
    };
    
    // Set up listeners
    if (this.config.captureConsole) {
      page.on('console', msg => {
        session.consoleLogs.push({
          type: msg.type() as any,
          message: msg.text(),
          timestamp: new Date(),
          source: msg.location().url,
          lineNumber: msg.location().lineNumber,
        });
      });
    }
    
    if (this.config.captureNetwork) {
      page.on('requestfinished', async request => {
        const response = await request.response();
        const timing = request.timing();
        
        session.networkRequests.push({
          id: uuid(),
          url: request.url(),
          method: request.method(),
          status: response?.status() || 0,
          statusText: response?.statusText() || '',
          duration: timing.responseEnd - timing.requestStart,
          size: (await response?.body())?.length || 0,
          type: request.resourceType(),
          timestamp: new Date(),
        });
      });
      
      page.on('requestfailed', request => {
        session.networkRequests.push({
          id: uuid(),
          url: request.url(),
          method: request.method(),
          status: 0,
          statusText: 'Failed',
          duration: 0,
          size: 0,
          type: request.resourceType(),
          error: request.failure()?.errorText,
          timestamp: new Date(),
        });
      });
    }
    
    // Capture page errors
    page.on('pageerror', error => {
      session.errors.push({
        message: error.message,
        source: 'page',
        stack: error.stack,
        timestamp: new Date(),
      });
    });
    
    // Navigate to URL
    await page.goto(url, { waitUntil: 'networkidle' });
    
    this.sessions.set(sessionId, { page, context, data: session });
    
    this.logger.info(`Browser session opened: ${sessionId} -> ${url}`);
    
    return sessionId;
  }

  async takeScreenshot(sessionId: string, options?: {
    selector?: string;
    fullPage?: boolean;
  }): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    
    const screenshotId = uuid();
    const filename = `${screenshotId}.png`;
    const path = join(this.screenshotDir, filename);
    
    if (options?.selector) {
      await session.page.locator(options.selector).screenshot({ path });
    } else {
      await session.page.screenshot({ 
        path,
        fullPage: options?.fullPage ?? false,
      });
    }
    
    const viewport = session.page.viewportSize();
    
    const screenshot: Screenshot = {
      id: screenshotId,
      path,
      createdAt: new Date(),
      selector: options?.selector,
      fullPage: options?.fullPage ?? false,
      width: viewport?.width || 0,
      height: viewport?.height || 0,
    };
    
    session.data.screenshots.push(screenshot);
    
    this.logger.debug(`Screenshot taken: ${path}`);
    
    return path;
  }

  getConsoleLogs(sessionId: string): ConsoleLog[] {
    const session = this.sessions.get(sessionId);
    return session?.data.consoleLogs || [];
  }

  getNetworkRequests(sessionId: string): NetworkRequest[] {
    const session = this.sessions.get(sessionId);
    return session?.data.networkRequests || [];
  }

  getErrors(sessionId: string): BrowserError[] {
    const session = this.sessions.get(sessionId);
    return session?.data.errors || [];
  }

  async closePage(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    await session.page.close();
    await session.context.close();
    
    session.data.status = 'closed';
    this.sessions.delete(sessionId);
    
    this.logger.info(`Browser session closed: ${sessionId}`);
  }

  async closeAll(): Promise<void> {
    for (const [sessionId] of this.sessions) {
      await this.closePage(sessionId);
    }
    
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  getActiveSessions(): string[] {
    return Array.from(this.sessions.keys());
  }

  getSession(sessionId: string): BrowserSession | undefined {
    return this.sessions.get(sessionId)?.data;
  }
}
```

```typescript
// src/modules/testing/testing.tools.ts

import { Tool } from '@modelcontextprotocol/sdk/types.js';

export function getTestingTools(): Tool[] {
  return [
    {
      name: 'testing_run',
      description: 'Run tests',
      inputSchema: {
        type: 'object',
        properties: {
          files: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific test files to run',
          },
          grep: {
            type: 'string',
            description: 'Filter tests by name pattern',
          },
          coverage: {
            type: 'boolean',
            description: 'Run with coverage',
          },
        },
        required: [],
      },
    },
    {
      name: 'testing_run_affected',
      description: 'Run tests affected by changed files',
      inputSchema: {
        type: 'object',
        properties: {
          files: {
            type: 'array',
            items: { type: 'string' },
            description: 'Changed files',
          },
        },
        required: ['files'],
      },
    },
    {
      name: 'testing_browser_open',
      description: 'Open a browser session for testing',
      inputSchema: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'URL to open',
          },
        },
        required: ['url'],
      },
    },
    {
      name: 'testing_browser_screenshot',
      description: 'Take a screenshot of the browser',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: {
            type: 'string',
            description: 'Browser session ID',
          },
          selector: {
            type: 'string',
            description: 'CSS selector to screenshot (optional)',
          },
          fullPage: {
            type: 'boolean',
            description: 'Capture full page',
          },
        },
        required: ['sessionId'],
      },
    },
    {
      name: 'testing_browser_logs',
      description: 'Get console logs from browser session',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: {
            type: 'string',
            description: 'Browser session ID',
          },
        },
        required: ['sessionId'],
      },
    },
    {
      name: 'testing_browser_network',
      description: 'Get network requests from browser session',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: {
            type: 'string',
            description: 'Browser session ID',
          },
        },
        required: ['sessionId'],
      },
    },
    {
      name: 'testing_browser_errors',
      description: 'Get errors from browser session',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: {
            type: 'string',
            description: 'Browser session ID',
          },
        },
        required: ['sessionId'],
      },
    },
    {
      name: 'testing_browser_close',
      description: 'Close a browser session',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: {
            type: 'string',
            description: 'Browser session ID',
          },
        },
        required: ['sessionId'],
      },
    },
    {
      name: 'testing_cleanup',
      description: 'Clean up test data and temporary files',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'testing_status',
      description: 'Get testing module status',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  ];
}
```

```typescript
// src/modules/testing/index.ts

import { TestingService } from './testing.service.js';
import { getTestingTools } from './testing.tools.js';
import { TestingModuleConfig } from '../../core/types.js';
import { EventBus } from '../../core/event-bus.js';
import { Logger } from '../../core/logger.js';

export class TestingModule {
  private service: TestingService;
  
  constructor(
    config: TestingModuleConfig,
    eventBus: EventBus,
    logger: Logger
  ) {
    this.service = new TestingService(config, eventBus, logger);
  }

  async initialize(): Promise<void> {
    await this.service.initialize();
  }

  getTools() {
    return getTestingTools();
  }

  async handleTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    switch (toolName) {
      case 'run':
        return this.service.runTests({
          files: args.files as string[] | undefined,
          grep: args.grep as string | undefined,
          coverage: args.coverage as boolean | undefined,
        });
        
      case 'run_affected':
        return this.service.runAffectedTests(args.files as string[]);
        
      case 'browser_open':
        return { sessionId: await this.service.openBrowser(args.url as string) };
        
      case 'browser_screenshot':
        return { 
          path: await this.service.takeScreenshot(
            args.sessionId as string,
            {
              selector: args.selector as string | undefined,
              fullPage: args.fullPage as boolean | undefined,
            }
          )
        };
        
      case 'browser_logs':
        return this.service.getConsoleLogs(args.sessionId as string);
        
      case 'browser_network':
        return this.service.getNetworkRequests(args.sessionId as string);
        
      case 'browser_errors':
        return this.service.getBrowserErrors(args.sessionId as string);
        
      case 'browser_close':
        await this.service.closeBrowser(args.sessionId as string);
        return { closed: true };
        
      case 'cleanup':
        return this.service.cleanup();
        
      case 'status':
        return this.service.getStatus();
        
      default:
        throw new Error(`Unknown testing tool: ${toolName}`);
    }
  }

  getStatus() {
    return this.service.getStatus();
  }
}

export { TestingService } from './testing.service.js';
export { BrowserService } from './browser/browser.service.js';
export * from './testing.types.js';
```

---

### 4. DOCUMENTS MODULE (Document Registry & Management)

```typescript
// src/modules/documents/documents.types.ts

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

export interface DocumentRegistry {
  documents: Document[];
  lastScanned: Date;
  locations: Record<string, string>;
}

export interface DocumentSearchResult {
  document: Document;
  relevance: number;
  matchedIn: ('name' | 'description' | 'tags' | 'content')[];
}

export interface DocumentUpdateCheck {
  document: Document;
  shouldUpdate: boolean;
  reason: string;
  existingContent?: string;
  suggestedAction: 'update' | 'create' | 'skip';
}

export interface DocumentCreateParams {
  path: string;
  type?: DocumentType;
  description?: string;
  tags?: string[];
  content: string;
}
```

```typescript
// src/modules/documents/documents.service.ts

import { 
  readFileSync, 
  writeFileSync, 
  existsSync, 
  statSync,
  readdirSync 
} from 'fs';
import { join, basename, extname, dirname } from 'path';
import { createHash } from 'crypto';
import { v4 as uuid } from 'uuid';
import {
  Document,
  DocumentType,
  DocumentRegistry,
  DocumentSearchResult,
  DocumentUpdateCheck,
  DocumentCreateParams,
  DocumentsModuleConfig
} from '../../core/types.js';
import { EventBus } from '../../core/event-bus.js';
import { Logger } from '../../core/logger.js';

export class DocumentsService {
  private registry: DocumentRegistry;
  private registryPath: string;
  
  constructor(
    private config: DocumentsModuleConfig,
    private eventBus: EventBus,
    private logger: Logger,
    private projectRoot: string = process.cwd()
  ) {
    this.registryPath = join(projectRoot, '.ccg', 'registry', 'documents.json');
    this.registry = {
      documents: [],
      lastScanned: new Date(),
      locations: config.locations,
    };
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) return;
    
    await this.loadRegistry();
    await this.scanDocuments();
    
    this.logger.info(`Documents module initialized with ${this.registry.documents.length} documents`);
  }

  // ═══════════════════════════════════════════════════════════════
  //                      DOCUMENT SCANNING
  // ═══════════════════════════════════════════════════════════════

  async scanDocuments(): Promise<void> {
    const docExtensions = ['.md', '.txt', '.rst', '.adoc'];
    const foundPaths = new Set<string>();
    
    // Scan configured locations
    for (const [type, location] of Object.entries(this.config.locations)) {
      const fullPath = join(this.projectRoot, location);
      
      if (existsSync(fullPath)) {
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Scan directory
          this.scanDirectory(fullPath, docExtensions, foundPaths);
        } else if (stat.isFile()) {
          foundPaths.add(fullPath);
        }
      }
    }
    
    // Also scan for common doc files in root
    const rootDocs = ['README.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'LICENSE'];
    for (const doc of rootDocs) {
      const docPath = join(this.projectRoot, doc);
      if (existsSync(docPath)) {
        foundPaths.add(docPath);
      }
    }
    
    // Update registry
    const existingPaths = new Set(this.registry.documents.map(d => d.path));
    
    for (const path of foundPaths) {
      if (!existingPaths.has(path)) {
        await this.registerDocument(path);
      } else {
        // Check for updates
        const doc = this.registry.documents.find(d => d.path === path)!;
        await this.checkAndUpdateDocument(doc);
      }
    }
    
    // Remove documents that no longer exist
    this.registry.documents = this.registry.documents.filter(d => existsSync(d.path));
    
    this.registry.lastScanned = new Date();
    await this.saveRegistry();
  }

  private scanDirectory(dirPath: string, extensions: string[], found: Set<string>): void {
    try {
      const entries = readdirSync(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          this.scanDirectory(fullPath, extensions, found);
        } else if (entry.isFile() && extensions.includes(extname(entry.name).toLowerCase())) {
          found.add(fullPath);
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to scan directory: ${dirPath}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //                      DOCUMENT REGISTRATION
  // ═══════════════════════════════════════════════════════════════

  async registerDocument(path: string, params?: Partial<DocumentCreateParams>): Promise<Document> {
    const content = readFileSync(path, 'utf-8');
    const stat = statSync(path);
    const hash = this.hashContent(content);
    
    const document: Document = {
      id: uuid(),
      path,
      name: basename(path),
      type: params?.type || this.detectDocumentType(path, content),
      createdAt: stat.birthtime,
      updatedAt: stat.mtime,
      hash,
      size: stat.size,
      description: params?.description || this.extractDescription(content),
      tags: params?.tags || this.extractTags(content),
      linkedFiles: this.extractLinkedFiles(content, dirname(path)),
    };
    
    // Check for duplicate
    const existing = this.registry.documents.find(d => d.path === path);
    if (existing) {
      // Update existing
      Object.assign(existing, document);
      existing.id = existing.id; // Keep original ID
    } else {
      this.registry.documents.push(document);
    }
    
    await this.saveRegistry();
    
    return document;
  }

  private async checkAndUpdateDocument(doc: Document): Promise<void> {
    const stat = statSync(doc.path);
    
    if (stat.mtime > doc.updatedAt) {
      const content = readFileSync(doc.path, 'utf-8');
      const hash = this.hashContent(content);
      
      if (hash !== doc.hash) {
        doc.hash = hash;
        doc.updatedAt = stat.mtime;
        doc.size = stat.size;
        doc.description = this.extractDescription(content);
        doc.tags = this.extractTags(content);
        doc.linkedFiles = this.extractLinkedFiles(content, dirname(doc.path));
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //                      DOCUMENT SEARCH
  // ═══════════════════════════════════════════════════════════════

  searchDocuments(query: string): DocumentSearchResult[] {
    const results: DocumentSearchResult[] = [];
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/);
    
    for (const doc of this.registry.documents) {
      let relevance = 0;
      const matchedIn: DocumentSearchResult['matchedIn'] = [];
      
      // Name match
      if (doc.name.toLowerCase().includes(queryLower)) {
        relevance += 10;
        matchedIn.push('name');
      }
      
      // Description match
      if (doc.description?.toLowerCase().includes(queryLower)) {
        relevance += 5;
        matchedIn.push('description');
      }
      
      // Tags match
      for (const tag of doc.tags) {
        if (tag.toLowerCase().includes(queryLower)) {
          relevance += 3;
          if (!matchedIn.includes('tags')) matchedIn.push('tags');
        }
      }
      
      // Word-by-word matching
      for (const word of queryWords) {
        if (doc.name.toLowerCase().includes(word)) relevance += 2;
        if (doc.description?.toLowerCase().includes(word)) relevance += 1;
      }
      
      if (relevance > 0) {
        results.push({ document: doc, relevance, matchedIn });
      }
    }
    
    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance);
    
    return results;
  }

  findDocumentByType(type: DocumentType): Document[] {
    return this.registry.documents.filter(d => d.type === type);
  }

  findDocumentByPath(path: string): Document | undefined {
    return this.registry.documents.find(d => d.path === path || d.path.endsWith(path));
  }

  // ═══════════════════════════════════════════════════════════════
  //                      DOCUMENT UPDATE LOGIC
  // ═══════════════════════════════════════════════════════════════

  shouldUpdateDocument(topic: string, newContent: string): DocumentUpdateCheck {
    // Search for existing document on this topic
    const searchResults = this.searchDocuments(topic);
    
    if (searchResults.length === 0) {
      // No existing document found
      const suggestedPath = this.suggestDocumentPath(topic);
      
      return {
        document: {
          id: '',
          path: suggestedPath,
          name: basename(suggestedPath),
          type: 'other',
          createdAt: new Date(),
          updatedAt: new Date(),
          hash: '',
          size: 0,
          tags: [],
          linkedFiles: [],
        },
        shouldUpdate: false,
        reason: 'No existing document found',
        suggestedAction: 'create',
      };
    }
    
    // Found existing document
    const bestMatch = searchResults[0];
    const existingContent = readFileSync(bestMatch.document.path, 'utf-8');
    
    // Check if update is appropriate
    if (this.config.updateInsteadOfCreate) {
      return {
        document: bestMatch.document,
        shouldUpdate: true,
        reason: `Found existing document: ${bestMatch.document.name} (relevance: ${bestMatch.relevance})`,
        existingContent,
        suggestedAction: 'update',
      };
    }
    
    return {
      document: bestMatch.document,
      shouldUpdate: false,
      reason: 'Existing document found but updateInsteadOfCreate is disabled',
      existingContent,
      suggestedAction: 'skip',
    };
  }

  async updateDocument(path: string, content: string): Promise<Document> {
    writeFileSync(path, content, 'utf-8');
    return this.registerDocument(path);
  }

  async createDocument(params: DocumentCreateParams): Promise<Document> {
    // Ensure directory exists
    const dir = dirname(params.path);
    const { mkdirSync } = await import('fs');
    mkdirSync(dir, { recursive: true });
    
    writeFileSync(params.path, params.content, 'utf-8');
    
    return this.registerDocument(params.path, params);
  }

  // ═══════════════════════════════════════════════════════════════
  //                      HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  private detectDocumentType(path: string, content: string): DocumentType {
    const name = basename(path).toLowerCase();
    const contentLower = content.toLowerCase();
    
    if (name.includes('readme')) return 'readme';
    if (name.includes('changelog') || name.includes('history')) return 'changelog';
    if (name.includes('api')) return 'api';
    if (name.includes('spec') || name.includes('specification')) return 'spec';
    if (name.includes('guide') || name.includes('tutorial')) return 'guide';
    if (name.includes('architecture') || name.includes('design')) return 'architecture';
    if (name.includes('config')) return 'config';
    
    // Content-based detection
    if (contentLower.includes('## api') || contentLower.includes('### endpoints')) return 'api';
    if (contentLower.includes('## architecture') || contentLower.includes('## design')) return 'architecture';
    
    return 'other';
  }

  private extractDescription(content: string): string {
    // Try to extract first paragraph or description
    const lines = content.split('\n');
    
    // Skip title
    let startIndex = 0;
    if (lines[0]?.startsWith('#')) {
      startIndex = 1;
    }
    
    // Find first non-empty paragraph
    let description = '';
    for (let i = startIndex; i < lines.length && i < 10; i++) {
      const line = lines[i].trim();
      if (line && !line.startsWith('#') && !line.startsWith('-') && !line.startsWith('*')) {
        description = line;
        break;
      }
    }
    
    // Truncate if too long
    if (description.length > 200) {
      description = description.substring(0, 197) + '...';
    }
    
    return description;
  }

  private extractTags(content: string): string[] {
    const tags: string[] = [];
    
    // Look for tags in frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      const tagsMatch = frontmatterMatch[1].match(/tags:\s*\[(.*?)\]/);
      if (tagsMatch) {
        tags.push(...tagsMatch[1].split(',').map(t => t.trim().replace(/['"]/g, '')));
      }
    }
    
    // Extract from headers
    const headers = content.match(/^#{1,3}\s+(.+)$/gm) || [];
    for (const header of headers.slice(0, 5)) {
      const text = header.replace(/^#+\s+/, '').toLowerCase();
      if (text.length < 30) {
        tags.push(text);
      }
    }
    
    return [...new Set(tags)];
  }

  private extractLinkedFiles(content: string, basePath: string): string[] {
    const links: string[] = [];
    
    // Markdown links
    const mdLinks = content.match(/\[.*?\]\(([^)]+)\)/g) || [];
    for (const link of mdLinks) {
      const match = link.match(/\]\(([^)]+)\)/);
      if (match && !match[1].startsWith('http') && !match[1].startsWith('#')) {
        links.push(join(basePath, match[1]));
      }
    }
    
    return links.filter(l => existsSync(l));
  }

  private hashContent(content: string): string {
    return createHash('md5').update(content).digest('hex');
  }

  private suggestDocumentPath(topic: string): string {
    // Convert topic to filename
    const filename = topic
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      + '.md';
    
    // Use docs directory if configured
    const docsLocation = this.config.locations['docs'] || 'docs';
    
    return join(this.projectRoot, docsLocation, filename);
  }

  // ═══════════════════════════════════════════════════════════════
  //                      PERSISTENCE
  // ═══════════════════════════════════════════════════════════════

  private async loadRegistry(): Promise<void> {
    if (existsSync(this.registryPath)) {
      try {
        const data = JSON.parse(readFileSync(this.registryPath, 'utf-8'));
        this.registry = {
          ...data,
          lastScanned: new Date(data.lastScanned),
          documents: data.documents.map((d: any) => ({
            ...d,
            createdAt: new Date(d.createdAt),
            updatedAt: new Date(d.updatedAt),
          })),
        };
      } catch (error) {
        this.logger.warn('Failed to load document registry');
      }
    }
  }

  private async saveRegistry(): Promise<void> {
    const dir = dirname(this.registryPath);
    const { mkdirSync } = await import('fs');
    mkdirSync(dir, { recursive: true });
    
    writeFileSync(this.registryPath, JSON.stringify(this.registry, null, 2));
  }

  // ═══════════════════════════════════════════════════════════════
  //                      STATUS
  // ═══════════════════════════════════════════════════════════════

  getStatus(): {
    enabled: boolean;
    documentCount: number;
    byType: Record<string, number>;
    lastScanned: Date;
  } {
    const byType: Record<string, number> = {};
    for (const doc of this.registry.documents) {
      byType[doc.type] = (byType[doc.type] || 0) + 1;
    }
    
    return {
      enabled: this.config.enabled,
      documentCount: this.registry.documents.length,
      byType,
      lastScanned: this.registry.lastScanned,
    };
  }

  getAllDocuments(): Document[] {
    return this.registry.documents;
  }
}
```

```typescript
// src/modules/documents/documents.tools.ts

import { Tool } from '@modelcontextprotocol/sdk/types.js';

export function getDocumentsTools(): Tool[] {
  return [
    {
      name: 'documents_search',
      description: 'Search documents by query',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'documents_find_by_type',
      description: 'Find documents by type',
      inputSchema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['readme', 'spec', 'api', 'guide', 'changelog', 'architecture', 'config', 'other'],
            description: 'Document type',
          },
        },
        required: ['type'],
      },
    },
    {
      name: 'documents_should_update',
      description: 'Check if an existing document should be updated instead of creating new',
      inputSchema: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description: 'Topic or subject of the document',
          },
          content: {
            type: 'string',
            description: 'New content to be written',
          },
        },
        required: ['topic', 'content'],
      },
    },
    {
      name: 'documents_update',
      description: 'Update an existing document',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Document path',
          },
          content: {
            type: 'string',
            description: 'New content',
          },
        },
        required: ['path', 'content'],
      },
    },
    {
      name: 'documents_create',
      description: 'Create a new document',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Document path',
          },
          content: {
            type: 'string',
            description: 'Document content',
          },
          type: {
            type: 'string',
            enum: ['readme', 'spec', 'api', 'guide', 'changelog', 'architecture', 'config', 'other'],
            description: 'Document type',
          },
          description: {
            type: 'string',
            description: 'Document description',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Tags',
          },
        },
        required: ['path', 'content'],
      },
    },
    {
      name: 'documents_register',
      description: 'Register an existing document in the registry',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Document path',
          },
        },
        required: ['path'],
      },
    },
    {
      name: 'documents_scan',
      description: 'Scan project for documents and update registry',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'documents_list',
      description: 'List all registered documents',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'documents_status',
      description: 'Get documents module status',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  ];
}
```

```typescript
// src/modules/documents/index.ts

import { DocumentsService } from './documents.service.js';
import { getDocumentsTools } from './documents.tools.js';
import { DocumentsModuleConfig } from '../../core/types.js';
import { EventBus } from '../../core/event-bus.js';
import { Logger } from '../../core/logger.js';

export class DocumentsModule {
  private service: DocumentsService;
  
  constructor(
    config: DocumentsModuleConfig,
    eventBus: EventBus,
    logger: Logger
  ) {
    this.service = new DocumentsService(config, eventBus, logger);
  }

  async initialize(): Promise<void> {
    await this.service.initialize();
  }

  getTools() {
    return getDocumentsTools();
  }

  async handleTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    switch (toolName) {
      case 'search':
        return this.service.searchDocuments(args.query as string);
        
      case 'find_by_type':
        return this.service.findDocumentByType(args.type as any);
        
      case 'should_update':
        return this.service.shouldUpdateDocument(
          args.topic as string,
          args.content as string
        );
        
      case 'update':
        return this.service.updateDocument(
          args.path as string,
          args.content as string
        );
        
      case 'create':
        return this.service.createDocument({
          path: args.path as string,
          content: args.content as string,
          type: args.type as any,
          description: args.description as string | undefined,
          tags: args.tags as string[] | undefined,
        });
        
      case 'register':
        return this.service.registerDocument(args.path as string);
        
      case 'scan':
        await this.service.scanDocuments();
        return { scanned: true };
        
      case 'list':
        return this.service.getAllDocuments();
        
      case 'status':
        return this.service.getStatus();
        
      default:
        throw new Error(`Unknown documents tool: ${toolName}`);
    }
  }

  getStatus() {
    return this.service.getStatus();
  }
}

export { DocumentsService } from './documents.service.js';
export * from './documents.types.js';
```

---

### 5. SUMMARY - ALL MODULES

Đã hoàn thành implementation cho tất cả remaining modules:

| Module | Files | Key Features |
|--------|-------|--------------|
| **Resource** | 4 files | Token tracking, auto-checkpoint, task estimation |
| **Workflow** | 4 files | Task CRUD, progress tracking, notes, priorities |
| **Testing** | 6 files | Test runner, browser automation, cleanup |
| **Documents** | 4 files | Registry, search, update-vs-create logic |

**Tổng cộng tools:** 35+ tools across all modules

**Bạn muốn tiếp tục với:**

1. **Hook Implementations** - SessionStart, PreToolCall, PostToolCall handlers
2. **Core Infrastructure** - EventBus, StateManager, ConfigManager, Logger
3. **Testing Strategy** - Unit tests, integration tests
4. **Build & Publish** - CI/CD, npm publishing guide
5. **Templates** - Config files, hooks.json, commands