import { v4 as uuid } from 'uuid';
import type { Context, Project, Task, CreateContextInput, UpdateContextInput } from '@shared/types';
import type { TestDb } from '../../../tests/helpers/db';

export interface ContextService {
  create(input: CreateContextInput): Promise<Context>;
  get(id: string): Promise<Context | null>;
  getAll(): Promise<Context[]>;
  update(id: string, input: UpdateContextInput): Promise<Context>;
  delete(id: string): Promise<void>;
  getProjectsForContext(contextId: string): Promise<Project[]>;
  getTasksForContext(contextId: string): Promise<Task[]>;
}

export function createContextService(testDb: TestDb): ContextService {
  const { db } = testDb;

  return {
    async create(input: CreateContextInput): Promise<Context> {
      const id = uuid();
      const now = new Date().toISOString();

      const context: Context = {
        id,
        name: input.name,
        color: input.color ?? null,
        icon: input.icon ?? null,
        sort_order: 0,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };

      db.prepare(`
        INSERT INTO contexts (
          id, name, color, icon, sort_order,
          created_at, updated_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        context.id, context.name, context.color, context.icon, context.sort_order,
        context.created_at, context.updated_at, context.deleted_at
      );

      return context;
    },

    async get(id: string): Promise<Context | null> {
      const row = db.prepare(
        'SELECT * FROM contexts WHERE id = ? AND deleted_at IS NULL'
      ).get(id) as Context | undefined;
      return row ?? null;
    },

    async getAll(): Promise<Context[]> {
      return db.prepare(
        'SELECT * FROM contexts WHERE deleted_at IS NULL ORDER BY sort_order, created_at'
      ).all() as Context[];
    },

    async update(id: string, input: UpdateContextInput): Promise<Context> {
      const existing = await this.get(id);
      if (!existing) {
        throw new Error('Context not found');
      }

      const now = new Date().toISOString();

      const updated: Context = {
        ...existing,
        ...input,
        updated_at: now,
      };

      db.prepare(`
        UPDATE contexts SET
          name = ?, color = ?, icon = ?, sort_order = ?, updated_at = ?
        WHERE id = ?
      `).run(
        updated.name, updated.color, updated.icon, updated.sort_order, updated.updated_at,
        id
      );

      return updated;
    },

    async delete(id: string): Promise<void> {
      const existing = await this.get(id);
      if (!existing) {
        throw new Error('Context not found');
      }

      const now = new Date().toISOString();
      db.prepare(
        'UPDATE contexts SET deleted_at = ?, updated_at = ? WHERE id = ?'
      ).run(now, now, id);
    },

    async getProjectsForContext(contextId: string): Promise<Project[]> {
      return db.prepare(
        'SELECT * FROM projects WHERE context_id = ? AND deleted_at IS NULL ORDER BY sort_order, created_at'
      ).all(contextId) as Project[];
    },

    async getTasksForContext(contextId: string): Promise<Task[]> {
      return db.prepare(
        'SELECT * FROM tasks WHERE context_id = ? AND deleted_at IS NULL ORDER BY sort_order, created_at'
      ).all(contextId) as Task[];
    },
  };
}
