import { useState, useEffect } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn, Card, Tag, Field, Input, Sel, Banner, Empty, H1, Lbl, Stat, SmartLogo, Page } from "../../design/primitives.jsx";
import { _weekStart } from "../../helpers/utils.js";

/* ─── Worker dashboard ─── */
export function WorkerDashboard(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  if(!A.user){A.go("login"); return null;}
  const worker=A.workerByPersonId(A.user.id);
  if(!worker){
    return <Page>
      <Card pad={mob?24:34} style={{textAlign:"center",borderRadius:18,maxWidth:520,margin:"0 auto"}}>
        <div className="w-16 h-16 rounded-2xl bg-tint text-brand flex items-center justify-center mx-auto mb-5"><I n="users" s={30}/></div>
        <h2 className="text-2xl font-bold text-text mb-2.5 tracking-tight">Join NorthHire Staffing</h2>
        <p className="text-sm text-text-2 leading-relaxed mb-5">
          When you opt in, we can match you to short-term and long-term contract placements at Canadian workplaces.
          You stay on <strong>our payroll</strong> and get direct deposit every 2 weeks, T4 at year end, and vacation pay accrued at 4%.
          <br/><br/>
          <span className="text-text-3 text-sm">We never charge job seekers anything. Ever.</span>
        </p>
        <Btn kind="primary" onClick={()=>{const r=A.optInAsWorker(A.user); if(r.ok){A.go("workerDashboard");}}}>Opt in as a worker</Btn>
      </Card>
    </Page>;
  }
  const myAssignments=A.workerAssignments(worker.id);
  const activeAsns=myAssignments.filter(a=>a.status==="active");
  const currentWeekTs=A.workerTimesheets(worker.id).filter(t=>t.weekStart===_weekStart(0));
  const submittedTs=A.workerTimesheets(worker.id).filter(t=>t.status==="submitted"||t.status==="draft");

  return <Page>
    <div className="mb-5">
      <div className="flex gap-2 mb-1.5">
        <Tag tone="brand" icon="users" sm>NorthHire Staffing worker</Tag>
      </div>
      <H1 sub={`Since ${worker.onboarded} · Vacation accrued $${worker.vacBalance.toFixed(2)}`}>Welcome back, {A.user.name.split(" ")[0]}</H1>
    </div>

    <div className={`grid gap-3 mb-5 ${mob?"grid-cols-2":"grid-cols-4"}`}>
      <Stat icon="activity" label="Active assignments" value={activeAsns.length} tone={C.brand}/>
      <Stat icon="clock" label="This week's hours" value={currentWeekTs.reduce((s,t)=>s+A.timesheetTotal(t),0)+"h"}/>
      <Stat icon="wallet" label="Vacation accrued" value={`$${worker.vacBalance.toFixed(0)}`} tone={C.ok}/>
      <Stat icon="check" label="Availability" value={worker.availability} tone={worker.availability==="available"?C.ok:C.warn}/>
    </div>

    <div className={`grid gap-4 ${mob?"grid-cols-1":"grid-cols-[1.4fr_1fr]"}`}>
      <Card pad={mob?18:22} style={{borderRadius:14}}>
        <div className="flex justify-between items-center mb-3.5">
          <Lbl style={{margin:0}}>Your assignments</Lbl>
          <Btn kind="ghost" size="sm" onClick={()=>A.go("workerTimesheet")}>Submit timesheet</Btn>
        </div>
        {activeAsns.length===0
          ? <Empty icon="briefcase" title="No active assignments" body="You'll see contract placements here when we assign one to you."/>
          : <div className="flex flex-col gap-2.5">
              {activeAsns.map(a=>{const client=A.staffingClient(a.client);
                const emp=client?A.employers.find(e=>e.id===client.employerId):null;
                return <div key={a.id} className="p-3.5 bg-bg rounded-xl border border-line">
                  <div className="flex gap-3 items-center">
                    <SmartLogo e={emp||{mark:"hex",a:C.brand,b:"#fff"}} size={40} radius={10}/>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-text">{emp?.name||"—"}</div>
                      <div className="text-xs text-text-3 mt-1">{a.site.split(" — ").pop()} · ${a.payRate}/hr</div>
                    </div>
                    <Tag tone="ok" sm>Active</Tag>
                  </div>
                  <div className="mt-2.5 pt-2.5 border-t border-line-soft text-xs text-text-3">
                    Supervisor {a.supervisor} · {a.shiftPattern}
                  </div>
                </div>;})}
            </div>}
      </Card>

      <div className="flex flex-col gap-4">
        <Card pad={mob?18:20} style={{borderRadius:14}}>
          <Lbl>Documents on file</Lbl>
          <div className="flex flex-col gap-2">
            {[["TD1 forms",worker.tdOnFile],["Direct deposit",worker.directDepositOnFile],["Work eligibility",!!worker.workEligibility]].map(([l,ok])=>
              <div key={l} className="flex gap-2.5 items-center py-2.5 px-3 bg-bg rounded-lg">
                <I n={ok?"check":"alert"} s={16} c={ok?C.ok:C.warn}/>
                <span className="flex-1 text-sm text-text">{l}</span>
                <Tag tone={ok?"ok":"warn"} sm>{ok?"On file":"Missing"}</Tag>
              </div>)}
          </div>
          <Btn kind="ghost" size="sm" full style={{marginTop:10}} onClick={()=>A.go("workerDocuments")}>Manage documents</Btn>
        </Card>

        <Card pad={mob?18:20} style={{borderRadius:14,background:C.tint,border:`1px solid ${C.line2}`}}>
          <Lbl>Available for work?</Lbl>
          <div className="text-xs text-text-2 mb-3 leading-normal">
            Set your availability so recruiters know when to reach out.
          </div>
          <Sel value={worker.availability} onChange={e=>A.setWorkerAvailability(worker.id,e.target.value)}>
            <option value="available">Available now</option>
            <option value="on-assignment">On assignment</option>
            <option value="unavailable">Not currently looking</option>
          </Sel>
        </Card>
      </div>
    </div>
  </Page>;
}

/* ─── Worker: submit weekly timesheet ─── */
export function WorkerTimesheet(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  if(!A.user){A.go("login"); return null;}
  const worker=A.workerByPersonId(A.user.id);
  if(!worker){A.go("workerDashboard"); return null;}
  const activeAsns=A.workerAssignments(worker.id).filter(a=>a.status==="active");
  const [asnId,setAsnId]=useState(activeAsns[0]?.id||"");
  const [weekStart,setWeekStart]=useState(_weekStart(0));
  const existing=A.timesheets.find(t=>t.assignment===asnId&&t.weekStart===weekStart);
  const [hours,setHours]=useState(existing?.hours||{mon:0,tue:0,wed:0,thu:0,fri:0,sat:0,sun:0});
  const [otHours,setOtHours]=useState(existing?.otHours||0);
  const [notes,setNotes]=useState(existing?.notes||"");
  useEffect(()=>{const e=A.timesheets.find(t=>t.assignment===asnId&&t.weekStart===weekStart);
    if(e){setHours(e.hours||{mon:0,tue:0,wed:0,thu:0,fri:0,sat:0,sun:0}); setOtHours(e.otHours||0); setNotes(e.notes||"");}
    else{setHours({mon:0,tue:0,wed:0,thu:0,fri:0,sat:0,sun:0}); setOtHours(0); setNotes("");}
  },[asnId,weekStart]);

  const total=Object.values(hours).reduce((s,h)=>s+(Number(h)||0),0);
  const asn=A.assignment(asnId);
  /* otHours is clamped on entry, but if daily hours are edited afterward (lowering total) a
     stale otHours could exceed the new total - re-clamp at the point of use so gross pay can
     never be computed from more overtime hours than were actually worked. */
  const otHrs=Math.min(otHours,total);
  const regHrs=Math.max(0,total-otHrs);
  const gross=asn?regHrs*asn.payRate+otHrs*asn.payRate*1.5:0;
  const locked=existing&&(existing.status==="submitted"||existing.status==="approved"||existing.status==="paid");

  const save=()=>{const r=A.upsertTimesheetDraft(asnId,worker.id,weekStart,hours,otHrs,notes);
    if(r.ok)A.toast("Draft saved.");};
  const submit=()=>{A.upsertTimesheetDraft(asnId,worker.id,weekStart,hours,otHrs,notes);
    const t=A.timesheets.find(t=>t.assignment===asnId&&t.weekStart===weekStart);
    if(t){const r=A.submitTimesheet(t.id); if(r.ok)A.toast("Timesheet submitted for supervisor approval.","ok");}};

  return <Page narrow>
    <H1 sub="Enter your hours. Submit weekly by Monday for the previous week.">Weekly timesheet</H1>

    {activeAsns.length===0?<Empty icon="clock" title="No active assignments" body="You'll be able to submit a timesheet once you're placed on an assignment."/>
    :<Card pad={mob?18:26} style={{borderRadius:16}}>
      <div className={`grid gap-3 mb-5 ${mob?"grid-cols-1":"grid-cols-2"}`}>
        <Field label="Assignment">
          <Sel value={asnId} onChange={e=>setAsnId(e.target.value)}>
            {activeAsns.map(a=>{const client=A.staffingClient(a.client);
              const emp=client?A.employers.find(e=>e.id===client.employerId):null;
              return <option key={a.id} value={a.id}>{emp?.name} — {a.site.split(" — ").pop()}</option>;})}
          </Sel>
        </Field>
        <Field label="Week starting (Monday)">
          <Sel value={weekStart} onChange={e=>setWeekStart(e.target.value)}>
            {[0,1,2,3].map(n=><option key={n} value={_weekStart(n)}>{_weekStart(n)}</option>)}
          </Sel>
        </Field>
      </div>

      {locked&&<Banner tone="brand" icon="lock" title="This timesheet is locked" style={{marginBottom:14}}>
        Status: <strong>{existing.status}</strong>. Contact your recruiter to make changes.
      </Banner>}

      <Lbl>Hours by day</Lbl>
      <div className={`grid gap-2 mb-3.5 ${mob?"grid-cols-2":"grid-cols-7"}`}>
        {[["mon","Mon"],["tue","Tue"],["wed","Wed"],["thu","Thu"],["fri","Fri"],["sat","Sat"],["sun","Sun"]].map(([k,l])=>
          <Field key={k} label={l}>
            <Input type="number" step="0.5" min="0" max="16" value={hours[k]||0}
              disabled={locked}
              onChange={e=>{const v=Math.min(16,Math.max(0,Number(e.target.value)||0)); setHours(h=>({...h,[k]:v}));}}/>
          </Field>)}
      </div>

      <div className={`grid gap-3 mb-3.5 ${mob?"grid-cols-1":"grid-cols-2"}`}>
        <Field label="Overtime hours (of total)" hint="Hours beyond 44/wk in Ontario. Paid at 1.5×.">
          <Input type="number" step="0.5" min="0" max={total} value={otHours} disabled={locked}
            onChange={e=>setOtHours(Math.min(total,Math.max(0,Number(e.target.value)||0)))}/>
        </Field>
        <Field label="Notes for supervisor">
          <Input value={notes} disabled={locked} onChange={e=>setNotes(e.target.value)} placeholder="e.g. Left early Wed for medical"/>
        </Field>
      </div>

      <div className="p-3.5 bg-tint rounded-xl mb-3.5 border border-line-2">
        <div className="flex justify-between text-sm mb-1.5">
          <span className="text-text-2 font-semibold">Total hours</span>
          <span className="text-text font-bold">{total.toFixed(1)}h {otHours>0?`(${otHours}h OT)`:""}</span>
        </div>
        {asn&&<div className="flex justify-between text-sm">
          <span className="text-text-2 font-semibold">Estimated gross pay</span>
          <span className="text-brand font-bold">${gross.toFixed(2)}</span>
        </div>}
      </div>

      {!locked&&<div className="flex gap-2.5 justify-end">
        <Btn kind="ghost" onClick={save} disabled={total===0}>Save draft</Btn>
        <Btn kind="primary" icon="check" onClick={submit} disabled={total===0}>Submit for approval</Btn>
      </div>}
    </Card>}
  </Page>;
}

/* ─── Worker: Pay stubs history ─── */
export function WorkerPayStubs(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  if(!A.user){A.go("login"); return null;}
  const worker=A.workerByPersonId(A.user.id);
  if(!worker){A.go("workerDashboard"); return null;}
  const myLines=[];
  A.staffingPayruns.forEach(pr=>{const line=pr.lines.find(l=>l.worker===worker.id);
    if(line)myLines.push({run:pr,line});});

  return <Page narrow>
    <H1 sub="Every biweekly pay run since you joined.">Pay stubs</H1>
    {myLines.length===0?<Empty icon="wallet" title="No pay stubs yet" body="Your first stub will appear after your first pay period."/>
    :<div className="flex flex-col gap-2.5">
      {myLines.map(({run,line})=><Card key={run.id} pad={mob?16:20} style={{borderRadius:14}}>
        <div className="flex justify-between items-center flex-wrap gap-2.5">
          <div>
            <div className="text-sm font-bold text-text">Pay period {run.periodStart} → {run.periodEnd}</div>
            <div className="text-xs text-text-3 mt-1">Deposit date {run.runDate} · {line.hours}h {line.otHrs>0?`(${line.otHrs} OT)`:""}</div>
          </div>
          <div className="flex gap-4 items-center">
            <div className="text-right">
              <div className="text-xs text-text-3 font-semibold uppercase">Net deposited</div>
              <div className="text-lg font-bold text-brand">${line.net.toFixed(2)}</div>
            </div>
            <Tag tone={run.status==="paid"?"ok":"warn"} sm>{run.status}</Tag>
          </div>
        </div>
        <div className={`mt-3 pt-3 border-t border-line-soft grid gap-2.5 text-xs ${mob?"grid-cols-2":"grid-cols-4"}`}>
          {[["Gross",`$${line.gross.toFixed(2)}`],["CPP",`-$${(line.gross*0.0595).toFixed(2)}`],["EI",`-$${(line.gross*0.0221).toFixed(2)}`],["Fed+Prov tax",`-$${(line.gross*0.145).toFixed(2)}`]].map(([l,v])=>
            <div key={l}><div className="text-text-3">{l}</div><div className="text-text font-semibold mt-0.5">{v}</div></div>)}
        </div>
      </Card>)}
    </div>}
  </Page>;
}

/* ─── Worker: Documents ─── */
export function WorkerDocuments(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  if(!A.user){A.go("login"); return null;}
  const worker=A.workerByPersonId(A.user.id);
  if(!worker){A.go("workerDashboard"); return null;}

  return <Page narrow>
    <H1 sub="Everything on your worker file.">My documents</H1>
    <div className={`grid gap-3 mb-5 ${mob?"grid-cols-1":"grid-cols-2"}`}>
      {[["TD1 Federal",worker.tdOnFile],
        [`TD1 ${worker.province}`,worker.tdOnFile],
        ["Direct deposit",worker.directDepositOnFile],
        ["Work eligibility",!!worker.workEligibility]].map(([l,ok])=>
        <Card key={l} pad={mob?16:18} style={{borderRadius:12,borderLeft:`4px solid ${ok?C.ok:C.warn}`}}>
          <div className="flex gap-2.5 items-center mb-1.5">
            <I n={ok?"check":"alert"} s={16} c={ok?C.ok:C.warn}/>
            <span className="text-sm font-semibold text-text">{l}</span>
          </div>
          <div className="text-xs text-text-3">{ok?"On file":"Please upload — required for placement"}</div>
        </Card>)}
    </div>

    <Card pad={mob?18:24} style={{borderRadius:14}}>
      <Lbl>All documents</Lbl>
      {worker.documents.length===0?<div className="text-sm text-text-3 p-3.5 text-center">No documents uploaded yet.</div>
      :<div className="flex flex-col gap-2">
        {worker.documents.map((d,i)=><div key={i} className="py-3 px-3.5 bg-bg rounded-lg flex gap-3 items-center">
          <I n="file" s={17} c={C.brand}/>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-text">{d.label}</div>
            <div className="text-xs text-text-3 mt-0.5">Uploaded {d.uploaded}{d.expires?` · Expires ${d.expires}`:""}</div>
          </div>
          <Btn kind="ghost" size="xs">View</Btn>
        </div>)}
      </div>}
      <div className="mt-3.5 pt-3.5 border-t border-line-soft">
        <Btn kind="primary" size="sm" icon="plus" onClick={()=>A.toast("File upload isn't available in this preview build.")}>Upload a document</Btn>
      </div>
    </Card>

    <Card pad={mob?18:22} style={{marginTop:16,borderRadius:14}}>
      <Lbl>T4s</Lbl>
      <div className="text-sm text-text-2 leading-relaxed">
        Your T4s are issued by February 28 each year. Sign in after that date to download last year's T4.
      </div>
    </Card>
  </Page>;
}
