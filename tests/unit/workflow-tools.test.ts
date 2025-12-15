// tests/unit/workflow-tools.test.ts

// Using vitest globals
import { getWorkflowTools } from '../../src/modules/workflow/workflow.tools.js';

describe('workflow.tools', () => {
  describe('getWorkflowTools', () => {
    it('should return an array of tool definitions', () => {
      const tools = getWorkflowTools();

      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
    });

    it('should include all required workflow tools', () => {
      const tools = getWorkflowTools();
      const toolNames = tools.map(t => t.name);

      expect(toolNames).toContain('workflow_task_create');
      expect(toolNames).toContain('workflow_task_start');
      expect(toolNames).toContain('workflow_task_update');
      expect(toolNames).toContain('workflow_task_complete');
      expect(toolNames).toContain('workflow_task_pause');
      expect(toolNames).toContain('workflow_task_fail');
      expect(toolNames).toContain('workflow_task_note');
      expect(toolNames).toContain('workflow_task_list');
      expect(toolNames).toContain('workflow_current');
      expect(toolNames).toContain('workflow_status');
      expect(toolNames).toContain('workflow_task_delete');
      expect(toolNames).toContain('workflow_cleanup');
    });

    it('should have valid inputSchema structure for all tools', () => {
      const tools = getWorkflowTools();

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

    it('should have correct required fields for task_create', () => {
      const tools = getWorkflowTools();
      const createTool = tools.find(t => t.name === 'workflow_task_create');

      expect(createTool).toBeDefined();
      expect(createTool!.inputSchema.required).toContain('name');
      expect(createTool!.inputSchema.properties).toHaveProperty('name');
      expect(createTool!.inputSchema.properties).toHaveProperty('description');
      expect(createTool!.inputSchema.properties).toHaveProperty('priority');
    });

    it('should have taskId as required for task operations', () => {
      const tools = getWorkflowTools();
      const taskIdTools = ['workflow_task_start', 'workflow_task_update',
                          'workflow_task_complete', 'workflow_task_pause',
                          'workflow_task_fail', 'workflow_task_delete'];

      taskIdTools.forEach(toolName => {
        const tool = tools.find(t => t.name === toolName);
        expect(tool).toBeDefined();
        expect(tool!.inputSchema.required).toContain('taskId');
      });
    });

    it('should have no required fields for status tools', () => {
      const tools = getWorkflowTools();
      const statusTools = ['workflow_current', 'workflow_status', 'workflow_task_list'];

      statusTools.forEach(toolName => {
        const tool = tools.find(t => t.name === toolName);
        expect(tool).toBeDefined();
        expect(tool!.inputSchema.required).toEqual([]);
      });
    });

    it('should include priority enum in task_create', () => {
      const tools = getWorkflowTools();
      const createTool = tools.find(t => t.name === 'workflow_task_create');
      const priorityProp = createTool!.inputSchema.properties.priority as { enum: string[] };

      expect(priorityProp.enum).toContain('low');
      expect(priorityProp.enum).toContain('medium');
      expect(priorityProp.enum).toContain('high');
      expect(priorityProp.enum).toContain('critical');
    });

    it('should include status enum in task_update', () => {
      const tools = getWorkflowTools();
      const updateTool = tools.find(t => t.name === 'workflow_task_update');
      const statusProp = updateTool!.inputSchema.properties.status as { enum: string[] };

      expect(statusProp.enum).toContain('pending');
      expect(statusProp.enum).toContain('in_progress');
      expect(statusProp.enum).toContain('completed');
      expect(statusProp.enum).toContain('failed');
    });
  });
});
