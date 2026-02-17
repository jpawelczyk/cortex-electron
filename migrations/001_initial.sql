-- Contexts (user-defined, global filter)
CREATE TABLE IF NOT EXISTS contexts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- Projects (task containers with end goals)
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  context_id TEXT REFERENCES contexts(id),
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  deleted_at TEXT,
  vector_clock TEXT
);

-- Project Headings (group tasks within project)
CREATE TABLE IF NOT EXISTS project_headings (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  title TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- Tasks (the core entity)
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'inbox',
  when_date TEXT,
  deadline TEXT,
  project_id TEXT REFERENCES projects(id),
  heading_id TEXT REFERENCES project_headings(id),
  context_id TEXT REFERENCES contexts(id),
  priority TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  deleted_at TEXT,
  vector_clock TEXT
);

-- Task Checklists (subtasks)
CREATE TABLE IF NOT EXISTS task_checklists (
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
CREATE TABLE IF NOT EXISTS stakeholders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  organization TEXT,
  role TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  avatar_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- Meetings
CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT,
  is_all_day INTEGER NOT NULL DEFAULT 0,
  context_id TEXT REFERENCES contexts(id),
  project_id TEXT REFERENCES projects(id),
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- Meeting Attendees (junction table)
CREATE TABLE IF NOT EXISTS meeting_attendees (
  meeting_id TEXT NOT NULL REFERENCES meetings(id),
  stakeholder_id TEXT NOT NULL REFERENCES stakeholders(id),
  PRIMARY KEY (meeting_id, stakeholder_id)
);

-- Notes (standalone or linked)
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  context_id TEXT REFERENCES contexts(id),
  project_id TEXT REFERENCES projects(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- Note-Stakeholder links
CREATE TABLE IF NOT EXISTS note_stakeholders (
  note_id TEXT NOT NULL REFERENCES notes(id),
  stakeholder_id TEXT NOT NULL REFERENCES stakeholders(id),
  PRIMARY KEY (note_id, stakeholder_id)
);

-- Daily Notes (one per day, global)
CREATE TABLE IF NOT EXISTS daily_notes (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  content TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
  entity_type,
  entity_id,
  title,
  content,
  tokenize='porter'
);

-- Event log (for sync/audit)
CREATE TABLE IF NOT EXISTS event_log (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  payload TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  vector_clock TEXT,
  synced_at TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_context ON tasks(context_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_when ON tasks(when_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_context ON projects(context_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_meetings_start ON meetings(start_time) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_daily_notes_date ON daily_notes(date);
