// src/modules/process/process.tools.ts

import { ProcessInfo, PortStatus } from '../../core/types.js';
import { ProcessModuleStatus, PortInfo, CleanupResult } from './process.types.js';

// ═══════════════════════════════════════════════════════════════
//                      MCP TOOL TYPE
// ═══════════════════════════════════════════════════════════════

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

// ═══════════════════════════════════════════════════════════════
//                      TOOL DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export function getProcessTools(): MCPTool[] {
  return [
    {
      name: 'process_check_port',
      description: 'Check if a port is available or get info about what is using it',
      inputSchema: {
        type: 'object',
        properties: {
          port: {
            type: 'number',
            description: 'Port number to check (1-65535)',
          },
        },
        required: ['port'],
      },
    },
    {
      name: 'process_check_all_ports',
      description: 'Check status of all configured ports',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'process_kill_on_port',
      description: 'Kill the process using a specific port',
      inputSchema: {
        type: 'object',
        properties: {
          port: {
            type: 'number',
            description: 'Port number to free',
          },
          force: {
            type: 'boolean',
            description: 'Force kill (SIGKILL on Unix, /F on Windows)',
            default: false,
          },
        },
        required: ['port'],
      },
    },
    {
      name: 'process_kill',
      description: 'Kill a process by PID',
      inputSchema: {
        type: 'object',
        properties: {
          pid: {
            type: 'number',
            description: 'Process ID to kill',
          },
          force: {
            type: 'boolean',
            description: 'Force kill (SIGKILL on Unix, /F on Windows)',
            default: false,
          },
        },
        required: ['pid'],
      },
    },
    {
      name: 'process_spawn',
      description: 'Spawn a new process (optionally with port management)',
      inputSchema: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'Command to execute',
          },
          args: {
            type: 'array',
            items: { type: 'string' },
            description: 'Command arguments',
          },
          port: {
            type: 'number',
            description: 'Port the process will use (enables auto-kill on conflict)',
          },
          name: {
            type: 'string',
            description: 'Human-readable name for the process',
          },
          cwd: {
            type: 'string',
            description: 'Working directory for the process',
          },
        },
        required: ['command'],
      },
    },
    {
      name: 'process_list',
      description: 'List all running processes (tracked + on configured ports)',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'process_cleanup',
      description: 'Kill all processes spawned by CCG in this session',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'process_status',
      description: 'Get process module status',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  ];
}

// ═══════════════════════════════════════════════════════════════
//                      FORMATTERS
// ═══════════════════════════════════════════════════════════════

/**
 * Format port status for display
 */
export function formatPortStatus(status: PortStatus): string {
  if (status.available) {
    return `Port ${status.port}: AVAILABLE`;
  }

  const process = status.usedBy;
  if (!process) {
    return `Port ${status.port}: IN USE (unknown process)`;
  }

  return [
    `Port ${status.port}: IN USE`,
    `  PID: ${process.pid}`,
    `  Name: ${process.name}`,
    `  Command: ${process.command}`,
    process.spawnedBy === 'ccg' ? '  (Spawned by CCG)' : '',
  ].filter(Boolean).join('\n');
}

/**
 * Format all ports status
 */
export function formatAllPortsStatus(ports: PortInfo[]): string {
  if (ports.length === 0) {
    return 'No configured ports';
  }

  const lines = ['Configured Ports Status:', ''];

  for (const port of ports) {
    const status = port.available ? 'FREE' : `IN USE (PID: ${port.pid})`;
    lines.push(`  ${port.name} (${port.port}): ${status}`);
  }

  const inUse = ports.filter(p => !p.available).length;
  const free = ports.filter(p => p.available).length;

  lines.push('');
  lines.push(`Summary: ${free} free, ${inUse} in use`);

  return lines.join('\n');
}

/**
 * Format process list for display
 */
export function formatProcessList(processes: ProcessInfo[]): string {
  if (processes.length === 0) {
    return 'No running processes';
  }

  const lines = ['Running Processes:', ''];

  for (const proc of processes) {
    const port = proc.port ? ` (port ${proc.port})` : '';
    const spawned = proc.spawnedBy === 'ccg' ? ' [CCG]' : '';
    lines.push(`  PID ${proc.pid}: ${proc.name}${port}${spawned}`);
    lines.push(`    Command: ${proc.command}`);
    lines.push(`    Started: ${proc.startedAt.toISOString()}`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format cleanup result
 */
export function formatCleanupResult(result: CleanupResult): string {
  if (result.cleaned === 0) {
    return 'No processes to clean up';
  }

  return [
    `Cleaned up ${result.cleaned} process(es)`,
    `PIDs: ${result.pids.join(', ')}`,
  ].join('\n');
}

/**
 * Format module status
 */
export function formatModuleStatus(status: ProcessModuleStatus): string {
  const lines = [
    'Process Module Status',
    '─'.repeat(30),
    `Enabled: ${status.enabled ? 'Yes' : 'No'}`,
    `Tracked Processes: ${status.trackedProcesses}`,
    '',
    'Configured Ports:',
  ];

  for (const [name, port] of Object.entries(status.configuredPorts)) {
    const running = status.runningOnPorts.find(p => p.port === port);
    const runningStatus = running
      ? ` - IN USE (PID: ${running.pid})`
      : ' - FREE';
    lines.push(`  ${name}: ${port}${runningStatus}`);
  }

  return lines.join('\n');
}
