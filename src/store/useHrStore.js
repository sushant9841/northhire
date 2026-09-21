import { useState, useEffect } from "react";
import { api } from "../helpers/api.js";
import { HR_ROLES, HR_COMPANY_SETTINGS_DEFAULT, PUNCH_VENDORS, PRIOR_HR_VENDORS } from "./seed/hrCompanySettings.js";
import { HR_DEPARTMENTS } from "./seed/hrDepartments.js";

/* ═══════════════════════════════════════════════════════════════════════════
   HR STORE — HR Suite is its own login surface (a real `hr_session` cookie,
   separate from the main NorthHire session) backed entirely by /api/hr/*.
   Nothing here reads or writes localStorage - a fresh page load calls /hr/me
   to find out whether there's an active HR session, same as the main store's
   /auth/me. Kept in a separate function so it can be composed cleanly into
   the main store.
   ═══════════════════════════════════════════════════════════════════════════ */

export function useHrStore(){
  const [hrEmployee,setHrEmployee]=useState(null); /* the signed-in HR employee, or null */
  const [hrCompany,setHrCompany]=useState(null); /* {id,name,plan} */
  const [hrBridging,setHrBridging]=useState(false); /* true while auto-bridging from the employer console */
  /* Distinguishes "still checking for a session" from "confirmed signed out" - without this,
     a refresh on any HR Suite page raced the /hr/me check and always lost: HrShell saw
     hrEmployee===null on the very first render (before the fetch below had a chance to
     resolve) and immediately redirected to hrLogin, even when the session cookie was valid. */
  const [hrAuthChecked,setHrAuthChecked]=useState(false);
  const [hrEmployees,setHrEmployees]=useState([]);
  const [hrAttendance,setHrAttendance]=useState([]);
  const [hrLeave,setHrLeave]=useState([]);
  const [hrTasks,setHrTasks]=useState([]);
  const [hrEvents,setHrEvents]=useState([]);
  const [hrInvoices,setHrInvoices]=useState([]);
  const [hrChats,setHrChats]=useState([]);
  const [hrChatMsgs,setHrChatMsgs]=useState([]);
  const [hrPayruns,setHrPayruns]=useState([]);
  const [hrCompanySettings,setHrCompanySettingsMap]=useState({}); /* {[companyId]: settings} */
  const [hrDepartments,setHrDepartments]=useState([]);
  const [hrExpenses,setHrExpenses]=useState([]);
  const [hrAuditLog,setHrAuditLog]=useState([]);

  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      try{
        const {employee,company}=await api.get("/hr/me");
        if(!cancelled){setHrEmployee(employee);setHrCompany(company);}
      }catch{ /* no HR session - stays signed out */ }
      finally{ if(!cancelled)setHrAuthChecked(true); }
    })();
    return ()=>{cancelled=true;};
  },[]);

  useEffect(()=>{
    if(!hrEmployee||!hrCompany){
      setHrEmployees([]);setHrAttendance([]);setHrLeave([]);setHrTasks([]);setHrEvents([]);
      setHrInvoices([]);setHrChats([]);setHrChatMsgs([]);setHrPayruns([]);setHrCompanySettingsMap({});
      setHrDepartments([]);setHrExpenses([]);setHrAuditLog([]);
      return;
    }
    let cancelled=false;
    const isPriv=["owner","admin","hr"].includes(hrEmployee.role);
    const canSeeAudit=isPriv||hrEmployee.role==="finance";
    /* A manager (any role, even plain "employee") sees their own expenses plus their direct
       reports' - merged client-side since they're two separate, differently-scoped endpoints
       (the team one is new; a manager was previously invisible to this fetch entirely). */
    const expensesReq=isPriv
      ? api.get("/hr/expenses/company").then(r=>r.expenses)
      : Promise.all([api.get("/hr/expenses/mine"),api.get("/hr/expenses/team")]).then(([mine,team])=>{
          const byId=new Map(); [...mine.expenses,...team.expenses].forEach(x=>byId.set(x.id,x)); return [...byId.values()];
        });
    (async()=>{
      try{
        const [emps,att,leave,tasks,events,invoices,depts,chats,settings,expenses]=await Promise.all([
          api.get("/hr/employees"),api.get("/hr/attendance"),api.get("/hr/leave"),api.get("/hr/tasks"),
          api.get("/hr/events"),api.get("/hr/invoices"),api.get("/hr/departments"),api.get("/hr/chats"),
          api.get("/hr/company-settings"),expensesReq,
        ]);
        if(cancelled)return;
        setHrEmployees(emps.employees);
        setHrAttendance(att.attendance);
        setHrLeave(leave.leave);
        setHrTasks(tasks.tasks);
        setHrEvents(events.events);
        setHrInvoices(invoices.invoices);
        setHrDepartments(depts.departments);
        setHrChats(chats.chats);
        setHrCompanySettingsMap({[hrCompany.id]:settings.settings||HR_COMPANY_SETTINGS_DEFAULT});
        setHrExpenses(expenses);
        if(isPriv){
          const {payruns}=await api.get("/hr/payruns");
          if(!cancelled)setHrPayruns(payruns);
        }
        if(canSeeAudit){
          const {auditLog}=await api.get("/hr/audit-log");
          if(!cancelled)setHrAuditLog(auditLog);
        }
        const msgLists=await Promise.all(chats.chats.map(c=>api.get(`/hr/chats/${c.id}/messages`)));
        if(!cancelled)setHrChatMsgs(msgLists.flatMap(r=>r.messages));
      }catch(e){
        if(typeof console!=="undefined")console.warn(`[NorthHire] HR data sync failed: ${e.message}`);
      }
    })();
    return ()=>{cancelled=true;};
  },[hrEmployee?.id]);

  const hrEmp=id=>hrEmployees.find(e=>e.id===id);
  const hrEmpsAtCompany=cid=>hrEmployees.filter(e=>e.companyId===cid);
  const hrCurrentEmp=()=>hrEmployee;
  const hrCurrentCompany=()=>hrCompany;

  /* --- Employee documents (no file-hosting backend - see server route comment) --- */
  const loadEmployeeDocuments=async(empId)=>{
    try{const {documents}=await api.get(`/hr/employees/${empId}/documents`);return documents;}
    catch(e){return [];}
  };
  const uploadEmployeeDocument=async(empId,name,dataUrl)=>{
    try{const {document}=await api.post(`/hr/employees/${empId}/documents`,{name,dataUrl});return {ok:true,document};}
    catch(e){return {ok:false,msg:e.message};}
  };
  const downloadEmployeeDocument=async(docId)=>{
    try{
      const {name,dataUrl}=await api.get(`/hr/documents/${docId}`);
      const a=document.createElement("a"); a.href=dataUrl; a.download=name; a.click();
    }catch(e){/* surfaced via the caller's own toast if needed */}
  };
  const deleteEmployeeDocument=async(docId)=>{
    try{await api.del(`/hr/documents/${docId}`);return {ok:true};}
    catch(e){return {ok:false,msg:e.message};}
  };

  /* --- HR authentication --- */
  const hrLogin=async(companyName,loginId,password)=>{
    try{
      const {employee,company}=await api.post("/hr/login",{companyName,loginId,password});
      setHrEmployee(employee);setHrCompany(company);
      return {ok:true,employee,company};
    }catch(e){return {ok:false,msg:e.message};}
  };
  const hrLogout=()=>{
    api.post("/hr/logout").catch(()=>{});
    setHrEmployee(null);setHrCompany(null);
  };
  /* Bridges the main employer session straight into an HR session for their own Enterprise
     company - lets navigating into HR Suite feel like a native tab instead of a second login. */
  const hrAutoLogin=async()=>{
    setHrBridging(true);
    try{
      const {employee,company}=await api.post("/hr/auto-login");
      setHrEmployee(employee);setHrCompany(company);
      return {ok:true,employee,company};
    }catch(e){return {ok:false,msg:e.message};}
    finally{setHrBridging(false);}
  };

  /* --- Sync layer: HR employee ↔ NorthHire seeker profile --- */
  const hrPublicProfile=empId=>{
    const emp=hrEmp(empId); if(!emp)return null;
    const v=emp.visibility||{};
    const yearsAtCompany=(new Date().getTime()-new Date(emp.hired).getTime())/(365.25*24*60*60*1000);
    const trainings=hrEvents.filter(ev=>ev.type==="training"&&(ev.invitees==="all"||ev.invitees.split(",").includes(emp.id))).length;
    return {
      name:emp.name,
      title:v.title!==false?emp.title:null,
      department:v.department!==false?(HR_DEPARTMENTS.find(d=>d.id===emp.dept)?.name):null,
      tenureYears:v.tenure!==false?Math.round(yearsAtCompany*10)/10:null,
      badges:v.badges!==false?emp.badges:null,
      trainingsCompleted:v.trainings!==false?trainings:null,
      manager:v.manager!==false&&emp.manager?hrEmp(emp.manager)?.name:null,
      company:hrCurrentCompany()?.name,
      companyId:emp.companyId,
      email:v.email===true?emp.email:null,
      phone:v.phone===true?emp.phone:null,
    };
  };

  const updateEmpVisibility=async(empId,patch)=>{
    try{
      const {employee}=await api.patch(`/hr/employees/${empId}/visibility`,patch);
      setHrEmployees(l=>l.map(e=>e.id===empId?employee:e));
    }catch(e){/* best-effort - visibility toggles aren't safety-critical */}
  };
  const refreshAuditLog=async()=>{
    try{const {auditLog}=await api.get("/hr/audit-log");setHrAuditLog(auditLog);}catch{/* best-effort */}
  };
  const updateEmp=async(empId,patch)=>{
    try{
      const {employee}=await api.patch(`/hr/employees/${empId}`,patch);
      setHrEmployees(l=>l.map(e=>e.id===empId?employee:e));
      if(patch.salary!==undefined||patch.role!==undefined)refreshAuditLog();
    }catch(e){/* surfaced via the calling page's own error handling, if any */}
  };
  const [hrShifts,setHrShifts]=useState([]);
  const loadShifts=async(from,to)=>{
    const qs=new URLSearchParams(); if(from)qs.set("from",from); if(to)qs.set("to",to);
    const {shifts}=await api.get(`/hr/shifts${qs.toString()?`?${qs}`:""}`);
    setHrShifts(shifts); return shifts;
  };
  const addShift=async(data)=>{
    try{const {shift}=await api.post("/hr/shifts",data); setHrShifts(l=>[...l,shift]); return {ok:true,shift};}
    catch(e){return {ok:false,msg:e.message};}
  };
  const updateShift=async(id,patch)=>{
    const {shift}=await api.patch(`/hr/shifts/${id}`,patch);
    setHrShifts(l=>l.map(s=>s.id===id?shift:s));
  };
  const removeShift=async(id)=>{
    await api.del(`/hr/shifts/${id}`);
    setHrShifts(l=>l.filter(s=>s.id!==id));
  };
  const [hrSignDocs,setHrSignDocs]=useState([]);
  const [hrSignDocsAll,setHrSignDocsAll]=useState(null); // privileged-only completion stats, null for non-priv
  const loadSignDocuments=async()=>{
    try{const {documents,allDocuments}=await api.get("/hr/sign-documents");setHrSignDocs(documents);setHrSignDocsAll(allDocuments);}
    catch{/* best-effort */}
  };
  const createSignDocument=async(data)=>{
    try{await api.post("/hr/sign-documents",data);await loadSignDocuments();return {ok:true};}
    catch(e){return {ok:false,msg:e.message};}
  };
  const removeSignDocument=async(id)=>{
    try{await api.del(`/hr/sign-documents/${id}`);await loadSignDocuments();return {ok:true};}
    catch(e){return {ok:false,msg:e.message};}
  };
  const signDocument=async(id,signedName)=>{
    try{await api.post(`/hr/sign-documents/${id}/sign`,{signedName});await loadSignDocuments();return {ok:true};}
    catch(e){return {ok:false,msg:e.message};}
  };
  const loadDocumentSignatures=async(id)=>{
    try{const {signatures}=await api.get(`/hr/sign-documents/${id}/signatures`);return signatures;}catch{return [];}
  };
  const eraseHrEmployee=async(empId)=>{
    try{
      await api.post(`/hr/employees/${empId}/erase`);
      const {employees}=await api.get("/hr/employees");
      setHrEmployees(employees);
      refreshAuditLog();
      return {ok:true};
    }catch(e){return {ok:false,msg:e.message};}
  };
  const addEmployee=async(data)=>{
    /* Reachable from the employer console right after a hire, before the employer has ever
       opened HR Suite in this session - bridge into an HR session first if one isn't active yet.
       Previously we ignored hrAutoLogin's return value: a silent {ok:false} from the bridge
       (e.g. an employer whose plan doesn't include HR Suite, or a session that expired) then
       let the /hr/employees call go out anyway, which 401'd with a generic "Not signed in to
       HR Suite." error and the caller had no signal to surface. Now we escalate the bridge
       failure with the real reason so the modal can show it inline. */
    if(!hrEmployee){
      const r=await hrAutoLogin();
      if(!r?.ok)throw new Error(r?.msg||"Couldn't open HR Suite for this account.");
    }
    const {employee}=await api.post("/hr/employees",data);
    setHrEmployees(l=>[...l,employee]);
    return employee;
  };
  /* H1 - employee's own opt-in to keep their HR profile's skills/education linked with their
     NorthHire seeker profile. `hrSyncStatus` is fetched lazily by HrProfile (not part of the bulk
     initial sync above) since only the signed-in employee's own profile page needs it. */
  const hrSyncStatus=async(empId)=>{
    try{return await api.get(`/hr/employees/${empId}/sync`);}catch{return {sync:null};}
  };
  const hrSetSyncConsent=async(empId,consent)=>{
    try{const r=await api.post(`/hr/employees/${empId}/sync-consent`,{consent});return {ok:true,sync:r.sync};}
    catch(e){return {ok:false,msg:e.message};}
  };
  const removeEmployee=async(empId)=>{
    await api.del(`/hr/employees/${empId}`);
    const {employees}=await api.get("/hr/employees"); /* refetch - manager reassignment happens server-side */
    setHrEmployees(employees);
  };

  /* --- Attendance --- */
  const punchIn=async(empId,source)=>{
    try{
      const r=await api.post("/hr/attendance/punch-in",{employeeId:empId,source});
      // The service worker answers with {queued:true} instead of a real record when the device
      // is offline - the punch is held in IndexedDB and replayed once connectivity returns.
      if(r?.queued)return {ok:true,queued:true};
      setHrAttendance(l=>[r.record,...l]);
      return {ok:true,rec:r.record};
    }catch(e){return {ok:false,msg:e.message};}
  };
  const punchOut=async(empId)=>{
    try{
      const r=await api.post("/hr/attendance/punch-out",{employeeId:empId});
      if(r?.queued)return {ok:true,queued:true};
      const {hours,earlyLeave,record}=r;
      if(record)setHrAttendance(l=>l.map(a=>a.id===record.id?record:a));
      return {ok:true,hours,earlyLeave};
    }catch(e){return {ok:false,msg:e.message};}
  };

  /* --- Leave --- */
  const requestLeave=async(data)=>{
    const {leave}=await api.post("/hr/leave",data);
    setHrLeave(l=>[leave,...l]);
    return leave;
  };
  const decideLeave=async(id,decision)=>{
    const {leave}=await api.patch(`/hr/leave/${id}/decide`,{decision});
    setHrLeave(l=>l.map(r=>r.id===id?leave:r));
  };

  /* --- Tasks --- */
  const addTask=async(data)=>{
    const {task}=await api.post("/hr/tasks",data);
    setHrTasks(l=>[task,...l]);
    return task;
  };
  const updateTaskStatus=async(id,status)=>{
    const {task}=await api.patch(`/hr/tasks/${id}/status`,{status});
    setHrTasks(l=>l.map(t=>t.id===id?task:t));
  };
  const deleteTask=async(id)=>{await api.del(`/hr/tasks/${id}`);setHrTasks(l=>l.filter(t=>t.id!==id));};

  /* --- Events --- */
  const addEvent=async(data)=>{
    const {event}=await api.post("/hr/events",data);
    setHrEvents(l=>[event,...l]);
    return event;
  };
  const deleteEvent=async(id)=>{await api.del(`/hr/events/${id}`);setHrEvents(l=>l.filter(e=>e.id!==id));};

  /* --- H5: training assignment -> task + notification --- */
  const assignTraining=async(trainingId,employeeIds,due)=>{
    try{const {tasks}=await api.post(`/hr/trainings/${trainingId}/assign`,{employeeIds,due});
      setHrTasks(l=>[...tasks,...l]);
      const {events}=await api.get("/hr/events"); setHrEvents(events);
      return {ok:true,tasks};
    }catch(e){return {ok:false,msg:e.message};}
  };

  /* --- H6: per-employee pay-stub status (Draft/Sent/Viewed/Downloaded/Disputed) ---
     All three only ever touch the caller's own line - see server route comments. Best-effort:
     a failed "mark viewed" shouldn't block someone from reading their own pay stub. */
  const markPayslipViewed=async runId=>{
    try{await api.patch(`/hr/payruns/${runId}/lines/mine/viewed`);
      const {payslips}=await api.get("/hr/payslips/mine"); setMyPayslipsList(payslips);
    }catch{/* best-effort */}
  };
  const markPayslipDownloaded=async runId=>{
    try{await api.patch(`/hr/payruns/${runId}/lines/mine/downloaded`);
      const {payslips}=await api.get("/hr/payslips/mine"); setMyPayslipsList(payslips);
    }catch{/* best-effort */}
  };
  const disputePayslip=async(runId,reason)=>{
    try{await api.patch(`/hr/payruns/${runId}/lines/mine/dispute`,{reason});
      const {payslips}=await api.get("/hr/payslips/mine"); setMyPayslipsList(payslips);
      return {ok:true};
    }catch(e){return {ok:false,msg:e.message};}
  };

  /* --- Invoices --- */
  const addInvoice=async(data)=>{
    const {invoice}=await api.post("/hr/invoices",data);
    setHrInvoices(l=>[invoice,...l]);
    return invoice;
  };
  const markInvoicePaid=async(id)=>{const {invoice}=await api.patch(`/hr/invoices/${id}/paid`);setHrInvoices(l=>l.map(i=>i.id===id?invoice:i));};
  const sendInvoice=async(id)=>{const {invoice}=await api.patch(`/hr/invoices/${id}/send`);setHrInvoices(l=>l.map(i=>i.id===id?invoice:i));};
  const printHrInvoice=(inv,company)=>{
    const items=inv.items||[{desc:"Services",qty:1,unitPrice:inv.amount}];
    const lines=[
      `NorthHire HR Suite — Invoice ${inv.number}`,
      `From: ${company?.name||"Your company"}`,
      `Bill to: ${inv.client}${inv.po?` (PO: ${inv.po})`:""}`,
      `Issued: ${inv.issued}   Due: ${inv.due}   Status: ${inv.status.toUpperCase()}`,
      "",
      "Description                Qty   Unit price   Line total",
      ...items.map(it=>`${(it.desc||"—").padEnd(26)}${String(it.qty||1).padStart(4)}   $${(it.unitPrice||0).toLocaleString().padStart(9)}   $${((it.qty||1)*(it.unitPrice||0)).toLocaleString().padStart(9)}`),
      "",
      inv.hst?`Subtotal: $${(inv.subtotal||inv.amount).toLocaleString()}\nHST (13%): $${inv.hst.toLocaleString()}`:"",
      `Total: $${inv.amount.toLocaleString()} CAD`,
    ].filter(Boolean).join("\n");
    if(typeof document!=="undefined"){
      const blob=new Blob([lines],{type:"text/plain"});
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a"); a.href=url; a.download=`${inv.number}.txt`; a.click();
      URL.revokeObjectURL(url);
    }
  };

  /* --- Payslips ---
     Fetched fresh (not derived from hrPayruns, which only ever holds data for privileged
     roles) so every employee - not just owner/admin/hr - can see their own payslips without
     being handed the full payroll run their colleagues' salaries live in. */
  const [myPayslipsList,setMyPayslipsList]=useState([]);
  useEffect(()=>{
    if(!hrEmployee){setMyPayslipsList([]);return;}
    let cancelled=false;
    api.get("/hr/payslips/mine").then(({payslips})=>{if(!cancelled)setMyPayslipsList(payslips);}).catch(()=>{});
    return ()=>{cancelled=true;};
  },[hrEmployee?.id]);
  const myPayslips=()=>myPayslipsList;
  const printPayslip=(run,line,employee,company)=>{
    if(typeof window==="undefined")return;
    // Reachable from an owner/admin/finance view of OTHER employees' payslips, so an employee's
    // own name (settable via POST /hr/employees) landing here unescaped was real stored XSS
    // against whichever privileged colleague later printed it - company?.name below was already
    // escaped, the rest of the interpolated fields weren't.
    const esc=s=>String(s??"").replace(/[<>]/g,"");
    const html=`<!DOCTYPE html><html><head><title>Payslip — ${esc(line.name)} — ${esc(run.period)}</title>
      <style>body{font-family:Arial,Helvetica,sans-serif;max-width:680px;margin:40px auto;padding:0 30px;color:#111;line-height:1.5}
        .brand{font-size:20pt;font-weight:700;color:#B45309;margin-bottom:2px}.sub{font-size:9pt;color:#888;margin-bottom:24px}
        h1{font-size:15pt;margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:18px}
        th{text-align:left;font-size:9pt;text-transform:uppercase;letter-spacing:.05em;color:#888;border-bottom:2px solid #ddd;padding:8px 0}
        td{padding:9px 0;border-bottom:1px solid #eee;font-size:11pt}.right{text-align:right}
        .totals{margin-top:10px;margin-left:auto;width:280px}.totals div{display:flex;justify-content:space-between;padding:4px 0;font-size:11pt}
        .totals .grand{font-weight:700;font-size:13pt;border-top:2px solid #111;padding-top:8px;margin-top:4px}
        .meta{display:flex;justify-content:space-between;margin:20px 0;font-size:10pt;color:#555}
        @media print{@page{margin:1.5cm}}</style></head><body>
      <div class="brand">${esc(company?.name||"Your company")}</div><div class="sub">Statement of earnings and deductions</div>
      <h1>Payslip — ${esc(line.name)}</h1>
      <div class="meta"><div>Employee<br><strong>${esc(line.name)}</strong><br>${esc(employee?.title)}</div>
        <div style="text-align:right">Pay period<br><strong>${esc(run.period)}</strong><br>Pay date: ${esc(run.runDate)}</div></div>
      <table><thead><tr><th>Earnings / Deductions</th><th class="right">Amount</th></tr></thead>
        <tbody>
          <tr><td>Gross pay</td><td class="right">$${line.gross.toLocaleString()}</td></tr>
          <tr><td>CPP contribution</td><td class="right">-$${line.cpp.toLocaleString()}</td></tr>
          <tr><td>EI premium</td><td class="right">-$${line.ei.toLocaleString()}</td></tr>
          <tr><td>Federal tax</td><td class="right">-$${line.fedTax.toLocaleString()}</td></tr>
          <tr><td>Provincial tax</td><td class="right">-$${line.provTax.toLocaleString()}</td></tr>
          ${line.reimb>0?`<tr><td>Expense reimbursement</td><td class="right">+$${line.reimb.toLocaleString()}</td></tr>`:""}
        </tbody></table>
      <div class="totals"><div><span>Gross pay</span><span>$${line.gross.toLocaleString()}</span></div>
        <div><span>Total deductions</span><span>-$${(line.cpp+line.ei+line.fedTax+line.provTax).toLocaleString()}</span></div>
        <div class="grand"><span>Net pay</span><span>$${line.net.toLocaleString()} CAD</span></div></div>
      <div style="margin-top:30px;font-size:8.5pt;color:#999">CPP, EI and tax are calculated with real federal and provincial brackets, TD1 credits and annual maximums. This is a pay statement, not a T4 — year-end slips are generated separately from Payroll.</div>
      <script>window.onload=()=>setTimeout(()=>window.print(),300);</script>
      </body></html>`;
    const w=window.open("","_blank");
    if(!w){
      if(typeof document!=="undefined"){
        const blob=new Blob([`Payslip — ${line.name} — ${run.period}\nGross: $${line.gross}\nCPP: -$${line.cpp}\nEI: -$${line.ei}\nFed tax: -$${line.fedTax}\nProv tax: -$${line.provTax}\nNet: $${line.net} CAD`],{type:"text/plain"});
        const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`payslip-${run.period}.txt`; a.click(); URL.revokeObjectURL(url);
      }
      return;
    }
    w.document.write(html); w.document.close();
  };

  /* --- Year-end tax slips (T4) and Records of Employment ---
     Both are computed server-side from the payroll runs actually paid (see helpers/taxSlips.js),
     so the printed slip can never disagree with the payroll register behind it. These generate a
     real slip; they do not file anything with CRA or Service Canada, and both printouts say so
     rather than letting an employer assume filing happened. */
  const hrTaxSlipYears=()=>api.get("/hr/tax-slips/years").then(r=>r.years).catch(()=>[]);
  const hrTaxSlips=year=>api.get(`/hr/tax-slips/${year}`);
  const hrMyTaxSlip=year=>api.get(`/hr/tax-slips/${year}/mine`);
  const hrRoe=(employeeId,reason="K")=>api.get(`/hr/roe/${employeeId}?reason=${encodeURIComponent(reason)}`);

  /* --- Task comments and expense categories --- */
  const hrTaskComments=taskId=>api.get(`/hr/tasks/${taskId}/comments`).then(r=>r.comments).catch(()=>[]);
  const hrAddTaskComment=async(taskId,body)=>{
    try{const r=await api.post(`/hr/tasks/${taskId}/comments`,{body});return {ok:true,comment:r.comment};}
    catch(e){return {ok:false,msg:e.message};}
  };
  const hrDeleteTaskComment=async id=>{
    try{await api.del(`/hr/task-comments/${id}`);return {ok:true};}
    catch(e){return {ok:false,msg:e.message};}
  };
  const hrExpenseCategories=()=>api.get("/hr/expense-categories").catch(()=>({categories:[],isCustom:false}));
  const hrSaveExpenseCategories=async categories=>{
    try{await api.put("/hr/expense-categories",{categories});return {ok:true};}
    catch(e){return {ok:false,msg:e.message};}
  };

  /* --- Shared time clocks (kiosk terminals) ---
     The pairing token comes back only from the create call; the list endpoint deliberately never
     returns it again. */
  const hrKioskDevices=()=>api.get("/hr/kiosk/devices").then(r=>r.devices).catch(()=>[]);
  const hrCreateKioskDevice=async(name,site)=>{
    try{const r=await api.post("/hr/kiosk/devices",{name,site});return {ok:true,token:r.token,device:r.device};}
    catch(e){return {ok:false,msg:e.message};}
  };
  const hrRevokeKioskDevice=async id=>{
    try{await api.del(`/hr/kiosk/devices/${id}`);return {ok:true};}
    catch(e){return {ok:false,msg:e.message};}
  };
  const hrSetPunchPin=async(employeeId,pin)=>{
    try{await api.put(`/hr/employees/${employeeId}/punch-pin`,{pin});return {ok:true};}
    catch(e){return {ok:false,msg:e.message};}
  };

  const _slipShell=(title,inner)=>`<!DOCTYPE html><html><head><title>${title}</title>
    <style>body{font-family:Arial,Helvetica,sans-serif;max-width:720px;margin:36px auto;padding:0 30px;color:#111;line-height:1.45}
      .brand{font-size:18pt;font-weight:700;color:#B45309}.sub{font-size:9pt;color:#888;margin-bottom:22px}
      h1{font-size:14pt;margin:0 0 10px}
      .meta{display:flex;justify-content:space-between;gap:24px;margin:16px 0 20px;font-size:10pt;color:#444}
      table{width:100%;border-collapse:collapse;margin-top:12px}
      th{text-align:left;font-size:8.5pt;text-transform:uppercase;letter-spacing:.05em;color:#888;border-bottom:2px solid #ddd;padding:7px 0}
      td{padding:8px 0;border-bottom:1px solid #eee;font-size:11pt}.right{text-align:right}
      .box{display:inline-block;min-width:34px;font-weight:700;color:#B45309;font-size:9.5pt}
      .note{margin-top:26px;padding:12px 14px;background:#FDF6E7;border:1px solid #E8D4A3;border-radius:6px;font-size:8.5pt;color:#6b5518;line-height:1.5}
      @media print{@page{margin:1.4cm}}</style></head><body>${inner}
    <script>window.onload=()=>setTimeout(()=>window.print(),300);</script></body></html>`;

  const printT4=(slip,employer)=>{
    if(typeof window==="undefined")return;
    const esc=s=>String(s??"").replace(/[<>]/g,"");
    const m=n=>`$${Number(n||0).toLocaleString("en-CA",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
    const rows=[[14,"Employment income",slip.boxes[14]],[16,"Employee's CPP contributions",slip.boxes[16]],
      [18,"Employee's EI premiums",slip.boxes[18]],[22,"Income tax deducted",slip.boxes[22]],
      [24,"EI insurable earnings",slip.boxes[24]],[26,"CPP pensionable earnings",slip.boxes[26]]];
    const html=_slipShell(`T4 ${slip.year} — ${esc(slip.name)}`,`
      <div class="brand">${esc(employer?.name||"Your company")}</div>
      <div class="sub">Statement of Remuneration Paid — T4 ${slip.year}</div>
      <h1>${esc(slip.name)}</h1>
      <div class="meta">
        <div>Employer<br><strong>${esc(employer?.name)}</strong>${employer?.businessNumber?`<br>BN ${esc(employer.businessNumber)}`:""}</div>
        <div style="text-align:right">Tax year<br><strong>${slip.year}</strong><br>${slip.periodsPaid} pay period${slip.periodsPaid===1?"":"s"} paid</div>
      </div>
      <table><thead><tr><th>Box</th><th>Description</th><th class="right">Amount</th></tr></thead><tbody>
        ${rows.map(([b,l,v])=>`<tr><td><span class="box">${b}</span></td><td>${l}</td><td class="right">${m(v)}</td></tr>`).join("")}
      </tbody></table>
      <div class="note"><strong>This slip has not been filed.</strong> Amounts are computed from the payroll
        runs actually paid to this employee in ${slip.year}. Filing the T4 and T4 Summary with the Canada Revenue
        Agency is a separate step and has not happened. Boxes for CPP2, RPP contributions, union dues and pension
        adjustments are not shown because this payroll does not track them; if any apply, this slip is incomplete.</div>`);
    const w=window.open("","_blank");
    if(!w)return; // pop-up blocked - nothing to fall back to for a formatted slip
    w.document.write(html); w.document.close();
  };

  const printRoe=(roe,employer)=>{
    if(typeof window==="undefined")return;
    const esc=s=>String(s??"").replace(/[<>]/g,"");
    const m=n=>`$${Number(n||0).toLocaleString("en-CA",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
    const rows=[["10","First day worked",esc(roe.firstDayWorked)||"—"],["11","Last day for which paid",esc(roe.lastDayPaid)||"—"],
      ["6","Pay period type",esc(roe.payPeriodType)],["15A","Total insurable hours",roe.insurableHours.toLocaleString()],
      ["15B","Total insurable earnings",m(roe.insurableEarnings)],["16","Reason for issuing",`${esc(roe.reasonCode)} — ${esc(roe.reasonLabel)}`]];
    const html=_slipShell(`Record of Employment — ${esc(roe.name)}`,`
      <div class="brand">${esc(employer?.name||"Your company")}</div>
      <div class="sub">Record of Employment (working copy)</div>
      <h1>${esc(roe.name)}</h1>
      <div class="meta">
        <div>Employer<br><strong>${esc(employer?.name)}</strong>${employer?.businessNumber?`<br>BN ${esc(employer.businessNumber)}`:""}</div>
        <div style="text-align:right">Pay periods on record<br><strong>${roe.periods}</strong></div>
      </div>
      <table><thead><tr><th>Block</th><th>Description</th><th class="right">Value</th></tr></thead><tbody>
        ${rows.map(([b,l,v])=>`<tr><td><span class="box">${b}</span></td><td>${l}</td><td class="right">${v}</td></tr>`).join("")}
      </tbody></table>
      <div class="note"><strong>This is a working copy, not a submitted ROE.</strong> Service Canada requires the
        ROE to be issued through ROE Web or on their own form; this sheet exists so the figures can be checked
        before that. ${roe.hoursWereAssumed
          ? `<br><br><strong>Insurable hours are partly assumed.</strong> ${roe.assumedHours.toLocaleString()} of the
             ${roe.insurableHours.toLocaleString()} hours shown were derived from a standard 40-hour week because this
             employee is salaried and no hours were recorded. Confirm the real figure before issuing.`
          : ""}</div>`);
    const w=window.open("","_blank");
    if(!w)return; // pop-up blocked - nothing to fall back to for a formatted slip
    w.document.write(html); w.document.close();
  };

  /* --- Departments --- */
  const hrDeptsAtCompany=cid=>hrDepartments.filter(d=>d.companyId===cid);
  const addDepartment=async(data)=>{
    const {department}=await api.post("/hr/departments",data);
    setHrDepartments(l=>[...l,department]);
    return department;
  };
  const updateDepartment=async(id,patch)=>{
    const {department}=await api.patch(`/hr/departments/${id}`,patch);
    setHrDepartments(l=>l.map(d=>d.id===id?department:d));
  };
  const removeDepartment=async(id)=>{
    try{
      await api.del(`/hr/departments/${id}`);
      setHrDepartments(l=>l.filter(d=>d.id!==id));
      return {ok:true};
    }catch(e){return {ok:false,msg:e.message};}
  };

  /* --- Expenses --- */
  const empExpenses=empId=>hrExpenses.filter(x=>x.employee===empId).sort((a,b)=>b.submitted-a.submitted);
  const companyExpenses=cid=>hrExpenses.slice().sort((a,b)=>b.submitted-a.submitted);
  const submitExpense=async(data)=>{
    const {expense}=await api.post("/hr/expenses",data);
    setHrExpenses(l=>[expense,...l]);
    return expense;
  };
  const decideExpense=async(id,decision,approverId,reason)=>{
    const {expense}=await api.patch(`/hr/expenses/${id}/decide`,{decision,reason});
    setHrExpenses(l=>l.map(x=>x.id===id?expense:x));
  };
  const payExpense=async(id)=>{
    const {expense}=await api.patch(`/hr/expenses/${id}/pay`);
    setHrExpenses(l=>l.map(x=>x.id===id?expense:x));
  };

  /* --- Payroll runs --- */
  const runPayroll=async(companyId,periodStart,periodEnd)=>{
    const {payrun}=await api.post("/hr/payruns",{periodStart,periodEnd});
    setHrPayruns(l=>[payrun,...l]);
    return payrun;
  };
  const approvePayroll=async(id)=>{
    const {payrun}=await api.patch(`/hr/payruns/${id}/approve`);
    setHrPayruns(l=>l.map(p=>p.id===id?payrun:p));
  };
  const executePayroll=async(id)=>{
    await api.patch(`/hr/payruns/${id}/execute`);
    setHrPayruns(l=>l.map(p=>p.id===id?{...p,status:"paid"}:p));
    const isPriv=hrEmployee&&["owner","admin","hr"].includes(hrEmployee.role);
    const {expenses}=isPriv?await api.get("/hr/expenses/company"):await api.get("/hr/expenses/mine");
    setHrExpenses(expenses);
    refreshAuditLog();
  };
  const reversePayroll=async(id,reason)=>{
    await api.patch(`/hr/payruns/${id}/reverse`,{reason});
    setHrPayruns(l=>l.map(p=>p.id===id?{...p,status:"reversed"}:p));
    const isPriv=hrEmployee&&["owner","admin","hr"].includes(hrEmployee.role);
    const {expenses}=isPriv?await api.get("/hr/expenses/company"):await api.get("/hr/expenses/mine");
    setHrExpenses(expenses);
    refreshAuditLog();
  };
  const reverseInvoice=async(id,reason)=>{
    const {invoice}=await api.patch(`/hr/invoices/${id}/reverse`,{reason});
    setHrInvoices(l=>l.map(i=>i.id===id?invoice:i));
    refreshAuditLog();
  };

  /* --- Badges --- */
  const awardBadge=async(empId,badge)=>{
    const {employee}=await api.patch(`/hr/employees/${empId}/badges`,{badge});
    setHrEmployees(l=>l.map(e=>e.id===empId?employee:e));
    refreshAuditLog();
  };
  const removeBadge=async(empId,badge)=>{
    const {employee}=await api.patch(`/hr/employees/${empId}/badges`,{badge,remove:true});
    setHrEmployees(l=>l.map(e=>e.id===empId?employee:e));
    refreshAuditLog();
  };

  /* --- Chat --- */
  const sendHrMessage=async(chatId,text)=>{
    const {message}=await api.post(`/hr/chats/${chatId}/messages`,{text});
    setHrChatMsgs(l=>[...l,message]);
    return message;
  };
  const markHrChatRead=async(chatId)=>{
    await api.patch(`/hr/chats/${chatId}/read`);
    setHrChats(l=>l.map(c=>c.id===chatId?{...c,unreadCount:0}:c));
  };
  const createHrChat=async(data)=>{
    const {chat}=await api.post("/hr/chats",data);
    setHrChats(l=>[chat,...l]);
    return chat;
  };

  /* --- Company settings & integrations ---
     The server merges one level deep only, so a nested-object field (modules, integrations)
     must be sent whole - not just the one sub-key that changed - or the rest of that nested
     object would be silently dropped. */
  const updateCompanySettings=async(companyId,patch)=>{
    const {settings}=await api.patch("/hr/company-settings",patch);
    setHrCompanySettingsMap(s=>({...s,[companyId]:settings}));
  };
  const toggleModule=(companyId,module,on)=>{
    const cur=hrCompanySettings[companyId]||HR_COMPANY_SETTINGS_DEFAULT;
    return updateCompanySettings(companyId,{modules:{...cur.modules,[module]:on}});
  };
  const connectPunchMachine=(companyId,vendor)=>{
    const cur=hrCompanySettings[companyId]||HR_COMPANY_SETTINGS_DEFAULT;
    return updateCompanySettings(companyId,{integrations:{...cur.integrations,
      punchMachine:{connected:true,vendor,lastSync:new Date().toISOString()}}});
  };
  const connectPriorSystem=(companyId,vendor)=>{
    const cur=hrCompanySettings[companyId]||HR_COMPANY_SETTINGS_DEFAULT;
    return updateCompanySettings(companyId,{integrations:{...cur.integrations,
      priorHRSystem:{connected:true,vendor,lastImport:new Date().toISOString()}}});
  };

  /* --- H4: Employee Profile as central object --- */
  const hrLoadEmployeeProfile=async(empId)=>{
    try{return await api.get(`/hr/employees/${empId}/profile`);}
    catch(e){return {error:e.message};}
  };
  const hrLoadEmployeeTimeline=async(empId,{limit=20,offset=0}={})=>{
    try{return await api.get(`/hr/employees/${empId}/timeline?limit=${limit}&offset=${offset}`);}
    catch(e){return {entries:[],total:0,nextOffset:null};}
  };

  /* --- H3: role-aware "what needs my attention today?" ---
     A single selector composing store data already loaded (hrLeave/hrTasks/hrAttendance/
     hrEvents/hrInvoices/hrPayruns/hrExpenses) rather than a new endpoint - matches the pattern
     already used on EmpHome's attention stack. Kept as a plain function (not useMemo) since the
     caller (HrDashboard) already re-renders on every store update these depend on; memoising here
     would just be a second, easily-stale cache of the same computation. */
  const hrAttentionQueue=(role,userId)=>{
    const items=[];
    const now=Date.now(); const dayMs=86400000;
    const today=_fmtDateISO(new Date());
    if(role==="owner"){
      const pendingRoleChanges=hrAuditLog.filter(a=>a.action==="role_change"&&(now-new Date(a.at||a.createdAt||now).getTime())<7*dayMs);
      if(pendingRoleChanges.length)items.push({key:"roleChanges",icon:"users",tone:"warn",n:pendingRoleChanges.length,go:"hrRoster"});
      const overuseLeave=hrLeave.filter(l=>l.status==="pending");
      if(overuseLeave.length)items.push({key:"leaveOveruse",icon:"calendar",tone:"warn",n:overuseLeave.length,go:"hrLeave"});
      const openInvoices=hrInvoices.filter(i=>i.status==="pending"||i.status==="overdue");
      if(openInvoices.length)items.push({key:"invoicesDue",icon:"wallet",tone:openInvoices.some(i=>i.status==="overdue")?"danger":"neutral",n:openInvoices.length,go:"hrInvoices"});
      const scheduledPayruns=hrPayruns.filter(p=>p.status==="scheduled");
      if(scheduledPayruns.length)items.push({key:"payrollDue",icon:"wallet",tone:"neutral",n:scheduledPayruns.length,go:"hrPayroll"});
    }else if(role==="admin"){
      const pendingInvites=hrEmployees.filter(e=>e.status==="pending");
      if(pendingInvites.length)items.push({key:"pendingInvites",icon:"user",tone:"neutral",n:pendingInvites.length,go:"hrPeople"});
      const roleChangesToReview=hrAuditLog.filter(a=>a.action==="role_change"&&(now-new Date(a.at||a.createdAt||now).getTime())<7*dayMs);
      if(roleChangesToReview.length)items.push({key:"roleChanges",icon:"shield",tone:"warn",n:roleChangesToReview.length,go:"hrRoster"});
      const pendingLeave=hrLeave.filter(l=>l.status==="pending");
      if(pendingLeave.length)items.push({key:"leaveOveruse",icon:"calendar",tone:"warn",n:pendingLeave.length,go:"hrLeave"});
    }else if(role==="hr"){
      const lateToday=hrAttendance.filter(a=>a.date===today&&a.late);
      if(lateToday.length)items.push({key:"attendanceLate",icon:"clock",tone:"warn",n:lateToday.length,go:"hrAttendance"});
      const missedClockOut=hrAttendance.filter(a=>{
        const yesterday=_fmtDateISO(new Date(now-dayMs));
        return a.date===yesterday&&!a.clockOut;
      });
      if(missedClockOut.length)items.push({key:"attendanceMissedOut",icon:"alert",tone:"danger",n:missedClockOut.length,go:"hrAttendance"});
      const pendingLeave=hrLeave.filter(l=>l.status==="pending");
      if(pendingLeave.length)items.push({key:"leavePending",icon:"calendar",tone:"warn",n:pendingLeave.length,go:"hrLeave"});
      const tasksDueToday=hrTasks.filter(t=>t.status!=="done"&&t.due===today);
      if(tasksDueToday.length)items.push({key:"tasksDueToday",icon:"check",tone:"neutral",n:tasksDueToday.length,go:"hrTasks"});
      const upcomingInterviews=(hrEvents||[]).filter(ev=>ev.type==="interview"&&new Date(ev.when||ev.event_date||0).getTime()>=now-6*3600*1000&&new Date(ev.when||ev.event_date||0).getTime()<=now+24*3600*1000);
      if(upcomingInterviews.length)items.push({key:"upcomingInterviews",icon:"calendar",tone:"neutral",n:upcomingInterviews.length,go:"hrCalendar"});
      const overdueTraining=(hrEvents||[]).filter(ev=>ev.type==="training"&&new Date(ev.when||ev.event_date||0).getTime()<now);
      if(overdueTraining.length)items.push({key:"trainingOverdue",icon:"cap",tone:"warn",n:overdueTraining.length,go:"hrTrainings"});
      const newHires=hrEmployees.filter(e=>e.status==="active"&&(now-new Date(e.hired||now).getTime())<14*dayMs);
      if(newHires.length)items.push({key:"newHires",icon:"sparkle",tone:"ok",n:newHires.length,go:"hrPeople"});
    }else if(role==="finance"){
      const scheduledPayruns=hrPayruns.filter(p=>p.status==="scheduled");
      if(scheduledPayruns.length)items.push({key:"payrollDue",icon:"wallet",tone:"neutral",n:scheduledPayruns.length,go:"hrPayroll"});
      const invoicesDue=hrInvoices.filter(i=>i.status==="pending"||i.status==="overdue");
      if(invoicesDue.length)items.push({key:"invoicesDue",icon:"file",tone:invoicesDue.some(i=>i.status==="overdue")?"danger":"neutral",n:invoicesDue.length,go:"hrInvoices"});
      const expensesWaiting=hrExpenses.filter(x=>x.status==="submitted");
      if(expensesWaiting.length)items.push({key:"expensesWaiting",icon:"check",tone:"neutral",n:expensesWaiting.length,go:"hrExpenses"});
      const paidRuns=hrPayruns.filter(p=>p.status==="paid");
      if(paidRuns.length)items.push({key:"registerExportReady",icon:"download",tone:"ok",n:paidRuns.length,go:"hrPayroll"});
    }else{ // employee
      const myTasksToday=hrTasks.filter(t=>t.status!=="done"&&t.assignee===userId&&t.due===today);
      if(myTasksToday.length)items.push({key:"myTasksDueToday",icon:"check",tone:"neutral",n:myTasksToday.length,go:"hrTasks"});
      const myUpcomingEvents=hrEvents.filter(ev=>new Date(ev.when||ev.event_date||0).getTime()>=now&&new Date(ev.when||ev.event_date||0).getTime()<=now+7*dayMs&&(ev.invitees==="all"||(ev.invitees||"").split(",").includes(userId)));
      if(myUpcomingEvents.length)items.push({key:"myUpcomingEvents",icon:"calendar",tone:"neutral",n:myUpcomingEvents.length,go:"hrCalendar"});
      const myOpenTraining=hrEvents.filter(ev=>ev.type==="training"&&new Date(ev.when||ev.event_date||0).getTime()>now&&(ev.invitees==="all"||(ev.invitees||"").split(",").includes(userId)));
      if(myOpenTraining.length)items.push({key:"myTrainingProgress",icon:"cap",tone:"neutral",n:myOpenTraining.length,go:"hrTrainings"});
      const myLeaveDecided=hrLeave.filter(l=>l.employee===userId&&l.status!=="pending");
      // Not urgent by itself - the employee's own dashboard already surfaces clock-in state and
      // leave balance in the KPI tiles; the attention stack only needs items that require action.
    }
    return items;
  };
  const _fmtDateISO=d=>d.toISOString().slice(0,10);

  /* --- Role-gated module visibility --- */
  const modulesForRole=(role)=>{
    const base=["dashboard","directory","profile","chat","calendar","tasks","expenses","policies","roster","perfReviews"];
    /* H5/H6 QA finding: the transformation plan's Employee nav explicitly includes "My Training"
       (assigned trainings show up as a task + calendar entry - see POST /hr/trainings/:id/assign
       - but with "trainings" missing here an employee could never actually open the Trainings
       page to view or progress the training itself, only the task shell around it). */
    /* H2 nav manifest: Finance and Employee reach the redesigned Directory (People, /hr/people)
       rather than being stuck on the legacy /hr/directory route "directory" alone still points
       at - see docs/PERMISSIONS.md and the H2 nav priority list in shells/HrShell.jsx. */
    const employee=[...base,"people","attendance","leave","payslips","trainings"];
    const hr=[...employee,"hiring","trainings","badges","reports"];
    const finance=[...base,"people","invoices","payroll","reports","attendance"];
    const admin=[...hr,"invoices","payroll","settings","integrations","reports"];
    const owner=[...admin];
    return {owner,admin,hr,finance,employee}[role]||employee;
  };
  const canAccessModule=(role,module)=>modulesForRole(role).includes(module);

  // Passthrough helpers so a small consumer (like the 1:1 log widget) can talk to a scoped HR
// endpoint without needing its own store integration - keeps that surface's data local rather
// than pushing every entry into the global roster load.
const hrApiGet=(path,params)=>api.get(path,params);
const hrApiPost=(path,body)=>api.post(path,body);
const hrApiPatch=(path,body)=>api.patch(path,body);
const hrApiDel=path=>api.del(path);

return {
    hrBridging,hrAuthChecked,hrApiGet,hrApiPost,hrApiPatch,hrApiDel,
    hrEmployees,hrAttendance,hrLeave,hrTasks,hrEvents,hrInvoices,hrChats,hrChatMsgs,
    hrPayruns,hrCompanySettings,hrDepartments,hrExpenses,hrAuditLog,
    hrEmp,hrEmpsAtCompany,hrCurrentEmp,hrCurrentCompany,hrLogin,hrLogout,hrAutoLogin,
    hrPublicProfile,updateEmpVisibility,updateEmp,eraseHrEmployee,addEmployee,removeEmployee,
    hrSyncStatus,hrSetSyncConsent,
    hrSignDocs,hrSignDocsAll,loadSignDocuments,createSignDocument,removeSignDocument,signDocument,loadDocumentSignatures,
    hrShifts,loadShifts,addShift,updateShift,removeShift,
    punchIn,punchOut,requestLeave,decideLeave,
    addTask,updateTaskStatus,deleteTask,addEvent,deleteEvent,
    addInvoice,markInvoicePaid,sendInvoice,printHrInvoice,reverseInvoice,
    myPayslips,printPayslip,assignTraining,markPayslipViewed,markPayslipDownloaded,disputePayslip,
    hrTaxSlipYears,hrTaxSlips,hrMyTaxSlip,hrRoe,printT4,printRoe,
    hrKioskDevices,hrCreateKioskDevice,hrRevokeKioskDevice,hrSetPunchPin,
    hrTaskComments,hrAddTaskComment,hrDeleteTaskComment,hrExpenseCategories,hrSaveExpenseCategories,
    hrDeptsAtCompany,addDepartment,updateDepartment,removeDepartment,
    empExpenses,companyExpenses,submitExpense,decideExpense,payExpense,
    runPayroll,approvePayroll,executePayroll,reversePayroll,
    awardBadge,removeBadge,
    sendHrMessage,createHrChat,markHrChatRead,updateCompanySettings,toggleModule,
    connectPunchMachine,connectPriorSystem,
    loadEmployeeDocuments,uploadEmployeeDocument,downloadEmployeeDocument,deleteEmployeeDocument,
    modulesForRole,canAccessModule,
    hrLoadEmployeeProfile,hrLoadEmployeeTimeline,hrAttentionQueue,
    HR_DEPARTMENTS,HR_ROLES,PUNCH_VENDORS,PRIOR_HR_VENDORS,
  };
}
