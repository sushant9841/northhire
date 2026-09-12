/* Server-side in-app notification helper. Every call both PERSISTS a row (so the recipient
   still sees it after a refresh, on a different device, or if they weren't online when it
   happened) and pushes it live via SSE to any open tab that user has (so it shows up instantly
   without a refresh). This is the single source of truth for "notification bell" content —
   client code should never synthesize a notification object locally, only render what this
   produced (see useStore.js's "notification:new" handler, which just appends the payload).

   Before this existed, several client actions (sendMessage, scheduleInterview, the SSE handlers
   in useStore.js) called the client-only `notify()` helper with `for: someOtherUserId` - that
   only ever touched the ACTING user's own browser state, so it silently never reached the other
   party at all except when that party's own tab happened to independently react to the same SSE
   event. Real cross-user/cross-device notifications require a server-persisted row. */
import { db, nextId } from "../db.js";
import { emit as liveEmit } from "./liveBroker.js";
import { serializeNotification } from "../serialize.js";

/** Creates and persists a notification for one user, then pushes it live to their open tabs.
    `for_` (userId) is required - platform-wide/broadcast notifications still go through the
    existing raw INSERT + broadcast() pattern used in staffing.js, since those aren't per-user. */
export function pushNotification({ for: for_, icon, title, body, link }) {
  if (!for_) return null;
  const id = nextId("nfy", "notifications");
  db.prepare("INSERT INTO notifications (id, for_value, icon, title, body, link) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, for_, icon || null, title || "", body || "", link || null);
  const row = db.prepare("SELECT * FROM notifications WHERE id = ?").get(id);
  const notif = serializeNotification(row);
  liveEmit(for_, "notification:new", notif);
  return notif;
}
