import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char] ?? char,
  );

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  const siteUrl = Deno.env.get("SITE_URL") ?? "";
  let allowedOrigins: Set<string>;

  try {
    allowedOrigins = new Set([
      new URL(siteUrl).origin,
      "https://continentalbridgefreightline.com",
      "https://www.continentalbridgefreightline.com",
      "http://localhost:5500",
      "http://127.0.0.1:5500",
    ]);
  } catch {
    return Response.json(
      { error: "Email service is not configured." },
      { status: 500 },
    );
  }

  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
  if (allowedOrigins.has(origin))
    headers["Access-Control-Allow-Origin"] = origin;

  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (origin && !allowedOrigins.has(origin)) {
    return Response.json(
      { error: "Origin is not allowed." },
      { status: 403, headers },
    );
  }
  if (req.method !== "POST") {
    return Response.json(
      { error: "Method not allowed." },
      { status: 405, headers },
    );
  }

  try {
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const emailFrom = Deno.env.get("EMAIL_FROM");
    if (!token || !serviceKey || !resendKey || !emailFrom) {
      return Response.json(
        { error: "Email service is not configured." },
        { status: 500, headers },
      );
    }

    let body: { shipment_id?: unknown };
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { error: "Invalid request body." },
        { status: 400, headers },
      );
    }
    if (
      typeof body.shipment_id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        body.shipment_id,
      )
    ) {
      return Response.json(
        { error: "A valid shipment ID is required." },
        { status: 400, headers },
      );
    }

    const db = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser(token);
    if (authError || !user) {
      return Response.json(
        { error: "Sign in to an admin account to send this email." },
        { status: 401, headers },
      );
    }

    const { data: admin, error: adminError } = await db
      .from("admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (adminError) throw adminError;
    if (!admin) {
      return Response.json(
        { error: "This account is not authorized to send shipment emails." },
        { status: 403, headers },
      );
    }

    const { data: shipment, error: shipmentError } = await db
      .from("shipments")
      .select(
        "tracking_code, receiver_name, receiver_email, origin, destination, eta",
      )
      .eq("id", body.shipment_id)
      .maybeSingle();
    if (shipmentError) throw shipmentError;
    if (!shipment) {
      return Response.json(
        { error: "Shipment not found." },
        { status: 404, headers },
      );
    }
    if (!shipment.receiver_email) {
      return Response.json(
        { error: "This shipment has no customer email address." },
        { status: 400, headers },
      );
    }

    const trackingUrl = new URL(
      `/track.html?code=${encodeURIComponent(shipment.tracking_code)}`,
      siteUrl,
    ).toString();
    const name = shipment.receiver_name || "Customer";
    const subject = `Shipment ${shipment.tracking_code} is ready to track`;
    const text = [
      `Hello ${name},`,
      "",
      "Your shipment has been registered and is ready to track.",
      `Tracking number: ${shipment.tracking_code}`,
      `From: ${shipment.origin || "—"}`,
      `To: ${shipment.destination || "—"}`,
      shipment.eta ? `Estimated delivery: ${shipment.eta}` : "",
      "",
      `Track your shipment: ${trackingUrl}`,
      "",
      "Continental Bridge Freight Line",
    ]
      .filter(Boolean)
      .join("\n");
    const html = `
      <p>Hello ${escapeHtml(name)},</p>
      <p>Your shipment has been registered and is ready to track.</p>
      <p><strong>Tracking number:</strong> ${escapeHtml(shipment.tracking_code)}<br>
      <strong>From:</strong> ${escapeHtml(shipment.origin || "—")}<br>
      <strong>To:</strong> ${escapeHtml(shipment.destination || "—")}<br>
      ${shipment.eta ? `<strong>Estimated delivery:</strong> ${escapeHtml(shipment.eta)}<br>` : ""}
      </p>
      <p><a href="${escapeHtml(trackingUrl)}">Track your shipment</a></p>
      <p>Continental Bridge Freight Line</p>`;

    const resendAuthHeader = ["Bearer", resendKey].join(" ");
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: resendAuthHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [shipment.receiver_email],
        subject,
        text,
        html,
      }),
    });
    if (!response.ok) {
      const details = await response.text();
      console.error(
        "Resend rejected shipment email:",
        response.status,
        details,
      );
      return Response.json(
        { error: "The email provider could not send the notification." },
        { status: 502, headers },
      );
    }

    return Response.json({ success: true }, { headers });
  } catch (error) {
    console.error("Could not send shipment email:", error);
    return Response.json(
      { error: "Could not send the shipment email." },
      { status: 500, headers },
    );
  }
});
