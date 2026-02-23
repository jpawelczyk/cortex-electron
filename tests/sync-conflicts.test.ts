/**
 * Sync Conflict Tests
 *
 * These tests simulate concurrent edit scenarios and verify that Last-Write-Wins (LWW)
 * conflict resolution works correctly — matching the PowerSync + Supabase LWW behavior.
 *
 * PowerSync resolves conflicts at the field level:
 * - Two clients editing DIFFERENT fields → both changes apply (no conflict)
 * - Two clients editing the SAME field → last write wins (higher updated_at wins)
 *
 * The tests directly manipulate the SQLite database to simulate what PowerSync's
 * sync engine does when applying remote changes on top of local state.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, TestDb } from './helpers/db';

interface TaskRow {
  id: string;
  title: string;
  status: string;
  notes: string | null;
  when_date: string | null;
  deadline: string | null;
  updated_at: string;
  completed_at: string | null;
}

describe('Sync Conflict Resolution (LWW)', () => {
  let testDb: TestDb;

  beforeEach(() => {
    testDb = createTestDb();
  });

  afterEach(() => {
    testDb.close();
  });

  function insertTask(id: string, fields: Partial<TaskRow> = {}): void {
    const now = '2026-02-23T10:00:00.000Z';
    testDb.db.prepare(`
      INSERT INTO tasks (id, title, status, notes, when_date, deadline, created_at, updated_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      fields.title ?? 'Test task',
      fields.status ?? 'inbox',
      fields.notes ?? null,
      fields.when_date ?? null,
      fields.deadline ?? null,
      '2026-02-23T10:00:00.000Z',
      fields.updated_at ?? now,
      fields.completed_at ?? null,
    );
  }

  function getTask(id: string): TaskRow {
    return testDb.db.prepare('SELECT id, title, status, notes, when_date, deadline, updated_at, completed_at FROM tasks WHERE id = ?').get(id) as TaskRow;
  }

  /**
   * Simulate LWW merge: apply remote write to a field only if remote updated_at > local updated_at.
   * In PowerSync's LWW model each row has a single updated_at timestamp.
   * If remote is newer, all remote changes win; otherwise local wins.
   */
  function applyRemoteWrite(id: string, remoteFields: Partial<TaskRow & { updated_at: string }>): void {
    const local = getTask(id);
    if (!local) return;

    const remoteUpdatedAt = remoteFields.updated_at ?? new Date().toISOString();
    if (remoteUpdatedAt <= local.updated_at) {
      // Local is newer — remote write is discarded
      return;
    }

    // Remote is newer — apply remote changes
    const setClauses: string[] = [];
    const values: unknown[] = [];

    const updatableFields = ['title', 'status', 'notes', 'when_date', 'deadline', 'completed_at'] as const;
    for (const field of updatableFields) {
      if (field in remoteFields) {
        setClauses.push(`${field} = ?`);
        values.push(remoteFields[field] ?? null);
      }
    }
    setClauses.push('updated_at = ?');
    values.push(remoteUpdatedAt);
    values.push(id);

    testDb.db.prepare(`UPDATE tasks SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
  }

  /**
   * Simulate field-level LWW merge: each field has its own timestamp tracking.
   * This models a more granular approach where individual field changes win independently.
   */
  function applyFieldLevelLWW(
    id: string,
    localFields: Partial<TaskRow & { updated_at: string }>,
    remoteFields: Partial<TaskRow & { updated_at: string }>,
  ): TaskRow {
    // Merge: for each field, whoever has the later updated_at wins
    // Since we're using row-level updated_at, we simulate field-level by
    // applying both writes and resolving per-field based on which timestamp is later

    const localTime = localFields.updated_at ?? '2026-02-23T10:00:00.000Z';
    const remoteTime = remoteFields.updated_at ?? '2026-02-23T10:01:00.000Z';

    const merged: Partial<TaskRow> = {};

    const fieldList = ['title', 'status', 'notes', 'when_date', 'deadline', 'completed_at'] as const;
    for (const field of fieldList) {
      const inLocal = field in localFields;
      const inRemote = field in remoteFields;

      if (inLocal && inRemote) {
        // Both edited — later timestamp wins
        if (remoteTime > localTime) {
          (merged as Record<string, unknown>)[field] = remoteFields[field as keyof typeof remoteFields];
        } else {
          (merged as Record<string, unknown>)[field] = localFields[field as keyof typeof localFields];
        }
      } else if (inRemote) {
        (merged as Record<string, unknown>)[field] = remoteFields[field as keyof typeof remoteFields];
      } else if (inLocal) {
        (merged as Record<string, unknown>)[field] = localFields[field as keyof typeof localFields];
      }
    }

    // Get current task and apply merged result
    const current = getTask(id);
    const result = { ...current, ...merged };

    const maxTime = remoteTime > localTime ? remoteTime : localTime;
    testDb.db.prepare(`
      UPDATE tasks SET title = ?, status = ?, notes = ?, when_date = ?, deadline = ?, completed_at = ?, updated_at = ?
      WHERE id = ?
    `).run(
      result.title,
      result.status,
      result.notes ?? null,
      result.when_date ?? null,
      result.deadline ?? null,
      result.completed_at ?? null,
      maxTime,
      id,
    );

    return getTask(id);
  }

  // ── Concurrent edits on DIFFERENT fields ──────────────────────────────────

  describe('concurrent edits on different fields', () => {
    it('both changes apply when clients edit different fields', () => {
      insertTask('task-1', { title: 'Original', status: 'inbox', notes: null });

      // Client A edits title at T+1
      const localEdit = { title: 'Updated by A', updated_at: '2026-02-23T10:01:00.000Z' };

      // Client B edits notes at T+2 (later)
      const remoteEdit = { notes: 'Added by B', updated_at: '2026-02-23T10:02:00.000Z' };

      const result = applyFieldLevelLWW('task-1', localEdit, remoteEdit);

      // Both changes should be present in the merged result
      expect(result.title).toBe('Updated by A');
      expect(result.notes).toBe('Added by B');
    });

    it('title and status edits from different clients both apply', () => {
      insertTask('task-1', { title: 'Original', status: 'inbox' });

      const localEdit = { title: 'New title', updated_at: '2026-02-23T10:01:00.000Z' };
      const remoteEdit = { status: 'today', updated_at: '2026-02-23T10:02:00.000Z' };

      const result = applyFieldLevelLWW('task-1', localEdit, remoteEdit);

      expect(result.title).toBe('New title');
      expect(result.status).toBe('today');
    });

    it('deadline and when_date edits from different clients both apply', () => {
      insertTask('task-1', { when_date: null, deadline: null });

      const localEdit = { when_date: '2026-03-01', updated_at: '2026-02-23T10:01:00.000Z' };
      const remoteEdit = { deadline: '2026-03-15', updated_at: '2026-02-23T10:02:00.000Z' };

      const result = applyFieldLevelLWW('task-1', localEdit, remoteEdit);

      expect(result.when_date).toBe('2026-03-01');
      expect(result.deadline).toBe('2026-03-15');
    });
  });

  // ── Concurrent edits on the SAME field ────────────────────────────────────

  describe('concurrent edits on same field — last write wins', () => {
    it('later remote write wins when both clients edit title', () => {
      insertTask('task-1', { title: 'Original', updated_at: '2026-02-23T10:00:00.000Z' });

      // Client A applied first (local)
      testDb.db.prepare('UPDATE tasks SET title = ?, updated_at = ? WHERE id = ?')
        .run('Client A title', '2026-02-23T10:01:00.000Z', 'task-1');

      // Client B applied second (remote, later timestamp → should win)
      applyRemoteWrite('task-1', { title: 'Client B title', updated_at: '2026-02-23T10:02:00.000Z' });

      const result = getTask('task-1');
      expect(result.title).toBe('Client B title');
    });

    it('local write wins when it has the later timestamp', () => {
      insertTask('task-1', { title: 'Original', updated_at: '2026-02-23T10:00:00.000Z' });

      // Client A applied second (local, later timestamp → should win)
      testDb.db.prepare('UPDATE tasks SET title = ?, updated_at = ? WHERE id = ?')
        .run('Client A title', '2026-02-23T10:03:00.000Z', 'task-1');

      // Client B applied first (remote, earlier timestamp → should lose)
      applyRemoteWrite('task-1', { title: 'Client B title', updated_at: '2026-02-23T10:02:00.000Z' });

      const result = getTask('task-1');
      expect(result.title).toBe('Client A title');
    });

    it('same-field title edit: field-level LWW uses later timestamp', () => {
      insertTask('task-1', { title: 'Original' });

      const localEdit = { title: 'Local title', updated_at: '2026-02-23T10:01:00.000Z' };
      const remoteEdit = { title: 'Remote title', updated_at: '2026-02-23T10:02:00.000Z' };

      const result = applyFieldLevelLWW('task-1', localEdit, remoteEdit);

      // Remote is later → remote wins
      expect(result.title).toBe('Remote title');
    });

    it('same-field title edit: local wins when local is later', () => {
      insertTask('task-1', { title: 'Original' });

      const localEdit = { title: 'Local title', updated_at: '2026-02-23T10:03:00.000Z' };
      const remoteEdit = { title: 'Remote title', updated_at: '2026-02-23T10:01:00.000Z' };

      const result = applyFieldLevelLWW('task-1', localEdit, remoteEdit);

      // Local is later → local wins
      expect(result.title).toBe('Local title');
    });
  });

  // ── Concurrent status changes ─────────────────────────────────────────────

  describe('concurrent status changes', () => {
    it('later status change wins', () => {
      insertTask('task-1', { status: 'inbox', updated_at: '2026-02-23T10:00:00.000Z' });

      // Client A moves to today
      testDb.db.prepare('UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?')
        .run('today', '2026-02-23T10:01:00.000Z', 'task-1');

      // Client B moves to someday (later) → should win
      applyRemoteWrite('task-1', { status: 'someday', updated_at: '2026-02-23T10:02:00.000Z' });

      const result = getTask('task-1');
      expect(result.status).toBe('someday');
    });

    it('complete on one client, status change on other — later wins', () => {
      insertTask('task-1', { status: 'inbox', updated_at: '2026-02-23T10:00:00.000Z' });

      // Client A completes the task
      testDb.db.prepare('UPDATE tasks SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?')
        .run('logbook', '2026-02-23T10:01:00.000Z', '2026-02-23T10:01:00.000Z', 'task-1');

      // Client B moves to today (earlier) → should lose
      applyRemoteWrite('task-1', { status: 'today', updated_at: '2026-02-23T10:00:30.000Z' });

      const result = getTask('task-1');
      // Client A's completion happened later
      expect(result.status).toBe('logbook');
      expect(result.completed_at).toBe('2026-02-23T10:01:00.000Z');
    });

    it('status change on one client while other completes — later completion wins', () => {
      insertTask('task-1', { status: 'inbox', updated_at: '2026-02-23T10:00:00.000Z' });

      // Client A moves to today
      testDb.db.prepare('UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?')
        .run('today', '2026-02-23T10:01:00.000Z', 'task-1');

      // Client B completes the task (later) → should win
      applyRemoteWrite('task-1', {
        status: 'logbook',
        completed_at: '2026-02-23T10:02:00.000Z',
        updated_at: '2026-02-23T10:02:00.000Z',
      });

      const result = getTask('task-1');
      expect(result.status).toBe('logbook');
      expect(result.completed_at).toBe('2026-02-23T10:02:00.000Z');
    });

    it('two concurrent status changes from different clients — field-level LWW resolves correctly', () => {
      insertTask('task-1', { status: 'inbox' });

      const localEdit = { status: 'today', updated_at: '2026-02-23T10:01:00.000Z' };
      const remoteEdit = { status: 'anytime', updated_at: '2026-02-23T10:02:00.000Z' };

      const result = applyFieldLevelLWW('task-1', localEdit, remoteEdit);

      // Remote is later → remote status wins
      expect(result.status).toBe('anytime');
    });
  });
});
