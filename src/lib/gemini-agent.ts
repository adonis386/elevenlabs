import { ApiError, GoogleGenAI, ThinkingLevel } from "@google/genai";

/** True si Google devolvió 429 / cuota (plan gratuito u otros límites). */
export function isGeminiRateLimitedError(e: unknown): boolean {
  if (e instanceof ApiError && e.status === 429) return true;
  const msg = e instanceof Error ? e.message : String(e);
  return (
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("quota exceeded") ||
    msg.includes('"code":429') ||
    msg.includes("GenerateRequestsPerDay")
  );
}

/** Fallo temporal del lado de Google (503 / UNAVAILABLE). */
export function isGeminiUnavailableError(e: unknown): boolean {
  if (e instanceof ApiError && e.status === 503) return true;
  const msg = e instanceof Error ? e.message : String(e);
  return msg.includes("UNAVAILABLE") || msg.includes("currently unavailable");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const DEFAULT_MODEL = "gemini-3.1-pro-preview";

/** `thinkingConfig` solo aplica a modelos Gemini 3 (p. ej. gemini-3-*); 2.5 Flash devuelve 400 si se envía. */
function modelSupportsThinkingConfig(modelId: string): boolean {
  return modelId.toLowerCase().includes("gemini-3");
}

/**
 * Agente comercial por WhatsApp: empresa de desarrollo de agentes de IA y aplicaciones.
 * Productos / planes según oferta comercial (rangos orientativos).
 */
const SYSTEM_INSTRUCTION = `Eres el asistente comercial de Vector Studio por WhatsApp.

CONTEXTO DE LA EMPRESA
Vector Studio desarrolla agentes de inteligencia artificial y aplicaciones a medida. Atiendes a clientes potenciales y actuales: explicas servicios, comparas planes y orientas al siguiente paso (agendar llamada, enviar brief, o derivar a un humano). Puedes mencionar "Vector Studio" cuando encaje de forma natural. No inventes integraciones ni precios fuera de los indicados abajo.

TONO Y FORMATO
- Respuestas breves y claras, adecuadas a WhatsApp (párrafos cortos; listas simples solo si ayudan).
- Si el usuario escribe en español, responde en español; si en otro idioma, adapta o pregunta con qué idioma prefiere continuar.
- No prometas plazos legales ni resultados garantizados. Para cierre formal, ofrece contacto con el equipo humano.

PRODUCTOS / PLANES

1) Pack "Starter IA" (validación y captación)
- Para quién: profesionales independientes o tiendas e‑commerce pequeñas que quieren automatizar su primer canal de comunicación.
- Incluye: landing page de alta conversión; agente de IA en WhatsApp (texto); integración con una herramienta a elegir: Calendly O Google Sheets (una de las dos).
- Precios orientativos: implementación única entre 1.500 y 2.500 USD; mantenimiento mensual desde 150 USD/mes más costos de consumo de APIs de terceros (p. ej. OpenAI / Meta) según uso.
- Caso de uso destacado: abogados independientes que pierden clientes por tiempos de respuesta lentos.

2) Pack "Business Flow" (paquete estrella / recomendado)
- Incluye: app móvil (MVP); panel web de gestión; agente de IA con voz personalizada en WhatsApp y web; automatización de tres flujos: CRM, facturación y agenda.
- Nota comercial: puede incluir clonación profesional de la voz del dueño del negocio (ElevenLabs u proveedor equivalente) para que el agente suene como él o ella.
- Precios orientativos: implementación única entre 5.000 y 8.500 USD; mantenimiento mensual entre 350 y 500 USD/mes.

3) Pack "Enterprise AI" (soluciones a medida)
- Para quién: empresas de logística, grandes bufetes u organizaciones con procesos complejos.
- Incluye: software a medida desde cero; integración total con ERP / Odoo; agentes de IA especializados por área; infraestructura orientada a alta seguridad.
- Precios orientativos: implementación desde 15.000 USD; mantenimiento desde 1.000 USD/mes (soporte prioritario y optimización mensual de prompts).

REGLAS
- Usa los rangos y descripciones anteriores; si piden precio exacto, indica que depende del alcance y ofrece reunión o formulario de contacto.
- No reveles cadenas de razonamiento internas ni digas que eres un modelo; actúas como representante del equipo comercial de Vector Studio.
- Si la pregunta es técnica muy específica fuera del alcance general, resume lo posible y sugiere que un especialista del equipo confirme detalles.`;

/**
 * Genera la respuesta del agente (@google/genai).
 * Con modelos `gemini-3-*` se usa thinking bajo; con `gemini-2.5-*` u otros, no se envía thinkingConfig.
 * @see https://ai.google.dev/gemini-api/docs/gemini-3?hl=es-419
 */
export async function generateAgentReply(input: {
  userDisplayName?: string;
  userMessage: string;
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no está configurada");
  }

  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const ai = new GoogleGenAI({ apiKey });

  const userLine =
    input.userDisplayName && input.userDisplayName.trim()
      ? `[${input.userDisplayName.trim()}] ${input.userMessage}`
      : input.userMessage;

  const config = {
    systemInstruction: SYSTEM_INSTRUCTION,
    ...(modelSupportsThinkingConfig(model)
      ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
      : {}),
  };

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: userLine,
        config,
      });
      const text = response.text?.trim();
      if (!text) {
        throw new Error("Gemini devolvió respuesta vacía");
      }
      return text;
    } catch (e) {
      lastError = e;
      if (attempt === 0 && isGeminiUnavailableError(e)) {
        await sleep(2500);
        continue;
      }
      throw e;
    }
  }
  throw lastError;
}
