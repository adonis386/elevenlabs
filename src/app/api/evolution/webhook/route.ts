import { NextResponse } from "next/server";
import { clipTextForTts, elevenLabsTtsMaxChars, textToSpeechMp3Base64 } from "@/lib/elevenlabs-tts";
import { evolutionSendText, evolutionSendWhatsAppAudio } from "@/lib/evolution-outbound";
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

  const elevenKey = process.env.ELEVENLABS_API_KEY?.trim();
  const elevenVoice = process.env.ELEVENLABS_VOICE_ID?.trim();
  const useVoice = Boolean(elevenKey && elevenVoice);

  try {
    const reply = await generateAgentReply({
      userDisplayName: inbound.pushName,
      userMessage: inbound.userText,
      forVoiceNote: useVoice,
    });

    if (useVoice) {
      const maxChars = elevenLabsTtsMaxChars();
      const forTts = clipTextForTts(reply, maxChars);
      const audioB64 = await textToSpeechMp3Base64({
        apiKey: elevenKey!,
        voiceId: elevenVoice!,
        text: forTts,
      });

      const sendAudio = await evolutionSendWhatsAppAudio({
        baseUrl: base,
        apiKey,
        instanceName,
        number: inbound.number,
        audio: audioB64,
      });

      if (!sendAudio.ok) {
        console.error(
          "[evolution webhook] sendWhatsAppAudio falló, reintento con texto",
          sendAudio.status,
          sendAudio.body.slice(0, 500),
        );
        const fallback = await evolutionSendText({
          baseUrl: base,
          apiKey,
          instanceName,
          number: inbound.number,
          text: reply,
        });
        if (!fallback.ok) {
          return NextResponse.json(
            {
              ok: false,
              error: "Fallo al enviar audio y texto",
              audioStatus: sendAudio.status,
              textStatus: fallback.status,
            },
            { status: 502 },
          );
        }
        return NextResponse.json({ ok: true, mode: "text_fallback" });
      }

      return NextResponse.json({ ok: true, mode: "voice" });
    }

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

    return NextResponse.json({ ok: true, mode: "text" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[evolution webhook]", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
