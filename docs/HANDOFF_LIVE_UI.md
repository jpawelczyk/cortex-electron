# Handoff: Live UI Updates

## Problem

When data syncs (e.g., AI creates a task), the UI doesn't update until user manually reloads (Cmd+R).

## Solution

Use PowerSync's reactive queries instead of one-shot fetches.

## Implementation

### Option 1: PowerSync React Hooks (Recommended)

PowerSync provides React hooks that automatically re-render when data changes:

```typescript
// Before: one-shot fetch
const tasks = await db.getAll('SELECT * FROM tasks WHERE status = ?', ['today']);

// After: reactive query
import { useQuery } from '@powersync/react';

function TaskList() {
  const { data: tasks } = useQuery(
    'SELECT * FROM tasks WHERE status = ? AND deleted_at IS NULL',
    ['today']
  );
  
  return (
    <ul>
      {tasks.map(task => <TaskItem key={task.id} task={task} />)}
    </ul>
  );
}
```

### Option 2: Watch API with Zustand

If you need to keep Zustand stores:

```typescript
// In store initialization
import { useDatabase } from '../hooks/useDatabase';

export const useTasksStore = create((set, get) => ({
  tasks: [],
  
  subscribe: () => {
    const db = useDatabase();
    
    // Watch returns a disposer function
    const dispose = db.watch(
      'SELECT * FROM tasks WHERE deleted_at IS NULL',
      [],
      {
        onResult: (results) => {
          set({ tasks: results.rows?._array || [] });
        },
      }
    );
    
    return dispose;
  },
}));

// In component
useEffect(() => {
  const dispose = useTasksStore.getState().subscribe();
  return dispose;
}, []);
```

### Option 3: Global Sync Listener (Quick Fix)

Listen for any sync changes and refresh all stores:

```typescript
// In App.tsx or a provider
useEffect(() => {
  const db = useDatabase();
  
  const dispose = db.registerListener({
    tablesUpdated: (update) => {
      // Refresh affected stores
      if (update.tables.includes('tasks')) {
        useTasksStore.getState().fetchTasks();
      }
      if (update.tables.includes('projects')) {
        useProjectsStore.getState().fetchProjects();
      }
      // etc.
    },
  });
  
  return dispose;
}, []);
```

## Files to Modify

- `src/renderer/stores/tasks.ts` — Add reactive queries or watch
- `src/renderer/stores/projects.ts` — Same
- `src/renderer/stores/notes.ts` — Same
- `src/renderer/App.tsx` — Add global sync listener (option 3)

## Recommendation

**Start with Option 3** (global sync listener) — quickest to implement, refreshes stores when tables change.

Then migrate to **Option 1** (PowerSync hooks) for components that need real-time updates without full store refreshes.

## PowerSync React Setup

Make sure you have the React integration:

```bash
npm install @powersync/react
```

Wrap app with provider:

```typescript
// In App.tsx
import { PowerSyncContext } from '@powersync/react';

function App() {
  const db = useDatabase();
  
  return (
    <PowerSyncContext.Provider value={db}>
      {/* app content */}
    </PowerSyncContext.Provider>
  );
}
```

## Success Criteria

1. Create task in Cortex → appears immediately
2. AI creates task via daemon → appears without reload
3. Delete task → disappears immediately
4. Status changes sync live
