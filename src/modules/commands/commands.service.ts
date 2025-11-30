// src/modules/commands/commands.service.ts

import { readFile, readdir, writeFile, stat } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { join, basename } from 'path';
import { Logger } from '../../core/logger.js';
import {
  SlashCommand,
  CommandCategory,
  CommandArgument,
  CommandInvocation,
  CommandResult,
  CommandsModuleConfig,
  CommandsModuleStatus,
  CommandTemplate,
} from './commands.types.js';

// ═══════════════════════════════════════════════════════════════
//                      BUILT-IN COMMANDS
// ═══════════════════════════════════════════════════════════════

const BASE_COMMANDS: SlashCommand[] = [
  {
    name: 'add-endpoint',
    description: 'Add a new API endpoint with controller, service, and tests',
    category: 'base',
    arguments: [
      { name: 'resource', description: 'Resource name (e.g., users, products)', required: true, type: 'string' },
      { name: 'method', description: 'HTTP method', required: false, type: 'choice', choices: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], default: 'GET' },
    ],
    prompt: `Create a new API endpoint for $resource with $method method.

Requirements:
1. Create controller with proper validation
2. Create service layer with business logic
3. Add route definition
4. Write unit tests
5. Follow project conventions from CLAUDE.md`,
    enabled: true,
  },
  {
    name: 'build-dashboard',
    description: 'Create a dashboard component with data visualization',
    category: 'base',
    arguments: [
      { name: 'name', description: 'Dashboard name', required: true, type: 'string' },
      { name: 'widgets', description: 'Widget types (comma-separated)', required: false, type: 'string', default: 'table,chart' },
    ],
    prompt: `Create a dashboard named $name with the following widgets: $widgets.

Requirements:
1. Create main dashboard component
2. Add widget components for each type
3. Implement data fetching hooks
4. Add loading and error states
5. Make it responsive`,
    enabled: true,
  },
  {
    name: 'full-review',
    description: 'Comprehensive code review using multiple specialized agents',
    category: 'base',
    arguments: [
      { name: 'files', description: 'Files to review (comma-separated or glob)', required: false, type: 'string' },
    ],
    prompt: `Perform a comprehensive code review.

Review Checklist:
1. Code quality and readability
2. Security vulnerabilities
3. Performance issues
4. Test coverage
5. Documentation completeness
6. Adherence to project conventions

Files to review: $files

Provide specific, actionable feedback for each issue found.`,
    enabled: true,
  },
  {
    name: 'risk-check',
    description: 'Check code for potential risks and security issues',
    category: 'base',
    arguments: [],
    prompt: `Analyze the codebase for potential risks:

1. Security vulnerabilities (OWASP Top 10)
2. Data exposure risks
3. Authentication/authorization gaps
4. Input validation issues
5. Dependency vulnerabilities
6. Hardcoded secrets or credentials

Provide severity ratings and remediation steps.`,
    enabled: true,
  },
];

const ERP_COMMANDS: SlashCommand[] = [
  {
    name: 'add-crud',
    description: 'Generate CRUD operations for a resource with proper ERP patterns',
    category: 'erp',
    arguments: [
      { name: 'model', description: 'Model name', required: true, type: 'string' },
      { name: 'relations', description: 'Related models (comma-separated)', required: false, type: 'string' },
    ],
    prompt: `Generate complete CRUD operations for $model model.

Requirements:
1. Controller with all CRUD methods
2. Form Request validation classes
3. Service layer with business logic
4. Repository pattern implementation
5. Unit and feature tests
6. Relations: $relations

Follow ERP business principles:
- Validate warehouse scope for inventory
- Track audit trail
- Handle soft deletes`,
    stacks: ['Laravel/PHP'],
    enabled: true,
  },
  {
    name: 'add-report',
    description: 'Create a new report with filters and export options',
    category: 'erp',
    arguments: [
      { name: 'name', description: 'Report name', required: true, type: 'string' },
      { name: 'dimensions', description: 'Report dimensions', required: true, type: 'string' },
      { name: 'metrics', description: 'Report metrics', required: true, type: 'string' },
    ],
    prompt: `Create a report named $name.

Dimensions: $dimensions
Metrics: $metrics

Requirements:
1. Report service with query builder
2. Filter components
3. Export to Excel/PDF
4. Date range support
5. Pagination for large datasets`,
    enabled: true,
  },
  {
    name: 'check-stock',
    description: 'Validate stock-related code follows inventory principles',
    category: 'erp',
    arguments: [],
    prompt: `Review all stock/inventory related code:

Verify:
1. Operations are warehouse-scoped
2. No negative stock allowed (unless configured)
3. Stock movements have reason codes
4. Audit trail is maintained
5. Concurrent updates are handled properly`,
    enabled: true,
  },
  {
    name: 'debt-flow',
    description: 'Review customer debt tracking implementation',
    category: 'erp',
    arguments: [],
    prompt: `Review customer debt flow implementation:

Verify:
1. Debt tracked per transaction
2. Sources: orders, manual adjustments
3. Reductions: payments, returns, writeoffs
4. Balance calculations are accurate
5. Credit limits enforced
6. Overdue detection works`,
    enabled: true,
  },
];

const TRADING_COMMANDS: SlashCommand[] = [
  {
    name: 'backtest',
    description: 'Create or review a backtest implementation',
    category: 'trading',
    arguments: [
      { name: 'strategy', description: 'Strategy name', required: true, type: 'string' },
      { name: 'timeframe', description: 'Timeframe (1m, 5m, 1h, 1d)', required: false, type: 'string', default: '1h' },
    ],
    prompt: `Create/review backtest for $strategy strategy on $timeframe timeframe.

Requirements:
1. Pure function strategy logic
2. No side effects in strategy code
3. Proper position sizing
4. Risk metrics calculation (Sharpe, max DD, winrate)
5. Transaction costs included
6. Slippage simulation
7. Walk-forward validation`,
    stacks: ['Python', 'Node.js'],
    enabled: true,
  },
  {
    name: 'live-trade-check',
    description: 'Safety check before deploying live trading',
    category: 'trading',
    arguments: [],
    prompt: `Perform pre-deployment safety check for live trading:

Critical Checks:
1. Risk limits configured (max leverage, daily loss, drawdown)
2. Stop loss required for all positions
3. Position size limits enforced
4. API rate limits handled
5. Error recovery mechanisms
6. Logging and monitoring in place
7. Kill switch available
8. Paper trading results validated`,
    enabled: true,
  },
  {
    name: 'strategy-review',
    description: 'Review trading strategy code',
    category: 'trading',
    arguments: [
      { name: 'file', description: 'Strategy file path', required: true, type: 'file' },
    ],
    prompt: `Review trading strategy in $file:

Verify:
1. Strategy logic is isolated
2. Pure functions (no side effects)
3. No order execution inside strategy
4. Signals are clearly defined
5. Position sizing is separate
6. Entry/exit rules are explicit
7. Testable with mock data`,
    enabled: true,
  },
];

const ORCHESTRATION_COMMANDS: SlashCommand[] = [
  {
    name: 'add-worker',
    description: 'Create a new background worker/job',
    category: 'orchestration',
    arguments: [
      { name: 'name', description: 'Worker name', required: true, type: 'string' },
      { name: 'queue', description: 'Queue name', required: false, type: 'string', default: 'default' },
    ],
    prompt: `Create a new worker named $name for queue $queue.

Requirements:
1. Idempotent processing
2. Retry logic with exponential backoff
3. Dead letter queue handling
4. Timeout enforcement
5. Progress tracking
6. Logging with trace ID
7. Metrics collection
8. Graceful shutdown`,
    stacks: ['Node.js', 'Python'],
    enabled: true,
  },
  {
    name: 'orchestration-flow',
    description: 'Design or review an orchestration flow',
    category: 'orchestration',
    arguments: [
      { name: 'flow', description: 'Flow name', required: true, type: 'string' },
    ],
    prompt: `Design/review orchestration flow: $flow

Requirements:
1. Each step is idempotent
2. All operations are retry-safe
3. Failure handling at each step
4. Rollback/compensation logic
5. Progress checkpoints
6. Observability (logs, metrics, traces)
7. Cost tracking if applicable`,
    enabled: true,
  },
  {
    name: 'cost-analysis',
    description: 'Analyze API/model costs in orchestration',
    category: 'orchestration',
    arguments: [],
    prompt: `Analyze costs in the orchestration system:

Review:
1. LLM/API call frequencies
2. Token usage patterns
3. Caching opportunities
4. Model selection (prefer smaller models)
5. Batch processing opportunities
6. Rate limiting impact
7. Cost per operation estimates`,
    enabled: true,
  },
];

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

      // Validate and convert
      switch (argDef.type) {
        case 'number':
          const num = Number(value);
          if (isNaN(num)) {
            errors.push(`Invalid number for ${argDef.name}: ${value}`);
          } else {
            args[argDef.name] = num;
          }
          break;

        case 'boolean':
          args[argDef.name] = value === 'true' || value === '1' || value === 'yes';
          break;

        case 'choice':
          if (argDef.choices && !argDef.choices.includes(value.toUpperCase())) {
            errors.push(`Invalid choice for ${argDef.name}: ${value}. Valid: ${argDef.choices.join(', ')}`);
          } else {
            args[argDef.name] = value;
          }
          break;

        default:
          // Validate pattern if provided
          if (argDef.pattern) {
            const regex = new RegExp(argDef.pattern);
            if (!regex.test(value)) {
              errors.push(`Invalid format for ${argDef.name}: ${value}`);
            }
          }
          args[argDef.name] = value;
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

  private registerBuiltInCommands(): void {
    // Register base commands
    for (const cmd of BASE_COMMANDS) {
      this.register(cmd);
    }

    // Register domain commands based on enabled categories
    if (this.config.enabledCategories.includes('erp')) {
      for (const cmd of ERP_COMMANDS) {
        this.register(cmd);
      }
    }

    if (this.config.enabledCategories.includes('trading')) {
      for (const cmd of TRADING_COMMANDS) {
        this.register(cmd);
      }
    }

    if (this.config.enabledCategories.includes('orchestration')) {
      for (const cmd of ORCHESTRATION_COMMANDS) {
        this.register(cmd);
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
