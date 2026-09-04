import express from "express";
import cors from "cors";
import "./db.js"; // ensures schema exists before any route touches it
import { authRouter } from "./routes/auth.js";
import { jobsRouter } from "./routes/jobs.js";
import { employersRouter } from "./routes/employers.js";
import { applicationsRouter } from "./routes/applications.js";

const app = express();
const PORT = process.env.PORT || 8787;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/employers", employersRouter);
app.use("/api/applications", applicationsRouter);

app.use((req, res) => res.status(404).json({ error: "Not found." }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

app.listen(PORT, () => {
  console.log(`NorthHire API listening on http://localhost:${PORT}`);
});
