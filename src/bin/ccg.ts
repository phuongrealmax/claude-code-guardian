#!/usr/bin/env node

// src/bin/ccg.ts

/**
 * Claude Code Guardian CLI Entry Point
 *
 * Main CLI for CCG - provides commands for:
 * - init: Initialize CCG in a project
 * - status: Show current CCG status
 * - quickstart: Interactive setup and analysis
 * - doctor: Diagnose configuration issues
 * - code-optimize: Analyze and optimize codebase
 * - report: View session history and trends
 * - dogfood-report: Generate internal case studies
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  copyFileSync,
  readFileSync,
  readdirSync,
  statSync,
} from 'fs';

import { createHookCommand } from './hook-command.js';
import { createActivateCommand } from './commands/activate.js';
import { createCodeOptimizeCommand } from './commands/code-optimize.js';
import { createReportCommand } from './commands/report.js';
import { createQuickstartCommand } from './commands/quickstart.js';
import { createDoctorCommand } from './commands/doctor.js';
import { createDogfoodReportCommand } from './commands/dogfood-report.js';
import { CONFIG_TEMPLATE } from '../core/multi-repo-config.js';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read version from package.json (dist/bin/ccg.js -> ../../package.json)
let cliVersion = '0.0.0';
try {
  const pkgJsonPath = join(__dirname, '..', '..', 'package.json');
  const pkgRaw = readFileSync(pkgJsonPath, 'utf-8');
  const pkg = JSON.parse(pkgRaw);
  if (pkg.version) {
    cliVersion = pkg.version;
  }
} catch {
  // Fallback: keep default version string
}

const program = new Command();

// ═══════════════════════════════════════════════════════════════
//                      PROGRAM SETUP
// ═══════════════════════════════════════════════════════════════

program
  .name('ccg')
  .description('Claude Code Guardian - Protect your coding sessions with smart guardrails')
  .version(cliVersion);

// ═══════════════════════════════════════════════════════════════
//                      INIT COMMAND
// ═══════════════════════════════════════════════════════════════

program
  .command('init')
  .description('Initialize CCG in current project')
  .option('-f, --force', 'Overwrite existing configuration')
  .option('-p, --profile <profile>', 'Use a preset profile (minimal, standard, strict)', 'standard')
  .option('--multi-repo', 'Create multi-repository configuration template')
  .action(async (options: { force?: boolean; profile?: string; multiRepo?: boolean }) => {
    const cwd = process.cwd();
    const ccgDir = join(cwd, '.ccg');
    const claudeDir = join(cwd, '.claude');

    console.log(chalk.blue('\n  Initializing Claude Code Guardian...\n'));

    if (existsSync(ccgDir) && !options.force) {
      console.log(chalk.yellow('  CCG already initialized. Use --force to overwrite.\n'));
      return;
    }

    try {
      // Create directories
      const directories = [
        ccgDir,
        join(ccgDir, 'checkpoints'),
        join(ccgDir, 'tasks'),
        join(ccgDir, 'registry'),
        join(ccgDir, 'logs'),
        join(ccgDir, 'screenshots'),
        claudeDir,
        join(claudeDir, 'commands'),
      ];

      for (const dir of directories) {
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
      }
      console.log(chalk.green('  Created directories'));

      // Copy config template
      const templateDir = findTemplateDir();
      const configSource = join(templateDir, `config.${options.profile || 'standard'}.json`);
      const configFallback = join(templateDir, 'config.template.json');
      const configTarget = join(ccgDir, 'config.json');

      if (existsSync(configSource)) {
        copyFileSync(configSource, configTarget);
      } else if (existsSync(configFallback)) {
        copyFileSync(configFallback, configTarget);
      } else {
        writeFileSync(configTarget, JSON.stringify(getDefaultConfig(), null, 2));
      }
      console.log(chalk.green('  Created config.json'));

      // Create multi-repo config if requested
      if (options.multiRepo) {
        const multiRepoConfigPath = join(ccgDir, 'config.yml');
        writeFileSync(multiRepoConfigPath, CONFIG_TEMPLATE);
        console.log(chalk.green('  Created config.yml (multi-repo)'));
      }

      // Create hooks.json
      const hooksPath = join(claudeDir, 'hooks.json');
      if (!existsSync(hooksPath) || options.force) {
        writeFileSync(hooksPath, JSON.stringify(getDefaultHooksConfig(), null, 2));
        console.log(chalk.green('  Created hooks.json'));
      }

      // Create slash command
      const ccgCommandPath = join(claudeDir, 'commands', 'ccg.md');
      if (!existsSync(ccgCommandPath) || options.force) {
        const ccgCommandContent = `# CCG Dashboard\n\nShow the CCG status dashboard.\n\n\`\`\`bash\nccg status\n\`\`\``;
        writeFileSync(ccgCommandPath, ccgCommandContent);
        console.log(chalk.green('  Created slash command'));
      }

      // Update .mcp.json
      const mcpPath = join(cwd, '.mcp.json');
      let mcpConfig: any = { mcpServers: {} };
      if (existsSync(mcpPath)) {
        try {
          mcpConfig = JSON.parse(readFileSync(mcpPath, 'utf-8'));
        } catch { /* ignore */ }
      }

      if (!mcpConfig.mcpServers) {
        mcpConfig.mcpServers = {};
      }

      if (!mcpConfig.mcpServers['claude-code-guardian']) {
        mcpConfig.mcpServers['claude-code-guardian'] = {
          command: 'node',
          args: [join(cwd, 'node_modules', 'codeguardian-studio', 'dist', 'index.js')],
        };
        writeFileSync(mcpPath, JSON.stringify(mcpConfig, null, 2));
        console.log(chalk.green('  Updated .mcp.json'));
      }

      console.log(chalk.blue('\n  CCG initialized successfully!\n'));
      console.log(chalk.dim('  Next steps:'));
      console.log(`    1. Run ${chalk.cyan('ccg quickstart')} for guided setup`);
      console.log(`    2. Run ${chalk.cyan('ccg code-optimize --report')} for analysis`);
      console.log(`    3. Run ${chalk.cyan('ccg status')} to check status\n`);

    } catch (error) {
      console.error(chalk.red('\n  Failed to initialize CCG:'), error);
      process.exit(1);
    }
  });

// ═══════════════════════════════════════════════════════════════
//                      STATUS COMMAND
// ═══════════════════════════════════════════════════════════════

program
  .command('status')
  .description('Show CCG status')
  .action(async () => {
    const cwd = process.cwd();
    const ccgDir = join(cwd, '.ccg');

    console.log(chalk.blue('\n  Claude Code Guardian Status'));
    console.log(chalk.dim('  ══════════════════════════════════════════════════\n'));

    // Check initialization
    const initialized = existsSync(ccgDir);
    console.log(`   Initialized: ${initialized ? chalk.green('Yes') : chalk.red('No')}`);

    if (!initialized) {
      console.log(chalk.yellow(`\n  Run ${chalk.cyan('ccg init')} to get started.\n`));
      return;
    }

    // Check files
    const configPath = join(ccgDir, 'config.json');
    const hooksPath = join(cwd, '.claude', 'hooks.json');
    const mcpPath = join(cwd, '.mcp.json');

    console.log('\n  Configuration:');
    console.log(`     Config: ${existsSync(configPath) ? chalk.green('Found') : chalk.red('Missing')}`);
    console.log(`     Hooks:  ${existsSync(hooksPath) ? chalk.green('Found') : chalk.yellow('Missing')}`);
    console.log(`     MCP:    ${existsSync(mcpPath) ? chalk.green('Found') : chalk.yellow('Missing')}`);

    // Check data
    const checkpointsDir = join(ccgDir, 'checkpoints');
    const tasksDir = join(ccgDir, 'tasks');
    const memoryDb = join(ccgDir, 'memory.db');

    console.log('\n  Data:');
    console.log(`     Checkpoints: ${existsSync(checkpointsDir) ? readdirSync(checkpointsDir).length : 0}`);
    console.log(`     Tasks: ${existsSync(tasksDir) ? readdirSync(tasksDir).length : 0}`);
    console.log(`     Memory: ${existsSync(memoryDb) ? chalk.green('Active') : chalk.dim('Empty')}`);

    console.log();
  });

// ═══════════════════════════════════════════════════════════════
//                      EXTRACTED COMMANDS
// ═══════════════════════════════════════════════════════════════

program.addCommand(createQuickstartCommand(findTemplateDir));
program.addCommand(createDoctorCommand());
program.addCommand(createHookCommand());
program.addCommand(createCodeOptimizeCommand());
program.addCommand(createReportCommand());
program.addCommand(createDogfoodReportCommand());
program.addCommand(createActivateCommand());

// ═══════════════════════════════════════════════════════════════
//                      HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function findTemplateDir(): string {
  const possiblePaths = [
    join(__dirname, '..', '..', 'templates'),
    join(__dirname, '..', 'templates'),
    join(process.cwd(), 'templates'),
  ];

  for (const p of possiblePaths) {
    if (existsSync(p)) {
      return p;
    }
  }

  return possiblePaths[0];
}

function getDefaultConfig(): Record<string, unknown> {
  return {
    version: '1.0.0',
    project: {
      name: 'my-project',
      type: 'typescript-node',
      root: '.',
    },
    modules: {
      memory: { enabled: true, maxItems: 1000, autoSave: true },
      guard: { enabled: true, strictMode: false },
      process: { enabled: true, ports: { dev: 3000 } },
      resource: { enabled: true, warningThreshold: 70 },
      workflow: { enabled: true, autoTrackTasks: true },
      testing: { enabled: true, autoRun: false },
      documents: { enabled: true, updateInsteadOfCreate: true },
    },
  };
}

function getDefaultHooksConfig(): Record<string, unknown> {
  return {
    hooks: {
      SessionStart: [
        { type: 'command', command: 'npx @anthropic-community/claude-code-guardian hook session-start' },
      ],
      PreToolCall: [
        {
          type: 'command',
          command: 'npx @anthropic-community/claude-code-guardian hook pre-tool $TOOL_NAME',
          filter: { tools: ['write_file', 'edit_file', 'bash', 'create_file'] },
        },
      ],
      PostToolCall: [
        {
          type: 'command',
          command: 'npx @anthropic-community/claude-code-guardian hook post-tool $TOOL_NAME',
          filter: { tools: ['write_file', 'edit_file', 'create_file'] },
        },
      ],
      Stop: [
        { type: 'command', command: 'npx @anthropic-community/claude-code-guardian hook session-end' },
      ],
    },
  };
}

// ═══════════════════════════════════════════════════════════════
//                      RUN CLI
// ═══════════════════════════════════════════════════════════════

program.parse();
