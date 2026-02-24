import type { NoteStakeholder } from '@shared/types';
import type { DbContext } from '../db/types';

export interface NoteStakeholderService {
  listByNote(noteId: string): Promise<NoteStakeholder[]>;
  listByStakeholder(stakeholderId: string): Promise<NoteStakeholder[]>;
  link(noteId: string, stakeholderId: string): Promise<NoteStakeholder>;
  unlink(noteId: string, stakeholderId: string): Promise<void>;
}

export function createNoteStakeholderService(ctx: DbContext): NoteStakeholderService {
  const { db } = ctx;

  return {
    async listByNote(noteId: string): Promise<NoteStakeholder[]> {
      return db.getAll<NoteStakeholder>(
        'SELECT * FROM note_stakeholders WHERE note_id = ?',
        [noteId]
      );
    },

    async listByStakeholder(stakeholderId: string): Promise<NoteStakeholder[]> {
      return db.getAll<NoteStakeholder>(
        'SELECT * FROM note_stakeholders WHERE stakeholder_id = ?',
        [stakeholderId]
      );
    },

    async link(noteId: string, stakeholderId: string): Promise<NoteStakeholder> {
      const id = crypto.randomUUID();
      await db.execute(
        'INSERT OR IGNORE INTO note_stakeholders (id, note_id, stakeholder_id) VALUES (?, ?, ?)',
        [id, noteId, stakeholderId]
      );
      const row = await db.getOptional<NoteStakeholder>(
        'SELECT * FROM note_stakeholders WHERE note_id = ? AND stakeholder_id = ?',
        [noteId, stakeholderId]
      );
      return row!;
    },

    async unlink(noteId: string, stakeholderId: string): Promise<void> {
      await db.execute(
        'DELETE FROM note_stakeholders WHERE note_id = ? AND stakeholder_id = ?',
        [noteId, stakeholderId]
      );
    },
  };
}
