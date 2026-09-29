"use server";

import { planSlots, slotText, validateSlots } from "@/lib/slots";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCurrentBooking } from "@/lib/booking-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminAuthenticated } from "@/lib/require-admin";
import { logActivity } from "@/lib/activity-log";
import { BANK_SETTING_KEYS, buildContractFor, getLatestContract, sha256 } from "@/lib/contract-server";
import { contractRequired, contractToHtml, type ContractDoc, type RenterDetails } from "@/lib/contract";
import { contractAdminMail, contractSignedMail, sendEmail, type MailBooking } from "@/lib/email";
import { formatDateTimeGerman } from "@/lib/format";
import type { Booking } from "@/lib/types";

export interface ContractActionResult {
  success?: boolean;
  error?: string;
}

const MAX_SIGNATURE_LENGTH = 400_000;

function field(formData: FormData, name: string, max = 200): string {
  return String(formData.get(name) ?? "").trim().slice(0, max);
}

function toMailBooking(b: Booking): MailBooking {
  return {
    booking_code: b.booking_code,
    customer_type: b.customer_type,
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

function contractToText(doc: ContractDoc): string {
  const lines = doc.lines.map((l) => `- ${l.name}: ${l.price}`).join("\n");
  const block = (b: ContractDoc["sections"][number]["blocks"][number]) => ("p" in b ? b.p : b.ul.map((li) => `  • ${li}`).join("\n"));
  const sections = doc.sections.map((s, i) => `§ ${i + 1} ${s.title}\n${s.blocks.map(block).join("\n")}`).join("\n\n");
  const withdrawal = (doc.withdrawal ?? []).map((s) => `${s.title}\n${s.blocks.map(block).join("\n")}`).join("\n\n");
  return `${doc.title} (${doc.bookingCode})\n\nVermieter: ${doc.landlord.join(", ")}\nMieter: ${doc.renter.join(", ")}\n\n${lines}\nGesamtpreis: ${doc.total} · Anzahlung: ${doc.deposit}\n${doc.taxNote}\n\n${sections}${withdrawal ? `\n\n${withdrawal}` : ""}`;
}

/** Kunde unterschreibt den Mietvertrag im Kundenportal. */
export async function signContract(_prev: ContractActionResult, formData: FormData): Promise<ContractActionResult> {
  const booking = await getCurrentBooking();
  if (!booking) return { error: "Bitte melde dich erneut an." };
  const sie = booking.customer_type === "business";

  if (!contractRequired(booking)) return { error: "Für diese Buchung ist kein digitaler Vertrag vorgesehen." };
  if (await getLatestContract(booking.id)) {
    return { error: sie ? "Der Vertrag wurde bereits unterschrieben." : "Du hast den Vertrag bereits unterschrieben." };
  }

  const renter: RenterDetails = {
    renter_name: field(formData, "renter_name"),
    renter_company: field(formData, "renter_company") || null,
    renter_street: field(formData, "renter_street"),
    renter_zip_city: field(formData, "renter_zip_city"),
    location_name: field(formData, "location_name") || null,
    location_street: field(formData, "location_street") || null,
    location_zip_city: field(formData, "location_zip_city") || null,
    onsite_contact_name: field(formData, "onsite_contact_name") || null,
    onsite_contact_phone: field(formData, "onsite_contact_phone", 40) || null,
    handover_window: null,
    return_window: null,
    reference_consent: formData.get("reference_consent") === "on",
    // Firmen zahlen per Überweisung; Privatkunden wählen
    rest_payment_method: sie ? "ueberweisung" : formData.get("rest_payment_method") === "bar" ? "bar" : "ueberweisung",
    billing: sie
      ? {
          address: field(formData, "billing_address", 300) || null,
          email: field(formData, "billing_email", 200) || null,
          poNumber: field(formData, "po_number", 80) || null,
          costCenter: field(formData, "cost_center", 80) || null,
        }
      : null,
  };
  // Zeitfenster: feste Auswahl → prüfen → als Text in den Vertrag
  const slot = (k: "handover" | "return") => ({ date: field(formData, `${k}_date`, 10), from: field(formData, `${k}_from`, 5), to: field(formData, `${k}_to`, 5) });
  const plan = planSlots({ ...booking, pickup: booking.inquiry_items?.pickup ?? null, delivered: (await buildContractFor(booking)).hasDelivery });
  const hSlot = slot("handover"), rSlot = slot("return");
  const slotError = validateSlots(plan, hSlot, rSlot, sie);
  if (slotError) return { error: slotError };
  renter.handover_window = slotText(hSlot);
  renter.return_window = slotText(rSlot);

  const signerName = field(formData, "signer_name");
  const signature = String(formData.get("signature") ?? "");

  if (!renter.renter_name || !renter.renter_street || !renter.renter_zip_city) {
    return { error: sie ? "Bitte vervollständigen Sie Name und Anschrift." : "Bitte gib deinen Namen und deine Anschrift vollständig an." };
  }
  if (!renter.location_street || !renter.location_zip_city) {
    return { error: sie ? "Bitte geben Sie die Adresse der Location an." : "Bitte gib die Adresse der Location an." };
  }
  if (formData.get("location_confirmed") !== "on" || formData.get("accept") !== "on") {
    return { error: sie ? "Bitte bestätigen Sie die Pflichtangaben." : "Bitte bestätige die Pflichtangaben." };
  }
  if (booking.inquiry_items?.access?.help === "helfer" && formData.get("carry_helper") !== "on") {
    return { error: sie ? "Bitte bestätigen Sie, dass eine Tragehilfe vor Ort ist." : "Bitte bestätige, dass eine Tragehilfe vor Ort ist." };
  }
  const isConsumer = !sie;
  if (isConsumer && formData.get("withdrawal_ack") !== "on") {
    return { error: "Bitte bestätige den Erhalt der Widerrufsbelehrung." };
  }
  if (!sie && !["bar", "ueberweisung"].includes(String(formData.get("rest_payment_method")))) {
    return { error: "Bitte wählt aus, wie ihr den Restbetrag zahlen möchtet." };
  }
  if (!signerName) return { error: sie ? "Bitte geben Sie Ihren Namen zur Unterschrift ein." : "Bitte gib deinen Namen zur Unterschrift ein." };
  if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(signature) || signature.length < 2_000 || signature.length > MAX_SIGNATURE_LENGTH) {
    return { error: sie ? "Bitte unterschreiben Sie im Unterschriftsfeld." : "Bitte unterschreib im Unterschriftsfeld." };
  }

  // Rechnungsangaben stehen im Vertrags-Snapshot, nicht in eigenen Spalten
  const { billing: _billing, ...renterColumns } = renter;

  // Vertragstext serverseitig neu erzeugen (nicht aus dem Browser übernehmen)
  const doc = await buildContractFor(booking, renter);
  const h = headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || null;

  const supabase = createAdminClient();
  const signedAt = new Date().toISOString();
  const { error } = await supabase.from("booking_contracts").insert({
    booking_id: booking.id,
    template_version: doc.version,
    snapshot: doc,
    snapshot_sha256: sha256(doc),
    ...renterColumns,
    location_confirmed: true,
    withdrawal_ack: isConsumer,
    early_start_requested: isConsumer && formData.get("early_start") === "on",
    signer_name: signerName,
    signature_png: signature,
    signed_at: signedAt,
    // Die Buchung ist bereits bestätigt – mit der Unterschrift ist der Vertrag geschlossen
    countersigned_at: booking.lifecycle === "bestaetigt" ? signedAt : null,
    signed_ip: ip,
    signed_user_agent: (h.get("user-agent") ?? "").slice(0, 300) || null,
  });
  if (error) {
    console.error("[contract] insert failed", error);
    return { error: "Der Vertrag konnte nicht gespeichert werden. Bitte versuche es erneut." };
  }

  // Leere Buchungsfelder mit den Vertragsangaben ergänzen (überschreibt nichts)
  const patch: Record<string, string | number> = { rest_payment_method: renter.rest_payment_method! };
  if (doc.depositAmount != null) patch.deposit_amount = doc.depositAmount;
  const locationLine = [renter.location_name, renter.location_street, renter.location_zip_city].filter(Boolean).join(", ");
  if (!booking.location && locationLine) patch.location = locationLine;
  if (!booking.delivery_contact_name && renter.onsite_contact_name) patch.delivery_contact_name = renter.onsite_contact_name;
  if (!booking.delivery_contact_phone && renter.onsite_contact_phone) patch.delivery_contact_phone = renter.onsite_contact_phone;
  await supabase.from("bookings").update(patch).eq("id", booking.id);

  await logActivity(booking.id, "vertrag_unterschrieben", `Mietvertrag digital unterschrieben von ${signerName}`);

  const mb = toMailBooking(booking);
  if (booking.email) {
    const html = contractToHtml(doc, { signer: signerName, signedAt: formatDateTimeGerman(signedAt) });
    await sendEmail({ to: booking.email, ...contractSignedMail(mb, html, contractToText(doc)) });
  }
  if (process.env.ADMIN_EMAIL) {
    await sendEmail({ to: process.env.ADMIN_EMAIL, ...contractAdminMail(mb, signerName), replyTo: booking.email ?? undefined });
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/vertrag");
  return { success: true };
}

/** Admin zeichnet den zuletzt unterschriebenen Vertrag gegen. */
export async function countersignContract(bookingId: string): Promise<ContractActionResult> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  const latest = await getLatestContract(bookingId);
  if (!latest) return { error: "Noch kein unterschriebener Vertrag vorhanden." };
  if (latest.countersigned_at) return { success: true };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("booking_contracts")
    .update({ countersigned_at: new Date().toISOString() })
    .eq("id", latest.id);
  if (error) return { error: "Konnte nicht gespeichert werden." };

  await logActivity(bookingId, "vertrag_gegengezeichnet", "Mietvertrag gegengezeichnet");
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/anfragen");
  return { success: true };
}

function validIban(iban: string): boolean {
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const digits = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rest = 0;
  for (const d of digits) rest = (rest * 10 + Number(d)) % 97;
  return rest === 1;
}

/** Admin: Bankverbindung für Mietverträge speichern (app_settings). */
export async function updateBankDetails(_prev: ContractActionResult, formData: FormData): Promise<ContractActionResult> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  const iban = field(formData, "iban", 50).replace(/\s+/g, "").toUpperCase();
  if (iban && !validIban(iban)) return { error: "Die IBAN ist ungültig – bitte prüfen." };
  const values: Record<string, string | null> = {
    [BANK_SETTING_KEYS.holder]: field(formData, "holder") || null,
    [BANK_SETTING_KEYS.iban]: iban ? iban.replace(/(.{4})/g, "$1 ").trim() : null,
    [BANK_SETTING_KEYS.bic]: field(formData, "bic", 20).toUpperCase() || null,
    [BANK_SETTING_KEYS.bank]: field(formData, "bank") || null,
  };
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("app_settings")
    .upsert(Object.entries(values).map(([key, value]) => ({ key, value, updated_at: now })), { onConflict: "key" });
  if (error) return { error: "Konnte nicht gespeichert werden." };
  revalidatePath("/admin/settings");
  return { success: true };
}
