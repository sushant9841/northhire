import { useState } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn, Tag, Input, Empty, Lbl, Modal, Field, Area, CheckRow, Page, SmartPortrait } from "../../design/primitives.jsx";
import { EmpMark, JobCard } from "./cards.jsx";

export function EmployersPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const [q,setQ]=useState("");
  const list=A.employers.filter(e=>!q||e.name.toLowerCase().includes(q.toLowerCase())||e.industry.toLowerCase().includes(q.toLowerCase()));
  const pad=mob?"56px 16px":"96px 32px";
  return <div style={{background:"#fff",minHeight:"100%"}}>
    <section style={{padding:pad,background:"#fff"}}>
      <div style={{maxWidth:960,margin:"0 auto",textAlign:"center"}}>
        <Tag tone="brand" icon="building">Employers</Tag>
        <h1 style={{fontSize:mob?38:68,fontWeight:770,letterSpacing:"-.05em",lineHeight:1.02,margin:"22px auto 26px",color:C.text}}>
          Companies actively hiring across Canada</h1>
        <p style={{fontSize:mob?17:20,color:C.text2,lineHeight:1.55,margin:"0 auto 32px",maxWidth:560}}>
          Every employer on NorthHire is verified, and every listing shows the wage. Browse by sector, size, or the province where you want to work.</p>
        <div style={{maxWidth:480,margin:"0 auto"}}>
          <Input icon="search" placeholder="Search company or industry" value={q} onChange={e=>setQ(e.target.value)}/></div>
      </div>
    </section>
    <section style={{padding:mob?"0 16px 56px":"0 32px 96px",background:"#fff"}}>
      <div style={{maxWidth:1240,margin:"0 auto"}}>
        <div style={{display:"grid",gridTemplateColumns:`repeat(auto-fill,minmax(${mob?260:300}px,1fr))`,gap:16}}>
          {list.map(e=>{const n=A.jobs.filter(j=>j.e===e.id&&j.status==="live").length;
            return <div key={e.id} onClick={()=>A.openEmployer(e.id)} style={{background:"#fff",borderRadius:20,padding:24,
              border:`1px solid ${C.line}`,cursor:"pointer",transition:"transform .2s,border-color .2s"}}
              onMouseEnter={ev=>{ev.currentTarget.style.transform="translateY(-4px)";ev.currentTarget.style.borderColor=C.line2;}}
              onMouseLeave={ev=>{ev.currentTarget.style.transform="none";ev.currentTarget.style.borderColor=C.line;}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
                <EmpMark e={e} size={56} radius={14}/>
                {e.verified&&<Tag tone="brand" sm icon="checkC2">Verified</Tag>}</div>
              <div style={{fontSize:17,fontWeight:680,color:C.text,letterSpacing:"-.02em"}}>{e.name}</div>
              <div style={{fontSize:13.5,color:C.text2,marginTop:5}}>{e.industry} • {e.city}, {e.prov}</div>
              <div style={{fontSize:12.5,color:C.text3,marginTop:8}}>{e.size} employees</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:18,paddingTop:16,borderTop:`1px solid ${C.lineSoft}`}}>
                <span style={{fontSize:13,color:C.warn,fontWeight:660,display:"flex",alignItems:"center",gap:5}}><I n="star" s={13} fill={C.warn} w={0}/>{e.rating}</span>
                <span style={{fontSize:13.5,color:C.brand,fontWeight:660}}>{n} open {n===1?"role":"roles"}</span></div></div>;})}</div>
      </div>
    </section>
  </div>;
}

export function EmployerPublicPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [showRev,setShowRev]=useState(false); const [revD,setRevD]=useState({rating:0,text:"",anon:false});
  const e=A.emp(A.empId); if(!e) return <Page><Empty title="Employer not found" body="This company profile is unavailable."/></Page>;
  const jobs=A.jobs.filter(j=>j.e===e.id&&j.status==="live");
  const reviews=A.reviews.filter(r=>r.employer===e.id).sort((a,b)=>b.at-a.at);
  const userReview=reviews.find(r=>r.user===A.user?.id);
  const pad=mob?"44px 16px":"72px 32px";
  return <div style={{background:"#fff",minHeight:"100%"}}>

    <section style={{padding:pad,background:"#fff",borderBottom:`1px solid ${C.lineSoft}`}}>
      <div style={{maxWidth:1120,margin:"0 auto"}}>
        {!mob&&<button onClick={A.back} style={{display:"inline-flex",alignItems:"center",gap:7,background:"none",border:"none",padding:0,
          cursor:"pointer",fontFamily:"inherit",fontSize:14,color:C.text2,marginBottom:24}}><I n="arrowL" s={17}/>Back</button>}
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"auto 1fr auto",gap:mob?20:28,alignItems:"center"}}>
          <EmpMark e={e} size={mob?72:96} radius={20}/>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:10}}>
              <h1 style={{fontSize:mob?26:38,fontWeight:750,letterSpacing:"-.04em",margin:0,color:C.text,lineHeight:1.1}}>{e.name}</h1>
              {e.verified&&<Tag tone="brand" icon="checkC2">Verified employer</Tag>}</div>
            <div style={{fontSize:mob?14:15.5,color:C.text2,marginBottom:8}}>
              {e.industry} • {e.city}, {e.prov} • {e.size} employees</div>
            <div style={{display:"flex",gap:14,alignItems:"center",flexWrap:"wrap",fontSize:13.5}}>
              <span style={{color:C.warn,display:"flex",alignItems:"center",gap:5,fontWeight:660}}><I n="star" s={14} fill={C.warn} w={0}/>{e.rating} rating</span>
              <span style={{color:C.text3}}>•</span>
              <span style={{color:C.brand,fontWeight:660}}>{jobs.length} open {jobs.length===1?"role":"roles"}</span></div></div>
          <Btn kind="primary" size="lg" icon="bell" onClick={()=>A.followEmployer(e.id)}>{A.following.has(e.id)?"Following":"Follow"}</Btn></div>
      </div>
    </section>

    <section style={{padding:mob?"32px 16px 56px":"48px 32px 96px",background:C.bg}}>
      <div style={{maxWidth:1120,margin:"0 auto",display:"grid",gridTemplateColumns:mob?"1fr":"1fr 340px",gap:mob?24:32,alignItems:"start"}}>
        <div>
          <div style={{background:"#fff",borderRadius:20,padding:mob?26:36,border:`1px solid ${C.line}`,marginBottom:24}}>
            <Lbl>About {e.name}</Lbl>
            <p style={{fontSize:mob?15:16,color:C.text2,lineHeight:1.75,margin:0}}>{e.about}</p></div>

          {/* Reviews section */}
          <div style={{background:"#fff",borderRadius:20,padding:mob?26:36,border:`1px solid ${C.line}`,marginBottom:24}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,marginBottom:16,flexWrap:"wrap"}}>
              <div>
                <Lbl style={{margin:0}}>Reviews from workers</Lbl>
                <div style={{display:"flex",alignItems:"center",gap:8,marginTop:6}}>
                  <div style={{fontSize:22,fontWeight:730,color:C.text,letterSpacing:"-.03em"}}>{e.rating||"—"}</div>
                  <div style={{color:C.warn,display:"flex",gap:2}}>{[1,2,3,4,5].map(n=><I key={n} n="star" s={16} fill={n<=Math.round(e.rating||0)?C.warn:"none"} c={C.warn} w={1.5}/>)}</div>
                  <div style={{fontSize:13,color:C.text3}}>from {reviews.length} review{reviews.length===1?"":"s"}</div>
                </div></div>
              {A.user?.role==="seeker"&&!userReview&&<Btn kind="outline" size="sm" icon="plus" onClick={()=>setShowRev(true)}>Write a review</Btn>}
            </div>
            {reviews.length===0
              ? <p style={{fontSize:14,color:C.text3,margin:"12px 0 0",fontStyle:"italic"}}>No reviews yet. Be the first to share your experience.</p>
              : <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  {reviews.slice(0,3).map(rv=>{const author=A.person(rv.user);
                    return <div key={rv.id} style={{padding:16,background:C.bg,borderRadius:12,border:`1px solid ${C.line}`}}>
                      <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:10}}>
                        {!rv.anon&&author?<SmartPortrait seed={author.seed} size={36}/>:<div style={{width:36,height:36,borderRadius:99,background:C.wash,color:C.brand,display:"flex",alignItems:"center",justifyContent:"center"}}><I n="user" s={18}/></div>}
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13.5,fontWeight:640,color:C.text}}>{rv.anon?"Anonymous worker":author?.name||"Former employee"}</div>
                          <div style={{fontSize:12,color:C.text3,marginTop:2}}>{new Date(rv.at).toLocaleDateString("en-CA",{year:"numeric",month:"long"})}</div></div>
                        <div style={{color:C.warn,display:"flex",gap:1}}>{[1,2,3,4,5].map(n=><I key={n} n="star" s={13} fill={n<=rv.rating?C.warn:"none"} c={C.warn} w={1.5}/>)}</div>
                      </div>
                      <p style={{fontSize:14,color:C.text2,lineHeight:1.65,margin:0,whiteSpace:"pre-wrap"}}>{rv.text}</p>
                      {rv.user===A.user?.id&&<Btn kind="ghost" size="xs" icon="trash" style={{marginTop:8}} onClick={()=>A.deleteReview(rv.id)}>Delete my review</Btn>}
                    </div>;})}
                  {reviews.length>3&&<div style={{fontSize:13,color:C.text3,textAlign:"center",padding:"6px 0"}}>+ {reviews.length-3} more reviews</div>}
                </div>}
          </div>

          {showRev&&<Modal onClose={()=>setShowRev(false)} title={`Review ${e.name}`}>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <Field label="Your rating" required>
                <div style={{display:"flex",gap:6}}>
                  {[1,2,3,4,5].map(n=><button key={n} onClick={()=>setRevD({...revD,rating:n})} style={{background:"none",border:"none",cursor:"pointer",padding:2,color:n<=revD.rating?C.warn:C.line}}>
                    <I n="star" s={30} fill={n<=revD.rating?C.warn:"none"} c={n<=revD.rating?C.warn:C.text3} w={1.5}/></button>)}
                </div></Field>
              <Field label="Your review" required hint="Share what you liked and what could be better. Please be constructive.">
                <Area rows={5} value={revD.text} onChange={e=>setRevD({...revD,text:e.target.value})} placeholder="Great crew, safety-focused site management, competitive pay. Overtime was frequent though."/></Field>
              <CheckRow on={revD.anon} onChange={v=>setRevD({...revD,anon:v})} label="Post anonymously" sub="Your name won't appear next to this review."/>
              <div style={{display:"flex",gap:9,justifyContent:"flex-end"}}>
                <Btn kind="ghost" onClick={()=>setShowRev(false)}>Cancel</Btn>
                <Btn kind="primary" icon="check" disabled={!revD.rating||!revD.text.trim()} onClick={()=>{A.addReview(e.id,revD.rating,revD.text.trim(),revD.anon);setRevD({rating:0,text:"",anon:false});setShowRev(false);}}>Submit review</Btn></div>
            </div></Modal>}

          <div style={{marginBottom:20}}>
            <h2 style={{fontSize:mob?22:28,fontWeight:730,letterSpacing:"-.03em",color:C.text,margin:"0 0 6px",lineHeight:1.2}}>Current openings</h2>
            <p style={{fontSize:14,color:C.text2,margin:0}}>{jobs.length} open {jobs.length===1?"position":"positions"}</p></div>
          {jobs.length===0?<Empty icon="briefcase" title="No open roles right now" body={`Follow ${e.name} and we will alert you when they post.`}/>
            :<div style={{display:"grid",gridTemplateColumns:`repeat(auto-fill,minmax(${mob?260:290}px,1fr))`,gap:16}}>
              {jobs.map(j=><JobCard key={j.id} job={j}/>)}</div>}</div>
        <div style={{background:"#fff",borderRadius:20,padding:mob?24:28,border:`1px solid ${C.line}`}}>
          <Lbl>Company details</Lbl>
          {[["Industry",e.industry],["Head office",`${e.city}, ${e.prov}`],["Company size",e.size],["Founded",e.founded],["Website",e.site]].map(([k,v],i,arr)=>
            <div key={k} style={{display:"flex",justifyContent:"space-between",gap:12,padding:"12px 0",borderBottom:i<arr.length-1?`1px solid ${C.lineSoft}`:"none",fontSize:13.5}}>
              <span style={{color:C.text2}}>{k}</span><span style={{fontWeight:640,color:C.text,textAlign:"right"}}>{v}</span></div>)}</div>
      </div>
    </section>

  </div>;
}
