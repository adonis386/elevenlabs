/** Fragmento mínimo del payload Baileys / Evolution `messages.upsert`. */
export type EvolutionInbound = {
  instanceName: string;
  /** E.164 sin + */
  number: string;
  userText: string;
  pushName?: string;
  /** Id del mensaje en WhatsApp (`key.id`); para deduplicar webhooks repetidos. */
  messageKeyId?: string;
};

type MsgKey = {
  remoteJid?: string;
  /** Con LID, WhatsApp envía el PN aquí (p. ej. 584...@s.whatsapp.net). */
  remoteJidAlt?: string;
  fromMe?: boolean;
  id?: string;
};

type MsgEnvelope = {
  key?: MsgKey;
  message?: Record<string, unknown>;
  pushName?: string;
};

function textFromMessage(message: Record<string, unknown> | undefined): string | null {
  if (!message) return null;
  const conv = message.conversation;
  if (typeof conv === "string" && conv.trim()) return conv.trim();

  const ext = message.extendedTextMessage;
  if (ext && typeof ext === "object") {
    const t = (ext as { text?: string }).text;
    if (typeof t === "string" && t.trim()) return t.trim();
  }

  const img = message.imageMessage;
  if (img && typeof img === "object") {
    const c = (img as { caption?: string }).caption;
    if (typeof c === "string" && c.trim()) return c.trim();
  }

  return null;
}

/** Extrae número E.164 sin + desde un JID individual (@s.whatsapp.net / @c.us). */
function jidToDigits(remoteJid: string): string | null {
  if (!remoteJid || remoteJid.includes("@g.us")) return null;
  if (remoteJid.includes("status@broadcast")) return null;
  let [user] = remoteJid.split("@");
  if (!user) return null;
  // "584241224783:93@s.whatsapp.net" → parte antes de ":" (agente/dispositivo)
  if (user.includes(":")) {
    user = user.split(":")[0] ?? user;
  }
  if (!/^\d+$/.test(user)) return null;
  return user;
}

/** Prefiere PN real cuando el chat viene como Linked ID (@lid). */
function inboundDigitsFromKey(key: MsgKey): string | null {
  const primary = key.remoteJid;
  const alt = key.remoteJidAlt;
  if (primary?.endsWith("@lid") && typeof alt === "string" && alt.trim()) {
    return jidToDigits(alt.trim());
  }
  if (primary) return jidToDigits(primary);
  if (typeof alt === "string" && alt.trim()) return jidToDigits(alt.trim());
  return null;
}

function collectEnvelopes(data: unknown): MsgEnvelope[] {
  if (!data || typeof data !== "object") return [];
  const d = data as Record<string, unknown>;
  if (Array.isArray(d.messages)) {
    return d.messages.filter(Boolean) as MsgEnvelope[];
  }
  if ("key" in d) {
    return [d as MsgEnvelope];
  }
  if (Array.isArray(data)) {
    return data.filter(Boolean) as MsgEnvelope[];
  }
  return [];
}

/**
 * Extrae el primer mensaje entrante de texto de un webhook `messages.upsert`.
 */
export function parseMessagesUpsert(body: unknown): EvolutionInbound | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  if (o.event !== "messages.upsert") return null;

  const data = o.data;
  if (data && typeof data === "object") {
    const upsertType = (data as Record<string, unknown>).type;
    // `append` suele repetir mensajes ya vistos en `notify`; procesarlo duplica respuestas.
    if (upsertType === "append" && process.env.EVOLUTION_PROCESS_UPSERT_APPEND !== "true") {
      return null;
    }
  }

  const instanceName =
    (typeof o.instance === "string" && o.instance) ||
    (typeof o.instanceName === "string" && o.instanceName) ||
    "";
  if (!instanceName) return null;

  const envelopes = collectEnvelopes(o.data);
  for (const env of envelopes) {
    if (env.key?.fromMe) continue;
    if (!env.key?.remoteJid && !env.key?.remoteJidAlt) continue;
    const number = inboundDigitsFromKey(env.key);
    if (!number) continue;
    const userText = textFromMessage(env.message);
    if (!userText) continue;
    const messageKeyId =
      typeof env.key?.id === "string" && env.key.id.trim() ? env.key.id.trim() : undefined;
    return {
      instanceName,
      number,
      userText,
      pushName: typeof env.pushName === "string" ? env.pushName : undefined,
      messageKeyId,
    };
  }
  return null;
}
