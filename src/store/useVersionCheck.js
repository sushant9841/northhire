import { useEffect, useState } from "react";
import { API_BASE } from "../helpers/api.js";

/* Version-check hook. Vite injects __BUILD_ID__ into the bundle at build time
   (vite.config.js), and the server's /api/version reports the id of the running
   process. When they diverge, the user is running an older frontend against a
   newer server - which is exactly when a shipped fix could look broken to them.
   The store surfaces a discreet toast that offers a one-click reload, so a user
   never has to be told to hard-refresh.

   Polls every 5 minutes, plus once on tab-focus (which is when a paused tab
   would otherwise linger on the old build indefinitely). The initial fetch also
   serves as the baseline in the pathological case where __BUILD_ID__ was never
   defined - we snapshot whatever the server currently says and only warn on
   later divergence. */
const POLL_MS = 5 * 60 * 1000;

export function useVersionCheck() {
  const [outdated, setOutdated] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    // QA-r5: in dev, Vite's frontend id and the server's git-rev id drift every time the
    // Node server restarts (a common dev workflow), producing a false "new version available"
    // banner on nearly every page load. HMR handles code updates in dev; this banner exists
    // purely for a shipped production user whose tab has been open across a real deploy.
    if (import.meta.env?.DEV) return;
    // Frontend's own build id. Undefined only in a broken build; in that case we
    // adopt whatever the server says on first fetch and only warn on later drift.
    // eslint-disable-next-line no-undef
    let baseline = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : null;
    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch(`${API_BASE}/version`, { credentials: "omit", cache: "no-store" });
        if (!res.ok) return;
        const { id } = await res.json();
        if (cancelled || !id) return;
        if (!baseline) { baseline = id; return; }
        if (id !== baseline) setOutdated(true);
      } catch { /* offline or server bounced - try again next tick */ }
    };

    check();
    const timer = setInterval(check, POLL_MS);
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return outdated;
}
