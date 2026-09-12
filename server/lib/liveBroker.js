/* Server-Sent Events broker for NorthHire live-sync.
   In-memory map of {userId → Set<res>} — each authenticated /api/events subscriber
   keeps its HTTP response open, and mutating routes call emit(userId, type, payload)
   to push a JSON event to every session that user has open on any device.

   No persistence: a client that reconnects after a drop refetches (via the reconnect
   handshake in useLiveSync.js on the frontend). No queueing between disconnects — this
   is a UI-freshness signal, not a durable message log.

   Gated behind NORTHHIRE_LIVESYNC !== "off" — a deployment can flip it off if a
   reverse proxy doesn't cope with long-lived HTTP responses (e.g., some CDNs). */

const isEnabled = () => process.env.NORTHHIRE_LIVESYNC !== "off";

/** userId → Set<express.Response> */
const subs = new Map();

export function subscribe(userId, res) {
  if (!isEnabled() || !userId || !res) return;
  let set = subs.get(userId);
  if (!set) { set = new Set(); subs.set(userId, set); }
  set.add(res);
}

export function unsubscribe(userId, res) {
  const set = subs.get(userId);
  if (!set) return;
  set.delete(res);
  if (!set.size) subs.delete(userId);
}

function writeEvent(res, type, payload) {
  try {
    res.write(`event: ${type}\n`);
    res.write(`data: ${JSON.stringify(payload ?? {})}\n\n`);
  } catch { /* client gone — the finish/close handler on the response will unsub */ }
}

/** Push {type,payload} to every open connection this user has, if any. Safe to call
    even when nobody is subscribed — becomes a no-op. */
export function emit(userId, type, payload) {
  if (!isEnabled() || !userId) return;
  const set = subs.get(userId);
  if (!set || !set.size) return;
  for (const res of set) writeEvent(res, type, payload);
}

/** Push to every open connection regardless of user — used sparingly for platform-wide
    events like a maintenance-mode toggle. Not used yet, wired for future need. */
export function broadcast(type, payload) {
  if (!isEnabled()) return;
  for (const set of subs.values()) for (const res of set) writeEvent(res, type, payload);
}

/** Multi-recipient convenience — routes that emit to both parties of a two-sided
    interaction (employer + candidate, HR + employee) can list both ids in one call. */
export function emitMany(userIds, type, payload) {
  if (!Array.isArray(userIds)) return;
  for (const id of userIds) emit(id, type, payload);
}

export function stats() {
  let total = 0;
  for (const set of subs.values()) total += set.size;
  return { users: subs.size, connections: total, enabled: isEnabled() };
}
