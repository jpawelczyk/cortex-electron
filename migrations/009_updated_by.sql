-- Add "last modified by" tracking to all data tables
-- Note: This mirrors supabase/migrations/004_updated_by.sql for local SQLite

-- These columns track WHO made the last update (updated_at already tracks WHEN)
-- source/agent_id track the CREATOR, updated_by_* track the LAST MODIFIER

ALTER TABLE tasks ADD COLUMN updated_by_source TEXT;
ALTER TABLE tasks ADD COLUMN updated_by_agent_id TEXT;

ALTER TABLE projects ADD COLUMN updated_by_source TEXT;
ALTER TABLE projects ADD COLUMN updated_by_agent_id TEXT;

ALTER TABLE notes ADD COLUMN updated_by_source TEXT;
ALTER TABLE notes ADD COLUMN updated_by_agent_id TEXT;

ALTER TABLE meetings ADD COLUMN updated_by_source TEXT;
ALTER TABLE meetings ADD COLUMN updated_by_agent_id TEXT;

ALTER TABLE stakeholders ADD COLUMN updated_by_source TEXT;
ALTER TABLE stakeholders ADD COLUMN updated_by_agent_id TEXT;

ALTER TABLE daily_notes ADD COLUMN updated_by_source TEXT;
ALTER TABLE daily_notes ADD COLUMN updated_by_agent_id TEXT;

ALTER TABLE contexts ADD COLUMN updated_by_source TEXT;
ALTER TABLE contexts ADD COLUMN updated_by_agent_id TEXT;

ALTER TABLE project_headings ADD COLUMN updated_by_source TEXT;
ALTER TABLE project_headings ADD COLUMN updated_by_agent_id TEXT;

ALTER TABLE task_checklists ADD COLUMN updated_by_source TEXT;
ALTER TABLE task_checklists ADD COLUMN updated_by_agent_id TEXT;
