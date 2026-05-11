import { GoogleGenAI, ThinkingLevel } from "@google/genai";

const DEFAULT_MODEL = "gemini-3.1-pro-preview";

/** Instrucciones del agente (equivalente a “system prompt”). Edita aquí el tono y reglas. */
const SYSTEM_INSTRUCTION =
  "Eres un asistente útil que responde por WhatsApp. Sé breve y claro. " +
  "Si el usuario escribe en español, responde en español.";

/**
 * Genera la respuesta del agente usando Gemini 3 (@google/genai).
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

  const response = await ai.models.generateContent({
    model,
    contents: userLine,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.LOW,
      },
    },
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error("Gemini devolvió respuesta vacía");
  }
  return text;
}
