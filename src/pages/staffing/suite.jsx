import { useState, useEffect } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import {
  Btn, Card, Tag, Field, Input, Sel, Area, Banner, Lbl, Modal, DatePicker, SmartPortrait,
  SmartLogo, Empty,
} from "../../design/primitives.jsx";
import { _fmtDate, _weekStart } from "../../helpers/utils.js";
import { InlineList } from "../shared/formControls.jsx";
import { SEED_AGENCY_LICENSE } from "../../store/seed/agency.js";

export function AgencyLoginPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [id,setId]=useState(""); const [pw,setPw]=useState("");
  const [remember,setRemember]=useState(true);
  const [err,setErr]=useState(""); const [busy,setBusy]=useState(false);

  const attempt=()=>{
    setErr(""); setBusy(true);
    const r=A.agencyLogin(id.trim(),pw,remember);
    setBusy(false);
    if(!r.ok){setErr(r.msg||"Sign-in failed"); return;}
    A.go("agencyDashboard");
  };

  return <div style={{background:C.ink,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:mob?16:32}}>
    <div style={{width:"100%",maxWidth:440}}>
      <div style={{marginBottom:24,textAlign:"center"}}>
        <button onClick={()=>A.go("home")} style={{background:"transparent",border:"none",cursor:"pointer",display:"inline-flex",alignItems:"center",gap:10,color:"rgba(255,255,255,.75)",fontFamily:"inherit",padding:0,marginBottom:16}}>
          <div style={{width:36,height:36,borderRadius:10,background:"rgba(245,165,36,.18)",border:"1px solid rgba(245,165,36,.4)",display:"flex",alignItems:"center",justifyContent:"center"}}><I n="hex" s={18} c="#F5A524"/></div>
          <div style={{textAlign:"left"}}>
            <div style={{fontSize:15,fontWeight:720,color:"#fff",letterSpacing:"-.02em"}}>NorthHire</div>
            <div style={{fontSize:11,color:"#F5A524",fontWeight:600,marginTop:1,letterSpacing:".02em"}}>STAFFING · Agency Console</div>
          </div>
        </button>
      </div>

      <Card pad={mob?24:32} style={{borderRadius:20,background:"#fff"}}>
        <div style={{marginBottom:20}}>
          <h1 style={{fontSize:22,fontWeight:730,color:C.text,margin:"0 0 6px",letterSpacing:"-.025em"}}>Sign in to the agency console</h1>
          <p style={{fontSize:13.5,color:C.text3,margin:0,lineHeight:1.55}}>
            For NorthHire Staffing recruiters, payroll and management.
            Not for job seekers or clients.</p>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Field label="Login ID" required>
            <Input icon="user" value={id} onChange={e=>setId(e.target.value)} placeholder="firstname.lastname"/></Field>
          <Field label="Password" required>
            <Input icon="lock" type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="At least 8 characters"/></Field>
          <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13.5,color:C.text2,cursor:"pointer"}}>
            <input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/> Remember me for 14 days</label>
          {err&&<Banner tone="danger" icon="alert">{err}</Banner>}
          <Btn kind="primary" size="lg" onClick={attempt} disabled={busy||!id||!pw} full>
            {busy?"Signing in…":"Sign in"}</Btn>
        </div>

        <div style={{marginTop:22,padding:14,background:C.bg,borderRadius:11,fontSize:12.5,color:C.text3}}>
          <div style={{fontWeight:640,color:C.text2,marginBottom:8}}>Demo agency accounts (password: <code style={{fontFamily:"ui-monospace,monospace",color:C.brand}}>staff2026</code>)</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {[["nadia.singh","Owner — Managing Director"],
              ["joel.tremblay","Senior Recruiter"],
              ["aisha.mohamed","Payroll & Compliance"]].map(([lid,role])=>
              <button key={lid} onClick={()=>{setId(lid); setPw("staff2026");}} style={{background:"#fff",border:`1px solid ${C.line}`,borderRadius:8,padding:"7px 10px",cursor:"pointer",fontFamily:"inherit",fontSize:12,textAlign:"left",color:C.text2,display:"flex",justifyContent:"space-between",gap:8}}>
                <code style={{color:C.brand,fontFamily:"ui-monospace,monospace"}}>{lid}</code>
                <span>{role}</span>
              </button>)}
          </div>
        </div>
      </Card>

      <div style={{textAlign:"center",marginTop:16,fontSize:12,color:"rgba(255,255,255,.5)"}}>
        License: {SEED_AGENCY_LICENSE}
      </div>
    </div>
  </div>;
}

/* ─── Dashboard: role-shaped KPIs ─── */
export function AgencyDashboard(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const staff=A.agencyCurrentStaff();
  const kpi=A.agencyKPIs();
  const submittedTs=A.timesheets.filter(t=>t.status==="submitted");
  const openOrders=A.openJobOrders().sort((a,b)=>{
    const uw={high:0,medium:1,low:2};return (uw[a.urgency]||9)-(uw[b.urgency]||9);}).slice(0,4);

  return <div>
    <div style={{marginBottom:24}}>
      <div style={{fontSize:mob?22:28,fontWeight:730,color:C.text,letterSpacing:"-.03em"}}>
        {(()=>{const h=new Date().getHours();return h<12?"Good morning":h<17?"Good afternoon":"Good evening";})()}, {staff.name.split(" ")[0]}
      </div>
      <div style={{fontSize:13.5,color:C.text3,marginTop:6}}>
        {new Date().toLocaleDateString("en-CA",{weekday:"long",month:"long",day:"numeric"})} · Here's the state of the desk.
      </div>
    </div>

    {/* KPI Row */}
    <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"repeat(4,1fr)",gap:12,marginBottom:20}}>
      {[
        {l:"Active assignments",v:kpi.activeCount,t:C.brand,ic:"activity",clk:"agencyAssignments"},
        {l:"Open positions",v:kpi.openPositions,t:C.warn,ic:"briefcase",clk:"agencyJobOrders",sub:`${kpi.openOrdersCount} orders`},
        {l:"Available workers",v:kpi.availableWorkers,t:C.ok,ic:"users",clk:"agencyBench"},
        {l:"Weekly run rate",v:`$${(kpi.runRateWeekly/1000).toFixed(1)}k`,t:C.violet,ic:"trend",clk:"agencyMargins",sub:"Billings @ 40hr"},
      ].map(k=><div key={k.l} data-card onClick={()=>A.go(k.clk)} style={{background:"#fff",borderRadius:14,padding:mob?16:20,border:`1px solid ${C.line}`,cursor:"pointer"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
          <div style={{width:36,height:36,borderRadius:9,background:C.bg,color:k.t,display:"flex",alignItems:"center",justifyContent:"center"}}><I n={k.ic} s={17}/></div>
        </div>
        <div style={{fontSize:mob?24:28,fontWeight:730,color:k.t,letterSpacing:"-.025em"}}>{k.v}</div>
        <div style={{fontSize:12,color:C.text3,marginTop:4}}>{k.l}</div>
        {k.sub&&<div style={{fontSize:11,color:C.text3,marginTop:2}}>{k.sub}</div>}
      </div>)}
    </div>

    {/* Action queue + money row */}
    <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1.4fr 1fr",gap:16,marginBottom:16}}>
      <div>
        <Card pad={mob?18:24} style={{borderRadius:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <Lbl style={{margin:0}}>Urgent job orders</Lbl>
            <Btn kind="ghost" size="sm" onClick={()=>A.go("agencyJobOrders")}>See all</Btn>
          </div>
          {openOrders.length===0
            ? <Empty icon="briefcase" title="No open orders" body="You're all filled. Time to prospect for new clients."
                action={<Btn kind="primary" size="sm" icon="plus" onClick={()=>A.go("agencyJobOrders")}>Add job order</Btn>}/>
            : <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {openOrders.map(jo=>{const client=A.staffingClient(jo.client); const remaining=jo.positions-jo.filled;
                  return <div key={jo.id} data-card onClick={()=>A.go("agencyJobOrders")}
                    style={{padding:"12px 14px",background:C.bg,borderRadius:11,border:`1px solid ${C.line}`,cursor:"pointer",display:"flex",gap:12,alignItems:"center"}}>
                    <Tag tone={jo.urgency==="high"?"danger":jo.urgency==="medium"?"warn":"neutral"} sm>{jo.urgency}</Tag>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:640,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{jo.title}</div>
                      <div style={{fontSize:12,color:C.text3,marginTop:3}}>{client?.name||"—"} · {jo.location.split(" — ")[0]}</div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:14,fontWeight:700,color:C.brand}}>{jo.filled}/{jo.positions}</div>
                      <div style={{fontSize:11,color:C.text3,marginTop:2}}>{remaining} to fill</div>
                    </div>
                  </div>;})}
              </div>}
        </Card>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <Card pad={mob?18:20} style={{borderRadius:16}}>
          <Lbl>Money on the desk</Lbl>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 12px",background:C.bg,borderRadius:9}}>
              <span style={{fontSize:13,color:C.text2}}>AR outstanding</span>
              <span style={{fontSize:15,fontWeight:700,color:C.brand}}>${kpi.arTotal.toLocaleString()}</span>
            </div>
            {kpi.overdueTotal>0&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 12px",background:C.dangerBg,borderRadius:9,border:`1px solid ${C.dangerLn}`}}>
              <span style={{fontSize:13,color:C.text2}}>Overdue (chase)</span>
              <span style={{fontSize:15,fontWeight:700,color:C.danger}}>${kpi.overdueTotal.toLocaleString()}</span>
            </div>}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 12px",background:C.bg,borderRadius:9}}>
              <span style={{fontSize:13,color:C.text2}}>Placements in flight</span>
              <span style={{fontSize:15,fontWeight:700,color:C.violet}}>{kpi.inProgressPlacements}</span>
            </div>
            {kpi.guaranteeExpiring>0&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 12px",background:C.warnBg,borderRadius:9,border:`1px solid ${C.warnLn}`}}>
              <span style={{fontSize:13,color:C.text2}}>Guarantees ending soon</span>
              <span style={{fontSize:15,fontWeight:700,color:C.warn}}>{kpi.guaranteeExpiring}</span>
            </div>}
          </div>
        </Card>

        {submittedTs.length>0&&<Card pad={mob?18:20} style={{borderRadius:16,background:C.warnBg,border:`1px solid ${C.warnLn}`}}>
          <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:12}}>
            <div style={{width:36,height:36,borderRadius:10,background:"#fff",color:C.warn,display:"flex",alignItems:"center",justifyContent:"center"}}><I n="clock" s={18}/></div>
            <div>
              <div style={{fontSize:14,fontWeight:660,color:C.text}}>Timesheets waiting</div>
              <div style={{fontSize:12,color:C.text2,marginTop:2}}>{submittedTs.length} submitted, awaiting client approval</div>
            </div>
          </div>
          <Btn kind="warn" size="sm" full onClick={()=>A.go("agencyTimesheets")}>Chase supervisors</Btn>
        </Card>}
      </div>
    </div>

    {/* Quick actions */}
    <Card pad={mob?18:24} style={{borderRadius:16}}>
      <Lbl>Quick actions</Lbl>
      <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"repeat(4,1fr)",gap:10}}>
        {[["Add job order","plus","agencyJobOrders",C.brand],
          ["Place a worker","user","agencyBench",C.ok],
          ["Run payroll","wallet","agencyPayroll",C.violet],
          ["Generate invoices","file","agencyInvoicing",C.warn]].map(([l,ic,go,tone])=>
          <button key={l} onClick={()=>A.go(go)} style={{padding:14,borderRadius:11,cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:600,color:C.text,textAlign:"left",background:C.bg,border:`1px solid ${C.line}`,display:"flex",gap:10,alignItems:"center"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=tone;e.currentTarget.style.background=C.tint;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.line;e.currentTarget.style.background=C.bg;}}>
            <div style={{width:32,height:32,borderRadius:8,background:"#fff",color:tone,display:"flex",alignItems:"center",justifyContent:"center"}}><I n={ic} s={16}/></div>
            {l}
          </button>)}
      </div>
    </Card>
  </div>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   AGENCY CONSOLE — Modules
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─── Job Orders: client requests for workers ─── */
export function AgencyJobOrders(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [tab,setTab]=useState("open");
  const [q,setQ]=useState("");
  const [showAdd,setShowAdd]=useState(false);
  const [selected,setSelected]=useState(null);
  const list=A.jobOrders.filter(j=>{
    if(tab!=="all"&&j.status!==tab)return false;
    if(q){const s=q.toLowerCase();
      if(!(j.title.toLowerCase().includes(s)||j.location.toLowerCase().includes(s)))return false;}
    return true;
  }).sort((a,b)=>b.createdAt-a.createdAt);

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
      <div>
        <div style={{fontSize:18,fontWeight:720,color:C.text,letterSpacing:"-.02em"}}>{list.length} job orders</div>
        <div style={{fontSize:13,color:C.text3,marginTop:3}}>Client requests for workers.</div>
      </div>
      <Btn kind="primary" size="sm" icon="plus" onClick={()=>setShowAdd(true)}>New job order</Btn>
    </div>

    <Card pad={mob?14:18} style={{marginBottom:14,borderRadius:12}}>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{display:"flex",background:C.bg,borderRadius:8,padding:2,border:`1px solid ${C.line}`}}>
          {[["open","Open"],["filled","Filled"],["closed","Closed"],["all","All"]].map(([v,l])=>
            <button key={v} onClick={()=>setTab(v)} style={{background:tab===v?"#fff":"transparent",border:"none",padding:"7px 13px",borderRadius:6,cursor:"pointer",fontFamily:"inherit",fontSize:12.5,fontWeight:640,color:tab===v?C.brand:C.text3}}>{l}</button>)}
        </div>
        <div style={{flex:"1 1 220px",minWidth:0}}>
          <Input icon="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search title or location"/></div>
      </div>
    </Card>

    <div style={{display:"grid",gridTemplateColumns:`repeat(auto-fill,minmax(${mob?280:340}px,1fr))`,gap:12}}>
      {list.map(jo=>{const client=A.staffingClient(jo.client);
        const remaining=jo.positions-jo.filled;
        const daysOld=Math.floor((Date.now()-jo.createdAt)/864e5);
        return <div key={jo.id} data-card onClick={()=>setSelected(jo.id)}
          style={{background:"#fff",borderRadius:14,padding:mob?16:18,border:`1px solid ${jo.urgency==="high"?C.dangerLn:C.line}`,cursor:"pointer"}}>
          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8,flexWrap:"wrap"}}>
            <Tag tone={jo.urgency==="high"?"danger":jo.urgency==="medium"?"warn":"neutral"} sm>{jo.urgency}</Tag>
            <Tag tone={jo.status==="open"?"brand":jo.status==="filled"?"ok":"neutral"} sm>{jo.status}</Tag>
            <span style={{fontSize:11,color:C.text3,marginLeft:"auto"}}>{daysOld}d old</span>
          </div>
          <div style={{fontSize:15,fontWeight:660,color:C.text,letterSpacing:"-.015em",lineHeight:1.35,marginBottom:6}}>{jo.title}</div>
          <div style={{fontSize:12.5,color:C.text2,marginBottom:12}}>{client?.name} · {jo.location.split(" — ")[0]}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
            <div style={{padding:"9px 11px",background:C.bg,borderRadius:9}}>
              <div style={{fontSize:10.5,color:C.text3,fontWeight:600,letterSpacing:".04em",textTransform:"uppercase"}}>Pay/Bill</div>
              <div style={{fontSize:13,fontWeight:660,color:C.text,marginTop:3}}>${jo.payRate} / ${jo.billRate}/hr</div>
            </div>
            <div style={{padding:"9px 11px",background:C.bg,borderRadius:9}}>
              <div style={{fontSize:10.5,color:C.text3,fontWeight:600,letterSpacing:".04em",textTransform:"uppercase"}}>Filled</div>
              <div style={{fontSize:13,fontWeight:660,color:C.brand,marginTop:3}}>{jo.filled}/{jo.positions}{remaining>0?` (${remaining} left)`:""}</div>
            </div>
          </div>
          <div style={{fontSize:11.5,color:C.text3}}>Starts {jo.startDate} · {jo.ongoing?"Ongoing":`Ends ${jo.endDate}`}</div>
        </div>;})}
      {list.length===0&&<Empty icon="briefcase" title="No job orders" body="Add a new order or change the filter."/>}
    </div>

    {selected&&<_JobOrderDetail id={selected} onClose={()=>setSelected(null)}/>}
    {showAdd&&<_NewJobOrderModal onClose={()=>setShowAdd(false)}/>}
  </div>;
}

function _JobOrderDetail({id,onClose}){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const jo=A.jobOrder(id); if(!jo)return null;
  const client=A.staffingClient(jo.client);
  const filled=A.assignments.filter(a=>a.jobOrder===jo.id);
  const [showPlace,setShowPlace]=useState(false);
  const availableWorkers=A.workers.filter(w=>w.status==="active"&&w.availability==="available");
  /* Simple match: check if worker has all must-have tickets */
  const matched=availableWorkers.map(w=>{
    const has=jo.mustHave.filter(mh=>(w.tickets||[]).some(t=>t.toLowerCase().includes(mh.toLowerCase().split(" ")[0])));
    const score=jo.mustHave.length?Math.round((has.length/jo.mustHave.length)*100):50;
    return {w,score,hasAll:has.length===jo.mustHave.length};
  }).sort((a,b)=>b.score-a.score);

  return <Modal onClose={onClose} title="Job order" wide>
    <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 320px",gap:20}}>
      <div>
        <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
          <Tag tone={jo.urgency==="high"?"danger":jo.urgency==="medium"?"warn":"neutral"} sm>{jo.urgency}</Tag>
          <Tag tone={jo.status==="open"?"brand":jo.status==="filled"?"ok":"neutral"} sm>{jo.status}</Tag>
        </div>
        <div style={{fontSize:22,fontWeight:730,color:C.text,letterSpacing:"-.025em"}}>{jo.title}</div>
        <div style={{fontSize:14,color:C.text2,marginTop:6}}>{client?.name} · {jo.location}</div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:18,marginBottom:16}}>
          {[["Positions",`${jo.filled}/${jo.positions}`],
            ["Pay/Bill",`$${jo.payRate}/$${jo.billRate}/hr`],
            ["Starts",jo.startDate],
            ["Ends",jo.ongoing?"Ongoing":jo.endDate],
            ["Shift",jo.shiftPattern],
            ["OT",jo.overtimeAvailable?"Available (1.5x)":"None"]].map(([l,v])=>
            <div key={l}><div style={{fontSize:11,fontWeight:700,color:C.text3,letterSpacing:".05em",textTransform:"uppercase",marginBottom:3}}>{l}</div>
              <div style={{fontSize:13,color:C.text}}>{v}</div></div>)}
        </div>

        <div style={{marginBottom:14}}>
          <Lbl>Must-have tickets</Lbl>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {jo.mustHave.map(m=><Tag key={m} tone="danger" sm icon="alert">{m}</Tag>)}
          </div>
        </div>
        {jo.niceToHave.length>0&&<div style={{marginBottom:14}}>
          <Lbl>Nice to have</Lbl>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {jo.niceToHave.map(m=><Tag key={m} tone="brand" sm>{m}</Tag>)}
          </div>
        </div>}

        <Lbl>Supervisor</Lbl>
        <div style={{padding:12,background:C.bg,borderRadius:9,marginBottom:14}}>
          <div style={{fontSize:13.5,fontWeight:600,color:C.text}}>{jo.supervisor}</div>
          <div style={{fontSize:12,color:C.text3,marginTop:3}}>{jo.supervisorEmail}{jo.supervisorPhone?` · ${jo.supervisorPhone}`:""}</div>
        </div>

        {jo.ppe&&<div style={{marginBottom:14}}>
          <Lbl>PPE</Lbl>
          <div style={{fontSize:13,color:C.text2,lineHeight:1.6}}>{jo.ppe}</div>
        </div>}
        {jo.notes&&<div>
          <Lbl>Notes</Lbl>
          <div style={{fontSize:13,color:C.text2,lineHeight:1.6}}>{jo.notes}</div>
        </div>}
      </div>

      <div>
        <Lbl>Matched from bench</Lbl>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
          {matched.slice(0,6).map(({w,score,hasAll})=>{const person=(A.people||[]).find(p=>p.id===w.personId);
            return <div key={w.id} style={{padding:"10px 12px",background:C.bg,borderRadius:10,border:`1px solid ${hasAll?C.okLn:C.line}`,display:"flex",gap:10,alignItems:"center"}}>
              <SmartPortrait seed={person?.seed||0} size={32} radius={8}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{person?.name||"—"}</div>
                <div style={{fontSize:11.5,color:C.text3,marginTop:2}}>{w.city} · ${w.payRateTarget}/hr target</div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:13,fontWeight:700,color:hasAll?C.ok:score>=50?C.warn:C.text3}}>{score}%</div>
              </div>
            </div>;})}
          {matched.length===0&&<div style={{fontSize:12.5,color:C.text3,padding:12,textAlign:"center"}}>No available workers.</div>}
        </div>
        {jo.status==="open"&&<Btn kind="primary" size="sm" full icon="plus" onClick={()=>setShowPlace(true)}>Place a worker</Btn>}
      </div>
    </div>

    {showPlace&&<_PlaceWorkerModal jobOrder={jo} onClose={()=>setShowPlace(false)} onPlace={()=>{setShowPlace(false); onClose();}}/>}
  </Modal>;
}

function _PlaceWorkerModal({jobOrder,onClose,onPlace}){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [workerId,setWorkerId]=useState("");
  const [payRate,setPayRate]=useState(jobOrder.payRate);
  const [billRate,setBillRate]=useState(jobOrder.billRate);
  const availableWorkers=A.workers.filter(w=>w.status==="active"&&w.availability==="available");
  const selectedW=availableWorkers.find(w=>w.id===workerId);
  const person=selectedW?(A.people||[]).find(p=>p.id===selectedW.personId):null;
  const econ=A.calcStaffingEconomics(Number(payRate)||0,Number(billRate)||0,selectedW?.province||"ON",0);
  const marginOk=econ.markupPct>=A.STAFFING_AGENCY.markupFloor;

  const place=()=>{
    if(!workerId)return;
    A.createAssignment({worker:workerId,client:jobOrder.client,jobOrder:jobOrder.id,
      payRate:Number(payRate),billRate:Number(billRate),
      startDate:jobOrder.startDate,endDate:jobOrder.endDate,ongoing:jobOrder.ongoing,
      supervisor:jobOrder.supervisor,supervisorEmail:jobOrder.supervisorEmail,
      site:jobOrder.location,shiftPattern:jobOrder.shiftPattern,notes:""});
    onPlace();
  };

  return <Modal onClose={onClose} title="Place a worker">
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <Field label="Worker" required>
        <Sel value={workerId} onChange={e=>{setWorkerId(e.target.value); const w=availableWorkers.find(x=>x.id===e.target.value); if(w){setPayRate(w.payRateTarget||jobOrder.payRate);}}}>
          <option value="">Select from bench…</option>
          {availableWorkers.map(w=>{const p=(A.people||[]).find(pp=>pp.id===w.personId);
            return <option key={w.id} value={w.id}>{p?.name||w.id} — {w.city}, {w.province}</option>;})}
        </Sel>
      </Field>
      {selectedW&&<div style={{padding:12,background:C.tint,border:`1px solid ${C.line2}`,borderRadius:10}}>
        <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}>
          <SmartPortrait seed={person?.seed||0} size={36} radius={9}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13.5,fontWeight:640,color:C.text}}>{person?.name}</div>
            <div style={{fontSize:11.5,color:C.text3,marginTop:2}}>{selectedW.tickets.slice(0,3).join(", ")}</div>
          </div>
        </div>
      </div>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <Field label="Pay rate ($/hr)" required><Input type="number" step="0.5" value={payRate} onChange={e=>setPayRate(e.target.value)}/></Field>
        <Field label="Bill rate ($/hr)" required><Input type="number" step="0.5" value={billRate} onChange={e=>setBillRate(e.target.value)}/></Field>
      </div>
      {selectedW&&<Card pad={14} style={{borderRadius:11,background:marginOk?C.okBg:C.warnBg,border:`1px solid ${marginOk?C.okLn:C.warnLn}`}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:6}}>
          <span style={{color:C.text3,fontWeight:600}}>MARKUP</span>
          <span style={{color:marginOk?C.ok:C.warn,fontWeight:700}}>{econ.markupPct}%</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:6}}>
          <span style={{color:C.text3,fontWeight:600}}>TRUE COST/HR (after burden)</span>
          <span style={{color:C.text,fontWeight:700}}>${econ.trueCost}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:12}}>
          <span style={{color:C.text3,fontWeight:600}}>MARGIN/HR</span>
          <span style={{color:econ.margin>0?C.ok:C.danger,fontWeight:700}}>${econ.margin}</span>
        </div>
        {!marginOk&&<div style={{fontSize:11,color:C.warn,marginTop:8,paddingTop:8,borderTop:`1px solid ${C.warnLn}`}}>
          Below {A.STAFFING_AGENCY.markupFloor}% markup floor. Reconsider rates or you're losing money on WSIB claims.</div>}
      </Card>}
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
        <Btn kind="primary" onClick={place} disabled={!workerId||!payRate||!billRate}>Confirm placement</Btn>
      </div>
    </div>
  </Modal>;
}

function _NewJobOrderModal({onClose}){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [d,setD]=useState({client:"",title:"",positions:1,location:"",province:"ON",
    startDate:_fmtDate(new Date()),endDate:"",ongoing:false,
    shiftPattern:"Mon-Fri 8am-4pm",overtimeAvailable:false,
    payRate:0,billRate:0,mustHave:[],niceToHave:[],
    supervisor:"",supervisorEmail:"",supervisorPhone:"",
    urgency:"medium",ppe:"",notes:""});
  const set=(k,v)=>setD(p=>({...p,[k]:v}));
  const client=A.staffingClient(d.client);
  useEffect(()=>{if(client){set("supervisor",client.notes?.split(" ")[0]||""); set("supervisorEmail",client.defaultSupervisorEmail||"");}},[d.client]);
  const submit=()=>{
    if(!d.title||!d.client)return;
    A.createJobOrder(d); onClose();
  };
  return <Modal onClose={onClose} title="New job order" wide>
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12}}>
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
      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr 1fr",gap:12}}>
        <Field label="Positions"><Input type="number" min="1" value={d.positions} onChange={e=>set("positions",Number(e.target.value)||1)}/></Field>
        <Field label="Pay rate ($/hr)" required><Input type="number" step="0.5" value={d.payRate} onChange={e=>set("payRate",Number(e.target.value)||0)}/></Field>
        <Field label="Bill rate ($/hr)" required><Input type="number" step="0.5" value={d.billRate} onChange={e=>set("billRate",Number(e.target.value)||0)}/></Field>
      </div>
      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12}}>
        <Field label="Location"><Input icon="pin" value={d.location} onChange={e=>set("location",e.target.value)} placeholder="Calgary AB — Foothills Hospital"/></Field>
        <Field label="Province"><Sel value={d.province} onChange={e=>set("province",e.target.value)}>
          {Object.keys(A.STAFFING_RATES).map(p=><option key={p} value={p}>{A.STAFFING_RATES[p].label}</option>)}</Sel></Field>
      </div>
      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr 1fr",gap:12}}>
        <Field label="Start date" required><DatePicker value={d.startDate} onChange={v=>set("startDate",v)}/></Field>
        <Field label="End date"><DatePicker value={d.endDate} onChange={v=>set("endDate",v)} min={d.startDate}/></Field>
        <Field label=" "><label style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",fontSize:13.5,color:C.text2}}>
          <input type="checkbox" checked={d.ongoing} onChange={e=>set("ongoing",e.target.checked)}/> Ongoing</label></Field>
      </div>
      <Field label="Shift pattern"><Input value={d.shiftPattern} onChange={e=>set("shiftPattern",e.target.value)}/></Field>
      <Field label="Must-have tickets"><InlineList value={d.mustHave} onChange={v=>set("mustHave",v)} icon="alert" placeholder="e.g. Red Seal Electrician"/></Field>
      <Field label="Nice-to-have"><InlineList value={d.niceToHave} onChange={v=>set("niceToHave",v)} icon="sparkle" placeholder="e.g. Blueprint Reading"/></Field>
      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12}}>
        <Field label="Client supervisor"><Input value={d.supervisor} onChange={e=>set("supervisor",e.target.value)} placeholder="Site foreman name"/></Field>
        <Field label="Supervisor email"><Input icon="mail" value={d.supervisorEmail} onChange={e=>set("supervisorEmail",e.target.value)}/></Field>
      </div>
      <Field label="Notes"><Area rows={3} value={d.notes} onChange={e=>set("notes",e.target.value)}/></Field>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
        <Btn kind="primary" onClick={submit} disabled={!d.title||!d.client||!d.payRate||!d.billRate}>Create order</Btn>
      </div>
    </div>
  </Modal>;
}

/* ─── Bench: available workers ─── */
export function AgencyBench(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [q,setQ]=useState(""); const [prov,setProv]=useState("all"); const [avail,setAvail]=useState("all");
  const list=A.workers.filter(w=>{
    if(w.status!=="active")return false;
    if(avail!=="all"&&w.availability!==avail)return false;
    if(prov!=="all"&&w.province!==prov)return false;
    if(q){const person=(A.people||[]).find(p=>p.id===w.personId);
      const s=q.toLowerCase(); const searchable=`${person?.name||""} ${w.city} ${w.tickets.join(" ")}`.toLowerCase();
      if(!searchable.includes(s))return false;}
    return true;
  });
  return <div>
    <div style={{marginBottom:14}}>
      <div style={{fontSize:18,fontWeight:720,color:C.text}}>{list.length} workers on bench</div>
      <div style={{fontSize:13,color:C.text3,marginTop:3}}>Search by name, city, or ticket. Filter by province and availability.</div>
    </div>

    <Card pad={mob?14:18} style={{marginBottom:14,borderRadius:12}}>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{flex:"1 1 240px",minWidth:0}}>
          <Input icon="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search name, city, or ticket"/></div>
        <Sel value={prov} onChange={e=>setProv(e.target.value)} style={{maxWidth:160}}>
          <option value="all">All provinces</option>
          {Object.keys(A.STAFFING_RATES).map(p=><option key={p} value={p}>{p}</option>)}</Sel>
        <Sel value={avail} onChange={e=>setAvail(e.target.value)} style={{maxWidth:180}}>
          <option value="all">Any availability</option>
          <option value="available">Available now</option>
          <option value="on-assignment">On assignment</option>
          <option value="unavailable">Unavailable</option></Sel>
      </div>
    </Card>

    <Card pad={0} style={{borderRadius:14,overflow:"hidden"}}>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:720}}>
        <thead><tr style={{borderBottom:`2px solid ${C.line}`,textAlign:"left"}}>
          {["Worker","Location","Availability","Rate target","Tickets","Vac accrued"].map(h=>
            <th key={h} style={{padding:"12px 14px",fontSize:11.5,fontWeight:700,color:C.text3,letterSpacing:".05em",textTransform:"uppercase"}}>{h}</th>)}
        </tr></thead>
        <tbody>{list.map(w=>{const person=(A.people||[]).find(p=>p.id===w.personId);
          return <tr key={w.id} style={{borderBottom:`1px solid ${C.lineSoft}`,transition:"background .16s",cursor:"pointer"}}
            onMouseEnter={e=>e.currentTarget.style.background=C.bg}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}
            onClick={()=>A.go("agencyWorkers")}>
            <td style={{padding:"11px 14px"}}>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <SmartPortrait seed={person?.seed||0} size={30} radius={8}/>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:13.5,fontWeight:600,color:C.text}}>{person?.name||"—"}</div>
                  <div style={{fontSize:11.5,color:C.text3,marginTop:2}}>Since {w.onboarded}</div>
                </div>
              </div>
            </td>
            <td style={{padding:"11px 14px",fontSize:13,color:C.text2}}>{w.city}, {w.province}</td>
            <td style={{padding:"11px 14px"}}><Tag tone={w.availability==="available"?"ok":w.availability==="on-assignment"?"brand":"neutral"} sm>{w.availability}</Tag></td>
            <td style={{padding:"11px 14px",fontSize:13,color:C.text,fontWeight:600}}>${w.payRateTarget||"—"}/hr</td>
            <td style={{padding:"11px 14px"}}>
              <div style={{display:"flex",flexWrap:"wrap",gap:4,maxWidth:280}}>
                {w.tickets.slice(0,3).map(t=><Tag key={t} tone="neutral" sm>{t}</Tag>)}
                {w.tickets.length>3&&<Tag tone="neutral" sm>+{w.tickets.length-3}</Tag>}
              </div>
            </td>
            <td style={{padding:"11px 14px",fontSize:12.5,color:C.brand,fontWeight:600}}>${w.vacBalance.toFixed(2)}</td>
          </tr>;})}
          {list.length===0&&<tr><td colSpan={6} style={{padding:24,textAlign:"center",color:C.text3,fontSize:13}}>No matching workers.</td></tr>}
        </tbody>
      </table></div>
    </Card>
  </div>;
}

/* ─── Assignments ─── */
export function AgencyAssignments(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [tab,setTab]=useState("active");
  const list=A.assignments.filter(a=>tab==="all"?true:a.status===tab).sort((a,b)=>b.startDate.localeCompare(a.startDate));
  return <div>
    <div style={{marginBottom:14}}>
      <div style={{fontSize:18,fontWeight:720,color:C.text}}>{list.length} assignments</div>
      <div style={{fontSize:13,color:C.text3,marginTop:3}}>Every worker deployed across every client.</div>
    </div>

    <div style={{display:"flex",background:C.bg,borderRadius:8,padding:2,border:`1px solid ${C.line}`,marginBottom:14,width:"fit-content"}}>
      {[["active","Active"],["completed","Completed"],["all","All"]].map(([v,l])=>
        <button key={v} onClick={()=>setTab(v)} style={{background:tab===v?"#fff":"transparent",border:"none",padding:"7px 13px",borderRadius:6,cursor:"pointer",fontFamily:"inherit",fontSize:12.5,fontWeight:640,color:tab===v?C.brand:C.text3}}>{l}</button>)}
    </div>

    <Card pad={0} style={{borderRadius:14,overflow:"hidden"}}>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:720}}>
        <thead><tr style={{borderBottom:`2px solid ${C.line}`,textAlign:"left"}}>
          {["Worker","Client","Site","Rates","Duration","Margin","Status"].map(h=>
            <th key={h} style={{padding:"12px 14px",fontSize:11.5,fontWeight:700,color:C.text3,letterSpacing:".05em",textTransform:"uppercase"}}>{h}</th>)}
        </tr></thead>
        <tbody>{list.map(a=>{const w=A.worker(a.worker); const person=w?(A.people||[]).find(p=>p.id===w.personId):null;
          const client=A.staffingClient(a.client);
          const emp=client?A.employers.find(e=>e.id===client.employerId):null;
          const econ=A.assignmentMargin(a.id);
          return <tr key={a.id} style={{borderBottom:`1px solid ${C.lineSoft}`}}>
            <td style={{padding:"11px 14px"}}>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <SmartPortrait seed={person?.seed||0} size={30} radius={8}/>
                <span style={{fontSize:13.5,fontWeight:600,color:C.text}}>{person?.name||"—"}</span>
              </div>
            </td>
            <td style={{padding:"11px 14px",fontSize:13,color:C.text2}}>{emp?.name||"—"}</td>
            <td style={{padding:"11px 14px",fontSize:12.5,color:C.text3,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.site.split(" — ").pop()}</td>
            <td style={{padding:"11px 14px",fontSize:12.5,color:C.text}}>${a.payRate}/${a.billRate}</td>
            <td style={{padding:"11px 14px",fontSize:12.5,color:C.text3}}>{a.startDate} → {a.endDate||"ongoing"}</td>
            <td style={{padding:"11px 14px",fontSize:12.5,color:econ?.margin>0?C.ok:C.danger,fontWeight:640}}>
              {econ?<>${econ.margin}/hr <span style={{color:C.text3,fontWeight:500}}>({econ.markupPct}%)</span></>:"—"}
            </td>
            <td style={{padding:"11px 14px"}}><Tag tone={a.status==="active"?"ok":"neutral"} sm>{a.status}</Tag></td>
          </tr>;})}
        </tbody>
      </table></div>
    </Card>
  </div>;
}

/* ─── Timesheets ─── */
export function AgencyTimesheets(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [tab,setTab]=useState("submitted");
  const list=A.timesheets.filter(t=>tab==="all"?true:t.status===tab).sort((a,b)=>b.weekStart.localeCompare(a.weekStart));
  return <div>
    <div style={{marginBottom:14}}>
      <div style={{fontSize:18,fontWeight:720,color:C.text}}>Timesheets</div>
      <div style={{fontSize:13,color:C.text3,marginTop:3}}>Weekly hours submitted by workers, approved by client supervisors.</div>
    </div>

    <div style={{display:"flex",background:C.bg,borderRadius:8,padding:2,border:`1px solid ${C.line}`,marginBottom:14,width:"fit-content",flexWrap:"wrap"}}>
      {[["draft","Draft"],["submitted","Submitted"],["approved","Approved"],["paid","Paid"],["all","All"]].map(([v,l])=>{
        const count=A.timesheets.filter(t=>v==="all"?true:t.status===v).length;
        return <button key={v} onClick={()=>setTab(v)} style={{background:tab===v?"#fff":"transparent",border:"none",padding:"7px 13px",borderRadius:6,cursor:"pointer",fontFamily:"inherit",fontSize:12.5,fontWeight:640,color:tab===v?C.brand:C.text3}}>{l} ({count})</button>;})}
    </div>

    <Card pad={0} style={{borderRadius:14,overflow:"hidden"}}>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:720}}>
        <thead><tr style={{borderBottom:`2px solid ${C.line}`,textAlign:"left"}}>
          {["Week","Worker","Client","Hours","Gross pay","Bill","Status","Actions"].map(h=>
            <th key={h} style={{padding:"12px 14px",fontSize:11.5,fontWeight:700,color:C.text3,letterSpacing:".05em",textTransform:"uppercase"}}>{h}</th>)}
        </tr></thead>
        <tbody>{list.map(t=>{const w=A.worker(t.worker); const person=w?(A.people||[]).find(p=>p.id===w.personId):null;
          const asn=A.assignment(t.assignment); const client=asn?A.staffingClient(asn.client):null;
          const emp=client?A.employers.find(e=>e.id===client.employerId):null;
          const totalHrs=A.timesheetTotal(t); const gross=A.timesheetGross(t); const bill=A.timesheetBill(t);
          return <tr key={t.id} style={{borderBottom:`1px solid ${C.lineSoft}`}}>
            <td style={{padding:"11px 14px",fontSize:12.5,color:C.text2,fontFamily:"ui-monospace,monospace"}}>{t.weekStart}</td>
            <td style={{padding:"11px 14px"}}><div style={{display:"flex",gap:10,alignItems:"center"}}>
              <SmartPortrait seed={person?.seed||0} size={28} radius={7}/>
              <span style={{fontSize:13,color:C.text,fontWeight:600}}>{person?.name||"—"}</span></div></td>
            <td style={{padding:"11px 14px",fontSize:12.5,color:C.text2}}>{emp?.name||"—"}</td>
            <td style={{padding:"11px 14px",fontSize:13,color:C.text,fontWeight:600}}>{totalHrs}h{t.otHours>0?` (${t.otHours} OT)`:""}</td>
            <td style={{padding:"11px 14px",fontSize:13,color:C.text}}>${gross.toFixed(2)}</td>
            <td style={{padding:"11px 14px",fontSize:13,color:C.brand,fontWeight:600}}>${bill.toFixed(2)}</td>
            <td style={{padding:"11px 14px"}}><Tag tone={t.status==="approved"?"ok":t.status==="submitted"?"warn":t.status==="paid"?"brand":"neutral"} sm>{t.status}</Tag></td>
            <td style={{padding:"11px 14px"}}>
              {t.status==="submitted"&&<div style={{display:"flex",gap:4}}>
                <Btn kind="dangerSoft" size="xs" onClick={()=>A.rejectTimesheet(t.id,"Ask client to resubmit")}>Return</Btn>
                <Btn kind="primary" size="xs" onClick={()=>A.approveTimesheet(t.id,client?.defaultSupervisorEmail||"—")}>Approve on client's behalf</Btn>
              </div>}
              {t.status==="submitted"&&<div style={{fontSize:10.5,color:C.text3,marginTop:2}}>Chase: {client?.defaultSupervisorEmail}</div>}
            </td>
          </tr>;})}
          {list.length===0&&<tr><td colSpan={8} style={{padding:24,textAlign:"center",color:C.text3,fontSize:13}}>No timesheets in this state.</td></tr>}
        </tbody>
      </table></div>
    </Card>
  </div>;
}

/* ─── Payroll ─── */
export function AgencyPayroll(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [showRun,setShowRun]=useState(false);
  const readyToPay=A.timesheets.filter(t=>t.status==="approved").length;
  const readyGross=A.timesheets.filter(t=>t.status==="approved").reduce((s,t)=>s+A.timesheetGross(t),0);
  return <div>
    <div style={{marginBottom:14}}>
      <div style={{fontSize:18,fontWeight:720,color:C.text}}>Staffing payroll</div>
      <div style={{fontSize:13,color:C.text3,marginTop:3}}>Biweekly runs. Workers paid Thursday for the previous two weeks' approved hours.</div>
    </div>

    <Card pad={mob?18:22} style={{marginBottom:14,borderRadius:14,background:readyToPay>0?C.tint:C.bg,border:`1px solid ${readyToPay>0?C.line2:C.line}`}}>
      <div style={{display:"flex",gap:14,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{width:44,height:44,borderRadius:11,background:"#fff",color:C.brand,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><I n="wallet" s={22}/></div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:15,fontWeight:660,color:C.text}}>Ready for next run</div>
          <div style={{fontSize:12.5,color:C.text2,marginTop:3}}>{readyToPay} approved timesheets · ${readyGross.toFixed(2)} gross</div>
        </div>
        <Btn kind="primary" size="sm" icon="play" disabled={readyToPay===0} onClick={()=>setShowRun(true)}>Run biweekly payroll</Btn>
      </div>
    </Card>

    <Card pad={0} style={{borderRadius:14,overflow:"hidden"}}>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:720}}>
        <thead><tr style={{borderBottom:`2px solid ${C.line}`,textAlign:"left"}}>
          {["Period","Run date","Workers","Hours","Gross","Net","Status","Actions"].map(h=>
            <th key={h} style={{padding:"12px 14px",fontSize:11.5,fontWeight:700,color:C.text3,letterSpacing:".05em",textTransform:"uppercase"}}>{h}</th>)}
        </tr></thead>
        <tbody>{A.staffingPayruns.map(p=><tr key={p.id} style={{borderBottom:`1px solid ${C.lineSoft}`}}>
          <td style={{padding:"11px 14px",fontSize:12.5,color:C.text2,fontFamily:"ui-monospace,monospace"}}>{p.periodStart} → {p.periodEnd}</td>
          <td style={{padding:"11px 14px",fontSize:12.5,color:C.text3}}>{p.runDate}</td>
          <td style={{padding:"11px 14px",fontSize:13,color:C.text}}>{p.workers}</td>
          <td style={{padding:"11px 14px",fontSize:13,color:C.text}}>{p.totalHours}</td>
          <td style={{padding:"11px 14px",fontSize:13,color:C.text}}>${p.totalGross.toLocaleString()}</td>
          <td style={{padding:"11px 14px",fontSize:13,color:C.brand,fontWeight:600}}>${p.totalNet.toLocaleString()}</td>
          <td style={{padding:"11px 14px"}}><Tag tone={p.status==="paid"?"ok":"warn"} sm>{p.status}</Tag></td>
          <td style={{padding:"11px 14px"}}>{p.status==="pending"&&<Btn kind="primary" size="xs" onClick={()=>A.finalizeStaffingPayrun(p.id)}>Finalize</Btn>}</td>
        </tr>)}
        {A.staffingPayruns.length===0&&<tr><td colSpan={8} style={{padding:24,textAlign:"center",color:C.text3,fontSize:13}}>No payroll runs yet.</td></tr>}
        </tbody>
      </table></div>
    </Card>

    {showRun&&<Modal onClose={()=>setShowRun(false)} title="Run biweekly payroll">
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <Banner tone="brand" icon="info" title="This will">
          Batch all approved timesheets from the last 2 weeks into a payroll run. Timesheets will be locked (marked "paid" in the system). Workers receive direct deposit Thursday.
        </Banner>
        <div style={{padding:14,background:C.bg,borderRadius:10}}>
          <div style={{fontSize:13,color:C.text2}}>Ready timesheets: <strong>{readyToPay}</strong></div>
          <div style={{fontSize:13,color:C.text2,marginTop:4}}>Total gross: <strong style={{color:C.brand}}>${readyGross.toFixed(2)}</strong></div>
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn kind="ghost" onClick={()=>setShowRun(false)}>Cancel</Btn>
          <Btn kind="primary" onClick={()=>{
            const twoWksAgo=new Date(); twoWksAgo.setDate(twoWksAgo.getDate()-14);
            A.runStaffingPayroll(_fmtDate(twoWksAgo),_fmtDate(new Date()));
            setShowRun(false);
          }}>Run payroll</Btn>
        </div>
      </div>
    </Modal>}
  </div>;
}

/* ─── Invoicing ─── */
export function AgencyInvoicing(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [tab,setTab]=useState("pending");
  const [showGen,setShowGen]=useState(false);
  const list=A.staffingInvoices.filter(i=>tab==="all"?true:i.status===tab).sort((a,b)=>b.issued.localeCompare(a.issued));

  const kpis={
    pending:A.staffingInvoices.filter(i=>i.status==="pending").reduce((s,i)=>s+i.total,0),
    overdue:A.staffingInvoices.filter(i=>i.status==="overdue").reduce((s,i)=>s+i.total,0),
    paid30d:A.staffingInvoices.filter(i=>i.status==="paid"&&i.paidOn&&(Date.now()-new Date(i.paidOn).getTime())<30*864e5).reduce((s,i)=>s+i.total,0),
  };

  return <div>
    <div style={{marginBottom:14}}>
      <div style={{fontSize:18,fontWeight:720,color:C.text}}>Client invoicing</div>
      <div style={{fontSize:13,color:C.text3,marginTop:3}}>Weekly invoice cycle. Approved timesheets → client invoice.</div>
    </div>

    <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(3,1fr)",gap:12,marginBottom:16}}>
      {[["AR outstanding",kpis.pending,C.brand],
        ["Overdue",kpis.overdue,C.danger],
        ["Paid last 30 days",kpis.paid30d,C.ok]].map(([l,v,t])=>
        <Card key={l} pad={mob?16:20} style={{borderRadius:14}}>
          <div style={{fontSize:mob?20:24,fontWeight:720,color:t,letterSpacing:"-.025em"}}>${(v/1000).toFixed(1)}k</div>
          <div style={{fontSize:12,color:C.text3,marginTop:6}}>{l}</div>
        </Card>)}
    </div>

    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:10}}>
      <div style={{display:"flex",background:C.bg,borderRadius:8,padding:2,border:`1px solid ${C.line}`}}>
        {[["pending","Pending"],["overdue","Overdue"],["paid","Paid"],["all","All"]].map(([v,l])=>
          <button key={v} onClick={()=>setTab(v)} style={{background:tab===v?"#fff":"transparent",border:"none",padding:"7px 13px",borderRadius:6,cursor:"pointer",fontFamily:"inherit",fontSize:12.5,fontWeight:640,color:tab===v?C.brand:C.text3}}>{l}</button>)}
      </div>
      <Btn kind="primary" size="sm" icon="plus" onClick={()=>setShowGen(true)}>Generate weekly invoices</Btn>
    </div>

    <Card pad={0} style={{borderRadius:14,overflow:"hidden"}}>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:720}}>
        <thead><tr style={{borderBottom:`2px solid ${C.line}`,textAlign:"left"}}>
          {["Number","Client","Week","Total","Due","Status","Actions"].map(h=>
            <th key={h} style={{padding:"12px 14px",fontSize:11.5,fontWeight:700,color:C.text3,letterSpacing:".05em",textTransform:"uppercase"}}>{h}</th>)}
        </tr></thead>
        <tbody>{list.map(inv=>{const client=A.staffingClient(inv.client);
          const emp=client?A.employers.find(e=>e.id===client.employerId):null;
          const daysOverdue=inv.status==="overdue"&&inv.due?Math.floor((Date.now()-new Date(inv.due).getTime())/864e5):0;
          return <tr key={inv.id} style={{borderBottom:`1px solid ${C.lineSoft}`}}>
            <td style={{padding:"11px 14px",fontSize:12.5,color:C.text2,fontFamily:"ui-monospace,monospace"}}>{inv.number}</td>
            <td style={{padding:"11px 14px",fontSize:13,color:C.text,fontWeight:600}}>{emp?.name||"—"}</td>
            <td style={{padding:"11px 14px",fontSize:12.5,color:C.text3}}>{inv.weekStart}</td>
            <td style={{padding:"11px 14px",fontSize:13.5,color:C.text,fontWeight:660}}>${inv.total.toLocaleString()}</td>
            <td style={{padding:"11px 14px",fontSize:12.5,color:daysOverdue>0?C.danger:C.text3}}>{inv.due}{daysOverdue>0?` (+${daysOverdue}d)`:""}</td>
            <td style={{padding:"11px 14px"}}><Tag tone={inv.status==="paid"?"ok":inv.status==="overdue"?"danger":"warn"} sm>{inv.status}</Tag></td>
            <td style={{padding:"11px 14px"}}>
              {inv.status!=="paid"&&<Btn kind="ghost" size="xs" onClick={()=>A.markStaffingInvoicePaid(inv.id)}>Mark paid</Btn>}
            </td>
          </tr>;})}
          {list.length===0&&<tr><td colSpan={7} style={{padding:24,textAlign:"center",color:C.text3,fontSize:13}}>No invoices.</td></tr>}
        </tbody>
      </table></div>
    </Card>

    {showGen&&<Modal onClose={()=>setShowGen(false)} title="Generate weekly invoices">
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <Banner tone="brand" icon="info" title="Weekly cycle">
          This will batch all approved timesheets for a given week into per-client invoices. HST/GST added per province. Emailed to each client's billing contact.
        </Banner>
        <Field label="Week starting" required>
          <DatePicker value={_weekStart(1)} onChange={()=>{}}/>
        </Field>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn kind="ghost" onClick={()=>setShowGen(false)}>Cancel</Btn>
          <Btn kind="primary" onClick={()=>{A.generateStaffingInvoices(_weekStart(1)); setShowGen(false);}}>Generate</Btn>
        </div>
      </div>
    </Modal>}
  </div>;
}

/* ─── Placements ─── */
export function AgencyPlacements(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [tab,setTab]=useState("in-progress");
  const list=A.placements.filter(p=>tab==="all"?true:p.status===tab).sort((a,b)=>b.offeredAt.localeCompare(a.offeredAt));
  return <div>
    <div style={{marginBottom:14}}>
      <div style={{fontSize:18,fontWeight:720,color:C.text}}>Permanent placements</div>
      <div style={{fontSize:13,color:C.text3,marginTop:3}}>Perm hires we source. Fee due on start. 90-day guarantee.</div>
    </div>

    <div style={{display:"flex",background:C.bg,borderRadius:8,padding:2,border:`1px solid ${C.line}`,marginBottom:14,width:"fit-content",flexWrap:"wrap"}}>
      {[["in-progress","In progress"],["accepted","Accepted"],["guaranteed","In guarantee"],["clawed-back","Clawed back"],["all","All"]].map(([v,l])=>{
        const count=A.placements.filter(p=>v==="all"?true:p.status===v).length;
        return <button key={v} onClick={()=>setTab(v)} style={{background:tab===v?"#fff":"transparent",border:"none",padding:"7px 13px",borderRadius:6,cursor:"pointer",fontFamily:"inherit",fontSize:12.5,fontWeight:640,color:tab===v?C.brand:C.text3}}>{l} ({count})</button>;})}
    </div>

    <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(auto-fill,minmax(340px,1fr))",gap:12}}>
      {list.map(p=>{const client=A.staffingClient(p.client);
        const emp=client?A.employers.find(e=>e.id===client.employerId):null;
        const guaranteeDaysLeft=p.guaranteeEnds?Math.floor((new Date(p.guaranteeEnds)-Date.now())/864e5):null;
        return <div key={p.id} data-card style={{background:"#fff",borderRadius:14,padding:mob?16:20,border:`1px solid ${C.line}`}}>
          <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
            <Tag tone={p.status==="guaranteed"?"ok":p.status==="clawed-back"?"danger":p.status==="accepted"?"warn":"brand"} sm>{p.status}</Tag>
            {guaranteeDaysLeft!==null&&guaranteeDaysLeft>0&&guaranteeDaysLeft<=30&&
              <Tag tone="warn" sm>{guaranteeDaysLeft}d guarantee left</Tag>}
          </div>
          <div style={{fontSize:16,fontWeight:660,color:C.text,letterSpacing:"-.015em"}}>{p.role}</div>
          <div style={{fontSize:13,color:C.text2,marginTop:4}}>{emp?.name||"—"}</div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:14,marginBottom:12}}>
            <div><div style={{fontSize:11,fontWeight:700,color:C.text3,letterSpacing:".05em",textTransform:"uppercase"}}>Salary</div>
              <div style={{fontSize:14,fontWeight:660,color:C.text,marginTop:3}}>${p.salary.toLocaleString()}</div></div>
            <div><div style={{fontSize:11,fontWeight:700,color:C.text3,letterSpacing:".05em",textTransform:"uppercase"}}>Fee ({p.feePct}%)</div>
              <div style={{fontSize:14,fontWeight:700,color:C.brand,marginTop:3}}>${p.fee.toLocaleString()}</div></div>
          </div>
          <div style={{fontSize:11.5,color:C.text3,marginBottom:10}}>
            Offered {p.offeredAt}{p.startDate?` · Started ${p.startDate}`:""}
            {p.invoicedOn?` · Invoiced ${p.invoicedOn}`:""}
            {p.paidOn?` · Paid ${p.paidOn}`:""}
          </div>
          {p.status==="clawed-back"&&<Banner tone="danger" icon="alert" title="Clawed back">
            {p.clawbackReason||"Replacement owed to client."}</Banner>}
          {p.status==="accepted"&&<Btn kind="primary" size="xs" full onClick={()=>A.invoicePlacement(p.id)}>Invoice on start</Btn>}
        </div>;})}
      {list.length===0&&<div style={{gridColumn:"1 / -1"}}><Empty icon="award" title="No placements in this state" body="Start with a job order and convert to placement."/></div>}
    </div>
  </div>;
}

/* ─── Clients (staffing) ─── */
export function AgencyClients(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const list=A.staffingClients;
  return <div>
    <div style={{marginBottom:14}}>
      <div style={{fontSize:18,fontWeight:720,color:C.text}}>{list.length} clients</div>
      <div style={{fontSize:13,color:C.text3,marginTop:3}}>Employers we have (or want) a staffing relationship with.</div>
    </div>

    <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(auto-fill,minmax(340px,1fr))",gap:12}}>
      {list.map(c=>{const emp=A.employers.find(e=>e.id===c.employerId);
        const activeAsns=A.assignments.filter(a=>a.client===c.id&&a.status==="active").length;
        const openOrds=A.jobOrders.filter(j=>j.client===c.id&&j.status==="open").length;
        return <Card key={c.id} pad={mob?18:22} style={{borderRadius:14}}>
          <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:12}}>
            <SmartLogo e={emp||{mark:"hex",a:C.brand,b:"#fff"}} size={44} radius={11}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:15,fontWeight:660,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp?.name||"—"}</div>
              <div style={{fontSize:12,color:C.text3,marginTop:3}}>{c.industry} · Net {c.paymentTermsDays}</div>
            </div>
            <Tag tone={c.status==="active"?"ok":c.status==="prospect"?"warn":"neutral"} sm>{c.status}</Tag>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
            <div style={{padding:"9px 11px",background:C.bg,borderRadius:9,textAlign:"center"}}>
              <div style={{fontSize:16,fontWeight:730,color:C.brand}}>{activeAsns}</div>
              <div style={{fontSize:10.5,color:C.text3,marginTop:2}}>Active</div></div>
            <div style={{padding:"9px 11px",background:C.bg,borderRadius:9,textAlign:"center"}}>
              <div style={{fontSize:16,fontWeight:730,color:C.warn}}>{openOrds}</div>
              <div style={{fontSize:10.5,color:C.text3,marginTop:2}}>Open orders</div></div>
            <div style={{padding:"9px 11px",background:C.bg,borderRadius:9,textAlign:"center"}}>
              <div style={{fontSize:16,fontWeight:730,color:c.currentAR>c.creditLimit*0.8?C.danger:C.text}}>${(c.currentAR/1000).toFixed(0)}k</div>
              <div style={{fontSize:10.5,color:C.text3,marginTop:2}}>AR</div></div>
          </div>
          <div style={{fontSize:12,color:C.text3,paddingTop:12,borderTop:`1px solid ${C.lineSoft}`}}>
            {c.signedMsa?<>MSA signed {c.signedMsa}</>:<span style={{color:C.warn,fontWeight:600}}>MSA not signed</span>}
            {" · "}Markup target {c.markup}%
          </div>
          {!c.signedMsa&&<Btn kind="primary" size="xs" full style={{marginTop:10}} onClick={()=>A.signMsa(c.id)}>Mark MSA signed</Btn>}
        </Card>;})}
    </div>
  </div>;
}

/* ─── Workers management ─── */
export function AgencyWorkers(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [selected,setSelected]=useState(null);
  const list=A.workers;
  return <div>
    <div style={{marginBottom:14}}>
      <div style={{fontSize:18,fontWeight:720,color:C.text}}>{list.length} workers on record</div>
      <div style={{fontSize:13,color:C.text3,marginTop:3}}>All seekers who opted into agency representation. Includes documents and compliance.</div>
    </div>

    <Card pad={0} style={{borderRadius:14,overflow:"hidden"}}>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:800}}>
        <thead><tr style={{borderBottom:`2px solid ${C.line}`,textAlign:"left"}}>
          {["Worker","Location","Availability","Work eligibility","Docs complete","Vac accrued","Actions"].map(h=>
            <th key={h} style={{padding:"12px 14px",fontSize:11.5,fontWeight:700,color:C.text3,letterSpacing:".05em",textTransform:"uppercase"}}>{h}</th>)}
        </tr></thead>
        <tbody>{list.map(w=>{const person=(A.people||[]).find(p=>p.id===w.personId);
          const docsComplete=w.tdOnFile&&w.directDepositOnFile&&w.workEligibility;
          return <tr key={w.id} style={{borderBottom:`1px solid ${C.lineSoft}`,cursor:"pointer"}} onClick={()=>setSelected(w.id)}>
            <td style={{padding:"11px 14px"}}>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <SmartPortrait seed={person?.seed||0} size={30} radius={8}/>
                <div><div style={{fontSize:13.5,fontWeight:600,color:C.text}}>{person?.name||"—"}</div>
                  <div style={{fontSize:11.5,color:C.text3,marginTop:2}}>SIN ***-***-{w.sinLast3||"—"}</div></div>
              </div>
            </td>
            <td style={{padding:"11px 14px",fontSize:13,color:C.text2}}>{w.city}, {w.province}</td>
            <td style={{padding:"11px 14px"}}><Tag tone={w.availability==="available"?"ok":w.availability==="on-assignment"?"brand":"neutral"} sm>{w.availability}</Tag></td>
            <td style={{padding:"11px 14px",fontSize:12.5,color:C.text2}}>{w.workEligibility}{w.weExpiry?<div style={{fontSize:11,color:new Date(w.weExpiry)<Date.now()+90*864e5?C.warn:C.text3}}>Exp {w.weExpiry}</div>:null}</td>
            <td style={{padding:"11px 14px"}}><Tag tone={docsComplete?"ok":"warn"} sm icon={docsComplete?"check":"alert"}>{docsComplete?"Complete":"Missing"}</Tag></td>
            <td style={{padding:"11px 14px",fontSize:13,color:C.brand,fontWeight:600}}>${w.vacBalance.toFixed(2)}</td>
            <td style={{padding:"11px 14px"}}>
              <Sel value={w.status} onChange={e=>{e.stopPropagation();A.updateWorker(w.id,{status:e.target.value});}} style={{fontSize:12,padding:"5px 8px"}} onClick={e=>e.stopPropagation()}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Sel>
            </td>
          </tr>;})}
        </tbody>
      </table></div>
    </Card>

    {selected&&(()=>{const w=A.worker(selected); const person=(A.people||[]).find(p=>p.id===w.personId);
      return <Modal onClose={()=>setSelected(null)} title="Worker file" wide>
        <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:16}}>
          <SmartPortrait seed={person?.seed||0} size={54} radius={13}/>
          <div>
            <div style={{fontSize:18,fontWeight:720,color:C.text,letterSpacing:"-.02em"}}>{person?.name}</div>
            <div style={{fontSize:13,color:C.text2,marginTop:3}}>{person?.email} · {person?.phone}</div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:14,fontSize:13}}>
          {[["Location",`${w.city}, ${w.province}`],
            ["Onboarded",w.onboarded],
            ["SIN (last 3)",w.sinLast3||"Not on file"],
            ["Work eligibility",w.workEligibility||"Not verified"],
            ["Rate target",`$${w.payRateTarget}/hr floor $${w.payRateFloor}`],
            ["Direct deposit",w.directDepositOnFile?"On file":"Missing"],
            ["TD1 forms",w.tdOnFile?"On file":"Missing"],
            ["Vacation accrued",`$${w.vacBalance.toFixed(2)}`]].map(([l,v])=>
            <div key={l}><div style={{fontSize:11,fontWeight:700,color:C.text3,letterSpacing:".05em",textTransform:"uppercase",marginBottom:3}}>{l}</div>
              <div style={{color:C.text}}>{v}</div></div>)}
        </div>
        {w.tickets.length>0&&<div style={{marginTop:16}}>
          <Lbl>Tickets & certifications</Lbl>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{w.tickets.map(t=><Tag key={t} tone="brand" sm>{t}</Tag>)}</div>
        </div>}
        {w.documents.length>0&&<div style={{marginTop:16}}>
          <Lbl>Documents on file</Lbl>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {w.documents.map((d,i)=><div key={i} style={{padding:"10px 12px",background:C.bg,borderRadius:9,display:"flex",gap:10,alignItems:"center"}}>
              <I n="file" s={16} c={C.brand}/>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:C.text}}>{d.label}</div>
                <div style={{fontSize:11.5,color:C.text3,marginTop:2}}>Uploaded {d.uploaded}{d.expires?` · Expires ${d.expires}`:""}</div>
              </div>
              {d.expires&&new Date(d.expires)<Date.now()+90*864e5&&<Tag tone="warn" sm>Expiring</Tag>}
            </div>)}
          </div>
        </div>}
        {w.notes&&<div style={{marginTop:16}}>
          <Lbl>Recruiter notes</Lbl>
          <div style={{fontSize:13,color:C.text2,lineHeight:1.6,padding:12,background:C.bg,borderRadius:9,fontStyle:"italic"}}>{w.notes}</div>
        </div>}
      </Modal>;
    })()}
  </div>;
}

/* ─── Margins ─── */
export function AgencyMargins(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const active=A.activeAssignments();
  const margins=active.map(a=>({a,econ:A.assignmentMargin(a.id),client:A.staffingClient(a.client),worker:A.worker(a.worker)}));
  const totalWeeklyBill=margins.reduce((s,m)=>s+(m.a.billRate*40),0);
  const totalWeeklyPay=margins.reduce((s,m)=>s+(m.a.payRate*40),0);
  const totalWeeklyMargin=margins.reduce((s,m)=>s+((m.econ?.margin||0)*40),0);
  const avgMarkup=margins.length?margins.reduce((s,m)=>s+(m.econ?.markupPct||0),0)/margins.length:0;
  const belowFloor=margins.filter(m=>(m.econ?.markupPct||0)<A.STAFFING_AGENCY.markupFloor);

  return <div>
    <div style={{marginBottom:14}}>
      <div style={{fontSize:18,fontWeight:720,color:C.text}}>Margins & run rate</div>
      <div style={{fontSize:13,color:C.text3,marginTop:3}}>Real-time margin per active assignment (at 40 hrs/week).</div>
    </div>

    <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"repeat(4,1fr)",gap:12,marginBottom:16}}>
      {[["Weekly bill",`$${(totalWeeklyBill/1000).toFixed(1)}k`,C.brand],
        ["Weekly wage",`$${(totalWeeklyPay/1000).toFixed(1)}k`,C.text2],
        ["Weekly margin",`$${(totalWeeklyMargin/1000).toFixed(2)}k`,C.ok],
        ["Avg markup",`${avgMarkup.toFixed(1)}%`,avgMarkup>=A.STAFFING_AGENCY.markupTarget?C.ok:C.warn]].map(([l,v,t])=>
        <Card key={l} pad={mob?16:20} style={{borderRadius:14}}>
          <div style={{fontSize:mob?20:24,fontWeight:730,color:t,letterSpacing:"-.025em"}}>{v}</div>
          <div style={{fontSize:12,color:C.text3,marginTop:6}}>{l}</div>
        </Card>)}
    </div>

    {belowFloor.length>0&&<Banner tone="warn" icon="alert" title={`${belowFloor.length} assignments below markup floor`} style={{marginBottom:16}}>
      These are losing money after employer burden. Rebalance rates or end the assignment.
    </Banner>}

    <Card pad={0} style={{borderRadius:14,overflow:"hidden"}}>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:800}}>
        <thead><tr style={{borderBottom:`2px solid ${C.line}`,textAlign:"left"}}>
          {["Worker","Client","Pay","Burden","True cost","Bill","Margin/hr","Markup %"].map(h=>
            <th key={h} style={{padding:"12px 14px",fontSize:11.5,fontWeight:700,color:C.text3,letterSpacing:".05em",textTransform:"uppercase"}}>{h}</th>)}
        </tr></thead>
        <tbody>{margins.sort((a,b)=>(a.econ?.markupPct||0)-(b.econ?.markupPct||0)).map(m=>{
          const person=m.worker?(A.people||[]).find(p=>p.id===m.worker.personId):null;
          const emp=m.client?A.employers.find(e=>e.id===m.client.employerId):null;
          const below=(m.econ?.markupPct||0)<A.STAFFING_AGENCY.markupFloor;
          return <tr key={m.a.id} style={{borderBottom:`1px solid ${C.lineSoft}`,background:below?C.dangerBg:"transparent"}}>
            <td style={{padding:"11px 14px",fontSize:13,color:C.text,fontWeight:600}}>{person?.name||"—"}</td>
            <td style={{padding:"11px 14px",fontSize:12.5,color:C.text2}}>{emp?.name||"—"}</td>
            <td style={{padding:"11px 14px",fontSize:13,color:C.text}}>${m.a.payRate}</td>
            <td style={{padding:"11px 14px",fontSize:12.5,color:C.text3}}>${m.econ?.burden||0}</td>
            <td style={{padding:"11px 14px",fontSize:13,color:C.text}}>${m.econ?.trueCost||0}</td>
            <td style={{padding:"11px 14px",fontSize:13,color:C.text}}>${m.a.billRate}</td>
            <td style={{padding:"11px 14px",fontSize:13,color:m.econ?.margin>0?C.ok:C.danger,fontWeight:700}}>${m.econ?.margin||0}</td>
            <td style={{padding:"11px 14px",fontSize:13,color:below?C.danger:m.econ?.markupPct>=A.STAFFING_AGENCY.markupTarget?C.ok:C.warn,fontWeight:700}}>{m.econ?.markupPct||0}%</td>
          </tr>;})}
        </tbody>
      </table></div>
    </Card>
  </div>;
}

/* ─── Compliance dashboard ─── */
export function AgencyCompliance(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const workersMissingDocs=A.workers.filter(w=>w.status==="active"&&(!w.tdOnFile||!w.directDepositOnFile||!w.workEligibility));
  const workersExpiringWE=A.workers.filter(w=>w.weExpiry&&new Date(w.weExpiry)<Date.now()+90*864e5);
  const clientsMissingMsa=A.staffingClients.filter(c=>c.status==="active"&&!c.signedMsa);
  const overdueInvoices=A.staffingInvoices.filter(i=>i.status==="overdue");

  const items=[
    {ok:workersMissingDocs.length===0, title:"Worker files complete", body:workersMissingDocs.length===0?"All active workers have TD1s, direct deposit, and work eligibility on file.":`${workersMissingDocs.length} workers missing documents.`, count:workersMissingDocs.length},
    {ok:workersExpiringWE.length===0, title:"Work permits current", body:workersExpiringWE.length===0?"No permits expiring in the next 90 days.":`${workersExpiringWE.length} permits expiring within 90 days.`, count:workersExpiringWE.length},
    {ok:clientsMissingMsa.length===0, title:"MSAs signed for all active clients", body:clientsMissingMsa.length===0?"Every active client has a signed Master Services Agreement.":`${clientsMissingMsa.length} clients billing without signed MSA.`, count:clientsMissingMsa.length},
    {ok:overdueInvoices.length===0, title:"Aging under control", body:overdueInvoices.length===0?"No overdue invoices past terms.":`${overdueInvoices.length} invoices overdue. Chase or refer to collections.`, count:overdueInvoices.length},
    {ok:true, title:"Ontario THA license active", body:`License ${SEED_AGENCY_LICENSE} valid through 2027-01-01. $25,000 LOC on file.`, count:0},
    {ok:true, title:"WSIB coverage", body:"Registered in ON, AB, BC. Rate group 3 (Staffing).", count:0},
  ];

  return <div>
    <div style={{marginBottom:14}}>
      <div style={{fontSize:18,fontWeight:720,color:C.text}}>Compliance dashboard</div>
      <div style={{fontSize:13,color:C.text3,marginTop:3}}>Licensing, documentation, and audit-readiness across the desk.</div>
    </div>

    <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12}}>
      {items.map(item=><Card key={item.title} pad={mob?18:22} style={{borderRadius:14,borderLeft:`4px solid ${item.ok?C.ok:C.warn}`}}>
        <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
          <div style={{width:36,height:36,borderRadius:10,background:item.ok?C.okBg:C.warnBg,color:item.ok?C.ok:C.warn,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><I n={item.ok?"check":"alert"} s={18}/></div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:660,color:C.text}}>{item.title}</div>
            <div style={{fontSize:12.5,color:C.text2,marginTop:4,lineHeight:1.55}}>{item.body}</div>
          </div>
          {item.count>0&&<Tag tone={item.ok?"ok":"warn"} sm>{item.count}</Tag>}
        </div>
      </Card>)}
    </div>

    <Card pad={mob?18:22} style={{marginTop:16,borderRadius:14,background:C.bg}}>
      <Lbl>Statutory reminders</Lbl>
      <div style={{display:"flex",flexDirection:"column",gap:10,fontSize:13,color:C.text2}}>
        <div style={{padding:"10px 12px",background:"#fff",borderRadius:9,border:`1px solid ${C.line}`}}>
          <strong>ROEs</strong> must issue within 5 days of any assignment ending with a 7+ day break.
        </div>
        <div style={{padding:"10px 12px",background:"#fff",borderRadius:9,border:`1px solid ${C.line}`}}>
          <strong>T4s</strong> must issue by end of February each year for all workers paid in the prior year.
        </div>
        <div style={{padding:"10px 12px",background:"#fff",borderRadius:9,border:`1px solid ${C.line}`}}>
          <strong>Vacation pay</strong> accrues at 4% of gross (federally) — configured to accrue rather than pay-out per pay period.
        </div>
        <div style={{padding:"10px 12px",background:"#fff",borderRadius:9,border:`1px solid ${C.line}`}}>
          <strong>Pay equity certification</strong> required for Ontario assignments over 3 months. Client to certify equivalent-role rates.
        </div>
      </div>
    </Card>
  </div>;
}
