import { useState } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C } from "../../design/tokens.js";
import { Btn, Tag, Sel, Empty, usePagination, Pagination, HERO_TIGHT } from "../../design/primitives.jsx";
import { JobCard } from "../shared/cards.jsx";
import { useTranslation } from "../../i18n/i18n.jsx";

export function SavedPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const {t}=useTranslation();
  /* Saved jobs had no sort of their own and no way to switch to a denser list - fine at three
     bookmarks, poor at thirty, which is exactly when someone is comparing them. */
  const [sort,setSort]=useState("recent");
  const [view,setView]=useState("grid");
  const list=[...A.jobs.filter(j=>A.saved.has(j.id))].sort((a,b)=>
    sort==="pay"?(b.hi||b.lo||0)-(a.hi||a.lo||0)
    :sort==="closing"?((a.dl??999)-(b.dl??999))
    :sort==="title"?a.t.localeCompare(b.t)
    :(b.createdAt||0)-(a.createdAt||0));
  const pg=usePagination(list,20);
  const heroPad=mob?"py-11 px-4":"py-18 px-8";
  return <div className="bg-white min-h-full">
    <section className={`${heroPad} bg-white border-b border-line-soft`}>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-end gap-5 flex-wrap">
          <div><Tag tone="brand" icon="bookmark">{t("seeker.saved.savedTag")}</Tag>
            <h1 className={`${HERO_TIGHT} mt-5 mb-3 ${mob?"text-3xl":"text-5xl"}`}>
              {t("seeker.saved.heroTitle")}</h1>
            <p className={`text-text-2 leading-normal max-w-xl ${mob?"text-base":"text-lg"}`}>
              {t(list.length===1?"seeker.saved.jobsSavedOne":"seeker.saved.jobsSavedOther",{count:list.length})}</p></div>
          <div className="flex gap-2.5 items-center flex-wrap">
            {list.length>1&&<>
              <Sel value={sort} onChange={e=>setSort(e.target.value)} style={{width:170}} aria-label={t("seeker.saved.sortAria")}>
                <option value="recent">{t("seeker.saved.sortRecent")}</option>
                <option value="pay">{t("seeker.saved.sortPay")}</option>
                <option value="closing">{t("seeker.saved.sortClosing")}</option>
                <option value="title">{t("seeker.saved.sortTitle")}</option>
              </Sel>
              <div className="flex border border-line rounded-lg overflow-hidden" role="group" aria-label={t("seeker.saved.viewModeAria")}>
                {[["grid",t("seeker.saved.viewGrid")],["list",t("seeker.saved.viewList")]].map(([k,l])=>
                  <button key={k} type="button" onClick={()=>setView(k)} aria-pressed={view===k}
                    className={`text-sm font-medium py-2 px-3 cursor-pointer border-0 transition-colors duration-150 ${view===k?"bg-brand text-white":"bg-white text-text-2 hover:bg-bg"}`}>{l}</button>)}
              </div>
            </>}
            <Btn kind="outline" icon="search" onClick={()=>A.go("savedSearches")}>{t("seeker.saved.savedSearchesBtn",{count:A.savedSearches.filter(s=>s.user===A.user?.id).length})}</Btn>
          </div></div>
      </div>
    </section>
    <section className={`bg-bg min-h-100 ${mob?"pt-8 px-4 pb-14":"pt-12 px-8 pb-24"}`}>
      <div className="max-w-6xl mx-auto">
        {list.length===0?<Empty icon="bookmark" title={t("seeker.saved.nothingSavedTitle")}
          body={t("seeker.saved.nothingSavedBody")}
          action={<Btn kind="primary" onClick={()=>A.go("search")}>{t("seeker.saved.browseJobsBtn")}</Btn>}/>
          :<><div className="grid gap-4" style={{gridTemplateColumns:view==="list"?"1fr":`repeat(auto-fill,minmax(${mob?260:320}px,1fr))`}}>
            {pg.pageItems.map(j=><JobCard key={j.id} job={j}/>)}</div>
            <Pagination {...pg}/></>}
      </div>
    </section>
  </div>;
}
