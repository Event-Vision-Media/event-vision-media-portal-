"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import catalogData from "@/lib/catalog-data.json";
import { createAdminPackageBooking } from "@/app/actions/admin-inquiries";
import {
  CARRY_SERVICE,
  EXTRAS,
  PICKUP_OPTIONS,
  PRODUCT_LABELS,
  formatEuro,
  hasDelivery,
  includedExtraIds,
  priceSelection,
  type DeviceKey,
} from "@/lib/catalog";

const ANLAESSE = {
  privat: ["Hochzeit", "Geburtstag", "Jubiläum", "Abiball", "Sonstiges"],
  business: ["Firmenfeier", "Weihnachtsfeier", "Sommerfest", "Messe / Ausstellung", "Firmenjubiläum", "Sonstiges"],
};
const DEVICES: DeviceKey[] = ["spiegel", "fotobox", "360", "audio", "love"];

/**
 * Admin: Buchung mit Paket anlegen (z. B. nach Telefonat). Läuft danach wie
 * eine Website-Anfrage – mit Preis, Mietvertrag und Kundenportal.
 */
export function PackageBookingForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [typ, setTyp] = useState<"privat" | "business">("business");
  const [chosen, setChosen] = useState<Partial<Record<DeviceKey, string>>>({});
  const [extras, setExtras] = useState<string[]>([]);
  const [days, setDays] = useState(1);
  const [pickup, setPickup] = useState("folgetag");
  const [level, setLevel] = useState("ebenerdig");
  const [carry, setCarry] = useState(false);
  const biz = typ === "business";

  const packagesFor = (d: DeviceKey) => catalogData.packages.filter((p) => p.product === d && (biz || !("businessOnly" in p && p.businessOnly)));
  const packageIds = Object.values(chosen).filter(Boolean) as string[];
  const products = DEVICES.filter((d) => chosen[d]);
  const included = includedExtraIds({ packages: packageIds.map((id) => ({ id })) });
  const visibleExtras = EXTRAS.filter(
    (e) => e.for.some((k) => products.includes(k)) && !included.has(e.id) && (!e.businessOnly || biz) && (!e.privateOnly || !biz)
  );
  const extraIds = extras.filter((id) => visibleExtras.some((e) => e.id === id));
  const withAccess = products.some((p) => CARRY_SERVICE.for.includes(p));
  const access = withAccess ? { level, help: level === "ebenerdig" ? null : carry ? "service" : "helfer" } : null;
  const priced = useMemo(
    () => priceSelection(packageIds, extraIds, days, biz, access as any, { pickup: pickup as any, travel: null }),
    [packageIds.join(), extraIds.join(), days, biz, level, carry, pickup]
  );
  const delivered = hasDelivery(priced.packages, extraIds);

  function toggleDevice(d: DeviceKey) {
    setChosen((c) => {
      if (c[d]) {
        const { [d]: _, ...rest } = c;
        return rest;
      }
      const list = packagesFor(d);
      const def = list.find((p) => p.badge) ?? list[0];
      return { ...c, [d]: def?.id };
    });
  }

  function switchTyp(t: "privat" | "business") {
    setTyp(t);
    if (t === "privat") {
      // Firmenpakete sind nur für Firmen – zurück auf das Standardpaket
      setChosen((c) =>
        Object.fromEntries(
          Object.entries(c).map(([d, id]) => {
            const p = catalogData.packages.find((x) => x.id === id);
            if (p && "businessOnly" in p && p.businessOnly) return [d, "includes" in p ? (p.includes as string) : undefined];
            return [d, id];
          })
        )
      );
      setDays(1);
    }
  }

  function submit(fd: FormData) {
    setError(null);
    start(async () => {
      const r = await createAdminPackageBooking({
        customerType: typ,
        company: String(fd.get("company") ?? ""),
        name: String(fd.get("name") ?? ""),
        email: String(fd.get("email") ?? ""),
        phone: String(fd.get("phone") ?? ""),
        occasion: String(fd.get("occasion") ?? ""),
        eventDate: String(fd.get("event_date") ?? ""),
        days,
        location: String(fd.get("location") ?? ""),
        guestCount: String(fd.get("guests") ?? ""),
        packageIds,
        extraIds,
        pickup: delivered ? pickup : "",
        access,
        note: String(fd.get("note") ?? ""),
      });
      if (r.error || !r.bookingId) return setError(r.error ?? "Unbekannter Fehler.");
      router.push(`/admin/bookings/${r.bookingId}`);
    });
  }

  const label = "mb-1 block text-xs font-medium text-anthracite-500";
  return (
    <form action={submit} className="space-y-6 text-sm">
      <div className="flex overflow-hidden rounded-full border border-anthracite-200 bg-white w-fit">
        {(["business", "privat"] as const).map((t) => (
          <button key={t} type="button" onClick={() => switchTyp(t)} className={`px-5 py-2 ${t === typ ? "bg-anthracite-800 text-white" : "text-anthracite-600 hover:bg-sand-50"}`}>
            {t === "business" ? "Firma" : "Privat"}
          </button>
        ))}
      </div>

      <section className="grid gap-3 sm:grid-cols-2">
        {biz && (
          <label className="sm:col-span-2"><span className={label}>Firma *</span><input name="company" className="input-field" required /></label>
        )}
        <label><span className={label}>{biz ? "Ansprechpartner *" : "Name *"}</span><input name="name" className="input-field" required /></label>
        <label><span className={label}>E-Mail *</span><input name="email" type="email" className="input-field" required /></label>
        <label><span className={label}>Telefon</span><input name="phone" className="input-field" /></label>
        <label>
          <span className={label}>Anlass</span>
          <select name="occasion" className="input-field">{ANLAESSE[typ].map((a) => <option key={a}>{a}</option>)}</select>
        </label>
        <label><span className={label}>Datum *</span><input name="event_date" type="date" className="input-field" required /></label>
        {biz && (
          <label>
            <span className={label}>Veranstaltungstage</span>
            <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="input-field">
              {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} {n > 1 ? "Tage" : "Tag"}</option>)}
            </select>
          </label>
        )}
        <label className="sm:col-span-2"><span className={label}>Adresse der Location * (für Fahrtkosten)</span><input name="location" className="input-field" placeholder="Straße Nr., PLZ Ort" required /></label>
        <label><span className={label}>Gäste (ca.)</span><input name="guests" type="number" min={1} className="input-field" /></label>
      </section>

      <section>
        <h3 className="mb-2 font-semibold text-anthracite-800">Geräte &amp; Pakete</h3>
        <div className="space-y-2">
          {DEVICES.map((d) => (
            <div key={d} className={`rounded-xl border p-3 ${chosen[d] ? "border-gold-300 bg-gold-50/40" : "border-anthracite-100"}`}>
              <label className="flex items-center gap-2 font-medium text-anthracite-800">
                <input type="checkbox" checked={Boolean(chosen[d])} onChange={() => toggleDevice(d)} /> {PRODUCT_LABELS[d]}
              </label>
              {chosen[d] && (
                <div className="mt-2 grid gap-1.5 pl-6">
                  {packagesFor(d).map((p) => (
                    <label key={p.id} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <input type="radio" name={`pkg-${d}`} checked={chosen[d] === p.id} onChange={() => setChosen((c) => ({ ...c, [d]: p.id }))} />
                        {p.name}
                        {"businessOnly" in p && p.businessOnly && <span className="rounded-full bg-gold-100 px-2 py-0.5 text-[10px] font-semibold text-gold-800">Firma</span>}
                      </span>
                      <span className="text-anthracite-500">{formatEuro(p.price)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        {included.size > 0 && (
          <p className="mt-2 text-xs text-emerald-700">Im Paket enthalten: {EXTRAS.filter((e) => included.has(e.id)).map((e) => e.name).join(", ")}</p>
        )}
      </section>

      {visibleExtras.length > 0 && (
        <section>
          <h3 className="mb-2 font-semibold text-anthracite-800">Extras</h3>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {visibleExtras.map((e) => (
              <label key={e.id} className="flex items-center justify-between gap-2 rounded-lg border border-anthracite-100 px-3 py-2">
                <span className="flex items-center gap-2">
                  <input type="checkbox" checked={extras.includes(e.id)} onChange={() => setExtras((x) => (x.includes(e.id) ? x.filter((y) => y !== e.id) : [...x, e.id]))} />
                  {e.name}
                </span>
                <span className="flex-none text-anthracite-500">{e.from ? "ab " : ""}{formatEuro(e.price)}</span>
              </label>
            ))}
          </div>
        </section>
      )}

      {(delivered || withAccess) && (
        <section className="grid gap-3 sm:grid-cols-2">
          {delivered && (
            <label>
              <span className={label}>Abholung</span>
              <select value={pickup} onChange={(e) => setPickup(e.target.value)} className="input-field">
                {PICKUP_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}{o.price ? ` (+${o.price} €)` : ""}</option>)}
              </select>
            </label>
          )}
          {withAccess && (
            <label>
              <span className={label}>Zugang zum Aufstellort</span>
              <select value={level} onChange={(e) => setLevel(e.target.value)} className="input-field">
                <option value="ebenerdig">Ebenerdig / Aufzug</option>
                <option value="stufen">Einige Stufen</option>
                <option value="treppe">Treppe (Stockwerk)</option>
              </select>
              {level !== "ebenerdig" && (
                <span className="mt-1.5 flex items-center gap-2 text-xs text-anthracite-600">
                  <input type="checkbox" checked={carry} onChange={(e) => setCarry(e.target.checked)} />
                  Trageservice (+{CARRY_SERVICE[level as "stufen" | "treppe"]} €)
                </span>
              )}
            </label>
          )}
        </section>
      )}

      <label className="block"><span className={label}>Notiz (intern, erscheint als Kundennachricht)</span><textarea name="note" rows={3} className="input-field" /></label>

      <div className="rounded-xl border border-gold-300 bg-gold-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-anthracite-600">Preis{priced.days > 1 ? ` für ${priced.days} Tage` : ""} (ohne Fahrtkosten)</span>
          <strong className="font-serif text-lg text-anthracite-800">{priced.isFromPrice ? "ab " : ""}{formatEuro(priced.total)}</strong>
        </div>
        <p className="mt-1 text-xs text-anthracite-500">Fahrtkosten werden aus der Adresse berechnet. Die Buchung erscheint unter „Anfragen“ – mit „Bestätigen“ bekommt der Kunde Zugang, Mietvertrag und Anzahlungsinfo.</p>
      </div>

      {error && <p className="text-red-700">{error}</p>}
      <button type="submit" disabled={pending || !packageIds.length} className="w-full rounded-xl bg-anthracite-800 px-5 py-3 font-medium text-white hover:bg-anthracite-700 disabled:opacity-50">
        {pending ? "Wird angelegt …" : "Buchung anlegen"}
      </button>
    </form>
  );
}
