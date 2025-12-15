// src/core/module-factory.ts
// Centralized module configuration and initialization to avoid duplication

import { EventBus } from './event-bus.js';
import { Logger } from './logger.js';
import { ConfigManager } from './config-manager.js';
import type { CCGConfig } from './types.js';

import { MemoryModule } from '../modules/memory/index.js';
import { GuardModule } from '../modules/guard/index.js';
import { WorkflowModule } from '../modules/workflow/index.js';
import { ProcessModule } from '../modules/process/index.js';
import { ResourceModule } from '../modules/resource/index.js';
import { TestingModule } from '../modules/testing/index.js';
import { DocumentsModule } from '../modules/documents/index.js';
import { AgentsModule } from '../modules/agents/index.js';
import { LatentModule, DEFAULT_LATENT_CONFIG } from '../modules/latent/index.js';
import {
  ThinkingModule,
  DEFAULT_THINKING_CONFIG,
} from '../modules/thinking/index.js';
import {
  AutoAgentModule,
  DEFAULT_AUTO_AGENT_CONFIG,
} from '../modules/auto-agent/index.js';
import { RAGModule, DEFAULT_RAG_CONFIG } from '../modules/rag/index.js';
import {
  CodeOptimizerService,
  DEFAULT_CODE_OPTIMIZER_CONFIG,
} from '../modules/code-optimizer/index.js';
import {
  SessionModule,
  DEFAULT_SESSION_CONFIG,
} from '../modules/session/index.js';

// ═══════════════════════════════════════════════════════════════
//                      DEFAULT CONFIGS
// ═══════════════════════════════════════════════════════════════

/**
 * Default agents configuration
 */
export function getDefaultAgentsConfig() {
  return {
    enabled: true,
    agentsFilePath: 'AGENTS.md',
    agentsDir: '.claude/agents',
    autoReload: true,
    enableCoordination: true,
  };
}

// ═══════════════════════════════════════════════════════════════
//                      CONFIG RESOLVERS
// ═══════════════════════════════════════════════════════════════

/**
 * Resolve agents config with defaults
 */
export function resolveAgentsConfig(config: CCGConfig) {
  return config.modules.agents || getDefaultAgentsConfig();
}

/**
 * Resolve memory config with path resolution
 */
export function resolveMemoryConfig(config: CCGConfig, configManager: ConfigManager) {
  return {
    ...config.modules.memory,
    persistPath: configManager.resolvePath(config.modules.memory.persistPath),
  };
}

/**
 * Resolve latent config with defaults
 */
export function resolveLatentConfig(config: CCGConfig) {
  return config.modules.latent || DEFAULT_LATENT_CONFIG;
}

/**
 * Resolve thinking config with defaults
 */
export function resolveThinkingConfig(config: CCGConfig) {
  return (config.modules as any).thinking || DEFAULT_THINKING_CONFIG;
}

/**
 * Resolve auto-agent config with defaults
 */
export function resolveAutoAgentConfig(config: CCGConfig) {
  return (config.modules as any).autoAgent || DEFAULT_AUTO_AGENT_CONFIG;
}

/**
 * Resolve RAG config with defaults
 */
export function resolveRAGConfig(config: CCGConfig) {
  return (config.modules as any).rag || DEFAULT_RAG_CONFIG;
}

/**
 * Resolve code optimizer config with defaults
 */
export function resolveCodeOptimizerConfig(config: CCGConfig) {
  return (config.modules as any).codeOptimizer || DEFAULT_CODE_OPTIMIZER_CONFIG;
}

/**
 * Resolve session config with defaults
 */
export function resolveSessionConfig(config: CCGConfig) {
  return (config.modules as any).session || DEFAULT_SESSION_CONFIG;
}

// ═══════════════════════════════════════════════════════════════
//                      MODULE FACTORY
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

/**
 * Create all CCG modules with resolved configs
 */
export function createModules(
  config: CCGConfig,
  configManager: ConfigManager,
  eventBus: EventBus,
  logger: Logger,
  projectRoot: string
): CCGModules {
  const memoryConfig = resolveMemoryConfig(config, configManager);
  const agentsConfig = resolveAgentsConfig(config);
  const latentConfig = resolveLatentConfig(config);
  const thinkingConfig = resolveThinkingConfig(config);
  const autoAgentConfig = resolveAutoAgentConfig(config);
  const ragConfig = resolveRAGConfig(config);
  const codeOptimizerConfig = resolveCodeOptimizerConfig(config);
  const sessionConfig = (config.modules as any).session || DEFAULT_SESSION_CONFIG;

  logger.debug('Creating modules with resolved configs');

  return {
    memory: new MemoryModule(memoryConfig, eventBus, logger),
    guard: new GuardModule(config.modules.guard, eventBus, logger),
    workflow: new WorkflowModule(config.modules.workflow, eventBus, logger, projectRoot),
    process: new ProcessModule(config.modules.process, eventBus, logger),
    resource: new ResourceModule(config.modules.resource, eventBus, logger, projectRoot),
    testing: new TestingModule(config.modules.testing, eventBus, logger, projectRoot),
    documents: new DocumentsModule(config.modules.documents, eventBus, logger, projectRoot),
    agents: new AgentsModule(agentsConfig, eventBus, logger, projectRoot),
    latent: new LatentModule(latentConfig, eventBus, logger, projectRoot),
    thinking: new ThinkingModule(thinkingConfig, eventBus, logger, projectRoot),
    autoAgent: new AutoAgentModule(autoAgentConfig, eventBus, logger),
    rag: new RAGModule(eventBus, ragConfig),
    codeOptimizer: new CodeOptimizerService(
      codeOptimizerConfig,
      eventBus,
      logger,
      projectRoot
    ),
    session: new SessionModule(sessionConfig, eventBus, logger, projectRoot),
  };
}

/**
 * Initialize all enabled modules
 */
export async function initializeModules(
  modules: CCGModules,
  config: CCGConfig,
  logger: Logger
): Promise<void> {
  const initPromises: Promise<void>[] = [];

  // Core modules
  if (config.modules.memory.enabled) initPromises.push(modules.memory.initialize());
  if (config.modules.guard.enabled) initPromises.push(modules.guard.initialize());
  if (config.modules.workflow.enabled) initPromises.push(modules.workflow.initialize());
  if (config.modules.process.enabled) initPromises.push(modules.process.initialize());
  if (config.modules.resource.enabled) initPromises.push(modules.resource.initialize());
  if (config.modules.testing.enabled) initPromises.push(modules.testing.initialize());
  if (config.modules.documents.enabled) initPromises.push(modules.documents.initialize());

  // Extended modules
  const agentsConfig = resolveAgentsConfig(config);
  if (agentsConfig.enabled) initPromises.push(modules.agents.initialize());

  const latentConfig = resolveLatentConfig(config);
  if (latentConfig.enabled) initPromises.push(modules.latent.initialize());

  const thinkingConfig = resolveThinkingConfig(config);
  if (thinkingConfig.enabled) initPromises.push(modules.thinking.initialize());

  const autoAgentConfig = resolveAutoAgentConfig(config);
  if (autoAgentConfig.enabled) initPromises.push(modules.autoAgent.initialize());

  const codeOptimizerConfig = resolveCodeOptimizerConfig(config);
  if (codeOptimizerConfig.enabled !== false) {
    initPromises.push(modules.codeOptimizer.initialize());
  }

  const sessionConfig = resolveSessionConfig(config);
  if (sessionConfig.enabled !== false) {
    initPromises.push(modules.session.initialize());
  }

  await Promise.all(initPromises);
  logger.info('All enabled modules initialized');
}
