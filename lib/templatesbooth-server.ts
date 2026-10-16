import "server-only";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity-log";
import { TB_LAYOUT_NAME, extractFields } from "@/lib/templatesbooth";

export interface TemplateSubmission {
  id: string;
  booking_id: string | null;
  matched_by: string | null;
  customer_name: string | null;
  email: string | null;
  event_date: string | null;
  design_name: string | null;
  preview_url: string | null;
  received_at: string;
}

export const SUBMISSION_COLUMNS = "id, booking_id, matched_by, customer_name, email, event_date, design_name, preview_url, received_at";

const OPEN_LIFECYCLES = ["anfrage", "reserviert", "bestaetigt"];

/** Sucht die passende Buchung: Buchungscode im Text, sonst eindeutig per E-Mail (+ Eventdatum). */
async function findBooking(f: ReturnType<typeof extractFields>): Promise<{ id: string; by: string } | null> {
  const supabase = createAdminClient();
  if (f.bookingCode) {
    const { data } = await supabase.from("bookings").select("id").ilike("booking_code", f.bookingCode).maybeSingle();
    if (data) return { id: data.id, by: "code" };
  }
  if (!f.email) return null;
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("bookings")
    .select("id, event_date")
    .ilike("email", f.email.replace(/[\\%_]/g, (c) => `\\${c}`))
    .in("lifecycle", OPEN_LIFECYCLES)
    .gte("event_date", today);
  const list = data ?? [];
  const sameDay = f.eventDate ? list.filter((b) => b.event_date === f.eventDate) : [];
  if (sameDay.length === 1) return { id: sameDay[0].id, by: "email" };
  if (list.length === 1) return { id: list[0].id, by: "email" };
  return null;
}

/** Hinterlegt das Design an der Buchung: Platzhalter-Layout (Premium) + Eintrag im Aktivitätsprotokoll. */
export async function applySubmissionToBooking(bookingId: string, designName: string | null): Promise<void> {
  const supabase = createAdminClient();
  const [{ data: layout }, { data: booking }] = await Promise.all([
    supabase.from("layouts").select("id").eq("name", TB_LAYOUT_NAME).maybeSingle(),
    supabase.from("bookings").select("couple_names").eq("id", bookingId).maybeSingle(),
  ]);
  if (layout) {
    await supabase
      .from("bookings")
      .update({ selected_layout_id: layout.id, is_premium_selected: true, status: "personalisierung_komplett" })
      .eq("id", bookingId);
  }
  await logActivity(
    bookingId,
    "layout_personalized",
    `${booking?.couple_names ?? "Kunde"} hat ein Premium-Design über TemplatesBooth abgeschickt${designName ? `: ${designName}` : ""}.`
  );
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/layout");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/layout-freigaben");
}

/**
 * Speichert eine Webhook-Einsendung (request.created / request.status_changed).
 * Dieselbe Einsendung (gleiche ID) wird aktualisiert, nicht doppelt angelegt.
 */
export async function storeSubmission(payload: unknown, event: string | null): Promise<{ id: string; bookingId: string | null }> {
  const supabase = createAdminClient();
  const f = extractFields(payload);

  const { data: existing } = f.externalId
    ? await supabase.from("template_submissions").select("id, booking_id").eq("external_id", f.externalId).maybeSingle()
    : { data: null };

  const fields = {
    customer_name: f.name,
    email: f.email,
    event_date: f.eventDate,
    design_name: f.designName,
    preview_url: f.previewUrl,
    last_event: event,
    payload,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    await supabase.from("template_submissions").update(fields).eq("id", existing.id);
    if (existing.booking_id) return { id: existing.id, bookingId: existing.booking_id };
  }

  const match = await findBooking(f);
  let id = existing?.id as string | undefined;
  if (!id) {
    const { data, error } = await supabase
      .from("template_submissions")
      .insert({ ...fields, external_id: f.externalId, booking_id: match?.id ?? null, matched_by: match?.by ?? null })
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message ?? "insert failed");
    id = data.id as string;
  } else if (match) {
    await supabase.from("template_submissions").update({ booking_id: match.id, matched_by: match.by }).eq("id", id);
  }

  if (match) await applySubmissionToBooking(match.id, f.designName);
  else revalidatePath("/admin/layout-freigaben");
  return { id: id!, bookingId: match?.id ?? null };
}
