# Notes System

Notes are markdown documents for capturing thoughts, ideas, and reference material. They can be standalone or linked to projects and contexts.

## Note Fields

| Field | Required | Notes |
|-------|----------|-------|
| `id` | Yes | UUID |
| `title` | Yes | Note title |
| `content` | No | Markdown content |
| `context_id` | No | Links to context |
| `project_id` | No | Links to project |
| `is_pinned` | No | Pin to top of list (default false) |
| `created_at` | Yes | Timestamp |
| `updated_at` | Yes | Timestamp |
| `deleted_at` | No | Soft delete |

## Context Behavior

Unlike tasks, notes do **not** inherit context from projects. Notes have explicit context assignment (or none). This allows notes to exist independently or span multiple areas.

## Markdown

All note content is stored and rendered as Markdown. Supported features:

- Headings (`#`, `##`, `###`)
- Bold, italic, strikethrough
- Lists (ordered and unordered)
- Code blocks and inline code
- Links and images
- Blockquotes
- Tables (GFM)
- Task lists (GFM)

## Views

### NotesOverviewView

List view of all notes (non-deleted).

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ Notes                               [Sort ▼]        │
├─────────────────────────────────────────────────────┤
│ + New note...                                       │
├─────────────────────────────────────────────────────┤
│ 📌 Pinned Note Title              Updated 2h ago   │
│    First line of content preview...                 │
├─────────────────────────────────────────────────────┤
│ Regular Note Title                Updated yesterday │
│    First line preview...                            │
└─────────────────────────────────────────────────────┘
```

**Features:**
- List rows with title, content preview (~100 chars, markdown stripped), updated time
- Pinned notes always at top with pin indicator
- Context badge if note has context
- Project badge if note has project
- Click note → NoteDetailView
- Inline creation at top
- Respects active context filter
- Sort options: Recently updated (default), Recently created, Title A-Z

**Empty state:** "No notes yet" with create CTA

### NoteDetailView

Full markdown editor for a single note.

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ ← Notes                              [Pin] [Delete] │
├─────────────────────────────────────────────────────┤
│ Note Title (editable)                               │
│ [Context: ● Work ▼]  [Project: Cortex ▼]           │
├─────────────────────────────────────────────────────┤
│                                                     │
│   # Heading                                         │
│                                                     │
│   Some **bold** text here with inline rendering.   │
│   - List item one                                   │
│   - List item two                                   │
│                                                     │
│   ```code block```                                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Features:**
- Back button → NotesOverviewView
- Title: inline editable (debounced auto-save)
- Context picker (optional)
- Project picker (optional)
- Pin toggle button
- Delete button (two-step confirmation)
- Milkdown WYSIWYG editor (markdown rendered inline)
- Auto-save on content change (debounced 500ms)

## Editor

**Milkdown WYSIWYG**

Use Milkdown for inline markdown editing (like Notion/Obsidian):
- Single editor surface with inline formatting
- Markdown rendered as you type
- No split view needed — what you see is what you get
- Supports all GFM features

**Packages:**
- `@milkdown/core`
- `@milkdown/ctx`
- `@milkdown/preset-commonmark`
- `@milkdown/preset-gfm`
- `@milkdown/theme-nord` (base theme, customize to match app)
- `@milkdown/react`
- `@milkdown/plugin-listener` (for onChange events)

**Styling:** Customize nord theme to match Cortex dark theme (colors, fonts, spacing).

## Sidebar

- Single "Notes" item
- Icon: `FileText` from lucide-react
- Position: below Projects
- Click → NotesOverviewView
- Badge: total note count (optional)

## Filtering

Notes respect the global context filter:
- All contexts active → show all notes
- Specific context(s) active → show only notes with matching `context_id`
- Notes with `context_id = null` → shown only when no filter active

## Search (Future)

Full-text search across note titles and content. Defer to future iteration.

## Linking (Future)

Wiki-style `[[note title]]` linking between notes. Defer to future iteration.
