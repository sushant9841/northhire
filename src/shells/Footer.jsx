import { use } from "../store/context.js";
import { useMedia } from "../helpers/hooks.js";
import { C } from "../design/tokens.js";
import { I } from "../design/icons.jsx";
import { CATS } from "../store/seed/constants.js";
import { SEED_AGENCY_LICENSE } from "../store/seed/agency.js";
import { Wordmark } from "./Header.jsx";
import { useTranslation } from "../i18n/i18n.jsx";

export function Footer(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const {t,locale,setLocale}=useTranslation();
  const chooseLocale=next=>{setLocale(next); if(A.setUserLocale)A.setUserLocale(next);};
  const cols=[
    {h:t("footer.jobSeekers"),links:[[t("footer.browseAllJobs"),()=>A.go("search")],[t("footer.matchedForYou"),()=>A.go("matched")],[t("footer.myApplications"),()=>A.go("status")],[t("footer.savedJobs"),()=>A.go("saved")],[t("footer.buildCv"),()=>A.go("cvs")],[t("nav.trainings"),()=>A.go("trainings")]]},
    {h:t("footer.forEmployers"),links:[[t("footer.whyNorthHire"),()=>A.go("forEmployers")],[t("footer.pricingPlans"),()=>A.go("pricing")],[t("footer.howItWorks"),()=>A.go("howItWorks")],[t("footer.browseEmployers"),()=>A.go("employers")],[t("footer.employerSignIn"),()=>A.go("login")],[t("footer.hrSuiteSignIn"),()=>A.go("hrLogin")]]},
    {h:t("footer.forStaffing"),links:[
      [t("footer.staffingOverview"),()=>{if(typeof window!=="undefined")window.location.hash="staffing"; A.go("forEmployers");}],
      [t("footer.howItWorks"),()=>A.go("howItWorks")],
      [t("footer.bookADemo"),()=>A.go("contact")],
      [t("footer.workerClientSignIn"),()=>A.go("login")],
      [t("footer.agencyStaffSignIn"),()=>A.go("agencyLogin")],
    ]},
    {h:t("footer.explore"),links:CATS.slice(0,6).map(c=>[c.label,()=>{A.setSearch({q:"",where:"",cats:[c.id]});A.go("search");}])},
    {h:t("footer.company"),links:[[t("footer.aboutUs"),()=>A.go("about")],[t("footer.howItWorks"),()=>A.go("howItWorks")],[t("footer.contactUs"),()=>A.go("contact")],[t("footer.careerResources"),()=>A.go("blogs")],[t("footer.howMatchingWorks"),()=>A.go("matchScore")],[t("footer.privacyPolicy"),()=>A.go("privacy")],[t("footer.termsOfService"),()=>A.go("terms")]]},
  ];
  return <footer className="bg-ink text-white mt-auto shrink-0">
    <div className={`max-w-site mx-auto ${mob?"pt-9 px-4 pb-6":"pt-13 px-7 pb-8"}`}>
      <div className={`grid gap-7 ${mob?"grid-cols-1":"grid-cols-[1.3fr_repeat(5,1fr)]"}`}>
        <div>
          <Wordmark light size={20}/>
          <p className="text-sm text-white/55 leading-relaxed mt-4 mb-5 max-w-xs">{t("footer.tagline")}</p>
          <div className="flex gap-2.5">
            {["linkedin","facebook","twitter"].map(s=>
              <span key={s} title={t("footer.comingSoon")} className="w-10 h-10 rounded-xl bg-white/9 border border-white/14 text-white/75 flex items-center justify-center"><I n={s} s={17}/></span>)}</div>
        </div>
        {cols.map(col=><div key={col.h}>
          <div className="text-xs font-bold tracking-wider uppercase text-white/45 mb-3.5">{col.h}</div>
          <div className="flex flex-col gap-3">
            {col.links.map(([l,fn])=><button key={l} onClick={fn} className="bg-transparent border-0 p-0 text-left cursor-pointer text-sm text-white/68 transition-colors duration-150 hover:text-white">{l}</button>)}
          </div></div>)}
      </div>
      <div className={`border-t border-white/11 pt-6 flex justify-between gap-3.5 flex-wrap items-center ${mob?"mt-7":"mt-11"}`}>
        <div className="flex flex-col gap-1">
          <span className="text-sm text-white/40">{t("footer.copyright")}</span>
          <span className="text-xs text-white/32 font-mono">NorthHire Staffing · Ontario THA licence {SEED_AGENCY_LICENSE}</span>
        </div>
        <div className="flex gap-5 flex-wrap">
          <button onClick={()=>A.go("accessibility")} className="bg-transparent border-0 p-0 cursor-pointer text-sm text-white/40 transition-colors duration-150 hover:text-white">{t("footer.accessibility")}</button>
          <button onClick={()=>A.go("pipeda")} className="bg-transparent border-0 p-0 cursor-pointer text-sm text-white/40 transition-colors duration-150 hover:text-white">{t("footer.pipeda")}</button>
          <button onClick={()=>A.go("credits")} className="bg-transparent border-0 p-0 cursor-pointer text-sm text-white/40 transition-colors duration-150 hover:text-white">{t("footer.credits")}</button>
          {/* Bill 96: a working language switch, not just a static "English (CA)" label. */}
          <div className="flex items-center gap-1.5" role="group" aria-label={t("account.language")}>
            <button onClick={()=>chooseLocale("en-CA")} className={`bg-transparent border-0 p-0 cursor-pointer text-sm transition-colors duration-150 ${locale==="en-CA"?"text-white font-semibold":"text-white/40 hover:text-white"}`}>English (CA)</button>
            <span className="text-white/30 text-sm">/</span>
            <button onClick={()=>chooseLocale("fr-CA")} className={`bg-transparent border-0 p-0 cursor-pointer text-sm transition-colors duration-150 ${locale==="fr-CA"?"text-white font-semibold":"text-white/40 hover:text-white"}`}>Français (QC)</button>
          </div>
          <span className="w-px h-4 bg-white/14 hidden sm:inline-block"/>
          <a href="https://claude.ai/code/artifact/8a33ba65-c63c-4e7c-8785-6ff9f67874b0" target="_blank" rel="noopener noreferrer" className="text-sm text-white/40 transition-colors duration-150 hover:text-white">{t("footer.fixTracker")} ↗</a>
          <a href="https://claude.ai/code/artifact/12bf8761-350d-4ce4-8aaf-2fabe4d15552" target="_blank" rel="noopener noreferrer" className="text-sm text-white/40 transition-colors duration-150 hover:text-white">{t("footer.complianceRegister")} ↗</a>
          </div></div>
    </div></footer>;
}
