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

  getTasksByStatus: (status: string) => Task[];
  getTasksByProject: (projectId: string) => Task[];
  getInboxTasks: () => Task[];
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
    } catch {
      set({ tasksError: 'Failed to fetch tasks', tasksLoading: false });
    }
  },

  createTask: async (input) => {
    const task = await window.cortex.tasks.create(input) as Task;
    set((state) => ({ tasks: [...state.tasks, task] }));
    return task;
  },

  updateTask: async (id, input) => {
    const task = await window.cortex.tasks.update(id, input) as Task;
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? task : t)),
    }));
    return task;
  },

  deleteTask: async (id) => {
    await window.cortex.tasks.delete(id);
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    }));
  },

  getTasksByStatus: (status) => get().tasks.filter((t) => t.status === status),
  getTasksByProject: (projectId) => get().tasks.filter((t) => t.project_id === projectId),
  getInboxTasks: () => get().tasks.filter((t) => t.status === 'inbox'),
});
