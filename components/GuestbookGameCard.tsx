import QRCode from "qrcode";
import { PrintButton } from "@/components/admin/visionbooth/PrintButton";
import { PosterScale } from "@/components/visionbooth/PosterScale";
import { vbFontVars } from "@/components/visionbooth/fonts";

const DISPLAY = "var(--vb-font-display), Georgia, serif";
const UI = "var(--vb-font-ui), system-ui, sans-serif";
const BRASS = "#a8823d";
const INK = "#2a2622";
const SUB = "#6b645b";

/** Druckvorlage A5 hoch: Aufsteller fürs Audiogästebuch mit Anleitung und QR-Code zum Gästebuch-Spiel. */
export async function GuestbookGameCard({ title, url, backHref, backLabel }: { title: string; url: string; backHref: string; backLabel: string }) {
  const qrSvg = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#1b1712", light: "#ffffff" } });
  const step = (n: number, text: string) => (
    <li className="flex items-center gap-[3mm] text-left">
      <span className="flex h-[8mm] w-[8mm] flex-none items-center justify-center rounded-full text-[12pt] text-white" style={{ background: BRASS, fontFamily: DISPLAY }}>{n}</span>
      <span>{text}</span>
    </li>
  );

  return (
    <div className={`${vbFontVars} min-h-screen bg-anthracite-100 py-6 sm:py-8 print:bg-white print:py-0`}>
      <style dangerouslySetInnerHTML={{ __html: "@page { size: A5 portrait; margin: 0 } @media print { html, body { background: #fff } }" }} />
      <div className="mx-auto mb-5 max-w-[148mm] px-3 print:hidden">
        <a href={backHref} className="text-sm font-medium text-anthracite-500 hover:text-anthracite-800">← {backLabel}</a>
        <div className="mt-3 rounded-3xl bg-white p-5 shadow-card">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-anthracite-400">Format A5 · Gästebuch-Spiel</p>
          <h1 className="mt-1 font-serif text-2xl font-semibold text-anthracite-800">Aufsteller fürs Audiogästebuch</h1>
          <ul className="mt-3 space-y-1.5 text-sm text-anthracite-600">
            <li>✓ Im Druckdialog „Ränder: keine“ und „Hintergrundgrafiken“ einschalten</li>
            <li>✓ Oder als PDF sichern und im Copyshop drucken lassen</li>
            <li>✓ Tipp: Auf festes Papier drucken und in einen A5-Bilderrahmen neben das Telefon stellen</li>
          </ul>
          <div className="mt-4 [&>button]:w-full sm:[&>button]:w-auto">
            <PrintButton />
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-anthracite-400">Vorschau – am Handy verkleinert, gedruckt exakt A5</p>
      </div>
      <PosterScale>
        <section
          className="mx-auto flex h-[210mm] w-[148mm] flex-col items-center justify-between px-[14mm] py-[13mm] text-center shadow-card print:shadow-none"
          style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact", background: "#f6efe1", border: `2.5mm solid ${BRASS}`, boxSizing: "border-box", color: INK }}
        >
          <div>
            <p className="text-[9pt] uppercase tracking-[0.35em]" style={{ color: BRASS, fontFamily: UI }}>Audiogästebuch</p>
            <p className="mt-[3mm] text-[22pt] leading-tight" style={{ fontFamily: DISPLAY }}>{title}</p>
          </div>

          <div className="w-full" style={{ fontFamily: UI }}>
            <p className="text-[17pt] leading-tight" style={{ fontFamily: DISPLAY }}>Hinterlasst uns eine Nachricht!</p>
            <ol className="mx-auto mt-[4mm] grid max-w-[96mm] gap-[2.5mm] text-[11pt] font-semibold">
              {step(1, "Hörer abheben")}
              {step(2, "Ansage abwarten")}
              {step(3, "Nach dem Piep sprechen")}
              {step(4, "Auflegen – fertig!")}
            </ol>
          </div>

          <div>
            <p className="text-[14pt] leading-snug" style={{ fontFamily: DISPLAY }}>Keine Idee, was du sagen sollst?</p>
            <p className="mt-[1mm] text-[10pt]" style={{ color: SUB, fontFamily: UI }}>Scan mich &amp; dreh an der Wählscheibe</p>
            <div className="mx-auto mt-[4mm] w-[44mm] rounded-[3mm] bg-white p-[3mm]" dangerouslySetInnerHTML={{ __html: qrSvg }} />
            <p className="mt-[4mm] text-[7pt] uppercase tracking-[0.25em]" style={{ color: SUB, fontFamily: UI }}>Event Vision Media</p>
          </div>
        </section>
      </PosterScale>
    </div>
  );
}
