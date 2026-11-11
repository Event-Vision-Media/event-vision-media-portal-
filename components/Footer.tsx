import { BrandMark, BrandName } from "@/components/BrandMark";

// Rechtstexte liegen auf der Website (fotobox-essen.com)
const WEBSITE = (process.env.NEXT_PUBLIC_WEBSITE_URL || "https://fotobox-essen.com").replace(/\/$/, "");

export function Footer() {
  return (
    <footer className="mt-16 border-t border-anthracite-100 bg-white/60">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 px-4 py-10 text-center sm:px-6">
        <BrandMark size={44} />
        <p className="font-serif text-base font-semibold text-anthracite-800">
          <BrandName />
        </p>
        <p className="max-w-sm text-sm text-anthracite-500">
          Unvergessliche Erinnerungen für jedes Event – mit Herz und Liebe zum Detail.
        </p>
        <p className="text-xs text-anthracite-400">
          © {new Date().getFullYear()} Event Vision Media ·{" "}
          <a href={`${WEBSITE}/impressum.html`} className="hover:text-anthracite-700">Impressum</a> ·{" "}
          <a href={`${WEBSITE}/datenschutz.html`} className="hover:text-anthracite-700">Datenschutz</a>
        </p>
      </div>
    </footer>
  );
}
