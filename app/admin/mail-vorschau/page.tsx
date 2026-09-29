import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { rebookingMail, waitingInquiriesMail, adminNotificationMail, cashReminderMail, confirmationMail, contractReminderMail, depositReminderMail, restTransferReminderMail, declineMail, followupMail, inquiryReceivedMail, reminderMail, reservationMail, type MailBooking } from "@/lib/email";
import { priceSelection } from "@/lib/catalog";
import { depositFor } from "@/lib/contract";

export const dynamic = "force-dynamic";

/**
 * Vorschau aller automatischen E-Mails mit Beispieldaten – zum Prüfen von
 * Texten und Design, ohne eine echte E-Mail zu verschicken.
 */
export default async function AdminMailPreviewPage({ searchParams }: { searchParams: { typ?: string } }) {
  const business = searchParams.typ === "business";
  const priced = business
    ? priceSelection(["spiegel-gold"], ["branding", "betreuung"], 2, true)
    : priceSelection(["spiegel-gold", "audio-komfort"], ["hintergrund", "usb"], 1, false);

  const sample: MailBooking = {
    booking_code: "FB-2027-0042",
    customer_type: business ? "business" : "privat",
    access_code: "EV-7K4P-9QX2",
    custom_login_code: null,
    customer_name: business ? "Max Muster" : "Anna Beispiel",
    couple_names: business ? "Muster GmbH" : "Anna & Julian",
    event_date: "2027-06-12",
    event_days: priced.days,
    location: business ? "Messe Essen, Halle 3" : "Schloss Hugenpoet, Essen",
    occasion: business ? "Messe / Ausstellung" : "Hochzeit",
    total_price: priced.total,
    inquiry_items: priced,
  };

  const mails = [
    { title: "1 · Termin vorgemerkt (sofort nach der Anfrage, ohne Zugang)", mail: reservationMail(sample) },
    { title: "2 · Eingangsbestätigung (Termin belegt oder kurzfristig – du prüfst persönlich)", mail: inquiryReceivedMail(sample, "belegt") },
    { title: "4a · Erinnerung Mietvertrag (3 Tage nach deiner Bestätigung, falls noch nicht unterschrieben)", mail: contractReminderMail(sample) },
    { title: "3 · Auftragsbestätigung mit Portal-Zugang (nach Klick auf „Bestätigen“)", mail: confirmationMail(sample) },
    { title: "4b · Erinnerung Anzahlung (7 Tage nach Vertragsunterschrift, falls nicht abgehakt)", mail: depositReminderMail(sample, depositFor(sample.total_price ?? 0), { holder: "Dustin Nowitzki", iban: "DE00 0000 0000 0000 0000 00", bic: null }) },
    { title: "4c · Erinnerung Restzahlung per Überweisung (ca. 17 Tage vor dem Event, fällig 14 Tage vorher)", mail: restTransferReminderMail(sample, (sample.total_price ?? 0) - depositFor(sample.total_price ?? 0), "2027-05-29", { holder: "Dustin Nowitzki", iban: "DE00 0000 0000 0000 0000 00", bic: null }) },
    { title: "4d · Hinweis Barzahlung bei Lieferung (1–2 Tage vorher)", mail: cashReminderMail(sample, (sample.total_price ?? 0) - depositFor(sample.total_price ?? 0)) },
    { title: "5 · Absage (optional beim Ablehnen)", mail: declineMail(sample, "An dem Tag sind leider bereits alle Spiegel vergeben.") },
    {
      title: "6 · Erinnerung 4 Wochen vor dem Event (automatisch)",
      mail: reminderMail(
        sample,
        business
          ? ["Startbildschirm auswählen", "Foto-Layout auswählen", "Hinweise zu Anfahrt & Zugang der Location hinterlegen"]
          : ["Deinen Startbildschirm auswählen", "Deine Begrüßungsansage fürs Audiogästebuch aufnehmen"],
        [{ name: "XXL-LOVE Leuchtbuchstaben", priceLabel: "149,00 €" }, { name: "Aufblasbare Fotokabine", priceLabel: "69,00 €" }]
      ),
    },
    { title: "7 · Nach dem Event: Galerie + Bewertung (automatisch)", mail: followupMail(sample, "https://g.page/r/beispiel/review") },
    {
      title: "8 · Benachrichtigung an dich (neue Anfrage)",
      mail: adminNotificationMail({
        ...sample,
        email: "kunde@example.com",
        phone: "0176 12345678",
        company: business ? "Muster GmbH" : null,
        lifecycle: "reserviert",
        inquiry_message: "Wir freuen uns schon sehr! Gibt es auch Requisiten zum Thema Gold?",
      }),
    },
  ];

  mails.push({
    title: "9 · An dich: Anfragen warten seit über 24 Stunden (täglich, falls nötig)",
    mail: waitingInquiriesMail([
      { booking_code: sample.booking_code, customer_name: sample.customer_name, couple_names: sample.couple_names, event_date: sample.event_date, lifecycle: "reserviert" },
    ]),
  });
  if (business) {
    mails.push({
      title: "7b · Nur Firmen: „Nächstes Jahr wieder?“ (ca. 3 Monate vor dem Jahrestag)",
      mail: rebookingMail(sample, "2028-06-10", "https://fotobox-essen.com/anfrage.html?typ=business&datum=2028-06-10"),
    });
  }
  mails.sort((a, b) => a.title.localeCompare(b.title, "de", { numeric: true }));

  return (
    <div className="min-h-screen bg-sand-50">
      <AdminHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="font-serif text-2xl font-semibold text-anthracite-800">E-Mail-Vorschau</h1>
        <p className="mt-1 mb-5 text-sm text-anthracite-500">
          So sehen die automatischen E-Mails aus (Beispieldaten, es wird nichts verschickt).
        </p>
        <div className="mb-6 flex gap-2 text-sm">
          {[
            { href: "/admin/mail-vorschau", label: "Privatkunde", active: !business },
            { href: "/admin/mail-vorschau?typ=business", label: "Businesskunde (Messe, 2 Tage)", active: business },
          ].map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`rounded-full border px-4 py-1.5 ${t.active ? "border-anthracite-800 bg-anthracite-800 text-white" : "border-anthracite-200 bg-white text-anthracite-600"}`}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <div className="grid gap-8 lg:grid-cols-2">
          {mails.map(({ title, mail }) => (
            <section key={title}>
              <h2 className="mb-1 text-sm font-semibold text-anthracite-700">{title}</h2>
              <p className="mb-2 text-xs text-anthracite-400">Betreff: {mail.subject}</p>
              <iframe
                title={title}
                srcDoc={mail.html}
                className="h-[640px] w-full rounded-2xl border border-anthracite-100 bg-white shadow-soft"
              />
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
