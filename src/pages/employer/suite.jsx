import { useState, useEffect } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C, SH } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import {
  Page, H1, H2, Btn, Banner, Stat, Card, Empty, Tag, Bar, Modal, Area, Field, Input, Sel,
  RichText, Switch, DatePicker, Ring, Tabs, Lbl, SmartPortrait, SmartScene, SmartLogo, Mark, MARKS,
} from "../../design/primitives.jsx";
import { pay, payShort, dlText, money, uid } from "../../helpers/utils.js";
import { STAGES, PROVS, PCODE, CATS, CATM } from "../../store/seed/constants.js";
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
      action={<div style={{display:"flex",gap:9,flexWrap:"wrap"}}>
        <Btn kind="outline" onClick={()=>A.go("empPipeline")}>Candidates</Btn>
        <Btn kind="primary" icon="plus" onClick={()=>A.go("empPost")}>Post a job</Btn></div>}>{e.name}</H1>
    {!e.verified&&<Banner tone="warn" icon="clock" title="Verification in review" style={{marginBottom:18}}>
      An administrator is reviewing your company. Verified employers get a badge on every listing and around 40% more applicants.</Banner>}
    {!canContent&&<Banner tone="neutral" icon="lock" title="Content publishing is currently off" style={{marginBottom:18}}>
      Publishing articles and trainings has been disabled platform-wide by an administrator. Your existing content stays visible.</Banner>}
    <div style={{display:"grid",gridTemplateColumns:`repeat(auto-fit,minmax(${mob?140:170}px,1fr))`,gap:12,marginBottom:20}}>
      <Stat icon="briefcase" label="Live listings" value={jobs.filter(j=>j.status==="live").length} tone={C.brand} onClick={()=>A.go("empJobs")}/>
      <Stat icon="users" label="Total applicants" value={apps.length} onClick={()=>A.go("empPipeline")}/>
      <Stat icon="calendar" label="In interview" value={byStage.Interview||0} tone={C.warn}/>
      <Stat icon="award" label="Offers out" value={byStage.Offer||0} tone={C.ok}/></div>
    <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1.4fr 1fr",gap:16}}>
      <Card>
        <H2 action={<Btn kind="ghost" size="sm" onClick={()=>A.go("empJobs")}>Manage all</Btn>}>Your listings</H2>
        {jobs.length===0?<Empty icon="briefcase" title="No listings yet" body="Post your first role and scored applicants arrive within hours."
          action={<Btn kind="primary" icon="plus" onClick={()=>A.go("empPost")}>Post a job</Btn>}/>
          :jobs.slice(0,6).map(j=>{const n=A.applications.filter(a=>a.job===j.id).length;
            return <div key={j.id} onClick={()=>A.go("empPipeline")} style={{display:"flex",alignItems:"center",gap:13,
              padding:"13px 0",borderBottom:`1px solid ${C.lineSoft}`,cursor:"pointer"}}>
              <div style={{width:9,height:9,borderRadius:99,background:j.status==="live"?C.ok:j.status==="paused"?C.warn:C.text3,flexShrink:0}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14.5,fontWeight:640,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{j.t}</div>
                <div style={{fontSize:12.5,color:C.text3,marginTop:3}}>{n} applicant{n===1?"":"s"} • {j.views.toLocaleString()} views • {j.posted}</div></div>
              <Tag tone={j.status==="live"?"ok":j.status==="paused"?"warn":"neutral"} sm>{j.status==="live"?"Live":j.status==="paused"?"Paused":"Closed"}</Tag></div>;})}</Card>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <Card><H2>Pipeline</H2>
          {STAGES.map(s=>{const n=byStage[s]||0;
            return <div key={s} style={{marginBottom:13}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:6}}>
                <span style={{color:C.text2,fontWeight:520}}>{s}</span><span style={{fontWeight:700,color:C.brand}}>{n}</span></div>
              <Bar v={apps.length?(n/apps.length)*100:0} h={6}/></div>;})}</Card>
        <Card><H2>Quick actions</H2>
          {[["plus","Post a new job","empPost"],["users","Review candidates","empPipeline"],
            ["book","Publish an article","empContent"],["wallet","Billing and plan","empBilling"]].map(([ic,l,p])=>
            <button key={l} onClick={()=>A.go(p)} style={{display:"flex",alignItems:"center",gap:11,width:"100%",padding:"11px 10px",
              borderRadius:10,border:"none",background:"transparent",cursor:"pointer",fontFamily:"inherit",fontSize:14,color:C.text,textAlign:"left"}}
              onMouseEnter={ev=>ev.currentTarget.style.background=C.bg} onMouseLeave={ev=>ev.currentTarget.style.background="transparent"}>
              <I n={ic} s={17} c={C.brand}/>{l}</button>)}</Card></div></div>
  </Page>;
}

export function EmpJobs(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const jobs=A.jobs.filter(j=>j.e===A.company.id);
  const [showImport,setShowImport]=useState(false);
  const [csv,setCsv]=useState(""); const [importResult,setImportResult]=useState(null);
  const sampleCSV="title,city,province,type,pay_low,pay_high,pay_unit,category,mode,vacancies,experience,education,skills,perks,duties,requirements,description\nJourneyperson Electrician,Calgary,Alberta,Full Time,42,52,hr,trades,On-site,2,3+ years,Apprenticeship / trade certificate,Red Seal;WHMIS;Fall Protection,Health benefits;RRSP match,Site fit-out;Panel installation;Testing,Red Seal cert;5+ years commercial,Hiring a Red Seal electrician for commercial fit-outs in Calgary.";
  return <Page wide>
    <H1 sub={`${jobs.length} listing${jobs.length===1?"":"s"} • ${A.applications.filter(a=>jobs.some(j=>j.id===a.job)).length} applicants`}
      action={<div style={{display:"flex",gap:9,flexWrap:"wrap"}}>
        {A.can("csvImport")?<Btn kind="outline" icon="upload" onClick={()=>setShowImport(true)}>Import CSV</Btn>:<Btn kind="ghost" icon="lock" onClick={()=>A.go("pricing")} title="CSV import is a Growth+ feature">CSV import (Growth+)</Btn>}
        <Btn kind="primary" icon="plus" onClick={()=>A.go("empPost")}>Post a job</Btn></div>}>My job listings</H1>
    {showImport&&<Modal onClose={()=>{setShowImport(false);setImportResult(null);setCsv("");}} title="Import jobs from CSV">
      <p style={{fontSize:14,color:C.text2,lineHeight:1.6,margin:"0 0 14px"}}>Paste CSV below. First row must be headers. Required columns: <strong style={{color:C.text}}>title, city, province, type, pay_low, pay_high, pay_unit, category</strong>. Multi-value fields (skills, perks, duties, requirements) use semicolons.</p>
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        <Btn kind="outline" size="sm" onClick={()=>setCsv(sampleCSV)}>Load example</Btn>
        <Btn kind="ghost" size="sm" onClick={()=>setCsv("")}>Clear</Btn></div>
      <Area rows={10} value={csv} onChange={e=>setCsv(e.target.value)} placeholder="title,city,province,type,pay_low,pay_high,pay_unit,category..." style={{fontFamily:"ui-monospace,monospace",fontSize:12.5}}/>
      {importResult&&<Banner tone={importResult.ok?"ok":"danger"} icon={importResult.ok?"check":"alert"} title={importResult.ok?`Imported ${importResult.imported} job${importResult.imported===1?"":"s"}`:"Import failed"} style={{marginTop:14}}>
        {importResult.ok?<>Jobs are in review status until an admin approves them.{importResult.errors?.length?` Also skipped ${importResult.errors.length} rows.`:""}</>:importResult.msg}</Banner>}
      <div style={{display:"flex",gap:9,justifyContent:"flex-end",marginTop:14}}>
        <Btn kind="ghost" onClick={()=>{setShowImport(false);setImportResult(null);setCsv("");}}>Cancel</Btn>
        <Btn kind="primary" icon="upload" disabled={!csv.trim()} onClick={()=>{const r=A.importJobsCSV(csv);setImportResult(r);if(r.ok&&!r.errors?.length){setTimeout(()=>{setShowImport(false);setImportResult(null);setCsv("");},1500);}}}>Import</Btn></div>
    </Modal>}
    {jobs.length===0?<Empty icon="briefcase" title="No listings yet" body="Create your first posting to start receiving applications."
      action={<Btn kind="primary" icon="plus" onClick={()=>A.go("empPost")}>Post a job</Btn>}/>
      :<div style={{display:"flex",flexDirection:"column",gap:12}}>
        {jobs.map((j,i)=>{const apps=A.applications.filter(a=>a.job===j.id);
          return <Card key={j.id} delay={Math.min(i,6)*0.04}>
            <div style={{display:"flex",gap:14,alignItems:"flex-start",flexWrap:"wrap"}}>
              <div style={{flex:"1 1 240px",minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:9,flexWrap:"wrap"}}>
                  <span style={{fontSize:16.5,fontWeight:660,color:C.text,letterSpacing:"-.02em"}}>{j.t}</span>
                  <Tag tone={j.status==="live"?"ok":j.status==="paused"?"warn":"neutral"} sm>{j.status==="live"?"Live":j.status==="paused"?"Paused":"Closed"}</Tag>
                  {j.flagged&&<Tag tone="danger" sm icon="alert">Flagged by admin</Tag>}</div>
                <div style={{fontSize:13.5,color:C.text2,marginTop:5}}>{j.city}, {j.prov} • {j.mode} • {j.type} • {pay(j)}{payShort(j)}</div>
                <div style={{display:"flex",gap:18,marginTop:12,flexWrap:"wrap"}}>
                  {[["Applicants",apps.length],["Views",j.views.toLocaleString()],["Posted",j.posted],["Closes",dlText(j.dl)]].map(([k,v])=>
                    <div key={k}><div style={{fontSize:11.5,color:C.text3}}>{k}</div>
                      <div style={{fontSize:15,fontWeight:700,color:C.text,marginTop:2}}>{v}</div></div>)}</div></div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                <Btn kind="outline" size="sm" onClick={()=>A.openJob(j.id)}>Preview</Btn>
                <Btn kind="outline" size="sm" onClick={()=>A.toggleJobStatus(j.id)}>{j.status==="live"?"Pause":"Reopen"}</Btn>
                <Btn kind="primary" size="sm" onClick={()=>{A.setPipelineJob(j.id);A.go("empPipeline");}}>Candidates ({apps.length})</Btn></div></div></Card>;})}</div>}
  </Page>;
}

export function EmpPost(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [step,setStep]=useState(1); const [err,setErr]=useState({});
  const [f,setF]=useState({t:"",cat:"trades",type:"Full Time",mode:"On-site",desc:"",
    skills:[],mustHave:[],location:"",city:"",prov:"Ontario",
    payType:"range",  /* range | fixed */
    payPeriod:"hr",   /* hr | yr | contract */
    lo:"",hi:"",fixed:"",contractAmt:"",
    vac:1,exp:"Entry level welcome",yearsExp:0,edu:"No formal education required",
    dlDate:"", /* absolute date, replaces days */
    perks:[],duties:"",reqs:"",how:"",urgent:false,
    questions:[]});

  const set=(k,v)=>{setF(p=>({...p,[k]:v}));setErr(e=>({...e,[k]:undefined}));};
  const setLocation=loc=>{const parts=loc.split(",").map(s=>s.trim());
    setF(p=>({...p,location:loc,city:parts[0]||"",prov:PROVS.find(pr=>PCODE[pr]===parts[1])||p.prov}));};

  const applyAI=()=>{const s=aiSuggestJD(f.t,f.cat);
    setF(p=>({...p,
      desc:p.desc||s.desc,
      duties:p.duties||s.duties.join("\n"),
      reqs:p.reqs||s.reqs.join("\n")}));};

  const validate=()=>{const e={};
    if(step===1){
      if(!f.t.trim())e.t="Job title is required";
      const descTxt=(f.desc||"").replace(/<[^>]+>/g,"").trim();
      if(descTxt.length<40)e.desc="Give at least a couple of sentences";
      if(f.mustHave.length===0)e.mustHave="Add at least one must-have skill";
    }
    if(step===2){
      if(!f.location.trim())e.location="Choose a location";
      if(f.payType==="range"){
        if(!f.lo)e.lo="Required"; if(!f.hi)e.hi="Required";
        if(f.lo&&f.hi&&Number(f.hi)<Number(f.lo))e.hi="Maximum must be above the minimum";
      } else {
        if(!f.fixed)e.fixed="Required";
      }
      if(!f.dlDate)e.dlDate="Choose a closing date";
    }
    setErr(e); return !Object.keys(e).length;};

  const [postErr,setPostErr]=useState("");
  const next=()=>{if(!validate())return;
    if(step<3){setStep(step+1);return;}
    /* Backfill legacy fields the store expects */
    const payload={...f,
      skills:[...f.mustHave,...f.skills].join(","),
      lo:f.payType==="range"?f.lo:f.fixed,
      hi:f.payType==="range"?f.hi:f.fixed,
      unit:f.payPeriod,
      perks:(f.perks||[]).join(","),
      dl:f.dlDate?Math.max(1,Math.ceil((new Date(f.dlDate)-new Date())/(1000*60*60*24))):14,
      featured:false};
    const r=A.publishJob(payload);
    if(r&&!r.ok)setPostErr(r.msg);
  };

  const steps=["Role details","Pay & location","Application"];
  const today=new Date().toISOString().slice(0,10);
  const maxDate=(()=>{const d=new Date();d.setMonth(d.getMonth()+3);return d.toISOString().slice(0,10);})();

  return <Page narrow>
    <H1 sub="About five minutes. Listings go live immediately.">Post a job</H1>

    {postErr&&<Banner tone="danger" icon="alert" title="Cannot publish" style={{marginBottom:16}}
      action={<Btn kind="primary" size="sm" onClick={()=>A.go("pricing")}>See plans</Btn>}>{postErr}</Banner>}

    <Card pad={mob?16:20} style={{marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center"}}>
        {steps.map((s,i)=><div key={s} style={{display:"flex",alignItems:"center",flex:i<2?1:"0 0 auto",minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
            <div style={{width:28,height:28,borderRadius:99,display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:12.5,fontWeight:700,flexShrink:0,transition:"all .25s",
              background:step>i+1?C.ok:step===i+1?C.brand:C.lineSoft,color:step>=i+1?"#fff":C.text3}}>
              {step>i+1?<I n="check" s={14} c="#fff" w={3}/>:i+1}</div>
            {!mob&&<span style={{fontSize:13.5,fontWeight:step===i+1?650:500,color:step===i+1?C.text:C.text3,whiteSpace:"nowrap"}}>{s}</span>}</div>
          {i<2&&<div style={{flex:1,height:2,background:step>i+1?C.ok:C.lineSoft,margin:"0 10px",borderRadius:99,minWidth:14,transition:"background .3s"}}/>}</div>)}</div></Card>

    <Card pad={mob?20:26}>
      <div key={step} style={{animation:"slideIn .26s ease both"}}>

      {step===1&&<div style={{display:"flex",flexDirection:"column",gap:18}}>
        <H2 sub="Clear titles and honest descriptions get far more qualified applicants">Role details</H2>

        <Field label="Job title" required error={err.t}>
          <Input value={f.t} onChange={e=>set("t",e.target.value)}
            placeholder="e.g. Red Seal Electrician, Registered Nurse, Line Cook" invalid={!!err.t}/></Field>

        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr 1fr",gap:12}}>
          <Field label="Sector" required><Sel value={f.cat} onChange={e=>set("cat",e.target.value)}>
            {CATS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</Sel></Field>
          <Field label="Employment type"><Sel value={f.type} onChange={e=>set("type",e.target.value)}>
            {["Full Time","Part Time","Contract","Seasonal","Apprenticeship","Casual"].map(o=><option key={o}>{o}</option>)}</Sel></Field>
          <Field label="Work setting"><Sel value={f.mode} onChange={e=>set("mode",e.target.value)}>
            {["On-site","Hybrid","Remote"].map(o=><option key={o}>{o}</option>)}</Sel></Field>
        </div>

        <div style={{background:`linear-gradient(135deg,${C.tint} 0%,#F0F7FF 100%)`,border:`1px solid ${C.line2}`,borderRadius:12,padding:14,display:"flex",gap:12,alignItems:"center"}}>
          <div style={{width:38,height:38,borderRadius:10,background:C.brand,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><I n="sparkle" s={19}/></div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13.5,fontWeight:650,color:C.text}}>Auto-fill with AI</div>
            <div style={{fontSize:12.5,color:C.text2,marginTop:2}}>We'll draft the description, duties and requirements based on your title and sector. Edit anything you want.</div>
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

        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12}}>
          <Field label="Experience required"><Sel value={f.exp} onChange={e=>set("exp",e.target.value)}>
            {["No experience required","Entry level welcome","1+ years","2+ years","3+ years","4+ years","5+ years","10+ years"].map(o=><option key={o}>{o}</option>)}</Sel></Field>
          <Field label="Education required"><Sel value={f.edu} onChange={e=>set("edu",e.target.value)}>
            {["No formal education required","High School Diploma","Apprenticeship / trade certificate","College Diploma","Bachelor's Degree or equivalent","Red Seal Certificate","Professional registration","Master's Degree","Doctorate"].map(o=><option key={o}>{o}</option>)}</Sel></Field>
        </div>
      </div>}

      {step===2&&<div style={{display:"flex",flexDirection:"column",gap:18}}>
        <H2 sub="Listings that publish a salary get roughly three times more applications">Pay, location & application</H2>

        <Field label="Location" required error={err.location}
          hint="Type at least 2 letters to search Canadian cities, or use your current location.">
          <LocationInput value={f.location} onChange={setLocation}
            placeholder="Start typing a city..."/></Field>

        <Field label="Pay structure">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            {[["range","Range (min – max)"],["fixed","Fixed amount"]].map(([k,l])=>
              <button key={k} type="button" onClick={()=>set("payType",k)} style={{padding:"12px",borderRadius:10,cursor:"pointer",fontFamily:"inherit",fontSize:14,fontWeight:f.payType===k?650:520,border:`1.5px solid ${f.payType===k?C.brand:C.line}`,background:f.payType===k?C.tint:"#fff",color:f.payType===k?C.brand:C.text,transition:"all .16s"}}>{l}</button>)}
          </div>
          <div style={{display:"grid",gridTemplateColumns:mob?"1fr":f.payType==="range"?"1fr 1fr 1fr":"1fr 1fr",gap:12}}>
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

        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12}}>
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

        <div style={{background:C.bg,border:`1px solid ${C.line}`,borderRadius:12,padding:16,marginTop:6}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
            <div>
              <div style={{fontSize:14,fontWeight:660,color:C.text}}>Additional application questions</div>
              <div style={{fontSize:12.5,color:C.text2,marginTop:3}}>Ask about work permits, driver's licence, willingness to travel, etc.</div>
            </div>
            <Tag tone="brand" sm>{f.questions.length} added</Tag>
          </div>
          <QuestionBuilder value={f.questions} onChange={v=>set("questions",v)}/>
        </div>

        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:14,padding:"14px 0",borderTop:`1px solid ${C.lineSoft}`,marginTop:8}}>
          <div><div style={{fontSize:14,fontWeight:620,color:C.text}}>Mark as urgent hire</div>
            <div style={{fontSize:12.5,color:C.text2,marginTop:2}}>Adds a badge. The system sorts featured listings automatically based on performance.</div></div>
          <Switch on={f.urgent} onChange={v=>set("urgent",v)}/></div>
      </div>}

      {step===3&&<div>
        <H2 sub="This is exactly how candidates will see it">Review and publish</H2>
        <div style={{background:C.bg,border:`1px solid ${C.line}`,borderRadius:14,padding:20,marginBottom:16}}>
          <div style={{fontSize:20,fontWeight:720,color:C.text,letterSpacing:"-.03em"}}>{f.t||"Untitled role"}</div>
          <div style={{fontSize:14,color:C.text2,marginTop:5}}>{A.company.name} • {f.location||"Location"} • {f.mode}</div>
          <div style={{display:"inline-flex",alignItems:"baseline",gap:7,background:C.tint,border:`1px solid ${C.line2}`,
            borderRadius:10,padding:"9px 13px",margin:"14px 0"}}>
            <span style={{fontSize:18,fontWeight:730,color:C.brand,letterSpacing:"-.025em"}}>
              {f.payType==="range"
                ? (f.payPeriod==="yr"?`$${Math.round(Number(f.lo)/1000)}k – $${Math.round(Number(f.hi)/1000)}k`:`$${f.lo} – $${f.hi}`)
                : (f.payPeriod==="yr"?`$${Math.round(Number(f.fixed)/1000)}k`:`$${f.fixed}`)}</span>
            <span style={{fontSize:12.5,color:C.brand,opacity:.75}}>{{"yr":"per year","mi":"per mile","contract":"total","hr":"per hour"}[f.payPeriod]}</span></div>
          <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:14}}>
            <Tag sm>{f.type}</Tag><Tag sm>{CATM[f.cat].label}</Tag>
            {f.mode!=="On-site"&&<Tag tone="ok" sm>{f.mode}</Tag>}
            {f.urgent&&<Tag tone="warn" sm>Urgent</Tag>}
            <Tag sm>{f.vac} {f.vac==1?"opening":"openings"}</Tag>
            <Tag sm>Closes {f.dlDate||"—"}</Tag></div>
          {f.desc&&<div className="rich-content" style={{fontSize:14.5,color:C.text2,lineHeight:1.7,margin:0}} dangerouslySetInnerHTML={{__html:f.desc}}/>}
          {f.mustHave.length>0&&<div style={{marginTop:14}}>
            <div style={{fontSize:11,fontWeight:700,color:C.brand,letterSpacing:".06em",textTransform:"uppercase",marginBottom:6}}>Must-have</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {f.mustHave.map(s=><Tag key={s} tone="brand" sm>{s}</Tag>)}</div>
          </div>}
          {f.skills.length>0&&<div style={{marginTop:10}}>
            <div style={{fontSize:11,fontWeight:700,color:C.text3,letterSpacing:".06em",textTransform:"uppercase",marginBottom:6}}>Nice to have</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {f.skills.map(s=><Tag key={s} tone="dark" sm>{s}</Tag>)}</div>
          </div>}
          {f.questions.length>0&&<div style={{marginTop:14,padding:12,background:"#fff",border:`1px solid ${C.line}`,borderRadius:10}}>
            <div style={{fontSize:12,fontWeight:660,color:C.text,marginBottom:6}}>Application questions ({f.questions.length})</div>
            <div style={{fontSize:12.5,color:C.text2,lineHeight:1.6}}>{f.questions.map(q=>q.prompt||"(empty)").join(" • ")}</div>
          </div>}
        </div>
        <Banner tone="brand" icon="sparkle" title="Scoring is automatic">
          Every applicant is scored out of 100 against your must-have skills and experience. Your pipeline shows the best fit first, ranked by the system.</Banner>
      </div>}

      </div>
      <div style={{display:"flex",justifyContent:"space-between",gap:10,marginTop:24,paddingTop:20,borderTop:`1px solid ${C.lineSoft}`}}>
        <Btn kind="ghost" icon="arrowL" onClick={()=>step===1?A.go("empJobs"):setStep(step-1)}>{step===1?"Cancel":"Back"}</Btn>
        <Btn kind={step===3?"ok":"primary"} size="lg" iconR={step===3?"check":"arrowR"} onClick={next}>
          {step===3?"Publish listing":"Continue"}</Btn></div>
    </Card>
  </Page>;
}

export function EmpPipeline(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const myJobs=A.jobs.filter(j=>j.e===A.company.id);
  const jobId=A.pipelineJob||myJobs[0]?.id;
  const job=A.job(jobId);
  const rawApps=A.applications.filter(a=>a.job===jobId);
  const [tab,setTab]=useState("pipeline");
  const [sel,setSel]=useState(new Set());
  const [f,setF]=useState({minScore:0,prov:"",skill:""});
  const [bulkMenu,setBulkMenu]=useState(false);

  if(!job) return <Page><Empty icon="users" title="No listings to review" body="Post a job and applicants land here automatically."
    action={<Btn kind="primary" icon="plus" onClick={()=>A.go("empPost")}>Post a job</Btn>}/></Page>;

  const apps=rawApps.filter(a=>{const u=A.person(a.user);const s=A.scoreCandidate(u,job);
    if(s<f.minScore)return false;
    if(f.prov&&u.prov!==PCODE[f.prov])return false;
    if(f.skill&&!u.skills.some(sk=>sk.toLowerCase().includes(f.skill.toLowerCase())))return false;
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

  const reverseCandidates=A.reverseMatch(jobId);

  return <div style={{display:"flex",flexDirection:"column",minHeight:"100%",background:C.bg}}>
    <div style={{background:"#fff",borderBottom:`1px solid ${C.line}`,padding:mob?"14px 16px":"16px 28px"}}>
      <div style={{maxWidth:1240,margin:"0 auto",display:"flex",gap:14,alignItems:"flex-end",flexWrap:"wrap"}}>
        <div style={{flex:"1 1 240px",minWidth:0}}>
          <Lbl style={{marginBottom:6}}>Pipeline for</Lbl>
          <Sel value={jobId} onChange={e=>{A.setPipelineJob(e.target.value);clear();}} style={{fontWeight:640}}>
            {myJobs.map(j=><option key={j.id} value={j.id}>{j.t} ({A.applications.filter(a=>a.job===j.id).length})</option>)}</Sel></div>
        <Btn kind="outline" size="sm" icon="download" onClick={()=>A.exportApplicants(jobId)}>Export CSV</Btn></div>
      <div style={{maxWidth:1240,margin:"14px auto 0"}}>
        <Tabs items={[{k:"pipeline",label:`Pipeline (${apps.length})`},{k:"filters",label:"Filters"},
          {k:"talent",label:`Talent pool (${reverseCandidates.length})`}]} value={tab} onChange={setTab}/></div>
    </div>

    {tab==="filters"&&<div style={{padding:mob?16:24,maxWidth:1240,margin:"0 auto",width:"100%"}}>
      <Card style={{padding:mob?20:24,borderRadius:16}}>
        <Lbl>Filter this pipeline</Lbl>
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr 1fr",gap:14}}>
          <Field label="Minimum match score">
            <Sel value={f.minScore} onChange={e=>setF({...f,minScore:Number(e.target.value)})}>
              {[0,50,60,70,75,80,85].map(v=><option key={v} value={v}>{v?`${v}+`:"Any"}</option>)}</Sel></Field>
          <Field label="Province"><Sel value={f.prov} onChange={e=>setF({...f,prov:e.target.value})}>
            <option value="">All provinces</option>{PROVS.map(p=><option key={p}>{p}</option>)}</Sel></Field>
          <Field label="Has skill"><Input value={f.skill} onChange={e=>setF({...f,skill:e.target.value})} placeholder="e.g. Red Seal, Forklift"/></Field>
        </div>
        <div style={{marginTop:16,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <Btn kind="primary" onClick={()=>setTab("pipeline")}>Show {apps.length} candidate{apps.length===1?"":"s"}</Btn>
          <Btn kind="ghost" onClick={()=>setF({minScore:0,prov:"",skill:""})}>Reset</Btn></div>
      </Card>
    </div>}

    {tab==="talent"&&<div style={{padding:mob?16:24,maxWidth:1240,margin:"0 auto",width:"100%"}}>
      {!A.can("talentPool")?<Card style={{padding:mob?26:36,borderRadius:20,textAlign:"center",background:"linear-gradient(135deg,#F5F9FF 0%,#EAF2FF 100%)",border:`1px solid ${C.line2}`}}>
        <div style={{width:64,height:64,borderRadius:16,background:C.brand,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px"}}><I n="target" s={30}/></div>
        <div style={{fontSize:mob?20:24,fontWeight:730,color:C.text,letterSpacing:"-.03em",marginBottom:10}}>Talent pool is a Growth feature</div>
        <p style={{fontSize:14.5,color:C.text2,lineHeight:1.65,margin:"0 auto 22px",maxWidth:440}}>See top-matched candidates across NorthHire who haven't applied yet, and invite them directly. Available on the Growth and Enterprise plans.</p>
        <Btn kind="primary" onClick={()=>A.go("pricing")}>Upgrade to Growth</Btn>
      </Card>:<><Card style={{padding:mob?20:26,borderRadius:16,marginBottom:16}}>
        <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:12}}>
          <div style={{width:44,height:44,borderRadius:12,background:C.wash,color:C.brand,display:"flex",alignItems:"center",justifyContent:"center"}}><I n="target" s={22}/></div>
          <div><div style={{fontSize:16,fontWeight:680,color:C.text}}>Talent pool matches</div>
            <div style={{fontSize:13,color:C.text2,marginTop:2}}>Candidates on NorthHire who match this posting but haven't applied yet.</div></div></div>
      </Card>
      {reverseCandidates.length===0
        ? <Empty icon="target" title="No talent pool matches yet" body="As more candidates sign up in this trade, we'll surface strong fits here."/>
        : <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:14}}>
            {reverseCandidates.map(({p,score})=><Card key={p.id} style={{padding:20,borderRadius:16}}>
              <div style={{display:"flex",gap:14,alignItems:"center"}}>
                <SmartPortrait seed={p.seed} size={52}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:15,fontWeight:670,color:C.text}}>{p.name}</div>
                  <div style={{fontSize:13,color:C.text2,marginTop:3}}>{p.title} • {p.years}y • {p.city}</div></div>
                <Ring v={score} size={44}/></div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:14}}>
                {(p.skills||[]).slice(0,4).map(s=><Tag key={s} sm>{s}</Tag>)}
                {(p.skills||[]).length>4&&<Tag sm>+{p.skills.length-4}</Tag>}</div>
              <Btn kind="outline" size="sm" full icon="send" style={{marginTop:14}} onClick={()=>A.inviteToApply(p.id,jobId)}>Invite to apply</Btn>
            </Card>)}</div>}
      </>}
    </div>}

    {tab==="pipeline"&&<>
      {sel.size>0&&<div style={{background:C.brand,color:"#fff",padding:mob?"12px 16px":"12px 28px",display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
        <span style={{fontSize:14,fontWeight:640}}>{sel.size} selected</span>
        <div style={{flex:1}}/>
        <div style={{position:"relative"}}>
          <Btn kind="onDark" size="sm" iconR="chevD" onClick={()=>setBulkMenu(!bulkMenu)}>Move to…</Btn>
          {bulkMenu&&<div style={{position:"absolute",top:"100%",right:0,marginTop:6,background:"#fff",border:`1px solid ${C.line}`,
            borderRadius:12,boxShadow:SH.lg,padding:6,zIndex:20,minWidth:180}}>
            {STAGES.map(s=><button key={s} onClick={()=>runBulk("move",s)} style={{display:"block",width:"100%",textAlign:"left",
              padding:"9px 12px",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:14,color:C.text,borderRadius:8}}
              onMouseEnter={e=>e.currentTarget.style.background=C.bg}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>{s}</button>)}</div>}
        </div>
        <Btn kind="onDark" size="sm" icon="x" onClick={()=>runBulk("reject")}>Reject all</Btn>
        <Btn kind="onDark" size="sm" onClick={clear}>Clear</Btn></div>}
      <div style={{flex:1,overflowX:"auto",padding:mob?14:20}}>
        <div style={{display:"flex",gap:12,minWidth:"max-content",alignItems:"flex-start"}}>
          {STAGES.map(stage=>{const items=apps.filter(a=>a.stage===stage);
            const allSelected=items.length>0&&items.every(a=>sel.has(a.id));
            return <div key={stage} style={{width:mob?236:250,display:"flex",flexDirection:"column",gap:9}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 3px"}}>
                <span style={{fontSize:12,fontWeight:700,color:C.text2,textTransform:"uppercase",letterSpacing:".07em"}}>{stage}</span>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  {items.length>0&&<button onClick={()=>selectStage(stage)} style={{background:"none",border:"none",fontFamily:"inherit",
                    fontSize:11,color:allSelected?C.brand:C.text3,cursor:"pointer",fontWeight:600}}>{allSelected?"clear":"all"}</button>}
                  <span style={{background:C.wash,color:C.brand,border:`1px solid ${C.line2}`,fontSize:11.5,fontWeight:700,
                    minWidth:22,height:22,borderRadius:99,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 7px"}}>{items.length}</span></div></div>
              {items.map((a,i)=>{const u=A.person(a.user); const s=A.scoreCandidate(u,job); const idx=STAGES.indexOf(stage);
                const selected=sel.has(a.id);
                return <div key={a.id} style={{background:"#fff",border:`${selected?2:1}px solid ${selected?C.brand:C.line}`,
                  borderRadius:13,padding:selected?12:13,cursor:"pointer",boxShadow:SH.xs,transition:"all .16s"}}
                  onClick={e=>{if(e.target.closest("[data-nc]"))return; A.openCandidate(a.id);}}
                  onMouseEnter={e=>{if(!selected){e.currentTarget.style.borderColor=C.line2;e.currentTarget.style.transform="translateY(-2px)";}}}
                  onMouseLeave={e=>{if(!selected){e.currentTarget.style.borderColor=C.line;e.currentTarget.style.transform="none";}}}>
                  <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}>
                    <div data-nc onClick={()=>tog(a.id)} style={{width:20,height:20,borderRadius:6,cursor:"pointer",
                      border:`1.5px solid ${selected?C.brand:C.line}`,background:selected?C.brand:"#fff",
                      display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      {selected&&<I n="check" s={12} c="#fff" w={3}/>}</div>
                    <SmartPortrait seed={u.seed} size={32}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13.5,fontWeight:650,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.name}</div>
                      <div style={{fontSize:11.5,color:C.text3,marginTop:1}}>{u.years} yrs • {u.city}</div></div>
                    <Ring v={s} size={32}/></div>
                  <div data-nc style={{display:"flex",gap:6}} onClick={e=>e.stopPropagation()}>
                    {idx>0&&<Btn kind="ghost" size="xs" icon="arrowL" title="Move back" onClick={()=>A.moveApp(a.id,STAGES[idx-1])} style={{flex:1}}/>}
                    {idx<STAGES.length-1&&<Btn kind="outline" size="xs" iconR="arrowR" onClick={()=>A.moveApp(a.id,STAGES[idx+1])} style={{flex:2}}>Advance</Btn>}</div></div>;})}
              {items.length===0&&<div style={{border:`1.5px dashed ${C.line}`,borderRadius:13,padding:"22px 12px",textAlign:"center",fontSize:12.5,color:C.text3}}>Empty</div>}
            </div>;})}</div></div>
    </>}
  </div>;
}


export function EmpCandidate(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [showMsg,setShowMsg]=useState(false); const [msgText,setMsgText]=useState("");
  const [showSched,setShowSched]=useState(false);
  const [ivDate,setIvDate]=useState(""); const [ivTime,setIvTime]=useState(""); const [ivMode,setIvMode]=useState("video"); const [ivNotes,setIvNotes]=useState("");
  const a=A.applications.find(x=>x.id===A.candidateId);
  if(!a) return <Page><Empty icon="users" title="Candidate not found" body="This application may have been withdrawn."
    action={<Btn kind="primary" onClick={()=>A.go("empPipeline")}>Back to pipeline</Btn>}/></Page>;
  const u=A.person(a.user), job=A.job(a.job), s=A.scoreCandidate(u,job), idx=STAGES.indexOf(a.stage);
  const threadMessages=A.messages.filter(m=>(m.from===u.id&&m.to===A.user?.id)||(m.to===u.id&&m.from===A.user?.id)).slice().reverse();
  const upcomingInterviews=A.interviews.filter(iv=>iv.app===a.id&&iv.status==="scheduled");
  return <Page narrow>
    <Card pad={mob?20:26} style={{marginBottom:16}}>
      <div style={{display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
        <SmartPortrait seed={u.seed} size={mob?62:74} radius={18}/>
        <div style={{flex:"1 1 200px",minWidth:0}}>
          <div style={{fontSize:mob?20:23,fontWeight:720,color:C.text,letterSpacing:"-.03em"}}>{u.name}</div>
          <div style={{fontSize:14.5,color:C.text2,marginTop:4}}>{u.title} • {u.years} years • {u.city}, {u.prov}</div>
          <div style={{fontSize:13.5,color:C.text3,marginTop:3}}>{u.email} • {u.phone}</div>
          <div style={{marginTop:10}}><Tag tone={a.stage==="Offer"?"ok":a.stage==="Interview"?"warn":"brand"} sm>{a.stage}</Tag></div></div>
        <Ring v={s} size={62} label="Fit"/></div></Card>
    <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:16,marginBottom:16}}>
      <Card><Lbl>Skills against this role</Lbl>
        <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
          {job.skills.map(k=>{const has=u.skills.some(x=>x.toLowerCase()===k.toLowerCase());
            return <Tag key={k} tone={has?"ok":"neutral"} icon={has?"check":"x"} sm>{k}</Tag>;})}</div>
        <div style={{fontSize:13,color:C.text2,marginTop:12,lineHeight:1.6}}>
          Matches {job.skills.filter(k=>u.skills.some(x=>x.toLowerCase()===k.toLowerCase())).length} of {job.skills.length} required skills.</div></Card>
      <Card><Lbl>Application answers</Lbl>
        {[["Available from",a.avail||"Not stated"],["Expected pay",a.expect?a.expect+payShort(job):"Open to posted range"],
          ["Applied",a.at],["Education",u.edu]].map(([k,v])=>
          <div key={k} style={{display:"flex",justifyContent:"space-between",gap:12,padding:"9px 0",borderBottom:`1px solid ${C.lineSoft}`,fontSize:13.5}}>
            <span style={{color:C.text2}}>{k}</span><span style={{fontWeight:600,color:C.text,textAlign:"right"}}>{v}</span></div>)}</Card></div>
    {a.letter&&<Card style={{marginBottom:16}}><Lbl>Their note</Lbl>
      <p style={{fontSize:14.5,color:C.text2,lineHeight:1.7,margin:0,whiteSpace:"pre-wrap"}}>{a.letter}</p></Card>}
    <Card style={{marginBottom:16}}><Lbl>Move this candidate</Lbl>
      <div style={{display:"flex",gap:9,flexWrap:"wrap"}}>
        {idx>0&&<Btn kind="outline" icon="arrowL" onClick={()=>A.moveApp(a.id,STAGES[idx-1])}>Back to {STAGES[idx-1]}</Btn>}
        {idx<STAGES.length-1&&<Btn kind="primary" iconR="arrowR" onClick={()=>A.moveApp(a.id,STAGES[idx+1])}>Advance to {STAGES[idx+1]}</Btn>}
        {A.can("messages")?<Btn kind="outline" icon="mail" onClick={()=>setShowMsg(true)}>Message</Btn>:<Btn kind="ghost" icon="lock" onClick={()=>A.go("pricing")}>Message (Growth+)</Btn>}
        {A.can("interviews")?<Btn kind="outline" icon="calendar" onClick={()=>setShowSched(true)}>Schedule interview</Btn>:<Btn kind="ghost" icon="lock" onClick={()=>A.go("pricing")}>Schedule (Growth+)</Btn>}
        <Btn kind="dangerSoft" onClick={()=>{A.rejectApp(a.id);A.go("empPipeline");}}>Not a fit</Btn>
        <Btn kind="ghost" onClick={()=>A.go("empPipeline")}>Back to pipeline</Btn></div></Card>

    {threadMessages.length>0&&<Card style={{marginBottom:16}}><Lbl>Message history</Lbl>
      <div style={{display:"flex",flexDirection:"column",gap:10,maxHeight:280,overflowY:"auto"}}>
        {threadMessages.map(m=>{const mine=m.from===A.user?.id;
          return <div key={m.id} style={{display:"flex",justifyContent:mine?"flex-end":"flex-start"}}>
            <div style={{maxWidth:"75%",padding:"10px 14px",borderRadius:12,fontSize:14,lineHeight:1.5,
              background:mine?C.brand:C.bg,color:mine?"#fff":C.text,border:mine?"none":`1px solid ${C.line}`}}>
              {m.text}
              <div style={{fontSize:11,opacity:.7,marginTop:5}}>{new Date(m.at).toLocaleString("en-CA")}</div></div></div>;})}</div></Card>}

    {upcomingInterviews.length>0&&<Card style={{marginBottom:16}}><Lbl>Scheduled interviews</Lbl>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {upcomingInterviews.map(iv=><div key={iv.id} style={{display:"flex",gap:12,alignItems:"center",padding:"12px 14px",background:C.bg,borderRadius:10,border:`1px solid ${C.line}`}}>
          <div style={{width:40,height:40,borderRadius:10,background:C.wash,color:C.brand,display:"flex",alignItems:"center",justifyContent:"center"}}><I n="calendar" s={18}/></div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:640,color:C.text}}>{iv.mode==="video"?"Video call":"On-site interview"} on {iv.when}</div>
            {iv.notes&&<div style={{fontSize:12.5,color:C.text2,marginTop:3}}>{iv.notes}</div>}</div>
          <Btn kind="ghost" size="xs" icon="x" onClick={()=>A.cancelInterview(iv.id)}/></div>)}</div></Card>}

    {showMsg&&<Modal onClose={()=>setShowMsg(false)} title={`Message ${u.name}`}>
      <Field label="Your message" hint={`Sent through NorthHire — ${u.name} sees it on their status page.`}>
        <Area rows={5} value={msgText} onChange={e=>setMsgText(e.target.value)} placeholder="Hi Jean, thanks for applying…"/></Field>
      <div style={{display:"flex",gap:9,justifyContent:"flex-end",marginTop:14}}>
        <Btn kind="ghost" onClick={()=>setShowMsg(false)}>Cancel</Btn>
        <Btn kind="primary" icon="send" disabled={!msgText.trim()} onClick={()=>{A.sendMessage(u.id,job.id,msgText.trim());setMsgText("");setShowMsg(false);}}>Send message</Btn></div></Modal>}

    {showSched&&<Modal onClose={()=>setShowSched(false)} title={`Schedule interview with ${u.name}`}>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Field label="Date"><Input type="date" value={ivDate} onChange={e=>setIvDate(e.target.value)}/></Field>
          <Field label="Time"><Input type="time" value={ivTime} onChange={e=>setIvTime(e.target.value)}/></Field></div>
        <Field label="Format">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
            {[["video","Video call"],["onsite","On-site interview"]].map(([v,l])=>{const on=ivMode===v;
              return <button key={v} onClick={()=>setIvMode(v)} style={{padding:"12px 14px",borderRadius:11,cursor:"pointer",
                fontFamily:"inherit",fontSize:14,fontWeight:on?640:520,border:`1.5px solid ${on?C.brand:C.line}`,
                background:on?C.tint:"#fff",color:on?C.brand:C.text}}>{l}</button>;})}</div></Field>
        <Field label="Notes (optional)" hint="Address, video link, what to bring, who they'll meet.">
          <Area rows={3} value={ivNotes} onChange={e=>setIvNotes(e.target.value)} placeholder="Meet at reception, ask for the site foreman."/></Field>
        <div style={{display:"flex",gap:9,justifyContent:"flex-end"}}>
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
  const Row=({item,type})=>{
    const editable=isAdmin||item.owner===owner;
    return <div style={{display:"flex",gap:14,alignItems:"center",padding:"14px 0",borderBottom:`1px solid ${C.lineSoft}`,flexWrap:"wrap"}}>
      <div style={{width:74,height:52,borderRadius:9,overflow:"hidden",flexShrink:0}}>
        <SmartScene kind={item.scene} tone={item.tone} h={52} seed={item.id.charCodeAt(1)||0}/></div>
      <div style={{flex:"1 1 200px",minWidth:0}}>
        <div style={{fontSize:14.5,fontWeight:640,color:C.text,lineHeight:1.4}}>{item.title}</div>
        <div style={{fontSize:12.5,color:C.text3,marginTop:4,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <span>{item.cat}</span><span>•</span>
          <span>{type==="blog"?`${item.mins} min read`:`${item.hours} h · ${item.price===0?"Free":money(item.price)}`}</span>
          {isAdmin&&<><span>•</span><span>{item.owner==="admin"?"NorthHire":A.emp(item.owner)?.name||item.owner}</span></>}</div></div>
      <Tag tone={item.status==="published"?"ok":item.status==="draft"?"warn":"neutral"} sm>
        {item.status==="published"?"Published":item.status==="draft"?"Draft":"Hidden"}</Tag>
      <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
        <Btn kind="ghost" size="xs" icon="eye" title="Preview"
          onClick={()=>type==="blog"?A.openBlog(item.id):A.openTraining(item.id)}/>
        {editable&&<>
          <Btn kind="outline" size="xs" icon="edit" onClick={()=>type==="blog"?A.editBlog(item.id):A.editTraining(item.id)}>Edit</Btn>
          <Btn kind="ghost" size="xs" onClick={()=>type==="blog"?A.toggleBlogStatus(item.id):A.toggleTrainingStatus(item.id)}>
            {item.status==="published"?"Unpublish":"Publish"}</Btn>
          <Btn kind="ghost" size="xs" icon="trash" title="Delete"
            onClick={()=>type==="blog"?A.deleteBlog(item.id):A.deleteTraining(item.id)}/></>}</div></div>;
  };
  const list=tab==="blogs"?blogs:trainings;
  const allowed=tab==="blogs"?canBlogs:canTrainings;
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
      value={tab} onChange={setTab} style={{marginBottom:18}}/>}
    <Card pad={mob?16:22}>
      {list.length===0
        ? <Empty icon={tab==="blogs"?"book":"cap"} title={`No ${tab==="blogs"?"articles":"trainings"} yet`}
            body={allowed?`Publish your first ${tab==="blogs"?"article":"training"} — it appears on the home page and in the public library.`
              :"Publishing is currently disabled by an administrator."}
            action={allowed?<Btn kind="primary" icon="plus" onClick={()=>tab==="blogs"?A.editBlog("new"):A.editTraining("new")}>
              Create {tab==="blogs"?"article":"training"}</Btn>:null}/>
        : list.map(x=><Row key={x.id} item={x} type={tab==="blogs"?"blog":"training"}/>)}</Card>
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
  const set=(k,v)=>{setD(p=>({...p,[k]:v}));setErr(e=>({...e,[k]:undefined}));};
  const save=(status)=>{const e={};
    if(!d.title.trim())e.title="Title is required";
    if(d.excerpt.trim().length<20)e.excerpt="Write a short summary, at least a sentence";
    if((d.bodyText||"").replace(/<[^>]+>/g,"").trim().length<80)e.bodyText="The article body is too short";
    setErr(e); if(Object.keys(e).length)return;
    const body=[["", d.bodyText]]; /* single HTML chunk; renderers will inject with dangerouslySetInnerHTML */
    A.saveBlog({...d,body,status},isNew);};
  return <Page narrow>
    <H1 sub={isNew?"Published articles appear on the home page and in Career resources":"Editing a published article"}
      action={<Btn kind="ghost" onClick={()=>A.go(A.user.role==="admin"?"admBlogs":"empContent")}>Cancel</Btn>}>
      {isNew?"New article":"Edit article"}</H1>
    <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 300px",gap:18,alignItems:"start"}}>
      <Card pad={mob?20:26}>
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <Field label="Title" required error={err.title}><Input value={d.title} onChange={e=>set("title",e.target.value)}
            placeholder="How to write a Canadian resume" invalid={!!err.title}/></Field>
          <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12}}>
            <Field label="Category" required><Sel value={d.cat} onChange={e=>set("cat",e.target.value)}>
              {["Career Advice","Trades","Healthcare","Transport","Resume","Salary","Industry News","Safety"].map(o=><option key={o}>{o}</option>)}</Sel></Field>
            <Field label="Reading time (minutes)"><Input type="number" value={d.mins} onChange={e=>set("mins",Math.max(1,Number(e.target.value)||1))}/></Field></div>
          <Field label="Summary" required error={err.excerpt} hint="One or two sentences shown on the card and at the top of the article.">
            <Area rows={3} value={d.excerpt} onChange={e=>set("excerpt",e.target.value)} invalid={!!err.excerpt}/></Field>
          <Field label="Article body" required error={err.bodyText}
            hint="Each section: heading on the first line, the paragraph underneath, then a blank line before the next section.">
            <RichText value={d.bodyText} onChange={v=>set("bodyText",v)} rows={14} placeholder="Start writing. Use the toolbar for bold, italics, bullet lists, links..."/></Field>
          <Field label="Author name"><Input value={d.author} onChange={e=>set("author",e.target.value)}/></Field></div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:22,paddingTop:18,borderTop:`1px solid ${C.lineSoft}`,flexWrap:"wrap"}}>
          <Btn kind="outline" onClick={()=>save("draft")}>Save as draft</Btn>
          <Btn kind="primary" icon="check" onClick={()=>save("published")}>Publish</Btn></div></Card>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <Card pad={0} style={{overflow:"hidden"}}>
          <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.lineSoft}`,fontSize:13,fontWeight:650,color:C.text}}>Card preview</div>
          <SmartScene kind={d.scene} tone={d.tone} h={130} seed={d.id.charCodeAt(1)||0}/>
          <div style={{padding:16}}>
            <Tag tone="brand" sm>{d.cat}</Tag>
            <div style={{fontSize:15,fontWeight:660,color:C.text,lineHeight:1.4,margin:"11px 0 8px"}}>{d.title||"Untitled article"}</div>
            <p style={{fontSize:13,color:C.text2,lineHeight:1.6,margin:0}}>{d.excerpt||"Your summary appears here."}</p></div></Card>
        <Card pad={18}><Lbl>Thumbnail artwork</Lbl>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
            {["office","trades","care","road","learn","money","resume","kitchen","warehouse","safety"].map(s=>
              <button key={s} onClick={()=>set("scene",s)} style={{padding:0,border:`2px solid ${d.scene===s?C.brand:C.line}`,
                borderRadius:8,overflow:"hidden",cursor:"pointer",background:"none",lineHeight:0}}>
                <SmartScene kind={s} tone={d.tone} h={40} usePhoto={false}/></button>)}</div>
          <Lbl>Accent colour</Lbl>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {[C.brand,"#B45309","#0F5C8C","#B02A26","#5B3BC4","#07724F","#8F5B05","#2A3852"].map(t=>
              <button key={t} onClick={()=>set("tone",t)} style={{width:30,height:30,borderRadius:8,background:t,
                border:d.tone===t?`3px solid ${C.text}`:`1px solid ${C.line}`,cursor:"pointer"}}/>)}</div></Card></div></div>
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
  const set=(k,v)=>{setD(p=>({...p,[k]:v}));setErr(e=>({...e,[k]:undefined}));};
  const save=(status)=>{const e={};
    if(!d.title.trim())e.title="Title is required";
    const aboutTxt=(d.aboutRich||d.about||"").replace(/<[^>]+>/g,"").trim();
    if(aboutTxt.length<30)e.about="Describe the course in a sentence or two";
    if((d.mods||[]).length<2)e.mods="Add at least two modules";
    if((d.outcomes||[]).length<2)e.outcomes="Add at least two learning outcomes";
    setErr(e); if(Object.keys(e).length)return;
    A.saveTraining({...d,about:aboutTxt,mods:(d.mods||[]).map(m=>m.title||m).filter(Boolean),outcomes:d.outcomes,status},isNew);};

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
    <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 300px",gap:18,alignItems:"start"}}>
      <Card pad={mob?20:26}>
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <Field label="Course title" required error={err.title}><Input value={d.title} onChange={e=>set("title",e.target.value)}
            placeholder="WHMIS 2015 and Workplace Safety" invalid={!!err.title}/></Field>
          <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"repeat(4,1fr)",gap:12}}>
            <Field label="Category"><Sel value={d.cat} onChange={e=>set("cat",e.target.value)}>
              {["Safety","Trades","Healthcare","Transport","Hospitality","Warehouse","Office","Career","Language","Finance"].map(o=><option key={o}>{o}</option>)}</Sel></Field>
            <Field label="Level"><Sel value={d.level} onChange={e=>set("level",e.target.value)}>
              {["Beginner","Intermediate","Advanced"].map(o=><option key={o}>{o}</option>)}</Sel></Field>
            <Field label="Hours"><Input type="number" value={d.hours} onChange={e=>set("hours",Math.max(1,Number(e.target.value)||1))}/></Field>
            <Field label="Price (CAD)"><Input type="number" value={d.price} onChange={e=>set("price",Math.max(0,Number(e.target.value)||0))} suffix={d.price===0?"Free":""}/></Field></div>
          <Field label="About this course" required error={err.about}>
            <RichText value={d.aboutRich||d.about} onChange={v=>set("aboutRich",v)}
              placeholder="Who the course is for and what certificate it leads to." rows={5}/></Field>

          <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12}}>
            <Field label="Provider name"><Input value={d.provider} onChange={e=>set("provider",e.target.value)}
              placeholder="e.g. NorthHire Learning"/></Field>
            <Field label="Trainer / guest speaker" hint="Name of the person delivering the course.">
              <Input value={d.trainerName} onChange={e=>set("trainerName",e.target.value)} placeholder="e.g. Dr. Jane Smith, CRSP"/></Field>
          </div>

          <Field label="Trainer bio" hint="Short paragraph about the trainer's background.">
            <Area rows={3} value={d.trainerBio} onChange={e=>set("trainerBio",e.target.value)}
              placeholder="e.g. 15 years in industrial safety with the Alberta Construction Safety Association..."/></Field>

          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div><div style={{fontSize:13,fontWeight:640,color:C.text}}>Course modules</div>
                <div style={{fontSize:12,color:C.text3,marginTop:2}}>Add each lesson or section, in order.</div></div>
              <Btn kind="outline" size="sm" icon="plus" onClick={addMod}>Add module</Btn>
            </div>
            {err.mods&&<div style={{fontSize:12.5,color:C.red,marginBottom:8}}>{err.mods}</div>}
            {(d.mods||[]).length===0
              ? <div style={{padding:20,background:C.bg,border:`1px dashed ${C.line}`,borderRadius:10,textAlign:"center",fontSize:13,color:C.text3}}>No modules yet — add your first.</div>
              : <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {(d.mods||[]).map((m,i)=><div key={m.id} style={{border:`1px solid ${C.line}`,borderRadius:11,padding:12,background:"#fff"}}>
                    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
                      <div style={{width:24,height:24,borderRadius:99,background:C.wash,color:C.brand,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div>
                      <Input value={m.title} onChange={e=>updMod(m.id,{title:e.target.value})} placeholder="Module title"/>
                      <div style={{display:"flex",gap:2}}>
                        <Btn kind="ghost" size="xs" onClick={()=>moveMod(m.id,-1)} disabled={i===0}>↑</Btn>
                        <Btn kind="ghost" size="xs" onClick={()=>moveMod(m.id,1)} disabled={i===d.mods.length-1}>↓</Btn>
                        <Btn kind="ghost" size="xs" icon="trash" onClick={()=>delMod(m.id)}/>
                      </div>
                    </div>
                    <Input value={m.videoUrl||""} onChange={e=>updMod(m.id,{videoUrl:e.target.value})}
                      placeholder="Optional video URL (YouTube, Vimeo, etc.)" icon="play"/>
                    <div style={{marginTop:8}}>
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
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div><div style={{fontSize:13,fontWeight:640,color:C.text}}>In-training assessment</div>
                <div style={{fontSize:12,color:C.text3,marginTop:2}}>Optional multiple-choice test to certify learners.</div></div>
              <Btn kind="outline" size="sm" icon="plus" onClick={addTest}>Add question</Btn>
            </div>
            {(d.tests||[]).length===0
              ? <div style={{padding:20,background:C.bg,border:`1px dashed ${C.line}`,borderRadius:10,textAlign:"center",fontSize:13,color:C.text3}}>No test questions yet. Add some to require certification.</div>
              : <>
                <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12,marginBottom:10}}>
                  <Field label="Passing score (%)"><Input type="number" min="1" max="100" value={d.passingScore}
                    onChange={e=>set("passingScore",Math.min(100,Math.max(1,Number(e.target.value)||70)))}/></Field>
                  <Field label="Randomize question order">
                    <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 0"}}>
                      <Switch on={d.randomize} onChange={v=>set("randomize",v)}/>
                      <span style={{fontSize:13,color:C.text2}}>{d.randomize?"On":"Off"}</span>
                    </div></Field>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {(d.tests||[]).map((t,i)=><div key={t.id} style={{border:`1px solid ${C.line}`,borderRadius:11,padding:12,background:"#fff"}}>
                    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}>
                      <div style={{width:24,height:24,borderRadius:99,background:C.warnBg,color:C.warn,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>Q{i+1}</div>
                      <Input value={t.question} onChange={e=>updTest(t.id,{question:e.target.value})} placeholder="Question text"/>
                      <Btn kind="ghost" size="xs" icon="trash" onClick={()=>delTest(t.id)}/>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {t.options.map((o,j)=><label key={j} style={{display:"flex",gap:8,alignItems:"center",cursor:"pointer"}}>
                        <input type="radio" name={`ans_${t.id}`} checked={t.answerIdx===j} onChange={()=>updTest(t.id,{answerIdx:j})}/>
                        <Input value={o} onChange={e=>updTest(t.id,{options:t.options.map((x,k)=>k===j?e.target.value:x)})} placeholder={`Option ${j+1}`}/>
                      </label>)}
                    </div>
                  </div>)}
                </div>
              </>}
          </div>
          </div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:22,paddingTop:18,borderTop:`1px solid ${C.lineSoft}`,flexWrap:"wrap"}}>
          <Btn kind="outline" onClick={()=>save("draft")}>Save as draft</Btn>
          <Btn kind="primary" icon="check" onClick={()=>save("published")}>Publish</Btn></div></Card>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <Card pad={0} style={{overflow:"hidden"}}>
          <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.lineSoft}`,fontSize:13,fontWeight:650,color:C.text}}>Card preview</div>
          <div style={{position:"relative"}}><SmartScene kind={d.scene} tone={d.tone} h={120} seed={d.id.charCodeAt(1)||0}/>
            <div style={{position:"absolute",top:10,left:10}}><Tag tone={d.price===0?"ok":"dark"} sm>{d.price===0?"Free":money(d.price)}</Tag></div></div>
          <div style={{padding:16}}>
            <div style={{display:"flex",gap:7,marginBottom:9}}><Tag sm>{d.level}</Tag><Tag sm icon="clock">{d.hours} h</Tag></div>
            <div style={{fontSize:15,fontWeight:660,color:C.text,lineHeight:1.4}}>{d.title||"Untitled training"}</div></div></Card>
        <Card pad={18}><Lbl>Thumbnail artwork</Lbl>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
            {["learn","safety","trades","care","road","kitchen","warehouse","office","money","resume"].map(s=>
              <button key={s} onClick={()=>set("scene",s)} style={{padding:0,border:`2px solid ${d.scene===s?C.brand:C.line}`,
                borderRadius:8,overflow:"hidden",cursor:"pointer",background:"none",lineHeight:0}}>
                <SmartScene kind={s} tone={d.tone} h={40} usePhoto={false}/></button>)}</div>
          <Lbl>Accent colour</Lbl>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {[C.brand,"#B45309","#0F5C8C","#B02A26","#5B3BC4","#07724F","#8F5B05","#2A3852"].map(t=>
              <button key={t} onClick={()=>set("tone",t)} style={{width:30,height:30,borderRadius:8,background:t,
                border:d.tone===t?`3px solid ${C.text}`:`1px solid ${C.line}`,cursor:"pointer"}}/>)}</div></Card></div></div>
  </Page>;
}

export function EmpCompany(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [d,setD]=useState({...A.company});
  useEffect(()=>setD({...A.company}),[A.company]);
  const dirty=JSON.stringify(d)!==JSON.stringify(A.company);
  const set=(k,v)=>setD(p=>({...p,[k]:v}));
  return <Page narrow>
    <H1 sub="What candidates see on your company page">Company profile</H1>
    <Card pad={mob?20:26}>
      <div style={{display:"flex",gap:16,alignItems:"center",marginBottom:22,flexWrap:"wrap"}}>
        <SmartLogo e={d} size={72} radius={18}/>
        <div style={{flex:1,minWidth:180}}>
          <Lbl>Logo mark</Lbl>
          <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:12}}>
            {Object.keys(MARKS).map(k=><button key={k} onClick={()=>set("mark",k)} style={{padding:0,border:`2px solid ${d.mark===k?C.brand:C.line}`,
              borderRadius:10,overflow:"hidden",cursor:"pointer",background:"none",lineHeight:0}}>
              <Mark kind={k} a={d.a} b={d.b} size={38}/></button>)}</div>
          <Lbl>Brand colour</Lbl>
          <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
            {["#005CCC","#B45309","#0F5C8C","#B02A26","#0B6B3A","#5B2E8C","#28404F","#A14A18"].map(c=>
              <button key={c} onClick={()=>set("a",c)} style={{width:28,height:28,borderRadius:8,background:c,
                border:d.a===c?`3px solid ${C.text}`:`1px solid ${C.line}`,cursor:"pointer"}}/>)}</div></div></div>
      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:14}}>
        <Field label="Company name" required><Input value={d.name} onChange={e=>set("name",e.target.value)}/></Field>
        <Field label="Industry"><Input value={d.industry} onChange={e=>set("industry",e.target.value)}/></Field>
        <Field label="City"><Input icon="pin" value={d.city} onChange={e=>set("city",e.target.value)}/></Field>
        <Field label="Province"><Sel value={PROVS.find(p=>PCODE[p]===d.prov)||"Ontario"} onChange={e=>set("prov",PCODE[e.target.value])}>
          {PROVS.map(p=><option key={p}>{p}</option>)}</Sel></Field>
        <Field label="Company size"><Sel value={d.size} onChange={e=>set("size",e.target.value)}>
          {["1-50","51-200","201-1,000","1,000-5,000","5,000+","10,000+"].map(o=><option key={o}>{o}</option>)}</Sel></Field>
        <Field label="Founded"><Input type="number" value={d.founded} onChange={e=>set("founded",Number(e.target.value)||2000)}/></Field>
        <Field label="Website" style={{gridColumn:mob?"auto":"span 2"}}><Input icon="globe" value={d.site} onChange={e=>set("site",e.target.value)}/></Field>
        <Field label="About the company" style={{gridColumn:mob?"auto":"span 2"}} hint="Two or three sentences shown on your public page and on every listing.">
          <Area rows={5} value={d.about} onChange={e=>set("about",e.target.value)}/></Field></div>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:22,paddingTop:18,borderTop:`1px solid ${C.lineSoft}`}}>
        {dirty&&<Btn kind="ghost" onClick={()=>setD({...A.company})}>Discard</Btn>}
        <Btn kind="primary" icon="check" disabled={!dirty} onClick={()=>A.saveCompany(d)}>{dirty?"Save changes":"Saved"}</Btn></div></Card>
  </Page>;
}

export function EmpBilling(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const live=A.jobs.filter(j=>j.e===A.company.id&&j.status==="live").length;
  const plan=A.company.plan||"Free";
  const limit=A.PLANS[plan]?.jobs??1;
  const [showCard,setShowCard]=useState(false);
  const [card,setCard]=useState({name:"",number:"",exp:"",cvc:""});
  const [cardErr,setCardErr]=useState({});
  const detectBrand=n=>{const s=n.replace(/\s/g,"");
    if(/^4/.test(s))return "Visa"; if(/^5[1-5]/.test(s))return "Mastercard";
    if(/^3[47]/.test(s))return "Amex"; if(/^6(?:011|5)/.test(s))return "Discover"; return "Card";};
  const luhnOK=n=>{const s=n.replace(/\D/g,""); if(s.length<13||s.length>19)return false;
    let sum=0,dbl=false; for(let i=s.length-1;i>=0;i--){let d=+s[i]; if(dbl){d*=2;if(d>9)d-=9;} sum+=d; dbl=!dbl;} return sum%10===0;};
  const submitCard=()=>{const e={};
    if(!card.name.trim())e.name="Cardholder name required";
    if(!luhnOK(card.number))e.number="Enter a valid card number";
    if(!/^\d{2}\/\d{2}$/.test(card.exp))e.exp="MM/YY format";
    if(!/^\d{3,4}$/.test(card.cvc))e.cvc="3 or 4 digits";
    setCardErr(e); if(Object.keys(e).length)return;
    A.addPaymentMethod({...card,brand:detectBrand(card.number)});
    setCard({name:"",number:"",exp:"",cvc:""}); setShowCard(false);};
  const fmtNumber=v=>v.replace(/\D/g,"").slice(0,19).match(/.{1,4}/g)?.join(" ")||"";
  const fmtExp=v=>{const s=v.replace(/\D/g,"").slice(0,4); return s.length>2?`${s.slice(0,2)}/${s.slice(2)}`:s;};
  return <Page narrow>
    <H1 sub="Your subscription, usage and invoices">Billing</H1>
    <Card pad={mob?20:26} style={{marginBottom:16,background:C.ink,borderColor:C.ink}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:16,flexWrap:"wrap",color:"#fff"}}>
        <div style={{flex:"1 1 240px"}}>
          <Tag tone="onDark">Current plan</Tag>
          <div style={{fontSize:26,fontWeight:730,letterSpacing:"-.035em",margin:"12px 0 6px"}}>{plan} — {A.PLANS[plan]?.price===0?"Free forever":`$${A.PLANS[plan]?.price}/month`}</div>
          <div style={{fontSize:14,color:"rgba(255,255,255,.55)"}}>Renews 1 September 2026 • {live} of {limit===Infinity?"unlimited":limit} job slots in use</div>
          <div style={{marginTop:16,maxWidth:300}}><Bar v={limit===Infinity?100:(live/limit)*100} tone="#4ADE80"/></div></div>
        <div style={{display:"flex",gap:9,flexWrap:"wrap",alignItems:"flex-start"}}>
          <Btn kind="onDark" onClick={()=>A.go("pricing")}>Change plan</Btn></div></div></Card>

    <Card style={{marginBottom:16,borderRadius:20}}><H2 action={<Btn kind="outline" size="sm" icon="plus" onClick={()=>setShowCard(true)}>Add card</Btn>}>Payment methods</H2>
      {A.paymentMethods.length===0
        ? <div style={{padding:"18px 0",textAlign:"center"}}>
            <div style={{fontSize:14,color:C.text3,marginBottom:12}}>No payment method saved yet.</div>
            <Btn kind="primary" icon="plus" onClick={()=>setShowCard(true)}>Add a card</Btn></div>
        : <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {A.paymentMethods.map(pm=><div key={pm.id} style={{display:"flex",gap:14,alignItems:"center",padding:"14px 16px",background:C.bg,borderRadius:12,border:`1px solid ${C.line}`}}>
              <div style={{width:44,height:32,borderRadius:6,background:pm.brand==="Visa"?"#1A1F71":pm.brand==="Mastercard"?"#EB001B":pm.brand==="Amex"?"#006FCF":C.ink,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,letterSpacing:".05em",flexShrink:0}}>{pm.brand.toUpperCase().slice(0,4)}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:650,color:C.text}}>{pm.brand} {pm.masked}</div>
                <div style={{fontSize:12.5,color:C.text3,marginTop:2}}>{pm.name} • Exp {pm.exp}</div></div>
              {pm.default&&<Tag tone="brand" sm>Default</Tag>}
              {!pm.default&&<Btn kind="ghost" size="xs" onClick={()=>A.setDefaultPayment(pm.id)}>Set default</Btn>}
              <Btn kind="ghost" size="xs" icon="trash" onClick={()=>A.removePaymentMethod(pm.id)}/></div>)}</div>}
    </Card>

    {showCard&&<Modal onClose={()=>{setShowCard(false);setCardErr({});}} title="Add a payment method">
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <Banner tone="brand" icon="shield" title="Test-mode form">Card details are validated (Luhn check) and stored locally. Real charges would flow through Stripe.</Banner>
        <Field label="Cardholder name" required error={cardErr.name}><Input value={card.name} onChange={e=>{setCard({...card,name:e.target.value});setCardErr(x=>({...x,name:undefined}));}} placeholder="Jean Tremblay"/></Field>
        <Field label="Card number" required error={cardErr.number} hint="Try 4242 4242 4242 4242 for testing.">
          <Input value={card.number} onChange={e=>{setCard({...card,number:fmtNumber(e.target.value)});setCardErr(x=>({...x,number:undefined}));}} placeholder="1234 5678 9012 3456" style={{fontFamily:"ui-monospace,monospace",letterSpacing:".08em"}}/></Field>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Field label="Expiry" required error={cardErr.exp}><Input value={card.exp} onChange={e=>{setCard({...card,exp:fmtExp(e.target.value)});setCardErr(x=>({...x,exp:undefined}));}} placeholder="MM/YY"/></Field>
          <Field label="CVC" required error={cardErr.cvc}><Input type="password" value={card.cvc} onChange={e=>{setCard({...card,cvc:e.target.value.replace(/\D/g,"").slice(0,4)});setCardErr(x=>({...x,cvc:undefined}));}} placeholder="123"/></Field>
        </div>
        <div style={{display:"flex",gap:9,justifyContent:"flex-end",marginTop:6}}>
          <Btn kind="ghost" onClick={()=>{setShowCard(false);setCardErr({});}}>Cancel</Btn>
          <Btn kind="primary" icon="check" onClick={submitCard}>Add card</Btn></div></div></Modal>}

    <Card style={{borderRadius:20}}><H2>Invoices</H2>
      {[["INV-2026-08","1 Aug 2026",149],["INV-2026-07","1 Jul 2026",149],["INV-2026-06","1 Jun 2026",149],["INV-2026-05","1 May 2026",49]].map(([id,date,amt])=>
        <div key={id} style={{display:"flex",alignItems:"center",gap:14,padding:"13px 0",borderBottom:`1px solid ${C.lineSoft}`,flexWrap:"wrap"}}>
          <div style={{flex:"1 1 140px",minWidth:0}}>
            <div style={{fontSize:14,fontWeight:640,color:C.text}}>{id}</div>
            <div style={{fontSize:12.5,color:C.text3,marginTop:2}}>{date}</div></div>
          <div style={{fontSize:14.5,fontWeight:650,color:C.text}}>${amt}.00</div>
          <Tag tone="ok" sm icon="check">Paid</Tag>
          <Btn kind="ghost" size="xs" icon="download" onClick={()=>A.printInvoice(id,date,amt)}>PDF</Btn></div>)}</Card>
  </Page>;
}

export function EmpAnalyticsPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const stats=A.employerAnalytics(); if(!stats) return <Page><Empty icon="activity" title="No data" body="Post a job first."/></Page>;
  const pad=mob?"44px 16px":"72px 32px";
  return <div style={{background:"#fff",minHeight:"100%"}}>
    <section style={{padding:pad,background:"#fff",borderBottom:`1px solid ${C.lineSoft}`}}>
      <div style={{maxWidth:1120,margin:"0 auto"}}>
        <Tag tone="brand" icon="activity">Analytics</Tag>
        <h1 style={{fontSize:mob?32:52,fontWeight:770,letterSpacing:"-.045em",color:C.text,margin:"18px 0 12px",lineHeight:1.08}}>How your hiring is doing.</h1>
        <p style={{fontSize:mob?16:19,color:C.text2,lineHeight:1.55,margin:0,maxWidth:560}}>Live numbers from your postings.</p></div>
    </section>
    <section style={{padding:mob?"32px 16px 56px":"48px 32px 96px",background:C.bg}}>
      <div style={{maxWidth:1120,margin:"0 auto"}}>
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"repeat(4,1fr)",gap:14,marginBottom:24}}>
          <Stat label="Live jobs" value={stats.liveJobs} icon="briefcase"/>
          <Stat label="Total views" value={stats.totalViews.toLocaleString()} icon="eye"/>
          <Stat label="Applications" value={stats.totalApps} icon="send"/>
          <Stat label="View → apply" value={`${stats.conversion}%`} icon="target" tone={C.brand}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1.2fr 1fr",gap:16}}>
          <Card pad={mob?24:32} style={{borderRadius:20}}>
            <Lbl>Pipeline breakdown</Lbl>
            {stats.byStage.map(({stage,count})=>{const max=Math.max(...stats.byStage.map(s=>s.count),1);
              const pct=Math.round((count/max)*100);
              return <div key={stage} style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:13.5,marginBottom:6}}>
                  <span style={{color:C.text}}>{stage}</span><span style={{fontWeight:640,color:C.text2}}>{count}</span></div>
                <div style={{height:8,background:C.bg,borderRadius:99,overflow:"hidden"}}>
                  <div style={{width:`${pct}%`,height:"100%",background:stage==="Offer"?C.ok:stage==="Interview"?C.warn:C.brand,transition:"width .3s"}}/></div></div>;})}</Card>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <Card pad={mob?24:32} style={{borderRadius:20}}>
              <Lbl>Average candidate match</Lbl>
              <div style={{display:"flex",alignItems:"center",gap:20,marginTop:4}}>
                <Ring v={stats.avgScore} size={90}/>
                <div><div style={{fontSize:14,color:C.text2,lineHeight:1.55}}>Across all applicants who applied to your jobs.</div>
                  <div style={{fontSize:12.5,color:C.text3,marginTop:8}}>Above 75 is strong; publish honest requirements to raise this.</div></div></div></Card>
            {stats.topJob&&<Card pad={mob?24:32} style={{borderRadius:20}}>
              <Lbl>Top performing role</Lbl>
              <div style={{fontSize:15.5,fontWeight:670,color:C.text,letterSpacing:"-.02em",marginBottom:6}}>{stats.topJob.j.t}</div>
              <div style={{fontSize:13,color:C.text2,marginBottom:14}}>{stats.topJob.apps} applicants • {stats.topJob.j.views.toLocaleString()} views</div>
              <Btn kind="outline" size="sm" onClick={()=>{A.setPipelineJob(stats.topJob.j.id);A.go("empPipeline");}}>Open pipeline</Btn></Card>}
          </div>
        </div>
      </div>
    </section>
  </div>;
}
