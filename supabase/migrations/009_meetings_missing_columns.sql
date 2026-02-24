-- Add missing columns to meetings table
-- These were added to the local schema but not synced to Supabase

ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS meeting_url TEXT;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'scheduled';
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS audio_path TEXT;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS recording_duration INTEGER;

-- Also add source/agent tracking columns for consistency with other tables
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS agent_id TEXT;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS updated_by_source TEXT;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS updated_by_agent_id TEXT;

-- Update the PowerSync publication to ensure meetings is included
-- (Already included, but this is idempotent)
