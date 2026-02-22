import { v4 as uuid } from 'uuid';
import type { ChecklistItem, CreateChecklistItemInput, UpdateChecklistItemInput } from '@shared/types';
import type { DbContext } from '../db/types';

export interface ChecklistService {
  listByTask(taskId: string): Promise<ChecklistItem[]>;
  create(input: CreateChecklistItemInput): Promise<ChecklistItem>;
  update(id: string, input: UpdateChecklistItemInput): Promise<ChecklistItem>;
  delete(id: string): Promise<void>;
  reorder(taskId: string, itemIds: string[]): Promise<void>;
}

interface RawChecklistRow {
  id: string;
  task_id: string;
  title: string;
  is_done: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function toChecklistItem(row: RawChecklistRow): ChecklistItem {
  return { ...row, is_done: !!row.is_done };
}

export function createChecklistService(ctx: DbContext): ChecklistService {
  const { db } = ctx;

  return {
    async create(input: CreateChecklistItemInput): Promise<ChecklistItem> {
      const id = uuid();
      const now = new Date().toISOString();

      const orderRow = await db.getOptional<{ next_order: number }>(
        'SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order FROM task_checklists WHERE task_id = ? AND deleted_at IS NULL',
        [input.task_id]
      );
      const next_order = orderRow?.next_order ?? 0;

      await db.execute(
        'INSERT INTO task_checklists (id, task_id, title, is_done, sort_order, created_at, updated_at, deleted_at) VALUES (?, ?, ?, 0, ?, ?, ?, NULL)',
        [id, input.task_id, input.title, next_order, now, now]
      );

      return {
        id,
        task_id: input.task_id,
        title: input.title,
        is_done: false,
        sort_order: next_order,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };
    },

    async listByTask(taskId: string): Promise<ChecklistItem[]> {
      const rows = await db.getAll<RawChecklistRow>(
        'SELECT * FROM task_checklists WHERE task_id = ? AND deleted_at IS NULL ORDER BY sort_order',
        [taskId]
      );
      return rows.map(toChecklistItem);
    },

    async update(id: string, input: UpdateChecklistItemInput): Promise<ChecklistItem> {
      const existing = await db.getOptional<RawChecklistRow>(
        'SELECT * FROM task_checklists WHERE id = ? AND deleted_at IS NULL',
        [id]
      );

      if (!existing) {
        throw new Error('Checklist item not found');
      }

      const now = new Date().toISOString();
      const title = input.title ?? existing.title;
      const is_done = input.is_done !== undefined ? (input.is_done ? 1 : 0) : existing.is_done;
      const sort_order = input.sort_order ?? existing.sort_order;

      await db.execute(
        'UPDATE task_checklists SET title = ?, is_done = ?, sort_order = ?, updated_at = ? WHERE id = ?',
        [title, is_done, sort_order, now, id]
      );

      return toChecklistItem({
        ...existing,
        title,
        is_done,
        sort_order,
        updated_at: now,
      });
    },

    async delete(id: string): Promise<void> {
      const existing = await db.getOptional<RawChecklistRow>(
        'SELECT * FROM task_checklists WHERE id = ? AND deleted_at IS NULL',
        [id]
      );

      if (!existing) {
        throw new Error('Checklist item not found');
      }

      const now = new Date().toISOString();
      await db.execute(
        'UPDATE task_checklists SET deleted_at = ?, updated_at = ? WHERE id = ?',
        [now, now, id]
      );
    },

    async reorder(taskId: string, itemIds: string[]): Promise<void> {
      const now = new Date().toISOString();

      await db.writeTransaction(async (tx) => {
        for (let i = 0; i < itemIds.length; i++) {
          await tx.execute(
            'UPDATE task_checklists SET sort_order = ?, updated_at = ? WHERE id = ? AND task_id = ?',
            [i, now, itemIds[i], taskId]
          );
        }
      });
    },
  };
}
