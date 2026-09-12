/* Additional seed job seekers. The eight hand-written profiles in people.js are the ones used in
   demos and screenshots; these exist so the employer pipeline board has enough distinct candidates
   to carry 5-15 applications across six stages on twenty jobs without the same face repeating. */

const FIRST = ["Aisha","Brandon","Chantal","Dmitri","Elena","Farhan","Gabrielle","Hassan","Isabelle","Jean-Luc",
  "Kavita","Liam","Mireille","Nadia","Oluwaseun","Patrick","Qi","Rosalie","Samuel","Tanya",
  "Uma","Vincent","Wendy","Xavier","Yasmin","Zachary","Anita","Bruno","Camille","Devon",
  "Émile","Fatima","Grace","Hugo","Ivan","Josée","Karim","Lucia","Mathieu","Nina"];
const LAST = ["Tremblay","Nguyen","Singh","O'Brien","Gagnon","Wong","Patel","MacDonald","Roy","Lafleur",
  "Ahmed","Côté","Dubois","Ferreira","Girard","Hughes","Ibrahim","Jensen","Kaur","Leblanc",
  "Martel","Novak","Okafor","Pelletier","Quinn","Rodriguez","Sharma","Thibault","Ursu","Vasquez",
  "Wilson","Xu","Yakubu","Zhang","Bouchard","Campbell","Desjardins","Ellis","Fontaine","Grewal"];

/* Candidate archetypes aimed at the trades, construction-admin and site roles the demo employer
   posts, so the pipeline reads as a plausible applicant mix rather than random noise. */
const ARCHETYPES = [
  { title: "Journeyperson Carpenter", cat: "trades", years: 6, edu: "Apprenticeship / trade certificate", pay: 38, unit: "hr",
    skills: ["Formwork","Framing","Blueprint Reading","Power Tools","Concrete Finishing"] },
  { title: "Construction Labourer", cat: "trades", years: 1, edu: "High school diploma", pay: 24, unit: "hr",
    skills: ["Site Cleanup","Material Handling","Hand Tools","Fall Protection","Team Work"] },
  { title: "Site Superintendent", cat: "trades", years: 12, edu: "College diploma", pay: 105000, unit: "yr",
    skills: ["Site Supervision","Scheduling","COR Safety","Quality Control","Trade Coordination"] },
  { title: "Project Coordinator", cat: "trades", years: 2, edu: "College diploma", pay: 65000, unit: "yr",
    skills: ["RFIs","Submittals","Document Control","MS Project","Site Reporting"] },
  { title: "Heavy Equipment Operator", cat: "trades", years: 7, edu: "Apprenticeship / trade certificate", pay: 40, unit: "hr",
    skills: ["Excavator","Dozer","Grade Control","Pre-shift Inspection","Ground Disturbance"] },
  { title: "Construction Estimator", cat: "trades", years: 5, edu: "College diploma", pay: 92000, unit: "yr",
    skills: ["Quantity Takeoff","Bluebeam","Bid Preparation","Cost Analysis","Subcontractor Bids"] },
  { title: "Safety Officer", cat: "trades", years: 4, edu: "College diploma", pay: 82000, unit: "yr",
    skills: ["NCSO","Hazard Assessment","Incident Investigation","COR Audits","WHMIS"] },
  { title: "Journeyperson Plumber", cat: "trades", years: 8, edu: "Apprenticeship / trade certificate", pay: 42, unit: "hr",
    skills: ["Rough-in","Pipe Fitting","Backflow Prevention","Code Compliance","Pressure Testing"] },
  { title: "Structural Welder", cat: "trades", years: 5, edu: "Apprenticeship / trade certificate", pay: 40, unit: "hr",
    skills: ["CWB Ticket","FCAW","Blueprint Reading","Fit-up","Visual Inspection"] },
  { title: "Site Administrator", cat: "admin", years: 3, edu: "College diploma", pay: 56000, unit: "yr",
    skills: ["Reception","Purchase Orders","Scheduling","MS Office","Records Management"] },
  { title: "Payroll Administrator", cat: "admin", years: 4, edu: "College diploma", pay: 68000, unit: "yr",
    skills: ["Payroll","ROEs","Timesheet Audit","Employment Standards","Attention to Detail"] },
  { title: "BIM Coordinator", cat: "tech", years: 4, edu: "College diploma", pay: 90000, unit: "yr",
    skills: ["Revit","Navisworks","Clash Detection","AutoCAD","Point Clouds"] },
  { title: "Heavy Duty Mechanic", cat: "trades", years: 9, edu: "Apprenticeship / trade certificate", pay: 44, unit: "hr",
    skills: ["Hydraulics","Diesel Engines","Preventive Maintenance","Diagnostics","Welding"] },
  { title: "Field Surveyor", cat: "trades", years: 3, edu: "College diploma", pay: 35, unit: "hr",
    skills: ["Total Station","GPS Layout","As-builts","AutoCAD","Grade Checks"] },
  { title: "Concrete Finisher", cat: "trades", years: 6, edu: "High school diploma", pay: 34, unit: "hr",
    skills: ["Power Trowel","Screeding","Curing","Slab Flatness","Formwork"] },
];

const CITIES = [["Calgary","AB"],["Edmonton","AB"],["Red Deer","AB"],["Fort McMurray","AB"],["Lethbridge","AB"],
  ["Vancouver","BC"],["Surrey","BC"],["Kelowna","BC"],["Toronto","ON"],["Mississauga","ON"],["Hamilton","ON"],["Winnipeg","MB"],["Saskatoon","SK"]];
const ELIGIBLE = ["citizen","citizen","citizen","permit","pr"];
const AREA = { AB: "403", BC: "604", ON: "416", MB: "204", SK: "306" };

const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]+/g, ".");

export const EXTRA_PEOPLE = Array.from({ length: 40 }, (_, i) => {
  const first = FIRST[i % FIRST.length];
  const last = LAST[(i * 7 + 3) % LAST.length];
  const a = ARCHETYPES[i % ARCHETYPES.length];
  const [city, prov] = CITIES[(i * 5 + 1) % CITIES.length];
  const years = Math.max(0, a.years + ((i % 5) - 2));
  return {
    id: `u${100 + i}`,
    name: `${first} ${last}`,
    seed: (i % 8) + 1,
    title: a.title,
    cat: a.cat,
    city, prov,
    years,
    email: `${slug(first)}.${slug(last)}${i}@example.ca`,
    phone: `${AREA[prov] || "289"} 555 ${String(1000 + i).slice(-4)}`,
    skills: a.skills,
    complete: 55 + ((i * 13) % 45),
    edu: a.edu,
    eligible: ELIGIBLE[i % ELIGIBLE.length],
    payMin: a.pay,
    payUnit: a.unit,
    types: i % 6 === 0 ? ["Full Time", "Part Time"] : ["Full Time"],
    modes: a.cat === "trades" ? ["On-site"] : ["On-site", "Hybrid"],
  };
});
