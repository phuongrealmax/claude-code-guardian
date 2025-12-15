// tests/unit/multi-repo-config.test.ts

import * as fs from 'fs';
import * as path from 'path';
import {
  MultiRepoConfigManager,
  CONFIG_TEMPLATE,
  CONFIG_VERSION,
  isMultiRepoEnabled,
  getEffectiveRepoName,
  resolveRepoPath,
  clearMultiRepoConfigCache,
} from '../../src/core/multi-repo-config.js';

const TEST_DIR = '.ccg-multi-repo-test';
const CONFIG_PATH = path.join(TEST_DIR, '.ccg', 'config.yml');

describe('MultiRepoConfigManager', () => {
  beforeEach(() => {
    // Create test directory structure
    fs.mkdirSync(path.join(TEST_DIR, '.ccg'), { recursive: true });
    clearMultiRepoConfigCache();
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    clearMultiRepoConfigCache();
  });

  describe('constructor', () => {
    it('should set correct config path', () => {
      const manager = new MultiRepoConfigManager(TEST_DIR);
      expect(manager.getConfigPath()).toBe(path.resolve(TEST_DIR, '.ccg', 'config.yml'));
    });

    it('should resolve relative paths to absolute', () => {
      const manager = new MultiRepoConfigManager('./relative');
      expect(path.isAbsolute(manager.getProjectRoot())).toBe(true);
    });
  });

  describe('exists', () => {
    it('should return false when config file does not exist', () => {
      const manager = new MultiRepoConfigManager(TEST_DIR);
      expect(manager.exists()).toBe(false);
    });

    it('should return true when config file exists', () => {
      fs.writeFileSync(CONFIG_PATH, 'version: "1.0"\nrepos: []');
      const manager = new MultiRepoConfigManager(TEST_DIR);
      expect(manager.exists()).toBe(true);
    });
  });

  describe('validate', () => {
    it('should validate correct config', () => {
      const config = {
        version: '1.0',
        repos: [
          { name: 'core', path: '.' },
          { name: 'payments', path: '../payments' },
        ],
      };

      const manager = new MultiRepoConfigManager(TEST_DIR);
      const result = manager.validate(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject config without repos', () => {
      const config = { version: '1.0' };

      const manager = new MultiRepoConfigManager(TEST_DIR);
      const result = manager.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required "repos" field');
    });

    it('should reject repos without name', () => {
      const config = {
        version: '1.0',
        repos: [{ path: '.' }],
      };

      const manager = new MultiRepoConfigManager(TEST_DIR);
      const result = manager.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('Missing required "name"'))).toBe(true);
    });

    it('should reject repos without path', () => {
      const config = {
        version: '1.0',
        repos: [{ name: 'core' }],
      };

      const manager = new MultiRepoConfigManager(TEST_DIR);
      const result = manager.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('Missing required "path"'))).toBe(true);
    });

    it('should reject duplicate repo names', () => {
      const config = {
        version: '1.0',
        repos: [
          { name: 'core', path: '.' },
          { name: 'core', path: './other' },
        ],
      };

      const manager = new MultiRepoConfigManager(TEST_DIR);
      const result = manager.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('Duplicate repo name'))).toBe(true);
    });

    it('should reject invalid repo names', () => {
      const config = {
        version: '1.0',
        repos: [{ name: 'invalid name!', path: '.' }],
      };

      const manager = new MultiRepoConfigManager(TEST_DIR);
      const result = manager.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('alphanumeric'))).toBe(true);
    });

    it('should reject invalid defaultRepo reference', () => {
      const config = {
        version: '1.0',
        defaultRepo: 'nonexistent',
        repos: [{ name: 'core', path: '.' }],
      };

      const manager = new MultiRepoConfigManager(TEST_DIR);
      const result = manager.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('unknown repo'))).toBe(true);
    });

    it('should warn about missing version', () => {
      const config = {
        repos: [{ name: 'core', path: '.' }],
      };

      const manager = new MultiRepoConfigManager(TEST_DIR);
      const result = manager.validate(config);

      expect(result.valid).toBe(true);
      expect(result.warnings.some((w: string) => w.includes('version'))).toBe(true);
    });
  });

  describe('load', () => {
    it('should load and parse valid YAML config', () => {
      const yamlContent = `
version: "1.0"
repos:
  - name: core
    path: "."
  - name: payments
    path: "../payments"
`;
      fs.writeFileSync(CONFIG_PATH, yamlContent);

      const manager = new MultiRepoConfigManager(TEST_DIR);
      const config = manager.load();

      expect(config).not.toBeNull();
      expect(config?.version).toBe('1.0');
      expect(config?.repos).toHaveLength(2);
      expect(config?.repos[0].name).toBe('core');
    });

    it('should return null when config does not exist', () => {
      const manager = new MultiRepoConfigManager(TEST_DIR);
      const config = manager.load();

      expect(config).toBeNull();
    });
  });

  describe('getRepo', () => {
    const yamlContent = `
version: "1.0"
repos:
  - name: core
    path: "."
  - name: payments
    path: "../payments"
    description: "Payment service"
`;

    beforeEach(() => {
      fs.writeFileSync(CONFIG_PATH, yamlContent);
    });

    it('should return resolved repo by name', () => {
      const manager = new MultiRepoConfigManager(TEST_DIR);
      const repo = manager.getRepo('core');

      expect(repo).not.toBeNull();
      expect(repo?.name).toBe('core');
      expect(path.isAbsolute(repo?.absolutePath || '')).toBe(true);
    });

    it('should return null for unknown repo', () => {
      const manager = new MultiRepoConfigManager(TEST_DIR);
      const repo = manager.getRepo('unknown');

      expect(repo).toBeNull();
    });
  });

  describe('getDefaultRepo', () => {
    it('should return explicitly configured default', () => {
      const yamlContent = `
version: "1.0"
defaultRepo: payments
repos:
  - name: core
    path: "."
  - name: payments
    path: "../payments"
`;
      fs.writeFileSync(CONFIG_PATH, yamlContent);

      const manager = new MultiRepoConfigManager(TEST_DIR);
      const repo = manager.getDefaultRepo();

      expect(repo?.name).toBe('payments');
    });

    it('should return first repo when no default configured', () => {
      const yamlContent = `
version: "1.0"
repos:
  - name: core
    path: "."
  - name: payments
    path: "../payments"
`;
      fs.writeFileSync(CONFIG_PATH, yamlContent);

      const manager = new MultiRepoConfigManager(TEST_DIR);
      const repo = manager.getDefaultRepo();

      expect(repo?.name).toBe('core');
    });
  });

  describe('createTemplate', () => {
    it('should create config file with template content', () => {
      const manager = new MultiRepoConfigManager(TEST_DIR);
      manager.createTemplate();

      expect(fs.existsSync(CONFIG_PATH)).toBe(true);
      const content = fs.readFileSync(CONFIG_PATH, 'utf-8');
      expect(content).toContain('version:');
      expect(content).toContain('repos:');
    });
  });

  describe('getRepoNames', () => {
    it('should return list of all repo names', () => {
      const yamlContent = `
version: "1.0"
repos:
  - name: core
    path: "."
  - name: payments
    path: "../payments"
  - name: frontend
    path: "./apps/frontend"
`;
      fs.writeFileSync(CONFIG_PATH, yamlContent);

      const manager = new MultiRepoConfigManager(TEST_DIR);
      const names = manager.getRepoNames();

      expect(names).toEqual(['core', 'payments', 'frontend']);
    });
  });

  describe('hasRepo', () => {
    beforeEach(() => {
      const yamlContent = `
version: "1.0"
repos:
  - name: core
    path: "."
`;
      fs.writeFileSync(CONFIG_PATH, yamlContent);
    });

    it('should return true for existing repo', () => {
      const manager = new MultiRepoConfigManager(TEST_DIR);
      expect(manager.hasRepo('core')).toBe(true);
    });

    it('should return false for non-existing repo', () => {
      const manager = new MultiRepoConfigManager(TEST_DIR);
      expect(manager.hasRepo('unknown')).toBe(false);
    });
  });
});

describe('Helper functions', () => {
  beforeEach(() => {
    fs.mkdirSync(path.join(TEST_DIR, '.ccg'), { recursive: true });
    clearMultiRepoConfigCache();
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    clearMultiRepoConfigCache();
  });

  describe('isMultiRepoEnabled', () => {
    it('should return false when config does not exist', () => {
      expect(isMultiRepoEnabled(TEST_DIR)).toBe(false);
    });

    it('should return true when config exists', () => {
      fs.writeFileSync(CONFIG_PATH, 'version: "1.0"\nrepos: []');
      expect(isMultiRepoEnabled(TEST_DIR)).toBe(true);
    });
  });

  describe('getEffectiveRepoName', () => {
    const yamlContent = `
version: "1.0"
defaultRepo: core
repos:
  - name: core
    path: "."
  - name: payments
    path: "../payments"
`;

    beforeEach(() => {
      fs.writeFileSync(CONFIG_PATH, yamlContent);
    });

    it('should return specified repo if valid', () => {
      expect(getEffectiveRepoName('payments', TEST_DIR)).toBe('payments');
    });

    it('should return null if specified repo is invalid', () => {
      expect(getEffectiveRepoName('unknown', TEST_DIR)).toBeNull();
    });

    it('should return default repo when not specified', () => {
      expect(getEffectiveRepoName(undefined, TEST_DIR)).toBe('core');
    });
  });

  describe('resolveRepoPath', () => {
    beforeEach(() => {
      const yamlContent = `
version: "1.0"
repos:
  - name: core
    path: "."
`;
      fs.writeFileSync(CONFIG_PATH, yamlContent);
    });

    it('should resolve valid repo to absolute path', () => {
      const resolved = resolveRepoPath('core', TEST_DIR);
      expect(resolved).not.toBeNull();
      expect(path.isAbsolute(resolved || '')).toBe(true);
    });

    it('should return null for unknown repo', () => {
      expect(resolveRepoPath('unknown', TEST_DIR)).toBeNull();
    });
  });
});

describe('CONFIG_TEMPLATE', () => {
  it('should contain version', () => {
    expect(CONFIG_TEMPLATE).toContain(`version: "${CONFIG_VERSION}"`);
  });

  it('should contain repos section', () => {
    expect(CONFIG_TEMPLATE).toContain('repos:');
  });

  it('should contain example core repo', () => {
    expect(CONFIG_TEMPLATE).toContain('name: core');
    expect(CONFIG_TEMPLATE).toContain('path: "."');
  });

  it('should contain commented examples', () => {
    expect(CONFIG_TEMPLATE).toContain('# Example:');
  });
});
