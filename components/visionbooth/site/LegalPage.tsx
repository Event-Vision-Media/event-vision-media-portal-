import Link from "next/link";
import { VbLogo } from "@/components/visionbooth/VbLogo";
import type { LegalSection } from "@/lib/vb-legal";

/** Rechtstexte (AGB, Widerruf) im VisionBooth-Design – gut lesbar und druckbar. */
export function LegalPage({ title, intro, sections, children, version }: { title: string; intro?: string; sections: LegalSection[]; children?: React.ReactNode; version: string }) {
  return (
    <main lang="de" className="vb px-5 py-10 sm:px-6 sm:py-14 print:bg-white print:text-black" style={{ ["--a" as string]: "#c4933f" }}>
      <div className="relative mx-auto max-w-2xl">
        <div className="flex items-center justify-between print:hidden">
          <Link href="/vb" aria-label="VisionBooth – Startseite">
            <VbLogo height={32} />
          </Link>
          <span className="flex gap-4 text-sm text-white/55">
            <Link href="/vb/agb" className="hover:text-white">AGB</Link>
            <Link href="/vb/widerruf" className="hover:text-white">Widerruf</Link>
            <Link href="/vb/datenschutz" className="hover:text-white">Datenschutz</Link>
            <Link href="/vb/impressum" className="hover:text-white">Impressum</Link>
          </span>
        </div>
        <h1 className="vb-display mt-10 hyphens-auto break-words text-[2rem] font-semibold leading-tight sm:text-4xl print:text-black">{title}</h1>
        {intro && <p className="mt-3 text-white/65 print:text-black">{intro}</p>}
        <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-white/80 print:text-black">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-lg font-bold text-white print:text-black">{s.title}</h2>
              {s.blocks.map((b, i) =>
                typeof b === "string" ? (
                  <p key={i} className="mt-2">{b}</p>
                ) : (
                  <ul key={i} className="mt-2 list-disc space-y-1 pl-5">
                    {b.ul.map((li) => <li key={li}>{li}</li>)}
                  </ul>
                )
              )}
            </section>
          ))}
          {children}
        </div>
        <p className="mt-12 text-xs text-white/40 print:text-black">Stand: {new Date(version + "T12:00:00").toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" })}</p>
      </div>
    </main>
  );
}
