import { useState, useEffect } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C, SH } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn, Card, HERO_WIDE, SECTION_CLS } from "../../design/primitives.jsx";

const STAFFING_AMBER = "#D97706";

/* Product tone lookup — kept as a literal object (not string-interpolated into a className) so
   Tailwind's static scanner can see every class it needs to generate. Only 3 known products. */
const PRODUCT_TONE={
  platform:{border:"border-brand",text:"text-brand",invert:"hover:bg-brand hover:text-white",cardHover:"hover:border-brand"},
  hrsuite:{border:"border-violet",text:"text-violet",invert:"hover:bg-violet hover:text-white",cardHover:"hover:border-violet"},
  staffing:{border:"border-staffing",text:"text-staffing",invert:"hover:bg-staffing hover:text-white",cardHover:"hover:border-staffing"},
};

/* ─── Reused: small anchor-scroll helper ─── */
function _scrollTo(id){if(typeof document==="undefined")return;
  const el=document.getElementById(id); if(el)el.scrollIntoView({behavior:"smooth",block:"start"});}

/* ─── For Employers — the marketing hub ─── */
export function ForEmployersPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [openFaq,setOpenFaq]=useState(null);

  /* Deep-link on load, e.g. arriving via /forEmployers#staffing. Also listen for hashchange -
     the footer's "Overview" link sets the hash directly (not through React state) and calls
     A.go("forEmployers"), which is a no-op re-render when already on this page, so a mount-only
     effect never re-fires and the scroll silently does nothing the second time. */
  useEffect(()=>{if(typeof window==="undefined")return;
    const scrollToHash=()=>{const h=window.location.hash?.replace("#","");
      if(h)setTimeout(()=>_scrollTo(h),120);};
    scrollToHash();
    window.addEventListener("hashchange",scrollToHash);
    return ()=>window.removeEventListener("hashchange",scrollToHash);
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

  return <div className="bg-white">
    {/* ─── HERO ─── */}
    <section className={`text-center ${mob?"pt-13 px-4 pb-10":"pt-24 px-6 pb-15"}`} style={{background:`linear-gradient(180deg,${C.tint} 0%,#fff 100%)`}}>
      <div className="max-w-225 mx-auto">
        <div className="inline-block py-1.5 px-3.5 bg-white rounded-full text-xs font-semibold text-brand tracking-wide uppercase border border-line-2 mb-5">
          Three ways to hire in Canada</div>
        <h1 className={`${HERO_WIDE} mb-5 ${mob?"text-4xl":"text-6xl"}`}>
          Post a job. Run your team.<br/>Or let us send you workers.</h1>
        <p className={`text-text-2 leading-snug max-w-160 mx-auto mb-8 ${mob?"text-base":"text-lg"}`}>
          NorthHire is three products under one roof. Pick the one that matches how you actually hire — or use all three together.</p>
        <div className="flex gap-2.5 justify-center flex-wrap">
          {products.map(p=><button key={p.id} onClick={()=>_scrollTo(p.id)}
            className={`bg-white border-2 ${PRODUCT_TONE[p.id].border} ${PRODUCT_TONE[p.id].text} ${PRODUCT_TONE[p.id].invert} rounded-full font-semibold cursor-pointer transition-colors duration-150 text-sm ${mob?"py-2.5 px-4":"py-3 px-6"}`}>
            Jump to {p.name}</button>)}
        </div>
      </div>
    </section>

    {/* ─── Which product for you? ─── */}
    <section className={`bg-white ${mob?"py-10 px-4":"py-16 px-6"}`}>
      <div className="max-w-290 mx-auto">
        <div className="text-center mb-10">
          <h2 className={`${SECTION_CLS} mb-3 ${mob?"text-2xl":"text-4xl"}`}>Which one do you actually need?</h2>
          <p className="text-text-3 max-w-150 mx-auto leading-snug" style={{fontSize:15.5}}>Read the honest description. Pick the door that fits — or start with the platform and add the others as you grow.</p>
        </div>
        <div className={`grid gap-4 ${mob?"grid-cols-1":"grid-cols-3"}`}>
          {products.map(p=><button key={p.id} onClick={()=>_scrollTo(p.id)}
            className={`bg-white border border-line ${PRODUCT_TONE[p.id].cardHover} rounded-2xl cursor-pointer text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-md relative ${mob?"p-6":"p-7"}`}>
            <div className={`text-xs font-bold ${PRODUCT_TONE[p.id].text} tracking-wide uppercase mb-3`}>{p.pill}</div>
            <div className="text-2xl font-bold text-text tracking-tight mb-1.5">{p.name}</div>
            <div className="text-sm text-text-2 font-medium mb-3.5 leading-snug">{p.tagline}</div>
            <div className="text-sm text-text-3 leading-relaxed">{p.pitch}</div>
            <div className={`mt-4 text-sm font-semibold ${PRODUCT_TONE[p.id].text} flex items-center gap-1.5`}>Learn more <I n="chevR" s={15} w={2}/></div>
          </button>)}
        </div>
      </div>
    </section>

    {/* ─── Product 1: JOB PLATFORM ─── */}
    <section id="platform" className={`bg-bg border-y border-line ${mob?"py-14 px-4":"py-24 px-6"}`} style={{scrollMarginTop:80}}>
      <div className="max-w-290 mx-auto">
        <_ProductHeader color={C.brand} kicker="Product 01 · Job Platform" title="Post a job. Get scored applicants. Hire without spreadsheets."
          body="The core product. Free to try, three tiers to scale. Everything a Canadian employer needs to move a candidate from posting to hire — nothing they don't."/>

        <div className={`grid gap-3.5 mb-13 ${mob?"grid-cols-1":"grid-cols-3"}`}>
          {[
            {ic:"target",t:"AI candidate scoring",b:"Every applicant scored 0–100 the moment they apply. Skills, tickets, years, location — ranked so you open the best CV first."},
            {ic:"activity",t:"Full pipeline",b:"Applied → Screen → Interview → Offer → Hired. Bulk actions, notes, tags, custom stages. Multiple hiring managers per role."},
            {ic:"calendar",t:"Interviews built in",b:"Schedule, send invites, take structured notes. Panel scoring for team interviews. No back-and-forth with a scheduling tool."},
            {ic:"users",t:"Talent pool",b:"Search 50k+ pre-verified Canadian workers. Filter by skill, ticket, city, availability. Contact directly through the platform."},
            {ic:"trend",t:"Real analytics",b:"Time to hire, source of hire, conversion by stage, cost per applicant. Compare roles side-by-side. Export for your board deck."},
            {ic:"shield",t:"Compliance built in",b:"Pay transparency for BC and ON, AODA-compliant application flow, PIPEDA-clean data handling. Nothing to configure."},
          ].map(f=><Card key={f.t} pad={22} style={{borderRadius:14}}>
            <div className="w-10 h-10 rounded-xl bg-tint text-brand flex items-center justify-center mb-3.5"><I n={f.ic} s={20}/></div>
            <div className="font-bold text-text tracking-tight mb-1.5" style={{fontSize:15.5}}>{f.t}</div>
            <div className="text-sm text-text-2 leading-relaxed">{f.b}</div>
          </Card>)}
        </div>

        <div className="text-center mb-8">
          <h3 className={`font-bold text-text tracking-tight mb-2.5 ${mob?"text-2xl":"text-3xl"}`}>Simple pricing. Real Canadian dollars.</h3>
          <p className="text-sm text-text-3">Cancel anytime. Prices per month, billed monthly or annually.</p>
        </div>

        <div className={`grid gap-3.5 mb-10 ${mob?"grid-cols-1":"grid-cols-3"}`}>
          {[
            {name:"Free",price:"$0",per:"forever",tagline:"Try before you commit.",
              features:["1 active job posting","Basic candidate scoring","Application inbox","AODA-compliant apply flow"],
              cta:"Start free",featured:false},
            {name:"Growth",price:"$149",per:"per month",tagline:"For small teams hiring regularly.",
              features:["10 active job postings","Full pipeline with custom stages","Interview scheduling","Talent pool search","Team seats (up to 5)","CSV import & export"],
              cta:"Start 14-day trial",featured:true},
            {name:"Enterprise",price:"$599",per:"per month",tagline:"For teams doing serious volume.",
              features:["Unlimited job postings","All Growth features","HR Suite included","REST API + signed webhooks","Dedicated success manager","Custom SLA"],
              cta:"Book a demo",featured:false},
          ].map(t=><Card key={t.name} pad={mob?24:28} style={{borderRadius:16,position:"relative",border:t.featured?`2px solid ${C.brand}`:`1px solid ${C.line}`,transform:t.featured?"scale(1.02)":"none"}}>
            {t.featured&&<div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-white py-1 px-3.5 rounded-full text-xs font-bold tracking-wide uppercase">Most picked</div>}
            <div className="text-sm font-bold text-text-2 mb-2">{t.name}</div>
            <div className="flex items-baseline gap-1.5 mb-1.5">
              <span className={`font-bold text-text tracking-tight ${mob?"text-4xl":"text-5xl"}`}>{t.price}</span>
              <span className="text-sm text-text-3">{t.per}</span>
            </div>
            <div className="text-sm text-text-3 mb-5 min-h-9">{t.tagline}</div>
            <div className="flex flex-col gap-2 mb-6">
              {t.features.map(f=><div key={f} className="flex gap-2 items-start text-sm text-text-2">
                <I n="check" s={16} c={C.ok}/><span>{f}</span></div>)}
            </div>
            <Btn kind={t.featured?"primary":"ghost"} full
              onClick={()=>t.name==="Enterprise"?A.go("contact"):(A.setPendingPlan(t.name),A.go("signup"))}>{t.cta}</Btn>
          </Card>)}
        </div>

        <_TestimonialStrip quotes={[
          {q:"Went from 60-second-old spreadsheets to a live pipeline. We filled two Red Seal roles in eleven days.",who:"Jim H.",role:"HR Lead · PCL Construction"},
          {q:"The candidate scoring saved us hours per role. We stopped reading unqualified CVs entirely.",who:"Anne-Marie C.",role:"Talent Ops · Air Canada Ground"},
        ]} color={C.brand}/>
      </div>
    </section>

    {/* ─── Product 2: HR SUITE ─── */}
    <section id="hrsuite" className={`bg-white ${mob?"py-14 px-4":"py-24 px-6"}`} style={{scrollMarginTop:80}}>
      <div className="max-w-290 mx-auto">
        <_ProductHeader color={C.violet} kicker="Product 02 · HR Suite" title="After you hire, HR Suite runs everything."
          body="Sixteen modules covering the whole employee life-cycle. Same NorthHire login, different console. Built for Canadian labour law — CRA-ready payroll, ROE issuance, T4s, EI/CPP remittance, pay equity certification."/>

        <div className={`grid gap-3 mb-13 ${mob?"grid-cols-2":"grid-cols-4"}`}>
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
          ].map(m=><div key={m.t} className="py-3.5 px-4 bg-bg rounded-xl">
            <div className="text-sm font-bold text-violet mb-1">{m.t}</div>
            <div className="text-xs text-text-3 leading-snug">{m.b}</div>
          </div>)}
        </div>

        <div className="text-center mb-8">
          <h3 className={`font-bold text-text tracking-tight mb-2.5 ${mob?"text-2xl":"text-3xl"}`}>Get HR Suite two ways.</h3>
        </div>

        <div className={`grid gap-3.5 mb-10 ${mob?"grid-cols-1":"grid-cols-2"}`}>
          {[
            {name:"Bundled with Enterprise",price:"Included",per:"in your $599/mo",tagline:"Already on Enterprise? HR Suite is switched on.",
              features:["All 16 modules","Up to 250 employees","Included in your existing plan","Same login as the job platform"],
              cta:"See Enterprise",action:()=>A.go("pricing"),featured:true},
            {name:"HR Suite Standalone",price:"$8",per:"per employee / month",tagline:"For teams that just want the HR side, no job posting.",
              features:["All 16 modules","No employee cap","Import from BambooHR / Rise / Workday","Bring your own payroll processor"],
              cta:"Book a demo",action:()=>A.go("contact"),featured:false},
          ].map(t=><Card key={t.name} pad={mob?24:28} style={{borderRadius:16,position:"relative",border:t.featured?`2px solid ${C.violet}`:`1px solid ${C.line}`}}>
            {t.featured&&<div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet text-white py-1 px-3.5 rounded-full text-xs font-bold tracking-wide uppercase">Best value</div>}
            <div className="text-sm font-bold text-text-2 mb-2">{t.name}</div>
            <div className="flex items-baseline gap-1.5 mb-1.5">
              <span className={`font-bold text-text tracking-tight ${mob?"text-3xl":"text-4xl"}`}>{t.price}</span>
              <span className="text-sm text-text-3">{t.per}</span>
            </div>
            <div className="text-sm text-text-3 mb-5 min-h-9">{t.tagline}</div>
            <div className="flex flex-col gap-2 mb-6">
              {t.features.map(f=><div key={f} className="flex gap-2 items-start text-sm text-text-2">
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
    <section id="staffing" className={`bg-staffing-bg border-y border-staffing-line ${mob?"py-14 px-4":"py-24 px-6"}`} style={{scrollMarginTop:80}}>
      <div className="max-w-290 mx-auto">
        <_ProductHeader color={STAFFING_AMBER} kicker="Product 03 · NorthHire Staffing" title="We employ the workers. You get invoiced weekly."
          body="Licensed Ontario Temp Help Agency (ON-THA-2026-4471). We handle recruiting, payroll, WSIB, T4s, and compliance. You approve timesheets. Workers are on our payroll — clean legal separation, one invoice per week."/>

        <div className={`grid gap-4 mb-13 ${mob?"grid-cols-1":"grid-cols-2"}`}>
          <Card pad={mob?22:28} style={{borderRadius:16,background:"#fff"}}>
            <div className="text-xs font-bold text-staffing tracking-wide uppercase mb-2.5">Contract & Temp</div>
            <div className="text-2xl font-bold text-text tracking-tight mb-3">Workers on our payroll, at your site.</div>
            <div className="text-sm text-text-2 leading-relaxed mb-4">
              Best for surge coverage, seasonal ramp, project-based work, and try-before-you-hire arrangements. You get vetted workers on site within 48 hours. We handle wages, source deductions, WSIB claims, and ROE issuance when the assignment ends.
            </div>
            <div className="p-3.5 bg-staffing-bg rounded-xl mb-4">
              <div className="text-xs font-semibold text-text-2 mb-2">What it costs</div>
              <div className="text-xl font-bold text-staffing">25–45% markup on pay rate</div>
              <div className="text-xs text-text-3 mt-1.5 leading-snug">Covers CPP, EI, EHT, WSIB, vacation, admin, and margin. Weekly invoice, HST added per province, Net 15 to Net 60 terms.</div>
            </div>
            <div className="flex flex-col gap-2">
              {["Vetted, ticket-verified workers","48-hour typical fill time","Weekly invoicing, flexible terms","Convert to permanent anytime (fee scales down)","We carry $5M liability + WSIB in every province we operate"].map(f=><div key={f} className="flex gap-2 items-start text-sm text-text-2">
                <I n="check" s={15} c={STAFFING_AMBER}/><span>{f}</span></div>)}
            </div>
          </Card>

          <Card pad={mob?22:28} style={{borderRadius:16,background:"#fff"}}>
            <div className="text-xs font-bold text-staffing tracking-wide uppercase mb-2.5">Permanent placement</div>
            <div className="text-2xl font-bold text-text tracking-tight mb-3">We source, you hire. Fee on start.</div>
            <div className="text-sm text-text-2 leading-relaxed mb-4">
              For roles where you want a permanent hire but don't have time to source. We do the recruiting; the new hire goes on your payroll. Placement fee due when they start. 90-day replacement guarantee — if they walk before day 90, we source a replacement or refund pro-rata.
            </div>
            <div className="p-3.5 bg-staffing-bg rounded-xl mb-4">
              <div className="text-xs font-semibold text-text-2 mb-2">What it costs</div>
              <div className="text-xl font-bold text-staffing">15–22% of first-year salary</div>
              <div className="text-xs text-text-3 mt-1.5 leading-snug">Blue-collar and skilled trades toward 15%; management and specialized professional toward 22%. Invoiced on day one.</div>
            </div>
            <div className="flex flex-col gap-2">
              {["Sourcing, screening, first-round interviews","3–5 qualified candidates per role","90-day replacement or refund guarantee","No fee if we don't fill","Discounts on volume commitments"].map(f=><div key={f} className="flex gap-2 items-start text-sm text-text-2">
                <I n="check" s={15} c={STAFFING_AMBER}/><span>{f}</span></div>)}
            </div>
          </Card>
        </div>

        <div className="text-center mb-8">
          <h3 className={`font-bold text-text tracking-tight mb-2.5 ${mob?"text-2xl":"text-3xl"}`}>How the money actually moves.</h3>
          <p className="text-sm text-text-3">No hidden fees, no surprise charges. Here's every dollar accounted for.</p>
        </div>

        <Card pad={mob?22:32} style={{marginBottom:40,borderRadius:16,background:"#fff"}}>
          <div className={`grid gap-5 ${mob?"grid-cols-1":"grid-cols-3"}`}>
            {[
              {step:"1",title:"You approve the timesheet",body:"Every Monday, your on-site supervisor approves last week's hours. Web link or email button.",time:"Weekly"},
              {step:"2",title:"We invoice you",body:"Same day approval hits, we invoice you at the bill rate we agreed. HST added per province. Net 30 default, negotiable.",time:"Weekly"},
              {step:"3",title:"We pay the workers",body:"Biweekly direct deposit. We remit CPP, EI, tax to CRA. Vacation pay accrued at 4% for later payout.",time:"Biweekly"},
            ].map(s=><div key={s.step}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-staffing text-white flex items-center justify-center text-base font-bold">{s.step}</div>
                <div className="text-xs font-semibold text-staffing tracking-wide uppercase">{s.time}</div>
              </div>
              <div className="text-base font-bold text-text tracking-tight mb-1.5">{s.title}</div>
              <div className="text-sm text-text-2 leading-relaxed">{s.body}</div>
            </div>)}
          </div>
          <div className="mt-6 pt-6 border-t border-line text-sm text-text-3 text-center leading-relaxed">
            Between us paying workers Thursday and you paying us at Net 30, we carry the cash gap.
            You don't post a deposit, and we never charge the worker anything. That's the whole model.
          </div>
        </Card>

        <_TestimonialStrip quotes={[
          {q:"We had five electricians on site by Wednesday. First week's invoice matched the quote to the penny.",who:"Tom W.",role:"Site Supt · LRT Southeast"},
          {q:"They handled the ROE when the assignment wrapped. I didn't even remember I was supposed to file one.",who:"Fatima Y.",role:"Charge Nurse · Bridgepoint"},
        ]} color={STAFFING_AMBER}/>

        <div className="mt-10 text-center">
          <Btn kind="primary" size="lg" onClick={()=>A.go("contact")} style={{background:STAFFING_AMBER,borderColor:STAFFING_AMBER}}>
            Talk to NorthHire Staffing</Btn>
          <div className="text-xs text-text-3 mt-3">Or if you're already a client, <button onClick={()=>A.user?.role==="employer"?A.go("empStaffing"):A.go("login")} className="bg-transparent border-0 p-0 text-staffing cursor-pointer text-xs font-semibold underline">sign in to your staffing dashboard</button>.</div>
        </div>
      </div>
    </section>

    {/* ─── Comparison table ─── */}
    <section className={`bg-bg ${mob?"py-14 px-4":"py-24 px-6"}`}>
      <div className="max-w-290 mx-auto">
        <div className="text-center mb-10">
          <h2 className={`${SECTION_CLS} mb-3 ${mob?"text-2xl":"text-4xl"}`}>Side by side.</h2>
          <p className="text-sm text-text-3">Same brand, three products. Different fits. Sometimes all three make sense.</p>
        </div>

        <Card pad={0} style={{borderRadius:16,overflow:"hidden"}}>
          <div className="overflow-x-auto"><table className="w-full border-collapse" style={{minWidth:680}}>
            <thead><tr className="bg-bg border-b-2 border-line">
              <th className="py-4 px-5 text-left text-xs font-bold text-text-3 tracking-wide uppercase"></th>
              <th className="py-4 px-5 text-left text-sm font-bold text-brand tracking-tight">Job Platform</th>
              <th className="py-4 px-5 text-left text-sm font-bold text-violet tracking-tight">HR Suite</th>
              <th className="py-4 px-5 text-left text-sm font-bold text-staffing tracking-tight">Staffing</th>
            </tr></thead>
            <tbody>{[
              ["You need to","Fill a job you posted","Manage staff you already have","Get workers on site fast without hiring them"],
              ["The worker is on…","Your payroll","Your payroll","Our payroll (contract) or your payroll (permanent)"],
              ["You pay us","Subscription (per month)","Included in Enterprise, or per-employee","Bill rate per hour, or placement fee"],
              ["Time to first outcome","Applicants within hours","Set up in a weekend","Workers on site in 48 hours"],
              ["Ideal team size","1 to 5,000","5 to 5,000","1 hire, or 500 hires"],
              ["Compliance handled","Pay transparency, AODA","Payroll, T4s, ROEs, pay equity","THA license, WSIB, ROEs, T4s"],
            ].map((row,i)=><tr key={i} className="border-b border-line-soft">
              <td className="py-3.5 px-5 text-sm text-text-3 font-semibold">{row[0]}</td>
              <td className="py-3.5 px-5 text-sm text-text">{row[1]}</td>
              <td className="py-3.5 px-5 text-sm text-text">{row[2]}</td>
              <td className="py-3.5 px-5 text-sm text-text">{row[3]}</td>
            </tr>)}</tbody>
          </table></div>
        </Card>
      </div>
    </section>

    {/* ─── FAQ ─── */}
    <section className={`bg-white ${mob?"py-14 px-4":"py-24 px-6"}`}>
      <div className="max-w-205 mx-auto">
        <div className="text-center mb-10">
          <h2 className={`${SECTION_CLS} mb-3 ${mob?"text-2xl":"text-4xl"}`}>Straight answers.</h2>
        </div>
        {[
          ["Do I have to pick one product?","No. Most Enterprise clients use the Job Platform and HR Suite together. Staffing is a separate business relationship — you can use it as a client without changing anything about your job platform subscription."],
          ["What's the difference between HR Suite and Staffing?","HR Suite is software for running your own employees. Staffing is a service where we employ workers on your behalf. HR Suite manages people on your payroll; Staffing puts people from our payroll on your site."],
          ["Can Staffing workers convert to permanent hires?","Yes. If you want to hire a contract worker directly, we charge a conversion fee that scales down based on how long they've been on assignment. Details in the MSA."],
          ["What's your ATS integration story?","Growth and Enterprise support CSV import and export. Enterprise adds a REST API and signed webhooks, which is what you'd point Zapier or your own scripts at to sync jobs and applications with whatever you already run. We don't ship pre-built connectors for Workday, Greenhouse or Lever — the API is the integration path, and we'd rather say so than list logos we haven't built against."],
          ["Do you support French?","The platform is English-only today, including job posts, worker communications, and HR Suite. Canadian French support is on our roadmap — no committed date yet."],
          ["Where does your data live?","Canadian data residency. AWS ca-central-1 (Montréal). SOC 2 Type II. Details on request under NDA."],
          ["Can I try Staffing without an MSA?","We can send you a small trial roster with a short-form services agreement for a week's engagement. Full MSA required for ongoing relationships."],
        ].map(([q,a],i)=><div key={i} className="border-b border-line py-5">
          <button onClick={()=>setOpenFaq(openFaq===i?null:i)} className="bg-transparent border-0 p-0 w-full text-left cursor-pointer flex justify-between gap-3.5 items-center">
            <span className="font-bold text-text tracking-tight" style={{fontSize:15.5}}>{q}</span>
            <I n={openFaq===i?"minus":"plus"} s={17} c={C.text3}/>
          </button>
          {openFaq===i&&<div className="text-sm text-text-2 leading-relaxed mt-3">{a}</div>}
        </div>)}
      </div>
    </section>

    {/* ─── Final CTA ─── */}
    <section className={`bg-ink text-white ${mob?"py-14 px-4":"py-24 px-6"}`}>
      <div className="max-w-205 mx-auto text-center">
        <h2 className={`font-bold tracking-tight mb-4 text-white ${mob?"text-3xl":"text-5xl"}`}>Ready when you are.</h2>
        <p className={`text-white/70 leading-snug mb-8 ${mob?"text-sm":"text-lg"}`}>
          Start free on the Job Platform, or talk to us about HR Suite and Staffing. No sales gymnastics.</p>
        <div className="flex gap-3 justify-center flex-wrap">
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
  return <div className="mb-10">
    <div className="text-xs font-bold tracking-wide uppercase mb-3.5" style={{color}}>{kicker}</div>
    <h2 className={`${SECTION_CLS} leading-tight mb-4 max-w-180 ${mob?"text-3xl":"text-5xl"}`}>{title}</h2>
    <p className={`text-text-2 leading-snug max-w-160 ${mob?"text-sm":"text-lg"}`}>{body}</p>
  </div>;
}

function _TestimonialStrip({quotes,color}){
  const mob=useMedia("(max-width: 900px)");
  return <div className={`grid gap-3.5 mt-6 ${mob?"grid-cols-1":"grid-cols-2"}`}>
    {quotes.map((q,i)=><Card key={i} pad={mob?20:24} style={{borderRadius:14,borderLeft:`4px solid ${color}`}}>
      <div className="text-text leading-snug italic mb-3.5" style={{fontSize:15}}>"{q.q}"</div>
      <div className="text-xs text-text-3">
        <span className="font-semibold text-text-2">{q.who}</span> · {q.role}
      </div>
    </Card>)}
  </div>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   HOW IT WORKS
   ═══════════════════════════════════════════════════════════════════════════ */

const TRACK_TONE={
  seeker:{active:"bg-brand border-brand",bgOnly:"bg-brand",borderOnly:"border-brand",text:"text-brand"},
  employer:{active:"bg-violet border-violet",bgOnly:"bg-violet",borderOnly:"border-violet",text:"text-violet"},
  staffing:{active:"bg-staffing border-staffing",bgOnly:"bg-staffing",borderOnly:"border-staffing",text:"text-staffing"},
};

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
  const t=tracks[track]; const tone=TRACK_TONE[track];

  return <div className="bg-white">
    <section className={`text-center ${mob?"pt-13 px-4 pb-10":"pt-22 px-6 pb-15"}`} style={{background:`linear-gradient(180deg,${C.tint} 0%,#fff 100%)`}}>
      <div className="max-w-205 mx-auto">
        <div className="inline-block py-1.5 px-3.5 bg-white rounded-full text-xs font-semibold text-brand tracking-wide uppercase border border-line-2 mb-5">
          How it works</div>
        <h1 className={`${HERO_WIDE} mb-5 ${mob?"text-4xl":"text-6xl"}`}>
          Pick your role. See the flow.</h1>
        <p className={`text-text-2 leading-snug max-w-150 mx-auto mb-8 ${mob?"text-base":"text-lg"}`}>
          NorthHire connects three different journeys. Choose yours below to see exactly what happens, step by step.</p>
      </div>
    </section>

    <section className={`border-b border-line bg-white sticky top-0 z-5 ${mob?"pt-8 px-4 pb-5":"pt-8 px-6 pb-5"}`}>
      <div className="max-w-205 mx-auto">
        <div className="flex gap-2 justify-center flex-wrap">
          {Object.entries(tracks).map(([k,v])=><button key={k} onClick={()=>setTrack(k)}
            className={`border-2 rounded-full font-semibold cursor-pointer transition-colors duration-150 text-sm ${mob?"py-2.5 px-4":"py-3 px-6"} ${track===k?`${TRACK_TONE[k].active} text-white`:"bg-white text-text-2 border-line"}`}>
            {v.label}</button>)}
        </div>
      </div>
    </section>

    <section className={`bg-white ${mob?"pt-10 px-4 pb-15":"pt-16 px-6 pb-24"}`}>
      <div className="max-w-205 mx-auto">
        <div className="relative">
          {/* Vertical line */}
          {!mob&&<div className={`absolute left-6 top-6 bottom-6 w-0.5 ${tone.bgOnly} opacity-15`}/>}
          {t.steps.map((s,i)=><div key={i} className={`flex mb-8 items-start ${mob?"gap-3.5":"gap-6"}`}>
            <div className={`w-12 h-12 rounded-full ${tone.bgOnly} text-white flex items-center justify-center text-lg font-bold shrink-0 z-1 relative`}>{i+1}</div>
            <div className={`flex-1 ${mob?"":"pb-2"}`}>
              <div className={`font-bold text-text tracking-tight mb-2 ${mob?"text-lg":"text-2xl"}`}>{s.t}</div>
              <div className="text-base text-text-2 leading-relaxed mb-2.5">{s.b}</div>
              <div className={`text-sm text-text-3 leading-snug py-3 px-3.5 bg-bg rounded-xl border-l-4 ${tone.borderOnly}`}>{s.detail}</div>
            </div>
          </div>)}
        </div>

        <div className={`mt-15 bg-bg rounded-2xl text-center ${mob?"py-6 px-5":"py-9 px-10"}`}>
          <div className={`font-bold text-text tracking-tight mb-2.5 ${mob?"text-lg":"text-2xl"}`}>
            {track==="seeker"?"Ready to find your next role?":track==="employer"?"Ready to start hiring?":"Ready to see NorthHire Staffing in action?"}</div>
          <div className="text-sm text-text-3 mb-5">
            {track==="seeker"?"Sign up free. We never charge job seekers.":track==="employer"?"Post a job in 90 seconds. Free tier available.":"Book a call — first workers on site in 48 hours."}</div>
          <div className="flex gap-2.5 justify-center flex-wrap">
            <Btn kind="primary" onClick={()=>track==="seeker"?A.go("signup"):track==="employer"?A.go("signup"):A.go("contact")} style={{background:t.color,borderColor:t.color}}>
              {track==="seeker"?"Create your account":track==="employer"?"Start posting jobs":"Talk to us"}</Btn>
            <Btn kind="ghost" onClick={()=>A.go("forEmployers")}>See all three products</Btn>
          </div>
        </div>
      </div>
    </section>
  </div>;
}
