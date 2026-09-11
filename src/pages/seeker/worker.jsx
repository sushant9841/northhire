import { useState, useEffect } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn, Card, Tag, Field, Input, Sel, Banner, Empty, H1, Lbl, Stat, SmartLogo, Page, HERO_QUIET } from "../../design/primitives.jsx";
import { _weekStart } from "../../helpers/utils.js";
import { useTranslation } from "../../i18n/i18n.jsx";

const AVAILABILITY_KEY={available:"seeker.worker.availabilityAvailable","on-assignment":"seeker.worker.availabilityOnAssignment",unavailable:"seeker.worker.availabilityUnavailable"};
const PAYRUN_STATUS_KEY={paid:"seeker.worker.payStatusPaid",pending:"seeker.worker.payStatusPending"};

/* ─── Worker dashboard ─── */
export function WorkerDashboard(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t}=useTranslation();
  if(!A.user){A.go("login"); return null;}
  const worker=A.workerByPersonId(A.user.id);
  if(!worker){
    return <Page>
      <Card pad={mob?24:34} style={{textAlign:"center",borderRadius:18,maxWidth:520,margin:"0 auto"}}>
        <div className="w-16 h-16 rounded-2xl bg-tint text-brand flex items-center justify-center mx-auto mb-5"><I n="users" s={30}/></div>
        <h2 className={`${HERO_QUIET} text-2xl mb-2.5`}>{t("seeker.worker.joinTitle")}</h2>
        <p className="text-sm text-text-2 leading-relaxed mb-5">
          {t("seeker.worker.joinBody",{ourPayroll:t("seeker.worker.ourPayroll")})}
          <br/><br/>
          <span className="text-text-3 text-sm">{t("seeker.worker.neverCharge")}</span>
        </p>
        <Btn kind="primary" onClick={async()=>{const r=await A.optInAsWorker(A.user); if(r.ok){A.go("workerDashboard");}}}>{t("seeker.worker.optInBtn")}</Btn>
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
        <Tag tone="brand" icon="users" sm>{t("seeker.worker.staffingWorkerTag")}</Tag>
      </div>
      <H1 sub={t("seeker.worker.sinceOnboarded",{date:worker.onboarded,amount:worker.vacBalance.toFixed(2)})}>{t("seeker.worker.welcomeBack",{name:A.user.name.split(" ")[0]})}</H1>
    </div>

    <div className={`grid gap-3 mb-5 ${mob?"grid-cols-2":"grid-cols-4"}`}>
      <Stat icon="activity" label={t("seeker.worker.statActiveAssignments")} value={activeAsns.length} tone={C.brand}/>
      <Stat icon="clock" label={t("seeker.worker.statThisWeeksHours")} value={currentWeekTs.reduce((s,ts)=>s+A.timesheetTotal(ts),0)+"h"}/>
      <Stat icon="wallet" label={t("seeker.worker.statVacationAccrued")} value={`$${worker.vacBalance.toFixed(0)}`} tone={C.ok}/>
      <Stat icon="check" label={t("seeker.worker.statAvailability")} value={t(AVAILABILITY_KEY[worker.availability]||worker.availability)} tone={worker.availability==="available"?C.ok:C.warn}/>
    </div>

    <div className={`grid gap-4 ${mob?"grid-cols-1":"grid-cols-[1.4fr_1fr]"}`}>
      <Card pad={mob?18:22} style={{borderRadius:14}}>
        <div className="flex justify-between items-center mb-3.5">
          <Lbl style={{margin:0}}>{t("seeker.worker.yourAssignmentsLabel")}</Lbl>
          <Btn kind="ghost" size="sm" onClick={()=>A.go("workerTimesheet")}>{t("seeker.worker.submitTimesheetBtn")}</Btn>
        </div>
        {activeAsns.length===0
          ? <Empty icon="briefcase" title={t("seeker.worker.noActiveAssignmentsTitle")} body={t("seeker.worker.noActiveAssignmentsBody")}/>
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
                    <Tag tone="ok" sm>{t("seeker.worker.activeTag")}</Tag>
                  </div>
                  <div className="mt-2.5 pt-2.5 border-t border-line-soft text-xs text-text-3">
                    {t("seeker.worker.supervisorLine",{supervisor:a.supervisor,pattern:a.shiftPattern})}
                  </div>
                </div>;})}
            </div>}
      </Card>

      <div className="flex flex-col gap-4">
        <Card pad={mob?18:20} style={{borderRadius:14}}>
          <Lbl>{t("seeker.worker.documentsOnFileLabel")}</Lbl>
          <div className="flex flex-col gap-2">
            {[[t("seeker.worker.docTd1"),worker.tdOnFile],[t("seeker.worker.docDirectDeposit"),worker.directDepositOnFile],[t("seeker.worker.docWorkEligibility"),!!worker.workEligibility]].map(([l,ok])=>
              <div key={l} className="flex gap-2.5 items-center py-2.5 px-3 bg-bg rounded-lg">
                <I n={ok?"check":"alert"} s={16} c={ok?C.ok:C.warn}/>
                <span className="flex-1 text-sm text-text">{l}</span>
                <Tag tone={ok?"ok":"warn"} sm>{ok?t("seeker.worker.onFile"):t("seeker.worker.missing")}</Tag>
              </div>)}
          </div>
          <Btn kind="ghost" size="sm" full style={{marginTop:10}} onClick={()=>A.go("workerDocuments")}>{t("seeker.worker.manageDocumentsBtn")}</Btn>
        </Card>

        <Card pad={mob?18:20} style={{borderRadius:14,background:C.tint,border:`1px solid ${C.line2}`}}>
          <Lbl>{t("seeker.worker.availableForWorkLabel")}</Lbl>
          <div className="text-xs text-text-2 mb-3 leading-normal">
            {t("seeker.worker.availableForWorkBody")}
          </div>
          <Sel value={worker.availability} onChange={e=>A.setWorkerAvailability(worker.id,e.target.value)}>
            <option value="available">{t("seeker.worker.availableNowOption")}</option>
            <option value="on-assignment">{t("seeker.worker.onAssignmentOption")}</option>
            <option value="unavailable">{t("seeker.worker.notLookingOption")}</option>
          </Sel>
        </Card>
      </div>
    </div>
  </Page>;
}

/* ─── Worker: submit weekly timesheet ─── */
export function WorkerTimesheet(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t}=useTranslation();
  /* All hooks before the conditional redirects - a hook after an early return is a
     Rules-of-Hooks violation that crashes with "Rendered more hooks than during the previous
     render" the moment the guard flips (guest signs in, or a non-worker becomes a worker). */
  const worker=A.user?A.workerByPersonId(A.user.id):null;
  const activeAsns=worker?A.workerAssignments(worker.id).filter(a=>a.status==="active"):[];
  const [asnId,setAsnId]=useState(activeAsns[0]?.id||"");
  const [weekStart,setWeekStart]=useState(_weekStart(0));
  const existing=A.timesheets.find(t=>t.assignment===asnId&&t.weekStart===weekStart);
  const [hours,setHours]=useState(existing?.hours||{mon:0,tue:0,wed:0,thu:0,fri:0,sat:0,sun:0});
  const [otHours,setOtHours]=useState(existing?.otHours||0);
  const [notes,setNotes]=useState(existing?.notes||"");
  if(!A.user){A.go("login"); return null;}
  if(!worker){A.go("workerDashboard"); return null;}
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

  const save=async()=>{const r=await A.upsertTimesheetDraft(asnId,worker.id,weekStart,hours,otHrs,notes);
    if(r.ok)A.toast(t("seeker.worker.draftSavedToast"));};
  const submit=async()=>{const r=await A.upsertTimesheetDraft(asnId,worker.id,weekStart,hours,otHrs,notes);
    if(r.ok&&r.timesheet){const r2=await A.submitTimesheet(r.timesheet.id); if(r2.ok)A.toast(t("seeker.worker.timesheetSubmittedToast"),"ok");}};

  return <Page narrow>
    <H1 sub={t("seeker.worker.weeklyTimesheetSub")}>{t("seeker.worker.weeklyTimesheetTitle")}</H1>

    {activeAsns.length===0?<Empty icon="clock" title={t("seeker.worker.noActiveAssignmentsTitle")} body={t("seeker.worker.noActiveAssignmentsTsBody")}/>
    :<Card pad={mob?18:26} style={{borderRadius:16}}>
      <div className={`grid gap-3 mb-5 ${mob?"grid-cols-1":"grid-cols-2"}`}>
        <Field label={t("seeker.worker.assignmentLabel")}>
          <Sel value={asnId} onChange={e=>setAsnId(e.target.value)}>
            {activeAsns.map(a=>{const client=A.staffingClient(a.client);
              const emp=client?A.employers.find(e=>e.id===client.employerId):null;
              return <option key={a.id} value={a.id}>{emp?.name} — {a.site.split(" — ").pop()}</option>;})}
          </Sel>
        </Field>
        <Field label={t("seeker.worker.weekStartingLabel")}>
          <Sel value={weekStart} onChange={e=>setWeekStart(e.target.value)}>
            {[0,1,2,3].map(n=><option key={n} value={_weekStart(n)}>{_weekStart(n)}</option>)}
          </Sel>
        </Field>
      </div>

      {locked&&<Banner tone="brand" icon="lock" title={t("seeker.worker.timesheetLockedTitle")} style={{marginBottom:14}}>
        {t("seeker.worker.timesheetLockedBody",{status:existing.status})}
      </Banner>}

      <Lbl>{t("seeker.worker.hoursByDayLabel")}</Lbl>
      <div className={`grid gap-2 mb-3.5 ${mob?"grid-cols-2":"grid-cols-7"}`}>
        {[["mon","dayMon"],["tue","dayTue"],["wed","dayWed"],["thu","dayThu"],["fri","dayFri"],["sat","daySat"],["sun","daySun"]].map(([k,lk])=>
          <Field key={k} label={t(`seeker.worker.${lk}`)}>
            <Input type="number" step="0.5" min="0" max="16" value={hours[k]||0}
              disabled={locked}
              onChange={e=>{const v=Math.min(16,Math.max(0,Number(e.target.value)||0)); setHours(h=>({...h,[k]:v}));}}/>
          </Field>)}
      </div>

      <div className={`grid gap-3 mb-3.5 ${mob?"grid-cols-1":"grid-cols-2"}`}>
        <Field label={t("seeker.worker.overtimeHoursLabel")} hint={t("seeker.worker.overtimeHoursHint")}>
          <Input type="number" step="0.5" min="0" max={total} value={otHours} disabled={locked}
            onChange={e=>setOtHours(Math.min(total,Math.max(0,Number(e.target.value)||0)))}/>
        </Field>
        <Field label={t("seeker.worker.notesForSupervisorLabel")}>
          <Input value={notes} disabled={locked} onChange={e=>setNotes(e.target.value)} placeholder={t("seeker.worker.notesPlaceholder")}/>
        </Field>
      </div>

      <div className="p-3.5 bg-tint rounded-xl mb-3.5 border border-line-2">
        <div className="flex justify-between text-sm mb-1.5">
          <span className="text-text-2 font-semibold">{t("seeker.worker.totalHoursLabel")}</span>
          <span className="text-text font-bold">{total.toFixed(1)}h {otHours>0?t("seeker.worker.otSuffix",{hours:otHours}):""}</span>
        </div>
        {asn&&<div className="flex justify-between text-sm">
          <span className="text-text-2 font-semibold">{t("seeker.worker.estimatedGrossPayLabel")}</span>
          <span className="text-brand font-bold">${gross.toFixed(2)}</span>
        </div>}
      </div>

      {!locked&&<div className="flex gap-2.5 justify-end">
        <Btn kind="ghost" onClick={save} disabled={total===0}>{t("seeker.worker.saveDraftBtn")}</Btn>
        <Btn kind="primary" icon="check" onClick={submit} disabled={total===0}>{t("seeker.worker.submitForApprovalBtn")}</Btn>
      </div>}
    </Card>}
  </Page>;
}

/* ─── Worker: Pay stubs history ─── */
export function WorkerPayStubs(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t}=useTranslation();
  if(!A.user){A.go("login"); return null;}
  const worker=A.workerByPersonId(A.user.id);
  if(!worker){A.go("workerDashboard"); return null;}
  const myLines=[];
  A.staffingPayruns.forEach(pr=>{const line=pr.lines.find(l=>l.worker===worker.id);
    if(line)myLines.push({run:pr,line});});

  return <Page narrow>
    <H1 sub={t("seeker.worker.payStubsSub")}>{t("seeker.worker.payStubsTitle")}</H1>
    {myLines.length===0?<Empty icon="wallet" title={t("seeker.worker.noPayStubsTitle")} body={t("seeker.worker.noPayStubsBody")}/>
    :<div className="flex flex-col gap-2.5">
      {myLines.map(({run,line})=><Card key={run.id} pad={mob?16:20} style={{borderRadius:14}}>
        <div className="flex justify-between items-center flex-wrap gap-2.5">
          <div>
            <div className="text-sm font-bold text-text">{t("seeker.worker.payPeriodLabel",{start:run.periodStart,end:run.periodEnd})}</div>
            <div className="text-xs text-text-3 mt-1">{t("seeker.worker.depositDateLine",{date:run.runDate,hours:line.hours,ot:line.otHrs>0?t("seeker.worker.otSuffix",{hours:line.otHrs}):""})}</div>
          </div>
          <div className="flex gap-4 items-center">
            <div className="text-right">
              <div className="text-xs text-text-3 font-semibold uppercase">{t("seeker.worker.netDepositedLabel")}</div>
              <div className="text-lg font-bold text-brand">${line.net.toFixed(2)}</div>
            </div>
            <Tag tone={run.status==="paid"?"ok":"warn"} sm>{t(PAYRUN_STATUS_KEY[run.status]||run.status)}</Tag>
          </div>
        </div>
        {/* Read the real withheld amounts straight off the line (as-actually-calculated at
            payroll-run time, including annual-max capping) rather than recomputing them fresh -
            a fresh recompute can't know this worker's year-to-date CPP/EI and would silently
            disagree with what was really withheld once the annual max kicks in. */}
        <div className={`mt-3 pt-3 border-t border-line-soft grid gap-2.5 text-xs ${mob?"grid-cols-2":"grid-cols-4"}`}>
          {[[t("seeker.worker.grossLabel"),`$${line.gross.toFixed(2)}`],[t("seeker.worker.cppLabel"),`-$${(line.cpp||0).toFixed(2)}`],[t("seeker.worker.eiLabel"),`-$${(line.ei||0).toFixed(2)}`],[t("seeker.worker.fedProvTaxLabel"),`-$${((line.fedTax||0)+(line.provTax||0)).toFixed(2)}`]].map(([l,v])=>
            <div key={l}><div className="text-text-3">{l}</div><div className="text-text font-semibold mt-0.5">{v}</div></div>)}
        </div>
      </Card>)}
    </div>}
  </Page>;
}

/* ─── Worker: Documents ─── */
export function WorkerDocuments(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t}=useTranslation();
  if(!A.user){A.go("login"); return null;}
  const worker=A.workerByPersonId(A.user.id);
  if(!worker){A.go("workerDashboard"); return null;}

  return <Page narrow>
    <H1 sub={t("seeker.worker.myDocumentsSub")}>{t("seeker.worker.myDocumentsTitle")}</H1>
    <div className={`grid gap-3 mb-5 ${mob?"grid-cols-1":"grid-cols-2"}`}>
      {[[t("seeker.worker.td1Federal"),worker.tdOnFile],
        [t("seeker.worker.td1Provincial",{province:worker.province}),worker.tdOnFile],
        [t("seeker.worker.docDirectDeposit"),worker.directDepositOnFile],
        [t("seeker.worker.docWorkEligibility"),!!worker.workEligibility]].map(([l,ok])=>
        <Card key={l} pad={mob?16:18} style={{borderRadius:12,borderLeft:`4px solid ${ok?C.ok:C.warn}`}}>
          <div className="flex gap-2.5 items-center mb-1.5">
            <I n={ok?"check":"alert"} s={16} c={ok?C.ok:C.warn}/>
            <span className="text-sm font-semibold text-text">{l}</span>
          </div>
          <div className="text-xs text-text-3">{ok?t("seeker.worker.onFile"):t("seeker.worker.pleaseUpload")}</div>
        </Card>)}
    </div>

    <Card pad={mob?18:24} style={{borderRadius:14}}>
      <Lbl>{t("seeker.worker.allDocumentsLabel")}</Lbl>
      {worker.documents.length===0?<div className="text-sm text-text-3 p-3.5 text-center">{t("seeker.worker.noDocumentsUploaded")}</div>
      :<div className="flex flex-col gap-2">
        {worker.documents.map((d,i)=><div key={i} className="py-3 px-3.5 bg-bg rounded-lg flex gap-3 items-center">
          <I n="file" s={17} c={C.brand}/>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-text">{d.label}</div>
            <div className="text-xs text-text-3 mt-0.5">{t("seeker.worker.uploadedLine",{date:d.uploaded})}{d.expires?t("seeker.worker.expiresSuffix",{date:d.expires}):""}</div>
          </div>
          <Btn kind="ghost" size="xs">{t("seeker.worker.viewBtn")}</Btn>
        </div>)}
      </div>}
      <div className="mt-3.5 pt-3.5 border-t border-line-soft">
        <Btn kind="primary" size="sm" icon="plus" onClick={()=>A.toast(t("seeker.worker.uploadUnavailableToast"))}>{t("seeker.worker.uploadDocumentBtn")}</Btn>
      </div>
    </Card>

    <Card pad={mob?18:22} style={{marginTop:16,borderRadius:14}}>
      <Lbl>{t("seeker.worker.t4sLabel")}</Lbl>
      <div className="text-sm text-text-2 leading-relaxed">
        {t("seeker.worker.t4sBody")}
      </div>
    </Card>
  </Page>;
}
