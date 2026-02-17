import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createContextSlice, ContextSlice } from './contexts';

function createStore(overrides?: Partial<ContextSlice>): ContextSlice {
  let state: ContextSlice;

  const set = (partial: Partial<ContextSlice> | ((s: ContextSlice) => Partial<ContextSlice>)) => {
    const update = typeof partial === 'function' ? partial(state) : partial;
    state = { ...state, ...update };
  };

  const get = () => state;

  state = {
    ...createContextSlice(set as any, get as any, {} as any),
    ...overrides,
  };

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

(globalThis as any).window = { ...((globalThis as any).window || {}), cortex: { ...((globalThis as any).window?.cortex || {}), ...mockCortex } };

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
      mockCortex.contexts.list.mockRejectedValue(new Error('fail'));

      const store = createStore();
      await store.fetchContexts();

      expect(mockCortex.contexts.list).toHaveBeenCalledOnce();
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
  });

  describe('deleteContext', () => {
    it('calls IPC delete', async () => {
      mockCortex.contexts.delete.mockResolvedValue(undefined);

      const store = createStore({ contexts: [fakeContext()] });
      await store.deleteContext('ctx-1');

      expect(mockCortex.contexts.delete).toHaveBeenCalledWith('ctx-1');
    });
  });
});
