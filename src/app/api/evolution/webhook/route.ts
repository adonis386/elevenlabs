import { NextResponse } from "next/server";

import { evolutionSendPresence, evolutionSendText } from "@/lib/evolution-outbound";
import { parseMessagesUpsert } from "@/lib/evolution-inbound";
import { generateAgentReply } from "@/lib/gemini-agent";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Máximo de ms que pedimos mostrar "escribiendo…" (debe cubrir la generación con Gemini). */
function typingDelayMs(): number {
  const raw = process.env.EVOLUTION_TYPING_DELAY_MS?.trim();
  const n = raw ? Number.parseInt(raw, 10) : 45_000;
  if (!Number.isFinite(n)) return 45_000;
  return Math.min(Math.max(n, 3000), 55_000);
}

/**
 * POST: Evolution → Vercel. Responde por WhatsApp con Gemini (@google/genai).
 * Activa presencia "composing" antes de generar para que el usuario vea "escribiendo…".
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
    const presence = await evolutionSendPresence({
      baseUrl: base,
      apiKey,
      instanceName,
      number: inbound.number,
      presence: "composing",
      delayMs: typingDelayMs(),
    });
    if (!presence.ok) {
      console.warn(
        "[evolution webhook] sendPresence (composing) no OK",
        presence.status,
        presence.body.slice(0, 200),
      );
    }

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
