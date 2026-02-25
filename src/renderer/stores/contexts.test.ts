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
