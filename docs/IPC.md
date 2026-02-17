# IPC & Security

Electron's main/renderer process model and secure communication.

## Security Model

```
┌─────────────────────────────────────────┐
│              RENDERER                    │
│   (sandboxed, no Node, no fs access)    │
│                                          │
│   React App  ←→  window.cortex (API)    │
└──────────────────┬───────────────────────┘
                   │
                   │ contextBridge (typed, validated)
                   │
                   ▼
┌─────────────────────────────────────────┐
│             MAIN PROCESS                 │
│    (full Node access, SQLite, fs)       │
│                                          │
│   IPC Handlers → Services → Database    │
└─────────────────────────────────────────┘
```

**Principles:**
- Renderer is fully sandboxed (no `nodeIntegration`)
- All data access goes through IPC
- Validation at IPC boundary (Zod schemas)
- Main process owns the database

## Preload Bridge

```typescript
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';

const api = {
  tasks: {
    list: () => ipcRenderer.invoke('tasks:list'),
    create: (input: CreateTaskInput) => 
      ipcRenderer.invoke('tasks:create', input),
    update: (id: string, input: UpdateTaskInput) => 
      ipcRenderer.invoke('tasks:update', id, input),
    delete: (id: string) => 
      ipcRenderer.invoke('tasks:delete', id),
  },
  
  projects: {
    list: () => ipcRenderer.invoke('projects:list'),
    create: (input: CreateProjectInput) => 
      ipcRenderer.invoke('projects:create', input),
    // ...
  },
  
  contexts: { /* ... */ },
  notes: { /* ... */ },
  meetings: { /* ... */ },
  stakeholders: { /* ... */ },
  dailyNotes: { /* ... */ },
  
  system: {
    exportData: () => ipcRenderer.invoke('system:export'),
    importData: (path: string) => ipcRenderer.invoke('system:import', path),
    getSettings: () => ipcRenderer.invoke('system:settings:get'),
    setSettings: (settings: Settings) => ipcRenderer.invoke('system:settings:set', settings),
  },
};

contextBridge.exposeInMainWorld('cortex', api);
```

## Type Declaration

```typescript
// src/shared/api.d.ts
declare global {
  interface Window {
    cortex: {
      tasks: {
        list(): Promise<Task[]>;
        create(input: CreateTaskInput): Promise<Task>;
        update(id: string, input: UpdateTaskInput): Promise<Task>;
        delete(id: string): Promise<void>;
      };
      projects: { /* ... */ };
      // ...
    };
  }
}
```

## IPC Handlers

```typescript
// src/main/ipc/tasks.ts
import { ipcMain } from 'electron';
import { taskService } from '../services/task.service';
import { createTaskSchema, updateTaskSchema } from '../../shared/validation';

export function registerTaskHandlers() {
  ipcMain.handle('tasks:list', async () => {
    return taskService.list();
  });

  ipcMain.handle('tasks:create', async (_, input) => {
    const validated = createTaskSchema.parse(input); // Zod validation
    return taskService.create(validated);
  });

  ipcMain.handle('tasks:update', async (_, id: string, input) => {
    const validated = updateTaskSchema.parse(input);
    return taskService.update(id, validated);
  });

  ipcMain.handle('tasks:delete', async (_, id: string) => {
    return taskService.delete(id);
  });
}
```

## Handler Registration

```typescript
// src/main/ipc/index.ts
import { registerTaskHandlers } from './tasks';
import { registerProjectHandlers } from './projects';
import { registerContextHandlers } from './contexts';
// ...

export function registerAllHandlers() {
  registerTaskHandlers();
  registerProjectHandlers();
  registerContextHandlers();
  // ...
}
```

## Validation Schemas

```typescript
// src/shared/validation.ts
import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  notes: z.string().optional(),
  status: z.enum(['inbox', 'today', 'upcoming', 'anytime', 'someday']).default('inbox'),
  when_date: z.string().datetime().optional(),
  deadline: z.string().datetime().optional(),
  project_id: z.string().uuid().optional(),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
});

export const updateTaskSchema = createTaskSchema.partial();
```

## Error Handling

```typescript
// Wrap handlers with error handling
ipcMain.handle('tasks:create', async (_, input) => {
  try {
    const validated = createTaskSchema.parse(input);
    return { success: true, data: await taskService.create(validated) };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Validation failed', details: error.errors };
    }
    return { success: false, error: 'Internal error' };
  }
});
```
