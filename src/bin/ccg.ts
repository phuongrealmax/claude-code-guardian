#!/usr/bin/env node

// src/bin/ccg.ts

/**
 * Claude Code Guardian CLI Entry Point
 *
 * Main CLI for CCG - provides commands for:
 * - init: Initialize CCG in a project
 * - status: Show current CCG status
 * - doctor: Diagnose configuration issues
 * - hook: Execute hooks (used by Claude Code)
 */

import { Command, Option } from 'commander';
import chalk from 'chalk';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  copyFileSync,
  readFileSync,
} from 'fs';

import { createHookCommand } from './hook-command.js';
import { createActivateCommand } from './commands/activate.js';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const program = new Command();

// ═══════════════════════════════════════════════════════════════
//                      PROGRAM SETUP
// ═══════════════════════════════════════════════════════════════

program
  .name('ccg')
  .description('Claude Code Guardian - Protect your coding sessions with smart guardrails')
  .version('1.0.0');

// ═══════════════════════════════════════════════════════════════
//                      INIT COMMAND
// ═══════════════════════════════════════════════════════════════

program
  .command('init')
  .description('Initialize CCG in current project')
  .option('-f, --force', 'Overwrite existing configuration')
  .option('-p, --profile <profile>', 'Use a preset profile (minimal, standard, strict)', 'standard')
  .action(async (options: { force?: boolean; profile?: string }) => {
    const cwd = process.cwd();
    const ccgDir = join(cwd, '.ccg');
    const claudeDir = join(cwd, '.claude');

    console.log(chalk.blue('\n  Initializing Claude Code Guardian...\n'));

    // Check if already initialized
    if (existsSync(ccgDir) && !options.force) {
      console.log(chalk.yellow('  CCG already initialized. Use --force to overwrite.\n'));
      return;
    }

    try {
      // Create CCG directories
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

      // Find template directory
      const templateDir = findTemplateDir();

      // Copy config template
      const configSource = join(templateDir, `config.${options.profile || 'standard'}.json`);
      const configFallback = join(templateDir, 'config.template.json');
      const configTarget = join(ccgDir, 'config.json');

      if (existsSync(configSource)) {
        copyFileSync(configSource, configTarget);
      } else if (existsSync(configFallback)) {
        copyFileSync(configFallback, configTarget);
      } else {
        // Create default config
        writeFileSync(configTarget, JSON.stringify(getDefaultConfig(), null, 2));
      }
      console.log(chalk.green('  Created .ccg/config.json'));

      // Copy hooks template
      const hooksSource = join(templateDir, 'hooks.template.json');
      const hooksTarget = join(claudeDir, 'hooks.json');

      if (existsSync(hooksSource)) {
        copyFileSync(hooksSource, hooksTarget);
      } else {
        writeFileSync(hooksTarget, JSON.stringify(getDefaultHooksConfig(), null, 2));
      }
      console.log(chalk.green('  Created .claude/hooks.json'));

      // Copy slash command
      const cmdSource = join(templateDir, 'commands', 'ccg.md');
      const cmdTarget = join(claudeDir, 'commands', 'ccg.md');

      if (existsSync(cmdSource)) {
        copyFileSync(cmdSource, cmdTarget);
        console.log(chalk.green('  Created .claude/commands/ccg.md'));
      }

      // Create/update .mcp.json
      const mcpPath = join(cwd, '.mcp.json');
      let mcpConfig: Record<string, unknown> = {};

      if (existsSync(mcpPath)) {
        try {
          mcpConfig = JSON.parse(readFileSync(mcpPath, 'utf-8'));
        } catch {
          // Invalid JSON, start fresh
        }
      }

      // Add CCG to mcpServers
      if (!mcpConfig.mcpServers) {
        mcpConfig.mcpServers = {};
      }
      (mcpConfig.mcpServers as Record<string, unknown>)['claude-code-guardian'] = {
        command: 'npx',
        args: ['@anthropic-community/claude-code-guardian'],
      };

      writeFileSync(mcpPath, JSON.stringify(mcpConfig, null, 2));
      console.log(chalk.green('  Updated .mcp.json'));

      // Success message
      console.log(chalk.blue('\n  CCG initialized successfully!\n'));
      console.log('  Next steps:');
      console.log(`    1. Review configuration in ${chalk.cyan('.ccg/config.json')}`);
      console.log(`    2. Run ${chalk.cyan('claude')} to start with CCG`);
      console.log(`    3. Type ${chalk.cyan('/ccg')} to see the dashboard`);
      console.log();
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
  .option('-j, --json', 'Output as JSON')
  .action(async (options: { json?: boolean }) => {
    const cwd = process.cwd();
    const ccgDir = join(cwd, '.ccg');

    // Check initialization
    if (!existsSync(ccgDir)) {
      if (options.json) {
        console.log(JSON.stringify({ initialized: false }));
      } else {
        console.log(chalk.yellow('\n  CCG is not initialized in this project.'));
        console.log(`  Run ${chalk.cyan('ccg init')} to get started.\n`);
      }
      return;
    }

    try {
      // Gather status information
      const status = {
        initialized: true,
        configPath: join(ccgDir, 'config.json'),
        configExists: existsSync(join(ccgDir, 'config.json')),
        hooksPath: join(cwd, '.claude', 'hooks.json'),
        hooksExists: existsSync(join(cwd, '.claude', 'hooks.json')),
        mcpPath: join(cwd, '.mcp.json'),
        mcpExists: existsSync(join(cwd, '.mcp.json')),
        checkpointsDir: join(ccgDir, 'checkpoints'),
        tasksDir: join(ccgDir, 'tasks'),
        memoryDb: join(ccgDir, 'memory.db'),
        memoryExists: existsSync(join(ccgDir, 'memory.db')),
      };

      // Count checkpoints and tasks
      let checkpointCount = 0;
      let taskCount = 0;

      if (existsSync(status.checkpointsDir)) {
        try {
          const { readdirSync } = await import('fs');
          checkpointCount = readdirSync(status.checkpointsDir).filter(f => f.endsWith('.json')).length;
        } catch { /* ignore */ }
      }

      if (existsSync(status.tasksDir)) {
        try {
          const { readdirSync } = await import('fs');
          taskCount = readdirSync(status.tasksDir).filter(f => f.endsWith('.json')).length;
        } catch { /* ignore */ }
      }

      if (options.json) {
        console.log(JSON.stringify({ ...status, checkpointCount, taskCount }, null, 2));
        return;
      }

      // Display status
      console.log();
      console.log(chalk.blue('  Claude Code Guardian Status'));
      console.log(chalk.blue('  ' + '═'.repeat(50)));
      console.log();

      console.log(`  ${chalk.green('')} Initialized: ${chalk.cyan('Yes')}`);
      console.log();

      console.log(chalk.dim('  Configuration:'));
      console.log(`    ${status.configExists ? chalk.green('') : chalk.red('')} Config: ${status.configExists ? 'Found' : 'Missing'}`);
      console.log(`    ${status.hooksExists ? chalk.green('') : chalk.red('')} Hooks:  ${status.hooksExists ? 'Found' : 'Missing'}`);
      console.log(`    ${status.mcpExists ? chalk.green('') : chalk.red('')} MCP:    ${status.mcpExists ? 'Found' : 'Missing'}`);
      console.log();

      console.log(chalk.dim('  Data:'));
      console.log(`    ${chalk.blue('')} Checkpoints: ${checkpointCount}`);
      console.log(`    ${chalk.blue('')} Tasks: ${taskCount}`);
      console.log(`    ${chalk.blue('')} Memory: ${status.memoryExists ? 'Active' : 'Not created'}`);
      console.log();
    } catch (error) {
      console.error(chalk.red('\n  Failed to get status:'), error);
      process.exit(1);
    }
  });

// ═══════════════════════════════════════════════════════════════
//                      DOCTOR COMMAND
// ═══════════════════════════════════════════════════════════════

program
  .command('doctor')
  .description('Check CCG configuration and diagnose issues')
  .action(async () => {
    const cwd = process.cwd();
    const issues: { level: 'error' | 'warning' | 'info'; message: string; fix?: string }[] = [];

    console.log(chalk.blue('\n  CCG Doctor - Checking configuration...\n'));

    // Check if initialized
    const ccgDir = join(cwd, '.ccg');
    if (!existsSync(ccgDir)) {
      issues.push({
        level: 'error',
        message: 'CCG is not initialized',
        fix: 'Run "ccg init" to initialize',
      });
    } else {
      // Check config.json
      const configPath = join(ccgDir, 'config.json');
      if (!existsSync(configPath)) {
        issues.push({
          level: 'error',
          message: 'Configuration file missing',
          fix: 'Run "ccg init --force" to recreate',
        });
      } else {
        try {
          const config = JSON.parse(readFileSync(configPath, 'utf-8'));
          if (!config.version) {
            issues.push({
              level: 'warning',
              message: 'Config missing version field',
              fix: 'Add "version": "1.0.0" to config.json',
            });
          }
        } catch (e) {
          issues.push({
            level: 'error',
            message: 'Config file has invalid JSON',
            fix: 'Fix JSON syntax in .ccg/config.json',
          });
        }
      }

      // Check hooks.json
      const hooksPath = join(cwd, '.claude', 'hooks.json');
      if (!existsSync(hooksPath)) {
        issues.push({
          level: 'warning',
          message: 'Hooks file missing',
          fix: 'Run "ccg init --force" to recreate',
        });
      } else {
        try {
          const hooks = JSON.parse(readFileSync(hooksPath, 'utf-8'));
          if (!hooks.hooks) {
            issues.push({
              level: 'warning',
              message: 'Hooks file missing "hooks" property',
              fix: 'Fix structure in .claude/hooks.json',
            });
          }
        } catch {
          issues.push({
            level: 'error',
            message: 'Hooks file has invalid JSON',
            fix: 'Fix JSON syntax in .claude/hooks.json',
          });
        }
      }

      // Check .mcp.json
      const mcpPath = join(cwd, '.mcp.json');
      if (!existsSync(mcpPath)) {
        issues.push({
          level: 'warning',
          message: 'MCP configuration missing',
          fix: 'Run "ccg init --force" to recreate',
        });
      } else {
        try {
          const mcp = JSON.parse(readFileSync(mcpPath, 'utf-8'));
          if (!mcp.mcpServers?.['claude-code-guardian']) {
            issues.push({
              level: 'warning',
              message: 'CCG not registered in MCP servers',
              fix: 'Add "claude-code-guardian" to .mcp.json mcpServers',
            });
          }
        } catch {
          issues.push({
            level: 'error',
            message: 'MCP file has invalid JSON',
            fix: 'Fix JSON syntax in .mcp.json',
          });
        }
      }

      // Check directories
      const requiredDirs = ['checkpoints', 'tasks', 'registry', 'logs'];
      for (const dir of requiredDirs) {
        if (!existsSync(join(ccgDir, dir))) {
          issues.push({
            level: 'info',
            message: `Directory ${dir} missing`,
            fix: `mkdir -p .ccg/${dir}`,
          });
        }
      }
    }

    // Display results
    if (issues.length === 0) {
      console.log(chalk.green('  All checks passed! CCG is properly configured.\n'));
      return;
    }

    const errors = issues.filter(i => i.level === 'error');
    const warnings = issues.filter(i => i.level === 'warning');
    const infos = issues.filter(i => i.level === 'info');

    if (errors.length > 0) {
      console.log(chalk.red(`  ${errors.length} Error(s):\n`));
      for (const issue of errors) {
        console.log(chalk.red(`    ${issue.message}`));
        if (issue.fix) {
          console.log(chalk.dim(`      Fix: ${issue.fix}`));
        }
      }
      console.log();
    }

    if (warnings.length > 0) {
      console.log(chalk.yellow(`  ${warnings.length} Warning(s):\n`));
      for (const issue of warnings) {
        console.log(chalk.yellow(`    ${issue.message}`));
        if (issue.fix) {
          console.log(chalk.dim(`      Fix: ${issue.fix}`));
        }
      }
      console.log();
    }

    if (infos.length > 0) {
      console.log(chalk.blue(`  ${infos.length} Info:\n`));
      for (const issue of infos) {
        console.log(chalk.blue(`    ${issue.message}`));
        if (issue.fix) {
          console.log(chalk.dim(`      Fix: ${issue.fix}`));
        }
      }
      console.log();
    }

    // Exit with error code if there are errors
    if (errors.length > 0) {
      process.exit(1);
    }
  });

// ═══════════════════════════════════════════════════════════════
//                      HOOK COMMAND
// ═══════════════════════════════════════════════════════════════

// Add hook command from hook-command.ts
program.addCommand(createHookCommand());

// ═══════════════════════════════════════════════════════════════
//                      CODE-OPTIMIZE COMMAND
// ═══════════════════════════════════════════════════════════════

const codeOptimizeCmd = program
  .command('code-optimize')
  .description('Analyze and optimize codebase (Quick Analysis preset)\n\n' +
    'Examples:\n' +
    '  ccg code-optimize              # Quick scan with defaults\n' +
    '  ccg code-optimize --report     # Generate markdown report\n' +
    '  ccg code-optimize --json       # Output as JSON\n\n' +
    'For advanced options, use: ccg code-optimize --help-advanced')
  .option('-r, --report', 'Generate optimization report')
  .option('-j, --json', 'Output results as JSON')
  .option('--help-advanced', 'Show advanced options for power users')
  // Advanced options (hidden from main help, but still functional)
  .addOption(new Option('-s, --strategy <strategy>', 'Scoring strategy (size, complexity, mixed)').default('mixed').hideHelp())
  .addOption(new Option('-m, --max-files <number>', 'Maximum files to scan').default('1000').hideHelp())
  .addOption(new Option('-t, --max-hotspots <number>', 'Maximum hotspots to return').default('20').hideHelp())
  .addOption(new Option('-o, --output <path>', 'Custom report output path').hideHelp())
  .addOption(new Option('--ci', 'CI mode - exit with error code if hotspots exceed threshold').hideHelp())
  .addOption(new Option('--threshold <number>', 'Hotspot score threshold for CI mode').default('50').hideHelp())
  .action(async (options: {
    report?: boolean;
    strategy?: string;
    maxFiles?: string;
    maxHotspots?: string;
    output?: string;
    json?: boolean;
    ci?: boolean;
    threshold?: string;
    helpAdvanced?: boolean;
  }) => {
    // Handle --help-advanced
    if (options.helpAdvanced) {
      console.log(chalk.blue('\n  CCG Code Optimizer - Advanced Options\n'));
      console.log('Usage: ccg code-optimize [options]\n');
      console.log('Basic Options:');
      console.log('  -r, --report                    Generate optimization report');
      console.log('  -j, --json                      Output results as JSON');
      console.log('  --help-advanced                 Show this help\n');
      console.log('Advanced Options (for power users):');
      console.log('  -s, --strategy <strategy>       Scoring strategy: size, complexity, or mixed (default: mixed)');
      console.log('  -m, --max-files <number>        Maximum files to scan (default: 1000)');
      console.log('  -t, --max-hotspots <number>     Maximum hotspots to return (default: 20)');
      console.log('  -o, --output <path>             Custom report output path');
      console.log('  --ci                            CI mode - exit with error if hotspots exceed threshold');
      console.log('  --threshold <number>            Hotspot score threshold for CI mode (default: 50)\n');
      console.log('Examples:');
      console.log('  ccg code-optimize --strategy size --max-files 5000');
      console.log('  ccg code-optimize --ci --threshold 70');
      console.log('  ccg code-optimize --report --output custom-report.md\n');
      return;
    }

    const cwd = process.cwd();
    const ccgDir = join(cwd, '.ccg');

    if (!existsSync(ccgDir)) {
      console.error(chalk.red('\n  CCG not initialized. Run "ccg init" first.\n'));
      process.exit(1);
    }

    console.log(chalk.blue('\n  CCG Code Optimizer\n'));
    console.log(chalk.dim('  ═'.repeat(25)));

    try {
      // Dynamic import to avoid loading heavy modules
      const { EventBus } = await import('../core/event-bus.js');
      const { Logger } = await import('../core/logger.js');
      const { CodeOptimizerService } = await import('../modules/code-optimizer/code-optimizer.service.js');

      const eventBus = new EventBus();
      const logger = new Logger('info', 'code-optimize');
      const service = new CodeOptimizerService({}, eventBus, logger, cwd);
      await service.initialize();

      // Run quick analysis
      console.log(chalk.dim('\n  Scanning repository...'));
      const result = await service.quickAnalysis({
        maxFiles: parseInt(options.maxFiles || '1000', 10),
        maxHotspots: parseInt(options.maxHotspots || '20', 10),
        strategy: (options.strategy as 'size' | 'complexity' | 'mixed') || 'mixed',
      });

      // Output results
      if (options.json) {
        console.log(JSON.stringify({
          scan: {
            totalFiles: result.scan.totalFiles,
            totalLines: result.scan.totalLinesApprox,
          },
          metrics: {
            filesAnalyzed: result.metrics.files.length,
            avgComplexity: result.metrics.aggregate.avgComplexityScore,
          },
          hotspots: result.hotspots.hotspots,
          summary: result.hotspots.summary,
        }, null, 2));
      } else {
        console.log();
        console.log(chalk.cyan('  SCAN RESULTS'));
        console.log(`    Files: ${result.scan.totalFiles.toLocaleString()}`);
        console.log(`    Lines: ~${result.scan.totalLinesApprox.toLocaleString()}`);
        console.log();
        console.log(chalk.cyan('  METRICS'));
        console.log(`    Analyzed: ${result.metrics.files.length} source files`);
        console.log(`    Avg Complexity: ${result.metrics.aggregate.avgComplexityScore.toFixed(1)}`);
        console.log(`    TODOs: ${result.metrics.aggregate.totalTodos}`);
        console.log(`    FIXMEs: ${result.metrics.aggregate.totalFixmes}`);
        console.log();
        console.log(chalk.cyan('  HOTSPOTS'));
        console.log(`    Found: ${result.hotspots.summary.hotspotsFound}`);
        console.log(`    Top Reason: ${result.hotspots.summary.topReason}`);
        console.log();

        // List top 5 hotspots
        for (const h of result.hotspots.hotspots.slice(0, 5)) {
          const scoreColor = h.score > 70 ? chalk.red : h.score > 50 ? chalk.yellow : chalk.green;
          console.log(`    ${chalk.dim(`#${h.rank}`)} ${scoreColor(`[${h.score.toFixed(0)}]`)} ${h.path}`);
          console.log(chalk.dim(`       ${h.suggestedGoal}: ${h.reasons.slice(0, 2).join(', ')}`));
        }

        if (result.hotspots.hotspots.length > 5) {
          console.log(chalk.dim(`    ... and ${result.hotspots.hotspots.length - 5} more`));
        }
      }

      // Generate report if requested
      if (options.report) {
        console.log(chalk.dim('\n  Generating report...'));
        const sessionId = `cli-${Date.now()}`;
        const reportResult = service.generateReport({
          sessionId,
          strategy: (options.strategy as 'size' | 'complexity' | 'mixed') || 'mixed',
          scanResult: result.scan,
          metricsBefore: result.metrics,
          hotspots: result.hotspots,
          outputPath: options.output,
        });

        console.log(chalk.green(`\n  Report saved: ${reportResult.reportPath}`));
      }

      // CI mode - check thresholds
      if (options.ci) {
        const threshold = parseInt(options.threshold || '50', 10);
        const highScoreHotspots = result.hotspots.hotspots.filter(h => h.score >= threshold);

        if (highScoreHotspots.length > 0) {
          console.log(chalk.red(`\n  CI CHECK FAILED: ${highScoreHotspots.length} hotspots above threshold (${threshold})`));
          process.exit(1);
        } else {
          console.log(chalk.green(`\n  CI CHECK PASSED: No hotspots above threshold (${threshold})`));
        }
      }

      console.log();
      await service.shutdown();
    } catch (error) {
      console.error(chalk.red('\n  Error:'), error);
      process.exit(1);
    }
  });

// ═══════════════════════════════════════════════════════════════
//                      HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function findTemplateDir(): string {
  // Try multiple possible locations for templates
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

  return possiblePaths[0]; // Return first path even if doesn't exist
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
      memory: {
        enabled: true,
        maxItems: 1000,
        autoSave: true,
        persistPath: '.ccg/memory.db',
        compressionEnabled: true,
      },
      guard: {
        enabled: true,
        strictMode: false,
        rules: {
          blockFakeTests: true,
          blockDisabledFeatures: true,
          blockEmptyCatch: true,
          blockEmojiInCode: true,
          blockSwallowedExceptions: true,
        },
      },
      process: {
        enabled: true,
        ports: { dev: 3000, preview: 5173 },
        autoKillOnConflict: false,
        trackSpawnedProcesses: true,
      },
      resource: {
        enabled: true,
        checkpoints: {
          auto: true,
          thresholds: [70, 85, 95],
          maxCheckpoints: 10,
          compressOld: true,
        },
        warningThreshold: 70,
        pauseThreshold: 95,
      },
      workflow: {
        enabled: true,
        autoTrackTasks: true,
        requireTaskForLargeChanges: true,
        largeChangeThreshold: 100,
      },
      testing: {
        enabled: true,
        autoRun: false,
        testCommand: 'npm test',
        browser: {
          enabled: false,
          headless: true,
          captureConsole: true,
          captureNetwork: false,
          screenshotOnError: true,
        },
        cleanup: {
          autoCleanTestData: true,
          testDataPrefix: 'test_',
          testDataLocations: ['./test-data'],
        },
      },
      documents: {
        enabled: true,
        locations: {
          docs: 'docs',
          readme: '.',
          api: 'docs/api',
        },
        updateInsteadOfCreate: true,
        namingConvention: 'kebab-case',
      },
    },
    notifications: {
      showInline: true,
      showStatusBar: true,
      verbosity: 'normal',
      sound: {
        enabled: false,
        criticalOnly: true,
      },
    },
    conventions: {
      fileNaming: 'kebab-case',
      componentNaming: 'PascalCase',
      variableNaming: 'camelCase',
    },
  };
}

function getDefaultHooksConfig(): Record<string, unknown> {
  return {
    hooks: {
      SessionStart: [
        {
          type: 'command',
          command: 'npx @anthropic-community/claude-code-guardian hook session-start',
        },
      ],
      PreToolCall: [
        {
          type: 'command',
          command: 'npx @anthropic-community/claude-code-guardian hook pre-tool $TOOL_NAME',
          filter: {
            tools: ['write_file', 'edit_file', 'bash', 'create_file'],
          },
        },
      ],
      PostToolCall: [
        {
          type: 'command',
          command: 'npx @anthropic-community/claude-code-guardian hook post-tool $TOOL_NAME',
          filter: {
            tools: ['write_file', 'edit_file', 'create_file'],
          },
        },
      ],
      Stop: [
        {
          type: 'command',
          command: 'npx @anthropic-community/claude-code-guardian hook session-end',
        },
      ],
    },
  };
}

// ═══════════════════════════════════════════════════════════════
//                      ACTIVATE COMMAND
// ═══════════════════════════════════════════════════════════════

program.addCommand(createActivateCommand());

// ═══════════════════════════════════════════════════════════════
//                      RUN CLI
// ═══════════════════════════════════════════════════════════════

program.parse();
