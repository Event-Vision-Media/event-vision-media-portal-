import Image from "next/image";
import Link from "next/link";
import { getRecommendations } from "@/lib/recommendations";
import type { Booking } from "@/lib/types";

/**
 * Empfehlungen im Dashboard ("Macht euer Event komplett"): bis zu drei
 * Exclusive Extras, die am Eventdatum verfügbar und noch nicht gebucht sind.
 * Ein Klick öffnet das Extra direkt auf der Seite "Event Highlights".
 */
export async function UpsellSection({ booking }: { booking: Booking }) {
  const recommendations = await getRecommendations(booking, 3);
  if (recommendations.length === 0) return null;

  const sie = booking.customer_type === "business";
  const done = Boolean(booking.extras_confirmed_at);

  return (
    <section className="animate-fade-in-up rounded-2xl border border-gold-200 bg-gradient-to-b from-gold-50 to-white p-5 shadow-card sm:p-6">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold-600">Passend zu {sie ? "Ihrem" : "eurem"} Event</p>
      <h2 className="mt-1 font-serif text-xl font-semibold text-anthracite-800">
        {sie ? "Machen Sie Ihr Event komplett" : "Macht euer Event komplett"}
      </h2>
      <p className="mt-1 text-sm text-anthracite-500">
        {sie
          ? "Diese Extras sind an Ihrem Termin noch verfügbar – mit einem Klick hinzugefügt."
          : "Diese Extras sind an eurem Termin noch frei – mit einem Klick dazugebucht."}
      </p>

      <div className="-mx-5 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
        {recommendations.map(({ extra, priceLabel: price, availability }) => {
          return (
            <Link
              key={extra.id}
              href={`/dashboard/event-highlights?extra=${extra.id}`}
              className="group w-[72%] flex-none snap-start overflow-hidden rounded-xl border border-anthracite-100 bg-white shadow-soft transition hover:-translate-y-0.5 hover:border-gold-300 hover:shadow-card sm:w-auto"
            >
              <div className="relative aspect-[3/2] bg-anthracite-50">
                {extra.preview_image_url && (
                  <Image
                    src={extra.preview_image_url}
                    alt={extra.name}
                    fill
                    sizes="(max-width: 640px) 72vw, 220px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
                {availability?.status === "wenige" && (
                  <span className="absolute left-2 top-2 rounded-full bg-anthracite-900/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold-200">
                    Nur noch {availability.remaining} frei
                  </span>
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-anthracite-800">{extra.name}</p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-gold-700">{price}</span>
                  <span className="text-xs font-medium text-anthracite-400 transition group-hover:text-gold-700">Ansehen →</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <Link
        href="/dashboard/event-highlights"
        className="mt-4 inline-flex text-sm font-medium text-gold-700 hover:text-gold-800"
      >
        {done ? "Alle Extras ansehen →" : sie ? "Alle Extras ansehen & auswählen →" : "Alle Extras ansehen & auswählen →"}
      </Link>
    </section>
  );
}
