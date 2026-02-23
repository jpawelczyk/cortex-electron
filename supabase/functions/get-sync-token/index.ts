import { SignJWT } from 'https://deno.land/x/jose@v5.2.0/index.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// --- Rate limiting: 60 requests/min per IP ---
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 60;
const WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT) return true;
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return false;
}

// Periodically clean up stale entries (~every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of rateLimitMap) {
    const fresh = timestamps.filter((t) => now - t < WINDOW_MS);
    if (fresh.length === 0) {
      rateLimitMap.delete(ip);
    } else {
      rateLimitMap.set(ip, fresh);
    }
  }
}, 300_000);

async function sha256(message: string): Promise<string> {
  const data = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  const headers = { 'Content-Type': 'application/json' };

  // Rate limiting
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
  if (isRateLimited(ip)) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers,
    });
  }

  // Validate API key format
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ctx_')) {
    return new Response(JSON.stringify({ error: 'Invalid API key format' }), {
      status: 401,
      headers,
    });
  }

  const key = authHeader.replace('Bearer ', '');
  const hash = await sha256(key);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Look up agent by key hash
  const { data: agent, error } = await supabase
    .from('ai_agents')
    .select('id, user_id, permissions')
    .eq('api_key_hash', hash)
    .is('revoked_at', null)
    .single();

  if (error || !agent) {
    return new Response(JSON.stringify({ error: 'Invalid or revoked API key' }), {
      status: 401,
      headers,
    });
  }

  // Update last_used_at
  await supabase
    .from('ai_agents')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', agent.id);

  // Sign JWT
  const jwtSecret = Deno.env.get('JWT_SIGNING_SECRET');
  if (!jwtSecret) {
    return new Response(JSON.stringify({ error: 'JWT secret not configured' }), {
      status: 500,
      headers,
    });
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 3600; // 1 hour

  const token = await new SignJWT({
    sub: agent.user_id,
    role: 'authenticated',
    aud: 'authenticated',
    agent_id: agent.id,
    user_id: agent.user_id,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(expiresAt)
    .setIssuer(Deno.env.get('SUPABASE_URL')! + '/auth/v1')
    .sign(new TextEncoder().encode(jwtSecret));

  return new Response(
    JSON.stringify({
      token,
      expires_at: expiresAt,
      user_id: agent.user_id,
      agent_id: agent.id,
    }),
    { status: 200, headers },
  );
});
