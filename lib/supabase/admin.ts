import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-Role-Client: umgeht RLS vollständig.
 * NUR in Server Actions / Route Handlers verwenden, niemals an den Client
 * durchreichen. Wird für den Buchungscode-Login (kein Supabase-Auth-User)
 * sowie für alle Admin-Datenoperationen genutzt.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        // Next.js patcht das globale fetch und cached Anfragen standardmäßig
        // anhand der URL - das führte dazu, dass unveränderte Supabase-Abfragen
        // (z. B. für Dropdown-Listen) dauerhaft ein altes Ergebnis lieferten,
        // obwohl die Route als dynamisch markiert ist. cache: "no-store"
        // erzwingt hier explizit einen frischen Request bei jedem Aufruf.
        fetch: (input: RequestInfo | URL, init?: RequestInit) =>
          fetch(input, { ...init, cache: "no-store" }),
      },
    }
  );
}
