// src/core/multi-repo-types.ts

/**
 * Multi-Repository Configuration Types and Constants
 *
 * Extracted from multi-repo-config.ts for better modularity.
 */

// ===================================================================
//                      TYPES
// ===================================================================

/**
 * Individual repository configuration
 */
export interface RepoConfig {
  /** Unique name for this repository (used in --repo flag) */
  name: string;
  /** Path to repository root (relative to config file location or absolute) */
  path: string;
  /** Optional description for documentation */
  description?: string;
  /** Optional custom exclude patterns for this repo */
  excludePatterns?: string[];
  /** Optional custom include patterns for this repo */
  includePatterns?: string[];
}

/**
 * Multi-repository configuration file structure
 */
export interface MultiRepoConfig {
  /** Config file version */
  version: string;
  /** Default repo name to use when --repo is not specified */
  defaultRepo?: string;
  /** List of configured repositories */
  repos: RepoConfig[];
}

/**
 * Resolved repository information (with absolute paths)
 */
export interface ResolvedRepo {
  name: string;
  absolutePath: string;
  relativePath: string;
  description?: string;
  excludePatterns: string[];
  includePatterns: string[];
  exists: boolean;
}

/**
 * Validation result for multi-repo config
 */
export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ===================================================================
//                      CONSTANTS
// ===================================================================

/** Default config file name */
export const CONFIG_FILE_NAME = 'config.yml';

/** Default config file path relative to .ccg directory */
export const CONFIG_FILE_PATH = '.ccg/config.yml';

/** Current config file version */
export const CONFIG_VERSION = '1.0';

/** Default exclude patterns for all repos */
export const DEFAULT_EXCLUDE_PATTERNS = [
  'node_modules/**',
  'dist/**',
  'build/**',
  '.git/**',
  'coverage/**',
  '*.min.js',
  '*.bundle.js',
];

/** Template for new multi-repo config */
export const CONFIG_TEMPLATE = `# Code Guardian Studio - Multi-Repository Configuration
# Documentation: https://codeguardian.studio/docs/multi-repo

version: "${CONFIG_VERSION}"

# Default repository to use when --repo is not specified
# defaultRepo: core

# List of repositories/modules to manage
repos:
  # Main repository (current directory)
  - name: core
    path: "."
    description: "Main application code"

  # Example: Separate service in parent directory
  # - name: payments
  #   path: "../payments"
  #   description: "Payment processing service"

  # Example: Monorepo sub-package
  # - name: frontend
  #   path: "./apps/frontend"
  #   description: "Frontend web application"
  #   excludePatterns:
  #     - "**/*.test.tsx"
  #     - "**/__mocks__/**"

  # Example: Shared library
  # - name: shared
  #   path: "./packages/shared"
  #   description: "Shared utilities and types"
`;
