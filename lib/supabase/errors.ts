/** Postgres-Fehlercode für Unique-Constraint-Verletzungen. */
export function isUniqueViolation(error: { code?: string } | null | undefined): boolean {
  return error?.code === "23505";
}
