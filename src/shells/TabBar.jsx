import { use } from "../store/context.js";
import { C } from "../design/tokens.js";
import { I } from "../design/icons.jsx";
import { ROUTES, TABS_BY_ROLE } from "../routes.js";
import { useTranslation } from "../i18n/i18n.jsx";

export function TabBar(){
  const A=use(); const {t}=useTranslation();
  const role=A.user?.role||"guest";
  const tabs=TABS_BY_ROLE[role];
  const cur=(ROUTES[A.pg]||{}).tab;
  return <nav className="sticky bottom-0 z-400 bg-white/97 backdrop-blur-lg border-t border-line flex shrink-0" style={{paddingBottom:"env(safe-area-inset-bottom)"}}>
    {tabs.map(([pg,labelKey,icon])=>{
      const on=A.pg===pg||(ROUTES[pg]?.tab&&ROUTES[pg].tab===cur);
      const n=A.tabBadges[pg]||0;
      return <button key={pg} onClick={()=>A.go(pg)} className={`flex-1 bg-transparent border-0 cursor-pointer pt-2.5 px-0.5 pb-2 flex flex-col items-center gap-1 transition-colors duration-150 ${on?"text-brand":"text-text-3"}`}>
        <span className={`relative flex transition-transform duration-200 ${on?"-translate-y-px":""}`}>
          <I n={icon} s={22} w={on?2.15:1.75}/>
          {n>0&&<span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center border-2 border-white">{n}</span>}</span>
        <span className={`text-xs ${on?"font-bold":"font-medium"}`}>{t(labelKey)}</span></button>;})}
  </nav>;
}
