// tests/helpers/createTestContext.ts

import { FakeEventBus } from './fakes/fakeEventBus.js';
import { FakeLogger } from './fakes/fakeLogger.js';
import { FakeEmbeddingProvider } from './fakes/fakeEmbeddingProvider.js';
import { FakeHybridSearch } from './fakes/fakeHybridSearch.js';
import { FakeBM25Index } from './fakes/fakeBM25Index.js';

/**
 * Common test dependencies for RAG service
 */
export interface RagTestDeps {
  eventBus: FakeEventBus;
  logger: FakeLogger;
  embeddingProvider: FakeEmbeddingProvider;
  hybridSearch: FakeHybridSearch;
  bm25Index: FakeBM25Index;
}

/**
 * Create test dependencies for RAG service with optional overrides
 */
export function createRagDeps(overrides: Partial<RagTestDeps> = {}): RagTestDeps {
  return {
    eventBus: overrides.eventBus ?? new FakeEventBus(),
    logger: overrides.logger ?? new FakeLogger(),
    embeddingProvider: overrides.embeddingProvider ?? new FakeEmbeddingProvider(),
    hybridSearch: overrides.hybridSearch ?? new FakeHybridSearch(),
    bm25Index: overrides.bm25Index ?? new FakeBM25Index(),
  };
}

/**
 * Common test dependencies for Testing service
 */
export interface TestingTestDeps {
  eventBus: FakeEventBus;
  logger: FakeLogger;
  projectRoot: string;
}

/**
 * Create test dependencies for Testing service
 */
export function createTestingDeps(
  overrides: Partial<TestingTestDeps> = {}
): TestingTestDeps {
  return {
    eventBus: overrides.eventBus ?? new FakeEventBus(),
    logger: overrides.logger ?? new FakeLogger(),
    projectRoot: overrides.projectRoot ?? process.cwd(),
  };
}

/**
 * Common test dependencies for License service
 */
export interface LicenseTestDeps {
  dbPath?: string;
}

/**
 * Create test dependencies for License service
 */
export function createLicenseDeps(
  overrides: Partial<LicenseTestDeps> = {}
): LicenseTestDeps {
  return {
    dbPath: overrides.dbPath,
  };
}

/**
 * Reset all fake dependencies
 */
export function resetDeps(deps: Partial<RagTestDeps | TestingTestDeps>): void {
  if ('eventBus' in deps && deps.eventBus) {
    deps.eventBus.clear();
  }
  if ('logger' in deps && deps.logger) {
    (deps.logger as FakeLogger).clear();
  }
  if ('embeddingProvider' in deps && deps.embeddingProvider) {
    (deps.embeddingProvider as FakeEmbeddingProvider).clear();
  }
  if ('hybridSearch' in deps && deps.hybridSearch) {
    (deps.hybridSearch as FakeHybridSearch).clear();
  }
  if ('bm25Index' in deps && deps.bm25Index) {
    (deps.bm25Index as FakeBM25Index).clear();
  }
}
