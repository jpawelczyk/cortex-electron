# Task System

Things-inspired task management with clear status flows and date semantics.

## Status Flow

```
                    ┌──────────────┐
                    │    INBOX     │  ← Quick capture, no context
                    └──────┬───────┘
                           │ Triage
              ┌────────────┼────────────┐
              ▼            ▼            ▼
       ┌──────────┐ ┌──────────┐ ┌──────────┐
       │  TODAY   │ │ UPCOMING │ │ SOMEDAY  │
       └────┬─────┘ └────┬─────┘ └──────────┘
            │            │              │
            │      (when_date arrives)  │
            │            │              │
            ▼            ▼              │
       ┌─────────────────────┐          │
       │      ANYTIME        │ ◄────────┘
       └──────────┬──────────┘   (pull back)
                  │
                  │ Complete
                  ▼
           ┌──────────┐
           │ LOGBOOK  │  (archive)
           └──────────┘
```

## Status Definitions

| Status | Meaning | `when_date` | View |
|--------|---------|-------------|------|
| `inbox` | Uncategorized, needs triage | ignored | Inbox (always visible) |
| `today` | Doing today (manual) | optional | Today |
| `upcoming` | Scheduled for future | required | Upcoming (by date) |
| `anytime` | Available, no schedule | null | Anytime |
| `someday` | Deferred, maybe later | null | Someday |
| `logbook` | Completed | n/a | Logbook |
| `cancelled` | Won't do | n/a | Hidden |

## When vs Deadline

Two distinct date concepts (Things' key insight):

| Field | Meaning | Example |
|-------|---------|---------|
| `when_date` | "I plan to work on this day" | Schedule for Tuesday |
| `deadline` | "Must be done by this date" | Due Friday |

**Valid combinations:**
- Neither → Anytime task
- Only `when_date` → Scheduled, no hard deadline
- Only `deadline` → Due date, work whenever
- Both → Scheduled start + hard deadline

## Context Inheritance

Tasks inherit context from their project (hard rule):

```typescript
function getTaskContext(task: Task, project: Project | null): string | null {
  if (project) {
    return project.context_id; // Hard inheritance
  }
  return task.context_id; // Standalone task
}
```

**Rules:**
- Task in project → Always has project's context
- Standalone task → User-assigned context (or null)
- Inbox task → No context until triaged

## Inbox Behavior

- **Always visible** regardless of active context filter
- **Context-free** — no context assigned
- **Triage destination** — process to assign context + project

```typescript
function getVisibleTasks(tasks: Task[], activeContextId: string | null): Task[] {
  const inbox = tasks.filter(t => t.status === 'inbox');
  const rest = tasks.filter(t => t.status !== 'inbox');
  const filtered = activeContextId 
    ? rest.filter(t => t.context_id === activeContextId)
    : rest;
  return [...inbox, ...filtered]; // Inbox always first
}
```

## Checklists (Subtasks)

Tasks can have checklists for breaking down work:

```typescript
interface ChecklistItem {
  id: string;
  task_id: string;
  title: string;
  is_done: boolean;
  sort_order: number;
}
```

- Ordered list within a task
- Toggle completion independently
- Don't affect parent task status (manual completion)

## Priority Levels

| Priority | Meaning | Color |
|----------|---------|-------|
| `P0` | Critical/urgent | Red |
| `P1` | High priority | Orange |
| `P2` | Normal | Yellow |
| `P3` | Low priority | Blue |
| `null` | No priority | Gray |

Priority is optional — not every task needs one.
