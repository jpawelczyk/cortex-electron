# Context System

Contexts are global filters that let you focus on specific areas of life. They apply across all primitives — tasks, projects, notes, meetings.

## Concept

Contexts represent distinct domains: Work, Personal, Research, etc. They're not hierarchical — they're parallel buckets. Selecting a context filters the entire app to show only items belonging to that context.

## UI: Context Selector

**Location:** Header bar, top right, to the left of Search and Add buttons.

**Always visible.** Not hidden in a dropdown.

**Design:** Toggle buttons with color dot + icon + label:
```
( ● 🔬 Research ) ( ● 🏢 Work ) ( ● 🏠 Personal )
```

- Colored dot indicates context color
- Icon (emoji or lucide icon) for quick recognition
- Label text

**Selection behavior:**
- Click to toggle on/off
- Multiple contexts can be active simultaneously
- All contexts selected = no filter (show everything)
- Single context selected = filter to that context
- No contexts selected = show everything (same as all)

**Default state:** All contexts active (no filtering).

## Default Contexts

Three starter contexts (user can modify/delete):

| Name | Color | Icon |
|------|-------|------|
| Work | Orange | 🏢 (or `Briefcase`) |
| Personal | Green | 🏠 (or `Home`) |
| Research | Cyan | 🔬 (or `FlaskConical`) |

## Context Fields

| Field | Required | Notes |
|-------|----------|-------|
| `id` | Yes | UUID |
| `name` | Yes | Display name |
| `color` | Yes | Hex color for dot |
| `icon` | No | Emoji or icon name |
| `sort_order` | No | Manual ordering in selector |
| `created_at` | Yes | Timestamp |
| `updated_at` | Yes | Timestamp |
| `deleted_at` | No | Soft delete |

## Filtering Behavior

When context(s) are active:

- **Tasks:** Show only tasks where `context_id` matches active contexts (or task's project's `context_id`)
- **Projects:** Show only projects where `context_id` matches active contexts
- **Notes:** Show only notes where `context_id` matches
- **Meetings:** Show only meetings where `context_id` matches
- **Inbox:** Filtered by active context (same as other views)

**Null context items:** Items with `context_id = null` are shown when:
- All contexts are active (no filter)
- Or optionally: always show orphaned items (TBD)

## Context Inheritance (reminder)

Tasks inherit context from their project. This is a hard rule (see PROJECTS.md).

```typescript
function getEffectiveContext(task: Task, project: Project | null): string | null {
  return project?.context_id ?? task.context_id;
}
```

## Context Management

### Creating contexts

- Settings/preferences area (or dedicated Contexts view)
- Name + color picker + optional icon
- No limit on number of contexts

### Editing contexts

- Change name, color, icon
- Changes reflect immediately across app

### Deleting contexts

**Orphan items on delete:**
- Set `context_id = null` for all items in that context
- Items become "uncontexted" — visible when no filter active
- No cascade delete of items

**Confirmation:** Warn user that X projects, Y tasks, Z notes will be orphaned.

## Views

### Context Selector (Header Component)

- Horizontal row of toggle buttons
- Each button: colored dot + icon + name
- Active state: highlighted/filled
- Inactive state: muted/outlined
- Clicking toggles that context's filter state

### Context Settings (TBD)

- List of contexts with edit/delete actions
- Create new context
- Reorder contexts
- Color picker, icon picker

## Store

```typescript
interface ContextSlice {
  contexts: Context[];
  activeContextIds: string[]; // Empty array = all/no filter
  
  fetchContexts: () => Promise<void>;
  createContext: (input: CreateContextInput) => Promise<Context>;
  updateContext: (id: string, input: UpdateContextInput) => Promise<Context>;
  deleteContext: (id: string) => Promise<void>;
  
  toggleContext: (id: string) => void; // Toggle single context
  setActiveContexts: (ids: string[]) => void; // Set multiple
  clearContextFilter: () => void; // Reset to all
}
```

## Implementation Order

1. **Context store** — CRUD + active context state
2. **Context selector component** — toggle buttons in header
3. **Filtering logic** — all views respect active contexts
4. **Context assignment** — add context picker to ProjectDetailView (tasks inherit)
5. **Context management UI** — create/edit/delete contexts (settings or dedicated view)
