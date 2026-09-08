import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FROM_EMAIL  = "noreply@kaizenafrika.app";
const RESEND_URL  = "https://api.resend.com/emails";

const ALLOWED_ORIGINS = [
  "https://kaizenafrika.app",
  "https://www.kaizenafrika.app",
  "http://localhost:8080",
  "http://localhost:5173",
  "https://kaizenafrika.app",
];

function getCorsHeaders(req: Request) {
  const origin  = req.headers.get("Origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

serve(async (req: Request) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    // ── Auth gate: caller must be authenticated ──────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) {
      supabase.rpc("log_security_event", { p_event_type: "auth_failure", p_endpoint: "verification-notify", p_detail: "Token validation failed" }).catch(() => {});
      console.warn("[security] auth_failure endpoint=verification-notify");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const callerUserId = user.id;

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY not configured");

    // Rate limit: 5 requests per day per user
    const { data: rlAllowed } = await supabase.rpc("check_rate_limit", {
      p_user_id: callerUserId,
      p_endpoint: "verification-notify",
      p_limit: 5,
      p_window_secs: 86400,
    });
    if (!rlAllowed) {
      supabase.rpc("log_security_event", { p_event_type: "rate_limit", p_user_id: callerUserId, p_endpoint: "verification-notify", p_detail: "Daily limit exceeded" }).catch(() => {});
      console.warn(`[security] rate_limit endpoint=verification-notify user=${callerUserId}`);
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Resolve admin email dynamically from the portal
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("email")
      .eq("is_admin", true)
      .limit(1)
      .single();
    const adminEmail = adminProfile?.email;
    if (!adminEmail) throw new Error("No admin account found");

    const { request_id } = await req.json();
    if (!request_id) throw new Error("request_id is required");

    // Fetch verification request + profile
    const { data: vr, error: vrErr } = await supabase
      .from("verification_requests")
      .select("*, profiles:user_id(display_name, handle, email, avatar_url)")
      .eq("id", request_id)
      .single();

    if (vrErr || !vr) throw new Error("Verification request not found");

    // ── Ownership check: caller must own the request or be an admin ──────────
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", callerUserId)
      .single();
    const isAdmin = (callerProfile as any)?.is_admin === true;

    if (!isAdmin && (vr as any).user_id !== callerUserId) {
      supabase.rpc("log_security_event", { p_event_type: "forbidden", p_user_id: callerUserId, p_endpoint: "verification-notify", p_detail: `IDOR attempt on request_id=${request_id}` }).catch(() => {});
      console.warn(`[security] forbidden endpoint=verification-notify user=${callerUserId} request_id=${request_id}`);
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const profile     = (vr as any).profiles ?? {};
    const name        = profile.display_name || profile.handle || "Unknown";
    const email       = profile.email        || "—";
    const handle      = profile.handle       || "—";
    const submittedAt = new Date(vr.created_at).toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

    const socialRows = [
      vr.instagram_handle && `<tr><td style="padding:6px 0;color:#888;font-size:13px;width:110px">Instagram</td><td style="padding:6px 0;font-size:13px;font-weight:600;color:#1a1a1a">@${vr.instagram_handle}</td></tr>`,
      vr.tiktok_handle    && `<tr><td style="padding:6px 0;color:#888;font-size:13px">TikTok</td><td style="padding:6px 0;font-size:13px;font-weight:600;color:#1a1a1a">@${vr.tiktok_handle}</td></tr>`,
      vr.youtube_handle   && `<tr><td style="padding:6px 0;color:#888;font-size:13px">YouTube</td><td style="padding:6px 0;font-size:13px;font-weight:600;color:#1a1a1a">${vr.youtube_handle}</td></tr>`,
      vr.twitter_handle   && `<tr><td style="padding:6px 0;color:#888;font-size:13px">X / Twitter</td><td style="padding:6px 0;font-size:13px;font-weight:600;color:#1a1a1a">@${vr.twitter_handle}</td></tr>`,
      vr.follower_count   && `<tr><td style="padding:6px 0;color:#888;font-size:13px">Followers</td><td style="padding:6px 0;font-size:13px;font-weight:600;color:#1a1a1a">${Number(vr.follower_count).toLocaleString()}</td></tr>`,
    ].filter(Boolean).join("");

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>New Verification Request — Kaizen Afrika</title>
</head>
<body style="margin:0;padding:32px 16px;background:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">

  <!-- Header -->
  <tr><td style="background:#1a1a1a;padding:28px 32px;">
    <table cellpadding="0" cellspacing="0" style="margin-bottom:12px;"><tr>
      <td style="vertical-align:middle;">
        <span style="font-size:20px;font-weight:700;color:#c9a96e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Kaizen Afrika</span>
      </td>
    </tr></table>
    <p style="margin:0 0 4px;font-size:20px;font-weight:700;color:#fff;">New Verification Request</p>
    <p style="margin:0;font-size:13px;color:#888;">Submitted via Kaizen Afrika · ${submittedAt}</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:28px 32px;">
    <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#999;">From</p>
    <p style="margin:0 0 24px;font-size:15px;font-weight:600;color:#1a1a1a;">${name} &lt;${email}&gt; · @${handle}</p>

    ${socialRows ? `
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#999;">Social Handles</p>
    <table style="background:#f9f8f5;border-radius:8px;padding:12px 16px;margin-bottom:24px;width:100%;border-collapse:collapse;">
      ${socialRows}
    </table>` : ""}

    <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#999;">Reason</p>
    <div style="background:#f9f8f5;border-left:3px solid #c8a876;padding:16px 20px;border-radius:0 8px 8px 0;font-size:14px;line-height:1.7;color:#333;white-space:pre-wrap;word-break:break-word;">${String(vr.reason ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>

    <p style="margin:24px 0 0;font-size:13px;color:#888;">Review this request in your <strong style="color:#1a1a1a;">Kaizen Afrika Admin → Support</strong> dashboard.</p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:16px 32px;background:#f9f8f5;border-top:1px solid #eee;">
    <p style="margin:0;font-size:12px;color:#aaa;">Kaizen Afrika Admin · Do not reply to this email</p>
  </td></tr>

</table>
</td></tr></table>
</body>
</html>`;

    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `Kaizen Afrika Admin <${FROM_EMAIL}>`,
        to:   [adminEmail],
        subject: `[Kaizen Afrika] Verification request from ${name}`,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Resend error ${res.status}: ${errText}`);
    }

    const resData = await res.json();
    return new Response(JSON.stringify({ success: true, email_id: resData.id }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("[verification-notify]", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
