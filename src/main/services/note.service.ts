import { v4 as uuid } from 'uuid';
import type { Note, CreateNoteInput, UpdateNoteInput } from '@shared/types';
import type { DbContext } from '../db/types';

export interface NoteService {
  create(input: CreateNoteInput): Promise<Note>;
  get(id: string): Promise<Note | null>;
  list(): Promise<Note[]>;
  update(id: string, input: UpdateNoteInput): Promise<Note>;
  delete(id: string): Promise<void>;
}

function rowToNote(row: Record<string, unknown>): Note {
  return { ...row, is_pinned: !!row.is_pinned } as Note;
}

export function createNoteService(ctx: DbContext): NoteService {
  const { db } = ctx;

  return {
    async create(input: CreateNoteInput): Promise<Note> {
      const id = uuid();
      const now = new Date().toISOString();

      const note: Note = {
        id,
        title: input.title,
        content: input.content ?? null,
        context_id: input.context_id ?? null,
        project_id: input.project_id ?? null,
        is_pinned: input.is_pinned ?? false,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };

      await db.execute(`
        INSERT INTO notes (
          id, title, content, context_id, project_id,
          is_pinned, created_at, updated_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        note.id, note.title, note.content, note.context_id, note.project_id,
        note.is_pinned ? 1 : 0, note.created_at, note.updated_at, note.deleted_at,
      ]);

      return note;
    },

    async get(id: string): Promise<Note | null> {
      const row = await db.getOptional<Record<string, unknown>>(
        'SELECT * FROM notes WHERE id = ? AND deleted_at IS NULL',
        [id]
      );
      return row ? rowToNote(row) : null;
    },

    async list(): Promise<Note[]> {
      const rows = await db.getAll<Record<string, unknown>>(
        'SELECT * FROM notes WHERE deleted_at IS NULL ORDER BY updated_at DESC'
      );
      return rows.map(rowToNote);
    },

    async update(id: string, input: UpdateNoteInput): Promise<Note> {
      const existing = await this.get(id);
      if (!existing) {
        throw new Error('Note not found');
      }

      const now = new Date().toISOString();

      const updated: Note = {
        ...existing,
        ...input,
        updated_at: now,
      };

      await db.execute(`
        UPDATE notes SET
          title = ?, content = ?, context_id = ?, project_id = ?,
          is_pinned = ?, updated_at = ?
        WHERE id = ?
      `, [
        updated.title, updated.content, updated.context_id, updated.project_id,
        updated.is_pinned ? 1 : 0, updated.updated_at,
        id,
      ]);

      return updated;
    },

    async delete(id: string): Promise<void> {
      const existing = await this.get(id);
      if (!existing) {
        throw new Error('Note not found');
      }

      const now = new Date().toISOString();
      await db.execute(
        'UPDATE notes SET deleted_at = ?, updated_at = ? WHERE id = ?',
        [now, now, id]
      );
    },
  };
}
