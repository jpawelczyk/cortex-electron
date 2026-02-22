import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { AbstractPowerSyncDatabase, PowerSyncBackendConnector, PowerSyncCredentials } from '@powersync/common';

export class SupabaseConnector implements PowerSyncBackendConnector {
  private supabase: SupabaseClient;
  private powersyncUrl: string;

  constructor(config: { supabaseUrl: string; supabaseAnonKey: string; powersyncUrl: string }) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
    this.powersyncUrl = config.powersyncUrl;
  }

  async fetchCredentials(): Promise<PowerSyncCredentials | null> {
    const { data: { session } } = await this.supabase.auth.getSession();

    if (!session) {
      return null;
    }

    return {
      endpoint: this.powersyncUrl,
      token: session.access_token,
      ...(session.expires_at !== undefined && {
        expiresAt: new Date(session.expires_at * 1000),
      }),
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const batch = await database.getCrudBatch(100);
    if (!batch) return;

    for (const entry of batch.crud) {
      const table = entry.table;
      const id = entry.id;

      if (entry.op === 'PUT') {
        const { error } = await this.supabase.from(table).upsert({ ...entry.opData, id });
        if (error) throw error;
      } else if (entry.op === 'PATCH') {
        const { error } = await this.supabase.from(table).update(entry.opData).eq('id', id);
        if (error) throw error;
      } else if (entry.op === 'DELETE') {
        // Soft delete: set deleted_at, never hard delete
        const now = new Date().toISOString();
        const { error } = await this.supabase.from(table).update({ deleted_at: now }).eq('id', id);
        if (error) throw error;
      }
    }

    await batch.complete();
  }

  get client(): SupabaseClient {
    return this.supabase;
  }
}
