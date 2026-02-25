import { StateCreator } from 'zustand';
import type { Task, CreateTaskInput, UpdateTaskInput } from '../../shared/types';

export interface TaskSlice {
  tasks: Task[];
  tasksLoading: boolean;
  tasksError: string | null;

  fetchTasks: () => Promise<void>;
  createTask: (input: CreateTaskInput) => Promise<Task>;
  updateTask: (id: string, input: UpdateTaskInput) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;

  trashedTasks: Task[];
  fetchTrashedTasks: () => Promise<void>;
  restoreTask: (id: string) => Promise<void>;
  emptyTrash: () => Promise<void>;
}

export const createTaskSlice: StateCreator<TaskSlice> = (set, get) => ({
  tasks: [],
  tasksLoading: false,
  tasksError: null,

  fetchTasks: async () => {
    set({ tasksLoading: true, tasksError: null });
    try {
      const tasks = await window.cortex.tasks.list() as Task[];
      set({ tasks, tasksLoading: false });
    } catch (err) {
      console.error('[TaskSlice] fetchTasks failed:', err);
      set({ tasksError: err instanceof Error ? err.message : 'Unknown error', tasksLoading: false });
    }
  },

  createTask: async (input) => {
    try {
      const task = await window.cortex.tasks.create(input) as Task;
      set((state) => ({ tasks: [...state.tasks, task] }));
      return task;
    } catch (err) {
      console.error('[TaskSlice] createTask failed:', err);
      set({ tasksError: err instanceof Error ? err.message : 'Unknown error' });
      return null as unknown as Task;
    }
  },

  updateTask: async (id, input) => {
    try {
      const task = await window.cortex.tasks.update(id, input) as Task;
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? task : t)),
      }));
      return task;
    } catch (err) {
      console.error('[TaskSlice] updateTask failed:', err);
      set({ tasksError: err instanceof Error ? err.message : 'Unknown error' });
      return null as unknown as Task;
    }
  },

  deleteTask: async (id) => {
    const task = get().tasks.find((t) => t.id === id);
    try {
      await window.cortex.tasks.delete(id);
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
        trashedTasks: task
          ? [...state.trashedTasks, { ...task, deleted_at: new Date().toISOString() }]
          : state.trashedTasks,
      }));
    } catch (err) {
      console.error('[TaskSlice] deleteTask failed:', err);
      set({ tasksError: err instanceof Error ? err.message : 'Unknown error' });
    }
  },

  trashedTasks: [],

  fetchTrashedTasks: async () => {
    try {
      const trashedTasks = await window.cortex.tasks.listTrashed() as Task[];
      set({ trashedTasks });
    } catch (err) {
      console.error('[TaskSlice] fetchTrashedTasks failed:', err);
      set({ tasksError: err instanceof Error ? err.message : 'Unknown error' });
    }
  },

  restoreTask: async (id) => {
    try {
      const restored = await window.cortex.tasks.restore(id) as Task;
      set((state) => ({
        trashedTasks: state.trashedTasks.filter((t) => t.id !== id),
        tasks: [...state.tasks, restored],
      }));
    } catch (err) {
      console.error('[TaskSlice] restoreTask failed:', err);
      set({ tasksError: err instanceof Error ? err.message : 'Unknown error' });
    }
  },

  emptyTrash: async () => {
    try {
      await window.cortex.tasks.emptyTrash();
      set({ trashedTasks: [] });
    } catch (err) {
      console.error('[TaskSlice] emptyTrash failed:', err);
      set({ tasksError: err instanceof Error ? err.message : 'Unknown error' });
    }
  },
});
