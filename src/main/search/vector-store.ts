import Database from 'better-sqlite3';
import type { SearchableEntityType } from '@shared/search-types';

export interface VectorRecord {
  id: string;
  entity_id: string;
  entity_type: SearchableEntityType;
  chunk_index: number;
  content_hash: string;
  text_preview: string | null;
  embedding: Buffer;
  created_at: string;
}

export interface SimilarityResult {
  entityId: string;
  entityType: SearchableEntityType;
  chunkIndex: number;
  textPreview: string | null;
  score: number; // cosine similarity, higher = more similar
}

export class VectorStore {
  private db: Database.Database;

  constructor(dbOrPath: Database.Database | string) {
    this.db = typeof dbOrPath === 'string' ? new Database(dbOrPath) : dbOrPath;
  }

  initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS embeddings (
        id TEXT PRIMARY KEY,
        entity_id TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        chunk_index INTEGER DEFAULT 0,
        content_hash TEXT NOT NULL,
        text_preview TEXT,
        embedding BLOB NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(entity_id, chunk_index)
      );
      CREATE INDEX IF NOT EXISTS idx_embeddings_entity ON embeddings(entity_id);
      CREATE INDEX IF NOT EXISTS idx_embeddings_type ON embeddings(entity_type);
    `);
  }

  upsertEmbedding(record: {
    id: string;
    entityId: string;
    entityType: SearchableEntityType;
    chunkIndex: number;
    contentHash: string;
    textPreview: string | null;
    embedding: Float32Array;
  }): void {
    const embeddingBuf = Buffer.from(record.embedding.buffer);
    this.db.prepare(`
      INSERT OR REPLACE INTO embeddings (id, entity_id, entity_type, chunk_index, content_hash, text_preview, embedding, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      record.id,
      record.entityId,
      record.entityType,
      record.chunkIndex,
      record.contentHash,
      record.textPreview,
      embeddingBuf,
      new Date().toISOString()
    );
  }

  deleteByEntityId(entityId: string): void {
    this.db.prepare('DELETE FROM embeddings WHERE entity_id = ?').run(entityId);
  }

  getByEntityId(entityId: string): VectorRecord[] {
    return this.db.prepare(
      'SELECT * FROM embeddings WHERE entity_id = ? ORDER BY chunk_index'
    ).all(entityId) as VectorRecord[];
  }

  searchSimilar(
    queryEmbedding: Float32Array,
    limit: number = 10,
    entityTypes?: SearchableEntityType[]
  ): SimilarityResult[] {
    let query = 'SELECT entity_id, entity_type, chunk_index, text_preview, embedding FROM embeddings';
    const params: string[] = [];

    if (entityTypes && entityTypes.length > 0) {
      const placeholders = entityTypes.map(() => '?').join(',');
      query += ` WHERE entity_type IN (${placeholders})`;
      params.push(...entityTypes);
    }

    const rows = this.db.prepare(query).all(...params) as Array<{
      entity_id: string;
      entity_type: SearchableEntityType;
      chunk_index: number;
      text_preview: string | null;
      embedding: Buffer;
    }>;

    const results: SimilarityResult[] = rows.map(row => ({
      entityId: row.entity_id,
      entityType: row.entity_type,
      chunkIndex: row.chunk_index,
      textPreview: row.text_preview,
      score: cosineSimilarity(queryEmbedding, bufferToFloat32(row.embedding)),
    }));

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  getContentHash(entityId: string): string | null {
    const row = this.db.prepare(
      'SELECT content_hash FROM embeddings WHERE entity_id = ? AND chunk_index = 0'
    ).get(entityId) as { content_hash: string } | undefined;
    return row?.content_hash ?? null;
  }

  getIndexedCount(): number {
    const row = this.db.prepare(
      'SELECT COUNT(DISTINCT entity_id) as count FROM embeddings'
    ).get() as { count: number };
    return row.count;
  }

  clear(): void {
    this.db.exec('DELETE FROM embeddings');
  }

  close(): void {
    this.db.close();
  }
}

export function bufferToFloat32(buf: Buffer): Float32Array {
  return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
