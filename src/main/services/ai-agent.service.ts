import { v4 as uuid } from 'uuid';
import { createHash } from 'crypto';
import type { AIAgent, CreateAIAgentInput } from '@shared/types';
import type { DbContext } from '../db/types';

export interface AIAgentService {
  create(input: CreateAIAgentInput): Promise<{ agent: AIAgent; key: string }>;
  list(): Promise<AIAgent[]>;
  get(id: string): Promise<AIAgent | null>;
  revoke(id: string): Promise<void>;
}

function generateApiKey(): { key: string; hash: string } {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const hex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const key = `ctx_${hex}`;
  const hash = createHash('sha256').update(key).digest('hex');
  return { key, hash };
}

function rowToAgent(row: Record<string, unknown>): AIAgent {
  return {
    id: row.id,
    name: row.name,
    permissions: typeof row.permissions === 'string' ? JSON.parse(row.permissions as string) : row.permissions,
    last_used_at: row.last_used_at ?? null,
    created_at: row.created_at,
    revoked_at: row.revoked_at ?? null,
  } as AIAgent;
}

export function createAIAgentService(ctx: DbContext): AIAgentService {
  const { db } = ctx;

  return {
    async create(input: CreateAIAgentInput): Promise<{ agent: AIAgent; key: string }> {
      const id = uuid();
      const now = new Date().toISOString();
      const { key, hash } = generateApiKey();
      const permissions = input.permissions ?? { read: true, write: true };

      await db.execute(`
        INSERT INTO ai_agents (id, name, api_key_hash, permissions, last_used_at, created_at, revoked_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [id, input.name, hash, JSON.stringify(permissions), null, now, null]);

      const agent: AIAgent = {
        id,
        name: input.name,
        permissions,
        last_used_at: null,
        created_at: now,
        revoked_at: null,
      };

      return { agent, key };
    },

    async list(): Promise<AIAgent[]> {
      const rows = await db.getAll<Record<string, unknown>>(
        'SELECT * FROM ai_agents ORDER BY created_at DESC'
      );
      return rows.map(rowToAgent);
    },

    async get(id: string): Promise<AIAgent | null> {
      const row = await db.getOptional<Record<string, unknown>>(
        'SELECT * FROM ai_agents WHERE id = ?',
        [id]
      );
      return row ? rowToAgent(row) : null;
    },

    async revoke(id: string): Promise<void> {
      const existing = await db.getOptional<Record<string, unknown>>(
        'SELECT * FROM ai_agents WHERE id = ?',
        [id]
      );
      if (!existing) {
        throw new Error('Agent not found');
      }
      if (existing.revoked_at) {
        throw new Error('Agent already revoked');
      }

      const now = new Date().toISOString();
      await db.execute(
        'UPDATE ai_agents SET revoked_at = ? WHERE id = ?',
        [now, id]
      );
    },
  };
}
