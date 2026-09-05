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
  const addEmployee=async(data)=>{
    /* Reachable from the employer console right after a hire, before the employer has ever
       opened HR Suite in this session - bridge into an HR session first if one isn't active yet. */
    if(!hrEmployee)await hrAutoLogin();
    const {employee}=await api.post("/hr/employees",data);
    setHrEmployees(l=>[...l,employee]);
    return employee;
  };
  const removeEmployee=async(empId)=>{
    await api.del(`/hr/employees/${empId}`);
    const {employees}=await api.get("/hr/employees"); /* refetch - manager reassignment happens server-side */
    setHrEmployees(employees);
  };

  /* --- Attendance --- */
  const punchIn=async(empId,source)=>{
    try{
      const {record}=await api.post("/hr/attendance/punch-in",{employeeId:empId,source});
      setHrAttendance(l=>[record,...l]);
      return {ok:true,rec:record};
    }catch(e){return {ok:false,msg:e.message};}
  };
  const punchOut=async(empId)=>{
    try{
      const {hours,earlyLeave,record}=await api.post("/hr/attendance/punch-out",{employeeId:empId});
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
    const html=`<!DOCTYPE html><html><head><title>Payslip — ${line.name} — ${run.period}</title>
      <style>body{font-family:Arial,Helvetica,sans-serif;max-width:680px;margin:40px auto;padding:0 30px;color:#111;line-height:1.5}
        .brand{font-size:20pt;font-weight:700;color:#B45309;margin-bottom:2px}.sub{font-size:9pt;color:#888;margin-bottom:24px}
        h1{font-size:15pt;margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:18px}
        th{text-align:left;font-size:9pt;text-transform:uppercase;letter-spacing:.05em;color:#888;border-bottom:2px solid #ddd;padding:8px 0}
        td{padding:9px 0;border-bottom:1px solid #eee;font-size:11pt}.right{text-align:right}
        .totals{margin-top:10px;margin-left:auto;width:280px}.totals div{display:flex;justify-content:space-between;padding:4px 0;font-size:11pt}
        .totals .grand{font-weight:700;font-size:13pt;border-top:2px solid #111;padding-top:8px;margin-top:4px}
        .meta{display:flex;justify-content:space-between;margin:20px 0;font-size:10pt;color:#555}
        @media print{@page{margin:1.5cm}}</style></head><body>
      <div class="brand">${(company?.name||"Your company").replace(/[<>]/g,"")}</div><div class="sub">Statement of earnings and deductions</div>
      <h1>Payslip — ${line.name}</h1>
      <div class="meta"><div>Employee<br><strong>${line.name}</strong><br>${(employee?.title||"")}</div>
        <div style="text-align:right">Pay period<br><strong>${run.period}</strong><br>Pay date: ${run.runDate}</div></div>
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
      <div style="margin-top:30px;font-size:8.5pt;color:#999">CPP/EI/tax shown are estimated at flat statutory rates, not full CRA brackets and credits — not a substitute for an official T4.</div>
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

  /* --- Role-gated module visibility --- */
  const modulesForRole=(role)=>{
    const base=["dashboard","directory","profile","chat","calendar","tasks","expenses"];
    const employee=[...base,"attendance","leave","payslips"];
    const hr=[...employee,"people","hiring","trainings","badges","reports"];
    const finance=[...base,"invoices","payroll","reports","attendance"];
    const admin=[...hr,"invoices","payroll","settings","integrations","reports"];
    const owner=[...admin];
    return {owner,admin,hr,finance,employee}[role]||employee;
  };
  const canAccessModule=(role,module)=>modulesForRole(role).includes(module);

  return {
    hrBridging,hrAuthChecked,
    hrEmployees,hrAttendance,hrLeave,hrTasks,hrEvents,hrInvoices,hrChats,hrChatMsgs,
    hrPayruns,hrCompanySettings,hrDepartments,hrExpenses,hrAuditLog,
    hrEmp,hrEmpsAtCompany,hrCurrentEmp,hrCurrentCompany,hrLogin,hrLogout,hrAutoLogin,
    hrPublicProfile,updateEmpVisibility,updateEmp,addEmployee,removeEmployee,
    punchIn,punchOut,requestLeave,decideLeave,
    addTask,updateTaskStatus,deleteTask,addEvent,deleteEvent,
    addInvoice,markInvoicePaid,sendInvoice,printHrInvoice,
    myPayslips,printPayslip,
    hrDeptsAtCompany,addDepartment,updateDepartment,removeDepartment,
    empExpenses,companyExpenses,submitExpense,decideExpense,payExpense,
    runPayroll,approvePayroll,executePayroll,
    awardBadge,removeBadge,
    sendHrMessage,createHrChat,updateCompanySettings,toggleModule,
    connectPunchMachine,connectPriorSystem,
    modulesForRole,canAccessModule,
    HR_DEPARTMENTS,HR_ROLES,PUNCH_VENDORS,PRIOR_HR_VENDORS,
  };
}
