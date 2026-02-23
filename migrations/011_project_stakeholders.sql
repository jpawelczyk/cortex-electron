-- Add project ownership columns
ALTER TABLE projects ADD COLUMN owner_type TEXT DEFAULT 'user' CHECK (owner_type IN ('user', 'stakeholder'));
ALTER TABLE projects ADD COLUMN owner_stakeholder_id TEXT REFERENCES stakeholders(id);

-- Create project_stakeholders junction table
CREATE TABLE IF NOT EXISTS project_stakeholders (
  project_id TEXT NOT NULL REFERENCES projects(id),
  stakeholder_id TEXT NOT NULL REFERENCES stakeholders(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (project_id, stakeholder_id)
);
