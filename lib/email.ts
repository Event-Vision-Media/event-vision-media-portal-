import "server-only";
import { followupLine, formatEuro } from "@/lib/catalog";
import { formatDateGerman } from "@/lib/format";

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
}

export async function sendEmail(mail: MailInput): Promise<{ sent: boolean; error?: string }> {
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
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`[email] Versand fehlgeschlagen (${res.status}): ${body}`);
      return { sent: false, error: `http_${res.status}` };
    }
    return { sent: true };
  } catch (err) {
    console.error("[email] Versand fehlgeschlagen:", err);
    return { sent: false, error: "network" };
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
        next: "Wir prüfen jetzt kurz Location und Details. <strong>Innerhalb von 24 Stunden</strong> erhalten Sie von uns die Auftragsbestätigung – zusammen mit Ihrem persönlichen Zugang zum Kundenportal. Dort unterschreiben Sie bequem den Mietvertrag und wählen Ihr Layout.",
        call: "Fragen oder Wünsche? Antworten Sie einfach auf diese E-Mail oder rufen Sie uns an: 0176 22748363.",
      }
    : {
        subject: `Dein Termin ist vorgemerkt – ${BRAND}`,
        title: "Danke – dein Termin ist vorgemerkt! ✨",
        intro: `vielen Dank für deine Anfrage! Dein Wunschtermin ist <strong>für dich vorgemerkt</strong> und wird in der Zeit niemand anderem angeboten.`,
        next: "Wir prüfen jetzt kurz Location und Details. <strong>Innerhalb von 24 Stunden</strong> bekommst du von uns die Auftragsbestätigung – zusammen mit deinem persönlichen Zugang zum Kundenportal. Dort unterschreibst du ganz bequem den Mietvertrag und wählst dein Layout.",
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
  const t = isSie(b)
    ? {
        title: "Ihre Buchung ist bestätigt",
        intro: "gute Nachrichten: Wir haben alles geprüft und bestätigen Ihnen Ihren Termin. Wir freuen uns auf Ihr Event!",
        next: "<strong>Nächster Schritt:</strong> Bitte melden Sie sich mit dem Zugangscode unten im Kundenportal an und unterschreiben Sie dort Ihren Mietvertrag – er ist bereits vorausgefüllt und in ca. 2 Minuten erledigt. Danach erhalten Sie die Rechnung über die Anzahlung. Im Portal wählen Sie außerdem Ihr Layout und sehen jederzeit den Stand Ihrer Buchung.",
      }
    : {
        title: "Deine Buchung ist bestätigt 🎉",
        intro: "gute Nachrichten: Wir haben alles geprüft und bestätigen dir deinen Termin. Wir freuen uns riesig auf dein Event!",
        next: "<strong>Nächster Schritt:</strong> Melde dich mit dem Zugangscode unten im Kundenportal an und unterschreib dort deinen Mietvertrag – er ist schon vorausgefüllt und in ca. 2 Minuten erledigt. Danach bekommst du die Rechnung über die Anzahlung. Im Portal wählst du außerdem dein Layout und siehst jederzeit den Stand deiner Buchung.",
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
export function followupMail(b: MailBooking, reviewUrl: string | null) {
  const sie = isSie(b);
  const url = portalUrl();
  const title = sie ? "Ihre Fotos sind online" : "Deine Fotos sind online 📸";
  const intro = sie
    ? "vielen Dank, dass wir bei Ihrem Event dabei sein durften! Alle Fotos stehen jetzt in Ihrer Online-Galerie im Kundenportal zum Download bereit."
    : "danke, dass wir bei deinem Event dabei sein durften! Alle Fotos stehen jetzt in deiner Online-Galerie im Kundenportal zum Download bereit.";
  const ask = sie
    ? "Hat Ihnen unser Service gefallen? Wir würden uns sehr über eine kurze Google-Bewertung freuen – das hilft uns als kleinem Unternehmen enorm."
    : "Hat es dir gefallen? Wir würden uns riesig über eine kurze Google-Bewertung freuen – das hilft uns als kleinem Unternehmen enorm. 💛";
  const review = reviewUrl
    ? `<p style="margin:22px 0 0;text-align:center"><a href="${esc(reviewUrl)}" style="display:inline-block;padding:12px 22px;border-radius:10px;background:#16181c;color:#ffffff;text-decoration:none;font-weight:600">★★★★★ Bewertung schreiben</a></p>`
    : "";
  return {
    subject: sie ? `Ihre Fotos sind online – ${BRAND}` : `Deine Fotos sind online! – ${BRAND}`,
    html: layout(title, `<p style="line-height:1.6">${esc(greeting(b))},</p><p style="line-height:1.6">${intro}</p>${codeBox(b)}<p style="line-height:1.6">${ask}</p>${review}`),
    text: `${greeting(b)},\n\n${intro}\n\nZugangscode: ${loginCode(b)}${url ? `\n${url}` : ""}\n\n${ask}${reviewUrl ? `\n${reviewUrl}` : ""}\n\n${BRAND}`,
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
export function contractSignedMail(b: MailBooking, contractHtml: string, contractText: string) {
  const sie = isSie(b);
  const url = portalUrl();
  const intro = sie
    ? "vielen Dank – Ihr Mietvertrag ist unterschrieben und damit abgeschlossen. Nachfolgend finden Sie Ihr Exemplar zur Aufbewahrung. Die Rechnung über die Anzahlung erhalten Sie in Kürze gesondert per E-Mail."
    : "danke – dein Mietvertrag ist unterschrieben und damit abgeschlossen! Nachfolgend findest du dein Exemplar zum Aufbewahren. Die Rechnung über die Anzahlung bekommst du in Kürze gesondert per E-Mail.";
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

export function contractAdminMail(b: MailBooking, signer: string) {
  const url = portalUrl();
  return {
    subject: `Mietvertrag unterschrieben: ${b.booking_code} · ${formatDateGerman(b.event_date)}`,
    html: layout(
      "Mietvertrag unterschrieben",
      `<p style="line-height:1.6"><strong>${esc(signer)}</strong> hat den Mietvertrag für <strong>${esc(b.booking_code)}</strong> (${esc(formatDateGerman(b.event_date))}) digital unterschrieben.</p>
${details(b)}
<p style="line-height:1.6"><strong>Nächster Schritt für dich:</strong> Anzahlungsrechnung in Lexware Office schreiben – Verwendungszweck ${esc(b.booking_code)}.</p>
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

/** Barzahlung bei Lieferung – kurzer Hinweis 1–2 Tage vorher. */
export function cashReminderMail(b: MailBooking, amount: number) {
  const sie = isSie(b);
  const intro = sie
    ? `morgen bzw. übermorgen ist es so weit – wir freuen uns auf Ihr Event! Wie vereinbart zahlen Sie den Restbetrag von <strong>${esc(euro2(amount))}</strong> bar bei der Lieferung. Bitte halten Sie den Betrag möglichst passend bereit bzw. geben Sie ihn Ihrem Ansprechpartner vor Ort mit. Sie erhalten dafür selbstverständlich eine Rechnung mit Zahlungsvermerk.`
    : `bald ist es so weit – wir freuen uns auf dein Event! Wie vereinbart zahlst du den Restbetrag von <strong>${esc(euro2(amount))}</strong> bar bei der Lieferung. Bitte halte den Betrag möglichst passend bereit oder gib ihn deinem Ansprechpartner vor Ort mit. Du bekommst dafür natürlich eine Rechnung mit Zahlungsvermerk.`;
  return {
    subject: sie ? `Bald ist es so weit – Restbetrag bar bei Lieferung` : `Bald ist es so weit! Kurzer Hinweis zur Barzahlung`,
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
