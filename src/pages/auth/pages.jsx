import { useState } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Page, Card, Btn, Bar, Field, Input, Banner, Sel, Area, CheckRow, Lbl, Ring, Tag } from "../../design/primitives.jsx";
import { CATS, CATM, PROVS } from "../../store/seed/constants.js";

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

export function SignupPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [i,setI]=useState(0); const [err,setErr]=useState({}); const [submitErr,setSubmitErr]=useState("");
  const [d,setD]=useState({role:"",email:"",password:"",phone:"",first:"",last:"",city:"",prov:"Ontario",eligible:"",
    cat:"",title:"",years:"",edu:"",skills:[],draft:"",payMin:"",payUnit:"hr",types:["Full Time"],modes:["On-site"],
    startWhen:"Within 2 weeks",alerts:true,
    company:"",industry:"",size:"1-50",about:"",name:""});
  const STEPS=d.role==="employer"?SU_STEPS_EMPLOYER:SU_STEPS_SEEKER;
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
    security:["Security Licence","CCTV Monitoring","Report Writing","Access Control","Patrolling","De-escalation","First Aid","WHMIS"]}[d.cat]||[];

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
      if(!d.name.trim())e.name="Your name required";}
    setErr(e); return !Object.keys(e).length;};

  const submit=()=>{
    if(d.role==="employer"){
      const r=A.completeEmployerSignup(d);
      if(!r.ok){setSubmitErr(r.msg);return;}
    }else{
      const r=A.completeSignup(d);
      if(!r.ok){setSubmitErr(r.msg);return;}
    }
  };
  const next=()=>{if(!validate())return; i<STEPS.length-1?setI(i+1):submit();};

  if(!A.settings.publicSignup) return <Page narrow>
    <Card pad={34} style={{textAlign:"center"}}>
      <div style={{width:64,height:64,borderRadius:99,background:C.warnBg,border:`2px solid ${C.warnLn}`,display:"flex",
        alignItems:"center",justifyContent:"center",margin:"0 auto 18px"}}><I n="lock" s={28} c={C.warn}/></div>
      <h1 style={{fontSize:22,fontWeight:730,color:C.text,margin:"0 0 10px",letterSpacing:"-.03em"}}>Registration is temporarily closed</h1>
      <p style={{fontSize:15,color:C.text2,lineHeight:1.65,margin:"0 auto 22px",maxWidth:400}}>
        New sign-ups have been paused by an administrator. You can still browse every job on the platform.</p>
      <Btn kind="primary" onClick={()=>A.go("search")}>Browse jobs</Btn></Card></Page>;

  return <div style={{background:C.bg,minHeight:"100%"}}>
    <div style={{maxWidth:620,width:"100%",margin:"0 auto",padding:mob?"18px 16px 34px":"32px 24px 50px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <button onClick={()=>A.go("home")} style={{display:"flex",alignItems:"center",gap:8,background:"none",border:"none",cursor:"pointer",padding:0,color:C.text2,fontFamily:"inherit",fontSize:13.5,fontWeight:600}}
          onMouseEnter={e=>e.currentTarget.style.color=C.text}
          onMouseLeave={e=>e.currentTarget.style.color=C.text2}>
          <I n="chevL" s={16} w={2}/> Back to NorthHire</button>
        <button onClick={()=>A.go("login")} style={{background:"none",border:"none",cursor:"pointer",padding:0,color:C.brand,fontFamily:"inherit",fontSize:13.5,fontWeight:640}}>Already have an account?</button>
      </div>
      {i>0&&<div style={{marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <span style={{fontSize:13.5,fontWeight:630,color:C.text}}>Step {i} of {STEPS.length-1}</span>
          <span style={{fontSize:13.5,color:C.text2}}>{Math.round((i/(STEPS.length-1))*100)}% complete</span></div>
        <Bar v={(i/(STEPS.length-1))*100} h={7}/></div>}

      <Card pad={mob?22:30} style={{borderRadius:20}}>
        <div key={step.k}>
          <div style={{marginBottom:22}}>
            <h1 style={{fontSize:mob?24:28,fontWeight:740,letterSpacing:"-.035em",color:C.text,margin:0}}>{step.t}</h1>
            <p style={{fontSize:15,color:C.text2,margin:"7px 0 0"}}>{step.d}</p></div>

          {step.k==="role"&&<div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:14}}>
            {[{k:"seeker",ic:"user",t:"I'm looking for work",d:"Build a profile, browse jobs, apply in one tap. Free forever."},
              {k:"employer",ic:"building",t:"I'm hiring",d:"Post jobs, review scored applicants, manage your pipeline. From $49/mo."}].map(r=>{
              const on=d.role===r.k;
              return <button key={r.k} onClick={()=>set("role",r.k)} style={{padding:mob?"22px 20px":"28px 24px",borderRadius:16,
                cursor:"pointer",fontFamily:"inherit",textAlign:"left",transition:"all .18s",
                border:`2px solid ${on?C.brand:C.line}`,background:on?C.tint:"#fff"}}>
                <div style={{width:44,height:44,borderRadius:12,background:on?C.brand:C.wash,color:on?"#fff":C.brand,
                  display:"flex",alignItems:"center",justifyContent:"center",marginBottom:14,transition:"all .18s"}}>
                  <I n={r.ic} s={22}/></div>
                <div style={{fontSize:16.5,fontWeight:680,color:on?C.brand:C.text,letterSpacing:"-.02em",marginBottom:6}}>{r.t}</div>
                <div style={{fontSize:13.5,color:C.text2,lineHeight:1.5}}>{r.d}</div></button>;})}
            {err.role&&<div style={{gridColumn:"1/-1",color:C.danger,fontSize:13.5,marginTop:6}}>{err.role}</div>}</div>}

          {step.k==="account"&&<div style={{display:"flex",flexDirection:"column",gap:16}}>
            <Field label="Email address" required error={err.email}>
              <Input icon="mail" type="email" value={d.email} onChange={e=>set("email",e.target.value)}
                placeholder={d.role==="employer"?"you@yourcompany.ca":"you@example.ca"} invalid={!!err.email}/></Field>
            {d.role==="seeker"&&<Field label="Mobile number" required error={err.phone} hint="Employers use this to reach you about interviews.">
              <Input icon="phone" value={d.phone} onChange={e=>set("phone",e.target.value)} placeholder="416 555 0100" invalid={!!err.phone}/></Field>}
            <Field label="Create a password" required error={err.password} hint="At least 8 characters. Mix in a number or symbol for a stronger password.">
              <Input icon="lock" type="password" value={d.password} onChange={e=>set("password",e.target.value)} placeholder="At least 8 characters" invalid={!!err.password}/></Field>
            <Banner tone="neutral" icon="shield" title="Your details stay yours">
              We never sell candidate data. An employer only sees your profile when you choose to apply.</Banner></div>}

          {step.k==="company"&&<div style={{display:"flex",flexDirection:"column",gap:16}}>
            <Field label="Your name" required error={err.name}><Input icon="user" value={d.name} onChange={e=>set("name",e.target.value)} placeholder="Jean Tremblay" invalid={!!err.name}/></Field>
            <Field label="Company name" required error={err.company}><Input icon="building" value={d.company} onChange={e=>set("company",e.target.value)} placeholder="Northern Trades Ltd." invalid={!!err.company}/></Field>
            <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:14}}>
              <Field label="Industry"><Sel value={d.industry} onChange={e=>set("industry",e.target.value)}>
                <option value="">Select…</option>{["Construction","Healthcare","Transport","Retail","Hospitality","Manufacturing","Professional Services","Education","Finance","Technology","Agriculture","Security"].map(o=><option key={o}>{o}</option>)}</Sel></Field>
              <Field label="Company size"><Sel value={d.size} onChange={e=>set("size",e.target.value)}>
                {["1-50","50-200","200-1000","1000+"].map(o=><option key={o}>{o} employees</option>)}</Sel></Field></div>
            <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:14}}>
              <Field label="City"><Input icon="pin" value={d.city} onChange={e=>set("city",e.target.value)} placeholder="Toronto"/></Field>
              <Field label="Province"><Sel value={d.prov} onChange={e=>set("prov",e.target.value)}>{PROVS.map(p=><option key={p}>{p}</option>)}</Sel></Field></div>
            <Field label="About your company (optional)" hint="A sentence or two candidates see on your profile.">
              <Area rows={3} value={d.about} onChange={e=>set("about",e.target.value)} placeholder="What you do, and why someone would want to work with you."/></Field>
            <Banner tone="brand" icon="shield" title="Verification usually takes 1 business day">
              Our Toronto team checks your business number and incorporation. Your listings go live immediately, with the verified badge added once approved.</Banner></div>}

          {step.k==="about"&&<div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:14}}>
              <Field label="First name" required error={err.first}><Input value={d.first} onChange={e=>set("first",e.target.value)} placeholder="Jean" invalid={!!err.first}/></Field>
              <Field label="Last name" required error={err.last}><Input value={d.last} onChange={e=>set("last",e.target.value)} placeholder="Tremblay" invalid={!!err.last}/></Field>
              <Field label="City or town" required error={err.city}><Input icon="pin" value={d.city} onChange={e=>set("city",e.target.value)} placeholder="Calgary" invalid={!!err.city}/></Field>
              <Field label="Province or territory" required><Sel value={d.prov} onChange={e=>set("prov",e.target.value)}>{PROVS.map(p=><option key={p}>{p}</option>)}</Sel></Field></div>
            <Field label="Are you legally allowed to work in Canada?" required error={err.eligible}>
              <div style={{display:"flex",flexDirection:"column",gap:9}}>
                {[["citizen","Canadian citizen or permanent resident"],["permit","I hold a valid work permit"],
                  ["student","Student permit with work authorisation"],["need","I would need employer sponsorship"]].map(([v,l])=>
                  <CheckRow key={v} on={d.eligible===v} onChange={()=>set("eligible",v)} label={l}/>)}</div></Field></div>}

          {step.k==="work"&&<div style={{display:"flex",flexDirection:"column",gap:18}}>
            <Field label="Which sector do you work in?" required error={err.cat}>
              <div style={{display:"grid",gridTemplateColumns:`repeat(auto-fill,minmax(${mob?140:160}px,1fr))`,gap:9}}>
                {CATS.map(c=>{const on=d.cat===c.id;
                  return <button key={c.id} onClick={()=>set("cat",c.id)} style={{display:"flex",alignItems:"center",gap:10,
                    padding:"12px 13px",borderRadius:11,cursor:"pointer",fontFamily:"inherit",textAlign:"left",
                    border:`1.5px solid ${on?C.brand:C.line}`,background:on?C.tint:"#fff",transition:"all .16s"}}>
                    <span style={{color:on?C.brand:C.text3,display:"flex",flexShrink:0}}><I n={c.icon} s={19}/></span>
                    <span style={{fontSize:13.5,fontWeight:on?640:500,color:on?C.brand:C.text,lineHeight:1.3}}>{c.label}</span></button>;})}</div></Field>
            <Field label="Your job title or trade" required error={err.title} hint="For example: Journeyperson Electrician, PSW, Line Cook.">
              <Input icon="briefcase" value={d.title} onChange={e=>set("title",e.target.value)} placeholder="Journeyperson Electrician" invalid={!!err.title}/></Field>
            <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:14}}>
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
              <div style={{display:"flex",gap:9}}>
                <Input value={d.draft} onChange={e=>set("draft",e.target.value)} placeholder="Type a skill and press Enter"
                  onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();add(d.draft);}}} invalid={!!err.skills}/>
                <Btn kind="primary" icon="plus" disabled={!d.draft.trim()} onClick={()=>add(d.draft)}>Add</Btn></div></Field>
            {d.skills.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:16}}>
              {d.skills.map(s=><span key={s} style={{display:"inline-flex",alignItems:"center",gap:7,background:C.brand,
                color:"#fff",fontSize:13.5,fontWeight:600,padding:"7px 12px",borderRadius:8}}>{s}
                <button onClick={()=>set("skills",d.skills.filter(x=>x!==s))} style={{background:"none",border:"none",
                  color:"rgba(255,255,255,.7)",cursor:"pointer",padding:0,display:"flex"}}><I n="x" s={13} w={2.5}/></button></span>)}</div>}
            {SUG.filter(s=>!d.skills.includes(s)).length>0&&<div style={{marginTop:22}}>
              <Lbl>Common in {CATM[d.cat]?.label} — tap to add</Lbl>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {SUG.filter(s=>!d.skills.includes(s)).map(s=><button key={s} onClick={()=>add(s)}
                  style={{display:"inline-flex",alignItems:"center",gap:6,background:"#fff",border:`1.5px dashed ${C.line}`,
                    color:C.text2,fontSize:13.5,fontWeight:520,padding:"7px 12px",borderRadius:8,cursor:"pointer",fontFamily:"inherit"}}>
                  <I n="plus" s={13} c={C.brand} w={2.4}/>{s}</button>)}</div></div>}</div>}

          {step.k==="prefs"&&<div style={{display:"flex",flexDirection:"column",gap:20}}>
            <Field label="Minimum pay you would accept" required error={err.payMin}>
              <div style={{display:"flex",gap:10}}>
                <Input icon="wallet" value={d.payMin} onChange={e=>set("payMin",e.target.value.replace(/[^\d.]/g,""))}
                  placeholder={d.payUnit==="hr"?"28.00":"60,000"} invalid={!!err.payMin}/>
                <Sel value={d.payUnit} onChange={e=>set("payUnit",e.target.value)} style={{width:135,flexShrink:0}}>
                  <option value="hr">per hour</option><option value="yr">per year</option></Sel></div></Field>
            <div><Lbl>Employment type — pick any that suit you</Lbl>
              <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"repeat(3,1fr)",gap:9}}>
                {["Full Time","Part Time","Contract","Seasonal","Apprenticeship","Casual"].map(t=>{const on=d.types.includes(t);
                  return <button key={t} onClick={()=>tog("types",t)} style={{padding:"11px 12px",borderRadius:10,cursor:"pointer",
                    fontFamily:"inherit",fontSize:13.5,fontWeight:on?640:500,border:`1.5px solid ${on?C.brand:C.line}`,
                    background:on?C.tint:"#fff",color:on?C.brand:C.text,transition:"all .16s"}}>{t}</button>;})}</div></div>
            <div><Lbl>Where can you work?</Lbl>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9}}>
                {["On-site","Hybrid","Remote"].map(t=>{const on=d.modes.includes(t);
                  return <button key={t} onClick={()=>tog("modes",t)} style={{padding:"11px 12px",borderRadius:10,cursor:"pointer",
                    fontFamily:"inherit",fontSize:13.5,fontWeight:on?640:500,border:`1.5px solid ${on?C.brand:C.line}`,
                    background:on?C.tint:"#fff",color:on?C.brand:C.text,transition:"all .16s"}}>{t}</button>;})}</div></div>
            <Field label="When can you start?"><Sel value={d.startWhen} onChange={e=>set("startWhen",e.target.value)}>
              {["Immediately","Within 2 weeks","Within 1 month","More than 1 month"].map(o=><option key={o}>{o}</option>)}</Sel></Field>
            <CheckRow on={d.alerts} onChange={v=>set("alerts",v)} label="Email me new matching jobs"
              sub="A short digest, at most twice a week. You can turn this off any time."/></div>}
        </div>
        {submitErr&&<Banner tone="danger" icon="alert" title="Sign-up failed" style={{marginTop:18}}>{submitErr}</Banner>}
        <div style={{display:"flex",gap:10,justifyContent:"space-between",marginTop:26,paddingTop:20,borderTop:`1px solid ${C.lineSoft}`}}>
          <Btn kind="ghost" icon="arrowL" onClick={()=>i===0?A.go("home"):setI(i-1)}>{i===0?"Cancel":"Back"}</Btn>
          <Btn kind="primary" size="lg" iconR={i===STEPS.length-1?"check":"arrowR"} onClick={next} disabled={step.k==="role"&&!d.role}>
            {i===STEPS.length-1?(d.role==="employer"?"Create employer account":"Finish and start matching"):"Continue"}</Btn></div>
      </Card>
      <div style={{textAlign:"center",marginTop:20,fontSize:14,color:C.text2}}>
        Already have an account? <button onClick={()=>A.go("login")} style={{background:"none",border:"none",padding:0,
          cursor:"pointer",fontFamily:"inherit",fontSize:14,fontWeight:640,color:C.brand}}>Sign in</button></div>
    </div></div>;
}

export function LoginPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [email,setEmail]=useState(""); const [pw,setPw]=useState("");
  const [err,setErr]=useState(""); const [busy,setBusy]=useState(false);
  const submit=()=>{setErr("");setBusy(true);
    setTimeout(()=>{const r=A.loginWithPassword(email,pw); if(!r.ok)setErr(r.msg); setBusy(false);},120);};
  const demoAs=(e,p)=>{setEmail(e);setPw(p);setErr("");
    setTimeout(()=>{const r=A.loginWithPassword(e,p); if(!r.ok)setErr(r.msg);},60);};
  return <div style={{background:C.bg,minHeight:"100%",display:"flex",justifyContent:"center",
    padding:mob?"22px 16px 40px":"48px 24px 80px"}}>
    <div style={{width:"100%",maxWidth:440}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
        <button onClick={()=>A.go("home")} style={{display:"flex",alignItems:"center",gap:8,background:"none",border:"none",cursor:"pointer",padding:0,color:C.text2,fontFamily:"inherit",fontSize:13.5,fontWeight:600}}
          onMouseEnter={e=>e.currentTarget.style.color=C.text}
          onMouseLeave={e=>e.currentTarget.style.color=C.text2}>
          <I n="chevL" s={16} w={2}/> Back to NorthHire</button>
        <button onClick={()=>A.go("signup")} style={{background:"none",border:"none",cursor:"pointer",padding:0,color:C.brand,fontFamily:"inherit",fontSize:13.5,fontWeight:640}}>Create account</button>
      </div>
      <Card pad={mob?24:34} style={{borderRadius:20}}>
        <h1 style={{fontSize:28,fontWeight:740,letterSpacing:"-.035em",color:C.text,margin:"0 0 8px"}}>Welcome back</h1>
        <p style={{fontSize:15,color:C.text2,margin:"0 0 24px"}}>Sign in to continue.</p>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Field label="Email address">
            <Input icon="mail" type="email" value={email} onChange={e=>{setEmail(e.target.value);setErr("");}} placeholder="you@example.ca"
              onKeyDown={e=>e.key==="Enter"&&submit()}/></Field>
          <Field label="Password">
            <Input icon="lock" type="password" value={pw} onChange={e=>{setPw(e.target.value);setErr("");}} placeholder="Your password"
              onKeyDown={e=>e.key==="Enter"&&submit()}/></Field>
          {err&&<Banner tone="danger" icon="alert" title="Sign-in failed">{err}</Banner>}
          <Btn kind="primary" size="lg" full iconR="arrowR" onClick={submit} disabled={busy}>{busy?"Signing in…":"Sign in"}</Btn>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:16,fontSize:13.5}}>
          <button onClick={()=>A.go("signup")} style={{background:"none",border:"none",padding:0,cursor:"pointer",fontFamily:"inherit",color:C.brand,fontWeight:640}}>Create account</button>
          <button onClick={()=>A.go("forgot")} style={{background:"none",border:"none",padding:0,cursor:"pointer",fontFamily:"inherit",color:C.brand,fontWeight:640}}>Forgot password?</button>
        </div>
      </Card>
      <Card pad={mob?18:22} style={{marginTop:14,borderRadius:16,background:C.tint,border:`1px solid ${C.line2}`}}>
        <div style={{fontSize:12.5,fontWeight:700,color:C.brand,letterSpacing:".05em",textTransform:"uppercase",marginBottom:10}}>Demo accounts</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {[["sarah.chen@example.ca","Password123","Job seeker — Sarah Chen"],
            ["marcus.b@example.ca","Password123","Job seeker — Marcus (trades)"],
            ["hr@pcl.com","Employer123","Employer — PCL Construction"],
            ["admin@northhire.ca","Admin1234","Administrator"]].map(([e,p,r])=>
            <button key={e} onClick={()=>demoAs(e,p)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
              background:"#fff",border:`1px solid ${C.line}`,borderRadius:10,padding:"10px 12px",cursor:"pointer",fontFamily:"inherit"}}>
              <span style={{display:"flex",flexDirection:"column",alignItems:"flex-start",minWidth:0}}>
                <span style={{fontSize:13,fontWeight:640,color:C.text}}>{r}</span>
                <span style={{fontSize:12,color:C.text3,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e}</span></span>
              <span style={{fontSize:12,color:C.brand,fontWeight:640}}>Sign in →</span></button>)}</div>
      </Card>
    </div></div>;
}

export function ForgotPasswordPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [stage,setStage]=useState("request"); // request | verify | done
  const [email,setEmail]=useState(""); const [code,setCode]=useState(""); const [newPw,setNewPw]=useState("");
  const [err,setErr]=useState(""); const [sentCode,setSentCode]=useState("");
  const request=()=>{setErr("");const r=A.resetPasswordRequest(email); if(!r.ok){setErr(r.msg);return;}
    setSentCode(r.code); setStage("verify");};
  const confirm=()=>{setErr(""); if(newPw.length<8){setErr("Password must be at least 8 characters");return;}
    const r=A.resetPasswordConfirm(email,code,newPw); if(!r.ok){setErr(r.msg);return;} setStage("done");};

  return <div style={{background:C.bg,minHeight:"100%",display:"flex",justifyContent:"center",
    padding:mob?"22px 16px 40px":"48px 24px 80px"}}>
    <div style={{width:"100%",maxWidth:440}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
        <button onClick={()=>A.go("home")} style={{display:"flex",alignItems:"center",gap:8,background:"none",border:"none",cursor:"pointer",padding:0,color:C.text2,fontFamily:"inherit",fontSize:13.5,fontWeight:600}}
          onMouseEnter={e=>e.currentTarget.style.color=C.text}
          onMouseLeave={e=>e.currentTarget.style.color=C.text2}>
          <I n="chevL" s={16} w={2}/> Back to NorthHire</button>
        <button onClick={()=>A.go("signup")} style={{background:"none",border:"none",cursor:"pointer",padding:0,color:C.brand,fontFamily:"inherit",fontSize:13.5,fontWeight:640}}>Create account</button>
      </div>
      <Card pad={mob?24:34} style={{borderRadius:20}}>
        {stage==="request"&&<>
          <h1 style={{fontSize:26,fontWeight:740,letterSpacing:"-.035em",color:C.text,margin:"0 0 8px"}}>Reset your password</h1>
          <p style={{fontSize:14.5,color:C.text2,margin:"0 0 22px",lineHeight:1.55}}>Enter your email and we'll send a 6-digit code.</p>
          <Field label="Email address"><Input icon="mail" type="email" value={email} onChange={e=>{setEmail(e.target.value);setErr("");}}
            placeholder="you@example.ca" onKeyDown={e=>e.key==="Enter"&&request()}/></Field>
          {err&&<Banner tone="danger" icon="alert" title="Cannot send code" style={{marginTop:14}}>{err}</Banner>}
          <Btn kind="primary" size="lg" full icon="send" onClick={request} style={{marginTop:18}}>Send reset code</Btn>
        </>}
        {stage==="verify"&&<>
          <h1 style={{fontSize:26,fontWeight:740,letterSpacing:"-.035em",color:C.text,margin:"0 0 8px"}}>Enter your code</h1>
          <p style={{fontSize:14.5,color:C.text2,margin:"0 0 18px",lineHeight:1.55}}>
            We sent a 6-digit code to <strong style={{color:C.text}}>{email}</strong>. Check your inbox.</p>
          <Banner tone="brand" icon="sparkle" title="Demo mode" style={{marginBottom:18}}>
            No email is really sent — your code is <strong style={{color:C.brand,letterSpacing:".08em"}}>{sentCode}</strong>. In production this is emailed. See Settings → Outbox to inspect all "sent" messages.</Banner>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <Field label="6-digit code"><Input value={code} onChange={e=>{setCode(e.target.value.replace(/\D/g,"").slice(0,6));setErr("");}}
              placeholder="000000" style={{letterSpacing:".15em",fontWeight:640}}/></Field>
            <Field label="New password" hint="At least 8 characters."><Input icon="lock" type="password" value={newPw}
              onChange={e=>{setNewPw(e.target.value);setErr("");}} placeholder="At least 8 characters"/></Field>
            {err&&<Banner tone="danger" icon="alert" title="Cannot reset">{err}</Banner>}
            <Btn kind="primary" size="lg" full icon="check" onClick={confirm}>Set new password</Btn>
            <button onClick={()=>setStage("request")} style={{background:"none",border:"none",padding:0,cursor:"pointer",fontFamily:"inherit",fontSize:13.5,color:C.text2,marginTop:6}}>← Different email</button>
          </div>
        </>}
        {stage==="done"&&<div style={{textAlign:"center"}}>
          <div style={{width:72,height:72,borderRadius:99,background:C.okBg,border:`2px solid ${C.okLn}`,display:"flex",
            alignItems:"center",justifyContent:"center",margin:"0 auto 18px"}}><I n="check" s={36} c={C.ok} w={2.6}/></div>
          <h1 style={{fontSize:24,fontWeight:740,letterSpacing:"-.035em",color:C.text,margin:"0 0 10px"}}>Password reset</h1>
          <p style={{fontSize:14.5,color:C.text2,margin:"0 auto 22px",lineHeight:1.6,maxWidth:340}}>Your new password is active. Sign in to continue.</p>
          <Btn kind="primary" size="lg" full onClick={()=>A.go("login")}>Sign in</Btn>
        </div>}
      </Card>
    </div></div>;
}


export function WelcomeTourPage({kind}){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [step,setStep]=useState(0);
  const u=A.user;
  if(!u){useEffect(()=>A.go("home"),[]); return null;}
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
     s:"You're on the Free plan (1 job). Upgrade to Growth ($149/mo, 10 jobs, all features) or Enterprise ($499/mo, unlimited + HR Suite) when you're ready.",
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

  return <div style={{background:C.bg,minHeight:"100vh",padding:mob?"16px 16px 30px":"32px 32px 50px",display:"flex",flexDirection:"column"}}>
    <div style={{maxWidth:640,width:"100%",margin:"0 auto",flex:1,display:"flex",flexDirection:"column"}}>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div style={{display:"flex",gap:6}}>
          {steps.map((_,i)=><div key={i} style={{width:i===step?24:8,height:8,borderRadius:99,background:i<=step?C.brand:C.line,transition:"all .3s"}}/>)}
        </div>
        <Btn kind="ghost" size="sm" onClick={skip}>Skip tour</Btn>
      </div>

      <Card pad={mob?26:38} style={{flex:1,display:"flex",flexDirection:"column",borderRadius:24,animation:"rise .4s cubic-bezier(.22,.9,.32,1)",justifyContent:"center"}}>
        <div key={step} style={{animation:"fadeIn .3s ease"}}>
          <div style={{width:72,height:72,borderRadius:20,background:`linear-gradient(135deg,${C.brand} 0%,#003D8C 100%)`,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:24,boxShadow:"0 8px 20px -6px rgba(0,92,204,.4)"}}>
            <I n={cur.ic} s={34}/>
          </div>
          <h1 style={{fontSize:mob?26:32,fontWeight:750,letterSpacing:"-.035em",color:C.text,margin:"0 0 14px",lineHeight:1.2}}>{cur.t}</h1>
          <p style={{fontSize:mob?15:16.5,color:C.text2,lineHeight:1.7,margin:"0 0 28px"}}>{cur.s}</p>

          {cur.visual==="cv"&&<div style={{padding:16,background:C.bg,border:`1px solid ${C.line}`,borderRadius:12,marginBottom:20,display:"flex",gap:12,alignItems:"center"}}>
            <div style={{width:44,height:44,borderRadius:10,background:C.wash,color:C.brand,display:"flex",alignItems:"center",justifyContent:"center"}}><I n="file" s={22}/></div>
            <div><div style={{fontSize:14,fontWeight:640,color:C.text}}>Primary CV</div>
              <div style={{fontSize:12.5,color:C.text3,marginTop:2}}>Auto-created from your signup details</div></div>
          </div>}
          {cur.visual==="match"&&<div style={{padding:16,background:C.tint,border:`1px solid ${C.line2}`,borderRadius:12,marginBottom:20,display:"flex",gap:12,alignItems:"center"}}>
            <Ring v={87} size={54}/>
            <div><div style={{fontSize:14,fontWeight:640,color:C.text}}>Your match score</div>
              <div style={{fontSize:12.5,color:C.text2,marginTop:2}}>Shown on every job listing you view</div></div>
          </div>}
          {cur.visual==="jobs"&&<div style={{padding:12,background:C.okBg,border:`1px solid ${C.okLn}`,borderRadius:12,marginBottom:20,display:"flex",alignItems:"center",gap:12}}>
            <I n="wallet" s={20} c={C.ok}/>
            <div style={{fontSize:14,fontWeight:640,color:C.text}}>$32 – $48 per hour</div>
            <Tag tone="ok" sm>Every listing</Tag>
          </div>}
        </div>

        <div style={{marginTop:"auto",paddingTop:20,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
          <Btn kind="ghost" size="md" icon="chevL" disabled={step===0} onClick={()=>setStep(step-1)}>Back</Btn>
          <div style={{fontSize:12.5,color:C.text3}}>{step+1} of {steps.length}</div>
          <Btn kind="primary" size="md" iconR={isLast?"check":"chevR"} onClick={nextStep}>
            {isLast?(cur.cta?.label||"Finish"):"Next"}
          </Btn>
        </div>
      </Card>
    </div>
  </div>;
}
