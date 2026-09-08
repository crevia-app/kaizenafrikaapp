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

function formatDateTime(date: Date): string {
  return date.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user?.email) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Respect the user's preference — default true for new users
    const alertsEnabled = user.user_metadata?.login_alerts_enabled !== false;
    if (!alertsEnabled) {
      return new Response(JSON.stringify({ skipped: true }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const signInTime = formatDateTime(new Date());
    const settingsUrl = "https://kaizenafrika.app/profile/settings?tab=security";
    const displayName = user.user_metadata?.display_name || user.user_metadata?.full_name || user.email;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New sign-in to your Kaizen Afrika account</title>
</head>
<body style="margin:0;padding:0;background:#f9f9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f7;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#1a1a1a;padding:28px 40px;">
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="vertical-align:middle;">
                  <span style="font-size:22px;font-weight:700;color:#c9a96e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Kaizen Afrika</span>
                </td>
              </tr></table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 28px;">
              <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111;">New sign-in detected</p>
              <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.6;">
                Hi ${displayName},<br/>
                We detected a new sign-in to your Kaizen Afrika account.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;border-radius:8px;padding:20px;margin-bottom:24px;">
                <tr>
                  <td>
                    <p style="margin:0 0 6px;font-size:11px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.8px;">Time</p>
                    <p style="margin:0;font-size:14px;color:#222;font-weight:500;">${signInTime}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 20px;font-size:14px;color:#555;line-height:1.6;">
                If this was you, no action is needed.<br/>
                If this <strong>wasn't you</strong>, secure your account immediately.
              </p>

              <a href="${settingsUrl}" style="display:inline-block;background:#c9a96e;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;">
                Secure My Account
              </a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 28px;border-top:1px solid #f0ede8;">
              <p style="margin:0;font-size:12px;color:#aaa;line-height:1.6;">
                You received this because login alerts are enabled for your account.<br/>
                To turn them off, visit <a href="${settingsUrl}" style="color:#c9a96e;text-decoration:none;">Settings → Security</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Kaizen Afrika Security <security@kaizenafrika.app>",
        to: user.email,
        subject: "New sign-in to your Kaizen Afrika account",
        html,
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.text();
      console.error("Resend error:", err);
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ sent: true }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("login-alert error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
