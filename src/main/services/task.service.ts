import { v4 as uuid } from 'uuid';
import type { Task, CreateTaskInput, UpdateTaskInput } from '@shared/types';
import type { TestDb } from '../../../tests/helpers/db';

export interface TaskService {
  create(input: CreateTaskInput): Promise<Task>;
  get(id: string): Promise<Task | null>;
  list(): Promise<Task[]>;
  update(id: string, input: UpdateTaskInput): Promise<Task>;
  delete(id: string): Promise<void>;
}

export function createTaskService(testDb: TestDb): TaskService {
  const { db } = testDb;

  /**
   * Get project's context_id for inheritance
   */
  function getProjectContextId(projectId: string): string | null {
    const project = db.prepare(
      'SELECT context_id FROM projects WHERE id = ? AND deleted_at IS NULL'
    ).get(projectId) as { context_id: string | null } | undefined;
    return project?.context_id ?? null;
  }

  return {
    async create(input: CreateTaskInput): Promise<Task> {
      const id = uuid();
      const now = new Date().toISOString();
      
      // Determine context_id: inherit from project if project_id is set
      let contextId: string | null = null;
      if (input.project_id) {
        contextId = getProjectContextId(input.project_id);
      } else {
        contextId = input.context_id ?? null;
      }

      const task: Task = {
        id,
        title: input.title,
        notes: input.notes ?? null,
        status: input.status ?? 'inbox',
        when_date: input.when_date ?? null,
        deadline: input.deadline ?? null,
        project_id: input.project_id ?? null,
        heading_id: input.heading_id ?? null,
        context_id: contextId,
        priority: input.priority ?? null,
        sort_order: 0,
        created_at: now,
        updated_at: now,
        completed_at: null,
        deleted_at: null,
      };

      db.prepare(`
        INSERT INTO tasks (
          id, title, notes, status, when_date, deadline,
          project_id, heading_id, context_id, priority,
          sort_order, created_at, updated_at, completed_at, deleted_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?
        )
      `).run(
        task.id, task.title, task.notes, task.status, task.when_date, task.deadline,
        task.project_id, task.heading_id, task.context_id, task.priority,
        task.sort_order, task.created_at, task.updated_at, task.completed_at, task.deleted_at
      );

      return task;
    },

    async get(id: string): Promise<Task | null> {
      const row = db.prepare(
        'SELECT * FROM tasks WHERE id = ? AND deleted_at IS NULL'
      ).get(id) as Task | undefined;
      return row ?? null;
    },

    async list(): Promise<Task[]> {
      const rows = db.prepare(
        'SELECT * FROM tasks WHERE deleted_at IS NULL ORDER BY sort_order, created_at'
      ).all() as Task[];
      return rows;
    },

    async update(id: string, input: UpdateTaskInput): Promise<Task> {
      // Check task exists
      const existing = await this.get(id);
      if (!existing) {
        throw new Error('Task not found');
      }

      const now = new Date().toISOString();
      
      // Determine if completing
      const isCompleting = input.status === 'logbook' && existing.status !== 'logbook';
      const completedAt = isCompleting ? now : existing.completed_at;

      // Build update
      const updated: Task = {
        ...existing,
        ...input,
        updated_at: now,
        completed_at: completedAt,
      };

      db.prepare(`
        UPDATE tasks SET
          title = ?, notes = ?, status = ?, when_date = ?, deadline = ?,
          project_id = ?, heading_id = ?, context_id = ?, priority = ?,
          sort_order = ?, updated_at = ?, completed_at = ?
        WHERE id = ?
      `).run(
        updated.title, updated.notes, updated.status, updated.when_date, updated.deadline,
        updated.project_id, updated.heading_id, updated.context_id, updated.priority,
        updated.sort_order, updated.updated_at, updated.completed_at,
        id
      );

      return updated;
    },

    async delete(id: string): Promise<void> {
      const existing = await this.get(id);
      if (!existing) {
        throw new Error('Task not found');
      }

      const now = new Date().toISOString();
      db.prepare(
        'UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE id = ?'
      ).run(now, now, id);
    },
  };
}
