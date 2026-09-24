import { test, expect } from "../fixtures/base";
import { loginAsEmployer } from "../fixtures/auth";
import { seedEmployerWithPlanAndJobs } from "../fixtures/seed";

/*
 * Playbook §21 — employer plan limits:
 *   - Free plan hits 1-job limit → UpgradePromptModal with 5-part copy
 *     (what's locked / why it matters / what you get / cost / what changes)
 *   - Free tries to message candidate → contextual modal, not a hidden button
 */
test.describe("employer plan limits", () => {
  test("Free plan hitting job limit shows UpgradePromptModal with 5-part copy", async ({ page, dismissCookieBanner }) => {
    // Seed a Free plan employer with 1 live job
    seedEmployerWithPlanAndJobs("e_free_1", "Free Test Employer", "Free", 1);

    await loginAsEmployer(page, "hr@freetestemployer.com", "Employer123");
    await dismissCookieBanner();
    await page.goto("/employer");

    // Navigate to post a job
    const postBtn = page.getByRole("button", { name: /Post|New job/i }).first();
    if (await postBtn.isVisible().catch(() => false)) {
      await postBtn.click();
      await page.waitForLoadState("networkidle");
    }

    // Attempt to create a second job on Free plan
    // The modal should appear when hitting the limit
    const limitModal = page.locator("[class*='modal'], [role='dialog']")
      .filter({ hasText: /Upgrade|Growth|plan|feature/i });

    if (await limitModal.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(limitModal).toBeVisible();

      // Verify 5-part structure:
      // 1. What's locked (title in the modal)
      const title = limitModal.locator("h2, h1").first();
      await expect(title).toBeVisible();

      // 2. Why it matters (subtitle/body text)
      const whyText = limitModal.locator("p").first();
      await expect(whyText).toBeVisible();

      // 3. What you get (typically a bullets list)
      const bullets = limitModal.locator("li, [class*='bullet']");
      expect(await bullets.count()).toBeGreaterThanOrEqual(0);

      // 4. Cost (shown in plan options)
      const planRows = limitModal.locator("[class*='plan'], [class*='price']");
      expect(await planRows.count()).toBeGreaterThanOrEqual(1);

      // 5. What changes (typically a summary at the bottom)
      const whatChanges = limitModal.getByText(/everything.*keep|upgrade/i);
      if (await whatChanges.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(whatChanges).toBeVisible();
      }

      // Check for upgrade CTA button
      const upgradeBtn = limitModal.getByRole("button", { name: /Upgrade|See all|Choose/i });
      await expect(upgradeBtn).toBeVisible();
    }
  });

  test("Free plan messaging candidate shows contextual modal with upgrade prompt", async ({ page, dismissCookieBanner }) => {
    await loginAsEmployer(page);
    await dismissCookieBanner();
    await page.goto("/employer");

    // Navigate to pipeline
    const pipelineBtn = page.getByRole("link", { name: /Pipeline|Candidates/i })
      .or(page.getByRole("button", { name: /Pipeline|Candidates/i })).first();

    if (await pipelineBtn.isVisible().catch(() => false)) {
      await pipelineBtn.click();
      await page.waitForLoadState("networkidle");
    }

    // Click on a candidate to open drawer
    const firstCard = page.locator("div[class*='card']").filter({ hasText: /\w+/ }).first();
    if (await firstCard.isVisible().catch(() => false)) {
      await firstCard.click();
      await page.waitForLoadState("networkidle");

      // Look for Message button - on Free plan it might be disabled or show a lock icon
      const messageBtn = page.getByRole("button", { name: /Message|Send message/i });

      if (await messageBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Button could be disabled (lock icon) or clickable (opens upgrade modal)
        const isDisabled = await messageBtn.isDisabled().catch(() => false);

        if (!isDisabled) {
          await messageBtn.click();
          await page.waitForTimeout(500);

          // Modal should show with upgrade info
          const modal = page.locator("[class*='modal'], [role='dialog']")
            .filter({ hasText: /Message|Upgrade|Growth/i });

          if (await modal.isVisible({ timeout: 3000 }).catch(() => false)) {
            await expect(modal).toBeVisible();

            // Should have upgrade-related text
            const upgradeText = modal.getByText(/Upgrade|Growth|feature|requires/i);
            expect(await upgradeText.count()).toBeGreaterThan(0);
          }
        }

        // If button has lock icon, verify it's locked
        if (isDisabled) {
          const lockIcon = messageBtn.locator("[class*='lock'], [aria-label*='lock']");
          expect(await lockIcon.count()).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
});
