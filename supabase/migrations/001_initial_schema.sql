-- Supabase Postgres schema for Cortex
-- Mirrors local SQLite schema with user_id for multi-tenancy and RLS

-- Contexts
CREATE TABLE public.contexts (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  color TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- Projects
CREATE TABLE public.projects (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  context_id TEXT REFERENCES public.contexts(id),
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  deleted_at TEXT
);

-- Project Headings
CREATE TABLE public.project_headings (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  project_id TEXT NOT NULL REFERENCES public.projects(id),
  title TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- Tasks
CREATE TABLE public.tasks (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'inbox',
  when_date TEXT,
  deadline TEXT,
  project_id TEXT REFERENCES public.projects(id),
  heading_id TEXT REFERENCES public.project_headings(id),
  context_id TEXT REFERENCES public.contexts(id),
  priority TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  deleted_at TEXT,
  permanently_deleted_at TEXT,
  stale_at TEXT
);

-- Task Checklists
CREATE TABLE public.task_checklists (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  task_id TEXT NOT NULL REFERENCES public.tasks(id),
  title TEXT NOT NULL,
  is_done INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- Stakeholders
CREATE TABLE public.stakeholders (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
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
CREATE TABLE public.meetings (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT,
  is_all_day INTEGER NOT NULL DEFAULT 0,
  context_id TEXT REFERENCES public.contexts(id),
  project_id TEXT REFERENCES public.projects(id),
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- Meeting Attendees
CREATE TABLE public.meeting_attendees (
  meeting_id TEXT NOT NULL REFERENCES public.meetings(id),
  stakeholder_id TEXT NOT NULL REFERENCES public.stakeholders(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  PRIMARY KEY (meeting_id, stakeholder_id)
);

-- Notes
CREATE TABLE public.notes (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  content TEXT,
  context_id TEXT REFERENCES public.contexts(id),
  project_id TEXT REFERENCES public.projects(id),
  is_pinned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- Note-Stakeholder links
CREATE TABLE public.note_stakeholders (
  note_id TEXT NOT NULL REFERENCES public.notes(id),
  stakeholder_id TEXT NOT NULL REFERENCES public.stakeholders(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  PRIMARY KEY (note_id, stakeholder_id)
);

-- Daily Notes
CREATE TABLE public.daily_notes (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  date TEXT NOT NULL,
  content TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Unique constraint: one daily note per user per date
CREATE UNIQUE INDEX idx_daily_notes_user_date ON public.daily_notes(user_id, date);

-- Indexes (mirror local SQLite indexes)
CREATE INDEX idx_tasks_status ON public.tasks(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_project ON public.tasks(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_context ON public.tasks(context_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_when ON public.tasks(when_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_deadline ON public.tasks(deadline) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_context ON public.projects(context_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_meetings_start ON public.meetings(start_time) WHERE deleted_at IS NULL;
CREATE INDEX idx_daily_notes_date ON public.daily_notes(date);

-- Row Level Security
ALTER TABLE public.contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_headings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users can only access their own data
CREATE POLICY contexts_policy ON public.contexts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY projects_policy ON public.projects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY project_headings_policy ON public.project_headings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY tasks_policy ON public.tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY task_checklists_policy ON public.task_checklists FOR ALL USING (auth.uid() = user_id);
CREATE POLICY stakeholders_policy ON public.stakeholders FOR ALL USING (auth.uid() = user_id);
CREATE POLICY meetings_policy ON public.meetings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY meeting_attendees_policy ON public.meeting_attendees FOR ALL USING (auth.uid() = user_id);
CREATE POLICY notes_policy ON public.notes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY note_stakeholders_policy ON public.note_stakeholders FOR ALL USING (auth.uid() = user_id);
CREATE POLICY daily_notes_policy ON public.daily_notes FOR ALL USING (auth.uid() = user_id);

-- Publication for PowerSync (all tables)
CREATE PUBLICATION powersync FOR TABLE
  public.contexts,
  public.projects,
  public.project_headings,
  public.tasks,
  public.task_checklists,
  public.stakeholders,
  public.meetings,
  public.meeting_attendees,
  public.notes,
  public.note_stakeholders,
  public.daily_notes;
