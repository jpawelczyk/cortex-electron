import { describe, it, expect, beforeEach } from 'vitest';
import { createNoteService, NoteService } from './note.service';
import { createTestDb, TestDb } from '../../../tests/helpers/db';

describe('NoteService', () => {
  let db: TestDb;
  let noteService: NoteService;

  beforeEach(() => {
    db = createTestDb();
    noteService = createNoteService(db);
  });

  describe('create', () => {
    it('generates a UUID for the note', async () => {
      const note = await noteService.create({ title: 'Test note' });

      expect(note.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });

    it('sets created_at and updated_at timestamps', async () => {
      const before = new Date().toISOString();
      const note = await noteService.create({ title: 'Test note' });
      const after = new Date().toISOString();

      expect(note.created_at).toBeDefined();
      expect(note.updated_at).toBeDefined();
      expect(note.created_at >= before).toBe(true);
      expect(note.created_at <= after).toBe(true);
      expect(note.created_at).toBe(note.updated_at);
    });

    it('stores the provided title', async () => {
      const note = await noteService.create({ title: 'My Note' });

      expect(note.title).toBe('My Note');
    });

    it('accepts optional content field', async () => {
      const note = await noteService.create({ title: 'Note with content', content: '# Heading\nSome content' });

      expect(note.content).toBe('# Heading\nSome content');
    });

    it('accepts optional context_id field', async () => {
      const contextId = db.createContext({ name: 'Work' });
      const note = await noteService.create({ title: 'Work Note', context_id: contextId });

      expect(note.context_id).toBe(contextId);
    });

    it('accepts optional project_id field', async () => {
      const projectId = db.createProject({ title: 'My Project' });
      const note = await noteService.create({ title: 'Project Note', project_id: projectId });

      expect(note.project_id).toBe(projectId);
    });

    it('accepts optional is_pinned field', async () => {
      const note = await noteService.create({ title: 'Pinned Note', is_pinned: true });

      expect(note.is_pinned).toBe(true);
    });

    it('defaults is_pinned to false', async () => {
      const note = await noteService.create({ title: 'Unpinned Note' });

      expect(note.is_pinned).toBe(false);
    });

    it('defaults nullable fields to null', async () => {
      const note = await noteService.create({ title: 'Minimal' });

      expect(note.content).toBeNull();
      expect(note.context_id).toBeNull();
      expect(note.project_id).toBeNull();
      expect(note.deleted_at).toBeNull();
    });
  });

  describe('get', () => {
    it('retrieves a note by id', async () => {
      const created = await noteService.create({ title: 'Find me' });

      const found = await noteService.get(created.id);

      expect(found).not.toBeNull();
      expect(found?.title).toBe('Find me');
    });

    it('returns null for non-existent id', async () => {
      const found = await noteService.get('non-existent-uuid');

      expect(found).toBeNull();
    });

    it('returns null for soft-deleted notes', async () => {
      const created = await noteService.create({ title: 'To be deleted' });
      await noteService.delete(created.id);

      const found = await noteService.get(created.id);

      expect(found).toBeNull();
    });
  });

  describe('list', () => {
    it('returns all non-deleted notes', async () => {
      await noteService.create({ title: 'Note 1' });
      await noteService.create({ title: 'Note 2' });
      await noteService.create({ title: 'Note 3' });

      const notes = await noteService.list();

      expect(notes).toHaveLength(3);
    });

    it('excludes soft-deleted notes', async () => {
      const n1 = await noteService.create({ title: 'Note 1' });
      await noteService.create({ title: 'Note 2' });
      await noteService.delete(n1.id);

      const notes = await noteService.list();

      expect(notes).toHaveLength(1);
      expect(notes[0].title).toBe('Note 2');
    });

    it('sorts by updated_at descending', async () => {
      const n1 = await noteService.create({ title: 'First' });
      await new Promise(r => setTimeout(r, 10));
      await noteService.create({ title: 'Second' });
      await new Promise(r => setTimeout(r, 10));
      // Update n1 to make it most recently updated
      await noteService.update(n1.id, { title: 'First Updated' });

      const notes = await noteService.list();

      expect(notes[0].title).toBe('First Updated');
    });
  });

  describe('update', () => {
    it('updates note fields', async () => {
      const note = await noteService.create({ title: 'Original' });

      const updated = await noteService.update(note.id, {
        title: 'Updated',
        content: 'New content',
      });

      expect(updated.title).toBe('Updated');
      expect(updated.content).toBe('New content');
    });

    it('updates updated_at timestamp', async () => {
      const note = await noteService.create({ title: 'Note' });
      const originalUpdatedAt = note.updated_at;

      await new Promise(r => setTimeout(r, 10));

      const updated = await noteService.update(note.id, { title: 'Updated' });

      expect(updated.updated_at > originalUpdatedAt).toBe(true);
    });

    it('preserves fields not included in update', async () => {
      const contextId = db.createContext({ name: 'Work' });
      const note = await noteService.create({
        title: 'Original',
        content: 'Keep me',
        context_id: contextId,
        is_pinned: true,
      });

      const updated = await noteService.update(note.id, { title: 'New Title' });

      expect(updated.content).toBe('Keep me');
      expect(updated.context_id).toBe(contextId);
      expect(updated.is_pinned).toBe(true);
    });

    it('throws error for non-existent note', async () => {
      await expect(
        noteService.update('non-existent', { title: 'Nope' })
      ).rejects.toThrow('Note not found');
    });
  });

  describe('delete', () => {
    it('soft deletes by setting deleted_at', async () => {
      const note = await noteService.create({ title: 'To delete' });

      await noteService.delete(note.id);

      const raw = db.getRawNote(note.id);
      expect(raw?.deleted_at).not.toBeNull();
    });

    it('is a no-op for non-existent note', async () => {
      await expect(
        noteService.delete('non-existent')
      ).resolves.toBeUndefined();
    });
  });

  describe('is_pinned boolean conversion', () => {
    it('returns is_pinned as boolean true, not integer', async () => {
      const note = await noteService.create({ title: 'Pinned', is_pinned: true });

      const found = await noteService.get(note.id);

      expect(found?.is_pinned).toBe(true);
      expect(typeof found?.is_pinned).toBe('boolean');
    });

    it('returns is_pinned as boolean false, not integer', async () => {
      const note = await noteService.create({ title: 'Not Pinned' });

      const found = await noteService.get(note.id);

      expect(found?.is_pinned).toBe(false);
      expect(typeof found?.is_pinned).toBe('boolean');
    });

    it('returns is_pinned as boolean in list()', async () => {
      await noteService.create({ title: 'Pinned', is_pinned: true });
      await noteService.create({ title: 'Not Pinned' });

      const notes = await noteService.list();

      for (const note of notes) {
        expect(typeof note.is_pinned).toBe('boolean');
      }
    });
  });
});
