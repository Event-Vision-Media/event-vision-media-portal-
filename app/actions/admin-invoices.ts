"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminAuthenticated } from "@/lib/require-admin";
import { sendEmail, invoiceMail, type MailBooking } from "@/lib/email";
import { logActivity } from "@/lib/activity-log";
import { getPaymentSummary } from "@/lib/payments";
import { formatDateGerman } from "@/lib/format";
import { INVOICE_BUCKET, INVOICE_MAX_BYTES, invoiceTitle, type InvoiceKind } from "@/lib/invoices";
import type { AdminActionResult } from "@/app/actions/admin";
import type { Booking } from "@/lib/types";

const KINDS: InvoiceKind[] = ["anzahlung", "rest", "gesamt", "sonstige"];

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

function revalidate(bookingId: string) {
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/zahlungen");
  revalidatePath("/dashboard");
}

async function ensureBucket() {
  const supabase = createAdminClient();
  const { data } = await supabase.storage.getBucket(INVOICE_BUCKET);
  if (!data) await supabase.storage.createBucket(INVOICE_BUCKET, { public: false, fileSizeLimit: "10MB", allowedMimeTypes: ["application/pdf"] });
}

/** Rechnung (PDF aus Lexware) ablegen und auf Wunsch direkt per E-Mail an den Kunden schicken. */
export async function uploadInvoice(bookingId: string, _prev: AdminActionResult, formData: FormData): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };

  const kind = String(formData.get("kind") ?? "") as InvoiceKind;
  const number = String(formData.get("invoice_number") ?? "").trim() || null;
  const amountRaw = String(formData.get("amount") ?? "").trim().replace(",", ".");
  const amount = amountRaw ? Number(amountRaw) : null;
  const send = formData.get("send") === "on";
  const file = formData.get("file") as File | null;

  if (!KINDS.includes(kind)) return { error: "Bitte die Art der Rechnung wählen." };
  if (amount != null && (!Number.isFinite(amount) || amount < 0)) return { error: "Bitte einen gültigen Betrag eingeben." };
  if (!file || file.size === 0) return { error: "Bitte das Rechnungs-PDF auswählen." };
  if (file.size > INVOICE_MAX_BYTES) return { error: "Die Datei ist größer als 4 MB." };
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.subarray(0, 5).toString() !== "%PDF-") return { error: "Bitte eine PDF-Datei hochladen." };

  const supabase = createAdminClient();
  const { data: booking } = await supabase.from("bookings").select("*").eq("id", bookingId).maybeSingle();
  if (!booking) return { error: "Buchung nicht gefunden." };

  await ensureBucket();
  const path = `${bookingId}/${randomUUID()}.pdf`;
  const { error: upErr } = await supabase.storage.from(INVOICE_BUCKET).upload(path, bytes, { contentType: "application/pdf" });
  if (upErr) return { error: "Upload fehlgeschlagen. Bitte erneut versuchen." };

  const fileName = file.name.toLowerCase().endsWith(".pdf") ? file.name : `${file.name}.pdf`;
  const { data: row, error: insErr } = await supabase
    .from("booking_invoices")
    .insert({ booking_id: bookingId, kind, invoice_number: number, amount, file_path: path, file_name: fileName })
    .select("id")
    .single();
  if (insErr || !row) {
    await supabase.storage.from(INVOICE_BUCKET).remove([path]);
    return { error: "Die Rechnung konnte nicht gespeichert werden." };
  }

  const title = invoiceTitle({ kind, invoice_number: number });
  let mailNote = "";
  if (send) {
    const b = booking as Booking;
    if (!b.email) {
      mailNote = " – keine E-Mail-Adresse hinterlegt, nur im Portal abgelegt";
    } else {
      const p = await getPaymentSummary(b);
      const paid = kind === "anzahlung" ? p.depositPaid && p.deposit !== 0 : p.restPaid;
      const pay =
        paid ? "bezahlt"
        : kind !== "anzahlung" && p.method === "bar" ? (p.pickupOnly ? "bar_abholung" : "bar_lieferung")
        : "ueberweisung";
      const dueText =
        kind === "anzahlung" ? "innerhalb von 7 Tagen"
        : kind === "rest" || kind === "gesamt" ? `bis zum ${formatDateGerman(p.restDueDate)}`
        : null;
      const mail = invoiceMail(toMailBooking(b), { title, amount, pay, dueText, bank: p.bank });
      const res = await sendEmail({ to: b.email, ...mail, attachments: [{ filename: fileName, content: bytes.toString("base64") }] });
      if (res.sent) await supabase.from("booking_invoices").update({ emailed_at: new Date().toISOString() }).eq("id", row.id);
      else mailNote = " – E-Mail konnte nicht verschickt werden, liegt aber im Portal";
    }
  }

  await logActivity(bookingId, "rechnung", `${title} hochgeladen${send && !mailNote ? " und per E-Mail verschickt" : ""}${mailNote}.`);
  revalidate(bookingId);
  return mailNote ? { error: `Gespeichert${mailNote}.` } : { success: true };
}

/** Falsch hochgeladene Rechnung wieder entfernen (Datei + Eintrag). */
export async function deleteInvoice(invoiceId: string): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  const supabase = createAdminClient();
  const { data } = await supabase.from("booking_invoices").select("booking_id, file_path").eq("id", invoiceId).maybeSingle();
  if (!data) return { error: "Rechnung nicht gefunden." };
  await supabase.storage.from(INVOICE_BUCKET).remove([data.file_path]);
  await supabase.from("booking_invoices").delete().eq("id", invoiceId);
  revalidate(data.booking_id);
  return { success: true };
}
