// src/api/index.ts
// Entry point for CCG HTTP API Server

import { ConfigManager } from '../core/config-manager.js';
import { StateManager } from '../core/state-manager.js';
import { EventBus } from '../core/event-bus.js';
import { Logger } from '../core/logger.js';
import { CCGConfig } from '../core/types.js';

import { createModules, initializeModules } from '../core/module-factory.js';
import { createAPIServer, CCGModulesForAPI } from './http-server.js';

async function main() {
  const projectRoot = process.env.CCG_PROJECT_ROOT || process.cwd();
  const logLevel = (process.env.CCG_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info';
  const apiPort = parseInt(process.env.CCG_API_PORT || '3334');

  // Initialize core services
  const logger = new Logger(logLevel, 'CCG-API');
  const eventBus = new EventBus();
  const configManager = new ConfigManager(projectRoot, logger, eventBus);
  const stateManager = new StateManager(projectRoot, logger, eventBus);

  logger.info('Starting CCG API Server...');
  logger.debug(`Project root: ${projectRoot}`);

  // Load configuration
  let config: CCGConfig;
  try {
    config = await configManager.load();
    logger.info('Configuration loaded successfully');
  } catch (error) {
    logger.warn('Using default configuration');
    config = configManager.getDefaultConfig();
  }

  // Create all modules using ModuleFactory (for consistency)
  const allModules = createModules(config, configManager, eventBus, logger, projectRoot);

  // Extract only modules needed for HTTP API
  const modules: CCGModulesForAPI = {
    memory: allModules.memory,
    guard: allModules.guard,
    workflow: allModules.workflow,
    process: allModules.process,
    documents: allModules.documents,
    agents: allModules.agents,
    latent: allModules.latent,
  };

  // Initialize modules (ModuleFactory handles enabled checks)
  await initializeModules(allModules, config, logger);

  // Create and start API server
  const { start } = createAPIServer(
    modules,
    stateManager,
    eventBus,
    logger,
    {
      port: apiPort,
      corsOrigins: ['http://localhost:3333', 'http://localhost:3000'],
    }
  );

  start();

  // Handle shutdown
  process.on('SIGINT', async () => {
    logger.info('Shutting down CCG API Server...');
    await modules.memory.savePersistent();
    await modules.workflow.saveTasks();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Shutting down CCG API Server...');
    await modules.memory.savePersistent();
    await modules.workflow.saveTasks();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Failed to start CCG API Server:', error);
  process.exit(1);
});
