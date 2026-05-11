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
