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
  return <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(15,23,42,.68)",zIndex:9998,display:"flex",alignItems:"center",justifyContent:"center",padding:mob?16:24,backdropFilter:"blur(4px)"}}>
    <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:mob?16:20,maxWidth:600,width:"100%",maxHeight:"90vh",overflow:"auto",boxShadow:"0 24px 60px rgba(0,0,0,.35)"}}>
      {/* Header */}
      <div style={{padding:mob?"22px 22px 18px":"28px 32px 22px",borderBottom:`1px solid ${C.line}`,background:`linear-gradient(180deg, ${C.tint} 0%, #fff 100%)`}}>
        <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
          <div style={{width:48,height:48,borderRadius:12,background:"#fff",color:C.brand,border:`1px solid ${C.line2}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <I n={icon||"lock"} s={22}/>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"inline-block",padding:"3px 10px",background:"#FEF3E2",color:"#D97706",border:"1px solid #FCD9A8",borderRadius:99,fontSize:10.5,fontWeight:700,letterSpacing:".05em",textTransform:"uppercase",marginBottom:8}}>Requires {requiredPlan}</div>
            <h2 style={{fontSize:mob?20:24,fontWeight:730,color:C.text,letterSpacing:"-.025em",margin:"0 0 6px",lineHeight:1.2}}>{b.title}</h2>
            <div style={{fontSize:13,color:C.text3}}>You're on the <strong style={{color:C.text2}}>{currentPlan}</strong> plan</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{background:"none",border:"none",cursor:"pointer",padding:6,color:C.text3,display:"flex",flexShrink:0}}><I n="x" s={20}/></button>
        </div>
      </div>

      {/* Body */}
      <div style={{padding:mob?22:32}}>
        <p style={{fontSize:14.5,color:C.text2,lineHeight:1.65,margin:"0 0 20px"}}>{b.why}</p>

        {b.bullets.length>0&&<div style={{marginBottom:24}}>
          <div style={{fontSize:11,fontWeight:700,color:C.text3,letterSpacing:".07em",textTransform:"uppercase",marginBottom:12}}>What you unlock</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {b.bullets.map((bl,i)=><div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",fontSize:13.5,color:C.text2,lineHeight:1.5}}>
              <div style={{width:20,height:20,borderRadius:99,background:C.tint,color:C.brand,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}><I n="check" s={12}/></div>
              <span>{bl}</span>
            </div>)}
          </div>
        </div>}

        {/* Plans that unlock it */}
        <div style={{padding:16,background:C.bg,borderRadius:12,marginBottom:20}}>
          <div style={{fontSize:11,fontWeight:700,color:C.text3,letterSpacing:".07em",textTransform:"uppercase",marginBottom:12}}>Available on</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {plans.map(([n,p])=><div key={n} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:"#fff",borderRadius:8,border:n===cheapest?.[0]?`1.5px solid ${C.brand}`:`1px solid ${C.line}`}}>
              <div>
                <div style={{fontSize:14,fontWeight:660,color:C.text}}>{n}{n===cheapest?.[0]&&<span style={{marginLeft:8,fontSize:10,fontWeight:700,color:C.brand,letterSpacing:".05em",textTransform:"uppercase"}}>Cheapest</span>}</div>
                <div style={{fontSize:12,color:C.text3,marginTop:2}}>${p.price}/month</div>
              </div>
              <I n="check" s={16} c={C.ok}/>
            </div>)}
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div style={{padding:mob?"16px 22px 22px":"18px 32px 28px",borderTop:`1px solid ${C.line}`,background:C.bg,display:"flex",gap:10,justifyContent:"flex-end",flexWrap:"wrap"}}>
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
  const [hoveredLock,setHoveredLock]=useState(null); /* module key currently hovered */
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

  const sidebar=<div style={{width:264,background:C.ink,color:"#fff",display:"flex",flexDirection:"column",
    borderRight:"1px solid rgba(255,255,255,.08)",height:"100vh",position:mob?"fixed":"sticky",top:0,left:0,
    zIndex:mob?900:10,transform:navOpen?"translateX(0)":"translateX(-100%)",transition:"transform .28s ease",flexShrink:0}}>

    {/* Brand */}
    <div style={{padding:"18px 22px",borderBottom:"1px solid rgba(255,255,255,.08)"}}>
      <button onClick={()=>A.go("home")} style={{display:"flex",alignItems:"center",gap:10,background:"none",border:"none",color:"#fff",cursor:"pointer",fontFamily:"inherit",padding:0}}>
        <div style={{width:32,height:32,borderRadius:9,background:"rgba(106,172,255,.2)",border:"1px solid rgba(106,172,255,.35)",display:"flex",alignItems:"center",justifyContent:"center"}}><I n="hex" s={16} c="#6AACFF"/></div>
        <div><div style={{fontSize:14.5,fontWeight:720,letterSpacing:"-.02em"}}>NorthHire</div>
          <div style={{fontSize:11,color:"#6AACFF",fontWeight:600,marginTop:1}}>{brandKind}</div></div>
      </button>
    </div>

    {/* Profile + stats block */}
    <div style={{padding:"16px 18px",borderBottom:"1px solid rgba(255,255,255,.08)"}}>
      <div style={{display:"flex",gap:11,alignItems:"center",marginBottom:14}}>
        {user?.role==="employer"
          ? <SmartLogo e={company||{mark:"hex",a:C.brand,b:"#fff",name:"",site:""}} size={40} radius={11}/>
          : <SmartPortrait seed={user?.seed??0} size={40} radius={11}/>}
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13.5,fontWeight:660,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {user?.role==="employer"?company?.name:user?.name}</div>
          <div style={{fontSize:11.5,color:"rgba(255,255,255,.55)",marginTop:1}}>
            {user?.role==="employer"?(company?.verified?"Verified employer":"Awaiting verification"):"Administrator"}</div>
        </div>
      </div>
      {empStats&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <div style={{background:"rgba(255,255,255,.05)",borderRadius:8,padding:"9px 11px"}}>
          <div style={{fontSize:16,fontWeight:720,color:"#fff",letterSpacing:"-.02em",lineHeight:1}}>{empStats.jobs}</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,.6)",marginTop:4}}>Live jobs</div></div>
        <div style={{background:"rgba(255,255,255,.05)",borderRadius:8,padding:"9px 11px"}}>
          <div style={{fontSize:16,fontWeight:720,color:"#fff",letterSpacing:"-.02em",lineHeight:1}}>{empStats.apps}</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,.6)",marginTop:4}}>Applicants</div></div>
      </div>}
      {admStats&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
        {[["Users",admStats.users],["Cos",admStats.employers],["Jobs",admStats.jobs]].map(([l,v])=>
          <div key={l} style={{background:"rgba(255,255,255,.05)",borderRadius:8,padding:"9px 8px",textAlign:"center"}}>
            <div style={{fontSize:14,fontWeight:720,color:"#fff",letterSpacing:"-.02em",lineHeight:1}}>{v}</div>
            <div style={{fontSize:10.5,color:"rgba(255,255,255,.6)",marginTop:3}}>{l}</div></div>)}
      </div>}
      {empStats&&<button onClick={()=>A.go("empBilling")} style={{marginTop:10,width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(106,172,255,.12)",border:"1px solid rgba(106,172,255,.25)",borderRadius:8,padding:"8px 11px",cursor:"pointer",fontFamily:"inherit",color:"#6AACFF"}}>
        <span style={{fontSize:12,fontWeight:600}}>Current plan</span>
        <span style={{fontSize:12.5,fontWeight:700}}>{empStats.plan}</span></button>}
    </div>

    <nav style={{flex:1,overflowY:"auto",padding:"10px 8px"}}>
      {sections.map(sec=>{const items=modules.filter(m=>m.section===sec);
        return <div key={sec} style={{marginBottom:10}}>
          <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.35)",letterSpacing:".08em",textTransform:"uppercase",padding:"8px 12px 6px"}}>{SECTION_LABELS[sec]}</div>
          {items.map(m=>{const active=A.pg===m.k;
            const locked=m.feature&&A.company&&!A.can(m.feature);
            const requiredPlan=locked?A.planRequires(m.feature):null;
            /* Build the "which plans have this" phrase */
            const planPhrase=requiredPlan==="Enterprise"?"the Enterprise plan":"the Growth and Enterprise plans";
            const isHovered=hoveredLock===m.k;
            return <div key={m.k} style={{position:"relative"}}>
              <button onClick={()=>{
                if(locked){setUpgradeModal({feature:m.feature,requiredPlan,label:m.label,icon:m.icon}); return;}
                if(m.section==="hrsuite"){if(typeof window!=="undefined")window.open("#hr","_blank"); return;}
                A.go(m.k); if(mob)setNavOpen(false);
              }}
              style={{width:"100%",display:"flex",gap:12,alignItems:"center",padding:"9px 13px",
                background:active?"rgba(106,172,255,.15)":"none",border:"none",cursor:"pointer",fontFamily:"inherit",
                textAlign:"left",borderRadius:9,margin:"1px 0",
                color:locked?"rgba(255,255,255,.4)":active?"#6AACFF":"rgba(255,255,255,.75)",
                fontSize:13.5,fontWeight:active?640:500,transition:"all .15s"}}
              onMouseEnter={e=>{if(locked){setHoveredLock(m.k);} else if(!active){e.currentTarget.style.background="rgba(255,255,255,.05)";}}}
              onMouseLeave={e=>{if(locked){setHoveredLock(null);} else if(!active){e.currentTarget.style.background="transparent";}}}>
              <I n={m.icon} s={16.5}/>
              <span style={{flex:1}}>{m.label}</span>
              {locked&&<I n="lock" s={13} c="rgba(245,165,36,.85)"/>}
              </button>
              {/* Floating tooltip on hover */}
              {locked&&isHovered&&<div style={{position:"absolute",left:"calc(100% + 12px)",top:"50%",transform:"translateY(-50%)",
                background:C.ink,color:"#fff",padding:"10px 14px",borderRadius:10,fontSize:12.5,lineHeight:1.5,
                width:230,zIndex:9999,boxShadow:"0 8px 24px rgba(0,0,0,.25)",pointerEvents:"none",
                border:"1px solid rgba(245,165,36,.3)"}}>
                <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:6}}>
                  <I n="lock" s={13} c="#F5A524"/>
                  <span style={{fontSize:11,fontWeight:700,color:"#F5A524",letterSpacing:".05em",textTransform:"uppercase"}}>Locked</span>
                </div>
                <div style={{color:"rgba(255,255,255,.9)"}}>This feature is only available on {planPhrase}.</div>
                <div style={{marginTop:6,fontSize:11,color:"rgba(255,255,255,.55)"}}>Click to see upgrade options.</div>
                {/* Arrow pointing left toward the sidebar item */}
                <div style={{position:"absolute",right:"100%",top:"50%",transform:"translateY(-50%)",width:0,height:0,
                  borderTop:"6px solid transparent",borderBottom:"6px solid transparent",borderRight:`6px solid ${C.ink}`}}/>
              </div>}
            </div>;})}
        </div>;})}
    </nav>
    {upgradeModal&&<UpgradePromptModal payload={upgradeModal} onClose={()=>setUpgradeModal(null)}/>}

    <div style={{padding:12,borderTop:"1px solid rgba(255,255,255,.08)"}}>
      <button onClick={()=>{A.logout(); A.go("home");}} style={{width:"100%",display:"flex",gap:11,alignItems:"center",padding:"9px 13px",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",textAlign:"left",borderRadius:9,color:"rgba(255,255,255,.75)",fontSize:13.5,fontWeight:520,transition:"all .15s"}}
        onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.05)"}
        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
        <I n="logout" s={16.5}/>Sign out</button>
    </div>
  </div>;

  const topbar=<div style={{background:"#fff",borderBottom:`1px solid ${C.line}`,padding:mob?"10px 14px":"12px 24px",display:"flex",gap:12,alignItems:"center",position:"sticky",top:0,zIndex:20}}>
    {mob&&<button onClick={()=>setNavOpen(!navOpen)} aria-label="Menu" style={{background:"none",border:"none",cursor:"pointer",padding:6,color:C.text,display:"flex"}}><I n="menu" s={22}/></button>}
    {!mob&&A.history?.length>0&&<button onClick={A.back} aria-label="Back" style={{background:"transparent",border:`1px solid ${C.line}`,height:34,padding:"0 11px 0 8px",borderRadius:8,cursor:"pointer",display:"flex",alignItems:"center",gap:4,color:C.text2,fontFamily:"inherit",fontSize:13,fontWeight:520,transition:"all .16s"}}
      onMouseEnter={e=>{e.currentTarget.style.background=C.bg;e.currentTarget.style.color=C.text;}}
      onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=C.text2;}}>
      <I n="chevL" s={16} w={2}/>Back</button>}
    <div style={{flex:1,minWidth:0,textAlign:mob?"center":"left"}}>
      <div style={{fontSize:mob?15:16,fontWeight:670,color:C.text,letterSpacing:"-.02em"}}>{currentModule?.label||A.pageTitle||ROUTES[A.pg]?.title||"Dashboard"}</div>
    </div>
    <button onClick={()=>{const target=A.user?.role==="admin"?"admLog":A.user?.role==="employer"?"messages":"alerts"; A.go(target);}} aria-label="Notifications" style={{position:"relative",background:C.bg,border:"none",width:36,height:36,borderRadius:9,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:C.text}}>
      <I n="bell" s={17}/>
      {A.notifications.filter(n=>!n.read).length>0&&<span style={{position:"absolute",top:5,right:5,minWidth:14,height:14,padding:"0 3px",borderRadius:99,background:C.brand,color:"#fff",fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",border:"2px solid #fff"}}>{A.notifications.filter(n=>!n.read).length}</span>}</button>
    <div style={{position:"relative",marginLeft:8}}>
      <button onClick={()=>setAccountMenu(v=>!v)} aria-label="Account"
        style={{background:"none",border:"none",padding:0,cursor:"pointer",display:"flex",borderRadius:10,transition:"transform .18s"}}
        onMouseEnter={e=>e.currentTarget.style.transform="scale(1.04)"}
        onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
        {user?.role==="employer"
          ? <SmartLogo e={company||{mark:"hex",a:C.brand,b:"#fff",name:"",site:""}} size={36} radius={10}/>
          : <SmartPortrait seed={user?.seed??0} size={36} radius={10}/>}
      </button>
      {accountMenu&&<>
        <div onClick={()=>setAccountMenu(false)} style={{position:"fixed",inset:0,zIndex:490}}/>
        <div style={{position:"absolute",top:44,right:0,width:252,background:"#fff",border:`1px solid ${C.line}`,
          borderRadius:14,boxShadow:SH.md,zIndex:500,overflow:"hidden",animation:"pop .16s ease"}}>
          <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.lineSoft}`,display:"flex",gap:11,alignItems:"center"}}>
            {user?.role==="employer"
              ? <SmartLogo e={company||{mark:"hex",a:C.brand,b:"#fff",name:"",site:""}} size={40} radius={11}/>
              : <SmartPortrait seed={user?.seed??0} size={40} radius={11}/>}
            <div style={{minWidth:0}}>
              <div style={{fontSize:14,fontWeight:650,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {user?.role==="employer"?company?.name:user?.name}</div>
              <div style={{fontSize:12,color:C.text3}}>{user?.role==="employer"?"Employer":"Administrator"}</div></div></div>
          <div style={{padding:6}}>
            {(user?.role==="employer"
              ?[["empHome","Dashboard","home"],["empPost","Post a job","plus"],["empPipeline","Candidates","users"],["empCompany","Company profile","building"],["empBilling","Billing","wallet"],["settings","Settings","gear"]]
              :[["admHome","Overview","home"],["admSettings","Platform settings","gear"],["admLog","Activity log","file"],["admStats","Statistics","trend"]]
            ).map(([p,l,ic])=>
              <button key={p} onClick={()=>{A.go(p);setAccountMenu(false);}} style={{width:"100%",display:"flex",alignItems:"center",gap:11,
                padding:"10px 11px",border:"none",background:"transparent",cursor:"pointer",fontFamily:"inherit",fontSize:14,
                color:C.text,borderRadius:9,textAlign:"left"}}
                onMouseEnter={e=>e.currentTarget.style.background=C.bg} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <I n={ic} s={17} c={C.text2}/>{l}</button>)}
            <div style={{height:1,background:C.lineSoft,margin:"6px 4px"}}/>
            <button onClick={()=>{A.logout();setAccountMenu(false);A.go("home");}} style={{width:"100%",display:"flex",alignItems:"center",gap:11,
              padding:"10px 11px",border:"none",background:"transparent",cursor:"pointer",fontFamily:"inherit",fontSize:14,
              color:C.red,borderRadius:9,textAlign:"left"}}
              onMouseEnter={e=>e.currentTarget.style.background=C.redBg} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <I n="logout" s={17}/>Sign out</button></div></div></>}
    </div>
  </div>;

  return <div style={{display:"flex",background:C.bg,minHeight:"100vh"}}>
    {mob&&navOpen&&<div onClick={()=>setNavOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",zIndex:800}}/>}
    {sidebar}
    <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column"}}>
      {topbar}
      <main style={{flex:1}}>{children}</main>
    </div>
  </div>;
}

export function EmpShell({children}){return <DashShell modules={EMP_MODULES} brandKind="Employer console">{children}</DashShell>;}
export function AdmShell({children}){return <DashShell modules={ADM_MODULES} brandKind="Admin console">{children}</DashShell>;}
