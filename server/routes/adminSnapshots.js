import { Router } from "express";
import { db } from "../db.js";
import { requireAuth, requireAdminScope } from "../auth.js";
import { SNAPSHOT_METRICS } from "../snapshots.js";
import { refreshSilverMedalistMatches } from "../lib/silverMedalist.js";

export const adminSnapshotsRouter = Router();

/* Platform-wide view of daily_snapshots - every metric/dimension, not just one employer's own.
   Finance/support scopes can already see revenue/ops numbers elsewhere in the admin console, so
   they're allowed here too; a plain "readonly" admin also passes since this is a GET. */
adminSnapshotsRouter.get("/snapshots", requireAuth, requireAdminScope("finance", "support"), (req, res) => {
  const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
  const metric = req.query.metric;
  if (metric && !SNAPSHOT_METRICS.includes(metric)) return res.status(400).json({ error: "Unknown metric." });
  const rows = db.prepare(
    `SELECT date, metric, dimension, value FROM daily_snapshots
     WHERE date >= date('now', ?) ${metric ? "AND metric = ?" : ""}
     ORDER BY date ASC`
  ).all(...(metric ? [`-${days} days`, metric] : [`-${days} days`]));
  res.json({ days, snapshots: rows });
});

/* Priority-4 #6 - callable for admin/tests: the weekly batch also runs on boot and every 7 days
   (server/index.js), but a test run (or an impatient admin) shouldn't have to wait a week or
   restart the server to see it recompute. */
adminSnapshotsRouter.post("/silver-medalist-matches/refresh", requireAuth, requireAdminScope(), (req, res) => {
  const result = refreshSilverMedalistMatches();
  res.json(result);
});
