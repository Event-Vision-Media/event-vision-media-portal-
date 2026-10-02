import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { formatCurrencyEUR, formatDateGerman } from "@/lib/format";
import type { BookingInfo } from "@/lib/admin-booking-info";
import { accessSummary } from "@/lib/types";
import { pickupSummary, travelSummary } from "@/lib/catalog";

const LIFECYCLE: Record<string, { label: string; tone: "gold" | "success" | "neutral" | "danger" }> = {
  anfrage: { label: "Anfrage", tone: "danger" },
  reserviert: { label: "Reserviert", tone: "gold" },
  bestaetigt: { label: "Bestätigt", tone: "success" },
  abgelehnt: { label: "Abgelehnt", tone: "neutral" },
  storniert: { label: "Storniert", tone: "neutral" },
};

function phoneLinks(phone: string | null | undefined) {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, "");
  const wa = digits.replace(/^\+/, "").replace(/^0/, "49");
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2">
      <a href={`tel:${digits}`} className="font-medium text-gold-700 hover:underline">{phone}</a>
      <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="text-xs text-emerald-700 hover:underline">WhatsApp</a>
    </span>
  );
}

function when(date: string | null | undefined, window: string | null | undefined, time: string | null | undefined) {
  if (!date && !window && !time) return null;
  return [date ? formatDateGerman(date) : null, window || (time ? `${time.slice(0, 5)} Uhr` : null)].filter(Boolean).join(", ");
}

/** Einsatz-Infos einer Buchung: Kunde, Location, Logistik, Vertrag, Zahlung. */
export function BookingInfoPanel({ info, showTitle = true }: { info: BookingInfo; showTitle?: boolean }) {
  const b = info.booking;
  const c = info.contract;
  const p = info.payment;
  const location = c?.locationAddress || b.location;
  const onsiteName = b.delivery_contact_name || c?.onsiteName;
  const onsitePhone = b.delivery_contact_phone || c?.onsitePhone;
  const delivery = when(b.delivery_date, b.delivery_time_window, b.delivery_time) || c?.handover || null;
  const pickup = when(b.pickup_date, b.pickup_time_window, b.pickup_time) || c?.return || null;
  const lc = LIFECYCLE[b.lifecycle] ?? LIFECYCLE.bestaetigt;
  const openAmount = p && p.total != null ? (p.depositPaid ? 0 : p.deposit ?? 0) + (p.restPaid ? 0 : p.rest ?? 0) : null;

  return (
    <div className="space-y-4">
      {showTitle && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link href={`/admin/bookings/${b.id}`} className="font-serif text-lg font-semibold text-anthracite-800 hover:text-gold-700">
              {b.company ? `${b.company} · ` : ""}{b.customer_name || b.couple_names}
            </Link>
            <p className="text-sm text-anthracite-500">{b.booking_code} · {b.occasion || b.product_type}{b.guest_count ? ` · ${b.guest_count} Gäste` : ""}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge tone={lc.tone}>{lc.label}</Badge>
            {info.contractNeeded && (
              <Badge tone={c?.countersigned ? "success" : c ? "gold" : "neutral"}>{c?.countersigned ? "Vertrag ✓" : c ? "Vertrag unterschr." : "Vertrag offen"}</Badge>
            )}
            {b.lifecycle === "bestaetigt" && info.contractNeeded && (
              <Badge tone={info.lastLogin ? "success" : "neutral"}>{info.lastLogin ? "Im Portal ✓" : "Noch nicht im Portal"}</Badge>
            )}
            {openAmount != null && (
              <Badge tone={openAmount === 0 ? "success" : "neutral"}>{openAmount === 0 ? "Bezahlt ✓" : `Offen ${formatCurrencyEUR(openAmount)}`}</Badge>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-4 text-sm sm:grid-cols-2">
        <section className="space-y-1">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-anthracite-400">Kunde</h4>
          <p className="text-anthracite-800">{b.customer_name || b.couple_names}{b.company ? ` · ${b.company}` : ""}</p>
          {b.phone ? <p>{phoneLinks(b.phone)}</p> : <p className="text-anthracite-400">Keine Telefonnummer</p>}
          {b.email && <p><a href={`mailto:${b.email}`} className="text-anthracite-600 hover:text-gold-700">{b.email}</a></p>}
          {c?.renterAddress && <p className="text-anthracite-500">{c.renterAddress}</p>}
          {c?.billing && (c.billing.address || c.billing.email || c.billing.poNumber || c.billing.costCenter) && (
            <div className="mt-1 rounded-lg bg-sand-50 px-2 py-1.5 text-xs text-anthracite-600">
              <p className="font-medium text-anthracite-700">Für die Rechnung (Lexware)</p>
              {c.billing.address && <p>Anschrift: {c.billing.address}</p>}
              {c.billing.email && <p>E-Mail: {c.billing.email}</p>}
              {c.billing.poNumber && <p>Bestellnr.: {c.billing.poNumber}</p>}
              {c.billing.costCenter && <p>Kostenstelle: {c.billing.costCenter}</p>}
            </div>
          )}
        </section>

        <section className="space-y-1">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-anthracite-400">Location</h4>
          {location ? (
            <p>
              <span className="text-anthracite-800">{location}</span>{" "}
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`} target="_blank" rel="noreferrer" className="text-xs text-gold-700 hover:underline">
                Karte / Route
              </a>
            </p>
          ) : (
            <p className="text-anthracite-400">Noch keine Adresse</p>
          )}
          {onsiteName || onsitePhone ? (
            <p className="text-anthracite-600">Vor Ort: {onsiteName}{onsitePhone ? " · " : ""}{phoneLinks(onsitePhone)}</p>
          ) : null}
          {b.access_notes && <p className="rounded-lg bg-sand-50 px-2 py-1 text-xs text-anthracite-600">Zugang: {b.access_notes}</p>}
        </section>

        <section className="space-y-1">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-anthracite-400">Logistik</h4>
          <p><span className="text-anthracite-500">Lieferung/Aufbau:</span> <span className="text-anthracite-800">{delivery || "offen"}</span></p>
          <p><span className="text-anthracite-500">Abholung/Abbau:</span> <span className="text-anthracite-800">{pickup || "offen"}</span></p>
          {b.inquiry_items?.duration && <p className="text-anthracite-500">Dauer: {b.inquiry_items.duration}</p>}
          {(() => {
            const pu = pickupSummary(b.inquiry_items?.pickup);
            const tr = travelSummary(b.inquiry_items?.travel);
            return (
              <>
                {pu && <p className={pu.night ? "font-medium text-indigo-700" : "text-anthracite-500"}>{pu.night ? "🌙 " : ""}Abholung: {pu.text}</p>}
                {tr && <p className={tr.warn ? "rounded-lg bg-amber-50 px-2 py-1 font-medium text-amber-800" : "text-anthracite-500"}>{tr.warn ? "⚠️ " : ""}Anfahrt: {tr.text}</p>}
              </>
            );
          })()}
          {(() => {
            const a = accessSummary(b.inquiry_items?.access);
            if (!a) return null;
            return a.warn ? (
              <p className="rounded-lg bg-amber-50 px-2 py-1 font-medium text-amber-800">⚠️ Zugang: {a.text}</p>
            ) : (
              <p className="text-anthracite-500">Zugang: {a.text}</p>
            );
          })()}
          {p?.method === "bar" && !p.restPaid && p.rest != null && (
            <p className="font-medium text-gold-700">Bar mitnehmen: {formatCurrencyEUR(p.rest)}</p>
          )}
        </section>

        <section className="space-y-1">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-anthracite-400">Gebucht</h4>
          <ul className="space-y-0.5 text-anthracite-700">
            {info.items.map((i) => <li key={i}>· {i}</li>)}
          </ul>
          {b.total_price != null && p?.total != null && (
            <p className="text-anthracite-500">Gesamt {formatCurrencyEUR(p.total)}</p>
          )}
        </section>
      </div>

      {b.inquiry_message && (
        <p className="whitespace-pre-wrap rounded-xl border border-anthracite-100 bg-white p-3 text-sm text-anthracite-600">„{b.inquiry_message}“</p>
      )}
    </div>
  );
}
