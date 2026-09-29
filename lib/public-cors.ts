import type { NextRequest } from "next/server";

/**
 * CORS für die öffentlichen Website-Schnittstellen (/api/public/*).
 * Erlaubte Domains über ALLOWED_ORIGINS (kommagetrennt).
 */
const DEFAULT_ORIGINS = ["https://www.fotobox-essen.com", "https://fotobox-essen.com"];

export function allowedOrigins(): string[] {
  const env = process.env.ALLOWED_ORIGINS;
  return env ? env.split(",").map((o) => o.trim()).filter(Boolean) : DEFAULT_ORIGINS;
}

export function corsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  if (!allowedOrigins().includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}
