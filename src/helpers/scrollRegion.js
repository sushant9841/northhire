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

export function useStickyNavScroll(key) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const saved = navScrollMemory.get(key);
    if (saved) el.scrollTop = saved;
    const onScroll = () => navScrollMemory.set(key, el.scrollTop);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      /* Capture one last time on unmount - the final scroll event may not have fired. */
      navScrollMemory.set(key, el.scrollTop);
      el.removeEventListener("scroll", onScroll);
    };
  }, [key]);
  return ref;
}
