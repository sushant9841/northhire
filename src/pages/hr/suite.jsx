import { useState, useEffect } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C, SH } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import {
  Btn, Card, Tag, Field, Input, Sel, Area, CheckRow, Banner, Lbl, Modal, Switch, DatePicker,
  SmartPortrait, Empty, ConfirmDialog, usePagination, Pagination, TH_CLASS as TH_CLS, TD_CLASS as TD_CLS,
} from "../../design/primitives.jsx";
import { _fmtDate } from "../../helpers/utils.js";
import { invoiceTone } from "../../helpers/statusTone.js";
import { salesTaxRate, salesTaxLabel } from "../../helpers/salesTax.js";
import { HR_ROLES, HR_COMPANY_SETTINGS_DEFAULT, PUNCH_VENDORS, PRIOR_HR_VENDORS, HR_MODULES } from "../../store/seed/hrCompanySettings.js";
import { HR_DEPARTMENTS } from "../../store/seed/hrDepartments.js";
import { InlineList } from "../shared/formControls.jsx";
import { TrainingCard } from "../shared/cards.jsx";

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
  const A=use(); const mob=useMedia("(max-width: 900px)");
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

  return <div className="min-h-screen flex flex-col text-white" style={{background:`linear-gradient(135deg,#0A1929 0%,${C.ink} 60%,#152538 100%)`}}>
    <div className={`flex items-center justify-between ${mob?"py-6 px-5":"py-8 px-10"}`}>
      <button onClick={()=>A.go("home")} className="flex items-center gap-2.5 bg-transparent border-0 text-white cursor-pointer">
        <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center"><I n="sparkle" s={18} c="#fff"/></div>
        <span className="font-bold tracking-tight" style={{fontSize:16.5}}>NorthHire <span className="text-accent font-semibold">HR Suite</span></span>
      </button>
      <button onClick={()=>A.go("home")} className="bg-transparent border border-white/20 text-white py-1.5 px-3.5 rounded-lg cursor-pointer text-sm font-semibold">← Back to NorthHire</button>
    </div>
    <div className={`flex-1 flex items-center justify-center ${mob?"pt-3 px-5 pb-8":"pt-5 px-10 pb-15"}`}>
      <div className={`w-full grid items-center ${mob?"grid-cols-1 gap-6":"gap-11"}`} style={{maxWidth:mob?420:960,gridTemplateColumns:mob?undefined:"1.05fr .95fr"}}>
        {!mob&&<div>
          <div className="text-sm font-bold text-accent tracking-wide uppercase mb-4">Enterprise HR Suite</div>
          <h1 className="text-5xl font-bold tracking-tight mb-4 leading-tight">
            Your entire workforce.<br/>One place.</h1>
          <p className="text-base text-white/65 leading-relaxed mb-6 max-w-100">
            Directory, attendance, leave, tasks, chat, calendar, invoices, payroll — every employee record synced with their public NorthHire profile.</p>
          <div className="flex flex-col gap-3 text-sm text-white/75">
            {[["shield","Role-based access — Owner, Admin, HR, Finance, Employee"],
              ["users","Directory synced with public NorthHire profiles"],
              ["calendar","Attendance, leave, calendar & tasks in one flow"],
              ["mail","Internal chat with 1:1 and group threads"]].map(([ic,txt])=>
              <div key={txt} className="flex gap-2.5 items-center">
                <span className="text-accent flex"><I n={ic} s={17}/></span>{txt}</div>)}
          </div>
        </div>}
        <div className={`bg-white rounded-3xl text-text ${mob?"p-6":"p-9"}`} style={{boxShadow:"0 40px 80px -20px rgba(0,0,0,.5)"}}>
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight mb-2">Sign in to HR Suite</h2>
            <p className="text-sm text-text-2 m-0">Your Enterprise workforce login.</p></div>
          <div className="flex flex-col gap-3.5">
            <Field label="Company"><Input icon="building" value={company} onChange={e=>{setCompany(e.target.value);setErr("");}}
              placeholder="e.g. PCL Construction" onKeyDown={e=>e.key==="Enter"&&submit()}/></Field>
            <Field label="Login ID" hint="Your work email or the part before @ (e.g. sofia.r).">
              <Input icon="user" value={loginId} onChange={e=>{setLoginId(e.target.value);setErr("");}} placeholder="jean.dupuis"
                onKeyDown={e=>e.key==="Enter"&&submit()}/></Field>
            <Field label="Password"><Input icon="lock" type="password" value={pw} onChange={e=>{setPw(e.target.value);setErr("");}}
              placeholder="Your password" onKeyDown={e=>e.key==="Enter"&&submit()}/></Field>
            {err&&<Banner tone="danger" icon="alert" title="Sign-in failed">{err}</Banner>}
            <Btn kind="primary" size="lg" full iconR="arrowR" onClick={submit} disabled={busy}>{busy?"Signing in…":"Enter HR Suite"}</Btn>
          </div>
          <div className="mt-4 p-3.5 bg-tint rounded-xl border border-line-2">
            <div className="text-xs font-bold text-brand tracking-wide uppercase mb-2">Demo accounts — PCL Construction</div>
            <div className="grid gap-1.5">
              {[["rachel.martel","Owner"],["priya.r","Admin"],["linda.o","HR"],["isaac.c","Finance"],["daniel.k","Employee"]].map(([id,r])=>
                <button key={id} onClick={()=>demoAs(id)} className="flex justify-between items-center bg-white border border-line rounded-lg py-2 px-3 cursor-pointer">
                  <span className="text-xs font-semibold text-text">{id}</span>
                  <span className="text-xs font-semibold text-brand">{r} →</span></button>)}
              <div className="text-xs text-text-3 mt-1.5 text-center">Password for all demo accounts: <strong className="text-text">pcl2026</strong></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>;
}

/* ═════════════ HR Shell — sidebar + top bar + main slot ═════════════ */


/* Placeholder for each HR module — Round C/D will replace with real content */
function _HrPlaceholder({title,body,icon="sparkle"}){
  return <Card pad={40} style={{borderRadius:20,textAlign:"center",maxWidth:600,margin:"0 auto"}}>
    <div className="w-16 h-16 rounded-2xl bg-wash text-brand flex items-center justify-center mx-auto mb-5">
      <I n={icon} s={32}/></div>
    <h2 className="text-2xl font-bold tracking-tight text-text mb-2.5">{title}</h2>
    <p className="text-sm text-text-2 leading-relaxed m-0">{body}</p>
  </Card>;
}

/* ═════ Dashboard — real content for Round B; each module gets its own function ═════ */

export function HrDashboard(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
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
      {label:"Employees",value:teamSize,icon:"users"},
      {label:"Pending leave",value:pendingLeave.length,icon:"calendar",tone:pendingLeave.length?C.warn:C.text},
      {label:"Open invoices",value:openInvoices.length,icon:"wallet",tone:overdueInvoices.length?C.danger:C.text},
      {label:"Open tasks (co.)",value:A.hrTasks.filter(t=>t.status!=="done").length,icon:"check"}];
    if(emp.role==="hr")return [
      {label:"Employees",value:teamSize,icon:"users"},
      {label:"Pending leave",value:pendingLeave.length,icon:"calendar",tone:pendingLeave.length?C.warn:C.text},
      {label:"Trainings this week",value:A.hrEvents.filter(e=>e.type==="training").length,icon:"cap"},
      {label:"My tasks",value:myTasks.length,icon:"check"}];
    if(emp.role==="finance")return [
      {label:"Open invoices",value:openInvoices.length,icon:"wallet",tone:overdueInvoices.length?C.danger:C.text},
      {label:"Overdue",value:overdueInvoices.length,icon:"alert",tone:overdueInvoices.length?C.danger:C.text},
      {label:"Next payroll",value:A.hrPayruns.find(p=>p.status==="scheduled")?.period||"—",icon:"wallet"},
      {label:"My tasks",value:myTasks.length,icon:"check"}];
    return [
      {label:"My tasks",value:myTasks.length,icon:"check"},
      {label:"Today's status",value:todayAttendance?(todayAttendance.clockOut?"Signed out":"Working"):"Not clocked in",icon:"clock",tone:todayAttendance?C.ok:C.text3},
      {label:"Leave balance",value:settings.leave.annualVacationDays-myLeave.filter(l=>l.status==="approved"&&l.type==="Vacation").reduce((s,l)=>s+l.days,0),icon:"calendar"},
      {label:"Badges",value:emp.badges.length,icon:"award"}];
  })();

  return <div>
    <div className="mb-6">
      <div className={`font-bold text-text tracking-tight ${mob?"text-2xl":"text-3xl"}`}>Welcome back, {emp.name.split(" ")[0]}.</div>
      <div className="text-sm text-text-2 mt-1.5">
        {new Date().toLocaleDateString("en-CA",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}
        {dept&&<> • {dept.name}</>}</div>
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
            <Lbl style={{margin:0}}>Attendance today</Lbl>
            <Tag tone={todayAttendance?"ok":"neutral"} sm>{todayAttendance?(todayAttendance.clockOut?"Signed out":"On the clock"):"Not clocked in"}</Tag>
          </div>
          {!todayAttendance?<div>
            <p className="text-sm text-text-2 mb-3.5 leading-relaxed">Start your day by punching in.</p>
            <Btn kind="primary" icon="clock" onClick={async()=>{const r=await A.punchIn(emp.id,"web"); if(!r.ok)A.toast(r.msg,"danger");}}>Punch in</Btn>
          </div>:!todayAttendance.clockOut?<div>
            <div className="text-base text-text mb-2">Punched in at <strong>{todayAttendance.clockIn}</strong></div>
            <p className="text-sm text-text-2 mb-3.5">Have a great day. Punch out when you're wrapping up.</p>
            <Btn kind="outline" icon="clock" onClick={async()=>{const r=await A.punchOut(emp.id); if(!r.ok)A.toast(r.msg,"danger");}}>Punch out</Btn>
          </div>:<div>
            <div className="text-sm text-text">In: <strong>{todayAttendance.clockIn}</strong> · Out: <strong>{todayAttendance.clockOut}</strong> · Total: <strong className="text-brand">{todayAttendance.hours}h</strong></div>
            <p className="text-sm text-text-2 mt-2">Good work today. See you tomorrow.</p></div>}
        </Card>

        <Card pad={mob?20:26} style={{borderRadius:20}}>
          <div className="flex justify-between items-center mb-3.5">
            <Lbl style={{margin:0}}>My tasks</Lbl>
            <Btn kind="ghost" size="sm" onClick={()=>A.go("hrTasks")}>View all</Btn>
          </div>
          {myTasks.length===0?<div className="py-4 text-text-3 text-sm">No open tasks — nicely done.</div>
            :<div className="flex flex-col gap-2">
              {myTasks.slice(0,5).map(t=><div key={t.id} className="flex gap-3 items-center py-3 px-3.5 bg-bg rounded-lg border border-line">
                <input type="checkbox" checked={t.status==="done"} onChange={()=>A.updateTaskStatus(t.id,t.status==="done"?"todo":"done")} className="w-5 h-5 cursor-pointer shrink-0"/>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-text">{t.title}</div>
                  <div className="text-xs text-text-3 mt-0.5">Due {t.due}</div></div>
                <Tag tone={t.priority==="high"?"danger":t.priority==="medium"?"warn":"neutral"} sm>{t.priority}</Tag>
              </div>)}</div>}
        </Card>
      </div>

      <div>
        <Card pad={mob?20:24} style={{borderRadius:20,marginBottom:16}}>
          <div className="flex justify-between items-center mb-3">
            <Lbl style={{margin:0}}>Upcoming events</Lbl>
            <Btn kind="ghost" size="sm" onClick={()=>A.go("hrCalendar")}>Calendar</Btn>
          </div>
          {upcomingEvents.length===0?<div className="py-3 text-text-3 text-sm">Nothing coming up.</div>
            :<div className="flex flex-col gap-2">
              {upcomingEvents.map(ev=><div key={ev.id} className="py-2.5 px-3 bg-bg rounded-lg border border-line">
                <div className="text-sm font-semibold text-text">{ev.title}</div>
                <div className="text-xs text-text-3 mt-0.5">{new Date(ev.when).toLocaleDateString("en-CA",{weekday:"short",month:"short",day:"numeric"})} • {ev.time}</div>
              </div>)}</div>}
        </Card>

        {(emp.role==="hr"||emp.role==="admin"||emp.role==="owner")&&<Card pad={mob?20:24} style={{borderRadius:20,marginBottom:16}}>
          <div className="flex justify-between items-center mb-3">
            <Lbl style={{margin:0}}>Pending leave requests</Lbl>
            <Btn kind="ghost" size="sm" onClick={()=>A.go("hrLeave")}>Review</Btn>
          </div>
          {pendingLeave.length===0?<div className="py-3 text-text-3 text-sm">Nothing to review.</div>
            :<div className="flex flex-col gap-2">
              {pendingLeave.slice(0,3).map(r=>{const who=A.hrEmp(r.employee);
                return <div key={r.id} className="py-2.5 px-3 bg-bg rounded-lg border border-line">
                  <div className="text-sm font-semibold text-text">{who?.name}</div>
                  <div className="text-xs text-text-3 mt-0.5">{r.type} • {r.from} → {r.to} ({r.days}d)</div>
                </div>;})}</div>}
        </Card>}

        <Card pad={mob?20:24} style={{borderRadius:20}}>
          <Lbl>Quick actions</Lbl>
          <div className="flex flex-col gap-2">
            <Btn kind="outline" size="sm" full icon="calendar" onClick={()=>A.go("hrLeave")}>Request leave</Btn>
            <Btn kind="outline" size="sm" full icon="mail" onClick={()=>A.go("hrChat")}>Open chat</Btn>
            <Btn kind="outline" size="sm" full icon="user" onClick={()=>A.go("hrProfile")}>Edit my profile</Btn>
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

/* ─── Directory: search, filter, view employees ─── */
function HrDirectory(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const emp=A.hrCurrentEmp(); const company=A.hrCurrentCompany();
  const [q,setQ]=useState(""); const [dept,setDept]=useState("all"); const [role,setRole]=useState("all"); const [view,setView]=useState("grid");
  const all=A.hrEmpsAtCompany(company.id).filter(e=>e.status==="active");
  const filtered=all.filter(e=>{
    if(dept!=="all"&&e.dept!==dept)return false;
    if(role!=="all"&&e.role!==role)return false;
    if(q&&!(e.name.toLowerCase().includes(q.toLowerCase())||e.title.toLowerCase().includes(q.toLowerCase())||e.email.toLowerCase().includes(q.toLowerCase())))return false;
    return true;
  });
  const [selected,setSelected]=useState(null);
  const selectedEmp=selected?A.hrEmp(selected):null;
  return <div>
    <Card pad={mob?16:20} style={{marginBottom:16,borderRadius:14}}>
      <div className="flex gap-2.5 flex-wrap items-center">
        <div className="grow shrink basis-60 min-w-0">
          <Input icon="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by name, title, or email"/></div>
        <Sel value={dept} onChange={e=>setDept(e.target.value)} style={{maxWidth:200}}>
          <option value="all">All departments</option>
          {A.HR_DEPARTMENTS.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</Sel>
        <Sel value={role} onChange={e=>setRole(e.target.value)} style={{maxWidth:160}}>
          <option value="all">All roles</option>
          {A.HR_ROLES.map(r=><option key={r.k} value={r.k}>{r.label}</option>)}</Sel>
        <div className="flex bg-bg rounded-lg p-1 border border-line">
          {[["grid","layout"],["list","file"]].map(([v,ic])=><button key={v} onClick={()=>setView(v)}
            className={`border-0 py-2 px-2.5 rounded-md cursor-pointer flex ${view===v?"bg-white text-brand shadow-sm":"bg-transparent text-text-3"}`}><I n={ic} s={15}/></button>)}
        </div>
      </div>
      <div className="text-xs text-text-3 mt-3">{filtered.length} of {all.length} employees</div>
    </Card>

    {view==="grid"?
      <div className="grid gap-3" style={{gridTemplateColumns:`repeat(auto-fill,minmax(${mob?260:280}px,1fr))`}}>
        {filtered.map(e=>{const d=A.HR_DEPARTMENTS.find(x=>x.id===e.dept);
          return <div key={e.id} data-card onClick={()=>setSelected(e.id)} className="bg-white border border-line rounded-2xl p-5 cursor-pointer">
            <div className="flex gap-3 mb-3">
              <SmartPortrait seed={e.seed} size={48} radius={12}/>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-text overflow-hidden text-ellipsis whitespace-nowrap" style={{fontSize:14.5}}>{e.name}</div>
                <div className="text-xs text-text-3 mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap">{e.title}</div>
              </div>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {d&&<Tag tone="neutral" sm>{d.name}</Tag>}
              <Tag tone={e.role==="owner"?"warn":e.role==="admin"?"brand":e.role==="hr"?"ok":e.role==="finance"?"violet":"neutral"} sm>{e.role}</Tag>
            </div>
          </div>;})}
      </div>
      :
      <Card pad={0} style={{borderRadius:14,overflow:"hidden"}}>
        {filtered.map((e,i)=>{const d=A.HR_DEPARTMENTS.find(x=>x.id===e.dept);
          return <div key={e.id} onClick={()=>setSelected(e.id)} className={`flex gap-3.5 items-center cursor-pointer transition-colors duration-150 hover:bg-bg ${mob?"py-3 px-3.5":"py-3.5 px-5"} ${i>0?"border-t border-line-soft":""}`}>
            <SmartPortrait seed={e.seed} size={38} radius={10}/>
            <div className="grow shrink basis-50 min-w-0">
              <div className="text-sm font-semibold text-text">{e.name}</div>
              <div className="text-xs text-text-3 mt-0.5">{e.title}</div>
            </div>
            {!mob&&d&&<div className="text-xs text-text-2" style={{minWidth:140}}>{d.name}</div>}
            {!mob&&<div className="text-xs text-text-2" style={{minWidth:120}}>{e.city}, {e.prov}</div>}
            <Tag tone={e.role==="owner"?"warn":e.role==="admin"?"brand":e.role==="hr"?"ok":e.role==="finance"?"violet":"neutral"} sm>{e.role}</Tag>
          </div>;})}
      </Card>
    }

    {selectedEmp&&<Modal onClose={()=>setSelected(null)} title="Employee details" wide>
      <_HrEmpDetail e={selectedEmp} onClose={()=>setSelected(null)}/>
    </Modal>}
  </div>;
}

function _HrEmpDetail({e,onClose}){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const d=A.HR_DEPARTMENTS.find(x=>x.id===e.dept);
  const mgr=e.manager?A.hrEmp(e.manager):null;
  const publicProfile=A.hrPublicProfile(e.id);
  return <div>
    <div className="flex gap-4 items-center mb-5 flex-wrap">
      <SmartPortrait seed={e.seed} size={64} radius={16}/>
      <div className="flex-1 min-w-0">
        <div className="text-xl font-bold text-text tracking-tight">{e.name}</div>
        <div className="text-sm text-text-2 mt-1">{e.title}</div>
        <div className="flex gap-1.5 flex-wrap mt-2">
          {d&&<Tag tone="neutral" sm>{d.name}</Tag>}
          <Tag tone={e.role==="owner"?"warn":e.role==="admin"?"brand":e.role==="hr"?"ok":e.role==="finance"?"violet":"neutral"} sm>{e.role}</Tag>
        </div>
      </div>
    </div>
    <div className={`grid gap-3.5 text-sm ${mob?"grid-cols-1":"grid-cols-2"}`}>
      {[["Location",`${e.city}, ${e.prov}`],["Email",e.email],["Phone",e.phone],
        ["Manager",mgr?.name||"—"],["Hired",e.hired],["Tenure",publicProfile.tenureYears?`${publicProfile.tenureYears} years`:"—"]].map(([l,v])=>
        <div key={l}><div className="text-xs font-bold text-text-3 tracking-wide uppercase mb-1">{l}</div>
          <div className="text-text">{v}</div></div>)}
    </div>
    {e.skills.length>0&&<div className="mt-4">
      <div className="text-xs font-bold text-text-3 tracking-wide uppercase mb-2">Skills</div>
      <div className="flex flex-wrap gap-1.5">
        {e.skills.map(s=><Tag key={s} tone="brand" sm>{s}</Tag>)}</div>
    </div>}
    {e.badges.length>0&&<div className="mt-4">
      <div className="text-xs font-bold text-text-3 tracking-wide uppercase mb-2">Badges & recognition</div>
      <div className="flex flex-wrap gap-1.5">
        {e.badges.map(b=><Tag key={b} tone="warn" sm icon="award">{b}</Tag>)}</div>
    </div>}
    <div className="mt-5 flex gap-2.5 justify-end">
      <Btn kind="outline" size="sm" icon="mail" onClick={()=>{A.go("hrChat"); onClose();}}>Message</Btn>
      <Btn kind="primary" size="sm" onClick={onClose}>Close</Btn>
    </div>
  </div>;
}

/* ─── Profile: edit own details + visibility toggles for public NorthHire ─── */
export function HrProfile(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const emp=A.hrCurrentEmp();
  const [d,setD]=useState({...emp});
  useEffect(()=>setD({...emp}),[emp?.id]);
  const dirty=JSON.stringify(d)!==JSON.stringify(emp);
  const set=(k,v)=>setD(p=>({...p,[k]:v}));
  const setVis=(k,v)=>setD(p=>({...p,visibility:{...p.visibility,[k]:v}}));
  const save=()=>{A.updateEmp(emp.id,d);};
  const dept=A.HR_DEPARTMENTS.find(x=>x.id===emp.dept);
  const publicView=A.hrPublicProfile(emp.id);

  const visItems=[
    {k:"title",l:"Job title",v:emp.title},
    {k:"department",l:"Department",v:dept?.name},
    {k:"tenure",l:"Tenure at company",v:publicView.tenureYears?`${publicView.tenureYears} years`:"—"},
    {k:"manager",l:"Manager",v:emp.manager?A.hrEmp(emp.manager)?.name:"—"},
    {k:"badges",l:"Badges & recognition",v:`${emp.badges.length} badges`},
    {k:"trainings",l:"Trainings completed",v:`${publicView.trainingsCompleted||0} courses`},
    {k:"salary",l:"Salary",v:`$${emp.salary?.toLocaleString()}`},
    {k:"phone",l:"Phone number",v:emp.phone},
    {k:"email",l:"Email address",v:emp.email},
    {k:"birthDate",l:"Date of birth",v:emp.birthDate},
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

          <Lbl>Personal details</Lbl>
          <div className={`grid gap-3 mb-5 ${mob?"grid-cols-1":"grid-cols-2"}`}>
            <Field label="Full name"><Input value={d.name} onChange={e=>set("name",e.target.value)}/></Field>
            <Field label="Job title"><Input value={d.title} onChange={e=>set("title",e.target.value)}/></Field>
            <Field label="Email"><Input icon="mail" value={d.email} onChange={e=>set("email",e.target.value)}/></Field>
            <Field label="Phone"><Input icon="phone" value={d.phone} onChange={e=>set("phone",e.target.value)}/></Field>
            <Field label="City"><Input icon="pin" value={d.city} onChange={e=>set("city",e.target.value)}/></Field>
            <Field label="Province"><Input value={d.prov} onChange={e=>set("prov",e.target.value)}/></Field>
          </div>

          <Lbl>Skills</Lbl>
          <div className="mb-5">
            <InlineList value={d.skills||[]} onChange={v=>set("skills",v)} icon="sparkle" placeholder="Add a skill and press Enter"/>
          </div>

          <div className="flex gap-2.5 justify-end pt-5 border-t border-line-soft">
            {dirty&&<Btn kind="ghost" onClick={()=>setD({...emp})}>Discard</Btn>}
            <Btn kind="primary" icon="check" disabled={!dirty} onClick={save}>{dirty?"Save changes":"Saved"}</Btn>
          </div>
        </Card>

        <Card pad={mob?20:26} style={{borderRadius:16,marginBottom:16}}>
          <Lbl>Public NorthHire profile visibility</Lbl>
          <Banner tone="brand" icon="info" title="How this works" style={{marginBottom:16}}>
            Everything you show here appears on your public profile page across NorthHire. Employers searching for talent, and anyone viewing your company's page, will see what you allow.</Banner>
          <div className="flex flex-col gap-0.5">
            {visItems.map(item=>{const on=d.visibility?.[item.k]!==false;
              return <div key={item.k} className="flex gap-3 items-center py-3 px-3 rounded-lg transition-colors duration-150 hover:bg-bg">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-text">{item.l}</div>
                  <div className="text-xs text-text-3 mt-0.5">{on?"Visible publicly":"Hidden from public profile"}{item.v?` — currently: ${item.v}`:""}</div>
                </div>
                <Switch on={on} onChange={v=>setVis(item.k,v)}/>
              </div>;})}
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-3.5">
        <Card pad={20} style={{borderRadius:16,background:`linear-gradient(135deg,${C.tint} 0%,#F0F7FF 100%)`,border:`1px solid ${C.line2}`}}>
          <div className="text-xs font-bold text-brand tracking-wide uppercase mb-2.5">Public profile preview</div>
          <div className="flex gap-3 items-center mb-3.5">
            <SmartPortrait seed={emp.seed} size={50} radius={12}/>
            <div>
              <div className="text-sm font-semibold text-text">{emp.name}</div>
              {publicView.title&&<div className="text-xs text-text-2 mt-0.5">{publicView.title}</div>}
            </div>
          </div>
          <div className="text-sm text-text-2 leading-loose">
            {publicView.department&&<div>• {publicView.department} at {publicView.company}</div>}
            {publicView.tenureYears&&<div>• {publicView.tenureYears} years at company</div>}
            {publicView.manager&&<div>• Reports to {publicView.manager}</div>}
            {publicView.trainingsCompleted>0&&<div>• {publicView.trainingsCompleted} trainings completed</div>}
            {publicView.badges?.length>0&&<div className="mt-2">
              <div className="text-xs text-text-3 mb-1.5">Recognitions:</div>
              <div className="flex flex-wrap gap-1">
                {publicView.badges.map(b=><Tag key={b} tone="warn" sm icon="award">{b}</Tag>)}</div>
            </div>}
            {publicView.phone&&<div className="mt-2">• Phone: {publicView.phone}</div>}
            {publicView.email&&<div>• Email: {publicView.email}</div>}
          </div>
        </Card>

        <Card pad={20} style={{borderRadius:16}}>
          <Lbl>Your badges</Lbl>
          {emp.badges.length===0
            ? <div className="text-sm text-text-3">No badges yet.</div>
            : <div className="flex flex-col gap-2">
                {emp.badges.map(b=><div key={b} className="flex gap-3 items-center py-2.5 px-3 bg-bg rounded-lg">
                  <div className="w-8 h-8 rounded-lg bg-warn-bg text-warn flex items-center justify-center"><I n="award" s={16}/></div>
                  <div className="text-sm font-semibold text-text">{b}</div>
                </div>)}
              </div>}
        </Card>
      </div>
    </div>
  </div>;
}

/* ─── Attendance: log view + punch machine integration ─── */
export function HrAttendance(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
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
    const rows=[["Date","Employee","In","Out","Hours","Source"],
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
          <Lbl style={{margin:0}}>Your attendance today</Lbl>
          <div className="text-xs text-text-3 mt-1">{new Date().toLocaleDateString("en-CA",{weekday:"long",month:"long",day:"numeric"})}</div>
        </div>
        <Tag tone={todayRecord?"ok":"neutral"} sm>{todayRecord?(todayRecord.clockOut?"Signed out":"On the clock"):"Not clocked in"}</Tag>
      </div>
      {!todayRecord?
        <Btn kind="primary" size="lg" icon="clock" onClick={async()=>{const r=await A.punchIn(emp.id,"web"); if(!r.ok)A.toast(r.msg,"danger");}}>Punch in now</Btn>
        :!todayRecord.clockOut?
        <div className="flex gap-3 flex-wrap items-center">
          <div className="text-base text-text-2">Punched in at <strong className="text-text">{todayRecord.clockIn}</strong> via {todayRecord.source}</div>
          <Btn kind="outline" icon="clock" onClick={async()=>{const r=await A.punchOut(emp.id); if(!r.ok)A.toast(r.msg,"danger");}}>Punch out</Btn>
        </div>
        :
        <div className="text-base text-text-2">In: <strong>{todayRecord.clockIn}</strong> · Out: <strong>{todayRecord.clockOut}</strong> · Total: <strong className="text-brand">{todayRecord.hours}h</strong></div>}
    </Card>

    {canSeeAll&&<Card pad={mob?16:20} style={{marginBottom:16,borderRadius:14,background:punchConn?C.okBg:C.warnBg,border:`1px solid ${punchConn?C.okLn:C.warnLn}`}}>
      <div className="flex gap-3 items-center flex-wrap">
        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shrink-0" style={{color:punchConn?C.ok:C.warn}}><I n={punchConn?"check":"clock"} s={20}/></div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-text">{punchConn?`Punch machine connected: ${settings.integrations.punchMachine.vendor}`:"No punch machine connected"}</div>
          <div className="text-xs text-text-2 mt-1">{punchConn?`Last sync: ${new Date(settings.integrations.punchMachine.lastSync).toLocaleString("en-CA")}`:"Connect your on-site punch clock or biometric reader to auto-sync attendance."}</div>
        </div>
        <Btn kind={punchConn?"outline":"primary"} size="sm" onClick={()=>A.go("hrIntegrations")}>{punchConn?"Manage":"Connect"}</Btn>
      </div>
    </Card>}

    <Card pad={mob?16:20} style={{borderRadius:14}}>
      <div className="flex gap-2.5 items-center mb-3.5 flex-wrap">
        <Lbl style={{margin:0,flex:1}}>{view==="mine"?"My history":"Team log"}</Lbl>
        {canSeeAll&&<_PillTabs items={[["mine","Mine"],["team","Team"]]} value={view} onChange={setView}/>}
        {canSeeAll&&view==="team"&&<Sel value={empFilter} onChange={e=>setEmpFilter(e.target.value)} style={{maxWidth:200}}>
          <option value="all">All employees</option>
          {A.hrEmpsAtCompany(company.id).map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</Sel>}
      </div>
      <div className="flex gap-2.5 items-center mb-3.5 flex-wrap">
        <Input type="date" value={fromDate} onChange={e=>{setFromDate(e.target.value);setShown(50);}} style={{maxWidth:170}}/>
        <span className="text-xs text-text-3">to</span>
        <Input type="date" value={toDate} onChange={e=>{setToDate(e.target.value);setShown(50);}} style={{maxWidth:170}}/>
        {(fromDate||toDate)&&<button onClick={()=>{setFromDate("");setToDate("");}} className="bg-transparent border-0 p-0 cursor-pointer text-sm text-brand font-semibold">Clear dates</button>}
        <div className="flex-1"/>
        <Btn kind="outline" size="sm" icon="download" onClick={exportCsv}>Export CSV</Btn>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{minWidth:600}}>
          <thead><tr className="border-b-2 border-line text-left">
            <th className={TH_CLS}>Date</th>
            {view==="team"&&<th className={TH_CLS}>Employee</th>}
            <th className={TH_CLS}>In</th>
            <th className={TH_CLS}>Out</th>
            <th className={TH_CLS}>Hours</th>
            <th className={TH_CLS}>Source</th>
          </tr></thead>
          <tbody>
            {sorted.slice(0,shown).map(r=>{const who=A.hrEmp(r.employee);
              return <tr key={r.id} className="border-b border-line-soft transition-colors duration-150 hover:bg-bg">
                <td className={`${TD_CLS} text-sm text-text`}>{r.date}</td>
                {view==="team"&&<td className={`${TD_CLS} text-sm text-text`}>{who?.name||"—"}</td>}
                <td className={`${TD_CLS} text-sm text-text`}>{r.clockIn||"—"}{r.late&&<Tag tone="warn" sm style={{marginLeft:6}}>Late</Tag>}</td>
                <td className={`${TD_CLS} text-sm text-text-2`}>{r.clockOut||"—"}</td>
                <td className={`${TD_CLS} text-sm text-brand font-semibold`}>{r.hours||0}h</td>
                <td className={`${TD_CLS} text-xs text-text-3`}>{r.source}</td>
              </tr>;})}
            {sorted.length===0&&<tr><td colSpan={view==="team"?6:5} className="p-5"><Empty icon="clock" title="No attendance records yet" body="Punch-in history will show up here."/></td></tr>}
          </tbody>
        </table>
      </div>
      {sorted.length>shown&&<Btn kind="outline" full style={{marginTop:14}} onClick={()=>setShown(s=>s+50)}>Show more ({sorted.length-shown} remaining)</Btn>}
    </Card>
  </div>;
}

/* ─── Leave: request + approve workflow ─── */
export function HrLeave(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const emp=A.hrCurrentEmp();
  const canApprove=emp.role==="owner"||emp.role==="admin"||emp.role==="hr";
  const [tab,setTab]=useState(canApprove?"pending":"mine");
  const [showReq,setShowReq]=useState(false);
  const [req,setReq]=useState({type:"Vacation",from:"",to:"",reason:""});
  const settings=A.hrCompanySettings[emp.companyId]||HR_COMPANY_SETTINGS_DEFAULT;
  const myLeave=A.hrLeave.filter(l=>l.employee===emp.id);
  const usedVacation=myLeave.filter(l=>l.status==="approved"&&l.type==="Vacation").reduce((s,l)=>s+l.days,0);
  /* Real per-pay-period accrual instead of the flat annual number being available on day one -
     prorated by how much of the calendar year has actually elapsed (and by first-year tenure,
     so someone hired in October doesn't accrue as if they'd been here since January). */
  const yearStart=new Date(new Date().getFullYear(),0,1);
  const hireDate=new Date(emp.hired);
  const accrualStart=hireDate>yearStart?hireDate:yearStart;
  const daysElapsed=Math.max(0,(Date.now()-accrualStart.getTime())/86400000);
  const daysInYear=(new Date(new Date().getFullYear(),11,31)-yearStart)/86400000+1;
  const accruedVacation=Math.round(settings.leave.annualVacationDays*Math.min(1,daysElapsed/daysInYear)*10)/10;
  const vacationBalance=Math.round((accruedVacation-usedVacation)*10)/10;
  const usedSick=myLeave.filter(l=>l.status==="approved"&&l.type==="Sick").reduce((s,l)=>s+l.days,0);
  const usedPersonal=myLeave.filter(l=>l.status==="approved"&&l.type==="Personal").reduce((s,l)=>s+l.days,0);
  const pending=A.hrLeave.filter(l=>l.status==="pending");
  const list=tab==="mine"?myLeave:tab==="pending"?pending:A.hrLeave;
  const sorted=[...list].sort((a,b)=>b.requestedAt-a.requestedAt);

  const [reqErr,setReqErr]=useState("");
  const submitReq=()=>{if(!req.from||!req.to)return;
    /* Advance-notice policy only makes sense for plannable leave — sick/bereavement/parental
       are routinely short-notice by nature, so they're exempt. */
    if(req.type==="Vacation"||req.type==="Personal"){
      const daysNotice=Math.ceil((new Date(req.from)-new Date())/(1000*60*60*24));
      if(daysNotice<settings.leave.advanceNoticeDays){
        setReqErr(`${req.type} requests need at least ${settings.leave.advanceNoticeDays} days' notice — choose a start date on or after ${_fmtDate(new Date(Date.now()+settings.leave.advanceNoticeDays*864e5))}.`);
        return;
      }
    }
    setReqErr("");
    /* Weekday count, not a raw calendar-day span — a Fri-to-Mon request is 2 vacation days, not 4. */
    let days=0; const d=new Date(req.from); const end=new Date(req.to);
    for(;d<=end;d.setDate(d.getDate()+1)){if(d.getDay()!==0&&d.getDay()!==6)days++;}
    days=Math.max(1,days);
    if(req.type==="Vacation"&&days>vacationBalance){
      setReqErr(`This request is for ${days} day${days===1?"":"s"}, but you've only accrued ${vacationBalance} day${vacationBalance===1?"":"s"} of vacation balance so far this year.`);
      return;
    }
    A.requestLeave({...req,days}); setReq({type:"Vacation",from:"",to:"",reason:""}); setShowReq(false);};

  return <div>
    <div className={`grid gap-3 mb-4 ${mob?"grid-cols-2":"grid-cols-4"}`}>
      {[
        {l:"Vacation balance available",v:vacationBalance,tone:vacationBalance<0?C.danger:C.brand,
          sub:`${accruedVacation} accrued so far · ${settings.leave.annualVacationDays}/yr allowance`},
        {l:"Sick days used",v:usedSick,total:settings.leave.sickDays,tone:C.ok},
        {l:"Personal days used",v:usedPersonal,total:settings.leave.personalDays,tone:C.violet},
        {l:"My open requests",v:myLeave.filter(l=>l.status==="pending").length,tone:C.warn}
      ].map(k=><Card key={k.l} pad={mob?16:20} style={{borderRadius:14}}>
        <div className={`font-bold tracking-tight ${mob?"text-2xl":"text-3xl"}`} style={{color:k.tone}}>{k.v}{k.total?<span className="text-sm text-text-3 font-medium"> / {k.total}</span>:""}</div>
        <div className="text-xs text-text-3 mt-1.5">{k.l}</div>
        {k.sub&&<div className="text-xs text-text-3 mt-0.5">{k.sub}</div>}
      </Card>)}
    </div>

    <Card pad={mob?16:20} style={{borderRadius:14}}>
      <div className="flex justify-between items-center mb-3.5 flex-wrap gap-2.5">
        <_PillTabs items={[["mine","My requests"],...(canApprove?[["pending","Pending ("+pending.length+")"],["all","All"]]:[])]} value={tab} onChange={setTab}/>
        <Btn kind="primary" size="sm" icon="plus" onClick={()=>setShowReq(true)}>Request leave</Btn>
      </div>

      {sorted.length===0
        ? <Empty icon="calendar" title="No leave records to show" body="Requests will appear here once submitted."/>
        : <div className="flex flex-col gap-2">
            {sorted.map(r=>{const who=A.hrEmp(r.employee);
              return <div key={r.id} className="flex gap-3.5 items-center py-3 px-3.5 bg-bg rounded-xl border border-line flex-wrap">
                <SmartPortrait seed={who?.seed||0} size={38} radius={10}/>
                <div className="grow shrink basis-50 min-w-0">
                  <div className="text-sm font-semibold text-text">{who?.name} • {r.type}</div>
                  <div className="text-xs text-text-3 mt-0.5">{r.from} → {r.to} ({r.days} day{r.days===1?"":"s"})</div>
                  {r.reason&&<div className="text-xs text-text-2 mt-1 italic">"{r.reason}"</div>}
                </div>
                {r.status==="pending"&&canApprove&&r.employee!==emp.id?<div className="flex gap-1.5">
                  <Btn kind="dangerSoft" size="xs" onClick={()=>A.decideLeave(r.id,"denied",emp.id)}>Deny</Btn>
                  <Btn kind="primary" size="xs" onClick={()=>A.decideLeave(r.id,"approved",emp.id)}>Approve</Btn>
                </div>:<Tag tone={r.status==="approved"?"ok":r.status==="denied"?"danger":"warn"} sm>{r.status}</Tag>}
              </div>;})}
          </div>}
    </Card>

    {showReq&&<Modal onClose={()=>setShowReq(false)} title="Request leave">
      <div className="flex flex-col gap-3.5">
        <Field label="Type" required><Sel value={req.type} onChange={e=>setReq({...req,type:e.target.value})}>
          {["Vacation","Sick","Personal","Bereavement","Parental","Unpaid","Other"].map(t=><option key={t}>{t}</option>)}</Sel></Field>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="From" required><DatePicker value={req.from} onChange={v=>setReq({...req,from:v})}/></Field>
          <Field label="To" required><DatePicker value={req.to} onChange={v=>setReq({...req,to:v})} min={req.from}/></Field>
        </div>
        <Field label="Reason" hint="Optional but helpful for approver."><Area rows={3} value={req.reason} onChange={e=>setReq({...req,reason:e.target.value})} placeholder="Family trip, medical appointment, etc."/></Field>
        {reqErr&&<Banner tone="danger" icon="alert">{reqErr}</Banner>}
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>{setShowReq(false);setReqErr("");}}>Cancel</Btn>
          <Btn kind="primary" icon="check" onClick={submitReq} disabled={!req.from||!req.to}>Submit request</Btn>
        </div>
      </div>
    </Modal>}
  </div>;
}

/* ─── Tasks: kanban board ─── */
export function HrTasks(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const emp=A.hrCurrentEmp(); const company=A.hrCurrentCompany();
  const canAssignOthers=emp.role!=="employee";
  const [scope,setScope]=useState("mine"); /* mine | assigned | all */
  const [showAdd,setShowAdd]=useState(false);
  const [nt,setNt]=useState({title:"",assignee:emp.id,due:"",priority:"medium",tags:[]});
  const source=scope==="mine"?A.hrTasks.filter(t=>t.assignee===emp.id)
    :scope==="assigned"?A.hrTasks.filter(t=>t.assignedBy===emp.id)
    :A.hrTasks;
  const cols=[{k:"todo",label:"To do",tone:C.text3},{k:"in-progress",label:"In progress",tone:C.brand},{k:"done",label:"Done",tone:C.ok}];

  const submit=()=>{if(!nt.title.trim()||!nt.due)return;
    A.addTask({...nt,title:nt.title.trim()}); setNt({title:"",assignee:emp.id,due:"",priority:"medium",tags:[]}); setShowAdd(false);};

  return <div>
    <div className="flex justify-between items-center mb-4 flex-wrap gap-2.5">
      <_PillTabs items={[["mine","My tasks"],...(canAssignOthers?[["assigned","Assigned by me"],["all","All company"]]:[])]} value={scope} onChange={setScope}/>
      <Btn kind="primary" size="sm" icon="plus" onClick={()=>setShowAdd(true)}>New task</Btn>
    </div>

    <div className={`grid gap-3 ${mob?"grid-cols-1":"grid-cols-3"}`}>
      {cols.map(col=>{const tasks=source.filter(t=>t.status===col.k);
        return <div key={col.k} className="bg-bg rounded-2xl p-3" style={{minHeight:200}}>
          <div className="flex justify-between items-center py-1 px-1.5 mb-2.5">
            <div className="flex gap-2 items-center">
              <div className="w-2 h-2 rounded-full" style={{background:col.tone}}/>
              <div className="text-xs font-bold text-text tracking-tight">{col.label}</div>
            </div>
            <Tag tone="neutral" sm>{tasks.length}</Tag>
          </div>
          <div className="flex flex-col gap-2">
            {[...tasks].sort((a,b)=>a.due.localeCompare(b.due)).map(t=>{const assn=A.hrEmp(t.assignee); const by=A.hrEmp(t.assignedBy);
              const overdue=col.k!=="done"&&t.due<_fmtDate(new Date());
              return <div key={t.id} data-card className="bg-white border border-line rounded-xl p-3" style={overdue?{borderColor:C.red}:undefined}>
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
                <div className="flex gap-1">
                  {col.k!=="todo"&&<Btn kind="ghost" size="xs" aria-label={`Move "${t.title}" back to ${cols[cols.findIndex(c=>c.k===col.k)-1].label}`} onClick={()=>A.updateTaskStatus(t.id,cols[cols.findIndex(c=>c.k===col.k)-1].k)}>←</Btn>}
                  {col.k!=="done"&&<Btn kind="ghost" size="xs" aria-label={`Move "${t.title}" forward to ${cols[cols.findIndex(c=>c.k===col.k)+1].label}`} onClick={()=>A.updateTaskStatus(t.id,cols[cols.findIndex(c=>c.k===col.k)+1].k)}>→</Btn>}
                  {(t.assignedBy===emp.id||emp.role==="owner"||emp.role==="admin")&&<Btn kind="ghost" size="xs" icon="trash" aria-label={`Delete task "${t.title}"`} onClick={()=>A.deleteTask(t.id)}/>}
                </div>
              </div>;})}
            {tasks.length===0&&<div className="p-5 text-center text-xs text-text-3">No tasks here.</div>}
          </div>
        </div>;})}
    </div>

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
  const A=use(); const mob=useMedia("(max-width: 900px)");
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
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const emp=A.hrCurrentEmp(); const company=A.hrCurrentCompany();
  const chatSettings=(A.hrCompanySettings[company?.id]||HR_COMPANY_SETTINGS_DEFAULT).chat;
  const [selected,setSelected]=useState(A.hrChats[0]?.id||null);
  const [msg,setMsg]=useState("");
  const [showNew,setShowNew]=useState(false);
  const [showThreads,setShowThreads]=useState(!mob);
  useEffect(()=>{if(!mob)setShowThreads(true);},[mob]);

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
        {myChats.map(c=>{const isActive=selected===c.id;
          const lastMsg=A.hrChatMsgs.filter(m=>m.chat===c.id).sort((a,b)=>b.at-a.at)[0];
          return <button key={c.id} onClick={()=>{setSelected(c.id); if(mob)setShowThreads(false);}}
            className={`w-full py-3 px-3.5 border-0 border-b border-line-soft cursor-pointer text-left transition-colors duration-150 ${isActive?"bg-tint":"bg-transparent"}`}>
            <div className="flex justify-between items-baseline gap-2 mb-1">
              <div className={`text-sm overflow-hidden text-ellipsis whitespace-nowrap ${isActive?"font-bold":"font-semibold"} text-text`}>{c.name}</div>
              {lastMsg&&<div className="text-xs text-text-3 shrink-0" style={{fontSize:10.5}}>{new Date(lastMsg.at).toLocaleDateString("en-CA",{month:"short",day:"numeric"})}</div>}
            </div>
            <div className="text-xs text-text-3 overflow-hidden text-ellipsis whitespace-nowrap">{lastMsg?lastMsg.text:c.about}</div>
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

/* ─── People management: add/edit/offboard, role changes ─── */
function HrPeople(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const emp=A.hrCurrentEmp(); const company=A.hrCurrentCompany();
  const [showAdd,setShowAdd]=useState(false);
  const [ne,setNe]=useState({name:"",email:"",role:"employee",dept:"d1",title:"",city:"",prov:"AB",phone:"",salary:60000});
  const all=A.hrEmpsAtCompany(company.id);
  const submit=()=>{if(!ne.name.trim()||!ne.email.trim())return;
    A.addEmployee({...ne,companyId:company.id});
    setNe({name:"",email:"",role:"employee",dept:"d1",title:"",city:"",prov:"AB",phone:"",salary:60000});
    setShowAdd(false);};
  return <div>
    <div className="flex justify-between items-center mb-4 flex-wrap gap-2.5">
      <div><div className="text-lg font-bold text-text">{all.filter(e=>e.status==="active").length} active employees</div>
        <div className="text-sm text-text-3 mt-1">Add new hires, change roles, and manage the org chart.</div></div>
      <Btn kind="primary" size="sm" icon="plus" onClick={()=>setShowAdd(true)}>Add employee</Btn>
    </div>

    <Card pad={0} style={{borderRadius:14,overflow:"hidden"}}>
      <div className="overflow-x-auto"><table className="w-full border-collapse" style={{minWidth:720}}>
        <thead><tr className="border-b-2 border-line text-left">
          {["Name","Title","Dept","Role","Hired","Status","Actions"].map(h=>
            <th key={h} className={TH_CLS}>{h}</th>)}
        </tr></thead>
        <tbody>{all.map(e=>{const d=A.HR_DEPARTMENTS.find(x=>x.id===e.dept);
          return <tr key={e.id} className="border-b border-line-soft transition-colors duration-150 hover:bg-bg">
            <td className={TD_CLS}><div className="flex gap-2.5 items-center">
              <SmartPortrait seed={e.seed} size={30} radius={8}/>
              <span className="text-sm font-semibold text-text">{e.name}</span></div></td>
            <td className={`${TD_CLS} text-sm text-text-2`}>{e.title}</td>
            <td className={`${TD_CLS} text-sm text-text-2`}>{d?.name||"—"}</td>
            <td className={TD_CLS}>
              <Sel value={e.role} onChange={ev=>A.updateEmp(e.id,{role:ev.target.value})} style={{fontSize:12,padding:"5px 8px",minWidth:0}}>
                {A.HR_ROLES.map(r=><option key={r.k} value={r.k}>{r.label}</option>)}</Sel>
            </td>
            <td className={`${TD_CLS} text-xs text-text-3`}>{e.hired}</td>
            <td className={TD_CLS}><Tag tone={e.status==="active"?"ok":"neutral"} sm>{e.status}</Tag></td>
            <td className={TD_CLS}><div className="flex gap-1">
              {e.status==="active"&&e.id!==emp.id&&<Btn kind="dangerSoft" size="xs" onClick={()=>{if(confirm(`Offboard ${e.name}?`))A.removeEmployee(e.id);}}>Offboard</Btn>}
            </div></td>
          </tr>;})}</tbody>
      </table></div>
    </Card>

    {showAdd&&<Modal onClose={()=>setShowAdd(false)} title="Add employee" wide>
      <div className="flex flex-col gap-3.5">
        <div className={`grid gap-3 ${mob?"grid-cols-1":"grid-cols-2"}`}>
          <Field label="Full name" required><Input value={ne.name} onChange={e=>setNe({...ne,name:e.target.value})}/></Field>
          <Field label="Email" required><Input icon="mail" value={ne.email} onChange={e=>setNe({...ne,email:e.target.value})}/></Field>
          <Field label="Job title"><Input value={ne.title} onChange={e=>setNe({...ne,title:e.target.value})}/></Field>
          <Field label="Phone"><Input icon="phone" value={ne.phone} onChange={e=>setNe({...ne,phone:e.target.value})}/></Field>
          <Field label="Role"><Sel value={ne.role} onChange={e=>setNe({...ne,role:e.target.value})}>
            {A.HR_ROLES.map(r=><option key={r.k} value={r.k}>{r.label}</option>)}</Sel></Field>
          <Field label="Department"><Sel value={ne.dept} onChange={e=>setNe({...ne,dept:e.target.value})}>
            {A.HR_DEPARTMENTS.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</Sel></Field>
          <Field label="City"><Input icon="pin" value={ne.city} onChange={e=>setNe({...ne,city:e.target.value})}/></Field>
          <Field label="Annual salary (CAD)"><Input type="number" value={ne.salary} onChange={e=>setNe({...ne,salary:Number(e.target.value)||0})}/></Field>
        </div>
        <Banner tone="brand" icon="mail" title="Invitation">The new employee will receive an email with sign-in instructions. They can then set their password and start using the HR Suite.</Banner>
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>setShowAdd(false)}>Cancel</Btn>
          <Btn kind="primary" icon="check" onClick={submit} disabled={!ne.name.trim()||!ne.email.trim()}>Add employee</Btn>
        </div>
      </div>
    </Modal>}
  </div>;
}

/* ─── Invoices ─── */
export function HrInvoices(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
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
              <Input type="number" min="0" value={it.qty} onChange={e=>updateItem(i,{qty:Number(e.target.value)||0})}/>
              <Input type="number" min="0" step="0.01" value={it.unitPrice} onChange={e=>updateItem(i,{unitPrice:Number(e.target.value)||0})}/>
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

    {detail&&<InvoiceDetailModal invoice={detail} company={company} onClose={()=>setDetail(null)} canManage={canManage} onMarkPaid={()=>{A.markInvoicePaid(detail.id); setDetail({...detail,status:"paid"});}} onSend={()=>{A.sendInvoice(detail.id); setDetail({...detail,status:"pending"});}}/>}
  </div>;
}

function InvoiceDetailModal({invoice:inv,company,onClose,canManage,onMarkPaid,onSend}){
  const A=use(); const mob=useMedia("(max-width: 900px)");
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

      <div className="flex gap-2.5 justify-end pt-2 border-t border-line">
        <Btn kind="ghost" onClick={onClose}>Close</Btn>
        <Btn kind="ghost" icon="download" onClick={()=>A.printHrInvoice(inv,company)}>Download PDF</Btn>
        {canManage&&inv.status==="draft"&&<Btn kind="primary" onClick={onSend}>Send to client</Btn>}
        {canManage&&inv.status==="pending"&&<Btn kind="primary" icon="check" onClick={onMarkPaid}>Mark as paid</Btn>}
      </div>
    </div>
  </Modal>;
}

/* ─── Payroll ─── */
export function HrPayroll(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
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
          <div className="text-sm text-text-3 mt-0.5">Biweekly runs. CPP/EI/tax estimated at flat statutory rates (not full CRA brackets or credits). Approved expenses flow through automatically.</div>
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
        <Banner tone="brand" icon="info">Runs pay for {all.length} active employees. CPP, EI, and tax are estimated at flat statutory rates — not a substitute for real CRA payroll calculation. Approved expenses awaiting reimbursement will be included.</Banner>
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

    {detail&&<PayrollDetailModal run={detail} onClose={()=>setDetail(null)} canApprove={isPayrollMgr} onApprove={()=>{A.approvePayroll(detail.id); setDetail({...detail,status:"approved"});}} onExecute={()=>setExecuting(detail)}/>}

    <ConfirmDialog open={!!executing} onClose={()=>setExecuting(null)} confirmLabel="Execute payroll"
      title="Execute this payroll run?" onConfirm={()=>{A.executePayroll(executing.id); if(detail?.id===executing.id)setDetail(null);}}>
      {executing&&<>Pays {executing.employees} employees, total net <strong>${executing.totalNet?.toLocaleString()}</strong>. This triggers direct deposit and marks all approved expenses as paid — it can't be undone from here.</>}
    </ConfirmDialog>
  </div>;
}

function PayrollDetailModal({run,onClose,canApprove,onApprove,onExecute}){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const exportRegister=()=>{
    const rows=[["Employee","Gross","CPP","EI","Federal tax","Provincial tax","Reimbursement","Net"],
      ...run.lines.map(l=>[l.name,l.gross,l.cpp,l.ei,l.fedTax,l.provTax,l.reimb||0,l.net])];
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
            {["Employee","Gross","CPP","EI","Fed","Prov","Reimb.","Net"].map(h=>
              <th key={h} className="py-2.5 px-2.5 text-left font-bold text-text-3 tracking-wide uppercase border-b border-line" style={{fontSize:10.5}}>{h}</th>)}
          </tr></thead>
          <tbody>{run.lines.map(l=><tr key={l.employee} className="border-b border-line-soft">
            <td className="py-2.5 px-2.5 font-semibold text-text">{l.name}</td>
            <td className="py-2.5 px-2.5 text-text">${l.gross.toLocaleString()}</td>
            <td className="py-2.5 px-2.5 text-text-3">-${l.cpp.toLocaleString()}</td>
            <td className="py-2.5 px-2.5 text-text-3">-${l.ei.toLocaleString()}</td>
            <td className="py-2.5 px-2.5 text-text-3">-${l.fedTax.toLocaleString()}</td>
            <td className="py-2.5 px-2.5 text-text-3">-${l.provTax.toLocaleString()}</td>
            <td className="py-2.5 px-2.5" style={{color:l.reimb>0?C.ok:C.text3}}>{l.reimb>0?`+$${l.reimb.toLocaleString()}`:"—"}</td>
            <td className="py-2.5 px-2.5 text-brand font-bold">${l.net.toLocaleString()}</td>
          </tr>)}</tbody>
        </table>
      </div>

      <div className="text-xs text-text-3 p-3 bg-bg rounded-lg leading-relaxed">
        <strong className="text-text-2">Status: {run.status}</strong> · Runs are draft when first created. Once approved, they can be executed (direct deposit initiated + expenses reconciled).
      </div>

      <div className="flex gap-2.5 justify-end pt-2 border-t border-line">
        <Btn kind="outline" icon="download" onClick={exportRegister}>Export register</Btn>
        <Btn kind="ghost" onClick={onClose}>Close</Btn>
        {canApprove&&run.status==="draft"&&<Btn kind="primary" onClick={onApprove}>Approve run</Btn>}
        {canApprove&&run.status==="approved"&&<Btn kind="primary" icon="check" onClick={onExecute}>Execute payroll</Btn>}
      </div>
    </div>
  </Modal>;
}


/* ─── Trainings ─── */
export function HrTrainings(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
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
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const emp=A.hrCurrentEmp(); const company=A.hrCurrentCompany();
  const all=A.hrEmpsAtCompany(company.id).filter(e=>e.status==="active");
  const withBadges=all.filter(e=>(e.badges||[]).length>0).sort((a,b)=>(b.badges||[]).length-(a.badges||[]).length);
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
          {e.badges.map(b=><div key={b} className="inline-flex gap-1 items-center py-1 pr-2 pl-2.5 bg-warn-bg text-warn border border-warn-ln rounded-full text-xs font-semibold">
            <I n="award" s={11}/>{b}
            {canAward&&<button onClick={()=>setRemoving({emp:e,badge:b})} className="bg-transparent border-0 p-0 ml-1 cursor-pointer text-warn opacity-60 flex"><I n="x" s={11}/></button>}
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
  const A=use(); const mob=useMedia("(max-width: 900px)");
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
  const A=use(); const mob=useMedia("(max-width: 900px)");
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
export function HrSettings(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const emp=A.hrCurrentEmp(); const company=A.hrCurrentCompany();
  const settings=A.hrCompanySettings[company.id]||HR_COMPANY_SETTINGS_DEFAULT;
  const [d,setD]=useState({...settings});
  useEffect(()=>setD({...settings}),[JSON.stringify(settings)]);
  const dirty=JSON.stringify(d)!==JSON.stringify(settings);
  const save=()=>A.updateCompanySettings(company.id,d);
  const setMod=(m,v)=>setD(p=>({...p,modules:{...p.modules,[m]:v}}));
  const setSection=(sec,k,v)=>setD(p=>({...p,[sec]:{...p[sec],[k]:v}}));

  return <div style={{maxWidth:900}}>
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

    <Card pad={mob?20:26} style={{borderRadius:16,marginBottom:16}}>
      <Lbl>Leave policy</Lbl>
      <div className={`grid gap-3 mb-3.5 ${mob?"grid-cols-1":"grid-cols-3"}`}>
        <Field label="Annual vacation (days)"><Input type="number" value={d.leave.annualVacationDays} onChange={e=>setSection("leave","annualVacationDays",Number(e.target.value)||15)}/></Field>
        <Field label="Sick days"><Input type="number" value={d.leave.sickDays} onChange={e=>setSection("leave","sickDays",Number(e.target.value)||10)}/></Field>
        <Field label="Personal days"><Input type="number" value={d.leave.personalDays} onChange={e=>setSection("leave","personalDays",Number(e.target.value)||3)}/></Field>
      </div>
      <Field label="Minimum advance notice (days)"><Input type="number" value={d.leave.advanceNoticeDays} onChange={e=>setSection("leave","advanceNoticeDays",Number(e.target.value)||14)}/></Field>
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
export function HrIntegrations(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
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
        <Banner tone="brand" icon="info" title="Choose your device">Select your device vendor. We'll walk you through the connection steps.</Banner>
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
        <Banner tone="brand" icon="upload" title="Migration wizard">We'll import employees, roles, salaries and (where available) attendance history. Your existing NorthHire data won't be overwritten.</Banner>
        <div className="flex flex-col gap-2">
          {A.PRIOR_HR_VENDORS.map(v=><button key={v.id} onClick={()=>{A.connectPriorSystem(company.id,v.name); setShowImport(false); setTimeout(()=>A.toast("Import started — you'll get a summary email when it's done.","ok"),200);}}
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
