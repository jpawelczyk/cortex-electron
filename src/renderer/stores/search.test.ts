import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSearchSlice, SearchSlice } from './search';

type SetFn = (partial: Partial<SearchSlice> | ((s: SearchSlice) => Partial<SearchSlice>)) => void;
type GetFn = () => SearchSlice;

// Helper to create a standalone store from the slice
function createStore(overrides?: Partial<SearchSlice>): SearchSlice {
  const state = {} as SearchSlice;

  const set: SetFn = (partial) => {
    const update = typeof partial === 'function' ? partial(state) : partial;
    Object.assign(state, update);
  };

  const get: GetFn = () => state;

  const creator = createSearchSlice as unknown as (
    set: SetFn,
    get: GetFn,
    api: Record<string, never>,
  ) => SearchSlice;
  Object.assign(state, creator(set, get, {}), overrides);

  return state;
}

// Mock window.cortex.search
const mockSearch = {
  query: vi.fn(),
  reindex: vi.fn(),
  onReindexProgress: vi.fn().mockReturnValue(() => {}),
  status: vi.fn(),
};

(globalThis as unknown as Record<string, unknown>).window = {
  cortex: { search: mockSearch },
};

describe('SearchSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with empty searchQuery', () => {
      const store = createStore();
      expect(store.searchQuery).toBe('');
    });

    it('starts with searchResults null', () => {
      const store = createStore();
      expect(store.searchResults).toBeNull();
    });

    it('starts with searchLoading false', () => {
      const store = createStore();
      expect(store.searchLoading).toBe(false);
    });

    it('starts with isSearchOpen false', () => {
      const store = createStore();
      expect(store.isSearchOpen).toBe(false);
    });

    it('starts with searchError null', () => {
      const store = createStore();
      expect(store.searchError).toBeNull();
    });

    it('starts with reindexProgress null', () => {
      const store = createStore();
      expect(store.reindexProgress).toBeNull();
    });
  });

  describe('setSearchQuery', () => {
    it('updates the query string', () => {
      const store = createStore();
      store.setSearchQuery('hello world');
      expect(store.searchQuery).toBe('hello world');
    });
  });

  describe('performSearch', () => {
    it('calls window.cortex.search.query and stores results', async () => {
      const fakeResults = {
        keyword: [{ entityId: 'n-1', entityType: 'note', title: 'Note', preview: '', score: 1, matchType: 'keyword' }],
        semantic: [],
      };
      mockSearch.query.mockResolvedValue(fakeResults);

      const store = createStore();
      await store.performSearch('hello');

      expect(mockSearch.query).toHaveBeenCalledWith({ query: 'hello' });
      expect(store.searchResults).toEqual(fakeResults);
    });

    it('sets searchLoading true during search and false after', async () => {
      let resolveSearch!: (v: unknown) => void;
      mockSearch.query.mockReturnValue(new Promise((res) => { resolveSearch = res; }));

      const store = createStore();
      const searchPromise = store.performSearch('loading test');

      expect(store.searchLoading).toBe(true);

      resolveSearch({ keyword: [], semantic: [] });
      await searchPromise;

      expect(store.searchLoading).toBe(false);
    });

    it('sets searchError on failure', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSearch.query.mockRejectedValue(new Error('search failed'));

      const store = createStore();
      await store.performSearch('error test');

      expect(store.searchError).toBe('search failed');
      expect(store.searchLoading).toBe(false);
      spy.mockRestore();
    });

    it('does not call IPC when query is empty string', async () => {
      const store = createStore();
      await store.performSearch('');

      expect(mockSearch.query).not.toHaveBeenCalled();
      expect(store.searchResults).toBeNull();
    });

    it('does not call IPC when query is whitespace only', async () => {
      const store = createStore();
      await store.performSearch('   ');

      expect(mockSearch.query).not.toHaveBeenCalled();
    });
  });

  describe('openSearch', () => {
    it('sets isSearchOpen to true', () => {
      const store = createStore();
      store.openSearch();
      expect(store.isSearchOpen).toBe(true);
    });
  });

  describe('closeSearch', () => {
    it('sets isSearchOpen to false', () => {
      const store = createStore({ isSearchOpen: true });
      store.closeSearch();
      expect(store.isSearchOpen).toBe(false);
    });

    it('clears query', () => {
      const store = createStore({ searchQuery: 'something' });
      store.closeSearch();
      expect(store.searchQuery).toBe('');
    });

    it('clears results', () => {
      const store = createStore({
        searchResults: { keyword: [], semantic: [] },
      });
      store.closeSearch();
      expect(store.searchResults).toBeNull();
    });
  });

  describe('clearSearch', () => {
    it('resets query', () => {
      const store = createStore({ searchQuery: 'foo' });
      store.clearSearch();
      expect(store.searchQuery).toBe('');
    });

    it('resets results', () => {
      const store = createStore({ searchResults: { keyword: [], semantic: [] } });
      store.clearSearch();
      expect(store.searchResults).toBeNull();
    });

    it('resets error', () => {
      const store = createStore({ searchError: 'some error' });
      store.clearSearch();
      expect(store.searchError).toBeNull();
    });

    it('does not close the palette', () => {
      const store = createStore({ isSearchOpen: true });
      store.clearSearch();
      expect(store.isSearchOpen).toBe(true);
    });
  });

  describe('startReindex', () => {
    it('sets reindexProgress to 0 at start and null after completion', async () => {
      let resolveReindex!: () => void;
      mockSearch.reindex.mockReturnValue(new Promise<void>((res) => { resolveReindex = res; }));

      const store = createStore();
      const reindexPromise = store.startReindex();

      expect(store.reindexProgress).toBe(0);

      resolveReindex();
      await reindexPromise;

      expect(store.reindexProgress).toBeNull();
    });

    it('resets reindexProgress to null on failure', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSearch.reindex.mockRejectedValue(new Error('reindex failed'));

      const store = createStore();
      await store.startReindex();

      expect(store.reindexProgress).toBeNull();
      spy.mockRestore();
    });
  });
});
