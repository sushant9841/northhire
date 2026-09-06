/* Free, open-source geocoding via OpenStreetMap's Nominatim - no API key, no account. Its usage
   policy requires a real User-Agent identifying the app and caps requests at roughly 1/second, so
   this enforces both: a process-wide gate serializes calls at least 1.1s apart, and results are
   cached in-memory by normalized query so repeat lookups (the same city appearing on many job
   postings) never re-hit the service at all. Never called client-side directly - the browser has
   no way to set a custom User-Agent, and a client-side cache wouldn't be shared across visitors. */
const cache = new Map();
let lastCallAt = 0;
const MIN_INTERVAL_MS = 1100;

async function throttle() {
  const wait = MIN_INTERVAL_MS - (Date.now() - lastCallAt);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastCallAt = Date.now();
}

export async function geocode(query) {
  const key = (query || "").trim().toLowerCase();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key);
  try {
    await throttle();
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ca&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { "User-Agent": "NorthHire-demo-app/1.0 (contact: no-reply@northhire.ca)" } });
    if (!res.ok) throw new Error(`Nominatim returned ${res.status}`);
    const rows = await res.json();
    const result = rows[0] ? { lat: Number(rows[0].lat), lng: Number(rows[0].lon), displayName: rows[0].display_name } : null;
    cache.set(key, result);
    return result;
  } catch (e) {
    console.warn(`[geocode] lookup failed for "${query}": ${e.message}`);
    return null;
  }
}

export { haversineKm } from "../src/helpers/geo.js";
