-- Add assignee field to tasks (can be user or AI agent)
ALTER TABLE tasks ADD COLUMN assignee_id TEXT;

-- Index for efficient lookup
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id) WHERE deleted_at IS NULL;
