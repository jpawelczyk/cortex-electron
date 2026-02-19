-- Fix tasks with out-of-sync when_date and status.
-- Rule: when_date is the source of truth; derive status from it.

-- Case 1: inbox/anytime/someday with when_date <= today → status = 'today'
UPDATE tasks SET status = 'today', updated_at = datetime('now')
WHERE status IN ('inbox', 'anytime', 'someday')
  AND when_date IS NOT NULL
  AND when_date <= date('now')
  AND deleted_at IS NULL;

-- Case 2: inbox/anytime/someday with when_date > today → status = 'upcoming'
UPDATE tasks SET status = 'upcoming', updated_at = datetime('now')
WHERE status IN ('inbox', 'anytime', 'someday')
  AND when_date IS NOT NULL
  AND when_date > date('now')
  AND deleted_at IS NULL;

-- Case 3: upcoming with no when_date → status = 'anytime'
UPDATE tasks SET status = 'anytime', updated_at = datetime('now')
WHERE status = 'upcoming'
  AND when_date IS NULL
  AND deleted_at IS NULL;
