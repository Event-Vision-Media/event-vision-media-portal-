import "server-only";
import { TRAVEL, travelFor, type TravelInfo } from "@/lib/catalog";

// Entfernung (kürzeste Autostrecke, einfach) vom Firmensitz zur Location über
// OpenRouteService (https://openrouteservice.org, kostenloser Schlüssel in
// ORS_API_KEY). Ohne Schlüssel oder bei Fehlern: status "unknown" – dann
// prüft der Admin die Fahrtkosten von Hand.

// api.openrouteservice.org wird abgeschaltet – neue Adresse api.heigit.org
const HOST = process.env.ORS_API_URL || "https://api.heigit.org";
const GEOCODE_URL = `${HOST}/pelias/v1/search`;
const ROUTE_URL = `${HOST}/openrouteservice/v2/directions/driving-car`;
type Coord = [number, number]; // [lon, lat]

const geoCache = new Map<string, Coord | null>();
const kmCache = new Map<string, TravelInfo>();

async function geocode(text: string, key: string): Promise<Coord | null> {
  const q = text.trim().toLowerCase();
  if (geoCache.has(q)) return geoCache.get(q)!;
  const url = `${GEOCODE_URL}?${new URLSearchParams({ text, "boundary.country": "DE", size: "1" })}`;
  const res = await fetch(url, { headers: { Authorization: key }, signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`geocode_${res.status}`);
  const json = await res.json();
  const f = json?.features?.[0];
  // Nur ausreichend genaue Treffer (Adresse, Straße, Ort-Teil) – kein Bundesland o. Ä.
  const layer = f?.properties?.layer as string | undefined;
  const coord: Coord | null =
    f && layer && !["region", "macroregion", "country", "county"].includes(layer) ? (f.geometry.coordinates as Coord) : null;
  geoCache.set(q, coord);
  return coord;
}

async function drivingKm(from: Coord, to: Coord, key: string): Promise<number | null> {
  const res = await fetch(ROUTE_URL, {
    method: "POST",
    headers: { Authorization: key, "Content-Type": "application/json" },
    // kürzeste Strecke: "fastest" macht im Ruhrgebiet große Autobahn-Umwege
    body: JSON.stringify({ coordinates: [from, to], preference: "shortest" }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`route_${res.status}`);
  const json = await res.json();
  const m = json?.routes?.[0]?.summary?.distance;
  return typeof m === "number" ? m / 1000 : null;
}

/** Fahrtkosten für eine Location-Adresse (Freitext). */
export async function travelForAddress(address: string): Promise<TravelInfo> {
  const key = process.env.ORS_API_KEY;
  const text = address.trim();
  if (!key || text.length < 5) return travelFor(null);
  const cacheKey = text.toLowerCase();
  if (kmCache.has(cacheKey)) return kmCache.get(cacheKey)!;
  try {
    const [origin, dest] = await Promise.all([geocode(TRAVEL.origin, key), geocode(text, key)]);
    if (!origin || !dest) return travelFor(null);
    const info = travelFor(await drivingKm(origin, dest, key));
    kmCache.set(cacheKey, info);
    return info;
  } catch (err) {
    console.error("[distance]", err);
    return travelFor(null);
  }
}
