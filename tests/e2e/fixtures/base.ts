import { test as base, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/*
 * Shared test base for the whole suite:
 *  - every spec fails on any uncaught client-side error (page.on("pageerror")), per the
 *    playbook's "each test file uses page.on(pageerror) to fail on any uncaught error" rule.
 *  - the cookie-consent banner ("We use cookies for sign-in, saved jobs and analytics… Got it")
 *    is fixed to the viewport and, on the 390×844 mobile project, physically overlaps controls
 *    lower on short pages (e.g. the "Sign out" button on /account) — it intercepts the click and
 *    Playwright's actionability wait times out rather than erroring immediately. dismissCookieBanner
 *    is exposed so specs can clear it deterministically instead of guessing at z-index/position.
 */
export const test = base.extend<{ dismissCookieBanner: () => Promise<void> }>({
  page: async ({ page }, use) => {
    const errors: Error[] = [];
    page.on("pageerror", (err) => errors.push(err));
    await use(page);
    if (errors.length) throw errors[0];
  },
  dismissCookieBanner: async ({ page }, use) => {
    await use(async () => {
      const gotIt = page.getByRole("button", { name: "Got it" });
      try {
        if (await gotIt.isVisible({ timeout: 1500 })) await gotIt.click();
      } catch {
        /* banner never appeared (already dismissed this session, or not a cookie-eligible page) */
      }
    });
  },
});

export { expect };
export type { Page };
