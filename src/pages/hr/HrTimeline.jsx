import { useState, useEffect, useCallback } from "react";
import { use } from "../../store/context.js";
import { C } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn } from "../../design/primitives.jsx";
import { useTranslation } from "../../i18n/i18n.jsx";

/* HR Suite Tranche H4 - Employee Profile timeline aggregator (HA-02). Pulls role changes,
   department moves, salary changes (server already strips these out for a viewer who isn't
   allowed to see salary - see canViewSalary in server/routes/hr.js), leave events and training
   completions into one chronological feed. Paginated + lazy-loaded per the transformation plan's
   risk note ("timeline aggregates from many tables - pagination + lazy load") rather than
   fetching an unbounded history up front. */
const KIND_META={
  role_change:{icon:"shield",tone:C.brand},
  dept_change:{icon:"building",tone:C.brand},
  salary_change:{icon:"wallet",tone:C.warn},
  badge_awarded:{icon:"award",tone:C.ok},
  badge_removed:{icon:"award",tone:C.text3},
  leave:{icon:"calendar",tone:C.warn},
  training_completed:{icon:"cap",tone:C.ok},
  employee_erased:{icon:"trash",tone:C.danger},
  document_uploaded:{icon:"file",tone:C.text3},
  document_removed:{icon:"file",tone:C.text3},
  profile_sync_enabled:{icon:"sparkle",tone:C.brand},
  profile_sync_disabled:{icon:"sparkle",tone:C.text3},
};
const PAGE_SIZE=15;

export function HrTimeline({empId}){
  const A=use(); const {t,locale}=useTranslation();
  const [entries,setEntries]=useState([]);
  const [total,setTotal]=useState(null);
  const [nextOffset,setNextOffset]=useState(0);
  const [loading,setLoading]=useState(false);
  const [initialLoaded,setInitialLoaded]=useState(false);

  const loadPage=useCallback(async(offset)=>{
    setLoading(true);
    const r=await A.hrLoadEmployeeTimeline(empId,{limit:PAGE_SIZE,offset});
    setEntries(prev=>offset===0?(r.entries||[]):[...prev,...(r.entries||[])]);
    setTotal(r.total??0);
    setNextOffset(r.nextOffset);
    setLoading(false); setInitialLoaded(true);
  },[A,empId]);

  useEffect(()=>{ setEntries([]); setTotal(null); setNextOffset(0); setInitialLoaded(false); loadPage(0); /* eslint-disable-next-line */ },[empId]);

  if(!initialLoaded)return <div className="text-sm text-text-3 py-3">{t("hr.timeline.loading")}</div>;
  if(entries.length===0)return <div className="text-sm text-text-3 py-3">{t("hr.timeline.empty")}</div>;

  return <div>
    <div className="flex flex-col gap-0">
      {entries.map((e,i)=>{const meta=KIND_META[e.kind]||{icon:"activity",tone:C.text3};
        return <div key={e.id} className="flex gap-3 relative pb-4">
          {i<entries.length-1&&<div className="absolute left-4 top-9 bottom-0 w-px" style={{background:C.line}}/>}
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 z-10" style={{background:`${meta.tone}18`,color:meta.tone}}>
            <I n={meta.icon} s={15}/></div>
          <div className="flex-1 min-w-0 pt-1">
            <div className="text-sm text-text leading-snug">{e.label}</div>
            <div className="text-xs text-text-3 mt-0.5">{new Date(e.at).toLocaleDateString(locale==="fr"?"fr-CA":"en-CA",{year:"numeric",month:"long",day:"numeric"})}</div>
          </div>
        </div>;})}
    </div>
    {nextOffset!=null&&<Btn kind="ghost" size="sm" full disabled={loading} onClick={()=>loadPage(nextOffset)}>
      {loading?t("hr.timeline.loadingMore"):t("hr.timeline.loadMore",{n:total-entries.length})}</Btn>}
  </div>;
}
