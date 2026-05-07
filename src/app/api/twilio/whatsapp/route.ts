import { NextResponse } from "next/server";
import twilio from "twilio";

export const runtime = "nodejs";

function getPublicUrlFromRequest(req: Request) {
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const forwardedHost = req.headers.get("x-forwarded-host");
  if (forwardedProto && forwardedHost) return `${forwardedProto}://${forwardedHost}`;

  const host = req.headers.get("host");
  if (host) return `https://${host}`;
  return undefined;
}

function validateTwilioSignatureOrSkip(req: Request, body: URLSearchParams) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return true;

  const signature = req.headers.get("x-twilio-signature") ?? "";
  const url = `${getPublicUrlFromRequest(req) ?? ""}${new URL(req.url).pathname}`;
  if (!url) return false;

  const params: Record<string, string> = {};
  for (const [k, v] of body.entries()) params[k] = v;

  return twilio.validateRequest(authToken, signature, url, params);
}

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/x-www-form-urlencoded")) {
    return NextResponse.json(
      { error: "Expected application/x-www-form-urlencoded" },
      { status: 415 },
    );
  }

  const raw = await req.text();
  const body = new URLSearchParams(raw);

  const ok = validateTwilioSignatureOrSkip(req, body);
  if (!ok) return NextResponse.json({ error: "Invalid Twilio signature" }, { status: 401 });

  const from = body.get("From") ?? "";
  const inboundText = body.get("Body") ?? "";

  // MVP: respond immediately via TwiML.
  // Next step: call ElevenLabs to synthesize audio, host it, and send back via Twilio REST API.
  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(`Recibido de ${from}: ${inboundText}`);

  return new NextResponse(twiml.toString(), {
    status: 200,
    headers: { "content-type": "text/xml; charset=utf-8" },
  });
}

