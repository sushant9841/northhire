import { useState, useEffect } from "react";
import { _fmtDate } from "../helpers/utils.js";
import { api } from "../helpers/api.js";
import { calcStaffingEconomics, DEFAULT_STAFFING_RATES, DEFAULT_STAFFING_AGENCY } from "../helpers/staffingEconomics.js";

/* ═══════════════════════════════════════════════════════════════════════════
   STAFFING AGENCY — Store hook, exported into main A context.

   Three completely different login surfaces share this one set of tables:
   agency staff (their own `agency_session` cookie, full back-office access),
   an employer with a signed staffing client relationship (their own main
   session, scoped to their own client/jobOrders/assignments/timesheets), and
   a seeker who opted in as a worker (their own main session, scoped to their
   own worker record/assignments/timesheets). Which fetch (and which endpoint
   a mutation hits) runs depends on which of those is active - nothing here
   reads or writes localStorage; every list is fetched fresh from the server.
   ═══════════════════════════════════════════════════════════════════════════ */

export function useStaffingStore(user,platformConfig){
  const STAFFING_RATES=platformConfig?.staffingRates||DEFAULT_STAFFING_RATES;
  const STAFFING_AGENCY=platformConfig?.staffingAgency||DEFAULT_STAFFING_AGENCY;
  const [agencyStaff,setAgencyStaff]=useState(null);
  /* Distinguishes "still checking for a session" from "confirmed signed out" - see the matching
     hrAuthChecked note in useHrStore.js for why this matters: without it, refreshing on any
     agency console page raced the /staffing/me check and always redirected to agencyLogin. */
  const [agencyAuthChecked,setAgencyAuthChecked]=useState(false);
  const [workers,setWorkers]=useState([]);
  const [staffingClients,setStaffingClients]=useState([]);
  const [jobOrders,setJobOrders]=useState([]);
  const [assignments,setAssignments]=useState([]);
  const [timesheets,setTimesheets]=useState([]);
  const [staffingPayruns,setStaffingPayruns]=useState([]);
  const [staffingInvoices,setStaffingInvoices]=useState([]);
  const [placements,setPlacements]=useState([]);
  const [staffingAuditLog,setStaffingAuditLog]=useState([]);
  const [wsibClaims,setWsibClaims]=useState([]);

  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      try{ const {staff}=await api.get("/staffing/me"); if(!cancelled)setAgencyStaff(staff); }
      catch{ /* no agency session */ }
      finally{ if(!cancelled)setAgencyAuthChecked(true); }
    })();
    return ()=>{cancelled=true;};
  },[]);

  /* Full agency back-office view */
  useEffect(()=>{
    if(!agencyStaff)return;
    let cancelled=false;
    (async()=>{
      try{
        const [w,c,jo,a,t,pr,inv,pl,al,wc]=await Promise.all([
          api.get("/staffing/workers"),api.get("/staffing/clients"),api.get("/staffing/job-orders"),
          api.get("/staffing/assignments"),api.get("/staffing/timesheets"),api.get("/staffing/payruns"),
          api.get("/staffing/invoices"),api.get("/staffing/placements"),api.get("/staffing/audit-log"),
          api.get("/staffing/wsib-claims"),
        ]);
        if(cancelled)return;
        setWorkers(w.workers);setStaffingClients(c.clients);setJobOrders(jo.jobOrders);
        setAssignments(a.assignments);setTimesheets(t.timesheets);setStaffingPayruns(pr.payruns);
        setStaffingInvoices(inv.invoices);setPlacements(pl.placements);setStaffingAuditLog(al.auditLog);
        setWsibClaims(wc.claims);
      }catch(e){
        if(typeof console!=="undefined")console.warn(`[NorthHire] Agency data sync failed: ${e.message}`);
      }
    })();
    return ()=>{cancelled=true;};
  },[agencyStaff?.id]);

  /* Employer's own client-side view */
  useEffect(()=>{
    if(agencyStaff||user?.role!=="employer")return;
    let cancelled=false;
    (async()=>{
      try{
        const {client,jobOrders:jo,assignments:a,timesheets:t,workers:w,invoices:inv}=await api.get("/staffing/employer/data");
        if(cancelled)return;
        setStaffingClients([client]);setJobOrders(jo);setAssignments(a);setTimesheets(t);setWorkers(w);setStaffingInvoices(inv);
      }catch{ /* no staffing relationship on file for this employer yet - nothing to show */ }
    })();
    return ()=>{cancelled=true;};
  },[agencyStaff,user?.id,user?.role]);

  /* Seeker's own worker self-service view */
  useEffect(()=>{
    if(agencyStaff||user?.role!=="seeker")return;
    let cancelled=false;
    (async()=>{
      try{
        const {worker,assignments:a,timesheets:t}=await api.get("/staffing/my/data");
        if(cancelled)return;
        setWorkers([worker]);setAssignments(a);setTimesheets(t);
      }catch{ if(!cancelled){setWorkers([]);setAssignments([]);setTimesheets([]);} /* hasn't opted in yet */ }
    })();
    return ()=>{cancelled=true;};
  },[agencyStaff,user?.id,user?.role]);

  useEffect(()=>{
    if(agencyStaff||user)return;
    setWorkers([]);setStaffingClients([]);setJobOrders([]);setAssignments([]);setTimesheets([]);
    setStaffingPayruns([]);setStaffingInvoices([]);setPlacements([]);setWsibClaims([]);
  },[agencyStaff,user]);

  /* ─── Lookups ─── */
  const worker=(id)=>workers.find(w=>w.id===id);
  const workerByPersonId=(pid)=>workers.find(w=>w.personId===pid);
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

  /* ─── Agency auth ─── */
  const agencyLogin=async(loginId,password)=>{
    try{ const {staff}=await api.post("/staffing/login",{loginId,password}); setAgencyStaff(staff); return {ok:true,staff}; }
    catch(e){ return {ok:false,msg:e.message}; }
  };
  const agencyLogout=()=>{ api.post("/staffing/logout").catch(()=>{}); setAgencyStaff(null); };
  const agencyCurrentStaff=()=>agencyStaff;
  const agencyResetRequest=async email=>{
    try{ const r=await api.post("/staffing/reset/request",{email}); return {ok:true,code:r.code}; }
    catch(e){ return {ok:false,msg:e.message}; }
  };
  const agencyResetConfirm=async(email,code,newPassword)=>{
    try{ await api.post("/staffing/reset/confirm",{email,code,newPassword}); return {ok:true}; }
    catch(e){ return {ok:false,msg:e.message}; }
  };

  /* ─── Worker actions ─── */
  const optInAsWorker=async()=>{
    try{ const {worker:w}=await api.post("/staffing/workers/opt-in"); setWorkers(l=>[...l,w]); return {ok:true,worker:w}; }
    catch(e){ return {ok:false,msg:e.message}; }
  };
  const updateWorker=async(id,patch)=>{
    const {worker:w}=await api.patch(`/staffing/workers/${id}`,patch);
    setWorkers(l=>l.map(x=>x.id===id?w:x));
  };
  const payoutVacation=async(id)=>{
    const {worker:w,amount}=await api.patch(`/staffing/workers/${id}/payout-vacation`);
    setWorkers(l=>l.map(x=>x.id===id?w:x));
    return {ok:true,amount};
  };
  const setWorkerAvailability=async(id,availability)=>{
    if(agencyStaff)return updateWorker(id,{availability});
    const {worker:w}=await api.patch("/staffing/my/availability",{availability});
    setWorkers(l=>l.map(x=>x.id===id?w:x));
  };

  /* ─── Job order actions ─── */
  const createJobOrder=async(data)=>{
    const path=agencyStaff?"/staffing/job-orders":"/staffing/employer/job-orders";
    const {jobOrder:jo}=await api.post(path,data);
    setJobOrders(j=>[...j,jo]);
    return jo;
  };
  const updateJobOrder=async(id,patch)=>{
    const {jobOrder:jo}=await api.patch(`/staffing/job-orders/${id}`,patch);
    setJobOrders(j=>j.map(x=>x.id===id?jo:x));
  };
  const closeJobOrder=async(id)=>{
    await api.patch(`/staffing/job-orders/${id}/close`);
    setJobOrders(j=>j.map(x=>x.id===id?{...x,status:"closed"}:x));
  };

  /* ─── Assignment actions (agency-only) ─── */
  const createAssignment=async(data)=>{
    const {assignment:a}=await api.post("/staffing/assignments",data);
    setAssignments(l=>[...l,a]);
    if(data.jobOrder){
      setJobOrders(l=>l.map(j=>{
        if(j.id!==data.jobOrder)return j;
        const filled=j.filled+1;
        return {...j,filled,status:filled>=j.positions?"filled":j.status};
      }));
    }
    if(data.worker)setWorkers(l=>l.map(w=>w.id===data.worker?{...w,availability:"on-assignment"}:w));
    return a;
  };
  const endAssignment=async(id,endDate)=>{
    const a=assignment(id); if(!a)return;
    await api.patch(`/staffing/assignments/${id}/end`,{endDate});
    setAssignments(l=>l.map(x=>x.id===id?{...x,status:"completed",endDate:endDate||_fmtDate(new Date())}:x));
    if(a.worker)setWorkers(l=>l.map(w=>w.id===a.worker?{...w,availability:"available"}:w));
  };

  /* ─── Timesheet actions ─── */
  const upsertTimesheetDraft=async(assignmentId,workerId,weekStart,hours,otHours,notes)=>{
    const path=agencyStaff?"/staffing/timesheets/draft":"/staffing/my/timesheets/draft";
    try{
      const r=await api.post(path,{assignmentId,workerId,weekStart,hours,otHours,notes});
      setTimesheets(l=>{
        const idx=l.findIndex(t=>t.id===r.timesheet.id);
        return idx>=0?l.map(t=>t.id===r.timesheet.id?r.timesheet:t):[...l,r.timesheet];
      });
      return {ok:true,timesheet:r.timesheet};
    }catch(e){return {ok:false,msg:e.message};}
  };
  const submitTimesheet=async(id)=>{
    const path=agencyStaff?`/staffing/timesheets/${id}/submit`:`/staffing/my/timesheets/${id}/submit`;
    try{
      await api.patch(path);
      setTimesheets(l=>l.map(x=>x.id===id?{...x,status:"submitted",submittedAt:Date.now()}:x));
      return {ok:true};
    }catch(e){return {ok:false,msg:e.message};}
  };
  const approveTimesheet=async(id,approver)=>{
    const path=agencyStaff?`/staffing/timesheets/${id}/approve`:`/staffing/employer/timesheets/${id}/approve`;
    try{
      await api.patch(path,{approver});
      setTimesheets(l=>l.map(x=>x.id===id?{...x,status:"approved",approvedAt:Date.now(),approvedBy:approver||"—"}:x));
      return {ok:true};
    }catch(e){return {ok:false,msg:e.message};}
  };
  const rejectTimesheet=async(id,reason)=>{
    const path=agencyStaff?`/staffing/timesheets/${id}/reject`:`/staffing/employer/timesheets/${id}/reject`;
    try{
      await api.patch(path,{reason});
      setTimesheets(l=>l.map(x=>x.id===id?{...x,status:"draft",submittedAt:null,notes:(x.notes||"")+"\n[Returned: "+(reason||"reason not given")+"]"}:x));
      return {ok:true};
    }catch(e){return {ok:false,msg:e.message};}
  };

  /* Timesheet math */
  const timesheetTotal=(t)=>{if(!t)return 0;const h=t.hours||{};
    return (h.mon||0)+(h.tue||0)+(h.wed||0)+(h.thu||0)+(h.fri||0)+(h.sat||0)+(h.sun||0);};
  const timesheetGross=(t)=>{if(!t)return 0;const a=assignment(t.assignment);if(!a)return 0;
    const totalHrs=timesheetTotal(t); const regHrs=Math.max(0,totalHrs-(t.otHours||0));
    return regHrs*a.payRate + (t.otHours||0)*a.payRate*1.5;};
  const timesheetBill=(t)=>{if(!t)return 0;const a=assignment(t.assignment);if(!a)return 0;
    const totalHrs=timesheetTotal(t); const regHrs=Math.max(0,totalHrs-(t.otHours||0));
    return regHrs*a.billRate + (t.otHours||0)*a.billRate*1.5;};

  /* ─── Payroll (agency-only) ─── */
  const runStaffingPayroll=async(periodStart,periodEnd)=>{
    const {payrun}=await api.post("/staffing/payroll/run",{periodStart,periodEnd});
    setStaffingPayruns(p=>[payrun,...p]);
    setTimesheets(l=>l.map(t=>t.status==="approved"&&t.weekStart>=periodStart&&t.weekStart<periodEnd?{...t,status:"paid"}:t));
    return payrun;
  };
  const fileWsibClaim=async(data)=>{
    const {claim}=await api.post("/staffing/wsib-claims",data);
    setWsibClaims(l=>[claim,...l]);
    refreshStaffingAuditLog();
    return claim;
  };
  const updateWsibClaim=async(id,patch)=>{
    const {claim}=await api.patch(`/staffing/wsib-claims/${id}`,patch);
    setWsibClaims(l=>l.map(c=>c.id===id?claim:c));
    refreshStaffingAuditLog();
  };
  const refreshStaffingAuditLog=async()=>{
    try{const {auditLog}=await api.get("/staffing/audit-log");setStaffingAuditLog(auditLog);}catch{/* best-effort */}
  };
  const finalizeStaffingPayrun=async(id)=>{
    await api.patch(`/staffing/payruns/${id}/finalize`);
    setStaffingPayruns(p=>p.map(x=>x.id===id?{...x,status:"paid"}:x));
    refreshStaffingAuditLog();
  };
  const reverseStaffingPayrun=async(id,reason)=>{
    await api.patch(`/staffing/payruns/${id}/reverse`,{reason});
    setStaffingPayruns(p=>p.map(x=>x.id===id?{...x,status:"reversed"}:x));
    refreshStaffingAuditLog();
  };

  /* ─── Invoicing (agency-only) ─── */
  const generateStaffingInvoices=async(weekStart)=>{
    const {invoices}=await api.post("/staffing/invoices/generate",{weekStart});
    setStaffingInvoices(l=>[...invoices,...l]);
    refreshStaffingAuditLog();
    return invoices;
  };
  const markStaffingInvoicePaid=async(id)=>{
    await api.patch(`/staffing/invoices/${id}/paid`);
    setStaffingInvoices(l=>l.map(i=>i.id===id?{...i,status:"paid",paidOn:_fmtDate(new Date())}:i));
  };

  /* ─── Placements (agency-only) ─── */
  const createPlacement=async(data)=>{
    const {placement}=await api.post("/staffing/placements",data);
    setPlacements(l=>[...l,placement]);
    return placement;
  };
  const acceptPlacement=async(id,startDate)=>{
    const ge=new Date(startDate); ge.setDate(ge.getDate()+90);
    await api.patch(`/staffing/placements/${id}/accept`,{startDate});
    setPlacements(l=>l.map(x=>x.id===id?{...x,status:"accepted",startDate,guaranteeEnds:_fmtDate(ge)}:x));
  };
  const invoicePlacement=async(id)=>{
    await api.patch(`/staffing/placements/${id}/invoice`);
    setPlacements(l=>l.map(x=>x.id===id?{...x,status:"guaranteed",invoicedOn:_fmtDate(new Date())}:x));
  };
  const clawbackPlacement=async(id,reason)=>{
    await api.patch(`/staffing/placements/${id}/clawback`,{reason});
    setPlacements(l=>l.map(x=>x.id===id?{...x,status:"clawed-back",clawbackReason:reason,replacementDue:true}:x));
  };

  /* ─── Client (staffing) ─── */
  const upsertStaffingClient=async(data)=>{
    const {client}=await api.post("/staffing/clients",data);
    setStaffingClients(l=>{const idx=l.findIndex(c=>c.id===client.id);return idx>=0?l.map(c=>c.id===client.id?client:c):[...l,client];});
    return client;
  };
  const signMsa=async(clientId)=>{
    await api.patch(`/staffing/clients/${clientId}/sign-msa`);
    setStaffingClients(l=>l.map(c=>c.id===clientId?{...c,status:"active",signedMsa:_fmtDate(new Date())}:c));
    refreshStaffingAuditLog();
  };

  /* ─── Analytics (pure, derived from already-fetched state) ─── */
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
    const runRateWeekly=activeAssignments().reduce((s,a)=>s+(a.billRate*40),0);
    return {activeCount,availableWorkers,openPositions,openOrdersCount:openOrders.length,
      pendingTimesheets,draftTimesheets,arTotal:round2(arTotal),overdueTotal:round2(overdueTotal),
      inProgressPlacements,guaranteeExpiring,runRateWeekly:round2(runRateWeekly)};
  };

  const assignmentMargin=(id)=>{
    const a=assignment(id); if(!a)return null;
    const w=worker(a.worker);
    return calcStaffingEconomics(a.payRate,a.billRate,w?.province||"ON",a.benefitsPerHr||0,STAFFING_RATES);
  };

  return {workers,staffingClients,jobOrders,assignments,timesheets,staffingPayruns,staffingInvoices,placements,staffingAuditLog,
    wsibClaims,fileWsibClaim,updateWsibClaim,
    worker,workerByPersonId,staffingClient,staffingClientByEmployerId,jobOrder,assignment,timesheet,
    workerAssignments,activeAssignments,clientAssignments,clientTimesheets,workerTimesheets,openJobOrders,
    agencyLogin,agencyLogout,agencyCurrentStaff,agencyAuthChecked,agencyResetRequest,agencyResetConfirm,STAFFING_AGENCY,STAFFING_RATES,
    optInAsWorker,updateWorker,setWorkerAvailability,payoutVacation,
    createJobOrder,updateJobOrder,closeJobOrder,
    createAssignment,endAssignment,
    upsertTimesheetDraft,submitTimesheet,approveTimesheet,rejectTimesheet,
    timesheetTotal,timesheetGross,timesheetBill,
    runStaffingPayroll,finalizeStaffingPayrun,reverseStaffingPayrun,
    generateStaffingInvoices,markStaffingInvoicePaid,
    createPlacement,acceptPlacement,invoicePlacement,clawbackPlacement,
    upsertStaffingClient,signMsa,
    agencyKPIs,assignmentMargin,
    calcStaffingEconomics:(pay,bill,prov,benefitsPerHr)=>calcStaffingEconomics(pay,bill,prov,benefitsPerHr,STAFFING_RATES),
  };
}
