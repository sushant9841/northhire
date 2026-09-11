import { useState, useEffect } from "react";
import { DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C, SH } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import {
  Btn, Card, Tag, Field, Input, Sel, Area, CheckRow, Banner, Lbl, Modal, Switch, DatePicker,
  SmartPortrait, SmartScene, Empty, ConfirmDialog, usePagination, Pagination, TH_CLASS as TH_CLS, TD_CLASS as TD_CLS,
} from "../../design/primitives.jsx";
import { _fmtDate } from "../../helpers/utils.js";
import { invoiceTone } from "../../helpers/statusTone.js";
import { salesTaxRate, salesTaxLabel } from "../../helpers/salesTax.js";
import { ROE_REASONS } from "../../helpers/taxSlips.js";
import { vacationBalance, usedDaysByYear } from "../../helpers/leaveAccrual.js";
import { HR_ROLES, HR_COMPANY_SETTINGS_DEFAULT, PUNCH_VENDORS, PRIOR_HR_VENDORS, HR_MODULES } from "../../store/seed/hrCompanySettings.js";
import { HR_DEPARTMENTS } from "../../store/seed/hrDepartments.js";
import { InlineList } from "../shared/formControls.jsx";
import { TrainingCard } from "../shared/cards.jsx";
import { useTranslation } from "../../i18n/i18n.jsx";

/* Small pill-style tab bar reused across most HR Suite modules (attendance view,
   leave/tasks/calendar/invoices scope switches). Not string-interpolated into a
   className — each branch is a complete literal so Tailwind's scanner sees both. */
function _PillTabs({items,value,onChange}){
  return <div className="flex bg-bg rounded-lg p-0.5 border border-line flex-wrap" style={{width:"fit-content"}}>
    {items.map(([v,l])=><button key={v} onClick={()=>onChange(v)}
      className={`border-0 py-1.5 px-3.5 rounded-md cursor-pointer text-xs font-semibold ${value===v?"bg-white text-brand":"bg-transparent text-text-3"}`}>{l}</button>)}
  </div>;
}

export function HrLoginPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const [company,setCompany]=useState("PCL Construction");
  const [loginId,setLoginId]=useState("");
  const [pw,setPw]=useState("");
  const [err,setErr]=useState(""); const [busy,setBusy]=useState(false);

  const submit=async()=>{setErr(""); setBusy(true);
    const r=await A.hrLogin(company,loginId,pw);
    setBusy(false);
    if(!r.ok){setErr(r.msg);return;}
    A.go("hrDashboard");
  };
  const demoAs=async(id)=>{setLoginId(id); setPw("pcl2026"); setErr(""); setBusy(true);
    const r=await A.hrLogin("PCL Construction",id,"pcl2026");
    setBusy(false);
    if(!r.ok)setErr(r.msg); else A.go("hrDashboard");
  };

  const formCol=(inner)=><div className={`flex-1 min-w-0 flex items-center justify-center bg-white ${mob?"px-4 py-8":"px-10 py-12"}`}>
    <div className="w-full max-w-md">{inner}</div></div>;
  const illusCol=!mob&&<div className="flex-1 min-w-0 relative overflow-hidden bg-wash">
    <SmartScene kind="office" tone={C.ink} w="100%" h="100%" seed={2} style={{position:"absolute",inset:0}}/>
    <div className="absolute inset-0" style={{background:"linear-gradient(180deg,rgba(10,25,41,0) 40%,rgba(10,25,41,.6) 100%)"}}/>
    <div className="absolute left-8 right-8 bottom-9 text-white">
      <div className="text-sm font-bold text-accent tracking-wide uppercase mb-3">{t("hr.login.enterpriseTitle")}</div>
      <div className="text-2xl font-bold tracking-tight leading-snug mb-2">{t("hr.login.heroHeading").split("\n").map((line,i)=><span key={i}>{line}{i===0&&<br/>}</span>)}</div>
      <p className="text-sm text-white/80 leading-relaxed max-w-90">{t("hr.login.heroBody")}</p></div>
    <div className="absolute right-7 top-7 bg-white rounded-2xl py-3 px-4 shadow-lg flex items-center gap-2.5">
      <div className="flex">{[2,4,7].map((s,i)=><div key={s} className={`${i?"-ml-3":""} border-2 border-white rounded-full flex`}><SmartPortrait seed={s} size={28}/></div>)}</div>
      <div><div className="text-sm font-bold text-text">{t("hr.login.roleAccess")}</div>
        <div className="text-xs text-text-2 mt-0.5">{t("hr.login.roles")}</div></div></div>
  </div>;

  return <div className="bg-white min-h-screen flex flex-col">
    <div className={`flex items-center justify-between border-b border-line-soft ${mob?"py-4 px-5":"py-5 px-10"}`}>
      <button onClick={()=>A.go("home")} className="flex items-center gap-2.5 bg-transparent border-0 text-text cursor-pointer">
        <div className="w-9 h-9 rounded-lg bg-wash border border-line-2 flex items-center justify-center"><I n="sparkle" s={18} c={C.brand}/></div>
        <span className="font-bold tracking-tight" style={{fontSize:16.5}}>NorthHire <span className="text-brand font-semibold">{t("hr.login.title")}</span></span>
      </button>
      <button onClick={()=>A.go("home")} className="bg-transparent border border-line text-text-2 py-1.5 px-3.5 rounded-lg cursor-pointer text-sm font-semibold hover:bg-bg">{t("hr.login.backToNorthHire")}</button>
    </div>
    <div className="flex-1 flex min-h-0">
      {illusCol}
      {formCol(<>
        <h2 className="text-2xl font-bold tracking-tight mb-2">{t("hr.login.signInTitle")}</h2>
        <p className="text-sm text-text-2 mb-6">{t("hr.login.signInSubtitle")}</p>
        <div className="flex flex-col gap-3.5">
          <Field label={t("hr.login.companyLabel")}><Input icon="building" value={company} onChange={e=>{setCompany(e.target.value);setErr("");}}
            placeholder={t("hr.login.companyPlaceholder")} onKeyDown={e=>e.key==="Enter"&&submit()}/></Field>
          <Field label={t("hr.login.loginIdLabel")} hint={t("hr.login.loginIdHint")}>
            <Input icon="user" value={loginId} onChange={e=>{setLoginId(e.target.value);setErr("");}} placeholder={t("hr.login.loginIdPlaceholder")}
              onKeyDown={e=>e.key==="Enter"&&submit()}/></Field>
          <Field label={t("hr.login.passwordLabel")}><Input icon="lock" type="password" value={pw} onChange={e=>{setPw(e.target.value);setErr("");}}
            placeholder={t("hr.login.passwordPlaceholder")} onKeyDown={e=>e.key==="Enter"&&submit()}/></Field>
          {err&&<Banner tone="danger" icon="alert" title={t("hr.login.signInFailed")}>{err}</Banner>}
          <Btn kind="primary" size="lg" full iconR="arrowR" onClick={submit} disabled={busy}>{busy?t("hr.login.signingIn"):t("hr.login.enterHrSuite")}</Btn>
        </div>
        <div className="mt-5 p-3.5 bg-tint rounded-xl border border-line-2">
          <div className="text-xs font-bold text-brand tracking-wide uppercase mb-2">{t("hr.login.demoTitle")}</div>
          <div className="grid gap-1.5">
            {t("hr.login.demoAccounts").map(({id,role})=>
              <button key={id} onClick={()=>demoAs(id)} className="flex justify-between items-center bg-white border border-line rounded-lg py-2 px-3 cursor-pointer">
                <span className="text-xs font-semibold text-text">{id}</span>
                <span className="text-xs font-semibold text-brand">{role} →</span></button>)}
            <div className="text-xs text-text-3 mt-1.5 text-center">{t("hr.login.demoPassword")} <strong className="text-text">pcl2026</strong></div>
          </div>
        </div>
      </>)}
    </div>
  </div>;
}

/* ═════════════ HR Shell — sidebar + top bar + main slot ═════════════ */

/* ═════ Dashboard — each module gets its own function ═════ */

export function HrDashboard(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const emp=A.hrCurrentEmp(); const company=A.hrCurrentCompany();
  if(!emp) return null;
  const myTasks=A.hrTasks.filter(t=>t.assignee===emp.id&&t.status!=="done");
  /* An overnight shift's open punch carries yesterday's date, so an open record (any date) takes
     priority over strictly-today's row - otherwise an overnight worker shows "Not clocked in" and
     can double punch-in instead of seeing the punch-out button. */
  const todayAttendance=A.hrAttendance.find(a=>a.employee===emp.id&&!a.clockOut)||A.hrAttendance.find(a=>a.employee===emp.id&&a.date===_fmtDate(new Date()));
  const pendingLeave=A.hrLeave.filter(l=>l.status==="pending");
  const myLeave=A.hrLeave.filter(l=>l.employee===emp.id);
  const upcomingEvents=A.hrEvents.filter(ev=>new Date(ev.when)>=new Date()).sort((a,b)=>new Date(a.when)-new Date(b.when)).slice(0,3);
  const teamSize=A.hrEmpsAtCompany(company.id).filter(e=>e.status==="active").length;
  const openInvoices=A.hrInvoices.filter(i=>i.status==="pending"||i.status==="overdue");
  const overdueInvoices=A.hrInvoices.filter(i=>i.status==="overdue");
  const dept=A.HR_DEPARTMENTS.find(d=>d.id===emp.dept);
  const settings=A.hrCompanySettings[company.id]||HR_COMPANY_SETTINGS_DEFAULT;

  /* Role-specific hero KPIs */
  const kpis=(()=>{
    if(emp.role==="owner"||emp.role==="admin")return [
      {label:t("hr.dashboard.kpiEmployees"),value:teamSize,icon:"users"},
      {label:t("hr.dashboard.kpiPendingLeave"),value:pendingLeave.length,icon:"calendar",tone:pendingLeave.length?C.warn:C.text},
      {label:t("hr.dashboard.kpiOpenInvoices"),value:openInvoices.length,icon:"wallet",tone:overdueInvoices.length?C.danger:C.text},
      {label:t("hr.dashboard.kpiOpenTasksCompany"),value:A.hrTasks.filter(t=>t.status!=="done").length,icon:"check"}];
    if(emp.role==="hr")return [
      {label:t("hr.dashboard.kpiEmployees"),value:teamSize,icon:"users"},
      {label:t("hr.dashboard.kpiPendingLeave"),value:pendingLeave.length,icon:"calendar",tone:pendingLeave.length?C.warn:C.text},
      {label:t("hr.dashboard.kpiTrainingsThisWeek"),value:A.hrEvents.filter(e=>e.type==="training").length,icon:"cap"},
      {label:t("hr.dashboard.kpiMyTasks"),value:myTasks.length,icon:"check"}];
    if(emp.role==="finance")return [
      {label:t("hr.dashboard.kpiOpenInvoices"),value:openInvoices.length,icon:"wallet",tone:overdueInvoices.length?C.danger:C.text},
      {label:t("hr.dashboard.kpiOverdue"),value:overdueInvoices.length,icon:"alert",tone:overdueInvoices.length?C.danger:C.text},
      {label:t("hr.dashboard.kpiNextPayroll"),value:A.hrPayruns.find(p=>p.status==="scheduled")?.period||"—",icon:"wallet"},
      {label:t("hr.dashboard.kpiMyTasks"),value:myTasks.length,icon:"check"}];
    return [
      {label:t("hr.dashboard.kpiMyTasks"),value:myTasks.length,icon:"check"},
      {label:t("hr.dashboard.kpiTodaysStatus"),value:todayAttendance?(todayAttendance.clockOut?t("hr.dashboard.statusSignedOut"):t("hr.dashboard.statusWorking")):t("hr.dashboard.statusNotClockedIn"),icon:"clock",tone:todayAttendance?C.ok:C.text3},
      {label:t("hr.dashboard.kpiLeaveBalance"),value:settings.leave.annualVacationDays-myLeave.filter(l=>l.status==="approved"&&l.type==="Vacation").reduce((s,l)=>s+l.days,0),icon:"calendar"},
      {label:t("hr.dashboard.kpiBadges"),value:emp.badges.length,icon:"award"}];
  })();

  return <div>
    <div className="mb-6">
      <div className={`font-bold text-text tracking-tight ${mob?"text-2xl":"text-3xl"}`}>{t("hr.dashboard.welcomeBack",{name:emp.name.split(" ")[0]})}</div>
      <div className="text-sm text-text-2 mt-1.5">
        {new Date().toLocaleDateString(locale==="fr"?"fr-CA":"en-CA",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}
        {/* Live daily-signal after the date instead of the department name, which was filler
            (the reader already knows their own department). Pending leave for a manager, open
            invoices for finance, own open tasks otherwise - each is a real number that gives
            the dashboard an at-a-glance state. */}
        {(()=>{const p=A.hrLeave.filter(l=>l.status==="pending").length;
          const inv=A.hrInvoices.filter(i=>i.status==="unpaid").length;
          const myOpen=A.hrTasks.filter(t=>t.status!=="done"&&t.assignee===emp.id).length;
          if(emp.role==="owner"||emp.role==="hr"||emp.role==="admin"){
            const bits=[]; if(p)bits.push(t(p===1?"hr.dashboard.pendingLeaveDecisionSingle":"hr.dashboard.pendingLeaveDecisionPlural",{count:p}));
            if(inv)bits.push(t(inv===1?"hr.dashboard.openInvoiceSingle":"hr.dashboard.openInvoicePlural",{count:inv}));
            return bits.length?<> • {bits.join(" · ")}</>:null;
          }
          if(emp.role==="finance") return inv?<> • {t(inv===1?"hr.dashboard.openInvoiceSingle":"hr.dashboard.openInvoicePlural",{count:inv})}</>:null;
          return myOpen?<> • {t(myOpen===1?"hr.dashboard.taskSingle":"hr.dashboard.taskPlural",{count:myOpen})}</>:null;})()}</div>
    </div>

    <div className={`grid gap-3 mb-6 ${mob?"grid-cols-2":"grid-cols-4"}`}>
      {kpis.map(k=><Card key={k.label} pad={mob?18:22} style={{borderRadius:16}}>
        <div className="flex justify-between items-start mb-3">
          <div className="w-9 h-9 rounded-lg bg-wash flex items-center justify-center" style={{color:k.tone||C.brand}}>
            <I n={k.icon} s={17}/></div></div>
        <div className={`font-bold tracking-tight leading-none ${mob?"text-2xl":"text-3xl"}`} style={{color:k.tone||C.text}}>{k.value}</div>
        <div className="text-xs text-text-3 mt-1.5">{k.label}</div>
      </Card>)}
    </div>

    <div className="grid gap-4" style={{gridTemplateColumns:mob?"1fr":"1.3fr 1fr"}}>
      <div>
        <Card pad={mob?20:26} style={{borderRadius:20,marginBottom:16}}>
          <div className="flex justify-between items-center mb-4">
            <Lbl style={{margin:0}}>{t("hr.dashboard.attendanceTodayLabel")}</Lbl>
            <Tag tone={todayAttendance?"ok":"neutral"} sm>{todayAttendance?(todayAttendance.clockOut?t("hr.dashboard.statusSignedOut"):t("hr.dashboard.statusWorking")):t("hr.dashboard.statusNotClockedIn")}</Tag>
          </div>
          {!todayAttendance?<div>
            <p className="text-sm text-text-2 mb-3.5 leading-relaxed">{t("hr.dashboard.punchInPrompt")}</p>
            <Btn kind="primary" icon="clock" onClick={async()=>{const r=await A.punchIn(emp.id,"web"); if(!r.ok)A.toast(r.msg,"danger");}}>{t("hr.dashboard.punchInBtn")}</Btn>
          </div>:!todayAttendance.clockOut?<div>
            <div className="text-base text-text mb-2">{t("hr.dashboard.punchedInAt")} <strong>{todayAttendance.clockIn}</strong></div>
            <p className="text-sm text-text-2 mb-3.5">{t("hr.dashboard.punchOutReminder")}</p>
            <Btn kind="outline" icon="clock" onClick={async()=>{const r=await A.punchOut(emp.id); if(!r.ok)A.toast(r.msg,"danger"); else if(r.earlyLeave)A.toast(t("hr.dashboard.punchOutEarlyLeave"),"warn");}}>{t("hr.dashboard.punchOutBtn")}</Btn>
          </div>:<div>
            <div className="text-sm text-text">{t("hr.dashboard.attendanceSummary",{in:todayAttendance.clockIn,out:todayAttendance.clockOut,hours:todayAttendance.hours})}</div>
            <p className="text-sm text-text-2 mt-2">{t("hr.dashboard.goodWorkToday")}</p></div>}
        </Card>

        <Card pad={mob?20:26} style={{borderRadius:20}}>
          <div className="flex justify-between items-center mb-3.5">
            <Lbl style={{margin:0}}>{t("hr.dashboard.myTasksLabel")}</Lbl>
            <Btn kind="ghost" size="sm" onClick={()=>A.go("hrTasks")}>{t("hr.dashboard.viewAllTasks")}</Btn>
          </div>
          {myTasks.length===0?<div className="py-4 text-text-3 text-sm">{t("hr.dashboard.noOpenTasks")}</div>
            :<div className="flex flex-col gap-2">
              {myTasks.slice(0,5).map(task=><div key={task.id} className="flex gap-3 items-center py-3 px-3.5 bg-bg rounded-lg border border-line">
                <input type="checkbox" checked={task.status==="done"} onChange={()=>A.updateTaskStatus(task.id,task.status==="done"?"todo":"done")} className="w-5 h-5 cursor-pointer shrink-0"/>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-text">{task.title}</div>
                  <div className="text-xs text-text-3 mt-0.5">{t("hr.dashboard.dueLabel")} {task.due}</div></div>
                <Tag tone={task.priority==="high"?"danger":task.priority==="medium"?"warn":"neutral"} sm>{task.priority}</Tag>
              </div>)}</div>}
        </Card>
      </div>

      <div>
        <Card pad={mob?20:24} style={{borderRadius:20,marginBottom:16}}>
          <div className="flex justify-between items-center mb-3">
            <Lbl style={{margin:0}}>{t("hr.dashboard.upcomingEventsLabel")}</Lbl>
            <Btn kind="ghost" size="sm" onClick={()=>A.go("hrCalendar")}>{t("hr.dashboard.upcomingEventsViewCalendar")}</Btn>
          </div>
          {upcomingEvents.length===0?<div className="py-3 text-text-3 text-sm">{t("hr.dashboard.nothingComing")}</div>
            :<div className="flex flex-col gap-2">
              {upcomingEvents.map(ev=><div key={ev.id} className="py-2.5 px-3 bg-bg rounded-lg border border-line">
                <div className="text-sm font-semibold text-text">{ev.title}</div>
                <div className="text-xs text-text-3 mt-0.5">{new Date(ev.when).toLocaleDateString(locale==="fr"?"fr-CA":"en-CA",{weekday:"short",month:"short",day:"numeric"})} • {ev.time}</div>
              </div>)}</div>}
        </Card>

        {(emp.role==="hr"||emp.role==="admin"||emp.role==="owner")&&<Card pad={mob?20:24} style={{borderRadius:20,marginBottom:16}}>
          <div className="flex justify-between items-center mb-3">
            <Lbl style={{margin:0}}>{t("hr.dashboard.pendingLeaveRequestsLabel")}</Lbl>
            <Btn kind="ghost" size="sm" onClick={()=>A.go("hrLeave")}>{t("hr.dashboard.pendingLeaveReview")}</Btn>
          </div>
          {pendingLeave.length===0?<div className="py-3 text-text-3 text-sm">{t("hr.dashboard.nothingToReview")}</div>
            :<div className="flex flex-col gap-2">
              {pendingLeave.slice(0,3).map(r=>{const who=A.hrEmp(r.employee);
                return <div key={r.id} className="py-2.5 px-3 bg-bg rounded-lg border border-line">
                  <div className="text-sm font-semibold text-text">{who?.name}</div>
                  <div className="text-xs text-text-3 mt-0.5">{r.type} • {r.from} → {r.to} ({r.days}d)</div>
                </div>;})}</div>}
        </Card>}

        <Card pad={mob?20:24} style={{borderRadius:20}}>
          <Lbl>{t("hr.dashboard.quickActionsLabel")}</Lbl>
          <div className="flex flex-col gap-2">
            <Btn kind="outline" size="sm" full icon="calendar" onClick={()=>A.go("hrLeave")}>{t("hr.dashboard.quickActionRequestLeave")}</Btn>
            <Btn kind="outline" size="sm" full icon="mail" onClick={()=>A.go("hrChat")}>{t("hr.dashboard.quickActionOpenChat")}</Btn>
            <Btn kind="outline" size="sm" full icon="user" onClick={()=>A.go("hrProfile")}>{t("hr.dashboard.quickActionEditProfile")}</Btn>
          </div>
        </Card>
      </div>
    </div>
  </div>;
}


/* ═══════════════════════════════════════════════════════════════════════════
   SHARED PRIMITIVES — used across post-a-job, trainings, articles, CV, HR
   ═══════════════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════════════
   HR SUITE — All module implementations
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─── Profile: edit own details + visibility toggles for public NorthHire ─── */
/* Read-only view for an employee's own Documents card - uploading is an HR/admin/owner action
   from the People page's edit modal, not a self-service one. */
function _MyDocuments({empId}){
  const A=use(); const {t}=useTranslation();
  const [docs,setDocs]=useState(null);
  useEffect(()=>{A.loadEmployeeDocuments(empId).then(setDocs);},[empId]);
  if(!docs?.length)return <div className="text-sm text-text-3">{t("hr.profile.noDocs")}</div>;
  return <div className="flex flex-col gap-2">
    {docs.map(d=><button key={d.id} onClick={()=>A.downloadEmployeeDocument(d.id)}
      className="flex gap-3 items-center py-2.5 px-3 bg-bg rounded-lg border-0 cursor-pointer text-left w-full">
      <div className="w-8 h-8 rounded-lg bg-wash text-brand flex items-center justify-center"><I n="file" s={16}/></div>
      <div className="text-sm font-semibold text-text">{d.name}</div>
    </button>)}
  </div>;
}

export function HrProfile(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const emp=A.hrCurrentEmp();
  const [d,setD]=useState({...emp});
  useEffect(()=>setD({...emp}),[emp?.id]);
  const dirty=JSON.stringify(d)!==JSON.stringify(emp);
  const set=(k,v)=>setD(p=>({...p,[k]:v}));
  const setVis=(k,v)=>setD(p=>({...p,visibility:{...p.visibility,[k]:v}}));
  const save=()=>{A.updateEmp(emp.id,d);};
  const dept=A.HR_DEPARTMENTS.find(x=>x.id===emp.dept);
  const publicView=A.hrPublicProfile(emp.id);
  /* On a hard refresh landing directly on this real URL, hrEmployee/hrCompany can resolve before
     the full hrEmployees roster finishes loading - hrPublicProfile (which looks emp.id up in that
     roster) briefly returns null in that window. Wait rather than crash on publicView.tenureYears. */
  if(!publicView)return null;

  const visItems=[
    {k:"title",l:t("hr.profile.visibilityJobTitle"),v:emp.title},
    {k:"department",l:t("hr.profile.visibilityDepartment"),v:dept?.name},
    {k:"tenure",l:t("hr.profile.visibilityTenure"),v:publicView.tenureYears?t("hr.profile.tenureYears",{years:publicView.tenureYears}):"—"},
    {k:"manager",l:t("hr.profile.visibilityManager"),v:emp.manager?A.hrEmp(emp.manager)?.name:"—"},
    {k:"badges",l:t("hr.profile.visibilityBadges"),v:t("hr.profile.badgesCount",{count:emp.badges.length})},
    {k:"trainings",l:t("hr.profile.visibilityTrainings"),v:t("hr.profile.coursesCount",{count:publicView.trainingsCompleted||0})},
    {k:"salary",l:t("hr.profile.visibilitySalary"),v:emp.salary?t("hr.profile.salaryFormat",{salary:emp.salary.toLocaleString()}):"—"},
    {k:"phone",l:t("hr.profile.visibilityPhone"),v:emp.phone},
    {k:"email",l:t("hr.profile.visibilityEmail"),v:emp.email},
    {k:"birthDate",l:t("hr.profile.visibilityBirthDate"),v:emp.birthDate},
  ];

  return <div>
    <div className="grid gap-4 items-start" style={{gridTemplateColumns:mob?"1fr":"1fr 380px"}}>
      <div>
        <Card pad={mob?20:26} style={{marginBottom:16,borderRadius:16}}>
          <div className="flex gap-3.5 items-center mb-5">
            <SmartPortrait seed={emp.seed} size={70} radius={16}/>
            <div>
              <div className="text-xl font-bold text-text tracking-tight">{emp.name}</div>
              <div className="text-sm text-text-2 mt-1">{emp.title}</div>
            </div>
          </div>

          <Lbl>{t("hr.profile.personalDetailsLabel")}</Lbl>
          <div className={`grid gap-3 mb-5 ${mob?"grid-cols-1":"grid-cols-2"}`}>
            <Field label={t("hr.profile.fullNameLabel")}><Input value={d.name} onChange={e=>set("name",e.target.value)}/></Field>
            <Field label={t("hr.profile.jobTitleLabel")}><Input value={d.title} onChange={e=>set("title",e.target.value)}/></Field>
            <Field label={t("hr.profile.emailLabel")}><Input icon="mail" value={d.email} onChange={e=>set("email",e.target.value)}/></Field>
            <Field label={t("hr.profile.phoneLabel")}><Input icon="phone" value={d.phone} onChange={e=>set("phone",e.target.value)}/></Field>
            <Field label={t("hr.profile.cityLabel")}><Input icon="pin" value={d.city} onChange={e=>set("city",e.target.value)}/></Field>
            <Field label={t("hr.profile.provinceLabel")}><Input value={d.prov} onChange={e=>set("prov",e.target.value)}/></Field>
          </div>

          <Lbl>{t("hr.profile.skillsLabel")}</Lbl>
          <div className="mb-5">
            <InlineList value={d.skills||[]} onChange={v=>set("skills",v)} icon="sparkle" placeholder={t("hr.profile.skillsPlaceholder")}/>
          </div>

          <div className="flex gap-2.5 justify-end pt-5 border-t border-line-soft">
            {dirty&&<Btn kind="ghost" onClick={()=>setD({...emp})}>{t("hr.profile.discardBtn")}</Btn>}
            <Btn kind="primary" icon="check" disabled={!dirty} onClick={save}>{dirty?t("hr.profile.saveChangesBtn"):t("hr.profile.savedBtn")}</Btn>
          </div>
        </Card>

        <Card pad={mob?20:26} style={{borderRadius:16,marginBottom:16}}>
          <Lbl>{t("hr.profile.publicNorthHireTitle")}</Lbl>
          <Banner tone="brand" icon="info" title={t("hr.profile.publicProfileHowWorks")} style={{marginBottom:16}}>
            {t("hr.profile.publicProfileDescription")}</Banner>
          <div className="flex flex-col gap-0.5">
            {visItems.map(item=>{const on=d.visibility?.[item.k]!==false;
              return <div key={item.k} className="flex gap-3 items-center py-3 px-3 rounded-lg transition-colors duration-150 hover:bg-bg">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-text">{item.l}</div>
                  <div className="text-xs text-text-3 mt-0.5">{on?t("hr.profile.visiblePublicly"):t("hr.profile.hiddenFromPublic")}{item.v?t("hr.profile.visibilitySuffix")+item.v:""}</div>
                </div>
                <Switch on={on} onChange={v=>setVis(item.k,v)}/>
              </div>;})}
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-3.5">
        <Card pad={20} style={{borderRadius:16,background:`linear-gradient(135deg,${C.tint} 0%,#F0F7FF 100%)`,border:`1px solid ${C.line2}`}}>
          <div className="text-xs font-bold text-brand tracking-wide uppercase mb-2.5">{t("hr.profile.publicProfilePreview")}</div>
          <div className="flex gap-3 items-center mb-3.5">
            <SmartPortrait seed={emp.seed} size={50} radius={12}/>
            <div>
              <div className="text-sm font-semibold text-text">{emp.name}</div>
              {publicView.title&&<div className="text-xs text-text-2 mt-0.5">{publicView.title}</div>}
            </div>
          </div>
          <div className="text-sm text-text-2 leading-loose">
            {publicView.department&&<div>• {publicView.department} {t("hr.profile.publicProfileAtCompany",{company:publicView.company})}</div>}
            {publicView.tenureYears&&<div>• {publicView.tenureYears} {t("hr.profile.publicProfileYearsAtCompany")}</div>}
            {publicView.manager&&<div>• {t("hr.profile.publicProfileReportsTo")} {publicView.manager}</div>}
            {publicView.trainingsCompleted>0&&<div>• {publicView.trainingsCompleted} {t("hr.profile.publicProfileTrainingsCompleted")}</div>}
            {publicView.badges?.length>0&&<div className="mt-2">
              <div className="text-xs text-text-3 mb-1.5">{t("hr.profile.publicProfileRecognitions")}</div>
              <div className="flex flex-wrap gap-1">
                {publicView.badges.map(b=><Tag key={b.name} tone="warn" sm icon="award">{b.name}</Tag>)}</div>
            </div>}
            {publicView.phone&&<div className="mt-2">• {t("hr.profile.publicProfilePhone")}{publicView.phone}</div>}
            {publicView.email&&<div>• {t("hr.profile.publicProfileEmail")}{publicView.email}</div>}
          </div>
        </Card>

        <Card pad={20} style={{borderRadius:16}}>
          <Lbl>{t("hr.profile.yourDocumentsLabel")}</Lbl>
          <_MyDocuments empId={emp.id}/>
        </Card>

        <Card pad={20} style={{borderRadius:16}}>
          <Lbl>{t("hr.profile.yourBadgesLabel")}</Lbl>
          {emp.badges.length===0
            ? <div className="text-sm text-text-3">{t("hr.profile.noBadges")}</div>
            : <div className="flex flex-col gap-2">
                {[...emp.badges].sort((a,b)=>new Date(b.awardedAt)-new Date(a.awardedAt)).map(b=><div key={b.name} className="flex gap-3 items-center py-2.5 px-3 bg-bg rounded-lg">
                  <div className="w-8 h-8 rounded-lg bg-warn-bg text-warn flex items-center justify-center"><I n="award" s={16}/></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-text">{b.name}</div>
                    <div className="text-xs text-text-3 mt-0.5">{new Date(b.awardedAt).toLocaleDateString(locale==="fr"?"fr-CA":"en-CA",{year:"numeric",month:"long",day:"numeric"})}</div>
                  </div>
                </div>)}
              </div>}
        </Card>
        <_PunchPinCard A={A} empId={emp.id}/>
        {emp.manager&&<_OneOnOneLog A={A} managerId={emp.manager} reportId={emp.id} me={emp}/>}
      </div>
    </div>
  </div>;
}

/* Manager 1:1 log for a manager-report pair. The employee viewing their own profile sees
   the log with their manager; a manager viewing People and opening a direct report sees the
   log with that report. Notes are private to the two on the pair (plus HR/owner). */
function _OneOnOneLog({A,managerId,reportId,me}){
  const {t,locale}=useTranslation();
  const [entries,setEntries]=useState(null);
  const [showNew,setShowNew]=useState(false);
  const [draft,setDraft]=useState({meetingDate:new Date().toISOString().slice(0,10),agenda:"",notes:"",actionItems:""});
  const managerName=A.hrEmp(managerId)?.name||"manager";
  const reload=async()=>{
    try{const r=await A.hrApiGet(`/hr/one-on-ones?managerId=${managerId}&reportId=${reportId}`); setEntries(r.entries||[]);}
    catch{setEntries([]);}
  };
  useEffect(()=>{reload();/* eslint-disable-next-line */},[managerId,reportId]);
  const save=async()=>{
    if(!draft.meetingDate)return;
    try{await A.hrApiPost("/hr/one-on-ones",{managerId,reportId,...draft});
      setDraft({meetingDate:new Date().toISOString().slice(0,10),agenda:"",notes:"",actionItems:""});
      setShowNew(false); reload();}
    catch(e){A.toast?.(e.message,"danger");}
  };
  return <Card pad={22} style={{borderRadius:14,marginTop:16}}>
    <div className="flex justify-between items-center gap-2 mb-2 flex-wrap">
      <div>
        <Lbl style={{marginBottom:2}}>{t("hr.oneOnOne.logTitle",{manager:managerName})}</Lbl>
        <div className="text-xs text-text-3">{t("hr.oneOnOne.description")}</div>
      </div>
      <Btn kind="outline" size="sm" icon="plus" onClick={()=>setShowNew(v=>!v)}>{showNew?t("hr.oneOnOne.cancelBtn"):t("hr.oneOnOne.logBtn")}</Btn>
    </div>
    {showNew&&<div className="flex flex-col gap-2 mt-3 p-3 bg-bg rounded-lg">
      <Field label={t("hr.oneOnOne.meetingDateLabel")}><Input type="date" value={draft.meetingDate} onChange={e=>setDraft(d=>({...d,meetingDate:e.target.value}))}/></Field>
      <Field label={t("hr.oneOnOne.agendaLabel")}><Input value={draft.agenda} onChange={e=>setDraft(d=>({...d,agenda:e.target.value}))} placeholder={t("hr.oneOnOne.agendaPlaceholder")}/></Field>
      <Field label={t("hr.oneOnOne.notesLabel")}><Area rows={4} value={draft.notes} onChange={e=>setDraft(d=>({...d,notes:e.target.value}))} placeholder={t("hr.oneOnOne.notesPlaceholder")}/></Field>
      <Field label={t("hr.oneOnOne.actionItemsLabel")}><Area rows={2} value={draft.actionItems} onChange={e=>setDraft(d=>({...d,actionItems:e.target.value}))} placeholder={t("hr.oneOnOne.actionItemsPlaceholder")}/></Field>
      <div className="flex justify-end"><Btn kind="primary" size="sm" onClick={save}>{t("hr.oneOnOne.savOneOnOneBtn")}</Btn></div>
    </div>}
    {entries===null?<div className="text-sm text-text-3 py-2">{t("hr.oneOnOne.loading")}</div>
      :entries.length===0?<div className="text-sm text-text-3 py-2">{t("hr.oneOnOne.noEntriesYet")}</div>
      :<div className="flex flex-col gap-2 mt-3">{entries.map(e=>
        <div key={e.id} className="py-2.5 px-3 bg-bg rounded-lg">
          <div className="flex justify-between items-center gap-2 mb-1">
            <div className="text-sm font-semibold text-text">{new Date(e.meetingDate).toLocaleDateString(locale==="fr"?"fr-CA":"en-CA",{year:"numeric",month:"long",day:"numeric"})}</div>
            {e.createdBy===me.id&&<Btn kind="ghost" size="xs" icon="trash" title={t("hr.oneOnOne.deleteTitle")} onClick={async()=>{await A.hrApiDel(`/hr/one-on-ones/${e.id}`); reload();}}/>}
          </div>
          {e.agenda&&<div className="text-xs text-text-3 mb-1"><strong>{t("hr.oneOnOne.agendaPrefix")}</strong> {e.agenda}</div>}
          {e.notes&&<div className="text-sm text-text-2 whitespace-pre-wrap mb-1">{e.notes}</div>}
          {e.actionItems&&<div className="text-xs text-text-3 whitespace-pre-wrap"><strong>{t("hr.oneOnOne.actionsPrefix")}</strong> {e.actionItems}</div>}
        </div>)}
      </div>}
  </Card>;
}

/* Your own punch PIN for the shared time clock. Deliberately separate from your password: you key
   this in on a tablet in front of colleagues, so it opens nothing but the time clock. */
function _PunchPinCard({A,empId}){
  const {t}=useTranslation();
  const [pin,setPin]=useState(""); const [confirm,setConfirm]=useState("");
  const [msg,setMsg]=useState(null); const [busy,setBusy]=useState(false);
  const save=async()=>{
    setMsg(null);
    if(pin!==confirm){setMsg({tone:"danger",text:t("hr.punchPin.pinsNotMatch")});return;}
    setBusy(true);
    const r=await A.hrSetPunchPin(empId,pin);
    setBusy(false);
    if(r.ok){setMsg({tone:"ok",text:t("hr.punchPin.pinUpdated")});setPin("");setConfirm("");}
    else setMsg({tone:"danger",text:r.msg});
  };
  return <Card pad={20} style={{borderRadius:16,marginTop:16}}>
    <Lbl>{t("hr.punchPin.label")}</Lbl>
    <div className="text-sm text-text-2 mb-3.5 leading-relaxed">
      {t("hr.punchPin.description")}
    </div>
    {msg&&<Banner tone={msg.tone} icon={msg.tone==="ok"?"check":"alert"} style={{marginBottom:12}}>{msg.text}</Banner>}
    <div className="grid gap-2.5 grid-cols-2">
      <Field label={t("hr.punchPin.newPINLabel")}>
        <Input type="password" inputMode="numeric" maxLength={6} value={pin}
          onChange={e=>setPin(e.target.value.replace(/\D/g,""))} placeholder={t("hr.punchPin.placeholder")}/></Field>
      <Field label={t("hr.punchPin.confirmPINLabel")}>
        <Input type="password" inputMode="numeric" maxLength={6} value={confirm}
          onChange={e=>setConfirm(e.target.value.replace(/\D/g,""))} placeholder={t("hr.punchPin.placeholder")}/></Field>
    </div>
    <Btn kind="primary" size="sm" style={{marginTop:12}} disabled={busy||pin.length<4} onClick={save}>
      {busy?t("hr.punchPin.savingBtn"):t("hr.punchPin.setPINBtn")}</Btn>
  </Card>;
}

/* ─── Attendance: log view + punch machine integration ─── */
export function HrAttendance(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const emp=A.hrCurrentEmp(); const company=A.hrCurrentCompany();
  const canSeeAll=emp.role==="owner"||emp.role==="admin"||emp.role==="hr";
  const [view,setView]=useState(canSeeAll?"team":"mine");
  const [empFilter,setEmpFilter]=useState("all");
  const [fromDate,setFromDate]=useState(""); const [toDate,setToDate]=useState("");
  const [shown,setShown]=useState(50);
  const today=_fmtDate(new Date());
  /* Same overnight-shift fix as HrDashboard: an open punch from a prior date must still surface
     the punch-out button instead of "Not clocked in". */
  const todayRecord=A.hrAttendance.find(a=>a.employee===emp.id&&!a.clockOut)||A.hrAttendance.find(a=>a.employee===emp.id&&a.date===today);

  const records=(view==="mine"
    ? A.hrAttendance.filter(a=>a.employee===emp.id)
    : A.hrAttendance.filter(a=>empFilter==="all"||a.employee===empFilter))
    .filter(a=>(!fromDate||a.date>=fromDate)&&(!toDate||a.date<=toDate));
  const sorted=[...records].sort((a,b)=>b.date.localeCompare(a.date));
  const exportCsv=()=>{
    const who=r=>A.hrEmp(r.employee)?.name||r.employee;
    const rows=[[t("hr.attendance.csvDateHeader"),t("hr.attendance.csvEmployeeHeader"),t("hr.attendance.csvInHeader"),t("hr.attendance.csvOutHeader"),t("hr.attendance.csvHoursHeader"),t("hr.attendance.csvSourceHeader")],
      ...sorted.map(r=>[r.date,who(r),r.clockIn||"",r.clockOut||"",r.hours??"",r.source||""])];
    const csv=rows.map(row=>row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv"}); const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download="attendance.csv"; a.click(); URL.revokeObjectURL(url);
  };

  const settings=A.hrCompanySettings[company.id]||HR_COMPANY_SETTINGS_DEFAULT;
  const punchConn=settings.integrations.punchMachine.connected;

  return <div>
    <Card pad={mob?20:24} style={{marginBottom:16,borderRadius:16}}>
      <div className="flex justify-between items-center mb-3.5 flex-wrap gap-3">
        <div>
          <Lbl style={{margin:0}}>{t("hr.attendance.yourAttendanceTodayLabel")}</Lbl>
          <div className="text-xs text-text-3 mt-1">{new Date().toLocaleDateString(locale==="fr"?"fr-CA":"en-CA",{weekday:"long",month:"long",day:"numeric"})}</div>
        </div>
        <Tag tone={todayRecord?"ok":"neutral"} sm>{todayRecord?(todayRecord.clockOut?t("hr.dashboard.statusSignedOut"):t("hr.dashboard.statusWorking")):t("hr.dashboard.statusNotClockedIn")}</Tag>
      </div>
      {!todayRecord?
        <Btn kind="primary" size="lg" icon="clock" onClick={async()=>{const r=await A.punchIn(emp.id,"web"); if(!r.ok)A.toast(r.msg,"danger");}}>{t("hr.attendance.punchInNowBtn")}</Btn>
        :!todayRecord.clockOut?
        <div className="flex gap-3 flex-wrap items-center">
          <div className="text-base text-text-2">{t("hr.attendance.punchedInAtVia",{time:todayRecord.clockIn,source:todayRecord.source})}</div>
          <Btn kind="outline" icon="clock" onClick={async()=>{const r=await A.punchOut(emp.id); if(!r.ok)A.toast(r.msg,"danger"); else if(r.earlyLeave)A.toast(t("hr.attendance.punchOutEarlyLeave"),"warn");}}>{t("hr.attendance.punchOutBtn")}</Btn>
        </div>
        :
        <div className="text-base text-text-2">{t("hr.attendance.attendanceSummary",{in:todayRecord.clockIn,out:todayRecord.clockOut,hours:todayRecord.hours})}</div>}
    </Card>

    {canSeeAll&&<Card pad={mob?16:20} style={{marginBottom:16,borderRadius:14,background:punchConn?C.okBg:C.warnBg,border:`1px solid ${punchConn?C.okLn:C.warnLn}`}}>
      <div className="flex gap-3 items-center flex-wrap">
        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shrink-0" style={{color:punchConn?C.ok:C.warn}}><I n={punchConn?"check":"clock"} s={20}/></div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-text">{punchConn?t("hr.attendance.punchMachineConnected",{vendor:settings.integrations.punchMachine.vendor}):t("hr.attendance.noPunchMachineConnected")}</div>
          <div className="text-xs text-text-2 mt-1">{punchConn?t("hr.attendance.lastSync",{date:new Date(settings.integrations.punchMachine.lastSync).toLocaleString(locale==="fr"?"fr-CA":"en-CA")}):t("hr.attendance.connectPunchMachine")}</div>
        </div>
        <Btn kind={punchConn?"outline":"primary"} size="sm" onClick={()=>A.go("hrIntegrations")}>{punchConn?t("hr.attendance.manageBtn"):t("hr.attendance.connectBtn")}</Btn>
      </div>
    </Card>}

    <Card pad={mob?16:20} style={{borderRadius:14}}>
      <div className="flex gap-2.5 items-center mb-3.5 flex-wrap">
        <Lbl style={{margin:0,flex:1}}>{view==="mine"?t("hr.attendance.myHistoryLabel"):t("hr.attendance.teamLogLabel")}</Lbl>
        {canSeeAll&&<_PillTabs items={[["mine",t("hr.attendance.mineTab")],["team",t("hr.attendance.teamTab")]]} value={view} onChange={setView}/>}
        {canSeeAll&&view==="team"&&<Sel value={empFilter} onChange={e=>setEmpFilter(e.target.value)} style={{maxWidth:200}}>
          <option value="all">{t("hr.attendance.allEmployeesOption")}</option>
          {A.hrEmpsAtCompany(company.id).map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</Sel>}
      </div>
      <div className="flex gap-2.5 items-center mb-3.5 flex-wrap">
        <Input type="date" value={fromDate} onChange={e=>{setFromDate(e.target.value);setShown(50);}} style={{maxWidth:170}}/>
        <span className="text-xs text-text-3">{t("hr.attendance.toLabel")}</span>
        <Input type="date" value={toDate} onChange={e=>{setToDate(e.target.value);setShown(50);}} style={{maxWidth:170}}/>
        {(fromDate||toDate)&&<button onClick={()=>{setFromDate("");setToDate("");}} className="bg-transparent border-0 p-0 cursor-pointer text-sm text-brand font-semibold">{t("hr.attendance.clearDatesBtn")}</button>}
        <div className="flex-1"/>
        <Btn kind="outline" size="sm" icon="download" onClick={exportCsv}>{t("hr.attendance.exportCsvBtn")}</Btn>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{minWidth:600}}>
          <thead><tr className="border-b-2 border-line text-left">
            <th className={TH_CLS}>{t("hr.attendance.dateHeader")}</th>
            {view==="team"&&<th className={TH_CLS}>{t("hr.attendance.employeeHeader")}</th>}
            <th className={TH_CLS}>{t("hr.attendance.inHeader")}</th>
            <th className={TH_CLS}>{t("hr.attendance.outHeader")}</th>
            <th className={TH_CLS}>{t("hr.attendance.hoursHeader")}</th>
            <th className={TH_CLS}>{t("hr.attendance.sourceHeader")}</th>
          </tr></thead>
          <tbody>
            {sorted.slice(0,shown).map(r=>{const who=A.hrEmp(r.employee);
              return <tr key={r.id} className="border-b border-line-soft transition-colors duration-150 hover:bg-bg">
                <td className={`${TD_CLS} text-sm text-text`}>{r.date}</td>
                {view==="team"&&<td className={`${TD_CLS} text-sm text-text`}>{who?.name||t("hr.attendance.dash")}</td>}
                <td className={`${TD_CLS} text-sm text-text`}>{r.clockIn||t("hr.attendance.dash")}{r.late&&<Tag tone="warn" sm style={{marginLeft:6}}>{t("hr.attendance.lateTag")}</Tag>}</td>
                <td className={`${TD_CLS} text-sm text-text-2`}>{r.clockOut||t("hr.attendance.dash")}</td>
                <td className={`${TD_CLS} text-sm text-brand font-semibold`}>{r.hours||0}h</td>
                <td className={`${TD_CLS} text-xs text-text-3`}>{r.source}</td>
              </tr>;})}
            {sorted.length===0&&<tr><td colSpan={view==="team"?6:5} className="p-5"><Empty icon="clock" title={t("hr.attendance.noAttendanceRecords")} body={t("hr.attendance.punchInHistory")}/></td></tr>}
          </tbody>
        </table>
      </div>
      {sorted.length>shown&&<Btn kind="outline" full style={{marginTop:14}} onClick={()=>setShown(s=>s+50)}>{t("hr.attendance.showMoreBtn",{remaining:sorted.length-shown})}</Btn>}
    </Card>
  </div>;
}

/* ─── Leave: request + approve workflow ─── */
export function HrLeave(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const emp=A.hrCurrentEmp();
  const isPriv=emp.role==="owner"||emp.role==="admin"||emp.role==="hr";
  /* A plain-"employee"-role manager approves just their own direct reports' leave - the real
     reporting chain (hr_employees.manager), previously bypassed in favour of a flat role check. */
  const myReports=A.hrEmployees.filter(e=>e.manager===emp.id);
  const canApprove=isPriv||myReports.length>0;
  const [tab,setTab]=useState(canApprove?"pending":"mine");
  const [showReq,setShowReq]=useState(false);
  const [req,setReq]=useState({type:"Vacation",from:"",to:"",reason:""});
  const settings=A.hrCompanySettings[emp.companyId]||HR_COMPANY_SETTINGS_DEFAULT;
  const myLeave=A.hrLeave.filter(l=>l.employee===emp.id);
  const usedVacation=myLeave.filter(l=>l.status==="approved"&&l.type==="Vacation").reduce((s,l)=>s+l.days,0);
  /* Real per-pay-period accrual instead of the flat annual number being available on day one -
     prorated by how much of the calendar year has actually elapsed (and by first-year tenure,
     so someone hired in October doesn't accrue as if they'd been here since January). */
  /* Accrual now also handles the year boundary. Unused days used to simply vanish on 1 January,
     which is both wrong and, in several provinces, not lawful — carryover is a real policy
     (none / capped / unlimited, with an optional expiry) rather than an assumption. */
  const bal=vacationBalance({
    annualDays:settings.leave.annualVacationDays,
    hired:emp.hired,
    usedByYear:usedDaysByYear(myLeave,"Vacation"),
    policy:settings.leave,
  });
  const accruedVacation=bal.accrued;
  const vacationBalanceDays=bal.available;
  const usedSick=myLeave.filter(l=>l.status==="approved"&&l.type==="Sick").reduce((s,l)=>s+l.days,0);
  const usedPersonal=myLeave.filter(l=>l.status==="approved"&&l.type==="Personal").reduce((s,l)=>s+l.days,0);
  const scopedLeave=isPriv?A.hrLeave:A.hrLeave.filter(l=>myReports.some(r=>r.id===l.employee)||l.employee===emp.id);
  const pending=scopedLeave.filter(l=>l.status==="pending");
  const list=tab==="mine"?myLeave:tab==="pending"?pending:scopedLeave;
  const sorted=[...list].sort((a,b)=>b.requestedAt-a.requestedAt);

  const [reqErr,setReqErr]=useState("");
  const submitReq=()=>{if(!req.from||!req.to)return;
    /* Advance-notice policy only makes sense for plannable leave — sick/bereavement/parental
       are routinely short-notice by nature, so they're exempt. */
    if(req.type==="Vacation"||req.type==="Personal"){
      const daysNotice=Math.ceil((new Date(req.from)-new Date())/(1000*60*60*24));
      if(daysNotice<settings.leave.advanceNoticeDays){
        setReqErr(t("hr.leave.advanceNoticeError",{type:req.type,days:settings.leave.advanceNoticeDays,date:_fmtDate(new Date(Date.now()+settings.leave.advanceNoticeDays*864e5))}));
        return;
      }
    }
    setReqErr("");
    /* Weekday count, not a raw calendar-day span — a Fri-to-Mon request is 2 vacation days, not 4. */
    let days=0; const d=new Date(req.from); const end=new Date(req.to);
    for(;d<=end;d.setDate(d.getDate()+1)){if(d.getDay()!==0&&d.getDay()!==6)days++;}
    days=Math.max(1,days);
    if(req.type==="Vacation"&&days>vacationBalanceDays){
      setReqErr(t("hr.leave.insufficientBalanceError",{days,plural:days===1?"":"s",available:vacationBalanceDays,availablePlural:vacationBalanceDays===1?"":"s"}));
      return;
    }
    A.requestLeave({...req,days}); setReq({type:"Vacation",from:"",to:"",reason:""}); setShowReq(false);};

  return <div>
    {/* Warn before carried days are lost, not after - the point of an expiry policy is that
        someone can still act on it. */}
    {bal.carriedIn>0&&bal.carryoverExpiresOn&&
      <Banner tone="warn" icon="clock" style={{marginBottom:14}}>
        {t("hr.leave.carryoverExpiryWarning",{count:bal.carriedIn,plural:bal.carriedIn===1?"":"s",date:bal.carryoverExpiresOn})}
      </Banner>}
    <div className={`grid gap-3 mb-4 ${mob?"grid-cols-2":"grid-cols-4"}`}>
      {[
        {l:t("hr.leave.vacationBalanceLabel"),v:vacationBalanceDays,tone:vacationBalanceDays<0?C.danger:C.brand,
          sub:`${accruedVacation} ${t("hr.leave.accruedThisYear")}${bal.carriedIn>0?` · ${bal.carriedIn} ${t("hr.leave.carriedOver")}`:""} · ${settings.leave.annualVacationDays}${t("hr.leave.annualSuffix")}`},
        {l:t("hr.leave.sickDaysUsedLabel"),v:usedSick,total:settings.leave.sickDays,tone:C.ok},
        {l:t("hr.leave.personalDaysUsedLabel"),v:usedPersonal,total:settings.leave.personalDays,tone:C.violet},
        {l:t("hr.leave.myOpenRequestsLabel"),v:myLeave.filter(l=>l.status==="pending").length,tone:C.warn}
      ].map(k=><Card key={k.l} pad={mob?16:20} style={{borderRadius:14}}>
        <div className={`font-bold tracking-tight ${mob?"text-2xl":"text-3xl"}`} style={{color:k.tone}}>{k.v}{k.total?<span className="text-sm text-text-3 font-medium"> / {k.total}</span>:""}</div>
        <div className="text-xs text-text-3 mt-1.5">{k.l}</div>
        {k.sub&&<div className="text-xs text-text-3 mt-0.5">{k.sub}</div>}
      </Card>)}
    </div>

    <Card pad={mob?16:20} style={{borderRadius:14}}>
      <div className="flex justify-between items-center mb-3.5 flex-wrap gap-2.5">
        <_PillTabs items={[["mine",t("hr.leave.myRequestsTab")],...(canApprove?[["pending",t("hr.leave.pendingTabPrefix")+pending.length+t("hr.leave.pendingTabSuffix")],["all",t("hr.leave.allTab")]]:[])]} value={tab} onChange={setTab}/>
        <Btn kind="primary" size="sm" icon="plus" onClick={()=>setShowReq(true)}>{t("hr.leave.requestLeaveBtn")}</Btn>
      </div>

      {sorted.length===0
        ? <Empty icon="calendar" title={t("hr.leave.noLeaveRecords")} body={t("hr.leave.requestsWillAppear")}/>
        : <div className="flex flex-col gap-2">
            {sorted.map(r=>{const who=A.hrEmp(r.employee);
              return <div key={r.id} className="flex gap-3.5 items-center py-3 px-3.5 bg-bg rounded-xl border border-line flex-wrap">
                <SmartPortrait seed={who?.seed||0} size={38} radius={10}/>
                <div className="grow shrink basis-50 min-w-0">
                  <div className="text-sm font-semibold text-text">{who?.name} • {r.type}</div>
                  <div className="text-xs text-text-3 mt-0.5">{r.from} → {r.to} ({r.days} {r.days===1?t("hr.leave.daySingular"):t("hr.leave.dayPlural")})</div>
                  {r.reason&&<div className="text-xs text-text-2 mt-1 italic">"{r.reason}"</div>}
                </div>
                {r.status==="pending"&&canApprove&&r.employee!==emp.id?<div className="flex gap-1.5">
                  <Btn kind="dangerSoft" size="xs" onClick={()=>A.decideLeave(r.id,"denied",emp.id)}>{t("hr.leave.denyBtn")}</Btn>
                  <Btn kind="primary" size="xs" onClick={()=>A.decideLeave(r.id,"approved",emp.id)}>{t("hr.leave.approveBtn")}</Btn>
                </div>:<Tag tone={r.status==="approved"?"ok":r.status==="denied"?"danger":"warn"} sm>{t("hr.leave."+r.status)}</Tag>}
              </div>;})}
          </div>}
    </Card>

    {showReq&&<Modal onClose={()=>setShowReq(false)} title={t("hr.leave.requestLeaveModalTitle")}>
      <div className="flex flex-col gap-3.5">
        <Field label={t("hr.leave.typeLabel")} required><Sel value={req.type} onChange={e=>setReq({...req,type:e.target.value})}>
          {[t("hr.leave.vacation"),t("hr.leave.sick"),t("hr.leave.personal"),t("hr.leave.bereavement"),t("hr.leave.parental"),t("hr.leave.unpaid"),t("hr.leave.other")].map((label,i)=>{const types=["Vacation","Sick","Personal","Bereavement","Parental","Unpaid","Other"];return <option key={types[i]} value={types[i]}>{label}</option>})}</Sel></Field>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label={t("hr.leave.fromLabel")} required><DatePicker value={req.from} onChange={v=>setReq({...req,from:v})}/></Field>
          <Field label={t("hr.leave.toLabel")} required><DatePicker value={req.to} onChange={v=>setReq({...req,to:v})} min={req.from}/></Field>
        </div>
        <Field label={t("hr.leave.reasonLabel")} hint={t("hr.leave.reasonHint")}><Area rows={3} value={req.reason} onChange={e=>setReq({...req,reason:e.target.value})} placeholder={t("hr.leave.reasonPlaceholder")}/></Field>
        {reqErr&&<Banner tone="danger" icon="alert">{reqErr}</Banner>}
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>{setShowReq(false);setReqErr("");}}>{t("hr.leave.cancelBtn")}</Btn>
          <Btn kind="primary" icon="check" onClick={submitReq} disabled={!req.from||!req.to}>{t("hr.leave.submitRequestBtn")}</Btn>
        </div>
      </div>
    </Modal>}
  </div>;
}

/* ─── Tasks: kanban board, real drag-and-drop via @dnd-kit on top of the existing ←/→ buttons
   (kept as the accessible, no-pointer-required path). ─── */
function _TaskCard({t,col,cols,emp,A,onComments}){
  const {attributes,listeners,setNodeRef,transform,isDragging}=useDraggable({id:t.id});
  const style=transform?{transform:`translate3d(${transform.x}px,${transform.y}px,0)`,zIndex:50,opacity:0.9}:undefined;
  const assn=A.hrEmp(t.assignee);
  const overdue=col.k!=="done"&&t.due<_fmtDate(new Date());
  return <div ref={setNodeRef} style={{...style,...(overdue?{borderColor:C.red}:{})}} {...attributes} {...listeners}
    data-card className={`bg-white border border-line rounded-xl p-3 cursor-grab transition-shadow duration-150 ${isDragging?"shadow-md":""}`}>
    <div className="text-sm font-semibold text-text mb-2 leading-snug">{t.title}</div>
    <div className="flex gap-1.5 flex-wrap mb-2.5">
      <Tag tone={t.priority==="high"?"danger":t.priority==="medium"?"warn":"neutral"} sm>{t.priority}</Tag>
      {overdue&&<Tag tone="danger" sm icon="alert">Overdue</Tag>}
      {t.tags?.map(tag=><Tag key={tag} tone="neutral" sm>{tag}</Tag>)}
    </div>
    <div className={`text-xs mb-2.5 flex gap-2 flex-wrap ${overdue?"text-red font-semibold":"text-text-3"}`}>
      <span>Due {t.due}</span>
      {assn&&<span>• {assn.name.split(" ")[0]}</span>}
    </div>
    <div className="flex gap-1" onPointerDown={e=>e.stopPropagation()}>
      {col.k!=="todo"&&<Btn kind="ghost" size="xs" aria-label={`Move "${t.title}" back to ${cols[cols.findIndex(c=>c.k===col.k)-1].label}`} onClick={()=>A.updateTaskStatus(t.id,cols[cols.findIndex(c=>c.k===col.k)-1].k)}>←</Btn>}
      {col.k!=="done"&&<Btn kind="ghost" size="xs" aria-label={`Move "${t.title}" forward to ${cols[cols.findIndex(c=>c.k===col.k)+1].label}`} onClick={()=>A.updateTaskStatus(t.id,cols[cols.findIndex(c=>c.k===col.k)+1].k)}>→</Btn>}
      <Btn kind="ghost" size="xs" aria-label={`Comments on "${t.title}"`} onClick={()=>onComments&&onComments(t)}>💬</Btn>
      {(t.assignedBy===emp.id||emp.role==="owner"||emp.role==="admin")&&<Btn kind="ghost" size="xs" icon="trash" aria-label={`Delete task "${t.title}"`} onClick={()=>A.deleteTask(t.id)}/>}
    </div>
  </div>;
}

/* Discussion on a task, kept with the work rather than in a chat thread nobody can find later. */
function _TaskCommentsModal({task,emp,A,onClose}){
  const [comments,setComments]=useState([]);
  const [body,setBody]=useState(""); const [busy,setBusy]=useState(false); const [err,setErr]=useState("");
  const load=()=>A.hrTaskComments(task.id).then(setComments);
  useEffect(()=>{load();},[task.id]);
  const send=async()=>{
    if(!body.trim())return;
    setBusy(true);setErr("");
    const r=await A.hrAddTaskComment(task.id,body.trim());
    setBusy(false);
    if(r.ok){setBody("");load();}else setErr(r.msg);
  };
  return <Modal onClose={onClose} title={`Comments — ${task.title}`}>
    {err&&<Banner tone="danger" icon="alert" style={{marginBottom:12}}>{err}</Banner>}
    <div className="flex flex-col gap-3 mb-4" style={{maxHeight:320,overflowY:"auto"}}>
      {comments.length===0
        ? <div className="text-sm text-text-3">No comments yet.</div>
        : comments.map(c=>
          <div key={c.id} className="bg-bg border border-line rounded-xl py-2.5 px-3">
            <div className="flex justify-between items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-text">{c.author}</span>
              <div className="flex gap-2 items-center">
                <span className="text-xs text-text-3">{new Date(c.at).toLocaleDateString("en-CA")}</span>
                {(c.authorId===emp.id||["owner","admin","hr"].includes(emp.role))&&
                  <button onClick={async()=>{await A.hrDeleteTaskComment(c.id);load();}}
                    className="bg-transparent border-0 p-0 cursor-pointer text-xs text-text-3 hover:text-red">Remove</button>}
              </div>
            </div>
            <div className="text-sm text-text-2 whitespace-pre-wrap">{c.body}</div>
          </div>)}
    </div>
    <Field label="Add a comment">
      <Area rows={3} value={body} onChange={e=>setBody(e.target.value)} placeholder="Anything the next person needs to know"/></Field>
    <div className="flex gap-2.5 justify-end mt-3">
      <Btn kind="ghost" onClick={onClose}>Close</Btn>
      <Btn kind="primary" onClick={send} disabled={busy||!body.trim()}>{busy?"Posting…":"Comment"}</Btn>
    </div>
  </Modal>;
}
function _TaskColumn({col,tasks,cols,emp,A,onComments}){
  const {setNodeRef,isOver}=useDroppable({id:col.k});
  return <div ref={setNodeRef} className="bg-bg rounded-2xl p-3 transition-colors duration-150" style={{minHeight:200,outline:isOver?`2px solid ${C.brand}`:"none"}}>
    <div className="flex justify-between items-center py-1 px-1.5 mb-2.5">
      <div className="flex gap-2 items-center">
        <div className="w-2 h-2 rounded-full" style={{background:col.tone}}/>
        <div className="text-xs font-bold text-text tracking-tight">{col.label}</div>
      </div>
      <Tag tone="neutral" sm>{tasks.length}</Tag>
    </div>
    <div className="flex flex-col gap-2">
      {[...tasks].sort((a,b)=>a.due.localeCompare(b.due)).map(t=><_TaskCard key={t.id} t={t} col={col} cols={cols} emp={emp} A={A} onComments={onComments}/>)}
      {tasks.length===0&&<div className="p-5 text-center text-xs text-text-3">No tasks here.</div>}
    </div>
  </div>;
}
function _TaskBoard({cols,source,emp,A,mob,onComments}){
  const sensors=useSensors(useSensor(PointerSensor,{activationConstraint:{distance:8}}));
  const onDragEnd=({active,over})=>{
    if(!over)return;
    const task=source.find(t=>t.id===active.id);
    if(task&&task.status!==over.id)A.updateTaskStatus(active.id,over.id);
  };
  return <DndContext sensors={sensors} onDragEnd={onDragEnd}>
    <div className={`grid gap-3 ${mob?"grid-cols-1":"grid-cols-3"}`}>
      {cols.map(col=><_TaskColumn key={col.k} col={col} tasks={source.filter(t=>t.status===col.k)} cols={cols} emp={emp} A={A} onComments={onComments}/>)}
    </div>
  </DndContext>;
}
export function HrTasks(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const emp=A.hrCurrentEmp(); const company=A.hrCurrentCompany();
  const canAssignOthers=emp.role!=="employee";
  const [scope,setScope]=useState("mine"); /* mine | assigned | all */
  const [assigneeFilter,setAssigneeFilter]=useState("");
  const [showAdd,setShowAdd]=useState(false);
  const [taskComments,setTaskComments]=useState(null);
  const [nt,setNt]=useState({title:"",assignee:emp.id,due:"",priority:"medium",tags:[]});
  const scoped=scope==="mine"?A.hrTasks.filter(t=>t.assignee===emp.id)
    :scope==="assigned"?A.hrTasks.filter(t=>t.assignedBy===emp.id)
    :A.hrTasks;
  const source=scope==="all"&&assigneeFilter?scoped.filter(t=>t.assignee===assigneeFilter):scoped;
  const cols=[{k:"todo",label:"To do",tone:C.text3},{k:"in-progress",label:"In progress",tone:C.brand},{k:"done",label:"Done",tone:C.ok}];

  const submit=()=>{if(!nt.title.trim()||!nt.due)return;
    A.addTask({...nt,title:nt.title.trim()}); setNt({title:"",assignee:emp.id,due:"",priority:"medium",tags:[]}); setShowAdd(false);};

  return <div>
    <div className="flex justify-between items-center mb-4 flex-wrap gap-2.5">
      <div className="flex items-center gap-2.5 flex-wrap">
        <_PillTabs items={[["mine","My tasks"],...(canAssignOthers?[["assigned","Assigned by me"],["all","All company"]]:[])]} value={scope} onChange={v=>{setScope(v);setAssigneeFilter("");}}/>
        {scope==="all"&&<Sel value={assigneeFilter} onChange={e=>setAssigneeFilter(e.target.value)} style={{width:170}}>
          <option value="">All assignees</option>
          {A.hrEmpsAtCompany(company.id).filter(e=>e.status==="active").map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
        </Sel>}
      </div>
      <Btn kind="primary" size="sm" icon="plus" onClick={()=>setShowAdd(true)}>New task</Btn>
    </div>

    <_TaskBoard cols={cols} source={source} emp={emp} A={A} mob={mob} onComments={setTaskComments}/>
    {taskComments&&<_TaskCommentsModal task={taskComments} emp={emp} A={A} onClose={()=>setTaskComments(null)}/>}

    {showAdd&&<Modal onClose={()=>setShowAdd(false)} title="New task">
      <div className="flex flex-col gap-3.5">
        <Field label="What needs doing?" required><Input value={nt.title} onChange={e=>setNt({...nt,title:e.target.value})} placeholder="e.g. Review Q4 budget"/></Field>
        <div className={`grid gap-3 ${mob?"grid-cols-1":"grid-cols-2"}`}>
          <Field label="Assign to">
            <Sel value={nt.assignee} onChange={e=>setNt({...nt,assignee:e.target.value})}>
              {A.hrEmpsAtCompany(company.id).filter(e=>e.status==="active").map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</Sel></Field>
          <Field label="Priority"><Sel value={nt.priority} onChange={e=>setNt({...nt,priority:e.target.value})}>
            {["low","medium","high"].map(p=><option key={p}>{p}</option>)}</Sel></Field>
        </div>
        <Field label="Due date" required><DatePicker value={nt.due} onChange={v=>setNt({...nt,due:v})} min={_fmtDate(new Date())}/></Field>
        <Field label="Tags"><InlineList value={nt.tags} onChange={v=>setNt({...nt,tags:v})} icon="sparkle" placeholder="Add tag"/></Field>
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>setShowAdd(false)}>Cancel</Btn>
          <Btn kind="primary" icon="check" onClick={submit} disabled={!nt.title.trim()||!nt.due}>Create task</Btn>
        </div>
      </div>
    </Modal>}
  </div>;
}

/* ─── Calendar: events + trainings ─── */
export function HrCalendar(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const emp=A.hrCurrentEmp();
  const canAdd=emp.role!=="employee";
  const [showAdd,setShowAdd]=useState(false);
  const [ne,setNe]=useState({title:"",when:"",time:"09:00",duration:60,type:"meeting",location:"",invitees:"all",description:""});
  const upcoming=A.hrEvents.filter(e=>new Date(e.when)>=new Date(_fmtDate(new Date()))).sort((a,b)=>a.when.localeCompare(b.when)||a.time.localeCompare(b.time));
  const past=A.hrEvents.filter(e=>new Date(e.when)<new Date(_fmtDate(new Date()))).sort((a,b)=>b.when.localeCompare(a.when));
  const [tab,setTab]=useState("upcoming");
  const list=tab==="upcoming"?upcoming:past;

  const submit=()=>{if(!ne.title.trim()||!ne.when)return;
    A.addEvent({...ne,title:ne.title.trim()}); setNe({title:"",when:"",time:"09:00",duration:60,type:"meeting",location:"",invitees:"all",description:""}); setShowAdd(false);};

  const typeIcon={meeting:"users",training:"cap",social:"heart",other:"calendar"};
  const typeTone={meeting:"brand",training:"warn",social:"ok",other:"neutral"};

  return <div>
    <div className="flex justify-between items-center mb-4 flex-wrap gap-2.5">
      <_PillTabs items={[["upcoming","Upcoming ("+upcoming.length+")"],["past","Past"]]} value={tab} onChange={setTab}/>
      {canAdd&&<Btn kind="primary" size="sm" icon="plus" onClick={()=>setShowAdd(true)}>New event</Btn>}
    </div>

    {list.length===0
      ? <Card pad={40} style={{borderRadius:14,textAlign:"center"}}>
          <div className="w-14 h-14 rounded-2xl bg-wash text-brand flex items-center justify-center mx-auto mb-4"><I n="calendar" s={26}/></div>
          <div className="text-base font-semibold text-text mb-1.5">{tab==="upcoming"?"Nothing coming up":"No past events"}</div>
          <div className="text-sm text-text-3">{tab==="upcoming"?"Add your first event to get the team on the same page.":"Past events will appear here as they happen."}</div>
        </Card>
      : <div className="flex flex-col gap-2.5">
          {list.map(ev=><Card key={ev.id} pad={mob?16:20} style={{borderRadius:14}}>
            <div className="flex gap-3.5 items-start flex-wrap">
              <div className="text-center bg-tint rounded-lg py-2.5 px-1.5 shrink-0" style={{width:60}}>
                <div className="text-xs font-bold text-brand tracking-wide uppercase" style={{fontSize:10.5}}>{new Date(ev.when).toLocaleDateString("en-CA",{month:"short"})}</div>
                <div className="text-2xl font-bold text-brand tracking-tight leading-none">{new Date(ev.when).getDate()}</div>
                <div className="text-xs text-brand mt-1" style={{fontSize:10.5}}>{new Date(ev.when).toLocaleDateString("en-CA",{weekday:"short"})}</div>
              </div>
              <div className="grow shrink basis-55 min-w-0">
                <div className="flex gap-2 items-center flex-wrap mb-1.5">
                  <div className="text-base font-semibold text-text tracking-tight">{ev.title}</div>
                  <Tag tone={typeTone[ev.type]||"neutral"} sm icon={typeIcon[ev.type]||"calendar"}>{ev.type}</Tag>
                </div>
                <div className="text-sm text-text-3 mb-1.5 flex gap-3 flex-wrap">
                  <span>{ev.time} • {ev.duration} min</span>
                  {ev.location&&<span>• {ev.location}</span>}
                </div>
                {ev.description&&<div className="text-sm text-text-2 leading-relaxed">{ev.description}</div>}
              </div>
              {canAdd&&<Btn kind="ghost" size="xs" icon="trash" onClick={()=>A.deleteEvent(ev.id)}/>}
            </div>
          </Card>)}
        </div>}

    {showAdd&&<Modal onClose={()=>setShowAdd(false)} title="Add event" wide>
      <div className="flex flex-col gap-3.5">
        <Field label="Event title" required><Input value={ne.title} onChange={e=>setNe({...ne,title:e.target.value})} placeholder="e.g. Q4 Kickoff Meeting"/></Field>
        <div className={`grid gap-3 ${mob?"grid-cols-1":"grid-cols-2"}`}>
          <Field label="Type"><Sel value={ne.type} onChange={e=>setNe({...ne,type:e.target.value})}>
            {["meeting","training","social","other"].map(t=><option key={t}>{t}</option>)}</Sel></Field>
          <Field label="Location"><Input value={ne.location} onChange={e=>setNe({...ne,location:e.target.value})} placeholder="Boardroom, Zoom, etc."/></Field>
        </div>
        <div className={`grid gap-3 ${mob?"grid-cols-1":"grid-cols-3"}`}>
          <Field label="Date" required><DatePicker value={ne.when} onChange={v=>setNe({...ne,when:v})} min={_fmtDate(new Date())}/></Field>
          <Field label="Time"><Input type="time" value={ne.time} onChange={e=>setNe({...ne,time:e.target.value})}/></Field>
          <Field label="Duration (min)"><Input type="number" min="15" step="15" value={ne.duration} onChange={e=>setNe({...ne,duration:Number(e.target.value)||60})}/></Field>
        </div>
        <Field label="Who's invited?"><Sel value={ne.invitees} onChange={e=>setNe({...ne,invitees:e.target.value})}>
          <option value="all">Everyone</option>
          {A.HR_DEPARTMENTS.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</Sel></Field>
        <Field label="Description"><Area rows={3} value={ne.description} onChange={e=>setNe({...ne,description:e.target.value})}/></Field>
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>setShowAdd(false)}>Cancel</Btn>
          <Btn kind="primary" icon="check" onClick={submit}>Create event</Btn>
        </div>
      </div>
    </Modal>}
  </div>;
}

/* ─── Chat: 1:1 + groups ─── */
export function HrChat(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const emp=A.hrCurrentEmp(); const company=A.hrCurrentCompany();
  const chatSettings=(A.hrCompanySettings[company?.id]||HR_COMPANY_SETTINGS_DEFAULT).chat;
  const [selected,setSelected]=useState(A.hrChats[0]?.id||null);
  const [msg,setMsg]=useState("");
  const [showNew,setShowNew]=useState(false);
  const [showThreads,setShowThreads]=useState(!mob);
  useEffect(()=>{if(!mob)setShowThreads(true);},[mob]);
  useEffect(()=>{if(selected)A.markHrChatRead(selected);},[selected]);
  const selectChat=id=>{setSelected(id); if(mob)setShowThreads(false);};

  const myChats=A.hrChats.filter(c=>{
    if(c.members==="all")return true;
    const members=c.members.split(",");
    if(members.includes(emp.id))return true;
    if(members.some(m=>m===emp.dept))return true;
    return false;
  });
  const chat=A.hrChats.find(c=>c.id===selected);
  const messages=A.hrChatMsgs.filter(m=>m.chat===selected).sort((a,b)=>a.at-b.at);

  const send=()=>{if(!msg.trim())return; A.sendHrMessage(selected,msg.trim()); setMsg("");};

  return <div className="grid gap-3" style={{gridTemplateColumns:mob?"1fr":"280px 1fr",height:"calc(100vh - 130px)"}}>
    {(showThreads||!mob)&&<Card pad={0} style={{borderRadius:14,overflow:"hidden",display:"flex",flexDirection:"column"}}>
      <div className="py-3.5 px-4 border-b border-line-soft flex justify-between items-center">
        <div className="text-sm font-semibold text-text">Conversations</div>
        {(chatSettings.allowDirectMessages||chatSettings.allowGroupCreation)&&<Btn kind="ghost" size="xs" icon="plus" onClick={()=>setShowNew(true)}/>}
      </div>
      <div className="flex-1 overflow-y-auto">
        {myChats.map(c=>{const isActive=selected===c.id; const unread=!isActive&&c.unreadCount>0;
          const lastMsg=A.hrChatMsgs.filter(m=>m.chat===c.id).sort((a,b)=>b.at-a.at)[0];
          return <button key={c.id} onClick={()=>selectChat(c.id)}
            className={`w-full py-3 px-3.5 border-0 border-b border-line-soft cursor-pointer text-left transition-colors duration-150 ${isActive?"bg-tint":"bg-transparent"}`}>
            <div className="flex justify-between items-baseline gap-2 mb-1">
              <div className={`text-sm overflow-hidden text-ellipsis whitespace-nowrap ${isActive||unread?"font-bold":"font-semibold"} text-text`}>{c.name}</div>
              <div className="flex gap-1.5 items-center shrink-0">
                {lastMsg&&<div className="text-xs text-text-3" style={{fontSize:10.5}}>{new Date(lastMsg.at).toLocaleDateString("en-CA",{month:"short",day:"numeric"})}</div>}
                {unread&&<span className="min-w-4.5 h-4.5 px-1 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center" style={{fontSize:10}}>{c.unreadCount}</span>}
              </div>
            </div>
            <div className={`text-xs overflow-hidden text-ellipsis whitespace-nowrap ${unread?"text-text font-semibold":"text-text-3"}`}>{lastMsg?lastMsg.text:c.about}</div>
          </button>;})}
      </div>
    </Card>}

    {(!showThreads||!mob)&&chat&&<Card pad={0} style={{borderRadius:14,overflow:"hidden",display:"flex",flexDirection:"column"}}>
      <div className="py-3.5 px-5 border-b border-line-soft flex justify-between items-center bg-white">
        <div>
          {mob&&<Btn kind="ghost" size="xs" icon="chevL" onClick={()=>setShowThreads(true)}>Back</Btn>}
          <div className="text-base font-semibold text-text">{chat.name}</div>
          <div className="text-xs text-text-3 mt-0.5">{chat.about}</div>
        </div>
        {chatSettings.allowCalls&&<div className="flex gap-1.5">
          <Btn kind="ghost" size="xs" icon="phone" title={`Call ${chat.name}`} onClick={()=>A.toast("Voice/video calling isn't available in this preview build.")}/>
          <Btn kind="ghost" size="xs" icon="play" title={`Video call ${chat.name}`} onClick={()=>A.toast("Voice/video calling isn't available in this preview build.")}/>
        </div>}
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-bg flex flex-col gap-2.5">
        {messages.length===0
          ? <Empty icon="mail" title="No messages yet" body="Start the conversation below."/>
          : messages.map(m=>{const from=A.hrEmp(m.from); const isMe=m.from===emp.id;
              return <div key={m.id} className={`flex gap-2.5 ${isMe?"flex-row-reverse self-end":"flex-row self-start"}`} style={{maxWidth:"85%"}}>
                {!isMe&&<SmartPortrait seed={from?.seed||0} size={30} radius={8}/>}
                <div className="rounded-xl py-2.5 px-3.5" style={{background:isMe?C.brand:"#fff",color:isMe?"#fff":C.text,boxShadow:isMe?"none":SH.sm}}>
                  {!isMe&&<div className="text-xs font-semibold mb-1 text-text-3">{from?.name||"Unknown"}</div>}
                  <div className="text-sm leading-snug whitespace-pre-wrap">{m.text}</div>
                  <div className={`text-xs mt-1.5 opacity-70 ${isMe?"text-right":"text-left"}`} style={{fontSize:10.5}}>{new Date(m.at).toLocaleTimeString("en-CA",{hour:"2-digit",minute:"2-digit"})}</div>
                </div>
              </div>;})}
      </div>

      <div className="p-3.5 border-t border-line-soft flex gap-2">
        <div className="flex-1"><Input value={msg} onChange={e=>setMsg(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault(); send();}}} placeholder="Type a message…"/></div>
        <Btn kind="primary" icon="send" onClick={send} disabled={!msg.trim()}>Send</Btn>
      </div>
    </Card>}

    {showNew&&<Modal onClose={()=>setShowNew(false)} title="Start a new conversation">
      <_HrNewChat allowDm={chatSettings.allowDirectMessages} allowGroup={chatSettings.allowGroupCreation}
        onClose={()=>setShowNew(false)} onCreate={id=>{setSelected(id); setShowNew(false);}}/>
    </Modal>}
  </div>;
}
function _HrNewChat({onClose,onCreate,allowDm=true,allowGroup=true}){
  const A=use(); const emp=A.hrCurrentEmp();
  const [kind,setKind]=useState(allowDm?"dm":"group"); /* dm | group */
  const [name,setName]=useState("");
  const [selected,setSelected]=useState([]);
  const all=A.hrEmpsAtCompany(emp.companyId).filter(e=>e.id!==emp.id&&e.status==="active");
  const toggle=(id)=>setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
  const create=async()=>{
    if(kind==="dm"&&selected.length===1){
      const other=A.hrEmp(selected[0]);
      const c=await A.createHrChat({kind:"dm",name:other.name,members:`${emp.id},${selected[0]}`,about:"Direct message"});
      onCreate(c.id);
    } else if(kind==="group"&&name.trim()&&selected.length>0){
      const c=await A.createHrChat({kind:"group",name:`# ${name.trim()}`,members:`${emp.id},${selected.join(",")}`,about:`Group of ${selected.length+1}`});
      onCreate(c.id);
    }
  };
  return <div className="flex flex-col gap-3.5">
    <div className="grid grid-cols-2 gap-2.5">
      {[["dm","Direct message",allowDm],["group","Group chat",allowGroup]].filter(([,,allowed])=>allowed).map(([k,l])=>
        <button key={k} onClick={()=>setKind(k)} className={`p-3.5 rounded-xl cursor-pointer text-sm border-2 ${kind===k?"border-brand bg-tint font-bold text-brand":"border-line bg-white font-medium text-text"}`}>{l}</button>)}
    </div>
    {kind==="group"&&<Field label="Group name"><Input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. field-crew-calgary"/></Field>}
    <div>
      <Lbl>Select {kind==="dm"?"someone":"members"}</Lbl>
      <div className="border border-line rounded-lg overflow-y-auto" style={{maxHeight:280}}>
        {all.map(e=><label key={e.id} className="flex gap-2.5 items-center py-2.5 px-3.5 border-b border-line-soft cursor-pointer">
          <input type={kind==="dm"?"radio":"checkbox"} name="who" checked={selected.includes(e.id)}
            onChange={()=>kind==="dm"?setSelected([e.id]):toggle(e.id)}/>
          <SmartPortrait seed={e.seed} size={30} radius={8}/>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-text">{e.name}</div>
            <div className="text-xs text-text-3">{e.title}</div>
          </div>
        </label>)}
      </div>
    </div>
    <div className="flex gap-2.5 justify-end">
      <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
      <Btn kind="primary" onClick={create} disabled={selected.length===0||(kind==="group"&&!name.trim())}>Start conversation</Btn>
    </div>
  </div>;
}

/* ─── Invoices ─── */
export function HrInvoices(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const emp=A.hrCurrentEmp(); const company=A.hrCurrentCompany();
  const [showAdd,setShowAdd]=useState(false);
  const [detail,setDetail]=useState(null);
  const [nInv,setNInv]=useState({client:"",prov:company?.prov||"ON",amount:0,due:"",po:"",items:[{desc:"",qty:1,unitPrice:0}]});
  const [tab,setTab]=useState("all");
  const list=tab==="all"?A.hrInvoices:A.hrInvoices.filter(i=>i.status===tab);
  const canManage=["owner","admin","finance"].includes(emp.role);
  const pg=usePagination(list,20);
  useEffect(()=>{pg.setPage(1);},[tab]);

  const updateItem=(i,patch)=>setNInv(p=>({...p,items:p.items.map((it,idx)=>idx===i?{...it,...patch}:it)}));
  const addItem=()=>setNInv(p=>({...p,items:[...p.items,{desc:"",qty:1,unitPrice:0}]}));
  const removeItem=(i)=>setNInv(p=>({...p,items:p.items.filter((_,idx)=>idx!==i)}));
  const itemsTotal=nInv.items.reduce((s,it)=>s+(it.qty*it.unitPrice||0),0);
  /* Was a hardcoded 13% (Ontario HST) on every invoice regardless of the client's real
     jurisdiction - now derived from the client's province, same table staffing invoicing uses. */
  const hst=Math.round(itemsTotal*salesTaxRate(nInv.prov)*100)/100;
  const invTotal=itemsTotal+hst;

  const submit=()=>{
    if(!nInv.client||!nInv.due||itemsTotal<=0)return;
    A.addInvoice({...nInv,amount:invTotal,subtotal:itemsTotal,hst,taxLabel:salesTaxLabel(nInv.prov),items:nInv.items.filter(it=>it.desc&&it.qty*it.unitPrice>0)});
    setNInv({client:"",prov:company?.prov||"ON",amount:0,due:"",po:"",items:[{desc:"",qty:1,unitPrice:0}]});
    setShowAdd(false);
  };

  const totals={
    paid:A.hrInvoices.filter(i=>i.status==="paid").reduce((s,i)=>s+i.amount,0),
    pending:A.hrInvoices.filter(i=>i.status==="pending").reduce((s,i)=>s+i.amount,0),
    overdue:A.hrInvoices.filter(i=>i.status==="overdue").reduce((s,i)=>s+i.amount,0),
  };
  return <div>
    <div className={`grid gap-3 mb-4 ${mob?"grid-cols-1":"grid-cols-3"}`}>
      {[["Paid this year",totals.paid,C.ok],["Pending",totals.pending,C.warn],["Overdue",totals.overdue,C.danger]].map(([l,v,t])=>
        <Card key={l} pad={mob?16:20} style={{borderRadius:14}}>
          <div className={`font-bold tracking-tight ${mob?"text-xl":"text-2xl"}`} style={{color:t}}>${(v/1000).toFixed(0)}k</div>
          <div className="text-xs text-text-3 mt-1.5">{l}</div>
        </Card>)}
    </div>
    <div className="flex justify-between items-center mb-3.5 flex-wrap gap-2.5">
      <_PillTabs items={[["all","All"],["pending","Pending"],["paid","Paid"],["overdue","Overdue"]]} value={tab} onChange={setTab}/>
      {canManage&&<Btn kind="primary" size="sm" icon="plus" onClick={()=>setShowAdd(true)}>New invoice</Btn>}
    </div>
    <Card pad={0} style={{borderRadius:14,overflow:"hidden"}}>
      <div className="overflow-x-auto"><table className="w-full border-collapse" style={{minWidth:720}}>
        <thead><tr className="border-b-2 border-line text-left">
          {["Number","Client","Amount","Issued","Due","Status","Actions"].map(h=>
            <th key={h} className={TH_CLS}>{h}</th>)}
        </tr></thead>
        <tbody>{pg.pageItems.map(inv=><tr key={inv.id} className="border-b border-line-soft cursor-pointer" onClick={()=>setDetail(inv)}>
          <td className={`${TD_CLS} text-xs text-text-2 font-mono`}>{inv.number}</td>
          <td className={`${TD_CLS} text-sm text-text font-semibold`}>{inv.client}</td>
          <td className={`${TD_CLS} text-sm text-text font-semibold`}>${inv.amount.toLocaleString()}</td>
          <td className={`${TD_CLS} text-xs text-text-3`}>{inv.issued}</td>
          <td className={`${TD_CLS} text-xs text-text-3`}>{inv.due}</td>
          <td className={TD_CLS}><Tag tone={invoiceTone(inv.status)} sm>{inv.status}</Tag></td>
          <td className={TD_CLS} onClick={e=>e.stopPropagation()}><div className="flex gap-1">
            <Btn kind="ghost" size="xs" onClick={()=>setDetail(inv)}>View</Btn>
            {canManage&&inv.status==="pending"&&<Btn kind="primary" size="xs" onClick={()=>A.markInvoicePaid(inv.id)}>Mark paid</Btn>}
            {canManage&&inv.status==="draft"&&<Btn kind="primary" size="xs" onClick={()=>A.sendInvoice(inv.id)}>Send</Btn>}
          </div></td>
        </tr>)}</tbody>
      </table></div>
    </Card>
    <Pagination {...pg}/>

    {showAdd&&<Modal onClose={()=>setShowAdd(false)} title="New invoice" wide>
      <div className="flex flex-col gap-3.5">
        <div className="grid gap-3" style={{gridTemplateColumns:mob?"1fr":"2fr 1fr 1fr"}}>
          <Field label="Client" required><Input value={nInv.client} onChange={e=>setNInv({...nInv,client:e.target.value})} placeholder="Client company name"/></Field>
          <Field label="Due date" required><Input type="date" value={nInv.due} onChange={e=>setNInv({...nInv,due:e.target.value})} min={_fmtDate(new Date())}/></Field>
          <Field label="PO number"><Input value={nInv.po} onChange={e=>setNInv({...nInv,po:e.target.value})} placeholder="Optional"/></Field>
        </div>
        <Field label="Client province" hint="Determines the sales tax rate applied below.">
          <Sel value={nInv.prov} onChange={e=>setNInv({...nInv,prov:e.target.value})}>
            {[["ON","Ontario"],["QC","Québec"],["BC","British Columbia"],["AB","Alberta"],["MB","Manitoba"],["SK","Saskatchewan"],
              ["NS","Nova Scotia"],["NB","New Brunswick"],["NL","Newfoundland and Labrador"],["PE","Prince Edward Island"],
              ["NT","Northwest Territories"],["NU","Nunavut"],["YT","Yukon"]].map(([code,name])=><option key={code} value={code}>{name}</option>)}
          </Sel></Field>

        <div>
          <Lbl style={{marginTop:6}}>Line items</Lbl>
          <div className="border border-line rounded-lg overflow-hidden">
            <div className="grid gap-2 py-2.5 px-3 bg-bg text-xs font-bold text-text-3 tracking-wide uppercase" style={{gridTemplateColumns:"3fr 60px 100px 90px 32px"}}>
              <div>Description</div><div>Qty</div><div>Unit price</div><div className="text-right">Line total</div><div/>
            </div>
            {nInv.items.map((it,i)=><div key={i} className="grid gap-2 py-2 px-3 border-t border-line-soft items-center" style={{gridTemplateColumns:"3fr 60px 100px 90px 32px"}}>
              <Input value={it.desc} onChange={e=>updateItem(i,{desc:e.target.value})} placeholder="Consulting services · June 2026"/>
              <Input type="number" min="0" value={it.qty} onChange={e=>updateItem(i,{qty:Math.max(0,Number(e.target.value)||0)})}/>
              <Input type="number" min="0" step="0.01" value={it.unitPrice} onChange={e=>updateItem(i,{unitPrice:Math.max(0,Number(e.target.value)||0)})}/>
              <div className="text-sm font-semibold text-text text-right">${(it.qty*it.unitPrice||0).toLocaleString()}</div>
              <button onClick={()=>removeItem(i)} disabled={nInv.items.length===1} className="bg-transparent border-0 p-1" style={{cursor:nInv.items.length===1?"default":"pointer",color:nInv.items.length===1?C.text3:C.danger,opacity:nInv.items.length===1?0.3:1}}><I n="x" s={16}/></button>
            </div>)}
          </div>
          <Btn kind="ghost" size="sm" icon="plus" style={{marginTop:8}} onClick={addItem}>Add line</Btn>
        </div>

        <div className="p-3.5 bg-bg rounded-lg">
          <div className="flex justify-between text-sm text-text-2 mb-1.5">
            <span>Subtotal</span><span>${itemsTotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm text-text-2 mb-1.5">
            <span>{salesTaxLabel(nInv.prov)}</span><span>${hst.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-base text-text font-bold pt-2 border-t border-line">
            <span>Total</span><span className="text-brand">${invTotal.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>setShowAdd(false)}>Cancel</Btn>
          <Btn kind="primary" icon="check" onClick={submit} disabled={!nInv.client||!nInv.due||itemsTotal<=0}>Create invoice</Btn>
        </div>
      </div>
    </Modal>}

    {detail&&<InvoiceDetailModal invoice={detail} company={company} onClose={()=>setDetail(null)} canManage={canManage} onMarkPaid={()=>{A.markInvoicePaid(detail.id); setDetail({...detail,status:"paid"});}} onSend={()=>{A.sendInvoice(detail.id); setDetail({...detail,status:"pending"});}}
      onReverse={async reason=>{try{await A.reverseInvoice(detail.id,reason);setDetail({...detail,status:"reversed"});A.toast("Invoice reversed","ok");}catch(e){A.toast(e.message,"danger");}}}/>}
  </div>;
}

function InvoiceDetailModal({invoice:inv,company,onClose,canManage,onMarkPaid,onSend,onReverse}){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const [reversing,setReversing]=useState(false); const [reverseReason,setReverseReason]=useState("");
  const items=inv.items||[{desc:"Services",qty:1,unitPrice:inv.amount}];
  const subtotal=inv.subtotal||inv.amount;
  const hst=inv.hst||0;
  return <Modal onClose={onClose} title={`Invoice ${inv.number}`} wide>
    <div className="flex flex-col gap-4">
      {/* Header: From / To */}
      <div className={`grid gap-3.5 bg-bg rounded-xl ${mob?"grid-cols-1 p-4":"grid-cols-2 p-5"}`}>
        <div>
          <div className="text-xs text-text-3 font-bold tracking-wide uppercase mb-1.5">From</div>
          <div className="text-base font-semibold text-text">{company?.name||"Your company"}</div>
          <div className="text-xs text-text-3 mt-1 leading-snug">{company?.city||""}{company?.prov?", "+company.prov:""}<br/>{company?.email||""}</div>
        </div>
        <div>
          <div className="text-xs text-text-3 font-bold tracking-wide uppercase mb-1.5">Bill to</div>
          <div className="text-base font-semibold text-text">{inv.client}</div>
          {inv.po&&<div className="text-xs text-text-3 mt-1">PO: {inv.po}</div>}
        </div>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-4 gap-2 text-xs">
        {[["Invoice #",inv.number],["Issued",inv.issued],["Due",inv.due],["Status",inv.status.toUpperCase()]].map(([l,v])=>
          <div key={l} className="p-2.5 bg-bg rounded-lg text-center">
            <div className="text-text-3 font-semibold uppercase tracking-wide mb-1" style={{fontSize:10.5}}>{l}</div>
            <div className="text-text font-semibold" style={{fontFamily:l==="Invoice #"||l==="Issued"||l==="Due"?"ui-monospace,monospace":"inherit"}}>{v}</div>
          </div>)}
      </div>

      {/* Line items */}
      <div className="border border-line rounded-lg overflow-hidden">
        <div className="py-2.5 px-3.5 bg-bg text-xs font-bold text-text-3 tracking-wide uppercase grid gap-2" style={{gridTemplateColumns:"3fr 60px 100px 100px"}}>
          <div>Description</div><div className="text-center">Qty</div><div className="text-right">Unit price</div><div className="text-right">Line total</div>
        </div>
        {items.map((it,i)=><div key={i} className="py-3 px-3.5 border-t border-line-soft grid gap-2 text-sm items-center" style={{gridTemplateColumns:"3fr 60px 100px 100px"}}>
          <div className="text-text">{it.desc||"—"}</div>
          <div className="text-center text-text-2">{it.qty||1}</div>
          <div className="text-right text-text-2">${(it.unitPrice||0).toLocaleString()}</div>
          <div className="text-right text-text font-semibold">${((it.qty||1)*(it.unitPrice||0)).toLocaleString()}</div>
        </div>)}
      </div>

      {/* Totals */}
      <div className="p-4 bg-bg rounded-xl ml-auto" style={{maxWidth:mob?"none":320,width:mob?"auto":320}}>
        {hst>0&&<>
          <div className="flex justify-between text-sm text-text-2 mb-1.5">
            <span>Subtotal</span><span>${subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm text-text-2 mb-2">
            <span>{inv.taxLabel||"HST (13%)"}</span><span>${hst.toLocaleString()}</span>
          </div>
        </>}
        <div className={`flex justify-between text-base text-text font-bold ${hst>0?"pt-2.5 border-t border-line":""}`}>
          <span>Total</span><span className="text-brand">${inv.amount.toLocaleString()} CAD</span>
        </div>
      </div>

      {reversing?<div className="flex flex-col gap-2.5 p-3 bg-red-bg rounded-lg border border-red-ln">
        <Field label="Reason for reversal" required hint="Recorded in the audit log.">
          <Area rows={2} value={reverseReason} onChange={e=>setReverseReason(e.target.value)} placeholder="e.g. Billed the wrong client"/></Field>
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" size="sm" onClick={()=>{setReversing(false);setReverseReason("");}}>Cancel</Btn>
          <Btn kind="danger" size="sm" disabled={!reverseReason.trim()} onClick={()=>{onReverse(reverseReason.trim());setReversing(false);setReverseReason("");}}>Confirm reversal</Btn>
        </div>
      </div>:<div className="flex gap-2.5 justify-end pt-2 border-t border-line">
        <Btn kind="ghost" onClick={onClose}>Close</Btn>
        <Btn kind="ghost" icon="download" onClick={()=>A.printHrInvoice(inv,company)}>Download PDF</Btn>
        {canManage&&inv.status==="draft"&&<Btn kind="primary" onClick={onSend}>Send to client</Btn>}
        {canManage&&inv.status==="pending"&&<Btn kind="primary" icon="check" onClick={onMarkPaid}>Mark as paid</Btn>}
        {canManage&&inv.status==="paid"&&<Btn kind="dangerSoft" onClick={()=>setReversing(true)}>Reverse</Btn>}
      </div>}
    </div>
  </Modal>;
}

/* ─── Payroll ─── */
/* Year-end T4s and Records of Employment, computed from the payroll runs that were actually
   paid. Every employee can pull their own T4; only owner/admin/hr/finance see the whole company's
   or can produce an ROE. Both printouts state plainly that nothing has been filed with CRA or
   Service Canada - generating the slip and filing it are different things, and an employer
   assuming otherwise would be a genuinely costly misunderstanding. */
function _YearEndSlips({A,mob,isEmployee,isPayrollMgr}){
  const [years,setYears]=useState([]);
  const [year,setYear]=useState(null);
  const [data,setData]=useState(null);
  const [mine,setMine]=useState(null);
  const [err,setErr]=useState("");
  const [roeFor,setRoeFor]=useState(null);
  const [roeReason,setRoeReason]=useState("A");

  useEffect(()=>{let off=false;
    A.hrTaxSlipYears().then(ys=>{if(off)return;setYears(ys);setYear(ys[0]??null);});
    return()=>{off=true;};},[]);

  useEffect(()=>{if(!year)return;let off=false;setErr("");
    if(isEmployee){
      A.hrMyTaxSlip(year).then(r=>{if(!off)setMine(r);}).catch(e=>{if(!off){setMine(null);setErr(e.message);}});
    }else{
      A.hrTaxSlips(year).then(r=>{if(!off)setData(r);}).catch(e=>{if(!off){setData(null);setErr(e.message);}});
    }
    return()=>{off=true;};},[year,isEmployee]);

  const money=n=>`$${Number(n||0).toLocaleString("en-CA",{maximumFractionDigits:0})}`;

  if(!years.length) return null;

  return <Card pad={mob?16:20} style={{borderRadius:14,marginBottom:16}}>
    <div className="flex justify-between items-center flex-wrap gap-3 mb-1">
      <Lbl style={{margin:0}}>Year-end slips</Lbl>
      <Sel value={year||""} onChange={e=>setYear(Number(e.target.value))} style={{width:130}}>
        {years.map(y=><option key={y} value={y}>{y}</option>)}</Sel>
    </div>
    <div className="text-xs text-text-2 mb-3.5 leading-relaxed">
      Amounts come from payroll runs actually paid in {year}. Generating a slip is not filing it —
      the T4 Summary still has to go to CRA, and an ROE through ROE Web.
    </div>
    {err&&<Banner tone="warn" icon="alert">{err}</Banner>}

    {isEmployee
      ? (mine&&<div className="border border-line rounded-xl p-4">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div>
              <div className="text-sm font-semibold text-text">T4 — {mine.slip.year}</div>
              <div className="text-xs text-text-2 mt-1">
                Employment income {money(mine.slip.boxes[14])} · Tax deducted {money(mine.slip.boxes[22])} ·
                {" "}{mine.slip.periodsPaid} pay period{mine.slip.periodsPaid===1?"":"s"}</div>
            </div>
            <Btn kind="outline" size="sm" icon="download" onClick={()=>A.printT4(mine.slip,mine.employer)}>Print / Save as PDF</Btn>
          </div>
        </div>)
      : (data&&<>
        <div className={`grid gap-2.5 mb-3.5 ${mob?"grid-cols-2":"grid-cols-4"}`}>
          {[["Employees",data.slips.length],["Employment income",money(data.totals.gross)],
            ["CPP + EI",money(data.totals.cpp+data.totals.ei)],["Tax deducted",money(data.totals.tax)]].map(([l,v])=>
            <div key={l} className="bg-bg border border-line rounded-xl p-3">
              <div className="text-xs text-text-3">{l}</div>
              <div className="text-base font-bold text-text mt-0.5">{v}</div></div>)}
        </div>
        <div className="overflow-x-auto"><table className="w-full border-collapse" style={{minWidth:620}}>
          <thead><tr className="border-b-2 border-line text-left">
            {["Employee","Box 14 income","Box 16 CPP","Box 18 EI","Box 22 tax",""].map(h=><th key={h} className={TH_CLS}>{h}</th>)}
          </tr></thead>
          <tbody>
            {data.slips.map(s=><tr key={s.employeeId} className="border-b border-line-soft">
              <td className={`${TD_CLS} text-sm font-medium text-text`}>{s.name}</td>
              <td className={`${TD_CLS} text-sm`}>{money(s.boxes[14])}</td>
              <td className={`${TD_CLS} text-sm text-text-2`}>{money(s.boxes[16])}</td>
              <td className={`${TD_CLS} text-sm text-text-2`}>{money(s.boxes[18])}</td>
              <td className={`${TD_CLS} text-sm text-text-2`}>{money(s.boxes[22])}</td>
              <td className={TD_CLS}>
                <div className="flex gap-1 justify-end">
                  <Btn kind="ghost" size="xs" onClick={()=>A.printT4(s,data.employer)}>T4</Btn>
                  {isPayrollMgr&&<Btn kind="ghost" size="xs" onClick={()=>{setRoeFor(s);setRoeReason("A");}}>ROE</Btn>}
                </div></td>
            </tr>)}
            {data.slips.length===0&&<tr><td colSpan={6} className="p-5">
              <Empty icon="wallet" title={`No paid payroll in ${year}`} body="A T4 is only generated once a payroll run has actually been paid."/></td></tr>}
          </tbody>
        </table></div>
      </>)}

    {roeFor&&<Modal onClose={()=>setRoeFor(null)} title={`Record of Employment — ${roeFor.name}`}>
      <div className="text-sm text-text-2 mb-4 leading-relaxed">
        Insurable earnings and hours are read from this employee's paid payroll runs. Pick the reason
        Service Canada should see, then print the working copy to check the figures before issuing.
      </div>
      <Field label="Reason for issuing">
        <Sel value={roeReason} onChange={e=>setRoeReason(e.target.value)}>
          {Object.entries(ROE_REASONS).map(([c,l])=><option key={c} value={c}>{c} — {l}</option>)}</Sel>
      </Field>
      <div className="flex gap-2.5 justify-end mt-5">
        <Btn kind="ghost" onClick={()=>setRoeFor(null)}>Cancel</Btn>
        <Btn kind="primary" icon="download" onClick={async()=>{
          try{
            const r=await A.hrRoe(roeFor.employeeId,roeReason);
            A.printRoe(r.roe,r.employer);
            setRoeFor(null);
          }catch(e){setErr(e.message);setRoeFor(null);}
        }}>Print working copy</Btn>
      </div>
    </Modal>}
  </Card>;
}

export function HrPayroll(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const emp=A.hrCurrentEmp(); const company=A.hrCurrentCompany();
  const isEmployee=emp.role==="employee";
  const isPayrollMgr=["owner","admin","finance"].includes(emp.role);
  const all=A.hrEmpsAtCompany(company.id).filter(e=>e.status==="active");
  const runs=A.hrPayruns.filter(p=>!p.companyId||p.companyId===company.id).sort((a,b)=>(b.runDate||"").localeCompare(a.runDate||""));
  const [showNew,setShowNew]=useState(false);
  const [detail,setDetail]=useState(null);
  const [executing,setExecuting]=useState(null);
  const [salQ,setSalQ]=useState(""); const [salSort,setSalSort]=useState("name");
  const salaryRows=[...all].filter(e=>!salQ||e.name.toLowerCase().includes(salQ.toLowerCase())||e.role.toLowerCase().includes(salQ.toLowerCase()))
    .sort((a,b)=>salSort==="salary"?(b.salary||0)-(a.salary||0):salSort==="role"?a.role.localeCompare(b.role):a.name.localeCompare(b.name));

  const today=new Date();
  const twoWeeksAgo=new Date(today.getTime()-14*864e5);
  const [np,setNp]=useState({periodStart:_fmtDate(twoWeeksAgo),periodEnd:_fmtDate(today)});

  const createRun=async()=>{
    const r=await A.runPayroll(company.id,np.periodStart,np.periodEnd);
    setShowNew(false); setDetail(r);
  };

  return <div>
    {!isEmployee&&<>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2.5">
        <div>
          <div className="text-xl font-bold text-text tracking-tight">Payroll</div>
          <div className="text-sm text-text-3 mt-0.5">Biweekly runs using real federal and provincial tax brackets, TD1 credits, and CPP/EI annual maximums. Approved expenses flow through automatically.</div>
        </div>
        {isPayrollMgr&&<Btn kind="primary" size="sm" icon="plus" onClick={()=>setShowNew(true)}>Create payroll run</Btn>}
      </div>

      <div className={`grid gap-3 mb-4 ${mob?"grid-cols-2":"grid-cols-4"}`}>
        {[
          ["YTD gross",`$${(runs.reduce((s,p)=>s+p.totalGross,0)/1000).toFixed(0)}k`,C.brand],
          ["YTD net",`$${(runs.reduce((s,p)=>s+p.totalNet,0)/1000).toFixed(0)}k`,C.ok],
          ["Employees on payroll",all.length,C.warn],
          ["Runs this year",runs.length,C.text2],
        ].map(([l,v,t])=><Card key={l} pad={mob?16:20} style={{borderRadius:14}}>
          <div className={`font-bold tracking-tight ${mob?"text-xl":"text-2xl"}`} style={{color:t}}>{v}</div>
          <div className="text-xs text-text-3 mt-1.5">{l}</div>
        </Card>)}
      </div>

      <Card pad={0} style={{borderRadius:14,marginBottom:16,overflow:"hidden"}}>
        <div className={`border-b border-line ${mob?"py-3.5 px-4":"py-4 px-5"}`}><Lbl style={{margin:0}}>Payroll runs</Lbl></div>
        <div className="overflow-x-auto"><table className="w-full border-collapse" style={{minWidth:700}}>
          <thead><tr className="border-b border-line text-left bg-bg">
            {["Period","Run date","Gross","Net","Reimb.","Employees","Status","Actions"].map(h=>
              <th key={h} className={TH_CLS}>{h}</th>)}
          </tr></thead>
          <tbody>{runs.map(p=><tr key={p.id} className="border-b border-line-soft cursor-pointer" onClick={()=>setDetail(p)}>
            <td className={`${TD_CLS} text-xs text-text font-semibold`}>{p.period}</td>
            <td className={`${TD_CLS} text-xs text-text-3`}>{p.runDate}</td>
            <td className={`${TD_CLS} text-sm text-text`}>${p.totalGross.toLocaleString()}</td>
            <td className={`${TD_CLS} text-sm text-brand font-semibold`}>${p.totalNet.toLocaleString()}</td>
            <td className={`${TD_CLS} text-xs text-text-2`}>${(p.totalReimb||0).toLocaleString()}</td>
            <td className={`${TD_CLS} text-xs text-text-2`}>{p.employees}</td>
            <td className={TD_CLS}><Tag tone={p.status==="paid"?"ok":p.status==="approved"?"brand":"warn"} sm>{p.status}</Tag></td>
            <td className={TD_CLS} onClick={e=>e.stopPropagation()}>
              <div className="flex gap-1">
                <Btn kind="ghost" size="xs" onClick={()=>setDetail(p)}>View</Btn>
                {isPayrollMgr&&p.status==="draft"&&<Btn kind="primary" size="xs" onClick={()=>A.approvePayroll(p.id)}>Approve</Btn>}
                {isPayrollMgr&&p.status==="approved"&&<Btn kind="primary" size="xs" onClick={()=>setExecuting(p)}>Execute</Btn>}
              </div>
            </td>
          </tr>)}
          {runs.length===0&&<tr><td colSpan={8} className="p-5"><Empty icon="wallet" title="No payroll runs yet" body='Click "Create payroll run" above to start.'/></td></tr>}
          </tbody>
        </table></div>
      </Card>
    </>}

    <_YearEndSlips A={A} mob={mob} isEmployee={isEmployee} isPayrollMgr={isPayrollMgr}/>

    <Card pad={mob?16:20} style={{borderRadius:14}}>
      <div className="flex justify-between items-center flex-wrap gap-3 mb-3">
        <Lbl style={{margin:0}}>{isEmployee?"My salary":"All employee salaries"}</Lbl>
        {!isEmployee&&<div className="flex gap-2.5 flex-wrap">
          <Input icon="search" placeholder="Search name or role" value={salQ} onChange={e=>setSalQ(e.target.value)} style={{width:200}}/>
          <Sel value={salSort} onChange={e=>setSalSort(e.target.value)} style={{width:150}}>
            <option value="name">Sort: Name</option><option value="salary">Sort: Salary (high-low)</option><option value="role">Sort: Role</option></Sel>
        </div>}
      </div>
      <div className="overflow-x-auto"><table className="w-full border-collapse" style={{minWidth:500}}>
        <thead><tr className="border-b-2 border-line text-left">
          {(isEmployee?["Item","Amount"]:["Employee","Role","Annual","Monthly","Biweekly"]).map(h=>
            <th key={h} className={TH_CLS}>{h}</th>)}
        </tr></thead>
        <tbody>
          {isEmployee?<>
            <tr><td className="py-3 px-3 text-sm text-text">Annual salary</td><td className="py-3 px-3 text-sm text-brand font-semibold">${emp.salary?.toLocaleString()}</td></tr>
            <tr><td className="py-3 px-3 text-sm text-text">Monthly gross</td><td className="py-3 px-3 text-sm text-text">${Math.round((emp.salary||0)/12).toLocaleString()}</td></tr>
            <tr><td className="py-3 px-3 text-sm text-text">Bi-weekly gross</td><td className="py-3 px-3 text-sm text-text">${Math.round((emp.salary||0)/26).toLocaleString()}</td></tr>
          </>:null}
          {!isEmployee&&salaryRows.map(e=><tr key={e.id} className="border-b border-line-soft">
            <td className="py-3 px-3"><div className="flex gap-2.5 items-center">
              <SmartPortrait seed={e.seed} size={28} radius={7}/>
              <span className="text-sm text-text font-semibold">{e.name}</span></div></td>
            <td className="py-3 px-3 text-xs text-text-3">{e.role}</td>
            <td className="py-3 px-3 text-sm text-text">${e.salary?.toLocaleString()}</td>
            <td className="py-3 px-3 text-sm text-text-2">${Math.round((e.salary||0)/12).toLocaleString()}</td>
            <td className="py-3 px-3 text-sm text-text-2">${Math.round((e.salary||0)/26).toLocaleString()}</td>
          </tr>)}
          {!isEmployee&&salaryRows.length===0&&<tr><td colSpan={5} className="p-5"><Empty icon="search" title="No matches" body="Try a different search term."/></td></tr>}
        </tbody>
      </table></div>
    </Card>

    {isEmployee&&<Card pad={mob?16:20} style={{borderRadius:14,marginTop:16}}>
      <Lbl>My payslips</Lbl>
      {(()=>{const slips=A.myPayslips();
        if(slips.length===0)return <Empty icon="wallet" title="No payslips yet" body="A payslip appears here after your first executed payroll run."/>;
        return <div className="overflow-x-auto"><table className="w-full border-collapse" style={{minWidth:460}}>
          <thead><tr className="border-b-2 border-line text-left">
            {["Period","Pay date","Gross","Net","Action"].map(h=><th key={h} className={TH_CLS}>{h}</th>)}
          </tr></thead>
          <tbody>{slips.map(({run,line})=><tr key={run.id} className="border-b border-line-soft">
            <td className="py-3 px-3 text-sm text-text font-semibold">{run.period}</td>
            <td className="py-3 px-3 text-xs text-text-3">{run.runDate}</td>
            <td className="py-3 px-3 text-sm text-text">${line.gross.toLocaleString()}</td>
            <td className="py-3 px-3 text-sm text-brand font-semibold">${line.net.toLocaleString()}</td>
            <td className="py-3 px-3"><Btn kind="outline" size="xs" icon="download" onClick={()=>A.printPayslip(run,line,emp,company)}>Payslip</Btn></td>
          </tr>)}</tbody>
        </table></div>;
      })()}
    </Card>}

    {showNew&&<Modal onClose={()=>setShowNew(false)} title="Create payroll run">
      <div className="flex flex-col gap-3.5">
        <Banner tone="brand" icon="info">Runs pay for {all.length} active employees using real federal and provincial brackets, TD1 credits, and CPP/EI annual maximums. Remitting the withheld amounts to CRA is still a separate step. Approved expenses awaiting reimbursement will be included.</Banner>
        <div className={`grid gap-3 ${mob?"grid-cols-1":"grid-cols-2"}`}>
          <Field label="Period start" required><Input type="date" value={np.periodStart} onChange={e=>setNp({...np,periodStart:e.target.value})}/></Field>
          <Field label="Period end" required><Input type="date" value={np.periodEnd} onChange={e=>setNp({...np,periodEnd:e.target.value})}/></Field>
        </div>
        <div className="p-3.5 bg-bg rounded-lg text-sm text-text-2 leading-relaxed">
          <div className="font-semibold mb-1.5 text-text">Estimated totals</div>
          Gross: <strong className="text-text">${all.reduce((s,e)=>s+Math.round((e.salary||0)/26),0).toLocaleString()}</strong><br/>
          Employees: <strong className="text-text">{all.length}</strong><br/>
          Pending reimbursable expenses: <strong className="text-text">${A.companyExpenses(company.id).filter(x=>x.status==="approved"&&x.reimburseVia==="next-payroll").reduce((s,x)=>s+x.amount,0).toLocaleString()}</strong>
        </div>
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>setShowNew(false)}>Cancel</Btn>
          <Btn kind="primary" icon="check" onClick={createRun}>Create run (draft)</Btn>
        </div>
      </div>
    </Modal>}

    {detail&&<PayrollDetailModal run={detail} onClose={()=>setDetail(null)} canApprove={isPayrollMgr} onApprove={()=>{A.approvePayroll(detail.id); setDetail({...detail,status:"approved"});}} onExecute={()=>setExecuting(detail)}
      onReverse={async reason=>{const r=await A.reversePayroll(detail.id,reason).then(()=>({ok:true})).catch(e=>({ok:false,msg:e.message}));
        if(r.ok){setDetail({...detail,status:"reversed"});A.toast("Payroll run reversed","ok");}else A.toast(r.msg,"danger");}}/>}

    <ConfirmDialog open={!!executing} onClose={()=>setExecuting(null)} confirmLabel="Execute payroll"
      title="Execute this payroll run?" onConfirm={()=>{A.executePayroll(executing.id); if(detail?.id===executing.id)setDetail(null);}}>
      {executing&&<>Pays {executing.employees} employees, total net <strong>${executing.totalNet?.toLocaleString()}</strong>. This triggers direct deposit and marks all approved expenses as paid — it can't be undone from here.</>}
    </ConfirmDialog>
  </div>;
}

function PayrollDetailModal({run,onClose,canApprove,onApprove,onExecute,onReverse}){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const [reversing,setReversing]=useState(false); const [reverseReason,setReverseReason]=useState("");
  const exportRegister=()=>{
    const rows=[["Employee","Pay type","Gross","Unpaid leave","Reg. hrs","OT hrs","Stat hrs","Night diff hrs","CPP","EI","Federal tax","Provincial tax","Reimbursement","Net"],
      ...run.lines.map(l=>[l.name,l.payType||"salary",l.gross,l.unpaidDeduction||0,
        l.hourlyBreakdown?.regularHours||"",l.hourlyBreakdown?.otHours||"",l.hourlyBreakdown?.statHours||"",l.hourlyBreakdown?.nightHours||"",
        l.cpp,l.ei,l.fedTax,l.provTax,l.reimb||0,l.net])];
    const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv"}); const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download=`payroll-register-${run.period.replace(/[^\w-]/g,"_")}.csv`; a.click(); URL.revokeObjectURL(url);
  };
  return <Modal onClose={onClose} title={`Payroll · ${run.period}`} wide>
    <div className="flex flex-col gap-3.5">
      <div className={`grid gap-2.5 ${mob?"grid-cols-2":"grid-cols-4"}`}>
        {[["Gross",`$${run.totalGross.toLocaleString()}`],["Net",`$${run.totalNet.toLocaleString()}`],["Reimbursements",`$${(run.totalReimb||0).toLocaleString()}`],["Employees",run.employees]].map(([l,v])=>
          <div key={l} className="p-3 bg-bg rounded-lg text-center">
            <div className={`font-bold text-text ${mob?"text-base":"text-lg"}`}>{v}</div>
            <div className="text-xs text-text-3 mt-1 uppercase tracking-wide font-semibold" style={{fontSize:10.5}}>{l}</div>
          </div>)}
      </div>

      <div className="overflow-y-auto border border-line rounded-lg" style={{maxHeight:400}}>
        <table className="w-full border-collapse text-xs">
          <thead style={{position:"sticky",top:0,background:C.bg,zIndex:1}}><tr>
            {["Employee","Gross","Unpaid","CPP","EI","Fed","Prov","Reimb.","Net"].map(h=>
              <th key={h} className="py-2.5 px-2.5 text-left font-bold text-text-3 tracking-wide uppercase border-b border-line" style={{fontSize:10.5}}>{h}</th>)}
          </tr></thead>
          <tbody>{run.lines.map(l=>{const hb=l.hourlyBreakdown;
            return <tr key={l.employee} className="border-b border-line-soft">
            <td className="py-2.5 px-2.5 font-semibold text-text">{l.name}{l.payType==="hourly"&&<Tag sm tone="violet" style={{marginLeft:6}}>Hourly</Tag>}</td>
            <td className="py-2.5 px-2.5 text-text">${l.gross.toLocaleString()}
              {hb&&<div className="text-text-3 font-normal mt-0.5" style={{fontSize:10}} title="Regular / overtime / stat-holiday / night-differential hours this period">
                {hb.regularHours.toFixed(1)}h reg{hb.otHours>0&&` · ${hb.otHours.toFixed(1)}h OT`}{hb.statHours>0&&` · ${hb.statHours.toFixed(1)}h stat`}{hb.nightHours>0&&` · ${hb.nightHours.toFixed(1)}h night`}
              </div>}
            </td>
            <td className="py-2.5 px-2.5" style={{color:l.unpaidDeduction>0?C.red:C.text3}}>{l.unpaidDeduction>0?`-$${l.unpaidDeduction.toLocaleString()}`:"—"}</td>
            <td className="py-2.5 px-2.5 text-text-3">-${l.cpp.toLocaleString()}</td>
            <td className="py-2.5 px-2.5 text-text-3">-${l.ei.toLocaleString()}</td>
            <td className="py-2.5 px-2.5 text-text-3">-${l.fedTax.toLocaleString()}</td>
            <td className="py-2.5 px-2.5 text-text-3">-${l.provTax.toLocaleString()}</td>
            <td className="py-2.5 px-2.5" style={{color:l.reimb>0?C.ok:C.text3}}>{l.reimb>0?`+$${l.reimb.toLocaleString()}`:"—"}</td>
            <td className="py-2.5 px-2.5 text-brand font-bold">${l.net.toLocaleString()}</td>
          </tr>;})}</tbody>
        </table>
      </div>

      <div className="text-xs text-text-3 p-3 bg-bg rounded-lg leading-relaxed">
        <strong className="text-text-2">Status: {run.status}</strong> · Runs are draft when first created. Once approved, they can be executed (direct deposit initiated + expenses reconciled).
      </div>

      {reversing?<div className="flex flex-col gap-2.5 p-3 bg-red-bg rounded-lg border border-red-ln">
        <Field label="Reason for reversal" required hint="Recorded in the audit log. Reimbursed expenses go back to 'approved' status.">
          <Area rows={2} value={reverseReason} onChange={e=>setReverseReason(e.target.value)} placeholder="e.g. Executed against the wrong pay period"/></Field>
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" size="sm" onClick={()=>{setReversing(false);setReverseReason("");}}>Cancel</Btn>
          <Btn kind="danger" size="sm" disabled={!reverseReason.trim()} onClick={()=>{onReverse(reverseReason.trim());setReversing(false);setReverseReason("");}}>Confirm reversal</Btn>
        </div>
      </div>:<div className="flex gap-2.5 justify-end pt-2 border-t border-line">
        <Btn kind="outline" icon="download" onClick={exportRegister}>Export register</Btn>
        <Btn kind="ghost" onClick={onClose}>Close</Btn>
        {canApprove&&run.status==="draft"&&<Btn kind="primary" onClick={onApprove}>Approve run</Btn>}
        {canApprove&&run.status==="approved"&&<Btn kind="primary" icon="check" onClick={onExecute}>Execute payroll</Btn>}
        {canApprove&&run.status==="paid"&&<Btn kind="dangerSoft" onClick={()=>setReversing(true)}>Reverse run</Btn>}
      </div>}
    </div>
  </Modal>;
}


/* ─── Trainings ─── */
export function HrTrainings(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const list=A.trainings.filter(t=>t.status==="published");
  return <div>
    <Card pad={mob?20:24} style={{borderRadius:14,marginBottom:16,background:`linear-gradient(135deg,${C.tint} 0%,#F0F7FF 100%)`,border:`1px solid ${C.line2}`}}>
      <div className="flex gap-3.5 items-center flex-wrap">
        <div className="w-12 h-12 rounded-xl bg-brand text-white flex items-center justify-center shrink-0"><I n="cap" s={22}/></div>
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold text-text">Assign trainings to your team</div>
          <div className="text-xs text-text-2 mt-1">Track completion, issue certificates, and view team progress.</div>
        </div>
      </div>
    </Card>
    <div className="grid gap-3.5" style={{gridTemplateColumns:`repeat(auto-fill,minmax(${mob?260:300}px,1fr))`}}>
      {list.map(t=><TrainingCard key={t.id} t={t}/>)}
    </div>
  </div>;
}

/* ─── Badges & recognition ─── */
export function HrBadges(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const emp=A.hrCurrentEmp(); const company=A.hrCurrentCompany();
  const all=A.hrEmpsAtCompany(company.id).filter(e=>e.status==="active");
  const [sortBy,setSortBy]=useState("count");
  const mostRecentAward=e=>(e.badges||[]).reduce((max,b)=>Math.max(max,new Date(b.awardedAt||0).getTime()),0);
  const withBadges=all.filter(e=>(e.badges||[]).length>0).sort((a,b)=>
    sortBy==="recent"?mostRecentAward(b)-mostRecentAward(a):(b.badges||[]).length-(a.badges||[]).length);
  const recentAwards=all.flatMap(e=>(e.badges||[]).map(b=>({...b,emp:e}))).filter(b=>b.awardedAt)
    .sort((a,b)=>new Date(b.awardedAt)-new Date(a.awardedAt)).slice(0,8);
  const canAward=["owner","admin","hr"].includes(emp.role);
  const [showAward,setShowAward]=useState(false);
  const [selEmp,setSelEmp]=useState("");
  const [badgeName,setBadgeName]=useState("");
  const [removing,setRemoving]=useState(null); /* {emp,badge} */

  /* Popular badge presets so awarders don't type from scratch */
  const presets=["Top Performer","5 Years","10 Years","3 Years","Safety Champion","Peer Chosen","Rising Star","Team Player","Mentor","Perfect Attendance","Innovator","Above & Beyond","Client Favorite","Numbers Wizard","Apprentice Mentor"];
  const doAward=()=>{if(!selEmp||!badgeName.trim())return;
    A.awardBadge(selEmp,badgeName.trim()); setSelEmp(""); setBadgeName(""); setShowAward(false);};

  return <div>
    <Card pad={mob?20:26} style={{borderRadius:16,marginBottom:16,background:`linear-gradient(135deg,#FFF5EB 0%,#FFEDD9 100%)`,border:`1px solid ${C.warnLn}`}}>
      <div className="flex gap-3.5 items-center flex-wrap justify-between">
        <div className="flex gap-3.5 items-center" style={{flex:"1 1 240px"}}>
          <div className="w-13 h-13 rounded-2xl bg-warn text-white flex items-center justify-center shrink-0"><I n="award" s={26}/></div>
          <div>
            <div className="text-base font-bold text-text">Team recognition wall</div>
            <div className="text-sm text-text-2 mt-1">Every badge earned across the company · {withBadges.reduce((s,e)=>s+e.badges.length,0)} total</div>
          </div>
        </div>
        {canAward&&<Btn kind="primary" icon="plus" onClick={()=>setShowAward(true)} style={{background:C.warn,borderColor:C.warn}}>Award a badge</Btn>}
      </div>
    </Card>
    {recentAwards.length>0&&<Card pad={mob?18:20} style={{borderRadius:14,marginBottom:16}}>
      <Lbl>Recently awarded</Lbl>
      <div className="flex flex-col gap-1.5">
        {recentAwards.map((b,i)=><div key={i} className="flex justify-between items-center py-1.5 text-sm">
          <span className="text-text"><strong className="font-semibold">{b.name}</strong> · {b.emp.name}</span>
          <span className="text-xs text-text-3">{new Date(b.awardedAt).toLocaleDateString("en-CA",{month:"short",day:"numeric",year:"numeric"})}</span>
        </div>)}
      </div>
    </Card>}
    <div className="flex justify-end mb-3">
      <Sel value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{maxWidth:200}}>
        <option value="count">Sort: Most badges</option>
        <option value="recent">Sort: Most recent award</option>
      </Sel>
    </div>
    <div className={`grid gap-3 ${mob?"grid-cols-1":"grid-cols-2"}`}>
      {withBadges.map(e=><Card key={e.id} pad={16} style={{borderRadius:14}}>
        <div className="flex gap-3 items-center mb-3">
          <SmartPortrait seed={e.seed} size={44} radius={11}/>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-text">{e.name}</div>
            <div className="text-xs text-text-3 mt-0.5">{e.title}</div>
          </div>
          <span className="text-xs font-semibold text-text-3 py-1 px-2 bg-bg rounded-full">{e.badges.length}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[...e.badges].sort((a,b)=>new Date(b.awardedAt||0)-new Date(a.awardedAt||0)).map(b=>
            <div key={b.name} title={b.awardedAt?new Date(b.awardedAt).toLocaleDateString("en-CA"):undefined}
              className="inline-flex gap-1 items-center py-1 pr-2 pl-2.5 bg-warn-bg text-warn border border-warn-ln rounded-full text-xs font-semibold">
            <I n="award" s={11}/>{b.name}
            {canAward&&<button onClick={()=>setRemoving({emp:e,badge:b.name})} className="bg-transparent border-0 p-0 ml-1 cursor-pointer text-warn opacity-60 flex"><I n="x" s={11}/></button>}
          </div>)}
        </div>
      </Card>)}
      {withBadges.length===0&&<div style={{gridColumn:"1/-1"}}><Empty icon="award" title="No badges awarded yet" body={canAward?"Award the first badge to celebrate a teammate.":"Ask HR to start awarding badges."}/></div>}
    </div>

    {showAward&&<Modal onClose={()=>setShowAward(false)} title="Award a badge" wide>
      <div className="flex flex-col gap-3.5">
        <Field label="Give this badge to" required><Sel value={selEmp} onChange={e=>setSelEmp(e.target.value)}>
          <option value="">— Select an employee —</option>
          {all.map(e=><option key={e.id} value={e.id}>{e.name} — {e.title}</option>)}
        </Sel></Field>
        <Field label="Badge name" required hint="Short and specific — think 'Top Performer' or '5 Years'">
          <Input value={badgeName} onChange={e=>setBadgeName(e.target.value)} placeholder="e.g. Perfect Attendance"/>
        </Field>
        <div>
          <div className="text-xs font-bold text-text-3 tracking-wide uppercase mb-2">Quick pick</div>
          <div className="flex flex-wrap gap-1.5">
            {presets.map(p=><button key={p} onClick={()=>setBadgeName(p)} type="button"
              className={`py-1.5 px-3 rounded-full cursor-pointer text-xs font-semibold border ${badgeName===p?"text-white border-warn":"bg-white text-text-2 border-line"}`}
              style={badgeName===p?{background:C.warn}:undefined}>{p}</button>)}
          </div>
        </div>
        <Banner tone="brand" icon="info">
          {A.hrCompanySettings[company.id]?.privacy?.syncBadgesToNorthHire?"Badges appear on the employer's public NorthHire profile.":"Badges are internal-only. Enable public sync in HR Settings if you want them on NorthHire."}
        </Banner>
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>setShowAward(false)}>Cancel</Btn>
          <Btn kind="primary" icon="award" onClick={doAward} disabled={!selEmp||!badgeName.trim()} style={{background:C.warn,borderColor:C.warn}}>Award badge</Btn>
        </div>
      </div>
    </Modal>}

    <ConfirmDialog open={!!removing} onClose={()=>setRemoving(null)} confirmLabel="Remove badge"
      title="Remove this badge?" onConfirm={()=>A.removeBadge(removing.emp.id,removing.badge)}>
      {removing&&<>Remove "{removing.badge}" from {removing.emp.name}? This can't be undone.</>}
    </ConfirmDialog>
  </div>;
}

/* ─── Hiring: post job → link to existing NorthHire recruiting ─── */
export function HrHiring(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const company=A.hrCurrentCompany();
  const jobs=A.jobs.filter(j=>j.e===company.id);
  const apps=A.applications.filter(a=>jobs.some(j=>j.id===a.job));
  return <div>
    <div className={`grid gap-3 mb-4 ${mob?"grid-cols-2":"grid-cols-4"}`}>
      {[["Live listings",jobs.filter(j=>j.status==="live").length,C.brand],
        ["Applicants",apps.length,C.ok],
        ["Interviewing",apps.filter(a=>a.stage==="Interview").length,C.warn],
        ["Offers out",apps.filter(a=>a.stage==="Offer").length,C.violet]].map(([l,v,t])=>
        <Card key={l} pad={mob?14:18} style={{borderRadius:12}}>
          <div className={`font-bold tracking-tight ${mob?"text-xl":"text-2xl"}`} style={{color:t}}>{v}</div>
          <div className="text-xs text-text-3 mt-1">{l}</div>
        </Card>)}
    </div>
    <Card pad={mob?20:24} style={{borderRadius:16,textAlign:"center",background:`linear-gradient(135deg,${C.tint} 0%,#F0F7FF 100%)`,border:`1px solid ${C.line2}`}}>
      <div className="w-13 h-13 rounded-2xl bg-brand text-white flex items-center justify-center mx-auto mb-3.5"><I n="briefcase" s={26}/></div>
      <div className="text-lg font-semibold text-text mb-1.5">Integrated with NorthHire recruiting</div>
      <div className="text-sm text-text-2 leading-relaxed mx-auto mb-5 max-w-130">Post jobs, review candidates, and hire directly from your existing employer console. Hired candidates are automatically added to your HR Suite.</div>
      <div className="flex gap-2.5 justify-center flex-wrap">
        <Btn kind="primary" icon="plus" onClick={()=>A.go("empPost")}>Post a job</Btn>
        <Btn kind="outline" onClick={()=>A.go("empPipeline")}>Review candidates</Btn>
      </div>
    </Card>
  </div>;
}

/* ─── Reports ─── */
export function HrReports(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const company=A.hrCurrentCompany();
  const all=A.hrEmpsAtCompany(company.id).filter(e=>e.status==="active");
  const byDept={};
  A.HR_DEPARTMENTS.forEach(d=>{byDept[d.id]=all.filter(e=>e.dept===d.id).length;});
  const avgTenure=all.reduce((s,e)=>{const y=(Date.now()-new Date(e.hired).getTime())/(365.25*24*60*60*1000);return s+y;},0)/(all.length||1);
  const totalSalary=all.reduce((s,e)=>s+(e.salary||0),0);
  const avgSalary=totalSalary/(all.length||1);
  /* Turnover needs a real termination date to compute honestly - only employees terminated
     through removeEmployee (which now stamps terminatedAt) count; older/seed terminations
     without a stamp are excluded rather than guessed at. */
  const yearAgo=new Date(); yearAgo.setFullYear(yearAgo.getFullYear()-1);
  const terminatedLast12mo=A.hrEmpsAtCompany(company.id).filter(e=>e.status==="terminated"&&e.terminatedAt&&new Date(e.terminatedAt)>=yearAgo).length;
  const turnoverRate=all.length?(terminatedLast12mo/(all.length+terminatedLast12mo))*100:0;
  const exportReport=()=>{
    const rows=[["Metric","Value"],
      ["Headcount",all.length],["Avg tenure (years)",avgTenure.toFixed(1)],
      ["Total payroll",totalSalary],["Avg salary",Math.round(avgSalary)],
      ["Turnover, last 12mo (%)",turnoverRate.toFixed(1)],
      ...A.HR_DEPARTMENTS.map(d=>[`Headcount — ${d.name}`,byDept[d.id]||0])];
    const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv"}); const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download="hr-report.csv"; a.click(); URL.revokeObjectURL(url);
  };
  return <div>
    <div className="flex justify-end mb-3.5">
      <Btn kind="outline" size="sm" icon="download" onClick={exportReport}>Export CSV</Btn>
    </div>
    <div className={`grid gap-3 mb-4 ${mob?"grid-cols-2":"grid-cols-4"}`}>
      {[["Headcount",all.length,C.brand],
        ["Avg tenure",avgTenure.toFixed(1)+"y",C.ok],
        ["Total payroll",`$${(totalSalary/1000).toFixed(0)}k`,C.violet],
        ["Avg salary",`$${(avgSalary/1000).toFixed(0)}k`,C.warn],
        ["Turnover (12mo)",turnoverRate.toFixed(1)+"%",C.danger]].map(([l,v,t])=>
        <Card key={l} pad={mob?16:20} style={{borderRadius:14}}>
          <div className={`font-bold tracking-tight ${mob?"text-xl":"text-2xl"}`} style={{color:t}}>{v}</div>
          <div className="text-xs text-text-3 mt-1.5">{l}</div>
        </Card>)}
    </div>
    <div className={`grid gap-3.5 ${mob?"grid-cols-1":"grid-cols-2"}`}>
      <Card pad={mob?20:24} style={{borderRadius:14}}>
        <Lbl>Headcount by department</Lbl>
        {A.HR_DEPARTMENTS.map(d=>{const n=byDept[d.id]||0; const pct=all.length?(n/all.length)*100:0;
          return <div key={d.id} className="mb-3.5">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-text-2 font-medium">{d.name}</span>
              <span className="text-brand font-bold">{n}</span>
            </div>
            <div className="h-2 bg-bg rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-[width] duration-300" style={{width:`${pct}%`,background:d.color||C.brand}}/>
            </div>
          </div>;})}
      </Card>
      <Card pad={mob?20:24} style={{borderRadius:14}}>
        <Lbl>Salary bands</Lbl>
        {[[">$150k",all.filter(e=>e.salary>150000).length],["$100–150k",all.filter(e=>e.salary>=100000&&e.salary<=150000).length],["$75–100k",all.filter(e=>e.salary>=75000&&e.salary<100000).length],["$50–75k",all.filter(e=>e.salary>=50000&&e.salary<75000).length],["<$50k",all.filter(e=>e.salary<50000).length]].map(([l,n])=>{const pct=all.length?(n/all.length)*100:0;
          return <div key={l} className="mb-3.5">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-text-2 font-medium">{l}</span>
              <span className="text-brand font-bold">{n}</span>
            </div>
            <div className="h-2 bg-bg rounded-full overflow-hidden">
              <div className="h-full bg-brand rounded-full transition-[width] duration-300" style={{width:`${pct}%`}}/>
            </div>
          </div>;})}
      </Card>
    </div>
    {(()=>{
      const now=Date.now();
      const withCert=all.flatMap(e=>(e.certifications||[]).filter(c=>c.expires).map(c=>({...c,emp:e})));
      const expiringSoon=withCert.filter(c=>{const t=new Date(c.expires).getTime(); return t>=now&&t-now<=60*864e5;}).sort((a,b)=>new Date(a.expires)-new Date(b.expires));
      const expired=withCert.filter(c=>new Date(c.expires).getTime()<now);
      if(!expiringSoon.length&&!expired.length)return null;
      return <Card pad={mob?20:24} style={{borderRadius:14,marginTop:16}}>
        <Lbl>Certifications expiring soon</Lbl>
        <div className="flex flex-col gap-2">
          {[...expired.map(c=>({...c,status:"expired"})),...expiringSoon.map(c=>({...c,status:"soon"}))].map((c,i)=>
            <div key={i} className="flex justify-between items-center py-2.5 px-3 bg-bg rounded-xl">
              <div className="flex gap-2.5 items-center">
                <SmartPortrait seed={c.emp.seed} size={28} radius={7}/>
                <div><div className="text-sm font-semibold text-text">{c.emp.name}</div>
                  <div className="text-xs text-text-3">{c.name}</div></div></div>
              <Tag tone={c.status==="expired"?"danger":"warn"} sm>{c.status==="expired"?"Expired":"Expires"} {new Date(c.expires).toLocaleDateString("en-CA")}</Tag>
            </div>)}
        </div>
      </Card>;
    })()}
    <Card pad={mob?20:24} style={{borderRadius:14,marginTop:16}}>
      <Lbl>Audit log — salary, role, payroll &amp; badge changes</Lbl>
      {A.hrAuditLog.length===0?<Empty icon="shield" title="No audited changes yet" body="Salary changes, role changes, payroll runs, and badge grants/removals are recorded here as they happen."/>
      :<div className="overflow-x-auto"><table className="w-full border-collapse" style={{minWidth:480}}>
        <thead><tr className="border-b-2 border-line text-left">{["When","Actor","Detail"].map(h=><th key={h} className={TH_CLS}>{h}</th>)}</tr></thead>
        <tbody>{A.hrAuditLog.slice(0,50).map(e=><tr key={e.id} className="border-b border-line-soft">
          <td className="py-2.5 px-2.5 text-xs text-text-3 whitespace-nowrap">{new Date(e.at).toLocaleString("en-CA")}</td>
          <td className="py-2.5 px-2.5 text-xs text-text font-semibold whitespace-nowrap">{e.actorName}</td>
          <td className="py-2.5 px-2.5 text-sm text-text-2">{e.detail}</td>
        </tr>)}</tbody>
      </table></div>}
    </Card>
  </div>;
}

/* ─── Settings: module toggles, working hours, leave policies ─── */
/* Shared time clocks: the physical terminals that accept punches for this company. The pairing
   code is shown exactly once, at creation — the list endpoint never returns it, so a screen left
   open later can't hand someone a working terminal credential. Revoking a lost tablet is
   deleting its row, which takes effect on its very next punch. */
function _TimeClocks({A,mob}){
  const [devices,setDevices]=useState([]);
  const [name,setName]=useState(""); const [site,setSite]=useState("");
  const [issued,setIssued]=useState(null);   // {name, token} — shown once
  const [err,setErr]=useState(""); const [busy,setBusy]=useState(false);
  const [revoking,setRevoking]=useState(null);

  const load=()=>A.hrKioskDevices().then(setDevices).catch(()=>{});
  useEffect(()=>{load();},[]);

  const create=async()=>{
    setErr(""); setBusy(true);
    const r=await A.hrCreateKioskDevice(name.trim(),site.trim());
    setBusy(false);
    if(!r.ok){setErr(r.msg);return;}
    setIssued({name:name.trim(),token:r.token});
    setName(""); setSite(""); load();
  };

  return <Card pad={mob?20:26} style={{borderRadius:16,marginBottom:16}}>
    <Lbl>Time clocks</Lbl>
    <div className="text-sm text-text-2 mb-4 leading-relaxed">
      A shared tablet at the entrance that staff punch in and out on with a short PIN. Each terminal
      is paired once with its own code. This is what "allow remote punch-in = off" points people at.
    </div>

    {issued&&<Banner tone="ok" icon="check" style={{marginBottom:14}} title={`"${issued.name}" is ready — copy this code now`}>
      <div className="text-xs text-text-2 mb-2">
        Open <strong className="text-text">/hr/kiosk</strong> on that tablet and paste this code. It is shown once and can't be retrieved later.
      </div>
      <div className="flex gap-2 items-center flex-wrap">
        <code className="text-xs bg-white border border-line rounded-lg px-2.5 py-1.5 break-all flex-1 min-w-0">{issued.token}</code>
        <Btn kind="outline" size="sm" onClick={()=>{navigator.clipboard?.writeText(issued.token);}}>Copy</Btn>
        <Btn kind="ghost" size="sm" onClick={()=>setIssued(null)}>Done</Btn>
      </div>
    </Banner>}
    {err&&<Banner tone="danger" icon="alert" style={{marginBottom:14}}>{err}</Banner>}

    <div className={`grid gap-2.5 mb-3 ${mob?"grid-cols-1":"grid-cols-[1fr_1fr_auto]"}`}>
      <Field label="Terminal name"><Input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Front gate tablet"/></Field>
      <Field label="Site (optional)"><Input value={site} onChange={e=>setSite(e.target.value)} placeholder="e.g. Yard 2"/></Field>
      <div className="flex items-end"><Btn kind="primary" icon="plus" onClick={create} disabled={busy||!name.trim()}>{busy?"Creating…":"Add terminal"}</Btn></div>
    </div>

    {devices.length===0
      ? <div className="text-sm text-text-3 py-2">No terminals paired yet.</div>
      : <div className="flex flex-col gap-2">
          {devices.map(dv=>
            <div key={dv.id} className="flex justify-between items-center gap-3 border border-line rounded-xl py-2.5 px-3.5 flex-wrap">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-text">{dv.name}</div>
                <div className="text-xs text-text-3 mt-0.5">
                  {dv.site?`${dv.site} · `:""}{dv.lastSeen?`Last punch ${dv.lastSeen}`:"Never used"}</div>
              </div>
              <Btn kind="ghost" size="xs" onClick={()=>setRevoking(dv)}>Revoke</Btn>
            </div>)}
        </div>}

    <ConfirmDialog open={!!revoking} onClose={()=>setRevoking(null)} confirmLabel="Revoke terminal" danger
      title={`Revoke "${revoking?.name}"?`}
      onConfirm={async()=>{await A.hrRevokeKioskDevice(revoking.id);setRevoking(null);load();}}>
      That tablet stops accepting punches immediately. Attendance already recorded from it is kept.
    </ConfirmDialog>
  </Card>;
}

export function HrSettings(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const emp=A.hrCurrentEmp(); const company=A.hrCurrentCompany();
  const settings=A.hrCompanySettings[company.id]||HR_COMPANY_SETTINGS_DEFAULT;
  const [d,setD]=useState({...settings});
  useEffect(()=>setD({...settings}),[JSON.stringify(settings)]);
  const dirty=JSON.stringify(d)!==JSON.stringify(settings);
  const save=()=>A.updateCompanySettings(company.id,d);
  const setMod=(m,v)=>setD(p=>({...p,modules:{...p.modules,[m]:v}}));
  const setSection=(sec,k,v)=>setD(p=>({...p,[sec]:{...p[sec],[k]:v}}));

  return <div style={{maxWidth:900}}>
    {/* Approval-chain visualisation: shows what actions require which approvers, derived from
        the same routing the server enforces. Was implicit in code (leave/expense approvers,
        payroll executor, invoice-paid role) - reading this off route guards is what an admin
        actually wants to see, not a piece of documentation that could drift from the code. */}
    <Card pad={mob?20:26} style={{borderRadius:16,marginBottom:16}}>
      <Lbl>Approval chains</Lbl>
      <div className="text-sm text-text-3 mb-3.5">Who signs off on what. Reflects what the server actually enforces - not a settings surface, just a map.</div>
      <div className="flex flex-col gap-2">
        {[
          ["Leave request","The employee's direct manager, or any HR/Owner if no manager is set."],
          ["Expense claim","The employee's direct manager approves; Finance or HR/Owner marks it paid (a separate role, kept distinct from approval)."],
          ["Payroll execution","Owner, HR, or Finance can approve a run; Owner or Finance executes it."],
          ["Invoice paid","Owner, HR, or Finance marks an invoice paid. Reversal is Owner/Finance only, with a required reason."],
          ["Role change (demote Owner)","Cannot demote the last remaining Owner - blocked with a toast, not a silent no-op."],
          ["Offboarding","Owner or HR runs the checklist. Manager on the person's chain does not by itself have offboarding rights."],
          ["1:1 notes","Manager + report can log and read. HR/Owner can also read (for coaching and compliance). No other colleague can."],
        ].map(([action,rule])=>
          <div key={action} className="flex gap-3 items-start py-2.5 px-3 bg-bg rounded-lg">
            <div className="w-9 h-9 rounded-lg bg-brand-wash text-brand flex items-center justify-center shrink-0"><I n="shield" s={16}/></div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-text">{action}</div>
              <div className="text-xs text-text-2 mt-0.5 leading-relaxed">{rule}</div>
            </div>
          </div>)}
      </div>
    </Card>

    <Card pad={mob?20:26} style={{borderRadius:16,marginBottom:16}}>
      <Lbl>Module visibility</Lbl>
      <div className="text-sm text-text-3 mb-3.5">Turn off any module to hide it from every employee's sidebar.</div>
      <div className={`grid gap-0.5 ${mob?"grid-cols-1":"grid-cols-2"}`}>
        {Object.entries(d.modules).map(([k,v])=>
          <div key={k} className="flex justify-between items-center py-3 px-3 rounded-lg transition-colors duration-150 hover:bg-bg">
            <div className="text-sm text-text font-medium">{k==="directory"?"Directory":HR_MODULES.find(m=>m.module===k)?.label||k}</div>
            <Switch on={v} onChange={val=>setMod(k,val)}/>
          </div>)}
      </div>
    </Card>

    <Card pad={mob?20:26} style={{borderRadius:16,marginBottom:16}}>
      <Lbl>Working hours & attendance</Lbl>
      <div className={`grid gap-3 mb-3.5 ${mob?"grid-cols-1":"grid-cols-3"}`}>
        <Field label="Day starts"><Input type="time" value={d.attendance.workingHoursStart} onChange={e=>setSection("attendance","workingHoursStart",e.target.value)}/></Field>
        <Field label="Day ends"><Input type="time" value={d.attendance.workingHoursEnd} onChange={e=>setSection("attendance","workingHoursEnd",e.target.value)}/></Field>
        <Field label="Late threshold (min)"><Input type="number" value={d.attendance.lateThresholdMin} onChange={e=>setSection("attendance","lateThresholdMin",Number(e.target.value)||15)}/></Field>
      </div>
      <div className="flex justify-between items-center py-3 border-t border-line-soft">
        <div><div className="text-sm text-text font-semibold">Allow remote punch-in</div>
          <div className="text-xs text-text-3 mt-0.5">Employees can punch from the web, not just the office machine.</div></div>
        <Switch on={d.attendance.allowRemotePunch} onChange={v=>setSection("attendance","allowRemotePunch",v)}/>
      </div>
    </Card>

    <_TimeClocks A={A} mob={mob}/>

    <Card pad={mob?20:26} style={{borderRadius:16,marginBottom:16}}>
      <Lbl>Leave policy</Lbl>
      <div className={`grid gap-3 mb-3.5 ${mob?"grid-cols-1":"grid-cols-3"}`}>
        <Field label="Annual vacation (days)"><Input type="number" value={d.leave.annualVacationDays} onChange={e=>setSection("leave","annualVacationDays",Number(e.target.value)||15)}/></Field>
        <Field label="Sick days"><Input type="number" value={d.leave.sickDays} onChange={e=>setSection("leave","sickDays",Number(e.target.value)||10)}/></Field>
        <Field label="Personal days"><Input type="number" value={d.leave.personalDays} onChange={e=>setSection("leave","personalDays",Number(e.target.value)||3)}/></Field>
      </div>
      <Field label="Minimum advance notice (days)"><Input type="number" value={d.leave.advanceNoticeDays} onChange={e=>setSection("leave","advanceNoticeDays",Number(e.target.value)||14)}/></Field>

      <div className="mt-4 pt-4 border-t border-line-soft">
        <div className="text-sm font-semibold text-text mb-1">Year-end carryover</div>
        <div className="text-xs text-text-2 mb-3.5 leading-relaxed">
          What happens to unused vacation on 1 January. Several provinces don't permit simply
          discarding it, so choose deliberately rather than leaving it to chance.
        </div>
        <div className={`grid gap-3 ${mob?"grid-cols-1":"grid-cols-3"}`}>
          <Field label="Carryover policy">
            <Sel value={d.leave.carryoverMode||"capped"} onChange={e=>setSection("leave","carryoverMode",e.target.value)}>
              <option value="none">Use it or lose it</option>
              <option value="capped">Carry over up to a cap</option>
              <option value="unlimited">Carry over everything</option>
            </Sel></Field>
          {(d.leave.carryoverMode||"capped")==="capped"&&
            <Field label="Maximum days carried">
              <Input type="number" min="0" value={d.leave.carryoverMaxDays??5}
                onChange={e=>setSection("leave","carryoverMaxDays",Math.max(0,Number(e.target.value)||0))}/></Field>}
          {(d.leave.carryoverMode||"capped")!=="none"&&
            <Field label="Carried days expire after" hint="0 = they don't expire">
              <Sel value={d.leave.carryoverExpiryMonths??3} onChange={e=>setSection("leave","carryoverExpiryMonths",Number(e.target.value))}>
                <option value={0}>No expiry</option>
                <option value={3}>3 months (31 March)</option>
                <option value={6}>6 months (30 June)</option>
                <option value={12}>12 months</option>
              </Sel></Field>}
        </div>
      </div>
    </Card>

    <Card pad={mob?20:26} style={{borderRadius:16,marginBottom:16}}>
      <Lbl>Chat settings</Lbl>
      {[["allowDirectMessages","Allow direct messages","Employees can start 1:1 conversations."],
        ["allowGroupCreation","Allow group creation","Employees can create new group chats."],
        ["allowFileShare","Allow file sharing","Attach files in messages."],
        ["allowCalls","Allow voice & video calls","Show call buttons in chat."]].map(([k,l,s])=>
        <div key={k} className="flex justify-between items-center py-3 border-b border-line-soft">
          <div><div className="text-sm text-text font-semibold">{l}</div>
            <div className="text-xs text-text-3 mt-0.5">{s}</div></div>
          <Switch on={d.chat[k]} onChange={v=>setSection("chat",k,v)}/>
        </div>)}
    </Card>

    <Card pad={mob?20:26} style={{borderRadius:16,marginBottom:16,borderLeft:`4px solid ${C.brand}`}}>
      <Lbl>Data link between HR Suite & NorthHire</Lbl>
      <div className="text-sm text-text-2 mb-3.5 leading-relaxed">
        HR Suite runs your internal team. NorthHire is your public hiring surface. These toggles control what data flows between them. When linked, hiring on NorthHire auto-creates HR records; when unlinked, they're two separate systems.
      </div>
      {/* Master switch */}
      <div className="p-3.5 rounded-xl mb-3 transition-all duration-200" style={{background:d.privacy?.linkHrToNorthHire?C.okBg:C.bg,border:`1px solid ${d.privacy?.linkHrToNorthHire?C.okLn:C.line}`}}>
        <div className="flex justify-between items-center gap-2.5">
          <div className="flex-1">
            <div className="text-sm font-semibold text-text">Link HR Suite ↔ NorthHire</div>
            <div className="text-xs text-text-2 mt-1 leading-snug">Master switch. When off, HR Suite runs as a completely separate system with no connection to your NorthHire hiring pipeline.</div>
          </div>
          <Switch on={d.privacy?.linkHrToNorthHire??true} onChange={v=>setSection("privacy","linkHrToNorthHire",v)}/>
        </div>
      </div>
      {d.privacy?.linkHrToNorthHire!==false&&<>
        <div className="text-xs font-bold text-text-3 tracking-wide uppercase mt-3.5 mb-2">Public NorthHire profile shows</div>
        {[
          ["shareTitleToNorthHire","Current job title","Their HR-tracked title appears on their public NorthHire profile"],
          ["shareTenureToNorthHire","Years at company","'4 years at PCL' visible publicly"],
          ["shareDepartmentToNorthHire","Department","Department name shown publicly (usually private)"],
          ["syncSkillsToNorthHire","Skills","Skills tracked in HR sync to their public profile"],
          ["syncBadgesToNorthHire","Internal badges","Badges you award internally show on the employer's public NorthHire profile"],
        ].map(([k,label,desc])=><div key={k} className="flex justify-between items-center py-3 px-3 rounded-lg transition-colors duration-150 hover:bg-bg">
          <div className="flex-1 min-w-0">
            <div className="text-sm text-text font-medium">{label}</div>
            <div className="text-xs text-text-3 mt-0.5 leading-snug">{desc}</div>
          </div>
          <Switch on={d.privacy?.[k]??false} onChange={v=>setSection("privacy",k,v)}/>
        </div>)}
        <div className="text-xs font-bold text-text-3 tracking-wide uppercase mt-3.5 mb-2">Hiring flow</div>
        <div className="flex justify-between items-center py-3 px-3 rounded-lg transition-colors duration-150 hover:bg-bg">
          <div className="flex-1 min-w-0">
            <div className="text-sm text-text font-medium">Auto-prompt HR record on hire</div>
            <div className="text-xs text-text-3 mt-0.5 leading-snug">When someone is hired through your NorthHire job listings, prompt to create their HR Suite record (department, manager, salary)</div>
          </div>
          <Switch on={d.privacy?.allowNorthHireProfileImport??true} onChange={v=>setSection("privacy","allowNorthHireProfileImport",v)}/>
        </div>
        <div className="flex justify-between items-center py-3 px-3 rounded-lg transition-colors duration-150 hover:bg-bg">
          <div className="flex-1 min-w-0">
            <div className="text-sm text-text font-medium">Let employees opt out</div>
            <div className="text-xs text-text-3 mt-0.5 leading-snug">Employees can override company defaults for their own public profile</div>
          </div>
          <Switch on={d.privacy?.allowEmployeesToOptOut??true} onChange={v=>setSection("privacy","allowEmployeesToOptOut",v)}/>
        </div>
      </>}
    </Card>

    <div className="flex gap-2.5 justify-end sticky bottom-3.5 bg-bg py-3.5">
      {dirty&&<Btn kind="ghost" onClick={()=>setD({...settings})}>Discard</Btn>}
      <Btn kind="primary" icon="check" disabled={!dirty} onClick={save}>{dirty?"Save changes":"All saved"}</Btn>
    </div>
  </div>;
}

/* ─── Integrations: punch machines + prior HR systems ─── */
/* ─── Policies & sign-off: real click-wrap e-signature (typed full name + a required checkbox +
   timestamp, server-recorded - see db.js's hr_sign_documents/hr_signatures for the design note).
   Every active employee sees documents assigned to them and can sign; owner/admin/hr additionally
   see completion stats across the whole company and can publish new documents. */
export function HrPolicies(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const emp=A.hrCurrentEmp();
  const isPriv=emp.role==="owner"||emp.role==="admin"||emp.role==="hr";
  useEffect(()=>{A.loadSignDocuments();},[]);
  const [signing,setSigning]=useState(null); const [signedName,setSignedName]=useState(""); const [agreed,setAgreed]=useState(false);
  const [showNew,setShowNew]=useState(false); const [draft,setDraft]=useState({title:"",body:""});
  const [viewingSigs,setViewingSigs]=useState(null); const [sigList,setSigList]=useState([]);

  const startSign=(doc)=>{setSigning(doc);setSignedName(emp.name);setAgreed(false);};
  const submitSign=async()=>{
    const r=await A.signDocument(signing.id,signedName);
    if(r.ok){A.toast("Signed","ok");setSigning(null);}else A.toast(r.msg,"danger");
  };
  const publish=async()=>{
    if(!draft.title.trim()||!draft.body.trim())return;
    const r=await A.createSignDocument({title:draft.title,body:draft.body,requiredFor:["all"]});
    if(r.ok){A.toast("Published for sign-off","ok");setShowNew(false);setDraft({title:"",body:""});}else A.toast(r.msg,"danger");
  };
  const openSigs=async(doc)=>{setViewingSigs(doc);setSigList(await A.loadDocumentSignatures(doc.id));};

  const pending=A.hrSignDocs.filter(d=>!d.signed);
  const signed=A.hrSignDocs.filter(d=>d.signed);

  return <div>
    {pending.length>0&&<Banner tone="warn" icon="alert" style={{marginBottom:16}}>{pending.length} document{pending.length===1?"":"s"} need your signature.</Banner>}
    <div className="flex justify-between items-center mb-4">
      <div className="text-base font-semibold text-text">Documents for you to review and sign</div>
      {isPriv&&<Btn kind="primary" size="sm" icon="plus" onClick={()=>setShowNew(true)}>Publish a new policy</Btn>}
    </div>
    <div className="flex flex-col gap-2.5 mb-6">
      {pending.map(d=><Card key={d.id} pad={16} style={{borderRadius:12}}>
        <div className="flex justify-between items-center gap-3 flex-wrap">
          <div><div className="text-sm font-semibold text-text">{d.title}</div>
            <div className="text-xs text-text-3 mt-0.5">Published {new Date(d.createdAt).toLocaleDateString("en-CA")}</div></div>
          <Btn kind="primary" size="sm" onClick={()=>startSign(d)}>Review & sign</Btn>
        </div>
      </Card>)}
      {pending.length===0&&<div className="text-sm text-text-3">Nothing pending — you're all caught up.</div>}
    </div>

    {signed.length>0&&<>
      <div className="text-base font-semibold text-text mb-2.5">Already signed</div>
      <div className="flex flex-col gap-2 mb-6">
        {signed.map(d=><div key={d.id} className="flex justify-between items-center py-2.5 px-3.5 bg-bg rounded-lg">
          <div className="text-sm text-text">{d.title}</div><Tag tone="ok" sm icon="check">Signed</Tag></div>)}
      </div>
    </>}

    {isPriv&&A.hrSignDocsAll&&<>
      <div className="text-base font-semibold text-text mb-2.5 pt-4 border-t border-line-soft">Company-wide completion</div>
      <div className="flex flex-col gap-2">
        {A.hrSignDocsAll.map(d=><div key={d.id} className="flex justify-between items-center gap-3 py-2.5 px-3.5 bg-bg rounded-lg flex-wrap">
          <div className="min-w-0"><div className="text-sm font-semibold text-text">{d.title}</div>
            <div className="text-xs text-text-3 mt-0.5">{d.signedCount} of {d.targetCount} signed</div></div>
          <div className="flex gap-2">
            <Btn kind="ghost" size="xs" onClick={()=>openSigs(d)}>View signatures</Btn>
            <Btn kind="ghost" size="xs" icon="trash" onClick={async()=>{const r=await A.removeSignDocument(d.id);if(r.ok)A.toast("Removed","ok");}}/>
          </div>
        </div>)}
        {A.hrSignDocsAll.length===0&&<div className="text-sm text-text-3">No policies published yet.</div>}
      </div>
    </>}

    {signing&&<Modal onClose={()=>setSigning(null)} title={signing.title} wide>
      <div className="flex flex-col gap-3.5">
        <div className="p-4 bg-bg rounded-xl border border-line text-sm text-text-2 leading-relaxed whitespace-pre-wrap" style={{maxHeight:320,overflowY:"auto"}}>{signing.body}</div>
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)} style={{marginTop:3}}/>
          <span className="text-sm text-text-2">I have read and understood this document and agree to be bound by it.</span>
        </label>
        <Field label="Type your full legal name to sign" required><Input value={signedName} onChange={e=>setSignedName(e.target.value)}/></Field>
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>setSigning(null)}>Cancel</Btn>
          <Btn kind="primary" disabled={!agreed||signedName.trim().length<2} onClick={submitSign}>Sign document</Btn>
        </div>
      </div>
    </Modal>}

    {showNew&&<Modal onClose={()=>setShowNew(false)} title="Publish a new policy" wide>
      <div className="flex flex-col gap-3.5">
        <Field label="Title" required><Input value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} placeholder="e.g. Employee Handbook 2026"/></Field>
        <Field label="Document text" required><Area rows={10} value={draft.body} onChange={e=>setDraft({...draft,body:e.target.value})} placeholder="Paste the full policy text employees will read before signing…"/></Field>
        <div className="text-xs text-text-3">Sent to every active employee for sign-off.</div>
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>setShowNew(false)}>Cancel</Btn>
          <Btn kind="primary" disabled={!draft.title.trim()||!draft.body.trim()} onClick={publish}>Publish</Btn>
        </div>
      </div>
    </Modal>}

    {viewingSigs&&<Modal onClose={()=>setViewingSigs(null)} title={`Signatures — ${viewingSigs.title}`}>
      <div className="flex flex-col gap-2">
        {sigList.map(s=>{const e=A.hrEmp(s.employee);return <div key={s.id} className="flex justify-between items-center py-2 px-3 bg-bg rounded-lg">
          <div className="text-sm text-text">{e?.name||s.signedName}</div>
          <div className="text-xs text-text-3">{new Date(s.signedAt).toLocaleString("en-CA")}</div></div>;})}
        {sigList.length===0&&<div className="text-sm text-text-3">No one has signed yet.</div>}
      </div>
    </Modal>}
  </div>;
}

/* ─── Shift roster: real forward-looking scheduling, distinct from attendance (after-the-fact
   clock records with no plan behind them). Week-at-a-time list view grouped by date - a real
   calendar grid would be its own larger UI investment, this covers the actual gap (planning who
   works when) without over-building the presentation layer. ─── */
function weekBounds(anchor){
  const d=new Date(anchor); const day=d.getDay(); const monday=new Date(d); monday.setDate(d.getDate()-((day+6)%7));
  const sunday=new Date(monday); sunday.setDate(monday.getDate()+6);
  return {from:_fmtDate(monday),to:_fmtDate(sunday),monday};
}
export function HrRoster(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const emp=A.hrCurrentEmp(); const company=A.hrCurrentCompany();
  const isPriv=emp.role==="owner"||emp.role==="admin"||emp.role==="hr";
  const [anchor,setAnchor]=useState(new Date());
  const {from,to}=weekBounds(anchor);
  useEffect(()=>{A.loadShifts(from,to);},[from,to]);
  const [showAdd,setShowAdd]=useState(false);
  const [ns,setNs]=useState({employeeId:emp.id,date:from,startTime:"09:00",endTime:"17:00",role:"",site:"",notes:""});
  const days=Array.from({length:7},(_,i)=>{const d=new Date(from); d.setDate(d.getDate()+i); return _fmtDate(d);});
  const byDate=d=>A.hrShifts.filter(s=>s.date===d).sort((a,b)=>a.startTime.localeCompare(b.startTime));
  const submit=async()=>{
    if(!ns.date||!ns.startTime||!ns.endTime)return;
    const r=await A.addShift(ns);
    if(r.ok){A.toast("Shift added","ok");setShowAdd(false);setNs({employeeId:emp.id,date:from,startTime:"09:00",endTime:"17:00",role:"",site:"",notes:""});}
    else A.toast(r.msg,"danger");
  };
  return <div>
    <div className="flex justify-between items-center mb-4 flex-wrap gap-2.5">
      <div className="flex items-center gap-2">
        <Btn kind="ghost" size="sm" icon="chevL" onClick={()=>setAnchor(a=>{const d=new Date(a);d.setDate(d.getDate()-7);return d;})}/>
        <div className="text-sm font-semibold text-text">{from} → {to}</div>
        <Btn kind="ghost" size="sm" icon="chevR" onClick={()=>setAnchor(a=>{const d=new Date(a);d.setDate(d.getDate()+7);return d;})}/>
        <Btn kind="ghost" size="xs" onClick={()=>setAnchor(new Date())}>This week</Btn>
      </div>
      {isPriv&&<Btn kind="primary" size="sm" icon="plus" onClick={()=>{setNs({employeeId:emp.id,date:from,startTime:"09:00",endTime:"17:00",role:"",site:"",notes:""});setShowAdd(true);}}>Add shift</Btn>}
    </div>
    <div className="flex flex-col gap-3">
      {days.map(d=>{const shifts=byDate(d);
        return <Card key={d} pad={mob?14:18} style={{borderRadius:14}}>
          <div className="text-sm font-bold text-text mb-2.5">{new Date(d+"T00:00").toLocaleDateString("en-CA",{weekday:"long",month:"short",day:"numeric"})}</div>
          {shifts.length===0?<div className="text-xs text-text-3">No shifts scheduled.</div>
            :<div className="flex flex-col gap-1.5">
              {shifts.map(s=>{const se=A.hrEmp(s.employee);
                return <div key={s.id} className="flex justify-between items-center gap-2 py-2 px-3 bg-bg rounded-lg flex-wrap">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <SmartPortrait seed={se?.seed||0} size={26} radius={7}/>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-text overflow-hidden text-ellipsis whitespace-nowrap">{se?.name||"—"}</div>
                      <div className="text-xs text-text-3">{s.startTime}–{s.endTime}{s.role?` · ${s.role}`:""}{s.site?` · ${s.site}`:""}</div>
                    </div>
                  </div>
                  {isPriv&&<Btn kind="ghost" size="xs" icon="trash" onClick={()=>A.removeShift(s.id)}/>}
                </div>;})}
            </div>}
        </Card>;})}
    </div>
    {showAdd&&<Modal onClose={()=>setShowAdd(false)} title="Add a shift">
      <div className="flex flex-col gap-3.5">
        <Field label="Employee" required><Sel value={ns.employeeId} onChange={e=>setNs({...ns,employeeId:e.target.value})}>
          {A.hrEmpsAtCompany(company.id).filter(e=>e.status==="active").map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</Sel></Field>
        <div className={`grid gap-3 ${mob?"grid-cols-1":"grid-cols-3"}`}>
          <Field label="Date" required><Input type="date" value={ns.date} onChange={e=>setNs({...ns,date:e.target.value})}/></Field>
          <Field label="Start" required><Input type="time" value={ns.startTime} onChange={e=>setNs({...ns,startTime:e.target.value})}/></Field>
          <Field label="End" required><Input type="time" value={ns.endTime} onChange={e=>setNs({...ns,endTime:e.target.value})}/></Field>
        </div>
        <div className={`grid gap-3 ${mob?"grid-cols-1":"grid-cols-2"}`}>
          <Field label="Role/position"><Input value={ns.role} onChange={e=>setNs({...ns,role:e.target.value})} placeholder="e.g. Front desk"/></Field>
          <Field label="Site/location"><Input value={ns.site} onChange={e=>setNs({...ns,site:e.target.value})} placeholder="e.g. Main office"/></Field>
        </div>
        <Field label="Notes"><Area rows={2} value={ns.notes} onChange={e=>setNs({...ns,notes:e.target.value})}/></Field>
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>setShowAdd(false)}>Cancel</Btn>
          <Btn kind="primary" onClick={submit}>Add shift</Btn>
        </div>
      </div>
    </Modal>}
  </div>;
}

export function HrIntegrations(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const company=A.hrCurrentCompany();
  const settings=A.hrCompanySettings[company.id]||HR_COMPANY_SETTINGS_DEFAULT;
  const [showPunch,setShowPunch]=useState(false);
  const [showImport,setShowImport]=useState(false);

  return <div>
    <div className={`grid gap-3.5 ${mob?"grid-cols-1":"grid-cols-2"}`}>

      <Card pad={mob?20:26} style={{borderRadius:16}}>
        <div className="flex gap-3 items-start mb-4">
          <div className="w-11 h-11 rounded-xl bg-wash text-brand flex items-center justify-center shrink-0"><I n="clock" s={22}/></div>
          <div className="flex-1 min-w-0">
            <div className="text-base font-semibold text-text">Punch machine</div>
            <div className="text-xs text-text-3 mt-1">Sync with on-site clocks or biometric readers.</div>
          </div>
          <Tag tone={settings.integrations.punchMachine.connected?"ok":"neutral"} sm>{settings.integrations.punchMachine.connected?"Connected":"Not connected"}</Tag>
        </div>
        {settings.integrations.punchMachine.connected
          ? <div>
              <div className="p-3 bg-ok-bg rounded-lg border border-ok-ln mb-3">
                <div className="text-sm font-semibold text-text">{settings.integrations.punchMachine.vendor}</div>
                <div className="text-xs text-text-2 mt-1">Last sync: {new Date(settings.integrations.punchMachine.lastSync).toLocaleString("en-CA")}</div>
              </div>
              <Btn kind="outline" size="sm" full onClick={()=>setShowPunch(true)}>Reconfigure</Btn>
            </div>
          : <Btn kind="primary" size="sm" full icon="plus" onClick={()=>setShowPunch(true)}>Connect a device</Btn>}
      </Card>

      <Card pad={mob?20:26} style={{borderRadius:16}}>
        <div className="flex gap-3 items-start mb-4">
          <div className="w-11 h-11 rounded-xl bg-violet-bg text-violet flex items-center justify-center shrink-0"><I n="refresh" s={22}/></div>
          <div className="flex-1 min-w-0">
            <div className="text-base font-semibold text-text">Import from existing HR system</div>
            <div className="text-xs text-text-3 mt-1">Bring in employees, history and payroll from your current HRIS.</div>
          </div>
          <Tag tone={settings.integrations.priorHRSystem.connected?"ok":"neutral"} sm>{settings.integrations.priorHRSystem.connected?"Imported":"Not connected"}</Tag>
        </div>
        {settings.integrations.priorHRSystem.connected
          ? <div>
              <div className="p-3 bg-ok-bg rounded-lg border border-ok-ln mb-3">
                <div className="text-sm font-semibold text-text">{settings.integrations.priorHRSystem.vendor}</div>
                <div className="text-xs text-text-2 mt-1">Last import: {new Date(settings.integrations.priorHRSystem.lastImport).toLocaleString("en-CA")}</div>
              </div>
              <Btn kind="outline" size="sm" full onClick={()=>setShowImport(true)}>Import again</Btn>
            </div>
          : <Btn kind="primary" size="sm" full icon="upload" onClick={()=>setShowImport(true)}>Start import</Btn>}
      </Card>
    </div>

    {showPunch&&<Modal onClose={()=>setShowPunch(false)} title="Connect a punch machine">
      <div className="flex flex-col gap-3.5">
        <Banner tone="warn" icon="info" title="Demo simulation">This preview build doesn't talk to real hardware — selecting a vendor below just marks the integration as connected in your settings, with no live device sync.</Banner>
        <div className="flex flex-col gap-2">
          {A.PUNCH_VENDORS.map(v=><button key={v.id} onClick={()=>{A.connectPunchMachine(company.id,v.name); setShowPunch(false);}}
            className="flex gap-3 items-center py-3.5 px-4 bg-white border border-line rounded-xl cursor-pointer text-left transition-all duration-150 hover:border-brand hover:bg-tint">
            <div className="w-9 h-9 rounded-lg bg-wash text-brand flex items-center justify-center shrink-0"><I n={v.kind==="cloud"?"globe":"clock"} s={18}/></div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-text">{v.name}</div>
              <div className="text-xs text-text-3 mt-0.5">{v.kind==="cloud"?"Cloud sync via API":"On-site device"}</div>
            </div>
            <I n="chevR" s={16} c={C.text3}/>
          </button>)}
        </div>
      </div>
    </Modal>}

    {showImport&&<Modal onClose={()=>setShowImport(false)} title="Import from your HR system">
      <div className="flex flex-col gap-3.5">
        <Banner tone="warn" icon="upload" title="Demo simulation">This preview build doesn't run a real migration — selecting a system below just marks the integration as connected in your settings. No employees, salaries, or history are actually imported.</Banner>
        <div className="flex flex-col gap-2">
          {A.PRIOR_HR_VENDORS.map(v=><button key={v.id} onClick={()=>{A.connectPriorSystem(company.id,v.name); setShowImport(false); A.toast(`Marked as connected to ${v.name} (simulated — no data was actually imported)`,"ok");}}
            className="flex gap-3 items-center py-3.5 px-4 bg-white border border-line rounded-xl cursor-pointer text-left transition-all duration-150 hover:border-brand hover:bg-tint">
            <div className="w-9 h-9 rounded-lg bg-violet-bg text-violet flex items-center justify-center shrink-0"><I n="refresh" s={18}/></div>
            <div className="text-sm font-semibold text-text flex-1">{v.name}</div>
            <I n="chevR" s={16} c={C.text3}/>
          </button>)}
        </div>
      </div>
    </Modal>}
  </div>;
}
