-- Drop unused columns and table from the original sync approach (vector clocks
-- and event log) that were never implemented. No application code references
-- these; they were scaffolded in 001_initial.sql and then superseded by
-- PowerSync for sync and conflict resolution.

ALTER TABLE projects DROP COLUMN IF EXISTS vector_clock;
ALTER TABLE tasks DROP COLUMN IF EXISTS vector_clock;
DROP TABLE IF EXISTS event_log;
