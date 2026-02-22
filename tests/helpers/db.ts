import Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';
import type { AsyncDatabase, DbContext } from '../../src/main/db/types';

/**
 * In-memory SQLite database for testing.
 * Extends DbContext with helper methods for setting up test fixtures.
 *
 * db exposes both the AsyncDatabase interface (used by services) and
 * better-sqlite3's prepare() method (used by test assertions that need
 * synchronous raw access).
 */
export interface TestDb extends DbContext {
  // Override db to also expose better-sqlite3's prepare and exec for test assertions
  db: AsyncDatabase & Pick<Database.Database, 'prepare' | 'exec'>;

  // Fixture helpers
  createContext(data: { name: string; color?: string }): string;
  createProject(data: { title: string; context_id?: string }): string;

  // Note helpers
  createNote(data: { title: string; content?: string; context_id?: string; project_id?: string; is_pinned?: boolean }): string;

  // Raw access for assertions
  getRawTask(id: string): RawTask | undefined;
  getRawProject(id: string): RawProject | undefined;
  getRawContext(id: string): RawContext | undefined;
  getRawStakeholder(id: string): RawStakeholder | undefined;
  getRawChecklistItem(id: string): RawChecklistItem | undefined;
  getRawNote(id: string): RawNote | undefined;

  // Cleanup
  close(): void;
}

interface RawTask {
  id: string;
  title: string;
  deleted_at: string | null;
  [key: string]: unknown;
}

interface RawProject {
  id: string;
  title: string;
  deleted_at: string | null;
  [key: string]: unknown;
}

interface RawContext {
  id: string;
  name: string;
  deleted_at: string | null;
  [key: string]: unknown;
}

interface RawStakeholder {
  id: string;
  name: string;
  deleted_at: string | null;
  [key: string]: unknown;
}

interface RawNote {
  id: string;
  title: string;
  content: string | null;
  is_pinned: number;
  deleted_at: string | null;
  [key: string]: unknown;
}

export interface RawChecklistItem {
  id: string;
  task_id: string;
  title: string;
  is_done: number;
  sort_order: number;
  deleted_at: string | null;
  [key: string]: unknown;
}

function createAsyncAdapter(sqliteDb: Database.Database): AsyncDatabase & Pick<Database.Database, 'prepare' | 'exec'> {
  return {
    async execute(sql: string, params: any[] = []): Promise<{ rowsAffected: number }> {
      const result = sqliteDb.prepare(sql).run(...params);
      return { rowsAffected: result.changes };
    },
    async getAll<T>(sql: string, params: any[] = []): Promise<T[]> {
      return sqliteDb.prepare(sql).all(...params) as T[];
    },
    async getOptional<T>(sql: string, params: any[] = []): Promise<T | null> {
      const row = sqliteDb.prepare(sql).get(...params) as T | undefined;
      return row ?? null;
    },
    async writeTransaction<T>(fn: (tx: AsyncDatabase) => Promise<T>): Promise<T> {
      // better-sqlite3 does not support async transaction functions.
      // Use manual BEGIN/COMMIT so we can await the async fn in between.
      const self = createAsyncAdapter(sqliteDb);
      sqliteDb.prepare('BEGIN').run();
      try {
        const result = await fn(self);
        sqliteDb.prepare('COMMIT').run();
        return result;
      } catch (err) {
        sqliteDb.prepare('ROLLBACK').run();
        throw err;
      }
    },
    // Expose prepare() and exec() for test assertions that need synchronous raw access
    prepare: sqliteDb.prepare.bind(sqliteDb),
    exec: sqliteDb.exec.bind(sqliteDb),
  };
}

export function createTestDb(): TestDb {
  const sqliteDb = new Database(':memory:');

  // Create tables
  sqliteDb.exec(`
    CREATE TABLE contexts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT,
      icon TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      context_id TEXT REFERENCES contexts(id),
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT,
      deleted_at TEXT
    );

    CREATE TABLE stakeholders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      organization TEXT,
      role TEXT,
      email TEXT,
      phone TEXT,
      notes TEXT,
      avatar_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'inbox',
      when_date TEXT,
      deadline TEXT,
      project_id TEXT REFERENCES projects(id),
      heading_id TEXT,
      context_id TEXT REFERENCES contexts(id),
      priority TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT,
      deleted_at TEXT,
      permanently_deleted_at TEXT,
      stale_at TEXT
    );

    CREATE TABLE task_checklists (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id),
      title TEXT NOT NULL,
      is_done INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );
  `);

  sqliteDb.exec(`
    CREATE TABLE notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT,
      context_id TEXT REFERENCES contexts(id),
      project_id TEXT REFERENCES projects(id),
      is_pinned INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );
  `);

  const db = createAsyncAdapter(sqliteDb);

  return {
    db,

    createContext({ name, color }) {
      const id = uuid();
      const now = new Date().toISOString();
      sqliteDb.prepare(`
        INSERT INTO contexts (id, name, color, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, name, color ?? null, now, now);
      return id;
    },

    createNote({ title, content, context_id, project_id, is_pinned }) {
      const id = uuid();
      const now = new Date().toISOString();
      sqliteDb.prepare(`
        INSERT INTO notes (id, title, content, context_id, project_id, is_pinned, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, title, content ?? null, context_id ?? null, project_id ?? null, is_pinned ? 1 : 0, now, now);
      return id;
    },

    createProject({ title, context_id }) {
      const id = uuid();
      const now = new Date().toISOString();
      sqliteDb.prepare(`
        INSERT INTO projects (id, title, context_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, title, context_id ?? null, now, now);
      return id;
    },

    getRawTask(id: string) {
      return sqliteDb.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as RawTask | undefined;
    },

    getRawProject(id: string) {
      return sqliteDb.prepare('SELECT * FROM projects WHERE id = ?').get(id) as RawProject | undefined;
    },

    getRawContext(id: string) {
      return sqliteDb.prepare('SELECT * FROM contexts WHERE id = ?').get(id) as RawContext | undefined;
    },

    getRawStakeholder(id: string) {
      return sqliteDb.prepare('SELECT * FROM stakeholders WHERE id = ?').get(id) as RawStakeholder | undefined;
    },

    getRawChecklistItem(id: string) {
      return sqliteDb.prepare('SELECT * FROM task_checklists WHERE id = ?').get(id) as RawChecklistItem | undefined;
    },

    getRawNote(id: string) {
      return sqliteDb.prepare('SELECT * FROM notes WHERE id = ?').get(id) as RawNote | undefined;
    },

    close() {
      sqliteDb.close();
    },
  };
}
