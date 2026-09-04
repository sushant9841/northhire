import { Router } from "express";
import { db } from "../db.js";
import { serializeEmployer } from "../serialize.js";

export const employersRouter = Router();

employersRouter.get("/", (req, res) => {
  const rows = db.prepare("SELECT * FROM employers ORDER BY name").all();
  res.json({ employers: rows.map(serializeEmployer) });
});

employersRouter.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM employers WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Employer not found." });
  res.json({ employer: serializeEmployer(row) });
});
