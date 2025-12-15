// tests/unit/hook-handler.test.ts
// HookHandler Unit Tests

// Using vitest globals
import { HookHandler, Modules } from '../../src/hooks/hook-handler.js';
import { HookContext, HookResult, HookWarning } from '../../src/hooks/types.js';
import { Logger } from '../../src/core/logger.js';
import { ConfigManager } from '../../src/core/config-manager.js';
import { StateManager } from '../../src/core/state-manager.js';
import { EventBus } from '../../src/core/event-bus.js';

// Concrete implementation for testing
class TestHookHandler extends HookHandler {
  public testResult: HookResult = { blocked: false };

  async execute(_input: unknown): Promise<HookResult> {
    return this.testResult;
  }

  // Expose protected methods for testing
  public testFormatOutput(result: HookResult): string {
    return this.formatOutput(result);
  }

  public testCreateWarning(
    level: HookWarning['level'],
    message: string,
    action?: string
  ): HookWarning {
    return this.createWarning(level, message, action);
  }

  // Expose protected members for testing
  public getModules(): Modules {
    return this.modules;
  }

  public getContext(): HookContext {
    return this.context;
  }
}

describe('HookHandler', () => {
  let handler: TestHookHandler;
  let eventBus: EventBus;
  let logger: Logger;
  let config: ConfigManager;
  let state: StateManager;
  let modules: Modules;
  let context: HookContext;

  beforeEach(() => {
    eventBus = new EventBus();
    logger = new Logger('info', 'HookTest');
    config = new ConfigManager(process.cwd());
    state = new StateManager(process.cwd(), logger, eventBus);

    // Create mock modules
    modules = {
      memory: {} as any,
      guard: {} as any,
      process: {} as any,
      resource: {} as any,
      workflow: {} as any,
      testing: {} as any,
      documents: {} as any,
      latent: {} as any,
    };

    context = {
      sessionId: 'test-session',
      startTime: new Date(),
      conversationId: 'conv-123',
    };

    handler = new TestHookHandler(
      modules,
      context,
      logger,
      config,
      state,
      eventBus
    );
  });

  describe('constructor', () => {
    it('stores modules reference', () => {
      expect(handler.getModules()).toBe(modules);
    });

    it('stores context reference', () => {
      expect(handler.getContext()).toBe(context);
    });
  });

  describe('execute()', () => {
    it('returns hook result', async () => {
      handler.testResult = { blocked: false, message: 'OK' };

      const result = await handler.execute({});

      expect(result.blocked).toBe(false);
      expect(result.message).toBe('OK');
    });

    it('can return blocked result', async () => {
      handler.testResult = {
        blocked: true,
        blockReason: 'Validation failed',
      };

      const result = await handler.execute({});

      expect(result.blocked).toBe(true);
      expect(result.blockReason).toBe('Validation failed');
    });
  });

  describe('formatOutput()', () => {
    it('formats blocked result', () => {
      const result: HookResult = {
        blocked: true,
        blockReason: 'Operation not allowed',
      };

      const output = handler.testFormatOutput(result);

      expect(output).toContain('BLOCKED');
      expect(output).toContain('Operation not allowed');
    });

    it('formats result with message', () => {
      const result: HookResult = {
        blocked: false,
        message: 'Operation completed successfully',
      };

      const output = handler.testFormatOutput(result);

      expect(output).toContain('Operation completed successfully');
    });

    it('formats result with error warning', () => {
      const result: HookResult = {
        blocked: false,
        warnings: [
          { level: 'error', message: 'Critical issue found' },
        ],
      };

      const output = handler.testFormatOutput(result);

      expect(output).toContain('[ERROR]');
      expect(output).toContain('Critical issue found');
    });

    it('formats result with warning level', () => {
      const result: HookResult = {
        blocked: false,
        warnings: [
          { level: 'warning', message: 'Potential issue' },
        ],
      };

      const output = handler.testFormatOutput(result);

      expect(output).toContain('[WARN]');
      expect(output).toContain('Potential issue');
    });

    it('formats result with info level', () => {
      const result: HookResult = {
        blocked: false,
        warnings: [
          { level: 'info', message: 'FYI: Something happened' },
        ],
      };

      const output = handler.testFormatOutput(result);

      expect(output).toContain('[INFO]');
      expect(output).toContain('FYI: Something happened');
    });

    it('formats warning with action', () => {
      const result: HookResult = {
        blocked: false,
        warnings: [
          {
            level: 'warning',
            message: 'Issue detected',
            action: 'Run npm install to fix',
          },
        ],
      };

      const output = handler.testFormatOutput(result);

      expect(output).toContain('Issue detected');
      expect(output).toContain('->');
      expect(output).toContain('Run npm install to fix');
    });

    it('formats multiple warnings', () => {
      const result: HookResult = {
        blocked: false,
        warnings: [
          { level: 'error', message: 'Error 1' },
          { level: 'warning', message: 'Warning 1' },
          { level: 'info', message: 'Info 1' },
        ],
      };

      const output = handler.testFormatOutput(result);

      expect(output).toContain('[ERROR] Error 1');
      expect(output).toContain('[WARN] Warning 1');
      expect(output).toContain('[INFO] Info 1');
    });

    it('returns empty string for empty result', () => {
      const result: HookResult = {
        blocked: false,
      };

      const output = handler.testFormatOutput(result);

      expect(output).toBe('');
    });

    it('combines blocked reason with warnings', () => {
      const result: HookResult = {
        blocked: true,
        blockReason: 'Validation failed',
        warnings: [
          { level: 'error', message: 'Invalid input' },
        ],
        message: 'Please fix errors',
      };

      const output = handler.testFormatOutput(result);

      expect(output).toContain('BLOCKED');
      expect(output).toContain('Validation failed');
      expect(output).toContain('[ERROR]');
      expect(output).toContain('Invalid input');
      expect(output).toContain('Please fix errors');
    });
  });

  describe('createWarning()', () => {
    it('creates error warning', () => {
      const warning = handler.testCreateWarning('error', 'Something broke');

      expect(warning.level).toBe('error');
      expect(warning.message).toBe('Something broke');
      expect(warning.action).toBeUndefined();
    });

    it('creates warning level warning', () => {
      const warning = handler.testCreateWarning('warning', 'Be careful');

      expect(warning.level).toBe('warning');
      expect(warning.message).toBe('Be careful');
    });

    it('creates info warning', () => {
      const warning = handler.testCreateWarning('info', 'For your information');

      expect(warning.level).toBe('info');
      expect(warning.message).toBe('For your information');
    });

    it('creates warning with action', () => {
      const warning = handler.testCreateWarning(
        'warning',
        'Missing dependency',
        'Run npm install lodash'
      );

      expect(warning.level).toBe('warning');
      expect(warning.message).toBe('Missing dependency');
      expect(warning.action).toBe('Run npm install lodash');
    });
  });

  describe('context access', () => {
    it('provides access to session ID', () => {
      expect(handler.getContext().sessionId).toBe('test-session');
    });

    it('provides access to conversation ID', () => {
      expect(handler.getContext().conversationId).toBe('conv-123');
    });

    it('provides access to start time', () => {
      expect(handler.getContext().startTime).toBeInstanceOf(Date);
    });
  });
});
