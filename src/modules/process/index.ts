// src/modules/process/index.ts

import { ProcessModuleConfig } from '../../core/types.js';
import { EventBus } from '../../core/event-bus.js';
import { Logger } from '../../core/logger.js';
import { ProcessService } from './process.service.js';
import {
  getProcessTools,
  formatPortStatus,
  formatAllPortsStatus,
  formatProcessList,
  formatCleanupResult,
  formatModuleStatus,
  MCPTool,
} from './process.tools.js';
import {
  ProcessModuleStatus,
  SpawnParams,
  SpawnResult,
  KillResult,
  CleanupResult,
} from './process.types.js';

// ═══════════════════════════════════════════════════════════════
//                      PROCESS MODULE CLASS
// ═══════════════════════════════════════════════════════════════

export class ProcessModule {
  private service: ProcessService;
  private logger: Logger;

  constructor(
    private config: ProcessModuleConfig,
    private eventBus: EventBus,
    parentLogger: Logger
  ) {
    this.logger = parentLogger.child('Process');
    this.service = new ProcessService(config, eventBus, this.logger);
  }

  /**
   * Initialize the module
   */
  async initialize(): Promise<void> {
    await this.service.initialize();
  }

  /**
   * Shutdown the module
   */
  async shutdown(): Promise<void> {
    await this.service.shutdown();
  }

  /**
   * Get MCP tool definitions
   */
  getTools(): MCPTool[] {
    if (!this.config.enabled) {
      return [];
    }
    return getProcessTools();
  }

  /**
   * Handle MCP tool call
   */
  async handleTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    if (!this.config.enabled) {
      return { error: 'Process module is disabled' };
    }

    switch (toolName) {
      case 'check_port':
        return this.handleCheckPort(args);

      case 'check_all_ports':
        return this.handleCheckAllPorts();

      case 'kill_on_port':
        return this.handleKillOnPort(args);

      case 'kill':
        return this.handleKill(args);

      case 'spawn':
        return this.handleSpawn(args);

      case 'list':
        return this.handleList();

      case 'cleanup':
        return this.handleCleanup();

      case 'status':
        return this.handleStatus();

      default:
        throw new Error(`Unknown process tool: ${toolName}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //                      TOOL HANDLERS
  // ═══════════════════════════════════════════════════════════════

  private async handleCheckPort(args: Record<string, unknown>): Promise<unknown> {
    const port = args.port as number;

    if (!port || port < 1 || port > 65535) {
      return {
        success: false,
        error: 'Invalid port number. Must be between 1 and 65535.',
      };
    }

    const status = await this.service.checkPort(port);

    return {
      success: true,
      port,
      available: status.available,
      usedBy: status.usedBy
        ? {
            pid: status.usedBy.pid,
            name: status.usedBy.name,
            command: status.usedBy.command,
          }
        : null,
      formatted: formatPortStatus(status),
    };
  }

  private async handleCheckAllPorts(): Promise<unknown> {
    const ports = await this.service.checkAllPorts();

    return {
      success: true,
      ports,
      formatted: formatAllPortsStatus(ports),
    };
  }

  private async handleKillOnPort(args: Record<string, unknown>): Promise<unknown> {
    const port = args.port as number;
    const force = (args.force as boolean) ?? false;

    if (!port || port < 1 || port > 65535) {
      return {
        success: false,
        error: 'Invalid port number. Must be between 1 and 65535.',
      };
    }

    const result = await this.service.killProcessOnPort(port, force);

    return {
      ...result,
      port,
    };
  }

  private async handleKill(args: Record<string, unknown>): Promise<unknown> {
    const pid = args.pid as number;
    const force = (args.force as boolean) ?? false;

    if (!pid || pid < 1) {
      return {
        success: false,
        error: 'Invalid PID',
      };
    }

    return this.service.killProcess(pid, force);
  }

  private async handleSpawn(args: Record<string, unknown>): Promise<unknown> {
    const params: SpawnParams = {
      command: args.command as string,
      args: args.args as string[] | undefined,
      port: args.port as number | undefined,
      name: args.name as string | undefined,
      cwd: args.cwd as string | undefined,
    };

    if (!params.command) {
      return {
        success: false,
        error: 'Command is required',
      };
    }

    return this.service.spawnProcess(params);
  }

  private async handleList(): Promise<unknown> {
    const processes = await this.service.getRunningProcesses();

    return {
      success: true,
      count: processes.length,
      processes: processes.map(p => ({
        pid: p.pid,
        name: p.name,
        port: p.port,
        command: p.command,
        status: p.status,
        spawnedBy: p.spawnedBy,
        startedAt: p.startedAt.toISOString(),
      })),
      formatted: formatProcessList(processes),
    };
  }

  private async handleCleanup(): Promise<unknown> {
    const result = await this.service.cleanupSpawned();

    return {
      ...result,
      formatted: formatCleanupResult(result),
    };
  }

  private async handleStatus(): Promise<unknown> {
    const status = await this.service.getStatus();

    return {
      success: true,
      ...status,
      formatted: formatModuleStatus(status),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //                      PUBLIC SERVICE METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get module status
   */
  async getStatus(): Promise<ProcessModuleStatus> {
    return this.service.getStatus();
  }

  /**
   * Check if a port is available (direct access)
   */
  async checkPort(port: number) {
    return this.service.checkPort(port);
  }

  /**
   * Check running processes (direct access)
   */
  async checkRunningProcesses() {
    return this.service.getRunningProcesses();
  }

  /**
   * Kill process on port (direct access)
   */
  async killProcessOnPort(port: number, force?: boolean): Promise<KillResult> {
    return this.service.killProcessOnPort(port, force);
  }

  /**
   * Spawn a process (direct access)
   */
  async spawnProcess(params: SpawnParams): Promise<SpawnResult> {
    return this.service.spawnProcess(params);
  }

  /**
   * Cleanup spawned processes (direct access)
   */
  async cleanupSpawned(): Promise<CleanupResult> {
    return this.service.cleanupSpawned();
  }
}

// ═══════════════════════════════════════════════════════════════
//                      EXPORTS
// ═══════════════════════════════════════════════════════════════

export { ProcessService } from './process.service.js';
export * from './process.types.js';
export * from './process.tools.js';
