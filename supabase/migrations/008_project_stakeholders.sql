-- Add project_stakeholders junction table (was missing from initial schema)

CREATE TABLE public.project_stakeholders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  stakeholder_id TEXT NOT NULL REFERENCES public.stakeholders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT DEFAULT 'user' CHECK (source IN ('user', 'ai', 'import', 'api')),
  agent_id TEXT REFERENCES public.ai_agents(id),
  UNIQUE(project_id, stakeholder_id)
);

-- RLS
ALTER TABLE public.project_stakeholders ENABLE ROW LEVEL SECURITY;

-- User policies
CREATE POLICY project_stakeholders_select_policy ON public.project_stakeholders FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.ai_agents
    WHERE ai_agents.id = auth.jwt()->>'agent_id'
      AND ai_agents.user_id = project_stakeholders.user_id
      AND ai_agents.revoked_at IS NULL
      AND (ai_agents.permissions->>'read')::boolean = true
  )
);

CREATE POLICY project_stakeholders_insert_policy ON public.project_stakeholders FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.ai_agents
    WHERE ai_agents.id = auth.jwt()->>'agent_id'
      AND ai_agents.user_id = project_stakeholders.user_id
      AND ai_agents.revoked_at IS NULL
      AND (ai_agents.permissions->>'write')::boolean = true
  )
);

CREATE POLICY project_stakeholders_update_policy ON public.project_stakeholders FOR UPDATE
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.ai_agents
    WHERE ai_agents.id = auth.jwt()->>'agent_id'
      AND ai_agents.user_id = project_stakeholders.user_id
      AND ai_agents.revoked_at IS NULL
      AND (ai_agents.permissions->>'write')::boolean = true
  )
);

CREATE POLICY project_stakeholders_delete_policy ON public.project_stakeholders FOR DELETE
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.ai_agents
    WHERE ai_agents.id = auth.jwt()->>'agent_id'
      AND ai_agents.user_id = project_stakeholders.user_id
      AND ai_agents.revoked_at IS NULL
      AND (ai_agents.permissions->>'write')::boolean = true
  )
);

-- Indexes
CREATE INDEX idx_project_stakeholders_project ON public.project_stakeholders(project_id);
CREATE INDEX idx_project_stakeholders_stakeholder ON public.project_stakeholders(stakeholder_id);
