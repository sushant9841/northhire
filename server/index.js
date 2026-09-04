import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import "./db.js"; // ensures schema exists before any route touches it
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

const app = express();
const PORT = process.env.PORT || 8787;

// Session lives in an httpOnly cookie, not anything the frontend can read/write itself (no
// localStorage/sessionStorage token anywhere) - `credentials: true` + reflecting the request's
// own origin (rather than "*") is required for a cross-origin cookie to be sent/accepted at all.
app.use(cors({ origin: (origin, cb) => cb(null, origin || true), credentials: true }));
app.use(cookieParser());
app.use(express.json());

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

app.use((req, res) => res.status(404).json({ error: "Not found." }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

app.listen(PORT, () => {
  console.log(`NorthHire API listening on http://localhost:${PORT}`);
});
