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

  describe('initial state', () => {
    it('starts with empty notes array', () => {
      const store = createStore();
      expect(store.notes).toEqual([]);
    });

    it('starts with loading false', () => {
      const store = createStore();
      expect(store.notesLoading).toBe(false);
    });

    it('starts with error null', () => {
      const store = createStore();
      expect(store.notesError).toBeNull();
    });

    it('starts with selectedNoteId null', () => {
      const store = createStore();
      expect(store.selectedNoteId).toBeNull();
    });
  });

  describe('fetchNotes', () => {
    it('calls IPC list', async () => {
      mockCortex.notes.list.mockResolvedValue([fakeNote()]);

      const store = createStore();
      await store.fetchNotes();

      expect(mockCortex.notes.list).toHaveBeenCalledOnce();
    });

    it('sets error on failure', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockCortex.notes.list.mockRejectedValue(new Error('fail'));

      const store = createStore();
      await store.fetchNotes();

      expect(mockCortex.notes.list).toHaveBeenCalledOnce();
      spy.mockRestore();
    });
  });

  describe('createNote', () => {
    it('calls IPC create and returns the note', async () => {
      const newNote = fakeNote({ id: 'new-1', title: 'New' });
      mockCortex.notes.create.mockResolvedValue(newNote);

      const store = createStore();
      const result = await store.createNote({ title: 'New' });

      expect(mockCortex.notes.create).toHaveBeenCalledWith({ title: 'New' });
      expect(result).toEqual(newNote);
    });
  });

  describe('updateNote', () => {
    it('calls IPC update and returns updated note', async () => {
      const updated = fakeNote({ title: 'Updated' });
      mockCortex.notes.update.mockResolvedValue(updated);

      const store = createStore({ notes: [fakeNote()] });
      const result = await store.updateNote('note-1', { title: 'Updated' });

      expect(mockCortex.notes.update).toHaveBeenCalledWith('note-1', { title: 'Updated' });
      expect(result).toEqual(updated);
    });
  });

  describe('deleteNote', () => {
    it('calls IPC delete and removes from array', async () => {
      mockCortex.notes.delete.mockResolvedValue(undefined);

      const store = createStore({ notes: [fakeNote()] });
      await store.deleteNote('note-1');

      expect(mockCortex.notes.delete).toHaveBeenCalledWith('note-1');
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
