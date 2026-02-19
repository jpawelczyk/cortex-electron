-- Fix invariant: inbox/anytime/someday tasks should never have when_date set.
UPDATE tasks SET when_date = NULL, updated_at = datetime('now')
WHERE status IN ('inbox', 'anytime', 'someday')
  AND when_date IS NOT NULL
  AND deleted_at IS NULL;
