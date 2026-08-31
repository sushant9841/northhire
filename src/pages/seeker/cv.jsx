import { useState, useEffect } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C, FONT, SH } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn, Tag, Card, Input, Field, Banner, H2, Empty, Tabs, SmartPortrait, RichText, Page } from "../../design/primitives.jsx";
import { uid } from "../../helpers/utils.js";
import { CV_TEMPLATES } from "../../store/seed/constants.js";

/* ═══════════════ CV BUILDER — multiple CVs, three templates ═══════════════ */
export function CvPreview({cv,u,scale=1}){
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
    {cv.summary&&<><SecT>Professional summary</SecT>
      <div style={{fontSize:12*scale,color:"#333",lineHeight:1.65}}>{cv.summary}</div></>}
    {cv.exp?.length>0&&<><SecT>Work experience</SecT>
      {cv.exp.map(x=><div key={x.id} style={{marginBottom:10*scale}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:10}}>
          <span style={{fontSize:12.5*scale,fontWeight:700,color:"#0E1727"}}>{x.role}</span>
          <span style={{fontSize:11*scale,color:"#4A5A73",flexShrink:0}}>{x.from} – {x.to}</span></div>
        <div style={{fontSize:11.5*scale,color:C.brand,fontWeight:600,marginTop:1*scale}}>{x.org}{x.place?` · ${x.place}`:""}</div>
        {x.detail&&<div style={{fontSize:11.5*scale,color:"#444",marginTop:3*scale,lineHeight:1.6}}>{x.detail}</div>}</div>)}</>}
    {cv.edu?.length>0&&<><SecT>Education</SecT>
      {cv.edu.map(x=><div key={x.id} style={{marginBottom:8*scale,display:"flex",justifyContent:"space-between",gap:10}}>
        <div><div style={{fontSize:12.5*scale,fontWeight:700,color:"#0E1727"}}>{x.qual}</div>
          <div style={{fontSize:11.5*scale,color:"#4A5A73",marginTop:1*scale}}>{x.org}</div></div>
        <span style={{fontSize:11*scale,color:"#4A5A73",flexShrink:0}}>{x.year}</span></div>)}</>}
    {cv.certs?.length>0&&<><SecT>Certifications</SecT>
      <div style={{display:"flex",flexWrap:"wrap",gap:5*scale}}>
        {cv.certs.map(c=><span key={c} style={{fontSize:11*scale,background:C.okBg,color:C.ok,
          border:`1px solid ${C.okLn}`,padding:`${3*scale}px ${7*scale}px`,borderRadius:5*scale,fontWeight:600}}>{c}</span>)}</div></>}
  </>;
  if(T==="modern") return <div style={{...wrap,padding:0,display:"flex"}}>
    <div style={{width:"33%",background:"#0E1727",color:"#fff",padding:22*scale,boxSizing:"border-box"}}>
      <div style={{marginBottom:16*scale}}><SmartPortrait seed={u.seed??0} size={64*scale} radius={12*scale}/></div>
      <div style={{fontSize:10.5*scale,fontWeight:750,letterSpacing:".09em",textTransform:"uppercase",color:"rgba(255,255,255,.5)",marginBottom:7*scale}}>Contact</div>
      <div style={{fontSize:11*scale,color:"rgba(255,255,255,.85)",lineHeight:1.9,marginBottom:16*scale,wordBreak:"break-word"}}>
        {cv.email||u.email}<br/>{cv.phone||u.phone}<br/>{cv.city||u.city}, {cv.prov||u.prov}</div>
      {cv.skills?.length>0&&<><div style={{fontSize:10.5*scale,fontWeight:750,letterSpacing:".09em",textTransform:"uppercase",color:"rgba(255,255,255,.5)",marginBottom:7*scale}}>Skills</div>
        <div style={{display:"flex",flexDirection:"column",gap:5*scale}}>
          {cv.skills.map(s=><span key={s} style={{fontSize:11*scale,color:"rgba(255,255,255,.9)"}}>{s}</span>)}</div></>}
    </div>
    <div style={{flex:1,padding:24*scale,boxSizing:"border-box",minWidth:0}}><Head/><Body/></div></div>;
  return <div style={wrap}>
    <div style={{borderBottom:T==="classic"?`2px solid #0E1727`:"none",paddingBottom:12*scale}}><Head/></div>
    {T==="compact"&&cv.skills?.length>0&&<div style={{fontSize:11*scale,color:"#4A5A73",marginTop:8*scale}}>
      <strong style={{color:"#0E1727"}}>Skills: </strong>{cv.skills.join(" • ")}</div>}
    <Body/>
    {T!=="compact"&&cv.skills?.length>0&&<><SecT>Skills</SecT>
      <div style={{display:"flex",flexWrap:"wrap",gap:5*scale}}>
        {cv.skills.map(s=><span key={s} style={{fontSize:11*scale,background:C.wash,color:C.brand,
          border:`1px solid ${C.line2}`,padding:`${3*scale}px ${8*scale}px`,borderRadius:5*scale,fontWeight:600}}>{s}</span>)}</div></>}
  </div>;
}

export function CvsPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const pad=mob?"44px 16px":"72px 32px";
  return <div style={{background:"#fff",minHeight:"100%"}}>
    <section style={{padding:pad,background:"#fff",borderBottom:`1px solid ${C.lineSoft}`}}>
      <div style={{maxWidth:1120,margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",gap:20,flexWrap:"wrap"}}>
          <div><Tag tone="brand" icon="file">CV builder</Tag>
            <h1 style={{fontSize:mob?32:52,fontWeight:770,letterSpacing:"-.045em",color:C.text,margin:"18px 0 12px",lineHeight:1.08}}>My CVs.</h1>
            <p style={{fontSize:mob?16:19,color:C.text2,lineHeight:1.55,margin:0,maxWidth:520}}>Build as many versions as you need. Pick which one employers receive.</p></div>
          <Btn kind="primary" size="lg" icon="plus" onClick={()=>A.newCv()}>New CV</Btn></div>
      </div>
    </section>
    <section style={{padding:mob?"32px 16px 56px":"48px 32px 96px",background:C.bg,minHeight:400}}>
      <div style={{maxWidth:1120,margin:"0 auto"}}>
    {A.cvs.length===0?<Empty icon="file" title="No CVs yet"
      body="Build a CV from your profile in about a minute. You can keep several versions — one for trades, one for office work — and choose which is attached to each application."
      action={<Btn kind="primary" icon="plus" onClick={()=>A.newCv()}>Build my first CV</Btn>}/>
      :<div style={{display:"grid",gridTemplateColumns:`repeat(auto-fill,minmax(${mob?250:280}px,1fr))`,gap:16}}>
        {A.cvs.map((cv,i)=><Card key={cv.id} pad={0} delay={i*0.05} style={{overflow:"hidden"}}>
          <div style={{height:190,overflow:"hidden",background:C.bg,borderBottom:`1px solid ${C.line}`,position:"relative"}}>
            <div style={{transform:"scale(.52)",transformOrigin:"top left",width:"192%",pointerEvents:"none"}}>
              <CvPreview cv={cv} u={A.user}/></div>
            {A.user.defaultCv===cv.id&&<div style={{position:"absolute",top:10,right:10}}><Tag tone="ok" sm icon="check">Default</Tag></div>}</div>
          <div style={{padding:16}}>
            <div style={{fontSize:15.5,fontWeight:660,color:C.text,letterSpacing:"-.02em"}}>{cv.name}</div>
            <div style={{fontSize:12.5,color:C.text3,marginTop:4}}>
              {CV_TEMPLATES.find(t=>t.id===cv.template)?.name} • updated {cv.updated}</div>
            <div style={{display:"flex",gap:8,marginTop:14,flexWrap:"wrap"}}>
              <Btn kind="primary" size="sm" icon="edit" onClick={()=>A.editCv(cv.id)}>Edit</Btn>
              <Btn kind="outline" size="sm" icon="download" onClick={()=>A.printCv(cv)}>PDF</Btn>
              <Btn kind="ghost" size="sm" icon="copy" title="Duplicate" onClick={()=>A.duplicateCv(cv.id)}/>
              <Btn kind="ghost" size="sm" icon="trash" title="Delete" onClick={()=>A.deleteCv(cv.id)}/></div>
            {A.user.defaultCv!==cv.id&&<Btn kind="ghost" size="sm" full style={{marginTop:8}} onClick={()=>A.setDefaultCv(cv.id)}>Make default</Btn>}</div></Card>)}</div>}
      </div>
    </section>
  </div>;
}

export function CvEditPage(){
  const A=use(); const mob=useMedia("(max-width: 1024px)");
  const cv=A.cvs.find(c=>c.id===A.cvId);
  const [d,setD]=useState(cv?{...cv}:null);
  const [sec,setSec]=useState("basics");
  useEffect(()=>{if(cv)setD({...cv});},[A.cvId]);
  if(!cv||!d) return <Page><Empty icon="file" title="CV not found" body="It may have been deleted."
    action={<Btn kind="primary" onClick={()=>A.go("cvs")}>My CVs</Btn>}/></Page>;
  const set=(k,v)=>setD(p=>({...p,[k]:v}));
  const dirty=JSON.stringify(d)!==JSON.stringify(cv);
  const addExp=()=>set("exp",[...(d.exp||[]),{id:uid("x"),role:"",org:"",place:"",from:"",to:"Present",detail:""}]);
  const addEdu=()=>set("edu",[...(d.edu||[]),{id:uid("e"),qual:"",org:"",year:""}]);
  const upd=(key,id,k,v)=>set(key,d[key].map(x=>x.id===id?{...x,[k]:v}:x));
  const rm=(key,id)=>set(key,d[key].filter(x=>x.id!==id));
  const move=(key,id,dir)=>{const arr=[...(d[key]||[])];const i=arr.findIndex(x=>x.id===id);
    const j=i+dir; if(i<0||j<0||j>=arr.length)return; [arr[i],arr[j]]=[arr[j],arr[i]]; set(key,arr);};
  const secs=[{k:"basics",label:"Basics",icon:"user"},{k:"exp",label:"Experience",icon:"briefcase"},
    {k:"edu",label:"Education",icon:"cap"},{k:"skills",label:"Skills",icon:"sparkle"},{k:"design",label:"Design",icon:"layout"}];

  /* First CV of this user is the "primary" — name/email locked on others */
  const myCvs=A.cvs.filter(c=>c.user===A.user.id);
  const isPrimary=myCvs.length>0&&myCvs[0].id===d.id;

  return <div style={{background:C.bg,minHeight:"100%"}}>
    <div style={{background:"#fff",borderBottom:`1px solid ${C.line}`,position:"sticky",top:60,zIndex:250}}>
      <div style={{maxWidth:1240,margin:"0 auto",padding:mob?"12px 16px":"14px 28px",display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{flex:"1 1 200px",minWidth:0}}>
          <Input value={d.name} onChange={e=>set("name",e.target.value)} placeholder="CV name, e.g. Trades CV"
            style={{fontWeight:640,fontSize:15,border:"none",padding:"6px 0",boxShadow:"none"}}/></div>
        <div style={{display:"flex",gap:9,flexWrap:"wrap"}}>
          <Btn kind="ghost" size="sm" icon="chevL" onClick={()=>A.go("cvs")}>Back to CVs</Btn>
          <Btn kind="outline" size="sm" icon="download" onClick={()=>A.printCv(d)}>Download PDF</Btn>
          <Btn kind="primary" size="sm" icon="check" disabled={!dirty} onClick={()=>A.saveCv(d)}>{dirty?"Save":"Saved"}</Btn></div></div></div>
    <div style={{maxWidth:1240,margin:"0 auto",padding:mob?"16px 16px 30px":"22px 28px 44px",
      display:"grid",gridTemplateColumns:mob?"1fr":"1fr 400px",gap:20,alignItems:"start"}}>
      <div>
        <Tabs items={secs} value={sec} onChange={setSec} style={{marginBottom:16}}/>
        <Card pad={mob?18:24}>
          {sec==="basics"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
            <H2 sub="Pulled from your profile — edit here for this CV only">Contact details</H2>
            <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:14}}>
              <Field label="Full name" hint={isPrimary?null:"Locked — edit in your main profile to change everywhere."}>
                <Input value={d.name0||A.user.name} onChange={e=>set("name0",e.target.value)} disabled={!isPrimary} placeholder={A.user.name}/></Field>
              <Field label="Headline"><Input value={d.title||""} onChange={e=>set("title",e.target.value)} placeholder={A.user.title}/></Field>
              <Field label="Email" hint={isPrimary?null:"Locked — edit in your main profile."}>
                <Input icon="mail" value={d.email||A.user.email} onChange={e=>set("email",e.target.value)} disabled={!isPrimary} placeholder={A.user.email}/></Field>
              <Field label="Phone"><Input icon="phone" value={d.phone||""} onChange={e=>set("phone",e.target.value)} placeholder={A.user.phone}/></Field>
              <Field label="City"><Input icon="pin" value={d.city||""} onChange={e=>set("city",e.target.value)} placeholder={A.user.city}/></Field>
              <Field label="Province"><Input value={d.prov||""} onChange={e=>set("prov",e.target.value)} placeholder={A.user.prov}/></Field></div>
            <Field label="Professional summary" hint="Two or three sentences at the top of the CV. Use bold or bullets to highlight your best qualifications.">
              <RichText value={d.summary||""} onChange={v=>set("summary",v)} rows={4}
                placeholder="e.g. Experienced journeyperson electrician with 8 years on commercial projects across Alberta..."/></Field></div>}

          {sec==="exp"&&<div>
            <H2 sub="Most recent first" action={<Btn kind="outline" size="sm" icon="plus" onClick={addExp}>Add role</Btn>}>Work experience</H2>
            {(d.exp||[]).length===0?<Empty icon="briefcase" title="No roles yet" body="Add your most recent position first."
              action={<Btn kind="primary" icon="plus" onClick={addExp}>Add a role</Btn>}/>
              :<div style={{display:"flex",flexDirection:"column",gap:14}}>
                {d.exp.map((x,i)=><div key={x.id} style={{border:`1px solid ${C.line}`,borderRadius:12,padding:16}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <span style={{fontSize:12.5,fontWeight:700,color:C.text3,letterSpacing:".05em"}}>ROLE {i+1}</span>
                    <div style={{display:"flex",gap:4}}>
                      <Btn kind="ghost" size="xs" icon="chevU" disabled={i===0} onClick={()=>move("exp",x.id,-1)}/>
                      <Btn kind="ghost" size="xs" icon="chevD" disabled={i===d.exp.length-1} onClick={()=>move("exp",x.id,1)}/>
                      <Btn kind="ghost" size="xs" icon="trash" onClick={()=>rm("exp",x.id)}/></div></div>
                  <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12}}>
                    <Field label="Job title"><Input value={x.role} onChange={e=>upd("exp",x.id,"role",e.target.value)} placeholder="Journeyperson Electrician"/></Field>
                    <Field label="Employer"><Input value={x.org} onChange={e=>upd("exp",x.id,"org",e.target.value)} placeholder="PCL Construction"/></Field>
                    <Field label="Location"><Input value={x.place} onChange={e=>upd("exp",x.id,"place",e.target.value)} placeholder="Calgary, AB"/></Field>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                      <Field label="From"><Input type="month" value={x.from} onChange={e=>upd("exp",x.id,"from",e.target.value)}/></Field>
                      <Field label="To">
                        <Input type="month" value={x.currently?"":x.to==="Present"?"":x.to} disabled={x.currently}
                          onChange={e=>upd("exp",x.id,"to",e.target.value)}/>
                      </Field>
                    </div>
                  </div>
                  <label style={{display:"flex",gap:8,alignItems:"center",marginTop:10,fontSize:13,color:C.text2,cursor:"pointer"}}>
                    <input type="checkbox" checked={!!x.currently||x.to==="Present"} onChange={e=>{
                      const on=e.target.checked; upd("exp",x.id,"currently",on); upd("exp",x.id,"to",on?"Present":"");}}/>
                    I currently work here
                  </label>
                  <Field label="Your responsibilities and achievements" style={{marginTop:12}} hint="Describe what you were responsible for and any measurable results.">
                    <RichText value={x.detail} onChange={v=>upd("exp",x.id,"detail",v)} rows={4}
                      placeholder="Write your roles and responsibilities. Include measurable results where you can."/></Field></div>)}</div>}</div>}

          {sec==="edu"&&<div>
            <H2 sub="Include apprenticeships and trade certificates" action={<Btn kind="outline" size="sm" icon="plus" onClick={addEdu}>Add</Btn>}>Education</H2>
            {(d.edu||[]).length===0?<Empty icon="cap" title="Nothing added yet" body="Add your highest qualification, apprenticeship or trade certificate."
              action={<Btn kind="primary" icon="plus" onClick={addEdu}>Add education</Btn>}/>
              :<div style={{display:"flex",flexDirection:"column",gap:12}}>
                {d.edu.map(x=><div key={x.id} style={{border:`1px solid ${C.line}`,borderRadius:12,padding:16}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <span style={{fontSize:12.5,fontWeight:700,color:C.text3,letterSpacing:".05em"}}>ENTRY</span>
                    <div style={{display:"flex",gap:4}}>
                      <Btn kind="ghost" size="xs" icon="chevU" disabled={d.edu.indexOf(x)===0} onClick={()=>move("edu",x.id,-1)}/>
                      <Btn kind="ghost" size="xs" icon="chevD" disabled={d.edu.indexOf(x)===d.edu.length-1} onClick={()=>move("edu",x.id,1)}/>
                      <Btn kind="ghost" size="xs" icon="trash" onClick={()=>rm("edu",x.id)}/></div></div>
                  <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"2fr 2fr 1fr",gap:12}}>
                    <Field label="Qualification"><Input value={x.qual} onChange={e=>upd("edu",x.id,"qual",e.target.value)} placeholder="Red Seal, Construction Electrician"/></Field>
                    <Field label="Institution"><Input value={x.org} onChange={e=>upd("edu",x.id,"org",e.target.value)} placeholder="SAIT"/></Field>
                    <Field label="Year"><Input type="number" inputMode="numeric" min="1950" max="2035" value={x.year} onChange={e=>upd("edu",x.id,"year",e.target.value.replace(/[^0-9]/g,"").slice(0,4))} placeholder="2018"/></Field></div></div>)}</div>}</div>}

          {sec==="skills"&&<div>
            <H2 sub="Pulled from your profile — tick the ones for this CV">Skills and certifications</H2>
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:20}}>
              {A.user.skills.map(s=>{const on=(d.skills||[]).includes(s);
                return <button key={s} onClick={()=>set("skills",on?d.skills.filter(x=>x!==s):[...(d.skills||[]),s])}
                  style={{display:"inline-flex",alignItems:"center",gap:6,padding:"7px 12px",borderRadius:8,cursor:"pointer",
                    fontFamily:"inherit",fontSize:13.5,fontWeight:on?640:520,border:`1.5px solid ${on?C.brand:C.line}`,
                    background:on?C.brand:"#fff",color:on?"#fff":C.text2,transition:"all .16s"}}>
                  {on&&<I n="check" s={13} c="#fff" w={2.6}/>}{s}</button>;})}</div>
            <Field label="Certifications shown separately" hint="Comma separated. These appear in a highlighted block.">
              <Input value={(d.certs||[]).join(", ")} onChange={e=>set("certs",e.target.value.split(",").map(s=>s.trim()).filter(Boolean))}
                placeholder="Red Seal, Fall Protection, WHMIS 2015"/></Field>
            <Btn kind="ghost" size="sm" style={{marginTop:14}} onClick={()=>A.go("profile")}>Add more skills to your profile</Btn></div>}

          {sec==="design"&&<div>
            <H2 sub="Switch any time — your content stays the same">Template</H2>
            <div style={{display:"flex",flexDirection:"column",gap:11}}>
              {CV_TEMPLATES.map(t=>{const on=d.template===t.id;
                return <button key={t.id} onClick={()=>set("template",t.id)} style={{display:"flex",gap:14,alignItems:"center",
                  padding:14,borderRadius:12,cursor:"pointer",fontFamily:"inherit",textAlign:"left",width:"100%",
                  border:`1.5px solid ${on?C.brand:C.line}`,background:on?C.tint:"#fff",transition:"all .16s"}}>
                  <div style={{width:52,height:66,borderRadius:6,overflow:"hidden",flexShrink:0,border:`1px solid ${C.line}`,background:"#fff"}}>
                    <div style={{transform:"scale(.14)",transformOrigin:"top left",width:"714%",pointerEvents:"none"}}>
                      <CvPreview cv={{...d,template:t.id}} u={A.user}/></div></div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:15,fontWeight:660,color:on?C.brand:C.text}}>{t.name}</div>
                    <div style={{fontSize:13,color:C.text2,marginTop:3,lineHeight:1.5}}>{t.desc}</div></div>
                  <span style={{width:20,height:20,borderRadius:99,flexShrink:0,border:`2px solid ${on?C.brand:C.line}`,
                    display:"flex",alignItems:"center",justifyContent:"center"}}>{on&&<span style={{width:10,height:10,borderRadius:99,background:C.brand}}/>}</span></button>;})}</div>
            <Banner tone="neutral" icon="info" title="Which should I use?" style={{marginTop:18}}>
              Classic is the safest for applicant tracking systems and is what most trades, healthcare and office employers expect. Modern suits office and tech roles. Compact fits a long history onto one page.</Banner></div>}
        </Card></div>

      <div style={{position:mob?"static":"sticky",top:140}}>
        <Card pad={0} style={{overflow:"hidden"}}>
          <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.lineSoft}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:13,fontWeight:650,color:C.text}}>Live preview</span>
            <Tag sm>{CV_TEMPLATES.find(t=>t.id===d.template)?.name}</Tag></div>
          <div style={{background:C.bg,padding:14,maxHeight:mob?420:620,overflowY:"auto"}}>
            <div style={{boxShadow:SH.md,borderRadius:4,overflow:"hidden",background:"#fff"}}>
              <CvPreview cv={d} u={A.user} scale={0.86}/></div></div></Card></div>
    </div></div>;
}
