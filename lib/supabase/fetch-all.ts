/**
 * Supabase liefert pro Abfrage höchstens 1.000 Zeilen (Server-Einstellung „max rows“) –
 * ein `.limit(100000)` hebt das NICHT auf, der Rest fehlt dann stillschweigend.
 * fetchAll holt seitenweise (je 1.000), bis alles da ist.
 *
 * Die Abfrage braucht eine eindeutige Sortierung (z. B. .order("id")), sonst können
 * Zeilen zwischen den Seiten doppelt vorkommen oder fehlen.
 *
 *   const rows = await fetchAll((from, to) => sb.from("funnel_events").select("id, step").order("id").range(from, to));
 */
export async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  opts: { pageSize?: number; max?: number } = {}
): Promise<T[]> {
  const size = opts.pageSize ?? 1000;
  const max = opts.max ?? 200_000;
  const out: T[] = [];
  for (let from = 0; from < max; from += size) {
    const { data, error } = await page(from, from + size - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < size) break;
  }
  return out;
}
