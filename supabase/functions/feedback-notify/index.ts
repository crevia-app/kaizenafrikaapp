import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FROM_EMAIL = "noreply@kaizenafrika.app";
const RESEND_URL = "https://api.resend.com/emails";

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

serve(async (req: Request) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    // ── Auth gate: caller must be authenticated ──────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Resolve admin email dynamically from the portal
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("email")
      .eq("is_admin", true)
      .limit(1)
      .single();
    const adminEmail = adminProfile?.email;
    if (!adminEmail) throw new Error("No admin account found");

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) {
      supabase.rpc("log_security_event", { p_event_type: "auth_failure", p_endpoint: "feedback-notify", p_detail: "Token validation failed" }).catch(() => {});
      console.warn("[security] auth_failure endpoint=feedback-notify");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const callerUserId = user.id;

    // Rate limit: 5 requests per day per user
    const { data: rlAllowed } = await supabase.rpc("check_rate_limit", {
      p_user_id: callerUserId,
      p_endpoint: "feedback-notify",
      p_limit: 5,
      p_window_secs: 86400,
    });
    if (!rlAllowed) {
      supabase.rpc("log_security_event", { p_event_type: "rate_limit", p_user_id: callerUserId, p_endpoint: "feedback-notify", p_detail: "Daily limit exceeded" }).catch(() => {});
      console.warn(`[security] rate_limit endpoint=feedback-notify user=${callerUserId}`);
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { feedback_id, message, type, user_email, user_name } = body;

    // If feedback_id provided, fetch from DB; otherwise use body fields directly (webhook path)
    let feedbackMessage = message;
    let feedbackType = type ?? "thought";
    let submitterEmail = user_email ?? "Anonymous";
    let submitterName = user_name ?? "Anonymous";
    let submittedAt = new Date().toISOString();

    if (feedback_id) {
      const { data: fb, error: fbErr } = await supabase
        .from("feedback")
        .select("id, type, title, message, created_at, user_id")
        .eq("id", feedback_id)
        .single();

      if (fbErr || !fb) throw new Error("Feedback record not found");

      // ── Ownership check: caller must own this feedback or be an admin ──────
      if (fb.user_id && fb.user_id !== callerUserId) {
        const { data: callerProfile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", callerUserId)
          .single();
        if ((callerProfile as any)?.is_admin !== true) {
          supabase.rpc("log_security_event", { p_event_type: "forbidden", p_user_id: callerUserId, p_endpoint: "feedback-notify", p_detail: `IDOR attempt on feedback_id=${feedback_id}` }).catch(() => {});
          console.warn(`[security] forbidden endpoint=feedback-notify user=${callerUserId} feedback_id=${feedback_id}`);
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { ...cors, "Content-Type": "application/json" },
          });
        }
      }

      feedbackMessage = fb.message;
      feedbackType = fb.type;
      submittedAt = fb.created_at;

      if (fb.user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", fb.user_id)
          .single();
        if (profile) {
          submitterName = (profile as any).display_name ?? (profile as any).full_name ?? "Unknown";
          submitterEmail = profile.email ?? "Unknown";
        }
      }
    }

    const typeLabel = feedbackType === "feature" ? "Feature Request" : "Thought / Feedback";
    const formattedDate = new Date(submittedAt).toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>New Feedback — Kaizen Afrika</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f4f0; margin: 0; padding: 32px 16px; color: #1a1a1a; }
  .card { background: #fff; max-width: 560px; margin: 0 auto; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 16px rgba(0,0,0,0.08); }
  .header { background: #1a1a1a; padding: 28px 32px; }
  .header h1 { color: #fff; font-size: 20px; margin: 0 0 4px; font-weight: 600; }
  .header p { color: #999; font-size: 13px; margin: 0; }
  .badge { display: inline-block; background: #c8a876; color: #fff; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 16px; }
  .body { padding: 28px 32px; }
  .label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #999; margin-bottom: 4px; }
  .value { font-size: 14px; color: #1a1a1a; margin-bottom: 20px; }
  .message-box { background: #f9f8f5; border-left: 3px solid #c8a876; padding: 16px 20px; border-radius: 0 8px 8px 0; font-size: 14px; line-height: 1.7; color: #333; white-space: pre-wrap; word-break: break-word; }
  .footer { padding: 16px 32px; background: #f9f8f5; border-top: 1px solid #eee; font-size: 12px; color: #999; }
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <table cellpadding="0" cellspacing="0" style="margin-bottom:12px;"><tr>
      <td style="vertical-align:middle;">
        <span style="font-size:20px;font-weight:700;color:#c9a96e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Kaizen Afrika</span>
      </td>
    </tr></table>
    <h1>New Feedback Received</h1>
    <p>Submitted via Kaizen Afrika · ${formattedDate}</p>
  </div>
  <div class="body">
    <div class="badge">${typeLabel}</div>

    <div class="label">From</div>
    <div class="value">${submitterName} &lt;${submitterEmail}&gt;</div>

    <div class="label">Message</div>
    <div class="message-box">${feedbackMessage.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
  </div>
  <div class="footer">Kaizen Afrika Admin · Do not reply to this email</div>
</div>
</body>
</html>`;

    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Kaizen Afrika Feedback <${FROM_EMAIL}>`,
        to: [adminEmail],
        subject: `[Kaizen Afrika Feedback] ${typeLabel} from ${submitterName}`,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Resend error ${res.status}: ${errText}`);
    }

    const resData = await res.json();

    return new Response(
      JSON.stringify({ success: true, email_id: resData.id }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[feedback-notify]", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
