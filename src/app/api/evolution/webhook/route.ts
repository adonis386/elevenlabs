import { NextResponse } from "next/server";
import { evolutionSendText } from "@/lib/evolution-outbound";
import { parseMessagesUpsert } from "@/lib/evolution-inbound";
import { generateAgentReply } from "@/lib/gemini-agent";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST: Evolution → Vercel. Responde por WhatsApp con Gemini 3 (@google/genai).
 * @see https://ai.google.dev/gemini-api/docs/gemini-3?hl=es-419
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const inbound = parseMessagesUpsert(body);
  if (!inbound) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const base = process.env.EVOLUTION_API_BASE?.replace(/\/$/, "");
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instanceFallback = process.env.EVOLUTION_INSTANCE?.trim();

  if (!base || !apiKey) {
    console.error("[evolution webhook] Faltan EVOLUTION_API_BASE o EVOLUTION_API_KEY");
    return NextResponse.json({ ok: false, error: "Evolution no configurado en Vercel" }, { status: 500 });
  }

  const instanceName = instanceFallback || inbound.instanceName;
  if (!instanceName) {
    return NextResponse.json({ ok: false, error: "Sin nombre de instancia" }, { status: 500 });
  }

  try {
    const reply = await generateAgentReply({
      userDisplayName: inbound.pushName,
      userMessage: inbound.userText,
    });

    const send = await evolutionSendText({
      baseUrl: base,
      apiKey,
      instanceName,
      number: inbound.number,
      text: reply,
    });

    if (!send.ok) {
      console.error("[evolution webhook] sendText falló", send.status, send.body.slice(0, 500));
      return NextResponse.json(
        { ok: false, error: "Fallo al enviar por Evolution", status: send.status },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[evolution webhook]", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
