# Handoff: AI Agent Key Management

## Context

Cortex is a local-first personal OS (Electron + React + SQLite + PowerSync + Supabase). We need AI agents to access user data via API keys.

**Key decision:** AI acts as the user (same `user_id`), but we track the source via metadata fields. No separate AI user accounts.

## What to Build

### 1. Database Schema Changes

**New table: `ai_agents`**
```sql
CREATE TABLE public.ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  api_key_hash TEXT NOT NULL,  -- SHA-256 hash of key
  permissions JSONB DEFAULT '{"read": true, "write": true}',
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ  -- soft revoke
);

-- RLS: users manage their own agents
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_agents_policy ON public.ai_agents FOR ALL USING (auth.uid() = user_id);

-- Index for key lookup
CREATE INDEX idx_ai_agents_key_hash ON public.ai_agents(api_key_hash) WHERE revoked_at IS NULL;
```

**Add to ALL data tables** (contexts, projects, project_headings, tasks, task_checklists, stakeholders, meetings, meeting_attendees, notes, note_stakeholders, daily_notes):
```sql
ALTER TABLE public.<table> ADD COLUMN source TEXT DEFAULT 'user' CHECK (source IN ('user', 'ai', 'import', 'api'));
ALTER TABLE public.<table> ADD COLUMN agent_id UUID REFERENCES public.ai_agents(id);
```

### 2. API Key Generation

**Key format:** `ctx_` + 32 random hex chars (e.g., `ctx_7f4f674e88d516fb4167311734213036`)

```typescript
function generateApiKey(): { key: string; hash: string } {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const hex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const key = `ctx_${hex}`;
  const hash = await sha256(key);
  return { key, hash };
}
```

- Store only the hash in DB
- Show plain key to user once (they copy it)
- Key is never retrievable again

### 3. API Key Validation (Edge Function)

Create `supabase/functions/validate-agent-key/index.ts`:

```typescript
// Input: Authorization header with Bearer token
// Output: { valid: true, user_id, agent_id, permissions } or { valid: false }

import { createClient } from '@supabase/supabase-js';

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ctx_')) {
    return new Response(JSON.stringify({ valid: false }), { status: 401 });
  }
  
  const key = authHeader.replace('Bearer ', '');
  const hash = await sha256(key);
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!  // Service role to bypass RLS
  );
  
  const { data: agent } = await supabase
    .from('ai_agents')
    .select('id, user_id, permissions')
    .eq('api_key_hash', hash)
    .is('revoked_at', null)
    .single();
  
  if (!agent) {
    return new Response(JSON.stringify({ valid: false }), { status: 401 });
  }
  
  // Update last_used_at
  await supabase
    .from('ai_agents')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', agent.id);
  
  return new Response(JSON.stringify({
    valid: true,
    user_id: agent.user_id,
    agent_id: agent.id,
    permissions: agent.permissions
  }));
});
```

### 4. UI: Settings → AI Agents

**Location:** `src/renderer/views/settings/ai-agents.tsx`

**Features:**
- List all agents (name, created_at, last_used_at, status)
- "Add Agent" button → modal with name input
- On create: show key ONCE in a copyable field with warning
- "Revoke" button per agent (sets revoked_at)
- Revoked agents shown greyed out (or filtered)

**Zustand store:** `src/renderer/stores/ai-agents.ts`
```typescript
interface AIAgentsStore {
  agents: AIAgent[];
  loading: boolean;
  fetchAgents: () => Promise<void>;
  createAgent: (name: string) => Promise<string>;  // returns plain key
  revokeAgent: (id: string) => Promise<void>;
}
```

### 5. PowerSync Schema Update

Add `source` and `agent_id` to sync schema in `src/main/sync/schema.ts`.

### 6. Local SQLite Migration

Mirror the Supabase changes:
- Add `source` and `agent_id` columns to all tables
- Add `ai_agents` table (for offline viewing of agent list)

## Files to Modify/Create

**Create:**
- `supabase/migrations/002_ai_agents.sql` - schema changes
- `supabase/functions/validate-agent-key/index.ts` - key validation
- `src/renderer/views/settings/ai-agents.tsx` - UI
- `src/renderer/stores/ai-agents.ts` - state
- `src/renderer/components/settings/agent-key-modal.tsx` - create modal

**Modify:**
- `src/main/sync/schema.ts` - add source/agent_id fields
- `src/renderer/views/settings/index.tsx` - add AI Agents tab
- `migrations/` - local SQLite migration

## Technical Notes

- **Supabase project:** `inlcevlvhqxaltzyuosi` (staging: staging.cortexapp.dev)
- **Auth:** Supabase Auth, user already logged in
- **Styling:** shadcn/ui + Tailwind (see `docs/DESIGN_SYSTEM.md`)
- **TDD:** Write tests first (see `docs/TESTING.md`)

## Auth Flow for AI

Once built:
1. User creates agent in Settings → gets API key
2. AI stores key securely
3. AI calls Supabase Edge Functions with `Authorization: Bearer ctx_...`
4. Edge function validates key, returns user_id + agent_id
5. AI proceeds with user_id for queries, tags writes with source='ai', agent_id

## Out of Scope

- Full CRUD API for AI (future Hono layer)
- Permission enforcement (just store permissions, enforce later)
- Multiple permission levels (read/write is enough for MVP)

## Success Criteria

1. User can create an AI agent and get an API key
2. API key can be validated via Edge Function
3. Revoking an agent invalidates its key immediately
4. All data tables have source + agent_id columns
5. Tests pass
