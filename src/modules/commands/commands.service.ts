// src/modules/commands/commands.service.ts

import { readFile, readdir, writeFile, stat } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { join, basename } from 'path';
import { Logger } from '../../core/logger.js';
import {
  SlashCommand,
  CommandCategory,
  CommandInvocation,
  CommandResult,
  CommandsModuleConfig,
  CommandsModuleStatus,
  CommandTemplate,
  CommandArgument,
} from './commands.types.js';
import {
  BASE_COMMANDS,
  ERP_COMMANDS,
  TRADING_COMMANDS,
  ORCHESTRATION_COMMANDS,
} from './commands-builtin.js';

// ═══════════════════════════════════════════════════════════════
//                      COMMANDS SERVICE
// ═══════════════════════════════════════════════════════════════

export class CommandsService {
  private commands: Map<string, SlashCommand> = new Map();
  private detectedStack?: string;

  constructor(
    private config: CommandsModuleConfig,
    private logger: Logger,
    private projectRoot: string
  ) {}

  // ═══════════════════════════════════════════════════════════════
  //                      LIFECYCLE
  // ═══════════════════════════════════════════════════════════════

  async initialize(): Promise<void> {
    this.logger.info('Initializing Commands service');

    // Detect project stack
    if (this.config.autoDetectStack) {
      this.detectedStack = await this.detectStack();
      this.logger.info(`Detected stack: ${this.detectedStack || 'unknown'}`);
    }

    // Register built-in commands
    if (this.config.enableBaseCommands) {
      this.registerBuiltInCommands();
    }

    // Load custom commands from .claude/commands/
    await this.loadCustomCommands();

    this.logger.info(`Commands service initialized with ${this.commands.size} commands`);
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Commands service');
    this.commands.clear();
  }

  // ═══════════════════════════════════════════════════════════════
  //                      COMMAND MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get all commands
   */
  getAll(): SlashCommand[] {
    return Array.from(this.commands.values());
  }

  /**
   * Get command by name
   */
  get(name: string): SlashCommand | undefined {
    return this.commands.get(name);
  }

  /**
   * Get commands by category
   */
  getByCategory(category: CommandCategory): SlashCommand[] {
    return this.getAll().filter(cmd => cmd.category === category);
  }

  /**
   * Register a command
   */
  register(command: SlashCommand): void {
    // Filter by stack if applicable
    if (command.stacks && this.detectedStack) {
      if (!command.stacks.some(s => this.detectedStack?.includes(s))) {
        this.logger.debug(`Skipping command ${command.name} (stack mismatch)`);
        return;
      }
    }

    // Check if category is enabled
    if (!this.config.enabledCategories.includes(command.category) &&
        command.category !== 'base') {
      this.logger.debug(`Skipping command ${command.name} (category disabled)`);
      return;
    }

    this.commands.set(command.name, command);
    this.logger.debug(`Registered command: ${command.name}`);
  }

  /**
   * Parse command invocation string
   */
  parseInvocation(input: string): CommandInvocation {
    // Format: /command-name arg1 arg2 "arg with spaces"
    const parts = input.match(/(?:[^\s"]+|"[^"]*")+/g) || [];

    if (parts.length === 0) {
      return {
        command: '',
        args: {},
        rawArgs: '',
        missingArgs: [],
        errors: ['Empty command'],
      };
    }

    const commandName = (parts[0] || '').replace(/^\//, '');
    const command = this.commands.get(commandName);

    if (!command) {
      return {
        command: commandName,
        args: {},
        rawArgs: parts.slice(1).join(' '),
        missingArgs: [],
        errors: [`Unknown command: ${commandName}`],
      };
    }

    const args: Record<string, string | number | boolean> = {};
    const missingArgs: string[] = [];
    const errors: string[] = [];

    // Parse positional arguments
    const argValues = parts.slice(1).map(a => a.replace(/^"|"$/g, ''));

    for (let i = 0; i < command.arguments.length; i++) {
      const argDef = command.arguments[i];
      const value = argValues[i];

      if (value === undefined) {
        if (argDef.required) {
          missingArgs.push(argDef.name);
        } else if (argDef.default !== undefined) {
          args[argDef.name] = argDef.default;
        }
        continue;
      }

      const parseResult = this.parseArgumentValue(argDef, value);
      if (parseResult.error) {
        errors.push(parseResult.error);
      } else if (parseResult.value !== undefined) {
        args[argDef.name] = parseResult.value;
      }
    }

    return {
      command: commandName,
      args,
      rawArgs: parts.slice(1).join(' '),
      missingArgs,
      errors,
    };
  }

  /**
   * Execute command and return expanded prompt
   */
  execute(invocation: CommandInvocation): CommandResult {
    const command = this.commands.get(invocation.command);

    if (!command) {
      return {
        success: false,
        prompt: '',
        warnings: [],
        metadata: {
          command: invocation.command,
          category: 'custom',
          args: invocation.args,
          executedAt: new Date(),
        },
      };
    }

    if (invocation.missingArgs.length > 0) {
      return {
        success: false,
        prompt: `Missing required arguments: ${invocation.missingArgs.join(', ')}`,
        warnings: [],
        metadata: {
          command: invocation.command,
          category: command.category,
          args: invocation.args,
          executedAt: new Date(),
        },
      };
    }

    if (invocation.errors.length > 0) {
      return {
        success: false,
        prompt: `Errors: ${invocation.errors.join('; ')}`,
        warnings: [],
        metadata: {
          command: invocation.command,
          category: command.category,
          args: invocation.args,
          executedAt: new Date(),
        },
      };
    }

    // Expand prompt with arguments
    let expandedPrompt = command.prompt;

    for (const [key, value] of Object.entries(invocation.args)) {
      expandedPrompt = expandedPrompt.replace(
        new RegExp(`\\$${key}`, 'g'),
        String(value)
      );
    }

    // Replace unused variables with defaults or empty
    for (const argDef of command.arguments) {
      if (!(argDef.name in invocation.args)) {
        const replacement = argDef.default || '';
        expandedPrompt = expandedPrompt.replace(
          new RegExp(`\\$${argDef.name}`, 'g'),
          replacement
        );
      }
    }

    const warnings: string[] = [];

    // Add stack warning if applicable
    if (command.stacks && this.detectedStack &&
        !command.stacks.some(s => this.detectedStack?.includes(s))) {
      warnings.push(`This command is optimized for ${command.stacks.join('/')} but detected ${this.detectedStack}`);
    }

    return {
      success: true,
      prompt: expandedPrompt,
      warnings,
      metadata: {
        command: invocation.command,
        category: command.category,
        args: invocation.args,
        executedAt: new Date(),
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //                      CUSTOM COMMANDS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Load custom commands from .claude/commands/
   */
  private async loadCustomCommands(): Promise<void> {
    const commandsDir = join(this.projectRoot, this.config.commandsDir);

    try {
      await stat(commandsDir);
    } catch {
      this.logger.debug(`Commands directory not found: ${commandsDir}`);
      return;
    }

    try {
      const files = await readdir(commandsDir);
      const mdFiles = files.filter(f => f.endsWith('.md'));

      for (const file of mdFiles) {
        try {
          const filePath = join(commandsDir, file);
          const content = await readFile(filePath, 'utf-8');
          const command = this.parseCommandFile(content, filePath);

          if (command) {
            this.register(command);
          }
        } catch (error) {
          this.logger.warn(`Failed to parse command file: ${file}`);
        }
      }

      this.logger.info(`Loaded ${mdFiles.length} custom commands`);
    } catch (error) {
      this.logger.error('Failed to load custom commands');
    }
  }

  /**
   * Parse command file (.md format)
   */
  private parseCommandFile(content: string, filePath: string): SlashCommand | null {
    const name = basename(filePath, '.md');
    const lines = content.split('\n');

    // Extract description from first line if it's a header
    let description = name;
    if (lines[0].startsWith('#')) {
      description = lines[0].replace(/^#+\s*/, '');
    }

    // Extract arguments from $ARGUMENTS or inline $var patterns
    const args: CommandArgument[] = [];
    const argMatches = content.match(/\$(\w+)/g) || [];
    const uniqueArgs = [...new Set(argMatches.map(a => a.slice(1)))];

    // Filter out $ARGUMENTS placeholder
    for (const argName of uniqueArgs) {
      if (argName !== 'ARGUMENTS') {
        args.push({
          name: argName,
          description: `Value for ${argName}`,
          required: true,
          type: 'string',
        });
      }
    }

    return {
      name,
      description,
      category: 'custom',
      arguments: args,
      prompt: content,
      enabled: true,
      sourcePath: filePath,
    };
  }

  /**
   * Generate command file from template
   */
  async generateCommandFile(template: CommandTemplate, values: Record<string, string>): Promise<string> {
    let content = template.content;

    for (const [key, value] of Object.entries(values)) {
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    const filename = template.filenamePattern.replace(/{{name}}/g, values.name || 'command');
    const filePath = join(this.projectRoot, this.config.commandsDir, filename);

    // Ensure directory exists
    const dir = join(this.projectRoot, this.config.commandsDir);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    await writeFile(filePath, content);

    // Register the new command
    const command = this.parseCommandFile(content, filePath);
    if (command) {
      this.register(command);
    }

    return filePath;
  }

  // ═══════════════════════════════════════════════════════════════
  //                      HELPERS
  // ═══════════════════════════════════════════════════════════════

  private parseArgumentValue(
    argDef: CommandArgument,
    value: string
  ): { value?: string | number | boolean; error?: string } {
    switch (argDef.type) {
      case 'number': {
        const num = Number(value);
        return isNaN(num)
          ? { error: `Invalid number for ${argDef.name}: ${value}` }
          : { value: num };
      }
      case 'boolean':
        return { value: ['true', '1', 'yes'].includes(value.toLowerCase()) };
      case 'choice':
        if (argDef.choices && !argDef.choices.includes(value.toUpperCase())) {
          return { error: `Invalid choice for ${argDef.name}: ${value}. Valid: ${argDef.choices.join(', ')}` };
        }
        return { value };
      default:
        if (argDef.pattern && !new RegExp(argDef.pattern).test(value)) {
          return { error: `Invalid format for ${argDef.name}: ${value}` };
        }
        return { value };
    }
  }

  private registerBuiltInCommands(): void {
    // Register base commands
    BASE_COMMANDS.forEach(cmd => this.register(cmd));

    // Register domain commands based on enabled categories
    const categoryCommands: Record<string, SlashCommand[]> = {
      erp: ERP_COMMANDS,
      trading: TRADING_COMMANDS,
      orchestration: ORCHESTRATION_COMMANDS,
    };

    for (const [category, commands] of Object.entries(categoryCommands)) {
      if (this.config.enabledCategories.includes(category as CommandCategory)) {
        commands.forEach(cmd => this.register(cmd));
      }
    }

    this.logger.info('Registered built-in commands');
  }

  private async detectStack(): Promise<string | undefined> {
    // Check for Laravel
    if (existsSync(join(this.projectRoot, 'artisan'))) {
      return 'Laravel/PHP';
    }

    // Check package.json
    const pkgPath = join(this.projectRoot, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };

        if (deps.react) return 'React';
        if (deps.vue) return 'Vue';
        if (deps.express || deps.fastify) return 'Node.js';
        if (deps.next) return 'Next.js';
      } catch {
        // Ignore
      }
    }

    // Check for Python
    if (existsSync(join(this.projectRoot, 'requirements.txt')) ||
        existsSync(join(this.projectRoot, 'pyproject.toml'))) {
      return 'Python';
    }

    return undefined;
  }

  // ═══════════════════════════════════════════════════════════════
  //                      STATUS
  // ═══════════════════════════════════════════════════════════════

  getStatus(): CommandsModuleStatus {
    const byCategory: Record<CommandCategory, number> = {
      base: 0,
      erp: 0,
      trading: 0,
      orchestration: 0,
      frontend: 0,
      backend: 0,
      custom: 0,
    };

    for (const cmd of this.commands.values()) {
      byCategory[cmd.category] = (byCategory[cmd.category] || 0) + 1;
    }

    return {
      enabled: this.config.enabled,
      totalCommands: this.commands.size,
      byCategory,
      detectedStack: this.detectedStack,
      commandsDir: this.config.commandsDir,
    };
  }
}
