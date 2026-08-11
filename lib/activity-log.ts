import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Protokolliert eine Kundenaktion für den Admin-Aktivitäts-Feed. Wird
 * bewusst nur bei abgeschlossenen, relevanten Meilensteinen aufgerufen
 * (z.B. Layout gewählt, Extras final bestätigt, Freigabe/Änderungswunsch),
 * nicht bei jeder kleinen Zwischen-Auswahl.
 *
 * Schreibfehler werden bewusst verschluckt: das Protokoll ist ein
 * Komfort-Feature und darf die eigentliche Kundenaktion niemals blockieren
 * oder zum Scheitern bringen.
 */
export async function logActivity(
  bookingId: string,
  eventType: string,
  message: string
): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("activity_log").insert({
      booking_id: bookingId,
      event_type: eventType,
      message,
    });
  } catch {
    // Aktivitätsprotokoll ist nicht kritisch für den eigentlichen Vorgang.
  }
}
