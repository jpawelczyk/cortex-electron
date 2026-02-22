# Handoff: API Key → JWT Token Exchange

## Context

AI agents authenticate with an API key (`ctx_...`). PowerSync needs a Supabase JWT. We need an Edge Function to exchange the API key for a short-lived JWT.

## What to Build

### 1. Edge Function: `get-sync-token`

Create `supabase/functions/get-sync-token/index.ts`:

```typescript
import { SignJWT } from 'https://deno.land/x/jose@v5.2.0/index.ts';

async function sha256(message: string): Promise<string> {
  const data = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  const headers = { 'Content-Type': 'application/json' };

  // Validate API key
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ctx_')) {
    return new Response(JSON.stringify({ error: 'Invalid API key format' }), { 
      status: 401, headers 
    });
  }

  const key = authHeader.replace('Bearer ', '');
  const hash = await sha256(key);

  // Use dynamic import for Supabase client
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: agent, error } = await supabase
    .from('ai_agents')
    .select('id, user_id, permissions')
    .eq('api_key_hash', hash)
    .is('revoked_at', null)
    .single();

  if (error || !agent) {
    return new Response(JSON.stringify({ error: 'Invalid or revoked API key' }), { 
      status: 401, headers 
    });
  }

  // Update last_used_at
  await supabase
    .from('ai_agents')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', agent.id);

  // Sign JWT
  const jwtSecret = Deno.env.get('SUPABASE_JWT_SECRET');
  if (!jwtSecret) {
    return new Response(JSON.stringify({ error: 'JWT secret not configured' }), { 
      status: 500, headers 
    });
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 3600; // 1 hour

  const token = await new SignJWT({
    sub: agent.user_id,
    role: 'authenticated',
    aud: 'authenticated',
    agent_id: agent.id,  // Include for audit trail
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(expiresAt)
    .setIssuer(Deno.env.get('SUPABASE_URL')! + '/auth/v1')
    .sign(new TextEncoder().encode(jwtSecret));

  return new Response(JSON.stringify({
    token,
    expires_at: expiresAt,
    user_id: agent.user_id,
    agent_id: agent.id,
  }), { status: 200, headers });
});
```

### 2. Deploy with `--no-verify-jwt`

```bash
supabase functions deploy get-sync-token --no-verify-jwt
```

### 3. Add JWT Secret to Edge Function Env

In Supabase Dashboard → Settings → API → JWT Secret, copy the secret.

Then set it for Edge Functions:
```bash
supabase secrets set SUPABASE_JWT_SECRET=your-jwt-secret
```

### 4. Update Agent Connector

Modify `agent/db.ts` to use API key auth:

```typescript
import 'dotenv/config';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
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
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
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

    // Decode user_id from token
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
}
```

### 5. Update Agent .env

```bash
# Old (remove these)
# AI_USER_EMAIL=...
# AI_USER_PASSWORD=...

# New
CORTEX_API_KEY=ctx_your_key_here
```

## Files to Create/Modify

**Create:**
- `supabase/functions/get-sync-token/index.ts`

**Modify:**
- `agent/db.ts` — Use API key auth
- `agent/.env.example` — Update env vars

## Testing

```bash
# Test token exchange
curl -X POST "https://inlcevlvhqxaltzyuosi.supabase.co/functions/v1/get-sync-token" \
  -H "Authorization: Bearer ctx_your_key" \
  -H "Content-Type: application/json"

# Should return: { "token": "eyJ...", "expires_at": 1234567890, "user_id": "...", "agent_id": "..." }

# Then test agent
cd agent
CORTEX_API_KEY=ctx_your_key npm run cli -- today
```

## Security Notes

- JWTs are short-lived (1 hour) — API key re-validates on each refresh
- Revoked API key = no new tokens (existing tokens expire naturally)
- `agent_id` in JWT payload enables audit trail
- Writes tagged with `source: 'ai'` and `agent_id`
