# Architecture
Cortex is a local-first, privacy-focused personal operating system for managing your work – more focused than Notion, more powerful than Obsidian, AI-native but never AI-dependent, highly opinionated.
## Philosophy
### Core Principles

| Principle                   | Meaning                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------ |
| Local-first                 | Data lives on your machine – always. Works offline. Sync is optional, not required.                    |
| Privacy by architecture     | No telemetry, no cloud dependencies, no accounts. Your data never leaves unless you explicitly opt in. |
| Single-user                 | Optimized for one person’s workflow. Not a team tool.                                                  |
| Opinionated simplicity      | Few features, done well. No plugin sprawl.                                                             |
| Data portability            | SQLite + Markdown. You can leave anytime.                                                              |
| Fast & light                | Sub-100ms interactions. No spinners.                                                                   |
| AI-native, not AI-dependent | Designed for AI integration, but fully functional without it.                                          |
| Visual appeal               | Futuristic UI, but never form over function.                                                           |
### Anti-Goals
- Team collaboration
- Real-time multiplayer
- Plugin ecosystem
- File-based storage (we’re not Obsidian)
- Everything-app bloat (we're not Notion)
## Tech Stack

| Layer          | Technology                   | Rationale                                      |
| -------------- | ---------------------------- | ---------------------------------------------- |
| **Runtime**    | Electron                     | Cross-platform desktop, always-on, system tray |
| **Renderer**   | React 18+                    | Component model, ecosystem, familiarity        |
| **Build**      | Vite                         | Fast HMR, native ESM                           |
| **Database**   | SQLite (via better-sqlite3)  | Local, fast, portable, sync-ready              |
| **ORM/Query**  | Drizzle ORM                  | Type-safe, lightweight, SQLite-native          |
| **State**      | Zustand                      | Simple, fast, no boilerplate                   |
| **Styling**    | Tailwind CSS                 | Utility-first, design system friendly          |
| **Components** | shadcn/ui (Radix + Tailwind) | Accessible, copy-paste, customizable           |
| **Editor**     | Milkdown                     | Markdown-native, WYSIWYG                       |
| **Testing**    | Vitest + Playwright          | Unit + E2E, fast                               |
| **Packaging**  | electron-builder             | Cross-platform builds                          |
## Application Structure

```
cortex-electron/
├── docs/
│   ├── ARCHITECTURE.md      # This file
│   ├── DESIGN_SYSTEM.md     # Visual language
│   └── TESTING.md           # Test strategy
├── src/
│   ├── main/                # Electron main process
│   │   ├── index.ts         # Entry point
│   │   ├── database/        # SQLite setup, migrations
│   │   ├── ipc/             # IPC handlers
│   │   └── services/        # Business logic
│   ├── renderer/            # React app
│   │   ├── index.tsx        # Entry point
│   │   ├── components/      # UI components
│   │   ├── views/           # Page-level views
│   │   ├── stores/          # Zustand stores
│   │   ├── hooks/           # Custom hooks
│   │   └── lib/             # Utilities
│   ├── shared/              # Shared types, constants
│   │   ├── types.ts         # Entity types
│   │   ├── constants.ts     # Enums, config
│   │   └── validation.ts    # Zod schemas
│   └── preload/             # Electron preload scripts
│       └── index.ts         # Secure IPC bridge
├── migrations/              # SQLite migrations
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── CLAUDE.md                # AI agent instructions
├── package.json
├── tsconfig.json
├── vite.config.ts
└── electron-builder.yml
```
## Data Model
### Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐
│  Contexts   │       │ Stakeholders│
└──────┬──────┘       └──────┬──────┘
       │ 1                   │ M
       │                     │
       ▼ M                   ▼ M
┌─────────────┐       ┌─────────────┐
│  Projects   │◄──────│  Meetings   │
└──────┬──────┘   M   └─────────────┘
       │ 1                   │
       │                     │ (notes)
       ▼ M                   ▼
┌─────────────┐       ┌─────────────┐
│    Tasks    │       │    Notes    │
└─────────────┘       └─────────────┘
       │
       ▼
┌─────────────┐
│  Checklists │
└─────────────┘

┌─────────────┐
│ Daily Notes │  (standalone, one per day)
└─────────────┘
```

### Core Schema

```sql
-- Contexts (user-defined, global filter)
CREATE TABLE contexts (
  id TEXT PRIMARY KEY,                -- UUID
  name TEXT NOT NULL,
  color TEXT,                         -- hex color
  icon TEXT,                          -- emoji or icon name
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,           -- ISO 8601
  updated_at TEXT NOT NULL,
  deleted_at TEXT                     -- soft delete
);

-- Projects (task containers with end goals)
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,                   -- markdown
  status TEXT NOT NULL DEFAULT 'active',  -- active, completed, archived
  context_id TEXT REFERENCES contexts(id),
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  deleted_at TEXT,
  
  -- Sync-ready fields
  vector_clock TEXT                   -- for future CRDT sync
);

-- Project Headings (group tasks within project)
CREATE TABLE project_headings (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  title TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- Tasks (the core entity)
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  notes TEXT,                         -- markdown
  
  -- Things-style status
  status TEXT NOT NULL DEFAULT 'inbox',  -- inbox, today, upcoming, anytime, someday, logbook, cancelled
  
  -- Dates (distinct concepts!)
  when_date TEXT,                     -- scheduled start date (ISO 8601 date)
  deadline TEXT,                      -- hard due date (ISO 8601 date)
  
  -- Organization
  project_id TEXT REFERENCES projects(id),
  heading_id TEXT REFERENCES project_headings(id),
  context_id TEXT REFERENCES contexts(id),  -- inherited from project if set
  
  -- Priority
  priority TEXT,                      -- P0, P1, P2, P3, or null
  
  -- Ordering
  sort_order INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  deleted_at TEXT,
  
  -- Sync-ready
  vector_clock TEXT
);

-- Task Checklists (subtasks)
CREATE TABLE task_checklists (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id),
  title TEXT NOT NULL,
  is_done INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- Stakeholders (global, no context)
CREATE TABLE stakeholders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  organization TEXT,
  role TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,                         -- markdown
  avatar_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- Meetings
CREATE TABLE meetings (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,                   -- markdown
  
  -- Timing
  start_time TEXT NOT NULL,           -- ISO 8601 datetime
  end_time TEXT,                      -- ISO 8601 datetime
  is_all_day INTEGER NOT NULL DEFAULT 0,
  
  -- Organization
  context_id TEXT REFERENCES contexts(id),
  project_id TEXT REFERENCES projects(id),
  
  -- Content
  notes TEXT,                         -- markdown, meeting notes
  
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- Meeting Attendees (junction table)
CREATE TABLE meeting_attendees (
  meeting_id TEXT NOT NULL REFERENCES meetings(id),
  stakeholder_id TEXT NOT NULL REFERENCES stakeholders(id),
  PRIMARY KEY (meeting_id, stakeholder_id)
);

-- Notes (standalone or linked)
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,                       -- markdown
  
  -- Organization
  context_id TEXT REFERENCES contexts(id),
  project_id TEXT REFERENCES projects(id),
  
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- Note-Stakeholder links
CREATE TABLE note_stakeholders (
  note_id TEXT NOT NULL REFERENCES notes(id),
  stakeholder_id TEXT NOT NULL REFERENCES stakeholders(id),
  PRIMARY KEY (note_id, stakeholder_id)
);

-- Daily Notes (one per day, global)
CREATE TABLE daily_notes (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,          -- YYYY-MM-DD
  content TEXT,                       -- markdown
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Full-text search virtual table
CREATE VIRTUAL TABLE search_index USING fts5(
  entity_type,
  entity_id,
  title,
  content,
  tokenize='porter'
);
```
### Indexes
```sql
-- Performance indexes
CREATE INDEX idx_tasks_status ON tasks(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_project ON tasks(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_context ON tasks(context_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_when ON tasks(when_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_deadline ON tasks(deadline) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_context ON projects(context_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_meetings_start ON meetings(start_time) WHERE deleted_at IS NULL;
CREATE INDEX idx_daily_notes_date ON daily_notes(date);
```
## Task System
### Status Flow (Things-Inspired)

```
                    ┌──────────────┐
                    │    INBOX     │ ← Quick capture, no context
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
       │      ANYTIME        │ ←────────┘
       └──────────┬──────────┘   (pull back)
                  │
                  │ Complete
                  ▼
           ┌──────────┐
           │ LOGBOOK  │ (archive)
           └──────────┘
```
### Status Definitions

| Status | Meaning | When Date | Appears In |
|--------|---------|-----------|------------|
| `inbox` | Uncategorized, needs triage | ignored | Inbox (always visible) |
| `today` | Doing today (manual selection) | optional | Today view |
| `upcoming` | Scheduled for future | required | Upcoming view, by date |
| `anytime` | Available, no schedule | null | Anytime view |
| `someday` | Deferred, maybe later | null | Someday view |
| `logbook` | Completed | n/a | Logbook (archive) |
| `cancelled` | Won't do | n/a | Hidden (soft delete) |
### When vs Deadline

| Field       | Meaning                          | Example                   |
| ----------- | -------------------------------- | ------------------------- |
| `when_date` | "I plan to work on this day"     | Schedule task for Tuesday |
| `deadline`  | "This must be done by this date" | Project deadline Friday   |
A task can have:
- Neither (anytime task)
- Only `when_date` (scheduled, no hard deadline)
- Only `deadline` (due date, work on it whenever)
- Both (scheduled start, hard deadline)
### Context Inheritance
```
IF task.project_id IS NOT NULL:
  task.context_id = project.context_id  -- hard inheritance, enforced
ELSE:
  task.context_id = user_assigned OR NULL  -- standalone task
```
## Context System
### Behavior
- **Global toggle**: Filters entire app to selected context
- **Inbox exception**: Always visible regardless of filter
- **Single context per entity**: No multi-assignment
- Stakeholders: Exception, exist outside of contexts
- **User-defined**: Create/edit/delete/reorder contexts
### UI State
```typescript
interface ContextState {
  contexts: Context[];
  activeContextId: string | null;  // null = "All"
  
  setActiveContext(id: string | null): void;
  createContext(data: CreateContextInput): Context;
  updateContext(id: string, data: UpdateContextInput): Context;
  deleteContext(id: string): void;
  reorderContexts(ids: string[]): void;
}
```
### Filter Logic
```typescript
function filterByContext<T extends { context_id: string | null }>(
  items: T[],
  activeContextId: string | null
): T[] {
  if (activeContextId === null) return items;  // "All" selected
  return items.filter(item => item.context_id === activeContextId);
}

// Inbox is ALWAYS included regardless of context
function getVisibleTasks(tasks: Task[], activeContextId: string | null): Task[] {
  const inbox = tasks.filter(t => t.status === 'inbox');
  const rest = tasks.filter(t => t.status !== 'inbox');
  return [...inbox, ...filterByContext(rest, activeContextId)];
}
```
## State Management
### Zustand Stores
```typescript
// src/renderer/stores/index.ts

// Task store
interface TaskStore {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  
  // CRUD
  fetchTasks(): Promise<void>;
  createTask(input: CreateTaskInput): Promise<Task>;
  updateTask(id: string, input: UpdateTaskInput): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  
  // Bulk operations
  moveTasks(ids: string[], status: TaskStatus): Promise<void>;
  
  // Derived
  getTasksByStatus(status: TaskStatus): Task[];
  getTasksByProject(projectId: string): Task[];
}

// Similar stores for: projects, contexts, notes, meetings, stakeholders, dailyNotes
```
### Store Composition
```typescript
// Root store combining all slices
const useStore = create<RootStore>()(
  devtools(
    persist(
      (...args) => ({
        ...createTaskStore(...args),
        ...createProjectStore(...args),
        ...createContextStore(...args),
        // etc.
      }),
      { name: 'cortex-store' }
    )
  )
);
```
## IPC & Security
### Security Model
Electron's main process has full system access. Renderer is sandboxed.
```
┌─────────────────────────────────────────┐
│              RENDERER                    │
│  (sandboxed, no Node, no fs access)     │
│                                          │
│  React App ←→ Preload Bridge (IPC)      │
└──────────────────┬───────────────────────┘
                   │ contextBridge.exposeInMainWorld
                   │ (typed, validated)
                   ▼
┌─────────────────────────────────────────┐
│              MAIN PROCESS               │
│  (full Node access, SQLite, fs)         │
│                                          │
│  IPC Handlers → Services → Database     │
└─────────────────────────────────────────┘
```
### Preload Bridge
```typescript
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';

const api = {
  // Tasks
  tasks: {
    list: () => ipcRenderer.invoke('tasks:list'),
    create: (input: CreateTaskInput) => ipcRenderer.invoke('tasks:create', input),
    update: (id: string, input: UpdateTaskInput) => ipcRenderer.invoke('tasks:update', id, input),
    delete: (id: string) => ipcRenderer.invoke('tasks:delete', id),
  },
  // Projects, contexts, etc.
  projects: { /* ... */ },
  contexts: { /* ... */ },
  
  // System
  system: {
    exportData: () => ipcRenderer.invoke('system:export'),
    importData: (path: string) => ipcRenderer.invoke('system:import', path),
  },
};

contextBridge.exposeInMainWorld('cortex', api);

// Type declaration for renderer
declare global {
  interface Window {
    cortex: typeof api;
  }
}
```
### IPC Handlers
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
    const validated = createTaskSchema.parse(input);
    return taskService.create(validated);
  });
  
  ipcMain.handle('tasks:update', async (_, id, input) => {
    const validated = updateTaskSchema.parse(input);
    return taskService.update(id, validated);
  });
  
  ipcMain.handle('tasks:delete', async (_, id) => {
    return taskService.delete(id);
  });
}
```
## Sync-Ready Patterns
Even though sync is post-MVP, we architect for it from day one.
### UUIDs Everywhere
```typescript
import { randomUUID } from 'crypto';

function generateId(): string {
  return randomUUID();
}
```
### Soft Deletes
```sql
-- Never hard delete, always soft delete
UPDATE tasks SET deleted_at = datetime('now') WHERE id = ?;

-- All queries filter out deleted
SELECT * FROM tasks WHERE deleted_at IS NULL;
```
### Timestamps on Everything
```typescript
interface BaseEntity {
  id: string;
  created_at: string;  // ISO 8601
  updated_at: string;  // ISO 8601
  deleted_at: string | null;
}
```
### Vector Clock (Future-Proofing)
```sql
-- Reserved column for CRDT sync
vector_clock TEXT  -- JSON: {"node_id": counter, ...}
```
When sync is implemented (cr-sqlite or custom), this field enables conflict resolution.
### Event Log
For full auditability and replay:
```sql
CREATE TABLE event_log (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,      -- create, update, delete
  payload TEXT NOT NULL,     -- JSON of changes
  timestamp TEXT NOT NULL,
  
  -- Sync metadata
  vector_clock TEXT,
  synced_at TEXT
);
```
## AI Integration Layer
### Philosophy
```
┌─────────────────────────────────────────┐
│           AI Layer (optional/opt-in)    │
│                                          │
│  ┌───────────┐  ┌─────────────────────┐ │
│  │ Local LLM │  │ Cloud API (opt-in)  │ │
│  │ (Ollama)  │  │ (user's API key)    │ │
│  └───────────┘  └─────────────────────┘ │
│                                          │
│  ┌─────────────────────────────────────┐ │
│  │ External Agent API (OpenClaw, etc) │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│            Core App (AI-free)           │
│      SQLite │ Electron │ React          │
└─────────────────────────────────────────┘
```
### Agent API (MVP)
For external AI agents (like OpenClaw), expose HTTP endpoints:
```typescript
// Local HTTP server in Electron main process (optional, off by default)

// Context endpoints (read)
GET /api/context/today      // Today's tasks, meetings, daily note
GET /api/context/week       // Week overview
GET /api/context/project/:id
GET /api/context/stakeholder/:id
GET /api/search?q=...

// CRUD endpoints (write)
GET    /api/tasks
POST   /api/tasks
PATCH  /api/tasks/:id
DELETE /api/tasks/:id

// Similar for projects, notes, meetings, stakeholders
```
### AI Settings
```typescript
interface AISettings {
  enabled: boolean;
  
  // Local AI
  localModel: {
    enabled: boolean;
    provider: 'ollama' | null;
    model: string;  // e.g., 'llama3.2'
    endpoint: string;  // e.g., 'http://localhost:11434'
  };
  
  // Cloud AI (user's own key)
  cloudModel: {
    enabled: boolean;
    provider: 'openai' | 'anthropic' | null;
    apiKey: string;  // stored encrypted
    model: string;
  };
  
  // Agent API
  agentApi: {
    enabled: boolean;
    port: number;
    apiKey: string;  // for authentication
  };
}
```