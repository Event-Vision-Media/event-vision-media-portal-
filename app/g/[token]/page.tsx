import type { Metadata } from "next";
import { BrandMark, BrandName } from "@/components/BrandMark";
import { GalleryGrid } from "@/components/GalleryGrid";
import { createAdminClient } from "@/lib/supabase/admin";
import { galleryItems, galleryState, getGalleryByToken } from "@/lib/event-gallery-server";
import { GALLERY_DAYS } from "@/lib/event-gallery";
import { isAdminAuthenticated } from "@/lib/require-admin";

export const dynamic = "force-dynamic";

const WEBSITE = (process.env.NEXT_PUBLIC_WEBSITE_URL || "https://fotobox-essen.com").replace(/\/$/, "");

export async function generateMetadata(props: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await props.params;
  const g = await getGalleryByToken(token);
  const title = g?.title ? `${g.title} – 360°-Videos` : "360°-Videos – Event Vision Media";
  return {
    title,
    description: "Alle 360°-Videos vom Event zum Anschauen, Herunterladen und Teilen – von Event Vision Media.",
    robots: { index: false, follow: false },
    openGraph: { title, description: "Schaut euch alle 360°-Videos an und ladet eure Lieblingsclips herunter 🎬", images: [`/api/g/${token}/cover`], type: "website" },
  };
}

/** Öffentliche Online-Galerie (Link zum Teilen) – mit Branding, Bewertung und Hinweis auf weitere Angebote. */
export default async function GalleryPage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;
  const g = await getGalleryByToken(token);
  const state = g ? galleryState(g) : "geloescht";
  const supabase = createAdminClient();
  // Du (im Admin angemeldet) siehst die Galerie schon vor dem Freischalten als Vorschau; deine Aufrufe zählen nicht mit
  const isAdmin = g ? await isAdminAuthenticated() : false;
  const preview = Boolean(g && state === "entwurf" && isAdmin);
  const show = state === "online" || preview;
  const [items, { data: review }] = await Promise.all([
    g && show ? galleryItems(g.id) : Promise.resolve([]),
    supabase.from("app_settings").select("value").eq("key", "google_review_url").maybeSingle(),
  ]);
  if (g && state === "online" && !isAdmin) await supabase.from("event_galleries").update({ views: (g.views ?? 0) + 1 }).eq("id", g.id);
  const reviewUrl = (review?.value as string | undefined) || null;
  // Titel „Anlass · Datum“ → Datum klein über die Überschrift, damit mobil nichts unschön umbricht
  const [titleMain, titleDate] = (() => {
    const t = g?.title ?? "";
    const i = t.lastIndexOf(" · ");
    return i > 0 ? [t.slice(0, i), t.slice(i + 3)] : [t, ""];
  })();
  const until = g?.expires_at ? new Date(g.expires_at).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin" }) : null;

  return (
    <div className="min-h-screen bg-sand-50">
      <header className="border-b border-anthracite-100/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <a href={`${WEBSITE}/?von=galerie`} className="flex items-center gap-3 leading-tight">
            <BrandMark size={40} />
            <span className="font-serif text-lg font-semibold text-anthracite-800"><BrandName /></span>
          </a>
          <a href={`${WEBSITE}/anfrage.html?von=galerie`} className="hidden rounded-full border border-gold-300 px-4 py-2 text-sm font-medium text-gold-800 hover:bg-gold-50 sm:inline-block">
            Fürs eigene Event anfragen
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">
        {show && g ? (
          <>
            {preview && (
              <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
                <strong>Vorschau</strong> – nur für dich sichtbar. Gäste sehen die Galerie erst nach „Galerie freischalten“ im Admin.
              </div>
            )}
            <div className="text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold-700">
                360°-Videos{titleDate ? ` · ${titleDate}` : ""}
              </p>
              <h1 className="mx-auto mt-2 max-w-2xl text-balance font-serif text-3xl font-semibold text-anthracite-800 sm:text-4xl">{titleMain || "Eure 360°-Videos"}</h1>
              <p className="mx-auto mt-2 max-w-md text-balance text-sm text-anthracite-500">
                {items.length} {items.length === 1 ? "Video" : "Videos"} zum Anschauen, Herunterladen und Teilen
                {until ? <span className="block text-xs text-anthracite-400">online bis {until}</span> : null}
              </p>
            </div>
            <GalleryGrid items={items} title={g.title || "360°-Videos"} />
          </>
        ) : (
          <div className="mx-auto max-w-lg py-16 text-center">
            <p className="text-4xl">🎬</p>
            <h1 className="mt-3 font-serif text-2xl font-semibold text-anthracite-800">{state === "entwurf" ? "Die Videos sind gleich da" : "Diese Galerie ist nicht mehr online"}</h1>
            <p className="mt-2 text-anthracite-500">
              {state === "entwurf"
                ? "Wir bereiten die Videos gerade vor – schau bald wieder vorbei."
                : `Die Videos waren ${GALLERY_DAYS + (g?.extension_days ?? 0)} Tage lang verfügbar und wurden danach aus Datenschutzgründen gelöscht.`}
            </p>
          </div>
        )}

        <section className="mt-14 grid gap-4 sm:grid-cols-2">
          {reviewUrl && (
            <a href={reviewUrl} target="_blank" rel="noopener" className="rounded-3xl bg-white p-6 shadow-card transition hover:-translate-y-0.5">
              <p className="text-2xl">⭐⭐⭐⭐⭐</p>
              <p className="mt-2 font-serif text-xl font-semibold text-anthracite-800">Hat’s euch gefallen?</p>
              <p className="mt-1 text-sm text-anthracite-500">Eine kurze Google-Bewertung hilft uns enorm – danke!</p>
              <span className="mt-4 inline-block text-sm font-semibold text-gold-700">Jetzt bewerten →</span>
            </a>
          )}
          <a href={`${WEBSITE}/anfrage.html?von=galerie`} className="rounded-3xl bg-anthracite-900 p-6 text-white shadow-card transition hover:-translate-y-0.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold-300">Euer nächstes Event?</p>
            <p className="mt-2 font-serif text-xl font-semibold">Fotobox, Fotospiegel, 360° &amp; Audiogästebuch</p>
            <p className="mt-1 text-sm text-white/70">Für Hochzeit, Geburtstag oder Firmenfeier – im Ruhrgebiet und darüber hinaus.</p>
            <span className="mt-4 inline-block text-sm font-semibold text-gold-300">Termin prüfen &amp; anfragen →</span>
          </a>
          <a href="https://visionbooth.de/?von=galerie" className="rounded-3xl border border-gold-200 bg-gradient-to-br from-white to-gold-50 p-6 shadow-card transition hover:-translate-y-0.5 sm:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold-700">Neu · VisionBooth</p>
            <p className="mt-2 font-serif text-xl font-semibold text-anthracite-800">Jedes Handy wird zur Fotobox</p>
            <p className="mt-1 text-sm text-anthracite-500">QR-Code scannen, Foto mit eurem Rahmen machen, mit KI verwandeln und mit allen teilen – ganz ohne App. Ab 79 €.</p>
            <span className="mt-4 inline-block text-sm font-semibold text-gold-700">VisionBooth entdecken →</span>
          </a>
        </section>

        <p className="mt-10 text-center text-xs text-anthracite-400">
          Galerie von <a href={`${WEBSITE}/?von=galerie`} className="underline underline-offset-2">Event Vision Media</a> · Essen · Nur über diesen Link erreichbar ·{" "}
          <a href={`${WEBSITE}/datenschutz.html`} className="underline underline-offset-2">Datenschutz</a> · <a href={`${WEBSITE}/impressum.html`} className="underline underline-offset-2">Impressum</a>
        </p>
      </main>
    </div>
  );
}
