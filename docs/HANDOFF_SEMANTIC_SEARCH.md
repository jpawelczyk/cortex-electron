# Handoff: Semantic Search Implementation

## Context

You are implementing semantic search for **Cortex**, an Electron + React desktop app for personal productivity (tasks, notes, meetings, projects, stakeholders). The app uses:

- **Electron** (main + renderer process)
- **React** with Zustand stores
- **SQLite** via PowerSync for data (syncs to Supabase)
- **TypeScript** throughout
- **Vite** for bundling

## Your Task

Implement local-first semantic search with multilingual support (English + German, including mixed-language content). The search should be hybrid: instant keyword results via FTS5, plus semantic results via embeddings.

## Design Document

Read `docs/SEMANTIC_SEARCH.md` thoroughly before starting. It contains:
- Architecture overview
- Model choice (multilingual-e5-small via transformers.js)
- Vector storage design (separate vectors.db with sqlite-vss)
- Chunking strategy
- Hybrid search flow
- Incremental re-embedding logic
- UI patterns
- File structure

## Key Requirements

1. **Local-only processing** — No API calls, all embedding done locally via transformers.js
2. **Multilingual** — Must handle EN, DE, and mixed EN/DE content in the same text
3. **Hybrid search** — Keyword (FTS5, instant) + Semantic (embeddings, ~100-200ms)
4. **Incremental updates** — Only re-embed content that changed (content hash tracking)
5. **Non-blocking** — Embedding should run in a worker thread, not block the UI
6. **Chunking** — Long notes/meetings split into ~256-token chunks with overlap

## Implementation Phases

### Phase 1: Foundation
1. Create `src/main/search/` directory structure
2. Set up `vectors.db` as separate SQLite database with sqlite-vss extension
3. Integrate `@xenova/transformers` with `Xenova/multilingual-e5-small` model
4. Create embedding worker (Electron worker thread or Web Worker)
5. Implement basic `embed(text)` and `search(query)` functions
6. Add IPC handlers for renderer to call search

### Phase 2: Indexing Pipeline
1. Implement `getEmbeddableText()` for each entity type (task, note, meeting, project, stakeholder)
2. Implement chunking for long content (>500 chars)
3. Add content hash tracking for incremental re-embedding
4. Create `EmbeddingQueue` with debouncing (2s after last change)
5. Hook into Zustand store subscriptions to trigger re-embedding on changes
6. Implement `reindexAll()` for full rebuild

### Phase 3: FTS5 Keyword Search
1. Create FTS5 virtual table in vectors.db (or main db)
2. Add triggers to sync content to FTS5 on create/update/delete
3. Implement `keywordSearch()` with BM25 ranking and snippet highlighting

### Phase 4: Hybrid Search UI
1. Extend or replace `CommandPalette.tsx` with search functionality
2. Stream keyword results immediately, semantic results when ready
3. Deduplicate results (don't show same entity twice)
4. Add visual differentiation (⚡ keyword vs 🧠 semantic)
5. Keyboard navigation through results
6. Navigate to entity on selection

### Phase 5: Polish
1. Add search settings in SettingsView (enable/disable semantic, reindex button)
2. Show indexing progress indicator
3. Handle edge cases (empty results, very long queries, special characters)
4. Performance optimization if needed

## Existing Code to Reference

- `src/main/db/index.ts` — Database initialization pattern
- `src/main/ipc/handlers.ts` — IPC handler pattern
- `src/renderer/stores/` — Zustand store patterns
- `src/renderer/components/CommandPalette.tsx` — Existing search UI to extend
- `src/shared/types.ts` — Entity type definitions

## Technical Notes

### E5 Model Prefixes
```typescript
// E5 models require prefixes for optimal performance
const queryText = `query: ${userQuery}`;
const passageText = `passage: ${contentToEmbed}`;
```

### Vector Storage Schema
```sql
CREATE TABLE embeddings (
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
```

### Worker Thread Pattern
```typescript
// main/search/embedding-worker.ts
import { pipeline } from '@xenova/transformers';

let embedder: any = null;

async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', 'Xenova/multilingual-e5-small');
  }
  return embedder;
}

// Called from main process via worker
export async function embed(text: string): Promise<Float32Array> {
  const model = await getEmbedder();
  const result = await model(text, { pooling: 'mean', normalize: true });
  return result.data;
}
```

## Testing

1. Create a few test entities with mixed EN/DE content
2. Verify keyword search finds exact matches instantly
3. Verify semantic search finds conceptually related content
4. Test that "budget approval" finds "Freigabe der Finanzmittel"
5. Verify incremental updates (change a note, confirm re-embedding)
6. Test full reindex functionality

## Out of Scope

- Cloud sync of embeddings (vectors.db stays local)
- Real-time collaborative search
- Search history/analytics
- Custom model training

## Questions?

If anything in `docs/SEMANTIC_SEARCH.md` is unclear, make reasonable assumptions and document them. Prefer simple, working implementations over complex abstractions.

---

**Start with Phase 1.** Get a basic embed → store → retrieve flow working before building out the full pipeline.
