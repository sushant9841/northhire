import { _weekAgo, _dayFromNow, _weekStart, _dayAgo } from "../../helpers/utils.js";

export const SEED_WORKERS = [
  {id:"w1", personId:"u1", status:"active", availability:"available", // Sarah Chen
    onboarded:"2026-01-15", province:"BC", city:"Vancouver",
    payRateFloor:32, payRateTarget:38,
    sinLast3:"217", tdOnFile:true, directDepositOnFile:true, workEligibility:"Canadian citizen", weExpiry:null,
    emergencyContact:{name:"Ken Chen",relation:"Brother",phone:"604 555 0102"},
    documents:[{k:"tdon",label:"TD1 Federal",uploaded:"2026-01-15"},{k:"tdon",label:"TD1 BC",uploaded:"2026-01-15"},{k:"void",label:"Void cheque",uploaded:"2026-01-15"}],
    tickets:["Class 5 Driver","WHMIS","First Aid"],
    notes:"Excellent office admin candidate. Reliable. Bilingual English/Mandarin.",
    vacBalance:412.5, /* $ accrued */
  },
  {id:"w2", personId:"u2", status:"active", availability:"on-assignment", // Marcus Bediako
    onboarded:"2026-02-01", province:"ON", city:"Toronto",
    payRateFloor:38, payRateTarget:44,
    sinLast3:"891", tdOnFile:true, directDepositOnFile:true, workEligibility:"PR",
    emergencyContact:{name:"Ama Bediako",relation:"Wife",phone:"416 555 0187"},
    documents:[{k:"tdon",label:"TD1 Federal",uploaded:"2026-02-01"},{k:"tdon",label:"TD1 Ontario",uploaded:"2026-02-01"},{k:"void",label:"Void cheque",uploaded:"2026-02-01"},{k:"pr",label:"PR Card",uploaded:"2026-02-01",expires:"2028-05-14"}],
    tickets:["Red Seal Electrician","Working at Heights","WHMIS","Fall Protection"],
    notes:"Journeyperson electrician, 8 years commercial. Available for anywhere GTA.",
    vacBalance:1287.60,
  },
  {id:"w3", personId:"u3", status:"active", availability:"on-assignment", // Priya Raman
    onboarded:"2026-01-20", province:"ON", city:"Mississauga",
    payRateFloor:28, payRateTarget:34,
    sinLast3:"445", tdOnFile:true, directDepositOnFile:true, workEligibility:"Canadian citizen",
    emergencyContact:{name:"Anil Raman",relation:"Father",phone:"905 555 0143"},
    documents:[{k:"tdon",label:"TD1 Federal",uploaded:"2026-01-20"},{k:"tdon",label:"TD1 Ontario",uploaded:"2026-01-20"},{k:"void",label:"Void cheque",uploaded:"2026-01-20"},{k:"cert",label:"BLS/CPR Cert",uploaded:"2026-01-20",expires:"2027-01-20"}],
    tickets:["BLS/CPR","Patient Care","N95 fit tested","Immunizations current"],
    notes:"PSW for 4 years. Prefers long-term-care placements. Available days and evenings.",
    vacBalance:823.15,
  },
  {id:"w4", personId:"u4", status:"active", availability:"available",
    onboarded:"2026-02-14", province:"AB", city:"Calgary",
    payRateFloor:24, payRateTarget:28,
    sinLast3:"612", tdOnFile:true, directDepositOnFile:false, workEligibility:"Work permit",weExpiry:"2027-08-30",
    emergencyContact:{name:"Amina Yusuf",relation:"Sister",phone:"403 555 0166"},
    documents:[{k:"tdon",label:"TD1 Federal",uploaded:"2026-02-14"},{k:"tdon",label:"TD1 Alberta",uploaded:"2026-02-14"},{k:"wp",label:"Work permit",uploaded:"2026-02-14",expires:"2027-08-30"}],
    tickets:["Forklift Class 5","WHMIS","Warehouse","Food Safe"],
    notes:"Warehouse and light industrial. Own transportation. Weekend availability.",
    vacBalance:0, /* new, no accrual yet */
  },
  {id:"w5", personId:"u5", status:"active", availability:"available",
    onboarded:"2026-01-08", province:"ON", city:"Ottawa",
    payRateFloor:22, payRateTarget:26,
    sinLast3:"073", tdOnFile:true, directDepositOnFile:true, workEligibility:"Canadian citizen",
    emergencyContact:{name:"Pierre Tremblay",relation:"Husband",phone:"613 555 0135"},
    documents:[{k:"tdon",label:"TD1 Federal",uploaded:"2026-01-08"},{k:"tdon",label:"TD1 Ontario",uploaded:"2026-01-08"},{k:"void",label:"Void cheque",uploaded:"2026-01-08"}],
    tickets:["Smart Serve","Food Safe","POS Systems","Bilingual FR/EN"],
    notes:"Hospitality. 5 yrs FOH. Perfectly bilingual. Prefers downtown Ottawa placements.",
    vacBalance:298.40,
  },
  {id:"w6", personId:"u6", status:"active", availability:"on-assignment",
    onboarded:"2026-01-22", province:"ON", city:"Toronto",
    payRateFloor:30, payRateTarget:36,
    sinLast3:"984", tdOnFile:true, directDepositOnFile:true, workEligibility:"Canadian citizen",
    emergencyContact:{name:"Grace Okafor",relation:"Mother",phone:"647 555 0198"},
    documents:[{k:"tdon",label:"TD1 Federal",uploaded:"2026-01-22"},{k:"tdon",label:"TD1 Ontario",uploaded:"2026-01-22"},{k:"void",label:"Void cheque",uploaded:"2026-01-22"}],
    tickets:["Class 1 AZ Licence","Air Brakes","Cross-border","Long-haul","ELD Logs"],
    notes:"Long-haul driver. Clean abstract. Cross-border qualified. Prefers 2-week rotations.",
    vacBalance:1743.25,
  },
  {id:"w7", personId:"u7", status:"inactive", availability:"unavailable",
    onboarded:"2025-11-04", province:"BC", city:"Surrey",
    payRateFloor:26, payRateTarget:32,
    sinLast3:"336", tdOnFile:true, directDepositOnFile:true, workEligibility:"Canadian citizen",
    emergencyContact:{name:"Rajwant Singh",relation:"Father",phone:"604 555 0176"},
    documents:[{k:"tdon",label:"TD1 Federal",uploaded:"2025-11-04"},{k:"tdon",label:"TD1 BC",uploaded:"2025-11-04"},{k:"void",label:"Void cheque",uploaded:"2025-11-04"}],
    tickets:["Forklift","WHMIS","Warehouse","Order Picker"],
    notes:"On leave until further notice. Placed on multiple assignments 2025.",
    vacBalance:0,
  },
];

/* ─── Clients: employers with a signed MSA and staffing relationship ─── */
export const SEED_STAFFING_CLIENTS = [
  {id:"c1", employerId:"e1", status:"active", signedMsa:"2026-01-10", // PCL Construction
    billToAddress:"PCL Constructors Canada Inc., 5410 99 St NW, Edmonton AB T6E 3P4",
    paymentTermsDays:30, poRequired:true, defaultSupervisorEmail:"foreman@pcl.com",
    conversionFeePct:22, /* if client hires the worker permanently */
    creditLimit:250000, currentAR:87400,
    industry:"Construction", markup:38,
    notes:"Pays reliably at 25-30 days. Prefers pre-vetted electricians and general labour. Site foremen approve timesheets."},
  {id:"c2", employerId:"e2", status:"active", signedMsa:"2026-02-01", // Sinai Health
    billToAddress:"Sinai Health, 600 University Ave, Toronto ON M5G 1X5",
    paymentTermsDays:45, poRequired:true, defaultSupervisorEmail:"scheduling@sinai.ca",
    conversionFeePct:20,
    creditLimit:500000, currentAR:134500,
    industry:"Healthcare", markup:42,
    notes:"Requires N95 fit tested workers, current immunizations, VSS. Slow payer (avg 40 days)."},
  {id:"c3", employerId:"e4", status:"active", signedMsa:"2026-02-14", // Loblaw
    billToAddress:"Loblaw Companies, 1 President's Choice Cir, Brampton ON L6Y 5S5",
    paymentTermsDays:30, poRequired:true, defaultSupervisorEmail:"dc-supervisor@loblaw.ca",
    conversionFeePct:18,
    creditLimit:400000, currentAR:56200,
    industry:"Retail", markup:36,
    notes:"DC placements primarily. Peak season Aug-Dec. Sunday/holiday premiums apply."},
  {id:"c4", employerId:"e11", status:"active", signedMsa:"2026-03-01", // Air Canada
    billToAddress:"Air Canada, 7373 Boul Côte-Vertu O, Saint-Laurent QC H4S 1Z3",
    paymentTermsDays:60, poRequired:true, defaultSupervisorEmail:"ground-ops@aircanada.ca",
    conversionFeePct:20,
    creditLimit:750000, currentAR:212300,
    industry:"Transportation", markup:40,
    notes:"YYZ ground handling. Federally regulated — Canada Labour Code applies not ESA."},
  {id:"c5", employerId:"e5", status:"prospect", signedMsa:null, // Cactus
    billToAddress:"Cactus Restaurants, 1085 Canada Pl, Vancouver BC V6C 0C3",
    paymentTermsDays:15, poRequired:false, defaultSupervisorEmail:"gm@cactus.ca",
    conversionFeePct:15,
    creditLimit:75000, currentAR:0,
    industry:"Hospitality", markup:32,
    notes:"MSA sent 2026-08-15. Awaiting signature. Interested in FOH staff for Vancouver locations."},
];

/* ─── Job Orders: client requests for workers ─── */
export const SEED_JOB_ORDERS = [
  {id:"jo1", client:"c1", createdAt:Date.now()-7*864e5, status:"open", urgency:"high",
    title:"Journeyperson Electricians — Commercial Site", positions:5, filled:2,
    location:"Calgary AB — Foothills Hospital expansion", province:"AB",
    startDate:"2026-09-15", endDate:"2027-03-15", ongoing:false,
    shiftPattern:"Mon-Fri 7am-3:30pm", overtimeAvailable:true,
    payRate:42, billRate:60, mustHave:["Red Seal Electrician","Working at Heights","Fall Protection"], niceToHave:["Blueprint Reading"],
    supervisor:"Jim Halstead", supervisorEmail:"jim.h@pcl.com", supervisorPhone:"403 555 0102",
    ppe:"Client provides hard hat, high-vis, and gloves. Workers supply steel-toe boots.",
    notes:"Phase 2 of hospital expansion. Fast-track. Overtime expected — $63/hr bill on OT hours.",
  },
  {id:"jo2", client:"c2", createdAt:Date.now()-4*864e5, status:"open", urgency:"high",
    title:"Personal Support Workers — Long-Term Care", positions:8, filled:3,
    location:"Toronto ON — Bridgepoint Active Healthcare", province:"ON",
    startDate:"2026-09-08", endDate:null, ongoing:true,
    shiftPattern:"12-hr shifts, 3-on 4-off rotating", overtimeAvailable:true,
    payRate:29, billRate:44, mustHave:["PSW Certificate","BLS/CPR","N95 fit tested"], niceToHave:["LTC experience","VSS current"],
    supervisor:"Fatima Yousef", supervisorEmail:"fyousef@sinai.ca", supervisorPhone:"416 586 4800 x3241",
    ppe:"Full PPE provided on site. Two-day site orientation before first shift.",
    notes:"Ongoing coverage for chronic PSW shortage. Prefer workers who can commit 6+ months.",
  },
  {id:"jo3", client:"c3", createdAt:Date.now()-2*864e5, status:"open", urgency:"medium",
    title:"Distribution Centre — Order Pickers & Forklift", positions:12, filled:5,
    location:"Brampton ON — Loblaw DC", province:"ON",
    startDate:"2026-09-02", endDate:"2026-12-24", ongoing:false,
    shiftPattern:"3 shifts available: 6am-2pm, 2pm-10pm, 10pm-6am", overtimeAvailable:false,
    payRate:22, billRate:32, mustHave:["Forklift Class 5","WHMIS","Warehouse"], niceToHave:["RF scanner"],
    supervisor:"Ravi Persaud", supervisorEmail:"rpersaud@loblaw.ca", supervisorPhone:"905 555 0189",
    ppe:"Client provides high-vis. Steel-toe required.",
    notes:"Peak season Q4 ramp. $2/hr shift premium on nights. Sunday +50%.",
  },
  {id:"jo4", client:"c4", createdAt:Date.now()-14*864e5, status:"open", urgency:"low",
    title:"Ramp Agents — YYZ Ground Operations", positions:4, filled:1,
    location:"Toronto Pearson (YYZ)", province:"ON",
    startDate:"2026-10-01", endDate:null, ongoing:true,
    shiftPattern:"Rotating shifts, incl weekends and holidays", overtimeAvailable:true,
    payRate:26, billRate:38, mustHave:["Class G Driver","Clean abstract","Airside pass eligibility","Physical fitness"], niceToHave:["Ground handling experience"],
    supervisor:"Anne-Marie Charest", supervisorEmail:"acharest@aircanada.ca", supervisorPhone:"905 555 0245",
    ppe:"Client provides full uniform, PPE, and airside pass.",
    notes:"Federally regulated. 60-day security clearance before start.",
  },
  {id:"jo5", client:"c1", createdAt:Date.now()-30*864e5, status:"filled", urgency:"medium",
    title:"General Labourers — Site Prep", positions:6, filled:6,
    location:"Edmonton AB — LRT Southeast", province:"AB",
    startDate:"2026-07-15", endDate:"2026-10-31", ongoing:false,
    shiftPattern:"Mon-Fri 6am-2:30pm", overtimeAvailable:true,
    payRate:24, billRate:35, mustHave:["WHMIS","CSTS"], niceToHave:[],
    supervisor:"Tom Whyte", supervisorEmail:"tom.w@pcl.com", supervisorPhone:"780 555 0104",
    ppe:"Client provides all site PPE.",
    notes:"Phase 3 of LRT. All positions filled 2026-07-20.",
  },
  {id:"jo6", client:"c2", createdAt:Date.now()-45*864e5, status:"closed", urgency:"low",
    title:"Ward Clerk — Bridgepoint", positions:1, filled:1,
    location:"Toronto ON — Bridgepoint", province:"ON",
    startDate:"2026-06-01", endDate:"2026-08-31", ongoing:false,
    shiftPattern:"Mon-Fri 8am-4pm", overtimeAvailable:false,
    payRate:24, billRate:34, mustHave:["Medical Office Admin","MS Office"], niceToHave:["EMR experience"],
    supervisor:"Fatima Yousef", supervisorEmail:"fyousef@sinai.ca", supervisorPhone:"416 586 4800 x3241",
    ppe:"N/A office-based role.",
    notes:"Summer coverage. Filled and completed.",
  },
];

/* ─── Assignments: worker × client × job order ─── */

export const SEED_ASSIGNMENTS = [
  {id:"a1", worker:"w2", client:"c1", jobOrder:"jo1", status:"active",
    startDate:_weekAgo(3), endDate:_dayFromNow(180), ongoing:false,
    payRate:44, billRate:63, /* premium for skilled electrician */
    supervisor:"Jim Halstead", supervisorEmail:"jim.h@pcl.com",
    site:"Calgary AB — Foothills Hospital expansion",
    shiftPattern:"Mon-Fri 7am-3:30pm, some Saturdays",
    notes:"On Phase 2 electrical rough-in. Foreman very happy — asked us to send more like this."},
  {id:"a2", worker:"w3", client:"c2", jobOrder:"jo2", status:"active",
    startDate:_weekAgo(6), endDate:null, ongoing:true,
    payRate:31, billRate:44,
    supervisor:"Fatima Yousef", supervisorEmail:"fyousef@sinai.ca",
    site:"Toronto ON — Bridgepoint Active Healthcare",
    shiftPattern:"12-hr shifts, 3-on 4-off",
    notes:"Excellent feedback from ward. Requested repeat placements."},
  {id:"a3", worker:"w6", client:"c1", jobOrder:"jo5", status:"active",
    startDate:_weekAgo(4), endDate:_dayFromNow(45), ongoing:false,
    payRate:36, billRate:52,
    supervisor:"Tom Whyte", supervisorEmail:"tom.w@pcl.com",
    site:"Edmonton AB — LRT Southeast",
    shiftPattern:"Mon-Fri 6am-2:30pm",
    notes:"Long-haul off, took site labour role between rotations. Reliable."},
  {id:"a4", worker:"w1", client:"c2", jobOrder:null, status:"completed",
    startDate:_weekAgo(10), endDate:_weekAgo(2),
    payRate:32, billRate:46,
    supervisor:"Fatima Yousef", supervisorEmail:"fyousef@sinai.ca",
    site:"Toronto ON — Sinai Health admin",
    shiftPattern:"Mon-Fri 9am-5pm",
    notes:"Short-term admin coverage. Completed on time. Available again."},
  {id:"a5", worker:"w7", client:"c3", jobOrder:null, status:"completed",
    startDate:_weekAgo(20), endDate:_weekAgo(6),
    payRate:22, billRate:32,
    supervisor:"Ravi Persaud", supervisorEmail:"rpersaud@loblaw.ca",
    site:"Brampton ON — Loblaw DC",
    shiftPattern:"6am-2pm",
    notes:"Completed peak season role. Worker on leave since."},
];

/* ─── Timesheets: one per worker per assignment per week ─── */

export const SEED_TIMESHEETS = [
  /* Marcus, this week — draft */
  {id:"ts1", assignment:"a1", worker:"w2", weekStart:_weekStart(0), status:"draft",
    hours:{mon:8,tue:8,wed:8,thu:8,fri:0,sat:0,sun:0}, otHours:0,
    submittedAt:null, approvedAt:null, approvedBy:null, notes:""},
  /* Marcus, last week — approved */
  {id:"ts2", assignment:"a1", worker:"w2", weekStart:_weekStart(1), status:"approved",
    hours:{mon:8,tue:8,wed:8,thu:8,fri:8,sat:0,sun:0}, otHours:0,
    submittedAt:Date.now()-6*864e5, approvedAt:Date.now()-5*864e5, approvedBy:"jim.h@pcl.com", notes:""},
  /* Marcus, 2 wks ago — approved with OT */
  {id:"ts3", assignment:"a1", worker:"w2", weekStart:_weekStart(2), status:"approved",
    hours:{mon:8,tue:10,wed:8,thu:10,fri:8,sat:6,sun:0}, otHours:10,
    submittedAt:Date.now()-13*864e5, approvedAt:Date.now()-12*864e5, approvedBy:"jim.h@pcl.com", notes:"OT for shutdown week"},
  /* Priya, this week — submitted (awaiting approval) */
  {id:"ts4", assignment:"a2", worker:"w3", weekStart:_weekStart(0), status:"submitted",
    hours:{mon:12,tue:0,wed:0,thu:12,fri:12,sat:0,sun:12}, otHours:0,
    submittedAt:Date.now()-1*864e5, approvedAt:null, approvedBy:null, notes:"3-on 4-off schedule"},
  /* Priya, last week — approved */
  {id:"ts5", assignment:"a2", worker:"w3", weekStart:_weekStart(1), status:"approved",
    hours:{mon:0,tue:12,wed:12,thu:12,fri:0,sat:12,sun:0}, otHours:0,
    submittedAt:Date.now()-8*864e5, approvedAt:Date.now()-7*864e5, approvedBy:"fyousef@sinai.ca", notes:""},
  /* Priya, 2 wks ago */
  {id:"ts6", assignment:"a2", worker:"w3", weekStart:_weekStart(2), status:"approved",
    hours:{mon:12,tue:0,wed:0,thu:12,fri:12,sat:0,sun:12}, otHours:0,
    submittedAt:Date.now()-15*864e5, approvedAt:Date.now()-14*864e5, approvedBy:"fyousef@sinai.ca", notes:""},
  /* Chidi, this week — draft */
  {id:"ts7", assignment:"a3", worker:"w6", weekStart:_weekStart(0), status:"draft",
    hours:{mon:8,tue:8,wed:8,thu:0,fri:0,sat:0,sun:0}, otHours:0,
    submittedAt:null, approvedAt:null, approvedBy:null, notes:""},
  /* Chidi, last week — approved */
  {id:"ts8", assignment:"a3", worker:"w6", weekStart:_weekStart(1), status:"approved",
    hours:{mon:8,tue:8,wed:8,thu:8,fri:8,sat:0,sun:0}, otHours:0,
    submittedAt:Date.now()-6*864e5, approvedAt:Date.now()-5*864e5, approvedBy:"tom.w@pcl.com", notes:""},
];

/* ─── Payroll runs (staffing side, separate from HR Suite) ─── */
export const SEED_STAFFING_PAYRUNS = [
  {id:"spr1", periodStart:_weekStart(3), periodEnd:_weekStart(1), runDate:_weekStart(1),
    status:"paid", workers:4, totalHours:320, totalGross:12480, totalNet:9350,
    lines:[
      {worker:"w2", hours:80, gross:3520, net:2630, otHrs:0},
      {worker:"w3", hours:96, gross:2976, net:2225, otHrs:0},
      {worker:"w6", hours:80, gross:2880, net:2155, otHrs:0},
      {worker:"w1", hours:64, gross:2048, net:1530, otHrs:0}, /* short assignment */
    ],
  },
  {id:"spr2", periodStart:_weekStart(5), periodEnd:_weekStart(3), runDate:_weekStart(3),
    status:"paid", workers:3, totalHours:288, totalGross:11440, totalNet:8580,
    lines:[
      {worker:"w2", hours:88, gross:3872, net:2900, otHrs:8},
      {worker:"w3", hours:96, gross:2976, net:2225, otHrs:0},
      {worker:"w6", hours:80, gross:2880, net:2155, otHrs:0},
      {worker:"w1", hours:24, gross:768, net:575, otHrs:0},
    ],
  },
  /* Current pending run */
  {id:"spr3", periodStart:_weekStart(1), periodEnd:_weekStart(-1), runDate:_dayFromNow(2),
    status:"pending", workers:3, totalHours:216, totalGross:9184, totalNet:6890,
    lines:[
      {worker:"w2", hours:80, gross:3520, net:2635, otHrs:0},
      {worker:"w3", hours:72, gross:2232, net:1670, otHrs:0},
      {worker:"w6", hours:64, gross:2304, net:1725, otHrs:0},
    ],
  },
];

/* ─── Client invoices (staffing side, weekly cycle) ─── */
export const SEED_STAFFING_INVOICES = [
  {id:"si1", number:"SI-2026-1041", client:"c1", weekStart:_weekStart(4), issued:_weekStart(3),
    due:_dayAgo(9), status:"paid", paidOn:_dayAgo(7),
    lines:[{assignment:"a1", worker:"w2", hours:80, billRate:63, otHrs:0, subtotal:5040},
           {assignment:"a3", worker:"w6", hours:80, billRate:52, otHrs:0, subtotal:4160}],
    subtotal:9200, gst:0, hst:1196, total:10396, po:"PCL-2026-887145"},
  {id:"si2", number:"SI-2026-1042", client:"c2", weekStart:_weekStart(4), issued:_weekStart(3),
    due:_dayAgo(9)+"", status:"paid", paidOn:_dayAgo(2),
    lines:[{assignment:"a2", worker:"w3", hours:96, billRate:44, otHrs:0, subtotal:4224}],
    subtotal:4224, gst:0, hst:549.12, total:4773.12, po:"SIN-2026-4471"},
  {id:"si3", number:"SI-2026-1053", client:"c1", weekStart:_weekStart(2), issued:_weekStart(1),
    due:_dayFromNow(15), status:"pending",
    lines:[{assignment:"a1", worker:"w2", hours:88, billRate:63, otHrs:8, subtotal:6048},
           {assignment:"a3", worker:"w6", hours:80, billRate:52, otHrs:0, subtotal:4160}],
    subtotal:10208, gst:0, hst:1327.04, total:11535.04, po:"PCL-2026-887145"},
  {id:"si4", number:"SI-2026-1054", client:"c2", weekStart:_weekStart(2), issued:_weekStart(1),
    due:_dayFromNow(30), status:"pending",
    lines:[{assignment:"a2", worker:"w3", hours:96, billRate:44, otHrs:0, subtotal:4224}],
    subtotal:4224, gst:0, hst:549.12, total:4773.12, po:"SIN-2026-4471"},
  /* Overdue */
  {id:"si5", number:"SI-2026-1027", client:"c4", weekStart:_weekStart(9), issued:_weekStart(8),
    due:_dayAgo(5), status:"overdue",
    lines:[{assignment:null, worker:null, hours:80, billRate:38, otHrs:0, subtotal:3040}],
    subtotal:3040, gst:0, hst:395.20, total:3435.20, po:"AC-2026-887"},
];

/* ─── Placements: permanent hire deals ─── */
export const SEED_PLACEMENTS = [
  {id:"pl1", client:"c1", candidate:"w4", role:"Warehouse Lead", offeredAt:_dayAgo(60),
    startDate:_dayAgo(45), status:"guaranteed", salary:58000, feePct:20, fee:11600,
    guaranteeEnds:_dayFromNow(45), invoicedOn:_dayAgo(43), paidOn:_dayAgo(25), notes:"Filled quickly. Client happy."},
  {id:"pl2", client:"c3", candidate:null, role:"Assistant DC Manager", offeredAt:_dayAgo(10),
    startDate:_dayFromNow(20), status:"accepted", salary:72000, feePct:22, fee:15840,
    guaranteeEnds:_dayFromNow(110), invoicedOn:null, paidOn:null, notes:"Candidate accepted offer. Awaiting start date. Invoice on start."},
  {id:"pl3", client:"c2", candidate:null, role:"Registered Nurse — ICU", offeredAt:_dayAgo(4),
    startDate:null, status:"in-progress", salary:98000, feePct:22, fee:21560,
    guaranteeEnds:null, invoicedOn:null, paidOn:null, notes:"Three candidates in interview. Fast-track requested."},
  /* One that got clawed back */
  {id:"pl4", client:"c1", candidate:null, role:"Site Superintendent", offeredAt:_dayAgo(180),
    startDate:_dayAgo(160), status:"clawed-back", salary:110000, feePct:22, fee:24200,
    guaranteeEnds:_dayAgo(70), invoicedOn:_dayAgo(158), paidOn:_dayAgo(135), clawbackReason:"Candidate resigned week 8",
    replacementDue:true, notes:"Owe PCL a replacement. Currently sourcing."},
];

/* ─── Job categorization: which jobs are direct-employer vs agency ─── */
/* We add a `hiringType` to each existing job. For seed: mark some existing jobs as agency-listed */
/* Job hiring type on public listings:
   - "direct"      → posted by the employer, they hire directly (99% of listings)
   - "agency-perm" → posted by NorthHire Staffing for a client; permanent placement
   Agency contract work is NOT a public listing — those are internal job orders
   the agency fills from its bench. Workers opt in as a bench member via account. */
export const AGENCY_PERM_JOB_IDS = new Set(["j5","j15","j24"]); /* Agency permanent placements */
export const AGENCY_LISTED_JOB_IDS = new Set(); /* Empty — no public contract listings */

export const SEED_AGENCY_LICENSE="ON-THA-2026-4471";

/* ─── Agency Shell nav (dark sidebar like HR Suite) ─── */
export const AGENCY_MODULES=[
  {k:"agencyDashboard",label:"Dashboard",icon:"home",section:"main"},
  {k:"agencyJobOrders",label:"Job orders",icon:"briefcase",section:"main",badge:"openOrders"},
  {k:"agencyBench",label:"Bench",icon:"users",section:"main"},
  {k:"agencyAssignments",label:"Assignments",icon:"activity",section:"main"},
  {k:"agencyTimesheets",label:"Timesheets",icon:"clock",section:"main",badge:"submittedTimesheets"},
  {k:"agencyPayroll",label:"Payroll",icon:"wallet",section:"ops"},
  {k:"agencyInvoicing",label:"Invoicing",icon:"file",section:"ops",badge:"overdueInvoices"},
  {k:"agencyPlacements",label:"Placements",icon:"award",section:"main"},
  {k:"agencyClients",label:"Clients",icon:"building",section:"main"},
  {k:"agencyWorkers",label:"Workers",icon:"user",section:"main"},
  {k:"agencyMargins",label:"Margins",icon:"trend",section:"insights"},
  {k:"agencyCompliance",label:"Compliance",icon:"shield",section:"insights"},
  {k:"agencyBranches",label:"Branches",icon:"building",section:"insights"},
];
