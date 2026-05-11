import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * POST: Evolution envía eventos aquí si configuras esta URL en el Manager.
 * URL en Vercel: https://<tu-dominio>/api/evolution/webhook
 */
export async function POST(req: Request) {
  const raw = await req.text();
  let parsed: unknown;
  try {
    parsed = raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    parsed = { raw: raw.slice(0, 2000) };
  }

  // En producción sustituye por tu lógica (LLM, guardar en DB, etc.)
  console.log("[evolution webhook]", JSON.stringify(parsed).slice(0, 4000));

  return NextResponse.json({ ok: true });
}
