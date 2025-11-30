// src/modules/agents/agents.tools.ts

import { Agent, AgentSelection, AgentsModuleStatus, CoordinationResult } from './agents.types.js';

// ═══════════════════════════════════════════════════════════════
//                      MCP TOOL TYPE
// ═══════════════════════════════════════════════════════════════

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// ═══════════════════════════════════════════════════════════════
//                      TOOL DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export function getAgentsTools(): MCPTool[] {
  return [
    {
      name: 'agents_list',
      description: 'List all registered agents with their specializations and responsibilities.',
      inputSchema: {
        type: 'object',
        properties: {
          enabledOnly: {
            type: 'boolean',
            description: 'Only list enabled agents (default: true)',
          },
        },
      },
    },
    {
      name: 'agents_get',
      description: 'Get detailed information about a specific agent.',
      inputSchema: {
        type: 'object',
        properties: {
          agentId: {
            type: 'string',
            description: 'The agent ID (e.g., "trading-agent", "laravel-agent")',
          },
        },
        required: ['agentId'],
      },
    },
    {
      name: 'agents_select',
      description: 'Select the best agent for a given task. Returns the most suitable agent based on task description, files, and domain.',
      inputSchema: {
        type: 'object',
        properties: {
          task: {
            type: 'string',
            description: 'Description of the task to perform',
          },
          files: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional list of files involved in the task',
          },
          keywords: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional keywords to help match agents',
          },
          domain: {
            type: 'string',
            description: 'Optional domain context (e.g., "trading", "erp", "orchestration")',
          },
        },
        required: ['task'],
      },
    },
    {
      name: 'agents_register',
      description: 'Register a new specialized agent.',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Unique agent ID (e.g., "custom-agent")',
          },
          name: {
            type: 'string',
            description: 'Human-readable agent name',
          },
          role: {
            type: 'string',
            description: 'Agent role description',
          },
          specializations: {
            type: 'array',
            items: { type: 'string' },
            description: 'Areas of expertise',
          },
          responsibilities: {
            type: 'array',
            items: { type: 'string' },
            description: 'Core responsibilities',
          },
          principles: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional core principles',
          },
        },
        required: ['id', 'name', 'role', 'specializations', 'responsibilities'],
      },
    },
    {
      name: 'agents_coordinate',
      description: 'Coordinate multiple agents for a complex task requiring cross-expertise.',
      inputSchema: {
        type: 'object',
        properties: {
          task: {
            type: 'string',
            description: 'Task description',
          },
          agentIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of agent IDs to coordinate',
          },
          mode: {
            type: 'string',
            enum: ['sequential', 'parallel', 'review'],
            description: 'Coordination mode: sequential (one after another), parallel (all at once), review (first does work, others review)',
          },
        },
        required: ['task', 'agentIds', 'mode'],
      },
    },
    {
      name: 'agents_reload',
      description: 'Reload agents from AGENTS.md and agent definition files.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'agents_status',
      description: 'Get agents module status including statistics.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
  ];
}

// ═══════════════════════════════════════════════════════════════
//                      FORMATTERS
// ═══════════════════════════════════════════════════════════════

/**
 * Format agent for display
 */
export function formatAgent(agent: Agent): string {
  const lines: string[] = [];

  lines.push(`# ${agent.name}`);
  lines.push(`ID: ${agent.id}`);
  lines.push(`Role: ${agent.role}`);
  lines.push(`Status: ${agent.enabled ? 'Enabled' : 'Disabled'}`);
  lines.push('');

  if (agent.specializations.length > 0) {
    lines.push('## Specializations');
    agent.specializations.forEach(s => lines.push(`- ${s}`));
    lines.push('');
  }

  if (agent.responsibilities.length > 0) {
    lines.push('## Responsibilities');
    agent.responsibilities.forEach(r => lines.push(`- ${r}`));
    lines.push('');
  }

  if (agent.principles && agent.principles.length > 0) {
    lines.push('## Core Principles');
    agent.principles.forEach(p => lines.push(`- ${p}`));
    lines.push('');
  }

  if (agent.delegationRules.length > 0) {
    lines.push('## Delegation Rules');
    agent.delegationRules.forEach(r => {
      lines.push(`- [${r.matchType}] ${r.pattern} (priority: ${r.priority})`);
    });
  }

  return lines.join('\n');
}

/**
 * Format agents list
 */
export function formatAgentsList(agents: Agent[]): string {
  if (agents.length === 0) {
    return 'No agents registered.';
  }

  const lines: string[] = ['=== Registered Agents ===', ''];

  for (const agent of agents) {
    const status = agent.enabled ? '[Active]' : '[Disabled]';
    lines.push(`${status} ${agent.name} (${agent.id})`);
    lines.push(`   Role: ${agent.role}`);
    lines.push(`   Specializations: ${agent.specializations.slice(0, 5).join(', ')}`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format agent selection result
 */
export function formatSelection(selection: AgentSelection): string {
  const lines: string[] = [];

  lines.push('=== Agent Selection ===');
  lines.push('');
  lines.push(`Selected: ${selection.agent.name} (${selection.agent.id})`);
  lines.push(`Confidence: ${(selection.confidence * 100).toFixed(0)}%`);
  lines.push(`Reason: ${selection.reason}`);
  lines.push('');
  lines.push(`Role: ${selection.agent.role}`);
  lines.push('');

  if (selection.matchedRules.length > 0) {
    lines.push('Matched Rules:');
    selection.matchedRules.forEach(r => {
      lines.push(`  - ${r.description || r.pattern}`);
    });
  }

  return lines.join('\n');
}

/**
 * Format coordination result
 */
export function formatCoordination(result: CoordinationResult): string {
  const lines: string[] = [];

  lines.push('=== Agent Coordination Plan ===');
  lines.push('');
  lines.push(`Task ID: ${result.taskId}`);
  lines.push(`Status: ${result.status}`);
  lines.push(`Agents: ${result.agents.map(a => a.name).join(', ')}`);
  lines.push('');

  lines.push('Execution Plan:');
  for (const step of result.plan) {
    const deps = step.dependsOn ? ` (after step ${step.dependsOn.join(', ')})` : '';
    lines.push(`  ${step.order}. [${step.agentId}] ${step.action}${deps}`);
  }

  return lines.join('\n');
}

/**
 * Format module status
 */
export function formatStatus(status: AgentsModuleStatus): string {
  const lines: string[] = [];

  lines.push('=== Agents Module Status ===');
  lines.push('');
  lines.push(`Enabled: ${status.enabled}`);
  lines.push(`Total Agents: ${status.totalAgents}`);
  lines.push(`Active Agents: ${status.activeAgents.join(', ') || 'None'}`);
  lines.push(`Agents File: ${status.agentsFilePath}`);

  if (status.lastReload) {
    lines.push(`Last Reload: ${status.lastReload.toISOString()}`);
  }

  lines.push('');
  lines.push('Delegation Statistics:');
  lines.push(`  Total: ${status.stats.totalDelegations}`);

  for (const [agentId, count] of Object.entries(status.stats.delegationsByAgent)) {
    lines.push(`  ${agentId}: ${count}`);
  }

  return lines.join('\n');
}
