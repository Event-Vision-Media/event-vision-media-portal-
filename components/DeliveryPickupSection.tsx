"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateAccessNotes } from "@/app/actions/booking";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatDateGerman, formatTimeGerman } from "@/lib/format";
import type { Booking } from "@/lib/types";

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-anthracite-400">{label}</span>
      <span className="text-right font-medium text-anthracite-800">{value}</span>
    </div>
  );
}

function InfoBlock({
  title,
  date,
  time,
  timeWindow,
  contactName,
  contactPhone,
}: {
  title: string;
  date: string | null;
  time: string | null;
  timeWindow: string | null;
  contactName: string | null;
  contactPhone: string | null;
}) {
  const notSet = <span className="text-anthracite-400">Noch nicht festgelegt</span>;

  return (
    <div className="flex-1 rounded-xl border border-anthracite-100 bg-white p-4">
      <h3 className="mb-3 font-medium text-anthracite-800">{title}</h3>
      <div className="space-y-2">
        <DetailRow label="Datum" value={date ? formatDateGerman(date) : notSet} />
        <DetailRow
          label="Uhrzeit"
          value={
            time || timeWindow ? (
              <>
                {time && formatTimeGerman(time)}
                {time && timeWindow && " · "}
                {timeWindow}
              </>
            ) : (
              notSet
            )
          }
        />
        <DetailRow
          label="Ansprechpartner"
          value={
            contactName || contactPhone ? (
              <span className="flex flex-col items-end">
                {contactName && <span>{contactName}</span>}
                {contactPhone && (
                  <a href={`tel:${contactPhone.replace(/\s+/g, "")}`} className="text-gold-700 underline">
                    {contactPhone}
                  </a>
                )}
              </span>
            ) : (
              notSet
            )
          }
        />
      </div>
    </div>
  );
}

export function DeliveryPickupSection({ booking }: { booking: Booking }) {
  const router = useRouter();
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(booking.access_notes ?? "");
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleSaveNotes() {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await updateAccessNotes(notesDraft);
      if (result.error) {
        setErrorMessage(result.error);
        return;
      }
      setIsEditingNotes(false);
      router.refresh();
    });
  }

  return (
    <Card>
      <h2 className="font-serif text-lg font-semibold text-anthracite-800">
        Lieferung &amp; Abholung
      </h2>
      <p className="mt-1 text-sm text-anthracite-500">
        Hier seht ihr, wann und von wem eure Fotobox geliefert und wieder abgeholt wird.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <InfoBlock
          title="Lieferung"
          date={booking.delivery_date}
          time={booking.delivery_time}
          timeWindow={booking.delivery_time_window}
          contactName={booking.delivery_contact_name}
          contactPhone={booking.delivery_contact_phone}
        />
        <InfoBlock
          title="Abholung"
          date={booking.pickup_date}
          time={booking.pickup_time}
          timeWindow={booking.pickup_time_window}
          contactName={booking.pickup_contact_name}
          contactPhone={booking.pickup_contact_phone}
        />
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-2">
          <label className="text-sm font-medium text-anthracite-600">
            Besonderheiten zur Lieferung / Zugangshinweise
          </label>
          {!isEditingNotes && (
            <button
              type="button"
              onClick={() => setIsEditingNotes(true)}
              className="flex-none text-xs font-medium text-anthracite-500 hover:text-anthracite-800"
            >
              {booking.access_notes ? "Bearbeiten" : "Hinzufügen"}
            </button>
          )}
        </div>

        {isEditingNotes ? (
          <div className="mt-2 space-y-3">
            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              rows={3}
              placeholder="Bitte geben Sie wichtige Informationen für die Anlieferung an, z. B. Treppen, fehlender Aufzug, Etage, enge Zufahrt, Hinterhof, Parkplatzsituation, Klingelschild, Zugangscode oder sonstige Hinweise."
              className="input-field"
              autoFocus
            />
            {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
            <div className="flex gap-3">
              <Button
                variant="ghost"
                className="flex-1"
                disabled={isPending}
                onClick={() => {
                  setNotesDraft(booking.access_notes ?? "");
                  setIsEditingNotes(false);
                  setErrorMessage(null);
                }}
              >
                Abbrechen
              </Button>
              <Button className="flex-1" disabled={isPending} onClick={handleSaveNotes}>
                {isPending ? "Speichert…" : "Speichern"}
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-2 rounded-lg bg-anthracite-50 px-3 py-2.5 text-sm text-anthracite-700">
            {booking.access_notes || (
              <span className="text-anthracite-400">Keine Angaben hinterlegt.</span>
            )}
          </p>
        )}
      </div>
    </Card>
  );
}
