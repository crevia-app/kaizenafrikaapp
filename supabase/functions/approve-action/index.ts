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

// Allowed status transitions per document type
const CONTRACT_TRANSITIONS: Record<string, string[]> = {
  draft: ['sent', 'cancelled'],
  sent: ['signed', 'cancelled'],
  signed: ['active', 'cancelled'],
  active: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const INVOICE_TRANSITIONS: Record<string, string[]> = {
  draft: ['sent', 'cancelled'],
  sent: ['paid', 'overdue', 'cancelled'],
  overdue: ['paid', 'cancelled'],
  paid: [],
  cancelled: [],
};

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
      supabase.rpc("log_security_event", { p_event_type: "auth_failure", p_endpoint: "approve-action", p_detail: "Token validation failed" }).catch(() => {});
      console.warn("[security] auth_failure endpoint=approve-action");
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub;
    // === END AUTH VALIDATION ===

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

    const { document_type, document_id, new_status } = body as Record<string, unknown>;

    if (document_type !== 'canvas' && document_type !== 'invoice') {
      return new Response(JSON.stringify({ error: 'document_type must be "canvas" or "invoice"' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    if (!document_id || typeof document_id !== 'string') {
      return new Response(JSON.stringify({ error: 'document_id is required' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    if (!new_status || typeof new_status !== 'string') {
      return new Response(JSON.stringify({ error: 'new_status is required' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    // === END INPUT VALIDATION ===

    const table = document_type === 'canvas' ? 'canvases' : 'invoices';
    const transitions = document_type === 'canvas' ? CONTRACT_TRANSITIONS : INVOICE_TRANSITIONS;

    // Fetch the current record (RLS ensures it belongs to this user)
    const { data: record, error: fetchError } = await supabase
      .from(table)
      .select('id, status, user_id')
      .eq('id', document_id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !record) {
      return new Response(JSON.stringify({ error: 'Document not found' }), {
        status: 404,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // Enforce valid transition
    const allowedNext = transitions[record.status] ?? [];
    if (!allowedNext.includes(new_status as string)) {
      return new Response(JSON.stringify({
        error: `Cannot transition from "${record.status}" to "${new_status}". Allowed: ${allowedNext.join(', ') || 'none'}`,
      }), {
        status: 422,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // Apply the status update
    const { data: updated, error: updateError } = await supabase
      .from(table)
      .update({ status: new_status, updated_at: new Date().toISOString() })
      .eq('id', document_id)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('approve-action update error:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update status' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ document: updated }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('approve-action error:', error);
    return new Response(JSON.stringify({ error: 'Something went wrong. Please try again.' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
