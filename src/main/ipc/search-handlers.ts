import { ipcMain, BrowserWindow } from 'electron';
import { SearchQuerySchema } from '@shared/search-types';
import type { SearchService } from '../search/search-service';
import type { AsyncDatabase } from '../db/types';

function toIpcError(err: unknown): Error {
  if (err instanceof Error) {
    const plain = new Error(err.message);
    plain.stack = err.stack;
    return plain;
  }
  return new Error(String(err));
}

export function registerSearchHandlers(
  searchService: SearchService,
  db: AsyncDatabase,
  getMainWindow: () => BrowserWindow | null,
): void {
  ipcMain.handle('search:query', async (_, params: unknown) => {
    try {
      const { query, limit, entityTypes } = SearchQuerySchema.parse(params);
      return await searchService.search(query, { limit, entityTypes });
    } catch (err) {
      console.error('[IPC search:query]', err instanceof Error ? err.message : String(err));
      throw toIpcError(err);
    }
  });

  ipcMain.handle('search:reindex', async () => {
    try {
      await searchService.reindexAll(db, getMainWindow());
    } catch (err) {
      console.error('[IPC search:reindex]', err instanceof Error ? err.message : String(err));
      throw toIpcError(err);
    }
  });

  ipcMain.handle('search:status', () => {
    try {
      return searchService.getStatus();
    } catch (err) {
      console.error('[IPC search:status]', err instanceof Error ? err.message : String(err));
      throw toIpcError(err);
    }
  });
}
