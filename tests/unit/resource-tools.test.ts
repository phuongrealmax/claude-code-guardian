// tests/unit/resource-tools.test.ts

// Using vitest globals
import { getResourceTools } from '../../src/modules/resource/resource.tools.js';

describe('resource.tools', () => {
  describe('getResourceTools', () => {
    it('should return an array of tool definitions', () => {
      const tools = getResourceTools();

      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
    });

    it('should include all required resource tools', () => {
      const tools = getResourceTools();
      const toolNames = tools.map(t => t.name);

      expect(toolNames).toContain('resource_status');
      expect(toolNames).toContain('resource_update_tokens');
      expect(toolNames).toContain('resource_estimate_task');
      expect(toolNames).toContain('resource_checkpoint_create');
      expect(toolNames).toContain('resource_checkpoint_list');
      expect(toolNames).toContain('resource_checkpoint_restore');
      expect(toolNames).toContain('resource_checkpoint_delete');
      expect(toolNames).toContain('resource_governor_state');
      expect(toolNames).toContain('resource_action_allowed');
    });

    it('should have valid inputSchema structure for all tools', () => {
      const tools = getResourceTools();

      tools.forEach(tool => {
        expect(tool.name).toBeDefined();
        expect(typeof tool.name).toBe('string');
        expect(tool.description).toBeDefined();
        expect(typeof tool.description).toBe('string');
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
        expect(Array.isArray(tool.inputSchema.required)).toBe(true);
      });
    });

    it('should have correct required fields for update_tokens', () => {
      const tools = getResourceTools();
      const updateTool = tools.find(t => t.name === 'resource_update_tokens');

      expect(updateTool).toBeDefined();
      expect(updateTool!.inputSchema.required).toContain('used');
      expect(updateTool!.inputSchema.properties).toHaveProperty('used');
      expect(updateTool!.inputSchema.properties).toHaveProperty('estimated');
    });

    it('should have correct required fields for estimate_task', () => {
      const tools = getResourceTools();
      const estimateTool = tools.find(t => t.name === 'resource_estimate_task');

      expect(estimateTool).toBeDefined();
      expect(estimateTool!.inputSchema.required).toContain('description');
      expect(estimateTool!.inputSchema.properties).toHaveProperty('filesCount');
      expect(estimateTool!.inputSchema.properties).toHaveProperty('linesEstimate');
      expect(estimateTool!.inputSchema.properties).toHaveProperty('hasTests');
      expect(estimateTool!.inputSchema.properties).toHaveProperty('hasBrowserTesting');
    });

    it('should have checkpointId as required for checkpoint operations', () => {
      const tools = getResourceTools();
      const checkpointTools = ['resource_checkpoint_restore', 'resource_checkpoint_delete'];

      checkpointTools.forEach(toolName => {
        const tool = tools.find(t => t.name === toolName);
        expect(tool).toBeDefined();
        expect(tool!.inputSchema.required).toContain('checkpointId');
      });
    });

    it('should have no required fields for status tools', () => {
      const tools = getResourceTools();
      const statusTools = ['resource_status', 'resource_checkpoint_list', 'resource_governor_state'];

      statusTools.forEach(toolName => {
        const tool = tools.find(t => t.name === toolName);
        expect(tool).toBeDefined();
        expect(tool!.inputSchema.required).toEqual([]);
      });
    });

    it('should have action as required for action_allowed', () => {
      const tools = getResourceTools();
      const actionTool = tools.find(t => t.name === 'resource_action_allowed');

      expect(actionTool).toBeDefined();
      expect(actionTool!.inputSchema.required).toContain('action');
    });

    it('should include reason enum in checkpoint_create', () => {
      const tools = getResourceTools();
      const createTool = tools.find(t => t.name === 'resource_checkpoint_create');
      const reasonProp = createTool!.inputSchema.properties.reason as { enum: string[] };

      expect(reasonProp.enum).toContain('manual');
      expect(reasonProp.enum).toContain('before_risky_operation');
      expect(reasonProp.enum).toContain('task_complete');
    });
  });
});
