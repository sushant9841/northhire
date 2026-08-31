import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn, Tag, Ring, Empty, Lbl, Banner, Page } from "../../design/primitives.jsx";
import { pay, payUnit, annual, dlText, money } from "../../helpers/utils.js";
import { EmpMark, HiringTypeBadge } from "./cards.jsx";

export function JobDetailPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const job=A.job(A.jobId); if(!job) return <Page><Empty icon="briefcase" title="Job not found" body="This listing may have been closed or removed."
    action={<Btn kind="primary" onClick={()=>A.go("search")}>Browse jobs</Btn>}/></Page>;
  const e=A.emp(job.e); const applied=A.appliedJobIds.has(job.id); const score=A.score(job);
  const Meta=({icon,k,v})=><div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
    <div style={{width:38,height:38,borderRadius:10,background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",color:C.brand,flexShrink:0}}><I n={icon} s={17}/></div>
    <div style={{minWidth:0}}><div style={{fontSize:12,color:C.text3,marginBottom:3,fontWeight:550,letterSpacing:".02em"}}>{k}</div>
      <div style={{fontSize:14.5,fontWeight:640,color:C.text,lineHeight:1.4}}>{v}</div></div></div>;
  const Sec=({title,children})=><section style={{marginBottom:32}}>
    <div style={{fontSize:mob?18:20,fontWeight:720,color:C.text,letterSpacing:"-.025em",marginBottom:14}}>{title}</div>{children}</section>;
  const Bul=({items})=><ul style={{margin:0,padding:0,listStyle:"none",display:"flex",flexDirection:"column",gap:11}}>
    {items.map(x=><li key={x} style={{display:"flex",gap:12,fontSize:15,color:C.text2,lineHeight:1.65}}>
      <span style={{color:C.brand,marginTop:3,flexShrink:0,display:"flex"}}><I n="check" s={16} w={2.4}/></span>{x}</li>)}</ul>;

  const apply=()=>{ if(!A.user) return A.go("login"); if(A.user.role!=="seeker") return A.go("denied"); A.beginApply(job.id); };

  return <div style={{background:"#fff",minHeight:"100%"}}>

    <section style={{padding:mob?"20px 16px 32px":"36px 32px 44px",background:"#fff",borderBottom:`1px solid ${C.lineSoft}`}}>
      <div style={{maxWidth:1120,margin:"0 auto"}}>
        {!mob&&<button onClick={A.back} style={{display:"inline-flex",alignItems:"center",gap:7,background:"none",border:"none",padding:0,
          cursor:"pointer",fontFamily:"inherit",fontSize:14,color:C.text2,marginBottom:24}}><I n="arrowL" s={17}/>Back</button>}
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"auto 1fr auto",gap:mob?18:24,alignItems:mob?"flex-start":"center"}}>
          <EmpMark e={e} size={mob?64:84} radius={18}/>
          <div style={{minWidth:0}}>
            <h1 style={{fontSize:mob?26:38,fontWeight:750,letterSpacing:"-.04em",color:C.text,margin:0,lineHeight:1.12}}>{job.t}</h1>
            <div style={{display:"flex",alignItems:"center",gap:10,marginTop:10,flexWrap:"wrap",fontSize:15,color:C.text2}}>
              <button onClick={()=>A.openEmployer(e.id)} style={{background:"none",border:"none",padding:0,cursor:"pointer",
                fontFamily:"inherit",fontSize:15,fontWeight:650,color:C.brand}}>{e.name}</button>
              {e.verified&&<Tag tone="brand" sm icon="checkC2">Verified</Tag>}
              <span style={{color:C.text3}}>•</span><span>{job.city}, {job.prov}</span></div>
            <div style={{display:"flex",gap:7,flexWrap:"wrap",marginTop:14}}>
              <HiringTypeBadge jobId={job.id}/>
              <Tag icon="clock">{job.type}</Tag>
              {job.mode!=="On-site"&&<Tag tone="ok" icon="globe">{job.mode}</Tag>}
              {job.urgent&&<Tag tone="warn" icon="alert">Urgent hiring</Tag>}
              <Tag tone={job.dl<=7?"danger":"neutral"} icon="calendar">{dlText(job.dl)}</Tag></div></div>
          {A.user?.role==="seeker"&&!mob&&<Ring v={score} size={72} label="Your match"/>}
        </div>
      </div>
    </section>

    <section style={{padding:mob?"24px 16px 100px":"40px 32px 96px",background:C.bg}}>
      <div style={{maxWidth:1120,margin:"0 auto",display:"grid",gridTemplateColumns:mob?"1fr":"1fr 340px",gap:mob?20:32,alignItems:"start"}}>
        <div style={{background:"#fff",borderRadius:20,padding:mob?24:36,border:`1px solid ${C.line}`}}>
          <div style={{background:C.tint,border:`1px solid ${C.line2}`,borderRadius:16,padding:mob?"20px 22px":"26px 28px",marginBottom:32}}>
            <div style={{fontSize:12,color:C.brand,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",marginBottom:8}}>Offered salary</div>
            <div style={{fontSize:mob?32:44,fontWeight:770,color:C.brand,letterSpacing:"-.045em",lineHeight:1}}>
              {pay(job)} <span style={{fontSize:mob?17:20,fontWeight:600,opacity:.75}}>{payUnit(job)}</span></div>
            {job.unit!=="yr"&&<div style={{fontSize:13.5,color:C.text2,marginTop:10}}>
              Roughly {money(annual(job))} per year at full-time hours</div>}</div>
          <div style={{display:"grid",gridTemplateColumns:`repeat(auto-fit,minmax(${mob?150:200}px,1fr))`,gap:22,marginBottom:36}}>
            <Meta icon="users" k="Vacancies" v={`${job.vac} ${job.vac===1?"position":"positions"}`}/>
            <Meta icon="pin" k="Location" v={`${job.city}, ${job.prov}`}/>
            <Meta icon="award" k="Experience" v={job.exp}/>
            <Meta icon="cap" k="Education" v={job.edu}/>
            <Meta icon="briefcase" k="Employment" v={job.type}/>
            <Meta icon="calendar" k="Apply before" v={dlText(job.dl)}/></div>
          {A.jobHiringType(job.id)==="agency-perm"&&<Banner tone="brand" icon="award" title="Recruiter search — NorthHire Staffing" style={{marginBottom:24}}>
            NorthHire Staffing is sourcing candidates for {e.name}. If hired, you'll be on {e.name}'s payroll directly. We take a placement fee <em>from the client</em>, never from you. 90-day replacement guarantee applies to us.
          </Banner>}
          <Sec title="About this role"><p style={{fontSize:mob?15:16,color:C.text2,lineHeight:1.75,margin:0}}>{job.desc}</p></Sec>
          <Sec title="What you will be doing"><Bul items={job.duties}/></Sec>
          <Sec title="What we are looking for"><Bul items={job.reqs}/></Sec>
          <Sec title="Skills and certifications">
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {job.skills.map(s=>{const mine=A.user?.role==="seeker"&&(A.user.skills||[]).some(x=>x.toLowerCase()===s.toLowerCase());
                return <Tag key={s} tone={mine?"ok":"neutral"} icon={mine?"check":undefined}>{s}</Tag>;})}</div>
            {A.user?.role==="seeker"&&<div style={{fontSize:13,color:C.text3,marginTop:12}}>Highlighted skills are already on your profile.</div>}</Sec>
          <Sec title="Benefits offered">
            <div style={{display:"grid",gridTemplateColumns:`repeat(auto-fit,minmax(${mob?220:260}px,1fr))`,gap:10}}>
              {job.perks.map(p=><div key={p} style={{display:"flex",gap:11,alignItems:"center",background:C.okBg,
                border:`1px solid ${C.okLn}`,borderRadius:12,padding:"13px 15px"}}>
                <span style={{color:C.ok,display:"flex",flexShrink:0}}><I n="check" s={16} w={2.4}/></span>
                <span style={{fontSize:14,color:C.text,fontWeight:540}}>{p}</span></div>)}</div></Sec>
          <Sec title="How to apply"><p style={{fontSize:15,color:C.text2,lineHeight:1.7,margin:0}}>{job.how}</p></Sec>
        </div>

        {!mob&&<div style={{position:"sticky",top:80,display:"flex",flexDirection:"column",gap:16}}>
          <div style={{background:"#fff",borderRadius:20,padding:24,border:`1px solid ${C.line}`}}>
            {A.user?.role==="seeker"&&<div style={{display:"flex",alignItems:"center",gap:14,paddingBottom:18,marginBottom:18,borderBottom:`1px solid ${C.lineSoft}`}}>
              <Ring v={score} size={56}/><div><div style={{fontSize:14.5,fontWeight:660,color:C.text}}>Your match score</div>
                <div style={{fontSize:13,color:C.text2,marginTop:3}}>From your skills and preferences</div></div></div>}
            <Btn kind={applied?"soft":"primary"} size="lg" full disabled={applied} icon={applied?"check":"send"} onClick={apply}>
              {applied?"Application sent":"Apply for this job"}</Btn>
            <div style={{display:"flex",gap:10,marginTop:12}}>
              <Btn kind="outline" full onClick={()=>A.toggleSave(job.id)} icon="bookmark">{A.saved.has(job.id)?"Saved":"Save"}</Btn>
              <Btn kind="outline" full icon="share" onClick={()=>A.share(job)}>Share</Btn></div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12.5,color:C.text3,marginTop:18,paddingTop:16,borderTop:`1px solid ${C.lineSoft}`}}>
              <span>{job.views.toLocaleString()} views</span><span>Posted {job.posted}</span></div></div>
          <div style={{background:"#fff",borderRadius:20,padding:24,border:`1px solid ${C.line}`}}>
            <Lbl>About the employer</Lbl>
            <div style={{display:"flex",gap:13,alignItems:"center",marginBottom:14}}>
              <EmpMark e={e} size={48} radius={12}/>
              <div style={{minWidth:0}}><div style={{fontSize:15,fontWeight:660,color:C.text}}>{e.name}</div>
                <div style={{fontSize:13,color:C.text2,marginTop:2}}>{e.industry} • {e.size} staff</div></div></div>
            <p style={{fontSize:14,color:C.text2,lineHeight:1.65,margin:"0 0 16px"}}>{e.about}</p>
            <Btn kind="outline" size="sm" full iconR="chevR" onClick={()=>A.openEmployer(e.id)}>All openings</Btn></div>
          {A.user?.role==="seeker"&&(()=>{const g=A.skillsGap(job);
            if(!g.missing.length)return null;
            return <div style={{background:"#fff",borderRadius:20,padding:24,border:`1px solid ${C.line}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <Lbl style={{margin:0}}>Skills gap</Lbl>
                <Tag tone="brand" sm>{g.current} → {g.potential}</Tag></div>
              <p style={{fontSize:13,color:C.text2,margin:"0 0 12px",lineHeight:1.55}}>
                Add these skills to your profile to raise your match by <strong style={{color:C.brand}}>{g.potential-g.current} points</strong>:</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
                {g.missing.map(s=><Tag key={s} sm icon="plus">{s}</Tag>)}</div>
              <Btn kind="outline" size="sm" full onClick={()=>A.go("profile")}>Update my skills</Btn></div>;})()}
          {(()=>{const s=A.salaryInsight(job.t,job.prov);
            if(!s)return null;
            return <div style={{background:"#fff",borderRadius:20,padding:24,border:`1px solid ${C.line}`}}>
              <Lbl>Salary insight</Lbl>
              <p style={{fontSize:13,color:C.text2,margin:"0 0 14px",lineHeight:1.55}}>
                Based on {s.count} similar {job.prov} listings on NorthHire.</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
                {[["Low",s.p25],["Median",s.median],["High",s.p75]].map(([l,v],i)=>
                  <div key={l} style={{textAlign:"center",padding:"12px 6px",background:i===1?C.tint:C.bg,borderRadius:10,border:`1px solid ${i===1?C.line2:C.line}`}}>
                    <div style={{fontSize:11,color:C.text3,fontWeight:600,letterSpacing:".04em",textTransform:"uppercase"}}>{l}</div>
                    <div style={{fontSize:15,fontWeight:730,color:i===1?C.brand:C.text,marginTop:4,letterSpacing:"-.02em"}}>${Math.round(v/1000)}k</div></div>)}</div>
              <div style={{fontSize:12,color:C.text3,textAlign:"center"}}>Estimated annualized totals</div></div>;})()}
        </div>}
      </div>

      {/* Page-bottom Apply CTA */}
      <div style={{maxWidth:1240,margin:mob?"0 auto":"32px auto 0",padding:mob?"24px 16px 32px":"0 32px 40px"}}>
        <div style={{background:`linear-gradient(135deg,${C.tint} 0%,#F0F7FF 100%)`,border:`1px solid ${C.line2}`,borderRadius:20,padding:mob?24:36,textAlign:"center"}}>
          <div style={{fontSize:mob?18:22,fontWeight:720,color:C.text,letterSpacing:"-.025em",marginBottom:8}}>Ready to apply for this role?</div>
          <div style={{fontSize:14,color:C.text2,marginBottom:20,maxWidth:480,margin:"0 auto 20px",lineHeight:1.65}}>{applied?"Your application has been sent. Track its progress in My Status.":`Takes about 2 minutes. Your profile and CV go straight to ${e.name}.`}</div>
          <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
            <Btn kind={applied?"soft":"primary"} size="lg" iconR={applied?"check":"arrowR"} disabled={applied} onClick={apply}>
              {applied?"Application sent":"Apply for this role"}</Btn>
            <Btn kind="outline" size="lg" onClick={()=>A.toggleSave(job.id)} icon="bookmark">{A.saved.has(job.id)?"Saved":"Save for later"}</Btn>
          </div>
        </div>
      </div>
    </section>

    {mob&&<div style={{position:"sticky",bottom:0,background:"rgba(255,255,255,.97)",backdropFilter:"blur(12px)",
      borderTop:`1px solid ${C.line}`,padding:"12px 16px",display:"flex",gap:10,zIndex:300}}>
      <Btn kind="outline" onClick={()=>A.toggleSave(job.id)} icon="bookmark" style={{flexShrink:0}}>{A.saved.has(job.id)?"Saved":"Save"}</Btn>
      <Btn kind={applied?"soft":"primary"} full disabled={applied} icon={applied?"check":"send"} onClick={apply}>{applied?"Applied":"Apply now"}</Btn></div>}
  </div>;
}
