# Semantic Search

Local-first semantic search for Cortex using multilingual embeddings.

## Goals

1. **Find anything fast** — Search across tasks, notes, meetings, projects, stakeholders
2. **Understand meaning** — "budget approval" finds "financial sign-off discussion"
3. **Multilingual** — English + German, including mixed-language content
4. **Privacy-first** — All processing local, no API calls
5. **Instant + deep** — Keyword results immediately, semantic results when ready

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Content Changes                           │
│            (create/update task, note, meeting, etc.)            │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Main Process (Electron)                      │
│  ┌─────────────────────┐    ┌────────────────────────────────┐  │
│  │   SQLite (FTS5)     │    │   Embedding Queue (debounced)  │  │
│  │   Keyword index     │    │   - Batches updates            │  │
│  │   Instant search    │    │   - Tracks content_hash        │  │
│  └─────────────────────┘    └───────────────┬────────────────┘  │
│                                             │                    │
│                                             ▼                    │
│                             ┌────────────────────────────────┐  │
│                             │   Embedding Worker (separate)  │  │
│                             │   transformers.js              │  │
│                             │   multilingual-e5-small        │  │
│                             └───────────────┬────────────────┘  │
│                                             │                    │
│                                             ▼                    │
│                             ┌────────────────────────────────┐  │
│                             │   vectors.db (sqlite-vss)      │  │
│                             │   Local only, not synced       │  │
│                             └────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Embedding Model

### Choice: `multilingual-e5-small`

| Property | Value |
|----------|-------|
| Size | 118MB |
| Dimensions | 384 |
| Languages | 100+ including EN, DE |
| Mixed-language | ✅ Excellent |
| Model ID | `Xenova/multilingual-e5-small` |

**Why this model:**
- Handles code-switching (EN/DE in same text)
- Good quality-to-size ratio
- Runs efficiently in Electron via transformers.js
- No external dependencies

### Text Preparation

E5 models expect prefixes for optimal performance:

```typescript
function prepareForEmbedding(text: string, isQuery: boolean): string {
  // E5 models use prefixes to distinguish queries from passages
  return isQuery ? `query: ${text}` : `passage: ${text}`;
}
```

## Vector Storage

### Separate Database: `vectors.db`

Vectors are stored in a separate SQLite database with sqlite-vss extension:

```sql
-- vectors.db (local only, not synced via PowerSync)

CREATE TABLE embeddings (
  id TEXT PRIMARY KEY,           -- UUID
  entity_id TEXT NOT NULL,       -- Reference to source entity
  entity_type TEXT NOT NULL,     -- 'task' | 'note' | 'meeting' | 'project' | 'stakeholder'
  chunk_index INTEGER DEFAULT 0, -- For chunked content
  content_hash TEXT NOT NULL,    -- SHA256 of source text (for staleness detection)
  text_preview TEXT,             -- First 200 chars for display
  embedding BLOB NOT NULL,       -- 384-dim float32 vector
  created_at TEXT NOT NULL,
  
  UNIQUE(entity_id, chunk_index)
);

CREATE INDEX idx_embeddings_entity ON embeddings(entity_id);
CREATE INDEX idx_embeddings_type ON embeddings(entity_type);

-- sqlite-vss virtual table for vector search
CREATE VIRTUAL TABLE vss_embeddings USING vss0(
  embedding(384)
);
```

**Why separate database:**
- No conflicts with PowerSync sync
- Vectors don't need to sync (can regenerate from content)
- Clean separation of concerns
- Can delete and rebuild without affecting main data

## Content Indexing

### What Gets Embedded

| Entity Type | Indexed Fields | Chunking |
|-------------|---------------|----------|
| Task | title + notes | No (usually short) |
| Note | title + content | Yes (if > 500 chars) |
| Meeting | title + notes | Yes (if > 500 chars) |
| Project | title + description | No |
| Stakeholder | name + organization + role + notes | No |

### Embeddable Text Extraction

```typescript
interface EmbeddableEntity {
  id: string;
  type: 'task' | 'note' | 'meeting' | 'project' | 'stakeholder';
  getText(): string;
}

function getEmbeddableText(entity: Task): string {
  return [entity.title, stripHtml(entity.notes)].filter(Boolean).join('\n\n');
}

function getEmbeddableText(entity: Note): string {
  return [entity.title, stripHtml(entity.content)].filter(Boolean).join('\n\n');
}

function getEmbeddableText(entity: Meeting): string {
  return [entity.title, entity.location, stripHtml(entity.notes)].filter(Boolean).join('\n\n');
}

function getEmbeddableText(entity: Project): string {
  return [entity.title, entity.description].filter(Boolean).join('\n\n');
}

function getEmbeddableText(entity: Stakeholder): string {
  return [entity.name, entity.organization, entity.role, entity.notes].filter(Boolean).join('\n\n');
}
```

## Chunking Strategy

Long content (notes, meeting transcripts) is split into chunks for better retrieval:

```typescript
interface ChunkOptions {
  maxTokens: number;    // ~256 tokens per chunk
  overlapTokens: number; // ~50 token overlap
  minChunkSize: number;  // Don't create tiny chunks
}

const DEFAULT_CHUNK_OPTIONS: ChunkOptions = {
  maxTokens: 256,
  overlapTokens: 50,
  minChunkSize: 100,
};

function chunkText(text: string, options = DEFAULT_CHUNK_OPTIONS): string[] {
  // Rough approximation: 1 token ≈ 4 characters for mixed EN/DE
  const maxChars = options.maxTokens * 4;
  const overlapChars = options.overlapTokens * 4;
  
  if (text.length <= maxChars) {
    return [text]; // No chunking needed
  }
  
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    let end = start + maxChars;
    
    // Try to break at paragraph or sentence boundary
    if (end < text.length) {
      const paragraphBreak = text.lastIndexOf('\n\n', end);
      const sentenceBreak = text.lastIndexOf('. ', end);
      
      if (paragraphBreak > start + maxChars / 2) {
        end = paragraphBreak + 2;
      } else if (sentenceBreak > start + maxChars / 2) {
        end = sentenceBreak + 2;
      }
    }
    
    chunks.push(text.slice(start, end).trim());
    start = end - overlapChars; // Overlap for context continuity
  }
  
  return chunks.filter(c => c.length >= options.minChunkSize);
}
```

**Example:**
- 2000-word meeting transcript → 8 chunks with overlap
- Each chunk embedded separately
- Search returns best matching chunk → links to parent meeting

## Hybrid Search

Combine instant keyword search (FTS5) with semantic search for best UX:

### FTS5 Index (Keyword Search)

```sql
-- In main database (or vectors.db)
CREATE VIRTUAL TABLE search_fts USING fts5(
  entity_id,
  entity_type,
  title,
  content,
  tokenize='porter unicode61'  -- Stemming + unicode support
);

-- Triggers to keep FTS in sync
CREATE TRIGGER tasks_ai AFTER INSERT ON tasks BEGIN
  INSERT INTO search_fts(entity_id, entity_type, title, content)
  VALUES (NEW.id, 'task', NEW.title, NEW.notes);
END;
-- ... similar for UPDATE, DELETE, and other entity types
```

### Search Flow

```typescript
interface SearchResult {
  entityId: string;
  entityType: 'task' | 'note' | 'meeting' | 'project' | 'stakeholder';
  title: string;
  preview: string;
  score: number;
  matchType: 'keyword' | 'semantic';
  highlights?: string[]; // For keyword matches
}

async function hybridSearch(
  query: string,
  options: { limit?: number } = {}
): Promise<{ keyword: SearchResult[]; semantic: SearchResult[] }> {
  const limit = options.limit ?? 10;
  
  // Fire both searches in parallel
  const [keywordResults, semanticResults] = await Promise.all([
    keywordSearch(query, limit),
    semanticSearch(query, limit),
  ]);
  
  return {
    keyword: keywordResults,
    semantic: dedupeAgainst(semanticResults, keywordResults),
  };
}

async function keywordSearch(query: string, limit: number): Promise<SearchResult[]> {
  // FTS5 search - instant
  const results = await db.all(`
    SELECT 
      entity_id,
      entity_type,
      title,
      snippet(search_fts, 3, '<mark>', '</mark>', '...', 32) as preview,
      bm25(search_fts) as score
    FROM search_fts
    WHERE search_fts MATCH ?
    ORDER BY score
    LIMIT ?
  `, [fts5Escape(query), limit]);
  
  return results.map(r => ({
    ...r,
    matchType: 'keyword' as const,
  }));
}

async function semanticSearch(query: string, limit: number): Promise<SearchResult[]> {
  // Embed query
  const queryEmbedding = await embed(prepareForEmbedding(query, true));
  
  // Vector similarity search
  const results = await vectorDb.all(`
    SELECT 
      e.entity_id,
      e.entity_type,
      e.text_preview,
      e.chunk_index,
      vss_distance(v.embedding, ?) as distance
    FROM embeddings e
    JOIN vss_embeddings v ON v.rowid = e.rowid
    ORDER BY distance ASC
    LIMIT ?
  `, [queryEmbedding, limit]);
  
  // Hydrate with full entity data
  return hydrateResults(results);
}
```

### UI Pattern

```
┌─────────────────────────────────────────────────────────────┐
│ 🔍 budget approval                                    [⌘K] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ⚡ KEYWORD MATCHES                                          │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ✅ Get <mark>budget</mark> <mark>approval</mark> from   │ │
│ │    finance team                                         │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ 📝 Q3 <mark>Budget</mark> Planning Notes                │ │
│ │    "...need <mark>approval</mark> before proceeding..." │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 🧠 SEMANTIC MATCHES                                         │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📅 Meeting with CFO                                     │ │
│ │    "Discussed financial sign-off for Q4 initiatives"   │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ 📝 Procurement Process Overview                         │ │
│ │    "Expenditure authorization workflow..."             │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**UX details:**
- Keyword results appear instantly (<10ms)
- Semantic results appear when ready (~100-200ms)
- Clear visual separation (⚡ vs 🧠 icons)
- Keyword matches show highlights
- Results deduplicated (semantic doesn't repeat keyword matches)

## Incremental Re-embedding

Only re-embed content that actually changed:

```typescript
import { createHash } from 'crypto';

function contentHash(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

async function maybeReembed(entity: Task | Note | Meeting | Project | Stakeholder) {
  const text = getEmbeddableText(entity);
  const newHash = contentHash(text);
  
  // Check existing embedding
  const existing = await vectorDb.get(
    'SELECT content_hash FROM embeddings WHERE entity_id = ? AND chunk_index = 0',
    [entity.id]
  );
  
  if (existing?.content_hash === newHash) {
    // Content unchanged, skip re-embedding
    return;
  }
  
  // Content changed (or new) — re-embed
  await deleteEmbeddings(entity.id);
  
  const chunks = shouldChunk(entity) ? chunkText(text) : [text];
  
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await embed(prepareForEmbedding(chunks[i], false));
    await vectorDb.run(`
      INSERT INTO embeddings (id, entity_id, entity_type, chunk_index, content_hash, text_preview, embedding, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      crypto.randomUUID(),
      entity.id,
      getEntityType(entity),
      i,
      newHash,
      chunks[i].slice(0, 200),
      embedding,
      new Date().toISOString(),
    ]);
  }
}
```

### Embedding Queue

Debounce rapid changes to avoid excessive re-embedding:

```typescript
class EmbeddingQueue {
  private pending = new Map<string, NodeJS.Timeout>();
  private debounceMs = 2000; // Wait 2s after last change
  
  enqueue(entity: EmbeddableEntity) {
    const key = `${entity.type}:${entity.id}`;
    
    // Clear existing timer
    if (this.pending.has(key)) {
      clearTimeout(this.pending.get(key));
    }
    
    // Set new timer
    this.pending.set(key, setTimeout(async () => {
      this.pending.delete(key);
      await maybeReembed(entity);
    }, this.debounceMs));
  }
}

const embeddingQueue = new EmbeddingQueue();

// Hook into store updates
tasks.subscribe((task, action) => {
  if (action === 'create' || action === 'update') {
    embeddingQueue.enqueue(task);
  } else if (action === 'delete') {
    deleteEmbeddings(task.id);
  }
});
```

## Bootstrap / Full Reindex

On first run or to rebuild the index:

```typescript
async function reindexAll(onProgress?: (pct: number) => void) {
  // Clear existing
  await vectorDb.run('DELETE FROM embeddings');
  await vectorDb.run('DELETE FROM vss_embeddings');
  
  // Gather all entities
  const entities = [
    ...(await db.all('SELECT * FROM tasks WHERE deleted_at IS NULL')).map(e => ({ ...e, _type: 'task' })),
    ...(await db.all('SELECT * FROM notes WHERE deleted_at IS NULL')).map(e => ({ ...e, _type: 'note' })),
    ...(await db.all('SELECT * FROM meetings WHERE deleted_at IS NULL')).map(e => ({ ...e, _type: 'meeting' })),
    ...(await db.all('SELECT * FROM projects WHERE deleted_at IS NULL')).map(e => ({ ...e, _type: 'project' })),
    ...(await db.all('SELECT * FROM stakeholders WHERE deleted_at IS NULL')).map(e => ({ ...e, _type: 'stakeholder' })),
  ];
  
  // Process in batches
  const batchSize = 20;
  for (let i = 0; i < entities.length; i += batchSize) {
    const batch = entities.slice(i, i + batchSize);
    
    // Embed batch in parallel
    await Promise.all(batch.map(entity => maybeReembed(entity)));
    
    onProgress?.(Math.round((i + batch.length) / entities.length * 100));
  }
}
```

## File Structure

```
src/
├── main/
│   ├── search/
│   │   ├── embedding-worker.ts    # transformers.js in worker thread
│   │   ├── embedding-queue.ts     # Debounced queue
│   │   ├── vector-store.ts        # sqlite-vss wrapper
│   │   ├── fts-index.ts           # FTS5 wrapper
│   │   ├── hybrid-search.ts       # Combined search
│   │   └── chunker.ts             # Text chunking
│   └── ipc/
│       └── search-handlers.ts     # IPC handlers for search
├── renderer/
│   └── components/
│       └── SearchPalette.tsx      # Search UI (extend CommandPalette?)
└── shared/
    └── search-types.ts            # Shared type definitions
```

## Implementation Plan

### Phase 1: Foundation
- [ ] Set up `vectors.db` with sqlite-vss
- [ ] Integrate transformers.js with multilingual-e5-small
- [ ] Implement embedding worker (separate thread)
- [ ] Basic embed/search functions

### Phase 2: Indexing
- [ ] Content extraction for all entity types
- [ ] Chunking for long content
- [ ] Incremental re-embedding with content hash
- [ ] Embedding queue with debouncing
- [ ] Full reindex command

### Phase 3: Keyword Search
- [ ] FTS5 virtual table setup
- [ ] Sync triggers for all entity types
- [ ] Keyword search with highlighting

### Phase 4: Hybrid Search UI
- [ ] Extend CommandPalette or create SearchPalette
- [ ] Parallel keyword + semantic search
- [ ] Results streaming (keyword first, semantic when ready)
- [ ] Result deduplication
- [ ] Keyboard navigation

### Phase 5: Polish
- [ ] Search result ranking tuning
- [ ] Performance optimization
- [ ] Index health monitoring
- [ ] Settings (enable/disable semantic, reindex button)

## Open Questions

1. **Worker thread vs main process** — transformers.js in worker to avoid blocking UI?
2. **Model download** — Bundle with app or download on first use?
3. **Index location** — App data folder? Alongside main DB?
4. **Search scope** — Global only, or also per-context/per-project search?

---

*Last updated: 2026-02-24*
