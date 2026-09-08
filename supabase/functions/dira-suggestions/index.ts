import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  'https://kaizenafrika.app',
  'https://www.kaizenafrika.app',
  'http://localhost:8080',
  'http://localhost:5173',
  'https://kaizenafrika.app',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') ?? '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      supabase.rpc("log_security_event", { p_event_type: "auth_failure", p_endpoint: "dira-suggestions", p_detail: "Token validation failed" }).catch(() => {});
      console.warn("[security] auth_failure endpoint=dira-suggestions");
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // Rate limit: 20 requests per hour per user
    const { data: rlAllowed } = await supabase.rpc('check_rate_limit', {
      p_user_id: user.id,
      p_endpoint: 'dira-suggestions',
      p_limit: 20,
      p_window_secs: 3600,
    });
    if (!rlAllowed) {
      supabase.rpc("log_security_event", { p_event_type: "rate_limit", p_user_id: user.id, p_endpoint: "dira-suggestions", p_detail: "Hourly limit exceeded" }).catch(() => {});
      console.warn(`[security] rate_limit endpoint=dira-suggestions user=${user.id}`);
      return new Response(JSON.stringify({ error: 'Too many requests. Please slow down.' }), {
        status: 429,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const { type, profile, campaigns } = await req.json();

    let systemPrompt = '';
    let userPrompt = '';

    if (type === 'creator') {
      systemPrompt = `You are Dira AI, a personal agent for African creators. Provide personalized, actionable suggestions.
Suggest: best campaigns to apply to, profile improvements, pricing recommendations, collaboration opportunities.
Return ONLY a valid JSON array — no markdown, no explanation. Format: [{ "type": string, "title": string, "description": string, "action": string }]`;
      userPrompt = `Creator Profile: ${JSON.stringify(profile)}\nAvailable Campaigns: ${JSON.stringify(campaigns)}`;
    } else {
      systemPrompt = `You are Dira AI, a marketing strategist for brands working with African creators. Provide actionable suggestions.
Suggest: creator recommendations, budget optimization, brief improvements, audience targeting.
Return ONLY a valid JSON array — no markdown, no explanation. Format: [{ "type": string, "title": string, "description": string, "action": string }]`;
      userPrompt = `Brand Profile: ${JSON.stringify(profile)}\nCurrent Campaigns: ${JSON.stringify(campaigns)}`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 800,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? '';

    let suggestions: unknown[] = [];
    try {
      suggestions = JSON.parse(content);
      if (!Array.isArray(suggestions)) suggestions = [];
    } catch {
      suggestions = [];
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('dira-suggestions error:', msg);
    return new Response(JSON.stringify({ suggestions: [] }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
