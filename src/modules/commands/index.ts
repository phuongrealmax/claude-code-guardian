// src/modules/commands/index.ts

/**
 * Commands Module
 *
 * Slash command management following Enterprise Toolkit patterns.
 */

import { Logger } from '../../core/logger.js';
import { CommandsService } from './commands.service.js';
import {
  CommandsModuleConfig,
  SlashCommand,
  CommandInvocation,
  CommandResult,
  CommandCategory,
  CommandTemplate,
} from './commands.types.js';

// ═══════════════════════════════════════════════════════════════
//                      COMMANDS MODULE CLASS
// ═══════════════════════════════════════════════════════════════

export class CommandsModule {
  private service: CommandsService;
  private logger: Logger;

  constructor(
    private config: CommandsModuleConfig,
    parentLogger: Logger,
    private projectRoot: string
  ) {
    this.logger = parentLogger.child('Commands');
    this.service = new CommandsService(config, this.logger, projectRoot);
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
   * Get all commands
   */
  getCommands(): SlashCommand[] {
    return this.service.getAll();
  }

  /**
   * Get command by name
   */
  getCommand(name: string): SlashCommand | undefined {
    return this.service.get(name);
  }

  /**
   * Get commands by category
   */
  getCommandsByCategory(category: CommandCategory): SlashCommand[] {
    return this.service.getByCategory(category);
  }

  /**
   * Parse command input
   */
  parseCommand(input: string): CommandInvocation {
    return this.service.parseInvocation(input);
  }

  /**
   * Execute command
   */
  executeCommand(input: string): CommandResult {
    const invocation = this.service.parseInvocation(input);
    return this.service.execute(invocation);
  }

  /**
   * Register custom command
   */
  registerCommand(command: SlashCommand): void {
    this.service.register(command);
  }

  /**
   * Generate command file from template
   */
  async generateCommand(template: CommandTemplate, values: Record<string, string>): Promise<string> {
    return this.service.generateCommandFile(template, values);
  }

  /**
   * Get module status
   */
  getStatus() {
    return this.service.getStatus();
  }
}

// ═══════════════════════════════════════════════════════════════
//                      EXPORTS
// ═══════════════════════════════════════════════════════════════

export { CommandsService } from './commands.service.js';
export * from './commands.types.js';

// Factory function
export function createCommandsModule(
  projectRoot: string,
  logger: Logger,
  config?: Partial<CommandsModuleConfig>
): CommandsModule {
  const defaultConfig: CommandsModuleConfig = {
    enabled: true,
    commandsDir: '.claude/commands',
    autoDetectStack: true,
    enableBaseCommands: true,
    enabledCategories: ['base', 'custom'],
  };

  return new CommandsModule(
    { ...defaultConfig, ...config },
    logger,
    projectRoot
  );
}
