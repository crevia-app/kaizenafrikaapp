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

const VALID_CURRENCIES = ['KES', 'USD', 'EUR', 'GBP', 'NGN', 'ZAR', 'GHS', 'TZS', 'UGX'];

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

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
      supabase.rpc("log_security_event", { p_event_type: "auth_failure", p_endpoint: "invoices-create", p_detail: "Token validation failed" }).catch(() => {});
      console.warn("[security] auth_failure endpoint=invoices-create");
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
      p_endpoint:    'invoices-create',
      p_limit:       10,
      p_window_secs: 60,
    });
    if (!allowed) {
      supabase.rpc("log_security_event", { p_event_type: "rate_limit", p_user_id: userId, p_endpoint: "invoices-create", p_detail: "Per-minute limit exceeded" }).catch(() => {});
      console.warn(`[security] rate_limit endpoint=invoices-create user=${userId}`);
      return new Response(JSON.stringify({ error: 'Too many requests. Please slow down.' }), {
        status: 429,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    // === END RATE LIMIT ===

    // === PLAN LIMIT GATE (free: 2 invoices/month) ===
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
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', startOfMonth.toISOString());

      if ((count ?? 0) >= 3) {
        return new Response(JSON.stringify({
          error: 'Free plan limit reached (3/month). Upgrade to Pro for unlimited invoices.',
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

    const { invoice_number, client_name, client_email, client_address, issue_date,
            due_date, tax_rate, discount_amount, notes, terms, currency, items } = body as Record<string, unknown>;

    if (!client_name || typeof client_name !== 'string' || client_name.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'client_name is required' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    if (!due_date || typeof due_date !== 'string') {
      return new Response(JSON.stringify({ error: 'due_date is required' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: 'At least one invoice item is required' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // Validate each item
    for (const item of items as InvoiceItem[]) {
      if (!item.description || typeof item.description !== 'string') {
        return new Response(JSON.stringify({ error: 'Each item must have a description' }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
        return new Response(JSON.stringify({ error: 'Each item must have a positive quantity' }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
      if (typeof item.unit_price !== 'number' || item.unit_price < 0) {
        return new Response(JSON.stringify({ error: 'Each item must have a valid unit_price' }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
    }

    // Generate invoice number if not provided
    const resolvedInvoiceNumber = (typeof invoice_number === 'string' && invoice_number.trim())
      ? invoice_number.trim()
      : `INV-${Date.now()}`;

    const resolvedCurrency = (typeof currency === 'string' && VALID_CURRENCIES.includes(currency))
      ? currency : 'KES';

    const resolvedTaxRate = typeof tax_rate === 'number' && tax_rate >= 0 ? tax_rate : 0;
    const resolvedDiscount = typeof discount_amount === 'number' && discount_amount >= 0 ? discount_amount : 0;

    // Calculate totals
    const subtotal = (items as InvoiceItem[]).reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const taxAmount = subtotal * (resolvedTaxRate / 100);
    const total = subtotal + taxAmount - resolvedDiscount;
    // === END INPUT VALIDATION ===

    // Insert invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        user_id: userId,
        invoice_number: resolvedInvoiceNumber,
        client_name: (client_name as string).trim(),
        client_email: typeof client_email === 'string' ? client_email.trim() : null,
        client_address: typeof client_address === 'string' ? client_address.trim() : null,
        issue_date: typeof issue_date === 'string' ? issue_date : new Date().toISOString().split('T')[0],
        due_date: due_date as string,
        status: 'draft',
        subtotal,
        tax_rate: resolvedTaxRate,
        tax_amount: taxAmount,
        discount_amount: resolvedDiscount,
        total,
        notes: typeof notes === 'string' ? notes : null,
        terms: typeof terms === 'string' ? terms : null,
        currency: resolvedCurrency,
      })
      .select()
      .single();

    if (invoiceError) {
      console.error('invoices-create insert error:', invoiceError);
      return new Response(JSON.stringify({ error: 'Failed to create invoice' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // Insert invoice items
    const invoiceItems = (items as InvoiceItem[]).map((item) => ({
      invoice_id: invoice.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.quantity * item.unit_price,
    }));

    const { error: itemsError } = await supabase.from('invoice_items').insert(invoiceItems);

    if (itemsError) {
      console.error('invoices-create items insert error:', itemsError);
      // Roll back the invoice
      await supabase.from('invoices').delete().eq('id', invoice.id);
      return new Response(JSON.stringify({ error: 'Failed to save invoice items' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ invoice: { ...invoice, items: invoiceItems } }), {
      status: 201,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('invoices-create error:', error);
    return new Response(JSON.stringify({ error: 'Something went wrong. Please try again.' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
