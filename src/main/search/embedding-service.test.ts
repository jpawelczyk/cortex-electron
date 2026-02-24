import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmbeddingService } from './embedding-service';

function makeFloat32Array(dim: number): Float32Array {
  const arr = new Float32Array(dim);
  let norm = 0;
  for (let i = 0; i < dim; i++) {
    arr[i] = Math.random() * 2 - 1;
    norm += arr[i] * arr[i];
  }
  norm = Math.sqrt(norm);
  for (let i = 0; i < dim; i++) arr[i] /= norm;
  return arr;
}

const EMBEDDING_DIM = 384;

describe('EmbeddingService', () => {
  let mockEmbedder: ReturnType<typeof vi.fn>;
  let service: EmbeddingService;

  beforeEach(() => {
    mockEmbedder = vi.fn(async (_text: string) => makeFloat32Array(EMBEDDING_DIM));
    service = new EmbeddingService({ embedder: mockEmbedder });
  });

  describe('isReady', () => {
    it('returns false before initialization', () => {
      expect(service.isReady()).toBe(false);
    });

    it('returns true after initialization', async () => {
      await service.initialize();
      expect(service.isReady()).toBe(true);
    });
  });

  describe('initialize', () => {
    it('calls the embedder factory / sets up the embedder', async () => {
      await service.initialize();
      expect(service.isReady()).toBe(true);
    });

    it('is idempotent - calling twice does not re-initialize', async () => {
      const factoryCallTracker = vi.fn(async (_text: string) => makeFloat32Array(EMBEDDING_DIM));
      const s = new EmbeddingService({ embedder: factoryCallTracker });
      await s.initialize();
      await s.initialize();
      // embed once to trigger the embedder
      await s.embed('hello');
      expect(factoryCallTracker).toHaveBeenCalledTimes(1);
    });
  });

  describe('embed', () => {
    it('throws if called before initialization', async () => {
      await expect(service.embed('test')).rejects.toThrow(
        'EmbeddingService not initialized',
      );
    });

    it('returns a Float32Array of correct dimension (384)', async () => {
      await service.initialize();
      const result = await service.embed('hello world');
      expect(result).toBeInstanceOf(Float32Array);
      expect(result.length).toBe(EMBEDDING_DIM);
    });

    it('calls the embedder function with the provided text', async () => {
      await service.initialize();
      await service.embed('my search query');
      expect(mockEmbedder).toHaveBeenCalledWith('my search query');
    });

    it('passes through different texts correctly', async () => {
      await service.initialize();
      await service.embed('first');
      await service.embed('second');
      expect(mockEmbedder).toHaveBeenCalledWith('first');
      expect(mockEmbedder).toHaveBeenCalledWith('second');
    });
  });

  describe('embedBatch', () => {
    it('throws if called before initialization', async () => {
      await expect(service.embedBatch(['a', 'b'])).rejects.toThrow(
        'EmbeddingService not initialized',
      );
    });

    it('returns an array of Float32Arrays for multiple texts', async () => {
      await service.initialize();
      const texts = ['alpha', 'beta', 'gamma'];
      const results = await service.embedBatch(texts);
      expect(results).toHaveLength(3);
      for (const r of results) {
        expect(r).toBeInstanceOf(Float32Array);
        expect(r.length).toBe(EMBEDDING_DIM);
      }
    });

    it('calls embedder for each text in order', async () => {
      await service.initialize();
      const texts = ['one', 'two', 'three'];
      await service.embedBatch(texts);
      expect(mockEmbedder).toHaveBeenCalledTimes(3);
      expect(mockEmbedder).toHaveBeenNthCalledWith(1, 'one');
      expect(mockEmbedder).toHaveBeenNthCalledWith(2, 'two');
      expect(mockEmbedder).toHaveBeenNthCalledWith(3, 'three');
    });

    it('returns an empty array for an empty input', async () => {
      await service.initialize();
      const results = await service.embedBatch([]);
      expect(results).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('propagates errors thrown by the embedder', async () => {
      const failingEmbedder = vi.fn(async () => {
        throw new Error('model failure');
      });
      const s = new EmbeddingService({ embedder: failingEmbedder });
      await s.initialize();
      await expect(s.embed('trigger error')).rejects.toThrow('model failure');
    });

    it('propagates errors in embedBatch', async () => {
      const failingEmbedder = vi.fn(async () => {
        throw new Error('batch failure');
      });
      const s = new EmbeddingService({ embedder: failingEmbedder });
      await s.initialize();
      await expect(s.embedBatch(['a', 'b'])).rejects.toThrow('batch failure');
    });
  });
});
