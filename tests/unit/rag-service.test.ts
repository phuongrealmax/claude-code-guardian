// tests/unit/rag-service.test.ts
// RAG Service Unit Behavior Tests

import { vi } from 'vitest';
import { RAGService } from '../../src/modules/rag/rag.service.js';
import { EventBus } from '../../src/core/event-bus.js';
import type { RAGQuery, RAGSearchResponse, IndexBuildProgress } from '../../src/modules/rag/rag.types.js';
import * as fs from 'fs';
import * as path from 'path';
import { withTempDir, createTempDir, writeTempFile } from '../helpers/tempFs.js';

describe('RAGService', () => {
  let eventBus: EventBus;
  let service: RAGService;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('creates service with default config', async () => {
      await withTempDir(async (dir) => {
        const indexPath = path.join(dir, 'rag-index.json');
        service = new RAGService(eventBus, { indexPath });

        expect(service).toBeDefined();
        expect(service.getStatus().indexed).toBe(false);
      });
    });

    it('loads existing index from disk if present', async () => {
      await withTempDir(async (dir) => {
        const indexPath = path.join(dir, 'rag-index.json');

        // Create a valid index file
        const indexData = {
          version: '3.0.0',
          projectPath: dir,
          chunks: {
            'chunk-1': {
              id: 'chunk-1',
              filePath: 'test.ts',
              language: 'typescript',
              type: 'function',
              name: 'testFn',
              content: 'function test() {}',
              hash: 'abc123',
              startLine: 1,
              endLine: 3,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
          relations: [],
          metadata: {
            totalFiles: 1,
            totalChunks: 1,
            languages: ['typescript'],
            lastIndexed: new Date().toISOString(),
            embeddingModel: 'local',
            indexDuration: 100,
          },
        };
        fs.writeFileSync(indexPath, JSON.stringify(indexData));

        service = new RAGService(eventBus, { indexPath });
        const status = service.getStatus();

        expect(status.indexed).toBe(true);
        expect(status.metadata?.totalChunks).toBe(1);
      });
    });

    it('handles corrupted index file gracefully', async () => {
      await withTempDir(async (dir) => {
        const indexPath = path.join(dir, 'rag-index.json');
        fs.writeFileSync(indexPath, 'not valid json {{{');

        // Should not throw
        service = new RAGService(eventBus, { indexPath });
        expect(service.getStatus().indexed).toBe(false);
      });
    });
  });

  // Helper to create valid 256-dimension embedding (local provider uses 256)
  function createEmbedding(seed: number = 0): number[] {
    return Array(256).fill(0).map((_, i) => Math.sin(seed + i) * 0.5 + 0.5);
  }

  describe('search()', () => {
    it('returns empty results when no index exists', async () => {
      await withTempDir(async (dir) => {
        const indexPath = path.join(dir, 'rag-index.json');
        service = new RAGService(eventBus, { indexPath });

        const query: RAGQuery = { query: 'test function' };
        const response = await service.search(query);

        expect(response.results).toEqual([]);
        expect(response.totalMatches).toBe(0);
        expect(response.method).toBe('vector');
      });
    });

    it('returns empty results when index has no chunks', async () => {
      await withTempDir(async (dir) => {
        const indexPath = path.join(dir, 'rag-index.json');

        // Create empty index
        const indexData = {
          version: '3.0.0',
          projectPath: dir,
          chunks: {},
          relations: [],
          metadata: {
            totalFiles: 0,
            totalChunks: 0,
            languages: [],
            lastIndexed: new Date().toISOString(),
            embeddingModel: 'local',
            indexDuration: 0,
          },
        };
        fs.writeFileSync(indexPath, JSON.stringify(indexData));

        service = new RAGService(eventBus, { indexPath });
        const response = await service.search({ query: 'anything' });

        expect(response.results).toEqual([]);
        expect(response.totalMatches).toBe(0);
      });
    });

    it('returns searchTime in response', async () => {
      await withTempDir(async (dir) => {
        const indexPath = path.join(dir, 'rag-index.json');
        service = new RAGService(eventBus, { indexPath });

        const response = await service.search({ query: 'test' });

        expect(typeof response.searchTime).toBe('number');
        expect(response.searchTime).toBeGreaterThanOrEqual(0);
      });
    });

    it('filters by language when specified', async () => {
      await withTempDir(async (dir) => {
        const indexPath = path.join(dir, 'rag-index.json');

        // Index with multiple languages - use 256-dim embeddings
        const indexData = {
          version: '3.0.0',
          projectPath: dir,
          chunks: {
            'ts-chunk': {
              id: 'ts-chunk',
              filePath: 'test.ts',
              language: 'typescript',
              type: 'function',
              name: 'tsFunction',
              content: 'function test() {}',
              hash: 'ts-hash',
              startLine: 1,
              endLine: 3,
              embedding: createEmbedding(1),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            'py-chunk': {
              id: 'py-chunk',
              filePath: 'test.py',
              language: 'python',
              type: 'function',
              name: 'py_function',
              content: 'def test(): pass',
              hash: 'py-hash',
              startLine: 1,
              endLine: 2,
              embedding: createEmbedding(2),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
          relations: [],
          metadata: {
            totalFiles: 2,
            totalChunks: 2,
            languages: ['typescript', 'python'],
            lastIndexed: new Date().toISOString(),
            embeddingModel: 'local',
            indexDuration: 100,
          },
        };
        fs.writeFileSync(indexPath, JSON.stringify(indexData));

        service = new RAGService(eventBus, { indexPath });

        // Query with language filter
        const response = await service.search({
          query: 'function',
          filters: { languages: ['typescript'] },
        });

        // Results should only contain TypeScript chunks (if any match)
        const languages = response.results.map(r => r.chunk.language);
        expect(languages.every(l => l === 'typescript')).toBe(true);
      });
    });

    it('filters by type when specified', async () => {
      await withTempDir(async (dir) => {
        const indexPath = path.join(dir, 'rag-index.json');

        const indexData = {
          version: '3.0.0',
          projectPath: dir,
          chunks: {
            'func-chunk': {
              id: 'func-chunk',
              filePath: 'test.ts',
              language: 'typescript',
              type: 'function',
              name: 'myFunction',
              content: 'function test() {}',
              hash: 'f-hash',
              startLine: 1,
              endLine: 3,
              embedding: createEmbedding(1),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            'class-chunk': {
              id: 'class-chunk',
              filePath: 'test.ts',
              language: 'typescript',
              type: 'class',
              name: 'MyClass',
              content: 'class MyClass {}',
              hash: 'c-hash',
              startLine: 5,
              endLine: 10,
              embedding: createEmbedding(2),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
          relations: [],
          metadata: {
            totalFiles: 1,
            totalChunks: 2,
            languages: ['typescript'],
            lastIndexed: new Date().toISOString(),
            embeddingModel: 'local',
            indexDuration: 100,
          },
        };
        fs.writeFileSync(indexPath, JSON.stringify(indexData));

        service = new RAGService(eventBus, { indexPath });

        const response = await service.search({
          query: 'test',
          filters: { types: ['class'] },
        });

        const types = response.results.map(r => r.chunk.type);
        expect(types.every(t => t === 'class')).toBe(true);
      });
    });

    it('filters by path when specified', async () => {
      await withTempDir(async (dir) => {
        const indexPath = path.join(dir, 'rag-index.json');

        const indexData = {
          version: '3.0.0',
          projectPath: dir,
          chunks: {
            'src-chunk': {
              id: 'src-chunk',
              filePath: 'src/utils/helper.ts',
              language: 'typescript',
              type: 'function',
              name: 'helper',
              content: 'function helper() {}',
              hash: 'src-hash',
              startLine: 1,
              endLine: 3,
              embedding: createEmbedding(1),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            'test-chunk': {
              id: 'test-chunk',
              filePath: 'tests/helper.test.ts',
              language: 'typescript',
              type: 'function',
              name: 'testHelper',
              content: 'function testHelper() {}',
              hash: 'test-hash',
              startLine: 1,
              endLine: 3,
              embedding: createEmbedding(2),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
          relations: [],
          metadata: {
            totalFiles: 2,
            totalChunks: 2,
            languages: ['typescript'],
            lastIndexed: new Date().toISOString(),
            embeddingModel: 'local',
            indexDuration: 100,
          },
        };
        fs.writeFileSync(indexPath, JSON.stringify(indexData));

        service = new RAGService(eventBus, { indexPath });

        const response = await service.search({
          query: 'helper',
          filters: { paths: ['src/'] },
        });

        const paths = response.results.map(r => r.chunk.filePath);
        expect(paths.every(p => p.includes('src/'))).toBe(true);
      });
    });

    it('respects limit parameter', async () => {
      await withTempDir(async (dir) => {
        const indexPath = path.join(dir, 'rag-index.json');

        // Create many chunks with 256-dim embeddings
        const chunks: Record<string, unknown> = {};
        for (let i = 0; i < 20; i++) {
          chunks[`chunk-${i}`] = {
            id: `chunk-${i}`,
            filePath: `file${i}.ts`,
            language: 'typescript',
            type: 'function',
            name: `func${i}`,
            content: `function func${i}() {}`,
            hash: `hash-${i}`,
            startLine: 1,
            endLine: 3,
            embedding: createEmbedding(i),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }

        const indexData = {
          version: '3.0.0',
          projectPath: dir,
          chunks,
          relations: [],
          metadata: {
            totalFiles: 20,
            totalChunks: 20,
            languages: ['typescript'],
            lastIndexed: new Date().toISOString(),
            embeddingModel: 'local',
            indexDuration: 100,
          },
        };
        fs.writeFileSync(indexPath, JSON.stringify(indexData));

        service = new RAGService(eventBus, { indexPath });

        const response = await service.search({
          query: 'func',
          limit: 5,
        });

        expect(response.results.length).toBeLessThanOrEqual(5);
      });
    });
  });

  describe('searchHybrid()', () => {
    it('returns empty results when no index exists', async () => {
      await withTempDir(async (dir) => {
        const indexPath = path.join(dir, 'rag-index.json');
        service = new RAGService(eventBus, { indexPath });

        const response = await service.searchHybrid({ query: 'test' });

        expect(response.results).toEqual([]);
        expect(response.totalMatches).toBe(0);
        expect(response.method).toBe('hybrid');
      });
    });

    it('returns empty results when index is empty', async () => {
      await withTempDir(async (dir) => {
        const indexPath = path.join(dir, 'rag-index.json');

        const indexData = {
          version: '3.0.0',
          projectPath: dir,
          chunks: {},
          relations: [],
          metadata: {
            totalFiles: 0,
            totalChunks: 0,
            languages: [],
            lastIndexed: new Date().toISOString(),
            embeddingModel: 'local',
            indexDuration: 0,
          },
        };
        fs.writeFileSync(indexPath, JSON.stringify(indexData));

        service = new RAGService(eventBus, { indexPath });
        const response = await service.searchHybrid({ query: 'anything' });

        expect(response.results).toEqual([]);
        expect(response.method).toBe('hybrid');
      });
    });
  });

  describe('searchBM25()', () => {
    it('returns empty array when no bm25Index', async () => {
      await withTempDir(async (dir) => {
        const indexPath = path.join(dir, 'rag-index.json');
        service = new RAGService(eventBus, { indexPath });

        const results = service.searchBM25('test query');

        // BM25 index exists but has no documents
        expect(results).toEqual([]);
      });
    });
  });

  describe('getStatus()', () => {
    it('returns not indexed when no index loaded', async () => {
      await withTempDir(async (dir) => {
        const indexPath = path.join(dir, 'rag-index.json');
        service = new RAGService(eventBus, { indexPath });

        const status = service.getStatus();

        expect(status.indexed).toBe(false);
        expect(status.metadata).toBeNull();
        expect(status.buildProgress).toBeNull();
      });
    });

    it('returns indexed with metadata when index loaded', async () => {
      await withTempDir(async (dir) => {
        const indexPath = path.join(dir, 'rag-index.json');
        const now = new Date().toISOString();

        const indexData = {
          version: '3.0.0',
          projectPath: dir,
          chunks: {
            'chunk-1': {
              id: 'chunk-1',
              filePath: 'test.ts',
              language: 'typescript',
              type: 'function',
              name: 'testFn',
              content: 'function test() {}',
              hash: 'abc123',
              startLine: 1,
              endLine: 3,
              createdAt: now,
              updatedAt: now,
            },
          },
          relations: [],
          metadata: {
            totalFiles: 1,
            totalChunks: 1,
            languages: ['typescript'],
            lastIndexed: now,
            embeddingModel: 'local',
            indexDuration: 100,
          },
        };
        fs.writeFileSync(indexPath, JSON.stringify(indexData));

        service = new RAGService(eventBus, { indexPath });
        const status = service.getStatus();

        expect(status.indexed).toBe(true);
        expect(status.metadata).not.toBeNull();
        expect(status.metadata?.totalChunks).toBe(1);
        expect(status.metadata?.totalFiles).toBe(1);
        expect(status.metadata?.languages).toContain('typescript');
      });
    });
  });

  describe('getChunk()', () => {
    it('returns undefined when no index', async () => {
      await withTempDir(async (dir) => {
        const indexPath = path.join(dir, 'rag-index.json');
        service = new RAGService(eventBus, { indexPath });

        const chunk = service.getChunk('nonexistent');

        expect(chunk).toBeUndefined();
      });
    });

    it('returns chunk by id when found', async () => {
      await withTempDir(async (dir) => {
        const indexPath = path.join(dir, 'rag-index.json');

        const indexData = {
          version: '3.0.0',
          projectPath: dir,
          chunks: {
            'chunk-123': {
              id: 'chunk-123',
              filePath: 'test.ts',
              language: 'typescript',
              type: 'function',
              name: 'myFunc',
              content: 'function myFunc() { return 42; }',
              hash: 'xyz789',
              startLine: 1,
              endLine: 3,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
          relations: [],
          metadata: {
            totalFiles: 1,
            totalChunks: 1,
            languages: ['typescript'],
            lastIndexed: new Date().toISOString(),
            embeddingModel: 'local',
            indexDuration: 100,
          },
        };
        fs.writeFileSync(indexPath, JSON.stringify(indexData));

        service = new RAGService(eventBus, { indexPath });
        const chunk = service.getChunk('chunk-123');

        expect(chunk).toBeDefined();
        expect(chunk?.id).toBe('chunk-123');
        expect(chunk?.name).toBe('myFunc');
      });
    });

    it('returns undefined for nonexistent chunk id', async () => {
      await withTempDir(async (dir) => {
        const indexPath = path.join(dir, 'rag-index.json');

        const indexData = {
          version: '3.0.0',
          projectPath: dir,
          chunks: {
            'existing': {
              id: 'existing',
              filePath: 'test.ts',
              language: 'typescript',
              type: 'function',
              name: 'test',
              content: 'function test() {}',
              hash: 'hash',
              startLine: 1,
              endLine: 1,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
          relations: [],
          metadata: {
            totalFiles: 1,
            totalChunks: 1,
            languages: ['typescript'],
            lastIndexed: new Date().toISOString(),
            embeddingModel: 'local',
            indexDuration: 100,
          },
        };
        fs.writeFileSync(indexPath, JSON.stringify(indexData));

        service = new RAGService(eventBus, { indexPath });
        const chunk = service.getChunk('nonexistent');

        expect(chunk).toBeUndefined();
      });
    });
  });

  describe('clearIndex()', () => {
    it('clears the in-memory index', async () => {
      await withTempDir(async (dir) => {
        const indexPath = path.join(dir, 'rag-index.json');

        const indexData = {
          version: '3.0.0',
          projectPath: dir,
          chunks: {
            'chunk-1': {
              id: 'chunk-1',
              filePath: 'test.ts',
              language: 'typescript',
              type: 'function',
              name: 'testFn',
              content: 'function test() {}',
              hash: 'abc123',
              startLine: 1,
              endLine: 3,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
          relations: [],
          metadata: {
            totalFiles: 1,
            totalChunks: 1,
            languages: ['typescript'],
            lastIndexed: new Date().toISOString(),
            embeddingModel: 'local',
            indexDuration: 100,
          },
        };
        fs.writeFileSync(indexPath, JSON.stringify(indexData));

        service = new RAGService(eventBus, { indexPath });
        expect(service.getStatus().indexed).toBe(true);

        service.clearIndex();

        expect(service.getStatus().indexed).toBe(false);
      });
    });

    it('removes index file from disk', async () => {
      await withTempDir(async (dir) => {
        const indexPath = path.join(dir, 'rag-index.json');

        const indexData = {
          version: '3.0.0',
          projectPath: dir,
          chunks: {},
          relations: [],
          metadata: {
            totalFiles: 0,
            totalChunks: 0,
            languages: [],
            lastIndexed: new Date().toISOString(),
            embeddingModel: 'local',
            indexDuration: 0,
          },
        };
        fs.writeFileSync(indexPath, JSON.stringify(indexData));
        expect(fs.existsSync(indexPath)).toBe(true);

        service = new RAGService(eventBus, { indexPath });
        service.clearIndex();

        expect(fs.existsSync(indexPath)).toBe(false);
      });
    });

    it('handles missing index file gracefully', async () => {
      await withTempDir(async (dir) => {
        const indexPath = path.join(dir, 'nonexistent-index.json');
        service = new RAGService(eventBus, { indexPath });

        // Should not throw
        expect(() => service.clearIndex()).not.toThrow();
        expect(service.getStatus().indexed).toBe(false);
      });
    });
  });

  describe('findSimilar()', () => {
    it('returns empty array when no index', async () => {
      await withTempDir(async (dir) => {
        const indexPath = path.join(dir, 'rag-index.json');
        service = new RAGService(eventBus, { indexPath });

        const results = await service.findSimilar('test.ts', 'testFunc');

        expect(results).toEqual([]);
      });
    });

    it('returns empty array when source chunk not found', async () => {
      await withTempDir(async (dir) => {
        const indexPath = path.join(dir, 'rag-index.json');

        const indexData = {
          version: '3.0.0',
          projectPath: dir,
          chunks: {
            'other-chunk': {
              id: 'other-chunk',
              filePath: 'other.ts',
              language: 'typescript',
              type: 'function',
              name: 'otherFunc',
              content: 'function otherFunc() {}',
              hash: 'hash',
              startLine: 1,
              endLine: 3,
              embedding: [0.1, 0.2, 0.3],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
          relations: [],
          metadata: {
            totalFiles: 1,
            totalChunks: 1,
            languages: ['typescript'],
            lastIndexed: new Date().toISOString(),
            embeddingModel: 'local',
            indexDuration: 100,
          },
        };
        fs.writeFileSync(indexPath, JSON.stringify(indexData));

        service = new RAGService(eventBus, { indexPath });
        const results = await service.findSimilar('nonexistent.ts', 'noFunc');

        expect(results).toEqual([]);
      });
    });

    it('returns empty array when source chunk has no embedding', async () => {
      await withTempDir(async (dir) => {
        const indexPath = path.join(dir, 'rag-index.json');

        const indexData = {
          version: '3.0.0',
          projectPath: dir,
          chunks: {
            'no-embed-chunk': {
              id: 'no-embed-chunk',
              filePath: 'test.ts',
              language: 'typescript',
              type: 'function',
              name: 'testFunc',
              content: 'function testFunc() {}',
              hash: 'hash',
              startLine: 1,
              endLine: 3,
              // No embedding field
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
          relations: [],
          metadata: {
            totalFiles: 1,
            totalChunks: 1,
            languages: ['typescript'],
            lastIndexed: new Date().toISOString(),
            embeddingModel: 'local',
            indexDuration: 100,
          },
        };
        fs.writeFileSync(indexPath, JSON.stringify(indexData));

        service = new RAGService(eventBus, { indexPath });
        const results = await service.findSimilar('test.ts', 'testFunc');

        expect(results).toEqual([]);
      });
    });
  });

  describe('getHybridStats()', () => {
    it('returns stats when hybrid search is enabled', async () => {
      await withTempDir(async (dir) => {
        const indexPath = path.join(dir, 'rag-index.json');
        service = new RAGService(eventBus, { indexPath });

        const stats = service.getHybridStats();

        expect(stats).not.toBeNull();
        expect(stats?.enabled).toBe(true);
      });
    });
  });

  describe('rebuildHybridIndex()', () => {
    it('does nothing when no index exists', async () => {
      await withTempDir(async (dir) => {
        const indexPath = path.join(dir, 'rag-index.json');
        service = new RAGService(eventBus, { indexPath });

        // Should not throw
        await expect(service.rebuildHybridIndex()).resolves.not.toThrow();
      });
    });
  });
});
