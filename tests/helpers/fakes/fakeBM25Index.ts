// tests/helpers/fakes/fakeBM25Index.ts

import type { CodeChunk } from '../../../src/modules/rag/rag.types.js';

interface BM25Result {
  chunk: CodeChunk;
  score: number;
}

/**
 * Fake BM25Index for testing
 * Simple keyword matching instead of real BM25 scoring
 */
export class FakeBM25Index {
  private docs: CodeChunk[] = [];

  add(chunk: CodeChunk): void {
    this.docs.push(chunk);
  }

  addBatch(chunks: CodeChunk[]): void {
    this.docs.push(...chunks);
  }

  search(query: string, k = 10): BM25Result[] {
    const queryTerms = query.toLowerCase().split(/\s+/);

    // Simple term frequency scoring
    const scored = this.docs.map(chunk => {
      const content = (chunk.content + ' ' + chunk.name).toLowerCase();
      let score = 0;
      for (const term of queryTerms) {
        if (content.includes(term)) {
          score += 1;
        }
      }
      return { chunk, score };
    });

    // Sort by score descending, take top k
    return scored
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }

  clear(): void {
    this.docs = [];
  }

  size(): number {
    return this.docs.length;
  }

  toJSON(): { docs: CodeChunk[] } {
    return { docs: this.docs };
  }

  static fromJSON(json: { docs?: CodeChunk[] }): FakeBM25Index {
    const index = new FakeBM25Index();
    (json?.docs ?? []).forEach(doc => index.add(doc));
    return index;
  }
}
