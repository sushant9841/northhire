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
  return <div style={{background:C.bg,minHeight:"100%"}}>
    <div style={{background:"#fff",borderBottom:`1px solid ${C.line}`}}>
      <div style={{maxWidth:760,margin:"0 auto",padding:mob?"16px 16px":"20px 24px"}}>
        <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:18}}>
          <EmpMark e={e} size={42} radius={11}/>
          <div style={{minWidth:0}}>
            <div style={{fontSize:15,fontWeight:660,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{job.t}</div>
            <div style={{fontSize:13,color:C.text2,marginTop:2}}>{e.name} • {job.city}, {job.prov}</div></div></div>
        <div style={{display:"flex",alignItems:"center"}}>
          {steps.map((s,i)=><div key={s} style={{display:"flex",alignItems:"center",flex:i<2?1:"0 0 auto",minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
              <div style={{width:26,height:26,borderRadius:99,display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:12,fontWeight:700,flexShrink:0,transition:"all .25s",
                background:step>i+1?C.ok:step===i+1?C.brand:C.lineSoft,color:step>=i+1?"#fff":C.text3}}>
                {step>i+1?<I n="check" s={13} c="#fff" w={3}/>:i+1}</div>
              {!mob&&<span style={{fontSize:13,fontWeight:step===i+1?650:500,color:step===i+1?C.text:C.text3,whiteSpace:"nowrap"}}>{s}</span>}</div>
            {i<2&&<div style={{flex:1,height:2,background:step>i+1?C.ok:C.lineSoft,margin:"0 10px",borderRadius:99,minWidth:14,transition:"background .3s"}}/>}
          </div>)}</div></div></div>
    <div style={{maxWidth:760,margin:"0 auto",padding:mob?"18px 16px 30px":"26px 24px 46px"}}>
      <div key={step} style={{animation:"slideIn .28s cubic-bezier(.22,.68,.35,1) both"}}>{children}</div>
      <div style={{display:"flex",gap:10,justifyContent:"space-between",marginTop:22}}>
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
    <div style={{display:"flex",alignItems:"center",gap:12,border:`1px solid ${C.line}`,borderRadius:11,padding:"13px 15px"}}>
      <div style={{width:36,height:36,borderRadius:9,background:C.wash,color:C.brand,display:"flex",alignItems:"center",justifyContent:"center"}}><I n="file" s={18}/></div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:14,fontWeight:620,color:C.text}}>{active?.name||"No CV selected"}</div>
        <div style={{fontSize:12.5,color:C.text3,marginTop:2}}>{active?`${CV_TEMPLATES.find(t=>t.id===active.template)?.name||"Standard"} template • updated ${active.updated||"—"}`:""}</div>
      </div>
      <Btn kind="ghost" size="sm" onClick={()=>setOpen(true)}>Change</Btn>
    </div>

    {open&&<Modal onClose={()=>setOpen(false)} title="Choose a CV to send">
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
        {myCvs.map(cv=>{const isActive=activeId===cv.id;
          return <button key={cv.id} onClick={()=>setActive(cv.id)}
            style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",background:isActive?C.tint:"#fff",
              border:`1.5px solid ${isActive?C.brand:C.line}`,borderRadius:12,cursor:"pointer",fontFamily:"inherit",textAlign:"left",transition:"all .16s"}}>
            <div style={{width:36,height:36,borderRadius:9,background:isActive?C.brand:C.wash,color:isActive?"#fff":C.brand,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><I n="file" s={18}/></div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:660,color:C.text}}>{cv.name}</div>
              <div style={{fontSize:12,color:C.text3,marginTop:2}}>{CV_TEMPLATES.find(t=>t.id===cv.template)?.name||"Standard"} template • {cv.updated||"just now"}</div>
            </div>
            {isActive&&<Tag tone="brand" sm icon="check">Selected</Tag>}
          </button>;})}
      </div>
      <div style={{padding:14,background:C.bg,borderRadius:11,display:"flex",gap:12,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap"}}>
        <div>
          <div style={{fontSize:13,fontWeight:600,color:C.text}}>Need a different CV?</div>
          <div style={{fontSize:12,color:C.text3,marginTop:2}}>You can have up to 5 CVs for different job types.</div>
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
      <div style={{display:"flex",gap:14,alignItems:"center",background:C.tint,border:`1px solid ${C.line2}`,borderRadius:13,padding:16,marginBottom:18}}>
        <SmartPortrait seed={u.seed??0} size={54} radius={13}/>
        <div style={{minWidth:0,flex:1}}>
          <div style={{fontSize:15.5,fontWeight:660,color:C.text}}>{u.name}</div>
          <div style={{fontSize:13,color:C.text2,marginTop:3}}>{u.title} • {u.city}, {u.prov}</div>
          <div style={{fontSize:13,color:C.text2,marginTop:2}}>{u.email} • {u.phone}</div></div>
        <Btn kind="outline" size="sm" icon="edit" onClick={()=>A.go("profile")}>Edit</Btn></div>
      <div style={{marginBottom:18}}>
        <Lbl>Attached CV</Lbl>
        <_CvPicker/>
      </div>
      {(job.mustHave||[]).length>0&&(()=>{
        const mustMissing=job.mustHave.filter(s=>!(u.skills||[]).some(x=>x.toLowerCase()===s.toLowerCase()));
        const mustPresent=job.mustHave.filter(s=>(u.skills||[]).some(x=>x.toLowerCase()===s.toLowerCase()));
        return <div style={{marginBottom:18}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <Lbl style={{margin:0}}>Must-have skills</Lbl>
            <Tag tone={mustMissing.length===0?"ok":"warn"} sm>{mustPresent.length} of {job.mustHave.length}</Tag>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
            {job.mustHave.map(s=>{const mine=(u.skills||[]).some(x=>x.toLowerCase()===s.toLowerCase());
              return <Tag key={s} tone={mine?"ok":"danger"} icon={mine?"check":"alert"}>{s}</Tag>;})}
          </div>
          {mustMissing.length>0&&<Banner tone="warn" icon="alert" title="You are missing some must-have skills" style={{marginTop:11}}
            action={<Btn kind="outline" size="sm" onClick={()=>A.go("profile")}>Add to profile</Btn>}>
            The employer flagged these as required: <strong>{mustMissing.join(", ")}</strong>. You can still apply, but add them to your profile first if you actually have them.
          </Banner>}
        </div>;})()}
      <div style={{marginBottom:18}}>
        <Lbl>Nice-to-have skills</Lbl>
        <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
          {job.skills.map(s=>{const mine=(u.skills||[]).some(x=>x.toLowerCase()===s.toLowerCase());
            return <Tag key={s} tone={mine?"ok":"neutral"} icon={mine?"check":undefined}>{s}</Tag>;})}</div>
        {missing.length>0&&<div style={{fontSize:13,color:C.text2,marginTop:11,lineHeight:1.6}}>
          Bonus if you have {missing.slice(0,3).join(", ")}. Add them to your profile so the employer sees them.</div>}</div>
      <Banner tone="neutral" icon="shield" title="How your data is used">
        {e.name} receives your profile, CV and answers for this application only. You can withdraw at any time from My Status, in line with PIPEDA.</Banner>
    </Card></ApplyShell>;
}
export function Apply2(){
  const A=use(); const job=A.job(A.applyDraft.job); if(!job) return null;
  const d=A.applyDraft; const set=(k,v)=>A.setApplyDraft({...d,[k]:v});
  return <ApplyShell step={2} job={job} onBack={()=>A.go("apply1")} onNext={()=>A.go("apply3")} nextLabel="Review application">
    <Card pad={22}>
      <H2 sub="Three quick questions the employer asked for">A few questions</H2>
      <div style={{display:"flex",flexDirection:"column",gap:20}}>
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
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {["Yes","Close to it"].map(o=><button key={o} onClick={()=>set("meets",o)} style={{padding:"12px",borderRadius:10,
                cursor:"pointer",fontFamily:"inherit",fontSize:14,fontWeight:d.meets===o?650:520,
                border:`1.5px solid ${d.meets===o?C.brand:C.line}`,background:d.meets===o?C.tint:"#fff",
                color:d.meets===o?C.brand:C.text,transition:"all .16s"}}>{o}</button>)}</div></Field>}
      </div></Card></ApplyShell>;
}
export function Apply3(){
  const A=use(); const job=A.job(A.applyDraft.job); if(!job) return null;
  const e=A.emp(job.e); const d=A.applyDraft; const u=A.user;
  const rows=[["Position",job.t],["Employer",e.name],["Location",`${job.city}, ${job.prov} • ${job.mode}`],
    ["Posted pay",`${pay(job)} ${payUnit(job)}`],["Applicant",u.name],["Contact",`${u.email} • ${u.phone}`],
    ["CV",A.defaultCv?A.defaultCv.name:"None attached"],["Available from",d.avail],
    ["Expected pay",d.expect?`${d.expect}${payShort(job)}`:"Open to posted range"],
    ["Note",d.letter.trim()?`${d.letter.trim().split(/\s+/).length} words`:"Not included"]];
  return <ApplyShell step={3} job={job} onBack={()=>A.go("apply2")} onNext={()=>A.submitApply()} nextLabel="Send application">
    <Card pad={22}>
      <H2 sub="Check everything, then send">Review your application</H2>
      <div style={{border:`1px solid ${C.line}`,borderRadius:13,overflow:"hidden",marginBottom:16}}>
        {rows.map(([k,v],i)=><div key={k} style={{display:"flex",justifyContent:"space-between",gap:16,padding:"12px 15px",
          borderBottom:i<rows.length-1?`1px solid ${C.lineSoft}`:"none",fontSize:13.5,background:i%2?C.bg:"#fff"}}>
          <span style={{color:C.text2,flexShrink:0}}>{k}</span>
          <span style={{fontWeight:600,color:C.text,textAlign:"right"}}>{v}</span></div>)}</div>
      {d.letter.trim()&&<div style={{marginBottom:16}}>
        <Lbl>Your note</Lbl>
        <div style={{background:C.bg,border:`1px solid ${C.line}`,borderRadius:11,padding:14,fontSize:14,
          color:C.text2,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{d.letter}</div></div>}
      <Banner tone="brand" icon="sparkle" title="What happens next">
        Your application goes straight into {e.name}'s pipeline. You will see every stage change in My Status, and get a notification when they review it.</Banner>
    </Card></ApplyShell>;
}
export function ApplyDone(){
  const A=use(); const job=A.job(A.applyDraft.job);
  const e=job?A.emp(job.e):null;
  const more=A.jobs.filter(j=>j.status==="live"&&j.cat===job?.cat&&j.id!==job?.id).slice(0,3);
  return <Page narrow>
    <div style={{textAlign:"center",padding:"20px 0 8px",animation:"rise .4s ease both"}}>
      <div style={{width:76,height:76,borderRadius:99,background:C.okBg,border:`2px solid ${C.okLn}`,display:"flex",
        alignItems:"center",justifyContent:"center",margin:"0 auto 20px",animation:"pop .45s cubic-bezier(.22,.68,.35,1) both"}}>
        <I n="check" s={38} c={C.ok} w={2.6}/></div>
      <h1 style={{fontSize:26,fontWeight:730,letterSpacing:"-.035em",color:C.text,margin:"0 0 10px"}}>Application sent</h1>
      <p style={{fontSize:15.5,color:C.text2,lineHeight:1.65,margin:"0 auto 26px",maxWidth:440}}>
        {e?<>Your application for <strong style={{color:C.text}}>{job.t}</strong> is now with {e.name}. You will be notified the moment they review it.</>:"Your application has been submitted."}</p>
      <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap",marginBottom:32}}>
        <Btn kind="primary" icon="activity" onClick={()=>A.go("status")}>Track in My Status</Btn>
        <Btn kind="outline" icon="search" onClick={()=>A.go("search")}>Keep searching</Btn></div></div>
    {more.length>0&&<><H2 sub="Other openings in the same field">Similar jobs</H2>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>{more.map((j,i)=><JobCard key={j.id} job={j} delay={i*0.05}/>)}</div></>}
  </Page>;
}
