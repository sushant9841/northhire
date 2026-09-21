import type { Page } from "@playwright/test";

/*
 * Login helpers, one per persona used across the suite. All demo passwords match what
 * server/seed.js prints when it runs (kept in sync with LoginPage.jsx's dev-only demo panel
 * and HrLoginPage.jsx's demo list).
 *
 * NOTE (real defect found while writing this fixture): the login forms' <label> elements are
 * rendered as plain siblings of their <input> (see src/design/primitives.jsx `Field`) with no
 * `htmlFor`/`id` pairing, so they carry no programmatic association — a screen reader announces
 * the input with no name, and Playwright's accessible-name locators (getByLabel) cannot find
 * them either. These helpers fall back to placeholder text as a result. Flagged in
 * docs/REGRESSION.md and TEST_MATRIX.md as a real a11y bug, not a test workaround only.
 */

const EMAIL_PLACEHOLDER = "you@example.ca";
const PASSWORD_PLACEHOLDER = "Your password";

// A plain regex like /\/(?!login)/ trivially matches the "//" in "http://" itself, so it
// resolves before the SPA has actually navigated anywhere — use a real predicate on the
// pathname instead of a regex that can match the protocol separator.
const navigatedAwayFromLogin = (url: URL) => url.pathname !== "/login";

export async function loginAsSeeker(page: Page, email = "sarah.chen@example.ca", password = "Password123") {
  await page.goto("/login");
  await page.getByPlaceholder(EMAIL_PLACEHOLDER).fill(email);
  await page.getByPlaceholder(PASSWORD_PLACEHOLDER).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(navigatedAwayFromLogin, { timeout: 10_000 });
}

export async function loginAsEmployer(page: Page, email = "hr@pcl.com", password = "Employer123") {
  await page.goto("/login");
  await page.getByPlaceholder(EMAIL_PLACEHOLDER).fill(email);
  await page.getByPlaceholder(PASSWORD_PLACEHOLDER).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(navigatedAwayFromLogin, { timeout: 10_000 });
}

export async function loginAsAdmin(page: Page, email = "admin@northhire.ca", password = "Admin1234") {
  await page.goto("/login");
  await page.getByPlaceholder(EMAIL_PLACEHOLDER).fill(email);
  await page.getByPlaceholder(PASSWORD_PLACEHOLDER).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(navigatedAwayFromLogin, { timeout: 10_000 });
}

/*
 * HR Suite login is a separate session (`hr_session` cookie) scoped to company + loginId
 * (email, email-local-part, or full name all resolve — see server/routes/hr.js `/hr/login`),
 * not the main `/api/auth/login`. Every HR persona in this suite is a PCL Construction
 * (e1, Enterprise plan) employee seeded by HR_EMPLOYEES; password is the shared HR demo
 * password "pcl2026" for every HR employee record.
 */
export async function loginAsHr(page: Page, loginId: string, password = "pcl2026", company = "PCL Construction") {
  await page.goto("/hr/login");
  // Company field is pre-filled ("PCL Construction") rather than empty, so its placeholder
  // ("e.g. PCL Construction") is never actually shown — select by current value instead.
  const companyInput = page.locator('input[placeholder="e.g. PCL Construction"]');
  await companyInput.fill(company);
  await page.locator('input[placeholder="jean.dupuis"]').fill(loginId);
  await page.getByPlaceholder(PASSWORD_PLACEHOLDER).fill(password);
  await page.getByRole("button", { name: /Enter HR Suite|Signing in/ }).click();
  await page.waitForURL(/\/hr\/dashboard/, { timeout: 10_000 });
}

/*
 * A brand-new seeker account via the real signup wizard, rather than one of the fixed demo
 * accounts. Demo accounts (Sarah, Marcus) accumulate CVs/applications across repeated suite
 * runs against the same persistent dev DB — a CV-count or "already applied" assertion made
 * against them is only true the first time the suite ever runs. Signing up fresh guarantees a
 * true 0-CV, 0-application starting state every run, which is what apply.spec.ts's CV-picker
 * states actually need to test deterministically.
 */
export async function signupFreshSeeker(page: Page, password = "Password123!") {
  const email = `e2e.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@example.ca`;
  await page.goto("/signup");
  await page.getByRole("button", { name: "I'm looking for work" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByPlaceholder("Jean").fill("E2E");
  await page.getByPlaceholder(EMAIL_PLACEHOLDER).fill(email);
  await page.getByPlaceholder("At least 8 characters").fill(password);
  await page.getByRole("button", { name: "Finish and start matching" }).click();
  await page.waitForURL((url) => url.pathname !== "/signup", { timeout: 10_000 });
  return { email, password };
}

export const HR_PERSONAS = {
  owner: "rachel.martel@pcl.com",
  admin: "priya.r@pcl.com",
  hr: "linda.o@pcl.com",
  finance: "isaac.c@pcl.com",
  employee: "daniel.k@pcl.com",
};
