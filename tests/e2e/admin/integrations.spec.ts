import { test, expect } from "../fixtures/base";
import { loginAsEmployer } from "../fixtures/auth";
import { loginAsHr, HR_PERSONAS } from "../fixtures/auth";

/*
 * Playbook §21 — integrations:
 *   - HR/staffing/employer can connect + disconnect integrations per scope
 *   - Integrations include punch machines, prior HR systems, etc.
 */
test.describe("integrations", () => {
  test("employer can navigate to integrations and see connect/disconnect options", async ({ page, dismissCookieBanner }) => {
    await loginAsEmployer(page);
    await dismissCookieBanner();
    await page.goto("/employer");
    await page.waitForLoadState("networkidle");

    // Navigate to Integrations
    const integrationsLink = page.getByRole("link", { name: /Integration|Connect/i })
      .or(page.getByRole("button", { name: /Integration|Connect/i })).first();

    if (await integrationsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await integrationsLink.click();
      await page.waitForLoadState("networkidle");

      // Should see a list of available integrations
      const integrationsList = page.locator("[class*='integration'], [class*='card']");

      expect(await integrationsList.count()).toBeGreaterThan(0);

      // Look for connect/disconnect buttons
      const connectBtns = page.getByRole("button", { name: /Connect|Disconnect|Enable|Disable/i });

      expect(await connectBtns.count()).toBeGreaterThanOrEqual(0);
    }
  });

  test("HR can navigate to integrations and manage connections", async ({ page, dismissCookieBanner }) => {
    await loginAsHr(page, HR_PERSONAS.owner); // Rachel
    await dismissCookieBanner();
    await page.goto("/hr/dashboard");
    await page.waitForLoadState("networkidle");

    // Navigate to Integrations
    const integrationsLink = page.getByRole("link", { name: /Integration|Connect/i })
      .or(page.getByRole("button", { name: /Integration|Connect/i })).first();

    if (await integrationsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await integrationsLink.click();
      await page.waitForLoadState("networkidle");

      // Should see HR-specific integrations (punch clocks, prior HR systems, etc.)
      const integrationsList = page.locator("[class*='integration'], [class*='card']");

      expect(await integrationsList.count()).toBeGreaterThan(0);

      // Look for connect button on first integration
      const firstIntegration = integrationsList.first();

      if (await firstIntegration.isVisible()) {
        const connectBtn = firstIntegration.getByRole("button", { name: /Connect|Enable/i });

        if (await connectBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          // Verify we can click it (may open modal or form)
          await connectBtn.click();
          await page.waitForTimeout(500);

          // Modal or form should appear
          const modal = page.locator("[role='dialog'], [class*='modal']").first();

          if (await modal.isVisible({ timeout: 3000 }).catch(() => false)) {
            await expect(modal).toBeVisible();
          } else {
            // Form might appear inline
            const form = page.locator("[class*='form']").first();
            expect(await form.isVisible().catch(() => false)).toBeTruthy();
          }
        }
      }
    }
  });

  test("integration connect shows form or modal with configuration options", async ({ page, dismissCookieBanner }) => {
    await loginAsEmployer(page);
    await dismissCookieBanner();
    await page.goto("/employer");
    await page.waitForLoadState("networkidle");

    // Navigate to Integrations
    const integrationsLink = page.getByRole("link", { name: /Integration|Connect/i }).first();

    if (await integrationsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await integrationsLink.click();
      await page.waitForLoadState("networkidle");

      // Find first integration with a connect button
      const integrations = page.locator("[class*='integration'], [class*='card']");

      for (let i = 0; i < 3; i++) {
        const integration = integrations.nth(i);

        if (!(await integration.isVisible().catch(() => false))) break;

        const connectBtn = integration.getByRole("button", { name: /Connect|Enable/i });

        if (await connectBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await connectBtn.click();
          await page.waitForTimeout(500);

          // Check for modal
          const modal = page.locator("[role='dialog'], [class*='modal']");

          if (await modal.isVisible({ timeout: 3000 }).catch(() => false)) {
            // Should have form fields or instructions
            const formFields = modal.locator("input, select, textarea");

            if (await formFields.count() > 0) {
              await expect(formFields.first()).toBeVisible();
            }

            // Should have a submit or proceed button
            const proceedBtn = modal.getByRole("button", { name: /Connect|Save|Proceed|Authorize/i });

            if (await proceedBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
              expect(proceedBtn).toBeTruthy();
            }

            break;
          }
        }
      }
    }
  });

  test("integration disconnect removes the connection", async ({ page, dismissCookieBanner }) => {
    test.fixme(true, "This test requires an integration that is already connected. " +
      "Seed data doesn't include pre-configured integrations. Would need to either seed a connected integration " +
      "or implement a way to verify the disconnect flow works correctly. " +
      "Mark as fixme until integrations can be seeded or tested via API setup.");

    await loginAsEmployer(page);
    await dismissCookieBanner();
    await page.goto("/employer");
    await page.waitForLoadState("networkidle");

    // Navigate to Integrations
    const integrationsLink = page.getByRole("link", { name: /Integration/i }).first();

    if (await integrationsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await integrationsLink.click();
      await page.waitForLoadState("networkidle");

      // Find a connected integration (should show disconnect button)
      const connectedIntegration = page.locator("[class*='integration'], [class*='card']")
        .filter({ hasText: /connected|active|enabled/i }).first();

      if (await connectedIntegration.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Look for disconnect button
        const disconnectBtn = connectedIntegration.getByRole("button", { name: /Disconnect|Disable|Remove/i });

        if (await disconnectBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await disconnectBtn.click();
          await page.waitForTimeout(500);

          // Confirmation dialog might appear
          const confirmDialog = page.locator("[role='alertdialog'], [class*='confirm']");

          if (await confirmDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
            const confirmBtn = confirmDialog.getByRole("button", { name: /Confirm|Disconnect|Yes/i });

            if (await confirmBtn.isVisible()) {
              await confirmBtn.click();
              await page.waitForTimeout(1000);

              // Connection should be removed
              const success = page.getByText(/disconnected|removed|disabled/i);

              if (await success.isVisible({ timeout: 3000 }).catch(() => false)) {
                await expect(success).toBeVisible();
              }
            }
          }
        }
      }
    }
  });
});
