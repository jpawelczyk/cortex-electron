-- Add location, meeting URL, and status to meetings
ALTER TABLE meetings ADD COLUMN location TEXT;
ALTER TABLE meetings ADD COLUMN meeting_url TEXT;
ALTER TABLE meetings ADD COLUMN status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled'));
