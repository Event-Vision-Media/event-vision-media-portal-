import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadVbEvent, vbClosedReason } from "@/lib/visionbooth";
import { cleanGuestKey } from "@/lib/visionbooth-board";
import { leadConsentText, leadMarketingText, parseLeadConfig } from "@/components/visionbooth/leads";

export const dynamic = "force-dynamic";

/** Eintrag ins freiwillige Kontaktformular – Einwilligungstext wird so gespeichert, wie der Gast ihn sah. */
export async function POST(req: NextRequest, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const event = await loadVbEvent(params.slug.toLowerCase());
  if (!event) return NextResponse.json({ error: "Event nicht gefunden" }, { status: 404 });
  const closed = vbClosedReason(event);
  if (closed) return NextResponse.json({ error: closed }, { status: 403 });
  const cfg = parseLeadConfig(event.leads);
  if (!cfg.enabled) return NextResponse.json({ error: "nicht verfügbar" }, { status: 404 });

  const b = await req.json().catch(() => ({}));
  const clip = (v: unknown, n: number) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, n) || null;
  const email = clip(b?.email, 200)?.toLowerCase() ?? null;
  if (!email || !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) return NextResponse.json({ error: "Bitte eine gültige E-Mail-Adresse eingeben." }, { status: 400 });
  if (b?.consent !== true) return NextResponse.json({ error: "Bitte die Einwilligung bestätigen." }, { status: 400 });
  if (cfg.fields.includes("name") && !clip(b?.name, 120)) return NextResponse.json({ error: "Bitte deinen Namen eingeben." }, { status: 400 });

  const { error } = await createAdminClient().from("vb_leads").insert({
    event_id: event.id,
    guest_key: cleanGuestKey(req.headers.get("x-vb-guest")),
    name: cfg.fields.includes("name") ? clip(b?.name, 120) : null,
    email,
    company: cfg.fields.includes("company") ? clip(b?.company, 120) : null,
    phone: cfg.fields.includes("phone") ? clip(b?.phone, 40) : null,
    // Werbe-Einwilligung nur, wenn angeboten UND angehakt – getrennt dokumentiert
    consent_text:
      leadConsentText(cfg, event.contact_name || event.title) +
      (cfg.marketing && b?.marketing === true ? `\n+ E-Mail-Werbung: ${leadMarketingText(cfg, event.contact_name || event.title)}` : ""),
  });
  // Doppelter Eintrag mit gleicher E-Mail = schon dabei, kein Fehler für den Gast
  if (error && error.code !== "23505") return NextResponse.json({ error: "Speichern fehlgeschlagen" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
