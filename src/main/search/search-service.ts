import path from 'path';
import { app, BrowserWindow } from 'electron';
import Database from 'better-sqlite3';
import { VectorStore } from './vector-store';
import { FtsIndex } from './fts-index';
import { EmbeddingService } from './embedding-service';
import { EmbeddingQueue } from './embedding-queue';
import { HybridSearchService } from './hybrid-search';
import { getEmbeddableText, contentHash, shouldChunk, prepareForEmbedding } from './content-extractor';
import { chunkText } from './chunker';
import type { AsyncDatabase } from '../db/types';
import type { SearchableEntityType, HybridSearchResult, SearchStatus } from '@shared/search-types';

export class SearchService {
  private vectorStore: VectorStore | null = null;
  private ftsIndex: FtsIndex | null = null;
  private embeddingService: EmbeddingService;
  private embeddingQueue: EmbeddingQueue | null = null;
  private hybridSearch: HybridSearchService | null = null;
  private initialized = false;

  constructor(embeddingService?: EmbeddingService) {
    this.embeddingService = embeddingService ?? new EmbeddingService();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Open vectors.db alongside the main database
    const dbPath = path.join(app.getPath('userData'), 'vectors.db');
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');

    this.vectorStore = new VectorStore(db);
    this.vectorStore.initialize();

    this.ftsIndex = new FtsIndex(db);
    this.ftsIndex.initialize();

    await this.embeddingService.initialize();

    this.embeddingQueue = new EmbeddingQueue(
      this.embeddingService,
      this.vectorStore,
    );

    this.hybridSearch = new HybridSearchService(
      this.ftsIndex,
      this.vectorStore,
      this.embeddingService,
    );

    this.initialized = true;
  }

  async search(
    query: string,
    options?: { limit?: number; entityTypes?: SearchableEntityType[] },
  ): Promise<HybridSearchResult> {
    if (!this.hybridSearch) {
      return { keyword: [], semantic: [] };
    }
    return this.hybridSearch.search(query, options);
  }

  indexEntity(entityId: string, entityType: SearchableEntityType, entity: unknown): void {
    if (!this.embeddingQueue || !this.ftsIndex) return;

    const text = getEmbeddableText(entity as never, entityType);
    if (!text) return;

    // Update FTS immediately (synchronous, instant)
    const title = (entity as { title?: string; name?: string }).title
      ?? (entity as { name?: string }).name
      ?? '';
    this.ftsIndex.upsertEntity(entityId, entityType, title, text);

    // Queue embedding update (debounced)
    this.embeddingQueue.enqueue(entityId, entityType, text);
  }

  removeEntity(entityId: string): void {
    this.vectorStore?.deleteByEntityId(entityId);
    this.ftsIndex?.deleteEntity(entityId);
  }

  async reindexAll(
    mainDb: AsyncDatabase,
    mainWindow?: BrowserWindow | null,
  ): Promise<void> {
    if (!this.vectorStore || !this.ftsIndex || !this.embeddingService) return;

    // Clear existing indexes
    this.vectorStore.clear();

    const entityConfigs: Array<{ table: string; type: SearchableEntityType }> = [
      { table: 'tasks', type: 'task' },
      { table: 'notes', type: 'note' },
      { table: 'meetings', type: 'meeting' },
      { table: 'projects', type: 'project' },
      { table: 'stakeholders', type: 'stakeholder' },
    ];

    // Gather all entities
    const allEntities: Array<{ entity: Record<string, unknown>; type: SearchableEntityType }> = [];
    for (const config of entityConfigs) {
      const rows = await mainDb.getAll<Record<string, unknown>>(
        `SELECT * FROM ${config.table} WHERE deleted_at IS NULL`,
      );
      for (const row of rows) {
        allEntities.push({ entity: row, type: config.type });
      }
    }

    const total = allEntities.length;
    let processed = 0;

    // Process in batches
    const batchSize = 20;
    for (let i = 0; i < allEntities.length; i += batchSize) {
      const batch = allEntities.slice(i, i + batchSize);

      for (const { entity, type } of batch) {
        const text = getEmbeddableText(entity as never, type);
        if (!text) continue;

        const title = (entity as { title?: string; name?: string }).title
          ?? (entity as { name?: string }).name
          ?? '';

        // FTS index
        this.ftsIndex!.upsertEntity(entity.id as string, type, title, text);

        // Embedding
        const hash = contentHash(text);
        const chunks = shouldChunk(text) ? chunkText(text) : [text];

        for (let ci = 0; ci < chunks.length; ci++) {
          const prepared = prepareForEmbedding(chunks[ci], false);
          const embedding = await this.embeddingService.embed(prepared);

          this.vectorStore!.upsertEmbedding({
            id: crypto.randomUUID(),
            entityId: entity.id as string,
            entityType: type,
            chunkIndex: ci,
            contentHash: hash,
            textPreview: chunks[ci].slice(0, 200),
            embedding,
          });
        }
      }

      processed += batch.length;
      const pct = Math.round((processed / total) * 100);

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('search:reindex-progress', pct);
      }
    }
  }

  getStatus(): SearchStatus {
    return {
      ready: this.initialized,
      indexedCount: this.vectorStore?.getIndexedCount() ?? 0,
    };
  }

  shutdown(): void {
    this.embeddingQueue?.destroy();
    this.vectorStore?.close();
    this.initialized = false;
  }
}
