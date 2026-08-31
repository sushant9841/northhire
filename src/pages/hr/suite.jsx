import { useState, useEffect } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C, SH } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import {
  Btn, Card, Tag, Field, Input, Sel, Area, CheckRow, Banner, Lbl, Modal, Switch, DatePicker,
  SmartPortrait, Empty,
} from "../../design/primitives.jsx";
import { _fmtDate } from "../../helpers/utils.js";
import { HR_ROLES, HR_COMPANY_SETTINGS_DEFAULT, PUNCH_VENDORS, PRIOR_HR_VENDORS } from "../../store/seed/hrCompanySettings.js";
import { HR_DEPARTMENTS } from "../../store/seed/hrDepartments.js";
import { InlineList } from "../shared/formControls.jsx";
import { TrainingCard } from "../shared/cards.jsx";

export function HrLoginPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const remembered=(()=>{try{return JSON.parse(localStorage.getItem("northhire.hr.remember")||"null");}catch{return null;}})();
  const [company,setCompany]=useState(remembered?.company||"PCL Construction");
  const [loginId,setLoginId]=useState(remembered?.loginId||"");
  const [pw,setPw]=useState("");
  const [remember,setRemember]=useState(!!remembered);
  const [err,setErr]=useState(""); const [busy,setBusy]=useState(false);

  const submit=()=>{setErr(""); setBusy(true);
    setTimeout(()=>{const r=A.hrLogin(company,loginId,pw,remember);
      setBusy(false);
      if(!r.ok){setErr(r.msg);return;}
      A.go("hrDashboard");
    },200);
  };
  const demoAs=(id)=>{setLoginId(id); setPw("pcl2026");
    setTimeout(()=>{const r=A.hrLogin("PCL Construction",id,"pcl2026",remember); if(!r.ok)setErr(r.msg); else A.go("hrDashboard");},60);};

  return <div style={{background:`linear-gradient(135deg,#0A1929 0%,${C.ink} 60%,#152538 100%)`,minHeight:"100vh",
    display:"flex",flexDirection:"column",color:"#fff"}}>
    <div style={{padding:mob?"24px 20px":"32px 40px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <button onClick={()=>A.go("home")} style={{display:"flex",alignItems:"center",gap:10,background:"none",border:"none",
        color:"#fff",cursor:"pointer",fontFamily:"inherit"}}>
        <div style={{width:34,height:34,borderRadius:9,background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.15)",
          display:"flex",alignItems:"center",justifyContent:"center"}}><I n="hex" s={18} c="#fff"/></div>
        <span style={{fontSize:16.5,fontWeight:720,letterSpacing:"-.02em"}}>NorthHire <span style={{color:"#6AACFF",fontWeight:600}}>HR Suite</span></span>
      </button>
      <button onClick={()=>A.go("home")} style={{background:"none",border:"1px solid rgba(255,255,255,.2)",color:"#fff",
        padding:"7px 14px",borderRadius:8,cursor:"pointer",fontFamily:"inherit",fontSize:13.5,fontWeight:600}}>← Back to NorthHire</button>
    </div>
    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:mob?"12px 20px 32px":"20px 40px 60px"}}>
      <div style={{width:"100%",maxWidth:mob?420:960,display:"grid",gridTemplateColumns:mob?"1fr":"1.05fr .95fr",
        gap:mob?24:44,alignItems:"center"}}>
        {!mob&&<div>
          <div style={{fontSize:13,fontWeight:700,color:"#6AACFF",letterSpacing:".08em",textTransform:"uppercase",marginBottom:16}}>Enterprise HR Suite</div>
          <h1 style={{fontSize:44,fontWeight:750,letterSpacing:"-.04em",margin:"0 0 16px",lineHeight:1.08}}>
            Your entire workforce.<br/>One place.</h1>
          <p style={{fontSize:16,color:"rgba(255,255,255,.65)",lineHeight:1.65,marginBottom:22,maxWidth:400}}>
            Directory, attendance, leave, tasks, chat, calendar, invoices, payroll — every employee record synced with their public NorthHire profile.</p>
          <div style={{display:"flex",flexDirection:"column",gap:12,fontSize:14,color:"rgba(255,255,255,.75)"}}>
            {[["shield","Role-based access — Owner, Admin, HR, Finance, Employee"],
              ["users","Directory synced with public NorthHire profiles"],
              ["calendar","Attendance, leave, calendar & tasks in one flow"],
              ["mail","Internal chat with 1:1 and group threads"]].map(([ic,txt])=>
              <div key={txt} style={{display:"flex",gap:10,alignItems:"center"}}>
                <span style={{color:"#6AACFF",display:"flex"}}><I n={ic} s={17}/></span>{txt}</div>)}
          </div>
        </div>}
        <div style={{background:"#fff",borderRadius:20,padding:mob?24:34,color:C.text,boxShadow:"0 40px 80px -20px rgba(0,0,0,.5)"}}>
          <div style={{marginBottom:22}}>
            <h2 style={{fontSize:24,fontWeight:730,letterSpacing:"-.03em",margin:"0 0 8px"}}>Sign in to HR Suite</h2>
            <p style={{fontSize:14,color:C.text2,margin:0}}>Your Enterprise workforce login.</p></div>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <Field label="Company"><Input icon="building" value={company} onChange={e=>{setCompany(e.target.value);setErr("");}}
              placeholder="e.g. PCL Construction" onKeyDown={e=>e.key==="Enter"&&submit()}/></Field>
            <Field label="Login ID" hint="Your work email or the part before @ (e.g. sofia.r).">
              <Input icon="user" value={loginId} onChange={e=>{setLoginId(e.target.value);setErr("");}} placeholder="jean.dupuis"
                onKeyDown={e=>e.key==="Enter"&&submit()}/></Field>
            <Field label="Password"><Input icon="lock" type="password" value={pw} onChange={e=>{setPw(e.target.value);setErr("");}}
              placeholder="Your password" onKeyDown={e=>e.key==="Enter"&&submit()}/></Field>
            <CheckRow on={remember} onChange={setRemember} label="Remember me on this device"
              sub="Company name and login ID stay filled in next time."/>
            {err&&<Banner tone="danger" icon="alert" title="Sign-in failed">{err}</Banner>}
            <Btn kind="primary" size="lg" full iconR="arrowR" onClick={submit} disabled={busy}>{busy?"Signing in…":"Enter HR Suite"}</Btn>
          </div>
          <div style={{marginTop:16,padding:14,background:C.tint,borderRadius:12,border:`1px solid ${C.line2}`}}>
            <div style={{fontSize:11.5,fontWeight:700,color:C.brand,letterSpacing:".05em",textTransform:"uppercase",marginBottom:8}}>Demo accounts — PCL Construction</div>
            <div style={{display:"grid",gap:6}}>
              {[["rachel.martel","Owner"],["priya.r","Admin"],["linda.o","HR"],["isaac.c","Finance"],["daniel.k","Employee"]].map(([id,r])=>
                <button key={id} onClick={()=>demoAs(id)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                  background:"#fff",border:`1px solid ${C.line}`,borderRadius:8,padding:"8px 12px",cursor:"pointer",fontFamily:"inherit"}}>
                  <span style={{fontSize:12.5,color:C.text,fontWeight:640}}>{id}</span>
                  <span style={{fontSize:11.5,color:C.brand,fontWeight:640}}>{r} →</span></button>)}
              <div style={{fontSize:11,color:C.text3,marginTop:6,textAlign:"center"}}>Password for all demo accounts: <strong style={{color:C.text}}>pcl2026</strong></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>;
}

/* ═════════════ HR Shell — sidebar + top bar + main slot ═════════════ */


/* Placeholder for each HR module — Round C/D will replace with real content */
function _HrPlaceholder({title,body,icon="hex"}){
  return <Card pad={40} style={{borderRadius:20,textAlign:"center",maxWidth:600,margin:"0 auto"}}>
    <div style={{width:64,height:64,borderRadius:16,background:C.wash,color:C.brand,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px"}}>
      <I n={icon} s={32}/></div>
    <h2 style={{fontSize:22,fontWeight:730,letterSpacing:"-.03em",color:C.text,margin:"0 0 10px"}}>{title}</h2>
    <p style={{fontSize:14.5,color:C.text2,lineHeight:1.65,margin:0}}>{body}</p>
  </Card>;
}

/* ═════ Dashboard — real content for Round B; each module gets its own function ═════ */

export function HrDashboard(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const emp=A.hrCurrentEmp(); const company=A.hrCurrentCompany();
  if(!emp) return null;
  const myTasks=A.hrTasks.filter(t=>t.assignee===emp.id&&t.status!=="done");
  const todayAttendance=A.hrAttendance.find(a=>a.employee===emp.id&&a.date===_fmtDate(new Date()));
  const pendingLeave=A.hrLeave.filter(l=>l.status==="pending");
  const myLeave=A.hrLeave.filter(l=>l.employee===emp.id);
  const upcomingEvents=A.hrEvents.filter(ev=>new Date(ev.when)>=new Date()).sort((a,b)=>new Date(a.when)-new Date(b.when)).slice(0,3);
  const teamSize=A.hrEmpsAtCompany(company.id).filter(e=>e.status==="active").length;
  const openInvoices=A.hrInvoices.filter(i=>i.status==="pending"||i.status==="overdue");
  const overdueInvoices=A.hrInvoices.filter(i=>i.status==="overdue");
  const dept=A.HR_DEPARTMENTS.find(d=>d.id===emp.dept);

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
      {label:"Leave balance",value:15-myLeave.filter(l=>l.status==="approved"&&l.type==="Vacation").reduce((s,l)=>s+l.days,0),icon:"calendar"},
      {label:"Badges",value:emp.badges.length,icon:"award"}];
  })();

  return <div>
    <div style={{marginBottom:24}}>
      <div style={{fontSize:mob?24:30,fontWeight:740,color:C.text,letterSpacing:"-.03em"}}>Welcome back, {emp.name.split(" ")[0]}.</div>
      <div style={{fontSize:14,color:C.text2,marginTop:6}}>
        {new Date().toLocaleDateString("en-CA",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}
        {dept&&<> • {dept.name}</>}</div>
    </div>

    <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"repeat(4,1fr)",gap:12,marginBottom:22}}>
      {kpis.map(k=><Card key={k.label} pad={mob?18:22} style={{borderRadius:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
          <div style={{width:36,height:36,borderRadius:10,background:C.wash,color:k.tone||C.brand,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <I n={k.icon} s={17}/></div></div>
        <div style={{fontSize:mob?22:26,fontWeight:730,color:k.tone||C.text,letterSpacing:"-.03em",lineHeight:1}}>{k.value}</div>
        <div style={{fontSize:12.5,color:C.text3,marginTop:6}}>{k.label}</div>
      </Card>)}
    </div>

    <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1.3fr 1fr",gap:16}}>
      <div>
        <Card pad={mob?20:26} style={{borderRadius:20,marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <Lbl style={{margin:0}}>Attendance today</Lbl>
            <Tag tone={todayAttendance?"ok":"neutral"} sm>{todayAttendance?(todayAttendance.clockOut?"Signed out":"On the clock"):"Not clocked in"}</Tag>
          </div>
          {!todayAttendance?<div>
            <p style={{fontSize:14,color:C.text2,margin:"0 0 14px",lineHeight:1.6}}>Start your day by punching in.</p>
            <Btn kind="primary" icon="clock" onClick={()=>{const r=A.punchIn(emp.id,"web"); if(!r.ok)alert(r.msg);}}>Punch in</Btn>
          </div>:!todayAttendance.clockOut?<div>
            <div style={{fontSize:15,color:C.text,marginBottom:8}}>Punched in at <strong>{todayAttendance.clockIn}</strong></div>
            <p style={{fontSize:13,color:C.text2,margin:"0 0 14px"}}>Have a great day. Punch out when you're wrapping up.</p>
            <Btn kind="outline" icon="clock" onClick={()=>{const r=A.punchOut(emp.id); if(!r.ok)alert(r.msg);}}>Punch out</Btn>
          </div>:<div>
            <div style={{fontSize:14.5,color:C.text}}>In: <strong>{todayAttendance.clockIn}</strong> · Out: <strong>{todayAttendance.clockOut}</strong> · Total: <strong style={{color:C.brand}}>{todayAttendance.hours}h</strong></div>
            <p style={{fontSize:13,color:C.text2,margin:"8px 0 0"}}>Good work today. See you tomorrow.</p></div>}
        </Card>

        <Card pad={mob?20:26} style={{borderRadius:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <Lbl style={{margin:0}}>My tasks</Lbl>
            <Btn kind="ghost" size="sm" onClick={()=>A.go("hrTasks")}>View all</Btn>
          </div>
          {myTasks.length===0?<div style={{padding:"16px 0",color:C.text3,fontSize:14}}>No open tasks — nicely done.</div>
            :<div style={{display:"flex",flexDirection:"column",gap:8}}>
              {myTasks.slice(0,5).map(t=><div key={t.id} style={{display:"flex",gap:12,alignItems:"center",padding:"12px 14px",background:C.bg,borderRadius:10,border:`1px solid ${C.line}`}}>
                <input type="checkbox" checked={t.status==="done"} onChange={()=>A.updateTaskStatus(t.id,t.status==="done"?"todo":"done")} style={{width:18,height:18,cursor:"pointer",flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13.5,fontWeight:600,color:C.text}}>{t.title}</div>
                  <div style={{fontSize:12,color:C.text3,marginTop:2}}>Due {t.due}</div></div>
                <Tag tone={t.priority==="high"?"danger":t.priority==="medium"?"warn":"neutral"} sm>{t.priority}</Tag>
              </div>)}</div>}
        </Card>
      </div>

      <div>
        <Card pad={mob?20:24} style={{borderRadius:20,marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <Lbl style={{margin:0}}>Upcoming events</Lbl>
            <Btn kind="ghost" size="sm" onClick={()=>A.go("hrCalendar")}>Calendar</Btn>
          </div>
          {upcomingEvents.length===0?<div style={{padding:"12px 0",color:C.text3,fontSize:13.5}}>Nothing coming up.</div>
            :<div style={{display:"flex",flexDirection:"column",gap:8}}>
              {upcomingEvents.map(ev=><div key={ev.id} style={{padding:"10px 12px",background:C.bg,borderRadius:10,border:`1px solid ${C.line}`}}>
                <div style={{fontSize:13.5,fontWeight:640,color:C.text}}>{ev.title}</div>
                <div style={{fontSize:12,color:C.text3,marginTop:2}}>{new Date(ev.when).toLocaleDateString("en-CA",{weekday:"short",month:"short",day:"numeric"})} • {ev.time}</div>
              </div>)}</div>}
        </Card>

        {(emp.role==="hr"||emp.role==="admin"||emp.role==="owner")&&<Card pad={mob?20:24} style={{borderRadius:20,marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <Lbl style={{margin:0}}>Pending leave requests</Lbl>
            <Btn kind="ghost" size="sm" onClick={()=>A.go("hrLeave")}>Review</Btn>
          </div>
          {pendingLeave.length===0?<div style={{padding:"12px 0",color:C.text3,fontSize:13.5}}>Nothing to review.</div>
            :<div style={{display:"flex",flexDirection:"column",gap:8}}>
              {pendingLeave.slice(0,3).map(r=>{const who=A.hrEmp(r.employee);
                return <div key={r.id} style={{padding:"10px 12px",background:C.bg,borderRadius:10,border:`1px solid ${C.line}`}}>
                  <div style={{fontSize:13.5,fontWeight:640,color:C.text}}>{who?.name}</div>
                  <div style={{fontSize:12,color:C.text3,marginTop:2}}>{r.type} • {r.from} → {r.to} ({r.days}d)</div>
                </div>;})}</div>}
        </Card>}

        <Card pad={mob?20:24} style={{borderRadius:20}}>
          <Lbl>Quick actions</Lbl>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
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
      <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{flex:"1 1 240px",minWidth:0}}>
          <Input icon="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by name, title, or email"/></div>
        <Sel value={dept} onChange={e=>setDept(e.target.value)} style={{maxWidth:200}}>
          <option value="all">All departments</option>
          {A.HR_DEPARTMENTS.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</Sel>
        <Sel value={role} onChange={e=>setRole(e.target.value)} style={{maxWidth:160}}>
          <option value="all">All roles</option>
          {A.HR_ROLES.map(r=><option key={r.k} value={r.k}>{r.label}</option>)}</Sel>
        <div style={{display:"flex",background:C.bg,borderRadius:9,padding:3,border:`1px solid ${C.line}`}}>
          {[["grid","layout"],["list","file"]].map(([v,ic])=><button key={v} onClick={()=>setView(v)} style={{background:view===v?"#fff":"transparent",border:"none",padding:"7px 10px",borderRadius:6,cursor:"pointer",color:view===v?C.brand:C.text3,boxShadow:view===v?SH.sm:"none",display:"flex"}}><I n={ic} s={15}/></button>)}
        </div>
      </div>
      <div style={{fontSize:12.5,color:C.text3,marginTop:12}}>{filtered.length} of {all.length} employees</div>
    </Card>

    {view==="grid"?
      <div style={{display:"grid",gridTemplateColumns:`repeat(auto-fill,minmax(${mob?260:280}px,1fr))`,gap:12}}>
        {filtered.map(e=>{const d=A.HR_DEPARTMENTS.find(x=>x.id===e.dept);
          return <div key={e.id} data-card onClick={()=>setSelected(e.id)} style={{background:"#fff",border:`1px solid ${C.line}`,borderRadius:14,padding:18,cursor:"pointer"}}>
            <div style={{display:"flex",gap:12,marginBottom:12}}>
              <SmartPortrait seed={e.seed} size={48} radius={12}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14.5,fontWeight:660,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.name}</div>
                <div style={{fontSize:12.5,color:C.text3,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.title}</div>
              </div>
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {d&&<Tag tone="neutral" sm>{d.name}</Tag>}
              <Tag tone={e.role==="owner"?"warn":e.role==="admin"?"brand":e.role==="hr"?"ok":e.role==="finance"?"violet":"neutral"} sm>{e.role}</Tag>
            </div>
          </div>;})}
      </div>
      :
      <Card pad={0} style={{borderRadius:14,overflow:"hidden"}}>
        {filtered.map((e,i)=>{const d=A.HR_DEPARTMENTS.find(x=>x.id===e.dept);
          return <div key={e.id} onClick={()=>setSelected(e.id)} style={{display:"flex",gap:14,alignItems:"center",padding:mob?"12px 14px":"14px 20px",borderTop:i>0?`1px solid ${C.lineSoft}`:"none",cursor:"pointer",transition:"background .16s"}}
            onMouseEnter={ev=>ev.currentTarget.style.background=C.bg}
            onMouseLeave={ev=>ev.currentTarget.style.background="transparent"}>
            <SmartPortrait seed={e.seed} size={38} radius={10}/>
            <div style={{flex:"1 1 200px",minWidth:0}}>
              <div style={{fontSize:14,fontWeight:640,color:C.text}}>{e.name}</div>
              <div style={{fontSize:12,color:C.text3,marginTop:2}}>{e.title}</div>
            </div>
            {!mob&&d&&<div style={{fontSize:12.5,color:C.text2,minWidth:140}}>{d.name}</div>}
            {!mob&&<div style={{fontSize:12.5,color:C.text2,minWidth:120}}>{e.city}, {e.prov}</div>}
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
    <div style={{display:"flex",gap:16,alignItems:"center",marginBottom:20,flexWrap:"wrap"}}>
      <SmartPortrait seed={e.seed} size={64} radius={16}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:20,fontWeight:730,color:C.text,letterSpacing:"-.025em"}}>{e.name}</div>
        <div style={{fontSize:14,color:C.text2,marginTop:3}}>{e.title}</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8}}>
          {d&&<Tag tone="neutral" sm>{d.name}</Tag>}
          <Tag tone={e.role==="owner"?"warn":e.role==="admin"?"brand":e.role==="hr"?"ok":e.role==="finance"?"violet":"neutral"} sm>{e.role}</Tag>
        </div>
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:14,fontSize:13.5}}>
      {[["Location",`${e.city}, ${e.prov}`],["Email",e.email],["Phone",e.phone],
        ["Manager",mgr?.name||"—"],["Hired",e.hired],["Tenure",publicProfile.tenureYears?`${publicProfile.tenureYears} years`:"—"]].map(([l,v])=>
        <div key={l}><div style={{fontSize:11,fontWeight:700,color:C.text3,letterSpacing:".05em",textTransform:"uppercase",marginBottom:4}}>{l}</div>
          <div style={{color:C.text}}>{v}</div></div>)}
    </div>
    {e.skills.length>0&&<div style={{marginTop:16}}>
      <div style={{fontSize:11,fontWeight:700,color:C.text3,letterSpacing:".05em",textTransform:"uppercase",marginBottom:8}}>Skills</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
        {e.skills.map(s=><Tag key={s} tone="brand" sm>{s}</Tag>)}</div>
    </div>}
    {e.badges.length>0&&<div style={{marginTop:16}}>
      <div style={{fontSize:11,fontWeight:700,color:C.text3,letterSpacing:".05em",textTransform:"uppercase",marginBottom:8}}>Badges & recognition</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
        {e.badges.map(b=><Tag key={b} tone="warn" sm icon="award">{b}</Tag>)}</div>
    </div>}
    <div style={{marginTop:20,display:"flex",gap:10,justifyContent:"flex-end"}}>
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
    <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 380px",gap:16,alignItems:"start"}}>
      <div>
        <Card pad={mob?20:26} style={{marginBottom:16,borderRadius:16}}>
          <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:20}}>
            <SmartPortrait seed={emp.seed} size={70} radius={16}/>
            <div>
              <div style={{fontSize:20,fontWeight:720,color:C.text,letterSpacing:"-.025em"}}>{emp.name}</div>
              <div style={{fontSize:13.5,color:C.text2,marginTop:4}}>{emp.title}</div>
            </div>
          </div>

          <Lbl>Personal details</Lbl>
          <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12,marginBottom:20}}>
            <Field label="Full name"><Input value={d.name} onChange={e=>set("name",e.target.value)}/></Field>
            <Field label="Job title"><Input value={d.title} onChange={e=>set("title",e.target.value)}/></Field>
            <Field label="Email"><Input icon="mail" value={d.email} onChange={e=>set("email",e.target.value)}/></Field>
            <Field label="Phone"><Input icon="phone" value={d.phone} onChange={e=>set("phone",e.target.value)}/></Field>
            <Field label="City"><Input icon="pin" value={d.city} onChange={e=>set("city",e.target.value)}/></Field>
            <Field label="Province"><Input value={d.prov} onChange={e=>set("prov",e.target.value)}/></Field>
          </div>

          <Lbl>Skills</Lbl>
          <div style={{marginBottom:20}}>
            <InlineList value={d.skills||[]} onChange={v=>set("skills",v)} icon="sparkle" placeholder="Add a skill and press Enter"/>
          </div>

          <div style={{display:"flex",gap:10,justifyContent:"flex-end",paddingTop:18,borderTop:`1px solid ${C.lineSoft}`}}>
            {dirty&&<Btn kind="ghost" onClick={()=>setD({...emp})}>Discard</Btn>}
            <Btn kind="primary" icon="check" disabled={!dirty} onClick={save}>{dirty?"Save changes":"Saved"}</Btn>
          </div>
        </Card>

        <Card pad={mob?20:26} style={{borderRadius:16,marginBottom:16}}>
          <Lbl>Public NorthHire profile visibility</Lbl>
          <Banner tone="brand" icon="info" title="How this works" style={{marginBottom:16}}>
            Everything you show here appears on your public profile page across NorthHire. Employers searching for talent, and anyone viewing your company's page, will see what you allow.</Banner>
          <div style={{display:"flex",flexDirection:"column",gap:2}}>
            {visItems.map(item=>{const on=d.visibility?.[item.k]!==false;
              return <div key={item.k} style={{display:"flex",gap:12,alignItems:"center",padding:"12px 12px",borderRadius:9,transition:"background .16s"}}
                onMouseEnter={e=>e.currentTarget.style.background=C.bg}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13.5,fontWeight:600,color:C.text}}>{item.l}</div>
                  <div style={{fontSize:12,color:C.text3,marginTop:2}}>{on?"Visible publicly":"Hidden from public profile"}{item.v?` — currently: ${item.v}`:""}</div>
                </div>
                <Switch on={on} onChange={v=>setVis(item.k,v)}/>
              </div>;})}
          </div>
        </Card>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <Card pad={20} style={{borderRadius:16,background:`linear-gradient(135deg,${C.tint} 0%,#F0F7FF 100%)`,border:`1px solid ${C.line2}`}}>
          <div style={{fontSize:11,fontWeight:700,color:C.brand,letterSpacing:".05em",textTransform:"uppercase",marginBottom:10}}>Public profile preview</div>
          <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:14}}>
            <SmartPortrait seed={emp.seed} size={50} radius={12}/>
            <div>
              <div style={{fontSize:15,fontWeight:660,color:C.text}}>{emp.name}</div>
              {publicView.title&&<div style={{fontSize:12.5,color:C.text2,marginTop:2}}>{publicView.title}</div>}
            </div>
          </div>
          <div style={{fontSize:13,color:C.text2,lineHeight:1.7}}>
            {publicView.department&&<div>• {publicView.department} at {publicView.company}</div>}
            {publicView.tenureYears&&<div>• {publicView.tenureYears} years at company</div>}
            {publicView.manager&&<div>• Reports to {publicView.manager}</div>}
            {publicView.trainingsCompleted>0&&<div>• {publicView.trainingsCompleted} trainings completed</div>}
            {publicView.badges?.length>0&&<div style={{marginTop:8}}>
              <div style={{fontSize:11,color:C.text3,marginBottom:6}}>Recognitions:</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                {publicView.badges.map(b=><Tag key={b} tone="warn" sm icon="award">{b}</Tag>)}</div>
            </div>}
            {publicView.phone&&<div style={{marginTop:8}}>• Phone: {publicView.phone}</div>}
            {publicView.email&&<div>• Email: {publicView.email}</div>}
          </div>
        </Card>

        <Card pad={20} style={{borderRadius:16}}>
          <Lbl>Your badges</Lbl>
          {emp.badges.length===0
            ? <div style={{fontSize:13,color:C.text3}}>No badges yet.</div>
            : <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {emp.badges.map(b=><div key={b} style={{display:"flex",gap:11,alignItems:"center",padding:"10px 12px",background:C.bg,borderRadius:10}}>
                  <div style={{width:32,height:32,borderRadius:9,background:C.warnBg,color:C.warn,display:"flex",alignItems:"center",justifyContent:"center"}}><I n="award" s={16}/></div>
                  <div style={{fontSize:13,fontWeight:600,color:C.text}}>{b}</div>
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
  const today=_fmtDate(new Date());
  const todayRecord=A.hrAttendance.find(a=>a.employee===emp.id&&a.date===today);

  const records=view==="mine"
    ? A.hrAttendance.filter(a=>a.employee===emp.id)
    : A.hrAttendance.filter(a=>empFilter==="all"||a.employee===empFilter);
  const sorted=[...records].sort((a,b)=>b.date.localeCompare(a.date));

  const settings=A.hrCompanySettings[company.id]||HR_COMPANY_SETTINGS_DEFAULT;
  const punchConn=settings.integrations.punchMachine.connected;

  return <div>
    <Card pad={mob?20:24} style={{marginBottom:16,borderRadius:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:12}}>
        <div>
          <Lbl style={{margin:0}}>Your attendance today</Lbl>
          <div style={{fontSize:12.5,color:C.text3,marginTop:4}}>{new Date().toLocaleDateString("en-CA",{weekday:"long",month:"long",day:"numeric"})}</div>
        </div>
        <Tag tone={todayRecord?"ok":"neutral"} sm>{todayRecord?(todayRecord.clockOut?"Signed out":"On the clock"):"Not clocked in"}</Tag>
      </div>
      {!todayRecord?
        <Btn kind="primary" size="lg" icon="clock" onClick={()=>{const r=A.punchIn(emp.id,"web"); if(!r.ok)alert(r.msg);}}>Punch in now</Btn>
        :!todayRecord.clockOut?
        <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
          <div style={{fontSize:15,color:C.text2}}>Punched in at <strong style={{color:C.text}}>{todayRecord.clockIn}</strong> via {todayRecord.source}</div>
          <Btn kind="outline" icon="clock" onClick={()=>{const r=A.punchOut(emp.id); if(!r.ok)alert(r.msg);}}>Punch out</Btn>
        </div>
        :
        <div style={{fontSize:15,color:C.text2}}>In: <strong>{todayRecord.clockIn}</strong> · Out: <strong>{todayRecord.clockOut}</strong> · Total: <strong style={{color:C.brand}}>{todayRecord.hours}h</strong></div>}
    </Card>

    {canSeeAll&&<Card pad={mob?16:20} style={{marginBottom:16,borderRadius:14,background:punchConn?C.okBg:C.warnBg,border:`1px solid ${punchConn?C.okLn:C.warnLn}`}}>
      <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{width:40,height:40,borderRadius:10,background:"#fff",color:punchConn?C.ok:C.warn,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><I n={punchConn?"check":"clock"} s={20}/></div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:660,color:C.text}}>{punchConn?`Punch machine connected: ${settings.integrations.punchMachine.vendor}`:"No punch machine connected"}</div>
          <div style={{fontSize:12.5,color:C.text2,marginTop:3}}>{punchConn?`Last sync: ${new Date(settings.integrations.punchMachine.lastSync).toLocaleString("en-CA")}`:"Connect your on-site punch clock or biometric reader to auto-sync attendance."}</div>
        </div>
        <Btn kind={punchConn?"outline":"primary"} size="sm" onClick={()=>A.go("hrIntegrations")}>{punchConn?"Manage":"Connect"}</Btn>
      </div>
    </Card>}

    <Card pad={mob?16:20} style={{borderRadius:14}}>
      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:14,flexWrap:"wrap"}}>
        <Lbl style={{margin:0,flex:1}}>{view==="mine"?"My history":"Team log"}</Lbl>
        {canSeeAll&&<div style={{display:"flex",background:C.bg,borderRadius:8,padding:2,border:`1px solid ${C.line}`}}>
          {[["mine","Mine"],["team","Team"]].map(([v,l])=><button key={v} onClick={()=>setView(v)} style={{background:view===v?"#fff":"transparent",border:"none",padding:"6px 12px",borderRadius:6,cursor:"pointer",fontFamily:"inherit",fontSize:12.5,fontWeight:640,color:view===v?C.brand:C.text3}}>{l}</button>)}
        </div>}
        {canSeeAll&&view==="team"&&<Sel value={empFilter} onChange={e=>setEmpFilter(e.target.value)} style={{maxWidth:200}}>
          <option value="all">All employees</option>
          {A.hrEmpsAtCompany(company.id).map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</Sel>}
      </div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:600}}>
          <thead><tr style={{borderBottom:`2px solid ${C.line}`,textAlign:"left"}}>
            <th style={{padding:"10px 12px",fontSize:11.5,fontWeight:700,color:C.text3,letterSpacing:".05em",textTransform:"uppercase"}}>Date</th>
            {view==="team"&&<th style={{padding:"10px 12px",fontSize:11.5,fontWeight:700,color:C.text3,letterSpacing:".05em",textTransform:"uppercase"}}>Employee</th>}
            <th style={{padding:"10px 12px",fontSize:11.5,fontWeight:700,color:C.text3,letterSpacing:".05em",textTransform:"uppercase"}}>In</th>
            <th style={{padding:"10px 12px",fontSize:11.5,fontWeight:700,color:C.text3,letterSpacing:".05em",textTransform:"uppercase"}}>Out</th>
            <th style={{padding:"10px 12px",fontSize:11.5,fontWeight:700,color:C.text3,letterSpacing:".05em",textTransform:"uppercase"}}>Hours</th>
            <th style={{padding:"10px 12px",fontSize:11.5,fontWeight:700,color:C.text3,letterSpacing:".05em",textTransform:"uppercase"}}>Source</th>
          </tr></thead>
          <tbody>
            {sorted.slice(0,50).map(r=>{const who=A.hrEmp(r.employee);
              return <tr key={r.id} style={{borderBottom:`1px solid ${C.lineSoft}`,transition:"background .16s"}}
                onMouseEnter={e=>e.currentTarget.style.background=C.bg}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <td style={{padding:"12px 12px",fontSize:13,color:C.text}}>{r.date}</td>
                {view==="team"&&<td style={{padding:"12px 12px",fontSize:13,color:C.text}}>{who?.name||"—"}</td>}
                <td style={{padding:"12px 12px",fontSize:13,color:C.text}}>{r.clockIn||"—"}</td>
                <td style={{padding:"12px 12px",fontSize:13,color:C.text2}}>{r.clockOut||"—"}</td>
                <td style={{padding:"12px 12px",fontSize:13,color:C.brand,fontWeight:600}}>{r.hours||0}h</td>
                <td style={{padding:"12px 12px",fontSize:12.5,color:C.text3}}>{r.source}</td>
              </tr>;})}
            {sorted.length===0&&<tr><td colSpan={view==="team"?6:5} style={{padding:24,textAlign:"center",color:C.text3,fontSize:13}}>No attendance records yet.</td></tr>}
          </tbody>
        </table>
      </div>
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
  const pending=A.hrLeave.filter(l=>l.status==="pending");
  const list=tab==="mine"?myLeave:tab==="pending"?pending:A.hrLeave;
  const sorted=[...list].sort((a,b)=>b.requestedAt-a.requestedAt);

  const submitReq=()=>{if(!req.from||!req.to)return;
    const days=Math.max(1,Math.ceil((new Date(req.to)-new Date(req.from))/(1000*60*60*24))+1);
    A.requestLeave({...req,days}); setReq({type:"Vacation",from:"",to:"",reason:""}); setShowReq(false);};

  return <div>
    <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"repeat(4,1fr)",gap:12,marginBottom:16}}>
      {[
        {l:"Vacation days used",v:usedVacation,total:settings.leave.annualVacationDays,tone:C.brand},
        {l:"Sick days available",v:settings.leave.sickDays,tone:C.ok},
        {l:"Personal days",v:settings.leave.personalDays,tone:C.violet},
        {l:"My open requests",v:myLeave.filter(l=>l.status==="pending").length,tone:C.warn}
      ].map(k=><Card key={k.l} pad={mob?16:20} style={{borderRadius:14}}>
        <div style={{fontSize:mob?22:26,fontWeight:720,color:k.tone,letterSpacing:"-.025em"}}>{k.v}{k.total?<span style={{fontSize:14,color:C.text3,fontWeight:500}}> / {k.total}</span>:""}</div>
        <div style={{fontSize:12,color:C.text3,marginTop:6}}>{k.l}</div>
      </Card>)}
    </div>

    <Card pad={mob?16:20} style={{borderRadius:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:10}}>
        <div style={{display:"flex",background:C.bg,borderRadius:8,padding:2,border:`1px solid ${C.line}`}}>
          {[["mine","My requests"],...(canApprove?[["pending","Pending ("+pending.length+")"],["all","All"]]:[])].map(([v,l])=>
            <button key={v} onClick={()=>setTab(v)} style={{background:tab===v?"#fff":"transparent",border:"none",padding:"7px 13px",borderRadius:6,cursor:"pointer",fontFamily:"inherit",fontSize:12.5,fontWeight:640,color:tab===v?C.brand:C.text3}}>{l}</button>)}
        </div>
        <Btn kind="primary" size="sm" icon="plus" onClick={()=>setShowReq(true)}>Request leave</Btn>
      </div>

      {sorted.length===0
        ? <div style={{padding:32,textAlign:"center",color:C.text3,fontSize:14}}>No leave records to show.</div>
        : <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {sorted.map(r=>{const who=A.hrEmp(r.employee);
              return <div key={r.id} style={{display:"flex",gap:14,alignItems:"center",padding:"12px 14px",background:C.bg,borderRadius:11,border:`1px solid ${C.line}`,flexWrap:"wrap"}}>
                <SmartPortrait seed={who?.seed||0} size={38} radius={10}/>
                <div style={{flex:"1 1 200px",minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:640,color:C.text}}>{who?.name} • {r.type}</div>
                  <div style={{fontSize:12.5,color:C.text3,marginTop:2}}>{r.from} → {r.to} ({r.days} day{r.days===1?"":"s"})</div>
                  {r.reason&&<div style={{fontSize:12.5,color:C.text2,marginTop:4,fontStyle:"italic"}}>"{r.reason}"</div>}
                </div>
                {r.status==="pending"&&canApprove&&r.employee!==emp.id?<div style={{display:"flex",gap:6}}>
                  <Btn kind="dangerSoft" size="xs" onClick={()=>A.decideLeave(r.id,"denied",emp.id)}>Deny</Btn>
                  <Btn kind="primary" size="xs" onClick={()=>A.decideLeave(r.id,"approved",emp.id)}>Approve</Btn>
                </div>:<Tag tone={r.status==="approved"?"ok":r.status==="denied"?"danger":"warn"} sm>{r.status}</Tag>}
              </div>;})}
          </div>}
    </Card>

    {showReq&&<Modal onClose={()=>setShowReq(false)} title="Request leave">
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <Field label="Type" required><Sel value={req.type} onChange={e=>setReq({...req,type:e.target.value})}>
          {["Vacation","Sick","Personal","Bereavement","Parental","Unpaid","Other"].map(t=><option key={t}>{t}</option>)}</Sel></Field>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Field label="From" required><DatePicker value={req.from} onChange={v=>setReq({...req,from:v})}/></Field>
          <Field label="To" required><DatePicker value={req.to} onChange={v=>setReq({...req,to:v})} min={req.from}/></Field>
        </div>
        <Field label="Reason" hint="Optional but helpful for approver."><Area rows={3} value={req.reason} onChange={e=>setReq({...req,reason:e.target.value})} placeholder="Family trip, medical appointment, etc."/></Field>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn kind="ghost" onClick={()=>setShowReq(false)}>Cancel</Btn>
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
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
      <div style={{display:"flex",background:C.bg,borderRadius:8,padding:2,border:`1px solid ${C.line}`}}>
        {[["mine","My tasks"],...(canAssignOthers?[["assigned","Assigned by me"],["all","All company"]]:[])].map(([v,l])=>
          <button key={v} onClick={()=>setScope(v)} style={{background:scope===v?"#fff":"transparent",border:"none",padding:"7px 13px",borderRadius:6,cursor:"pointer",fontFamily:"inherit",fontSize:12.5,fontWeight:640,color:scope===v?C.brand:C.text3}}>{l}</button>)}
      </div>
      <Btn kind="primary" size="sm" icon="plus" onClick={()=>setShowAdd(true)}>New task</Btn>
    </div>

    <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(3,1fr)",gap:12}}>
      {cols.map(col=>{const tasks=source.filter(t=>t.status===col.k);
        return <div key={col.k} style={{background:C.bg,borderRadius:14,padding:12,minHeight:200}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 6px",marginBottom:10}}>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <div style={{width:8,height:8,borderRadius:99,background:col.tone}}/>
              <div style={{fontSize:12.5,fontWeight:700,color:C.text,letterSpacing:"-.01em"}}>{col.label}</div>
            </div>
            <Tag tone="neutral" sm>{tasks.length}</Tag>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {tasks.map(t=>{const assn=A.hrEmp(t.assignee); const by=A.hrEmp(t.assignedBy);
              return <div key={t.id} data-card style={{background:"#fff",border:`1px solid ${C.line}`,borderRadius:11,padding:12}}>
                <div style={{fontSize:13.5,fontWeight:600,color:C.text,marginBottom:8,lineHeight:1.4}}>{t.title}</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
                  <Tag tone={t.priority==="high"?"danger":t.priority==="medium"?"warn":"neutral"} sm>{t.priority}</Tag>
                  {t.tags?.map(tag=><Tag key={tag} tone="neutral" sm>{tag}</Tag>)}
                </div>
                <div style={{fontSize:11.5,color:C.text3,marginBottom:10,display:"flex",gap:8,flexWrap:"wrap"}}>
                  <span>Due {t.due}</span>
                  {assn&&<span>• {assn.name.split(" ")[0]}</span>}
                </div>
                <div style={{display:"flex",gap:4}}>
                  {col.k!=="todo"&&<Btn kind="ghost" size="xs" onClick={()=>A.updateTaskStatus(t.id,cols[cols.findIndex(c=>c.k===col.k)-1].k)}>←</Btn>}
                  {col.k!=="done"&&<Btn kind="ghost" size="xs" onClick={()=>A.updateTaskStatus(t.id,cols[cols.findIndex(c=>c.k===col.k)+1].k)}>→</Btn>}
                  {(t.assignedBy===emp.id||emp.role==="owner"||emp.role==="admin")&&<Btn kind="ghost" size="xs" icon="trash" onClick={()=>A.deleteTask(t.id)}/>}
                </div>
              </div>;})}
            {tasks.length===0&&<div style={{padding:20,textAlign:"center",fontSize:12.5,color:C.text3}}>No tasks here.</div>}
          </div>
        </div>;})}
    </div>

    {showAdd&&<Modal onClose={()=>setShowAdd(false)} title="New task">
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <Field label="What needs doing?" required><Input value={nt.title} onChange={e=>setNt({...nt,title:e.target.value})} placeholder="e.g. Review Q4 budget"/></Field>
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12}}>
          <Field label="Assign to">
            <Sel value={nt.assignee} onChange={e=>setNt({...nt,assignee:e.target.value})}>
              {A.hrEmpsAtCompany(company.id).filter(e=>e.status==="active").map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</Sel></Field>
          <Field label="Priority"><Sel value={nt.priority} onChange={e=>setNt({...nt,priority:e.target.value})}>
            {["low","medium","high"].map(p=><option key={p}>{p}</option>)}</Sel></Field>
        </div>
        <Field label="Due date" required><DatePicker value={nt.due} onChange={v=>setNt({...nt,due:v})} min={_fmtDate(new Date())}/></Field>
        <Field label="Tags"><InlineList value={nt.tags} onChange={v=>setNt({...nt,tags:v})} icon="sparkle" placeholder="Add tag"/></Field>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
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
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
      <div style={{display:"flex",background:C.bg,borderRadius:8,padding:2,border:`1px solid ${C.line}`}}>
        {[["upcoming","Upcoming ("+upcoming.length+")"],["past","Past"]].map(([v,l])=>
          <button key={v} onClick={()=>setTab(v)} style={{background:tab===v?"#fff":"transparent",border:"none",padding:"7px 13px",borderRadius:6,cursor:"pointer",fontFamily:"inherit",fontSize:12.5,fontWeight:640,color:tab===v?C.brand:C.text3}}>{l}</button>)}
      </div>
      {canAdd&&<Btn kind="primary" size="sm" icon="plus" onClick={()=>setShowAdd(true)}>New event</Btn>}
    </div>

    {list.length===0
      ? <Card pad={40} style={{borderRadius:14,textAlign:"center"}}>
          <div style={{width:56,height:56,borderRadius:14,background:C.wash,color:C.brand,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}><I n="calendar" s={26}/></div>
          <div style={{fontSize:16,fontWeight:660,color:C.text,marginBottom:6}}>{tab==="upcoming"?"Nothing coming up":"No past events"}</div>
          <div style={{fontSize:13,color:C.text3}}>{tab==="upcoming"?"Add your first event to get the team on the same page.":"Past events will appear here as they happen."}</div>
        </Card>
      : <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {list.map(ev=><Card key={ev.id} pad={mob?16:20} style={{borderRadius:14}}>
            <div style={{display:"flex",gap:14,alignItems:"flex-start",flexWrap:"wrap"}}>
              <div style={{width:60,textAlign:"center",background:C.tint,borderRadius:10,padding:"10px 6px",flexShrink:0}}>
                <div style={{fontSize:10.5,fontWeight:700,color:C.brand,letterSpacing:".05em",textTransform:"uppercase"}}>{new Date(ev.when).toLocaleDateString("en-CA",{month:"short"})}</div>
                <div style={{fontSize:22,fontWeight:730,color:C.brand,letterSpacing:"-.03em",lineHeight:1}}>{new Date(ev.when).getDate()}</div>
                <div style={{fontSize:10.5,color:C.brand,marginTop:3}}>{new Date(ev.when).toLocaleDateString("en-CA",{weekday:"short"})}</div>
              </div>
              <div style={{flex:"1 1 220px",minWidth:0}}>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:6}}>
                  <div style={{fontSize:16,fontWeight:660,color:C.text,letterSpacing:"-.015em"}}>{ev.title}</div>
                  <Tag tone={typeTone[ev.type]||"neutral"} sm icon={typeIcon[ev.type]||"calendar"}>{ev.type}</Tag>
                </div>
                <div style={{fontSize:13,color:C.text3,marginBottom:6,display:"flex",gap:12,flexWrap:"wrap"}}>
                  <span>{ev.time} • {ev.duration} min</span>
                  {ev.location&&<span>• {ev.location}</span>}
                </div>
                {ev.description&&<div style={{fontSize:13,color:C.text2,lineHeight:1.6}}>{ev.description}</div>}
              </div>
              {canAdd&&<Btn kind="ghost" size="xs" icon="trash" onClick={()=>A.deleteEvent(ev.id)}/>}
            </div>
          </Card>)}
        </div>}

    {showAdd&&<Modal onClose={()=>setShowAdd(false)} title="Add event" wide>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <Field label="Event title" required><Input value={ne.title} onChange={e=>setNe({...ne,title:e.target.value})} placeholder="e.g. Q4 Kickoff Meeting"/></Field>
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12}}>
          <Field label="Type"><Sel value={ne.type} onChange={e=>setNe({...ne,type:e.target.value})}>
            {["meeting","training","social","other"].map(t=><option key={t}>{t}</option>)}</Sel></Field>
          <Field label="Location"><Input value={ne.location} onChange={e=>setNe({...ne,location:e.target.value})} placeholder="Boardroom, Zoom, etc."/></Field>
        </div>
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr 1fr",gap:12}}>
          <Field label="Date" required><DatePicker value={ne.when} onChange={v=>setNe({...ne,when:v})} min={_fmtDate(new Date())}/></Field>
          <Field label="Time"><Input type="time" value={ne.time} onChange={e=>setNe({...ne,time:e.target.value})}/></Field>
          <Field label="Duration (min)"><Input type="number" min="15" step="15" value={ne.duration} onChange={e=>setNe({...ne,duration:Number(e.target.value)||60})}/></Field>
        </div>
        <Field label="Who's invited?"><Sel value={ne.invitees} onChange={e=>setNe({...ne,invitees:e.target.value})}>
          <option value="all">Everyone</option>
          {A.HR_DEPARTMENTS.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</Sel></Field>
        <Field label="Description"><Area rows={3} value={ne.description} onChange={e=>setNe({...ne,description:e.target.value})}/></Field>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
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

  return <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"280px 1fr",gap:12,height:"calc(100vh - 130px)"}}>
    {(showThreads||!mob)&&<Card pad={0} style={{borderRadius:14,overflow:"hidden",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.lineSoft}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:13,fontWeight:640,color:C.text}}>Conversations</div>
        <Btn kind="ghost" size="xs" icon="plus" onClick={()=>setShowNew(true)}/>
      </div>
      <div style={{flex:1,overflowY:"auto"}}>
        {myChats.map(c=>{const isActive=selected===c.id;
          const lastMsg=A.hrChatMsgs.filter(m=>m.chat===c.id).sort((a,b)=>b.at-a.at)[0];
          return <button key={c.id} onClick={()=>{setSelected(c.id); if(mob)setShowThreads(false);}}
            style={{width:"100%",padding:"12px 14px",background:isActive?C.tint:"transparent",border:"none",borderBottom:`1px solid ${C.lineSoft}`,cursor:"pointer",fontFamily:"inherit",textAlign:"left",transition:"background .16s"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:8,marginBottom:3}}>
              <div style={{fontSize:13.5,fontWeight:isActive?660:600,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div>
              {lastMsg&&<div style={{fontSize:10.5,color:C.text3,flexShrink:0}}>{new Date(lastMsg.at).toLocaleDateString("en-CA",{month:"short",day:"numeric"})}</div>}
            </div>
            <div style={{fontSize:12,color:C.text3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{lastMsg?lastMsg.text:c.about}</div>
          </button>;})}
      </div>
    </Card>}

    {(!showThreads||!mob)&&chat&&<Card pad={0} style={{borderRadius:14,overflow:"hidden",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.lineSoft}`,display:"flex",justifyContent:"space-between",alignItems:"center",background:"#fff"}}>
        <div>
          {mob&&<Btn kind="ghost" size="xs" icon="chevL" onClick={()=>setShowThreads(true)}>Back</Btn>}
          <div style={{fontSize:15,fontWeight:660,color:C.text}}>{chat.name}</div>
          <div style={{fontSize:12,color:C.text3,marginTop:2}}>{chat.about}</div>
        </div>
        <div style={{display:"flex",gap:6}}>
          <Btn kind="ghost" size="xs" icon="phone" onClick={()=>alert("Voice call — connecting via NorthHire Voice…")}/>
          <Btn kind="ghost" size="xs" icon="play" onClick={()=>alert("Video call — starting NorthHire Meet room…")}/>
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:16,background:C.bg,display:"flex",flexDirection:"column",gap:10}}>
        {messages.length===0
          ? <div style={{textAlign:"center",color:C.text3,fontSize:13,padding:20}}>No messages yet. Start the conversation.</div>
          : messages.map(m=>{const from=A.hrEmp(m.from); const isMe=m.from===emp.id;
              return <div key={m.id} style={{display:"flex",gap:10,flexDirection:isMe?"row-reverse":"row",maxWidth:"85%",alignSelf:isMe?"flex-end":"flex-start"}}>
                {!isMe&&<SmartPortrait seed={from?.seed||0} size={30} radius={8}/>}
                <div style={{background:isMe?C.brand:"#fff",color:isMe?"#fff":C.text,borderRadius:12,padding:"9px 13px",boxShadow:isMe?"none":SH.sm}}>
                  {!isMe&&<div style={{fontSize:11,fontWeight:640,marginBottom:3,color:C.text3}}>{from?.name||"Unknown"}</div>}
                  <div style={{fontSize:13.5,lineHeight:1.5,whiteSpace:"pre-wrap"}}>{m.text}</div>
                  <div style={{fontSize:10.5,marginTop:5,opacity:.7,textAlign:isMe?"right":"left"}}>{new Date(m.at).toLocaleTimeString("en-CA",{hour:"2-digit",minute:"2-digit"})}</div>
                </div>
              </div>;})}
      </div>

      <div style={{padding:14,borderTop:`1px solid ${C.lineSoft}`,display:"flex",gap:8}}>
        <div style={{flex:1}}><Input value={msg} onChange={e=>setMsg(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault(); send();}}} placeholder="Type a message…"/></div>
        <Btn kind="primary" icon="send" onClick={send} disabled={!msg.trim()}>Send</Btn>
      </div>
    </Card>}

    {showNew&&<Modal onClose={()=>setShowNew(false)} title="Start a new conversation">
      <_HrNewChat onClose={()=>setShowNew(false)} onCreate={id=>{setSelected(id); setShowNew(false);}}/>
    </Modal>}
  </div>;
}
function _HrNewChat({onClose,onCreate}){
  const A=use(); const emp=A.hrCurrentEmp();
  const [kind,setKind]=useState("dm"); /* dm | group */
  const [name,setName]=useState("");
  const [selected,setSelected]=useState([]);
  const all=A.hrEmpsAtCompany(emp.companyId).filter(e=>e.id!==emp.id&&e.status==="active");
  const toggle=(id)=>setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
  const create=()=>{
    if(kind==="dm"&&selected.length===1){
      const other=A.hrEmp(selected[0]);
      const c=A.createHrChat({kind:"dm",name:other.name,members:`${emp.id},${selected[0]}`,about:"Direct message"});
      onCreate(c.id);
    } else if(kind==="group"&&name.trim()&&selected.length>0){
      const c=A.createHrChat({kind:"group",name:`# ${name.trim()}`,members:`${emp.id},${selected.join(",")}`,about:`Group of ${selected.length+1}`});
      onCreate(c.id);
    }
  };
  return <div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      {[["dm","Direct message"],["group","Group chat"]].map(([k,l])=>
        <button key={k} onClick={()=>setKind(k)} style={{padding:14,borderRadius:11,cursor:"pointer",fontFamily:"inherit",fontSize:13.5,fontWeight:kind===k?650:520,border:`1.5px solid ${kind===k?C.brand:C.line}`,background:kind===k?C.tint:"#fff",color:kind===k?C.brand:C.text}}>{l}</button>)}
    </div>
    {kind==="group"&&<Field label="Group name"><Input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. field-crew-calgary"/></Field>}
    <div>
      <Lbl>Select {kind==="dm"?"someone":"members"}</Lbl>
      <div style={{maxHeight:280,overflowY:"auto",border:`1px solid ${C.line}`,borderRadius:10}}>
        {all.map(e=><label key={e.id} style={{display:"flex",gap:10,alignItems:"center",padding:"10px 14px",borderBottom:`1px solid ${C.lineSoft}`,cursor:"pointer"}}>
          <input type={kind==="dm"?"radio":"checkbox"} name="who" checked={selected.includes(e.id)}
            onChange={()=>kind==="dm"?setSelected([e.id]):toggle(e.id)}/>
          <SmartPortrait seed={e.seed} size={30} radius={8}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13.5,fontWeight:600,color:C.text}}>{e.name}</div>
            <div style={{fontSize:12,color:C.text3}}>{e.title}</div>
          </div>
        </label>)}
      </div>
    </div>
    <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
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
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
      <div><div style={{fontSize:18,fontWeight:720,color:C.text}}>{all.filter(e=>e.status==="active").length} active employees</div>
        <div style={{fontSize:13,color:C.text3,marginTop:3}}>Add new hires, change roles, and manage the org chart.</div></div>
      <Btn kind="primary" size="sm" icon="plus" onClick={()=>setShowAdd(true)}>Add employee</Btn>
    </div>

    <Card pad={0} style={{borderRadius:14,overflow:"hidden"}}>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:720}}>
        <thead><tr style={{borderBottom:`2px solid ${C.line}`,textAlign:"left"}}>
          {["Name","Title","Dept","Role","Hired","Status","Actions"].map(h=>
            <th key={h} style={{padding:"12px 14px",fontSize:11.5,fontWeight:700,color:C.text3,letterSpacing:".05em",textTransform:"uppercase"}}>{h}</th>)}
        </tr></thead>
        <tbody>{all.map(e=>{const d=A.HR_DEPARTMENTS.find(x=>x.id===e.dept);
          return <tr key={e.id} style={{borderBottom:`1px solid ${C.lineSoft}`,transition:"background .16s"}}
            onMouseEnter={ev=>ev.currentTarget.style.background=C.bg}
            onMouseLeave={ev=>ev.currentTarget.style.background="transparent"}>
            <td style={{padding:"11px 14px"}}><div style={{display:"flex",gap:10,alignItems:"center"}}>
              <SmartPortrait seed={e.seed} size={30} radius={8}/>
              <span style={{fontSize:13.5,fontWeight:600,color:C.text}}>{e.name}</span></div></td>
            <td style={{padding:"11px 14px",fontSize:13,color:C.text2}}>{e.title}</td>
            <td style={{padding:"11px 14px",fontSize:13,color:C.text2}}>{d?.name||"—"}</td>
            <td style={{padding:"11px 14px"}}>
              <Sel value={e.role} onChange={ev=>A.updateEmp(e.id,{role:ev.target.value})} style={{fontSize:12,padding:"5px 8px",minWidth:0}}>
                {A.HR_ROLES.map(r=><option key={r.k} value={r.k}>{r.label}</option>)}</Sel>
            </td>
            <td style={{padding:"11px 14px",fontSize:12.5,color:C.text3}}>{e.hired}</td>
            <td style={{padding:"11px 14px"}}><Tag tone={e.status==="active"?"ok":"neutral"} sm>{e.status}</Tag></td>
            <td style={{padding:"11px 14px"}}><div style={{display:"flex",gap:4}}>
              {e.status==="active"&&e.id!==emp.id&&<Btn kind="dangerSoft" size="xs" onClick={()=>{if(confirm(`Offboard ${e.name}?`))A.removeEmployee(e.id);}}>Offboard</Btn>}
            </div></td>
          </tr>;})}</tbody>
      </table></div>
    </Card>

    {showAdd&&<Modal onClose={()=>setShowAdd(false)} title="Add employee" wide>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12}}>
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
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
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
  const [nInv,setNInv]=useState({client:"",amount:0,due:"",po:"",items:[{desc:"",qty:1,unitPrice:0}]});
  const [tab,setTab]=useState("all");
  const list=tab==="all"?A.hrInvoices:A.hrInvoices.filter(i=>i.status===tab);
  const canManage=["owner","admin","finance"].includes(emp.role);

  const updateItem=(i,patch)=>setNInv(p=>({...p,items:p.items.map((it,idx)=>idx===i?{...it,...patch}:it)}));
  const addItem=()=>setNInv(p=>({...p,items:[...p.items,{desc:"",qty:1,unitPrice:0}]}));
  const removeItem=(i)=>setNInv(p=>({...p,items:p.items.filter((_,idx)=>idx!==i)}));
  const itemsTotal=nInv.items.reduce((s,it)=>s+(it.qty*it.unitPrice||0),0);
  const hst=Math.round(itemsTotal*0.13*100)/100;
  const invTotal=itemsTotal+hst;

  const submit=()=>{
    if(!nInv.client||!nInv.due||itemsTotal<=0)return;
    A.addInvoice({...nInv,amount:invTotal,subtotal:itemsTotal,hst,items:nInv.items.filter(it=>it.desc&&it.qty*it.unitPrice>0)});
    setNInv({client:"",amount:0,due:"",po:"",items:[{desc:"",qty:1,unitPrice:0}]});
    setShowAdd(false);
  };

  const totals={
    paid:A.hrInvoices.filter(i=>i.status==="paid").reduce((s,i)=>s+i.amount,0),
    pending:A.hrInvoices.filter(i=>i.status==="pending").reduce((s,i)=>s+i.amount,0),
    overdue:A.hrInvoices.filter(i=>i.status==="overdue").reduce((s,i)=>s+i.amount,0),
  };
  return <div>
    <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(3,1fr)",gap:12,marginBottom:16}}>
      {[["Paid this year",totals.paid,C.ok],["Pending",totals.pending,C.warn],["Overdue",totals.overdue,C.danger]].map(([l,v,t])=>
        <Card key={l} pad={mob?16:20} style={{borderRadius:14}}>
          <div style={{fontSize:mob?20:24,fontWeight:720,color:t,letterSpacing:"-.025em"}}>${(v/1000).toFixed(0)}k</div>
          <div style={{fontSize:12,color:C.text3,marginTop:6}}>{l}</div>
        </Card>)}
    </div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:10}}>
      <div style={{display:"flex",background:C.bg,borderRadius:8,padding:2,border:`1px solid ${C.line}`}}>
        {[["all","All"],["pending","Pending"],["paid","Paid"],["overdue","Overdue"]].map(([v,l])=>
          <button key={v} onClick={()=>setTab(v)} style={{background:tab===v?"#fff":"transparent",border:"none",padding:"7px 13px",borderRadius:6,cursor:"pointer",fontFamily:"inherit",fontSize:12.5,fontWeight:640,color:tab===v?C.brand:C.text3}}>{l}</button>)}
      </div>
      {canManage&&<Btn kind="primary" size="sm" icon="plus" onClick={()=>setShowAdd(true)}>New invoice</Btn>}
    </div>
    <Card pad={0} style={{borderRadius:14,overflow:"hidden"}}>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:720}}>
        <thead><tr style={{borderBottom:`2px solid ${C.line}`,textAlign:"left"}}>
          {["Number","Client","Amount","Issued","Due","Status","Actions"].map(h=>
            <th key={h} style={{padding:"12px 14px",fontSize:11.5,fontWeight:700,color:C.text3,letterSpacing:".05em",textTransform:"uppercase"}}>{h}</th>)}
        </tr></thead>
        <tbody>{list.map(inv=><tr key={inv.id} style={{borderBottom:`1px solid ${C.lineSoft}`,cursor:"pointer"}} onClick={()=>setDetail(inv)}>
          <td style={{padding:"11px 14px",fontSize:12.5,color:C.text2,fontFamily:"ui-monospace,monospace"}}>{inv.number}</td>
          <td style={{padding:"11px 14px",fontSize:13,color:C.text,fontWeight:600}}>{inv.client}</td>
          <td style={{padding:"11px 14px",fontSize:13.5,color:C.text,fontWeight:660}}>${inv.amount.toLocaleString()}</td>
          <td style={{padding:"11px 14px",fontSize:12.5,color:C.text3}}>{inv.issued}</td>
          <td style={{padding:"11px 14px",fontSize:12.5,color:C.text3}}>{inv.due}</td>
          <td style={{padding:"11px 14px"}}><Tag tone={inv.status==="paid"?"ok":inv.status==="overdue"?"danger":"warn"} sm>{inv.status}</Tag></td>
          <td style={{padding:"11px 14px"}} onClick={e=>e.stopPropagation()}><div style={{display:"flex",gap:4}}>
            <Btn kind="ghost" size="xs" onClick={()=>setDetail(inv)}>View</Btn>
            {canManage&&inv.status==="pending"&&<Btn kind="primary" size="xs" onClick={()=>A.markInvoicePaid(inv.id)}>Mark paid</Btn>}
            {canManage&&inv.status==="draft"&&<Btn kind="primary" size="xs" onClick={()=>A.sendInvoice(inv.id)}>Send</Btn>}
          </div></td>
        </tr>)}</tbody>
      </table></div>
    </Card>

    {showAdd&&<Modal onClose={()=>setShowAdd(false)} title="New invoice" wide>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"2fr 1fr 1fr",gap:12}}>
          <Field label="Client" required><Input value={nInv.client} onChange={e=>setNInv({...nInv,client:e.target.value})} placeholder="Client company name"/></Field>
          <Field label="Due date" required><Input type="date" value={nInv.due} onChange={e=>setNInv({...nInv,due:e.target.value})} min={_fmtDate(new Date())}/></Field>
          <Field label="PO number"><Input value={nInv.po} onChange={e=>setNInv({...nInv,po:e.target.value})} placeholder="Optional"/></Field>
        </div>

        <div>
          <Lbl style={{marginTop:6}}>Line items</Lbl>
          <div style={{border:`1px solid ${C.line}`,borderRadius:10,overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"3fr 60px 100px 90px 32px",gap:8,padding:"10px 12px",background:C.bg,fontSize:11,fontWeight:700,color:C.text3,letterSpacing:".05em",textTransform:"uppercase"}}>
              <div>Description</div><div>Qty</div><div>Unit price</div><div style={{textAlign:"right"}}>Line total</div><div/>
            </div>
            {nInv.items.map((it,i)=><div key={i} style={{display:"grid",gridTemplateColumns:"3fr 60px 100px 90px 32px",gap:8,padding:"8px 12px",borderTop:`1px solid ${C.lineSoft}`,alignItems:"center"}}>
              <Input value={it.desc} onChange={e=>updateItem(i,{desc:e.target.value})} placeholder="Consulting services · June 2026"/>
              <Input type="number" min="0" value={it.qty} onChange={e=>updateItem(i,{qty:Number(e.target.value)||0})}/>
              <Input type="number" min="0" step="0.01" value={it.unitPrice} onChange={e=>updateItem(i,{unitPrice:Number(e.target.value)||0})}/>
              <div style={{fontSize:13.5,fontWeight:660,color:C.text,textAlign:"right"}}>${(it.qty*it.unitPrice||0).toLocaleString()}</div>
              <button onClick={()=>removeItem(i)} disabled={nInv.items.length===1} style={{background:"none",border:"none",padding:4,cursor:nInv.items.length===1?"default":"pointer",color:nInv.items.length===1?C.text3:C.danger,opacity:nInv.items.length===1?0.3:1}}><I n="x" s={16}/></button>
            </div>)}
          </div>
          <Btn kind="ghost" size="sm" icon="plus" style={{marginTop:8}} onClick={addItem}>Add line</Btn>
        </div>

        <div style={{padding:14,background:C.bg,borderRadius:10}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:C.text2,marginBottom:6}}>
            <span>Subtotal</span><span>${itemsTotal.toLocaleString()}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:C.text2,marginBottom:6}}>
            <span>HST (13%)</span><span>${hst.toLocaleString()}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:15,color:C.text,fontWeight:700,paddingTop:8,borderTop:`1px solid ${C.line}`}}>
            <span>Total</span><span style={{color:C.brand}}>${invTotal.toLocaleString()}</span>
          </div>
        </div>

        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn kind="ghost" onClick={()=>setShowAdd(false)}>Cancel</Btn>
          <Btn kind="primary" icon="check" onClick={submit} disabled={!nInv.client||!nInv.due||itemsTotal<=0}>Create invoice</Btn>
        </div>
      </div>
    </Modal>}

    {detail&&<InvoiceDetailModal invoice={detail} company={company} onClose={()=>setDetail(null)} canManage={canManage} onMarkPaid={()=>{A.markInvoicePaid(detail.id); setDetail({...detail,status:"paid"});}} onSend={()=>{A.sendInvoice(detail.id); setDetail({...detail,status:"pending"});}}/>}
  </div>;
}

function InvoiceDetailModal({invoice:inv,company,onClose,canManage,onMarkPaid,onSend}){
  const mob=useMedia("(max-width: 900px)");
  const items=inv.items||[{desc:"Services",qty:1,unitPrice:inv.amount}];
  const subtotal=inv.subtotal||inv.amount;
  const hst=inv.hst||0;
  return <Modal onClose={onClose} title={`Invoice ${inv.number}`} wide>
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {/* Header: From / To */}
      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:14,padding:mob?16:20,background:C.bg,borderRadius:12}}>
        <div>
          <div style={{fontSize:11,color:C.text3,fontWeight:700,letterSpacing:".05em",textTransform:"uppercase",marginBottom:6}}>From</div>
          <div style={{fontSize:15,fontWeight:660,color:C.text}}>{company?.name||"Your company"}</div>
          <div style={{fontSize:12,color:C.text3,marginTop:3,lineHeight:1.5}}>{company?.city||""}{company?.prov?", "+company.prov:""}<br/>{company?.email||""}</div>
        </div>
        <div>
          <div style={{fontSize:11,color:C.text3,fontWeight:700,letterSpacing:".05em",textTransform:"uppercase",marginBottom:6}}>Bill to</div>
          <div style={{fontSize:15,fontWeight:660,color:C.text}}>{inv.client}</div>
          {inv.po&&<div style={{fontSize:12,color:C.text3,marginTop:3}}>PO: {inv.po}</div>}
        </div>
      </div>

      {/* Meta */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,fontSize:12.5}}>
        {[["Invoice #",inv.number],["Issued",inv.issued],["Due",inv.due],["Status",inv.status.toUpperCase()]].map(([l,v])=>
          <div key={l} style={{padding:10,background:C.bg,borderRadius:8,textAlign:"center"}}>
            <div style={{fontSize:10.5,color:C.text3,fontWeight:600,textTransform:"uppercase",letterSpacing:".04em",marginBottom:3}}>{l}</div>
            <div style={{color:C.text,fontWeight:640,fontFamily:l==="Invoice #"||l==="Issued"||l==="Due"?"ui-monospace,monospace":"inherit"}}>{v}</div>
          </div>)}
      </div>

      {/* Line items */}
      <div style={{border:`1px solid ${C.line}`,borderRadius:10,overflow:"hidden"}}>
        <div style={{padding:"10px 14px",background:C.bg,fontSize:11,fontWeight:700,color:C.text3,letterSpacing:".05em",textTransform:"uppercase",display:"grid",gridTemplateColumns:"3fr 60px 100px 100px",gap:8}}>
          <div>Description</div><div style={{textAlign:"center"}}>Qty</div><div style={{textAlign:"right"}}>Unit price</div><div style={{textAlign:"right"}}>Line total</div>
        </div>
        {items.map((it,i)=><div key={i} style={{padding:"11px 14px",borderTop:`1px solid ${C.lineSoft}`,display:"grid",gridTemplateColumns:"3fr 60px 100px 100px",gap:8,fontSize:13,alignItems:"center"}}>
          <div style={{color:C.text}}>{it.desc||"—"}</div>
          <div style={{textAlign:"center",color:C.text2}}>{it.qty||1}</div>
          <div style={{textAlign:"right",color:C.text2}}>${(it.unitPrice||0).toLocaleString()}</div>
          <div style={{textAlign:"right",color:C.text,fontWeight:660}}>${((it.qty||1)*(it.unitPrice||0)).toLocaleString()}</div>
        </div>)}
      </div>

      {/* Totals */}
      <div style={{padding:16,background:C.bg,borderRadius:12,maxWidth:mob?"none":320,marginLeft:"auto",width:mob?"auto":320}}>
        {hst>0&&<>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:C.text2,marginBottom:6}}>
            <span>Subtotal</span><span>${subtotal.toLocaleString()}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:C.text2,marginBottom:8}}>
            <span>HST (13%)</span><span>${hst.toLocaleString()}</span>
          </div>
        </>}
        <div style={{display:"flex",justifyContent:"space-between",fontSize:16,color:C.text,fontWeight:730,paddingTop:hst>0?10:0,borderTop:hst>0?`1px solid ${C.line}`:"none"}}>
          <span>Total</span><span style={{color:C.brand}}>${inv.amount.toLocaleString()} CAD</span>
        </div>
      </div>

      <div style={{display:"flex",gap:10,justifyContent:"flex-end",paddingTop:8,borderTop:`1px solid ${C.line}`}}>
        <Btn kind="ghost" onClick={onClose}>Close</Btn>
        <Btn kind="ghost" icon="download" onClick={()=>alert("PDF generation would happen server-side. This is a prototype.")}>Download PDF</Btn>
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

  const today=new Date();
  const twoWeeksAgo=new Date(today.getTime()-14*864e5);
  const [np,setNp]=useState({periodStart:_fmtDate(twoWeeksAgo),periodEnd:_fmtDate(today)});

  const createRun=()=>{
    const r=A.runPayroll(company.id,np.periodStart,np.periodEnd);
    setShowNew(false); setDetail(r);
  };

  return <div>
    {!isEmployee&&<>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontSize:20,fontWeight:730,color:C.text,letterSpacing:"-.02em"}}>Payroll</div>
          <div style={{fontSize:13,color:C.text3,marginTop:2}}>Biweekly runs. CPP/EI/tax calculated per CRA rates. Approved expenses flow through automatically.</div>
        </div>
        {isPayrollMgr&&<Btn kind="primary" size="sm" icon="plus" onClick={()=>setShowNew(true)}>Create payroll run</Btn>}
      </div>

      <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"repeat(4,1fr)",gap:12,marginBottom:16}}>
        {[
          ["YTD gross",`$${(runs.reduce((s,p)=>s+p.totalGross,0)/1000).toFixed(0)}k`,C.brand],
          ["YTD net",`$${(runs.reduce((s,p)=>s+p.totalNet,0)/1000).toFixed(0)}k`,C.ok],
          ["Employees on payroll",all.length,C.warn],
          ["Runs this year",runs.length,C.text2],
        ].map(([l,v,t])=><Card key={l} pad={mob?16:20} style={{borderRadius:14}}>
          <div style={{fontSize:mob?20:24,fontWeight:720,color:t,letterSpacing:"-.025em"}}>{v}</div>
          <div style={{fontSize:12,color:C.text3,marginTop:6}}>{l}</div>
        </Card>)}
      </div>

      <Card pad={0} style={{borderRadius:14,marginBottom:16,overflow:"hidden"}}>
        <div style={{padding:mob?"14px 16px":"16px 20px",borderBottom:`1px solid ${C.line}`}}><Lbl style={{margin:0}}>Payroll runs</Lbl></div>
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}>
          <thead><tr style={{borderBottom:`1px solid ${C.line}`,textAlign:"left",background:C.bg}}>
            {["Period","Run date","Gross","Net","Reimb.","Employees","Status","Actions"].map(h=>
              <th key={h} style={{padding:"10px 14px",fontSize:11.5,fontWeight:700,color:C.text3,letterSpacing:".05em",textTransform:"uppercase"}}>{h}</th>)}
          </tr></thead>
          <tbody>{runs.map(p=><tr key={p.id} style={{borderBottom:`1px solid ${C.lineSoft}`,cursor:"pointer"}} onClick={()=>setDetail(p)}>
            <td style={{padding:"11px 14px",fontSize:12.5,color:C.text,fontWeight:600}}>{p.period}</td>
            <td style={{padding:"11px 14px",fontSize:12,color:C.text3}}>{p.runDate}</td>
            <td style={{padding:"11px 14px",fontSize:13,color:C.text}}>${p.totalGross.toLocaleString()}</td>
            <td style={{padding:"11px 14px",fontSize:13,color:C.brand,fontWeight:660}}>${p.totalNet.toLocaleString()}</td>
            <td style={{padding:"11px 14px",fontSize:12.5,color:C.text2}}>${(p.totalReimb||0).toLocaleString()}</td>
            <td style={{padding:"11px 14px",fontSize:12.5,color:C.text2}}>{p.employees}</td>
            <td style={{padding:"11px 14px"}}><Tag tone={p.status==="paid"?"ok":p.status==="approved"?"brand":"warn"} sm>{p.status}</Tag></td>
            <td style={{padding:"11px 14px"}} onClick={e=>e.stopPropagation()}>
              <div style={{display:"flex",gap:4}}>
                <Btn kind="ghost" size="xs" onClick={()=>setDetail(p)}>View</Btn>
                {isPayrollMgr&&p.status==="draft"&&<Btn kind="primary" size="xs" onClick={()=>A.approvePayroll(p.id)}>Approve</Btn>}
                {isPayrollMgr&&p.status==="approved"&&<Btn kind="primary" size="xs" onClick={()=>{if(confirm(`Execute payroll for ${p.employees} employees? Total net $${p.totalNet.toLocaleString()}. This will trigger direct deposit and mark all approved expenses as paid.`))A.executePayroll(p.id);}}>Execute</Btn>}
              </div>
            </td>
          </tr>)}
          {runs.length===0&&<tr><td colSpan={8} style={{padding:32,textAlign:"center",color:C.text3,fontSize:13}}>No payroll runs yet. Click "Create payroll run" to start.</td></tr>}
          </tbody>
        </table></div>
      </Card>
    </>}

    <Card pad={mob?16:20} style={{borderRadius:14}}>
      <Lbl>{isEmployee?"My salary":"All employee salaries"}</Lbl>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:500}}>
        <thead><tr style={{borderBottom:`2px solid ${C.line}`,textAlign:"left"}}>
          {(isEmployee?["Item","Amount"]:["Employee","Role","Annual","Monthly","Biweekly"]).map(h=>
            <th key={h} style={{padding:"10px 12px",fontSize:11.5,fontWeight:700,color:C.text3,letterSpacing:".05em",textTransform:"uppercase"}}>{h}</th>)}
        </tr></thead>
        <tbody>
          {isEmployee?<>
            <tr><td style={{padding:"11px 12px",fontSize:13,color:C.text}}>Annual salary</td><td style={{padding:"11px 12px",fontSize:14,color:C.brand,fontWeight:660}}>${emp.salary?.toLocaleString()}</td></tr>
            <tr><td style={{padding:"11px 12px",fontSize:13,color:C.text}}>Monthly gross</td><td style={{padding:"11px 12px",fontSize:13,color:C.text}}>${Math.round((emp.salary||0)/12).toLocaleString()}</td></tr>
            <tr><td style={{padding:"11px 12px",fontSize:13,color:C.text}}>Bi-weekly gross</td><td style={{padding:"11px 12px",fontSize:13,color:C.text}}>${Math.round((emp.salary||0)/26).toLocaleString()}</td></tr>
          </>:all.map(e=><tr key={e.id} style={{borderBottom:`1px solid ${C.lineSoft}`}}>
            <td style={{padding:"11px 12px"}}><div style={{display:"flex",gap:10,alignItems:"center"}}>
              <SmartPortrait seed={e.seed} size={28} radius={7}/>
              <span style={{fontSize:13,color:C.text,fontWeight:600}}>{e.name}</span></div></td>
            <td style={{padding:"11px 12px",fontSize:12.5,color:C.text3}}>{e.role}</td>
            <td style={{padding:"11px 12px",fontSize:13,color:C.text}}>${e.salary?.toLocaleString()}</td>
            <td style={{padding:"11px 12px",fontSize:13,color:C.text2}}>${Math.round((e.salary||0)/12).toLocaleString()}</td>
            <td style={{padding:"11px 12px",fontSize:13,color:C.text2}}>${Math.round((e.salary||0)/26).toLocaleString()}</td>
          </tr>)}
        </tbody>
      </table></div>
    </Card>

    {showNew&&<Modal onClose={()=>setShowNew(false)} title="Create payroll run">
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <Banner tone="brand" icon="info">Runs pay for {all.length} active employees. CPP, EI, and tax are calculated at 2026 CRA rates. Approved expenses awaiting reimbursement will be included.</Banner>
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12}}>
          <Field label="Period start" required><Input type="date" value={np.periodStart} onChange={e=>setNp({...np,periodStart:e.target.value})}/></Field>
          <Field label="Period end" required><Input type="date" value={np.periodEnd} onChange={e=>setNp({...np,periodEnd:e.target.value})}/></Field>
        </div>
        <div style={{padding:14,background:C.bg,borderRadius:10,fontSize:13,color:C.text2,lineHeight:1.6}}>
          <div style={{fontWeight:640,marginBottom:6,color:C.text}}>Estimated totals</div>
          Gross: <strong style={{color:C.text}}>${all.reduce((s,e)=>s+Math.round((e.salary||0)/26),0).toLocaleString()}</strong><br/>
          Employees: <strong style={{color:C.text}}>{all.length}</strong><br/>
          Pending reimbursable expenses: <strong style={{color:C.text}}>${A.companyExpenses(company.id).filter(x=>x.status==="approved"&&x.reimburseVia==="next-payroll").reduce((s,x)=>s+x.amount,0).toLocaleString()}</strong>
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn kind="ghost" onClick={()=>setShowNew(false)}>Cancel</Btn>
          <Btn kind="primary" icon="check" onClick={createRun}>Create run (draft)</Btn>
        </div>
      </div>
    </Modal>}

    {detail&&<PayrollDetailModal run={detail} onClose={()=>setDetail(null)} canApprove={isPayrollMgr} onApprove={()=>{A.approvePayroll(detail.id); setDetail({...detail,status:"approved"});}} onExecute={()=>{if(confirm(`Execute payroll for ${detail.employees} employees? Total net $${detail.totalNet.toLocaleString()}.`)){A.executePayroll(detail.id); setDetail(null);}}}/>}
  </div>;
}

function PayrollDetailModal({run,onClose,canApprove,onApprove,onExecute}){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  return <Modal onClose={onClose} title={`Payroll · ${run.period}`} wide>
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"repeat(4,1fr)",gap:10}}>
        {[["Gross",`$${run.totalGross.toLocaleString()}`],["Net",`$${run.totalNet.toLocaleString()}`],["Reimbursements",`$${(run.totalReimb||0).toLocaleString()}`],["Employees",run.employees]].map(([l,v])=>
          <div key={l} style={{padding:12,background:C.bg,borderRadius:9,textAlign:"center"}}>
            <div style={{fontSize:mob?15:18,fontWeight:730,color:C.text}}>{v}</div>
            <div style={{fontSize:10.5,color:C.text3,marginTop:3,textTransform:"uppercase",letterSpacing:".05em",fontWeight:600}}>{l}</div>
          </div>)}
      </div>

      <div style={{maxHeight:400,overflowY:"auto",border:`1px solid ${C.line}`,borderRadius:10}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12.5}}>
          <thead style={{position:"sticky",top:0,background:C.bg,zIndex:1}}><tr>
            {["Employee","Gross","CPP","EI","Fed","Prov","Reimb.","Net"].map(h=>
              <th key={h} style={{padding:"9px 10px",fontSize:10.5,fontWeight:700,color:C.text3,letterSpacing:".04em",textTransform:"uppercase",textAlign:"left",borderBottom:`1px solid ${C.line}`}}>{h}</th>)}
          </tr></thead>
          <tbody>{run.lines.map(l=><tr key={l.employee} style={{borderBottom:`1px solid ${C.lineSoft}`}}>
            <td style={{padding:"9px 10px",fontWeight:600,color:C.text}}>{l.name}</td>
            <td style={{padding:"9px 10px",color:C.text}}>${l.gross.toLocaleString()}</td>
            <td style={{padding:"9px 10px",color:C.text3}}>-${l.cpp.toLocaleString()}</td>
            <td style={{padding:"9px 10px",color:C.text3}}>-${l.ei.toLocaleString()}</td>
            <td style={{padding:"9px 10px",color:C.text3}}>-${l.fedTax.toLocaleString()}</td>
            <td style={{padding:"9px 10px",color:C.text3}}>-${l.provTax.toLocaleString()}</td>
            <td style={{padding:"9px 10px",color:l.reimb>0?C.ok:C.text3}}>{l.reimb>0?`+$${l.reimb.toLocaleString()}`:"—"}</td>
            <td style={{padding:"9px 10px",color:C.brand,fontWeight:700}}>${l.net.toLocaleString()}</td>
          </tr>)}</tbody>
        </table>
      </div>

      <div style={{fontSize:12,color:C.text3,padding:12,background:C.bg,borderRadius:9,lineHeight:1.6}}>
        <strong style={{color:C.text2}}>Status: {run.status}</strong> · Runs are draft when first created. Once approved, they can be executed (direct deposit initiated + expenses reconciled).
      </div>

      <div style={{display:"flex",gap:10,justifyContent:"flex-end",paddingTop:8,borderTop:`1px solid ${C.line}`}}>
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
      <div style={{display:"flex",gap:14,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{width:48,height:48,borderRadius:12,background:C.brand,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><I n="cap" s={22}/></div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:15,fontWeight:660,color:C.text}}>Assign trainings to your team</div>
          <div style={{fontSize:12.5,color:C.text2,marginTop:3}}>Track completion, issue certificates, and view team progress.</div>
        </div>
      </div>
    </Card>
    <div style={{display:"grid",gridTemplateColumns:`repeat(auto-fill,minmax(${mob?260:300}px,1fr))`,gap:14}}>
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

  /* Popular badge presets so awarders don't type from scratch */
  const presets=["Top Performer","5 Years","10 Years","3 Years","Safety Champion","Peer Chosen","Rising Star","Team Player","Mentor","Perfect Attendance","Innovator","Above & Beyond","Client Favorite","Numbers Wizard","Apprentice Mentor"];
  const doAward=()=>{if(!selEmp||!badgeName.trim())return;
    A.awardBadge(selEmp,badgeName.trim()); setSelEmp(""); setBadgeName(""); setShowAward(false);};

  return <div>
    <Card pad={mob?20:26} style={{borderRadius:16,marginBottom:16,background:`linear-gradient(135deg,#FFF5EB 0%,#FFEDD9 100%)`,border:`1px solid ${C.warnLn}`}}>
      <div style={{display:"flex",gap:14,alignItems:"center",flexWrap:"wrap",justifyContent:"space-between"}}>
        <div style={{display:"flex",gap:14,alignItems:"center",flex:"1 1 240px"}}>
          <div style={{width:52,height:52,borderRadius:14,background:C.warn,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><I n="award" s={26}/></div>
          <div>
            <div style={{fontSize:16,fontWeight:700,color:C.text}}>Team recognition wall</div>
            <div style={{fontSize:13,color:C.text2,marginTop:3}}>Every badge earned across the company · {withBadges.reduce((s,e)=>s+e.badges.length,0)} total</div>
          </div>
        </div>
        {canAward&&<Btn kind="primary" icon="plus" onClick={()=>setShowAward(true)} style={{background:C.warn,borderColor:C.warn}}>Award a badge</Btn>}
      </div>
    </Card>
    <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(2,1fr)",gap:12}}>
      {withBadges.map(e=><Card key={e.id} pad={16} style={{borderRadius:14}}>
        <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:12}}>
          <SmartPortrait seed={e.seed} size={44} radius={11}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:660,color:C.text}}>{e.name}</div>
            <div style={{fontSize:12,color:C.text3,marginTop:2}}>{e.title}</div>
          </div>
          <span style={{fontSize:11,fontWeight:640,color:C.text3,padding:"3px 9px",background:C.bg,borderRadius:99}}>{e.badges.length}</span>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {e.badges.map(b=><div key={b} style={{display:"inline-flex",gap:4,alignItems:"center",padding:"4px 8px 4px 10px",background:C.warnBg,color:C.warn,border:`1px solid ${C.warnLn}`,borderRadius:99,fontSize:11.5,fontWeight:640}}>
            <I n="award" s={11}/>{b}
            {canAward&&<button onClick={()=>{if(confirm(`Remove "${b}" from ${e.name}?`))A.removeBadge(e.id,b);}} style={{background:"none",border:"none",padding:0,marginLeft:3,cursor:"pointer",color:C.warn,opacity:0.6,display:"flex"}}><I n="x" s={11}/></button>}
          </div>)}
        </div>
      </Card>)}
      {withBadges.length===0&&<div style={{gridColumn:"1/-1"}}><Empty icon="award" title="No badges awarded yet" body={canAward?"Award the first badge to celebrate a teammate.":"Ask HR to start awarding badges."}/></div>}
    </div>

    {showAward&&<Modal onClose={()=>setShowAward(false)} title="Award a badge" wide>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <Field label="Give this badge to" required><Sel value={selEmp} onChange={e=>setSelEmp(e.target.value)}>
          <option value="">— Select an employee —</option>
          {all.map(e=><option key={e.id} value={e.id}>{e.name} — {e.title}</option>)}
        </Sel></Field>
        <Field label="Badge name" required hint="Short and specific — think 'Top Performer' or '5 Years'">
          <Input value={badgeName} onChange={e=>setBadgeName(e.target.value)} placeholder="e.g. Perfect Attendance"/>
        </Field>
        <div>
          <div style={{fontSize:11.5,fontWeight:700,color:C.text3,letterSpacing:".05em",textTransform:"uppercase",marginBottom:8}}>Quick pick</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {presets.map(p=><button key={p} onClick={()=>setBadgeName(p)} type="button" style={{background:badgeName===p?C.warn:"#fff",color:badgeName===p?"#fff":C.text2,border:`1px solid ${badgeName===p?C.warn:C.line}`,padding:"6px 12px",borderRadius:99,cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600}}>{p}</button>)}
          </div>
        </div>
        <Banner tone="brand" icon="info">
          {A.hrCompanySettings[company.id]?.privacy?.syncBadgesToNorthHire?"Badges appear on the employer's public NorthHire profile.":"Badges are internal-only. Enable public sync in HR Settings if you want them on NorthHire."}
        </Banner>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn kind="ghost" onClick={()=>setShowAward(false)}>Cancel</Btn>
          <Btn kind="primary" icon="award" onClick={doAward} disabled={!selEmp||!badgeName.trim()} style={{background:C.warn,borderColor:C.warn}}>Award badge</Btn>
        </div>
      </div>
    </Modal>}
  </div>;
}

/* ─── Hiring: post job → link to existing NorthHire recruiting ─── */
export function HrHiring(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const company=A.hrCurrentCompany();
  const jobs=A.jobs.filter(j=>j.e===company.id);
  const apps=A.applications.filter(a=>jobs.some(j=>j.id===a.job));
  return <div>
    <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"repeat(4,1fr)",gap:12,marginBottom:16}}>
      {[["Live listings",jobs.filter(j=>j.status==="live").length,C.brand],
        ["Applicants",apps.length,C.ok],
        ["Interviewing",apps.filter(a=>a.stage==="Interview").length,C.warn],
        ["Offers out",apps.filter(a=>a.stage==="Offer").length,C.violet]].map(([l,v,t])=>
        <Card key={l} pad={mob?14:18} style={{borderRadius:12}}>
          <div style={{fontSize:mob?20:24,fontWeight:720,color:t,letterSpacing:"-.025em"}}>{v}</div>
          <div style={{fontSize:12,color:C.text3,marginTop:5}}>{l}</div>
        </Card>)}
    </div>
    <Card pad={mob?20:24} style={{borderRadius:16,textAlign:"center",background:`linear-gradient(135deg,${C.tint} 0%,#F0F7FF 100%)`,border:`1px solid ${C.line2}`}}>
      <div style={{width:52,height:52,borderRadius:14,background:C.brand,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}><I n="briefcase" s={26}/></div>
      <div style={{fontSize:17,fontWeight:660,color:C.text,marginBottom:6}}>Integrated with NorthHire recruiting</div>
      <div style={{fontSize:13.5,color:C.text2,lineHeight:1.65,maxWidth:520,margin:"0 auto 18px"}}>Post jobs, review candidates, and hire directly from your existing employer console. Hired candidates are automatically added to your HR Suite.</div>
      <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
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
  return <div>
    <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"repeat(4,1fr)",gap:12,marginBottom:16}}>
      {[["Headcount",all.length,C.brand],
        ["Avg tenure",avgTenure.toFixed(1)+"y",C.ok],
        ["Total payroll",`$${(totalSalary/1000).toFixed(0)}k`,C.violet],
        ["Avg salary",`$${(avgSalary/1000).toFixed(0)}k`,C.warn]].map(([l,v,t])=>
        <Card key={l} pad={mob?16:20} style={{borderRadius:14}}>
          <div style={{fontSize:mob?20:24,fontWeight:720,color:t,letterSpacing:"-.025em"}}>{v}</div>
          <div style={{fontSize:12,color:C.text3,marginTop:6}}>{l}</div>
        </Card>)}
    </div>
    <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:14}}>
      <Card pad={mob?20:24} style={{borderRadius:14}}>
        <Lbl>Headcount by department</Lbl>
        {A.HR_DEPARTMENTS.map(d=>{const n=byDept[d.id]||0; const pct=all.length?(n/all.length)*100:0;
          return <div key={d.id} style={{marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:5}}>
              <span style={{color:C.text2,fontWeight:560}}>{d.name}</span>
              <span style={{color:C.brand,fontWeight:700}}>{n}</span>
            </div>
            <div style={{height:8,background:C.bg,borderRadius:99,overflow:"hidden"}}>
              <div style={{width:`${pct}%`,height:"100%",background:d.color||C.brand,borderRadius:99,transition:"width .4s"}}/>
            </div>
          </div>;})}
      </Card>
      <Card pad={mob?20:24} style={{borderRadius:14}}>
        <Lbl>Salary bands</Lbl>
        {[[">$150k",all.filter(e=>e.salary>150000).length],["$100–150k",all.filter(e=>e.salary>=100000&&e.salary<=150000).length],["$75–100k",all.filter(e=>e.salary>=75000&&e.salary<100000).length],["$50–75k",all.filter(e=>e.salary>=50000&&e.salary<75000).length],["<$50k",all.filter(e=>e.salary<50000).length]].map(([l,n])=>{const pct=all.length?(n/all.length)*100:0;
          return <div key={l} style={{marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:5}}>
              <span style={{color:C.text2,fontWeight:560}}>{l}</span>
              <span style={{color:C.brand,fontWeight:700}}>{n}</span>
            </div>
            <div style={{height:8,background:C.bg,borderRadius:99,overflow:"hidden"}}>
              <div style={{width:`${pct}%`,height:"100%",background:C.brand,borderRadius:99,transition:"width .4s"}}/>
            </div>
          </div>;})}
      </Card>
    </div>
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
      <div style={{fontSize:13,color:C.text3,marginBottom:14}}>Turn off any module to hide it from every employee's sidebar.</div>
      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:2}}>
        {Object.entries(d.modules).map(([k,v])=>
          <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 12px",borderRadius:9,transition:"background .16s"}}
            onMouseEnter={e=>e.currentTarget.style.background=C.bg}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <div style={{fontSize:13.5,color:C.text,textTransform:"capitalize",fontWeight:550}}>{k}</div>
            <Switch on={v} onChange={val=>setMod(k,val)}/>
          </div>)}
      </div>
    </Card>

    <Card pad={mob?20:26} style={{borderRadius:16,marginBottom:16}}>
      <Lbl>Working hours & attendance</Lbl>
      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr 1fr",gap:12,marginBottom:14}}>
        <Field label="Day starts"><Input type="time" value={d.attendance.workingHoursStart} onChange={e=>setSection("attendance","workingHoursStart",e.target.value)}/></Field>
        <Field label="Day ends"><Input type="time" value={d.attendance.workingHoursEnd} onChange={e=>setSection("attendance","workingHoursEnd",e.target.value)}/></Field>
        <Field label="Late threshold (min)"><Input type="number" value={d.attendance.lateThresholdMin} onChange={e=>setSection("attendance","lateThresholdMin",Number(e.target.value)||15)}/></Field>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderTop:`1px solid ${C.lineSoft}`}}>
        <div><div style={{fontSize:13.5,color:C.text,fontWeight:600}}>Allow remote punch-in</div>
          <div style={{fontSize:12,color:C.text3,marginTop:2}}>Employees can punch from the web, not just the office machine.</div></div>
        <Switch on={d.attendance.allowRemotePunch} onChange={v=>setSection("attendance","allowRemotePunch",v)}/>
      </div>
    </Card>

    <Card pad={mob?20:26} style={{borderRadius:16,marginBottom:16}}>
      <Lbl>Leave policy</Lbl>
      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr 1fr",gap:12,marginBottom:14}}>
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
        <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderBottom:`1px solid ${C.lineSoft}`}}>
          <div><div style={{fontSize:13.5,color:C.text,fontWeight:600}}>{l}</div>
            <div style={{fontSize:12,color:C.text3,marginTop:2}}>{s}</div></div>
          <Switch on={d.chat[k]} onChange={v=>setSection("chat",k,v)}/>
        </div>)}
    </Card>

    <Card pad={mob?20:26} style={{borderRadius:16,marginBottom:16,borderLeft:`4px solid ${C.brand}`}}>
      <Lbl>Data link between HR Suite & NorthHire</Lbl>
      <div style={{fontSize:13,color:C.text2,marginBottom:14,lineHeight:1.6}}>
        HR Suite runs your internal team. NorthHire is your public hiring surface. These toggles control what data flows between them. When linked, hiring on NorthHire auto-creates HR records; when unlinked, they're two separate systems.
      </div>
      {/* Master switch */}
      <div style={{padding:14,background:d.privacy?.linkHrToNorthHire?C.okBg:C.bg,borderRadius:11,marginBottom:12,border:`1px solid ${d.privacy?.linkHrToNorthHire?C.okLn:C.line}`,transition:"all .2s"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:660,color:C.text}}>Link HR Suite ↔ NorthHire</div>
            <div style={{fontSize:12.5,color:C.text2,marginTop:3,lineHeight:1.5}}>Master switch. When off, HR Suite runs as a completely separate system with no connection to your NorthHire hiring pipeline.</div>
          </div>
          <Switch on={d.privacy?.linkHrToNorthHire??true} onChange={v=>setSection("privacy","linkHrToNorthHire",v)}/>
        </div>
      </div>
      {d.privacy?.linkHrToNorthHire!==false&&<>
        <div style={{fontSize:11.5,fontWeight:700,color:C.text3,letterSpacing:".05em",textTransform:"uppercase",margin:"14px 0 8px"}}>Public NorthHire profile shows</div>
        {[
          ["shareTitleToNorthHire","Current job title","Their HR-tracked title appears on their public NorthHire profile"],
          ["shareTenureToNorthHire","Years at company","'4 years at PCL' visible publicly"],
          ["shareDepartmentToNorthHire","Department","Department name shown publicly (usually private)"],
          ["syncSkillsToNorthHire","Skills","Skills tracked in HR sync to their public profile"],
          ["syncCertificationsToNorthHire","Certifications","Red Seal, WHMIS, CPR expiry all show publicly"],
          ["syncBadgesToNorthHire","Internal badges","Badges you award internally show on the employer's public NorthHire profile"],
        ].map(([k,label,desc])=><div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 12px",borderRadius:9,transition:"background .16s"}}
          onMouseEnter={e=>e.currentTarget.style.background=C.bg}
          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13.5,color:C.text,fontWeight:550}}>{label}</div>
            <div style={{fontSize:12,color:C.text3,marginTop:2,lineHeight:1.5}}>{desc}</div>
          </div>
          <Switch on={d.privacy?.[k]??false} onChange={v=>setSection("privacy",k,v)}/>
        </div>)}
        <div style={{fontSize:11.5,fontWeight:700,color:C.text3,letterSpacing:".05em",textTransform:"uppercase",margin:"14px 0 8px"}}>Hiring flow</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 12px",borderRadius:9,transition:"background .16s"}}
          onMouseEnter={e=>e.currentTarget.style.background=C.bg}
          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13.5,color:C.text,fontWeight:550}}>Auto-prompt HR record on hire</div>
            <div style={{fontSize:12,color:C.text3,marginTop:2,lineHeight:1.5}}>When Marketing your Job Platform hires someone, prompt for their HR Suite record (department, manager, salary)</div>
          </div>
          <Switch on={d.privacy?.allowNorthHireProfileImport??true} onChange={v=>setSection("privacy","allowNorthHireProfileImport",v)}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 12px",borderRadius:9,transition:"background .16s"}}
          onMouseEnter={e=>e.currentTarget.style.background=C.bg}
          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13.5,color:C.text,fontWeight:550}}>Let employees opt out</div>
            <div style={{fontSize:12,color:C.text3,marginTop:2,lineHeight:1.5}}>Employees can override company defaults for their own public profile</div>
          </div>
          <Switch on={d.privacy?.allowEmployeesToOptOut??true} onChange={v=>setSection("privacy","allowEmployeesToOptOut",v)}/>
        </div>
      </>}
    </Card>

    <div style={{display:"flex",gap:10,justifyContent:"flex-end",position:"sticky",bottom:14,background:C.bg,padding:"14px 0"}}>
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
    <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:14}}>

      <Card pad={mob?20:26} style={{borderRadius:16}}>
        <div style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:16}}>
          <div style={{width:44,height:44,borderRadius:11,background:C.wash,color:C.brand,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><I n="clock" s={22}/></div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:16,fontWeight:660,color:C.text}}>Punch machine</div>
            <div style={{fontSize:12.5,color:C.text3,marginTop:3}}>Sync with on-site clocks or biometric readers.</div>
          </div>
          <Tag tone={settings.integrations.punchMachine.connected?"ok":"neutral"} sm>{settings.integrations.punchMachine.connected?"Connected":"Not connected"}</Tag>
        </div>
        {settings.integrations.punchMachine.connected
          ? <div>
              <div style={{padding:12,background:C.okBg,borderRadius:10,border:`1px solid ${C.okLn}`,marginBottom:12}}>
                <div style={{fontSize:13,fontWeight:600,color:C.text}}>{settings.integrations.punchMachine.vendor}</div>
                <div style={{fontSize:12,color:C.text2,marginTop:4}}>Last sync: {new Date(settings.integrations.punchMachine.lastSync).toLocaleString("en-CA")}</div>
              </div>
              <Btn kind="outline" size="sm" full onClick={()=>setShowPunch(true)}>Reconfigure</Btn>
            </div>
          : <Btn kind="primary" size="sm" full icon="plus" onClick={()=>setShowPunch(true)}>Connect a device</Btn>}
      </Card>

      <Card pad={mob?20:26} style={{borderRadius:16}}>
        <div style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:16}}>
          <div style={{width:44,height:44,borderRadius:11,background:C.violetBg,color:C.violet,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><I n="refresh" s={22}/></div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:16,fontWeight:660,color:C.text}}>Import from existing HR system</div>
            <div style={{fontSize:12.5,color:C.text3,marginTop:3}}>Bring in employees, history and payroll from your current HRIS.</div>
          </div>
          <Tag tone={settings.integrations.priorHRSystem.connected?"ok":"neutral"} sm>{settings.integrations.priorHRSystem.connected?"Imported":"Not connected"}</Tag>
        </div>
        {settings.integrations.priorHRSystem.connected
          ? <div>
              <div style={{padding:12,background:C.okBg,borderRadius:10,border:`1px solid ${C.okLn}`,marginBottom:12}}>
                <div style={{fontSize:13,fontWeight:600,color:C.text}}>{settings.integrations.priorHRSystem.vendor}</div>
                <div style={{fontSize:12,color:C.text2,marginTop:4}}>Last import: {new Date(settings.integrations.priorHRSystem.lastImport).toLocaleString("en-CA")}</div>
              </div>
              <Btn kind="outline" size="sm" full onClick={()=>setShowImport(true)}>Import again</Btn>
            </div>
          : <Btn kind="primary" size="sm" full icon="upload" onClick={()=>setShowImport(true)}>Start import</Btn>}
      </Card>
    </div>

    {showPunch&&<Modal onClose={()=>setShowPunch(false)} title="Connect a punch machine">
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <Banner tone="brand" icon="info" title="Choose your device">Select your device vendor. We'll walk you through the connection steps.</Banner>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {A.PUNCH_VENDORS.map(v=><button key={v.id} onClick={()=>{A.connectPunchMachine(company.id,v.name); setShowPunch(false);}} style={{display:"flex",gap:12,alignItems:"center",padding:"14px 16px",background:"#fff",border:`1px solid ${C.line}`,borderRadius:11,cursor:"pointer",fontFamily:"inherit",textAlign:"left",transition:"all .16s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=C.brand;e.currentTarget.style.background=C.tint;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.line;e.currentTarget.style.background="#fff";}}>
            <div style={{width:36,height:36,borderRadius:9,background:C.wash,color:C.brand,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><I n={v.kind==="cloud"?"globe":"clock"} s={18}/></div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13.5,fontWeight:640,color:C.text}}>{v.name}</div>
              <div style={{fontSize:12,color:C.text3,marginTop:2}}>{v.kind==="cloud"?"Cloud sync via API":"On-site device"}</div>
            </div>
            <I n="chevR" s={16} c={C.text3}/>
          </button>)}
        </div>
      </div>
    </Modal>}

    {showImport&&<Modal onClose={()=>setShowImport(false)} title="Import from your HR system">
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <Banner tone="brand" icon="upload" title="Migration wizard">We'll import employees, roles, salaries and (where available) attendance history. Your existing NorthHire data won't be overwritten.</Banner>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {A.PRIOR_HR_VENDORS.map(v=><button key={v.id} onClick={()=>{A.connectPriorSystem(company.id,v.name); setShowImport(false); setTimeout(()=>alert("Import started — you'll get a summary email when it's done."),200);}} style={{display:"flex",gap:12,alignItems:"center",padding:"14px 16px",background:"#fff",border:`1px solid ${C.line}`,borderRadius:11,cursor:"pointer",fontFamily:"inherit",textAlign:"left",transition:"all .16s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=C.brand;e.currentTarget.style.background=C.tint;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.line;e.currentTarget.style.background="#fff";}}>
            <div style={{width:36,height:36,borderRadius:9,background:C.violetBg,color:C.violet,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><I n="refresh" s={18}/></div>
            <div style={{fontSize:13.5,fontWeight:640,color:C.text,flex:1}}>{v.name}</div>
            <I n="chevR" s={16} c={C.text3}/>
          </button>)}
        </div>
      </div>
    </Modal>}
  </div>;
}
