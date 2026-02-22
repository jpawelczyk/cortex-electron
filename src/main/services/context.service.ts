import { v4 as uuid } from 'uuid';
import type { Context, Project, Task, CreateContextInput, UpdateContextInput } from '@shared/types';
import type { DbContext } from '../db/types';

export interface ContextService {
  create(input: CreateContextInput): Promise<Context>;
  get(id: string): Promise<Context | null>;
  getAll(): Promise<Context[]>;
  update(id: string, input: UpdateContextInput): Promise<Context>;
  delete(id: string): Promise<void>;
  getProjectsForContext(contextId: string): Promise<Project[]>;
  getTasksForContext(contextId: string): Promise<Task[]>;
}

const DEFAULT_CONTEXTS: { name: string; color: string; icon: string; sort_order: number }[] = [
  { name: 'Work', color: '#f97316', icon: 'Briefcase', sort_order: 0 },
  { name: 'Personal', color: '#22c55e', icon: 'Home', sort_order: 1 },
  { name: 'Research', color: '#06b6d4', icon: 'FlaskConical', sort_order: 2 },
];

export async function seedDefaultContexts(ctx: DbContext): Promise<void> {
  const { db } = ctx;

  const count = await db.getOptional<{ count: number }>(
    'SELECT COUNT(*) as count FROM contexts WHERE deleted_at IS NULL'
  );

  if (count && count.count > 0) return;

  const now = new Date().toISOString();

  for (const def of DEFAULT_CONTEXTS) {
    await db.execute(
      'INSERT INTO contexts (id, name, color, icon, sort_order, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [uuid(), def.name, def.color, def.icon, def.sort_order, now, now, null]
    );
  }
}

export function createContextService(ctx: DbContext): ContextService {
  const { db } = ctx;

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

      await db.execute(`
        INSERT INTO contexts (
          id, name, color, icon, sort_order,
          created_at, updated_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        context.id, context.name, context.color, context.icon, context.sort_order,
        context.created_at, context.updated_at, context.deleted_at,
      ]);

      return context;
    },

    async get(id: string): Promise<Context | null> {
      return db.getOptional<Context>(
        'SELECT * FROM contexts WHERE id = ? AND deleted_at IS NULL',
        [id]
      );
    },

    async getAll(): Promise<Context[]> {
      return db.getAll<Context>(
        'SELECT * FROM contexts WHERE deleted_at IS NULL ORDER BY sort_order, created_at'
      );
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

      await db.execute(`
        UPDATE contexts SET
          name = ?, color = ?, icon = ?, sort_order = ?, updated_at = ?
        WHERE id = ?
      `, [
        updated.name, updated.color, updated.icon, updated.sort_order, updated.updated_at,
        id,
      ]);

      return updated;
    },

    async delete(id: string): Promise<void> {
      const existing = await this.get(id);
      if (!existing) {
        throw new Error('Context not found');
      }

      const now = new Date().toISOString();

      await db.writeTransaction(async (tx) => {
        await tx.execute(
          'UPDATE contexts SET deleted_at = ?, updated_at = ? WHERE id = ?',
          [now, now, id]
        );

        // Orphan all items belonging to this context
        await tx.execute(
          'UPDATE projects SET context_id = NULL, updated_at = ? WHERE context_id = ?',
          [now, id]
        );
        await tx.execute(
          'UPDATE tasks SET context_id = NULL, updated_at = ? WHERE context_id = ?',
          [now, id]
        );
      });
    },

    async getProjectsForContext(contextId: string): Promise<Project[]> {
      return db.getAll<Project>(
        'SELECT * FROM projects WHERE context_id = ? AND deleted_at IS NULL ORDER BY sort_order, created_at',
        [contextId]
      );
    },

    async getTasksForContext(contextId: string): Promise<Task[]> {
      return db.getAll<Task>(
        'SELECT * FROM tasks WHERE context_id = ? AND deleted_at IS NULL ORDER BY sort_order, created_at',
        [contextId]
      );
    },
  };
}
