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
      "Informationen zur Verarbeitung personenbezogener Daten finden sich in unseren Datenschutzhinweisen (fotobox-essen.com/datenschutz.html) und für Gäste direkt in der VisionBooth unter „Datenschutz“.",
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
