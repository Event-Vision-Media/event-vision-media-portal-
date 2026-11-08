/**
 * Vorlagen für persönliche Nachrichten aus dem Admin (Buchungsseite → „Persönliche Nachricht“).
 * Reine Textbausteine ohne Server-Code – laufen im Browser, damit du beim Wechseln der
 * Vorlage sofort den fertigen Text siehst und frei ändern kannst.
 */

export interface PersonalMailFacts {
  /** Businesskunden werden gesiezt. */
  sie: boolean;
  /** Vorname bzw. Name für die Anrede. */
  name: string;
  bookingCode: string;
  /** z. B. „Sonntag, 15.11.“ */
  eventDateLabel: string;
  occasion: string | null;
  /** Was noch fehlt – als kurze Aufforderung formuliert. */
  openItems: string[];
  /** Vorgeschlagene Frist für eine Rückmeldung, z. B. „Mittwoch, 11.11.“ */
  deadlineLabel: string;
  /** Unterschrift (Name). */
  signer: string;
}

export type PersonalTemplateId = "rueckmeldung" | "vertrag" | "uebergabe" | "freigeben" | "frei";

export const PERSONAL_TEMPLATES: { id: PersonalTemplateId; label: string; hint: string }[] = [
  { id: "rueckmeldung", label: "Keine Rückmeldung", hint: "Freundlich nachhaken – mit allem, was fehlt, und einer Frist" },
  { id: "vertrag", label: "Vertrag fehlt", hint: "Kurze Bitte, den Mietvertrag im Portal zu unterschreiben" },
  { id: "uebergabe", label: "Übergabe klären", hint: "Lieferzeit bzw. Abholung und Handynummer erfragen" },
  { id: "freigeben", label: "Termin freigeben", hint: "Wenn bis zur Frist nichts kam – freundlich und ohne Vorwurf" },
  { id: "frei", label: "Freie Nachricht", hint: "Nur Anrede und Gruß – den Rest schreibst du" },
];

/** Vorlagen, die den Knopf „Zum Kundenportal“ sinnvoll machen. */
export function templateWantsPortal(id: PersonalTemplateId): boolean {
  return id !== "freigeben";
}

export function buildPersonalMail(id: PersonalTemplateId, f: PersonalMailFacts): { subject: string; body: string } {
  const du = !f.sie;
  const hello = du ? `Hallo ${f.name},` : `Guten Tag ${f.name},`;
  const bye = `${du ? "Liebe Grüße" : "Viele Grüße"}\n${f.signer}`;
  const list = (items: string[]) => items.map((i) => `– ${i}`).join("\n");

  switch (id) {
    case "rueckmeldung": {
      const items = [du ? "Kurz bestätigen, dass es beim Termin bleibt" : "Kurz bestätigen, dass es beim Termin bleibt", ...f.openItems];
      return {
        subject: `${du ? "Deine" : "Ihre"} Buchung für ${f.eventDateLabel} – kurze Rückmeldung?`,
        body: [
          hello,
          `ich wollte mich kurz persönlich melden: Am ${f.eventDateLabel}, ist es so weit${f.occasion ? ` – ${du ? "eure" : "Ihre"} Feier (${f.occasion})` : ""}! Wir haben alles für ${du ? "euch" : "Sie"} reserviert und freuen uns schon.`,
          `Damit alles reibungslos klappt, fehlt mir noch:\n${list(items)}`,
          du
            ? `Gib mir bitte bis ${f.deadlineLabel}, kurz Bescheid. Falls sich bei euch etwas geändert hat, ist das völlig in Ordnung – sag mir dann einfach kurz Bescheid, damit ich den Termin wieder freigeben kann.`
            : `Bitte geben Sie mir bis ${f.deadlineLabel}, kurz Bescheid. Falls sich etwas geändert hat, ist das völlig in Ordnung – dann geben Sie mir einfach kurz Bescheid, damit ich den Termin wieder freigeben kann.`,
          bye,
        ].join("\n\n"),
      };
    }
    case "vertrag":
      return {
        subject: `Nur noch ein Klick: ${du ? "dein" : "Ihr"} Mietvertrag – ${f.bookingCode}`,
        body: [
          hello,
          `für ${f.eventDateLabel}, ist alles für ${du ? "euch" : "Sie"} reserviert. Damit die Buchung komplett ist, fehlt nur noch ${du ? "deine" : "Ihre"} Unterschrift unter dem Mietvertrag.`,
          du
            ? "Das geht ganz bequem im Kundenportal – einfach unten auf den Knopf tippen, mit deinem Zugangscode anmelden und unterschreiben. Dauert keine Minute."
            : "Das geht bequem im Kundenportal – unten auf den Knopf klicken, mit dem Zugangscode anmelden und unterschreiben. Dauert keine Minute.",
          du ? "Wenn etwas unklar ist, ruf gern an oder schreib mir per WhatsApp." : "Bei Fragen erreichen Sie mich gern telefonisch oder per WhatsApp.",
          bye,
        ].join("\n\n"),
      };
    case "uebergabe": {
      const items = f.openItems.length ? f.openItems : [du ? "Wann dürfen wir liefern – oder holst du selbst ab?" : "Wann dürfen wir liefern – oder holen Sie selbst ab?"];
      return {
        subject: `Übergabe am ${f.eventDateLabel} – kurze Abstimmung`,
        body: [
          hello,
          `damit am ${f.eventDateLabel}, alles entspannt läuft, würde ich gern noch die Übergabe mit ${du ? "dir" : "Ihnen"} abstimmen:\n${list(items)}`,
          du ? "Antworte einfach auf diese Mail oder schreib mir kurz per WhatsApp." : "Antworten Sie einfach auf diese Mail oder schreiben Sie mir kurz per WhatsApp.",
          bye,
        ].join("\n\n"),
      };
    }
    case "freigeben":
      return {
        subject: `${du ? "Deine" : "Ihre"} Reservierung für ${f.eventDateLabel}`,
        body: [
          hello,
          `da ich leider nichts mehr von ${du ? "dir" : "Ihnen"} gehört habe, gehe ich davon aus, dass sich ${du ? "eure" : "Ihre"} Pläne geändert haben, und gebe den Termin am ${f.eventDateLabel}, wieder frei. Es entstehen ${du ? "dir" : "Ihnen"} dadurch natürlich keine Kosten.`,
          du
            ? "Falls ich mich irre und ihr doch noch Interesse habt, melde dich einfach – wenn der Termin dann noch frei ist, reserviere ich ihn sehr gern wieder für euch."
            : "Falls ich mich irre und doch noch Interesse besteht, melden Sie sich einfach – wenn der Termin dann noch frei ist, reserviere ich ihn sehr gern wieder.",
          du ? "Ich wünsche euch trotzdem eine wunderschöne Feier!" : "Ich wünsche Ihnen trotzdem eine gelungene Veranstaltung!",
          bye,
        ].join("\n\n"),
      };
    case "frei":
    default:
      return { subject: `${du ? "Deine" : "Ihre"} Buchung ${f.bookingCode}`, body: [hello, "", bye].join("\n\n") };
  }
}
