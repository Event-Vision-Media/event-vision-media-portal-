import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/require-admin";
import { mailLogHtml } from "@/lib/mail-log";

export const dynamic = "force-dynamic";

/** Gespeicherte Mail als Seite – wird im Mail-Verlauf der Buchung im Rahmen angezeigt. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const { id } = await ctx.params;
  const mail = await mailLogHtml(id);
  if (!mail?.html) return new Response("Inhalt nicht gespeichert.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  return new Response(mail.html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      // Mail-Inhalt ohne Skripte und ohne Formular-Absendung anzeigen
      "Content-Security-Policy": "script-src 'none'; form-action 'none'; frame-ancestors 'self'",
      "X-Robots-Tag": "noindex",
    },
  });
}
