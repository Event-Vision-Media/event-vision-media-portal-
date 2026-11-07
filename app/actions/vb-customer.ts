"use server";

import { parseWheel, WHEEL_MIN } from "@/components/visionbooth/wheel";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteVbPhoto, loadVbEventByToken, VB_BUCKET } from "@/lib/visionbooth";
import { getTemplate } from "@/components/visionbooth/templates";
import { parseChallenges } from "@/components/visionbooth/challenges";
import { leadConfigFromForm } from "@/lib/visionbooth-leads";
import { revealFromForm } from "@/lib/visionbooth-reveal";

// Aktionen im Kundenbereich (/vb/verwalten/<token>). Berechtigung = geheimer Verwaltungs-Link.
// Der Kunde darf Design, Texte, Logo, Formate und Galerie/Wand ändern und Fotos ausblenden –
// Zeitraum, Paket, KI-Kontingent und Löschfrist legt Event Vision Media fest.

export interface VbCustomerResult {
  success?: boolean;
  error?: string;
}

const str = (f: FormData, k: string, max = 200) => String(f.get(k) ?? "").trim().slice(0, max);

export async function updateVbDesign(token: string, _prev: VbCustomerResult, formData: FormData): Promise<VbCustomerResult> {
  const event = await loadVbEventByToken(token);
  if (!event) return { error: "Link ungültig." };
  if (event.photos_deleted_at) return { error: "Dieses Event ist abgeschlossen." };

  const accent = str(formData, "accent_color", 7);
  const formats = formData.getAll("formats").map(String).filter((x) => x === "einzel" || x === "streifen");
  const patch: Record<string, unknown> = {
    template: getTemplate(str(formData, "template", 40)).id,
    frame_text: str(formData, "frame_text", 60) || event.title,
    frame_subtext: str(formData, "frame_subtext", 60) || null,
    accent_color: /^#[0-9a-f]{6}$/i.test(accent) ? accent.toLowerCase() : event.accent_color,
    formats: formats.length ? formats : ["einzel"],
    gallery_enabled: formData.get("gallery_enabled") === "on",
    guest_uploads: formData.get("guest_uploads") === "on",
    wall_enabled: formData.get("wall_enabled") === "on",
  };

  const supabase = createAdminClient();
  const logo = formData.get("logo") as File | null;
  if (logo && logo.size > 0) {
    if (logo.size > 5 * 1024 * 1024 || !["image/png", "image/jpeg", "image/webp"].includes(logo.type)) {
      return { error: "Logo bitte als PNG, JPG oder WebP bis 5 MB." };
    }
    const ext = logo.type === "image/png" ? "png" : logo.type === "image/webp" ? "webp" : "jpg";
    const path = `${event.id}/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(VB_BUCKET).upload(path, logo, { contentType: logo.type });
    if (error) return { error: "Logo-Upload fehlgeschlagen." };
    patch.logo_path = path;
  } else if (formData.get("remove_logo") === "on") {
    patch.logo_path = null;
  }

  const { error } = await supabase.from("vb_events").update(patch).eq("id", event.id);
  if (error) return { error: "Speichern fehlgeschlagen." };
  revalidatePath(`/vb/verwalten/${token}`);
  return { success: true };
}

export async function setVbPhotoHiddenByCustomer(token: string, photoId: string, hidden: boolean): Promise<VbCustomerResult> {
  const event = await loadVbEventByToken(token);
  if (!event) return { error: "Link ungültig." };
  const { error } = await createAdminClient().from("vb_photos").update({ hidden }).eq("id", photoId).eq("event_id", event.id);
  if (error) return { error: "Ging nicht." };
  revalidatePath(`/vb/verwalten/${token}`);
  return { success: true };
}

/** Foto-Missionen speichern (Liste als JSON aus dem Editor). */
export async function updateVbChallenges(token: string, _prev: VbCustomerResult, formData: FormData): Promise<VbCustomerResult> {
  const event = await loadVbEventByToken(token);
  if (!event) return { error: "Link ungültig." };
  if (event.photos_deleted_at) return { error: "Dieses Event ist abgeschlossen." };
  let raw: unknown = [];
  try {
    raw = JSON.parse(String(formData.get("challenges") ?? "[]"));
  } catch {
    return { error: "Ungültige Eingabe." };
  }
  const { error } = await createAdminClient().from("vb_events").update({ challenges: parseChallenges(raw) }).eq("id", event.id);
  if (error) return { error: "Speichern fehlgeschlagen." };
  revalidatePath(`/vb/verwalten/${token}`);
  return { success: true };
}

/** Foto-Glücksrad ein-/ausschalten und Aufgaben anpassen. */
export async function updateVbWheel(token: string, _prev: VbCustomerResult, formData: FormData): Promise<VbCustomerResult> {
  const event = await loadVbEventByToken(token);
  if (!event) return { error: "Link ungültig." };
  if (event.photos_deleted_at) return { error: "Dieses Event ist abgeschlossen." };
  let raw: unknown = [];
  try {
    raw = JSON.parse(String(formData.get("wheel_items") ?? "[]"));
  } catch {
    return { error: "Ungültige Eingabe." };
  }
  const enabled = formData.get("wheel_enabled") === "on";
  const cfg = parseWheel({ enabled, items: raw });
  if (enabled && !cfg.enabled) return { error: `Bitte mindestens ${WHEEL_MIN} Aufgaben eintragen.` };
  const { error } = await createAdminClient().from("vb_events").update({ wheel: { enabled: cfg.enabled, items: cfg.items } }).eq("id", event.id);
  if (error) return { error: "Speichern fehlgeschlagen." };
  revalidatePath(`/vb/verwalten/${token}`);
  return { success: true };
}

/** Gästebuch-Grüße ein-/ausschalten. */
export async function updateVbGuestbook(token: string, _prev: VbCustomerResult, formData: FormData): Promise<VbCustomerResult> {
  const event = await loadVbEventByToken(token);
  if (!event) return { error: "Link ungültig." };
  if (event.photos_deleted_at) return { error: "Dieses Event ist abgeschlossen." };
  const { error } = await createAdminClient().from("vb_events").update({ guestbook: formData.get("guestbook_enabled") === "on" }).eq("id", event.id);
  if (error) return { error: "Speichern fehlgeschlagen." };
  revalidatePath(`/vb/verwalten/${token}`);
  return { success: true };
}

/** Kontaktformular (Firmen-Events) ein-/ausschalten und Texte anpassen. */
export async function updateVbLeads(token: string, _prev: VbCustomerResult, formData: FormData): Promise<VbCustomerResult> {
  const event = await loadVbEventByToken(token);
  if (!event) return { error: "Link ungültig." };
  if (event.photos_deleted_at) return { error: "Dieses Event ist abgeschlossen." };
  const { error } = await createAdminClient().from("vb_events").update({ leads: leadConfigFromForm(formData) }).eq("id", event.id);
  if (error) return { error: "Speichern fehlgeschlagen." };
  revalidatePath(`/vb/verwalten/${token}`);
  return { success: true };
}

/** Tippspiel (Gender Reveal) einstellen oder auflösen. */
export async function updateVbReveal(token: string, _prev: VbCustomerResult, formData: FormData): Promise<VbCustomerResult> {
  const event = await loadVbEventByToken(token);
  if (!event) return { error: "Link ungültig." };
  if (event.photos_deleted_at) return { error: "Dieses Event ist abgeschlossen." };
  const { error } = await createAdminClient().from("vb_events").update({ reveal: revealFromForm(event.reveal, formData) }).eq("id", event.id);
  if (error) return { error: "Speichern fehlgeschlagen." };
  revalidatePath(`/vb/verwalten/${token}`);
  return { success: true };
}

/** Foto endgültig löschen (Gastgeber). */
export async function deleteVbPhotoByCustomer(token: string, photoId: string): Promise<VbCustomerResult> {
  const event = await loadVbEventByToken(token);
  if (!event) return { error: "Link ungültig." };
  if (!(await deleteVbPhoto(event.id, photoId))) return { error: "Löschen fehlgeschlagen." };
  revalidatePath(`/vb/verwalten/${token}`);
  return { success: true };
}
