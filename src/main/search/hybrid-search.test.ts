import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { HybridSearchService } from './hybrid-search';
import type { FtsIndex } from './fts-index';
import type { VectorStore } from './vector-store';
import type { EmbeddingService } from './embedding-service';
import type { SearchResult } from '@shared/search-types';

// Mock dependencies
vi.mock('./fts-index', () => ({
  FtsIndex: vi.fn(),
}));
vi.mock('./vector-store', () => ({
  VectorStore: vi.fn(),
}));
vi.mock('./embedding-service', () => ({
  EmbeddingService: vi.fn(),
}));
vi.mock('./content-extractor', () => ({
  prepareForEmbedding: vi.fn((text: string, isQuery: boolean) =>
    isQuery ? `query: ${text}` : `passage: ${text}`
  ),
}));

function makeKeywordResult(entityId: string, title: string): SearchResult {
  return {
    entityId,
    entityType: 'task',
    title,
    preview: `preview of ${title}`,
    score: 1.0,
    matchType: 'keyword',
  };
}

function makeSemanticSimilarityResult(entityId: string, textPreview: string) {
  return {
    entityId,
    entityType: 'note' as const,
    chunkIndex: 0,
    textPreview,
    score: 0.9,
  };
}

describe('HybridSearchService', () => {
  let mockFtsIndex: { search: Mock };
  let mockVectorStore: { searchSimilar: Mock };
  let mockEmbeddingService: { embed: Mock };
  let service: HybridSearchService;

  const dummyEmbedding = new Float32Array([0.1, 0.2, 0.3]);

  beforeEach(() => {
    mockFtsIndex = { search: vi.fn().mockReturnValue([]) };
    mockVectorStore = { searchSimilar: vi.fn().mockReturnValue([]) };
    mockEmbeddingService = { embed: vi.fn().mockResolvedValue(dummyEmbedding) };

    service = new HybridSearchService(
      mockFtsIndex as unknown as FtsIndex,
      mockVectorStore as unknown as VectorStore,
      mockEmbeddingService as unknown as EmbeddingService
    );
  });

  describe('search', () => {
    it('returns both keyword and semantic results', async () => {
      const kwResult = makeKeywordResult('task-1', 'Task One');
      const semResult = makeSemanticSimilarityResult('note-1', 'Note preview');

      mockFtsIndex.search.mockReturnValue([kwResult]);
      mockVectorStore.searchSimilar.mockReturnValue([semResult]);

      const result = await service.search('test query');

      expect(result.keyword).toHaveLength(1);
      expect(result.keyword[0]).toEqual(kwResult);
      expect(result.semantic).toHaveLength(1);
      expect(result.semantic[0].entityId).toBe('note-1');
    });

    it('runs keyword and semantic search in parallel', async () => {
      const callOrder: string[] = [];

      mockFtsIndex.search.mockImplementation(() => {
        callOrder.push('keyword');
        return [];
      });
      mockEmbeddingService.embed.mockImplementation(async () => {
        callOrder.push('embed-start');
        return dummyEmbedding;
      });
      mockVectorStore.searchSimilar.mockImplementation(() => {
        callOrder.push('semantic');
        return [];
      });

      await service.search('parallel test');

      expect(callOrder).toContain('keyword');
      expect(callOrder).toContain('embed-start');
      expect(callOrder).toContain('semantic');
    });

    it('deduplicates: semantic results do not include entities already in keyword results', async () => {
      const sharedEntityId = 'task-1';
      const kwResult = makeKeywordResult(sharedEntityId, 'Shared Task');
      const semResultDuplicate = makeSemanticSimilarityResult(sharedEntityId, 'same entity');
      const semResultUnique = makeSemanticSimilarityResult('note-2', 'unique note');

      mockFtsIndex.search.mockReturnValue([kwResult]);
      mockVectorStore.searchSimilar.mockReturnValue([semResultDuplicate, semResultUnique]);

      const result = await service.search('dedup test');

      expect(result.keyword).toHaveLength(1);
      expect(result.semantic).toHaveLength(1);
      expect(result.semantic[0].entityId).toBe('note-2');
    });

    it('respects limit parameter for both keyword and semantic', async () => {
      await service.search('limit test', { limit: 5 });

      expect(mockFtsIndex.search).toHaveBeenCalledWith('limit test', 5);
      expect(mockVectorStore.searchSimilar).toHaveBeenCalledWith(
        dummyEmbedding,
        5,
        undefined
      );
    });

    it('filters by entityTypes when provided', async () => {
      await service.search('entity type test', { entityTypes: ['note', 'task'] });

      expect(mockVectorStore.searchSimilar).toHaveBeenCalledWith(
        dummyEmbedding,
        5,
        ['note', 'task']
      );
    });

    it('returns empty results for both when query is empty', async () => {
      const result = await service.search('');

      expect(result.keyword).toHaveLength(0);
      expect(result.semantic).toHaveLength(0);
      expect(mockFtsIndex.search).not.toHaveBeenCalled();
      expect(mockEmbeddingService.embed).not.toHaveBeenCalled();
    });

    it('returns empty results for both when query is whitespace only', async () => {
      const result = await service.search('   ');

      expect(result.keyword).toHaveLength(0);
      expect(result.semantic).toHaveLength(0);
      expect(mockFtsIndex.search).not.toHaveBeenCalled();
      expect(mockEmbeddingService.embed).not.toHaveBeenCalled();
    });

    it('still returns keyword results when semantic search fails', async () => {
      const kwResult = makeKeywordResult('task-1', 'Task One');
      mockFtsIndex.search.mockReturnValue([kwResult]);
      mockEmbeddingService.embed.mockRejectedValue(new Error('embedding failed'));

      const result = await service.search('failing semantic');

      expect(result.keyword).toHaveLength(1);
      expect(result.keyword[0]).toEqual(kwResult);
      expect(result.semantic).toHaveLength(0);
    });

    it('still returns semantic results when keyword search fails', async () => {
      const semResult = makeSemanticSimilarityResult('note-1', 'Note preview');
      mockFtsIndex.search.mockImplementation(() => { throw new Error('fts failed'); });
      mockVectorStore.searchSimilar.mockReturnValue([semResult]);

      const result = await service.search('failing keyword');

      expect(result.keyword).toHaveLength(0);
      expect(result.semantic).toHaveLength(1);
      expect(result.semantic[0].entityId).toBe('note-1');
    });

    it('maps semantic similarity results to SearchResult format correctly', async () => {
      const semResult = makeSemanticSimilarityResult('note-42', 'A note about something');
      mockVectorStore.searchSimilar.mockReturnValue([semResult]);

      const result = await service.search('mapping test');

      expect(result.semantic).toHaveLength(1);
      const mapped = result.semantic[0];
      expect(mapped.entityId).toBe('note-42');
      expect(mapped.entityType).toBe('note');
      expect(mapped.preview).toBe('A note about something');
      expect(mapped.score).toBe(0.9);
      expect(mapped.matchType).toBe('semantic');
      expect(mapped.title).toBe('');
    });
  });
});
