/* QA-r5b user 2026-09-24: "homepage feels too static and rigid, no fade-in animation".
   Modern marketplaces (LinkedIn, Ashby, Rippling) fade+rise sections as the user scrolls them
   into view. This hook does that with one line at the call site: `const [ref, shown] = useReveal();`
   then `<section ref={ref} className={shown ? "reveal shown" : "reveal"}>`.

   Uses IntersectionObserver so it costs nothing until a section approaches the viewport, and
   honors prefers-reduced-motion by immediately marking every element as shown (no animation). */
import { useEffect, useRef, useState } from "react";

export function useReveal({ threshold = 0.15, once = true } = {}) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") { setShown(true); return; }
    // Respect reduced-motion: no animation at all.
    const mq = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq && mq.matches) { setShown(true); return; }
    if (typeof IntersectionObserver === "undefined") { setShown(true); return; }
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          setShown(true);
          if (once) obs.unobserve(e.target);
        } else if (!once) {
          setShown(false);
        }
      });
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, once]);
  return [ref, shown];
}
