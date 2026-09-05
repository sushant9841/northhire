import { useState, useEffect } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Page, Card, Btn, Bar, Field, Input, Banner, Sel, Area, CheckRow, Lbl, Ring, Tag, SmartScene, SmartPortrait, HERO_QUIET } from "../../design/primitives.jsx";
import { CATS, CATM, PROVS, PLANS } from "../../store/seed/constants.js";

/* ═══════════════ SIGN UP · SIGN IN · FORGOT PASSWORD ═══════════════ */
const SU_STEPS_SEEKER=[{k:"role",t:"Get started",d:"Are you looking for work, or hiring?"},
  {k:"account",t:"Create your account",d:"Email and a secure password"},
  {k:"about",t:"About you",d:"Name, location and work eligibility"},
  {k:"work",t:"Your work",d:"Sector, job title and experience"},
  {k:"skills",t:"Your skills",d:"Tickets, certificates and abilities"},
  {k:"prefs",t:"What you are looking for",d:"Pay, job type and availability"}];
const SU_STEPS_EMPLOYER=[{k:"role",t:"Get started",d:"Are you looking for work, or hiring?"},
  {k:"account",t:"Create your account",d:"Work email and a secure password"},
  {k:"company",t:"About your company",d:"Company name, industry and size"}];

const SIGNUP_DRAFT_KEY="northhire.signupDraft";
const _defaultSignupData=()=>({role:"",email:"",password:"",phone:"",first:"",last:"",city:"",prov:"Ontario",eligible:"",
    cat:"",title:"",years:"",edu:"",skills:[],draft:"",payMin:"",payUnit:"hr",types:["Full Time"],modes:["On-site"],
    startWhen:"Within 2 weeks",alerts:true,
    company:"",industry:"",size:"1-50",about:"",name:"",businessNumber:""});
const _loadSignupDraft=()=>{try{return JSON.parse(sessionStorage.getItem(SIGNUP_DRAFT_KEY)||"null");}catch{return null;}};

export function SignupPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const draft=_loadSignupDraft();
  const [resumed]=useState(!!draft&&draft.i>0);
  const [i,setI]=useState(draft?.i||0); const [err,setErr]=useState({}); const [submitErr,setSubmitErr]=useState("");
  const [d,setD]=useState(draft?.d||_defaultSignupData());
  const STEPS=d.role==="employer"?SU_STEPS_EMPLOYER:SU_STEPS_SEEKER;
  /* A refresh or back-button used to silently wipe an in-progress signup with no warning - persist
     the wizard's state so it survives, and let the person explicitly discard it if they'd rather
     start clean. */
  useEffect(()=>{try{sessionStorage.setItem(SIGNUP_DRAFT_KEY,JSON.stringify({i,d}));}catch{}},[i,d]);
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
    if(step.k==="role"&&!d.role)e.role="Choose one to continue";
    if(step.k==="account"){
      if(!d.email.includes("@"))e.email="Enter a valid email address";
      else if(A.hasAccount(d.email))e.email="An account with that email already exists";
      if(d.password.length<8)e.password="At least 8 characters";
      if(d.role==="seeker"&&d.phone.replace(/\D/g,"").length<10)e.phone="Enter a 10-digit phone number";}
    if(step.k==="about"){if(!d.first.trim())e.first="Required"; if(!d.last.trim())e.last="Required";
      if(!d.city.trim())e.city="Required"; if(!d.eligible)e.eligible="Please choose one";}
    if(step.k==="work"){if(!d.cat)e.cat="Choose the sector you work in";
      if(!d.title.trim())e.title="Required"; if(!d.years)e.years="Required";}
    if(step.k==="skills"&&d.skills.length<3)e.skills="Add at least three so we can match you properly";
    if(step.k==="prefs"&&!d.payMin)e.payMin="Tell us the minimum you would accept";
    if(step.k==="company"){if(!d.company.trim())e.company="Company name required";
      if(!d.name.trim())e.name="Your name required";
      if(d.businessNumber.trim()&&!/^\d{9}$/.test(d.businessNumber.replace(/\s/g,"")))e.businessNumber="Enter the 9-digit CRA business number, or leave blank";}
    setErr(e); return !Object.keys(e).length;};

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
      <h1 className={`${HERO_QUIET} text-2xl mb-2.5`}>Registration is temporarily closed</h1>
      <p className="text-base text-text-2 leading-relaxed mx-auto mb-6 max-w-sm">
        New sign-ups have been paused by an administrator. You can still browse every job on the platform.</p>
      <Btn kind="primary" onClick={()=>A.go("search")}>Browse jobs</Btn></Card></Page>;

  return <div className="bg-bg min-h-full">
    <div className={`max-w-xl w-full mx-auto ${mob?"pt-5 px-4 pb-9":"pt-8 px-6 pb-13"}`}>
      <div className="flex items-center justify-between mb-3.5">
        <button onClick={()=>A.go("home")} className="flex items-center gap-2 bg-transparent border-0 cursor-pointer p-0 text-text-2 text-sm font-semibold hover:text-text">
          <I n="chevL" s={16} w={2}/> Back to NorthHire</button>
        <button onClick={()=>A.go("login")} className="bg-transparent border-0 cursor-pointer p-0 text-brand text-sm font-semibold">Already have an account?</button>
      </div>
      {resumed&&<Banner tone="brand" icon="clock" style={{marginBottom:14}}
        action={<button onClick={startOver} className="bg-transparent border-0 p-0 cursor-pointer text-sm font-semibold text-brand">Start over</button>}>
        Picked up where you left off.</Banner>}
      {i>0&&<div className="mb-5">
        <div className="flex justify-between items-center mb-2.5">
          <span className="text-sm font-semibold text-text">Step {i} of {STEPS.length-1}</span>
          <span className="text-sm text-text-2">{Math.round((i/(STEPS.length-1))*100)}% complete</span></div>
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
            {[{k:"seeker",ic:"user",t:"I'm looking for work",d:"Build a profile, browse jobs, apply in one tap. Free forever."},
              {k:"employer",ic:"building",t:"I'm hiring",d:`Post jobs, review scored applicants, manage your pipeline. Free to start, or from $${PLANS.Growth.price}/mo.`}].map(r=>{
              const on=d.role===r.k;
              return <button key={r.k} onClick={()=>set("role",r.k)}
                className={`rounded-2xl cursor-pointer text-left transition duration-200 border-2 ${mob?"py-6 px-5":"py-7 px-6"} ${on?"border-brand bg-tint":"border-line bg-white"}`}>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3.5 transition duration-200 ${on?"bg-brand text-white":"bg-wash text-brand"}`}>
                  <I n={r.ic} s={22}/></div>
                <div className={`text-base font-bold tracking-tight mb-1.5 ${on?"text-brand":"text-text"}`}>{r.t}</div>
                <div className="text-sm text-text-2 leading-normal">{r.d}</div></button>;})}
            {err.role&&<div className="col-span-full text-sm mt-1.5" style={{color:C.danger}}>{err.role}</div>}</div>}

          {step.k==="account"&&<div className="flex flex-col gap-4">
            <Field label="Email address" required error={err.email}>
              <Input icon="mail" type="email" value={d.email} onChange={e=>set("email",e.target.value)}
                placeholder={d.role==="employer"?"you@yourcompany.ca":"you@example.ca"} invalid={!!err.email}/></Field>
            {d.role==="seeker"&&<Field label="Mobile number" required error={err.phone} hint="Employers use this to reach you about interviews.">
              <Input icon="phone" value={d.phone} onChange={e=>set("phone",e.target.value)} placeholder="416 555 0100" invalid={!!err.phone}/></Field>}
            <Field label="Create a password" required error={err.password} hint="At least 8 characters. Mix in a number or symbol for a stronger password.">
              <Input icon="lock" type="password" value={d.password} onChange={e=>set("password",e.target.value)} placeholder="At least 8 characters" invalid={!!err.password}/></Field>
            <Banner tone="neutral" icon="shield" title="Your details stay yours">
              We never sell candidate data. An employer only sees your profile when you choose to apply.</Banner></div>}

          {step.k==="company"&&<div className="flex flex-col gap-4">
            <Field label="Your name" required error={err.name}><Input icon="user" value={d.name} onChange={e=>set("name",e.target.value)} placeholder="Jean Tremblay" invalid={!!err.name}/></Field>
            <Field label="Company name" required error={err.company}><Input icon="building" value={d.company} onChange={e=>set("company",e.target.value)} placeholder="Northern Trades Ltd." invalid={!!err.company}/></Field>
            <div className={`grid gap-3.5 ${mob?"grid-cols-1":"grid-cols-2"}`}>
              <Field label="Industry"><Sel value={d.industry} onChange={e=>set("industry",e.target.value)}>
                <option value="">Select…</option>{["Construction","Healthcare","Transport","Retail","Hospitality","Manufacturing","Professional Services","Education","Finance","Technology","Agriculture","Security"].map(o=><option key={o}>{o}</option>)}</Sel></Field>
              <Field label="Company size"><Sel value={d.size} onChange={e=>set("size",e.target.value)}>
                {["1-50","50-200","200-1000","1000+"].map(o=><option key={o}>{o} employees</option>)}</Sel></Field></div>
            <div className={`grid gap-3.5 ${mob?"grid-cols-1":"grid-cols-2"}`}>
              <Field label="City"><Input icon="pin" value={d.city} onChange={e=>set("city",e.target.value)} placeholder="Toronto"/></Field>
              <Field label="Province"><Sel value={d.prov} onChange={e=>set("prov",e.target.value)}>{PROVS.map(p=><option key={p}>{p}</option>)}</Sel></Field></div>
            <Field label="About your company (optional)" hint="A sentence or two candidates see on your profile.">
              <Area rows={3} value={d.about} onChange={e=>set("about",e.target.value)} placeholder="What you do, and why someone would want to work with you."/></Field>
            <Field label="CRA business number (optional)" error={err.businessNumber} hint="9 digits, e.g. 123456789. Speeds up verification — you can add this later from Company settings instead.">
              <Input icon="file" value={d.businessNumber} onChange={e=>set("businessNumber",e.target.value)} placeholder="123456789" invalid={!!err.businessNumber}/></Field>
            <Banner tone="brand" icon="shield" title="Verification usually takes 1 business day">
              Our Toronto team checks your business number and incorporation. Your listings go live immediately, with the verified badge added once approved.</Banner></div>}

          {step.k==="about"&&<div className="flex flex-col gap-4">
            <div className={`grid gap-3.5 ${mob?"grid-cols-1":"grid-cols-2"}`}>
              <Field label="First name" required error={err.first}><Input value={d.first} onChange={e=>set("first",e.target.value)} placeholder="Jean" invalid={!!err.first}/></Field>
              <Field label="Last name" required error={err.last}><Input value={d.last} onChange={e=>set("last",e.target.value)} placeholder="Tremblay" invalid={!!err.last}/></Field>
              <Field label="City or town" required error={err.city}><Input icon="pin" value={d.city} onChange={e=>set("city",e.target.value)} placeholder="Calgary" invalid={!!err.city}/></Field>
              <Field label="Province or territory" required><Sel value={d.prov} onChange={e=>set("prov",e.target.value)}>{PROVS.map(p=><option key={p}>{p}</option>)}</Sel></Field></div>
            <Field label="Are you legally allowed to work in Canada?" required error={err.eligible}>
              <div className="flex flex-col gap-2.5">
                {[["citizen","Canadian citizen or permanent resident"],["permit","I hold a valid work permit"],
                  ["student","Student permit with work authorisation"],["need","I would need employer sponsorship"]].map(([v,l])=>
                  <CheckRow key={v} on={d.eligible===v} onChange={()=>set("eligible",v)} label={l}/>)}</div></Field></div>}

          {step.k==="work"&&<div className="flex flex-col gap-5">
            <Field label="Which sector do you work in?" required error={err.cat}>
              <div className="grid gap-2.5" style={{gridTemplateColumns:`repeat(auto-fill,minmax(${mob?140:160}px,1fr))`}}>
                {CATS.map(c=>{const on=d.cat===c.id;
                  return <button key={c.id} onClick={()=>set("cat",c.id)}
                    className={`flex items-center gap-2.5 py-3 px-3.5 rounded-xl cursor-pointer text-left border-2 transition duration-150 ${on?"border-brand bg-tint":"border-line bg-white"}`}>
                    <span className={`flex shrink-0 ${on?"text-brand":"text-text-3"}`}><I n={c.icon} s={19}/></span>
                    <span className={`text-sm leading-tight ${on?"font-semibold text-brand":"font-medium text-text"}`}>{c.label}</span></button>;})}</div></Field>
            <Field label="Your job title or trade" required error={err.title} hint="For example: Journeyperson Electrician, PSW, Line Cook.">
              <Input icon="briefcase" value={d.title} onChange={e=>set("title",e.target.value)} placeholder="Journeyperson Electrician" invalid={!!err.title}/></Field>
            <div className={`grid gap-3.5 ${mob?"grid-cols-1":"grid-cols-2"}`}>
              <Field label="Years of experience" required error={err.years}>
                <Sel value={d.years} onChange={e=>set("years",e.target.value)} invalid={!!err.years}>
                  <option value="">Select…</option>
                  {["No experience yet","Less than 1 year","1-2 years","3-5 years","6-10 years","More than 10 years"].map(o=><option key={o}>{o}</option>)}</Sel></Field>
              <Field label="Highest education"><Sel value={d.edu} onChange={e=>set("edu",e.target.value)}>
                <option value="">Select…</option>
                {["No formal education","High school diploma","Apprenticeship / trade certificate","College diploma","Bachelor's degree","Postgraduate degree"].map(o=><option key={o}>{o}</option>)}</Sel></Field></div></div>}

          {step.k==="skills"&&<div>
            <Field label="Add your skills, tickets and certificates" required error={err.skills}
              hint="At least three. These drive every match score you will see.">
              <div className="flex gap-2.5">
                <Input value={d.draft} onChange={e=>set("draft",e.target.value)} placeholder="Type a skill and press Enter"
                  onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();add(d.draft);}}} invalid={!!err.skills}/>
                <Btn kind="primary" icon="plus" disabled={!d.draft.trim()} onClick={()=>add(d.draft)}>Add</Btn></div></Field>
            {d.skills.length>0&&<div className="flex flex-wrap gap-2 mt-4">
              {d.skills.map(s=><span key={s} className="inline-flex items-center gap-2 bg-brand text-white text-sm font-semibold py-1.5 px-3 rounded-lg">{s}
                <button onClick={()=>set("skills",d.skills.filter(x=>x!==s))} className="bg-transparent border-0 text-white/70 cursor-pointer p-0 flex"><I n="x" s={13} w={2.5}/></button></span>)}</div>}
            {SUG.filter(s=>!d.skills.includes(s)).length>0&&<div className="mt-6">
              <Lbl>Common in {CATM[d.cat]?.label} — tap to add</Lbl>
              <div className="flex flex-wrap gap-2">
                {SUG.filter(s=>!d.skills.includes(s)).map(s=><button key={s} onClick={()=>add(s)}
                  className="inline-flex items-center gap-1.5 bg-white border-2 border-dashed border-line text-text-2 text-sm font-medium py-1.5 px-3 rounded-lg cursor-pointer">
                  <I n="plus" s={13} c={C.brand} w={2.4}/>{s}</button>)}</div></div>}</div>}

          {step.k==="prefs"&&<div className="flex flex-col gap-5">
            <Field label="Minimum pay you would accept" required error={err.payMin}>
              <div className="flex gap-2.5">
                <Input icon="wallet" value={d.payMin} onChange={e=>set("payMin",e.target.value.replace(/[^\d.]/g,""))}
                  placeholder={d.payUnit==="hr"?"28.00":"60,000"} invalid={!!err.payMin}/>
                <Sel value={d.payUnit} onChange={e=>set("payUnit",e.target.value)} style={{width:135,flexShrink:0}}>
                  <option value="hr">per hour</option><option value="yr">per year</option></Sel></div></Field>
            <div><Lbl>Employment type — pick any that suit you</Lbl>
              <div className={`grid gap-2.5 ${mob?"grid-cols-2":"grid-cols-3"}`}>
                {["Full Time","Part Time","Contract","Seasonal","Apprenticeship","Casual"].map(t=>{const on=d.types.includes(t);
                  return <button key={t} onClick={()=>tog("types",t)}
                    className={`py-3 px-3 rounded-xl cursor-pointer text-sm border-2 transition duration-150 ${on?"font-semibold border-brand bg-tint text-brand":"font-medium border-line bg-white text-text"}`}>{t}</button>;})}</div></div>
            <div><Lbl>Where can you work?</Lbl>
              <div className="grid grid-cols-3 gap-2.5">
                {["On-site","Hybrid","Remote"].map(t=>{const on=d.modes.includes(t);
                  return <button key={t} onClick={()=>tog("modes",t)}
                    className={`py-3 px-3 rounded-xl cursor-pointer text-sm border-2 transition duration-150 ${on?"font-semibold border-brand bg-tint text-brand":"font-medium border-line bg-white text-text"}`}>{t}</button>;})}</div></div>
            <Field label="When can you start?"><Sel value={d.startWhen} onChange={e=>set("startWhen",e.target.value)}>
              {["Immediately","Within 2 weeks","Within 1 month","More than 1 month"].map(o=><option key={o}>{o}</option>)}</Sel></Field>
            <CheckRow on={d.alerts} onChange={v=>set("alerts",v)} label="Email me new matching jobs"
              sub="A short digest, at most twice a week. You can turn this off any time."/></div>}
        </div>
        {submitErr&&<Banner tone="danger" icon="alert" title="Sign-up failed" style={{marginTop:18}}>{submitErr}</Banner>}
        <div className="flex gap-2.5 justify-between mt-7 pt-5 border-t border-line-soft">
          <Btn kind="ghost" icon="arrowL" onClick={()=>{if(i===0){try{sessionStorage.removeItem(SIGNUP_DRAFT_KEY);}catch{} A.go("home");}else setI(i-1);}}>{i===0?"Cancel":"Back"}</Btn>
          <Btn kind="primary" size="lg" iconR={i===STEPS.length-1?"check":"arrowR"} onClick={next} disabled={(step.k==="role"&&!d.role)||submitting}>
            {submitting?"Creating account…":i===STEPS.length-1?(d.role==="employer"?"Create employer account":"Finish and start matching"):"Continue"}</Btn></div>
      </Card>
      <div className="text-center mt-5 text-sm text-text-2">
        Already have an account? <button onClick={()=>A.go("login")} className="bg-transparent border-0 p-0 cursor-pointer text-sm font-semibold text-brand">Sign in</button></div>
    </div></div>;
}

export function InviteAcceptPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [invite,setInvite]=useState(undefined); // undefined = loading, null = invalid
  const [name,setName]=useState(""); const [pw,setPw]=useState("");
  const [err,setErr]=useState(""); const [busy,setBusy]=useState(false); const [done,setDone]=useState(false);
  useEffect(()=>{let cancelled=false;(async()=>{
    const r=await A.getInvite(A.inviteToken);
    if(!cancelled)setInvite(r.ok?r:null);
  })();return()=>{cancelled=true;};},[A.inviteToken]);
  const submit=async()=>{setErr("");
    if(!name.trim()){setErr("Enter your name");return;}
    if(pw.length<8){setErr("Password must be at least 8 characters");return;}
    setBusy(true); const r=await A.acceptInvite(A.inviteToken,name.trim(),pw); setBusy(false);
    if(!r.ok){setErr(r.msg);return;} setDone(true);
    setTimeout(()=>A.go("empHome"),1200);
  };
  return <div className={`bg-bg min-h-full flex justify-center ${mob?"pt-6 px-4 pb-10":"pt-12 px-6 pb-20"}`}>
    <div className="w-full max-w-md">
      <div className="flex items-center mb-5">
        <button onClick={()=>A.go("home")} className="flex items-center gap-2 bg-transparent border-0 cursor-pointer p-0 text-text-2 text-sm font-semibold hover:text-text">
          <I n="chevL" s={16} w={2}/> Back to NorthHire</button>
      </div>
      <Card pad={mob?24:34} style={{borderRadius:20}}>
        {invite===undefined?<p className="text-base text-text-2 m-0">Checking your invite…</p>
        :invite===null?<>
          <h1 className={`${HERO_QUIET} text-2xl mb-2`}>Invite not found</h1>
          <p className="text-base text-text-2 mb-6">This invite link is invalid or has already been used. Ask your account owner to send a new one.</p>
          <Btn kind="primary" full onClick={()=>A.go("login")}>Go to sign in</Btn>
        </>:done?<>
          <h1 className={`${HERO_QUIET} text-2xl mb-2`}>You're in</h1>
          <p className="text-base text-text-2">Taking you to the employer dashboard…</p>
        </>:<>
          <Tag tone="brand" icon="users">Team invite</Tag>
          <h1 className={`${HERO_QUIET} text-3xl mt-4 mb-2`}>Join {invite.companyName}</h1>
          <p className="text-base text-text-2 mb-6">Set your name and a password for {invite.email}.</p>
          <div className="flex flex-col gap-3.5">
            <Field label="Your name"><Input icon="user" value={name} onChange={e=>{setName(e.target.value);setErr("");}} placeholder="Jean Tremblay"/></Field>
            <Field label="Create a password" hint="At least 8 characters.">
              <Input icon="lock" type="password" value={pw} onChange={e=>{setPw(e.target.value);setErr("");}} placeholder="At least 8 characters"/></Field>
            {err&&<Banner tone="danger" icon="alert">{err}</Banner>}
            <Btn kind="primary" size="lg" full iconR="arrowR" onClick={submit} disabled={busy}>{busy?"Joining…":"Join the team"}</Btn>
          </div>
        </>}
      </Card>
    </div></div>;
}

export function LoginPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [email,setEmail]=useState(""); const [pw,setPw]=useState("");
  const [err,setErr]=useState(""); const [busy,setBusy]=useState(false);
  const [mfa,setMfa]=useState(null); const [code,setCode]=useState("");
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
  const verify=async()=>{setErr("");setBusy(true);
    const r=await A.verifyLogin2FA(mfa.email,code); setBusy(false);
    if(!r.ok)setErr(r.msg);
  };
  const formCol=(inner)=><div className={`flex-1 min-w-0 flex items-center justify-center bg-white ${mob?"px-4 py-8":"px-10 py-12"}`}>
    <div className="w-full max-w-md">{inner}</div></div>;
  const illusCol=!mob&&<div className="flex-1 min-w-0 relative overflow-hidden bg-wash">
    <SmartScene kind="trades" tone={C.brand} w="100%" h="100%" seed={4} style={{position:"absolute",inset:0}}/>
    <div className="absolute inset-0" style={{background:"linear-gradient(180deg,rgba(11,18,32,0) 40%,rgba(11,18,32,.55) 100%)"}}/>
    <div className="absolute left-8 right-8 bottom-9 text-white">
      <div className="text-2xl font-bold tracking-tight leading-snug mb-2">Real Canadian jobs.<br/>Real people hired.</div>
      <p className="text-sm text-white/80 leading-relaxed max-w-90">Every listing shows the wage upfront — no guessing, no "competitive salary."</p></div>
    <div className="absolute right-7 top-7 bg-white rounded-2xl py-3 px-4 shadow-lg flex items-center gap-2.5">
      <div className="flex">{[1,3,5].map((s,i)=><div key={s} className={`${i?"-ml-3":""} border-2 border-white rounded-full flex`}><SmartPortrait seed={s} size={28}/></div>)}</div>
      <div><div className="text-sm font-bold text-text">2,400+ hired</div>
        <div className="text-xs text-text-2 mt-0.5">in the last 30 days</div></div></div>
  </div>;

  if(mfa){
    return <div className="bg-white min-h-screen flex">
      {illusCol}
      {formCol(<>
        <button onClick={()=>setMfa(null)} className="flex items-center gap-2 bg-transparent border-0 cursor-pointer p-0 text-text-2 text-sm font-semibold hover:text-text mb-6">
          <I n="chevL" s={16} w={2}/> Back to sign in</button>
        <Tag tone="brand" icon="shield">Two-factor verification</Tag>
        <h1 className={`${HERO_QUIET} text-3xl mt-4 mb-2`}>Just one more step</h1>
        <p className="text-base text-text-2 mb-6">Enter the 6-digit code for {mfa.email}.</p>
        <div className="flex flex-col gap-3.5">
          <Field label="Verification code" hint={mfa.code?`Demo mode — your code is ${mfa.code}`:undefined}>
            <Input icon="shield" value={code} onChange={e=>{setCode(e.target.value);setErr("");}} placeholder="123456" maxLength={6}
              onKeyDown={e=>e.key==="Enter"&&verify()}/></Field>
          {err&&<Banner tone="danger" icon="alert" title="Verification failed">{err}</Banner>}
          <Btn kind="primary" size="lg" full iconR="arrowR" onClick={verify} disabled={busy||code.length<6}>{busy?"Verifying…":"Verify & sign in"}</Btn>
        </div>
      </>)}
    </div>;
  }
  return <div className="bg-white min-h-screen flex">
    {illusCol}
    {formCol(<>
      <div className="flex items-center justify-between mb-7">
        <button onClick={()=>A.go("home")} className="flex items-center gap-2 bg-transparent border-0 cursor-pointer p-0 text-text-2 text-sm font-semibold hover:text-text">
          <I n="chevL" s={16} w={2}/> Back to NorthHire</button>
        <button onClick={()=>A.go("signup")} className="bg-transparent border-0 cursor-pointer p-0 text-brand text-sm font-semibold">Create account</button>
      </div>
      <Tag tone="brand" icon="user">Good to see you</Tag>
      <h1 className={`${HERO_QUIET} text-3xl mt-4 mb-2`}>Welcome back</h1>
      <p className="text-base text-text-2 mb-6">Sign in to pick up right where you left off.</p>
      <div className="flex flex-col gap-3.5">
        <Field label="Email address">
          <Input icon="mail" type="email" value={email} onChange={e=>{setEmail(e.target.value);setErr("");}} placeholder="you@example.ca"
            onKeyDown={e=>e.key==="Enter"&&submit()}/></Field>
        <Field label="Password">
          <Input icon="lock" type="password" value={pw} onChange={e=>{setPw(e.target.value);setErr("");}} placeholder="Your password"
            onKeyDown={e=>e.key==="Enter"&&submit()}/></Field>
        {err&&<Banner tone="danger" icon="alert" title="Sign-in failed">{err}</Banner>}
        <Btn kind="primary" size="lg" full iconR="arrowR" onClick={submit} disabled={busy}>{busy?"Signing in…":"Sign in"}</Btn>
      </div>
      <div className="flex justify-between mt-4 text-sm">
        <button onClick={()=>A.go("signup")} className="bg-transparent border-0 p-0 cursor-pointer font-semibold text-brand">Create account</button>
        <button onClick={()=>A.go("forgot")} className="bg-transparent border-0 p-0 cursor-pointer font-semibold text-brand">Forgot password?</button>
      </div>
      <Card pad={mob?18:20} style={{marginTop:22,borderRadius:16,background:C.tint,border:`1px solid ${C.line2}`}}>
        <div className="text-xs font-bold text-brand tracking-wide uppercase mb-2.5">Demo accounts</div>
        <div className="flex flex-col gap-1.5">
          {[["sarah.chen@example.ca","Password123","Job seeker — Sarah Chen"],
            ["marcus.b@example.ca","Password123","Job seeker — Marcus (trades)"],
            ["hr@pcl.com","Employer123","Employer — PCL Construction"],
            ["admin@northhire.ca","Admin1234","Administrator"]].map(([e,p,r])=>
            <button key={e} onClick={()=>demoAs(e,p)} className="flex justify-between items-center bg-white border border-line rounded-xl py-2.5 px-3 cursor-pointer">
              <span className="flex flex-col items-start min-w-0">
                <span className="text-sm font-semibold text-text">{r}</span>
                <span className="text-xs text-text-3 mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap">{e}</span></span>
              <span className="text-xs text-brand font-semibold">Sign in →</span></button>)}</div>
      </Card>
    </>)}
  </div>;
}

export function ForgotPasswordPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [stage,setStage]=useState("request"); // request | verify | done
  const [email,setEmail]=useState(""); const [code,setCode]=useState(""); const [newPw,setNewPw]=useState("");
  const [err,setErr]=useState(""); const [sentCode,setSentCode]=useState("");
  const [cooldown,setCooldown]=useState(0);
  useEffect(()=>{if(cooldown<=0)return; const t=setTimeout(()=>setCooldown(c=>c-1),1000); return()=>clearTimeout(t);},[cooldown]);
  const request=async()=>{setErr("");const r=await A.resetPasswordRequest(email); if(!r.ok){setErr(r.msg);return;}
    setSentCode(r.code); setStage("verify"); setCooldown(60);};
  const resend=async()=>{if(cooldown>0)return; setErr("");const r=await A.resetPasswordRequest(email);
    if(!r.ok){setErr(r.msg);return;} setSentCode(r.code); setCooldown(60);};
  const confirm=async()=>{setErr(""); if(newPw.length<8){setErr("Password must be at least 8 characters");return;}
    const r=await A.resetPasswordConfirm(email,code,newPw); if(!r.ok){setErr(r.msg);return;} setStage("done");};

  return <div className={`bg-bg min-h-full flex justify-center ${mob?"pt-6 px-4 pb-10":"pt-12 px-6 pb-20"}`}>
    <div className="w-full max-w-md">
      <div className="flex items-center justify-between mb-5">
        <button onClick={()=>A.go("home")} className="flex items-center gap-2 bg-transparent border-0 cursor-pointer p-0 text-text-2 text-sm font-semibold hover:text-text">
          <I n="chevL" s={16} w={2}/> Back to NorthHire</button>
        <button onClick={()=>A.go("signup")} className="bg-transparent border-0 cursor-pointer p-0 text-brand text-sm font-semibold">Create account</button>
      </div>
      <Card pad={mob?24:34} style={{borderRadius:20}}>
        {stage==="request"&&<>
          <h1 className={`${HERO_QUIET} text-2xl mb-2`}>Reset your password</h1>
          <p className="text-sm text-text-2 mb-6 leading-normal">Enter your email and we'll send a 6-digit code.</p>
          <Field label="Email address"><Input icon="mail" type="email" value={email} onChange={e=>{setEmail(e.target.value);setErr("");}}
            placeholder="you@example.ca" onKeyDown={e=>e.key==="Enter"&&request()}/></Field>
          {err&&<Banner tone="danger" icon="alert" title="Cannot send code" style={{marginTop:14}}>{err}</Banner>}
          <Btn kind="primary" size="lg" full icon="send" onClick={request} style={{marginTop:18}}>Send reset code</Btn>
        </>}
        {stage==="verify"&&<>
          <h1 className={`${HERO_QUIET} text-2xl mb-2`}>Enter your code</h1>
          <p className="text-sm text-text-2 mb-5 leading-normal">
            We sent a 6-digit code to <strong className="text-text">{email}</strong>. Check your inbox.</p>
          {sentCode&&<Banner tone="brand" icon="sparkle" title="Demo mode" style={{marginBottom:18}}>
            No email is really sent — your code is <strong className="text-brand tracking-widest">{sentCode}</strong>. In production this is emailed. See Settings → Outbox to inspect all "sent" messages.</Banner>}
          <div className="flex flex-col gap-3.5">
            <Field label="6-digit code"><Input value={code} onChange={e=>{setCode(e.target.value.replace(/\D/g,"").slice(0,6));setErr("");}}
              placeholder="000000" style={{letterSpacing:".15em",fontWeight:640}}/></Field>
            <Field label="New password" hint="At least 8 characters."><Input icon="lock" type="password" value={newPw}
              onChange={e=>{setNewPw(e.target.value);setErr("");}} placeholder="At least 8 characters"/></Field>
            {err&&<Banner tone="danger" icon="alert" title="Cannot reset">{err}</Banner>}
            <Btn kind="primary" size="lg" full icon="check" onClick={confirm}>Set new password</Btn>
            <div className="flex justify-between items-center mt-1.5">
              <button onClick={()=>setStage("request")} className="bg-transparent border-0 p-0 cursor-pointer text-sm text-text-2">← Different email</button>
              <button onClick={resend} disabled={cooldown>0} className={`bg-transparent border-0 p-0 text-sm font-semibold ${cooldown>0?"text-text-3 cursor-not-allowed":"text-brand cursor-pointer"}`}>
                {cooldown>0?`Resend in ${cooldown}s`:"Resend code"}</button>
            </div>
          </div>
        </>}
        {stage==="done"&&<div className="text-center">
          <div className="w-18 h-18 rounded-full bg-ok-bg border-2 border-ok-ln flex items-center justify-center mx-auto mb-5"><I n="check" s={36} c={C.ok} w={2.6}/></div>
          <h1 className={`${HERO_QUIET} text-2xl mb-2.5`}>Password reset</h1>
          <p className="text-sm text-text-2 mx-auto mb-6 leading-relaxed max-w-xs">Your new password is active. Sign in to continue.</p>
          <Btn kind="primary" size="lg" full onClick={()=>A.go("login")}>Sign in</Btn>
        </div>}
      </Card>
    </div></div>;
}


export function WelcomeTourPage({kind}){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [step,setStep]=useState(0);
  const u=A.user;
  useEffect(()=>{if(!u)A.go("home");},[u]);
  if(!u)return null;
  const first=u.name?.split(" ")[0]||"there";

  const seekerSteps=[
    {t:`Welcome to NorthHire, ${first}!`,
     s:"You've joined the job platform built for real Canadian work — from Red Seal trades to healthcare, transport, kitchens and warehouses. Let's show you around.",
     ic:"sparkle",
     visual:"hero"},
    {t:"Your profile is your CV",
     s:"You already have your first CV — built from your signup. Refine it or make up to 5 different versions for different job types. Employers see your skills, tickets, and match score first, not your name.",
     ic:"file",
     visual:"cv",
     cta:{label:"Refine my CV",go:"cvs"}},
    {t:"Every job shows the wage",
     s:"No 'competitive salary'. Every listing shows the pay range or fixed rate upfront so you can decide whether to apply in seconds.",
     ic:"wallet",
     visual:"jobs",
     cta:{label:"Browse jobs",go:"search"}},
    {t:"AI-matched, human-decided",
     s:"When you apply, employers see a match score based on your skills against theirs. You'll always know which must-have skills you have and which you're missing before you hit send.",
     ic:"target",
     visual:"match"},
    {t:"Grow your credentials",
     s:"Free courses (WHMIS, First Aid, forklift) and paid certifications from providers Canadian employers recognize. Certificates attach automatically to your profile.",
     ic:"cap",
     visual:"trainings",
     cta:{label:"See trainings",go:"trainings"}},
    {t:"You're all set!",
     s:"Everything's in place. Turn on 'Actively seeking work' from your account menu to appear in employer searches. Any question, we're one message away.",
     ic:"check",
     visual:"done",
     cta:{label:"Go to home",go:"home"}}
  ];

  const empSteps=[
    {t:`Welcome to NorthHire, ${first}!`,
     s:"You've joined the employer console used by Canadian companies to find real, verified talent. Wages published, applicants scored, one workspace.",
     ic:"sparkle",
     visual:"hero"},
    {t:"Post your first job",
     s:"Our AI can draft the description, duties and requirements from just your job title. Add must-have skills, publish the wage, and choose when applications close.",
     ic:"plus",
     visual:"post",
     cta:{label:"Post a job",go:"empPost"}},
    {t:"Applicants ranked, not spammed",
     s:"Every application is scored out of 100 against your requirements. Your pipeline shows the best-fit first. Bulk-action anyone through Screen → Interview → Offer.",
     ic:"users",
     visual:"pipeline"},
    {t:"Talent pool: the ones who never applied",
     s:"Search across every seeker on NorthHire whose skills match your open roles. Send a message directly — perfect for hard-to-fill trades.",
     ic:"search",
     visual:"pool"},
    {t:"Your plan and add-ons",
     s:"You're on the Free plan (1 job). Upgrade to Growth ($149/mo, 10 jobs, all features) or Enterprise ($599/mo, unlimited + HR Suite) when you're ready.",
     ic:"wallet",
     visual:"plan",
     cta:{label:"See plans",go:"pricing"}},
    {t:"You're all set!",
     s:"Everything's in place. Verification usually takes 1 business day — you'll get an email when it's complete.",
     ic:"check",
     visual:"done",
     cta:{label:"Go to dashboard",go:"empHome"}}
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
          {steps.map((_,i)=><button key={i} type="button" aria-label={`Go to step ${i+1}`} disabled={i>step}
            onClick={()=>i<=step&&setStep(i)}
            className={`h-2 rounded-full border-0 p-0 transition-all duration-300 ${i===step?"w-6":"w-2"} ${i<=step?"bg-brand cursor-pointer":"bg-line cursor-not-allowed"}`}/>)}
        </div>
        <Btn kind="ghost" size="sm" onClick={skip}>Skip tour</Btn>
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
            <div><div className="text-sm font-semibold text-text">Primary CV</div>
              <div className="text-xs text-text-3 mt-0.5">Auto-created from your signup details</div></div>
          </div>}
          {cur.visual==="match"&&<div className="p-4 bg-tint border border-line-2 rounded-xl mb-5 flex gap-3 items-center">
            <Ring v={87} size={54}/>
            <div><div className="text-sm font-semibold text-text">Your match score</div>
              <div className="text-xs text-text-2 mt-0.5">Shown on every job listing you view</div></div>
          </div>}
          {cur.visual==="jobs"&&<div className="p-3 bg-ok-bg border border-ok-ln rounded-xl mb-5 flex items-center gap-3">
            <I n="wallet" s={20} c={C.ok}/>
            <div className="text-sm font-semibold text-text">$32 – $48 per hour</div>
            <Tag tone="ok" sm>Every listing</Tag>
          </div>}
        </div>

        <div className="mt-auto pt-5 flex justify-between items-center gap-3">
          <Btn kind="ghost" size="md" icon="chevL" disabled={step===0} onClick={()=>setStep(step-1)}>Back</Btn>
          <div className="text-xs text-text-3">{step+1} of {steps.length}</div>
          <Btn kind="primary" size="md" iconR={isLast?"check":"chevR"} onClick={nextStep}>
            {isLast?(cur.cta?.label||"Finish"):"Next"}
          </Btn>
        </div>
      </Card>
    </div>
  </div>;
}
