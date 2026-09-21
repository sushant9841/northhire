/* NorthHire offline service worker.

   Strategy (see Priority-4 #8 in the Fix Tracker for the source ticket):
     - App shell (index.html, "/"): NetworkFirst. A new build must take over immediately, so we
       never let a stale shell win over the network - the version-banner (useVersionCheck) is the
       belt-and-braces path for the rare case a stale shell still slips through. Cache is only the
       offline fallback.
     - Hashed JS/CSS/font assets (Vite's /assets/* output): CacheFirst. Safe forever - a new build
       ships new filenames, it never overwrites an old hash in place.
     - Read-only public API GETs (/api/jobs, /api/employers, /api/content, /api/platform,
       marketing-ish reads): StaleWhileRevalidate with a short TTL, so a seeker can keep browsing
       offline but doesn't see arbitrarily stale listings once back online.
     - Everything under /api/auth, /api/hr, /api/staffing, /api/admin, /api/employers/me/*, and
       every POST/PATCH/DELETE anywhere: NetworkOnly, never cached. The one carve-out is the
       attendance punch endpoints, which get queued (not cached) so a punch made offline isn't
       silently lost - see the punch-queue section below.

   skipWaiting + clients.claim so a freshly installed worker takes over on the very next
   navigation instead of waiting for every tab to close. */

const SHELL_CACHE = "nh-shell-v1";
const ASSET_CACHE = "nh-assets-v1";
const API_CACHE = "nh-api-swr-v1";
const KNOWN_CACHES = [SHELL_CACHE, ASSET_CACHE, API_CACHE];

const API_SWR_TTL_MS = 5 * 60 * 1000; // 5 minutes - "short TTL" per spec
const API_SWR_TIME_HEADER = "sw-cached-at";

/* Read-only, public, safe-to-cache-briefly API paths. Matched by pathname prefix against the
   `/api` root regardless of which host the SPA is talking to (dev proxies to a different port). */
const SWR_API_PREFIXES = ["/api/jobs", "/api/employers", "/api/content", "/api/platform"];

/* Never cache, never queue anything else here - auth/mutation surfaces stay NetworkOnly. */
const NETWORK_ONLY_API_PREFIXES = [
  "/api/auth", "/api/hr", "/api/staffing", "/api/admin", "/api/billing",
  "/api/consent", "/api/api-keys", "/api/sso", "/api/integrations", "/api/users",
];

/* --- Offline punch queue (IndexedDB) --- */
const PUNCH_DB = "northhire-punch-queue";
const PUNCH_STORE = "queue";
const PUNCH_SYNC_TAG = "northhire-punch-sync";
/* Both the kiosk (shared-terminal) punch and the per-employee web punch-in/out are queued the
   same way - all three are idempotent-ish "did I clock in/out" actions, safe to replay once. */
const PUNCH_PATH_SUFFIXES = ["/hr/attendance/punch-in", "/hr/attendance/punch-out", "/hr/kiosk/punch"];

function isPunchRequest(url, method) {
  if (method !== "POST") return false;
  return PUNCH_PATH_SUFFIXES.some((suffix) => url.pathname.endsWith(suffix));
}

function openPunchDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(PUNCH_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PUNCH_STORE)) {
        db.createObjectStore(PUNCH_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function queuePunch(request) {
  const bodyText = await request.clone().text();
  const db = await openPunchDb();
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    url: request.url,
    method: request.method,
    body: bodyText,
    queuedAt: Date.now(),
  };
  await new Promise((resolve, reject) => {
    const tx = db.transaction(PUNCH_STORE, "readwrite");
    tx.objectStore(PUNCH_STORE).put(entry);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  if ("sync" in self.registration) {
    try { await self.registration.sync.register(PUNCH_SYNC_TAG); } catch { /* best-effort */ }
  }
  return entry;
}

async function listQueuedPunches() {
  const db = await openPunchDb();
  const all = await new Promise((resolve, reject) => {
    const tx = db.transaction(PUNCH_STORE, "readonly");
    const req = tx.objectStore(PUNCH_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return all;
}

async function removeQueuedPunch(id) {
  const db = await openPunchDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(PUNCH_STORE, "readwrite");
    tx.objectStore(PUNCH_STORE).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function replayQueuedPunches() {
  const queued = await listQueuedPunches();
  for (const entry of queued) {
    try {
      const res = await fetch(entry.url, {
        method: entry.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: entry.body,
      });
      if (res.ok) {
        await removeQueuedPunch(entry.id);
        const clients = await self.clients.matchAll({ type: "window" });
        for (const client of clients) {
          client.postMessage({ type: "northhire-punch-synced", id: entry.id, ok: true });
        }
      }
      // A non-ok response (e.g. "already punched in") is left queued for the user to resolve
      // in-app rather than silently dropped or retried forever.
    } catch {
      // Still offline - stop here, the next sync/online event will retry the rest.
      break;
    }
  }
}

function queuedResponse(entry) {
  return new Response(JSON.stringify({ queued: true, id: entry.id, queuedAt: entry.queuedAt }), {
    status: 202,
    headers: { "Content-Type": "application/json" },
  });
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => !KNOWN_CACHES.includes(n)).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener("sync", (event) => {
  if (event.tag === PUNCH_SYNC_TAG) event.waitUntil(replayQueuedPunches());
});

/* Fallback for browsers without Background Sync (Safari, Firefox): the page tells us when it
   comes back online and we replay right away instead of waiting for a sync event that never fires. */
self.addEventListener("message", (event) => {
  if (event.data?.type !== "northhire-replay-punches") return;
  event.waitUntil(replayQueuedPunches());
});

function isHashedAsset(url) {
  return url.pathname.startsWith("/assets/");
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error("offline and no cached shell");
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  if (fresh && fresh.ok) cache.put(request, fresh.clone());
  return fresh;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const revalidate = fetch(request).then((fresh) => {
    if (fresh && fresh.ok) {
      const stamped = new Response(fresh.clone().body, {
        status: fresh.status, statusText: fresh.statusText,
        headers: new Headers(fresh.headers),
      });
      stamped.headers.set(API_SWR_TIME_HEADER, String(Date.now()));
      cache.put(request, stamped);
    }
    return fresh;
  }).catch(() => null);

  if (cached) {
    const cachedAt = Number(cached.headers.get(API_SWR_TIME_HEADER) || 0);
    if (Date.now() - cachedAt < API_SWR_TTL_MS) return cached;
  }
  const fresh = await revalidate;
  if (fresh) return fresh;
  if (cached) return cached;
  throw new Error("offline and no cached response");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only ever handle GET/POST here; everything else (PUT/PATCH/DELETE) always goes straight to
  // the network untouched.
  if (request.method !== "GET" && request.method !== "POST") return;

  if (isPunchRequest(url, request.method)) {
    event.respondWith((async () => {
      try {
        return await fetch(request.clone());
      } catch {
        const entry = await queuePunch(request);
        return queuedResponse(entry);
      }
    })());
    return;
  }

  if (request.method !== "GET") return; // no other POSTs are ever cached or queued

  if (url.pathname.startsWith("/api/")) {
    const isNetworkOnly = NETWORK_ONLY_API_PREFIXES.some((p) => url.pathname.startsWith(p));
    if (isNetworkOnly) return; // let it hit the network untouched
    const isSwr = SWR_API_PREFIXES.some((p) => url.pathname.startsWith(p));
    if (isSwr) event.respondWith(staleWhileRevalidate(request, API_CACHE));
    return; // any other /api/ GET not explicitly listed: also untouched, safest default
  }

  if (isHashedAsset(url)) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  if (request.mode === "navigate" || url.pathname === "/" || url.pathname === "/index.html") {
    event.respondWith(networkFirst(request, SHELL_CACHE));
  }
});
