// Loads .env into process.env before anything below reads it (OAuth/Stripe/Turnstile keys).
// Node's native loader (stable since v22, no dependency needed) - silently a no-op if .env
// doesn't exist, since every feature that reads one of these vars already degrades gracefully
// (see oauth.js's isConfigured(), stripe.js, turnstile.js).
try { process.loadEnvFile(); } catch { /* no .env file - fine, real features gate on their own vars being set */ }

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { db, nextId } from "./db.js"; // also ensures schema exists before any route touches it
import { authRouter } from "./routes/auth.js";
import { jobsRouter } from "./routes/jobs.js";
import { employersRouter } from "./routes/employers.js";
import { applicationsRouter } from "./routes/applications.js";
import { usersRouter } from "./routes/users.js";
import { contentRouter } from "./routes/content.js";
import { seekerMiscRouter } from "./routes/seekerMisc.js";
import { platformRouter } from "./routes/platform.js";
import { hrRouter } from "./routes/hr.js";
import { staffingRouter } from "./routes/staffing.js";
import { billingRouter } from "./routes/billing.js";
import { consentRouter } from "./routes/consent.js";
import { publicApiRouter, apiAdminRouter } from "./routes/publicApi.js";
import { ssoRouter } from "./routes/sso.js";
import { offersRouter } from "./routes/offers.js";
import { eventsRouter } from "./routes/events.js";
import { infinityReplacer } from "../src/helpers/jsonInfinity.js";
import { execSync } from "node:child_process";

/* Build identity for this server process. Client checks this against its own __BUILD_ID__
   (defined at frontend build time - see vite.config.js) and shows a discreet refresh banner
   when they diverge, so a shipped fix never depends on the user knowing to hard-refresh. */
const BUILD_ID = process.env.BUILD_ID
  || (() => { try { return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { return `srv-${Date.now()}`; } })();

const app = express();
const PORT = process.env.PORT || 8787;
// Every res.json() call in this app goes through this replacer, so a real Infinity (an
// "unlimited" plan quota, an open-ended tax bracket) survives the trip to the client instead of
// silently becoming null - see src/helpers/jsonInfinity.js and the matching reviver in api.js.
app.set("json replacer", infinityReplacer);

// Real ops-health signal (AdmHome "System health" card) - logs every 5xx response. Registered
// before any other middleware so res.on("finish") is attached even for a request that errors out
// inside CORS/cookie/body-parsing itself, not just ones that make it into an actual route handler.
// CORS-preflight (OPTIONS) rejections are not logged: a browser probing a disallowed origin is a
// policy signal, not a service error, and floods the metric with lookups that are supposed to be
// silently blocked. The CORS middleware is also switched to a graceful (non-throwing) rejection
// below so those preflights complete with 200 (missing CORS headers means the browser blocks the
// real call, which is the correct outcome) instead of a spurious 500 in the first place.
app.use((req, res, next) => {
  res.on("finish", () => {
    if (res.statusCode >= 500 && req.method !== "OPTIONS") {
      db.prepare("INSERT INTO server_errors (id, method, path, status, message) VALUES (?,?,?,?,?)")
        .run(nextId("errlog", "server_errors"), req.method, req.path, res.statusCode, res.locals._errMessage || null);
    }
  });
  next();
});

// Session lives in an httpOnly cookie, not anything the frontend can read/write itself (no
// localStorage/sessionStorage token anywhere) - `credentials: true` + an explicit origin
// allowlist (never "*", and never reflecting an arbitrary caller's Origin back) is what's
// required for a cross-origin cookie to be sent/accepted at all without also letting any
// website ride a visitor's session. Defaults cover the Vite dev server; a real deployment sets
// ALLOWED_ORIGINS to its actual frontend origin(s), comma-separated.
const DEFAULT_DEV_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"];
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
  : DEFAULT_DEV_ORIGINS;
// Dev-only: accept private-network LAN origins on the Vite port so a phone/tablet on the same
// wifi can hit the dev server via the machine's LAN IP without ALLOWED_ORIGINS gymnastics.
// Production runs with ALLOWED_ORIGINS set explicitly, so this branch never applies there.
const DEV_LAN_RE = /^http:\/\/(?:10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+):(?:5173|5174)$/;
const isDevLanOrigin = (o) => process.env.NODE_ENV !== "production" && DEV_LAN_RE.test(o);
app.use(cors({
  origin: (origin, cb) => {
    // No Origin header at all means a same-origin or non-browser caller (curl, server-to-server) -
    // only cross-origin browser requests carry one, and those are the ones this allowlist gates.
    // A disallowed origin gets `cb(null, false)` (graceful reject: response omits the CORS headers,
    // so the browser refuses the real call and the preflight still returns 2xx) instead of
    // `cb(new Error(...))` which would trigger a spurious 500 that both misleads the browser and
    // pollutes the ops-health metric with what is really a policy decision, not a service error.
    if (!origin || allowedOrigins.includes(origin) || isDevLanOrigin(origin)) return cb(null, true);
    cb(null, false);
  },
  credentials: true,
}));
app.use(cookieParser());
/* express.json defaults to a 100kb body cap, which silently broke every document upload in the
   app: HR employee documents advertised a 3 MB limit and returned a generic 500 for anything
   over ~73 kB of real content, because the parser rejected the request before the route's own
   size check ever ran. The limit here sits above the upload ceiling (server/uploads.js) so the
   app's own validation - which returns a clear 413 - is what actually rejects an oversized file. */
app.use(express.json({ limit: "6mb" }));

// Baseline security headers - no helmet dependency needed for a handful of static values.
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  /* SPA HTML shell must never be cached: Vite hashes JS/CSS filenames so those are
     safe to cache forever, but index.html is the pointer to whichever hashed script
     the client should load. A cached index.html pins the user to an old build even
     after we ship - the whole point of the version banner is defeated if the shell
     never re-fetches. Applied to any path that looks like an HTML document; the
     JSON API responses each carry their own cache posture. */
  const p = req.path || "";
  if (p === "/" || p.endsWith(".html") || (!p.startsWith("/api") && !/\.[a-z0-9]{2,5}$/i.test(p))) {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  }
  next();
});

app.get("/api/health", (req, res) => res.json({ ok: true }));
/* Public - no auth needed. The client polls this every few minutes and after every route
   change, so gating it behind a session would break the version-banner for a signed-out
   viewer sitting on a marketing page when we ship a fix. Always no-store so a CDN never
   caches yesterday's id. */
app.get("/api/version", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({ id: BUILD_ID });
});
app.use("/api/auth", authRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/employers", employersRouter);
app.use("/api/applications", applicationsRouter);
app.use("/api/users", usersRouter);
app.use("/api/content", contentRouter);
app.use("/api/seeker", seekerMiscRouter);
app.use("/api/platform", platformRouter);
app.use("/api/hr", hrRouter);
app.use("/api/staffing", staffingRouter);
app.use("/api/billing", billingRouter);
app.use("/api/consent", consentRouter);
// Enterprise API: /api/v1 is key-authenticated for customers integration code; /api/api-keys is
// session-authenticated and manages the keys themselves.
app.use("/api/v1", publicApiRouter);
app.use("/api/api-keys", apiAdminRouter);
app.use("/api/sso", ssoRouter);
app.use("/api/offers", offersRouter);
app.use("/api/events", eventsRouter);

app.use((req, res) => res.status(404).json({ error: "Not found." }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  res.locals._errMessage = err?.message || String(err);
  // A body that overruns the parser's cap is a client-side mistake, not a server fault - saying
  // so plainly beats logging a stack trace and returning "something went wrong".
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ error: "That upload is too large. Please use a file under 3 MB." });
  }
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Malformed JSON in the request body." });
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

app.listen(PORT, () => {
  console.log(`NorthHire API listening on http://localhost:${PORT}`);
});
