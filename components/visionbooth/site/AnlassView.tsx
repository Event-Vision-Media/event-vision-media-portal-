import Link from "next/link";
import { VbLogo } from "@/components/visionbooth/VbLogo";
import { IconTile } from "./OccasionIcon";
import { Reveal } from "./Reveal";
import { PlanTabs } from "./PlanTabs";
import { FrameShowcase } from "./FrameShowcase";
import { CHALLENGE_SETS } from "@/components/visionbooth/challenges";
import { getPlan } from "@/components/visionbooth/packages";
import { LANDLORD } from "@/lib/contract";
import { ANLASS_ORDER, ANLASS_PAGES, type AnlassPage } from "./anlass-pages";

const euro = (n: number) => `${n.toLocaleString("de-DE")} €`;
export const anlassUrl = (slug: string) => `https://visionbooth.de/${slug}`;

function jsonLd(p: AnlassPage) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "VisionBooth", item: "https://visionbooth.de/" },
          { "@type": "ListItem", position: 2, name: `Digitale Fotobox ${p.name}`, item: anlassUrl(p.slug) },
        ],
      },
      {
        "@type": "Service",
        name: `Digitale Fotobox für ${p.name}`,
        description: p.seoDesc,
        provider: { "@id": "https://visionbooth.de/#org" },
        areaServed: "DE",
        offers: { "@type": "Offer", price: String(getPlan(p.plan).price), priceCurrency: "EUR", url: `https://visionbooth.de/vb/buchen?paket=${p.plan}` },
      },
      {
        "@type": "FAQPage",
        mainEntity: p.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
    ],
  };
}

/** Gemeinsames Layout der Anlass-Seiten (visionbooth.de/hochzeit usw.). */
export function AnlassView({ page: p }: { page: AnlassPage }) {
  const plan = getPlan(p.plan);
  const book = `/vb/buchen?paket=${p.plan}`;
  const missions = p.missionSets.flatMap((id) => CHALLENGE_SETS.find((s) => s.id === id)?.items.slice(0, p.missionSets.length > 1 ? 3 : 6) ?? []);
  const others = ANLASS_ORDER.filter((s) => s !== p.slug).map((s) => ANLASS_PAGES[s]);

  return (
    <main className="vb" style={{ ["--a" as string]: "#c4933f" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(p)) }} />
      <div className="vb-aurora" aria-hidden />

      <nav className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link href="/" aria-label="VisionBooth Startseite">
          <VbLogo height={40} />
        </Link>
        <div className="flex items-center gap-2">
          <a href="/vb/demo" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-white/80 hover:text-white sm:inline-block">
            Live-Demo
          </a>
          <Link href={book} className="vb-btn rounded-full px-5 py-2.5 text-sm font-bold">
            Jetzt buchen
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative mx-auto max-w-4xl px-5 pb-14 pt-6 text-center md:pt-12">
        <span className="vb-in vb-glass inline-block rounded-full px-4 py-1.5 text-xs font-semibold text-white/80">{p.eyebrow}</span>
        <h1 className="vb-in vb-display mt-5 text-[2.4rem] font-semibold leading-[1.08] sm:text-6xl" style={{ animationDelay: "80ms" }}>
          {p.h1[0]}
          <span className="vb-gold-text">{p.h1[1]}</span>
        </h1>
        <p className="vb-in mx-auto mt-5 max-w-2xl text-[17px] leading-relaxed text-white/70" style={{ animationDelay: "160ms" }}>
          {p.lead}
        </p>
        <div className="vb-in mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row" style={{ animationDelay: "240ms" }}>
          <Link href={book} className="vb-btn w-full rounded-full px-8 py-4 text-center text-[17px] font-bold sm:w-auto">
            Jetzt buchen – {p.plan === "business" ? "ab " : ""}
            {euro(plan.price)}
          </Link>
          <a href="/vb/demo" className="vb-glass w-full rounded-full px-8 py-4 text-center text-[16px] font-semibold sm:w-auto">
            Live-Demo am Handy testen
          </a>
        </div>
        <p className="vb-in mt-5 text-[13px] text-white/50" style={{ animationDelay: "320ms" }}>
          ✓ Link sofort nach Buchung &nbsp; ✓ Keine App &nbsp; ✓ Deutschlandweit
        </p>
      </section>

      {/* Rahmen */}
      <section className="relative py-12">
        <h2 className="vb-display px-5 text-center text-3xl font-semibold sm:text-4xl">{p.framesTitle}</h2>
        <p className="mx-auto mt-3 max-w-xl px-5 text-center text-white/65">So sehen die Fotos eurer Gäste aus – Text, Farben und Design stellt ihr nach der Buchung selbst ein.</p>
        <div className="mt-10">
          <FrameShowcase items={p.frames} />
        </div>
        <p className="mt-3 text-center text-xs text-white/40">Beispiele mit KI-generierten Personen</p>
      </section>

      {/* Momente */}
      <section className="relative mx-auto max-w-6xl px-5 py-14">
        <h2 className="vb-display text-center text-3xl font-semibold sm:text-4xl">
          So läuft&apos;s bei <span className="vb-gold-text">eurer Feier</span>
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {p.moments.map((m, i) => (
            <Reveal key={m.title} delay={i * 120} className="vb-glass rounded-3xl p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold" style={{ background: "var(--a)", color: "#0d0d0f" }}>
                {i + 1}
              </span>
              <p className="vb-display mt-4 text-xl font-semibold">{m.title}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-white/65">{m.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Highlights */}
      <section className="relative mx-auto max-w-6xl px-5 py-14">
        <h2 className="vb-display text-center text-3xl font-semibold sm:text-4xl">Das macht sie besonders</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {p.highlights.map((h, i) => (
            <Reveal key={h.title} delay={(i % 2) * 110} className="vb-glass rounded-3xl p-6">
              <IconTile id={h.icon} />
              <p className="mt-3 text-lg font-bold">{h.title}</p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-white/65">{h.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Missionen */}
      {missions.length > 0 && (
        <section className="relative mx-auto max-w-3xl px-5 py-14">
          <h2 className="vb-display text-center text-3xl font-semibold sm:text-4xl">
            Foto-Missionen <span className="vb-gold-text">zum Mitmachen</span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-white/65">Kleine Aufgaben mit Punkten und Bestenliste – fertig vorbereitet und im Kundenbereich frei anpassbar.</p>
          <ul className="mt-8 space-y-2">
            {missions.map((m) => (
              <li key={m.id} className="vb-glass flex items-center gap-4 rounded-2xl px-5 py-3.5">
                <span className="text-2xl" aria-hidden>
                  {m.emoji}
                </span>
                <span className="flex-1 text-[15px] font-semibold">{m.text}</span>
                <span className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: "color-mix(in srgb, var(--a) 22%, transparent)", color: "var(--a)" }}>
                  {m.points} P.
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* KI-Stile */}
      {p.styles.length > 0 && (
        <section className="relative py-14">
          <div className="mx-auto max-w-6xl px-5 text-center">
            <h2 className="vb-display text-3xl font-semibold sm:text-4xl">
              Ein Selfie. <span className="vb-gold-text">Neue Welten.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-white/65">
              Mit KI-Verwandlung werden eure Gäste in Sekunden zu Superheld, Filmstar oder Comicfigur – und bleiben dabei erkennbar.
            </p>
          </div>
          <div className="vb-scroll mt-10 flex gap-3 overflow-x-auto px-5 pb-2 md:mx-auto md:grid md:max-w-5xl md:grid-cols-4 md:overflow-visible">
            {p.styles.map(([k, l]) => (
              <figure key={k} className="relative w-[46vw] max-w-[220px] flex-none overflow-hidden rounded-3xl ring-1 ring-white/10 md:w-auto md:max-w-none">
                <img src={`/visionbooth/stile/${k}.webp`} alt={`KI-Stil ${l}`} loading="lazy" className="aspect-[4/5] w-full object-cover" />
                <figcaption className="absolute inset-x-2 bottom-2 rounded-full bg-black/60 px-3 py-1.5 text-center text-[13px] font-semibold backdrop-blur">{l}</figcaption>
              </figure>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-white/40">Beispiele mit KI-generierten Personen</p>
        </section>
      )}

      {/* Erklärtext */}
      <section className="relative mx-auto max-w-4xl px-5 py-14">
        <h2 className="vb-display text-center text-3xl font-semibold sm:text-4xl">
          {p.prose.title[0]}
          <span className="vb-gold-text">{p.prose.title[1]}</span>
        </h2>
        <div className="mt-8 grid gap-6 text-[15.5px] leading-relaxed text-white/70 md:grid-cols-2">
          {p.prose.paragraphs.map((t) => (
            <p key={t.slice(0, 20)}>{t}</p>
          ))}
        </div>
      </section>

      {/* Pakete */}
      <section id="pakete" className="relative mx-auto max-w-6xl px-5 py-14">
        <h2 className="vb-display text-center text-3xl font-semibold sm:text-4xl">Pakete</h2>
        <p className="mt-3 text-center text-white/65">Einmal zahlen, kein Abo. Link sofort nach der Buchung.</p>
        <PlanTabs initial={p.planTab} />
      </section>

      {/* FAQ */}
      <section className="relative mx-auto max-w-3xl px-5 py-14">
        <h2 className="vb-display text-center text-3xl font-semibold sm:text-4xl">Häufige Fragen</h2>
        <div className="mt-8 space-y-2">
          {p.faq.map((f) => (
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

      {/* Andere Anlässe */}
      <section className="relative mx-auto max-w-4xl px-5 py-10">
        <p className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-white/45">Auch für andere Anlässe</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {others.map((o) => (
            <Link key={o.slug} href={`/${o.slug}`} className="vb-glass rounded-2xl px-5 py-4 text-center text-[15px] font-semibold hover:text-white">
              Digitale Fotobox {o.slug === "hochzeit" ? "für die " : "für "}
              {o.name} →
            </Link>
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
            <Link href={book} className="vb-btn rounded-full px-8 py-4 text-[17px] font-bold">
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

/** Metadaten je Anlass-Seite (Titel, Beschreibung, Canonical, Vorschaubild). */
export function anlassMetadata(page: AnlassPage): import("next").Metadata {
  const url = anlassUrl(page.slug);
  const image = { url: "https://visionbooth.de/vb/og-bild", width: 1200, height: 630, alt: `VisionBooth – digitale Fotobox für ${page.name}` };
  return {
    metadataBase: new URL("https://visionbooth.de"),
    title: page.seoTitle,
    description: page.seoDesc,
    alternates: { canonical: url },
    openGraph: { type: "website", url, siteName: "VisionBooth", locale: "de_DE", title: page.seoTitle, description: page.seoDesc, images: [image] },
    twitter: { card: "summary_large_image", title: page.seoTitle, description: page.seoDesc, images: [image.url] },
  };
}
