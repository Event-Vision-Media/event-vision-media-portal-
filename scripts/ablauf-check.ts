/**
 * Ablauf-Check: prüft automatisch, was Kunden zu sehen bekommen – für alle Kombinationen
 * Privat/Firma × Du/Sie. Findet Fehler wie „Firma + Du kann nicht unterschreiben“ oder
 * „Guten Tag … trotz Du“, bevor ein Kunde sie bemerkt.
 *
 *   npm run check:ablauf            (Preise gegen die Datenbank aus .env.local – nur lesend)
 *
 * Prüft:
 *  1. Alle Kunden-Mails: Du/Sie einheitlich, Anrede passend, keine Platzhalter/„undefined“/„NaN“
 *  2. Mietvertrag je Paket: Widerrufsbelehrung genau bei Privatkunden, Unterschrift-Regeln passen zum Vertrag
 *  3. Gästebuch-Spiel: je Anlass 6 Felder mit Aufgaben, keine offenen Platzhalter
 *  4. Preise: Katalog (Website/Angebote/Verträge) = Extras im Admin
 */
import { readFileSync, existsSync } from "fs";
import * as mails from "../lib/email";
import type { MailBooking } from "../lib/email";
import { buildContract, contractToHtml } from "../lib/contract";
import { PACKAGES, EXTRAS } from "../lib/catalog";
import { GAME, GAME_OCCASIONS, gameCategories } from "../lib/guestbook-game";

type Combo = { key: string; business: boolean; sie: boolean };
const COMBOS: Combo[] = [
  { key: "Privat + Du", business: false, sie: false },
  { key: "Privat + Sie", business: false, sie: true },
  { key: "Firma + Du", business: true, sie: false },
  { key: "Firma + Sie", business: true, sie: true },
];

const errors: string[] = [];
const warnings: string[] = [];
const fail = (msg: string) => errors.push(msg);

function sample(c: Combo): MailBooking & { email: string; phone: string; company: string | null; lifecycle: string; inquiry_message: string | null } {
  return {
    booking_code: "FB-TEST-0001",
    confirmed_at: "2026-11-01T10:00:00Z",
    address_form: c.sie ? "sie" : "du",
    salutation: c.sie ? "frau" : null,
    customer_type: c.business ? "business" : "privat",
    access_code: "EV-TEST-TEST",
    custom_login_code: null,
    customer_name: "Anna Beispiel",
    couple_names: "Anna & Max",
    event_date: "2027-06-12",
    event_days: 1,
    location: "Beispielhalle Essen",
    occasion: c.business ? "Firmenfeier" : "Hochzeit",
    total_price: 529,
    inquiry_items: { packages: [{ id: "spiegel-modern", name: "Fotospiegel Modern", price: 449 }], extras: [{ id: "hintergrund", name: "Hintergrundsystem", price: 0, listPrice: 49 }] },
    email: "anna@beispiel.test",
    phone: "0170 0000000",
    company: c.business ? "Musterfirma GmbH" : null,
    lifecycle: "bestaetigt",
    inquiry_message: null,
  };
}

const strip = (html: string) =>
  html.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ");

// Wörter, die in der jeweils anderen Ansprache nicht vorkommen dürfen (Groß-/Kleinschreibung beachtet)
const DU_WORDS = /\b(du|dich|dir|dein|deine|deinen|deinem|deiner|deines|euch|euer|eure|euren|eurem|eurer|Du|Dich|Dir|Dein|Deine|Deinen|Deinem|Deiner|Euch|Euer|Eure|Euren|Eurem|Eurer)\b/;
const SIE_WORDS = /\b(Ihnen|Ihr|Ihre|Ihren|Ihrem|Ihrer|Ihres)\b|(?<![.!?:]\s|^|„)\bSie\b/;
const BROKEN = /\bundefined\b|\bNaN\b|\[object Object\]|\{n\}|\bnull\b|&amp;amp;/;

function checkMail(name: string, c: Combo, m: { subject: string; html: string; text: string }) {
  const where = `Mail „${name}“ (${c.key})`;
  for (const [part, content] of [["Betreff", m.subject], ["Text", m.text], ["HTML", strip(m.html)]] as const) {
    const broken = content.match(BROKEN);
    if (broken) fail(`${where}: ${part} enthält „${broken[0]}“`);
    const wrong = content.match(c.sie ? DU_WORDS : SIE_WORDS);
    if (wrong) {
      const i = content.indexOf(wrong[0]);
      fail(`${where}: ${part} spricht mit „${wrong[0]}“ an – erwartet ${c.sie ? "Sie" : "Du"} („…${content.slice(Math.max(0, i - 40), i + 40)}…“)`);
    }
  }
  const greet = m.text.split("\n")[0];
  if (c.sie && !/^Guten Tag/.test(greet)) fail(`${where}: Anrede „${greet}“ – erwartet „Guten Tag …“`);
  if (!c.sie && !/^Hallo/.test(greet)) fail(`${where}: Anrede „${greet}“ – erwartet „Hallo …“`);
}

// ---------- 1. Kunden-Mails ----------
const bank = { holder: "Event Vision Media", iban: "DE00 0000 0000 0000 0000 00", bic: "TESTDEFF" };
for (const c of COMBOS) {
  const b = sample(c);
  const list: [string, { subject: string; html: string; text: string }][] = [
    ["Vormerkung", mails.reservationMail(b)],
    ["Auftragsbestätigung", mails.confirmationMail(b)],
    ["Portal-Zugang", mails.portalInviteMail(b, { contractOnFile: false })],
    ["Portal-Zugang (Vertrag liegt vor)", mails.portalInviteMail(b, { contractOnFile: true })],
    ["Absage", mails.declineMail(b, "Termin leider belegt")],
    ["Erinnerung vor dem Event", mails.reminderMail(b, ["Layout auswählen"], [{ name: "Gästebuch-Spiel", priceLabel: "10 €" }])],
    ["Nachher-Mail", mails.followupMail(b, "https://g.page/r/test", { photos: true, audios: 3 })],
    ["Medien bereit", mails.mediaReadyMail(b, { photos: true, audios: 2 })],
    ["Bewertung Erinnerung", mails.reviewReminderMail(b, "https://portal.fotobox-essen.com/api/bewertung/x.y")],
    ["Layouts da", mails.layoutProofsMail(b, { layouts: ["Hochzeit Gold", "Hochzeit Weiß"], screen: true, revised: false })],
    ["Layout überarbeitet", mails.layoutProofsMail(b, { layouts: ["Hochzeit Gold"], screen: false, revised: true })],
    ["Startbildschirm da", mails.layoutProofsMail(b, { layouts: [], screen: true, revised: false })],
    ["Vertrag unterschrieben", mails.contractSignedMail(b, "<p>Vertrag</p>", "Vertrag")],
    ["Anfrage erhalten (belegt)", mails.inquiryReceivedMail(b, "belegt")],
    ["Anfrage erhalten (kurzfristig)", mails.inquiryReceivedMail(b, "kurzfristig")],
    ["Vertrags-Erinnerung", mails.contractReminderMail(b)],
    ["Begrüßungsansage", mails.greetingReminderMail(b, "2027-06-05", false)],
    ["Begrüßungsansage (Frist vorbei)", mails.greetingReminderMail(b, "2027-06-05", true)],
    ["Zahlung komplett", mails.paymentCompleteMail(b, 529)],
    ["Anzahlung-Erinnerung", mails.depositReminderMail(b, 100, bank)],
    ["Anzahlung erhalten (Überweisung)", mails.depositReceivedMail(b, { deposit: 100, rest: 429, method: "ueberweisung", restDueDate: "2027-05-29", afterEventDays: null, pickupOnly: false })],
    ["Anzahlung erhalten (bar Abholung)", mails.depositReceivedMail(b, { deposit: 100, rest: 429, method: "bar", restDueDate: "2027-05-29", afterEventDays: null, pickupOnly: true })],
    ["Anzahlung erhalten (Rechnung danach)", mails.depositReceivedMail(b, { deposit: 100, rest: 429, method: "ueberweisung", restDueDate: "2027-06-26", afterEventDays: 14, pickupOnly: false })],
    ["Anzahlung erhalten (Zahlungsart offen)", mails.depositReceivedMail(b, { deposit: 100, rest: 429, method: null, restDueDate: "2027-05-29", afterEventDays: null, pickupOnly: false })],
    ["Rechnung (Überweisung)", mails.invoiceMail(b, { title: "Gesamtrechnung RE-1", amount: 529, pay: "ueberweisung", dueText: "bis zum 27. November 2026", bank, note: null })],
    ["Rechnung (bar)", mails.invoiceMail(b, { title: "Rechnung RE-2", amount: 429, pay: "bar_abholung", dueText: null, bank: null })],
    ["Gästebuch-Spiel", mails.gameReminderMail(b, "Hochzeit von Anna & Max")],
    ["Galerie läuft ab", mails.galleryExpiryMail(b, { url: "https://portal.fotobox-essen.com/g/beispiel", until: "2027-07-12", days: 5, canExtend: true })],
    ["Galerie läuft ab (max. erreicht)", mails.galleryExpiryMail(b, { url: "https://portal.fotobox-essen.com/g/beispiel", until: "2027-09-12", days: 3, canExtend: false })],
    ["Restzahlung", mails.restTransferReminderMail(b, 429, "2027-05-29", bank)],
    ["Abholung morgen", mails.pickupReminderMail(b, { devices: "Fotobox", handover: "Freitag 11.06., 17–18 Uhr", ret: "Sonntag 13.06., 12–13 Uhr", cash: 429 })],
    ["Barzahlung", mails.cashReminderMail(b, 429, { pickup: true })],
    ["Wiederbuchung", mails.rebookingMail(b, "2028-06-10", "https://fotobox-essen.com/anfrage.html")],
    ["Angebot abgelaufen", mails.offerExpiredMail(b)],
  ];
  for (const [name, m] of list) checkMail(name, c, m);
}

// ---------- 2. Mietvertrag ----------
for (const c of COMBOS) {
  for (const p of PACKAGES.filter((x) => c.business || !x.businessOnly)) {
    const booking = {
      ...sample(c),
      id: "00000000-0000-0000-0000-000000000000",
      source: "website",
      product_type: p.product,
      created_at: "2026-11-01T10:00:00Z",
      inquiry_items: { packages: [{ id: p.id, product: p.product, name: p.name, price: p.price }], extras: [] },
    } as any;
    let doc;
    try {
      doc = buildContract({ booking, bookedExtraNames: [], laterExtras: [], portalFees: [], bank: null, renter: null });
    } catch (e) {
      fail(`Vertrag ${p.id} (${c.key}): Fehler beim Erstellen – ${(e as Error).message}`);
      continue;
    }
    const html = strip(contractToHtml(doc));
    const broken = html.match(/\bundefined\b|\bNaN\b|\[object Object\]/);
    if (broken) fail(`Vertrag ${p.id} (${c.key}): enthält „${broken[0]}“`);
    // Unterschrift: Formular und Server entscheiden über customer_type – muss zum Vertrag passen
    if (doc.isBusiness !== c.business) fail(`Vertrag ${p.id} (${c.key}): Vertrag hält den Kunden für ${doc.isBusiness ? "Firma" : "Privat"}`);
    if (Boolean(doc.withdrawal) === c.business) fail(`Vertrag ${p.id} (${c.key}): Widerrufsbelehrung ${doc.withdrawal ? "bei Firma vorhanden" : "fehlt bei Privatkunde"}`);
  }
}
// Unterschreiben: das Formular blendet den Widerrufs-Haken über isBusiness aus, der Server prüft customer_type
const action = readFileSync(new URL("../app/actions/contract.ts", import.meta.url), "utf8");
if (!/const business = booking\.customer_type === "business"/.test(action) || !/const isConsumer = !business/.test(action)) {
  fail("Vertrag unterschreiben: app/actions/contract.ts entscheidet Widerruf/Zahlung nicht mehr über customer_type – Formular und Server könnten auseinanderlaufen");
}

// ---------- 3. Gästebuch-Spiel ----------
for (const o of GAME_OCCASIONS) {
  const cats = gameCategories({ occasion: o, names: "Anna & Max", customTasks: [] });
  if (cats.length !== 6) fail(`Gästebuch-Spiel ${o}: ${cats.length} statt 6 Felder`);
  for (const [label, title, tasks] of cats) {
    if (tasks.length < 5) fail(`Gästebuch-Spiel ${o} „${title}“: nur ${tasks.length} Aufgaben`);
    if (label.length > 11) warnings.push(`Gästebuch-Spiel ${o}: Feld „${label}“ ist lang für die Wählscheibe`);
    for (const t of tasks) if (/\{n\}|undefined/.test(t)) fail(`Gästebuch-Spiel ${o}: Platzhalter in „${t}“`);
  }
  const withCustom = gameCategories({ occasion: o, names: "", customTasks: ["Eigene Aufgabe"] });
  if (withCustom.at(-1)?.[0] !== "Spezial") fail(`Gästebuch-Spiel ${o}: eigene Aufgaben landen nicht im Feld „Spezial“`);
  if (!GAME[o].title(GAME[o].defaultNames)) fail(`Gästebuch-Spiel ${o}: leerer Titel`);
}

// ---------- 4. Preise: Katalog vs. Extras im Admin ----------
async function checkPrices() {
  const env = existsSync(".env.local") ? readFileSync(".env.local", "utf8") : "";
  const get = (k: string) => process.env[k] || env.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1]?.trim().replace(/^"|"$/g, "");
  const url = get("NEXT_PUBLIC_SUPABASE_URL"), key = get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return warnings.push("Preise: keine Datenbank-Zugangsdaten gefunden – Preisvergleich übersprungen");
  const res = await fetch(`${url}/rest/v1/extras?select=name,price,is_active,extra_variants(name,price)`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) return warnings.push(`Preise: Datenbank nicht erreichbar (${res.status})`);
  const db = (await res.json()) as { name: string; price: number; is_active: boolean; extra_variants: { name: string; price: number }[] }[];
  const byName = new Map(db.map((e) => [e.name, e]));
  // Hauptgeräte als Portal-Extra: Varianten ↔ Pakete
  const audio = byName.get("Audiogästebuch");
  if (audio) {
    for (const [variant, pkg] of [["Basis-Paket", "audio-basis"], ["Komfort-Paket", "audio-komfort"], ["Premium-Paket", "audio-premium"]]) {
      const v = audio.extra_variants.find((x) => x.name === variant), p = PACKAGES.find((x) => x.id === pkg);
      if (v && p && Number(v.price) !== p.price) fail(`Preis Audiogästebuch ${variant}: Admin ${Number(v.price)} € ≠ Website/Katalog ${p.price} €`);
    }
  }
  const love = byName.get("XXL-LOVE Leuchtbuchstaben"), loveP = PACKAGES.find((x) => x.id === "love-abholung");
  if (love && loveP && Number(love.price) !== loveP.price) fail(`Preis LOVE: Admin ${Number(love.price)} € ≠ Website/Katalog ${loveP.price} €`);
  // Extras mit festem Preis (ohne Varianten)
  for (const e of EXTRAS) {
    const d = e.dbExtraName ? byName.get(e.dbExtraName) : undefined;
    if (!e.dbExtraName) continue;
    if (!d) { warnings.push(`Extra „${e.name}“: im Admin nicht angelegt (${e.dbExtraName})`); continue; }
    if (!d.extra_variants.length && Number(d.price) > 0 && Number(d.price) !== e.price) fail(`Preis „${e.name}“: Admin ${Number(d.price)} € ≠ Website/Katalog ${e.price} €`);
  }
}

checkPrices().then(() => {
  for (const w of warnings) console.log("⚠️  " + w);
  if (errors.length) {
    console.log(`\n❌ ${errors.length} Problem${errors.length === 1 ? "" : "e"} gefunden:`);
    for (const e of errors) console.log("  • " + e);
    process.exit(1);
  }
  console.log(`\n✅ Ablauf-Check bestanden: ${COMBOS.length} Kundentypen × Mails, Verträge, Gästebuch-Spiel und Preise geprüft.`);
});
