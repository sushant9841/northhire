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
import { infinityReplacer } from "../src/helpers/jsonInfinity.js";

const app = express();
const PORT = process.env.PORT || 8787;
// Every res.json() call in this app goes through this replacer, so a real Infinity (an
// "unlimited" plan quota, an open-ended tax bracket) survives the trip to the client instead of
// silently becoming null - see src/helpers/jsonInfinity.js and the matching reviver in api.js.
app.set("json replacer", infinityReplacer);

// Real ops-health signal (AdmHome "System health" card) - logs every 5xx response. Registered
// before any other middleware so res.on("finish") is attached even for a request that errors out
// inside CORS/cookie/body-parsing itself, not just ones that make it into an actual route handler.
app.use((req, res, next) => {
  res.on("finish", () => {
    if (res.statusCode >= 500) {
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
app.use(cors({
  origin: (origin, cb) => {
    // No Origin header at all means a same-origin or non-browser caller (curl, server-to-server) -
    // only cross-origin browser requests carry one, and those are the ones this allowlist gates.
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

// Baseline security headers - no helmet dependency needed for a handful of static values.
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

app.get("/api/health", (req, res) => res.json({ ok: true }));
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

app.use((req, res) => res.status(404).json({ error: "Not found." }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.locals._errMessage = err?.message || String(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

app.listen(PORT, () => {
  console.log(`NorthHire API listening on http://localhost:${PORT}`);
});
