/* Shared status → Tag tone mappings — previously copy-pasted (with drifting fallback colors)
   across staffing/suite.jsx, hr/suite.jsx, employer/staffing.jsx, employer/suite.jsx, admin/suite.jsx. */

export const invoiceTone = (status) =>
  status === "paid" ? "ok" : status === "overdue" ? "danger" : status === "reversed" ? "neutral" : "warn";

export const timesheetTone = (status) =>
  status === "approved" ? "ok" : status === "submitted" ? "warn" : status === "paid" ? "brand" : "neutral";

// QA-r5c: pass the whole job (or {status, dl}) so we can reconcile a "live" status with a
// past deadline. Previously every listing whose deadline passed still rendered a green "Live"
// tag even though no candidate could apply — a semantic contradiction visible on EmpJobs,
// admin moderation, and every job list. Legacy callers passing a plain status string still
// work (fall back to old behavior).
function _resolve(jobOrStatus) {
  if (typeof jobOrStatus === "string") return { status: jobOrStatus, dl: null };
  return { status: jobOrStatus?.status, dl: typeof jobOrStatus?.dl === "number" ? jobOrStatus.dl : null };
}
export const jobTone = (jobOrStatus) => {
  const { status, dl } = _resolve(jobOrStatus);
  if (status === "live" && dl !== null && dl <= 0) return "neutral"; // expired live listing
  return status === "live" ? "ok" : status === "paused" ? "warn" : status === "review" ? "violet" : "neutral";
};

/* Takes the i18n t() function so the label follows the viewer's locale — this helper has no
   component scope of its own to read the current locale from. */
export const jobStatusLabel = (jobOrStatus, t) => {
  const { status, dl } = _resolve(jobOrStatus);
  if (status === "live" && dl !== null && dl <= 0) return t("enums.jobStatus.expired") || "Expired";
  return t("enums.jobStatus." + (["live", "paused", "review"].includes(status) ? status : "closed"));
};
