export const CATS=[
  {id:"trades",label:"Skilled Trades",icon:"tool",scene:"trades",n:3120},
  {id:"health",label:"Healthcare & Support",icon:"pulse",scene:"care",n:2840},
  {id:"transport",label:"Transport & Logistics",icon:"truck",scene:"road",n:2610},
  {id:"retail",label:"Retail & Customer Care",icon:"cart",scene:"office",n:2380},
  {id:"hosp",label:"Hospitality & Food",icon:"chef",scene:"kitchen",n:1970},
  {id:"factory",label:"Manufacturing & Warehouse",icon:"factory",scene:"warehouse",n:1740},
  {id:"admin",label:"Office & Administration",icon:"file",scene:"office",n:1520},
  {id:"edu",label:"Education & Childcare",icon:"cap",scene:"learn",n:1180},
  {id:"finance",label:"Finance & Insurance",icon:"wallet",scene:"money",n:960},
  {id:"tech",label:"IT & Software",icon:"globe",scene:"office",n:1340},
  {id:"agri",label:"Agriculture & Fishing",icon:"leaf",scene:"trades",n:720},
  {id:"security",label:"Security & Cleaning",icon:"shield",scene:"safety",n:880},
];
export const CATM=Object.fromEntries(CATS.map(c=>[c.id,c]));
export const PROVS=["Alberta","British Columbia","Manitoba","New Brunswick","Newfoundland & Labrador","Nova Scotia",
  "Ontario","Prince Edward Island","Quebec","Saskatchewan","Northwest Territories","Nunavut","Yukon"];
export const PCODE={Alberta:"AB","British Columbia":"BC",Manitoba:"MB","New Brunswick":"NB","Newfoundland & Labrador":"NL",
  "Nova Scotia":"NS",Ontario:"ON","Prince Edward Island":"PE",Quebec:"QC",Saskatchewan:"SK",
  "Northwest Territories":"NT",Nunavut:"NU",Yukon:"YT"};

export const STAGES=["Applied","Reviewed","Shortlisted","Interview","Offer","Hired"];

export const CV_TEMPLATES=[
 {id:"classic",name:"Classic",desc:"Single column, ATS-safe. The default choice for trades, healthcare and office roles."},
 {id:"modern",name:"Modern",desc:"Accent sidebar with skills and contact details. Good for office and tech roles."},
 {id:"compact",name:"Compact",desc:"Dense one-page layout. Best when you have a long history to fit."},
 {id:"executive",name:"Executive",desc:"Serif headings with generous spacing. Good for senior, leadership or professional-services roles."},
 {id:"skills-first",name:"Skills-first",desc:"Skills and certifications at the top, experience below. Best for early-career and career-change applications."},
];

export const PLANS={
  Free:{price:0,jobs:1,seats:1,messages:"limited",messagesPerMonth:20,interviews:false,talentPool:false,csvImport:false,analytics:"basic",featured:0,branded:false,articles:false,trainings:false,hrSuite:false,api:false,sso:false,manager:false,customStages:false,bulkActions:false},
  Growth:{price:149,jobs:10,seats:5,messages:true,messagesPerMonth:Infinity,interviews:true,talentPool:true,csvImport:true,analytics:"full",featured:2,branded:true,articles:true,trainings:true,hrSuite:false,api:false,sso:false,manager:false,customStages:true,bulkActions:true},
  Enterprise:{price:599,jobs:Infinity,seats:Infinity,messages:true,messagesPerMonth:Infinity,interviews:true,talentPool:true,csvImport:true,analytics:"full",featured:Infinity,branded:true,articles:true,trainings:true,hrSuite:true,api:true,sso:true,manager:true,customStages:true,bulkActions:true}
};
/* Human-readable requirement per feature — used in tooltips */
export const PLAN_REQUIRES={
  talentPool:"Growth", interviews:"Growth", articles:"Growth", trainings:"Growth",
  csvImport:"Growth", customStages:"Growth", bulkActions:"Growth", branded:"Growth", messages:"Growth",
  hrSuite:"Enterprise", api:"Enterprise", sso:"Enterprise", manager:"Enterprise"
};
export const PLAN_ORDER=["Free","Growth","Enterprise"];
