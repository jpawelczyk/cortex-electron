# Database Schema

SQLite database with soft deletes, UUIDs, and sync-ready patterns.

## Core Tables

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
  status TEXT NOT NULL DEFAULT 'inbox',
  -- Values: inbox, today, upcoming, anytime, someday, logbook, cancelled
  
  -- Dates (distinct concepts!)
  when_date TEXT,                     -- scheduled start (ISO 8601 date)
  deadline TEXT,                      -- hard due date (ISO 8601 date)
  
  -- Organization
  project_id TEXT REFERENCES projects(id),
  heading_id TEXT REFERENCES project_headings(id),
  context_id TEXT REFERENCES contexts(id),
  
  -- Priority
  priority TEXT,                      -- P0, P1, P2, P3, or null
  
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  deleted_at TEXT,
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
  start_time TEXT NOT NULL,           -- ISO 8601 datetime
  end_time TEXT,
  is_all_day INTEGER NOT NULL DEFAULT 0,
  context_id TEXT REFERENCES contexts(id),
  project_id TEXT REFERENCES projects(id),
  notes TEXT,                         -- markdown
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

-- Full-text search
CREATE VIRTUAL TABLE search_index USING fts5(
  entity_type,
  entity_id,
  title,
  content,
  tokenize='porter'
);

-- Event log (for sync/audit)
CREATE TABLE event_log (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,               -- create, update, delete
  payload TEXT NOT NULL,              -- JSON
  timestamp TEXT NOT NULL,
  vector_clock TEXT,
  synced_at TEXT
);
```

## Indexes

```sql
CREATE INDEX idx_tasks_status ON tasks(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_project ON tasks(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_context ON tasks(context_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_when ON tasks(when_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_deadline ON tasks(deadline) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_context ON projects(context_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_meetings_start ON meetings(start_time) WHERE deleted_at IS NULL;
CREATE INDEX idx_daily_notes_date ON daily_notes(date);
```

## Conventions

- **IDs**: UUIDs (TEXT), generated via `crypto.randomUUID()`
- **Timestamps**: ISO 8601 strings (TEXT)
- **Soft deletes**: Set `deleted_at`, never hard delete
- **Rich text**: Stored as Markdown (TEXT)
- **Booleans**: INTEGER (0/1)
