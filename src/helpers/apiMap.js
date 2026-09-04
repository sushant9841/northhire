// Bridges field-name differences between the backend's REST responses and the shapes the
// existing frontend store/pages already expect, so wiring in the real API didn't require
// renaming fields across dozens of call sites. See server/README.md for what's actually wired.
export const mapApiJob = j => j ? { ...j, dl: j.daysLeft } : j;
export const mapApiEmployer = e => e; // already field-compatible (owner/ownerName joined server-side)
export const mapApiApplication = a => a; // already field-compatible
export const mapApiUser = u => u ? { ...u, payMin: u.pay_min, payUnit: u.pay_unit, employerId: u.employer_id } : u;
