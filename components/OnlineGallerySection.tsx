import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDateTimeGerman } from "@/lib/format";
import { getGalleryUnlockDate } from "@/lib/types";

export function OnlineGallerySection({
  eventDate,
  galleryUrl,
  clickedAt,
}: {
  eventDate: string;
  galleryUrl: string | null;
  clickedAt: string | null;
}) {
  const unlockDate = getGalleryUnlockDate(eventDate);
  const isUnlocked = new Date() >= unlockDate;
  const isReady = isUnlocked && Boolean(galleryUrl);

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-anthracite-900 to-anthracite-700 text-white">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-white/10">
            <GalleryIcon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-serif text-lg font-semibold">Deine Online-Galerie</h2>
            <p className="mt-0.5 text-sm text-white/70">
              Alle Fotos eures Events an einem Ort.
            </p>
          </div>
        </div>
        {isReady && <Badge tone="gold">Verfügbar</Badge>}
      </div>

      <div className="mt-4">
        {isReady ? (
          <>
            <a
              href="/api/gallery-redirect"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-gold-400 to-gold-600 px-5 py-3 text-sm font-medium tracking-wide text-white shadow-glow transition-all duration-200 hover:from-gold-500 hover:to-gold-700 active:scale-[0.98] sm:w-auto"
            >
              Zur Online-Galerie
              <ExternalLinkIcon className="h-4 w-4" />
            </a>
            {clickedAt && (
              <p className="mt-3 text-xs text-white/50">
                Zuletzt geöffnet am {formatDateTimeGerman(clickedAt)} Uhr.
              </p>
            )}
          </>
        ) : isUnlocked ? (
          <p className="text-sm text-white/70">
            Eure Galerie wird gerade vorbereitet und ist in Kürze hier verfügbar. Wir melden uns,
            sobald es so weit ist.
          </p>
        ) : (
          <p className="text-sm text-white/70">
            Eure Online-Galerie ist ab dem{" "}
            <span className="font-medium text-white">{formatDateLocal(unlockDate)}</span>{" "}
            hier verfügbar — wir brauchen nach eurem Event noch etwas Zeit, um alle Fotos
            aufzubereiten.
          </p>
        )}
      </div>
    </Card>
  );
}

// Formatiert ein lokales Datum ohne Umweg über UTC (toISOString würde das
// Datum je nach Zeitzone um einen Tag verschieben).
function formatDateLocal(date: Date) {
  return date.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function GalleryIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="8.5" cy="9.5" r="1.6" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M4 16l4.5-4.5a1.5 1.5 0 0 1 2.1 0L14 15l1.4-1.4a1.5 1.5 0 0 1 2.1 0L20 16"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ExternalLinkIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M9 6H6a1.5 1.5 0 0 0-1.5 1.5v10.5A1.5 1.5 0 0 0 6 19.5h10.5A1.5 1.5 0 0 0 18 18v-3M14 5h5v5M18.5 5.5l-8 8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
