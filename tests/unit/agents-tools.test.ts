// tests/unit/agents-tools.test.ts

// Using vitest globals
import {
  getAgentsTools,
  formatAgent,
  formatAgentsList,
  formatSelection,
  formatCoordination,
  formatStatus,
} from '../../src/modules/agents/agents.tools.js';
import { Agent, AgentSelection, CoordinationResult, AgentsModuleStatus } from '../../src/modules/agents/agents.types.js';

describe('agents.tools', () => {
  describe('getAgentsTools', () => {
    it('should return an array of tool definitions', () => {
      const tools = getAgentsTools();

      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
    });

    it('should include all required agent tools', () => {
      const tools = getAgentsTools();
      const toolNames = tools.map(t => t.name);

      expect(toolNames).toContain('agents_list');
      expect(toolNames).toContain('agents_get');
      expect(toolNames).toContain('agents_select');
      expect(toolNames).toContain('agents_register');
      expect(toolNames).toContain('agents_coordinate');
      expect(toolNames).toContain('agents_reload');
      expect(toolNames).toContain('agents_status');
    });

    it('should have valid inputSchema structure for all tools', () => {
      const tools = getAgentsTools();

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

    it('should have agentId as required for agents_get', () => {
      const tools = getAgentsTools();
      const getTool = tools.find(t => t.name === 'agents_get');

      expect(getTool).toBeDefined();
      expect(getTool!.inputSchema.required).toContain('agentId');
    });

    it('should have task as required for agents_select', () => {
      const tools = getAgentsTools();
      const selectTool = tools.find(t => t.name === 'agents_select');

      expect(selectTool).toBeDefined();
      expect(selectTool!.inputSchema.required).toContain('task');
    });

    it('should have required fields for agents_register', () => {
      const tools = getAgentsTools();
      const registerTool = tools.find(t => t.name === 'agents_register');

      expect(registerTool).toBeDefined();
      expect(registerTool!.inputSchema.required).toContain('id');
      expect(registerTool!.inputSchema.required).toContain('name');
      expect(registerTool!.inputSchema.required).toContain('role');
      expect(registerTool!.inputSchema.required).toContain('specializations');
      expect(registerTool!.inputSchema.required).toContain('responsibilities');
    });

    it('should have required fields for agents_coordinate', () => {
      const tools = getAgentsTools();
      const coordTool = tools.find(t => t.name === 'agents_coordinate');

      expect(coordTool).toBeDefined();
      expect(coordTool!.inputSchema.required).toContain('task');
      expect(coordTool!.inputSchema.required).toContain('agentIds');
      expect(coordTool!.inputSchema.required).toContain('mode');
    });

    it('should have mode enum in agents_coordinate', () => {
      const tools = getAgentsTools();
      const coordTool = tools.find(t => t.name === 'agents_coordinate');
      const modeProp = coordTool!.inputSchema.properties.mode as { enum: string[] };

      expect(modeProp.enum).toContain('sequential');
      expect(modeProp.enum).toContain('parallel');
      expect(modeProp.enum).toContain('review');
    });

    it('should have no required fields for agents_list', () => {
      const tools = getAgentsTools();
      const listTool = tools.find(t => t.name === 'agents_list');

      expect(listTool).toBeDefined();
      expect(listTool!.inputSchema.required || []).toEqual([]);
    });

    it('should have no required fields for agents_reload', () => {
      const tools = getAgentsTools();
      const reloadTool = tools.find(t => t.name === 'agents_reload');

      expect(reloadTool).toBeDefined();
      expect(reloadTool!.inputSchema.required || []).toEqual([]);
    });

    it('should have no required fields for agents_status', () => {
      const tools = getAgentsTools();
      const statusTool = tools.find(t => t.name === 'agents_status');

      expect(statusTool).toBeDefined();
      expect(statusTool!.inputSchema.required || []).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      formatAgent
  // ═══════════════════════════════════════════════════════════════

  describe('formatAgent', () => {
    const mockAgent: Agent = {
      id: 'test-agent',
      name: 'Test Agent',
      role: 'Testing helper',
      enabled: true,
      specializations: ['unit testing', 'integration testing'],
      responsibilities: ['write tests', 'run tests'],
      principles: ['test first', 'high coverage'],
      delegationRules: [
        { matchType: 'keyword', pattern: 'test', priority: 10 },
      ],
    };

    it('should format agent with name and ID', () => {
      const result = formatAgent(mockAgent);
      expect(result).toContain('# Test Agent');
      expect(result).toContain('ID: test-agent');
    });

    it('should show enabled/disabled status', () => {
      expect(formatAgent(mockAgent)).toContain('Status: Enabled');
      expect(formatAgent({ ...mockAgent, enabled: false })).toContain('Status: Disabled');
    });

    it('should format specializations', () => {
      const result = formatAgent(mockAgent);
      expect(result).toContain('## Specializations');
      expect(result).toContain('- unit testing');
    });

    it('should format responsibilities', () => {
      const result = formatAgent(mockAgent);
      expect(result).toContain('## Responsibilities');
      expect(result).toContain('- write tests');
    });

    it('should format principles when present', () => {
      const result = formatAgent(mockAgent);
      expect(result).toContain('## Core Principles');
      expect(result).toContain('- test first');
    });

    it('should format delegation rules', () => {
      const result = formatAgent(mockAgent);
      expect(result).toContain('## Delegation Rules');
      expect(result).toContain('[keyword]');
    });

    it('should handle agent without optional fields', () => {
      const minimalAgent = { ...mockAgent, principles: undefined, delegationRules: [] };
      const result = formatAgent(minimalAgent);
      expect(result).not.toContain('## Core Principles');
      expect(result).not.toContain('## Delegation Rules');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      formatAgentsList
  // ═══════════════════════════════════════════════════════════════

  describe('formatAgentsList', () => {
    const mockAgents: Agent[] = [
      {
        id: 'agent-1', name: 'Agent One', role: 'First', enabled: true,
        specializations: ['spec1'], responsibilities: ['resp1'], delegationRules: [],
      },
      {
        id: 'agent-2', name: 'Agent Two', role: 'Second', enabled: false,
        specializations: ['spec2'], responsibilities: ['resp2'], delegationRules: [],
      },
    ];

    it('should return message for empty list', () => {
      expect(formatAgentsList([])).toBe('No agents registered.');
    });

    it('should show active/disabled status', () => {
      const result = formatAgentsList(mockAgents);
      expect(result).toContain('[Active] Agent One');
      expect(result).toContain('[Disabled] Agent Two');
    });

    it('should include header and roles', () => {
      const result = formatAgentsList(mockAgents);
      expect(result).toContain('=== Registered Agents ===');
      expect(result).toContain('Role: First');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      formatSelection
  // ═══════════════════════════════════════════════════════════════

  describe('formatSelection', () => {
    const mockSelection: AgentSelection = {
      agent: {
        id: 'selected', name: 'Selected Agent', role: 'Does selections', enabled: true,
        specializations: [], responsibilities: [], delegationRules: [],
      },
      confidence: 0.85,
      reason: 'Best match',
      matchedRules: [{ matchType: 'keyword', pattern: 'test', priority: 5, description: 'Test rule' }],
    };

    it('should show selected agent and confidence', () => {
      const result = formatSelection(mockSelection);
      expect(result).toContain('Selected: Selected Agent');
      expect(result).toContain('Confidence: 85%');
      expect(result).toContain('Reason: Best match');
    });

    it('should show matched rules', () => {
      const result = formatSelection(mockSelection);
      expect(result).toContain('Matched Rules:');
      expect(result).toContain('Test rule');
    });

    it('should handle empty matched rules', () => {
      const noRulesSelection = { ...mockSelection, matchedRules: [] };
      expect(formatSelection(noRulesSelection)).not.toContain('Matched Rules:');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      formatCoordination
  // ═══════════════════════════════════════════════════════════════

  describe('formatCoordination', () => {
    const mockCoordination: CoordinationResult = {
      taskId: 'task-123',
      status: 'planning',
      agents: [{
        id: 'coord', name: 'Coord Agent', role: 'Coordination', enabled: true,
        specializations: [], responsibilities: [], delegationRules: [],
      }],
      plan: [
        { order: 1, agentId: 'coord', action: 'First action' },
        { order: 2, agentId: 'coord', action: 'Second action', dependsOn: [1] },
      ],
    };

    it('should show task ID and status', () => {
      const result = formatCoordination(mockCoordination);
      expect(result).toContain('Task ID: task-123');
      expect(result).toContain('Status: planning');
    });

    it('should show execution plan with dependencies', () => {
      const result = formatCoordination(mockCoordination);
      expect(result).toContain('Execution Plan:');
      expect(result).toContain('1. [coord] First action');
      expect(result).toContain('(after step 1)');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      formatStatus
  // ═══════════════════════════════════════════════════════════════

  describe('formatStatus', () => {
    const mockStatus: AgentsModuleStatus = {
      enabled: true,
      totalAgents: 5,
      activeAgents: ['agent-1', 'agent-2'],
      agentsFilePath: '/path/to/AGENTS.md',
      lastReload: new Date('2025-01-01T12:00:00Z'),
      stats: { totalDelegations: 100, delegationsByAgent: { 'agent-1': 60, 'agent-2': 40 } },
    };

    it('should show enabled status and agent counts', () => {
      const result = formatStatus(mockStatus);
      expect(result).toContain('Enabled: true');
      expect(result).toContain('Total Agents: 5');
      expect(result).toContain('Active Agents: agent-1, agent-2');
    });

    it('should show delegation statistics', () => {
      const result = formatStatus(mockStatus);
      expect(result).toContain('Total: 100');
      expect(result).toContain('agent-1: 60');
    });

    it('should handle no active agents', () => {
      const noActiveStatus = { ...mockStatus, activeAgents: [] };
      expect(formatStatus(noActiveStatus)).toContain('Active Agents: None');
    });

    it('should handle no last reload', () => {
      const noReloadStatus = { ...mockStatus, lastReload: undefined };
      expect(formatStatus(noReloadStatus)).not.toContain('Last Reload:');
    });
  });
});
