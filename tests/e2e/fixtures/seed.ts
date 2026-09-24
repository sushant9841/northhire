import { execSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "../../server/data/northhire.sqlite");

/*
 * Demo seed reset. `server/seed.js` is an additive top-up (every INSERT uses INSERT OR IGNORE —
 * see the file's own header comment), so re-running it against the live dev DB never duplicates
 * rows or fails on a populated database; it just makes sure every row the suite depends on
 * (demo accounts, seed jobs, seed applications) exists before a run. It does NOT reset rows a
 * previous test run mutated (stage changes, new applications, etc.) — specs that need a clean
 * slate for a specific row create their own fixture data via the API instead of relying on
 * global resets, since a destructive reset would fight the "reuseExistingServer" dev-server
 * model this config uses locally.
 */
export function resetSeedData() {
  execSync("node server/seed.js", { stdio: "inherit", cwd: process.cwd() });
}

/*
 * Direct database access for test fixtures. Used to seed complex test scenarios that are
 * easier to set up via direct SQL than through the API.
 */
function getDb() {
  return new DatabaseSync(DB_PATH);
}

function generateId(prefix: string): string {
  return `${prefix}${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
}

/*
 * Seed helpers for specific test scenarios
 */

/**
 * Ensure an employer exists on a specific plan with N live jobs.
 * Used by: employer/plan-limits.spec.ts
 */
export function seedEmployerWithPlanAndJobs(
  employerId: string,
  employerName: string,
  plan: "Free" | "Growth" | "Scale" | "Enterprise",
  jobCount: number = 1
) {
  const db = getDb();

  // Upsert employer
  db.prepare(
    `INSERT OR REPLACE INTO employers (id, name, plan, verified, rating, size, created_at)
     VALUES (?, ?, ?, 1, 0, 'small', datetime('now'))`
  ).run(employerId, employerName, plan);

  // Upsert employer user account if needed
  db.prepare(
    `INSERT OR IGNORE INTO users (id, role, name, email, password_hash, password_salt, employer_id)
     VALUES (?, 'employer', ?, ?, ?, ?, ?)`
  ).run(
    `eu_${employerId}`,
    `${employerName} HR`,
    `hr@${employerName.toLowerCase().replace(/\s/g, "")}.com`,
    "hashed",
    "salt",
    employerId
  );

  // Create N live jobs
  for (let i = 0; i < jobCount; i++) {
    const jobId = generateId("job");
    const deadline = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    db.prepare(
      `INSERT OR REPLACE INTO jobs
       (id, employer_id, title, status, deadline_date, created_at)
       VALUES (?, ?, ?, 'live', ?, datetime('now'))`
    ).run(jobId, employerId, `Test Job ${i + 1}`, deadline);
  }

  db.close();
}

/**
 * Create a benefits plan with specific enrollment window dates.
 * Used by: hr/benefits.spec.ts tests
 */
export function seedBenefitsPlan(
  companyId: string,
  planName: string,
  options?: {
    openEnrollmentStart?: { month: number; day: number };
    openEnrollmentEnd?: { month: number; day: number };
  }
) {
  const db = getDb();
  const planId = generateId("bp");

  const config = {
    tiers: [
      { key: "employee", label: "Employee", monthlyCost: 50, employerPct: 80 },
      { key: "family", label: "Family", monthlyCost: 150, employerPct: 70 },
    ],
    openEnrollment: options?.openEnrollmentStart
      ? {
          startMonth: options.openEnrollmentStart.month,
          startDay: options.openEnrollmentStart.day,
          endMonth: options.openEnrollmentEnd?.month || options.openEnrollmentStart.month,
          endDay: options.openEnrollmentEnd?.day || 31,
        }
      : null,
  };

  db.prepare(
    `INSERT INTO benefits_plans (id, company_id, name, config_json, active, created_at)
     VALUES (?, ?, ?, ?, 1, datetime('now'))`
  ).run(planId, companyId, planName, JSON.stringify(config));

  db.close();
  return planId;
}

/**
 * Create a benefits enrollment for an employee on a plan.
 * Used by: hr/benefits.spec.ts tests and admin/moderation.spec.ts
 */
export function seedBenefitsEnrollment(employeeId: string, planId: string, tier: string = "employee") {
  const db = getDb();
  const enrollmentId = generateId("be");

  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);
  const nextEnrollmentAt = `${nextYear.getFullYear()}-01-01`;

  db.prepare(
    `INSERT INTO benefits_enrollments (id, employee_id, plan_id, tier, started_at, next_enrollment_at)
     VALUES (?, ?, ?, ?, datetime('now'), ?)`
  ).run(enrollmentId, employeeId, planId, tier, nextEnrollmentAt);

  db.close();
  return enrollmentId;
}

/**
 * Record a life event for an employee.
 * Used by: hr/benefits.spec.ts life-event tests
 */
export function seedBenefitsLifeEvent(
  employeeId: string,
  eventType: "marriage" | "birth" | "adoption" | "divorce" | "coverage_loss" = "marriage"
) {
  const db = getDb();
  const eventId = generateId("ble");
  const eventDate = new Date().toISOString().slice(0, 10);

  db.prepare(
    `INSERT INTO benefits_life_events (id, employee_id, event_type, event_date, created_at)
     VALUES (?, ?, ?, ?, datetime('now'))`
  ).run(eventId, employeeId, eventType, eventDate);

  db.close();
  return eventId;
}

/**
 * Create or connect an integration for an owner (employer or HR company).
 * Used by: admin/integrations.spec.ts disconnect test
 */
export function seedIntegration(
  ownerScope: "employer" | "company",
  ownerId: string,
  provider: string = "punch-clock",
  status: "connected" | "not-connected" = "connected"
) {
  const db = getDb();
  const integrationId = generateId("int");

  db.prepare(
    `INSERT OR IGNORE INTO integrations
     (id, owner_scope, owner_id, provider, status, config_json, installed_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
  ).run(integrationId, ownerScope, ownerId, provider, status, JSON.stringify({}));

  db.close();
  return integrationId;
}

/**
 * Query notification count for a user since a given timestamp.
 * Used by: hr/leave.spec.ts notification count test
 */
export function countNotifications(userId: string, since?: Date): number {
  const db = getDb();

  let query = "SELECT COUNT(*) as count FROM notifications WHERE recipient_id = ?";
  const params: any[] = [userId];

  if (since) {
    query += " AND created_at > ?";
    params.push(since.toISOString());
  }

  const result = db.prepare(query).get(...params) as { count: number };
  db.close();

  return result?.count || 0;
}

/**
 * Extract session cookies from authenticated context for API testing.
 * Used by: hr/permissions.spec.ts authenticated but unauthorized API test
 */
export function extractCookieFromContext(cookieString: string | undefined, name: string): string | null {
  if (!cookieString) return null;
  const match = cookieString.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : null;
}

/**
 * Verify a plan has live employers and block deletion if true.
 * Used by: admin/plans.spec.ts plan deletion test setup
 */
export function hasLiveEmployersOnPlan(planCode: string): boolean {
  const db = getDb();
  const result = db.prepare(
    "SELECT COUNT(*) as count FROM employers WHERE plan = ? AND id IN (SELECT DISTINCT employer_id FROM jobs WHERE status = 'live')"
  ).get(planCode) as { count: number };
  db.close();
  return (result?.count || 0) > 0;
}
