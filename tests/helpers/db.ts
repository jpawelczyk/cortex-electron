import Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';

/**
 * In-memory SQLite database for testing.
 * Provides helper methods for setting up test fixtures.
 */
export interface TestDb {
  db: Database.Database;
  
  // Fixture helpers
  createContext(data: { name: string; color?: string }): string;
  createProject(data: { title: string; context_id?: string }): string;
  
  // Raw access for assertions
  getRawTask(id: string): RawTask | undefined;
  getRawProject(id: string): RawProject | undefined;
  getRawContext(id: string): RawContext | undefined;
  getRawStakeholder(id: string): RawStakeholder | undefined;

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

export function createTestDb(): TestDb {
  const db = new Database(':memory:');
  
  // Create tables
  db.exec(`
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
      deleted_at TEXT
    );
  `);

  return {
    db,

    createContext({ name, color }) {
      const id = uuid();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO contexts (id, name, color, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, name, color ?? null, now, now);
      return id;
    },

    createProject({ title, context_id }) {
      const id = uuid();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO projects (id, title, context_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, title, context_id ?? null, now, now);
      return id;
    },

    getRawTask(id: string) {
      return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as RawTask | undefined;
    },

    getRawProject(id: string) {
      return db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as RawProject | undefined;
    },

    getRawContext(id: string) {
      return db.prepare('SELECT * FROM contexts WHERE id = ?').get(id) as RawContext | undefined;
    },

    getRawStakeholder(id: string) {
      return db.prepare('SELECT * FROM stakeholders WHERE id = ?').get(id) as RawStakeholder | undefined;
    },

    close() {
      db.close();
    },
  };
}
