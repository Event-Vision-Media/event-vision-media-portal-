import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase-Client mit anon key + Cookie-Session.
 * Wird ausschließlich für den Admin-Login (Supabase Auth) verwendet.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // In Server Components (nicht Server Actions/Route Handlers) kann
            // set() nicht aufgerufen werden. Middleware kümmert sich in dem
            // Fall um die Session-Aktualisierung.
          }
        },
      },
    }
  );
}
