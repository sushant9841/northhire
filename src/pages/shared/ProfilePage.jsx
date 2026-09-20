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
  const tabs=[{k:"about",label:t("profile.tabAbout"),icon:"user"},{k:"skills",label:t("profile.skillsHead"),icon:"sparkle"},
    {k:"prefs",label:t("profile.tabPreferences"),icon:"target"},{k:"learning",label:t("profile.learning"),icon:"cap"},{k:"refs",label:t("profile.references"),icon:"users"}];

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
            <span className="text-text-2">{t("profile.profileStrength")}</span><span className={`font-bold ${A.completeness>=85?"text-ok":"text-brand"}`}>{A.completeness}%</span></div>
          <Bar v={A.completeness} tone={A.completeness>=85?C.ok:C.brand}/>
          <div className="text-xs text-text-3 mt-2 leading-normal">{A.completenessHint}</div></div></div></Card>

    <Tabs items={tabs} value={tab} onChange={setTab} style={{marginBottom:18}}/>

    {/* The Save/Discard controls at the bottom of this card are easy to lose track of on a long
       tabbed form - this sticky bar keeps unsaved-changes state visible and actionable no matter
       which tab or scroll position the user is on. */}
    {dirty&&<div className="sticky flex items-center justify-between gap-3 bg-tint border border-line-2 rounded-xl py-2.5 px-4 mb-4 z-20" style={{top:72}}>
      <span className="text-sm font-semibold text-brand">{t("profile.unsavedChanges")}</span>
      <div className="flex gap-2">
        <Btn kind="ghost" size="sm" onClick={()=>setD({...u})}>{t("profile.discardBtn")}</Btn>
        <Btn kind="primary" size="sm" icon="check" onClick={()=>A.saveProfile(d)}>{t("profile.saveChanges")}</Btn></div></div>}

    <Card pad={mob?24:32} style={{borderRadius:20}}>
      {tab==="about"&&<div className="flex flex-col gap-4">
        <H2>{t("profile.personalDetails")}</H2>
        <div className={`grid gap-3.5 ${mob?"grid-cols-1":"grid-cols-2"}`}>
          <Field label={t("profile.fullNameLabel")} required><Input value={d.name} onChange={e=>set("name",e.target.value)}/></Field>
          <Field label={t("profile.jobTitleLabel")} required><Input icon="briefcase" value={d.title} onChange={e=>set("title",e.target.value)}/></Field>
          <Field label={t("profile.emailLabel")} required><Input icon="mail" type="email" value={d.email} onChange={e=>set("email",e.target.value)}/></Field>
          <Field label={t("profile.phoneLabel")} required><Input icon="phone" value={d.phone} onChange={e=>set("phone",e.target.value)}/></Field>
          <Field label={t("profile.cityLabel")} required><Input icon="pin" value={d.city} onChange={e=>set("city",e.target.value)}/></Field>
          <Field label={t("profile.provinceLabel")} required><Sel value={PROVS.find(p=>PCODE[p]===d.prov)||"Ontario"}
            onChange={e=>set("prov",PCODE[e.target.value])}>{PROVS.map(p=><option key={p}>{p}</option>)}</Sel></Field>
          <Field label={t("profile.sectorLabel")} required><Sel value={d.cat} onChange={e=>set("cat",e.target.value)}>
            {CATS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</Sel></Field>
          <Field label={t("profile.yearsLabel")} required><Input type="number" value={d.years} onChange={e=>set("years",Number(e.target.value)||0)}/></Field>
          <Field label={t("profile.eduLabel")} style={{gridColumn:mob?"auto":"span 2"}}>
            <Sel value={d.edu} onChange={e=>set("edu",e.target.value)}>
              {[t("profile.edu0"),t("profile.edu1"),t("profile.edu2"),t("profile.edu3"),t("profile.edu4"),t("profile.edu5")].map(o=><option key={o}>{o}</option>)}</Sel></Field>
          <Field label={t("profile.eligibilityLabel")} style={{gridColumn:mob?"auto":"span 2"}}>
            <Sel value={d.eligible} onChange={e=>set("eligible",e.target.value)}>
              <option value="citizen">{t("profile.elig0")}</option>
              <option value="permit">{t("profile.elig1")}</option>
              <option value="student">{t("profile.elig2")}</option>
              <option value="need">{t("profile.elig3")}</option></Sel></Field>
          <Field label={t("profile.summaryLabel")} style={{gridColumn:mob?"auto":"span 2"}} hint={t("profile.summaryHint")}>
            <Area rows={4} value={d.summary||""} onChange={e=>set("summary",e.target.value)}
              placeholder={t("profile.summaryPlaceholder",{years:d.years||0,title:(d.title||"role").toLowerCase(),city:d.city||"your city"})}/></Field></div></div>}

      {tab==="skills"&&<div>
        <H2 sub={t("profile.skillsSub")}>{t("profile.skillsHead")}</H2>
        <div className="flex gap-2.5 mb-4">
          <Input placeholder={t("profile.skillPlaceholder")} value={skill} onChange={e=>setSkill(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addSkill(skill);}}}/>
          <Btn kind="primary" icon="plus" disabled={!skill.trim()} onClick={()=>addSkill(skill)}>{t("profile.skillAddBtn")}</Btn></div>
        <div className="flex flex-wrap gap-2 mb-6">
          {d.skills.map(s=><span key={s} className="inline-flex items-center gap-2 bg-brand text-white text-sm font-semibold py-1.5 px-3 rounded-lg" style={{animation:"pop .2s ease"}}>{s}
            <button onClick={()=>set("skills",d.skills.filter(x=>x!==s))} className="bg-transparent border-0 text-white/70 cursor-pointer p-0 flex"><I n="x" s={13} w={2.5}/></button></span>)}
          {d.skills.length===0&&<span className="text-sm text-text-3">{t("profile.noSkillsYet")}</span>}</div>
        {SUG.length>0&&<><Lbl>{t("profile.commonSkills",{sector:CATM[d.cat]?.label})}</Lbl>
          <div className="flex flex-wrap gap-2">
            {SUG.map(s=><button key={s} onClick={()=>addSkill(s)} className="inline-flex items-center gap-1.5 bg-white border-2 border-dashed border-line text-text-2 text-sm font-medium py-1.5 px-3 rounded-lg cursor-pointer"><I n="plus" s={13} c={C.brand} w={2.4}/>{s}</button>)}</div></>}</div>}

      {tab==="prefs"&&<div className="flex flex-col gap-5">
        <H2 sub={t("profile.jobPrefsSub")}>{t("profile.jobPrefs")}</H2>
        <Field label={t("profile.payLabel")} required>
          <div className="flex gap-2.5">
            <Input icon="wallet" value={d.payMin} onChange={e=>set("payMin",Number(e.target.value.replace(/[^\d.]/g,""))||0)}/>
            <Sel value={d.payUnit} onChange={e=>set("payUnit",e.target.value)} style={{width:135,flexShrink:0}}>
              <option value="hr">{t("profile.payPerHour")}</option><option value="yr">{t("profile.payPerYear")}</option></Sel></div></Field>
        <div><Lbl>{t("profile.employmentType")}</Lbl>
          <div className={`grid gap-2.5 ${mob?"grid-cols-2":"grid-cols-3"}`}>
            {[t("profile.fullTime"),t("profile.partTime"),t("profile.contract"),t("profile.seasonal"),t("profile.apprenticeship"),t("profile.casual")].map(typ=>{const on=d.types.includes(typ);
              return <button key={typ} onClick={()=>set("types",on?d.types.filter(x=>x!==typ):[...d.types,typ])}
                className={`py-3 px-3 rounded-xl cursor-pointer text-sm border-2 transition duration-150 ${on?"font-semibold border-brand bg-tint text-brand":"font-medium border-line bg-white text-text"}`}>{typ}</button>;})}</div></div>
        <div><Lbl>{t("profile.whereWork")}</Lbl>
          <div className="grid grid-cols-3 gap-2.5">
            {[t("profile.onSite"),t("profile.hybrid"),t("profile.remote")].map(mod=>{const on=d.modes.includes(mod);
              return <button key={mod} onClick={()=>set("modes",on?d.modes.filter(x=>x!==mod):[...d.modes,mod])}
                className={`py-3 px-3 rounded-xl cursor-pointer text-sm border-2 transition duration-150 ${on?"font-semibold border-brand bg-tint text-brand":"font-medium border-line bg-white text-text"}`}>{mod}</button>;})}</div></div>
        <Field label={t("profile.whenStart")}><Sel value={d.startWhen||t("profile.startWeek")} onChange={e=>set("startWhen",e.target.value)}>
          {[t("profile.startImmediately"),t("profile.startWeek"),t("profile.startMonth"),t("profile.startPlus")].map(o=><option key={o}>{o}</option>)}</Sel></Field>
        {/* Priority-4 #6: CASL consent for silver-medalist re-engagement matching - a seeker who
            reached Interview/Offer/Withdrawn with an employer gets matched against that same
            employer's future live roles ONLY if this box is checked. Off by default, revocable
            at any time; the next weekly batch simply stops creating new matches for them once
            unchecked (see server/lib/silverMedalist.js). */}
        <div className="border border-line rounded-xl p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={!!d.optInFutureOpportunities} onChange={e=>set("optInFutureOpportunities",e.target.checked)}
              className="mt-0.5 w-4.5 h-4.5 accent-brand shrink-0"/>
            <span className="text-sm font-semibold text-text">{t("profile.futureOppsOptInLabel")}</span>
          </label>
          <div className="text-xs text-text-3 leading-relaxed mt-2 flex flex-col gap-1.5">
            <p className="m-0">{t("profile.futureOppsDisclaimerEn")}</p>
            <p className="m-0">{t("profile.futureOppsDisclaimerFr")}</p>
          </div>
        </div></div>}

      {tab==="learning"&&<div>
        <H2 sub={t("profile.learnSub")} action={<Btn kind="outline" size="sm" onClick={()=>A.go("trainings")}>{t("profile.browseTrainings")}</Btn>}>{t("profile.learning")}</H2>
        {A.enrolled.size===0?<Empty icon="cap" title={t("profile.noTrainings")}
          body={t("profile.noTrainingsBody")}
          action={<Btn kind="primary" onClick={()=>A.go("trainings")}>{t("profile.browseTrainings")}</Btn>}/>
          :<div className="flex flex-col gap-3">
            {A.trainings.filter(trn=>A.enrolled.has(trn.id)).map(trn=>{const p=A.trainingProgress[trn.id]||0;
              return <div key={trn.id} className="flex gap-3.5 items-center border border-line rounded-xl p-3.5">
                <div className="w-15 h-11 rounded-lg overflow-hidden shrink-0"><SmartScene kind={trn.scene} tone={trn.tone} h={44} seed={trn.id.charCodeAt(1)||0}/></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-text">{trn.title}</div>
                  <div className="mt-2"><Bar v={p} tone={p>=100?C.ok:C.brand} h={5}/></div>
                  <div className="text-xs text-text-3 mt-1">{p>=100?t("profile.completed"):t("profile.percentComplete",{pct:p})}</div></div>
                <Btn kind={p>=100?"outline":"primary"} size="sm" onClick={()=>p>=100?A.printCert(trn):A.openTraining(trn.id)}>
                  {p>=100?t("profile.certificate"):t("profile.continueBtn")}</Btn></div>;})}</div>}
        {/* H1: badges published from an employer's HR Suite once you've opted in to the
            HR<->NorthHire profile sync (see the "Sync your NorthHire profile?" prompt in HR
            Suite). Separate from training certificates above - these are employer-awarded
            recognition, not course completion. */}
        {(u.badges||[]).length>0&&<div style={{marginTop:24}}>
          <Lbl>{t("profile.badgesLabel")}</Lbl>
          <div className="flex flex-wrap gap-2">
            {[...u.badges].sort((a,b)=>new Date(b.awardedAt||0)-new Date(a.awardedAt||0)).map((b,i)=>
              <span key={i} title={b.company?t("profile.badgeFromCompany",{company:b.company}):undefined}
                className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-warn-bg text-warn border border-warn-ln rounded-full text-xs font-semibold">
                <I n="award" s={13}/>{b.name}</span>)}
          </div>
        </div>}</div>}

      {tab==="refs"&&<div>
        <H2 sub={t("profile.refSub")} action={<Btn kind="outline" size="sm" icon="plus" onClick={()=>setShowRef(true)}>{t("profile.addRefBtn")}</Btn>}>{t("profile.references")}</H2>
        {A.references.filter(r=>r.user===u.id).length===0
          ? <Empty icon="users" title={t("profile.noReferences")} body={t("profile.noRefBody")}
              action={<Btn kind="primary" icon="plus" onClick={()=>setShowRef(true)}>{t("profile.addFirstRef")}</Btn>}/>
          : <div className="flex flex-col gap-3">
              {A.references.filter(r=>r.user===u.id).map(r=><div key={r.id} className="flex gap-3.5 items-center p-3.5 border border-line rounded-xl">
                <div className="w-11 h-11 rounded-xl bg-wash text-brand flex items-center justify-center shrink-0 font-bold text-base">{r.name?.charAt(0)?.toUpperCase()||"?"}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-text">{r.name}</div>
                  <div className="text-sm text-text-2 mt-1">{r.title}{r.company?` at ${r.company}`:""}</div>
                  <div className="text-xs text-text-3 mt-1">{r.email} • {r.phone||t("profile.noPhone")}</div>
                  {r.relationship&&<div className="text-xs text-text-3 mt-1 italic">{r.relationship}</div>}</div>
                <Btn kind="ghost" size="xs" icon="trash" onClick={()=>A.removeReference(r.id)}/></div>)}</div>}
      </div>}
      {showRef&&<Modal onClose={()=>setShowRef(false)} title={t("profile.addRefModal")}>
        <div className="flex flex-col gap-3.5">
          <Field label={t("profile.fullNameLabel")} required><Input value={ref.name} onChange={e=>setRef({...ref,name:e.target.value})} placeholder={t("profile.nameExample")}/></Field>
          <div className={`grid gap-3 ${mob?"grid-cols-1":"grid-cols-2"}`}>
            <Field label={t("profile.jobTitleField")}><Input value={ref.title} onChange={e=>setRef({...ref,title:e.target.value})} placeholder={t("profile.titleExample")}/></Field>
            <Field label={t("profile.companyField")}><Input value={ref.company} onChange={e=>setRef({...ref,company:e.target.value})} placeholder={t("profile.companyExample")}/></Field>
            <Field label={t("profile.emailField")}><Input icon="mail" type="email" value={ref.email} onChange={e=>setRef({...ref,email:e.target.value})} placeholder={t("profile.emailExample")}/></Field>
            <Field label={t("profile.phoneField")}><Input icon="phone" value={ref.phone} onChange={e=>setRef({...ref,phone:e.target.value})} placeholder={t("profile.phoneExample")}/></Field></div>
          <Field label={t("profile.relationshipLabel")} hint={t("profile.relationshipHint")}><Input value={ref.relationship} onChange={e=>setRef({...ref,relationship:e.target.value})} placeholder={t("profile.relationshipExample")}/></Field>
          <div className="flex gap-2.5 justify-end">
            <Btn kind="ghost" onClick={()=>setShowRef(false)}>{t("profile.cancelBtn")}</Btn>
            <Btn kind="primary" icon="check" disabled={!ref.name||!ref.email} onClick={()=>{A.addReference(ref);setRef({name:"",title:"",company:"",email:"",phone:"",relationship:""});setShowRef(false);}}>{t("profile.addRefBtnModal")}</Btn></div>
        </div></Modal>}
      <div className="flex gap-2.5 justify-end mt-6 pt-5 border-t border-line-soft">
        {dirty&&<Btn kind="ghost" onClick={()=>setD({...u})}>{t("profile.discardChanges")}</Btn>}
        <Btn kind="primary" icon="check" disabled={!dirty} onClick={()=>A.saveProfile(d)}>{dirty?t("profile.saveChanges"):t("profile.saved")}</Btn></div>
    </Card>
    <_DemographicsSection A={A} t={t} mob={mob}/>
      </div>
    </section>
  </div>;
}

/* ═══════════════ D&I self-ID (Priority-4 #3) ═══════════════
   Entirely voluntary and confidential - never shown to an employer as an individual record, only
   ever read back by the seeker themselves and folded into an employer's SUPPRESSED aggregate
   report (see EmpAnalyticsPage's diversity section). Dismissal is a per-viewer UI convenience
   (like a collapsed panel), stored in localStorage, not a feature - the underlying answers stay
   fully server-owned via A.demographics / A.saveDemographics. */
const DEMO_FIELD_DEFS=[
  {key:"ageBand",labelKey:"demoAgeBand",options:["under-20","20-29","30-39","40-49","50-59","60-plus","prefer-not-to-say"]},
  {key:"gender",labelKey:"demoGender",options:["woman","man","non-binary","other","prefer-not-to-say"]},
  {key:"indigenous",labelKey:"demoIndigenous",options:["yes","no","prefer-not-to-say"]},
  {key:"racialized",labelKey:"demoRacialized",options:["yes","no","prefer-not-to-say"]},
  {key:"disability",labelKey:"demoDisability",options:["yes","no","prefer-not-to-say"]},
  {key:"lgbtq",labelKey:"demoLgbtq",options:["yes","no","prefer-not-to-say"]},
];
function _DemographicsSection({A,t,mob}){
  const dismissKey=`northhire.demographics.dismissed.${A.user?.id||""}`;
  const [dismissed,setDismissed]=useState(()=>{try{return localStorage.getItem(dismissKey)==="1";}catch{return false;}});
  const dismiss=v=>{setDismissed(v);try{localStorage.setItem(dismissKey,v?"1":"0");}catch{/* per-viewer convenience only - fine if storage is unavailable */}};
  const set=(field,value)=>A.saveDemographics({[field]:value});
  if(dismissed)return <div className="flex items-center justify-between gap-3 py-3 px-4 mt-4 border border-line-soft rounded-xl bg-white">
    <span className="text-sm text-text-2">{t("profile.demoDismissedNote")}</span>
    <Btn kind="ghost" size="sm" onClick={()=>dismiss(false)}>{t("profile.demoShowAgain")}</Btn>
  </div>;
  return <Card pad={mob?24:32} style={{borderRadius:20,marginTop:18}}>
    <div className="flex justify-between items-start gap-3 flex-wrap mb-1">
      <H2 sub={t("profile.demoSub")}>{t("profile.demoTitle")}</H2>
      <Btn kind="ghost" size="sm" onClick={()=>dismiss(true)}>{t("profile.demoDismissBtn")}</Btn>
    </div>
    <div className="text-xs text-text-3 leading-relaxed border border-line-soft rounded-xl p-3 mb-5 flex flex-col gap-2">
      <p className="m-0">{t("profile.demoDisclaimerEn")}</p>
      <p className="m-0">{t("profile.demoDisclaimerFr")}</p>
    </div>
    <div className="flex flex-col gap-5">
      {DEMO_FIELD_DEFS.map(f=><div key={f.key}>
        <Lbl>{t(`profile.${f.labelKey}`)}</Lbl>
        <div className="flex flex-wrap gap-2">
          {f.options.map(opt=>{const on=A.demographics?.[f.key]===opt;
            return <button key={opt} type="button" onClick={()=>set(f.key,opt)}
              className={`py-2 px-3 rounded-lg cursor-pointer text-sm border-2 transition duration-150 ${on?"font-semibold border-brand bg-tint text-brand":"font-medium border-line bg-white text-text-2"}`}>
              {t(`profile.demoOpt_${opt.replace(/-/g,"_")}`)}</button>;})}
        </div>
      </div>)}
    </div>
  </Card>;
}

/* ═══════════════ EMPLOYER SUITE ═══════════════ */
export function EmployerAccountPage(){
  const A=use(); const { t } = useTranslation(); const mob=useMedia("(max-width: 900px)");
  if(A.user.role==="admin") return <AdminAccountPage/>;
  const e=A.company;
  return <Page narrow>
    <H1 sub={t("profile.employerAccountSub")}
      action={<Btn kind="outline" size="sm" icon="gear" onClick={()=>A.go("settings")}>{t("profile.settingsBtn")}</Btn>}>{t("profile.accountTag")}</H1>
    <Card pad={mob?18:24} style={{marginBottom:16}}>
      <div className="flex gap-4 items-center flex-wrap">
        <EmpMark e={e} size={mob?60:72} radius={18}/>
        <div className="flex-[1_1_200px] min-w-0">
          <div className="flex gap-2.5 items-center flex-wrap">
            <span className={`font-bold text-text tracking-tight ${mob?"text-xl":"text-2xl"}`}>{e.name}</span>
            {e.verified?<Tag tone="ok" sm icon="checkC2">{t("profile.verified")}</Tag>:<Tag tone="warn" sm icon="clock">{t("profile.pending")}</Tag>}</div>
          <div className="text-sm text-text-2 mt-1.5">{e.industry} • {e.city}, {e.prov} • {e.size} {t("profile.employees")}</div>
          <div className="text-sm text-text-3 mt-1">{A.user.email}</div></div>
        <Btn kind="primary" icon="edit" onClick={()=>A.go("empCompany")}>{t("profile.editCompany")}</Btn></div></Card>
    <div className={`grid gap-3 ${mob?"grid-cols-1":"grid-cols-2"}`}>
      {[["home",t("profile.dashboard"),"empHome"],["briefcase",t("profile.myListings"),"empJobs"],["users",t("profile.candidates"),"empPipeline"],
        ["book",t("profile.articlesTrainings"),"empContent"],["wallet",t("profile.billing"),"empBilling"],["gear",t("profile.platformSettings"),"settings"]].map(([ic,lbl,p])=>
        <button key={p} onClick={()=>A.go(p)} className="flex items-center gap-3.5 py-4 px-5 bg-white border border-line rounded-2xl cursor-pointer text-left transition duration-150 hover:border-brand">
          <span className="w-10 h-10 rounded-xl bg-wash text-brand flex items-center justify-center"><I n={ic} s={18}/></span>
          <span className="flex-1 text-sm font-semibold text-text">{lbl}</span><I n="chevR" s={16} c={C.text3}/></button>)}</div>
  </Page>;
}

export function AdminAccountPage(){
  const A=use(); const { t } = useTranslation(); const mob=useMedia("(max-width: 900px)");
  return <Page narrow>
    <H1 sub={t("profile.adminAccountSub")}>{t("profile.accountTag")}</H1>
    <Card pad={mob?18:24} style={{marginBottom:16}}>
      <div className="flex gap-4 items-center flex-wrap">
        <SmartPortrait seed={A.user.seed??0} size={mob?60:72} radius={18}/>
        <div className="flex-[1_1_200px] min-w-0">
          <div className={`font-bold text-text tracking-tight ${mob?"text-xl":"text-2xl"}`}>{A.user.name}</div>
          <div className="text-sm text-text-2 mt-1.5">{t("profile.adminRole")}</div>
          <div className="text-sm text-text-3 mt-1">{A.user.email}</div></div></div></Card>
    <div className={`grid gap-3 ${mob?"grid-cols-1":"grid-cols-2"}`}>
      {[["home",t("profile.overview"),"admHome"],["users",t("profile.users"),"admUsers"],["building",t("profile.employers"),"admEmployers"],
        ["shield",t("profile.jobMod"),"admJobs"],["book",t("profile.articles"),"admBlogs"],["cap",t("profile.trainings"),"admTrainings"],
        ["trend",t("profile.statistics"),"admStats"],["file",t("profile.activityLog"),"admLog"],["gear",t("profile.platformSettings"),"admSettings"]].map(([ic,lbl,p])=>
        <button key={p} onClick={()=>A.go(p)} className="flex items-center gap-3.5 py-4 px-5 bg-white border border-line rounded-2xl cursor-pointer text-left transition duration-150 hover:border-brand">
          <span className="w-10 h-10 rounded-xl bg-wash text-brand flex items-center justify-center"><I n={ic} s={18}/></span>
          <span className="flex-1 text-sm font-semibold text-text">{lbl}</span><I n="chevR" s={16} c={C.text3}/></button>)}</div>
  </Page>;
}
