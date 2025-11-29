// src/modules/process/process.service.ts

import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { platform } from 'os';
import {
  ProcessInfo,
  PortStatus,
  ProcessModuleConfig,
  ProcessStatus,
} from '../../core/types.js';
import { EventBus } from '../../core/event-bus.js';
import { Logger } from '../../core/logger.js';
import {
  SpawnParams,
  SpawnResult,
  KillResult,
  ProcessModuleStatus,
  CleanupResult,
  PortInfo,
} from './process.types.js';

const execAsync = promisify(exec);

// ═══════════════════════════════════════════════════════════════
//                      PROCESS SERVICE
// ═══════════════════════════════════════════════════════════════

export class ProcessService {
  private spawnedProcesses: Map<number, ProcessInfo> = new Map();
  private isWindows: boolean;

  constructor(
    private config: ProcessModuleConfig,
    private eventBus: EventBus,
    private logger: Logger
  ) {
    this.isWindows = platform() === 'win32';
  }

  /**
   * Initialize the process service
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) return;

    // Check configured ports on startup
    for (const [name, port] of Object.entries(this.config.ports)) {
      const status = await this.checkPort(port);
      if (!status.available) {
        this.logger.warn(`Port ${port} (${name}) is already in use by PID ${status.usedBy?.pid}`);
      }
    }

    this.logger.info('Process module initialized');
  }

  /**
   * Shutdown the process service
   */
  async shutdown(): Promise<void> {
    // Cleanup spawned processes on shutdown
    if (this.config.trackSpawnedProcesses) {
      await this.cleanupSpawned();
    }
    this.logger.info('Process module shutdown');
  }

  // ═══════════════════════════════════════════════════════════════
  //                      PORT OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Check if a port is available
   */
  async checkPort(port: number): Promise<PortStatus> {
    try {
      const pid = await this.findProcessOnPort(port);

      if (pid === null) {
        return { port, available: true };
      }

      const processInfo = await this.getProcessInfo(pid);
      processInfo.port = port;

      return {
        port,
        available: false,
        usedBy: processInfo,
      };
    } catch (error) {
      this.logger.error(`Error checking port ${port}:`, error);
      return { port, available: true }; // Assume available if check fails
    }
  }

  /**
   * Check all configured ports
   */
  async checkAllPorts(): Promise<PortInfo[]> {
    const results: PortInfo[] = [];

    for (const [name, port] of Object.entries(this.config.ports)) {
      const status = await this.checkPort(port);
      results.push({
        port,
        name,
        available: status.available,
        pid: status.usedBy?.pid,
        processName: status.usedBy?.name,
      });
    }

    return results;
  }

  /**
   * Find process using a specific port
   */
  private async findProcessOnPort(port: number): Promise<number | null> {
    try {
      if (this.isWindows) {
        // Windows: use netstat
        const { stdout } = await execAsync(
          `netstat -ano | findstr :${port} | findstr LISTENING`,
          { timeout: 5000 }
        );

        const lines = stdout.trim().split('\n').filter(Boolean);
        if (lines.length === 0) return null;

        // Parse PID from last column
        const parts = lines[0].trim().split(/\s+/);
        const pid = parseInt(parts[parts.length - 1], 10);
        return isNaN(pid) ? null : pid;
      } else {
        // Unix: use lsof
        const { stdout } = await execAsync(
          `lsof -i :${port} -t 2>/dev/null || true`,
          { timeout: 5000 }
        );

        const pids = stdout.trim().split('\n').filter(Boolean);
        if (pids.length === 0) return null;

        return parseInt(pids[0], 10);
      }
    } catch (error) {
      // Command failed, port is likely free
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //                      KILL OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Kill process on a specific port
   */
  async killProcessOnPort(port: number, force: boolean = false): Promise<KillResult> {
    const status = await this.checkPort(port);

    if (status.available) {
      return {
        success: true,
        killed: false,
        message: `Port ${port} is already free`,
      };
    }

    const pid = status.usedBy?.pid;
    if (!pid) {
      return {
        success: false,
        killed: false,
        message: `Could not determine PID for process on port ${port}`,
      };
    }

    return this.killProcess(pid, force);
  }

  /**
   * Kill a process by PID
   */
  async killProcess(pid: number, force: boolean = false): Promise<KillResult> {
    try {
      if (this.isWindows) {
        const forceFlag = force ? '/F' : '';
        await execAsync(`taskkill ${forceFlag} /PID ${pid}`, { timeout: 5000 });
      } else {
        const signal = force ? '-9' : '-15';
        await execAsync(`kill ${signal} ${pid}`, { timeout: 5000 });
      }

      // Remove from tracked if it was ours
      this.spawnedProcesses.delete(pid);

      this.logger.info(`Killed process ${pid}${force ? ' (forced)' : ''}`);

      return {
        success: true,
        killed: true,
        pid,
        message: `Process ${pid} killed successfully`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error killing process ${pid}:`, error);

      return {
        success: false,
        killed: false,
        pid,
        message: `Failed to kill process ${pid}: ${message}`,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //                      SPAWN OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Spawn a new process
   */
  async spawnProcess(params: SpawnParams): Promise<SpawnResult> {
    const { command, args = [], port, name, cwd, env } = params;

    // If port specified and in use, handle conflict
    if (port && this.config.autoKillOnConflict) {
      const status = await this.checkPort(port);
      if (!status.available) {
        this.logger.info(`Port ${port} in use by PID ${status.usedBy?.pid}, killing existing process`);
        const killResult = await this.killProcessOnPort(port, true);
        if (!killResult.killed) {
          return {
            success: false,
            message: `Failed to free port ${port}: ${killResult.message}`,
          };
        }
        // Wait a moment for port to be released
        await this.sleep(500);
      }
    }

    try {
      const child = spawn(command, args, {
        cwd,
        env: env ? { ...process.env, ...env } : undefined,
        detached: !this.isWindows, // detached doesn't work well on Windows
        stdio: 'ignore',
        shell: this.isWindows,
      });

      if (!this.isWindows) {
        child.unref();
      }

      const processInfo: ProcessInfo = {
        pid: child.pid!,
        name: name || command,
        port,
        command: `${command} ${args.join(' ')}`.trim(),
        startedAt: new Date(),
        status: 'running',
        spawnedBy: 'ccg',
      };

      if (this.config.trackSpawnedProcesses) {
        this.spawnedProcesses.set(child.pid!, processInfo);
      }

      this.logger.info(`Spawned process ${processInfo.pid}: ${processInfo.command}`);

      return {
        success: true,
        pid: child.pid!,
        name: processInfo.name,
        port,
        message: `Process started with PID ${child.pid}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error spawning process:`, error);

      return {
        success: false,
        message: `Failed to spawn process: ${message}`,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //                      CLEANUP OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Cleanup all spawned processes
   */
  async cleanupSpawned(): Promise<CleanupResult> {
    const pids: number[] = [];
    let cleaned = 0;

    for (const [pid, info] of this.spawnedProcesses.entries()) {
      const isRunning = await this.isProcessRunning(pid);
      if (isRunning) {
        const result = await this.killProcess(pid, true);
        if (result.killed) {
          cleaned++;
          pids.push(pid);
          this.logger.info(`Cleaned up process ${pid}: ${info.name}`);
        }
      }
    }

    this.spawnedProcesses.clear();

    return {
      success: true,
      cleaned,
      pids,
      message: cleaned > 0
        ? `Cleaned up ${cleaned} process(es)`
        : 'No processes to clean up',
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //                      QUERY OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get all running processes (tracked + configured ports)
   */
  async getRunningProcesses(): Promise<ProcessInfo[]> {
    const processes: ProcessInfo[] = [];
    const seenPids = new Set<number>();

    // Check tracked processes
    for (const [pid, info] of this.spawnedProcesses.entries()) {
      const isRunning = await this.isProcessRunning(pid);
      if (isRunning) {
        processes.push({ ...info, status: 'running' });
        seenPids.add(pid);
      } else {
        // Process died, update status
        info.status = 'stopped';
        this.spawnedProcesses.delete(pid);
      }
    }

    // Check configured ports
    for (const [name, port] of Object.entries(this.config.ports)) {
      const status = await this.checkPort(port);
      if (!status.available && status.usedBy) {
        // Only add if not already tracked
        if (!seenPids.has(status.usedBy.pid)) {
          processes.push(status.usedBy);
        }
      }
    }

    return processes;
  }

  /**
   * Get module status
   */
  async getStatus(): Promise<ProcessModuleStatus> {
    const portInfos = await this.checkAllPorts();

    return {
      enabled: this.config.enabled,
      trackedProcesses: this.spawnedProcesses.size,
      configuredPorts: this.config.ports,
      runningOnPorts: portInfos.filter(p => !p.available),
    };
  }

  /**
   * Get a simple status (sync version for quick access)
   */
  getSimpleStatus(): { tracked: number; ports: Record<string, number> } {
    return {
      tracked: this.spawnedProcesses.size,
      ports: this.config.ports,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //                      HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get information about a process by PID
   */
  private async getProcessInfo(pid: number): Promise<ProcessInfo> {
    const tracked = this.spawnedProcesses.get(pid);

    if (tracked) {
      return tracked;
    }

    try {
      let name = 'unknown';
      let command = 'unknown';

      if (this.isWindows) {
        try {
          const { stdout } = await execAsync(
            `wmic process where processid=${pid} get name,commandline /format:list`,
            { timeout: 5000 }
          );
          const lines = stdout.split('\n').filter(l => l.trim());
          for (const line of lines) {
            if (line.startsWith('Name=')) {
              name = line.replace('Name=', '').trim();
            }
            if (line.startsWith('CommandLine=')) {
              command = line.replace('CommandLine=', '').trim();
            }
          }
        } catch {
          // Ignore errors
        }
      } else {
        try {
          const { stdout: cmdOutput } = await execAsync(
            `ps -p ${pid} -o comm= 2>/dev/null || echo unknown`,
            { timeout: 5000 }
          );
          name = cmdOutput.trim();

          const { stdout: argsOutput } = await execAsync(
            `ps -p ${pid} -o args= 2>/dev/null || echo unknown`,
            { timeout: 5000 }
          );
          command = argsOutput.trim();
        } catch {
          // Ignore errors
        }
      }

      return {
        pid,
        name,
        command,
        startedAt: new Date(),
        status: 'running',
        spawnedBy: 'unknown',
      };
    } catch (error) {
      return {
        pid,
        name: 'unknown',
        command: 'unknown',
        startedAt: new Date(),
        status: 'running',
        spawnedBy: 'unknown',
      };
    }
  }

  /**
   * Check if a process is still running
   */
  private async isProcessRunning(pid: number): Promise<boolean> {
    try {
      if (this.isWindows) {
        const { stdout } = await execAsync(
          `tasklist /FI "PID eq ${pid}" /NH`,
          { timeout: 5000 }
        );
        return !stdout.includes('No tasks');
      } else {
        await execAsync(`ps -p ${pid} -o pid= 2>/dev/null`, { timeout: 5000 });
        return true;
      }
    } catch {
      return false;
    }
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
