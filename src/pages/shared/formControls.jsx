import { useState, useEffect, useRef } from "react";
import { C, SH } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn, Tag, Input } from "../../design/primitives.jsx";
import { uid } from "../../helpers/utils.js";

/* Canadian cities for LocationInput autocomplete */
const CA_LOCATIONS=[
  "Toronto, ON","Vancouver, BC","Montreal, QC","Calgary, AB","Edmonton, AB","Ottawa, ON","Winnipeg, MB",
  "Quebec City, QC","Hamilton, ON","Kitchener, ON","London, ON","Victoria, BC","Halifax, NS","Oshawa, ON",
  "Windsor, ON","Saskatoon, SK","Regina, SK","Sherbrooke, QC","St. John's, NL","Barrie, ON","Kelowna, BC",
  "Abbotsford, BC","Kingston, ON","Sudbury, ON","Trois-Rivières, QC","Guelph, ON","Moncton, NB","Brantford, ON",
  "Saint John, NB","Peterborough, ON","Thunder Bay, ON","Charlottetown, PE","Fredericton, NB","Chilliwack, BC",
  "Red Deer, AB","Lethbridge, AB","Nanaimo, BC","Kamloops, BC","Sarnia, ON","North Bay, ON","Prince George, BC",
  "Medicine Hat, AB","Fort McMurray, AB","Brampton, ON","Mississauga, ON","Markham, ON","Vaughan, ON","Surrey, BC",
  "Burnaby, BC","Richmond, BC","Laval, QC","Longueuil, QC","Gatineau, QC","Whitehorse, YT","Yellowknife, NT","Iqaluit, NU"
];

export function LocationInput({value,onChange,placeholder="City or province",required,onLocate}){
  const [q,setQ]=useState(value||"");
  const [open,setOpen]=useState(false);
  const [idx,setIdx]=useState(-1);
  const listRef=useRef(null);
  useEffect(()=>{setQ(value||"");},[value]);
  const matches=q.length>=2
    ? CA_LOCATIONS.filter(l=>l.toLowerCase().includes(q.toLowerCase())).slice(0,8)
    : [];
  const pick=(loc)=>{setQ(loc); onChange(loc); setOpen(false); setIdx(-1);};
  const useGeoloc=()=>{
    if(!navigator.geolocation){pick("Toronto, ON");return;}
    navigator.geolocation.getCurrentPosition(
      pos=>{
        /* Rough reverse geocode to nearest seed city by distance */
        const {latitude:lat,longitude:lng}=pos.coords;
        const seedCoords={"Toronto, ON":[43.65,-79.38],"Vancouver, BC":[49.28,-123.12],"Calgary, AB":[51.05,-114.07],
          "Montreal, QC":[45.5,-73.58],"Edmonton, AB":[53.55,-113.49],"Ottawa, ON":[45.42,-75.7],"Halifax, NS":[44.65,-63.58]};
        let best="Toronto, ON",bd=Infinity;
        Object.entries(seedCoords).forEach(([n,[la,ln]])=>{
          const d=Math.hypot(la-lat,ln-lng); if(d<bd){bd=d;best=n;}
        });
        pick(best);
        if(onLocate)onLocate(best);
      },
      _=>pick("Toronto, ON")
    );
  };
  return <div style={{position:"relative"}}>
    <Input icon="pin" value={q} required={required} placeholder={placeholder}
      suffix={<button type="button" onClick={useGeoloc} title="Use my location"
        style={{background:"none",border:"none",cursor:"pointer",padding:0,display:"flex",color:C.brand}}>
        <I n="target" s={16}/></button>}
      onChange={e=>{setQ(e.target.value); setOpen(true); setIdx(-1);}}
      onFocus={()=>{if(q.length>=2)setOpen(true);}}
      onBlur={()=>setTimeout(()=>setOpen(false),180)}
      onKeyDown={e=>{
        if(e.key==="ArrowDown"){e.preventDefault(); setIdx(i=>Math.min(matches.length-1,i+1));}
        else if(e.key==="ArrowUp"){e.preventDefault(); setIdx(i=>Math.max(-1,i-1));}
        else if(e.key==="Enter"&&idx>=0){e.preventDefault(); pick(matches[idx]);}
        else if(e.key==="Escape"){setOpen(false);}
      }}/>
    {open&&matches.length>0&&<div ref={listRef} style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,
      background:"#fff",border:`1px solid ${C.line}`,borderRadius:12,boxShadow:SH.md,zIndex:200,maxHeight:280,overflowY:"auto",
      animation:"pop .16s ease"}}>
      {matches.map((m,i)=><button key={m} type="button" onMouseDown={e=>{e.preventDefault(); pick(m);}}
        onMouseEnter={()=>setIdx(i)}
        style={{display:"flex",gap:10,alignItems:"center",width:"100%",padding:"10px 14px",background:idx===i?C.bg:"#fff",
          border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:14,color:C.text,textAlign:"left",transition:"background .1s"}}>
        <I n="pin" s={15} c={C.text3}/>{m}</button>)}
    </div>}
    {q.length>=2&&open&&matches.length===0&&<div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,
      background:"#fff",border:`1px solid ${C.line}`,borderRadius:12,boxShadow:SH.md,zIndex:200,padding:"12px 14px",
      fontSize:13,color:C.text3}}>No Canadian city found. Try a nearby city or use your location.</div>}
  </div>;
}

/* InlineList — chips with inline add + delete. Used for skills, benefits, tags */
export function InlineList({value=[],onChange,placeholder="Add and press Enter",icon,max=20}){
  const [v,setV]=useState("");
  const add=()=>{const t=v.trim(); if(!t||value.includes(t)||value.length>=max)return;
    onChange([...value,t]); setV("");};
  const del=(x)=>onChange(value.filter(y=>y!==x));
  return <div>
    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:value.length?10:0}}>
      {value.map(x=><span key={x} style={{display:"inline-flex",alignItems:"center",gap:6,background:C.tint,color:C.brand,
        border:`1px solid ${C.line2}`,padding:"5px 6px 5px 11px",borderRadius:99,fontSize:12.5,fontWeight:550,transition:"transform .18s"}}
        onMouseEnter={e=>e.currentTarget.style.transform="scale(1.03)"}
        onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>{x}
        <button type="button" onClick={()=>del(x)} aria-label={`Remove ${x}`}
          style={{background:"rgba(0,0,0,.08)",border:"none",cursor:"pointer",width:18,height:18,borderRadius:99,display:"flex",alignItems:"center",justifyContent:"center",color:C.text2}}><I n="x" s={11} w={2.4}/></button>
      </span>)}
    </div>
    <div style={{display:"flex",gap:8}}>
      <div style={{flex:1}}><Input icon={icon} value={v} onChange={e=>setV(e.target.value)}
        onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault(); add();}}}
        placeholder={value.length>=max?`Maximum ${max}`:placeholder} disabled={value.length>=max}/></div>
      <Btn kind="outline" onClick={add} disabled={!v.trim()||value.length>=max} icon="plus">Add</Btn>
    </div>
  </div>;
}

/* Custom application questions builder */
const QUESTION_TYPES=[
  {k:"yesno",label:"Yes / No"},
  {k:"radio",label:"Single choice"},
  {k:"checkbox",label:"Multiple choice"},
  {k:"short",label:"Short answer"},
  {k:"long",label:"Long answer"},
];

export function QuestionBuilder({value=[],onChange}){
  const add=(type)=>{const q={id:uid("q"),type,prompt:"",required:false,options:type==="radio"||type==="checkbox"?["Option 1","Option 2"]:[]};
    onChange([...value,q]);};
  const upd=(id,patch)=>onChange(value.map(q=>q.id===id?{...q,...patch}:q));
  const del=(id)=>onChange(value.filter(q=>q.id!==id));
  const addOpt=(qid)=>upd(qid,{options:[...(value.find(q=>q.id===qid)?.options||[]),`Option ${(value.find(q=>q.id===qid)?.options.length||0)+1}`]});
  const updOpt=(qid,i,v)=>{const q=value.find(x=>x.id===qid); upd(qid,{options:q.options.map((o,j)=>j===i?v:o)});};
  const delOpt=(qid,i)=>{const q=value.find(x=>x.id===qid); upd(qid,{options:q.options.filter((_,j)=>j!==i)});};

  /* Common presets */
  const presets=[
    {t:"Do you have a valid Canadian driver's licence?",type:"yesno"},
    {t:"Are you willing to relocate for this role?",type:"yesno"},
    {t:"Do you have a valid Canadian work permit?",type:"yesno"},
    {t:"Do you require visa sponsorship?",type:"yesno"},
    {t:"Which shifts are you available for?",type:"checkbox",options:["Days","Evenings","Overnights","Weekends"]},
    {t:"When could you start?",type:"radio",options:["Immediately","Within 2 weeks","Within 1 month","More than 1 month"]},
  ];
  const addPreset=(p)=>onChange([...value,{id:uid("q"),...p,prompt:p.t,required:true,options:p.options||[]}]);

  return <div>
    {value.length>0&&<div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:16}}>
      {value.map((q,i)=><div key={q.id} style={{border:`1px solid ${C.line}`,borderRadius:12,padding:14,background:"#fff"}}>
        <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}>
          <div style={{width:24,height:24,borderRadius:99,background:C.wash,color:C.brand,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div>
          <Tag tone="neutral" sm>{QUESTION_TYPES.find(t=>t.k===q.type)?.label}</Tag>
          <div style={{marginLeft:"auto",display:"flex",gap:6,alignItems:"center"}}>
            <label style={{display:"flex",gap:5,alignItems:"center",fontSize:12,color:C.text2,cursor:"pointer"}}>
              <input type="checkbox" checked={q.required} onChange={e=>upd(q.id,{required:e.target.checked})}/>Required</label>
            <Btn kind="ghost" size="xs" icon="trash" onClick={()=>del(q.id)}/>
          </div>
        </div>
        <Input value={q.prompt} onChange={e=>upd(q.id,{prompt:e.target.value})} placeholder="Type the question…"/>
        {(q.type==="radio"||q.type==="checkbox")&&<div style={{marginTop:10,paddingLeft:6,display:"flex",flexDirection:"column",gap:6}}>
          {q.options.map((o,j)=><div key={j} style={{display:"flex",gap:8,alignItems:"center"}}>
            <span style={{color:C.text3,fontSize:12}}>{q.type==="radio"?"○":"☐"}</span>
            <Input value={o} onChange={e=>updOpt(q.id,j,e.target.value)} placeholder={`Option ${j+1}`}/>
            {q.options.length>2&&<Btn kind="ghost" size="xs" icon="x" onClick={()=>delOpt(q.id,j)}/>}
          </div>)}
          <Btn kind="ghost" size="xs" icon="plus" onClick={()=>addOpt(q.id)}>Add option</Btn>
        </div>}
      </div>)}
    </div>}

    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
      {QUESTION_TYPES.map(t=><Btn key={t.k} kind="outline" size="sm" icon="plus" onClick={()=>add(t.k)}>{t.label}</Btn>)}
    </div>

    <details style={{marginTop:14}}>
      <summary style={{cursor:"pointer",fontSize:13,color:C.text2,fontWeight:600}}>Common questions (click to add)</summary>
      <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:6}}>
        {presets.map(p=><button key={p.t} type="button" onClick={()=>addPreset(p)}
          style={{textAlign:"left",background:C.bg,border:`1px solid ${C.line}`,borderRadius:8,padding:"9px 12px",
            cursor:"pointer",fontFamily:"inherit",fontSize:13,color:C.text,transition:"all .16s"}}
          onMouseEnter={e=>{e.currentTarget.style.background=C.tint;e.currentTarget.style.borderColor=C.line2;}}
          onMouseLeave={e=>{e.currentTarget.style.background=C.bg;e.currentTarget.style.borderColor=C.line;}}>
          + {p.t}</button>)}
      </div>
    </details>
  </div>;
}

/* AI-autofill suggestion helper — deterministic templates by category */
const _AI_JD_TEMPLATES={
  trades:{desc:"We're looking for a skilled tradesperson to join our team on active project sites across the region. You'll work alongside experienced Red Seal journeypersons on commercial, industrial and infrastructure builds. Safety is our first priority — every crew member goes home the way they came in.",
    duties:["Perform installation, maintenance and repair work per code and site specifications","Interpret blueprints, drawings and technical documentation accurately","Coordinate with site supervisors and other trades to keep schedules on track","Maintain a clean, safe work site and follow all OHS regulations","Complete daily reports and time sheets","Participate in safety toolbox talks and mentor apprentices"],
    reqs:["Red Seal or provincial trade certification","Valid safety tickets (WHMIS, Working at Heights, First Aid)","Minimum 3 years site experience on commercial or industrial projects","Own hand tools and reliable transportation to site","Ability to lift 50 lbs and work in all weather conditions","Clear communication in English (French an asset in Quebec)"]},
  healthcare:{desc:"We're hiring a compassionate healthcare professional to join our care team. You'll work with a supportive interdisciplinary group serving patients across acute, complex and community settings. This is a role for someone who prioritizes patient dignity and evidence-based practice.",
    duties:["Deliver direct patient care in line with regulatory standards and best practice","Document assessments, interventions and outcomes accurately in the EMR","Collaborate with physicians, allied health and family members","Advocate for patients and their families through their care journey","Participate in quality improvement initiatives and peer education","Respond to changing patient conditions with clinical judgment"],
    reqs:["Current registration with the appropriate provincial regulatory college","Minimum 2 years relevant clinical experience","Current BLS certification (ACLS an asset)","Strong interpersonal and communication skills","Ability to work rotating shifts including nights and weekends","Vulnerable Sector Check on file"]},
  transport:{desc:"We're seeking a professional driver to join our fleet operations team. You'll be responsible for the safe, timely delivery of freight across regional and long-haul routes. We invest in modern equipment, competitive pay and driver-first scheduling.",
    duties:["Operate assigned commercial vehicle safely and in compliance with hours-of-service regulations","Complete pre-trip and post-trip inspections","Load and secure freight following DOT and company procedures","Maintain accurate logs, delivery paperwork and expense reports","Communicate proactively with dispatch about delays or issues","Represent the company professionally with customers"],
    reqs:["Valid Class 1 (AZ) commercial licence in good standing","Clean 5-year driver's abstract and CVOR","Minimum 2 years verifiable OTR experience","Ability to cross the Canada-US border","Fluent English and clean criminal record check","Physical ability to load, unload and secure freight"]},
  default:{desc:"We're looking for a motivated professional to join our growing team. In this role you'll contribute directly to team goals while developing your skills in a supportive, learning-focused environment.",
    duties:["Deliver on assigned responsibilities to a high standard","Collaborate with team members across functions","Communicate progress and blockers proactively","Contribute ideas for process improvements","Participate in team meetings and planning sessions","Maintain accurate records and documentation"],
    reqs:["Relevant post-secondary education or equivalent experience","Strong written and verbal communication skills","Ability to work independently and as part of a team","Detail-oriented with strong organizational skills","Proficient with common workplace software","Ability to legally work in Canada"]},
};
export function aiSuggestJD(title,cat){
  const key=["trades","construction","electrical","plumbing"].some(k=>cat?.includes(k)||title?.toLowerCase().includes(k))?"trades":
    ["health","care","nurse","psw"].some(k=>cat?.includes(k)||title?.toLowerCase().includes(k))?"healthcare":
    ["transport","driver","truck","logistics"].some(k=>cat?.includes(k)||title?.toLowerCase().includes(k))?"transport":"default";
  return _AI_JD_TEMPLATES[key];
}
