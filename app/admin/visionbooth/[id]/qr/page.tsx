import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";
import { vbGuestUrl, VB_BUCKET, type VbEvent } from "@/lib/visionbooth";
import { PrintButton } from "@/components/admin/visionbooth/PrintButton";

export const dynamic = "force-dynamic";

/** Druckvorlage A5 hoch: Tischaufsteller mit QR-Code (im Browser drucken oder als PDF sichern). */
export default async function VisionBoothQrPrintPage({ params }: { params: { id: string } }) {
  if (!/^[0-9a-f-]{36}$/.test(params.id)) notFound();
  const supabase = createAdminClient();
  const { data } = await supabase.from("vb_events").select("*").eq("id", params.id).maybeSingle();
  if (!data) notFound();
  const event = data as VbEvent;

  const guestUrl = vbGuestUrl(event.slug);
  const qrSvg = await QRCode.toString(guestUrl, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#16181c", light: "#ffffff" } });
  const logoUrl = event.logo_path ? (await supabase.storage.from(VB_BUCKET).createSignedUrl(event.logo_path, 3600)).data?.signedUrl : null;
  const accent = /^#[0-9a-f]{6}$/i.test(event.accent_color) ? event.accent_color : "#c4933f";

  return (
    <div className="min-h-screen bg-anthracite-100 py-8 print:bg-white print:py-0">
      <style>{`@page { size: A5 portrait; margin: 0 } @media print { html, body { background: #fff } }`}</style>
      <div className="mx-auto mb-4 flex max-w-[148mm] items-center justify-between print:hidden">
        <p className="text-sm text-anthracite-500">A5 hochkant · Druckdialog: „Ränder: keine“, „Hintergrundgrafiken“ an</p>
        <PrintButton />
      </div>

      <section
        className="mx-auto flex h-[210mm] w-[148mm] flex-col items-center justify-between bg-[#faf8f4] px-[14mm] py-[14mm] text-center shadow-card print:shadow-none"
        style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact", border: `2.5mm solid ${accent}`, boxSizing: "border-box" }}
      >
        <div>
          {logoUrl ? (
            <img src={logoUrl} alt="" className="mx-auto max-h-[22mm] max-w-[70mm] object-contain" />
          ) : (
            <p className="text-[9pt] uppercase tracking-[0.35em] text-anthracite-400">VisionBooth</p>
          )}
          <p className="mt-[4mm] font-serif text-[20pt] leading-tight" style={{ color: accent }}>
            {event.frame_text || event.title}
          </p>
        </div>

        <div>
          <p className="font-serif text-[26pt] font-semibold text-anthracite-800">Mach ein Foto! 📸</p>
          <div className="mx-auto mt-[5mm] w-[62mm] rounded-[3mm] bg-white p-[3mm]" dangerouslySetInnerHTML={{ __html: qrSvg }} />
        </div>

        <div className="w-full">
          <ol className="mx-auto grid max-w-[110mm] grid-cols-3 gap-[3mm] text-[9.5pt] leading-snug text-anthracite-700">
            <li><span className="block font-serif text-[16pt]" style={{ color: accent }}>1</span>QR-Code mit der Handy-Kamera scannen</li>
            <li><span className="block font-serif text-[16pt]" style={{ color: accent }}>2</span>Foto machen{event.ai_enabled && event.ai_limit > 0 ? " – und mit KI verwandeln ✨" : ""}</li>
            <li><span className="block font-serif text-[16pt]" style={{ color: accent }}>3</span>Speichern & teilen – ganz ohne App</li>
          </ol>
          <p className="mt-[5mm] text-[8pt] text-anthracite-400">{guestUrl.replace(/^https?:\/\//, "")}</p>
          <p className="mt-[1mm] text-[7pt] uppercase tracking-[0.25em] text-anthracite-300">VisionBooth by Event Vision Media</p>
        </div>
      </section>
    </div>
  );
}
