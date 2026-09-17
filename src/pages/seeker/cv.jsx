import { useState, useEffect, useRef } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C, FONT, SH } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn, Tag, Card, Input, Field, Banner, H2, Empty, Tabs, SmartPortrait, RichText, Page, ConfirmDialog, Tooltip, HERO_TIGHT } from "../../design/primitives.jsx";
import { uid } from "../../helpers/utils.js";
import { sanitizeHtml } from "../../helpers/sanitize.js";
import { CV_TEMPLATES } from "../../store/seed/constants.js";
import { useTranslation } from "../../i18n/i18n.jsx";

/* CV_TEMPLATES ids are canonical (stored on each cv.template) - only the displayed name/desc
   are translated, via this lookup keyed by id. */
const CV_TEMPLATE_KEY={classic:["templateClassicName","templateClassicDesc"],modern:["templateModernName","templateModernDesc"],
  compact:["templateCompactName","templateCompactDesc"],executive:["templateExecutiveName","templateExecutiveDesc"],
  "skills-first":["templateSkillsFirstName","templateSkillsFirstDesc"]};
export const cvTemplateName=(t,id)=>t(`seeker.cv.${CV_TEMPLATE_KEY[id]?.[0]||"templateClassicName"}`);

/* Design tab explicitly recommends fitting the CV on one page, but the rich-text fields gave no
   feedback on how much is being written - a rough word count is enough guidance without needing
   real pagination logic. ~120 words is a reasonable summary/bullet budget before a section alone
   risks pushing a one-page CV to two. */
const _wordCount=html=>(html||"").replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").trim().split(/\s+/).filter(Boolean).length;
function _WordCountHint({html,budget=120}){
  const {t}=useTranslation();
  const n=_wordCount(html);
  return <div className={`text-xs mt-1.5 text-right ${n>budget?"text-warn":"text-text-3"}`}>{t(n===1?"seeker.cv.wordCountOne":"seeker.cv.wordCountOther",{count:n})}{n>budget?t("seeker.cv.trimHint"):""}</div>;
}

/* ═══════════════ CV BUILDER — multiple CVs, three templates ═══════════════
   CvPreview renders at three very different scales (full live-preview panel, a 190px-tall
   list-card thumbnail shrunk via CSS transform, and a tiny template-picker thumbnail), all
   driven by the `scale` prop multiplying every measurement. Because almost every value here
   is a runtime computation (`13*scale`, `22*scale`, ...) rather than a fixed value, it can't
   be expressed as static Tailwind classes — so this component's internals stay inline style,
   same as the original. The `mob` prop below is the one deliberate behavior change: it fixes
   the "modern" template's sidebar so it stacks instead of staying frozen at width:33% on narrow
   screens, matching the breakpoint convention CvEditPage already uses for its own chrome. */
export function CvPreview({cv,u,scale=1,mob=false}){
  const {t}=useTranslation();
  const T=cv.template;
  const wrap={background:"#fff",width:"100%",fontFamily:FONT,color:"#111",lineHeight:1.5,
    fontSize:13*scale,padding:T==="compact"?22*scale:28*scale,boxSizing:"border-box"};
  const Head=()=><>
    <div style={{fontSize:(T==="compact"?22:26)*scale,fontWeight:750,letterSpacing:"-.03em",color:"#0E1727"}}>{cv.name0||u.name}</div>
    <div style={{fontSize:14*scale,color:C.brand,fontWeight:600,marginTop:3*scale}}>{cv.title||u.title}</div>
    <div style={{fontSize:11.5*scale,color:"#4A5A73",marginTop:6*scale}}>
      {[cv.email||u.email,cv.phone||u.phone,`${cv.city||u.city}, ${cv.prov||u.prov}`].filter(Boolean).join("  •  ")}</div></>;
  const SecT=({children})=><div style={{fontSize:11*scale,fontWeight:750,letterSpacing:".09em",textTransform:"uppercase",
    color:T==="modern"?C.brand:"#0E1727",borderBottom:T==="classic"?`1.5px solid ${C.brand}`:"none",
    paddingBottom:T==="classic"?4*scale:0,marginBottom:8*scale,marginTop:16*scale}}>{children}</div>;
  const Body=()=><>
    {cv.summary&&<><SecT>{t("seeker.cv.secProfessionalSummary")}</SecT>
      <div className="rich-content" style={{fontSize:12*scale,color:"#333",lineHeight:1.65}} dangerouslySetInnerHTML={{__html:sanitizeHtml(cv.summary)}}/></>}
    {cv.exp?.length>0&&<><SecT>{t("seeker.cv.secWorkExperience")}</SecT>
      {cv.exp.map(x=><div key={x.id} style={{marginBottom:10*scale}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:10}}>
          <span style={{fontSize:12.5*scale,fontWeight:700,color:"#0E1727"}}>{x.role}</span>
          <span style={{fontSize:11*scale,color:"#4A5A73",flexShrink:0}}>{x.from} – {x.to==="Present"?t("seeker.cv.presentLabel"):x.to}</span></div>
        <div style={{fontSize:11.5*scale,color:C.brand,fontWeight:600,marginTop:1*scale}}>{x.org}{x.place?` · ${x.place}`:""}</div>
        {x.detail&&<div className="rich-content" style={{fontSize:11.5*scale,color:"#444",marginTop:3*scale,lineHeight:1.6}} dangerouslySetInnerHTML={{__html:sanitizeHtml(x.detail)}}/>}</div>)}</>}
    {cv.edu?.length>0&&<><SecT>{t("seeker.cv.secEducation")}</SecT>
      {cv.edu.map(x=><div key={x.id} style={{marginBottom:8*scale,display:"flex",justifyContent:"space-between",gap:10}}>
        <div><div style={{fontSize:12.5*scale,fontWeight:700,color:"#0E1727"}}>{x.qual}</div>
          <div style={{fontSize:11.5*scale,color:"#4A5A73",marginTop:1*scale}}>{x.org}</div></div>
        <span style={{fontSize:11*scale,color:"#4A5A73",flexShrink:0}}>{x.year}</span></div>)}</>}
    {cv.certs?.length>0&&<><SecT>{t("seeker.cv.secCertifications")}</SecT>
      <div style={{display:"flex",flexWrap:"wrap",gap:5*scale}}>
        {cv.certs.map(c=><span key={c} style={{fontSize:11*scale,background:C.okBg,color:C.ok,
          border:`1px solid ${C.okLn}`,padding:`${3*scale}px ${7*scale}px`,borderRadius:5*scale,fontWeight:600}}>{c}</span>)}</div></>}
  </>;
  if(T==="modern") return <div style={{...wrap,padding:0,display:"flex",flexDirection:mob?"column":"row"}}>
    <div style={{width:mob?"100%":"33%",background:"#0E1727",color:"#fff",padding:22*scale,boxSizing:"border-box"}}>
      <div style={{marginBottom:16*scale}}><SmartPortrait seed={u.seed??0} size={64*scale} radius={12*scale}/></div>
      <div style={{fontSize:10.5*scale,fontWeight:750,letterSpacing:".09em",textTransform:"uppercase",color:"rgba(255,255,255,.5)",marginBottom:7*scale}}>{t("seeker.cv.secContact")}</div>
      <div style={{fontSize:11*scale,color:"rgba(255,255,255,.85)",lineHeight:1.9,marginBottom:16*scale,wordBreak:"break-word"}}>
        {cv.email||u.email}<br/>{cv.phone||u.phone}<br/>{cv.city||u.city}, {cv.prov||u.prov}</div>
      {cv.skills?.length>0&&<><div style={{fontSize:10.5*scale,fontWeight:750,letterSpacing:".09em",textTransform:"uppercase",color:"rgba(255,255,255,.5)",marginBottom:7*scale}}>{t("seeker.cv.secSkills")}</div>
        <div style={{display:"flex",flexDirection:"column",gap:5*scale}}>
          {cv.skills.map(s=><span key={s} style={{fontSize:11*scale,color:"rgba(255,255,255,.9)"}}>{s}</span>)}</div></>}
    </div>
    <div style={{flex:1,padding:24*scale,boxSizing:"border-box",minWidth:0}}><Head/><Body/></div></div>;
  /* Executive template: serif headline treatment, wider top margin, small-caps section headers.
     Aimed at senior/leadership/professional-services applications where the resume expected
     to read as a document rather than a data card. Still single-column so ATS parsers reading
     it top-to-bottom don't skip a sidebar. */
  if(T==="executive") return <div style={{...wrap,padding:36*scale,fontFamily:'Georgia,"Times New Roman",serif'}}>
    <div style={{textAlign:"center",borderBottom:`1px solid #0E1727`,paddingBottom:14*scale,marginBottom:18*scale}}>
      <div style={{fontSize:30*scale,fontWeight:700,letterSpacing:"-.01em",color:"#0E1727"}}>{cv.name0||u.name}</div>
      <div style={{fontSize:14*scale,color:"#4A5A73",fontStyle:"italic",marginTop:4*scale}}>{cv.title||u.title}</div>
      <div style={{fontSize:11*scale,color:"#4A5A73",marginTop:8*scale,letterSpacing:".02em"}}>
        {[cv.email||u.email,cv.phone||u.phone,`${cv.city||u.city}, ${cv.prov||u.prov}`].filter(Boolean).join("   ·   ")}</div>
    </div>
    <Body/>
    {cv.skills?.length>0&&<><SecT>{t("seeker.cv.secSkills")}</SecT>
      <div style={{fontSize:11.5*scale,color:"#333",lineHeight:1.9}}>{cv.skills.join(" · ")}</div></>}
  </div>;

  /* Skills-first template: skills + certifications lead, work experience follows. Aimed at
     career-change or early-career applicants whose skill set carries more weight than a short
     job history. */
  if(T==="skills-first") return <div style={wrap}>
    <Head/>
    {cv.skills?.length>0&&<><SecT>{t("seeker.cv.secKeySkills")}</SecT>
      <div style={{display:"flex",flexWrap:"wrap",gap:5*scale,marginBottom:6*scale}}>
        {cv.skills.map(s=><span key={s} style={{fontSize:11.5*scale,background:C.wash,color:C.brand,
          border:`1px solid ${C.line2}`,padding:`${4*scale}px ${9*scale}px`,borderRadius:6*scale,fontWeight:600}}>{s}</span>)}</div></>}
    {cv.certs?.length>0&&<><SecT>{t("seeker.cv.secCertifications")}</SecT>
      <div style={{display:"flex",flexWrap:"wrap",gap:5*scale,marginBottom:6*scale}}>
        {cv.certs.map(c=><span key={c} style={{fontSize:11*scale,background:C.okBg,color:C.ok,
          border:`1px solid ${C.okLn}`,padding:`${3*scale}px ${7*scale}px`,borderRadius:5*scale,fontWeight:600}}>{c}</span>)}</div></>}
    <Body/>
  </div>;

  return <div style={wrap}>
    <div style={{borderBottom:T==="classic"?`2px solid #0E1727`:"none",paddingBottom:12*scale}}><Head/></div>
    {T==="compact"&&cv.skills?.length>0&&<div style={{fontSize:11*scale,color:"#4A5A73",marginTop:8*scale}}>
      <strong style={{color:"#0E1727"}}>{t("seeker.cv.secSkills")}: </strong>{cv.skills.join(" • ")}</div>}
    <Body/>
    {T!=="compact"&&cv.skills?.length>0&&<><SecT>{t("seeker.cv.secSkills")}</SecT>
      <div style={{display:"flex",flexWrap:"wrap",gap:5*scale}}>
        {cv.skills.map(s=><span key={s} style={{fontSize:11*scale,background:C.wash,color:C.brand,
          border:`1px solid ${C.line2}`,padding:`${3*scale}px ${8*scale}px`,borderRadius:5*scale,fontWeight:600}}>{s}</span>)}</div></>}
  </div>;
}

/* Job Seeker Transformation Tranche 3 (JS-07): the 5-CV cap used to be a purely server-side fact
   the seeker discovered only when a "New CV" POST failed. Surfacing it proactively at count=5 -
   before they've composed anything - turns a dead end into three real next steps. */
const MAX_CVS=5;
export function CvsPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t}=useTranslation();
  const heroPad=mob?"py-11 px-4":"py-18 px-8";
  const [importing,setImporting]=useState(false);
  const [limitTip,setLimitTip]=useState(null);
  const fileRef=useRef(null);
  const myCvs=A.cvs.filter(c=>c.user===A.user.id);
  const atLimit=myCvs.length>=MAX_CVS;
  const onFilePicked=async(e)=>{
    const file=e.target.files?.[0]; e.target.value="";
    if(!file)return;
    setImporting(true);
    try{await A.importResumeToNewCv(file);}
    catch(err){A.toast(err.message||t("seeker.cv.couldntReadFile"),"danger");}
    setImporting(false);
  };
  const showTip=e=>{const r=e.currentTarget.getBoundingClientRect();setLimitTip({top:r.top+r.height/2,left:r.right+10});};
  if(!A.settings.cvBuilder)return <Page><Empty icon="lock" title={t("seeker.cv.cvBuilderUnavailableTitle")}
    body={t("seeker.cv.cvBuilderUnavailableBodyList")}/></Page>;
  return <div className="bg-white min-h-full">
    <section className={`${heroPad} bg-white border-b border-line-soft`}>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-end gap-5 flex-wrap">
          <div><Tag tone="brand" icon="file">{t("seeker.cv.cvBuilderTag")}</Tag>
            <h1 className={`${HERO_TIGHT} mt-5 mb-3 ${mob?"text-3xl":"text-5xl"}`}>{t("seeker.cv.myCvsTitle")}</h1>
            <p className={`text-text-2 leading-normal max-w-xl ${mob?"text-base":"text-lg"}`}>{t("seeker.cv.myCvsSub")}</p></div>
          <div className="flex gap-2.5">
            <input ref={fileRef} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden onChange={onFilePicked}/>
            <span className="relative inline-block" onMouseEnter={atLimit?showTip:undefined} onMouseLeave={()=>setLimitTip(null)}>
              <Btn kind="outline" size="lg" icon="upload" disabled={importing||atLimit} onClick={()=>fileRef.current?.click()}>{importing?t("seeker.cv.readingBtn"):t("seeker.cv.importBtn")}</Btn>
              {atLimit&&<Tooltip show={!!limitTip} top={limitTip?.top} left={limitTip?.left}>{t("seeker.cv.maxCvsTooltip")}</Tooltip>}</span>
            <span className="relative inline-block" onMouseEnter={atLimit?showTip:undefined} onMouseLeave={()=>setLimitTip(null)}>
              <Btn kind="primary" size="lg" icon="plus" disabled={atLimit} onClick={()=>A.newCv()}>{t("seeker.cv.newCvBtn")}</Btn>
              {atLimit&&<Tooltip show={!!limitTip} top={limitTip?.top} left={limitTip?.left}>{t("seeker.cv.maxCvsTooltip")}</Tooltip>}</span></div></div>
        {atLimit&&<Banner tone="warn" icon="alert" title={t("seeker.cv.maxCvsTitle")} style={{marginTop:20}}>
          <div className="flex flex-col gap-2.5">
            <div>{t("seeker.cv.maxCvsBody")}</div>
            <div className="flex gap-2 flex-wrap">
              <Btn kind="outline" size="sm" icon="edit" onClick={()=>A.editCv(myCvs[0].id)}>{t("seeker.cv.editExistingBtn")}</Btn>
              <Btn kind="outline" size="sm" icon="copy" onClick={()=>A.duplicateCv(myCvs[0].id)}>{t("seeker.cv.duplicateOneBtn")}</Btn>
              <Btn kind="outline" size="sm" icon="trash" onClick={()=>document.getElementById("cv-grid")?.scrollIntoView({behavior:"smooth",block:"start"})}>{t("seeker.cv.deleteOldOneBtn")}</Btn>
            </div></div></Banner>}
      </div>
    </section>
    <section id="cv-grid" className={`bg-bg min-h-100 ${mob?"pt-8 px-4 pb-14":"pt-12 px-8 pb-24"}`}>
      <div className="max-w-6xl mx-auto">
    {A.cvs.length===0?<Empty icon="file" title={t("seeker.cv.noCvsYetTitle")}
      body={t("seeker.cv.noCvsYetBody")}
      action={<Btn kind="primary" icon="plus" onClick={()=>A.newCv()}>{t("seeker.cv.buildFirstCvBtn")}</Btn>}/>
      :<div className="grid gap-4" style={{gridTemplateColumns:`repeat(auto-fill,minmax(${mob?250:280}px,1fr))`}}>
        {A.cvs.map((cv,i)=><Card key={cv.id} pad={0} delay={i*0.05} style={{overflow:"hidden"}}>
          <div className="bg-bg border-b border-line relative overflow-hidden" style={{height:190}}>
            <div style={{transform:"scale(.52)",transformOrigin:"top left",width:"192%",pointerEvents:"none"}}>
              <CvPreview cv={cv} u={A.user}/></div>
            {A.user.defaultCv===cv.id&&<div className="absolute top-2.5 right-2.5"><Tag tone="ok" sm icon="check">{t("seeker.cv.defaultTag")}</Tag></div>}</div>
          <div className="p-4">
            <div className="text-base font-bold text-text tracking-tight">{cv.name}</div>
            <div className="text-xs text-text-3 mt-1">
              {cvTemplateName(t,cv.template)} • {t("seeker.cv.updatedLabel",{date:cv.updated})}</div>
            <div className="flex gap-2 mt-3.5 flex-wrap">
              <Btn kind="primary" size="sm" icon="edit" onClick={()=>A.editCv(cv.id)}>{t("seeker.cv.editBtn")}</Btn>
              <Btn kind="outline" size="sm" icon="download" onClick={()=>A.printCv(cv)}>{t("seeker.cv.pdfBtn")}</Btn>
              <Btn kind="ghost" size="sm" icon="copy" title={t("seeker.cv.duplicateTitle")} onClick={()=>A.duplicateCv(cv.id)}/>
              <Btn kind="ghost" size="sm" icon="trash" title={t("seeker.cv.deleteTitle")} onClick={()=>A.deleteCv(cv.id)}/></div>
            {A.user.defaultCv!==cv.id&&<Btn kind="ghost" size="sm" full style={{marginTop:8}} onClick={()=>A.setDefaultCv(cv.id)}>{t("seeker.cv.makeDefaultBtn")}</Btn>}</div></Card>)}</div>}
      </div>
    </section>
  </div>;
}

export function CvEditPage(){
  const A=use(); const mob=useMedia("(max-width: 1024px)"); const {t}=useTranslation();
  const cv=A.cvs.find(c=>c.id===A.cvId);
  const [d,setD]=useState(cv?{...cv}:null);
  const [sec,setSec]=useState("basics");
  const [confirmLeave,setConfirmLeave]=useState(false);
  useEffect(()=>{if(cv)setD({...cv});},[A.cvId]);
  if(!A.settings.cvBuilder)return <Page><Empty icon="lock" title={t("seeker.cv.cvBuilderUnavailableTitle")}
    body={t("seeker.cv.cvBuilderUnavailableBodyEdit")} action={<Btn kind="primary" onClick={()=>A.go("cvs")}>{t("common.back")}</Btn>}/></Page>;
  if(!cv||!d) return <Page><Empty icon="file" title={t("seeker.cv.cvNotFoundTitle")} body={t("seeker.cv.cvNotFoundBody")}
    action={<Btn kind="primary" onClick={()=>A.go("cvs")}>{t("seeker.cv.myCvsBtn")}</Btn>}/></Page>;
  const set=(k,v)=>setD(p=>({...p,[k]:v}));
  const dirty=JSON.stringify(d)!==JSON.stringify(cv);
  /* Seeker Tranche 5 (JS-08) autosave: 900ms debounce on any change, plus a footer indicator
     that says "Saving…" during the roundtrip and "Saved just now / N minutes ago" after. The
     manual Save button stays as a keyboard-friendly escape hatch, but the reader should
     essentially never need to press it. Save is a no-op when nothing changed. */
  const [saveState,setSaveState]=useState("idle"); /* idle | saving | saved | error */
  const [savedAt,setSavedAt]=useState(cv?Date.now():null);
  const [nowTick,setNowTick]=useState(Date.now());
  useEffect(()=>{ const id=setInterval(()=>setNowTick(Date.now()),30000); return()=>clearInterval(id); },[]);
  useEffect(()=>{
    if(!dirty) return;
    setSaveState("saving");
    const id=setTimeout(async()=>{
      try{ await A.saveCv(d); setSavedAt(Date.now()); setSaveState("saved"); }
      catch{ setSaveState("error"); }
    },900);
    return()=>clearTimeout(id);
  },[JSON.stringify(d)]);
  const savedRelative=()=>{
    if(!savedAt) return "";
    const s=Math.round((nowTick-savedAt)/1000);
    if(s<10) return t("seeker.cv.savedJustNow");
    if(s<60) return t("seeker.cv.savedSecondsAgo",{n:s});
    const m=Math.round(s/60);
    if(m<60) return t("seeker.cv.savedMinutesAgo",{n:m});
    return t("seeker.cv.savedLongerAgo");
  };
  const saveIndicator=saveState==="saving"?t("seeker.cv.savingIndicator"):
    saveState==="error"?t("seeker.cv.saveErrorIndicator"):
    dirty?t("seeker.cv.savingIndicator"):savedRelative();
  const addExp=()=>set("exp",[...(d.exp||[]),{id:uid("x"),role:"",org:"",place:"",from:"",to:"Present",detail:""}]);
  const addEdu=()=>set("edu",[...(d.edu||[]),{id:uid("e"),qual:"",org:"",year:""}]);
  const upd=(key,id,k,v)=>set(key,d[key].map(x=>x.id===id?{...x,[k]:v}:x));
  const rm=(key,id)=>set(key,d[key].filter(x=>x.id!==id));
  const move=(key,id,dir)=>{const arr=[...(d[key]||[])];const i=arr.findIndex(x=>x.id===id);
    const j=i+dir; if(i<0||j<0||j>=arr.length)return; [arr[i],arr[j]]=[arr[j],arr[i]]; set(key,arr);};
  const secs=[{k:"basics",label:t("seeker.cv.secBasics"),icon:"user"},{k:"exp",label:t("seeker.cv.secExpTab"),icon:"briefcase"},
    {k:"edu",label:t("seeker.cv.secEduTab"),icon:"cap"},{k:"skills",label:t("seeker.cv.secSkillsTab"),icon:"sparkle"},{k:"design",label:t("seeker.cv.secDesign"),icon:"layout"}];

  /* First CV of this user is the "primary" — name/email locked on others */
  const myCvs=A.cvs.filter(c=>c.user===A.user.id);
  const isPrimary=myCvs.length>0&&myCvs[0].id===d.id;

  return <div className="bg-bg min-h-full">
    <div className="bg-white border-b border-line sticky top-15 z-250">
      <div className={`max-w-site mx-auto flex gap-3 items-center flex-wrap ${mob?"py-3 px-4":"py-3.5 px-7"}`}>
        <div className="flex-[1_1_200px] min-w-0">
          <Input value={d.name} onChange={e=>set("name",e.target.value)} placeholder={t("seeker.cv.cvNamePlaceholder")}
            style={{fontWeight:640,fontSize:15,border:"none",padding:"6px 0",boxShadow:"none"}}/></div>
        <div className="flex gap-2.5 flex-wrap items-center">
          <span className={`text-xs mr-1 ${saveState==="error"?"text-danger":"text-text-3"}`} aria-live="polite">{saveIndicator}</span>
          <Btn kind="ghost" size="sm" icon="chevL" onClick={()=>dirty?setConfirmLeave(true):A.go("cvs")}>{t("seeker.cv.backToCvsBtn")}</Btn>
          <Btn kind="outline" size="sm" icon="download" onClick={()=>A.printCv(d)}>{t("seeker.cv.printSaveAsPdfBtn")}</Btn>
          <Btn kind="primary" size="sm" icon="check" disabled={!dirty} onClick={()=>{A.saveCv(d); setSavedAt(Date.now()); setSaveState("saved");}}>{dirty?t("seeker.cv.saveBtn"):t("seeker.cv.savedBtn")}</Btn></div></div></div>
    <div className={`max-w-site mx-auto grid items-start gap-5 ${mob?"grid-cols-1 pt-4 px-4 pb-8":"grid-cols-[1fr_400px] pt-6 px-7 pb-11"}`}>
      <div>
        <Tabs items={secs} value={sec} onChange={setSec} style={{marginBottom:16}}/>
        <Card pad={mob?18:24}>
          {sec==="basics"&&<div className="flex flex-col gap-3.5">
            <H2 sub={t("seeker.cv.contactDetailsSub")}>{t("seeker.cv.contactDetailsTitle")}</H2>
            {!isPrimary&&<Banner tone="neutral" icon="lock">{t("seeker.cv.nameEmailLockedNote")}</Banner>}
            <div className={`grid gap-3.5 ${mob?"grid-cols-1":"grid-cols-2"}`}>
              <Field label={t("seeker.cv.fullNameLabel")} hint={isPrimary?null:t("seeker.cv.fullNameLockedHint")}>
                <Input value={d.name0||A.user.name} onChange={e=>set("name0",e.target.value)} disabled={!isPrimary} placeholder={A.user.name}/></Field>
              <Field label={t("seeker.cv.headlineLabel")}><Input value={d.title||""} onChange={e=>set("title",e.target.value)} placeholder={A.user.title}/></Field>
              <Field label={t("seeker.cv.emailLabel")} hint={isPrimary?null:t("seeker.cv.emailLockedHint")}>
                <Input icon="mail" value={d.email||A.user.email} onChange={e=>set("email",e.target.value)} disabled={!isPrimary} placeholder={A.user.email}/></Field>
              <Field label={t("seeker.cv.phoneLabel")}><Input icon="phone" value={d.phone||""} onChange={e=>set("phone",e.target.value)} placeholder={A.user.phone}/></Field>
              <Field label={t("seeker.cv.cityLabel")}><Input icon="pin" value={d.city||""} onChange={e=>set("city",e.target.value)} placeholder={A.user.city}/></Field>
              <Field label={t("seeker.cv.provinceLabel")}><Input value={d.prov||""} onChange={e=>set("prov",e.target.value)} placeholder={A.user.prov}/></Field></div>
            <Field label={t("seeker.cv.professionalSummaryLabel")} hint={t("seeker.cv.professionalSummaryHint")}>
              <RichText value={d.summary||""} onChange={v=>set("summary",v)} rows={4}
                placeholder={t("seeker.cv.summaryPlaceholder")}/>
              <_WordCountHint html={d.summary} budget={60}/></Field></div>}

          {sec==="exp"&&<div>
            <H2 sub={t("seeker.cv.workExperienceSub")} action={<Btn kind="outline" size="sm" icon="plus" onClick={addExp}>{t("seeker.cv.addRoleBtn")}</Btn>}>{t("seeker.cv.workExperienceTitle")}</H2>
            {(d.exp||[]).length===0?<Empty icon="briefcase" title={t("seeker.cv.noRolesYetTitle")} body={t("seeker.cv.noRolesYetBody")}
              action={<Btn kind="primary" icon="plus" onClick={addExp}>{t("seeker.cv.addARoleBtn")}</Btn>}/>
              :<div className="flex flex-col gap-3.5">
                {d.exp.map((x,i)=><div key={x.id} className="border border-line rounded-xl p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-text-3 tracking-wide">{t("seeker.cv.roleLabel",{n:i+1})}</span>
                    <div className="flex gap-1">
                      <Btn kind="ghost" size="xs" icon="chevU" disabled={i===0} onClick={()=>move("exp",x.id,-1)}/>
                      <Btn kind="ghost" size="xs" icon="chevD" disabled={i===d.exp.length-1} onClick={()=>move("exp",x.id,1)}/>
                      <Btn kind="ghost" size="xs" icon="trash" onClick={()=>rm("exp",x.id)}/></div></div>
                  <div className={`grid gap-3 ${mob?"grid-cols-1":"grid-cols-2"}`}>
                    <Field label={t("seeker.cv.jobTitleLabel")}><Input value={x.role} onChange={e=>upd("exp",x.id,"role",e.target.value)} placeholder="Journeyperson Electrician"/></Field>
                    <Field label={t("seeker.cv.employerLabel")}><Input value={x.org} onChange={e=>upd("exp",x.id,"org",e.target.value)} placeholder="PCL Construction"/></Field>
                    <Field label={t("seeker.cv.locationLabel")}><Input value={x.place} onChange={e=>upd("exp",x.id,"place",e.target.value)} placeholder="Calgary, AB"/></Field>
                    <div className={`grid gap-2.5 ${mob?"grid-cols-1":"grid-cols-2"}`}>
                      <Field label={t("seeker.cv.fromLabel")}><Input type="month" value={x.from} onChange={e=>upd("exp",x.id,"from",e.target.value)}/></Field>
                      <Field label={t("seeker.cv.toLabel")}>
                        <Input type="month" value={x.currently?"":x.to==="Present"?"":x.to} disabled={x.currently}
                          onChange={e=>upd("exp",x.id,"to",e.target.value)}/>
                      </Field>
                    </div>
                  </div>
                  <label className="flex gap-2 items-center mt-2.5 text-sm text-text-2 cursor-pointer">
                    <input type="checkbox" checked={!!x.currently||x.to==="Present"} onChange={e=>{
                      const on=e.target.checked; upd("exp",x.id,"currently",on); upd("exp",x.id,"to",on?"Present":"");}}/>
                    {t("seeker.cv.currentlyWorkHereLabel")}
                  </label>
                  <Field label={t("seeker.cv.responsibilitiesLabel")} style={{marginTop:12}} hint={t("seeker.cv.responsibilitiesHint")}>
                    <RichText value={x.detail} onChange={v=>upd("exp",x.id,"detail",v)} rows={4}
                      placeholder={t("seeker.cv.responsibilitiesPlaceholder")}/>
                    <_WordCountHint html={x.detail}/></Field></div>)}</div>}</div>}

          {sec==="edu"&&<div>
            <H2 sub={t("seeker.cv.educationSub")} action={<Btn kind="outline" size="sm" icon="plus" onClick={addEdu}>{t("seeker.cv.addBtn")}</Btn>}>{t("seeker.cv.educationTitle")}</H2>
            {(d.edu||[]).length===0?<Empty icon="cap" title={t("seeker.cv.nothingAddedTitle")} body={t("seeker.cv.nothingAddedBody")}
              action={<Btn kind="primary" icon="plus" onClick={addEdu}>{t("seeker.cv.addEducationBtn")}</Btn>}/>
              :<div className="flex flex-col gap-3">
                {d.edu.map(x=><div key={x.id} className="border border-line rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-text-3 tracking-wide">{t("seeker.cv.entryLabel")}</span>
                    <div className="flex gap-1">
                      <Btn kind="ghost" size="xs" icon="chevU" disabled={d.edu.indexOf(x)===0} onClick={()=>move("edu",x.id,-1)}/>
                      <Btn kind="ghost" size="xs" icon="chevD" disabled={d.edu.indexOf(x)===d.edu.length-1} onClick={()=>move("edu",x.id,1)}/>
                      <Btn kind="ghost" size="xs" icon="trash" onClick={()=>rm("edu",x.id)}/></div></div>
                  <div className={`grid gap-3 ${mob?"grid-cols-1":"grid-cols-[2fr_2fr_1fr]"}`}>
                    <Field label={t("seeker.cv.qualificationLabel")}><Input value={x.qual} onChange={e=>upd("edu",x.id,"qual",e.target.value)} placeholder="Red Seal, Construction Electrician"/></Field>
                    <Field label={t("seeker.cv.institutionLabel")}><Input value={x.org} onChange={e=>upd("edu",x.id,"org",e.target.value)} placeholder="SAIT"/></Field>
                    <Field label={t("seeker.cv.yearLabel")}><Input type="number" inputMode="numeric" min="1950" max="2035" value={x.year} onChange={e=>upd("edu",x.id,"year",e.target.value.replace(/[^0-9]/g,"").slice(0,4))} placeholder="2018"/></Field></div></div>)}</div>}</div>}

          {sec==="skills"&&<div>
            <H2 sub={t("seeker.cv.skillsAndCertsSub")}>{t("seeker.cv.skillsAndCertsTitle")}</H2>
            <div className="flex flex-wrap gap-2 mb-5">
              {A.user.skills.map(s=>{const on=(d.skills||[]).includes(s);
                return <button key={s} onClick={()=>set("skills",on?d.skills.filter(x=>x!==s):[...(d.skills||[]),s])}
                  className={`inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg cursor-pointer text-sm border-2 transition duration-150 ${on?"font-semibold border-brand bg-brand text-white":"font-medium border-line bg-white text-text-2"}`}>
                  {on&&<I n="check" s={13} c="#fff" w={2.6}/>}{s}</button>;})}</div>
            <Field label={t("seeker.cv.certsShownSeparatelyLabel")} hint={t("seeker.cv.certsShownSeparatelyHint")}>
              <Input value={(d.certs||[]).join(", ")} onChange={e=>set("certs",e.target.value.split(",").map(s=>s.trim()).filter(Boolean))}
                placeholder="Red Seal, Fall Protection, WHMIS 2015"/></Field>
            <Btn kind="ghost" size="sm" style={{marginTop:14}} onClick={()=>A.go("profile")}>{t("seeker.cv.addMoreSkillsBtn")}</Btn></div>}

          {sec==="design"&&<div>
            <H2 sub={t("seeker.cv.templateSub")}>{t("seeker.cv.templateTitle")}</H2>
            <div className="flex flex-col gap-3">
              {CV_TEMPLATES.map(tpl=>{const on=d.template===tpl.id;
                return <button key={tpl.id} onClick={()=>set("template",tpl.id)}
                  className={`flex gap-3.5 items-center p-3.5 rounded-xl cursor-pointer text-left w-full border-2 transition duration-150 ${on?"border-brand bg-tint":"border-line bg-white"}`}>
                  <div className="w-13 h-17 rounded-md overflow-hidden shrink-0 border border-line bg-white">
                    <div style={{transform:"scale(.14)",transformOrigin:"top left",width:"714%",pointerEvents:"none"}}>
                      <CvPreview cv={{...d,template:tpl.id}} u={A.user}/></div></div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-base font-bold ${on?"text-brand":"text-text"}`}>{t(`seeker.cv.${CV_TEMPLATE_KEY[tpl.id][0]}`)}</div>
                    <div className="text-sm text-text-2 mt-1 leading-normal">{t(`seeker.cv.${CV_TEMPLATE_KEY[tpl.id][1]}`)}</div></div>
                  <span className={`w-5 h-5 rounded-full shrink-0 border-2 flex items-center justify-center ${on?"border-brand":"border-line"}`}>{on&&<span className="w-2.5 h-2.5 rounded-full bg-brand"/>}</span></button>;})}</div>
            <Banner tone="neutral" icon="info" title={t("seeker.cv.whichShouldIUseTitle")} style={{marginTop:18}}>
              {t("seeker.cv.whichShouldIUseBody")}</Banner></div>}
        </Card></div>

      <div className={mob?"static":"sticky top-35"}>
        <Card pad={0} style={{overflow:"hidden"}}>
          <div className="py-3 px-4 border-b border-line-soft flex justify-between items-center">
            <span className="text-sm font-bold text-text">{t("seeker.cv.livePreviewLabel")}</span>
            <Tag sm>{cvTemplateName(t,d.template)}</Tag></div>
          <div className={`bg-bg p-3.5 overflow-y-auto ${mob?"max-h-105":"max-h-155"}`}>
            <div className="shadow-md rounded overflow-hidden bg-white">
              <CvPreview cv={d} u={A.user} scale={0.86} mob={mob}/></div></div></Card></div>
    </div>
    <ConfirmDialog open={confirmLeave} onClose={()=>setConfirmLeave(false)} kind="primary" confirmLabel={t("seeker.cv.discardChangesBtn")}
      title={t("seeker.cv.discardUnsavedTitle")} onConfirm={()=>A.go("cvs")}>
      {t("seeker.cv.discardUnsavedBody")}
    </ConfirmDialog></div>;
}
