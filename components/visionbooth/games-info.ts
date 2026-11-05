// Kurze Erklärungen zu Spielen und Foto-Wand – gleiche Texte in Buchung und Kundenbereich,
// damit niemand rätseln muss, was „Mission“ oder „Foto-Wand“ bedeutet.

export type GameKey = "missions" | "reveal" | "leads";

export const GAME_HOW: Record<GameKey, { title: string; steps: string[] }> = {
  missions: {
    title: "So funktionieren die Foto-Missionen",
    steps: [
      "Nach dem Scannen des QR-Codes sehen eure Gäste kleine Foto-Aufgaben – z. B. „Selfie mit dem Brautpaar“ oder „Gruppenfoto mit 5 Leuten“.",
      "Für jedes passende Foto gibt es Punkte. Welche Aufgaben es gibt, könnt ihr nach der Buchung selbst anpassen.",
      "Die Bestenliste sehen alle in der App – und, wenn ihr möchtet, groß auf der Foto-Wand.",
    ],
  },
  reveal: {
    title: "So funktioniert das Tippspiel",
    steps: [
      "Vor dem Foto tippen eure Gäste: Junge oder Mädchen? Ihr Foto bekommt die Farbe ihres Tipps (rosa oder blau).",
      "Den aktuellen Stand seht ihr im Kundenbereich und auf der Foto-Wand.",
      "Zum großen Moment drückt ihr im Kundenbereich auf „Auflösen“ – das Ergebnis erscheint sofort auf allen Handys und der Foto-Wand.",
    ],
  },
  leads: {
    title: "So funktioniert das Gewinnspiel",
    steps: [
      "Nach dem Foto können Gäste freiwillig Name und E-Mail eintragen – z. B. für ein Gewinnspiel oder für weitere Infos.",
      "Die Einwilligung fragen wir rechtssicher ab; Werbung nur mit eigenem Häkchen.",
      "Nach dem Event ladet ihr die Kontakte als CSV-Datei herunter. Die Teilnahmebedingungen stellt ihr als Veranstalter bereit.",
    ],
  },
};

export const WALL_INFO = {
  title: "Was ist die Foto-Wand?",
  intro:
    "Eine Webseite, die alle neuen Fotos eurer Gäste live als Diashow zeigt – mit Bestenliste und QR-Code zum Mitmachen. Ihr zeigt sie einfach auf einem Fernseher, Beamer oder Laptop. Ganz optional: ohne Foto-Wand funktioniert alles genauso.",
  ways: [
    { title: "Smart-TV", text: "Den Internet-Browser des Fernsehers öffnen und den Foto-Wand-Link eintippen." },
    { title: "Laptop + HDMI-Kabel", text: "Link am Laptop öffnen, per HDMI mit Fernseher oder Beamer verbinden und auf Vollbild schalten (F11 bzw. ⌃⌘F am Mac)." },
    { title: "Vom Handy oder Tablet", text: "Link öffnen und per AirPlay (Apple TV) oder Chromecast auf den Fernseher spiegeln." },
  ],
  note: "Den Link zur Foto-Wand findet ihr nach der Buchung im Kundenbereich. Neue Fotos erscheinen automatisch – niemand muss etwas bedienen.",
};
