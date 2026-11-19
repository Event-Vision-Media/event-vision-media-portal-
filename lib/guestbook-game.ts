// Gästebuch-Spiel: Gäste scannen am Audiogästebuch einen QR-Code, drehen an einer Telefon-Wählscheibe
// und bekommen eine Aufgabe, was sie aufs Band sprechen können. Inhalte hier, Daten in public.guestbook_games.

export type GameOccasion = "hochzeit" | "geburtstag" | "firma" | "party";
export const GAME_OCCASIONS: GameOccasion[] = ["hochzeit", "geburtstag", "firma", "party"];

/** Katalog-Extra (lib/catalog-data.json) und Name in public.extras */
export const GAME_EXTRA_ID = "gaestebuch-spiel";
export const GAME_EXTRA_NAME = "Gästebuch-Spiel";

export const MAX_CUSTOM_TASKS = 15;
export const MAX_TASK_LENGTH = 160;
export const MAX_NAMES_LENGTH = 60;

/** [Beschriftung in der Wählscheibe, Titel auf der Karte, Aufgaben] – {n} = Namen */
export type GameCategory = [string, string, string[]];

const JOKER: GameCategory = ["Joker", "Joker", [
  "Freestyle! Sag einfach, was dir gerade durch den Kopf geht.",
  "Hol dir jemanden dazu und sprecht eure Nachricht im Duett.",
  "Sprich mit verstellter Stimme – wer zuhört, soll raten, wer du bist.",
  "Fass den Abend bisher zusammen – wie ein Sportreporter im Finale.",
  "Erzähl einen Witz. Je schlechter, desto besser.",
]];

export const GAME: Record<GameOccasion, { label: string; defaultNames: string; title: (n: string) => string; hosts: string; cats: GameCategory[] }> = {
  hochzeit: {
    label: "Hochzeit", defaultNames: "das Brautpaar", title: (n) => `Hochzeit von ${n}`, hosts: "vom Brautpaar",
    cats: [
      ["Liebe", "Liebesbotschaft", [
        "Sag in drei Sätzen, warum die beiden perfekt zusammenpassen.",
        "Beschreib den Moment, in dem du wusstest: Die zwei gehören zusammen.",
        "Wünsch den beiden etwas für ihren ersten Hochzeitstag.",
        "Mach eine Liebeserklärung an das Brautpaar – im Stil eines Wetterberichts.",
        "Welches Kompliment sollten sich die beiden öfter sagen?",
      ]],
      ["Zukunft", "Prognose", [
        "Wie sieht ein ganz normaler Sonntag bei den beiden in zehn Jahren aus?",
        "Wer von beiden gewinnt die meisten Diskussionen – und warum?",
        "Wer hat in 20 Jahren die Fernbedienung in der Hand?",
        "Wohin geht die Reise zur Silberhochzeit? Begründe kurz.",
        "Welcher Mini-Streit wird bei den beiden niemals aufhören?",
      ]],
      ["Ehe-Tipp", "Ehe-Tipp", [
        "Dein bester Tipp für eine glückliche Ehe – in einem Satz.",
        "Welche Hausregel sollten die beiden unbedingt einführen?",
        "Verrat deinen Trick, wie man einen Streit in 60 Sekunden beendet.",
        "Was sollten die beiden nie, wirklich nie vergessen?",
        "Gib einen Ehe-Tipp, der garantiert nichts mit Romantik zu tun hat.",
      ]],
      ["Beichte", "Die Beichte", [
        "Erzähl die witzigste Geschichte, die du mit einem der beiden erlebt hast.",
        "Was war dein erster Eindruck vom Brautpaar – ganz ehrlich?",
        "Verrat etwas über einen der beiden, das der andere noch nicht weiß. Jugendfrei!",
        "Was war der lustigste Moment, den du mit den beiden erlebt hast?",
        "Beichte: Was hast du heute schon vom Buffet stibitzt?",
      ]],
      ["Singen", "Sing was!", [
        "Sing „Happy Wedding“ zur Melodie von „Happy Birthday“.",
        "Sing den Refrain eines Liebeslieds. Der Text darf frei erfunden sein.",
        "Summ das Lied, das dich an die beiden erinnert. Sie sollen raten.",
        "Rap drei Zeilen über das Brautpaar.",
        "Sing ein Schlager-Ständchen – mit ganz viel Gefühl.",
      ]],
      JOKER,
    ],
  },
  geburtstag: {
    label: "Geburtstag", defaultNames: "das Geburtstagskind", title: (n) => `${n} hat Geburtstag`, hosts: "vom Geburtstagskind",
    cats: [
      ["Glückwunsch", "Glückwunsch mal anders", [
        "Gratulier im Stil eines Nachrichtensprechers.",
        "Wünsch drei Dinge fürs neue Lebensjahr: eins ernst, eins lustig, eins völlig absurd.",
        "Gratulier in einer anderen Sprache oder in deinem besten Dialekt.",
        "Gratulier so, wie es eine stolze Oma tun würde.",
        "Gratulier – aber jedes Wort muss mit dem gleichen Buchstaben anfangen.",
      ]],
      ["Story", "Die beste Story", [
        "Erzähl die lustigste Geschichte, die du mit {n} erlebt hast.",
        "Welchen Spruch von {n} wirst du nie vergessen?",
        "Erzähl, wie ihr euch kennengelernt habt – gern ein bisschen übertrieben.",
        "Was ist mal passiert, worüber ihr heute noch lacht?",
        "Was war der legendärste Fail von {n}?",
      ]],
      ["Ständchen", "Ständchen", [
        "Sing „Happy Birthday“ – aber als Oper.",
        "Sing „Happy Birthday“ in Zeitlupe.",
        "Sing „Happy Birthday“ und ersetz jedes Wort durch „Miau“.",
        "Sing ein Ständchen zusammen mit allen, die gerade neben dir stehen.",
        "Rap ein Geburtstagsständchen für {n}.",
      ]],
      ["Ehrlich", "Ganz ehrlich", [
        "Was schätzt du an {n} am meisten – und hast es noch nie gesagt?",
        "Beschreib {n} in genau drei Wörtern und erklär sie.",
        "Wenn {n} ein Tier wäre: welches – und warum?",
        "Was würdest du {n} vor zehn Jahren raten?",
        "Wofür bist du {n} dankbar?",
      ]],
      ["Wunsch", "Wunschzettel", [
        "Wenn du {n} alles schenken könntest: Was wäre es?",
        "Welches Abenteuer sollte {n} dieses Jahr unbedingt erleben?",
        "Gib ein Versprechen fürs neue Lebensjahr.",
        "Schlag etwas vor, das ihr unbedingt mal zusammen machen solltet.",
        "Was sollte sich {n} dieses Jahr endlich mal gönnen?",
      ]],
      JOKER,
    ],
  },
  firma: {
    label: "Firmenfeier", defaultNames: "Unsere Firmenfeier", title: (n) => n, hosts: "vom Team",
    cats: [
      ["Lob", "Lob ans Team", [
        "Lob eine Kollegin oder einen Kollegen, ohne den Namen zu nennen. Alle sollen raten.",
        "Wer hat dieses Jahr einen Orden verdient – und wofür?",
        "Bedank dich bei jemandem, dem du schon lange Danke sagen wolltest.",
        "Welcher Moment im Team hat dich dieses Jahr stolz gemacht?",
        "Gib dem Team eine Schulnote fürs Jahr und begründe sie.",
      ]],
      ["Zukunft", "Prognose", [
        "Was wird nächstes Jahr unser größter Erfolg?",
        "Welches Meeting sollte man nächstes Jahr ersatzlos streichen?",
        "Welche Schlagzeile liest man nächstes Jahr über uns?",
        "Wie sieht unser Büro in zehn Jahren aus?",
        "Was wird nächstes Jahr endlich repariert, eingeführt oder abgeschafft?",
      ]],
      ["Beichte", "Büro-Beichte", [
        "Was machst du in langweiligen Meetings wirklich?",
        "Was ist dein heimliches Ritual im Arbeitsalltag?",
        "Was war dein lustigster Fehler im Job?",
        "Wer klaut immer die Kugelschreiber? Nur Vermutungen, keine Namen!",
        "Welchen Satz hörst du bei der Arbeit jeden einzelnen Tag?",
      ]],
      ["Insider", "Insider", [
        "Welcher Spruch gehört ins Team-Lexikon?",
        "Erklär einen Büro-Insider so, dass Außenstehende nichts verstehen.",
        "Erfinde ein neues Firmenmotto fürs nächste Jahr.",
        "Spiel eine typische Szene aus dem Arbeitsalltag nach – ohne Namen.",
        "Welche Kaffeemaschinen-Geschichte muss unbedingt aufs Band?",
      ]],
      ["Highlight", "Highlight", [
        "Was war bisher das Highlight des Abends?",
        "Kommentier die Tanzfläche wie ein Fußballreporter.",
        "Wenn dieser Abend ein Film wäre: Wie hieße er?",
        "Was war dein schönster Arbeitstag in diesem Jahr?",
        "Was nimmst du von heute Abend mit – außer guter Laune?",
      ]],
      JOKER,
    ],
  },
  party: {
    label: "Party", defaultNames: "Unsere Party", title: (n) => n, hosts: "von den Gastgebern",
    cats: [
      ["Toast", "Trinkspruch", [
        "Bring einen Trinkspruch auf die Gastgeber aus.",
        "Erfinde einen Trinkspruch, der sich reimt.",
        "Trinkspruch in einem Satz – so feierlich wie möglich.",
        "Stoß mit deinem Nachbarn an und sagt zusammen einen Spruch auf.",
        "Trinkspruch im Stil eines Piraten. Arrr!",
      ]],
      ["Story", "Die beste Story", [
        "Erzähl die lustigste Geschichte mit den Gastgebern.",
        "Was ist heute Abend schon Lustiges passiert?",
        "Erzähl, woher du die Gastgeber kennst – mit maximaler Übertreibung.",
        "Welcher Moment heute wird morgen noch erzählt?",
        "Beichte: Was war dein lustigster Party-Moment überhaupt?",
      ]],
      ["Zukunft", "Prognose", [
        "Wie sieht diese Party in zehn Jahren aus?",
        "Wer tanzt heute als Letztes? Begründe!",
        "Was steht morgen früh als Erstes auf dem Frühstückstisch?",
        "Welcher Gast wird heute noch zur Legende?",
        "Sag voraus, welches Lied heute noch dreimal läuft.",
      ]],
      ["Singen", "Sing was!", [
        "Sing den Refrain deines Lieblings-Partysongs.",
        "Summ ein Lied – wer zuhört, soll raten.",
        "Sing ein Ständchen für die Gastgeber.",
        "Rap drei Zeilen über diesen Abend.",
        "Sing irgendwas – aber als Oper.",
      ]],
      ["Danke", "Danke!", [
        "Sag den Gastgebern, was diesen Abend besonders macht.",
        "Bedank dich für etwas, das sonst niemand bemerkt hat.",
        "Was wünschst du den Gastgebern fürs nächste Jahr?",
        "Lob das Essen wie ein Sternekoch.",
        "Was nimmst du von heute Abend mit?",
      ]],
      JOKER,
    ],
  },
};

export interface GameConfig {
  occasion: GameOccasion;
  names: string;
  customTasks: string[];
}

/** Titel über der Wählscheibe */
export function gameTitle(c: Pick<GameConfig, "occasion" | "names">): string {
  const o = GAME[c.occasion];
  return o.title(c.names.trim() || o.defaultNames);
}

/**
 * Kategorien fürs Spiel: Mit eigenen Aufgaben ersetzt „Spezial“ (Aufgaben der Gastgeber) den Joker,
 * die Wählscheibe hat immer sechs Felder.
 */
export function gameCategories(c: GameConfig): GameCategory[] {
  const o = GAME[c.occasion];
  const name = c.names.trim() || o.defaultNames;
  const fill = (cat: GameCategory): GameCategory => [cat[0], cat[1], cat[2].map((t) => t.replaceAll("{n}", name))];
  const cats = o.cats.map(fill);
  const custom = c.customTasks.map((t) => t.trim()).filter(Boolean);
  if (custom.length) cats[cats.length - 1] = ["Spezial", `Spezialaufgabe ${o.hosts}`, custom];
  return cats;
}

/** Anlass aus der Buchung ableiten (Kunde kann ihn im Portal ändern) */
export function occasionFromBooking(b: { occasion?: string | null; customer_type?: string | null; company?: string | null }): GameOccasion {
  const o = (b.occasion ?? "").toLowerCase();
  if (o.includes("hochzeit")) return "hochzeit";
  if (o.includes("geburtstag")) return "geburtstag";
  if (o.includes("firm") || o.includes("weihnacht") || o.includes("betrieb") || b.customer_type === "business" || b.company?.trim()) return "firma";
  return "party";
}

/** Namen-Vorschlag aus der Buchung */
export function namesFromBooking(b: { couple_names?: string | null; customer_name?: string | null; company?: string | null }, occasion: GameOccasion): string {
  if (occasion === "firma") return b.company?.trim() || "";
  if (occasion === "hochzeit") return b.couple_names?.trim() || "";
  if (occasion === "geburtstag") return (b.couple_names?.trim() || b.customer_name?.trim() || "").split(/\s+/)[0] ?? "";
  return "";
}

/** Eigene Aufgaben säubern (eine pro Zeile) */
export function cleanCustomTasks(input: unknown): string[] {
  const list = Array.isArray(input) ? input : String(input ?? "").split(/\r?\n/);
  return list
    .map((t) => String(t).replace(/\s+/g, " ").trim().slice(0, MAX_TASK_LENGTH))
    .filter(Boolean)
    .slice(0, MAX_CUSTOM_TASKS);
}
