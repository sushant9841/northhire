import { useState, useEffect } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn, Tag, Card, Input, Sel, Field, Area, Bar, Tabs, H2, Lbl, Empty, Modal, SmartPortrait, SmartScene, Page, H1 } from "../../design/primitives.jsx";
import { CATS, CATM, PROVS, PCODE } from "../../store/seed/constants.js";
import { EmpMark } from "./cards.jsx";

export function ProfilePage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const u=A.user;
  if(!u) return <Page narrow><Empty icon="user" title="Sign in to view your profile"
    body="Create a free account to build a profile, save jobs and track applications."
    action={<div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
      <Btn kind="primary" onClick={()=>A.go("signup")}>Create account</Btn>
      <Btn kind="outline" onClick={()=>A.go("login")}>Sign in</Btn></div>}/></Page>;
  if(u.role!=="seeker") return <EmployerAccountPage/>;
  const [tab,setTab]=useState("about");
  const [d,setD]=useState({...u});
  const [skill,setSkill]=useState("");
  const [showRef,setShowRef]=useState(false);
  const [ref,setRef]=useState({name:"",title:"",company:"",email:"",phone:"",relationship:""});
  const dirty=JSON.stringify(d)!==JSON.stringify(u);
  useEffect(()=>setD({...u}),[u]);
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
    security:["Security Licence","CCTV Monitoring","Report Writing","De-escalation","WHMIS"]}[d.cat]||[]).filter(s=>!d.skills.includes(s));
  const tabs=[{k:"about",label:"About",icon:"user"},{k:"skills",label:"Skills",icon:"sparkle"},
    {k:"prefs",label:"Preferences",icon:"target"},{k:"learning",label:"Learning",icon:"cap"},{k:"refs",label:"References",icon:"users"}];

  const pad=mob?"44px 16px":"72px 32px";
  return <div style={{background:"#fff",minHeight:"100%"}}>
    <section style={{padding:pad,background:"#fff",borderBottom:`1px solid ${C.lineSoft}`}}>
      <div style={{maxWidth:1120,margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",gap:20,flexWrap:"wrap"}}>
          <div><Tag tone="brand" icon="user">Profile</Tag>
            <h1 style={{fontSize:mob?32:52,fontWeight:770,letterSpacing:"-.045em",color:C.text,margin:"18px 0 12px",lineHeight:1.08}}>Hi, {u.name.split(" ")[0]}.</h1>
            <p style={{fontSize:mob?16:19,color:C.text2,lineHeight:1.55,margin:0,maxWidth:520}}>This is what employers see when you apply.</p></div>
          <div style={{display:"flex",gap:9,flexWrap:"wrap"}}>
            <Btn kind="outline" icon="file" onClick={()=>A.go("cvs")}>My CVs ({A.cvs.length})</Btn>
            <Btn kind="outline" icon="gear" onClick={()=>A.go("settings")}>Settings</Btn></div></div>
      </div>
    </section>
    <section style={{padding:mob?"32px 16px 56px":"48px 32px 96px",background:C.bg,minHeight:400}}>
      <div style={{maxWidth:1120,margin:"0 auto"}}>
    <Card pad={mob?24:32} style={{marginBottom:18,borderRadius:20}}>
      <div style={{display:"flex",gap:18,alignItems:"center",flexWrap:"wrap"}}>
        <SmartPortrait seed={u.seed??0} size={mob?64:78} radius={20}/>
        <div style={{flex:"1 1 220px",minWidth:0}}>
          <div style={{fontSize:mob?20:23,fontWeight:720,color:C.text,letterSpacing:"-.03em"}}>{u.name}</div>
          <div style={{fontSize:14.5,color:C.text2,marginTop:4}}>{u.title} • {u.city}, {u.prov}</div>
          <div style={{fontSize:13.5,color:C.text3,marginTop:3}}>{u.email} • {u.phone}</div></div>
        <div style={{flex:"0 0 200px",minWidth:180}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12.5,marginBottom:6}}>
            <span style={{color:C.text2}}>Profile strength</span><span style={{fontWeight:700,color:A.completeness>=85?C.ok:C.brand}}>{A.completeness}%</span></div>
          <Bar v={A.completeness} tone={A.completeness>=85?C.ok:C.brand}/>
          <div style={{fontSize:12,color:C.text3,marginTop:7,lineHeight:1.5}}>{A.completenessHint}</div></div></div></Card>

    <Tabs items={tabs} value={tab} onChange={setTab} style={{marginBottom:18}}/>

    <Card pad={mob?24:32} style={{borderRadius:20}}>
      {tab==="about"&&<div style={{display:"flex",flexDirection:"column",gap:16}}>
        <H2>Personal details</H2>
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:14}}>
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
              placeholder={`${d.years}+ years as a ${d.title.toLowerCase()} in ${d.city}. …`}/></Field></div></div>}

      {tab==="skills"&&<div>
        <H2 sub="These drive every match score you see">Skills, tickets and certificates</H2>
        <div style={{display:"flex",gap:9,marginBottom:16}}>
          <Input placeholder="Add a skill, ticket or certificate" value={skill} onChange={e=>setSkill(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addSkill(skill);}}}/>
          <Btn kind="primary" icon="plus" disabled={!skill.trim()} onClick={()=>addSkill(skill)}>Add</Btn></div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:22}}>
          {d.skills.map(s=><span key={s} style={{display:"inline-flex",alignItems:"center",gap:7,background:C.brand,color:"#fff",
            fontSize:13.5,fontWeight:600,padding:"7px 12px",borderRadius:8,animation:"pop .2s ease"}}>{s}
            <button onClick={()=>set("skills",d.skills.filter(x=>x!==s))} style={{background:"none",border:"none",
              color:"rgba(255,255,255,.7)",cursor:"pointer",padding:0,display:"flex"}}><I n="x" s={13} w={2.5}/></button></span>)}
          {d.skills.length===0&&<span style={{fontSize:14,color:C.text3}}>No skills added yet.</span>}</div>
        {SUG.length>0&&<><Lbl>Common in {CATM[d.cat]?.label} — tap to add</Lbl>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {SUG.map(s=><button key={s} onClick={()=>addSkill(s)} style={{display:"inline-flex",alignItems:"center",gap:6,
              background:"#fff",border:`1.5px dashed ${C.line}`,color:C.text2,fontSize:13.5,fontWeight:520,padding:"7px 12px",
              borderRadius:8,cursor:"pointer",fontFamily:"inherit"}}><I n="plus" s={13} c={C.brand} w={2.4}/>{s}</button>)}</div></>}</div>}

      {tab==="prefs"&&<div style={{display:"flex",flexDirection:"column",gap:20}}>
        <H2 sub="Used to rank the jobs we show you">Job preferences</H2>
        <Field label="Minimum pay you would accept" required>
          <div style={{display:"flex",gap:10}}>
            <Input icon="wallet" value={d.payMin} onChange={e=>set("payMin",Number(e.target.value.replace(/[^\d.]/g,""))||0)}/>
            <Sel value={d.payUnit} onChange={e=>set("payUnit",e.target.value)} style={{width:135,flexShrink:0}}>
              <option value="hr">per hour</option><option value="yr">per year</option></Sel></div></Field>
        <div><Lbl>Employment type</Lbl>
          <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"repeat(3,1fr)",gap:9}}>
            {["Full Time","Part Time","Contract","Seasonal","Apprenticeship","Casual"].map(t=>{const on=d.types.includes(t);
              return <button key={t} onClick={()=>set("types",on?d.types.filter(x=>x!==t):[...d.types,t])}
                style={{padding:"11px 12px",borderRadius:10,cursor:"pointer",fontFamily:"inherit",fontSize:13.5,
                  fontWeight:on?640:500,border:`1.5px solid ${on?C.brand:C.line}`,background:on?C.tint:"#fff",
                  color:on?C.brand:C.text,transition:"all .16s"}}>{t}</button>;})}</div></div>
        <div><Lbl>Where can you work?</Lbl>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9}}>
            {["On-site","Hybrid","Remote"].map(t=>{const on=d.modes.includes(t);
              return <button key={t} onClick={()=>set("modes",on?d.modes.filter(x=>x!==t):[...d.modes,t])}
                style={{padding:"11px 12px",borderRadius:10,cursor:"pointer",fontFamily:"inherit",fontSize:13.5,
                  fontWeight:on?640:500,border:`1.5px solid ${on?C.brand:C.line}`,background:on?C.tint:"#fff",
                  color:on?C.brand:C.text,transition:"all .16s"}}>{t}</button>;})}</div></div>
        <Field label="When can you start?"><Sel value={d.startWhen||"Within 2 weeks"} onChange={e=>set("startWhen",e.target.value)}>
          {["Immediately","Within 2 weeks","Within 1 month","More than 1 month"].map(o=><option key={o}>{o}</option>)}</Sel></Field></div>}

      {tab==="learning"&&<div>
        <H2 sub="Courses you have enrolled in" action={<Btn kind="outline" size="sm" onClick={()=>A.go("trainings")}>Browse trainings</Btn>}>My learning</H2>
        {A.enrolled.size===0?<Empty icon="cap" title="No trainings yet"
          body="Free certifications like WHMIS and interview skills are the fastest way to lift your match scores."
          action={<Btn kind="primary" onClick={()=>A.go("trainings")}>Browse trainings</Btn>}/>
          :<div style={{display:"flex",flexDirection:"column",gap:12}}>
            {A.trainings.filter(t=>A.enrolled.has(t.id)).map(t=>{const p=A.trainingProgress[t.id]||0;
              return <div key={t.id} style={{display:"flex",gap:14,alignItems:"center",border:`1px solid ${C.line}`,borderRadius:12,padding:14}}>
                <div style={{width:60,height:44,borderRadius:9,overflow:"hidden",flexShrink:0}}><SmartScene kind={t.scene} tone={t.tone} h={44} seed={t.id.charCodeAt(1)||0}/></div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14.5,fontWeight:640,color:C.text}}>{t.title}</div>
                  <div style={{marginTop:8}}><Bar v={p} tone={p>=100?C.ok:C.brand} h={5}/></div>
                  <div style={{fontSize:12.5,color:C.text3,marginTop:5}}>{p>=100?"Completed — certificate available":`${p}% complete`}</div></div>
                <Btn kind={p>=100?"outline":"primary"} size="sm" onClick={()=>p>=100?A.printCert(t):A.openTraining(t.id)}>
                  {p>=100?"Certificate":"Continue"}</Btn></div>;})}</div>}</div>}

      {tab==="refs"&&<div>
        <H2 sub="Employers may contact these people after making an offer" action={<Btn kind="outline" size="sm" icon="plus" onClick={()=>setShowRef(true)}>Add reference</Btn>}>Professional references</H2>
        {A.references.filter(r=>r.user===u.id).length===0
          ? <Empty icon="users" title="No references yet" body="Add 2-3 previous supervisors or colleagues. Employers typically check references before extending an offer."
              action={<Btn kind="primary" icon="plus" onClick={()=>setShowRef(true)}>Add your first reference</Btn>}/>
          : <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {A.references.filter(r=>r.user===u.id).map(r=><div key={r.id} style={{display:"flex",gap:14,alignItems:"center",padding:14,border:`1px solid ${C.line}`,borderRadius:12}}>
                <div style={{width:44,height:44,borderRadius:12,background:C.wash,color:C.brand,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontWeight:730,fontSize:16}}>{r.name?.charAt(0)?.toUpperCase()||"?"}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14.5,fontWeight:660,color:C.text}}>{r.name}</div>
                  <div style={{fontSize:13,color:C.text2,marginTop:3}}>{r.title}{r.company?` at ${r.company}`:""}</div>
                  <div style={{fontSize:12.5,color:C.text3,marginTop:3}}>{r.email} • {r.phone||"No phone"}</div>
                  {r.relationship&&<div style={{fontSize:12.5,color:C.text3,marginTop:3,fontStyle:"italic"}}>{r.relationship}</div>}</div>
                <Btn kind="ghost" size="xs" icon="trash" onClick={()=>A.removeReference(r.id)}/></div>)}</div>}
      </div>}
      {showRef&&<Modal onClose={()=>setShowRef(false)} title="Add a reference">
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Field label="Full name" required><Input value={ref.name} onChange={e=>setRef({...ref,name:e.target.value})} placeholder="Jean Tremblay"/></Field>
          <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12}}>
            <Field label="Job title"><Input value={ref.title} onChange={e=>setRef({...ref,title:e.target.value})} placeholder="Site Foreman"/></Field>
            <Field label="Company"><Input value={ref.company} onChange={e=>setRef({...ref,company:e.target.value})} placeholder="PCL Construction"/></Field>
            <Field label="Email"><Input icon="mail" type="email" value={ref.email} onChange={e=>setRef({...ref,email:e.target.value})} placeholder="jean@example.ca"/></Field>
            <Field label="Phone"><Input icon="phone" value={ref.phone} onChange={e=>setRef({...ref,phone:e.target.value})} placeholder="416 555 0100"/></Field></div>
          <Field label="Relationship" hint="How did you work together?"><Input value={ref.relationship} onChange={e=>setRef({...ref,relationship:e.target.value})} placeholder="Direct supervisor for 3 years"/></Field>
          <div style={{display:"flex",gap:9,justifyContent:"flex-end"}}>
            <Btn kind="ghost" onClick={()=>setShowRef(false)}>Cancel</Btn>
            <Btn kind="primary" icon="check" disabled={!ref.name||!ref.email} onClick={()=>{A.addReference(ref);setRef({name:"",title:"",company:"",email:"",phone:"",relationship:""});setShowRef(false);}}>Add reference</Btn></div>
        </div></Modal>}
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:24,paddingTop:20,borderTop:`1px solid ${C.lineSoft}`}}>
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
      <div style={{display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
        <EmpMark e={e} size={mob?60:72} radius={18}/>
        <div style={{flex:"1 1 200px",minWidth:0}}>
          <div style={{display:"flex",gap:9,alignItems:"center",flexWrap:"wrap"}}>
            <span style={{fontSize:mob?20:23,fontWeight:720,color:C.text,letterSpacing:"-.03em"}}>{e.name}</span>
            {e.verified?<Tag tone="ok" sm icon="checkC2">Verified</Tag>:<Tag tone="warn" sm icon="clock">Pending review</Tag>}</div>
          <div style={{fontSize:14,color:C.text2,marginTop:5}}>{e.industry} • {e.city}, {e.prov} • {e.size} employees</div>
          <div style={{fontSize:13.5,color:C.text3,marginTop:3}}>{A.user.email}</div></div>
        <Btn kind="primary" icon="edit" onClick={()=>A.go("empCompany")}>Edit company</Btn></div></Card>
    <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12}}>
      {[["home","Dashboard","empHome"],["briefcase","My job listings","empJobs"],["users","Candidates","empPipeline"],
        ["book","Articles and trainings","empContent"],["wallet","Billing and plan","empBilling"],["gear","Settings","settings"]].map(([ic,l,p])=>
        <button key={p} onClick={()=>A.go(p)} style={{display:"flex",alignItems:"center",gap:13,padding:"16px 18px",
          background:"#fff",border:`1px solid ${C.line}`,borderRadius:13,cursor:"pointer",fontFamily:"inherit",textAlign:"left",transition:"all .16s"}}
          onMouseEnter={ev=>ev.currentTarget.style.borderColor=C.brand} onMouseLeave={ev=>ev.currentTarget.style.borderColor=C.line}>
          <span style={{width:38,height:38,borderRadius:10,background:C.wash,color:C.brand,display:"flex",alignItems:"center",justifyContent:"center"}}><I n={ic} s={18}/></span>
          <span style={{flex:1,fontSize:14.5,fontWeight:600,color:C.text}}>{l}</span><I n="chevR" s={16} c={C.text3}/></button>)}</div>
  </Page>;
}

export function AdminAccountPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  return <Page narrow>
    <H1 sub="Administrator account">Account</H1>
    <Card pad={mob?18:24} style={{marginBottom:16}}>
      <div style={{display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
        <SmartPortrait seed={A.user.seed??0} size={mob?60:72} radius={18}/>
        <div style={{flex:"1 1 200px",minWidth:0}}>
          <div style={{fontSize:mob?20:23,fontWeight:720,color:C.text,letterSpacing:"-.03em"}}>{A.user.name}</div>
          <div style={{fontSize:14,color:C.text2,marginTop:5}}>Platform administrator</div>
          <div style={{fontSize:13.5,color:C.text3,marginTop:3}}>{A.user.email}</div></div></div></Card>
    <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12}}>
      {[["home","Overview","admHome"],["users","Users","admUsers"],["building","Employers","admEmployers"],
        ["shield","Job moderation","admJobs"],["book","Articles","admBlogs"],["cap","Trainings","admTrainings"],
        ["trend","Statistics","admStats"],["file","Activity log","admLog"],["gear","Platform settings","admSettings"]].map(([ic,l,p])=>
        <button key={p} onClick={()=>A.go(p)} style={{display:"flex",alignItems:"center",gap:13,padding:"16px 18px",
          background:"#fff",border:`1px solid ${C.line}`,borderRadius:13,cursor:"pointer",fontFamily:"inherit",textAlign:"left",transition:"all .16s"}}
          onMouseEnter={ev=>ev.currentTarget.style.borderColor=C.brand} onMouseLeave={ev=>ev.currentTarget.style.borderColor=C.line}>
          <span style={{width:38,height:38,borderRadius:10,background:C.wash,color:C.brand,display:"flex",alignItems:"center",justifyContent:"center"}}><I n={ic} s={18}/></span>
          <span style={{flex:1,fontSize:14.5,fontWeight:600,color:C.text}}>{l}</span><I n="chevR" s={16} c={C.text3}/></button>)}</div>
  </Page>;
}
