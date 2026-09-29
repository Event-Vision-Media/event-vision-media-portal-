"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginWithBookingCode, type LoginState } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction] = useFormState(loginWithBookingCode, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label
          htmlFor="booking_code"
          className="mb-2 block text-sm font-medium text-anthracite-600"
        >
          Dein Zugangscode oder Passwort
        </label>
        <input
          id="booking_code"
          name="booking_code"
          type="text"
          autoComplete="off"
          placeholder="z. B. EV-7K4P-9QX2"
          className="input-field text-center text-lg tracking-wide"
          required
        />
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" className="w-full" disabled={pending}>
      {pending ? "Wird geprüft…" : "Zum Kundenportal"}
    </Button>
  );
}
