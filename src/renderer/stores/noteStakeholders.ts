import { StateCreator } from 'zustand';

interface NoteStakeholderLink {
  note_id: string;
  stakeholder_id: string;
}

export interface NoteStakeholderSlice {
  noteStakeholderLinks: NoteStakeholderLink[];
  fetchNoteStakeholders: (noteId: string) => Promise<void>;
  linkStakeholderToNote: (noteId: string, stakeholderId: string) => Promise<void>;
  unlinkStakeholderFromNote: (noteId: string, stakeholderId: string) => Promise<void>;
}

export const createNoteStakeholderSlice: StateCreator<NoteStakeholderSlice> = (set) => ({
  noteStakeholderLinks: [],

  fetchNoteStakeholders: async (noteId) => {
    try {
      const links = await window.cortex.noteStakeholders.list(noteId) as NoteStakeholderLink[];
      set((state) => ({
        noteStakeholderLinks: [
          ...state.noteStakeholderLinks.filter(l => l.note_id !== noteId),
          ...links,
        ],
      }));
    } catch (err) {
      console.error('[NoteStakeholderSlice] fetchNoteStakeholders failed:', err);
    }
  },

  linkStakeholderToNote: async (noteId, stakeholderId) => {
    try {
      const link = await window.cortex.noteStakeholders.link({ note_id: noteId, stakeholder_id: stakeholderId }) as NoteStakeholderLink;
      set((state) => ({
        noteStakeholderLinks: [...state.noteStakeholderLinks, link],
      }));
    } catch (err) {
      console.error('[NoteStakeholderSlice] linkStakeholderToNote failed:', err);
    }
  },

  unlinkStakeholderFromNote: async (noteId, stakeholderId) => {
    try {
      await window.cortex.noteStakeholders.unlink({ note_id: noteId, stakeholder_id: stakeholderId });
      set((state) => ({
        noteStakeholderLinks: state.noteStakeholderLinks.filter(
          l => !(l.note_id === noteId && l.stakeholder_id === stakeholderId)
        ),
      }));
    } catch (err) {
      console.error('[NoteStakeholderSlice] unlinkStakeholderFromNote failed:', err);
    }
  },
});
