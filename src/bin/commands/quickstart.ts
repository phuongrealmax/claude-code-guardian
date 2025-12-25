// src/bin/commands/quickstart.ts

/**
 * Quickstart Command
 *
 * Extracted from ccg.ts to reduce file size and improve maintainability.
 * Provides interactive setup and analysis for new users.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { join, basename } from 'path';
import { existsSync, mkdirSync, copyFileSync, writeFileSync, readFileSync } from 'fs';
import {
  MultiRepoConfigManager,
  isMultiRepoEnabled,
  getEffectiveRepoName,
} from '../../core/multi-repo-config.js';

interface QuickstartOptions {
  repo?: string;
}

export function createQuickstartCommand(findTemplateDir: () => string): Command {
  const command = new Command('quickstart')
    .description('Interactive setup and analysis for new users (< 3 minutes)')
    .option('--repo <name>', 'Target a specific repository (requires .ccg/config.yml)')
    .action(async (options: QuickstartOptions) => {
      await executeQuickstart(options, findTemplateDir);
    });

  return command;
}

async function executeQuickstart(
  options: QuickstartOptions,
  findTemplateDir: () => string
): Promise<void> {
  const cwd = process.cwd();
  const ccgDir = join(cwd, '.ccg');

  // Handle multi-repo mode
  const { targetPath, repoName } = resolveRepository(options, cwd);

  console.log(chalk.blue('\n  ⚡ CCG Quickstart - Get started in 3 minutes!\n'));
  console.log(chalk.dim('  This will guide you through your first code analysis.\n'));

  try {
    // Step 1: Auto-initialize if needed
    if (!existsSync(ccgDir)) {
      await initializeProject(cwd, findTemplateDir);
    } else {
      console.log(chalk.green('  ✓ CCG already initialized\n'));
    }

    // Step 2: Run code analysis
    console.log(chalk.blue('  Starting Quick Analysis...\n'));
    console.log(chalk.dim('  Scanning your codebase for optimization opportunities...\n'));

    const { EventBus } = await import('../../core/event-bus.js');
    const { Logger } = await import('../../core/logger.js');
    const { CodeOptimizerService } = await import('../../modules/code-optimizer/code-optimizer.service.js');

    const eventBus = new EventBus();
    const logger = new Logger('info', 'quickstart');
    const service = new CodeOptimizerService({}, eventBus, logger, targetPath);
    await service.initialize();

    const result = await service.quickAnalysis({
      maxFiles: 1000,
      maxHotspots: 20,
      strategy: 'mixed',
    });

    displayResults(result);

    // Step 3: Generate report
    console.log(chalk.dim('  Generating detailed report...\n'));

    const sessionId = `quickstart-${Date.now()}`;
    const reportResult = service.generateReport({
      sessionId,
      repoName,
      strategy: 'mixed',
      scanResult: result.scan,
      metricsBefore: result.metrics,
      hotspots: result.hotspots,
    });

    console.log(chalk.green(`  ✓ Report saved: ${chalk.cyan(reportResult.reportPath)}\n`));

    // Step 4: Next steps
    displayNextSteps(reportResult.reportPath);

    await service.shutdown();
  } catch (error) {
    console.error(chalk.red('\n  Quickstart failed:'), error);
    console.log(chalk.yellow('\n  Try running ') + chalk.cyan('ccg init') + chalk.yellow(' and ') + chalk.cyan('ccg code-optimize --report') + chalk.yellow(' separately.\n'));
    process.exit(1);
  }
}

function resolveRepository(options: QuickstartOptions, cwd: string): { targetPath: string; repoName: string } {
  let targetPath = cwd;
  let repoName = basename(cwd);

  if (options.repo || isMultiRepoEnabled(cwd)) {
    const multiRepoManager = new MultiRepoConfigManager(cwd);

    if (!multiRepoManager.exists()) {
      if (options.repo) {
        console.log(chalk.red('\n  Error: --repo flag requires .ccg/config.yml'));
        console.log(`  Run ${chalk.cyan('ccg init --multi-repo')} to create one.\n`);
        process.exit(1);
      }
    } else {
      const effectiveRepoName = getEffectiveRepoName(options.repo, cwd);

      if (!effectiveRepoName) {
        console.log(chalk.red(`\n  Error: Repository "${options.repo}" not found in config.yml`));
        console.log(`  Available repos: ${multiRepoManager.getRepoNames().join(', ')}\n`);
        process.exit(1);
      }

      const resolvedRepo = multiRepoManager.getRepo(effectiveRepoName);
      if (!resolvedRepo) {
        console.log(chalk.red(`\n  Error: Failed to resolve repository "${effectiveRepoName}"`));
        process.exit(1);
      }

      if (!resolvedRepo.exists) {
        console.log(chalk.red(`\n  Error: Repository path does not exist: ${resolvedRepo.absolutePath}`));
        process.exit(1);
      }

      targetPath = resolvedRepo.absolutePath;
      repoName = effectiveRepoName;
      console.log(chalk.blue(`\n  Using repository: ${chalk.cyan(repoName)} (${resolvedRepo.relativePath})\n`));
    }
  }

  return { targetPath, repoName };
}

async function initializeProject(cwd: string, findTemplateDir: () => string): Promise<void> {
  console.log(chalk.yellow('  Setting up CCG in this project...\n'));

  const ccgDir = join(cwd, '.ccg');
  const directories = [
    ccgDir,
    join(ccgDir, 'checkpoints'),
    join(ccgDir, 'tasks'),
    join(ccgDir, 'registry'),
    join(ccgDir, 'logs'),
    join(ccgDir, 'screenshots'),
    join(cwd, '.claude'),
    join(cwd, '.claude', 'commands'),
  ];

  for (const dir of directories) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  // Create minimal config
  const templateDir = findTemplateDir();
  const configSource = join(templateDir, 'config.standard.json');
  const configFallback = join(templateDir, 'config.template.json');
  const configTarget = join(ccgDir, 'config.json');

  if (existsSync(configSource)) {
    copyFileSync(configSource, configTarget);
  } else if (existsSync(configFallback)) {
    copyFileSync(configFallback, configTarget);
  } else {
    const defaultConfig = {
      version: '1.0.0',
      rules: { enabled: true },
      memory: { enabled: true },
      workflow: { enabled: true },
    };
    writeFileSync(configTarget, JSON.stringify(defaultConfig, null, 2));
  }

  // Create hooks.json
  const hooksPath = join(cwd, '.claude', 'hooks.json');
  if (!existsSync(hooksPath)) {
    const hooksContent = { 'user-prompt-submit': '' };
    writeFileSync(hooksPath, JSON.stringify(hooksContent, null, 2));
  }

  // Create slash command
  const ccgCommandPath = join(cwd, '.claude', 'commands', 'ccg.md');
  if (!existsSync(ccgCommandPath)) {
    const ccgCommandContent = '# CCG Dashboard\n\nShow the CCG status dashboard.\n\n```bash\nccg status\n```';
    writeFileSync(ccgCommandPath, ccgCommandContent);
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

  if (!mcpConfig.mcpServers['code-guardian']) {
    mcpConfig.mcpServers['code-guardian'] = {
      command: 'node',
      args: [join(cwd, 'node_modules', 'codeguardian-studio', 'dist', 'index.js')],
    };
    writeFileSync(mcpPath, JSON.stringify(mcpConfig, null, 2));
  }

  console.log(chalk.green('  ✓ CCG initialized\n'));
}

function displayResults(result: any): void {
  const avgComplexity = result.metrics.aggregate.avgComplexityScore;

  console.log(chalk.blue('  ═════════════════════════════════════════════════\n'));
  console.log(chalk.bold('  ANALYSIS COMPLETE\n'));
  console.log(`  Files analyzed: ${chalk.cyan(result.metrics.files.length)}`);
  console.log(`  Avg complexity: ${chalk.cyan(avgComplexity.toFixed(1))}`);
  console.log(`  Hotspots found: ${chalk.cyan(result.hotspots.hotspots.length)}`);

  if (result.hotspots.hotspots.length > 0) {
    console.log(`\n  ${chalk.yellow('⚠')}  Top issues to address:\n`);
    result.hotspots.hotspots.slice(0, 3).forEach((h: any, i: number) => {
      console.log(`    ${i + 1}. ${chalk.dim(h.path)}`);
      console.log(`       ${chalk.yellow(h.reasons[0])}\n`);
    });
  } else {
    console.log(chalk.green('\n  ✓ No major hotspots detected - your code looks good!\n'));
  }

  console.log(chalk.blue('  ═════════════════════════════════════════════════\n'));
}

function displayNextSteps(reportPath: string): void {
  console.log(chalk.blue('  NEXT STEPS:\n'));
  console.log(`    1. ${chalk.cyan('Open the report:')} ${reportPath}`);
  console.log(`    2. ${chalk.cyan('Start fixing hotspots')} (highest score first)`);
  console.log(`    3. ${chalk.cyan('Run analysis again')} to track improvement\n`);
  console.log(chalk.dim('  Tip: Use ') + chalk.cyan('ccg code-optimize --help') + chalk.dim(' for more options\n'));
}
