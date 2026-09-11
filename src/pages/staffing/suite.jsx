import { useState, useEffect } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import {
  Btn, Card, Tag, Field, Input, Sel, Area, Banner, Lbl, Modal, DatePicker, SmartPortrait, SmartScene,
  SmartLogo, Empty, ConfirmDialog, usePagination, Pagination, TH_CLASS as TH_CLS, TD_CLASS as TD_CLS,
} from "../../design/primitives.jsx";
import { _fmtDate, _weekStart } from "../../helpers/utils.js";
import { InlineList } from "../shared/formControls.jsx";
import { SEED_AGENCY_LICENSE } from "../../store/seed/agency.js";
import { useTranslation } from "../../i18n/i18n.jsx";
import { invoiceTone, timesheetTone } from "../../helpers/statusTone.js";
import { parseCsvLine } from "../../helpers/csv.js";

/* Quick-action tile tones — literal lookup (not string-interpolated into a className)
   so Tailwind's static scanner can see every class it needs to generate. */
const TONE_CLS={
  brand:{text:"text-brand",hoverBorder:"hover:border-brand"},
  ok:{text:"text-ok",hoverBorder:"hover:border-ok"},
  violet:{text:"text-violet",hoverBorder:"hover:border-violet"},
  warn:{text:"text-warn",hoverBorder:"hover:border-warn"},
};

export function AgencyLoginPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const [id,setId]=useState(""); const [pw,setPw]=useState("");
  const [err,setErr]=useState(""); const [busy,setBusy]=useState(false);
  const [mode,setMode]=useState("login"); // login | resetRequest | resetVerify

  const attempt=async()=>{
    setErr(""); setBusy(true);
    const r=await A.agencyLogin(id.trim(),pw);
    setBusy(false);
    if(!r.ok){setErr(r.msg||"Sign-in failed"); return;}
    A.go("agencyDashboard");
  };

  return <div className="bg-ink min-h-screen flex">
    {!mob&&<div className="flex-1 min-w-0 relative overflow-hidden">
      <SmartScene kind="road" tone="#F5A524" w="100%" h="100%" seed={6} style={{position:"absolute",inset:0}}/>
      <div className="absolute inset-0" style={{background:"linear-gradient(180deg,rgba(11,18,32,.15) 0%,rgba(11,18,32,.75) 100%)"}}/>
      <div className="absolute left-8 right-8 bottom-9 text-white">
        <div className="text-2xl font-bold tracking-tight leading-snug mb-2">Your desk, staffed and running.</div>
        <p className="text-sm text-white/80 leading-relaxed max-w-90">Workers, timesheets, payroll and client billing — one console for the whole book.</p></div>
      <div className="absolute right-7 top-7 bg-white rounded-2xl py-3 px-4 shadow-lg flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-xl bg-[#FDF5E6] text-[#8F5B05] flex items-center justify-center"><I n="users" s={18}/></div>
        <div><div className="text-sm font-bold text-text">7 workers</div>
          <div className="text-xs text-text-2 mt-0.5">on assignment right now</div></div></div>
    </div>}
    <div className={`flex-1 min-w-0 flex items-center justify-center ${mob?"p-4":"p-8"}`}>
      <div className="w-full max-w-110">
        <div className="flex items-center justify-between mb-6">
          <button onClick={()=>A.go("home")} className="bg-transparent border border-white/20 text-white py-1.5 px-3.5 rounded-lg cursor-pointer text-sm font-semibold hover:bg-white/5">← Back to NorthHire</button>
        </div>
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2.5 text-white/75">
            <div className="w-9 h-9 rounded-xl bg-[rgba(245,165,36,.18)] border border-[rgba(245,165,36,.4)] flex items-center justify-center"><I n="sparkle" s={18} c="#F5A524"/></div>
            <div className="text-left">
              <div className="text-sm font-bold text-white tracking-tight">NorthHire</div>
              <div className="text-xs text-[#F5A524] font-semibold mt-px tracking-wide">STAFFING · Agency Console</div>
            </div>
          </div>
        </div>

        {mode==="login"?<Card pad={mob?24:32} style={{borderRadius:20,background:"#fff"}}>
          <div className="mb-5">
            <h1 className="text-2xl font-bold text-text mb-1.5 tracking-tight">Good to have you back</h1>
            <p className="text-sm text-text-3 m-0 leading-snug">
              For NorthHire Staffing recruiters, payroll and management.
              Not for job seekers or clients.</p>
          </div>

          <div className="flex flex-col gap-3.5">
            <Field label="Login ID" required>
              <Input icon="user" value={id} onChange={e=>setId(e.target.value)} placeholder="firstname.lastname"/></Field>
            <Field label="Password" required>
              <Input icon="lock" type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="At least 8 characters"/></Field>
            {err&&<Banner tone="danger" icon="alert">{err}</Banner>}
            <Btn kind="primary" size="lg" onClick={attempt} disabled={busy||!id||!pw} full>
              {busy?"Signing in…":"Sign in"}</Btn>
            <button onClick={()=>{setMode("resetRequest");setErr("");}} className="bg-transparent border-0 p-0 cursor-pointer text-sm font-semibold text-brand text-center">Forgot password?</button>
          </div>

          <div className="mt-6 p-3.5 bg-bg rounded-xl text-xs text-text-3">
            <div className="font-semibold text-text-2 mb-2">Demo agency accounts (password: <code className="font-mono text-brand">staff2026</code>)</div>
            <div className="flex flex-col gap-1.5">
              {[["nadia.singh","Owner — Managing Director"],
                ["joel.tremblay","Senior Recruiter"],
                ["aisha.mohamed","Payroll & Compliance"]].map(([lid,role])=>
                <button key={lid} onClick={()=>{setId(lid); setPw("staff2026");}} className="bg-white border border-line rounded-lg py-1.5 px-2.5 cursor-pointer text-xs text-left text-text-2 flex justify-between gap-2">
                  <code className="text-brand font-mono">{lid}</code>
                  <span>{role}</span>
                </button>)}
            </div>
          </div>
        </Card>:<AgencyResetFlow onDone={()=>setMode("login")}/>}

        <div className="text-center mt-4 text-xs text-white/50">
          License: {SEED_AGENCY_LICENSE}
        </div>
      </div>
    </div>
  </div>;
}

function AgencyResetFlow({onDone}){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const [stage,setStage]=useState("request"); // request | verify | done
  const [email,setEmail]=useState(""); const [code,setCode]=useState(""); const [newPw,setNewPw]=useState("");
  const [err,setErr]=useState(""); const [busy,setBusy]=useState(false); const [sentCode,setSentCode]=useState("");
  const [cooldown,setCooldown]=useState(0);
  useEffect(()=>{if(cooldown<=0)return; const t=setTimeout(()=>setCooldown(c=>c-1),1000); return()=>clearTimeout(t);},[cooldown]);

  const request=async()=>{setErr("");setBusy(true);const r=await A.agencyResetRequest(email);setBusy(false);
    if(!r.ok){setErr(r.msg);return;} setSentCode(r.code); setStage("verify"); setCooldown(60);};
  const resend=async()=>{if(cooldown>0)return; setErr("");const r=await A.agencyResetRequest(email);
    if(!r.ok){setErr(r.msg);return;} setSentCode(r.code); setCooldown(60);};
  const confirm=async()=>{setErr(""); if(newPw.length<8){setErr("Password must be at least 8 characters");return;}
    setBusy(true); const r=await A.agencyResetConfirm(email,code,newPw); setBusy(false);
    if(!r.ok){setErr(r.msg);return;} setStage("done");};

  return <Card pad={mob?24:32} style={{borderRadius:20,background:"#fff"}}>
    {stage==="request"&&<>
      <h1 className="text-2xl font-bold text-text mb-1.5 tracking-tight">Reset your password</h1>
      <p className="text-sm text-text-3 mb-4 leading-snug">Enter the email on your agency account and we'll send a reset code.</p>
      <Field label="Email"><Input icon="mail" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@northhirestaffing.ca"/></Field>
      {err&&<Banner tone="danger" icon="alert" style={{marginTop:12}}>{err}</Banner>}
      <div className="flex gap-2.5 mt-4">
        <Btn kind="ghost" onClick={onDone}>Back to sign in</Btn>
        <Btn kind="primary" onClick={request} disabled={busy||!email} full>{busy?"Sending…":"Send reset code"}</Btn>
      </div>
    </>}
    {stage==="verify"&&<>
      <h1 className="text-2xl font-bold text-text mb-1.5 tracking-tight">Enter your code</h1>
      <p className="text-sm text-text-3 mb-4 leading-snug">We sent a 6-digit code to {email}. {sentCode&&<span>(Demo code: <strong>{sentCode}</strong>)</span>}</p>
      <div className="flex flex-col gap-3">
        <Field label="Reset code"><Input value={code} onChange={e=>setCode(e.target.value)} placeholder="123456"/></Field>
        <Field label="New password"><Input type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="At least 8 characters"/></Field>
      </div>
      {err&&<Banner tone="danger" icon="alert" style={{marginTop:12}}>{err}</Banner>}
      <div className="flex justify-between items-center mt-3">
        <button onClick={()=>setStage("request")} className="bg-transparent border-0 p-0 cursor-pointer text-sm text-text-2">← Different email</button>
        <button onClick={resend} disabled={cooldown>0} className={`bg-transparent border-0 p-0 text-sm font-semibold ${cooldown>0?"text-text-3 cursor-not-allowed":"text-brand cursor-pointer"}`}>
          {cooldown>0?`Resend in ${cooldown}s`:"Resend code"}</button>
      </div>
      <Btn kind="primary" size="lg" full onClick={confirm} disabled={busy} style={{marginTop:14}}>{busy?"Resetting…":"Reset password"}</Btn>
    </>}
    {stage==="done"&&<div className="text-center">
      <div className="w-14 h-14 rounded-full bg-ok-bg border-2 border-ok-ln flex items-center justify-center mx-auto mb-4"><I n="check" s={26} c={C.ok}/></div>
      <h1 className="text-xl font-bold text-text mb-1.5 tracking-tight">Password updated</h1>
      <p className="text-sm text-text-3 mb-5">Sign in with your new password.</p>
      <Btn kind="primary" full onClick={onDone}>Back to sign in</Btn>
    </div>}
  </Card>;
}

/* ─── Dashboard: role-shaped KPIs ─── */
export function AgencyDashboard(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const staff=A.agencyCurrentStaff();
  const kpi=A.agencyKPIs();
  const submittedTs=A.timesheets.filter(t=>t.status==="submitted");
  const openOrders=A.openJobOrders().sort((a,b)=>{
    const uw={high:0,medium:1,low:2};return (uw[a.urgency]||9)-(uw[b.urgency]||9);}).slice(0,4);

  return <div>
    <div className="mb-6">
      <div className={`font-bold text-text tracking-tight ${mob?"text-2xl":"text-3xl"}`}>
        {(()=>{const h=new Date().getHours();return h<12?"Good morning":h<17?"Good afternoon":"Good evening";})()}, {staff.name.split(" ")[0]}
      </div>
      <div className="text-sm text-text-3 mt-1.5">
        {new Date().toLocaleDateString("en-CA",{weekday:"long",month:"long",day:"numeric"})} · Here's the state of the desk.
      </div>
    </div>

    {/* KPI Row */}
    <div className={`grid gap-3 mb-5 ${mob?"grid-cols-2":"grid-cols-4"}`}>
      {[
        {l:"Active assignments",v:kpi.activeCount,t:C.brand,ic:"activity",clk:"agencyAssignments"},
        {l:"Open positions",v:kpi.openPositions,t:C.warn,ic:"briefcase",clk:"agencyJobOrders",sub:`${kpi.openOrdersCount} orders`},
        {l:"Available workers",v:kpi.availableWorkers,t:C.ok,ic:"users",clk:"agencyBench"},
        {l:"Weekly run rate",v:`$${(kpi.runRateWeekly/1000).toFixed(1)}k`,t:C.violet,ic:"trend",clk:"agencyMargins",sub:"Billings @ 40hr"},
      ].map(k=><div key={k.l} data-card onClick={()=>A.go(k.clk)} className={`bg-white rounded-2xl border border-line cursor-pointer ${mob?"p-4":"p-5"}`}>
        <div className="flex justify-between items-start mb-2.5">
          <div className="w-9 h-9 rounded-lg bg-bg flex items-center justify-center" style={{color:k.t}}><I n={k.ic} s={17}/></div>
        </div>
        <div className={`font-bold tracking-tight ${mob?"text-2xl":"text-3xl"}`} style={{color:k.t}}>{k.v}</div>
        <div className="text-xs text-text-3 mt-1">{k.l}</div>
        {k.sub&&<div className="text-xs text-text-3 mt-0.5">{k.sub}</div>}
      </div>)}
    </div>

    {/* Action queue + money row */}
    <div className="grid gap-4 mb-4" style={{gridTemplateColumns:mob?"1fr":"1.4fr 1fr"}}>
      <div>
        <Card pad={mob?18:24} style={{borderRadius:16}}>
          <div className="flex justify-between items-center mb-3.5">
            <Lbl style={{margin:0}}>Urgent job orders</Lbl>
            <Btn kind="ghost" size="sm" onClick={()=>A.go("agencyJobOrders")}>See all</Btn>
          </div>
          {openOrders.length===0
            ? <Empty icon="briefcase" title="No open orders" body="You're all filled. Time to prospect for new clients."
                action={<Btn kind="primary" size="sm" icon="plus" onClick={()=>A.go("agencyJobOrders")}>Add job order</Btn>}/>
            : <div className="flex flex-col gap-2.5">
                {openOrders.map(jo=>{const client=A.staffingClient(jo.client); const remaining=jo.positions-jo.filled;
                  return <div key={jo.id} data-card onClick={()=>A.go("agencyJobOrders")}
                    className="py-3 px-3.5 bg-bg rounded-xl border border-line cursor-pointer flex gap-3 items-center">
                    <Tag tone={jo.urgency==="high"?"danger":jo.urgency==="medium"?"warn":"neutral"} sm>{jo.urgency}</Tag>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-text overflow-hidden text-ellipsis whitespace-nowrap">{jo.title}</div>
                      <div className="text-xs text-text-3 mt-1">{client?.name||"—"} · {jo.location.split(" — ")[0]}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-brand">{jo.filled}/{jo.positions}</div>
                      <div className="text-xs text-text-3 mt-0.5">{remaining} to fill</div>
                    </div>
                  </div>;})}
              </div>}
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <Card pad={mob?18:20} style={{borderRadius:16}}>
          <Lbl>Money on the desk</Lbl>
          <div className="flex flex-col gap-2.5">
            <div className="flex justify-between items-center py-2.5 px-3 bg-bg rounded-lg">
              <span className="text-sm text-text-2">AR outstanding</span>
              <span className="text-base font-bold text-brand tabular-nums">${kpi.arTotal.toLocaleString("en-CA",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
            </div>
            {kpi.overdueTotal>0&&<div className="flex justify-between items-center py-2.5 px-3 bg-red-bg rounded-lg border border-red-ln">
              <span className="text-sm text-text-2">Overdue (chase)</span>
              {/* Explicit min/max fraction digits so a value ending in .20 renders as $3,435.20
                  not $3,435.2 - a hand-rolled Math.round or toLocaleString() without options
                  drops the trailing zero, which reads as broken next to sibling values. */}
              <span className="text-base font-bold text-red tabular-nums">${kpi.overdueTotal.toLocaleString("en-CA",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
            </div>}
            <div className="flex justify-between items-center py-2.5 px-3 bg-bg rounded-lg">
              <span className="text-sm text-text-2">Placements in flight</span>
              <span className="text-base font-bold text-violet">{kpi.inProgressPlacements}</span>
            </div>
            {kpi.guaranteeExpiring>0&&<div className="flex justify-between items-center py-2.5 px-3 bg-warn-bg rounded-lg border border-warn-ln">
              <span className="text-sm text-text-2">Guarantees ending soon</span>
              <span className="text-base font-bold text-warn">{kpi.guaranteeExpiring}</span>
            </div>}
          </div>
        </Card>

        {submittedTs.length>0&&<Card pad={mob?18:20} style={{borderRadius:16,background:C.warnBg,border:`1px solid ${C.warnLn}`}}>
          <div className="flex gap-3 items-center mb-3">
            <div className="w-9 h-9 rounded-xl bg-white text-warn flex items-center justify-center"><I n="clock" s={18}/></div>
            <div>
              <div className="text-sm font-semibold text-text">Timesheets waiting</div>
              <div className="text-xs text-text-2 mt-0.5">{submittedTs.length} submitted, awaiting approval</div>
            </div>
          </div>
          <Btn kind="warn" size="sm" full onClick={()=>A.go("agencyTimesheets")}>Review pending timesheets</Btn>
        </Card>}
      </div>
    </div>

    {/* Quick actions */}
    <Card pad={mob?18:24} style={{borderRadius:16}}>
      <Lbl>Quick actions</Lbl>
      <div className={`grid gap-2.5 ${mob?"grid-cols-2":"grid-cols-4"}`}>
        {[["Add job order","plus","agencyJobOrders","brand"],
          ["Place a worker","user","agencyBench","ok"],
          ["Run payroll","wallet","agencyPayroll","violet"],
          ["Generate invoices","file","agencyInvoicing","warn"]].map(([l,ic,go,tone])=>
          <button key={l} onClick={()=>A.go(go)}
            className={`p-3.5 rounded-xl cursor-pointer text-sm font-semibold text-text text-left bg-bg border border-line flex gap-2.5 items-center ${TONE_CLS[tone].hoverBorder}`}>
            <div className={`w-8 h-8 rounded-lg bg-white flex items-center justify-center ${TONE_CLS[tone].text}`}><I n={ic} s={16}/></div>
            {l}
          </button>)}
      </div>
    </Card>
  </div>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   AGENCY CONSOLE — Modules
   ═══════════════════════════════════════════════════════════════════════════ */

/* Reusable pill-tab bar — {label, count?} */
function _PillTabs({items,value,onChange}){
  return <div className="flex bg-bg rounded-lg p-0.5 border border-line flex-wrap" style={{width:"fit-content"}}>
    {items.map(([v,l])=><button key={v} onClick={()=>onChange(v)}
      className={`border-0 py-1.5 px-3.5 rounded-md cursor-pointer text-xs font-semibold ${value===v?"bg-white text-brand":"bg-transparent text-text-3"}`}>{l}</button>)}
  </div>;
}

/* ─── Job Orders: client requests for workers ─── */
export function AgencyJobOrders(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const [tab,setTab]=useState("open");
  const [q,setQ]=useState("");
  const [showAdd,setShowAdd]=useState(false);
  const [selected,setSelected]=useState(null);
  const list=A.jobOrders.filter(j=>{
    if(tab!=="all"&&j.status!==tab)return false;
    if(q){const s=q.toLowerCase();
      const c=A.staffingClient(j.client); const clientName=c?A.employers.find(e=>e.id===c.employerId)?.name||"":"";
      if(!(j.title.toLowerCase().includes(s)||j.location.toLowerCase().includes(s)||clientName.toLowerCase().includes(s)))return false;}
    return true;
  }).sort((a,b)=>b.createdAt-a.createdAt);
  const pg=usePagination(list,18);
  useEffect(()=>{pg.setPage(1);},[tab,q]);

  return <div>
    <div className="flex justify-between items-center mb-4 flex-wrap gap-2.5">
      <div>
        <div className="text-lg font-bold text-text tracking-tight">{list.length} job orders</div>
        <div className="text-sm text-text-3 mt-0.5">Client requests for workers.</div>
      </div>
      <Btn kind="primary" size="sm" icon="plus" onClick={()=>setShowAdd(true)}>New job order</Btn>
    </div>

    <Card pad={mob?14:18} style={{marginBottom:14,borderRadius:12}}>
      <div className="flex gap-2.5 flex-wrap items-center">
        <_PillTabs items={[["open","Open"],["filled","Filled"],["closed","Closed"],["all","All"]]} value={tab} onChange={setTab}/>
        <div className="grow shrink basis-55 min-w-0">
          <Input icon="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search title or location"/></div>
      </div>
    </Card>

    <div className="grid gap-3" style={{gridTemplateColumns:`repeat(auto-fill,minmax(${mob?280:340}px,1fr))`}}>
      {pg.pageItems.map(jo=>{const client=A.staffingClient(jo.client);
        const remaining=jo.positions-jo.filled;
        const daysOld=Math.floor((Date.now()-jo.createdAt)/864e5);
        return <div key={jo.id} data-card onClick={()=>setSelected(jo.id)}
          className={`bg-white rounded-2xl cursor-pointer ${mob?"p-4":"p-5"}`} style={{border:`1px solid ${jo.urgency==="high"?C.dangerLn:C.line}`}}>
          <div className="flex gap-2 items-center mb-2 flex-wrap">
            <Tag tone={jo.urgency==="high"?"danger":jo.urgency==="medium"?"warn":"neutral"} sm>{jo.urgency}</Tag>
            <Tag tone={jo.status==="open"?"brand":jo.status==="filled"?"ok":"neutral"} sm>{jo.status}</Tag>
            <span className="text-xs text-text-3 ml-auto">{daysOld}d old</span>
          </div>
          <div className="font-semibold text-text tracking-tight leading-snug mb-1.5" style={{fontSize:15}}>{jo.title}</div>
          <div className="text-xs text-text-2 mb-3">{client?.name} · {jo.location.split(" — ")[0]}</div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="py-2.5 px-3 bg-bg rounded-lg">
              <div className="text-xs text-text-3 font-semibold tracking-wide uppercase" style={{fontSize:10.5}}>Pay/Bill</div>
              <div className="text-sm font-semibold text-text mt-1">${jo.payRate} / ${jo.billRate}/hr</div>
            </div>
            <div className="py-2.5 px-3 bg-bg rounded-lg">
              <div className="text-xs text-text-3 font-semibold tracking-wide uppercase" style={{fontSize:10.5}}>Filled</div>
              <div className="text-sm font-semibold text-brand mt-1">{jo.filled}/{jo.positions}{remaining>0?` (${remaining} left)`:""}</div>
            </div>
          </div>
          <div className="text-xs text-text-3">Starts {jo.startDate} · {jo.ongoing?"Ongoing":`Ends ${jo.endDate}`}</div>
        </div>;})}
      {list.length===0&&<Empty icon="briefcase" title="No job orders" body="Add a new order or change the filter."/>}
    </div>
    <Pagination {...pg}/>

    {selected&&<_JobOrderDetail id={selected} onClose={()=>setSelected(null)}/>}
    {showAdd&&<_NewJobOrderModal onClose={()=>setShowAdd(false)}/>}
  </div>;
}

const SUBMITTAL_STAGE_LABEL={submitted:"Submitted",client_review:"Client review",interview:"Interview",offer:"Offer",placed:"Placed",rejected:"Rejected"};
const SUBMITTAL_STAGE_ORDER=["submitted","client_review","interview","offer"];
function _JobOrderDetail({id,onClose}){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const jo=A.jobOrder(id); if(!jo)return null;
  const client=A.staffingClient(jo.client);
  const filled=A.assignments.filter(a=>a.jobOrder===jo.id);
  const [showPlace,setShowPlace]=useState(false);
  const [placingSubmittal,setPlacingSubmittal]=useState(null);
  const [showAllMatches,setShowAllMatches]=useState(false);
  useEffect(()=>{A.loadSubmittals(jo.id);},[jo.id]);
  const submittalList=(A.submittals[jo.id]||[]).filter(s=>!["placed","rejected"].includes(s.stage));
  const submittedWorkerIds=new Set((A.submittals[jo.id]||[]).filter(s=>!["placed","rejected"].includes(s.stage)).map(s=>s.worker));
  const advanceSubmittal=(s)=>{
    const idx=SUBMITTAL_STAGE_ORDER.indexOf(s.stage);
    if(idx<0||idx===SUBMITTAL_STAGE_ORDER.length-1){setPlacingSubmittal(s);return;}
    A.updateSubmittal(s.id,jo.id,{stage:SUBMITTAL_STAGE_ORDER[idx+1]});
  };
  const availableWorkers=A.workers.filter(w=>w.status==="active"&&w.availability==="available");
  /* Match: a worker "has" a must-have ticket if either string contains the other in full,
     not just a first-word substring check (was matching "Red Seal Electrician" against any
     ticket containing "red", e.g. false-positiving on an unrelated "Red River Safety" cert). */
  const matched=availableWorkers.map(w=>{
    const has=jo.mustHave.filter(mh=>{const mhL=mh.toLowerCase();
      return (w.tickets||[]).some(t=>{const tL=t.toLowerCase(); return tL.includes(mhL)||mhL.includes(tL);});});
    const score=jo.mustHave.length?Math.round((has.length/jo.mustHave.length)*100):50;
    return {w,score,hasAll:has.length===jo.mustHave.length};
  }).sort((a,b)=>b.score-a.score);

  return <Modal onClose={onClose} title="Job order" wide>
    <div className="grid gap-5" style={{gridTemplateColumns:mob?"1fr":"1fr 320px"}}>
      <div>
        <div className="flex gap-2 mb-3 flex-wrap">
          <Tag tone={jo.urgency==="high"?"danger":jo.urgency==="medium"?"warn":"neutral"} sm>{jo.urgency}</Tag>
          <Tag tone={jo.status==="open"?"brand":jo.status==="filled"?"ok":"neutral"} sm>{jo.status}</Tag>
        </div>
        <div className="text-2xl font-bold text-text tracking-tight">{jo.title}</div>
        <div className="text-sm text-text-2 mt-1.5">{client?.name} · {jo.location}</div>

        <div className="grid grid-cols-2 gap-3 mt-5 mb-4">
          {[["Positions",`${jo.filled}/${jo.positions}`],
            ["Pay/Bill",`$${jo.payRate}/$${jo.billRate}/hr`],
            ["Starts",jo.startDate],
            ["Ends",jo.ongoing?"Ongoing":jo.endDate],
            ["Shift",jo.shiftPattern],
            ["OT",jo.overtimeAvailable?"Available (1.5x)":"None"]].map(([l,v])=>
            <div key={l}><div className="text-xs font-bold text-text-3 tracking-wide uppercase mb-1">{l}</div>
              <div className="text-sm text-text">{v}</div></div>)}
        </div>

        <div className="mb-3.5">
          <Lbl>Must-have tickets</Lbl>
          <div className="flex flex-wrap gap-1.5">
            {jo.mustHave.map(m=><Tag key={m} tone="danger" sm icon="alert">{m}</Tag>)}
          </div>
        </div>
        {jo.niceToHave.length>0&&<div className="mb-3.5">
          <Lbl>Nice to have</Lbl>
          <div className="flex flex-wrap gap-1.5">
            {jo.niceToHave.map(m=><Tag key={m} tone="brand" sm>{m}</Tag>)}
          </div>
        </div>}

        <Lbl>Supervisor</Lbl>
        <div className="p-3 bg-bg rounded-lg mb-3.5">
          <div className="text-sm font-semibold text-text">{jo.supervisor}</div>
          <div className="text-xs text-text-3 mt-1">{jo.supervisorEmail}{jo.supervisorPhone?` · ${jo.supervisorPhone}`:""}</div>
        </div>

        {jo.ppe&&<div className="mb-3.5">
          <Lbl>PPE</Lbl>
          <div className="text-sm text-text-2 leading-relaxed">{jo.ppe}</div>
        </div>}
        {jo.notes&&<div>
          <Lbl>Notes</Lbl>
          <div className="text-sm text-text-2 leading-relaxed">{jo.notes}</div>
        </div>}
      </div>

      <div>
        {submittalList.length>0&&<div className="mb-4">
          <Lbl>Submittal pipeline</Lbl>
          <div className="flex flex-col gap-2">
            {submittalList.map(s=>{const w=A.worker(s.worker); const person=w?(A.people||[]).find(p=>p.id===w.personId):null;
              return <div key={s.id} className="py-2.5 px-3 bg-bg rounded-lg">
                <div className="flex gap-2.5 items-center mb-2">
                  <SmartPortrait seed={person?.seed||0} size={28} radius={7}/>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-text overflow-hidden text-ellipsis whitespace-nowrap">{person?.name||"—"}</div>
                    <Tag tone={s.stage==="offer"?"ok":"brand"} sm>{SUBMITTAL_STAGE_LABEL[s.stage]}</Tag>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <Btn kind="outline" size="xs" full onClick={()=>advanceSubmittal(s)}>{s.stage==="offer"?"Place":`Advance to ${SUBMITTAL_STAGE_LABEL[SUBMITTAL_STAGE_ORDER[SUBMITTAL_STAGE_ORDER.indexOf(s.stage)+1]]}`}</Btn>
                  <Btn kind="ghost" size="xs" onClick={()=>A.updateSubmittal(s.id,jo.id,{stage:"rejected"})}>Reject</Btn>
                </div>
              </div>;})}
          </div>
        </div>}
        <Lbl>Matched from bench</Lbl>
        <div className="flex flex-col gap-2 mb-3">
          {matched.slice(0,showAllMatches?matched.length:6).map(({w,score,hasAll})=>{const person=(A.people||[]).find(p=>p.id===w.personId);
            const alreadySubmitted=submittedWorkerIds.has(w.id);
            return <div key={w.id} className="py-2.5 px-3 bg-bg rounded-lg flex gap-2.5 items-center" style={{border:`1px solid ${hasAll?C.okLn:C.line}`}}>
              <SmartPortrait seed={person?.seed||0} size={32} radius={8}/>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-text overflow-hidden text-ellipsis whitespace-nowrap">{person?.name||"—"}</div>
                <div className="text-xs text-text-3 mt-0.5">{w.city} · ${w.payRateTarget}/hr target</div>
              </div>
              <div className="text-right shrink-0 flex items-center gap-2">
                <div className="text-sm font-bold" style={{color:hasAll?C.ok:score>=50?C.warn:C.text3}}>{score}%</div>
                {jo.status==="open"&&!alreadySubmitted&&<Btn kind="ghost" size="xs" onClick={()=>A.submitWorker(jo.id,w.id)}>Submit</Btn>}
              </div>
            </div>;})}
          {matched.length===0&&<div className="text-xs text-text-3 p-3 text-center">No available workers.</div>}
          {matched.length>6&&<button onClick={()=>setShowAllMatches(v=>!v)} className="bg-transparent border-0 p-0 cursor-pointer text-sm text-brand font-semibold text-center">
            {showAllMatches?"Show fewer":`Show all ${matched.length} matches`}</button>}
        </div>
        {jo.status==="open"&&<Btn kind="primary" size="sm" full icon="plus" onClick={()=>setShowPlace(true)}>Place a worker directly</Btn>}
      </div>
    </div>

    {showPlace&&<_PlaceWorkerModal jobOrder={jo} onClose={()=>setShowPlace(false)} onPlace={()=>{setShowPlace(false); onClose();}}/>}
    {placingSubmittal&&<_PlaceWorkerModal jobOrder={jo} preselectWorkerId={placingSubmittal.worker}
      onSubmittalPlaced={()=>A.updateSubmittal(placingSubmittal.id,jo.id,{stage:"placed"})}
      onClose={()=>setPlacingSubmittal(null)} onPlace={()=>{setPlacingSubmittal(null); onClose();}}/>}
  </Modal>;
}

function _PlaceWorkerModal({jobOrder,onClose,onPlace,preselectWorkerId,onSubmittalPlaced}){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const [workerId,setWorkerId]=useState(preselectWorkerId||"");
  const [payRate,setPayRate]=useState(jobOrder.payRate);
  const [billRate,setBillRate]=useState(jobOrder.billRate);
  const [benefitsPerHr,setBenefitsPerHr]=useState(0);
  const availableWorkers=A.workers.filter(w=>w.status==="active"&&(w.availability==="available"||w.id===preselectWorkerId));
  useEffect(()=>{if(preselectWorkerId){const w=A.workers.find(x=>x.id===preselectWorkerId); if(w){setPayRate(w.payRateTarget||jobOrder.payRate); setBenefitsPerHr(w.defaultBenefitsPerHr||0);}}},[]);
  const selectedW=availableWorkers.find(w=>w.id===workerId);
  const person=selectedW?(A.people||[]).find(p=>p.id===selectedW.personId):null;
  const econ=A.calcStaffingEconomics(Number(payRate)||0,Number(billRate)||0,selectedW?.province||"ON",Number(benefitsPerHr)||0);
  const marginOk=econ.markupPct>=A.STAFFING_AGENCY.markupFloor;
  const rateInvalid=Number(billRate)>0&&Number(payRate)>0&&Number(billRate)<Number(payRate);

  const place=async()=>{
    if(!workerId||rateInvalid)return;
    await A.createAssignment({worker:workerId,client:jobOrder.client,jobOrder:jobOrder.id,
      payRate:Number(payRate),billRate:Number(billRate),benefitsPerHr:Number(benefitsPerHr)||0,
      startDate:jobOrder.startDate,endDate:jobOrder.endDate,ongoing:jobOrder.ongoing,
      supervisor:jobOrder.supervisor,supervisorEmail:jobOrder.supervisorEmail,
      site:jobOrder.location,shiftPattern:jobOrder.shiftPattern,notes:""});
    if(onSubmittalPlaced)await onSubmittalPlaced();
    onPlace();
  };

  return <Modal onClose={onClose} title="Place a worker">
    <div className="flex flex-col gap-3.5">
      <Field label="Worker" required>
        <Sel value={workerId} onChange={e=>{setWorkerId(e.target.value); const w=availableWorkers.find(x=>x.id===e.target.value); if(w){setPayRate(w.payRateTarget||jobOrder.payRate); setBenefitsPerHr(w.defaultBenefitsPerHr||0);}}}>
          <option value="">Select from bench…</option>
          {availableWorkers.map(w=>{const p=(A.people||[]).find(pp=>pp.id===w.personId);
            return <option key={w.id} value={w.id}>{p?.name||w.id} — {w.city}, {w.province}</option>;})}
        </Sel>
      </Field>
      {selectedW&&<div className="p-3 bg-tint border border-line-2 rounded-lg">
        <div className="flex gap-2.5 items-center">
          <SmartPortrait seed={person?.seed||0} size={36} radius={9}/>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-text">{person?.name}</div>
            <div className="text-xs text-text-3 mt-0.5">{selectedW.tickets.slice(0,3).join(", ")}</div>
          </div>
        </div>
      </div>}
      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Pay rate ($/hr)" required><Input type="number" min="0" step="0.5" value={payRate} onChange={e=>setPayRate(e.target.value)}/></Field>
        <Field label="Bill rate ($/hr)" required><Input type="number" min="0" step="0.5" value={billRate} onChange={e=>setBillRate(e.target.value)}/></Field>
      </div>
      <Field label="Benefits/hr" hint="Health/dental/RRSP burden for this placement — defaults to the worker's profile default.">
        <Input type="number" min="0" step="0.05" value={benefitsPerHr} onChange={e=>setBenefitsPerHr(e.target.value)}/>
      </Field>
      {rateInvalid&&<Banner tone="danger" icon="alert">Bill rate can't be below pay rate — that's a guaranteed loss before burden is even added.</Banner>}
      {selectedW&&<Card pad={14} style={{borderRadius:11,background:marginOk?C.okBg:C.warnBg,border:`1px solid ${marginOk?C.okLn:C.warnLn}`}}>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-text-3 font-semibold">MARKUP</span>
          <span className="font-bold" style={{color:marginOk?C.ok:C.warn}}>{econ.markupPct}%</span>
        </div>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-text-3 font-semibold">BURDEN/HR ({selectedW.province})</span>
          <span className="font-bold text-text">${econ.burden}</span>
        </div>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-text-3 font-semibold">TRUE COST/HR (after burden)</span>
          <span className="font-bold text-text">${econ.trueCost}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-text-3 font-semibold">MARGIN/HR</span>
          <span className="font-bold" style={{color:econ.margin>0?C.ok:C.danger}}>${econ.margin}</span>
        </div>
        <div className="text-xs text-text-3 mt-2 pt-2 border-t border-line-soft">
          Burden rates are province-specific — the same pay/bill rate can carry a different margin in another province.</div>
        {!marginOk&&<div className="text-xs text-warn mt-2 pt-2 border-t border-warn-ln">
          Below {A.STAFFING_AGENCY.markupFloor}% markup floor. Reconsider rates or you're losing money on WSIB claims.</div>}
      </Card>}
      <div className="flex gap-2.5 justify-end">
        <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
        <Btn kind="primary" onClick={place} disabled={!workerId||!payRate||!billRate||rateInvalid}>Confirm placement</Btn>
      </div>
    </div>
  </Modal>;
}

/* Placing a worker was only reachable via Job Orders -> detail -> Place modal (which picks a
   worker for a fixed order). This is the inverse: pick an open order for a fixed worker, so a
   recruiter scanning the bench can place someone directly from that row. */
function _PlaceFromBenchModal({worker:w,onClose,onPlace}){
  const A=use();
  const person=(A.people||[]).find(p=>p.id===w.personId);
  const openOrders=A.jobOrders.filter(j=>j.status==="open");
  const [orderId,setOrderId]=useState("");
  const jobOrder=openOrders.find(j=>j.id===orderId);
  const [payRate,setPayRate]=useState(w.payRateTarget||0);
  const [billRate,setBillRate]=useState(jobOrder?.billRate||0);
  const [benefitsPerHr,setBenefitsPerHr]=useState(w.defaultBenefitsPerHr||0);
  const econ=A.calcStaffingEconomics(Number(payRate)||0,Number(billRate)||0,w.province,Number(benefitsPerHr)||0);
  const marginOk=econ.markupPct>=A.STAFFING_AGENCY.markupFloor;
  const rateInvalid=Number(billRate)>0&&Number(payRate)>0&&Number(billRate)<Number(payRate);

  const place=()=>{
    if(!jobOrder||rateInvalid)return;
    A.createAssignment({worker:w.id,client:jobOrder.client,jobOrder:jobOrder.id,
      payRate:Number(payRate),billRate:Number(billRate),benefitsPerHr:Number(benefitsPerHr)||0,
      startDate:jobOrder.startDate,endDate:jobOrder.endDate,ongoing:jobOrder.ongoing,
      supervisor:jobOrder.supervisor,supervisorEmail:jobOrder.supervisorEmail,
      site:jobOrder.location,shiftPattern:jobOrder.shiftPattern,notes:""});
    onPlace();
  };

  return <Modal onClose={onClose} title={`Place ${person?.name||"worker"}`}>
    <div className="flex flex-col gap-3.5">
      <Field label="Job order" required>
        <Sel value={orderId} onChange={e=>{setOrderId(e.target.value); const j=openOrders.find(x=>x.id===e.target.value); if(j)setBillRate(j.billRate);}}>
          <option value="">Select an open job order…</option>
          {openOrders.map(j=>{const c=A.staffingClient(j.client); const emp=A.employers.find(e=>e.id===c?.employerId);
            return <option key={j.id} value={j.id}>{j.title} — {emp?.name||c?.id}</option>;})}
        </Sel>
      </Field>
      {jobOrder&&<div className="grid grid-cols-2 gap-2.5">
        <Field label="Pay rate ($/hr)" required><Input type="number" min="0" step="0.5" value={payRate} onChange={e=>setPayRate(e.target.value)}/></Field>
        <Field label="Bill rate ($/hr)" required><Input type="number" min="0" step="0.5" value={billRate} onChange={e=>setBillRate(e.target.value)}/></Field>
      </div>}
      {jobOrder&&<Field label="Benefits/hr" hint="Defaults to this worker's profile default."><Input type="number" min="0" step="0.05" value={benefitsPerHr} onChange={e=>setBenefitsPerHr(e.target.value)}/></Field>}
      {rateInvalid&&<Banner tone="danger" icon="alert">Bill rate can't be below pay rate.</Banner>}
      {jobOrder&&<Card pad={14} style={{borderRadius:11,background:marginOk?C.okBg:C.warnBg,border:`1px solid ${marginOk?C.okLn:C.warnLn}`}}>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-text-3 font-semibold">MARKUP</span>
          <span className="font-bold" style={{color:marginOk?C.ok:C.warn}}>{econ.markupPct}%</span>
        </div>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-text-3 font-semibold">BURDEN/HR ({w.province})</span>
          <span className="font-bold text-text">${econ.burden}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-text-3 font-semibold">MARGIN/HR</span>
          <span className="font-bold" style={{color:econ.margin>0?C.ok:C.danger}}>${econ.margin}</span>
        </div>
      </Card>}
      <div className="flex gap-2.5 justify-end">
        <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
        <Btn kind="primary" onClick={place} disabled={!jobOrder||!payRate||!billRate||rateInvalid}>Confirm placement</Btn>
      </div>
    </div>
  </Modal>;
}

function _NewJobOrderModal({onClose}){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const [d,setD]=useState({client:"",title:"",positions:1,location:"",province:"ON",
    startDate:_fmtDate(new Date()),endDate:"",ongoing:false,
    shiftPattern:"Mon-Fri 8am-4pm",overtimeAvailable:false,
    payRate:0,billRate:0,mustHave:[],niceToHave:[],
    supervisor:"",supervisorEmail:"",supervisorPhone:"",
    urgency:"medium",ppe:"",notes:""});
  const set=(k,v)=>setD(p=>({...p,[k]:v}));
  const client=A.staffingClient(d.client);
  const rateInvalid=d.billRate>0&&d.payRate>0&&d.billRate<d.payRate;
  useEffect(()=>{if(client){set("supervisor",client.notes?.split(" ")[0]||""); set("supervisorEmail",client.defaultSupervisorEmail||"");}},[d.client]);
  const submit=async()=>{
    if(!d.title||!d.client||rateInvalid)return;
    try{await A.createJobOrder(d); onClose();}
    catch(err){A.toast(err.message,"danger");}
  };
  return <Modal onClose={onClose} title="New job order" wide>
    <div className="flex flex-col gap-3.5">
      <div className={`grid gap-3 ${mob?"grid-cols-1":"grid-cols-2"}`}>
        <Field label="Client" required>
          <Sel value={d.client} onChange={e=>set("client",e.target.value)}>
            <option value="">Select client…</option>
            {A.staffingClients.filter(c=>c.status==="active").map(c=>{const emp=A.employers.find(e=>e.id===c.employerId);
              return <option key={c.id} value={c.id}>{emp?.name||c.id}</option>;})}
          </Sel></Field>
        <Field label="Urgency"><Sel value={d.urgency} onChange={e=>set("urgency",e.target.value)}>
          {["low","medium","high"].map(u=><option key={u}>{u}</option>)}</Sel></Field>
      </div>
      <Field label="Job title" required><Input value={d.title} onChange={e=>set("title",e.target.value)} placeholder="e.g. Journeyperson Electricians — Commercial Site"/></Field>
      <div className={`grid gap-3 ${mob?"grid-cols-1":"grid-cols-3"}`}>
        <Field label="Positions"><Input type="number" min="1" value={d.positions} onChange={e=>set("positions",Number(e.target.value)||1)}/></Field>
        <Field label="Pay rate ($/hr)" required><Input type="number" min="0" step="0.5" value={d.payRate} onChange={e=>set("payRate",Number(e.target.value)||0)}/></Field>
        <Field label="Bill rate ($/hr)" required><Input type="number" min="0" step="0.5" value={d.billRate} onChange={e=>set("billRate",Number(e.target.value)||0)}/></Field>
      </div>
      {rateInvalid&&<Banner tone="danger" icon="alert">Bill rate can't be below pay rate.</Banner>}
      <div className={`grid gap-3 ${mob?"grid-cols-1":"grid-cols-2"}`}>
        <Field label="Location"><Input icon="pin" value={d.location} onChange={e=>set("location",e.target.value)} placeholder="Calgary AB — Foothills Hospital"/></Field>
        <Field label="Province"><Sel value={d.province} onChange={e=>set("province",e.target.value)}>
          {Object.keys(A.STAFFING_RATES).map(p=><option key={p} value={p}>{A.STAFFING_RATES[p].label}</option>)}</Sel></Field>
      </div>
      <div className={`grid gap-3 ${mob?"grid-cols-1":"grid-cols-3"}`}>
        <Field label="Start date" required><DatePicker value={d.startDate} onChange={v=>set("startDate",v)}/></Field>
        <Field label="End date"><DatePicker value={d.endDate} onChange={v=>set("endDate",v)} min={d.startDate}/></Field>
        <Field label=" "><label className="flex items-center gap-2 py-2 text-sm text-text-2">
          <input type="checkbox" checked={d.ongoing} onChange={e=>set("ongoing",e.target.checked)}/> Ongoing</label></Field>
      </div>
      <Field label="Shift pattern"><Input value={d.shiftPattern} onChange={e=>set("shiftPattern",e.target.value)}/></Field>
      <Field label="Must-have tickets"><InlineList value={d.mustHave} onChange={v=>set("mustHave",v)} icon="alert" placeholder="e.g. Red Seal Electrician"/></Field>
      <Field label="Nice-to-have"><InlineList value={d.niceToHave} onChange={v=>set("niceToHave",v)} icon="sparkle" placeholder="e.g. Blueprint Reading"/></Field>
      <div className={`grid gap-3 ${mob?"grid-cols-1":"grid-cols-2"}`}>
        <Field label="Client supervisor"><Input value={d.supervisor} onChange={e=>set("supervisor",e.target.value)} placeholder="Site foreman name"/></Field>
        <Field label="Supervisor email"><Input icon="mail" value={d.supervisorEmail} onChange={e=>set("supervisorEmail",e.target.value)}/></Field>
      </div>
      <Field label="Notes"><Area rows={3} value={d.notes} onChange={e=>set("notes",e.target.value)}/></Field>
      <div className="flex gap-2.5 justify-end">
        <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
        <Btn kind="primary" onClick={submit} disabled={!d.title||!d.client||!d.payRate||!d.billRate||rateInvalid}>Create order</Btn>
      </div>
    </div>
  </Modal>;
}

/* ─── Bench: available workers ─── */
export function AgencyBench(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const [q,setQ]=useState(""); const [prov,setProv]=useState("all"); const [avail,setAvail]=useState("all");
  const [ticketFilter,setTicketFilter]=useState("all"); const [rateMin,setRateMin]=useState(""); const [rateMax,setRateMax]=useState("");
  const [placing,setPlacing]=useState(null);
  // Union of every ticket across the bench, so the filter offers what's actually there rather
  // than a hardcoded list that goes stale as new tickets appear.
  const allTickets=[...new Set(A.workers.flatMap(w=>w.tickets||[]))].sort();
  const list=A.workers.filter(w=>{
    if(w.status!=="active")return false;
    if(avail!=="all"&&w.availability!==avail)return false;
    if(prov!=="all"&&w.province!==prov)return false;
    if(ticketFilter!=="all"&&!w.tickets.includes(ticketFilter))return false;
    if(rateMin&&Number(w.rateTarget||0)<Number(rateMin))return false;
    if(rateMax&&Number(w.rateTarget||0)>Number(rateMax))return false;
    if(q){const person=(A.people||[]).find(p=>p.id===w.personId);
      const s=q.toLowerCase(); const searchable=`${person?.name||""} ${w.city} ${w.tickets.join(" ")}`.toLowerCase();
      if(!searchable.includes(s))return false;}
    return true;
  });
  const pg=usePagination(list,20);
  useEffect(()=>{pg.setPage(1);},[q,prov,avail,ticketFilter,rateMin,rateMax]);
  return <div>
    <div className="mb-3.5">
      <div className="text-lg font-bold text-text">{list.length} workers on bench</div>
      <div className="text-sm text-text-3 mt-0.5">Search by name, city, or ticket. Filter by province and availability.</div>
    </div>

    <Card pad={mob?14:18} style={{marginBottom:14,borderRadius:12}}>
      <div className="flex gap-2.5 flex-wrap items-center">
        <div className="grow shrink basis-60 min-w-0">
          <Input icon="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search name, city, or ticket"/></div>
        <Sel value={prov} onChange={e=>setProv(e.target.value)} style={{maxWidth:160}}>
          <option value="all">All provinces</option>
          {Object.keys(A.STAFFING_RATES).map(p=><option key={p} value={p}>{p}</option>)}</Sel>
        <Sel value={avail} onChange={e=>setAvail(e.target.value)} style={{maxWidth:180}}>
          <option value="all">Any availability</option>
          <option value="available">Available now</option>
          <option value="on-assignment">On assignment</option>
          <option value="unavailable">Unavailable</option></Sel>
        {/* Ticket filter is the recruiter's most common query ("who has WHMIS", "any Red Seal
            electricians") - the earlier filter row only offered province and availability. */}
        <Sel value={ticketFilter} onChange={e=>setTicketFilter(e.target.value)} style={{maxWidth:200}}>
          <option value="all">Any ticket</option>
          {allTickets.map(t=><option key={t} value={t}>{t}</option>)}</Sel>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-text-3">Rate</span>
          <Input type="number" min="0" placeholder="min" value={rateMin} onChange={e=>setRateMin(e.target.value)} style={{width:80}}/>
          <span className="text-xs text-text-3">–</span>
          <Input type="number" min="0" placeholder="max" value={rateMax} onChange={e=>setRateMax(e.target.value)} style={{width:80}}/>
        </div>
      </div>
    </Card>

    <Card pad={0} style={{borderRadius:14,overflow:"hidden"}}>
      <div className="overflow-x-auto"><table className="w-full border-collapse" style={{minWidth:720}}>
        <thead><tr className="border-b-2 border-line text-left">
          {["Worker","Location","Availability","Rate target","Tickets","Vac accrued",""].map(h=>
            <th key={h} className={TH_CLS}>{h}</th>)}
        </tr></thead>
        <tbody>{pg.pageItems.map(w=>{const person=(A.people||[]).find(p=>p.id===w.personId);
          return <tr key={w.id} className="border-b border-line-soft transition-colors duration-150 cursor-pointer hover:bg-bg" onClick={()=>A.go("agencyWorkers")}>
            <td className={TD_CLS}>
              <div className="flex gap-2.5 items-center">
                <SmartPortrait seed={person?.seed||0} size={30} radius={8}/>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-text">{person?.name||"—"}</div>
                  <div className="text-xs text-text-3 mt-0.5">Since {w.onboarded}</div>
                </div>
              </div>
            </td>
            <td className={`${TD_CLS} text-sm text-text-2`}>{w.city}, {w.province}</td>
            <td className={TD_CLS}><Tag tone={w.availability==="available"?"ok":w.availability==="on-assignment"?"brand":"neutral"} sm>{w.availability}</Tag></td>
            <td className={`${TD_CLS} text-sm text-text font-semibold`}>${w.payRateTarget||"—"}/hr</td>
            <td className={TD_CLS}>
              <div className="flex flex-wrap gap-1" style={{maxWidth:280}}>
                {w.tickets.slice(0,3).map(t=><Tag key={t} tone="neutral" sm>{t}</Tag>)}
                {/* The +N badge now names the extra tickets in its title so a reader can hover
                    to see the rest without opening the worker file. */}
                {w.tickets.length>3&&<span title={w.tickets.slice(3).join(", ")}><Tag tone="neutral" sm>+{w.tickets.length-3}</Tag></span>}
              </div>
            </td>
            <td className={`${TD_CLS} text-xs text-brand font-semibold`}>${w.vacBalance.toFixed(2)}</td>
            <td className={TD_CLS}>
              {/* On-assignment workers previously had a blank Actions cell - a recruiter
                  clicking through couldn't jump to their current assignment without navigating
                  away and hunting. Now every row has a real action. */}
              {w.availability==="available"
                ? <Btn kind="outline" size="xs" onClick={e=>{e.stopPropagation();setPlacing(w);}}>Place</Btn>
                : w.availability==="on-assignment"
                ? <Btn kind="ghost" size="xs" onClick={e=>{e.stopPropagation();A.go("agencyAssignments");}}>View assignment</Btn>
                : <span className="text-xs text-text-3">—</span>}
            </td>
          </tr>;})}
          {list.length===0&&<tr><td colSpan={7} className="p-5"><Empty icon="users" title="No matching workers" body="Try a different filter or ticket search."/></td></tr>}
        </tbody>
      </table></div>
    </Card>
    <Pagination {...pg}/>
    {placing&&<_PlaceFromBenchModal worker={placing} onClose={()=>setPlacing(null)} onPlace={()=>{A.toast(`Placement created`,"ok");setPlacing(null);}}/>}
  </div>;
}

/* ─── Assignments ─── */
export function AgencyAssignments(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const [tab,setTab]=useState("active");
  const list=A.assignments.filter(a=>tab==="all"?true:a.status===tab).sort((a,b)=>b.startDate.localeCompare(a.startDate));
  const pg=usePagination(list,20);
  useEffect(()=>{pg.setPage(1);},[tab]);
  const [editingRate,setEditingRate]=useState(null); const [rateDraft,setRateDraft]=useState({payRate:0,billRate:0});
  const startEditRate=a=>{setEditingRate(a);setRateDraft({payRate:a.payRate,billRate:a.billRate});};
  const saveRate=async()=>{
    await A.updateAssignment(editingRate.id,{payRate:Number(rateDraft.payRate),billRate:Number(rateDraft.billRate)});
    A.toast("Rate updated — logged to the audit trail","ok"); setEditingRate(null);
  };
  return <div>
    <div className="mb-3.5">
      <div className="text-lg font-bold text-text">{list.length} assignments</div>
      <div className="text-sm text-text-3 mt-0.5">Every worker deployed across every client.</div>
    </div>

    <div className="mb-3.5"><_PillTabs items={[["active","Active"],["completed","Completed"],["all","All"]]} value={tab} onChange={setTab}/></div>

    <Card pad={0} style={{borderRadius:14,overflow:"hidden"}}>
      <div className="overflow-x-auto"><table className="w-full border-collapse" style={{minWidth:720}}>
        <thead><tr className="border-b-2 border-line text-left">
          {["Worker","Client","Site","Rates","Duration","Margin","Status","Actions"].map(h=>
            <th key={h} className={TH_CLS}>{h}</th>)}
        </tr></thead>
        <tbody>{pg.pageItems.map(a=>{const w=A.worker(a.worker); const person=w?(A.people||[]).find(p=>p.id===w.personId):null;
          const client=A.staffingClient(a.client);
          const emp=client?A.employers.find(e=>e.id===client.employerId):null;
          const econ=A.assignmentMargin(a.id);
          return <tr key={a.id} className="border-b border-line-soft">
            <td className={TD_CLS}>
              <div className="flex gap-2.5 items-center">
                <SmartPortrait seed={person?.seed||0} size={30} radius={8}/>
                <span className="text-sm font-semibold text-text">{person?.name||"—"}</span>
              </div>
            </td>
            <td className={`${TD_CLS} text-sm text-text-2`}>{emp?.name||"—"}</td>
            <td className={`${TD_CLS} text-xs text-text-3 overflow-hidden text-ellipsis whitespace-nowrap`} style={{maxWidth:200}}>{a.site.split(" — ").pop()}</td>
            <td className={`${TD_CLS} text-xs text-text`}>${a.payRate}/${a.billRate}</td>
            <td className={`${TD_CLS} text-xs text-text-3`}>{a.startDate} → {a.endDate||"ongoing"}</td>
            <td className={`${TD_CLS} text-xs font-semibold`} style={{color:econ?.margin>0?C.ok:C.danger}}>
              {econ?<>${econ.margin}/hr <span className="text-text-3 font-medium">({econ.markupPct}%)</span></>:"—"}
            </td>
            <td className={TD_CLS}><Tag tone={a.status==="active"?"ok":"neutral"} sm>{a.status}</Tag></td>
            <td className={TD_CLS}><div className="flex gap-1">
              {a.status==="active"&&<Btn kind="ghost" size="xs" onClick={()=>startEditRate(a)}>Edit rate</Btn>}
              {a.status==="active"&&<Btn kind="ghost" size="xs" onClick={()=>A.endAssignment(a.id)}>Complete</Btn>}</div></td>
          </tr>;})}
        </tbody>
      </table></div>
    </Card>
    <Pagination {...pg}/>
    {editingRate&&<Modal onClose={()=>setEditingRate(null)} title="Edit assignment rate">
      <div className="flex flex-col gap-3.5">
        <Banner tone="neutral" icon="file">Rate changes on active assignments are recorded to the staffing audit log (visible on the Compliance page).</Banner>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Pay rate ($/hr)"><Input type="number" min="0" step="0.5" value={rateDraft.payRate} onChange={e=>setRateDraft({...rateDraft,payRate:e.target.value})}/></Field>
          <Field label="Bill rate ($/hr)"><Input type="number" min="0" step="0.5" value={rateDraft.billRate} onChange={e=>setRateDraft({...rateDraft,billRate:e.target.value})}/></Field>
        </div>
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>setEditingRate(null)}>Cancel</Btn>
          <Btn kind="primary" onClick={saveRate}>Save</Btn>
        </div>
      </div>
    </Modal>}
  </div>;
}

/* ─── Timesheets ─── */
function _TimesheetImportModal({onClose}){
  const A=use();
  const [csv,setCsv]=useState("");
  const [importing,setImporting]=useState(false);
  const [results,setResults]=useState(null);
  const runImport=async()=>{
    const lines=csv.trim().split("\n").filter(l=>l.trim());
    const dataLines=lines[0]?.toLowerCase().startsWith("email")?lines.slice(1):lines;
    const rows=dataLines.map(l=>{
      const [email,weekStart,mon,tue,wed,thu,fri,sat,sun,otHours]=parseCsvLine(l);
      return {email,weekStart,mon:Number(mon)||0,tue:Number(tue)||0,wed:Number(wed)||0,thu:Number(thu)||0,fri:Number(fri)||0,sat:Number(sat)||0,sun:Number(sun)||0,otHours:Number(otHours)||0};
    });
    if(!rows.length)return;
    setImporting(true);
    const res=await A.bulkImportTimesheets(rows);
    setImporting(false);
    setResults(res.map((r,i)=>({...r,email:rows[i].email,weekStart:rows[i].weekStart})));
  };
  const successCount=results?.filter(r=>r.ok).length||0;
  return <Modal onClose={onClose} title="Import timesheets from CSV" wide>
    <div className="flex flex-col gap-3.5">
      <Banner tone="brand" icon="info" title="Format">
        One row per worker per week: <code>email,weekStart,mon,tue,wed,thu,fri,sat,sun,otHours</code> (weekStart as YYYY-MM-DD, hours as plain numbers). A header row is optional. Each worker must have exactly one active assignment — draft timesheets are created or updated, never auto-submitted.
      </Banner>
      <Area rows={10} value={csv} onChange={e=>{setCsv(e.target.value);setResults(null);}}
        placeholder={"email,weekStart,mon,tue,wed,thu,fri,sat,sun,otHours\njordan.lee@example.ca,2026-09-01,8,8,8,8,8,0,0,0"}
        style={{fontFamily:"ui-monospace,monospace",fontSize:12.5}}/>
      {results&&<div className="p-3 bg-bg rounded-lg">
        <div className="text-sm font-semibold text-text mb-1.5">{successCount} of {results.length} rows imported</div>
        {results.filter(r=>!r.ok).length>0&&<div className="flex flex-col gap-1">
          {results.filter(r=>!r.ok).map((r,i)=><div key={i} className="text-xs text-red">Row {r.row+1} ({r.email||"—"}, {r.weekStart||"—"}): {r.error}</div>)}
        </div>}
      </div>}
      <div className="flex gap-2.5 justify-end">
        <Btn kind="ghost" onClick={onClose}>Close</Btn>
        <Btn kind="primary" icon="upload" disabled={!csv.trim()||importing} onClick={runImport}>{importing?"Importing…":"Import"}</Btn>
      </div>
    </div>
  </Modal>;
}
export function AgencyTimesheets(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const [tab,setTab]=useState("submitted");
  const [returning,setReturning]=useState(null); const [reason,setReason]=useState("");
  const [importing,setImporting]=useState(false);
  const list=A.timesheets.filter(t=>tab==="all"?true:t.status===tab).sort((a,b)=>b.weekStart.localeCompare(a.weekStart));
  const pg=usePagination(list,20);
  useEffect(()=>{pg.setPage(1);},[tab]);
  return <div>
    <div className="mb-3.5 flex justify-between items-start gap-3 flex-wrap">
      <div>
        <div className="text-lg font-bold text-text">Timesheets</div>
        <div className="text-sm text-text-3 mt-0.5">Weekly hours submitted by workers, approved by client supervisors.</div>
      </div>
      <Btn kind="outline" size="sm" icon="upload" onClick={()=>setImporting(true)}>Import CSV</Btn>
    </div>

    <div className="mb-3.5"><_PillTabs items={[["draft","Draft"],["submitted","Submitted"],["approved","Approved"],["paid","Paid"],["all","All"]].map(([v,l])=>
      [v,`${l} (${A.timesheets.filter(t=>v==="all"?true:t.status===v).length})`])} value={tab} onChange={setTab}/></div>
    {importing&&<_TimesheetImportModal onClose={()=>setImporting(false)}/>}

    <Card pad={0} style={{borderRadius:14,overflow:"hidden"}}>
      <div className="overflow-x-auto"><table className="w-full border-collapse" style={{minWidth:720}}>
        <thead><tr className="border-b-2 border-line text-left">
          {["Week","Worker","Client","Hours","Gross pay","Bill","Status","Actions"].map(h=>
            <th key={h} className={TH_CLS}>{h}</th>)}
        </tr></thead>
        <tbody>{pg.pageItems.map(t=>{const w=A.worker(t.worker); const person=w?(A.people||[]).find(p=>p.id===w.personId):null;
          const asn=A.assignment(t.assignment); const client=asn?A.staffingClient(asn.client):null;
          const emp=client?A.employers.find(e=>e.id===client.employerId):null;
          const totalHrs=A.timesheetTotal(t); const gross=A.timesheetGross(t); const bill=A.timesheetBill(t);
          return <tr key={t.id} className="border-b border-line-soft">
            <td className={`${TD_CLS} text-xs text-text-2 font-mono`}>{t.weekStart}</td>
            <td className={TD_CLS}><div className="flex gap-2.5 items-center">
              <SmartPortrait seed={person?.seed||0} size={28} radius={7}/>
              <span className="text-sm text-text font-semibold">{person?.name||"—"}</span></div></td>
            <td className={`${TD_CLS} text-xs text-text-2`}>{emp?.name||"—"}</td>
            <td className={`${TD_CLS} text-sm text-text font-semibold`}>{totalHrs}h{t.otHours>0?` (${t.otHours} OT)`:""}</td>
            <td className={`${TD_CLS} text-sm text-text`}>${gross.toFixed(2)}</td>
            <td className={`${TD_CLS} text-sm text-brand font-semibold`}>${bill.toFixed(2)}</td>
            <td className={TD_CLS}><Tag tone={timesheetTone(t.status)} sm>{t.status}</Tag></td>
            <td className={TD_CLS}>
              {t.status==="submitted"&&<div className="flex gap-1">
                <Btn kind="dangerSoft" size="xs" onClick={()=>{setReturning(t.id);setReason("");}}>Return</Btn>
                <Btn kind="primary" size="xs" onClick={()=>A.approveTimesheet(t.id,client?.defaultSupervisorEmail||"—")}>Approve on client's behalf</Btn>
              </div>}
              {t.status==="submitted"&&<div className="text-xs text-text-3 mt-0.5" style={{fontSize:10.5}}>Chase: {client?.defaultSupervisorEmail}</div>}
            </td>
          </tr>;})}
          {list.length===0&&<tr><td colSpan={8} className="p-5"><Empty icon="clock" title="No timesheets in this state" body="Try a different tab."/></td></tr>}
        </tbody>
      </table></div>
    </Card>
    <Pagination {...pg}/>
    {returning&&<Modal onClose={()=>setReturning(null)} title="Return timesheet">
      <div className="flex flex-col gap-3.5">
        <Field label="Reason for the client / worker" required>
          <Area rows={3} value={reason} onChange={e=>setReason(e.target.value)} placeholder="e.g. Hours don't match the site sign-in sheet for Thursday — please confirm and resubmit."/></Field>
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>setReturning(null)}>Cancel</Btn>
          <Btn kind="dangerSoft" disabled={!reason.trim()} onClick={()=>{A.rejectTimesheet(returning,reason.trim());setReturning(null);}}>Return timesheet</Btn>
        </div>
      </div>
    </Modal>}
  </div>;
}

/* ─── Payroll ─── */
export function AgencyPayroll(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const [showRun,setShowRun]=useState(false);
  const [finalizing,setFinalizing]=useState(null);
  const [reversing,setReversing]=useState(null); const [reverseReason,setReverseReason]=useState("");
  /* The run only ever sweeps a rolling 14-day window — the "ready" count has to use the same
     window, or an approved timesheet older than that shows as ready forever but never actually
     gets paid. */
  const periodStart=(()=>{const d=new Date();d.setDate(d.getDate()-14);return _fmtDate(d);})();
  const periodEnd=_fmtDate(new Date());
  const readyTs=A.timesheets.filter(t=>t.status==="approved"&&t.weekStart>=periodStart&&t.weekStart<periodEnd);
  const readyToPay=readyTs.length;
  const readyGross=readyTs.reduce((s,t)=>s+A.timesheetGross(t),0);
  const pg=usePagination(A.staffingPayruns,20);
  return <div>
    <div className="mb-3.5">
      <div className="text-lg font-bold text-text">Staffing payroll</div>
      <div className="text-sm text-text-3 mt-0.5">Biweekly runs. Workers paid Thursday for the previous two weeks' approved hours.</div>
    </div>

    <Card pad={mob?18:22} style={{marginBottom:14,borderRadius:14,background:readyToPay>0?C.tint:C.bg,border:`1px solid ${readyToPay>0?C.line2:C.line}`}}>
      <div className="flex gap-3.5 items-center flex-wrap">
        <div className="w-11 h-11 rounded-xl bg-white text-brand flex items-center justify-center shrink-0"><I n="wallet" s={22}/></div>
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold text-text">Ready for next run</div>
          <div className="text-xs text-text-2 mt-0.5">{readyToPay} approved timesheets · ${readyGross.toFixed(2)} gross</div>
        </div>
        <Btn kind="primary" size="sm" icon="play" disabled={readyToPay===0} onClick={()=>setShowRun(true)}>Run biweekly payroll</Btn>
      </div>
    </Card>

    <Card pad={0} style={{borderRadius:14,overflow:"hidden"}}>
      <div className="overflow-x-auto"><table className="w-full border-collapse" style={{minWidth:720}}>
        <thead><tr className="border-b-2 border-line text-left">
          {["Period","Run date","Workers","Hours","Gross","Net","Status","Actions"].map(h=>
            <th key={h} className={TH_CLS}>{h}</th>)}
        </tr></thead>
        <tbody>{pg.pageItems.map(p=><tr key={p.id} className="border-b border-line-soft">
          <td className={`${TD_CLS} text-xs text-text-2 font-mono`}>{p.periodStart} → {p.periodEnd}</td>
          <td className={`${TD_CLS} text-xs text-text-3`}>{p.runDate}</td>
          <td className={`${TD_CLS} text-sm text-text`}>{p.workers}</td>
          <td className={`${TD_CLS} text-sm text-text`}>{p.totalHours}</td>
          <td className={`${TD_CLS} text-sm text-text`}>${p.totalGross.toLocaleString()}</td>
          <td className={`${TD_CLS} text-sm text-brand font-semibold`}>${p.totalNet.toLocaleString()}</td>
          <td className={TD_CLS}><Tag tone={p.status==="paid"?"ok":p.status==="reversed"?"neutral":"warn"} sm>{p.status}</Tag></td>
          <td className={TD_CLS}>
            {p.status==="pending"&&<Btn kind="primary" size="xs" onClick={()=>setFinalizing(p)}>Finalize</Btn>}
            {p.status==="paid"&&<Btn kind="dangerSoft" size="xs" onClick={()=>{setReversing(p);setReverseReason("");}}>Reverse</Btn>}
          </td>
        </tr>)}
        {A.staffingPayruns.length===0&&<tr><td colSpan={8} className="p-5"><Empty icon="wallet" title="No payroll runs yet" body="Run payroll once approved timesheets are ready."/></td></tr>}
        </tbody>
      </table></div>
    </Card>
    <Pagination {...pg}/>

    {showRun&&<Modal onClose={()=>setShowRun(false)} title="Run biweekly payroll">
      <div className="flex flex-col gap-3.5">
        <Banner tone="brand" icon="info" title="This will">
          Batch all approved timesheets from the last 2 weeks into a payroll run. Timesheets will be locked (marked "paid" in the system). Workers receive direct deposit Thursday.
        </Banner>
        <div className="p-3.5 bg-bg rounded-lg">
          <div className="text-sm text-text-2">Ready timesheets: <strong>{readyToPay}</strong></div>
          <div className="text-sm text-text-2 mt-1">Total gross: <strong className="text-brand">${readyGross.toFixed(2)}</strong></div>
        </div>
        <div>
          <Lbl style={{margin:"0 0 8px"}}>Workers included in this run</Lbl>
          <div className="flex flex-col gap-1.5" style={{maxHeight:220,overflowY:"auto"}}>
            {readyTs.map(t=>{const w=A.worker(t.worker); const person=w?(A.people||[]).find(p=>p.id===w.personId):null;
              return <div key={t.id} className="flex justify-between items-center py-2 px-3 bg-bg rounded-lg text-sm">
                <span className="text-text font-medium">{person?.name||"—"}</span>
                <span className="text-text-3 text-xs">{t.weekStart} · {A.timesheetTotal(t)}h · ${A.timesheetGross(t).toFixed(2)}</span>
              </div>;})}
          </div>
        </div>
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>setShowRun(false)}>Cancel</Btn>
          <Btn kind="primary" onClick={()=>{
            A.runStaffingPayroll(periodStart,periodEnd);
            setShowRun(false);
          }}>Run payroll</Btn>
        </div>
      </div>
    </Modal>}
    <ConfirmDialog open={!!finalizing} onClose={()=>setFinalizing(null)} kind="primary" confirmLabel="Finalize run"
      title={`Finalize the ${finalizing?.periodStart} → ${finalizing?.periodEnd} run?`}
      onConfirm={()=>A.finalizeStaffingPayrun(finalizing.id)}>
      This marks the run and its {finalizing?.workers} worker payment{finalizing?.workers===1?"":"s"} as paid. It can be reversed later from this page if needed.
    </ConfirmDialog>
    <Modal open={!!reversing} onClose={()=>setReversing(null)} title={`Reverse the ${reversing?.periodStart} → ${reversing?.periodEnd} run?`}>
      <div className="flex flex-col gap-3.5">
        <Field label="Reason for reversal" required hint="Recorded in the staffing audit log.">
          <Area rows={2} value={reverseReason} onChange={e=>setReverseReason(e.target.value)} placeholder="e.g. Finalized against the wrong period"/></Field>
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>setReversing(null)}>Cancel</Btn>
          <Btn kind="danger" disabled={!reverseReason.trim()} onClick={()=>{A.reverseStaffingPayrun(reversing.id,reverseReason.trim());setReversing(null);}}>Confirm reversal</Btn>
        </div>
      </div>
    </Modal>
  </div>;
}

/* ─── Invoicing ─── */
export function AgencyInvoicing(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const [tab,setTab]=useState("pending");
  const [showGen,setShowGen]=useState(false);
  const [genWeek,setGenWeek]=useState(_weekStart(1));
  const list=A.staffingInvoices.filter(i=>tab==="all"?true:i.status===tab).sort((a,b)=>b.issued.localeCompare(a.issued));
  const pg=usePagination(list,20);
  useEffect(()=>{pg.setPage(1);},[tab]);

  const kpis={
    pending:A.staffingInvoices.filter(i=>i.status==="pending").reduce((s,i)=>s+i.total,0),
    overdue:A.staffingInvoices.filter(i=>i.status==="overdue").reduce((s,i)=>s+i.total,0),
    paid30d:A.staffingInvoices.filter(i=>i.status==="paid"&&i.paidOn&&(Date.now()-new Date(i.paidOn).getTime())<30*864e5).reduce((s,i)=>s+i.total,0),
  };

  return <div>
    <div className="mb-3.5">
      <div className="text-lg font-bold text-text">Client invoicing</div>
      <div className="text-sm text-text-3 mt-0.5">Weekly invoice cycle. Approved timesheets → client invoice.</div>
    </div>

    <div className={`grid gap-3 mb-4 ${mob?"grid-cols-1":"grid-cols-3"}`}>
      {[["AR outstanding",kpis.pending,C.brand],
        ["Overdue",kpis.overdue,C.danger],
        ["Paid last 30 days",kpis.paid30d,C.ok]].map(([l,v,t])=>
        <Card key={l} pad={mob?16:20} style={{borderRadius:14}}>
          <div className={`font-bold tracking-tight ${mob?"text-xl":"text-2xl"}`} style={{color:t}}>${(v/1000).toFixed(1)}k</div>
          <div className="text-xs text-text-3 mt-1.5">{l}</div>
        </Card>)}
    </div>

    <div className="flex justify-between items-center mb-3.5 flex-wrap gap-2.5">
      <_PillTabs items={[["pending","Pending"],["overdue","Overdue"],["paid","Paid"],["all","All"]]} value={tab} onChange={setTab}/>
      <Btn kind="primary" size="sm" icon="plus" onClick={()=>{setGenWeek(_weekStart(1));setShowGen(true);}}>Generate weekly invoices</Btn>
    </div>

    <Card pad={0} style={{borderRadius:14,overflow:"hidden"}}>
      <div className="overflow-x-auto"><table className="w-full border-collapse" style={{minWidth:720}}>
        <thead><tr className="border-b-2 border-line text-left">
          {["Number","Client","Week","Total","Due","Status","Actions"].map(h=>
            <th key={h} className={TH_CLS}>{h}</th>)}
        </tr></thead>
        <tbody>{pg.pageItems.map(inv=>{const client=A.staffingClient(inv.client);
          const emp=client?A.employers.find(e=>e.id===client.employerId):null;
          const daysOverdue=inv.status==="overdue"&&inv.due?Math.floor((Date.now()-new Date(inv.due).getTime())/864e5):0;
          return <tr key={inv.id} className="border-b border-line-soft">
            <td className={`${TD_CLS} text-xs text-text-2 font-mono`}>{inv.number}</td>
            <td className={`${TD_CLS} text-sm text-text font-semibold`}>{emp?.name||"—"}</td>
            <td className={`${TD_CLS} text-xs text-text-3`}>{inv.weekStart}</td>
            <td className={`${TD_CLS} text-sm text-text font-semibold`}>${inv.total.toLocaleString()}</td>
            <td className={TD_CLS} style={{fontSize:12.5,color:daysOverdue>0?C.danger:C.text3}}>{inv.due}{daysOverdue>0?` (+${daysOverdue}d)`:""}</td>
            <td className={TD_CLS}><Tag tone={invoiceTone(inv.status)} sm>{inv.status}</Tag></td>
            <td className={TD_CLS}>
              {inv.status!=="paid"&&<Btn kind="ghost" size="xs" onClick={()=>A.markStaffingInvoicePaid(inv.id)}>Mark paid</Btn>}
            </td>
          </tr>;})}
          {list.length===0&&<tr><td colSpan={7} className="p-5"><Empty icon="file" title="No invoices" body='Click "Generate weekly invoices" once approved timesheets are ready.'/></td></tr>}
        </tbody>
      </table></div>
    </Card>
    <Pagination {...pg}/>

    {showGen&&<Modal onClose={()=>setShowGen(false)} title="Generate weekly invoices">
      <div className="flex flex-col gap-3.5">
        <Banner tone="brand" icon="info" title="Weekly cycle">
          This will batch all approved timesheets for a given week into per-client invoices. HST/GST added per province. A notification is logged to each client's billing contact on file (clients with no contact email set won't get one).
        </Banner>
        <Field label="Week starting" required>
          <DatePicker value={genWeek} onChange={setGenWeek}/>
        </Field>
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>setShowGen(false)}>Cancel</Btn>
          <Btn kind="primary" onClick={()=>{A.generateStaffingInvoices(genWeek); setShowGen(false);}}>Generate</Btn>
        </div>
      </div>
    </Modal>}
  </div>;
}

/* ─── Placements ─── */
export function AgencyPlacements(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const [tab,setTab]=useState("in-progress");
  const [clawingBack,setClawingBack]=useState(null); const [clawReason,setClawReason]=useState("");
  /* In the guarantee-window views, sort by soonest-expiring guarantee first (proactive triage)
     instead of always sorting by offer date - previously the only way to see what's expiring
     soon was the ad-hoc "<=30 days" badge, with no way to see the full order. */
  const list=A.placements.filter(p=>tab==="all"?true:p.status===tab).sort((a,b)=>
    (tab==="guaranteed"||tab==="all")&&a.guaranteeEnds&&b.guaranteeEnds?a.guaranteeEnds.localeCompare(b.guaranteeEnds):b.offeredAt.localeCompare(a.offeredAt));
  const pg=usePagination(list,18);
  useEffect(()=>{pg.setPage(1);},[tab]);
  const withRecruiter=A.placements.filter(p=>p.recruiterId);
  const commissionOwed=withRecruiter.filter(p=>p.status==="guaranteed"&&!p.commissionPaid).reduce((s,p)=>s+(p.commission||0),0);
  const commissionPaid=withRecruiter.filter(p=>p.commissionPaid).reduce((s,p)=>s+(p.commission||0),0);
  return <div>
    <div className="mb-3.5">
      <div className="text-lg font-bold text-text">Permanent placements</div>
      <div className="text-sm text-text-3 mt-0.5">Perm hires we source. Fee due on start. 90-day guarantee.</div>
    </div>

    {withRecruiter.length>0&&<div className={`grid gap-3 mb-3.5 ${mob?"grid-cols-2":"grid-cols-2"}`} style={{maxWidth:400}}>
      <Card pad={14} style={{borderRadius:12}}>
        <div className="text-xs font-bold text-text-3 uppercase tracking-wide">Commission owed</div>
        <div className="text-lg font-bold text-warn mt-1">${commissionOwed.toLocaleString()}</div>
      </Card>
      <Card pad={14} style={{borderRadius:12}}>
        <div className="text-xs font-bold text-text-3 uppercase tracking-wide">Commission paid</div>
        <div className="text-lg font-bold text-ok mt-1">${commissionPaid.toLocaleString()}</div>
      </Card>
    </div>}

    <div className="mb-3.5"><_PillTabs items={[["in-progress","In progress"],["accepted","Accepted"],["guaranteed","In guarantee"],["clawed-back","Clawed back"],["all","All"]].map(([v,l])=>
      [v,`${l} (${A.placements.filter(p=>v==="all"?true:p.status===v).length})`])} value={tab} onChange={setTab}/></div>

    <div className="grid gap-3" style={{gridTemplateColumns:mob?"1fr":"repeat(auto-fill,minmax(340px,1fr))"}}>
      {pg.pageItems.map(p=>{const client=A.staffingClient(p.client);
        const emp=client?A.employers.find(e=>e.id===client.employerId):null;
        const guaranteeDaysLeft=p.guaranteeEnds?Math.floor((new Date(p.guaranteeEnds)-Date.now())/864e5):null;
        return <div key={p.id} data-card className={`bg-white rounded-2xl border border-line ${mob?"p-4":"p-5"}`}>
          <div className="flex gap-2 mb-2.5 flex-wrap items-center">
            <Tag tone={p.status==="guaranteed"?"ok":p.status==="clawed-back"?"danger":p.status==="accepted"?"warn":"brand"} sm>{p.status}</Tag>
            {/* Urgency chip escalates as the guarantee window closes: green ok while >30 days
                out, warn 30-8, danger inside a week. Reads at a glance which placement to check
                on today - the previous flat "guarantee left" tag looked the same 25 days out as
                2 days out. */}
            {guaranteeDaysLeft!==null&&guaranteeDaysLeft>0&&guaranteeDaysLeft<=30&&
              <Tag tone={guaranteeDaysLeft<=7?"danger":"warn"} sm icon={guaranteeDaysLeft<=7?"alert":"clock"}>{guaranteeDaysLeft}d guarantee left</Tag>}
            {guaranteeDaysLeft!==null&&guaranteeDaysLeft<=0&&p.status==="accepted"&&
              <Tag tone="ok" sm icon="check">Guarantee cleared</Tag>}
          </div>
          <div className="text-base font-semibold text-text tracking-tight">{p.role}</div>
          <div className="text-sm text-text-2 mt-1">{emp?.name||"—"}</div>

          <div className="grid grid-cols-2 gap-2.5 mt-3.5 mb-3">
            <div><div className="text-xs font-bold text-text-3 tracking-wide uppercase">Salary</div>
              <div className="text-sm font-semibold text-text mt-1">${p.salary.toLocaleString()}</div></div>
            <div><div className="text-xs font-bold text-text-3 tracking-wide uppercase">Fee ({p.feePct}%)</div>
              <div className="text-sm font-bold text-brand mt-1">${p.fee.toLocaleString()}</div></div>
          </div>
          <div className="mb-3">
            <div className="text-xs font-bold text-text-3 tracking-wide uppercase mb-1">Recruiter</div>
            <Sel value={p.recruiterId||""} onChange={e=>A.assignPlacementRecruiter(p.id,e.target.value||null)} style={{fontSize:13,padding:"6px 10px"}}>
              <option value="">Unassigned</option>
              {A.agencyStaffRoster.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </Sel>
            {p.recruiterId&&<div className="flex justify-between items-center mt-1.5">
              <span className="text-xs text-text-2">Commission: <strong className="text-text">${(p.commission||0).toLocaleString()}</strong></span>
              {p.commissionPaid
                ?<Tag tone="ok" sm icon="check">Paid {p.commissionPaidAt}</Tag>
                :p.status==="guaranteed"&&<Btn kind="outline" size="xs" onClick={()=>A.payCommission(p.id)}>Pay commission</Btn>}
            </div>}
          </div>
          <div className="text-xs text-text-3 mb-2.5">
            Offered {p.offeredAt}{p.startDate?` · Started ${p.startDate}`:""}
            {p.invoicedOn?` · Invoiced ${p.invoicedOn}`:""}
            {p.paidOn?` · Paid ${p.paidOn}`:""}
          </div>
          {p.status==="clawed-back"&&<Banner tone="danger" icon="alert" title="Clawed back">
            {p.clawbackReason||"Replacement owed to client."}</Banner>}
          {p.status==="in-progress"&&<Btn kind="primary" size="xs" full onClick={()=>A.acceptPlacement(p.id,_fmtDate(new Date()))}>Mark accepted &amp; started</Btn>}
          {p.status==="accepted"&&<Btn kind="primary" size="xs" full onClick={()=>A.invoicePlacement(p.id)}>Invoice on start</Btn>}
          {p.status==="guaranteed"&&<Btn kind="dangerSoft" size="xs" full onClick={()=>{setClawingBack(p.id);setClawReason("");}}>Claw back (guarantee)</Btn>}
        </div>;})}
      {list.length===0&&<div style={{gridColumn:"1 / -1"}}><Empty icon="award" title="No placements in this state" body="Start with a job order and convert to placement."/></div>}
    </div>
    <Pagination {...pg}/>
    {clawingBack&&<Modal onClose={()=>setClawingBack(null)} title="Claw back placement">
      <div className="flex flex-col gap-3.5">
        <Banner tone="warn" icon="alert">This marks the placement clawed-back and flags a replacement owed to the client under the 90-day guarantee.</Banner>
        <Field label="Reason" required>
          <Area rows={3} value={clawReason} onChange={e=>setClawReason(e.target.value)} placeholder="e.g. Worker resigned after 3 weeks — client requesting a replacement."/></Field>
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>setClawingBack(null)}>Cancel</Btn>
          <Btn kind="dangerSoft" disabled={!clawReason.trim()} onClick={()=>{A.clawbackPlacement(clawingBack,clawReason.trim());setClawingBack(null);}}>Confirm claw back</Btn>
        </div>
      </div>
    </Modal>}
  </div>;
}

/* ─── Clients (staffing) ─── */
export function AgencyClients(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const [q,setQ]=useState(""); const [showAdd,setShowAdd]=useState(false); const [sort,setSort]=useState("name");
  const [branchFilter,setBranchFilter]=useState("");
  const [nc,setNc]=useState({employerId:"",industry:"",province:"ON",city:""});
  const availableEmployers=A.employers.filter(e=>!A.staffingClients.some(c=>c.employerId===e.id));
  const submitAdd=()=>{if(!nc.employerId)return;
    A.upsertStaffingClient(nc);
    setShowAdd(false); setNc({employerId:"",industry:"",province:"ON",city:""});};
  const filtered=A.staffingClients.filter(c=>{
    if(branchFilter&&c.branchId!==branchFilter)return false;
    if(!q)return true;
    const emp=A.employers.find(e=>e.id===c.employerId);
    return (emp?.name||"").toLowerCase().includes(q.toLowerCase())||(c.industry||"").toLowerCase().includes(q.toLowerCase());});
  /* AR-risk coloring was purely cosmetic (a color flip) with no way to actually triage by it -
     add a sort so at-risk clients surface to the top instead of being scattered alphabetically. */
  const list=[...filtered].sort((a,b)=>sort==="risk"?(b.currentAR/(b.creditLimit||1))-(a.currentAR/(a.creditLimit||1)):(A.employers.find(e=>e.id===a.employerId)?.name||"").localeCompare(A.employers.find(e=>e.id===b.employerId)?.name||""));
  const pg=usePagination(list,18);
  useEffect(()=>{pg.setPage(1);},[q]);
  return <div>
    <div className="flex justify-between items-start gap-3 flex-wrap mb-3.5">
      <div>
        <div className="text-lg font-bold text-text">{list.length} clients</div>
        <div className="text-sm text-text-3 mt-0.5">Employers we have (or want) a staffing relationship with.</div>
      </div>
      <Btn kind="primary" size="sm" icon="plus" onClick={()=>setShowAdd(true)}>Add client</Btn>
    </div>
    <div className="flex gap-3 mb-4 flex-wrap items-center">
      <div className="max-w-105 flex-1 min-w-60"><Input icon="search" placeholder="Search by employer or industry" value={q} onChange={e=>setQ(e.target.value)}/></div>
      <Sel value={sort} onChange={e=>setSort(e.target.value)} style={{width:170}}>
        <option value="name">Sort: Name</option><option value="risk">Sort: AR risk (highest first)</option></Sel>
      {A.staffingBranches.length>0&&<Sel value={branchFilter} onChange={e=>setBranchFilter(e.target.value)} style={{width:170}}>
        <option value="">All branches</option>
        {A.staffingBranches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
      </Sel>}
    </div>

    <div className="grid gap-3" style={{gridTemplateColumns:mob?"1fr":"repeat(auto-fill,minmax(340px,1fr))"}}>
      {pg.pageItems.map(c=>{const emp=A.employers.find(e=>e.id===c.employerId);
        const activeAsns=A.assignments.filter(a=>a.client===c.id&&a.status==="active").length;
        const openOrds=A.jobOrders.filter(j=>j.client===c.id&&j.status==="open").length;
        return <Card key={c.id} pad={mob?18:22} style={{borderRadius:14}}>
          <div className="flex gap-3 items-center mb-3">
            <SmartLogo e={emp||{mark:"hex",a:C.brand,b:"#fff"}} size={44} radius={11}/>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-text overflow-hidden text-ellipsis whitespace-nowrap">{emp?.name||"—"}</div>
              <div className="text-xs text-text-3 mt-1">{c.industry} · Net {c.paymentTermsDays}</div>
            </div>
            <Tag tone={c.status==="active"?"ok":c.status==="prospect"?"warn":"neutral"} sm>{c.status}</Tag>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="py-2.5 px-3 bg-bg rounded-lg text-center">
              <div className="text-base font-bold text-brand">{activeAsns}</div>
              <div className="text-xs text-text-3 mt-0.5" style={{fontSize:10.5}}>Active</div></div>
            <div className="py-2.5 px-3 bg-bg rounded-lg text-center">
              <div className="text-base font-bold text-warn">{openOrds}</div>
              <div className="text-xs text-text-3 mt-0.5" style={{fontSize:10.5}}>Open orders</div></div>
            <div className="py-2.5 px-3 bg-bg rounded-lg text-center">
              <div className="text-base font-bold" style={{color:c.currentAR>c.creditLimit*0.8?C.danger:C.text}}>${(c.currentAR/1000).toFixed(0)}k</div>
              <div className="text-xs text-text-3 mt-0.5" style={{fontSize:10.5}}>AR</div></div>
          </div>
          <div className="text-xs text-text-3 pt-3 border-t border-line-soft">
            {c.signedMsa?<>MSA signed {c.signedMsa}</>:<span className="text-warn font-semibold">MSA not signed</span>}
            {" · "}Markup target {c.markup}%
          </div>
          {A.staffingBranches.length>0&&<div className="mt-2.5">
            <Sel value={c.branchId||""} onChange={e=>A.upsertStaffingClient({employerId:c.employerId,branchId:e.target.value||null})} style={{fontSize:12,padding:"5px 8px",width:"100%"}}>
              <option value="">No branch assigned</option>
              {A.staffingBranches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
            </Sel>
          </div>}
          {!c.signedMsa&&<Btn kind="primary" size="xs" full style={{marginTop:10}} onClick={()=>A.signMsa(c.id)}>Mark MSA signed</Btn>}
          {c.currentAR>c.creditLimit*0.8&&<Btn kind="dangerSoft" size="xs" full style={{marginTop:10}}
            onClick={()=>{A.logActivity("client.ar_followup",`Followed up with ${emp?.name||c.id} on $${(c.currentAR/1000).toFixed(0)}k outstanding AR`,"alert");A.toast(`Follow-up logged for ${emp?.name}`,"ok");}}>
            Log AR follow-up</Btn>}
        </Card>;})}
      {list.length===0&&<Empty icon="building" title="No clients match" body="Try a different search, or add a new client below."/>}
    </div>
    <Pagination {...pg}/>
    {showAdd&&<Modal onClose={()=>setShowAdd(false)} title="Add a staffing client">
      <div className="flex flex-col gap-3.5">
        <Field label="Employer" required hint="Must already be a NorthHire employer account.">
          <Sel value={nc.employerId} onChange={e=>setNc({...nc,employerId:e.target.value})}>
            <option value="">Choose an employer…</option>
            {availableEmployers.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
          </Sel>
        </Field>
        <Field label="Industry"><Input value={nc.industry} onChange={e=>setNc({...nc,industry:e.target.value})} placeholder="e.g. Construction, Healthcare"/></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Province"><Sel value={nc.province} onChange={e=>setNc({...nc,province:e.target.value})}>
            {["AB","BC","MB","NB","NS","ON","QC","SK"].map(p=><option key={p}>{p}</option>)}</Sel></Field>
          <Field label="City"><Input value={nc.city} onChange={e=>setNc({...nc,city:e.target.value})} placeholder="e.g. Winnipeg"/></Field>
        </div>
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>setShowAdd(false)}>Cancel</Btn>
          <Btn kind="primary" disabled={!nc.employerId} onClick={submitAdd}>Add as prospect</Btn>
        </div>
      </div>
    </Modal>}
  </div>;
}

/* ─── Workers management ─── */
export function AgencyWorkers(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const [selected,setSelected]=useState(null);
  const [filingClaim,setFilingClaim]=useState(false);
  const [claimDraft,setClaimDraft]=useState({claimNumber:"",incidentDate:"",description:""});
  /* Sort control lifted onto the column headers - click a header to sort ascending, click
     again to flip. Previously the recruiter had to scan the roster manually to find the
     highest-rate available worker or the biggest vac liability. */
  const [sort,setSort]=useState({col:"name",dir:"asc"});
  const clickSort=col=>setSort(s=>({col,dir:s.col===col&&s.dir==="asc"?"desc":"asc"}));
  const list=(()=>{
    const rows=[...A.workers];
    const key=r=>{const p=(A.people||[]).find(x=>x.id===r.personId);
      switch(sort.col){
        case "name": return (p?.name||"").toLowerCase();
        case "loc": return `${r.province} ${r.city}`.toLowerCase();
        case "avail": return r.availability;
        case "vac": return r.vacBalance||0;
        case "bg": return r.backgroundCheck?.status||"zz";
        default: return "";
      }
    };
    rows.sort((a,b)=>{const ka=key(a),kb=key(b);
      if(ka<kb)return sort.dir==="asc"?-1:1;
      if(ka>kb)return sort.dir==="asc"?1:-1;
      return 0;});
    return rows;
  })();
  const pg=usePagination(list,20);
  const H=({label,col})=><th className={`${TH_CLS} cursor-pointer select-none`} onClick={()=>col&&clickSort(col)}>
    {label}{col&&sort.col===col?<span className="ml-1 text-brand">{sort.dir==="asc"?"▲":"▼"}</span>:null}
  </th>;
  return <div>
    <div className="mb-3.5">
      <div className="text-lg font-bold text-text">{list.length} workers on record</div>
      <div className="text-sm text-text-3 mt-0.5">All seekers who opted into agency representation. Includes documents and compliance.</div>
    </div>

    <Card pad={0} style={{borderRadius:14,overflow:"hidden"}}>
      <div className="overflow-x-auto"><table className="w-full border-collapse" style={{minWidth:800}}>
        <thead><tr className="border-b-2 border-line text-left">
          <H label="Worker" col="name"/>
          <H label="Location" col="loc"/>
          <H label="Availability" col="avail"/>
          <H label="Work eligibility"/>
          <H label="Docs complete"/>
          <H label="Background check" col="bg"/>
          <H label="Vac accrued" col="vac"/>
          <H label="Actions"/>
        </tr></thead>
        <tbody>{pg.pageItems.map(w=>{const person=(A.people||[]).find(p=>p.id===w.personId);
          const docsComplete=w.tdOnFile&&w.directDepositOnFile&&w.workEligibility;
          return <tr key={w.id} className="border-b border-line-soft cursor-pointer" onClick={()=>setSelected(w.id)}>
            <td className={TD_CLS}>
              <div className="flex gap-2.5 items-center">
                <SmartPortrait seed={person?.seed||0} size={30} radius={8}/>
                <div><div className="text-sm font-semibold text-text">{person?.name||"—"}</div>
                  <div className="text-xs text-text-3 mt-0.5">SIN ***-***-{w.sinLast3||"—"}</div></div>
              </div>
            </td>
            <td className={`${TD_CLS} text-sm text-text-2`}>{w.city}, {w.province}</td>
            <td className={TD_CLS}><Tag tone={w.availability==="available"?"ok":w.availability==="on-assignment"?"brand":"neutral"} sm>{w.availability}</Tag></td>
            <td className={`${TD_CLS} text-xs text-text-2`}>{w.workEligibility}{w.weExpiry?<div className="text-xs" style={{color:new Date(w.weExpiry)<Date.now()+90*864e5?C.warn:C.text3}}>Exp {w.weExpiry}</div>:null}</td>
            <td className={TD_CLS}><Tag tone={docsComplete?"ok":"warn"} sm icon={docsComplete?"check":"alert"}>{docsComplete?"Complete":"Missing"}</Tag></td>
            <td className={TD_CLS}><Tag tone={{passed:"ok",failed:"danger","in-progress":"brand"}[w.backgroundCheck?.status]||"neutral"} sm>{(w.backgroundCheck?.status||"not-started").replace("-"," ")}</Tag></td>
            <td className={`${TD_CLS} text-sm text-brand font-semibold`}>${w.vacBalance.toFixed(2)}</td>
            <td className={TD_CLS} onClick={e=>e.stopPropagation()}>
              {/* Actions column now offers real actions - the earlier plain status dropdown
                  gave no affordance for "open file" or "message worker" and hid its Active/
                  Inactive choice as if it were a display value. */}
              <div className="flex gap-1.5 items-center">
                <Btn kind="ghost" size="xs" onClick={()=>setSelected(w.id)}>Open file</Btn>
                <Sel value={w.status} onChange={e=>{
                  const next=e.target.value;
                  if(next==="inactive"&&w.availability==="on-assignment"){
                    A.toast("This worker is on an active assignment — end the assignment before marking them inactive.","danger");
                    return;
                  }
                  A.updateWorker(w.id,{status:next,availability:next==="inactive"?"unavailable":(w.availability==="unavailable"?"available":w.availability)});
                }} style={{fontSize:12,padding:"5px 8px"}} title="Change worker status">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Sel>
              </div>
            </td>
          </tr>;})}
        </tbody>
      </table></div>
    </Card>
    <Pagination {...pg}/>

    {selected&&(()=>{const w=A.worker(selected); const person=(A.people||[]).find(p=>p.id===w.personId);
      return <>
      <Modal onClose={()=>setSelected(null)} title="Worker file" wide>
        <div className="flex gap-3.5 items-center mb-4">
          <SmartPortrait seed={person?.seed||0} size={54} radius={13}/>
          <div>
            <div className="text-lg font-bold text-text tracking-tight">{person?.name}</div>
            <div className="text-sm text-text-2 mt-1">{person?.email} · {person?.phone}</div>
          </div>
        </div>
        <div className={`grid gap-3.5 text-sm ${mob?"grid-cols-1":"grid-cols-2"}`}>
          {[["Location",`${w.city}, ${w.province}`],
            ["Onboarded",w.onboarded],
            ["SIN (last 3)",w.sinLast3||"Not on file"],
            ["Work eligibility",w.workEligibility||"Not verified"],
            ["Rate target",`$${w.payRateTarget}/hr floor $${w.payRateFloor}`],
            ["Direct deposit",w.directDepositOnFile?"On file":"Missing"],
            ["TD1 forms",w.tdOnFile?"On file":"Missing"],
            ["Vacation accrued",`$${w.vacBalance.toFixed(2)}`]].map(([l,v])=>
            <div key={l}><div className="text-xs font-bold text-text-3 tracking-wide uppercase mb-1">{l}</div>
              <div className="text-text">{v}</div></div>)}
          <div>
            <div className="text-xs font-bold text-text-3 tracking-wide uppercase mb-1">Default benefits/hr</div>
            <Input type="number" min="0" step="0.05" value={w.defaultBenefitsPerHr||0}
              onChange={e=>A.updateWorker(w.id,{defaultBenefitsPerHr:Number(e.target.value)||0})} style={{maxWidth:120}}/>
          </div>
        </div>
        {w.vacBalance>0&&<Btn kind="outline" size="sm" icon="wallet" style={{marginTop:14}}
          onClick={async()=>{const r=await A.payoutVacation(w.id);if(r.ok)A.toast(`Paid out $${r.amount.toFixed(2)} vacation to ${person?.name||"worker"}`,"ok");}}>
          Pay out vacation balance</Btn>}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-1.5">
            <Lbl style={{margin:0}}>WSIB claims</Lbl>
            <Btn kind="ghost" size="xs" icon="plus" onClick={()=>{setFilingClaim(true);setClaimDraft({claimNumber:"",incidentDate:"",description:""});}}>File claim</Btn>
          </div>
          {A.wsibClaims.filter(c=>c.worker===w.id).length===0
            ?<div className="text-xs text-text-3">No claims on file for this worker.</div>
            :<div className="flex flex-col gap-1.5">
              {A.wsibClaims.filter(c=>c.worker===w.id).map(c=>
                <div key={c.id} className="flex justify-between items-center py-2 px-3 bg-bg rounded-lg">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-text">{c.claimNumber||c.id} {c.incidentDate?`· incident ${c.incidentDate}`:""}</div>
                    {c.description&&<div className="text-xs text-text-3 mt-0.5">{c.description}</div>}
                  </div>
                  <Sel value={c.status} onChange={e=>A.updateWsibClaim(c.id,{status:e.target.value})} style={{width:130,fontSize:12,padding:"4px 8px"}}>
                    {["filed","under-review","approved","denied","closed"].map(s=><option key={s} value={s}>{s}</option>)}</Sel>
                </div>)}
            </div>}
        </div>
        {w.tickets.length>0&&<div className="mt-4">
          <Lbl>Tickets & certifications</Lbl>
          <div className="flex flex-wrap gap-1.5">{w.tickets.map(t=><Tag key={t} tone="brand" sm>{t}</Tag>)}</div>
        </div>}
        {w.documents.length>0&&<div className="mt-4">
          <Lbl>Documents on file</Lbl>
          <div className="flex flex-col gap-1.5">
            {w.documents.map((d,i)=><div key={i} className="py-2.5 px-3 bg-bg rounded-lg flex gap-2.5 items-center">
              <I n="file" s={16} c={C.brand}/>
              <div className="flex-1">
                <div className="text-sm font-semibold text-text">{d.label}</div>
                <div className="text-xs text-text-3 mt-0.5">Uploaded {d.uploaded}{d.expires?` · Expires ${d.expires}`:""}</div>
              </div>
              {d.expires&&new Date(d.expires)<Date.now()+90*864e5&&<Tag tone="warn" sm>Expiring</Tag>}
            </div>)}
          </div>
        </div>}
        {w.notes&&<div className="mt-4">
          <Lbl>Recruiter notes</Lbl>
          <div className="text-sm text-text-2 leading-relaxed p-3 bg-bg rounded-lg italic">{w.notes}</div>
        </div>}
        <div className="mt-4">
          <Lbl>Background check</Lbl>
          <div className={`grid gap-2.5 ${mob?"grid-cols-1":"grid-cols-3"}`}>
            <Field label="Status">
              <Sel value={w.backgroundCheck?.status||"not-started"} onChange={e=>A.updateWorker(w.id,{backgroundCheck:{...w.backgroundCheck,status:e.target.value}})}>
                {["not-started","in-progress","passed","failed"].map(s=><option key={s} value={s}>{s.replace("-"," ")}</option>)}
              </Sel>
            </Field>
            <Field label="Provider"><Input defaultValue={w.backgroundCheck?.provider||""} placeholder="e.g. Certn, Sterling" onBlur={e=>A.updateWorker(w.id,{backgroundCheck:{...w.backgroundCheck,provider:e.target.value}})}/></Field>
            <Field label="Completed"><DatePicker value={w.backgroundCheck?.completedDate||""} onChange={v=>A.updateWorker(w.id,{backgroundCheck:{...w.backgroundCheck,completedDate:v}})}/></Field>
          </div>
          <Field label="Notes" style={{marginTop:8}}><Area rows={2} defaultValue={w.backgroundCheck?.notes||""} onBlur={e=>A.updateWorker(w.id,{backgroundCheck:{...w.backgroundCheck,notes:e.target.value}})}/></Field>
        </div>
        <div className="mt-4">
          <div className="flex justify-between items-center mb-1.5">
            <Lbl style={{margin:0}}>References</Lbl>
            <Btn kind="ghost" size="xs" icon="plus" onClick={()=>A.updateWorker(w.id,{references:[...(w.references||[]),{name:"",relationship:"",phone:"",contactedDate:"",notes:""}]})}>Add reference</Btn>
          </div>
          {(w.references||[]).length===0
            ?<div className="text-xs text-text-3">No references on file for this worker.</div>
            :<div className="flex flex-col gap-2.5">
              {w.references.map((r,i)=>{
                const save=(field,value)=>A.updateWorker(w.id,{references:w.references.map((x,j)=>j===i?{...x,[field]:value}:x)});
                return <div key={i} className="p-3 bg-bg rounded-lg">
                  <div className={`grid gap-2 ${mob?"grid-cols-1":"grid-cols-4"}`}>
                    <Input defaultValue={r.name} placeholder="Name" onBlur={e=>save("name",e.target.value)}/>
                    <Input defaultValue={r.relationship} placeholder="Relationship (e.g. Former supervisor)" onBlur={e=>save("relationship",e.target.value)}/>
                    <Input defaultValue={r.phone} placeholder="Phone" onBlur={e=>save("phone",e.target.value)}/>
                    <DatePicker value={r.contactedDate||""} onChange={v=>save("contactedDate",v)}/>
                  </div>
                  <div className="flex gap-2 mt-2 items-start">
                    <Area rows={1} defaultValue={r.notes} placeholder="What did they say?" onBlur={e=>save("notes",e.target.value)} style={{flex:1}}/>
                    <Btn kind="ghost" size="xs" icon="trash" onClick={()=>A.updateWorker(w.id,{references:w.references.filter((_,j)=>j!==i)})}/>
                  </div>
                </div>;})}
            </div>}
        </div>
      </Modal>
      {filingClaim&&<Modal onClose={()=>setFilingClaim(false)} title={`File WSIB claim — ${person?.name||""}`}>
        <div className="flex flex-col gap-3.5">
          <Field label="Claim number (optional)" hint="If already assigned by WSIB, otherwise leave blank and add later.">
            <Input value={claimDraft.claimNumber} onChange={e=>setClaimDraft({...claimDraft,claimNumber:e.target.value})} placeholder="e.g. 1234567"/></Field>
          <Field label="Incident date"><Input type="date" value={claimDraft.incidentDate} onChange={e=>setClaimDraft({...claimDraft,incidentDate:e.target.value})}/></Field>
          <Field label="Description"><Area rows={3} value={claimDraft.description} onChange={e=>setClaimDraft({...claimDraft,description:e.target.value})} placeholder="What happened, where, and any immediate first aid given"/></Field>
          <div className="flex gap-2.5 justify-end">
            <Btn kind="ghost" onClick={()=>setFilingClaim(false)}>Cancel</Btn>
            <Btn kind="primary" icon="check" disabled={!claimDraft.incidentDate} onClick={async()=>{
              await A.fileWsibClaim({worker:w.id,...claimDraft});
              A.toast("WSIB claim filed","ok"); setFilingClaim(false);
            }}>File claim</Btn>
          </div>
        </div>
      </Modal>}
      </>;
    })()}
  </div>;
}

/* ─── Margins ─── */
export function AgencyMargins(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const active=A.activeAssignments();
  /* Was a flat 40hr/week assumption for every assignment - use the average of that assignment's
     actual recent timesheets when any exist (a real signal of scheduled + OT hours), falling
     back to 40 only for a brand-new assignment with no timesheet history yet. */
  const weeklyHoursFor=a=>{
    const ts=A.timesheets.filter(t=>t.assignment===a.id).sort((x,y)=>y.weekStart.localeCompare(x.weekStart)).slice(0,4);
    if(!ts.length)return 40;
    return ts.reduce((s,t)=>s+A.timesheetTotal(t),0)/ts.length;
  };
  const margins=active.map(a=>({a,econ:A.assignmentMargin(a.id),client:A.staffingClient(a.client),worker:A.worker(a.worker),wk:weeklyHoursFor(a)}));
  const totalWeeklyBill=margins.reduce((s,m)=>s+(m.a.billRate*m.wk),0);
  const totalWeeklyPay=margins.reduce((s,m)=>s+(m.a.payRate*m.wk),0);
  const totalWeeklyMargin=margins.reduce((s,m)=>s+((m.econ?.margin||0)*m.wk),0);
  const avgMarkup=margins.length?margins.reduce((s,m)=>s+(m.econ?.markupPct||0),0)/margins.length:0;
  const belowFloor=margins.filter(m=>(m.econ?.markupPct||0)<A.STAFFING_AGENCY.markupFloor);
  const sortedMargins=[...margins].sort((a,b)=>(a.econ?.markupPct||0)-(b.econ?.markupPct||0));
  const pg=usePagination(sortedMargins,25);

  return <div>
    <div className="mb-3.5">
      <div className="text-lg font-bold text-text">{t("staffing.margins.subtitle")}</div>
      <div className="text-sm text-text-3 mt-0.5">{t("staffing.margins.desc")}</div>
    </div>

    <div className={`grid gap-3 mb-4 ${mob?"grid-cols-2":"grid-cols-4"}`}>
      {[[t("staffing.margins.weeklyBill"),`$${(totalWeeklyBill/1000).toFixed(1)}k`,C.brand],
        [t("staffing.margins.weeklyWage"),`$${(totalWeeklyPay/1000).toFixed(1)}k`,C.text2],
        [t("staffing.margins.weeklyMargin"),`$${(totalWeeklyMargin/1000).toFixed(2)}k`,C.ok],
        [t("staffing.margins.avgMarkup"),`${avgMarkup.toFixed(1)}%`,avgMarkup>=A.STAFFING_AGENCY.markupTarget?C.ok:C.warn]].map(([l,v,tone])=>
        <Card key={l} pad={mob?16:20} style={{borderRadius:14}}>
          <div className={`font-bold tracking-tight ${mob?"text-xl":"text-2xl"}`} style={{color:tone}}>{v}</div>
          <div className="text-xs text-text-3 mt-1.5">{l}</div>
        </Card>)}
    </div>

    {belowFloor.length>0&&<Banner tone="warn" icon="alert" title={t("staffing.margins.belowFloor",{n:belowFloor.length})} style={{marginBottom:16}}>
      {t("staffing.margins.belowFloorBody")}
    </Banner>}

    <Card pad={0} style={{borderRadius:14,overflow:"hidden"}}>
      <div className="overflow-x-auto"><table className="w-full border-collapse" style={{minWidth:800}}>
        <thead><tr className="border-b-2 border-line text-left">
          {[t("staffing.margins.worker"),t("staffing.margins.client"),t("staffing.margins.pay"),t("staffing.margins.burden"),t("staffing.margins.trueCost"),t("staffing.margins.bill"),t("staffing.margins.marginHr"),t("staffing.margins.markupPct")].map(h=>
            <th key={h} className={TH_CLS}>{h}</th>)}
        </tr></thead>
        <tbody>{pg.pageItems.map(m=>{
          const person=m.worker?(A.people||[]).find(p=>p.id===m.worker.personId):null;
          const emp=m.client?A.employers.find(e=>e.id===m.client.employerId):null;
          const below=(m.econ?.markupPct||0)<A.STAFFING_AGENCY.markupFloor;
          return <tr key={m.a.id} className="border-b border-line-soft" style={{background:below?C.dangerBg:"transparent"}}>
            <td className={`${TD_CLS} text-sm text-text font-semibold`}>{person?.name||"—"}</td>
            <td className={`${TD_CLS} text-xs text-text-2`}>{emp?.name||"—"}</td>
            <td className={`${TD_CLS} text-sm text-text`}>${m.a.payRate}</td>
            <td className={`${TD_CLS} text-xs text-text-3`}>${m.econ?.burden||0}</td>
            <td className={`${TD_CLS} text-sm text-text`}>${m.econ?.trueCost||0}</td>
            <td className={`${TD_CLS} text-sm text-text`}>${m.a.billRate}</td>
            <td className={`${TD_CLS} text-sm font-bold`} style={{color:m.econ?.margin>0?C.ok:C.danger}}>${m.econ?.margin||0}</td>
            <td className={`${TD_CLS} text-sm font-bold`} style={{color:below?C.danger:m.econ?.markupPct>=A.STAFFING_AGENCY.markupTarget?C.ok:C.warn}}>{m.econ?.markupPct||0}%</td>
          </tr>;})}
        </tbody>
      </table></div>
    </Card>
    <Pagination {...pg}/>
  </div>;
}

/* ─── Compliance dashboard ─── */
/* ─── Branches: multi-office / per-desk model - previously the whole book was one shared,
   undifferentiated desk with no way to say "this client/this recruiter belongs to Calgary." ─── */
export function AgencyBranches(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const [showAdd,setShowAdd]=useState(false);
  const [nb,setNb]=useState({name:"",city:"",province:"ON"});
  const submit=async()=>{if(!nb.name.trim())return;
    await A.createBranch(nb); setShowAdd(false); setNb({name:"",city:"",province:"ON"});};
  return <div>
    <div className="flex justify-between items-center mb-4 flex-wrap gap-2.5">
      <div>
        <div className="text-lg font-bold text-text">{t("staffing.branches.countBranches",{n:A.staffingBranches.length})}</div>
        <div className="text-sm text-text-3 mt-0.5">{t("staffing.branches.desc")}</div>
      </div>
      <Btn kind="primary" size="sm" icon="plus" onClick={()=>setShowAdd(true)}>{t("staffing.branches.addBranch")}</Btn>
    </div>
    <div className="grid gap-3 mb-6" style={{gridTemplateColumns:mob?"1fr":"repeat(auto-fill,minmax(280px,1fr))"}}>
      {A.staffingBranches.map(b=>{
        const clientCount=A.staffingClients.filter(c=>c.branchId===b.id).length;
        const staffCount=A.agencyStaffRoster.filter(s=>s.branchId===b.id).length;
        return <Card key={b.id} pad={18} style={{borderRadius:14}}>
          <div className="flex justify-between items-start gap-2">
            <div>
              <div className="text-base font-bold text-text">{b.name}</div>
              <div className="text-xs text-text-3 mt-0.5">{b.city}{b.city&&b.province?", ":""}{b.province}</div>
            </div>
            <Btn kind="ghost" size="xs" icon="trash" onClick={()=>A.deleteBranch(b.id)}/>
          </div>
          <div className="flex gap-4 mt-3.5 pt-3 border-t border-line-soft">
            <div><div className="text-lg font-bold text-brand">{clientCount}</div><div className="text-xs text-text-3">{t("staffing.branches.clients")}</div></div>
            <div><div className="text-lg font-bold text-brand">{staffCount}</div><div className="text-xs text-text-3">{t("staffing.branches.staff")}</div></div>
          </div>
        </Card>;})}
      {A.staffingBranches.length===0&&<Empty icon="building" title={t("staffing.branches.noBranches")} body={t("staffing.branches.noBranchesBody")}/>}
    </div>

    <div className="text-base font-semibold text-text mb-2.5">{t("staffing.branches.staffAssignment")}</div>
    <Card pad={0} style={{borderRadius:14,overflow:"hidden"}}>
      <div className="overflow-x-auto"><table className="w-full border-collapse" style={{minWidth:480}}>
        <thead><tr className="border-b-2 border-line text-left">
          {[t("staffing.branches.name"),t("staffing.branches.role"),t("staffing.branches.branch")].map(h=><th key={h} className={TH_CLS}>{h}</th>)}
        </tr></thead>
        <tbody>{A.agencyStaffRoster.map(s=><tr key={s.id} className="border-b border-line-soft">
          <td className={`${TD_CLS} text-sm font-semibold text-text`}>{s.name}</td>
          <td className={`${TD_CLS} text-sm text-text-2`}>{s.title||s.role}</td>
          <td className={TD_CLS}>
            <Sel value={s.branchId||""} onChange={e=>A.assignStaffBranch(s.id,e.target.value||null)} style={{fontSize:13,padding:"5px 8px"}}>
              <option value="">{t("staffing.branches.unassigned")}</option>
              {A.staffingBranches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
            </Sel>
          </td>
        </tr>)}</tbody>
      </table></div>
    </Card>

    {showAdd&&<Modal onClose={()=>setShowAdd(false)} title={t("staffing.branches.addBranch")}>
      <div className="flex flex-col gap-3.5">
        <Field label={t("staffing.branches.branchName")} required><Input value={nb.name} onChange={e=>setNb({...nb,name:e.target.value})} placeholder={t("staffing.branches.branchPlaceholder")}/></Field>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label={t("staffing.branches.city")}><Input value={nb.city} onChange={e=>setNb({...nb,city:e.target.value})}/></Field>
          <Field label={t("staffing.branches.province")}><Sel value={nb.province} onChange={e=>setNb({...nb,province:e.target.value})}>
            {A.STAFFING_AGENCY.provinces.map(p=><option key={p} value={p}>{p}</option>)}</Sel></Field>
        </div>
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>setShowAdd(false)}>{t("staffing.branches.cancel")}</Btn>
          <Btn kind="primary" disabled={!nb.name.trim()} onClick={submit}>{t("staffing.branches.addBranch")}</Btn>
        </div>
      </div>
    </Modal>}
  </div>;
}

export function AgencyCompliance(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const [drill,setDrill]=useState(null);
  const workersMissingDocs=A.workers.filter(w=>w.status==="active"&&(!w.tdOnFile||!w.directDepositOnFile||!w.workEligibility));
  const workersExpiringWE=A.workers.filter(w=>w.weExpiry&&new Date(w.weExpiry)<Date.now()+90*864e5);
  /* The per-worker file view already flags an individual document as "Expiring" (within 90
     days), but there was no way to see that across the whole roster without opening every
     worker's file one at a time - this rolls that same check up company-wide. */
  const expiringDocs=A.workers.flatMap(w=>(w.documents||[]).filter(d=>d.expires&&new Date(d.expires)<Date.now()+90*864e5).map(d=>({w,d})));
  const clientsMissingMsa=A.staffingClients.filter(c=>c.status==="active"&&!c.signedMsa);
  const overdueInvoices=A.staffingInvoices.filter(i=>i.status==="overdue");
  /* A staffing agency's #1 negligent-hire exposure is placing a worker whose background check
     was never completed. The Workers roster shows per-worker status but nothing rolled it up
     company-wide - a compliance officer had to open every file. This card catches active-and-
     on-assignment workers whose check is still "not started" or hasn't completed, since those
     are the ones the agency has actual liability for right now (a bench worker never sent
     anywhere is a lower-priority follow-up). */
  const activeOnAssignment=A.workers.filter(w=>w.status==="active"&&w.availability==="on-assignment");
  const bgcMissing=activeOnAssignment.filter(w=>!w.backgroundCheck||["not-started","in-progress","failed"].includes(w.backgroundCheck?.status));

  const items=[
    {ok:workersMissingDocs.length===0, title:"Worker files complete", body:workersMissingDocs.length===0?"All active workers have TD1s, direct deposit, and work eligibility on file.":`${workersMissingDocs.length} workers missing documents.`, count:workersMissingDocs.length,
      drillRows:workersMissingDocs.map(w=>{const p=(A.people||[]).find(pp=>pp.id===w.personId);
        const missing=[!w.tdOnFile&&"TD1",!w.directDepositOnFile&&"Direct deposit",!w.workEligibility&&"Work eligibility"].filter(Boolean);
        return {name:p?.name||w.id,detail:`Missing: ${missing.join(", ")}`};})},
    {ok:workersExpiringWE.length===0, title:"Work permits current", body:workersExpiringWE.length===0?"No permits expiring in the next 90 days.":`${workersExpiringWE.length} permits expiring within 90 days.`, count:workersExpiringWE.length,
      drillRows:workersExpiringWE.map(w=>{const p=(A.people||[]).find(pp=>pp.id===w.personId);
        return {name:p?.name||w.id,detail:`${w.workEligibility} expires ${w.weExpiry}`};})},
    {ok:expiringDocs.length===0, title:"Worker documents current", body:expiringDocs.length===0?"No worker documents expired or expiring in the next 90 days.":`${expiringDocs.length} document(s) expired or expiring within 90 days.`, count:expiringDocs.length,
      drillRows:expiringDocs.map(({w,d})=>{const p=(A.people||[]).find(pp=>pp.id===w.personId);
        const expired=new Date(d.expires)<Date.now();
        return {name:p?.name||w.id,detail:`${d.label} ${expired?"expired":"expires"} ${d.expires}`};})},
    {ok:clientsMissingMsa.length===0, title:"MSAs signed for all active clients", body:clientsMissingMsa.length===0?"Every active client has a signed Master Services Agreement.":`${clientsMissingMsa.length} clients billing without signed MSA.`, count:clientsMissingMsa.length,
      drillRows:clientsMissingMsa.map(c=>{const emp=A.employers.find(e=>e.id===c.employerId);
        return {name:emp?.name||c.id,detail:`${A.jobOrders.filter(j=>j.client===c.id&&j.status==="open").length} open order(s)`};})},
    {ok:bgcMissing.length===0, title:"Background checks (workers on assignment)", body:bgcMissing.length===0?"Every worker currently on assignment has a completed background check.":`${bgcMissing.length} worker${bgcMissing.length===1?"":"s"} on assignment without a completed check.`, count:bgcMissing.length,
      drillRows:bgcMissing.map(w=>{const p=(A.people||[]).find(pp=>pp.id===w.personId);
        return {name:p?.name||w.id,detail:`Status: ${(w.backgroundCheck?.status||"not started").replace("-"," ")}`};})},
    {ok:overdueInvoices.length===0, title:"Aging under control", body:overdueInvoices.length===0?"No overdue invoices past terms.":`${overdueInvoices.length} invoices overdue. Chase or refer to collections.`, count:overdueInvoices.length,
      drillRows:overdueInvoices.map(i=>{const c=A.staffingClients.find(x=>x.id===i.client); const emp=c?A.employers.find(e=>e.id===c.employerId):null;
        return {name:emp?.name||i.client,detail:`$${i.total?.toLocaleString?.()||i.total} · due ${i.dueDate}`};})},
    /* Was static hardcoded text (a fake expiry date, a fake LOC amount) that would silently go
       stale forever - now derived from STAFFING_AGENCY fields and a real expiry check. */
    (()=>{const expiresIn=Math.ceil((new Date(A.STAFFING_AGENCY.licenseExpiry)-Date.now())/864e5); const expiringSoon=expiresIn<=90;
      return {ok:!expiringSoon, title:"Ontario THA license active",
        body:`License ${SEED_AGENCY_LICENSE} ${expiringSoon?`expires in ${expiresIn} days`:`valid through ${A.STAFFING_AGENCY.licenseExpiry}`}. $${A.STAFFING_AGENCY.licenseLocAmount.toLocaleString()} LOC on file.`, count:0};})(),
    {ok:true, title:"WSIB coverage", body:`Registered in ${A.STAFFING_AGENCY.wsibProvinces.join(", ")}. Rate group ${A.STAFFING_AGENCY.wsibRateGroup}.`, count:0},
  ];

  return <div className="print-target">
    <div className="mb-3.5 flex justify-between items-start gap-3 flex-wrap">
      <div>
        <div className="text-lg font-bold text-text">Compliance dashboard</div>
        <div className="text-sm text-text-3 mt-0.5">Licensing, documentation, and audit-readiness across the desk.</div>
      </div>
      <Btn kind="outline" size="sm" icon="file" className="print-hide" onClick={()=>window.print()}>Print / Save as PDF</Btn>
    </div>

    <div className={`grid gap-3 ${mob?"grid-cols-1":"grid-cols-2"}`}>
      {items.map(item=><Card key={item.title} pad={mob?18:22} style={{borderRadius:14,borderLeft:`4px solid ${item.ok?C.ok:C.warn}`,cursor:item.count>0?"pointer":"default"}}
        role={item.count>0?"button":undefined} tabIndex={item.count>0?0:undefined}
        aria-label={`${item.title}: ${item.ok?"OK":"Needs attention"}`}
        onClick={()=>item.count>0&&setDrill(item)}
        onKeyDown={e=>{if(item.count>0&&(e.key==="Enter"||e.key===" ")){e.preventDefault();setDrill(item);}}}>
        <div className="flex gap-3 items-start">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{background:item.ok?C.okBg:C.warnBg,color:item.ok?C.ok:C.warn}}><I n={item.ok?"check":"alert"} s={18}/></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-sm font-semibold text-text">{item.title}</div>
              <Tag tone={item.ok?"ok":"warn"} sm>{item.ok?"OK":"Needs attention"}</Tag>
            </div>
            <div className="text-xs text-text-2 mt-1 leading-snug">{item.body}</div>
          </div>
          {item.count>0&&<Tag tone={item.ok?"ok":"warn"} sm>{item.count}</Tag>}
        </div>
      </Card>)}
    </div>

    {drill&&<Modal onClose={()=>setDrill(null)} title={drill.title}>
      <div className="flex flex-col gap-2">
        {drill.drillRows.map((r,i)=><div key={i} className="py-2.5 px-3 bg-bg rounded-lg border border-line flex justify-between items-center gap-3">
          <span className="text-sm font-semibold text-text">{r.name}</span>
          <span className="text-xs text-text-3">{r.detail}</span></div>)}
      </div>
    </Modal>}

    <Card pad={mob?18:22} style={{marginTop:16,borderRadius:14,background:C.bg}}>
      <Lbl>Statutory reminders</Lbl>
      <div className="flex flex-col gap-2.5 text-sm text-text-2">
        <div className="py-2.5 px-3 bg-white rounded-lg border border-line">
          <strong>ROEs</strong> must issue within 5 days of any assignment ending with a 7+ day break.
        </div>
        <div className="py-2.5 px-3 bg-white rounded-lg border border-line">
          <strong>T4s</strong> must issue by end of February each year for all workers paid in the prior year.
        </div>
        <div className="py-2.5 px-3 bg-white rounded-lg border border-line">
          <strong>Vacation pay</strong> accrues at 4% of gross (federally) — configured to accrue rather than pay-out per pay period.
        </div>
        <div className="py-2.5 px-3 bg-white rounded-lg border border-line">
          <strong>Pay equity certification</strong> required for Ontario assignments over 3 months. Client to certify equivalent-role rates.
        </div>
      </div>
    </Card>

    <Card pad={mob?18:22} style={{marginTop:16,borderRadius:14}}>
      <Lbl>Audit log — payroll, invoicing &amp; MSA changes</Lbl>
      {A.staffingAuditLog.length===0?<Empty icon="shield" title="No audited changes yet" body="Payroll finalization, invoice generation, and MSA signing are recorded here as they happen."/>
      :<div className="overflow-x-auto"><table className="w-full border-collapse" style={{minWidth:480}}>
        <thead><tr className="border-b-2 border-line text-left">{["When","Staff","Detail"].map(h=><th key={h} className={TH_CLS}>{h}</th>)}</tr></thead>
        <tbody>{A.staffingAuditLog.slice(0,50).map(e=><tr key={e.id} className="border-b border-line-soft">
          <td className="py-2.5 px-2.5 text-xs text-text-3 whitespace-nowrap">{new Date(e.at).toLocaleString("en-CA")}</td>
          <td className="py-2.5 px-2.5 text-xs text-text font-semibold whitespace-nowrap">{e.actorName}</td>
          <td className="py-2.5 px-2.5 text-sm text-text-2">{e.detail}</td>
        </tr>)}</tbody>
      </table></div>}
    </Card>
  </div>;
}
