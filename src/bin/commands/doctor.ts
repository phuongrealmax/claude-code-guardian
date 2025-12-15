// src/bin/commands/doctor.ts

/**
 * Doctor Command
 *
 * Extracted from ccg.ts to reduce file size and improve maintainability.
 * Checks CCG configuration and diagnoses issues.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

interface Issue {
  level: 'error' | 'warning' | 'info';
  message: string;
  fix?: string;
}

export function createDoctorCommand(): Command {
  const command = new Command('doctor')
    .description('Check CCG configuration and diagnose issues')
    .action(async () => {
      await executeDoctor();
    });

  return command;
}

async function executeDoctor(): Promise<void> {
  const cwd = process.cwd();
  const issues: Issue[] = [];

  console.log(chalk.blue('\n  CCG Doctor - Checking configuration...\n'));

  const ccgDir = join(cwd, '.ccg');

  if (!existsSync(ccgDir)) {
    issues.push({
      level: 'error',
      message: 'CCG is not initialized',
      fix: 'Run "ccg init" to initialize',
    });
  } else {
    checkConfigFile(ccgDir, issues);
    checkHooksFile(cwd, issues);
    checkMcpFile(cwd, issues);
    checkDirectories(ccgDir, issues);
  }

  displayResults(issues);
}

function checkConfigFile(ccgDir: string, issues: Issue[]): void {
  const configPath = join(ccgDir, 'config.json');

  if (!existsSync(configPath)) {
    issues.push({
      level: 'error',
      message: 'Configuration file missing',
      fix: 'Run "ccg init --force" to recreate',
    });
    return;
  }

  try {
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    if (!config.version) {
      issues.push({
        level: 'warning',
        message: 'Config missing version field',
        fix: 'Add "version": "1.0.0" to config.json',
      });
    }
  } catch {
    issues.push({
      level: 'error',
      message: 'Config file has invalid JSON',
      fix: 'Fix JSON syntax in .ccg/config.json',
    });
  }
}

function checkHooksFile(cwd: string, issues: Issue[]): void {
  const hooksPath = join(cwd, '.claude', 'hooks.json');

  if (!existsSync(hooksPath)) {
    issues.push({
      level: 'warning',
      message: 'Hooks file missing',
      fix: 'Run "ccg init --force" to recreate',
    });
    return;
  }

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

function checkMcpFile(cwd: string, issues: Issue[]): void {
  const mcpPath = join(cwd, '.mcp.json');

  if (!existsSync(mcpPath)) {
    issues.push({
      level: 'warning',
      message: 'MCP configuration missing',
      fix: 'Run "ccg init --force" to recreate',
    });
    return;
  }

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

function checkDirectories(ccgDir: string, issues: Issue[]): void {
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

function displayResults(issues: Issue[]): void {
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

  if (errors.length > 0) {
    process.exit(1);
  }
}
