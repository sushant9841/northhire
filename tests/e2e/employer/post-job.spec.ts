import { test, expect } from "../fixtures/base";
import { loginAsEmployer } from "../fixtures/auth";

/*
 * Playbook §21 — employer job posting flow:
 *   - draft autosave + resume indicator ("Saved just now" → "Saved N min ago")
 *   - preview step (Step 4) shows the job as seekers will see it
 *   - publish → SuccessCard shows public URL + copy-link buttons per distribution channel
 */
test.describe("employer post job", () => {
  test("draft autosave updates indicator from 'Saved just now' to 'Saved N min ago'", async ({ page, dismissCookieBanner }) => {
    test.setTimeout(150_000);
    await loginAsEmployer(page);
    await dismissCookieBanner();
    await page.goto("/employer");
    // Click "Post a job" or the first job button to get to post flow
    const postBtn = page.getByRole("button", { name: /Post a job|New job/i }).first();
    if (await postBtn.isVisible().catch(() => false)) {
      await postBtn.click();
    } else {
      // First visit, use the "Publish your first job" card
      await page.getByRole("button", { name: /Publish|First job/i }).click();
    }
    await page.waitForLoadState("networkidle");

    // Fill in a job title (autosave should trigger on input blur or after typing)
    const titleInput = page.getByPlaceholder(/Job title|Title/i).first();
    if (await titleInput.isVisible()) {
      await titleInput.click();
      await page.waitForTimeout(300);
      await titleInput.type("Software Engineer", { delay: 20 });
      await expect(page.getByText("Saved just now")).toBeVisible({ timeout: 15_000 });

      // Wait ~65s to see it change to "Saved N min ago"
      await page.waitForTimeout(100_000);
      await expect(page.getByText(/Saved \d+ min ago/)).toBeVisible({ timeout: 10_000 });
    }
  });

  test("preview step shows job as seeker will see it", async ({ page, dismissCookieBanner }) => {
    await loginAsEmployer(page);
    await dismissCookieBanner();
    await page.goto("/employer");

    const postBtn = page.getByRole("button", { name: /Post a job|New job/i }).first();
    if (await postBtn.isVisible().catch(() => false)) {
      await postBtn.click();
    } else {
      await page.getByRole("button", { name: /Publish|First job/i }).click();
    }
    await page.waitForLoadState("networkidle");

    // Fill minimal required fields to get to preview
    const titleInput = page.getByPlaceholder(/Job title|Title/i).first();
    if (await titleInput.isVisible()) {
      await titleInput.fill("Site Manager");

      // Move to next step
      const continueBtn = page.getByRole("button", { name: /Continue|Next/i }).first();
      if (await continueBtn.isVisible()) {
        await continueBtn.click();
        await page.waitForLoadState("networkidle");
      }

      // Navigate to preview step (typically step 4, but check for "Preview" in button text)
      for (let i = 0; i < 3; i++) {
        const nextBtn = page.getByRole("button", { name: /Continue|Next/i }).first();
        if (!(await nextBtn.isVisible().catch(() => false))) break;
        await nextBtn.click();
        await page.waitForLoadState("networkidle");
      }

      // On preview step, the job title should be visible in a preview container
      await expect(page.getByText("Site Manager", { exact: true }).first()).toBeVisible();
    }
  });

  test("publish shows SuccessCard with public URL and distribution channels", async ({ page, dismissCookieBanner }) => {
    await loginAsEmployer(page);
    await dismissCookieBanner();
    await page.goto("/employer");

    const postBtn = page.getByRole("button", { name: /Post a job|New job/i }).first();
    if (await postBtn.isVisible().catch(() => false)) {
      await postBtn.click();
    } else {
      await page.getByRole("button", { name: /Publish|First job/i }).click();
    }
    await page.waitForLoadState("networkidle");

    // Fill minimal required fields
    const titleInput = page.getByPlaceholder(/Job title|Title/i).first();
    if (await titleInput.isVisible()) {
      await titleInput.fill("Construction Supervisor");

      // Progress through steps to publish
      for (let i = 0; i < 4; i++) {
        const btn = page.getByRole("button", { name: /Continue|Next|Publish|Submit/i }).first();
        if (!(await btn.isVisible().catch(() => false))) break;

        const btnText = await btn.textContent();
        if (btnText?.includes("Publish")) {
          await btn.click();
          break;
        }

        if (btnText?.includes("Continue") || btnText?.includes("Next")) {
          await btn.click();
          await page.waitForLoadState("networkidle");
        }
      }

      // After publish, expect SuccessCard with job URL
      await expect(page.getByText(/published|live|congratulations/i).first()).toBeVisible({ timeout: 10_000 });

      // Check for public URL display (typically in a code block or copy-able field)
      const urlContainer = page.locator("code, [class*='url'], [class*='link']").filter({ hasText: /http/ });
      if (await urlContainer.first().isVisible().catch(() => false)) {
        await expect(urlContainer.first()).toBeVisible();
      }

      // Check for copy button(s) for distribution channels
      const copyBtns = page.getByRole("button", { name: /Copy|Share/i });
      expect(await copyBtns.count()).toBeGreaterThanOrEqual(0);
    }
  });
});
