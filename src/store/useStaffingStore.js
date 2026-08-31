import { useState } from "react";
import { _fmtDate } from "../helpers/utils.js";
import {
  SEED_WORKERS, SEED_STAFFING_CLIENTS, SEED_JOB_ORDERS, SEED_ASSIGNMENTS, SEED_TIMESHEETS,
  SEED_STAFFING_PAYRUNS, SEED_STAFFING_INVOICES, SEED_PLACEMENTS,
  AGENCY_PERM_JOB_IDS, AGENCY_LISTED_JOB_IDS,
} from "./seed/agency.js";

const STAFFING_RATES = {
  ON: {cpp:0.0595,ei:0.0221,eht:0.0195,wsib:0.028,vac:0.04,stat:0.0384,label:"Ontario"},
  AB: {cpp:0.0595,ei:0.0221,eht:0,   wsib:0.024,vac:0.04,stat:0.0384,label:"Alberta"},
  BC: {cpp:0.0595,ei:0.0221,eht:0.0195,wsib:0.026,vac:0.04,stat:0.0384,label:"British Columbia"},
  QC: {cpp:0.064, ei:0.0192,eht:0.0206,wsib:0.021,vac:0.04,stat:0.0384,label:"Québec"},
  MB: {cpp:0.0595,ei:0.0221,eht:0.0215,wsib:0.019,vac:0.04,stat:0.0384,label:"Manitoba"},
  SK: {cpp:0.0595,ei:0.0221,eht:0,   wsib:0.021,vac:0.04,stat:0.0384,label:"Saskatchewan"},
  NS: {cpp:0.0595,ei:0.0221,eht:0,   wsib:0.024,vac:0.04,stat:0.0384,label:"Nova Scotia"},
  NB: {cpp:0.0595,ei:0.0221,eht:0,   wsib:0.021,vac:0.04,stat:0.0384,label:"New Brunswick"},
};

/* Given a pay rate and province, compute true cost and margin at a bill rate. */
function calcStaffingEconomics(pay,bill,prov,benefitsPerHr=0){
  const r=STAFFING_RATES[prov]||STAFFING_RATES.ON;
  const cpp=pay*r.cpp; const ei=pay*r.ei*1.4; const eht=pay*r.eht;
  const wsib=pay*r.wsib; const vac=pay*r.vac; const stat=pay*r.stat;
  const admin=1.00; /* fixed admin per hour */
  const burden=cpp+ei+eht+wsib+vac+stat+admin+benefitsPerHr;
  const trueCost=pay+burden;
  const margin=bill-trueCost;
  const marginPct=bill>0?(margin/bill)*100:0;
  const markupPct=pay>0?((bill-pay)/pay)*100:0;
  return {pay,bill,burden:round2(burden),trueCost:round2(trueCost),
    margin:round2(margin),marginPct:round1(marginPct),markupPct:round1(markupPct),
    breakdown:{cpp:round2(cpp),ei:round2(ei),eht:round2(eht),wsib:round2(wsib),vac:round2(vac),stat:round2(stat),admin:round2(admin),benefits:round2(benefitsPerHr)}};
}
function round2(n){return Math.round(n*100)/100;}
function round1(n){return Math.round(n*10)/10;}

/* ─── The staffing agency itself is a tenant ─── */
const STAFFING_AGENCY = {
  id:"stf1",
  name:"NorthHire Staffing",
  tagline:"Canadian workers, Canadian workplaces",
  license:"ON-THA-2026-4471", /* Ontario Temp Help Agency license */
  provinces:["ON","AB","BC","QC","MB","SK","NS","NB"],
  founded:"2026-01-01",
  markupFloor:25, /* Below this markup %, warn — losing money */
  markupTarget:38, /* Where we aim */
  markupCeiling:65, /* Above this, uncompetitive */
  payPeriodDays:14, /* biweekly payroll */
  invoiceCycleDays:7, /* weekly client invoicing */
  paymentTermsDefaultDays:30, /* Net 30 default */
  vacationPayMode:"accrue", /* accrue | payout */
};

/* ─── Workers: seekers who have opted in to be represented by the agency ─── */
/* Seeded from existing SEED_PEOPLE — a subset opt in. */

/* ═══════════════════════════════════════════════════════════════════════════
   STAFFING AGENCY — Store hook, exported into main A context
   ═══════════════════════════════════════════════════════════════════════════ */

export function useStaffingStore(_persisted){
  const [workers,setWorkers]=useState(_persisted?.workers||SEED_WORKERS);
  const [staffingClients,setStaffingClients]=useState(_persisted?.staffingClients||SEED_STAFFING_CLIENTS);
  const [jobOrders,setJobOrders]=useState(_persisted?.jobOrders||SEED_JOB_ORDERS);
  const [assignments,setAssignments]=useState(_persisted?.assignments||SEED_ASSIGNMENTS);
  const [timesheets,setTimesheets]=useState(_persisted?.timesheets||SEED_TIMESHEETS);
  const [staffingPayruns,setStaffingPayruns]=useState(_persisted?.staffingPayruns||SEED_STAFFING_PAYRUNS);
  const [staffingInvoices,setStaffingInvoices]=useState(_persisted?.staffingInvoices||SEED_STAFFING_INVOICES);
  const [placements,setPlacements]=useState(_persisted?.placements||SEED_PLACEMENTS);
  /* Agency session — analogous to hrSession, separate from main user */
  const [agencySession,setAgencySession]=useState(_persisted?.agencySession||null);

  /* ─── Lookups ─── */
  const worker=(id)=>workers.find(w=>w.id===id);
  const workerByPersonId=(pid)=>workers.find(w=>w.personId===pid);
  const isWorker=(userId)=>{
    const u=(_persisted?.people||[]).find(p=>p.id===userId);
    return !!workers.find(w=>w.personId===userId);
  };
  const staffingClient=(id)=>staffingClients.find(c=>c.id===id);
  const staffingClientByEmployerId=(eid)=>staffingClients.find(c=>c.employerId===eid);
  const jobOrder=(id)=>jobOrders.find(j=>j.id===id);
  const assignment=(id)=>assignments.find(a=>a.id===id);
  const timesheet=(id)=>timesheets.find(t=>t.id===id);
  const workerAssignments=(wid)=>assignments.filter(a=>a.worker===wid);
  const activeAssignments=()=>assignments.filter(a=>a.status==="active");
  const clientAssignments=(cid)=>assignments.filter(a=>a.client===cid);
  const clientTimesheets=(cid)=>{const asns=clientAssignments(cid).map(a=>a.id);
    return timesheets.filter(t=>asns.includes(t.assignment));};
  const workerTimesheets=(wid)=>timesheets.filter(t=>t.worker===wid);
  const openJobOrders=()=>jobOrders.filter(j=>j.status==="open");

  /* ─── Job hiring type ─── */
  const jobHiringType=(jobId)=>{
    if(AGENCY_LISTED_JOB_IDS.has(jobId))return "agency-contract";
    if(AGENCY_PERM_JOB_IDS.has(jobId))return "agency-perm";
    return "direct";
  };
  const jobHiringLabel=(jobId)=>{
    const t=jobHiringType(jobId);
    if(t==="agency-contract")return "Agency contract — NorthHire Staffing";
    if(t==="agency-perm")return "Agency permanent — placed by NorthHire Staffing";
    return "Direct — hired by employer";
  };

  /* ─── Agency auth ─── */
  const AGENCY_DEMO_PASSWORD="staff2026";
  const AGENCY_STAFF=[
    {loginId:"nadia.singh", name:"Nadia Singh", role:"owner", title:"Founder & Managing Director", seed:14, email:"nadia@northhirestaffing.ca"},
    {loginId:"joel.tremblay", name:"Joël Tremblay", role:"recruiter", title:"Senior Recruiter", seed:9, email:"joel@northhirestaffing.ca"},
    {loginId:"aisha.mohamed", name:"Aisha Mohamed", role:"payroll", title:"Payroll & Compliance", seed:12, email:"aisha@northhirestaffing.ca"},
  ];
  const agencyLogin=(loginId,password,remember)=>{
    const id=(loginId||"").toLowerCase().trim();
    const staff=AGENCY_STAFF.find(s=>s.loginId===id);
    if(!staff)return {ok:false,msg:"No agency account with that login ID"};
    if(password!==AGENCY_DEMO_PASSWORD)return {ok:false,msg:"Password does not match"};
    setAgencySession({staff,at:Date.now(),remember:!!remember});
    return {ok:true,staff};
  };
  const agencyLogout=()=>setAgencySession(null);
  const agencyCurrentStaff=()=>agencySession?.staff||null;

  /* ─── Worker actions ─── */
  const optInAsWorker=(seekerData)=>{
    if(!seekerData||workerByPersonId(seekerData.id))return {ok:false,msg:"Already a worker"};
    const nw={
      id:_uid("w"), personId:seekerData.id, status:"active", availability:"available",
      onboarded:_fmtDate(new Date()),
      province:seekerData.prov?.slice(0,2)?.toUpperCase()||"ON", city:seekerData.city||"",
      payRateFloor:0, payRateTarget:0,
      sinLast3:"", tdOnFile:false, directDepositOnFile:false, workEligibility:"", weExpiry:null,
      emergencyContact:{name:"",relation:"",phone:""},
      documents:[], tickets:seekerData.skills||[], notes:"",
      vacBalance:0
    };
    setWorkers(w=>[...w,nw]);
    return {ok:true,worker:nw};
  };
  const updateWorker=(id,patch)=>setWorkers(w=>w.map(x=>x.id===id?{...x,...patch}:x));
  const setWorkerAvailability=(id,availability)=>updateWorker(id,{availability});

  /* ─── Job order actions ─── */
  const createJobOrder=(data)=>{
    const nj={id:_uid("jo"),createdAt:Date.now(),status:"open",filled:0,urgency:"medium",...data};
    setJobOrders(j=>[...j,nj]);
    return nj;
  };
  const updateJobOrder=(id,patch)=>setJobOrders(j=>j.map(x=>x.id===id?{...x,...patch}:x));
  const closeJobOrder=(id)=>updateJobOrder(id,{status:"closed"});

  /* ─── Assignment actions ─── */
  const createAssignment=(data)=>{
    const na={id:_uid("a"),status:"active",startDate:_fmtDate(new Date()),endDate:null,ongoing:true,...data};
    setAssignments(a=>[...a,na]);
    /* Bump job order filled count */
    if(data.jobOrder){
      updateJobOrder(data.jobOrder,{filled:(jobOrder(data.jobOrder)?.filled||0)+1});
      const jo=jobOrder(data.jobOrder);
      if(jo && jo.filled+1>=jo.positions){updateJobOrder(data.jobOrder,{status:"filled"});}
    }
    /* Mark worker as on-assignment */
    if(data.worker)updateWorker(data.worker,{availability:"on-assignment"});
    return na;
  };
  const endAssignment=(id,endDate)=>{
    const a=assignment(id);
    if(!a)return;
    setAssignments(l=>l.map(x=>x.id===id?{...x,status:"completed",endDate:endDate||_fmtDate(new Date())}:x));
    if(a.worker)updateWorker(a.worker,{availability:"available"});
  };

  /* ─── Timesheet actions ─── */
  const upsertTimesheetDraft=(assignmentId,workerId,weekStart,hours,otHours,notes)=>{
    const existing=timesheets.find(t=>t.assignment===assignmentId&&t.weekStart===weekStart);
    if(existing){
      if(existing.status!=="draft")return {ok:false,msg:"Timesheet already submitted"};
      setTimesheets(l=>l.map(t=>t.id===existing.id?{...t,hours,otHours:otHours||0,notes:notes||""}:t));
      return {ok:true};
    }
    const nt={id:_uid("ts"),assignment:assignmentId,worker:workerId,weekStart,
      status:"draft",hours,otHours:otHours||0,submittedAt:null,approvedAt:null,approvedBy:null,notes:notes||""};
    setTimesheets(l=>[...l,nt]);
    return {ok:true};
  };
  const submitTimesheet=(id)=>{const t=timesheet(id);
    if(!t)return {ok:false,msg:"Not found"};
    if(t.status!=="draft")return {ok:false,msg:"Already submitted"};
    setTimesheets(l=>l.map(x=>x.id===id?{...x,status:"submitted",submittedAt:Date.now()}:x));
    return {ok:true};};
  const approveTimesheet=(id,approver)=>{const t=timesheet(id);
    if(!t)return {ok:false,msg:"Not found"};
    setTimesheets(l=>l.map(x=>x.id===id?{...x,status:"approved",approvedAt:Date.now(),approvedBy:approver||"—"}:x));
    return {ok:true};};
  const rejectTimesheet=(id,reason)=>{const t=timesheet(id);
    if(!t)return {ok:false,msg:"Not found"};
    setTimesheets(l=>l.map(x=>x.id===id?{...x,status:"draft",submittedAt:null,notes:(x.notes||"")+"\n[Returned: "+(reason||"reason not given")+"]"}:x));
    return {ok:true};};

  /* Timesheet math */
  const timesheetTotal=(t)=>{if(!t)return 0;const h=t.hours||{};
    return (h.mon||0)+(h.tue||0)+(h.wed||0)+(h.thu||0)+(h.fri||0)+(h.sat||0)+(h.sun||0);};
  const timesheetGross=(t)=>{if(!t)return 0;const a=assignment(t.assignment);if(!a)return 0;
    const totalHrs=timesheetTotal(t); const regHrs=Math.max(0,totalHrs-(t.otHours||0));
    return regHrs*a.payRate + (t.otHours||0)*a.payRate*1.5;};
  const timesheetBill=(t)=>{if(!t)return 0;const a=assignment(t.assignment);if(!a)return 0;
    const totalHrs=timesheetTotal(t); const regHrs=Math.max(0,totalHrs-(t.otHours||0));
    return regHrs*a.billRate + (t.otHours||0)*a.billRate*1.5;};

  /* ─── Payroll ─── */
  const runStaffingPayroll=(periodStart,periodEnd)=>{
    /* Pull all approved timesheets in period, batch by worker */
    const inPeriod=timesheets.filter(t=>t.status==="approved"&&t.weekStart>=periodStart&&t.weekStart<periodEnd);
    const byWorker={};
    inPeriod.forEach(t=>{const g=timesheetGross(t); const h=timesheetTotal(t);
      if(!byWorker[t.worker])byWorker[t.worker]={hours:0,gross:0,otHrs:0};
      byWorker[t.worker].hours+=h; byWorker[t.worker].gross+=g; byWorker[t.worker].otHrs+=(t.otHours||0);});
    const lines=Object.entries(byWorker).map(([wid,d])=>({worker:wid,hours:d.hours,gross:round2(d.gross),
      net:round2(d.gross*0.7481),otHrs:d.otHrs}));
    const totalHours=lines.reduce((s,l)=>s+l.hours,0);
    const totalGross=round2(lines.reduce((s,l)=>s+l.gross,0));
    const totalNet=round2(lines.reduce((s,l)=>s+l.net,0));
    const run={id:_uid("spr"),periodStart,periodEnd,runDate:_fmtDate(new Date()),
      status:"pending",workers:lines.length,totalHours,totalGross,totalNet,lines};
    setStaffingPayruns(p=>[run,...p]);
    /* Mark timesheets locked */
    setTimesheets(l=>l.map(t=>t.status==="approved"&&t.weekStart>=periodStart&&t.weekStart<periodEnd?{...t,status:"paid"}:t));
    return run;
  };
  const finalizeStaffingPayrun=(id)=>setStaffingPayruns(p=>p.map(x=>x.id===id?{...x,status:"paid"}:x));

  /* ─── Invoicing ─── */
  const generateStaffingInvoices=(weekStart)=>{
    /* Group approved timesheets by client for the given week */
    const inWeek=timesheets.filter(t=>t.status==="approved"&&t.weekStart===weekStart);
    const byClient={};
    inWeek.forEach(t=>{const a=assignment(t.assignment); if(!a)return;
      if(!byClient[a.client])byClient[a.client]={lines:[]};
      const totalHrs=timesheetTotal(t); const regHrs=Math.max(0,totalHrs-(t.otHours||0));
      const subtotal=round2(regHrs*a.billRate + (t.otHours||0)*a.billRate*1.5);
      byClient[a.client].lines.push({assignment:a.id,worker:t.worker,hours:totalHrs,billRate:a.billRate,otHrs:t.otHours||0,subtotal});});
    const newInvoices=Object.entries(byClient).map(([cid,d])=>{
      const client=staffingClient(cid);
      const subtotal=round2(d.lines.reduce((s,l)=>s+l.subtotal,0));
      const hst=round2(subtotal*(client?.industry==="Healthcare"?0:0.13)); /* HST for ON, simplified */
      const total=round2(subtotal+hst);
      const dueDays=client?.paymentTermsDays||30;
      const due=new Date(); due.setDate(due.getDate()+dueDays);
      return {id:_uid("si"),number:`SI-2026-${1050+Math.floor(Math.random()*900)}`,client:cid,weekStart,
        issued:_fmtDate(new Date()),due:_fmtDate(due),status:"pending",
        lines:d.lines,subtotal,gst:0,hst,total,po:client?.notes?.includes("PO")?"":"—"};
    });
    setStaffingInvoices(l=>[...newInvoices,...l]);
    return newInvoices;
  };
  const markStaffingInvoicePaid=(id)=>setStaffingInvoices(l=>l.map(i=>i.id===id?{...i,status:"paid",paidOn:_fmtDate(new Date())}:i));

  /* ─── Placements ─── */
  const createPlacement=(data)=>{
    const salary=Number(data.salary)||0; const feePct=Number(data.feePct)||20;
    const fee=round2(salary*feePct/100);
    const np={id:_uid("pl"),status:"in-progress",offeredAt:_fmtDate(new Date()),
      startDate:null,invoicedOn:null,paidOn:null,guaranteeEnds:null,fee,...data,salary,feePct};
    setPlacements(l=>[...l,np]);
    return np;
  };
  const acceptPlacement=(id,startDate)=>{
    const p=placements.find(x=>x.id===id); if(!p)return;
    const ge=new Date(startDate); ge.setDate(ge.getDate()+90); /* 90-day guarantee */
    setPlacements(l=>l.map(x=>x.id===id?{...x,status:"accepted",startDate,guaranteeEnds:_fmtDate(ge)}:x));
  };
  const invoicePlacement=(id)=>setPlacements(l=>l.map(x=>x.id===id?{...x,status:"guaranteed",invoicedOn:_fmtDate(new Date())}:x));
  const clawbackPlacement=(id,reason)=>setPlacements(l=>l.map(x=>x.id===id?{...x,status:"clawed-back",clawbackReason:reason,replacementDue:true}:x));

  /* ─── Client (staffing) ─── */
  const upsertStaffingClient=(data)=>{
    const existing=staffingClients.find(c=>c.employerId===data.employerId);
    if(existing){setStaffingClients(l=>l.map(c=>c.id===existing.id?{...c,...data}:c)); return existing;}
    const nc={id:_uid("c"),status:"prospect",signedMsa:null,paymentTermsDays:30,poRequired:false,
      conversionFeePct:20,creditLimit:50000,currentAR:0,markup:35,...data};
    setStaffingClients(l=>[...l,nc]);
    return nc;
  };
  const signMsa=(clientId)=>{
    setStaffingClients(l=>l.map(c=>c.id===clientId?{...c,status:"active",signedMsa:_fmtDate(new Date())}:c));
  };

  /* ─── Analytics ─── */
  const agencyKPIs=()=>{
    const activeCount=activeAssignments().length;
    const availableWorkers=workers.filter(w=>w.availability==="available"&&w.status==="active").length;
    const openOrders=openJobOrders();
    const openPositions=openOrders.reduce((s,j)=>s+(j.positions-j.filled),0);
    const pendingTimesheets=timesheets.filter(t=>t.status==="submitted").length;
    const draftTimesheets=timesheets.filter(t=>t.status==="draft").length;
    const arTotal=staffingInvoices.filter(i=>i.status==="pending"||i.status==="overdue").reduce((s,i)=>s+i.total,0);
    const overdueTotal=staffingInvoices.filter(i=>i.status==="overdue").reduce((s,i)=>s+i.total,0);
    const inProgressPlacements=placements.filter(p=>p.status==="in-progress"||p.status==="accepted").length;
    const guaranteeExpiring=placements.filter(p=>{
      if(p.status!=="guaranteed")return false;
      if(!p.guaranteeEnds)return false;
      const days=(new Date(p.guaranteeEnds)-Date.now())/(864e5);
      return days>=0&&days<=30;
    }).length;
    /* Weekly revenue at run rate: current active assignments × avg hrs × avg bill */
    const runRateWeekly=activeAssignments().reduce((s,a)=>s+(a.billRate*40),0);
    return {activeCount,availableWorkers,openPositions,openOrdersCount:openOrders.length,
      pendingTimesheets,draftTimesheets,arTotal:round2(arTotal),overdueTotal:round2(overdueTotal),
      inProgressPlacements,guaranteeExpiring,runRateWeekly:round2(runRateWeekly)};
  };

  /* Margin per assignment */
  const assignmentMargin=(id)=>{
    const a=assignment(id); if(!a)return null;
    const w=worker(a.worker);
    return calcStaffingEconomics(a.payRate,a.billRate,w?.province||"ON",0);
  };

  return {workers,staffingClients,jobOrders,assignments,timesheets,staffingPayruns,staffingInvoices,placements,
    agencySession,
    worker,workerByPersonId,isWorker,staffingClient,staffingClientByEmployerId,jobOrder,assignment,timesheet,
    workerAssignments,activeAssignments,clientAssignments,clientTimesheets,workerTimesheets,openJobOrders,
    jobHiringType,jobHiringLabel,
    agencyLogin,agencyLogout,agencyCurrentStaff,AGENCY_STAFF,STAFFING_AGENCY,STAFFING_RATES,
    optInAsWorker,updateWorker,setWorkerAvailability,
    createJobOrder,updateJobOrder,closeJobOrder,
    createAssignment,endAssignment,
    upsertTimesheetDraft,submitTimesheet,approveTimesheet,rejectTimesheet,
    timesheetTotal,timesheetGross,timesheetBill,
    runStaffingPayroll,finalizeStaffingPayrun,
    generateStaffingInvoices,markStaffingInvoicePaid,
    createPlacement,acceptPlacement,invoicePlacement,clawbackPlacement,
    upsertStaffingClient,signMsa,
    agencyKPIs,assignmentMargin,calcStaffingEconomics
  };
}
