# Project System

Projects are active areas of work — buckets for organizing related tasks and focus. They represent what you're working on at a meta level, not just task containers.

## Status Flow

```
┌──────────┐
│  PLANNED │  ← Defined but not yet started
└────┬─────┘
     │ Start working
     ▼
┌──────────┐     ┌──────────┐     ┌──────────┐
│  ACTIVE  │ ←──►│ ON HOLD  │ ←──►│ BLOCKED  │
└────┬─────┘     └──────────┘     └──────────┘
     │              (paused)        (waiting)
     │
     ├─────────────────┐
     ▼                 ▼
┌──────────┐    ┌──────────┐
│ COMPLETED│    │ ARCHIVED │
└──────────┘    └──────────┘
  (done)         (abandoned)
```

| Status | Meaning | View |
|--------|---------|------|
| `planned` | Defined, not yet started | Active Projects |
| `active` | In-progress work | Active Projects |
| `on_hold` | Intentionally paused | Active Projects |
| `blocked` | Waiting on external dependency | Active Projects |
| `completed` | Successfully finished | Completed Projects |
| `archived` | Abandoned or no longer relevant | Archived Projects |

## Completion Rules (Opinionated)

**Marking a project complete requires all tasks to be resolved first.**

- All tasks must be in `logbook` (completed) or `cancelled`
- OR tasks must be re-triaged out of the project (moved elsewhere or to inbox)
- No orphaned incomplete tasks allowed

This forces intentionality. You can't "complete" a project and leave loose ends.

**Project completion is independent of task completion:**

- All tasks done ≠ project automatically complete
- User explicitly marks project as complete
- Project may have phases, follow-up work, etc.

## Staleness Detection

Projects can go stale, just like tasks.

**Trigger:** No changes to project or its tasks in X days (configurable, default 14?)

**Behavior:**

- Surface in "Stale Projects" section/indicator
- User must actively decide: continue, archive, or re-engage
- Touching any task in project resets staleness clock

## Project Fields

| Field | Required | Notes |
|-------|----------|-------|
| `title` | Yes | Project name |
| `description` | No | Plain text, shown in detail view |
| `status` | Yes | `planned`, `active`, `on_hold`, `blocked`, `completed`, `archived` |
| `context_id` | No | Links to a context |
| `priority` | No | P0, P1, P2, P3 (for sorting/filtering) |
| `deadline` | No | Target completion date (for sorting/filtering) |
| `created_at` | Yes | For sorting |
| `updated_at` | Yes | For staleness detection |

## Context Inheritance (Hard Rule)

Tasks inherit context from their project.

```typescript
function getEffectiveContext(task: Task, project: Project | null): string | null {
  return project?.context_id ?? task.context_id;
}
```

When a task joins a project → adopts project's context.
When a task leaves a project → retains context (now explicit on task).

## Views

### ProjectsOverviewView (Active)

- Card grid of projects where `status` in (`planned`, `active`, `on_hold`, `blocked`)
- Each card shows: title, status badge, task count (incomplete), context badge, staleness indicator
- Sorting/filtering by: status, priority, deadline, created date, staleness
- Inline project creation (like tasks)
- Empty state with create CTA

### CompletedProjectsView

- Card grid of `status = 'completed'`
- Read-only archive, can reopen (set back to active)

### ArchivedProjectsView

- Card grid of `status = 'archived'`
- Can restore to active or delete permanently

### ProjectDetailView

- Header: title (inline editable), description (inline editable), status selector, context, priority, deadline
- Body: task list filtered by `project_id`
- Inline task creation (auto-assigns to project, inherits context)
- Actions: complete project (with validation), archive, change status

## Task Integration

### Assigning tasks to projects

- TaskDetail shows project picker
- Selecting project sets `task.project_id`
- Task inherits project's context (reflected in UI)

### Creating tasks within project

- From ProjectDetailView, new tasks auto-assign to that project
- Inherit project's context automatically
- Default to `inbox` status (user triages from there)

## Sidebar

- Single "Projects" item
- Navigates to ProjectsOverviewView
- Badge: count of active projects (optional, TBD)
