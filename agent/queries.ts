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
  const today = new Date().toISOString().split('T')[0];
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

export async function createTask(
  title: string,
  options: { status?: string; priority?: string; project_id?: string; when_date?: string; deadline?: string } = {},
): Promise<Task> {
  const db = getDatabase();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const status = options.status ?? 'inbox';

  await db.execute(
    `INSERT INTO tasks (id, title, status, priority, project_id, when_date, deadline, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    [id, title, status, options.priority ?? null, options.project_id ?? null, options.when_date ?? null, options.deadline ?? null, now, now],
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

  const updates: string[] = [];
  const values: unknown[] = [];

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

  if (updates.length === 0) return true;

  updates.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  await db.execute(
    `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`,
    values,
  );
  return true;
}

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
