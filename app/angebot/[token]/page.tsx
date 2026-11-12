import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Footer } from "@/components/Footer";
import { OfferResponse } from "@/components/OfferResponse";
import { followupLine, formatEuro } from "@/lib/catalog";
import { formatDateGerman } from "@/lib/format";
import { customerAskedChange, offerByToken, offerIsOpen } from "@/lib/offers";
import { usesSie } from "@/lib/address";
import { BrandMark, BrandName } from "@/components/BrandMark";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Angebot · Event Vision Media", robots: { index: false, follow: false } };

/** Angebot ansehen und beantworten – über den Link aus der Angebots-Mail, ohne Login. */
export default async function OfferPage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;
  const found = await offerByToken(token);

  if (!found) {
    return (
      <Shell>
        <Card className="text-center">
          <p className="font-serif text-xl font-semibold text-anthracite-800">Angebot nicht gefunden</p>
          <p className="mt-2 text-sm text-anthracite-500">Der Link ist ungültig oder unvollständig. Bitte nutze den Knopf aus der E-Mail – oder melde dich bei uns: 0176 22748363.</p>
        </Card>
      </Shell>
    );
  }

  const { offer, booking: b } = found;
  const sie = usesSie(b);
  const items = offer.items ?? b.inquiry_items ?? {};
  const follow = followupLine(items);
  const open = offerIsOpen(offer, b);
  const name = b.customer_name || b.couple_names;
  const changed = await customerAskedChange(b.id);

  const state = open
    ? null
    : b.lifecycle === "bestaetigt"
      ? { icon: "🎉", title: sie ? "Ihre Buchung ist bestätigt" : "Deine Buchung ist bestätigt", text: sie ? "Die Auftragsbestätigung mit Ihrem Zugang zum Kundenportal haben Sie per E-Mail erhalten." : "Die Auftragsbestätigung mit deinem Zugang zum Kundenportal hast du per E-Mail bekommen." }
      : offer.status === "aenderung"
        ? { icon: "✏️", title: sie ? "Danke für Ihre Rückmeldung" : "Danke für deine Rückmeldung", text: sie ? "Wir passen das Angebot an und melden uns in Kürze bei Ihnen." : "Wir passen das Angebot an und melden uns in Kürze bei dir." }
        : offer.status === "angenommen"
          ? { icon: "✅", title: "Angebot angenommen", text: "Vielen Dank! Wir melden uns in Kürze mit der Auftragsbestätigung." }
          : offer.status === "ersetzt"
            ? { icon: "🔄", title: "Es gibt eine neuere Version", text: sie ? "Dieses Angebot wurde aktualisiert – den Link zur neuen Version finden Sie in Ihrer neuesten E-Mail von uns." : "Dieses Angebot wurde aktualisiert – den Link zur neuen Version findest du in deiner neuesten E-Mail von uns." }
            : offer.status === "abgelehnt"
              ? { icon: "👋", title: "Angebot abgelehnt", text: sie ? "Schade! Falls Sie es sich anders überlegen, melden Sie sich gern: 0176 22748363." : "Schade! Falls du es dir anders überlegst, melde dich gern: 0176 22748363." }
              : { icon: "⌛", title: "Angebot abgelaufen", text: sie ? "Das Angebot ist leider nicht mehr gültig. Sie möchten doch noch buchen? Melden Sie sich gern – ist der Termin noch frei, schicken wir Ihnen ein neues Angebot." : "Das Angebot ist leider nicht mehr gültig. Du möchtest doch noch buchen? Melde dich gern – ist der Termin noch frei, schicken wir dir ein neues Angebot." };

  return (
    <Shell>
      <div className="mb-6 text-center">
        <p className="text-sm text-anthracite-500">{sie ? `Guten Tag ${name}` : `Hallo ${name}`}</p>
        <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-anthracite-800">
          {sie ? "Ihr" : "Dein"} {changed ? "angepasstes" : "persönliches"} Angebot
        </h1>
        <p className="mt-2 text-sm text-anthracite-500">
          {b.booking_code} · {formatDateGerman(b.event_date)}
          {b.event_days > 1 ? ` · ${b.event_days} Tage` : ""}
          {b.location ? ` · ${b.location}` : ""}
        </p>
      </div>

      <Card className="space-y-5">
        {offer.message && (
          <div className="rounded-2xl border border-gold-200 bg-gold-50/60 p-4 text-[15px] leading-relaxed text-anthracite-700">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gold-700">Unsere Antwort</p>
            <p className="whitespace-pre-wrap">{offer.message}</p>
          </div>
        )}

        <div className="text-sm">
          {(items.packages ?? []).map((p: any) => (
            <Line key={p.id} name={p.name} price={formatEuro(p.price)} strong />
          ))}
          {follow && <Line name={follow.label} price={formatEuro(follow.amount)} />}
          {(items.extras ?? []).map((e: any) => (
            <Line key={e.id} name={e.name} price={`${e.from ? "ab " : ""}${formatEuro(e.price)}`} highlight={String(e.id).startsWith("angebot")} />
          ))}
          <div className="mt-3 flex items-baseline justify-between border-t border-anthracite-100 pt-3">
            <span className="font-semibold text-anthracite-800">Gesamt</span>
            <span className="font-serif text-2xl font-semibold text-anthracite-800">
              {offer.total != null ? `${items.isFromPrice ? "ab " : ""}${formatEuro(Number(offer.total))}` : "–"}
            </span>
          </div>
          <p className="mt-1 text-xs text-anthracite-400">Alle Preise sind Endpreise. Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.</p>
        </div>

        {open ? (
          <>
            <p className="rounded-xl bg-sand-50 px-4 py-3 text-sm text-anthracite-600">
              Gültig bis <strong>{formatDateGerman(offer.valid_until)}</strong>
              {b.lifecycle === "reserviert" ? (sie ? " – bis dahin ist Ihr Termin für Sie reserviert." : " – bis dahin ist dein Termin für dich reserviert.") : "."}
            </p>
            <OfferResponse token={token} sie={sie} />
          </>
        ) : (
          <div className="rounded-2xl bg-sand-50 p-5 text-center">
            <p className="text-3xl">{state!.icon}</p>
            <p className="mt-2 font-serif text-xl font-semibold text-anthracite-800">{state!.title}</p>
            <p className="mt-1 text-sm text-anthracite-500">{state!.text}</p>
            {b.lifecycle === "bestaetigt" && (
              <Link href="/" className="mt-4 inline-block rounded-full bg-anthracite-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-anthracite-700">
                Zum Kundenportal
              </Link>
            )}
          </div>
        )}
      </Card>

      {offer.status !== "ersetzt" && (
        <div className="mt-4 text-center">
          <Link
            href={`/angebot/${token}/pdf`}
            target="_blank"
            className="inline-flex items-center gap-2 rounded-full border border-anthracite-200 bg-white px-5 py-2.5 text-sm font-medium text-anthracite-700 hover:border-anthracite-300 hover:bg-sand-50"
          >
            📄 Als PDF speichern
          </Link>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-anthracite-400">Fragen? {sie ? "Rufen Sie uns an oder schreiben Sie uns" : "Ruf uns an oder schreib uns"} per WhatsApp: 0176 22748363.</p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="relative flex flex-1 justify-center overflow-hidden px-4 py-10">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-gold-300/30 blur-3xl" />
        <div className="relative w-full max-w-lg animate-fade-in-up">
          <div className="mx-auto mb-6 flex justify-center">
            <BrandMark size={60} priority />
          </div>
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Line({ name, price, strong, highlight }: { name: string; price: string; strong?: boolean; highlight?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 py-1.5 ${strong ? "font-medium text-anthracite-800" : "text-anthracite-600"} ${highlight ? "text-gold-800" : ""}`}>
      <span>{highlight ? "✦ " : strong ? "" : "+ "}{name}</span>
      <span className="whitespace-nowrap">{price}</span>
    </div>
  );
}
