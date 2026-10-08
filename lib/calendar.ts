import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { PICKUP_OPTIONS, PRODUCT_LABELS, handoverFor, staffFor, staffLabel, type DeviceKey } from "@/lib/catalog";
import { DEVICE_BY_PRODUCT_TYPE } from "@/lib/catalog";
import { accessSummary, type Booking } from "@/lib/types";

// Kalender für den Admin: aus jeder Buchung werden Termine für Aufbau/Übergabe,
// Veranstaltung und Abbau/Rückgabe abgeleitet – mit Uhrzeit, Ort und Gerät.

export type CalendarKind = "aufbau" | "event" | "abbau";

export interface CalendarEntry {
  id: string;
  bookingId: string;
  date: string; // YYYY-MM-DD
  kind: CalendarKind;
  /** Sortierschlüssel "HH:MM" (leer = ganztägig/unbekannt → ans Ende). */
  sort: string;
  timeLabel: string | null;
  title: string;
  devices: string;
  place: string | null;
  lifecycle: string;
  warnings: string[];
  selfService: boolean;
  /** Volle Adresse für Navigation (Kalender-Abo). */
  address: string | null;
  phone: string | null;
  bookingCode: string;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function todayBerlin(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
}

/** Montag der Woche, in der `iso` liegt. */
export function mondayOf(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  const wd = (d.getUTCDay() + 6) % 7;
  return addDays(iso, -wd);
}

const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : null);

/** "Königsallee 1, 40212 Düsseldorf" → "Düsseldorf"; sonst der Text selbst. */
function cityOf(location: string | null | undefined): string | null {
  if (!location) return null;
  const m = location.match(/\b\d{5}\s+([^,]+)/);
  return (m ? m[1] : location).trim().slice(0, 60);
}

function devicesOf(b: Booking): { keys: DeviceKey[]; label: string; delivered: boolean } {
  const pkgs = b.inquiry_items?.packages ?? [];
  const extraIds = new Set((b.inquiry_items?.extras ?? []).map((e) => e.id));
  if (pkgs.length) {
    const keys = pkgs.map((p) => p.product as DeviceKey);
    const delivered = pkgs.some((p) => handoverFor(p.product as DeviceKey, p.id, extraIds) === "lieferung");
    return { keys, label: pkgs.map((p) => p.name).join(" + "), delivered };
  }
  const key = DEVICE_BY_PRODUCT_TYPE[b.product_type];
  return { keys: key ? [key] : [], label: key ? PRODUCT_LABELS[key] : b.product_type, delivered: true };
}

/** Datum aus Freitext ("13.06., ab 10 Uhr" → 2027-06-13), bezogen auf das Eventjahr. */
export function dateFromText(text: string | null | undefined, eventDate: string): string | null {
  const m = text?.match(/(\d{1,2})\.\s?(\d{1,2})\.(\d{2,4})?/);
  if (!m) return null;
  const day = Number(m[1]), month = Number(m[2]);
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  let year = m[3] ? Number(m[3].length === 2 ? `20${m[3]}` : m[3]) : Number(eventDate.slice(0, 4));
  let iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  // Jahreswechsel (Event 31.12., Abbau "01.01.")
  if (!m[3] && iso < addDays(eventDate, -20)) iso = `${++year}${iso.slice(4)}`;
  return iso;
}

/** Ende eines Zeitfensters ("12–15 Uhr" → "15:00"), sonst null. */
export function endFromText(text: string | null | undefined): string | null {
  const m = text?.replace(/\d{1,2}\.\s?\d{1,2}\.(\d{2,4})?/g, " ").match(/\d{1,2}(?::\d{2})?\s*[–-]\s*(\d{1,2})(?::(\d{2}))?/);
  return m ? `${m[1].padStart(2, "0")}:${m[2] ?? "00"}` : null;
}

/** Uhrzeit aus Freitext ziehen ("29.08., 12–15 Uhr" → "12:00"), für die Sortierung. */
export function sortFromText(text: string | null | undefined): string {
  const m = text?.replace(/\d{1,2}\.\s?\d{1,2}\.(\d{2,4})?/g, " ").match(/(\d{1,2})(?::(\d{2}))?\s*(?:[–-]|Uhr)/);
  return m ? `${m[1].padStart(2, "0")}:${m[2] ?? "00"}` : "";
}

export async function loadCalendar(from: string, to: string): Promise<CalendarEntry[]> {
  const supabase = createAdminClient();
  // Abbau kann nach dem Event liegen, Aufbau davor – Zeitraum großzügig laden
  const { data } = await supabase
    .from("bookings")
    .select("*")
    .in("lifecycle", ["reserviert", "bestaetigt"])
    .gte("event_date", addDays(from, -7))
    .lte("event_date", addDays(to, 2))
    .order("event_date");
  const bookings = (data ?? []) as Booking[];
  const ids = bookings.map((b) => b.id);
  const contracts = new Map<string, any>();
  if (ids.length) {
    const { data: rows } = await supabase
      .from("booking_contracts")
      .select("booking_id, location_name, location_street, location_zip_city, handover_window, return_window, signed_at")
      .in("booking_id", ids)
      .order("signed_at", { ascending: false });
    for (const r of rows ?? []) if (!contracts.has(r.booking_id)) contracts.set(r.booking_id, r);
  }

  const out: CalendarEntry[] = [];
  for (const b of bookings) {
    const c = contracts.get(b.id);
    const dev = devicesOf(b);
    const self = !dev.delivered;
    const title = [b.company, b.customer_name || b.couple_names].filter(Boolean).join(" · ");
    const place = c?.location_zip_city
      ? [c.location_name, cityOf(`${c.location_street ?? ""}, ${c.location_zip_city}`)].filter(Boolean).join(", ")
      : cityOf(b.location);
    const days = Math.max(1, b.event_days ?? 1);
    const items = b.inquiry_items;
    const warnings: string[] = [];
    const acc = accessSummary(items?.access);
    if (acc?.warn) warnings.push(items?.access?.help === "service" ? "2. Person mitnehmen" : "Stufen – Tragehilfe vor Ort");
    if (items?.travel?.status === "unknown" || items?.travel?.status === "over") warnings.push("Anfahrt prüfen");
    const address = c?.location_zip_city
      ? [c.location_name, c.location_street, c.location_zip_city].filter(Boolean).join(", ")
      : b.location ?? null;
    const phone = b.delivery_contact_phone || b.phone || null;
    const base = { bookingId: b.id, title, devices: dev.label, place, lifecycle: b.lifecycle, selfService: self, address, phone, bookingCode: b.booking_code };

    // Aufbau / Übergabe
    const setupDate = b.delivery_date ?? dateFromText(b.delivery_time_window || c?.handover_window, b.event_date) ?? b.event_date;
    const setupTime = hhmm(b.delivery_time) ?? null;
    const setupText = b.delivery_time_window || (setupTime ? `${setupTime} Uhr` : c?.handover_window || null);
    out.push({ ...base, id: `${b.id}-a`, date: setupDate, kind: "aufbau", sort: setupTime ?? sortFromText(setupText), timeLabel: setupText, warnings });

    // Veranstaltung (jeder Tag) – inkl. Betreuungszeit des Personals
    const staff = staffFor(items);
    for (let i = 0; i < days; i++) {
      out.push({ ...base, id: `${b.id}-e${i}`, date: addDays(b.event_date, i), kind: "event", sort: "99:98",
        timeLabel: [items?.duration, staff ? `👤 Personal ${staffLabel(staff)}` : null, days > 1 ? `Tag ${i + 1}/${days}` : null].filter(Boolean).join(" · ") || null,
        warnings: staff && (!staff.start || staff.requestedExtra) ? [staff.start ? "Zusatzstunden bestätigen" : "Betreuungszeit offen"] : [] });
    }

    // Abbau / Rückgabe
    const pickupOpt = PICKUP_OPTIONS.find((o) => o.id === items?.pickup);
    const lastDay = addDays(b.event_date, days - 1);
    const pickupDate =
      b.pickup_date ??
      dateFromText(b.pickup_time_window || c?.return_window, b.event_date) ??
      (pickupOpt?.id === "folgetag" || self ? addDays(lastDay, 1) : lastDay);
    const pickupTime = hhmm(b.pickup_time);
    const pickupText =
      b.pickup_time_window || (pickupTime ? `${pickupTime} Uhr` : c?.return_window || (pickupOpt ? pickupOpt.label : null));
    const pw = pickupOpt && pickupOpt.price > 0 ? ["🌙 Nachtabholung"] : [];
    out.push({ ...base, id: `${b.id}-z`, date: pickupDate, kind: "abbau",
      sort: pickupTime ?? (pickupOpt?.id === "spaetnacht" ? "23:59" : pickupOpt?.id === "nacht" ? "22:00" : sortFromText(pickupText)),
      timeLabel: pickupText, warnings: pw });
  }
  return out
    .filter((e) => e.date >= from && e.date <= to)
    .sort((a, b) => (a.date === b.date ? (a.sort || "99:99").localeCompare(b.sort || "99:99") : a.date.localeCompare(b.date)));
}
