import { createAdminClient } from "@/lib/supabase/admin";
import { mailDeliveryStatus } from "@/lib/email";
import { formatDateTimeGerman } from "@/lib/format";
import { Card } from "@/components/ui/Card";

const MAIL_STATUS: Record<string, { text: string; tone: string }> = {
  delivered: { text: "zugestellt ✓", tone: "text-emerald-700" },
  opened: { text: "geöffnet ✓", tone: "text-emerald-700" },
  clicked: { text: "geöffnet und Link geklickt ✓", tone: "text-emerald-700" },
  sent: { text: "verschickt, Zustellung läuft", tone: "text-anthracite-600" },
  delivery_delayed: { text: "Zustellung verzögert", tone: "text-amber-700" },
  bounced: { text: "nicht zustellbar – E-Mail-Adresse prüfen!", tone: "text-red-700" },
  complained: { text: "als Spam markiert", tone: "text-red-700" },
};

/**
 * Hat der Kunde die Auftragsbestätigung bekommen und war er schon im Portal?
 * Zustellstatus kommt live von Resend; Logins aus dem Aktivitätsprotokoll.
 */
export async function CustomerReachCard({ bookingId, confirmedAt }: { bookingId: string; confirmedAt: string | null }) {
  const { data } = await createAdminClient()
    .from("activity_log")
    .select("event_type, message, created_at")
    .eq("booking_id", bookingId)
    .in("event_type", ["mail_bestaetigung", "kunde_login"])
    .order("created_at", { ascending: false })
    .limit(50);
  const rows = data ?? [];
  const mail = rows.find((r) => r.event_type === "mail_bestaetigung");
  const logins = rows.filter((r) => r.event_type === "kunde_login");
  const status = mail ? await mailDeliveryStatus(mail.message) : null;
  const ms = status ? MAIL_STATUS[status.status] ?? { text: status.status, tone: "text-anthracite-600" } : null;

  return (
    <Card>
      <h2 className="mb-3 font-serif text-lg font-semibold text-anthracite-800">Kunde erreicht?</h2>
      <dl className="space-y-2 text-sm">
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-anthracite-500">✉️ Auftragsbestätigung</dt>
          <dd className={ms?.tone ?? "text-anthracite-400"}>
            {mail ? (
              <>
                {formatDateTimeGerman(mail.created_at)} · {ms ? ms.text : "Status nicht abrufbar"}
              </>
            ) : confirmedAt ? (
              "vor Einführung der Zustell-Anzeige verschickt"
            ) : (
              "noch nicht bestätigt"
            )}
          </dd>
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-anthracite-500">👤 Kundenportal</dt>
          <dd className={logins.length ? "text-emerald-700" : "text-anthracite-400"}>
            {logins.length
              ? `zuletzt angemeldet ${formatDateTimeGerman(logins[0].created_at)}${logins.length > 1 ? ` · ${logins.length}× seit Bestätigung` : ""}`
              : "noch nicht angemeldet"}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-anthracite-400">
        Ob eine Mail gelesen wurde, lässt sich ohne Tracking nicht sicher sagen – die Anmeldung im Portal zeigt aber, dass der Kunde die Mail mit dem Zugangscode geöffnet hat.
      </p>
    </Card>
  );
}
