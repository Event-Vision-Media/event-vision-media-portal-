"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomInt } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminAuthenticated } from "@/lib/require-admin";
import { VB_BUCKET } from "@/lib/visionbooth";
import { VB_STYLES } from "@/lib/visionbooth-ai";
import type { AdminActionResult } from "@/app/actions/admin";

/** Gut lesbar, nicht erratbar: ohne 0/o/1/l/i. */
const SLUG_CHARS = "abcdefghjkmnpqrstuvwxyz23456789";
const newSlug = () => Array.from({ length: 7 }, () => SLUG_CHARS[randomInt(SLUG_CHARS.length)]).join("");

/** "2026-11-14" + "18:00" (Berlin) → ISO-Zeitpunkt. */
function berlinIso(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const guess = new Date(`${date}T${time}:00Z`);
  const berlin = new Date(guess.toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
  const utc = new Date(guess.toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(guess.getTime() - (berlin.getTime() - utc.getTime())).toISOString();
}

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
  const title = str(formData, "title", 120);
  if (!title) return { error: "Bitte einen Namen für das Event angeben." };
  const eventDate = str(formData, "event_date", 10) || null;
  const pkg = ["privat", "business", "addon"].includes(str(formData, "package")) ? str(formData, "package") : "privat";

  const supabase = createAdminClient();
  let id: string | null = null;
  for (let i = 0; i < 5 && !id; i++) {
    const { data, error } = await supabase
      .from("vb_events")
      .insert({
        slug: newSlug(),
        title,
        event_date: eventDate,
        package: pkg,
        frame_text: str(formData, "frame_text", 60) || title,
        contact_name: str(formData, "contact_name", 120) || null,
        contact_email: str(formData, "contact_email", 200).toLowerCase() || null,
        // Standard: Gäste-Link ab Event-Tag bis 14 Tage danach
        opens_at: eventDate ? berlinIso(eventDate, "00:00") : null,
        closes_at: eventDate ? berlinIso(new Date(Date.parse(eventDate) + 14 * 864e5).toISOString().slice(0, 10), "23:59") : null,
        ai_enabled: pkg !== "privat",
        ai_styles: ["glamour", "superheld", "animation", "comic"],
        ai_limit: pkg === "business" ? 300 : pkg === "addon" ? 150 : 0,
      })
      .select("id")
      .single();
    if (data) id = data.id;
    else if (error && error.code !== "23505") return { error: "Event konnte nicht angelegt werden." };
  }
  if (!id) return { error: "Event konnte nicht angelegt werden." };
  paths();
  redirect(`/admin/visionbooth/${id}`);
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
    frame_style: ["gold", "weiss", "schwarz", "ohne"].includes(str(formData, "frame_style")) ? str(formData, "frame_style") : "gold",
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
