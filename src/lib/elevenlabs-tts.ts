import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const DEFAULT_MODEL = "eleven_multilingual_v2";

async function readableStreamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Buffer[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value?.length) chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

/**
 * Convierte texto en MP3 (base64) vía ElevenLabs para enviarlo a Evolution como nota de voz.
 */
export async function textToSpeechMp3Base64(input: {
  apiKey: string;
  voiceId: string;
  text: string;
  modelId?: string;
}): Promise<string> {
  const client = new ElevenLabsClient({ apiKey: input.apiKey });
  const stream = await client.textToSpeech.convert(input.voiceId, {
    text: input.text,
    modelId: input.modelId?.trim() || process.env.ELEVENLABS_MODEL_ID?.trim() || DEFAULT_MODEL,
    outputFormat: "mp3_44100_128",
    optimizeStreamingLatency: 2,
  });
  const buf = await readableStreamToBuffer(stream);
  return buf.toString("base64");
}

export function clipTextForTts(text: string, maxChars: number): string {
  const t = text.trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

export function elevenLabsTtsMaxChars(): number {
  const raw = process.env.ELEVENLABS_MAX_CHARS?.trim();
  const n = raw ? Number.parseInt(raw, 10) : 2500;
  return Number.isFinite(n) && n > 200 ? Math.min(n, 9000) : 2500;
}
