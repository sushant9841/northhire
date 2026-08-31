import { useState } from "react";
import { use } from "../../store/context.js";
import { C, SH } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Tag, Card, SmartLogo, SmartScene, SmartPortrait } from "../../design/primitives.jsx";
import { pay, payUnit, dlText, money } from "../../helpers/utils.js";

export function EmpMark({e,size=46,radius=12}){return <SmartLogo e={e} size={size} radius={radius}/>;}

export function SaveBtn({id,size=20}){
  const A=use(); const on=A.saved.has(id);
  const [pulse,setPulse]=useState(false);
  return <button aria-label={on?"Saved":"Save job"} title={on?"Saved":"Save job"}
    onClick={e=>{e.stopPropagation();A.toggleSave(id);setPulse(true);setTimeout(()=>setPulse(false),320);}}
    style={{background:"none",border:"none",cursor:"pointer",padding:4,display:"flex",color:on?C.brand:C.text3,
      transition:"color .18s",transform:pulse?"scale(1.22)":"scale(1)",transitionProperty:"color,transform"}}>
    <I n="bookmark" s={size} w={on?0:1.8} fill={on?C.brand:"none"}/></button>;
}

/* ─── Hiring-type badge: flags agency-perm listings on public views ─── */
export function HiringTypeBadge({jobId,size="sm"}){
  const A=use(); const type=A.jobHiringType(jobId);
  const [showTip,setShowTip]=useState(false);
  /* Direct hires are the default — no badge needed, less visual noise */
  if(type==="direct")return null;
  /* Only agency-perm shows a badge on public listings */
  const configs={
    "agency-perm":{tone:"violet",icon:"award",label:"Recruiter search",tip:"NorthHire Staffing is representing this hire for the client. You'd be on the client's payroll; the client pays our fee. Never a cost to you."}
  };
  const cfg=configs[type]; if(!cfg)return null;
  return <span style={{position:"relative",display:"inline-flex"}} onMouseEnter={()=>setShowTip(true)} onMouseLeave={()=>setShowTip(false)}>
    <Tag tone={cfg.tone} sm={size==="sm"} icon={cfg.icon}>{cfg.label}</Tag>
    {showTip&&<div style={{position:"absolute",bottom:"100%",left:0,marginBottom:6,background:C.ink,color:"#fff",fontSize:12,padding:"9px 12px",borderRadius:9,width:260,zIndex:600,boxShadow:SH.md,lineHeight:1.5,pointerEvents:"none"}}>
      {cfg.tip}
      <div style={{position:"absolute",top:"100%",left:16,width:0,height:0,borderLeft:"6px solid transparent",borderRight:"6px solid transparent",borderTop:`6px solid ${C.ink}`}}/>
    </div>}
  </span>;
}

export function JobCard({job,delay=0}){
  const A=use(); const e=A.emp(job.e);
  const applied=A.appliedJobIds.has(job.id);
  return <Card hover delay={delay} onClick={()=>A.openJob(job.id)} pad={18}
    style={{}}>
    <div style={{display:"flex",gap:13,alignItems:"flex-start",marginBottom:12}}>
      <EmpMark e={e}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:15.5,fontWeight:660,color:C.text,lineHeight:1.32,letterSpacing:"-.02em"}}>{job.t}</div>
        <div style={{fontSize:13.5,color:C.text2,marginTop:4,display:"flex",alignItems:"center",gap:6}}>
          <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.name}</span>
          {e.verified&&<span style={{color:C.brand,display:"flex",flexShrink:0}} title="Verified employer"><I n="checkC2" s={14} w={2}/></span>}</div>
      </div>
      <SaveBtn id={job.id}/>
    </div>
    <div style={{display:"flex",alignItems:"baseline",gap:7,background:C.tint,border:`1px solid ${C.line2}`,
      borderRadius:10,padding:"9px 12px",marginBottom:12}}>
      <span style={{fontSize:16.5,fontWeight:730,color:C.brand,letterSpacing:"-.025em"}}>{pay(job)}</span>
      <span style={{fontSize:12.5,color:C.brand,opacity:.75,fontWeight:550}}>{payUnit(job)}</span></div>
    <div style={{display:"flex",gap:14,flexWrap:"wrap",fontSize:13,color:C.text2,marginBottom:12}}>
      <span style={{display:"flex",alignItems:"center",gap:5}}><I n="pin" s={14} c={C.text3}/>{job.city}, {job.prov}</span>
      <span style={{display:"flex",alignItems:"center",gap:5}}><I n="clock" s={14} c={C.text3}/>{job.type}</span>
      <span style={{display:"flex",alignItems:"center",gap:5}}><I n="users" s={14} c={C.text3}/>{job.vac} {job.vac===1?"opening":"openings"}</span></div>
    <div style={{display:"flex",gap:7,flexWrap:"wrap",alignItems:"center"}}>
      <HiringTypeBadge jobId={job.id}/>
      {job.mode!=="On-site"&&<Tag tone="ok" sm>{job.mode}</Tag>}
      {job.urgent&&<Tag tone="warn" sm icon="alert">Urgent</Tag>}
      {applied&&<Tag tone="brand" sm icon="check">Applied</Tag>}
      <span style={{marginLeft:"auto",fontSize:12.5,color:job.dl<=7?C.red:C.text3,fontWeight:550}}>{dlText(job.dl)}</span></div>
  </Card>;
}

export function BlogCard({b,delay=0,compact}){
  const A=use();
  return <div onClick={()=>A.openBlog(b.id)} style={{background:"#fff",borderRadius:20,overflow:"hidden",
    border:`1px solid ${C.line}`,cursor:"pointer",transition:"transform .2s,border-color .2s"}}
    onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.borderColor=C.line2;}}
    onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.borderColor=C.line;}}>
    <div style={{aspectRatio:"16/10",background:C.bg}}><SmartScene kind={b.scene} tone={b.tone} w="100%" h="100%" seed={b.id.length}/></div>
    <div style={{padding:22}}>
      <Tag tone="brand" sm>{b.cat}</Tag>
      <div style={{fontSize:17,fontWeight:680,color:C.text,lineHeight:1.35,letterSpacing:"-.02em",margin:"12px 0 10px"}}>{b.title}</div>
      {!compact&&<p style={{fontSize:14,color:C.text2,lineHeight:1.6,margin:"0 0 16px"}}>{b.excerpt}</p>}
      <div style={{display:"flex",alignItems:"center",gap:10,paddingTop:14,borderTop:`1px solid ${C.lineSoft}`}}>
        <SmartPortrait seed={b.authorSeed} size={30}/>
        <span style={{fontSize:13,color:C.text2,fontWeight:550}}>{b.author}</span>
        <span style={{marginLeft:"auto",fontSize:13,color:C.text3}}>{b.mins} min read</span></div></div></div>;
}
export function TrainingCard({t,delay=0}){
  const A=use(); const enrolled=A.enrolled.has(t.id);
  return <div onClick={()=>A.openTraining(t.id)} style={{background:"#fff",borderRadius:20,overflow:"hidden",
    border:`1px solid ${C.line}`,cursor:"pointer",transition:"transform .2s,border-color .2s"}}
    onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.borderColor=C.line2;}}
    onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.borderColor=C.line;}}>
    <div style={{position:"relative",aspectRatio:"16/10",background:C.bg}}>
      <SmartScene kind={t.scene} tone={t.tone} w="100%" h="100%" seed={t.id.length}/>
      <div style={{position:"absolute",top:14,left:14}}>
        <Tag tone={t.price===0?"ok":"dark"} sm>{t.price===0?"Free":money(t.price)}</Tag></div>
      {enrolled&&<div style={{position:"absolute",top:14,right:14}}><Tag tone="brand" sm icon="check">Enrolled</Tag></div>}</div>
    <div style={{padding:22}}>
      <div style={{display:"flex",gap:7,marginBottom:12}}><Tag sm>{t.level}</Tag><Tag sm icon="clock">{t.hours} h</Tag></div>
      <div style={{fontSize:16.5,fontWeight:680,color:C.text,lineHeight:1.35,letterSpacing:"-.02em",marginBottom:12}}>{t.title}</div>
      <div style={{display:"flex",alignItems:"center",gap:9,fontSize:13,color:C.text2,paddingTop:14,borderTop:`1px solid ${C.lineSoft}`}}>
        <span style={{color:C.warn,display:"flex",alignItems:"center",gap:4,fontWeight:650}}>
          <I n="star" s={13} fill={C.warn} w={0}/>{t.rating}</span>
        <span style={{color:C.text3}}>•</span><span>{t.enrolled.toLocaleString()} enrolled</span></div></div></div>;
}
