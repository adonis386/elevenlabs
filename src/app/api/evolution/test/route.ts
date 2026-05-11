import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET: comprueba desde Vercel que puede hablar con Evolution (misma petición que en local a "/").
 * Requiere EVOLUTION_API_BASE y EVOLUTION_API_KEY en Vercel.
 */
export async function GET() {
  const base = process.env.EVOLUTION_API_BASE?.replace(/\/$/, "");
  const key = process.env.EVOLUTION_API_KEY;
  if (!base || !key) {
    return NextResponse.json(
      { ok: false, error: "Faltan EVOLUTION_API_BASE o EVOLUTION_API_KEY en Vercel" },
      { status: 500 },
    );
  }

  const res = await fetch(`${base}/`, {
    headers: { apikey: key },
    cache: "no-store",
  });

  const text = await res.text();
  let body: unknown;
  try {
    body = JSON.parse(text) as unknown;
  } catch {
    body = text.slice(0, 500);
  }

  return NextResponse.json(
    {
      ok: res.ok,
      status: res.status,
      evolution: body,
    },
    { status: res.ok ? 200 : 502 },
  );
}
