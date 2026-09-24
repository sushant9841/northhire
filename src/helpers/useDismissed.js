/* QA-r4 tail: shared dismissable-once state so a banner doesn't re-appear on refresh.
   Returns [dismissed, dismiss()]. The dismissed flag is persisted to localStorage under a
   namespaced key (`nh:dismiss:<key>`) — pass a scope-specific key like `hire-modal:v2`. Bumping
   the version segment invalidates old dismissals when the banner content materially changes.
   All localStorage reads/writes are try/wrapped since Safari private mode + old iOS can throw. */
import { useState, useCallback } from "react";

const NS = "nh:dismiss:";

export function useDismissed(key) {
  const storeKey = NS + key;
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return window.localStorage.getItem(storeKey) === "1"; }
    catch { return false; }
  });
  const dismiss = useCallback(() => {
    setDismissed(true);
    try { window.localStorage.setItem(storeKey, "1"); } catch { /* best-effort */ }
  }, [storeKey]);
  return [dismissed, dismiss];
}

/* Rare — clears a dismissal (e.g. Settings > "Restore dismissed tips"). */
export function resetDismissed(key) {
  try { window.localStorage.removeItem(NS + key); } catch { /* ignore */ }
}
