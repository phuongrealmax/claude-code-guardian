// src/bin/commands/dogfood-report.ts

/**
 * Dogfood Report Command
 *
 * Extracted from ccg.ts to reduce file size and improve maintainability.
 * Generates internal case studies from session history for validation/analytics.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { join } from 'path';
import { existsSync } from 'fs';
import {
  MultiRepoConfigManager,
  isMultiRepoEnabled,
} from '../../core/multi-repo-config.js';

interface DogfoodReportOptions {
  repo?: string;
  limit?: string;
  output?: string;
  summary?: boolean;
  json?: boolean;
}

export function createDogfoodReportCommand(): Command {
  const command = new Command('dogfood-report')
    .description('Generate internal case study from session history (for validation/analytics)')
    .option('--repo <name>', 'Target repository name (uses defaultRepo if not specified)')
    .option('-n, --limit <number>', 'Maximum sessions to analyze', '50')
    .option('-o, --output <path>', 'Custom output path for the case study')
    .option('-s, --summary', 'Print summary to console instead of generating report')
    .option('-j, --json', 'Output aggregated analysis as JSON')
    .action(async (options: DogfoodReportOptions) => {
      await executeDogfoodReport(options);
    });

  return command;
}

async function executeDogfoodReport(options: DogfoodReportOptions): Promise<void> {
  const cwd = process.cwd();
  const ccgDir = join(cwd, '.ccg');

  if (!existsSync(ccgDir)) {
    console.log(chalk.yellow('\n  CCG is not initialized in this project.'));
    console.log(`  Run ${chalk.cyan('ccg init')} to get started.\n`);
    return;
  }

  try {
    const { DogfoodReporter } = await import('../../core/dogfood-reporter.js');
    const reporter = new DogfoodReporter(cwd);

    // Handle multi-repo mode
    let repoName: string | undefined = options.repo;

    if (!repoName && isMultiRepoEnabled(cwd)) {
      const multiRepoManager = new MultiRepoConfigManager(cwd);
      const defaultRepo = multiRepoManager.getDefaultRepo();
      if (defaultRepo) {
        repoName = defaultRepo.name;
      }
    }

    const limit = parseInt(options.limit || '50', 10);

    // Get aggregated analysis
    const analysis = reporter.getAggregatedAnalysis(repoName, limit);

    if (!analysis) {
      console.log(chalk.yellow('\n  No sessions found for the specified repository.'));
      console.log(`  Run ${chalk.cyan('ccg code-optimize --report')} to create analysis sessions.\n`);
      return;
    }

    // Handle different output modes
    if (options.json) {
      console.log(JSON.stringify(analysis, null, 2));
      return;
    }

    if (options.summary) {
      reporter.printSummary(analysis);
      return;
    }

    // Generate case study report
    console.log(chalk.blue('\n  Generating Dogfood Case Study...\n'));

    const result = reporter.generateCaseStudy({
      repoName,
      limit,
      outputPath: options.output,
      includeHistory: true,
    });

    if (!result) {
      console.log(chalk.red('\n  Failed to generate case study.\n'));
      process.exit(1);
    }

    // Print summary
    console.log(chalk.green(`  Case study generated: ${result.outputPath}\n`));

    // Quick stats
    const { techDebtIndex, hotspots } = analysis;
    console.log(chalk.dim('  Quick Summary:'));
    console.log(`    Sessions:    ${analysis.totalSessions}`);
    console.log(`    Time span:   ${analysis.timeSpan.durationDays} days`);
    console.log(`    TDI change:  ${techDebtIndex.initial} -> ${techDebtIndex.latest} (${techDebtIndex.delta > 0 ? '+' : ''}${techDebtIndex.delta})`);
    console.log(`    Grade:       ${techDebtIndex.initialGrade} -> ${techDebtIndex.latestGrade}`);
    console.log(`    Hotspots:    ${hotspots.initialCount} -> ${hotspots.latestCount}`);
    console.log(`    Trend:       ${techDebtIndex.trend}`);
    console.log();

  } catch (error) {
    console.error(chalk.red('\n  Error:'), error);
    process.exit(1);
  }
}
