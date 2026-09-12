/* Shared status → Tag tone mappings — previously copy-pasted (with drifting fallback colors)
   across staffing/suite.jsx, hr/suite.jsx, employer/staffing.jsx, employer/suite.jsx, admin/suite.jsx. */

export const invoiceTone = (status) =>
  status === "paid" ? "ok" : status === "overdue" ? "danger" : status === "reversed" ? "neutral" : "warn";

export const timesheetTone = (status) =>
  status === "approved" ? "ok" : status === "submitted" ? "warn" : status === "paid" ? "brand" : "neutral";

export const jobTone = (status) =>
  status === "live" ? "ok" : status === "paused" ? "warn" : status === "review" ? "violet" : "neutral";

/* Takes the i18n t() function so the label follows the viewer's locale — this helper has no
   component scope of its own to read the current locale from. */
export const jobStatusLabel = (status, t) => t("enums.jobStatus." + (["live", "paused", "review"].includes(status) ? status : "closed"));
