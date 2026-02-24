-- PowerSync requires an `id` TEXT PRIMARY KEY on every synced table.
-- Recreate all junction tables that lack an id column.

-- meeting_attendees
CREATE TABLE IF NOT EXISTS meeting_attendees_new (
  id TEXT PRIMARY KEY,
  meeting_id TEXT NOT NULL REFERENCES meetings(id),
  stakeholder_id TEXT NOT NULL REFERENCES stakeholders(id),
  UNIQUE (meeting_id, stakeholder_id)
);

INSERT OR IGNORE INTO meeting_attendees_new (id, meeting_id, stakeholder_id)
  SELECT lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))),
         meeting_id, stakeholder_id
  FROM meeting_attendees;

DROP TABLE meeting_attendees;
ALTER TABLE meeting_attendees_new RENAME TO meeting_attendees;

-- note_stakeholders
CREATE TABLE IF NOT EXISTS note_stakeholders_new (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL REFERENCES notes(id),
  stakeholder_id TEXT NOT NULL REFERENCES stakeholders(id),
  UNIQUE (note_id, stakeholder_id)
);

INSERT OR IGNORE INTO note_stakeholders_new (id, note_id, stakeholder_id)
  SELECT lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))),
         note_id, stakeholder_id
  FROM note_stakeholders;

DROP TABLE note_stakeholders;
ALTER TABLE note_stakeholders_new RENAME TO note_stakeholders;

-- project_stakeholders
CREATE TABLE IF NOT EXISTS project_stakeholders_new (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  stakeholder_id TEXT NOT NULL REFERENCES stakeholders(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (project_id, stakeholder_id)
);

INSERT OR IGNORE INTO project_stakeholders_new (id, project_id, stakeholder_id, created_at)
  SELECT lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))),
         project_id, stakeholder_id, created_at
  FROM project_stakeholders;

DROP TABLE project_stakeholders;
ALTER TABLE project_stakeholders_new RENAME TO project_stakeholders;
