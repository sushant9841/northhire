import { use } from "../store/context.js";
import { C } from "../design/tokens.js";
import { I } from "../design/icons.jsx";
import { ROUTES, TABS_BY_ROLE } from "../routes.js";

export function TabBar(){
  const A=use();
  const role=A.user?.role||"guest";
  const tabs=TABS_BY_ROLE[role];
  const cur=(ROUTES[A.pg]||{}).tab;
  return <nav style={{position:"sticky",bottom:0,zIndex:400,background:"rgba(255,255,255,.97)",backdropFilter:"blur(14px)",
    borderTop:`1px solid ${C.line}`,display:"flex",flexShrink:0,paddingBottom:"env(safe-area-inset-bottom)"}}>
    {tabs.map(([pg,label,icon])=>{
      const on=A.pg===pg||(ROUTES[pg]?.tab&&ROUTES[pg].tab===cur);
      const n=A.tabBadges[pg]||0;
      return <button key={pg} onClick={()=>A.go(pg)} style={{flex:1,background:"none",border:"none",cursor:"pointer",
        fontFamily:"inherit",padding:"9px 2px 7px",display:"flex",flexDirection:"column",alignItems:"center",gap:4,
        color:on?C.brand:C.text3,transition:"color .16s"}}>
        <span style={{position:"relative",display:"flex",transform:on?"translateY(-1px)":"none",transition:"transform .18s"}}>
          <I n={icon} s={22} w={on?2.15:1.75}/>
          {n>0&&<span style={{position:"absolute",top:-5,right:-9,minWidth:16,height:16,padding:"0 4px",borderRadius:99,
            background:C.brand,color:"#fff",fontSize:9.5,fontWeight:700,display:"flex",alignItems:"center",
            justifyContent:"center",border:"2px solid #fff"}}>{n}</span>}</span>
        <span style={{fontSize:10.5,fontWeight:on?650:520,letterSpacing:"-.01em"}}>{label}</span></button>;})}
  </nav>;
}
