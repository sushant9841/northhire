import { useState, useEffect } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn, Tag, Card, Input, Sel, Field, Area, Bar, Tabs, H2, Lbl, Empty, Modal, SmartPortrait, SmartScene, Page, H1, HERO_TIGHT } from "../../design/primitives.jsx";
import { CATS, CATM, PROVS, PCODE } from "../../store/seed/constants.js";
import { EmpMark } from "./cards.jsx";
import { useTranslation } from "../../i18n/i18n.jsx";

export function ProfilePage(){
  const A=use(); const { t } = useTranslation(); const mob=useMedia("(max-width: 900px)");
  const u=A.user;
  /* All hooks live at the top before any conditional return - conditionally-called hooks are a
     Rules-of-Hooks violation and crash the tab with "Rendered more hooks than during the
     previous render" the moment the branch changes (guest -> signed-in seeker, or seeker <->
     employer). The u-shape defaults let the useState initializers run before we know u.role. */
  const seed=u||{skills:[]};
  const [tab,setTab]=useState("about");
  const [d,setD]=useState({...seed});
  const [skill,setSkill]=useState("");
  const [showRef,setShowRef]=useState(false);
  const [ref,setRef]=useState({name:"",title:"",company:"",email:"",phone:"",relationship:""});
  useEffect(()=>{ if(u) setD({...u}); },[u]);
  if(!u) return <Page narrow><Empty icon="user" title={t("profile.signInTitle")}
    body={t("profile.signInBody")}
    action={<div className="flex gap-2.5 justify-center flex-wrap">
      <Btn kind="primary" onClick={()=>A.go("signup")}>{t("profile.signInCreateBtn")}</Btn>
      <Btn kind="outline" onClick={()=>A.go("login")}>{t("profile.signInSignInBtn")}</Btn></div>}/></Page>;
  if(u.role!=="seeker") return <EmployerAccountPage/>;
  const dirty=JSON.stringify(d)!==JSON.stringify(u);
  const set=(k,v)=>setD(p=>({...p,[k]:v}));
  const addSkill=s=>{const v=s.trim(); if(!v||d.skills.includes(v))return; set("skills",[...d.skills,v]); setSkill("");};
  const SUG=({trades:["Red Seal","WHMIS","Fall Protection","Blueprint Reading","Welding"],
    health:["BLS/CPR","Patient Care","Infection Control","Charting","First Aid"],
    transport:["Air Brakes","ELD Logs","Forklift","Load Securement","FAST Card"],
    retail:["POS Systems","Cash Handling","Merchandising","Upselling","Inventory"],
    hosp:["Food Safe","Knife Skills","Barista","Banquet Service","Sanitation"],
    factory:["Forklift","RF Scanner","Quality Control","5S","Machine Operation"],
    admin:["MS Office","Bookkeeping","Minute Taking","Data Entry","Reception"],
    edu:["Lesson Planning","Behaviour Guidance","First Aid","Literacy","Special Needs Support"],
    finance:["Excel","Reconciliation","QuickBooks","Payroll","Compliance"],
    tech:["JavaScript","React","Python","SQL","Git"],
    agri:["Tractor Operation","Irrigation","Livestock Handling","Crop Care","Packing"],
    security:["Security Licence","CCTV Monitoring","Report Writing","De-escalation","WHMIS"]}[d.cat]
    /* Same gap as SignupPage's identical per-category lookup: a sector added to CATS without a
       matching entry here silently showed no suggestions at all. */
    ||["Communication","Time Management","Problem Solving","Teamwork"]).filter(s=>!d.skills.includes(s));
  const tabs=[{k:"about",label:"About",icon:"user"},{k:"skills",label:"Skills",icon:"sparkle"},
    {k:"prefs",label:"Preferences",icon:"target"},{k:"learning",label:"Learning",icon:"cap"},{k:"refs",label:"References",icon:"users"}];

  const heroPad=mob?"py-11 px-4":"py-18 px-8";
  return <div className="bg-white min-h-full">
    <section className={`${heroPad} bg-white border-b border-line-soft`}>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-end gap-5 flex-wrap">
          <div><Tag tone="brand" icon="user">{t("profile.pageTag")}</Tag>
            <h1 className={`${HERO_TIGHT} mt-5 mb-3 ${mob?"text-3xl":"text-5xl"}`}>{t("profile.pageGreeting",{firstName:u.name.split(" ")[0]})}</h1>
            <p className={`text-text-2 leading-normal max-w-lg ${mob?"text-base":"text-lg"}`}>{t("profile.pageSub")}</p></div>
          <div className="flex gap-2.5 flex-wrap">
            <Btn kind="outline" icon="file" onClick={()=>A.go("cvs")}>{t("profile.myCvsBtn",{count:A.cvs.length})}</Btn>
            <Btn kind="outline" icon="gear" onClick={()=>A.go("settings")}>{t("profile.settingsBtn")}</Btn></div></div>
      </div>
    </section>
    <section className={`bg-bg min-h-100 ${mob?"pt-8 px-4 pb-14":"pt-12 px-8 pb-24"}`}>
      <div className="max-w-6xl mx-auto">
    <Card pad={mob?24:32} style={{marginBottom:18,borderRadius:20}}>
      <div className="flex gap-5 items-center flex-wrap">
        <SmartPortrait seed={u.seed??0} size={mob?64:78} radius={20}/>
        <div className="flex-[1_1_220px] min-w-0">
          <div className={`font-bold text-text tracking-tight ${mob?"text-xl":"text-2xl"}`}>{u.name}</div>
          <div className="text-sm text-text-2 mt-1">{u.title} • {u.city}, {u.prov}</div>
          <div className="text-sm text-text-3 mt-1">{u.email} • {u.phone}</div></div>
        <div className="flex-[0_0_200px] min-w-45">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-text-2">Profile strength</span><span className={`font-bold ${A.completeness>=85?"text-ok":"text-brand"}`}>{A.completeness}%</span></div>
          <Bar v={A.completeness} tone={A.completeness>=85?C.ok:C.brand}/>
          <div className="text-xs text-text-3 mt-2 leading-normal">{A.completenessHint}</div></div></div></Card>

    <Tabs items={tabs} value={tab} onChange={setTab} style={{marginBottom:18}}/>

    {/* The Save/Discard controls at the bottom of this card are easy to lose track of on a long
       tabbed form - this sticky bar keeps unsaved-changes state visible and actionable no matter
       which tab or scroll position the user is on. */}
    {dirty&&<div className="sticky flex items-center justify-between gap-3 bg-tint border border-line-2 rounded-xl py-2.5 px-4 mb-4 z-20" style={{top:72}}>
      <span className="text-sm font-semibold text-brand">You have unsaved changes.</span>
      <div className="flex gap-2">
        <Btn kind="ghost" size="sm" onClick={()=>setD({...u})}>Discard</Btn>
        <Btn kind="primary" size="sm" icon="check" onClick={()=>A.saveProfile(d)}>Save changes</Btn></div></div>}

    <Card pad={mob?24:32} style={{borderRadius:20}}>
      {tab==="about"&&<div className="flex flex-col gap-4">
        <H2>Personal details</H2>
        <div className={`grid gap-3.5 ${mob?"grid-cols-1":"grid-cols-2"}`}>
          <Field label="Full name" required><Input value={d.name} onChange={e=>set("name",e.target.value)}/></Field>
          <Field label="Job title or trade" required><Input icon="briefcase" value={d.title} onChange={e=>set("title",e.target.value)}/></Field>
          <Field label="Email" required><Input icon="mail" type="email" value={d.email} onChange={e=>set("email",e.target.value)}/></Field>
          <Field label="Phone" required><Input icon="phone" value={d.phone} onChange={e=>set("phone",e.target.value)}/></Field>
          <Field label="City" required><Input icon="pin" value={d.city} onChange={e=>set("city",e.target.value)}/></Field>
          <Field label="Province" required><Sel value={PROVS.find(p=>PCODE[p]===d.prov)||"Ontario"}
            onChange={e=>set("prov",PCODE[e.target.value])}>{PROVS.map(p=><option key={p}>{p}</option>)}</Sel></Field>
          <Field label="Sector" required><Sel value={d.cat} onChange={e=>set("cat",e.target.value)}>
            {CATS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</Sel></Field>
          <Field label="Years of experience" required><Input type="number" value={d.years} onChange={e=>set("years",Number(e.target.value)||0)}/></Field>
          <Field label="Highest education" style={{gridColumn:mob?"auto":"span 2"}}>
            <Sel value={d.edu} onChange={e=>set("edu",e.target.value)}>
              {["No formal education","High school diploma","Apprenticeship / trade certificate","College diploma","Bachelor's degree","Postgraduate degree"].map(o=><option key={o}>{o}</option>)}</Sel></Field>
          <Field label="Work eligibility in Canada" style={{gridColumn:mob?"auto":"span 2"}}>
            <Sel value={d.eligible} onChange={e=>set("eligible",e.target.value)}>
              <option value="citizen">Canadian citizen or permanent resident</option>
              <option value="permit">Valid work permit</option>
              <option value="student">Student permit with work authorisation</option>
              <option value="need">Requires employer sponsorship</option></Sel></Field>
          <Field label="Professional summary" style={{gridColumn:mob?"auto":"span 2"}} hint="Two or three sentences. This appears at the top of your CV.">
            <Area rows={4} value={d.summary||""} onChange={e=>set("summary",e.target.value)}
              placeholder={`${d.years||0}+ years as a ${(d.title||"role").toLowerCase()} in ${d.city||"your city"}. …`}/></Field></div></div>}

      {tab==="skills"&&<div>
        <H2 sub="These drive every match score you see">Skills, tickets and certificates</H2>
        <div className="flex gap-2.5 mb-4">
          <Input placeholder="Add a skill, ticket or certificate" value={skill} onChange={e=>setSkill(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addSkill(skill);}}}/>
          <Btn kind="primary" icon="plus" disabled={!skill.trim()} onClick={()=>addSkill(skill)}>Add</Btn></div>
        <div className="flex flex-wrap gap-2 mb-6">
          {d.skills.map(s=><span key={s} className="inline-flex items-center gap-2 bg-brand text-white text-sm font-semibold py-1.5 px-3 rounded-lg" style={{animation:"pop .2s ease"}}>{s}
            <button onClick={()=>set("skills",d.skills.filter(x=>x!==s))} className="bg-transparent border-0 text-white/70 cursor-pointer p-0 flex"><I n="x" s={13} w={2.5}/></button></span>)}
          {d.skills.length===0&&<span className="text-sm text-text-3">No skills added yet.</span>}</div>
        {SUG.length>0&&<><Lbl>Common in {CATM[d.cat]?.label} — tap to add</Lbl>
          <div className="flex flex-wrap gap-2">
            {SUG.map(s=><button key={s} onClick={()=>addSkill(s)} className="inline-flex items-center gap-1.5 bg-white border-2 border-dashed border-line text-text-2 text-sm font-medium py-1.5 px-3 rounded-lg cursor-pointer"><I n="plus" s={13} c={C.brand} w={2.4}/>{s}</button>)}</div></>}</div>}

      {tab==="prefs"&&<div className="flex flex-col gap-5">
        <H2 sub="Used to rank the jobs we show you">Job preferences</H2>
        <Field label="Minimum pay you would accept" required>
          <div className="flex gap-2.5">
            <Input icon="wallet" value={d.payMin} onChange={e=>set("payMin",Number(e.target.value.replace(/[^\d.]/g,""))||0)}/>
            <Sel value={d.payUnit} onChange={e=>set("payUnit",e.target.value)} style={{width:135,flexShrink:0}}>
              <option value="hr">per hour</option><option value="yr">per year</option></Sel></div></Field>
        <div><Lbl>Employment type</Lbl>
          <div className={`grid gap-2.5 ${mob?"grid-cols-2":"grid-cols-3"}`}>
            {["Full Time","Part Time","Contract","Seasonal","Apprenticeship","Casual"].map(t=>{const on=d.types.includes(t);
              return <button key={t} onClick={()=>set("types",on?d.types.filter(x=>x!==t):[...d.types,t])}
                className={`py-3 px-3 rounded-xl cursor-pointer text-sm border-2 transition duration-150 ${on?"font-semibold border-brand bg-tint text-brand":"font-medium border-line bg-white text-text"}`}>{t}</button>;})}</div></div>
        <div><Lbl>Where can you work?</Lbl>
          <div className="grid grid-cols-3 gap-2.5">
            {["On-site","Hybrid","Remote"].map(t=>{const on=d.modes.includes(t);
              return <button key={t} onClick={()=>set("modes",on?d.modes.filter(x=>x!==t):[...d.modes,t])}
                className={`py-3 px-3 rounded-xl cursor-pointer text-sm border-2 transition duration-150 ${on?"font-semibold border-brand bg-tint text-brand":"font-medium border-line bg-white text-text"}`}>{t}</button>;})}</div></div>
        <Field label="When can you start?"><Sel value={d.startWhen||"Within 2 weeks"} onChange={e=>set("startWhen",e.target.value)}>
          {["Immediately","Within 2 weeks","Within 1 month","More than 1 month"].map(o=><option key={o}>{o}</option>)}</Sel></Field></div>}

      {tab==="learning"&&<div>
        <H2 sub="Courses you have enrolled in" action={<Btn kind="outline" size="sm" onClick={()=>A.go("trainings")}>Browse trainings</Btn>}>My learning</H2>
        {A.enrolled.size===0?<Empty icon="cap" title="No trainings yet"
          body="Free certifications like WHMIS and interview skills are the fastest way to lift your match scores."
          action={<Btn kind="primary" onClick={()=>A.go("trainings")}>Browse trainings</Btn>}/>
          :<div className="flex flex-col gap-3">
            {A.trainings.filter(t=>A.enrolled.has(t.id)).map(t=>{const p=A.trainingProgress[t.id]||0;
              return <div key={t.id} className="flex gap-3.5 items-center border border-line rounded-xl p-3.5">
                <div className="w-15 h-11 rounded-lg overflow-hidden shrink-0"><SmartScene kind={t.scene} tone={t.tone} h={44} seed={t.id.charCodeAt(1)||0}/></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-text">{t.title}</div>
                  <div className="mt-2"><Bar v={p} tone={p>=100?C.ok:C.brand} h={5}/></div>
                  <div className="text-xs text-text-3 mt-1">{p>=100?"Completed — certificate available":`${p}% complete`}</div></div>
                <Btn kind={p>=100?"outline":"primary"} size="sm" onClick={()=>p>=100?A.printCert(t):A.openTraining(t.id)}>
                  {p>=100?"Certificate":"Continue"}</Btn></div>;})}</div>}</div>}

      {tab==="refs"&&<div>
        <H2 sub="Employers may contact these people after making an offer" action={<Btn kind="outline" size="sm" icon="plus" onClick={()=>setShowRef(true)}>Add reference</Btn>}>Professional references</H2>
        {A.references.filter(r=>r.user===u.id).length===0
          ? <Empty icon="users" title="No references yet" body="Add 2-3 previous supervisors or colleagues. Employers typically check references before extending an offer."
              action={<Btn kind="primary" icon="plus" onClick={()=>setShowRef(true)}>Add your first reference</Btn>}/>
          : <div className="flex flex-col gap-3">
              {A.references.filter(r=>r.user===u.id).map(r=><div key={r.id} className="flex gap-3.5 items-center p-3.5 border border-line rounded-xl">
                <div className="w-11 h-11 rounded-xl bg-wash text-brand flex items-center justify-center shrink-0 font-bold text-base">{r.name?.charAt(0)?.toUpperCase()||"?"}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-text">{r.name}</div>
                  <div className="text-sm text-text-2 mt-1">{r.title}{r.company?` at ${r.company}`:""}</div>
                  <div className="text-xs text-text-3 mt-1">{r.email} • {r.phone||"No phone"}</div>
                  {r.relationship&&<div className="text-xs text-text-3 mt-1 italic">{r.relationship}</div>}</div>
                <Btn kind="ghost" size="xs" icon="trash" onClick={()=>A.removeReference(r.id)}/></div>)}</div>}
      </div>}
      {showRef&&<Modal onClose={()=>setShowRef(false)} title="Add a reference">
        <div className="flex flex-col gap-3.5">
          <Field label="Full name" required><Input value={ref.name} onChange={e=>setRef({...ref,name:e.target.value})} placeholder="Jean Tremblay"/></Field>
          <div className={`grid gap-3 ${mob?"grid-cols-1":"grid-cols-2"}`}>
            <Field label="Job title"><Input value={ref.title} onChange={e=>setRef({...ref,title:e.target.value})} placeholder="Site Foreman"/></Field>
            <Field label="Company"><Input value={ref.company} onChange={e=>setRef({...ref,company:e.target.value})} placeholder="PCL Construction"/></Field>
            <Field label="Email"><Input icon="mail" type="email" value={ref.email} onChange={e=>setRef({...ref,email:e.target.value})} placeholder="jean@example.ca"/></Field>
            <Field label="Phone"><Input icon="phone" value={ref.phone} onChange={e=>setRef({...ref,phone:e.target.value})} placeholder="416 555 0100"/></Field></div>
          <Field label="Relationship" hint="How did you work together?"><Input value={ref.relationship} onChange={e=>setRef({...ref,relationship:e.target.value})} placeholder="Direct supervisor for 3 years"/></Field>
          <div className="flex gap-2.5 justify-end">
            <Btn kind="ghost" onClick={()=>setShowRef(false)}>Cancel</Btn>
            <Btn kind="primary" icon="check" disabled={!ref.name||!ref.email} onClick={()=>{A.addReference(ref);setRef({name:"",title:"",company:"",email:"",phone:"",relationship:""});setShowRef(false);}}>Add reference</Btn></div>
        </div></Modal>}
      <div className="flex gap-2.5 justify-end mt-6 pt-5 border-t border-line-soft">
        {dirty&&<Btn kind="ghost" onClick={()=>setD({...u})}>Discard changes</Btn>}
        <Btn kind="primary" icon="check" disabled={!dirty} onClick={()=>A.saveProfile(d)}>{dirty?"Save changes":"Saved"}</Btn></div>
    </Card>
      </div>
    </section>
  </div>;
}

/* ═══════════════ EMPLOYER SUITE ═══════════════ */
export function EmployerAccountPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  if(A.user.role==="admin") return <AdminAccountPage/>;
  const e=A.company;
  return <Page narrow>
    <H1 sub="Your employer account and company details"
      action={<Btn kind="outline" size="sm" icon="gear" onClick={()=>A.go("settings")}>Settings</Btn>}>Account</H1>
    <Card pad={mob?18:24} style={{marginBottom:16}}>
      <div className="flex gap-4 items-center flex-wrap">
        <EmpMark e={e} size={mob?60:72} radius={18}/>
        <div className="flex-[1_1_200px] min-w-0">
          <div className="flex gap-2.5 items-center flex-wrap">
            <span className={`font-bold text-text tracking-tight ${mob?"text-xl":"text-2xl"}`}>{e.name}</span>
            {e.verified?<Tag tone="ok" sm icon="checkC2">Verified</Tag>:<Tag tone="warn" sm icon="clock">Pending review</Tag>}</div>
          <div className="text-sm text-text-2 mt-1.5">{e.industry} • {e.city}, {e.prov} • {e.size} employees</div>
          <div className="text-sm text-text-3 mt-1">{A.user.email}</div></div>
        <Btn kind="primary" icon="edit" onClick={()=>A.go("empCompany")}>Edit company</Btn></div></Card>
    <div className={`grid gap-3 ${mob?"grid-cols-1":"grid-cols-2"}`}>
      {[["home","Dashboard","empHome"],["briefcase","My job listings","empJobs"],["users","Candidates","empPipeline"],
        ["book","Articles and trainings","empContent"],["wallet","Billing and plan","empBilling"],["gear","Settings","settings"]].map(([ic,l,p])=>
        <button key={p} onClick={()=>A.go(p)} className="flex items-center gap-3.5 py-4 px-5 bg-white border border-line rounded-2xl cursor-pointer text-left transition duration-150 hover:border-brand">
          <span className="w-10 h-10 rounded-xl bg-wash text-brand flex items-center justify-center"><I n={ic} s={18}/></span>
          <span className="flex-1 text-sm font-semibold text-text">{l}</span><I n="chevR" s={16} c={C.text3}/></button>)}</div>
  </Page>;
}

export function AdminAccountPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  return <Page narrow>
    <H1 sub="Administrator account">Account</H1>
    <Card pad={mob?18:24} style={{marginBottom:16}}>
      <div className="flex gap-4 items-center flex-wrap">
        <SmartPortrait seed={A.user.seed??0} size={mob?60:72} radius={18}/>
        <div className="flex-[1_1_200px] min-w-0">
          <div className={`font-bold text-text tracking-tight ${mob?"text-xl":"text-2xl"}`}>{A.user.name}</div>
          <div className="text-sm text-text-2 mt-1.5">Platform administrator</div>
          <div className="text-sm text-text-3 mt-1">{A.user.email}</div></div></div></Card>
    <div className={`grid gap-3 ${mob?"grid-cols-1":"grid-cols-2"}`}>
      {[["home","Overview","admHome"],["users","Users","admUsers"],["building","Employers","admEmployers"],
        ["shield","Job moderation","admJobs"],["book","Articles","admBlogs"],["cap","Trainings","admTrainings"],
        ["trend","Statistics","admStats"],["file","Activity log","admLog"],["gear","Platform settings","admSettings"]].map(([ic,l,p])=>
        <button key={p} onClick={()=>A.go(p)} className="flex items-center gap-3.5 py-4 px-5 bg-white border border-line rounded-2xl cursor-pointer text-left transition duration-150 hover:border-brand">
          <span className="w-10 h-10 rounded-xl bg-wash text-brand flex items-center justify-center"><I n={ic} s={18}/></span>
          <span className="flex-1 text-sm font-semibold text-text">{l}</span><I n="chevR" s={16} c={C.text3}/></button>)}</div>
  </Page>;
}
