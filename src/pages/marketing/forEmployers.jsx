import { useState, useEffect } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C, SH } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn, Card } from "../../design/primitives.jsx";

const STAFFING_AMBER = "#D97706";
const STAFFING_AMBER_BG = "#FEF3E2";
const STAFFING_AMBER_LN = "#FCD9A8";

/* ─── Reused: small anchor-scroll helper ─── */
function _scrollTo(id){if(typeof document==="undefined")return;
  const el=document.getElementById(id); if(el)el.scrollIntoView({behavior:"smooth",block:"start"});}

/* ─── For Employers — the marketing hub ─── */
export function ForEmployersPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [openFaq,setOpenFaq]=useState(null);

  /* Deep-link on load, e.g. arriving via /forEmployers#staffing */
  useEffect(()=>{if(typeof window==="undefined")return;
    const h=window.location.hash?.replace("#","");
    if(h)setTimeout(()=>_scrollTo(h),120);
  },[]);

  const products=[
    {id:"platform",name:"The job platform",tagline:"Post jobs. Get real Canadian applicants. Hire faster.",
      color:C.brand,pill:"For every employer",
      pitch:"Reach millions of Canadian workers actively looking. Post a role in 90 seconds, get scored applicants within the hour, run your whole pipeline without touching a spreadsheet."},
    {id:"hrsuite",name:"HR Suite",tagline:"Your whole people operation, in one place.",
      color:C.violet,pill:"For teams with staff",
      pitch:"Once you've hired, HR Suite runs everything after. Attendance, leave, payroll, chat, calendar, reviews, invoices — bundled with Enterprise or added standalone."},
    {id:"staffing",name:"NorthHire Staffing",tagline:"We employ the workers. You get invoiced weekly.",
      color:STAFFING_AMBER,pill:"For contract & temp needs",
      pitch:"Need people on site by Monday? Our licensed staffing agency handles recruiting, payroll, WSIB, and compliance. Workers stay on our payroll — you get one weekly invoice."},
  ];

  return <div style={{background:"#fff"}}>
    {/* ─── HERO ─── */}
    <section style={{background:`linear-gradient(180deg,${C.tint} 0%,#fff 100%)`,padding:mob?"52px 16px 40px":"96px 24px 60px",textAlign:"center"}}>
      <div style={{maxWidth:900,margin:"0 auto"}}>
        <div style={{display:"inline-block",padding:"6px 14px",background:"#fff",borderRadius:99,fontSize:12,fontWeight:640,color:C.brand,letterSpacing:".04em",textTransform:"uppercase",border:`1px solid ${C.line2}`,marginBottom:20}}>
          Three ways to hire in Canada</div>
        <h1 style={{fontSize:mob?36:60,fontWeight:750,color:C.text,letterSpacing:"-.035em",lineHeight:1.05,margin:"0 0 20px"}}>
          Post a job. Run your team.<br/>Or let us send you workers.</h1>
        <p style={{fontSize:mob?16:19,color:C.text2,lineHeight:1.55,maxWidth:640,margin:"0 auto 32px"}}>
          NorthHire is three products under one roof. Pick the one that matches how you actually hire — or use all three together.</p>
        <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
          {products.map(p=><button key={p.id} onClick={()=>_scrollTo(p.id)} style={{background:"#fff",border:`1.5px solid ${p.color}`,color:p.color,padding:mob?"10px 16px":"12px 22px",borderRadius:99,fontFamily:"inherit",fontSize:14,fontWeight:640,cursor:"pointer",transition:"all .16s"}}
            onMouseEnter={e=>{e.currentTarget.style.background=p.color;e.currentTarget.style.color="#fff";}}
            onMouseLeave={e=>{e.currentTarget.style.background="#fff";e.currentTarget.style.color=p.color;}}>
            Jump to {p.name}</button>)}
        </div>
      </div>
    </section>

    {/* ─── Which product for you? ─── */}
    <section style={{padding:mob?"40px 16px":"64px 24px",background:"#fff"}}>
      <div style={{maxWidth:1160,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <h2 style={{fontSize:mob?26:36,fontWeight:730,color:C.text,letterSpacing:"-.03em",margin:"0 0 12px"}}>Which one do you actually need?</h2>
          <p style={{fontSize:15.5,color:C.text3,margin:0,maxWidth:600,marginLeft:"auto",marginRight:"auto",lineHeight:1.55}}>Read the honest description. Pick the door that fits — or start with the platform and add the others as you grow.</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(3,1fr)",gap:16}}>
          {products.map(p=><button key={p.id} onClick={()=>_scrollTo(p.id)}
            style={{background:"#fff",border:`1px solid ${C.line}`,borderRadius:16,padding:mob?22:28,cursor:"pointer",textAlign:"left",fontFamily:"inherit",transition:"all .18s",position:"relative"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=p.color;e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow=SH.md;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.line;e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";}}>
            <div style={{fontSize:11,fontWeight:700,color:p.color,letterSpacing:".07em",textTransform:"uppercase",marginBottom:12}}>{p.pill}</div>
            <div style={{fontSize:22,fontWeight:720,color:C.text,letterSpacing:"-.025em",marginBottom:6}}>{p.name}</div>
            <div style={{fontSize:14,color:C.text2,fontWeight:500,marginBottom:14,lineHeight:1.45}}>{p.tagline}</div>
            <div style={{fontSize:13.5,color:C.text3,lineHeight:1.65}}>{p.pitch}</div>
            <div style={{marginTop:16,fontSize:13,fontWeight:640,color:p.color,display:"flex",alignItems:"center",gap:6}}>Learn more <I n="chevR" s={15} w={2}/></div>
          </button>)}
        </div>
      </div>
    </section>

    {/* ─── Product 1: JOB PLATFORM ─── */}
    <section id="platform" style={{padding:mob?"56px 16px":"96px 24px",background:C.bg,borderTop:`1px solid ${C.line}`,borderBottom:`1px solid ${C.line}`,scrollMarginTop:80}}>
      <div style={{maxWidth:1160,margin:"0 auto"}}>
        <_ProductHeader color={C.brand} kicker="Product 01 · Job Platform" title="Post a job. Get scored applicants. Hire without spreadsheets."
          body="The core product. Free to try, three tiers to scale. Everything a Canadian employer needs to move a candidate from posting to hire — nothing they don't."/>

        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(3,1fr)",gap:14,marginBottom:52}}>
          {[
            {ic:"target",t:"AI candidate scoring",b:"Every applicant scored 0–100 the moment they apply. Skills, tickets, years, location — ranked so you open the best CV first."},
            {ic:"activity",t:"Full pipeline",b:"Applied → Screen → Interview → Offer → Hired. Bulk actions, notes, tags, custom stages. Multiple hiring managers per role."},
            {ic:"calendar",t:"Interviews built in",b:"Schedule, send invites, take structured notes. Panel scoring for team interviews. No back-and-forth with a scheduling tool."},
            {ic:"users",t:"Talent pool",b:"Search 50k+ pre-verified Canadian workers. Filter by skill, ticket, city, availability. Contact directly through the platform."},
            {ic:"chart",t:"Real analytics",b:"Time to hire, source of hire, conversion by stage, cost per applicant. Compare roles side-by-side. Export for your board deck."},
            {ic:"shield",t:"Compliance built in",b:"Pay transparency for BC and ON, AODA-compliant application flow, PIPEDA-clean data handling. Nothing to configure."},
          ].map(f=><Card key={f.t} pad={22} style={{borderRadius:14}}>
            <div style={{width:40,height:40,borderRadius:10,background:C.tint,color:C.brand,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:14}}><I n={f.ic} s={20}/></div>
            <div style={{fontSize:15.5,fontWeight:660,color:C.text,letterSpacing:"-.015em",marginBottom:6}}>{f.t}</div>
            <div style={{fontSize:13.5,color:C.text2,lineHeight:1.6}}>{f.b}</div>
          </Card>)}
        </div>

        <div style={{textAlign:"center",marginBottom:32}}>
          <h3 style={{fontSize:mob?22:28,fontWeight:720,color:C.text,letterSpacing:"-.025em",margin:"0 0 10px"}}>Simple pricing. Real Canadian dollars.</h3>
          <p style={{fontSize:14.5,color:C.text3,margin:0}}>Cancel anytime. Prices per month, billed monthly or annually.</p>
        </div>

        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(3,1fr)",gap:14,marginBottom:40}}>
          {[
            {name:"Free",price:"$0",per:"forever",tagline:"Try before you commit.",
              features:["1 active job posting","Basic candidate scoring","Application inbox","AODA-compliant apply flow"],
              cta:"Start free",featured:false},
            {name:"Growth",price:"$149",per:"per month",tagline:"For small teams hiring regularly.",
              features:["10 active job postings","Full pipeline with custom stages","Interview scheduling","Talent pool search","Team seats (up to 5)","CSV import & export"],
              cta:"Start 14-day trial",featured:true},
            {name:"Enterprise",price:"$599",per:"per month",tagline:"For teams doing serious volume.",
              features:["Unlimited job postings","All Growth features","HR Suite included","API + Zapier","SSO / SAML","Dedicated success manager","Custom SLA"],
              cta:"Book a demo",featured:false},
          ].map(t=><Card key={t.name} pad={mob?24:28} style={{borderRadius:16,position:"relative",border:t.featured?`2px solid ${C.brand}`:`1px solid ${C.line}`,transform:t.featured?"scale(1.02)":"none"}}>
            {t.featured&&<div style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",background:C.brand,color:"#fff",padding:"4px 14px",borderRadius:99,fontSize:11,fontWeight:700,letterSpacing:".05em",textTransform:"uppercase"}}>Most picked</div>}
            <div style={{fontSize:14,fontWeight:660,color:C.text2,marginBottom:8}}>{t.name}</div>
            <div style={{display:"flex",alignItems:"baseline",gap:6,marginBottom:6}}>
              <span style={{fontSize:mob?36:42,fontWeight:750,color:C.text,letterSpacing:"-.03em"}}>{t.price}</span>
              <span style={{fontSize:13,color:C.text3}}>{t.per}</span>
            </div>
            <div style={{fontSize:13.5,color:C.text3,marginBottom:20,minHeight:36}}>{t.tagline}</div>
            <div style={{display:"flex",flexDirection:"column",gap:9,marginBottom:22}}>
              {t.features.map(f=><div key={f} style={{display:"flex",gap:8,alignItems:"flex-start",fontSize:13.5,color:C.text2}}>
                <I n="check" s={16} c={C.ok}/><span>{f}</span></div>)}
            </div>
            <Btn kind={t.featured?"primary":"ghost"} full onClick={()=>A.go("signup")}>{t.cta}</Btn>
          </Card>)}
        </div>

        <_TestimonialStrip quotes={[
          {q:"Went from 60-second-old spreadsheets to a live pipeline. We filled two Red Seal roles in eleven days.",who:"Jim H.",role:"HR Lead · PCL Construction"},
          {q:"The candidate scoring saved us hours per role. We stopped reading unqualified CVs entirely.",who:"Anne-Marie C.",role:"Talent Ops · Air Canada Ground"},
        ]} color={C.brand}/>
      </div>
    </section>

    {/* ─── Product 2: HR SUITE ─── */}
    <section id="hrsuite" style={{padding:mob?"56px 16px":"96px 24px",background:"#fff",scrollMarginTop:80}}>
      <div style={{maxWidth:1160,margin:"0 auto"}}>
        <_ProductHeader color={C.violet} kicker="Product 02 · HR Suite" title="After you hire, HR Suite runs everything."
          body="Sixteen modules covering the whole employee life-cycle. Same NorthHire login, different console. Built for Canadian labour law — CRA-ready payroll, ROE issuance, T4s, EI/CPP remittance, pay equity certification."/>

        <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"repeat(4,1fr)",gap:12,marginBottom:52}}>
          {[
            {t:"People",b:"Full org chart. Anyone reports to anyone. Historical."},
            {t:"Attendance",b:"Punch in/out. Web, kiosk, or physical device. Geo-locked."},
            {t:"Leave",b:"Balances, requests, approvals. Vacation, sick, parental, comp."},
            {t:"Payroll",b:"Biweekly runs. CPP/EI/tax. Direct deposit files."},
            {t:"Chat",b:"Team chat with channels. Optional voice/video."},
            {t:"Calendar",b:"Shared calendars, meetings, room bookings."},
            {t:"Tasks",b:"Kanban across the team. Assign, deadline, subtask."},
            {t:"Reviews",b:"Cycles, self + peer + manager, ratings, comp actions."},
            {t:"Documents",b:"Signed offer letters, contracts, T4s. Expiry alerts."},
            {t:"Invoices",b:"Client invoicing for professional services teams."},
            {t:"Reports",b:"Headcount, cost, turnover, diversity dashboards."},
            {t:"Settings",b:"Roles, permissions, integrations, branding."},
          ].map(m=><div key={m.t} style={{padding:"14px 16px",background:C.bg,borderRadius:11}}>
            <div style={{fontSize:13.5,fontWeight:660,color:C.violet,marginBottom:4}}>{m.t}</div>
            <div style={{fontSize:12.5,color:C.text3,lineHeight:1.5}}>{m.b}</div>
          </div>)}
        </div>

        <div style={{textAlign:"center",marginBottom:32}}>
          <h3 style={{fontSize:mob?22:28,fontWeight:720,color:C.text,letterSpacing:"-.025em",margin:"0 0 10px"}}>Get HR Suite two ways.</h3>
        </div>

        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:14,marginBottom:40}}>
          {[
            {name:"Bundled with Enterprise",price:"Included",per:"in your $599/mo",tagline:"Already on Enterprise? HR Suite is switched on.",
              features:["All 16 modules","Up to 250 employees","Included in your existing plan","Same login as the job platform"],
              cta:"See Enterprise",action:()=>A.go("pricing"),featured:true},
            {name:"HR Suite Standalone",price:"$8",per:"per employee / month",tagline:"For teams that just want the HR side, no job posting.",
              features:["All 16 modules","No employee cap","Import from BambooHR / Rise / Workday","Bring your own payroll processor"],
              cta:"Book a demo",action:()=>A.go("contact"),featured:false},
          ].map(t=><Card key={t.name} pad={mob?24:28} style={{borderRadius:16,position:"relative",border:t.featured?`2px solid ${C.violet}`:`1px solid ${C.line}`}}>
            {t.featured&&<div style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",background:C.violet,color:"#fff",padding:"4px 14px",borderRadius:99,fontSize:11,fontWeight:700,letterSpacing:".05em",textTransform:"uppercase"}}>Best value</div>}
            <div style={{fontSize:14,fontWeight:660,color:C.text2,marginBottom:8}}>{t.name}</div>
            <div style={{display:"flex",alignItems:"baseline",gap:6,marginBottom:6}}>
              <span style={{fontSize:mob?32:38,fontWeight:750,color:C.text,letterSpacing:"-.03em"}}>{t.price}</span>
              <span style={{fontSize:13,color:C.text3}}>{t.per}</span>
            </div>
            <div style={{fontSize:13.5,color:C.text3,marginBottom:20,minHeight:36}}>{t.tagline}</div>
            <div style={{display:"flex",flexDirection:"column",gap:9,marginBottom:22}}>
              {t.features.map(f=><div key={f} style={{display:"flex",gap:8,alignItems:"flex-start",fontSize:13.5,color:C.text2}}>
                <I n="check" s={16} c={C.violet}/><span>{f}</span></div>)}
            </div>
            <Btn kind={t.featured?"primary":"ghost"} full onClick={t.action}>{t.cta}</Btn>
          </Card>)}
        </div>

        <_TestimonialStrip quotes={[
          {q:"We killed BambooHR and moved to HR Suite in a weekend. Priya on the executive team wired the whole thing over Saturday coffee.",who:"Rachel M.",role:"COO · PCL Construction"},
          {q:"The kanban chat calendar combo is what Slack + Trello + Google Cal used to be, before they got expensive.",who:"Linda O.",role:"HR Director"},
        ]} color={C.violet}/>
      </div>
    </section>

    {/* ─── Product 3: STAFFING ─── */}
    <section id="staffing" style={{padding:mob?"56px 16px":"96px 24px",background:STAFFING_AMBER_BG,borderTop:`1px solid ${STAFFING_AMBER_LN}`,borderBottom:`1px solid ${STAFFING_AMBER_LN}`,scrollMarginTop:80}}>
      <div style={{maxWidth:1160,margin:"0 auto"}}>
        <_ProductHeader color={STAFFING_AMBER} kicker="Product 03 · NorthHire Staffing" title="We employ the workers. You get invoiced weekly."
          body="Licensed Ontario Temp Help Agency (ON-THA-2026-4471). We handle recruiting, payroll, WSIB, T4s, and compliance. You approve timesheets. Workers are on our payroll — clean legal separation, one invoice per week."/>

        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:16,marginBottom:52}}>
          <Card pad={mob?22:28} style={{borderRadius:16,background:"#fff"}}>
            <div style={{fontSize:11,fontWeight:700,color:STAFFING_AMBER,letterSpacing:".07em",textTransform:"uppercase",marginBottom:10}}>Contract & Temp</div>
            <div style={{fontSize:22,fontWeight:720,color:C.text,letterSpacing:"-.025em",marginBottom:12}}>Workers on our payroll, at your site.</div>
            <div style={{fontSize:14,color:C.text2,lineHeight:1.65,marginBottom:16}}>
              Best for surge coverage, seasonal ramp, project-based work, and try-before-you-hire arrangements. You get vetted workers on site within 48 hours. We handle wages, source deductions, WSIB claims, and ROE issuance when the assignment ends.
            </div>
            <div style={{padding:14,background:STAFFING_AMBER_BG,borderRadius:10,marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:640,color:C.text2,marginBottom:8}}>What it costs</div>
              <div style={{fontSize:20,fontWeight:730,color:STAFFING_AMBER}}>25–45% markup on pay rate</div>
              <div style={{fontSize:12,color:C.text3,marginTop:6,lineHeight:1.5}}>Covers CPP, EI, EHT, WSIB, vacation, admin, and margin. Weekly invoice, HST added per province, Net 15 to Net 60 terms.</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {["Vetted, ticket-verified workers","48-hour typical fill time","Weekly invoicing, flexible terms","Convert to permanent anytime (fee scales down)","We carry $5M liability + WSIB in every province we operate"].map(f=><div key={f} style={{display:"flex",gap:8,alignItems:"flex-start",fontSize:13,color:C.text2}}>
                <I n="check" s={15} c={STAFFING_AMBER}/><span>{f}</span></div>)}
            </div>
          </Card>

          <Card pad={mob?22:28} style={{borderRadius:16,background:"#fff"}}>
            <div style={{fontSize:11,fontWeight:700,color:STAFFING_AMBER,letterSpacing:".07em",textTransform:"uppercase",marginBottom:10}}>Permanent placement</div>
            <div style={{fontSize:22,fontWeight:720,color:C.text,letterSpacing:"-.025em",marginBottom:12}}>We source, you hire. Fee on start.</div>
            <div style={{fontSize:14,color:C.text2,lineHeight:1.65,marginBottom:16}}>
              For roles where you want a permanent hire but don't have time to source. We do the recruiting; the new hire goes on your payroll. Placement fee due when they start. 90-day replacement guarantee — if they walk before day 90, we source a replacement or refund pro-rata.
            </div>
            <div style={{padding:14,background:STAFFING_AMBER_BG,borderRadius:10,marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:640,color:C.text2,marginBottom:8}}>What it costs</div>
              <div style={{fontSize:20,fontWeight:730,color:STAFFING_AMBER}}>15–22% of first-year salary</div>
              <div style={{fontSize:12,color:C.text3,marginTop:6,lineHeight:1.5}}>Blue-collar and skilled trades toward 15%; management and specialized professional toward 22%. Invoiced on day one.</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {["Sourcing, screening, first-round interviews","3–5 qualified candidates per role","90-day replacement or refund guarantee","No fee if we don't fill","Discounts on volume commitments"].map(f=><div key={f} style={{display:"flex",gap:8,alignItems:"flex-start",fontSize:13,color:C.text2}}>
                <I n="check" s={15} c={STAFFING_AMBER}/><span>{f}</span></div>)}
            </div>
          </Card>
        </div>

        <div style={{textAlign:"center",marginBottom:32}}>
          <h3 style={{fontSize:mob?22:28,fontWeight:720,color:C.text,letterSpacing:"-.025em",margin:"0 0 10px"}}>How the money actually moves.</h3>
          <p style={{fontSize:14.5,color:C.text3,margin:0}}>No hidden fees, no surprise charges. Here's every dollar accounted for.</p>
        </div>

        <Card pad={mob?22:32} style={{marginBottom:40,borderRadius:16,background:"#fff"}}>
          <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(3,1fr)",gap:20}}>
            {[
              {step:"1",title:"You approve the timesheet",body:"Every Monday, your on-site supervisor approves last week's hours. Web link or email button.",time:"Weekly"},
              {step:"2",title:"We invoice you",body:"Same day approval hits, we invoice you at the bill rate we agreed. HST added per province. Net 30 default, negotiable.",time:"Weekly"},
              {step:"3",title:"We pay the workers",body:"Biweekly direct deposit. We remit CPP, EI, tax to CRA. Vacation pay accrued at 4% for later payout.",time:"Biweekly"},
            ].map(s=><div key={s.step}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                <div style={{width:36,height:36,borderRadius:99,background:STAFFING_AMBER,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:730}}>{s.step}</div>
                <div style={{fontSize:11,fontWeight:640,color:STAFFING_AMBER,letterSpacing:".05em",textTransform:"uppercase"}}>{s.time}</div>
              </div>
              <div style={{fontSize:16,fontWeight:660,color:C.text,letterSpacing:"-.015em",marginBottom:6}}>{s.title}</div>
              <div style={{fontSize:13.5,color:C.text2,lineHeight:1.6}}>{s.body}</div>
            </div>)}
          </div>
          <div style={{marginTop:24,paddingTop:24,borderTop:`1px solid ${C.line}`,fontSize:13,color:C.text3,textAlign:"center",lineHeight:1.6}}>
            Between us paying workers Thursday and you paying us at Net 30, we carry the cash gap.
            You don't post a deposit, and we never charge the worker anything. That's the whole model.
          </div>
        </Card>

        <_TestimonialStrip quotes={[
          {q:"We had five electricians on site by Wednesday. First week's invoice matched the quote to the penny.",who:"Tom W.",role:"Site Supt · LRT Southeast"},
          {q:"They handled the ROE when the assignment wrapped. I didn't even remember I was supposed to file one.",who:"Fatima Y.",role:"Charge Nurse · Bridgepoint"},
        ]} color={STAFFING_AMBER}/>

        <div style={{marginTop:40,textAlign:"center"}}>
          <Btn kind="primary" size="lg" onClick={()=>A.go("contact")} style={{background:STAFFING_AMBER,borderColor:STAFFING_AMBER}}>
            Talk to NorthHire Staffing</Btn>
          <div style={{fontSize:12,color:C.text3,marginTop:12}}>Or if you're already a client, <button onClick={()=>A.user?.role==="employer"?A.go("empStaffing"):A.go("login")} style={{background:"none",border:"none",padding:0,color:STAFFING_AMBER,cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:640,textDecoration:"underline"}}>sign in to your staffing dashboard</button>.</div>
        </div>
      </div>
    </section>

    {/* ─── Comparison table ─── */}
    <section style={{padding:mob?"56px 16px":"96px 24px",background:C.bg}}>
      <div style={{maxWidth:1160,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <h2 style={{fontSize:mob?26:36,fontWeight:730,color:C.text,letterSpacing:"-.03em",margin:"0 0 12px"}}>Side by side.</h2>
          <p style={{fontSize:14.5,color:C.text3,margin:0}}>Same brand, three products. Different fits. Sometimes all three make sense.</p>
        </div>

        <Card pad={0} style={{borderRadius:16,overflow:"hidden"}}>
          <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:680}}>
            <thead><tr style={{background:C.bg,borderBottom:`2px solid ${C.line}`}}>
              <th style={{padding:"16px 20px",textAlign:"left",fontSize:12,fontWeight:700,color:C.text3,letterSpacing:".05em",textTransform:"uppercase"}}></th>
              <th style={{padding:"16px 20px",textAlign:"left",fontSize:13,fontWeight:730,color:C.brand,letterSpacing:"-.01em"}}>Job Platform</th>
              <th style={{padding:"16px 20px",textAlign:"left",fontSize:13,fontWeight:730,color:C.violet,letterSpacing:"-.01em"}}>HR Suite</th>
              <th style={{padding:"16px 20px",textAlign:"left",fontSize:13,fontWeight:730,color:STAFFING_AMBER,letterSpacing:"-.01em"}}>Staffing</th>
            </tr></thead>
            <tbody>{[
              ["You need to","Fill a job you posted","Manage staff you already have","Get workers on site fast without hiring them"],
              ["The worker is on…","Your payroll","Your payroll","Our payroll (contract) or your payroll (permanent)"],
              ["You pay us","Subscription (per month)","Included in Enterprise, or per-employee","Bill rate per hour, or placement fee"],
              ["Time to first outcome","Applicants within hours","Set up in a weekend","Workers on site in 48 hours"],
              ["Ideal team size","1 to 5,000","5 to 5,000","1 hire, or 500 hires"],
              ["Compliance handled","Pay transparency, AODA","Payroll, T4s, ROEs, pay equity","THA license, WSIB, ROEs, T4s"],
            ].map((row,i)=><tr key={i} style={{borderBottom:`1px solid ${C.lineSoft}`}}>
              <td style={{padding:"14px 20px",fontSize:13,color:C.text3,fontWeight:640}}>{row[0]}</td>
              <td style={{padding:"14px 20px",fontSize:13.5,color:C.text}}>{row[1]}</td>
              <td style={{padding:"14px 20px",fontSize:13.5,color:C.text}}>{row[2]}</td>
              <td style={{padding:"14px 20px",fontSize:13.5,color:C.text}}>{row[3]}</td>
            </tr>)}</tbody>
          </table></div>
        </Card>
      </div>
    </section>

    {/* ─── FAQ ─── */}
    <section style={{padding:mob?"56px 16px":"96px 24px",background:"#fff"}}>
      <div style={{maxWidth:820,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <h2 style={{fontSize:mob?26:36,fontWeight:730,color:C.text,letterSpacing:"-.03em",margin:"0 0 12px"}}>Straight answers.</h2>
        </div>
        {[
          ["Do I have to pick one product?","No. Most Enterprise clients use the Job Platform and HR Suite together. Staffing is a separate business relationship — you can use it as a client without changing anything about your job platform subscription."],
          ["What's the difference between HR Suite and Staffing?","HR Suite is software for running your own employees. Staffing is a service where we employ workers on your behalf. HR Suite manages people on your payroll; Staffing puts people from our payroll on your site."],
          ["Can Staffing workers convert to permanent hires?","Yes. If you want to hire a contract worker directly, we charge a conversion fee that scales down based on how long they've been on assignment. Details in the MSA."],
          ["What's your ATS integration story?","Growth and Enterprise support CSV import/export. Enterprise adds direct integrations with Workday, Greenhouse, and Lever. HR Suite has its own import tool for BambooHR, Rise, and Workday."],
          ["Do you support French?","Job posts, worker communications, and client documents are available in English and Canadian French. HR Suite UI is English-only for now — French coming Q2 2026."],
          ["Where does your data live?","Canadian data residency. AWS ca-central-1 (Montréal). SOC 2 Type II. Details on request under NDA."],
          ["Can I try Staffing without an MSA?","We can send you a small trial roster with a short-form services agreement for a week's engagement. Full MSA required for ongoing relationships."],
        ].map(([q,a],i)=><div key={i} style={{borderBottom:`1px solid ${C.line}`,padding:"18px 0"}}>
          <button onClick={()=>setOpenFaq(openFaq===i?null:i)} style={{background:"none",border:"none",padding:0,width:"100%",textAlign:"left",cursor:"pointer",fontFamily:"inherit",display:"flex",justifyContent:"space-between",gap:14,alignItems:"center"}}>
            <span style={{fontSize:15.5,fontWeight:660,color:C.text,letterSpacing:"-.015em"}}>{q}</span>
            <I n={openFaq===i?"minus":"plus"} s={17} c={C.text3}/>
          </button>
          {openFaq===i&&<div style={{fontSize:14.5,color:C.text2,lineHeight:1.7,marginTop:12}}>{a}</div>}
        </div>)}
      </div>
    </section>

    {/* ─── Final CTA ─── */}
    <section style={{padding:mob?"56px 16px":"96px 24px",background:C.ink,color:"#fff"}}>
      <div style={{maxWidth:820,margin:"0 auto",textAlign:"center"}}>
        <h2 style={{fontSize:mob?28:40,fontWeight:730,letterSpacing:"-.03em",margin:"0 0 16px",color:"#fff"}}>Ready when you are.</h2>
        <p style={{fontSize:mob?15:17,color:"rgba(255,255,255,.7)",lineHeight:1.6,margin:"0 0 32px"}}>
          Start free on the Job Platform, or talk to us about HR Suite and Staffing. No sales gymnastics.</p>
        <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
          <Btn kind="primary" size="lg" onClick={()=>A.go("signup")}>Start free</Btn>
          <Btn kind="ghost" size="lg" onClick={()=>A.go("contact")} style={{background:"rgba(255,255,255,.08)",color:"#fff",borderColor:"rgba(255,255,255,.2)"}}>Book a demo</Btn>
          <Btn kind="ghost" size="lg" onClick={()=>A.go("howItWorks")} style={{background:"transparent",color:"#fff",borderColor:"rgba(255,255,255,.2)"}}>See how it works</Btn>
        </div>
      </div>
    </section>
  </div>;
}

function _ProductHeader({color,kicker,title,body}){
  const mob=useMedia("(max-width: 900px)");
  return <div style={{marginBottom:40}}>
    <div style={{fontSize:11,fontWeight:700,color,letterSpacing:".08em",textTransform:"uppercase",marginBottom:14}}>{kicker}</div>
    <h2 style={{fontSize:mob?28:44,fontWeight:730,color:C.text,letterSpacing:"-.03em",lineHeight:1.1,margin:"0 0 16px",maxWidth:720}}>{title}</h2>
    <p style={{fontSize:mob?15:17,color:C.text2,lineHeight:1.6,margin:0,maxWidth:640}}>{body}</p>
  </div>;
}

function _TestimonialStrip({quotes,color}){
  const mob=useMedia("(max-width: 900px)");
  return <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:14,marginTop:24}}>
    {quotes.map((q,i)=><Card key={i} pad={mob?20:24} style={{borderRadius:14,borderLeft:`4px solid ${color}`}}>
      <div style={{fontSize:15,color:C.text,lineHeight:1.6,fontStyle:"italic",marginBottom:14,letterSpacing:"-.005em"}}>"{q.q}"</div>
      <div style={{fontSize:12.5,color:C.text3}}>
        <span style={{fontWeight:640,color:C.text2}}>{q.who}</span> · {q.role}
      </div>
    </Card>)}
  </div>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   HOW IT WORKS
   ═══════════════════════════════════════════════════════════════════════════ */

export function HowItWorksPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [track,setTrack]=useState("seeker");

  const tracks={
    seeker:{
      label:"I'm looking for work",color:C.brand,
      steps:[
        {t:"Create your profile",b:"Sign up in 60 seconds. Add your skills, tickets, work eligibility. That's your reusable application.",
          detail:"No paywalls. Never charged. Auto-fills every application after."},
        {t:"Find jobs matched to you",b:"We match on skills, tickets, city, availability. Every listing shows real pay, not a range.",
          detail:"Filter by trade, city, employer, wage floor. Save searches for daily alerts."},
        {t:"Apply in one tap",b:"Pick your CV, review employer's questions, hit Apply. See match score before submitting.",
          detail:"Applied jobs live in your status page. Track every stage in real time."},
        {t:"Get interviewed & hired",b:"Employer messages you through the app. Interview scheduling built in. Accept the offer, you're hired.",
          detail:"Contract offers surface transparently — you'll know if you're hired direct or through NorthHire Staffing."},
        {t:"Optionally, join NorthHire Staffing",b:"Want ongoing contract work? Opt in as a worker. We employ you, place you at client sites, pay you biweekly.",
          detail:"You submit hours weekly, get direct deposit Thursday, T4s at year end, 4% vacation accrual."},
      ]
    },
    employer:{
      label:"I want to hire",color:C.violet,
      steps:[
        {t:"Sign up as an employer",b:"Two-minute signup. Verify your business, add a logo, done. Free tier lets you post one job.",
          detail:"Growth and Enterprise unlock more jobs, seats, and features. Cancel anytime."},
        {t:"Post the role",b:"Write the posting or use AI-autofill from a title. Add screening questions. Set the pay range — pay transparency is standard.",
          detail:"Draft, schedule, or publish immediately. Post to Google Jobs and Indeed automatically on Growth+."},
        {t:"Review scored applicants",b:"AI ranks every applicant 0–100 as they apply. Open the top ones first.",
          detail:"Bulk actions. Notes and tags. Multi-manager pipeline."},
        {t:"Interview, offer, hire",b:"Schedule interviews in-app. Track candidates through custom stages. Send offer letters. Move to hired.",
          detail:"Hired candidates flow into HR Suite automatically on Enterprise."},
        {t:"Run your team with HR Suite",b:"Once someone's hired, HR Suite is their home. Attendance, leave, payroll, reviews. All in one console.",
          detail:"Included with Enterprise. Or standalone at $8/employee/month."},
        {t:"Need workers now, not later? Use Staffing.",b:"For contract, temp, or fast-fill needs. We handle everything from sourcing to WSIB. You approve timesheets.",
          detail:"Weekly invoicing. 25-45% markup on pay rate. First workers on site in 48 hours."},
      ]
    },
    staffing:{
      label:"I'm using NorthHire Staffing",color:STAFFING_AMBER,
      steps:[
        {t:"As a client: sign the MSA",b:"Master Services Agreement covers rates, terms, conversion fees, insurance. Standard, but let your lawyer review.",
          detail:"One-time paperwork. Ongoing relationship."},
        {t:"As a client: request workers",b:"Submit a job order — role, count, start date, must-have tickets, shift pattern, pay rate. We reply within 4 hours with candidates.",
          detail:"Or we push open orders proactively to your bench of preferred workers."},
        {t:"Workers arrive on site",b:"Vetted, ticket-verified, PPE-ready. Your on-site supervisor becomes their day-to-day contact.",
          detail:"Typical fill time: 48 hours from job order to first shift."},
        {t:"Every Monday: approve timesheets",b:"Web link or email button. Approve, return with notes, or split-approve. Locks the timesheet for payroll and invoicing.",
          detail:"Approved timesheets → weekly invoice on Tuesday, biweekly payroll to workers on Thursday."},
        {t:"As a worker: submit your hours",b:"Mobile-optimized timesheet, submit by Sunday night. Supervisor approves by Monday noon.",
          detail:"Direct deposit Thursday. Pay stub in your NorthHire portal. T4 at year end."},
        {t:"Convert to permanent (optional)",b:"Client wants to hire the worker directly? Pay the conversion fee, worker moves to client payroll, contract ends.",
          detail:"Fee scales down with time already worked. Coordinated between agency, client, and worker."},
      ]
    },
  };
  const t=tracks[track];

  return <div style={{background:"#fff"}}>
    <section style={{background:`linear-gradient(180deg,${C.tint} 0%,#fff 100%)`,padding:mob?"52px 16px 40px":"88px 24px 60px",textAlign:"center"}}>
      <div style={{maxWidth:820,margin:"0 auto"}}>
        <div style={{display:"inline-block",padding:"6px 14px",background:"#fff",borderRadius:99,fontSize:12,fontWeight:640,color:C.brand,letterSpacing:".04em",textTransform:"uppercase",border:`1px solid ${C.line2}`,marginBottom:20}}>
          How it works</div>
        <h1 style={{fontSize:mob?36:56,fontWeight:750,color:C.text,letterSpacing:"-.035em",lineHeight:1.05,margin:"0 0 20px"}}>
          Pick your role. See the flow.</h1>
        <p style={{fontSize:mob?16:18,color:C.text2,lineHeight:1.55,maxWidth:600,margin:"0 auto 32px"}}>
          NorthHire connects three different journeys. Choose yours below to see exactly what happens, step by step.</p>
      </div>
    </section>

    <section style={{padding:mob?"32px 16px 20px":"32px 24px 20px",borderBottom:`1px solid ${C.line}`,background:"#fff",position:"sticky",top:0,zIndex:5}}>
      <div style={{maxWidth:820,margin:"0 auto"}}>
        <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
          {Object.entries(tracks).map(([k,v])=><button key={k} onClick={()=>setTrack(k)} style={{
            background:track===k?v.color:"#fff",color:track===k?"#fff":C.text2,
            border:`1.5px solid ${track===k?v.color:C.line}`,padding:mob?"10px 16px":"12px 22px",borderRadius:99,
            fontFamily:"inherit",fontSize:13.5,fontWeight:640,cursor:"pointer",transition:"all .16s"}}>
            {v.label}</button>)}
        </div>
      </div>
    </section>

    <section style={{padding:mob?"40px 16px 60px":"64px 24px 96px",background:"#fff"}}>
      <div style={{maxWidth:820,margin:"0 auto"}}>
        <div style={{position:"relative"}}>
          {/* Vertical line */}
          {!mob&&<div style={{position:"absolute",left:23,top:24,bottom:24,width:2,background:t.color,opacity:.15}}/>}
          {t.steps.map((s,i)=><div key={i} style={{display:"flex",gap:mob?14:22,marginBottom:32,alignItems:"flex-start"}}>
            <div style={{width:48,height:48,borderRadius:99,background:t.color,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,fontWeight:730,flexShrink:0,zIndex:1,position:"relative"}}>{i+1}</div>
            <div style={{flex:1,padding:mob?"0":"0 0 8px"}}>
              <div style={{fontSize:mob?18:22,fontWeight:720,color:C.text,letterSpacing:"-.025em",marginBottom:8}}>{s.t}</div>
              <div style={{fontSize:15,color:C.text2,lineHeight:1.65,marginBottom:10}}>{s.b}</div>
              <div style={{fontSize:13,color:C.text3,lineHeight:1.6,padding:"12px 14px",background:C.bg,borderRadius:10,borderLeft:`3px solid ${t.color}`}}>{s.detail}</div>
            </div>
          </div>)}
        </div>

        <div style={{marginTop:60,padding:mob?"24px 20px":"36px 40px",background:C.bg,borderRadius:16,textAlign:"center"}}>
          <div style={{fontSize:mob?18:22,fontWeight:720,color:C.text,letterSpacing:"-.025em",marginBottom:10}}>
            {track==="seeker"?"Ready to find your next role?":track==="employer"?"Ready to start hiring?":"Ready to see NorthHire Staffing in action?"}</div>
          <div style={{fontSize:14,color:C.text3,marginBottom:20}}>
            {track==="seeker"?"Sign up free. We never charge job seekers.":track==="employer"?"Post a job in 90 seconds. Free tier available.":"Book a call — first workers on site in 48 hours."}</div>
          <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
            <Btn kind="primary" onClick={()=>track==="seeker"?A.go("signup"):track==="employer"?A.go("signup"):A.go("contact")} style={{background:t.color,borderColor:t.color}}>
              {track==="seeker"?"Create your account":track==="employer"?"Start posting jobs":"Talk to us"}</Btn>
            <Btn kind="ghost" onClick={()=>A.go("forEmployers")}>See all three products</Btn>
          </div>
        </div>
      </div>
    </section>
  </div>;
}

