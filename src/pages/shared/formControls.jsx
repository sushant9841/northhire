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

/* Cloudflare Turnstile bot-check widget. Loads the vendor script once (module-level flag, so
   multiple mounts across a session don't re-inject it), then renders CF's real challenge into a
   div by ref - CF finds and manages that div itself via its own render() API, this component
   never draws the challenge UI. onToken fires with the solved token (or null if it expires). */
let _turnstileScriptPromise=null;
function _loadTurnstileScript(){
  if(_turnstileScriptPromise)return _turnstileScriptPromise;
  _turnstileScriptPromise=new Promise((resolve,reject)=>{
    if(window.turnstile){resolve();return;}
    const s=document.createElement("script");
    s.src="https://challenges.cloudflare.com/turnstile/v0/api.js";
    s.async=true; s.defer=true;
    s.onload=()=>resolve(); s.onerror=()=>reject(new Error("Turnstile script failed to load"));
    document.head.appendChild(s);
  });
  return _turnstileScriptPromise;
}
export function TurnstileWidget({siteKey,onToken}){
  const ref=useRef(null);
  const widgetId=useRef(null);
  useEffect(()=>{
    let cancelled=false;
    _loadTurnstileScript().then(()=>{
      if(cancelled||!ref.current||!window.turnstile)return;
      widgetId.current=window.turnstile.render(ref.current,{
        sitekey:siteKey,
        callback:token=>onToken(token),
        "expired-callback":()=>onToken(null),
        "error-callback":()=>onToken(null),
      });
    }).catch(()=>onToken(null));
    return ()=>{
      cancelled=true;
      if(widgetId.current!=null&&window.turnstile)try{window.turnstile.remove(widgetId.current);}catch{}
    };
  },[siteKey]);
  return <div ref={ref}/>;
}

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
  return <div className="relative">
    <Input icon="pin" value={q} required={required} placeholder={placeholder}
      suffix={<button type="button" onClick={useGeoloc} title="Use my location"
        className="bg-transparent border-0 cursor-pointer p-0 flex text-brand">
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
    {open&&matches.length>0&&<div ref={listRef} className="absolute left-0 right-0 bg-white border border-line rounded-xl shadow-md z-200 max-h-70 overflow-y-auto" style={{top:"calc(100% + 4px)",animation:"pop .16s ease"}}>
      {matches.map((m,i)=><button key={m} type="button" onMouseDown={e=>{e.preventDefault(); pick(m);}}
        onMouseEnter={()=>setIdx(i)}
        className={`flex gap-2.5 items-center w-full py-2.5 px-3.5 border-0 cursor-pointer text-sm text-text text-left transition-colors duration-100 ${idx===i?"bg-bg":"bg-white"}`}>
        <I n="pin" s={15} c={C.text3}/>{m}</button>)}
    </div>}
    {q.length>=2&&open&&matches.length===0&&<div className="absolute left-0 right-0 bg-white border border-line rounded-xl shadow-md z-200 py-3 px-3.5 text-sm text-text-3" style={{top:"calc(100% + 4px)"}}>No Canadian city found. Try a nearby city or use your location.</div>}
  </div>;
}

/* InlineList — chips with inline add + delete. Used for skills, benefits, tags */
export function InlineList({value=[],onChange,placeholder="Add and press Enter",icon,max=20}){
  const [v,setV]=useState("");
  const add=()=>{const t=v.trim(); if(!t||value.includes(t)||value.length>=max)return;
    onChange([...value,t]); setV("");};
  const del=(x)=>onChange(value.filter(y=>y!==x));
  return <div>
    <div className={`flex flex-wrap gap-1.5 ${value.length?"mb-2.5":""}`}>
      {value.map(x=><span key={x} className="inline-flex items-center gap-1.5 bg-tint text-brand border border-line-2 py-1.5 pr-1.5 pl-3 rounded-full text-xs font-medium transition-transform duration-200 hover:scale-105">{x}
        <button type="button" onClick={()=>del(x)} aria-label={`Remove ${x}`}
          className="bg-black/8 border-0 cursor-pointer w-5 h-5 rounded-full flex items-center justify-center text-text-2"><I n="x" s={11} w={2.4}/></button>
      </span>)}
    </div>
    <div className="flex gap-2">
      <div className="flex-1"><Input icon={icon} value={v} onChange={e=>setV(e.target.value)}
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
    {value.length>0&&<div className="flex flex-col gap-3 mb-4">
      {value.map((q,i)=><div key={q.id} className="border border-line rounded-xl p-3.5 bg-white">
        <div className="flex gap-2.5 items-center mb-2.5">
          <div className="w-6 h-6 rounded-full bg-wash text-brand flex items-center justify-center text-xs font-bold shrink-0">{i+1}</div>
          <Tag tone="neutral" sm>{QUESTION_TYPES.find(t=>t.k===q.type)?.label}</Tag>
          <div className="ml-auto flex gap-1.5 items-center">
            <label className="flex gap-1.5 items-center text-xs text-text-2 cursor-pointer">
              <input type="checkbox" checked={q.required} onChange={e=>upd(q.id,{required:e.target.checked})}/>Required</label>
            <Btn kind="ghost" size="xs" icon="trash" onClick={()=>del(q.id)}/>
          </div>
        </div>
        <Input value={q.prompt} onChange={e=>upd(q.id,{prompt:e.target.value})} placeholder="Type the question…"/>
        {(q.type==="radio"||q.type==="checkbox")&&<div className="mt-2.5 pl-1.5 flex flex-col gap-1.5">
          {q.options.map((o,j)=><div key={j} className="flex gap-2 items-center">
            <span className="text-text-3 text-xs">{q.type==="radio"?"○":"☐"}</span>
            <Input value={o} onChange={e=>updOpt(q.id,j,e.target.value)} placeholder={`Option ${j+1}`}/>
            {q.options.length>2&&<Btn kind="ghost" size="xs" icon="x" onClick={()=>delOpt(q.id,j)}/>}
          </div>)}
          <Btn kind="ghost" size="xs" icon="plus" onClick={()=>addOpt(q.id)}>Add option</Btn>
        </div>}
      </div>)}
    </div>}

    <div className="flex flex-wrap gap-1.5 mb-3">
      {QUESTION_TYPES.map(t=><Btn key={t.k} kind="outline" size="sm" icon="plus" onClick={()=>add(t.k)}>{t.label}</Btn>)}
    </div>

    <details className="mt-3.5">
      <summary className="cursor-pointer text-sm text-text-2 font-semibold">Common questions (click to add)</summary>
      <div className="mt-2.5 flex flex-col gap-1.5">
        {presets.map(p=><button key={p.t} type="button" onClick={()=>addPreset(p)}
          className="text-left bg-bg border border-line rounded-lg py-2.5 px-3 cursor-pointer text-sm text-text transition duration-150 hover:bg-tint hover:border-line-2">
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
  retail:{desc:"We're hiring a customer-focused retail team member to join our store. You'll be the face of our brand for every customer who walks through the door, helping them find what they need and keeping the sales floor running smoothly.",
    duties:["Greet and assist customers on the sales floor and at checkout","Process transactions accurately using the POS system","Restock shelves and maintain visual merchandising standards","Handle returns, exchanges and customer questions professionally","Meet individual and team sales targets","Keep the store clean, organized and safe"],
    reqs:["Previous retail or customer service experience an asset","Comfortable standing for extended periods and lifting up to 25 lbs","Flexible availability including evenings and weekends","Strong communication and problem-solving skills","Basic math and cash-handling accuracy","Ability to work as part of a team in a fast-paced environment"]},
  hosp:{desc:"We're hiring for our hospitality team to help deliver a great guest experience from open to close. Whether it's the kitchen, front of house or guest services, you'll be part of a team that takes pride in service.",
    duties:["Prepare, plate or serve food and beverages to company standards","Maintain cleanliness and sanitation of work areas per food-safety regulations","Greet guests and respond to requests promptly and courteously","Restock and manage inventory of supplies during a shift","Follow all health, safety and allergen-handling procedures","Support the team during peak periods and special events"],
    reqs:["Food Handler certification (or willingness to obtain)","Previous experience in hospitality, food service or a related role an asset","Ability to stand, walk and lift up to 30 lbs for a full shift","Comfortable working evenings, weekends and holidays","Strong attention to cleanliness and detail","Positive, guest-first attitude"]},
  factory:{desc:"We're hiring for our production/warehouse team to help keep orders moving accurately and on schedule. You'll work as part of a shift crew in a fast-paced, safety-first facility.",
    duties:["Operate assigned equipment or workstation per standard operating procedures","Meet production/pick-pack accuracy and throughput targets","Perform quality checks and report defects or issues","Follow all lockout/tagout and facility safety procedures","Keep your work area clean and organized (5S)","Participate in shift handover and daily huddles"],
    reqs:["Previous warehouse, manufacturing or production experience an asset","Forklift/order-picker certification a plus (or willingness to train)","Ability to lift up to 50 lbs repetitively and stand for a full shift","Comfortable working rotating or fixed shifts including weekends","Basic math and attention to detail","Steel-toe boots and PPE compliance"]},
  admin:{desc:"We're hiring an organized administrative professional to keep our office running smoothly. You'll be a key point of contact for staff, clients and visitors, and the person others rely on to keep things on track.",
    duties:["Manage calendars, correspondence and incoming inquiries","Prepare, format and proofread documents, reports and presentations","Coordinate meetings, travel arrangements and office supplies","Maintain accurate records and filing systems, digital and physical","Support other departments with administrative tasks as needed","Greet visitors and manage front-desk duties"],
    reqs:["1-2 years of administrative or office-support experience","Proficiency with Microsoft Office / Google Workspace","Excellent written and verbal communication skills","Strong organizational skills and attention to detail","Ability to handle confidential information professionally","Comfortable multitasking in a busy office environment"]},
  edu:{desc:"We're hiring an educator/childcare professional to support learning and development in a safe, engaging environment. You'll work closely with children or students and their families to help them grow and succeed.",
    duties:["Plan and deliver age-appropriate lessons or activities","Supervise and ensure the safety and wellbeing of children/students at all times","Track and document progress, milestones or learning outcomes","Communicate regularly with parents or guardians","Maintain a clean, organized and stimulating environment","Collaborate with other staff and follow licensing/curriculum standards"],
    reqs:["Early Childhood Education diploma or teaching certification as applicable","Current First Aid/CPR certification","Vulnerable Sector Check on file","Patience, creativity and strong communication skills","Previous experience working with children or students an asset","Ability to work full days on your feet and lead group activities"]},
  finance:{desc:"We're hiring a detail-oriented finance professional to support accurate, timely financial operations for our organization. You'll work closely with the finance team to keep the books clean and the numbers right.",
    duties:["Process accounts payable/receivable, reconciliations and journal entries","Prepare financial reports, statements and month-end close support","Ensure compliance with accounting standards and internal controls","Assist with budgeting, forecasting and audit preparation","Respond to internal and external finance inquiries","Maintain accurate, well-organized financial records"],
    reqs:["Diploma or degree in accounting, finance or a related field","1-3 years of relevant bookkeeping/accounting experience","Proficiency with accounting software (QuickBooks, Sage, or similar) and Excel","High attention to detail and accuracy under deadlines","Strong understanding of basic accounting principles","Discretion handling confidential financial information"]},
  tech:{desc:"We're hiring a technically skilled team member to help design, build and support our software and systems. You'll work with a collaborative team shipping real features and solving real problems.",
    duties:["Design, develop, test and maintain software/systems per requirements","Collaborate with cross-functional teams on technical solutions","Troubleshoot and resolve technical issues in a timely manner","Write clear documentation and participate in code/design reviews","Stay current with relevant tools, languages and best practices","Support production systems and respond to incidents as needed"],
    reqs:["Degree/diploma in computer science or equivalent practical experience","Proficiency in relevant languages/tools for the role","Strong problem-solving and debugging skills","Experience with version control (Git) and collaborative workflows","Clear written and verbal communication skills","Ability to work independently and manage competing priorities"]},
  agri:{desc:"We're hiring for our agriculture/fishing operation to support seasonal or year-round production. You'll work outdoors as part of a hands-on team that keeps the operation running.",
    duties:["Perform planting, harvesting, processing or maintenance tasks as assigned","Operate or assist with farm/fishing equipment and machinery safely","Monitor crop, livestock or catch conditions and report issues","Follow food-safety, biosecurity and environmental regulations","Maintain equipment, buildings and grounds","Work efficiently as part of a seasonal or year-round crew"],
    reqs:["Previous agriculture, fishing or outdoor labour experience an asset","Comfortable working outdoors in all weather conditions","Ability to lift up to 50 lbs and perform physical, repetitive tasks","Valid driver's licence an asset for equipment operation","Reliable, punctual and able to work early or long hours seasonally","Ability to work well as part of a team"]},
  security:{desc:"We're hiring for our security/cleaning team to help keep our site safe, secure and presentable. You'll play a visible, trusted role protecting people and property or maintaining a clean, professional environment.",
    duties:["Patrol and monitor assigned premises, staff and visitors","Respond to incidents, alarms and access-control issues per protocol","Complete accurate incident reports and shift logs","Perform cleaning, sanitizing and maintenance tasks per checklist","Follow all health, safety and site-specific procedures","Report hazards, damage or maintenance needs promptly"],
    reqs:["Valid provincial security licence if applicable, or willingness to obtain","Previous security, janitorial or cleaning experience an asset","Clean criminal record check","Reliable, observant and able to work independently","Comfortable standing or walking for extended periods, various shifts","Strong communication and report-writing skills"]},
  default:{desc:"We're looking for a motivated professional to join our growing team. In this role you'll contribute directly to team goals while developing your skills in a supportive, learning-focused environment.",
    duties:["Deliver on assigned responsibilities to a high standard","Collaborate with team members across functions","Communicate progress and blockers proactively","Contribute ideas for process improvements","Participate in team meetings and planning sessions","Maintain accurate records and documentation"],
    reqs:["Relevant post-secondary education or equivalent experience","Strong written and verbal communication skills","Ability to work independently and as part of a team","Detail-oriented with strong organizational skills","Proficient with common workplace software","Ability to legally work in Canada"]},
};
// Title keywords, one list per category matching CATS' ids exactly (constants.js). Checked BEFORE
// the category dropdown, which defaults to "Skilled Trades" and is easy to leave untouched when
// posting - previously that meant ANY title with no trades/health/transport keyword silently got
// trades boilerplate just because the dropdown still said Trades (e.g. "Sauna Cleaner" got Red
// Seal journeyperson copy). The title is what the employer actually typed, a far stronger signal
// of real intent than a form field they may never have touched.
const _AI_JD_KEYWORDS={
  trades:["trade","electrician","electrical","plumb","carpenter","welder","hvac","construction","millwright","pipefit","hoist"],
  health:["health","nurse","psw","care aide","personal support","medical","clinical","therapist","dental","pharmacy","paramedic"],
  transport:["driver","truck","transport","logistics","courier","delivery","dispatch"],
  retail:["retail","cashier","sales associate","store clerk","merchandis"],
  hosp:["cook","chef","kitchen","server","waiter","waitress","barista","hotel","restaurant","hospitality","housekeep","dishwasher","bartender"],
  factory:["warehouse","factory","manufactur","assembly","production line","picker","packer","machine operator","forklift"],
  admin:["admin","receptionist","office clerk","coordinator","assistant","data entry"],
  edu:["teacher","instructor","tutor","daycare","childcare","educator","early childhood"],
  finance:["accountant","bookkeep","payroll clerk","auditor","tax preparer"],
  tech:["developer","software","programmer","it support","data analyst","devops","qa engineer","full stack","frontend","backend"],
  agri:["farm","agricultur","fishing","harvest","greenhouse"],
  security:["security guard","security officer","guard","janitor","custodian","clean"],
};
export function aiSuggestJD(title,cat){
  const t=(title||"").toLowerCase();
  for(const [key,words] of Object.entries(_AI_JD_KEYWORDS)){
    if(words.some(w=>t.includes(w)))return _AI_JD_TEMPLATES[key];
  }
  if(cat&&_AI_JD_TEMPLATES[cat])return _AI_JD_TEMPLATES[cat];
  return _AI_JD_TEMPLATES.default;
}
