import { z } from 'zod';

// Entity types that can be searched
export type SearchableEntityType = 'task' | 'note' | 'meeting' | 'project' | 'stakeholder';

// Embedding record stored in vectors.db
export interface EmbeddingRecord {
  id: string;
  entity_id: string;
  entity_type: SearchableEntityType;
  chunk_index: number;
  content_hash: string;
  text_preview: string | null;
  embedding: Buffer;
  created_at: string;
}

// Search result from either keyword or semantic search
export interface SearchResult {
  entityId: string;
  entityType: SearchableEntityType;
  title: string;
  preview: string;
  score: number;
  matchType: 'keyword' | 'semantic';
  highlights?: string[];
}

// Combined results from hybrid search
export interface HybridSearchResult {
  keyword: SearchResult[];
  semantic: SearchResult[];
}

// Options for text chunking
export interface ChunkOptions {
  maxTokens: number;
  overlapTokens: number;
  minChunkSize: number;
}

// Search query options
export interface SearchQueryOptions {
  query: string;
  limit?: number;
  entityTypes?: SearchableEntityType[];
}

// Search status info
export interface SearchStatus {
  ready: boolean;
  indexedCount: number;
}

// --- Zod validation schemas for IPC boundary ---

export const SearchableEntityTypeSchema = z.enum([
  'task', 'note', 'meeting', 'project', 'stakeholder',
]);

export const SearchQuerySchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().max(50).optional(),
  entityTypes: z.array(SearchableEntityTypeSchema).optional(),
});
