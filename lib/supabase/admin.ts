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
    }
  );
}
