import type Database from 'better-sqlite3';

export interface DbContext {
  db: Database.Database;
}
