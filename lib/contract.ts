// Mietvertrag: wird automatisch aus der Buchung erzeugt.
//
// Allgemeine Paragraphen gelten für alle Buchungen; gerätespezifische
// Absätze (Fotospiegel, Fotobox, 360° Video Booth, Audiogästebuch, LOVE)
// sowie Lieferart (Lieferung / Selbstabholung / Versand), Betreuung vor Ort
// und Widerrufsbelehrung (nur Privatkunden) werden je nach Buchung ergänzt.
//
// WICHTIG: Bei inhaltlichen Änderungen CONTRACT_VERSION erhöhen. Bereits
// unterschriebene Verträge bleiben unverändert (Snapshot in
// public.booking_contracts).

import {
  DEVICE_BY_PRODUCT_TYPE,
  EXTRA_NAME_BY_DEVICE,
  PRODUCT_LABELS,
  followupLine,
  CARRY_SERVICE,
  handoverFor,
  PICKUP_OPTIONS,
  TRAVEL,
  packageFeatures,
  includedExtraIds,
  type DeviceKey,
} from "@/lib/catalog";
import { formatDateGerman } from "@/lib/format";
import { ACCESS_LABELS, type Booking } from "@/lib/types";

export const CONTRACT_VERSION = "2026-10.6";

/** Restzahlung per Überweisung: spätestens so viele Tage vor der Veranstaltung. */
export const REST_DUE_DAYS = 14;

/** Verträge vor Version 2026-10.3 wurden mit 7 Tagen Frist unterschrieben – die gilt dort weiter. */
export function restDueDaysFor(templateVersion?: string | null): number {
  const m = templateVersion?.match(/^(\d+)-(\d+)(?:\.(\d+))?$/);
  if (!m) return REST_DUE_DAYS;
  const v = [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)];
  const older = v[0] !== 2026 ? v[0] < 2026 : v[1] !== 10 ? v[1] < 10 : v[2] < 3;
  return older ? 7 : REST_DUE_DAYS;
}

/**
 * Der digitale Mietvertrag gilt für Buchungen über die Website. Im Admin
 * angelegte (Bestands-)Buchungen laufen wie bisher mit Papiervertrag.
 */
export function contractRequired(b: { source?: string | null }): boolean {
  return b.source === "website";
}

/** 618 → "618 €", 123.6 → "123,60 €" */
function formatEuro(value: number): string {
  const cents = Math.round(value * 100) % 100 !== 0;
  return `${value.toLocaleString("de-DE", { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: 2 })} €`;
}
export const DEPOSIT_RATE = 0.2;

/** Anzahlung: 20 % auf volle 50 € gerundet, mindestens 50 € (höchstens der Gesamtpreis). */
export function depositFor(total: number): number {
  if (total <= 0) return 0;
  return Math.min(total, Math.max(50, Math.round((total * DEPOSIT_RATE) / 50) * 50));
}

export const LANDLORD = {
  name: "Dustin Nowitzki · Event Vision Media",
  street: "Mönkhoffs Busch 34",
  zipCity: "45277 Essen",
  phone: "0176 22 74 83 63",
  email: "info@fotobox-essen.com",
};

export type ContractBlock = { p: string } | { ul: string[] };

export interface ContractSection {
  title: string;
  blocks: ContractBlock[];
}

export interface ContractLine {
  name: string;
  price: string;
  features?: string[];
}

export interface RenterDetails {
  renter_name: string;
  renter_company?: string | null;
  renter_street: string;
  renter_zip_city: string;
  location_name?: string | null;
  location_street?: string | null;
  location_zip_city?: string | null;
  onsite_contact_name?: string | null;
  onsite_contact_phone?: string | null;
  handover_window?: string | null;
  return_window?: string | null;
  reference_consent?: boolean;
  /** Restzahlung: Überweisung bis 14 Tage vorher oder bar bei Lieferung/Übergabe. */
  rest_payment_method?: RestPaymentMethod | null;
  /** Nur Firmenkunden: Angaben für die Rechnung. */
  billing?: BillingDetails | null;
}

export interface BillingDetails {
  address?: string | null;
  email?: string | null;
  poNumber?: string | null;
  costCenter?: string | null;
}

export type RestPaymentMethod = "ueberweisung" | "bar";

export interface BankDetails {
  holder: string | null;
  iban: string | null;
  bic: string | null;
  bank: string | null;
}

export interface ContractDoc {
  version: string;
  title: string;
  bookingCode: string;
  isBusiness: boolean;
  devices: DeviceKey[];
  /** Mindestens ein Gerät wird von uns geliefert und aufgebaut. */
  hasDelivery: boolean;
  landlord: string[];
  renter: string[];
  lines: ContractLine[];
  total: string;
  deposit: string;
  rest: string;
  /** Zahlen für die Zahlungsübersicht (null, wenn kein Preis hinterlegt ist). */
  totalAmount: number | null;
  depositAmount: number | null;
  taxNote: string;
  sections: ContractSection[];
  /** Rechnungsangaben (Firmenkunden), falls angegeben. */
  billing?: BillingDetails | null;
  /** Nur Privatkunden (Verbraucher). */
  withdrawal: ContractSection[] | null;
}

const DEVICE_NOUN: Record<DeviceKey, string> = {
  spiegel: "Fotospiegel",
  fotobox: "Fotobox",
  "360": "360° Video Booth",
  audio: "Audiogästebuch",
  love: "LOVE-Leuchtbuchstaben",
};


const PHOTO_DEVICES: DeviceKey[] = ["spiegel", "fotobox"];

function joinDevices(devices: DeviceKey[]): string {
  const names = devices.map((d) => DEVICE_NOUN[d]);
  return names.length <= 1 ? names[0] ?? "Mietsache" : `${names.slice(0, -1).join(", ")} und ${names[names.length - 1]}`;
}

export interface ContractInput {
  booking: Booking;
  /** Namen aller in booking_extras gebuchten Extras (auch im Portal nachgebucht). */
  bookedExtraNames: string[];
  /** Im Portal nachgebuchte Extras, die nicht Teil der Website-Anfrage waren. */
  laterExtras: { name: string; price: number }[];
  /** Aufpreis Premium-Layout / Layout-Wechsel usw. (0 wenn nichts). */
  portalFees: { name: string; price: number }[];
  bank: BankDetails | null;
  renter?: RenterDetails | null;
}

export function buildContract({ booking, bookedExtraNames, laterExtras, portalFees, bank, renter }: ContractInput): ContractDoc {
  const items = booking.inquiry_items;
  const isBusiness = booking.customer_type === "business";
  // inkl. der Extras, die ein Firmen-Komplettpaket enthält (Betreuung, WLAN …)
  const extraIds = new Set([...(items?.extras ?? []).map((e) => e.id), ...includedExtraIds(items)]);

  // ---- Geräte ermitteln ----
  const packageByDevice = new Map<DeviceKey, string>();
  for (const p of items?.packages ?? []) packageByDevice.set(p.product as DeviceKey, p.id);
  const devices = new Set<DeviceKey>(packageByDevice.keys());
  const primary = DEVICE_BY_PRODUCT_TYPE[booking.product_type];
  if (primary && devices.size === 0) devices.add(primary);
  for (const [device, extraName] of Object.entries(EXTRA_NAME_BY_DEVICE)) {
    if (extraName && bookedExtraNames.includes(extraName)) devices.add(device as DeviceKey);
  }
  const order: DeviceKey[] = ["spiegel", "fotobox", "360", "audio", "love"];
  const deviceList = order.filter((d) => devices.has(d));
  const handover = new Map(deviceList.map((d) => [d, handoverFor(d, packageByDevice.get(d), extraIds)] as const));
  const delivered = deviceList.filter((d) => handover.get(d) === "lieferung");
  const pickedUp = deviceList.filter((d) => handover.get(d) === "abholung");
  const shipped = deviceList.filter((d) => handover.get(d) === "versand");
  const has = (d: DeviceKey) => devices.has(d);
  const pickupOpt = PICKUP_OPTIONS.find((o) => o.id === items?.pickup);
  const hasPhoto = PHOTO_DEVICES.some(has);
  const withStaff = extraIds.has("betreuung");
  const powered = deviceList.filter((d) => d !== "audio");
  const all = joinDevices(deviceList);

  // ---- Positionen & Beträge ----
  const lines: ContractLine[] = [];
  for (const p of items?.packages ?? []) {
    lines.push({ name: p.name, price: formatEuro(p.price), features: packageFeatures(p.id) });
  }
  const follow = followupLine(items);
  if (follow) lines.push({ name: follow.label.replace(/^\+ /, ""), price: formatEuro(follow.amount) });
  for (const e of items?.extras ?? []) lines.push({ name: e.name, price: (e.from ? "ab " : "") + formatEuro(e.price) });
  for (const e of laterExtras) lines.push({ name: `${e.name} (im Kundenportal gebucht)`, price: formatEuro(e.price) });
  for (const f of portalFees) lines.push({ name: f.name, price: formatEuro(f.price) });
  if (lines.length === 0) lines.push({ name: `${booking.product_type} – laut Angebot`, price: "–" });

  const extraSum = [...laterExtras, ...portalFees].reduce((s, e) => s + e.price, 0);
  const totalNum = booking.total_price != null ? Number(booking.total_price) + extraSum : null;
  const from = items?.isFromPrice ? "ab " : "";
  const total = totalNum != null ? from + formatEuro(totalNum) : "laut Auftragsbestätigung";
  const depositNum = totalNum != null ? depositFor(totalNum) : null;
  const deposit = depositNum != null ? formatEuro(depositNum) : "ca. 20 % des Gesamtpreises (auf volle 50 € gerundet)";
  const rest = totalNum != null && depositNum != null ? from + formatEuro(totalNum - depositNum) : "80 % des Gesamtpreises";

  // ---- Vertragsparteien ----
  const landlord = [LANDLORD.name, LANDLORD.street, LANDLORD.zipCity, `Tel. ${LANDLORD.phone} · ${LANDLORD.email}`];
  const renterLines = renter
    ? [
        ...(renter.renter_company ? [renter.renter_company] : []),
        renter.renter_name,
        renter.renter_street,
        renter.renter_zip_city,
        [booking.phone, booking.email].filter(Boolean).join(" · "),
        ...(renter.billing?.address ? [`Rechnungsanschrift: ${renter.billing.address}`] : []),
        ...(renter.billing?.email ? [`Rechnung per E-Mail an: ${renter.billing.email}`] : []),
        ...(renter.billing?.poNumber ? [`Bestellnummer: ${renter.billing.poNumber}`] : []),
        ...(renter.billing?.costCenter ? [`Kostenstelle: ${renter.billing.costCenter}`] : []),
      ].filter(Boolean)
    : [
        ...(booking.company ? [booking.company] : []),
        booking.customer_name || booking.couple_names,
        "Anschrift wird bei Unterschrift ergänzt",
        [booking.phone, booking.email].filter(Boolean).join(" · "),
      ].filter(Boolean);

  const fill = (v: string | null | undefined, placeholder = "wird bei Unterschrift ergänzt") => (v && v.trim()) || placeholder;
  const location = renter
    ? [renter.location_name, renter.location_street, renter.location_zip_city].filter((x) => x && x.trim()).join(", ")
    : booking.location;

  const days = booking.event_days ?? 1;
  const dateLabel = formatDateGerman(booking.event_date) + (days > 1 ? ` (${days} Veranstaltungstage)` : "");

  const S: ContractSection[] = [];

  // § 1 Veranstaltung
  S.push({
    title: "Veranstaltung",
    blocks: [
      {
        ul: [
          `Datum: ${dateLabel}`,
          `Anlass: ${fill(booking.occasion, "–")}`,
          `Veranstaltungsort: ${fill(location)}`,
          `Ansprechpartner vor Ort: ${fill([renter?.onsite_contact_name, renter?.onsite_contact_phone].filter(Boolean).join(", "))}`,
          `${delivered.length ? "Lieferung/Aufbau" : "Übergabe"}: ${fill(renter?.handover_window, "nach Absprache")}`,
          `${delivered.length ? "Abbau/Abholung" : "Rückgabe"}: ${fill(renter?.return_window, "nach Absprache")}`,
          ...(delivered.length && pickupOpt ? [`Vereinbarte Abholung: ${pickupOpt.label}${pickupOpt.price ? ` (Aufpreis ${formatEuro(pickupOpt.price)})` : ""}`] : []),
        ],
      },
      ...(delivered.length
        ? [{ p: `Kurz vor Mietbeginn erfolgen Aufbau, Funktionskontrolle und Einweisung durch den Vermieter. Ist der Mieter dabei nicht selbst anwesend, benennt er einen Ansprechpartner vor Ort, mit dem die Übergabe erfolgt. Der Aufbau dauert je Gerät ca. 45 Minuten.` }]
        : []),
      { p: "Der Mieter versichert, dass Standort, Aufbau, Abbau und Abholung mit der Veranstaltungs-Location abgesprochen sind." },
    ],
  });

  // § 2 Vertragsgegenstand
  S.push({
    title: "Vertragsgegenstand und Preise",
    blocks: [
      { p: `Der Vermieter überlässt dem Mieter für die Veranstaltung ${deviceList.length > 1 ? "folgende Mietsachen" : "folgende Mietsache"}: ${all} – zu den in der Leistungsübersicht genannten Paketen, Extras und Preisen (siehe oben). Die Leistungsübersicht ist Bestandteil dieses Vertrags.` },
      { p: "Alle Preise sind Endpreise. Gemäß § 19 UStG (Kleinunternehmerregelung) wird keine Umsatzsteuer berechnet." },
      ...(delivered.length
        ? [{ p: `Fahrtkosten sind bis ${TRAVEL.includedKm} km Fahrstrecke (einfach, kürzeste Strecke laut Routenplaner ab ${LANDLORD.street}, ${LANDLORD.zipCity}) inklusive. Darüber gilt: ${TRAVEL.tiers.map((t, i) => `bis ${t.upToKm} km ${formatEuro(t.price)}`).join(", ")}; bei weiteren Entfernungen der vorab vereinbarte Aufpreis.${items?.travel?.km != null ? ` Für diese Veranstaltung wurden ca. ${items.travel.km} km zugrunde gelegt.` : ""} Weicht die tatsächliche Adresse der Location von der Angabe in der Anfrage ab, werden die Fahrtkosten entsprechend angepasst.` }]
        : []),
      ...(items?.isFromPrice ? [{ p: "Mit „ab“ gekennzeichnete Preise richten sich nach dem tatsächlichen Aufwand (z. B. Dauer der Betreuung) und werden vor der Veranstaltung verbindlich abgestimmt." }] : []),
      { p: "Leistungen, die der Mieter nach Vertragsschluss über das Kundenportal zubucht oder ändert (z. B. Extras, Paket-Upgrades, Premium-Layouts), werden zu den dort angezeigten Preisen Bestandteil dieses Vertrags." },
    ],
  });

  // § 3 Zahlung
  const bankLine = bank?.iban
    ? `Bankverbindung: ${[bank.holder, `IBAN ${bank.iban}`, bank.bic ? `BIC ${bank.bic}` : null, bank.bank].filter(Boolean).join(" · ")}`
    : "Die Bankverbindung ist auf der jeweiligen Rechnung angegeben.";
  S.push({
    title: "Zahlungsbedingungen",
    blocks: [
      {
        ul: [
          `Anzahlung: ${deposit}, zahlbar innerhalb von 7 Tagen nach Erhalt der Anzahlungsrechnung.`,
          renter?.rest_payment_method === "bar"
            ? `Restbetrag: ${rest}, zahlbar in bar bei Lieferung bzw. Übergabe der Mietsache (vom Mieter so gewählt). Der Mieter erhält hierüber eine Rechnung mit Zahlungsvermerk.`
            : renter?.rest_payment_method === "ueberweisung"
              ? `Restbetrag: ${rest}, zahlbar per Überweisung spätestens ${REST_DUE_DAYS} Tage vor der Veranstaltung (vom Mieter so gewählt). Hierzu erhält der Mieter eine separate Rechnung.`
              : `Restbetrag: ${rest}, zahlbar spätestens ${REST_DUE_DAYS} Tage vor der Veranstaltung per Überweisung oder alternativ in bar bei Lieferung bzw. Übergabe. Hierzu erhält der Mieter eine separate Rechnung.`,
          "Später im Kundenportal zugebuchte Leistungen werden mit dem Restbetrag abgerechnet.",
          `Verwendungszweck: Rechnungsnummer bzw. Buchungsnummer ${booking.booking_code}.`,
        ],
      },
      { p: bankLine },
      { p: "Der Mietpreis ist unabhängig davon zu zahlen, ob die Mietsache tatsächlich genutzt wird. Eine vorzeitige Rückgabe führt nicht zu einer Minderung des Mietpreises. Bei Zahlungsverzug gelten die gesetzlichen Regelungen (§§ 286, 288 BGB)." },
    ],
  });

  // § 4 Zustandekommen
  S.push({
    title: "Zustandekommen des Vertrags und Terminreservierung",
    blocks: [
      { p: "Der Vermieter hat die Buchung nach Prüfung in Textform bestätigt (Auftragsbestätigung) und stellt dem Mieter diesen Vertrag im Kundenportal zur Unterschrift bereit. Mit der Unterschrift des Mieters im Kundenportal kommt der Vertrag zustande; einer gesonderten Gegenzeichnung bedarf es nicht." },
      { p: "Der Termin ist ab der Auftragsbestätigung für den Mieter reserviert und wird mit Eingang der Anzahlung verbindlich geblockt." },
      { p: "Abweichungen von der vereinbarten Leistung sind nur zulässig, wenn sie zur Durchführung des Vertrags erforderlich oder zweckmäßig sind und keine wesentliche Leistungsminderung bewirken. Eine Erhöhung der vereinbarten Preise während der Vertragslaufzeit ist ausgeschlossen." },
    ],
  });

  // § 5 Anforderungen an den Veranstaltungsort
  const place: string[] = [];
  if (delivered.length) place.push(`Der Aufstellort ist für Anlieferung und Aufbau mit dem Auto gut erreichbar; Zugang und ggf. Aufzug stehen zu den vereinbarten Zeiten zur Verfügung.`);
  place.push("Der Boden ist eben und tragfähig, sodass die Mietsache sicher aufgestellt werden kann.");
  if (powered.length) place.push(`Für ${joinDevices(powered)} steht in unmittelbarer Nähe (max. 5 m) ein separater Stromanschluss (230 V) zur Verfügung, der nicht mit anderen leistungsstarken Verbrauchern (z. B. DJ, Band, Catering) geteilt wird.`);
  if (has("spiegel")) place.push("Fotospiegel: Stellfläche ca. 50 × 50 cm; für die Gäste ist ein Aktionsbereich von mindestens ca. 2 × 2 m (outdoor ca. 5 × 5 m) freizuhalten.");
  if (has("fotobox")) place.push("Fotobox: Für Fotobox, Blitz und Gäste ist ein Aktionsbereich von mindestens ca. 2 × 2 m (outdoor ca. 5 × 5 m) freizuhalten.");
  if (has("360")) place.push("360° Video Booth: Es ist eine freie, ebene Fläche von mindestens ca. 3 × 3 m ohne Hindernisse im Schwenkbereich des Arms freizuhalten.");
  if (has("love")) place.push("LOVE-Leuchtbuchstaben: Es ist eine ebene Stellfläche von ca. 2,5 × 0,5 m einzuplanen; der Betrieb im Freien ist nur bei trockenem Wetter und auf festem Untergrund zulässig.");
  if (has("audio")) place.push("Audiogästebuch: Das Telefon wird auf einem stabilen Tisch oder Stehtisch in einem möglichst ruhigen Bereich aufgestellt.");
  if (hasPhoto) place.push("Für gute Bildergebnisse herrschen möglichst konstante Lichtverhältnisse. Bei wechselndem Licht (z. B. farbige Lichteffekte des DJs in der Nähe oder direkte Sonneneinstrahlung) übernimmt der Vermieter keine Gewähr für eine gleichbleibende Bildqualität.");
  place.push("Der Aufstellort ist vor Witterungseinflüssen (Regen, Wind, direkte Sonne, Feuchtigkeit) geschützt.");
  if (delivered.length) place.push("Ein Standortwechsel nach dem Aufbau ist nur durch den Vermieter bzw. nach Absprache mit ihm zulässig.");
  place.push("Findet die Veranstaltung in Räumen Dritter statt, holt der Mieter vorab deren Zustimmung zur Aufstellung und Nutzung der Mietsache ein.");
  S.push({ title: "Anforderungen an den Veranstaltungsort", blocks: [{ p: "Der Mieter sorgt dafür, dass folgende Voraussetzungen erfüllt sind:" }, { ul: place }] });

  // § 6 Lieferung / Abholung / Versand
  const log: ContractBlock[] = [];
  if (delivered.length) {
    log.push({ p: `Lieferung, Aufbau, Abbau und Abholung (${joinDevices(delivered)}) erfolgen durch den Vermieter an die angegebene Veranstaltungsadresse. Die vereinbarten Liefer- und Abholzeiten sind verbindlich. Der Mieter stellt sicher, dass der Vermieter zu diesen Zeiten Zugang zur Location erhält und ein Parkplatz in der Nähe zur Verfügung steht. Ein Aufbau durch den Mieter ist nicht vorgesehen.` });
  }
  if (pickedUp.length) {
    log.push({ p: `Selbstabholung (${joinDevices(pickedUp)}): Der Mieter holt die Mietsache zum vereinbarten Termin am Standort des Vermieters (${LANDLORD.street}, ${LANDLORD.zipCity}) ab und bringt sie zum vereinbarten Termin vollständig zurück. Transport, Aufbau und Abbau erfolgen durch den Mieter nach der Einweisung bzw. Anleitung des Vermieters und auf seine Gefahr; die Mietsache ist beim Transport gegen Verrutschen, Stöße und Nässe zu sichern.${has("love") && pickedUp.includes("love") ? " Für die LOVE-Buchstaben ist ein ausreichend großes Fahrzeug erforderlich." : ""}` });
    log.push({ p: "Wird der vereinbarte Rückgabetermin überschritten, berechnet der Vermieter 15 € für jede angefangene 30 Minuten der Verspätung. Die Geltendmachung eines weitergehenden Schadens bleibt vorbehalten; dem Mieter bleibt der Nachweis gestattet, dass kein oder ein geringerer Schaden entstanden ist." });
  }
  if (shipped.length) {
    log.push({ p: "Versand (Audiogästebuch): Der Vermieter versendet das Audiogästebuch so rechtzeitig, dass es spätestens einen Werktag vor der Veranstaltung beim Mieter eintrifft. Der Mieter sendet es spätestens am ersten Werktag nach der Veranstaltung vollständig, sorgfältig verpackt (möglichst in der Originalverpackung) und mit dem beigelegten Rücksendeetikett zurück. Die Gefahr des Verlusts auf dem Rückweg trägt der Vermieter nur bei ordnungsgemäßer Verpackung und Nutzung des Rücksendeetiketts." });
  }
  const carried = delivered.filter((d) => CARRY_SERVICE.for.includes(d));
  if (carried.length) {
    const access = items?.access;
    if (access) {
      const help =
        access.level === "ebenerdig"
          ? ""
          : access.help === "service"
            ? " Der Vermieter bringt für Aufbau und Abbau eine zweite Person mit (Trageservice)."
            : " Der Mieter stellt für Aufbau, Abbau und Abholung eine geeignete, körperlich belastbare Hilfsperson zur Verfügung, die beim Tragen hilft.";
      log.push({ p: `Angabe des Mieters zum Zugang des Aufstellorts: ${ACCESS_LABELS[access.level]}.${help}` });
    }
    log.push({ p: `${joinDevices(carried)} ${carried.length > 1 ? "sind" : "ist"} schwer und kann von einer Person nur ebenerdig oder per Aufzug transportiert werden. Ist der Aufstellort nur über Stufen oder Treppen erreichbar, stellt der Mieter für Aufbau und Abbau eine geeignete Hilfsperson zur Verfügung oder bucht den Trageservice (${CARRY_SERVICE.stufen} € bei einigen Stufen, ${CARRY_SERVICE.treppe} € bei Treppe bzw. Etage ohne Aufzug). Weichen die tatsächlichen Gegebenheiten von den Angaben des Mieters ab und steht keine Hilfsperson zur Verfügung, ist der Vermieter berechtigt, den Trageservice nachträglich zu berechnen. Ist ein sicherer Transport auch dann nicht möglich, kann der Vermieter den Aufbau ablehnen; der Anspruch auf den Mietpreis bleibt in diesem Fall abzüglich ersparter Aufwendungen bestehen.` });
  }
  if (delivered.length) {
    const [, , night, lateNight] = PICKUP_OPTIONS;
    log.push({ p: `Abholzeiten: Die Abholung am Folgetag oder am selben Abend bis 22 Uhr ist im Preis enthalten. Eine Nachtabholung wird gesondert berechnet (${night.short}: ${formatEuro(night.price)}, ${lateNight.short}: ${formatEuro(lateNight.price)}). Verschiebt sich die Abholung auf Wunsch des Mieters oder aus Gründen in seinem Verantwortungsbereich in einen späteren Zeitraum, gilt der dafür vorgesehene Aufpreis.${pickupOpt?.id === "folgetag" ? " Bei Abholung am Folgetag stellt der Mieter sicher, dass die Location zum vereinbarten Zeitpunkt zugänglich ist und die Mietsache bis dahin in einem abschließbaren bzw. beaufsichtigten Raum verbleibt." : ""}` });
    log.push({ p: "Steht die Mietsache zum vereinbarten Abholtermin nicht zur Abholung bereit oder ist der Zugang nicht möglich, berechnet der Vermieter eine Wartezeit von 15 € je angefangene 30 Minuten. Dem Mieter bleibt der Nachweis gestattet, dass kein oder ein geringerer Schaden entstanden ist." });
  }
  S.push({ title: delivered.length && !pickedUp.length && !shipped.length ? "Lieferung, Aufbau und Abholung" : "Lieferung, Abholung und Rückgabe", blocks: log });

  // § 7 Übergabe & Mängel
  const handoverBlocks: ContractBlock[] = [
    { p: "Der Mieter prüft die Mietsache bei Übergabe bzw. nach dem Aufbau und vor Beginn des Einsatzes auf ordnungsgemäße Funktion und zeigt festgestellte Mängel dem Vermieter unverzüglich an (telefonisch oder per WhatsApp unter " + LANDLORD.phone + ")." },
    { p: "Bei Übergabe und Rücknahme kann der Zustand der Mietsache in einem Übergabeprotokoll (auch in Form von Fotos) festgehalten werden, insbesondere vorhandene Schäden und die Vollständigkeit des Zubehörs. Erfolgt auf Wunsch des Mieters keine Einweisung, kann er sich nicht auf Mängel berufen, die sich bei ordnungsgemäßer Einweisung hätten vermeiden lassen." },
  ];
  if (hasPhoto && delivered.some((d) => PHOTO_DEVICES.includes(d))) {
    handoverBlocks.push({ p: "Beim Aufbau wird die Kamera auf die Lichtverhältnisse am vereinbarten Standort eingestellt und es werden Probeaufnahmen erstellt. Über- oder unterbelichtete bzw. unscharfe Aufnahmen, die auf eine spätere Veränderung der Lichtverhältnisse oder des Standorts zurückgehen, stellen keinen Mangel dar." });
  }
  S.push({ title: "Übergabe und Mängelanzeige", blocks: handoverBlocks });

  // § 8 Pflichten des Mieters
  const duties = [
    "die Mietsache an Dritte zu vermieten, zu verkaufen oder auf sonstige Weise zu überlassen (die Nutzung durch die Gäste der Veranstaltung ist selbstverständlich erlaubt);",
    "die Mietsache zu verändern, zu öffnen oder auseinanderzubauen;",
    "Getränke, Speisen oder sonstige Gegenstände auf oder in der Mietsache abzustellen;",
    "die Mietsache ungeschützt Regen, Wind, Feuchtigkeit oder Hitze auszusetzen.",
  ];
  const dutyBlocks: ContractBlock[] = [
    { p: "Der Mieter behandelt die Mietsache samt Zubehör sorgfältig und gibt sie vollständig, sauber und unbeschädigt zurück. Untersagt ist insbesondere," },
    { ul: duties },
  ];
  if (has("360")) {
    dutyBlocks.push({ p: "360° Video Booth: Die Plattform darf von höchstens 4 Personen gleichzeitig betreten werden. Springen, Tanzen mit starken Bewegungen sowie das Betreten während des Aufbaus sind untersagt. Personen außerhalb der Plattform halten Abstand zum schwenkenden Arm. Kinder dürfen die Booth nur unter Aufsicht Erwachsener nutzen. Der Mieter sorgt während der Veranstaltung für die Einhaltung dieser Regeln." });
    if (packageByDevice.get("360") !== "360-premium") {
      dutyBlocks.push({ p: "Die Aufnahmen werden mit dem Smartphone der Gäste bzw. des Mieters in der Halterung erstellt. Für Schäden an eingesetzten eigenen Geräten, die nicht auf einen Mangel der Mietsache zurückzuführen sind, haftet der Vermieter nicht." });
    }
  }
  if (has("love")) dutyBlocks.push({ p: "LOVE-Leuchtbuchstaben: Die Buchstaben dürfen nicht bestiegen, bemalt, beklebt oder mit Dekoration verbunden werden, die Rückstände hinterlässt." });
  if (has("audio")) dutyBlocks.push({ p: "Audiogästebuch: Das Telefon und das Zubehör (z. B. Aufsteller, Leuchtschild, Stehtisch) sind vollständig zurückzugeben. Das Aufladen erfolgt ausschließlich mit dem mitgelieferten Netzteil." });
  S.push({ title: "Pflichten des Mieters", blocks: dutyBlocks });

  // Betreuung vor Ort (nur wenn gebucht)
  if (withStaff) {
    S.push({
      title: "Betreuung durch Personal vor Ort",
      blocks: [
        { p: "Ist eine Betreuung vor Ort vereinbart, erhält das Personal des Vermieters während der vereinbarten Betreuungszeit durchgehend Zugang zur Veranstaltung. Der Mieter stellt einen Parkplatz in der Nähe sowie in angemessenem Umfang alkoholfreie Getränke und eine Mahlzeit zur Verfügung." },
        { p: "Das Personal hilft den Gästen bei der Nutzung, achtet auf eine ordnungsgemäße Bedienung und sorgt für die technische Funktionsfähigkeit. Der Mieter unterstützt es dabei, dass Anweisungen des Personals befolgt werden." },
      ],
    });
  }

  // Haftung des Mieters
  S.push({
    title: "Haftung des Mieters",
    blocks: [
      { p: "Der Mieter haftet ab Übergabe bis zur Rückgabe für Beschädigung, Verschmutzung, Verlust oder Diebstahl der Mietsache und des Zubehörs, soweit er oder die Gäste seiner Veranstaltung dies zu vertreten haben. Er haftet nicht für Schäden, die durch das Personal des Vermieters verursacht wurden oder bei pflichtgemäßem Verhalten des Personals hätten verhindert werden können – es sei denn, Gäste haben Anweisungen des Personals nicht befolgt." },
      extraIds.has("schutzpaket") || bookedExtraNames.includes("Fotobox-Schutzpaket")
        ? { p: "Schutzpaket: Der Mieter hat das Schutzpaket gebucht. Bei versehentlich verursachten Schäden an der Mietsache ist seine Haftung auf eine Selbstbeteiligung von höchstens 150 € je Schadensfall begrenzt. Ausgenommen sind vorsätzlich oder grob fahrlässig verursachte Schäden sowie Diebstahl und Verlust." }
        : { p: "Die Mietsache ist vom Vermieter nicht gegen Schäden durch den Mieter oder dessen Gäste versichert. Dem Mieter wird empfohlen zu prüfen, ob seine Haftpflichtversicherung Schäden an gemieteten Sachen abdeckt – oder das Schutzpaket zu buchen, das die Selbstbeteiligung auf höchstens 150 € begrenzt." },
      { p: "Schäden sind dem Vermieter unverzüglich zu melden. Drohen weitere Schäden, ist der Vermieter berechtigt, die Mietsache vorzeitig abzubauen; die Pflicht zur Zahlung des Mietpreises bleibt davon unberührt." },
    ],
  });

  // Haftung des Vermieters
  S.push({
    title: "Haftung des Vermieters",
    blocks: [
      { p: "Der Vermieter haftet unbeschränkt für Vorsatz und grobe Fahrlässigkeit sowie für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit." },
      { p: "Bei einfacher Fahrlässigkeit haftet der Vermieter nur bei Verletzung wesentlicher Vertragspflichten, deren Erfüllung die ordnungsgemäße Durchführung des Vertrags überhaupt erst ermöglicht. Die Haftung ist dann auf den vertragstypischen, vorhersehbaren Schaden begrenzt, höchstens auf den vereinbarten Gesamtmietpreis." },
      { p: "Die vorstehenden Beschränkungen gelten nicht für eine zwingende gesetzliche Haftung (z. B. nach dem Produkthaftungsgesetz) und gelten entsprechend für Mitarbeiter und Erfüllungsgehilfen des Vermieters." },
    ],
  });

  // Aufnahmen, Ausdrucke, Rechte
  const media: ContractBlock[] = [];
  if (hasPhoto) {
    media.push({ p: "Druckflatrate: Während der Veranstaltung können die Gäste unbegrenzt Ausdrucke im Format bis 10 × 15 cm erstellen; Papier und Druckmaterial sind im Paketpreis enthalten. Die Druckflatrate gilt für die übliche Nutzung durch die Gäste der Veranstaltung." });
    media.push({ p: "Die digitalen Aufnahmen stellt der Vermieter nach der Veranstaltung über die Online-Galerie im Kundenportal zum Download bereit. Der Mieter ist gehalten, die Aufnahmen zeitnah herunterzuladen und selbst zu sichern." });
  }
  if (extraIds.has("wlan") || bookedExtraNames.includes("Mobiler WLAN-Router")) {
    media.push({ p: "Mobiler WLAN-Router: Der Vermieter stellt für die Veranstaltung einen mobilen Router bereit. Verfügbarkeit und Geschwindigkeit hängen von der Mobilfunkabdeckung am Veranstaltungsort ab; hierfür übernimmt der Vermieter keine Gewähr." });
  }
  if (has("360")) media.push({ p: "360° Video Booth: Die Videos werden direkt auf das Smartphone bzw. – im Premium-Paket – per QR-Code zum Download bereitgestellt. Für den Sofort-Download ist ein funktionierendes WLAN bzw. mobiles Internet vor Ort erforderlich, für das der Vermieter keine Gewähr übernimmt." });
  if (has("audio")) media.push({ p: "Audiogästebuch: Die Aufnahmen der Gäste werden nach der Veranstaltung als Download-Link bzw. – sofern im Paket enthalten – auf USB-Stick übergeben. Der Mieter weist die Gäste darauf hin, dass ihre Nachrichten aufgezeichnet werden." });
  media.push({ p: "Aufnahmen von Personen unterliegen dem Urheber- und Persönlichkeitsrecht. Der Vermieter stellt ausschließlich die Technik zur Verfügung und ist für die Inhalte der Aufnahmen nicht verantwortlich. Der Mieter stellt sicher, dass durch die Nutzung und die Verwendung der Aufnahmen keine Rechte Dritter verletzt werden, und stellt den Vermieter von Ansprüchen Dritter frei, die auf einer solchen Rechtsverletzung beruhen, einschließlich angemessener Kosten der Rechtsverteidigung." });
  S.push({ title: "Aufnahmen und Rechte", blocks: media });

  // Mietdauer
  S.push({
    title: "Mietdauer",
    blocks: [
      { p: `Das Mietverhältnis beginnt mit der Übergabe bzw. Lieferung der Mietsache und endet mit der vereinbarten Rückgabe bzw. Abholung.${deviceList.some((d) => d !== "love") ? " Innerhalb dieses Zeitraums ist die Nutzungszeit während der Veranstaltung nicht begrenzt." : ""}` },
      { p: "Verlängerungen sind nur nach vorheriger Absprache mit dem Vermieter in Textform möglich. Eine stillschweigende Verlängerung nach § 545 BGB ist ausgeschlossen." },
    ],
  });

  // Stornierung
  S.push({
    title: "Stornierung, Ausfall und Verschiebung",
    blocks: [
      { p: "Eine ordentliche Kündigung während der Mietdauer ist ausgeschlossen; das Recht zur außerordentlichen Kündigung bleibt unberührt." },
      { p: "Tritt der Mieter vom Vertrag zurück (in Textform, maßgeblich ist der Zugang beim Vermieter), berechnet der Vermieter folgende Stornokosten, bezogen auf den Gesamtpreis:" },
      {
        ul: [
          "bis 8 Wochen vor der Veranstaltung: 10 %",
          "bis 6 Wochen vor der Veranstaltung: 20 %",
          "bis 4 Wochen vor der Veranstaltung: 30 %",
          "bis 2 Wochen vor der Veranstaltung: 50 %",
          "in den letzten 2 Wochen vor der Veranstaltung: 90 %",
        ],
      },
      { p: "Dem Mieter bleibt der Nachweis gestattet, dass dem Vermieter kein oder ein wesentlich geringerer Schaden entstanden ist. Ein gesetzliches Widerrufsrecht (siehe Widerrufsbelehrung) bleibt unberührt." },
      { p: "Vermietet werden elektronische Geräte. Fällt die Mietsache trotz sorgfältiger Wartung vor oder während der Veranstaltung aus und ist ein kurzfristiger Ersatz nicht möglich, kann der Vermieter vom Vertrag zurücktreten bzw. außerordentlich kündigen. Bereits geleistete Zahlungen werden dann vollständig – bei einem teilweisen Ausfall anteilig – erstattet." },
      { p: "Kann die Veranstaltung aus Gründen, die keine Partei zu vertreten hat, nicht stattfinden, bemühen sich die Parteien um einen Ersatztermin; geleistete Zahlungen werden auf den neuen Termin angerechnet. Kommt innerhalb von 4 Wochen keine Einigung zustande, gelten die obigen Stornoregelungen." },
    ],
  });

  // Referenz
  S.push({
    title: "Referenz",
    blocks: [
      {
        p: renter
          ? renter.reference_consent
            ? "Der Mieter ist einverstanden, dass der Vermieter die Veranstaltung als Referenz nennen und einzelne ausgewählte Aufnahmen auf seiner Website und in seinen Social-Media-Kanälen zeigen darf. Diese Einwilligung ist freiwillig und kann jederzeit mit Wirkung für die Zukunft widerrufen werden."
            : "Der Vermieter verwendet Aufnahmen der Veranstaltung nicht als Referenz."
          : "Ob der Vermieter einzelne Aufnahmen als Referenz zeigen darf, entscheidet der Mieter bei der Unterschrift (freiwillig, jederzeit widerrufbar).",
      },
    ],
  });

  // Datenschutz
  S.push({
    title: "Datenschutz",
    blocks: [
      { p: "Der Vermieter verarbeitet die personenbezogenen Daten des Mieters zur Durchführung dieses Vertrags (Art. 6 Abs. 1 lit. b DSGVO) sowie zur Erfüllung gesetzlicher Aufbewahrungspflichten (Art. 6 Abs. 1 lit. c DSGVO). Hierzu setzt er sorgfältig ausgewählte Dienstleister als Auftragsverarbeiter ein (Hosting des Kundenportals, Datenbank, E-Mail-Versand, Online-Galerie)." },
      { p: "Daten werden gelöscht, sobald sie für diese Zwecke nicht mehr erforderlich sind, spätestens nach Ablauf der gesetzlichen Aufbewahrungsfristen. Der Mieter hat das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung und Datenübertragbarkeit sowie ein Beschwerderecht bei einer Datenschutz-Aufsichtsbehörde. Anfragen an: " + LANDLORD.email + "." },
    ],
  });

  // Schlussbestimmungen
  S.push({
    title: "Schlussbestimmungen",
    blocks: [
      { p: "Es gilt das Recht der Bundesrepublik Deutschland. Gegenüber Verbrauchern gilt diese Rechtswahl nur, soweit dadurch nicht der Schutz zwingender Bestimmungen des Staates ihres gewöhnlichen Aufenthalts entzogen wird." },
      { p: "Änderungen und Ergänzungen dieses Vertrags bedürfen der Textform (z. B. E-Mail oder Kundenportal)." },
      { p: "Ist der Mieter Kaufmann, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches Sondervermögen, ist Erfüllungsort und ausschließlicher Gerichtsstand Essen." },
      { p: "Sollten einzelne Bestimmungen dieses Vertrags unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt. An die Stelle der unwirksamen Bestimmung tritt die gesetzliche Regelung." },
      { p: "Der Vermieter ist nicht verpflichtet und nicht bereit, an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen." },
    ],
  });

  // ---- Widerrufsbelehrung (nur Verbraucher) ----
  const withdrawal: ContractSection[] | null = isBusiness
    ? null
    : [
        {
          title: "Widerrufsbelehrung",
          blocks: [
            { p: "Widerrufsrecht: Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses." },
            { p: `Um Ihr Widerrufsrecht auszuüben, müssen Sie uns (${LANDLORD.name}, ${LANDLORD.street}, ${LANDLORD.zipCity}, Tel. ${LANDLORD.phone}, E-Mail ${LANDLORD.email}) mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder eine E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren. Sie können dafür das untenstehende Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist. Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.` },
            { p: "Folgen des Widerrufs: Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses Vertrags bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen wegen dieser Rückzahlung Entgelte berechnet." },
            { p: "Haben Sie verlangt, dass die Dienstleistungen während der Widerrufsfrist beginnen sollen, so haben Sie uns einen angemessenen Betrag zu zahlen, der dem Anteil der bis zu dem Zeitpunkt, zu dem Sie uns von der Ausübung des Widerrufsrechts hinsichtlich dieses Vertrags unterrichten, bereits erbrachten Dienstleistungen im Vergleich zum Gesamtumfang der im Vertrag vorgesehenen Dienstleistungen entspricht." },
          ],
        },
        {
          title: "Muster-Widerrufsformular",
          blocks: [
            { p: "(Wenn Sie den Vertrag widerrufen wollen, dann füllen Sie bitte dieses Formular aus und senden Sie es zurück.)" },
            {
              ul: [
                `An ${LANDLORD.name}, ${LANDLORD.street}, ${LANDLORD.zipCity}, E-Mail ${LANDLORD.email}`,
                "Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über die Erbringung der folgenden Dienstleistung (*): ______",
                "Bestellt am (*): ______",
                "Name des/der Verbraucher(s): ______",
                "Anschrift des/der Verbraucher(s): ______",
                "Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier): ______",
                "Datum: ______",
              ],
            },
            { p: "(*) Unzutreffendes streichen." },
          ],
        },
      ];

  return {
    version: CONTRACT_VERSION,
    title: `Mietvertrag ${all}`,
    bookingCode: booking.booking_code,
    isBusiness,
    devices: deviceList,
    hasDelivery: delivered.length > 0,
    landlord,
    renter: renterLines,
    lines,
    total,
    deposit,
    rest,
    totalAmount: totalNum,
    depositAmount: depositNum,
    taxNote: "Alle Preise sind Endpreise. Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.",
    sections: S,
    billing: renter?.billing && Object.values(renter.billing).some(Boolean) ? renter.billing : null,
    withdrawal,
  };
}

/** Produktlabel für Überschriften (z. B. "Fotospiegel & Audiogästebuch"). */
export function contractProductLabel(devices: DeviceKey[]): string {
  return devices.map((d) => PRODUCT_LABELS[d]).join(" & ");
}

// ---------------------------------------------------------------------------
// HTML-Ausgabe (für die E-Mail an den Kunden – dauerhafter Datenträger)
// ---------------------------------------------------------------------------

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

function blocksHtml(blocks: ContractBlock[]): string {
  return blocks
    .map((b) =>
      "p" in b
        ? `<p style="margin:0 0 8px;line-height:1.55">${esc(b.p)}</p>`
        : `<ul style="margin:0 0 8px;padding-left:18px;line-height:1.55">${b.ul.map((li) => `<li>${esc(li)}</li>`).join("")}</ul>`
    )
    .join("");
}

export function contractToHtml(doc: ContractDoc, signature?: { signer: string; signedAt: string }): string {
  const lines = doc.lines
    .map(
      (l) =>
        `<tr><td style="padding:6px 0;vertical-align:top">${esc(l.name)}${
          l.features?.length ? `<div style="color:#6f7882;font-size:12px">${l.features.map(esc).join(" · ")}</div>` : ""
        }</td><td style="padding:6px 0;text-align:right;white-space:nowrap;vertical-align:top">${esc(l.price)}</td></tr>`
    )
    .join("");
  const sections = doc.sections
    .map((s, i) => `<h3 style="margin:18px 0 6px;font-family:Georgia,serif;font-size:15px">§ ${i + 1} ${esc(s.title)}</h3>${blocksHtml(s.blocks)}`)
    .join("");
  const withdrawal = (doc.withdrawal ?? [])
    .map((s) => `<h3 style="margin:18px 0 6px;font-family:Georgia,serif;font-size:15px">${esc(s.title)}</h3>${blocksHtml(s.blocks)}`)
    .join("");
  return `<div style="font-size:13px;color:#1f2227">
<table role="presentation" width="100%" style="font-size:13px"><tr>
<td style="vertical-align:top;padding-right:12px"><strong>Vermieter</strong><br>${doc.landlord.map(esc).join("<br>")}</td>
<td style="vertical-align:top"><strong>Mieter</strong><br>${doc.renter.map(esc).join("<br>")}</td></tr></table>
<h3 style="margin:18px 0 6px;font-family:Georgia,serif;font-size:15px">Leistungsübersicht</h3>
<table role="presentation" width="100%" style="font-size:13px">${lines}
<tr><td style="padding:8px 0 0;border-top:1px solid #e4e6e8;font-weight:600">Gesamtpreis</td><td style="padding:8px 0 0;border-top:1px solid #e4e6e8;text-align:right;font-weight:600;white-space:nowrap">${esc(doc.total)}</td></tr>
<tr><td style="padding:2px 0;color:#6f7882">davon Anzahlung</td><td style="padding:2px 0;text-align:right;color:#6f7882;white-space:nowrap">${esc(doc.deposit)}</td></tr>
</table>
<p style="color:#6f7882;font-size:12px">${esc(doc.taxNote)}</p>
${sections}${withdrawal}
${signature ? `<p style="margin-top:18px;padding:10px;border:1px solid #e4e6e8;border-radius:8px">Digital unterschrieben von <strong>${esc(signature.signer)}</strong> am ${esc(signature.signedAt)} · Vertragsversion ${esc(doc.version)}</p>` : ""}
</div>`;
}
