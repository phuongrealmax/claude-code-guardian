// tests/unit/bm25.test.ts
// BM25 Index Unit Tests

// Using vitest globals
import { BM25Index, createBM25Index } from '../../src/modules/rag/bm25.js';
import type { BM25Document } from '../../src/modules/rag/bm25.js';

describe('BM25Index', () => {
  let index: BM25Index;

  beforeEach(() => {
    index = new BM25Index();
  });

  describe('constructor', () => {
    it('creates index with default config', () => {
      const idx = new BM25Index();
      expect(idx).toBeDefined();
    });

    it('creates index with custom config', () => {
      const idx = new BM25Index({ k1: 2.0, b: 0.5 });
      expect(idx).toBeDefined();
    });

    it('creates index via factory function', () => {
      const idx = createBM25Index({ k1: 1.2 });
      expect(idx).toBeDefined();
    });
  });

  describe('addDocument()', () => {
    it('adds single document', () => {
      index.addDocument({
        id: 'doc1',
        content: 'hello world',
      });

      const stats = index.getStats();
      expect(stats.totalDocuments).toBe(1);
    });

    it('adds document with pre-tokenized content', () => {
      index.addDocument({
        id: 'doc1',
        content: '',
        tokens: ['hello', 'world'],
      });

      const stats = index.getStats();
      expect(stats.totalDocuments).toBe(1);
    });

    it('adds multiple documents', () => {
      index.addDocument({ id: 'doc1', content: 'hello world' });
      index.addDocument({ id: 'doc2', content: 'foo bar' });
      index.addDocument({ id: 'doc3', content: 'baz qux' });

      const stats = index.getStats();
      expect(stats.totalDocuments).toBe(3);
    });
  });

  describe('addDocuments()', () => {
    it('adds multiple documents at once', () => {
      index.addDocuments([
        { id: 'doc1', content: 'hello world' },
        { id: 'doc2', content: 'foo bar' },
        { id: 'doc3', content: 'baz qux' },
      ]);

      const stats = index.getStats();
      expect(stats.totalDocuments).toBe(3);
    });
  });

  describe('removeDocument()', () => {
    it('removes existing document', () => {
      index.addDocument({ id: 'doc1', content: 'hello world' });
      index.addDocument({ id: 'doc2', content: 'foo bar' });

      const result = index.removeDocument('doc1');

      expect(result).toBe(true);
      expect(index.getStats().totalDocuments).toBe(1);
    });

    it('returns false for non-existent document', () => {
      const result = index.removeDocument('nonexistent');

      expect(result).toBe(false);
    });

    it('updates term frequencies after removal', () => {
      index.addDocument({ id: 'doc1', content: 'hello world' });
      index.addDocument({ id: 'doc2', content: 'hello bar' });

      index.removeDocument('doc1');

      // 'hello' should still be searchable in doc2
      const results = index.search('hello');
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('doc2');
    });

    it('removes term when last document with it is removed', () => {
      index.addDocument({ id: 'doc1', content: 'unique term' });
      index.addDocument({ id: 'doc2', content: 'other content' });

      index.removeDocument('doc1');

      // 'unique' should no longer return results
      const results = index.search('unique');
      expect(results.length).toBe(0);
    });
  });

  describe('search()', () => {
    beforeEach(() => {
      index.addDocuments([
        { id: 'doc1', content: 'the quick brown fox jumps over the lazy dog' },
        { id: 'doc2', content: 'the lazy cat sleeps all day' },
        { id: 'doc3', content: 'quick brown bread is delicious' },
        { id: 'doc4', content: 'programming in typescript is fun' },
      ]);
    });

    it('finds documents matching query', () => {
      const results = index.search('quick');

      expect(results.length).toBe(2);
      expect(results.some(r => r.id === 'doc1')).toBe(true);
      expect(results.some(r => r.id === 'doc3')).toBe(true);
    });

    it('returns empty array for no matches', () => {
      const results = index.search('xyz123');

      expect(results).toEqual([]);
    });

    it('returns empty array for empty query', () => {
      const results = index.search('');

      expect(results).toEqual([]);
    });

    it('returns empty array for query with only short tokens', () => {
      const results = index.search('a');

      expect(results).toEqual([]);
    });

    it('ranks more relevant documents higher', () => {
      const results = index.search('quick brown');

      // doc1 and doc3 both have "quick" and "brown"
      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results[0].score).toBeGreaterThan(0);
    });

    it('respects limit parameter', () => {
      const results = index.search('the', 1);

      expect(results.length).toBe(1);
    });

    it('includes matched terms', () => {
      const results = index.search('lazy');

      expect(results.length).toBe(2);
      expect(results[0].matchedTerms).toContain('lazy');
    });

    it('handles multi-word queries', () => {
      const results = index.search('quick brown fox');

      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].id).toBe('doc1'); // Most relevant
    });

    it('is case insensitive', () => {
      const results = index.search('QUICK');

      expect(results.length).toBe(2);
    });

    it('ignores special characters in query', () => {
      const results = index.search('quick! brown?');

      expect(results.length).toBe(2);
    });
  });

  describe('getStats()', () => {
    it('returns zero stats for empty index', () => {
      const stats = index.getStats();

      expect(stats.totalDocuments).toBe(0);
      expect(stats.totalTerms).toBe(0);
      expect(stats.avgDocLength).toBe(0);
    });

    it('returns correct stats after adding documents', () => {
      index.addDocument({ id: 'doc1', content: 'hello world' });
      index.addDocument({ id: 'doc2', content: 'foo bar baz' });

      const stats = index.getStats();

      expect(stats.totalDocuments).toBe(2);
      expect(stats.totalTerms).toBeGreaterThan(0);
      expect(stats.avgDocLength).toBeGreaterThan(0);
    });
  });

  describe('clear()', () => {
    it('clears all documents', () => {
      index.addDocuments([
        { id: 'doc1', content: 'hello world' },
        { id: 'doc2', content: 'foo bar' },
      ]);

      index.clear();

      const stats = index.getStats();
      expect(stats.totalDocuments).toBe(0);
      expect(stats.totalTerms).toBe(0);
    });

    it('allows adding new documents after clear', () => {
      index.addDocument({ id: 'doc1', content: 'hello' });
      index.clear();
      index.addDocument({ id: 'doc2', content: 'world' });

      expect(index.getStats().totalDocuments).toBe(1);
    });
  });

  describe('export()', () => {
    it('exports index data', () => {
      index.addDocuments([
        { id: 'doc1', content: 'hello world' },
        { id: 'doc2', content: 'foo bar' },
      ]);

      const exported = index.export();

      expect(exported.config).toBeDefined();
      expect(exported.documents.length).toBe(2);
      expect(exported.stats.totalDocs).toBe(2);
    });

    it('includes config in export', () => {
      const customIndex = new BM25Index({ k1: 2.0, b: 0.5 });
      customIndex.addDocument({ id: 'doc1', content: 'test' });

      const exported = customIndex.export();

      expect(exported.config.k1).toBe(2.0);
      expect(exported.config.b).toBe(0.5);
    });
  });

  describe('import()', () => {
    it('imports index data', () => {
      const sourceIndex = new BM25Index();
      sourceIndex.addDocuments([
        { id: 'doc1', content: 'hello world' },
        { id: 'doc2', content: 'foo bar' },
      ]);

      const exported = sourceIndex.export();

      const targetIndex = new BM25Index();
      targetIndex.import({
        config: exported.config,
        documents: exported.documents,
      });

      expect(targetIndex.getStats().totalDocuments).toBe(2);
    });

    it('search works after import', () => {
      const sourceIndex = new BM25Index();
      sourceIndex.addDocument({ id: 'doc1', content: 'searchable content' });

      const exported = sourceIndex.export();

      const targetIndex = new BM25Index();
      targetIndex.import({
        config: exported.config,
        documents: exported.documents,
      });

      const results = targetIndex.search('searchable');
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('doc1');
    });

    it('clears existing data before import', () => {
      index.addDocument({ id: 'existing', content: 'old content' });

      const sourceIndex = new BM25Index();
      sourceIndex.addDocument({ id: 'new', content: 'new content' });
      const exported = sourceIndex.export();

      index.import({
        config: exported.config,
        documents: exported.documents,
      });

      expect(index.getStats().totalDocuments).toBe(1);
      expect(index.search('old').length).toBe(0);
      expect(index.search('new').length).toBe(1);
    });
  });

  describe('tokenization', () => {
    it('filters out single character tokens', () => {
      index.addDocument({ id: 'doc1', content: 'a b c hello world' });

      // Single chars should be filtered, so searching for 'a' returns nothing
      const results = index.search('a');
      expect(results.length).toBe(0);
    });

    it('handles underscore separated words', () => {
      index.addDocument({ id: 'doc1', content: 'my_function_name' });

      // Underscores are kept as part of tokens (alphanumeric + underscore)
      const results = index.search('my_function_name');
      expect(results.length).toBe(1);
    });

    it('handles numbers in text', () => {
      index.addDocument({ id: 'doc1', content: 'version 123 release' });

      const results = index.search('123');
      expect(results.length).toBe(1);
    });
  });

  describe('BM25 scoring', () => {
    it('documents with higher term frequency score higher', () => {
      index.addDocument({ id: 'doc1', content: 'test' });
      index.addDocument({ id: 'doc2', content: 'test test test' });

      const results = index.search('test');

      // doc2 should score higher due to more occurrences
      expect(results[0].id).toBe('doc2');
    });

    it('shorter documents can score higher with same term frequency', () => {
      // BM25 normalizes by document length
      index.addDocument({
        id: 'short',
        content: 'target keyword here',
      });
      index.addDocument({
        id: 'long',
        content: 'target plus many other words that dilute the score significantly',
      });

      const results = index.search('target');

      expect(results.length).toBe(2);
      // Short doc should score higher
      expect(results[0].id).toBe('short');
    });

    it('rare terms get higher IDF scores', () => {
      // Add many docs with common term, one with rare term
      for (let i = 0; i < 10; i++) {
        index.addDocument({ id: `common${i}`, content: 'common term here' });
      }
      index.addDocument({ id: 'rare', content: 'rare unique special' });

      // Rare terms should have higher IDF
      const commonResults = index.search('common');
      const rareResults = index.search('rare');

      // The rare document should have relatively higher score
      // (though this is hard to test directly without exposing IDF)
      expect(commonResults.length).toBe(10);
      expect(rareResults.length).toBe(1);
    });
  });
});
