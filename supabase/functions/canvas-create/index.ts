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

const VALID_CONTRACT_TYPES = ['sponsorship', 'content_creation', 'brand_ambassador', 'ugc', 'affiliate', 'custom'];
const VALID_STATUSES = ['draft', 'sent', 'signed', 'active', 'completed', 'cancelled'];

serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  try {
    // === AUTH VALIDATION ===
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      supabase.rpc("log_security_event", { p_event_type: "auth_failure", p_endpoint: "canvas-create", p_detail: "Token validation failed" }).catch(() => {});
      console.warn("[security] auth_failure endpoint=canvas-create");
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub;
    // === END AUTH VALIDATION ===

    // === RATE LIMIT (10 requests per 60 seconds per user) ===
    const { data: allowed } = await supabase.rpc('check_rate_limit', {
      p_user_id:     userId,
      p_endpoint:    'canvas-create',
      p_limit:       10,
      p_window_secs: 60,
    });
    if (!allowed) {
      supabase.rpc("log_security_event", { p_event_type: "rate_limit", p_user_id: userId, p_endpoint: "canvas-create", p_detail: "Per-minute limit exceeded" }).catch(() => {});
      console.warn(`[security] rate_limit endpoint=canvas-create user=${userId}`);
      return new Response(JSON.stringify({ error: 'Too many requests. Please slow down.' }), {
        status: 429,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    // === END RATE LIMIT ===

    // === PLAN LIMIT GATE (free: 2 contracts/month) ===
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_plan')
      .eq('id', userId)
      .single();

    const isFreePlan = !profile?.subscription_plan || profile.subscription_plan === 'free';

    if (isFreePlan) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from('canvases')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', startOfMonth.toISOString());

      if ((count ?? 0) >= 5) {
        return new Response(JSON.stringify({
          error: 'Free plan limit reached (5/month). Upgrade to Pro or Business for unlimited Canvas.',
          code: 'PLAN_LIMIT_REACHED',
        }), {
          status: 403,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
    }
    // === END PLAN LIMIT GATE ===

    // === INPUT VALIDATION ===
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const { title, client_name, contract_type, status, client_email, start_date, end_date,
            value, currency, content, deliverables, payment_terms, exclusivity,
            exclusivity_details, usage_rights, termination_clause } = body as Record<string, unknown>;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'title is required' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    if (!client_name || typeof client_name !== 'string' || client_name.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'client_name is required' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const resolvedType = (typeof contract_type === 'string' && VALID_CONTRACT_TYPES.includes(contract_type))
      ? contract_type : 'custom';

    const resolvedStatus = (typeof status === 'string' && VALID_STATUSES.includes(status))
      ? status : 'draft';
    // === END INPUT VALIDATION ===

    const { data: contract, error: insertError } = await supabase
      .from('canvases')
      .insert({
        user_id: userId,
        title: (title as string).trim(),
        client_name: (client_name as string).trim(),
        contract_type: resolvedType,
        status: resolvedStatus,
        client_email: typeof client_email === 'string' ? client_email.trim() : null,
        start_date: typeof start_date === 'string' ? start_date : null,
        end_date: typeof end_date === 'string' ? end_date : null,
        value: typeof value === 'number' ? value : null,
        currency: typeof currency === 'string' ? currency : 'KES',
        content: typeof content === 'string' ? content : null,
        deliverables: Array.isArray(deliverables) ? deliverables : null,
        payment_terms: typeof payment_terms === 'string' ? payment_terms : null,
        exclusivity: typeof exclusivity === 'boolean' ? exclusivity : false,
        exclusivity_details: typeof exclusivity_details === 'string' ? exclusivity_details : null,
        usage_rights: typeof usage_rights === 'string' ? usage_rights : null,
        termination_clause: typeof termination_clause === 'string' ? termination_clause : null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('contracts-create insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to create Canvas' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ contract }), {
      status: 201,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('contracts-create error:', error);
    return new Response(JSON.stringify({ error: 'Something went wrong. Please try again.' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
