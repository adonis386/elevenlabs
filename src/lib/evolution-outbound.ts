/**
 * Envía texto por WhatsApp vía Evolution API v2.
 * @see https://doc.evolution-api.com/v2/api-reference/message-controller/send-text
 */
export async function evolutionSendText(input: {
  baseUrl: string;
  apiKey: string;
  instanceName: string;
  /** Solo dígitos con código de país, sin + (ej. 584241224783) */
  number: string;
  text: string;
}): Promise<{ ok: boolean; status: number; body: string }> {
  const base = input.baseUrl.replace(/\/$/, "");
  const path = `/message/sendText/${encodeURIComponent(input.instanceName)}`;
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      apikey: input.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      number: input.number,
      text: input.text,
    }),
  });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body };
}

/**
 * Envía audio / nota de voz por WhatsApp vía Evolution API v2.
 * @see https://doc.evolution-api.com/v2/api-reference/message-controller/send-audio
 */
export async function evolutionSendWhatsAppAudio(input: {
  baseUrl: string;
  apiKey: string;
  instanceName: string;
  number: string;
  /** URL pública o audio en base64 (p. ej. MP3). */
  audio: string;
}): Promise<{ ok: boolean; status: number; body: string }> {
  const base = input.baseUrl.replace(/\/$/, "");
  const path = `/message/sendWhatsAppAudio/${encodeURIComponent(input.instanceName)}`;
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      apikey: input.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      number: input.number,
      audio: input.audio,
    }),
  });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body };
}
