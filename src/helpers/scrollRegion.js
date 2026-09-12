import { useEffect, useRef } from "react";

/* Navigation scroll behaviour, in one place.

   Two separate problems were being solved by one blunt `window.scrollTo(0,0)` in go():

   1. The main content area should start at the top on a real navigation. But dashboard shells put
      their content in <main data-scroll-region>, and a filter change that only rewrites the query
      string is not a navigation - snapping the reader back to the top of a results list because
      they ticked a facet is the defect, not the fix. resetContentScroll() therefore scrolls the
      marked content region (falling back to the window when the region is not its own scroller),
      and go() only calls it when the PATH actually changed.

   2. The left nav is an independently scrollable <nav>. Window scrolling never touches it, but a
      shell remount (role switch, mobile drawer toggle, an auth round-trip re-rendering the tree)
      drops its scrollTop to 0 and the visitor loses their place in a long module list.
      useStickyNavScroll() remembers it per shell and restores it, so it survives remounts too. */

const CONTENT_REGION = "[data-scroll-region]";

export function resetContentScroll() {
  if (typeof document === "undefined") return;
  const region = document.querySelector(CONTENT_REGION);
  /* scrollHeight > clientHeight means the region is genuinely its own scroller; otherwise the
     document is what moved and the region's scrollTop is a no-op. */
  if (region && region.scrollHeight > region.clientHeight + 1) {
    region.scrollTop = 0;
    return;
  }
  window.scrollTo?.(0, 0);
}

/* Path-only comparison: "/jobs?page=3" and "/jobs?page=4" are the same page. */
export function isSamePath(a, b) {
  const strip = (u) => String(u || "").split("?")[0].split("#")[0];
  return strip(a) === strip(b);
}

const navScrollMemory = new Map();

/* Keeps the sidebar nav scrolled such that the active item is always visible. Two behaviours
   in one hook:

   1. Remount preservation: sets scrollTop from the memory Map on mount, saves on scroll,
      re-saves on unmount - so a shell remount doesn't drop the reader's place.
   2. Active-item follow: whenever `activeKey` changes, if the active `<button data-nav-key={key}>`
      is not currently in the visible area of the nav, scroll it into view. This is what fixes
      the "I navigated to Post a job and now the sidebar is showing Dashboard at the top — I
      have to scroll down to see where I am" case, which reads as "the sidebar didn't remember
      my scroll" even though technically it did. Uses nearest-block scroll so it never overshoots
      and never scrolls the outer document. */
export function useStickyNavScroll(key, activeKey) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const saved = navScrollMemory.get(key);
    if (saved) el.scrollTop = saved;
    const onScroll = () => navScrollMemory.set(key, el.scrollTop);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      navScrollMemory.set(key, el.scrollTop);
      el.removeEventListener("scroll", onScroll);
    };
  }, [key]);
  useEffect(() => {
    const el = ref.current;
    if (!el || !activeKey) return;
    const btn = el.querySelector(`[data-nav-key="${CSS.escape(String(activeKey))}"]`);
    if (!btn) return;
    const br = btn.getBoundingClientRect();
    const nr = el.getBoundingClientRect();
    /* Only scroll if the active button is outside the visible viewport of the nav — avoids
       fighting the user who may have deliberately scrolled elsewhere on the same page. */
    if (br.top < nr.top || br.bottom > nr.bottom) {
      btn.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeKey]);
  return ref;
}
