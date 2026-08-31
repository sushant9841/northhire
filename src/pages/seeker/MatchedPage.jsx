import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn, Tag, Ring, Empty } from "../../design/primitives.jsx";
import { pay, payUnit } from "../../helpers/utils.js";
import { CATS } from "../../store/seed/constants.js";
import { EmpMark } from "../shared/cards.jsx";

export function MatchedPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const list=A.jobs.filter(j=>j.status==="live").map(j=>({j,s:A.score(j)})).filter(x=>x.s>=50).sort((a,b)=>b.s-a.s);
  const strong=list.filter(x=>x.s>=75); const good=list.filter(x=>x.s>=50&&x.s<75);
  const pad=mob?"44px 16px":"72px 32px";
  const G=({title,sub,items})=>items.length===0?null:<section style={{marginBottom:36}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:20,gap:12,flexWrap:"wrap"}}>
      <div><h2 style={{fontSize:mob?22:26,fontWeight:730,letterSpacing:"-.03em",color:C.text,margin:"0 0 4px",lineHeight:1.2}}>{title}</h2>
        <p style={{fontSize:14,color:C.text2,margin:0}}>{sub}</p></div>
      <Tag tone="brand">{items.length} {items.length===1?"job":"jobs"}</Tag></div>
    <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:16}}>
      {items.map(({j,s})=>{const e=A.emp(j.e);
        return <div key={j.id} onClick={()=>A.openJob(j.id)} style={{background:"#fff",borderRadius:20,padding:mob?20:26,
          border:`1px solid ${C.line}`,cursor:"pointer",transition:"transform .2s,border-color .2s"}}
          onMouseEnter={ev=>{ev.currentTarget.style.transform="translateY(-4px)";ev.currentTarget.style.borderColor=C.line2;}}
          onMouseLeave={ev=>{ev.currentTarget.style.transform="none";ev.currentTarget.style.borderColor=C.line;}}>
          <div style={{display:"flex",gap:16,alignItems:"flex-start"}}>
            <EmpMark e={e} size={52}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:mob?16.5:18,fontWeight:680,color:C.text,letterSpacing:"-.02em",lineHeight:1.3}}>{j.t}</div>
              <div style={{fontSize:13.5,color:C.text2,marginTop:5}}>{e.name} • {j.city}, {j.prov}</div>
              <div style={{display:"flex",alignItems:"baseline",gap:6,marginTop:12}}>
                <span style={{fontSize:mob?17:19,fontWeight:730,color:C.brand,letterSpacing:"-.025em"}}>{pay(j)}</span>
                <span style={{fontSize:13,color:C.text2}}>{payUnit(j)}</span></div>
              <div style={{display:"flex",flexWrap:"wrap",gap:7,marginTop:14}}>
                {A.matchReasons(j).slice(0,3).map(r=><Tag key={r} tone="ok" sm icon="check">{r}</Tag>)}</div></div>
            <Ring v={s} size={mob?48:60} label="Match"/></div></div>;})}</div></section>;

  return <div style={{background:"#fff",minHeight:"100%"}}>
    <section style={{padding:pad,background:"#fff",borderBottom:`1px solid ${C.lineSoft}`}}>
      <div style={{maxWidth:1120,margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",gap:20,flexWrap:"wrap"}}>
          <div>
            <Tag tone="brand" icon="target">Matched for you</Tag>
            <h1 style={{fontSize:mob?32:52,fontWeight:770,letterSpacing:"-.045em",color:C.text,margin:"18px 0 12px",lineHeight:1.08}}>
              Scored against your profile.</h1>
            <p style={{fontSize:mob?16:19,color:C.text2,lineHeight:1.55,margin:0,maxWidth:560}}>
              Ranked by skills, tickets, location and pay expectation.</p></div>
          <Btn kind="outline" icon="gear" onClick={()=>A.go("profile")}>Tune preferences</Btn></div>
      </div>
    </section>

    <section style={{padding:mob?"32px 16px 56px":"48px 32px 96px",background:C.bg,minHeight:400}}>
      <div style={{maxWidth:1120,margin:"0 auto"}}>
        <div style={{background:"#fff",borderRadius:20,padding:mob?22:28,border:`1px solid ${C.line}`,marginBottom:32,display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
          <div style={{width:52,height:52,borderRadius:14,background:C.wash,color:C.brand,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><I n="sparkle" s={24}/></div>
          <div style={{flex:"1 1 260px",minWidth:0}}>
            <div style={{fontSize:16,fontWeight:680,color:C.text,letterSpacing:"-.02em",marginBottom:4}}>{strong.length} strong matches this week</div>
            <div style={{fontSize:14,color:C.text2,lineHeight:1.55}}>Add more skills and tickets to widen matches across all {CATS.length} sectors.</div></div>
          <Btn kind="primary" onClick={()=>A.go("profile")}>Add skills</Btn></div>
        <G title="Strong matches" sub="You meet most of what these employers asked for" items={strong}/>
        <G title="Worth a look" sub="Close on skills, or a small stretch on experience" items={good}/>
        {strong.length+good.length===0&&<Empty icon="target" title="No matches yet"
          body="Add a few skills to your profile and matches appear immediately."
          action={<Btn kind="primary" onClick={()=>A.go("profile")}>Update profile</Btn>}/>}
      </div>
    </section>
  </div>;
}
