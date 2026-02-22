-- AI Agents table for API key management
CREATE TABLE IF NOT EXISTS ai_agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  api_key_hash TEXT NOT NULL,
  permissions TEXT DEFAULT '{"read": true, "write": true}',
  last_used_at TEXT,
  created_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_ai_agents_key_hash ON ai_agents(api_key_hash) WHERE revoked_at IS NULL;

-- Add source and agent_id columns to all data tables
ALTER TABLE contexts ADD COLUMN source TEXT DEFAULT 'user' CHECK (source IN ('user', 'ai', 'import', 'api'));
ALTER TABLE contexts ADD COLUMN agent_id TEXT REFERENCES ai_agents(id);

ALTER TABLE projects ADD COLUMN source TEXT DEFAULT 'user' CHECK (source IN ('user', 'ai', 'import', 'api'));
ALTER TABLE projects ADD COLUMN agent_id TEXT REFERENCES ai_agents(id);

ALTER TABLE project_headings ADD COLUMN source TEXT DEFAULT 'user' CHECK (source IN ('user', 'ai', 'import', 'api'));
ALTER TABLE project_headings ADD COLUMN agent_id TEXT REFERENCES ai_agents(id);

ALTER TABLE tasks ADD COLUMN source TEXT DEFAULT 'user' CHECK (source IN ('user', 'ai', 'import', 'api'));
ALTER TABLE tasks ADD COLUMN agent_id TEXT REFERENCES ai_agents(id);

ALTER TABLE task_checklists ADD COLUMN source TEXT DEFAULT 'user' CHECK (source IN ('user', 'ai', 'import', 'api'));
ALTER TABLE task_checklists ADD COLUMN agent_id TEXT REFERENCES ai_agents(id);

ALTER TABLE stakeholders ADD COLUMN source TEXT DEFAULT 'user' CHECK (source IN ('user', 'ai', 'import', 'api'));
ALTER TABLE stakeholders ADD COLUMN agent_id TEXT REFERENCES ai_agents(id);

ALTER TABLE meetings ADD COLUMN source TEXT DEFAULT 'user' CHECK (source IN ('user', 'ai', 'import', 'api'));
ALTER TABLE meetings ADD COLUMN agent_id TEXT REFERENCES ai_agents(id);

ALTER TABLE meeting_attendees ADD COLUMN source TEXT DEFAULT 'user' CHECK (source IN ('user', 'ai', 'import', 'api'));
ALTER TABLE meeting_attendees ADD COLUMN agent_id TEXT REFERENCES ai_agents(id);

ALTER TABLE notes ADD COLUMN source TEXT DEFAULT 'user' CHECK (source IN ('user', 'ai', 'import', 'api'));
ALTER TABLE notes ADD COLUMN agent_id TEXT REFERENCES ai_agents(id);

ALTER TABLE note_stakeholders ADD COLUMN source TEXT DEFAULT 'user' CHECK (source IN ('user', 'ai', 'import', 'api'));
ALTER TABLE note_stakeholders ADD COLUMN agent_id TEXT REFERENCES ai_agents(id);

ALTER TABLE daily_notes ADD COLUMN source TEXT DEFAULT 'user' CHECK (source IN ('user', 'ai', 'import', 'api'));
ALTER TABLE daily_notes ADD COLUMN agent_id TEXT REFERENCES ai_agents(id);
