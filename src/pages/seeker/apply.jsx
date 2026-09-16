import { useState, useEffect } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn, Tag, Card, Input, Area, Sel, Field, Banner, H2, Lbl, Modal, Page, SmartPortrait, HERO_QUIET } from "../../design/primitives.jsx";
import { pay, payUnit, payShort } from "../../helpers/utils.js";
import { JobCard, EmpMark } from "../shared/cards.jsx";
import { useTranslation } from "../../i18n/i18n.jsx";
import { cvTemplateName } from "./cv.jsx";

/* Availability / experience filter values below are stored and matched as canonical English
   strings elsewhere in the app (see the STANDING RULE) - these maps translate only the label. */
const AVAIL_KEY={"Immediately":"auth.immediately","Within 2 weeks":"auth.withinWeeks",
  "Within 1 month":"auth.withinMonth","More than 1 month":"auth.moreThanMonth"};
const EXP_KEY={"No experience required":"seeker.search.expNoneRequired","Entry level welcome":"seeker.search.expEntryLevel",
  "1+ years":"seeker.search.exp1Plus","2+ years":"seeker.search.exp2Plus","3+ years":"seeker.search.exp3Plus","4+ years":"seeker.search.exp4Plus"};
const YESNO_KEY={"Yes":"common.yes","No":"common.no"};

/* Datalist backed by the seeker's own autofill history. Renders as a <datalist> so a linked
   <input list={id}> shows the user their previous entries as native suggestions without
   claiming any of the input's visual real estate. Zero suggestions => zero DOM overhead. */
export function AutofillDatalist({ id, field }){
  const A=use();
  const [options,setOptions]=useState([]);
  useEffect(()=>{
    let alive=true;
    A.getAutofillSuggestions?.(field).then(list=>{ if(alive) setOptions(list||[]); });
    return()=>{alive=false;};
  },[field]);
  if(!options.length) return null;
  return <datalist id={id}>{options.map(v=><option key={v} value={v}/>)}</datalist>;
}

/* ---- Apply: three full pages + confirmation ---- */
function ApplyShell({step,job,children,onNext,onBack,nextLabel,nextDisabled}){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const e=A.emp(job.e);
  const {t}=useTranslation();
  const steps=[t("seeker.apply.stepProfile"),t("seeker.apply.stepQuestions"),t("seeker.apply.stepReview")];
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
        <Btn kind="ghost" icon="arrowL" onClick={onBack}>{step===1?t("seeker.apply.cancelBtn"):t("seeker.apply.backBtn")}</Btn>
        <Btn kind="primary" size="lg" iconR={step===3?"send":"arrowR"} onClick={onNext} disabled={nextDisabled}>{nextLabel}</Btn></div></div>
  </div>;
}

function _CvPicker(){
  const A=use(); const {t}=useTranslation();
  const [open,setOpen]=useState(false);
  const myCvs=(A.cvs||[]).filter(c=>c.user===A.user?.id);
  const activeId=A.applyDraft.cv||A.defaultCv?.id||myCvs[0]?.id;
  const active=myCvs.find(c=>c.id===activeId);
  const setActive=(id)=>{A.setApplyDraft({...A.applyDraft,cv:id}); setOpen(false);};

  if(myCvs.length===0){
    return <Banner tone="warn" icon="alert" title={t("seeker.apply.noCvAttachedTitle")}
      action={<Btn kind="primary" size="sm" onClick={()=>A.go("cvs")}>{t("seeker.apply.buildOneBtn")}</Btn>}>
      {t("seeker.apply.noCvAttachedBody")}</Banner>;
  }

  return <>
    <div className="flex items-center gap-3 border border-line rounded-xl py-3.5 px-4">
      <div className="w-9 h-9 rounded-lg bg-wash text-brand flex items-center justify-center"><I n="file" s={18}/></div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-text">{active?.name||t("seeker.apply.noCvSelected")}</div>
        <div className="text-xs text-text-3 mt-0.5">{active?t("seeker.apply.cvUpdated",{template:active.template?cvTemplateName(t,active.template):t("seeker.apply.standardTemplate"),date:active.updated||"—"}):""}</div>
      </div>
      <Btn kind="ghost" size="sm" onClick={()=>setOpen(true)}>{t("seeker.apply.changeBtn")}</Btn>
    </div>

    {open&&<Modal onClose={()=>setOpen(false)} title={t("seeker.apply.chooseCvModalTitle")}>
      <div className="flex flex-col gap-2 mb-3.5">
        {myCvs.map(cv=>{const isActive=activeId===cv.id;
          return <button key={cv.id} onClick={()=>setActive(cv.id)}
            className={`flex items-center gap-3 py-3.5 px-4 rounded-xl cursor-pointer text-left transition duration-150 border-2 ${isActive?"bg-tint border-brand":"bg-white border-line"}`}>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isActive?"bg-brand text-white":"bg-wash text-brand"}`}><I n="file" s={18}/></div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-text">{cv.name}</div>
              <div className="text-xs text-text-3 mt-0.5">{t("seeker.apply.cvUpdatedNow",{template:cv.template?cvTemplateName(t,cv.template):t("seeker.apply.standardTemplate"),date:cv.updated||t("seeker.apply.justNow")})}</div>
            </div>
            {isActive&&<Tag tone="brand" sm icon="check">{t("seeker.apply.selectedTag")}</Tag>}
          </button>;})}
      </div>
      <div className="p-3.5 bg-bg rounded-xl flex gap-3 items-center justify-between flex-wrap">
        <div>
          <div className="text-sm font-semibold text-text">{t("seeker.apply.needDifferentCvTitle")}</div>
          <div className="text-xs text-text-3 mt-0.5">{t("seeker.apply.needDifferentCvBody")}</div>
        </div>
        <Btn kind="outline" size="sm" icon="plus" onClick={()=>{setOpen(false); A.newCv();}}>{t("seeker.apply.createNewCvBtn")}</Btn>
      </div>
    </Modal>}
  </>;
}

export function Apply1(){
  const A=use(); const job=A.job(A.applyDraft.job); if(!job) return null;
  const e=A.emp(job.e); const u=A.user; const {t}=useTranslation();
  const missing=job.skills.filter(s=>!(u.skills||[]).some(x=>x.toLowerCase()===s.toLowerCase()));
  return <ApplyShell step={1} job={job} onBack={()=>A.go("job")} onNext={()=>A.go("apply2")} nextLabel={t("seeker.apply.continueBtn")}>
    <Card pad={22}>
      <H2 sub={t("seeker.apply.confirmDetailsSub")}>{t("seeker.apply.confirmDetailsTitle")}</H2>
      {/* Job Seeker Transformation Tranche 3 (JS-05 lead-in): the pre-fill audit. Every field below
          is what NorthHire already has on file - this banner says so up front, so the seeker
          reads the rest of the step as "check my own data" rather than "fill out yet another
          form". Nothing here changes what gets submitted; every value stays editable exactly as
          it did before (feedback_server_authoritative / risk called out in the plan). */}
      <Banner tone="ok" icon="sparkle" title={t("seeker.apply.prefilledTitle")} style={{marginBottom:20}}>
        {t("seeker.apply.prefilledBody")}</Banner>
      <div className="flex gap-3.5 items-center bg-tint border border-line-2 rounded-xl p-4 mb-5">
        <SmartPortrait seed={u.seed??0} size={54} radius={13}/>
        <div className="min-w-0 flex-1">
          <div className="text-base font-bold text-text">{u.name}</div>
          <div className="text-sm text-text-2 mt-1">{u.title} • {u.city}, {u.prov}</div>
          <div className="text-sm text-text-2 mt-0.5">{u.email} • {u.phone}</div></div>
        <Btn kind="outline" size="sm" icon="edit" onClick={()=>A.go("profile")}>{t("seeker.apply.editBtn")}</Btn></div>
      <div className="mb-5">
        <Lbl>{t("seeker.apply.attachedCvLabel")}</Lbl>
        <_CvPicker/>
      </div>
      {(job.mustHave||[]).length>0&&(()=>{
        const mustMissing=job.mustHave.filter(s=>!(u.skills||[]).some(x=>x.toLowerCase()===s.toLowerCase()));
        const mustPresent=job.mustHave.filter(s=>(u.skills||[]).some(x=>x.toLowerCase()===s.toLowerCase()));
        return <div className="mb-5">
          <div className="flex justify-between items-center mb-2">
            <Lbl style={{margin:0}}>{t("seeker.apply.mustHaveSkillsLabel")}</Lbl>
            <Tag tone={mustMissing.length===0?"ok":"warn"} sm>{t("seeker.apply.ofCount",{present:mustPresent.length,total:job.mustHave.length})}</Tag>
          </div>
          <div className="flex flex-wrap gap-2">
            {job.mustHave.map(s=>{const mine=(u.skills||[]).some(x=>x.toLowerCase()===s.toLowerCase());
              return <Tag key={s} tone={mine?"ok":"danger"} icon={mine?"check":"alert"}>{s}</Tag>;})}
          </div>
          {mustMissing.length>0&&<Banner tone="warn" icon="alert" title={t("seeker.apply.missingMustHaveTitle")} style={{marginTop:11}}
            action={<Btn kind="outline" size="sm" onClick={()=>A.go("profile")}>{t("seeker.apply.addToProfileBtn")}</Btn>}>
            {t("seeker.apply.employerFlaggedRequired",{skills:mustMissing.join(", ")})}
          </Banner>}
        </div>;})()}
      <div className="mb-5">
        <Lbl>{t("seeker.apply.niceToHaveSkillsLabel")}</Lbl>
        <div className="flex flex-wrap gap-2">
          {job.skills.map(s=>{const mine=(u.skills||[]).some(x=>x.toLowerCase()===s.toLowerCase());
            return <Tag key={s} tone={mine?"ok":"neutral"} icon={mine?"check":undefined}>{s}</Tag>;})}</div>
        {missing.length>0&&<div className="text-sm text-text-2 mt-3 leading-relaxed">
          {t("seeker.apply.bonusIfYouHave",{skills:missing.slice(0,3).join(", ")})}</div>}</div>
      <Banner tone="neutral" icon="shield" title={t("seeker.apply.dataUsedTitle")}>
        {t("seeker.apply.dataUsedBody",{employer:e.name})}</Banner>
    </Card></ApplyShell>;
}
export function Apply2(){
  const A=use(); const job=A.job(A.applyDraft.job); if(!job) return null;
  const e=A.emp(job.e); const {t}=useTranslation();
  const d=A.applyDraft; const set=(k,v)=>A.setApplyDraft({...d,[k]:v});
  const setAnswer=(qid,v)=>set("screeningAnswers",{...(d.screeningAnswers||{}),[qid]:v});
  const toggleChecklistAnswer=(qid,opt)=>{const cur=d.screeningAnswers?.[qid]||[];
    setAnswer(qid,cur.includes(opt)?cur.filter(x=>x!==opt):[...cur,opt]);};
  const meetsRequired=job.exp!=="No experience required"&&job.exp!=="Entry level welcome";
  const questions=job.questions||[];
  const answersComplete=questions.every(q=>{if(!q.required)return true; const v=d.screeningAnswers?.[q.id];
    return q.type==="checkbox"?Array.isArray(v)&&v.length>0:!!String(v||"").trim();});
  const nextDisabled=!d.avail||(meetsRequired&&!d.meets)||!answersComplete;
  return <ApplyShell step={2} job={job} onBack={()=>A.go("apply1")} onNext={()=>A.go("apply3")} nextLabel={t("seeker.apply.reviewApplicationBtn")} nextDisabled={nextDisabled}>
    <Card pad={22}>
      <H2 sub={t("seeker.apply.questionsSub")}>{t("seeker.apply.questionsTitle")}</H2>
      <div className="flex flex-col gap-5">
        {questions.length>0&&<Banner tone="neutral" icon="briefcase" title={t("seeker.apply.employerAsksEveryone",{employer:e?.name||t("seeker.apply.defaultEmployer")})}>
          {t("seeker.apply.answerEachBelow")}</Banner>}
        {questions.map(q=>{const v=d.screeningAnswers?.[q.id];
          return <Field key={q.id} label={q.prompt} required={q.required}>
            {q.type==="yesno"&&<div className="grid grid-cols-2 gap-2.5">
              {["Yes","No"].map(o=><button key={o} type="button" onClick={()=>setAnswer(q.id,o)}
                className={`p-3 rounded-xl cursor-pointer text-sm border-2 transition duration-150 ${v===o?"font-bold border-brand bg-tint text-brand":"font-medium border-line bg-white text-text"}`}>{t(YESNO_KEY[o])}</button>)}</div>}
            {q.type==="radio"&&<div className="flex flex-col gap-2">
              {(q.options||[]).map(o=><button key={o} type="button" onClick={()=>setAnswer(q.id,o)}
                className={`p-3 rounded-xl cursor-pointer text-sm text-left border-2 transition duration-150 ${v===o?"font-bold border-brand bg-tint text-brand":"font-medium border-line bg-white text-text"}`}>{o}</button>)}</div>}
            {q.type==="checkbox"&&<div className="flex flex-col gap-2">
              {(q.options||[]).map(o=>{const on=(v||[]).includes(o);
                return <button key={o} type="button" onClick={()=>toggleChecklistAnswer(q.id,o)}
                  className={`flex items-center gap-2.5 p-3 rounded-xl cursor-pointer text-sm text-left border-2 transition duration-150 ${on?"font-bold border-brand bg-tint text-brand":"font-medium border-line bg-white text-text"}`}>
                  <span className={`w-4.5 h-4.5 rounded-md shrink-0 border-2 flex items-center justify-center ${on?"border-brand bg-brand":"border-line"}`}>{on&&<I n="check" s={10} c="#fff" w={3}/>}</span>{o}</button>;})}</div>}
            {q.type==="short"&&<Input value={v||""} onChange={ev=>setAnswer(q.id,ev.target.value)} placeholder={t("seeker.apply.yourAnswerPlaceholder")}/>}
            {q.type==="long"&&<Area rows={3} value={v||""} onChange={ev=>setAnswer(q.id,ev.target.value)} placeholder={t("seeker.apply.yourAnswerPlaceholder")}/>}
          </Field>;})}
        <Field label={t("seeker.apply.whenCouldStartLabel")} required>
          <Sel value={d.avail} onChange={e=>set("avail",e.target.value)}>
            {["Immediately","Within 2 weeks","Within 1 month","More than 1 month"].map(o=><option key={o} value={o}>{t(AVAIL_KEY[o])}</option>)}</Sel></Field>
        <Field label={t("seeker.apply.yourExpectedPayLabel")}
          hint={t("seeker.apply.expectedPayHint",{pay:pay(job),unit:payUnit(job)})}>
          <Input placeholder={job.unit==="yr"?"62000":"32.00"} type="number" inputMode="decimal" min="0" value={d.expect} onChange={e=>set("expect",e.target.value.replace(/[^0-9.]/g,""))}
            icon="wallet" suffix={payShort(job)} list="autofill-salary-expectation"/>
          <AutofillDatalist id="autofill-salary-expectation" field="salary_expectation"/></Field>
        <Field label={t("seeker.apply.anythingElseLabel")} hint={t("seeker.apply.anythingElseHint")}>
          <Area rows={6} value={d.letter} onChange={e=>set("letter",e.target.value)}
            placeholder={t("seeker.apply.applyingForRolePlaceholder",{job:job.t})}/></Field>
        {job.exp!=="No experience required"&&job.exp!=="Entry level welcome"&&
          <Field label={t("seeker.apply.roleAsksForLabel",{exp:t(EXP_KEY[job.exp]||job.exp)})} required>
            <div className="grid grid-cols-2 gap-2.5">
              {["Yes","Close to it"].map(o=><button key={o} onClick={()=>set("meets",o)}
                className={`p-3 rounded-xl cursor-pointer text-sm border-2 transition duration-150 ${d.meets===o?"font-bold border-brand bg-tint text-brand":"font-medium border-line bg-white text-text"}`}>{o==="Yes"?t("common.yes"):t("seeker.apply.closeToItOption")}</button>)}</div></Field>}
      </div></Card></ApplyShell>;
}
export function Apply3(){
  const A=use(); const job=A.job(A.applyDraft.job); if(!job) return null;
  const e=A.emp(job.e); const d=A.applyDraft; const u=A.user; const {t}=useTranslation();
  const selectedCv=(A.cvs||[]).find(c=>c.id===d.cv)||A.defaultCv;
  const rows=[[t("seeker.apply.rowPosition"),job.t],[t("seeker.apply.rowEmployer"),e.name],[t("seeker.apply.rowLocation"),`${job.city}, ${job.prov} • ${job.mode}`],
    [t("seeker.apply.rowPostedPay"),`${pay(job)} ${payUnit(job)}`],[t("seeker.apply.rowApplicant"),u.name],[t("seeker.apply.rowContact"),`${u.email} • ${u.phone}`],
    [t("seeker.apply.rowCv"),selectedCv?selectedCv.name:t("seeker.apply.noneAttached")],[t("seeker.apply.rowAvailableFrom"),t(AVAIL_KEY[d.avail]||d.avail)],
    [t("seeker.apply.rowExpectedPay"),d.expect?`${d.expect}${payShort(job)}`:t("seeker.apply.openToPostedRange")],
    [t("seeker.apply.rowNote"),d.letter.trim()?t("seeker.apply.wordsCount",{count:d.letter.trim().split(/\s+/).length}):t("seeker.apply.notIncluded")],
    ...(job.questions?.length?[[t("seeker.apply.rowScreeningQuestions"),t("seeker.apply.answeredCount",{count:job.questions.length})]]:[])];
  return <ApplyShell step={3} job={job} onBack={()=>A.go("apply2")} onNext={()=>A.submitApply()} nextLabel={t("seeker.apply.sendApplicationBtn")}>
    <Card pad={22}>
      <H2 sub={t("seeker.apply.reviewSub")}>{t("seeker.apply.reviewTitle")}</H2>
      <div className="border border-line rounded-xl overflow-hidden mb-4">
        {rows.map(([k,v],i)=><div key={k} className={`flex justify-between gap-4 py-3 px-4 text-sm ${i<rows.length-1?"border-b border-line-soft":""} ${i%2?"bg-bg":"bg-white"}`}>
          <span className="text-text-2 shrink-0">{k}</span>
          <span className="font-semibold text-text text-right">{v}</span></div>)}</div>
      {d.letter.trim()&&<div className="mb-4">
        <Lbl>{t("seeker.apply.yourNoteLabel")}</Lbl>
        <div className="bg-bg border border-line rounded-xl p-3.5 text-sm text-text-2 leading-relaxed whitespace-pre-wrap">{d.letter}</div></div>}
      <Banner tone="brand" icon="sparkle" title={t("seeker.apply.whatHappensNextTitle")}>
        {t("seeker.apply.whatHappensNextBody",{employer:e.name})}</Banner>
    </Card></ApplyShell>;
}
export function ApplyDone(){
  const A=use(); const job=A.job(A.applyDraft.job); const {t,locale}=useTranslation();
  const e=job?A.emp(job.e):null;
  /* Job Seeker Transformation Tranche 3 (JS-05): rich confirmation instead of a bare checkmark -
     which CV went out, when, and what to expect, all on the one screen that follows a decision
     the seeker just made. applyDraft still holds what was actually submitted (it isn't reset
     until the next beginApply), so this reads the real attached CV rather than re-guessing. */
  const sentCv=(A.cvs||[]).find(c=>c.id===A.applyDraft.cv)||A.defaultCv;
  const appliedAt=new Date().toLocaleDateString(locale==="fr-CA"?"fr-CA":"en-CA",{day:"numeric",month:"short",year:"numeric"});
  const trackApplication=()=>{ if(A.lastAppliedId)A.setFocusAppId(A.lastAppliedId); A.go("status"); };
  const more=A.jobs.filter(j=>j.status==="live"&&j.cat===job?.cat&&j.id!==job?.id).slice(0,3);
  /* Job Seeker Transformation Tranche 1 (JS-01): "First Apply" contextual profile prompt. Rather
     than asking experience level up front at signup, ask it once, right after the first
     successful apply — when years is genuinely unset (completeSignup no longer defaults it for a
     minimal signup, see useStore.js). Dismissable; only ever shown while years is still unset. */
  const [expPromptDismissed,setExpPromptDismissed]=useState(false);
  const showExpPrompt=A.user?.role==="seeker"&&A.user.years==null&&!expPromptDismissed;
  const YEARS_OPTIONS=[[t("auth.noExperience"),0],[t("auth.lessThanYear"),1],["1-2 years",2],["3-5 years",4],["6-10 years",8],["More than 10 years",12]];
  const setYears=years=>{A.saveProfile({...A.user,years}); setExpPromptDismissed(true);};
  return <Page narrow>
    <div className="text-center pt-5 pb-2" style={{animation:"rise .4s ease both"}}>
      <div className="w-19 h-19 rounded-full bg-ok-bg border-2 border-ok-ln flex items-center justify-center mx-auto mb-5" style={{animation:"pop .45s cubic-bezier(.22,.68,.35,1) both"}}>
        <I n="check" s={38} c={C.ok} w={2.6}/></div>
      <h1 className={`${HERO_QUIET} text-2xl mb-2.5`}>{e?t("seeker.apply.appSentToTitle",{employer:e.name}):t("seeker.apply.appSentTitle")}</h1>
    </div>
    {job&&<Card pad={20} style={{marginBottom:24}}>
      <div className="flex gap-3.5 items-center mb-4">
        <EmpMark e={e} size={46}/>
        <div className="min-w-0 flex-1">
          <div className="text-base font-bold text-text truncate">{job.t}</div>
          <div className="text-sm text-text-2 mt-0.5">{t("seeker.apply.appliedOnMeta",{date:appliedAt})}</div></div>
        <Tag tone="ok" icon="check" sm>{t("seeker.apply.statusAppliedTag")}</Tag></div>
      <div className="flex items-center gap-2.5 border border-line rounded-xl py-2.5 px-3.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-wash text-brand flex items-center justify-center shrink-0"><I n="file" s={15}/></div>
        <div className="text-sm text-text-2">{sentCv?t("seeker.apply.usingCvPill",{cv:sentCv.name}):t("seeker.apply.noCvSentPill")}</div></div>
      <Banner tone="brand" icon="sparkle" title={t("seeker.apply.whatHappensNextTitle")} style={{marginBottom:16}}>
        {t("seeker.apply.whatHappensNextBody",{employer:e?.name||t("seeker.apply.defaultEmployer")})}</Banner>
      <div className="flex gap-2.5 justify-center flex-wrap">
        <Btn kind="primary" icon="activity" onClick={trackApplication}>{t("seeker.apply.trackInStatusBtn")}</Btn>
        <Btn kind="outline" icon="search" onClick={()=>A.go("search")}>{t("seeker.apply.seeSimilarRolesBtn")}</Btn></div>
    </Card>}
    {showExpPrompt&&<Card pad={20} style={{marginBottom:24}}>
      <div className="flex justify-between items-start gap-3 mb-3">
        <div className="text-sm font-bold text-text">{t("seeker.apply.expPromptTitle")}</div>
        <button onClick={()=>setExpPromptDismissed(true)} className="bg-transparent border-0 p-0 cursor-pointer text-text-3"><I n="x" s={16}/></button></div>
      <div className="flex flex-wrap gap-2">
        {YEARS_OPTIONS.map(([label,years])=><button key={label} onClick={()=>setYears(years)}
          className="py-2 px-3.5 rounded-xl cursor-pointer text-sm font-medium border-2 border-line bg-white text-text hover:border-brand">
          {label}</button>)}</div>
    </Card>}
    {more.length>0&&<><H2 sub={t("seeker.apply.similarJobsSub")}>{t("seeker.apply.similarJobsTitle")}</H2>
      <div className="flex flex-col gap-3">{more.map((j,i)=><JobCard key={j.id} job={j} delay={i*0.05}/>)}</div></>}
  </Page>;
}
