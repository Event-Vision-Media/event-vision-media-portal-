import type { Metadata, Viewport } from "next";
import { IconTile } from "@/components/visionbooth/site/OccasionIcon";
import { VbLogo } from "@/components/visionbooth/VbLogo";
import Link from "next/link";
import QRCode from "qrcode";
import { PhoneDemo } from "@/components/visionbooth/site/PhoneDemo";
import { StoryScenes } from "@/components/visionbooth/site/StoryScenes";
import { Reveal } from "@/components/visionbooth/site/Reveal";
import { vbBaseUrl } from "@/lib/visionbooth";
import { getPlan } from "@/components/visionbooth/packages";
import { PlanTabs } from "@/components/visionbooth/site/PlanTabs";
import { LANDLORD } from "@/lib/contract";

export const metadata: Metadata = {
  title: "VisionBooth – die digitale Fotobox mit KI für dein Event",
  description:
    "QR-Code scannen, Foto machen, mit KI verwandeln – ganz ohne App. Digitale Fotobox mit Foto-Missionen, Live-Foto-Wand und Galerie für Hochzeit, Geburtstag und Firmenevents. Ab 79 €.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0a0a0c" };

const STEPS = [
  { n: "1", title: "Buchen & gestalten", text: "Paket wählen, bezahlen – dein Link kommt sofort. Design, Texte und Logo stellst du selbst ein." },
  { n: "2", title: "QR-Code aufstellen", text: "Tischaufsteller drucken oder Link teilen. Gäste scannen mit der Handy-Kamera – keine App nötig." },
  { n: "3", title: "Feiern & teilen", text: "Fotos mit eurem Rahmen, KI-Verwandlungen, Missionen und Live-Foto-Wand. Danach alles als ZIP." },
];

const FEATURES = [
  { icon: "sonstiges" as const, title: "KI-Verwandlung", text: "Superheld, Hollywood, Comic, 3D-Animation & mehr – in Sekunden aus dem eigenen Selfie." },
  { icon: "target" as const, title: "Foto-Missionen", text: "Kleine Foto-Aufgaben mit Punkten und Bestenliste – so machen auch die Fotofaulen mit, und ihr habt am Ende viel mehr Erinnerungen." },
  { icon: "tv" as const, title: "Live-Foto-Wand", text: "Neue Fotos erscheinen sofort auf Beamer oder TV – mit Bestenliste und QR-Code zum Mitmachen." },
  { icon: "babyparty" as const, title: "Gender-Reveal-Tippspiel", text: "Junge oder Mädchen? Gäste tippen, ihr Foto wird rosa oder blau – und ihr löst live auf der Foto-Wand auf." },
  { icon: "image" as const, title: "17 Designs & Fotostreifen", text: "Von Elegant Gold bis Neon Night – dazu Kinder-Mottos wie Dino, Prinzessin oder Feuerwehr. Plus 3er-Fotostreifen und Story-Format." },
  { icon: "heart" as const, title: "Galerie mit Herzen", text: "Alle Fotos an einem Ort, „Foto des Abends“ per Herz – und am Ende alles als ZIP." },
];

const FAQ = [
  { q: "Brauchen die Gäste eine App?", a: "Nein. Gäste scannen den QR-Code mit der normalen Handy-Kamera – die VisionBooth öffnet sich direkt im Browser, auf iPhone und Android." },
  { q: "Wann bekomme ich meinen Link?", a: "Sofort nach der Bezahlung – per E-Mail und direkt auf der Bestätigungsseite. Dort gestaltest du alles selbst und druckst den QR-Aufsteller." },
  { q: "Wie viele Gäste können mitmachen?", a: "So viele, wie ihr seid. Jeder Gast nutzt sein eigenes Handy. Die KI-Verwandlungen sind je Paket begrenzt (z. B. 150 bei der Hochzeit)." },
  { q: "Warum nicht einfach eine WhatsApp-Gruppe?", a: "Weil dort nie alle Fotos ankommen, sie sich auf viele Chats verteilen und man erst alle Nummern einsammeln muss. Bei der VisionBooth landen die Fotos aller Gäste automatisch in einer Galerie – im Look eures Events, am Ende als ZIP." },
  { q: "Was passiert mit den Fotos?", a: "Fotos erscheinen nur in Galerie und Foto-Wand, wenn der Gast das erlaubt. Nach Ablauf der Speicherzeit werden sie automatisch gelöscht – vorher könnt ihr alles als ZIP herunterladen." },
  { q: "Kann ich Design und Texte später ändern?", a: "Ja, jederzeit in deinem persönlichen Bereich – Änderungen sind sofort für alle Gäste sichtbar." },
  { q: "Gibt es etwas für Kindergeburtstage?", a: "Ja! Mit Motto-Rahmen wie Prinzessin, Dino, Feuerwehr, Piraten, Einhorn, Weltraum oder Fußball und lustigen Kinder-Missionen. Die KI-Verwandlung ist dabei bewusst aus – Kinderfotos geben wir nicht an KI-Dienste weiter." },
  { q: "Gibt es das auch zusätzlich zu einer Fotobox?", a: "Ja! Wenn du bei uns eine Fotobox oder einen Fotospiegel mietest, gibt es die VisionBooth als günstiges Add-on dazu." },
];

const euro = (n: number) => `${n.toLocaleString("de-DE")} €`;

/** Website visionbooth.de (läuft im Portal unter /vb, später eigene Domain). */
export default async function VisionBoothHome() {
  const demoUrl = `${vbBaseUrl()}/vb/demo`;
  const demoQr = await QRCode.toString(demoUrl, { type: "svg", margin: 1, color: { dark: "#0d0d0f", light: "#ffffff" } });
  return (
    <main className="vb" style={{ ["--a" as string]: "#c4933f" }}>
      <div className="vb-aurora" aria-hidden />

      <nav className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <VbLogo height={40} />
        <div className="flex items-center gap-2">
          <a href="/vb/demo" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-white/80 hover:text-white sm:inline-block">
            Live-Demo
          </a>
          <Link href="/vb/buchen" className="vb-btn rounded-full px-5 py-2.5 text-sm font-bold">
            Jetzt buchen
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-6 md:grid-cols-[1.1fr_1fr] md:pt-12">
        <div className="text-center md:text-left">
          <span className="vb-in vb-glass inline-block rounded-full px-4 py-1.5 text-xs font-semibold text-white/80">Die Fotobox im Handy deiner Gäste</span>
          <h1 className="vb-in vb-display mt-5 text-[2.6rem] font-semibold leading-[1.05] sm:text-6xl" style={{ animationDelay: "80ms" }}>
            Jedes Handy wird zur <span className="vb-gold-text">Fotobox</span> – mit KI-Magie.
          </h1>
          <p className="vb-in mx-auto mt-5 max-w-lg text-[17px] leading-relaxed text-white/70 md:mx-0" style={{ animationDelay: "160ms" }}>
            QR-Code scannen, Foto mit eurem Rahmen machen, mit KI verwandeln und sofort teilen. Ganz ohne App, ohne Aufbau – für Hochzeit, Geburtstag, Kindergeburtstag, Babyparty und Firmenevent.
          </p>
          <div className="vb-in mt-8 flex flex-col items-center gap-3 sm:flex-row md:justify-start" style={{ animationDelay: "240ms" }}>
            <Link href="/vb/buchen" className="vb-btn w-full rounded-full px-8 py-4 text-center text-[17px] font-bold sm:w-auto">
              Jetzt buchen – ab {euro(getPlan("party").price)}
            </Link>
            <a href="/vb/demo" className="vb-glass w-full rounded-full px-8 py-4 text-center text-[16px] font-semibold sm:w-auto">
              Live-Demo am Handy testen
            </a>
          </div>
          <p className="vb-in mt-5 text-[13px] text-white/50" style={{ animationDelay: "320ms" }}>
            ✓ Link sofort nach Buchung &nbsp; ✓ Keine App &nbsp; ✓ Fotos werden automatisch gelöscht
          </p>
        </div>
        <div className="vb-in" style={{ animationDelay: "200ms" }}>
          <PhoneDemo />
        </div>
      </section>

      {/* So funktioniert's */}
      <section className="relative mx-auto max-w-6xl px-5 py-16">
        <h2 className="vb-display text-center text-3xl font-semibold sm:text-4xl">So einfach geht&apos;s</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 120} className="vb-glass rounded-3xl p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold" style={{ background: "var(--a)", color: "#0d0d0f" }}>
                {s.n}
              </span>
              <p className="vb-display mt-4 text-xl font-semibold">{s.title}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-white/65">{s.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <StoryScenes />

      {/* Gemeinsame Galerie statt WhatsApp-Chaos */}
      <section className="relative mx-auto max-w-5xl px-5 py-16">
        <h2 className="vb-display text-center text-3xl font-semibold sm:text-4xl">
          Alle Fotos. <span className="vb-gold-text">Eine Galerie.</span>
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-white/65">Schluss mit „Schickt mal eure Fotos in die Gruppe!“ – die Bilder aller Gäste landen automatisch an einem Ort.</p>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <Reveal className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/45">Ohne VisionBooth</p>
            <ul className="mt-4 space-y-3 text-[15px] text-white/60">
              {[
                "Fotos verteilt auf zig Handys, Gruppen und Chats",
                "Ständig nachfragen – die Hälfte kommt nie an",
                "Jedes Foto sieht anders aus – kein gemeinsamer Look",
                "Erst eine Gruppe mit allen Gästen anlegen und Nummern teilen",
              ].map((x) => (
                <li key={x} className="flex gap-3">
                  <span className="text-red-400/80">✕</span>
                  {x}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={150}>
          <div className="h-full rounded-3xl p-6 ring-2" style={{ background: "linear-gradient(160deg, color-mix(in srgb, var(--a) 18%, #141417), #141417 65%)", ["--tw-ring-color" as string]: "var(--a)" }}>
            <p className="text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--a)" }}>Mit VisionBooth</p>
            <ul className="mt-4 space-y-3 text-[15px] text-white/85">
              {[
                "Jedes Foto landet automatisch in eurer gemeinsamen Galerie",
                "Alle Fotos im gleichen Look – mit eurem Rahmen und Namen",
                "Gäste legen auch ihre eigenen Handy-Fotos dazu – in hoher Auflösung",
                "Am Ende alle Fotos mit einem Klick als ZIP",
                "Keine Gruppe, keine Telefonnummern – nur ein QR-Code",
              ].map((x) => (
                <li key={x} className="flex gap-3">
                  <span style={{ color: "var(--a)" }}>✓</span>
                  {x}
                </li>
              ))}
            </ul>
          </div>
          </Reveal>
        </div>
      </section>

      {/* KI-Stile */}
      <section className="relative py-16">
        <div className="mx-auto max-w-6xl px-5 text-center">
          <h2 className="vb-display text-3xl font-semibold sm:text-4xl">
            Ein Selfie. <span className="vb-gold-text">Acht Welten.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-white/65">Gäste tippen einen Stil an – Sekunden später sind sie Superheld, Filmstar oder Comicfigur. Und bleiben dabei erkennbar.</p>
        </div>
        <div className="vb-scroll mt-10 flex gap-3 overflow-x-auto px-5 pb-2 md:mx-auto md:grid md:max-w-6xl md:grid-cols-4 md:overflow-visible">
          {[
            ["original", "Original"],
            ["glamour", "Hollywood"],
            ["superheld", "Superheld"],
            ["animation", "3D-Animation"],
            ["comic", "Comic"],
            ["vintage", "Vintage"],
            ["neon", "Neon"],
            ["weihnachten", "Weihnachten"],
          ].map(([k, l]) => (
            <figure key={k} className="relative w-[46vw] max-w-[220px] flex-none overflow-hidden rounded-3xl ring-1 ring-white/10 md:w-auto md:max-w-none">
              <img src={`/visionbooth/stile/${k}.webp`} alt={l} loading="lazy" className="aspect-[4/5] w-full object-cover" />
              <figcaption className="absolute inset-x-2 bottom-2 rounded-full bg-black/60 px-3 py-1.5 text-center text-[13px] font-semibold backdrop-blur">{l}</figcaption>
            </figure>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-white/40">Beispiele mit KI-generierten Personen</p>
      </section>

      {/* Funktionen */}
      <section className="relative mx-auto max-w-6xl px-5 py-16">
        <h2 className="vb-display text-center text-3xl font-semibold sm:text-4xl">Mehr als eine Fotobox</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 110} className="vb-glass rounded-3xl p-6">
              <IconTile id={f.icon} />
              <p className="mt-3 text-lg font-bold">{f.title}</p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-white/65">{f.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Jetzt selbst ausprobieren */}
      <section className="relative mx-auto max-w-4xl px-5 py-12">
        <Reveal>
          <div className="relative overflow-hidden rounded-[32px] p-7 sm:p-10" style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--a) 30%, #141417), #141417 70%)" }}>
            <div className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: "var(--a)" }}>Live-Demo</p>
                <h2 className="vb-display mt-2 text-3xl font-semibold sm:text-4xl">Probier&apos;s jetzt selbst aus</h2>
                <p className="mt-3 max-w-md text-white/70">
                  Mach ein Foto mit Rahmen, verwandle dich mit KI und schau dir die Galerie an – genau so, wie es eure Gäste erleben. Kostenlos, ohne Anmeldung.
                </p>
                <a href="/vb/demo" className="vb-btn mt-6 inline-block rounded-full px-7 py-4 text-[16px] font-bold md:hidden">
                  Demo jetzt starten
                </a>
                <p className="mt-5 hidden text-sm text-white/55 md:block">Einfach den QR-Code mit der Handy-Kamera scannen →</p>
              </div>
              <div className="hidden md:block">
                <div className="vb-wall-qr w-44 rounded-2xl bg-white p-2.5" dangerouslySetInnerHTML={{ __html: demoQr }} />
                <p className="mt-2 text-center text-xs text-white/50">Scann mich</p>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Pakete */}
      <section id="pakete" className="relative mx-auto max-w-6xl px-5 py-16">
        <h2 className="vb-display text-center text-3xl font-semibold sm:text-4xl">Pakete</h2>
        <p className="mt-3 text-center text-white/65">Einmal zahlen, kein Abo. Link sofort nach der Buchung.</p>
        <PlanTabs />
      </section>

      {/* FAQ */}
      <section className="relative mx-auto max-w-3xl px-5 py-16">
        <h2 className="vb-display text-center text-3xl font-semibold sm:text-4xl">Häufige Fragen</h2>
        <div className="mt-8 space-y-2">
          {FAQ.map((f) => (
            <details key={f.q} className="vb-glass group rounded-2xl px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-semibold">
                {f.q}
                <span className="text-xl text-white/50 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-[15px] leading-relaxed text-white/65">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Abschluss */}
      <section className="relative mx-auto max-w-4xl px-5 pb-20 pt-8 text-center">
        <div className="vb-glass rounded-[32px] px-6 py-12">
          <h2 className="vb-display text-3xl font-semibold sm:text-4xl">
            Bereit für <span className="vb-gold-text">unvergessliche Fotos</span>?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-white/65">In zwei Minuten gebucht – und eure VisionBooth ist sofort startklar.</p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/vb/buchen" className="vb-btn rounded-full px-8 py-4 text-[17px] font-bold">
              Jetzt buchen
            </Link>
            <a href="/vb/demo" className="text-sm font-semibold text-white/70 underline underline-offset-4">
              Erst mal die Demo testen
            </a>
          </div>
        </div>
      </section>

      <footer className="relative border-t border-white/10 px-5 py-8 text-center text-[13px] text-white/45">
        <VbLogo variant="logo" height={88} className="mx-auto mb-4 opacity-90" />
        <p>VisionBooth ist ein Angebot von Event Vision Media · {LANDLORD.phone} · {LANDLORD.email}</p>
        <p className="mt-2 space-x-4">
          <a href="/vb/impressum" className="hover:text-white">Impressum</a>
          <a href="/vb/datenschutz" className="hover:text-white">Datenschutz</a>
          <a href="/vb/agb" className="hover:text-white">AGB</a>
          <a href="/vb/widerruf" className="hover:text-white">Widerruf</a>
        </p>
      </footer>
    </main>
  );
}
