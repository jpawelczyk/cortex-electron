-- Enforce ai_agents.permissions JSONB field in RLS policies
--
-- The 005 migration granted all agents full read+write access if non-revoked.
-- This migration splits that into granular read/write checks against the
-- permissions JSONB column on ai_agents, e.g.:
--   {"read": "true", "write": "false"}
--
-- Two helper functions replace is_authorized_agent:
--   agent_can_read(row_user_id)  -- gates SELECT
--   agent_can_write(row_user_id) -- gates INSERT, UPDATE, DELETE
--
-- FOR ALL policies from 005 are replaced with four separate per-operation
-- policies per table so that read and write can be independently gated.
--
-- ai_agents table policies from 005 are left untouched.

BEGIN;

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

DROP FUNCTION IF EXISTS public.agent_can_read(UUID);
CREATE FUNCTION public.agent_can_read(row_user_id UUID)
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
      AND permissions->>'read' = 'true'
  );
$$;

DROP FUNCTION IF EXISTS public.agent_can_write(UUID);
CREATE FUNCTION public.agent_can_write(row_user_id UUID)
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
      AND permissions->>'write' = 'true'
  );
$$;

-- =============================================================================
-- contexts
-- =============================================================================

DROP POLICY IF EXISTS contexts_agent_policy ON public.contexts;

DROP POLICY IF EXISTS contexts_select_policy ON public.contexts;
CREATE POLICY contexts_select_policy ON public.contexts FOR SELECT
  USING (auth.uid() = user_id OR public.agent_can_read(user_id));

DROP POLICY IF EXISTS contexts_insert_policy ON public.contexts;
CREATE POLICY contexts_insert_policy ON public.contexts FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.agent_can_write(user_id));

DROP POLICY IF EXISTS contexts_update_policy ON public.contexts;
CREATE POLICY contexts_update_policy ON public.contexts FOR UPDATE
  USING (auth.uid() = user_id OR public.agent_can_write(user_id));

DROP POLICY IF EXISTS contexts_delete_policy ON public.contexts;
CREATE POLICY contexts_delete_policy ON public.contexts FOR DELETE
  USING (auth.uid() = user_id OR public.agent_can_write(user_id));

-- =============================================================================
-- projects
-- =============================================================================

DROP POLICY IF EXISTS projects_agent_policy ON public.projects;

DROP POLICY IF EXISTS projects_select_policy ON public.projects;
CREATE POLICY projects_select_policy ON public.projects FOR SELECT
  USING (auth.uid() = user_id OR public.agent_can_read(user_id));

DROP POLICY IF EXISTS projects_insert_policy ON public.projects;
CREATE POLICY projects_insert_policy ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.agent_can_write(user_id));

DROP POLICY IF EXISTS projects_update_policy ON public.projects;
CREATE POLICY projects_update_policy ON public.projects FOR UPDATE
  USING (auth.uid() = user_id OR public.agent_can_write(user_id));

DROP POLICY IF EXISTS projects_delete_policy ON public.projects;
CREATE POLICY projects_delete_policy ON public.projects FOR DELETE
  USING (auth.uid() = user_id OR public.agent_can_write(user_id));

-- =============================================================================
-- project_headings
-- =============================================================================

DROP POLICY IF EXISTS project_headings_agent_policy ON public.project_headings;

DROP POLICY IF EXISTS project_headings_select_policy ON public.project_headings;
CREATE POLICY project_headings_select_policy ON public.project_headings FOR SELECT
  USING (auth.uid() = user_id OR public.agent_can_read(user_id));

DROP POLICY IF EXISTS project_headings_insert_policy ON public.project_headings;
CREATE POLICY project_headings_insert_policy ON public.project_headings FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.agent_can_write(user_id));

DROP POLICY IF EXISTS project_headings_update_policy ON public.project_headings;
CREATE POLICY project_headings_update_policy ON public.project_headings FOR UPDATE
  USING (auth.uid() = user_id OR public.agent_can_write(user_id));

DROP POLICY IF EXISTS project_headings_delete_policy ON public.project_headings;
CREATE POLICY project_headings_delete_policy ON public.project_headings FOR DELETE
  USING (auth.uid() = user_id OR public.agent_can_write(user_id));

-- =============================================================================
-- tasks
-- =============================================================================

DROP POLICY IF EXISTS tasks_agent_policy ON public.tasks;

DROP POLICY IF EXISTS tasks_select_policy ON public.tasks;
CREATE POLICY tasks_select_policy ON public.tasks FOR SELECT
  USING (auth.uid() = user_id OR public.agent_can_read(user_id));

DROP POLICY IF EXISTS tasks_insert_policy ON public.tasks;
CREATE POLICY tasks_insert_policy ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.agent_can_write(user_id));

DROP POLICY IF EXISTS tasks_update_policy ON public.tasks;
CREATE POLICY tasks_update_policy ON public.tasks FOR UPDATE
  USING (auth.uid() = user_id OR public.agent_can_write(user_id));

DROP POLICY IF EXISTS tasks_delete_policy ON public.tasks;
CREATE POLICY tasks_delete_policy ON public.tasks FOR DELETE
  USING (auth.uid() = user_id OR public.agent_can_write(user_id));

-- =============================================================================
-- task_checklists
-- =============================================================================

DROP POLICY IF EXISTS task_checklists_agent_policy ON public.task_checklists;

DROP POLICY IF EXISTS task_checklists_select_policy ON public.task_checklists;
CREATE POLICY task_checklists_select_policy ON public.task_checklists FOR SELECT
  USING (auth.uid() = user_id OR public.agent_can_read(user_id));

DROP POLICY IF EXISTS task_checklists_insert_policy ON public.task_checklists;
CREATE POLICY task_checklists_insert_policy ON public.task_checklists FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.agent_can_write(user_id));

DROP POLICY IF EXISTS task_checklists_update_policy ON public.task_checklists;
CREATE POLICY task_checklists_update_policy ON public.task_checklists FOR UPDATE
  USING (auth.uid() = user_id OR public.agent_can_write(user_id));

DROP POLICY IF EXISTS task_checklists_delete_policy ON public.task_checklists;
CREATE POLICY task_checklists_delete_policy ON public.task_checklists FOR DELETE
  USING (auth.uid() = user_id OR public.agent_can_write(user_id));

-- =============================================================================
-- stakeholders
-- =============================================================================

DROP POLICY IF EXISTS stakeholders_agent_policy ON public.stakeholders;

DROP POLICY IF EXISTS stakeholders_select_policy ON public.stakeholders;
CREATE POLICY stakeholders_select_policy ON public.stakeholders FOR SELECT
  USING (auth.uid() = user_id OR public.agent_can_read(user_id));

DROP POLICY IF EXISTS stakeholders_insert_policy ON public.stakeholders;
CREATE POLICY stakeholders_insert_policy ON public.stakeholders FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.agent_can_write(user_id));

DROP POLICY IF EXISTS stakeholders_update_policy ON public.stakeholders;
CREATE POLICY stakeholders_update_policy ON public.stakeholders FOR UPDATE
  USING (auth.uid() = user_id OR public.agent_can_write(user_id));

DROP POLICY IF EXISTS stakeholders_delete_policy ON public.stakeholders;
CREATE POLICY stakeholders_delete_policy ON public.stakeholders FOR DELETE
  USING (auth.uid() = user_id OR public.agent_can_write(user_id));

-- =============================================================================
-- meetings
-- =============================================================================

DROP POLICY IF EXISTS meetings_agent_policy ON public.meetings;

DROP POLICY IF EXISTS meetings_select_policy ON public.meetings;
CREATE POLICY meetings_select_policy ON public.meetings FOR SELECT
  USING (auth.uid() = user_id OR public.agent_can_read(user_id));

DROP POLICY IF EXISTS meetings_insert_policy ON public.meetings;
CREATE POLICY meetings_insert_policy ON public.meetings FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.agent_can_write(user_id));

DROP POLICY IF EXISTS meetings_update_policy ON public.meetings;
CREATE POLICY meetings_update_policy ON public.meetings FOR UPDATE
  USING (auth.uid() = user_id OR public.agent_can_write(user_id));

DROP POLICY IF EXISTS meetings_delete_policy ON public.meetings;
CREATE POLICY meetings_delete_policy ON public.meetings FOR DELETE
  USING (auth.uid() = user_id OR public.agent_can_write(user_id));

-- =============================================================================
-- meeting_attendees
-- =============================================================================

DROP POLICY IF EXISTS meeting_attendees_agent_policy ON public.meeting_attendees;

DROP POLICY IF EXISTS meeting_attendees_select_policy ON public.meeting_attendees;
CREATE POLICY meeting_attendees_select_policy ON public.meeting_attendees FOR SELECT
  USING (auth.uid() = user_id OR public.agent_can_read(user_id));

DROP POLICY IF EXISTS meeting_attendees_insert_policy ON public.meeting_attendees;
CREATE POLICY meeting_attendees_insert_policy ON public.meeting_attendees FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.agent_can_write(user_id));

DROP POLICY IF EXISTS meeting_attendees_update_policy ON public.meeting_attendees;
CREATE POLICY meeting_attendees_update_policy ON public.meeting_attendees FOR UPDATE
  USING (auth.uid() = user_id OR public.agent_can_write(user_id));

DROP POLICY IF EXISTS meeting_attendees_delete_policy ON public.meeting_attendees;
CREATE POLICY meeting_attendees_delete_policy ON public.meeting_attendees FOR DELETE
  USING (auth.uid() = user_id OR public.agent_can_write(user_id));

-- =============================================================================
-- notes
-- =============================================================================

DROP POLICY IF EXISTS notes_agent_policy ON public.notes;

DROP POLICY IF EXISTS notes_select_policy ON public.notes;
CREATE POLICY notes_select_policy ON public.notes FOR SELECT
  USING (auth.uid() = user_id OR public.agent_can_read(user_id));

DROP POLICY IF EXISTS notes_insert_policy ON public.notes;
CREATE POLICY notes_insert_policy ON public.notes FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.agent_can_write(user_id));

DROP POLICY IF EXISTS notes_update_policy ON public.notes;
CREATE POLICY notes_update_policy ON public.notes FOR UPDATE
  USING (auth.uid() = user_id OR public.agent_can_write(user_id));

DROP POLICY IF EXISTS notes_delete_policy ON public.notes;
CREATE POLICY notes_delete_policy ON public.notes FOR DELETE
  USING (auth.uid() = user_id OR public.agent_can_write(user_id));

-- =============================================================================
-- note_stakeholders
-- =============================================================================

DROP POLICY IF EXISTS note_stakeholders_agent_policy ON public.note_stakeholders;

DROP POLICY IF EXISTS note_stakeholders_select_policy ON public.note_stakeholders;
CREATE POLICY note_stakeholders_select_policy ON public.note_stakeholders FOR SELECT
  USING (auth.uid() = user_id OR public.agent_can_read(user_id));

DROP POLICY IF EXISTS note_stakeholders_insert_policy ON public.note_stakeholders;
CREATE POLICY note_stakeholders_insert_policy ON public.note_stakeholders FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.agent_can_write(user_id));

DROP POLICY IF EXISTS note_stakeholders_update_policy ON public.note_stakeholders;
CREATE POLICY note_stakeholders_update_policy ON public.note_stakeholders FOR UPDATE
  USING (auth.uid() = user_id OR public.agent_can_write(user_id));

DROP POLICY IF EXISTS note_stakeholders_delete_policy ON public.note_stakeholders;
CREATE POLICY note_stakeholders_delete_policy ON public.note_stakeholders FOR DELETE
  USING (auth.uid() = user_id OR public.agent_can_write(user_id));

-- =============================================================================
-- daily_notes
-- =============================================================================

DROP POLICY IF EXISTS daily_notes_agent_policy ON public.daily_notes;

DROP POLICY IF EXISTS daily_notes_select_policy ON public.daily_notes;
CREATE POLICY daily_notes_select_policy ON public.daily_notes FOR SELECT
  USING (auth.uid() = user_id OR public.agent_can_read(user_id));

DROP POLICY IF EXISTS daily_notes_insert_policy ON public.daily_notes;
CREATE POLICY daily_notes_insert_policy ON public.daily_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.agent_can_write(user_id));

DROP POLICY IF EXISTS daily_notes_update_policy ON public.daily_notes;
CREATE POLICY daily_notes_update_policy ON public.daily_notes FOR UPDATE
  USING (auth.uid() = user_id OR public.agent_can_write(user_id));

DROP POLICY IF EXISTS daily_notes_delete_policy ON public.daily_notes;
CREATE POLICY daily_notes_delete_policy ON public.daily_notes FOR DELETE
  USING (auth.uid() = user_id OR public.agent_can_write(user_id));

COMMIT;

-- =============================================================================
-- TEST PLAN
-- =============================================================================
--
-- Run these against a Supabase instance after applying the migration.
-- Each test uses SET LOCAL to simulate different JWT scenarios within a
-- transaction (ROLLBACK after each test to reset state).
--
-- UUIDs used in examples:
--   user1       = 'a0000000-0000-0000-0000-000000000001'
--   user2       = 'b0000000-0000-0000-0000-000000000002'
--   nobody      = 'c0000000-0000-0000-0000-000000000003'
--   agent-rw    = agent with read=true, write=true
--   agent-ro    = agent with read=true, write=false
--   agent-wo    = agent with read=false, write=true
--   agent-none  = agent with read=false, write=false
--
-- Setup (run as service_role / superuser):
--   INSERT INTO auth.users (id) VALUES
--     ('a0000000-0000-0000-0000-000000000001'),
--     ('b0000000-0000-0000-0000-000000000002');
--   INSERT INTO public.ai_agents (id, user_id, name, api_key_hash, permissions) VALUES
--     ('agent-rw',   'a0000000-0000-0000-0000-000000000001', 'RW Agent',   'hash1', '{"read":"true","write":"true"}'),
--     ('agent-ro',   'a0000000-0000-0000-0000-000000000001', 'RO Agent',   'hash2', '{"read":"true","write":"false"}'),
--     ('agent-wo',   'a0000000-0000-0000-0000-000000000001', 'WO Agent',   'hash3', '{"read":"false","write":"true"}'),
--     ('agent-none', 'a0000000-0000-0000-0000-000000000001', 'None Agent', 'hash4', '{"read":"false","write":"false"}');
--   INSERT INTO public.tasks (id, user_id, title, status, created_at, updated_at)
--     VALUES ('task-1', 'a0000000-0000-0000-0000-000000000001', 'User1 task', 'inbox', now()::text, now()::text);
--
-- (a) Normal user access still works:
--   SET LOCAL role TO authenticated;
--   SET LOCAL request.jwt.claims TO '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
--   SELECT * FROM public.tasks;
--   -- EXPECT: returns task-1
--   INSERT INTO public.tasks (id, user_id, title, status, created_at, updated_at)
--     VALUES ('task-u', 'a0000000-0000-0000-0000-000000000001', 'New task', 'inbox', now()::text, now()::text);
--   -- EXPECT: succeeds
--
-- (b) Read-write agent can read and write:
--   SET LOCAL role TO authenticated;
--   SET LOCAL request.jwt.claims TO '{"sub":"c0000000-0000-0000-0000-000000000003","role":"authenticated","agent_id":"agent-rw"}';
--   SELECT * FROM public.tasks;
--   -- EXPECT: returns task-1
--   INSERT INTO public.tasks (id, user_id, title, status, created_at, updated_at)
--     VALUES ('task-2', 'a0000000-0000-0000-0000-000000000001', 'Agent task', 'inbox', now()::text, now()::text);
--   -- EXPECT: succeeds
--
-- (c) Read-only agent can read but cannot write:
--   SET LOCAL role TO authenticated;
--   SET LOCAL request.jwt.claims TO '{"sub":"c0000000-0000-0000-0000-000000000003","role":"authenticated","agent_id":"agent-ro"}';
--   SELECT * FROM public.tasks;
--   -- EXPECT: returns task-1
--   INSERT INTO public.tasks (id, user_id, title, status, created_at, updated_at)
--     VALUES ('task-3', 'a0000000-0000-0000-0000-000000000001', 'Denied task', 'inbox', now()::text, now()::text);
--   -- EXPECT: RLS violation error
--
-- (d) Write-only agent cannot read but can write:
--   SET LOCAL role TO authenticated;
--   SET LOCAL request.jwt.claims TO '{"sub":"c0000000-0000-0000-0000-000000000003","role":"authenticated","agent_id":"agent-wo"}';
--   SELECT * FROM public.tasks;
--   -- EXPECT: 0 rows (no read permission)
--   INSERT INTO public.tasks (id, user_id, title, status, created_at, updated_at)
--     VALUES ('task-4', 'a0000000-0000-0000-0000-000000000001', 'WO task', 'inbox', now()::text, now()::text);
--   -- EXPECT: succeeds
--
-- (e) No-permission agent cannot read or write:
--   SET LOCAL role TO authenticated;
--   SET LOCAL request.jwt.claims TO '{"sub":"c0000000-0000-0000-0000-000000000003","role":"authenticated","agent_id":"agent-none"}';
--   SELECT * FROM public.tasks;
--   -- EXPECT: 0 rows
--   INSERT INTO public.tasks (id, user_id, title, status, created_at, updated_at)
--     VALUES ('task-5', 'a0000000-0000-0000-0000-000000000001', 'Denied task', 'inbox', now()::text, now()::text);
--   -- EXPECT: RLS violation error
--
-- (f) Revoked agent is denied even with permissions set:
--   UPDATE public.ai_agents SET revoked_at = now() WHERE id = 'agent-rw';  -- (as superuser)
--   SET LOCAL role TO authenticated;
--   SET LOCAL request.jwt.claims TO '{"sub":"c0000000-0000-0000-0000-000000000003","role":"authenticated","agent_id":"agent-rw"}';
--   SELECT * FROM public.tasks;
--   -- EXPECT: 0 rows (revoked_at check precedes permissions check)
--
-- (g) Agent cannot access another user's data:
--   SET LOCAL role TO authenticated;
--   SET LOCAL request.jwt.claims TO '{"sub":"c0000000-0000-0000-0000-000000000003","role":"authenticated","agent_id":"agent-rw"}';
--   INSERT INTO public.tasks (id, user_id, title, status, created_at, updated_at)
--     VALUES ('task-6', 'b0000000-0000-0000-0000-000000000002', 'Stolen task', 'inbox', now()::text, now()::text);
--   -- EXPECT: RLS violation error (agent-rw not linked to user2)
--
-- (h) No agent_id claim = normal auth only:
--   SET LOCAL role TO authenticated;
--   SET LOCAL request.jwt.claims TO '{"sub":"c0000000-0000-0000-0000-000000000003","role":"authenticated"}';
--   SELECT * FROM public.tasks;
--   -- EXPECT: 0 rows (sub doesn't match any user_id that owns data)
--
-- (i) ai_agents policies are unchanged — agent cannot un-revoke itself:
--   SET LOCAL role TO authenticated;
--   SET LOCAL request.jwt.claims TO '{"sub":"c0000000-0000-0000-0000-000000000003","role":"authenticated","agent_id":"agent-rw"}';
--   UPDATE public.ai_agents SET revoked_at = NULL WHERE id = 'agent-rw';
--   -- EXPECT: 0 rows updated (write policy on ai_agents requires auth.uid() = user_id)
