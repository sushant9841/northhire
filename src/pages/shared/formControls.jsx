import { useState, useEffect, useRef } from "react";
import { C, SH } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn, Tag, Input, Card } from "../../design/primitives.jsx";
import { uid } from "../../helpers/utils.js";
import { useTranslation } from "../../i18n/i18n.jsx";
import { api } from "../../helpers/api.js";
import { CATM, PCODE } from "../../store/seed/constants.js";
import { CANADIAN_CITIES } from "../../store/seed/canadianCities.js";
import { use } from "../../store/context.js";

/* Canadian cities for LocationInput autocomplete, generated from the full gazette
   (src/store/seed/canadianCities.js, 500+ real municipalities) rather than a short hardcoded
   sample - "City, PROV_CODE" strings to match what the rest of the app expects to parse/store. */
const CA_LOCATIONS = CANADIAN_CITIES.map(c => `${c.name}, ${PCODE[c.province] || c.province}`);

/* An employer's own previously-used posting locations, fetched once per session and merged
   ahead of the gazette in the autocomplete - the "you've hired in Calgary before" shortcut.
   Silently no-ops for anyone who isn't a signed-in employer (403/401 from the API). */
let _employerLocationsCache = null;
function useEmployerLocations() {
  const A = use();
  const [locs, setLocs] = useState(_employerLocationsCache || []);
  useEffect(() => {
    if (A?.user?.role !== "employer" || _employerLocationsCache) return;
    api.get("/employers/me/locations").then(r => {
      const list = (r.locations || []).map(l => `${l.city}, ${PCODE[l.province] || l.province}`);
      _employerLocationsCache = list;
      setLocs(list);
    }).catch(() => {});
  }, [A?.user?.role]);
  return locs;
}

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

export function LocationInput({value,onChange,placeholder,required,onLocate}){
  const { t } = useTranslation();
  const [q,setQ]=useState(value||"");
  const [open,setOpen]=useState(false);
  const [idx,setIdx]=useState(-1);
  const listRef=useRef(null);
  const placeholderText=placeholder||t("formControls.locationPlaceholder");
  const employerLocs=useEmployerLocations();
  useEffect(()=>{setQ(value||"");},[value]);
  const matches=q.length>=2
    ? [...new Set([
        ...employerLocs.filter(l=>l.toLowerCase().includes(q.toLowerCase())),
        ...CA_LOCATIONS.filter(l=>l.toLowerCase().includes(q.toLowerCase())),
      ])].slice(0,8)
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
    <Input icon="pin" value={q} required={required} placeholder={placeholderText}
      suffix={<button type="button" onClick={useGeoloc} title={t("formControls.useMyLocation")}
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
    {q.length>=2&&open&&matches.length===0&&<div className="absolute left-0 right-0 bg-white border border-line rounded-xl shadow-md z-200 py-3 px-3.5 text-sm text-text-3" style={{top:"calc(100% + 4px)"}}>{t("formControls.noCityFound")}</div>}
  </div>;
}

/* Anonymised pay benchmark card - queries GET /jobs/benchmark for the platform's own live
   listings matching this category + province + experience shape. Used on the post-job wizard
   (employer, while setting pay) and the public job detail page (signed-in seekers). Renders
   nothing until cat+prov+exp are all picked, and nothing (rather than a scary "no data" box)
   when the sample is below the 5-listing suppression floor - just a plain "not enough yet" line. */
export function SalaryBenchmarkCard({ cat, provCode, exp, unit = "hr", provLabel }) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!cat || !provCode || !exp) { setData(null); return; }
    let cancelled = false;
    const qs = new URLSearchParams({ cat, prov: provCode, exp, unit }).toString();
    api.get(`/jobs/benchmark?${qs}`).then(d => { if (!cancelled) setData(d); }).catch(() => { if (!cancelled) setData(null); });
    return () => { cancelled = true; };
  }, [cat, provCode, exp, unit]);
  if (!cat || !provCode || !exp) return null;
  if (!data) return null;
  const catLabel = CATM[cat]?.label || cat;
  return <Card pad={18} style={{ borderRadius: 16, background: C.tint, border: `1px solid ${C.line2}` }}>
    <div className="flex items-center gap-2 mb-1">
      <I n="trend" s={16} c={C.brand} />
      <div className="text-sm font-semibold text-text">
        {t("employer.post.benchmarkTitle", { cat: catLabel, prov: provLabel || provCode })}
      </div>
    </div>
    {data.suppressed
      ? <div className="text-xs text-text-3">{t("employer.post.benchmarkNotEnough")}</div>
      : <div className="text-sm text-text-2">
          {t("employer.post.benchmarkBody", { p25: data.p25, p75: data.p75, median: data.median, count: data.count })}
        </div>}
  </Card>;
}

/* InlineList — chips with inline add + delete. Used for skills, benefits, tags */
export function InlineList({value=[],onChange,placeholder,icon,max=20}){
  const { t } = useTranslation();
  const placeholderText=placeholder||t("formControls.inlineListPlaceholder");
  const [v,setV]=useState("");
  const add=()=>{const item=v.trim(); if(!item||value.includes(item)||value.length>=max)return;
    onChange([...value,item]); setV("");};
  const del=(x)=>onChange(value.filter(y=>y!==x));
  return <div>
    <div className={`flex flex-wrap gap-1.5 ${value.length?"mb-2.5":""}`}>
      {value.map(x=><span key={x} className="inline-flex items-center gap-1.5 bg-tint text-brand border border-line-2 py-1.5 pr-1.5 pl-3 rounded-full text-xs font-medium transition-transform duration-200 hover:scale-105">{x}
        <button type="button" onClick={()=>del(x)} aria-label={t("formControls.inlineListRemove",{item:x})}
          className="bg-black/8 border-0 cursor-pointer w-5 h-5 rounded-full flex items-center justify-center text-text-2"><I n="x" s={11} w={2.4}/></button>
      </span>)}
    </div>
    <div className="flex gap-2">
      <div className="flex-1"><Input icon={icon} value={v} onChange={e=>setV(e.target.value)}
        onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault(); add();}}}
        placeholder={value.length>=max?t("formControls.inlineListMax",{max}):placeholderText} disabled={value.length>=max}/></div>
      <Btn kind="outline" onClick={add} disabled={!v.trim()||value.length>=max} icon="plus">{t("formControls.inlineListAdd")}</Btn>
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
  const { t } = useTranslation();
  const getTLabelForType=(type)=>{
    const mapping={yesno:"formControls.qtYesNo",radio:"formControls.qtSingleChoice",checkbox:"formControls.qtMultipleChoice",short:"formControls.qtShortAnswer",long:"formControls.qtLongAnswer"};
    return t(mapping[type]||"");
  };
  const add=(type)=>{const q={id:uid("q"),type,prompt:"",required:false,options:type==="radio"||type==="checkbox"?["Option 1","Option 2"]:[]};
    onChange([...value,q]);};
  const upd=(id,patch)=>onChange(value.map(q=>q.id===id?{...q,...patch}:q));
  const del=(id)=>onChange(value.filter(q=>q.id!==id));
  const addOpt=(qid)=>upd(qid,{options:[...(value.find(q=>q.id===qid)?.options||[]),`Option ${(value.find(q=>q.id===qid)?.options.length||0)+1}`]});
  const updOpt=(qid,i,v)=>{const q=value.find(x=>x.id===qid); upd(qid,{options:q.options.map((o,j)=>j===i?v:o)});};
  const delOpt=(qid,i)=>{const q=value.find(x=>x.id===qid); upd(qid,{options:q.options.filter((_,j)=>j!==i)});};

  /* Common presets */
  const presets=[
    {t:t("formControls.qDriver"),type:"yesno"},
    {t:t("formControls.qRelocate"),type:"yesno"},
    {t:t("formControls.qWorkPermit"),type:"yesno"},
    {t:t("formControls.qVisa"),type:"yesno"},
    {t:t("formControls.qShifts"),type:"checkbox",options:t("formControls.qShiftsOpts").split(",")},
    {t:t("formControls.qStart"),type:"radio",options:t("formControls.qStartOpts").split(",")},
  ];
  const addPreset=(p)=>onChange([...value,{id:uid("q"),...p,prompt:p.t,required:true,options:p.options||[]}]);

  return <div>
    {/* Compliance Register hire5: Human Rights Codes (every province) and the Canadian Human
        Rights Act prohibit hiring criteria tied to a protected ground — age, sex, gender identity,
        family/marital status, race, ethnic origin, religion, disability, sexual orientation,
        pregnancy, or citizenship (beyond confirming legal work eligibility). Custom questions
        must ask about job-related requirements, not the applicant's personal characteristics. */}
    <div className="text-xs text-text-2 mb-3 leading-relaxed p-2.5 bg-tint border border-line-soft rounded-md">
      {t("formControls.qHumanRightsHint")||"Ask about job-related requirements, not the applicant's personal characteristics. Human Rights Codes (all provinces) and the Canadian Human Rights Act prohibit questions about age, sex, family or marital status, race, ethnic origin, religion, disability, sexual orientation, gender identity, pregnancy, or citizenship beyond legal work eligibility."}
    </div>
    {value.length>0&&<div className="flex flex-col gap-3 mb-4">
      {value.map((q,i)=><div key={q.id} className="border border-line rounded-xl p-3.5 bg-white">
        <div className="flex gap-2.5 items-center mb-2.5">
          <div className="w-6 h-6 rounded-full bg-wash text-brand flex items-center justify-center text-xs font-bold shrink-0">{i+1}</div>
          <Tag tone="neutral" sm>{getTLabelForType(q.type)}</Tag>
          <div className="ml-auto flex gap-1.5 items-center">
            <label className="flex gap-1.5 items-center text-xs text-text-2 cursor-pointer">
              <input type="checkbox" checked={q.required} onChange={e=>upd(q.id,{required:e.target.checked})}/>{t("formControls.qRequired")}</label>
            <Btn kind="ghost" size="xs" icon="trash" aria-label={`Delete question ${i+1}`} onClick={()=>del(q.id)}/>
          </div>
        </div>
        <Input value={q.prompt} onChange={e=>upd(q.id,{prompt:e.target.value})} placeholder={t("formControls.qPlaceholder")}/>
        {(q.type==="radio"||q.type==="checkbox")&&<div className="mt-2.5 pl-1.5 flex flex-col gap-1.5">
          {q.options.map((o,j)=><div key={j} className="flex gap-2 items-center">
            <span className="text-text-3 text-xs">{q.type==="radio"?"○":"☐"}</span>
            <Input value={o} onChange={e=>updOpt(q.id,j,e.target.value)} placeholder={t("formControls.qOptionPlaceholder",{num:j+1})}/>
            {q.options.length>2&&<Btn kind="ghost" size="xs" icon="x" aria-label={`Remove option ${j+1}`} onClick={()=>delOpt(q.id,j)}/>}
          </div>)}
          <Btn kind="ghost" size="xs" icon="plus" onClick={()=>addOpt(q.id)}>{t("formControls.qAddOption")}</Btn>
        </div>}
      </div>)}
    </div>}

    <div className="flex flex-wrap gap-1.5 mb-3">
      {QUESTION_TYPES.map(qt=><Btn key={qt.k} kind="outline" size="sm" icon="plus" onClick={()=>add(qt.k)}>{getTLabelForType(qt.k)}</Btn>)}
    </div>

    <details className="mt-3.5">
      <summary className="cursor-pointer text-sm text-text-2 font-semibold">{t("formControls.qCommonTitle")}</summary>
      <div className="mt-2.5 flex flex-col gap-1.5">
        {presets.map(p=><button key={p.t} type="button" onClick={()=>addPreset(p)}
          className="text-left bg-bg border border-line rounded-lg py-2.5 px-3 cursor-pointer text-sm text-text transition duration-150 hover:bg-tint hover:border-line-2">
          + {p.t}</button>)}
      </div>
    </details>
  </div>;
}

/* AI-autofill suggestion helper — deterministic templates by category with per-input rotation.
   Output depends on title + sector + employment type + work setting + experience + education +
   a rotation seed the caller increments on regenerate. Same inputs → same output; a different
   experience level, education level, employment type, work setting or seed all produce
   materially different copy. Returns { desc (HTML with Overview/Duties/Requirements headings +
   bullets), duties[], reqs[], mustHave[], niceToHave[], questions[], benefits[] } so the wizard
   can present each item for accept/edit/reject. Benefits and common questions pools are
   overridable at runtime via optional adminBenefits{sector→[]} + adminQuestions{sector→[]} args,
   read from platform_settings so the admin UI can extend them per sector. */
const _AI_JD_TEMPLATES={
  trades:{desc:"We're looking for a skilled tradesperson to join our team on active project sites across the region. You'll work alongside experienced Red Seal journeypersons on commercial, industrial and infrastructure builds. Safety is our first priority — every crew member goes home the way they came in.",
    duties:["Perform installation, maintenance and repair work per code and site specifications","Interpret blueprints, drawings and technical documentation accurately","Coordinate with site supervisors and other trades to keep schedules on track","Maintain a clean, safe work site and follow all OHS regulations","Complete daily reports and time sheets","Participate in safety toolbox talks and mentor apprentices"],
    reqs:["Red Seal or provincial trade certification","Valid safety tickets (WHMIS, Working at Heights, First Aid)","Minimum 3 years site experience on commercial or industrial projects","Own hand tools and reliable transportation to site","Ability to lift 50 lbs and work in all weather conditions","Clear communication in English (French an asset in Quebec)"]},
  health:{desc:"We're hiring a compassionate healthcare professional to join our care team. You'll work with a supportive interdisciplinary group serving patients across acute, complex and community settings. This is a role for someone who prioritizes patient dignity and evidence-based practice.",
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
/* Per-sector skill / question / benefit pools. The AI helper rotates through each pool using
   an input-derived seed so the same inputs always produce the same picks but different inputs
   (or a different regenerate seed) produce materially different picks. Admin can extend the
   `benefits` and `questions` pools per sector via platform_settings.job_ai_benefits_by_sector
   and job_ai_questions_by_sector — these arrays are merged on top of the base pool at runtime. */
const _AI_JD_POOLS={
  trades:{must:["Red Seal certification","Safety tickets (WHMIS)","Blueprint reading","Own hand tools","Reliable transportation","Physical stamina"],
    nice:["Working at Heights ticket","Confined space training","Second language","Class 5 or higher licence","Fall arrest certification","Trade math"],
    questions:["Do you hold a valid Red Seal or provincial trade certification?","Which safety tickets do you currently hold?","Are you comfortable working at heights or in confined spaces?","Do you have your own hand tools?","How many years of on-site experience do you have?"],
    benefits:["Extended health benefits","Dental coverage","Tool allowance","Boot allowance","RRSP matching","Overtime pay","Paid safety training","Life insurance"]},
  health:{must:["Provincial college registration","BLS certification","Vulnerable Sector Check","Clear communication","Charting/EMR literacy","Patient-first mindset"],
    nice:["ACLS certification","Bilingual (English/French)","Palliative or geriatric experience","IV therapy","Wound care","Mental Health First Aid"],
    questions:["Are you currently registered with the relevant provincial regulatory college?","Are you available for rotating shifts including nights and weekends?","Do you have a current Vulnerable Sector Check?","Are you comfortable using electronic medical records?","How many years of direct patient care experience do you have?"],
    benefits:["Extended health & dental","Pension plan","Paid vacation","Sick days","Continuing education budget","Uniform allowance","Employee assistance program","Shift premiums"]},
  transport:{must:["Class 1 (AZ) commercial licence","Clean 5-year abstract","CVOR compliance","Ability to cross US border","Clean criminal record","Hours-of-service compliance"],
    nice:["Air-brake endorsement","TDG certification","Cross-border experience","Bilingual","Reefer experience","Manual transmission"],
    questions:["Do you hold a valid Class 1 (AZ) commercial licence?","Can you provide a clean 5-year driver's abstract?","Are you eligible to cross the Canada-US border?","How many years of verifiable OTR experience do you have?","Are you comfortable with rotating dispatch and long-haul routes?"],
    benefits:["Per-mile bonuses","Layover pay","Health & dental","Home time guaranteed","Fuel bonuses","Modern equipment","RRSP matching","Paid orientation"]},
  retail:{must:["Customer service","POS operation","Cash handling","Team collaboration","Attention to detail","Standing/lifting stamina"],
    nice:["Second language","Visual merchandising","Inventory management","Loss prevention awareness","Upselling experience","Social media literacy"],
    questions:["Do you have previous retail or customer service experience?","Are you available for evenings and weekends?","Are you comfortable lifting up to 25 lbs?","How do you handle a difficult customer?","Are you legally eligible to work in Canada?"],
    benefits:["Employee discount","Flexible scheduling","Health benefits after probation","Sales commission or bonuses","Referral bonuses","Growth into supervisor roles","Paid training","Uniform provided"]},
  hosp:{must:["Food Handler certification","Guest service","Speed under pressure","Cleanliness","Teamwork","Physical stamina"],
    nice:["Smart Serve","Second language","Allergen training","Barista skills","POS experience","Wine/beer knowledge"],
    questions:["Do you have a current Food Handler certification (or are willing to obtain)?","Are you comfortable working evenings, weekends and holidays?","Can you stand and walk for a full shift?","Do you have previous experience in hospitality or food service?","Are you legally eligible to work in Canada?"],
    benefits:["Free shift meals","Tip pooling","Flexible scheduling","Health benefits after probation","Uniform provided","Career pathway","Employee discount","Paid training"]},
  factory:{must:["Warehouse or production experience","PPE compliance","Physical stamina","Attention to detail","Team collaboration","Steel-toe boots"],
    nice:["Forklift/order-picker ticket","Lift-truck certification","Basic mechanical aptitude","Second language","Quality control experience","Continuous improvement (5S/Lean)"],
    questions:["Do you have previous warehouse or production experience?","Do you hold a valid forklift/order-picker certification?","Are you able to lift up to 50 lbs repetitively?","Are you comfortable with rotating shifts including weekends?","Do you have steel-toe safety boots?"],
    benefits:["Health & dental","RRSP matching","Shift premiums","Attendance bonuses","Safety boot allowance","Overtime pay","Employee assistance program","Paid training"]},
  admin:{must:["Microsoft Office / Google Workspace","Written communication","Verbal communication","Organizational skills","Attention to detail","Discretion with confidential info"],
    nice:["Second language","CRM/database experience","Bookkeeping basics","Event coordination","Design tools (Canva)","Advanced Excel"],
    questions:["How many years of administrative or office-support experience do you have?","Which office productivity tools are you most comfortable with?","How do you prioritize competing deadlines?","Are you comfortable handling confidential information?","Are you legally eligible to work in Canada?"],
    benefits:["Extended health & dental","Paid vacation","Flexible hours","Professional development budget","RRSP matching","Employee assistance program","Hybrid work options","Wellness perks"]},
  edu:{must:["ECE diploma or teaching certification","First Aid / CPR","Vulnerable Sector Check","Patience","Communication with parents","Age-appropriate lesson design"],
    nice:["Second language","Special-needs experience","Music/art integration","Outdoor education","Bilingual French","Behaviour management training"],
    questions:["Do you hold an ECE diploma or equivalent teaching certification?","Do you have a current Vulnerable Sector Check?","Do you have First Aid and CPR certification?","How many years of experience working with children or students do you have?","Are you comfortable communicating regularly with parents?"],
    benefits:["Extended health & dental","Paid PA days","Pension plan","Continuing education","Employee assistance program","Discounted childcare","Paid sick days","Uniform allowance"]},
  finance:{must:["Accounting principles","Excel proficiency","Attention to detail","Bookkeeping software (QuickBooks / Sage)","Discretion","Deadline discipline"],
    nice:["CPA in progress","Payroll experience","Second language","Audit exposure","Financial modelling","ERP experience (NetSuite / SAP)"],
    questions:["What accounting or bookkeeping software are you most experienced with?","How many years of relevant accounting experience do you have?","Are you comfortable working under month-end/year-end deadlines?","Do you have any professional accounting designations or progress toward one?","Are you legally eligible to work in Canada?"],
    benefits:["Extended health & dental","RRSP matching","CPA support / dues covered","Bonus program","Hybrid or remote options","Paid vacation","Wellness stipend","Continuing education"]},
  tech:{must:["Git version control","Relevant language/stack proficiency","Debugging skills","Written communication","Ability to work independently","Collaboration tools (Slack/Jira)"],
    nice:["Cloud (AWS/GCP/Azure)","CI/CD pipelines","Testing frameworks","Open-source contributions","Second language","Docker/Kubernetes"],
    questions:["Which languages and frameworks are you most experienced with?","Can you describe a recent project you shipped end-to-end?","How do you approach testing your own code?","Are you comfortable participating in on-call rotations?","Are you legally eligible to work in Canada?"],
    benefits:["Extended health & dental","Stock options / equity","Remote-friendly / hybrid","Learning budget","Home office stipend","RRSP matching","Unlimited or flexible PTO","Wellness stipend"]},
  agri:{must:["Physical stamina","Comfort outdoors","Reliability","Teamwork","Attention to detail","Ability to work early / long hours seasonally"],
    nice:["Farm equipment operation","Class 5 licence","Second language","Food-safety training","Pesticide applicator licence","Livestock handling"],
    questions:["Do you have previous agriculture, fishing or outdoor labour experience?","Are you comfortable working outdoors in all weather conditions?","Are you able to lift up to 50 lbs repetitively?","Do you hold a valid driver's licence?","Are you legally eligible to work in Canada?"],
    benefits:["Housing or housing subsidy","Meals during peak season","Overtime pay","End-of-season bonuses","Health benefits (year-round roles)","Transportation to worksite","Paid safety training","PPE provided"]},
  security:{must:["Provincial security licence (or willing to obtain)","Clean criminal record","Reliability","Observation skills","Report writing","Standing/walking stamina"],
    nice:["First Aid / CPR","Use of Force certification","Second language","Fire-warden training","Customer service","CCTV monitoring"],
    questions:["Do you hold a valid provincial security licence?","Can you provide a clean criminal record check?","Are you comfortable working overnight or rotating shifts?","Do you have previous security or cleaning experience?","How would you handle an unauthorized person on site?"],
    benefits:["Health & dental after probation","Shift premiums","Uniform provided","Paid training","Referral bonuses","Career advancement paths","Life insurance","Employee assistance program"]},
  default:{must:["Reliability","Written communication","Verbal communication","Team collaboration","Attention to detail","Ability to legally work in Canada"],
    nice:["Second language","Bilingual French","Adaptability","Previous industry exposure","Time management","Basic office software"],
    questions:["What relevant experience do you bring to this role?","Why are you interested in this position?","Describe a challenge you've overcome at work.","What are you looking for in your next role?","Are you legally eligible to work in Canada?"],
    benefits:["Health benefits","Paid vacation","Flexible scheduling","Professional development","Employee assistance program","RRSP matching","Referral bonus","Employee discount"]},
};

/* Hash inputs → integer seed used to rotate template pools. Small, order-preserving; not for
   security, just to make same-inputs → same-outputs while different-inputs → different-outputs. */
const _hashInputs=(...parts)=>{
  const s=parts.filter(x=>x!=null&&x!=="").map(x=>String(x)).join("|");
  let h=2166136261>>>0;
  for(let i=0;i<s.length;i++){h=(h^s.charCodeAt(i))>>>0; h=Math.imul(h,16777619)>>>0;}
  return h;
};
const _rotate=(arr,by,take)=>{
  if(!arr||!arr.length)return [];
  const n=arr.length,off=((by%n)+n)%n;
  const out=[];
  for(let i=0;i<Math.min(take,n);i++)out.push(arr[(off+i)%n]);
  return out;
};

/* Experience/education-adjusted preface. Returns a short sentence tacked onto the Overview so
   generated copy reflects the seniority the employer picked. */
const _experiencePreface=(exp)=>{
  const e=(exp||"").toLowerCase();
  if(e.includes("no experience"))return " This is an entry-level role — no prior experience is required, and we'll train you on the specifics of the job.";
  if(e.includes("entry level"))return " We welcome entry-level candidates and recent graduates; a positive attitude counts for more than a long résumé here.";
  const m=e.match(/(\d+)\+/);
  if(m){const n=parseInt(m[1],10);
    if(n>=5)return ` This is a senior role — we're looking for ${n}+ years of proven experience and the judgement that comes with it.`;
    if(n>=3)return ` We're looking for ${n}+ years of hands-on experience and someone ready to work independently from day one.`;
    return ` We're looking for at least ${n} year${n===1?"":"s"} of relevant experience.`;
  }
  return "";
};
const _educationLine=(edu)=>{
  if(!edu||edu.toLowerCase().includes("no formal"))return null;
  return edu;
};
/* Employment type + work setting shift the framing of duties/reqs slightly. */
const _typeContext=(type,mode)=>{
  const bits=[];
  const t=(type||"").toLowerCase(); const m=(mode||"").toLowerCase();
  if(t==="contract")bits.push("This is a defined-scope contract role with clear deliverables and end date.");
  else if(t==="seasonal")bits.push("This is a seasonal role tied to our peak-demand months.");
  else if(t==="part time")bits.push("This is a part-time role — flexible hours, ideal alongside studies or another commitment.");
  else if(t==="casual")bits.push("This is a casual role called in as demand requires — no guaranteed hours.");
  else if(t==="apprenticeship")bits.push("This is a registered apprenticeship — you'll earn while you learn under a certified journeyperson.");
  if(m==="remote")bits.push("The role is fully remote across Canada — we've built async collaboration into how we work.");
  else if(m==="hybrid")bits.push("The role is hybrid — a mix of office/site days and remote work weekly.");
  return bits.join(" ");
};

/* Merge admin-editable overrides on top of base pool. */
const _mergePool=(base,extra)=>{
  if(!Array.isArray(extra)||!extra.length)return base;
  const set=new Set(base||[]);
  const merged=[...(base||[])];
  extra.forEach(x=>{if(typeof x==="string"&&x.trim()&&!set.has(x.trim())){merged.push(x.trim());set.add(x.trim());}});
  return merged;
};

const _resolveCategory=(title,cat)=>{
  const t=(title||"").toLowerCase();
  for(const [key,words] of Object.entries(_AI_JD_KEYWORDS)){
    if(words.some(w=>t.includes(w)))return key;
  }
  if(cat&&_AI_JD_TEMPLATES[cat])return cat;
  return "default";
};

/* Main entry point. Accepts either the old positional signature (title, cat) — kept for any
   external caller still on the two-arg form — or the new object signature with full context. */
export function aiSuggestJD(a,b){
  const opts=(a&&typeof a==="object"&&!Array.isArray(a))?a:{title:a,cat:b};
  const {title="",cat,type="Full Time",mode="On-site",exp="",edu="",seed=0,
    adminBenefits,adminQuestions}=opts;
  const key=_resolveCategory(title,cat);
  const tpl=_AI_JD_TEMPLATES[key]||_AI_JD_TEMPLATES.default;
  const pool=_AI_JD_POOLS[key]||_AI_JD_POOLS.default;
  const base=_hashInputs(title,key,type,mode,exp,edu);
  const rot=(base+(seed>>>0))>>>0;
  const duties=_rotate(tpl.duties,rot%tpl.duties.length,5);
  const reqs=_rotate(tpl.reqs,(rot>>>2)%tpl.reqs.length,5);
  const mustHave=_rotate(pool.must,(rot>>>3)%pool.must.length,4);
  const niceToHave=_rotate(pool.nice,(rot>>>5)%pool.nice.length,4);
  const eduLine=_educationLine(edu);
  if(eduLine&&!mustHave.includes(eduLine))mustHave.unshift(eduLine);
  const benefitsPool=_mergePool(pool.benefits,adminBenefits&&adminBenefits[key]);
  const benefits=_rotate(benefitsPool,(rot>>>7)%Math.max(1,benefitsPool.length),4);
  const questionsPool=_mergePool(pool.questions,adminQuestions&&adminQuestions[key]);
  const questions=_rotate(questionsPool,(rot>>>9)%Math.max(1,questionsPool.length),4)
    .map(prompt=>({prompt,type:/legally eligible|certification|licence|check|vulnerable/i.test(prompt)?"yesno":"short",required:false}));
  const typeCtx=_typeContext(type,mode);
  const preface=_experiencePreface(exp);
  const overview=tpl.desc+preface+(typeCtx?" "+typeCtx:"");
  const desc=`<h3>Overview</h3><p>${overview}</p>`
    +`<h3>Duties</h3><ul>${duties.map(d=>`<li>${d}</li>`).join("")}</ul>`
    +`<h3>Requirements</h3><ul>${reqs.map(r=>`<li>${r}</li>`).join("")}</ul>`;
  return {desc,duties,reqs,mustHave,niceToHave,questions,benefits,overview,category:key};
}
