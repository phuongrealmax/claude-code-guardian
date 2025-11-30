// src/modules/commands/commands.types.ts

/**
 * Slash Commands Module Types
 *
 * Defines types for slash command management following Enterprise Toolkit patterns.
 */

// ═══════════════════════════════════════════════════════════════
//                      COMMAND DEFINITION TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Command category
 */
export type CommandCategory =
  | 'base'          // Universal commands for all projects
  | 'erp'           // ERP-specific commands
  | 'trading'       // Trading-specific commands
  | 'orchestration' // Orchestration-specific commands
  | 'frontend'      // Frontend-specific commands
  | 'backend'       // Backend-specific commands
  | 'custom';       // User-defined commands

/**
 * Command argument definition
 */
export interface CommandArgument {
  /** Argument name */
  name: string;

  /** Description */
  description: string;

  /** Whether argument is required */
  required: boolean;

  /** Default value */
  default?: string;

  /** Argument type */
  type: 'string' | 'number' | 'boolean' | 'file' | 'choice';

  /** Valid choices (if type is 'choice') */
  choices?: string[];

  /** Validation pattern (regex) */
  pattern?: string;
}

/**
 * Slash command definition
 */
export interface SlashCommand {
  /** Command name (e.g., 'add-endpoint') */
  name: string;

  /** Command description */
  description: string;

  /** Command category */
  category: CommandCategory;

  /** Command arguments */
  arguments: CommandArgument[];

  /** Command prompt template */
  prompt: string;

  /** Required files/context */
  requiredContext?: string[];

  /** Applicable stacks */
  stacks?: string[];

  /** Whether command is enabled */
  enabled: boolean;

  /** Source file path */
  sourcePath?: string;

  /** Version */
  version?: string;
}

/**
 * Parsed command invocation
 */
export interface CommandInvocation {
  /** Command name */
  command: string;

  /** Parsed arguments */
  args: Record<string, string | number | boolean>;

  /** Raw argument string */
  rawArgs: string;

  /** Missing required arguments */
  missingArgs: string[];

  /** Validation errors */
  errors: string[];
}

/**
 * Command execution result
 */
export interface CommandResult {
  /** Whether execution was successful */
  success: boolean;

  /** Expanded prompt */
  prompt: string;

  /** Warnings */
  warnings: string[];

  /** Command metadata */
  metadata: {
    command: string;
    category: CommandCategory;
    args: Record<string, unknown>;
    executedAt: Date;
  };
}

// ═══════════════════════════════════════════════════════════════
//                      MODULE CONFIGURATION
// ═══════════════════════════════════════════════════════════════

/**
 * Commands module configuration
 */
export interface CommandsModuleConfig {
  /** Whether module is enabled */
  enabled: boolean;

  /** Directory for custom commands */
  commandsDir: string;

  /** Auto-detect project stack */
  autoDetectStack: boolean;

  /** Enable base commands */
  enableBaseCommands: boolean;

  /** Enabled domain categories */
  enabledCategories: CommandCategory[];
}

/**
 * Module status
 */
export interface CommandsModuleStatus {
  /** Whether module is enabled */
  enabled: boolean;

  /** Total commands */
  totalCommands: number;

  /** Commands by category */
  byCategory: Record<CommandCategory, number>;

  /** Detected stack */
  detectedStack?: string;

  /** Commands directory */
  commandsDir: string;
}

// ═══════════════════════════════════════════════════════════════
//                      COMMAND TEMPLATES
// ═══════════════════════════════════════════════════════════════

/**
 * Command template for generation
 */
export interface CommandTemplate {
  /** Template name */
  name: string;

  /** Template category */
  category: CommandCategory;

  /** File content template */
  content: string;

  /** Variables to replace */
  variables: string[];

  /** Target filename pattern */
  filenamePattern: string;
}
