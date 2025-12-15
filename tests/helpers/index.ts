// tests/helpers/index.ts

// Fakes
export { FakeEventBus } from './fakes/fakeEventBus.js';
export { FakeLogger } from './fakes/fakeLogger.js';
export { FakeEmbeddingProvider } from './fakes/fakeEmbeddingProvider.js';
export { FakeBM25Index } from './fakes/fakeBM25Index.js';
export { FakeHybridSearch } from './fakes/fakeHybridSearch.js';
export type { HybridSearchResult, HybridSearchOptions } from './fakes/fakeHybridSearch.js';

// Fixtures
export {
  sampleChunks,
  getChunksByLanguage,
  getChunksByType,
  getChunkById,
  createMinimalChunk,
} from './fixtures/ragDocs.js';

// Temp FS
export {
  withTempDir,
  createTempDir,
  writeTempFile,
  readTempFile,
  createTestProject,
} from './tempFs.js';

// Context factories
export {
  createRagDeps,
  createTestingDeps,
  createLicenseDeps,
  resetDeps,
} from './createTestContext.js';
export type {
  RagTestDeps,
  TestingTestDeps,
  LicenseTestDeps,
} from './createTestContext.js';
