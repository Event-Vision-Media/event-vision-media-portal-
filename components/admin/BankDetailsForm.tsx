"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateBankDetails, type ContractActionResult } from "@/app/actions/contract";
import { Button } from "@/components/ui/Button";
import type { BankDetails } from "@/lib/contract";

const initialState: ContractActionResult = {};

export function BankDetailsForm({ current }: { current: BankDetails }) {
  const [state, formAction] = useFormState(updateBankDetails, initialState);
  return (
    <form action={formAction} className="space-y-3">
      <Field name="holder" label="Kontoinhaber" defaultValue={current.holder} placeholder="Dustin Nowitzki" />
      <Field name="iban" label="IBAN" defaultValue={current.iban} placeholder="DE00 0000 0000 0000 0000 00" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field name="bic" label="BIC (optional)" defaultValue={current.bic} />
        <Field name="bank" label="Bank (optional)" defaultValue={current.bank} />
      </div>
      <p className="text-xs text-anthracite-400">
        Erscheint im Mietvertrag unter „Zahlungsbedingungen“. Ohne IBAN steht dort „Bankverbindung laut Rechnung“.
        Bereits unterschriebene Verträge ändern sich nicht.
      </p>
      {state.error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>}
      {state.success && <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Bankverbindung gespeichert.</p>}
      <Submit />
    </form>
  );
}

function Field({ name, label, defaultValue, placeholder }: { name: string; label: string; defaultValue: string | null; placeholder?: string }) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-anthracite-600">{label}</label>
      <input id={name} name={name} type="text" defaultValue={defaultValue ?? ""} placeholder={placeholder} autoComplete="off" className="input-field" />
    </div>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Speichert…" : "Speichern"}
    </Button>
  );
}
