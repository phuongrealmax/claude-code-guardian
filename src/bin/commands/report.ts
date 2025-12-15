// src/bin/commands/report.ts

/**
 * Report Command
 *
 * Extracted from ccg.ts to reduce file size and improve maintainability.
 * Provides session history and Tech Debt trend viewing.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { join, basename } from 'path';
import { existsSync } from 'fs';
import {
  MultiRepoConfigManager,
  isMultiRepoEnabled,
} from '../../core/multi-repo-config.js';

interface ReportOptions {
  summary?: boolean;
  trend?: boolean;
  count?: string;
  json?: boolean;
  repo?: string;
}

export function createReportCommand(): Command {
  const command = new Command('report')
    .description('View session history and Tech Debt trends (Team tier)')
    .option('-s, --summary', 'Show one-line summary per session')
    .option('-t, --trend', 'Show Tech Debt Index trend')
    .option('-n, --count <number>', 'Number of sessions to show', '5')
    .option('--repo <name>', 'Filter by repository name (requires .ccg/config.yml)')
    .option('-j, --json', 'Output as JSON')
    .action(async (options: ReportOptions) => {
      await executeReport(options);
    });

  return command;
}

async function executeReport(options: ReportOptions): Promise<void> {
  const cwd = process.cwd();
  const ccgDir = join(cwd, '.ccg');

  if (!existsSync(ccgDir)) {
    console.log(chalk.yellow('\n  CCG is not initialized in this project.'));
    console.log(`  Run ${chalk.cyan('ccg init')} to get started.\n`);
    return;
  }

  try {
    const { SessionStorage } = await import('../../modules/code-optimizer/session-storage.js');
    const sessionStorage = new SessionStorage(cwd);
    const count = parseInt(options.count || '5', 10);

    // Handle multi-repo mode
    const repoName = resolveRepoName(options, cwd);

    const { sessions, total } = sessionStorage.listSessions({ repoName, limit: count });

    if (sessions.length === 0) {
      console.log(chalk.yellow('\n  No analysis sessions found.'));
      console.log(`  Run ${chalk.cyan('ccg code-optimize --report')} to create one.\n`);
      return;
    }

    if (options.json) {
      outputJson(options, sessionStorage, repoName, count, sessions, total);
      return;
    }

    console.log(chalk.blue('\n  CCG Report - Session History\n'));
    if (options.repo || isMultiRepoEnabled(cwd)) {
      console.log(chalk.dim(`  Repository: ${repoName}\n`));
    }

    if (options.trend) {
      showTrendChart(sessionStorage, repoName, count);
    } else if (options.summary) {
      showSummaryTable(sessions, total, count);
    } else {
      showLatestSession(sessions);
    }

    console.log();
  } catch (error) {
    console.error(chalk.red('\n  Error:'), error);
    process.exit(1);
  }
}

function resolveRepoName(options: ReportOptions, cwd: string): string {
  let repoName = basename(cwd);

  if (options.repo || isMultiRepoEnabled(cwd)) {
    const multiRepoManager = new MultiRepoConfigManager(cwd);

    if (multiRepoManager.exists()) {
      if (options.repo) {
        if (!multiRepoManager.hasRepo(options.repo)) {
          console.log(chalk.red(`\n  Error: Repository "${options.repo}" not found in config.yml`));
          console.log(`  Available repos: ${multiRepoManager.getRepoNames().join(', ')}\n`);
          process.exit(1);
        }
        repoName = options.repo;
      } else {
        const defaultRepo = multiRepoManager.getDefaultRepo();
        if (defaultRepo) {
          repoName = defaultRepo.name;
        }
      }
    } else if (options.repo) {
      console.log(chalk.red('\n  Error: --repo flag requires .ccg/config.yml'));
      console.log(`  Run ${chalk.cyan('ccg init --multi-repo')} to create one.\n`);
      process.exit(1);
    }
  }

  return repoName;
}

function outputJson(
  options: ReportOptions,
  sessionStorage: any,
  repoName: string,
  count: number,
  sessions: any[],
  total: number
): void {
  if (options.trend) {
    const trend = sessionStorage.getTrend(repoName, count);
    console.log(JSON.stringify(trend, null, 2));
  } else {
    console.log(JSON.stringify({
      total,
      sessions: sessions.map(s => ({
        sessionId: s.sessionId,
        date: new Date(s.timestamp).toISOString(),
        techDebtIndex: s.summary.techDebtIndex,
        hotspots: s.summary.totalHotspots,
        avgComplexity: s.summary.avgComplexity,
        filesAnalyzed: s.summary.filesAnalyzed,
      })),
    }, null, 2));
  }
}

function showTrendChart(sessionStorage: any, repoName: string, count: number): void {
  const trend = sessionStorage.getTrend(repoName, count);

  console.log(chalk.cyan('  Tech Debt Index Trend'));
  console.log(chalk.dim('  ─'.repeat(25)));

  if (trend.sessions.length < 2) {
    console.log(chalk.yellow('\n  Not enough data for trend. Run more analyses.\n'));
  } else {
    const maxIndex = Math.max(...trend.sessions.map((s: any) => s.techDebtIndex), 100);
    const barWidth = 20;

    for (const session of trend.sessions) {
      const barLength = Math.round((session.techDebtIndex / maxIndex) * barWidth);
      const bar = '█'.repeat(barLength) + '░'.repeat(barWidth - barLength);
      const grade = getGradeLetter(session.techDebtIndex);
      const color = session.techDebtIndex <= 40 ? chalk.green :
                    session.techDebtIndex <= 60 ? chalk.yellow : chalk.red;
      console.log(`  ${session.date.padEnd(12)} ${color(bar)} ${session.techDebtIndex.toString().padStart(3)} (${grade})`);
    }

    console.log(chalk.dim('  ─'.repeat(25)));

    const trendArrow = trend.trend === 'improving' ? chalk.green('↓') :
                       trend.trend === 'degrading' ? chalk.red('↑') : chalk.gray('→');
    const trendLabel = trend.trend === 'improving' ? chalk.green('Improving') :
                       trend.trend === 'degrading' ? chalk.red('Degrading') : chalk.gray('Stable');
    console.log(`  Trend: ${trendArrow} ${trendLabel} (${trend.indexDelta > 0 ? '+' : ''}${trend.indexDelta.toFixed(0)})`);
  }
}

function showSummaryTable(sessions: any[], total: number, count: number): void {
  console.log(chalk.cyan('  Session Summary'));
  console.log(chalk.dim('  ─'.repeat(40)));
  console.log(chalk.dim('  Date         Index  Grade  Hotspots  Complexity'));

  for (const session of sessions) {
    const date = new Date(session.timestamp).toLocaleDateString().padEnd(12);
    const index = (session.summary.techDebtIndex ?? 0).toString().padStart(5);
    const grade = getGradeLetter(session.summary.techDebtIndex ?? 0).padEnd(5);
    const hotspots = session.summary.totalHotspots.toString().padStart(8);
    const complexity = session.summary.avgComplexity.toFixed(1).padStart(10);

    const color = (session.summary.techDebtIndex ?? 100) <= 40 ? chalk.green :
                  (session.summary.techDebtIndex ?? 100) <= 60 ? chalk.yellow : chalk.red;
    console.log(`  ${date} ${color(index)}  ${grade} ${hotspots}  ${complexity}`);
  }

  if (total > count) {
    console.log(chalk.dim(`\n  Showing ${count} of ${total} sessions. Use --count to see more.`));
  }
}

function showLatestSession(sessions: any[]): void {
  const latest = sessions[0];
  const index = latest.summary.techDebtIndex ?? 0;
  const grade = getGradeLetter(index);
  const gradeColor = index <= 40 ? chalk.green : index <= 60 ? chalk.yellow : chalk.red;

  console.log(chalk.cyan('  Latest Session'));
  console.log(chalk.dim('  ─'.repeat(25)));
  console.log(`  Date:          ${new Date(latest.timestamp).toLocaleString()}`);
  console.log(`  Session ID:    ${chalk.dim(latest.sessionId)}`);
  console.log(`  Tech Debt:     ${gradeColor(`${index}/100 (Grade ${grade})`)}`);
  console.log(`  Hotspots:      ${latest.summary.totalHotspots}`);
  console.log(`  Avg Complexity: ${latest.summary.avgComplexity.toFixed(1)}`);
  console.log(`  Files:         ${latest.summary.filesAnalyzed}`);
  console.log(`  Lines:         ~${latest.summary.linesOfCode.toLocaleString()}`);

  if (sessions.length > 1) {
    const prev = sessions[1];
    const prevIndex = prev.summary.techDebtIndex ?? 0;
    const delta = index - prevIndex;
    const deltaText = delta < 0 ? chalk.green(`↓ ${Math.abs(delta)} improved`) :
                     delta > 0 ? chalk.red(`↑ ${delta} increased`) :
                     chalk.gray('→ unchanged');
    console.log(`\n  Change:        ${deltaText}`);
  }

  console.log(chalk.dim('\n  Use --summary for session list, --trend for chart\n'));
}

export function getGradeLetter(index: number): string {
  if (index <= 20) return 'A';
  if (index <= 40) return 'B';
  if (index <= 60) return 'C';
  if (index <= 80) return 'D';
  return 'F';
}
