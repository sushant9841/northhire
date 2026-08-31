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
    {h:"Company",links:[["About us",()=>A.go("about")],["How it works",()=>A.go("howItWorks")],["Contact us",()=>A.go("contact")],["Career resources",()=>A.go("blogs")],["Privacy policy",()=>A.go("privacy")],["Terms of service",()=>A.go("terms")]]},
  ];
  return <footer style={{background:C.ink,color:"#fff",marginTop:"auto",flexShrink:0}}>
    <div style={{maxWidth:1240,margin:"0 auto",padding:mob?"34px 16px 24px":"52px 28px 32px"}}>
      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1.3fr repeat(5,1fr)",gap:mob?28:28}}>
        <div>
          <Wordmark light size={20}/>
          <p style={{fontSize:14,color:"rgba(255,255,255,.55)",lineHeight:1.7,margin:"16px 0 20px",maxWidth:300}}>
            Canada's job platform for every kind of work. Trades, care, transport, kitchens, warehouses and offices, with real pay published on every listing.</p>
          <div style={{display:"flex",gap:9}}>
            {["linkedin","facebook","twitter"].map(s=>
              <a key={s} href="#" onClick={e=>e.preventDefault()} aria-label={s} style={{width:38,height:38,borderRadius:10,
                background:"rgba(255,255,255,.09)",border:"1px solid rgba(255,255,255,.14)",color:"rgba(255,255,255,.75)",
                display:"flex",alignItems:"center",justifyContent:"center",textDecoration:"none"}}><I n={s} s={17}/></a>)}</div>
        </div>
        {cols.map(col=><div key={col.h}>
          <div style={{fontSize:12.5,fontWeight:700,letterSpacing:".06em",textTransform:"uppercase",
            color:"rgba(255,255,255,.45)",marginBottom:14}}>{col.h}</div>
          <div style={{display:"flex",flexDirection:"column",gap:11}}>
            {col.links.map(([l,fn])=><button key={l} onClick={fn} style={{background:"none",border:"none",padding:0,
              textAlign:"left",cursor:"pointer",fontFamily:"inherit",fontSize:14,color:"rgba(255,255,255,.68)",transition:"color .16s"}}
              onMouseEnter={e=>e.currentTarget.style.color="#fff"} onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,.68)"}>{l}</button>)}
          </div></div>)}
      </div>
      <div style={{borderTop:"1px solid rgba(255,255,255,.11)",marginTop:mob?28:42,paddingTop:22,display:"flex",
        justifyContent:"space-between",gap:14,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          <span style={{fontSize:13,color:"rgba(255,255,255,.4)"}}>© 2026 NorthHire Technologies Inc. Built in Canada.</span>
          <span style={{fontSize:11.5,color:"rgba(255,255,255,.32)",fontFamily:"ui-monospace,SFMono-Regular,monospace"}}>NorthHire Staffing · Ontario THA licence {SEED_AGENCY_LICENSE}</span>
        </div>
        <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
          <button onClick={()=>A.go("accessibility")} style={{background:"none",border:"none",padding:0,cursor:"pointer",fontFamily:"inherit",fontSize:13,color:"rgba(255,255,255,.4)",transition:"color .16s"}} onMouseEnter={e=>e.currentTarget.style.color="#fff"} onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,.4)"}>Accessibility (AODA)</button>
          <button onClick={()=>A.go("pipeda")} style={{background:"none",border:"none",padding:0,cursor:"pointer",fontFamily:"inherit",fontSize:13,color:"rgba(255,255,255,.4)",transition:"color .16s"}} onMouseEnter={e=>e.currentTarget.style.color="#fff"} onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,.4)"}>PIPEDA compliant</button>
          <span style={{fontSize:13,color:"rgba(255,255,255,.4)"}}>English (CA)</span></div></div>
    </div></footer>;
}
