-- AI Agents table for API key management
CREATE TABLE public.ai_agents (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  api_key_hash TEXT NOT NULL,
  permissions JSONB DEFAULT '{"read": true, "write": true}',
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_agents_policy ON public.ai_agents FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_ai_agents_key_hash ON public.ai_agents(api_key_hash) WHERE revoked_at IS NULL;

-- Add ai_agents to PowerSync publication so it syncs back to clients
ALTER PUBLICATION powersync ADD TABLE public.ai_agents;

-- Add source and agent_id columns to all data tables
ALTER TABLE public.contexts ADD COLUMN source TEXT DEFAULT 'user' CHECK (source IN ('user', 'ai', 'import', 'api'));
ALTER TABLE public.contexts ADD COLUMN agent_id TEXT REFERENCES public.ai_agents(id);

ALTER TABLE public.projects ADD COLUMN source TEXT DEFAULT 'user' CHECK (source IN ('user', 'ai', 'import', 'api'));
ALTER TABLE public.projects ADD COLUMN agent_id TEXT REFERENCES public.ai_agents(id);

ALTER TABLE public.project_headings ADD COLUMN source TEXT DEFAULT 'user' CHECK (source IN ('user', 'ai', 'import', 'api'));
ALTER TABLE public.project_headings ADD COLUMN agent_id TEXT REFERENCES public.ai_agents(id);

ALTER TABLE public.tasks ADD COLUMN source TEXT DEFAULT 'user' CHECK (source IN ('user', 'ai', 'import', 'api'));
ALTER TABLE public.tasks ADD COLUMN agent_id TEXT REFERENCES public.ai_agents(id);

ALTER TABLE public.task_checklists ADD COLUMN source TEXT DEFAULT 'user' CHECK (source IN ('user', 'ai', 'import', 'api'));
ALTER TABLE public.task_checklists ADD COLUMN agent_id TEXT REFERENCES public.ai_agents(id);

ALTER TABLE public.stakeholders ADD COLUMN source TEXT DEFAULT 'user' CHECK (source IN ('user', 'ai', 'import', 'api'));
ALTER TABLE public.stakeholders ADD COLUMN agent_id TEXT REFERENCES public.ai_agents(id);

ALTER TABLE public.meetings ADD COLUMN source TEXT DEFAULT 'user' CHECK (source IN ('user', 'ai', 'import', 'api'));
ALTER TABLE public.meetings ADD COLUMN agent_id TEXT REFERENCES public.ai_agents(id);

ALTER TABLE public.meeting_attendees ADD COLUMN source TEXT DEFAULT 'user' CHECK (source IN ('user', 'ai', 'import', 'api'));
ALTER TABLE public.meeting_attendees ADD COLUMN agent_id TEXT REFERENCES public.ai_agents(id);

ALTER TABLE public.notes ADD COLUMN source TEXT DEFAULT 'user' CHECK (source IN ('user', 'ai', 'import', 'api'));
ALTER TABLE public.notes ADD COLUMN agent_id TEXT REFERENCES public.ai_agents(id);

ALTER TABLE public.note_stakeholders ADD COLUMN source TEXT DEFAULT 'user' CHECK (source IN ('user', 'ai', 'import', 'api'));
ALTER TABLE public.note_stakeholders ADD COLUMN agent_id TEXT REFERENCES public.ai_agents(id);

ALTER TABLE public.daily_notes ADD COLUMN source TEXT DEFAULT 'user' CHECK (source IN ('user', 'ai', 'import', 'api'));
ALTER TABLE public.daily_notes ADD COLUMN agent_id TEXT REFERENCES public.ai_agents(id);
