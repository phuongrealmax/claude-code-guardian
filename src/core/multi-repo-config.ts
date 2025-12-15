// src/core/multi-repo-config.ts

/**
 * Multi-Repository Configuration Manager
 *
 * Provides first-class support for managing multiple repositories or modules
 * within a single Code Guardian Studio configuration.
 *
 * Configuration is stored in .ccg/config.yml at the repo root.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { Logger } from './logger.js';
import {
  RepoConfig,
  MultiRepoConfig,
  ResolvedRepo,
  ConfigValidationResult,
  CONFIG_FILE_PATH,
  CONFIG_TEMPLATE,
  DEFAULT_EXCLUDE_PATTERNS,
} from './multi-repo-types.js';

// Re-export types for backward compatibility
export {
  RepoConfig,
  MultiRepoConfig,
  ResolvedRepo,
  ConfigValidationResult,
  CONFIG_FILE_NAME,
  CONFIG_FILE_PATH,
  CONFIG_VERSION,
  DEFAULT_EXCLUDE_PATTERNS,
  CONFIG_TEMPLATE,
} from './multi-repo-types.js';

// ===================================================================
//                      MULTI-REPO CONFIG MANAGER
// ===================================================================

export class MultiRepoConfigManager {
  private configPath: string;
  private projectRoot: string;
  private config: MultiRepoConfig | null = null;
  private logger: Logger;

  constructor(projectRoot: string = process.cwd(), logger?: Logger) {
    this.projectRoot = path.isAbsolute(projectRoot)
      ? projectRoot
      : path.resolve(projectRoot);
    this.configPath = path.join(this.projectRoot, CONFIG_FILE_PATH);
    this.logger = logger || new Logger('info', 'MultiRepoConfig');
  }

  // -----------------------------------------------------------------
  //                      PUBLIC METHODS
  // -----------------------------------------------------------------

  /**
   * Check if multi-repo config file exists
   */
  exists(): boolean {
    return fs.existsSync(this.configPath);
  }

  /**
   * Load and parse the multi-repo configuration
   */
  load(): MultiRepoConfig | null {
    if (!this.exists()) {
      this.logger.debug('Multi-repo config not found at ' + this.configPath);
      return null;
    }

    try {
      const content = fs.readFileSync(this.configPath, 'utf-8');
      const parsed = yaml.load(content) as MultiRepoConfig;

      // Validate structure
      const validation = this.validate(parsed);
      if (!validation.valid) {
        this.logger.error('Invalid multi-repo config:', validation.errors);
        return null;
      }

      if (validation.warnings.length > 0) {
        for (const warning of validation.warnings) {
          this.logger.warn(warning);
        }
      }

      this.config = parsed;
      this.logger.info(`Loaded multi-repo config with ${parsed.repos.length} repositories`);
      return parsed;
    } catch (error) {
      if (error instanceof yaml.YAMLException) {
        this.logger.error('YAML parse error in config.yml:', error.message);
      } else {
        this.logger.error('Failed to load multi-repo config:', error);
      }
      return null;
    }
  }

  /**
   * Get the currently loaded config (loads if not already loaded)
   */
  getConfig(): MultiRepoConfig | null {
    if (!this.config) {
      return this.load();
    }
    return this.config;
  }

  /**
   * Validate a multi-repo configuration object
   */
  validate(config: unknown): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if config is an object
    if (!config || typeof config !== 'object') {
      errors.push('Configuration must be a valid YAML object');
      return { valid: false, errors, warnings };
    }

    const cfg = config as Record<string, unknown>;

    // Check version
    if (!cfg.version) {
      warnings.push('Missing "version" field, assuming version 1.0');
    } else if (typeof cfg.version !== 'string') {
      errors.push('"version" must be a string');
    }

    // Check repos array
    if (!cfg.repos) {
      errors.push('Missing required "repos" field');
    } else if (!Array.isArray(cfg.repos)) {
      errors.push('"repos" must be an array');
    } else {
      const repoNames = new Set<string>();

      for (let i = 0; i < cfg.repos.length; i++) {
        const repo = cfg.repos[i];
        const prefix = `repos[${i}]`;

        if (!repo || typeof repo !== 'object') {
          errors.push(`${prefix}: Must be an object`);
          continue;
        }

        const r = repo as Record<string, unknown>;

        // Check name
        if (!r.name) {
          errors.push(`${prefix}: Missing required "name" field`);
        } else if (typeof r.name !== 'string') {
          errors.push(`${prefix}: "name" must be a string`);
        } else if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i.test(r.name)) {
          errors.push(`${prefix}: "name" must be alphanumeric with optional hyphens (got "${r.name}")`);
        } else if (repoNames.has(r.name)) {
          errors.push(`${prefix}: Duplicate repo name "${r.name}"`);
        } else {
          repoNames.add(r.name);
        }

        // Check path
        if (!r.path) {
          errors.push(`${prefix}: Missing required "path" field`);
        } else if (typeof r.path !== 'string') {
          errors.push(`${prefix}: "path" must be a string`);
        }

        // Check optional fields
        if (r.description !== undefined && typeof r.description !== 'string') {
          warnings.push(`${prefix}: "description" should be a string`);
        }

        if (r.excludePatterns !== undefined) {
          if (!Array.isArray(r.excludePatterns)) {
            errors.push(`${prefix}: "excludePatterns" must be an array`);
          } else if (!r.excludePatterns.every((p: unknown) => typeof p === 'string')) {
            errors.push(`${prefix}: "excludePatterns" must contain only strings`);
          }
        }

        if (r.includePatterns !== undefined) {
          if (!Array.isArray(r.includePatterns)) {
            errors.push(`${prefix}: "includePatterns" must be an array`);
          } else if (!r.includePatterns.every((p: unknown) => typeof p === 'string')) {
            errors.push(`${prefix}: "includePatterns" must contain only strings`);
          }
        }
      }

      if (cfg.repos.length === 0) {
        warnings.push('No repositories configured in "repos" array');
      }
    }

    // Check defaultRepo if specified
    if (cfg.defaultRepo !== undefined) {
      if (typeof cfg.defaultRepo !== 'string') {
        errors.push('"defaultRepo" must be a string');
      } else if (Array.isArray(cfg.repos)) {
        const repoNames = (cfg.repos as RepoConfig[]).map(r => r.name);
        if (!repoNames.includes(cfg.defaultRepo)) {
          errors.push(`"defaultRepo" references unknown repo "${cfg.defaultRepo}"`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get a repository by name
   */
  getRepo(name: string): ResolvedRepo | null {
    const config = this.getConfig();
    if (!config) {
      return null;
    }

    const repo = config.repos.find(r => r.name === name);
    if (!repo) {
      return null;
    }

    return this.resolveRepo(repo);
  }

  /**
   * Get all configured repositories (resolved)
   */
  getAllRepos(): ResolvedRepo[] {
    const config = this.getConfig();
    if (!config) {
      return [];
    }

    return config.repos.map(r => this.resolveRepo(r));
  }

  /**
   * Get the default repository
   */
  getDefaultRepo(): ResolvedRepo | null {
    const config = this.getConfig();
    if (!config) {
      return null;
    }

    // Use explicitly configured default
    if (config.defaultRepo) {
      return this.getRepo(config.defaultRepo);
    }

    // Fall back to first repo
    if (config.repos.length > 0) {
      return this.resolveRepo(config.repos[0]);
    }

    return null;
  }

  /**
   * Get list of all repo names
   */
  getRepoNames(): string[] {
    const config = this.getConfig();
    if (!config) {
      return [];
    }
    return config.repos.map(r => r.name);
  }

  /**
   * Check if a repo name exists in config
   */
  hasRepo(name: string): boolean {
    const config = this.getConfig();
    if (!config) {
      return false;
    }
    return config.repos.some(r => r.name === name);
  }

  /**
   * Create a new multi-repo config file with template
   */
  createTemplate(): void {
    const ccgDir = path.dirname(this.configPath);

    // Ensure .ccg directory exists
    if (!fs.existsSync(ccgDir)) {
      fs.mkdirSync(ccgDir, { recursive: true });
    }

    // Write template
    fs.writeFileSync(this.configPath, CONFIG_TEMPLATE, 'utf-8');
    this.logger.info(`Created multi-repo config template at ${this.configPath}`);
  }

  /**
   * Get the config file path
   */
  getConfigPath(): string {
    return this.configPath;
  }

  /**
   * Get the project root
   */
  getProjectRoot(): string {
    return this.projectRoot;
  }

  // -----------------------------------------------------------------
  //                      PRIVATE METHODS
  // -----------------------------------------------------------------

  /**
   * Resolve a repo config to absolute paths and check existence
   */
  private resolveRepo(repo: RepoConfig): ResolvedRepo {
    const absolutePath = path.isAbsolute(repo.path)
      ? repo.path
      : path.resolve(this.projectRoot, repo.path);

    const relativePath = path.relative(this.projectRoot, absolutePath);

    return {
      name: repo.name,
      absolutePath,
      relativePath: relativePath || '.',
      description: repo.description,
      excludePatterns: repo.excludePatterns || DEFAULT_EXCLUDE_PATTERNS,
      includePatterns: repo.includePatterns || [],
      exists: fs.existsSync(absolutePath),
    };
  }
}

// ===================================================================
//                      HELPER FUNCTIONS
// ===================================================================

/**
 * Get or create multi-repo config manager singleton for a project
 */
const managers = new Map<string, MultiRepoConfigManager>();

export function getMultiRepoConfigManager(
  projectRoot: string = process.cwd(),
  logger?: Logger
): MultiRepoConfigManager {
  const key = path.resolve(projectRoot);
  if (!managers.has(key)) {
    managers.set(key, new MultiRepoConfigManager(projectRoot, logger));
  }
  return managers.get(key)!;
}

/**
 * Clear cached managers (for testing)
 */
export function clearMultiRepoConfigCache(): void {
  managers.clear();
}

/**
 * Check if multi-repo mode is enabled for a project
 */
export function isMultiRepoEnabled(projectRoot: string = process.cwd()): boolean {
  const manager = getMultiRepoConfigManager(projectRoot);
  return manager.exists();
}

/**
 * Resolve repo name to absolute path
 * Returns null if repo not found or multi-repo not enabled
 */
export function resolveRepoPath(
  repoName: string,
  projectRoot: string = process.cwd()
): string | null {
  const manager = getMultiRepoConfigManager(projectRoot);
  const repo = manager.getRepo(repoName);
  return repo ? repo.absolutePath : null;
}

/**
 * Get effective repo name (resolves to default if not specified)
 */
export function getEffectiveRepoName(
  repoName: string | undefined,
  projectRoot: string = process.cwd()
): string | null {
  const manager = getMultiRepoConfigManager(projectRoot);

  if (repoName) {
    return manager.hasRepo(repoName) ? repoName : null;
  }

  const defaultRepo = manager.getDefaultRepo();
  return defaultRepo ? defaultRepo.name : null;
}
