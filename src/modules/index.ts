// src/modules/index.ts

/**
 * CCG Modules Index
 *
 * This file exports all feature modules for the Claude Code Guardian.
 * Modules are initialized by the MCP server and provide tools for Claude.
 */

// ═══════════════════════════════════════════════════════════════
//                      MODULE EXPORTS
// ═══════════════════════════════════════════════════════════════

// Memory Module - Persistent memory for facts, decisions, patterns
export { MemoryModule, MemoryService } from './memory/index.js';
export type {
  Memory,
  MemoryType,
  MemoryModuleConfig,
  StoreMemoryParams,
  RecallMemoryParams,
  MemorySummary,
  MemoryModuleStatus,
} from './memory/index.js';

// Guard Module - Code validation and honesty checking
export { GuardModule, GuardService } from './guard/index.js';
export type {
  ValidationResult,
  ValidationIssue,
  GuardModuleConfig,
  IGuardRule,
  RuleCategory,
  GuardModuleStatus,
} from './guard/index.js';

// Process Module - Port and process management
export { ProcessModule, ProcessService } from './process/index.js';
export type {
  ProcessInfo,
  ProcessStatus,
  PortStatus,
  ProcessModuleConfig,
  SpawnParams,
  SpawnResult,
  KillResult,
  ProcessModuleStatus,
  CleanupResult,
} from './process/index.js';

// Resource Module - Token and checkpoint management (TODO: Task 4.1)
// export { ResourceModule, ResourceService } from './resource/index.js';

// Workflow Module - Task and progress tracking (TODO: Task 4.2)
// export { WorkflowModule, WorkflowService } from './workflow/index.js';

// Testing Module - Test runner and browser automation (TODO: Task 4.3)
// export { TestingModule, TestingService } from './testing/index.js';

// Documents Module - Document registry and management (TODO: Task 4.4)
// export { DocumentsModule, DocumentsService } from './documents/index.js';

// ═══════════════════════════════════════════════════════════════
//                      MODULE INTERFACE
// ═══════════════════════════════════════════════════════════════

/**
 * Base interface for all CCG modules
 */
export interface ICCGModule {
  /**
   * Initialize the module
   */
  initialize(): Promise<void>;

  /**
   * Shutdown the module
   */
  shutdown(): Promise<void>;

  /**
   * Get MCP tool definitions
   */
  getTools(): Array<{
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
  }>;

  /**
   * Handle MCP tool call
   */
  handleTool(toolName: string, args: Record<string, unknown>): Promise<unknown>;

  /**
   * Get module status
   */
  getStatus(): Record<string, unknown>;
}
