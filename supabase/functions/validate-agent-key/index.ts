import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
