// Emails staff whenever a new quote request is saved.
// Called by a Supabase Database Webhook (INSERT on public.contact_messages).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char,
  );

// Constant-time comparison so the secret cannot be guessed by timing
const sameSecret = (a: string, b: string) => {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed." }, { status: 405 });
  }

  const secret = Deno.env.get("WEBHOOK_SECRET");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const emailFrom = Deno.env.get("EMAIL_FROM");
  const notifyTo = (Deno.env.get("NOTIFY_EMAIL") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const siteUrl = Deno.env.get("SITE_URL") ?? "";
  if (!secret || !resendKey || !emailFrom || !notifyTo.length || !serviceKey) {
    return Response.json({ error: "Notification service is not configured." }, { status: 500 });
  }

  if (!sameSecret(req.headers.get("x-webhook-secret") ?? "", secret)) {
    return Response.json({ error: "Not allowed." }, { status: 401 });
  }

  let payload: { type?: string; table?: string; record?: { id?: unknown } };
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (payload.type !== "INSERT" || payload.table !== "contact_messages") {
    return Response.json({ skipped: true });
  }
  const id = Number(payload.record?.id);
  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ error: "A valid request ID is required." }, { status: 400 });
  }

  // Read the saved row from the database rather than trusting the payload
  const db = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: m, error } = await db
    .from("contact_messages")
    .select("id, name, email, phone, service, origin, destination, message, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!m) return Response.json({ error: "Request not found." }, { status: 404 });

  let adminUrl = "";
  try {
    adminUrl = new URL("/admin.html", siteUrl).toString();
  } catch {
    /* SITE_URL not set: the email simply has no link */
  }

  const route = [m.origin, m.destination].filter(Boolean).join(" → ");
  const subject = `New quote request: ${m.name}${route ? ` (${route})` : ""}`.slice(0, 180);
  const rows: [string, string][] = [
    ["Name", m.name],
    ["Email", m.email],
    ["Phone", m.phone || "—"],
    ["Transport", m.service || "—"],
    ["From", m.origin || "—"],
    ["To", m.destination || "—"],
    ["Received", new Date(m.created_at).toUTCString()],
  ];
  const text = [
    "A new quote request was sent from the website.",
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    m.message,
    "",
    adminUrl ? `Open the admin page: ${adminUrl}` : "",
    "Reply to this email to answer the customer directly.",
  ].join("\n");
  const html = `
    <div style="font-family:Arial,sans-serif;font-size:15px;color:#0a2342;max-width:600px">
      <h2 style="margin:0 0 12px">New quote request</h2>
      <table cellpadding="6" style="border-collapse:collapse">
        ${rows
          .map(
            ([k, v]) =>
              `<tr><td style="color:#5a6b7d;padding-right:16px">${k}</td><td><b>${escapeHtml(String(v))}</b></td></tr>`,
          )
          .join("")}
      </table>
      <p style="white-space:pre-wrap;background:#f3f6f9;padding:14px;border-radius:8px">${escapeHtml(m.message)}</p>
      ${adminUrl ? `<p><a href="${escapeHtml(adminUrl)}" style="background:#f26b1d;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Open admin page</a></p>` : ""}
      <p style="color:#5a6b7d;font-size:13px">Reply to this email to answer ${escapeHtml(m.name)} directly.</p>
    </div>`;

  const validReplyTo = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/.test(m.email);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: emailFrom,
      to: notifyTo,
      subject,
      text,
      html,
      ...(validReplyTo ? { reply_to: m.email } : {}),
    }),
  });
  if (!res.ok) {
    return Response.json({ error: "Email could not be sent.", detail: await res.text() }, { status: 502 });
  }
  return Response.json({ sent: true });
});
