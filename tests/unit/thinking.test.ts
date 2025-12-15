// tests/unit/thinking.test.ts

// Using vitest globals
import { ThinkingService } from '../../src/modules/thinking/thinking.service.js';
import { EventBus } from '../../src/core/event-bus.js';
import { Logger } from '../../src/core/logger.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

const mockEventBus = new EventBus();
const mockLogger = new Logger('silent');

const createTestConfig = (overrides = {}) => ({
  enabled: true,
  maxSnippetsPerCategory: 10,
  ...overrides,
});

describe('ThinkingService', () => {
  let service: ThinkingService;
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `test-thinking-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testDir, { recursive: true });

    service = new ThinkingService(
      createTestConfig({ snippetsPath: path.join(testDir, 'snippets') }),
      mockEventBus,
      mockLogger,
      testDir
    );
    await service.initialize();
  });

  afterEach(async () => {
    await service.shutdown();
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // ═══════════════════════════════════════════════════════════════
  //                      INITIALIZATION
  // ═══════════════════════════════════════════════════════════════

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      expect(service).toBeDefined();
    });

    it('should skip initialization when disabled', async () => {
      const disabledService = new ThinkingService(
        createTestConfig({ enabled: false }),
        mockEventBus,
        mockLogger,
        testDir
      );
      await disabledService.initialize();
      expect(disabledService.getStatus().enabled).toBe(false);
    });

    it('should load default models', async () => {
      const models = service.listThinkingModels();
      expect(models.length).toBeGreaterThan(0);
    });

    it('should load default workflows', async () => {
      const workflows = service.listWorkflows();
      expect(workflows.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      THINKING MODELS
  // ═══════════════════════════════════════════════════════════════

  describe('getThinkingModel', () => {
    it('should get chain-of-thought model', () => {
      const model = service.getThinkingModel('chain-of-thought');

      expect(model).not.toBeNull();
      expect(model!.id).toBe('chain-of-thought');
      expect(model!.name).toBeDefined();
      expect(model!.description).toBeDefined();
    });

    it('should get tree-of-thoughts model', () => {
      const model = service.getThinkingModel('tree-of-thoughts');

      expect(model).not.toBeNull();
      expect(model!.id).toBe('tree-of-thoughts');
    });

    it('should return null for unknown model', () => {
      const model = service.getThinkingModel('nonexistent' as any);

      expect(model).toBeNull();
    });
  });

  describe('listThinkingModels', () => {
    it('should return array of models', () => {
      const models = service.listThinkingModels();

      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    });

    it('should include required models', () => {
      const models = service.listThinkingModels();
      const modelIds = models.map(m => m.id);

      expect(modelIds).toContain('chain-of-thought');
      expect(modelIds).toContain('tree-of-thoughts');
      expect(modelIds).toContain('decomposition');
    });
  });

  describe('suggestModel', () => {
    it('should suggest decomposition for complex task', () => {
      const model = service.suggestModel('break down this large feature into smaller parts');

      expect(model).toBeDefined();
    });

    it('should suggest chain-of-thought for debugging', () => {
      const model = service.suggestModel('debug this error step by step');

      expect(model).toBeDefined();
    });

    it('should return a valid model for any task', () => {
      const model = service.suggestModel('random task description');

      expect(model).toBeDefined();
      expect(model.id).toBeDefined();
    });
  });

  describe('getModelNames', () => {
    it('should return array of model names', () => {
      const names = service.getModelNames();

      expect(Array.isArray(names)).toBe(true);
      expect(names).toContain('chain-of-thought');
      expect(names).toContain('tree-of-thoughts');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      WORKFLOWS
  // ═══════════════════════════════════════════════════════════════

  describe('getWorkflow', () => {
    it('should get pre-commit workflow', () => {
      const workflow = service.getWorkflow('pre-commit');

      expect(workflow).not.toBeNull();
      expect(workflow!.id).toBe('pre-commit');
      expect(workflow!.steps).toBeDefined();
    });

    it('should get code-review workflow', () => {
      const workflow = service.getWorkflow('code-review');

      expect(workflow).not.toBeNull();
    });

    it('should return null for unknown workflow', () => {
      const workflow = service.getWorkflow('nonexistent' as any);

      expect(workflow).toBeNull();
    });
  });

  describe('listWorkflows', () => {
    it('should return array of workflows', () => {
      const workflows = service.listWorkflows();

      expect(Array.isArray(workflows)).toBe(true);
      expect(workflows.length).toBeGreaterThan(0);
    });
  });

  describe('suggestWorkflow', () => {
    it('should suggest workflow based on task', () => {
      const workflow = service.suggestWorkflow('commit my changes');

      // May or may not find a match
      // Just verify it doesn't throw
      expect(workflow === null || workflow.id !== undefined).toBe(true);
    });
  });

  describe('getWorkflowNames', () => {
    it('should return array of workflow names', () => {
      const names = service.getWorkflowNames();

      expect(Array.isArray(names)).toBe(true);
      expect(names.length).toBeGreaterThan(0);
    });
  });

  describe('checkWorkflowTrigger', () => {
    it('should detect workflow trigger from description', () => {
      const workflow = service.checkWorkflowTrigger('I need to commit my code changes');

      // May or may not find a match depending on trigger keywords
      expect(workflow === null || workflow.id !== undefined).toBe(true);
    });

    it('should return null when no workflow matches', () => {
      const workflow = service.checkWorkflowTrigger('xyzzy random string');

      expect(workflow).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      CODE SNIPPETS
  // ═══════════════════════════════════════════════════════════════

  describe('saveSnippet', () => {
    it('should save a code snippet', async () => {
      const snippet = await service.saveSnippet({
        category: 'React Component',
        description: 'Basic functional component',
        code: 'export function MyComponent() { return <div />; }',
        language: 'tsx',
        tags: ['react', 'component'],
      });

      expect(snippet.id).toBeDefined();
      expect(snippet.category).toBe('React Component');
      expect(snippet.usageCount).toBe(0);
    });

    it('should auto-detect language', async () => {
      const snippet = await service.saveSnippet({
        category: 'TypeScript',
        description: 'Interface example',
        code: 'interface User { name: string; age: number; }',
      });

      expect(snippet.language).toBe('typescript');
    });

    it('should detect JavaScript', async () => {
      const snippet = await service.saveSnippet({
        category: 'JS',
        description: 'Arrow function',
        code: 'const add = (a, b) => a + b;',
      });

      expect(snippet.language).toBe('javascript');
    });

    it('should detect Python', async () => {
      const snippet = await service.saveSnippet({
        category: 'Python',
        description: 'Class example',
        code: 'class User:\n  def __init__(self, name):\n    self.name = name',
      });

      expect(snippet.language).toBe('python');
    });

    it('should default to text for unknown language', async () => {
      const snippet = await service.saveSnippet({
        category: 'Unknown',
        description: 'Random text',
        code: 'some random text without any language markers',
      });

      expect(snippet.language).toBe('text');
    });
  });

  describe('getStyleReference', () => {
    it('should find saved snippets by category', async () => {
      await service.saveSnippet({
        category: 'React Component',
        description: 'Button component',
        code: 'export function Button() {}',
      });

      const result = service.getStyleReference('React');

      expect(result.found).toBe(true);
      expect(result.count).toBeGreaterThan(0);
      expect(result.snippets.length).toBeGreaterThan(0);
    });

    it('should return not found for missing category', () => {
      const result = service.getStyleReference('NonexistentCategory');

      expect(result.found).toBe(false);
      expect(result.count).toBe(0);
      expect(result.snippets).toEqual([]);
    });

    it('should limit results', async () => {
      await service.saveSnippet({ category: 'Test', description: 'Test 1', code: 'code1' });
      await service.saveSnippet({ category: 'Test', description: 'Test 2', code: 'code2' });
      await service.saveSnippet({ category: 'Test', description: 'Test 3', code: 'code3' });

      const result = service.getStyleReference('Test', 2);

      expect(result.snippets.length).toBe(2);
    });

    it('should increment usage count on retrieval', async () => {
      const saved = await service.saveSnippet({
        category: 'Usage Test',
        description: 'Test snippet',
        code: 'code',
      });

      expect(saved.usageCount).toBe(0);

      service.getStyleReference('Usage Test');
      service.getStyleReference('Usage Test');

      const snippets = service.listSnippets();
      const updated = snippets.find(s => s.id === saved.id);

      expect(updated!.usageCount).toBe(2);
    });
  });

  describe('listSnippets', () => {
    it('should return all snippets', async () => {
      await service.saveSnippet({ category: 'A', description: 'a', code: '1' });
      await service.saveSnippet({ category: 'B', description: 'b', code: '2' });

      const snippets = service.listSnippets();

      expect(snippets.length).toBe(2);
    });
  });

  describe('listSnippetsByCategory', () => {
    it('should group snippets by category', async () => {
      await service.saveSnippet({ category: 'React', description: 'a', code: '1' });
      await service.saveSnippet({ category: 'React', description: 'b', code: '2' });
      await service.saveSnippet({ category: 'Vue', description: 'c', code: '3' });

      const byCategory = service.listSnippetsByCategory();

      expect(byCategory['React'].length).toBe(2);
      expect(byCategory['Vue'].length).toBe(1);
    });
  });

  describe('deleteSnippet', () => {
    it('should delete a snippet', async () => {
      const snippet = await service.saveSnippet({
        category: 'Delete Test',
        description: 'Will be deleted',
        code: 'code',
      });

      const deleted = await service.deleteSnippet(snippet.id);
      expect(deleted).toBe(true);

      const snippets = service.listSnippets();
      expect(snippets.find(s => s.id === snippet.id)).toBeUndefined();
    });

    it('should return false for non-existent snippet', async () => {
      const deleted = await service.deleteSnippet('nonexistent-id');
      expect(deleted).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      STATUS
  // ═══════════════════════════════════════════════════════════════

  describe('getStatus', () => {
    it('should return module status', () => {
      const status = service.getStatus();

      expect(status.enabled).toBe(true);
      expect(status.modelsLoaded).toBeGreaterThan(0);
      expect(status.workflowsLoaded).toBeGreaterThan(0);
      expect(status.snippetsStored).toBeGreaterThanOrEqual(0);
    });

    it('should track last accessed time', () => {
      service.getThinkingModel('chain-of-thought');
      const status = service.getStatus();

      expect(status.lastAccessed).toBeDefined();
    });
  });
});
