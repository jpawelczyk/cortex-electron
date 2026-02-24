import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { VectorStore, cosineSimilarity, bufferToFloat32 } from './vector-store';
import type { SearchableEntityType } from '@shared/search-types';

function makeFloat32(values: number[]): Float32Array {
  return new Float32Array(values);
}

describe('VectorStore', () => {
  let db: Database.Database;
  let store: VectorStore;

  beforeEach(() => {
    db = new Database(':memory:');
    store = new VectorStore(db);
    store.initialize();
  });

  afterEach(() => {
    db.close();
  });

  describe('initialize', () => {
    it('creates the embeddings table', () => {
      const row = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='embeddings'"
      ).get();
      expect(row).toBeDefined();
    });

    it('creates entity index', () => {
      const row = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_embeddings_entity'"
      ).get();
      expect(row).toBeDefined();
    });

    it('creates type index', () => {
      const row = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_embeddings_type'"
      ).get();
      expect(row).toBeDefined();
    });
  });

  describe('upsertEmbedding', () => {
    it('stores an embedding and allows retrieval', () => {
      store.upsertEmbedding({
        id: 'emb-1',
        entityId: 'entity-1',
        entityType: 'task',
        chunkIndex: 0,
        contentHash: 'hash-abc',
        textPreview: 'Hello world',
        embedding: makeFloat32([1, 0, 0]),
      });

      const results = store.getByEntityId('entity-1');
      expect(results).toHaveLength(1);
      expect(results[0].entity_id).toBe('entity-1');
      expect(results[0].entity_type).toBe('task');
      expect(results[0].chunk_index).toBe(0);
      expect(results[0].content_hash).toBe('hash-abc');
      expect(results[0].text_preview).toBe('Hello world');
    });

    it('replaces existing embedding for same entity_id + chunk_index', () => {
      store.upsertEmbedding({
        id: 'emb-1',
        entityId: 'entity-1',
        entityType: 'task',
        chunkIndex: 0,
        contentHash: 'hash-old',
        textPreview: 'Old text',
        embedding: makeFloat32([1, 0, 0]),
      });

      store.upsertEmbedding({
        id: 'emb-2',
        entityId: 'entity-1',
        entityType: 'task',
        chunkIndex: 0,
        contentHash: 'hash-new',
        textPreview: 'New text',
        embedding: makeFloat32([0, 1, 0]),
      });

      const results = store.getByEntityId('entity-1');
      expect(results).toHaveLength(1);
      expect(results[0].content_hash).toBe('hash-new');
      expect(results[0].text_preview).toBe('New text');
    });
  });

  describe('deleteByEntityId', () => {
    it('removes all chunks for an entity', () => {
      store.upsertEmbedding({
        id: 'emb-1',
        entityId: 'entity-1',
        entityType: 'note',
        chunkIndex: 0,
        contentHash: 'h1',
        textPreview: 'chunk 0',
        embedding: makeFloat32([1, 0, 0]),
      });
      store.upsertEmbedding({
        id: 'emb-2',
        entityId: 'entity-1',
        entityType: 'note',
        chunkIndex: 1,
        contentHash: 'h1',
        textPreview: 'chunk 1',
        embedding: makeFloat32([0, 1, 0]),
      });

      store.deleteByEntityId('entity-1');
      expect(store.getByEntityId('entity-1')).toHaveLength(0);
    });

    it('does not affect other entities', () => {
      store.upsertEmbedding({
        id: 'emb-1',
        entityId: 'entity-1',
        entityType: 'task',
        chunkIndex: 0,
        contentHash: 'h1',
        textPreview: null,
        embedding: makeFloat32([1, 0, 0]),
      });
      store.upsertEmbedding({
        id: 'emb-2',
        entityId: 'entity-2',
        entityType: 'task',
        chunkIndex: 0,
        contentHash: 'h2',
        textPreview: null,
        embedding: makeFloat32([0, 1, 0]),
      });

      store.deleteByEntityId('entity-1');
      expect(store.getByEntityId('entity-2')).toHaveLength(1);
    });
  });

  describe('getByEntityId', () => {
    it('returns all chunks sorted by chunk_index', () => {
      store.upsertEmbedding({
        id: 'emb-3',
        entityId: 'entity-1',
        entityType: 'note',
        chunkIndex: 2,
        contentHash: 'h1',
        textPreview: 'chunk 2',
        embedding: makeFloat32([0, 0, 1]),
      });
      store.upsertEmbedding({
        id: 'emb-1',
        entityId: 'entity-1',
        entityType: 'note',
        chunkIndex: 0,
        contentHash: 'h1',
        textPreview: 'chunk 0',
        embedding: makeFloat32([1, 0, 0]),
      });
      store.upsertEmbedding({
        id: 'emb-2',
        entityId: 'entity-1',
        entityType: 'note',
        chunkIndex: 1,
        contentHash: 'h1',
        textPreview: 'chunk 1',
        embedding: makeFloat32([0, 1, 0]),
      });

      const results = store.getByEntityId('entity-1');
      expect(results).toHaveLength(3);
      expect(results[0].chunk_index).toBe(0);
      expect(results[1].chunk_index).toBe(1);
      expect(results[2].chunk_index).toBe(2);
    });

    it('returns empty array for unknown entity', () => {
      expect(store.getByEntityId('nonexistent')).toHaveLength(0);
    });
  });

  describe('searchSimilar', () => {
    beforeEach(() => {
      // [1, 0, 0] - points along x axis
      store.upsertEmbedding({
        id: 'emb-x',
        entityId: 'entity-x',
        entityType: 'task',
        chunkIndex: 0,
        contentHash: 'hx',
        textPreview: 'x axis',
        embedding: makeFloat32([1, 0, 0]),
      });
      // [0, 1, 0] - points along y axis (orthogonal to x)
      store.upsertEmbedding({
        id: 'emb-y',
        entityId: 'entity-y',
        entityType: 'note',
        chunkIndex: 0,
        contentHash: 'hy',
        textPreview: 'y axis',
        embedding: makeFloat32([0, 1, 0]),
      });
      // [0.9, 0.1, 0] - nearly same as x axis
      store.upsertEmbedding({
        id: 'emb-near-x',
        entityId: 'entity-near-x',
        entityType: 'task',
        chunkIndex: 0,
        contentHash: 'hnx',
        textPreview: 'near x',
        embedding: makeFloat32([0.9, 0.1, 0]),
      });
    });

    it('returns results sorted by cosine similarity (most similar first)', () => {
      const query = makeFloat32([1, 0, 0]); // identical to entity-x
      const results = store.searchSimilar(query);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].entityId).toBe('entity-x');
      // entity-near-x should come before entity-y
      const idxNear = results.findIndex(r => r.entityId === 'entity-near-x');
      const idxY = results.findIndex(r => r.entityId === 'entity-y');
      expect(idxNear).toBeLessThan(idxY);
    });

    it('identical vectors have score ~1', () => {
      const query = makeFloat32([1, 0, 0]);
      const results = store.searchSimilar(query);
      const match = results.find(r => r.entityId === 'entity-x');
      expect(match).toBeDefined();
      expect(match!.score).toBeCloseTo(1, 5);
    });

    it('orthogonal vectors have score ~0', () => {
      const query = makeFloat32([1, 0, 0]);
      const results = store.searchSimilar(query);
      const orthogonal = results.find(r => r.entityId === 'entity-y');
      expect(orthogonal).toBeDefined();
      expect(orthogonal!.score).toBeCloseTo(0, 5);
    });

    it('respects limit parameter', () => {
      const query = makeFloat32([1, 0, 0]);
      const results = store.searchSimilar(query, 2);
      expect(results).toHaveLength(2);
    });

    it('filters by entity type when specified', () => {
      const query = makeFloat32([1, 0, 0]);
      const results = store.searchSimilar(query, 10, ['task']);
      expect(results.every(r => r.entityType === 'task')).toBe(true);
      expect(results.find(r => r.entityId === 'entity-y')).toBeUndefined();
    });

    it('returns all types when entityTypes not specified', () => {
      const query = makeFloat32([1, 0, 0]);
      const results = store.searchSimilar(query, 10);
      const types = new Set(results.map(r => r.entityType));
      expect(types.has('task')).toBe(true);
      expect(types.has('note')).toBe(true);
    });
  });

  describe('getContentHash', () => {
    it('returns stored hash for entity', () => {
      store.upsertEmbedding({
        id: 'emb-1',
        entityId: 'entity-1',
        entityType: 'project',
        chunkIndex: 0,
        contentHash: 'myhash123',
        textPreview: null,
        embedding: makeFloat32([1, 0, 0]),
      });

      expect(store.getContentHash('entity-1')).toBe('myhash123');
    });

    it('returns null for unknown entity', () => {
      expect(store.getContentHash('unknown')).toBeNull();
    });
  });

  describe('clear', () => {
    it('removes all embeddings', () => {
      store.upsertEmbedding({
        id: 'emb-1',
        entityId: 'entity-1',
        entityType: 'task',
        chunkIndex: 0,
        contentHash: 'h1',
        textPreview: null,
        embedding: makeFloat32([1, 0, 0]),
      });
      store.upsertEmbedding({
        id: 'emb-2',
        entityId: 'entity-2',
        entityType: 'note',
        chunkIndex: 0,
        contentHash: 'h2',
        textPreview: null,
        embedding: makeFloat32([0, 1, 0]),
      });

      store.clear();

      expect(store.getByEntityId('entity-1')).toHaveLength(0);
      expect(store.getByEntityId('entity-2')).toHaveLength(0);
      expect(store.getIndexedCount()).toBe(0);
    });
  });

  describe('close', () => {
    it('closes the database connection', () => {
      const localDb = new Database(':memory:');
      const localStore = new VectorStore(localDb);
      localStore.initialize();
      localStore.close();

      // After close, any operation on db should throw
      expect(() => localDb.prepare('SELECT 1').get()).toThrow();
    });
  });
});

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    const v = makeFloat32([1, 2, 3]);
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
  });

  it('returns 0 for orthogonal vectors', () => {
    const a = makeFloat32([1, 0, 0]);
    const b = makeFloat32([0, 1, 0]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5);
  });

  it('returns 0 for zero vectors', () => {
    const a = makeFloat32([0, 0, 0]);
    const b = makeFloat32([1, 2, 3]);
    expect(cosineSimilarity(a, b)).toBe(0);
  });

  it('returns 0 for mismatched lengths', () => {
    const a = makeFloat32([1, 0]);
    const b = makeFloat32([1, 0, 0]);
    expect(cosineSimilarity(a, b)).toBe(0);
  });
});

describe('bufferToFloat32', () => {
  it('round-trips a Float32Array through Buffer', () => {
    const original = makeFloat32([1.5, -2.5, 3.14]);
    const buf = Buffer.from(original.buffer);
    const recovered = bufferToFloat32(buf);
    expect(recovered.length).toBe(original.length);
    for (let i = 0; i < original.length; i++) {
      expect(recovered[i]).toBeCloseTo(original[i], 5);
    }
  });
});
