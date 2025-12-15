// tests/helpers/tempFs.ts

import { mkdtemp, rm, writeFile, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';

/**
 * Execute a function with a temporary directory that is cleaned up after
 */
export async function withTempDir<T>(
  fn: (dir: string) => Promise<T>
): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'ccg-test-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/**
 * Create a temporary directory and return cleanup function
 */
export async function createTempDir(): Promise<{
  dir: string;
  cleanup: () => Promise<void>;
}> {
  const dir = await mkdtemp(join(tmpdir(), 'ccg-test-'));
  return {
    dir,
    cleanup: async () => {
      await rm(dir, { recursive: true, force: true });
    },
  };
}

/**
 * Write a file in temp directory, creating parent dirs if needed
 */
export async function writeTempFile(
  baseDir: string,
  relativePath: string,
  content: string
): Promise<string> {
  const fullPath = join(baseDir, relativePath);
  const dir = dirname(fullPath);

  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  await writeFile(fullPath, content, 'utf-8');
  return fullPath;
}

/**
 * Read a file from temp directory
 */
export async function readTempFile(
  baseDir: string,
  relativePath: string
): Promise<string> {
  const fullPath = join(baseDir, relativePath);
  return readFile(fullPath, 'utf-8');
}

/**
 * Create a test project structure in temp directory
 */
export async function createTestProject(
  baseDir: string,
  files: Record<string, string>
): Promise<void> {
  for (const [path, content] of Object.entries(files)) {
    await writeTempFile(baseDir, path, content);
  }
}
