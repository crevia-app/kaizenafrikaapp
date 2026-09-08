import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Config ──────────────────────────────────────────────────────────────────

const SUPABASE_URL            = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY          = Deno.env.get("RESEND_API_KEY")!;
const CRON_SECRET             = Deno.env.get("CRON_SECRET") ?? "";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "Kaizen Afrika <invoices@kaizenafrika.app>", to, subject, html }),
  });
  return res.ok;
}

// ─── Email templates ─────────────────────────────────────────────────────────

function dueSoonTemplate(
  clientName: string,
  senderName: string,
  invoiceNumber: string,
  dueDate: string,
  total: number,
  currency: string,
): string {
  const amount = formatCurrency(total, currency);
  const due    = formatDate(dueDate);
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/><title>Invoice Reminder</title></head>
<body style="margin:0;padding:0;background:#f9f7f4;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
        <tr><td style="background:#111;padding:24px 32px;">
          <p style="margin:0;font-size:20px;font-weight:700;color:#fff;">Kaizen Afrika</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#111;">Payment Reminder</p>
          <p style="margin:0 0 24px;font-size:14px;color:#666;">Hi ${clientName},</p>
          <p style="margin:0 0 24px;font-size:14px;color:#444;line-height:1.6;">
            This is a friendly reminder that invoice <strong>${invoiceNumber}</strong> from
            <strong>${senderName}</strong> for <strong>${amount}</strong> is due on
            <strong>${due}</strong>.
          </p>
          <table width="100%" style="background:#f9f7f4;border-radius:12px;padding:20px;margin-bottom:24px;" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:13px;color:#666;">Invoice</td>
              <td align="right" style="font-size:13px;font-weight:600;color:#111;">${invoiceNumber}</td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#666;padding-top:8px;">Amount Due</td>
              <td align="right" style="font-size:16px;font-weight:700;color:#111;padding-top:8px;">${amount}</td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#666;padding-top:8px;">Due Date</td>
              <td align="right" style="font-size:13px;font-weight:600;color:#c9a96e;padding-top:8px;">${due}</td>
            </tr>
          </table>
          <p style="margin:0;font-size:13px;color:#999;line-height:1.6;">
            Please arrange payment before the due date. If you have already paid, kindly disregard this reminder.
          </p>
        </td></tr>
        <tr><td style="padding:16px 32px 24px;border-top:1px solid #f0ede8;">
          <p style="margin:0;font-size:12px;color:#bbb;">Sent via <a href="https://www.kaizenafrika.app" style="color:#bbb;">Kaizen Afrika</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function overdueTemplate(
  clientName: string,
  senderName: string,
  invoiceNumber: string,
  dueDate: string,
  total: number,
  currency: string,
): string {
  const amount = formatCurrency(total, currency);
  const due    = formatDate(dueDate);
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/><title>Invoice Overdue</title></head>
<body style="margin:0;padding:0;background:#f9f7f4;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
        <tr><td style="background:#111;padding:24px 32px;">
          <p style="margin:0;font-size:20px;font-weight:700;color:#fff;">Kaizen Afrika</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#c0392b;">Payment Overdue</p>
          <p style="margin:0 0 24px;font-size:14px;color:#666;">Hi ${clientName},</p>
          <p style="margin:0 0 24px;font-size:14px;color:#444;line-height:1.6;">
            Invoice <strong>${invoiceNumber}</strong> from <strong>${senderName}</strong> for
            <strong>${amount}</strong> was due on <strong>${due}</strong> and is now overdue.
            Please arrange payment as soon as possible.
          </p>
          <table width="100%" style="background:#fff5f5;border-radius:12px;padding:20px;margin-bottom:24px;border:1px solid #fecdd3;" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:13px;color:#666;">Invoice</td>
              <td align="right" style="font-size:13px;font-weight:600;color:#111;">${invoiceNumber}</td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#666;padding-top:8px;">Amount Overdue</td>
              <td align="right" style="font-size:16px;font-weight:700;color:#c0392b;padding-top:8px;">${amount}</td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#666;padding-top:8px;">Was Due</td>
              <td align="right" style="font-size:13px;font-weight:600;color:#c0392b;padding-top:8px;">${due}</td>
            </tr>
          </table>
          <p style="margin:0;font-size:13px;color:#999;line-height:1.6;">
            If you believe this is an error or have already made payment, please contact ${senderName} directly.
          </p>
        </td></tr>
        <tr><td style="padding:16px 32px 24px;border-top:1px solid #f0ede8;">
          <p style="margin:0;font-size:12px;color:#bbb;">Sent via <a href="https://www.kaizenafrika.app" style="color:#bbb;">Kaizen Afrika</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

serve(async (req) => {
  // Only POST
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  // Authorize — either cron secret or a service-role JWT
  const auth = req.headers.get("Authorization") ?? "";
  const isCron        = CRON_SECRET && auth === `Bearer ${CRON_SECRET}`;
  const isServiceRole = auth.startsWith("Bearer ") && auth.slice(7) === SUPABASE_SERVICE_ROLE;
  if (!isCron && !isServiceRole) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  const today     = isoDate(new Date());
  const tomorrow  = isoDate(new Date(Date.now() + 86_400_000));
  const in3Days   = isoDate(new Date(Date.now() + 3 * 86_400_000));
  const yesterday = isoDate(new Date(Date.now() - 86_400_000));

  const stats = { marked_overdue: 0, due_soon_emails: 0, overdue_emails: 0, notifications: 0, errors: [] as string[] };

  // ── 1. Mark sent invoices as overdue ─────────────────────────────────────
  const { data: nowOverdue, error: overdueErr } = await admin
    .from("invoices")
    .update({ status: "overdue" })
    .eq("status", "sent")
    .lt("due_date", today)
    .select("id, user_id, invoice_number, client_name, total, currency, due_date");

  if (overdueErr) stats.errors.push(`mark_overdue: ${overdueErr.message}`);

  for (const inv of nowOverdue ?? []) {
    stats.marked_overdue++;
    const { error: notifErr } = await admin.from("notifications").insert({
      user_id: inv.user_id,
      type:    "invoice_overdue",
      title:   "Invoice Overdue",
      body:    `${inv.invoice_number} for ${inv.client_name} — ${formatCurrency(inv.total, inv.currency || "KES")} — is now overdue.`,
      data:    { invoice_id: inv.id, invoice_number: inv.invoice_number },
    });
    if (notifErr) stats.errors.push(`notif_overdue:${inv.id}: ${notifErr.message}`);
    else stats.notifications++;
  }

  // ── 2. Due-soon client emails (due in exactly 3 days) ────────────────────
  const { data: dueSoon, error: dsErr } = await admin
    .from("invoices")
    .select("id, user_id, invoice_number, client_name, client_email, total, currency, due_date")
    .eq("status", "sent")
    .eq("due_date", in3Days);

  if (dsErr) stats.errors.push(`due_soon_query: ${dsErr.message}`);

  if (dueSoon?.length) {
    const userIds = [...new Set(dueSoon.map(i => i.user_id))];
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, display_name, handle, business_name")
      .in("id", userIds);
    const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));

    for (const inv of dueSoon) {
      const profile    = profileMap[inv.user_id];
      const senderName = profile?.business_name || profile?.display_name || profile?.handle || "Your creator";

      // In-app notification for creator
      const { error: notifErr } = await admin.from("notifications").insert({
        user_id: inv.user_id,
        type:    "invoice_due_soon",
        title:   "Invoice Due Soon",
        body:    `${inv.invoice_number} for ${inv.client_name} is due in 3 days (${formatDate(inv.due_date)}).`,
        data:    { invoice_id: inv.id, invoice_number: inv.invoice_number },
      });
      if (notifErr) stats.errors.push(`notif_due_soon:${inv.id}: ${notifErr.message}`);
      else stats.notifications++;

      // Email to client
      if (inv.client_email) {
        const sent = await sendEmail(
          inv.client_email,
          `Reminder: Invoice ${inv.invoice_number} due in 3 days`,
          dueSoonTemplate(inv.client_name, senderName, inv.invoice_number, inv.due_date, inv.total, inv.currency || "KES"),
        );
        if (sent) stats.due_soon_emails++;
        else stats.errors.push(`email_due_soon:${inv.id}`);
      }
    }
  }

  // ── 3. Overdue client emails (became overdue yesterday) ──────────────────
  const { data: overdueYesterday, error: oyErr } = await admin
    .from("invoices")
    .select("id, user_id, invoice_number, client_name, client_email, total, currency, due_date")
    .eq("status", "overdue")
    .eq("due_date", yesterday);

  if (oyErr) stats.errors.push(`overdue_yesterday_query: ${oyErr.message}`);

  if (overdueYesterday?.length) {
    const userIds = [...new Set(overdueYesterday.map(i => i.user_id))];
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, display_name, handle, business_name")
      .in("id", userIds);
    const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));

    for (const inv of overdueYesterday) {
      const profile    = profileMap[inv.user_id];
      const senderName = profile?.business_name || profile?.display_name || profile?.handle || "Your creator";

      // Email to client
      if (inv.client_email) {
        const sent = await sendEmail(
          inv.client_email,
          `Action Required: Invoice ${inv.invoice_number} is overdue`,
          overdueTemplate(inv.client_name, senderName, inv.invoice_number, inv.due_date, inv.total, inv.currency || "KES"),
        );
        if (sent) stats.overdue_emails++;
        else stats.errors.push(`email_overdue:${inv.id}`);
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, ...stats, date: today }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
