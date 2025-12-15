// tests/unit/thinking-module.test.ts
// ThinkingModule Unit Tests

// Using vitest globals
import { ThinkingModule } from '../../src/modules/thinking/thinking.module.js';
import { EventBus } from '../../src/core/event-bus.js';
import { Logger } from '../../src/core/logger.js';
import type { ThinkingModuleConfig } from '../../src/modules/thinking/thinking.types.js';

describe('ThinkingModule', () => {
  let eventBus: EventBus;
  let logger: Logger;
  let config: ThinkingModuleConfig;

  beforeEach(() => {
    eventBus = new EventBus();
    logger = new Logger('info', 'ThinkingModuleTest');
    config = {
      enabled: true,
      modelsEnabled: true,
      workflowsEnabled: true,
      snippetsEnabled: true,
    };
  });

  describe('constructor', () => {
    it('creates module with config', () => {
      const module = new ThinkingModule(config, eventBus, logger);

      expect(module).toBeDefined();
    });

    it('creates module with custom project root', () => {
      const module = new ThinkingModule(config, eventBus, logger, '/custom/root');

      expect(module).toBeDefined();
    });
  });

  describe('initialize()', () => {
    it('initializes module successfully', async () => {
      const module = new ThinkingModule(config, eventBus, logger);

      await expect(module.initialize()).resolves.not.toThrow();
    });

    it('initializes with disabled config', async () => {
      config.enabled = false;
      const module = new ThinkingModule(config, eventBus, logger);

      await expect(module.initialize()).resolves.not.toThrow();
    });
  });

  describe('shutdown()', () => {
    it('shuts down module successfully', async () => {
      const module = new ThinkingModule(config, eventBus, logger);
      await module.initialize();

      await expect(module.shutdown()).resolves.not.toThrow();
    });

    it('shuts down uninitialized module', async () => {
      const module = new ThinkingModule(config, eventBus, logger);

      await expect(module.shutdown()).resolves.not.toThrow();
    });
  });

  describe('getTools()', () => {
    it('returns tools when enabled', () => {
      const module = new ThinkingModule(config, eventBus, logger);

      const tools = module.getTools();

      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
    });

    it('returns empty array when disabled', () => {
      config.enabled = false;
      const module = new ThinkingModule(config, eventBus, logger);

      const tools = module.getTools();

      expect(tools).toEqual([]);
    });

    it('tools have required properties', () => {
      const module = new ThinkingModule(config, eventBus, logger);

      const tools = module.getTools();

      for (const tool of tools) {
        expect(tool.name).toBeDefined();
        expect(typeof tool.name).toBe('string');
        expect(tool.description).toBeDefined();
        expect(typeof tool.description).toBe('string');
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.inputSchema).toBe('object');
      }
    });
  });

  describe('handleTool()', () => {
    it('throws error when not initialized', async () => {
      const module = new ThinkingModule(config, eventBus, logger);

      await expect(
        module.handleTool('thinking_list_models', {})
      ).rejects.toThrow('Thinking module not initialized');
    });

    it('throws error for unknown tool', async () => {
      const module = new ThinkingModule(config, eventBus, logger);
      await module.initialize();

      await expect(
        module.handleTool('unknown_tool', {})
      ).rejects.toThrow('Unknown tool: unknown_tool');
    });

    it('handles thinking_list_models tool', async () => {
      const module = new ThinkingModule(config, eventBus, logger);
      await module.initialize();

      const result = await module.handleTool('thinking_list_models', {});

      expect(result).toBeDefined();
    });

    it('handles thinking_get_model tool', async () => {
      const module = new ThinkingModule(config, eventBus, logger);
      await module.initialize();

      const result = await module.handleTool('thinking_get_model', {
        modelName: 'chain-of-thought',
      });

      expect(result).toBeDefined();
    });

    it('handles thinking_list_workflows tool', async () => {
      const module = new ThinkingModule(config, eventBus, logger);
      await module.initialize();

      const result = await module.handleTool('thinking_list_workflows', {});

      expect(result).toBeDefined();
    });

    it('handles thinking_get_workflow tool', async () => {
      const module = new ThinkingModule(config, eventBus, logger);
      await module.initialize();

      const result = await module.handleTool('thinking_get_workflow', {
        workflowName: 'pre-commit',
      });

      expect(result).toBeDefined();
    });

    it('handles thinking_status tool', async () => {
      const module = new ThinkingModule(config, eventBus, logger);
      await module.initialize();

      const result = await module.handleTool('thinking_status', {});

      expect(result).toBeDefined();
    });
  });

  describe('getStatus()', () => {
    it('returns status object', () => {
      const module = new ThinkingModule(config, eventBus, logger);

      const status = module.getStatus();

      expect(status).toBeDefined();
      expect(typeof status).toBe('object');
    });

    it('status includes expected fields', async () => {
      const module = new ThinkingModule(config, eventBus, logger);
      await module.initialize();

      const status = module.getStatus();

      expect(status).toHaveProperty('enabled');
      expect(status).toHaveProperty('modelsLoaded');
      expect(status).toHaveProperty('workflowsLoaded');
    });
  });

  describe('getService()', () => {
    it('returns the underlying service', () => {
      const module = new ThinkingModule(config, eventBus, logger);

      const service = module.getService();

      expect(service).toBeDefined();
    });

    it('service is accessible before initialization', () => {
      const module = new ThinkingModule(config, eventBus, logger);

      const service = module.getService();

      expect(service).toBeDefined();
    });
  });
});
