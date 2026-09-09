import { use } from "../store/context.js";
import { useMedia } from "../helpers/hooks.js";
import { C } from "../design/tokens.js";
import { I } from "../design/icons.jsx";
import { CATS } from "../store/seed/constants.js";
import { SEED_AGENCY_LICENSE } from "../store/seed/agency.js";
import { Wordmark } from "./Header.jsx";

export function Footer(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const cols=[
    {h:"Job seekers",links:[["Browse all jobs",()=>A.go("search")],["Matched for you",()=>A.go("matched")],["My applications",()=>A.go("status")],["Saved jobs",()=>A.go("saved")],["Build a CV",()=>A.go("cvs")],["Trainings",()=>A.go("trainings")]]},
    {h:"For employers",links:[["Why NorthHire",()=>A.go("forEmployers")],["Pricing plans",()=>A.go("pricing")],["How it works",()=>A.go("howItWorks")],["Browse employers",()=>A.go("employers")],["Employer sign in",()=>A.go("login")],["HR Suite sign in",()=>A.go("hrLogin")]]},
    {h:"For staffing",links:[
      ["Overview",()=>{if(typeof window!=="undefined")window.location.hash="staffing"; A.go("forEmployers");}],
      ["How it works",()=>A.go("howItWorks")],
      ["Book a demo",()=>A.go("contact")],
      ["Worker & client sign in",()=>A.go("login")],
      ["Agency staff sign in",()=>A.go("agencyLogin")],
    ]},
    {h:"Explore",links:CATS.slice(0,6).map(c=>[c.label,()=>{A.setSearch({q:"",where:"",cats:[c.id]});A.go("search");}])},
    {h:"Company",links:[["About us",()=>A.go("about")],["How it works",()=>A.go("howItWorks")],["Contact us",()=>A.go("contact")],["Career resources",()=>A.go("blogs")],["How matching works",()=>A.go("matchScore")],["Privacy policy",()=>A.go("privacy")],["Terms of service",()=>A.go("terms")]]},
  ];
  return <footer className="bg-ink text-white mt-auto shrink-0">
    <div className={`max-w-site mx-auto ${mob?"pt-9 px-4 pb-6":"pt-13 px-7 pb-8"}`}>
      <div className={`grid gap-7 ${mob?"grid-cols-1":"grid-cols-[1.3fr_repeat(5,1fr)]"}`}>
        <div>
          <Wordmark light size={20}/>
          <p className="text-sm text-white/55 leading-relaxed mt-4 mb-5 max-w-xs">
            Canada's job platform for every kind of work. Trades, care, transport, kitchens, warehouses and offices, with real pay published on every listing.</p>
          <div className="flex gap-2.5">
            {["linkedin","facebook","twitter"].map(s=>
              <span key={s} title="Coming soon" className="w-10 h-10 rounded-xl bg-white/9 border border-white/14 text-white/75 flex items-center justify-center"><I n={s} s={17}/></span>)}</div>
        </div>
        {cols.map(col=><div key={col.h}>
          <div className="text-xs font-bold tracking-wider uppercase text-white/45 mb-3.5">{col.h}</div>
          <div className="flex flex-col gap-3">
            {col.links.map(([l,fn])=><button key={l} onClick={fn} className="bg-transparent border-0 p-0 text-left cursor-pointer text-sm text-white/68 transition-colors duration-150 hover:text-white">{l}</button>)}
          </div></div>)}
      </div>
      <div className={`border-t border-white/11 pt-6 flex justify-between gap-3.5 flex-wrap items-center ${mob?"mt-7":"mt-11"}`}>
        <div className="flex flex-col gap-1">
          <span className="text-sm text-white/40">© 2026 NorthHire Technologies Inc. Built in Canada.</span>
          <span className="text-xs text-white/32 font-mono">NorthHire Staffing · Ontario THA licence {SEED_AGENCY_LICENSE}</span>
        </div>
        <div className="flex gap-5 flex-wrap">
          <button onClick={()=>A.go("accessibility")} className="bg-transparent border-0 p-0 cursor-pointer text-sm text-white/40 transition-colors duration-150 hover:text-white">Accessibility (AODA)</button>
          <button onClick={()=>A.go("pipeda")} className="bg-transparent border-0 p-0 cursor-pointer text-sm text-white/40 transition-colors duration-150 hover:text-white">PIPEDA compliant</button>
          <button onClick={()=>A.go("credits")} className="bg-transparent border-0 p-0 cursor-pointer text-sm text-white/40 transition-colors duration-150 hover:text-white">Open-source credits</button>
          <span className="text-sm text-white/40">English (CA)</span>
          <span className="w-px h-4 bg-white/14 hidden sm:inline-block"/>
          <a href="https://claude.ai/code/artifact/8a33ba65-c63c-4e7c-8785-6ff9f67874b0" target="_blank" rel="noopener noreferrer" className="text-sm text-white/40 transition-colors duration-150 hover:text-white">Fix Tracker ↗</a>
          <a href="https://claude.ai/code/artifact/12bf8761-350d-4ce4-8aaf-2fabe4d15552" target="_blank" rel="noopener noreferrer" className="text-sm text-white/40 transition-colors duration-150 hover:text-white">Compliance Register ↗</a>
          </div></div>
    </div></footer>;
}
