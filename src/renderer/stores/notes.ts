import { StateCreator } from 'zustand';
import type { Note, CreateNoteInput, UpdateNoteInput } from '../../shared/types';

export interface NoteSlice {
  notes: Note[];
  notesLoading: boolean;
  notesError: string | null;
  selectedNoteId: string | null;
  autoFocusNoteTitle: boolean;

  fetchNotes: () => Promise<void>;
  createNote: (input: CreateNoteInput) => Promise<Note>;
  updateNote: (id: string, input: UpdateNoteInput) => Promise<Note>;
  deleteNote: (id: string) => Promise<void>;

  selectNote: (id: string) => void;
  deselectNote: () => void;
  setAutoFocusNoteTitle: (value: boolean) => void;
}

export const createNoteSlice: StateCreator<NoteSlice> = (set) => ({
  notes: [],
  notesLoading: false,
  notesError: null,
  selectedNoteId: null,
  autoFocusNoteTitle: false,

  fetchNotes: async () => {
    set({ notesLoading: true, notesError: null });
    try {
      const notes = await window.cortex.notes.list() as Note[];
      set({ notes, notesLoading: false });
    } catch (err) {
      console.error('[NoteSlice] fetchNotes failed:', err);
      set({ notesError: err instanceof Error ? err.message : 'Unknown error', notesLoading: false });
    }
  },

  createNote: async (input) => {
    const note = await window.cortex.notes.create(input) as Note;
    set((state) => ({ notes: [...state.notes, note] }));
    return note;
  },

  updateNote: async (id, input) => {
    const note = await window.cortex.notes.update(id, input) as Note;
    set((state) => ({
      notes: state.notes.map((n) => (n.id === id ? note : n)),
    }));
    return note;
  },

  deleteNote: async (id) => {
    await window.cortex.notes.delete(id);
    set((state) => ({
      notes: state.notes.filter((n) => n.id !== id),
    }));
  },

  selectNote: (id) => set({ selectedNoteId: id }),
  deselectNote: () => set({ selectedNoteId: null }),
  setAutoFocusNoteTitle: (value) => set({ autoFocusNoteTitle: value }),
});
