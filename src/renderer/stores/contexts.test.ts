import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createContextSlice, ContextSlice } from './contexts';

type SetFn = (partial: Partial<ContextSlice> | ((s: ContextSlice) => Partial<ContextSlice>)) => void;
type GetFn = () => ContextSlice;

function createStore(overrides?: Partial<ContextSlice>): ContextSlice {
  const state = {} as ContextSlice;

  const set: SetFn = (partial) => {
    const update = typeof partial === 'function' ? partial(state) : partial;
    Object.assign(state, update);
  };

  const get: GetFn = () => state;

  const creator = createContextSlice as unknown as (
    set: SetFn,
    get: GetFn,
    api: Record<string, never>,
  ) => ContextSlice;
  Object.assign(state, creator(set, get, {}), overrides);

  return state;
}

const mockCortex = {
  contexts: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};

{
  const g = globalThis as unknown as Record<string, Record<string, unknown>>;
  g.window = { ...(g.window || {}), cortex: { ...(g.window?.cortex as Record<string, unknown> || {}), ...mockCortex } };
}

const fakeContext = (overrides = {}) => ({
  id: 'ctx-1',
  name: 'Work',
  color: null,
  icon: null,
  sort_order: 0,
  created_at: '2026-02-17T00:00:00.000Z',
  updated_at: '2026-02-17T00:00:00.000Z',
  deleted_at: null,
  ...overrides,
});

describe('ContextSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with empty contexts array', () => {
      const store = createStore();
      expect(store.contexts).toEqual([]);
    });

    it('starts with loading false', () => {
      const store = createStore();
      expect(store.contextsLoading).toBe(false);
    });

    it('starts with error null', () => {
      const store = createStore();
      expect(store.contextsError).toBeNull();
    });
  });

  describe('fetchContexts', () => {
    it('calls IPC list', async () => {
      mockCortex.contexts.list.mockResolvedValue([fakeContext()]);

      const store = createStore();
      await store.fetchContexts();

      expect(mockCortex.contexts.list).toHaveBeenCalledOnce();
    });

    it('sets error on failure', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockCortex.contexts.list.mockRejectedValue(new Error('fail'));

      const store = createStore();
      await store.fetchContexts();

      expect(mockCortex.contexts.list).toHaveBeenCalledOnce();
      spy.mockRestore();
    });
  });

  describe('createContext', () => {
    it('calls IPC create and returns the context', async () => {
      const newCtx = fakeContext({ id: 'new-1', name: 'Personal' });
      mockCortex.contexts.create.mockResolvedValue(newCtx);

      const store = createStore();
      const result = await store.createContext({ name: 'Personal' });

      expect(mockCortex.contexts.create).toHaveBeenCalledWith({ name: 'Personal' });
      expect(result).toEqual(newCtx);
    });

    it('sets contextsError on failure', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockCortex.contexts.create.mockRejectedValue(new Error('create failed'));

      const store = createStore();
      await store.createContext({ name: 'Personal' });

      expect(store.contextsError).toBe('create failed');
      spy.mockRestore();
    });
  });

  describe('updateContext', () => {
    it('calls IPC update and returns updated context', async () => {
      const updated = fakeContext({ name: 'Updated' });
      mockCortex.contexts.update.mockResolvedValue(updated);

      const store = createStore({ contexts: [fakeContext()] });
      const result = await store.updateContext('ctx-1', { name: 'Updated' });

      expect(mockCortex.contexts.update).toHaveBeenCalledWith('ctx-1', { name: 'Updated' });
      expect(result).toEqual(updated);
    });

    it('sets contextsError on failure', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockCortex.contexts.update.mockRejectedValue(new Error('update failed'));

      const store = createStore({ contexts: [fakeContext()] });
      await store.updateContext('ctx-1', { name: 'Updated' });

      expect(store.contextsError).toBe('update failed');
      spy.mockRestore();
    });
  });

  describe('deleteContext', () => {
    it('calls IPC delete', async () => {
      mockCortex.contexts.delete.mockResolvedValue(undefined);

      const store = createStore({ contexts: [fakeContext()] });
      await store.deleteContext('ctx-1');

      expect(mockCortex.contexts.delete).toHaveBeenCalledWith('ctx-1');
    });

    it('sets contextsError on failure', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockCortex.contexts.delete.mockRejectedValue(new Error('delete failed'));

      const store = createStore({ contexts: [fakeContext()] });
      await store.deleteContext('ctx-1');

      expect(store.contextsError).toBe('delete failed');
      spy.mockRestore();
    });
  });

  describe('activeContextIds', () => {
    it('starts with empty array', () => {
      const store = createStore();
      expect(store.activeContextIds).toEqual([]);
    });
  });

  describe('toggleContext', () => {
    it('adds id when not present', () => {
      const store = createStore();
      store.toggleContext('ctx-1');
      expect(store.activeContextIds).toContain('ctx-1');
    });

    it('clears filter when toggling the only active id', () => {
      const store = createStore({ activeContextIds: ['ctx-1'] });
      store.toggleContext('ctx-1');
      expect(store.activeContextIds).toEqual([]);
    });

    it('replaces active id instead of adding when toggling a different id', () => {
      const store = createStore({ activeContextIds: ['ctx-1'] });
      store.toggleContext('ctx-2');
      expect(store.activeContextIds).toEqual(['ctx-2']);
    });
  });

  describe('setActiveContexts', () => {
    it('sets specific context ids', () => {
      const store = createStore();
      store.setActiveContexts(['ctx-1', 'ctx-2']);
      expect(store.activeContextIds).toEqual(['ctx-1', 'ctx-2']);
    });
  });

  describe('clearContextFilter', () => {
    it('resets activeContextIds to empty array', () => {
      const store = createStore({ activeContextIds: ['ctx-1', 'ctx-2'] });
      store.clearContextFilter();
      expect(store.activeContextIds).toEqual([]);
    });
  });

});
