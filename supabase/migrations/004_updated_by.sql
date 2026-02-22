-- Add "last modified by" tracking to all data tables
-- updated_at already exists, now we track WHO did the update

-- Tasks
ALTER TABLE public.tasks ADD COLUMN updated_by_source TEXT CHECK (updated_by_source IN ('user', 'ai', 'import', 'api'));
ALTER TABLE public.tasks ADD COLUMN updated_by_agent_id TEXT REFERENCES public.ai_agents(id);

-- Projects
ALTER TABLE public.projects ADD COLUMN updated_by_source TEXT CHECK (updated_by_source IN ('user', 'ai', 'import', 'api'));
ALTER TABLE public.projects ADD COLUMN updated_by_agent_id TEXT REFERENCES public.ai_agents(id);

-- Notes
ALTER TABLE public.notes ADD COLUMN updated_by_source TEXT CHECK (updated_by_source IN ('user', 'ai', 'import', 'api'));
ALTER TABLE public.notes ADD COLUMN updated_by_agent_id TEXT REFERENCES public.ai_agents(id);

-- Meetings
ALTER TABLE public.meetings ADD COLUMN updated_by_source TEXT CHECK (updated_by_source IN ('user', 'ai', 'import', 'api'));
ALTER TABLE public.meetings ADD COLUMN updated_by_agent_id TEXT REFERENCES public.ai_agents(id);

-- Stakeholders
ALTER TABLE public.stakeholders ADD COLUMN updated_by_source TEXT CHECK (updated_by_source IN ('user', 'ai', 'import', 'api'));
ALTER TABLE public.stakeholders ADD COLUMN updated_by_agent_id TEXT REFERENCES public.ai_agents(id);

-- Daily Notes
ALTER TABLE public.daily_notes ADD COLUMN updated_by_source TEXT CHECK (updated_by_source IN ('user', 'ai', 'import', 'api'));
ALTER TABLE public.daily_notes ADD COLUMN updated_by_agent_id TEXT REFERENCES public.ai_agents(id);

-- Contexts
ALTER TABLE public.contexts ADD COLUMN updated_by_source TEXT CHECK (updated_by_source IN ('user', 'ai', 'import', 'api'));
ALTER TABLE public.contexts ADD COLUMN updated_by_agent_id TEXT REFERENCES public.ai_agents(id);

-- Project Headings
ALTER TABLE public.project_headings ADD COLUMN updated_by_source TEXT CHECK (updated_by_source IN ('user', 'ai', 'import', 'api'));
ALTER TABLE public.project_headings ADD COLUMN updated_by_agent_id TEXT REFERENCES public.ai_agents(id);

-- Task Checklists
ALTER TABLE public.task_checklists ADD COLUMN updated_by_source TEXT CHECK (updated_by_source IN ('user', 'ai', 'import', 'api'));
ALTER TABLE public.task_checklists ADD COLUMN updated_by_agent_id TEXT REFERENCES public.ai_agents(id);
