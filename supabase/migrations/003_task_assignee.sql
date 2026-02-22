-- Add assignee field to tasks (can be user or AI agent)
ALTER TABLE public.tasks ADD COLUMN assignee_id TEXT;

-- Index for efficient lookup
CREATE INDEX idx_tasks_assignee ON public.tasks(assignee_id) WHERE deleted_at IS NULL;
