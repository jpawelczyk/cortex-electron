import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// --- Rate limiting: 30 requests/min per IP ---
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 30;
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
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
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
    return new Response(JSON.stringify({ valid: false, error: 'Too many requests' }), {
      status: 429,
      headers,
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ctx_')) {
    return new Response(JSON.stringify({ valid: false }), { status: 401, headers });
  }

  const key = authHeader.replace('Bearer ', '');
  const hash = await sha256(key);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: agent } = await supabase
    .from('ai_agents')
    .select('id, user_id, permissions')
    .eq('api_key_hash', hash)
    .is('revoked_at', null)
    .single();

  if (!agent) {
    return new Response(JSON.stringify({ valid: false }), { status: 401, headers });
  }

  // Update last_used_at (fire and forget)
  supabase
    .from('ai_agents')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', agent.id)
    .then();

  return new Response(
    JSON.stringify({
      valid: true,
      user_id: agent.user_id,
      agent_id: agent.id,
      permissions: agent.permissions,
    }),
    { status: 200, headers },
  );
});
