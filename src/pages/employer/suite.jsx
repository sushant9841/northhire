import { useState, useEffect, useRef } from "react";
import { DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C, SH } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import {
  Page, H1, H2, Btn, Banner, Stat, Card, Empty, Tag, Bar, Modal, Area, Field, Input, Sel,
  RichText, Switch, CheckRow, DatePicker, Ring, Tabs, Lbl, SmartPortrait, SmartScene, SmartLogo, Mark, MARKS, ConfirmDialog,
  usePagination, Pagination, HERO_WIDE,
} from "../../design/primitives.jsx";
import { hiringSummary } from "../../helpers/hiringAnalytics.js";
import { postingRules, checkPayRange, findCanadianExperience, applicationDecisionNotice, AI_DISCLOSURE_TEXT } from "../../helpers/jobPostingLaw.js";
import { pay, payShort, dlText, money, uid, matchesQuery, matchesBooleanQuery, focusFirstError } from "../../helpers/utils.js";
import { sanitizeHtml } from "../../helpers/sanitize.js";
import { PROVS, PCODE, CATS, CATM } from "../../store/seed/constants.js";
import { jobTone, jobStatusLabel } from "../../helpers/statusTone.js";
import { applicationStageLabel } from "../../helpers/enumLabels.js";
import { LocationInput, InlineList, QuestionBuilder, aiSuggestJD } from "../shared/formControls.jsx";
import { useTranslation } from "../../i18n/i18n.jsx";
import { formatNumber, formatDate, formatDateTime } from "../../i18n/format.js";

export function EmpHome(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const e=A.company;
  const jobs=A.jobs.filter(j=>j.e===e.id);
  const apps=A.applications.filter(a=>jobs.some(j=>j.id===a.job));
  const stages=A.stagesFor(e.id);
  const byStage=stages.reduce((m,s)=>({...m,[s]:apps.filter(a=>a.stage===s).length}),{});
  const canContent=A.settings.employerContent;
  const pendingApprovalCount=jobs.filter(j=>j.pendingOwnerApproval).length;
  return <Page wide>
    <H1 sub={`${e.verified?t("employer.home.verified"):t("employer.home.awaitingVerification")} • ${A.planName?A.planName():e.plan||"Free"} ${t("employer.home.planSuffix")}`}
      action={<div className="flex gap-2.5 flex-wrap">
        <Btn kind="outline" onClick={()=>A.go("empPipeline")}>{t("employer.home.candidates")}</Btn>
        <Btn kind="primary" icon="plus" onClick={()=>A.go("empPost")}>{t("employer.home.postAJob")}</Btn></div>}>{e.name}</H1>
    {!e.verified&&<Banner tone="warn" icon="clock" title={t("employer.home.verificationTitle")} style={{marginBottom:18}}>
      {t("employer.home.verificationBody")}</Banner>}
    {!canContent&&<Banner tone="neutral" icon="lock" title={t("employer.home.contentOffTitle")} style={{marginBottom:18}}>
      {t("employer.home.contentOffBody")}</Banner>}
    {A.user?.employerRole==="owner"&&pendingApprovalCount>0&&
      <Banner tone="warn" icon="shield" title={t("employer.home.needsApprovalTitle")} style={{marginBottom:18}}
        action={<Btn kind="primary" size="sm" onClick={()=>A.go("empJobs")}>{t("employer.home.review")}</Btn>}>
        {t(pendingApprovalCount===1?"employer.home.listingsWontGoLiveOne":"employer.home.listingsWontGoLiveOther",{n:pendingApprovalCount})}</Banner>}
    <div className="grid gap-3 mb-5" style={{gridTemplateColumns:`repeat(auto-fit,minmax(${mob?140:170}px,1fr))`}}>
      <Stat icon="briefcase" label={t("employer.home.liveListings")} value={jobs.filter(j=>j.status==="live").length} tone={C.brand} onClick={()=>A.go("empJobs")}/>
      <Stat icon="users" label={t("employer.home.totalApplicants")} value={apps.length} onClick={()=>A.go("empPipeline")}/>
      <Stat icon="calendar" label={t("employer.home.inInterview")} value={byStage.Interview||0} tone={C.warn}/>
      <Stat icon="award" label={t("employer.home.offersOut")} value={byStage.Offer||0} tone={C.ok}/></div>
    <div className="grid gap-4" style={{gridTemplateColumns:mob?"1fr":"1.4fr 1fr"}}>
      <Card>
        <H2 action={<Btn kind="ghost" size="sm" onClick={()=>A.go("empJobs")}>{t("employer.home.manageAll")}</Btn>}>{t("employer.home.yourListings")}</H2>
        {jobs.length===0?<Empty icon="briefcase" title={t("employer.home.noListingsYet")} body={t("employer.home.noListingsBody")}
          action={<Btn kind="primary" icon="plus" onClick={()=>A.go("empPost")}>{t("employer.home.postAJob")}</Btn>}/>
          :jobs.slice(0,6).map(j=>{const n=A.applications.filter(a=>a.job===j.id).length;
            return <div key={j.id} onClick={()=>A.go("empPipeline")} className="flex items-center gap-3 py-3 border-b border-line-soft cursor-pointer">
              <div className={`w-2 h-2 rounded-full shrink-0 ${j.status==="live"?"bg-ok":j.status==="paused"?"bg-warn":"bg-text-3"}`}/>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-text overflow-hidden text-ellipsis whitespace-nowrap">{j.t}</div>
                <div className="text-xs text-text-3 mt-1">{t(n===1?"employer.home.applicantOne":"employer.home.applicantOther",{n})} • {t("employer.home.viewsCount",{n:formatNumber(j.views,locale)})} • {j.posted}</div></div>
              <Tag tone={jobTone(j.status)} sm>{jobStatusLabel(j.status,t)}</Tag></div>;})}</Card>
      <div className="flex flex-col gap-4">
        <Card><H2>{t("employer.home.pipeline")}</H2>
          {stages.map(s=>{const n=byStage[s]||0;
            return <div key={s} className="mb-3.5">
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-text-2 font-medium">{s}</span><span className="font-bold text-brand">{n}</span></div>
              <Bar v={apps.length?(n/apps.length)*100:0} h={6}/></div>;})}</Card>
        <Card><H2>{t("employer.home.quickActions")}</H2>
          {[["plus",t("employer.home.qaPostJob"),"empPost"],["users",t("employer.home.qaReviewCandidates"),"empPipeline"],
            ["book",t("employer.home.qaPublishArticle"),"empContent"],["wallet",t("employer.home.qaBilling"),"empBilling"]].map(([ic,l,p])=>
            <button key={l} onClick={()=>A.go(p)} className="flex items-center gap-2.5 w-full py-2.5 px-2.5 rounded-lg border-0 bg-transparent cursor-pointer text-sm text-text text-left hover:bg-bg transition-colors duration-150">
              <I n={ic} s={17} c={C.brand}/>{l}</button>)}</Card></div></div>
  </Page>;
}

export function EmpJobs(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const jobs=A.jobs.filter(j=>j.e===A.company.id);
  const pg=usePagination(jobs,20);
  const [showImport,setShowImport]=useState(false);
  const [csv,setCsv]=useState(""); const [importResult,setImportResult]=useState(null);
  const sampleCSV="title,city,province,type,pay_low,pay_high,pay_unit,category,mode,vacancies,experience,education,skills,perks,duties,requirements,description\nJourneyperson Electrician,Calgary,Alberta,Full Time,42,52,hr,trades,On-site,2,3+ years,Apprenticeship / trade certificate,Red Seal;WHMIS;Fall Protection,Health benefits;RRSP match,Site fit-out;Panel installation;Testing,Red Seal cert;5+ years commercial,Hiring a Red Seal electrician for commercial fit-outs in Calgary.";
  const applicantsN=A.applications.filter(a=>jobs.some(j=>j.id===a.job)).length;
  return <Page wide>
    <H1 sub={t(jobs.length===1?"employer.jobs.subtitleOne":"employer.jobs.subtitleOther",{n:jobs.length,a:applicantsN})}
      action={<div className="flex gap-2.5 flex-wrap">
        {A.can("csvImport")?<Btn kind="outline" icon="upload" onClick={()=>setShowImport(true)}>{t("employer.jobs.importCsv")}</Btn>:<Btn kind="ghost" icon="lock" onClick={()=>A.go("pricing")} title={t("employer.jobs.csvImportTitle")}>{t("employer.jobs.csvImportLocked")}</Btn>}
        <Btn kind="primary" icon="plus" onClick={()=>A.go("empPost")}>{t("employer.jobs.postAJob")}</Btn></div>}>{t("employer.jobs.title")}</H1>
    {showImport&&<Modal onClose={()=>{setShowImport(false);setImportResult(null);setCsv("");}} title={t("employer.jobs.importTitle")}>
      <p className="text-sm text-text-2 leading-snug mb-3.5">{t("employer.jobs.importIntroBefore")} <strong className="text-text">{t("employer.jobs.requiredCols")}</strong>{t("employer.jobs.importIntroAfter")}</p>
      <div className="flex gap-2 mb-3.5">
        <Btn kind="outline" size="sm" onClick={()=>setCsv(sampleCSV)}>{t("employer.jobs.loadExample")}</Btn>
        <Btn kind="ghost" size="sm" onClick={()=>setCsv("")}>{t("employer.jobs.clear")}</Btn></div>
      <Area rows={10} value={csv} onChange={e=>setCsv(e.target.value)} placeholder={t("employer.jobs.csvPlaceholder")} style={{fontFamily:"ui-monospace,monospace",fontSize:12.5}}/>
      {importResult&&<Banner tone={importResult.ok?"ok":"danger"} icon={importResult.ok?"check":"alert"} title={importResult.ok?t(importResult.imported===1?"employer.jobs.importedOne":"employer.jobs.importedOther",{n:importResult.imported}):t("employer.jobs.importFailed")} style={{marginTop:14}}>
        {importResult.ok?<>{t("employer.jobs.importedBody")}{importResult.errors?.length?t("employer.jobs.skippedRows",{n:importResult.errors.length}):""}</>:importResult.msg}</Banner>}
      <div className="flex gap-2.5 justify-end mt-3.5">
        <Btn kind="ghost" onClick={()=>{setShowImport(false);setImportResult(null);setCsv("");}}>{t("employer.jobs.cancel")}</Btn>
        <Btn kind="primary" icon="upload" disabled={!csv.trim()} onClick={async()=>{const r=await A.importJobsCSV(csv);setImportResult(r);if(r.ok&&!r.errors?.length){setTimeout(()=>{setShowImport(false);setImportResult(null);setCsv("");},1500);}}}>{t("employer.jobs.import")}</Btn></div>
    </Modal>}
    {jobs.length===0?<Empty icon="briefcase" title={t("employer.home.noListingsYet")} body={t("employer.jobs.noListingsYetBody")}
      action={<Btn kind="primary" icon="plus" onClick={()=>A.go("empPost")}>{t("employer.jobs.postAJob")}</Btn>}/>
      :<><div className="flex flex-col gap-3">
        {pg.pageItems.map((j,i)=>{const apps=A.applications.filter(a=>a.job===j.id);
          return <Card key={j.id} delay={Math.min(i,6)*0.04}>
            <div className="flex gap-3.5 items-start flex-wrap">
              <div className="grow shrink basis-60 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-bold text-text tracking-tight" style={{fontSize:16.5}}>{j.t}</span>
                  <Tag tone={jobTone(j.status)} sm>{jobStatusLabel(j.status,t)}</Tag>
                  {j.flagged&&<Tag tone="danger" sm icon="alert">{t("employer.jobs.flaggedByAdmin")}</Tag>}
                  {j.pendingOwnerApproval&&<Tag tone="warn" sm icon="shield">{t("employer.jobs.needsOwnerApproval")}</Tag>}</div>
                <div className="text-sm text-text-2 mt-1.5">{j.city}, {j.prov} • {j.mode} • {j.type} • {pay(j)}{payShort(j)}</div>
                <div className="flex gap-5 mt-3 flex-wrap">
                  {[[t("employer.jobs.colApplicants"),apps.length],[t("employer.jobs.colViews"),formatNumber(j.views,locale)],[t("employer.jobs.colPosted"),j.posted],[t("employer.jobs.colCloses"),dlText(j.dl)]].map(([k,v])=>
                    <div key={k}><div className="text-xs text-text-3">{k}</div>
                      <div className="text-base font-bold text-text mt-0.5">{v}</div></div>)}</div></div>
              <div className="flex gap-2 flex-wrap items-center">
                <Btn kind="outline" size="sm" onClick={()=>A.openJob(j.id,{preview:true})}>{t("employer.jobs.preview")}</Btn>
                {j.pendingOwnerApproval&&A.user?.employerRole==="owner"&&
                  <Btn kind="ok" size="sm" icon="check" onClick={()=>A.approveJob(j.id)}>{t("employer.jobs.approve")}</Btn>}
                <Btn kind="outline" size="sm" onClick={()=>A.toggleJobStatus(j.id)}>{j.status==="live"?t("employer.jobs.pause"):t("employer.jobs.reopen")}</Btn>
                <Btn kind="primary" size="sm" onClick={()=>{A.setPipelineJob(j.id);A.go("empPipeline");}}>{t("employer.jobs.candidatesN",{n:apps.length})}</Btn></div></div></Card>;})}</div>
      <Pagination {...pg}/></>}
  </Page>;
}

const JOBPOST_DRAFT_KEY="northhire.jobPostDraft";
const _defaultJobPostData=()=>({t:"",cat:"trades",type:"Full Time",mode:"On-site",desc:"",
    skills:[],mustHave:[],location:"",city:"",prov:"Ontario",
    payType:"range",  /* range | fixed */
    payPeriod:"hr",   /* hr | yr | contract */
    lo:"",hi:"",fixed:"",contractAmt:"",
    vac:1,exp:"",yearsExp:0,edu:"",
    dlDate:"", /* absolute date, replaces days */
    perks:[],duties:"",reqs:"",how:"",urgent:false,featured:false,
    aiSeed:0, /* incremented each Regenerate click so identical inputs still produce a fresh draft */
    /* Ontario Bill 149 disclosures. aiScreening starts true because this platform really does
       auto-score every applicant - turning it off is the claim that needs a deliberate act. */
    aiScreening:true,vacancyConfirmed:false,
    questions:[]});
const _loadJobPostDraft=()=>{try{return JSON.parse(sessionStorage.getItem(JOBPOST_DRAFT_KEY)||"null");}catch{return null;}};

export function EmpPost(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const draft=_loadJobPostDraft();
  const [resumed]=useState(!!draft&&draft.step>1);
  const [step,setStep]=useState(draft?.step||1); const [err,setErr]=useState({});
  const [f,setF]=useState(draft?.f||_defaultJobPostData());
  /* A refresh mid-wizard used to lose every field with no warning - persist the draft the same
     way SignupPage does, since it's the same class of bug. */
  useEffect(()=>{try{sessionStorage.setItem(JOBPOST_DRAFT_KEY,JSON.stringify({step,f}));}catch{}},[step,f]);
  const discardDraft=()=>{try{sessionStorage.removeItem(JOBPOST_DRAFT_KEY);}catch{} setStep(1); setF(_defaultJobPostData()); setErr({});};

  const set=(k,v)=>{setF(p=>({...p,[k]:v}));setErr(e=>({...e,[k]:undefined}));};
  const setLocation=loc=>{const parts=loc.split(",").map(s=>s.trim());
    setF(p=>({...p,location:loc,city:parts[0]||"",prov:PROVS.find(pr=>PCODE[pr]===parts[1])||p.prov}));};

  /* Merge new items into a list without dropping anything the user already added or edited. */
  const _mergeList=(existing,fresh)=>{
    const seen=new Set((existing||[]).map(x=>String(x).trim().toLowerCase()));
    const out=[...(existing||[])];
    (fresh||[]).forEach(x=>{const k=String(x).trim().toLowerCase(); if(k&&!seen.has(k)){out.push(x);seen.add(k);}});
    return out;
  };
  /* Regenerate always bumps aiSeed so the same inputs still produce a materially different
     output; a first-time Generate keeps the seed at 0 for a stable initial suggestion. */
  const applyAI=(regenerate=false)=>{
    const seed=regenerate?(f.aiSeed||0)+1:(f.aiSeed||0);
    const s=aiSuggestJD({title:f.t,cat:f.cat,type:f.type,mode:f.mode,exp:f.exp,edu:f.edu,seed,
      adminBenefits:A.platformConfig?.jobAiBenefitsBySector,
      adminQuestions:A.platformConfig?.jobAiQuestionsBySector});
    setF(p=>({...p,
      aiSeed:seed,
      desc:regenerate?s.desc:(p.desc?.trim()?p.desc:s.desc),
      duties:regenerate?s.duties.map(x=>`• ${x}`).join("\n"):(p.duties?.trim()?p.duties:s.duties.map(x=>`• ${x}`).join("\n")),
      reqs:regenerate?s.reqs.map(x=>`• ${x}`).join("\n"):(p.reqs?.trim()?p.reqs:s.reqs.map(x=>`• ${x}`).join("\n")),
      mustHave:regenerate?s.mustHave:_mergeList(p.mustHave,s.mustHave),
      skills:regenerate?s.niceToHave:_mergeList(p.skills,s.niceToHave),
      perks:regenerate?s.benefits:_mergeList(p.perks,s.benefits),
      questions:regenerate?s.questions.map((q,i)=>({id:`ai${seed}_${i}`,type:q.type,prompt:q.prompt,required:q.required,options:[]})):p.questions,
    }));
  };
  /* AI-generate button gates on ALL five upstream fields being explicitly chosen. Defaults are
     empty for exp/edu so the employer must make a real selection before the AI runs; without
     that gate the AI output ignored these dimensions and every listing looked the same. */
  const aiReady=!!(f.t.trim()&&f.cat&&f.type&&f.mode&&f.exp&&f.edu);
  const aiUsed=(f.aiSeed||0)>0||!!(f.mustHave.length||f.perks.length||f.questions.length);

  /* Which posting laws bind this listing, decided by where the WORK is (that's what "advertised
     in Ontario/BC" turns on), falling back to the company's own province before a location is
     picked. See helpers/jobPostingLaw.js - the server re-checks all of this on publish. */
  const lawRules=postingRules({prov:PCODE[f.prov]||A.company?.prov,employerSize:A.company?.size});
  /* Per-province legal minimum wage, admin-editable via platform_config.minWageByProvince
     (see server/platformConfig.js DEFAULT_MIN_WAGE_BY_PROVINCE). Used to seed placeholders and
     to warn (not block) when the entered hourly wage sits below the provincial floor - the
     platform must not silently allow illegal ads while giving the employer a clear signal. */
  const _MIN_WAGE_FALLBACK={AB:15.00,BC:17.85,MB:15.80,NB:15.30,NL:15.60,NS:15.20,ON:17.20,PE:16.00,QC:15.75,SK:15.00,NT:16.05,YT:17.59,NU:19.00};
  const provCode=PCODE[f.prov]||"ON";
  const provMinWage=(A.platformConfig?.minWageByProvince||_MIN_WAGE_FALLBACK)[provCode]||15.00;
  const wageValue=f.payType==="range"?Number(f.lo||0):Number(f.fixed||0);
  const belowProvinceMin=f.payPeriod==="hr"&&wageValue>0&&wageValue<provMinWage;

  const validate=()=>{const e={};
    if(step===1){
      if(!f.t.trim())e.t=t("employer.post.titleRequired");
      if(!f.exp)e.exp=t("employer.post.expRequired")||"Pick an experience level";
      if(!f.edu)e.edu=t("employer.post.eduRequired")||"Pick an education level";
      const descTxt=(f.desc||"").replace(/<[^>]+>/g,"").trim();
      if(descTxt.length<40)e.desc=t("employer.post.descTooShort");
      if(f.mustHave.length===0)e.mustHave=t("employer.post.mustHaveRequired");
      if(lawRules.noCanadianExperience){
        const hit=findCanadianExperience([f.t,f.desc,f.duties,f.reqs]);
        if(hit)e.desc=t("employer.post.billNoCanExpDesc",{hit});
      }
    }
    if(step===2){
      if(!f.location.trim())e.location=t("employer.post.locationRequired");
      /* Presence + hi>lo alone let $1/hr or $1,000,000/hr both through - add sane per-period
         bounds so an obvious fat-finger (missing a digit, an extra zero) gets caught here
         instead of publishing a listing no one would believe. */
      /* Hourly floor is only the fat-finger catch ($10 rules out obvious garbage). The
         province-min check is a soft warning banner rendered next to the input - blocking
         submit here would force employers to keep two floors in sync in their head. */
      const bounds={hr:[10,500],yr:[20000,500000],contract:[100,10000000]}[f.payPeriod]||[0,Infinity];
      const [minV,maxV]=bounds;
      const realisticKey=f.payPeriod==="hr"?"employer.post.realisticAmountHourly":f.payPeriod==="yr"?"employer.post.realisticAmountYearly":f.payPeriod==="contract"?"employer.post.realisticAmountContract":"employer.post.realisticAmount";
      const boundsParams={lo:`$${minV.toLocaleString()}`,hi:`$${maxV.toLocaleString()}`};
      if(f.payType==="range"){
        if(!f.lo)e.lo=t("employer.post.required"); if(!f.hi)e.hi=t("employer.post.required");
        if(f.lo&&f.hi&&Number(f.hi)<Number(f.lo))e.hi=t("employer.post.maxAboveMin");
        if(f.lo&&(Number(f.lo)<minV||Number(f.lo)>maxV))e.lo=t(realisticKey,boundsParams);
        if(f.hi&&(Number(f.hi)<minV||Number(f.hi)>maxV)&&!e.lo)e.hi=t(realisticKey,boundsParams);
      } else {
        if(!f.fixed)e.fixed=t("employer.post.required");
        else if(Number(f.fixed)<minV||Number(f.fixed)>maxV)e.fixed=t("employer.post.realisticAmount",boundsParams);
      }
      if(!f.dlDate)e.dlDate=t("employer.post.closingDateRequired");
      if(f.payType==="range"&&f.lo&&f.hi&&!e.lo&&!e.hi){
        const rangeErr=checkPayRange({lo:f.lo,hi:f.hi,unit:f.payPeriod,rules:lawRules});
        if(rangeErr)e.hi=rangeErr;
      }
      if(lawRules.vacancyConfirm&&!f.vacancyConfirmed)e.vacancyConfirmed=t("employer.post.vacancyConfirmRequired");
      if(lawRules.noCanadianExperience){
        const hit=findCanadianExperience([f.how,...(f.questions||[]).map(q=>q.prompt)]);
        if(hit)e.how=t("employer.post.billNoCanExpHow",{hit});
      }
    }
    setErr(e); if(Object.keys(e).length){focusFirstError(e); return false;} return true;};

  const featuredUsed=A.jobs.filter(j=>j.e===A.company.id&&j.featured&&j.status==="live").length;
  const featuredLimit=A.limitOf("featured");
  const canFeature=A.can("featured")&&featuredUsed<featuredLimit;

  const [postErr,setPostErr]=useState("");
  const [posting,setPosting]=useState(false);
  const next=async()=>{if(!validate())return;
    if(step<3){setStep(step+1);return;}
    /* Backfill legacy fields the store expects */
    const payload={...f,
      skills:[...f.mustHave,...f.skills].join(","),
      lo:f.payType==="range"?f.lo:f.fixed,
      hi:f.payType==="range"?f.hi:f.fixed,
      unit:f.payPeriod,
      perks:(f.perks||[]).join(","),
      dl:f.dlDate?Math.max(1,Math.ceil((new Date(f.dlDate)-new Date())/(1000*60*60*24))):14,
      featured:f.featured,
      aiScreening:f.aiScreening,vacancyConfirmed:f.vacancyConfirmed};
    setPosting(true);
    const r=await A.publishJob(payload);
    setPosting(false);
    if(r&&!r.ok)setPostErr(r.msg);
    else try{sessionStorage.removeItem(JOBPOST_DRAFT_KEY);}catch{}
  };

  const steps=[t("employer.post.stepRoleDetails"),t("employer.post.stepPayLocation"),t("employer.post.stepApplication")];
  const today=new Date().toISOString().slice(0,10);
  const maxDate=(()=>{const d=new Date();d.setMonth(d.getMonth()+3);return d.toISOString().slice(0,10);})();

  return <Page narrow>
    <H1 sub={t("employer.post.subtitle")}>{t("employer.post.title")}</H1>

    {resumed&&<Banner tone="brand" icon="clock" style={{marginBottom:16}}
      action={<button onClick={discardDraft} className="bg-transparent border-0 p-0 cursor-pointer text-sm font-semibold text-brand">{t("employer.post.startOver")}</button>}>
      {t("employer.post.resumedBanner")}</Banner>}
    {postErr&&<Banner tone="danger" icon="alert" title={t("employer.post.cannotPublish")} style={{marginBottom:16}}
      action={<Btn kind="primary" size="sm" onClick={()=>A.go("pricing")}>{t("employer.post.seePlans")}</Btn>}>{postErr}</Banner>}

    <Card pad={mob?16:20} style={{marginBottom:16}}>
      <div className="flex items-center">
        {steps.map((s,i)=><div key={s} className="flex items-center min-w-0" style={{flex:i<2?1:"0 0 auto"}}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-200"
              style={{background:step>i+1?C.ok:step===i+1?C.brand:C.lineSoft,color:step>=i+1?"#fff":C.text3}}>
              {step>i+1?<I n="check" s={14} c="#fff" w={3}/>:i+1}</div>
            {!mob&&<span className="text-sm whitespace-nowrap" style={{fontWeight:step===i+1?650:500,color:step===i+1?C.text:C.text3}}>{s}</span>}</div>
          {i<2&&<div className="flex-1 h-0.5 rounded-full mx-2.5 transition-colors duration-300" style={{background:step>i+1?C.ok:C.lineSoft,minWidth:14}}/>}</div>)}</div></Card>

    <Card pad={mob?20:26}>
      <div key={step} style={{animation:"slideIn .26s ease both"}}>

      {step===1&&<div className="flex flex-col gap-5">
        <H2 sub={t("employer.post.roleDetailsSub")}>{t("employer.post.stepRoleDetails")}</H2>

        <Field label={t("employer.post.jobTitle")} required error={err.t} name="t">
          <Input value={f.t} onChange={e=>set("t",e.target.value)}
            placeholder={t("employer.post.jobTitlePlaceholder")} invalid={!!err.t}/></Field>

        {/* Ordering: sector → type → mode → experience → education → description. The AI helper
            depends on every one of these five, so the wizard now surfaces them BEFORE the Auto
            Fill button, and the button stays disabled until they're all set. Previously the
            wizard buried experience+education below the description, so the AI never saw them
            and every listing came out identical. */}
        <div className={`grid gap-3 ${mob?"grid-cols-1":"grid-cols-3"}`}>
          <Field label={t("employer.post.sector")} required><Sel value={f.cat} onChange={e=>set("cat",e.target.value)}>
            {CATS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</Sel></Field>
          <Field label={t("employer.post.employmentType")}><Sel value={f.type} onChange={e=>set("type",e.target.value)}>
            {["Full Time","Part Time","Contract","Seasonal","Apprenticeship","Casual"].map(o=><option key={o}>{o}</option>)}</Sel></Field>
          <Field label={t("employer.post.workSetting")}><Sel value={f.mode} onChange={e=>set("mode",e.target.value)}>
            {["On-site","Hybrid","Remote"].map(o=><option key={o}>{o}</option>)}</Sel></Field>
        </div>

        <div className={`grid gap-3 ${mob?"grid-cols-1":"grid-cols-2"}`}>
          <Field label={t("employer.post.experienceRequired")} required error={err.exp} name="exp">
            <Sel value={f.exp} onChange={e=>set("exp",e.target.value)} invalid={!!err.exp}>
              <option value="">{t("employer.post.selectPlaceholder")||"Select…"}</option>
              {["No experience required","Entry level welcome","1+ years","2+ years","3+ years","4+ years","5+ years","10+ years"].map(o=><option key={o}>{o}</option>)}</Sel></Field>
          <Field label={t("employer.post.educationRequired")} required error={err.edu} name="edu">
            <Sel value={f.edu} onChange={e=>set("edu",e.target.value)} invalid={!!err.edu}>
              <option value="">{t("employer.post.selectPlaceholder")||"Select…"}</option>
              {["No formal education required","High School Diploma","Apprenticeship / trade certificate","College Diploma","Bachelor's Degree or equivalent","Red Seal Certificate","Professional registration","Master's Degree","Doctorate"].map(o=><option key={o}>{o}</option>)}</Sel></Field>
        </div>

        <div className="rounded-xl border border-line-2 p-3.5 flex gap-3 items-center flex-wrap" style={{background:`linear-gradient(135deg,${C.tint} 0%,#F0F7FF 100%)`}}>
          <div className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center shrink-0"><I n="sparkle" s={19}/></div>
          <div className="flex-1 min-w-0" style={{minWidth:200}}>
            <div className="text-sm font-semibold text-text">{t("employer.post.autoFillTitle")}</div>
            <div className="text-xs text-text-2 mt-0.5">
              {aiReady?t("employer.post.autoFillBody"):(t("employer.post.autoFillNeedFields")||"Pick sector, employment type, work setting, experience and education first.")}
            </div>
          </div>
          <div className="flex gap-2">
            {aiUsed&&<Btn kind="outline" size="sm" icon="refresh" onClick={()=>applyAI(true)} disabled={!aiReady}>{t("employer.post.regenerate")||"Regenerate"}</Btn>}
            <Btn kind="primary" size="sm" icon="sparkle" onClick={()=>applyAI(false)} disabled={!aiReady}>
              {aiReady?(t("employer.post.suggest")):(t("employer.post.autoFillNeedFieldsShort")||"Fill fields above")}
            </Btn>
          </div>
        </div>

        <Field label={t("employer.post.jobDescription")} required error={err.desc} name="desc" hint={t("employer.post.jobDescriptionHint")}>
          <RichText value={f.desc} onChange={v=>set("desc",v)}
            placeholder={t("employer.post.jobDescriptionPlaceholder")} rows={6}/></Field>

        <Field label={t("employer.post.mainDuties")} hint={t("employer.post.mainDutiesHint")}>
          <RichText value={f.duties} onChange={v=>set("duties",v)}
            placeholder={t("employer.post.mainDutiesPlaceholder")} rows={5}/></Field>

        <Field label={t("employer.post.requirements")} hint={t("employer.post.requirementsHint")}>
          <RichText value={f.reqs} onChange={v=>set("reqs",v)}
            placeholder={t("employer.post.requirementsPlaceholder")} rows={5}/></Field>

        <Field label={t("employer.post.mustHaveSkills")} required error={err.mustHave} name="mustHave"
          hint={t("employer.post.mustHaveHint")}>
          <InlineList value={f.mustHave} onChange={v=>set("mustHave",v)} icon="check"
            placeholder={t("employer.post.mustHavePlaceholder")}/></Field>

        <Field label={t("employer.post.niceToHaveSkills")} hint={t("employer.post.niceToHaveHint")}>
          <InlineList value={f.skills} onChange={v=>set("skills",v)} icon="sparkle"
            placeholder={t("employer.post.niceToHavePlaceholder")}/></Field>
      </div>}

      {step===2&&<div className="flex flex-col gap-5">
        <H2 sub={t("employer.post.payLocationSub")}>{t("employer.post.stepPayLocation")}</H2>

        <Field label={t("employer.post.location")} required error={err.location} name="location"
          hint={t("employer.post.locationHint")}>
          <LocationInput value={f.location} onChange={setLocation}
            placeholder={t("employer.post.locationPlaceholder")}/></Field>

        <Field label={t("employer.post.payStructure")}>
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            {[["range",t("employer.post.payRange")],["fixed",t("employer.post.payFixed")]].map(([k,l])=>
              <button key={k} type="button" onClick={()=>set("payType",k)}
                className={`p-3 rounded-xl cursor-pointer text-sm transition-all duration-150 border-2 ${f.payType===k?"border-brand bg-tint text-brand font-semibold":"border-line bg-white text-text font-medium"}`}>{l}</button>)}
          </div>
          <div className="grid gap-3" style={{gridTemplateColumns:mob?"1fr":f.payType==="range"?"1fr 1fr 1fr":"1fr 1fr"}}>
            {f.payType==="range"?<>
              <Field label={t("employer.post.minimum")} error={err.lo} name="lo"><Input icon="wallet" type="number" inputMode="decimal" min="0" value={f.lo} onChange={e=>set("lo",e.target.value.replace(/[^\d.]/g,""))} placeholder={f.payPeriod==="yr"?"60000":f.payPeriod==="hr"?String(provMinWage):"28"} invalid={!!err.lo}/></Field>
              <Field label={t("employer.post.maximum")} error={err.hi} name="hi"><Input icon="wallet" type="number" inputMode="decimal" min="0" value={f.hi} onChange={e=>set("hi",e.target.value.replace(/[^\d.]/g,""))} placeholder={f.payPeriod==="yr"?"80000":f.payPeriod==="hr"?String((provMinWage*1.4).toFixed(2)):"36"} invalid={!!err.hi}/></Field>
            </>:<Field label={t("employer.post.amount")} error={err.fixed} name="fixed"><Input icon="wallet" type="number" inputMode="decimal" min="0" value={f.fixed} onChange={e=>set("fixed",e.target.value.replace(/[^\d.]/g,""))} placeholder={f.payPeriod==="yr"?"70000":f.payPeriod==="hr"?String(provMinWage):"32"} invalid={!!err.fixed}/></Field>}
            <Field label={t("employer.post.payPeriod")}><Sel value={f.payPeriod} onChange={e=>set("payPeriod",e.target.value)}>
              <option value="hr">{t("employer.post.perHour")}</option>
              <option value="yr">{t("employer.post.perYear")}</option>
              <option value="mi">{t("employer.post.perMile")}</option>
              <option value="contract">{t("employer.post.totalContract")}</option></Sel></Field>
          </div>
          {belowProvinceMin&&<div className="mt-2.5 rounded-xl border border-warn-ln bg-warn-bg p-3 flex gap-2.5 items-start">
            <I n="alert" s={17} c={C.warn}/>
            <div className="min-w-0 text-xs text-text-2 leading-relaxed">
              <div className="font-semibold text-text mb-1">
                {t("employer.post.belowProvMinTitle",{prov:PCODE[f.prov]||"—",min:`$${provMinWage.toFixed(2)}`})||`This wage is below the legal minimum for ${PCODE[f.prov]} ($${provMinWage.toFixed(2)}/hr).`}
              </div>
              {t("employer.post.belowProvMinBody")||"You can still publish, but paying below the provincial minimum is illegal in most cases. Confirm the wage before continuing."}
            </div>
          </div>}
        </Field>

        <div className={`grid gap-3 ${mob?"grid-cols-1":"grid-cols-2"}`}>
          <Field label={t("employer.post.numVacancies")}><Input type="number" min="1" value={f.vac} onChange={e=>set("vac",Math.max(1,Number(e.target.value)||1))}/></Field>
          <Field label={t("employer.post.applicationCloses")} required error={err.dlDate} name="dlDate">
            <DatePicker value={f.dlDate} onChange={v=>set("dlDate",v)} min={today} max={maxDate}/></Field>
        </div>

        <Field label={t("employer.post.benefitsOffered")} hint={t("employer.post.benefitsHint")}>
          <InlineList value={f.perks} onChange={v=>set("perks",v)} icon="heart"
            placeholder={t("employer.post.benefitsPlaceholder")}/></Field>

        <Field label={t("employer.post.howToApply")} hint={t("employer.post.howToApplyHint")}>
          <Area rows={3} value={f.how} onChange={e=>set("how",e.target.value)}
            placeholder={t("employer.post.howToApplyPlaceholder")}/></Field>

        <div className="bg-bg border border-line rounded-xl p-4 mt-1.5">
          <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
            <div>
              <div className="text-sm font-semibold text-text">{t("employer.post.additionalQuestions")}</div>
              <div className="text-xs text-text-2 mt-1">{t("employer.post.additionalQuestionsHint")}</div>
            </div>
            <Tag tone="brand" sm>{t("employer.post.addedCount",{n:f.questions.length})}</Tag>
          </div>
          <QuestionBuilder value={f.questions} onChange={v=>set("questions",v)}/>
        </div>

        {(lawRules.aiDisclosure||lawRules.vacancyConfirm)&&
          <div className="rounded-xl border border-warn-ln bg-warn-bg p-4 mt-1.5">
            <div className="flex items-start gap-2.5 mb-3">
              <I n="alert" s={17} c={C.warn}/>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-text">{t("employer.post.requiredDisclosuresTitle")}</div>
                <div className="text-xs text-text-2 mt-1 leading-relaxed">
                  {t("employer.post.requiredDisclosuresBody")}</div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3.5 py-3 border-t border-warn-ln">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-text">{t("employer.post.aiUsedTitle")}</div>
                <div className="text-xs text-text-2 mt-0.5 leading-snug">
                  {t("employer.post.aiUsedBody")}</div>
              </div>
              <Switch on={f.aiScreening} onChange={v=>set("aiScreening",v)}/>
            </div>
            <div className="pt-3 border-t border-warn-ln">
              <CheckRow on={f.vacancyConfirmed} onChange={v=>set("vacancyConfirmed",v)}
                label={t("employer.post.vacancyConfirmLabel")}
                sub={t("employer.post.vacancyConfirmSub")}/>
              {err.vacancyConfirmed&&<div className="text-xs font-semibold text-red mt-1.5">{err.vacancyConfirmed}</div>}
            </div>
          </div>}

        <div className="flex items-center justify-between gap-3.5 py-3.5 border-t border-line-soft mt-2">
          <div><div className="text-sm font-semibold text-text">{t("employer.post.markUrgent")}</div>
            <div className="text-xs text-text-2 mt-0.5">{t("employer.post.markUrgentSub")}</div></div>
          <Switch on={f.urgent} onChange={v=>set("urgent",v)}/></div>
        <div className="flex items-center justify-between gap-3.5 py-3.5 border-t border-line-soft">
          <div><div className="text-sm font-semibold text-text">{t("employer.post.featureListing")}</div>
            <div className="text-xs text-text-2 mt-0.5">
              {A.can("featured")
                ?t("employer.post.featurePinned",{used:featuredUsed,limit:featuredLimit===Infinity?t("employer.post.featureUnlimited"):featuredLimit})
                :t("employer.post.featureAvailable")}
              {!A.can("featured")&&<button type="button" onClick={()=>A.go("pricing")} className="bg-transparent border-0 p-0 ml-1 cursor-pointer text-brand font-semibold underline">{t("employer.post.seePlansLink")}</button>}
            </div></div>
          <Switch on={f.featured} onChange={v=>set("featured",v)} disabled={!canFeature&&!f.featured}/></div>
      </div>}

      {step===3&&<div>
        <H2 sub="This is exactly how candidates will see it">Review and publish</H2>
        <div className="bg-bg border border-line rounded-2xl p-5 mb-4">
          <div className="text-xl font-bold text-text tracking-tight">{f.t||"Untitled role"}</div>
          <div className="text-sm text-text-2 mt-1.5">{A.company.name} • {f.location||"Location"} • {f.mode}</div>
          <div className="inline-flex items-baseline gap-1.5 bg-tint border border-line-2 rounded-xl py-2.5 px-3.5 my-3.5">
            <span className="text-lg font-bold text-brand tracking-tight">
              {f.payType==="range"
                ? (f.payPeriod==="yr"?`$${Math.round(Number(f.lo)/1000)}k – $${Math.round(Number(f.hi)/1000)}k`:`$${f.lo} – $${f.hi}`)
                : (f.payPeriod==="yr"?`$${Math.round(Number(f.fixed)/1000)}k`:`$${f.fixed}`)}</span>
            <span className="text-xs text-brand opacity-75">{{"yr":"per year","mi":"per mile","contract":"total","hr":"per hour"}[f.payPeriod]}</span></div>
          <div className="flex gap-2 flex-wrap mb-3.5">
            <Tag sm>{f.type}</Tag><Tag sm>{CATM[f.cat].label}</Tag>
            {f.mode!=="On-site"&&<Tag tone="ok" sm>{f.mode}</Tag>}
            {f.urgent&&<Tag tone="warn" sm>Urgent</Tag>}
            {f.featured&&<Tag tone="violet" sm>Featured</Tag>}
            <Tag sm>{f.vac} {f.vac==1?"opening":"openings"}</Tag>
            <Tag sm>Closes {f.dlDate||"—"}</Tag></div>
          {f.desc&&<div className="rich-content text-sm text-text-2 leading-relaxed" dangerouslySetInnerHTML={{__html:sanitizeHtml(f.desc)}}/>}
          {f.mustHave.length>0&&<div className="mt-3.5">
            <div className="text-xs font-bold text-brand tracking-wide uppercase mb-1.5">Must-have</div>
            <div className="flex flex-wrap gap-1.5">
              {f.mustHave.map(s=><Tag key={s} tone="brand" sm>{s}</Tag>)}</div>
          </div>}
          {f.skills.length>0&&<div className="mt-2.5">
            <div className="text-xs font-bold text-text-3 tracking-wide uppercase mb-1.5">Nice to have</div>
            <div className="flex flex-wrap gap-1.5">
              {f.skills.map(s=><Tag key={s} tone="dark" sm>{s}</Tag>)}</div>
          </div>}
          {f.questions.length>0&&<div className="mt-3.5 p-3 bg-white border border-line rounded-lg">
            <div className="text-xs font-semibold text-text mb-1.5">Application questions ({f.questions.length})</div>
            <div className="text-xs text-text-2 leading-snug">{f.questions.map(q=>q.prompt||"(empty)").join(" • ")}</div>
          </div>}
          {(lawRules.aiDisclosure&&f.aiScreening)&&<div className="mt-3.5 p-3 bg-white border border-line rounded-lg">
            <div className="text-xs font-semibold text-text mb-1">Required disclosure shown to candidates</div>
            <div className="text-xs text-text-2 leading-snug">{AI_DISCLOSURE_TEXT}</div>
          </div>}
        </div>
        <Banner tone="brand" icon="sparkle" title="Scoring is automatic">
          Every applicant is scored out of 100 against your must-have skills and experience. Your pipeline shows the best fit first, ranked by the system.</Banner>
      </div>}

      </div>
      <div className="flex justify-between gap-2.5 mt-6 pt-5 border-t border-line-soft">
        <Btn kind="ghost" icon="arrowL" onClick={()=>step===1?A.go("empJobs"):setStep(step-1)}>{step===1?"Cancel":"Back"}</Btn>
        <Btn kind={step===3?"ok":"primary"} size="lg" iconR={step===3?"check":"arrowR"} onClick={next} disabled={posting}>
          {posting?"Publishing…":step===3?"Publish listing":"Continue"}</Btn></div>
    </Card>
  </Page>;
}

/* ─── Pipeline kanban: real drag-and-drop via @dnd-kit, on top of the existing Advance/Back
   buttons (kept as the accessible, no-pointer-required path - drag is an addition, not a
   replacement). A PointerSensor activation distance stops an ordinary click-to-open-candidate
   from being swallowed as an accidental drag. ─── */
function _PipelineCard({a,u,s,idx,selected,tog,A,notice,stages,t}){
  const {attributes,listeners,setNodeRef,transform,isDragging}=useDraggable({id:a.id});
  const style=transform?{transform:`translate3d(${transform.x}px,${transform.y}px,0)`,zIndex:50,opacity:0.9}:undefined;
  return <div ref={setNodeRef} style={{...style,border:`${selected?2:1}px solid ${selected?C.brand:C.line}`,padding:selected?12:13}}
    role="button" tabIndex={0} aria-label={`Open ${u.name}'s application`}
    className={`bg-white rounded-2xl cursor-grab shadow-xs transition-all duration-150 ${isDragging?"shadow-md":""}`}
    {...attributes} {...listeners}
    onClick={e=>{if(e.target.closest("[data-nc]"))return; A.openCandidate(a.id);}}
    onKeyDown={e=>{if((e.key==="Enter"||e.key===" ")&&!e.target.closest("[data-nc]")){e.preventDefault();A.openCandidate(a.id);}}}>
    <div className="flex gap-2.5 items-center mb-2.5">
      {A.can("bulkActions")&&<div data-nc role="checkbox" aria-checked={selected} aria-label={`Select ${u.name}`} tabIndex={0}
        onClick={()=>tog(a.id)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();tog(a.id);}}}
        className="w-5 h-5 rounded-md cursor-pointer flex items-center justify-center shrink-0"
        style={{border:`1.5px solid ${selected?C.brand:C.line}`,background:selected?C.brand:"#fff"}}>
        {selected&&<I n="check" s={12} c="#fff" w={3}/>}</div>}
      <SmartPortrait seed={u.seed} size={32}/>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-text overflow-hidden text-ellipsis whitespace-nowrap">{u.name}</div>
        <div className="text-xs text-text-3 mt-px">{u.years} {u.years===1?t("employer.pipeline.yearSingular"):t("employer.pipeline.yearPlural")} • {u.city}</div></div>
      <Ring v={s} size={32}/></div>
    {/* Ontario Bill 149: an interviewed applicant has to be told the outcome within 45 days. */}
    {notice&&!notice.decided&&(notice.overdue||notice.daysLeft<=14)&&
      <div className={`flex gap-1.5 items-center rounded-lg py-1.5 px-2 mb-2 text-xs font-semibold ${notice.overdue?"bg-red-bg text-red":"bg-warn-bg text-warn"}`}>
        <I n="clock" s={12}/>
        <span>{notice.overdue
          ? t("employer.pipeline.decisionNoticeOverdue",{n:Math.abs(notice.daysLeft)})
          : t("employer.pipeline.decisionNoticeDue",{n:notice.daysLeft})}</span></div>}
    <div data-nc className="flex gap-1.5" onClick={e=>e.stopPropagation()}>
      {idx>0&&<Btn kind="ghost" size="xs" icon="arrowL" title={t("employer.pipeline.moveBack")} onClick={()=>A.moveApp(a.id,stages[idx-1])} style={{flex:1}}/>}
      {idx<stages.length-1&&<Btn kind="outline" size="xs" iconR="arrowR" onClick={()=>A.moveApp(a.id,stages[idx+1])} style={{flex:2}}>{t("employer.pipeline.advance")}</Btn>}</div>
  </div>;
}
function _PipelineColumn({stage,items,job,sel,tog,selectStage,A,mob,stages,t}){
  const {setNodeRef,isOver}=useDroppable({id:stage});
  const allSelected=items.length>0&&items.every(a=>sel.has(a.id));
  return <div ref={setNodeRef} className={`${mob?"w-52":"flex-1 min-w-56"} flex flex-col gap-2 rounded-2xl transition-colors duration-150`}
    style={{background:isOver?C.tint:"transparent",padding:isOver?5:0}}>
    <div className="flex items-center justify-between px-1">
      <span className="text-xs font-bold text-text-2 uppercase tracking-wide">{applicationStageLabel(stage,t)}</span>
      <div className="flex gap-1.5 items-center">
        {/* On a plan without bulk actions this control was hidden entirely, so nothing on the
            board ever explained that selecting candidates is a paid feature - and the upgrade copy
            written for it was unreachable. It now shows locked and opens that prompt. */}
        {items.length>0&&(A.can("bulkActions")
          ? <button onClick={()=>selectStage(stage)} className="bg-transparent border-0 text-xs font-semibold cursor-pointer" style={{color:allSelected?C.brand:C.text3}}>{allSelected?t("employer.pipeline.selectClear"):t("employer.pipeline.selectAll")}</button>
          : <button onClick={()=>A.requestUpgrade("bulkActions","Bulk actions on candidates","users")}
              title={t("employer.pipeline.selectUpgradeTitle")}
              className="bg-transparent border-0 text-xs font-semibold cursor-pointer flex items-center gap-1" style={{color:C.text3}}>
              <I n="lock" s={11}/>{t("employer.pipeline.selectAll")}</button>)}
        <span className="bg-wash text-brand border border-line-2 text-xs font-bold rounded-full flex items-center justify-center px-1.5" style={{minWidth:22,height:22}}>{items.length}</span></div></div>
    {items.map(a=>{const u=A.person(a.user); const s=A.scoreCandidate(u,job); const idx=stages.indexOf(stage);
      const notice=applicationDecisionNotice(a,postingRules({prov:job?.prov,employerSize:A.company?.size}));
      return <_PipelineCard key={a.id} a={a} u={u} s={s} idx={idx} selected={sel.has(a.id)} tog={tog} A={A} notice={notice} stages={stages} t={t}/>;})}
    {items.length===0&&<div className="rounded-2xl text-center text-xs text-text-3 py-6 px-3" style={{border:`1.5px dashed ${C.line}`}}>{t("employer.pipeline.emptyColumn")}</div>}
  </div>;
}
function _PipelineBoard({apps,job,sel,tog,selectStage,A,mob,stages,t}){
  const sensors=useSensors(useSensor(PointerSensor,{activationConstraint:{distance:8}}));
  const onDragEnd=({active,over})=>{
    if(!over)return;
    const app=apps.find(a=>a.id===active.id);
    if(app&&app.stage!==over.id)A.moveApp(active.id,over.id);
  };
  /* No left/right padding on desktop — the sidebar and dashboard shell already provide the
     outer gutter, and any extra padding here just squeezes the cards for no visual gain. On
     desktop columns flex to fill the available width; on mobile they keep a fixed width and
     the container scrolls horizontally. */
  return <div className={`flex-1 ${mob?"overflow-x-auto p-2.5":"py-3"}`}>
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className={`flex gap-2 items-start ${mob?"":"w-full"}`} style={mob?{minWidth:"max-content"}:undefined}>
        {stages.map(stage=><_PipelineColumn key={stage} stage={stage} items={apps.filter(a=>a.stage===stage)}
          job={job} sel={sel} tog={tog} selectStage={selectStage} A={A} mob={mob} stages={stages} t={t}/>)}
      </div>
    </DndContext>
  </div>;
}

/* Per-job scoring weights. Roles genuinely differ — a ticketed trade is almost entirely about
   certifications, a coordinator role weights experience far more — and until now one fixed
   formula was applied to every posting. Weights are normalised rather than required to total
   100, so moving one slider doesn't force rebalancing the other three by hand. */
function _JobScoring({A,job,mob,t}){
  const [open,setOpen]=useState(false);
  const [w,setW]=useState(()=>job?.scoreWeights||A.DEFAULT_SCORE_WEIGHTS);
  const [busy,setBusy]=useState(false); const [err,setErr]=useState("");
  useEffect(()=>{setW(job?.scoreWeights||A.DEFAULT_SCORE_WEIGHTS);},[job?.id,job?.scoreWeights]);
  if(!job)return null;

  const total=Object.values(w).reduce((s,v)=>s+(Number(v)||0),0)||1;
  const rows=[["skills",t("employer.pipeline.skillsMatch")],["experience",t("employer.pipeline.experience")],["location",t("employer.pipeline.locationFit")],["category",t("employer.pipeline.categoryFit")]];
  const dirty=JSON.stringify(w)!==JSON.stringify(job.scoreWeights||A.DEFAULT_SCORE_WEIGHTS);

  return <Card style={{padding:mob?20:24,borderRadius:16,marginBottom:16}}>
    <div className="flex justify-between items-center gap-3 flex-wrap">
      <div>
        <Lbl style={{marginBottom:2}}>{t("employer.pipeline.howJobIsScored")}</Lbl>
        <div className="text-xs text-text-2">
          {job.scoreWeights?t("employer.pipeline.customWeighting"):t("employer.pipeline.defaultWeighting")}</div>
      </div>
      <Btn kind="ghost" size="sm" onClick={()=>setOpen(o=>!o)}>{open?t("employer.pipeline.hide"):t("employer.pipeline.adjust")}</Btn>
    </div>
    {open&&<div className="mt-4 pt-4 border-t border-line-soft">
      {err&&<Banner tone="danger" icon="alert" style={{marginBottom:12}}>{err}</Banner>}
      <div className="flex flex-col gap-3">
        {rows.map(([k,label])=>
          <div key={k} className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-text w-32 shrink-0">{label}</span>
            <input type="range" min="0" max="100" value={w[k]} className="flex-1 min-w-40 cursor-pointer"
              aria-label={t("employer.pipeline.weightLabel",{label})}
              onChange={e=>setW(p=>({...p,[k]:Number(e.target.value)}))}/>
            <span className="text-sm font-semibold text-text tabular-nums w-14 text-right">
              {Math.round((Number(w[k])||0)/total*100)}%</span>
          </div>)}
      </div>
      <div className="text-xs text-text-3 mt-3 leading-relaxed">
        {t("employer.pipeline.scoringExplanation")}
      </div>
      <div className="flex gap-2.5 justify-end mt-4 flex-wrap">
        {job.scoreWeights&&<Btn kind="ghost" size="sm" onClick={async()=>{
          setBusy(true);const r=await A.saveScoreWeights(job.id,null);setBusy(false);if(!r.ok)setErr(r.msg);
        }} disabled={busy}>{t("employer.pipeline.resetToDefault")}</Btn>}
        <Btn kind="primary" size="sm" disabled={busy||!dirty} onClick={async()=>{
          setErr("");setBusy(true);const r=await A.saveScoreWeights(job.id,w);setBusy(false);if(!r.ok)setErr(r.msg);
        }}>{busy?t("employer.pipeline.savingScore"):t("employer.pipeline.saveScoring")}</Btn>
      </div>
    </div>}
  </Card>;
}

export function EmpPipeline(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const myJobs=A.jobs.filter(j=>j.e===A.company.id);
  const jobId=A.pipelineJob||myJobs[0]?.id;
  const job=A.job(jobId);
  const pipelineStages=A.stagesFor(A.company.id);
  const rawApps=A.applications.filter(a=>a.job===jobId);
  const [tab,setTab]=useState("pipeline");
  const [sel,setSel]=useState(new Set());
  const [f,setF]=useState({minScore:0,prov:"",q:""});
  const [bulkMenu,setBulkMenu]=useState(false);
  const [confirmRejectAll,setConfirmRejectAll]=useState(false);
  const bulkMenuRef=useRef(null);
  /* The "Move to..." dropdown previously had no click-outside or Escape handling at all. */
  useEffect(()=>{
    if(!bulkMenu)return;
    const onDocClick=e=>{if(bulkMenuRef.current&&!bulkMenuRef.current.contains(e.target))setBulkMenu(false);};
    const onKey=e=>{if(e.key==="Escape")setBulkMenu(false);};
    document.addEventListener("mousedown",onDocClick); document.addEventListener("keydown",onKey);
    return ()=>{document.removeEventListener("mousedown",onDocClick); document.removeEventListener("keydown",onKey);};
  },[bulkMenu]);

  if(!job) return <Page><Empty icon="users" title={t("employer.pipeline.noListingsReview")} body={t("employer.pipeline.noListingsReviewBody")}
    action={<Btn kind="primary" icon="plus" onClick={()=>A.go("empPost")}>{t("employer.jobs.postAJob")}</Btn>}/></Page>;

  /* Full-text across name/title/city/skills, multi-word AND matching in any order - same
     matchesQuery() helper the rest of the app's search boxes already use, replacing the old
     single-skill-substring-only filter. */
  const apps=rawApps.filter(a=>{const u=A.person(a.user);const s=A.scoreCandidate(u,job);
    if(s<f.minScore)return false;
    if(f.prov&&u.prov!==PCODE[f.prov])return false;
    if(f.q&&!matchesBooleanQuery(f.q,u.name,u.title,u.city,(u.skills||[]).join(" ")))return false;
    return true;});

  const tog=id=>{const n=new Set(sel);n.has(id)?n.delete(id):n.add(id);setSel(n);};
  const selectStage=stage=>{const items=apps.filter(a=>a.stage===stage).map(a=>a.id);
    const n=new Set(sel); const allSel=items.every(id=>n.has(id));
    items.forEach(id=>allSel?n.delete(id):n.add(id)); setSel(n);};
  const clear=()=>setSel(new Set());
  const runBulk=(action,arg)=>{
    const ids=[...sel];
    if(action==="move")A.bulkMove(ids,arg);
    if(action==="reject")A.bulkReject(ids);
    clear(); setBulkMenu(false);
  };

  const [talentMinScore,setTalentMinScore]=useState(65);
  const [talentQ,setTalentQ]=useState("");
  const [noting,setNoting]=useState(null); const [noteText,setNoteText]=useState(""); const [noteTags,setNoteTags]=useState("");
  const [viewingOutreach,setViewingOutreach]=useState(null); const [outreachEvents,setOutreachEvents]=useState([]);
  const viewOutreach=async(p)=>{setViewingOutreach(p); setOutreachEvents(await A.loadCandidateOutreach(p.id));};
  const outreachIcon={invite:"send",message:"mail",note:"edit"};
  const reverseCandidates=A.reverseMatch(jobId,talentMinScore)
    .filter(({p})=>!talentQ||matchesBooleanQuery(talentQ,p.name,p.title,p.city,(p.skills||[]).join(" ")));
  const talentPg=usePagination(reverseCandidates,12);
  useEffect(()=>{talentPg.setPage(1);},[talentMinScore,talentQ]);

  return <div className="flex flex-col min-h-full bg-bg">
    <div className={`bg-white border-b border-line ${mob?"py-3.5 px-4":"py-4 px-7"}`}>
      <div className="max-w-site mx-auto flex gap-3.5 items-end flex-wrap">
        <div className="grow shrink basis-60 min-w-0">
          <Lbl style={{marginBottom:6}}>{t("employer.pipeline.pipelineFor")}</Lbl>
          <Sel value={jobId} onChange={e=>{A.setPipelineJob(e.target.value);clear();setF({minScore:0,prov:"",q:""});}} style={{fontWeight:640}}>
            {myJobs.map(j=><option key={j.id} value={j.id}>{j.t} ({A.applications.filter(a=>a.job===j.id).length})</option>)}</Sel></div>
        <Btn kind="outline" size="sm" icon="download" onClick={()=>A.exportApplicants(jobId)}>{t("employer.pipeline.exportCsv")}</Btn></div>
      <div className="max-w-site mx-auto mt-3.5">
        <Tabs items={[{k:"pipeline",label:t("employer.pipeline.pipelineTab",{n:apps.length})},{k:"filters",label:t("employer.pipeline.filtersTab")},
          {k:"talent",label:t("employer.pipeline.talentPoolTab",{n:reverseCandidates.length})}]} value={tab} onChange={setTab}/></div>
    </div>

    {tab==="filters"&&<div className={`${mob?"p-4":"p-6"} max-w-site mx-auto w-full`}>
      <_JobScoring A={A} job={job} mob={mob} t={t}/>
      <Card style={{padding:mob?20:24,borderRadius:16}}>
        <Lbl>{t("employer.pipeline.filterThisPipeline")}</Lbl>
        <div className={`grid gap-3.5 ${mob?"grid-cols-1":"grid-cols-3"}`}>
          <Field label={t("employer.pipeline.minimumMatchScore")}>
            <Sel value={f.minScore} onChange={e=>setF({...f,minScore:Number(e.target.value)})}>
              {[0,50,60,70,75,80,85].map(v=><option key={v} value={v}>{v?`${v}+`:t("employer.pipeline.any")}</option>)}</Sel></Field>
          <Field label={t("employer.pipeline.province")}><Sel value={f.prov} onChange={e=>setF({...f,prov:e.target.value})}>
            <option value="">{t("employer.pipeline.allProvinces")}</option>{PROVS.map(p=><option key={p}>{p}</option>)}</Sel></Field>
          <Field label={t("employer.pipeline.search")} hint={t("employer.pipeline.searchHint")}>
            <Input icon="search" value={f.q} onChange={e=>setF({...f,q:e.target.value})} placeholder={t("employer.pipeline.searchPlaceholder")}/></Field>
        </div>
        <div className="mt-4 flex gap-2.5 items-center flex-wrap">
          <Btn kind="primary" onClick={()=>setTab("pipeline")}>{t(apps.length===1?"employer.pipeline.showCandidates":"employer.pipeline.showCandidatesPlural",{n:apps.length})}</Btn>
          <Btn kind="ghost" onClick={()=>setF({minScore:0,prov:"",q:""})}>{t("employer.pipeline.reset")}</Btn></div>
      </Card>
    </div>}

    {tab==="talent"&&<div className={`${mob?"p-4":"p-6"} max-w-site mx-auto w-full`}>
      {!A.can("talentPool")?<Card style={{padding:mob?26:36,borderRadius:20,textAlign:"center",background:"linear-gradient(135deg,#F5F9FF 0%,#EAF2FF 100%)",border:`1px solid ${C.line2}`}}>
        <div className="w-16 h-16 rounded-2xl bg-brand text-white flex items-center justify-center mx-auto mb-5"><I n="target" s={30}/></div>
        <div className={`font-bold text-text tracking-tight mb-2.5 ${mob?"text-xl":"text-2xl"}`}>{t("employer.pipeline.talentPoolTitle")}</div>
        <p className="text-sm text-text-2 leading-relaxed mx-auto mb-6 max-w-110"><br/>{t("employer.pipeline.talentPoolBody")}</p>
        <Btn kind="primary" onClick={()=>A.go("pricing")}>{t("employer.pipeline.upgradeToGrowth")}</Btn>
      </Card>:<><Card style={{padding:mob?20:26,borderRadius:16,marginBottom:16}}>
        <div className="flex gap-3 items-center mb-3 flex-wrap">
          <div className="w-11 h-11 rounded-xl bg-wash text-brand flex items-center justify-center shrink-0"><I n="target" s={22}/></div>
          <div className="flex-1 min-w-45"><div className="text-base font-semibold text-text">{t("employer.pipeline.talentPoolMatches")}</div>
            <div className="text-sm text-text-2 mt-0.5">{t("employer.pipeline.talentPoolDesc")}</div></div>
          <div style={{width:220}}><Input icon="search" value={talentQ} onChange={e=>setTalentQ(e.target.value)} placeholder={t("employer.pipeline.talentPoolSearch")}/></div>
          <Sel value={talentMinScore} onChange={e=>setTalentMinScore(Number(e.target.value))} style={{width:170}}>
            {[50,60,65,70,80,90].map(v=><option key={v} value={v}>{t("employer.pipeline.talentScoreOption",{n:v})}</option>)}</Sel>
        </div>
      </Card>
      {reverseCandidates.length===0
        ? <Empty icon="target" title={t("employer.pipeline.talentNoMatches")} body={t("employer.pipeline.talentNoMatchesBody")}/>
        : <><div className={`grid gap-3.5 ${mob?"grid-cols-1":"grid-cols-2"}`}>
            {talentPg.pageItems.map(({p,score})=>{const invited=A.invitedCandidates.has(`${jobId}:${p.id}`);
              const cn=A.candidateNotes[p.id];
              return <Card key={p.id} style={{padding:20,borderRadius:16}}>
              <div className="flex gap-3.5 items-center">
                <SmartPortrait seed={p.seed} size={52}/>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-semibold text-text">{p.name}</div>
                  <div className="text-sm text-text-2 mt-1">{p.title} • {p.years}{p.years===1?t("employer.pipeline.yearSingular"):t("employer.pipeline.yearPlural")} • {p.city}</div></div>
                <Ring v={score} size={44}/></div>
              <div className="flex flex-wrap gap-1.5 mt-3.5">
                {(p.skills||[]).slice(0,4).map(s=><Tag key={s} sm>{s}</Tag>)}
                {(p.skills||[]).length>4&&<Tag sm>+{p.skills.length-4}</Tag>}</div>
              {cn?.tags?.length>0&&<div className="flex flex-wrap gap-1.5 mt-2">
                {cn.tags.map(tag=><Tag key={tag} tone="violet" sm>{tag}</Tag>)}</div>}
              {cn?.note&&<div className="text-xs text-text-2 mt-2.5 p-2.5 bg-bg rounded-lg italic leading-snug">{cn.note}</div>}
              <div className="flex gap-2 mt-3.5">
                {invited
                  ?<Btn kind="soft" size="sm" full icon="check" disabled>{t("employer.pipeline.invited")}</Btn>
                  :<Btn kind="outline" size="sm" full icon="send" onClick={()=>A.inviteToApply(p.id,jobId)}>{t("employer.pipeline.inviteToApply")}</Btn>}
                <Btn kind="ghost" size="sm" icon="edit" onClick={()=>{setNoting(p);setNoteText(cn?.note||"");setNoteTags((cn?.tags||[]).join(", "));}}>{ cn?t("employer.pipeline.editNote"):t("employer.pipeline.addNote")}</Btn>
                <Btn kind="ghost" size="sm" icon="clock" onClick={()=>viewOutreach(p)}>{t("employer.pipeline.viewHistory")}</Btn>
              </div>
            </Card>;})}</div>
          <Pagination {...talentPg}/></>}
      </>}
    </div>}

    {tab==="pipeline"&&<>
      {sel.size>0&&A.can("bulkActions")&&<div className={`bg-brand text-white flex gap-3 items-center flex-wrap ${mob?"py-3 px-4":"py-3 px-7"}`}>
        <span className="text-sm font-semibold">{t("employer.pipeline.selectedCount",{n:sel.size})}</span>
        <div className="flex-1"/>
        <div className="relative" ref={bulkMenuRef}>
          <Btn kind="onDark" size="sm" iconR="chevD" aria-expanded={bulkMenu} onClick={()=>setBulkMenu(!bulkMenu)}>Move to…</Btn>
          {bulkMenu&&<div role="menu" className="absolute top-full right-0 mt-1.5 bg-white border border-line rounded-xl shadow-lg p-1.5 z-20" style={{minWidth:180}}>
            {pipelineStages.map(s=><button key={s} role="menuitem" onClick={()=>runBulk("move",s)} className="block w-full text-left py-2.5 px-3 bg-transparent border-0 cursor-pointer text-sm text-text rounded-lg hover:bg-bg transition-colors duration-150">{applicationStageLabel(s,t)}</button>)}</div>}
        </div>
        <Btn kind="onDark" size="sm" icon="x" onClick={()=>setConfirmRejectAll(true)}>Reject all</Btn>
        <Btn kind="onDark" size="sm" onClick={clear}>Clear</Btn></div>}
      <_PipelineBoard apps={apps} job={job} sel={sel} tog={tog} selectStage={selectStage} A={A} mob={mob} stages={pipelineStages} t={t}/>
    </>}
    <ConfirmDialog open={confirmRejectAll} onClose={()=>setConfirmRejectAll(false)} confirmLabel="Reject all"
      title={`Reject ${sel.size} candidate${sel.size===1?"":"s"}?`} onConfirm={()=>runBulk("reject")}>
      This withdraws their application{sel.size===1?"":"s"}. This can't be undone from here.
    </ConfirmDialog>
    {noting&&<Modal onClose={()=>setNoting(null)} title={`Notes — ${noting.name}`}>
      <div className="flex flex-col gap-3.5">
        <div className="text-xs text-text-3">Private to your team — never shown to the candidate or other employers.</div>
        <Field label="Tags" hint="Comma-separated, e.g. Strong culture fit, Follow up in 3mo">
          <Input value={noteTags} onChange={e=>setNoteTags(e.target.value)} placeholder="Strong culture fit, Follow up in 3mo"/></Field>
        <Field label="Notes"><Area rows={4} value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="Interviewed for a similar role last year, references were strong…"/></Field>
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>setNoting(null)}>Cancel</Btn>
          <Btn kind="primary" icon="check" onClick={async()=>{
            const tags=noteTags.split(",").map(s=>s.trim()).filter(Boolean);
            const r=await A.saveCandidateNote(noting.id,noteText.trim(),tags);
            if(r.ok){A.toast("Notes saved","ok");setNoting(null);}
          }}>Save</Btn>
        </div>
      </div>
    </Modal>}
    {viewingOutreach&&<Modal onClose={()=>setViewingOutreach(null)} title={`Outreach history — ${viewingOutreach.name}`}>
      <div className="flex flex-col gap-2.5" style={{maxHeight:400,overflowY:"auto"}}>
        {outreachEvents.length===0&&<div className="text-sm text-text-3 py-3">No contact with this candidate yet — invites, messages and notes will show up here.</div>}
        {outreachEvents.map((ev,i)=><div key={i} className="flex gap-3 items-start py-2.5 px-3 bg-bg rounded-lg">
          <div className="w-7 h-7 rounded-lg bg-white border border-line flex items-center justify-center shrink-0 mt-0.5"><I n={outreachIcon[ev.type]||"activity"} s={13} c={C.brand}/></div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-text leading-snug">{ev.detail}</div>
            <div className="text-xs text-text-3 mt-0.5">{formatDateTime(ev.at,locale)}</div>
          </div>
        </div>)}
      </div>
    </Modal>}
  </div>;
}


export function EmpCandidate(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const [showMsg,setShowMsg]=useState(false); const [msgText,setMsgText]=useState("");
  const [savingTemplate,setSavingTemplate]=useState(false); const [templateName,setTemplateName]=useState("");
  const [showSched,setShowSched]=useState(false);
  const [ivDate,setIvDate]=useState(""); const [ivTime,setIvTime]=useState(""); const [ivMode,setIvMode]=useState("video"); const [ivNotes,setIvNotes]=useState("");
  const [confirmReject,setConfirmReject]=useState(false); const [rejectReason,setRejectReason]=useState("");
  const [showOfferLetter,setShowOfferLetter]=useState(false);
  const [offerLink,setOfferLink]=useState(""); const [offerErr,setOfferErr]=useState(""); const [sendingOffer,setSendingOffer]=useState(false);
  const [offerDraft,setOfferDraft]=useState({startDate:"",salary:"",manager:"",deadline:""});
  const [contact,setContact]=useState(undefined); // undefined = loading, null = load failed
  const [scorecards,setScorecards]=useState([]);
  const [showScorecard,setShowScorecard]=useState(false); const [scRating,setScRating]=useState(0); const [scNotes,setScNotes]=useState("");
  const a=A.applications.find(x=>x.id===A.candidateId);
  useEffect(()=>{if(!a)return; let cancelled=false;A.loadCandidateContact(a.id).then(c=>{if(!cancelled)setContact(c);});return()=>{cancelled=true;};},[a?.id]);
  const refreshScorecards=()=>{if(a)A.loadScorecards(a.id).then(setScorecards);};
  useEffect(()=>{refreshScorecards();},[a?.id]);
  if(!a) return <Page><Empty icon="users" title={t("employer.candidate.candidateTitle")} body={t("employer.post.reviewPublishSub")}
    action={<Btn kind="primary" onClick={()=>A.go("empPipeline")}>{t("employer.pipeline.moveBack")}</Btn>}/></Page>;
  const u=A.person(a.user), job=A.job(a.job), s=A.scoreCandidate(u,job);
  const candStages=A.stagesForApp(a); const idx=candStages.indexOf(a.stage);
  const threadMessages=A.messages.filter(m=>(m.from===u.id&&m.to===A.user?.id)||(m.to===u.id&&m.from===A.user?.id)).slice().reverse();
  const upcomingInterviews=A.interviews.filter(iv=>iv.app===a.id&&iv.status==="scheduled");
  return <Page narrow>
    <Card pad={mob?20:26} style={{marginBottom:16}}>
      <div className="flex gap-4 items-center flex-wrap">
        <SmartPortrait seed={u.seed} size={mob?62:74} radius={18}/>
        <div className="grow shrink basis-50 min-w-0">
          <div className={`font-bold text-text tracking-tight ${mob?"text-xl":"text-2xl"}`}>{u.name}</div>
          <div className="text-sm text-text-2 mt-1">{u.title} • {u.years} {u.years===1?"an":"ans"} • {u.city}, {u.prov}</div>
          <div className="text-sm text-text-3 mt-0.5">
            {contact===undefined?t("employer.candidate.applicationNotes"):
              [contact?.email,contact?.phone].filter(Boolean).join(" • ")||t("employer.candidate.applicationNotes")}</div>
          <div className="mt-2.5"><Tag tone={a.stage==="Offer"?"ok":a.stage==="Interview"?"warn":"brand"} sm>{applicationStageLabel(a.stage,t)}</Tag></div></div>
        <Ring v={s} size={62} label={t("employer.pipeline.selectedCount",{n:1})}/></div></Card>
    <Card style={{marginBottom:16}}>
      <div className="flex justify-between items-center mb-3">
        <Lbl style={{margin:0}}>{t("employer.candidate.decisionScorecard")} {scorecards.length>0&&`(moy ${(scorecards.reduce((s,c)=>s+c.rating,0)/scorecards.length).toFixed(1)}/5)`}</Lbl>
        <Btn kind="outline" size="xs" icon="plus" onClick={()=>{setScRating(0);setScNotes("");setShowScorecard(true);}}>+{t("employer.candidate.addScorecard")}</Btn>
      </div>
      {scorecards.length===0?<div className="text-sm text-text-3">{t("employer.candidate.applicationNotes")}</div>
        :<div className="flex flex-col gap-2.5">
          {scorecards.map(c=><div key={c.id} className="py-2.5 px-3 bg-bg rounded-lg">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-semibold text-text">{c.author}</span>
              <span className="text-sm text-warn font-bold">{"★".repeat(c.rating)}{"☆".repeat(5-c.rating)}</span>
            </div>
            {c.notes&&<div className="text-sm text-text-2">{c.notes}</div>}
            <div className="text-xs text-text-3 mt-1">{formatDate(c.at,locale)}</div>
          </div>)}
        </div>}
    </Card>
    <Card style={{marginBottom:16}}><Lbl>{t("employer.pipeline.howJobIsScored")}</Lbl>
      <div className="flex flex-col gap-2.5">
        {A.scoreBreakdown(u,job).map(b=><div key={b.label}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-text font-medium">{b.label} <span className="text-text-3 font-normal">— {b.detail}</span></span>
            <span className="text-brand font-bold">{b.pct}%</span></div>
          <div className="h-1.5 bg-bg rounded-full overflow-hidden"><div className="h-full bg-brand rounded-full" style={{width:`${b.pct}%`}}/></div>
        </div>)}
      </div>
    </Card>
    <div className={`grid gap-4 mb-4 ${mob?"grid-cols-1":"grid-cols-2"}`}>
      <Card><Lbl>{t("employer.candidate.rating")}</Lbl>
        <div className="flex flex-wrap gap-1.5">
          {job.skills.map(k=>{const has=u.skills.some(x=>x.toLowerCase()===k.toLowerCase());
            return <Tag key={k} tone={has?"ok":"neutral"} icon={has?"check":"x"} sm>{k}</Tag>;})}</div>
        <div className="text-sm text-text-2 mt-3 leading-snug">
          {t("employer.candidate.matchesSkills",{n:job.skills.filter(k=>u.skills.some(x=>x.toLowerCase()===k.toLowerCase())).length,total:job.skills.length})}</div></Card>
      <Card><Lbl>{t("employer.candidate.applicationAnswers")}</Lbl>
        {[[t("employer.candidate.availableFrom"),a.avail||t("employer.candidate.notStated")],[t("employer.candidate.expectedPay"),a.expect?a.expect+payShort(job):t("employer.candidate.openToRange")],
          [t("employer.candidate.applied"),a.at],[t("employer.candidate.education"),u.edu]].map(([k,v])=>
          <div key={k} className="flex justify-between gap-3 py-2.5 border-b border-line-soft text-sm">
            <span className="text-text-2">{k}</span><span className="font-semibold text-text text-right">{v}</span></div>)}</Card></div>
    {a.letter&&<Card style={{marginBottom:16}}><Lbl>{t("employer.candidate.theirNote")}</Lbl>
      <p className="text-sm text-text-2 leading-relaxed m-0 whitespace-pre-wrap">{a.letter}</p></Card>}
    {a.screeningAnswers?.length>0&&<Card style={{marginBottom:16}}><Lbl>{t("employer.candidate.screeningAnswers")}</Lbl>
      <div className="flex flex-col gap-3.5">
        {a.screeningAnswers.map(sa=><div key={sa.id}>
          <div className="text-sm font-semibold text-text mb-1">{sa.prompt}</div>
          <div className="text-sm text-text-2">{Array.isArray(sa.answer)?(sa.answer.join(", ")||"—"):(sa.answer||"—")}</div></div>)}</div></Card>}
    <Card style={{marginBottom:16}}><Lbl>{t("employer.candidate.moveThisCandidate")}</Lbl>
      <div className="flex gap-2.5 flex-wrap">
        {idx>0&&<Btn kind="outline" icon="arrowL" onClick={()=>A.moveApp(a.id,candStages[idx-1])}>{t("employer.candidate.backToStage",{stage:candStages[idx-1]})}</Btn>}
        {idx<candStages.length-1&&<Btn kind="primary" iconR="arrowR" onClick={()=>A.moveApp(a.id,candStages[idx+1])}>{t("employer.candidate.advanceToStage",{stage:candStages[idx+1]})}</Btn>}
        {A.can("messages")?<Btn kind="outline" icon="mail" onClick={()=>setShowMsg(true)}>{t("employer.candidate.message")}</Btn>:<Btn kind="ghost" icon="lock" onClick={()=>A.go("pricing")}>{t("employer.candidate.message")} (Growth+)</Btn>}
        {A.can("interviews")?<Btn kind="outline" icon="calendar" onClick={()=>setShowSched(true)}>{t("employer.candidate.scheduleInterview")}</Btn>:<Btn kind="ghost" icon="lock" onClick={()=>A.go("pricing")}>{t("employer.candidate.scheduleInterview")} (Growth+)</Btn>}
        {a.stage==="Offer"&&<Btn kind="ok" icon="file" onClick={()=>setShowOfferLetter(true)}>{t("employer.candidate.generateOfferLetter")}</Btn>}
        <Btn kind="dangerSoft" onClick={()=>{setConfirmReject(true);setRejectReason("");}}>{ t("employer.candidate.notAFit")}</Btn>
        <Btn kind="ghost" onClick={()=>A.go("empPipeline")}>{t("employer.candidate.backToPipeline")}</Btn></div></Card>
    <ConfirmDialog open={confirmReject} onClose={()=>setConfirmReject(false)} confirmLabel={t("common.delete")}
      title={t("employer.candidate.rejectConfirmTitle",{name:u.name})} onConfirm={()=>{A.rejectApp(a.id,rejectReason.trim());A.go("empPipeline");}}>
      <div className="flex flex-col gap-3">
        <div>{t("employer.candidate.rejectBody")}</div>
        <Field label={t("employer.candidate.rejectReasonLabel")} hint={t("employer.candidate.rejectReasonHint")}>
          <Area rows={2} value={rejectReason} onChange={e=>setRejectReason(e.target.value)} placeholder="e.g. Went with a candidate with more site experience"/></Field>
      </div>
    </ConfirmDialog>

    {showOfferLetter&&<Modal onClose={()=>setShowOfferLetter(false)} title={`Offer letter — ${u.name}`}>
      <div className="flex flex-col gap-3.5">
        <div className={`grid gap-3 ${mob?"grid-cols-1":"grid-cols-2"}`}>
          <Field label="Start date"><Input type="date" value={offerDraft.startDate} onChange={e=>setOfferDraft({...offerDraft,startDate:e.target.value})}/></Field>
          <Field label="Compensation"><Input value={offerDraft.salary} onChange={e=>setOfferDraft({...offerDraft,salary:e.target.value})} placeholder={`e.g. ${pay(job)}${payShort(job)}`}/></Field>
          <Field label="Reporting to (optional)"><Input value={offerDraft.manager} onChange={e=>setOfferDraft({...offerDraft,manager:e.target.value})} placeholder="Hiring manager's name"/></Field>
          <Field label="Offer expires (optional)"><Input type="date" value={offerDraft.deadline} onChange={e=>setOfferDraft({...offerDraft,deadline:e.target.value})}/></Field>
        </div>
        <Field label="Offer letter text" hint="This exact text is what the candidate signs, and it's snapshotted so later edits can't change what they agreed to.">
          <Area rows={7} value={offerDraft.body||""} onChange={e=>setOfferDraft({...offerDraft,body:e.target.value})}
            placeholder={`Dear ${u.name},\n\nWe're pleased to offer you the position of ${job.t} at ${A.company.name}.`}/></Field>
        {offerErr&&<Banner tone="danger" icon="alert">{offerErr}</Banner>}
        {offerLink
          ? <Banner tone="ok" icon="check" title={t("employer.candidate.offerSent")}>
              <div className="text-xs text-text-2 mb-2">{t("employer.candidate.offerSentEmailBody")}</div>
              <div className="flex gap-2 items-center flex-wrap">
                <code className="text-xs bg-white border border-line rounded-lg px-2.5 py-1.5 break-all flex-1 min-w-0">{offerLink}</code>
                <Btn kind="outline" size="sm" onClick={()=>navigator.clipboard?.writeText(offerLink)}>{t("employer.candidate.copyButton")}</Btn>
              </div>
            </Banner>
          : <Banner tone="brand" icon="info">{t("employer.candidate.offerSignatureInfo")}</Banner>}
        <div className="flex gap-2.5 justify-end flex-wrap">
          <Btn kind="ghost" onClick={()=>setShowOfferLetter(false)}>{t("employer.candidate.close")}</Btn>
          <Btn kind="outline" icon="file" onClick={()=>A.printOfferLetter(u,job,A.company,offerDraft)}>{t("employer.candidate.printCopy")}</Btn>
          <Btn kind="primary" icon="send" disabled={sendingOffer} onClick={async()=>{
            setOfferErr("");setSendingOffer(true);
            const body=(offerDraft.body||"").trim()||
              `Dear ${u.name},\n\nWe're pleased to offer you the position of ${job.t} at ${A.company.name}.`+
              (offerDraft.salary?`\n\nCompensation: ${offerDraft.salary}`:"")+
              (offerDraft.startDate?`\nStart date: ${offerDraft.startDate}`:"")+
              (offerDraft.manager?`\nReporting to: ${offerDraft.manager}`:"")+
              `\n\nWe're looking forward to working with you.\n\n${A.company.name}`;
            const r=await A.sendOfferForSignature(a.id,{
              body,position:job.t,compensation:offerDraft.salary,
              startDate:offerDraft.startDate,reportingTo:offerDraft.manager,expiresAt:offerDraft.deadline});
            setSendingOffer(false);
            if(r.ok)setOfferLink(r.link); else setOfferErr(r.msg);
          }}>{sendingOffer?t("employer.candidate.sending"):t("employer.candidate.sendForSignature")}</Btn>
        </div>
      </div>
    </Modal>}

    {showScorecard&&<Modal onClose={()=>setShowScorecard(false)} title={`Scorecard for ${u.name}`}>
      <div className="flex flex-col gap-3.5">
        <Field label={t("employer.candidate.ratingLabel")} required>
          <div className="flex gap-1.5">
            {[1,2,3,4,5].map(n=><button key={n} type="button" onClick={()=>setScRating(n)}
              className="bg-transparent border-0 p-0 cursor-pointer text-2xl" style={{color:n<=scRating?C.warn:C.line}}>★</button>)}
          </div>
        </Field>
        <Field label={t("common.optional")}><Area rows={4} value={scNotes} onChange={e=>setScNotes(e.target.value)} placeholder="Strengths, concerns, how they compared to the role's requirements…"/></Field>
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>setShowScorecard(false)}>{t("common.cancel")}</Btn>
          <Btn kind="primary" disabled={!scRating} onClick={async()=>{
            const r=await A.submitScorecard(a.id,scRating,scNotes.trim());
            if(r.ok){refreshScorecards();setShowScorecard(false);} else A.toast(r.msg,"danger");
          }}>{t("employer.candidate.submitScorecard")}</Btn>
        </div>
      </div>
    </Modal>}

    {threadMessages.length>0&&<Card style={{marginBottom:16}}><Lbl>{t("employer.candidate.messageHistory")}</Lbl>
      <div className="flex flex-col gap-2.5 overflow-y-auto" style={{maxHeight:280}}>
        {threadMessages.map(m=>{const mine=m.from===A.user?.id;
          return <div key={m.id} className={`flex ${mine?"justify-end":"justify-start"}`}>
            <div className="rounded-xl text-sm leading-snug py-2.5 px-3.5" style={{maxWidth:"75%",
              background:mine?C.brand:C.bg,color:mine?"#fff":C.text,border:mine?"none":`1px solid ${C.line}`}}>
              {m.text}
              <div className="text-xs opacity-70 mt-1.5">{formatDateTime(m.at,locale)}</div></div></div>;})}</div></Card>}

    {upcomingInterviews.length>0&&<Card style={{marginBottom:16}}><Lbl>{t("employer.candidate.scheduleInterviewsCard")}</Lbl>
      <div className="flex flex-col gap-2.5">
        {upcomingInterviews.map(iv=><div key={iv.id} className="flex gap-3 items-center py-3 px-3.5 bg-bg rounded-xl border border-line">
          <div className="w-10 h-10 rounded-xl bg-wash text-brand flex items-center justify-center"><I n="calendar" s={18}/></div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-text">{iv.mode==="video"?t("employer.candidate.videoCall"):t("employer.candidate.onsiteInterview")} on {iv.when}</div>
            {iv.notes&&<div className="text-xs text-text-2 mt-1">{iv.notes}</div>}</div>
          <Btn kind="ghost" size="xs" icon="x" onClick={()=>A.cancelInterview(iv.id)}/></div>)}</div></Card>}

    {showMsg&&<Modal onClose={()=>{setShowMsg(false);setSavingTemplate(false);}} title={`Message ${u.name}`}>
      {A.messageTemplates.length>0&&<Field label={t("employer.candidate.startFromTemplate")}>
        <Sel value="" onChange={e=>{const tm=A.messageTemplates.find(x=>x.id===e.target.value); if(tm)setMsgText(tm.body
          .replace(/\{\{name\}\}/gi,u.name.split(" ")[0]).replace(/\{\{job\}\}/gi,job.t).replace(/\{\{company\}\}/gi,A.company.name));}}>
          <option value="">{t("employer.candidate.chooseTemplate")}</option>
          {A.messageTemplates.map(tm=><option key={tm.id} value={tm.id}>{tm.name}</option>)}
        </Sel></Field>}
      <Field label={t("employer.candidate.yourMessage")} hint={t("employer.candidate.mergeFieldsHint",{name:u.name})}>
        <Area rows={5} value={msgText} onChange={e=>setMsgText(e.target.value)} placeholder={t("employer.candidate.messagePlaceholder")}/></Field>
      {savingTemplate?<div className="flex gap-2 items-center mt-2.5">
        <Input value={templateName} onChange={e=>setTemplateName(e.target.value)} placeholder={t("employer.candidate.templateName")} style={{flex:1}}/>
        <Btn kind="outline" size="sm" disabled={!templateName.trim()||!msgText.trim()} onClick={async()=>{
          const r=await A.saveMessageTemplate(templateName.trim(),msgText.trim());
          if(r.ok){setSavingTemplate(false);setTemplateName("");A.toast("Template saved","ok");}}}>{ t("common.save")}</Btn>
        <Btn kind="ghost" size="sm" onClick={()=>setSavingTemplate(false)}>{t("common.cancel")}</Btn>
      </div>:<button type="button" onClick={()=>setSavingTemplate(true)} disabled={!msgText.trim()}
        className="bg-transparent border-0 p-0 mt-2.5 text-xs font-semibold text-brand cursor-pointer disabled:text-text-3 disabled:cursor-default">{t("employer.candidate.saveTemplate")}</button>}
      <div className="flex gap-2.5 justify-end mt-3.5">
        <Btn kind="ghost" onClick={()=>{setShowMsg(false);setSavingTemplate(false);}}>{t("common.cancel")}</Btn>
        <Btn kind="primary" icon="send" disabled={!msgText.trim()} onClick={()=>{A.sendMessage(u.id,job.id,msgText.trim());setMsgText("");setShowMsg(false);setSavingTemplate(false);}}>{ t("employer.candidate.message")}</Btn></div></Modal>}

    {showSched&&<Modal onClose={()=>setShowSched(false)} title={t("employer.candidate.scheduleInterviewTitle",{name:u.name})}>
      <div className="flex flex-col gap-3.5">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("employer.candidate.dateLabel")}><Input type="date" value={ivDate} onChange={e=>setIvDate(e.target.value)}/></Field>
          <Field label={t("employer.candidate.timeLabel")}><Input type="time" value={ivTime} onChange={e=>setIvTime(e.target.value)}/></Field></div>
        <Field label={t("employer.candidate.formatLabel")}>
          <div className="grid grid-cols-2 gap-2.5">
            {[["video",t("employer.candidate.videoCall")],["onsite",t("employer.candidate.onsiteInterview")]].map(([v,l])=>{const on=ivMode===v;
              return <button key={v} onClick={()=>setIvMode(v)} className="py-3 px-3.5 rounded-xl cursor-pointer text-sm border-2"
                style={{fontWeight:on?640:520,borderColor:on?C.brand:C.line,background:on?C.tint:"#fff",color:on?C.brand:C.text}}>{l}</button>;})}</div></Field>
        <Field label={t("employer.candidate.interviewNotes")} hint={t("employer.candidate.interviewNotesHint")}>
          <Area rows={3} value={ivNotes} onChange={e=>setIvNotes(e.target.value)} placeholder={t("employer.candidate.notesPlaceholder")}/></Field>
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>setShowSched(false)}>{t("common.cancel")}</Btn>
          <Btn kind="primary" icon="calendar" disabled={!ivDate||!ivTime} onClick={()=>{
            const when=`${ivDate} at ${ivTime}`;
            A.scheduleInterview(a.id,when,ivMode,ivNotes);
            setShowSched(false);setIvDate("");setIvTime("");setIvNotes("");
          }}>Schedule</Btn></div></div></Modal>}
  </Page>;
}

/* ═══════════════ CONTENT CRUD (employer + admin) ═══════════════ */
export function ContentManager({scope,only}){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const isAdmin=scope==="admin";
  const canBlogs=isAdmin||A.settings.employerBlogs;
  const canTrainings=isAdmin||A.settings.employerTrainings;
  const owner=isAdmin?"admin":A.company.id;
  const blogs=isAdmin?A.blogs:A.blogs.filter(b=>b.owner===owner);
  const trainings=isAdmin?A.trainings:A.trainings.filter(t=>t.owner===owner);
  const [tab,setTab]=useState(only==="trainings"?"trainings":"blogs");
  const [q,setQ]=useState(""); const [statusFilter,setStatusFilter]=useState("all");
  const [sel,setSel]=useState(new Set());
  const [viewingHistory,setViewingHistory]=useState(null); const [revisions,setRevisions]=useState([]);
  const [viewingAnalytics,setViewingAnalytics]=useState(null); const [analytics,setAnalytics]=useState(null);
  const openHistory=async(item,type)=>{setViewingHistory({item,type}); setRevisions(await A.loadContentRevisions(type,item.id));};
  const openAnalytics=async(item)=>{setViewingAnalytics(item); setAnalytics(null); setAnalytics(await A.loadArticleAnalytics(item.id));};
  const restore=async(revId)=>{
    const r=await A.restoreContentRevision(viewingHistory.type,viewingHistory.item.id,revId);
    if(r.ok)setViewingHistory(null);
  };
  const Row=({item,type})=>{
    const editable=isAdmin||item.owner===owner;
    const selected=sel.has(item.id);
    return <div className="flex gap-3.5 items-center py-3.5 border-b border-line-soft flex-wrap">
      {editable&&<input type="checkbox" checked={selected} onChange={()=>setSel(s=>{const n=new Set(s); n.has(item.id)?n.delete(item.id):n.add(item.id); return n;})}/>}
      <div className="w-19 h-13 rounded-lg overflow-hidden shrink-0">
        <SmartScene kind={item.scene} tone={item.tone} h={52} seed={item.id.charCodeAt(1)||0}/></div>
      <div className="grow shrink basis-50 min-w-0">
        <div className="text-sm font-semibold text-text leading-snug" style={{fontSize:14.5}}>{item.title}</div>
        <div className="text-xs text-text-3 mt-1 flex gap-2 flex-wrap items-center">
          <span>{item.cat}</span><span>•</span>
          <span>{type==="blog"?`${item.mins} min read`:`${item.hours} h · ${item.price===0?"Free":money(item.price)}`}</span>
          {isAdmin&&<><span>•</span><span>{item.owner==="admin"?"NorthHire":A.emp(item.owner)?.name||item.owner}</span></>}</div></div>
      {item.scheduledAt
        ?<Tag tone="brand" sm icon="clock">{t("employer.content.scheduledFor",{date:formatDateTime(item.scheduledAt,locale,{dateStyle:"short",timeStyle:"short"})})}</Tag>
        :<Tag tone={item.status==="published"?"ok":item.status==="draft"?"warn":"neutral"} sm>
          {item.status==="published"?"Published":item.status==="draft"?"Draft":"Hidden"}</Tag>}
      {/* Every icon-only button carries an aria-label matching its title, so a keyboard user
          tabbing through six actions per row hears each one announced instead of a bare
          "button". Title-attribute alone doesn't announce - screen readers use aria-label. */}
      <div className="flex gap-2 flex-wrap">
        <Btn kind="ghost" size="xs" icon="eye" title="Preview" aria-label={`Preview ${item.title}`}
          onClick={()=>type==="blog"?A.openBlog(item.id):A.openTraining(item.id)}/>
        {editable&&<>
          <Btn kind="outline" size="xs" icon="edit" onClick={()=>type==="blog"?A.editBlog(item.id):A.editTraining(item.id)}>Edit</Btn>
          <Btn kind="ghost" size="xs" icon="clock" title="Revision history" aria-label={`Revision history for ${item.title}`} onClick={()=>openHistory(item,type)}/>
          {type==="blog"&&<Btn kind="ghost" size="xs" icon="trend" title="Analytics" aria-label={`Analytics for ${item.title}`} onClick={()=>openAnalytics(item)}/>}
          <Btn kind="ghost" size="xs" onClick={()=>type==="blog"?A.toggleBlogStatus(item.id):A.toggleTrainingStatus(item.id)}>
            {item.status==="published"?"Unpublish":"Publish"}</Btn>
          <Btn kind="ghost" size="xs" icon="trash" title="Delete" aria-label={`Delete ${item.title}`}
            onClick={()=>type==="blog"?A.deleteBlog(item.id):A.deleteTraining(item.id)}/></>}</div></div>;
  };
  const rawList=tab==="blogs"?blogs:trainings;
  const list=rawList.filter(x=>(statusFilter==="all"||x.status===statusFilter)&&(!q||x.title.toLowerCase().includes(q.toLowerCase())||x.cat.toLowerCase().includes(q.toLowerCase())));
  const allowed=tab==="blogs"?canBlogs:canTrainings;
  const pg=usePagination(list,20);
  const selItems=list.filter(x=>sel.has(x.id));
  const bulkAction=fn=>{selItems.forEach(x=>fn(x.id)); setSel(new Set());};
  return <Page wide>
    <H1 sub={isAdmin?"Every article and training on the platform":"Articles and trainings published by your company"}
      action={allowed?<Btn kind="primary" icon="plus"
        onClick={()=>tab==="blogs"?A.editBlog("new"):A.editTraining("new")}>
        New {tab==="blogs"?"article":"training"}</Btn>:null}>
      {isAdmin?"Content management":"Content"}</H1>
    {!isAdmin&&(!canBlogs||!canTrainings)&&<Banner tone="warn" icon="lock" title="Some publishing is switched off" style={{marginBottom:18}}>
      An administrator has disabled employer {!canBlogs&&!canTrainings?"articles and trainings":!canBlogs?"articles":"trainings"} platform-wide.
      Anything you already published stays visible, but you cannot create or edit it right now.</Banner>}
    {!only&&<Tabs items={[{k:"blogs",label:"Articles",n:blogs.length},{k:"trainings",label:"Trainings",n:trainings.length}]}
      value={tab} onChange={t=>{setTab(t);setSel(new Set());}} style={{marginBottom:18}}/>}
    <div className="flex gap-3 mb-4 flex-wrap items-center">
      <div className="grow shrink basis-60 max-w-90"><Input icon="search" placeholder="Search title or category" value={q} onChange={e=>setQ(e.target.value)}/></div>
      <Sel value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{width:160}}>
        <option value="all">All statuses</option><option value="published">Published</option>
        <option value="draft">Draft</option><option value="hidden">Hidden</option></Sel>
    </div>
    {sel.size>0&&<Banner tone="brand" icon="check" style={{marginBottom:14}}
      action={<div className="flex gap-2 flex-wrap">
        <Btn kind="ok" size="xs" onClick={()=>bulkAction(id=>{const item=list.find(x=>x.id===id); if(item.status!=="published")(tab==="blogs"?A.toggleBlogStatus:A.toggleTrainingStatus)(id);})}>Publish</Btn>
        <Btn kind="outline" size="xs" onClick={()=>bulkAction(id=>{const item=list.find(x=>x.id===id); if(item.status==="published")(tab==="blogs"?A.toggleBlogStatus:A.toggleTrainingStatus)(id);})}>Unpublish</Btn>
        <Btn kind="dangerSoft" size="xs" onClick={()=>bulkAction(tab==="blogs"?A.deleteBlog:A.deleteTraining)}>Delete</Btn></div>}>
      {sel.size} item{sel.size===1?"":"s"} selected</Banner>}
    <Card pad={mob?16:22}>
      {list.length===0
        ? <Empty icon={tab==="blogs"?"book":"cap"} title={rawList.length===0?`No ${tab==="blogs"?"articles":"trainings"} yet`:"Nothing matches that filter"}
            body={rawList.length===0?(allowed?`Publish your first ${tab==="blogs"?"article":"training"} — it appears on the home page and in the public library.`
              :"Publishing is currently disabled by an administrator."):"Try a different search term or status."}
            action={rawList.length===0&&allowed?<Btn kind="primary" icon="plus" onClick={()=>tab==="blogs"?A.editBlog("new"):A.editTraining("new")}>
              Create {tab==="blogs"?"article":"training"}</Btn>:null}/>
        : pg.pageItems.map(x=><Row key={x.id} item={x} type={tab==="blogs"?"blog":"training"}/>)}</Card>
    <Pagination {...pg}/>
    {viewingAnalytics&&<Modal onClose={()=>setViewingAnalytics(null)} title={`Analytics — ${viewingAnalytics.title}`} width={620}>
      {!analytics
        ? <div className="text-sm text-text-3 py-4 text-center">Loading…</div>
        : <div className="flex flex-col gap-4">
            <div className="grid gap-3" style={{gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))"}}>
              <Stat icon="eye" label="Total views" value={analytics.total.toLocaleString()} tone={C.brand}/>
              <Stat icon="users" label="Unique signed-in readers" value={analytics.uniqueSignedIn.toLocaleString()} tone={C.violet}/>
            </div>
            <div>
              <Lbl>Views by audience</Lbl>
              {analytics.byBucket.length===0
                ? <div className="text-sm text-text-3">No views yet.</div>
                : analytics.byBucket.map(b=><div key={b.bucket} className="flex justify-between py-1 text-sm">
                    <span className="text-text-2 capitalize">{b.bucket||"unknown"}</span>
                    <span className="font-semibold text-text tabular-nums">{b.n}</span>
                  </div>)}
            </div>
            <div>
              <Lbl>Last 30 days</Lbl>
              {analytics.daily.length===0
                ? <div className="text-sm text-text-3">No views in the last 30 days.</div>
                : <div className="flex gap-0.5 items-end" style={{height:70}}>
                    {analytics.daily.map(d=>{const max=Math.max(1,...analytics.daily.map(x=>x.n));
                      return <div key={d.day} title={`${d.day}: ${d.n} views`}
                        className="flex-1 bg-brand rounded-sm min-w-1" style={{height:`${(d.n/max)*100}%`}}/>;})}
                  </div>}
            </div>
            <div>
              <Lbl>Top referrers</Lbl>
              {analytics.topRefs.length===0
                ? <div className="text-sm text-text-3">All views arrived directly (no referrer header).</div>
                : analytics.topRefs.map(r=><div key={r.host} className="flex justify-between py-1 text-sm">
                    <span className="text-text-2 truncate">{r.host}</span>
                    <span className="font-semibold text-text tabular-nums shrink-0 ml-3">{r.n}</span>
                  </div>)}
            </div>
          </div>}
    </Modal>}
    {viewingHistory&&<Modal onClose={()=>setViewingHistory(null)} title={`Revision history — ${viewingHistory.item.title}`}>
      <div className="flex flex-col gap-2" style={{maxHeight:400,overflowY:"auto"}}>
        {revisions.length===0&&<div className="text-sm text-text-3 py-3">No earlier revisions — this hasn't been edited since it was created.</div>}
        {revisions.map(r=><div key={r.id} className="flex justify-between items-center gap-3 py-2.5 px-3 bg-bg rounded-lg">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-text overflow-hidden text-ellipsis whitespace-nowrap">{r.snapshot.title}</div>
            <div className="text-xs text-text-3 mt-0.5">{formatDateTime(r.createdAt,locale)}</div>
          </div>
          <Btn kind="outline" size="xs" onClick={()=>restore(r.id)}>Restore this version</Btn>
        </div>)}
      </div>
    </Modal>}
  </Page>;
}



/* Split views — separate nav items for Articles vs Trainings */
export function EmpArticlesPage(){const A=use(); return <ContentManager scope="employer" only="blogs"/>;}
export function EmpTrainingsAdminPage(){const A=use(); return <ContentManager scope="employer" only="trainings"/>;}

export function BlogEditor(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const isNew=A.editId==="new";
  const existing=A.blogs.find(b=>b.id===A.editId);
  const [d,setD]=useState(()=>existing?{...existing,bodyText:existing.body.map(([h,p])=>`${h}\n${p}`).join("\n\n"),
      bodyTextFr:(existing.bodyFr||[]).map(([h,p])=>`${h}\n${p}`).join("\n\n")}
    :{id:uid("b"),title:"",cat:"Career Advice",scene:"office",tone:C.brand,mins:5,
      author:A.user?.role==="admin"?"NorthHire Editorial":A.company?.name||"",authorSeed:A.user?.seed??0,
      date:"Today",excerpt:"",bodyText:"",titleFr:"",excerptFr:"",bodyTextFr:"",
      owner:A.user?.role==="admin"?"admin":A.company?.id,status:"draft",views:0,featured:false});
  const [err,setErr]=useState({});
  // Bill 96: employer/admin content can carry an optional French version alongside the English
  // original - a language tab switches which set of fields the form below is editing, rather
  // than doubling every field on screen at once.
  const [lang,setLang]=useState("en"); const isFrTab=lang==="fr";
  const [scheduleAt,setScheduleAt]=useState(existing?.scheduledAt?new Date(existing.scheduledAt).toISOString().slice(0,16):"");
  const set=(k,v)=>{setD(p=>({...p,[k]:v}));setErr(e=>({...e,[k]:undefined}));};
  const save=(status,scheduledAt)=>{const e={};
    if(!d.title.trim())e.title="Title is required";
    if(d.excerpt.trim().length<20)e.excerpt="Write a short summary, at least a sentence";
    if((d.bodyText||"").replace(/<[^>]+>/g,"").trim().length<80)e.bodyText="The article body is too short";
    setErr(e); if(Object.keys(e).length){focusFirstError(e); return;}
    const body=[["", d.bodyText]]; /* single HTML chunk; renderers will inject with dangerouslySetInnerHTML */
    // The French version is entirely optional - only sent (and only overwrites what's already
    // stored) once there's actually French text in at least one of the three fields.
    const hasFr=!!(d.titleFr?.trim()||d.excerptFr?.trim()||(d.bodyTextFr||"").replace(/<[^>]+>/g,"").trim());
    const bodyFr=hasFr?[["", d.bodyTextFr||""]]:null;
    A.saveBlog({...d,body,bodyFr,titleFr:hasFr?(d.titleFr||""):null,excerptFr:hasFr?(d.excerptFr||""):null,status,scheduledAt:scheduledAt||null},isNew);};
  return <Page narrow>
    <H1 sub={isNew?"Published articles appear on the home page and in Career resources":"Editing a published article"}
      action={<Btn kind="ghost" onClick={()=>A.go(A.user.role==="admin"?"admBlogs":"empContent")}>Cancel</Btn>}>
      {isNew?"New article":"Edit article"}</H1>
    <div className="grid gap-5 items-start" style={{gridTemplateColumns:mob?"1fr":"1fr 300px"}}>
      <Card pad={mob?20:26}>
        <Tabs items={[{k:"en",label:"English"},{k:"fr",label:"Français"}]} value={lang} onChange={setLang} style={{marginBottom:16}}/>
        {isFrTab&&<Banner tone="brand" icon="globe" style={{marginBottom:16}} title="Version française (facultative)">
          Laisser ces champs vides affiche la version anglaise aux lecteurs francophones. Bill 96 / Loi 96 : un employeur enregistré au Québec est tenu de pouvoir publier ce contenu en français.</Banner>}
        <div className="flex flex-col gap-4">
          <Field label={isFrTab?"Titre":"Title"} required={!isFrTab} error={err.title} name="title">
            <Input value={isFrTab?(d.titleFr||""):d.title} onChange={e=>set(isFrTab?"titleFr":"title",e.target.value)}
              placeholder={isFrTab?"Comment rédiger un CV canadien":"How to write a Canadian resume"} invalid={!isFrTab&&!!err.title}/></Field>
          {!isFrTab&&<div className={`grid gap-3 ${mob?"grid-cols-1":"grid-cols-2"}`}>
            <Field label="Category" required><Sel value={d.cat} onChange={e=>set("cat",e.target.value)}>
              {["Career Advice","Trades","Healthcare","Transport","Resume","Salary","Industry News","Safety"].map(o=><option key={o}>{o}</option>)}</Sel></Field>
            <Field label="Reading time (minutes)"><Input type="number" value={d.mins} onChange={e=>set("mins",Math.max(1,Number(e.target.value)||1))}/></Field></div>}
          <Field label={isFrTab?"Résumé":"Summary"} required={!isFrTab} error={err.excerpt} name="excerpt" hint={isFrTab?"":"One or two sentences shown on the card and at the top of the article."}>
            <Area rows={3} value={isFrTab?(d.excerptFr||""):d.excerpt} onChange={e=>set(isFrTab?"excerptFr":"excerpt",e.target.value)} invalid={!isFrTab&&!!err.excerpt}/></Field>
          <Field label={isFrTab?"Corps de l'article":"Article body"} required={!isFrTab} error={err.bodyText} name="bodyText"
            hint={isFrTab?"":"Each section: heading on the first line, the paragraph underneath, then a blank line before the next section."}>
            <RichText value={isFrTab?(d.bodyTextFr||""):d.bodyText} onChange={v=>set(isFrTab?"bodyTextFr":"bodyText",v)} rows={14} placeholder="Start writing. Use the toolbar for bold, italics, bullet lists, links..."/></Field>
          {!isFrTab&&<Field label="Author name"><Input value={d.author} onChange={e=>set("author",e.target.value)}/></Field>}</div>
        <div className="flex gap-2.5 items-end mt-6 pt-5 border-t border-line-soft flex-wrap">
          <Field label="Schedule for later (optional)" style={{flex:"1 1 220px",margin:0}}>
            <Input type="datetime-local" value={scheduleAt} onChange={e=>setScheduleAt(e.target.value)}/></Field>
          <div className="flex gap-2.5 justify-end flex-wrap">
            <Btn kind="outline" onClick={()=>save("draft")}>Save as draft</Btn>
            {scheduleAt
              ?<Btn kind="primary" icon="clock" onClick={()=>save("draft",new Date(scheduleAt).toISOString())}>Schedule publish</Btn>
              :<Btn kind="primary" icon="check" onClick={()=>save("published")}>Publish</Btn>}
          </div>
        </div></Card>
      <div className="flex flex-col gap-3.5">
        <Card pad={0} style={{overflow:"hidden"}}>
          <div className="py-3 px-4 border-b border-line-soft text-sm font-semibold text-text">Card preview</div>
          <SmartScene kind={d.scene} tone={d.tone} h={130} seed={d.id.charCodeAt(1)||0}/>
          <div className="p-4">
            <Tag tone="brand" sm>{d.cat}</Tag>
            <div className="text-base font-semibold text-text leading-snug mt-2.5 mb-2">{d.title||"Untitled article"}</div>
            <p className="text-xs text-text-2 leading-snug m-0">{d.excerpt||"Your summary appears here."}</p></div></Card>
        <Card pad={18}><Lbl>Thumbnail artwork</Lbl>
          <div className="grid grid-cols-3 gap-2 mb-3.5">
            {["office","trades","care","road","learn","money","resume","kitchen","warehouse","safety"].map(s=>
              <button key={s} onClick={()=>set("scene",s)} className="p-0 rounded-lg overflow-hidden cursor-pointer bg-transparent"
                style={{border:`2px solid ${d.scene===s?C.brand:C.line}`,lineHeight:0}}>
                <SmartScene kind={s} tone={d.tone} h={40} usePhoto={false}/></button>)}</div>
          <Lbl>Accent colour</Lbl>
          <div className="flex gap-2 flex-wrap">
            {[C.brand,"#B45309","#0F5C8C","#B02A26","#5B3BC4","#07724F","#8F5B05","#2A3852"].map(t=>
              <button key={t} onClick={()=>set("tone",t)} className="w-8 h-8 rounded-lg cursor-pointer" style={{background:t,
                border:d.tone===t?`3px solid ${C.text}`:`1px solid ${C.line}`}}/>)}</div></Card></div></div>
  </Page>;
}

export function TrainingEditor(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const isNew=A.editId==="new";
  const existing=A.trainings.find(t=>t.id===A.editId);
  const [d,setD]=useState(()=>existing?{...existing,modsText:existing.mods.join("\n"),outText:existing.outcomes.join("\n")}
    :{id:uid("t"),title:"",cat:"Safety",scene:"learn",tone:C.brand,provider:A.user?.role==="admin"?"NorthHire Learning":A.company?.name||"",
      providerSeed:A.user?.seed??0,level:"Beginner",hours:4,price:0,rating:4.5,enrolled:0,modsText:"",outText:"",about:"",titleFr:"",aboutFr:"",
      owner:A.user?.role==="admin"?"admin":A.company?.id,status:"draft",featured:false});
  const [err,setErr]=useState({});
  const [showFr,setShowFr]=useState(!!(existing?.titleFr||existing?.aboutFr));
  const [scheduleAt,setScheduleAt]=useState(existing?.scheduledAt?new Date(existing.scheduledAt).toISOString().slice(0,16):"");
  const set=(k,v)=>{setD(p=>({...p,[k]:v}));setErr(e=>({...e,[k]:undefined}));};
  const save=(status,scheduledAt)=>{const e={};
    if(!d.title.trim())e.title="Title is required";
    const aboutTxt=(d.aboutRich||d.about||"").replace(/<[^>]+>/g,"").trim();
    if(aboutTxt.length<30)e.about="Describe the course in a sentence or two";
    if((d.mods||[]).length<2)e.mods="Add at least two modules";
    if((d.outcomes||[]).length<2)e.outcomes="Add at least two learning outcomes";
    setErr(e); if(Object.keys(e).length){focusFirstError(e); return;}
    A.saveTraining({...d,about:aboutTxt,mods:(d.mods||[]).map(m=>m.title||m).filter(Boolean),outcomes:d.outcomes,status,scheduledAt:scheduledAt||null},isNew);};

  const addMod=()=>set("mods",[...(d.mods||[]),{id:uid("m"),title:"New module",body:"",videoUrl:""}]);
  const updMod=(id,patch)=>set("mods",(d.mods||[]).map(m=>m.id===id?{...m,...patch}:m));
  const delMod=(id)=>set("mods",(d.mods||[]).filter(m=>m.id!==id));
  const moveMod=(id,dir)=>{const mods=[...(d.mods||[])]; const i=mods.findIndex(m=>m.id===id);
    const j=i+dir; if(j<0||j>=mods.length)return;
    [mods[i],mods[j]]=[mods[j],mods[i]]; set("mods",mods);};

  const addTest=()=>set("tests",[...(d.tests||[]),{id:uid("q"),question:"New question",options:["Option A","Option B","Option C","Option D"],answerIdx:0}]);
  const updTest=(id,patch)=>set("tests",(d.tests||[]).map(t=>t.id===id?{...t,...patch}:t));
  const delTest=(id)=>set("tests",(d.tests||[]).filter(t=>t.id!==id));

  return <Page narrow>
    <H1 sub={isNew?"Published trainings appear on the home page and in the Trainings library":"Editing a training course"}
      action={<Btn kind="ghost" onClick={()=>A.go(A.user.role==="admin"?"admTrainings":"empContent")}>Cancel</Btn>}>
      {isNew?"New training":"Edit training"}</H1>
    <div className="grid gap-5 items-start" style={{gridTemplateColumns:mob?"1fr":"1fr 300px"}}>
      <Card pad={mob?20:26}>
        <div className="flex flex-col gap-4">
          <Field label="Course title" required error={err.title} name="title"><Input value={d.title} onChange={e=>set("title",e.target.value)}
            placeholder="WHMIS 2015 and Workplace Safety" invalid={!!err.title}/></Field>
          <div className={`grid gap-3 ${mob?"grid-cols-2":"grid-cols-4"}`}>
            <Field label="Category"><Sel value={d.cat} onChange={e=>set("cat",e.target.value)}>
              {["Safety","Trades","Healthcare","Transport","Hospitality","Warehouse","Office","Career","Language","Finance"].map(o=><option key={o}>{o}</option>)}</Sel></Field>
            <Field label="Level"><Sel value={d.level} onChange={e=>set("level",e.target.value)}>
              {["Beginner","Intermediate","Advanced"].map(o=><option key={o}>{o}</option>)}</Sel></Field>
            <Field label="Hours"><Input type="number" value={d.hours} onChange={e=>set("hours",Math.max(1,Number(e.target.value)||1))}/></Field>
            <Field label="Price (CAD)"><Input type="number" value={d.price} onChange={e=>set("price",Math.max(0,Number(e.target.value)||0))} suffix={d.price===0?"Free":""}/></Field></div>
          <Field label="About this course" required error={err.about} name="about">
            <RichText value={d.aboutRich||d.about} onChange={v=>set("aboutRich",v)}
              placeholder="Who the course is for and what certificate it leads to." rows={5}/></Field>

          {/* Bill 96: optional French version of the title/description, same as the blog editor's
              language tab but kept inline here since the rest of this form (modules, tests,
              trainer bio) isn't part of Bill 96's scope. */}
          {showFr
            ? <Card pad={16} style={{background:C.bg}}>
                <div className="flex justify-between items-center mb-3">
                  <Lbl style={{margin:0}}>Version française (facultative)</Lbl>
                  <Btn kind="ghost" size="xs" onClick={()=>{setShowFr(false);set("titleFr","");set("aboutFr","");}}>Remove</Btn></div>
                <div className="flex flex-col gap-3">
                  <Field label="Titre"><Input value={d.titleFr||""} onChange={e=>set("titleFr",e.target.value)}/></Field>
                  <Field label="Description"><Area rows={4} value={d.aboutFr||""} onChange={e=>set("aboutFr",e.target.value)}/></Field></div>
              </Card>
            : <Btn kind="outline" size="sm" icon="globe" onClick={()=>setShowFr(true)}>Add French version</Btn>}

          <div className={`grid gap-3 ${mob?"grid-cols-1":"grid-cols-2"}`}>
            <Field label="Provider name"><Input value={d.provider} onChange={e=>set("provider",e.target.value)}
              placeholder="e.g. NorthHire Learning"/></Field>
            <Field label="Trainer / guest speaker" hint="Name of the person delivering the course.">
              <Input value={d.trainerName} onChange={e=>set("trainerName",e.target.value)} placeholder="e.g. Dr. Jane Smith, CRSP"/></Field>
          </div>

          <Field label="Trainer bio" hint="Short paragraph about the trainer's background.">
            <Area rows={3} value={d.trainerBio} onChange={e=>set("trainerBio",e.target.value)}
              placeholder="e.g. 15 years in industrial safety with the Alberta Construction Safety Association..."/></Field>

          <div>
            <div className="flex justify-between items-center mb-2.5">
              <div><div className="text-sm font-semibold text-text">Course modules</div>
                <div className="text-xs text-text-3 mt-0.5">Add each lesson or section, in order.</div></div>
              <Btn kind="outline" size="sm" icon="plus" onClick={addMod}>Add module</Btn>
            </div>
            {err.mods&&<div className="text-xs text-red mb-2">{err.mods}</div>}
            {(d.mods||[]).length===0
              ? <Empty icon="book" title="No modules yet" body="Add your first module to start building this course."/>
              : <div className="flex flex-col gap-2.5">
                  {(d.mods||[]).map((m,i)=><div key={m.id} className="border border-line rounded-xl p-3 bg-white">
                    <div className="flex gap-2 items-center mb-2">
                      <div className="w-6 h-6 rounded-full bg-wash text-brand flex items-center justify-center text-xs font-bold shrink-0">{i+1}</div>
                      <Input value={m.title} onChange={e=>updMod(m.id,{title:e.target.value})} placeholder="Module title"/>
                      <div className="flex gap-0.5">
                        <Btn kind="ghost" size="xs" onClick={()=>moveMod(m.id,-1)} disabled={i===0}>↑</Btn>
                        <Btn kind="ghost" size="xs" onClick={()=>moveMod(m.id,1)} disabled={i===d.mods.length-1}>↓</Btn>
                        <Btn kind="ghost" size="xs" icon="trash" onClick={()=>delMod(m.id)}/>
                      </div>
                    </div>
                    <Input value={m.videoUrl||""} onChange={e=>updMod(m.id,{videoUrl:e.target.value})}
                      placeholder="Optional video URL (YouTube, Vimeo, etc.)" icon="play"/>
                    <div className="mt-2">
                      <Area rows={3} value={m.body||""} onChange={e=>updMod(m.id,{body:e.target.value})}
                        placeholder="Module content, notes, or references..."/>
                    </div>
                  </div>)}
                </div>}
          </div>

          <Field label="Learning outcomes" required error={err.outcomes} name="outcomes" hint="What learners will be able to do after finishing the course.">
            <InlineList value={d.outcomes||[]} onChange={v=>set("outcomes",v)} icon="check"
              placeholder="Add an outcome and press Enter"/></Field>

          <div>
            <div className="flex justify-between items-center mb-2.5">
              <div><div className="text-sm font-semibold text-text">In-training assessment</div>
                <div className="text-xs text-text-3 mt-0.5">Optional multiple-choice test to certify learners.</div></div>
              <Btn kind="outline" size="sm" icon="plus" onClick={addTest}>Add question</Btn>
            </div>
            {(d.tests||[]).length===0
              ? <Empty icon="check" title="No test questions yet" body="Add some to require a passing quiz before certification."/>
              : <>
                <div className={`grid gap-3 mb-2.5 ${mob?"grid-cols-1":"grid-cols-2"}`}>
                  <Field label="Passing score (%)"><Input type="number" min="1" max="100" value={d.passingScore}
                    onChange={e=>set("passingScore",Math.min(100,Math.max(1,Number(e.target.value)||70)))}/></Field>
                  <Field label="Randomize question order">
                    <div className="flex items-center gap-2.5 py-3">
                      <Switch on={d.randomize} onChange={v=>set("randomize",v)}/>
                      <span className="text-sm text-text-2">{d.randomize?"On":"Off"}</span>
                    </div></Field>
                </div>
                <div className="flex flex-col gap-2.5">
                  {(d.tests||[]).map((t,i)=><div key={t.id} className="border border-line rounded-xl p-3 bg-white">
                    <div className="flex gap-2 items-center mb-2.5">
                      <div className="w-6 h-6 rounded-full bg-warn-bg text-warn flex items-center justify-center text-xs font-bold shrink-0">Q{i+1}</div>
                      <Input value={t.question} onChange={e=>updTest(t.id,{question:e.target.value})} placeholder="Question text"/>
                      <Btn kind="ghost" size="xs" icon="trash" onClick={()=>delTest(t.id)}/>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {t.options.map((o,j)=><label key={j} className="flex gap-2 items-center cursor-pointer">
                        <input type="radio" name={`ans_${t.id}`} checked={t.answerIdx===j} onChange={()=>updTest(t.id,{answerIdx:j})}/>
                        <Input value={o} onChange={e=>updTest(t.id,{options:t.options.map((x,k)=>k===j?e.target.value:x)})} placeholder={`Option ${j+1}`}/>
                      </label>)}
                    </div>
                  </div>)}
                </div>
              </>}
          </div>
          </div>
        <div className="flex gap-2.5 items-end mt-6 pt-5 border-t border-line-soft flex-wrap">
          <Field label="Schedule for later (optional)" style={{flex:"1 1 220px",margin:0}}>
            <Input type="datetime-local" value={scheduleAt} onChange={e=>setScheduleAt(e.target.value)}/></Field>
          <div className="flex gap-2.5 justify-end flex-wrap">
            <Btn kind="outline" onClick={()=>save("draft")}>Save as draft</Btn>
            {scheduleAt
              ?<Btn kind="primary" icon="clock" onClick={()=>save("draft",new Date(scheduleAt).toISOString())}>Schedule publish</Btn>
              :<Btn kind="primary" icon="check" onClick={()=>save("published")}>Publish</Btn>}
          </div>
        </div></Card>
      <div className="flex flex-col gap-3.5">
        <Card pad={0} style={{overflow:"hidden"}}>
          <div className="py-3 px-4 border-b border-line-soft text-sm font-semibold text-text">Card preview</div>
          <div className="relative"><SmartScene kind={d.scene} tone={d.tone} h={120} seed={d.id.charCodeAt(1)||0}/>
            <div className="absolute top-2.5 left-2.5"><Tag tone={d.price===0?"ok":"dark"} sm>{d.price===0?"Free":money(d.price)}</Tag></div></div>
          <div className="p-4">
            <div className="flex gap-2 mb-2"><Tag sm>{d.level}</Tag><Tag sm icon="clock">{d.hours} h</Tag></div>
            <div className="text-base font-semibold text-text leading-snug">{d.title||"Untitled training"}</div></div></Card>
        <Card pad={18}><Lbl>Thumbnail artwork</Lbl>
          <div className="grid grid-cols-3 gap-2 mb-3.5">
            {["learn","safety","trades","care","road","kitchen","warehouse","office","money","resume"].map(s=>
              <button key={s} onClick={()=>set("scene",s)} className="p-0 rounded-lg overflow-hidden cursor-pointer bg-transparent"
                style={{border:`2px solid ${d.scene===s?C.brand:C.line}`,lineHeight:0}}>
                <SmartScene kind={s} tone={d.tone} h={40} usePhoto={false}/></button>)}</div>
          <Lbl>Accent colour</Lbl>
          <div className="flex gap-2 flex-wrap">
            {[C.brand,"#B45309","#0F5C8C","#B02A26","#5B3BC4","#07724F","#8F5B05","#2A3852"].map(t=>
              <button key={t} onClick={()=>set("tone",t)} className="w-8 h-8 rounded-lg cursor-pointer" style={{background:t,
                border:d.tone===t?`3px solid ${C.text}`:`1px solid ${C.line}`}}/>)}</div></Card></div></div>
  </Page>;
}

export function EmpCompany(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t}=useTranslation();
  const [d,setD]=useState({...A.company});
  const [confirmDiscard,setConfirmDiscard]=useState(false);
  useEffect(()=>setD({...A.company}),[A.company]);
  const dirty=JSON.stringify(d)!==JSON.stringify(A.company);
  const set=(k,v)=>setD(p=>({...p,[k]:v}));
  const branded=A.can("branded");
  return <Page narrow>
    <H1 sub={t("employer.company.companySub")}
      action={<Btn kind="outline" size="sm" iconR="chevR" onClick={()=>A.openEmployer(A.company.id)}>{t("employer.company.viewPublicPage")}</Btn>}>{t("employer.company.companyProfile")}</H1>
    <Card pad={mob?20:26}>
      <div className="flex gap-4 items-center mb-6 flex-wrap">
        <SmartLogo e={d} size={72} radius={18}/>
        <div className="flex-1" style={{minWidth:180}}>
          <div className="flex items-center justify-between gap-2">
            <Lbl>{t("employer.company.logoMark")}</Lbl>
            {!branded&&<button type="button" onClick={()=>A.requestUpgrade("branded",t("employer.company.brandedFeature"),"building")}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand bg-transparent border-0 cursor-pointer p-0"><I n="lock" s={12}/>Growth+</button>}
          </div>
          <div className={`flex gap-2 flex-wrap mb-3 ${branded?"":"opacity-45 pointer-events-none"}`}>
            {Object.keys(MARKS).map(k=><button key={k} onClick={()=>set("mark",k)} className="p-0 rounded-xl overflow-hidden cursor-pointer bg-transparent"
              style={{border:`2px solid ${d.mark===k?C.brand:C.line}`,lineHeight:0}}>
              <Mark kind={k} a={d.a} b={d.b} size={38}/></button>)}</div>
          <Lbl>{t("employer.company.brandColour")}</Lbl>
          <div className={`flex gap-2 flex-wrap ${branded?"":"opacity-45 pointer-events-none"}`}>
            {["#005CCC","#B45309","#0F5C8C","#B02A26","#0B6B3A","#5B2E8C","#28404F","#A14A18"].map(c=>
              <button key={c} onClick={()=>set("a",c)} className="w-7 h-7 rounded-lg cursor-pointer" style={{background:c,
                border:d.a===c?`3px solid ${C.text}`:`1px solid ${C.line}`}}/>)}</div></div></div>
      <div className={`grid gap-3.5 ${mob?"grid-cols-1":"grid-cols-2"}`}>
        <Field label={t("employer.company.companyName")} required><Input value={d.name} onChange={e=>set("name",e.target.value)}/></Field>
        <Field label={t("employer.company.industry")}><Input value={d.industry} onChange={e=>set("industry",e.target.value)}/></Field>
        <Field label={t("employer.company.cityLabel")}><Input icon="pin" value={d.city} onChange={e=>set("city",e.target.value)}/></Field>
        <Field label={t("employer.company.provinceLabel")}><Sel value={PROVS.find(p=>PCODE[p]===d.prov)||"Ontario"} onChange={e=>set("prov",PCODE[e.target.value])}>
          {PROVS.map(p=><option key={p}>{p}</option>)}</Sel></Field>
        <Field label={t("employer.company.size")}><Sel value={d.size} onChange={e=>set("size",e.target.value)}>
          {["1-50","51-200","201-1,000","1,000-5,000","5,000+","10,000+"].map(o=><option key={o}>{o}</option>)}</Sel></Field>
        <Field label={t("employer.company.foundedLabel")}><Input type="number" value={d.founded} onChange={e=>set("founded",Number(e.target.value)||2000)}/></Field>
        <Field label={t("employer.company.websiteLabel")} style={{gridColumn:mob?"auto":"span 2"}}><Input icon="globe" value={d.site} onChange={e=>set("site",e.target.value)}/></Field>
        <Field label={t("employer.company.craBusinessNumber")} hint={t("employer.company.craHint")}><Input icon="file" value={d.businessNumber||""} onChange={e=>set("businessNumber",e.target.value.replace(/\s/g,""))}/></Field>
        <Field label={t("employer.company.aboutCompanyLabel")} style={{gridColumn:mob?"auto":"span 2"}} hint={t("employer.company.aboutCompanyHint")}>
          <Area rows={5} value={d.about} onChange={e=>set("about",e.target.value)}/></Field></div>
      <div className="flex gap-2.5 justify-end mt-6 pt-5 border-t border-line-soft">
        {dirty&&<Btn kind="ghost" onClick={()=>setConfirmDiscard(true)}>{t("employer.company.discard")}</Btn>}
        <Btn kind="primary" icon="check" disabled={!dirty} onClick={()=>A.saveCompany(d)}>{dirty?t("employer.company.saveChanges"):t("employer.company.saved")}</Btn></div></Card>
    <_PipelineStageEditor A={A} mob={mob}/>
    <_StageAutomationsEditor A={A} mob={mob}/>
    <ConfirmDialog open={confirmDiscard} onClose={()=>setConfirmDiscard(false)} confirmLabel={t("employer.company.discard")}
      title={t("employer.company.discardTitle")} onConfirm={()=>setD({...A.company})}>
      {t("employer.company.discardBody")}
    </ConfirmDialog>
  </Page>;
}

/* Custom hiring stages, sold on Growth+ and previously not built at all. The server refuses a
   save that would strand candidates in a stage no longer on the board, so the error surfaced
   here is the real one, naming which stages are still occupied. */
function _PipelineStageEditor({A,mob}){
  const canCustomise=A.can("customStages");
  const isOwner=A.user?.employerRole==="owner";
  const saved=A.stagesFor(A.company.id);
  const [stages,setStages]=useState(saved);
  const [err,setErr]=useState(""); const [saving,setSaving]=useState(false);
  useEffect(()=>{setStages(A.stagesFor(A.company.id));},[A.company.id,A.company.pipelineStages]);

  const dirty=JSON.stringify(stages)!==JSON.stringify(saved);
  const setAt=(i,v)=>setStages(s=>s.map((x,k)=>k===i?v:x));
  const removeAt=i=>setStages(s=>s.filter((_,k)=>k!==i));
  const move=(i,dir)=>setStages(s=>{const n=[...s];const j=i+dir;if(j<0||j>=n.length)return s;[n[i],n[j]]=[n[j],n[i]];return n;});

  const save=async()=>{
    setErr(""); setSaving(true);
    const r=await A.savePipelineStages(stages.map(s=>s.trim()).filter(Boolean));
    setSaving(false);
    if(!r.ok)setErr(r.msg);
  };

  return <Card pad={mob?20:26} style={{marginTop:16}}>
    <div className="flex justify-between items-center flex-wrap gap-2 mb-1">
      <Lbl style={{marginBottom:0}}>Hiring pipeline stages</Lbl>
      {!canCustomise&&<button type="button" onClick={()=>A.requestUpgrade("customStages","Custom pipeline stages","users")}
        className="bg-transparent border-0 p-0 cursor-pointer text-xs font-semibold text-brand underline">Available on Growth — see plans</button>}
    </div>
    <div className="text-sm text-text-2 mb-4 leading-relaxed">
      The columns your candidate board uses. Candidates already in a stage keep it — remove a stage
      only after moving everyone out of it.
    </div>

    {err&&<Banner tone="danger" icon="alert" style={{marginBottom:14}}>{err}</Banner>}

    <div className={`flex flex-col gap-2 ${canCustomise&&isOwner?"":"opacity-50 pointer-events-none"}`}>
      {stages.map((s,i)=>
        <div key={i} className="flex gap-2 items-center">
          <span className="text-xs text-text-3 w-5 shrink-0 text-right tabular-nums">{i+1}</span>
          <div className="flex-1 min-w-0"><Input value={s} onChange={e=>setAt(i,e.target.value)} maxLength={32}/></div>
          <Btn kind="ghost" size="xs" title="Move earlier" aria-label={`Move ${s||"stage"} earlier`} onClick={()=>move(i,-1)} disabled={i===0}>↑</Btn>
          <Btn kind="ghost" size="xs" title="Move later" aria-label={`Move ${s||"stage"} later`} onClick={()=>move(i,1)} disabled={i===stages.length-1}>↓</Btn>
          <Btn kind="ghost" size="xs" icon="trash" title="Remove stage" aria-label={`Remove ${s||"stage"}`} onClick={()=>removeAt(i)} disabled={stages.length<=2}/>
        </div>)}
      {stages.length<10&&<div><Btn kind="outline" size="sm" icon="plus" onClick={()=>setStages(s=>[...s,""])}>Add stage</Btn></div>}
    </div>

    {canCustomise&&isOwner&&<div className="flex gap-2.5 justify-end mt-5 pt-4 border-t border-line-soft">
      {dirty&&<Btn kind="ghost" onClick={()=>{setStages(saved);setErr("");}}>Reset</Btn>}
      <Btn kind="primary" icon="check" disabled={!dirty||saving} onClick={save}>{saving?"Saving…":dirty?"Save stages":"Saved"}</Btn>
    </div>}
    {canCustomise&&!isOwner&&<div className="text-xs text-text-3 mt-3">Only the account owner can change pipeline stages.</div>}
  </Card>;
}

/* One rule per stage that fires the linked template as an in-app message when a candidate moves
   into that stage. Deliberately kept as a template BINDING rather than a "send this message"
   editor - the template already exists as its own object, and duplicating its body inline here
   would silently drift the moment the underlying template is edited. */
function _StageAutomationsEditor({A,mob}){
  const {t}=useTranslation();
  const stages=A.stagesFor(A.company.id);
  const templates=A.messageTemplates;
  useEffect(()=>{A.loadStageAutomations();/* eslint-disable-next-line react-hooks/exhaustive-deps */},[]);
  const byStage=Object.fromEntries((A.stageAutomations||[]).map(a=>[a.stage,a]));
  const save=async(stage,templateId)=>{await A.setStageAutomation(stage,templateId||"",!!templateId); A.toast(templateId?`Automation set for "${stage}"`:`Automation removed for "${stage}"`,"ok");};
  return <Card pad={mob?20:26} style={{marginTop:16}}>
    <Lbl>Stage-change automations</Lbl>
    <div className="text-sm text-text-2 mb-4 leading-relaxed">
      When a candidate lands on a stage, the linked template is sent to them as a message from
      whoever ran the move. Merge fields {"{{name}}"}, {"{{job}}"} and {"{{company}}"} are
      substituted before sending.
    </div>
    {templates.length===0
      ? <div className="text-sm text-text-3 py-2">Save a message as a template first — the picker in a candidate's message modal has a "Save this message as a template" action.</div>
      : <div className="flex flex-col gap-2.5">{stages.map(stage=>{
          const cur=byStage[stage]?.templateId||"";
          return <div key={stage} className="flex gap-2.5 items-center flex-wrap">
            <div className="text-sm font-semibold text-text w-30 shrink-0">{applicationStageLabel(stage,t)}</div>
            <div className="flex-1 min-w-50">
              <Sel value={cur} onChange={e=>save(stage,e.target.value)}>
                <option value="">— No automation —</option>
                {templates.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
              </Sel>
            </div>
            {cur&&<Tag tone="ok" sm>Enabled</Tag>}
          </div>;})}</div>}
  </Card>;
}

export function EmpTeam(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t}=useTranslation();
  const isOwner=A.user?.employerRole==="owner";
  const {members,invites,seatLimit,seatsUsed}=A.team;
  const [inviteEmail,setInviteEmail]=useState(""); const [inviting,setInviting]=useState(false); const [err,setErr]=useState("");
  const [removing,setRemoving]=useState(null); const [lastInviteLink,setLastInviteLink]=useState(null);
  /* Audit trail is lazy-loaded on mount and after every mutating action, so anyone opening this
     page sees the current state without needing to refresh. */
  const [audit,setAudit]=useState([]);
  const refreshAudit=async()=>setAudit(await A.loadTeamAudit());
  useEffect(()=>{refreshAudit();/* eslint-disable-next-line react-hooks/exhaustive-deps */},[members.length,invites.length]);
  const actionLabel={
    "team.invite.sent":{icon:"mail",tone:"neutral",label:"Invite sent"},
    "team.invite.revoked":{icon:"x",tone:"warn",label:"Invite revoked"},
    "team.invite.accepted":{icon:"check",tone:"ok",label:"Invite accepted"},
    "team.member.removed":{icon:"trash",tone:"danger",label:"Member removed"},
  };
  const unlimited=seatLimit==null; // server sends null for Infinity - JSON has no Infinity of its own
  const atLimit=!unlimited&&seatsUsed>=seatLimit;
  const send=async()=>{
    setErr(""); setLastInviteLink(null); if(!inviteEmail.trim())return;
    setInviting(true); const r=await A.inviteTeammate(inviteEmail.trim()); setInviting(false);
    if(!r.ok){setErr(r.msg);return;}
    setLastInviteLink(`${window.location.origin}/invite/${r.token}`);
    setInviteEmail("");
  };
  return <Page narrow>
    <H1 sub={t("employer.team.teamSub")}>{t("employer.team.teamTitle")}</H1>
    <Card pad={mob?20:26} style={{marginBottom:16}}>
      <div className="flex justify-between items-center mb-4">
        <Lbl style={{marginBottom:0}}>{t("employer.team.seatsLabel")}</Lbl>
        <Tag tone={atLimit?"warn":"neutral"} sm>{seatsUsed} of {unlimited?"unlimited":seatLimit} {t("employer.team.used")}</Tag>
      </div>
      {isOwner&&<>
        <div className="flex gap-2.5 flex-wrap">
          <div className="flex-1 min-w-50"><Input icon="mail" type="email" value={inviteEmail} onChange={e=>{setInviteEmail(e.target.value);setErr("");}} placeholder="teammate@yourcompany.ca" disabled={atLimit}/></div>
          <Btn kind="primary" icon="mail" onClick={send} disabled={inviting||!inviteEmail.trim()||atLimit}>{inviting?t("employer.team.sending"):t("employer.team.sendInvite")}</Btn>
        </div>
        {err&&<div className="text-sm mt-2" style={{color:C.danger}}>{err}</div>}
        {lastInviteLink&&<Banner tone="ok" icon="mail" style={{marginTop:12}} title={t("employer.team.inviteCreatedTitle")}>
          <div className="flex gap-2 items-center flex-wrap">
            <code className="text-xs bg-white border border-line-2 rounded-lg py-1.5 px-2.5 break-all">{lastInviteLink}</code>
            <Btn kind="outline" size="sm" icon="copy" onClick={()=>{navigator.clipboard?.writeText(lastInviteLink);A.toast("Invite link copied");}}>{t("employer.team.copyLink")}</Btn>
          </div>
        </Banner>}
        {atLimit&&<Banner tone="warn" icon="alert" style={{marginTop:12}} title={t("employer.team.seatLimitTitle")}
          action={<Btn kind="primary" size="sm" onClick={()=>A.go("pricing")}>{t("employer.team.seePlan")}</Btn>}>
          {t("employer.team.seatLimitBody")}</Banner>}
      </>}
    </Card>
    <Card pad={mob?20:26} style={{marginBottom:16}}>
      <Lbl>{t("employer.team.peopleWithAccess")}</Lbl>
      <div className="flex flex-col gap-2">
        {members.map(m=><div key={m.id} className="flex items-center gap-3 py-2.5 border-b border-line-soft">
          <SmartPortrait seed={0} size={36} radius={10}/>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-text">{m.name}{m.id===A.user?.id&&<span className="text-text-3 font-normal"> (you)</span>}</div>
            <div className="text-xs text-text-3 overflow-hidden text-ellipsis whitespace-nowrap">{m.email}</div></div>
          <Tag tone={m.role==="owner"?"brand":"neutral"} sm>{m.role==="owner"?t("employer.team.owner"):t("employer.team.member")}</Tag>
          {isOwner&&m.role!=="owner"&&<Btn kind="ghost" size="xs" icon="trash" onClick={()=>setRemoving(m)}/>}
        </div>)}
      </div>
    </Card>
    {isOwner&&invites.length>0&&<Card pad={mob?20:26}>
      <Lbl>{t("employer.team.pendingInvites")}</Lbl>
      <div className="flex flex-col gap-2">
        {invites.map(inv=><div key={inv.id} className="flex items-center gap-3 py-2.5 border-b border-line-soft">
          <div className="w-9 h-9 rounded-lg bg-wash text-brand flex items-center justify-center shrink-0"><I n="mail" s={16}/></div>
          <div className="flex-1 min-w-0 text-sm font-semibold text-text overflow-hidden text-ellipsis whitespace-nowrap">{inv.email}</div>
          <Tag tone="warn" sm>Pending</Tag>
          <Btn kind="ghost" size="xs" icon="x" onClick={()=>A.revokeInvite(inv.id)}/>
        </div>)}
      </div>
    </Card>}
    {/* Referral program: every employer account has a stable code. Sharing the signup URL with
        another company owner records the attribution when they sign up; future work is to
        actually issue a credit note when the referred account starts paying. Kept as a
        display + share-URL only for now - no fake "you've earned $X" until the credit
        pipeline is real. */}
    {A.company?.referralCode&&<Card pad={mob?20:26} style={{marginTop:16}}>
      <Lbl>{t("employer.team.referOtherCompany")}</Lbl>
      <div className="text-sm text-text-2 mb-3 leading-relaxed">
        {t("employer.team.referralDesc",{code:<code className="bg-brand-wash border border-brand-line text-brand rounded px-2 py-0.5 font-semibold">{A.company.referralCode}</code>})}
      </div>
      {(()=>{const url=`${window.location.origin}/signup?ref=${encodeURIComponent(A.company.referralCode)}`;
        return <div className="flex gap-2 items-center flex-wrap">
          <code className="text-xs bg-white border border-line-2 rounded-lg py-1.5 px-2.5 break-all flex-1 min-w-50">{url}</code>
          <Btn kind="outline" size="sm" icon="copy" onClick={()=>{navigator.clipboard?.writeText(url); A.toast("Share link copied");}}>{t("employer.team.copyShareLink")}</Btn>
        </div>;})()}
    </Card>}

    {/* Audit trail - who did what on this account, and when. Any teammate can read it; the tracker
        called out the missing paper trail for team-management actions specifically. */}
    <Card pad={mob?20:26} style={{marginTop:16}}>
      <Lbl>{t("employer.team.teamActivity")}</Lbl>
      {audit.length===0
        ? <div className="text-sm text-text-3 py-2">{t("employer.team.noActivity")}</div>
        : <div className="flex flex-col">{audit.map(ev=>{
            const meta=actionLabel[ev.action]||{icon:"file",tone:"neutral",label:ev.action};
            const when=formatDateTime(ev.at,locale,{day:"numeric",month:"short",year:"numeric",hour:"numeric",minute:"2-digit"});
            return <div key={ev.id} className="flex items-center gap-3 py-2.5 border-b border-line-soft">
              <div className="w-9 h-9 rounded-lg bg-wash text-brand flex items-center justify-center shrink-0"><I n={meta.icon} s={16}/></div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-text">{ev.detail}</div>
                <div className="text-xs text-text-3 mt-0.5">by {ev.actorName} • {when}</div></div>
              <Tag tone={meta.tone} sm>{meta.label}</Tag>
            </div>;})}</div>}
    </Card>
    <ConfirmDialog open={!!removing} onClose={()=>setRemoving(null)} confirmLabel={t("common.delete")}
      title={t("employer.team.removeTitle",{name:removing?.name})} onConfirm={()=>{A.removeTeammate(removing.id);setRemoving(null);}}>
      {t("employer.team.removeBody")}
    </ConfirmDialog>
  </Page>;
}

export function EmpBilling(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const live=A.jobs.filter(j=>j.e===A.company.id&&j.status==="live").length;
  const plan=A.company.plan||"Free";
  const limit=A.PLANS[plan]?.jobs??1;
  const price=A.PLANS[plan]?.price||0;
  const nextRenewal=(()=>{const d=new Date();d.setMonth(d.getMonth()+1,1);return formatDate(d,locale,{day:"numeric",month:"long",year:"numeric"});})();
  const invoices=A.employerInvoices.map(inv=>({id:inv.id,date:formatDate(inv.createdAt,locale,{day:"numeric",month:"short",year:"numeric"}),
    amt:inv.amountPretax,tax:inv.tax,taxLabel:inv.taxLabel,total:inv.total,plan:inv.plan,billingCycle:inv.billingCycle||"monthly"}));
  // Lands here on the real redirect back from Stripe Checkout (see server/stripe.js's success_url)
  // - verifies the session server-side (never trusts the URL alone) and shows the outcome once,
  // then strips the query string so a refresh of this page doesn't re-verify the same session.
  const [checkoutResult,setCheckoutResult]=useState(null);
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    if(params.get("checkout")==="success"&&params.get("session_id")){
      A.verifyCheckout(params.get("session_id")).then(r=>setCheckoutResult(r.paid?{ok:true}:{ok:false,msg:r.error||"Payment could not be confirmed."}));
      window.history.replaceState({},"",window.location.pathname);
    }
  },[]);
  const [showCard,setShowCard]=useState(false);
  const [portalLoading,setPortalLoading]=useState(false);
  return <Page narrow>
    <H1 sub={t("employer.billing.billingSub")}>{t("employer.billing.billing")}</H1>
    {checkoutResult&&<Banner tone={checkoutResult.ok?"ok":"danger"} icon={checkoutResult.ok?"check":"alert"} style={{marginBottom:16}}
      title={checkoutResult.ok?t("employer.billing.paymentConfirmed"):t("employer.billing.paymentNotConfirmed")}>
      {checkoutResult.ok?t("employer.billing.planUpgraded"):checkoutResult.msg}</Banner>}
    <Card pad={mob?20:26} style={{marginBottom:16,background:C.ink,borderColor:C.ink}}>
      <div className="flex justify-between gap-4 flex-wrap text-white">
        <div className="grow shrink basis-60">
          <Tag tone="onDark">{t("employer.billing.currentPlan")}</Tag>
          <div className="text-2xl font-bold tracking-tight my-3">{plan} — {A.PLANS[plan]?.price===0?t("employer.billing.freeForever"):`$${A.PLANS[plan]?.price}/month`}</div>
          <div className="text-sm text-white/55">{price>0?t("employer.billing.renews",{date:nextRenewal})+" • ":""}{live} of {limit===Infinity?"unlimited":limit} {t("employer.billing.jobSlotsInUse")}</div>
          <div className="mt-4 max-w-75"><Bar v={limit===Infinity?100:(live/limit)*100} tone="#4ADE80"/></div></div>
        <div className="flex gap-2.5 flex-wrap items-start">
          <Btn kind="onDark" onClick={()=>A.go("pricing")}>{t("employer.billing.changePlan")}</Btn></div></div></Card>

    <Card style={{marginBottom:16,borderRadius:20}}>
      <H2 sub={t("employer.billing.paymentMethodSub")}>{t("employer.billing.paymentMethod")}</H2>
      {price===0
        ?<div className="text-sm text-text-3 py-2">{t("employer.billing.noPaymentMethod")}</div>
        :<Btn kind="outline" icon="wallet" disabled={portalLoading} onClick={async()=>{setPortalLoading(true);const r=await A.openBillingPortal();if(!r.ok){setPortalLoading(false);A.toast(r.msg,"danger");}}}>
          {portalLoading?t("employer.billing.opening"):t("employer.billing.manageBillingStripe")}</Btn>}
    </Card>

    {/* Support level is the only place the "manager" plan feature was ever meant to surface. It had
        upgrade copy written for it and no UI anywhere, so the copy was dead code. This states what
        support the current plan actually comes with, and offers the prompt when it doesn't. */}
    <Card style={{marginBottom:16,borderRadius:20}}>
      <H2 sub={t("employer.billing.supportSub")}>Support</H2>
      {A.can("manager")
        ? <div className="flex gap-2.5 items-start">
            <Tag tone="ok">{t("employer.billing.included")}</Tag>
            <div className="text-sm text-text-2 leading-relaxed">
              {t("employer.billing.managerDescription")}
            </div>
          </div>
        : <div className="flex gap-2.5 items-start justify-between flex-wrap">
            <div className="text-sm text-text-2 leading-relaxed grow shrink basis-70">
              {t("employer.billing.standardSupport")}
            </div>
            <Btn kind="outline" icon="lock" onClick={()=>A.requestUpgrade("manager","Dedicated success manager","users")}>
              {t("employer.billing.enterpriseSupport")}</Btn>
          </div>}
    </Card>

    {invoices.length>0&&<Card style={{borderRadius:20}}><H2>{t("employer.billing.invoices")}</H2>
      {invoices.map(({id,date,amt,tax,taxLabel,total,plan:invPlan,billingCycle})=>
        <div key={id} className="flex items-center gap-3.5 py-3 border-b border-line-soft flex-wrap">
          <div className="grow shrink basis-35 min-w-0">
            <div className="text-sm font-semibold text-text">{id}</div>
            <div className="text-xs text-text-3 mt-0.5">{date}{billingCycle==="annual"?" • "+t("employer.billing.annualCycle"):""}</div></div>
          <div className="text-sm font-semibold text-text">${total.toFixed(2)}</div>
          <Tag tone="ok" sm icon="check">{t("employer.billing.paid")}</Tag>
          <Btn kind="ghost" size="xs" icon="download" onClick={()=>A.printInvoice(id,date,amt,invPlan,tax,taxLabel)}>{t("employer.billing.printSaveAsPDF")}</Btn></div>)}</Card>}
  </Page>;
}

/* Time-to-hire, time-in-stage and source-of-hire. Two of these were computable all along from the
   real stage-transition timestamps every application already carried; the third needed genuine
   attribution, which now exists. Applications from before that field report as "Not recorded"
   rather than being folded into Direct, which would overstate that channel permanently. */
function _HiringVelocity({A,mob}){
  const {t}=useTranslation();
  const myJobs=A.jobs.filter(j=>j.e===A.company.id).map(j=>j.id);
  const apps=A.applications.filter(a=>myJobs.includes(a.job));
  const s=hiringSummary(apps);
  if(!apps.length) return null;

  return <div className="grid gap-4 mb-5" style={{gridTemplateColumns:mob?"1fr":"1fr 1fr"}}>
    <Card pad={mob?16:20}>
      <Lbl>Hiring velocity</Lbl>
      {s.hires===0
        ? <div className="text-sm text-text-3 mt-2">No completed hires yet — time-to-hire appears once someone reaches Hired. Counting still-open applications would just measure how long ago you started looking.</div>
        : <>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold text-text tabular-nums">{s.medianTimeToHire}</span>
              <span className="text-sm text-text-2">days median time to hire</span>
            </div>
            <div className="text-xs text-text-3 mt-1">Across {s.hires} completed hire{s.hires===1?"":"s"}. Median, not mean — one unusually slow role shouldn't move it.</div>
          </>}
      {s.stageAverages.length>0&&<div className="mt-4 pt-3.5 border-t border-line-soft">
        <div className="text-xs font-bold text-text-3 uppercase tracking-wide mb-2.5">Average days in each stage</div>
        <div className="flex flex-col gap-2">
          {s.stageAverages.map(x=>
            <div key={x.stage} className="flex items-center gap-3">
              <span className="text-sm text-text w-28 shrink-0">{x.stage}</span>
              <div className="flex-1 min-w-0"><Bar v={Math.min(100,x.avgDays*5)}/></div>
              <span className="text-sm text-text-2 tabular-nums w-16 text-right">{x.avgDays}d</span>
            </div>)}
        </div>
      </div>}
    </Card>

    <Card pad={mob?16:20}>
      <Lbl>Where hires came from</Lbl>
      {s.hires===0
        ? <div className="text-sm text-text-3 mt-2">Shows which channels actually produced hires once you've made one — a more useful question than which produced the most applications.</div>
        : <div className="flex flex-col gap-2 mt-2">
            {s.sourceOfHire.map(x=>
              <div key={x.source} className="flex items-center gap-3">
                <span className="text-sm text-text w-36 shrink-0">{x.label}</span>
                <div className="flex-1 min-w-0"><Bar v={x.pct}/></div>
                <span className="text-sm text-text-2 tabular-nums w-16 text-right">{x.count} ({x.pct}%)</span>
              </div>)}
          </div>}
      {s.stalled.length>0&&<div className="mt-4 pt-3.5 border-t border-line-soft">
        <div className="text-xs font-bold text-warn uppercase tracking-wide mb-2">Sitting untouched 14+ days</div>
        <div className="flex flex-col gap-1.5">
          {s.stalled.slice(0,4).map(({app,days})=>{
            const u=A.person(app.user);
            return <button key={app.id} onClick={()=>A.openCandidate(app.id)}
              className="flex justify-between items-center gap-3 bg-transparent border-0 p-0 cursor-pointer text-left">
              <span className="text-sm text-text truncate">{u?.name||"Candidate"} · {applicationStageLabel(app.stage,t)}</span>
              <span className="text-sm text-warn font-semibold tabular-nums shrink-0">{days}d</span></button>;})}
          {s.stalled.length>4&&<div className="text-xs text-text-3 mt-1">and {s.stalled.length-4} more</div>}
        </div>
      </div>}
    </Card>
  </div>;
}

export function EmpAnalyticsPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t}=useTranslation();
  // Range picker applies to application counts / conversion / pipeline / trend. View totals
  // stay all-time because the app doesn't have per-day view events to slice.
  const [range,setRange]=useState(null); // null = all-time
  const stats=A.employerAnalytics(range); if(!stats) return <Page><Empty icon="activity" title="No data" body="Post a job first."/></Page>;
  const ranges=[[null,t("employer.analytics.allTime")],[7,t("employer.analytics.last7d")],[30,t("employer.analytics.last30d")],[90,t("employer.analytics.last90d")],[365,t("employer.analytics.last12mo")]];
  const pad=mob?"py-11 px-4":"py-18 px-8";
  return <div className="bg-white min-h-full">
    <section className={`bg-white border-b border-line-soft ${pad}`}>
      <div className="max-w-280 mx-auto">
        <Tag tone="brand" icon="activity">{t("employer.analytics.analyticsTag")}</Tag>
        <h1 className={`${HERO_WIDE} mt-5 mb-3 ${mob?"text-4xl":"text-6xl"}`}>{t("employer.analytics.analyticsHeader")}</h1>
        <p className={`text-text-2 leading-snug m-0 max-w-140 ${mob?"text-base":"text-xl"}`}>{t("employer.analytics.analyticsSubtitle")}</p></div>
    </section>
    <section className={`bg-bg ${mob?"pt-8 px-4 pb-14":"pt-12 px-8 pb-24"}`}>
      <div className="max-w-280 mx-auto">
        <_HiringVelocity A={A} mob={mob}/>
        <div className="flex gap-1.5 mb-4 flex-wrap">
          {ranges.map(([v,label])=><button key={label} onClick={()=>setRange(v)}
            className={`text-sm font-semibold py-2 px-3.5 rounded-lg border cursor-pointer transition-colors duration-150 ${range===v?"bg-brand text-white border-brand":"bg-white text-text-2 border-line hover:border-brand"}`}>
            {label}</button>)}
        </div>
        <div className={`grid gap-3.5 mb-6 ${mob?"grid-cols-2":"grid-cols-4"}`}>
          <Stat label={t("employer.analytics.liveJobs")} value={stats.liveJobs} icon="briefcase"/>
          <Stat label={t("employer.analytics.totalViews")} value={stats.totalViews.toLocaleString()} icon="eye"/>
          <Stat label={t("employer.analytics.applications")} value={stats.totalApps} icon="send"/>
          <Stat label={t("employer.analytics.viewToApply")} value={`${stats.conversion}%`} icon="target" tone={C.brand}/>
        </div>
        {/* Cost-per-hire lands beside the top-line stats when the employer has recorded any
            recruiting spend and at least one hire in the range - otherwise the tile would show
            a hollow $0 that reads as broken. */}
        {stats.hiresCount>0&&stats.totalCost>0&&<div className={`grid gap-3.5 mb-6 ${mob?"grid-cols-2":"grid-cols-4"}`}>
          <Stat label={t("employer.analytics.recruitingSpend")} value={`$${stats.totalCost.toLocaleString()}`} icon="wallet"/>
          <Stat label={t("employer.analytics.hiresInRange")} value={stats.hiresCount} icon="check" tone={C.ok}/>
          <Stat label={t("employer.analytics.costPerHire")} value={stats.costPerHire?`$${stats.costPerHire.toLocaleString()}`:"—"} icon="target" tone={C.violet}/>
        </div>}
        <Card pad={mob?24:32} style={{borderRadius:20,marginBottom:16}}>
          <div className="flex justify-between items-baseline mb-2 flex-wrap gap-2">
            <Lbl style={{marginBottom:0}}>{t("employer.analytics.applicationsLast30")}</Lbl>
            {stats.applicationTrend?.length>0&&(()=>{const tr=stats.applicationTrend;
              const total=tr.reduce((s,x)=>s+x.count,0);
              const max=Math.max(...tr.map(x=>x.count),0);
              const peak=tr.find(x=>x.count===max);
              return <span className="text-xs text-text-3 tabular-nums">{t("employer.analytics.totalApplications",{total,max})}{peak?.date?t("employer.analytics.peakDate",{date:peak.date}):""}</span>;})()}
          </div>
          {(()=>{const trend=stats.applicationTrend||[]; const max=Math.max(...trend.map(t=>t.count),1);
            const total=trend.reduce((s,t)=>s+t.count,0);
            if(total===0)return <div className="text-sm text-text-3 py-4">{t("employer.analytics.noApplications")}</div>;
            /* Explicit y-axis so a reader can read absolute values off the bars, not only their
               relative shape. Three tick marks (0, mid, max) is enough context without
               competing with the bar row for space. */
            const midY=Math.max(1,Math.round(max/2));
            return <div className="flex gap-2" style={{height:110}}>
              <div className="flex flex-col justify-between items-end text-xs text-text-3 tabular-nums py-1" style={{width:20}}>
                <span>{max}</span><span>{midY}</span><span>0</span>
              </div>
              <div className="flex-1 relative border-l border-line">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  <div className="border-b border-line-soft h-0"/><div className="border-b border-line-soft h-0"/><div className="border-b border-line h-0"/>
                </div>
                <div className="flex items-end gap-0.5 relative h-full">
                  {trend.map(t=>{const h=Math.max(2,Math.round((t.count/max)*100));
                    return <div key={t.date} className="flex-1 min-w-0 group relative" style={{height:"100%"}} title={`${t.date}: ${t.count} application${t.count===1?"":"s"}`}>
                      <div className="absolute bottom-0 left-0 right-0 rounded-t transition-[height] duration-300" style={{height:`${h}%`,background:t.count>0?C.brand:C.line}}/>
                    </div>;})}
                </div>
              </div>
            </div>;})()}
          <div className="flex justify-between text-xs text-text-3 mt-2 ml-6">
            <span>{stats.applicationTrend?.[0]?.date}</span><span>{stats.applicationTrend?.[stats.applicationTrend.length-1]?.date}</span>
          </div>
        </Card>
        <div className="grid gap-4" style={{gridTemplateColumns:mob?"1fr":"1.2fr 1fr"}}>
          <Card pad={mob?24:32} style={{borderRadius:20}}>
            <Lbl>{t("employer.analytics.pipelineBreakdown")}</Lbl>
            {stats.byStage.map(({stage,count})=>{const max=Math.max(...stats.byStage.map(s=>s.count),1);
              const pct=Math.round((count/max)*100);
              return <div key={stage} className="mb-3.5">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-text">{applicationStageLabel(stage,t)}</span><span className="font-semibold text-text-2">{count}</span></div>
                <div className="h-2 bg-bg rounded-full overflow-hidden">
                  <div className="h-full transition-[width] duration-300" style={{width:`${pct}%`,background:stage==="Offer"?C.ok:stage==="Interview"?C.warn:C.brand}}/></div></div>;})}</Card>
          <div className="flex flex-col gap-3.5">
            <Card pad={mob?24:32} style={{borderRadius:20}}>
              <Lbl>{t("employer.analytics.avgCandidateMatch")}</Lbl>
              <div className="flex items-center gap-5 mt-1">
                <Ring v={stats.avgScore} size={90}/>
                <div><div className="text-sm text-text-2 leading-snug">Across all applicants who applied to your jobs.</div>
                  <div className="text-xs text-text-3 mt-2">Above 75 is strong; publish honest requirements to raise this.</div></div></div></Card>
            {stats.topJob&&<Card pad={mob?24:32} style={{borderRadius:20}}>
              <Lbl>{t("employer.analytics.topPerformingRole")}</Lbl>
              <div className="font-semibold text-text tracking-tight mb-1.5" style={{fontSize:15.5}}>{stats.topJob.j.t}</div>
              <div className="text-sm text-text-2 mb-3.5">{stats.topJob.apps} {t("employer.analytics.applicants")} • {stats.topJob.j.views.toLocaleString()} {t("employer.analytics.views")}</div>
              <Btn kind="outline" size="sm" onClick={()=>{A.setPipelineJob(stats.topJob.j.id);A.go("empPipeline");}}>{t("employer.analytics.openPipeline")}</Btn></Card>}
          </div>
        </div>
        {stats.byJob?.length>0&&<Card pad={0} style={{borderRadius:20,marginTop:16,overflow:"hidden"}}>
          <div className="flex justify-between items-center py-4 px-6 border-b border-line-soft">
            <Lbl style={{margin:0}}>{t("employer.analytics.perJobPerformance")}</Lbl>
            <Btn kind="outline" size="sm" icon="download" onClick={()=>{
              const rows=[["Job","Status","Views","Applications","View → apply","Offers made","Recruiting cost"],
                ...stats.byJob.map(j=>[j.title,j.status,j.views,j.applications,`${j.conversion}%`,j.offers,j.recruitingCost||0])];
              const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
              const blob=new Blob([csv],{type:"text/csv"}); const url=URL.createObjectURL(blob);
              const a=document.createElement("a"); a.href=url; a.download="job-performance.csv"; a.click(); URL.revokeObjectURL(url);
            }}>{t("employer.analytics.exportCsv")}</Btn>
          </div>
          <div className="overflow-x-auto"><table className="w-full border-collapse" style={{minWidth:700}}>
            <thead><tr className="border-b-2 border-line text-left">
              {["Job","Status","Views","Applications","View → apply","Offers","Cost ($)",""].map(h=>
                <th key={h} className="py-2.5 px-4 text-xs font-bold text-text-3 tracking-wide uppercase">{h}</th>)}
            </tr></thead>
            <tbody>{stats.byJob.map(j=>
              // Row opens the pipeline for that job - the useful drill-down from analytics is
              // "which applicants produced these numbers", not the public listing. Chevron on
              // the end makes the click affordance visible instead of relying on hover-only feedback.
              <tr key={j.id} className="border-b border-line-soft hover:bg-bg cursor-pointer" onClick={()=>{A.setPipelineJob(j.id); A.go("empPipeline");}}
                title="Open pipeline for this job">
                <td className="py-2.5 px-4 text-sm font-semibold text-text">{j.title}</td>
                <td className="py-2.5 px-4"><Tag tone={jobTone(j.status)} sm>{jobStatusLabel(j.status,t)}</Tag></td>
                <td className="py-2.5 px-4 text-sm text-text-2 tabular-nums">{j.views.toLocaleString()}</td>
                <td className="py-2.5 px-4 text-sm text-text-2 tabular-nums">{j.applications}</td>
                <td className="py-2.5 px-4 text-sm text-text-2 tabular-nums">{j.conversion}%</td>
                <td className="py-2.5 px-4 text-sm text-text-2 tabular-nums">{j.offers}</td>
                {/* Inline cost input - click a job row's cost cell to set/update recruiting
                    spend for that posting. Kept minimal so the UI change adds a real capability
                    without needing a full modal. Debounced write on blur. */}
                <td className="py-2.5 px-2 text-sm tabular-nums" onClick={e=>e.stopPropagation()}>
                  <input type="number" min="0" placeholder="cost" defaultValue={j.recruitingCost||""}
                    onBlur={e=>{const v=Number(e.target.value)||0; if(v!==(j.recruitingCost||0))A.setJobRecruitingCost(j.id,v);}}
                    className="w-20 py-1 px-2 border border-line rounded text-xs text-right"/>
                </td>
                <td className="py-2.5 px-2 text-right text-text-3"><I n="chevR" s={14}/></td>
              </tr>)}</tbody>
          </table></div>
        </Card>}
        {stats.eligibilityMix?.length>0&&<Card pad={mob?24:32} style={{borderRadius:20,marginTop:16}}>
          <Lbl>{t("employer.analytics.workAuthorizationMix")}</Lbl>
          <p className="text-sm text-text-2 leading-snug mt-1 mb-4">{t("employer.analytics.authMixDesc")}</p>
          <div className="flex flex-col gap-3">
            {stats.eligibilityMix.map(({label,count})=>{const max=Math.max(...stats.eligibilityMix.map(x=>x.count),1); const pct=Math.round((count/max)*100);
              return <div key={label}>
                <div className="flex justify-between text-sm mb-1.5"><span className="text-text">{label}</span><span className="font-semibold text-text-2">{count}</span></div>
                <div className="h-2 bg-bg rounded-full overflow-hidden"><div className="h-full transition-[width] duration-300" style={{width:`${pct}%`,background:C.brand}}/></div></div>;})}
          </div>
        </Card>}

        {/* Salary benchmarking: aggregates the platform's OWN live hourly postings by category
            so a role posted at $28-$32/hr for retail can be compared to what similar-category
            postings actually pay today. Anonymised, no per-employer breakdown. Only renders
            when there's a meaningful comparable set (2+ postings in the category). */}
        {stats.salaryBenchmarks?.length>0&&<Card pad={mob?24:32} style={{borderRadius:20,marginTop:16}}>
          <Lbl>{t("employer.analytics.salaryBenchmarks")}</Lbl>
          <p className="text-sm text-text-2 leading-snug mt-1 mb-4">{t("employer.analytics.benchmarkDesc")}</p>
          <div className="flex flex-col gap-2">
            {stats.salaryBenchmarks.filter(b=>b.count>=2).map(b=>
              <div key={b.cat} className="flex items-center gap-3 py-2 border-b border-line-soft flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-text">{b.label}</div>
                  <div className="text-xs text-text-3 mt-0.5">Range ${b.min}–${b.max}/hr · {b.count} live listing{b.count===1?"":"s"}</div>
                </div>
                <div className="text-sm font-bold text-brand tabular-nums shrink-0">${b.avg.toFixed(2)}/hr avg</div>
              </div>)}
            {stats.salaryBenchmarks.filter(b=>b.count>=2).length===0&&
              <div className="text-sm text-text-3 py-2">Not enough live listings across the platform to produce meaningful benchmarks yet.</div>}
          </div>
        </Card>}
      </div>
    </section>
  </div>;
}
