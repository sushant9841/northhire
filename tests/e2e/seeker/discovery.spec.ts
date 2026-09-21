import { test, expect } from "../fixtures/base";

/* Playbook §21 row 2 — home → search → filter → job detail, filter persistence, sort control.
   Runs as a guest (no login needed for browsing/searching/viewing a job — this flow is public). */
test.describe("seeker discovery", () => {
  test("home to search to filter to job detail, with filter persistence and sort", async ({ page }) => {
    await page.goto("/");
    // "Find jobs" in the header nav is a category-browse DROPDOWN TOGGLE (src/shells/Header.jsx,
    // kind==="browse"), not a direct link to /jobs — clicking it only opens a menu. The homepage's
    // "All jobs" CTA (src/pages/marketing/pages.jsx) is the real one-click path to search.
    await page.getByRole("button", { name: "All jobs" }).first().click();
    await expect(page).toHaveURL(/\/jobs$/);

    // Below 960px the filter sidebar isn't rendered inline — SearchPage puts it behind a
    // "Filters" button that opens it as a Modal instead (see the `mob&&<Btn ...Filters` branch).
    const openFiltersBtn = page.getByRole("button", { name: /^Filters/ });
    if (await openFiltersBtn.isVisible().catch(() => false)) await openFiltersBtn.click();

    // Apply a sector filter (checkbox-role button per src/pages/seeker/SearchPage.jsx `R`).
    const tradesFilter = page.getByRole("checkbox", { name: /Skilled Trades/i }).first();
    await tradesFilter.click();
    await expect(tradesFilter).toHaveAttribute("aria-checked", "true");

    // On mobile the filter panel is a modal with its own "Show N jobs" confirm button; close it
    // to get back to the results list.
    const showJobsBtn = page.getByRole("button", { name: /^Show \d+ job/ });
    if (await showJobsBtn.isVisible().catch(() => false)) await showJobsBtn.click();

    const resultCards = page.locator("div.grid.gap-4 > div");
    await expect(resultCards.first()).toBeVisible();
    expect(await resultCards.count()).toBeGreaterThan(0);

    // Change sort and confirm the control's value actually changed (result order depends on
    // seed data pay values, which aren't stable enough to assert an exact order on).
    const sortSelect = page.locator("select").last();
    await sortSelect.selectOption("pay");
    await expect(sortSelect).toHaveValue("pay");

    // Open the first job card's detail page (JobCard is a clickable Card div, not a real link —
    // see src/pages/shared/cards.jsx).
    const firstCard = resultCards.first();
    const firstCardTitle = (await firstCard.locator("div.font-bold.text-text").first().innerText()).trim();
    await firstCard.click();
    await expect(page).toHaveURL(/\/jobs\/.+/);
    await expect(page.getByText(firstCardTitle, { exact: true }).first()).toBeVisible();

    // Filter persistence: SearchPage writes {q,where,...f} back to the shared store on unmount
    // and re-reads A.search on mount, so going back should restore the Skilled Trades filter.
    await page.goBack();
    await expect(page).toHaveURL(/\/jobs$/);
    if (await openFiltersBtn.isVisible().catch(() => false)) await openFiltersBtn.click();
    await expect(page.getByRole("checkbox", { name: /Skilled Trades/i }).first()).toHaveAttribute("aria-checked", "true");
  });
});
