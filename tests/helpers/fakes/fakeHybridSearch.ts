// tests/helpers/fakes/fakeHybridSearch.ts

import type { CodeChunk } from '../../../src/modules/rag/rag.types.js';

export interface HybridSearchResult {
  chunk: CodeChunk;
  score: number;
  highlights?: string[];
}

export interface HybridSearchOptions {
  limit?: number;
  minScore?: number;
  filters?: {
    languages?: string[];
    types?: string[];
    paths?: string[];
  };
}

/**
 * Fake HybridSearch for testing
 * Returns predefined results or filters from internal docs
 */
export class FakeHybridSearch {
  private docs: CodeChunk[] = [];
  private predefinedResults: HybridSearchResult[] | null = null;

  constructor(results?: HybridSearchResult[]) {
    this.predefinedResults = results ?? null;
  }

  setResults(results: HybridSearchResult[]): void {
    this.predefinedResults = results;
  }

  addDoc(chunk: CodeChunk): void {
    this.docs.push(chunk);
  }

  async search(
    _query: string,
    _embedding: number[],
    options: HybridSearchOptions = {}
  ): Promise<HybridSearchResult[]> {
    // Return predefined results if set
    if (this.predefinedResults) {
      return this.applyFilters(this.predefinedResults, options);
    }

    // Otherwise search internal docs with simple scoring
    const results: HybridSearchResult[] = this.docs.map((chunk, idx) => ({
      chunk,
      score: 1 - idx * 0.1, // Decreasing score by index
    }));

    return this.applyFilters(results, options);
  }

  private applyFilters(
    results: HybridSearchResult[],
    options: HybridSearchOptions
  ): HybridSearchResult[] {
    let filtered = results;

    // Apply language filter
    if (options.filters?.languages?.length) {
      filtered = filtered.filter(r =>
        options.filters!.languages!.includes(r.chunk.language)
      );
    }

    // Apply type filter
    if (options.filters?.types?.length) {
      filtered = filtered.filter(r =>
        options.filters!.types!.includes(r.chunk.type)
      );
    }

    // Apply path filter
    if (options.filters?.paths?.length) {
      filtered = filtered.filter(r =>
        options.filters!.paths!.some(p => r.chunk.filePath.includes(p))
      );
    }

    // Apply min score
    if (options.minScore) {
      filtered = filtered.filter(r => r.score >= options.minScore!);
    }

    // Apply limit
    if (options.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  clear(): void {
    this.docs = [];
    this.predefinedResults = null;
  }
}
