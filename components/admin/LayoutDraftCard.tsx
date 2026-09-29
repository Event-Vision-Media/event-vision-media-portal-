import { layoutDraftLinks } from "@/lib/layout-drafts";

interface LayoutDraft {
  label?: string;
  title?: string;
  subtitle?: string;
  small?: string;
  logo?: boolean;
  settings?: Record<string, string>;
  imagePath?: string;
  logoPath?: string;
  overlayPath?: string;
}

const SETTING_LABELS: Record<string, string> = {
  fotofelder: "Fotofelder",
  format: "Format",
  farbwelt: "Farbwelt",
  schrift: "Schrift",
  deko: "Deko",
  titel: "Titel",
  untertitel: "Untertitel",
  zusatz: "Zusatzzeile",
};

/** Entwurf aus dem Layout-Designer der Website (Admin): Vorschau, Einstellungen, Downloads. */
export async function LayoutDraftCard({ draft, compact = false }: { draft: LayoutDraft | null; compact?: boolean }) {
  if (!draft) return null;
  const links = await layoutDraftLinks(draft);
  const settings = Object.entries(draft.settings ?? {}).filter(([, v]) => v);

  return (
    <div className={`flex gap-4 rounded-xl border border-gold-200 bg-gold-50/60 p-3 ${compact ? "items-center" : "items-start"}`}>
      {links.image && (
        <a href={links.image} target="_blank" rel="noreferrer" className="flex-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={links.image} alt="Layout-Entwurf des Kunden" className={`${compact ? "h-24" : "h-44"} w-auto rounded-lg border border-white shadow-sm`} />
        </a>
      )}
      <div className="min-w-0 text-sm">
        <p className="font-medium text-anthracite-800">Layout-Entwurf aus dem Designer</p>
        <p className="text-anthracite-600">
          {draft.title}
          {draft.subtitle ? ` · ${draft.subtitle}` : ""}
        </p>
        {!compact && settings.length > 0 ? (
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs text-anthracite-500">
            {settings.map(([k, v]) => (
              <div key={k} className="contents">
                <dt>{SETTING_LABELS[k] ?? k}</dt>
                <dd className="text-anthracite-700">{v === "none" ? "ohne" : v === "frame" ? "Rahmen" : v === "corners" ? "Ecken" : v}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-xs text-anthracite-500">{draft.label}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          {links.imageDownload && (
            <a href={links.imageDownload} className="rounded-lg bg-anthracite-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-anthracite-800">
              Entwurf herunterladen
            </a>
          )}
          {links.overlay && (
            <a href={links.overlay} className="rounded-lg bg-gold-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-gold-700" title="PNG mit transparenten Fotofeldern – in dslrBooth als Overlay laden">
              Druckvorlage für dslrBooth
            </a>
          )}
          {links.logo && (
            <a href={links.logo} className="rounded-lg border border-anthracite-200 bg-white px-3 py-1.5 text-xs font-medium text-anthracite-700 hover:border-gold-300">
              Logo herunterladen
            </a>
          )}
          {draft.logo && !links.logo && <span className="text-xs text-anthracite-400">Mit Logo – Datei nicht mitgeschickt</span>}
        </div>
      </div>
    </div>
  );
}
