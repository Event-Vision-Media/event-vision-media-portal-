"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminAuthenticated } from "@/lib/require-admin";
import { logActivity } from "@/lib/activity-log";
import { FULL_PAYMENT_DAYS } from "@/lib/contract";

const eur = (n: number) => n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });

/**
 * Zahlungsweise einer Buchung (nur Admin):
 * - "standard": Anzahlung (20 %) + Restbetrag
 * - "full7" / "full14": Gesamtbetrag auf einmal, so viele Tage vor der Veranstaltung
 * - "after7" / "after14": Rechnung nach der Veranstaltung, zahlbar in so vielen Tagen
 * - "deposit": individuelle Anzahlung (Betrag, optional schon bezahlt) – z. B. Bestandsbuchungen
 * Nur solange kein digitaler Vertrag unterschrieben und der Restbetrag nicht bezahlt ist; bei schon
 * erhaltener Anzahlung nur noch „individuelle Anzahlung“.
 */
export async function setPaymentTerms(
  bookingId: string,
  mode: string,
  deposit?: { amount: number; paid: boolean }
): Promise<{ success?: boolean; error?: string }> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  const isDeposit = mode === "deposit";
  const after = mode.startsWith("after");
  const days = mode === "standard" || isDeposit ? null : Number(mode.replace(/^(full|after)/, ""));
  if (!isDeposit && days !== null && !(FULL_PAYMENT_DAYS as readonly number[]).includes(days)) return { error: "Ungültige Auswahl." };
  const amount = isDeposit ? Math.round(Number(deposit?.amount) * 100) / 100 : null;
  if (isDeposit && (amount == null || !Number.isFinite(amount) || amount < 0 || amount > 20000)) return { error: "Bitte einen gültigen Anzahlungsbetrag eingeben." };

  const supabase = createAdminClient();
  const { data: b } = await supabase.from("bookings").select("inquiry_items, deposit_paid_at, rest_paid_at").eq("id", bookingId).maybeSingle();
  if (!b) return { error: "Buchung nicht gefunden." };
  if (b.rest_paid_at) return { error: "Der Restbetrag ist schon abgehakt – die Zahlungsweise lässt sich nicht mehr ändern." };
  if (b.deposit_paid_at && !isDeposit) return { error: "Die Anzahlung ist schon abgehakt – hier geht nur noch „Individuelle Anzahlung“." };
  const { count } = await supabase.from("booking_contracts").select("id", { count: "exact", head: true }).eq("booking_id", bookingId);
  if (count) return { error: "Der Mietvertrag ist schon unterschrieben – die Zahlungsbedingungen stehen darin fest." };

  const payment = isDeposit ? { deposit: amount! } : days ? { full: true, dueDays: days, ...(after ? { after: true } : {}) } : null;
  const patch: Record<string, unknown> = { inquiry_items: { ...(b.inquiry_items ?? {}), payment }, deposit_amount: isDeposit ? amount : null };
  if (isDeposit) patch.deposit_paid_at = deposit?.paid && amount! > 0 ? b.deposit_paid_at ?? new Date().toISOString() : null;
  const { error } = await supabase.from("bookings").update(patch).eq("id", bookingId);
  if (error) return { error: "Konnte nicht gespeichert werden." };
  await logActivity(
    bookingId,
    "zahlungsweise_geaendert",
    isDeposit ? `Zahlungsweise: individuelle Anzahlung ${eur(amount!)}${deposit?.paid && amount! > 0 ? " – bereits erhalten" : ""}`
      : !days ? "Zahlungsweise: Standard (Anzahlung + Restbetrag)"
      : after ? `Zahlungsweise: Rechnung nach der Veranstaltung, zahlbar innerhalb von ${days} Tagen (keine Anzahlung)`
      : `Zahlungsweise: Gesamtbetrag auf einmal, fällig ${days} Tage vor der Veranstaltung (keine Anzahlung)`
  );
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/zahlungen");
  return { success: true };
}
