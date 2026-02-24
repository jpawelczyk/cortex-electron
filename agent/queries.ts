import { getDatabase } from './db.js';
import type { Task, Project, Note } from '../src/shared/types.js';
import crypto from 'node:crypto';

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  is_all_day: number;
  context_id: string | null;
  project_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface DailyNote {
  id: string;
  date: string;
  content: string | null;
  created_at: string;
  updated_at: string;
}

export interface TodayContext {
  date: string;
  tasks: Task[];
  meetings: Meeting[];
  dailyNote: DailyNote | null;
  overdueTasks: Task[];
  projects: Project[];
}

export async function getTodayTasks(): Promise<Task[]> {
  const db = getDatabase();
  return db.getAll<Task>(
    `SELECT * FROM tasks
     WHERE status = 'today' AND deleted_at IS NULL
     ORDER BY sort_order ASC`,
  );
}

export async function getTasksByStatus(status: string): Promise<Task[]> {
  const db = getDatabase();
  return db.getAll<Task>(
    `SELECT * FROM tasks
     WHERE status = ? AND deleted_at IS NULL
     ORDER BY sort_order ASC`,
    [status],
  );
}

export async function getOverdueTasks(): Promise<Task[]> {
  const db = getDatabase();
  const today = new Date().toISOString().split('T')[0];
  return db.getAll<Task>(
    `SELECT * FROM tasks
     WHERE deadline < ? AND status NOT IN ('logbook', 'cancelled') AND deleted_at IS NULL
     ORDER BY deadline ASC`,
    [today],
  );
}

export async function getUpcomingMeetings(days: number): Promise<Meeting[]> {
  const db = getDatabase();
  const now = new Date().toISOString();
  const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  return db.getAll<Meeting>(
    `SELECT * FROM meetings
     WHERE start_time >= ? AND start_time <= ? AND deleted_at IS NULL
     ORDER BY start_time ASC`,
    [now, until],
  );
}

const AGENT_ID = process.env.CORTEX_AGENT_ID;

export async function createTask(
  title: string,
  options: { status?: string; priority?: string; project_id?: string; when_date?: string; deadline?: string } = {},
): Promise<Task> {
  const db = getDatabase();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const status = options.status ?? 'inbox';

  await db.execute(
    `INSERT INTO tasks (id, title, status, priority, project_id, when_date, deadline, sort_order, created_at, updated_at, source, agent_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'ai', ?)`,
    [id, title, status, options.priority ?? null, options.project_id ?? null, options.when_date ?? null, options.deadline ?? null, now, now, AGENT_ID ?? null],
  );

  const task = await db.getOptional<Task>(
    `SELECT * FROM tasks WHERE id = ?`,
    [id],
  );
  return task!;
}

export async function getDailyNote(date: string): Promise<DailyNote | null> {
  const db = getDatabase();
  return db.getOptional<DailyNote>(
    `SELECT * FROM daily_notes WHERE date = ?`,
    [date],
  );
}

export async function getProjects(status?: string): Promise<Project[]> {
  const db = getDatabase();
  if (status) {
    return db.getAll<Project>(
      `SELECT * FROM projects WHERE status = ? AND deleted_at IS NULL ORDER BY sort_order ASC`,
      [status],
    );
  }
  return db.getAll<Project>(
    `SELECT * FROM projects WHERE deleted_at IS NULL ORDER BY sort_order ASC`,
  );
}

export async function getNotes(): Promise<Note[]> {
  const db = getDatabase();
  return db.getAll<Note>(
    `SELECT * FROM notes WHERE deleted_at IS NULL ORDER BY updated_at DESC`,
  );
}

export async function getAssignedTasks(agentId: string): Promise<Task[]> {
  const db = getDatabase();
  return db.getAll<Task>(
    `SELECT * FROM tasks
     WHERE assignee_id = ?
       AND status NOT IN ('logbook', 'cancelled')
       AND deleted_at IS NULL
     ORDER BY
       CASE priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 ELSE 3 END,
       deadline ASC NULLS LAST`,
    [agentId],
  );
}

const VALID_STATUSES = new Set([
  'inbox', 'today', 'upcoming', 'anytime', 'someday', 'stale', 'logbook', 'cancelled',
]);

export async function updateTask(
  id: string,
  fields: { status?: string; notes?: string },
): Promise<boolean> {
  const db = getDatabase();

  // Verify task exists
  const existing = await db.getOptional<Task>('SELECT id FROM tasks WHERE id = ?', [id]);
  if (!existing) return false;

  const updates: string[] = ['updated_at = ?', 'updated_by_source = ?', 'updated_by_agent_id = ?'];
  const values: unknown[] = [new Date().toISOString(), 'ai', AGENT_ID ?? null];

  if (fields.status !== undefined) {
    if (!VALID_STATUSES.has(fields.status)) {
      throw new Error(`Invalid status: ${fields.status}`);
    }
    updates.push('status = ?');
    values.push(fields.status);
    if (fields.status === 'logbook') {
      updates.push('completed_at = ?');
      values.push(new Date().toISOString());
    }
  }
  if (fields.notes !== undefined) {
    updates.push('notes = ?');
    values.push(fields.notes);
  }

  values.push(id);

  await db.execute(
    `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`,
    values,
  );
  return true;
}

// --- Notes CRUD ---

export async function createNote(
  title: string,
  options: { content?: string; context_id?: string; project_id?: string } = {},
): Promise<Note> {
  const db = getDatabase();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await db.execute(
    `INSERT INTO notes (id, title, content, context_id, project_id, is_pinned, created_at, updated_at, source, agent_id)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?, 'ai', ?)`,
    [id, title, options.content ?? null, options.context_id ?? null, options.project_id ?? null, now, now, AGENT_ID ?? null],
  );

  return (await db.getOptional<Note>('SELECT * FROM notes WHERE id = ?', [id]))!;
}

export async function updateNote(
  id: string,
  fields: { title?: string; content?: string; context_id?: string | null; project_id?: string | null; is_pinned?: number },
): Promise<boolean> {
  const db = getDatabase();
  const existing = await db.getOptional<Note>('SELECT id FROM notes WHERE id = ?', [id]);
  if (!existing) return false;

  const updates: string[] = ['updated_at = ?', 'updated_by_source = ?', 'updated_by_agent_id = ?'];
  const values: unknown[] = [new Date().toISOString(), 'ai', AGENT_ID ?? null];

  if (fields.title !== undefined) { updates.push('title = ?'); values.push(fields.title); }
  if (fields.content !== undefined) { updates.push('content = ?'); values.push(fields.content); }
  if (fields.context_id !== undefined) { updates.push('context_id = ?'); values.push(fields.context_id); }
  if (fields.project_id !== undefined) { updates.push('project_id = ?'); values.push(fields.project_id); }
  if (fields.is_pinned !== undefined) { updates.push('is_pinned = ?'); values.push(fields.is_pinned); }

  values.push(id);
  await db.execute(`UPDATE notes SET ${updates.join(', ')} WHERE id = ?`, values);
  return true;
}

export async function deleteNote(id: string): Promise<boolean> {
  const db = getDatabase();
  const now = new Date().toISOString();
  
  // Use RETURNING clause — rowsAffected is unreliable with PowerSync's JSON table views
  // See: https://github.com/powersync-ja/powersync-js/issues/865
  const result = await db.execute(
    'UPDATE notes SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL RETURNING id',
    [now, now, id],
  );
  return (result.rows?.length ?? 0) > 0;
}

// --- Projects CRUD ---

export async function createProject(
  title: string,
  options: { description?: string; status?: string; context_id?: string } = {},
): Promise<Project> {
  const db = getDatabase();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const status = options.status ?? 'active';

  await db.execute(
    `INSERT INTO projects (id, title, description, status, context_id, sort_order, created_at, updated_at, source, agent_id)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?, 'ai', ?)`,
    [id, title, options.description ?? null, status, options.context_id ?? null, now, now, AGENT_ID ?? null],
  );

  return (await db.getOptional<Project>('SELECT * FROM projects WHERE id = ?', [id]))!;
}

export async function updateProject(
  id: string,
  fields: { title?: string; description?: string; status?: string; context_id?: string | null },
): Promise<boolean> {
  const db = getDatabase();
  const existing = await db.getOptional<Project>('SELECT id FROM projects WHERE id = ?', [id]);
  if (!existing) return false;

  const updates: string[] = ['updated_at = ?', 'updated_by_source = ?', 'updated_by_agent_id = ?'];
  const values: unknown[] = [new Date().toISOString(), 'ai', AGENT_ID ?? null];

  if (fields.title !== undefined) { updates.push('title = ?'); values.push(fields.title); }
  if (fields.description !== undefined) { updates.push('description = ?'); values.push(fields.description); }
  if (fields.status !== undefined) { updates.push('status = ?'); values.push(fields.status); }
  if (fields.context_id !== undefined) { updates.push('context_id = ?'); values.push(fields.context_id); }

  if (fields.status === 'completed') {
    updates.push('completed_at = ?');
    values.push(new Date().toISOString());
  }

  values.push(id);
  await db.execute(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`, values);
  return true;
}

export async function deleteProject(id: string): Promise<boolean> {
  const db = getDatabase();
  const now = new Date().toISOString();
  
  // Use RETURNING clause — rowsAffected is unreliable with PowerSync's JSON table views
  // See: https://github.com/powersync-ja/powersync-js/issues/865
  const result = await db.execute(
    'UPDATE projects SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL RETURNING id',
    [now, now, id],
  );
  return (result.rows?.length ?? 0) > 0;
}

// --- Tasks (delete) ---

export async function deleteTask(id: string): Promise<boolean> {
  const db = getDatabase();
  const now = new Date().toISOString();
  
  // Use RETURNING clause — rowsAffected is unreliable with PowerSync's JSON table views
  // See: https://github.com/powersync-ja/powersync-js/issues/865
  const result = await db.execute(
    'UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL RETURNING id',
    [now, now, id],
  );
  return (result.rows?.length ?? 0) > 0;
}

// --- Context ---

export async function getTodayContext(): Promise<TodayContext> {
  const today = new Date().toISOString().split('T')[0];
  const [tasks, meetings, dailyNote, overdueTasks, projects] = await Promise.all([
    getTodayTasks(),
    getUpcomingMeetings(1),
    getDailyNote(today),
    getOverdueTasks(),
    getProjects('active'),
  ]);

  return {
    date: today,
    tasks,
    meetings,
    dailyNote,
    overdueTasks,
    projects,
  };
}
