/* Small helpers that translate a canonical enum value for display without breaking custom,
   employer-authored values that live in the same field (e.g. a custom pipeline stage name).
   Falls back to the raw value itself when it isn't one of the fixed values we ship a translation
   for, rather than leaking a raw "enums.foo.bar" i18n key onto the page. */

const KNOWN_APPLICATION_STAGES = new Set(["Applied", "Reviewed", "Shortlisted", "Interview", "Offer", "Hired", "Withdrawn"]);

export function applicationStageLabel(stage, t) {
  return KNOWN_APPLICATION_STAGES.has(stage) ? t("enums.applicationStage." + stage) : stage;
}
