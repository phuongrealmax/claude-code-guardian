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
import { CCGConfig } from './core/types.js';

import { MemoryModule } from './modules/memory/index.js';
import { GuardModule } from './modules/guard/index.js';
import { WorkflowModule } from './modules/workflow/index.js';
import { ProcessModule } from './modules/process/index.js';
import { ResourceModule } from './modules/resource/index.js';
import { TestingModule } from './modules/testing/index.js';
import { DocumentsModule } from './modules/documents/index.js';
import { AgentsModule } from './modules/agents/index.js';

// ═══════════════════════════════════════════════════════════════
//                      TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

interface CCGModules {
  memory: MemoryModule;
  guard: GuardModule;
  workflow: WorkflowModule;
  process: ProcessModule;
  resource: ResourceModule;
  testing: TestingModule;
  documents: DocumentsModule;
  agents: AgentsModule;
}

interface SessionInitResult {
  sessionId: string;
  status: string;
  memory: { loaded: number };
  message: string;
}

// ═══════════════════════════════════════════════════════════════
//                      SERVER FACTORY
// ═══════════════════════════════════════════════════════════════

export async function createCCGServer(): Promise<Server> {
  // Determine project root from environment or current working directory
  const projectRoot = process.env.CCG_PROJECT_ROOT || process.cwd();
  const logLevel = (process.env.CCG_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info';

  // Initialize core services
  const logger = new Logger(logLevel, 'CCG');
  const eventBus = new EventBus();
  const configManager = new ConfigManager(projectRoot, logger, eventBus);
  const stateManager = new StateManager(projectRoot, logger, eventBus);

  logger.debug(`Project root: ${projectRoot}`);

  logger.info('Initializing Claude Code Guardian...');

  // Load configuration
  let config: CCGConfig;
  try {
    config = await configManager.load();
    logger.info('Configuration loaded successfully');
  } catch (error) {
    logger.warn('Using default configuration');
    config = configManager.getDefaultConfig();
  }

  // Resolve relative paths in config to absolute
  const memoryConfig = {
    ...config.modules.memory,
    persistPath: configManager.resolvePath(config.modules.memory.persistPath),
  };

  logger.debug(`Memory DB path: ${memoryConfig.persistPath}`);

  // Default agents config
  const defaultAgentsConfig = {
    enabled: true,
    agentsFilePath: 'AGENTS.md',
    agentsDir: '.claude/agents',
    autoReload: true,
    enableCoordination: true,
  };
  const agentsConfig = config.modules.agents || defaultAgentsConfig;

  // Initialize modules
  const modules: CCGModules = {
    memory: new MemoryModule(memoryConfig, eventBus, logger),
    guard: new GuardModule(config.modules.guard, eventBus, logger),
    workflow: new WorkflowModule(config.modules.workflow, eventBus, logger, projectRoot),
    process: new ProcessModule(config.modules.process, eventBus, logger),
    resource: new ResourceModule(config.modules.resource, eventBus, logger, projectRoot),
    testing: new TestingModule(config.modules.testing, eventBus, logger, projectRoot),
    documents: new DocumentsModule(config.modules.documents, eventBus, logger, projectRoot),
    agents: new AgentsModule(agentsConfig, eventBus, logger, projectRoot),
  };

  // Initialize all enabled modules
  const initPromises: Promise<void>[] = [];

  if (config.modules.memory.enabled) {
    initPromises.push(modules.memory.initialize());
  }

  if (config.modules.guard.enabled) {
    initPromises.push(modules.guard.initialize());
  }

  if (config.modules.workflow.enabled) {
    initPromises.push(modules.workflow.initialize());
  }

  if (config.modules.process.enabled) {
    initPromises.push(modules.process.initialize());
  }

  if (config.modules.resource.enabled) {
    initPromises.push(modules.resource.initialize());
  }

  if (config.modules.testing.enabled) {
    initPromises.push(modules.testing.initialize());
  }

  if (config.modules.documents.enabled) {
    initPromises.push(modules.documents.initialize());
  }

  if (agentsConfig.enabled) {
    initPromises.push(modules.agents.initialize());
  }

  await Promise.all(initPromises);
  logger.info('All modules initialized');

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
    const tools = [
      // Session tools
      ...getSessionTools(),
      // Memory tools
      ...modules.memory.getTools(),
      // Guard tools
      ...modules.guard.getTools(),
      // Workflow tools
      ...modules.workflow.getTools(),
      // Process tools
      ...modules.process.getTools(),
      // Resource tools
      ...modules.resource.getTools(),
      // Testing tools
      ...modules.testing.getTools(),
      // Documents tools
      ...modules.documents.getTools(),
      // Agents tools
      ...modules.agents.getTools(),
    ];

    logger.debug(`Listing ${tools.length} tools`);
    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    logger.debug(`Tool call: ${name}`, args);

    try {
      // Route to appropriate handler
      const result = await routeToolCall(
        name,
        args as Record<string, unknown>,
        modules,
        stateManager,
        logger
      );

      return {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
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
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(await getFullStatus(modules, stateManager), null, 2),
            },
          ],
        };

      case 'ccg://memory':
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(await modules.memory.getSummary(), null, 2),
            },
          ],
        };

      case 'ccg://config':
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(config, null, 2),
            },
          ],
        };

      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  });

  logger.info('Claude Code Guardian MCP Server ready');
  return server;
}

// ═══════════════════════════════════════════════════════════════
//                      SESSION TOOLS
// ═══════════════════════════════════════════════════════════════

function getSessionTools() {
  return [
    {
      name: 'session_init',
      description: 'Initialize CCG session, load memory, check status. Call this at the start of a new conversation.',
      inputSchema: {
        type: 'object' as const,
        properties: {},
        required: [] as string[],
      },
    },
    {
      name: 'session_end',
      description: 'End the current CCG session, save all data. Call this before ending a conversation.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          reason: {
            type: 'string',
            description: 'Reason for ending session (optional)',
          },
        },
        required: [] as string[],
      },
    },
    {
      name: 'session_status',
      description: 'Get current session status including memory count, active tasks, and resource usage.',
      inputSchema: {
        type: 'object' as const,
        properties: {},
        required: [] as string[],
      },
    },
  ];
}

// ═══════════════════════════════════════════════════════════════
//                      TOOL ROUTING
// ═══════════════════════════════════════════════════════════════

async function routeToolCall(
  name: string,
  args: Record<string, unknown>,
  modules: CCGModules,
  stateManager: StateManager,
  logger: Logger
): Promise<unknown> {
  // Parse tool name: module_action
  const [moduleName, ...actionParts] = name.split('_');
  const action = actionParts.join('_');

  switch (moduleName) {
    case 'session':
      return handleSessionTool(action, args, modules, stateManager, logger);

    case 'memory':
      return modules.memory.handleTool(action, args);

    case 'guard':
      return modules.guard.handleTool(action, args);

    case 'workflow':
      return modules.workflow.handleTool(name, args);

    case 'process':
      return modules.process.handleTool(action, args);

    case 'resource':
      return modules.resource.handleTool(name, args);

    case 'testing':
      return modules.testing.handleTool(name, args);

    case 'documents':
      return modules.documents.handleTool(name, args);

    case 'agents':
      return modules.agents.handleTool(action, args);

    default:
      throw new Error(`Unknown module: ${moduleName}`);
  }
}

// ═══════════════════════════════════════════════════════════════
//                      SESSION HANDLERS
// ═══════════════════════════════════════════════════════════════

async function handleSessionTool(
  action: string,
  args: Record<string, unknown>,
  modules: CCGModules,
  stateManager: StateManager,
  logger: Logger
): Promise<unknown> {
  switch (action) {
    case 'init':
      return initializeSession(modules, stateManager, logger);

    case 'end':
      return endSession(modules, stateManager, args.reason as string | undefined, logger);

    case 'status':
      return getFullStatus(modules, stateManager);

    default:
      throw new Error(`Unknown session action: ${action}`);
  }
}

async function initializeSession(
  modules: CCGModules,
  stateManager: StateManager,
  logger: Logger
): Promise<SessionInitResult> {
  logger.info('Initializing session...');

  // Load memory and pending tasks
  const memoryCount = await modules.memory.loadPersistent();
  const pendingTasksList = await modules.workflow.loadPendingTasks();
  const pendingTasks = pendingTasksList?.length || 0;

  // Create session
  const session = stateManager.createSession();

  const result: SessionInitResult = {
    sessionId: session.id,
    status: 'ready',
    memory: {
      loaded: memoryCount,
    },
    message: formatWelcomeMessage(memoryCount, pendingTasks),
  };

  logger.info(`Session ${session.id} initialized`);
  return result;
}

async function endSession(
  modules: CCGModules,
  stateManager: StateManager,
  reason: string | undefined,
  logger: Logger
): Promise<unknown> {
  logger.info('Ending session...');

  // Save memory and workflow
  await modules.memory.savePersistent();
  await modules.workflow.saveTasks();

  // Get current session
  const session = stateManager.getSession();
  if (!session) {
    return {
      success: false,
      message: 'No active session to end',
    };
  }

  // End session
  stateManager.endSession();

  const duration = Date.now() - session.startedAt.getTime();

  return {
    success: true,
    sessionId: session.id,
    duration: `${Math.round(duration / 1000)}s`,
    reason: reason || 'normal',
    message: 'Session ended. All data saved. See you next time!',
  };
}

async function getFullStatus(
  modules: CCGModules,
  stateManager: StateManager
): Promise<unknown> {
  const session = stateManager.getSession();
  const memoryStatus = modules.memory.getStatus();
  const guardStatus = modules.guard.getStatus();
  const workflowStatus = modules.workflow.getStatus();

  return {
    session: session
      ? {
          id: session.id,
          status: session.status,
          startedAt: session.startedAt.toISOString(),
          duration: `${Math.round((Date.now() - session.startedAt.getTime()) / 1000)}s`,
        }
      : { status: 'not_started' },
    modules: {
      memory: memoryStatus,
      guard: guardStatus,
      workflow: workflowStatus,
    },
  };
}

// ═══════════════════════════════════════════════════════════════
//                      HELPERS
// ═══════════════════════════════════════════════════════════════

function formatWelcomeMessage(memoryCount: number, pendingTasks: number = 0): string {
  const lines = [
    'Claude Code Guardian Ready',
    '',
    `Memory: ${memoryCount} items loaded`,
    `Tasks: ${pendingTasks} pending`,
  ];

  if (memoryCount === 0 && pendingTasks === 0) {
    lines.push('', 'Tip: Use memory_store to save decisions, workflow_task_create to track tasks');
  } else if (pendingTasks > 0) {
    lines.push('', 'Use workflow_task_list to see pending tasks');
  }

  return lines.join('\n');
}
