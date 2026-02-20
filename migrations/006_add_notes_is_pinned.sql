-- Add is_pinned column to notes table
ALTER TABLE notes ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0;

-- Index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_notes_context ON notes(context_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notes_project ON notes(project_id) WHERE deleted_at IS NULL;
