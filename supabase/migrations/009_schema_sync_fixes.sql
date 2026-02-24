-- Fix schema mismatches between local PowerSync and Supabase
-- These columns exist locally but were missing from Supabase

-- ============================================
-- MEETINGS: Missing columns
-- ============================================
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS meeting_url TEXT;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'scheduled';
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS audio_path TEXT;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS recording_duration INTEGER;

-- ============================================
-- PROJECTS: Missing owner columns
-- ============================================
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS owner_type TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS owner_stakeholder_id TEXT REFERENCES public.stakeholders(id);
