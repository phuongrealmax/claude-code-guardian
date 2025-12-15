// tests/helpers/fakes/fakeEmbeddingProvider.ts

/**
 * Fake EmbeddingProvider for testing
 * Returns deterministic embeddings based on text hash or predefined map
 */
export class FakeEmbeddingProvider {
  public callCount = 0;
  public calls: string[] = [];

  constructor(
    private map: Record<string, number[]> = {},
    private defaultDimension = 384
  ) {}

  async embed(text: string): Promise<number[]> {
    this.callCount++;
    this.calls.push(text);

    // Return mapped embedding if exists
    if (this.map[text]) {
      return this.map[text];
    }

    // Generate deterministic embedding from text hash
    return this.hashToEmbedding(text);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(t => this.embed(t)));
  }

  private hashToEmbedding(text: string): number[] {
    // Simple deterministic "embedding" from text
    const embedding: number[] = [];
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    }

    for (let i = 0; i < this.defaultDimension; i++) {
      // Use hash to generate pseudo-random values between -1 and 1
      hash = ((hash * 1103515245 + 12345) | 0) >>> 0;
      embedding.push((hash % 1000) / 500 - 1);
    }

    // Normalize
    const norm = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
    return embedding.map(v => v / norm);
  }

  clear(): void {
    this.callCount = 0;
    this.calls = [];
  }
}
