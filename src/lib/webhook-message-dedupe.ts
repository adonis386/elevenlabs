/**
 * Dedupe en memoria entre invocaciones del mismo runtime (útil si Evolution
 * llama el webhook 2 veces con el mismo mensaje). En serverless no cubre
 * dos instancias distintas en paralelo; ahí conviene Redis/KV si persiste.
 */
const TTL_MS = 180_000;
const store = new Map<string, number>();

function prune(now: number): void {
  for (const [k, at] of store) {
    if (now - at > TTL_MS) store.delete(k);
  }
}

/** @returns true si debes procesar; false si es duplicado reciente (responder 200 y no hacer Gemini). */
export function shouldProcessInboundOnce(dedupeKey: string): boolean {
  const now = Date.now();
  prune(now);
  if (store.has(dedupeKey)) return false;
  store.set(dedupeKey, now);
  return true;
}
