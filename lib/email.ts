import "server-only";
import { followupLine, formatEuro } from "@/lib/catalog";
import { formatDateGerman } from "@/lib/format";
import { LANDLORD, NO_DEPOSIT_UP_TO, depositFor } from "@/lib/contract";
import type { WeeklyPlan, WeeklyPlanItem } from "@/lib/weekly-plan";
import { VB_LEGAL_VERSION, VB_WIDERRUF, VB_WIDERRUF_FORM, legalText } from "@/lib/vb-legal";

/**
 * E-Mail-Versand über die Resend-API (https://resend.com) – ohne zusätzliche
 * Abhängigkeit, per fetch. Ist RESEND_API_KEY nicht gesetzt (z. B. lokal),
 * wird nichts verschickt und nur protokolliert, damit der Buchungsablauf
 * trotzdem funktioniert.
 */

const BRAND = "Event Vision Media";

interface MailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  /** Dateianhänge, Inhalt base64-kodiert (z. B. Rechnungs-PDF). */
  attachments?: { filename: string; content: string }[];
}

export async function sendEmail(mail: MailInput): Promise<{ sent: boolean; error?: string; id?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || `${BRAND} <info@fotobox-essen.com>`;
  // Reservierte Test-Domains (RFC 2606) nie anschreiben – schützt die Absender-Reputation
  if (/@(example\.(com|org|net)|[^@]+\.(test|invalid|example))$/i.test(mail.to.trim())) {
    console.info(`[email] Test-Adresse – Mail nicht verschickt: "${mail.subject}" an ${mail.to}`);
    return { sent: false, error: "test_address" };
  }
  if (!apiKey) {
    console.info(`[email] RESEND_API_KEY fehlt – Mail nicht verschickt: "${mail.subject}" an ${mail.to}`);
    return { sent: false, error: "not_configured" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [mail.to],
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        reply_to: mail.replyTo ?? process.env.ADMIN_EMAIL ?? undefined,
        ...(mail.attachments?.length ? { attachments: mail.attachments } : {}),
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`[email] Versand fehlgeschlagen (${res.status}): ${body}`);
      return { sent: false, error: `http_${res.status}` };
    }
    const json = (await res.json().catch(() => null)) as { id?: string } | null;
    return { sent: true, id: json?.id };
  } catch (err) {
    console.error("[email] Versand fehlgeschlagen:", err);
    return { sent: false, error: "network" };
  }
}

/** Zustellstatus einer verschickten Mail bei Resend (delivered, bounced, …). */
export async function mailDeliveryStatus(id: string): Promise<{ status: string; at: string | null } | null> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !/^[\w-]{8,}$/.test(id)) return null;
  try {
    const res = await fetch(`https://api.resend.com/emails/${id}`, { headers: { Authorization: `Bearer ${apiKey}` }, cache: "no-store" });
    if (!res.ok) return null;
    const j = (await res.json()) as { last_event?: string; created_at?: string };
    return { status: j.last_event ?? "unknown", at: j.created_at ?? null };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Vorlagen
// ---------------------------------------------------------------------------

export interface MailBooking {
  booking_code: string;
  customer_type?: "business" | "privat" | null;
  access_code: string | null;
  custom_login_code: string | null;
  customer_name: string | null;
  couple_names: string;
  event_date: string;
  event_days: number;
  location: string | null;
  occasion: string | null;
  total_price: number | null;
  inquiry_items: {
    packages?: { name: string; price: number }[];
    extras?: { name: string; price: number; from?: boolean }[];
    isFromPrice?: boolean;
    days?: number;
    packagesTotal?: number;
  } | null;
}

function esc(s: string | null | undefined): string {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

function portalUrl(): string {
  return (process.env.PORTAL_URL || "").replace(/\/$/, "");
}

function loginCode(b: MailBooking): string {
  return b.access_code || b.custom_login_code || b.booking_code;
}

function itemsRows(b: MailBooking): { html: string; text: string } {
  const follow = followupLine(b.inquiry_items);
  const items = [
    ...(b.inquiry_items?.packages ?? []).map((p) => ({ name: p.name, price: formatEuro(p.price) })),
    ...(follow ? [{ name: follow.label, price: formatEuro(follow.amount) }] : []),
    ...(b.inquiry_items?.extras ?? []).map((e) => ({ name: e.name, price: (e.from ? "ab " : "") + formatEuro(e.price) })),
  ];
  const total = b.total_price != null ? (b.inquiry_items?.isFromPrice ? "ab " : "") + formatEuro(Number(b.total_price)) : "–";
  const html =
    items
      .map((i) => `<tr><td style="padding:6px 0;color:#3a4048">${esc(i.name)}</td><td style="padding:6px 0;text-align:right;color:#1f2227;white-space:nowrap">${esc(i.price)}</td></tr>`)
      .join("") +

    `<tr><td style="padding:10px 0 0;border-top:1px solid #e4e6e8;font-weight:600">Gesamt</td><td style="padding:10px 0 0;border-top:1px solid #e4e6e8;text-align:right;font-weight:600;white-space:nowrap">${esc(total)}</td></tr>`;
  const text = items.map((i) => `- ${i.name}: ${i.price}`).join("\n") + `\nGesamt: ${total}`;
  return { html, text };
}

function layout(title: string, body: string): string {
  return `<!doctype html><html lang="de"><body style="margin:0;background:#faf8f4;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2227">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f4;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e4e6e8;border-radius:16px">
<tr><td style="background:#16181c;border-radius:16px 16px 0 0;padding:22px 28px;color:#dfc186;font-family:Georgia,serif;font-size:18px;font-weight:600">${BRAND}</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:24px;color:#1f2227">${title}</h1>
${body}
<p style="margin:28px 0 0;color:#6f7882;font-size:13px;line-height:1.6">${BRAND} · Mönkhoffs Busch 34 · 45277 Essen<br>Telefon/WhatsApp 0176 22748363 · info@fotobox-essen.com</p>
</td></tr></table></td></tr></table></body></html>`;
}

function codeBox(b: MailBooking): string {
  const url = portalUrl();
  return `<div style="margin:22px 0;padding:18px;border-radius:12px;background:#fbf8f1;border:1px solid #ebdab3;text-align:center">
<div style="font-size:13px;color:#6f7882">${isSie(b) ? "Ihr" : "Dein"} Zugangscode fürs Kundenportal</div>
<div style="margin:6px 0 12px;font-size:24px;font-weight:700;letter-spacing:2px;color:#1f2227">${esc(loginCode(b))}</div>
${url ? `<a href="${esc(url)}" style="display:inline-block;padding:12px 22px;border-radius:10px;background:#a87731;color:#ffffff;text-decoration:none;font-weight:600">Zum Kundenportal</a>` : ""}
</div>`;
}

/** Businesskunden werden gesiezt, Privatkunden geduzt – wie auf der Website. */
function isSie(b: MailBooking): boolean {
  return b.customer_type === "business";
}

function greeting(b: MailBooking): string {
  const name = b.customer_name || b.couple_names;
  return isSie(b) ? `Guten Tag ${name}` : `Hallo ${name}`;
}

function details(b: MailBooking): string {
  return `<table role="presentation" width="100%" style="font-size:14px;margin:8px 0 4px">
<tr><td style="color:#6f7882;padding:3px 0">Buchungsnummer</td><td style="text-align:right">${esc(b.booking_code)}</td></tr>
<tr><td style="color:#6f7882;padding:3px 0">Datum</td><td style="text-align:right">${esc(formatDateGerman(b.event_date))}${b.event_days > 1 ? ` · ${b.event_days} Tage` : ""}</td></tr>
${b.occasion ? `<tr><td style="color:#6f7882;padding:3px 0">Anlass</td><td style="text-align:right">${esc(b.occasion)}</td></tr>` : ""}
${b.location ? `<tr><td style="color:#6f7882;padding:3px 0">Location</td><td style="text-align:right">${esc(b.location)}</td></tr>` : ""}
</table>
<table role="presentation" width="100%" style="font-size:14px;margin-top:12px">${itemsRows(b).html}</table>`;
}

const TAX = "Alle Preise sind Endpreise. Gemäß § 19 UStG (Kleinunternehmerregelung) wird keine Umsatzsteuer berechnet.";

/**
 * Sofort nach der Anfrage, wenn der Termin frei ist: Termin ist vorgemerkt,
 * der Admin prüft. Den Portal-Zugang gibt es erst mit der Auftragsbestätigung.
 */
export function reservationMail(b: MailBooking) {
  const t = isSie(b)
    ? {
        subject: `Ihr Termin ist vorgemerkt – ${BRAND}`,
        title: "Vielen Dank – Ihr Termin ist vorgemerkt",
        intro: `vielen Dank für Ihre Anfrage! Ihr Wunschtermin ist <strong>für Sie vorgemerkt</strong> und wird in dieser Zeit niemand anderem angeboten.`,
        next: "Wir prüfen jetzt kurz Location und Details. <strong>Innerhalb von 24 Stunden</strong> erhalten Sie von uns die Auftragsbestätigung – zusammen mit Ihrem persönlichen Zugang zum Kundenportal. Haben Sie uns eine Frage gestellt oder ist noch etwas zu klären? Dann melden wir uns vorher zeitnah persönlich bei Ihnen. Dort unterschreiben Sie bequem den Mietvertrag und wählen Ihr Layout.",
        call: "Fragen oder Wünsche? Antworten Sie einfach auf diese E-Mail oder rufen Sie uns an: 0176 22748363.",
      }
    : {
        subject: `Dein Termin ist vorgemerkt – ${BRAND}`,
        title: "Danke – dein Termin ist vorgemerkt! ✨",
        intro: `vielen Dank für deine Anfrage! Dein Wunschtermin ist <strong>für dich vorgemerkt</strong> und wird in der Zeit niemand anderem angeboten.`,
        next: "Wir prüfen jetzt kurz Location und Details. <strong>Innerhalb von 24 Stunden</strong> bekommst du von uns die Auftragsbestätigung – zusammen mit deinem persönlichen Zugang zum Kundenportal. Hast du uns eine Frage gestellt oder ist noch etwas zu klären? Dann melden wir uns vorher zeitnah persönlich bei dir. Dort unterschreibst du ganz bequem den Mietvertrag und wählst dein Layout.",
        call: "Fragen oder Wünsche? Antworte einfach auf diese E-Mail oder ruf uns an: 0176 22748363.",
      };
  const note = "Richtpreis, unverbindlich – verbindlich wird die Buchung mit unserer Auftragsbestätigung und dem Mietvertrag.";
  return {
    subject: t.subject,
    html: layout(
      t.title,
      `<p style="line-height:1.6">${esc(greeting(b))},</p>
<p style="line-height:1.6">${t.intro}</p>
<p style="line-height:1.6">${t.next}</p>
${details(b)}
<p style="margin-top:18px;line-height:1.6">${t.call}</p>
<p style="margin-top:12px;color:#6f7882;font-size:13px;line-height:1.6">${note} ${TAX}</p>`
    ),
    text: `${greeting(b)},\n\n${stripTags(t.intro)}\n\n${stripTags(t.next)}\n\nAnfrage: ${b.booking_code}\nDatum: ${formatDateGerman(b.event_date)}\n${itemsRows(b).text}\n\n${t.call}\n\n${note} ${TAX}\n\n${BRAND}`,
  };
}

export function confirmationMail(b: MailBooking) {
  const url = portalUrl();
  const noDeposit = b.total_price != null && depositFor(Number(b.total_price)) === 0;
  const t = isSie(b)
    ? {
        title: "Ihre Buchung ist bestätigt",
        intro: "gute Nachrichten: Wir haben alles geprüft und bestätigen Ihnen Ihren Termin. Wir freuen uns auf Ihr Event!",
        next: `<strong>Nächster Schritt:</strong> Bitte melden Sie sich mit dem Zugangscode unten im Kundenportal an und unterschreiben Sie dort Ihren Mietvertrag – er ist bereits vorausgefüllt und in ca. 2 Minuten erledigt. ${noDeposit ? "Eine Anzahlung ist nicht nötig." : "Danach erhalten Sie die Rechnung über die Anzahlung."} Im Portal wählen Sie außerdem Ihr Layout und sehen jederzeit den Stand Ihrer Buchung.`,
      }
    : {
        title: "Deine Buchung ist bestätigt 🎉",
        intro: "gute Nachrichten: Wir haben alles geprüft und bestätigen dir deinen Termin. Wir freuen uns riesig auf dein Event!",
        next: `<strong>Nächster Schritt:</strong> Melde dich mit dem Zugangscode unten im Kundenportal an und unterschreib dort deinen Mietvertrag – er ist schon vorausgefüllt und in ca. 2 Minuten erledigt. ${noDeposit ? "Eine Anzahlung brauchst du nicht – du zahlst alles auf einmal." : "Danach bekommst du die Rechnung über die Anzahlung."} Im Portal wählst du außerdem dein Layout und siehst jederzeit den Stand deiner Buchung.`,
      };
  return {
    subject: `Auftragsbestätigung ${b.booking_code} – ${BRAND}`,
    html: layout(
      t.title,
      `<p style="line-height:1.6">${esc(greeting(b))},</p>
<p style="line-height:1.6">${t.intro}</p>
${details(b)}${codeBox(b)}
<p style="line-height:1.6">${t.next}</p>
<p style="margin-top:18px;color:#6f7882;font-size:13px;line-height:1.6">${TAX}</p>`
    ),
    text: `${greeting(b)},\n\n${t.intro}\n\nBuchungsnummer: ${b.booking_code}\nDatum: ${formatDateGerman(b.event_date)}\n${itemsRows(b).text}\n\nZugangscode Kundenportal: ${loginCode(b)}${url ? `\n${url}` : ""}\n\n${stripTags(t.next)}\n\n${TAX}\n\n${BRAND} · 0176 22748363`,
  };
}

/**
 * Portal-Einladung für Bestandsbuchungen: Termin stand schon fest (z. B. per Telefon/WhatsApp),
 * jetzt bekommt der Kunde Zugang zum neuen Kundenportal. Keine „Auftragsbestätigung“,
 * Vertrag nur erwähnen, wenn er noch nicht vorliegt.
 */
export function portalInviteMail(b: MailBooking, opts: { contractOnFile: boolean }) {
  const sie = isSie(b);
  const names = (b.inquiry_items?.packages ?? []).map((p) => p.name).join(" ");
  const photo = /spiegel|mirror|fotobox/i.test(names);
  const audio = /audio/i.test(names);
  const todo = [
    photo && (sie ? "Ihr Foto-Layout auswählen und personalisieren" : "dein Foto-Layout auswählen und personalisieren"),
    audio && (sie ? "Ihre persönliche Begrüßungsansage fürs Audiogästebuch hochladen" : "deine persönliche Begrüßungsansage fürs Audiogästebuch hochladen"),
    sie ? "Lieferung, Abholung und Ansprechpartner einsehen" : "Lieferung, Abholung und Ansprechpartner einsehen",
    sie ? "den Stand Ihrer Zahlungen und Rechnungen sehen" : "den Stand deiner Zahlungen und Rechnungen sehen",
  ].filter(Boolean) as string[];
  const contract = opts.contractOnFile
    ? ""
    : sie
      ? "Bitte unterschreiben Sie dort außerdem Ihren Mietvertrag – er ist bereits vorausgefüllt und in ca. 2 Minuten erledigt."
      : "Bitte unterschreib dort außerdem deinen Mietvertrag – er ist schon vorausgefüllt und in ca. 2 Minuten erledigt.";
  const t = sie
    ? {
        title: "Ihr Kundenportal ist bereit",
        intro: `Ihr Termin am <strong>${esc(formatDateGerman(b.event_date))}</strong> steht – und ab sofort finden Sie alles dazu an einem Ort: in Ihrem persönlichen Kundenportal.`,
        lead: "Dort können Sie:",
      }
    : {
        title: "Dein Kundenportal ist bereit 🎉",
        intro: `Dein Termin am <strong>${esc(formatDateGerman(b.event_date))}</strong> steht – und ab sofort findest du alles dazu an einem Ort: in deinem persönlichen Kundenportal.`,
        lead: "Dort kannst du:",
      };
  const list = `<ul style="line-height:1.7;padding-left:20px;margin:8px 0">${todo.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
  return {
    subject: `${sie ? "Ihr" : "Dein"} Kundenportal für den ${formatDateGerman(b.event_date)} – ${BRAND}`,
    html: layout(
      t.title,
      `<p style="line-height:1.6">${esc(greeting(b))},</p>
<p style="line-height:1.6">${t.intro}</p>
${details(b)}${codeBox(b)}
<p style="line-height:1.6;margin-bottom:0">${t.lead}</p>
${list}
${contract ? `<p style="line-height:1.6">${contract}</p>` : ""}
<p style="line-height:1.6">${sie ? "Bei Fragen erreichen Sie uns jederzeit" : "Bei Fragen erreichst du uns jederzeit"} telefonisch oder per WhatsApp unter 0176 22748363.</p>`
    ),
    text: `${greeting(b)},\n\n${stripTags(t.intro)}\n\nBuchungsnummer: ${b.booking_code}\nDatum: ${formatDateGerman(b.event_date)}\n\nZugangscode Kundenportal: ${loginCode(b)}${portalUrl() ? `\n${portalUrl()}` : ""}\n\n${t.lead}\n${todo.map((x) => `- ${x}`).join("\n")}\n${contract ? `\n${contract}\n` : ""}\nBei Fragen: 0176 22748363 (Telefon/WhatsApp)\n\n${BRAND}`,
  };
}

export function declineMail(b: MailBooking, reason: string | null) {
  const date = formatDateGerman(b.event_date);
  const t = isSie(b)
    ? {
        subject: `Ihre Anfrage für den ${date} – ${BRAND}`,
        intro: `vielen Dank für Ihre Anfrage. Leider können wir den Termin am <strong>${esc(date)}</strong> nicht übernehmen.`,
        outro: "Gerne unterbreiten wir Ihnen ein Angebot für einen anderen Termin oder eine Alternative – telefonisch oder per WhatsApp unter 0176 22748363.",
      }
    : {
        subject: `Deine Anfrage für den ${date} – ${BRAND}`,
        intro: `vielen Dank für deine Anfrage. Leider können wir den Termin am <strong>${esc(date)}</strong> nicht übernehmen.`,
        outro: "Melde dich gern, wenn ein anderer Termin oder ein anderes Produkt für dich in Frage kommt – per Telefon/WhatsApp unter 0176 22748363.",
      };
  return {
    subject: t.subject,
    html: layout(
      "Leider klappt es diesmal nicht",
      `<p style="line-height:1.6">${esc(greeting(b))},</p>
<p style="line-height:1.6">${t.intro}${reason ? ` ${esc(reason)}` : ""}</p>
<p style="line-height:1.6">${t.outro}</p>`
    ),
    text: `${greeting(b)},\n\n${stripTags(t.intro)}${reason ? ` ${reason}` : ""}\n\n${t.outro}\n\n${BRAND}`,
  };
}

/** Erinnerung ca. 4 Wochen vor dem Event: offene Schritte + passende Extras. */
export function reminderMail(b: MailBooking, openSteps: string[], recs: { name: string; priceLabel: string }[]) {
  const sie = isSie(b);
  const url = portalUrl();
  const date = formatDateGerman(b.event_date);
  const title = sie ? `Noch 4 Wochen bis zu Ihrem Event` : `Noch 4 Wochen bis zu deinem Event 🎉`;
  const intro = sie
    ? `am <strong>${esc(date)}</strong> ist es so weit – wir freuen uns schon! Damit alles perfekt vorbereitet ist, fehlen noch ein paar Angaben im Kundenportal:`
    : `am <strong>${esc(date)}</strong> ist es so weit – wir freuen uns schon riesig! Damit alles perfekt vorbereitet ist, fehlen noch ein paar Kleinigkeiten in deinem Kundenportal:`;
  const steps = openSteps.length
    ? `<ul style="margin:14px 0;padding-left:20px;line-height:1.8">${openSteps.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>`
    : `<p style="line-height:1.6">${sie ? "Sie haben bereits alles erledigt – vielen Dank!" : "Du hast schon alles erledigt – super!"}</p>`;
  const recHtml = recs.length
    ? `<div style="margin-top:22px;padding:16px;border-radius:12px;background:#fbf8f1;border:1px solid #ebdab3">
<p style="margin:0 0 8px;font-weight:600">${sie ? "An Ihrem Termin noch verfügbar:" : "An deinem Termin noch frei:"}</p>
${recs.map((r) => `<p style="margin:4px 0">${esc(r.name)} – <strong>${esc(r.priceLabel)}</strong></p>`).join("")}
<p style="margin:8px 0 0;font-size:13px;color:#6f7882">${sie ? "Mit einem Klick im Kundenportal hinzubuchbar." : "Mit einem Klick im Kundenportal dazubuchbar."}</p></div>`
    : "";
  return {
    subject: sie ? `Noch 4 Wochen bis zu Ihrem Event – ${b.booking_code}` : `Noch 4 Wochen bis zu deinem Event! – ${b.booking_code}`,
    html: layout(title, `<p style="line-height:1.6">${esc(greeting(b))},</p><p style="line-height:1.6">${intro}</p>${steps}${codeBox(b)}${recHtml}`),
    text: `${greeting(b)},\n\n${stripTags(intro)}\n${openSteps.map((s) => `- ${s}`).join("\n")}\n\nZugangscode: ${loginCode(b)}${url ? `\n${url}` : ""}${recs.length ? `\n\nNoch verfügbar:\n${recs.map((r) => `- ${r.name}: ${r.priceLabel}`).join("\n")}` : ""}\n\n${BRAND}`,
  };
}

/** Nach dem Event: Online-Galerie ist freigeschaltet + Bitte um Google-Bewertung. */
/** Was nach dem Event bereitliegt – steuert Betreff und Text der „Ist da“-Mails. */
export interface MediaReady {
  /** Online-Galerie mit Fotos (Fotospiegel/Fotobox) ist hinterlegt */
  photos: boolean;
  /** Online-Galerie mit 360°-Videos ist hinterlegt */
  videos?: boolean;
  /** Anzahl hochgeladener Audio-Nachrichten */
  audios: number;
}

function readyTexts(b: MailBooking, m: MediaReady) {
  const sie = isSie(b);
  const audios = m.audios > 0;
  const n = m.audios;
  const audioLine = sie
    ? `${n === 1 ? "Die Sprachnachricht Ihrer Gäste ist" : `Alle ${n} Sprachnachrichten Ihrer Gäste sind`} jetzt im Kundenportal – zum Anhören und mit einem Klick als Gesamtpaket (ZIP) zum Herunterladen.`
    : `${n === 1 ? "Die Sprachnachricht deiner Gäste ist" : `Alle ${n} Sprachnachrichten deiner Gäste sind`} jetzt im Kundenportal – zum Anhören und mit einem Klick als Gesamtpaket (ZIP) zum Herunterladen.`;
  const galleryWhat = m.photos && m.videos ? "Fotos und 360°-Videos" : m.videos ? "360°-Videos" : "Fotos";
  const galleryLine = sie
    ? `Alle ${galleryWhat} stehen in Ihrer Online-Galerie im Kundenportal zum Download bereit.`
    : `Alle ${galleryWhat} stehen in deiner Online-Galerie im Kundenportal zum Download bereit.`;
  const words = [m.photos && "Fotos", m.videos && "Videos", audios && "Audio-Nachrichten"].filter(Boolean) as string[];
  const list = words.length > 1 ? `${words.slice(0, -1).join(", ")} & ${words[words.length - 1]}` : words[0];
  const emoji = words.length > 1 ? " 🎉" : m.photos ? " 📸" : m.videos ? " 🎬" : audios ? " 🎙️" : "";
  const verb = m.photos || m.videos ? "sind online" : "sind da";
  const title = list
    ? sie ? `Ihre ${list} ${verb}` : `Deine ${list} ${verb}${emoji}`
    : sie ? "Danke, dass wir dabei sein durften" : "Danke, dass wir dabei sein durften 💛";
  const lines = [m.photos || m.videos ? galleryLine : "", audios ? audioLine : ""].filter(Boolean);
  return { title, lines };
}

/**
 * Nach dem Event: Fotos und/oder Audios sind da (je nach Buchung) plus Bitte um Bewertung.
 * informed = Kunde hat die „Ist da“-Info schon per Knopf bekommen → nur noch Danke + Bewertung.
 */
export function followupMail(b: MailBooking, reviewUrl: string | null, m: MediaReady = { photos: true, audios: 0 }, informed = false) {
  const sie = isSie(b);
  const url = portalUrl();
  const r = readyTexts(b, informed ? { photos: false, videos: false, audios: 0 } : m);
  const thanks = sie ? "vielen Dank, dass wir bei Ihrem Event dabei sein durften!" : "danke, dass wir bei deinem Event dabei sein durften!";
  const still = informed
    ? sie
      ? "Ihre Erinnerungen finden Sie weiterhin jederzeit im Kundenportal."
      : "Deine Erinnerungen findest du weiterhin jederzeit im Kundenportal."
    : "";
  const ask = sie
    ? "Hat Ihnen unser Service gefallen? Wir würden uns sehr über eine kurze Google-Bewertung freuen – das hilft uns als kleinem Unternehmen enorm."
    : "Hat es dir gefallen? Wir würden uns riesig über eine kurze Google-Bewertung freuen – das hilft uns als kleinem Unternehmen enorm. 💛";
  const review = reviewUrl
    ? `<p style="margin:22px 0 0;text-align:center"><a href="${esc(reviewUrl)}" style="display:inline-block;padding:12px 22px;border-radius:10px;background:#16181c;color:#ffffff;text-decoration:none;font-weight:600">★★★★★ Bewertung schreiben</a></p>`
    : "";
  const body = [thanks, ...r.lines, still].filter(Boolean);
  return {
    subject: `${r.title} – ${BRAND}`,
    html: layout(r.title, `<p style="line-height:1.6">${esc(greeting(b))},</p>${body.map((l) => `<p style="line-height:1.6">${esc(l)}</p>`).join("")}${codeBox(b)}<p style="line-height:1.6">${ask}</p>${review}`),
    text: `${greeting(b)},\n\n${body.join("\n\n")}\n\nZugangscode: ${loginCode(b)}${url ? `\n${url}` : ""}\n\n${ask}${reviewUrl ? `\n${reviewUrl}` : ""}\n\n${BRAND}`,
  };
}

/** Per Knopf im Admin: „Deine Fotos/Audios sind da“ – sofort nach dem Hochladen, ohne Bewertungsbitte. */
export function mediaReadyMail(b: MailBooking, m: MediaReady) {
  const sie = isSie(b);
  const url = portalUrl();
  const r = readyTexts(b, m);
  const hello = "es ist so weit:";
  const look = m.photos || m.videos;
  const enjoy = look && m.audios ? (sie ? "Viel Freude beim Anschauen und Anhören!" : "Viel Freude beim Anschauen und Anhören! 💛") : m.audios ? (sie ? "Viel Freude beim Anhören!" : "Viel Freude beim Anhören! 💛") : sie ? "Viel Freude beim Anschauen!" : "Viel Freude beim Anschauen! 💛";
  return {
    subject: `${r.title} – ${BRAND}`,
    html: layout(r.title, `<p style="line-height:1.6">${esc(greeting(b))},</p><p style="line-height:1.6">${hello}</p>${r.lines.map((l) => `<p style="line-height:1.6">${esc(l)}</p>`).join("")}${codeBox(b)}<p style="line-height:1.6">${esc(enjoy)}</p>`),
    text: `${greeting(b)},\n\n${hello}\n\n${r.lines.join("\n\n")}\n\nZugangscode: ${loginCode(b)}${url ? `\n${url}` : ""}\n\n${enjoy}\n\n${BRAND}`,
  };
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

export function adminNotificationMail(b: MailBooking & { email: string | null; phone: string | null; company: string | null; lifecycle: string; inquiry_message: string | null; reason?: string | null; accessNote?: string | null }) {
  const status = b.lifecycle === "reserviert" ? "RESERVIERT – bitte bestätigen" : `ANFRAGE – ${b.reason ?? "bitte prüfen"}`;
  const url = portalUrl();
  return {
    subject: `Neue Website-Anfrage ${b.booking_code} · ${formatDateGerman(b.event_date)} · ${status}`,
    html: layout(
      "Neue Website-Anfrage",
      `<p><strong>${esc(status)}</strong></p>
<p style="line-height:1.6">${esc(b.customer_name)}${b.company ? ` · ${esc(b.company)}` : ""}<br>${esc(b.email)} · ${esc(b.phone)}</p>
${details(b)}
${b.accessNote ? `<p style="margin-top:14px;padding:12px;background:#fff7e6;border-radius:10px;color:#8a5a00"><strong>⚠️ Bitte beachten:</strong> ${esc(b.accessNote)}</p>` : ""}
${b.inquiry_message ? `<p style="margin-top:14px;padding:12px;background:#f4f5f6;border-radius:10px;white-space:pre-wrap">${esc(b.inquiry_message)}</p>` : ""}
${url ? `<p style="margin-top:18px"><a href="${esc(url)}/admin/anfragen" style="color:#a87731;font-weight:600">Im Admin öffnen →</a></p>` : ""}`
    ),
    text: `${status}\n${b.customer_name} ${b.company ?? ""}\n${b.email} ${b.phone ?? ""}\n${formatDateGerman(b.event_date)} · ${b.location ?? ""}\n${itemsRows(b).text}${b.accessNote ? `\n\nBitte beachten: ${b.accessNote}` : ""}\n\n${b.inquiry_message ?? ""}`,
    replyTo: b.email ?? undefined,
  };
}

/**
 * Nach der Unterschrift: vollständiger Vertragstext per E-Mail – so hat der
 * Kunde den Vertrag inkl. Widerrufsbelehrung auf einem dauerhaften Datenträger.
 */
export function contractSignedMail(b: MailBooking, contractHtml: string, contractText: string, noDeposit = false) {
  const sie = isSie(b);
  const url = portalUrl();
  const intro = sie
    ? `vielen Dank – Ihr Mietvertrag ist unterschrieben und damit abgeschlossen. Nachfolgend finden Sie Ihr Exemplar zur Aufbewahrung. ${noDeposit ? "Eine Anzahlung ist nicht nötig – die Rechnung über den Gesamtbetrag erhalten Sie gesondert." : "Die Rechnung über die Anzahlung erhalten Sie in Kürze gesondert per E-Mail."}`
    : `danke – dein Mietvertrag ist unterschrieben und damit abgeschlossen! Nachfolgend findest du dein Exemplar zum Aufbewahren. ${noDeposit ? "Eine Anzahlung brauchst du nicht – du zahlst alles auf einmal, so wie im Vertrag gewählt." : "Die Rechnung über die Anzahlung bekommst du in Kürze gesondert per E-Mail."}`;
  return {
    subject: `${sie ? "Ihr" : "Dein"} Mietvertrag ${b.booking_code} – ${BRAND}`,
    html: layout(
      sie ? "Ihr Mietvertrag" : "Dein Mietvertrag ✍️",
      `<p style="line-height:1.6">${esc(greeting(b))},</p><p style="line-height:1.6">${intro}</p>
${url ? `<p style="margin:16px 0"><a href="${esc(url)}/dashboard/vertrag" style="color:#a87731;font-weight:600">Vertrag im Kundenportal ansehen →</a></p>` : ""}
<div style="margin-top:20px;padding-top:16px;border-top:1px solid #e4e6e8">${contractHtml}</div>`
    ),
    text: `${greeting(b)},\n\n${intro}\n\n${contractText}\n\n${BRAND}`,
  };
}

export function contractAdminMail(b: MailBooking, signer: string, noDeposit = false) {
  const url = portalUrl();
  return {
    subject: `Mietvertrag unterschrieben: ${b.booking_code} · ${formatDateGerman(b.event_date)}`,
    html: layout(
      "Mietvertrag unterschrieben",
      `<p style="line-height:1.6"><strong>${esc(signer)}</strong> hat den Mietvertrag für <strong>${esc(b.booking_code)}</strong> (${esc(formatDateGerman(b.event_date))}) digital unterschrieben.</p>
${details(b)}
<p style="line-height:1.6"><strong>Nächster Schritt für dich:</strong> ${noDeposit ? `Keine Anzahlung (bis ${NO_DEPOSIT_UP_TO} €) – Rechnung über den Gesamtbetrag in Lexware Office schreiben` : "Anzahlungsrechnung in Lexware Office schreiben"} – Verwendungszweck ${esc(b.booking_code)}.</p>
${url ? `<p style="margin-top:18px"><a href="${esc(url)}/admin/zahlungen" style="color:#a87731;font-weight:600">Zu den Zahlungen →</a></p>` : ""}`
    ),
    text: `${signer} hat den Mietvertrag für ${b.booking_code} (${formatDateGerman(b.event_date)}) unterschrieben.${url ? `\n${url}/admin/anfragen` : ""}`,
  };
}

/**
 * Eingangsbestätigung, wenn der Termin nicht automatisch reserviert werden
 * konnte (Gerät belegt oder kurzfristig) – der Admin prüft persönlich.
 */
export function inquiryReceivedMail(b: MailBooking, reason: "belegt" | "kurzfristig") {
  const sie = isSie(b);
  const date = formatDateGerman(b.event_date);
  const why =
    reason === "kurzfristig"
      ? sie
        ? "Da Ihr Termin sehr kurzfristig ist, prüfen wir Verfügbarkeit und Vorbereitung persönlich."
        : "Da dein Termin sehr kurzfristig ist, prüfen wir Verfügbarkeit und Vorbereitung persönlich."
      : sie
        ? "Ihr Wunschgerät ist an diesem Tag leider bereits gebucht. Wir prüfen persönlich, ob wir es trotzdem möglich machen können, oder schlagen Ihnen eine passende Alternative vor."
        : "Dein Wunschgerät ist an diesem Tag leider schon gebucht. Wir prüfen persönlich, ob wir es trotzdem möglich machen können, oder schlagen dir eine passende Alternative vor.";
  const intro = sie
    ? `vielen Dank für Ihre Anfrage für den <strong>${esc(date)}</strong>! ${why}`
    : `danke für deine Anfrage für den <strong>${esc(date)}</strong>! ${why}`;
  const next = sie
    ? "Sie erhalten innerhalb von 24 Stunden eine persönliche Rückmeldung von uns. Eilt es? Dann rufen Sie uns gern an oder schreiben per WhatsApp: 0176 22748363."
    : "Du bekommst innerhalb von 24 Stunden eine persönliche Rückmeldung von uns. Eilt es? Dann ruf uns gern an oder schreib per WhatsApp: 0176 22748363.";
  return {
    subject: sie ? `Ihre Anfrage für den ${date} – ${BRAND}` : `Deine Anfrage für den ${date} – ${BRAND}`,
    html: layout(
      sie ? "Ihre Anfrage ist bei uns angekommen" : "Deine Anfrage ist angekommen",
      `<p style="line-height:1.6">${esc(greeting(b))},</p><p style="line-height:1.6">${intro}</p>
<p style="line-height:1.6">${next}</p>${details(b)}
<p style="margin-top:18px;color:#6f7882;font-size:13px;line-height:1.6">Richtpreis, unverbindlich. ${TAX}</p>`
    ),
    text: `${greeting(b)},\n\n${stripTags(intro)}\n\n${next}\n\nDatum: ${date}\n${itemsRows(b).text}\n\n${TAX}\n\n${BRAND}`,
  };
}

/** Freundliche Erinnerung, den Mietvertrag im Portal zu unterschreiben. */
export function contractReminderMail(b: MailBooking) {
  const sie = isSie(b);
  const url = portalUrl();
  const intro = sie
    ? `Ihr Termin am <strong>${esc(formatDateGerman(b.event_date))}</strong> ist bestätigt – es fehlt nur noch Ihre Unterschrift unter dem Mietvertrag, damit alles unter Dach und Fach ist. Er ist bereits vollständig vorausgefüllt – in ca. 2 Minuten erledigt, direkt am Handy.`
    : `dein Termin am <strong>${esc(formatDateGerman(b.event_date))}</strong> ist bestätigt – es fehlt nur noch deine Unterschrift unter dem Mietvertrag, damit alles unter Dach und Fach ist. Er ist schon vorausgefüllt – in ca. 2 Minuten erledigt, direkt am Handy.`;
  const button = url
    ? `<p style="margin:22px 0;text-align:center"><a href="${esc(url)}/dashboard/vertrag" style="display:inline-block;padding:12px 22px;border-radius:10px;background:#a87731;color:#ffffff;text-decoration:none;font-weight:600">Mietvertrag unterschreiben</a></p>`
    : "";
  return {
    subject: sie ? `Nur noch ein Schritt: Ihr Mietvertrag – ${b.booking_code}` : `Nur noch ein Schritt: Dein Mietvertrag – ${b.booking_code}`,
    html: layout(
      "Nur noch ein Schritt",
      `<p style="line-height:1.6">${esc(greeting(b))},</p><p style="line-height:1.6">${intro}</p>${button}${codeBox(b)}
<p style="color:#6f7882;font-size:13px;line-height:1.6">${sie ? "Fragen zum Vertrag? Antworten Sie einfach auf diese E-Mail." : "Fragen zum Vertrag? Antworte einfach auf diese E-Mail."}</p>`
    ),
    text: `${greeting(b)},\n\n${stripTags(intro)}\n\n${url ? `${url}/dashboard/vertrag\n` : ""}Zugangscode: ${loginCode(b)}\n\n${BRAND}`,
  };
}

// ---------------------------------------------------------------------------
// Zahlungen (Rechnungen selbst kommen aus Lexware Office)
// ---------------------------------------------------------------------------

export interface MailBank {
  holder: string | null;
  iban: string | null;
  bic: string | null;
}

function euro2(n: number): string {
  return n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

function bankBox(b: MailBooking, bank: MailBank | null, amount: number): { html: string; text: string } {
  if (!bank?.iban) {
    return { html: `<p style="line-height:1.6">Betrag: <strong>${esc(euro2(amount))}</strong> · Verwendungszweck: <strong>${esc(b.booking_code)}</strong> · Bankverbindung siehe Rechnung.</p>`, text: `Betrag: ${euro2(amount)}\nVerwendungszweck: ${b.booking_code}\nBankverbindung: siehe Rechnung` };
  }
  const rows = [
    ["Betrag", euro2(amount)],
    ...(bank.holder ? [["Empfänger", bank.holder]] : []),
    ["IBAN", bank.iban],
    ...(bank.bic ? [["BIC", bank.bic]] : []),
    ["Verwendungszweck", b.booking_code],
  ];
  return {
    html: `<table role="presentation" width="100%" style="margin:18px 0;padding:14px;border-radius:12px;background:#fbf8f1;border:1px solid #ebdab3;font-size:14px">${rows
      .map(([k, v]) => `<tr><td style="color:#6f7882;padding:3px 0">${esc(k)}</td><td style="text-align:right;font-weight:600">${esc(v)}</td></tr>`)
      .join("")}</table>`,
    text: rows.map(([k, v]) => `${k}: ${v}`).join("\n"),
  };
}

/** Bestätigung an den Kunden: Gesamtbetrag ist vollständig eingegangen (vom Admin per Knopf ausgelöst). */
export function paymentCompleteMail(b: MailBooking, total: number | null) {
  const sie = isSie(b);
  const url = portalUrl();
  const amount = total != null ? ` von <strong>${esc(euro2(total))}</strong>` : "";
  const intro = sie
    ? `der Gesamtbetrag${amount} für Ihre Buchung <strong>${esc(b.booking_code)}</strong> ist vollständig bei uns eingegangen – herzlichen Dank! Damit ist alles bezahlt, es folgen keine weiteren Zahlungsaufforderungen.`
    : `der Gesamtbetrag${amount} für deine Buchung <strong>${esc(b.booking_code)}</strong> ist vollständig bei uns eingegangen – herzlichen Dank! Damit ist alles bezahlt, es kommen keine weiteren Zahlungsaufforderungen.`;
  const outro = sie
    ? `Wir freuen uns auf Ihr Event am <strong>${esc(formatDateGerman(b.event_date))}</strong>. Alle Details und Ihre Rechnung finden Sie jederzeit in Ihrem Kundenportal.`
    : `Wir freuen uns auf dein Event am <strong>${esc(formatDateGerman(b.event_date))}</strong>. Alle Details und deine Rechnung findest du jederzeit in deinem Kundenportal.`;
  const portal = url
    ? `<p style="margin:18px 0"><a href="${esc(url)}" style="display:inline-block;padding:12px 22px;border-radius:10px;background:#a87731;color:#ffffff;text-decoration:none;font-weight:600">Zum Kundenportal</a></p>`
    : "";
  return {
    subject: sie ? `Zahlung vollständig erhalten · ${b.booking_code}` : `Zahlung vollständig erhalten ✓ · ${b.booking_code}`,
    html: layout("Zahlung vollständig erhalten ✓", `<p style="line-height:1.6">${esc(greeting(b))},</p><p style="line-height:1.6">${intro}</p><p style="line-height:1.6">${outro}</p>${portal}`),
    text: `${greeting(b)},\n\n${stripTags(intro)}\n\n${stripTags(outro)}\n\n${url ? `Kundenportal: ${url}\n\n` : ""}${BRAND}`,
  };
}

/** Anzahlung 7 Tage nach der Auftragsbestätigung noch nicht eingegangen. */
export function depositReminderMail(b: MailBooking, amount: number, bank: MailBank | null) {
  const sie = isSie(b);
  const box = bankBox(b, bank, amount);
  const intro = sie
    ? `wir freuen uns auf Ihr Event am <strong>${esc(formatDateGerman(b.event_date))}</strong>! Bei uns ist die Anzahlung für Ihre Buchung noch nicht eingegangen. Damit Ihr Termin verbindlich für Sie geblockt bleibt, überweisen Sie diese bitte in den nächsten Tagen:`
    : `wir freuen uns auf dein Event am <strong>${esc(formatDateGerman(b.event_date))}</strong>! Bei uns ist die Anzahlung für deine Buchung noch nicht eingegangen. Damit dein Termin verbindlich für dich geblockt bleibt, überweise sie bitte in den nächsten Tagen:`;
  const outro = sie
    ? "Haben Sie bereits überwiesen? Dann betrachten Sie diese E-Mail bitte als gegenstandslos – Überweisungen brauchen manchmal ein, zwei Tage."
    : "Du hast schon überwiesen? Dann ist diese E-Mail gegenstandslos – Überweisungen brauchen manchmal ein, zwei Tage.";
  return {
    subject: sie ? `Erinnerung: Anzahlung für ${b.booking_code}` : `Kurze Erinnerung: Anzahlung für ${b.booking_code}`,
    html: layout("Kurze Erinnerung zur Anzahlung", `<p style="line-height:1.6">${esc(greeting(b))},</p><p style="line-height:1.6">${intro}</p>${box.html}<p style="color:#6f7882;font-size:13px;line-height:1.6">${outro}</p>`),
    text: `${greeting(b)},\n\n${stripTags(intro)}\n\n${box.text}\n\n${outro}\n\n${BRAND}`,
  };
}

/**
 * Neue Rechnung (PDF im Anhang, liegt auch im Kundenportal). Mit Überweisung: Bankverbindung;
 * bei Barzahlung nur der Hinweis, dass bei Abholung/Lieferung bezahlt wird.
 */
export function invoiceMail(
  b: MailBooking,
  o: { title: string; amount: number | null; pay: "ueberweisung" | "bar_abholung" | "bar_lieferung" | "bezahlt"; dueText: string | null; bank: MailBank | null }
) {
  const sie = isSie(b);
  const url = portalUrl();
  const intro = sie
    ? `anbei erhalten Sie die <strong>${esc(o.title)}</strong> für Ihr Event am <strong>${esc(formatDateGerman(b.event_date))}</strong>. Sie finden sie außerdem jederzeit in Ihrem Kundenportal unter „Zahlung“.`
    : `anbei bekommst du die <strong>${esc(o.title)}</strong> für dein Event am <strong>${esc(formatDateGerman(b.event_date))}</strong>. Du findest sie außerdem jederzeit in deinem Kundenportal unter „Zahlung“.`;
  const box =
    o.pay === "ueberweisung" && o.amount != null
      ? bankBox(b, o.bank, o.amount)
      : { html: "", text: "" };
  const payLine =
    o.pay === "ueberweisung"
      ? o.dueText
        ? sie ? `Bitte überweisen Sie den Betrag ${esc(o.dueText)}.` : `Bitte überweise den Betrag ${esc(o.dueText)}.`
        : ""
      : o.pay === "bezahlt"
        ? "Der Betrag ist bereits bezahlt – vielen Dank!"
        : sie
          ? `Wie vereinbart zahlen Sie ${o.amount != null ? `den Betrag von <strong>${esc(euro2(o.amount))}</strong> ` : ""}bar bei der ${o.pay === "bar_abholung" ? "Abholung" : "Lieferung"}.`
          : `Wie vereinbart zahlst du ${o.amount != null ? `den Betrag von <strong>${esc(euro2(o.amount))}</strong> ` : ""}bar bei der ${o.pay === "bar_abholung" ? "Abholung" : "Lieferung"}.`;
  const portal = url
    ? `<p style="margin:18px 0"><a href="${esc(url)}" style="display:inline-block;padding:12px 22px;border-radius:10px;background:#a87731;color:#ffffff;text-decoration:none;font-weight:600">Zum Kundenportal</a></p>`
    : "";
  return {
    subject: `${o.title} · ${b.booking_code}`,
    html: layout(o.title, `<p style="line-height:1.6">${esc(greeting(b))},</p><p style="line-height:1.6">${intro}</p>${payLine ? `<p style="line-height:1.6">${payLine}</p>` : ""}${box.html}${portal}<p style="color:#6f7882;font-size:13px;line-height:1.6">${esc(TAX)}</p>`),
    text: `${greeting(b)},\n\n${stripTags(intro)}\n\n${payLine ? stripTags(payLine) + "\n\n" : ""}${box.text ? box.text + "\n\n" : ""}${url ? `Kundenportal: ${url}\n\n` : ""}${TAX}\n\n${BRAND}`,
  };
}

/** Restbetrag per Überweisung – Erinnerung ca. 3 Tage vor Fälligkeit. */
export function restTransferReminderMail(b: MailBooking, amount: number, dueDate: string, bank: MailBank | null) {
  const sie = isSie(b);
  const box = bankBox(b, bank, amount);
  const intro = sie
    ? `bald ist es so weit – wir freuen uns auf Ihr Event am <strong>${esc(formatDateGerman(b.event_date))}</strong>! Wie vereinbart ist der Restbetrag bis zum <strong>${esc(formatDateGerman(dueDate))}</strong> per Überweisung fällig:`
    : `bald ist es so weit – wir freuen uns auf dein Event am <strong>${esc(formatDateGerman(b.event_date))}</strong>! Wie vereinbart ist der Restbetrag bis zum <strong>${esc(formatDateGerman(dueDate))}</strong> per Überweisung fällig:`;
  return {
    subject: sie ? `Restzahlung für Ihr Event am ${formatDateGerman(b.event_date)}` : `Restzahlung für dein Event am ${formatDateGerman(b.event_date)}`,
    html: layout("Restzahlung", `<p style="line-height:1.6">${esc(greeting(b))},</p><p style="line-height:1.6">${intro}</p>${box.html}`),
    text: `${greeting(b)},\n\n${stripTags(intro)}\n\n${box.text}\n\n${BRAND}`,
  };
}

/** Selbstabholung: Erinnerung am Tag vor der Abholung – Zeit, Adresse, Rückgabe, ggf. Barbetrag. */
export function pickupReminderMail(b: MailBooking, o: { devices: string; handover: string; ret: string | null; cash: number | null }) {
  const sie = isSie(b);
  const address = `${LANDLORD.street}, ${LANDLORD.zipCity}`;
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  const intro = sie
    ? `morgen holen Sie bei uns ab: <strong>${esc(o.devices)}</strong>. Hier noch einmal alles Wichtige:`
    : `morgen holst du bei uns ab: <strong>${esc(o.devices)}</strong>. Hier noch einmal alles Wichtige:`;
  const rows = [
    ["Abholung", o.handover],
    ["Adresse", address],
    ...(o.ret ? [["Rückgabe", o.ret]] : []),
    ...(o.cash ? [["Bitte bar mitbringen", euro2(o.cash)]] : []),
  ];
  const table = `<table role="presentation" width="100%" style="margin:14px 0;font-size:14px">${rows
    .map(([k, v]) => `<tr><td style="padding:6px 0;color:#6f7882;width:42%">${esc(k)}</td><td style="padding:6px 0;font-weight:600">${k === "Adresse" ? `<a href="${maps}" style="color:#a87731">${esc(v)}</a>` : esc(v)}</td></tr>`)
    .join("")}</table>`;
  const outro = sie
    ? `Sie werden kurz eingewiesen – das dauert nur ein paar Minuten. Falls sich etwas verschiebt, rufen Sie uns gern an: ${esc(LANDLORD.phone)}.`
    : `Wir zeigen dir kurz, wie alles funktioniert – das dauert nur ein paar Minuten. Falls sich etwas verschiebt, ruf uns einfach an: ${esc(LANDLORD.phone)}.`;
  return {
    subject: sie ? `Morgen: Abholung ${o.devices} (${b.booking_code})` : `Morgen holst du ${o.devices} ab 📦`,
    html: layout(sie ? "Erinnerung an die Abholung" : "Morgen ist Abholung", `<p style="line-height:1.6">${esc(greeting(b))},</p><p style="line-height:1.6">${intro}</p>${table}<p style="color:#6f7882;font-size:13px;line-height:1.6">${outro}</p>`),
    text: `${greeting(b)},\n\n${stripTags(intro)}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${stripTags(outro)}\n\n${BRAND}`,
  };
}

/** Barzahlung bei Lieferung bzw. Abholung – kurzer Hinweis 1–2 Tage vorher. */
export function cashReminderMail(b: MailBooking, amount: number, opts: { pickup?: boolean; full?: boolean } = {}) {
  const sie = isSie(b);
  const what = opts.full ? "den Betrag" : "den Restbetrag";
  const when = opts.pickup ? "bei der Abholung" : "bei der Lieferung";
  const intro = sie
    ? `morgen bzw. übermorgen ist es so weit – wir freuen uns auf Ihr Event! Wie vereinbart zahlen Sie ${what} von <strong>${esc(euro2(amount))}</strong> bar ${when}. Bitte halten Sie den Betrag möglichst passend bereit${opts.pickup ? "" : " bzw. geben Sie ihn Ihrem Ansprechpartner vor Ort mit"}. Sie erhalten dafür selbstverständlich eine Rechnung mit Zahlungsvermerk.`
    : `bald ist es so weit – wir freuen uns auf dein Event! Wie vereinbart zahlst du ${what} von <strong>${esc(euro2(amount))}</strong> bar ${when}. Bitte halte den Betrag möglichst passend bereit${opts.pickup ? "" : " oder gib ihn deinem Ansprechpartner vor Ort mit"}. Du bekommst dafür natürlich eine Rechnung mit Zahlungsvermerk.`;
  return {
    subject: sie ? `Bald ist es so weit – Zahlung bar ${when}` : `Bald ist es so weit! Kurzer Hinweis zur Barzahlung`,
    html: layout(sie ? "Bald ist es so weit" : "Bald ist es so weit 🎉", `<p style="line-height:1.6">${esc(greeting(b))},</p><p style="line-height:1.6">${intro}</p>`),
    text: `${greeting(b)},\n\n${stripTags(intro)}\n\n${BRAND}`,
  };
}

/** Sammel-Mail an dich: Anfragen, die seit über 24 Stunden auf Bestätigung warten. */
export function waitingInquiriesMail(list: { booking_code: string; customer_name: string | null; couple_names: string; event_date: string; lifecycle: string }[]) {
  const url = portalUrl();
  const rows = list
    .map((w) => `<tr><td style="padding:4px 0">${esc(w.booking_code)}</td><td>${esc(w.customer_name || w.couple_names)}</td><td style="text-align:right">${esc(formatDateGerman(w.event_date))}</td></tr>`)
    .join("");
  return {
    subject: `${list.length} Anfrage${list.length > 1 ? "n warten" : " wartet"} seit über 24 Stunden`,
    html: layout(
      "Kunden warten auf deine Rückmeldung",
      `<p style="line-height:1.6">Diese Anfragen sind seit mehr als 24 Stunden offen. Den Kunden wurde eine Rückmeldung innerhalb von 24 Stunden versprochen:</p>
<table role="presentation" width="100%" style="font-size:14px;margin:12px 0">${rows}</table>
${url ? `<p><a href="${esc(url)}/admin/anfragen" style="display:inline-block;padding:12px 22px;border-radius:10px;background:#a87731;color:#ffffff;text-decoration:none;font-weight:600">Jetzt bestätigen</a></p>` : ""}`
    ),
    text: `Offene Anfragen (> 24 Std.):\n${list.map((w) => `- ${w.booking_code} ${w.customer_name || w.couple_names} (${formatDateGerman(w.event_date)})`).join("\n")}${url ? `\n${url}/admin/anfragen` : ""}`,
  };
}

/**
 * Firmenkunden, ca. 3 Monate vor dem Jahrestag: "Nächstes Jahr wieder?"
 * Vorschlag: gleicher Wochentag im Folgejahr (Datum + 364 Tage).
 */
export function rebookingMail(b: MailBooking, suggestedDate: string, bookingLink: string) {
  const last = formatDateGerman(b.event_date);
  const next = new Date(suggestedDate + "T12:00:00Z").toLocaleDateString("de-DE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin",
  });
  const what = b.occasion ? `Ihrer Veranstaltung „${b.occasion}“` : "Ihrer Veranstaltung";
  const packages = (b.inquiry_items?.packages ?? []).map((p) => p.name).join(", ");
  const intro = `am <strong>${esc(last)}</strong> durften wir bei ${esc(what)} dabei sein – vielen Dank noch einmal für Ihr Vertrauen! Planen Sie im nächsten Jahr wieder etwas Ähnliches? Beliebte Termine sind erfahrungsgemäß früh vergeben.`;
  const offer = `Gern halten wir Ihnen einen Termin frei, zum Beispiel <strong>${esc(next)}</strong>${packages ? ` – wieder mit ${esc(packages)}` : ""}. Ein Klick genügt, die Anfrage ist bereits vorausgefüllt:`;
  return {
    subject: `Nächstes Jahr wieder dabei? – ${BRAND}`,
    html: layout(
      "Nächstes Jahr wieder dabei?",
      `<p style="line-height:1.6">${esc(greeting(b))},</p><p style="line-height:1.6">${intro}</p><p style="line-height:1.6">${offer}</p>
<p style="margin:22px 0;text-align:center"><a href="${esc(bookingLink)}" style="display:inline-block;padding:12px 22px;border-radius:10px;background:#a87731;color:#ffffff;text-decoration:none;font-weight:600">Termin ${esc(formatDateGerman(suggestedDate))} anfragen</a></p>
<p style="color:#6f7882;font-size:13px;line-height:1.6">Anderer Termin oder andere Idee? Antworten Sie einfach auf diese E-Mail – wir melden uns umgehend.</p>`
    ),
    text: `${greeting(b)},\n\n${stripTags(intro)}\n\n${stripTags(offer)}\n${bookingLink}\n\n${BRAND}`,
  };
}

/** Wochenplan für dich (Sonntagabend): Einsätze der kommenden Woche, To-dos, Geräte-Check, Vorschau. */
export function weeklyPlanMail(plan: WeeklyPlan) {
  const url = portalUrl();
  const short = (iso: string) => new Date(iso + "T12:00:00Z").toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", timeZone: "Europe/Berlin" });
  const dayName = (iso: string) => new Date(iso + "T12:00:00Z").toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "2-digit", timeZone: "Europe/Berlin" });
  const KIND = { aufbau: ["🚚", "Aufbau"], event: ["🎉", "Event"], abbau: ["📦", "Abbau"], termin: ["📌", "Eigener Termin"] } as const;
  const label = (i: WeeklyPlanItem) =>
    i.selfService ? (i.kind === "aufbau" ? "Abholung bei dir" : i.kind === "abbau" ? "Rückgabe bei dir" : "Event") : KIND[i.kind][1];

  const daysHtml = plan.days
    .filter((d) => d.items.length)
    .map((d) => `<h3 style="margin:22px 0 8px;font-family:Georgia,serif;font-size:17px;color:#1f2227;border-bottom:1px solid #ebdab3;padding-bottom:4px">${esc(dayName(d.date))}</h3>${d.items
      .map((i) => `<div style="margin:0 0 10px;padding:10px 12px;border-radius:10px;background:${i.warn ? "#fff7ed" : "#faf8f4"};border:1px solid ${i.warn ? "#fed7aa" : "#efe9dd"};font-size:14px;line-height:1.5">
<div><strong>${KIND[i.kind][0]} ${esc(label(i))}${i.time ? ` · ${esc(i.time)}` : ""}</strong></div>
<div>${esc(i.title)}${i.kind === "termin" ? "" : ` <span style="color:#9ea5ad">(${esc(i.code)})</span>`}</div>
${i.devices ? `<div style="color:#4f5761">📸 ${esc(i.devices)}${i.place ? ` · 📍 ${esc(i.place)}` : ""}</div>` : ""}
${i.address ? `<div style="color:#4f5761">🧭 ${esc(i.address)}${i.phone ? ` · ☎️ ${esc(i.phone)}` : ""}</div>` : ""}
${i.notes.length ? `<div style="margin-top:4px;color:${i.warn ? "#9a3412" : i.kind === "termin" ? "#4f5761" : "#047857"}">${i.notes.map((n) => esc(n)).join(" · ")}</div>` : ""}
</div>`).join("")}`)
    .join("");

  const empty = `<p style="line-height:1.6;color:#6f7882">Diese Woche stehen keine Einsätze an. 🌿</p>`;
  const alerts = plan.deviceAlerts.length
    ? `<h2 style="margin:26px 0 8px;font-size:16px">🔧 Geräte-Check</h2><ul style="margin:0;padding-left:18px;line-height:1.7;font-size:14px">${plan.deviceAlerts.map((a) => `<li><strong>${esc(short(a.date))}</strong>: ${esc(a.text)}</li>`).join("")}</ul>`
    : "";
  const todos = plan.todos.length
    ? `<h2 style="margin:26px 0 8px;font-size:16px">⚠️ Noch offen (nächste 4 Wochen)</h2><ul style="margin:0;padding-left:18px;line-height:1.7;font-size:14px">${plan.todos.map((t) => `<li><strong>${esc(short(t.date))}</strong> ${esc(t.title)} <span style="color:#9ea5ad">(${esc(t.code)})</span>: ${esc(t.text)}</li>`).join("")}</ul>`
    : `<p style="margin-top:22px;color:#047857">✓ Keine offenen Punkte in den nächsten 4 Wochen.</p>`;
  const next = `<h2 style="margin:26px 0 8px;font-size:16px">👀 Vorschau Woche danach</h2>${plan.nextWeek.length
    ? `<ul style="margin:0;padding-left:18px;line-height:1.7;font-size:14px">${plan.nextWeek.map((n) => `<li><strong>${esc(short(n.date))}</strong> ${esc(n.title)}${n.devices ? ` · ${esc(n.devices)}` : ""}${n.place ? ` · ${esc(n.place)}` : ""}</li>`).join("")}</ul>`
    : `<p style="color:#6f7882;font-size:14px">Noch keine Einsätze.</p>`}`;
  const link = url
    ? `<p style="margin:24px 0 0"><a href="${esc(url)}/admin/kalender" style="display:inline-block;padding:12px 22px;border-radius:10px;background:#a87731;color:#ffffff;text-decoration:none;font-weight:600">Zum Kalender</a></p>`
    : "";

  const range = `${short(plan.weekStart)}–${short(plan.weekEnd)}`;
  const subject = `Wochenplan ${range} · ${plan.eventCount === 1 ? "1 Einsatz" : `${plan.eventCount} Einsätze`}${plan.todos.length ? ` · ${plan.todos.length} To-do${plan.todos.length > 1 ? "s" : ""}` : ""}`;

  const textDays = plan.days
    .filter((d) => d.items.length)
    .map((d) => `${dayName(d.date)}\n${d.items.map((i) => `- ${label(i)}${i.time ? ` (${i.time})` : ""}: ${i.title}${i.kind === "termin" ? "" : ` [${i.code}] – ${i.devices}`}${i.place ? `, ${i.place}` : ""}${i.address ? `\n  ${i.address}${i.phone ? `, ${i.phone}` : ""}` : ""}${i.notes.length ? `\n  ${i.notes.join(" · ")}` : ""}`).join("\n")}`)
    .join("\n\n");
  const text = [
    `Wochenplan ${range}`,
    textDays || "Diese Woche stehen keine Einsätze an.",
    plan.deviceAlerts.length ? `Geräte-Check:\n${plan.deviceAlerts.map((a) => `- ${short(a.date)}: ${a.text}`).join("\n")}` : "",
    plan.todos.length ? `Noch offen:\n${plan.todos.map((t) => `- ${short(t.date)} ${t.title} (${t.code}): ${t.text}`).join("\n")}` : "Keine offenen Punkte.",
    `Vorschau Woche danach:\n${plan.nextWeek.map((n) => `- ${short(n.date)} ${n.title}${n.devices ? ` – ${n.devices}` : ""}`).join("\n") || "Noch keine Einsätze."}`,
    url ? `Kalender: ${url}/admin/kalender` : "",
  ].filter(Boolean).join("\n\n");

  return {
    subject,
    html: layout(`Deine Woche ${range}`, `${daysHtml || empty}${alerts}${todos}${next}${link}`),
    text,
  };
}

/** VisionBooth: Verwaltungs-Link für den Kunden (Design, QR-Code, Galerie). */
/** Online-Buchung: Vertragsbestätigung mit Widerrufsbelehrung (dauerhafter Datenträger, § 312f BGB). */
export interface VbOrderConfirmation {
  plan: string;
  price: number;
  /** Listenpreis, falls ein Rabattcode eingelöst wurde */
  listPrice?: number;
  orderNo: string;
}

function vbContractBlock(c: VbOrderConfirmation): { html: string; text: string } {
  const fmt = (n: number) => n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
  const eur = c.listPrice != null ? `${fmt(c.price)} (statt ${fmt(c.listPrice)} – Gutschein eingelöst)` : fmt(c.price);
  const para = (t: string) => `<p style="margin:6px 0;line-height:1.5">${esc(t)}</p>`;
  const sections = VB_WIDERRUF.map((s) => `<p style="margin:14px 0 4px;font-weight:600">${esc(s.title)}</p>${s.blocks.map((b) => (typeof b === "string" ? para(b) : "")).join("")}`).join("");
  const form = VB_WIDERRUF_FORM.map((l, i) => (i === 0 ? `<p style="margin:14px 0 4px;font-weight:600">${esc(l)}</p>` : para(l))).join("");
  const html = `<div style="margin-top:26px;padding-top:16px;border-top:1px solid #e4e6e8;font-size:12.5px;color:#4f5761">
<p style="margin:0 0 6px;font-size:14px;font-weight:600;color:#1f2227">Deine Buchung (Vertragsbestätigung)</p>
${para(`Paket „${c.plan}“ · ${eur} (Endpreis, gemäß § 19 UStG ohne Umsatzsteuer) · Bestellnummer ${c.orderNo}`)}
${para("Wie von dir verlangt, haben wir deine VisionBooth sofort nach der Zahlung eingerichtet – also vor Ablauf der Widerrufsfrist. Bei einem Widerruf zahlst du anteiligen Wertersatz; mit vollständiger Vertragserfüllung erlischt das Widerrufsrecht.")}
${para(`Es gelten unsere AGB (Stand ${VB_LEGAL_VERSION}): visionbooth.de/vb/agb`)}
${sections}${form}
</div>`;
  const text = `

——
Deine Buchung (Vertragsbestätigung)
Paket „${c.plan}“ · ${eur} (Endpreis, gemäß § 19 UStG ohne Umsatzsteuer) · Bestellnummer ${c.orderNo}
Wie von dir verlangt, haben wir deine VisionBooth sofort nach der Zahlung eingerichtet – also vor Ablauf der Widerrufsfrist. Bei einem Widerruf zahlst du anteiligen Wertersatz; mit vollständiger Vertragserfüllung erlischt das Widerrufsrecht.
AGB (Stand ${VB_LEGAL_VERSION}): visionbooth.de/vb/agb

${legalText(VB_WIDERRUF)}

${VB_WIDERRUF_FORM.join("\n")}`;
  return { html, text };
}

export function vbManageMail(o: { name: string | null; title: string; date: string | null; url: string; order?: VbOrderConfirmation }) {
  const hello = o.name ? `Hallo ${o.name.split(" ")[0]}` : "Hallo";
  const when = o.date ? ` am <strong>${esc(formatDateGerman(o.date))}</strong>` : "";
  const contract = o.order ? vbContractBlock(o.order) : { html: "", text: "" };
  return {
    subject: `Deine VisionBooth für „${o.title}“ – ${BRAND}`,
    html: layout(
      "Deine VisionBooth ist bereit 📸",
      `<p style="line-height:1.6">${esc(hello)},</p>
<p style="line-height:1.6">deine digitale Fotobox für „${esc(o.title)}“${when} ist eingerichtet. In drei kurzen Schritten ist sie startklar:</p>
<ol style="line-height:1.8;padding-left:20px">
<li><strong>Design &amp; Text anpassen</strong> – Vorlage, Namen, Farbe und Logo, mit Live-Vorschau</li>
<li><strong>Spiele auswählen</strong> – Foto-Missionen, Glücksrad &amp; Co.</li>
<li><strong>QR-Aufsteller drucken</strong> oder den Gäste-Link teilen – fertig!</li>
</ol>
<p style="line-height:1.6">Nach dem Event findest du dort alle Fotos und kannst sie als ZIP herunterladen.</p>
<div style="margin:22px 0;text-align:center"><a href="${esc(o.url)}" style="display:inline-block;padding:13px 24px;border-radius:10px;background:#a87731;color:#ffffff;text-decoration:none;font-weight:600">Meine VisionBooth gestalten</a></div>
<p style="color:#6f7882;font-size:13px;line-height:1.6">Bitte gib diesen Link nicht weiter – wer ihn hat, kann deine VisionBooth bearbeiten. Fragen? Ruf uns an oder schreib per WhatsApp: 0176 22748363.</p>${contract.html}`
    ),
    text: `${hello},\n\ndeine digitale Fotobox für „${o.title}“ ist eingerichtet. In drei Schritten startklar:\n1. Design & Text anpassen\n2. Spiele auswählen\n3. QR-Aufsteller drucken oder Link teilen\n\nDein Link:\n${o.url}\n\nBitte gib diesen Link nicht weiter.\nFragen: 0176 22748363 (Telefon/WhatsApp)\n\n${BRAND}${contract.text}`,
  };
}

export function vbInvoiceMail(o: { name: string | null; title: string; number: string; amount: number }) {
  const hello = o.name ? `Hallo ${o.name.split(" ")[0]}` : "Hallo";
  const euro = o.amount.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
  return {
    subject: `Deine Rechnung ${o.number} – VisionBooth – ${BRAND}`,
    html: layout(
      "Danke für deine Buchung 🧾",
      `<p style="line-height:1.6">${esc(hello)},</p>
<p style="line-height:1.6">vielen Dank für deine Buchung der VisionBooth für „${esc(o.title)}“. Im Anhang findest du deine Rechnung <strong>${esc(o.number)}</strong> über <strong>${esc(euro)}</strong>.</p>
<p style="line-height:1.6">Der Betrag ist bereits bezahlt – du musst nichts weiter tun.</p>
<p style="color:#6f7882;font-size:13px;line-height:1.6">Fragen zur Rechnung? Antworte einfach auf diese E-Mail oder ruf uns an: 0176 22748363.</p>`
    ),
    text: `${hello},\n\nvielen Dank für deine Buchung der VisionBooth für „${o.title}“. Im Anhang findest du deine Rechnung ${o.number} über ${euro}. Der Betrag ist bereits bezahlt.\n\nFragen: 0176 22748363\n\n${BRAND}`,
  };
}

// ---------- VisionBooth: Erinnerungen ----------

const vbButton = (url: string, label: string) =>
  `<div style="margin:22px 0;text-align:center"><a href="${esc(url)}" style="display:inline-block;padding:13px 24px;border-radius:10px;background:#a87731;color:#ffffff;text-decoration:none;font-weight:600">${esc(label)}</a></div>`;

/** Eine Woche vorher: gestalten, QR-Aufsteller drucken, Link teilen. */
export function vbBeforeMail(o: { name: string | null; title: string; date: string; days: number; manageUrl: string; posterUrl: string }) {
  const hello = o.name ? `Hallo ${o.name.split(" ")[0]}` : "Hallo";
  const when = o.days === 1 ? "morgen" : `in ${o.days} Tagen`;
  return {
    subject: `${o.days === 1 ? "Morgen" : `In ${o.days} Tagen`} geht's los – eure VisionBooth für „${o.title}“`,
    html: layout(
      "Bald ist es so weit 🎉",
      `<p style="line-height:1.6">${esc(hello)},</p>
<p style="line-height:1.6">${when} ist euer Event „${esc(o.title)}“ am <strong>${esc(formatDateGerman(o.date))}</strong>. Damit eure Gäste direkt loslegen können, kurz checken:</p>
<ul style="line-height:1.8;padding-left:20px">
<li>✅ Design, Text und Logo passen?</li>
<li>🖨️ QR-Aufsteller ausgedruckt (am besten auf festes Papier)?</li>
<li>🎯 Missionen oder Spiele gewählt?</li>
<li>📺 Foto-Wand: Laptop mit Beamer oder TV bereitstellen</li>
</ul>
${vbButton(o.manageUrl, "Meine VisionBooth öffnen")}
<p style="text-align:center;font-size:13px"><a href="${esc(o.posterUrl)}" style="color:#a87731">QR-Aufsteller direkt drucken</a></p>
<p style="color:#6f7882;font-size:13px;line-height:1.6">Fragen? Ruf uns an oder schreib per WhatsApp: 0176 22748363.</p>`
    ),
    text: `${hello},\n\n${when} ist euer Event „${o.title}“. Kurz checken: Design, QR-Aufsteller gedruckt, Missionen/Spiele, Foto-Wand.\n\nMeine VisionBooth: ${o.manageUrl}\nQR-Aufsteller: ${o.posterUrl}\n\nFragen: 0176 22748363\n\n${BRAND}`,
  };
}

/** Tag danach: Danke + Galerie-Link zum Teilen mit den Gästen. */
export interface VbHighlights {
  aiPhotos: number;
  guests: number;
  winner: { name: string; points: number } | null;
  topPhoto: { url: string; likes: number } | null;
}

function vbHighlightsHtml(o: { photos: number; h: VbHighlights }) {
  const tiles = [
    [String(o.photos), "Fotos"],
    ...(o.h.aiPhotos ? [[String(o.h.aiPhotos), "KI-Verwandlungen"]] : []),
    ...(o.h.guests ? [[String(o.h.guests), "Gäste bei den Missionen"]] : []),
  ];
  const cells = tiles
    .map(([n, l]) => `<td style="padding:10px 6px;text-align:center;background:#faf6ef;border-radius:10px"><div style="font-size:24px;font-weight:700;color:#a87731">${esc(n)}</div><div style="font-size:12px;color:#6f7882">${esc(l)}</div></td>`)
    .join('<td style="width:8px"></td>');
  const photo = o.h.topPhoto
    ? `<p style="margin:20px 0 6px;font-weight:600">❤️ Foto des Abends${o.h.topPhoto.likes > 1 ? ` (${o.h.topPhoto.likes} Herzen)` : ""}</p><img src="${esc(o.h.topPhoto.url)}" alt="Foto des Abends" style="display:block;width:100%;max-width:480px;border-radius:12px" />`
    : "";
  const winner = o.h.winner ? `<p style="margin:16px 0 0;line-height:1.6">🏆 <strong>Missions-Sieger:</strong> ${esc(o.h.winner.name)} mit ${o.h.winner.points} Punkten – Glückwunsch!</p>` : "";
  return `<table role="presentation" style="width:100%;border-collapse:separate;margin:18px 0 4px"><tr>${cells}</tr></table>${winner}${photo}`;
}

export function vbAfterMail(o: { name: string | null; title: string; photos: number; galleryUrl: string; manageUrl: string; deleteDate: string; highlights?: VbHighlights }) {
  const hello = o.name ? `Hallo ${o.name.split(" ")[0]}` : "Hallo";
  const h = o.highlights;
  return {
    subject: h ? `Eure Highlights von „${o.title}“ ✨ ${o.photos} Fotos` : `${o.photos} Fotos von „${o.title}“ warten auf euch 📸`,
    html: layout(
      "Danke – was für ein Fest! 💛",
      `<p style="line-height:1.6">${esc(hello)},</p>
<p style="line-height:1.6">was für ein Fest! Hier sind eure Highlights auf einen Blick:</p>${h ? vbHighlightsHtml({ photos: o.photos, h }) : ""}
<p style="line-height:1.6;margin-top:20px">Alle Erinnerungen findet ihr an einem Ort – teilt den Galerie-Link gern mit euren Gästen, dort können sie auch eigene Handy-Fotos dazulegen:</p>
${vbButton(o.galleryUrl, "Zur Galerie")}
<p style="line-height:1.6">Tipp: In der Galerie könnt ihr mit „Alle (ZIP)“ alle Fotos auf einmal herunterladen. Die Fotos werden am <strong>${esc(formatDateGerman(o.deleteDate))}</strong> automatisch gelöscht.</p>
<p style="color:#6f7882;font-size:13px;line-height:1.6">Hat euch die VisionBooth gefallen? Über eine kurze Bewertung freuen wir uns riesig. Fragen: 0176 22748363.</p>`
    ),
    text: `${hello},\n\neure Gäste haben ${o.photos} Fotos geteilt${h?.aiPhotos ? `, davon ${h.aiPhotos} KI-Verwandlungen` : ""}.${h?.winner ? ` Missions-Sieger: ${h.winner.name} (${h.winner.points} Punkte).` : ""} Galerie (gern an die Gäste weitergeben): ${o.galleryUrl}\n\nAlle Fotos als ZIP: in der Galerie „Alle (ZIP)“. Automatische Löschung am ${formatDateGerman(o.deleteDate)}.\n\n${BRAND}`,
  };
}

/** 7 Tage vor der Löschung: jetzt sichern. */
export function vbDeletionMail(o: { name: string | null; title: string; photos: number; days: number; deleteDate: string; galleryUrl: string }) {
  const hello = o.name ? `Hallo ${o.name.split(" ")[0]}` : "Hallo";
  return {
    subject: `Nur noch ${o.days} Tage: Fotos von „${o.title}“ jetzt sichern`,
    html: layout(
      "Jetzt eure Fotos sichern ⏳",
      `<p style="line-height:1.6">${esc(hello)},</p>
<p style="line-height:1.6">aus Datenschutzgründen werden die <strong>${o.photos} Fotos</strong> von „${esc(o.title)}“ am <strong>${esc(formatDateGerman(o.deleteDate))}</strong> automatisch und endgültig gelöscht.</p>
<p style="line-height:1.6">Ladet sie vorher mit einem Klick als ZIP herunter – in der Galerie oben auf <strong>„Alle (ZIP)“</strong> (am besten am Computer).</p>
${vbButton(o.galleryUrl, "Fotos jetzt herunterladen")}
<p style="color:#6f7882;font-size:13px;line-height:1.6">Ihr braucht mehr Zeit? Meldet euch kurz bei uns: 0176 22748363.</p>`
    ),
    text: `${hello},\n\ndie ${o.photos} Fotos von „${o.title}“ werden am ${formatDateGerman(o.deleteDate)} automatisch gelöscht. Jetzt als ZIP sichern: ${o.galleryUrl} (oben „Alle (ZIP)“).\n\nMehr Zeit nötig? 0176 22748363\n\n${BRAND}`,
  };
}

// ---------------------------------------------------------------------------
// Angebote (Weg B): Rückfrage beantwortet / Anpassung → Kunde nimmt per Link an
// ---------------------------------------------------------------------------

export interface MailOffer {
  message: string;
  validUntil: string;
  url: string;
  version: number;
  /** Termin ist für den Kunden reserviert (lifecycle reserviert). */
  reserved: boolean;
}

/** Angebot an den Kunden – auch als Erinnerung (3 Tage vor Ablauf bzw. nach 3 Tagen ohne Antwort). */
export function offerMail(b: MailBooking, o: MailOffer, opts: { reminder?: boolean } = {}) {
  const sie = isSie(b);
  const until = formatDateGerman(o.validUntil);
  const updated = o.version > 1;
  const t = sie
    ? {
        subject: opts.reminder ? `Erinnerung: Ihr Angebot ${b.booking_code} – gültig bis ${until}` : `${updated ? "Ihr angepasstes" : "Ihr persönliches"} Angebot ${b.booking_code} – ${BRAND}`,
        title: opts.reminder ? "Ihr Angebot wartet noch auf Sie" : updated ? "Ihr angepasstes Angebot" : "Ihr persönliches Angebot",
        intro: opts.reminder
          ? `kurze Erinnerung: Ihr Angebot ist noch <strong>bis ${esc(until)}</strong> gültig.`
          : updated
            ? "vielen Dank für Ihre Rückmeldung! Wir haben das Angebot für Sie angepasst."
            : "vielen Dank für Ihre Anfrage! Bevor wir verbindlich bestätigen, haben wir Ihnen ein persönliches Angebot zusammengestellt.",
        reserved: `Das Angebot gilt bis <strong>${esc(until)}</strong>${o.reserved ? " – bis dahin ist Ihr Termin für Sie reserviert" : ""}.`,
        how: "Mit einem Klick nehmen Sie an – danach erhalten Sie sofort die Auftragsbestätigung mit Ihrem Zugang zum Kundenportal. Passt noch etwas nicht? Dann können Sie dort auch eine Änderung wünschen.",
        button: "Angebot ansehen & antworten",
        call: "Fragen? Antworten Sie einfach auf diese E-Mail oder rufen Sie uns an: 0176 22748363.",
      }
    : {
        subject: opts.reminder ? `Erinnerung: Dein Angebot ${b.booking_code} – gültig bis ${until}` : `${updated ? "Dein angepasstes" : "Dein persönliches"} Angebot ${b.booking_code} – ${BRAND}`,
        title: opts.reminder ? "Dein Angebot wartet noch auf dich" : updated ? "Dein angepasstes Angebot ✨" : "Dein persönliches Angebot ✨",
        intro: opts.reminder
          ? `kurze Erinnerung: Dein Angebot ist noch <strong>bis ${esc(until)}</strong> gültig.`
          : updated
            ? "danke für deine Rückmeldung! Wir haben das Angebot für dich angepasst."
            : "vielen Dank für deine Anfrage! Bevor wir verbindlich bestätigen, haben wir dir ein persönliches Angebot zusammengestellt.",
        reserved: `Das Angebot gilt bis <strong>${esc(until)}</strong>${o.reserved ? " – bis dahin ist dein Termin für dich reserviert" : ""}.`,
        how: "Mit einem Klick nimmst du an – danach bekommst du sofort die Auftragsbestätigung mit deinem Zugang zum Kundenportal. Passt noch etwas nicht? Dann kannst du dort auch eine Änderung wünschen.",
        button: "Angebot ansehen & antworten",
        call: "Fragen? Antworte einfach auf diese E-Mail oder ruf uns an: 0176 22748363.",
      };
  const answer = o.message.trim()
    ? `<div style="margin:18px 0;padding:14px 16px;border-radius:12px;background:#fbf8f1;border:1px solid #ebdab3;line-height:1.6;white-space:pre-wrap">${esc(o.message.trim())}</div>`
    : "";
  return {
    subject: t.subject,
    html: layout(
      t.title,
      `<p style="line-height:1.6">${esc(greeting(b))},</p>
<p style="line-height:1.6">${t.intro}</p>
${answer}
${details(b)}
<p style="margin-top:18px;line-height:1.6">${t.reserved}</p>
<p style="margin:22px 0;text-align:center"><a href="${esc(o.url)}" style="display:inline-block;padding:13px 24px;border-radius:10px;background:#a87731;color:#ffffff;text-decoration:none;font-weight:600">${t.button}</a></p>
<p style="line-height:1.6;color:#4f5761">${t.how}</p>
<p style="margin-top:12px;line-height:1.6">${t.call}</p>
<p style="margin-top:12px;color:#6f7882;font-size:13px;line-height:1.6">${TAX}</p>`
    ),
    text: `${greeting(b)},\n\n${stripTags(t.intro)}\n\n${o.message.trim()}\n\nAnfrage: ${b.booking_code}\nDatum: ${formatDateGerman(b.event_date)}\n${itemsRows(b).text}\n\n${stripTags(t.reserved)}\n\nAngebot ansehen & antworten: ${o.url}\n\n${stripTags(t.how)}\n\n${TAX}\n\n${BRAND} · 0176 22748363`,
  };
}

/** Angebot ist abgelaufen – Termin wieder frei, freundlich die Tür offen halten. */
export function offerExpiredMail(b: MailBooking) {
  const sie = isSie(b);
  const body = sie
    ? "Ihr Angebot ist leider abgelaufen, deshalb haben wir den Termin wieder freigegeben. Sie möchten doch noch buchen? Antworten Sie einfach auf diese E-Mail – ist der Termin noch frei, schicken wir Ihnen gern ein neues Angebot."
    : "dein Angebot ist leider abgelaufen, deshalb haben wir den Termin wieder freigegeben. Du möchtest doch noch buchen? Antworte einfach auf diese E-Mail – ist der Termin noch frei, schicken wir dir gern ein neues Angebot.";
  return {
    subject: `${sie ? "Ihr" : "Dein"} Angebot ${b.booking_code} ist abgelaufen – ${BRAND}`,
    html: layout("Angebot abgelaufen", `<p style="line-height:1.6">${esc(greeting(b))},</p>\n<p style="line-height:1.6">${body}</p>\n${details(b)}`),
    text: `${greeting(b)},\n\n${body}\n\nAnfrage: ${b.booking_code}\nDatum: ${formatDateGerman(b.event_date)}\n\n${BRAND} · 0176 22748363`,
  };
}

export type OfferAdminEvent = "bestaetigt" | "angenommen_belegt" | "aenderung" | "abgelehnt" | "abgelaufen";

/** Info an dich, sobald der Kunde auf ein Angebot reagiert (oder es abläuft). */
export function offerAdminMail(b: MailBooking & { email: string | null; phone: string | null }, event: OfferAdminEvent, note: string | null) {
  const head: Record<OfferAdminEvent, string> = {
    bestaetigt: "✅ Angebot angenommen – automatisch bestätigt",
    angenommen_belegt: "⚠️ Angebot angenommen – Gerät inzwischen belegt, bitte selbst bestätigen",
    aenderung: "✏️ Änderungswunsch zum Angebot",
    abgelehnt: "❌ Angebot abgelehnt – Termin ist wieder frei",
    abgelaufen: "⌛ Angebot abgelaufen – Termin ist wieder frei",
  };
  const url = portalUrl();
  return {
    subject: `${head[event]} · ${b.booking_code} · ${formatDateGerman(b.event_date)}`,
    html: layout(
      "Angebot",
      `<p><strong>${esc(head[event])}</strong></p>
<p style="line-height:1.6">${esc(b.customer_name || b.couple_names)}<br>${esc(b.email)}${b.phone ? ` · ${esc(b.phone)}` : ""}</p>
${note ? `<p style="margin-top:14px;padding:12px;background:#f4f5f6;border-radius:10px;white-space:pre-wrap">${esc(note)}</p>` : ""}
${details(b)}
${url ? `<p style="margin-top:18px"><a href="${esc(url)}/admin/anfragen" style="color:#a87731;font-weight:600">Im Admin öffnen →</a></p>` : ""}`
    ),
    text: `${head[event]}\n${b.customer_name || b.couple_names} · ${b.email ?? ""} ${b.phone ?? ""}\n${formatDateGerman(b.event_date)}\n${note ? `\n${note}\n` : ""}\n${itemsRows(b).text}`,
    replyTo: b.email ?? undefined,
  };
}
