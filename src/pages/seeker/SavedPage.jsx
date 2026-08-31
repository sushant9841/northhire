import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C } from "../../design/tokens.js";
import { Btn, Tag, Empty } from "../../design/primitives.jsx";
import { JobCard } from "../shared/cards.jsx";

export function SavedPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const list=A.jobs.filter(j=>A.saved.has(j.id));
  const pad=mob?"44px 16px":"72px 32px";
  return <div style={{background:"#fff",minHeight:"100%"}}>
    <section style={{padding:pad,background:"#fff",borderBottom:`1px solid ${C.lineSoft}`}}>
      <div style={{maxWidth:1120,margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",gap:20,flexWrap:"wrap"}}>
          <div><Tag tone="brand" icon="bookmark">Saved</Tag>
            <h1 style={{fontSize:mob?32:52,fontWeight:770,letterSpacing:"-.045em",color:C.text,margin:"18px 0 12px",lineHeight:1.08}}>
              Your bookmarked jobs.</h1>
            <p style={{fontSize:mob?16:19,color:C.text2,lineHeight:1.55,margin:0,maxWidth:560}}>
              {list.length} job{list.length===1?"":"s"} saved. Kept on every device.</p></div>
          <Btn kind="outline" icon="search" onClick={()=>A.go("savedSearches")}>Saved searches ({A.savedSearches.filter(s=>s.user===A.user?.id).length})</Btn></div>
      </div>
    </section>
    <section style={{padding:mob?"32px 16px 56px":"48px 32px 96px",background:C.bg,minHeight:400}}>
      <div style={{maxWidth:1120,margin:"0 auto"}}>
        {list.length===0?<Empty icon="bookmark" title="Nothing saved yet"
          body="Tap the bookmark on any listing and it is kept here."
          action={<Btn kind="primary" onClick={()=>A.go("search")}>Browse jobs</Btn>}/>
          :<div style={{display:"grid",gridTemplateColumns:`repeat(auto-fill,minmax(${mob?260:320}px,1fr))`,gap:16}}>
            {list.map(j=><JobCard key={j.id} job={j}/>)}</div>}
      </div>
    </section>
  </div>;
}
