import crypto from "crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Env (Meta WhatsApp Cloud API):
 * - WHATSAPP_VERIFY_TOKEN — must match the verify token in Meta Developer Console (webhook).
 * - WHATSAPP_APP_SECRET — optional; if set, validates X-Hub-Signature-256 on POST.
 * - WHATSAPP_ACCESS_TOKEN — optional; if set with WHATSAPP_PHONE_NUMBER_ID, sends text replies.
 * - WHATSAPP_PHONE_NUMBER_ID — Graph API phone number ID for outbound messages.
 * - WHATSAPP_GRAPH_API_VERSION — default "v21.0".
 */

function verifyMetaSignature(rawBody: string, signatureHeader: string | null, appSecret: string) {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const received = signatureHeader.slice(7);
  const expected = crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  try {
    const a = Buffer.from(received, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

type WaTextMessage = {
  from?: string;
  type?: string;
  text?: { body?: string };
};

type WaWebhookValue = {
  messaging_product?: string;
  metadata?: { phone_number_id?: string };
  messages?: WaTextMessage[];
};

type WaChange = { value?: WaWebhookValue; field?: string };

type WaEntry = { id?: string; changes?: WaChange[] };

type WaWebhookBody = {
  object?: string;
  entry?: WaEntry[];
};

async function sendWhatsAppText(params: {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  body: string;
  graphVersion: string;
}) {
  const { phoneNumberId, accessToken, to, body, graphVersion } = params;
  const url = `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { preview_url: false, body },
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error("[meta/whatsapp] Graph send failed", res.status, errText);
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (mode === "subscribe" && token && verifyToken && token === verifyToken && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: Request) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  const raw = await req.text();

  if (appSecret) {
    const sig = req.headers.get("x-hub-signature-256");
    const ok = verifyMetaSignature(raw, sig, appSecret);
    if (!ok) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let payload: WaWebhookBody;
  try {
    payload = JSON.parse(raw) as WaWebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload.object !== "whatsapp_business_account") {
    return NextResponse.json({ error: "Unsupported object" }, { status: 404 });
  }

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const defaultPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const graphVersion = process.env.WHATSAPP_GRAPH_API_VERSION ?? "v21.0";

  const entries = payload.entry ?? [];
  for (const ent of entries) {
    const changes = ent.changes ?? [];
    for (const change of changes) {
      const value = change.value;
      if (!value?.messages?.length) continue;

      const phoneNumberId = value.metadata?.phone_number_id ?? defaultPhoneNumberId;

      for (const msg of value.messages) {
        if (msg.type !== "text" || !msg.from) continue;
        const inboundText = msg.text?.body ?? "";
        const reply = `Recibido de ${msg.from}: ${inboundText}`;

        if (accessToken && phoneNumberId) {
          await sendWhatsAppText({
            phoneNumberId,
            accessToken,
            to: msg.from,
            body: reply,
            graphVersion,
          });
        }
      }
    }
  }

  return NextResponse.json({}, { status: 200 });
}
