// Foto-Missionen: kleine Aufgaben für die Gäste, je erfüllter Mission gibt es Punkte für die Bestenliste.
// Vorlagen je Anlass – der Kunde kann sie im Kundenbereich anpassen.

export interface Challenge {
  id: string;
  emoji: string;
  text: string;
  points: number;
}

export const CHALLENGE_POINTS = [10, 20, 30] as const;
export const MAX_CHALLENGES = 12;

const c = (id: string, emoji: string, text: string, points: number): Challenge => ({ id, emoji, text, points });

export const CHALLENGE_SETS: { id: string; label: string; emoji: string; items: Challenge[] }[] = [
  {
    id: "hochzeit",
    label: "Hochzeit",
    emoji: "💍",
    items: [
      c("h1", "💑", "Selfie mit dem Brautpaar", 30),
      c("h2", "🤝", "Foto mit jemandem, den du heute kennengelernt hast", 20),
      c("h3", "💃", "Dein bester Tanzmove", 20),
      c("h4", "👵", "Foto mit der ältesten Person im Raum", 20),
      c("h5", "🥂", "Anstoßen – mindestens 4 Gläser im Bild", 10),
      c("h6", "😂", "Die lustigste Grimasse des Abends", 10),
      c("h7", "💐", "Foto mit dem Brautstrauß", 30),
      c("h8", "👨‍👩‍👧‍👦", "Gruppenfoto mit 6 oder mehr Leuten", 30),
    ],
  },
  {
    id: "kinder",
    label: "Kindergeburtstag",
    emoji: "🎈",
    items: [
      c("k1", "🥳", "Foto mit dem Geburtstagskind", 30),
      c("k2", "🦖", "Brüll wie ein Dino!", 10),
      c("k3", "🦸", "Deine beste Superhelden-Pose", 20),
      c("k4", "💪", "Zeig deine Muskeln", 10),
      c("k5", "🤪", "Die lustigste Grimasse", 10),
      c("k6", "👨‍👩‍👧", "Foto mit Mama, Papa, Oma oder Opa", 20),
      c("k7", "🧍", "Mach dich ganz groß – oder ganz klein", 20),
      c("k8", "👫", "Gruppenfoto mit allen Kindern", 30),
    ],
  },
  {
    id: "babyparty",
    label: "Babyparty",
    emoji: "🍼",
    items: [
      c("b1", "🤰", "Selfie mit den werdenden Eltern", 30),
      c("b2", "💗", "Gruppenfoto Team Rosa", 20),
      c("b3", "💙", "Gruppenfoto Team Blau", 20),
      c("b4", "👶", "Deine beste Baby-Grimasse", 10),
      c("b5", "🫶", "Zeigt gemeinsam ein Herz mit den Händen", 10),
      c("b6", "🧸", "Foto mit einem Kuscheltier", 10),
      c("b7", "🔮", "Zeig mit einer Pose, was du tippst", 20),
      c("b8", "👨‍👩‍👧", "Gruppenfoto mit 6 oder mehr Leuten", 30),
    ],
  },
  {
    id: "geburtstag",
    label: "Geburtstag",
    emoji: "🎂",
    items: [
      c("g1", "🥳", "Selfie mit dem Geburtstagskind", 30),
      c("g2", "🎁", "Foto mit deinem Geschenk", 10),
      c("g3", "🕺", "Zeig deinen besten Tanzmove", 20),
      c("g4", "😜", "Die verrückteste Grimasse", 10),
      c("g5", "📸", "Stellt ein altes Kinderfoto nach", 30),
      c("g6", "🤝", "Foto mit jemandem, den du heute kennengelernt hast", 20),
      c("g7", "👯", "Gruppenfoto mit 5 oder mehr Leuten", 20),
      c("g8", "🍰", "Foto mit Kuchen oder Torte", 10),
    ],
  },
  {
    id: "firma",
    label: "Firmenfeier",
    emoji: "🏢",
    items: [
      c("f1", "🤝", "Foto mit jemandem aus einer anderen Abteilung", 20),
      c("f2", "👔", "Selfie mit der Chefin oder dem Chef", 30),
      c("f3", "🏆", "Euer Team in Siegerpose", 20),
      c("f4", "🆕", "Foto mit der neuesten Kollegin oder dem neuesten Kollegen", 20),
      c("f5", "🥂", "Anstoßen auf ein gutes Jahr", 10),
      c("f6", "😎", "Der coolste Look des Abends", 10),
      c("f7", "🎤", "Foto mit der Band oder dem DJ", 20),
      c("f8", "👥", "Gruppenfoto mit 8 oder mehr Leuten", 30),
    ],
  },
  {
    id: "party",
    label: "Party",
    emoji: "🎉",
    items: [
      c("p1", "🎉", "Selfie mit dem Gastgeber", 30),
      c("p2", "💃", "Dein bester Tanzmove", 20),
      c("p3", "🤝", "Foto mit jemandem, den du heute kennengelernt hast", 20),
      c("p4", "😂", "Die lustigste Grimasse", 10),
      c("p5", "🥂", "Anstoßen – mindestens 4 Gläser im Bild", 10),
      c("p6", "🕶️", "Partner-Look: zwei Leute, gleiche Pose", 20),
      c("p7", "👯", "Gruppenfoto mit 6 oder mehr Leuten", 30),
      c("p8", "🌟", "Euer bestes Albumcover", 20),
    ],
  },
];

/** Missionen aus der Datenbank (jsonb) prüfen und bereinigen. */
export function parseChallenges(raw: unknown): Challenge[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: Challenge[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const id = String((x as Challenge).id ?? "").replace(/[^a-z0-9-]/gi, "").slice(0, 20);
    const text = String((x as Challenge).text ?? "").trim().slice(0, 80);
    const emoji = String((x as Challenge).emoji ?? "🎯").trim().slice(0, 8) || "🎯";
    const p = Number((x as Challenge).points);
    if (!id || !text || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, text, emoji, points: CHALLENGE_POINTS.includes(p as 10) ? p : 10 });
    if (out.length >= MAX_CHALLENGES) break;
  }
  return out;
}
