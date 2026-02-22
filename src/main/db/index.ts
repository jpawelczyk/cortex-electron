import { PowerSyncDatabase } from '@powersync/node';
import { app } from 'electron';
import { AppSchema } from '../sync/schema.js';
import type { AsyncDatabase, QueryResult } from './types.js';

let powerSyncDb: PowerSyncDatabase | null = null;

/**
 * Wrap a PowerSync database (or transaction context) in our AsyncDatabase interface.
 */
function createPowerSyncAdapter(
  psDb: Pick<PowerSyncDatabase, 'execute' | 'getAll' | 'getOptional' | 'writeTransaction'>
): AsyncDatabase {
  return {
    async execute(sql: string, params: unknown[] = []): Promise<QueryResult> {
      const result = await psDb.execute(sql, params);
      return { rowsAffected: result.rowsAffected };
    },
    async getAll<T>(sql: string, params: unknown[] = []): Promise<T[]> {
      return await psDb.getAll<T>(sql, params);
    },
    async getOptional<T>(sql: string, params: unknown[] = []): Promise<T | null> {
      return await psDb.getOptional<T>(sql, params);
    },
    async writeTransaction<T>(fn: (tx: AsyncDatabase) => Promise<T>): Promise<T> {
      return await psDb.writeTransaction(async (psTx) => {
        const txAdapter: AsyncDatabase = {
          async execute(sql: string, params: unknown[] = []): Promise<QueryResult> {
            const result = await psTx.execute(sql, params);
            return { rowsAffected: result.rowsAffected };
          },
          async getAll<T>(sql: string, params: unknown[] = []): Promise<T[]> {
            return await psTx.getAll<T>(sql, params);
          },
          async getOptional<T>(sql: string, params: unknown[] = []): Promise<T | null> {
            return await psTx.getOptional<T>(sql, params);
          },
          writeTransaction(): Promise<never> {
            throw new Error('Nested transactions not supported');
          },
        };
        return await fn(txAdapter);
      });
    },
  };
}

/**
 * Initialize the PowerSync database.
 * PowerSync manages the local SQLite file and provides sync capabilities.
 * Returns an AsyncDatabase adapter for the service layer.
 */
export async function initDatabase(): Promise<AsyncDatabase> {
  const psDb = new PowerSyncDatabase({
    schema: AppSchema,
    database: {
      dbFilename: 'cortex.db',
      dbLocation: app.getPath('userData'),
    },
  });

  await psDb.init();
  powerSyncDb = psDb;

  return createPowerSyncAdapter(psDb);
}

/**
 * Get the raw PowerSync database instance (for sync connection).
 */
export function getPowerSyncDatabase(): PowerSyncDatabase {
  if (!powerSyncDb) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return powerSyncDb;
}

/**
 * Close the database and release resources.
 */
export async function closeDatabase(): Promise<void> {
  if (powerSyncDb) {
    await powerSyncDb.close();
    powerSyncDb = null;
  }
}

export { createPowerSyncAdapter };
