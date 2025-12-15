// tests/unit/testing-tools.test.ts

// Using vitest globals
import { getTestingTools } from '../../src/modules/testing/testing.tools.js';

describe('testing.tools', () => {
  describe('getTestingTools', () => {
    it('should return an array of tool definitions', () => {
      const tools = getTestingTools();

      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
    });

    it('should include all required testing tools', () => {
      const tools = getTestingTools();
      const toolNames = tools.map(t => t.name);

      expect(toolNames).toContain('testing_run');
      expect(toolNames).toContain('testing_run_affected');
      expect(toolNames).toContain('testing_browser_open');
      expect(toolNames).toContain('testing_browser_screenshot');
      expect(toolNames).toContain('testing_browser_logs');
      expect(toolNames).toContain('testing_browser_network');
      expect(toolNames).toContain('testing_browser_errors');
      expect(toolNames).toContain('testing_browser_analysis');
      expect(toolNames).toContain('testing_browser_close');
      expect(toolNames).toContain('testing_cleanup');
      expect(toolNames).toContain('testing_status');
    });

    it('should have valid inputSchema structure for all tools', () => {
      const tools = getTestingTools();

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

    it('should have correct properties for testing_run', () => {
      const tools = getTestingTools();
      const runTool = tools.find(t => t.name === 'testing_run');

      expect(runTool).toBeDefined();
      expect(runTool!.inputSchema.required).toEqual([]);
      expect(runTool!.inputSchema.properties).toHaveProperty('files');
      expect(runTool!.inputSchema.properties).toHaveProperty('grep');
      expect(runTool!.inputSchema.properties).toHaveProperty('coverage');
      expect(runTool!.inputSchema.properties).toHaveProperty('timeout');
    });

    it('should have files as required for run_affected', () => {
      const tools = getTestingTools();
      const affectedTool = tools.find(t => t.name === 'testing_run_affected');

      expect(affectedTool).toBeDefined();
      expect(affectedTool!.inputSchema.required).toContain('files');
    });

    it('should have url as required for browser_open', () => {
      const tools = getTestingTools();
      const openTool = tools.find(t => t.name === 'testing_browser_open');

      expect(openTool).toBeDefined();
      expect(openTool!.inputSchema.required).toContain('url');
    });

    it('should have sessionId as required for browser operations', () => {
      const tools = getTestingTools();
      const browserTools = [
        'testing_browser_screenshot',
        'testing_browser_logs',
        'testing_browser_network',
        'testing_browser_errors',
        'testing_browser_analysis',
        'testing_browser_close',
      ];

      browserTools.forEach(toolName => {
        const tool = tools.find(t => t.name === toolName);
        expect(tool).toBeDefined();
        expect(tool!.inputSchema.required).toContain('sessionId');
      });
    });

    it('should have no required fields for status tools', () => {
      const tools = getTestingTools();
      const statusTools = ['testing_cleanup', 'testing_status'];

      statusTools.forEach(toolName => {
        const tool = tools.find(t => t.name === toolName);
        expect(tool).toBeDefined();
        expect(tool!.inputSchema.required).toEqual([]);
      });
    });

    it('should have screenshot options in browser_screenshot', () => {
      const tools = getTestingTools();
      const screenshotTool = tools.find(t => t.name === 'testing_browser_screenshot');

      expect(screenshotTool).toBeDefined();
      expect(screenshotTool!.inputSchema.properties).toHaveProperty('selector');
      expect(screenshotTool!.inputSchema.properties).toHaveProperty('fullPage');
    });
  });
});
