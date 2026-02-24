import { FtsIndex } from './fts-index';
import { VectorStore } from './vector-store';
import { EmbeddingService } from './embedding-service';
import { prepareForEmbedding } from './content-extractor';
import type { SearchResult, HybridSearchResult, SearchableEntityType } from '@shared/search-types';

export interface HybridSearchOptions {
  limit?: number;
  entityTypes?: SearchableEntityType[];
}

export class HybridSearchService {
  constructor(
    private ftsIndex: FtsIndex,
    private vectorStore: VectorStore,
    private embeddingService: EmbeddingService
  ) {}

  async search(query: string, options: HybridSearchOptions = {}): Promise<HybridSearchResult> {
    if (!query || !query.trim()) {
      return { keyword: [], semantic: [] };
    }

    const limit = options.limit ?? 10;

    // Run keyword and semantic search in parallel
    // keywordSearch is sync, wrap in Promise.resolve so allSettled catches throws
    const [keywordResults, semanticResults] = await Promise.allSettled([
      Promise.resolve().then(() => this.keywordSearch(query, limit)),
      this.semanticSearch(query, limit, options.entityTypes),
    ]);

    const keyword = keywordResults.status === 'fulfilled' ? keywordResults.value : [];
    const semantic = semanticResults.status === 'fulfilled' ? semanticResults.value : [];

    // Deduplicate: remove semantic results that appear in keyword results
    const keywordEntityIds = new Set(keyword.map(r => r.entityId));
    const deduped = semantic.filter(r => !keywordEntityIds.has(r.entityId));

    return { keyword, semantic: deduped };
  }

  private keywordSearch(query: string, limit: number): SearchResult[] {
    return this.ftsIndex.search(query, limit);
  }

  private async semanticSearch(
    query: string,
    limit: number,
    entityTypes?: SearchableEntityType[]
  ): Promise<SearchResult[]> {
    const queryEmbedding = await this.embeddingService.embed(
      prepareForEmbedding(query, true)
    );

    const results = this.vectorStore.searchSimilar(queryEmbedding, limit, entityTypes);

    return results.map(r => ({
      entityId: r.entityId,
      entityType: r.entityType,
      title: '', // Will be hydrated later by the caller or from text_preview
      preview: r.textPreview ?? '',
      score: r.score,
      matchType: 'semantic' as const,
    }));
  }
}
