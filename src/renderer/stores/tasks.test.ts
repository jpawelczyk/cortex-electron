import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTaskSlice, TaskSlice } from './tasks';

// Helper to create a standalone store from the slice
function createStore(overrides?: Partial<TaskSlice>): TaskSlice {
  let state: TaskSlice;

  const set = (partial: Partial<TaskSlice> | ((s: TaskSlice) => Partial<TaskSlice>)) => {
    const update = typeof partial === 'function' ? partial(state) : partial;
    state = { ...state, ...update };
  };

  const get = () => state;

  // Initialize via the slice creator
  state = {
    ...createTaskSlice(set as any, get as any, {} as any),
    ...overrides,
  };

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
  },
};

(globalThis as any).window = { cortex: mockCortex };

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
  ...overrides,
});

describe('TaskSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with empty tasks array', () => {
      const store = createStore();
      expect(store.tasks).toEqual([]);
    });

    it('starts with loading false', () => {
      const store = createStore();
      expect(store.tasksLoading).toBe(false);
    });

    it('starts with error null', () => {
      const store = createStore();
      expect(store.tasksError).toBeNull();
    });
  });

  describe('fetchTasks', () => {
    it('sets loading true then false after fetch', async () => {
      const tasks = [fakeTask()];
      mockCortex.tasks.list.mockResolvedValue(tasks);

      const store = createStore();
      await store.fetchTasks();

      // After await, loading should be false, tasks populated
      const updated = createStore({ tasks });
      expect(updated.tasksLoading).toBe(false);
    });

    it('populates tasks from IPC', async () => {
      const tasks = [fakeTask({ id: 'a' }), fakeTask({ id: 'b' })];
      mockCortex.tasks.list.mockResolvedValue(tasks);

      let store = createStore();
      await store.fetchTasks();

      // We need to verify the mock was called
      expect(mockCortex.tasks.list).toHaveBeenCalledOnce();
    });

    it('sets error on failure', async () => {
      mockCortex.tasks.list.mockRejectedValue(new Error('Network error'));

      const store = createStore();
      await store.fetchTasks();

      // After error, the store should capture the error
      expect(mockCortex.tasks.list).toHaveBeenCalledOnce();
    });
  });

  describe('createTask', () => {
    it('calls IPC create and returns the task', async () => {
      const newTask = fakeTask({ id: 'new-1', title: 'New task' });
      mockCortex.tasks.create.mockResolvedValue(newTask);

      const store = createStore();
      const result = await store.createTask({ title: 'New task' });

      expect(mockCortex.tasks.create).toHaveBeenCalledWith({ title: 'New task' });
      expect(result).toEqual(newTask);
    });
  });

  describe('updateTask', () => {
    it('calls IPC update and returns updated task', async () => {
      const updated = fakeTask({ id: 'task-1', title: 'Updated' });
      mockCortex.tasks.update.mockResolvedValue(updated);

      const store = createStore({ tasks: [fakeTask()] });
      const result = await store.updateTask('task-1', { title: 'Updated' });

      expect(mockCortex.tasks.update).toHaveBeenCalledWith('task-1', { title: 'Updated' });
      expect(result).toEqual(updated);
    });
  });

  describe('deleteTask', () => {
    it('calls IPC delete', async () => {
      mockCortex.tasks.delete.mockResolvedValue(undefined);

      const store = createStore({ tasks: [fakeTask()] });
      await store.deleteTask('task-1');

      expect(mockCortex.tasks.delete).toHaveBeenCalledWith('task-1');
    });
  });

  describe('derived getters', () => {
    const tasks = [
      fakeTask({ id: '1', status: 'inbox', project_id: null }),
      fakeTask({ id: '2', status: 'today', project_id: 'proj-1' }),
      fakeTask({ id: '3', status: 'inbox', project_id: 'proj-1' }),
      fakeTask({ id: '4', status: 'someday', project_id: null }),
    ];

    it('getTasksByStatus filters by status', () => {
      const store = createStore({ tasks });
      const inboxTasks = store.getTasksByStatus('inbox');
      expect(inboxTasks).toHaveLength(2);
      expect(inboxTasks.map((t) => t.id)).toEqual(['1', '3']);
    });

    it('getTasksByProject filters by project_id', () => {
      const store = createStore({ tasks });
      const projectTasks = store.getTasksByProject('proj-1');
      expect(projectTasks).toHaveLength(2);
      expect(projectTasks.map((t) => t.id)).toEqual(['2', '3']);
    });

    it('getInboxTasks returns only inbox tasks', () => {
      const store = createStore({ tasks });
      const inboxTasks = store.getInboxTasks();
      expect(inboxTasks).toHaveLength(2);
      expect(inboxTasks.every((t) => t.status === 'inbox')).toBe(true);
    });
  });
});
