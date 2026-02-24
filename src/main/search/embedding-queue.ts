import { EmbeddingService } from './embedding-service';
import { VectorStore } from './vector-store';
import { chunkText } from './chunker';
import { contentHash, shouldChunk, prepareForEmbedding } from './content-extractor';
import type { SearchableEntityType } from '@shared/search-types';

export interface EmbeddingQueueOptions {
  debounceMs?: number;
}

interface PendingEntry {
  timer: ReturnType<typeof setTimeout>;
  entityId: string;
  entityType: SearchableEntityType;
  text: string;
}

export class EmbeddingQueue {
  private pending = new Map<string, PendingEntry>();
  private debounceMs: number;
  private embeddingService: EmbeddingService;
  private vectorStore: VectorStore;

  constructor(
    embeddingService: EmbeddingService,
    vectorStore: VectorStore,
    options: EmbeddingQueueOptions = {}
  ) {
    this.embeddingService = embeddingService;
    this.vectorStore = vectorStore;
    this.debounceMs = options.debounceMs ?? 2000;
  }

  enqueue(entityId: string, entityType: SearchableEntityType, text: string): void {
    const key = `${entityType}:${entityId}`;

    const existing = this.pending.get(key);
    if (existing) {
      clearTimeout(existing.timer);
    }

    const timer = setTimeout(() => {
      this.pending.delete(key);
      this.processEntity(entityId, entityType, text).catch(err => {
        console.error(`[EmbeddingQueue] Failed to process ${key}:`, err);
      });
    }, this.debounceMs);

    this.pending.set(key, { timer, entityId, entityType, text });
  }

  async processEntity(entityId: string, entityType: SearchableEntityType, text: string): Promise<void> {
    const newHash = contentHash(text);
    const existingHash = this.vectorStore.getContentHash(entityId);

    if (existingHash === newHash) return;

    this.vectorStore.deleteByEntityId(entityId);

    const chunks = shouldChunk(text) ? chunkText(text) : [text];

    for (let i = 0; i < chunks.length; i++) {
      const prepared = prepareForEmbedding(chunks[i], false);
      const embedding = await this.embeddingService.embed(prepared);

      this.vectorStore.upsertEmbedding({
        id: crypto.randomUUID(),
        entityId,
        entityType,
        chunkIndex: i,
        contentHash: newHash,
        textPreview: chunks[i].slice(0, 200),
        embedding,
      });
    }
  }

  removeEntity(entityId: string): void {
    this.vectorStore.deleteByEntityId(entityId);
  }

  async flush(): Promise<void> {
    const entries: PendingEntry[] = [];

    for (const entry of this.pending.values()) {
      clearTimeout(entry.timer);
      entries.push(entry);
    }
    this.pending.clear();

    await Promise.all(
      entries.map(({ entityId, entityType, text }) =>
        this.processEntity(entityId, entityType, text).catch(err => {
          console.error(`[EmbeddingQueue] Failed to flush ${entityType}:${entityId}:`, err);
        })
      )
    );
  }

  getQueueSize(): number {
    return this.pending.size;
  }

  destroy(): void {
    for (const entry of this.pending.values()) {
      clearTimeout(entry.timer);
    }
    this.pending.clear();
  }
}
