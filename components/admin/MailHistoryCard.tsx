import { Card } from "@/components/ui/Card";
import { formatDateTimeGerman } from "@/lib/format";
import { mailHistory, type MailLogRow } from "@/lib/mail-log";

const EVENT: Record<string, { text: string; tone: string }> = {
  sent: { text: "verschickt", tone: "bg-anthracite-100 text-anthracite-600" },
  queued: { text: "verschickt", tone: "bg-anthracite-100 text-anthracite-600" },
  scheduled: { text: "verschickt", tone: "bg-anthracite-100 text-anthracite-600" },
  delivered: { text: "zugestellt ✓", tone: "bg-emerald-50 text-emerald-700" },
  opened: { text: "geöffnet ✓", tone: "bg-emerald-50 text-emerald-700" },
  clicked: { text: "Link geklickt ✓", tone: "bg-emerald-50 text-emerald-700" },
  delivery_delayed: { text: "Zustellung verzögert", tone: "bg-amber-50 text-amber-700" },
  bounced: { text: "nicht zustellbar ⚠️", tone: "bg-red-50 text-red-700" },
  complained: { text: "als Spam markiert ⚠️", tone: "bg-red-50 text-red-700" },
};

function badge(r: MailLogRow) {
  if (r.status === "test") return { text: "Test-Adresse – nicht verschickt", tone: "bg-anthracite-100 text-anthracite-500" };
  if (r.status === "aus") return { text: "nicht verschickt (Mail-Dienst aus)", tone: "bg-anthracite-100 text-anthracite-500" };
  if (r.status === "fehler") return { text: "Versand fehlgeschlagen ⚠️", tone: "bg-red-50 text-red-700" };
  return EVENT[r.last_event ?? "sent"] ?? { text: r.last_event ?? "verschickt", tone: "bg-anthracite-100 text-anthracite-600" };
}

/** Mail-Verlauf der Buchung: alles, was der Kunde vom Portal bekommen hat – mit Zustellstatus und Inhalt. */
export async function MailHistoryCard({ bookingId, email }: { bookingId: string; email: string | null }) {
  const rows = await mailHistory(bookingId, email);
  const problem = rows.find((r) => r.last_event === "bounced" || r.last_event === "complained" || r.status === "fehler");

  return (
    <Card>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-lg font-semibold text-anthracite-800">Mail-Verlauf</h2>
        {rows.length > 0 && <span className="text-xs text-anthracite-400">{rows.length} {rows.length === 1 ? "Mail" : "Mails"}</span>}
      </div>
      {problem && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          ⚠️ „{problem.subject}“ ist nicht angekommen – bitte E-Mail-Adresse prüfen oder den Kunden anrufen.
        </p>
      )}
      {rows.length === 0 ? (
        <p className="text-sm text-anthracite-500">Noch keine Mails gespeichert. Der Verlauf beginnt mit Einführung dieser Funktion – ältere Mails stehen im Aktivitätsverlauf.</p>
      ) : (
        <ul className="divide-y divide-anthracite-100">
          {rows.map((r) => {
            const b = badge(r);
            return (
              <li key={r.id}>
                <details className="group py-2.5">
                  <summary className="flex cursor-pointer list-none items-start gap-3">
                    <span className="mt-0.5 text-anthracite-400 transition group-open:rotate-90">›</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-anthracite-800">{r.subject}</span>
                      <span className="block text-xs text-anthracite-400">
                        {formatDateTimeGerman(r.created_at)}
                        {email && r.recipient.toLowerCase() !== email.toLowerCase() ? ` · an ${r.recipient}` : ""}
                      </span>
                    </span>
                    <span className={`flex-none rounded-full px-2 py-0.5 text-[11px] font-medium ${b.tone}`}>{b.text}</span>
                  </summary>
                  <iframe
                    title={r.subject}
                    src={`/api/admin/mail/${r.id}`}
                    loading="lazy"
                    sandbox=""
                    className="mt-3 h-[480px] w-full rounded-lg border border-anthracite-100 bg-white"
                  />
                </details>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-xs text-anthracite-400">
        „Zugestellt“ heißt: im Postfach angekommen. Ob eine Mail gelesen wurde, lässt sich nicht sicher messen – Klicks auf Angebot oder Portal-Anmeldung siehst du im Aktivitätsverlauf.
      </p>
    </Card>
  );
}
