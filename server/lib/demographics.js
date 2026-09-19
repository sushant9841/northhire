/* Priority-4 #3 - D&I voluntary self-ID collection + aggregate demographic reporting.
   Field/value definitions live here so the seeker-facing form, the server-side write validation,
   and the employer aggregate reporting endpoint all agree on exactly what a value means - a
   seeker never free-types these, only picks from this fixed list, so aggregation can group on
   exact string equality without any fuzzy matching. */
export const DEMOGRAPHIC_FIELDS = {
  ageBand: ["under-20", "20-29", "30-39", "40-49", "50-59", "60-plus", "prefer-not-to-say"],
  gender: ["woman", "man", "non-binary", "other", "prefer-not-to-say"],
  indigenous: ["yes", "no", "prefer-not-to-say"],
  racialized: ["yes", "no", "prefer-not-to-say"],
  disability: ["yes", "no", "prefer-not-to-say"],
  lgbtq: ["yes", "no", "prefer-not-to-say"],
};

export function isValidDemographicValue(field, value) {
  return Object.prototype.hasOwnProperty.call(DEMOGRAPHIC_FIELDS, field) && DEMOGRAPHIC_FIELDS[field].includes(value);
}

/* Suppression floor: an aggregate report must never let a small, potentially identifying group
   show up as a bare number - anyone reading "1 Indigenous applicant" in a 40-person pool has
   effectively been told who it is. Every bucket under 10 respondents is replaced with a flag
   instead of a count, no matter how the requester slices it. */
export const SUPPRESSION_FLOOR = 10;
export function suppressedBucket(value, count) {
  return count < SUPPRESSION_FLOOR
    ? { value, suppressed: true }
    : { value, count };
}
