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
        <div style={{width:64,height:64,borderRadius:16,background:C.tint,color:C.brand,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px"}}><I n="users" s={30}/></div>
        <h2 style={{fontSize:22,fontWeight:730,color:C.text,margin:"0 0 10px",letterSpacing:"-.025em"}}>Join NorthHire Staffing</h2>
        <p style={{fontSize:14.5,color:C.text2,lineHeight:1.6,margin:"0 0 20px"}}>
          When you opt in, we can match you to short-term and long-term contract placements at Canadian workplaces.
          You stay on <strong>our payroll</strong> and get direct deposit every 2 weeks, T4 at year end, and vacation pay accrued at 4%.
          <br/><br/>
          <span style={{color:C.text3,fontSize:13}}>We never charge job seekers anything. Ever.</span>
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
    <div style={{marginBottom:20}}>
      <div style={{display:"flex",gap:8,marginBottom:6}}>
        <Tag tone="brand" icon="users" sm>NorthHire Staffing worker</Tag>
      </div>
      <H1 sub={`Since ${worker.onboarded} · Vacation accrued $${worker.vacBalance.toFixed(2)}`}>Welcome back, {A.user.name.split(" ")[0]}</H1>
    </div>

    <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"repeat(4,1fr)",gap:12,marginBottom:20}}>
      <Stat icon="activity" label="Active assignments" value={activeAsns.length} tone={C.brand}/>
      <Stat icon="clock" label="This week's hours" value={currentWeekTs.reduce((s,t)=>s+A.timesheetTotal(t),0)+"h"}/>
      <Stat icon="wallet" label="Vacation accrued" value={`$${worker.vacBalance.toFixed(0)}`} tone={C.ok}/>
      <Stat icon="check" label="Availability" value={worker.availability} tone={worker.availability==="available"?C.ok:C.warn}/>
    </div>

    <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1.4fr 1fr",gap:16}}>
      <Card pad={mob?18:22} style={{borderRadius:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <Lbl style={{margin:0}}>Your assignments</Lbl>
          <Btn kind="ghost" size="sm" onClick={()=>A.go("workerTimesheet")}>Submit timesheet</Btn>
        </div>
        {activeAsns.length===0
          ? <Empty icon="briefcase" title="No active assignments" body="You'll see contract placements here when we assign one to you."/>
          : <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {activeAsns.map(a=>{const client=A.staffingClient(a.client);
                const emp=client?A.employers.find(e=>e.id===client.employerId):null;
                return <div key={a.id} style={{padding:14,background:C.bg,borderRadius:11,border:`1px solid ${C.line}`}}>
                  <div style={{display:"flex",gap:12,alignItems:"center"}}>
                    <SmartLogo e={emp||{mark:"hex",a:C.brand,b:"#fff"}} size={40} radius={10}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14.5,fontWeight:660,color:C.text}}>{emp?.name||"—"}</div>
                      <div style={{fontSize:12.5,color:C.text3,marginTop:3}}>{a.site.split(" — ").pop()} · ${a.payRate}/hr</div>
                    </div>
                    <Tag tone="ok" sm>Active</Tag>
                  </div>
                  <div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${C.lineSoft}`,fontSize:12,color:C.text3}}>
                    Supervisor {a.supervisor} · {a.shiftPattern}
                  </div>
                </div>;})}
            </div>}
      </Card>

      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <Card pad={mob?18:20} style={{borderRadius:14}}>
          <Lbl>Documents on file</Lbl>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {[["TD1 forms",worker.tdOnFile],["Direct deposit",worker.directDepositOnFile],["Work eligibility",!!worker.workEligibility]].map(([l,ok])=>
              <div key={l} style={{display:"flex",gap:10,alignItems:"center",padding:"9px 11px",background:C.bg,borderRadius:9}}>
                <I n={ok?"check":"alert"} s={16} c={ok?C.ok:C.warn}/>
                <span style={{flex:1,fontSize:13,color:C.text}}>{l}</span>
                <Tag tone={ok?"ok":"warn"} sm>{ok?"On file":"Missing"}</Tag>
              </div>)}
          </div>
          <Btn kind="ghost" size="sm" full style={{marginTop:10}} onClick={()=>A.go("workerDocuments")}>Manage documents</Btn>
        </Card>

        <Card pad={mob?18:20} style={{borderRadius:14,background:C.tint,border:`1px solid ${C.line2}`}}>
          <Lbl>Available for work?</Lbl>
          <div style={{fontSize:12.5,color:C.text2,marginBottom:12,lineHeight:1.55}}>
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
  const regHrs=Math.max(0,total-otHours);
  const gross=asn?regHrs*asn.payRate+otHours*asn.payRate*1.5:0;
  const locked=existing&&(existing.status==="submitted"||existing.status==="approved"||existing.status==="paid");

  const save=()=>{const r=A.upsertTimesheetDraft(asnId,worker.id,weekStart,hours,otHours,notes);
    if(r.ok)alert("Draft saved.");};
  const submit=()=>{save(); const t=A.timesheets.find(t=>t.assignment===asnId&&t.weekStart===weekStart);
    if(t){const r=A.submitTimesheet(t.id); if(r.ok)alert("Timesheet submitted for supervisor approval.");}};

  return <Page narrow>
    <H1 sub="Enter your hours. Submit weekly by Monday for the previous week.">Weekly timesheet</H1>

    {activeAsns.length===0?<Empty icon="clock" title="No active assignments" body="You'll be able to submit a timesheet once you're placed on an assignment."/>
    :<Card pad={mob?18:26} style={{borderRadius:16}}>
      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12,marginBottom:18}}>
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
      <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"repeat(7,1fr)",gap:8,marginBottom:14}}>
        {[["mon","Mon"],["tue","Tue"],["wed","Wed"],["thu","Thu"],["fri","Fri"],["sat","Sat"],["sun","Sun"]].map(([k,l])=>
          <Field key={k} label={l}>
            <Input type="number" step="0.5" min="0" max="16" value={hours[k]||0}
              disabled={locked}
              onChange={e=>setHours(h=>({...h,[k]:Number(e.target.value)||0}))}/>
          </Field>)}
      </div>

      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12,marginBottom:14}}>
        <Field label="Overtime hours (of total)" hint="Hours beyond 44/wk in Ontario. Paid at 1.5×.">
          <Input type="number" step="0.5" min="0" max={total} value={otHours} disabled={locked}
            onChange={e=>setOtHours(Number(e.target.value)||0)}/>
        </Field>
        <Field label="Notes for supervisor">
          <Input value={notes} disabled={locked} onChange={e=>setNotes(e.target.value)} placeholder="e.g. Left early Wed for medical"/>
        </Field>
      </div>

      <div style={{padding:14,background:C.tint,borderRadius:11,marginBottom:14,border:`1px solid ${C.line2}`}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:6}}>
          <span style={{color:C.text2,fontWeight:600}}>Total hours</span>
          <span style={{color:C.text,fontWeight:700}}>{total.toFixed(1)}h {otHours>0?`(${otHours}h OT)`:""}</span>
        </div>
        {asn&&<div style={{display:"flex",justifyContent:"space-between",fontSize:14}}>
          <span style={{color:C.text2,fontWeight:600}}>Estimated gross pay</span>
          <span style={{color:C.brand,fontWeight:730}}>${gross.toFixed(2)}</span>
        </div>}
      </div>

      {!locked&&<div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
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
    :<div style={{display:"flex",flexDirection:"column",gap:10}}>
      {myLines.map(({run,line})=><Card key={run.id} pad={mob?16:20} style={{borderRadius:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <div>
            <div style={{fontSize:14,fontWeight:660,color:C.text}}>Pay period {run.periodStart} → {run.periodEnd}</div>
            <div style={{fontSize:12,color:C.text3,marginTop:3}}>Deposit date {run.runDate} · {line.hours}h {line.otHrs>0?`(${line.otHrs} OT)`:""}</div>
          </div>
          <div style={{display:"flex",gap:16,alignItems:"center"}}>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:11,color:C.text3,fontWeight:600,textTransform:"uppercase"}}>Net deposited</div>
              <div style={{fontSize:18,fontWeight:730,color:C.brand}}>${line.net.toFixed(2)}</div>
            </div>
            <Tag tone={run.status==="paid"?"ok":"warn"} sm>{run.status}</Tag>
          </div>
        </div>
        <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${C.lineSoft}`,display:"grid",gridTemplateColumns:mob?"1fr 1fr":"repeat(4,1fr)",gap:10,fontSize:12}}>
          {[["Gross",`$${line.gross.toFixed(2)}`],["CPP",`-$${(line.gross*0.0595).toFixed(2)}`],["EI",`-$${(line.gross*0.0221).toFixed(2)}`],["Fed+Prov tax",`-$${(line.gross*0.145).toFixed(2)}`]].map(([l,v])=>
            <div key={l}><div style={{color:C.text3}}>{l}</div><div style={{color:C.text,fontWeight:600,marginTop:2}}>{v}</div></div>)}
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
    <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12,marginBottom:20}}>
      {[["TD1 Federal",worker.tdOnFile],
        [`TD1 ${worker.province}`,worker.tdOnFile],
        ["Direct deposit",worker.directDepositOnFile],
        ["Work eligibility",!!worker.workEligibility]].map(([l,ok])=>
        <Card key={l} pad={mob?16:18} style={{borderRadius:12,borderLeft:`4px solid ${ok?C.ok:C.warn}`}}>
          <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:6}}>
            <I n={ok?"check":"alert"} s={16} c={ok?C.ok:C.warn}/>
            <span style={{fontSize:14,fontWeight:640,color:C.text}}>{l}</span>
          </div>
          <div style={{fontSize:12,color:C.text3}}>{ok?"On file":"Please upload — required for placement"}</div>
        </Card>)}
    </div>

    <Card pad={mob?18:24} style={{borderRadius:14}}>
      <Lbl>All documents</Lbl>
      {worker.documents.length===0?<div style={{fontSize:13,color:C.text3,padding:14,textAlign:"center"}}>No documents uploaded yet.</div>
      :<div style={{display:"flex",flexDirection:"column",gap:8}}>
        {worker.documents.map((d,i)=><div key={i} style={{padding:"11px 13px",background:C.bg,borderRadius:9,display:"flex",gap:11,alignItems:"center"}}>
          <I n="file" s={17} c={C.brand}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:600,color:C.text}}>{d.label}</div>
            <div style={{fontSize:11.5,color:C.text3,marginTop:2}}>Uploaded {d.uploaded}{d.expires?` · Expires ${d.expires}`:""}</div>
          </div>
          <Btn kind="ghost" size="xs">View</Btn>
        </div>)}
      </div>}
      <div style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${C.lineSoft}`}}>
        <Btn kind="primary" size="sm" icon="plus" onClick={()=>alert("File upload coming soon — in production, secure signed upload URLs to encrypted storage.")}>Upload a document</Btn>
      </div>
    </Card>

    <Card pad={mob?18:22} style={{marginTop:16,borderRadius:14}}>
      <Lbl>T4s</Lbl>
      <div style={{fontSize:13,color:C.text2,lineHeight:1.6}}>
        Your T4s are issued by February 28 each year. Sign in after that date to download last year's T4.
      </div>
    </Card>
  </Page>;
}
