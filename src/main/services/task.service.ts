import { randomUUID } from 'crypto';
import type { Task, CreateTaskInput, UpdateTaskInput, TaskStatus } from '@shared/types';
import type { DbContext } from '../db/types';

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getUTCDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

function isTerminalStatus(s: TaskStatus): boolean {
  return s === 'logbook' || s === 'cancelled';
}

function deriveStatusFromDate(whenDate: string): TaskStatus {
  return whenDate <= getToday() ? 'today' : 'upcoming';
}

export interface TaskService {
  create(input: CreateTaskInput): Promise<Task>;
  get(id: string): Promise<Task | null>;
  list(): Promise<Task[]>;
  update(id: string, input: UpdateTaskInput): Promise<Task>;
  delete(id: string): Promise<void>;
  listTrashed(): Promise<Task[]>;
  restore(id: string): Promise<Task>;
  emptyTrash(): Promise<void>;
  purgeExpiredTrash(days: number): Promise<void>;
  markStaleTasks(thresholdDays: number): Promise<number>;
}

export function createTaskService(ctx: DbContext): TaskService {
  const { db } = ctx;

  /**
   * Get project's context_id for inheritance
   */
  async function getProjectContextId(projectId: string): Promise<string | null> {
    const project = await db.getOptional<{ context_id: string | null }>(
      'SELECT context_id FROM projects WHERE id = ? AND deleted_at IS NULL',
      [projectId]
    );
    return project?.context_id ?? null;
  }

  return {
    async create(input: CreateTaskInput): Promise<Task> {
      const id = randomUUID();
      const now = new Date().toISOString();

      // Determine context_id: inherit from project if project_id is set
      let contextId: string | null = null;
      if (input.project_id) {
        contextId = await getProjectContextId(input.project_id);
      } else {
        contextId = input.context_id ?? null;
      }

      // Auto-sync: enforce when_date ↔ status invariant
      let status: TaskStatus = input.status ?? 'inbox';
      let whenDate: string | null = input.when_date ?? null;
      if (whenDate && !input.status) {
        status = deriveStatusFromDate(whenDate);
      }
      // Clear when_date for statuses that don't use scheduling
      if (status === 'inbox' || status === 'anytime' || status === 'someday') {
        whenDate = null;
      }

      const task: Task = {
        id,
        title: input.title,
        notes: input.notes ?? null,
        status,
        when_date: whenDate,
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
        stale_at: null,
        assignee_id: null,
      };

      await db.execute(`
        INSERT INTO tasks (
          id, title, notes, status, when_date, deadline,
          project_id, heading_id, context_id, priority,
          sort_order, created_at, updated_at, completed_at, deleted_at, stale_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?
        )
      `, [
        task.id, task.title, task.notes, task.status, task.when_date, task.deadline,
        task.project_id, task.heading_id, task.context_id, task.priority,
        task.sort_order, task.created_at, task.updated_at, task.completed_at, task.deleted_at, task.stale_at,
      ]);

      return task;
    },

    async get(id: string): Promise<Task | null> {
      return db.getOptional<Task>(
        'SELECT * FROM tasks WHERE id = ? AND deleted_at IS NULL',
        [id]
      );
    },

    async list(): Promise<Task[]> {
      return db.getAll<Task>(
        'SELECT * FROM tasks WHERE deleted_at IS NULL ORDER BY sort_order, created_at'
      );
    },

    async update(id: string, input: UpdateTaskInput): Promise<Task> {
      // Check task exists
      const existing = await this.get(id);
      if (!existing) {
        throw new Error('Task not found');
      }

      const now = new Date().toISOString();

      // Auto-sync when_date ↔ status
      const statusExplicit = 'status' in input;
      const whenDateExplicit = 'when_date' in input;

      let derivedStatus: TaskStatus = statusExplicit ? input.status! : existing.status;
      let derivedWhenDate: string | null = whenDateExplicit ? (input.when_date ?? null) : existing.when_date;

      // Rule 1: when_date changed, status not explicit → derive status
      if (whenDateExplicit && !statusExplicit && !isTerminalStatus(existing.status)) {
        if (derivedWhenDate === null) {
          if (existing.status !== 'inbox' && existing.status !== 'someday') {
            derivedStatus = 'anytime';
          }
        } else {
          derivedStatus = deriveStatusFromDate(derivedWhenDate);
        }
      }

      // Rule 1 extension: stale tasks with when_date change → re-derive
      // (already handled above since stale is not terminal and not inbox/someday)

      // Rule 2: status changed, when_date not explicit → derive when_date
      if (statusExplicit && !whenDateExplicit) {
        if (input.status === 'inbox' || input.status === 'anytime' || input.status === 'someday') {
          derivedWhenDate = null;
        }
      }

      // Rule 2 extension: setting status to stale → preserve when_date (like today/upcoming)

      // Determine if completing or uncompleting (use derivedStatus)
      const isCompleting = derivedStatus === 'logbook' && existing.status !== 'logbook';
      const isUncompleting = derivedStatus !== 'logbook' && existing.status === 'logbook';
      const completedAt = isCompleting ? now : isUncompleting ? null : existing.completed_at;

      // Handle stale_at: clear when leaving stale, preserve when staying stale
      const staleAt = derivedStatus === 'stale' ? existing.stale_at : null;

      // Build update
      const updated: Task = {
        ...existing,
        ...input,
        status: derivedStatus,
        when_date: derivedWhenDate,
        updated_at: now,
        completed_at: completedAt,
        stale_at: staleAt,
      };

      await db.execute(`
        UPDATE tasks SET
          title = ?, notes = ?, status = ?, when_date = ?, deadline = ?,
          project_id = ?, heading_id = ?, context_id = ?, priority = ?,
          sort_order = ?, updated_at = ?, completed_at = ?, stale_at = ?, assignee_id = ?
        WHERE id = ?
      `, [
        updated.title, updated.notes, updated.status, updated.when_date, updated.deadline,
        updated.project_id, updated.heading_id, updated.context_id, updated.priority,
        updated.sort_order, updated.updated_at, updated.completed_at, updated.stale_at, updated.assignee_id,
        id,
      ]);

      return updated;
    },

    async delete(id: string): Promise<void> {
      const now = new Date().toISOString();
      await db.writeTransaction(async (tx) => {
        await tx.execute(
          'UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE id = ?',
          [now, now, id]
        );
        await tx.execute(
          'UPDATE task_checklists SET deleted_at = ?, updated_at = ? WHERE task_id = ? AND deleted_at IS NULL',
          [now, now, id]
        );
      });
    },

    async listTrashed(): Promise<Task[]> {
      return db.getAll<Task>(
        'SELECT * FROM tasks WHERE deleted_at IS NOT NULL AND permanently_deleted_at IS NULL ORDER BY deleted_at DESC'
      );
    },

    async restore(id: string): Promise<Task> {
      const row = await db.getOptional<Task>(
        'SELECT * FROM tasks WHERE id = ? AND deleted_at IS NOT NULL AND permanently_deleted_at IS NULL',
        [id]
      );

      if (!row) {
        throw new Error('Task is not in trash');
      }

      const now = new Date().toISOString();
      await db.execute(
        'UPDATE tasks SET deleted_at = NULL, status = ?, updated_at = ? WHERE id = ?',
        ['inbox', now, id]
      );

      return { ...row, deleted_at: null, status: 'inbox', updated_at: now };
    },

    async emptyTrash(): Promise<void> {
      const now = new Date().toISOString();
      await db.execute(
        'UPDATE tasks SET permanently_deleted_at = ? WHERE deleted_at IS NOT NULL AND permanently_deleted_at IS NULL',
        [now]
      );
    },

    async purgeExpiredTrash(days: number): Promise<void> {
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const now = new Date().toISOString();
      await db.execute(
        'UPDATE tasks SET permanently_deleted_at = ? WHERE deleted_at IS NOT NULL AND permanently_deleted_at IS NULL AND deleted_at < ?',
        [now, cutoff]
      );
    },

    async markStaleTasks(thresholdDays: number): Promise<number> {
      const now = new Date().toISOString();
      const today = getToday();
      // Calculate the cutoff date using UTC to avoid timezone drift.
      // when_date must be strictly before (today - thresholdDays) in UTC.
      const cutoff = new Date(Date.UTC(
        new Date().getUTCFullYear(),
        new Date().getUTCMonth(),
        new Date().getUTCDate() - thresholdDays,
      ));
      const cutoffDate = getUTCDateString(cutoff);

      const result = await db.execute(`
        UPDATE tasks SET
          status = 'stale',
          stale_at = COALESCE(stale_at, ?),
          updated_at = ?
        WHERE when_date IS NOT NULL
          AND when_date < ?
          AND status IN ('today', 'upcoming')
          AND (deadline IS NULL OR deadline >= ?)
          AND deleted_at IS NULL
          AND completed_at IS NULL
      `, [now, now, cutoffDate, today]);

      return result.rowsAffected;
    },
  };
}
