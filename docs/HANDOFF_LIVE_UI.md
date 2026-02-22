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

**Use Option 1** (PowerSync React hooks) — the proper solution:

- True reactive queries at component level
- Only affected components re-render (efficient)
- Built into PowerSync, battle-tested
- No manual refresh logic needed

This requires refactoring components to use `useQuery` instead of fetching from Zustand stores, but it's the right architecture for a local-first app.

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

## Migration Strategy

1. **Add PowerSync React provider** to App.tsx
2. **Start with high-traffic views:** TaskList, Today view, Inbox
3. **Replace store fetches with `useQuery`** in components
4. **Keep Zustand for UI state** (selected task, filters, etc.) — just not for data
5. **Test sync scenarios:** create from app, create from AI, update, delete

Example migration:

```typescript
// Before: Zustand store
function TodayView() {
  const { tasks, fetchTasks } = useTasksStore();
  useEffect(() => { fetchTasks('today'); }, []);
  return <TaskList tasks={tasks} />;
}

// After: PowerSync hook
function TodayView() {
  const { data: tasks } = useQuery(
    `SELECT * FROM tasks 
     WHERE status = 'today' AND deleted_at IS NULL 
     ORDER BY sort_order`
  );
  return <TaskList tasks={tasks} />;
}
```

## Success Criteria

1. Create task in Cortex → appears immediately
2. AI creates task via daemon → appears without reload
3. Delete task → disappears immediately
4. Status changes sync live
5. No Cmd+R needed ever
