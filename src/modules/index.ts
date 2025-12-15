// src/modules/index.ts

/**
 * CCG Modules Index
 *
 * This file exports all feature modules for the Claude Code Guardian.
 * Modules are initialized by the MCP server and provide tools for Claude.
 */

// ═══════════════════════════════════════════════════════════════
//                      MODULE EXPORTS
// ═══════════════════════════════════════════════════════════════

// Memory Module - Persistent memory for facts, decisions, patterns
export { MemoryModule, MemoryService } from './memory/index.js';
export type {
  Memory,
  MemoryType,
  MemoryModuleConfig,
  StoreMemoryParams,
  RecallMemoryParams,
  MemorySummary,
  MemoryModuleStatus,
} from './memory/index.js';

// Guard Module - Code validation and honesty checking
export { GuardModule, GuardService } from './guard/index.js';
export type {
  ValidationResult,
  ValidationIssue,
  GuardModuleConfig,
  IGuardRule,
  RuleCategory,
  GuardModuleStatus,
} from './guard/index.js';

// Process Module - Port and process management
export { ProcessModule, ProcessService } from './process/index.js';
export type {
  ProcessInfo,
  ProcessStatus,
  PortStatus,
  ProcessModuleConfig,
  SpawnParams,
  SpawnResult,
  KillResult,
  ProcessModuleStatus,
  CleanupResult,
} from './process/index.js';

// Resource Module - Token and checkpoint management
export { ResourceModule, ResourceService, ResumeStateProvider } from './resource/index.js';
export type {
  ResourceStatus,
  CheckpointInfo,
  ResourceWarning,
  TaskEstimate,
  CheckpointData,
  CheckpointReason,
  TokenUsage,
  GovernorState,
  GovernorMode,
  ResumeState,
} from './resource/index.js';

// Workflow Module - Task and progress tracking
export { WorkflowModule, WorkflowService } from './workflow/index.js';
export type {
  Task,
  TaskStatus,
  TaskPriority,
  TaskNote,
  TaskCreateParams,
  TaskUpdateParams,
  TaskFilter,
  WorkflowStatus,
  TaskSummary,
} from './workflow/index.js';

// Testing Module - Test runner and browser automation
export { TestingModule, TestingService, BrowserService } from './testing/index.js';
export type {
  TestResults,
  TestResult,
  CoverageReport,
  BrowserSession,
  ConsoleLog,
  NetworkRequest,
  Screenshot,
  BrowserError,
  TestRunOptions,
  TestCleanupResult,
  TestingModuleStatus,
} from './testing/index.js';

// Documents Module - Document registry and management
export { DocumentsModule, DocumentsService } from './documents/index.js';
export type {
  Document,
  DocumentType,
  DocumentRegistry,
  DocumentSearchResult,
  DocumentUpdateCheck,
  DocumentCreateParams,
  DocumentsModuleStatus,
} from './documents/index.js';

// Agents Module - Multi-agent architecture
export { AgentsModule, AgentsService } from './agents/index.js';
export type {
  Agent,
  AgentSelection,
  AgentsModuleConfig,
  AgentsModuleStatus,
  DelegationRule,
  RegisterAgentParams,
  SelectAgentParams,
  CoordinateAgentsParams,
  CoordinationResult,
} from './agents/index.js';

// Latent Module - Latent Chain Mode for hidden-state reasoning
export { LatentModule, LatentService, DEFAULT_LATENT_CONFIG } from './latent/index.js';
export type {
  AgentLatentContext,
  LatentPhase,
  LatentDecision,
  CodeMap,
  TaskArtifacts,
  ContextDelta,
  LatentResponse,
  LatentAction,
  LatentActionType,
  LatentModuleConfig,
  LatentModuleStatus,
  CreateContextParams,
  UpdateContextParams,
  ApplyPatchParams,
  GetContextParams,
  TransitionPhaseParams,
  ContextHistoryEntry,
  LatentContextWithHistory,
  LatentValidationResult,
} from './latent/index.js';

// AutoAgent Module - Autonomous agent capabilities
export { AutoAgentModule, AutoAgentService, DEFAULT_AUTO_AGENT_CONFIG } from './auto-agent/index.js';
export type {
  AutoAgentModuleConfig,
  AutoAgentStatus,
  DecomposeParams,
  DecomposeResult,
  TaskComplexityAnalysis,
  SubtaskDefinition,
  RouteToolParams,
  ToolRouteResult,
  SuggestedTool,
  StartFixLoopParams,
  FixLoopResult,
  FixLoopStatus,
  ErrorInfo,
  FixAction,
  StoreErrorParams,
  RecallErrorsParams,
  RecallErrorsResult,
  ErrorMemoryEntry,
} from './auto-agent/index.js';

// AST Module - Code parsing as MCP tools (MCP-first)
export { ASTModule, ASTService, createASTModule } from './ast/index.js';
export type {
  ASTSymbol,
  ASTParseResult,
  ASTDependency,
  ASTDependencyGraph,
  ASTModuleConfig,
  ASTModuleStatus,
} from './ast/index.js';

// ═══════════════════════════════════════════════════════════════
//                      MODULE INTERFACE
// ═══════════════════════════════════════════════════════════════

/**
 * Base interface for all CCG modules
 */
export interface ICCGModule {
  /**
   * Initialize the module
   */
  initialize(): Promise<void>;

  /**
   * Shutdown the module
   */
  shutdown(): Promise<void>;

  /**
   * Get MCP tool definitions
   */
  getTools(): Array<{
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
  }>;

  /**
   * Handle MCP tool call
   */
  handleTool(toolName: string, args: Record<string, unknown>): Promise<unknown>;

  /**
   * Get module status
   */
  getStatus(): Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════
//                      MODULE INITIALIZATION
// ═══════════════════════════════════════════════════════════════

import { ConfigManager } from '../core/config-manager.js';
import { EventBus } from '../core/event-bus.js';
import { Logger } from '../core/logger.js';
import { join } from 'path';
import {
  MemoryModuleConfig,
  GuardModuleConfig,
  ProcessModuleConfig,
  ResourceModuleConfig,
  WorkflowModuleConfig,
  TestingModuleConfig,
  DocumentsModuleConfig,
  AgentsModuleConfig,
  LatentModuleConfig,
  AutoAgentModuleConfig,
} from '../core/types.js';

// Import module classes for use in initializeModules
import { MemoryModule } from './memory/index.js';
import { GuardModule } from './guard/index.js';
import { ProcessModule } from './process/index.js';
import { ResourceModule } from './resource/index.js';
import { WorkflowModule } from './workflow/index.js';
import { TestingModule } from './testing/index.js';
import { DocumentsModule } from './documents/index.js';
import { AgentsModule } from './agents/index.js';
import { LatentModule, DEFAULT_LATENT_CONFIG } from './latent/index.js';
import { AutoAgentModule, DEFAULT_AUTO_AGENT_CONFIG } from './auto-agent/index.js';
import { ASTModule, createASTModule } from './ast/index.js';

/**
 * Initialized modules interface for HookRouter
 */
export interface InitializedModules {
  memory: MemoryModule;
  guard: GuardModule;
  process: ProcessModule;
  resource: ResourceModule;
  workflow: WorkflowModule;
  testing: TestingModule;
  documents: DocumentsModule;
  agents: AgentsModule;
  latent: LatentModule;
  autoAgent: AutoAgentModule;
  ast: ASTModule;
}

/**
 * Default module configurations
 */
function getDefaultConfigs(ccgDir: string): {
  memory: MemoryModuleConfig;
  guard: GuardModuleConfig;
  process: ProcessModuleConfig;
  resource: ResourceModuleConfig;
  workflow: WorkflowModuleConfig;
  testing: TestingModuleConfig;
  documents: DocumentsModuleConfig;
  agents: AgentsModuleConfig;
  latent: LatentModuleConfig;
  autoAgent: AutoAgentModuleConfig;
} {
  return {
    memory: {
      enabled: true,
      maxItems: 1000,
      autoSave: true,
      persistPath: join(ccgDir, 'memory.db'),
      compressionEnabled: true,
    },
    guard: {
      enabled: true,
      strictMode: false,
      rules: {
        blockFakeTests: true,
        blockDisabledFeatures: true,
        blockEmptyCatch: true,
        blockEmojiInCode: true,
        blockSwallowedExceptions: true,
      },
    },
    process: {
      enabled: true,
      ports: { dev: 3000, preview: 5173 },
      autoKillOnConflict: false,
      trackSpawnedProcesses: true,
    },
    resource: {
      enabled: true,
      checkpoints: {
        auto: true,
        thresholds: [70, 85, 95],
        maxCheckpoints: 10,
        compressOld: true,
      },
      warningThreshold: 70,
      pauseThreshold: 95,
    },
    workflow: {
      enabled: true,
      autoTrackTasks: true,
      requireTaskForLargeChanges: true,
      largeChangeThreshold: 100,
    },
    testing: {
      enabled: true,
      autoRun: false,
      testCommand: 'npm test',
      browser: {
        enabled: false,
        headless: true,
        captureConsole: true,
        captureNetwork: false,
        screenshotOnError: true,
      },
      cleanup: {
        autoCleanTestData: true,
        testDataPrefix: 'test_',
        testDataLocations: ['./test-data', './__tests__/fixtures'],
      },
    },
    documents: {
      enabled: true,
      locations: { docs: 'docs', readme: '.', api: 'docs/api' },
      updateInsteadOfCreate: true,
      namingConvention: 'kebab-case',
    },
    agents: {
      enabled: true,
      agentsFilePath: 'AGENTS.md',
      agentsDir: '.claude/agents',
      autoReload: true,
      enableCoordination: true,
    },
    latent: {
      enabled: true,
      maxContexts: 50,
      autoMerge: true,
      persist: true,
      persistPath: join(ccgDir, 'latent-contexts.json'),
      strictValidation: false,
      maxSummaryLength: 200,
      maxDecisions: 100,
      cleanupAfterMs: 24 * 60 * 60 * 1000, // 24 hours
    },
    autoAgent: {
      enabled: true,
      decomposer: {
        maxSubtasks: 10,
        autoDecompose: true,
        minComplexityForDecompose: 4,
      },
      router: {
        enabled: true,
        routingRules: [],
        fallbackAgent: undefined,
      },
      fixLoop: {
        enabled: true,
        maxRetries: 3,
        retryDelayMs: 1000,
        autoRollbackOnFail: true,
      },
      errorMemory: {
        enabled: true,
        maxErrors: 100,
        deduplicateThreshold: 0.8,
        autoRecall: true,
      },
    },
  };
}

/**
 * Initialize all CCG modules
 *
 * @param configManager - ConfigManager instance
 * @param eventBus - EventBus instance
 * @param logger - Logger instance
 * @param projectRoot - Root directory of the project
 * @returns Initialized modules object
 */
export async function initializeModules(
  configManager: ConfigManager,
  eventBus: EventBus,
  logger: Logger,
  projectRoot: string
): Promise<InitializedModules> {
  const ccgDir = join(projectRoot, '.ccg');
  const defaults = getDefaultConfigs(ccgDir);

  // Get module configs from ConfigManager, fall back to defaults
  const memoryConfig = (await configManager.get('modules.memory') as MemoryModuleConfig | null) || defaults.memory;
  const guardConfig = (await configManager.get('modules.guard') as GuardModuleConfig | null) || defaults.guard;
  const processConfig = (await configManager.get('modules.process') as ProcessModuleConfig | null) || defaults.process;
  const resourceConfig = (await configManager.get('modules.resource') as ResourceModuleConfig | null) || defaults.resource;
  const workflowConfig = (await configManager.get('modules.workflow') as WorkflowModuleConfig | null) || defaults.workflow;
  const testingConfig = (await configManager.get('modules.testing') as TestingModuleConfig | null) || defaults.testing;
  const documentsConfig = (await configManager.get('modules.documents') as DocumentsModuleConfig | null) || defaults.documents;
  const agentsConfig = (await configManager.get('modules.agents') as AgentsModuleConfig | null) || defaults.agents;
  const latentConfig = (await configManager.get('modules.latent') as LatentModuleConfig | null) || defaults.latent;

  // Initialize Memory Module
  const memoryModule = new MemoryModule(memoryConfig, eventBus, logger);
  await memoryModule.initialize();

  // Initialize Guard Module
  const guardModule = new GuardModule(guardConfig, eventBus, logger);
  await guardModule.initialize();

  // Initialize Process Module
  const processModule = new ProcessModule(processConfig, eventBus, logger);
  await processModule.initialize();

  // Initialize Resource Module
  const resourceModule = new ResourceModule(resourceConfig, eventBus, logger, projectRoot);
  await resourceModule.initialize();

  // Initialize Workflow Module
  const workflowModule = new WorkflowModule(workflowConfig, eventBus, logger, projectRoot);
  await workflowModule.initialize();

  // Initialize Testing Module
  const testingModule = new TestingModule(testingConfig, eventBus, logger, projectRoot);
  await testingModule.initialize();

  // Initialize Documents Module
  const documentsModule = new DocumentsModule(documentsConfig, eventBus, logger, projectRoot);
  await documentsModule.initialize();

  // Initialize Agents Module
  const agentsModule = new AgentsModule(agentsConfig, eventBus, logger, projectRoot);
  await agentsModule.initialize();

  // Initialize Latent Module (Latent Chain Mode)
  const latentModule = new LatentModule(latentConfig, eventBus, logger, projectRoot);
  await latentModule.initialize();

  // Initialize AutoAgent Module
  const autoAgentConfig = (await configManager.get('modules.autoAgent') as AutoAgentModuleConfig | null) || defaults.autoAgent;
  const autoAgentModule = new AutoAgentModule(autoAgentConfig, eventBus, logger);
  await autoAgentModule.initialize();

  // Wire up Token Budget Governor: AutoAgent checks Resource for token limits
  autoAgentModule.setGovernorStateProvider(() => resourceModule.getGovernorState());
  logger.debug('Token Budget Governor wired: AutoAgent → Resource');

  // P1: Wire up ResumeStateProvider: Resource gets context from Workflow and Latent
  resourceModule.setResumeStateProvider({
    async getCurrentTask() {
      const result = await workflowModule.handleTool('workflow_current', {});
      const task = (result as { task?: { id: string; name: string; status: string } })?.task;
      return task || null;
    },
    async getActiveLatentContext() {
      const contexts = await latentModule.handleTool('latent_list_contexts', {});
      const contextList = contexts as Array<{ taskId: string; phase: string }>;
      // Return the first active (non-completed) context
      if (contextList && contextList.length > 0) {
        return { taskId: contextList[0].taskId, phase: contextList[0].phase };
      }
      return null;
    },
    async getRecentFailures() {
      // Get recent failures from error memory
      const result = await autoAgentModule.handleTool('auto_recall_errors', {
        limit: 5,
        minSimilarity: 0
      });
      const errors = (result as { errors?: Array<{ errorType: string; errorMessage: string; storedAt: Date }> })?.errors || [];
      return errors.map(e => ({
        type: e.errorType,
        message: e.errorMessage,
        timestamp: e.storedAt
      }));
    }
  });
  logger.debug('ResumeStateProvider wired: Resource → Workflow, Latent, AutoAgent');

  // Initialize AST Module (MCP-first code parsing)
  const astModule = createASTModule(eventBus);

  logger.info('All CCG modules initialized (including AST)');

  return {
    memory: memoryModule,
    guard: guardModule,
    process: processModule,
    resource: resourceModule,
    workflow: workflowModule,
    testing: testingModule,
    documents: documentsModule,
    agents: agentsModule,
    latent: latentModule,
    autoAgent: autoAgentModule,
    ast: astModule,
  };
}

/**
 * Shutdown all modules gracefully
 */
export async function shutdownModules(modules: InitializedModules): Promise<void> {
  await modules.memory.shutdown();
  await modules.guard.shutdown();
  await modules.process.shutdown();
  await modules.resource.shutdown();
  await modules.workflow.shutdown();
  await modules.testing.shutdown();
  await modules.documents.shutdown();
  await modules.agents.shutdown();
  await modules.latent.shutdown();
  await modules.autoAgent.shutdown();
}
