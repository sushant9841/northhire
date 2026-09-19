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

/* HR Suite Tranche H5 - "Templates" button reused from the employer console (E4) inside HR Chat.
   Presentation-only, same builtin_* convention as above - never sent to the server, just merged
   into the picker so an HR user isn't starting every welcome/approval/assignment message from a
   blank box. `name` interpolates into the body at pick-time by the caller (HrChat), same pattern
   DockedChat already uses for its own four. */
export function defaultHrMessageTemplates(t,name){
  const who=name||t("hr.chat.templates.fallbackName");
  return [
    {id:"builtin_hr_welcome",name:t("hr.chat.templates.welcomeName"),body:t("hr.chat.templates.welcomeBody",{name:who})},
    {id:"builtin_hr_leaveApproved",name:t("hr.chat.templates.leaveApprovedName"),body:t("hr.chat.templates.leaveApprovedBody",{name:who})},
    {id:"builtin_hr_taskAssigned",name:t("hr.chat.templates.taskAssignedName"),body:t("hr.chat.templates.taskAssignedBody",{name:who})},
    {id:"builtin_hr_birthday",name:t("hr.chat.templates.birthdayName"),body:t("hr.chat.templates.birthdayBody",{name:who})},
    {id:"builtin_hr_anniversary",name:t("hr.chat.templates.anniversaryName"),body:t("hr.chat.templates.anniversaryBody",{name:who})},
  ];
}
