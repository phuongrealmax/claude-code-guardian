## CHI TIẾT IMPLEMENTATION - CLAUDE CODE GUARDIAN

---

### 1. PROJECT STRUCTURE

```
claude-code-guardian/
├── package.json
├── tsconfig.json
├── .eslintrc.json
├── .prettierrc
├── README.md
│
├── src/
│   ├── index.ts                      # Entry point - MCP Server
│   ├── server.ts                     # MCP Server setup
│   │
│   ├── core/                         # Core infrastructure
│   │   ├── index.ts
│   │   ├── event-bus.ts              # Event system
│   │   ├── state-manager.ts          # Global state
│   │   ├── config-manager.ts         # Configuration
│   │   ├── logger.ts                 # Logging service
│   │   └── types.ts                  # Core types
│   │
│   ├── storage/                      # Storage layer
│   │   ├── index.ts
│   │   ├── sqlite-storage.ts         # SQLite for memory
│   │   ├── file-storage.ts           # File-based storage
│   │   └── vector-storage.ts         # Vector embeddings (optional)
│   │
│   ├── modules/                      # Feature modules
│   │   ├── index.ts
│   │   │
│   │   ├── memory/                   # Memory module
│   │   │   ├── index.ts
│   │   │   ├── memory.service.ts
│   │   │   ├── memory.tools.ts
│   │   │   └── memory.types.ts
│   │   │
│   │   ├── guard/                    # Honesty Guard module
│   │   │   ├── index.ts
│   │   │   ├── guard.service.ts
│   │   │   ├── guard.tools.ts
│   │   │   ├── guard.types.ts
│   │   │   └── rules/
│   │   │       ├── fake-test.rule.ts
│   │   │       ├── disabled-feature.rule.ts
│   │   │       ├── empty-catch.rule.ts
│   │   │       └── emoji-code.rule.ts
│   │   │
│   │   ├── process/                  # Process Manager module
│   │   │   ├── index.ts
│   │   │   ├── process.service.ts
│   │   │   ├── process.tools.ts
│   │   │   └── process.types.ts
│   │   │
│   │   ├── resource/                 # Resource Manager module
│   │   │   ├── index.ts
│   │   │   ├── resource.service.ts
│   │   │   ├── resource.tools.ts
│   │   │   └── resource.types.ts
│   │   │
│   │   ├── workflow/                 # Workflow Manager module
│   │   │   ├── index.ts
│   │   │   ├── workflow.service.ts
│   │   │   ├── workflow.tools.ts
│   │   │   └── workflow.types.ts
│   │   │
│   │   ├── testing/                  # Testing module
│   │   │   ├── index.ts
│   │   │   ├── testing.service.ts
│   │   │   ├── testing.tools.ts
│   │   │   ├── testing.types.ts
│   │   │   └── browser/
│   │   │       ├── playwright.adapter.ts
│   │   │       └── browser.service.ts
│   │   │
│   │   └── documents/                # Document Manager module
│   │       ├── index.ts
│   │       ├── documents.service.ts
│   │       ├── documents.tools.ts
│   │       └── documents.types.ts
│   │
│   ├── hooks/                        # Hook handlers
│   │   ├── index.ts
│   │   ├── session-start.hook.ts
│   │   ├── pre-tool-call.hook.ts
│   │   ├── post-tool-call.hook.ts
│   │   └── session-end.hook.ts
│   │
│   └── utils/                        # Utilities
│       ├── index.ts
│       ├── code-analyzer.ts          # Code analysis utilities
│       ├── token-estimator.ts        # Token estimation
│       ├── port-utils.ts             # Port utilities
│       └── file-utils.ts             # File utilities
│
├── templates/                        # Init templates
│   ├── config.template.json
│   ├── hooks.template.json
│   └── commands/
│       └── ccg.md
│
├── tests/                            # Tests
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
└── bin/                              # CLI
    └── ccg.ts                        # CLI entry point
```

---

### 2. CORE TYPES & INTERFACES

```typescript
// src/core/types.ts

// ═══════════════════════════════════════════════════════════════
//                         CORE TYPES
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

export interface ModulesConfig {
  memory: MemoryModuleConfig;
  guard: GuardModuleConfig;
  process: ProcessModuleConfig;
  resource: ResourceModuleConfig;
  testing: TestingModuleConfig;
  documents: DocumentsModuleConfig;
  workflow: WorkflowModuleConfig;
}

// ═══════════════════════════════════════════════════════════════
//                      MODULE CONFIGS
// ═══════════════════════════════════════════════════════════════

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
//                      SESSION TYPES
// ═══════════════════════════════════════════════════════════════

export interface Session {
  id: string;
  startedAt: Date;
  projectPath: string;
  status: SessionStatus;
  currentTask?: Task;
  tokenUsage: TokenUsage;
  checkpoints: Checkpoint[];
}

export type SessionStatus = 'active' | 'paused' | 'ended';

export interface TokenUsage {
  used: number;
  estimated: number;
  percentage: number;
  lastUpdated: Date;
}

// ═══════════════════════════════════════════════════════════════
//                      TASK TYPES
// ═══════════════════════════════════════════════════════════════

export interface Task {
  id: string;
  name: string;
  description?: string;
  status: TaskStatus;
  progress: number;
  startedAt: Date;
  completedAt?: Date;
  estimatedTokens?: number;
  actualTokens?: number;
  checkpoints: string[];
  notes: string[];
  filesAffected: string[];
}

export type TaskStatus = 
  | 'pending' 
  | 'in_progress' 
  | 'paused' 
  | 'completed' 
  | 'failed';

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
  | 'error_recovery';

export interface MemorySnapshot {
  items: Memory[];
  compressedAt?: Date;
}

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
//                      GUARD TYPES
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
//                      TESTING TYPES
// ═══════════════════════════════════════════════════════════════

export interface TestResults {
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  tests: TestResult[];
  coverage?: CoverageReport;
}

export interface TestResult {
  name: string;
  file: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
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
  consoleLogs: ConsoleLog[];
  networkRequests: NetworkRequest[];
  screenshots: Screenshot[];
}

export interface ConsoleLog {
  type: 'log' | 'warn' | 'error' | 'info';
  message: string;
  timestamp: Date;
  source?: string;
}

export interface NetworkRequest {
  url: string;
  method: string;
  status: number;
  duration: number;
  size: number;
  error?: string;
}

export interface Screenshot {
  id: string;
  path: string;
  createdAt: Date;
  selector?: string;
  fullPage: boolean;
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
  description?: string;
  tags: string[];
}

export type DocumentType = 
  | 'readme' 
  | 'spec' 
  | 'api' 
  | 'guide' 
  | 'changelog'
  | 'architecture'
  | 'other';

// ═══════════════════════════════════════════════════════════════
//                      EVENT TYPES
// ═══════════════════════════════════════════════════════════════

export type CCGEvent = 
  | SessionEvent
  | TaskEvent
  | GuardEvent
  | ResourceEvent
  | TestEvent;

export interface SessionEvent {
  type: 'session:start' | 'session:end' | 'session:pause';
  session: Session;
  timestamp: Date;
}

export interface TaskEvent {
  type: 'task:start' | 'task:progress' | 'task:complete' | 'task:fail';
  task: Task;
  timestamp: Date;
}

export interface GuardEvent {
  type: 'guard:warning' | 'guard:block' | 'guard:pass';
  validation: ValidationResult;
  timestamp: Date;
}

export interface ResourceEvent {
  type: 'resource:warning' | 'resource:critical' | 'resource:checkpoint';
  usage: TokenUsage;
  timestamp: Date;
}

export interface TestEvent {
  type: 'test:start' | 'test:complete' | 'test:fail';
  results?: TestResults;
  timestamp: Date;
}
```

---

### 3. MCP SERVER SETUP

```typescript
// src/index.ts

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createCCGServer } from './server.js';

async function main() {
  const server = await createCCGServer();
  const transport = new StdioServerTransport();
  
  await server.connect(transport);
  
  console.error('Claude Code Guardian MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
```

```typescript
// src/server.ts

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { ConfigManager } from './core/config-manager.js';
import { StateManager } from './core/state-manager.js';
import { EventBus } from './core/event-bus.js';
import { Logger } from './core/logger.js';

import { MemoryModule } from './modules/memory/index.js';
import { GuardModule } from './modules/guard/index.js';
import { ProcessModule } from './modules/process/index.js';
import { ResourceModule } from './modules/resource/index.js';
import { WorkflowModule } from './modules/workflow/index.js';
import { TestingModule } from './modules/testing/index.js';
import { DocumentsModule } from './modules/documents/index.js';

import { CCGConfig, Session } from './core/types.js';

export async function createCCGServer(): Promise<Server> {
  // Initialize core services
  const logger = new Logger();
  const eventBus = new EventBus();
  const configManager = new ConfigManager();
  const stateManager = new StateManager();

  // Load configuration
  const config = await configManager.load();
  
  // Initialize modules
  const modules = {
    memory: new MemoryModule(config.modules.memory, eventBus, logger),
    guard: new GuardModule(config.modules.guard, eventBus, logger),
    process: new ProcessModule(config.modules.process, eventBus, logger),
    resource: new ResourceModule(config.modules.resource, eventBus, logger),
    workflow: new WorkflowModule(config.modules.workflow, eventBus, logger),
    testing: new TestingModule(config.modules.testing, eventBus, logger),
    documents: new DocumentsModule(config.modules.documents, eventBus, logger),
  };

  // Initialize all modules
  await Promise.all(Object.values(modules).map(m => m.initialize()));

  // Create MCP Server
  const server = new Server(
    {
      name: 'claude-code-guardian',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  // ═══════════════════════════════════════════════════════════════
  //                      REGISTER TOOLS
  // ═══════════════════════════════════════════════════════════════

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        // Session tools
        ...getSessionTools(),
        // Memory tools
        ...modules.memory.getTools(),
        // Guard tools
        ...modules.guard.getTools(),
        // Process tools
        ...modules.process.getTools(),
        // Resource tools
        ...modules.resource.getTools(),
        // Workflow tools
        ...modules.workflow.getTools(),
        // Testing tools
        ...modules.testing.getTools(),
        // Documents tools
        ...modules.documents.getTools(),
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    try {
      // Route to appropriate module
      const result = await routeToolCall(name, args, modules, stateManager);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      logger.error(`Tool ${name} failed:`, error);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: true,
              message: error instanceof Error ? error.message : 'Unknown error',
            }),
          },
        ],
        isError: true,
      };
    }
  });

  // ═══════════════════════════════════════════════════════════════
  //                      REGISTER RESOURCES
  // ═══════════════════════════════════════════════════════════════

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: 'ccg://status',
          name: 'CCG Status',
          description: 'Current status of Claude Code Guardian',
          mimeType: 'application/json',
        },
        {
          uri: 'ccg://memory',
          name: 'Memory Summary',
          description: 'Summary of stored memories',
          mimeType: 'application/json',
        },
        {
          uri: 'ccg://tasks',
          name: 'Task List',
          description: 'List of tasks and their status',
          mimeType: 'application/json',
        },
        {
          uri: 'ccg://config',
          name: 'Configuration',
          description: 'Current CCG configuration',
          mimeType: 'application/json',
        },
      ],
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    
    switch (uri) {
      case 'ccg://status':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(await getFullStatus(modules, stateManager)),
          }],
        };
        
      case 'ccg://memory':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(await modules.memory.getSummary()),
          }],
        };
        
      case 'ccg://tasks':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(await modules.workflow.getTaskList()),
          }],
        };
        
      case 'ccg://config':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(config),
          }],
        };
        
      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  });

  return server;
}

// ═══════════════════════════════════════════════════════════════
//                      TOOL ROUTING
// ═══════════════════════════════════════════════════════════════

async function routeToolCall(
  name: string,
  args: Record<string, unknown>,
  modules: Record<string, any>,
  stateManager: StateManager
): Promise<unknown> {
  const [moduleName, toolName] = name.split('_');
  
  switch (moduleName) {
    case 'session':
      return handleSessionTool(toolName, args, modules, stateManager);
    case 'memory':
      return modules.memory.handleTool(toolName, args);
    case 'guard':
      return modules.guard.handleTool(toolName, args);
    case 'process':
      return modules.process.handleTool(toolName, args);
    case 'resource':
      return modules.resource.handleTool(toolName, args);
    case 'workflow':
      return modules.workflow.handleTool(toolName, args);
    case 'testing':
      return modules.testing.handleTool(toolName, args);
    case 'documents':
      return modules.documents.handleTool(toolName, args);
    default:
      throw new Error(`Unknown module: ${moduleName}`);
  }
}

function getSessionTools() {
  return [
    {
      name: 'session_init',
      description: 'Initialize CCG session, load memory, check processes',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'session_end',
      description: 'End session, save all data, cleanup processes',
      inputSchema: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            description: 'Reason for ending session',
          },
        },
        required: [],
      },
    },
    {
      name: 'session_status',
      description: 'Get current session status',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  ];
}

async function handleSessionTool(
  toolName: string,
  args: Record<string, unknown>,
  modules: Record<string, any>,
  stateManager: StateManager
): Promise<unknown> {
  switch (toolName) {
    case 'init':
      return initializeSession(modules, stateManager);
    case 'end':
      return endSession(modules, stateManager, args.reason as string);
    case 'status':
      return getFullStatus(modules, stateManager);
    default:
      throw new Error(`Unknown session tool: ${toolName}`);
  }
}

async function initializeSession(
  modules: Record<string, any>,
  stateManager: StateManager
) {
  // Load memory
  const memoryCount = await modules.memory.loadPersistent();
  
  // Check processes
  const processes = await modules.process.checkRunningProcesses();
  
  // Load pending tasks
  const tasks = await modules.workflow.loadPendingTasks();
  
  // Get resource status
  const resources = await modules.resource.getStatus();
  
  // Create session
  const session = stateManager.createSession();
  
  return {
    sessionId: session.id,
    status: 'ready',
    memory: {
      loaded: memoryCount,
    },
    processes: {
      running: processes.length,
      ports: processes.map(p => p.port).filter(Boolean),
    },
    tasks: {
      pending: tasks.filter(t => t.status === 'pending').length,
      inProgress: tasks.find(t => t.status === 'in_progress'),
    },
    resources,
    message: formatWelcomeMessage(memoryCount, tasks, processes),
  };
}

async function endSession(
  modules: Record<string, any>,
  stateManager: StateManager,
  reason?: string
) {
  // Save memory
  await modules.memory.savePersistent();
  
  // Save tasks
  await modules.workflow.saveTasks();
  
  // Create final checkpoint
  const checkpoint = await modules.resource.createCheckpoint({
    reason: 'session_end',
    name: 'session-end',
  });
  
  // Cleanup processes
  const cleaned = await modules.process.cleanupSpawned();
  
  // End session
  const session = stateManager.endSession();
  
  return {
    sessionId: session.id,
    duration: Date.now() - session.startedAt.getTime(),
    checkpoint: checkpoint.id,
    processesCleanedUp: cleaned,
    memorySaved: true,
    tasksSaved: true,
    message: 'Session ended. All data saved. See you next time!',
  };
}

async function getFullStatus(
  modules: Record<string, any>,
  stateManager: StateManager
) {
  const session = stateManager.getCurrentSession();
  
  return {
    session: {
      id: session?.id,
      status: session?.status || 'not_started',
      startedAt: session?.startedAt,
    },
    memory: await modules.memory.getSummary(),
    guard: await modules.guard.getStatus(),
    process: await modules.process.getStatus(),
    resource: await modules.resource.getStatus(),
    workflow: await modules.workflow.getStatus(),
    testing: await modules.testing.getStatus(),
    documents: await modules.documents.getStatus(),
  };
}

function formatWelcomeMessage(
  memoryCount: number,
  tasks: any[],
  processes: any[]
): string {
  const lines = ['🛡️ Claude Code Guardian Ready'];
  
  lines.push(`🧠 Memory: ${memoryCount} items loaded`);
  
  const inProgress = tasks.find(t => t.status === 'in_progress');
  if (inProgress) {
    lines.push(`💡 Resume: "${inProgress.name}" - ${inProgress.progress}% complete`);
  } else if (tasks.length > 0) {
    lines.push(`📋 Pending tasks: ${tasks.length}`);
  }
  
  if (processes.length > 0) {
    const ports = processes.map(p => p.port).filter(Boolean).join(', ');
    lines.push(`🖥️ Running processes: ${processes.length} (ports: ${ports})`);
  }
  
  return lines.join('\n');
}
```

---

### 4. MODULE IMPLEMENTATION EXAMPLES

#### 4.1. Memory Module

```typescript
// src/modules/memory/memory.service.ts

import { Database } from 'better-sqlite3';
import { v4 as uuid } from 'uuid';
import { Memory, MemoryType, MemoryModuleConfig } from '../../core/types.js';
import { EventBus } from '../../core/event-bus.js';
import { Logger } from '../../core/logger.js';

export class MemoryService {
  private db: Database;
  private memories: Map<string, Memory> = new Map();
  
  constructor(
    private config: MemoryModuleConfig,
    private eventBus: EventBus,
    private logger: Logger
  ) {}

  async initialize(): Promise<void> {
    if (!this.config.enabled) return;
    
    this.db = new Database(this.config.persistPath);
    this.createTables();
    await this.loadFromDb();
    
    this.logger.info(`Memory module initialized with ${this.memories.size} items`);
  }

  private createTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        type TEXT NOT NULL,
        importance INTEGER NOT NULL,
        tags TEXT NOT NULL,
        created_at TEXT NOT NULL,
        accessed_at TEXT NOT NULL,
        access_count INTEGER DEFAULT 0,
        metadata TEXT
      );
      
      CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
      CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance);
    `);
  }

  private async loadFromDb(): Promise<void> {
    const rows = this.db.prepare(`
      SELECT * FROM memories 
      ORDER BY importance DESC, accessed_at DESC
      LIMIT ?
    `).all(this.config.maxItems);
    
    for (const row of rows as any[]) {
      const memory: Memory = {
        id: row.id,
        content: row.content,
        type: row.type as MemoryType,
        importance: row.importance,
        tags: JSON.parse(row.tags),
        createdAt: new Date(row.created_at),
        accessedAt: new Date(row.accessed_at),
        accessCount: row.access_count,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      };
      this.memories.set(memory.id, memory);
    }
  }

  async store(params: {
    content: string;
    type: MemoryType;
    importance: number;
    tags?: string[];
    metadata?: Record<string, unknown>;
  }): Promise<Memory> {
    const memory: Memory = {
      id: uuid(),
      content: params.content,
      type: params.type,
      importance: Math.min(10, Math.max(1, params.importance)),
      tags: params.tags || [],
      createdAt: new Date(),
      accessedAt: new Date(),
      accessCount: 0,
      metadata: params.metadata,
    };

    // Check for duplicates
    const duplicate = this.findSimilar(memory.content);
    if (duplicate) {
      // Update existing instead of creating new
      duplicate.importance = Math.max(duplicate.importance, memory.importance);
      duplicate.accessedAt = new Date();
      duplicate.accessCount++;
      await this.updateInDb(duplicate);
      return duplicate;
    }

    this.memories.set(memory.id, memory);
    await this.insertToDb(memory);
    
    // Enforce max items
    await this.enforceLimit();
    
    this.logger.debug(`Memory stored: ${memory.id}`);
    return memory;
  }

  async recall(params: {
    query: string;
    type?: MemoryType;
    limit?: number;
  }): Promise<Memory[]> {
    const limit = params.limit || 10;
    const query = params.query.toLowerCase();
    
    let results = Array.from(this.memories.values());
    
    // Filter by type if specified
    if (params.type) {
      results = results.filter(m => m.type === params.type);
    }
    
    // Score by relevance
    const scored = results.map(memory => {
      let score = 0;
      
      // Content match
      if (memory.content.toLowerCase().includes(query)) {
        score += 10;
      }
      
      // Tag match
      for (const tag of memory.tags) {
        if (tag.toLowerCase().includes(query)) {
          score += 5;
        }
      }
      
      // Importance boost
      score += memory.importance;
      
      // Recency boost
      const daysSinceAccess = (Date.now() - memory.accessedAt.getTime()) / (1000 * 60 * 60 * 24);
      score -= Math.min(5, daysSinceAccess * 0.1);
      
      return { memory, score };
    });
    
    // Sort by score and take top results
    const topResults = scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.memory);
    
    // Update access times
    for (const memory of topResults) {
      memory.accessedAt = new Date();
      memory.accessCount++;
      await this.updateInDb(memory);
    }
    
    return topResults;
  }

  async forget(id: string): Promise<boolean> {
    if (!this.memories.has(id)) {
      return false;
    }
    
    this.memories.delete(id);
    this.db.prepare('DELETE FROM memories WHERE id = ?').run(id);
    
    this.logger.debug(`Memory deleted: ${id}`);
    return true;
  }

  async getSummary(): Promise<{
    total: number;
    byType: Record<string, number>;
    recentlyAccessed: Memory[];
    mostImportant: Memory[];
  }> {
    const all = Array.from(this.memories.values());
    
    const byType: Record<string, number> = {};
    for (const memory of all) {
      byType[memory.type] = (byType[memory.type] || 0) + 1;
    }
    
    const recentlyAccessed = [...all]
      .sort((a, b) => b.accessedAt.getTime() - a.accessedAt.getTime())
      .slice(0, 5);
    
    const mostImportant = [...all]
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 5);
    
    return {
      total: all.length,
      byType,
      recentlyAccessed,
      mostImportant,
    };
  }

  getSnapshot(): Memory[] {
    return Array.from(this.memories.values());
  }

  async loadSnapshot(memories: Memory[]): Promise<void> {
    this.memories.clear();
    for (const memory of memories) {
      this.memories.set(memory.id, memory);
      await this.insertToDb(memory);
    }
  }

  private findSimilar(content: string): Memory | undefined {
    const normalized = content.toLowerCase().trim();
    
    for (const memory of this.memories.values()) {
      const memoryNormalized = memory.content.toLowerCase().trim();
      
      // Simple similarity check (could use embeddings for better matching)
      if (memoryNormalized === normalized) {
        return memory;
      }
      
      // Check for high overlap
      const overlap = this.calculateOverlap(normalized, memoryNormalized);
      if (overlap > 0.8) {
        return memory;
      }
    }
    
    return undefined;
  }

  private calculateOverlap(a: string, b: string): number {
    const wordsA = new Set(a.split(/\s+/));
    const wordsB = new Set(b.split(/\s+/));
    
    let intersection = 0;
    for (const word of wordsA) {
      if (wordsB.has(word)) {
        intersection++;
      }
    }
    
    return intersection / Math.max(wordsA.size, wordsB.size);
  }

  private async insertToDb(memory: Memory): Promise<void> {
    this.db.prepare(`
      INSERT OR REPLACE INTO memories 
      (id, content, type, importance, tags, created_at, accessed_at, access_count, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      memory.id,
      memory.content,
      memory.type,
      memory.importance,
      JSON.stringify(memory.tags),
      memory.createdAt.toISOString(),
      memory.accessedAt.toISOString(),
      memory.accessCount,
      memory.metadata ? JSON.stringify(memory.metadata) : null
    );
  }

  private async updateInDb(memory: Memory): Promise<void> {
    this.db.prepare(`
      UPDATE memories 
      SET importance = ?, accessed_at = ?, access_count = ?
      WHERE id = ?
    `).run(
      memory.importance,
      memory.accessedAt.toISOString(),
      memory.accessCount,
      memory.id
    );
  }

  private async enforceLimit(): Promise<void> {
    if (this.memories.size <= this.config.maxItems) {
      return;
    }
    
    // Remove least important + least recently accessed
    const sorted = Array.from(this.memories.values())
      .sort((a, b) => {
        const scoreA = a.importance * 10 - (Date.now() - a.accessedAt.getTime()) / (1000 * 60 * 60);
        const scoreB = b.importance * 10 - (Date.now() - b.accessedAt.getTime()) / (1000 * 60 * 60);
        return scoreA - scoreB;
      });
    
    const toRemove = sorted.slice(0, this.memories.size - this.config.maxItems);
    
    for (const memory of toRemove) {
      await this.forget(memory.id);
    }
  }
}
```

```typescript
// src/modules/memory/memory.tools.ts

import { Tool } from '@modelcontextprotocol/sdk/types.js';

export function getMemoryTools(): Tool[] {
  return [
    {
      name: 'memory_store',
      description: 'Store information in persistent memory for later recall',
      inputSchema: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: 'The information to store',
          },
          type: {
            type: 'string',
            enum: ['decision', 'fact', 'code_pattern', 'error', 'note', 'convention', 'architecture'],
            description: 'Type of memory',
          },
          importance: {
            type: 'number',
            minimum: 1,
            maximum: 10,
            description: 'Importance level (1-10)',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Tags for categorization',
          },
        },
        required: ['content', 'type', 'importance'],
      },
    },
    {
      name: 'memory_recall',
      description: 'Search and retrieve stored memories',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query',
          },
          type: {
            type: 'string',
            enum: ['decision', 'fact', 'code_pattern', 'error', 'note', 'convention', 'architecture'],
            description: 'Filter by type (optional)',
          },
          limit: {
            type: 'number',
            default: 10,
            description: 'Maximum results to return',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'memory_forget',
      description: 'Remove a specific memory',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Memory ID to remove',
          },
        },
        required: ['id'],
      },
    },
    {
      name: 'memory_summary',
      description: 'Get summary of stored memories',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  ];
}
```

#### 4.2. Guard Module

```typescript
// src/modules/guard/guard.service.ts

import { 
  ValidationResult, 
  ValidationIssue, 
  GuardModuleConfig,
  CodeLocation 
} from '../../core/types.js';
import { EventBus } from '../../core/event-bus.js';
import { Logger } from '../../core/logger.js';

import { FakeTestRule } from './rules/fake-test.rule.js';
import { DisabledFeatureRule } from './rules/disabled-feature.rule.js';
import { EmptyCatchRule } from './rules/empty-catch.rule.js';
import { EmojiCodeRule } from './rules/emoji-code.rule.js';

export interface GuardRule {
  name: string;
  enabled: boolean;
  validate(code: string, filename: string): ValidationIssue[];
}

export class GuardService {
  private rules: GuardRule[] = [];
  private blockedCount = 0;
  private warningCount = 0;
  
  constructor(
    private config: GuardModuleConfig,
    private eventBus: EventBus,
    private logger: Logger
  ) {}

  async initialize(): Promise<void> {
    if (!this.config.enabled) return;
    
    // Initialize built-in rules
    if (this.config.rules.blockFakeTests) {
      this.rules.push(new FakeTestRule());
    }
    
    if (this.config.rules.blockDisabledFeatures) {
      this.rules.push(new DisabledFeatureRule());
    }
    
    if (this.config.rules.blockEmptyCatch) {
      this.rules.push(new EmptyCatchRule());
    }
    
    if (this.config.rules.blockEmojiInCode) {
      this.rules.push(new EmojiCodeRule());
    }
    
    this.logger.info(`Guard module initialized with ${this.rules.length} rules`);
  }

  async validate(code: string, filename: string): Promise<ValidationResult> {
    if (!this.config.enabled) {
      return { valid: true, issues: [], blocked: false, suggestions: [] };
    }
    
    const issues: ValidationIssue[] = [];
    
    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      
      const ruleIssues = rule.validate(code, filename);
      issues.push(...ruleIssues);
    }
    
    // Determine if should block
    const blockingIssues = issues.filter(i => i.severity === 'block');
    const blocked = this.config.strictMode && blockingIssues.length > 0;
    
    // Update counts
    if (blocked) {
      this.blockedCount++;
      this.eventBus.emit({
        type: 'guard:block',
        validation: { valid: false, issues, blocked: true, suggestions: [] },
        timestamp: new Date(),
      });
    }
    
    const warningIssues = issues.filter(i => i.severity === 'warning' || i.severity === 'error');
    if (warningIssues.length > 0) {
      this.warningCount += warningIssues.length;
      this.eventBus.emit({
        type: 'guard:warning',
        validation: { valid: true, issues: warningIssues, blocked: false, suggestions: [] },
        timestamp: new Date(),
      });
    }
    
    // Generate suggestions
    const suggestions = this.generateSuggestions(issues);
    
    return {
      valid: !blocked,
      issues,
      blocked,
      suggestions,
    };
  }

  async checkTest(testCode: string, filename: string): Promise<{
    valid: boolean;
    issues: ValidationIssue[];
    hasAssertions: boolean;
    assertionCount: number;
  }> {
    const fakeTestRule = this.rules.find(r => r.name === 'fake-test') as FakeTestRule;
    
    if (!fakeTestRule) {
      return { valid: true, issues: [], hasAssertions: true, assertionCount: 0 };
    }
    
    const issues = fakeTestRule.validate(testCode, filename);
    const analysis = fakeTestRule.analyzeTestFile(testCode);
    
    return {
      valid: issues.filter(i => i.severity === 'block').length === 0,
      issues,
      hasAssertions: analysis.hasAssertions,
      assertionCount: analysis.assertionCount,
    };
  }

  getStatus(): {
    enabled: boolean;
    rules: { name: string; enabled: boolean }[];
    blockedCount: number;
    warningCount: number;
  } {
    return {
      enabled: this.config.enabled,
      rules: this.rules.map(r => ({ name: r.name, enabled: r.enabled })),
      blockedCount: this.blockedCount,
      warningCount: this.warningCount,
    };
  }

  private generateSuggestions(issues: ValidationIssue[]): string[] {
    const suggestions: string[] = [];
    
    for (const issue of issues) {
      if (issue.suggestion) {
        suggestions.push(issue.suggestion);
      }
    }
    
    return [...new Set(suggestions)]; // Remove duplicates
  }
}
```

```typescript
// src/modules/guard/rules/fake-test.rule.ts

import { ValidationIssue, CodeLocation } from '../../../core/types.js';
import { GuardRule } from '../guard.service.js';

export class FakeTestRule implements GuardRule {
  name = 'fake-test';
  enabled = true;

  // Patterns that indicate a real test
  private assertionPatterns = [
    /expect\s*\(/,
    /assert\s*\(/,
    /\.toBe\(/,
    /\.toEqual\(/,
    /\.toMatch\(/,
    /\.toThrow\(/,
    /\.toHaveBeenCalled/,
    /\.toContain\(/,
    /\.toBeTruthy\(/,
    /\.toBeFalsy\(/,
    /\.toBeNull\(/,
    /\.toBeDefined\(/,
    /\.rejects\./,
    /\.resolves\./,
    /should\./,
    /chai\./,
  ];

  // Patterns that indicate a test function
  private testPatterns = [
    /it\s*\(\s*['"`]/,
    /test\s*\(\s*['"`]/,
    /describe\s*\(\s*['"`]/,
    /it\.each/,
    /test\.each/,
  ];

  validate(code: string, filename: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    // Only check test files
    if (!this.isTestFile(filename)) {
      return issues;
    }
    
    const lines = code.split('\n');
    const testBlocks = this.findTestBlocks(code);
    
    for (const block of testBlocks) {
      if (!this.hasAssertion(block.content)) {
        issues.push({
          rule: this.name,
          severity: 'block',
          message: `Test "${block.name}" has no assertions. This may be a fake test.`,
          location: {
            file: filename,
            line: block.startLine,
            endLine: block.endLine,
            snippet: block.content.slice(0, 200),
          },
          suggestion: 'Add expect() or assert() statements to verify behavior',
          autoFixable: false,
        });
      }
    }
    
    // Check for tests that just call functions without assertions
    const suspiciousPatterns = this.findSuspiciousPatterns(code);
    for (const pattern of suspiciousPatterns) {
      issues.push({
        rule: this.name,
        severity: 'warning',
        message: pattern.message,
        location: pattern.location,
        suggestion: pattern.suggestion,
        autoFixable: false,
      });
    }
    
    return issues;
  }

  analyzeTestFile(code: string): {
    hasAssertions: boolean;
    assertionCount: number;
    testCount: number;
    suspiciousTests: string[];
  } {
    const testBlocks = this.findTestBlocks(code);
    let assertionCount = 0;
    const suspiciousTests: string[] = [];
    
    for (const block of testBlocks) {
      const blockAssertions = this.countAssertions(block.content);
      assertionCount += blockAssertions;
      
      if (blockAssertions === 0) {
        suspiciousTests.push(block.name);
      }
    }
    
    return {
      hasAssertions: assertionCount > 0,
      assertionCount,
      testCount: testBlocks.length,
      suspiciousTests,
    };
  }

  private isTestFile(filename: string): boolean {
    return /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename) ||
           /__(tests|test)__/.test(filename);
  }

  private findTestBlocks(code: string): {
    name: string;
    content: string;
    startLine: number;
    endLine: number;
  }[] {
    const blocks: any[] = [];
    const lines = code.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Match it() or test()
      const match = line.match(/(?:it|test)\s*\(\s*['"`]([^'"`]+)['"`]/);
      if (match) {
        const name = match[1];
        const startLine = i + 1;
        
        // Find the end of the test block (simple brace counting)
        let braceCount = 0;
        let started = false;
        let endLine = startLine;
        let content = '';
        
        for (let j = i; j < lines.length; j++) {
          content += lines[j] + '\n';
          
          for (const char of lines[j]) {
            if (char === '{') {
              braceCount++;
              started = true;
            } else if (char === '}') {
              braceCount--;
            }
          }
          
          if (started && braceCount === 0) {
            endLine = j + 1;
            break;
          }
        }
        
        blocks.push({ name, content, startLine, endLine });
      }
    }
    
    return blocks;
  }

  private hasAssertion(code: string): boolean {
    return this.assertionPatterns.some(pattern => pattern.test(code));
  }

  private countAssertions(code: string): number {
    let count = 0;
    for (const pattern of this.assertionPatterns) {
      const matches = code.match(new RegExp(pattern.source, 'g'));
      if (matches) {
        count += matches.length;
      }
    }
    return count;
  }

  private findSuspiciousPatterns(code: string): {
    message: string;
    location: CodeLocation;
    suggestion: string;
  }[] {
    const patterns: any[] = [];
    const lines = code.split('\n');
    
    // Pattern: test that only calls a function
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for test with just a function call
      if (/(?:it|test)\s*\([^)]+,\s*(?:async\s*)?\(\)\s*=>\s*{\s*\w+\([^)]*\);\s*}\)/.test(line)) {
        patterns.push({
          message: 'Test only calls a function without verifying its result',
          location: { file: '', line: i + 1, snippet: line },
          suggestion: 'Add assertions to verify the function behavior',
        });
      }
    }
    
    return patterns;
  }
}
```

```typescript
// src/modules/guard/rules/disabled-feature.rule.ts

import { ValidationIssue } from '../../../core/types.js';
import { GuardRule } from '../guard.service.js';

export class DisabledFeatureRule implements GuardRule {
  name = 'disabled-feature';
  enabled = true;

  // Patterns that indicate disabled features
  private disabledPatterns = [
    {
      pattern: /\/\/\s*(?:TODO|FIXME|HACK):\s*disabled/i,
      message: 'Feature marked as disabled with TODO comment',
    },
    {
      pattern: /if\s*\(\s*false\s*\)/,
      message: 'Code disabled with if(false)',
    },
    {
      pattern: /return\s*;\s*\/\/.*(?:skip|disable|temp)/i,
      message: 'Early return used to skip code',
    },
    {
      pattern: /(?:export\s+)?(?:async\s+)?function\s+\w+[^{]*{\s*(?:\/\/[^\n]*\n\s*)?return\s*;?\s*}/,
      message: 'Function implementation replaced with empty body',
    },
  ];

  // Critical features that should never be disabled
  private criticalPatterns = [
    {
      pattern: /(?:auth|authentication|authorize|login|logout|session)/i,
      category: 'authentication',
    },
    {
      pattern: /(?:validateToken|verifyToken|checkToken|parseToken)/i,
      category: 'token validation',
    },
    {
      pattern: /(?:sanitize|escape|validate|xss|csrf|sql)/i,
      category: 'security validation',
    },
    {
      pattern: /(?:middleware|interceptor|guard|protect)/i,
      category: 'middleware/guards',
    },
  ];

  validate(code: string, filename: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const lines = code.split('\n');
    
    // Check for commented out blocks
    const commentedBlocks = this.findCommentedBlocks(code);
    for (const block of commentedBlocks) {
      // Check if commented block contains critical code
      for (const critical of this.criticalPatterns) {
        if (critical.pattern.test(block.content)) {
          issues.push({
            rule: this.name,
            severity: 'block',
            message: `Critical ${critical.category} code has been commented out`,
            location: {
              file: filename,
              line: block.startLine,
              endLine: block.endLine,
              snippet: block.content.slice(0, 200),
            },
            suggestion: 'Do not disable security-critical features. Fix the underlying issue instead.',
            autoFixable: false,
          });
        }
      }
    }
    
    // Check for disabled patterns
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      for (const disabled of this.disabledPatterns) {
        if (disabled.pattern.test(line)) {
          // Check if this is critical code
          const isCritical = this.criticalPatterns.some(c => c.pattern.test(line));
          
          issues.push({
            rule: this.name,
            severity: isCritical ? 'block' : 'warning',
            message: disabled.message,
            location: {
              file: filename,
              line: i + 1,
              snippet: line,
            },
            suggestion: 'Remove the disabled code or properly implement the feature',
            autoFixable: false,
          });
        }
      }
    }
    
    // Check for empty function bodies that used to have implementation
    const emptyFunctions = this.findEmptyFunctions(code);
    for (const func of emptyFunctions) {
      const isCritical = this.criticalPatterns.some(c => c.pattern.test(func.name));
      
      if (isCritical) {
        issues.push({
          rule: this.name,
          severity: 'block',
          message: `Critical function "${func.name}" has empty implementation`,
          location: {
            file: filename,
            line: func.line,
            snippet: func.snippet,
          },
          suggestion: 'Implement the function properly or throw NotImplementedError',
          autoFixable: false,
        });
      }
    }
    
    return issues;
  }

  private findCommentedBlocks(code: string): {
    content: string;
    startLine: number;
    endLine: number;
  }[] {
    const blocks: any[] = [];
    const lines = code.split('\n');
    
    let inBlock = false;
    let blockStart = 0;
    let blockContent = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Multi-line comment start
      if (line.startsWith('/*') && !line.includes('*/')) {
        inBlock = true;
        blockStart = i + 1;
        blockContent = line;
        continue;
      }
      
      // Multi-line comment end
      if (inBlock && line.includes('*/')) {
        blockContent += '\n' + line;
        blocks.push({
          content: blockContent,
          startLine: blockStart,
          endLine: i + 1,
        });
        inBlock = false;
        blockContent = '';
        continue;
      }
      
      // Inside multi-line comment
      if (inBlock) {
        blockContent += '\n' + line;
        continue;
      }
      
      // Check for consecutive single-line comments
      if (line.startsWith('//')) {
        if (!inBlock) {
          inBlock = true;
          blockStart = i + 1;
        }
        blockContent += '\n' + line;
      } else if (inBlock && blockContent.split('\n').length >= 3) {
        // End of consecutive comments (3+ lines)
        blocks.push({
          content: blockContent,
          startLine: blockStart,
          endLine: i,
        });
        inBlock = false;
        blockContent = '';
      } else {
        inBlock = false;
        blockContent = '';
      }
    }
    
    return blocks;
  }

  private findEmptyFunctions(code: string): {
    name: string;
    line: number;
    snippet: string;
  }[] {
    const functions: any[] = [];
    const lines = code.split('\n');
    
    // Pattern for empty functions
    const emptyFuncPattern = /(?:export\s+)?(?:async\s+)?function\s+(\w+)[^{]*{\s*}/;
    const emptyArrowPattern = /(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*{\s*}/;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      let match = line.match(emptyFuncPattern);
      if (!match) {
        match = line.match(emptyArrowPattern);
      }
      
      if (match) {
        functions.push({
          name: match[1],
          line: i + 1,
          snippet: line.trim(),
        });
      }
    }
    
    return functions;
  }
}
```

#### 4.3. Process Module

```typescript
// src/modules/process/process.service.ts

import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { ProcessInfo, PortStatus, ProcessModuleConfig } from '../../core/types.js';
import { EventBus } from '../../core/event-bus.js';
import { Logger } from '../../core/logger.js';

const execAsync = promisify(exec);

export class ProcessService {
  private spawnedProcesses: Map<number, ProcessInfo> = new Map();
  
  constructor(
    private config: ProcessModuleConfig,
    private eventBus: EventBus,
    private logger: Logger
  ) {}

  async initialize(): Promise<void> {
    if (!this.config.enabled) return;
    
    // Check configured ports on startup
    for (const [name, port] of Object.entries(this.config.ports)) {
      const status = await this.checkPort(port);
      if (!status.available) {
        this.logger.warn(`Port ${port} (${name}) is already in use`);
      }
    }
    
    this.logger.info('Process module initialized');
  }

  async checkPort(port: number): Promise<PortStatus> {
    try {
      // Check if port is in use
      const { stdout } = await execAsync(`lsof -i :${port} -t 2>/dev/null || true`);
      const pids = stdout.trim().split('\n').filter(Boolean);
      
      if (pids.length === 0) {
        return { port, available: true };
      }
      
      // Get process info
      const pid = parseInt(pids[0], 10);
      const processInfo = await this.getProcessInfo(pid);
      
      return {
        port,
        available: false,
        usedBy: processInfo,
      };
    } catch (error) {
      this.logger.error(`Error checking port ${port}:`, error);
      return { port, available: true }; // Assume available if check fails
    }
  }

  async killProcessOnPort(port: number): Promise<{ killed: boolean; pid?: number }> {
    const status = await this.checkPort(port);
    
    if (status.available) {
      return { killed: false };
    }
    
    try {
      const { stdout } = await execAsync(`lsof -i :${port} -t`);
      const pids = stdout.trim().split('\n').filter(Boolean);
      
      for (const pidStr of pids) {
        const pid = parseInt(pidStr, 10);
        await execAsync(`kill -9 ${pid}`);
        this.logger.info(`Killed process ${pid} on port ${port}`);
        
        // Remove from tracked if it was ours
        this.spawnedProcesses.delete(pid);
      }
      
      return { killed: true, pid: parseInt(pids[0], 10) };
    } catch (error) {
      this.logger.error(`Error killing process on port ${port}:`, error);
      return { killed: false };
    }
  }

  async spawnProcess(params: {
    command: string;
    args?: string[];
    port?: number;
    name?: string;
    cwd?: string;
  }): Promise<ProcessInfo> {
    const { command, args = [], port, name, cwd } = params;
    
    // If port specified and in use, handle conflict
    if (port && this.config.autoKillOnConflict) {
      const status = await this.checkPort(port);
      if (!status.available) {
        this.logger.info(`Port ${port} in use, killing existing process`);
        await this.killProcessOnPort(port);
        // Wait a moment for port to be released
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    const child = spawn(command, args, {
      cwd,
      detached: true,
      stdio: 'ignore',
    });
    
    child.unref();
    
    const processInfo: ProcessInfo = {
      pid: child.pid!,
      name: name || command,
      port,
      command: `${command} ${args.join(' ')}`,
      startedAt: new Date(),
      status: 'running',
      spawnedBy: 'ccg',
    };
    
    if (this.config.trackSpawnedProcesses) {
      this.spawnedProcesses.set(child.pid!, processInfo);
    }
    
    this.logger.info(`Spawned process ${processInfo.pid}: ${processInfo.command}`);
    
    return processInfo;
  }

  async cleanupSpawned(): Promise<number> {
    let cleaned = 0;
    
    for (const [pid, info] of this.spawnedProcesses.entries()) {
      try {
        await execAsync(`kill -9 ${pid} 2>/dev/null || true`);
        this.logger.info(`Cleaned up process ${pid}: ${info.name}`);
        cleaned++;
      } catch (error) {
        // Process may already be dead
      }
    }
    
    this.spawnedProcesses.clear();
    return cleaned;
  }

  async getRunningProcesses(): Promise<ProcessInfo[]> {
    const processes: ProcessInfo[] = [];
    
    // Check tracked processes
    for (const [pid, info] of this.spawnedProcesses.entries()) {
      const isRunning = await this.isProcessRunning(pid);
      if (isRunning) {
        processes.push(info);
      } else {
        this.spawnedProcesses.delete(pid);
      }
    }
    
    // Check configured ports
    for (const [name, port] of Object.entries(this.config.ports)) {
      const status = await this.checkPort(port);
      if (!status.available && status.usedBy) {
        // Only add if not already tracked
        if (!processes.find(p => p.pid === status.usedBy!.pid)) {
          processes.push(status.usedBy);
        }
      }
    }
    
    return processes;
  }

  getStatus(): {
    tracked: number;
    ports: Record<string, number>;
  } {
    return {
      tracked: this.spawnedProcesses.size,
      ports: this.config.ports,
    };
  }

  private async getProcessInfo(pid: number): Promise<ProcessInfo> {
    try {
      const { stdout: cmdOutput } = await execAsync(`ps -p ${pid} -o comm= 2>/dev/null || echo unknown`);
      const { stdout: argsOutput } = await execAsync(`ps -p ${pid} -o args= 2>/dev/null || echo unknown`);
      
      const tracked = this.spawnedProcesses.get(pid);
      
      return {
        pid,
        name: cmdOutput.trim(),
        command: argsOutput.trim(),
        startedAt: tracked?.startedAt || new Date(),
        status: 'running',
        spawnedBy: tracked ? 'ccg' : 'unknown',
        port: tracked?.port,
      };
    } catch (error) {
      return {
        pid,
        name: 'unknown',
        command: 'unknown',
        startedAt: new Date(),
        status: 'unknown' as any,
        spawnedBy: 'unknown',
      };
    }
  }

  private async isProcessRunning(pid: number): Promise<boolean> {
    try {
      await execAsync(`ps -p ${pid} -o pid= 2>/dev/null`);
      return true;
    } catch {
      return false;
    }
  }
}
```

---

### 5. PACKAGE.JSON

```json
{
  "name": "@anthropic-community/claude-code-guardian",
  "version": "1.0.0",
  "description": "Unified MCP server for Claude Code - Memory, Guard, Process, Testing & More",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "type": "module",
  "bin": {
    "ccg": "./dist/bin/ccg.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "start": "node dist/index.js",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "lint": "eslint src/",
    "format": "prettier --write src/",
    "prepublishOnly": "npm run build"
  },
  "keywords": [
    "claude",
    "claude-code",
    "mcp",
    "model-context-protocol",
    "ai",
    "coding-assistant",
    "memory",
    "guard",
    "testing"
  ],
  "author": "Community",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/anthropic-community/claude-code-guardian"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "better-sqlite3": "^9.4.0",
    "uuid": "^9.0.0",
    "glob": "^10.3.0",
    "chalk": "^5.3.0",
    "commander": "^12.0.0",
    "playwright": "^1.40.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "@types/node": "^20.0.0",
    "@types/uuid": "^9.0.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0",
    "@vitest/coverage-v8": "^1.0.0",
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "prettier": "^3.2.0"
  },
  "files": [
    "dist/",
    "templates/",
    "README.md",
    "LICENSE"
  ]
}
```

---

### 6. TSCONFIG.JSON

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

---

### 7. CLI IMPLEMENTATION

```typescript
// src/bin/ccg.ts

#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync, copyFileSync } from 'fs';

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
    
    // Check if already initialized
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
    
    mkdirSync(claudeDir, { recursive: true });
    mkdirSync(join(claudeDir, 'commands'), { recursive: true });
    
    // Copy template files
    const templateDir = join(__dirname, '..', '..', 'templates');
    
    // Config
    copyFileSync(
      join(templateDir, 'config.template.json'),
      join(ccgDir, 'config.json')
    );
    console.log(chalk.green('✓ Created .ccg/config.json'));
    
    // Hooks
    copyFileSync(
      join(templateDir, 'hooks.template.json'),
      join(claudeDir, 'hooks.json')
    );
    console.log(chalk.green('✓ Created .claude/hooks.json'));
    
    // Commands
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
    } else {
      console.log(chalk.yellow('ℹ  .mcp.json already exists - please add CCG manually'));
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
    const cwd = process.cwd();
    const ccgDir = join(cwd, '.ccg');
    
    if (!existsSync(ccgDir)) {
      console.log(chalk.red('❌ CCG not initialized. Run "ccg init" first.\n'));
      return;
    }
    
    console.log(chalk.blue('🛡️ Claude Code Guardian Status\n'));
    console.log(chalk.green('✓ Initialized'));
    console.log(`  Config: ${join(ccgDir, 'config.json')}`);
    console.log(`  Memory: ${join(ccgDir, 'memory.db')}`);
    
    // TODO: Show more status info
  });

// Doctor command
program
  .command('doctor')
  .description('Check CCG configuration and diagnose issues')
  .action(async () => {
    console.log(chalk.blue('🔍 Running CCG diagnostics...\n'));
    
    const cwd = process.cwd();
    const checks = [
      { name: '.ccg directory', path: join(cwd, '.ccg') },
      { name: '.ccg/config.json', path: join(cwd, '.ccg', 'config.json') },
      { name: '.claude/hooks.json', path: join(cwd, '.claude', 'hooks.json') },
      { name: '.mcp.json', path: join(cwd, '.mcp.json') },
    ];
    
    let allPassed = true;
    
    for (const check of checks) {
      if (existsSync(check.path)) {
        console.log(chalk.green(`✓ ${check.name}`));
      } else {
        console.log(chalk.red(`✗ ${check.name} - not found`));
        allPassed = false;
      }
    }
    
    console.log();
    
    if (allPassed) {
      console.log(chalk.green('✅ All checks passed!\n'));
    } else {
      console.log(chalk.yellow('⚠️  Some checks failed. Run "ccg init" to fix.\n'));
    }
  });

program.parse();
```

---

### 8. NEXT STEPS

Tôi đã provide:

1. ✅ **Project Structure** - Tổ chức code chi tiết
2. ✅ **Core Types & Interfaces** - TypeScript interfaces đầy đủ
3. ✅ **MCP Server Setup** - Server configuration và routing
4. ✅ **Module Examples** - Memory, Guard, Process modules
5. ✅ **Package Configuration** - package.json, tsconfig.json
6. ✅ **CLI Implementation** - ccg init, status, doctor

**Bạn muốn tiếp tục với:**

1. **Remaining Modules** - Resource, Workflow, Testing, Documents modules
2. **Hook Implementations** - SessionStart, PreToolCall, PostToolCall handlers
3. **Testing Strategy** - Unit tests, integration tests, E2E tests
4. **Build & Publish** - CI/CD, npm publishing guide
5. **Prototype** - Tạo working MVP với core features