"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { signContract, type ContractActionResult } from "@/app/actions/contract";
import { SignaturePad } from "@/components/SignaturePad";
import { Button } from "@/components/ui/Button";
import { SlotPicker } from "@/components/SlotPicker";
import type { SlotPlan } from "@/lib/slots";

export interface ContractPrefill {
  renter_name: string;
  renter_company: string;
  location_name: string;
  onsite_contact_name: string;
  onsite_contact_phone: string;
}

const initialState: ContractActionResult = {};

export function ContractSignForm({
  prefill,
  sie,
  isBusiness,
  hasDelivery,
  carryHelper,
  slots,
}: {
  prefill: ContractPrefill;
  sie: boolean;
  isBusiness: boolean;
  hasDelivery: boolean;
  /** Aufstellort nicht ebenerdig und Kunde stellt selbst eine Tragehilfe. */
  carryHelper?: boolean;
  slots: SlotPlan;
}) {
  const [state, formAction] = useFormState(signContract, initialState);
  const [signed, setSigned] = useState(false);
  const t = (du: string, s: string) => (sie ? s : du);

  return (
    <form action={formAction} className="space-y-6">
      <fieldset className="space-y-3">
        <legend className="font-serif text-lg font-semibold text-anthracite-800">
          1. {t("Eure Angaben", "Ihre Angaben")}
        </legend>
        {isBusiness && <Input name="renter_company" label="Firma" defaultValue={prefill.renter_company} />}
        <Input name="renter_name" label={isBusiness ? "Ansprechpartner (Vor- und Nachname)" : "Vor- und Nachname"} defaultValue={prefill.renter_name} required autoComplete="name" />
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
          <Input name="renter_street" label="Straße und Hausnummer" required autoComplete="street-address" />
          <Input name="renter_zip_city" label="PLZ und Ort" required autoComplete="postal-code" placeholder="45127 Essen" />
        </div>
      </fieldset>

      {isBusiness && (
        <fieldset className="space-y-3">
          <legend className="font-serif text-lg font-semibold text-anthracite-800">Rechnungsdaten <span className="text-sm font-normal text-anthracite-400">(optional)</span></legend>
          <p className="text-xs text-anthracite-500">Nur ausfüllen, wenn die Rechnung an eine andere Anschrift oder mit Bestellnummer/Kostenstelle gehen soll.</p>
          <Input name="billing_address" label="Abweichende Rechnungsanschrift" placeholder="Firma, Abteilung, Straße, PLZ Ort" autoComplete="off" />
          <div className="grid gap-3 sm:grid-cols-3">
            <Input name="billing_email" label="Rechnung per E-Mail an" type="email" placeholder="buchhaltung@firma.de" />
            <Input name="po_number" label="Bestellnummer" />
            <Input name="cost_center" label="Kostenstelle" />
          </div>
        </fieldset>
      )}

      <fieldset className="space-y-3">
        <legend className="font-serif text-lg font-semibold text-anthracite-800">2. Location &amp; Ablauf</legend>
        <Input name="location_name" label="Name der Location" defaultValue={prefill.location_name} placeholder="z. B. Schloss Borbeck" />
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
          <Input name="location_street" label="Straße und Hausnummer der Location" required />
          <Input name="location_zip_city" label="PLZ und Ort" required />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input name="onsite_contact_name" label="Ansprechpartner vor Ort" defaultValue={prefill.onsite_contact_name} required={hasDelivery} />
          <Input name="onsite_contact_phone" label="Telefon vor Ort" type="tel" defaultValue={prefill.onsite_contact_phone} required={hasDelivery} autoComplete="tel" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <SlotPicker
            name="handover"
            label={hasDelivery ? "Lieferung & Aufbau" : "Abholung bei uns (Übergabe)"}
            initial={slots.handover}
            range={slots.handoverRange}
            hint={hasDelivery ? t("Wann können wir in die Location? Der Aufbau dauert ca. 45 Min. je Gerät.", "Wann ist die Location für uns zugänglich? Der Aufbau dauert ca. 45 Min. je Gerät.") : undefined}
          />
          <SlotPicker
            name="return"
            label={hasDelivery ? "Abbau & Abholung" : "Rückgabe bei uns"}
            initial={slots.ret}
            range={slots.retRange}
            hint={
              hasDelivery
                ? slots.nightBooked
                  ? "Nachtabholung ist gebucht."
                  : t("Bis 22 Uhr oder am Folgetag kostenlos – später ist eine Nachtabholung (Aufpreis).", "Bis 22 Uhr oder am Folgetag kostenlos – später ist eine Nachtabholung (Aufpreis).")
                : undefined
            }
          />
        </div>
        <p className="text-xs text-anthracite-400">
          {t("Die Zeiten stimmen wir vor dem Event noch einmal gemeinsam mit euch ab.", "Die Zeiten stimmen wir vor dem Event noch einmal gemeinsam mit Ihnen ab.")}
        </p>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="font-serif text-lg font-semibold text-anthracite-800">3. {t("Bestätigen & unterschreiben", "Bestätigen & unterschreiben")}</legend>
        {isBusiness ? (
          <input type="hidden" name="rest_payment_method" value="ueberweisung" />
        ) : (
          <div className="rounded-xl border border-anthracite-100 bg-sand-50 p-4">
            <p className="text-sm font-medium text-anthracite-700">Wie möchtet ihr den Restbetrag zahlen? <span className="text-gold-600">*</span></p>
            <p className="mt-0.5 text-xs text-anthracite-500">Die Anzahlung überweist ihr nach der Unterschrift – die Rechnung kommt per E-Mail.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Radio name="rest_payment_method" value="ueberweisung" title="Per Überweisung" text="bis 14 Tage vor dem Event" />
              <Radio name="rest_payment_method" value="bar" title="Bar bei Lieferung" text="bequem vor Ort bei der Übergabe" />
            </div>
          </div>
        )}
        <Check name="location_confirmed" required>
          {t("Ich habe Standort, Aufbau und Abholung mit der Location abgesprochen.", "Standort, Aufbau und Abholung sind mit der Location abgesprochen.")}
        </Check>
        {carryHelper && (
          <Check name="carry_helper" required>
            {t(
              "Der Aufstellort ist nicht ebenerdig erreichbar – wir stellen beim Aufbau, Abbau und der Abholung eine kräftige Person, die beim Tragen hilft (bitte als Ansprechpartner vor Ort eintragen).",
              "Der Aufstellort ist nicht ebenerdig erreichbar – wir stellen beim Aufbau, Abbau und der Abholung eine kräftige Person, die beim Tragen hilft (bitte als Ansprechpartner vor Ort eintragen)."
            )}
          </Check>
        )}
        <Check name="accept" required>
          {t("Ich habe den Mietvertrag gelesen und akzeptiere ihn.", "Ich habe den Mietvertrag gelesen und akzeptiere ihn im Namen des Mieters.")}
        </Check>
        {!isBusiness && (
          <>
            <Check name="withdrawal_ack" required>
              Ich habe die Widerrufsbelehrung und das Muster-Widerrufsformular erhalten.
            </Check>
            <Check name="early_start">
              <span className="text-anthracite-500">
                Optional: Ich verlange ausdrücklich, dass mit der Leistung (z. B. Layout-Gestaltung, Terminblockung) bereits vor
                Ablauf der Widerrufsfrist begonnen wird.
              </span>
            </Check>
          </>
        )}
        <Check name="reference_consent">
          <span className="text-anthracite-500">
            {t(
              "Optional: Ihr dürft einzelne Fotos unseres Events als Referenz auf eurer Website/Social Media zeigen (jederzeit widerrufbar).",
              "Optional: Einzelne Fotos unserer Veranstaltung dürfen als Referenz auf Website/Social Media gezeigt werden (jederzeit widerrufbar)."
            )}
          </span>
        </Check>

        <div className="pt-2">
          <Input name="signer_name" label="Name der unterschreibenden Person" defaultValue={prefill.renter_name} required autoComplete="name" />
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium text-anthracite-600">Unterschrift</p>
          <SignaturePad name="signature" onChange={setSigned} />
        </div>
      </fieldset>

      {state.error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>}

      <SubmitButton disabled={!signed} label={t("Verbindlich unterschreiben", "Verbindlich unterschreiben")} />
      <p className="text-center text-xs text-anthracite-400">
        {t(
          "Damit ist euer Vertrag abgeschlossen. Ihr bekommt ihn sofort per E-Mail und in Kürze die Rechnung über die Anzahlung.",
          "Damit ist Ihr Vertrag abgeschlossen. Sie erhalten ihn sofort per E-Mail und in Kürze die Rechnung über die Anzahlung."
        )}
      </p>
    </form>
  );
}

function SubmitButton({ disabled, label }: { disabled: boolean; label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={disabled || pending}>
      {pending ? "Wird gespeichert…" : label}
    </Button>
  );
}

function Input({ label, name, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-anthracite-600">
        {label}
        {props.required && <span className="text-gold-600"> *</span>}
      </label>
      <input id={name} name={name} type="text" maxLength={200} className="input-field" {...props} />
    </div>
  );
}

function Radio({ name, value, title, text }: { name: string; value: string; title: string; text: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-anthracite-100 bg-white p-3 text-sm transition hover:border-gold-300 has-[:checked]:border-gold-500 has-[:checked]:bg-gold-50">
      <input type="radio" name={name} value={value} required className="mt-0.5 h-4 w-4 flex-none accent-gold-600" />
      <span>
        <span className="block font-medium text-anthracite-800">{title}</span>
        <span className="block text-xs text-anthracite-500">{text}</span>
      </span>
    </label>
  );
}

function Check({ name, required, children }: { name: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-anthracite-100 bg-white p-3 text-sm text-anthracite-700 transition hover:border-gold-300">
      <input type="checkbox" name={name} required={required} className="mt-0.5 h-4 w-4 flex-none accent-gold-600" />
      <span>{children}</span>
    </label>
  );
}
