/* Group chat threads pre-seeded so signing in shows a live company */
export const HR_CHATS=[
  {id:"gc1",kind:"group",name:"# general",members:"all",about:"Company-wide watercooler",createdBy:"emp1",createdAt:Date.now()-1000*60*60*24*365},
  {id:"gc2",kind:"group",name:"# field-ops",members:"d1",about:"Field operations coordination",createdBy:"emp3",createdAt:Date.now()-1000*60*60*24*300},
  {id:"gc3",kind:"group",name:"# safety",members:"d3,emp1,emp2,emp3",about:"Safety incidents and reminders",createdBy:"emp5",createdAt:Date.now()-1000*60*60*24*280},
  {id:"gc4",kind:"group",name:"# leadership",members:"emp1,emp2,emp3,emp5,emp7,emp10",about:"Exec discussions",createdBy:"emp1",createdAt:Date.now()-1000*60*60*24*400},
  {id:"gc5",kind:"group",name:"# hr-team",members:"d4",about:"HR internal",createdBy:"emp7",createdAt:Date.now()-1000*60*60*24*250},
  {id:"gc6",kind:"group",name:"# finance",members:"d5",about:"Finance internal",createdBy:"emp10",createdAt:Date.now()-1000*60*60*24*250},
];

export const HR_CHAT_MESSAGES=[
  {id:"hm1",chat:"gc1",from:"emp1",text:"Great work team — Fire Hall 7 wrapped 3 weeks ahead of schedule. Coffee on me tomorrow.",at:Date.now()-1000*60*60*20},
  {id:"hm2",chat:"gc1",from:"emp7",text:"Congrats everyone! Adding a badge for the whole field ops crew.",at:Date.now()-1000*60*60*19},
  {id:"hm3",chat:"gc2",from:"emp3",text:"Reminder: Working at Heights refresher this Wednesday 9am. Mandatory for anyone above 3m.",at:Date.now()-1000*60*60*8},
  {id:"hm4",chat:"gc2",from:"emp4",text:"Got it. Will confirm site crew attendance.",at:Date.now()-1000*60*60*7},
  {id:"hm5",chat:"gc3",from:"emp5",text:"Two near-misses reported at the Suncor site. Reviewing today — please send incident details.",at:Date.now()-1000*60*60*30},
  {id:"hm6",chat:"gc4",from:"emp1",text:"Union session 3 confirmed for Sept 5. Full day, off-site.",at:Date.now()-1000*60*60*48},
  {id:"hm7",chat:"gc5",from:"emp7",text:"3 offers going out this afternoon. Standing by for signed acceptances.",at:Date.now()-1000*60*60*4},
  {id:"hm8",chat:"gc6",from:"emp10",text:"August payroll runs Thursday. Nadia has the file — everyone please review the summary by Wednesday.",at:Date.now()-1000*60*60*6},
];
