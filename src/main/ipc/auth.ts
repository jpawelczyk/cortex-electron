import { ipcMain } from 'electron';
import { getPowerSyncDatabase } from '../db/index';
import { SignInSchema, SignUpSchema } from '../../shared/validation';
import type { SupabaseConnector } from '../sync/connector';

export function registerAuthHandlers(connector: SupabaseConnector): void {
  const client = connector.client;

  ipcMain.handle('auth:sign-in', async (_, credentials) => {
    const parsed = SignInSchema.safeParse(credentials);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { data, error } = await client.auth.signInWithPassword(parsed.data);
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  });

  ipcMain.handle('auth:sign-up', async (_, credentials) => {
    const parsed = SignUpSchema.safeParse(credentials);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { data, error } = await client.auth.signUp(parsed.data);
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  });

  ipcMain.handle('auth:sign-out', async () => {
    const { error } = await client.auth.signOut();
    if (error) return { success: false, error: error.message };
    return { success: true };
  });

  ipcMain.handle('auth:get-session', async () => {
    const { data, error } = await client.auth.getSession();
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  });

  ipcMain.handle('sync:connect', async () => {
    try {
      const psDb = getPowerSyncDatabase();
      await psDb.connect(connector);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('sync:disconnect', async () => {
    try {
      const psDb = getPowerSyncDatabase();
      await psDb.disconnect();
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
}
