"use client";

import { useFormState, useFormStatus } from "react-dom";
import { adminLogin, type AdminLoginState } from "@/app/actions/admin-auth";
import { Button } from "@/components/ui/Button";

const initialState: AdminLoginState = {};

export function AdminLoginForm() {
  const [state, formAction] = useFormState(adminLogin, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium text-anthracite-600">
          E-Mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          className="input-field"
          required
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-medium text-anthracite-600">
          Passwort
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="input-field"
          required
        />
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>
      )}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Wird geprüft…" : "Anmelden"}
    </Button>
  );
}
