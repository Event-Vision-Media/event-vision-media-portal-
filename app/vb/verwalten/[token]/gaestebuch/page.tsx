import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadVbEventByToken, VB_BUCKET } from "@/lib/visionbooth";
import { PrintButton } from "@/components/admin/visionbooth/PrintButton";
import { VbLogo } from "@/components/visionbooth/VbLogo";
import { vbFontVars } from "@/components/visionbooth/fonts";
import { getTemplate } from "@/components/visionbooth/templates";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Gästebuch – VisionBooth", robots: { index: false, follow: false } };

const DISPLAY = "var(--vb-font-display), Georgia, serif";
const SCRIPT = "var(--vb-font-script), 'Snell Roundhand', cursive";
const UI = "var(--vb-font-ui), system-ui, sans-serif";

/** Gästebuch zum Drucken bzw. „Als PDF sichern“: Titelseite, dann je Seite Foto + Gruß (A5). */
export default async function VisionBoothGuestbookPage(props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  const event = await loadVbEventByToken(params.token);
  if (!event) notFound();

  const supabase = createAdminClient();
  const { data: rows } = await supabase
    .from("vb_photos")
    .select("id, greeting, greeting_name, file_path, created_at")
    .eq("event_id", event.id)
    .eq("hidden", false)
    .not("greeting", "is", null)
    .order("created_at", { ascending: true })
    .limit(500);
  const list = rows ?? [];
  const { data: signed } = list.length ? await supabase.storage.from(VB_BUCKET).createSignedUrls(list.map((r) => r.file_path), 3600) : { data: [] };
  const url = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  const t = getTemplate(event.template ?? event.frame_style);
  const accent = /^#[0-9a-f]{6}$/i.test(event.accent_color) ? event.accent_color : t.accent;
  const title = event.frame_text || event.title;
  const date = event.event_date ? new Date(event.event_date + "T12:00:00Z").toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" }) : "";
  const page = "mx-auto flex h-[210mm] w-[148mm] flex-col bg-[#fbf8f3] shadow-card print:shadow-none [break-after:page]";

  return (
    <div className={`${vbFontVars} min-h-screen bg-anthracite-100 py-6 print:bg-white print:py-0`}>
      <style dangerouslySetInnerHTML={{ __html: "@page { size: A5 portrait; margin: 0 } @media print { html, body { background: #fff } }" }} />
      <div className="mx-auto mb-5 max-w-[148mm] px-3 print:hidden">
        <div className="rounded-3xl bg-white p-5 shadow-card">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-anthracite-400">Format A5 · {list.length} {list.length === 1 ? "Gruß" : "Grüße"}</p>
          <h1 className="mt-1 font-serif text-2xl font-semibold text-anthracite-800">Euer Gästebuch</h1>
          <ul className="mt-3 space-y-1.5 text-sm text-anthracite-600">
            <li>✓ „Als PDF sichern“ wählen – so habt ihr euer Gästebuch für immer</li>
            <li>✓ Zum Drucken: „Ränder: keine“ und „Hintergrundgrafiken“ einschalten</li>
            <li>✓ Tipp: Im Copyshop als kleines Buch binden lassen</li>
          </ul>
          <div className="mt-4 [&>button]:w-full sm:[&>button]:w-auto">
            <PrintButton />
          </div>
        </div>
      </div>

      <div className="space-y-6 print:space-y-0" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
        {/* Titelseite */}
        <section className={`${page} items-center px-[16mm] py-[14mm] text-center`} style={{ border: `2mm solid ${accent}`, boxSizing: "border-box" }}>
          <div className="flex flex-1 flex-col items-center justify-center">
            <p className="text-[9pt] font-semibold uppercase tracking-[0.35em]" style={{ color: accent, fontFamily: UI }}>
              Unser Gästebuch
            </p>
            <h2 className="mt-5 text-[30pt] leading-tight text-[#2a2620]" style={{ fontFamily: DISPLAY }}>
              {title}
            </h2>
            {date && (
              <p className="mt-3 text-[11pt] text-[#6f675c]" style={{ fontFamily: UI }}>
                {date}
              </p>
            )}
            <p className="mt-10 text-[20pt]" style={{ color: accent, fontFamily: SCRIPT }}>
              {list.length === 1 ? "Ein lieber Gruß eurer Gäste" : `${list.length} liebe Grüße eurer Gäste`}
            </p>
          </div>
          <div className="opacity-70">
            <VbLogo height={18} />
          </div>
        </section>

        {list.length === 0 && (
          <p className="mx-auto max-w-[148mm] px-3 text-center text-sm text-anthracite-500 print:hidden">Noch keine Grüße – sobald Gäste welche schreiben, erscheinen sie hier.</p>
        )}

        {list.map((r, i) => (
          <section key={r.id} className={`${page} px-[12mm] py-[12mm]`}>
            <div className="flex flex-1 items-center justify-center overflow-hidden rounded-[3mm] bg-white p-[2.5mm] shadow-[0_2mm_6mm_rgba(0,0,0,0.12)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url.get(r.file_path) ?? ""} alt="" className="max-h-[118mm] max-w-full object-contain" />
            </div>
            <blockquote className="mt-[8mm] text-center text-[15pt] leading-snug text-[#2a2620]" style={{ fontFamily: SCRIPT }}>
              „{r.greeting}“
            </blockquote>
            <p className="mt-[3mm] text-center text-[10pt] font-semibold" style={{ color: accent, fontFamily: UI }}>
              {r.greeting_name ? `– ${r.greeting_name}` : "– ein lieber Gast"}
            </p>
            <p className="mt-auto pt-[4mm] text-center text-[7pt] text-[#a39b8f]" style={{ fontFamily: UI }}>
              {title} · {i + 1}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}
