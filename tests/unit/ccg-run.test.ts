// tests/unit/ccg-run.test.ts
/**
 * CCG Run Service Tests
 *
 * Tests:
 * 1. Tool registry contains ccg_run
 * 2. ccg_run dryRun returns nextToolCalls
 * 3. Pattern translation works
 * 4. Validation checks work
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import {
  CCGRunService,
  CCG_RUN_TOOL_DEFINITION,
  translatePrompt,
  buildInternalHandlers,
  getAvailableTools,
} from '../../src/core/ccg-run/index.js';
import { StateManager } from '../../src/core/state-manager.js';
import { EventBus } from '../../src/core/event-bus.js';
import { Logger } from '../../src/core/logger.js';

// ═══════════════════════════════════════════════════════════════
//                      MOCK MODULES
// ═══════════════════════════════════════════════════════════════

function createMockModules() {
  const mockHandler = vi.fn().mockResolvedValue({ success: true });

  return {
    memory: {
      handleTool: mockHandler,
      getTools: () => [],
      loadPersistent: vi.fn().mockResolvedValue(0),
      savePersistent: vi.fn().mockResolvedValue(undefined),
      getSummary: vi.fn().mockResolvedValue({}),
      getStatus: vi.fn().mockReturnValue({}),
    },
    guard: {
      handleTool: mockHandler,
      getTools: () => [],
      getStatus: vi.fn().mockReturnValue({}),
    },
    workflow: {
      handleTool: vi.fn().mockImplementation((action) => {
        if (action === 'workflow_task_create') {
          return Promise.resolve({ taskId: 'mock-task-1' });
        }
        return Promise.resolve({ success: true });
      }),
      getTools: () => [],
      loadPendingTasks: vi.fn().mockResolvedValue([]),
      saveTasks: vi.fn().mockResolvedValue(undefined),
      getStatus: vi.fn().mockReturnValue({}),
    },
    process: {
      handleTool: mockHandler,
      getTools: () => [],
    },
    resource: {
      handleTool: mockHandler,
      getTools: () => [],
      getLatestResumeState: vi.fn().mockResolvedValue(null),
    },
    testing: {
      handleTool: mockHandler,
      getTools: () => [],
    },
    documents: {
      handleTool: mockHandler,
      getTools: () => [],
    },
    agents: {
      handleTool: mockHandler,
      getTools: () => [],
    },
    latent: {
      handleTool: mockHandler,
      getTools: () => [],
    },
    thinking: {
      handleTool: mockHandler,
      getTools: () => [],
    },
    autoAgent: {
      handleTool: mockHandler,
      getTools: () => [],
      getActiveGraph: vi.fn().mockReturnValue(null),
    },
    rag: {
      getTools: () => ({
        rag_build_index: { handler: mockHandler },
        rag_query: { handler: mockHandler },
        rag_related_code: { handler: mockHandler },
        rag_status: { handler: mockHandler },
        rag_clear_index: { handler: mockHandler },
        rag_get_chunk: { handler: mockHandler },
      }),
      getToolDefinitions: () => [],
    },
    codeOptimizer: {
      scanRepository: mockHandler,
      calculateMetrics: mockHandler,
      identifyHotspots: mockHandler,
      generateRefactorPlan: mockHandler,
      recordOptimization: mockHandler,
      generateReport: mockHandler,
      quickAnalysis: mockHandler,
      getStatus: vi.fn().mockReturnValue({}),
    },
    session: {
      handleTool: mockHandler,
      getService: vi.fn().mockReturnValue({
        recordEvent: vi.fn(),
        findLatestSession: vi.fn().mockReturnValue(null),
      }),
    },
  };
}

// ═══════════════════════════════════════════════════════════════
//                      TEST SETUP
// ═══════════════════════════════════════════════════════════════

let tempDir: string;
let stateManager: StateManager;
let eventBus: EventBus;
let logger: Logger;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccg-run-test-'));
  logger = new Logger('error', 'TestCCGRun');
  eventBus = new EventBus();
  stateManager = new StateManager(tempDir, logger, eventBus);
  stateManager.createSession(tempDir);
});

afterEach(() => {
  stateManager.dispose();
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
});

// ═══════════════════════════════════════════════════════════════
//                      TOOL DEFINITION TESTS
// ═══════════════════════════════════════════════════════════════

describe('CCG Run Tool Definition', () => {
  it('should have correct name', () => {
    expect(CCG_RUN_TOOL_DEFINITION.name).toBe('ccg_run');
  });

  it('should have description', () => {
    expect(CCG_RUN_TOOL_DEFINITION.description).toBeTruthy();
    expect(CCG_RUN_TOOL_DEFINITION.description).toContain('entrypoint');
  });

  it('should have input schema with prompt required', () => {
    expect(CCG_RUN_TOOL_DEFINITION.inputSchema.type).toBe('object');
    expect(CCG_RUN_TOOL_DEFINITION.inputSchema.required).toContain('prompt');
  });

  it('should have dryRun and translationMode properties', () => {
    const props = CCG_RUN_TOOL_DEFINITION.inputSchema.properties;
    expect(props.dryRun).toBeDefined();
    expect(props.translationMode).toBeDefined();
    expect(props.translationMode.enum).toContain('auto');
    expect(props.translationMode.enum).toContain('pattern');
    expect(props.translationMode.enum).toContain('tiny');
  });
});

// ═══════════════════════════════════════════════════════════════
//                      PROMPT TRANSLATION TESTS
// ═══════════════════════════════════════════════════════════════

describe('Prompt Translation', () => {
  it('should translate "analyze code" to code_quick_analysis', () => {
    const result = translatePrompt('analyze code');
    expect(result.steps.length).toBeGreaterThan(0);
    expect(result.steps[0].tool).toBe('code_quick_analysis');
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.source).toBe('pattern');
  });

  it('should translate "run tests" to testing_run', () => {
    const result = translatePrompt('run tests');
    expect(result.steps.length).toBeGreaterThan(0);
    expect(result.steps[0].tool).toBe('testing_run');
  });

  it('should translate "validate code" to guard_validate', () => {
    const result = translatePrompt('validate this code');
    expect(result.steps.length).toBeGreaterThan(0);
    expect(result.steps[0].tool).toBe('guard_validate');
  });

  it('should translate "check memory" to memory_summary', () => {
    const result = translatePrompt('check memory');
    expect(result.steps.length).toBeGreaterThan(0);
    expect(result.steps[0].tool).toBe('memory_summary');
  });

  it('should translate "status" to ccg status tools', () => {
    const result = translatePrompt('show status');
    expect(result.steps.length).toBeGreaterThan(0);
    // Should include status checks
    expect(result.steps.some((s) => s.tool.includes('status'))).toBe(true);
  });

  it('should return low confidence for unknown prompts', () => {
    const result = translatePrompt('xyz random gibberish abc');
    expect(result.confidence).toBeLessThan(0.5);
  });
});

// ═══════════════════════════════════════════════════════════════
//                      HANDLERS MAP TESTS
// ═══════════════════════════════════════════════════════════════

describe('Internal Handlers Map', () => {
  it('should build handlers from mock modules', () => {
    const modules = createMockModules();
    const handlers = buildInternalHandlers({
      modules: modules as any,
      stateManager,
    });

    expect(handlers).toBeDefined();
    expect(typeof handlers).toBe('object');
  });

  it('should include all major tool categories', () => {
    const modules = createMockModules();
    const handlers = buildInternalHandlers({
      modules: modules as any,
      stateManager,
    });

    const tools = getAvailableTools(handlers);

    // Check key tools exist
    expect(tools).toContain('guard_validate');
    expect(tools).toContain('memory_store');
    expect(tools).toContain('workflow_task_create');
    expect(tools).toContain('testing_run');
    expect(tools).toContain('code_quick_analysis');
  });

  it('should have 60+ handlers', () => {
    const modules = createMockModules();
    const handlers = buildInternalHandlers({
      modules: modules as any,
      stateManager,
    });

    const tools = getAvailableTools(handlers);
    expect(tools.length).toBeGreaterThan(60);
  });
});

// ═══════════════════════════════════════════════════════════════
//                      CCG RUN SERVICE TESTS
// ═══════════════════════════════════════════════════════════════

describe('CCGRunService', () => {
  it('should initialize successfully', () => {
    const modules = createMockModules();
    const service = new CCGRunService({
      modules: modules as any,
      stateManager,
      logger,
      projectRoot: tempDir,
    });

    expect(service).toBeDefined();
  });

  it('should run dryRun and return nextToolCalls', async () => {
    const modules = createMockModules();
    const service = new CCGRunService({
      modules: modules as any,
      stateManager,
      logger,
      projectRoot: tempDir,
    });

    const result = await service.run({
      prompt: 'analyze code',
      dryRun: true,
    });

    expect(result.taskId).toBeTruthy();
    expect(result.taskStatus).toBe('pending');
    expect(result.nextToolCalls).toBeDefined();
    expect(result.nextToolCalls!.length).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.translationSource).toBe('pattern');
  });

  it('should execute tools when not dryRun', async () => {
    const modules = createMockModules();
    const service = new CCGRunService({
      modules: modules as any,
      stateManager,
      logger,
      projectRoot: tempDir,
    });

    const result = await service.run({
      prompt: 'check memory',
      dryRun: false,
    });

    expect(result.taskStatus).toBe('completed');
    expect(result.execution.stepsCompleted).toBeGreaterThan(0);
  });

  it('should persist report when persistReport is true', async () => {
    const modules = createMockModules();
    const service = new CCGRunService({
      modules: modules as any,
      stateManager,
      logger,
      projectRoot: tempDir,
    });

    const result = await service.run({
      prompt: 'analyze code',
      dryRun: true,
      persistReport: true,
    });

    expect(result.reportPath).toBeTruthy();
    expect(fs.existsSync(result.reportPath!)).toBe(true);

    // Verify report content
    const report = JSON.parse(fs.readFileSync(result.reportPath!, 'utf-8'));
    expect(report.taskId).toBe(result.taskId);
    expect(report.input.prompt).toBe('analyze code');
  });

  it('should include validation checks in output', async () => {
    const modules = createMockModules();
    const service = new CCGRunService({
      modules: modules as any,
      stateManager,
      logger,
      projectRoot: tempDir,
    });

    const result = await service.run({
      prompt: 'analyze code',
      dryRun: true,
    });

    expect(result.validation).toBeDefined();
    expect(result.validation.checks).toBeDefined();
    expect(result.validation.checks.length).toBeGreaterThan(0);
    expect(result.validation.passed).toBe(true);
  });

  it('should fail validation for unknown prompts', async () => {
    const modules = createMockModules();
    const service = new CCGRunService({
      modules: modules as any,
      stateManager,
      logger,
      projectRoot: tempDir,
    });

    const result = await service.run({
      prompt: 'xyz random gibberish abc',
      dryRun: true,
    });

    expect(result.validation.passed).toBe(false);
    expect(result.taskStatus).toBe('blocked');
  });

  it('should create workflow task when running', async () => {
    const modules = createMockModules();
    const service = new CCGRunService({
      modules: modules as any,
      stateManager,
      logger,
      projectRoot: tempDir,
    });

    await service.run({
      prompt: 'check memory',
      dryRun: false,
    });

    // Verify workflow_task_create was called
    expect(modules.workflow.handleTool).toHaveBeenCalledWith(
      'workflow_task_create',
      expect.objectContaining({
        name: expect.stringContaining('CCG Run'),
        tags: expect.arrayContaining(['ccg-run']),
      })
    );
  });
});

// ═══════════════════════════════════════════════════════════════
//                      ERROR HANDLING TESTS
// ═══════════════════════════════════════════════════════════════

describe('CCGRunService Error Handling', () => {
  it('should handle tool execution errors gracefully', async () => {
    const modules = createMockModules();
    // Make guard_validate fail
    modules.guard.handleTool = vi.fn().mockRejectedValue(new Error('Validation failed'));

    const service = new CCGRunService({
      modules: modules as any,
      stateManager,
      logger,
      projectRoot: tempDir,
    });

    const result = await service.run({
      prompt: 'validate code',
      dryRun: false,
    });

    expect(result.taskStatus).toBe('failed');
    expect(result.execution.stepsFailed).toBeGreaterThan(0);
  });

  it('should persist report even on error', async () => {
    const modules = createMockModules();
    modules.guard.handleTool = vi.fn().mockRejectedValue(new Error('Validation failed'));

    const service = new CCGRunService({
      modules: modules as any,
      stateManager,
      logger,
      projectRoot: tempDir,
    });

    const result = await service.run({
      prompt: 'validate code',
      dryRun: false,
      persistReport: true,
    });

    expect(result.reportPath).toBeTruthy();
    expect(fs.existsSync(result.reportPath!)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
//                      TEMPLATE TESTS
// ═══════════════════════════════════════════════════════════════

describe('/ccg Template', () => {
  it('should have template file that exists', () => {
    const templatePath = path.join(process.cwd(), 'templates', 'commands', 'ccg-entrypoint.md');
    expect(fs.existsSync(templatePath)).toBe(true);
  });

  it('should contain mcp__claude-code-guardian__ccg_run in template', () => {
    const templatePath = path.join(process.cwd(), 'templates', 'commands', 'ccg-entrypoint.md');
    const content = fs.readFileSync(templatePath, 'utf-8');
    expect(content).toContain('mcp__claude-code-guardian__ccg_run');
  });

  it('should contain ALWAYS call tool first instruction', () => {
    const templatePath = path.join(process.cwd(), 'templates', 'commands', 'ccg-entrypoint.md');
    const content = fs.readFileSync(templatePath, 'utf-8');
    expect(content).toContain('ALWAYS');
    expect(content).toContain('tool first');
  });

  it('should contain fallback conditions for unsupported prompts', () => {
    const templatePath = path.join(process.cwd(), 'templates', 'commands', 'ccg-entrypoint.md');
    const content = fs.readFileSync(templatePath, 'utf-8');
    expect(content).toContain('supported === false');
    expect(content).toContain('NO_MATCHING_PATTERN');
    expect(content).toContain('stepsTotal === 0');
  });
});

// ═══════════════════════════════════════════════════════════════
//                      NO-MATCH / FALLBACK TESTS
// ═══════════════════════════════════════════════════════════════

describe('CCGRunService No-Match Fallback', () => {
  it('should return supported=false for unknown prompts', async () => {
    const modules = createMockModules();
    const service = new CCGRunService({
      modules: modules as any,
      stateManager,
      logger,
      projectRoot: tempDir,
    });

    const result = await service.run({
      prompt: 'cài MCP global',
      dryRun: true,
    });

    expect(result.supported).toBe(false);
  });

  it('should return reason=NO_MATCHING_PATTERN for unknown prompts', async () => {
    const modules = createMockModules();
    const service = new CCGRunService({
      modules: modules as any,
      stateManager,
      logger,
      projectRoot: tempDir,
    });

    const result = await service.run({
      prompt: 'setup something global config',
      dryRun: true,
    });

    expect(result.reason).toBe('NO_MATCHING_PATTERN');
  });

  it('should return low confidence for unknown prompts (fallback scenario)', async () => {
    const modules = createMockModules();
    const service = new CCGRunService({
      modules: modules as any,
      stateManager,
      logger,
      projectRoot: tempDir,
    });

    const result = await service.run({
      prompt: 'xyz unknown command abc',
      dryRun: true,
    });

    // Fallback gives 1 step with confidence 0.3 (below threshold of 0.5)
    // This is treated as no-match
    expect(result.confidence).toBeLessThan(0.5);
    expect(result.supported).toBe(false);
  });

  it('should NOT throw for unknown prompts', async () => {
    const modules = createMockModules();
    const service = new CCGRunService({
      modules: modules as any,
      stateManager,
      logger,
      projectRoot: tempDir,
    });

    // Should not throw
    const result = await service.run({
      prompt: 'random gibberish command',
      dryRun: true,
    });

    expect(result).toBeDefined();
    expect(result.taskId).toBeTruthy();
  });

  it('should include fallbackGuidance for unknown prompts', async () => {
    const modules = createMockModules();
    const service = new CCGRunService({
      modules: modules as any,
      stateManager,
      logger,
      projectRoot: tempDir,
    });

    const result = await service.run({
      prompt: 'something not matching any pattern',
      dryRun: true,
    });

    expect(result.fallbackGuidance).toBeDefined();
    expect(result.fallbackGuidance?.summary).toBeTruthy();
    expect(result.fallbackGuidance?.suggestedNext).toBeDefined();
    expect(result.fallbackGuidance?.examples).toBeDefined();
    expect(result.fallbackGuidance?.examples.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════
//                      IN-SCOPE / SUPPORTED TESTS
// ═══════════════════════════════════════════════════════════════

describe('CCGRunService In-Scope Prompts', () => {
  it('should return supported=true for known prompts', async () => {
    const modules = createMockModules();
    const service = new CCGRunService({
      modules: modules as any,
      stateManager,
      logger,
      projectRoot: tempDir,
    });

    const result = await service.run({
      prompt: 'analyze code',
      dryRun: true,
    });

    expect(result.supported).toBe(true);
  });

  it('should return execution.stepsTotal > 0 for known prompts', async () => {
    const modules = createMockModules();
    const service = new CCGRunService({
      modules: modules as any,
      stateManager,
      logger,
      projectRoot: tempDir,
    });

    const result = await service.run({
      prompt: 'run tests',
      dryRun: true,
    });

    expect(result.execution.stepsTotal).toBeGreaterThan(0);
  });

  it('should NOT include fallbackGuidance for known prompts', async () => {
    const modules = createMockModules();
    const service = new CCGRunService({
      modules: modules as any,
      stateManager,
      logger,
      projectRoot: tempDir,
    });

    const result = await service.run({
      prompt: 'check memory',
      dryRun: true,
    });

    expect(result.fallbackGuidance).toBeUndefined();
  });
});
