import QRCode from "qrcode";
import { VbLogo } from "@/components/visionbooth/VbLogo";
import { createAdminClient } from "@/lib/supabase/admin";
import { vbGuestUrl, VB_BUCKET, type VbEvent } from "@/lib/visionbooth";
import { PrintButton } from "@/components/admin/visionbooth/PrintButton";
import { PosterScale } from "@/components/visionbooth/PosterScale";
import { vbFontVars } from "@/components/visionbooth/fonts";
import { getTemplate, type FontRole } from "@/components/visionbooth/templates";

const FONT_VAR: Record<FontRole, string> = {
  display: "var(--vb-font-display), Georgia, serif",
  ui: "var(--vb-font-ui), system-ui, sans-serif",
  script: "var(--vb-font-script), cursive",
  hand: "var(--vb-font-hand), cursive",
};

/** Druckvorlage A5 hoch: Tischaufsteller mit QR-Code im Design der gewählten Vorlage (Admin und Kundenbereich). */
export async function QrPoster({ event }: { event: VbEvent }) {
  const t = getTemplate(event.template ?? event.frame_style);
  const accent = /^#[0-9a-f]{6}$/i.test(event.accent_color) ? event.accent_color : t.accent;
  const ink = t.ink === "accent" ? accent : t.ink;
  const sub = t.sub === "accent" ? accent : t.sub;
  // Für Druck auf hellem Papier: sehr dunkle Vorlagen behalten ihren Hintergrund (Druck mit Hintergrundgrafiken)
  const bg = t.photo === "bleed" ? "#0d0d0f" : t.bg;
  const guestUrl = vbGuestUrl(event.slug);
  const qrSvg = await QRCode.toString(guestUrl, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#16181c", light: "#ffffff" } });
  const logoUrl = event.logo_path ? (await createAdminClient().storage.from(VB_BUCKET).createSignedUrl(event.logo_path, 3600)).data?.signedUrl : null;
  const title = t.titleUpper ? (event.frame_text || event.title).toUpperCase() : event.frame_text || event.title;

  return (
    <div className={`${vbFontVars} min-h-screen bg-anthracite-100 py-6 sm:py-8 print:bg-white print:py-0`}>
      <style dangerouslySetInnerHTML={{ __html: "@page { size: A5 portrait; margin: 0 } @media print { html, body { background: #fff } }" }} />
      <div className="mx-auto mb-5 max-w-[148mm] px-3 print:hidden">
        <div className="rounded-3xl bg-white p-5 shadow-card">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-anthracite-400">Format A5 · Vorlage „{t.name}“</p>
          <h1 className="mt-1 font-serif text-2xl font-semibold text-anthracite-800">Dein QR-Aufsteller</h1>
          <ul className="mt-3 space-y-1.5 text-sm text-anthracite-600">
            <li>✓ Im Druckdialog „Ränder: keine“ und „Hintergrundgrafiken“ einschalten</li>
            <li>✓ Oder als PDF sichern und im Copyshop drucken lassen</li>
            <li>✓ Tipp: Auf festes Papier drucken und in einen A5-Aufsteller stellen</li>
          </ul>
          <div className="mt-4 [&>button]:w-full sm:[&>button]:w-auto">
            <PrintButton />
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-anthracite-400">Vorschau – am Handy verkleinert, gedruckt exakt A5</p>
      </div>
      <PosterScale>

      <section
        className="mx-auto flex h-[210mm] w-[148mm] flex-col items-center justify-between px-[14mm] py-[14mm] text-center shadow-card print:shadow-none"
        style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact", background: bg, border: `2.5mm solid ${accent}`, boxSizing: "border-box" }}
      >
        <div>
          {logoUrl ? (
            <img src={logoUrl} alt="" className="mx-auto max-h-[22mm] max-w-[70mm] object-contain" />
          ) : (
            <p className="text-[9pt] uppercase tracking-[0.35em]" style={{ color: sub, fontFamily: FONT_VAR.ui }}>
              VisionBooth
            </p>
          )}
          <p
            className="mt-[4mm] leading-tight"
            style={{ color: ink, fontFamily: FONT_VAR[t.titleFont], fontWeight: t.titleWeight, fontStyle: t.titleItalic ? "italic" : undefined, fontSize: t.titleFont === "script" ? "30pt" : "21pt" }}
          >
            {title}
          </p>
          {event.frame_subtext && (
            <p className="mt-[1.5mm] text-[9pt] uppercase tracking-[0.2em]" style={{ color: sub, fontFamily: FONT_VAR.ui }}>
              {event.frame_subtext}
            </p>
          )}
        </div>

        <div>
          <p className="text-[25pt] font-semibold" style={{ color: ink === accent ? (t.bg === "#ffffff" || t.bg.startsWith("#f") ? "#1f2227" : "#ffffff") : ink, fontFamily: FONT_VAR.display }}>
            Mach ein Foto! 📸
          </p>
          <div className="mx-auto mt-[5mm] w-[60mm] rounded-[3mm] bg-white p-[3mm]" dangerouslySetInnerHTML={{ __html: qrSvg }} />
        </div>

        <div className="w-full" style={{ fontFamily: FONT_VAR.ui }}>
          <ol className="mx-auto grid max-w-[112mm] grid-cols-3 gap-[3mm] text-[9pt] leading-snug" style={{ color: sub }}>
            <li><span className="block text-[16pt]" style={{ color: accent, fontFamily: FONT_VAR.display }}>1</span>QR-Code mit der Handy-Kamera scannen</li>
            <li><span className="block text-[16pt]" style={{ color: accent, fontFamily: FONT_VAR.display }}>2</span>Foto machen{event.ai_enabled && event.ai_limit > 0 ? " – und mit KI verwandeln ✨" : ""}</li>
            <li><span className="block text-[16pt]" style={{ color: accent, fontFamily: FONT_VAR.display }}>3</span>Speichern &amp; teilen – ganz ohne App</li>
          </ol>
          <p className="mt-[5mm] text-[8pt] opacity-70" style={{ color: sub }}>{guestUrl.replace(/^https?:\/\//, "")}</p>
          <p className="mt-[1mm] text-[6.5pt] opacity-60" style={{ color: sub }}>Was mit deinen Fotos passiert: „Datenschutz“ unten in der VisionBooth</p>
          <p className="mt-[1mm] flex items-center justify-center gap-[1.5mm] text-[7pt] uppercase tracking-[0.25em] opacity-70" style={{ color: sub }}>
            <VbLogo variant="symbol" height="4.5mm" />
            VisionBooth by Event Vision Media
          </p>
        </div>
      </section>
      </PosterScale>
    </div>
  );
}
