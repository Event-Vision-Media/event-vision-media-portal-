import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, vbAfterMail, vbBeforeMail, vbDeletionMail } from "@/lib/email";
import { vbDeleteAfter, vbGuestUrl, vbManageUrl, type VbEvent } from "@/lib/visionbooth";

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
          ? vbAfterMail({ name: e.contact_name, title, photos, galleryUrl: `${guest}/galerie`, manageUrl: vbManageUrl(e.manage_token), deleteDate })
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
