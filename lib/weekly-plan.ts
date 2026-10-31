import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDays, loadCalendar, mondayOf, todayBerlin, type CalendarKind } from "@/lib/calendar";
import { PRODUCT_LABELS, staffFor, type DeviceKey } from "@/lib/catalog";
import { contractRequired } from "@/lib/contract";
import { getPaymentSummary } from "@/lib/payments";
import type { Booking } from "@/lib/types";

// Wochenplan für den Admin (Mail jeden Sonntagabend): alle Einsätze der kommenden
// Woche mit Zeit, Ort, Geräten und Status, dazu offene To-dos, Geräte-Engpässe
// und eine kurze Vorschau auf die Woche danach.

export interface WeeklyPlanItem {
  kind: CalendarKind;
  time: string | null;
  title: string;
  code: string;
  devices: string;
  place: string | null;
  address: string | null;
  phone: string | null;
  selfService: boolean;
  /** Hinweise wie „Bar mitnehmen: 463 €“, „Layout noch nicht freigegeben“ – nur am Aufbau-/Übergabetermin. */
  notes: string[];
  warn: boolean;
}

export interface WeeklyPlan {
  weekStart: string;
  weekEnd: string;
  days: { date: string; items: WeeklyPlanItem[] }[];
  todos: { code: string; title: string; date: string; text: string }[];
  deviceAlerts: { date: string; text: string }[];
  nextWeek: { date: string; title: string; devices: string; place: string | null }[];
  eventCount: number;
}

const PHOTO: DeviceKey[] = ["spiegel", "fotobox"];

function productsOf(b: Booking): DeviceKey[] {
  const fromPkgs = (b.inquiry_items?.packages ?? []).map((p) => p.product as DeviceKey);
  if (fromPkgs.length) return fromPkgs;
  return b.product_type === "Fotospiegel" ? ["spiegel"] : b.product_type === "Fotobox" ? ["fotobox"] : [];
}

/** Woche, die der Wochenplan zeigt: sonntags (bzw. am Wochenende) die kommende, sonst die laufende. */
export function planWeekStart(today = todayBerlin()): string {
  const wd = new Date(today + "T00:00:00Z").getUTCDay(); // 0 = Sonntag
  return wd === 0 || wd === 6 ? mondayOf(addDays(today, 7 - ((wd + 6) % 7))) : mondayOf(today);
}

export async function buildWeeklyPlan(weekStart = planWeekStart()): Promise<WeeklyPlan> {
  const supabase = createAdminClient();
  const weekEnd = addDays(weekStart, 6);
  const today = todayBerlin();
  const [entries, nextEntries, { data: stockRows }] = await Promise.all([
    loadCalendar(weekStart, weekEnd),
    loadCalendar(addDays(weekStart, 7), addDays(weekStart, 13)),
    supabase.from("device_stock").select("device_key, total"),
  ]);

  // Buchungen der Woche + alle bestätigten Buchungen der nächsten 4 Wochen (für To-dos)
  const horizon = addDays(today, 28);
  const { data: rows } = await supabase
    .from("bookings")
    .select("*")
    .in("lifecycle", ["anfrage", "reserviert", "bestaetigt"])
    .gte("event_date", addDays(weekStart, -7))
    .lte("event_date", horizon > weekEnd ? horizon : weekEnd)
    .order("event_date");
  const bookings = new Map(((rows ?? []) as Booking[]).map((b) => [b.id, b]));
  const ids = Array.from(bookings.keys());
  const [{ data: contracts }, { data: proofs }] = ids.length
    ? await Promise.all([
        supabase.from("booking_contracts").select("booking_id").in("booking_id", ids),
        supabase.from("layout_proofs").select("booking_id, status, created_at").in("booking_id", ids).order("created_at", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }];
  const signed = new Set((contracts ?? []).map((c) => c.booking_id));
  const proofStatus = new Map<string, string>();
  for (const p of proofs ?? []) if (!proofStatus.has(p.booking_id)) proofStatus.set(p.booking_id, p.status);

  const payments = new Map(
    await Promise.all(Array.from(bookings.values()).map(async (b) => [b.id, await getPaymentSummary(b)] as const))
  );
  const euro = (n: number) => n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });

  /** Offene Punkte einer Buchung (aus deiner Sicht). */
  function openPoints(b: Booking): string[] {
    const out: string[] = [];
    if (b.lifecycle !== "bestaetigt") out.push("Buchung noch nicht bestätigt");
    if (b.portal_invite_pending) out.push("Portal-Zugang noch nicht verschickt");
    if (b.lifecycle === "bestaetigt" && contractRequired(b) && !signed.has(b.id)) out.push("Mietvertrag nicht unterschrieben");
    const photo = productsOf(b).some((d) => PHOTO.includes(d));
    if (photo && !b.selected_layout_id) out.push("Layout nicht gewählt");
    else if (photo && proofStatus.get(b.id) === "aenderungen_erforderlich") out.push("Layout: Änderungswunsch offen");
    else if (photo && proofStatus.get(b.id) === "in_pruefung") out.push("Layout wartet auf Freigabe");
    const staff = staffFor(b.inquiry_items);
    if (staff && !staff.start) out.push("Betreuungszeit offen");
    const p = payments.get(b.id);
    if (p && p.deposit && !p.depositPaid && signed.has(b.id)) out.push(`Anzahlung offen (${euro(p.deposit)})`);
    if (p && p.method === "ueberweisung" && !p.restPaid && p.rest && today >= p.restDueDate) out.push(`Restzahlung überfällig (${euro(p.rest)})`);
    return out;
  }

  const shownSetup = new Set<string>();
  const days: WeeklyPlan["days"] = [];
  for (let i = 0; i < 7; i++) days.push({ date: addDays(weekStart, i), items: [] });
  for (const e of entries) {
    const b = bookings.get(e.bookingId);
    const notes: string[] = [];
    let warn = e.warnings.length > 0;
    notes.push(...e.warnings);
    // Status & Bargeld beim ersten Termin der Buchung in dieser Woche (meist Aufbau/Übergabe)
    if (b && !shownSetup.has(b.id) && e.kind !== "abbau") {
      shownSetup.add(b.id);
      const open = openPoints(b);
      if (open.length) warn = true;
      notes.push(...open);
      const p = payments.get(b.id);
      if (p && p.method === "bar" && !p.restPaid && p.rest) notes.push(`💶 Bar mitnehmen: ${euro(p.rest)}`);
      if (!open.length) notes.push("✓ alles erledigt");
    }
    days.find((d) => d.date === e.date)?.items.push({
      kind: e.kind,
      // Datum steht schon in der Tagesüberschrift: "Sa., 12.06.2027, 12:00–15:00 Uhr" → "12:00–15:00 Uhr"
      time: e.timeLabel?.replace(/^[A-Za-zÄÖÜäöü]{2}\.,\s*\d{1,2}\.\d{1,2}\.\d{2,4},?\s*/, "") || null,
      title: e.title,
      code: e.bookingCode,
      devices: e.devices,
      place: e.place,
      address: e.kind === "aufbau" && !e.selfService ? e.address : null,
      phone: e.kind === "aufbau" && !e.selfService ? e.phone : null,
      selfService: e.selfService,
      notes,
      warn,
    });
  }

  // Geräte-Check: Wie viele Geräte sind je Tag unterwegs (Aufbau bis Abbau)?
  const stock = new Map((stockRows ?? []).map((r) => [r.device_key as DeviceKey, Number(r.total)]));
  const deviceAlerts: WeeklyPlan["deviceAlerts"] = [];
  for (const d of days) {
    const used = new Map<DeviceKey, number>();
    for (const b of bookings.values()) {
      if (b.lifecycle === "anfrage") continue;
      const own = entries.filter((x) => x.bookingId === b.id);
      const first = [b.event_date, ...own.filter((x) => x.kind === "aufbau").map((x) => x.date)].sort()[0];
      const last = [addDays(b.event_date, Math.max(1, b.event_days ?? 1) - 1), ...own.filter((x) => x.kind === "abbau").map((x) => x.date)].sort().pop()!;
      if (d.date < first || d.date > last) continue;
      for (const k of productsOf(b)) used.set(k, (used.get(k) ?? 0) + 1);
    }
    for (const [k, n] of used) {
      const total = stock.get(k);
      if (total != null && n >= total) {
        deviceAlerts.push({ date: d.date, text: n > total ? `${PRODUCT_LABELS[k]}: ${n} gebucht, nur ${total} vorhanden!` : total === 1 ? `${PRODUCT_LABELS[k]}: im Einsatz (einziges Gerät)` : `${PRODUCT_LABELS[k]}: alle ${total} im Einsatz` });
      }
    }
  }

  // To-dos: wartende Anfragen + offene Punkte bei Events der nächsten 4 Wochen (außer dieser Woche, die steht oben)
  const todos: WeeklyPlan["todos"] = [];
  for (const b of bookings.values()) {
    if (b.event_date < today) continue;
    const title = [b.company, b.customer_name || b.couple_names].filter(Boolean).join(" · ");
    if (b.lifecycle !== "bestaetigt") {
      todos.push({ code: b.booking_code, title, date: b.event_date, text: b.lifecycle === "anfrage" ? "Anfrage wartet auf deine Antwort" : "Reservierung wartet auf Bestätigung" });
      continue;
    }
    if (b.event_date >= weekStart && b.event_date <= weekEnd) continue;
    if (b.event_date > horizon) continue;
    for (const t of openPoints(b)) todos.push({ code: b.booking_code, title, date: b.event_date, text: t });
  }
  todos.sort((a, b) => a.date.localeCompare(b.date));

  const nextWeek = nextEntries
    .filter((e) => e.kind === "event" && !e.id.match(/-e[1-9]\d*$/))
    .map((e) => ({ date: e.date, title: e.title, devices: e.devices, place: e.place }));

  const eventCount = new Set(entries.filter((e) => e.kind === "event").map((e) => e.bookingId)).size;
  return { weekStart, weekEnd, days, todos, deviceAlerts, nextWeek, eventCount };
}
