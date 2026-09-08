// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
// import "@supabase/functions-js/edge-runtime.d.ts"

// console.log("Hello from Functions!")

// Deno.serve(async (req) => {
//   const { name } = await req.json()
//   const data = {
//     message: `Hello ${name}!`,
//   }

//   return new Response(
//     JSON.stringify(data),
//     { headers: { "Content-Type": "application/json" } },
//   )
// })

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/paystack-webhook' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

// Webhook is server-to-server (Paystack → Supabase Edge).
// No browser ever calls this endpoint, so CORS headers are intentionally omitted.

serve(async (req) => {
  // Reject non-POST requests — OPTIONS/GET have no valid use here
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const body = await req.text();
    //makes sure the request is from paystack by verifying the signature using the secret key(makes sure its from paystack and not a hacker trying to fake payment)
    const signature = req.headers.get('x-paystack-signature');
    const secret = Deno.env.get('PAYSTACK_SECRET_KEY')!;

    // ✅ Verify webhook is actually from Paystack
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(body)
    );
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (expectedSignature !== signature) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const event = JSON.parse(body);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Idempotency check — Paystack retries webhooks on non-2xx responses and
    // occasionally on network issues. Guard against double-processing by checking
    // if this reference + event type was already handled. Return 200 immediately
    // so Paystack stops retrying — do not re-process anything.
    const eventRef = event.data?.reference ?? null;
    if (eventRef) {
      const { data: alreadyProcessed } = await supabase
        .from('webhook_events')
        .select('id')
        .eq('source', 'paystack')
        .eq('event_type', event.event)
        .eq('reference', eventRef)
        .maybeSingle();

      if (alreadyProcessed) {
        console.log(`[webhook] duplicate skipped event=${event.event} ref=${eventRef}`);
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Audit log — record every verified webhook event
    await supabase.from('webhook_events').insert({
      source:      'paystack',
      event_type:  event.event,
      reference:   event.data?.reference ?? null,
      email:       event.data?.customer?.email ?? null,
      payload_hash: expectedSignature.slice(0, 16), // first 16 chars of HMAC as fingerprint
      status:      'processed',
    });

    // ✅ Handle successful charge(when a user successfully pays for subscription)
    if (event.event === 'charge.success') {
      const { customer, metadata, plan } = event.data;
      const userEmail = customer.email;
      const subscriptionPlan = metadata?.plan || 'creative_pro';

      // Get user by email
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, user_type')
        .eq('email', userEmail)
        .single();

      if (profile) {
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);

        // Dira limits per plan (NULL = unlimited for Business)
        const diraLimit =
          subscriptionPlan === 'business' || subscriptionPlan === 'brand_workspace'
            ? null
            : subscriptionPlan === 'pro' || subscriptionPlan === 'creative_pro'
              ? 500
              : 15; // free fallback (shouldn't normally reach this branch)

        await supabase
          .from('profiles')
          .update({
            subscription_plan: subscriptionPlan,
            subscription_status: 'active',
            subscription_expires_at: expiresAt.toISOString(),
            paystack_customer_code: customer.customer_code,
            dira_actions_limit: diraLimit,
          })
          .eq('id', profile.id);

        // ── Admin upgrade notification ────────────────────────────────
        const { data: prof } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', profile.id)
          .single();

        const userName   = (prof as any)?.display_name || userEmail;
        const planLabel  = subscriptionPlan.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
        const amountKES  = (event.data?.amount ?? 0) / 100;

        // Record in billing history
        await supabase.from('subscription_payments').insert({
          user_id:   profile.id,
          email:     userEmail,
          plan:      subscriptionPlan,
          amount:    amountKES,
          currency:  event.data?.currency ?? 'KES',
          reference: event.data?.reference ?? null,
          status:    'success',
        });

        // In-app notification (realtime → Admin badge)
        await supabase.from('admin_notifications').insert({
          type:       'upgrade',
          user_id:    profile.id,
          user_email: userEmail,
          user_name:  userName,
          plan:       subscriptionPlan,
          amount:     amountKES,
          currency:   event.data?.currency ?? 'KES',
        });

        // Email notification to admin
        const resendKey = Deno.env.get('RESEND_API_KEY');
        if (resendKey) {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from:    'Kaizen Afrika <notifications@kaizenafrika.app>',
              to:      ['anthonypeterodhiambo@gmail.com'],
              subject: `🎉 New ${planLabel} upgrade — ${userName}`,
              html: `
                <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:12px;border:1px solid #e5e7eb">
                  <h2 style="margin:0 0 8px;font-size:20px;color:#111">New plan upgrade</h2>
                  <p style="margin:0 0 20px;color:#555;font-size:15px">A user just upgraded to <strong>${planLabel}</strong>.</p>
                  <table style="width:100%;border-collapse:collapse;font-size:14px;color:#333">
                    <tr><td style="padding:8px 0;color:#888;width:40%">User</td><td style="padding:8px 0">${userName}</td></tr>
                    <tr><td style="padding:8px 0;color:#888">Email</td><td style="padding:8px 0">${userEmail}</td></tr>
                    <tr><td style="padding:8px 0;color:#888">Plan</td><td style="padding:8px 0"><strong>${planLabel}</strong></td></tr>
                    <tr><td style="padding:8px 0;color:#888">Amount</td><td style="padding:8px 0">KES ${amountKES.toLocaleString()}</td></tr>
                    <tr><td style="padding:8px 0;color:#888">Date</td><td style="padding:8px 0">${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}</td></tr>
                  </table>
                  <a href="https://kaizenafrika.app/admin" style="display:inline-block;margin-top:24px;padding:10px 20px;background:#b45309;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">Open Admin Portal</a>
                </div>
              `,
            }),
          }).catch(() => { /* non-fatal */ });
        }
      }
    }

    // ✅ Recurring renewal — resolve user ID first, then update by ID (not email)
    if (event.event === 'subscription.create') {
      const { customer, subscription_code, email_token } = event.data;
      const { data: renewProfile } = await supabase
        .from('profiles').select('id').eq('email', customer.email).single();
      if (renewProfile) {
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);
        await supabase
          .from('profiles')
          .update({
            subscription_status: 'active',
            subscription_expires_at: expiresAt.toISOString(),
            subscription_code:        subscription_code ?? null,
            subscription_email_token: email_token ?? null,
          })
          .eq('id', renewProfile.id);
      }
    }

    // ✅ Payment failed — cut off premium access and reset Dira limit to free tier
    if (event.event === 'invoice.payment_failed') {
      const { customer } = event.data;
      const { data: failProfile } = await supabase
        .from('profiles').select('id').eq('email', customer.email).single();
      if (failProfile) {
        await supabase
          .from('profiles')
          .update({ subscription_status: 'expired', dira_actions_limit: 15 })
          .eq('id', failProfile.id);
      }
    }

    // ✅ Subscription cancelled by user — same downgrade treatment
    if (event.event === 'subscription.disable') {
      const { customer } = event.data;
      const { data: cancelProfile } = await supabase
        .from('profiles').select('id').eq('email', customer.email).single();
      if (cancelProfile) {
        await supabase
          .from('profiles')
          .update({ subscription_status: 'cancelled', dira_actions_limit: 15 })
          .eq('id', cancelProfile.id);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    // Log internally but never expose implementation details to the caller
    console.error('Webhook error:', error.message);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
