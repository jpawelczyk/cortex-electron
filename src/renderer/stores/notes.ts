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
    try {
      const note = await window.cortex.notes.create(input) as Note;
      set((state) => ({ notes: [...state.notes, note] }));
      return note;
    } catch (err) {
      console.error('[NoteSlice] createNote failed:', err);
      set({ notesError: err instanceof Error ? err.message : 'Unknown error' });
      return null as unknown as Note;
    }
  },

  updateNote: async (id, input) => {
    try {
      const note = await window.cortex.notes.update(id, input) as Note;
      set((state) => ({
        notes: state.notes.map((n) => (n.id === id ? note : n)),
      }));
      return note;
    } catch (err) {
      console.error('[NoteSlice] updateNote failed:', err);
      set({ notesError: err instanceof Error ? err.message : 'Unknown error' });
      return null as unknown as Note;
    }
  },

  deleteNote: async (id) => {
    try {
      await window.cortex.notes.delete(id);
      set((state) => ({
        notes: state.notes.filter((n) => n.id !== id),
      }));
    } catch (err) {
      console.error('[NoteSlice] deleteNote failed:', err);
      set({ notesError: err instanceof Error ? err.message : 'Unknown error' });
    }
  },

  selectNote: (id) => set({ selectedNoteId: id }),
  deselectNote: () => set({ selectedNoteId: null }),
  setAutoFocusNoteTitle: (value) => set({ autoFocusNoteTitle: value }),
});
