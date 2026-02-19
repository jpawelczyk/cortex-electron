import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { createTestDb, TestDb } from '../helpers/db';

interface TaskRow {
  id: string;
  status: string;
  when_date: string | null;
}

describe('003_sync_when_date_status migration', () => {
  let testDb: TestDb;
  let migrationSql: string;

  const today = new Date().toISOString().split('T')[0];
  const past = '2020-01-01';
  const future = '2099-12-31';

  function insertTask(id: string, status: string, whenDate: string | null, deletedAt: string | null = null) {
    const now = new Date().toISOString();
    testDb.db.prepare(`
      INSERT INTO tasks (id, title, status, when_date, created_at, updated_at, deleted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, `Task ${id}`, status, whenDate, now, now, deletedAt);
  }

  function getTask(id: string): TaskRow {
    return testDb.db.prepare('SELECT id, status, when_date FROM tasks WHERE id = ?').get(id) as TaskRow;
  }

  beforeEach(() => {
    testDb = createTestDb();
    migrationSql = fs.readFileSync(
      path.join(__dirname, '../../migrations/003_sync_when_date_status.sql'),
      'utf-8'
    );
  });

  it('inbox with when_date <= today → status becomes today', () => {
    insertTask('1', 'inbox', today);
    insertTask('2', 'inbox', past);

    testDb.db.exec(migrationSql);

    expect(getTask('1').status).toBe('today');
    expect(getTask('2').status).toBe('today');
  });

  it('inbox with future when_date → status becomes upcoming', () => {
    insertTask('1', 'inbox', future);

    testDb.db.exec(migrationSql);

    expect(getTask('1').status).toBe('upcoming');
  });

  it('anytime with when_date → status derived from date', () => {
    insertTask('1', 'anytime', today);
    insertTask('2', 'anytime', future);

    testDb.db.exec(migrationSql);

    expect(getTask('1').status).toBe('today');
    expect(getTask('2').status).toBe('upcoming');
  });

  it('someday with when_date → status derived from date', () => {
    insertTask('1', 'someday', today);
    insertTask('2', 'someday', future);

    testDb.db.exec(migrationSql);

    expect(getTask('1').status).toBe('today');
    expect(getTask('2').status).toBe('upcoming');
  });

  it('upcoming with null when_date → status becomes anytime', () => {
    insertTask('1', 'upcoming', null);

    testDb.db.exec(migrationSql);

    expect(getTask('1').status).toBe('anytime');
  });

  it('does not touch deleted tasks', () => {
    insertTask('1', 'inbox', future, new Date().toISOString());

    testDb.db.exec(migrationSql);

    expect(getTask('1').status).toBe('inbox');
  });

  it('does not touch logbook/cancelled tasks', () => {
    insertTask('1', 'logbook', future);
    insertTask('2', 'cancelled', future);

    testDb.db.exec(migrationSql);

    expect(getTask('1').status).toBe('logbook');
    expect(getTask('2').status).toBe('cancelled');
  });

  it('does not touch already-consistent tasks', () => {
    insertTask('1', 'today', today);
    insertTask('2', 'upcoming', future);
    insertTask('3', 'inbox', null);
    insertTask('4', 'anytime', null);
    insertTask('5', 'someday', null);

    testDb.db.exec(migrationSql);

    expect(getTask('1').status).toBe('today');
    expect(getTask('2').status).toBe('upcoming');
    expect(getTask('3').status).toBe('inbox');
    expect(getTask('4').status).toBe('anytime');
    expect(getTask('5').status).toBe('someday');
  });

  it('preserves when_date values (only changes status)', () => {
    insertTask('1', 'inbox', future);
    insertTask('2', 'upcoming', null);

    testDb.db.exec(migrationSql);

    expect(getTask('1').when_date).toBe(future);
    expect(getTask('2').when_date).toBeNull();
  });
});
