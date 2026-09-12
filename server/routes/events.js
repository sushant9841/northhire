import { Router } from "express";
import { requireAuth } from "../auth.js";
import { subscribe, unsubscribe, stats } from "../lib/liveBroker.js";

export const eventsRouter = Router();

/* SSE stream. One long-lived response per browser tab; the broker fans mutation events
   into it. Reads its subject from the same session cookie as the rest of the API — no
   auth token in a query string, so the URL is safe to log. */
eventsRouter.get("/", requireAuth, (req, res) => {
  if (process.env.NORTHHIRE_LIVESYNC === "off") return res.status(503).json({ error: "Live sync disabled." });

  // Node's default 2-minute socket timeout would kill the stream. 0 = no timeout.
  req.socket.setTimeout?.(0);
  req.socket.setNoDelay?.(true);
  req.socket.setKeepAlive?.(true);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable nginx response buffering if fronted by one
  res.flushHeaders?.();

  // Say hello so the client knows it's connected.
  res.write(`event: hello\ndata: ${JSON.stringify({ at: Date.now(), userId: req.user.id })}\n\n`);

  subscribe(req.user.id, res);

  // Keep-alive comment every 15s. Proxies commonly close idle streams after 30-60s.
  const ping = setInterval(() => {
    try { res.write(": ping\n\n"); } catch { /* handler below will clean up */ }
  }, 15_000);

  const cleanup = () => {
    clearInterval(ping);
    unsubscribe(req.user.id, res);
  };
  req.on("close", cleanup);
  res.on("close", cleanup);
  res.on("error", cleanup);
});

/* Small ops signal — admin can hit this to see how many streams are open. */
eventsRouter.get("/stats", requireAuth, (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admins only." });
  res.json(stats());
});
