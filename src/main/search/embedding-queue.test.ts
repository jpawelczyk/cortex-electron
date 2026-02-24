import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmbeddingQueue } from './embedding-queue';
import type { EmbeddingService } from './embedding-service';
import type { VectorStore } from './vector-store';

// Mock content-extractor
vi.mock('./content-extractor', () => ({
  contentHash: vi.fn((text: string) => `hash:${text}`),
  shouldChunk: vi.fn((text: string) => text.length > 500),
  prepareForEmbedding: vi.fn((text: string, isQuery: boolean) =>
    isQuery ? `query: ${text}` : `passage: ${text}`
  ),
}));

// Mock chunker
vi.mock('./chunker', () => ({
  chunkText: vi.fn((text: string) => {
    // Simulate chunking long text into 3 equal parts
    const third = Math.floor(text.length / 3);
    return [text.slice(0, third), text.slice(third, 2 * third), text.slice(2 * third)];
  }),
}));

const mockEmbeddingService = {
  embed: vi.fn().mockResolvedValue(new Float32Array(384)),
  embedBatch: vi.fn(),
  initialize: vi.fn(),
  isReady: vi.fn().mockReturnValue(true),
};

const mockVectorStore = {
  upsertEmbedding: vi.fn(),
  deleteByEntityId: vi.fn(),
  getContentHash: vi.fn().mockReturnValue(null),
  getByEntityId: vi.fn().mockReturnValue([]),
  searchSimilar: vi.fn().mockReturnValue([]),
  getIndexedCount: vi.fn().mockReturnValue(0),
  clear: vi.fn(),
  close: vi.fn(),
  initialize: vi.fn(),
};

describe('EmbeddingQueue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockVectorStore.getContentHash.mockReturnValue(null);
    mockEmbeddingService.embed.mockResolvedValue(new Float32Array(384));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('enqueue does not process immediately', () => {
    const queue = new EmbeddingQueue(
      mockEmbeddingService as unknown as EmbeddingService,
      mockVectorStore as unknown as VectorStore
    );

    queue.enqueue('entity-1', 'task', 'some text');

    expect(mockEmbeddingService.embed).not.toHaveBeenCalled();
    expect(mockVectorStore.upsertEmbedding).not.toHaveBeenCalled();

    queue.destroy();
  });

  it('enqueue processes after debounce delay', async () => {
    const queue = new EmbeddingQueue(
      mockEmbeddingService as unknown as EmbeddingService,
      mockVectorStore as unknown as VectorStore,
      { debounceMs: 2000 }
    );

    queue.enqueue('entity-1', 'task', 'short text');

    expect(mockEmbeddingService.embed).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(2000);

    expect(mockEmbeddingService.embed).toHaveBeenCalledTimes(1);

    queue.destroy();
  });

  it('multiple rapid enqueues for same entity only process once', async () => {
    const queue = new EmbeddingQueue(
      mockEmbeddingService as unknown as EmbeddingService,
      mockVectorStore as unknown as VectorStore,
      { debounceMs: 2000 }
    );

    queue.enqueue('entity-1', 'task', 'text v1');
    queue.enqueue('entity-1', 'task', 'text v2');
    queue.enqueue('entity-1', 'task', 'text v3');

    await vi.advanceTimersByTimeAsync(2000);

    // Only one embed call for the last version
    expect(mockEmbeddingService.embed).toHaveBeenCalledTimes(1);

    queue.destroy();
  });

  it('skips re-embedding when content hash matches', async () => {
    const queue = new EmbeddingQueue(
      mockEmbeddingService as unknown as EmbeddingService,
      mockVectorStore as unknown as VectorStore,
      { debounceMs: 2000 }
    );

    // Return a matching hash for this entity
    mockVectorStore.getContentHash.mockReturnValue('hash:short text');

    queue.enqueue('entity-1', 'task', 'short text');
    await vi.advanceTimersByTimeAsync(2000);

    expect(mockEmbeddingService.embed).not.toHaveBeenCalled();
    expect(mockVectorStore.upsertEmbedding).not.toHaveBeenCalled();

    queue.destroy();
  });

  it('re-embeds when content hash differs', async () => {
    const queue = new EmbeddingQueue(
      mockEmbeddingService as unknown as EmbeddingService,
      mockVectorStore as unknown as VectorStore,
      { debounceMs: 2000 }
    );

    // Return a different hash
    mockVectorStore.getContentHash.mockReturnValue('hash:old text');

    queue.enqueue('entity-1', 'task', 'new text');
    await vi.advanceTimersByTimeAsync(2000);

    expect(mockEmbeddingService.embed).toHaveBeenCalledTimes(1);
    expect(mockVectorStore.upsertEmbedding).toHaveBeenCalledTimes(1);

    queue.destroy();
  });

  it('long text is chunked into multiple embeddings', async () => {
    const queue = new EmbeddingQueue(
      mockEmbeddingService as unknown as EmbeddingService,
      mockVectorStore as unknown as VectorStore,
      { debounceMs: 2000 }
    );

    // Text longer than 500 chars triggers shouldChunk -> true -> chunkText returns 3 chunks
    const longText = 'a'.repeat(600);
    queue.enqueue('entity-1', 'note', longText);
    await vi.advanceTimersByTimeAsync(2000);

    // chunkText mock returns 3 chunks for long text
    expect(mockEmbeddingService.embed).toHaveBeenCalledTimes(3);
    expect(mockVectorStore.upsertEmbedding).toHaveBeenCalledTimes(3);

    // Each call should have the correct chunkIndex
    const calls = mockVectorStore.upsertEmbedding.mock.calls;
    expect(calls[0][0].chunkIndex).toBe(0);
    expect(calls[1][0].chunkIndex).toBe(1);
    expect(calls[2][0].chunkIndex).toBe(2);

    queue.destroy();
  });

  it('short text is embedded as single chunk', async () => {
    const queue = new EmbeddingQueue(
      mockEmbeddingService as unknown as EmbeddingService,
      mockVectorStore as unknown as VectorStore,
      { debounceMs: 2000 }
    );

    queue.enqueue('entity-1', 'task', 'short text');
    await vi.advanceTimersByTimeAsync(2000);

    expect(mockEmbeddingService.embed).toHaveBeenCalledTimes(1);
    expect(mockVectorStore.upsertEmbedding).toHaveBeenCalledTimes(1);

    const upsertArg = mockVectorStore.upsertEmbedding.mock.calls[0][0];
    expect(upsertArg.chunkIndex).toBe(0);
    expect(upsertArg.entityId).toBe('entity-1');
    expect(upsertArg.entityType).toBe('task');

    queue.destroy();
  });

  it('removeEntity deletes embeddings from vector store', () => {
    const queue = new EmbeddingQueue(
      mockEmbeddingService as unknown as EmbeddingService,
      mockVectorStore as unknown as VectorStore
    );

    queue.removeEntity('entity-1');

    expect(mockVectorStore.deleteByEntityId).toHaveBeenCalledWith('entity-1');
    expect(mockVectorStore.deleteByEntityId).toHaveBeenCalledTimes(1);

    queue.destroy();
  });

  it('flush processes all pending items immediately', async () => {
    const queue = new EmbeddingQueue(
      mockEmbeddingService as unknown as EmbeddingService,
      mockVectorStore as unknown as VectorStore,
      { debounceMs: 10000 }
    );

    queue.enqueue('entity-1', 'task', 'text 1');
    queue.enqueue('entity-2', 'note', 'text 2');

    expect(queue.getQueueSize()).toBe(2);
    expect(mockEmbeddingService.embed).not.toHaveBeenCalled();

    await queue.flush();

    expect(queue.getQueueSize()).toBe(0);
    expect(mockEmbeddingService.embed).toHaveBeenCalledTimes(2);

    queue.destroy();
  });

  it('getQueueSize returns number of pending items', () => {
    const queue = new EmbeddingQueue(
      mockEmbeddingService as unknown as EmbeddingService,
      mockVectorStore as unknown as VectorStore,
      { debounceMs: 10000 }
    );

    expect(queue.getQueueSize()).toBe(0);

    queue.enqueue('entity-1', 'task', 'text 1');
    expect(queue.getQueueSize()).toBe(1);

    queue.enqueue('entity-2', 'note', 'text 2');
    expect(queue.getQueueSize()).toBe(2);

    // Same entity replaces existing entry
    queue.enqueue('entity-1', 'task', 'updated text');
    expect(queue.getQueueSize()).toBe(2);

    queue.destroy();
  });

  it('destroy clears all pending timers', async () => {
    const queue = new EmbeddingQueue(
      mockEmbeddingService as unknown as EmbeddingService,
      mockVectorStore as unknown as VectorStore,
      { debounceMs: 2000 }
    );

    queue.enqueue('entity-1', 'task', 'text 1');
    queue.enqueue('entity-2', 'note', 'text 2');
    expect(queue.getQueueSize()).toBe(2);

    queue.destroy();

    expect(queue.getQueueSize()).toBe(0);

    // Advance timers - nothing should fire
    await vi.advanceTimersByTimeAsync(5000);

    expect(mockEmbeddingService.embed).not.toHaveBeenCalled();
  });

  it('error in embedding does not crash the queue', async () => {
    const queue = new EmbeddingQueue(
      mockEmbeddingService as unknown as EmbeddingService,
      mockVectorStore as unknown as VectorStore,
      { debounceMs: 2000 }
    );

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockEmbeddingService.embed.mockRejectedValueOnce(new Error('embed failed'));

    queue.enqueue('entity-1', 'task', 'text that will fail');
    queue.enqueue('entity-2', 'note', 'text that will succeed');

    await vi.advanceTimersByTimeAsync(2000);

    // Queue should not crash - error should be logged
    expect(consoleSpy).toHaveBeenCalled();

    // Advance again to process entity-2 (it was debounced separately)
    // Both were enqueued at the same time so they fire at the same time
    expect(mockEmbeddingService.embed).toHaveBeenCalled();

    consoleSpy.mockRestore();
    queue.destroy();
  });

  it('upsertEmbedding is called with correct contentHash', async () => {
    const queue = new EmbeddingQueue(
      mockEmbeddingService as unknown as EmbeddingService,
      mockVectorStore as unknown as VectorStore,
      { debounceMs: 2000 }
    );

    queue.enqueue('entity-1', 'task', 'my text');
    await vi.advanceTimersByTimeAsync(2000);

    const upsertArg = mockVectorStore.upsertEmbedding.mock.calls[0][0];
    expect(upsertArg.contentHash).toBe('hash:my text');

    queue.destroy();
  });

  it('deleteByEntityId is called before upserting new embeddings', async () => {
    const queue = new EmbeddingQueue(
      mockEmbeddingService as unknown as EmbeddingService,
      mockVectorStore as unknown as VectorStore,
      { debounceMs: 2000 }
    );

    const callOrder: string[] = [];
    mockVectorStore.deleteByEntityId.mockImplementation(() => callOrder.push('delete'));
    mockVectorStore.upsertEmbedding.mockImplementation(() => callOrder.push('upsert'));

    queue.enqueue('entity-1', 'task', 'some text');
    await vi.advanceTimersByTimeAsync(2000);

    expect(callOrder[0]).toBe('delete');
    expect(callOrder[1]).toBe('upsert');

    queue.destroy();
  });
});
