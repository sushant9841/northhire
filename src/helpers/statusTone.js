/* Shared status → Tag tone mappings — previously copy-pasted (with drifting fallback colors)
   across staffing/suite.jsx, hr/suite.jsx, employer/staffing.jsx, employer/suite.jsx, admin/suite.jsx. */

export const invoiceTone = (status) =>
  status === "paid" ? "ok" : status === "overdue" ? "danger" : status === "reversed" ? "neutral" : "warn";

export const timesheetTone = (status) =>
  status === "approved" ? "ok" : status === "submitted" ? "warn" : status === "paid" ? "brand" : "neutral";

export const jobTone = (status) =>
  status === "live" ? "ok" : status === "paused" ? "warn" : status === "review" ? "violet" : "neutral";

export const jobStatusLabel = (status) =>
  status === "live" ? "Live" : status === "paused" ? "Paused" : status === "review" ? "Pending review" : "Closed";
