import Link from "next/link";
import { accessSummary } from "@/lib/types";
import { pickupSummary, travelSummary } from "@/lib/catalog";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { InquiryActions } from "@/components/admin/InquiryActions";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatDateGerman, formatDateTimeGerman } from "@/lib/format";
import { daysUntil, followupLine, formatEuro, MIN_LEAD_DAYS } from "@/lib/catalog";
import { contractStatusByBooking } from "@/lib/contract-server";
import { LayoutDraftCard } from "@/components/admin/LayoutDraftCard";
import { latestOffers, type Offer } from "@/lib/offers";

function OfferBadge({ o }: { o: Offer }) {
  if (o.status === "offen")
    return <Badge tone="gold">✉️ Angebot{o.version > 1 ? ` v${o.version}` : ""} gesendet · bis {formatDateGerman(o.valid_until)}{o.viewed_at ? " · angesehen" : ""}</Badge>;
  if (o.status === "aenderung") return <Badge tone="danger">✏️ Änderungswunsch zum Angebot</Badge>;
  if (o.status === "angenommen") return <Badge tone="success">✅ Angebot angenommen</Badge>;
  if (o.status === "abgelehnt") return <Badge tone="neutral">Angebot abgelehnt</Badge>;
  if (o.status === "abgelaufen") return <Badge tone="neutral">⌛ Angebot abgelaufen</Badge>;
  return null;
}

export const dynamic = "force-dynamic";

const VIEWS = {
  offen: { label: "Offen", lifecycles: ["reserviert", "anfrage"] },
  bestaetigt: { label: "Bestätigt", lifecycles: ["bestaetigt"] },
  abgelehnt: { label: "Abgelehnt", lifecycles: ["abgelehnt", "storniert"] },
} as const;

type ViewKey = keyof typeof VIEWS;

export default async function AdminInquiriesPage(props: { searchParams: Promise<{ view?: string }> }) {
  const searchParams = await props.searchParams;
  const view: ViewKey = (searchParams.view as ViewKey) in VIEWS ? (searchParams.view as ViewKey) : "offen";
  const supabase = createAdminClient();

  const [{ data: rows }, { data: counts }] = await Promise.all([
    supabase
      .from("bookings")
      .select("*")
      .eq("source", "website")
      .in("lifecycle", [...VIEWS[view].lifecycles])
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("bookings").select("lifecycle").eq("source", "website"),
  ]);

  const countFor = (k: ViewKey) => (counts ?? []).filter((c) => (VIEWS[k].lifecycles as readonly string[]).includes(c.lifecycle)).length;
  const inquiries = rows ?? [];
  const [contracts, offers] = await Promise.all([
    contractStatusByBooking(inquiries.map((b: any) => b.id)),
    latestOffers(inquiries.map((b: any) => b.id)),
  ]);

  return (
    <div className="min-h-screen bg-sand-50">
      <AdminHeader />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="font-serif text-2xl font-semibold text-anthracite-800">Website-Anfragen</h1>
        <p className="mt-1 mb-6 text-sm text-anthracite-500">
          Anfragen aus dem Formular auf fotobox-essen.com. Freie Termine sind automatisch vorgemerkt – bitte innerhalb von
          24 Stunden prüfen. Mit „Bestätigen“ geht die Auftragsbestätigung mit Portal-Zugang raus; der Kunde unterschreibt
          dann den Mietvertrag, damit ist die Buchung abgeschlossen. Gibt es noch etwas zu klären, schick stattdessen ein
          „Angebot“ – nimmt der Kunde es an, wird automatisch bestätigt.
        </p>

        <div className="mb-6 flex flex-wrap gap-2 text-sm">
          {(Object.keys(VIEWS) as ViewKey[]).map((k) => (
            <Link
              key={k}
              href={`/admin/anfragen?view=${k}`}
              className={`rounded-full border px-4 py-1.5 transition ${
                k === view ? "border-anthracite-800 bg-anthracite-800 text-white" : "border-anthracite-200 bg-white text-anthracite-600 hover:border-gold-300"
              }`}
            >
              {VIEWS[k].label} ({countFor(k)})
            </Link>
          ))}
        </div>

        {inquiries.length === 0 && (
          <Card><p className="text-center text-sm text-anthracite-400">Keine Anfragen in dieser Ansicht.</p></Card>
        )}

        <div className="space-y-4">
          {inquiries.map((b: any) => {
            const items = b.inquiry_items ?? {};
            const isOpen = b.lifecycle === "reserviert" || b.lifecycle === "anfrage";
            const offer = offers.get(b.id);
            const lines: { label: string; amount: number }[] = items.offer?.lines ?? [];
            const baseTotal = Number(b.total_price ?? 0) - lines.reduce((s, l) => s + Number(l.amount), 0);
            return (
              <Card key={b.id} className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-serif text-lg font-semibold text-anthracite-800">{b.couple_names}</span>
                      {b.lifecycle === "reserviert" && <Badge tone="gold">Vorgemerkt · bitte bestätigen</Badge>}
                      {b.lifecycle === "anfrage" && (items.shortNotice
                        ? <Badge tone="gold">Kurzfristig · unter {MIN_LEAD_DAYS} Tagen</Badge>
                        : <Badge tone="danger">Termin belegt</Badge>)}
                      {b.lifecycle === "bestaetigt" && <Badge tone="success">Bestätigt</Badge>}
                      {(b.lifecycle === "abgelehnt" || b.lifecycle === "storniert") && <Badge tone="neutral">{b.lifecycle}</Badge>}
                      {offer && offer.status !== "ersetzt" && <OfferBadge o={offer} />}
                      {isOpen && b.inquiry_message && !offer && <Badge tone="danger">💬 Kunde hat eine Frage</Badge>}
                      <Badge tone="neutral">{b.customer_type === "business" ? "Business" : "Privat"}</Badge>
                      {b.lifecycle === "bestaetigt" && b.portal_invite_pending && <Badge tone="gold">Zugang noch nicht verschickt</Badge>}
                      {b.lifecycle === "bestaetigt" && b.contract_on_file && !contracts.has(b.id) && <Badge tone="success">Vertrag liegt vor</Badge>}
                      {b.lifecycle === "bestaetigt" && !(b.contract_on_file && !contracts.has(b.id)) && (contracts.has(b.id) || daysUntil(b.event_date) >= 0) && (contracts.get(b.id) === "gegengezeichnet"
                        ? <Badge tone="success">Vertrag ✓</Badge>
                        : contracts.get(b.id) === "unterschrieben"
                          ? <Badge tone="gold">Vertrag unterschrieben</Badge>
                          : <Badge tone="neutral">Vertrag offen</Badge>)}
                    </div>
                    <p className="mt-1 text-sm text-anthracite-500">
                      {b.booking_code} · eingegangen {formatDateTimeGerman(b.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-serif text-2xl font-semibold text-anthracite-800">
                      {b.total_price != null ? `${items.isFromPrice ? "ab " : ""}${formatEuro(Number(b.total_price))}` : "–"}
                    </div>
                    <div className="text-xs text-anthracite-400">{offer ? "laut Angebot" : "Richtpreis"}</div>
                  </div>
                </div>

                <div className="grid gap-4 text-sm sm:grid-cols-2">
                  <dl className="space-y-1">
                    <Row k="Datum" v={`${formatDateGerman(b.event_date)}${b.event_days > 1 ? ` · ${b.event_days} Tage` : ""}`} />
                    <Row k="Anlass" v={b.occasion} />
                    <Row k="Location" v={b.location} />
                    <Row k="Gäste" v={b.guest_count} />
                    <Row k="Dauer" v={items.duration} />
                    <Row k="Abholung" v={pickupSummary(items.pickup) ? `${pickupSummary(items.pickup)!.night ? "🌙 " : ""}${pickupSummary(items.pickup)!.text}` : null} />
                    <Row k="Anfahrt" v={travelSummary(items.travel) ? `${travelSummary(items.travel)!.warn ? "⚠️ " : ""}${travelSummary(items.travel)!.text}` : null} />
                    <Row k="Zugang" v={accessSummary(items.access) ? (accessSummary(items.access)!.warn ? `⚠️ ${accessSummary(items.access)!.text}` : accessSummary(items.access)!.text) : null} />
                  </dl>
                  <dl className="space-y-1">
                    <Row k="Name" v={b.customer_name} />
                    <Row k="Firma" v={b.company} />
                    <Row k="E-Mail" v={b.email ? <a className="text-gold-700 underline" href={`mailto:${b.email}`}>{b.email}</a> : null} />
                    <Row k="Telefon" v={b.phone ? <a className="text-gold-700 underline" href={`tel:${b.phone}`}>{b.phone}</a> : null} />
                    <Row k="Portal-Code" v={b.lifecycle === "bestaetigt" ? b.access_code : "– (kommt mit der Bestätigung)"} />
                  </dl>
                </div>

                <div className="rounded-xl bg-sand-50 p-3 text-sm">
                  {(items.packages ?? []).map((p: any) => (
                    <div key={p.id} className="flex justify-between"><span>{p.name}</span><span>{formatEuro(p.price)}</span></div>
                  ))}
                  {followupLine(items) && (
                    <div className="flex justify-between"><span>{followupLine(items)!.label}</span><span>{formatEuro(followupLine(items)!.amount)}</span></div>
                  )}
                  {(items.extras ?? []).map((e: any) => (
                    <div key={e.id} className="flex justify-between text-anthracite-500"><span>+ {e.name}</span><span>{e.from ? "ab " : ""}{formatEuro(e.price)}</span></div>
                  ))}
                </div>

                {b.layout_draft && <LayoutDraftCard draft={b.layout_draft} compact />}
                {b.inquiry_message && (
                  <p className="whitespace-pre-wrap rounded-xl border border-anthracite-100 p-3 text-sm text-anthracite-600">{b.inquiry_message}</p>
                )}
                {offer && offer.status !== "ersetzt" && (
                  <div className="rounded-xl border border-gold-200 bg-gold-50/50 p-3 text-sm text-anthracite-600">
                    <p className="text-xs font-semibold text-gold-700">
                      Angebot{offer.version > 1 ? ` (Version ${offer.version})` : ""} vom {formatDateTimeGerman(offer.created_at)}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{offer.message}</p>
                    {offer.customer_note && (
                      <p className="mt-2 whitespace-pre-wrap rounded-lg bg-white p-2 text-anthracite-700">
                        <strong>{offer.status === "aenderung" ? "✏️ Änderungswunsch:" : "Kunde:"}</strong> {offer.customer_note}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-anthracite-100 pt-4">
                  {isOpen ? (
                    <InquiryActions
                      bookingId={b.id}
                      hasEmail={Boolean(b.email)}
                      offer={items.packages?.length ? { baseTotal, isFromPrice: Boolean(items.isFromPrice), lines, question: offer?.status === "aenderung" && offer.customer_note ? `Änderungswunsch: ${offer.customer_note}` : b.inquiry_message ?? null, sent: Boolean(offer) } : null}
                    />
                  ) : <span />}
                  <Link href={`/admin/bookings/${b.id}`} className="text-sm text-anthracite-400 hover:text-anthracite-700">
                    Buchungsdetails →
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  if (v == null || v === "") return null;
  return (
    <div className="flex gap-3">
      <dt className="w-24 flex-none text-anthracite-400">{k}</dt>
      <dd className="text-anthracite-700">{v}</dd>
    </div>
  );
}
