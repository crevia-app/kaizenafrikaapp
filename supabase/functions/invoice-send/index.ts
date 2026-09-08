import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://kaizenafrika.app",
  "https://www.kaizenafrika.app",
  "http://localhost:8080",
  "http://localhost:5173",
  "https://kaizenafrika.app",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    return new Response(JSON.stringify({ error: "Email service not configured" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const { invoice_id } = await req.json();
    if (!invoice_id) {
      return new Response(JSON.stringify({ error: "invoice_id required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // User-scoped client: anon key + caller's JWT so PostgREST uses auth.uid() for RLS
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    // Admin client: service role for writes that cross user boundaries (notifications, status)
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Identify caller for rate limiting
    const { data: { user: caller } } = await adminClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!caller) {
      adminClient.rpc("log_security_event", { p_event_type: "auth_failure", p_endpoint: "invoice-send", p_detail: "Token validation failed" }).catch(() => {});
      console.warn("[security] auth_failure endpoint=invoice-send");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    // Rate limit: 10 requests per minute per user (non-fatal if RPC missing)
    try {
      const { data: rlAllowed } = await adminClient.rpc("check_rate_limit", {
        p_user_id: caller.id,
        p_endpoint: "invoice-send",
        p_limit: 10,
        p_window_secs: 60,
      });
      if (rlAllowed === false) {
        adminClient.rpc("log_security_event", { p_event_type: "rate_limit", p_user_id: caller.id, p_endpoint: "invoice-send", p_detail: "Per-minute limit exceeded" }).catch(() => {});
        console.warn(`[security] rate_limit endpoint=invoice-send user=${caller.id}`);
        return new Response(JSON.stringify({ error: "Too many requests. Please slow down." }), {
          status: 429, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
    } catch {
      // check_rate_limit RPC not available — proceed without rate limiting
    }

    // Fetch invoice as the authenticated user — RLS ensures they can only see their own
    const { data: invoice, error: invErr } = await userClient
      .from("invoices")
      .select("*")
      .eq("id", invoice_id)
      .single();

    if (invErr || !invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (!invoice.client_email) {
      return new Response(JSON.stringify({ error: "No client email on this invoice" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Fetch line items
    const [{ data: items }, { data: biz }, { data: profile }] = await Promise.all([
      userClient.from("invoice_items").select("*").eq("invoice_id", invoice_id).order("created_at"),
      userClient.from("business_settings").select("*").maybeSingle(),
      userClient.from("profiles").select("display_name, email").single(),
    ]);

    const senderName = biz?.business_name || profile?.display_name || "Kaizen Afrika User";
    const senderEmail = biz?.business_email || profile?.email || "";
    const currency = invoice.currency || "KES";

    // Build line items HTML
    const itemsHtml = (items || []).map((item: any) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0ede8;font-size:14px;color:#333;line-height:1.5;">${item.description}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0ede8;font-size:14px;color:#666;text-align:center;">${item.quantity}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0ede8;font-size:14px;color:#666;text-align:right;">${formatCurrency(item.unit_price, currency)}</td>
        <td style="padding:10px 0 10px 12px;border-bottom:1px solid #f0ede8;font-size:14px;color:#222;text-align:right;font-weight:500;">${formatCurrency(item.total, currency)}</td>
      </tr>`).join("");

    // Payment details block
    const paymentDetailsHtml = (biz?.bank_name || biz?.mpesa_till_number) ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f3;border-radius:8px;padding:20px;margin-top:24px;">
        <tr><td>
          <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:0.8px;">Payment Details</p>
          ${biz?.bank_name ? `
            <p style="margin:0 0 4px;font-size:13px;color:#333;"><strong>Bank:</strong> ${biz.bank_name}</p>
            ${biz?.bank_account_name ? `<p style="margin:0 0 4px;font-size:13px;color:#333;"><strong>Account Name:</strong> ${biz.bank_account_name}</p>` : ""}
            ${biz?.bank_account_number ? `<p style="margin:0 0 10px;font-size:13px;color:#333;"><strong>Account Number:</strong> ${biz.bank_account_number}</p>` : ""}
          ` : ""}
          ${biz?.mpesa_till_number ? `<p style="margin:0;font-size:13px;color:#333;"><strong>M-Pesa Till:</strong> ${biz.mpesa_till_number}</p>` : ""}
        </td></tr>
      </table>` : "";

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice ${invoice.invoice_number}</title>
</head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#1a1a1a;padding:28px 40px;display:flex;justify-content:space-between;align-items:center;">
              <table width="100%"><tr>
                <td>
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td style="vertical-align:middle;">
                      <span style="font-size:22px;font-weight:700;color:#c9a96e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Kaizen Afrika</span>
                    </td>
                  </tr></table>
                </td>
                <td align="right"><p style="margin:0;font-size:13px;color:#888;">Invoice</p>
                  <p style="margin:2px 0 0;font-size:18px;font-weight:700;color:#fff;">${invoice.invoice_number}</p>
                </td>
              </tr></table>
            </td>
          </tr>

          <!-- Meta -->
          <tr>
            <td style="padding:28px 40px 0;">
              <table width="100%"><tr>
                <td style="vertical-align:top;">
                  <p style="margin:0 0 2px;font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:0.7px;">From</p>
                  <p style="margin:0;font-size:14px;font-weight:600;color:#111;">${senderName}</p>
                  ${senderEmail ? `<p style="margin:2px 0 0;font-size:13px;color:#666;">${senderEmail}</p>` : ""}
                  ${biz?.business_phone ? `<p style="margin:2px 0 0;font-size:13px;color:#666;">${biz.business_phone}</p>` : ""}
                </td>
                <td style="vertical-align:top;" align="right">
                  <p style="margin:0 0 2px;font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:0.7px;">Bill To</p>
                  <p style="margin:0;font-size:14px;font-weight:600;color:#111;">${invoice.client_name}</p>
                  <p style="margin:2px 0 0;font-size:13px;color:#666;">${invoice.client_email}</p>
                  ${invoice.client_address ? `<p style="margin:2px 0 0;font-size:13px;color:#666;">${invoice.client_address}</p>` : ""}
                </td>
              </tr></table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                <tr>
                  <td style="background:#f9f7f3;border-radius:8px;padding:16px 20px;">
                    <table width="100%"><tr>
                      <td>
                        <p style="margin:0 0 2px;font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:0.7px;">Issue Date</p>
                        <p style="margin:0;font-size:14px;font-weight:500;color:#333;">${formatDate(invoice.issue_date)}</p>
                      </td>
                      <td align="center">
                        <p style="margin:0 0 2px;font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:0.7px;">Due Date</p>
                        <p style="margin:0;font-size:14px;font-weight:600;color:#c9a96e;">${formatDate(invoice.due_date)}</p>
                      </td>
                      <td align="right">
                        <p style="margin:0 0 2px;font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:0.7px;">Amount Due</p>
                        <p style="margin:0;font-size:18px;font-weight:700;color:#111;">${formatCurrency(invoice.total, currency)}</p>
                      </td>
                    </tr></table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Line Items -->
          <tr>
            <td style="padding:28px 40px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <thead>
                  <tr>
                    <th style="text-align:left;font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:0.7px;padding-bottom:10px;border-bottom:2px solid #f0ede8;">Description</th>
                    <th style="text-align:center;font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:0.7px;padding-bottom:10px;border-bottom:2px solid #f0ede8;padding-left:12px;">Qty</th>
                    <th style="text-align:right;font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:0.7px;padding-bottom:10px;border-bottom:2px solid #f0ede8;">Unit Price</th>
                    <th style="text-align:right;font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:0.7px;padding-bottom:10px;border-bottom:2px solid #f0ede8;padding-left:12px;">Total</th>
                  </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
              </table>

              <!-- Totals -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                <tr>
                  <td></td>
                  <td width="240">
                    <table width="100%">
                      <tr>
                        <td style="font-size:13px;color:#666;padding:4px 0;">Subtotal</td>
                        <td style="font-size:13px;color:#333;text-align:right;">${formatCurrency(invoice.subtotal, currency)}</td>
                      </tr>
                      ${invoice.tax_amount > 0 ? `<tr>
                        <td style="font-size:13px;color:#666;padding:4px 0;">Tax (${invoice.tax_rate}%)</td>
                        <td style="font-size:13px;color:#333;text-align:right;">${formatCurrency(invoice.tax_amount, currency)}</td>
                      </tr>` : ""}
                      ${invoice.discount_amount > 0 ? `<tr>
                        <td style="font-size:13px;color:#666;padding:4px 0;">Discount</td>
                        <td style="font-size:13px;color:#e55;text-align:right;">-${formatCurrency(invoice.discount_amount, currency)}</td>
                      </tr>` : ""}
                      <tr>
                        <td style="font-size:15px;font-weight:700;color:#111;padding:10px 0 4px;border-top:2px solid #f0ede8;">Total Due</td>
                        <td style="font-size:15px;font-weight:700;color:#111;text-align:right;padding:10px 0 4px;border-top:2px solid #f0ede8;">${formatCurrency(invoice.total, currency)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${paymentDetailsHtml}

              ${invoice.notes ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
                <tr><td>
                  <p style="margin:0 0 6px;font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:0.7px;">Notes</p>
                  <p style="margin:0;font-size:13px;color:#555;line-height:1.6;">${invoice.notes}</p>
                </td></tr>
              </table>` : ""}

              ${invoice.terms ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                <tr><td>
                  <p style="margin:0 0 6px;font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:0.7px;">Terms</p>
                  <p style="margin:0;font-size:13px;color:#555;line-height:1.6;">${invoice.terms}</p>
                </td></tr>
              </table>` : ""}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:28px 40px 32px;margin-top:24px;border-top:1px solid #f0ede8;margin-top:28px;">
              <p style="margin:0;font-size:12px;color:#aaa;line-height:1.7;">
                This invoice was sent via <strong style="color:#c9a96e;">Kaizen Afrika</strong> · kaizenafrika.app<br/>
                Please reference invoice number <strong>${invoice.invoice_number}</strong> in your payment.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Send via Resend
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${senderName} via Kaizen Afrika <invoices@kaizenafrika.app>`,
        to: invoice.client_email,
        reply_to: senderEmail || undefined,
        subject: `Invoice ${invoice.invoice_number} from ${senderName} — ${formatCurrency(invoice.total, currency)} due ${formatDate(invoice.due_date)}`,
        html,
      }),
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      console.error("Resend error:", errBody);
      let resendMsg = "Failed to send email";
      try { resendMsg = JSON.parse(errBody)?.message || resendMsg; } catch {}
      return new Response(JSON.stringify({ error: resendMsg }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Mark invoice as sent
    await adminClient
      .from("invoices")
      .update({ status: "sent" })
      .eq("id", invoice_id);

    // Notify client if they have a Kaizen Afrika account
    const { data: clientProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", invoice.client_email)
      .maybeSingle();

    if (clientProfile?.id) {
      await adminClient.from("notifications").insert({
        user_id: clientProfile.id,
        type: "invoice_received",
        title: `Invoice from ${senderName}`,
        body: `You have received invoice ${invoice.invoice_number} for ${formatCurrency(invoice.total, currency)}.`,
        data: { invoice_id, link: "/received" },
      });
    }

    return new Response(JSON.stringify({ sent: true }), {
      status: 200, headers: { ...cors, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("invoice-send error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
