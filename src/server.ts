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

import { getCodeOptimizerTools, createCodeOptimizerToolHandlers } from './modules/code-optimizer/index.js';
import { DEFAULT_LATENT_CONFIG } from './modules/latent/index.js';
import { DEFAULT_THINKING_CONFIG } from './modules/thinking/index.js';
import { DEFAULT_AUTO_AGENT_CONFIG } from './modules/auto-agent/index.js';
import { DEFAULT_RAG_CONFIG } from './modules/rag/index.js';
import { DEFAULT_CODE_OPTIMIZER_CONFIG } from './modules/code-optimizer/index.js';

import {
  getSessionTools,
  routeToolCall,
  getFullStatus,
  setCodeOptimizerHandlers,
} from './server-handlers.js';
import {
  createModules,
  initializeModules,
  type CCGModules,
} from './core/module-factory.js';

// ═══════════════════════════════════════════════════════════════
//                      SERVER OPTIONS
// ═══════════════════════════════════════════════════════════════

export interface CCGServerOptions {
  /** Resume from previous session */
  resume?: boolean;
  /** Specific session file to resume from */
  sessionFile?: string;
  /** Project root override */
  projectRoot?: string;
}

// ═══════════════════════════════════════════════════════════════
//                      SERVER FACTORY
// ═══════════════════════════════════════════════════════════════

export async function createCCGServer(options: CCGServerOptions = {}): Promise<Server> {
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

  // Create and initialize modules using ModuleFactory
  const modules = createModules(config, configManager, eventBus, logger, projectRoot);

  // Initialize code optimizer handlers
  const handlers = createCodeOptimizerToolHandlers(modules.codeOptimizer);
  setCodeOptimizerHandlers(handlers);

  // Initialize all enabled modules
  await initializeModules(modules, config, logger);

  // Handle session resume if requested
  if (options.resume) {
    try {
      const sessionService = modules.session.getService();
      let sessionFile = options.sessionFile;

      // If no specific file, find the latest session
      if (!sessionFile) {
        sessionFile = sessionService.findLatestSession() ?? undefined;
      }

      if (sessionFile) {
        logger.info(`Resuming from session: ${sessionFile}`);
        const resumed = await sessionService.loadFromFile(sessionFile);
        logger.info(`Session resumed: ${resumed.sessionId} (resume count: ${resumed.metadata?.resumeCount})`);

        // Record resume event
        sessionService.recordEvent({
          ts: new Date().toISOString(),
          type: 'session:resumed',
          summary: `Resumed from ${sessionFile}`,
          data: {
            previousSessionId: resumed.sessionId,
            timelineCount: resumed.timeline.length,
          },
        });
      } else {
        logger.warn('No previous session found to resume');
      }
    } catch (error) {
      logger.error('Failed to resume session:', error);
      // Continue with fresh session
    }
  }

  // Create MCP Server
  const server = new Server(
    { name: 'claude-code-guardian', version: '1.0.0' },
    { capabilities: { tools: {}, resources: {} } }
  );

  // Register handlers
  registerToolHandlers(server, modules, stateManager, logger, config);
  registerResourceHandlers(server, modules, stateManager, config);

  logger.info('Claude Code Guardian MCP Server ready');
  return server;
}

// ═══════════════════════════════════════════════════════════════
//                      HANDLER REGISTRATION
// ═══════════════════════════════════════════════════════════════

function registerToolHandlers(
  server: Server,
  modules: CCGModules,
  stateManager: StateManager,
  logger: Logger,
  config: CCGConfig
): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools: any[] = [
      ...getSessionTools(),
    ];

    // Only include tools from enabled modules
    if (config.modules.memory.enabled) tools.push(...modules.memory.getTools());
    if (config.modules.guard.enabled) tools.push(...modules.guard.getTools());
    if (config.modules.workflow.enabled) tools.push(...modules.workflow.getTools());
    if (config.modules.process.enabled) tools.push(...modules.process.getTools());
    if (config.modules.resource.enabled) tools.push(...modules.resource.getTools());
    if (config.modules.testing.enabled) tools.push(...modules.testing.getTools());
    if (config.modules.documents.enabled) tools.push(...modules.documents.getTools());

    const agentsConfig = config.modules.agents || { enabled: true };
    if (agentsConfig.enabled) tools.push(...modules.agents.getTools());

    const latentConfig = config.modules.latent || DEFAULT_LATENT_CONFIG;
    if (latentConfig.enabled) tools.push(...modules.latent.getTools());

    const thinkingConfig = (config.modules as any).thinking || DEFAULT_THINKING_CONFIG;
    if (thinkingConfig.enabled) tools.push(...modules.thinking.getTools());

    const autoAgentConfig = (config.modules as any).autoAgent || DEFAULT_AUTO_AGENT_CONFIG;
    if (autoAgentConfig.enabled) tools.push(...modules.autoAgent.getTools());

    const ragConfig = (config.modules as any).rag || DEFAULT_RAG_CONFIG;
    if (ragConfig.enabled !== false) tools.push(...modules.rag.getToolDefinitions());

    const codeOptimizerConfig = (config.modules as any).codeOptimizer || DEFAULT_CODE_OPTIMIZER_CONFIG;
    if (codeOptimizerConfig.enabled !== false) tools.push(...getCodeOptimizerTools());

    logger.debug(`Listing ${tools.length} tools from enabled modules (CCG v4.0)`);
    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    logger.debug(`Tool call: ${name}`, args);

    try {
      const result = await routeToolCall(
        name,
        args as Record<string, unknown>,
        modules,
        stateManager,
        logger
      );

      return {
        content: [{
          type: 'text',
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
        }],
      };
    } catch (error) {
      logger.error(`Tool ${name} failed:`, error);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: true,
            message: error instanceof Error ? error.message : 'Unknown error',
          }),
        }],
        isError: true,
      };
    }
  });
}

function registerResourceHandlers(
  server: Server,
  modules: CCGModules,
  stateManager: StateManager,
  config: CCGConfig
): void {
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      { uri: 'ccg://status', name: 'CCG Status', description: 'Current status of Claude Code Guardian', mimeType: 'application/json' },
      { uri: 'ccg://memory', name: 'Memory Summary', description: 'Summary of stored memories', mimeType: 'application/json' },
      { uri: 'ccg://config', name: 'Configuration', description: 'Current CCG configuration', mimeType: 'application/json' },
    ],
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    switch (uri) {
      case 'ccg://status':
        return {
          contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(await getFullStatus(modules, stateManager), null, 2) }],
        };
      case 'ccg://memory':
        return {
          contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(await modules.memory.getSummary(), null, 2) }],
        };
      case 'ccg://config':
        return {
          contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(config, null, 2) }],
        };
      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  });
}
