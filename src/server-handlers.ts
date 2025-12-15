// src/server-handlers.ts

/**
 * Server Tool Handlers
 *
 * Extracted from server.ts for better modularity.
 */

import { Logger } from './core/logger.js';
import { StateManager } from './core/state-manager.js';
import { MemoryModule } from './modules/memory/index.js';
import { GuardModule } from './modules/guard/index.js';
import { WorkflowModule } from './modules/workflow/index.js';
import { ProcessModule } from './modules/process/index.js';
import { ResourceModule } from './modules/resource/index.js';
import { TestingModule } from './modules/testing/index.js';
import { DocumentsModule } from './modules/documents/index.js';
import { AgentsModule } from './modules/agents/index.js';
import { LatentModule } from './modules/latent/index.js';
import { ThinkingModule } from './modules/thinking/index.js';
import { AutoAgentModule } from './modules/auto-agent/index.js';
import { RAGModule } from './modules/rag/index.js';
import { CodeOptimizerService, createCodeOptimizerToolHandlers } from './modules/code-optimizer/index.js';
import { SessionModule, getSessionToolDefinitions } from './modules/session/index.js';

// ═══════════════════════════════════════════════════════════════
//                      TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export interface CCGModules {
  memory: MemoryModule;
  guard: GuardModule;
  workflow: WorkflowModule;
  process: ProcessModule;
  resource: ResourceModule;
  testing: TestingModule;
  documents: DocumentsModule;
  agents: AgentsModule;
  latent: LatentModule;
  thinking: ThinkingModule;
  autoAgent: AutoAgentModule;
  rag: RAGModule;
  codeOptimizer: CodeOptimizerService;
  session: SessionModule;
}

interface SessionInitResult {
  sessionId: string;
  status: 'ready' | 'error';
  memory: {
    loaded: number;
    recentDecisions?: Array<{ content: string; type: string; importance: number }>;
  };
  workflow?: {
    pendingTasks: number;
    activeTask: {
      id: string;
      name: string;
      status: string;
      progress?: number;
    } | null;
  };
  contextReminder?: string;
  message: string;

  // P1: Session Context Restore
  resumeState?: {
    available: boolean;
    summary?: string;
    currentTaskName?: string | null;
    nextActions?: string[];
    activeLatentPhase?: string | null;
    recentFailures?: number;
  };
}

// Code Optimizer tool handlers cache
let codeOptimizerHandlers: ReturnType<typeof createCodeOptimizerToolHandlers> | null = null;

export function setCodeOptimizerHandlers(handlers: ReturnType<typeof createCodeOptimizerToolHandlers>): void {
  codeOptimizerHandlers = handlers;
}

// ═══════════════════════════════════════════════════════════════
//                      SESSION TOOLS
// ═══════════════════════════════════════════════════════════════

export function getSessionTools() {
  // Core session tools (init/end/status handled by server-handlers)
  const coreTools = [
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
  ];

  // Add SessionModule tools (timeline, export, resume, etc.)
  return [...coreTools, ...getSessionToolDefinitions()];
}

// ═══════════════════════════════════════════════════════════════
//                      TOOL ROUTING
// ═══════════════════════════════════════════════════════════════

export async function routeToolCall(
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

    case 'latent':
      return modules.latent.handleTool(name, args);

    case 'thinking':
      return modules.thinking.handleTool(name, args);

    case 'auto':
      return modules.autoAgent.handleTool(name, args);

    case 'rag':
      return handleRAGTool(action, args, modules.rag);

    case 'code':
      return handleCodeOptimizerTool(name, args);

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
  // Core session tools handled here
  switch (action) {
    case 'init':
      return initializeSession(modules, stateManager, logger);

    case 'end':
      return endSession(modules, stateManager, args.reason as string | undefined, logger);

    // Route new session tools to SessionModule
    case 'status':
    case 'timeline':
    case 'export':
    case 'resume':
    case 'replay':
    case 'save':
    case 'offer':
      return modules.session.handleTool(`session_${action}`, args);

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

  // NEW: Get context for resume
  const recentDecisionsResult = await modules.memory.handleTool('recall', {
    query: 'decision',
    type: 'decision',
    limit: 3,
  });
  const recentDecisions = (recentDecisionsResult as { memories?: Array<{ content: string; type: string; importance: number }> })?.memories?.slice(0, 3) || [];

  // Get active task from workflow
  const activeTaskResult = await modules.workflow.handleTool('workflow_current', {});
  const activeTask = (activeTaskResult as { task?: { id: string; name: string; status: string; progress?: number } })?.task || null;

  // P1: Get resume state from latest checkpoint
  let resumeStateInfo: SessionInitResult['resumeState'];
  try {
    const resumeState = await modules.resource.getLatestResumeState();
    if (resumeState) {
      resumeStateInfo = {
        available: true,
        summary: resumeState.summary,
        currentTaskName: resumeState.currentTaskName,
        nextActions: resumeState.nextActions,
        activeLatentPhase: resumeState.activeLatentPhase,
        recentFailures: resumeState.recentFailures.length,
      };
      logger.info(`Found resume state: ${resumeState.summary}`);
    } else {
      resumeStateInfo = { available: false };
    }
  } catch (error) {
    logger.warn(`Failed to get resume state: ${error}`);
    resumeStateInfo = { available: false };
  }

  // Create session
  const session = stateManager.createSession();

  // Generate context reminder (include resume state)
  const contextReminder = generateContextReminder(activeTask, pendingTasks, recentDecisions, resumeStateInfo);

  const result: SessionInitResult = {
    sessionId: session.id,
    status: 'ready',
    memory: {
      loaded: memoryCount,
      recentDecisions: recentDecisions.length > 0 ? recentDecisions : undefined,
    },
    workflow: {
      pendingTasks,
      activeTask,
    },
    contextReminder,
    message: formatWelcomeMessage(memoryCount, pendingTasks),
    resumeState: resumeStateInfo,
  };

  logger.info(`Session ${session.id} initialized with context reminder`);
  return result;
}

function generateContextReminder(
  activeTask: { id: string; name: string; status: string; progress?: number } | null,
  pendingTasks: number,
  recentDecisions: Array<{ content: string; type: string; importance: number }>,
  resumeState?: SessionInitResult['resumeState']
): string {
  const lines = [
    '📌 CCG MCP Tools Available:',
    '  • memory_store/recall - Persistent knowledge',
    '  • workflow_task_* - Task tracking',
    '  • guard_validate - Code quality check',
    '  • testing_* - Run tests & browser testing',
    '  • latent_* - Latent Chain Mode for complex tasks',
    '  • auto_* - Auto-agent for decomposition & error fixing',
  ];

  // P1: Show resume state if available
  if (resumeState?.available && resumeState.summary) {
    lines.push('');
    lines.push('🔄 RESUME FROM CHECKPOINT:');
    lines.push(`   ${resumeState.summary}`);
    if (resumeState.nextActions && resumeState.nextActions.length > 0) {
      lines.push('   Suggested next:');
      resumeState.nextActions.slice(0, 3).forEach(action => {
        lines.push(`     → ${action}`);
      });
    }
    if (resumeState.activeLatentPhase) {
      lines.push(`   Active latent phase: ${resumeState.activeLatentPhase}`);
    }
    if (resumeState.recentFailures && resumeState.recentFailures > 0) {
      lines.push(`   ⚠️ ${resumeState.recentFailures} recent failures logged`);
    }
  }

  if (activeTask) {
    lines.push('');
    lines.push(`🎯 Active Task: ${activeTask.name}`);
    lines.push(`   Status: ${activeTask.status}${activeTask.progress ? ` (${activeTask.progress}%)` : ''}`);
  }

  if (pendingTasks > 0) {
    lines.push('');
    lines.push(`⏳ Pending Tasks: ${pendingTasks}`);
  }

  if (recentDecisions.length > 0) {
    lines.push('');
    lines.push('📝 Recent Decisions:');
    recentDecisions.forEach((d, i) => {
      const shortContent = d.content.length > 60 ? d.content.substring(0, 60) + '...' : d.content;
      lines.push(`   ${i + 1}. ${shortContent}`);
    });
  }

  lines.push('');
  lines.push('⚠️ IMPORTANT: Always use CCG tools, do not work without them.');

  return lines.join('\n');
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

export async function getFullStatus(
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
    'Claude Code Guardian v3.0 Ready',
    '',
    `Memory: ${memoryCount} items loaded`,
    `Tasks: ${pendingTasks} pending`,
  ];

  if (memoryCount === 0 && pendingTasks === 0) {
    lines.push('', 'Tip: Use memory_store to save decisions, workflow_task_create to track tasks');
    lines.push('NEW: Use rag_build_index to enable semantic code search');
  } else if (pendingTasks > 0) {
    lines.push('', 'Use workflow_task_list to see pending tasks');
  }

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════
//                      RAG TOOL HANDLER
// ═══════════════════════════════════════════════════════════════

async function handleRAGTool(
  action: string,
  args: Record<string, unknown>,
  ragModule: RAGModule
): Promise<unknown> {
  const tools = ragModule.getTools();

  const toolName = `rag_${action}`;
  if (toolName in tools) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (tools as any)[toolName].handler(args);
  }

  throw new Error(`Unknown RAG action: ${action}`);
}

// ═══════════════════════════════════════════════════════════════
//                      CODE OPTIMIZER HANDLER
// ═══════════════════════════════════════════════════════════════

async function handleCodeOptimizerTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  if (!codeOptimizerHandlers) {
    throw new Error('Code Optimizer not initialized');
  }

  // Map tool name to handler
  if (toolName in codeOptimizerHandlers) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (codeOptimizerHandlers as any)[toolName](args);
  }

  throw new Error(`Unknown Code Optimizer tool: ${toolName}`);
}
