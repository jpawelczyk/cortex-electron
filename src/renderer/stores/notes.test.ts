import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createNoteSlice, NoteSlice } from './notes';

type SetFn = (partial: Partial<NoteSlice> | ((s: NoteSlice) => Partial<NoteSlice>)) => void;
type GetFn = () => NoteSlice;

function createStore(overrides?: Partial<NoteSlice>): { get: GetFn } & NoteSlice {
  let state: NoteSlice;

  const set: SetFn = (partial) => {
    const update = typeof partial === 'function' ? partial(state) : partial;
    state = { ...state, ...update };
  };

  const get: GetFn = () => state;

  const creator = createNoteSlice as unknown as (
    set: SetFn,
    get: GetFn,
    api: Record<string, never>,
  ) => NoteSlice;
  state = {
    ...creator(set, get, {}),
    ...overrides,
  };

  return new Proxy({} as { get: GetFn } & NoteSlice, {
    get(_target, prop) {
      if (prop === 'get') return get;
      return state[prop as keyof NoteSlice];
    },
  });
}

const mockCortex = {
  notes: {
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

const fakeNote = (overrides = {}) => ({
  id: 'note-1',
  title: 'Test note',
  content: null,
  context_id: null,
  project_id: null,
  is_pinned: false,
  created_at: '2026-02-17T00:00:00.000Z',
  updated_at: '2026-02-17T00:00:00.000Z',
  deleted_at: null,
  ...overrides,
});

describe('NoteSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('deleteNote', () => {
    it('removes from notes array on success', async () => {
      mockCortex.notes.delete.mockResolvedValue(undefined);

      const store = createStore({ notes: [fakeNote()] });
      await store.deleteNote('note-1');

      expect(store.notes).toEqual([]);
    });

  });

  describe('selectNote', () => {
    it('sets selectedNoteId', () => {
      const store = createStore();
      store.selectNote('note-1');
      expect(store.selectedNoteId).toBe('note-1');
    });
  });

  describe('deselectNote', () => {
    it('clears selectedNoteId', () => {
      const store = createStore({ selectedNoteId: 'note-1' });
      store.deselectNote();
      expect(store.selectedNoteId).toBeNull();
    });
  });
});
