import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTaskSlice, TaskSlice } from './tasks';

type SetFn = (partial: Partial<TaskSlice> | ((s: TaskSlice) => Partial<TaskSlice>)) => void;
type GetFn = () => TaskSlice;

// Helper to create a standalone store from the slice
function createStore(overrides?: Partial<TaskSlice>): TaskSlice {
  const state = {} as TaskSlice;

  const set: SetFn = (partial) => {
    const update = typeof partial === 'function' ? partial(state) : partial;
    Object.assign(state, update);
  };

  const get: GetFn = () => state;

  // Initialize via the slice creator — cast to match Zustand's StateCreator signature
  const creator = createTaskSlice as unknown as (
    set: SetFn,
    get: GetFn,
    api: Record<string, never>,
  ) => TaskSlice;
  Object.assign(state, creator(set, get, {}), overrides);

  return state;
}

// Mock window.cortex
const mockCortex = {
  tasks: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    listTrashed: vi.fn(),
    restore: vi.fn(),
    emptyTrash: vi.fn(),
    purgeExpiredTrash: vi.fn(),
  },
};

(globalThis as unknown as Record<string, unknown>).window = { cortex: mockCortex };

const fakeTask = (overrides = {}) => ({
  id: 'task-1',
  title: 'Test task',
  notes: null,
  status: 'inbox' as const,
  when_date: null,
  deadline: null,
  project_id: null,
  heading_id: null,
  context_id: null,
  priority: null,
  sort_order: 0,
  created_at: '2026-02-17T00:00:00.000Z',
  updated_at: '2026-02-17T00:00:00.000Z',
  completed_at: null,
  deleted_at: null,
  stale_at: null,
  assignee_id: null,
  ...overrides,
});

describe('TaskSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchTasks', () => {
    it('sets error on failure', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockCortex.tasks.list.mockRejectedValue(new Error('Network error'));

      const store = createStore();
      await store.fetchTasks();

      expect(store.tasksError).toBe('Network error');
      spy.mockRestore();
    });
  });

  describe('createTask', () => {
    it('sets tasksError on failure', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockCortex.tasks.create.mockRejectedValue(new Error('create failed'));

      const store = createStore();
      await store.createTask({ title: 'New task' });

      expect(store.tasksError).toBe('create failed');
      spy.mockRestore();
    });
  });

  describe('updateTask', () => {
    it('sets tasksError on failure', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockCortex.tasks.update.mockRejectedValue(new Error('update failed'));

      const store = createStore({ tasks: [fakeTask()] });
      await store.updateTask('task-1', { title: 'Updated' });

      expect(store.tasksError).toBe('update failed');
      spy.mockRestore();
    });
  });

  describe('deleteTask', () => {
    it('sets tasksError on failure', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockCortex.tasks.delete.mockRejectedValue(new Error('delete failed'));

      const store = createStore({ tasks: [fakeTask()] });
      await store.deleteTask('task-1');

      expect(store.tasksError).toBe('delete failed');
      spy.mockRestore();
    });
  });

  describe('trash', () => {
    it('starts with empty trashedTasks array', () => {
      const store = createStore();
      expect(store.trashedTasks).toEqual([]);
    });

    it('fetchTrashedTasks sets tasksError on failure', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockCortex.tasks.listTrashed.mockRejectedValue(new Error('trash failed'));

      const store = createStore();
      await store.fetchTrashedTasks();

      expect(store.tasksError).toBe('trash failed');
      spy.mockRestore();
    });

    it('restoreTask sets tasksError on failure', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockCortex.tasks.restore.mockRejectedValue(new Error('restore failed'));

      const store = createStore({ trashedTasks: [fakeTask({ deleted_at: '2026-02-17T00:00:00.000Z' })] });
      await store.restoreTask('task-1');

      expect(store.tasksError).toBe('restore failed');
      spy.mockRestore();
    });

    it('emptyTrash sets tasksError on failure', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockCortex.tasks.emptyTrash.mockRejectedValue(new Error('empty failed'));

      const store = createStore({ trashedTasks: [fakeTask({ deleted_at: '2026-02-17T00:00:00.000Z' })] });
      await store.emptyTrash();

      expect(store.tasksError).toBe('empty failed');
      spy.mockRestore();
    });
  });

});
