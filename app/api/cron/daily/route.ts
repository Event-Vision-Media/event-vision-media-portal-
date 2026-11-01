import { NextResponse, type NextRequest } from "next/server";
import { runJourneyMails } from "@/lib/journey-mails";
import { cleanupVbPhotos } from "@/lib/visionbooth";

export const dynamic = "force-dynamic";

/**
 * Täglicher Automatik-Lauf (Vercel Cron, siehe vercel.json):
 * Erinnerungen vor dem Event + Galerie/Bewertungs-Mails danach,
 * außerdem: VisionBooth-Fotos nach Ablauf der Löschfrist entfernen.
 *
 * Vercel schickt automatisch "Authorization: Bearer $CRON_SECRET".
 * Lokal zum Testen: /api/cron/daily?dry=1 (listet nur, verschickt nichts).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const isDev = process.env.NODE_ENV === "development";
  const authorized = secret ? req.headers.get("authorization") === `Bearer ${secret}` : isDev;
  if (!authorized) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get("dry") === "1";
  const result = await runJourneyMails(dryRun);
  const visionbooth = await cleanupVbPhotos(dryRun).catch((e) => {
    console.error("VisionBooth-Löschung fehlgeschlagen:", e);
    return [];
  });
  return NextResponse.json({ ok: true, dryRun, ...result, visionbooth });
}
