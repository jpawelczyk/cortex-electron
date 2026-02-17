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
    registerHandlers(testDb.db);
    const call = vi.mocked(ipcMain.handle).mock.calls.find(
      ([ch]) => ch === channel
    );
    if (!call) throw new Error(`No handler registered for ${channel}`);
    return call[1];
  }

  it('registers all 15 channels', () => {
    registerHandlers(testDb.db);

    const channels = vi.mocked(ipcMain.handle).mock.calls.map(([ch]) => ch);
    const expected = [
      'tasks:list', 'tasks:get', 'tasks:create', 'tasks:update', 'tasks:delete',
      'projects:list', 'projects:get', 'projects:create', 'projects:update', 'projects:delete',
      'contexts:list', 'contexts:get', 'contexts:create', 'contexts:update', 'contexts:delete',
    ];

    for (const channel of expected) {
      expect(channels).toContain(channel);
    }
  });

  describe('tasks', () => {
    it('tasks:list returns empty array initially', async () => {
      const handler = getHandler('tasks:list');
      const result = await handler({} as any);
      expect(result).toEqual([]);
    });

    it('tasks:create → tasks:get round-trip', async () => {
      registerHandlers(testDb.db);
      const handlers = Object.fromEntries(
        vi.mocked(ipcMain.handle).mock.calls.map(([ch, fn]) => [ch, fn])
      );

      const created = await handlers['tasks:create']({} as any, { title: 'Buy milk' });
      expect(created).toMatchObject({ title: 'Buy milk', status: 'inbox' });
      expect(created.id).toBeDefined();

      const fetched = await handlers['tasks:get']({} as any, created.id);
      expect(fetched).toMatchObject({ title: 'Buy milk' });
    });

    it('tasks:update modifies a task', async () => {
      registerHandlers(testDb.db);
      const handlers = Object.fromEntries(
        vi.mocked(ipcMain.handle).mock.calls.map(([ch, fn]) => [ch, fn])
      );

      const created = await handlers['tasks:create']({} as any, { title: 'Original' });
      const updated = await handlers['tasks:update']({} as any, created.id, { title: 'Changed' });
      expect(updated.title).toBe('Changed');
    });

    it('tasks:delete soft-deletes a task', async () => {
      registerHandlers(testDb.db);
      const handlers = Object.fromEntries(
        vi.mocked(ipcMain.handle).mock.calls.map(([ch, fn]) => [ch, fn])
      );

      const created = await handlers['tasks:create']({} as any, { title: 'To delete' });
      await handlers['tasks:delete']({} as any, created.id);

      const result = await handlers['tasks:get']({} as any, created.id);
      expect(result).toBeNull();

      // Still in DB (soft delete)
      const raw = testDb.getRawTask(created.id);
      expect(raw).toBeDefined();
      expect(raw!.deleted_at).not.toBeNull();
    });
  });

  describe('projects', () => {
    it('projects:list returns empty array initially', async () => {
      const handler = getHandler('projects:list');
      const result = await handler({} as any);
      expect(result).toEqual([]);
    });

    it('projects:create → projects:get round-trip', async () => {
      registerHandlers(testDb.db);
      const handlers = Object.fromEntries(
        vi.mocked(ipcMain.handle).mock.calls.map(([ch, fn]) => [ch, fn])
      );

      const created = await handlers['projects:create']({} as any, { title: 'My Project' });
      expect(created).toMatchObject({ title: 'My Project', status: 'active' });

      const fetched = await handlers['projects:get']({} as any, created.id);
      expect(fetched).toMatchObject({ title: 'My Project' });
    });

    it('projects:delete soft-deletes a project', async () => {
      registerHandlers(testDb.db);
      const handlers = Object.fromEntries(
        vi.mocked(ipcMain.handle).mock.calls.map(([ch, fn]) => [ch, fn])
      );

      const created = await handlers['projects:create']({} as any, { title: 'Doomed' });
      await handlers['projects:delete']({} as any, created.id);

      const result = await handlers['projects:get']({} as any, created.id);
      expect(result).toBeNull();

      const raw = testDb.getRawProject(created.id);
      expect(raw!.deleted_at).not.toBeNull();
    });
  });

  describe('contexts', () => {
    it('contexts:list returns empty array initially', async () => {
      const handler = getHandler('contexts:list');
      const result = await handler({} as any);
      expect(result).toEqual([]);
    });

    it('contexts:create → contexts:get round-trip', async () => {
      registerHandlers(testDb.db);
      const handlers = Object.fromEntries(
        vi.mocked(ipcMain.handle).mock.calls.map(([ch, fn]) => [ch, fn])
      );

      const created = await handlers['contexts:create']({} as any, { name: 'Work' });
      expect(created).toMatchObject({ name: 'Work' });

      const fetched = await handlers['contexts:get']({} as any, created.id);
      expect(fetched).toMatchObject({ name: 'Work' });
    });

    it('contexts:delete soft-deletes a context', async () => {
      registerHandlers(testDb.db);
      const handlers = Object.fromEntries(
        vi.mocked(ipcMain.handle).mock.calls.map(([ch, fn]) => [ch, fn])
      );

      const created = await handlers['contexts:create']({} as any, { name: 'Temp' });
      await handlers['contexts:delete']({} as any, created.id);

      const result = await handlers['contexts:get']({} as any, created.id);
      expect(result).toBeNull();

      const raw = testDb.getRawContext(created.id);
      expect(raw!.deleted_at).not.toBeNull();
    });
  });
});
