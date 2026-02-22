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

  constructor() {
    this.supabase = createClient(
      requireEnv('SUPABASE_URL'),
      requireEnv('SUPABASE_ANON_KEY'),
    );
    this.powersyncUrl = requireEnv('POWERSYNC_URL');
  }

  async signIn(): Promise<void> {
    const { error } = await this.supabase.auth.signInWithPassword({
      email: requireEnv('AI_USER_EMAIL'),
      password: requireEnv('AI_USER_PASSWORD'),
    });
    if (error) {
      throw new Error(`Auth failed: ${error.message}`);
    }
  }

  async fetchCredentials(): Promise<PowerSyncCredentials | null> {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();

    if (!session) return null;

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

    const {
      data: { session },
    } = await this.supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) {
      throw new Error('No authenticated user for sync upload');
    }

    for (const entry of batch.crud) {
      const table = entry.table;
      const id = entry.id;

      if (entry.op === 'PUT') {
        const { error } = await this.supabase
          .from(table)
          .upsert({ ...entry.opData, id, user_id: userId });
        if (error) throw error;
      } else if (entry.op === 'PATCH') {
        const { error } = await this.supabase
          .from(table)
          .update(entry.opData)
          .eq('id', id);
        if (error) throw error;
      } else if (entry.op === 'DELETE') {
        const now = new Date().toISOString();
        const { error } = await this.supabase
          .from(table)
          .update({ deleted_at: now })
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
  await connector.signIn();

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
