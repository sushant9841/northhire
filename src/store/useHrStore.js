import { useState } from "react";
import { uid, _fmtDate } from "../helpers/utils.js";
import { HR_EMPLOYEE, HR_EMPLOYEES } from "./seed/hrEmployees.js";
import { HR_ATTENDANCE } from "./seed/hrAttendance.js";
import { HR_LEAVE_REQUESTS } from "./seed/hrLeave.js";
import { HR_TASKS } from "./seed/hrTasks.js";
import { HR_EVENTS } from "./seed/hrEvents.js";
import { HR_INVOICES } from "./seed/hrInvoices.js";
import { HR_CHATS, HR_CHAT_MESSAGES } from "./seed/hrChats.js";
import { HR_PAYRUNS } from "./seed/hrPayruns.js";
import { HR_ROLES, HR_COMPANY_SETTINGS_DEFAULT, PUNCH_VENDORS, PRIOR_HR_VENDORS } from "./seed/hrCompanySettings.js";
import { HR_DEPARTMENTS, HR_DEPARTMENTS_SEED } from "./seed/hrDepartments.js";
import { HR_EXPENSES_SEED } from "./seed/hrExpenses.js";

/* ═══════════════════════════════════════════════════════════════════════════
   HR STORE — helpers that plug into the main NorthHire store.
   Kept in a separate function so it can be composed cleanly.
   These are hooks-based and are called from within the main store.
   ═══════════════════════════════════════════════════════════════════════════ */

export function useHrStore(seed,mainStore){
  const [hrEmployees,setHrEmployees]=useState(seed?.hrEmployees||HR_EMPLOYEES);
  const [hrAttendance,setHrAttendance]=useState(seed?.hrAttendance||HR_ATTENDANCE);
  const [hrLeave,setHrLeave]=useState(seed?.hrLeave||HR_LEAVE_REQUESTS);
  const [hrTasks,setHrTasks]=useState(seed?.hrTasks||HR_TASKS);
  const [hrEvents,setHrEvents]=useState(seed?.hrEvents||HR_EVENTS);
  const [hrInvoices,setHrInvoices]=useState(seed?.hrInvoices||HR_INVOICES);
  const [hrChats,setHrChats]=useState(seed?.hrChats||HR_CHATS);
  const [hrChatMsgs,setHrChatMsgs]=useState(seed?.hrChatMsgs||HR_CHAT_MESSAGES);
  const [hrPayruns,setHrPayruns]=useState(seed?.hrPayruns||HR_PAYRUNS);
  const [hrCompanySettings,setHrCompanySettings]=useState(seed?.hrCompanySettings||{e1:HR_COMPANY_SETTINGS_DEFAULT});
  const [hrSession,setHrSession]=useState(seed?.hrSession||null); /* {employeeId, companyId} */
  const [hrRemember,setHrRemember]=useState(seed?.hrRemember||null); /* {company,loginId} */
  /* NEW: departments as first-class managed entity per company */
  const [hrDepartments,setHrDepartments]=useState(seed?.hrDepartments||HR_DEPARTMENTS_SEED);
  /* NEW: expenses — per-employee reimbursement claims with approval + payout flow */
  const [hrExpenses,setHrExpenses]=useState(seed?.hrExpenses||HR_EXPENSES_SEED);

  const hrEmp=id=>hrEmployees.find(e=>e.id===id);
  const hrEmpsAtCompany=cid=>hrEmployees.filter(e=>e.companyId===cid);
  const hrCurrentEmp=()=>hrSession?hrEmp(hrSession.employeeId):null;
  const hrCurrentCompany=()=>hrSession?mainStore.employers.find(e=>e.id===hrSession.companyId):null;

  /* --- HR authentication --- */
  /* Company + login ID (employee email prefix or full email) + password.
     All PCL employees use password "pcl2026" for the demo. */
  const HR_DEMO_PASSWORD="pcl2026";
  const hrLogin=(companyName,loginId,password,remember)=>{
    const company=mainStore.employers.find(e=>e.name.toLowerCase()===(companyName||"").toLowerCase().trim());
    if(!company)return {ok:false,msg:`No company named "${companyName}"`};
    if(company.plan!=="Enterprise")return {ok:false,msg:`${company.name} does not have an Enterprise plan. HR Suite is Enterprise-only.`};
    const id=(loginId||"").toLowerCase().trim();
    const emp=hrEmpsAtCompany(company.id).find(e=>
      e.email.toLowerCase()===id ||
      e.email.toLowerCase().split("@")[0]===id ||
      e.name.toLowerCase()===id
    );
    if(!emp)return {ok:false,msg:"No employee with that login ID at "+company.name};
    if(emp.status==="terminated")return {ok:false,msg:"This employee account is not active"};
    if(password!==HR_DEMO_PASSWORD)return {ok:false,msg:"Password does not match"};
    setHrSession({employeeId:emp.id,companyId:company.id,at:Date.now()});
    if(remember){setHrRemember({company:company.name,loginId});
      try{localStorage.setItem("northhire.hr.remember",JSON.stringify({company:company.name,loginId}));}catch{}
    }
    return {ok:true,employee:emp,company};
  };
  const hrLogout=()=>{setHrSession(null);};

  /* --- Sync layer: HR employee ↔ NorthHire seeker profile ---
     When an HR record has a `linkedNorthHireUserId` (or matching email in
     mainStore.people), the two stay aligned. Public seeker profile can
     surface HR-derived stats: tenure, badges, current title, department. */
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

  const updateEmpVisibility=(empId,patch)=>{
    setHrEmployees(l=>l.map(e=>e.id===empId?{...e,visibility:{...e.visibility,...patch}}:e));
  };

  const updateEmp=(empId,patch)=>{
    setHrEmployees(l=>l.map(e=>e.id===empId?{...e,...patch}:e));
  };

  const addEmployee=(data)=>{
    const emp=HR_EMPLOYEE(uid("emp"),data.companyId||hrSession?.companyId,
      data.name,data.email,data.role||"employee",data.dept,data.title,
      data.hired||new Date().toISOString().slice(0,10),
      data.seed||Math.floor(Math.random()*11),data.phone,data.city,data.prov,
      data.salary,data.birthDate,data.manager,data.skills||[],data.badges||[]);
    setHrEmployees(l=>[...l,emp]);
    return emp;
  };
  const removeEmployee=(empId)=>{
    /* Reassign the departing employee's direct reports up to their own manager instead of
       leaving a dangling `manager` reference — otherwise those reports silently vanish from
       the org chart and directory (both only render active employees). */
    setHrEmployees(l=>{
      const leaving=l.find(e=>e.id===empId);
      const newManager=leaving?leaving.manager:null;
      return l.map(e=>{
        if(e.id===empId)return {...e,status:"terminated"};
        if(e.manager===empId)return {...e,manager:newManager};
        return e;
      });
    });
  };

  /* --- Attendance --- */
  const punchIn=(empId,source)=>{
    const today=_fmtDate(new Date());
    const now=new Date(); const time=`${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    const existing=hrAttendance.find(a=>a.employee===empId&&a.date===today);
    if(existing)return {ok:false,msg:"Already punched in today at "+existing.clockIn};
    /* Late flag actually derived from the company's own working-hours/threshold settings
       instead of those settings sitting unread. */
    const companyId=hrEmp(empId)?.companyId;
    const att=(hrCompanySettings[companyId]||HR_COMPANY_SETTINGS_DEFAULT).attendance;
    const [sh,sm]=att.workingHoursStart.split(":").map(Number);
    const lateAfter=sh*60+sm+(att.lateThresholdMin||0);
    const late=(now.getHours()*60+now.getMinutes())>lateAfter;
    const rec={id:`att_${empId}_${today}`,employee:empId,date:today,clockIn:time,clockOut:null,source:source||"web",hours:0,site:"Head Office",late};
    setHrAttendance(l=>[rec,...l]);
    return {ok:true,rec};
  };
  const punchOut=empId=>{
    const now=new Date(); const time=`${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    /* Find the open punch regardless of date — an overnight shift clocks in "yesterday" and
       clocks out "today", so requiring today's date here meant punchOut incorrectly claimed
       "you haven't punched in today" for anyone working past midnight. */
    const existing=[...hrAttendance].sort((a,b)=>b.date.localeCompare(a.date)).find(a=>a.employee===empId&&!a.clockOut);
    if(!existing)return {ok:false,msg:"You haven't punched in"};
    const clockInAt=new Date(`${existing.date}T${existing.clockIn}:00`);
    const hours=Math.max(0,Math.round((now-clockInAt)/36000)/100);
    setHrAttendance(l=>l.map(a=>a.id===existing.id?{...a,clockOut:time,hours}:a));
    return {ok:true,hours};
  };

  /* --- Leave --- */
  const requestLeave=data=>{
    const req={id:uid("lv"),employee:hrSession?.employeeId,type:data.type,from:data.from,to:data.to,
      days:data.days,status:"pending",reason:data.reason,approvedBy:null,requestedAt:Date.now()};
    setHrLeave(l=>[req,...l]);
    return req;
  };
  const decideLeave=(id,decision,approverId)=>{
    setHrLeave(l=>l.map(r=>r.id===id?{...r,status:decision,approvedBy:approverId}:r));
  };

  /* --- Tasks --- */
  const addTask=data=>{
    const t={id:uid("tk"),title:data.title,assignee:data.assignee,assignedBy:hrSession?.employeeId,
      due:data.due,priority:data.priority||"medium",status:"todo",created:Date.now(),tags:data.tags||[]};
    setHrTasks(l=>[t,...l]);
    return t;
  };
  const updateTaskStatus=(id,status)=>{
    setHrTasks(l=>l.map(t=>t.id===id?{...t,status,completed:status==="done"?Date.now():null}:t));
  };
  const deleteTask=id=>setHrTasks(l=>l.filter(t=>t.id!==id));

  /* --- Events --- */
  const addEvent=data=>{const ev={id:uid("ev"),...data,organiser:hrSession?.employeeId}; setHrEvents(l=>[ev,...l]);return ev;};
  const deleteEvent=id=>setHrEvents(l=>l.filter(e=>e.id!==id));

  /* --- Invoices --- */
  const addInvoice=data=>{
    const next=1042+hrInvoices.length+1;
    const inv={id:uid("inv"),number:`INV-2026-${next}`,client:data.client,amount:Number(data.amount)||0,
      status:"draft",issued:_fmtDate(new Date()),due:data.due,paid:null,createdBy:hrSession?.employeeId,po:data.po||""};
    setHrInvoices(l=>[inv,...l]);
    return inv;
  };
  const markInvoicePaid=id=>setHrInvoices(l=>l.map(i=>i.id===id?{...i,status:"paid",paid:_fmtDate(new Date())}:i));
  const sendInvoice=id=>setHrInvoices(l=>l.map(i=>i.id===id?{...i,status:"pending"}:i));
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

  /* --- Departments --- */
  const hrDeptsAtCompany=cid=>hrDepartments.filter(d=>d.companyId===cid);
  const addDepartment=data=>{
    const d={id:uid("d"),companyId:data.companyId,name:data.name,lead:data.lead||null,
      color:data.color||"#6AACFF",about:data.about||"",createdAt:Date.now()};
    setHrDepartments(l=>[...l,d]);
    return d;
  };
  const updateDepartment=(id,patch)=>{
    setHrDepartments(l=>l.map(d=>d.id===id?{...d,...patch}:d));
  };
  const removeDepartment=id=>{
    /* Only remove if no employees are assigned. Caller must check. */
    const assigned=hrEmployees.filter(e=>e.dept===id).length;
    if(assigned>0)return {ok:false,msg:`${assigned} employees are in this department. Move them first.`};
    setHrDepartments(l=>l.filter(d=>d.id!==id));
    return {ok:true};
  };

  /* --- Expenses --- */
  const empExpenses=empId=>hrExpenses.filter(x=>x.employee===empId).sort((a,b)=>b.submitted-a.submitted);
  const companyExpenses=cid=>{
    const empIds=new Set(hrEmpsAtCompany(cid).map(e=>e.id));
    return hrExpenses.filter(x=>empIds.has(x.employee)).sort((a,b)=>b.submitted-a.submitted);
  };
  const submitExpense=data=>{
    const x={id:uid("xp"),employee:data.employee||hrSession?.employeeId,category:data.category,
      merchant:data.merchant,amount:Number(data.amount)||0,currency:data.currency||"CAD",
      description:data.description||"",receiptUrl:data.receiptUrl||null,date:data.date,
      status:"submitted",submitted:Date.now(),approvedBy:null,approvedAt:null,paidAt:null,rejectReason:null,
      reimburseVia:data.reimburseVia||"next-payroll"};
    setHrExpenses(l=>[x,...l]);
    return x;
  };
  const decideExpense=(id,decision,approverId,reason)=>{
    setHrExpenses(l=>l.map(x=>x.id===id?{...x,status:decision,approvedBy:approverId,
      approvedAt:decision==="approved"?Date.now():x.approvedAt,rejectReason:reason||null}:x));
  };
  const payExpense=id=>{
    setHrExpenses(l=>l.map(x=>x.id===id?{...x,status:"paid",paidAt:Date.now()}:x));
  };

  /* --- Payroll runs — biweekly by default. Computes gross/deductions/net per employee. --- */
  const runPayroll=(companyId,periodStart,periodEnd)=>{
    const emps=hrEmpsAtCompany(companyId).filter(e=>e.status==="active");
    /* Include approved (unpaid) expenses in this run */
    const empIds=new Set(emps.map(e=>e.id));
    const dueExpenses=hrExpenses.filter(x=>empIds.has(x.employee)&&x.status==="approved"&&x.reimburseVia==="next-payroll");
    const expByEmp={}; dueExpenses.forEach(x=>{expByEmp[x.employee]=(expByEmp[x.employee]||0)+x.amount;});
    const lines=emps.map(e=>{
      const grossPeriod=Math.round((e.salary||0)/26); /* biweekly */
      const reimb=expByEmp[e.id]||0;
      const cpp=Math.round(grossPeriod*0.0595); /* 2026 CPP rate */
      const ei=Math.round(grossPeriod*0.0221);  /* 2026 EI rate */
      const fedTax=Math.round(grossPeriod*0.145); /* effective marginal after credits */
      const provTax=Math.round(grossPeriod*0.075);
      const deductions=cpp+ei+fedTax+provTax;
      const net=grossPeriod-deductions+reimb;
      return {employee:e.id,name:e.name,gross:grossPeriod,cpp,ei,fedTax,provTax,reimb,net};
    });
    const totalGross=lines.reduce((s,l)=>s+l.gross,0);
    const totalNet=lines.reduce((s,l)=>s+l.net,0);
    const totalReimb=lines.reduce((s,l)=>s+l.reimb,0);
    const run={id:uid("pr"),companyId,period:`${periodStart} → ${periodEnd}`,periodStart,periodEnd,
      runDate:_fmtDate(new Date()),status:"draft",employees:lines.length,
      totalGross,totalNet,totalReimb,lines};
    setHrPayruns(l=>[run,...l]);
    return run;
  };
  const approvePayroll=id=>{
    setHrPayruns(l=>l.map(p=>p.id===id?{...p,status:"approved",approvedAt:Date.now()}:p));
  };
  const executePayroll=id=>{
    const run=hrPayruns.find(p=>p.id===id); if(!run)return;
    /* Mark the run paid + flip any approved expenses in it to paid */
    setHrPayruns(l=>l.map(p=>p.id===id?{...p,status:"paid",paidAt:Date.now()}:p));
    setHrExpenses(l=>l.map(x=>{
      if(x.status==="approved"&&x.reimburseVia==="next-payroll"){
        const inRun=run.lines.find(ln=>ln.employee===x.employee);
        if(inRun&&inRun.reimb>0)return {...x,status:"paid",paidAt:Date.now()};
      }
      return x;
    }));
  };

  /* --- Badges: award/remove internal recognition badges to employees --- */
  const awardBadge=(empId,badge)=>{
    setHrEmployees(l=>l.map(e=>e.id===empId?{...e,badges:[...(e.badges||[]).filter(b=>b!==badge),badge]}:e));
  };
  const removeBadge=(empId,badge)=>{
    setHrEmployees(l=>l.map(e=>e.id===empId?{...e,badges:(e.badges||[]).filter(b=>b!==badge)}:e));
  };

  /* --- Chat --- */
  const sendHrMessage=(chatId,text)=>{
    const m={id:uid("hm"),chat:chatId,from:hrSession?.employeeId,text,at:Date.now()};
    setHrChatMsgs(l=>[...l,m]);
    return m;
  };
  const createHrChat=data=>{
    const c={id:uid("gc"),kind:data.kind||"group",name:data.name,members:data.members,
      about:data.about||"",createdBy:hrSession?.employeeId,createdAt:Date.now()};
    setHrChats(l=>[c,...l]);
    return c;
  };

  /* --- Company settings & integrations --- */
  const updateCompanySettings=(companyId,patch)=>{
    setHrCompanySettings(s=>({...s,[companyId]:{...(s[companyId]||HR_COMPANY_SETTINGS_DEFAULT),...patch}}));
  };
  const toggleModule=(companyId,module,on)=>{
    setHrCompanySettings(s=>{
      const cur=s[companyId]||HR_COMPANY_SETTINGS_DEFAULT;
      return {...s,[companyId]:{...cur,modules:{...cur.modules,[module]:on}}};
    });
  };
  const connectPunchMachine=(companyId,vendor)=>{
    setHrCompanySettings(s=>{
      const cur=s[companyId]||HR_COMPANY_SETTINGS_DEFAULT;
      return {...s,[companyId]:{...cur,integrations:{...cur.integrations,
        punchMachine:{connected:true,vendor,lastSync:new Date().toISOString()}}}};
    });
  };
  const connectPriorSystem=(companyId,vendor)=>{
    setHrCompanySettings(s=>{
      const cur=s[companyId]||HR_COMPANY_SETTINGS_DEFAULT;
      return {...s,[companyId]:{...cur,integrations:{...cur.integrations,
        priorHRSystem:{connected:true,vendor,lastImport:new Date().toISOString()}}}};
    });
  };

  /* --- Role-gated module visibility --- */
  const modulesForRole=(role)=>{
    /* "expenses" belongs on base, not just employee - finance builds off base (not employee) and
       still needs to see and decide on submitted expenses. */
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
    hrEmployees,setHrEmployees,hrAttendance,setHrAttendance,hrLeave,setHrLeave,hrTasks,setHrTasks,
    hrEvents,setHrEvents,hrInvoices,setHrInvoices,hrChats,setHrChats,hrChatMsgs,setHrChatMsgs,
    hrPayruns,setHrPayruns,hrCompanySettings,setHrCompanySettings,hrSession,setHrSession,hrRemember,setHrRemember,
    hrDepartments,setHrDepartments,hrExpenses,setHrExpenses,
    hrEmp,hrEmpsAtCompany,hrCurrentEmp,hrCurrentCompany,hrLogin,hrLogout,
    hrPublicProfile,updateEmpVisibility,updateEmp,addEmployee,removeEmployee,
    punchIn,punchOut,requestLeave,decideLeave,
    addTask,updateTaskStatus,deleteTask,addEvent,deleteEvent,
    addInvoice,markInvoicePaid,sendInvoice,printHrInvoice,
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
