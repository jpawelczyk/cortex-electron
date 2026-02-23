import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTestDb, type TestDb } from '../../../tests/helpers/db';

// Mock electron's ipcMain
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}));

import { ipcMain } from 'electron';
import { registerHandlers } from './handlers';

describe('IPC handlers', () => {
  let testDb: TestDb;

  beforeEach(() => {
    testDb = createTestDb();
    vi.mocked(ipcMain.handle).mockClear();
  });

  afterEach(() => {
    testDb.close();
  });

  function getHandler(channel: string) {
    registerHandlers(testDb.db, vi.fn());
    const call = vi.mocked(ipcMain.handle).mock.calls.find(
      ([ch]) => ch === channel
    );
    if (!call) throw new Error(`No handler registered for ${channel}`);
    return call[1];
  }

  it('registers all expected channels', () => {
    registerHandlers(testDb.db, vi.fn());

    const channels = vi.mocked(ipcMain.handle).mock.calls.map(([ch]) => ch);
    const expected = [
      'tasks:list', 'tasks:get', 'tasks:create', 'tasks:update', 'tasks:delete',
      'tasks:listTrashed', 'tasks:restore', 'tasks:emptyTrash', 'tasks:purgeExpiredTrash',
      'projects:list', 'projects:get', 'projects:create', 'projects:update', 'projects:delete',
      'contexts:list', 'contexts:get', 'contexts:create', 'contexts:update', 'contexts:delete',
    ];

    for (const channel of expected) {
      expect(channels).toContain(channel);
    }
    expect(channels).toHaveLength(expected.length + 5 + 5 + 5 + 3 + 4 + 4); // +5 for stakeholder channels, +5 for checklist channels, +5 for note channels, +3 for agent channels, +4 for projectStakeholder channels, +4 for noteStakeholder channels
  });

  describe('tasks', () => {
    it('tasks:list returns empty array initially', async () => {
      const handler = getHandler('tasks:list');
      const result = await handler({} as Electron.IpcMainInvokeEvent);
      expect(result).toEqual([]);
    });

    it('tasks:create → tasks:get round-trip', async () => {
      registerHandlers(testDb.db, vi.fn());
      const handlers = Object.fromEntries(
        vi.mocked(ipcMain.handle).mock.calls.map(([ch, fn]) => [ch, fn])
      );

      const created = await handlers['tasks:create']({} as Electron.IpcMainInvokeEvent, { title: 'Buy milk' });
      expect(created).toMatchObject({ title: 'Buy milk', status: 'inbox' });
      expect(created.id).toBeDefined();

      const fetched = await handlers['tasks:get']({} as Electron.IpcMainInvokeEvent, created.id);
      expect(fetched).toMatchObject({ title: 'Buy milk' });
    });

    it('tasks:update modifies a task', async () => {
      registerHandlers(testDb.db, vi.fn());
      const handlers = Object.fromEntries(
        vi.mocked(ipcMain.handle).mock.calls.map(([ch, fn]) => [ch, fn])
      );

      const created = await handlers['tasks:create']({} as Electron.IpcMainInvokeEvent, { title: 'Original' });
      const updated = await handlers['tasks:update']({} as Electron.IpcMainInvokeEvent, created.id, { title: 'Changed' });
      expect(updated.title).toBe('Changed');
    });

    it('tasks:delete soft-deletes a task', async () => {
      registerHandlers(testDb.db, vi.fn());
      const handlers = Object.fromEntries(
        vi.mocked(ipcMain.handle).mock.calls.map(([ch, fn]) => [ch, fn])
      );

      const created = await handlers['tasks:create']({} as Electron.IpcMainInvokeEvent, { title: 'To delete' });
      await handlers['tasks:delete']({} as Electron.IpcMainInvokeEvent, created.id);

      const result = await handlers['tasks:get']({} as Electron.IpcMainInvokeEvent, created.id);
      expect(result).toBeNull();

      // Still in DB (soft delete)
      const raw = testDb.getRawTask(created.id);
      expect(raw).toBeDefined();
      expect(raw!.deleted_at).not.toBeNull();
    });

    it('tasks:listTrashed returns deleted tasks', async () => {
      registerHandlers(testDb.db, vi.fn());
      const handlers = Object.fromEntries(
        vi.mocked(ipcMain.handle).mock.calls.map(([ch, fn]) => [ch, fn])
      );

      const created = await handlers['tasks:create']({} as Electron.IpcMainInvokeEvent, { title: 'Trash me' });
      await handlers['tasks:delete']({} as Electron.IpcMainInvokeEvent, created.id);

      const trashed = await handlers['tasks:listTrashed']({} as Electron.IpcMainInvokeEvent);
      expect(trashed).toHaveLength(1);
      expect(trashed[0].id).toBe(created.id);
    });

    it('tasks:restore brings task back from trash', async () => {
      registerHandlers(testDb.db, vi.fn());
      const handlers = Object.fromEntries(
        vi.mocked(ipcMain.handle).mock.calls.map(([ch, fn]) => [ch, fn])
      );

      const created = await handlers['tasks:create']({} as Electron.IpcMainInvokeEvent, { title: 'Restore me' });
      await handlers['tasks:delete']({} as Electron.IpcMainInvokeEvent, created.id);

      const restored = await handlers['tasks:restore']({} as Electron.IpcMainInvokeEvent, created.id);
      expect(restored.deleted_at).toBeNull();
      expect(restored.status).toBe('inbox');
    });

    it('tasks:emptyTrash permanently deletes all trashed tasks', async () => {
      registerHandlers(testDb.db, vi.fn());
      const handlers = Object.fromEntries(
        vi.mocked(ipcMain.handle).mock.calls.map(([ch, fn]) => [ch, fn])
      );

      const created = await handlers['tasks:create']({} as Electron.IpcMainInvokeEvent, { title: 'Emptied' });
      await handlers['tasks:delete']({} as Electron.IpcMainInvokeEvent, created.id);
      await handlers['tasks:emptyTrash']({} as Electron.IpcMainInvokeEvent);

      const trashed = await handlers['tasks:listTrashed']({} as Electron.IpcMainInvokeEvent);
      expect(trashed).toHaveLength(0);
    });

    it('tasks:create rejects missing title', async () => {
      registerHandlers(testDb.db, vi.fn());
      const handlers = Object.fromEntries(
        vi.mocked(ipcMain.handle).mock.calls.map(([ch, fn]) => [ch, fn])
      );

      await expect(
        handlers['tasks:create']({} as Electron.IpcMainInvokeEvent, {})
      ).rejects.toThrow();
    });

    it('tasks:create rejects empty title', async () => {
      registerHandlers(testDb.db, vi.fn());
      const handlers = Object.fromEntries(
        vi.mocked(ipcMain.handle).mock.calls.map(([ch, fn]) => [ch, fn])
      );

      await expect(
        handlers['tasks:create']({} as Electron.IpcMainInvokeEvent, { title: '' })
      ).rejects.toThrow();
    });

    it('tasks:create rejects invalid status', async () => {
      registerHandlers(testDb.db, vi.fn());
      const handlers = Object.fromEntries(
        vi.mocked(ipcMain.handle).mock.calls.map(([ch, fn]) => [ch, fn])
      );

      await expect(
        handlers['tasks:create']({} as Electron.IpcMainInvokeEvent, { title: 'T', status: 'invalid' })
      ).rejects.toThrow();
    });

    it('tasks:update rejects invalid id', async () => {
      registerHandlers(testDb.db, vi.fn());
      const handlers = Object.fromEntries(
        vi.mocked(ipcMain.handle).mock.calls.map(([ch, fn]) => [ch, fn])
      );

      await expect(
        handlers['tasks:update']({} as Electron.IpcMainInvokeEvent, 'not-a-uuid', { title: 'New' })
      ).rejects.toThrow();
    });
  });

  describe('projects', () => {
    it('projects:list returns empty array initially', async () => {
      const handler = getHandler('projects:list');
      const result = await handler({} as Electron.IpcMainInvokeEvent);
      expect(result).toEqual([]);
    });

    it('projects:create → projects:get round-trip', async () => {
      registerHandlers(testDb.db, vi.fn());
      const handlers = Object.fromEntries(
        vi.mocked(ipcMain.handle).mock.calls.map(([ch, fn]) => [ch, fn])
      );

      const created = await handlers['projects:create']({} as Electron.IpcMainInvokeEvent, { title: 'My Project' });
      expect(created).toMatchObject({ title: 'My Project', status: 'active' });

      const fetched = await handlers['projects:get']({} as Electron.IpcMainInvokeEvent, created.id);
      expect(fetched).toMatchObject({ title: 'My Project' });
    });

    it('projects:delete soft-deletes a project', async () => {
      registerHandlers(testDb.db, vi.fn());
      const handlers = Object.fromEntries(
        vi.mocked(ipcMain.handle).mock.calls.map(([ch, fn]) => [ch, fn])
      );

      const created = await handlers['projects:create']({} as Electron.IpcMainInvokeEvent, { title: 'Doomed' });
      await handlers['projects:delete']({} as Electron.IpcMainInvokeEvent, created.id);

      const result = await handlers['projects:get']({} as Electron.IpcMainInvokeEvent, created.id);
      expect(result).toBeNull();

      const raw = testDb.getRawProject(created.id);
      expect(raw!.deleted_at).not.toBeNull();
    });
  });

  describe('contexts', () => {
    it('contexts:list returns empty array initially', async () => {
      const handler = getHandler('contexts:list');
      const result = await handler({} as Electron.IpcMainInvokeEvent);
      expect(result).toEqual([]);
    });

    it('contexts:create → contexts:get round-trip', async () => {
      registerHandlers(testDb.db, vi.fn());
      const handlers = Object.fromEntries(
        vi.mocked(ipcMain.handle).mock.calls.map(([ch, fn]) => [ch, fn])
      );

      const created = await handlers['contexts:create']({} as Electron.IpcMainInvokeEvent, { name: 'Work' });
      expect(created).toMatchObject({ name: 'Work' });

      const fetched = await handlers['contexts:get']({} as Electron.IpcMainInvokeEvent, created.id);
      expect(fetched).toMatchObject({ name: 'Work' });
    });

    it('contexts:delete soft-deletes a context', async () => {
      registerHandlers(testDb.db, vi.fn());
      const handlers = Object.fromEntries(
        vi.mocked(ipcMain.handle).mock.calls.map(([ch, fn]) => [ch, fn])
      );

      const created = await handlers['contexts:create']({} as Electron.IpcMainInvokeEvent, { name: 'Temp' });
      await handlers['contexts:delete']({} as Electron.IpcMainInvokeEvent, created.id);

      const result = await handlers['contexts:get']({} as Electron.IpcMainInvokeEvent, created.id);
      expect(result).toBeNull();

      const raw = testDb.getRawContext(created.id);
      expect(raw!.deleted_at).not.toBeNull();
    });
  });

  describe('notes', () => {
    it('notes:list returns empty array initially', async () => {
      const handler = getHandler('notes:list');
      const result = await handler({} as Electron.IpcMainInvokeEvent);
      expect(result).toEqual([]);
    });

    it('notes:create → notes:get round-trip', async () => {
      registerHandlers(testDb.db, vi.fn());
      const handlers = Object.fromEntries(
        vi.mocked(ipcMain.handle).mock.calls.map(([ch, fn]) => [ch, fn])
      );

      const created = await handlers['notes:create']({} as Electron.IpcMainInvokeEvent, { title: 'My Note' });
      expect(created).toMatchObject({ title: 'My Note', is_pinned: false });
      expect(created.id).toBeDefined();

      const fetched = await handlers['notes:get']({} as Electron.IpcMainInvokeEvent, created.id);
      expect(fetched).toMatchObject({ title: 'My Note' });
    });

    it('notes:create with content and optional fields', async () => {
      registerHandlers(testDb.db, vi.fn());
      const handlers = Object.fromEntries(
        vi.mocked(ipcMain.handle).mock.calls.map(([ch, fn]) => [ch, fn])
      );

      const created = await handlers['notes:create']({} as Electron.IpcMainInvokeEvent, {
        title: 'Pinned Note',
        content: '## Hello',
        is_pinned: true,
      });
      expect(created).toMatchObject({ title: 'Pinned Note', content: '## Hello', is_pinned: true });
    });

    it('notes:update modifies a note', async () => {
      registerHandlers(testDb.db, vi.fn());
      const handlers = Object.fromEntries(
        vi.mocked(ipcMain.handle).mock.calls.map(([ch, fn]) => [ch, fn])
      );

      const created = await handlers['notes:create']({} as Electron.IpcMainInvokeEvent, { title: 'Original' });
      const updated = await handlers['notes:update']({} as Electron.IpcMainInvokeEvent, created.id, { title: 'Changed', content: 'New content' });
      expect(updated.title).toBe('Changed');
      expect(updated.content).toBe('New content');
    });

    it('notes:delete soft-deletes a note', async () => {
      registerHandlers(testDb.db, vi.fn());
      const handlers = Object.fromEntries(
        vi.mocked(ipcMain.handle).mock.calls.map(([ch, fn]) => [ch, fn])
      );

      const created = await handlers['notes:create']({} as Electron.IpcMainInvokeEvent, { title: 'To delete' });
      await handlers['notes:delete']({} as Electron.IpcMainInvokeEvent, created.id);

      const result = await handlers['notes:get']({} as Electron.IpcMainInvokeEvent, created.id);
      expect(result).toBeNull();

      // Still in DB (soft delete)
      const raw = testDb.getRawNote(created.id);
      expect(raw).toBeDefined();
      expect(raw!.deleted_at).not.toBeNull();
    });

    it('notes:list returns only non-deleted notes', async () => {
      registerHandlers(testDb.db, vi.fn());
      const handlers = Object.fromEntries(
        vi.mocked(ipcMain.handle).mock.calls.map(([ch, fn]) => [ch, fn])
      );

      const kept = await handlers['notes:create']({} as Electron.IpcMainInvokeEvent, { title: 'Keep me' });
      const deleted = await handlers['notes:create']({} as Electron.IpcMainInvokeEvent, { title: 'Delete me' });
      await handlers['notes:delete']({} as Electron.IpcMainInvokeEvent, deleted.id);

      const listed = await handlers['notes:list']({} as Electron.IpcMainInvokeEvent);
      expect(listed).toHaveLength(1);
      expect(listed[0].id).toBe(kept.id);
    });

    it('notes:create rejects missing title', async () => {
      registerHandlers(testDb.db, vi.fn());
      const handlers = Object.fromEntries(
        vi.mocked(ipcMain.handle).mock.calls.map(([ch, fn]) => [ch, fn])
      );

      await expect(
        handlers['notes:create']({} as Electron.IpcMainInvokeEvent, {})
      ).rejects.toThrow();
    });

    it('notes:create rejects empty title', async () => {
      registerHandlers(testDb.db, vi.fn());
      const handlers = Object.fromEntries(
        vi.mocked(ipcMain.handle).mock.calls.map(([ch, fn]) => [ch, fn])
      );

      await expect(
        handlers['notes:create']({} as Electron.IpcMainInvokeEvent, { title: '' })
      ).rejects.toThrow();
    });

    it('notes:create rejects wrong types', async () => {
      registerHandlers(testDb.db, vi.fn());
      const handlers = Object.fromEntries(
        vi.mocked(ipcMain.handle).mock.calls.map(([ch, fn]) => [ch, fn])
      );

      await expect(
        handlers['notes:create']({} as Electron.IpcMainInvokeEvent, { title: 42 })
      ).rejects.toThrow();
    });

    it('notes:update rejects invalid id type', async () => {
      registerHandlers(testDb.db, vi.fn());
      const handlers = Object.fromEntries(
        vi.mocked(ipcMain.handle).mock.calls.map(([ch, fn]) => [ch, fn])
      );

      await expect(
        handlers['notes:update']({} as Electron.IpcMainInvokeEvent, 123 as unknown as string, { title: 'New' })
      ).rejects.toThrow();
    });
  });
});
