import { LANDLORD } from "@/lib/contract";
import { VB_PLANS } from "@/components/visionbooth/packages";
export { VB_CONSENT_START } from "@/components/visionbooth/consent";

// AGB und Widerrufsbelehrung für VisionBooth – ENTWURF, vor dem Verkauf anwaltlich prüfen lassen.
// Eine Quelle für die Seiten /vb/agb und /vb/widerruf und die Bestätigungs-Mail nach der Buchung.
// Bei inhaltlichen Änderungen VB_LEGAL_VERSION hochzählen – sie wird mit der Zustimmung gespeichert.

export const VB_LEGAL_VERSION = "2026-11-04";

export type LegalBlock = string | { ul: string[] };
export interface LegalSection {
  title: string;
  blocks: LegalBlock[];
}

const shop = VB_PLANS.filter((p) => p.kind !== "addon");
const provider = `${LANDLORD.name}, ${LANDLORD.street}, ${LANDLORD.zipCity}, Telefon ${LANDLORD.phone}, E-Mail ${LANDLORD.email}`;

export const VB_AGB: LegalSection[] = [
  {
    title: "§ 1 Geltungsbereich und Anbieter",
    blocks: [
      `Diese Allgemeinen Geschäftsbedingungen gelten für alle Verträge über die digitale Fotobox „VisionBooth“, die über visionbooth.de bzw. portal.fotobox-essen.com geschlossen werden. Anbieter und Vertragspartner ist ${provider} (im Folgenden „wir“).`,
      "Verbraucher ist jede natürliche Person, die den Vertrag zu Zwecken abschließt, die überwiegend weder ihrer gewerblichen noch ihrer selbständigen beruflichen Tätigkeit zugerechnet werden können (§ 13 BGB). Unternehmer ist, wer bei Vertragsschluss in Ausübung seiner gewerblichen oder selbständigen beruflichen Tätigkeit handelt (§ 14 BGB).",
      "Abweichende Bedingungen des Kunden gelten nur, wenn wir ihnen ausdrücklich schriftlich zustimmen.",
    ],
  },
  {
    title: "§ 2 Leistungen",
    blocks: [
      "VisionBooth ist eine digitale Fotobox, die im Browser der Smartphones der Gäste läuft. Eine App-Installation ist nicht nötig. Der Kunde erhält einen persönlichen Verwaltungs-Link (Kundenbereich) sowie einen Gäste-Link mit QR-Code für sein Event.",
      "Der genaue Leistungsumfang ergibt sich aus der Paketbeschreibung zum Zeitpunkt der Buchung, insbesondere:",
      { ul: shop.map((p) => `${p.label}: ${p.summary}; Gäste-Link ${p.days} Tage aktiv; Fotos werden ${p.retentionDays} Tage nach Ende gespeichert${p.aiLimit ? `; bis zu ${p.aiLimit} KI-Verwandlungen` : ""}.`) },
      "Gestaltung (Vorlage, Texte, Logo), Spiele und Einstellungen nimmt der Kunde selbst im Kundenbereich vor. Wir stellen die technische Plattform bereit; eine Betreuung vor Ort ist nicht Bestandteil der Leistung.",
      "Für die Nutzung benötigen Gäste ein internetfähiges Endgerät mit aktuellem Browser und eine funktionierende Internetverbindung (WLAN oder Mobilfunk) am Veranstaltungsort. Für die Netzverbindung vor Ort sind wir nicht verantwortlich.",
    ],
  },
  {
    title: "§ 3 Vertragsschluss",
    blocks: [
      "Die Darstellung der Pakete auf unserer Website ist kein bindendes Angebot, sondern eine Aufforderung zur Buchung.",
      "Mit dem Klick auf „Zahlungspflichtig buchen“ gibt der Kunde ein verbindliches Angebot zum Abschluss des Vertrags ab. Vorher kann er alle Angaben in der Übersicht prüfen und über „ändern“ korrigieren.",
      "Der Vertrag kommt mit dem erfolgreichen Abschluss der Zahlung zustande. Wir bestätigen den Vertrag unverzüglich per E-Mail; diese enthält die Vertragsdaten und die Widerrufsbelehrung. Vertragssprache ist Deutsch.",
      "Wir speichern den Vertragstext. Diese AGB kann der Kunde jederzeit unter visionbooth.de/vb/agb abrufen, speichern und ausdrucken.",
    ],
  },
  {
    title: "§ 4 Preise und Zahlung",
    blocks: [
      "Es gelten die bei der Buchung angezeigten Preise. Alle Preise sind Endpreise; gemäß § 19 UStG (Kleinunternehmerregelung) wird keine Umsatzsteuer berechnet.",
      "Die Zahlung ist bei Buchung sofort fällig und erfolgt über unseren Zahlungsdienstleister Stripe (Karte, Apple Pay, Google Pay, PayPal und weitere angezeigte Zahlungsarten). Eine Rechnung erhalten Sie per E-Mail.",
    ],
  },
  {
    title: "§ 5 Leistungsbeginn und Laufzeit",
    blocks: [
      "Auf ausdrücklichen Wunsch des Kunden richten wir die VisionBooth unmittelbar nach der Zahlung ein und schalten den Kundenbereich frei – auch vor Ablauf der Widerrufsfrist (siehe § 13).",
      "Der Gäste-Link ist ab dem angegebenen Eventtag für die im Paket genannte Dauer aktiv. Danach können Gäste keine neuen Fotos mehr aufnehmen; Galerie und Download bleiben bis zum Ende der Speicherfrist verfügbar. Der Vertrag endet mit Ablauf der Speicherfrist, ohne dass es einer Kündigung bedarf.",
    ],
  },
  {
    title: "§ 6 Speicherung und Löschung der Fotos",
    blocks: [
      "Fotos werden für die im Paket genannte Speicherfrist nach Ende des Gäste-Links gespeichert und danach automatisch und endgültig gelöscht. Wir erinnern den Kunden vorher per E-Mail.",
      "Der Kunde ist selbst dafür verantwortlich, die Fotos rechtzeitig herunterzuladen (z. B. „Alle (ZIP)“ in der Galerie). Nach der Löschung ist eine Wiederherstellung nicht möglich.",
      "Fotos werden mit Rahmen in der Auflösung der App gespeichert (z. B. 1080 × 1350 Pixel für Einzelfotos), nicht in der Original-Auflösung der Handykamera.",
    ],
  },
  {
    title: "§ 7 KI-Verwandlungen",
    blocks: [
      "Je nach Paket können Gäste Fotos auf Wunsch mit künstlicher Intelligenz in einen Stil verwandeln lassen. Dafür wird das jeweilige Foto an unseren Dienstleister fal.ai (Features & Labels, Inc., USA) übermittelt; Einzelheiten stehen in den Datenschutzhinweisen für Gäste.",
      "KI-Ergebnisse sind künstlerische Interpretationen. Eine bestimmte Ähnlichkeit, Qualität oder ein bestimmtes Aussehen können wir nicht zusichern. Das Kontingent je Paket, je Gast und je Tag ist begrenzt; nicht genutzte KI-Verwandlungen verfallen mit Ende des Gäste-Links und werden nicht erstattet.",
      "Beim Anlass Kindergeburtstag ist die KI-Verwandlung grundsätzlich ausgeschaltet.",
    ],
  },
  {
    title: "§ 8 Pflichten des Kunden",
    blocks: [
      "Der Kunde informiert seine Gäste darüber, dass bei der Veranstaltung VisionBooth eingesetzt wird – etwa über den mitgelieferten QR-Aufsteller, der auf die Datenschutzhinweise für Gäste verweist.",
      "Der Kunde lädt nur Inhalte (z. B. Logos, Texte) hoch, an denen er die erforderlichen Rechte besitzt, und sorgt dafür, dass über seine VisionBooth keine rechtswidrigen, beleidigenden oder jugendgefährdenden Inhalte verbreitet werden. Unpassende Fotos kann er im Kundenbereich jederzeit ausblenden oder löschen.",
      "Der Verwaltungs-Link ist vertraulich zu behandeln; wer ihn kennt, kann die VisionBooth bearbeiten.",
      "Bei Verstößen gegen diese Pflichten dürfen wir betroffene Inhalte sperren oder löschen.",
    ],
  },
  {
    title: "§ 9 Rechte an Inhalten",
    blocks: [
      "Die Rechte an den Fotos verbleiben bei den Gästen bzw. beim Kunden. Wir erhalten nur die Rechte, die nötig sind, um die Fotos zu speichern, zu bearbeiten (Rahmen, KI-Stil) und im Rahmen der gebuchten Leistung anzuzeigen.",
      "Wir nutzen Fotos nicht für Werbung oder eigene Zwecke, es sei denn, der Kunde und die abgebildeten Personen haben dem gesondert zugestimmt.",
    ],
  },
  {
    title: "§ 10 Verfügbarkeit",
    blocks: [
      "Wir bemühen uns um eine möglichst unterbrechungsfreie Verfügbarkeit. Kurzzeitige Einschränkungen, etwa durch Wartung, Störungen bei Dienstleistern oder höhere Gewalt, lassen sich nicht vollständig ausschließen. Geplante Wartungen legen wir nach Möglichkeit außerhalb typischer Veranstaltungszeiten.",
    ],
  },
  {
    title: "§ 11 Gewährleistung",
    blocks: [
      "Es gelten die gesetzlichen Vorschriften, für Verbraucher insbesondere die Regeln über digitale Produkte (§§ 327 ff. BGB). Bitte meldet Probleme möglichst sofort, damit wir noch während des Events helfen können: " + `${LANDLORD.phone} (auch WhatsApp) oder ${LANDLORD.email}.`,
    ],
  },
  {
    title: "§ 12 Haftung",
    blocks: [
      "Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit, bei der Verletzung von Leben, Körper oder Gesundheit sowie nach dem Produkthaftungsgesetz.",
      "Bei leicht fahrlässiger Verletzung wesentlicher Vertragspflichten (Pflichten, deren Erfüllung die ordnungsgemäße Durchführung des Vertrags überhaupt erst ermöglicht und auf deren Einhaltung der Kunde regelmäßig vertrauen darf) ist die Haftung auf den vertragstypischen, vorhersehbaren Schaden begrenzt. Im Übrigen ist die Haftung für leichte Fahrlässigkeit ausgeschlossen.",
      "Für den Verlust von Fotos, die der Kunde nicht innerhalb der Speicherfrist heruntergeladen hat, haften wir nicht.",
    ],
  },
  {
    title: "§ 13 Widerrufsrecht",
    blocks: [
      "Verbrauchern steht ein gesetzliches Widerrufsrecht zu. Einzelheiten stehen in der Widerrufsbelehrung unter visionbooth.de/vb/widerruf, die auch in der Bestätigungs-Mail enthalten ist.",
      "Verlangt der Verbraucher, dass wir vor Ablauf der Widerrufsfrist mit der Leistung beginnen, und widerruft er danach, schuldet er Wertersatz für die bis dahin erbrachte Leistung. Das Widerrufsrecht erlischt, wenn wir die Leistung vollständig erbracht haben.",
    ],
  },
  {
    title: "§ 14 Datenschutz",
    blocks: [
      "Informationen zur Verarbeitung personenbezogener Daten finden sich in unseren Datenschutzhinweisen (visionbooth.de/vb/datenschutz) und für Gäste direkt in der VisionBooth unter „Datenschutz“.",
      "Firmenkunden, die VisionBooth als Verantwortliche für die Daten ihrer Gäste einsetzen, erhalten auf Anfrage einen Vertrag zur Auftragsverarbeitung.",
    ],
  },
  {
    title: "§ 15 Streitbeilegung",
    blocks: [
      "Wir sind weder bereit noch verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.",
    ],
  },
  {
    title: "§ 16 Schlussbestimmungen",
    blocks: [
      "Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts. Bei Verbrauchern gilt diese Rechtswahl nur, soweit dadurch nicht zwingende Schutzvorschriften des Staates ihres gewöhnlichen Aufenthalts entzogen werden.",
      "Ist der Kunde Kaufmann, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches Sondervermögen, ist Gerichtsstand Essen.",
      "Sollten einzelne Bestimmungen unwirksam sein, bleibt der Vertrag im Übrigen wirksam.",
    ],
  },
];

/** Widerrufsbelehrung für Dienstleistungen (nach dem gesetzlichen Muster, Anlage 1 zu Art. 246a § 1 Abs. 2 EGBGB). */
export const VB_WIDERRUF: LegalSection[] = [
  {
    title: "Widerrufsrecht",
    blocks: [
      "Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses.",
      `Um Ihr Widerrufsrecht auszuüben, müssen Sie uns (${provider}) mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder eine E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren. Sie können dafür das beigefügte Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.`,
      "Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.",
    ],
  },
  {
    title: "Folgen des Widerrufs",
    blocks: [
      "Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses Vertrags bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen wegen dieser Rückzahlung Entgelte berechnet.",
      "Haben Sie verlangt, dass die Dienstleistungen während der Widerrufsfrist beginnen sollen, so haben Sie uns einen angemessenen Betrag zu zahlen, der dem Anteil der bis zu dem Zeitpunkt, zu dem Sie uns von der Ausübung des Widerrufsrechts hinsichtlich dieses Vertrags unterrichten, bereits erbrachten Dienstleistungen im Vergleich zum Gesamtumfang der im Vertrag vorgesehenen Dienstleistungen entspricht.",
    ],
  },
  {
    title: "Besonderer Hinweis",
    blocks: [
      "Ihr Widerrufsrecht erlischt, wenn wir die Dienstleistung vollständig erbracht haben und Sie vor Beginn der Ausführung ausdrücklich zugestimmt und Ihre Kenntnis davon bestätigt haben, dass Sie Ihr Widerrufsrecht bei vollständiger Vertragserfüllung verlieren.",
    ],
  },
];

export const VB_WIDERRUF_FORM = [
  "Muster-Widerrufsformular",
  "(Wenn Sie den Vertrag widerrufen wollen, dann füllen Sie bitte dieses Formular aus und senden Sie es zurück.)",
  `An: ${LANDLORD.name}, ${LANDLORD.street}, ${LANDLORD.zipCity}, E-Mail: ${LANDLORD.email}`,
  "Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über die Erbringung der folgenden Dienstleistung: VisionBooth (Paket, Eventdatum, Bestellnummer)",
  "Bestellt am (*) / erhalten am (*)",
  "Name des/der Verbraucher(s)",
  "Anschrift des/der Verbraucher(s)",
  "Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier)",
  "Datum",
  "(*) Unzutreffendes streichen.",
];

/** Klartext für Mails (Widerrufsbelehrung auf dauerhaftem Datenträger). */
export function legalText(sections: LegalSection[]): string {
  return sections
    .map((s) => `${s.title}\n\n${s.blocks.map((b) => (typeof b === "string" ? b : b.ul.map((i) => `- ${i}`).join("\n"))).join("\n\n")}`)
    .join("\n\n");
}

/** Datenschutzerklärung für Website, Buchung und Kundenbereich (Gäste: eigene Seite je Event). */
export const VB_DATENSCHUTZ: LegalSection[] = [
  {
    title: "1. Verantwortlicher",
    blocks: [`${provider}.`, "Einen Datenschutzbeauftragten müssen wir nicht benennen; bei Fragen erreichst du uns direkt unter der genannten E-Mail-Adresse."],
  },
  {
    title: "2. Worum es geht",
    blocks: [
      "Diese Erklärung gilt für die VisionBooth-Website, die Online-Buchung und den Kundenbereich. Was mit den Fotos und Angaben der Gäste in einer VisionBooth passiert, steht in den Datenschutzhinweisen für Gäste, die in jeder VisionBooth unter „Datenschutz“ verlinkt sind.",
      "Wir setzen auf den VisionBooth-Seiten keine Werbe- oder Analyse-Cookies und kein Tracking ein.",
    ],
  },
  {
    title: "3. Hosting und Server-Protokolle",
    blocks: [
      "Die Seiten werden bei Vercel Inc. (USA) gehostet. Die Server laufen in einem Rechenzentrum in der EU (Stockholm); damit die Seiten schnell laden, werden sie über Vercels weltweites Netz ausgeliefert. Beim Aufruf verarbeitet der Server technisch notwendige Daten (IP-Adresse, Zeitpunkt, aufgerufene Seite, Browsertyp), um die Seite auszuliefern und vor Missbrauch zu schützen. Rechtsgrundlage ist unser berechtigtes Interesse an einem sicheren Betrieb (Art. 6 Abs. 1 lit. f DSGVO). Protokolle werden kurzfristig automatisch gelöscht.",
      "Mit Vercel besteht ein Vertrag zur Auftragsverarbeitung; Übermittlungen in die USA sind über das EU-US Data Privacy Framework bzw. EU-Standardvertragsklauseln abgesichert.",
    ],
  },
  {
    title: "4. Datenbank und Speicher",
    blocks: ["Buchungen, Event-Einstellungen und Fotos speichern wir bei Supabase (Supabase Inc.) in einem Rechenzentrum in der EU (Stockholm). Es besteht ein Vertrag zur Auftragsverarbeitung."],
  },
  {
    title: "5. Buchung und Zahlung",
    blocks: [
      "Für die Buchung verarbeiten wir die Angaben aus dem Formular (Name, E-Mail-Adresse, ggf. Firma, Anlass, Paket, Eventdatum, Text für den Foto-Rahmen) sowie die Zustimmungen zu AGB und sofortigem Leistungsbeginn mit Zeitpunkt. Rechtsgrundlage ist die Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO); die Zustimmungen speichern wir als Nachweis (Art. 6 Abs. 1 lit. c und f DSGVO).",
      "Die Zahlung wickelt Stripe Payments Europe Ltd. (Irland) ab. Stripe erhält dafür die Zahlungsdaten und ggf. die Rechnungsadresse und ist für die Zahlungsabwicklung selbst verantwortlich; bei Zahlung mit PayPal ist zusätzlich PayPal (Europe) S.à r.l. et Cie, S.C.A. (Luxemburg) beteiligt. Kartendaten sehen wir nicht. Mehr dazu in den Datenschutzhinweisen von Stripe (stripe.com/de/privacy).",
    ],
  },
  {
    title: "6. Rechnungen",
    blocks: ["Rechnungen erstellen wir mit Lexware Office (Haufe-Lexware GmbH & Co. KG, Freiburg). Rechtsgrundlage ist unsere gesetzliche Pflicht zur Rechnungsstellung und Aufbewahrung (Art. 6 Abs. 1 lit. c DSGVO i. V. m. § 14 UStG, § 147 AO)."],
  },
  {
    title: "7. E-Mails",
    blocks: [
      "Wir senden dir Mails zu deiner Buchung: Link zum Kundenbereich mit Vertragsbestätigung, Rechnung, Erinnerung vor dem Event, Hinweis nach dem Event und vor der Löschung der Fotos. Versendet werden sie über Resend, Inc. (USA); es besteht ein Vertrag zur Auftragsverarbeitung mit EU-Standardvertragsklauseln. Rechtsgrundlage ist die Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO). Werbung schicken wir nicht.",
    ],
  },
  {
    title: "8. Kundenbereich und Mitteilungen",
    blocks: [
      "Der Kundenbereich ist über einen persönlichen Link erreichbar; ein Passwort gibt es nicht – bitte gib den Link deshalb nicht weiter. Speicherst du den Kundenbereich als App, legt dein Browser dafür Dateien auf deinem Gerät ab.",
      "Mitteilungen aufs Handy (z. B. bei neuen Fotos) senden wir nur, wenn du sie im Kundenbereich einschaltest (Einwilligung, Art. 6 Abs. 1 lit. a DSGVO). Zugestellt werden sie über den Push-Dienst deines Browsers bzw. Betriebssystems (z. B. Apple, Google oder Mozilla). Du kannst sie jederzeit im Kundenbereich oder in den Handy-Einstellungen ausschalten.",
    ],
  },
  {
    title: "9. Fotos, Spiele und KI in der VisionBooth",
    blocks: [
      "Die Fotos und Angaben der Gäste speichern wir nur, wenn Gäste das selbst wählen, und löschen sie automatisch nach der im Paket genannten Frist. Für KI-Verwandlungen übermitteln wir einzelne Fotos auf Wunsch des Gastes an fal.ai (Features & Labels, Inc., USA), abgesichert durch EU-Standardvertragsklauseln; fal.ai speichert die Dateien höchstens eine Stunde. Einzelheiten stehen in den Datenschutzhinweisen für Gäste.",
      "Nutzt ein Firmenkunde das Gewinnspiel bzw. Kontaktformular, ist er für diese Angaben verantwortlich; wir verarbeiten sie nur in seinem Auftrag.",
    ],
  },
  {
    title: "10. Kontakt",
    blocks: ["Schreibst du uns per E-Mail, Telefon oder WhatsApp, verarbeiten wir deine Angaben, um deine Anfrage zu beantworten (Art. 6 Abs. 1 lit. b bzw. f DSGVO). Bei WhatsApp gelten zusätzlich die Datenschutzhinweise von WhatsApp (Meta Platforms Ireland Ltd.)."],
  },
  {
    title: "11. Wie lange wir Daten speichern",
    blocks: [
      { ul: [
        "Fotos und Gäste-Angaben: bis zum Ende der Speicherfrist des Pakets, danach automatische Löschung.",
        "Buchungsdaten: für die Dauer des Vertrags und danach, solange Ansprüche verjähren können (in der Regel 3 Jahre).",
        "Rechnungen und Buchungsbelege: nach den gesetzlichen Aufbewahrungsfristen (bis zu 10 Jahre).",
      ] },
    ],
  },
  {
    title: "12. Deine Rechte",
    blocks: [
      "Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch gegen Verarbeitungen auf Grundlage berechtigter Interessen (Art. 21). Eine Einwilligung kannst du jederzeit mit Wirkung für die Zukunft widerrufen.",
      "Du kannst dich bei einer Datenschutz-Aufsichtsbehörde beschweren, z. B. bei der Landesbeauftragten für Datenschutz und Informationsfreiheit Nordrhein-Westfalen (ldi.nrw.de).",
      "Für eine Buchung brauchen wir Name, E-Mail-Adresse und die Angaben zum Event; ohne sie können wir keinen Vertrag schließen. Eine automatisierte Entscheidungsfindung findet nicht statt.",
    ],
  },
];

/** Impressum nach § 5 DDG und § 18 Abs. 2 MStV. */
export const VB_IMPRESSUM: LegalSection[] = [
  { title: "Angaben gemäß § 5 DDG", blocks: [`${LANDLORD.name}`, `${LANDLORD.street}`, `${LANDLORD.zipCity}`, "Deutschland"] },
  { title: "Kontakt", blocks: [`Telefon: ${LANDLORD.phone} (auch WhatsApp)`, `E-Mail: ${LANDLORD.email}`] },
  { title: "Umsatzsteuer", blocks: ["Kleinunternehmer gemäß § 19 UStG – es wird keine Umsatzsteuer ausgewiesen."] },
  { title: "Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV", blocks: [`Dustin Nowitzki, ${LANDLORD.street}, ${LANDLORD.zipCity}`] },
  { title: "Verbraucherstreitbeilegung", blocks: ["Wir sind weder bereit noch verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen."] },
  { title: "Marke", blocks: ["„VisionBooth“ ist als Marke beim Deutschen Patent- und Markenamt angemeldet."] },
];
