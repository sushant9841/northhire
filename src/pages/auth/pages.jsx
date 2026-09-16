import { useState, useEffect } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { api } from "../../helpers/api.js";
import { focusFirstError } from "../../helpers/utils.js";
import { C } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Page, Card, Btn, Bar, Field, Input, Banner, Sel, Area, CheckRow, Lbl, Ring, Tag, SmartScene, SmartPortrait, HERO_QUIET } from "../../design/primitives.jsx";
import { CATS, CATM, PROVS } from "../../store/seed/constants.js";
import { TurnstileWidget } from "../shared/formControls.jsx";
import { useTranslation } from "../../i18n/i18n.jsx";

/* ═══════════════ SIGN UP · SIGN IN · FORGOT PASSWORD ═══════════════ */
/* Job Seeker Transformation Tranche 1 (JS-01): the old 6-step wizard (9 fields + 5 selectors
   before value) is replaced for seekers with a single "seekerAccount" step — role tile, email,
   password, first name. Everything else (sector, skills, pay, availability) moves to contextual
   post-signup prompts so a seeker sees jobs in under 30 seconds. The employer wizard is
   untouched — employer onboarding is its own transformation, out of scope here. */
const SU_STEPS_SEEKER=[{k:"role",t:"Get started",d:"Are you looking for work, or hiring?"},
  {k:"seekerAccount",t:"Create your account",d:"Just the basics — you can add more later"}];
const SU_STEPS_EMPLOYER=[{k:"role",t:"Get started",d:"Are you looking for work, or hiring?"},
  {k:"account",t:"Create your account",d:"Work email and a secure password"},
  {k:"company",t:"About your company",d:"Company name, industry and size"}];

const SIGNUP_DRAFT_KEY="northhire.signupDraft";
const _defaultSignupData=()=>({role:"",email:"",password:"",phone:"",first:"",last:"",city:"",prov:"Ontario",eligible:"",
    cat:"",title:"",years:"",edu:"",skills:[],draft:"",payMin:"",payUnit:"hr",types:["Full Time"],modes:["On-site"],
    /* CASL: express consent to a commercial electronic message has to be an affirmative act by
       the recipient, so this box starts UNCHECKED - a pre-ticked box is not consent. */
    startWhen:"Within 2 weeks",alerts:false,
    company:"",industry:"",size:"1-50",about:"",name:"",businessNumber:"",referralCode:"",turnstileToken:null});
const _loadSignupDraft=()=>{try{return JSON.parse(sessionStorage.getItem(SIGNUP_DRAFT_KEY)||"null");}catch{return null;}};

export function SignupPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const {locale,t}=useTranslation(); const isFr=locale==="fr-CA";
  const draft=_loadSignupDraft();
  const [resumed]=useState(!!draft&&draft.i>0);
  const [i,setI]=useState(draft?.i||0); const [err,setErr]=useState({}); const [submitErr,setSubmitErr]=useState("");
  const [d,setD]=useState(draft?.d||_defaultSignupData());
  const STEPS=d.role==="employer"?SU_STEPS_EMPLOYER:SU_STEPS_SEEKER;
  /* A refresh or back-button used to silently wipe an in-progress signup with no warning - persist
     the wizard's state so it survives, and let the person explicitly discard it if they'd rather
     start clean. */
  useEffect(()=>{try{sessionStorage.setItem(SIGNUP_DRAFT_KEY,JSON.stringify({i,d}));}catch{}},[i,d]);
  /* Referral: if the signup URL carries ?ref=CODE, pre-fill the referralCode field and jump
     the wizard into the employer track (only employers can be referred). Strips the query so a
     reload doesn't re-apply. */
  useEffect(()=>{
    const ref=new URLSearchParams(window.location.search).get("ref");
    if(ref){setD(prev=>({...prev,role:prev.role||"employer",referralCode:ref.toUpperCase()}));
      window.history.replaceState({},"",window.location.pathname);}
  },[]);
  const startOver=()=>{try{sessionStorage.removeItem(SIGNUP_DRAFT_KEY);}catch{} setI(0); setD(_defaultSignupData()); setErr({}); setSubmitErr("");};
  const step=STEPS[i];
  const set=(k,v)=>{setD(p=>({...p,[k]:v}));setErr(e=>({...e,[k]:undefined}));setSubmitErr("");};
  const tog=(k,v)=>setD(p=>({...p,[k]:p[k].includes(v)?p[k].filter(x=>x!==v):[...p[k],v]}));
  const add=s=>{const v=s.trim(); if(!v||d.skills.includes(v))return; setD(p=>({...p,skills:[...p.skills,v],draft:""})); setErr(e=>({...e,skills:undefined}));};
  const SUG={trades:["Red Seal","WHMIS","Fall Protection","Blueprint Reading","Hand Tools","Welding","Site Safety","Power Tools"],
    health:["BLS/CPR","Patient Care","Charting","Infection Control","Mobility Assistance","First Aid","Vital Signs","Medication Administration"],
    transport:["Class 1 Licence","Air Brakes","ELD Logs","Pre-trip Inspection","Forklift","Load Securement","Route Planning","Cross-border"],
    retail:["Customer Service","POS Systems","Cash Handling","Merchandising","Inventory","Upselling","Scheduling","Conflict Resolution"],
    hosp:["Food Safe","Knife Skills","Grill Station","Guest Service","Barista","Sanitation","Prep Cooking","Banquet Service"],
    factory:["Forklift","RF Scanner","Quality Control","Assembly","Machine Operation","Lifting 50 lb","5S","Blueprint Reading"],
    admin:["MS Office","Scheduling","Data Entry","Bookkeeping","Reception","Minute Taking","Filing","Customer Records"],
    edu:["Lesson Planning","Classroom Management","Child Development","First Aid","Behaviour Guidance","Literacy","Assessment","Special Needs Support"],
    finance:["Excel","Reconciliation","Bookkeeping","Payroll","QuickBooks","Claims Handling","Compliance","Client Advice"],
    tech:["JavaScript","React","Python","SQL","Git","Cloud","REST APIs","Testing"],
    agri:["Tractor Operation","Harvest Equipment","Livestock Handling","Irrigation","Crop Care","Equipment Maintenance","Packing","Pesticide Safety"],
    security:["Security Licence","CCTV Monitoring","Report Writing","Access Control","Patrolling","De-escalation","First Aid","WHMIS"]}[d.cat]
    /* A sector added to CATS elsewhere without a matching entry here previously fell through to
       an empty list silently - fall back to generic, broadly-applicable suggestions instead. */
    ||["Communication","Time Management","Problem Solving","Teamwork","Attention to Detail","Customer Service"];

  const validate=()=>{const e={};
    if(step.k==="role"&&!d.role)e.role=t("auth.chooseOneToContinue");
    if(step.k==="account"){
      if(!d.email.includes("@"))e.email=t("auth.enterValidEmail");
      else if(A.hasAccount(d.email))e.email=t("auth.accountExists");
      if(d.password.length<8)e.password=t("auth.atLeast8Chars");}
    if(step.k==="seekerAccount"){
      if(!d.first.trim())e.first=t("auth.requiredField");
      if(!d.email.includes("@"))e.email=t("auth.enterValidEmail");
      else if(A.hasAccount(d.email))e.email=t("auth.accountExists");
      if(d.password.length<8)e.password=t("auth.atLeast8Chars");}
    if(step.k==="about"){if(!d.first.trim())e.first=t("auth.requiredField"); if(!d.last.trim())e.last=t("auth.requiredField");
      if(!d.city.trim())e.city=t("auth.requiredField"); if(!d.eligible)e.eligible=t("auth.pleaseChooseOne");}
    if(step.k==="work"){if(!d.cat)e.cat=t("auth.chooseSector");
      if(!d.title.trim())e.title=t("auth.requiredField"); if(!d.years)e.years=t("auth.requiredField");}
    if(step.k==="skills"&&d.skills.length<3)e.skills=t("auth.addAtLeastThree");
    if(step.k==="prefs"&&!d.payMin)e.payMin=t("auth.tellUsMinimum");
    if(step.k==="company"){if(!d.company.trim())e.company=t("auth.companyNameRequired");
      if(!d.name.trim())e.name=t("auth.yourNameRequired");
      if(d.businessNumber.trim()&&!/^\d{9}$/.test(d.businessNumber.replace(/\s/g,"")))e.businessNumber=t("auth.enterBusinessNumber");}
    setErr(e); if(Object.keys(e).length)focusFirstError(e); return !Object.keys(e).length;};

  const [submitting,setSubmitting]=useState(false);
  const submit=async()=>{
    setSubmitting(true); setSubmitErr("");
    const r = d.role==="employer" ? await A.completeEmployerSignup(d) : await A.completeSignup(d);
    setSubmitting(false);
    if(!r.ok){setSubmitErr(r.msg);return;}
    try{sessionStorage.removeItem(SIGNUP_DRAFT_KEY);}catch{}
  };
  const next=async()=>{if(!validate())return; i<STEPS.length-1?setI(i+1):await submit();};

  if(!A.settings.publicSignup) return <Page narrow>
    <Card pad={34} style={{textAlign:"center"}}>
      <div className="w-16 h-16 rounded-full bg-warn-bg border-2 border-warn-ln flex items-center justify-center mx-auto mb-5"><I n="lock" s={28} c={C.warn}/></div>
      <h1 className={`${HERO_QUIET} text-2xl mb-2.5`}>{t("auth.registerClosed")}</h1>
      <p className="text-base text-text-2 leading-relaxed mx-auto mb-6 max-w-sm">
        {t("auth.registerClosedBody")}</p>
      <Btn kind="primary" onClick={()=>A.go("search")}>{t("nav.browseJobs")}</Btn></Card></Page>;

  return <div className="bg-bg min-h-full">
    <div className={`max-w-xl w-full mx-auto ${mob?"pt-5 px-4 pb-9":"pt-8 px-6 pb-13"}`}>
      <div className="flex items-center justify-between mb-3.5">
        <button onClick={()=>A.go("home")} className="flex items-center gap-2 bg-transparent border-0 cursor-pointer p-0 text-text-2 text-sm font-semibold hover:text-text">
          <I n="chevL" s={16} w={2}/> {t("auth.backToNorthHire")}</button>
        <button onClick={()=>A.go("login")} className="bg-transparent border-0 cursor-pointer p-0 text-brand text-sm font-semibold">{t("auth.alreadyHaveAccount")}</button>
      </div>
      {resumed&&<Banner tone="brand" icon="clock" style={{marginBottom:14}}
        action={<button onClick={startOver} className="bg-transparent border-0 p-0 cursor-pointer text-sm font-semibold text-brand">{t("auth.startOver")}</button>}>
        {t("auth.pickedUpWhere")}</Banner>}
      {i>0&&<div className="mb-5">
        <div className="flex justify-between items-center mb-2.5">
          <span className="text-sm font-semibold text-text">{t("auth.stepOfTotal",{step:i,total:STEPS.length-1})}</span>
          <span className="text-sm text-text-2">{t("auth.completePercent",{pct:Math.round((i/(STEPS.length-1))*100)})}</span></div>
        <Bar v={(i/(STEPS.length-1))*100} h={7}/>
        <div className="flex gap-1.5 mt-2.5">
          {STEPS.map((s,idx)=>idx===0?null:
            <button key={s.k} type="button" disabled={idx>i} title={idx<i?`Back to "${s.t}"`:s.t}
              onClick={()=>idx<i&&setI(idx)}
              className={`flex-1 h-1.5 rounded-full border-0 p-0 ${idx<i?"cursor-pointer bg-brand":idx===i?"bg-brand cursor-default":"bg-line cursor-not-allowed"}`}/>)}
        </div></div>}

      <Card pad={mob?22:30} style={{borderRadius:20}}>
        <div key={step.k}>
          <div className="mb-6">
            <h1 className={`${HERO_QUIET} ${mob?"text-2xl":"text-3xl"}`}>{step.t}</h1>
            <p className="text-base text-text-2 mt-2">{step.d}</p></div>

          {step.k==="role"&&<div className={`grid gap-3.5 ${mob?"grid-cols-1":"grid-cols-2"}`}>
            {[{k:"seeker",ic:"user",t:t("auth.seekerRoleTitle"),d:t("auth.seekerRoleBody")},
              {k:"employer",ic:"building",t:t("auth.employerRoleTitle"),d:t("auth.employerRoleBody",{price:A.PLANS.Growth.price})}].map(r=>{
              const on=d.role===r.k;
              return <button key={r.k} onClick={()=>set("role",r.k)}
                className={`rounded-2xl cursor-pointer text-left transition duration-200 border-2 ${mob?"py-6 px-5":"py-7 px-6"} ${on?"border-brand bg-tint":"border-line bg-white"}`}>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3.5 transition duration-200 ${on?"bg-brand text-white":"bg-wash text-brand"}`}>
                  <I n={r.ic} s={22}/></div>
                <div className={`text-base font-bold tracking-tight mb-1.5 ${on?"text-brand":"text-text"}`}>{r.t}</div>
                <div className="text-sm text-text-2 leading-normal">{r.d}</div></button>;})}
            {err.role&&<div className="col-span-full text-sm mt-1.5" style={{color:C.danger}}>{err.role}</div>}
            {(A.oauthProviders.google||A.oauthProviders.github)&&<div className="col-span-full">
              <div className="flex items-center gap-3 my-1"><div className="flex-1 h-px bg-line"/><span className="text-xs text-text-3">{t("auth.orForJobSeekers")}</span><div className="flex-1 h-px bg-line"/></div>
              <div className={`grid gap-2.5 ${mob?"grid-cols-1":"grid-cols-2"}`}>
                {A.oauthProviders.google&&<Btn kind="outline" full icon="globe" onClick={()=>A.oauthStart("google")}>{t("auth.continueWithGoogle")}</Btn>}
                {A.oauthProviders.github&&<Btn kind="outline" full icon="hex" onClick={()=>A.oauthStart("github")}>{t("auth.continueWithGithub")}</Btn>}
              </div>
            </div>}</div>}

          {step.k==="account"&&<div className="flex flex-col gap-4">
            <Field label={t("auth.emailAddress")} required error={err.email} name="email">
              <Input icon="mail" type="email" value={d.email} onChange={e=>set("email",e.target.value)}
                placeholder={d.role==="employer"?"you@yourcompany.ca":"you@example.ca"} invalid={!!err.email}/></Field>
            <Field label={t("auth.createPassword")} required error={err.password} hint={t("auth.createPasswordHint")} name="password">
              <Input icon="lock" type="password" value={d.password} onChange={e=>set("password",e.target.value)} placeholder={t("auth.passwordHint")} invalid={!!err.password}/></Field>
            <Banner tone="neutral" icon="shield" title={t("auth.detailsStayYours")}>
              {t("auth.detailsStayYoursBody")}</Banner></div>}

          {/* Job Seeker Transformation Tranche 1: the entire seeker signup collapses to this one
              screen — first name, email, password. Everything else (sector, skills, pay,
              location) is asked contextually after signup, once the seeker is already looking at
              real jobs, instead of gating them behind a 6-step form up front. */}
          {step.k==="seekerAccount"&&<div className="flex flex-col gap-4">
            <Field label={t("auth.firstName")} required error={err.first} name="first">
              <Input icon="user" value={d.first} onChange={e=>set("first",e.target.value)} placeholder="Jean" invalid={!!err.first}/></Field>
            <Field label={t("auth.emailAddress")} required error={err.email} name="email">
              <Input icon="mail" type="email" value={d.email} onChange={e=>set("email",e.target.value)}
                placeholder="you@example.ca" invalid={!!err.email}/></Field>
            <Field label={t("auth.createPassword")} required error={err.password} hint={t("auth.createPasswordHint")} name="password">
              <Input icon="lock" type="password" value={d.password} onChange={e=>set("password",e.target.value)} placeholder={t("auth.passwordHint")} invalid={!!err.password}/></Field>
            <Banner tone="neutral" icon="shield" title={t("auth.detailsStayYours")}>
              {t("auth.detailsStayYoursBody")}</Banner></div>}

          {step.k==="company"&&<div className="flex flex-col gap-4">
            <Field label={t("auth.yourName")} required error={err.name} name="name"><Input icon="user" value={d.name} onChange={e=>set("name",e.target.value)} placeholder={t("auth.exampleName")} invalid={!!err.name}/></Field>
            <Field label={t("auth.companyName")} required error={err.company} name="company"><Input icon="building" value={d.company} onChange={e=>set("company",e.target.value)} placeholder={t("auth.exampleCompany")} invalid={!!err.company}/></Field>
            <div className={`grid gap-3.5 ${mob?"grid-cols-1":"grid-cols-2"}`}>
              <Field label={t("auth.industry")}><Sel value={d.industry} onChange={e=>set("industry",e.target.value)}>
                <option value="">{t("auth.selectOption")}</option>{["Construction","Healthcare","Transport","Retail","Hospitality","Manufacturing","Professional Services","Education","Finance","Technology","Agriculture","Security"].map(o=><option key={o}>{o}</option>)}</Sel></Field>
              <Field label={t("auth.companySizeLabel")}><Sel value={d.size} onChange={e=>set("size",e.target.value)}>
                {["1-50","50-200","200-1000","1000+"].map(o=><option key={o}>{o}{t("auth.companySizeSuffix")}</option>)}</Sel></Field></div>
            <div className={`grid gap-3.5 ${mob?"grid-cols-1":"grid-cols-2"}`}>
              <Field label={t("auth.city")}><Input icon="pin" value={d.city} onChange={e=>set("city",e.target.value)} placeholder={t("auth.exampleCity")}/></Field>
              <Field label={t("auth.province")}><Sel value={d.prov} onChange={e=>set("prov",e.target.value)}>{PROVS.map(p=><option key={p}>{p}</option>)}</Sel></Field></div>
            <Field label={t("auth.about")} hint={t("auth.aboutHint")}>
              <Area rows={3} value={d.about} onChange={e=>set("about",e.target.value)} placeholder={t("auth.aboutPlaceholder")}/></Field>
            <Field label={t("auth.businessNumber")} error={err.businessNumber} hint={t("auth.businessNumberHint")} name="businessNumber">
              <Input icon="file" value={d.businessNumber} onChange={e=>set("businessNumber",e.target.value)} placeholder="123456789" invalid={!!err.businessNumber}/></Field>
            <Field label={t("auth.referralCode")} hint={t("auth.referralCodeHint")}>
              <Input icon="gift" value={d.referralCode} onChange={e=>set("referralCode",e.target.value.toUpperCase())} placeholder="NH-XXXXXX"/></Field>
            <Banner tone="brand" icon="shield" title={t("auth.verificationBanner")}>
              {t("auth.verificationBannerBody")}</Banner></div>}

          {step.k==="about"&&<div className="flex flex-col gap-4">
            <div className={`grid gap-3.5 ${mob?"grid-cols-1":"grid-cols-2"}`}>
              <Field label={t("auth.firstName")} required error={err.first} name="first"><Input value={d.first} onChange={e=>set("first",e.target.value)} placeholder="Jean" invalid={!!err.first}/></Field>
              <Field label={t("auth.lastName")} required error={err.last} name="last"><Input value={d.last} onChange={e=>set("last",e.target.value)} placeholder="Tremblay" invalid={!!err.last}/></Field>
              <Field label={t("auth.city")} required error={err.city} name="city"><Input icon="pin" value={d.city} onChange={e=>set("city",e.target.value)} placeholder={t("auth.exampleCityAlt")} invalid={!!err.city}/></Field>
              <Field label={t("auth.province")} required><Sel value={d.prov} onChange={e=>set("prov",e.target.value)}>{PROVS.map(p=><option key={p}>{p}</option>)}</Sel></Field></div>
            <Field label={t("auth.workPermit")} required error={err.eligible} name="eligible">
              <div className="flex flex-col gap-2.5">
                {[["citizen",t("auth.citizenOrPR")],["permit",t("auth.validWorkPermit")],
                  ["student",t("auth.studentPermit")],["need",t("auth.needSponsorship")]].map(([v,l])=>
                  <CheckRow key={v} on={d.eligible===v} onChange={()=>set("eligible",v)} label={l}/>)}</div></Field></div>}

          {step.k==="work"&&<div className="flex flex-col gap-5">
            <Field label={t("auth.whichSector")} required error={err.cat} name="cat">
              <div className="grid gap-2.5" style={{gridTemplateColumns:`repeat(auto-fill,minmax(${mob?140:160}px,1fr))`}}>
                {CATS.map(c=>{const on=d.cat===c.id;
                  return <button key={c.id} onClick={()=>set("cat",c.id)}
                    className={`flex items-center gap-2.5 py-3 px-3.5 rounded-xl cursor-pointer text-left border-2 transition duration-150 ${on?"border-brand bg-tint":"border-line bg-white"}`}>
                    <span className={`flex shrink-0 ${on?"text-brand":"text-text-3"}`}><I n={c.icon} s={19}/></span>
                    <span className={`text-sm leading-tight ${on?"font-semibold text-brand":"font-medium text-text"}`}>{c.label}</span></button>;})}</div></Field>
            <Field label={t("auth.jobTitle")} required error={err.title} hint={t("auth.jobTitleHint")} name="title">
              <Input icon="briefcase" value={d.title} onChange={e=>set("title",e.target.value)} placeholder={t("auth.exampleJobTitle")} invalid={!!err.title}/></Field>
            <div className={`grid gap-3.5 ${mob?"grid-cols-1":"grid-cols-2"}`}>
              <Field label={t("auth.yearsExperience")} required error={err.years} name="years">
                <Sel value={d.years} onChange={e=>set("years",e.target.value)} invalid={!!err.years}>
                  <option value="">{t("auth.selectOption")}</option>
                  {[t("auth.noExperience"),t("auth.lessThanYear"),"1-2 years","3-5 years","6-10 years","More than 10 years"].map(o=><option key={o}>{o}</option>)}</Sel></Field>
              <Field label={t("auth.highestEducation")}><Sel value={d.edu} onChange={e=>set("edu",e.target.value)}>
                <option value="">{t("auth.selectOption")}</option>
                {[t("auth.formalEducation"),t("auth.highSchool"),t("auth.apprenticeship"),t("auth.collegeDiploma"),t("auth.bachelorsDegree"),t("auth.postgraduateDegree")].map(o=><option key={o}>{o}</option>)}</Sel></Field></div></div>}

          {step.k==="skills"&&<div>
            <Field label={t("auth.skillsLabel")} required error={err.skills}
              hint={t("auth.skillsHint")} name="skills">
              <div className="flex gap-2.5">
                <Input value={d.draft} onChange={e=>set("draft",e.target.value)} placeholder={t("auth.typeSkill")}
                  onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();add(d.draft);}}} invalid={!!err.skills}/>
                <Btn kind="primary" icon="plus" disabled={!d.draft.trim()} onClick={()=>add(d.draft)}>{t("formControls.inlineListAdd")}</Btn></div></Field>
            {d.skills.length>0&&<div className="flex flex-wrap gap-2 mt-4">
              {d.skills.map(s=><span key={s} className="inline-flex items-center gap-2 bg-brand text-white text-sm font-semibold py-1.5 px-3 rounded-lg">{s}
                <button onClick={()=>set("skills",d.skills.filter(x=>x!==s))} className="bg-transparent border-0 text-white/70 cursor-pointer p-0 flex"><I n="x" s={13} w={2.5}/></button></span>)}</div>}
            {SUG.filter(s=>!d.skills.includes(s)).length>0&&<div className="mt-6">
              <Lbl>{t("auth.commonIn",{sector:CATM[d.cat]?.label})}</Lbl>
              <div className="flex flex-wrap gap-2">
                {SUG.filter(s=>!d.skills.includes(s)).map(s=><button key={s} onClick={()=>add(s)}
                  className="inline-flex items-center gap-1.5 bg-white border-2 border-dashed border-line text-text-2 text-sm font-medium py-1.5 px-3 rounded-lg cursor-pointer">
                  <I n="plus" s={13} c={C.brand} w={2.4}/>{s}</button>)}</div></div>}</div>}

          {step.k==="prefs"&&<div className="flex flex-col gap-5">
            <Field label={t("auth.minimumPayLabel")} required error={err.payMin} name="payMin">
              <div className="flex gap-2.5">
                <Input icon="wallet" value={d.payMin} onChange={e=>set("payMin",e.target.value.replace(/[^\d.]/g,""))}
                  placeholder={d.payUnit==="hr"?"28.00":"60,000"} invalid={!!err.payMin}/>
                <Sel value={d.payUnit} onChange={e=>set("payUnit",e.target.value)} style={{width:135,flexShrink:0}}>
                  <option value="hr">{t("auth.payPerHour")}</option><option value="yr">{t("auth.payPerYear")}</option></Sel></div></Field>
            <div><Lbl>{t("auth.employmentType")}</Lbl>
              <div className={`grid gap-2.5 ${mob?"grid-cols-2":"grid-cols-3"}`}>
                {["Full Time","Part Time","Contract","Seasonal","Apprenticeship","Casual"].map(typ=>{const on=d.types.includes(typ);
                  const label=typ==="Full Time"?t("auth.fullTime"):typ==="Part Time"?t("auth.partTime"):typ==="Contract"?t("auth.contract"):typ==="Seasonal"?t("auth.seasonal"):typ==="Apprenticeship"?t("auth.apprenticeship"):typ==="Casual"?t("auth.casual"):typ;
                  return <button key={typ} onClick={()=>tog("types",typ)}
                    className={`py-3 px-3 rounded-xl cursor-pointer text-sm border-2 transition duration-150 ${on?"font-semibold border-brand bg-tint text-brand":"font-medium border-line bg-white text-text"}`}>{label}</button>;})}</div></div>
            <div><Lbl>{t("auth.whereWork")}</Lbl>
              <div className="grid grid-cols-3 gap-2.5">
                {["On-site","Hybrid","Remote"].map(mod=>{const on=d.modes.includes(mod);
                  const label=mod==="On-site"?t("auth.onSite"):mod==="Hybrid"?t("auth.hybrid"):mod==="Remote"?t("auth.remote"):mod;
                  return <button key={mod} onClick={()=>tog("modes",mod)}
                    className={`py-3 px-3 rounded-xl cursor-pointer text-sm border-2 transition duration-150 ${on?"font-semibold border-brand bg-tint text-brand":"font-medium border-line bg-white text-text"}`}>{label}</button>;})}</div></div>
            <Field label={t("auth.whenStart")}><Sel value={d.startWhen} onChange={e=>set("startWhen",e.target.value)}>
              {[t("auth.immediately"),t("auth.withinWeeks"),t("auth.withinMonth"),t("auth.moreThanMonth")].map(o=><option key={o}>{o}</option>)}</Sel></Field>
            {/* CASL (Loi canadienne anti-pourriel) express-consent text — required in French for
                a Quebec resident under Bill 96, since a job-alert digest is a commercial
                electronic message. Consent capture itself (unchecked-by-default, timestamped
                server-side) is unaffected by which language it's presented in. */}
            <CheckRow on={d.alerts} onChange={v=>set("alerts",v)}
              label={t("auth.emailMatchingJobs")}
              sub={t("auth.emailOptional")}/></div>}
        </div>
        {i===STEPS.length-1&&A.turnstileSiteKey&&<div style={{marginTop:18}}>
          <TurnstileWidget siteKey={A.turnstileSiteKey} onToken={tok=>set("turnstileToken",tok)}/></div>}
        {submitErr&&<Banner tone="danger" icon="alert" title={t("auth.signUpFailed")} style={{marginTop:18}}>{submitErr}</Banner>}
        <div className="flex gap-2.5 justify-between mt-7 pt-5 border-t border-line-soft">
          <Btn kind="ghost" icon="arrowL" onClick={()=>{if(i===0){try{sessionStorage.removeItem(SIGNUP_DRAFT_KEY);}catch{} A.go("home");}else setI(i-1);}}>{i===0?t("common.cancel"):t("common.back")}</Btn>
          <Btn kind="primary" size="lg" iconR={i===STEPS.length-1?"check":"arrowR"} onClick={next}
            disabled={(step.k==="role"&&!d.role)||submitting||(i===STEPS.length-1&&A.turnstileSiteKey&&!d.turnstileToken)}>
            {submitting?t("auth.creatingAccount"):i===STEPS.length-1?(d.role==="employer"?t("auth.createEmployerAccount"):t("auth.finishMatching")):t("common.next")}</Btn></div>
      </Card>
      <div className="text-center mt-5 text-sm text-text-2">
        {t("auth.alreadyHaveAccount")} <button onClick={()=>A.go("login")} className="bg-transparent border-0 p-0 cursor-pointer text-sm font-semibold text-brand">{t("common.signIn")}</button></div>
    </div></div>;
}

export function InviteAcceptPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const {t}=useTranslation();
  const [invite,setInvite]=useState(undefined); // undefined = loading, null = invalid
  const [name,setName]=useState(""); const [pw,setPw]=useState("");
  const [err,setErr]=useState(""); const [busy,setBusy]=useState(false); const [done,setDone]=useState(false);
  useEffect(()=>{let cancelled=false;(async()=>{
    const r=await A.getInvite(A.inviteToken);
    if(!cancelled)setInvite(r.ok?r:null);
  })();return()=>{cancelled=true;};},[A.inviteToken]);
  const submit=async()=>{setErr("");
    if(!name.trim()){setErr(t("auth.inviteEnterName"));return;}
    if(pw.length<8){setErr(t("auth.invitePasswordTooShort"));return;}
    setBusy(true); const r=await A.acceptInvite(A.inviteToken,name.trim(),pw); setBusy(false);
    if(!r.ok){setErr(r.msg);return;} setDone(true);
    setTimeout(()=>A.go("empHome"),1200);
  };
  return <div className={`bg-bg min-h-full flex justify-center ${mob?"pt-6 px-4 pb-10":"pt-12 px-6 pb-20"}`}>
    <div className="w-full max-w-md">
      <div className="flex items-center mb-5">
        <button onClick={()=>A.go("home")} className="flex items-center gap-2 bg-transparent border-0 cursor-pointer p-0 text-text-2 text-sm font-semibold hover:text-text">
          <I n="chevL" s={16} w={2}/> {t("auth.backToNorthHire")}</button>
      </div>
      <Card pad={mob?24:34} style={{borderRadius:20}}>
        {invite===undefined?<p className="text-base text-text-2 m-0">{t("auth.checkingInvite")}</p>
        :invite===null?<>
          <h1 className={`${HERO_QUIET} text-2xl mb-2`}>{t("auth.inviteNotFound")}</h1>
          <p className="text-base text-text-2 mb-6">{t("auth.inviteInvalid")}</p>
          <Btn kind="primary" full onClick={()=>A.go("login")}>{t("auth.goToSignIn")}</Btn>
        </>:done?<>
          <h1 className={`${HERO_QUIET} text-2xl mb-2`}>{t("auth.youreIn")}</h1>
          <p className="text-base text-text-2">{t("auth.takingYouToDashboard")}</p>
        </>:<>
          <Tag tone="brand" icon="users">{t("auth.teamInvite")}</Tag>
          <h1 className={`${HERO_QUIET} text-3xl mt-4 mb-2`}>{t("auth.joinCompany",{company:invite.companyName})}</h1>
          <p className="text-base text-text-2 mb-6">{t("auth.setPasswordFor",{email:invite.email})}</p>
          <div className="flex flex-col gap-3.5">
            <Field label={t("auth.yourName")}><Input icon="user" value={name} onChange={e=>{setName(e.target.value);setErr("");}} placeholder={t("auth.exampleName")}/></Field>
            <Field label={t("auth.createPassword")} hint={t("auth.passwordHint")}>
              <Input icon="lock" type="password" value={pw} onChange={e=>{setPw(e.target.value);setErr("");}} placeholder={t("auth.passwordHint")}/></Field>
            {err&&<Banner tone="danger" icon="alert">{err}</Banner>}
            <Btn kind="primary" size="lg" full iconR="arrowR" onClick={submit} disabled={busy}>{busy?t("auth.joining"):t("auth.joinTeam")}</Btn>
          </div>
        </>}
      </Card>
    </div></div>;
}

export function LoginPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const {t}=useTranslation();
  const [email,setEmail]=useState(""); const [pw,setPw]=useState("");
  const [err,setErr]=useState(""); const [busy,setBusy]=useState(false);
  const [mfa,setMfa]=useState(null); const [code,setCode]=useState("");
  /* Enterprise SSO: as soon as an email's domain is recognised, offer the company's own identity
     provider instead of a password. The lookup answers only "is SSO configured for this domain",
     never whether an ACCOUNT exists, so it can't be used to enumerate users. */
  const [sso,setSso]=useState(null);
  useEffect(()=>{
    const at=email.indexOf("@");
    if(at<0||email.length-at<4){setSso(null);return;}
    let cancelled=false;
    const t=setTimeout(()=>{
      api.get(`/sso/lookup?email=${encodeURIComponent(email)}`)
        .then(r=>{if(!cancelled)setSso(r.sso?r:null);}).catch(()=>{});
    },400);
    return()=>{cancelled=true;clearTimeout(t);};
  },[email]);
  const startSso=async()=>{
    setErr("");setBusy(true);
    try{
      const {url}=await api.get(`/sso/start?email=${encodeURIComponent(email)}`);
      window.location.href=url;
    }catch(e){setErr(e.message);setBusy(false);}
  };
  /* An SSO failure comes back as a redirect param, not a fetch error. */
  useEffect(()=>{
    const p=new URLSearchParams(window.location.search).get("ssoError");
    if(p){setErr(p);window.history.replaceState({},"",window.location.pathname);}
  },[]);
  const submit=async()=>{setErr("");setBusy(true);
    const r=await A.loginWithPassword(email,pw); setBusy(false);
    if(!r.ok&&r.mfaRequired){setMfa(r);setCode("");return;}
    if(!r.ok)setErr(r.msg);
  };
  const demoAs=async(e,p)=>{setEmail(e);setPw(p);setErr("");setBusy(true);
    const r=await A.loginWithPassword(e,p); setBusy(false);
    if(!r.ok&&r.mfaRequired){setMfa(r);setCode("");return;}
    if(!r.ok)setErr(r.msg);
  };
  const [rememberDevice,setRememberDevice]=useState(false);
  const verify=async()=>{setErr("");setBusy(true);
    const r=await A.verifyLogin2FA(mfa.email,code,rememberDevice); setBusy(false);
    if(!r.ok)setErr(r.msg);
  };
  const formCol=(inner)=><div className={`flex-1 min-w-0 flex items-center justify-center bg-white ${mob?"px-4 py-8":"px-10 py-12"}`}>
    <div className="w-full max-w-md">{inner}</div></div>;
  const illusCol=!mob&&<div className="flex-1 min-w-0 relative overflow-hidden bg-wash">
    <SmartScene kind="trades" tone={C.brand} w="100%" h="100%" seed={4} style={{position:"absolute",inset:0}}/>
    <div className="absolute inset-0" style={{background:"linear-gradient(180deg,rgba(11,18,32,0) 40%,rgba(11,18,32,.55) 100%)"}}/>
    <div className="absolute left-8 right-8 bottom-9 text-white">
      <div className="text-2xl font-bold tracking-tight leading-snug mb-2">{t("auth.realJobsHeading")}</div>
      <p className="text-sm text-white/80 leading-relaxed max-w-90">{t("auth.realJobsBody")}</p></div>
    <div className="absolute right-7 top-7 bg-white rounded-2xl py-3 px-4 shadow-lg flex items-center gap-2.5">
      <div className="flex">{[1,3,5].map((s,i)=><div key={s} className={`${i?"-ml-3":""} border-2 border-white rounded-full flex`}><SmartPortrait seed={s} size={28}/></div>)}</div>
      <div><div className="text-sm font-bold text-text">{t("auth.hiredCount")}</div>
        <div className="text-xs text-text-2 mt-0.5">{t("auth.hiredTimeframe")}</div></div></div>
  </div>;

  if(mfa){
    return <div className="bg-white min-h-screen flex">
      {illusCol}
      {formCol(<>
        <button onClick={()=>setMfa(null)} className="flex items-center gap-2 bg-transparent border-0 cursor-pointer p-0 text-text-2 text-sm font-semibold hover:text-text mb-6">
          <I n="chevL" s={16} w={2}/> {t("auth.backToSignIn")}</button>
        <Tag tone="brand" icon="shield">{t("auth.twoFactorVerification")}</Tag>
        <h1 className={`${HERO_QUIET} text-3xl mt-4 mb-2`}>{t("auth.oneMoreStep")}</h1>
        <p className="text-base text-text-2 mb-6">{t("auth.enterCodeFor",{email:mfa.email})}</p>
        <div className="flex flex-col gap-3.5">
          <Field label={t("auth.verificationCode")} hint={mfa.code?t("auth.demoModeCode",{code:mfa.code}):undefined}>
            <Input icon="shield" value={code} onChange={e=>{setCode(e.target.value);setErr("");}} placeholder="123456" maxLength={6}
              onKeyDown={e=>e.key==="Enter"&&verify()}/></Field>
          {err&&<Banner tone="danger" icon="alert" title={t("auth.verificationFailed")}>{err}</Banner>}
          <CheckRow on={rememberDevice} onChange={setRememberDevice}
            label={t("auth.rememberDevice")}
            sub={t("auth.rememberDeviceHint")}/>
          <Btn kind="primary" size="lg" full iconR="arrowR" onClick={verify} disabled={busy||code.length<6}>{busy?t("auth.verifying"):t("auth.verifySignIn")}</Btn>
        </div>
      </>)}
    </div>;
  }
  return <div className="bg-white min-h-screen flex">
    {illusCol}
    {formCol(<>
      <div className="flex items-center justify-between mb-7">
        <button onClick={()=>A.go("home")} className="flex items-center gap-2 bg-transparent border-0 cursor-pointer p-0 text-text-2 text-sm font-semibold hover:text-text">
          <I n="chevL" s={16} w={2}/> {t("auth.backToNorthHire")}</button>
        <button onClick={()=>A.go("signup")} className="bg-transparent border-0 cursor-pointer p-0 text-brand text-sm font-semibold">{t("common.createAccount")}</button>
      </div>
      <Tag tone="brand" icon="user">{t("auth.goodToSeeYou")}</Tag>
      <h1 className={`${HERO_QUIET} text-3xl mt-4 mb-2`}>{t("auth.welcomeBack")}</h1>
      <p className="text-base text-text-2 mb-6">{t("auth.signInToPickUp")}</p>
      <div className="flex flex-col gap-3.5">
        <Field label={t("auth.emailAddress")}>
          <Input icon="mail" type="email" value={email} onChange={e=>{setEmail(e.target.value);setErr("");}} placeholder="you@example.ca"
            onKeyDown={e=>e.key==="Enter"&&submit()}/></Field>
        <Field label={t("auth.password")}>
          <Input icon="lock" type="password" value={pw} onChange={e=>{setPw(e.target.value);setErr("");}} placeholder={t("auth.yourPassword")}
            onKeyDown={e=>e.key==="Enter"&&submit()}/></Field>
        {err&&<Banner tone="danger" icon="alert" title={t("auth.signInFailed")}>{err}</Banner>}
        {sso
          ? <>
              <Btn kind="primary" size="lg" full icon="shield" onClick={startSso} disabled={busy}>
                {busy?t("auth.redirecting"):t("auth.continueWithSSO",{company:sso.company||t("auth.yourCompany")})}</Btn>
              <div className="text-xs text-text-3 text-center -mt-1">
                {t("auth.managedByOrg")}</div>
              <Btn kind="outline" size="lg" full onClick={submit} disabled={busy}>{t("auth.signInPassword")}</Btn>
            </>
          : <Btn kind="primary" size="lg" full iconR="arrowR" onClick={submit} disabled={busy}>{busy?t("auth.signingIn"):t("common.signIn")}</Btn>}
      </div>
      {(A.oauthProviders.google||A.oauthProviders.github)&&<>
        <div className="flex items-center gap-3 my-4"><div className="flex-1 h-px bg-line"/><span className="text-xs text-text-3">{t("auth.orDivider")}</span><div className="flex-1 h-px bg-line"/></div>
        <div className="flex flex-col gap-2.5">
          {A.oauthProviders.google&&<Btn kind="outline" size="lg" full icon="globe" onClick={()=>A.oauthStart("google")}>{t("auth.continueWithGoogle")}</Btn>}
          {A.oauthProviders.github&&<Btn kind="outline" size="lg" full icon="hex" onClick={()=>A.oauthStart("github")}>{t("auth.continueWithGithub")}</Btn>}
        </div>
      </>}
      <div className="flex justify-between mt-4 text-sm">
        <button onClick={()=>A.go("signup")} className="bg-transparent border-0 p-0 cursor-pointer font-semibold text-brand">{t("common.createAccount")}</button>
        <button onClick={()=>A.go("forgot")} className="bg-transparent border-0 p-0 cursor-pointer font-semibold text-brand">{t("auth.forgotPassword")}</button>
      </div>
      {/* Working credentials for four real accounts - including a full administrator - used to be
          printed on the public sign-in page for anyone who loaded it. They stay for local
          development, where they're genuinely useful, but `import.meta.env.DEV` is statically
          replaced with `false` at build time, so a production bundle drops this branch AND the
          credential strings themselves rather than merely hiding them behind a conditional. */}
      {import.meta.env.DEV&&
      <Card pad={mob?18:20} style={{marginTop:22,borderRadius:16,background:C.tint,border:`1px solid ${C.line2}`}}>
        <div className="flex items-center gap-2 mb-2.5">
          <div className="text-xs font-bold text-brand tracking-wide uppercase">{t("auth.demoAccountsTitle")}</div>
          <span className="text-xs font-semibold text-warn bg-warn-bg border border-warn-ln rounded px-1.5 py-px">{t("auth.devOnly")}</span></div>
        <div className="flex flex-col gap-1.5">
          {[["sarah.chen@example.ca","Password123",t("auth.demoSeeker1")],
            ["marcus.b@example.ca","Password123",t("auth.demoSeeker2")],
            ["hr@pcl.com","Employer123",t("auth.demoEmployer")],
            ["admin@northhire.ca","Admin1234",t("auth.demoAdmin")]].map(([e,p,r])=>
            <button key={e} onClick={()=>demoAs(e,p)} className="flex justify-between items-center bg-white border border-line rounded-xl py-2.5 px-3 cursor-pointer">
              <span className="flex flex-col items-start min-w-0">
                <span className="text-sm font-semibold text-text">{r}</span>
                <span className="text-xs text-text-3 mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap">{e}</span></span>
              <span className="text-xs text-brand font-semibold">{t("auth.signInArrow")}</span></button>)}</div>
      </Card>}
    </>)}
  </div>;
}

export function ForgotPasswordPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const {t}=useTranslation();
  const [stage,setStage]=useState("request"); // request | verify | done
  const [email,setEmail]=useState(""); const [code,setCode]=useState(""); const [newPw,setNewPw]=useState("");
  const [err,setErr]=useState(""); const [sentCode,setSentCode]=useState("");
  const [cooldown,setCooldown]=useState(0);
  useEffect(()=>{if(cooldown<=0)return; const tm=setTimeout(()=>setCooldown(c=>c-1),1000); return()=>clearTimeout(tm);},[cooldown]);
  const request=async()=>{setErr("");const r=await A.resetPasswordRequest(email); if(!r.ok){setErr(r.msg);return;}
    setSentCode(r.code); setStage("verify"); setCooldown(60);};
  const resend=async()=>{if(cooldown>0)return; setErr("");const r=await A.resetPasswordRequest(email);
    if(!r.ok){setErr(r.msg);return;} setSentCode(r.code); setCooldown(60);};
  const confirm=async()=>{setErr(""); if(newPw.length<8){setErr(t("auth.passwordTooShort"));return;}
    const r=await A.resetPasswordConfirm(email,code,newPw); if(!r.ok){setErr(r.msg);return;} setStage("done");};

  return <div className={`bg-bg min-h-full flex justify-center ${mob?"pt-6 px-4 pb-10":"pt-12 px-6 pb-20"}`}>
    <div className="w-full max-w-md">
      <div className="flex items-center justify-between mb-5">
        <button onClick={()=>A.go("home")} className="flex items-center gap-2 bg-transparent border-0 cursor-pointer p-0 text-text-2 text-sm font-semibold hover:text-text">
          <I n="chevL" s={16} w={2}/> {t("auth.backToNorthHire")}</button>
        <button onClick={()=>A.go("signup")} className="bg-transparent border-0 cursor-pointer p-0 text-brand text-sm font-semibold">{t("common.createAccount")}</button>
      </div>
      <Card pad={mob?24:34} style={{borderRadius:20}}>
        {stage==="request"&&<>
          <h1 className={`${HERO_QUIET} text-2xl mb-2`}>{t("auth.resetPassword")}</h1>
          <p className="text-sm text-text-2 mb-6 leading-normal">{t("auth.resetPasswordBody")}</p>
          <Field label={t("auth.emailAddress")}><Input icon="mail" type="email" value={email} onChange={e=>{setEmail(e.target.value);setErr("");}}
            placeholder="you@example.ca" onKeyDown={e=>e.key==="Enter"&&request()}/></Field>
          {err&&<Banner tone="danger" icon="alert" title={t("auth.cannotSendCode")} style={{marginTop:14}}>{err}</Banner>}
          <Btn kind="primary" size="lg" full icon="send" onClick={request} style={{marginTop:18}}>{t("auth.sendResetCode")}</Btn>
        </>}
        {stage==="verify"&&<>
          <h1 className={`${HERO_QUIET} text-2xl mb-2`}>{t("auth.enterCode")}</h1>
          <p className="text-sm text-text-2 mb-5 leading-normal">
            {t("auth.sentCodeTo",{email})}</p>
          {sentCode&&<Banner tone="brand" icon="sparkle" title={t("auth.demoModeSentCode")} style={{marginBottom:18}}>
            {t("auth.demoModeSentCodeBody",{code:sentCode})}</Banner>}
          <div className="flex flex-col gap-3.5">
            <Field label={t("auth.verificationCode")}><Input value={code} onChange={e=>{setCode(e.target.value.replace(/\D/g,"").slice(0,6));setErr("");}}
              placeholder="000000" style={{letterSpacing:".15em",fontWeight:640}}/></Field>
            <Field label={t("auth.newPassword")} hint={t("auth.newPasswordHint")}><Input icon="lock" type="password" value={newPw}
              onChange={e=>{setNewPw(e.target.value);setErr("");}} placeholder={t("auth.newPasswordHint")}/></Field>
            {err&&<Banner tone="danger" icon="alert" title={t("auth.cannotReset")}>{err}</Banner>}
            <Btn kind="primary" size="lg" full icon="check" onClick={confirm}>{t("auth.setNewPassword")}</Btn>
            <div className="flex justify-between items-center mt-1.5">
              <button onClick={()=>setStage("request")} className="bg-transparent border-0 p-0 cursor-pointer text-sm text-text-2">{t("auth.differentEmail")}</button>
              <button onClick={resend} disabled={cooldown>0} className={`bg-transparent border-0 p-0 text-sm font-semibold ${cooldown>0?"text-text-3 cursor-not-allowed":"text-brand cursor-pointer"}`}>
                {cooldown>0?t("auth.resendCodeIn",{sec:cooldown}):t("auth.resendCode")}</button>
            </div>
          </div>
        </>}
        {stage==="done"&&<div className="text-center">
          <div className="w-18 h-18 rounded-full bg-ok-bg border-2 border-ok-ln flex items-center justify-center mx-auto mb-5"><I n="check" s={36} c={C.ok} w={2.6}/></div>
          <h1 className={`${HERO_QUIET} text-2xl mb-2.5`}>{t("auth.passwordReset")}</h1>
          <p className="text-sm text-text-2 mx-auto mb-6 leading-relaxed max-w-xs">{t("auth.passwordActive")}</p>
          <Btn kind="primary" size="lg" full onClick={()=>A.go("login")}>{t("common.signIn")}</Btn>
        </div>}
      </Card>
    </div></div>;
}


export function WelcomeTourPage({kind}){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const {t}=useTranslation();
  const [step,setStep]=useState(0);
  const u=A.user;
  useEffect(()=>{if(!u)A.go("home");},[u]);
  if(!u)return null;
  const first=u.name?.split(" ")[0]||t("common.there");

  const seekerSteps=[
    {t:t("auth.welcomeTourTitle",{name:first}),
     s:t("auth.tourSeekerHeroBody"),
     ic:"sparkle",
     visual:"hero"},
    {t:t("auth.tourSeekerCvTitle"),
     s:t("auth.tourSeekerCvBody"),
     ic:"file",
     visual:"cv",
     cta:{label:t("auth.tourCvCta"),go:"cvs"}},
    {t:t("auth.tourSeekerJobsTitle"),
     s:t("auth.tourSeekerJobsBody"),
     ic:"wallet",
     visual:"jobs",
     cta:{label:t("auth.tourJobsCta"),go:"search"}},
    {t:t("auth.tourSeekerMatchTitle"),
     s:t("auth.tourSeekerMatchBody"),
     ic:"target",
     visual:"match"},
    {t:t("auth.tourSeekerTrainTitle"),
     s:t("auth.tourSeekerTrainBody"),
     ic:"cap",
     visual:"trainings",
     cta:{label:t("auth.tourTrainCta"),go:"trainings"}},
    {t:t("auth.tourSeekerDoneTitle"),
     s:t("auth.tourSeekerDoneBody"),
     ic:"check",
     visual:"done",
     cta:{label:t("auth.tourHomeCta"),go:"home"}}
  ];

  const empSteps=[
    {t:t("auth.welcomeTourTitle",{name:first}),
     s:t("auth.tourEmpHeroBody"),
     ic:"sparkle",
     visual:"hero"},
    {t:t("auth.tourEmpPostTitle"),
     s:t("auth.tourEmpPostBody"),
     ic:"plus",
     visual:"post",
     cta:{label:t("auth.tourPostCta"),go:"empPost"}},
    {t:t("auth.tourEmpPipelineTitle"),
     s:t("auth.tourEmpPipelineBody"),
     ic:"users",
     visual:"pipeline"},
    {t:t("auth.tourEmpPoolTitle"),
     s:t("auth.tourEmpPoolBody"),
     ic:"search",
     visual:"pool"},
    {t:t("auth.tourEmpPlanTitle"),
     s:t("auth.tourEmpPlanBody",{growthPrice:A.PLANS.Growth.price,enterprisePrice:A.PLANS.Enterprise.price}),
     ic:"wallet",
     visual:"plan",
     cta:{label:t("auth.tourPlansCta"),go:"pricing"}},
    {t:t("auth.tourEmpDoneTitle"),
     s:t("auth.tourEmpDoneBody"),
     ic:"check",
     visual:"done",
     cta:{label:t("auth.tourDashboardCta"),go:"empHome"}}
  ];

  const steps=kind==="employer"?empSteps:seekerSteps;
  const cur=steps[step];
  const isLast=step===steps.length-1;
  const skip=()=>A.go(kind==="employer"?"empHome":"home");
  const nextStep=()=>{if(isLast){if(cur.cta)A.go(cur.cta.go); else skip();} else setStep(step+1);};

  return <div className={`bg-bg min-h-screen flex flex-col ${mob?"pt-4 px-4 pb-8":"pt-8 px-8 pb-13"}`}>
    <div className="max-w-2xl w-full mx-auto flex-1 flex flex-col">

      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-1.5">
          {steps.map((_,i)=><button key={i} type="button" aria-label={t("auth.tourGoToStep",{n:i+1})} disabled={i>step}
            onClick={()=>i<=step&&setStep(i)}
            className={`h-2 rounded-full border-0 p-0 transition-all duration-300 ${i===step?"w-6":"w-2"} ${i<=step?"bg-brand cursor-pointer":"bg-line cursor-not-allowed"}`}/>)}
        </div>
        <Btn kind="ghost" size="sm" onClick={skip}>{t("auth.skipTour")}</Btn>
      </div>

      <Card pad={mob?26:38} style={{flex:1,display:"flex",flexDirection:"column",borderRadius:24,animation:"rise .4s cubic-bezier(.22,.9,.32,1)",justifyContent:"center"}}>
        <div key={step} style={{animation:"fadeIn .3s ease"}}>
          <div className="w-18 h-18 rounded-2xl text-white flex items-center justify-center mb-6 shadow-[0_8px_20px_-6px_rgba(0,92,204,0.4)]" style={{background:`linear-gradient(135deg,${C.brand} 0%,#003D8C 100%)`}}>
            <I n={cur.ic} s={34}/>
          </div>
          <h1 className={`font-extrabold tracking-tight text-text mb-3.5 leading-tight ${mob?"text-2xl":"text-3xl"}`}>{cur.t}</h1>
          <p className="text-base text-text-2 leading-relaxed mb-7">{cur.s}</p>

          {cur.cta&&!isLast&&<Btn kind="outline" size="sm" icon={cur.ic} style={{marginBottom:20}} onClick={()=>A.go(cur.cta.go)}>{cur.cta.label}</Btn>}

          {cur.visual==="cv"&&<div className="p-4 bg-bg border border-line rounded-xl mb-5 flex gap-3 items-center">
            <div className="w-11 h-11 rounded-xl bg-wash text-brand flex items-center justify-center"><I n="file" s={22}/></div>
            <div><div className="text-sm font-semibold text-text">{t("auth.tourCvCardTitle")}</div>
              <div className="text-xs text-text-3 mt-0.5">{t("auth.tourCvCardSub")}</div></div>
          </div>}
          {cur.visual==="match"&&<div className="p-4 bg-tint border border-line-2 rounded-xl mb-5 flex gap-3 items-center">
            <Ring v={87} size={54}/>
            <div><div className="text-sm font-semibold text-text">{t("auth.tourMatchCardTitle")}</div>
              <div className="text-xs text-text-2 mt-0.5">{t("auth.tourMatchCardSub")}</div></div>
          </div>}
          {cur.visual==="jobs"&&<div className="p-3 bg-ok-bg border border-ok-ln rounded-xl mb-5 flex items-center gap-3">
            <I n="wallet" s={20} c={C.ok}/>
            <div className="text-sm font-semibold text-text">{t("auth.tourJobsCardWage")}</div>
            <Tag tone="ok" sm>{t("auth.tourJobsCardTag")}</Tag>
          </div>}
        </div>

        <div className="mt-auto pt-5 flex justify-between items-center gap-3">
          <Btn kind="ghost" size="md" icon="chevL" disabled={step===0} onClick={()=>setStep(step-1)}>{t("auth.backBtn")}</Btn>
          <div className="text-xs text-text-3">{t("auth.tourStepCounter",{n:step+1,total:steps.length})}</div>
          <Btn kind="primary" size="md" iconR={isLast?"check":"chevR"} onClick={nextStep}>
            {isLast?(cur.cta?.label||t("auth.finishBtn")):t("auth.nextBtn")}
          </Btn>
        </div>
      </Card>
    </div>
  </div>;
}
