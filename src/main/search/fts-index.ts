import Database from 'better-sqlite3';
import type { SearchResult, SearchableEntityType } from '@shared/search-types';

/** Escape special FTS5 query characters */
export function fts5Escape(query: string): string {
  return query.replace(/['"*(){}[\]^~\\:]/g, ' ').trim();
}

export class FtsIndex {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  initialize(): void {
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS search_fts USING fts5(
        entity_id,
        entity_type,
        title,
        content,
        tokenize='porter unicode61'
      );
    `);
  }

  upsertEntity(
    entityId: string,
    entityType: SearchableEntityType,
    title: string,
    content: string,
  ): void {
    this.db.prepare('DELETE FROM search_fts WHERE entity_id = ?').run(entityId);
    this.db
      .prepare(
        `INSERT INTO search_fts (entity_id, entity_type, title, content)
         VALUES (?, ?, ?, ?)`,
      )
      .run(entityId, entityType, title, content);
  }

  deleteEntity(entityId: string): void {
    this.db.prepare('DELETE FROM search_fts WHERE entity_id = ?').run(entityId);
  }

  search(query: string, limit: number = 10): SearchResult[] {
    if (!query || !query.trim()) return [];

    const escaped = fts5Escape(query);
    if (!escaped) return [];

    const terms = escaped.split(/\s+/).filter(Boolean);
    const ftsQuery = terms.map((t) => `"${t}"`).join(' ');

    try {
      const rows = this.db
        .prepare(
          `SELECT
            entity_id,
            entity_type,
            title,
            snippet(search_fts, 3, '<mark>', '</mark>', '...', 32) as preview,
            bm25(search_fts) as score
          FROM search_fts
          WHERE search_fts MATCH ?
          ORDER BY score
          LIMIT ?`,
        )
        .all(ftsQuery, limit) as Array<{
        entity_id: string;
        entity_type: SearchableEntityType;
        title: string;
        preview: string;
        score: number;
      }>;

      return rows.map((row) => ({
        entityId: row.entity_id,
        entityType: row.entity_type,
        title: row.title,
        preview: row.preview,
        score: Math.abs(row.score), // BM25 returns negative; lower (more negative) = more relevant
        matchType: 'keyword' as const,
      }));
    } catch {
      // FTS5 query syntax errors return empty rather than crashing
      return [];
    }
  }
}
