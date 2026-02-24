type EmbedderFn = (text: string) => Promise<Float32Array>;

export interface EmbeddingServiceOptions {
  modelId?: string;
  /** Inject custom embedder for testing */
  embedder?: EmbedderFn;
}

export class EmbeddingService {
  private embedder: EmbedderFn | null = null;
  private ready = false;
  private modelId: string;
  private customEmbedder?: EmbedderFn;

  constructor(options: EmbeddingServiceOptions = {}) {
    this.modelId = options.modelId ?? 'Xenova/multilingual-e5-small';
    this.customEmbedder = options.embedder;
  }

  async initialize(): Promise<void> {
    if (this.ready) return;

    if (this.customEmbedder) {
      this.embedder = this.customEmbedder;
    } else {
      // Dynamic import to avoid loading transformers.js until needed
      const { pipeline } = await import('@huggingface/transformers');
      const pipe = await pipeline('feature-extraction', this.modelId, {
        dtype: 'fp32',
      });

      this.embedder = async (text: string) => {
        const output = await pipe(text, { pooling: 'mean', normalize: true });
        return new Float32Array(output.data);
      };
    }

    this.ready = true;
  }

  isReady(): boolean {
    return this.ready;
  }

  async embed(text: string): Promise<Float32Array> {
    if (!this.embedder) {
      throw new Error('EmbeddingService not initialized. Call initialize() first.');
    }
    return this.embedder(text);
  }

  async embedBatch(texts: string[]): Promise<Float32Array[]> {
    if (!this.embedder) {
      throw new Error('EmbeddingService not initialized. Call initialize() first.');
    }
    // Process sequentially to avoid memory issues
    const results: Float32Array[] = [];
    for (const text of texts) {
      results.push(await this.embedder(text));
    }
    return results;
  }
}
