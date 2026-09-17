/* Employer Transformation E4 (message templates polish): every employer sees four canned
   messages out of the box for the scenarios that come up on nearly every hire, without first
   having to author their own. These are presentation-only (id starts with "builtin_" and is
   never sent to the server) - they merge into the picker UI but are NOT included in the
   stage-automation editor, which needs a real message_templates row to bind to a stage. */
export function defaultMessageTemplates(t){
  return [
    {id:"builtin_shortlist",name:t("employer.messageTemplates.shortlistName"),body:t("employer.messageTemplates.shortlistBody")},
    {id:"builtin_interview",name:t("employer.messageTemplates.interviewName"),body:t("employer.messageTemplates.interviewBody")},
    {id:"builtin_offerFollowup",name:t("employer.messageTemplates.offerFollowupName"),body:t("employer.messageTemplates.offerFollowupBody")},
    {id:"builtin_rejection",name:t("employer.messageTemplates.rejectionName"),body:t("employer.messageTemplates.rejectionBody")},
  ];
}
