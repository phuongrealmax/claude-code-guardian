import { mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const TEST_REPO_DIR = join(process.cwd(), 'tests', 'integration', 'test-repo');
const CCG_BIN = join(process.cwd(), 'dist', 'bin', 'ccg.js');

/**
 * E2E Integration Test for Quickstart Flow
 *
 * Goal: Verify that a new user can:
 * 1. Initialize CCG in a project
 * 2. Run code optimization
 * 3. Get a report without crashes
 *
 * Success Criteria:
 * - ✅ Integration test passes on CI
 * - ✅ Zero JSON visible in quickstart docs
 * - ✅ Completes in < 10 min for 30k LOC repo
 * - ✅ Works without license key
 */
describe('Quickstart E2E Flow', () => {
  beforeEach(() => {
    // Create test repository with realistic code structure
    if (existsSync(TEST_REPO_DIR)) {
      rmSync(TEST_REPO_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_REPO_DIR, { recursive: true });

    // Create a small-medium codebase (~5k LOC)
    createTestCodebase(TEST_REPO_DIR);
  });

  afterEach(() => {
    if (existsSync(TEST_REPO_DIR)) {
      rmSync(TEST_REPO_DIR, { recursive: true, force: true });
    }
  });

  it('should complete init -> code-optimize -> report flow without crashes', async () => {
    const startTime = Date.now();

    // Step 1: Initialize CCG
    const initOutput = execSync(`node "${CCG_BIN}" init`, {
      cwd: TEST_REPO_DIR,
      encoding: 'utf-8',
      timeout: 30000, // 30s timeout
    });

    expect(initOutput).toContain('Initializing');
    expect(existsSync(join(TEST_REPO_DIR, '.ccg'))).toBe(true);
    expect(existsSync(join(TEST_REPO_DIR, '.ccg', 'config.json'))).toBe(true);

    // Step 2: Run code optimization
    const optimizeOutput = execSync(`node "${CCG_BIN}" code-optimize --report`, {
      cwd: TEST_REPO_DIR,
      encoding: 'utf-8',
      timeout: 600000, // 10 min timeout
    });

    expect(optimizeOutput).not.toContain('Error');
    expect(optimizeOutput).not.toContain('FATAL');

    // Step 3: Verify outputs exist
    const reportFiles = [
      join(TEST_REPO_DIR, 'docs', 'reports', 'optimization-latest.md'),
      join(TEST_REPO_DIR, '.ccg', 'optimizer-cache.json'),
    ];

    for (const file of reportFiles) {
      expect(existsSync(file), `Expected ${file} to exist`).toBe(true);
    }

    // Step 4: Verify report content
    const reportPath = join(TEST_REPO_DIR, 'docs', 'reports', 'optimization-latest.md');
    const reportContent = readFileSync(reportPath, 'utf-8');

    expect(reportContent).toContain('# Code Guardian Optimization Report');
    expect(reportContent).toContain('## Overview');
    expect(reportContent).toContain('## Hotspots');
    // Note: Report uses markdown tables which contain | characters, not JSON
    // The key is no raw JSON objects like {"key": "value"} appear
    expect(reportContent).not.toMatch(/\{[^}]+:[^}]+\}/); // No JSON objects in report

    // Step 5: Verify performance - should complete in < 10 minutes
    const duration = Date.now() - startTime;
    const minutes = duration / 1000 / 60;
    expect(minutes).toBeLessThan(10);

    console.log(`✅ Quickstart flow completed in ${minutes.toFixed(2)} minutes`);
  }, 600000); // 10 minute test timeout

  it('should work without license key', async () => {
    // Ensure no license key in environment
    const oldLicense = process.env.CCG_LICENSE_KEY;
    delete process.env.CCG_LICENSE_KEY;

    try {
      const initOutput = execSync(`node "${CCG_BIN}" init`, {
        cwd: TEST_REPO_DIR,
        encoding: 'utf-8',
        timeout: 30000,
      });

      expect(initOutput).not.toContain('license required');
      expect(initOutput).not.toContain('upgrade to Team');
    } finally {
      // Restore license key if it existed
      if (oldLicense) {
        process.env.CCG_LICENSE_KEY = oldLicense;
      }
    }
  });

  it('should generate hotspots JSON for programmatic access', async () => {
    execSync(`node "${CCG_BIN}" init`, {
      cwd: TEST_REPO_DIR,
      encoding: 'utf-8',
      timeout: 30000,
    });

    execSync(`node "${CCG_BIN}" code-optimize --report`, {
      cwd: TEST_REPO_DIR,
      encoding: 'utf-8',
      timeout: 600000,
    });

    // Verify JSON cache exists for programmatic access
    const cachePath = join(TEST_REPO_DIR, '.ccg', 'optimizer-cache.json');
    expect(existsSync(cachePath)).toBe(true);

    const cache = JSON.parse(readFileSync(cachePath, 'utf-8'));
    expect(cache.scanResult).toBeDefined();
    expect(cache.hotspots).toBeDefined();
    expect(Array.isArray(cache.hotspots)).toBe(true);
  });
});

/**
 * Create a realistic test codebase with ~5k LOC
 * Structure mimics a small Node.js/TypeScript project
 */
function createTestCodebase(rootDir: string) {
  const structure = {
    'src/index.ts': generateComplexFile(150),
    'src/auth/login.ts': generateComplexFile(200),
    'src/auth/register.ts': generateComplexFile(180),
    'src/api/users.ts': generateComplexFile(250),
    'src/api/posts.ts': generateComplexFile(220),
    'src/db/connection.ts': generateComplexFile(120),
    'src/db/migrations.ts': generateComplexFile(300),
    'src/utils/validation.ts': generateComplexFile(150),
    'src/utils/helpers.ts': generateComplexFile(180),
    'tests/auth.test.ts': generateSimpleFile(100),
    'tests/api.test.ts': generateSimpleFile(120),
    'package.json': JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
      description: 'Test project for CCG E2E tests',
      scripts: { test: 'vitest' },
    }, null, 2),
    'README.md': '# Test Project\n\nTest repository for CCG quickstart flow.',
  };

  for (const [path, content] of Object.entries(structure)) {
    const fullPath = join(rootDir, path);
    const dir = join(fullPath, '..');
    mkdirSync(dir, { recursive: true });
    writeFileSync(fullPath, content);
  }
}

/**
 * Generate complex code with high nesting and branching
 * This creates "hotspots" that CCG should detect
 */
function generateComplexFile(lines: number): string {
  const code = [];
  code.push(`// Auto-generated complex file for testing\n`);
  code.push(`import { Request, Response } from 'express';\n`);
  code.push(`import { Database } from '../db/connection';\n\n`);

  code.push(`export class ComplexService {`);
  code.push(`  private db: Database;\n`);

  // Generate deeply nested function
  code.push(`  async processData(req: Request): Promise<void> {`);
  code.push(`    const userId = req.params.id;`);
  code.push(`    if (userId) {`);
  code.push(`      const user = await this.db.findUser(userId);`);
  code.push(`      if (user) {`);
  code.push(`        if (user.isActive) {`);
  code.push(`          if (user.hasPermission('admin')) {`);
  code.push(`            if (user.lastLogin) {`);
  code.push(`              if (Date.now() - user.lastLogin < 86400000) {`);
  code.push(`                // Deep nesting - complexity hotspot`);
  code.push(`                return user.processAdminData();`);
  code.push(`              }`);
  code.push(`            }`);
  code.push(`          }`);
  code.push(`        }`);
  code.push(`      }`);
  code.push(`    }`);
  code.push(`  }\n`);

  // Fill remaining lines with methods
  const remaining = lines - code.length - 10;
  for (let i = 0; i < remaining / 5; i++) {
    code.push(`  method${i}() {`);
    code.push(`    // TODO: Implement`);
    code.push(`    return null;`);
    code.push(`  }\n`);
  }

  code.push(`}\n`);

  return code.join('\n');
}

/**
 * Generate simple test file
 */
function generateSimpleFile(lines: number): string {
  const code = [];
  code.push(`import { describe, it, expect } from 'vitest';\n`);
  code.push(`describe('Test Suite', () => {`);

  for (let i = 0; i < lines / 5; i++) {
    code.push(`  it('should test ${i}', () => {`);
    code.push(`    expect(true).toBe(true);`);
    code.push(`  });\n`);
  }

  code.push(`});\n`);
  return code.join('\n');
}
