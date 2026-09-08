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
    const { contract_id } = await req.json();
    if (!contract_id) {
      return new Response(JSON.stringify({ error: "contract_id required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // User-scoped client: anon key + caller's JWT so PostgREST uses auth.uid() for RLS
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    // Admin client: service role for writes that cross user boundaries
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Identify caller for rate limiting
    const { data: { user: caller } } = await adminClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!caller) {
      adminClient.rpc("log_security_event", { p_event_type: "auth_failure", p_endpoint: "canvas-send", p_detail: "Token validation failed" }).catch(() => {});
      console.warn("[security] auth_failure endpoint=canvas-send");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    // Rate limit: 10 requests per minute per user
    const { data: rlAllowed } = await adminClient.rpc("check_rate_limit", {
      p_user_id: caller.id,
      p_endpoint: "canvas-send",
      p_limit: 10,
      p_window_secs: 60,
    });
    if (!rlAllowed) {
      adminClient.rpc("log_security_event", { p_event_type: "rate_limit", p_user_id: caller.id, p_endpoint: "canvas-send", p_detail: "Per-minute limit exceeded" }).catch(() => {});
      console.warn(`[security] rate_limit endpoint=canvas-send user=${caller.id}`);
      return new Response(JSON.stringify({ error: "Too many requests. Please slow down." }), {
        status: 429, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Fetch contract as the authenticated user — RLS ensures they can only see their own
    const { data: contract, error: conErr } = await userClient
      .from("canvases")
      .select("*")
      .eq("id", contract_id)
      .single();

    if (conErr || !contract) {
      return new Response(JSON.stringify({ error: "Canvas not found" }), {
        status: 404, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (!contract.client_email) {
      return new Response(JSON.stringify({ error: "No client email on this Canvas" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Fetch sender profile + business settings
    const [{ data: profile }, { data: biz }] = await Promise.all([
      userClient.from("profiles").select("display_name, email").single(),
      userClient.from("business_settings").select("*").maybeSingle(),
    ]);

    const senderName = biz?.business_name || profile?.display_name || "Kaizen Afrika User";
    const senderEmail = biz?.business_email || profile?.email || "";
    const currency = contract.currency || "KES";

    const deliverablesHtml = Array.isArray(contract.deliverables) && contract.deliverables.length
      ? `<ul style="margin:8px 0 0;padding-left:20px;">${contract.deliverables.map((d: string) =>
          `<li style="font-size:13px;color:#444;margin-bottom:4px;">${d}</li>`
        ).join("")}</ul>`
      : "";

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Canvas: ${contract.title}</title>
</head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#1a1a1a;padding:28px 40px;">
              <table width="100%"><tr>
                <td>
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td style="vertical-align:middle;">
                      <span style="font-size:22px;font-weight:700;color:#c9a96e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Kaizen Afrika</span>
                    </td>
                  </tr></table>
                </td>
                <td align="right">
                  <p style="margin:0;font-size:13px;color:#888;">Canvas</p>
                  <p style="margin:2px 0 0;font-size:16px;font-weight:700;color:#fff;">${contract.title}</p>
                </td>
              </tr></table>
            </td>
          </tr>

          <!-- Parties -->
          <tr>
            <td style="padding:28px 40px 0;">
              <table width="100%"><tr>
                <td style="vertical-align:top;">
                  <p style="margin:0 0 2px;font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:0.7px;">From</p>
                  <p style="margin:0;font-size:14px;font-weight:600;color:#111;">${senderName}</p>
                  ${senderEmail ? `<p style="margin:2px 0 0;font-size:13px;color:#666;">${senderEmail}</p>` : ""}
                </td>
                <td style="vertical-align:top;" align="right">
                  <p style="margin:0 0 2px;font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:0.7px;">To</p>
                  <p style="margin:0;font-size:14px;font-weight:600;color:#111;">${contract.client_name}</p>
                  <p style="margin:2px 0 0;font-size:13px;color:#666;">${contract.client_email}</p>
                </td>
              </tr></table>
            </td>
          </tr>

          <!-- Key Terms -->
          <tr>
            <td style="padding:20px 40px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#f9f7f3;border-radius:8px;padding:16px 20px;">
                    <table width="100%">
                      <tr>
                        ${contract.start_date ? `<td>
                          <p style="margin:0 0 2px;font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:0.7px;">Start Date</p>
                          <p style="margin:0;font-size:14px;font-weight:500;color:#333;">${formatDate(contract.start_date)}</p>
                        </td>` : ""}
                        ${contract.end_date ? `<td align="center">
                          <p style="margin:0 0 2px;font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:0.7px;">End Date</p>
                          <p style="margin:0;font-size:14px;font-weight:600;color:#c9a96e;">${formatDate(contract.end_date)}</p>
                        </td>` : ""}
                        ${contract.value ? `<td align="right">
                          <p style="margin:0 0 2px;font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:0.7px;">Canvas Value</p>
                          <p style="margin:0;font-size:18px;font-weight:700;color:#111;">${formatCurrency(contract.value, currency)}</p>
                        </td>` : ""}
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Deliverables -->
          ${deliverablesHtml ? `
          <tr>
            <td style="padding:20px 40px 0;">
              <p style="margin:0 0 6px;font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:0.7px;">Deliverables</p>
              ${deliverablesHtml}
            </td>
          </tr>` : ""}

          <!-- Payment Terms -->
          ${contract.payment_terms ? `
          <tr>
            <td style="padding:16px 40px 0;">
              <p style="margin:0 0 6px;font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:0.7px;">Payment Terms</p>
              <p style="margin:0;font-size:13px;color:#444;line-height:1.6;">${contract.payment_terms}</p>
            </td>
          </tr>` : ""}

          <!-- CTA -->
          <tr>
            <td style="padding:28px 40px;">
              <table width="100%"><tr><td align="center">
                <a href="https://kaizenafrika.app/received?tab=canvases&id=${contract_id}" style="display:inline-block;background:#c9a96e;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:15px;">
                  View &amp; Sign Canvas
                </a>
              </td></tr></table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:0 40px 32px;border-top:1px solid #f0ede8;">
              <p style="margin:16px 0 0;font-size:12px;color:#aaa;line-height:1.7;">
                This Canvas was sent via <strong style="color:#c9a96e;">Kaizen Afrika</strong> · kaizenafrika.app<br/>
                Log in to your Kaizen Afrika account to review and sign.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Send email via Resend
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${senderName} via Kaizen Afrika <contracts@kaizenafrika.app>`,
        to: contract.client_email,
        reply_to: senderEmail || undefined,
        subject: `Canvas from ${senderName}: ${contract.title}`,
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

    // Mark contract as sent
    await adminClient
      .from("canvases")
      .update({ status: "sent" })
      .eq("id", contract_id);

    // Notify client if they have a Kaizen Afrika account
    const { data: clientProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", contract.client_email)
      .maybeSingle();

    if (clientProfile?.id) {
      await adminClient.from("notifications").insert({
        user_id: clientProfile.id,
        type: "canvas_received",
        title: `Canvas from ${senderName}`,
        body: `You have received a Canvas: "${contract.title}". Review and sign it on Kaizen Afrika.`,
        data: { contract_id, link: "/received" },
      });
    }

    return new Response(JSON.stringify({ sent: true }), {
      status: 200, headers: { ...cors, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("contract-send error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
