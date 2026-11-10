// Anlass-Seiten von visionbooth.de (SEO): je Anlass eigene Adresse, eigene Texte und passende Beispiele.
// Neue Seite = Eintrag hier + Ordner unter app/vb/<slug> + Eintrag in app/sitemap.xml/route.ts + Pfad in middleware.ts (VB_PAGES).

import type { VbPlanId } from "@/components/visionbooth/packages";
import type { LineIconName } from "./OccasionIcon";

export type AnlassSlug = "hochzeit" | "geburtstag" | "firmenfeier" | "kindergeburtstag";

export interface AnlassPage {
  slug: AnlassSlug;
  /** Kurzname für Links („Hochzeit“) */
  name: string;
  seoTitle: string;
  seoDesc: string;
  eyebrow: string;
  /** Überschrift: Teil vor dem goldenen Wort, goldenes Wort */
  h1: [string, string];
  lead: string;
  plan: VbPlanId;
  planTab: "privat" | "business";
  frames: { template: string; text: string; sub?: string }[];
  framesTitle: string;
  /** Missions-Vorlagen aus challenges.ts (erste Einträge werden gezeigt) */
  missionSets: string[];
  /** KI-Stile (leer = Hinweis „ohne KI“) */
  styles: [string, string][];
  moments: { title: string; text: string }[];
  highlights: { icon: LineIconName; title: string; text: string }[];
  prose: { title: [string, string]; paragraphs: string[] };
  faq: { q: string; a: string }[];
}

const S: Record<string, string> = {
  glamour: "Hollywood",
  vintage: "Vintage",
  animation: "3D-Animation",
  superheld: "Superheld",
  comic: "Comic",
  business: "Business",
  weihnachten: "Weihnachten",
  neon: "Neon",
};
const styles = (...ids: string[]): [string, string][] => ids.map((id) => [id, S[id]]);

export const ANLASS_PAGES: Record<AnlassSlug, AnlassPage> = {
  hochzeit: {
    slug: "hochzeit",
    name: "Hochzeit",
    seoTitle: "Digitale Fotobox für die Hochzeit – ohne App | VisionBooth",
    seoDesc:
      "Die digitale Hochzeits-Fotobox: Eure Gäste scannen einen QR-Code und fotografieren mit dem eigenen Handy – mit eurem Rahmen, Hochzeits-Missionen, KI-Bildern und gemeinsamer Galerie. Deutschlandweit, ohne App, ab 79 €.",
    eyebrow: "Digitale Fotobox · Hochzeit",
    h1: ["Die digitale Fotobox für eure ", "Hochzeit"],
    lead:
      "Jeder Gast wird zum Hochzeitsfotografen: QR-Code scannen, Foto mit eurem Rahmen machen – und alle Bilder landen in einer gemeinsamen Galerie. Ganz ohne App und ohne Aufbau, ideal als Ergänzung zum Fotografen.",
    plan: "hochzeit",
    planTab: "privat",
    framesTitle: "Rahmen mit euren Namen und eurem Datum",
    frames: [
      { template: "elegant-gold", text: "Anna & Max", sub: "12.06.2027" },
      { template: "botanisch", text: "Anna & Max", sub: "12.06.2027" },
      { template: "champagner", text: "Anna & Max", sub: "12.06.2027" },
    ],
    missionSets: ["hochzeit"],
    styles: styles("glamour", "vintage", "animation", "superheld"),
    moments: [
      { title: "Beim Sektempfang", text: "QR-Codes auf den Stehtischen – die ersten Fotos entstehen, während ihr noch Glückwünsche entgegennehmt." },
      { title: "Beim Essen & an jedem Tisch", text: "Fotos von Tischen, Gesprächen und Momenten, die ein einzelner Fotograf nie alle einfangen kann." },
      { title: "Auf der Tanzfläche", text: "Die Live-Foto-Wand zeigt neue Bilder sofort – und am nächsten Morgen habt ihr alles in einer Galerie." },
    ],
    highlights: [
      { icon: "heart", title: "Gästebuch zum Foto", text: "Gäste schreiben euch einen Gruß direkt zum Foto – am Ende als schönes Gästebuch zum Ausdrucken." },
      { icon: "target", title: "Hochzeits-Missionen", text: "„Selfie mit dem Brautpaar“ oder „Foto mit der ältesten Person im Raum“ – so machen auch die Fotofaulen mit." },
      { icon: "tv", title: "Live-Foto-Wand", text: "Auf Beamer oder TV erscheinen die neuesten Fotos sofort – ein echter Hingucker am Abend." },
      { icon: "download", title: "Alle Fotos als ZIP", text: "Kein Hinterherlaufen in WhatsApp-Gruppen: Alle Bilder eurer Gäste mit einem Klick, bis zu 6 Monate online." },
    ],
    prose: {
      title: ["Warum eine digitale Fotobox auf der ", "Hochzeit"],
      paragraphs: [
        "Eine klassische Fotobox steht an einem Platz – die digitale Fotobox ist überall dort, wo eure Gäste sind. Ein QR-Code auf jedem Tisch genügt, und schon entstehen Fotos beim Sektempfang, beim Essen und auf der Tanzfläche. Jedes Bild trägt automatisch euren Rahmen mit Namen und Hochzeitsdatum.",
        "Die VisionBooth ersetzt keinen Hochzeitsfotografen, sondern ergänzt ihn: Ihr bekommt die spontanen, lustigen Momente aus Sicht eurer Gäste – an einem Ort statt verteilt auf viele Handys. Da nichts geliefert wird, funktioniert sie überall in Deutschland, ob in der Scheune, im Schloss oder im Restaurant.",
      ],
    },
    faq: [
      { q: "Ersetzt die digitale Fotobox den Hochzeitsfotografen?", a: "Nein – sie ergänzt ihn. Der Fotograf macht die professionellen Bilder, eure Gäste fangen mit der VisionBooth die spontanen Momente an allen Tischen ein. Alles landet in eurer gemeinsamen Galerie." },
      { q: "Wie bekommen die Gäste den QR-Code?", a: "Ihr druckt die fertigen Tischaufsteller aus eurem Kundenbereich aus oder legt den QR-Code in die Menükarte. Alternativ teilt ihr den Link einfach per Nachricht." },
      { q: "Können wir das Design an unsere Hochzeit anpassen?", a: "Ja. Ihr wählt einen Rahmen, tragt eure Namen und euer Datum ein und könnt Farben und Texte jederzeit ändern – auch noch nach der Buchung." },
      { q: "Wie lange können die Gäste Fotos hochladen?", a: "Beim Paket Premium mit KI machen die Gäste 14 Tage lang mit – so können sie auch nach der Feier noch ihre schönsten Handyfotos in eure Galerie legen. Die Galerie bleibt 6 Monate online." },
      { q: "Was kostet die digitale Fotobox für die Hochzeit?", a: "Das Paket Classic gibt es für 79 €, Premium mit 150 KI-Verwandlungen und 6 Monaten Galerie für 129 € – einmalig, ohne Abo." },
    ],
  },

  geburtstag: {
    slug: "geburtstag",
    name: "Geburtstag",
    seoTitle: "Digitale Fotobox für den Geburtstag – ohne App | VisionBooth",
    seoDesc:
      "Die digitale Fotobox für den 18., 30., 40. oder 50. Geburtstag: Gäste fotografieren per QR-Code mit dem eigenen Handy – mit eurem Rahmen, Foto-Spielen, KI-Verwandlungen und Galerie. Deutschlandweit, ohne App, ab 79 €.",
    eyebrow: "Digitale Fotobox · Geburtstag",
    h1: ["Die digitale Fotobox für deinen ", "Geburtstag"],
    lead:
      "Ob 18., 30. oder 60.: Deine Gäste scannen einen QR-Code und machen Fotos mit deinem Rahmen, spielen Foto-Missionen und verwandeln sich per KI in Superhelden. Alle Bilder landen in einer Galerie – ganz ohne App.",
    plan: "party",
    planTab: "privat",
    framesTitle: "Rahmen mit deinem Namen und deiner Zahl",
    frames: [
      { template: "gold-ballons", text: "Lenas 30.", sub: "Happy Birthday" },
      { template: "neon-geburtstag", text: "Tims 40.", sub: "Let's party" },
      { template: "bunt-ballons", text: "Mias 18.", sub: "Happy Birthday" },
    ],
    missionSets: ["geburtstag"],
    styles: styles("superheld", "comic", "animation", "glamour"),
    moments: [
      { title: "Zuhause oder in der Location", text: "Kein Platz für eine Fotobox? Kein Problem – die VisionBooth braucht nur einen QR-Code auf dem Tisch." },
      { title: "Spiele, die alle mitreißen", text: "Foto-Missionen mit Bestenliste und das Foto-Glücksrad sorgen für Lacher und bringen Gäste ins Gespräch." },
      { title: "Am nächsten Tag", text: "Alle Fotos deiner Gäste in einer Galerie – statt einzeln in WhatsApp nachzufragen." },
    ],
    highlights: [
      { icon: "wheel", title: "Foto-Glücksrad", text: "Am Rad drehen, lustige Aufgabe bekommen, abdrücken – spontan und ohne Punkte." },
      { icon: "trophy", title: "Missionen & Bestenliste", text: "„Stellt ein altes Kinderfoto nach“ oder „Zeig deinen besten Tanzmove“ – wer holt die meisten Punkte?" },
      { icon: "sparkle", title: "KI-Verwandlung", text: "Mit Premium werden Selfies in Sekunden zu Superheld, Comic oder Hollywood-Star." },
      { icon: "tv", title: "Live-Foto-Wand", text: "Neue Fotos laufen sofort auf dem Fernseher – mit QR-Code zum Mitmachen." },
    ],
    prose: {
      title: ["Fotobox für den Geburtstag – ", "ganz ohne Gerät"],
      paragraphs: [
        "Eine Fotobox zu mieten lohnt sich für viele Geburtstagsfeiern nicht: Lieferung, Aufbau und Platzbedarf passen nicht zu jeder Wohnung, jedem Garten oder Partyraum. Die digitale Fotobox macht jedes Handy zur Fotobox – deine Gäste brauchen nur einen QR-Code.",
        "Jedes Foto bekommt deinen Geburtstags-Rahmen mit Namen und Zahl, Spiele wie Foto-Missionen und Glücksrad sorgen für Stimmung, und am Ende hast du alle Bilder in einer Galerie. Gebucht ist die VisionBooth in zwei Minuten – der Link kommt sofort, auch kurzfristig.",
      ],
    },
    faq: [
      { q: "Kann ich die VisionBooth auch kurzfristig buchen?", a: "Ja. Nach der Bezahlung bekommst du deinen Link sofort per E-Mail – auch am selben Tag. Rahmen und Texte stellst du in wenigen Minuten selbst ein." },
      { q: "Funktioniert das auch bei einer Feier zu Hause?", a: "Ja. Die Gäste nutzen ihr eigenes Handy und mobiles Internet oder dein WLAN. Es muss nichts aufgebaut werden und braucht keinen Platz." },
      { q: "Was ist der Unterschied zwischen Classic und Premium?", a: "Classic (79 €) hat Rahmen, Fotostreifen, Spiele, Live-Foto-Wand und Galerie. Premium (129 €) hat zusätzlich 150 KI-Verwandlungen, 14 Tage Mitmachzeit und 6 Monate Galerie." },
      { q: "Brauchen meine Gäste eine App?", a: "Nein. Sie scannen den QR-Code mit der normalen Handy-Kamera – die VisionBooth öffnet sich direkt im Browser, auf iPhone und Android." },
    ],
  },

  firmenfeier: {
    slug: "firmenfeier",
    name: "Firmen- & Weihnachtsfeier",
    seoTitle: "Digitale Fotobox für Firmenfeier & Weihnachtsfeier | VisionBooth",
    seoDesc:
      "Die digitale Fotobox für Firmenfeier, Weihnachtsfeier und Sommerfest: Mitarbeitende fotografieren per QR-Code mit dem eigenen Handy – mit eurem Logo, Team-Missionen, KI-Bildern und Live-Foto-Wand. Deutschlandweit, ohne App.",
    eyebrow: "Digitale Fotobox · Firmenfeier & Weihnachtsfeier",
    h1: ["Die digitale Fotobox für eure ", "Firmenfeier"],
    lead:
      "Für Weihnachtsfeier, Sommerfest oder Jubiläum: Eure Mitarbeitenden scannen einen QR-Code und fotografieren mit dem eigenen Handy – mit eurem Logo auf jedem Foto, Team-Missionen und Live-Foto-Wand. Ohne App, ohne Aufbau, an jedem Standort.",
    plan: "business",
    planTab: "business",
    framesTitle: "Euer Logo und eure Farben auf jedem Foto",
    frames: [
      { template: "winterzauber", text: "Muster GmbH", sub: "18.12.2026" },
      { template: "corporate", text: "Muster GmbH", sub: "Sommerfest 2027" },
      { template: "schwarz-gold", text: "Muster GmbH", sub: "25 Jahre" },
    ],
    missionSets: ["firma"],
    styles: styles("weihnachten", "business", "superheld", "comic"),
    moments: [
      { title: "Teams kommen ins Gespräch", text: "Missionen wie „Foto mit jemandem aus einer anderen Abteilung“ bringen Kolleginnen und Kollegen zusammen." },
      { title: "Eure Marke im Bild", text: "Rahmen mit Logo und Farben – jedes geteilte Foto und jede Story trägt euer Unternehmen." },
      { title: "Fotos für Intranet & Social Media", text: "Nach der Feier alle Bilder gesammelt als ZIP – ideal für Mitarbeiter-News und Recruiting." },
    ],
    highlights: [
      { icon: "tag", title: "Firmen-Design mit Logo", text: "Euer Logo und eure Farben auf jedem Foto, jedem Fotostreifen und jeder Story." },
      { icon: "users", title: "Team-Missionen", text: "„Euer Team in Siegerpose“ oder „Selfie mit der Chefin oder dem Chef“ – mit Bestenliste." },
      { icon: "sparkle", title: "300 KI-Verwandlungen", text: "Weihnachts-, Business- oder Superhelden-Look – in Sekunden aus dem eigenen Selfie." },
      { icon: "gift", title: "Gewinnspiel möglich", text: "Optional ein Gewinnspiel oder Kontaktformular nach dem Foto – freiwillig und datenschutzfreundlich." },
    ],
    prose: {
      title: ["Digitale Fotobox für die ", "Weihnachtsfeier"],
      paragraphs: [
        "Gerade auf der Weihnachtsfeier soll niemand lange vor einer einzelnen Fotobox anstehen. Mit der digitalen Fotobox fotografieren alle Mitarbeitenden mit dem eigenen Handy – mit Winter-Rahmen, eurem Logo und KI-Verwandlungen im Weihnachts-Look. Die Live-Foto-Wand zeigt die Bilder sofort auf dem Bildschirm.",
        "Weil nichts geliefert und aufgebaut wird, eignet sich die VisionBooth auch für Teams an mehreren Standorten, für Abteilungsfeiern oder Feiern im Restaurant. Ihr erhaltet eine Rechnung für eure Buchhaltung und habt nach der Feier alle Fotos gesammelt an einem Ort.",
      ],
    },
    faq: [
      { q: "Bekommen wir eine Rechnung?", a: "Ja. Bei der Buchung gebt ihr eure Firmendaten an und erhaltet eine ordentliche Rechnung für eure Buchhaltung." },
      { q: "Können wir unser Firmenlogo verwenden?", a: "Ja. Im Business-Paket ladet ihr euer Logo hoch und wählt eure Farben – das Logo erscheint auf jedem Foto, Fotostreifen und jeder Story." },
      { q: "Wie viele Mitarbeitende können mitmachen?", a: "So viele, wie bei der Feier sind – jede Person nutzt das eigene Handy. Im Business-Paket sind 300 KI-Verwandlungen enthalten." },
      { q: "Was passiert mit den Fotos unserer Mitarbeitenden?", a: "Fotos erscheinen nur in Galerie und Foto-Wand, wenn die Person zustimmt. Nach Ablauf der Speicherzeit werden sie automatisch gelöscht." },
      { q: "Was kostet die digitale Fotobox für die Firmenfeier?", a: "Das Business-Paket mit Logo, 300 KI-Verwandlungen und Team-Missionen gibt es ab 299 €. Für mehrtägige Messen gibt es das Messe-Paket." },
    ],
  },

  kindergeburtstag: {
    slug: "kindergeburtstag",
    name: "Kindergeburtstag & Babyparty",
    seoTitle: "Digitale Fotobox für Kindergeburtstag & Babyparty | VisionBooth",
    seoDesc:
      "Die digitale Fotobox für Kindergeburtstag und Babyparty: Motto-Rahmen wie Dino, Prinzessin oder Feuerwehr, lustige Kinder-Missionen und ein Gender-Reveal-Tippspiel. Per QR-Code, ohne App, deutschlandweit ab 79 €.",
    eyebrow: "Digitale Fotobox · Kindergeburtstag & Babyparty",
    h1: ["Die digitale Fotobox für ", "Kindergeburtstag & Babyparty"],
    lead:
      "Motto-Rahmen mit Dino, Prinzessin oder Feuerwehr, lustige Foto-Missionen für Kinder – und für die Babyparty ein Gender-Reveal-Tippspiel. Die Eltern scannen einen QR-Code und fotografieren mit dem eigenen Handy, alle Bilder landen in einer Galerie.",
    plan: "party",
    planTab: "privat",
    framesTitle: "Motto-Rahmen, die Kinder lieben",
    frames: [
      { template: "dino-dschungel", text: "Paulas 6. Geburtstag" },
      { template: "prinzessin-schloss", text: "Emmas 5. Geburtstag" },
      { template: "feuerwehr-comic", text: "Leos 4. Geburtstag" },
    ],
    missionSets: ["kinder", "babyparty"],
    styles: [],
    moments: [
      { title: "Kindergeburtstag", text: "„Brüll wie ein Dino!“ oder „Deine beste Superhelden-Pose“ – Kinder-Missionen machen Fotos zum Spiel." },
      { title: "Babyparty & Gender Reveal", text: "Junge oder Mädchen? Gäste tippen, ihr Foto wird rosa oder blau – und ihr löst live auf der Foto-Wand auf." },
      { title: "Für die Familie", text: "Omas, Opas und Freunde legen ihre Fotos in eine gemeinsame Galerie – am Ende alles als ZIP." },
    ],
    highlights: [
      { icon: "kindergeburtstag", title: "Motto-Rahmen", text: "Dino, Prinzessin, Feuerwehr, Piraten, Einhorn, Weltraum oder Fußball – mit Name und Alter." },
      { icon: "babyparty", title: "Gender-Reveal-Tippspiel", text: "Gäste stimmen ab, ihr seht den Zwischenstand und löst im richtigen Moment live auf." },
      { icon: "lock", title: "Kinderfotos ohne KI", text: "Beim Kindergeburtstag ist die KI-Verwandlung bewusst aus – Kinderfotos geben wir nicht an KI-Dienste weiter." },
      { icon: "image", title: "Fotostreifen & Story", text: "Jedes Foto auch als 3er-Fotostreifen oder im Story-Format zum Teilen." },
    ],
    prose: {
      title: ["Fotobox für den ", "Kindergeburtstag"],
      paragraphs: [
        "Beim Kindergeburtstag ist meist keine Zeit, nebenbei Fotos zu machen. Mit der digitalen Fotobox fotografieren alle Eltern, Großeltern und Gäste – und jedes Bild bekommt den Motto-Rahmen mit Name und Alter des Geburtstagskindes. Am Abend sind alle Fotos in einer Galerie, ganz ohne WhatsApp-Gruppe.",
        "Für die Babyparty gibt es neben Rahmen in sanften Farben das Gender-Reveal-Tippspiel: Gäste tippen auf Rosa oder Blau, und auf der Live-Foto-Wand wird aufgelöst. Die VisionBooth funktioniert zu Hause, im Garten oder in der Spielhalle – überall in Deutschland.",
      ],
    },
    faq: [
      { q: "Warum gibt es beim Kindergeburtstag keine KI-Bilder?", a: "Zum Schutz der Kinder: Kinderfotos geben wir nicht an KI-Dienste weiter. Deshalb ist die KI-Verwandlung beim Kindergeburtstag bewusst ausgeschaltet." },
      { q: "Wie funktioniert das Gender-Reveal-Tippspiel?", a: "Gäste tippen beim Foto auf Junge oder Mädchen, ihr Foto wird rosa oder blau. Ihr seht den Zwischenstand und löst im richtigen Moment live auf der Foto-Wand auf." },
      { q: "Welche Motto-Rahmen gibt es für Kinder?", a: "Unter anderem Dino, Prinzessin, Feuerwehr, Piraten, Einhorn, Weltraum und Fußball – jeweils mit Name und Alter des Geburtstagskindes." },
      { q: "Was kostet die digitale Fotobox für den Kindergeburtstag?", a: "Das Paket Classic mit Motto-Rahmen, Missionen, Galerie und Live-Foto-Wand gibt es für 79 € – einmalig, ohne Abo." },
    ],
  },
};

export const ANLASS_ORDER: AnlassSlug[] = ["hochzeit", "geburtstag", "firmenfeier", "kindergeburtstag"];
