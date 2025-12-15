// tests/unit/multi-repo-types.test.ts

// Using vitest globals
import {
  CONFIG_FILE_NAME,
  CONFIG_FILE_PATH,
  CONFIG_VERSION,
  DEFAULT_EXCLUDE_PATTERNS,
  CONFIG_TEMPLATE,
} from '../../src/core/multi-repo-types.js';

describe('multi-repo-types', () => {
  // ═══════════════════════════════════════════════════════════════
  //                      CONSTANTS
  // ═══════════════════════════════════════════════════════════════

  describe('CONFIG_FILE_NAME', () => {
    it('should be config.yml', () => {
      expect(CONFIG_FILE_NAME).toBe('config.yml');
    });
  });

  describe('CONFIG_FILE_PATH', () => {
    it('should be .ccg/config.yml', () => {
      expect(CONFIG_FILE_PATH).toBe('.ccg/config.yml');
    });

    it('should contain CONFIG_FILE_NAME', () => {
      expect(CONFIG_FILE_PATH).toContain(CONFIG_FILE_NAME);
    });
  });

  describe('CONFIG_VERSION', () => {
    it('should be a valid version string', () => {
      expect(CONFIG_VERSION).toMatch(/^\d+\.\d+$/);
    });

    it('should be 1.0', () => {
      expect(CONFIG_VERSION).toBe('1.0');
    });
  });

  describe('DEFAULT_EXCLUDE_PATTERNS', () => {
    it('should be an array', () => {
      expect(Array.isArray(DEFAULT_EXCLUDE_PATTERNS)).toBe(true);
    });

    it('should exclude node_modules', () => {
      expect(DEFAULT_EXCLUDE_PATTERNS).toContain('node_modules/**');
    });

    it('should exclude dist folder', () => {
      expect(DEFAULT_EXCLUDE_PATTERNS).toContain('dist/**');
    });

    it('should exclude build folder', () => {
      expect(DEFAULT_EXCLUDE_PATTERNS).toContain('build/**');
    });

    it('should exclude .git folder', () => {
      expect(DEFAULT_EXCLUDE_PATTERNS).toContain('.git/**');
    });

    it('should exclude coverage folder', () => {
      expect(DEFAULT_EXCLUDE_PATTERNS).toContain('coverage/**');
    });

    it('should exclude minified JS files', () => {
      expect(DEFAULT_EXCLUDE_PATTERNS).toContain('*.min.js');
    });

    it('should exclude bundle files', () => {
      expect(DEFAULT_EXCLUDE_PATTERNS).toContain('*.bundle.js');
    });

    it('should have reasonable number of patterns', () => {
      expect(DEFAULT_EXCLUDE_PATTERNS.length).toBeGreaterThanOrEqual(5);
      expect(DEFAULT_EXCLUDE_PATTERNS.length).toBeLessThanOrEqual(20);
    });
  });

  describe('CONFIG_TEMPLATE', () => {
    it('should be a non-empty string', () => {
      expect(typeof CONFIG_TEMPLATE).toBe('string');
      expect(CONFIG_TEMPLATE.length).toBeGreaterThan(0);
    });

    it('should include version', () => {
      expect(CONFIG_TEMPLATE).toContain(`version: "${CONFIG_VERSION}"`);
    });

    it('should include repos section', () => {
      expect(CONFIG_TEMPLATE).toContain('repos:');
    });

    it('should include defaultRepo commented section', () => {
      expect(CONFIG_TEMPLATE).toContain('defaultRepo');
    });

    it('should include example core repo', () => {
      expect(CONFIG_TEMPLATE).toContain('name: core');
      expect(CONFIG_TEMPLATE).toContain('path: "."');
    });

    it('should include commented examples', () => {
      expect(CONFIG_TEMPLATE).toContain('# Example');
    });

    it('should include documentation URL', () => {
      expect(CONFIG_TEMPLATE).toContain('https://codeguardian.studio');
    });

    it('should be valid YAML structure', () => {
      // Should start with a comment
      expect(CONFIG_TEMPLATE.startsWith('#')).toBe(true);

      // Should have indented content
      expect(CONFIG_TEMPLATE).toContain('  - name:');
    });

    it('should include excludePatterns example', () => {
      expect(CONFIG_TEMPLATE).toContain('excludePatterns:');
    });
  });
});
