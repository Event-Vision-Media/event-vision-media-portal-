import { Card } from "@/components/ui/Card";

export function GoogleReviewSection({ reviewUrl }: { reviewUrl: string | null }) {
  if (!reviewUrl) {
    return null;
  }

  return (
    <Card className="border-gold-200 bg-gradient-to-br from-gold-50 to-white text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-gold-500 to-gold-600 text-white shadow-sm">
        <StarIcon className="h-5 w-5" />
      </div>
      <h2 className="mt-3 font-serif text-lg font-semibold text-anthracite-800">
        Gefällt euch, was ihr bisher seht?
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-anthracite-500">
        Wir würden uns riesig freuen, wenn ihr uns mit einer kurzen Google-Bewertung
        unterstützt — das hilft uns und anderen Paaren bei der Suche nach der passenden Fotobox.
      </p>
      <a
        href="/api/review-redirect"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-gold-400 to-gold-600 px-5 py-3 text-sm font-medium tracking-wide text-white shadow-glow transition-all duration-200 hover:from-gold-500 hover:to-gold-700 active:scale-[0.98]"
      >
        Jetzt bei Google bewerten
        <StarIcon className="h-4 w-4" />
      </a>
    </Card>
  );
}

function StarIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 3.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.7L12 3.5Z" />
    </svg>
  );
}
