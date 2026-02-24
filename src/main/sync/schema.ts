import { column, Schema, Table } from '@powersync/common';

const tasks = new Table({
  title: column.text,
  notes: column.text,
  status: column.text,
  when_date: column.text,
  deadline: column.text,
  project_id: column.text,
  heading_id: column.text,
  context_id: column.text,
  priority: column.text,
  sort_order: column.integer,
  created_at: column.text,
  updated_at: column.text,
  completed_at: column.text,
  deleted_at: column.text,
  permanently_deleted_at: column.text,
  stale_at: column.text,
  assignee_id: column.text,
  source: column.text,
  agent_id: column.text,
  updated_by_source: column.text,
  updated_by_agent_id: column.text,
});

const projects = new Table({
  title: column.text,
  description: column.text,
  status: column.text,
  context_id: column.text,
  sort_order: column.integer,
  created_at: column.text,
  updated_at: column.text,
  completed_at: column.text,
  deleted_at: column.text,
  owner_type: column.text,
  owner_stakeholder_id: column.text,
  source: column.text,
  agent_id: column.text,
  updated_by_source: column.text,
  updated_by_agent_id: column.text,
});

const contexts = new Table({
  name: column.text,
  color: column.text,
  icon: column.text,
  sort_order: column.integer,
  created_at: column.text,
  updated_at: column.text,
  deleted_at: column.text,
  source: column.text,
  agent_id: column.text,
  updated_by_source: column.text,
  updated_by_agent_id: column.text,
});

const project_headings = new Table({
  project_id: column.text,
  title: column.text,
  sort_order: column.integer,
  created_at: column.text,
  updated_at: column.text,
  deleted_at: column.text,
  source: column.text,
  agent_id: column.text,
  updated_by_source: column.text,
  updated_by_agent_id: column.text,
});

const task_checklists = new Table({
  task_id: column.text,
  title: column.text,
  is_done: column.integer,
  sort_order: column.integer,
  created_at: column.text,
  updated_at: column.text,
  deleted_at: column.text,
  source: column.text,
  agent_id: column.text,
  updated_by_source: column.text,
  updated_by_agent_id: column.text,
});

const stakeholders = new Table({
  name: column.text,
  organization: column.text,
  role: column.text,
  email: column.text,
  phone: column.text,
  notes: column.text,
  avatar_url: column.text,
  created_at: column.text,
  updated_at: column.text,
  deleted_at: column.text,
  source: column.text,
  agent_id: column.text,
  updated_by_source: column.text,
  updated_by_agent_id: column.text,
});

const meetings = new Table({
  title: column.text,
  description: column.text,
  start_time: column.text,
  end_time: column.text,
  is_all_day: column.integer,
  location: column.text,
  meeting_url: column.text,
  status: column.text,
  context_id: column.text,
  project_id: column.text,
  notes: column.text,
  audio_path: column.text,
  recording_duration: column.integer,
  transcript: column.text,
  transcript_segments: column.text,
  transcription_status: column.text,
  created_at: column.text,
  updated_at: column.text,
  deleted_at: column.text,
  source: column.text,
  agent_id: column.text,
  updated_by_source: column.text,
  updated_by_agent_id: column.text,
});

const meeting_attendees = new Table({
  meeting_id: column.text,
  stakeholder_id: column.text,
  source: column.text,
  agent_id: column.text,
});

const notes = new Table({
  title: column.text,
  content: column.text,
  context_id: column.text,
  project_id: column.text,
  is_pinned: column.integer,
  created_at: column.text,
  updated_at: column.text,
  deleted_at: column.text,
  source: column.text,
  agent_id: column.text,
  updated_by_source: column.text,
  updated_by_agent_id: column.text,
});

const note_stakeholders = new Table({
  note_id: column.text,
  stakeholder_id: column.text,
  source: column.text,
  agent_id: column.text,
});

const project_stakeholders = new Table({
  project_id: column.text,
  stakeholder_id: column.text,
  created_at: column.text,
  source: column.text,
  agent_id: column.text,
});

const daily_notes = new Table({
  date: column.text,
  content: column.text,
  created_at: column.text,
  updated_at: column.text,
  source: column.text,
  agent_id: column.text,
  updated_by_source: column.text,
  updated_by_agent_id: column.text,
});

const ai_agents = new Table({
  name: column.text,
  api_key_hash: column.text,
  permissions: column.text,
  last_used_at: column.text,
  created_at: column.text,
  revoked_at: column.text,
});

export const AppSchema = new Schema({
  tasks,
  projects,
  contexts,
  project_headings,
  task_checklists,
  stakeholders,
  meetings,
  meeting_attendees,
  notes,
  note_stakeholders,
  project_stakeholders,
  daily_notes,
  ai_agents,
});
