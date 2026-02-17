# State Management

Zustand stores for reactive state with IPC integration.

## Store Structure

```
stores/
├── index.ts          # Combined store export
├── tasks.ts          # Task store slice
├── projects.ts       # Project store slice
├── contexts.ts       # Context store slice
├── notes.ts          # Notes store slice
├── meetings.ts       # Meetings store slice
├── stakeholders.ts   # Stakeholders store slice
├── dailyNotes.ts     # Daily notes store slice
└── ui.ts             # UI state (sidebar, modals, etc.)
```

## Store Pattern

```typescript
// src/renderer/stores/tasks.ts
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

  // Derived getters
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
      const tasks = await window.cortex.tasks.list();
      set({ tasks, tasksLoading: false });
    } catch (error) {
      set({ tasksError: 'Failed to fetch tasks', tasksLoading: false });
    }
  },

  createTask: async (input) => {
    const task = await window.cortex.tasks.create(input);
    set((state) => ({ tasks: [...state.tasks, task] }));
    return task;
  },

  updateTask: async (id, input) => {
    const task = await window.cortex.tasks.update(id, input);
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

  // Derived
  getTasksByStatus: (status) => get().tasks.filter((t) => t.status === status),
  getTasksByProject: (projectId) => get().tasks.filter((t) => t.project_id === projectId),
  getInboxTasks: () => get().tasks.filter((t) => t.status === 'inbox'),
});
```

## Combined Store

```typescript
// src/renderer/stores/index.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { createTaskSlice, TaskSlice } from './tasks';
import { createProjectSlice, ProjectSlice } from './projects';
import { createContextSlice, ContextSlice } from './contexts';
import { createUISlice, UISlice } from './ui';

type StoreState = TaskSlice & ProjectSlice & ContextSlice & UISlice;

export const useStore = create<StoreState>()(
  devtools(
    persist(
      (...a) => ({
        ...createTaskSlice(...a),
        ...createProjectSlice(...a),
        ...createContextSlice(...a),
        ...createUISlice(...a),
      }),
      {
        name: 'cortex-store',
        partialize: (state) => ({
          // Only persist UI state, not data (data comes from SQLite)
          activeContextId: state.activeContextId,
          sidebarCollapsed: state.sidebarCollapsed,
        }),
      }
    )
  )
);
```

## UI State

```typescript
// src/renderer/stores/ui.ts
export interface UISlice {
  // Context filter
  activeContextId: string | null;
  setActiveContext: (id: string | null) => void;

  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Quick capture
  quickCaptureOpen: boolean;
  openQuickCapture: () => void;
  closeQuickCapture: () => void;

  // Modal state
  activeModal: string | null;
  modalData: unknown;
  openModal: (modal: string, data?: unknown) => void;
  closeModal: () => void;
}

export const createUISlice: StateCreator<UISlice> = (set) => ({
  activeContextId: null,
  setActiveContext: (id) => set({ activeContextId: id }),

  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  quickCaptureOpen: false,
  openQuickCapture: () => set({ quickCaptureOpen: true }),
  closeQuickCapture: () => set({ quickCaptureOpen: false }),

  activeModal: null,
  modalData: null,
  openModal: (modal, data) => set({ activeModal: modal, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),
});
```

## Usage in Components

```typescript
// In a component
import { useStore } from '../stores';

function TaskList() {
  const tasks = useStore((s) => s.tasks);
  const activeContextId = useStore((s) => s.activeContextId);
  const fetchTasks = useStore((s) => s.fetchTasks);

  useEffect(() => {
    fetchTasks();
  }, []);

  const visibleTasks = useMemo(() => {
    const inbox = tasks.filter((t) => t.status === 'inbox');
    const rest = tasks.filter((t) => t.status !== 'inbox');
    const filtered = activeContextId
      ? rest.filter((t) => t.context_id === activeContextId)
      : rest;
    return [...inbox, ...filtered];
  }, [tasks, activeContextId]);

  return (/* ... */);
}
```

## Selectors

For performance, use selectors to avoid unnecessary re-renders:

```typescript
// Memoized selectors
const selectTasks = (state: StoreState) => state.tasks;
const selectActiveContext = (state: StoreState) => state.activeContextId;

// In component
const tasks = useStore(selectTasks);
```
