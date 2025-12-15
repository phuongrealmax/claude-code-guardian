// tests/unit/thinking-tools.test.ts

// Using vitest globals
import { getThinkingTools } from '../../src/modules/thinking/thinking.tools.js';

describe('thinking.tools', () => {
  // ═══════════════════════════════════════════════════════════════
  //                      getThinkingTools
  // ═══════════════════════════════════════════════════════════════

  describe('getThinkingTools', () => {
    it('should return an array of tool definitions', () => {
      const tools = getThinkingTools();

      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
    });

    it('should include thinking model tools', () => {
      const tools = getThinkingTools();
      const toolNames = tools.map(t => t.name);

      expect(toolNames).toContain('thinking_get_model');
      expect(toolNames).toContain('thinking_suggest_model');
      expect(toolNames).toContain('thinking_list_models');
    });

    it('should include workflow tools', () => {
      const tools = getThinkingTools();
      const toolNames = tools.map(t => t.name);

      expect(toolNames).toContain('thinking_get_workflow');
      expect(toolNames).toContain('thinking_suggest_workflow');
      expect(toolNames).toContain('thinking_list_workflows');
    });

    it('should include code snippet tools', () => {
      const tools = getThinkingTools();
      const toolNames = tools.map(t => t.name);

      expect(toolNames).toContain('thinking_save_snippet');
      expect(toolNames).toContain('thinking_get_style');
      expect(toolNames).toContain('thinking_list_snippets');
    });

    it('should include status tool', () => {
      const tools = getThinkingTools();
      const toolNames = tools.map(t => t.name);

      expect(toolNames).toContain('thinking_status');
    });

    it('should have valid structure for all tools', () => {
      const tools = getThinkingTools();

      tools.forEach(tool => {
        expect(tool.name).toBeDefined();
        expect(typeof tool.name).toBe('string');
        expect(tool.description).toBeDefined();
        expect(typeof tool.description).toBe('string');
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      GET MODEL SCHEMA
  // ═══════════════════════════════════════════════════════════════

  describe('thinking_get_model schema', () => {
    it('should have modelName as required', () => {
      const tools = getThinkingTools();
      const getTool = tools.find(t => t.name === 'thinking_get_model');

      expect(getTool).toBeDefined();
      expect(getTool!.inputSchema.required).toContain('modelName');
    });

    it('should have modelName enum with all thinking models', () => {
      const tools = getThinkingTools();
      const getTool = tools.find(t => t.name === 'thinking_get_model');
      const modelProp = getTool!.inputSchema.properties.modelName as { enum: string[] };

      expect(modelProp.enum).toContain('chain-of-thought');
      expect(modelProp.enum).toContain('tree-of-thoughts');
      expect(modelProp.enum).toContain('react');
      expect(modelProp.enum).toContain('self-consistency');
      expect(modelProp.enum).toContain('decomposition');
      expect(modelProp.enum).toContain('first-principles');
    });

    it('should have optional context property', () => {
      const tools = getThinkingTools();
      const getTool = tools.find(t => t.name === 'thinking_get_model');

      expect(getTool!.inputSchema.properties).toHaveProperty('context');
      expect(getTool!.inputSchema.required).not.toContain('context');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      SUGGEST MODEL SCHEMA
  // ═══════════════════════════════════════════════════════════════

  describe('thinking_suggest_model schema', () => {
    it('should have taskDescription as required', () => {
      const tools = getThinkingTools();
      const suggestTool = tools.find(t => t.name === 'thinking_suggest_model');

      expect(suggestTool).toBeDefined();
      expect(suggestTool!.inputSchema.required).toContain('taskDescription');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      GET WORKFLOW SCHEMA
  // ═══════════════════════════════════════════════════════════════

  describe('thinking_get_workflow schema', () => {
    it('should have workflowName as required', () => {
      const tools = getThinkingTools();
      const workflowTool = tools.find(t => t.name === 'thinking_get_workflow');

      expect(workflowTool).toBeDefined();
      expect(workflowTool!.inputSchema.required).toContain('workflowName');
    });

    it('should have workflowName enum with all workflows', () => {
      const tools = getThinkingTools();
      const workflowTool = tools.find(t => t.name === 'thinking_get_workflow');
      const nameProp = workflowTool!.inputSchema.properties.workflowName as { enum: string[] };

      expect(nameProp.enum).toContain('pre-commit');
      expect(nameProp.enum).toContain('code-review');
      expect(nameProp.enum).toContain('refactoring');
      expect(nameProp.enum).toContain('deploy');
      expect(nameProp.enum).toContain('bug-fix');
      expect(nameProp.enum).toContain('feature-development');
      expect(nameProp.enum).toContain('security-audit');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      SUGGEST WORKFLOW SCHEMA
  // ═══════════════════════════════════════════════════════════════

  describe('thinking_suggest_workflow schema', () => {
    it('should have taskDescription as required', () => {
      const tools = getThinkingTools();
      const suggestTool = tools.find(t => t.name === 'thinking_suggest_workflow');

      expect(suggestTool).toBeDefined();
      expect(suggestTool!.inputSchema.required).toContain('taskDescription');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      SAVE SNIPPET SCHEMA
  // ═══════════════════════════════════════════════════════════════

  describe('thinking_save_snippet schema', () => {
    it('should have category, description, and code as required', () => {
      const tools = getThinkingTools();
      const saveTool = tools.find(t => t.name === 'thinking_save_snippet');

      expect(saveTool).toBeDefined();
      expect(saveTool!.inputSchema.required).toContain('category');
      expect(saveTool!.inputSchema.required).toContain('description');
      expect(saveTool!.inputSchema.required).toContain('code');
    });

    it('should have optional language and tags', () => {
      const tools = getThinkingTools();
      const saveTool = tools.find(t => t.name === 'thinking_save_snippet');

      expect(saveTool!.inputSchema.properties).toHaveProperty('language');
      expect(saveTool!.inputSchema.properties).toHaveProperty('tags');
      expect(saveTool!.inputSchema.required).not.toContain('language');
      expect(saveTool!.inputSchema.required).not.toContain('tags');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      GET STYLE SCHEMA
  // ═══════════════════════════════════════════════════════════════

  describe('thinking_get_style schema', () => {
    it('should have category as required', () => {
      const tools = getThinkingTools();
      const styleTool = tools.find(t => t.name === 'thinking_get_style');

      expect(styleTool).toBeDefined();
      expect(styleTool!.inputSchema.required).toContain('category');
    });

    it('should have optional limit', () => {
      const tools = getThinkingTools();
      const styleTool = tools.find(t => t.name === 'thinking_get_style');

      expect(styleTool!.inputSchema.properties).toHaveProperty('limit');
      expect(styleTool!.inputSchema.required).not.toContain('limit');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      LIST/STATUS TOOLS
  // ═══════════════════════════════════════════════════════════════

  describe('list and status tools', () => {
    it('should have no required fields for list_models', () => {
      const tools = getThinkingTools();
      const listTool = tools.find(t => t.name === 'thinking_list_models');

      expect(listTool).toBeDefined();
      expect(Object.keys(listTool!.inputSchema.properties)).toHaveLength(0);
    });

    it('should have no required fields for list_workflows', () => {
      const tools = getThinkingTools();
      const listTool = tools.find(t => t.name === 'thinking_list_workflows');

      expect(listTool).toBeDefined();
      expect(Object.keys(listTool!.inputSchema.properties)).toHaveLength(0);
    });

    it('should have no required fields for list_snippets', () => {
      const tools = getThinkingTools();
      const listTool = tools.find(t => t.name === 'thinking_list_snippets');

      expect(listTool).toBeDefined();
      expect(Object.keys(listTool!.inputSchema.properties)).toHaveLength(0);
    });

    it('should have no required fields for status', () => {
      const tools = getThinkingTools();
      const statusTool = tools.find(t => t.name === 'thinking_status');

      expect(statusTool).toBeDefined();
      expect(Object.keys(statusTool!.inputSchema.properties)).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      TOOL COUNT
  // ═══════════════════════════════════════════════════════════════

  describe('tool count', () => {
    it('should have exactly 10 tools', () => {
      const tools = getThinkingTools();

      expect(tools.length).toBe(10);
    });
  });
});
