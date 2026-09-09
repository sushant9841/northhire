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
import { postingRules, checkPayRange, findCanadianExperience, applicationDecisionNotice, AI_DISCLOSURE_TEXT } from "../../helpers/jobPostingLaw.js";
import { pay, payShort, dlText, money, uid, matchesQuery } from "../../helpers/utils.js";
import { sanitizeHtml } from "../../helpers/sanitize.js";
import { STAGES, PROVS, PCODE, CATS, CATM } from "../../store/seed/constants.js";
import { jobTone, jobStatusLabel } from "../../helpers/statusTone.js";
import { LocationInput, InlineList, QuestionBuilder, aiSuggestJD } from "../shared/formControls.jsx";

export function EmpHome(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const e=A.company;
  const jobs=A.jobs.filter(j=>j.e===e.id);
  const apps=A.applications.filter(a=>jobs.some(j=>j.id===a.job));
  const byStage=STAGES.reduce((m,s)=>({...m,[s]:apps.filter(a=>a.stage===s).length}),{});
  const canContent=A.settings.employerContent;
  return <Page wide>
    <H1 sub={`${e.verified?"Verified employer":"Awaiting verification"} • ${A.planName?A.planName():e.plan||"Free"} plan`}
      action={<div className="flex gap-2.5 flex-wrap">
        <Btn kind="outline" onClick={()=>A.go("empPipeline")}>Candidates</Btn>
        <Btn kind="primary" icon="plus" onClick={()=>A.go("empPost")}>Post a job</Btn></div>}>{e.name}</H1>
    {!e.verified&&<Banner tone="warn" icon="clock" title="Verification in review" style={{marginBottom:18}}>
      An administrator is reviewing your company. Verified employers get a badge on every listing and around 40% more applicants.</Banner>}
    {!canContent&&<Banner tone="neutral" icon="lock" title="Content publishing is currently off" style={{marginBottom:18}}>
      Publishing articles and trainings has been disabled platform-wide by an administrator. Your existing content stays visible.</Banner>}
    {A.user?.employerRole==="owner"&&jobs.some(j=>j.pendingOwnerApproval)&&
      <Banner tone="warn" icon="shield" title="A teammate posted a job that needs your approval" style={{marginBottom:18}}
        action={<Btn kind="primary" size="sm" onClick={()=>A.go("empJobs")}>Review</Btn>}>
        {jobs.filter(j=>j.pendingOwnerApproval).length} listing{jobs.filter(j=>j.pendingOwnerApproval).length===1?"":"s"} won't go live until you sign off.</Banner>}
    <div className="grid gap-3 mb-5" style={{gridTemplateColumns:`repeat(auto-fit,minmax(${mob?140:170}px,1fr))`}}>
      <Stat icon="briefcase" label="Live listings" value={jobs.filter(j=>j.status==="live").length} tone={C.brand} onClick={()=>A.go("empJobs")}/>
      <Stat icon="users" label="Total applicants" value={apps.length} onClick={()=>A.go("empPipeline")}/>
      <Stat icon="calendar" label="In interview" value={byStage.Interview||0} tone={C.warn}/>
      <Stat icon="award" label="Offers out" value={byStage.Offer||0} tone={C.ok}/></div>
    <div className="grid gap-4" style={{gridTemplateColumns:mob?"1fr":"1.4fr 1fr"}}>
      <Card>
        <H2 action={<Btn kind="ghost" size="sm" onClick={()=>A.go("empJobs")}>Manage all</Btn>}>Your listings</H2>
        {jobs.length===0?<Empty icon="briefcase" title="No listings yet" body="Post your first role and scored applicants arrive within hours."
          action={<Btn kind="primary" icon="plus" onClick={()=>A.go("empPost")}>Post a job</Btn>}/>
          :jobs.slice(0,6).map(j=>{const n=A.applications.filter(a=>a.job===j.id).length;
            return <div key={j.id} onClick={()=>A.go("empPipeline")} className="flex items-center gap-3 py-3 border-b border-line-soft cursor-pointer">
              <div className={`w-2 h-2 rounded-full shrink-0 ${j.status==="live"?"bg-ok":j.status==="paused"?"bg-warn":"bg-text-3"}`}/>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-text overflow-hidden text-ellipsis whitespace-nowrap">{j.t}</div>
                <div className="text-xs text-text-3 mt-1">{n} applicant{n===1?"":"s"} • {j.views.toLocaleString()} views • {j.posted}</div></div>
              <Tag tone={jobTone(j.status)} sm>{jobStatusLabel(j.status)}</Tag></div>;})}</Card>
      <div className="flex flex-col gap-4">
        <Card><H2>Pipeline</H2>
          {STAGES.map(s=>{const n=byStage[s]||0;
            return <div key={s} className="mb-3.5">
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-text-2 font-medium">{s}</span><span className="font-bold text-brand">{n}</span></div>
              <Bar v={apps.length?(n/apps.length)*100:0} h={6}/></div>;})}</Card>
        <Card><H2>Quick actions</H2>
          {[["plus","Post a new job","empPost"],["users","Review candidates","empPipeline"],
            ["book","Publish an article","empContent"],["wallet","Billing and plan","empBilling"]].map(([ic,l,p])=>
            <button key={l} onClick={()=>A.go(p)} className="flex items-center gap-2.5 w-full py-2.5 px-2.5 rounded-lg border-0 bg-transparent cursor-pointer text-sm text-text text-left hover:bg-bg transition-colors duration-150">
              <I n={ic} s={17} c={C.brand}/>{l}</button>)}</Card></div></div>
  </Page>;
}

export function EmpJobs(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const jobs=A.jobs.filter(j=>j.e===A.company.id);
  const pg=usePagination(jobs,20);
  const [showImport,setShowImport]=useState(false);
  const [csv,setCsv]=useState(""); const [importResult,setImportResult]=useState(null);
  const sampleCSV="title,city,province,type,pay_low,pay_high,pay_unit,category,mode,vacancies,experience,education,skills,perks,duties,requirements,description\nJourneyperson Electrician,Calgary,Alberta,Full Time,42,52,hr,trades,On-site,2,3+ years,Apprenticeship / trade certificate,Red Seal;WHMIS;Fall Protection,Health benefits;RRSP match,Site fit-out;Panel installation;Testing,Red Seal cert;5+ years commercial,Hiring a Red Seal electrician for commercial fit-outs in Calgary.";
  return <Page wide>
    <H1 sub={`${jobs.length} listing${jobs.length===1?"":"s"} • ${A.applications.filter(a=>jobs.some(j=>j.id===a.job)).length} applicants`}
      action={<div className="flex gap-2.5 flex-wrap">
        {A.can("csvImport")?<Btn kind="outline" icon="upload" onClick={()=>setShowImport(true)}>Import CSV</Btn>:<Btn kind="ghost" icon="lock" onClick={()=>A.go("pricing")} title="CSV import is a Growth+ feature">CSV import (Growth+)</Btn>}
        <Btn kind="primary" icon="plus" onClick={()=>A.go("empPost")}>Post a job</Btn></div>}>My job listings</H1>
    {showImport&&<Modal onClose={()=>{setShowImport(false);setImportResult(null);setCsv("");}} title="Import jobs from CSV">
      <p className="text-sm text-text-2 leading-snug mb-3.5">Paste CSV below. First row must be headers. Required columns: <strong className="text-text">title, city, province, type, pay_low, pay_high, pay_unit, category</strong>. Multi-value fields (skills, perks, duties, requirements) use semicolons.</p>
      <div className="flex gap-2 mb-3.5">
        <Btn kind="outline" size="sm" onClick={()=>setCsv(sampleCSV)}>Load example</Btn>
        <Btn kind="ghost" size="sm" onClick={()=>setCsv("")}>Clear</Btn></div>
      <Area rows={10} value={csv} onChange={e=>setCsv(e.target.value)} placeholder="title,city,province,type,pay_low,pay_high,pay_unit,category..." style={{fontFamily:"ui-monospace,monospace",fontSize:12.5}}/>
      {importResult&&<Banner tone={importResult.ok?"ok":"danger"} icon={importResult.ok?"check":"alert"} title={importResult.ok?`Imported ${importResult.imported} job${importResult.imported===1?"":"s"}`:"Import failed"} style={{marginTop:14}}>
        {importResult.ok?<>Jobs are in review status until an admin approves them.{importResult.errors?.length?` Also skipped ${importResult.errors.length} rows.`:""}</>:importResult.msg}</Banner>}
      <div className="flex gap-2.5 justify-end mt-3.5">
        <Btn kind="ghost" onClick={()=>{setShowImport(false);setImportResult(null);setCsv("");}}>Cancel</Btn>
        <Btn kind="primary" icon="upload" disabled={!csv.trim()} onClick={async()=>{const r=await A.importJobsCSV(csv);setImportResult(r);if(r.ok&&!r.errors?.length){setTimeout(()=>{setShowImport(false);setImportResult(null);setCsv("");},1500);}}}>Import</Btn></div>
    </Modal>}
    {jobs.length===0?<Empty icon="briefcase" title="No listings yet" body="Create your first posting to start receiving applications."
      action={<Btn kind="primary" icon="plus" onClick={()=>A.go("empPost")}>Post a job</Btn>}/>
      :<><div className="flex flex-col gap-3">
        {pg.pageItems.map((j,i)=>{const apps=A.applications.filter(a=>a.job===j.id);
          return <Card key={j.id} delay={Math.min(i,6)*0.04}>
            <div className="flex gap-3.5 items-start flex-wrap">
              <div className="grow shrink basis-60 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-bold text-text tracking-tight" style={{fontSize:16.5}}>{j.t}</span>
                  <Tag tone={jobTone(j.status)} sm>{jobStatusLabel(j.status)}</Tag>
                  {j.flagged&&<Tag tone="danger" sm icon="alert">Flagged by admin</Tag>}
                  {j.pendingOwnerApproval&&<Tag tone="warn" sm icon="shield">Needs owner approval</Tag>}</div>
                <div className="text-sm text-text-2 mt-1.5">{j.city}, {j.prov} • {j.mode} • {j.type} • {pay(j)}{payShort(j)}</div>
                <div className="flex gap-5 mt-3 flex-wrap">
                  {[["Applicants",apps.length],["Views",j.views.toLocaleString()],["Posted",j.posted],["Closes",dlText(j.dl)]].map(([k,v])=>
                    <div key={k}><div className="text-xs text-text-3">{k}</div>
                      <div className="text-base font-bold text-text mt-0.5">{v}</div></div>)}</div></div>
              <div className="flex gap-2 flex-wrap items-center">
                <Btn kind="outline" size="sm" onClick={()=>A.openJob(j.id,{preview:true})}>Preview</Btn>
                {j.pendingOwnerApproval&&A.user?.employerRole==="owner"&&
                  <Btn kind="ok" size="sm" icon="check" onClick={()=>A.approveJob(j.id)}>Approve</Btn>}
                <Btn kind="outline" size="sm" onClick={()=>A.toggleJobStatus(j.id)}>{j.status==="live"?"Pause":"Reopen"}</Btn>
                <Btn kind="primary" size="sm" onClick={()=>{A.setPipelineJob(j.id);A.go("empPipeline");}}>Candidates ({apps.length})</Btn></div></div></Card>;})}</div>
      <Pagination {...pg}/></>}
  </Page>;
}

const JOBPOST_DRAFT_KEY="northhire.jobPostDraft";
const _defaultJobPostData=()=>({t:"",cat:"trades",type:"Full Time",mode:"On-site",desc:"",
    skills:[],mustHave:[],location:"",city:"",prov:"Ontario",
    payType:"range",  /* range | fixed */
    payPeriod:"hr",   /* hr | yr | contract */
    lo:"",hi:"",fixed:"",contractAmt:"",
    vac:1,exp:"Entry level welcome",yearsExp:0,edu:"No formal education required",
    dlDate:"", /* absolute date, replaces days */
    perks:[],duties:"",reqs:"",how:"",urgent:false,featured:false,
    /* Ontario Bill 149 disclosures. aiScreening starts true because this platform really does
       auto-score every applicant - turning it off is the claim that needs a deliberate act. */
    aiScreening:true,vacancyConfirmed:false,
    questions:[]});
const _loadJobPostDraft=()=>{try{return JSON.parse(sessionStorage.getItem(JOBPOST_DRAFT_KEY)||"null");}catch{return null;}};

export function EmpPost(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
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

  const applyAI=()=>{const s=aiSuggestJD(f.t,f.cat);
    setF(p=>({...p,
      desc:p.desc||s.desc,
      duties:p.duties||s.duties.join("\n"),
      reqs:p.reqs||s.reqs.join("\n")}));};

  /* Which posting laws bind this listing, decided by where the WORK is (that's what "advertised
     in Ontario/BC" turns on), falling back to the company's own province before a location is
     picked. See helpers/jobPostingLaw.js - the server re-checks all of this on publish. */
  const lawRules=postingRules({prov:PCODE[f.prov]||A.company?.prov,employerSize:A.company?.size});

  const validate=()=>{const e={};
    if(step===1){
      if(!f.t.trim())e.t="Job title is required";
      const descTxt=(f.desc||"").replace(/<[^>]+>/g,"").trim();
      if(descTxt.length<40)e.desc="Give at least a couple of sentences";
      if(f.mustHave.length===0)e.mustHave="Add at least one must-have skill";
      if(lawRules.noCanadianExperience){
        const hit=findCanadianExperience([f.t,f.desc,f.duties,f.reqs]);
        if(hit)e.desc=`Ontario's Bill 149 prohibits requiring Canadian experience — remove "${hit}".`;
      }
    }
    if(step===2){
      if(!f.location.trim())e.location="Choose a location";
      /* Presence + hi>lo alone let $1/hr or $1,000,000/hr both through - add sane per-period
         bounds so an obvious fat-finger (missing a digit, an extra zero) gets caught here
         instead of publishing a listing no one would believe. */
      const bounds={hr:[15,500],yr:[20000,500000],contract:[100,10000000]}[f.payPeriod]||[0,Infinity];
      const [minV,maxV]=bounds;
      if(f.payType==="range"){
        if(!f.lo)e.lo="Required"; if(!f.hi)e.hi="Required";
        if(f.lo&&f.hi&&Number(f.hi)<Number(f.lo))e.hi="Maximum must be above the minimum";
        if(f.lo&&(Number(f.lo)<minV||Number(f.lo)>maxV))e.lo=`Enter a realistic ${f.payPeriod==="hr"?"hourly":f.payPeriod==="yr"?"yearly":"contract"} amount ($${minV.toLocaleString()}–$${maxV.toLocaleString()})`;
        if(f.hi&&(Number(f.hi)<minV||Number(f.hi)>maxV)&&!e.lo)e.hi=`Enter a realistic ${f.payPeriod==="hr"?"hourly":f.payPeriod==="yr"?"yearly":"contract"} amount ($${minV.toLocaleString()}–$${maxV.toLocaleString()})`;
      } else {
        if(!f.fixed)e.fixed="Required";
        else if(Number(f.fixed)<minV||Number(f.fixed)>maxV)e.fixed=`Enter a realistic amount ($${minV.toLocaleString()}–$${maxV.toLocaleString()})`;
      }
      if(!f.dlDate)e.dlDate="Choose a closing date";
      if(f.payType==="range"&&f.lo&&f.hi&&!e.lo&&!e.hi){
        const rangeErr=checkPayRange({lo:f.lo,hi:f.hi,unit:f.payPeriod,rules:lawRules});
        if(rangeErr)e.hi=rangeErr;
      }
      if(lawRules.vacancyConfirm&&!f.vacancyConfirmed)e.vacancyConfirmed="Confirm this is a real, currently open vacancy";
      if(lawRules.noCanadianExperience){
        const hit=findCanadianExperience([f.how,...(f.questions||[]).map(q=>q.prompt)]);
        if(hit)e.how=`Ontario's Bill 149 prohibits requiring Canadian experience — remove "${hit}".`;
      }
    }
    setErr(e); return !Object.keys(e).length;};

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

  const steps=["Role details","Pay & location","Application"];
  const today=new Date().toISOString().slice(0,10);
  const maxDate=(()=>{const d=new Date();d.setMonth(d.getMonth()+3);return d.toISOString().slice(0,10);})();

  return <Page narrow>
    <H1 sub="About five minutes. Listings go live immediately.">Post a job</H1>

    {resumed&&<Banner tone="brand" icon="clock" style={{marginBottom:16}}
      action={<button onClick={discardDraft} className="bg-transparent border-0 p-0 cursor-pointer text-sm font-semibold text-brand">Start over</button>}>
      Picked up where you left off.</Banner>}
    {postErr&&<Banner tone="danger" icon="alert" title="Cannot publish" style={{marginBottom:16}}
      action={<Btn kind="primary" size="sm" onClick={()=>A.go("pricing")}>See plans</Btn>}>{postErr}</Banner>}

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
        <H2 sub="Clear titles and honest descriptions get far more qualified applicants">Role details</H2>

        <Field label="Job title" required error={err.t}>
          <Input value={f.t} onChange={e=>set("t",e.target.value)}
            placeholder="e.g. Red Seal Electrician, Registered Nurse, Line Cook" invalid={!!err.t}/></Field>

        <div className={`grid gap-3 ${mob?"grid-cols-1":"grid-cols-3"}`}>
          <Field label="Sector" required><Sel value={f.cat} onChange={e=>set("cat",e.target.value)}>
            {CATS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</Sel></Field>
          <Field label="Employment type"><Sel value={f.type} onChange={e=>set("type",e.target.value)}>
            {["Full Time","Part Time","Contract","Seasonal","Apprenticeship","Casual"].map(o=><option key={o}>{o}</option>)}</Sel></Field>
          <Field label="Work setting"><Sel value={f.mode} onChange={e=>set("mode",e.target.value)}>
            {["On-site","Hybrid","Remote"].map(o=><option key={o}>{o}</option>)}</Sel></Field>
        </div>

        <div className="rounded-xl border border-line-2 p-3.5 flex gap-3 items-center" style={{background:`linear-gradient(135deg,${C.tint} 0%,#F0F7FF 100%)`}}>
          <div className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center shrink-0"><I n="sparkle" s={19}/></div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-text">Auto-fill with AI</div>
            <div className="text-xs text-text-2 mt-0.5">We'll draft the description, duties and requirements based on your title and sector. Edit anything you want.</div>
          </div>
          <Btn kind="primary" size="sm" onClick={applyAI} disabled={!f.t.trim()}>{f.t.trim()?"Suggest":"Enter title first"}</Btn>
        </div>

        <Field label="Job description" required error={err.desc} hint="Describe the day-to-day work, the team and the site.">
          <RichText value={f.desc} onChange={v=>set("desc",v)}
            placeholder="What will this person actually do week to week?" rows={6}/></Field>

        <Field label="Main duties" hint="What they'll actually do. Use bullets for readability.">
          <RichText value={f.duties} onChange={v=>set("duties",v)}
            placeholder="e.g. Install and repair electrical systems to code" rows={5}/></Field>

        <Field label="Requirements" hint="Certifications, experience, tickets.">
          <RichText value={f.reqs} onChange={v=>set("reqs",v)}
            placeholder="e.g. Valid Red Seal certificate" rows={5}/></Field>

        <Field label="Must-have skills & tickets" required error={err.mustHave}
          hint="Applicants missing these are auto-flagged. These drive the match score most.">
          <InlineList value={f.mustHave} onChange={v=>set("mustHave",v)} icon="check"
            placeholder="Type a required skill and press Enter"/></Field>

        <Field label="Nice-to-have skills" hint="Boost match score but not required.">
          <InlineList value={f.skills} onChange={v=>set("skills",v)} icon="sparkle"
            placeholder="Type a bonus skill and press Enter"/></Field>

        <div className={`grid gap-3 ${mob?"grid-cols-1":"grid-cols-2"}`}>
          <Field label="Experience required"><Sel value={f.exp} onChange={e=>set("exp",e.target.value)}>
            {["No experience required","Entry level welcome","1+ years","2+ years","3+ years","4+ years","5+ years","10+ years"].map(o=><option key={o}>{o}</option>)}</Sel></Field>
          <Field label="Education required"><Sel value={f.edu} onChange={e=>set("edu",e.target.value)}>
            {["No formal education required","High School Diploma","Apprenticeship / trade certificate","College Diploma","Bachelor's Degree or equivalent","Red Seal Certificate","Professional registration","Master's Degree","Doctorate"].map(o=><option key={o}>{o}</option>)}</Sel></Field>
        </div>
      </div>}

      {step===2&&<div className="flex flex-col gap-5">
        <H2 sub="Listings that publish a salary get roughly three times more applications">Pay, location & application</H2>

        <Field label="Location" required error={err.location}
          hint="Type at least 2 letters to search Canadian cities, or use your current location.">
          <LocationInput value={f.location} onChange={setLocation}
            placeholder="Start typing a city..."/></Field>

        <Field label="Pay structure">
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            {[["range","Range (min – max)"],["fixed","Fixed amount"]].map(([k,l])=>
              <button key={k} type="button" onClick={()=>set("payType",k)}
                className={`p-3 rounded-xl cursor-pointer text-sm transition-all duration-150 border-2 ${f.payType===k?"border-brand bg-tint text-brand font-semibold":"border-line bg-white text-text font-medium"}`}>{l}</button>)}
          </div>
          <div className="grid gap-3" style={{gridTemplateColumns:mob?"1fr":f.payType==="range"?"1fr 1fr 1fr":"1fr 1fr"}}>
            {f.payType==="range"?<>
              <Field label="Minimum" error={err.lo}><Input icon="wallet" type="number" inputMode="decimal" min="0" value={f.lo} onChange={e=>set("lo",e.target.value.replace(/[^\d.]/g,""))} placeholder={f.payPeriod==="yr"?"60000":"28"} invalid={!!err.lo}/></Field>
              <Field label="Maximum" error={err.hi}><Input icon="wallet" type="number" inputMode="decimal" min="0" value={f.hi} onChange={e=>set("hi",e.target.value.replace(/[^\d.]/g,""))} placeholder={f.payPeriod==="yr"?"80000":"36"} invalid={!!err.hi}/></Field>
            </>:<Field label="Amount" error={err.fixed}><Input icon="wallet" type="number" inputMode="decimal" min="0" value={f.fixed} onChange={e=>set("fixed",e.target.value.replace(/[^\d.]/g,""))} placeholder={f.payPeriod==="yr"?"70000":"32"} invalid={!!err.fixed}/></Field>}
            <Field label="Pay period"><Sel value={f.payPeriod} onChange={e=>set("payPeriod",e.target.value)}>
              <option value="hr">per hour</option>
              <option value="yr">per year</option>
              <option value="mi">per mile</option>
              <option value="contract">total (contract)</option></Sel></Field>
          </div>
        </Field>

        <div className={`grid gap-3 ${mob?"grid-cols-1":"grid-cols-2"}`}>
          <Field label="Number of vacancies"><Input type="number" min="1" value={f.vac} onChange={e=>set("vac",Math.max(1,Number(e.target.value)||1))}/></Field>
          <Field label="Application closes on" required error={err.dlDate}>
            <DatePicker value={f.dlDate} onChange={v=>set("dlDate",v)} min={today} max={maxDate}/></Field>
        </div>

        <Field label="Benefits offered" hint="Shown as a highlighted grid on the listing.">
          <InlineList value={f.perks} onChange={v=>set("perks",v)} icon="heart"
            placeholder="e.g. RRSP matching, Health & dental"/></Field>

        <Field label="How to apply" hint="What happens after someone applies.">
          <Area rows={3} value={f.how} onChange={e=>set("how",e.target.value)}
            placeholder="Apply through NorthHire with your resume. Shortlisted candidates are contacted within 3 business days."/></Field>

        <div className="bg-bg border border-line rounded-xl p-4 mt-1.5">
          <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
            <div>
              <div className="text-sm font-semibold text-text">Additional application questions</div>
              <div className="text-xs text-text-2 mt-1">Ask about work permits, driver's licence, willingness to travel, etc.</div>
            </div>
            <Tag tone="brand" sm>{f.questions.length} added</Tag>
          </div>
          <QuestionBuilder value={f.questions} onChange={v=>set("questions",v)}/>
        </div>

        {(lawRules.aiDisclosure||lawRules.vacancyConfirm)&&
          <div className="rounded-xl border border-warn-ln bg-warn-bg p-4 mt-1.5">
            <div className="flex items-start gap-2.5 mb-3">
              <I n="alert" s={17} c={C.warn}/>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-text">Required disclosures for this posting</div>
                <div className="text-xs text-text-2 mt-1 leading-relaxed">
                  Ontario's Bill 149 has applied to publicly advertised postings by employers with 25+ employees
                  since 1 January 2026. These appear on the listing candidates see.</div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3.5 py-3 border-t border-warn-ln">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-text">AI is used to screen applicants</div>
                <div className="text-xs text-text-2 mt-0.5 leading-snug">
                  NorthHire automatically scores every applicant against your must-have skills and ranks your
                  pipeline by that score, so this normally stays on. Turn it off only if you ignore the ranking
                  entirely and review every application yourself.</div>
              </div>
              <Switch on={f.aiScreening} onChange={v=>set("aiScreening",v)}/>
            </div>
            <div className="pt-3 border-t border-warn-ln">
              <CheckRow on={f.vacancyConfirmed} onChange={v=>set("vacancyConfirmed",v)}
                label="This posting is for an existing, currently open vacancy"
                sub="Bill 149 prohibits advertising a role you aren't actually hiring for."/>
              {err.vacancyConfirmed&&<div className="text-xs font-semibold text-red mt-1.5">{err.vacancyConfirmed}</div>}
            </div>
          </div>}

        <div className="flex items-center justify-between gap-3.5 py-3.5 border-t border-line-soft mt-2">
          <div><div className="text-sm font-semibold text-text">Mark as urgent hire</div>
            <div className="text-xs text-text-2 mt-0.5">Adds an "Urgent" badge candidates see on the listing.</div></div>
          <Switch on={f.urgent} onChange={v=>set("urgent",v)}/></div>
        <div className="flex items-center justify-between gap-3.5 py-3.5 border-t border-line-soft">
          <div><div className="text-sm font-semibold text-text">Feature this listing</div>
            <div className="text-xs text-text-2 mt-0.5">
              {A.can("featured")
                ?`Pins it above regular results in search. ${featuredUsed}/${featuredLimit===Infinity?"unlimited":featuredLimit} used this month.`
                :"Available on Growth and above."}
              {!A.can("featured")&&<button type="button" onClick={()=>A.go("pricing")} className="bg-transparent border-0 p-0 ml-1 cursor-pointer text-brand font-semibold underline">See plans</button>}
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
function _PipelineCard({a,u,s,idx,selected,tog,A,notice}){
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
        <div className="text-xs text-text-3 mt-px">{u.years} yrs • {u.city}</div></div>
      <Ring v={s} size={32}/></div>
    {/* Ontario Bill 149: an interviewed applicant has to be told the outcome within 45 days. */}
    {notice&&!notice.decided&&(notice.overdue||notice.daysLeft<=14)&&
      <div className={`flex gap-1.5 items-center rounded-lg py-1.5 px-2 mb-2 text-xs font-semibold ${notice.overdue?"bg-red-bg text-red":"bg-warn-bg text-warn"}`}>
        <I n="clock" s={12}/>
        <span>{notice.overdue
          ? `Decision notice ${Math.abs(notice.daysLeft)}d overdue`
          : `Decision notice due in ${notice.daysLeft}d`}</span></div>}
    <div data-nc className="flex gap-1.5" onClick={e=>e.stopPropagation()}>
      {idx>0&&<Btn kind="ghost" size="xs" icon="arrowL" title="Move back" onClick={()=>A.moveApp(a.id,STAGES[idx-1])} style={{flex:1}}/>}
      {idx<STAGES.length-1&&<Btn kind="outline" size="xs" iconR="arrowR" onClick={()=>A.moveApp(a.id,STAGES[idx+1])} style={{flex:2}}>Advance</Btn>}</div>
  </div>;
}
function _PipelineColumn({stage,items,job,sel,tog,selectStage,A,mob}){
  const {setNodeRef,isOver}=useDroppable({id:stage});
  const allSelected=items.length>0&&items.every(a=>sel.has(a.id));
  return <div ref={setNodeRef} className={`${mob?"w-59":"w-63"} flex flex-col gap-2.5 rounded-2xl transition-colors duration-150`}
    style={{background:isOver?C.tint:"transparent",padding:isOver?6:0}}>
    <div className="flex items-center justify-between px-1">
      <span className="text-xs font-bold text-text-2 uppercase tracking-wide">{stage}</span>
      <div className="flex gap-1.5 items-center">
        {items.length>0&&A.can("bulkActions")&&<button onClick={()=>selectStage(stage)} className="bg-transparent border-0 text-xs font-semibold cursor-pointer" style={{color:allSelected?C.brand:C.text3}}>{allSelected?"clear":"all"}</button>}
        <span className="bg-wash text-brand border border-line-2 text-xs font-bold rounded-full flex items-center justify-center px-1.5" style={{minWidth:22,height:22}}>{items.length}</span></div></div>
    {items.map(a=>{const u=A.person(a.user); const s=A.scoreCandidate(u,job); const idx=STAGES.indexOf(stage);
      const notice=applicationDecisionNotice(a,postingRules({prov:job?.prov,employerSize:A.company?.size}));
      return <_PipelineCard key={a.id} a={a} u={u} s={s} idx={idx} selected={sel.has(a.id)} tog={tog} A={A} notice={notice}/>;})}
    {items.length===0&&<div className="rounded-2xl text-center text-xs text-text-3 py-6 px-3" style={{border:`1.5px dashed ${C.line}`}}>Empty</div>}
  </div>;
}
function _PipelineBoard({apps,job,sel,tog,selectStage,A,mob}){
  const sensors=useSensors(useSensor(PointerSensor,{activationConstraint:{distance:8}}));
  const onDragEnd=({active,over})=>{
    if(!over)return;
    const app=apps.find(a=>a.id===active.id);
    if(app&&app.stage!==over.id)A.moveApp(active.id,over.id);
  };
  return <div className={`flex-1 overflow-x-auto ${mob?"p-3.5":"p-5"}`}>
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="flex gap-3 items-start" style={{minWidth:"max-content"}}>
        {STAGES.map(stage=><_PipelineColumn key={stage} stage={stage} items={apps.filter(a=>a.stage===stage)}
          job={job} sel={sel} tog={tog} selectStage={selectStage} A={A} mob={mob}/>)}
      </div>
    </DndContext>
  </div>;
}

export function EmpPipeline(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const myJobs=A.jobs.filter(j=>j.e===A.company.id);
  const jobId=A.pipelineJob||myJobs[0]?.id;
  const job=A.job(jobId);
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

  if(!job) return <Page><Empty icon="users" title="No listings to review" body="Post a job and applicants land here automatically."
    action={<Btn kind="primary" icon="plus" onClick={()=>A.go("empPost")}>Post a job</Btn>}/></Page>;

  /* Full-text across name/title/city/skills, multi-word AND matching in any order - same
     matchesQuery() helper the rest of the app's search boxes already use, replacing the old
     single-skill-substring-only filter. */
  const apps=rawApps.filter(a=>{const u=A.person(a.user);const s=A.scoreCandidate(u,job);
    if(s<f.minScore)return false;
    if(f.prov&&u.prov!==PCODE[f.prov])return false;
    if(f.q&&!matchesQuery(f.q,u.name,u.title,u.city,(u.skills||[]).join(" ")))return false;
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
    .filter(({p})=>!talentQ||matchesQuery(talentQ,p.name,p.title,p.city,(p.skills||[]).join(" ")));
  const talentPg=usePagination(reverseCandidates,12);
  useEffect(()=>{talentPg.setPage(1);},[talentMinScore,talentQ]);

  return <div className="flex flex-col min-h-full bg-bg">
    <div className={`bg-white border-b border-line ${mob?"py-3.5 px-4":"py-4 px-7"}`}>
      <div className="max-w-site mx-auto flex gap-3.5 items-end flex-wrap">
        <div className="grow shrink basis-60 min-w-0">
          <Lbl style={{marginBottom:6}}>Pipeline for</Lbl>
          <Sel value={jobId} onChange={e=>{A.setPipelineJob(e.target.value);clear();setF({minScore:0,prov:"",q:""});}} style={{fontWeight:640}}>
            {myJobs.map(j=><option key={j.id} value={j.id}>{j.t} ({A.applications.filter(a=>a.job===j.id).length})</option>)}</Sel></div>
        <Btn kind="outline" size="sm" icon="download" onClick={()=>A.exportApplicants(jobId)}>Export CSV</Btn></div>
      <div className="max-w-site mx-auto mt-3.5">
        <Tabs items={[{k:"pipeline",label:`Pipeline (${apps.length})`},{k:"filters",label:"Filters"},
          {k:"talent",label:`Talent pool (${reverseCandidates.length})`}]} value={tab} onChange={setTab}/></div>
    </div>

    {tab==="filters"&&<div className={`${mob?"p-4":"p-6"} max-w-site mx-auto w-full`}>
      <Card style={{padding:mob?20:24,borderRadius:16}}>
        <Lbl>Filter this pipeline</Lbl>
        <div className={`grid gap-3.5 ${mob?"grid-cols-1":"grid-cols-3"}`}>
          <Field label="Minimum match score">
            <Sel value={f.minScore} onChange={e=>setF({...f,minScore:Number(e.target.value)})}>
              {[0,50,60,70,75,80,85].map(v=><option key={v} value={v}>{v?`${v}+`:"Any"}</option>)}</Sel></Field>
          <Field label="Province"><Sel value={f.prov} onChange={e=>setF({...f,prov:e.target.value})}>
            <option value="">All provinces</option>{PROVS.map(p=><option key={p}>{p}</option>)}</Sel></Field>
          <Field label="Search"><Input icon="search" value={f.q} onChange={e=>setF({...f,q:e.target.value})} placeholder="Name, title, city or skill"/></Field>
        </div>
        <div className="mt-4 flex gap-2.5 items-center flex-wrap">
          <Btn kind="primary" onClick={()=>setTab("pipeline")}>Show {apps.length} candidate{apps.length===1?"":"s"}</Btn>
          <Btn kind="ghost" onClick={()=>setF({minScore:0,prov:"",q:""})}>Reset</Btn></div>
      </Card>
    </div>}

    {tab==="talent"&&<div className={`${mob?"p-4":"p-6"} max-w-site mx-auto w-full`}>
      {!A.can("talentPool")?<Card style={{padding:mob?26:36,borderRadius:20,textAlign:"center",background:"linear-gradient(135deg,#F5F9FF 0%,#EAF2FF 100%)",border:`1px solid ${C.line2}`}}>
        <div className="w-16 h-16 rounded-2xl bg-brand text-white flex items-center justify-center mx-auto mb-5"><I n="target" s={30}/></div>
        <div className={`font-bold text-text tracking-tight mb-2.5 ${mob?"text-xl":"text-2xl"}`}>Talent pool is a Growth feature</div>
        <p className="text-sm text-text-2 leading-relaxed mx-auto mb-6 max-w-110"><br/>See top-matched candidates across NorthHire who haven't applied yet, and invite them directly. Available on the Growth and Enterprise plans.</p>
        <Btn kind="primary" onClick={()=>A.go("pricing")}>Upgrade to Growth</Btn>
      </Card>:<><Card style={{padding:mob?20:26,borderRadius:16,marginBottom:16}}>
        <div className="flex gap-3 items-center mb-3 flex-wrap">
          <div className="w-11 h-11 rounded-xl bg-wash text-brand flex items-center justify-center shrink-0"><I n="target" s={22}/></div>
          <div className="flex-1 min-w-45"><div className="text-base font-semibold text-text">Talent pool matches</div>
            <div className="text-sm text-text-2 mt-0.5">Candidates on NorthHire who match this posting but haven't applied yet.</div></div>
          <div style={{width:220}}><Input icon="search" value={talentQ} onChange={e=>setTalentQ(e.target.value)} placeholder="Name, title, city or skill"/></div>
          <Sel value={talentMinScore} onChange={e=>setTalentMinScore(Number(e.target.value))} style={{width:170}}>
            {[50,60,65,70,80,90].map(v=><option key={v} value={v}>{v}+ match score</option>)}</Sel>
        </div>
      </Card>
      {reverseCandidates.length===0
        ? <Empty icon="target" title="No talent pool matches yet" body="Try lowering the match-score threshold, or check back as more candidates sign up in this trade."/>
        : <><div className={`grid gap-3.5 ${mob?"grid-cols-1":"grid-cols-2"}`}>
            {talentPg.pageItems.map(({p,score})=>{const invited=A.invitedCandidates.has(`${jobId}:${p.id}`);
              const cn=A.candidateNotes[p.id];
              return <Card key={p.id} style={{padding:20,borderRadius:16}}>
              <div className="flex gap-3.5 items-center">
                <SmartPortrait seed={p.seed} size={52}/>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-semibold text-text">{p.name}</div>
                  <div className="text-sm text-text-2 mt-1">{p.title} • {p.years}y • {p.city}</div></div>
                <Ring v={score} size={44}/></div>
              <div className="flex flex-wrap gap-1.5 mt-3.5">
                {(p.skills||[]).slice(0,4).map(s=><Tag key={s} sm>{s}</Tag>)}
                {(p.skills||[]).length>4&&<Tag sm>+{p.skills.length-4}</Tag>}</div>
              {cn?.tags?.length>0&&<div className="flex flex-wrap gap-1.5 mt-2">
                {cn.tags.map(t=><Tag key={t} tone="violet" sm>{t}</Tag>)}</div>}
              {cn?.note&&<div className="text-xs text-text-2 mt-2.5 p-2.5 bg-bg rounded-lg italic leading-snug">{cn.note}</div>}
              <div className="flex gap-2 mt-3.5">
                {invited
                  ?<Btn kind="soft" size="sm" full icon="check" disabled>Invited</Btn>
                  :<Btn kind="outline" size="sm" full icon="send" onClick={()=>A.inviteToApply(p.id,jobId)}>Invite to apply</Btn>}
                <Btn kind="ghost" size="sm" icon="edit" onClick={()=>{setNoting(p);setNoteText(cn?.note||"");setNoteTags((cn?.tags||[]).join(", "));}}>{cn?"Edit note":"Note"}</Btn>
                <Btn kind="ghost" size="sm" icon="clock" onClick={()=>viewOutreach(p)}>History</Btn>
              </div>
            </Card>;})}</div>
          <Pagination {...talentPg}/></>}
      </>}
    </div>}

    {tab==="pipeline"&&<>
      {sel.size>0&&A.can("bulkActions")&&<div className={`bg-brand text-white flex gap-3 items-center flex-wrap ${mob?"py-3 px-4":"py-3 px-7"}`}>
        <span className="text-sm font-semibold">{sel.size} selected</span>
        <div className="flex-1"/>
        <div className="relative" ref={bulkMenuRef}>
          <Btn kind="onDark" size="sm" iconR="chevD" aria-expanded={bulkMenu} onClick={()=>setBulkMenu(!bulkMenu)}>Move to…</Btn>
          {bulkMenu&&<div role="menu" className="absolute top-full right-0 mt-1.5 bg-white border border-line rounded-xl shadow-lg p-1.5 z-20" style={{minWidth:180}}>
            {STAGES.map(s=><button key={s} role="menuitem" onClick={()=>runBulk("move",s)} className="block w-full text-left py-2.5 px-3 bg-transparent border-0 cursor-pointer text-sm text-text rounded-lg hover:bg-bg transition-colors duration-150">{s}</button>)}</div>}
        </div>
        <Btn kind="onDark" size="sm" icon="x" onClick={()=>setConfirmRejectAll(true)}>Reject all</Btn>
        <Btn kind="onDark" size="sm" onClick={clear}>Clear</Btn></div>}
      <_PipelineBoard apps={apps} job={job} sel={sel} tog={tog} selectStage={selectStage} A={A} mob={mob}/>
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
            <div className="text-xs text-text-3 mt-0.5">{new Date(ev.at).toLocaleString("en-CA")}</div>
          </div>
        </div>)}
      </div>
    </Modal>}
  </div>;
}


export function EmpCandidate(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [showMsg,setShowMsg]=useState(false); const [msgText,setMsgText]=useState("");
  const [savingTemplate,setSavingTemplate]=useState(false); const [templateName,setTemplateName]=useState("");
  const [showSched,setShowSched]=useState(false);
  const [ivDate,setIvDate]=useState(""); const [ivTime,setIvTime]=useState(""); const [ivMode,setIvMode]=useState("video"); const [ivNotes,setIvNotes]=useState("");
  const [confirmReject,setConfirmReject]=useState(false); const [rejectReason,setRejectReason]=useState("");
  const [showOfferLetter,setShowOfferLetter]=useState(false);
  const [offerDraft,setOfferDraft]=useState({startDate:"",salary:"",manager:"",deadline:""});
  const [contact,setContact]=useState(undefined); // undefined = loading, null = load failed
  const [scorecards,setScorecards]=useState([]);
  const [showScorecard,setShowScorecard]=useState(false); const [scRating,setScRating]=useState(0); const [scNotes,setScNotes]=useState("");
  const a=A.applications.find(x=>x.id===A.candidateId);
  useEffect(()=>{if(!a)return; let cancelled=false;A.loadCandidateContact(a.id).then(c=>{if(!cancelled)setContact(c);});return()=>{cancelled=true;};},[a?.id]);
  const refreshScorecards=()=>{if(a)A.loadScorecards(a.id).then(setScorecards);};
  useEffect(()=>{refreshScorecards();},[a?.id]);
  if(!a) return <Page><Empty icon="users" title="Candidate not found" body="This application may have been withdrawn."
    action={<Btn kind="primary" onClick={()=>A.go("empPipeline")}>Back to pipeline</Btn>}/></Page>;
  const u=A.person(a.user), job=A.job(a.job), s=A.scoreCandidate(u,job), idx=STAGES.indexOf(a.stage);
  const threadMessages=A.messages.filter(m=>(m.from===u.id&&m.to===A.user?.id)||(m.to===u.id&&m.from===A.user?.id)).slice().reverse();
  const upcomingInterviews=A.interviews.filter(iv=>iv.app===a.id&&iv.status==="scheduled");
  return <Page narrow>
    <Card pad={mob?20:26} style={{marginBottom:16}}>
      <div className="flex gap-4 items-center flex-wrap">
        <SmartPortrait seed={u.seed} size={mob?62:74} radius={18}/>
        <div className="grow shrink basis-50 min-w-0">
          <div className={`font-bold text-text tracking-tight ${mob?"text-xl":"text-2xl"}`}>{u.name}</div>
          <div className="text-sm text-text-2 mt-1">{u.title} • {u.years} years • {u.city}, {u.prov}</div>
          <div className="text-sm text-text-3 mt-0.5">
            {contact===undefined?"Loading contact info…":
              [contact?.email,contact?.phone].filter(Boolean).join(" • ")||"Contact details hidden by this candidate"}</div>
          <div className="mt-2.5"><Tag tone={a.stage==="Offer"?"ok":a.stage==="Interview"?"warn":"brand"} sm>{a.stage}</Tag></div></div>
        <Ring v={s} size={62} label="Fit"/></div></Card>
    <Card style={{marginBottom:16}}>
      <div className="flex justify-between items-center mb-3">
        <Lbl style={{margin:0}}>Hiring team scorecards {scorecards.length>0&&`(avg ${(scorecards.reduce((s,c)=>s+c.rating,0)/scorecards.length).toFixed(1)}/5)`}</Lbl>
        <Btn kind="outline" size="xs" icon="plus" onClick={()=>{setScRating(0);setScNotes("");setShowScorecard(true);}}>Add scorecard</Btn>
      </div>
      {scorecards.length===0?<div className="text-sm text-text-3">No scorecards yet — the first interviewer to weigh in starts the record.</div>
        :<div className="flex flex-col gap-2.5">
          {scorecards.map(c=><div key={c.id} className="py-2.5 px-3 bg-bg rounded-lg">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-semibold text-text">{c.author}</span>
              <span className="text-sm text-warn font-bold">{"★".repeat(c.rating)}{"☆".repeat(5-c.rating)}</span>
            </div>
            {c.notes&&<div className="text-sm text-text-2">{c.notes}</div>}
            <div className="text-xs text-text-3 mt-1">{new Date(c.at).toLocaleDateString("en-CA")}</div>
          </div>)}
        </div>}
    </Card>
    <Card style={{marginBottom:16}}><Lbl>Why this score</Lbl>
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
      <Card><Lbl>Skills against this role</Lbl>
        <div className="flex flex-wrap gap-1.5">
          {job.skills.map(k=>{const has=u.skills.some(x=>x.toLowerCase()===k.toLowerCase());
            return <Tag key={k} tone={has?"ok":"neutral"} icon={has?"check":"x"} sm>{k}</Tag>;})}</div>
        <div className="text-sm text-text-2 mt-3 leading-snug">
          Matches {job.skills.filter(k=>u.skills.some(x=>x.toLowerCase()===k.toLowerCase())).length} of {job.skills.length} required skills.</div></Card>
      <Card><Lbl>Application answers</Lbl>
        {[["Available from",a.avail||"Not stated"],["Expected pay",a.expect?a.expect+payShort(job):"Open to posted range"],
          ["Applied",a.at],["Education",u.edu]].map(([k,v])=>
          <div key={k} className="flex justify-between gap-3 py-2.5 border-b border-line-soft text-sm">
            <span className="text-text-2">{k}</span><span className="font-semibold text-text text-right">{v}</span></div>)}</Card></div>
    {a.letter&&<Card style={{marginBottom:16}}><Lbl>Their note</Lbl>
      <p className="text-sm text-text-2 leading-relaxed m-0 whitespace-pre-wrap">{a.letter}</p></Card>}
    {a.screeningAnswers?.length>0&&<Card style={{marginBottom:16}}><Lbl>Screening question answers</Lbl>
      <div className="flex flex-col gap-3.5">
        {a.screeningAnswers.map(sa=><div key={sa.id}>
          <div className="text-sm font-semibold text-text mb-1">{sa.prompt}</div>
          <div className="text-sm text-text-2">{Array.isArray(sa.answer)?(sa.answer.join(", ")||"—"):(sa.answer||"—")}</div></div>)}</div></Card>}
    <Card style={{marginBottom:16}}><Lbl>Move this candidate</Lbl>
      <div className="flex gap-2.5 flex-wrap">
        {idx>0&&<Btn kind="outline" icon="arrowL" onClick={()=>A.moveApp(a.id,STAGES[idx-1])}>Back to {STAGES[idx-1]}</Btn>}
        {idx<STAGES.length-1&&<Btn kind="primary" iconR="arrowR" onClick={()=>A.moveApp(a.id,STAGES[idx+1])}>Advance to {STAGES[idx+1]}</Btn>}
        {A.can("messages")?<Btn kind="outline" icon="mail" onClick={()=>setShowMsg(true)}>Message</Btn>:<Btn kind="ghost" icon="lock" onClick={()=>A.go("pricing")}>Message (Growth+)</Btn>}
        {A.can("interviews")?<Btn kind="outline" icon="calendar" onClick={()=>setShowSched(true)}>Schedule interview</Btn>:<Btn kind="ghost" icon="lock" onClick={()=>A.go("pricing")}>Schedule (Growth+)</Btn>}
        {a.stage==="Offer"&&<Btn kind="ok" icon="file" onClick={()=>setShowOfferLetter(true)}>Generate offer letter</Btn>}
        <Btn kind="dangerSoft" onClick={()=>{setConfirmReject(true);setRejectReason("");}}>Not a fit</Btn>
        <Btn kind="ghost" onClick={()=>A.go("empPipeline")}>Back to pipeline</Btn></div></Card>
    <ConfirmDialog open={confirmReject} onClose={()=>setConfirmReject(false)} confirmLabel="Reject"
      title={`Reject ${u.name}?`} onConfirm={()=>{A.rejectApp(a.id,rejectReason.trim());A.go("empPipeline");}}>
      <div className="flex flex-col gap-3">
        <div>This withdraws their application. This can't be undone from here.</div>
        <Field label="Reason (optional)" hint="Shared with the candidate so they know why.">
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
        <Banner tone="brand" icon="info">Opens a formatted letter ready to print or save as PDF. No e-signature is collected — the candidate signs the printed copy.</Banner>
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>setShowOfferLetter(false)}>Cancel</Btn>
          <Btn kind="primary" icon="file" onClick={()=>{A.printOfferLetter(u,job,A.company,offerDraft);setShowOfferLetter(false);}}>Generate &amp; print</Btn>
        </div>
      </div>
    </Modal>}

    {showScorecard&&<Modal onClose={()=>setShowScorecard(false)} title={`Scorecard for ${u.name}`}>
      <div className="flex flex-col gap-3.5">
        <Field label="Rating" required>
          <div className="flex gap-1.5">
            {[1,2,3,4,5].map(n=><button key={n} type="button" onClick={()=>setScRating(n)}
              className="bg-transparent border-0 p-0 cursor-pointer text-2xl" style={{color:n<=scRating?C.warn:C.line}}>★</button>)}
          </div>
        </Field>
        <Field label="Notes (optional)"><Area rows={4} value={scNotes} onChange={e=>setScNotes(e.target.value)} placeholder="Strengths, concerns, how they compared to the role's requirements…"/></Field>
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>setShowScorecard(false)}>Cancel</Btn>
          <Btn kind="primary" disabled={!scRating} onClick={async()=>{
            const r=await A.submitScorecard(a.id,scRating,scNotes.trim());
            if(r.ok){refreshScorecards();setShowScorecard(false);} else A.toast(r.msg,"danger");
          }}>Submit scorecard</Btn>
        </div>
      </div>
    </Modal>}

    {threadMessages.length>0&&<Card style={{marginBottom:16}}><Lbl>Message history</Lbl>
      <div className="flex flex-col gap-2.5 overflow-y-auto" style={{maxHeight:280}}>
        {threadMessages.map(m=>{const mine=m.from===A.user?.id;
          return <div key={m.id} className={`flex ${mine?"justify-end":"justify-start"}`}>
            <div className="rounded-xl text-sm leading-snug py-2.5 px-3.5" style={{maxWidth:"75%",
              background:mine?C.brand:C.bg,color:mine?"#fff":C.text,border:mine?"none":`1px solid ${C.line}`}}>
              {m.text}
              <div className="text-xs opacity-70 mt-1.5">{new Date(m.at).toLocaleString("en-CA")}</div></div></div>;})}</div></Card>}

    {upcomingInterviews.length>0&&<Card style={{marginBottom:16}}><Lbl>Scheduled interviews</Lbl>
      <div className="flex flex-col gap-2.5">
        {upcomingInterviews.map(iv=><div key={iv.id} className="flex gap-3 items-center py-3 px-3.5 bg-bg rounded-xl border border-line">
          <div className="w-10 h-10 rounded-xl bg-wash text-brand flex items-center justify-center"><I n="calendar" s={18}/></div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-text">{iv.mode==="video"?"Video call":"On-site interview"} on {iv.when}</div>
            {iv.notes&&<div className="text-xs text-text-2 mt-1">{iv.notes}</div>}</div>
          <Btn kind="ghost" size="xs" icon="x" onClick={()=>A.cancelInterview(iv.id)}/></div>)}</div></Card>}

    {showMsg&&<Modal onClose={()=>{setShowMsg(false);setSavingTemplate(false);}} title={`Message ${u.name}`}>
      {A.messageTemplates.length>0&&<Field label="Start from a template">
        <Sel value="" onChange={e=>{const t=A.messageTemplates.find(x=>x.id===e.target.value); if(t)setMsgText(t.body
          .replace(/\{\{name\}\}/gi,u.name.split(" ")[0]).replace(/\{\{job\}\}/gi,job.t).replace(/\{\{company\}\}/gi,A.company.name));}}>
          <option value="">Choose a saved template…</option>
          {A.messageTemplates.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
        </Sel></Field>}
      <Field label="Your message" hint={`Sent through NorthHire — ${u.name} sees it on their status page. Merge fields: {{name}}, {{job}}, {{company}}.`}>
        <Area rows={5} value={msgText} onChange={e=>setMsgText(e.target.value)} placeholder="Hi Jean, thanks for applying…"/></Field>
      {savingTemplate?<div className="flex gap-2 items-center mt-2.5">
        <Input value={templateName} onChange={e=>setTemplateName(e.target.value)} placeholder="Template name, e.g. Interview invite" style={{flex:1}}/>
        <Btn kind="outline" size="sm" disabled={!templateName.trim()||!msgText.trim()} onClick={async()=>{
          const r=await A.saveMessageTemplate(templateName.trim(),msgText.trim());
          if(r.ok){setSavingTemplate(false);setTemplateName("");A.toast("Template saved","ok");}}}>Save</Btn>
        <Btn kind="ghost" size="sm" onClick={()=>setSavingTemplate(false)}>Cancel</Btn>
      </div>:<button type="button" onClick={()=>setSavingTemplate(true)} disabled={!msgText.trim()}
        className="bg-transparent border-0 p-0 mt-2.5 text-xs font-semibold text-brand cursor-pointer disabled:text-text-3 disabled:cursor-default">+ Save this message as a template</button>}
      <div className="flex gap-2.5 justify-end mt-3.5">
        <Btn kind="ghost" onClick={()=>{setShowMsg(false);setSavingTemplate(false);}}>Cancel</Btn>
        <Btn kind="primary" icon="send" disabled={!msgText.trim()} onClick={()=>{A.sendMessage(u.id,job.id,msgText.trim());setMsgText("");setShowMsg(false);setSavingTemplate(false);}}>Send message</Btn></div></Modal>}

    {showSched&&<Modal onClose={()=>setShowSched(false)} title={`Schedule interview with ${u.name}`}>
      <div className="flex flex-col gap-3.5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date"><Input type="date" value={ivDate} onChange={e=>setIvDate(e.target.value)}/></Field>
          <Field label="Time"><Input type="time" value={ivTime} onChange={e=>setIvTime(e.target.value)}/></Field></div>
        <Field label="Format">
          <div className="grid grid-cols-2 gap-2.5">
            {[["video","Video call"],["onsite","On-site interview"]].map(([v,l])=>{const on=ivMode===v;
              return <button key={v} onClick={()=>setIvMode(v)} className="py-3 px-3.5 rounded-xl cursor-pointer text-sm border-2"
                style={{fontWeight:on?640:520,borderColor:on?C.brand:C.line,background:on?C.tint:"#fff",color:on?C.brand:C.text}}>{l}</button>;})}</div></Field>
        <Field label="Notes (optional)" hint="Address, video link, what to bring, who they'll meet.">
          <Area rows={3} value={ivNotes} onChange={e=>setIvNotes(e.target.value)} placeholder="Meet at reception, ask for the site foreman."/></Field>
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>setShowSched(false)}>Cancel</Btn>
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
  const openHistory=async(item,type)=>{setViewingHistory({item,type}); setRevisions(await A.loadContentRevisions(type,item.id));};
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
        ?<Tag tone="brand" sm icon="clock">Scheduled {new Date(item.scheduledAt).toLocaleString("en-CA",{dateStyle:"short",timeStyle:"short"})}</Tag>
        :<Tag tone={item.status==="published"?"ok":item.status==="draft"?"warn":"neutral"} sm>
          {item.status==="published"?"Published":item.status==="draft"?"Draft":"Hidden"}</Tag>}
      <div className="flex gap-2 flex-wrap">
        <Btn kind="ghost" size="xs" icon="eye" title="Preview"
          onClick={()=>type==="blog"?A.openBlog(item.id):A.openTraining(item.id)}/>
        {editable&&<>
          <Btn kind="outline" size="xs" icon="edit" onClick={()=>type==="blog"?A.editBlog(item.id):A.editTraining(item.id)}>Edit</Btn>
          <Btn kind="ghost" size="xs" icon="clock" title="Revision history" onClick={()=>openHistory(item,type)}/>
          <Btn kind="ghost" size="xs" onClick={()=>type==="blog"?A.toggleBlogStatus(item.id):A.toggleTrainingStatus(item.id)}>
            {item.status==="published"?"Unpublish":"Publish"}</Btn>
          <Btn kind="ghost" size="xs" icon="trash" title="Delete"
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
    {viewingHistory&&<Modal onClose={()=>setViewingHistory(null)} title={`Revision history — ${viewingHistory.item.title}`}>
      <div className="flex flex-col gap-2" style={{maxHeight:400,overflowY:"auto"}}>
        {revisions.length===0&&<div className="text-sm text-text-3 py-3">No earlier revisions — this hasn't been edited since it was created.</div>}
        {revisions.map(r=><div key={r.id} className="flex justify-between items-center gap-3 py-2.5 px-3 bg-bg rounded-lg">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-text overflow-hidden text-ellipsis whitespace-nowrap">{r.snapshot.title}</div>
            <div className="text-xs text-text-3 mt-0.5">{new Date(r.createdAt).toLocaleString("en-CA")}</div>
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
  const [d,setD]=useState(()=>existing?{...existing,bodyText:existing.body.map(([h,p])=>`${h}\n${p}`).join("\n\n")}
    :{id:uid("b"),title:"",cat:"Career Advice",scene:"office",tone:C.brand,mins:5,
      author:A.user?.role==="admin"?"NorthHire Editorial":A.company?.name||"",authorSeed:A.user?.seed??0,
      date:"Today",excerpt:"",bodyText:"",owner:A.user?.role==="admin"?"admin":A.company?.id,status:"draft",views:0,featured:false});
  const [err,setErr]=useState({});
  const [scheduleAt,setScheduleAt]=useState(existing?.scheduledAt?new Date(existing.scheduledAt).toISOString().slice(0,16):"");
  const set=(k,v)=>{setD(p=>({...p,[k]:v}));setErr(e=>({...e,[k]:undefined}));};
  const save=(status,scheduledAt)=>{const e={};
    if(!d.title.trim())e.title="Title is required";
    if(d.excerpt.trim().length<20)e.excerpt="Write a short summary, at least a sentence";
    if((d.bodyText||"").replace(/<[^>]+>/g,"").trim().length<80)e.bodyText="The article body is too short";
    setErr(e); if(Object.keys(e).length)return;
    const body=[["", d.bodyText]]; /* single HTML chunk; renderers will inject with dangerouslySetInnerHTML */
    A.saveBlog({...d,body,status,scheduledAt:scheduledAt||null},isNew);};
  return <Page narrow>
    <H1 sub={isNew?"Published articles appear on the home page and in Career resources":"Editing a published article"}
      action={<Btn kind="ghost" onClick={()=>A.go(A.user.role==="admin"?"admBlogs":"empContent")}>Cancel</Btn>}>
      {isNew?"New article":"Edit article"}</H1>
    <div className="grid gap-5 items-start" style={{gridTemplateColumns:mob?"1fr":"1fr 300px"}}>
      <Card pad={mob?20:26}>
        <div className="flex flex-col gap-4">
          <Field label="Title" required error={err.title}><Input value={d.title} onChange={e=>set("title",e.target.value)}
            placeholder="How to write a Canadian resume" invalid={!!err.title}/></Field>
          <div className={`grid gap-3 ${mob?"grid-cols-1":"grid-cols-2"}`}>
            <Field label="Category" required><Sel value={d.cat} onChange={e=>set("cat",e.target.value)}>
              {["Career Advice","Trades","Healthcare","Transport","Resume","Salary","Industry News","Safety"].map(o=><option key={o}>{o}</option>)}</Sel></Field>
            <Field label="Reading time (minutes)"><Input type="number" value={d.mins} onChange={e=>set("mins",Math.max(1,Number(e.target.value)||1))}/></Field></div>
          <Field label="Summary" required error={err.excerpt} hint="One or two sentences shown on the card and at the top of the article.">
            <Area rows={3} value={d.excerpt} onChange={e=>set("excerpt",e.target.value)} invalid={!!err.excerpt}/></Field>
          <Field label="Article body" required error={err.bodyText}
            hint="Each section: heading on the first line, the paragraph underneath, then a blank line before the next section.">
            <RichText value={d.bodyText} onChange={v=>set("bodyText",v)} rows={14} placeholder="Start writing. Use the toolbar for bold, italics, bullet lists, links..."/></Field>
          <Field label="Author name"><Input value={d.author} onChange={e=>set("author",e.target.value)}/></Field></div>
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
      providerSeed:A.user?.seed??0,level:"Beginner",hours:4,price:0,rating:4.5,enrolled:0,modsText:"",outText:"",about:"",
      owner:A.user?.role==="admin"?"admin":A.company?.id,status:"draft",featured:false});
  const [err,setErr]=useState({});
  const [scheduleAt,setScheduleAt]=useState(existing?.scheduledAt?new Date(existing.scheduledAt).toISOString().slice(0,16):"");
  const set=(k,v)=>{setD(p=>({...p,[k]:v}));setErr(e=>({...e,[k]:undefined}));};
  const save=(status,scheduledAt)=>{const e={};
    if(!d.title.trim())e.title="Title is required";
    const aboutTxt=(d.aboutRich||d.about||"").replace(/<[^>]+>/g,"").trim();
    if(aboutTxt.length<30)e.about="Describe the course in a sentence or two";
    if((d.mods||[]).length<2)e.mods="Add at least two modules";
    if((d.outcomes||[]).length<2)e.outcomes="Add at least two learning outcomes";
    setErr(e); if(Object.keys(e).length)return;
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
          <Field label="Course title" required error={err.title}><Input value={d.title} onChange={e=>set("title",e.target.value)}
            placeholder="WHMIS 2015 and Workplace Safety" invalid={!!err.title}/></Field>
          <div className={`grid gap-3 ${mob?"grid-cols-2":"grid-cols-4"}`}>
            <Field label="Category"><Sel value={d.cat} onChange={e=>set("cat",e.target.value)}>
              {["Safety","Trades","Healthcare","Transport","Hospitality","Warehouse","Office","Career","Language","Finance"].map(o=><option key={o}>{o}</option>)}</Sel></Field>
            <Field label="Level"><Sel value={d.level} onChange={e=>set("level",e.target.value)}>
              {["Beginner","Intermediate","Advanced"].map(o=><option key={o}>{o}</option>)}</Sel></Field>
            <Field label="Hours"><Input type="number" value={d.hours} onChange={e=>set("hours",Math.max(1,Number(e.target.value)||1))}/></Field>
            <Field label="Price (CAD)"><Input type="number" value={d.price} onChange={e=>set("price",Math.max(0,Number(e.target.value)||0))} suffix={d.price===0?"Free":""}/></Field></div>
          <Field label="About this course" required error={err.about}>
            <RichText value={d.aboutRich||d.about} onChange={v=>set("aboutRich",v)}
              placeholder="Who the course is for and what certificate it leads to." rows={5}/></Field>

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

          <Field label="Learning outcomes" required error={err.outcomes} hint="What learners will be able to do after finishing the course.">
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
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [d,setD]=useState({...A.company});
  const [confirmDiscard,setConfirmDiscard]=useState(false);
  useEffect(()=>setD({...A.company}),[A.company]);
  const dirty=JSON.stringify(d)!==JSON.stringify(A.company);
  const set=(k,v)=>setD(p=>({...p,[k]:v}));
  const branded=A.can("branded");
  return <Page narrow>
    <H1 sub="What candidates see on your company page"
      action={<Btn kind="outline" size="sm" iconR="chevR" onClick={()=>A.openEmployer(A.company.id)}>View public page</Btn>}>Company profile</H1>
    <Card pad={mob?20:26}>
      <div className="flex gap-4 items-center mb-6 flex-wrap">
        <SmartLogo e={d} size={72} radius={18}/>
        <div className="flex-1" style={{minWidth:180}}>
          <div className="flex items-center justify-between gap-2">
            <Lbl>Logo mark</Lbl>
            {!branded&&<button type="button" onClick={()=>A.requestUpgrade("branded","Branded logo & colours","building")}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand bg-transparent border-0 cursor-pointer p-0"><I n="lock" s={12}/>Growth+</button>}
          </div>
          <div className={`flex gap-2 flex-wrap mb-3 ${branded?"":"opacity-45 pointer-events-none"}`}>
            {Object.keys(MARKS).map(k=><button key={k} onClick={()=>set("mark",k)} className="p-0 rounded-xl overflow-hidden cursor-pointer bg-transparent"
              style={{border:`2px solid ${d.mark===k?C.brand:C.line}`,lineHeight:0}}>
              <Mark kind={k} a={d.a} b={d.b} size={38}/></button>)}</div>
          <Lbl>Brand colour</Lbl>
          <div className={`flex gap-2 flex-wrap ${branded?"":"opacity-45 pointer-events-none"}`}>
            {["#005CCC","#B45309","#0F5C8C","#B02A26","#0B6B3A","#5B2E8C","#28404F","#A14A18"].map(c=>
              <button key={c} onClick={()=>set("a",c)} className="w-7 h-7 rounded-lg cursor-pointer" style={{background:c,
                border:d.a===c?`3px solid ${C.text}`:`1px solid ${C.line}`}}/>)}</div></div></div>
      <div className={`grid gap-3.5 ${mob?"grid-cols-1":"grid-cols-2"}`}>
        <Field label="Company name" required><Input value={d.name} onChange={e=>set("name",e.target.value)}/></Field>
        <Field label="Industry"><Input value={d.industry} onChange={e=>set("industry",e.target.value)}/></Field>
        <Field label="City"><Input icon="pin" value={d.city} onChange={e=>set("city",e.target.value)}/></Field>
        <Field label="Province"><Sel value={PROVS.find(p=>PCODE[p]===d.prov)||"Ontario"} onChange={e=>set("prov",PCODE[e.target.value])}>
          {PROVS.map(p=><option key={p}>{p}</option>)}</Sel></Field>
        <Field label="Company size"><Sel value={d.size} onChange={e=>set("size",e.target.value)}>
          {["1-50","51-200","201-1,000","1,000-5,000","5,000+","10,000+"].map(o=><option key={o}>{o}</option>)}</Sel></Field>
        <Field label="Founded"><Input type="number" value={d.founded} onChange={e=>set("founded",Number(e.target.value)||2000)}/></Field>
        <Field label="Website" style={{gridColumn:mob?"auto":"span 2"}}><Input icon="globe" value={d.site} onChange={e=>set("site",e.target.value)}/></Field>
        <Field label="CRA business number" hint="9 digits — checked during admin verification."><Input icon="file" value={d.businessNumber||""} onChange={e=>set("businessNumber",e.target.value.replace(/\s/g,""))}/></Field>
        <Field label="About the company" style={{gridColumn:mob?"auto":"span 2"}} hint="Two or three sentences shown on your public page and on every listing.">
          <Area rows={5} value={d.about} onChange={e=>set("about",e.target.value)}/></Field></div>
      <div className="flex gap-2.5 justify-end mt-6 pt-5 border-t border-line-soft">
        {dirty&&<Btn kind="ghost" onClick={()=>setConfirmDiscard(true)}>Discard</Btn>}
        <Btn kind="primary" icon="check" disabled={!dirty} onClick={()=>A.saveCompany(d)}>{dirty?"Save changes":"Saved"}</Btn></div></Card>
    <ConfirmDialog open={confirmDiscard} onClose={()=>setConfirmDiscard(false)} confirmLabel="Discard changes"
      title="Discard unsaved changes?" onConfirm={()=>setD({...A.company})}>
      This will revert every field on this page back to what's currently saved.
    </ConfirmDialog>
  </Page>;
}

export function EmpTeam(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const isOwner=A.user?.employerRole==="owner";
  const {members,invites,seatLimit,seatsUsed}=A.team;
  const [inviteEmail,setInviteEmail]=useState(""); const [inviting,setInviting]=useState(false); const [err,setErr]=useState("");
  const [removing,setRemoving]=useState(null); const [lastInviteLink,setLastInviteLink]=useState(null);
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
    <H1 sub="Who has access to your NorthHire employer account">Team</H1>
    <Card pad={mob?20:26} style={{marginBottom:16}}>
      <div className="flex justify-between items-center mb-4">
        <Lbl style={{marginBottom:0}}>Seats</Lbl>
        <Tag tone={atLimit?"warn":"neutral"} sm>{seatsUsed} of {unlimited?"unlimited":seatLimit} used</Tag>
      </div>
      {isOwner&&<>
        <div className="flex gap-2.5 flex-wrap">
          <div className="flex-1 min-w-50"><Input icon="mail" type="email" value={inviteEmail} onChange={e=>{setInviteEmail(e.target.value);setErr("");}} placeholder="teammate@yourcompany.ca" disabled={atLimit}/></div>
          <Btn kind="primary" icon="mail" onClick={send} disabled={inviting||!inviteEmail.trim()||atLimit}>{inviting?"Sending…":"Send invite"}</Btn>
        </div>
        {err&&<div className="text-sm mt-2" style={{color:C.danger}}>{err}</div>}
        {lastInviteLink&&<Banner tone="ok" icon="mail" style={{marginTop:12}} title="Invite created — no real email delivery exists yet, so copy this link and send it yourself">
          <div className="flex gap-2 items-center flex-wrap">
            <code className="text-xs bg-white border border-line-2 rounded-lg py-1.5 px-2.5 break-all">{lastInviteLink}</code>
            <Btn kind="outline" size="sm" icon="copy" onClick={()=>{navigator.clipboard?.writeText(lastInviteLink);A.toast("Invite link copied");}}>Copy</Btn>
          </div>
        </Banner>}
        {atLimit&&<Banner tone="warn" icon="alert" style={{marginTop:12}} title="You're at your plan's seat limit"
          action={<Btn kind="primary" size="sm" onClick={()=>A.go("pricing")}>See plans</Btn>}>
          Remove a teammate, or upgrade to invite more people.</Banner>}
      </>}
    </Card>
    <Card pad={mob?20:26} style={{marginBottom:16}}>
      <Lbl>People with access</Lbl>
      <div className="flex flex-col gap-2">
        {members.map(m=><div key={m.id} className="flex items-center gap-3 py-2.5 border-b border-line-soft">
          <SmartPortrait seed={0} size={36} radius={10}/>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-text">{m.name}{m.id===A.user?.id&&<span className="text-text-3 font-normal"> (you)</span>}</div>
            <div className="text-xs text-text-3 overflow-hidden text-ellipsis whitespace-nowrap">{m.email}</div></div>
          <Tag tone={m.role==="owner"?"brand":"neutral"} sm>{m.role==="owner"?"Owner":"Member"}</Tag>
          {isOwner&&m.role!=="owner"&&<Btn kind="ghost" size="xs" icon="trash" onClick={()=>setRemoving(m)}/>}
        </div>)}
      </div>
    </Card>
    {isOwner&&invites.length>0&&<Card pad={mob?20:26}>
      <Lbl>Pending invites</Lbl>
      <div className="flex flex-col gap-2">
        {invites.map(inv=><div key={inv.id} className="flex items-center gap-3 py-2.5 border-b border-line-soft">
          <div className="w-9 h-9 rounded-lg bg-wash text-brand flex items-center justify-center shrink-0"><I n="mail" s={16}/></div>
          <div className="flex-1 min-w-0 text-sm font-semibold text-text overflow-hidden text-ellipsis whitespace-nowrap">{inv.email}</div>
          <Tag tone="warn" sm>Pending</Tag>
          <Btn kind="ghost" size="xs" icon="x" onClick={()=>A.revokeInvite(inv.id)}/>
        </div>)}
      </div>
    </Card>}
    <ConfirmDialog open={!!removing} onClose={()=>setRemoving(null)} confirmLabel="Remove"
      title={`Remove ${removing?.name}?`} onConfirm={()=>{A.removeTeammate(removing.id);setRemoving(null);}}>
      They'll immediately lose access to this employer account. This can't be undone from here.
    </ConfirmDialog>
  </Page>;
}

export function EmpBilling(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const live=A.jobs.filter(j=>j.e===A.company.id&&j.status==="live").length;
  const plan=A.company.plan||"Free";
  const limit=A.PLANS[plan]?.jobs??1;
  const price=A.PLANS[plan]?.price||0;
  const nextRenewal=(()=>{const d=new Date();d.setMonth(d.getMonth()+1,1);return d.toLocaleDateString("en-CA",{day:"numeric",month:"long",year:"numeric"});})();
  const invoices=A.employerInvoices.map(inv=>({id:inv.id,date:new Date(inv.createdAt).toLocaleDateString("en-CA",{day:"numeric",month:"short",year:"numeric"}),
    amt:inv.amountPretax,tax:inv.tax,taxLabel:inv.taxLabel,total:inv.total,plan:inv.plan}));
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
    <H1 sub="Your subscription, usage and invoices">Billing</H1>
    {checkoutResult&&<Banner tone={checkoutResult.ok?"ok":"danger"} icon={checkoutResult.ok?"check":"alert"} style={{marginBottom:16}}
      title={checkoutResult.ok?"Payment confirmed":"Payment not confirmed"}>
      {checkoutResult.ok?"Your plan has been upgraded.":checkoutResult.msg}</Banner>}
    <Card pad={mob?20:26} style={{marginBottom:16,background:C.ink,borderColor:C.ink}}>
      <div className="flex justify-between gap-4 flex-wrap text-white">
        <div className="grow shrink basis-60">
          <Tag tone="onDark">Current plan</Tag>
          <div className="text-2xl font-bold tracking-tight my-3">{plan} — {A.PLANS[plan]?.price===0?"Free forever":`$${A.PLANS[plan]?.price}/month`}</div>
          <div className="text-sm text-white/55">{price>0?`Renews ${nextRenewal} • `:""}{live} of {limit===Infinity?"unlimited":limit} job slots in use</div>
          <div className="mt-4 max-w-75"><Bar v={limit===Infinity?100:(live/limit)*100} tone="#4ADE80"/></div></div>
        <div className="flex gap-2.5 flex-wrap items-start">
          <Btn kind="onDark" onClick={()=>A.go("pricing")}>Change plan</Btn></div></div></Card>

    <Card style={{marginBottom:16,borderRadius:20}}>
      <H2 sub="Update your card, view Stripe's own receipts, or cancel — all handled by Stripe directly, not stored in this app.">Payment method</H2>
      {price===0
        ?<div className="text-sm text-text-3 py-2">No payment method on file — you're on the free plan.</div>
        :<Btn kind="outline" icon="wallet" disabled={portalLoading} onClick={async()=>{setPortalLoading(true);const r=await A.openBillingPortal();if(!r.ok){setPortalLoading(false);A.toast(r.msg,"danger");}}}>
          {portalLoading?"Opening…":"Manage billing in Stripe"}</Btn>}
    </Card>

    {invoices.length>0&&<Card style={{borderRadius:20}}><H2>Invoices</H2>
      {invoices.map(({id,date,amt,tax,taxLabel,total,plan:invPlan})=>
        <div key={id} className="flex items-center gap-3.5 py-3 border-b border-line-soft flex-wrap">
          <div className="grow shrink basis-35 min-w-0">
            <div className="text-sm font-semibold text-text">{id}</div>
            <div className="text-xs text-text-3 mt-0.5">{date}</div></div>
          <div className="text-sm font-semibold text-text">${total.toFixed(2)}</div>
          <Tag tone="ok" sm icon="check">Paid</Tag>
          <Btn kind="ghost" size="xs" icon="download" onClick={()=>A.printInvoice(id,date,amt,invPlan,tax,taxLabel)}>Print / Save as PDF</Btn></div>)}</Card>}
  </Page>;
}

export function EmpAnalyticsPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const stats=A.employerAnalytics(); if(!stats) return <Page><Empty icon="activity" title="No data" body="Post a job first."/></Page>;
  const pad=mob?"py-11 px-4":"py-18 px-8";
  return <div className="bg-white min-h-full">
    <section className={`bg-white border-b border-line-soft ${pad}`}>
      <div className="max-w-280 mx-auto">
        <Tag tone="brand" icon="activity">Analytics</Tag>
        <h1 className={`${HERO_WIDE} mt-5 mb-3 ${mob?"text-4xl":"text-6xl"}`}>How your hiring is doing.</h1>
        <p className={`text-text-2 leading-snug m-0 max-w-140 ${mob?"text-base":"text-xl"}`}>Live numbers from your postings.</p></div>
    </section>
    <section className={`bg-bg ${mob?"pt-8 px-4 pb-14":"pt-12 px-8 pb-24"}`}>
      <div className="max-w-280 mx-auto">
        <div className={`grid gap-3.5 mb-6 ${mob?"grid-cols-2":"grid-cols-4"}`}>
          <Stat label="Live jobs" value={stats.liveJobs} icon="briefcase"/>
          <Stat label="Total views" value={stats.totalViews.toLocaleString()} icon="eye"/>
          <Stat label="Applications" value={stats.totalApps} icon="send"/>
          <Stat label="View → apply" value={`${stats.conversion}%`} icon="target" tone={C.brand}/>
        </div>
        <Card pad={mob?24:32} style={{borderRadius:20,marginBottom:16}}>
          <Lbl>Applications, last 30 days</Lbl>
          {(()=>{const trend=stats.applicationTrend||[]; const max=Math.max(...trend.map(t=>t.count),1);
            const total=trend.reduce((s,t)=>s+t.count,0);
            if(total===0)return <div className="text-sm text-text-3 py-4">No applications in the last 30 days yet.</div>;
            return <div className="flex items-end gap-0.5" style={{height:100}}>
              {trend.map(t=>{const h=Math.max(2,Math.round((t.count/max)*90));
                return <div key={t.date} className="flex-1 min-w-0 group relative" style={{height:"100%"}} title={`${t.date}: ${t.count} application${t.count===1?"":"s"}`}>
                  <div className="absolute bottom-0 left-0 right-0 rounded-t transition-[height] duration-300" style={{height:h,background:t.count>0?C.brand:C.line}}/>
                </div>;})}
            </div>;})()}
          <div className="flex justify-between text-xs text-text-3 mt-2">
            <span>{stats.applicationTrend?.[0]?.date}</span><span>{stats.applicationTrend?.[stats.applicationTrend.length-1]?.date}</span>
          </div>
        </Card>
        <div className="grid gap-4" style={{gridTemplateColumns:mob?"1fr":"1.2fr 1fr"}}>
          <Card pad={mob?24:32} style={{borderRadius:20}}>
            <Lbl>Pipeline breakdown</Lbl>
            {stats.byStage.map(({stage,count})=>{const max=Math.max(...stats.byStage.map(s=>s.count),1);
              const pct=Math.round((count/max)*100);
              return <div key={stage} className="mb-3.5">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-text">{stage}</span><span className="font-semibold text-text-2">{count}</span></div>
                <div className="h-2 bg-bg rounded-full overflow-hidden">
                  <div className="h-full transition-[width] duration-300" style={{width:`${pct}%`,background:stage==="Offer"?C.ok:stage==="Interview"?C.warn:C.brand}}/></div></div>;})}</Card>
          <div className="flex flex-col gap-3.5">
            <Card pad={mob?24:32} style={{borderRadius:20}}>
              <Lbl>Average candidate match</Lbl>
              <div className="flex items-center gap-5 mt-1">
                <Ring v={stats.avgScore} size={90}/>
                <div><div className="text-sm text-text-2 leading-snug">Across all applicants who applied to your jobs.</div>
                  <div className="text-xs text-text-3 mt-2">Above 75 is strong; publish honest requirements to raise this.</div></div></div></Card>
            {stats.topJob&&<Card pad={mob?24:32} style={{borderRadius:20}}>
              <Lbl>Top performing role</Lbl>
              <div className="font-semibold text-text tracking-tight mb-1.5" style={{fontSize:15.5}}>{stats.topJob.j.t}</div>
              <div className="text-sm text-text-2 mb-3.5">{stats.topJob.apps} applicants • {stats.topJob.j.views.toLocaleString()} views</div>
              <Btn kind="outline" size="sm" onClick={()=>{A.setPipelineJob(stats.topJob.j.id);A.go("empPipeline");}}>Open pipeline</Btn></Card>}
          </div>
        </div>
        {stats.byJob?.length>0&&<Card pad={0} style={{borderRadius:20,marginTop:16,overflow:"hidden"}}>
          <div className="flex justify-between items-center py-4 px-6 border-b border-line-soft">
            <Lbl style={{margin:0}}>Per-job performance</Lbl>
            <Btn kind="outline" size="sm" icon="download" onClick={()=>{
              const rows=[["Job","Status","Views","Applications","View → apply","Offers made"],
                ...stats.byJob.map(j=>[j.title,j.status,j.views,j.applications,`${j.conversion}%`,j.offers])];
              const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
              const blob=new Blob([csv],{type:"text/csv"}); const url=URL.createObjectURL(blob);
              const a=document.createElement("a"); a.href=url; a.download="job-performance.csv"; a.click(); URL.revokeObjectURL(url);
            }}>Export CSV</Btn>
          </div>
          <div className="overflow-x-auto"><table className="w-full border-collapse" style={{minWidth:600}}>
            <thead><tr className="border-b-2 border-line text-left">
              {["Job","Status","Views","Applications","View → apply","Offers"].map(h=>
                <th key={h} className="py-2.5 px-4 text-xs font-bold text-text-3 tracking-wide uppercase">{h}</th>)}
            </tr></thead>
            <tbody>{stats.byJob.map(j=><tr key={j.id} className="border-b border-line-soft hover:bg-bg cursor-pointer" onClick={()=>A.openJob(j.id)}>
              <td className="py-2.5 px-4 text-sm font-semibold text-text">{j.title}</td>
              <td className="py-2.5 px-4"><Tag tone={jobTone(j.status)} sm>{jobStatusLabel(j.status)}</Tag></td>
              <td className="py-2.5 px-4 text-sm text-text-2">{j.views.toLocaleString()}</td>
              <td className="py-2.5 px-4 text-sm text-text-2">{j.applications}</td>
              <td className="py-2.5 px-4 text-sm text-text-2">{j.conversion}%</td>
              <td className="py-2.5 px-4 text-sm text-text-2">{j.offers}</td>
            </tr>)}</tbody>
          </table></div>
        </Card>}
        {stats.eligibilityMix?.length>0&&<Card pad={mob?24:32} style={{borderRadius:20,marginTop:16}}>
          <Lbl>Applicant work-authorization mix</Lbl>
          <p className="text-sm text-text-2 leading-snug mt-1 mb-4">From each applicant's own eligibility answer at signup — for compliance reporting, not a hiring filter.</p>
          <div className="flex flex-col gap-3">
            {stats.eligibilityMix.map(({label,count})=>{const max=Math.max(...stats.eligibilityMix.map(x=>x.count),1); const pct=Math.round((count/max)*100);
              return <div key={label}>
                <div className="flex justify-between text-sm mb-1.5"><span className="text-text">{label}</span><span className="font-semibold text-text-2">{count}</span></div>
                <div className="h-2 bg-bg rounded-full overflow-hidden"><div className="h-full transition-[width] duration-300" style={{width:`${pct}%`,background:C.brand}}/></div></div>;})}
          </div>
        </Card>}
      </div>
    </section>
  </div>;
}
