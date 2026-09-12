import { EXTRA_PEOPLE } from "./peopleExtra.js";

const FLAGSHIP_PEOPLE=[
 {id:"u1",name:"Sarah Chen",seed:1,title:"Senior Software Engineer",cat:"tech",city:"Toronto",prov:"ON",years:6,email:"sarah.chen@example.ca",phone:"416 555 0100",
  skills:["TypeScript","React","Node.js","PostgreSQL","REST APIs","Git"],complete:82,edu:"Bachelor's degree",eligible:"citizen",payMin:105000,payUnit:"yr",types:["Full Time"],modes:["Remote","Hybrid"]},
 {id:"u2",name:"Marcus Bediako",seed:3,title:"Journeyperson Electrician",cat:"trades",city:"Calgary",prov:"AB",years:8,email:"marcus.b@example.ca",phone:"403 555 0142",
  skills:["Red Seal","Commercial Wiring","Blueprint Reading","CSA Code","Conduit Bending","Fall Protection"],complete:94,edu:"Apprenticeship / trade certificate",eligible:"citizen",payMin:44,payUnit:"hr",types:["Full Time"],modes:["On-site"]},
 {id:"u3",name:"Priya Raman",seed:2,title:"Registered Nurse",cat:"health",city:"Toronto",prov:"ON",years:4,email:"priya.r@example.ca",phone:"647 555 0188",
  skills:["CNO Registration","BLS","Patient Assessment","IV Therapy","Electronic Charting"],complete:88,edu:"Bachelor's degree",eligible:"permit",payMin:41,payUnit:"hr",types:["Full Time","Part Time"],modes:["On-site"]},
 {id:"u4",name:"Jomar Villanueva",seed:5,title:"AZ Long Haul Driver",cat:"transport",city:"Moncton",prov:"NB",years:6,email:"jomar.v@example.ca",phone:"506 555 0177",
  skills:["Class 1 Licence","Air Brakes","ELD Logs","Cross-border","Pre-trip Inspection"],complete:76,edu:"High school diploma",eligible:"citizen",payMin:0.6,payUnit:"hr",types:["Full Time"],modes:["On-site"]},
 {id:"u5",name:"Amelie Fortin",seed:4,title:"Administrative Assistant",cat:"admin",city:"Montreal",prov:"QC",years:3,email:"amelie.f@example.ca",phone:"514 555 0165",
  skills:["MS Office","Calendar Management","Bilingual FR/EN","Minute Taking","Data Entry"],complete:71,edu:"College diploma",eligible:"citizen",payMin:48000,payUnit:"yr",types:["Full Time"],modes:["Hybrid","On-site"]},
 {id:"u6",name:"Daniel Kovacs",seed:6,title:"CNC Machinist",cat:"factory",city:"Guelph",prov:"ON",years:5,email:"daniel.k@example.ca",phone:"519 555 0133",
  skills:["CNC Operation","G-Code","Blueprint Reading","GD&T","Micrometers","Quality Control"],complete:85,edu:"College diploma",eligible:"citizen",payMin:30,payUnit:"hr",types:["Full Time"],modes:["On-site"]},
 {id:"u7",name:"Linda Osei",seed:8,title:"Line Cook",cat:"hosp",city:"Vancouver",prov:"BC",years:2,email:"linda.o@example.ca",phone:"604 555 0121",
  skills:["Grill Station","Food Safe Level 1","Knife Skills","Portion Control"],complete:64,edu:"High school diploma",eligible:"student",payMin:23,payUnit:"hr",types:["Full Time","Part Time"],modes:["On-site"]},
 {id:"u8",name:"Omar Haddad",seed:7,title:"Warehouse Associate",cat:"factory",city:"Surrey",prov:"BC",years:1,email:"omar.h@example.ca",phone:"778 555 0190",
  skills:["Order Picking","RF Scanner","Pallet Jack","Lifting 50 lb","Team Work"],complete:58,edu:"High school diploma",eligible:"permit",payMin:22,payUnit:"hr",types:["Full Time"],modes:["On-site"]},
];

export const SEED_PEOPLE=[...FLAGSHIP_PEOPLE, ...EXTRA_PEOPLE];
