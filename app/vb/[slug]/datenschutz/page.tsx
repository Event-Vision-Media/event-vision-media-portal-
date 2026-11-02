import type { Metadata } from "next";
import { LANDLORD } from "@/lib/contract";
import { loadVbEvent, toGuestEvent, vbDeleteAfter } from "@/lib/visionbooth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Datenschutz – VisionBooth",
  robots: { index: false, follow: false },
};

// Kurze, verständliche Datenschutz-Hinweise für Gäste einer VisionBooth.
// ENTWURF (11/2026) – vor dem ersten echten Einsatz anwaltlich prüfen lassen
// (insb. KI-Verarbeitung durch fal.ai in den USA / Drittlandübermittlung).
export default async function VisionBoothPrivacyPage({ params }: { params: { slug: string } }) {
  const event = await loadVbEvent(params.slug.toLowerCase());
  const g = event ? await toGuestEvent(event) : null;
  const until = event ? vbDeleteAfter(event).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" }) : null;
  const days = event?.retention_days ?? 90;

  return (
    <main className="vb min-h-[100dvh]" style={{ ["--a" as string]: g?.accent ?? "#c4933f" }}>
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
            KI-Modell von Google einsetzt. Dabei werden Daten in die USA übermittelt, wo ein geringeres Datenschutzniveau als in der EU bestehen kann. Rechtsgrundlage ist
            deine Einwilligung durch das Antippen des Stils (Art. 6 Abs. 1 lit. a, Art. 49 Abs. 1 lit. a DSGVO).
          </p>
          <p className="mt-2">Das fertige KI-Bild speichern wir nur, wenn der Galerie-Schalter an ist – sonst bekommst nur du es auf dein Handy.</p>
        </Section>

        <Section title="Technik">
          <p>
            Die Seite läuft bei unserem Hosting-Dienstleister Vercel, gespeicherte Fotos liegen bei unserem Datenbank-Dienstleister Supabase. Mit beiden bestehen
            Verträge zur Auftragsverarbeitung. Es gibt keine Cookies, kein Tracking und keine Werbung.
          </p>
          <p className="mt-2">
            Damit das Limit für KI-Verwandlungen pro Gast funktioniert, legen wir im Speicher deines Browsers eine zufällige Kennung ab. Sie verrät nichts über dich und
            wird nur für diese Fotobox genutzt.
          </p>
        </Section>

        <Section title="Deine Rechte">
          <p>
            Du hast das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung, auf Widerruf deiner Einwilligung sowie auf Beschwerde bei einer
            Datenschutz-Aufsichtsbehörde, z. B. der Landesbeauftragten für Datenschutz und Informationsfreiheit NRW.
          </p>
          <p className="mt-2">
            Ausführlich: <a className="underline" href="https://fotobox-essen.com/datenschutz">Datenschutzerklärung von Event Vision Media</a>
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
