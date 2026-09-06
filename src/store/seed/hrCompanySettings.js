/* Employee roles: owner, admin, hr, finance, employee.
   Every employee belongs to one company (`companyId`) and has a `visibility`
   object controlling their public NorthHire profile. */
export const HR_ROLES=[
  {k:"owner",label:"Owner",desc:"Full access to everything, including plan and billing"},
  {k:"admin",label:"Admin",desc:"Manage all people, jobs, modules and settings"},
  {k:"hr",label:"HR",desc:"Manage people, hiring, leave, trainings, chat with anyone"},
  {k:"finance",label:"Finance",desc:"Manage invoices, salaries, payment methods"},
  {k:"employee",label:"Employee",desc:"View own profile, tasks, attendance, chat, calendar"},
];

/* Company-level HR settings — feature toggles per module */
export const HR_COMPANY_SETTINGS_DEFAULT={
  modules:{directory:true,attendance:true,leave:true,tasks:true,calendar:true,chat:true,invoices:true,payroll:true,trainings:true,badges:true},
  attendance:{allowRemotePunch:true,workingHoursStart:"08:00",workingHoursEnd:"17:00",lateThresholdMin:15},
  leave:{annualVacationDays:15,sickDays:10,personalDays:3,requireApproval:true,advanceNoticeDays:14},
  chat:{allowEmployeeInitiate:true,allowDirectMessages:true,allowGroupCreation:false,allowFileShare:true,allowCalls:true},
  privacy:{
    defaultPublicVisibility:true,
    allowEmployeeVisibilityOverride:true,
    /* NEW — HR Suite ↔ NorthHire product link controls.
       Each toggle governs a specific data path between products. */
    linkHrToNorthHire:true,           /* Master switch — turn everything off if false */
    syncSkillsToNorthHire:true,       /* HR-tracked skills appear on public seeker profile */
    syncCertificationsToNorthHire:true, /* Certs on HR record surface publicly */
    syncBadgesToNorthHire:true,       /* Internal HR badges show on employer's public profile */
    shareTenureToNorthHire:true,      /* "Been with us 4 years" tenure shows publicly */
    shareTitleToNorthHire:true,       /* Current title shows publicly */
    shareDepartmentToNorthHire:false, /* Department name shows publicly (usually off) */
    allowNorthHireProfileImport:true, /* When hiring, pull NorthHire profile data into HR record */
    allowEmployeesToOptOut:true,      /* Employees can override any of the above for their own profile */
  },
  branding:{primaryColor:"#B45309",accentColor:"#005CCC",showBadgesOnPublic:true},
  integrations:{punchMachine:{connected:false,vendor:null,lastSync:null},
                priorHRSystem:{connected:false,vendor:null,lastImport:null}},
};

/* External punch-machine vendors we "support" */
export const PUNCH_VENDORS=[
  {id:"kronos",name:"UKG (Kronos) Workforce Ready",kind:"cloud"},
  {id:"adp",name:"ADP Workforce Now",kind:"cloud"},
  {id:"bamboo",name:"BambooHR TimeTracking",kind:"cloud"},
  {id:"biometric-fp",name:"Suprema BioStation A2 (fingerprint)",kind:"onsite"},
  {id:"biometric-face",name:"HikVision Face Terminal",kind:"onsite"},
  {id:"rfid-badge",name:"Generic RFID badge reader",kind:"onsite"},
];

export const PRIOR_HR_VENDORS=[
  {id:"bamboohr",name:"BambooHR"},
  {id:"workday",name:"Workday"},
  {id:"adp-run",name:"ADP RUN"},
  {id:"ceridian",name:"Ceridian Dayforce"},
  {id:"quickbooks-hr",name:"QuickBooks Payroll + HR"},
  {id:"other-csv",name:"Other — upload CSV"},
];

export const HR_MODULES=[
  {k:"hrDashboard",label:"Dashboard",icon:"activity",module:"dashboard"},
  {k:"hrPeople",label:"People",icon:"users",module:"people"},
  {k:"hrProfile",label:"My profile",icon:"user",module:"profile"},
  {k:"hrAttendance",label:"Attendance",icon:"clock",module:"attendance"},
  {k:"hrLeave",label:"Leave",icon:"calendar",module:"leave"},
  {k:"hrExpenses",label:"Expenses",icon:"wallet",module:"expenses"},
  {k:"hrTasks",label:"Tasks",icon:"check",module:"tasks"},
  {k:"hrCalendar",label:"Calendar",icon:"calendar",module:"calendar"},
  {k:"hrChat",label:"Chat",icon:"mail",module:"chat"},
  {k:"hrTrainings",label:"Trainings",icon:"cap",module:"trainings"},
  {k:"hrBadges",label:"Badges",icon:"award",module:"badges"},
  {k:"hrHiring",label:"Hiring",icon:"briefcase",module:"hiring"},
  {k:"hrInvoices",label:"Invoices",icon:"file",module:"invoices"},
  {k:"hrPayroll",label:"Payroll",icon:"wallet",module:"payroll"},
  {k:"hrReports",label:"Reports",icon:"trend",module:"reports"},
  {k:"hrSettings",label:"Settings",icon:"gear",module:"settings"},
  {k:"hrIntegrations",label:"Integrations",icon:"hex",module:"integrations"},
  {k:"hrPolicies",label:"Policies & sign-off",icon:"shield",module:"policies"},
  {k:"hrRoster",label:"Shift roster",icon:"calendar",module:"roster"},
];
