import { timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { addDays, endFromText, loadCalendar, todayBerlin, type CalendarEntry } from "@/lib/calendar";

export const dynamic = "force-dynamic";

/**
 * Kalender-Abo (iCal) für den Admin: GET /api/calendar?token=…
 * Handy-Kalender können keine Logins – geschützt über den geheimen
 * CALENDAR_FEED_TOKEN. Link steht nur im Admin unter Einstellungen.
 */
function tokenOk(given: string | null): boolean {
  const secret = process.env.CALENDAR_FEED_TOKEN;
  if (!secret || !given) return false;
  const a = Buffer.from(given), b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Zeilen nach RFC 5545 auf max. 75 Bytes umbrechen (ohne Emojis/Umlaute zu zerteilen). */
function fold(line: string): string {
  const out: string[] = [];
  let cur = "", bytes = 0;
  for (const ch of Array.from(line)) {
    const n = Buffer.byteLength(ch);
    if (bytes + n > 74) {
      out.push(cur);
      cur = " ";
      bytes = 1;
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join("\r\n");
}

const ymd = (iso: string) => iso.replace(/-/g, "");
const LABEL = { aufbau: ["🚚 Aufbau", "🚚 Übergabe"], event: ["🎉 Event", "🎉 Event"], abbau: ["📦 Abbau", "📦 Rückgabe"] } as const;

function vevent(e: CalendarEntry, portal: string, stamp: string): string {
  const time = e.kind !== "event" && /^\d{2}:\d{2}$/.test(e.sort) && e.sort !== "99:98" ? e.sort : null;
  // Zeitfenster ("12–15 Uhr") als Block eintragen, sonst 90 bzw. 60 Minuten
  let start = time ? { date: e.date, t: time } : null;
  let end: { date: string; t: string } | null = null;
  if (time === "23:59") {
    // Nachtabholung nach Mitternacht: 0–3 Uhr des Folgetags
    start = { date: addDays(e.date, 1), t: "00:00" };
    end = { date: addDays(e.date, 1), t: "03:00" };
  } else if (time) {
    const t = endFromText(e.timeLabel);
    if (t && Number(t.slice(0, 2)) >= 24) end = { date: addDays(e.date, 1), t: `${String(Number(t.slice(0, 2)) - 24).padStart(2, "0")}${t.slice(2)}` };
    else if (t && t > time) end = { date: e.date, t };
  }
  const open = e.kind !== "event" && !time ? " · Zeit offen" : "";
  const summary = `${LABEL[e.kind][e.selfService ? 1 : 0]}: ${e.title}${open}${e.lifecycle !== "bestaetigt" ? " (vorgemerkt)" : ""}`;
  const desc = [
    e.devices,
    e.timeLabel ? `Zeit: ${e.timeLabel}` : null,
    e.phone ? `Telefon: ${e.phone}` : null,
    ...e.warnings.map((w) => (w.startsWith("🌙") ? w : `⚠️ ${w}`)),
    `${e.bookingCode}`,
    portal ? `${portal}/admin/bookings/${e.bookingId}` : null,
  ].filter(Boolean).join("\n");
  const lines = [
    "BEGIN:VEVENT",
    `UID:${e.id}@event-vision-media`,
    `DTSTAMP:${stamp}`,
    ...(start
      ? [`DTSTART;TZID=Europe/Berlin:${ymd(start!.date)}T${start!.t.replace(":", "")}00`,
         end ? `DTEND;TZID=Europe/Berlin:${ymd(end.date)}T${end.t.replace(":", "")}00` : `DURATION:PT${e.kind === "aufbau" ? 90 : 60}M`]
      : [`DTSTART;VALUE=DATE:${ymd(e.date)}`, `DTEND;VALUE=DATE:${ymd(addDays(e.date, 1))}`]),
    `SUMMARY:${esc(summary)}`,
    ...(e.address && e.kind !== "event" ? [`LOCATION:${esc(e.address)}`] : []),
    `DESCRIPTION:${esc(desc)}`,
    ...(portal ? [`URL:${portal}/admin/bookings/${e.bookingId}`] : []),
    `STATUS:${e.lifecycle === "bestaetigt" ? "CONFIRMED" : "TENTATIVE"}`,
    // Erinnerung: bei Uhrzeit 2 Std. vorher, sonst am Vorabend 18 Uhr
    ...(e.kind !== "event"
      ? ["BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(summary)}`, `TRIGGER:${time ? "-PT2H" : "-PT6H"}`, "END:VALARM"]
      : []),
    "END:VEVENT",
  ];
  return lines.map(fold).join("\r\n");
}

export async function GET(req: NextRequest) {
  if (!tokenOk(req.nextUrl.searchParams.get("token"))) return new NextResponse("Not found", { status: 404 });
  const today = todayBerlin();
  const entries = await loadCalendar(addDays(today, -30), addDays(today, 400));
  const portal = (process.env.PORTAL_URL || "").replace(/\/$/, "");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Event Vision Media//Buchungen//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Event Vision – Einsätze",
    "X-WR-TIMEZONE:Europe/Berlin",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
    "BEGIN:VTIMEZONE",
    "TZID:Europe/Berlin",
    "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "TZNAME:CEST", "DTSTART:19700329T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT",
    "BEGIN:STANDARD", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "TZNAME:CET", "DTSTART:19701025T030000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD",
    "END:VTIMEZONE",
    ...entries.map((e) => vevent(e, portal, stamp)),
    "END:VCALENDAR",
  ].join("\r\n");
  return new NextResponse(body + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="event-vision-einsaetze.ics"',
      "Cache-Control": "private, max-age=300",
    },
  });
}
