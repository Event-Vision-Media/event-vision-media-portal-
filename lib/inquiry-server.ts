import "server-only";
import { randomInt } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { storeLayoutDraftFiles } from "@/lib/layout-drafts";
import { travelForAddress } from "@/lib/distance";
import {
  DEVICE_BY_PRODUCT_TYPE,
  EXTRA_NAME_BY_DEVICE,
  EXTRAS,
  PRODUCT_LABELS,
  PRODUCT_TYPE_BY_DEVICE,
  priceSelection,
  daysUntil,
  hasDelivery,
  pickupSummary,
  travelSummary,
  type PickupId,
  MIN_LEAD_DAYS,
  type DeviceKey,
  type PricedSelection,
} from "@/lib/catalog";
import { logActivity } from "@/lib/activity-log";
import { accessSummary, type AccessInfo } from "@/lib/types";
import { adminNotificationMail, inquiryReceivedMail, reservationMail, sendEmail, type MailBooking } from "@/lib/email";

/** Lebenszyklen, die ein Gerät an einem Datum belegen. */
const BLOCKING_LIFECYCLES = ["reserviert", "bestaetigt"];

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Extras im Portal, die physisch ein Hauptgerät belegen. */
const DEVICE_BY_EXTRA_NAME: Record<string, DeviceKey> = Object.fromEntries(
  Object.entries(EXTRA_NAME_BY_DEVICE).map(([device, name]) => [name, device as DeviceKey])
);

/**
 * Geräte, die eine Buchung belegt: Website-Buchungen über inquiry_items,
 * ältere über product_type – plus Geräte, die als Extra gebucht wurden
 * (z. B. Audiogästebuch zur Fotobox).
 */
function devicesOfBooking(
  b: { id: string; product_type: string; inquiry_items: any },
  extraDevices: Map<string, DeviceKey[]>
): DeviceKey[] {
  const fromItems = (b.inquiry_items?.packages ?? [])
    .map((p: any) => p.product)
    .filter(Boolean) as DeviceKey[];
  const legacy = DEVICE_BY_PRODUCT_TYPE[b.product_type];
  const main = fromItems.length ? fromItems : legacy ? [legacy] : [];
  return Array.from(new Set([...main, ...(extraDevices.get(b.id) ?? [])]));
}

/**
 * Prüft, ob alle gewünschten Geräte im Zeitraum [start, start+days-1] noch
 * frei sind. Berücksichtigt Bestand (device_stock) und bestehende
 * reservierte/bestätigte Buchungen inkl. Mehrtages-Buchungen.
 */
export async function checkDeviceAvailability(
  devices: DeviceKey[],
  start: string,
  days: number,
  excludeBookingId?: string
): Promise<{ available: boolean; busy: DeviceKey[]; lastOne: DeviceKey[] }> {
  if (devices.length === 0) return { available: true, busy: [], lastOne: [] };
  const supabase = createAdminClient();
  const end = addDays(start, days - 1);
  // Mehrtages-Buchungen können bis zu 5 Tage vor "start" beginnen.
  const windowStart = addDays(start, -5);

  const [{ data: stock }, { data: bookings }] = await Promise.all([
    supabase.from("device_stock").select("device_key, total").in("device_key", devices),
    supabase
      .from("bookings")
      .select("id, event_date, event_days, product_type, inquiry_items, lifecycle")
      .in("lifecycle", BLOCKING_LIFECYCLES)
      .gte("event_date", windowStart)
      .lte("event_date", end),
  ]);

  const totals = new Map((stock ?? []).map((s) => [s.device_key as DeviceKey, s.total as number]));

  const extraDevices = new Map<string, DeviceKey[]>();
  const ids = (bookings ?? []).map((b) => b.id);
  if (ids.length) {
    const { data: be } = await supabase
      .from("booking_extras")
      .select("booking_id, extras(name)")
      .in("booking_id", ids);
    (be ?? []).forEach((row: any) => {
      const device = DEVICE_BY_EXTRA_NAME[row.extras?.name];
      if (device) extraDevices.set(row.booking_id, [...(extraDevices.get(row.booking_id) ?? []), device]);
    });
  }
  const busy: DeviceKey[] = [];
  // Geräte, von denen an mind. einem Tag nur noch eins frei ist (obwohl es mehrere gibt)
  const lastOne: DeviceKey[] = [];

  for (const device of devices) {
    const total = totals.get(device) ?? 1;
    let minFree = total;
    // Für jeden Tag im gewünschten Zeitraum die Belegung zählen.
    for (let i = 0; i < days; i++) {
      const day = addDays(start, i);
      const used = (bookings ?? []).filter((b) => {
        if (b.id === excludeBookingId) return false;
        const bStart = b.event_date as string;
        const bEnd = addDays(bStart, Math.max(1, b.event_days ?? 1) - 1);
        return day >= bStart && day <= bEnd && devicesOfBooking(b, extraDevices).includes(device);
      }).length;
      minFree = Math.min(minFree, total - used);
      if (used >= total) {
        busy.push(device);
        break;
      }
    }
    if (total > 1 && minFree === 1) lastOne.push(device);
  }
  return { available: busy.length === 0, busy, lastOne };
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // ohne 0/O/1/I

/** Zufälliger, nicht erratbarer Portal-Zugangscode, z. B. "EV-7K4P-9QX2". */
export function generateAccessCode(): string {
  const part = () => Array.from({ length: 4 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
  return `EV-${part()}-${part()}`;
}

async function generateBookingCode(): Promise<string> {
  const supabase = createAdminClient();
  const prefix = `FB-${new Date().getFullYear()}-`;
  const { data } = await supabase
    .from("bookings")
    .select("booking_code")
    .like("booking_code", `${prefix}%`)
    .order("booking_code", { ascending: false })
    .limit(1);
  const last = data?.[0]?.booking_code;
  const n = last ? parseInt(last.replace(prefix, ""), 10) : 0;
  return `${prefix}${String((Number.isFinite(n) ? n : 0) + 1).padStart(4, "0")}`;
}

export interface InquiryInput {
  customerType: "business" | "privat";
  occasion: string;
  packageIds: string[];
  extraIds: string[];
  days: number;
  eventDate: string;
  location: string;
  guestCount: number | null;
  duration: string | null;
  company: string | null;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  /** Zugang zum Aufstellort (nur bei Fotospiegel/Fotobox). */
  access?: AccessInfo | null;
  /** Gewünschte Abholung (nur bei Lieferung). */
  pickup?: PickupId | null;
  /** Herkunft der Anfrage (Statistik). */
  source?: Record<string, string> | null;
  layoutDraft: Record<string, unknown> | null;
  /** Vorschau-Grafik und Logo aus dem Layout-Designer (werden in den Speicher hochgeladen). */
  layoutFiles?: {
    image: { mime: string; bytes: Buffer } | null;
    logo: { mime: string; bytes: Buffer } | null;
    overlay?: { mime: string; bytes: Buffer } | null;
  } | null;
}

export interface InquiryResult {
  lifecycle: "reserviert" | "anfrage";
  shortNotice: boolean;
  bookingCode: string;
  accessCode: string | null;
  priced: PricedSelection;
  busy: DeviceKey[];
}

/**
 * Legt aus einer Website-Anfrage eine Buchung an. Ist alles frei, wird sie
 * "reserviert" und der Kunde erhält sofort seinen Portal-Zugang; sonst wird
 * sie als "anfrage" für den Admin gespeichert (ohne Portal-Zugang).
 */
export async function createBookingFromInquiry(input: InquiryInput): Promise<InquiryResult> {
  const supabase = createAdminClient();
  const isBusiness = input.customerType === "business";
  // Fahrtkosten serverseitig ermitteln (nie dem Browser vertrauen)
  const travel = await travelForAddress(input.location);
  const priced = priceSelection(input.packageIds, input.extraIds, input.days, isBusiness, input.access, { pickup: input.pickup, travel });
  const delivered = hasDelivery(priced.packages, input.extraIds);
  if (priced.packages.length === 0) throw new Error("no_packages");

  const devices = priced.packages.map((p) => p.product);
  const { available, busy } = await checkDeviceAvailability(devices, input.eventDate, priced.days);
  const shortNotice = daysUntil(input.eventDate) < MIN_LEAD_DAYS;
  const lifecycle = available && !shortNotice ? "reserviert" : "anfrage";

  const displayName = (isBusiness && input.company) || input.name;

  // Buchungscode ist fortlaufend – bei gleichzeitigen Anfragen ggf. erneut versuchen.
  let booking: { id: string; booking_code: string; access_code: string } | null = null;
  for (let attempt = 0; attempt < 3 && !booking; attempt++) {
    const bookingCode = await generateBookingCode();
    const { data, error } = await supabase
      .from("bookings")
      .insert({
        booking_code: bookingCode,
        couple_names: displayName,
        event_date: input.eventDate,
        product_type: PRODUCT_TYPE_BY_DEVICE[devices[0]],
        status: "offen",
        lifecycle,
        source: "website",
        premium_layout_included: priced.extras.some((e) => e.id === "premium-layout"),
        customer_type: input.customerType,
        customer_name: input.name,
        company: input.company,
        email: input.email,
        phone: input.phone,
        occasion: input.occasion,
        location: input.location,
        guest_count: input.guestCount,
        event_days: priced.days,
        inquiry_items: { ...priced, duration: input.duration, shortNotice, access: input.access ?? null, pickup: delivered ? input.pickup ?? null : null, travel: delivered ? travel : null, source: input.source ?? null },
        total_price: priced.total,
        inquiry_message: input.message,
        layout_draft: input.layoutDraft,
      })
      .select("id, booking_code, access_code")
      .single();
    if (!error && data) booking = data;
    else if (error?.code !== "23505") throw error ?? new Error("insert_failed");
  }
  if (!booking) throw new Error("booking_code_conflict");
  const accessCode = booking.access_code;

  // Layout-Entwurf (Grafik + Logo) sichern und Pfade am Entwurf vermerken
  if (input.layoutDraft && input.layoutFiles && (input.layoutFiles.image || input.layoutFiles.logo || input.layoutFiles.overlay)) {
    const paths = await storeLayoutDraftFiles(booking.id, input.layoutFiles);
    if (paths.imagePath || paths.logoPath || paths.overlayPath) {
      await supabase.from("bookings").update({ layout_draft: { ...input.layoutDraft, ...paths } }).eq("id", booking.id);
    }
  }

  // Passende Extras zusätzlich in booking_extras eintragen, damit sie im
  // Kundenbereich unter "Event Highlights" erscheinen (Variante wählt der
  // Kunde bzw. Admin später – wie bei "__pending__" im Admin-Formular).
  const dbNames = priced.extras
    .map((e) => EXTRAS.find((c) => c.id === e.id)?.dbExtraName)
    .filter((n): n is string => Boolean(n));
  if (dbNames.length) {
    const { data: dbExtras } = await supabase.from("extras").select("id, name").in("name", dbNames);
    const rows = (dbExtras ?? []).map((x) => {
      const cat = EXTRAS.find((c) => c.dbExtraName === x.name)!;
      return { booking_id: booking!.id, extra_id: x.id, variant_id: null, price: cat.price, added_by_admin: true };
    });
    if (rows.length) await supabase.from("booking_extras").insert(rows);
  }

  const summary = priced.packages.map((p) => p.name).join(", ");
  await logActivity(
    booking.id,
    "website_anfrage",
    lifecycle === "reserviert"
      ? `Neue Website-Reservierung: ${displayName} · ${summary} – bitte bestätigen`
      : busy.length
        ? `Neue Website-Anfrage (Termin belegt: ${busy.map((d) => PRODUCT_LABELS[d]).join(", ")}): ${displayName}`
        : `Neue kurzfristige Website-Anfrage (unter ${MIN_LEAD_DAYS} Tagen Vorlauf): ${displayName}`
  );

  const mailBooking: MailBooking = {
    booking_code: booking.booking_code,
    customer_type: input.customerType,
    access_code: accessCode,
    custom_login_code: null,
    customer_name: input.name,
    couple_names: displayName,
    event_date: input.eventDate,
    event_days: priced.days,
    location: input.location,
    occasion: input.occasion,
    total_price: priced.total,
    inquiry_items: priced,
  };

  if (lifecycle === "reserviert") {
    const m = reservationMail(mailBooking);
    await sendEmail({ to: input.email, ...m });
  } else {
    // Nicht automatisch reservierbar: Eingangsbestätigung, damit der Kunde weiß, dass wir uns melden
    const m = inquiryReceivedMail(mailBooking, busy.length ? "belegt" : "kurzfristig");
    await sendEmail({ to: input.email, ...m });
  }
  if (process.env.ADMIN_EMAIL) {
    const m = adminNotificationMail({
      ...mailBooking,
      email: input.email,
      phone: input.phone,
      company: input.company,
      lifecycle,
      inquiry_message: input.message,
      accessNote:
        [
          accessSummary(input.access)?.warn ? `Zugang: ${accessSummary(input.access)!.text}` : null,
          pickupSummary(priced && delivered ? input.pickup : null)?.night ? `Abholung: ${pickupSummary(input.pickup)!.text}` : null,
          delivered && travelSummary(travel)?.warn ? `Anfahrt: ${travelSummary(travel)!.text}` : null,
        ].filter(Boolean).join(" · ") || null,
      reason: lifecycle === "anfrage" ? (busy.length ? `Gerät belegt: ${busy.map((d) => PRODUCT_LABELS[d]).join(", ")}` : `Kurzfristig (unter ${MIN_LEAD_DAYS} Tagen)`) : null,
    });
    await sendEmail({ to: process.env.ADMIN_EMAIL, ...m });
  }

  return {
    lifecycle,
    shortNotice,
    bookingCode: booking.booking_code,
    // Zugang erst mit der Auftragsbestätigung
    accessCode: null,
    priced,
    busy,
  };
}
