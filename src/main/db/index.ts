import { PowerSyncDatabase } from '@powersync/node';
import { app } from 'electron';
import os from 'os';
import path from 'path';
import { Worker } from 'worker_threads';
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
 * Get the PowerSync extension filename for the current platform/arch.
 * Mirrors @powersync/node's getPowerSyncExtensionFilename().
 */
function getExtensionFilename(): string {
  const platform = os.platform();
  const arch = os.arch();
  if (platform === 'darwin') {
    return arch === 'arm64' ? 'libpowersync_aarch64.macos.dylib' : 'libpowersync_x64.macos.dylib';
  } else if (platform === 'linux') {
    if (arch === 'arm64') return 'libpowersync_aarch64.linux.so';
    if (arch === 'x64') return 'libpowersync_x64.linux.so';
    if (arch === 'riscv64') return 'libpowersync_riscv64gc.linux.so';
    throw new Error(`Unsupported Linux architecture: ${arch}`);
  } else if (platform === 'win32') {
    if (arch === 'arm64') return 'powersync_aarch64.dll';
    if (arch === 'x64') return 'powersync_x64.dll';
    if (arch === 'ia32') return 'powersync_x86.dll';
    throw new Error(`Unsupported Windows architecture: ${arch}`);
  }
  throw new Error(`Unsupported platform: ${platform}`);
}

/**
 * In packaged builds, PowerSync resolves the native extension path relative
 * to import.meta.url inside app.asar, but dlopen() can't read from asar
 * archives. We spawn a custom worker that overrides extensionPath to point
 * at the physically unpacked file in app.asar.unpacked/.
 */
function createPackagedOpenWorker() {
  const extensionPath = path.join(
    process.resourcesPath,
    'app.asar.unpacked',
    'node_modules', '@powersync', 'node', 'lib',
    getExtensionFilename()
  );

  return (scriptPath: string | URL, opts?: import('worker_threads').WorkerOptions) => {
    const sqliteWorkerUrl = new URL('./SqliteWorker.js', scriptPath);
    const code = [
      `import { workerData } from 'node:worker_threads';`,
      `import { startPowerSyncWorker } from '${sqliteWorkerUrl.href}';`,
      `startPowerSyncWorker({ extensionPath: () => workerData.extensionPath });`,
    ].join('\n');
    return new Worker(
      new URL(`data:text/javascript,${encodeURIComponent(code)}`),
      { ...opts, workerData: { extensionPath } }
    );
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
      ...(app.isPackaged && { openWorker: createPackagedOpenWorker() }),
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
