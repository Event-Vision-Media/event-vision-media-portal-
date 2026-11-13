import type { Metadata } from "next";
import Link from "next/link";
import QRCode from "qrcode";
import { notFound } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";
import { PrintButton } from "@/components/PrintButton";
import { followupLine, formatEuro } from "@/lib/catalog";
import { formatDateGerman } from "@/lib/format";
import { customerAskedChange, offerByToken, offerUrl } from "@/lib/offers";
import { greetingLine, usesSie } from "@/lib/address";
import { LANDLORD, REST_DUE_DAYS, SHORT_LAST_DAYS, SHORT_PAY_DAYS, depositForBooking, fullPaymentTerms, isShortNotice } from "@/lib/contract";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Angebot (PDF) · Event Vision Media", robots: { index: false, follow: false } };

const berlinDay = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });

/**
 * Angebot als schlichtes A4-Dokument – zum Drucken bzw. „Als PDF speichern“ im Browser.
 * Für Firmen, die ein Angebot intern freigeben oder ablegen müssen. Annahme weiter online (Link/QR-Code).
 */
export default async function OfferPdfPage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;
  const found = await offerByToken(token);
  if (!found) notFound();

  const { offer, booking: b } = found;
  const sie = usesSie(b);
  const items = offer.items ?? b.inquiry_items ?? {};
  const follow = followupLine(items);
  const changed = await customerAskedChange(b.id);
  const url = offerUrl(token);
  const qr = await QRCode.toDataURL(url, { margin: 0, width: 220, color: { dark: "#2b2b2b", light: "#ffffff" } });
  const total = offer.total != null ? Number(offer.total) : null;
  const from = !!items.isFromPrice;
  const offerNo = items.offer?.number || `${b.booking_code}-${offer.version}`;
  const name = b.customer_name || b.couple_names || "";
  const t = (du: string, s: string) => (sie ? s : du);

  const short = isShortNotice(b);
  const deposit = total != null ? depositForBooking(total, b) : 0;
  const agreed = fullPaymentTerms(b);
  const dueDays = agreed?.dueDays ?? REST_DUE_DAYS;
  const payment = short
    ? t(
        `Da dein Event schon bald ist, entfällt die Anzahlung: Der Gesamtbetrag ist per Überweisung innerhalb von ${SHORT_PAY_DAYS} Tagen nach Rechnung (spätestens ${SHORT_LAST_DAYS} Tage vor der Veranstaltung) oder bar bei der Übergabe zu zahlen.`,
        `Da Ihre Veranstaltung kurzfristig stattfindet, entfällt die Anzahlung: Der Gesamtbetrag ist per Überweisung innerhalb von ${SHORT_PAY_DAYS} Tagen nach Rechnung (spätestens ${SHORT_LAST_DAYS} Tage vor der Veranstaltung) oder bar bei der Übergabe zu zahlen.`
      )
    : agreed?.after
      ? `Keine Anzahlung. Die Rechnung über den Gesamtbetrag wird nach der Veranstaltung gestellt und ist innerhalb von ${dueDays} Tagen per Überweisung zahlbar.`
      : deposit > 0
      ? `Anzahlung ${formatEuro(deposit)} nach Vertragsabschluss (Rechnung per E-Mail). Restbetrag per Überweisung bis ${dueDays} Tage vor der Veranstaltung oder bar bei der Übergabe.`
      : `Keine Anzahlung. Der Gesamtbetrag ist per Überweisung bis ${dueDays} Tage vor der Veranstaltung oder bar bei der Übergabe zu zahlen.`;

  const rows: { name: string; price: string; strong?: boolean }[] = [
    ...(items.packages ?? []).map((p: any) => ({ name: p.name, price: formatEuro(p.price), strong: true })),
    ...(follow ? [{ name: follow.label.replace(/^\+\s*/, ""), price: formatEuro(follow.amount) }] : []),
    ...(items.extras ?? []).map((e: any) => ({ name: e.name, price: `${e.from ? "ab " : ""}${formatEuro(e.price)}` })),
  ];

  const facts: [string, string][] = [
    ["Veranstaltung", `${formatDateGerman(b.event_date)}${b.event_days > 1 ? ` (${b.event_days} Tage)` : ""}`],
    ...(b.occasion ? [["Anlass", b.occasion] as [string, string]] : []),
    ...(b.location ? [["Ort", b.location] as [string, string]] : []),
    ...(b.guest_count ? [["Gäste", `ca. ${b.guest_count}`] as [string, string]] : []),
  ];

  return (
    <div className="min-h-screen bg-sand-50 print:bg-white">
      <div className="print-hidden sticky top-0 z-10 border-b border-anthracite-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href={`/angebot/${token}`} className="text-sm text-anthracite-500 hover:text-anthracite-800">
            ← Zurück zum Angebot
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-anthracite-400 sm:inline">Im Druckfenster „Als PDF sichern“ wählen</span>
            <PrintButton label="Drucken / als PDF speichern" />
          </div>
        </div>
        {offer.status === "ersetzt" && (
          <p className="bg-gold-50 px-4 py-2 text-center text-sm text-gold-800">
            {t("Hinweis: Es gibt eine neuere Version dieses Angebots – den Link findest du in deiner neuesten E-Mail von uns.", "Hinweis: Es gibt eine neuere Version dieses Angebots – den Link finden Sie in Ihrer neuesten E-Mail von uns.")}
          </p>
        )}
      </div>

      <main className="mx-auto max-w-[210mm] px-0 py-6 sm:px-4 print:p-0">
        <article className="offer-doc bg-white px-6 py-8 text-[13px] leading-relaxed text-anthracite-800 shadow-sm sm:px-12 sm:py-12 print:px-0 print:py-0 print:shadow-none">
          <header className="flex items-start justify-between gap-6 border-b border-anthracite-100 pb-5 print:pb-3">
            <div className="flex items-center gap-3">
              <BrandMark size={52} />
              <div>
                <p className="font-serif text-lg font-semibold leading-tight">Event Vision Media</p>
                <p className="text-[11px] text-anthracite-500">Fotobox · Fotospiegel · 360° · Audiogästebuch</p>
              </div>
            </div>
            <div className="text-right text-[11px] leading-snug text-anthracite-500">
              <p>{LANDLORD.name}</p>
              <p>{LANDLORD.street}</p>
              <p>{LANDLORD.zipCity}</p>
              <p>
                {LANDLORD.phone} · {LANDLORD.email}
              </p>
            </div>
          </header>

          <section className="mt-6 flex flex-wrap items-start justify-between gap-6 print:mt-4">
            <div className="text-[13px] leading-snug">
              <p className="text-[10px] uppercase tracking-wide text-anthracite-400">Angebot für</p>
              {b.company && <p className="font-medium">{b.company}</p>}
              {name && <p>{name}</p>}
              {b.email && <p className="text-anthracite-500">{b.email}</p>}
              {b.phone && <p className="text-anthracite-500">{b.phone}</p>}
            </div>
            <table className="text-[12px]">
              <tbody>
                <Meta k="Angebotsnummer" v={offerNo} />
                <Meta k="Buchungsnummer" v={b.booking_code} />
                <Meta k="Datum" v={formatDateGerman(berlinDay(offer.created_at))} />
                <Meta k="Gültig bis" v={formatDateGerman(offer.valid_until)} strong />
              </tbody>
            </table>
          </section>

          <h1 className="mt-8 font-serif text-2xl font-semibold print:mt-5 print:text-xl">
            Angebot{changed ? " (angepasst)" : ""}
          </h1>
          <p className="mt-3">{greetingLine(b)},</p>
          <p className="mt-2">
            {t(
              "vielen Dank für deine Anfrage. Gerne bieten wir dir folgende Leistungen an:",
              "vielen Dank für Ihre Anfrage. Gerne bieten wir Ihnen folgende Leistungen an:"
            )}
          </p>
          {offer.message && <p className="mt-3 whitespace-pre-wrap rounded-lg bg-sand-50 p-3 print:px-3 print:py-2 print:border print:border-anthracite-100 print:bg-white">{offer.message}</p>}

          <table className="mt-5 w-full text-[12px] print:mt-3">
            <tbody>
              {facts.map(([k, v]) => (
                <tr key={k}>
                  <td className="w-32 py-0.5 align-top text-anthracite-500">{k}</td>
                  <td className="py-0.5">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <table className="mt-6 w-full border-collapse print:mt-4">
            <thead>
              <tr className="border-b-2 border-anthracite-800 text-left text-[11px] uppercase tracking-wide text-anthracite-500">
                <th className="py-2 font-medium">Pos.</th>
                <th className="py-2 font-medium">Leistung</th>
                <th className="py-2 text-right font-medium">Preis</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-anthracite-100 align-top">
                  <td className="w-12 py-2 text-anthracite-400 print:py-1.5">{i + 1}</td>
                  <td className={`py-2 pr-4 print:py-1.5 ${r.strong ? "font-medium" : ""}`}>{r.name}</td>
                  <td className="whitespace-nowrap py-2 text-right print:py-1.5">{r.price}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td />
                <td className="pt-3 text-right font-semibold">Gesamtbetrag</td>
                <td className="whitespace-nowrap pt-3 text-right font-serif text-lg font-semibold">
                  {total != null ? `${from ? "ab " : ""}${formatEuro(total)}` : "–"}
                </td>
              </tr>
            </tfoot>
          </table>
          <p className="mt-1 text-right text-[11px] text-anthracite-500">Alle Preise sind Endpreise. Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.</p>

          <section className="mt-8 space-y-3 break-inside-avoid print:mt-4 print:space-y-2">
            <div>
              <p className="font-semibold">Zahlungsbedingungen</p>
              <p className="text-anthracite-700">{payment}</p>
            </div>
            <div>
              <p className="font-semibold">Gültigkeit &amp; Auftrag</p>
              <p className="text-anthracite-700">
                Dieses Angebot ist gültig bis {formatDateGerman(offer.valid_until)}
                {b.lifecycle === "reserviert" ? t(" – bis dahin ist der Termin für dich reserviert", " – bis dahin ist der Termin für Sie reserviert") : ""}.{" "}
                {t(
                  "Annehmen kannst du es mit einem Klick online (Link oder QR-Code unten). Danach bekommst du die Auftragsbestätigung und deinen Zugang zum Kundenportal, wo du den Mietvertrag digital unterschreibst.",
                  "Die Annahme erfolgt bequem online (Link oder QR-Code unten). Danach erhalten Sie die Auftragsbestätigung und Ihren Zugang zum Kundenportal, in dem Sie den Mietvertrag digital unterzeichnen."
                )}
              </p>
            </div>
          </section>

          <section className="mt-6 flex items-center gap-5 rounded-xl border border-anthracite-100 p-4 break-inside-avoid print:mt-3 print:p-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="QR-Code zum Online-Angebot" width={96} height={96} className="h-24 w-24 flex-none print:h-16 print:w-16" />
            <div className="min-w-0 text-[12px]">
              <p className="font-semibold">{t("Angebot online ansehen & annehmen", "Angebot online ansehen & annehmen")}</p>
              <p className="break-all text-anthracite-500">{url}</p>
              <p className="mt-1 text-anthracite-500">{t("Fragen? Ruf an oder schreib per WhatsApp:", "Fragen? Rufen Sie an oder schreiben Sie per WhatsApp:")} {LANDLORD.phone}</p>
            </div>
          </section>

          <div className="mt-8 break-inside-avoid print:mt-4 print:leading-snug">
            <p>{t("Wir freuen uns auf dein Event!", "Wir freuen uns auf Ihre Veranstaltung!")}</p>
            <p className="mt-1">
              {t("Viele Grüße", "Mit freundlichen Grüßen")}
              <br />
              Dustin Nowitzki · Event Vision Media
            </p>
          </div>

          <footer className="mt-10 border-t border-anthracite-100 pt-3 print:mt-4 print:pt-2 text-center text-[10px] text-anthracite-400">
            {["Event Vision Media", "Inhaber Dustin Nowitzki", `${LANDLORD.street}, ${LANDLORD.zipCity}`, LANDLORD.phone, LANDLORD.email, "fotobox-essen.com"].map((x, i) => (
              <span key={i} className="whitespace-nowrap">
                {i > 0 && " · "}
                {x}
              </span>
            ))}
          </footer>
        </article>
      </main>
    </div>
  );
}

function Meta({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <tr>
      <td className="py-0.5 pr-4 text-anthracite-500">{k}</td>
      <td className={`py-0.5 text-right ${strong ? "font-semibold" : ""}`}>{v}</td>
    </tr>
  );
}
