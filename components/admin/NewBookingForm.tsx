"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createBooking, type AdminActionResult } from "@/app/actions/admin";
import { Button } from "@/components/ui/Button";
import { formatCurrencyEUR } from "@/lib/format";
import { PRODUCT_TYPES, type Extra, type ExtraVariant } from "@/lib/types";

const initialState: AdminActionResult = {};

export function NewBookingForm({
  extras,
  variantsByExtra,
}: {
  extras: Extra[];
  variantsByExtra: Record<string, ExtraVariant[]>;
}) {
  const [state, formAction] = useFormState(createBooking, initialState);

  return (
    <form action={formAction} className="space-y-4" key={state.bookingCode ?? "form"}>
      <div>
        <label htmlFor="couple_names" className="mb-2 block text-sm font-medium text-anthracite-600">
          Namen (Brautpaar / Kunde)
        </label>
        <input
          id="couple_names"
          name="couple_names"
          type="text"
          placeholder="z. B. Julia & Marco"
          className="input-field"
          required
        />
      </div>

      <div>
        <label htmlFor="event_date" className="mb-2 block text-sm font-medium text-anthracite-600">
          Event-Datum
        </label>
        <input id="event_date" name="event_date" type="date" className="input-field" required />
      </div>

      <div>
        <label htmlFor="product_type" className="mb-2 block text-sm font-medium text-anthracite-600">
          Gebuchtes Produkt
        </label>
        <select id="product_type" name="product_type" className="input-field" required>
          {PRODUCT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <label
        htmlFor="premium_layout_included"
        className="flex cursor-pointer items-start gap-3 rounded-lg border border-anthracite-100 bg-anthracite-50 p-3"
      >
        <input
          id="premium_layout_included"
          name="premium_layout_included"
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-anthracite-300 text-gold-500 focus:ring-gold-400"
        />
        <span className="text-sm text-anthracite-700">
          Premium-Layout ist bei dieser Buchung bereits inklusive
          <span className="mt-0.5 block text-xs text-anthracite-400">
            Der Kunde kann dann ein Premium-Layout wählen, ohne dass ihm der Aufpreis von 25 €
            berechnet wird.
          </span>
        </span>
      </label>

      <div>
        <label
          htmlFor="custom_login_code"
          className="mb-2 block text-sm font-medium text-anthracite-600"
        >
          Individuelles Login-Passwort <span className="text-anthracite-400">(optional)</span>
        </label>
        <input
          id="custom_login_code"
          name="custom_login_code"
          type="text"
          placeholder="z. B. Andrea08.08"
          className="input-field"
        />
        <p className="mt-1 text-xs text-anthracite-400">
          Der Kunde kann sich damit zusätzlich zum automatisch erzeugten Buchungscode einloggen.
        </p>
      </div>

      {extras.length > 0 && (
        <div className="border-t border-anthracite-100 pt-4">
          <p className="mb-1 text-sm font-medium text-anthracite-600">
            Bereits mitgebuchte Zusatzoptionen
          </p>
          <p className="mb-3 text-xs text-anthracite-400">
            Markiere hier, was der Kunde (z. B. telefonisch) schon zugesagt hat. Diese Auswahl
            erscheint im Kundenbereich automatisch als bereits gebucht.
          </p>
          <div className="space-y-3">
            {extras.map((extra) => {
              const variants = variantsByExtra[extra.id] ?? [];
              if (extra.has_variants) {
                return (
                  <div key={extra.id}>
                    <label
                      htmlFor={`extra_${extra.id}`}
                      className="mb-1 block text-sm text-anthracite-700"
                    >
                      {extra.name}
                    </label>
                    <select id={`extra_${extra.id}`} name={`extra_${extra.id}`} className="input-field text-sm" defaultValue="">
                      <option value="">Nicht mitgebucht</option>
                      <option value="__pending__">
                        Bereits gebucht – Kunde wählt Variante später (kein Aufpreis)
                      </option>
                      {variants
                        .filter((v) => v.is_available)
                        .map((variant) => (
                          <option key={variant.id} value={variant.id}>
                            {variant.name} · {formatCurrencyEUR(variant.price)}
                          </option>
                        ))}
                    </select>
                  </div>
                );
              }
              return (
                <label
                  key={extra.id}
                  htmlFor={`extra_${extra.id}`}
                  className="flex cursor-pointer items-center justify-between gap-2 text-sm text-anthracite-700"
                >
                  <span className="flex items-center gap-2">
                    <input
                      id={`extra_${extra.id}`}
                      name={`extra_${extra.id}`}
                      type="checkbox"
                      className="h-4 w-4 rounded border-anthracite-300 text-gold-500 focus:ring-gold-400"
                    />
                    {extra.name}
                  </span>
                  <span className="text-xs text-anthracite-400">
                    {formatCurrencyEUR(extra.price)}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {state.error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>
      )}
      {state.success && state.bookingCode && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Buchung angelegt! Buchungscode: <strong>{state.bookingCode}</strong>
        </p>
      )}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Wird angelegt…" : "Buchung anlegen"}
    </Button>
  );
}
