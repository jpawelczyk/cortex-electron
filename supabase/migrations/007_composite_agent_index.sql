-- Add composite index to optimize agent task queries that filter by both
-- assignee_id and status. The partial index excludes terminal/deleted rows
-- that agents never need to query.
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_active
  ON public.tasks(assignee_id, status)
  WHERE deleted_at IS NULL
    AND status NOT IN ('logbook', 'cancelled');
