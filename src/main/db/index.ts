import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function initDatabase(): Database.Database {
  const dbPath = path.join(app.getPath('userData'), 'cortex.db');
  db = new Database(dbPath);

  // Performance and integrity pragmas
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  runMigrations(db);
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

function runMigrations(database: Database.Database): void {
  // Create migrations tracking table
  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL
    )
  `);

  // Resolve migrations directory
  const migrationsDir = app.isPackaged
    ? path.join(process.resourcesPath, 'migrations')
    : path.join(app.getAppPath(), 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    console.warn('Migrations directory not found:', migrationsDir);
    return;
  }

  // Read and sort migration files
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const applied = new Set(
    (database.prepare('SELECT name FROM _migrations').all() as { name: string }[])
      .map(r => r.name)
  );

  for (const file of files) {
    const name = path.basename(file, '.sql');
    if (applied.has(name)) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

    database.transaction(() => {
      database.exec(sql);
      database.prepare(
        'INSERT INTO _migrations (name, applied_at) VALUES (?, ?)'
      ).run(name, new Date().toISOString());
    })();

    console.warn(`Migration applied: ${name}`);
  }
}
