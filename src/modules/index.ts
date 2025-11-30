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
export { ResourceModule, ResourceService } from './resource/index.js';
export type {
  ResourceStatus,
  CheckpointInfo,
  ResourceWarning,
  TaskEstimate,
  CheckpointData,
  CheckpointReason,
  TokenUsage,
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

  logger.info('All CCG modules initialized');

  return {
    memory: memoryModule,
    guard: guardModule,
    process: processModule,
    resource: resourceModule,
    workflow: workflowModule,
    testing: testingModule,
    documents: documentsModule,
    agents: agentsModule,
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
}
