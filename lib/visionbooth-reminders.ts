import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, vbAfterMail, vbBeforeMail, vbDeletionMail, type VbHighlights } from "@/lib/email";
import { vbBoard } from "@/lib/visionbooth-board";
import { vbDeleteAfter, vbGuestUrl, vbManageUrl, VB_BUCKET, type VbEvent } from "@/lib/visionbooth";

// Erinnerungs-Mails an den Gastgeber (täglicher Cron): je Event höchstens einmal pro Art.
//   vorher    – 1–7 Tage vor dem Event (nicht, wenn erst in den letzten 2 Tagen gebucht)
//   danach    – 1–3 Tage nach dem Event, nur wenn es Fotos gibt
//   loeschung – 1–7 Tage vor der automatischen Löschung, nur wenn es Fotos gibt

type Kind = "vorher" | "danach" | "loeschung";
const DAY = 864e5;
const berlinToday = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
const dayDiff = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / DAY);

export async function runVbReminders(dryRun = false): Promise<{ event: string; kind: Kind; to: string; sent: boolean }[]> {
  const supabase = createAdminClient();
  const today = berlinToday();
  const { data } = await supabase
    .from("vb_events")
    .select("*")
    .not("contact_email", "is", null)
    .is("photos_deleted_at", null)
    .neq("status", "entwurf")
    .not("event_date", "is", null)
    .limit(500);
  const out: { event: string; kind: Kind; to: string; sent: boolean }[] = [];

  for (const e of (data ?? []) as (VbEvent & { reminders: Record<string, string> | null })[]) {
    const sent = e.reminders ?? {};
    const untilEvent = dayDiff(today, e.event_date!);
    const deleteDate = vbDeleteAfter(e).toISOString().slice(0, 10);
    const untilDelete = dayDiff(today, deleteDate);
    const title = e.frame_text || e.title;
    const guest = vbGuestUrl(e.slug);

    let kind: Kind | null = null;
    if (!sent.vorher && untilEvent >= 1 && untilEvent <= 7 && Date.parse(e.created_at) < Date.now() - 2 * DAY) kind = "vorher";
    else if (!sent.danach && untilEvent <= -1 && untilEvent >= -3) kind = "danach";
    else if (!sent.loeschung && untilDelete >= 1 && untilDelete <= 7) kind = "loeschung";
    if (!kind) continue;

    let photos = 0;
    if (kind !== "vorher") {
      const { count } = await supabase.from("vb_photos").select("id", { count: "exact", head: true }).eq("event_id", e.id).eq("hidden", false);
      photos = count ?? 0;
      if (!photos) continue;
    }

    const mail =
      kind === "vorher"
        ? vbBeforeMail({ name: e.contact_name, title, date: e.event_date!, days: untilEvent, manageUrl: vbManageUrl(e.manage_token), posterUrl: `${vbManageUrl(e.manage_token)}/aufsteller` })
        : kind === "danach"
          ? vbAfterMail({ name: e.contact_name, title, photos, galleryUrl: `${guest}/galerie`, manageUrl: vbManageUrl(e.manage_token), deleteDate, highlights: await vbHighlights(e) })
          : vbDeletionMail({ name: e.contact_name, title, photos, days: untilDelete, deleteDate, galleryUrl: `${guest}/galerie` });

    if (dryRun) {
      out.push({ event: e.slug, kind, to: e.contact_email!, sent: false });
      continue;
    }
    const r = await sendEmail({ to: e.contact_email!, ...mail });
    // auch bei Test-Adressen (nicht verschickt) als erledigt merken – sonst jeden Tag erneut
    if (r.sent || r.error === "test_address") {
      await supabase.from("vb_events").update({ reminders: { ...sent, [kind]: new Date().toISOString() } }).eq("id", e.id);
    }
    out.push({ event: e.slug, kind, to: e.contact_email!, sent: r.sent });
  }
  return out;
}

/** Highlights fürs „Danke“-Mail: KI-Bilder, Missions-Sieger, Foto des Abends (Link 14 Tage gültig). */
async function vbHighlights(e: VbEvent): Promise<VbHighlights | undefined> {
  try {
    const supabase = createAdminClient();
    const [{ count: ai }, board, { data: liked }] = await Promise.all([
      supabase.from("vb_photos").select("id", { count: "exact", head: true }).eq("event_id", e.id).eq("hidden", false).eq("kind", "ki"),
      vbBoard(e, null, 1),
      supabase.from("vb_photos").select("file_path, thumb_path, likes").eq("event_id", e.id).eq("hidden", false).gt("likes", 0).order("likes", { ascending: false }).order("created_at").limit(1),
    ]);
    let topPhoto: VbHighlights["topPhoto"] = null;
    const best = liked?.[0];
    if (best) {
      const { data } = await supabase.storage.from(VB_BUCKET).createSignedUrl(best.thumb_path || best.file_path, 60 * 60 * 24 * 14);
      if (data?.signedUrl) topPhoto = { url: data.signedUrl, likes: best.likes };
    }
    const w = board.top[0];
    return { aiPhotos: ai ?? 0, guests: board.players, winner: w && w.points > 0 ? { name: w.name, points: w.points } : null, topPhoto };
  } catch (err) {
    console.error("VisionBooth-Highlights:", err);
    return undefined;
  }
}
