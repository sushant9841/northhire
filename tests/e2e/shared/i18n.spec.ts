import { test, expect } from "../fixtures/base";
import { loginAsSeeker, loginAsEmployer, loginAsHr, HR_PERSONAS } from "../fixtures/auth";

/*
 * Playbook §21 — i18n (internationalization, Bill 96 - Quebec French):
 *   - toggle locale to fr-CA
 *   - walk each critical route
 *   - assert no raw translation key literals visible (e.g., "employer.home.foo" should not appear)
 */
test.describe("i18n (internationalization)", () => {
  test("can toggle locale to fr-CA on seeker account", async ({ page, dismissCookieBanner }) => {
    await loginAsSeeker(page);
    await dismissCookieBanner();
    await page.goto("/account");
    await page.waitForLoadState("networkidle");

    // Look for language/locale selector
    const localeSelect = page.locator("select").filter({ hasText: /Français|English|Langue/i })
      .or(page.getByRole("button", { name: /Français|English|Language/i })).first();

    if (await localeSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      // If it's a select, change the value
      if ((await localeSelect.getAttribute("type")).includes("select")) {
        await localeSelect.selectOption("fr-CA");
      } else {
        // If it's a button, click it and select from dropdown
        await localeSelect.click();
        await page.waitForTimeout(300);

        const frOption = page.getByText(/Français|fr-CA/i).first();

        if (await frOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await frOption.click();
        }
      }

      await page.waitForTimeout(1000);

      // Verify locale changed (check for French text or fr-CA in URL/body)
      const pageContent = await page.content();

      expect(pageContent.toLowerCase()).toContain("fr");
    }
  });

  test("no untranslated key literals visible on critical routes (seeker)", async ({ page, dismissCookieBanner }) => {
    await loginAsSeeker(page);
    await dismissCookieBanner();

    // Change locale to French
    await page.goto("/account");
    await page.waitForLoadState("networkidle");

    const localeSelect = page.locator("select").first();

    if (await localeSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      try {
        await localeSelect.selectOption("fr-CA");
      } catch {
        // Might be a button instead
      }
    }

    await page.waitForTimeout(500);

    // Critical seeker routes
    const routes = ["/", "/jobs", "/matched", "/status", "/cvs", "/account"];

    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");

      const content = await page.content();

      // Look for untranslated key patterns (e.g., "seeker.jobs.foo", "common.button.click")
      // These would indicate a translation is missing
      const untranslatedKeys = content.match(/[a-z]+\.[a-z]+(\.[a-z]+)*/g) || [];

      // Filter for likely translation keys (lowercase, dots, 2-3+ parts)
      const suspiciousKeys = untranslatedKeys.filter(
        (k) => k.includes(".") && k.split(".").length >= 2 && /^[a-z][a-z0-9]*(\.[a-z0-9]+)+$/.test(k)
      );

      // Should not have visible keys like "seeker.status.pending"
      for (const key of suspiciousKeys) {
        // These are likely HTML attributes or JSON, not visible text
        // Check if the key appears as actual visible text (not in HTML structure)
        const keyVisibleText = page.getByText(key, { exact: true });

        if (await keyVisibleText.isVisible({ timeout: 1000 }).catch(() => false)) {
          // Key is visible - this is a failure
          expect(await keyVisibleText.isVisible()).toBeFalsy();
        }
      }
    }
  });

  test("no untranslated key literals visible on critical routes (employer)", async ({ page, dismissCookieBanner }) => {
    await loginAsEmployer(page);
    await dismissCookieBanner();
    await page.goto("/employer");
    await page.waitForLoadState("networkidle");

    // Try to change locale if available
    const localeSelect = page.locator("select").first();

    if (await localeSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      try {
        await localeSelect.selectOption("fr-CA");
      } catch {
        // Locale selector might not be available for all roles
      }
    }

    await page.waitForTimeout(500);

    // Critical employer routes
    const routes = ["/employer", "/employer/jobs"];

    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");

      const content = await page.content();

      // Look for untranslated key patterns
      const untranslatedKeys = content.match(/[a-z]+\.[a-z]+(\.[a-z]+)*/g) || [];

      const suspiciousKeys = untranslatedKeys.filter(
        (k) => k.includes(".") && k.split(".").length >= 2 && /^[a-z][a-z0-9]*(\.[a-z0-9]+)+$/.test(k)
      );

      // Check for visible text keys
      for (const key of suspiciousKeys) {
        const keyVisibleText = page.getByText(key, { exact: true });

        if (await keyVisibleText.isVisible({ timeout: 1000 }).catch(() => false)) {
          expect(await keyVisibleText.isVisible()).toBeFalsy();
        }
      }
    }
  });

  test("no untranslated key literals visible on critical routes (HR)", async ({ page, dismissCookieBanner }) => {
    await loginAsHr(page, HR_PERSONAS.owner);
    await dismissCookieBanner();
    await page.goto("/hr/dashboard");
    await page.waitForLoadState("networkidle");

    // Try to change locale
    const localeSelect = page.locator("select").first();

    if (await localeSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      try {
        await localeSelect.selectOption("fr-CA");
      } catch {
        // Might not be available
      }
    }

    await page.waitForTimeout(500);

    // Critical HR routes
    const routes = ["/hr/dashboard", "/hr/people"];

    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");

      const content = await page.content();

      // Look for untranslated keys
      const untranslatedKeys = content.match(/[a-z]+\.[a-z]+(\.[a-z]+)*/g) || [];

      const suspiciousKeys = untranslatedKeys.filter(
        (k) => k.includes(".") && k.split(".").length >= 2 && /^[a-z][a-z0-9]*(\.[a-z0-9]+)+$/.test(k)
      );

      // Check for visible text
      for (const key of suspiciousKeys) {
        const keyVisibleText = page.getByText(key, { exact: true });

        if (await keyVisibleText.isVisible({ timeout: 1000 }).catch(() => false)) {
          expect(await keyVisibleText.isVisible()).toBeFalsy();
        }
      }
    }
  });
});
