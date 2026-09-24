import { useState, useEffect } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { useTranslation } from "../../i18n/i18n.jsx";
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
  const { t } = useTranslation();
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
    {id:"platform",name:t("forEmployers.products.platform.name"),tagline:t("forEmployers.products.platform.tagline"),
      color:C.brand,pill:t("forEmployers.products.platform.pill"),
      pitch:t("forEmployers.products.platform.pitch")},
    {id:"hrsuite",name:t("forEmployers.products.hrsuite.name"),tagline:t("forEmployers.products.hrsuite.tagline"),
      color:C.violet,pill:t("forEmployers.products.hrsuite.pill"),
      pitch:t("forEmployers.products.hrsuite.pitch")},
    {id:"staffing",name:t("forEmployers.products.staffing.name"),tagline:t("forEmployers.products.staffing.tagline"),
      color:STAFFING_AMBER,pill:t("forEmployers.products.staffing.pill"),
      pitch:t("forEmployers.products.staffing.pitch")},
  ];

  return <div className="bg-white">
    {/* ─── HERO ─── */}
    <section className={`text-center ${mob?"pt-13 px-4 pb-10":"pt-24 px-6 pb-15"}`} style={{background:`linear-gradient(180deg,${C.tint} 0%,#fff 100%)`}}>
      <div className="max-w-225 mx-auto">
        <div className="inline-block py-1.5 px-3.5 bg-white rounded-full text-xs font-semibold text-brand tracking-wide uppercase border border-line-2 mb-5">
          {t("forEmployers.hero.badge")}</div>
        <h1 className={`${HERO_WIDE} mb-5 ${mob?"text-4xl":"text-6xl"}`}>
          {t("forEmployers.hero.title").split("\n").map((line, i) => <span key={i}>{line}{i === 0 && <br/>}</span>)}</h1>
        <p className={`text-text-2 leading-snug max-w-160 mx-auto mb-8 ${mob?"text-base":"text-lg"}`}>
          {t("forEmployers.hero.subtitle")}</p>
        <div className="flex gap-2.5 justify-center flex-wrap">
          {products.map(p=><button key={p.id} onClick={()=>_scrollTo(p.id)}
            className={`bg-white border-2 ${PRODUCT_TONE[p.id].border} ${PRODUCT_TONE[p.id].text} ${PRODUCT_TONE[p.id].invert} rounded-full font-semibold cursor-pointer transition-colors duration-150 text-sm ${mob?"py-2.5 px-4":"py-3 px-6"}`}>
            {t("forEmployers.hero.jumpBtn", {name: p.name})}</button>)}
        </div>
      </div>
    </section>

    {/* ─── Which product for you? ─── */}
    <section className={`bg-white ${mob?"py-10 px-4":"py-16 px-6"}`}>
      <div className="max-w-290 mx-auto">
        <div className="text-center mb-10">
          <h2 className={`${SECTION_CLS} mb-3 ${mob?"text-2xl":"text-4xl"}`}>{t("forEmployers.which.title")}</h2>
          <p className="text-text-3 max-w-150 mx-auto leading-snug" style={{fontSize:15.5}}>{t("forEmployers.which.subtitle")}</p>
        </div>
        <div className={`grid gap-4 ${mob?"grid-cols-1":"grid-cols-3"}`}>
          {products.map(p=><button key={p.id} onClick={()=>_scrollTo(p.id)}
            className={`bg-white border border-line ${PRODUCT_TONE[p.id].cardHover} rounded-2xl cursor-pointer text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-md relative ${mob?"p-6":"p-7"}`}>
            <div className={`text-xs font-bold ${PRODUCT_TONE[p.id].text} tracking-wide uppercase mb-3`}>{p.pill}</div>
            <div className="text-2xl font-bold text-text tracking-tight mb-1.5">{p.name}</div>
            <div className="text-sm text-text-2 font-medium mb-3.5 leading-snug">{p.tagline}</div>
            <div className="text-sm text-text-3 leading-relaxed">{p.pitch}</div>
            <div className={`mt-4 text-sm font-semibold ${PRODUCT_TONE[p.id].text} flex items-center gap-1.5`}>{t("forEmployers.which.learnMore")} <I n="chevR" s={15} w={2}/></div>
          </button>)}
        </div>
      </div>
    </section>

    {/* ─── Product 1: JOB PLATFORM ─── */}
    <section id="platform" className={`bg-bg border-y border-line ${mob?"py-14 px-4":"py-24 px-6"}`} style={{scrollMarginTop:80}}>
      <div className="max-w-290 mx-auto">
        <_ProductHeader color={C.brand} kicker={t("forEmployers.platform.kicker")} title={t("forEmployers.platform.title")}
          body={t("forEmployers.platform.body")}/>

        <div className={`grid gap-3.5 mb-13 ${mob?"grid-cols-1":"grid-cols-3"}`}>
          {[
            {ic:"target",t:t("forEmployers.platform.features.scoring.title"),b:t("forEmployers.platform.features.scoring.desc")},
            {ic:"activity",t:t("forEmployers.platform.features.pipeline.title"),b:t("forEmployers.platform.features.pipeline.desc")},
            {ic:"calendar",t:t("forEmployers.platform.features.interviews.title"),b:t("forEmployers.platform.features.interviews.desc")},
            {ic:"users",t:t("forEmployers.platform.features.talentPool.title"),b:t("forEmployers.platform.features.talentPool.desc")},
            {ic:"trend",t:t("forEmployers.platform.features.analytics.title"),b:t("forEmployers.platform.features.analytics.desc")},
            {ic:"shield",t:t("forEmployers.platform.features.compliance.title"),b:t("forEmployers.platform.features.compliance.desc")},
          ].map(f=><Card key={f.t} pad={22} style={{borderRadius:14}}>
            <div className="w-10 h-10 rounded-xl bg-tint text-brand flex items-center justify-center mb-3.5"><I n={f.ic} s={20}/></div>
            <div className="font-bold text-text tracking-tight mb-1.5" style={{fontSize:15.5}}>{f.t}</div>
            <div className="text-sm text-text-2 leading-relaxed">{f.b}</div>
          </Card>)}
        </div>

        <div className="text-center mb-8">
          <h3 className={`font-bold text-text tracking-tight mb-2.5 ${mob?"text-2xl":"text-3xl"}`}>{t("forEmployers.platform.pricingTitle")}</h3>
          <p className="text-sm text-text-3">{t("forEmployers.platform.pricingSubtitle")}</p>
        </div>

        <div className={`grid gap-3.5 mb-10 ${mob?"grid-cols-1":"grid-cols-3"}`}>
          {[t("forEmployers.platform.tiers.free"),t("forEmployers.platform.tiers.growth"),t("forEmployers.platform.tiers.enterprise")].map(tier=><Card key={tier.name} pad={mob?24:28} style={{borderRadius:16,position:"relative",border:tier===t("forEmployers.platform.tiers.growth")?`2px solid ${C.brand}`:`1px solid ${C.line}`,transform:tier===t("forEmployers.platform.tiers.growth")?"scale(1.02)":"none"}}>
            {tier===t("forEmployers.platform.tiers.growth")&&<div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-white py-1 px-3.5 rounded-full text-xs font-bold tracking-wide uppercase">{t("forEmployers.platform.mostPicked")}</div>}
            <div className="text-sm font-bold text-text-2 mb-2">{tier.name}</div>
            <div className="flex items-baseline gap-1.5 mb-1.5">
              <span className={`font-bold text-text tracking-tight ${mob?"text-4xl":"text-5xl"}`}>{tier.price}</span>
              <span className="text-sm text-text-3">{tier.per}</span>
            </div>
            <div className="text-sm text-text-3 mb-5 min-h-9">{tier.tagline}</div>
            <div className="flex flex-col gap-2 mb-6">
              {tier.features.map(f=><div key={f} className="flex gap-2 items-start text-sm text-text-2">
                <I n="check" s={16} c={C.ok}/><span>{f}</span></div>)}
            </div>
            <Btn kind={tier===t("forEmployers.platform.tiers.growth")?"primary":"ghost"} full
              onClick={()=>tier.name==="Enterprise"?A.go("contact"):(A.setPendingPlan(tier.name),A.go("signup"))}>{tier.cta}</Btn>
          </Card>)}
        </div>

        <_TestimonialStrip quotes={t("forEmployers.platform.testimonials")} color={C.brand}/>
      </div>
    </section>

    {/* ─── Product 2: HR SUITE ─── */}
    <section id="hrsuite" className={`bg-white ${mob?"py-14 px-4":"py-24 px-6"}`} style={{scrollMarginTop:80}}>
      <div className="max-w-290 mx-auto">
        <_ProductHeader color={C.violet} kicker={t("forEmployers.hrsuite.kicker")} title={t("forEmployers.hrsuite.title")}
          body={t("forEmployers.hrsuite.body")}/>

        <div className={`grid gap-3 mb-13 ${mob?"grid-cols-2":"grid-cols-4"}`}>
          {t("forEmployers.hrsuite.modules").map(m=><div key={m.t} className="py-3.5 px-4 bg-bg rounded-xl">
            <div className="text-sm font-bold text-violet mb-1">{m.t}</div>
            <div className="text-xs text-text-3 leading-snug">{m.b}</div>
          </div>)}
        </div>

        <div className="text-center mb-8">
          <h3 className={`font-bold text-text tracking-tight mb-2.5 ${mob?"text-2xl":"text-3xl"}`}>{t("forEmployers.hrsuite.waysTitle")}</h3>
        </div>

        <div className={`grid gap-3.5 mb-10 ${mob?"grid-cols-1":"grid-cols-2"}`}>
          {[t("forEmployers.hrsuite.tiers.bundled"),t("forEmployers.hrsuite.tiers.standalone")].map(tier=><Card key={tier.name} pad={mob?24:28} style={{borderRadius:16,position:"relative",border:tier===t("forEmployers.hrsuite.tiers.bundled")?`2px solid ${C.violet}`:`1px solid ${C.line}`}}>
            {tier===t("forEmployers.hrsuite.tiers.bundled")&&<div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet text-white py-1 px-3.5 rounded-full text-xs font-bold tracking-wide uppercase">{t("forEmployers.hrsuite.bestValue")}</div>}
            <div className="text-sm font-bold text-text-2 mb-2">{tier.name}</div>
            <div className="flex items-baseline gap-1.5 mb-1.5">
              <span className={`font-bold text-text tracking-tight ${mob?"text-3xl":"text-4xl"}`}>{tier.price}</span>
              <span className="text-sm text-text-3">{tier.per}</span>
            </div>
            <div className="text-sm text-text-3 mb-5 min-h-9">{tier.tagline}</div>
            <div className="flex flex-col gap-2 mb-6">
              {tier.features.map(f=><div key={f} className="flex gap-2 items-start text-sm text-text-2">
                <I n="check" s={16} c={C.violet}/><span>{f}</span></div>)}
            </div>
            <Btn kind={tier===t("forEmployers.hrsuite.tiers.bundled")?"primary":"ghost"} full onClick={tier===t("forEmployers.hrsuite.tiers.bundled")?()=>A.go("pricing"):()=>A.go("contact")}>{tier.cta}</Btn>
          </Card>)}
        </div>

        <_TestimonialStrip quotes={t("forEmployers.hrsuite.testimonials")} color={C.violet}/>
      </div>
    </section>

    {/* ─── Product 3: STAFFING ─── */}
    <section id="staffing" className={`bg-staffing-bg border-y border-staffing-line ${mob?"py-14 px-4":"py-24 px-6"}`} style={{scrollMarginTop:80}}>
      <div className="max-w-290 mx-auto">
        <_ProductHeader color={STAFFING_AMBER} kicker={t("forEmployers.staffing.kicker")} title={t("forEmployers.staffing.title")}
          body={t("forEmployers.staffing.body")}/>

        <div className={`grid gap-4 mb-13 ${mob?"grid-cols-1":"grid-cols-2"}`}>
          <Card pad={mob?22:28} style={{borderRadius:16,background:"#fff"}}>
            <div className="text-xs font-bold text-staffing tracking-wide uppercase mb-2.5">{t("forEmployers.staffing.contractTemp.label")}</div>
            <div className="text-2xl font-bold text-text tracking-tight mb-3">{t("forEmployers.staffing.contractTemp.title")}</div>
            <div className="text-sm text-text-2 leading-relaxed mb-4">
              {t("forEmployers.staffing.contractTemp.desc")}
            </div>
            <div className="p-3.5 bg-staffing-bg rounded-xl mb-4">
              <div className="text-xs font-semibold text-text-2 mb-2">{t("forEmployers.staffing.contractTemp.costLabel")}</div>
              <div className="text-xl font-bold text-staffing">{t("forEmployers.staffing.contractTemp.costValue")}</div>
              <div className="text-xs text-text-3 mt-1.5 leading-snug">{t("forEmployers.staffing.contractTemp.costDetail")}</div>
            </div>
            <div className="flex flex-col gap-2">
              {t("forEmployers.staffing.contractTemp.benefits").map(f=><div key={f} className="flex gap-2 items-start text-sm text-text-2">
                <I n="check" s={15} c={STAFFING_AMBER}/><span>{f}</span></div>)}
            </div>
          </Card>

          <Card pad={mob?22:28} style={{borderRadius:16,background:"#fff"}}>
            <div className="text-xs font-bold text-staffing tracking-wide uppercase mb-2.5">{t("forEmployers.staffing.permanentPlacement.label")}</div>
            <div className="text-2xl font-bold text-text tracking-tight mb-3">{t("forEmployers.staffing.permanentPlacement.title")}</div>
            <div className="text-sm text-text-2 leading-relaxed mb-4">
              {t("forEmployers.staffing.permanentPlacement.desc")}
            </div>
            <div className="p-3.5 bg-staffing-bg rounded-xl mb-4">
              <div className="text-xs font-semibold text-text-2 mb-2">{t("forEmployers.staffing.permanentPlacement.costLabel")}</div>
              <div className="text-xl font-bold text-staffing">{t("forEmployers.staffing.permanentPlacement.costValue")}</div>
              <div className="text-xs text-text-3 mt-1.5 leading-snug">{t("forEmployers.staffing.permanentPlacement.costDetail")}</div>
            </div>
            <div className="flex flex-col gap-2">
              {t("forEmployers.staffing.permanentPlacement.benefits").map(f=><div key={f} className="flex gap-2 items-start text-sm text-text-2">
                <I n="check" s={15} c={STAFFING_AMBER}/><span>{f}</span></div>)}
            </div>
          </Card>
        </div>

        <div className="text-center mb-8">
          <h3 className={`font-bold text-text tracking-tight mb-2.5 ${mob?"text-2xl":"text-3xl"}`}>{t("forEmployers.staffing.moneyTitle")}</h3>
          <p className="text-sm text-text-3">{t("forEmployers.staffing.moneySubtitle")}</p>
        </div>

        <Card pad={mob?22:32} style={{marginBottom:40,borderRadius:16,background:"#fff"}}>
          <div className={`grid gap-5 ${mob?"grid-cols-1":"grid-cols-3"}`}>
            {t("forEmployers.staffing.steps").map(s=><div key={s.step}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-staffing text-white flex items-center justify-center text-base font-bold">{s.step}</div>
                <div className="text-xs font-semibold text-staffing tracking-wide uppercase">{s.time}</div>
              </div>
              <div className="text-base font-bold text-text tracking-tight mb-1.5">{s.title}</div>
              <div className="text-sm text-text-2 leading-relaxed">{s.body}</div>
            </div>)}
          </div>
          <div className="mt-6 pt-6 border-t border-line text-sm text-text-3 text-center leading-relaxed">
            {t("forEmployers.staffing.cashGapNote").split("\n").map((line, i) => <span key={i}>{line}{i === 0 && <br/>}</span>)}
          </div>
        </Card>

        <_TestimonialStrip quotes={t("forEmployers.staffing.testimonials")} color={STAFFING_AMBER}/>

        <div className="mt-10 text-center">
          <Btn kind="primary" size="lg" onClick={()=>A.go("contact")} style={{background:STAFFING_AMBER,borderColor:STAFFING_AMBER}}>
            {t("forEmployers.staffing.talkBtn")}</Btn>
          <div className="text-xs text-text-3 mt-3">{t("forEmployers.staffing.dashboardText", {link: <button onClick={()=>A.user?.role==="employer"?A.go("empStaffing"):A.go("login")} className="bg-transparent border-0 p-0 text-staffing cursor-pointer text-xs font-semibold underline">{t("forEmployers.staffing.dashboardLink")}</button>})}</div>
        </div>
      </div>
    </section>

    {/* ─── Comparison table ─── */}
    <section className={`bg-bg ${mob?"py-14 px-4":"py-24 px-6"}`}>
      <div className="max-w-290 mx-auto">
        <div className="text-center mb-10">
          <h2 className={`${SECTION_CLS} mb-3 ${mob?"text-2xl":"text-4xl"}`}>{t("forEmployers.comparison.title")}</h2>
          <p className="text-sm text-text-3">{t("forEmployers.comparison.subtitle")}</p>
        </div>

        <Card pad={0} style={{borderRadius:16,overflow:"hidden"}}>
          <div className="overflow-x-auto"><table className="w-full border-collapse" style={{minWidth:680}}>
            <thead><tr className="bg-bg border-b-2 border-line">
              {t("forEmployers.comparison.headers").map((h, i) => <th key={i} className={`py-4 px-5 text-left text-xs font-bold ${i === 0 ? "text-text-3" : i === 1 ? "text-brand" : i === 2 ? "text-violet" : "text-staffing"} ${i === 0 ? "tracking-wide uppercase" : "text-sm tracking-tight"}`}>{h}</th>)}
            </tr></thead>
            <tbody>{t("forEmployers.comparison.rows").map((row,i)=><tr key={i} className="border-b border-line-soft">
              {row.map((cell, j) => <td key={j} className={`py-3.5 px-5 text-sm ${j === 0 ? "text-text-3 font-semibold" : "text-text"}`}>{cell}</td>)}
            </tr>)}</tbody>
          </table></div>
        </Card>
      </div>
    </section>

    {/* ─── FAQ ─── */}
    <section className={`bg-white ${mob?"py-14 px-4":"py-24 px-6"}`}>
      <div className="max-w-205 mx-auto">
        <div className="text-center mb-10">
          <h2 className={`${SECTION_CLS} mb-3 ${mob?"text-2xl":"text-4xl"}`}>{t("forEmployers.faq.title")}</h2>
        </div>
        {t("forEmployers.faq.items").map(({q,a},i)=><div key={i} className="border-b border-line py-5">
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
        <h2 className={`font-bold tracking-tight mb-4 text-white ${mob?"text-3xl":"text-5xl"}`}>{t("forEmployers.cta.title")}</h2>
        <p className={`text-white/70 leading-snug mb-8 ${mob?"text-sm":"text-lg"}`}>
          {t("forEmployers.cta.subtitle")}</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Btn kind="primary" size="lg" onClick={()=>A.go("signup")}>{t("forEmployers.cta.startBtn")}</Btn>
          <Btn kind="ghost" size="lg" onClick={()=>A.go("contact")} style={{background:"rgba(255,255,255,.08)",color:"#fff",borderColor:"rgba(255,255,255,.2)"}}>{t("forEmployers.cta.demoBtn")}</Btn>
          <Btn kind="ghost" size="lg" onClick={()=>A.go("howItWorks")} style={{background:"transparent",color:"#fff",borderColor:"rgba(255,255,255,.2)"}}>{t("forEmployers.cta.howItWorksBtn")}</Btn>
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
  const { t } = useTranslation();
  const [track,setTrack]=useState("seeker");

  const tracks={
    /* Every step below carries a real product screenshot captured from the live app (a full-page
       Playwright capture at 1440×900). Not marketing-produced mockups: this is what the reader
       actually sees when they sign in, so a step's copy and its image can't drift. */
    seeker:{
      label:t("howItWorks.seeker.label"),color:C.brand,
      steps:t("howItWorks.seeker.steps")
    },
    employer:{
      label:t("howItWorks.employer.label"),color:C.violet,
      steps:t("howItWorks.employer.steps")
    },
    staffing:{
      label:t("howItWorks.staffing.label"),color:STAFFING_AMBER,
      steps:t("howItWorks.staffing.steps")
    },
  };
  const trk=tracks[track]; const tone=TRACK_TONE[track];

  return <div className="bg-white">
    <section className={`text-center ${mob?"pt-13 px-4 pb-10":"pt-22 px-6 pb-15"}`} style={{background:`linear-gradient(180deg,${C.tint} 0%,#fff 100%)`}}>
      <div className="max-w-205 mx-auto">
        <div className="inline-block py-1.5 px-3.5 bg-white rounded-full text-xs font-semibold text-brand tracking-wide uppercase border border-line-2 mb-5">
          {t("howItWorks.hero.badge")}</div>
        <h1 className={`${HERO_WIDE} mb-5 ${mob?"text-4xl":"text-6xl"}`}>
          {t("howItWorks.hero.title")}</h1>
        <p className={`text-text-2 leading-snug max-w-150 mx-auto mb-8 ${mob?"text-base":"text-lg"}`}>
          {t("howItWorks.hero.subtitle")}</p>
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
          {trk.steps.map((s,i)=><div key={i} className={`flex mb-8 items-start ${mob?"gap-3.5":"gap-6"}`}>
            <div className={`w-12 h-12 rounded-full ${tone.bgOnly} text-white flex items-center justify-center text-lg font-bold shrink-0 z-1 relative`}>{i+1}</div>
            <div className={`flex-1 ${mob?"":"pb-2"} min-w-0`}>
              <div className={`font-bold text-text tracking-tight mb-2 ${mob?"text-lg":"text-2xl"}`}>{s.t}</div>
              <div className="text-base text-text-2 leading-relaxed mb-2.5">{s.b}</div>
              <div className={`text-sm text-text-3 leading-snug py-3 px-3.5 bg-bg rounded-xl border-l-4 ${tone.borderOnly} mb-4`}>{s.detail}</div>
              {/* Real product screenshot for this step. Full-page captures are tall (7000+ px in
                  places), so we cap the visible portion at the top-of-page frame - what a reader
                  cares about here is "does this actually look like the screen I'd land on" - and
                  offer the whole thing on click via loading=lazy + a border/shadow that reads as
                  a real UI object, not a lifestyle photo. Alt text describes the state shown so
                  a screen-reader user gets the same information. */}
              {s.img&&<a href={s.img} target="_blank" rel="noopener" className="block rounded-2xl overflow-hidden border border-line bg-white shadow-sm hover:shadow-md transition-shadow duration-150 max-h-100" title="Open full screenshot in a new tab">
                <img src={s.img} alt={s.alt} loading="lazy" width="1440" className="block w-full h-auto"/>
              </a>}
            </div>
          </div>)}
        </div>

        <div className={`mt-15 bg-bg rounded-2xl text-center ${mob?"py-6 px-5":"py-9 px-10"}`}>
          <div className={`font-bold text-text tracking-tight mb-2.5 ${mob?"text-lg":"text-2xl"}`}>
            {track==="seeker"?t("howItWorks.seeker.cta"):track==="employer"?t("howItWorks.employer.cta"):t("howItWorks.staffing.cta")}</div>
          <div className="text-sm text-text-3 mb-5">
            {track==="seeker"?t("howItWorks.seeker.ctaSubtitle"):track==="employer"?t("howItWorks.employer.ctaSubtitle"):t("howItWorks.staffing.ctaSubtitle")}</div>
          <div className="flex gap-2.5 justify-center flex-wrap">
            <Btn kind="primary" onClick={()=>track==="seeker"?A.go("signup"):track==="employer"?A.go("signup"):A.go("contact")} style={{background:trk.color,borderColor:trk.color}}>
              {track==="seeker"?t("howItWorks.seeker.ctaBtn"):track==="employer"?t("howItWorks.employer.ctaBtn"):t("howItWorks.staffing.ctaBtn")}</Btn>
            <Btn kind="ghost" onClick={()=>A.go("forEmployers")}>{t("howItWorks.allProducts")}</Btn>
          </div>
        </div>
      </div>
    </section>
  </div>;
}
