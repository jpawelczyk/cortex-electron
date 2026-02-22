import { PowerSyncDatabase } from '@powersync/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  AbstractPowerSyncDatabase,
  PowerSyncBackendConnector,
  PowerSyncCredentials,
} from '@powersync/common';
import { AppSchema } from '../src/main/sync/schema.js';
import 'dotenv/config';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

class AgentConnector implements PowerSyncBackendConnector {
  private supabase: SupabaseClient;
  private powersyncUrl: string;
  private apiKey: string;
  private token: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor() {
    this.supabase = createClient(
      requireEnv('SUPABASE_URL'),
      requireEnv('SUPABASE_ANON_KEY'),
    );
    this.powersyncUrl = requireEnv('POWERSYNC_URL');
    this.apiKey = requireEnv('CORTEX_API_KEY');
  }

  async fetchCredentials(): Promise<PowerSyncCredentials | null> {
    // Refresh token if expired or expiring soon (5 min buffer)
    const now = Math.floor(Date.now() / 1000);
    if (!this.token || this.tokenExpiresAt - now < 300) {
      await this.refreshToken();
    }

    if (!this.token) return null;

    return {
      endpoint: this.powersyncUrl,
      token: this.token,
      expiresAt: new Date(this.tokenExpiresAt * 1000),
    };
  }

  private async refreshToken(): Promise<void> {
    const res = await fetch(
      `${requireEnv('SUPABASE_URL')}/functions/v1/get-sync-token`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Token exchange failed: ${err.error}`);
    }

    const data = await res.json();
    this.token = data.token;
    this.tokenExpiresAt = data.expires_at;
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    // Ensure fresh token
    await this.fetchCredentials();

    const batch = await database.getCrudBatch(100);
    if (!batch) return;

    // Decode user_id and agent_id from token
    const payload = JSON.parse(atob(this.token!.split('.')[1]));
    const userId = payload.sub;
    const agentId = payload.agent_id;

    for (const entry of batch.crud) {
      const table = entry.table;
      const id = entry.id;

      if (entry.op === 'PUT') {
        const { error } = await this.supabase
          .from(table)
          .upsert({
            ...entry.opData,
            id,
            user_id: userId,
            source: 'ai',
            agent_id: agentId,
          });
        if (error) throw error;
      } else if (entry.op === 'PATCH') {
        const { error } = await this.supabase
          .from(table)
          .update({
            ...entry.opData,
            source: 'ai',
            agent_id: agentId,
          })
          .eq('id', id);
        if (error) throw error;
      } else if (entry.op === 'DELETE') {
        const { error } = await this.supabase
          .from(table)
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
      }
    }

    await batch.complete();
  }

  get client(): SupabaseClient {
    return this.supabase;
  }
}

let db: PowerSyncDatabase | null = null;
let connector: AgentConnector | null = null;

export async function initDatabase(): Promise<PowerSyncDatabase> {
  if (db) return db;

  connector = new AgentConnector();

  db = new PowerSyncDatabase({
    schema: AppSchema,
    database: {
      dbFilename: 'cortex-agent.db',
    },
  });

  await db.init();
  await db.connect(connector);

  return db;
}

export function getDatabase(): PowerSyncDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function getConnector(): AgentConnector {
  if (!connector) {
    throw new Error('Connector not initialized. Call initDatabase() first.');
  }
  return connector;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.disconnect();
    await db.close();
    db = null;
    connector = null;
  }
}
