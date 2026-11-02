import "server-only";
import { randomInt } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, vbManageMail } from "@/lib/email";
import { vbManageUrl } from "@/lib/visionbooth";
import { CHALLENGE_SETS } from "@/components/visionbooth/challenges";
import { defaultGames, getOccasion, getPlan, type VbGames, type VbOccasionId, type VbPlanId } from "@/components/visionbooth/packages";
import { LEAD_DEFAULT } from "@/components/visionbooth/leads";
import { REVEAL_DEFAULT } from "@/components/visionbooth/reveal";
import { getTemplate } from "@/components/visionbooth/templates";

// Ein VisionBooth-Event komplett einrichten – aus dem Admin, aus einer Fotobox-Buchung
// oder (später) direkt nach der Online-Buchung. Paket bestimmt den Umfang, Anlass das Design.

/** Gut lesbar, nicht erratbar: ohne 0/o/1/l/i. */
const SLUG_CHARS = "abcdefghjkmnpqrstuvwxyz23456789";
const newSlug = () => Array.from({ length: 7 }, () => SLUG_CHARS[randomInt(SLUG_CHARS.length)]).join("");

/** "2026-11-14" + "18:00" (Berlin) → ISO-Zeitpunkt. */
export function berlinIso(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const guess = new Date(`${date}T${time}:00Z`);
  const berlin = new Date(guess.toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
  const utc = new Date(guess.toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(guess.getTime() - (berlin.getTime() - utc.getTime())).toISOString();
}

const addDays = (date: string, days: number) => new Date(Date.parse(date) + days * 864e5).toISOString().slice(0, 10);

export interface ProvisionInput {
  plan: VbPlanId;
  occasion: VbOccasionId;
  title: string;
  /** Text im Rahmen, z. B. „Anna & Max“ – leer = Titel */
  frameText?: string | null;
  eventDate?: string | null;
  /** Anzahl Event-Tage (Messe); verlängert den Gäste-Link */
  eventDays?: number;
  contactName?: string | null;
  contactEmail?: string | null;
  bookingId?: string | null;
  /** Kunden-Link gleich per Mail schicken */
  sendMail?: boolean;
  /** Gewählte Spiele (Online-Buchung); fehlt = Vorauswahl je Paket/Anlass */
  games?: VbGames;
  /** Firma (für den Einwilligungstext des Gewinnspiels) */
  company?: string | null;
  /** Vorlage statt der Anlass-Vorlage (z. B. Kinder-Motto aus der Buchung) */
  template?: string | null;
}

export interface ProvisionResult {
  id: string;
  slug: string;
  manageUrl: string;
  mailSent: boolean;
}

export async function provisionVbEvent(input: ProvisionInput): Promise<ProvisionResult | { error: string }> {
  const plan = getPlan(input.plan);
  const occ = getOccasion(input.occasion);
  const template = getTemplate(input.template || occ.template);
  const ai = plan.aiLimit > 0 && !occ.noAi;
  const title = input.title.trim().slice(0, 120);
  if (!title) return { error: "Bitte einen Namen für das Event angeben." };
  const date = input.eventDate && /^\d{4}-\d{2}-\d{2}$/.test(input.eventDate) ? input.eventDate : null;
  const activeDays = plan.days + Math.max(0, (input.eventDays ?? 1) - 1);
  const games = input.games ?? defaultGames(plan.id, occ.id);
  const challenges = games.missions && occ.challenges ? CHALLENGE_SETS.find((s) => s.id === occ.challenges)?.items ?? [] : [];
  const email = input.contactEmail?.trim().toLowerCase() || null;

  const supabase = createAdminClient();
  if (input.bookingId) {
    const { data: existing } = await supabase.from("vb_events").select("id").eq("booking_id", input.bookingId).maybeSingle();
    if (existing) return { error: "Für diese Buchung gibt es schon eine VisionBooth." };
  }

  const row = {
    title,
    event_date: date,
    package: plan.kind,
    plan: plan.id,
    occasion: occ.id,
    booking_id: input.bookingId ?? null,
    frame_text: (input.frameText?.trim() || title).slice(0, 60),
    contact_name: input.contactName?.trim() || null,
    contact_email: email,
    template: template.id,
    accent_color: template.accent,
    formats: ["einzel", "streifen"],
    // Gäste-Link ab Event-Tag, Dauer je Paket
    opens_at: date ? berlinIso(date, "00:00") : null,
    closes_at: date ? berlinIso(addDays(date, activeDays), "23:59") : null,
    retention_days: plan.retentionDays,
    ai_enabled: ai,
    ai_styles: occ.aiStyles,
    ai_limit: plan.aiLimit,
    ai_per_guest: Math.max(1, plan.aiPerGuest),
    wall_enabled: true,
    gallery_enabled: true,
    challenges,
    reveal: games.reveal ? { ...REVEAL_DEFAULT, enabled: true } : {},
    leads: games.leads && plan.firma ? { ...LEAD_DEFAULT, enabled: true, sponsor: input.company?.trim() || input.contactName?.trim() || "" } : {},
  };

  let created: { id: string; slug: string; manage_token: string } | null = null;
  for (let i = 0; i < 5 && !created; i++) {
    const { data, error } = await supabase.from("vb_events").insert({ ...row, slug: newSlug() }).select("id, slug, manage_token").single();
    if (data) created = data;
    else if (error && error.code !== "23505") {
      console.error("VisionBooth anlegen:", error);
      return { error: "Event konnte nicht angelegt werden." };
    }
  }
  if (!created) return { error: "Event konnte nicht angelegt werden." };

  const manageUrl = vbManageUrl(created.manage_token);
  let mailSent = false;
  if (input.sendMail && email) {
    const mail = vbManageMail({ name: row.contact_name, title: row.frame_text, date, url: manageUrl });
    mailSent = (await sendEmail({ to: email, ...mail })).sent;
  }
  return { id: created.id, slug: created.slug, manageUrl, mailSent };
}
