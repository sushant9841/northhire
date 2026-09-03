import { useState } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn, Tag, Card, Input, Area, Sel, Field, Banner, H2, Lbl, Modal, Page, SmartPortrait } from "../../design/primitives.jsx";
import { pay, payUnit, payShort } from "../../helpers/utils.js";
import { CV_TEMPLATES } from "../../store/seed/constants.js";
import { JobCard, EmpMark } from "../shared/cards.jsx";

/* ---- Apply: three full pages + confirmation ---- */
function ApplyShell({step,job,children,onNext,onBack,nextLabel,nextDisabled}){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const e=A.emp(job.e);
  const steps=["Your profile","Questions","Review"];
  return <div className="bg-bg min-h-full">
    <div className="bg-white border-b border-line">
      <div className={`max-w-3xl mx-auto ${mob?"p-4":"py-5 px-6"}`}>
        <div className="flex gap-3 items-center mb-5">
          <EmpMark e={e} size={42} radius={11}/>
          <div className="min-w-0">
            <div className="text-base font-bold text-text overflow-hidden text-ellipsis whitespace-nowrap">{job.t}</div>
            <div className="text-sm text-text-2 mt-0.5">{e.name} • {job.city}, {job.prov}</div></div></div>
        <div className="flex items-center">
          {steps.map((s,i)=><div key={s} className={`flex items-center min-w-0 ${i<2?"flex-1":"flex-none"}`}>
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition duration-300 ${step>i+1?"bg-ok text-white":step===i+1?"bg-brand text-white":"bg-line-soft text-text-3"}`}>
                {step>i+1?<I n="check" s={13} c="#fff" w={3}/>:i+1}</div>
              {!mob&&<span className={`text-sm whitespace-nowrap ${step===i+1?"font-bold text-text":"font-medium text-text-3"}`}>{s}</span>}</div>
            {i<2&&<div className={`flex-1 h-0.5 mx-2.5 rounded-full min-w-3.5 transition-colors duration-300 ${step>i+1?"bg-ok":"bg-line-soft"}`}/>}
          </div>)}</div></div></div>
    <div className={`max-w-3xl mx-auto ${mob?"pt-5 px-4 pb-8":"pt-7 px-6 pb-12"}`}>
      <div key={step} style={{animation:"slideIn .28s cubic-bezier(.22,.68,.35,1) both"}}>{children}</div>
      <div className="flex gap-2.5 justify-between mt-6">
        <Btn kind="ghost" icon="arrowL" onClick={onBack}>{step===1?"Cancel":"Back"}</Btn>
        <Btn kind="primary" size="lg" iconR={step===3?"send":"arrowR"} onClick={onNext} disabled={nextDisabled}>{nextLabel}</Btn></div></div>
  </div>;
}

function _CvPicker(){
  const A=use();
  const [open,setOpen]=useState(false);
  const myCvs=(A.cvs||[]).filter(c=>c.user===A.user?.id);
  const activeId=A.applyDraft.cv||A.defaultCv?.id||myCvs[0]?.id;
  const active=myCvs.find(c=>c.id===activeId);
  const setActive=(id)=>{A.setApplyDraft({...A.applyDraft,cv:id}); setOpen(false);};

  if(myCvs.length===0){
    return <Banner tone="warn" icon="alert" title="No CV attached"
      action={<Btn kind="primary" size="sm" onClick={()=>A.go("cvs")}>Build one</Btn>}>
      Employers are far more likely to shortlist applications with a CV attached.</Banner>;
  }

  return <>
    <div className="flex items-center gap-3 border border-line rounded-xl py-3.5 px-4">
      <div className="w-9 h-9 rounded-lg bg-wash text-brand flex items-center justify-center"><I n="file" s={18}/></div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-text">{active?.name||"No CV selected"}</div>
        <div className="text-xs text-text-3 mt-0.5">{active?`${CV_TEMPLATES.find(t=>t.id===active.template)?.name||"Standard"} template • updated ${active.updated||"—"}`:""}</div>
      </div>
      <Btn kind="ghost" size="sm" onClick={()=>setOpen(true)}>Change</Btn>
    </div>

    {open&&<Modal onClose={()=>setOpen(false)} title="Choose a CV to send">
      <div className="flex flex-col gap-2 mb-3.5">
        {myCvs.map(cv=>{const isActive=activeId===cv.id;
          return <button key={cv.id} onClick={()=>setActive(cv.id)}
            className={`flex items-center gap-3 py-3.5 px-4 rounded-xl cursor-pointer text-left transition duration-150 border-2 ${isActive?"bg-tint border-brand":"bg-white border-line"}`}>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isActive?"bg-brand text-white":"bg-wash text-brand"}`}><I n="file" s={18}/></div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-text">{cv.name}</div>
              <div className="text-xs text-text-3 mt-0.5">{CV_TEMPLATES.find(t=>t.id===cv.template)?.name||"Standard"} template • {cv.updated||"just now"}</div>
            </div>
            {isActive&&<Tag tone="brand" sm icon="check">Selected</Tag>}
          </button>;})}
      </div>
      <div className="p-3.5 bg-bg rounded-xl flex gap-3 items-center justify-between flex-wrap">
        <div>
          <div className="text-sm font-semibold text-text">Need a different CV?</div>
          <div className="text-xs text-text-3 mt-0.5">You can have up to 5 CVs for different job types.</div>
        </div>
        <Btn kind="outline" size="sm" icon="plus" onClick={()=>{setOpen(false); A.editCv("new");}}>Create new CV</Btn>
      </div>
    </Modal>}
  </>;
}

export function Apply1(){
  const A=use(); const job=A.job(A.applyDraft.job); if(!job) return null;
  const e=A.emp(job.e); const u=A.user;
  const missing=job.skills.filter(s=>!(u.skills||[]).some(x=>x.toLowerCase()===s.toLowerCase()));
  return <ApplyShell step={1} job={job} onBack={()=>A.go("job")} onNext={()=>A.go("apply2")} nextLabel="Continue">
    <Card pad={22}>
      <H2 sub="This is exactly what the employer will receive">Confirm your details</H2>
      <div className="flex gap-3.5 items-center bg-tint border border-line-2 rounded-xl p-4 mb-5">
        <SmartPortrait seed={u.seed??0} size={54} radius={13}/>
        <div className="min-w-0 flex-1">
          <div className="text-base font-bold text-text">{u.name}</div>
          <div className="text-sm text-text-2 mt-1">{u.title} • {u.city}, {u.prov}</div>
          <div className="text-sm text-text-2 mt-0.5">{u.email} • {u.phone}</div></div>
        <Btn kind="outline" size="sm" icon="edit" onClick={()=>A.go("profile")}>Edit</Btn></div>
      <div className="mb-5">
        <Lbl>Attached CV</Lbl>
        <_CvPicker/>
      </div>
      {(job.mustHave||[]).length>0&&(()=>{
        const mustMissing=job.mustHave.filter(s=>!(u.skills||[]).some(x=>x.toLowerCase()===s.toLowerCase()));
        const mustPresent=job.mustHave.filter(s=>(u.skills||[]).some(x=>x.toLowerCase()===s.toLowerCase()));
        return <div className="mb-5">
          <div className="flex justify-between items-center mb-2">
            <Lbl style={{margin:0}}>Must-have skills</Lbl>
            <Tag tone={mustMissing.length===0?"ok":"warn"} sm>{mustPresent.length} of {job.mustHave.length}</Tag>
          </div>
          <div className="flex flex-wrap gap-2">
            {job.mustHave.map(s=>{const mine=(u.skills||[]).some(x=>x.toLowerCase()===s.toLowerCase());
              return <Tag key={s} tone={mine?"ok":"danger"} icon={mine?"check":"alert"}>{s}</Tag>;})}
          </div>
          {mustMissing.length>0&&<Banner tone="warn" icon="alert" title="You are missing some must-have skills" style={{marginTop:11}}
            action={<Btn kind="outline" size="sm" onClick={()=>A.go("profile")}>Add to profile</Btn>}>
            The employer flagged these as required: <strong>{mustMissing.join(", ")}</strong>. You can still apply, but add them to your profile first if you actually have them.
          </Banner>}
        </div>;})()}
      <div className="mb-5">
        <Lbl>Nice-to-have skills</Lbl>
        <div className="flex flex-wrap gap-2">
          {job.skills.map(s=>{const mine=(u.skills||[]).some(x=>x.toLowerCase()===s.toLowerCase());
            return <Tag key={s} tone={mine?"ok":"neutral"} icon={mine?"check":undefined}>{s}</Tag>;})}</div>
        {missing.length>0&&<div className="text-sm text-text-2 mt-3 leading-relaxed">
          Bonus if you have {missing.slice(0,3).join(", ")}. Add them to your profile so the employer sees them.</div>}</div>
      <Banner tone="neutral" icon="shield" title="How your data is used">
        {e.name} receives your profile, CV and answers for this application only. You can withdraw at any time from My Status, in line with PIPEDA.</Banner>
    </Card></ApplyShell>;
}
export function Apply2(){
  const A=use(); const job=A.job(A.applyDraft.job); if(!job) return null;
  const d=A.applyDraft; const set=(k,v)=>A.setApplyDraft({...d,[k]:v});
  const meetsRequired=job.exp!=="No experience required"&&job.exp!=="Entry level welcome";
  const nextDisabled=!d.avail||(meetsRequired&&!d.meets);
  return <ApplyShell step={2} job={job} onBack={()=>A.go("apply1")} onNext={()=>A.go("apply3")} nextLabel="Review application" nextDisabled={nextDisabled}>
    <Card pad={22}>
      <H2 sub="Three quick questions the employer asked for">A few questions</H2>
      <div className="flex flex-col gap-5">
        <Field label="When could you start?" required>
          <Sel value={d.avail} onChange={e=>set("avail",e.target.value)}>
            {["Immediately","Within 2 weeks","Within 1 month","More than 1 month"].map(o=><option key={o}>{o}</option>)}</Sel></Field>
        <Field label="Your expected pay"
          hint={`This role offers ${pay(job)} ${payUnit(job)}. Leave blank to accept the posted range.`}>
          <Input placeholder={job.unit==="yr"?"62000":"32.00"} type="number" inputMode="decimal" min="0" value={d.expect} onChange={e=>set("expect",e.target.value.replace(/[^0-9.]/g,""))}
            icon="wallet" suffix={payShort(job)}/></Field>
        <Field label="Anything the employer should know?" hint="Optional. Two or three specific sentences work better than a long letter.">
          <Area rows={6} value={d.letter} onChange={e=>set("letter",e.target.value)}
            placeholder={`I am applying for the ${job.t} role because…`}/></Field>
        {job.exp!=="No experience required"&&job.exp!=="Entry level welcome"&&
          <Field label={`This role asks for ${job.exp}. Do you meet that?`} required>
            <div className="grid grid-cols-2 gap-2.5">
              {["Yes","Close to it"].map(o=><button key={o} onClick={()=>set("meets",o)}
                className={`p-3 rounded-xl cursor-pointer text-sm border-2 transition duration-150 ${d.meets===o?"font-bold border-brand bg-tint text-brand":"font-medium border-line bg-white text-text"}`}>{o}</button>)}</div></Field>}
      </div></Card></ApplyShell>;
}
export function Apply3(){
  const A=use(); const job=A.job(A.applyDraft.job); if(!job) return null;
  const e=A.emp(job.e); const d=A.applyDraft; const u=A.user;
  const selectedCv=(A.cvs||[]).find(c=>c.id===d.cv)||A.defaultCv;
  const rows=[["Position",job.t],["Employer",e.name],["Location",`${job.city}, ${job.prov} • ${job.mode}`],
    ["Posted pay",`${pay(job)} ${payUnit(job)}`],["Applicant",u.name],["Contact",`${u.email} • ${u.phone}`],
    ["CV",selectedCv?selectedCv.name:"None attached"],["Available from",d.avail],
    ["Expected pay",d.expect?`${d.expect}${payShort(job)}`:"Open to posted range"],
    ["Note",d.letter.trim()?`${d.letter.trim().split(/\s+/).length} words`:"Not included"]];
  return <ApplyShell step={3} job={job} onBack={()=>A.go("apply2")} onNext={()=>A.submitApply()} nextLabel="Send application">
    <Card pad={22}>
      <H2 sub="Check everything, then send">Review your application</H2>
      <div className="border border-line rounded-xl overflow-hidden mb-4">
        {rows.map(([k,v],i)=><div key={k} className={`flex justify-between gap-4 py-3 px-4 text-sm ${i<rows.length-1?"border-b border-line-soft":""} ${i%2?"bg-bg":"bg-white"}`}>
          <span className="text-text-2 shrink-0">{k}</span>
          <span className="font-semibold text-text text-right">{v}</span></div>)}</div>
      {d.letter.trim()&&<div className="mb-4">
        <Lbl>Your note</Lbl>
        <div className="bg-bg border border-line rounded-xl p-3.5 text-sm text-text-2 leading-relaxed whitespace-pre-wrap">{d.letter}</div></div>}
      <Banner tone="brand" icon="sparkle" title="What happens next">
        Your application goes straight into {e.name}'s pipeline. You will see every stage change in My Status, and get a notification when they review it.</Banner>
    </Card></ApplyShell>;
}
export function ApplyDone(){
  const A=use(); const job=A.job(A.applyDraft.job);
  const e=job?A.emp(job.e):null;
  const more=A.jobs.filter(j=>j.status==="live"&&j.cat===job?.cat&&j.id!==job?.id).slice(0,3);
  return <Page narrow>
    <div className="text-center pt-5 pb-2" style={{animation:"rise .4s ease both"}}>
      <div className="w-19 h-19 rounded-full bg-ok-bg border-2 border-ok-ln flex items-center justify-center mx-auto mb-5" style={{animation:"pop .45s cubic-bezier(.22,.68,.35,1) both"}}>
        <I n="check" s={38} c={C.ok} w={2.6}/></div>
      <h1 className="text-2xl font-bold tracking-tight text-text mb-2.5">Application sent</h1>
      <p className="text-base text-text-2 leading-relaxed mx-auto mb-7 max-w-md">
        {e?<>Your application for <strong className="text-text">{job.t}</strong> is now with {e.name}. You will be notified the moment they review it.</>:"Your application has been submitted."}</p>
      <div className="flex gap-2.5 justify-center flex-wrap mb-8">
        <Btn kind="primary" icon="activity" onClick={()=>A.go("status")}>Track in My Status</Btn>
        <Btn kind="outline" icon="search" onClick={()=>A.go("search")}>Keep searching</Btn></div></div>
    {more.length>0&&<><H2 sub="Other openings in the same field">Similar jobs</H2>
      <div className="flex flex-col gap-3">{more.map((j,i)=><JobCard key={j.id} job={j} delay={i*0.05}/>)}</div></>}
  </Page>;
}
