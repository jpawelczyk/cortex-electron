-- Add permanently_deleted_at to tasks for trash functionality
-- "In trash" = deleted_at IS NOT NULL AND permanently_deleted_at IS NULL
-- "Emptied"  = both deleted_at AND permanently_deleted_at are set
ALTER TABLE tasks ADD COLUMN permanently_deleted_at TEXT;
