"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminAuthenticated } from "@/lib/require-admin";
import { logActivity } from "@/lib/activity-log";
import { checkDeviceAvailability, createBookingFromInquiry, generateAccessCode, type InquiryInput } from "@/lib/inquiry-server";
import { isUniqueViolation } from "@/lib/supabase/errors";
import { confirmationMail, declineMail, sendEmail, type MailBooking } from "@/lib/email";
import { PACKAGES, PICKUP_OPTIONS, PRODUCT_LABELS, normalizeAccess, type DeviceKey, type PickupId } from "@/lib/catalog";

export interface InquiryActionResult {
  success?: boolean;
  error?: string;
  mailSent?: boolean;
}

function toMailBooking(b: any): MailBooking {
  return {
    booking_code: b.booking_code,
    customer_type: b.customer_type ?? null,
    access_code: b.access_code ?? null,
    custom_login_code: b.custom_login_code,
    customer_name: b.customer_name,
    couple_names: b.couple_names,
    event_date: b.event_date,
    event_days: b.event_days ?? 1,
    location: b.location,
    occasion: b.occasion,
    total_price: b.total_price,
    inquiry_items: b.inquiry_items,
  };
}

/**
 * Bestätigt eine Website-Reservierung bzw. -Anfrage: prüft die Verfügbarkeit
 * erneut, setzt lifecycle = bestaetigt und verschickt die Auftragsbestätigung
 * mit Portal-Zugang.
 */
export async function confirmInquiry(bookingId: string, force = false): Promise<InquiryActionResult> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  const supabase = createAdminClient();

  const { data: b } = await supabase.from("bookings").select("*").eq("id", bookingId).maybeSingle();
  if (!b) return { error: "Buchung nicht gefunden." };
  if (!["anfrage", "reserviert"].includes(b.lifecycle)) return { error: "Diese Anfrage wurde bereits bearbeitet." };

  if (!force) {
    const devices = ((b.inquiry_items?.packages ?? []) as { product: DeviceKey }[]).map((p) => p.product);
    const { available } = await checkDeviceAvailability(devices, b.event_date, b.event_days ?? 1, b.id);
    if (!available) {
      return { error: "Ein Gerät ist an diesem Termin bereits belegt. Trotzdem bestätigen?" };
    }
  }

  const { error } = await supabase
    .from("bookings")
    .update({ lifecycle: "bestaetigt", confirmed_at: new Date().toISOString() })
    .eq("id", bookingId);
  if (error) return { error: "Konnte nicht gespeichert werden." };

  // Bestätigung = Gegenzeichnung eines bereits unterschriebenen Mietvertrags
  await supabase
    .from("booking_contracts")
    .update({ countersigned_at: new Date().toISOString() })
    .eq("booking_id", bookingId)
    .is("countersigned_at", null);

  let mailSent = false;
  let mailId: string | undefined;
  if (b.email) {
    const m = confirmationMail(toMailBooking(b));
    const r = await sendEmail({ to: b.email, ...m });
    mailSent = r.sent;
    mailId = r.id;
  }
  await logActivity(bookingId, "anfrage_bestaetigt", `Buchung bestätigt${mailSent ? " – Auftragsbestätigung verschickt" : " (keine E-Mail verschickt)"}`);
  if (mailId) await logActivity(bookingId, "mail_bestaetigung", mailId);

  revalidatePath("/admin/anfragen");
  revalidatePath("/admin/dashboard");
  return { success: true, mailSent };
}

/** Lehnt eine Anfrage ab (optional mit freundlicher Absage-Mail). */
export async function declineInquiry(
  bookingId: string,
  sendMail: boolean,
  reason: string
): Promise<InquiryActionResult> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  const supabase = createAdminClient();

  const { data: b } = await supabase.from("bookings").select("*").eq("id", bookingId).maybeSingle();
  if (!b) return { error: "Buchung nicht gefunden." };
  if (!["anfrage", "reserviert"].includes(b.lifecycle)) return { error: "Diese Anfrage wurde bereits bearbeitet." };

  const { error } = await supabase
    .from("bookings")
    .update({ lifecycle: "abgelehnt", declined_at: new Date().toISOString() })
    .eq("id", bookingId);
  if (error) return { error: "Konnte nicht gespeichert werden." };

  let mailSent = false;
  if (sendMail && b.email) {
    const m = declineMail(toMailBooking(b), reason.trim().slice(0, 500) || null);
    mailSent = (await sendEmail({ to: b.email, ...m })).sent;
  }
  await logActivity(bookingId, "anfrage_abgelehnt", `Anfrage abgelehnt${mailSent ? " – Absage verschickt" : ""}`);

  revalidatePath("/admin/anfragen");
  return { success: true, mailSent };
}

/**
 * Erzeugt einen neuen Zugangscode für eine Buchung (z. B. wenn ein Code
 * weitergegeben wurde). Der alte Code funktioniert danach nicht mehr.
 */
export async function regenerateAccessCode(bookingId: string): Promise<InquiryActionResult & { code?: string }> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  const supabase = createAdminClient();
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateAccessCode();
    const { error } = await supabase.from("bookings").update({ access_code: code }).eq("id", bookingId);
    if (!error) {
      await logActivity(bookingId, "zugangscode_neu", "Neuer Zugangscode erzeugt");
      revalidatePath(`/admin/bookings/${bookingId}`);
      return { success: true, code };
    }
    if (!isUniqueViolation(error)) break;
  }
  return { error: "Zugangscode konnte nicht erzeugt werden." };
}

export interface AdminPackageBookingInput {
  customerType: "business" | "privat";
  company: string;
  name: string;
  email: string;
  phone: string;
  occasion: string;
  eventDate: string;
  days: number;
  location: string;
  guestCount: string;
  packageIds: string[];
  extraIds: string[];
  pickup: string;
  access: { level: string; help: string | null } | null;
  note: string;
}

/**
 * Admin legt eine Buchung mit Paket an (z. B. nach Telefonat) – sie läuft
 * danach genau wie eine Website-Anfrage: Preis, Mietvertrag, Kundenportal.
 * Mails gehen erst mit „Bestätigen“ unter Anfragen raus.
 */
export async function createAdminPackageBooking(raw: AdminPackageBookingInput): Promise<{ error?: string; bookingId?: string; lifecycle?: string; busy?: string[] }> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const customerType = raw.customerType === "business" ? "business" : "privat";
  const eventDate = str(raw.eventDate, 10);
  const packageIds = (Array.isArray(raw.packageIds) ? raw.packageIds : []).map((x) => str(x, 40)).slice(0, 6);
  const products = packageIds.map((id) => PACKAGES.find((p) => p.id === id)?.product).filter((p): p is DeviceKey => Boolean(p));
  const guests = Number(raw.guestCount);
  const input: InquiryInput = {
    customerType,
    occasion: str(raw.occasion, 80),
    packageIds,
    extraIds: (Array.isArray(raw.extraIds) ? raw.extraIds : []).map((x) => str(x, 40)).slice(0, 12),
    days: Number(raw.days) || 1,
    eventDate,
    location: str(raw.location, 200),
    guestCount: Number.isFinite(guests) && guests > 0 ? Math.min(Math.round(guests), 100000) : null,
    duration: null,
    company: customerType === "business" ? str(raw.company, 120) || null : null,
    name: str(raw.name, 120),
    email: str(raw.email, 200).toLowerCase(),
    phone: str(raw.phone, 40) || null,
    message: str(raw.note, 3000) || null,
    access: normalizeAccess(raw.access, products),
    pickup: PICKUP_OPTIONS.some((o) => o.id === raw.pickup) ? (raw.pickup as PickupId) : null,
    source: { source: "Admin", medium: "direkt angelegt" },
    layoutDraft: null,
  };

  if (!input.name) return { error: "Bitte den Namen angeben." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.email)) return { error: "Bitte eine gültige E-Mail-Adresse angeben." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return { error: "Bitte das Datum angeben." };
  if (!input.location) return { error: "Bitte die Adresse der Location angeben." };
  if (!products.length) return { error: "Bitte mindestens ein Paket wählen." };
  if (customerType === "business" && !input.company) return { error: "Bitte den Firmennamen angeben." };

  try {
    const r = await createBookingFromInquiry(input, { viaAdmin: true });
    revalidatePath("/admin/anfragen");
    revalidatePath("/admin/dashboard");
    return { bookingId: r.bookingId, lifecycle: r.lifecycle, busy: r.busy.map((d) => PRODUCT_LABELS[d]) };
  } catch (err: any) {
    if (err?.message === "no_packages") return { error: "Das gewählte Paket passt nicht zum Kundentyp." };
    console.error("[admin-buchung]", err);
    return { error: "Buchung konnte nicht angelegt werden." };
  }
}
