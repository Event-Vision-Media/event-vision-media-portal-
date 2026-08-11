import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Prüft, ob eine gültige Supabase-Auth-Session (Admin) vorliegt.
 * Gibt true zurück, wenn ja – sonst false. Server Actions im Admin-Bereich
 * müssen dies vor jeder Schreiboperation prüfen, da Server Actions nicht in
 * jedem Fall über die Middleware laufen.
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return Boolean(user);
}
