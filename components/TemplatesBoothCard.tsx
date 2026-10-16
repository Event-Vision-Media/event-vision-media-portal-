/* eslint-disable @next/next/no-img-element */
import type { TemplateSubmission } from "@/lib/templatesbooth-server";

const dateDE = (iso: string) => new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

/**
 * Zugang zur TemplatesBooth-Galerie (über 20.000 Designs, selbst personalisieren).
 * Die Galerie öffnet erst auf Klick in einem neuen Tab – vorher wird nichts von
 * TemplatesBooth geladen. Nach dem Absenden kommt der Kunde hierher zurück.
 */
export function TemplatesBoothCard({
  link,
  email,
  bookingCode,
  eventDate,
  premiumIncluded,
  submissions,
  justSent,
  sie,
}: {
  link: string;
  email: string | null;
  bookingCode: string;
  eventDate: string;
  premiumIncluded: boolean;
  submissions: TemplateSubmission[];
  justSent: boolean;
  sie: boolean;
}) {
  const t = (ihr: string, s: string) => (sie ? s : ihr);
  const latest = submissions[0];

  return (
    <section className="animate-fade-in-up overflow-hidden rounded-2xl border border-gold-200 bg-gradient-to-br from-anthracite-900 via-anthracite-800 to-anthracite-900 text-white shadow-card">
      <div className="p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-300">
          Design-Galerie · {premiumIncluded ? t("bei euch inklusive", "bei Ihnen inklusive") : "Premium +25 €"}
        </p>
        <h2 className="mt-1 font-serif text-xl font-semibold sm:text-2xl">
          {"Noch mehr Auswahl: über 20.000 Designs – selbst gestalten"}
        </h2>
        <p className="mt-1 text-sm text-anthracite-200">
          {t(
            "Design aussuchen, Namen, Datum und Text eintragen, Vorschau ansehen, absenden. Wir bereiten es für den Druck vor und schicken euch hier im Portal eine Vorschau zur Freigabe.",
            "Design aussuchen, Texte und auf Wunsch Ihr Logo einfügen, Vorschau ansehen, absenden. Wir bereiten es für den Druck vor und schicken Ihnen hier im Portal eine Vorschau zur Freigabe."
          )}
        </p>

        {latest ? (
          <div className="mt-4 flex gap-3 rounded-xl bg-white/10 p-3">
            {latest.preview_url && (
              <img src={latest.preview_url} alt="" className="h-20 w-auto shrink-0 rounded-md bg-white object-contain" loading="lazy" />
            )}
            <div className="text-sm">
              <p className="font-semibold text-emerald-300">✓ {t("Euer Design ist angekommen", "Ihr Design ist angekommen")}</p>
              {latest.design_name && <p className="text-anthracite-100">{latest.design_name}</p>}
              <p className="text-xs text-anthracite-300">
                Eingegangen am {dateDE(latest.received_at)} · {"die Vorschau zur Freigabe folgt hier im Portal."}
              </p>
            </div>
          </div>
        ) : justSent ? (
          <p className="mt-4 rounded-xl bg-white/10 p-3 text-sm text-anthracite-100">
            {t(
              "Danke! Sobald euer Design bei uns angekommen ist, seht ihr es hier (kann ein paar Minuten dauern). Ihr bekommt außerdem eine Bestätigung per E-Mail.",
              "Vielen Dank! Sobald Ihr Design bei uns angekommen ist, sehen Sie es hier (kann ein paar Minuten dauern). Sie erhalten außerdem eine Bestätigung per E-Mail."
            )}
          </p>
        ) : null}

        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-anthracite-200">
          <p className="font-semibold text-gold-200">{t("Damit wir euer Design sofort zuordnen können:", "Damit wir Ihr Design sofort zuordnen können:")}</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {email && (
              <li>
                {"Beim Absenden diese E-Mail angeben:"} <strong className="text-white">{email}</strong>
              </li>
            )}
            <li>
              Eventdatum: <strong className="text-white">{dateDE(eventDate)}</strong>
            </li>
            <li>
              {t("Ins Feld „Wünsche“ gern euren Buchungscode:", "Ins Feld „Wünsche“ gern Ihren Buchungscode:")} <strong className="text-white">{bookingCode}</strong>
            </li>
          </ul>
        </div>

        <a
          href={link}
          target="_blank"
          rel="noopener"
          className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-gold-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gold-700 sm:w-auto"
        >
          {latest ? "Weiteres Design senden ↗" : "Design-Galerie öffnen ↗"}
        </a>
        <p className="mt-2 text-[11px] text-anthracite-400">
          {"Die Galerie wird von unserem Partner TemplatesBooth bereitgestellt und öffnet sich in einem neuen Tab."}
          {!premiumIncluded && " " + t("Mit dem Absenden wird das Premium-Layout (25 €) zu eurer Buchung hinzugefügt.", "Mit dem Absenden wird das Premium-Layout (25 €) zu Ihrer Buchung hinzugefügt.")}
        </p>
      </div>
    </section>
  );
}
