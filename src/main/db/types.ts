export interface QueryResult {
  rowsAffected: number;
}

export interface AsyncDatabase {
  /** Execute a write query (INSERT, UPDATE, DELETE) */
  execute(sql: string, params?: any[]): Promise<QueryResult>;

  /** Get all rows matching a query */
  getAll<T>(sql: string, params?: any[]): Promise<T[]>;

  /** Get a single row or null */
  getOptional<T>(sql: string, params?: any[]): Promise<T | null>;

  /** Execute multiple statements in a write transaction */
  writeTransaction<T>(fn: (tx: AsyncDatabase) => Promise<T>): Promise<T>;
}

export interface DbContext {
  db: AsyncDatabase;
}
