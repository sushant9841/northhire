import { useState, useEffect } from "react";
import { use } from "../store/context.js";
import { useMedia } from "../helpers/hooks.js";
import { C, SH } from "../design/tokens.js";
import { I } from "../design/icons.jsx";
import { Btn, SmartLogo, SmartPortrait } from "../design/primitives.jsx";
import { ROUTES } from "../routes.js";

export const EMP_MODULES=[
  {k:"empHome",label:"Dashboard",icon:"activity",section:"main"},
  {k:"empJobs",label:"My jobs",icon:"briefcase",section:"main"},
  {k:"empPost",label:"Post a job",icon:"plus",section:"main"},
  {k:"empPipeline",label:"Candidates",icon:"users",section:"main"},
  {k:"empAnalytics",label:"Analytics",icon:"trend",section:"main"},
  {k:"messages",label:"Messages",icon:"mail",section:"main"},
  {k:"interviews",label:"Interviews",icon:"calendar",section:"main",feature:"interviews"},
  /* Staffing services — visible to all, but non-clients see the sales page */
  {k:"empStaffing",label:"Staffing services",icon:"target",section:"staffing"},
  {k:"empStaffingRequests",label:"Job requests",icon:"plus",section:"staffing",clientOnly:true},
  {k:"empStaffingAssignments",label:"Active assignments",icon:"activity",section:"staffing",clientOnly:true},
  {k:"empStaffingTimesheets",label:"Approve timesheets",icon:"clock",section:"staffing",clientOnly:true},
  {k:"empStaffingInvoices",label:"Staffing invoices",icon:"file",section:"staffing",clientOnly:true},
  /* HR Suite — Enterprise feature, embedded as tabs */
  {k:"hrDashboard",label:"HR overview",icon:"activity",section:"hrsuite",feature:"hrSuite"},
  {k:"hrPeople",label:"People",icon:"users",section:"hrsuite",feature:"hrSuite"},
  {k:"hrAttendance",label:"Attendance",icon:"clock",section:"hrsuite",feature:"hrSuite"},
  {k:"hrLeave",label:"Leave",icon:"calendar",section:"hrsuite",feature:"hrSuite"},
  {k:"hrExpenses",label:"Expenses",icon:"wallet",section:"hrsuite",feature:"hrSuite"},
  {k:"hrPayroll",label:"Payroll",icon:"wallet",section:"hrsuite",feature:"hrSuite"},
  {k:"hrReports",label:"Reports",icon:"trend",section:"hrsuite",feature:"hrSuite"},
  /* Content — Growth feature */
  {k:"empArticles",label:"Articles",icon:"book",section:"content",feature:"articles"},
  {k:"empTrainings",label:"Trainings",icon:"cap",section:"content",feature:"trainings"},
  {k:"empCompany",label:"Company profile",icon:"building",section:"account"},
  {k:"empBilling",label:"Billing & plan",icon:"wallet",section:"account"},
  {k:"settings",label:"Settings",icon:"gear",section:"account"},
];

export const ADM_MODULES=[
  {k:"admHome",label:"Overview",icon:"activity",section:"main"},
  {k:"admStats",label:"Statistics",icon:"trend",section:"main"},
  {k:"admLog",label:"Activity log",icon:"file",section:"main"},
  {k:"admUsers",label:"Users",icon:"users",section:"manage"},
  {k:"admEmployers",label:"Employers",icon:"building",section:"manage"},
  {k:"admJobs",label:"Jobs",icon:"briefcase",section:"manage"},
  {k:"admBlogs",label:"Articles",icon:"book",section:"content"},
  {k:"admTrainings",label:"Trainings",icon:"cap",section:"content"},
  {k:"admSettings",label:"Platform settings",icon:"gear",section:"account"},
];

export const SECTION_LABELS={main:"Hiring",staffing:"Staffing services",hrsuite:"HR Suite",content:"Content",manage:"Manage",account:"Account"};

/* ─── Feature-specific upgrade prompt ─── */
export function UpgradePromptModal({payload,onClose}){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const {feature,requiredPlan,label,icon}=payload;
  const currentPlan=A.planName();
  /* Rich benefit copy per feature */
  const featureBenefits={
    articles:{title:"Publish articles from your company",why:"Build employer brand, share your culture, and get discovered by seekers browsing career content. Companies that publish articles get 3× more profile views on average.",bullets:["Unlimited article drafts and publishes","Rich text editor with images","Auto-share to your company profile","Full SEO metadata"]},
    trainings:{title:"Host training courses on your profile",why:"Offer paid or free trainings to build a candidate pipeline. Seekers who complete your training are 4× more likely to apply for your open roles.",bullets:["Publish unlimited training courses","Charge for premium content","Track enrolments and completions","Certificate issuance"]},
    interviews:{title:"Schedule and run interviews in-app",why:"Stop bouncing between Calendly, Zoom, and your ATS. Everything from invite to feedback lives in one place, tied to the candidate record.",bullets:["Built-in scheduling with candidate self-serve","Video or on-site modes","Panel interviews with multiple scorers","Structured feedback forms"]},
    talentPool:{title:"Search 50k+ pre-verified Canadian workers",why:"Don't wait for applicants — reach out to matching candidates directly. Reverse-recruiting typically shortens time-to-hire by 12 days.",bullets:["Full-text search on skills, tickets, location","Filter by availability and salary expectation","Direct messaging to candidates","Bulk invite-to-apply"]},
    csvImport:{title:"Import jobs and candidates in bulk",why:"For teams migrating from another ATS, or posting 10+ roles at once. Upload a spreadsheet, we validate and post.",bullets:["Job posting bulk upload","Candidate CV bulk import","Custom field mapping","Duplicate detection"]},
    customStages:{title:"Custom pipeline stages",why:"Every team hires differently. Add your own stages like Take-home, Panel round, Reference check — reorder them per job.",bullets:["Unlimited custom stages per job","Reorder by drag and drop","Rename or hide default stages","Save stage templates"]},
    bulkActions:{title:"Bulk actions on candidates",why:"Move, reject, or message dozens of applicants at once. Essential for high-volume roles that get 100+ applicants.",bullets:["Multi-select in pipeline","Bulk move to any stage","Bulk reject with template email","Bulk export to CSV"]},
    branded:{title:"Branded career pages",why:"Your logo, colors, and copy on your public NorthHire profile. Custom URL like northhire.ca/careers/your-company.",bullets:["Custom branding on job listings","Company colors and typography","Custom URL slug","Remove NorthHire watermark"]},
    messages:{title:"Unlimited messaging",why:"Free plan is limited to 20 messages per month. Growth removes the cap so you never lose a great candidate to a slow reply.",bullets:["Unlimited candidate messaging","Templates and canned responses","Read receipts","Team-shared inbox"]},
    hrSuite:{title:"NorthHire HR Suite — 16 modules",why:"After you hire, HR Suite runs everything. Attendance, leave, payroll, reviews, tasks, chat, calendar, invoices. Bundled with Enterprise, or standalone at $8/employee/month.",bullets:["Full org chart with reporting lines","CRA-compliant Canadian payroll","Time off, attendance, punch-in","Performance reviews and 1-on-1s","Team chat and shared calendar","Reports on headcount, cost, turnover"]},
    api:{title:"REST API + Zapier integration",why:"Push jobs from your careers site to NorthHire, pull applicants into your data warehouse, sync with Slack — anything you can script.",bullets:["Full REST API with OpenAPI docs","Webhooks for every event","Native Zapier integration","Rate limits: 10k requests/hr"]},
    sso:{title:"Single sign-on and SAML",why:"Enterprise identity providers only. Okta, Azure AD, Google Workspace, one-click provisioning through SCIM.",bullets:["SAML 2.0 with Okta / Azure AD","SCIM for auto-provisioning","Enforce SSO across team","Session policy control"]},
    manager:{title:"Dedicated success manager",why:"A named Canadian account manager, quarterly business reviews, and a private Slack channel for urgent issues.",bullets:["Named account manager","Quarterly review calls","Private Slack support","Priority response SLA"]},
  };
  const b=featureBenefits[feature]||{title:label,why:"This feature isn't in your current plan.",bullets:[]};
  /* Which plans include this */
  const plans=Object.entries(A.PLANS).filter(([_,p])=>{const v=p[feature]; return v===true||typeof v==="number"&&v>0||v==="full"||v===Infinity;});
  const cheapest=plans.reduce((min,[n,p])=>!min||p.price<min[1].price?[n,p]:min,null);
  return <div onClick={onClose} className={`fixed inset-0 bg-[rgba(15,23,42,0.68)] z-9998 flex items-center justify-center backdrop-blur-sm ${mob?"p-4":"p-6"}`}>
    <div onClick={e=>e.stopPropagation()} className={`bg-white max-w-xl w-full max-h-[90vh] overflow-auto shadow-[0_24px_60px_rgba(0,0,0,0.35)] ${mob?"rounded-2xl":"rounded-3xl"}`}>
      {/* Header */}
      <div className={`border-b border-line bg-[linear-gradient(180deg,var(--color-tint)_0%,#fff_100%)] ${mob?"pt-6 px-6 pb-5":"pt-7 px-8 pb-6"}`}>
        <div className="flex gap-3.5 items-start">
          <div className="w-12 h-12 rounded-xl bg-white text-brand border border-line-2 flex items-center justify-center shrink-0">
            <I n={icon||"lock"} s={22}/>
          </div>
          <div className="flex-1 min-w-0">
            <div className="inline-block py-1 px-2.5 bg-[#FEF3E2] text-[#D97706] border border-[#FCD9A8] rounded-full text-xs font-bold tracking-wide uppercase mb-2">Requires {requiredPlan}</div>
            <h2 className={`font-bold tracking-tight text-text mb-1.5 leading-tight ${mob?"text-xl":"text-2xl"}`}>{b.title}</h2>
            <div className="text-sm text-text-3">You're on the <strong className="text-text-2">{currentPlan}</strong> plan</div>
          </div>
          <button onClick={onClose} aria-label="Close" className="bg-transparent border-0 cursor-pointer p-1.5 text-text-3 flex shrink-0"><I n="x" s={20}/></button>
        </div>
      </div>

      {/* Body */}
      <div className={mob?"p-6":"p-8"}>
        <p className="text-sm text-text-2 leading-relaxed mb-5">{b.why}</p>

        {b.bullets.length>0&&<div className="mb-6">
          <div className="text-xs font-bold text-text-3 tracking-wider uppercase mb-3">What you unlock</div>
          <div className="flex flex-col gap-2.5">
            {b.bullets.map((bl,i)=><div key={i} className="flex gap-2.5 items-start text-sm text-text-2 leading-normal">
              <div className="w-5 h-5 rounded-full bg-tint text-brand flex items-center justify-center shrink-0 mt-px"><I n="check" s={12}/></div>
              <span>{bl}</span>
            </div>)}
          </div>
        </div>}

        {/* Plans that unlock it */}
        <div className="p-4 bg-bg rounded-xl mb-5">
          <div className="text-xs font-bold text-text-3 tracking-wider uppercase mb-3">Available on</div>
          <div className="flex flex-col gap-2">
            {plans.map(([n,p])=><div key={n} className={`flex justify-between items-center py-2.5 px-3 bg-white rounded-lg ${n===cheapest?.[0]?"border-2 border-brand":"border border-line"}`}>
              <div>
                <div className="text-sm font-bold text-text">{n}{n===cheapest?.[0]&&<span className="ml-2 text-xs font-bold text-brand tracking-wide uppercase">Cheapest</span>}</div>
                <div className="text-xs text-text-3 mt-0.5">${p.price}/month</div>
              </div>
              <I n="check" s={16} c={C.ok}/>
            </div>)}
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className={`border-t border-line bg-bg flex gap-2.5 justify-end flex-wrap ${mob?"pt-4 px-6 pb-6":"pt-5 px-8 pb-7"}`}>
        <Btn kind="ghost" onClick={onClose}>Maybe later</Btn>
        <Btn kind="primary" icon="wallet" onClick={()=>{onClose(); A.go("pricing");}}>See all plans</Btn>
        {cheapest&&<Btn kind="primary" icon="chevR" onClick={()=>{onClose(); A.choosePlan(cheapest[0]);}} style={{background:C.brand,borderColor:C.brand}}>Upgrade to {cheapest[0]}</Btn>}
      </div>
    </div>
  </div>;
}

export function DashShell({modules,children,brandKind}){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [navOpen,setNavOpen]=useState(!mob);
  const [upgradeModal,setUpgradeModal]=useState(null); /* {feature, requiredPlan, label} */
  const [accountMenu,setAccountMenu]=useState(false);
  useEffect(()=>{setNavOpen(!mob);},[mob]);

  const user=A.user; const company=A.company;
  const currentModule=modules.find(m=>m.k===A.pg);
  const sections=Array.from(new Set(modules.map(m=>m.section)));

  /* Stats block for sidebar top */
  const empStats=user?.role==="employer"&&company?(()=>{
    const jobs=A.jobs.filter(j=>j.e===company.id);
    const apps=A.applications.filter(a=>jobs.some(j=>j.id===a.job));
    return {jobs:jobs.filter(j=>j.status==="live").length,apps:apps.length,plan:company.plan||"Free"};
  })():null;

  const admStats=user?.role==="admin"?(()=>{
    return {users:A.people.length,employers:A.employers.length,jobs:A.jobs.filter(j=>j.status==="live").length};
  })():null;

  const sidebar=<div className={`w-64 bg-ink text-white flex flex-col border-r border-white/8 h-screen ${mob?"fixed":"sticky"} top-0 left-0 ${mob?"z-900":"z-10"} transition-transform duration-300 ${navOpen?"translate-x-0":"-translate-x-full"} shrink-0`}>

    {/* Brand */}
    <div className="py-5 px-6 border-b border-white/8">
      <button onClick={()=>A.go("home")} className="flex items-center gap-2.5 bg-transparent border-0 text-white cursor-pointer p-0">
        <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/35 flex items-center justify-center"><I n="hex" s={16} c="#6AACFF"/></div>
        <div><div className="text-sm font-bold tracking-tight">NorthHire</div>
          <div className="text-xs text-accent font-semibold mt-px">{brandKind}</div></div>
      </button>
    </div>

    {/* Profile + stats block */}
    <div className="py-4 px-5 border-b border-white/8">
      <div className="flex gap-3 items-center mb-3.5">
        {user?.role==="employer"
          ? <SmartLogo e={company||{mark:"hex",a:C.brand,b:"#fff",name:"",site:""}} size={40} radius={11}/>
          : <SmartPortrait seed={user?.seed??0} size={40} radius={11}/>}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white overflow-hidden text-ellipsis whitespace-nowrap">
            {user?.role==="employer"?company?.name:user?.name}</div>
          <div className="text-xs text-white/55 mt-px">
            {user?.role==="employer"?(company?.verified?"Verified employer":"Awaiting verification"):"Administrator"}</div>
        </div>
      </div>
      {empStats&&<div className="grid grid-cols-2 gap-2">
        <div className="bg-white/5 rounded-lg py-2.5 px-3">
          <div className="text-base font-bold text-white tracking-tight leading-none">{empStats.jobs}</div>
          <div className="text-xs text-white/60 mt-1">Live jobs</div></div>
        <div className="bg-white/5 rounded-lg py-2.5 px-3">
          <div className="text-base font-bold text-white tracking-tight leading-none">{empStats.apps}</div>
          <div className="text-xs text-white/60 mt-1">Applicants</div></div>
      </div>}
      {admStats&&<div className="grid grid-cols-3 gap-1.5">
        {[["Users",admStats.users],["Cos",admStats.employers],["Jobs",admStats.jobs]].map(([l,v])=>
          <div key={l} className="bg-white/5 rounded-lg py-2.5 px-2 text-center">
            <div className="text-sm font-bold text-white tracking-tight leading-none">{v}</div>
            <div className="text-xs text-white/60 mt-1">{l}</div></div>)}
      </div>}
      {empStats&&<button onClick={()=>A.go("empBilling")} className="mt-2.5 w-full flex justify-between items-center bg-accent/12 border border-accent/25 rounded-lg py-2 px-3 cursor-pointer text-accent">
        <span className="text-xs font-semibold">Current plan</span>
        <span className="text-xs font-bold">{empStats.plan}</span></button>}
    </div>

    <nav className="flex-1 overflow-y-auto py-2.5 px-2">
      {sections.map(sec=>{const items=modules.filter(m=>m.section===sec);
        return <div key={sec} className="mb-2.5">
          <div className="text-xs font-bold text-white/35 tracking-widest uppercase pt-2 px-3 pb-1.5">{SECTION_LABELS[sec]}</div>
          {items.map(m=>{const active=A.pg===m.k;
            const locked=m.feature&&A.company&&!A.can(m.feature);
            const requiredPlan=locked?A.planRequires(m.feature):null;
            /* Build the "which plans have this" phrase */
            const planPhrase=requiredPlan==="Enterprise"?"the Enterprise plan":"the Growth and Enterprise plans";
            return <div key={m.k} className="relative group">
              <button onClick={()=>{
                if(locked){setUpgradeModal({feature:m.feature,requiredPlan,label:m.label,icon:m.icon}); return;}
                if(m.section==="hrsuite"){if(typeof window!=="undefined")window.open("#hr","_blank"); return;}
                A.go(m.k); if(mob)setNavOpen(false);
              }}
              className={`w-full flex gap-3 items-center py-2.5 px-3.5 border-0 cursor-pointer text-left rounded-xl my-px text-sm transition duration-150
               ${active?"bg-accent/15 text-accent font-semibold":locked?"text-white/40 font-medium":"text-white/75 font-medium hover:bg-white/5"}`}>
              <I n={m.icon} s={16.5}/>
              <span className="flex-1">{m.label}</span>
              {locked&&<I n="lock" s={13} c="rgba(245,165,36,.85)"/>}
              </button>
              {/* Floating tooltip on hover — pure CSS group-hover, no JS hover state needed */}
              {locked&&<div className="hidden group-hover:block absolute top-1/2 -translate-y-1/2 bg-ink text-white py-2.5 px-3.5 rounded-xl text-xs leading-normal w-56 z-9999 shadow-[0_8px_24px_rgba(0,0,0,0.25)] pointer-events-none border border-amber/30" style={{left:"calc(100% + 12px)"}}>
                <div className="flex gap-1.5 items-center mb-1.5">
                  <I n="lock" s={13} c="#F5A524"/>
                  <span className="text-xs font-bold text-amber tracking-wide uppercase">Locked</span>
                </div>
                <div className="text-white/90">This feature is only available on {planPhrase}.</div>
                <div className="mt-1.5 text-xs text-white/55">Click to see upgrade options.</div>
                {/* Arrow pointing left toward the sidebar item */}
                <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-ink"/>
              </div>}
            </div>;})}
        </div>;})}
    </nav>
    {upgradeModal&&<UpgradePromptModal payload={upgradeModal} onClose={()=>setUpgradeModal(null)}/>}

    <div className="p-3 border-t border-white/8">
      <button onClick={()=>{A.logout(); A.go("home");}} className="w-full flex gap-3 items-center py-2.5 px-3.5 bg-transparent border-0 cursor-pointer text-left rounded-xl text-white/75 text-sm font-medium transition duration-150 hover:bg-white/5">
        <I n="logout" s={16.5}/>Sign out</button>
    </div>
  </div>;

  const topbar=<div className={`bg-white border-b border-line flex gap-3 items-center sticky top-0 z-20 ${mob?"py-2.5 px-3.5":"py-3 px-6"}`}>
    {mob&&<button onClick={()=>setNavOpen(!navOpen)} aria-label="Menu" className="bg-transparent border-0 cursor-pointer p-1.5 text-text flex"><I n="menu" s={22}/></button>}
    {!mob&&A.history?.length>0&&<button onClick={A.back} aria-label="Back" className="bg-transparent border border-line h-9 pr-3 pl-2 rounded-lg cursor-pointer flex items-center gap-1 text-text-2 text-sm font-medium transition duration-150 hover:bg-bg hover:text-text">
      <I n="chevL" s={16} w={2}/>Back</button>}
    <div className={`flex-1 min-w-0 ${mob?"text-center":"text-left"}`}>
      <div className="text-base font-bold text-text tracking-tight">{currentModule?.label||A.pageTitle||ROUTES[A.pg]?.title||"Dashboard"}</div>
    </div>
    <button onClick={()=>{const target=A.user?.role==="admin"?"admLog":A.user?.role==="employer"?"messages":"alerts"; A.go(target);}} aria-label="Notifications" className="relative bg-bg border-0 w-9 h-9 rounded-lg cursor-pointer flex items-center justify-center text-text">
      <I n="bell" s={17}/>
      {A.notifications.filter(n=>!n.read).length>0&&<span className="absolute top-1.5 right-1.5 min-w-3.5 h-3.5 px-1 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center border-2 border-white">{A.notifications.filter(n=>!n.read).length}</span>}</button>
    <div className="relative ml-2">
      <button onClick={()=>setAccountMenu(v=>!v)} aria-label="Account"
        className="bg-transparent border-0 p-0 cursor-pointer flex rounded-xl transition duration-200 hover:scale-105">
        {user?.role==="employer"
          ? <SmartLogo e={company||{mark:"hex",a:C.brand,b:"#fff",name:"",site:""}} size={36} radius={10}/>
          : <SmartPortrait seed={user?.seed??0} size={36} radius={10}/>}
      </button>
      {accountMenu&&<>
        <div onClick={()=>setAccountMenu(false)} className="fixed inset-0 z-490"/>
        <div className="absolute top-11 right-0 w-64 bg-white border border-line rounded-2xl shadow-md z-500 overflow-hidden" style={{animation:"pop .16s ease"}}>
          <div className="py-3.5 px-4 border-b border-line-soft flex gap-3 items-center">
            {user?.role==="employer"
              ? <SmartLogo e={company||{mark:"hex",a:C.brand,b:"#fff",name:"",site:""}} size={40} radius={11}/>
              : <SmartPortrait seed={user?.seed??0} size={40} radius={11}/>}
            <div className="min-w-0">
              <div className="text-sm font-bold text-text overflow-hidden text-ellipsis whitespace-nowrap">
                {user?.role==="employer"?company?.name:user?.name}</div>
              <div className="text-xs text-text-3">{user?.role==="employer"?"Employer":"Administrator"}</div></div></div>
          <div className="p-1.5">
            {(user?.role==="employer"
              ?[["empHome","Dashboard","home"],["empPost","Post a job","plus"],["empPipeline","Candidates","users"],["empCompany","Company profile","building"],["empBilling","Billing","wallet"],["settings","Settings","gear"]]
              :[["admHome","Overview","home"],["admSettings","Platform settings","gear"],["admLog","Activity log","file"],["admStats","Statistics","trend"]]
            ).map(([p,l,ic])=>
              <button key={p} onClick={()=>{A.go(p);setAccountMenu(false);}} className="w-full flex items-center gap-3 py-2.5 px-3 border-0 bg-transparent cursor-pointer text-sm text-text rounded-xl text-left hover:bg-bg">
                <I n={ic} s={17} c={C.text2}/>{l}</button>)}
            <div className="h-px bg-line-soft my-1.5 mx-1"/>
            <button onClick={()=>{A.logout();setAccountMenu(false);A.go("home");}} className="w-full flex items-center gap-3 py-2.5 px-3 border-0 bg-transparent cursor-pointer text-sm text-red rounded-xl text-left hover:bg-red-bg">
              <I n="logout" s={17}/>Sign out</button></div></div></>}
    </div>
  </div>;

  return <div className="flex bg-bg min-h-screen">
    {mob&&navOpen&&<div onClick={()=>setNavOpen(false)} className="fixed inset-0 bg-black/40 z-800"/>}
    {sidebar}
    <div className="flex-1 min-w-0 flex flex-col">
      {topbar}
      <main className="flex-1">{children}</main>
    </div>
  </div>;
}

export function EmpShell({children}){return <DashShell modules={EMP_MODULES} brandKind="Employer console">{children}</DashShell>;}
export function AdmShell({children}){return <DashShell modules={ADM_MODULES} brandKind="Admin console">{children}</DashShell>;}
