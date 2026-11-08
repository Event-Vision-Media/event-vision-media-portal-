import type { Metadata } from "next";
import { LANDLORD } from "@/lib/contract";
import { loadVbEvent, toGuestEvent, vbDeleteAfter } from "@/lib/visionbooth";
import { uiAccent } from "@/components/visionbooth/frame";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Datenschutz – VisionBooth",
  robots: { index: false, follow: false },
};

// Kurze, verständliche Datenschutz-Hinweise für Gäste einer VisionBooth.
// ENTWURF (11/2026) – vor dem ersten echten Einsatz anwaltlich prüfen lassen
// (insb. KI-Verarbeitung durch fal.ai in den USA / Drittlandübermittlung).
export default async function VisionBoothPrivacyPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const event = await loadVbEvent(params.slug.toLowerCase());
  const g = event ? await toGuestEvent(event) : null;
  const until = event ? vbDeleteAfter(event).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" }) : null;
  const days = event?.retention_days ?? 90;

  return (
    <main className="vb min-h-[100dvh]" style={{ ["--a" as string]: uiAccent(g?.accent ?? "#c4933f") }}>
      <div className="vb-aurora" aria-hidden />
      <article className="relative mx-auto max-w-xl px-5 pb-16 pt-10 text-[15px] leading-relaxed text-white/80">
        <a href={g ? `/vb/${g.slug}` : "#"} className="text-sm text-white/60 underline underline-offset-2">
          ← Zurück zur Fotobox
        </a>
        <h1 className="vb-display mt-5 text-3xl font-semibold text-white">Datenschutz bei VisionBooth</h1>
        {g && <p className="mt-1 text-sm text-white/55">für „{g.frameText}“</p>}

        <Section title="Kurz gesagt">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Dein Foto entsteht direkt in deinem Browser – ohne App, ohne Anmeldung, ohne Cookies.</li>
            <li>
              <strong className="text-white">Galerie-Schalter aus:</strong> Dein Foto bleibt nur auf deinem Handy. Wir speichern es nicht.
            </li>
            <li>
              <strong className="text-white">Galerie-Schalter an:</strong> Dein Foto wird gespeichert und erscheint in der Event-Galerie und auf der Foto-Wand.
            </li>
            {until && (
              <li>
                Gespeicherte Fotos werden <strong className="text-white">automatisch am {until} gelöscht</strong> ({days} Tage nach Ende des Events).
              </li>
            )}
          </ul>
        </Section>

        <Section title="Wer ist verantwortlich?">
          <p>
            {LANDLORD.name}
            <br />
            {LANDLORD.street}, {LANDLORD.zipCity}
            <br />
            E-Mail: <a className="underline" href={`mailto:${LANDLORD.email}`}>{LANDLORD.email}</a> · Telefon: {LANDLORD.phone}
          </p>
          <p className="mt-2">Die Foto-Aktion wurde vom Veranstalter des Events bei uns gebucht.</p>
        </Section>

        <Section title="Galerie und Foto-Wand">
          <p>
            Wenn du den Schalter „In Galerie &amp; auf der Foto-Wand zeigen“ einschaltest, willigst du ein, dass wir dein Foto speichern und es den Gästen und dem
            Veranstalter dieses Events zeigen (Art. 6 Abs. 1 lit. a DSGVO). Die Galerie ist nur über den Event-Link erreichbar und nicht in Suchmaschinen zu finden.
          </p>
          <p className="mt-2">
            Du kannst deine Einwilligung jederzeit widerrufen: Eigene Fotos löschst du selbst in der Galerie unter „Meine“ (mit dem Handy, mit dem du sie geteilt hast). Ansonsten schreib uns kurz an {LANDLORD.email} (am besten mit Uhrzeit des Fotos) oder wende dich an den Gastgeber – wir löschen dein Foto dann umgehend.
          </p>
        </Section>

        <Section title="KI-Verwandlung">
          <p>
            Nur wenn du einen KI-Stil antippst, übertragen wir dein Foto zur Bearbeitung an unseren Dienstleister fal.ai (Features &amp; Labels, Inc., USA), der dafür ein
            KI-Modell von Google einsetzt. Dabei werden Daten in die USA übermittelt, wo ein geringeres Datenschutzniveau als in der EU bestehen kann; abgesichert ist die
            Übermittlung durch EU-Standardvertragsklauseln (Art. 46 DSGVO). Rechtsgrundlage ist deine Einwilligung durch das Antippen des Stils (Art. 6 Abs. 1 lit. a DSGVO).
            KI-Bilder sind mit „KI-Bild“ gekennzeichnet.
          </p>
          <p className="mt-2">
            Wir haben fal.ai angewiesen, dein Foto und das Ergebnis nicht im Verlauf zu speichern und die Bilddateien nach spätestens einer Stunde zu löschen.
            Das fertige KI-Bild speichern wir nur, wenn der Galerie-Schalter an ist – sonst bekommst nur du es auf dein Handy.
          </p>
        </Section>

        <Section title="Missionen, Bestenliste und Spiele">
          <p>
            Machst du bei Foto-Missionen mit, speichern wir den Spitznamen, den du dafür eingibst, deine erledigten Missionen und Punkte. Spitzname und Punkte erscheinen
            auf der Bestenliste in der App und auf der Foto-Wand. Auch Herzen für Fotos und Tipps beim Tippspiel werden gespeichert. Ein Vorname oder Spitzname reicht – du
            musst keinen echten Namen angeben. Rechtsgrundlage ist deine Einwilligung durch die Teilnahme (Art. 6 Abs. 1 lit. a DSGVO). Gelöscht wird alles zusammen mit
            den Fotos.
          </p>
        </Section>

        <Section title="Eigene Fotos hochladen">
          <p>
            Lädst du Fotos aus deiner Handy-Galerie hoch, gilt dasselbe wie beim Galerie-Schalter: Sie werden gespeichert, in der Event-Galerie gezeigt und automatisch
            gelöscht. Bitte lade nur Fotos hoch, auf denen die abgebildeten Personen einverstanden sind.
          </p>
        </Section>

        <Section title="Gästebuch-Grüße">
          <p>
            Schreibst du zu deinem Foto einen Gruß, speichern wir den Text und – falls angegeben – deinen Namen zusammen mit dem Foto. Der Gruß ist freiwillig, erscheint im
            Gästebuch der Gastgeber und wird zusammen mit dem Foto automatisch gelöscht. Rechtsgrundlage ist deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO).
          </p>
        </Section>

        {g?.leads && (
          <Section title="Gewinnspiel / Kontaktformular">
            <p>
              Trägst du dich freiwillig ein, erhält {g.leads.sponsor} deine Angaben für den genannten Zweck – {g.leads.sponsor} ist dafür verantwortlich, wir speichern
              die Daten nur in dessen Auftrag (Art. 28 DSGVO). Rechtsgrundlage ist deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO), die du jederzeit widerrufen kannst.
              E-Mail-Werbung bekommst du nur, wenn du das gesonderte Häkchen dafür gesetzt hast. Dein Foto bekommst du auch ohne Teilnahme.
            </p>
          </Section>
        )}

        <Section title="Technik">
          <p>
            Die Seite läuft bei unserem Hosting-Dienstleister Vercel, gespeicherte Fotos liegen bei unserem Datenbank-Dienstleister Supabase. Mit beiden bestehen
            Verträge zur Auftragsverarbeitung. Es gibt keine Cookies, kein Tracking und keine Werbung.
          </p>
          <p className="mt-2">
            Damit Limits, Missionen und „Meine Fotos“ funktionieren, legen wir im Speicher deines Browsers eine zufällige Kennung ab. Sie verrät nichts über dich,
            wird nur für diese Fotobox genutzt und ist für diese von dir gewünschten Funktionen technisch nötig (§ 25 Abs. 2 TDDDG).
          </p>
        </Section>

        <Section title="Deine Rechte">
          <p>
            Du hast das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung, auf Widerruf deiner Einwilligung sowie auf Beschwerde bei einer
            Datenschutz-Aufsichtsbehörde, z. B. der Landesbeauftragten für Datenschutz und Informationsfreiheit NRW.
          </p>
          <p className="mt-2">
            Ausführlich: <a className="underline" href="/vb/datenschutz">Datenschutzerklärung von VisionBooth</a>
          </p>
        </Section>

        <p className="mt-10 text-xs text-white/40">Stand: November 2026</p>
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="vb-display mb-2 text-xl font-semibold text-white">{title}</h2>
      {children}
    </section>
  );
}
