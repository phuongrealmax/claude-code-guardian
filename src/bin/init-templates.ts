// src/bin/init-templates.ts

/**
 * CCG Template Initialization
 *
 * This module handles copying templates and initializing CCG in a project.
 * Used by the `ccg init` command.
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import chalk from 'chalk';

// ═══════════════════════════════════════════════════════════════
//                      TYPES
// ═══════════════════════════════════════════════════════════════

export interface InitOptions {
  projectName?: string;
  projectType?: 'typescript-react' | 'typescript-node' | 'javascript' | 'python' | 'other';
  force?: boolean;
  minimal?: boolean;
  strict?: boolean;
  frontend?: boolean;
}

// ═══════════════════════════════════════════════════════════════
//                      MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Initialize CCG in the target directory
 */
export function initializeProject(targetDir: string, options: InitOptions = {}): void {
  const templatesDir = findTemplatesDir();

  console.log(chalk.blue('\n  Initializing Claude Code Guardian\n'));

  // Determine config template
  let configTemplate = 'config.template.json';
  if (options.minimal) {
    configTemplate = 'examples/config-minimal.json';
  } else if (options.strict) {
    configTemplate = 'examples/config-strict.json';
  } else if (options.frontend) {
    configTemplate = 'examples/config-frontend.json';
  }

  // Create directories
  const dirs = [
    '.ccg',
    '.ccg/checkpoints',
    '.ccg/tasks',
    '.ccg/registry',
    '.ccg/logs',
    '.ccg/screenshots',
    '.claude',
    '.claude/commands',
  ];

  for (const dir of dirs) {
    const fullPath = join(targetDir, dir);
    if (!existsSync(fullPath)) {
      mkdirSync(fullPath, { recursive: true });
      console.log(chalk.gray(`  Created ${dir}/`));
    }
  }

  // Copy and customize config
  const configSourcePath = join(templatesDir, configTemplate);
  if (existsSync(configSourcePath)) {
    const configContent = readFileSync(configSourcePath, 'utf-8');
    let config = JSON.parse(configContent);

    // Customize config
    if (options.projectName) {
      config.project.name = options.projectName;
    }
    if (options.projectType) {
      config.project.type = options.projectType;
    }

    writeFile(join(targetDir, '.ccg', 'config.json'), JSON.stringify(config, null, 2), options.force);
    console.log(chalk.green('  Created .ccg/config.json'));
  } else {
    console.log(chalk.yellow('  Warning: Config template not found'));
  }

  // Copy hooks
  copyTemplate(templatesDir, targetDir, 'hooks.template.json', '.claude/hooks.json', options.force);
  console.log(chalk.green('  Created .claude/hooks.json'));

  // Copy slash commands
  const commands = [
    'ccg.md',
    'ccg-task.md',
    'ccg-memory.md',
    'ccg-guard.md',
    'ccg-test.md',
    'ccg-process.md',
  ];

  for (const cmd of commands) {
    const success = copyTemplate(
      templatesDir,
      targetDir,
      `commands/${cmd}`,
      `.claude/commands/${cmd}`,
      options.force
    );
    if (!success) {
      console.log(chalk.yellow(`  Warning: Command template ${cmd} not found`));
    }
  }
  console.log(chalk.green('  Created slash commands'));

  // Copy CLAUDE.md
  copyTemplate(templatesDir, targetDir, 'CLAUDE.md', 'CLAUDE.md', options.force);
  console.log(chalk.green('  Created CLAUDE.md'));

  // Create or update .mcp.json
  const mcpPath = join(targetDir, '.mcp.json');
  if (existsSync(mcpPath) && !options.force) {
    // Try to add CCG to existing config
    try {
      const existingMcp = JSON.parse(readFileSync(mcpPath, 'utf-8'));
      if (!existingMcp.mcpServers) {
        existingMcp.mcpServers = {};
      }
      if (!existingMcp.mcpServers['code-guardian']) {
        existingMcp.mcpServers['code-guardian'] = {
          command: 'npx',
          args: ['@anthropic-community/code-guardian'],
        };
        writeFileSync(mcpPath, JSON.stringify(existingMcp, null, 2));
        console.log(chalk.green('  Updated .mcp.json'));
      } else {
        console.log(chalk.dim('  .mcp.json already has CCG configured'));
      }
    } catch {
      console.log(chalk.yellow('  Warning: Could not update .mcp.json'));
    }
  } else {
    copyTemplate(templatesDir, targetDir, 'mcp.template.json', '.mcp.json', options.force);
    console.log(chalk.green('  Created .mcp.json'));
  }

  // Update .gitignore
  updateGitignore(targetDir);

  // Success message
  console.log(chalk.blue('\n  CCG initialized successfully!\n'));
  console.log('  Next steps:');
  console.log(`    1. Review configuration in ${chalk.cyan('.ccg/config.json')}`);
  console.log(`    2. Customize ${chalk.cyan('CLAUDE.md')} with project details`);
  console.log(`    3. Run ${chalk.cyan('claude')} to start with CCG`);
  console.log(`    4. Type ${chalk.cyan('/ccg')} to see the dashboard\n`);
}

// ═══════════════════════════════════════════════════════════════
//                      HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Find the templates directory
 */
function findTemplatesDir(): string {
  // Try multiple possible locations
  const possiblePaths = [
    join(__dirname, '..', '..', 'templates'),
    join(__dirname, '..', 'templates'),
    join(process.cwd(), 'templates'),
    join(process.cwd(), 'node_modules', '@anthropic-community', 'code-guardian', 'templates'),
  ];

  for (const p of possiblePaths) {
    if (existsSync(p)) {
      return p;
    }
  }

  // Return first path as fallback
  return possiblePaths[0];
}

/**
 * Copy a template file
 */
function copyTemplate(
  templatesDir: string,
  targetDir: string,
  templatePath: string,
  targetPath: string,
  force?: boolean
): boolean {
  const source = join(templatesDir, templatePath);
  const target = join(targetDir, targetPath);

  if (!existsSync(source)) {
    return false;
  }

  if (existsSync(target) && !force) {
    return true; // File exists, skip
  }

  const dir = dirname(target);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  copyFileSync(source, target);
  return true;
}

/**
 * Write a file, optionally overwriting
 */
function writeFile(path: string, content: string, force?: boolean): void {
  if (existsSync(path) && !force) {
    return;
  }

  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(path, content, 'utf-8');
}

/**
 * Update .gitignore with CCG entries
 */
function updateGitignore(targetDir: string): void {
  const gitignorePath = join(targetDir, '.gitignore');

  const ccgIgnores = `
# Claude Code Guardian
.ccg/memory.db
.ccg/state.json
.ccg/checkpoints/
.ccg/logs/
.ccg/screenshots/
`;

  if (existsSync(gitignorePath)) {
    const content = readFileSync(gitignorePath, 'utf-8');
    if (!content.includes('.ccg/memory.db')) {
      writeFileSync(gitignorePath, content + ccgIgnores, 'utf-8');
      console.log(chalk.green('  Updated .gitignore'));
    }
  } else {
    writeFileSync(gitignorePath, ccgIgnores.trim() + '\n', 'utf-8');
    console.log(chalk.green('  Created .gitignore'));
  }
}

// ═══════════════════════════════════════════════════════════════
//                      EXPORTS
// ═══════════════════════════════════════════════════════════════

export { findTemplatesDir, copyTemplate, writeFile, updateGitignore };
