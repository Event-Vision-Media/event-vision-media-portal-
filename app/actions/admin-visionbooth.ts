"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminAuthenticated } from "@/lib/require-admin";
import { vbManageUrl, VB_BUCKET, VB_RETENTION_CHOICES } from "@/lib/visionbooth";
import { sendEmail, vbManageMail } from "@/lib/email";
import { VB_STYLES } from "@/lib/visionbooth-ai";
import { getTemplate } from "@/components/visionbooth/templates";
import { parseChallenges } from "@/components/visionbooth/challenges";
import { leadConfigFromForm } from "@/lib/visionbooth-leads";
import { addonPlanFor, getOccasion, getPlan, guessOccasion } from "@/components/visionbooth/packages";
import { berlinIso, provisionVbEvent } from "@/lib/visionbooth-provision";
import type { AdminActionResult } from "@/app/actions/admin";


const str = (f: FormData, k: string, max = 200) => String(f.get(k) ?? "").trim().slice(0, max);
const int = (f: FormData, k: string, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(f.get(k)));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

function paths(id?: string) {
  revalidatePath("/admin/visionbooth");
  if (id) revalidatePath(`/admin/visionbooth/${id}`);
}

export async function createVbEvent(_prev: AdminActionResult, formData: FormData): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  const plan = getPlan(str(formData, "plan", 20));
  const res = await provisionVbEvent({
    plan: plan.id,
    occasion: getOccasion(str(formData, "occasion", 20)).id,
    title: str(formData, "title", 120),
    frameText: str(formData, "frame_text", 60),
    eventDate: str(formData, "event_date", 10) || null,
    contactName: str(formData, "contact_name", 120),
    contactEmail: str(formData, "contact_email", 200),
    sendMail: formData.get("send_mail") === "on",
  });
  if ("error" in res) return { error: res.error };
  paths();
  redirect(`/admin/visionbooth/${res.id}`);
}

/** VisionBooth zu einer bestehenden Buchung anlegen – Anlass, Kunde und Datum kommen aus der Buchung. */
export async function createVbForBooking(bookingId: string, _prev: AdminActionResult, formData: FormData): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  const { data: b } = await createAdminClient()
    .from("bookings")
    .select("id, couple_names, customer_name, company, email, event_date, occasion, customer_type, event_days")
    .eq("id", bookingId)
    .maybeSingle();
  if (!b) return { error: "Buchung nicht gefunden." };
  const firma = b.customer_type === "business" || Boolean(b.company);
  const res = await provisionVbEvent({
    plan: getPlan(str(formData, "plan", 20) || addonPlanFor(firma)).id,
    occasion: getOccasion(str(formData, "occasion", 20) || guessOccasion(b.occasion, firma)).id,
    title: [b.occasion, b.company || b.couple_names || b.customer_name].filter(Boolean).join(" · ") || "VisionBooth",
    frameText: str(formData, "frame_text", 60) || b.company || b.couple_names || b.customer_name,
    eventDate: b.event_date,
    eventDays: b.event_days ?? 1,
    contactName: b.customer_name || b.couple_names,
    contactEmail: b.email,
    bookingId: b.id,
    sendMail: formData.get("send_mail") === "on",
  });
  if ("error" in res) return { error: res.error };
  revalidatePath(`/admin/bookings/${bookingId}`);
  paths(res.id);
  return { success: true };
}

export async function updateVbEvent(_prev: AdminActionResult, formData: FormData): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  const id = str(formData, "id", 40);
  const title = str(formData, "title", 120);
  if (!id || !title) return { error: "Bitte einen Namen angeben." };

  const supabase = createAdminClient();
  const opensDate = str(formData, "opens_date", 10);
  const closesDate = str(formData, "closes_date", 10);
  const accent = str(formData, "accent_color", 7);
  const styles = formData.getAll("ai_styles").map(String).filter((k) => VB_STYLES[k]);

  const patch: Record<string, unknown> = {
    title,
    event_date: str(formData, "event_date", 10) || null,
    package: ["privat", "business", "addon"].includes(str(formData, "package")) ? str(formData, "package") : "privat",
    status: ["entwurf", "aktiv", "beendet"].includes(str(formData, "status")) ? str(formData, "status") : "aktiv",
    contact_name: str(formData, "contact_name", 120) || null,
    contact_email: str(formData, "contact_email", 200).toLowerCase() || null,
    frame_text: str(formData, "frame_text", 60) || title,
    template: getTemplate(str(formData, "template", 40)).id,
    frame_subtext: str(formData, "frame_subtext", 60) || null,
    accent_color: /^#[0-9a-f]{6}$/i.test(accent) ? accent.toLowerCase() : "#c4933f",
    opens_at: opensDate ? berlinIso(opensDate, "00:00") : null,
    closes_at: closesDate ? berlinIso(closesDate, "23:59") : null,
    ai_enabled: formData.get("ai_enabled") === "on" && styles.length > 0,
    ai_styles: styles,
    ai_limit: int(formData, "ai_limit", 0, 5000, 0),
    ai_per_guest: int(formData, "ai_per_guest", 1, 20, 3),
    formats: (() => {
      const f = formData.getAll("formats").map(String).filter((x) => x === "einzel" || x === "streifen");
      return f.length ? f : ["einzel"];
    })(),
    retention_days: VB_RETENTION_CHOICES.includes(int(formData, "retention_days", 1, 365, 90)) ? int(formData, "retention_days", 1, 365, 90) : 90,
    wall_enabled: formData.get("wall_enabled") === "on",
    gallery_enabled: formData.get("gallery_enabled") === "on",
  };

  const logo = formData.get("logo") as File | null;
  if (logo && logo.size > 0) {
    if (logo.size > 5 * 1024 * 1024 || !["image/png", "image/jpeg", "image/webp"].includes(logo.type)) {
      return { error: "Logo bitte als PNG, JPG oder WebP bis 5 MB." };
    }
    const ext = logo.type === "image/png" ? "png" : logo.type === "image/webp" ? "webp" : "jpg";
    const path = `${id}/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(VB_BUCKET).upload(path, logo, { contentType: logo.type });
    if (error) return { error: "Logo-Upload fehlgeschlagen." };
    patch.logo_path = path;
  } else if (formData.get("remove_logo") === "on") {
    patch.logo_path = null;
  }

  const { error } = await supabase.from("vb_events").update(patch).eq("id", id);
  if (error) return { error: "Speichern fehlgeschlagen." };
  paths(id);
  return { success: true };
}

export async function setVbPhotoHidden(eventId: string, photoId: string, hidden: boolean): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  const { error } = await createAdminClient().from("vb_photos").update({ hidden }).eq("id", photoId).eq("event_id", eventId);
  if (error) return { error: "Ging nicht." };
  paths(eventId);
  return { success: true };
}

/** Event samt allen Fotos löschen (Speicher + Datenbank). */
export async function deleteVbEvent(eventId: string): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  const supabase = createAdminClient();
  const bucket = supabase.storage.from(VB_BUCKET);
  for (;;) {
    const { data } = await bucket.list(eventId, { limit: 1000 });
    if (!data?.length) break;
    const { error } = await bucket.remove(data.map((f) => `${eventId}/${f.name}`));
    if (error) return { error: "Fotos konnten nicht gelöscht werden." };
  }
  const { error } = await supabase.from("vb_events").delete().eq("id", eventId);
  if (error) return { error: "Löschen fehlgeschlagen." };
  paths();
  redirect("/admin/visionbooth");
}

/** Verwaltungs-Link per Mail an den Kunden schicken. */
export async function sendVbManageLink(eventId: string): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  const { data: e } = await createAdminClient().from("vb_events").select("*").eq("id", eventId).maybeSingle();
  if (!e) return { error: "Event nicht gefunden." };
  if (!e.contact_email) return { error: "Bitte zuerst die E-Mail des Kunden eintragen und speichern." };
  const mail = vbManageMail({ name: e.contact_name, title: e.frame_text || e.title, date: e.event_date, url: vbManageUrl(e.manage_token) });
  const r = await sendEmail({ to: e.contact_email, ...mail });
  if (!r.sent) return { error: "Mail konnte nicht verschickt werden." };
  return { success: true };
}

/** Foto-Missionen eines Events speichern (Admin). */
export async function updateVbChallengesAdmin(eventId: string, _prev: AdminActionResult, formData: FormData): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  let raw: unknown = [];
  try {
    raw = JSON.parse(String(formData.get("challenges") ?? "[]"));
  } catch {
    return { error: "Ungültige Eingabe." };
  }
  const { error } = await createAdminClient().from("vb_events").update({ challenges: parseChallenges(raw) }).eq("id", eventId);
  if (error) return { error: "Speichern fehlgeschlagen." };
  paths(eventId);
  return { success: true };
}

/** Kontaktformular eines Events speichern (Admin). */
export async function updateVbLeadsAdmin(eventId: string, _prev: AdminActionResult, formData: FormData): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  const { error } = await createAdminClient().from("vb_events").update({ leads: leadConfigFromForm(formData) }).eq("id", eventId);
  if (error) return { error: "Speichern fehlgeschlagen." };
  paths(eventId);
  return { success: true };
}
