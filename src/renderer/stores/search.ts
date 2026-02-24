import type { StateCreator } from 'zustand';
import type { HybridSearchResult } from '@shared/search-types';

export interface SearchSlice {
  searchQuery: string;
  searchResults: HybridSearchResult | null;
  searchLoading: boolean;
  searchError: string | null;
  isSearchOpen: boolean;
  reindexProgress: number | null;
  setSearchQuery: (query: string) => void;
  performSearch: (query: string) => Promise<void>;
  openSearch: () => void;
  closeSearch: () => void;
  clearSearch: () => void;
  startReindex: () => Promise<void>;
}

export const createSearchSlice: StateCreator<SearchSlice> = (set) => ({
  searchQuery: '',
  searchResults: null,
  searchLoading: false,
  searchError: null,
  isSearchOpen: false,
  reindexProgress: null,

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  performSearch: async (query: string) => {
    if (!query.trim()) {
      set({ searchResults: null, searchLoading: false });
      return;
    }
    set({ searchLoading: true, searchError: null });
    try {
      const results = await window.cortex.search.query({ query });
      set({ searchResults: results, searchLoading: false });
    } catch (err) {
      set({
        searchError: err instanceof Error ? err.message : String(err),
        searchLoading: false,
      });
    }
  },

  openSearch: () => set({ isSearchOpen: true }),

  closeSearch: () => set({
    isSearchOpen: false,
    searchQuery: '',
    searchResults: null,
    searchError: null,
  }),

  clearSearch: () => set({
    searchQuery: '',
    searchResults: null,
    searchError: null,
  }),

  startReindex: async () => {
    set({ reindexProgress: 0 });
    try {
      await window.cortex.search.reindex();
      set({ reindexProgress: null });
    } catch (err) {
      console.error('[Search] Reindex failed:', err);
      set({ reindexProgress: null });
    }
  },
});
