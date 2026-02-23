-- Update RLS policies to support AI agent access without user impersonation
--
-- Previously, agents got JWTs with sub=user_id, making auth.uid() return the
-- user's ID directly (impersonation). Now agents can authenticate with their
-- own identity via an agent_id JWT claim. RLS allows access when EITHER:
--   1. auth.uid() = user_id  (normal user access), OR
--   2. JWT contains an agent_id claim for a non-revoked agent owned by user_id
--
-- Backward-compatible: existing agent JWTs with sub=user_id still pass via
-- condition 1 until the edge function is updated to stop impersonating.

-- Helper function: checks if the current JWT carries a valid, non-revoked
-- agent_id linked to the given user_id.
--
-- SECURITY DEFINER so it can query ai_agents bypassing RLS (otherwise the
-- agent couldn't read ai_agents to validate itself — circular dependency).
-- STABLE because JWT claims are constant within a transaction.
-- NULLIF guards against empty-string from current_setting when no JWT is set.
--
-- ACCEPTED RISK — timing side-channel: SECURITY DEFINER functions execute at
-- a fixed privilege level, so a valid-but-revoked agent_id will take slightly
-- longer than a completely unknown id (EXISTS short-circuits on the first
-- matching row). An attacker could in theory enumerate agent IDs by measuring
-- response times. Impact is LOW: agent IDs are UUIDs (2^122 space), and the
-- leaked bit is only "this UUID was ever a valid agent for this user", not the
-- api_key_hash or any sensitive payload. Mitigating with constant-time lookups
-- would require pl/pgsql and a dummy SELECT, adding complexity for minimal
-- gain. Accepted as low-risk until agents are exposed to untrusted callers.
DROP FUNCTION IF EXISTS public.is_authorized_agent(UUID);
CREATE FUNCTION public.is_authorized_agent(row_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ai_agents
    WHERE id = (NULLIF(current_setting('request.jwt.claims', true), '')::json->>'agent_id')
      AND user_id = row_user_id
      AND revoked_at IS NULL
  );
$$;

-- Recreate all data table policies with agent access
-- (DROP + CREATE to avoid naming conflicts)

DROP POLICY IF EXISTS contexts_policy ON public.contexts;
CREATE POLICY contexts_policy ON public.contexts FOR ALL
  USING (auth.uid() = user_id OR public.is_authorized_agent(user_id));

DROP POLICY IF EXISTS projects_policy ON public.projects;
CREATE POLICY projects_policy ON public.projects FOR ALL
  USING (auth.uid() = user_id OR public.is_authorized_agent(user_id));

DROP POLICY IF EXISTS project_headings_policy ON public.project_headings;
CREATE POLICY project_headings_policy ON public.project_headings FOR ALL
  USING (auth.uid() = user_id OR public.is_authorized_agent(user_id));

DROP POLICY IF EXISTS tasks_policy ON public.tasks;
CREATE POLICY tasks_policy ON public.tasks FOR ALL
  USING (auth.uid() = user_id OR public.is_authorized_agent(user_id));

DROP POLICY IF EXISTS task_checklists_policy ON public.task_checklists;
CREATE POLICY task_checklists_policy ON public.task_checklists FOR ALL
  USING (auth.uid() = user_id OR public.is_authorized_agent(user_id));

DROP POLICY IF EXISTS stakeholders_policy ON public.stakeholders;
CREATE POLICY stakeholders_policy ON public.stakeholders FOR ALL
  USING (auth.uid() = user_id OR public.is_authorized_agent(user_id));

DROP POLICY IF EXISTS meetings_policy ON public.meetings;
CREATE POLICY meetings_policy ON public.meetings FOR ALL
  USING (auth.uid() = user_id OR public.is_authorized_agent(user_id));

DROP POLICY IF EXISTS meeting_attendees_policy ON public.meeting_attendees;
CREATE POLICY meeting_attendees_policy ON public.meeting_attendees FOR ALL
  USING (auth.uid() = user_id OR public.is_authorized_agent(user_id));

DROP POLICY IF EXISTS notes_policy ON public.notes;
CREATE POLICY notes_policy ON public.notes FOR ALL
  USING (auth.uid() = user_id OR public.is_authorized_agent(user_id));

DROP POLICY IF EXISTS note_stakeholders_policy ON public.note_stakeholders;
CREATE POLICY note_stakeholders_policy ON public.note_stakeholders FOR ALL
  USING (auth.uid() = user_id OR public.is_authorized_agent(user_id));

DROP POLICY IF EXISTS daily_notes_policy ON public.daily_notes;
CREATE POLICY daily_notes_policy ON public.daily_notes FOR ALL
  USING (auth.uid() = user_id OR public.is_authorized_agent(user_id));

-- ai_agents: agents can READ their user's agent records but only the
-- owning user can write (prevents a compromised agent from un-revoking
-- itself or modifying other agents).
DROP POLICY IF EXISTS ai_agents_policy ON public.ai_agents;
CREATE POLICY ai_agents_select_policy ON public.ai_agents FOR SELECT
  USING (auth.uid() = user_id OR public.is_authorized_agent(user_id));
CREATE POLICY ai_agents_write_policy ON public.ai_agents
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY ai_agents_update_policy ON public.ai_agents FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY ai_agents_delete_policy ON public.ai_agents FOR DELETE
  USING (auth.uid() = user_id);


-- =============================================================================
-- TEST PLAN
-- =============================================================================
--
-- Run these against a Supabase instance after applying the migration.
-- Each test uses SET LOCAL to simulate different JWT scenarios within a
-- transaction (ROLLBACK after each test to reset state).
--
-- UUIDs used in examples:
--   user1  = 'a0000000-0000-0000-0000-000000000001'
--   user2  = 'b0000000-0000-0000-0000-000000000002'
--   nobody = 'c0000000-0000-0000-0000-000000000003'
--
-- Setup (run as service_role / superuser):
--   INSERT INTO auth.users (id) VALUES
--     ('a0000000-0000-0000-0000-000000000001'),
--     ('b0000000-0000-0000-0000-000000000002');
--   INSERT INTO public.ai_agents (id, user_id, name, api_key_hash)
--     VALUES ('agent-1', 'a0000000-0000-0000-0000-000000000001', 'Test Agent', 'hash1');
--   INSERT INTO public.tasks (id, user_id, title, status, created_at, updated_at)
--     VALUES ('task-1', 'a0000000-0000-0000-0000-000000000001', 'User1 task', 'inbox', now()::text, now()::text);
--
-- (a) Normal user access still works:
--   SET LOCAL role TO authenticated;
--   SET LOCAL request.jwt.claims TO '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
--   SELECT * FROM public.tasks;
--   -- EXPECT: returns task-1
--
-- (b) Agent with valid key can read/write:
--   SET LOCAL role TO authenticated;
--   SET LOCAL request.jwt.claims TO '{"sub":"c0000000-0000-0000-0000-000000000003","role":"authenticated","agent_id":"agent-1"}';
--   SELECT * FROM public.tasks;
--   -- EXPECT: returns task-1 (agent-1 belongs to user1, sub is NOT user1)
--   INSERT INTO public.tasks (id, user_id, title, status, created_at, updated_at)
--     VALUES ('task-2', 'a0000000-0000-0000-0000-000000000001', 'Agent task', 'inbox', now()::text, now()::text);
--   -- EXPECT: succeeds
--
-- (c) Revoked agent cannot access:
--   UPDATE public.ai_agents SET revoked_at = now() WHERE id = 'agent-1';  -- (as superuser)
--   SET LOCAL role TO authenticated;
--   SET LOCAL request.jwt.claims TO '{"sub":"c0000000-0000-0000-0000-000000000003","role":"authenticated","agent_id":"agent-1"}';
--   SELECT * FROM public.tasks;
--   -- EXPECT: 0 rows
--
-- (d) Agent cannot access another user's data:
--   SET LOCAL role TO authenticated;
--   SET LOCAL request.jwt.claims TO '{"sub":"c0000000-0000-0000-0000-000000000003","role":"authenticated","agent_id":"agent-1"}';
--   INSERT INTO public.tasks (id, user_id, title, status, created_at, updated_at)
--     VALUES ('task-3', 'b0000000-0000-0000-0000-000000000002', 'Stolen task', 'inbox', now()::text, now()::text);
--   -- EXPECT: RLS violation error (agent-1 not linked to user2)
--
-- (e) No agent_id claim = normal auth only:
--   SET LOCAL role TO authenticated;
--   SET LOCAL request.jwt.claims TO '{"sub":"c0000000-0000-0000-0000-000000000003","role":"authenticated"}';
--   SELECT * FROM public.tasks;
--   -- EXPECT: 0 rows (sub doesn't match any user_id that owns data)
--
-- (f) Agent cannot write to ai_agents (privilege escalation guard):
--   SET LOCAL role TO authenticated;
--   SET LOCAL request.jwt.claims TO '{"sub":"c0000000-0000-0000-0000-000000000003","role":"authenticated","agent_id":"agent-1"}';
--   UPDATE public.ai_agents SET revoked_at = NULL WHERE id = 'agent-1';
--   -- EXPECT: 0 rows updated (write policy requires auth.uid() = user_id)
