// src/modules/process/process.types.ts

// Re-export core types
export {
  ProcessInfo,
  ProcessStatus,
  PortStatus,
  ProcessModuleConfig,
} from '../../core/types.js';

// ═══════════════════════════════════════════════════════════════
//                      PROCESS MODULE TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Parameters for spawning a new process
 */
export interface SpawnParams {
  /** Command to execute */
  command: string;

  /** Command arguments */
  args?: string[];

  /** Port the process will use (for auto-kill on conflict) */
  port?: number;

  /** Human-readable name for the process */
  name?: string;

  /** Working directory */
  cwd?: string;

  /** Environment variables */
  env?: Record<string, string>;
}

/**
 * Result of spawning a process
 */
export interface SpawnResult {
  success: boolean;
  pid?: number;
  name?: string;
  port?: number;
  message: string;
}

/**
 * Result of killing a process
 */
export interface KillResult {
  success: boolean;
  killed: boolean;
  pid?: number;
  message: string;
}

/**
 * Process module status
 */
export interface ProcessModuleStatus {
  enabled: boolean;
  trackedProcesses: number;
  configuredPorts: Record<string, number>;
  runningOnPorts: PortInfo[];
}

/**
 * Port information with process details
 */
export interface PortInfo {
  port: number;
  name: string;
  available: boolean;
  pid?: number;
  processName?: string;
}

/**
 * Parameters for checking a port
 */
export interface CheckPortParams {
  port: number;
}

/**
 * Parameters for killing by port
 */
export interface KillByPortParams {
  port: number;
  force?: boolean;
}

/**
 * Parameters for killing by PID
 */
export interface KillByPidParams {
  pid: number;
  force?: boolean;
}

/**
 * Result of cleanup operation
 */
export interface CleanupResult {
  success: boolean;
  cleaned: number;
  pids: number[];
  message: string;
}

/**
 * Health check result for a port
 */
export interface PortHealthCheck {
  port: number;
  name: string;
  healthy: boolean;
  responseTime?: number;
  error?: string;
}
