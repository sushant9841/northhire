/* ═══════════════ HOME ═══════════════ */

import { useState } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C, SH } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import {
  Page, Btn, Tag, Card, Input, Tabs, Empty, Bar, Lbl, Field, Area, SmartScene, SmartPortrait,
} from "../../design/primitives.jsx";
import { money, pay, payShort } from "../../helpers/utils.js";
import { CATS } from "../../store/seed/constants.js";
import { SEED_BLOGS } from "../../store/seed/blogs.js";
import { JobCard, TrainingCard, BlogCard, EmpMark } from "../shared/cards.jsx";

export function HomePage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [q,setQ]=useState(""); const [where,setWhere]=useState("");
  const live=A.jobs.filter(j=>j.status==="live");
  const featured=live.filter(j=>j.featured).slice(0,6);
  const trending=[...live].sort((a,b)=>(b.views||0)-(a.views||0)).slice(0,6);
  const closingSoon=[...live].filter(j=>j.dl&&j.dl<=14).sort((a,b)=>(a.dl||99)-(b.dl||99)).slice(0,6);
  const blogs=A.blogs.filter(b=>b.status==="published").slice(0,3);
  const trainings=A.trainings.filter(t=>t.status==="published").slice(0,4);

  /* Personalization for logged-in seekers */
  const seekerLoggedIn=A.user?.role==="seeker";
  const myCvs=seekerLoggedIn?(A.cvs||[]).filter(c=>c.user===A.user.id):[];
  const mySkills=Array.from(new Set([...(A.user?.skills||[]),...myCvs.flatMap(c=>c.skills||[])]));
  const matchedForMe=seekerLoggedIn&&mySkills.length
    ? live.map(j=>({j,score:(j.skills||[]).filter(s=>mySkills.some(m=>m.toLowerCase()===s.toLowerCase())).length}))
        .filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,6).map(x=>x.j)
    : live.slice(0,6);

  /* Top industries hiring — count jobs per sector */
  const industryCounts=live.reduce((a,j)=>{a[j.cat]=(a[j.cat]||0)+1;return a;},{});
  const topIndustries=Object.entries(industryCounts).sort((a,b)=>b[1]-a[1]).slice(0,6)
    .map(([id,n])=>({...CATS.find(c=>c.id===id),n}));

  const go=()=>{A.setSearch({q,where,cats:[]});A.go("search");};
  const pad=mob?"52px 16px":"80px 32px";
  const wrapW=1240;

  const H=(title,sub,tag,action)=><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",gap:20,marginBottom:mob?24:32,flexWrap:"wrap"}}>
    <div style={{maxWidth:640}}>{tag&&<Tag tone="brand">{tag}</Tag>}
      <h2 style={{fontSize:mob?24:32,fontWeight:740,letterSpacing:"-.035em",color:C.text,margin:tag?"10px 0 8px":"0 0 8px",lineHeight:1.15}}>{title}</h2>
      {sub&&<p style={{fontSize:mob?14.5:16,color:C.text2,lineHeight:1.6,margin:0}}>{sub}</p>}</div>
    {action}</div>;

  /* ─────────── Signed-in seeker: personalized view ─────────── */
  if(seekerLoggedIn){
    const first=A.user.name?.split(" ")[0]||"there";
    return <div style={{background:"#fff"}}>
      <section style={{padding:mob?"32px 16px 24px":"48px 32px 24px"}}>
        <div style={{maxWidth:wrapW,margin:"0 auto"}}>
          <div style={{fontSize:mob?26:36,fontWeight:750,letterSpacing:"-.035em",color:C.text,lineHeight:1.15,marginBottom:10}}>
            Welcome back, {first}.</div>
          <div style={{fontSize:mob?15:17,color:C.text2,lineHeight:1.55,marginBottom:22,maxWidth:640}}>
            {mySkills.length
              ? `We've lined up ${matchedForMe.length} new opportunities matched to your skills. Here's what's happening on NorthHire today.`
              : "Add a few skills to your profile and we'll start matching you to jobs across Canada."}</div>
          <div style={{background:"#fff",borderRadius:14,padding:6,display:"flex",gap:6,flexWrap:mob?"wrap":"nowrap",boxShadow:SH.md,border:`1px solid ${C.line}`,maxWidth:640}}>
            <div style={{flex:"1 1 200px",minWidth:0}}>
              <Input icon="search" placeholder="Job title, trade or skill" value={q} onChange={e=>setQ(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&go()} style={{border:"none",boxShadow:"none",fontSize:14.5}}/></div>
            {!mob&&<div style={{width:1,background:C.line,margin:"6px 0"}}/>}
            <div style={{flex:"1 1 140px",minWidth:0}}>
              <Input icon="pin" placeholder="City or province" value={where} onChange={e=>setWhere(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&go()} style={{border:"none",boxShadow:"none",fontSize:14.5}}/></div>
            <Btn kind="primary" size="md" full={mob} icon="search" onClick={go}>Search</Btn></div>
        </div>
      </section>

      <section style={{padding:mob?"24px 16px":"32px 32px",background:"#fff"}}>
        <div style={{maxWidth:wrapW,margin:"0 auto"}}>
          {H("Matched for you",`Based on ${mySkills.length||"your"} skills and your saved preferences.`,null,
            <Btn kind="outline" size="sm" iconR="arrowR" onClick={()=>A.go("matched")}>See all matches</Btn>)}
          <div style={{display:"grid",gridTemplateColumns:`repeat(auto-fill,minmax(${mob?260:300}px,1fr))`,gap:14}}>
            {matchedForMe.map(j=><JobCard key={j.id} job={j}/>)}</div>
        </div>
      </section>

      <section style={{padding:mob?"24px 16px":"32px 32px",background:C.bg}}>
        <div style={{maxWidth:wrapW,margin:"0 auto"}}>
          {H("Top industries hiring right now","Where Canadian employers are actively posting.",null,
            <Btn kind="outline" size="sm" onClick={()=>A.go("search")}>Browse all</Btn>)}
          <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"repeat(3,1fr)",gap:12}}>
            {topIndustries.map(c=><button key={c.id} onClick={()=>{A.setSearch({q:"",where:"",cats:[c.id]});A.go("search");}}
              data-card style={{display:"flex",gap:14,padding:mob?16:20,borderRadius:14,cursor:"pointer",border:`1px solid ${C.line}`,background:"#fff",fontFamily:"inherit",textAlign:"left",alignItems:"center"}}>
              <span style={{width:44,height:44,borderRadius:11,background:C.wash,color:C.brand,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><I n={c.icon} s={22}/></span>
              <div style={{flex:1,minWidth:0}}><div style={{fontSize:15,fontWeight:660,color:C.text,marginBottom:2}}>{c.label}</div>
                <div style={{fontSize:12.5,color:C.text3}}>{c.n} open position{c.n===1?"":"s"}</div></div>
              <I n="chevR" s={18} c={C.text3}/></button>)}
          </div>
        </div>
      </section>

      <section style={{padding:mob?"24px 16px":"32px 32px",background:"#fff"}}>
        <div style={{maxWidth:wrapW,margin:"0 auto"}}>
          {H("Closing soon","Application deadlines within the next two weeks.",null,
            <Btn kind="ghost" size="sm" onClick={()=>A.go("search")}>All jobs</Btn>)}
          <div style={{display:"grid",gridTemplateColumns:`repeat(auto-fill,minmax(${mob?260:300}px,1fr))`,gap:14}}>
            {closingSoon.length?closingSoon.map(j=><JobCard key={j.id} job={j}/>):<div style={{color:C.text3,fontSize:14}}>No deadlines coming up in the next two weeks.</div>}</div>
        </div>
      </section>

      <section style={{padding:mob?"24px 16px":"32px 32px",background:C.bg}}>
        <div style={{maxWidth:wrapW,margin:"0 auto"}}>
          {H("Trending across Canada","The most-viewed listings on NorthHire this week.",null,null)}
          <div style={{display:"grid",gridTemplateColumns:`repeat(auto-fill,minmax(${mob?260:300}px,1fr))`,gap:14}}>
            {trending.map(j=><JobCard key={j.id} job={j}/>)}</div>
        </div>
      </section>

      <section style={{padding:mob?"24px 16px":"32px 32px",background:"#fff"}}>
        <div style={{maxWidth:wrapW,margin:"0 auto"}}>
          {H("Grow your credentials","Certifications Canadian employers ask for.",null,
            <Btn kind="outline" size="sm" iconR="arrowR" onClick={()=>A.go("trainings")}>All trainings</Btn>)}
          <div style={{display:"grid",gridTemplateColumns:`repeat(auto-fill,minmax(${mob?260:280}px,1fr))`,gap:14}}>
            {trainings.map(t=><TrainingCard key={t.id} t={t}/>)}</div>
        </div>
      </section>

      <section style={{padding:mob?"24px 16px 40px":"32px 32px 60px",background:"#fff"}}>
        <div style={{maxWidth:wrapW,margin:"0 auto"}}>
          {H("From the resource centre","Career guides written by people with Canadian workplace experience.",null,
            <Btn kind="outline" size="sm" iconR="arrowR" onClick={()=>A.go("blogs")}>All articles</Btn>)}
          <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(3,1fr)",gap:mob?14:18}}>
            {blogs.map(b=><BlogCard key={b.id} b={b}/>)}</div>
        </div>
      </section>
    </div>;
  }

  /* ─────────── Guest / non-seeker view ─────────── */
  return <div style={{background:"#fff"}}>

    <section style={{padding:pad,background:"#fff"}}>
      <div style={{maxWidth:wrapW,margin:"0 auto",display:"grid",gridTemplateColumns:mob?"1fr":"1.05fr .95fr",gap:mob?32:56,alignItems:"center"}}>
        <div>
          <Tag tone="brand" icon="pin">Hiring across every province and territory</Tag>
          <h1 style={{fontSize:mob?38:66,fontWeight:770,letterSpacing:"-.045em",lineHeight:1.05,margin:"22px 0 22px",color:C.text}}>
            Real Canadian jobs.<br/><span style={{color:C.brand}}>Wages published upfront.</span></h1>
          <p style={{fontSize:mob?17:19,color:C.text2,lineHeight:1.55,margin:"0 0 32px",maxWidth:560}}>
            NorthHire is built for the trades, healthcare, transport, kitchens, warehouses and offices that keep Canada running. Every listing shows the wage, the shift schedule and the certification you need to apply.</p>
          <div style={{background:"#fff",borderRadius:16,padding:8,display:"flex",gap:8,flexWrap:mob?"wrap":"nowrap",boxShadow:SH.lg,border:`1px solid ${C.line}`,maxWidth:640}}>
            <div style={{flex:"1 1 200px",minWidth:0}}>
              <Input icon="search" placeholder="Job title, trade or skill" value={q} onChange={e=>setQ(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&go()} style={{border:"none",boxShadow:"none",fontSize:15}}/></div>
            {!mob&&<div style={{width:1,background:C.line,margin:"8px 0"}}/>}
            <div style={{flex:"1 1 160px",minWidth:0}}>
              <Input icon="pin" placeholder="City or province" value={where} onChange={e=>setWhere(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&go()} style={{border:"none",boxShadow:"none",fontSize:15}}/></div>
            <Btn kind="primary" size="lg" full={mob} icon="search" onClick={go}>Search</Btn></div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:20,alignItems:"center"}}>
            <span style={{fontSize:13,color:C.text3}}>Popular searches:</span>
            {["Red Seal Electrician","Registered Nurse","AZ Truck Driver","Line Cook","Warehouse Associate"].map(t=>
              <button key={t} onClick={()=>{A.setSearch({q:t,where:"",cats:[]});A.go("search");}}
                style={{background:"#fff",border:`1px solid ${C.line}`,color:C.text2,fontSize:13,padding:"6px 13px",
                  borderRadius:99,cursor:"pointer",fontFamily:"inherit",fontWeight:500}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=C.brand;e.currentTarget.style.color=C.brand;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=C.line;e.currentTarget.style.color=C.text2;}}>{t}</button>)}</div>
        </div>
        {!mob&&<div style={{position:"relative",borderRadius:24,overflow:"hidden",boxShadow:SH.xl,border:`1px solid ${C.line}`,aspectRatio:"4/5"}}>
          <div style={{position:"absolute",inset:0,background:C.bg}}>
            <SmartScene kind="trades" tone={C.brand} w="100%" h="100%" seed={1}/></div>
          <div style={{position:"absolute",left:24,bottom:32,background:"#fff",borderRadius:14,padding:"14px 18px",
            boxShadow:SH.lg,display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:42,height:42,borderRadius:11,background:C.okBg,color:C.ok,display:"flex",alignItems:"center",justifyContent:"center"}}><I n="wallet" s={20}/></div>
            <div><div style={{fontSize:14,fontWeight:680,color:C.text}}>Wage on every job</div>
              <div style={{fontSize:12.5,color:C.text2,marginTop:2}}>No "competitive salary"</div></div></div>
          <div style={{position:"absolute",right:24,top:28,background:"#fff",borderRadius:14,padding:"14px 18px",
            boxShadow:SH.lg,display:"flex",alignItems:"center",gap:12}}>
            <div style={{display:"flex"}}>{[1,3,5].map((s,i)=><div key={s} style={{marginLeft:i?-11:0,border:"2px solid #fff",borderRadius:99,display:"flex"}}><SmartPortrait seed={s} size={32}/></div>)}</div>
            <div><div style={{fontSize:14,fontWeight:680,color:C.text}}>2,400+ hired</div>
              <div style={{fontSize:12.5,color:C.text2,marginTop:2}}>in the last 30 days</div></div></div>
        </div>}
      </div>
    </section>

    <section style={{padding:mob?"40px 16px":"56px 32px",background:"#fff",borderTop:`1px solid ${C.lineSoft}`,borderBottom:`1px solid ${C.lineSoft}`}}>
      <div style={{maxWidth:wrapW,margin:"0 auto"}}>
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"repeat(4,1fr)",gap:mob?24:32,textAlign:"center"}}>
          {[[`${(live.length*712).toLocaleString()}+`,"Live openings across Canada"],["4,180","Employers actively hiring"],["100%","Wages published on every listing"],["11 days","Average time to hire"]].map(([v,l])=>
            <div key={l}><div style={{fontSize:mob?30:44,fontWeight:770,color:C.brand,letterSpacing:"-.04em",lineHeight:1}}>{v}</div>
              <div style={{fontSize:mob?12.5:13.5,color:C.text2,marginTop:mob?10:14,fontWeight:520,letterSpacing:"-.01em"}}>{l}</div></div>)}</div>
      </div>
    </section>

    <section style={{padding:pad,background:"#fff"}}>
      <div style={{maxWidth:wrapW,margin:"0 auto"}}>
        {H("Browse by sector","Twelve industries, every trade and role across Canada.","Sectors",
          <Btn kind="outline" iconR="arrowR" onClick={()=>A.go("search")}>All jobs</Btn>)}
        <div style={{display:"grid",gridTemplateColumns:`repeat(auto-fill,minmax(${mob?140:170}px,1fr))`,gap:10}}>
          {CATS.map(c=><button key={c.id} onClick={()=>{A.setSearch({q:"",where:"",cats:[c.id]});A.go("search");}}
            data-card style={{display:"flex",flexDirection:"column",gap:10,padding:mob?"14px 14px":"16px 16px",borderRadius:13,cursor:"pointer",
              border:`1px solid ${C.line}`,background:"#fff",fontFamily:"inherit",textAlign:"left"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=C.brand;e.currentTarget.style.background=C.tint;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.line;e.currentTarget.style.background="#fff";}}>
            <span style={{width:36,height:36,borderRadius:10,background:C.wash,color:C.brand,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><I n={c.icon} s={18}/></span>
            <div><div style={{fontSize:13.5,fontWeight:640,color:C.text,letterSpacing:"-.015em",marginBottom:2}}>{c.label}</div>
              <div style={{fontSize:12,color:C.text3}}>{c.n.toLocaleString()} jobs</div></div></button>)}</div>
      </div>
    </section>

    <section style={{padding:pad,background:C.bg}}>
      <div style={{maxWidth:wrapW,margin:"0 auto"}}>
        {H("Featured openings","Roles that employers are highlighting this week.","Featured this week",
          <Btn kind="outline" iconR="arrowR" onClick={()=>A.go("search")}>See all jobs</Btn>)}
        <div style={{display:"grid",gridTemplateColumns:`repeat(auto-fill,minmax(${mob?260:300}px,1fr))`,gap:14}}>
          {featured.map(j=><JobCard key={j.id} job={j}/>)}</div>
      </div>
    </section>

    <section style={{padding:pad,background:"#fff"}}>
      <div style={{maxWidth:wrapW,margin:"0 auto"}}>
        {H("Trending across Canada","The most-viewed listings on NorthHire this week.","Trending",null)}
        <div style={{display:"grid",gridTemplateColumns:`repeat(auto-fill,minmax(${mob?260:300}px,1fr))`,gap:14}}>
          {trending.map(j=><JobCard key={j.id} job={j}/>)}</div>
      </div>
    </section>

    <section style={{padding:pad,background:C.bg}}>
      <div style={{maxWidth:wrapW,margin:"0 auto"}}>
        {H("Closing soon","Application windows that end in the next two weeks.","Deadlines",null)}
        <div style={{display:"grid",gridTemplateColumns:`repeat(auto-fill,minmax(${mob?260:300}px,1fr))`,gap:14}}>
          {closingSoon.length?closingSoon.map(j=><JobCard key={j.id} job={j}/>):<div style={{color:C.text3,fontSize:14,gridColumn:"1/-1",textAlign:"center",padding:20}}>No deadlines coming up.</div>}</div>
      </div>
    </section>

    <section style={{padding:pad,background:"#fff"}}>
      <div style={{maxWidth:wrapW,margin:"0 auto"}}>
        {H("Three steps, about ten minutes","From setting up your account to sending your first application.","How it works")}
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(3,1fr)",gap:mob?14:20}}>
          {[["user","Build your profile","Add your trade, tickets and the wage you need. Takes about five minutes and works on any device."],
            ["target","Get matched, not spammed","We score every opening against your skills, certifications and location so you only see jobs you can realistically get."],
            ["send","Apply in one tap","Your profile and CV go straight to the employer. Track every application from submission to offer in one place."]].map(([ic,t,b],i)=>
            <div key={t} data-card style={{background:C.bg,borderRadius:20,padding:mob?26:36,border:`1px solid ${C.line}`}}>
              <div style={{fontSize:mob?36:48,fontWeight:780,color:C.brand,letterSpacing:"-.05em",lineHeight:1,marginBottom:20}}>0{i+1}</div>
              <div style={{width:44,height:44,borderRadius:12,background:C.wash,color:C.brand,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:18}}><I n={ic} s={22}/></div>
              <div style={{fontSize:mob?19:22,fontWeight:700,color:C.text,letterSpacing:"-.025em",marginBottom:10,lineHeight:1.25}}>{t}</div>
              <p style={{fontSize:mob?14.5:15.5,color:C.text2,lineHeight:1.65,margin:0}}>{b}</p></div>)}</div>
      </div>
    </section>

    <section style={{padding:pad,background:C.bg}}>
      <div style={{maxWidth:wrapW,margin:"0 auto"}}>
        {H("Certifications that get you hired","Free and paid trainings from providers Canadian employers recognize.","Trainings",
          <Btn kind="outline" iconR="arrowR" onClick={()=>A.go("trainings")}>All trainings</Btn>)}
        <div style={{display:"grid",gridTemplateColumns:`repeat(auto-fill,minmax(${mob?260:280}px,1fr))`,gap:16}}>
          {trainings.map(t=><TrainingCard key={t.id} t={t}/>)}</div>
      </div>
    </section>

    <section style={{padding:pad,background:"#fff"}}>
      <div style={{maxWidth:wrapW,margin:"0 auto"}}>
        {H("From the resource centre","Career guides written by people with hands-on Canadian workplace experience.","Career resources",
          <Btn kind="outline" iconR="arrowR" onClick={()=>A.go("blogs")}>All articles</Btn>)}
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(3,1fr)",gap:mob?14:20}}>
          {blogs.map(b=><BlogCard key={b.id} b={b}/>)}</div>
      </div>
    </section>

    <section style={{padding:pad,background:C.bg}}>
      <div style={{maxWidth:wrapW,margin:"0 auto",display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:16}}>
        <div style={{background:C.brand,borderRadius:24,padding:mob?32:48,color:"#fff"}}>
          <Tag tone="onDark">Job seekers — always free</Tag>
          <h3 style={{fontSize:mob?24:32,fontWeight:730,letterSpacing:"-.03em",margin:"18px 0 14px",lineHeight:1.15}}>Set up your profile once, apply to anything.</h3>
          <p style={{fontSize:mob?15:16,color:"rgba(255,255,255,.85)",lineHeight:1.65,margin:"0 0 28px"}}>
            Add your tickets, your trade and the wage you're looking for. Build up to five CVs for different job types and apply in a tap.</p>
          <Btn kind="onDark" size="lg" iconR="arrowR" onClick={()=>A.go(A.user?.role==="seeker"?"profile":"signup")}>
            {A.user?.role==="seeker"?"Go to my profile":"Create free account"}</Btn></div>
        <div style={{background:C.ink,borderRadius:24,padding:mob?32:48,color:"#fff"}}>
          <Tag tone="onDark">For employers — from free</Tag>
          <h3 style={{fontSize:mob?24:32,fontWeight:730,letterSpacing:"-.03em",margin:"18px 0 14px",lineHeight:1.15}}>Post a role and reach real candidates.</h3>
          <p style={{fontSize:mob?15:16,color:"rgba(255,255,255,.68)",lineHeight:1.65,margin:"0 0 28px"}}>
            Every applicant is scored against your requirements before you open a single CV. Enterprise unlocks the full HR Suite for managing your workforce.</p>
          <Btn kind="primary" size="lg" iconR="arrowR" onClick={()=>A.go(A.user?.role==="employer"?"empPost":"forEmployers")}>Explore employer plans</Btn></div>
      </div>
    </section>

  </div>;
}

/* ═══════════════ BLOGS · TRAININGS · STATIC PAGES ═══════════════ */
export function BlogsPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [cat,setCat]=useState("all"); const [q,setQ]=useState("");
  const pub=A.blogs.filter(b=>b.status==="published");
  const cats=["all",...Array.from(new Set(pub.map(b=>b.cat)))];
  const list=pub.filter(b=>(cat==="all"||b.cat===cat)&&(!q||b.title.toLowerCase().includes(q.toLowerCase())||b.excerpt.toLowerCase().includes(q.toLowerCase())));
  const lead=list[0];
  const pad=mob?"56px 16px":"96px 32px";
  return <div style={{background:"#fff",minHeight:"100%"}}>

    <section style={{padding:pad,background:"#fff"}}>
      <div style={{maxWidth:960,margin:"0 auto",textAlign:"center"}}>
        <Tag tone="brand" icon="book">Career resources</Tag>
        <h1 style={{fontSize:mob?38:68,fontWeight:770,letterSpacing:"-.05em",lineHeight:1.02,margin:"22px auto 26px",color:C.text}}>
          Career resources for Canadian workers</h1>
        <p style={{fontSize:mob?17:20,color:C.text2,lineHeight:1.55,margin:"0 auto",maxWidth:620}}>
          Practical guides on Red Seal certification, provincial trades registration, résumé standards Canadian employers look for, wage data from Statistics Canada, and how to interview well. Every article is written by people with direct experience in Canadian workplaces.</p>
      </div>
    </section>

    <section style={{padding:mob?"0 16px 56px":"0 32px 96px",background:"#fff"}}>
      <div style={{maxWidth:1120,margin:"0 auto"}}>
        <div style={{display:"flex",gap:14,marginBottom:36,flexWrap:"wrap",alignItems:"center"}}>
          <div style={{flex:"1 1 260px",maxWidth:400}}><Input icon="search" placeholder="Search articles" value={q} onChange={e=>setQ(e.target.value)}/></div>
          <Tabs items={cats.map(c=>({k:c,label:c==="all"?"All topics":c}))} value={cat} onChange={setCat}/></div>
        {list.length===0?<Empty icon="book" title="No articles found" body="Try a different topic or search term."
          action={<Btn kind="primary" onClick={()=>{setQ("");setCat("all");}}>Reset</Btn>}/>:<>
          {lead&&!q&&cat==="all"&&<div onClick={()=>A.openBlog(lead.id)} style={{background:"#fff",borderRadius:24,overflow:"hidden",
            border:`1px solid ${C.line}`,cursor:"pointer",marginBottom:32,boxShadow:SH.md,transition:"transform .2s"}}
            onMouseEnter={e=>e.currentTarget.style.transform="translateY(-4px)"}
            onMouseLeave={e=>e.currentTarget.style.transform="none"}>
            <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1.1fr 1fr"}}>
              <div style={{aspectRatio:mob?"16/10":"auto",minHeight:mob?"auto":320,background:C.bg}}>
                <SmartScene kind={lead.scene} tone={lead.tone} w="100%" h={mob?"100%":"100%"} seed={lead.id.length}/></div>
              <div style={{padding:mob?26:44,display:"flex",flexDirection:"column",justifyContent:"center"}}>
                <div style={{display:"flex",gap:8,marginBottom:16}}><Tag tone="brand" sm>{lead.cat}</Tag><Tag tone="warn" sm>Featured</Tag></div>
                <div style={{fontSize:mob?22:30,fontWeight:730,color:C.text,letterSpacing:"-.03em",lineHeight:1.2,marginBottom:16}}>{lead.title}</div>
                <p style={{fontSize:mob?15:16.5,color:C.text2,lineHeight:1.65,margin:"0 0 24px"}}>{lead.excerpt}</p>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <SmartPortrait seed={lead.authorSeed} size={40}/>
                  <div><div style={{fontSize:14,fontWeight:660,color:C.text}}>{lead.author}</div>
                    <div style={{fontSize:13,color:C.text3,marginTop:2}}>{lead.date} • {lead.mins} min read</div></div></div></div></div></div>}
          <div style={{display:"grid",gridTemplateColumns:`repeat(auto-fill,minmax(${mob?260:340}px,1fr))`,gap:mob?14:24}}>
            {(lead&&!q&&cat==="all"?list.slice(1):list).map(b=><BlogCard key={b.id} b={b}/>)}</div></>}
      </div>
    </section>

  </div>;
}

export function BlogPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const b=A.blogs.find(x=>x.id===A.blogId);
  if(!b) return <Page><Empty icon="book" title="Article not found" body="It may have been unpublished."
    action={<Btn kind="primary" onClick={()=>A.go("blogs")}>All articles</Btn>}/></Page>;
  const more=A.blogs.filter(x=>x.status==="published"&&x.id!==b.id).slice(0,3);
  const pad=mob?"44px 16px":"72px 32px";
  return <div style={{background:"#fff",minHeight:"100%"}}>

    <section style={{padding:pad,background:"#fff"}}>
      <div style={{maxWidth:760,margin:"0 auto",textAlign:"center"}}>
        {!mob&&<button onClick={A.back} style={{display:"inline-flex",alignItems:"center",gap:7,background:"none",border:"none",padding:0,
          cursor:"pointer",fontFamily:"inherit",fontSize:14,color:C.text2,marginBottom:28}}><I n="arrowL" s={17}/>All articles</button>}
        <Tag tone="brand" sm>{b.cat}</Tag>
        <h1 style={{fontSize:mob?32:52,fontWeight:770,letterSpacing:"-.045em",color:C.text,margin:"18px 0 22px",lineHeight:1.08}}>{b.title}</h1>
        <p style={{fontSize:mob?16:20,color:C.text2,lineHeight:1.55,margin:"0 auto 28px",maxWidth:640}}>{b.excerpt}</p>
        <div style={{display:"inline-flex",alignItems:"center",gap:12,flexWrap:"wrap",justifyContent:"center"}}>
          <SmartPortrait seed={b.authorSeed} size={44}/>
          <div style={{textAlign:"left"}}><div style={{fontSize:14.5,fontWeight:660,color:C.text}}>{b.author}</div>
            <div style={{fontSize:13,color:C.text3,marginTop:2}}>{b.date} • {b.mins} min read</div></div></div>
      </div>
    </section>

    <section style={{padding:mob?"0 16px 44px":"0 32px 72px",background:"#fff"}}>
      <div style={{maxWidth:960,margin:"0 auto",borderRadius:mob?16:24,overflow:"hidden",aspectRatio:"16/8",background:C.bg,boxShadow:SH.md,border:`1px solid ${C.line}`}}>
        <SmartScene kind={b.scene} tone={b.tone} w="100%" h="100%" seed={b.id.length}/></div>
    </section>

    <section style={{padding:mob?"0 16px 56px":"0 32px 96px",background:"#fff"}}>
      <div style={{maxWidth:720,margin:"0 auto"}}>
        {b.body.map(([h,p],i)=>{
          const isHtml=/<[a-z][^>]*>/i.test(p);
          return <section key={i} style={{marginBottom:i===b.body.length-1?0:36}}>
            {h&&<h2 style={{fontSize:mob?22:28,fontWeight:730,letterSpacing:"-.03em",color:C.text,margin:"0 0 16px",lineHeight:1.25}}>{h}</h2>}
            {isHtml
              ? <div className="blog-body" style={{fontSize:mob?16.5:18,color:C.text2,lineHeight:1.8}} dangerouslySetInnerHTML={{__html:p}}/>
              : <p style={{fontSize:mob?16.5:18,color:C.text2,lineHeight:1.8,margin:0}}>{p}</p>}
          </section>;})}
        <div style={{marginTop:56,paddingTop:36,borderTop:`1px solid ${C.lineSoft}`,display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
          <SmartPortrait seed={b.authorSeed} size={64}/>
          <div style={{flex:"1 1 200px",minWidth:0}}>
            <div style={{fontSize:12.5,fontWeight:700,color:C.text3,letterSpacing:".08em",textTransform:"uppercase",marginBottom:6}}>Written by</div>
            <div style={{fontSize:17,fontWeight:670,color:C.text,letterSpacing:"-.02em"}}>{b.author}</div>
            <div style={{fontSize:14,color:C.text2,marginTop:6,lineHeight:1.6}}>Contributor on the NorthHire careers desk, writing on {b.cat.toLowerCase()} in the Canadian labour market.</div></div>
          <Btn kind="outline" icon="share" onClick={()=>A.share(b)}>Share</Btn></div>
      </div>
    </section>

    <section style={{padding:pad,background:C.bg,borderTop:`1px solid ${C.line}`}}>
      <div style={{maxWidth:1120,margin:"0 auto"}}>
        <div style={{marginBottom:36}}>
          <Tag tone="brand">Keep reading</Tag>
          <h2 style={{fontSize:mob?26:36,fontWeight:750,letterSpacing:"-.04em",color:C.text,margin:"14px 0 0",lineHeight:1.12}}>More from the careers desk.</h2></div>
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(3,1fr)",gap:mob?14:20}}>
          {more.map(x=><BlogCard key={x.id} b={x}/>)}</div>
      </div>
    </section>

  </div>;
}

export function TrainingsPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [cat,setCat]=useState("all"); const [price,setPrice]=useState("all"); const [q,setQ]=useState("");
  const pub=A.trainings.filter(t=>t.status==="published");
  const cats=["all",...Array.from(new Set(pub.map(t=>t.cat)))];
  const list=pub.filter(t=>(cat==="all"||t.cat===cat)&&(price==="all"||(price==="free"?t.price===0:t.price>0))
    &&(!q||t.title.toLowerCase().includes(q.toLowerCase())));
  const pad=mob?"56px 16px":"96px 32px";
  return <div style={{background:"#fff",minHeight:"100%"}}>

    <section style={{padding:pad,background:"#fff"}}>
      <div style={{maxWidth:960,margin:"0 auto",textAlign:"center"}}>
        <Tag tone="brand" icon="cap">Trainings and certifications</Tag>
        <h1 style={{fontSize:mob?38:68,fontWeight:770,letterSpacing:"-.05em",lineHeight:1.02,margin:"22px auto 26px",color:C.text}}>
          Get the ticket the job asks for.</h1>
        <p style={{fontSize:mob?17:20,color:C.text2,lineHeight:1.55,margin:"0 auto 44px",maxWidth:620}}>
          WHMIS, food handling, forklift, working at heights and exam prep. Certificates attach straight to your NorthHire profile.</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:mob?20:44,maxWidth:640,margin:"0 auto"}}>
          {[[pub.filter(t=>t.price===0).length,"Free courses"],[pub.length,"Total courses"],
            [pub.reduce((s,t)=>s+t.enrolled,0).toLocaleString(),"Learners enrolled"]].map(([v,l])=>
            <div key={l}><div style={{fontSize:mob?26:36,fontWeight:760,color:C.brand,letterSpacing:"-.045em",lineHeight:1}}>{v}</div>
              <div style={{fontSize:mob?12:13.5,color:C.text2,marginTop:mob?8:12,fontWeight:550}}>{l}</div></div>)}</div>
      </div>
    </section>

    <section style={{padding:mob?"0 16px 56px":"0 32px 96px",background:"#fff"}}>
      <div style={{maxWidth:1120,margin:"0 auto"}}>
        <div style={{display:"flex",gap:14,marginBottom:20,flexWrap:"wrap",alignItems:"center"}}>
          <div style={{flex:"1 1 240px",maxWidth:360}}><Input icon="search" placeholder="Search trainings" value={q} onChange={e=>setQ(e.target.value)}/></div>
          <Tabs items={[{k:"all",label:"All prices"},{k:"free",label:"Free"},{k:"paid",label:"Paid"}]} value={price} onChange={setPrice}/></div>
        <Tabs items={cats.map(c=>({k:c,label:c==="all"?"All categories":c}))} value={cat} onChange={setCat} style={{marginBottom:36}}/>
        {list.length===0?<Empty icon="cap" title="No trainings found" body="Try another category or clear the filters."
          action={<Btn kind="primary" onClick={()=>{setQ("");setCat("all");setPrice("all");}}>Reset</Btn>}/>
          :<div style={{display:"grid",gridTemplateColumns:`repeat(auto-fill,minmax(${mob?260:280}px,1fr))`,gap:16}}>
            {list.map(t=><TrainingCard key={t.id} t={t}/>)}</div>}
      </div>
    </section>

  </div>;
}

export function TrainingPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const t=A.trainings.find(x=>x.id===A.trainingId);
  if(!t) return <Page><Empty icon="cap" title="Training not found" body="It may have been unpublished."
    action={<Btn kind="primary" onClick={()=>A.go("trainings")}>All trainings</Btn>}/></Page>;
  const enrolled=A.enrolled.has(t.id);
  const prog=A.trainingProgress[t.id]||0;
  const pad=mob?"44px 16px":"72px 32px";
  return <div style={{background:"#fff",minHeight:"100%"}}>

    <section style={{padding:pad,background:"#fff"}}>
      <div style={{maxWidth:1120,margin:"0 auto"}}>
        {!mob&&<button onClick={A.back} style={{display:"inline-flex",alignItems:"center",gap:7,background:"none",border:"none",padding:0,
          cursor:"pointer",fontFamily:"inherit",fontSize:14,color:C.text2,marginBottom:32}}><I n="arrowL" s={17}/>All trainings</button>}
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 380px",gap:mob?28:44,alignItems:"start"}}>
          <div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:20}}>
              <Tag tone="brand">{t.cat}</Tag><Tag>{t.level}</Tag><Tag icon="clock">{t.hours} hours</Tag>
              {t.price===0&&<Tag tone="ok">Free</Tag>}</div>
            <h1 style={{fontSize:mob?32:52,fontWeight:770,letterSpacing:"-.045em",color:C.text,margin:"0 0 20px",lineHeight:1.08}}>{t.title}</h1>
            <p style={{fontSize:mob?16:19,color:C.text2,lineHeight:1.6,margin:"0 0 24px"}}>{t.about}</p>
            <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap",fontSize:14,color:C.text2,paddingTop:24,borderTop:`1px solid ${C.lineSoft}`}}>
              <span style={{display:"flex",alignItems:"center",gap:9}}><SmartPortrait seed={t.providerSeed} size={34}/><strong style={{color:C.text,fontWeight:650}}>{t.provider}</strong></span>
              <span style={{color:C.warn,display:"flex",alignItems:"center",gap:5,fontWeight:660}}><I n="star" s={14} fill={C.warn} w={0}/>{t.rating}</span>
              <span style={{color:C.text3}}>{t.enrolled.toLocaleString()} enrolled</span></div></div>
          <div style={{background:"#fff",borderRadius:20,overflow:"hidden",border:`1px solid ${C.line}`,boxShadow:SH.md}}>
            <div style={{aspectRatio:"16/10",background:C.bg}}><SmartScene kind={t.scene} tone={t.tone} w="100%" h="100%" seed={t.id.length}/></div>
            <div style={{padding:mob?24:28}}>
              <div style={{fontSize:mob?32:40,fontWeight:770,color:C.text,letterSpacing:"-.045em",marginBottom:6,lineHeight:1}}>{t.price===0?"Free":money(t.price)}</div>
              <div style={{fontSize:13,color:C.text2,marginBottom:22}}>{t.price===0?"No cost, certificate included":"One-time payment, lifetime access"}</div>
              {enrolled?<>
                <div style={{marginBottom:16}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:8}}>
                    <span style={{color:C.text2}}>Your progress</span><span style={{fontWeight:680,color:C.brand}}>{prog}%</span></div>
                  <Bar v={prog}/></div>
                <Btn kind="primary" size="lg" full icon="play" onClick={()=>A.advanceTraining(t.id)}>
                  {prog>=100?"Review course":"Continue learning"}</Btn>
                {prog>=100&&<Btn kind="outline" full icon="download" style={{marginTop:10}} onClick={()=>A.printCert(t)}>Download certificate</Btn>}
              </>:<Btn kind="primary" size="lg" full icon="cap" onClick={()=>A.enrol(t.id)}>Enrol now</Btn>}
              <div style={{marginTop:20,paddingTop:18,borderTop:`1px solid ${C.lineSoft}`,display:"flex",flexDirection:"column",gap:11}}>
                {[["clock",`${t.hours} hours of content`],["file","Certificate on completion"],["globe","Fully online, self-paced"],["refresh","Lifetime access to updates"]].map(([ic,l])=>
                  <div key={l} style={{display:"flex",alignItems:"center",gap:11,fontSize:13.5,color:C.text2}}><I n={ic} s={16} c={C.brand}/>{l}</div>)}</div></div></div>
        </div>
      </div>
    </section>

    <section style={{padding:pad,background:C.bg,borderTop:`1px solid ${C.line}`}}>
      <div style={{maxWidth:1120,margin:"0 auto",display:"grid",gridTemplateColumns:mob?"1fr":"1fr 340px",gap:mob?24:32,alignItems:"start"}}>
        <div>
          <div style={{background:"#fff",borderRadius:20,padding:mob?26:36,border:`1px solid ${C.line}`,marginBottom:20}}>
            <div style={{fontSize:mob?22:28,fontWeight:730,letterSpacing:"-.03em",color:C.text,marginBottom:20,lineHeight:1.2}}>What you will learn</div>
            <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:14}}>
              {t.outcomes.map(o=><div key={o} style={{display:"flex",gap:12,alignItems:"flex-start",fontSize:14.5,color:C.text2,lineHeight:1.6}}>
                <span style={{color:C.ok,marginTop:2,flexShrink:0,display:"flex"}}><I n="check" s={17} w={2.4}/></span>{o}</div>)}</div></div>
          <div style={{background:"#fff",borderRadius:20,padding:mob?26:36,border:`1px solid ${C.line}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:20,flexWrap:"wrap",gap:12}}>
              <div style={{fontSize:mob?22:28,fontWeight:730,letterSpacing:"-.03em",color:C.text,lineHeight:1.2}}>Course content</div>
              <div style={{fontSize:13,color:C.text3}}>{t.mods.length} modules • {t.hours} hours</div></div>
            {t.mods.map((m,i)=>{const done=enrolled&&prog>=Math.round(((i+1)/t.mods.length)*100);
              return <div key={m} style={{display:"flex",alignItems:"center",gap:14,padding:"16px 0",
                borderBottom:i<t.mods.length-1?`1px solid ${C.lineSoft}`:"none"}}>
                <div style={{width:36,height:36,borderRadius:10,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",
                  background:done?C.okBg:C.bg,color:done?C.ok:C.text3,fontSize:13.5,fontWeight:700}}>
                  {done?<I n="check" s={17} w={2.6}/>:i+1}</div>
                <div style={{flex:1,minWidth:0,fontSize:15,color:C.text,fontWeight:540}}>{m}</div>
                <span style={{fontSize:13,color:C.text3,flexShrink:0}}>{Math.round(t.hours/t.mods.length*10)/10} h</span></div>;})}</div></div>
        <div style={{background:"#fff",borderRadius:20,padding:mob?24:28,border:`1px solid ${C.line}`}}>
          <Lbl>Related jobs</Lbl>
          {A.jobs.filter(j=>j.status==="live").slice(0,4).map((j,i,arr)=>{const e=A.emp(j.e);
            return <button key={j.id} onClick={()=>A.openJob(j.id)} style={{display:"flex",gap:12,alignItems:"center",width:"100%",
              padding:"14px 0",background:"none",border:"none",borderBottom:i<arr.length-1?`1px solid ${C.lineSoft}`:"none",cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
              <EmpMark e={e} size={40} radius={10}/>
              <div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:640,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{j.t}</div>
                <div style={{fontSize:12.5,color:C.text3,marginTop:3}}>{pay(j)}{payShort(j)}</div></div>
              <I n="chevR" s={15} c={C.text3}/></button>;})}</div>
      </div>
    </section>

  </div>;
}

/* ═══════════════ STATIC PAGES ═══════════════ */
export function AboutPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const team=[
    {seed:3,name:"Marcus Bediako",role:"Co-founder & CEO",from:"Journeyperson Electrician"},
    {seed:2,name:"Priya Raman",role:"Co-founder & COO",from:"Nurse Manager"},
    {seed:5,name:"Jomar Villanueva",role:"Head of Employer Partnerships",from:"Fleet Operations"},
    {seed:4,name:"Amelie Fortin",role:"Head of Product",from:"Product Lead, ex-Shopify"},
    {seed:6,name:"Daniel Kovacs",role:"Engineering Lead",from:"Warehouse Manager"},
    {seed:8,name:"Linda Osei",role:"Head of Support",from:"Restaurant GM"},
    {seed:9,name:"Omar Haddad",role:"Data Science",from:"Data Scientist, ex-Wealthsimple"},
    {seed:11,name:"Sofia Reyes",role:"Design",from:"Designer, ex-Loblaw Digital"},
  ];
  const offices=[
    {city:"Toronto",addr:"250 Front St W",kind:"office",role:"Head office",team:"42 people"},
    {city:"Calgary",addr:"525 8th Ave SW",kind:"trades",role:"Trades & West",team:"18 people"},
    {city:"Montreal",addr:"1250 René-Lévesque",kind:"office",role:"Product & French",team:"14 people"},
    {city:"Halifax",addr:"1959 Upper Water",kind:"care",role:"Healthcare & Atlantic",team:"9 people"},
  ];
  const press=["The Globe and Mail","Financial Post","CBC News","Toronto Star","BetaKit","Maclean's","La Presse","Canadian Business"];
  const investors=["Golden Ventures","Real Ventures","BDC Capital","Inovia","Version One","OMERS Ventures"];
  const values=[
    {ic:"wallet",t:"Real wages, always",b:"Every listing publishes a wage. If an employer will not state one, they cannot post."},
    {ic:"heart",t:"Every kind of work",b:"Trades, care, transport, kitchens, warehouses. Built for the ninety percent."},
    {ic:"shield",t:"Your data is yours",b:"No selling profiles. No advertising against searches. Export anything."},
    {ic:"users",t:"A real person answers",b:"Support you can actually reach. In Canada. Within one business day."},
  ];
  const history=[
    {y:"2023",t:"An idea",b:"Marcus applied to forty electrician jobs. Not one said what it paid."},
    {y:"2024",t:"First hundred",b:"A hundred employers agreed to publish real wages. Every one filled roles faster than they expected."},
    {y:"2025",t:"Coast to coast",b:"Every province and territory. Twelve industries. Fifty thousand hires."},
    {y:"2026",t:"Today",b:"Four thousand employers. Six hundred thousand job seekers. Still zero listings without a wage."},
  ];
  const whyus=[
    {ic:"target",t:"Applicants ranked for you",b:"Every application is scored the moment it lands, so the first CV you open is the best fit."},
    {ic:"sparkle",t:"AI that shows its work",b:"Every match score comes with reasons. No black box, no bias amplification, fully auditable."},
    {ic:"users",t:"The people you're missing",b:"Reach candidates on the platform who match but haven't applied yet. One tap to invite."},
    {ic:"activity",t:"Analytics you use",b:"Applications per day, drop-off between stages, source attribution. Not a vanity dashboard."},
    {ic:"globe",t:"Built for Canada",b:"French and English, every province, PIPEDA-native, wage transparency compliant from day one."},
    {ic:"download",t:"Nothing locked in",b:"No contracts. No per-applicant fees. Export everything. Leave any time."},
  ];
  const faq=[
    ["Is NorthHire free for job seekers?","Yes. Free forever. No premium tier."],
    ["Where do you operate?","Every province and territory in Canada, in English and French."],
    ["How do you make money?","Employer subscriptions, starting at $49 a month. Job seekers pay nothing."],
    ["How do you verify employers?","Business number, incorporation lookup, and a manual check by our Toronto team within one business day."],
    ["Do you use AI on my data?","We use scoring models on your application to match you to jobs. We do not sell your data or train external models on it."],
    ["Can I delete my account?","Yes, any time, from your settings page. Full deletion under PIPEDA within thirty days."],
  ];
  const [faqOpen,setFaqOpen]=useState(-1);
  const pad = mob ? "56px 16px" : "96px 32px";
  const padTight = mob ? "44px 16px" : "72px 32px";
  const H = (title,sub,tag)=><div style={{textAlign:"center",maxWidth:720,margin:"0 auto 48px"}}>
    {tag&&<Tag tone="brand">{tag}</Tag>}
    <h2 style={{fontSize:mob?30:44,fontWeight:750,letterSpacing:"-.04em",color:C.text,margin:"14px 0 14px",lineHeight:1.1}}>{title}</h2>
    {sub&&<p style={{fontSize:mob?15.5:17,color:C.text2,lineHeight:1.6,margin:0}}>{sub}</p>}</div>;

  return <div style={{background:"#fff",minHeight:"100%"}}>

    <section style={{padding:pad,background:"#fff"}}>
      <div style={{maxWidth:1120,margin:"0 auto",textAlign:"center"}}>
        <Tag tone="brand">About NorthHire</Tag>
        <h1 style={{fontSize:mob?38:76,fontWeight:770,letterSpacing:"-.05em",lineHeight:1.02,margin:"22px auto 26px",maxWidth:900,color:C.text}}>
          The job platform Canada has been waiting for</h1>
        <p style={{fontSize:mob?17:21,color:C.text2,lineHeight:1.55,margin:"0 auto 40px",maxWidth:640}}>
          NorthHire was founded by a registered nurse, a Red Seal electrician and a long-haul driver who were tired of watching Canadian workers navigate job platforms built somewhere else, for someone else. We built NorthHire for the trades, the care workers, the drivers, the cooks and the warehouse crews who make this country run.</p>
        <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
          <Btn kind="primary" size="lg" iconR="arrowR" onClick={()=>A.go("forEmployers")}>See how it works</Btn>
          <Btn kind="outline" size="lg" onClick={()=>A.go(A.user?.role==="seeker"?"profile":"signup")}>Create a free account</Btn></div>
        <div style={{marginTop:mob?48:64,borderRadius:mob?16:24,overflow:"hidden",boxShadow:SH.xl,border:`1px solid ${C.line}`}}>
          <div style={{aspectRatio:mob?"16/11":"16/8",width:"100%",background:C.bg,position:"relative"}}>
            <SmartScene kind="office" seed={7} w="100%" h="100%" style={{position:"absolute",inset:0}}/></div></div>
      </div>
    </section>

    <section style={{padding:padTight,background:"#fff",borderTop:`1px solid ${C.lineSoft}`,borderBottom:`1px solid ${C.lineSoft}`}}>
      <div style={{maxWidth:1120,margin:"0 auto",textAlign:"center"}}>
        <div style={{fontSize:12.5,fontWeight:600,color:C.text3,letterSpacing:".14em",textTransform:"uppercase",marginBottom:mob?24:28}}>
          Featured in</div>
        <div style={{display:"grid",gridTemplateColumns:`repeat(${mob?2:4},1fr)`,gap:mob?"20px 16px":"32px",alignItems:"center",justifyItems:"center"}}>
          {press.map(p=><div key={p} style={{fontSize:mob?15:18,fontWeight:600,color:C.text3,letterSpacing:"-.02em",opacity:.75}}>{p}</div>)}</div>
      </div>
    </section>

    <section style={{padding:pad,background:C.bg}}>
      <div style={{maxWidth:1120,margin:"0 auto"}}>
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1.15fr",gap:mob?36:64,alignItems:"center"}}>
          <div>
            <Tag tone="brand">Our mission</Tag>
            <h2 style={{fontSize:mob?30:44,fontWeight:740,letterSpacing:"-.04em",color:C.text,margin:"14px 0 22px",lineHeight:1.1}}>
              Every job posting should tell you what it pays.</h2>
            <p style={{fontSize:mob?15.5:17,color:C.text2,lineHeight:1.7,margin:"0 0 16px"}}>
              For decades, Canadians have applied to jobs blind. No wage. No requirements clearly stated. No idea whether they even qualified.</p>
            <p style={{fontSize:mob?15.5:17,color:C.text2,lineHeight:1.7,margin:"0 0 24px"}}>
              We're building a platform where every listing is honest, every applicant is scored, and every hire is made on facts — not luck.</p>
            <Btn kind="outline" iconR="arrowR" onClick={()=>A.go("blogs")}>Read our manifesto</Btn></div>
          <div style={{borderRadius:20,overflow:"hidden",aspectRatio:"4/3",boxShadow:SH.lg,border:`1px solid ${C.line}`}}>
            <SmartScene kind="trades" seed={3} w="100%" h="100%"/></div>
        </div>
      </div>
    </section>

    <section style={{padding:pad,background:"#fff"}}>
      <div style={{maxWidth:1120,margin:"0 auto"}}>
        {H("The numbers so far.","Three years, one promise kept.","By the numbers")}
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"repeat(4,1fr)",gap:mob?12:0,border:mob?"none":`1px solid ${C.line}`,borderRadius:20,overflow:"hidden"}}>
          {[["612k+","Job seekers"],["4,180","Employers"],["21,340","Live jobs"],["50k+","Hires made"]].map(([v,l],i)=>
            <div key={l} style={{padding:mob?"28px 20px":"44px 32px",background:"#fff",textAlign:"center",
              borderRight:!mob&&i<3?`1px solid ${C.line}`:"none",border:mob?`1px solid ${C.line}`:"none",borderRadius:mob?16:0}}>
              <div style={{fontSize:mob?38:56,fontWeight:770,color:C.brand,letterSpacing:"-.05em",lineHeight:1}}>{v}</div>
              <div style={{fontSize:mob?13:14,color:C.text2,marginTop:12,fontWeight:550}}>{l}</div></div>)}</div>
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(3,1fr)",gap:12,marginTop:12}}>
          {[["11 days","Median time to hire"],["13/13","Provinces and territories"],["EN + FR","Fully bilingual"]].map(([v,l])=>
            <div key={l} style={{padding:mob?"22px 20px":"32px 28px",background:C.bg,borderRadius:16,textAlign:"center"}}>
              <div style={{fontSize:mob?26:32,fontWeight:730,color:C.text,letterSpacing:"-.035em",lineHeight:1}}>{v}</div>
              <div style={{fontSize:13,color:C.text2,marginTop:10}}>{l}</div></div>)}</div>
      </div>
    </section>

    <section style={{padding:pad,background:C.bg}}>
      <div style={{maxWidth:1120,margin:"0 auto"}}>
        {H("What we believe.","Four promises. We will not compromise on them.","Values")}
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:mob?12:16}}>
          {values.map(v=><div key={v.t} style={{background:"#fff",borderRadius:20,padding:mob?26:36,border:`1px solid ${C.line}`}}>
            <div style={{width:52,height:52,borderRadius:14,background:C.wash,color:C.brand,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:22}}>
              <I n={v.ic} s={26}/></div>
            <div style={{fontSize:mob?19:22,fontWeight:700,color:C.text,letterSpacing:"-.025em",marginBottom:10,lineHeight:1.25}}>{v.t}</div>
            <p style={{fontSize:mob?14.5:15.5,color:C.text2,lineHeight:1.65,margin:0}}>{v.b}</p></div>)}</div>
      </div>
    </section>

    <section style={{padding:pad,background:"#fff"}}>
      <div style={{maxWidth:1120,margin:"0 auto"}}>
        {H("Why teams choose us.","Same platform, whether you hire two or two hundred.","Why NorthHire")}
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(3,1fr)",gap:mob?14:20}}>
          {whyus.map(w=><div key={w.t} style={{padding:mob?"22px 4px":"28px 8px"}}>
            <div style={{width:44,height:44,borderRadius:12,background:C.wash,color:C.brand,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:18}}>
              <I n={w.ic} s={22}/></div>
            <div style={{fontSize:mob?17:18.5,fontWeight:680,color:C.text,letterSpacing:"-.02em",marginBottom:9}}>{w.t}</div>
            <p style={{fontSize:mob?14:14.5,color:C.text2,lineHeight:1.65,margin:0}}>{w.b}</p></div>)}</div>
      </div>
    </section>

    <section style={{padding:pad,background:C.bg}}>
      <div style={{maxWidth:1120,margin:"0 auto"}}>
        {H("Our history.","Three years. Four moments.","The journey")}
        <div style={{position:"relative"}}>
          {!mob&&<div style={{position:"absolute",left:"50%",top:8,bottom:8,width:2,background:C.line,transform:"translateX(-1px)"}}/>}
          {history.map((h,i)=>{const left=i%2===0;
            return <div key={h.y} style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 60px 1fr",gap:mob?0:20,alignItems:"center",marginBottom:mob?24:44}}>
              <div style={{gridColumn:mob?"1":left?"1":"3",textAlign:mob?"left":left?"right":"left",padding:mob?0:"0 8px"}}>
                <div style={{fontSize:mob?13:14,fontWeight:700,color:C.brand,letterSpacing:".08em",textTransform:"uppercase",marginBottom:mob?6:10}}>{h.y}</div>
                <div style={{fontSize:mob?21:26,fontWeight:730,color:C.text,letterSpacing:"-.03em",marginBottom:10,lineHeight:1.2}}>{h.t}</div>
                <p style={{fontSize:mob?14.5:15.5,color:C.text2,lineHeight:1.65,margin:0}}>{h.b}</p></div>
              {!mob&&<div style={{gridColumn:"2",display:"flex",justifyContent:"center"}}>
                <div style={{width:16,height:16,borderRadius:99,background:C.brand,border:"4px solid #fff",boxShadow:`0 0 0 2px ${C.brand}`}}/></div>}
            </div>;})}</div>
      </div>
    </section>

    <section style={{padding:pad,background:"#fff"}}>
      <div style={{maxWidth:1200,margin:"0 auto"}}>
        {H("The people behind it.","Half the team has worked in the industries we serve.","Team")}
        <div style={{display:"grid",gridTemplateColumns:`repeat(auto-fill,minmax(${mob?150:220}px,1fr))`,gap:mob?12:20}}>
          {team.map(p=><div key={p.name}>
            <div style={{aspectRatio:"1",borderRadius:16,overflow:"hidden",background:C.bg,marginBottom:14}}>
              <SmartPortrait seed={p.seed} size="100%" radius={0}/></div>
            <div style={{fontSize:mob?15:16.5,fontWeight:680,color:C.text,letterSpacing:"-.02em"}}>{p.name}</div>
            <div style={{fontSize:mob?13:13.5,color:C.brand,fontWeight:580,marginTop:3}}>{p.role}</div>
            <div style={{fontSize:12.5,color:C.text3,marginTop:6,lineHeight:1.5}}>Before: {p.from}</div></div>)}</div>
      </div>
    </section>

    <section style={{padding:pad,background:C.bg}}>
      <div style={{maxWidth:1120,margin:"0 auto"}}>
        {H("Where you'll find us.","Four offices. One country.","Offices")}
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:mob?14:20}}>
          {offices.map(o=><div key={o.city} style={{background:"#fff",borderRadius:20,overflow:"hidden",border:`1px solid ${C.line}`}}>
            <div style={{aspectRatio:"16/9",background:C.bg}}><SmartScene kind={o.kind} seed={o.city.length} w="100%" h="100%"/></div>
            <div style={{padding:mob?22:28}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:8}}>
                <div style={{fontSize:mob?21:25,fontWeight:720,color:C.text,letterSpacing:"-.03em"}}>{o.city}</div>
                <Tag tone="brand" sm>{o.team}</Tag></div>
              <div style={{fontSize:14.5,color:C.text,fontWeight:550}}>{o.role}</div>
              <div style={{fontSize:13.5,color:C.text2,marginTop:6,display:"flex",alignItems:"center",gap:6}}>
                <I n="pin" s={13} c={C.text3}/>{o.addr}</div></div></div>)}</div>
      </div>
    </section>

    <section style={{padding:padTight,background:"#fff",borderTop:`1px solid ${C.lineSoft}`,borderBottom:`1px solid ${C.lineSoft}`}}>
      <div style={{maxWidth:1120,margin:"0 auto",textAlign:"center"}}>
        <div style={{fontSize:12.5,fontWeight:600,color:C.text3,letterSpacing:".14em",textTransform:"uppercase",marginBottom:mob?24:28}}>
          Backed by</div>
        <div style={{display:"grid",gridTemplateColumns:`repeat(${mob?2:3},1fr)`,gap:mob?"20px 16px":"28px",alignItems:"center",justifyItems:"center"}}>
          {investors.map(v=><div key={v} style={{fontSize:mob?15:18,fontWeight:600,color:C.text3,letterSpacing:"-.02em",opacity:.75}}>{v}</div>)}</div>
      </div>
    </section>

    <section style={{padding:pad,background:C.bg}}>
      <div style={{maxWidth:1120,margin:"0 auto"}}>
        {H("Fresh from the blog.","Career tips, hiring data, sector deep dives.","Latest updates")}
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(3,1fr)",gap:mob?14:20}}>
          {(SEED_BLOGS||[]).slice(0,3).map(b=><div key={b.id} onClick={()=>{A.setBlog(b.id);A.go("blog");}}
            style={{background:"#fff",borderRadius:20,overflow:"hidden",border:`1px solid ${C.line}`,cursor:"pointer",transition:"transform .2s"}}
            onMouseEnter={e=>e.currentTarget.style.transform="translateY(-4px)"}
            onMouseLeave={e=>e.currentTarget.style.transform="none"}>
            <div style={{aspectRatio:"16/10",background:C.bg}}><SmartScene kind={b.kind||"office"} seed={b.id.length} w="100%" h="100%"/></div>
            <div style={{padding:mob?22:26}}>
              <Tag tone="brand" sm>{b.tag||"Insight"}</Tag>
              <div style={{fontSize:mob?17:18,fontWeight:680,color:C.text,letterSpacing:"-.02em",margin:"12px 0 8px",lineHeight:1.3}}>{b.title}</div>
              <div style={{fontSize:13,color:C.text3}}>{b.readMin||5} min read</div></div></div>)}</div>
        <div style={{textAlign:"center",marginTop:32}}>
          <Btn kind="outline" iconR="arrowR" onClick={()=>A.go("blogs")}>All posts</Btn></div>
      </div>
    </section>

    <section style={{padding:pad,background:"#fff"}}>
      <div style={{maxWidth:1120,margin:"0 auto"}}>
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1.1fr 1fr",gap:mob?36:64,alignItems:"center"}}>
          <div style={{borderRadius:20,overflow:"hidden",aspectRatio:"4/3",boxShadow:SH.lg,border:`1px solid ${C.line}`}}>
            <SmartScene kind="office" seed={2} w="100%" h="100%"/></div>
          <div>
            <Tag tone="brand">We're hiring</Tag>
            <h2 style={{fontSize:mob?30:44,fontWeight:740,letterSpacing:"-.04em",color:C.text,margin:"14px 0 20px",lineHeight:1.1}}>
              Come build with us.</h2>
            <p style={{fontSize:mob?15.5:17,color:C.text2,lineHeight:1.7,margin:"0 0 28px"}}>
              Engineers, designers, employer partnerships, support. Remote across Canada. Real ownership from day one.</p>
            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:28}}>
              {[["Senior Product Engineer","Remote · Full-time"],["Employer Success Manager","Toronto · Full-time"],["Designer, Growth","Remote · Full-time"]].map(([r,l])=>
                <div key={r} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 18px",background:C.bg,borderRadius:12,border:`1px solid ${C.line}`}}>
                  <div><div style={{fontSize:14.5,fontWeight:640,color:C.text}}>{r}</div>
                    <div style={{fontSize:12.5,color:C.text3,marginTop:3}}>{l}</div></div>
                  <I n="chevR" s={16} c={C.text3}/></div>)}</div>
            <Btn kind="primary" iconR="arrowR" onClick={()=>A.go("contact")}>See all openings</Btn></div>
        </div>
      </div>
    </section>

    <section style={{padding:pad,background:C.bg}}>
      <div style={{maxWidth:820,margin:"0 auto"}}>
        {H("Common questions.","Short answers. No sales speak.","FAQ")}
        <div style={{background:"#fff",borderRadius:20,border:`1px solid ${C.line}`,overflow:"hidden"}}>
          {faq.map(([q,a],i)=><div key={q} style={{borderBottom:i<faq.length-1?`1px solid ${C.lineSoft}`:"none"}}>
            <button onClick={()=>setFaqOpen(faqOpen===i?-1:i)} style={{width:"100%",display:"flex",justifyContent:"space-between",
              alignItems:"center",gap:14,padding:mob?"20px 22px":"24px 28px",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
              <span style={{fontSize:mob?15.5:16.5,fontWeight:650,color:C.text,lineHeight:1.4,letterSpacing:"-.015em"}}>{q}</span>
              <span style={{color:C.brand,transform:faqOpen===i?"rotate(180deg)":"none",transition:"transform .22s",flexShrink:0}}><I n="chevD" s={19} w={2.2}/></span></button>
            {faqOpen===i&&<div style={{padding:mob?"0 22px 22px":"0 28px 26px",fontSize:mob?14.5:15,color:C.text2,lineHeight:1.72}}>{a}</div>}</div>)}</div>
      </div>
    </section>

    <section style={{padding:pad,background:"#fff"}}>
      <div style={{maxWidth:1120,margin:"0 auto",background:C.ink,borderRadius:24,padding:mob?"48px 24px":"80px 60px",textAlign:"center",color:"#fff",position:"relative",overflow:"hidden"}}>
        <h2 style={{fontSize:mob?30:48,fontWeight:770,letterSpacing:"-.045em",margin:"0 0 18px",lineHeight:1.05}}>
          Say hello.</h2>
        <p style={{fontSize:mob?15.5:18,color:"rgba(255,255,255,.7)",margin:"0 auto 36px",maxWidth:520,lineHeight:1.6}}>
          A real person, within one business day. From <span style={{color:"#6AACFF",fontWeight:600}}>support@northhire.ca</span>.</p>
        <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
          <Btn kind="primary" size="lg" icon="mail" onClick={()=>A.go("contact")}>Contact us</Btn>
          <Btn kind="onDark" size="lg" onClick={()=>A.go(A.user?.role==="seeker"?"profile":"signup")}>Create an account</Btn></div>
      </div>
    </section>
  </div>;
}
export function ContactPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [f,setF]=useState({name:A.user?.name||"",email:A.user?.email||"",topic:"General",msg:""});
  const [err,setErr]=useState({}); const [sent,setSent]=useState(false);
  const set=(k,v)=>{setF(p=>({...p,[k]:v}));setErr(e=>({...e,[k]:undefined}));};
  const submit=()=>{const e={};
    if(!f.name.trim())e.name="Required";
    if(!f.email.includes("@"))e.email="Enter a valid email";
    if(f.msg.trim().length<10)e.msg="A bit more, please";
    setErr(e); if(Object.keys(e).length)return;
    A.logActivity("contact.submitted",`Contact: ${f.topic}`); setSent(true);};
  const pad=mob?"56px 16px":"96px 32px";

  if(sent) return <div style={{background:"#fff",padding:pad}}>
    <div style={{maxWidth:560,margin:"0 auto",textAlign:"center"}}>
      <div style={{width:88,height:88,borderRadius:99,background:C.okBg,border:`2px solid ${C.okLn}`,display:"flex",
        alignItems:"center",justifyContent:"center",margin:"0 auto 32px"}}>
        <I n="check" s={44} c={C.ok} w={2.6}/></div>
      <h1 style={{fontSize:mob?32:44,fontWeight:750,letterSpacing:"-.045em",color:C.text,margin:"0 0 18px",lineHeight:1.1}}>Message received.</h1>
      <p style={{fontSize:mob?16:18,color:C.text2,lineHeight:1.6,margin:"0 auto 36px",maxWidth:440}}>
        Thanks {f.name.split(" ")[0]}. We'll reply to <strong style={{color:C.text}}>{f.email}</strong> by end of the next business day.</p>
      <Btn kind="primary" size="lg" onClick={()=>A.go("home")}>Back to home</Btn></div></div>;

  const topics=[["General","Something else"],["Job seeker","Help with my account"],["Hiring","Sales or demo"],["Report","Suspicious posting"]];
  const offices=[{city:"Toronto",addr:"250 Front St W",phone:"1 888 555 0142"},
    {city:"Calgary",addr:"525 8th Ave SW",phone:"1 888 555 0143"},
    {city:"Montreal",addr:"1250 René-Lévesque",phone:"1 888 555 0144"},
    {city:"Halifax",addr:"1959 Upper Water",phone:"1 888 555 0145"}];

  return <div style={{background:"#fff",minHeight:"100%"}}>

    <section style={{padding:pad,background:"#fff"}}>
      <div style={{maxWidth:920,margin:"0 auto",textAlign:"center"}}>
        <Tag tone="brand">Contact us</Tag>
        <h1 style={{fontSize:mob?38:72,fontWeight:770,letterSpacing:"-.05em",lineHeight:1.02,margin:"22px auto 26px",color:C.text}}>
          Talk to a real person</h1>
        <p style={{fontSize:mob?17:20,color:C.text2,lineHeight:1.55,margin:"0 auto",maxWidth:560}}>
          Our support team is based in Canada and responds to every message within one business day. Most people hear back the same day.</p>
      </div>
    </section>

    <section style={{padding:mob?"0 16px 56px":"0 32px 96px",background:"#fff"}}>
      <div style={{maxWidth:1120,margin:"0 auto",display:"grid",gridTemplateColumns:mob?"1fr":"1.3fr 1fr",gap:mob?24:32,alignItems:"start"}}>
        <div style={{background:"#fff",border:`1px solid ${C.line}`,borderRadius:24,padding:mob?28:44}}>
          <div style={{marginBottom:28}}>
            <Lbl>What is this about?</Lbl>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:10}}>
              {topics.map(([k,label])=>{const on=f.topic===k;
                return <button key={k} onClick={()=>set("topic",k)} style={{padding:mob?"14px 14px":"16px 18px",borderRadius:14,cursor:"pointer",
                  fontFamily:"inherit",textAlign:"left",lineHeight:1.35,transition:"all .16s",
                  border:`1.5px solid ${on?C.brand:C.line}`,background:on?C.wash:"#fff"}}>
                  <div style={{fontSize:14.5,fontWeight:on?680:600,color:on?C.brand:C.text}}>{k}</div>
                  <div style={{fontSize:12.5,color:C.text3,fontWeight:400,marginTop:3}}>{label}</div></button>;})}</div></div>
          <div style={{display:"flex",flexDirection:"column",gap:20}}>
            <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:14}}>
              <Field label="Name" required error={err.name}><Input value={f.name} onChange={e=>set("name",e.target.value)} placeholder="Your name" invalid={!!err.name}/></Field>
              <Field label="Email" required error={err.email}><Input icon="mail" type="email" value={f.email} onChange={e=>set("email",e.target.value)} placeholder="you@example.ca" invalid={!!err.email}/></Field></div>
            <Field label="Message" required error={err.msg}>
              <Area rows={7} value={f.msg} onChange={e=>set("msg",e.target.value)} invalid={!!err.msg} placeholder="Tell us what's going on."/></Field>
            <Btn kind="primary" size="lg" icon="send" onClick={submit}>Send message</Btn></div>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div style={{background:C.bg,borderRadius:20,padding:mob?24:28,border:`1px solid ${C.line}`}}>
            <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:20}}>
              <SmartPortrait seed={2} size={56}/>
              <div><div style={{fontSize:15,fontWeight:670,color:C.text}}>Priya answers most days</div>
                <div style={{fontSize:13,color:C.text2,marginTop:3}}>Head of Support</div></div></div>
            <div style={{fontSize:13.5,color:C.text2,lineHeight:1.6,marginBottom:20,paddingBottom:20,borderBottom:`1px solid ${C.lineSoft}`}}>
              Six of us on the desk. Mon–Fri, 8am–8pm ET. Weekends we check on Monday.</div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {[["mail","Email","support@northhire.ca"],["phone","Phone","1 888 555 0142"]].map(([ic,k,v])=>
                <div key={v} style={{display:"flex",gap:12,alignItems:"center"}}>
                  <div style={{width:36,height:36,borderRadius:10,background:"#fff",color:C.brand,display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${C.line}`}}><I n={ic} s={16}/></div>
                  <div><div style={{fontSize:12,color:C.text3}}>{k}</div>
                    <div style={{fontSize:14,color:C.text,fontWeight:600,marginTop:1}}>{v}</div></div></div>)}</div></div>
          <div style={{background:"#fff",borderRadius:20,padding:mob?24:28,border:`1px solid ${C.line}`}}>
            <Lbl>Looking for help?</Lbl>
            <div style={{display:"flex",flexDirection:"column",marginTop:6}}>
              {[["book","Career resources","blogs"],["cap","Free trainings","trainings"],["building","For employers","forEmployers"],["wallet","Pricing","pricing"]].map(([ic,l,p])=>
                <button key={l} onClick={()=>A.go(p)} style={{display:"flex",alignItems:"center",gap:12,justifyContent:"space-between",
                  background:"none",border:"none",padding:"12px 0",cursor:"pointer",fontFamily:"inherit",fontSize:14,color:C.text,fontWeight:540,borderBottom:`1px solid ${C.lineSoft}`}}>
                  <span style={{display:"flex",alignItems:"center",gap:11}}><I n={ic} s={15} c={C.brand}/>{l}</span>
                  <I n="chevR" s={14} c={C.text3}/></button>)}</div></div>
        </div>
      </div>
    </section>

    <section style={{padding:pad,background:C.bg}}>
      <div style={{maxWidth:1120,margin:"0 auto"}}>
        <div style={{textAlign:"center",maxWidth:640,margin:"0 auto 48px"}}>
          <Tag tone="brand">Our offices</Tag>
          <h2 style={{fontSize:mob?30:44,fontWeight:750,letterSpacing:"-.04em",color:C.text,margin:"14px 0 14px",lineHeight:1.1}}>
            Or visit us in person.</h2>
          <p style={{fontSize:mob?15.5:17,color:C.text2,lineHeight:1.6,margin:0}}>Four cities. Coffee on us.</p></div>
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:mob?14:20}}>
          {offices.map(o=><div key={o.city} style={{background:"#fff",borderRadius:20,overflow:"hidden",border:`1px solid ${C.line}`}}>
            <div style={{aspectRatio:"16/9",background:C.bg}}><SmartScene kind={["office","trades","office","care"][offices.indexOf(o)]} seed={o.city.length} w="100%" h="100%"/></div>
            <div style={{padding:mob?24:28}}>
              <div style={{fontSize:mob?22:26,fontWeight:720,color:C.text,letterSpacing:"-.03em",marginBottom:14}}>{o.city}</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div style={{fontSize:14,color:C.text2,display:"flex",alignItems:"center",gap:8}}><I n="pin" s={14} c={C.brand}/>{o.addr}</div>
                <div style={{fontSize:14,color:C.text2,display:"flex",alignItems:"center",gap:8}}><I n="phone" s={14} c={C.brand}/>{o.phone}</div></div></div></div>)}</div>
      </div>
    </section>
  </div>;
}
export function LegalPage({kind}){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const privacy=[["Who we are","NorthHire Technologies Inc. is a Canadian company headquartered in Toronto, Ontario. We operate the NorthHire job platform. This policy explains what personal information we collect, why, and what you can do about it. It is written to meet the requirements of PIPEDA and applicable provincial privacy legislation."],
    ["What we collect","For job seekers: your name, contact details, work eligibility status, employment history, skills and certifications, the CVs you build, the jobs you save and the applications you send. For employers: business contact details, company information and billing details. For everyone: basic technical data such as device type and pages visited, used to keep the service working."],
    ["Why we collect it","We use your information to match you to relevant openings, to send your application to an employer when you choose to apply, to notify you about your applications, and to keep the platform secure. We do not use your profile to train advertising models and we do not sell your data to third parties."],
    ["Who sees your information","An employer only receives your profile, CV and answers when you actively submit an application to their posting. Employers cannot browse your profile without your consent unless you have switched profile visibility on in Settings. Our own staff access personal data only where necessary for support or moderation, and that access is logged."],
    ["Your rights","You may access, correct, export or delete your personal information at any time from Settings, or by writing to privacy@northhire.ca. We respond to access requests within thirty days. Deleting your account removes your profile, CVs and saved jobs; applications already sent remain with the employer, who becomes the controller of that copy."],
    ["Retention","Active accounts are retained while in use. Accounts inactive for 36 months are deleted automatically after two notices to your registered email. Application records are retained for 24 months to support dispute resolution, then removed."],
    ["Cookies","We use strictly necessary cookies for sign-in and security, and a small number of analytics cookies to understand which parts of the product are used. You can decline analytics cookies without losing any functionality."],
    ["Changes and contact","We will notify registered users by email at least fourteen days before any material change to this policy. Questions or complaints can be directed to privacy@northhire.ca, and you may also contact the Office of the Privacy Commissioner of Canada."]];
  const terms=[["Acceptance","By creating an account or using NorthHire you agree to these terms. If you are using the platform on behalf of an employer, you confirm you are authorised to bind that organisation."],
    ["Job seeker accounts","Accounts are free and personal to you. You are responsible for the accuracy of the information on your profile, including any certification you claim to hold. Misrepresenting a licence, ticket or registration is grounds for immediate removal."],
    ["Employer accounts","Employers must post genuine openings with a real pay range, must not charge applicants any fee, and must comply with all applicable human rights and employment standards legislation. Postings that request payment, require personal financial information, or discriminate on a protected ground are removed and the account is suspended."],
    ["Content you provide","You keep ownership of everything you upload, including your CVs and profile content. You grant us a limited licence to display that content to employers you apply to and to operate the service. You may withdraw it at any time by deleting it."],
    ["Content we provide","Articles, trainings and other material published on NorthHire are for general information. They are not legal, financial, immigration or medical advice, and certification requirements change by province — always confirm with the relevant regulator."],
    ["Availability","We aim for continuous availability but do not guarantee it. We may suspend the service for maintenance, and we will give notice where a planned interruption is expected to be significant."],
    ["Liability","To the extent permitted by law, NorthHire is not liable for hiring decisions made by employers, for the accuracy of employer-supplied listing content, or for indirect losses arising from use of the platform."],
    ["Governing law","These terms are governed by the laws of the Province of Ontario and the federal laws of Canada applicable there."]];
  const data=kind==="privacy"?privacy:terms;
  return <div style={{background:C.bg,minHeight:"100%"}}>
    <div style={{background:"#fff",borderBottom:`1px solid ${C.line}`}}>
      <div style={{maxWidth:800,margin:"0 auto",padding:mob?"20px 16px 24px":"34px 24px 30px"}}>
        <Tag tone="brand" sm icon={kind==="privacy"?"lock":"file"}>{kind==="privacy"?"Privacy":"Legal"}</Tag>
        <h1 style={{fontSize:mob?26:34,fontWeight:740,letterSpacing:"-.04em",color:C.text,margin:"14px 0 10px"}}>
          {kind==="privacy"?"Privacy policy":"Terms of service"}</h1>
        <p style={{fontSize:14.5,color:C.text2,margin:0}}>Last updated 1 August 2026 • Effective for all users in Canada</p></div></div>
    <div style={{maxWidth:800,margin:"0 auto",padding:mob?"16px 16px 30px":"26px 24px 46px"}}>
      <Card pad={mob?20:32}>
        <div style={{marginBottom:26,paddingBottom:20,borderBottom:`1px solid ${C.lineSoft}`}}>
          <Lbl>On this page</Lbl>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {data.map(([h])=><Tag key={h} sm>{h}</Tag>)}</div></div>
        {data.map(([h,p],i)=><section key={h} style={{marginBottom:i===data.length-1?0:26}}>
          <h2 style={{fontSize:mob?17.5:19.5,fontWeight:700,letterSpacing:"-.025em",color:C.text,margin:"0 0 11px"}}>{i+1}. {h}</h2>
          <p style={{fontSize:15,color:C.text2,lineHeight:1.8,margin:0}}>{p}</p></section>)}
        <div style={{marginTop:30,paddingTop:22,borderTop:`1px solid ${C.lineSoft}`,display:"flex",gap:10,flexWrap:"wrap"}}>
          <Btn kind="outline" onClick={()=>A.go(kind==="privacy"?"terms":"privacy")}>
            Read the {kind==="privacy"?"terms of service":"privacy policy"}</Btn>
          <Btn kind="ghost" onClick={()=>A.go("contact")}>Contact us about this</Btn></div></Card></div></div>;
}

export function PricingPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const plans=[
    {n:"Free",p:0,best:false,tag:"Try it out",summary:"For solo hiring or trying NorthHire before committing.",
     f:["1 active job posting","30 applications per month","Applicant pipeline with match scoring","Basic analytics","Verified employer badge","Email support"]},
    {n:"Growth",p:149,best:true,tag:"Recommended for most",summary:"Everything a growing team needs to run a real hiring pipeline.",
     f:["10 active job postings","Unlimited applications","Direct candidate messaging","Interview scheduling","Talent pool (reverse match)","CSV bulk job import","Full analytics dashboard","2 featured job upgrades per month","Employer branded page","5 recruiter seats","Priority support"]},
    {n:"Enterprise",p:499,best:false,tag:"For large teams",summary:"Unlimited hiring + the full NorthHire HR Suite for running your whole workforce.",
     f:["Unlimited job postings & applications","Unlimited featured upgrades","Unlimited recruiter seats","Full analytics with trend history","Custom employer branding (colors, hero)","API access","Single Sign-On (SAML / OIDC)","Dedicated account manager","","NorthHire HR Suite included:","• Employee directory & profiles","• Attendance & punch-in/out","• Leave management & approvals","• Tasks, calendar, events & trainings","• Internal chat (1:1 & groups)","• Invoices, salary, notifications","• Role management (Admin/HR/Finance/Employee)","• Feature toggles per module","• Sync with public NorthHire profiles"]}
  ];
  const faq=[
    ["What's included in every plan?","Applicant pipeline with AI match scoring, verified employer badge, English & French posting, no per-applicant fees, no long-term contracts."],
    ["Do you charge per applicant or per hire?","Neither. Flat monthly, whatever your volume."],
    ["What is the HR Suite?","A complete workforce platform included with Enterprise. Employees log in through a separate portal with their company ID. Every employee record syncs with their public NorthHire profile — but each employee controls exactly which fields are visible."],
    ["Can I switch plans?","Any time. Upgrades take effect immediately, downgrades at the next billing cycle."],
    ["Is there a free trial?","The Free plan is permanently free with 1 job posting. Growth and Enterprise both offer 14-day trials — no card required."],
    ["What payment methods work?","Visa, Mastercard, Amex, Interac direct debit. Invoices with net-30 terms available on Enterprise."],
  ];
  const [open,setOpen]=useState(-1);
  const pad=mob?"56px 16px":"96px 32px";
  const currentPlan=A.company?.plan||null;

  return <div style={{background:"#fff",minHeight:"100%"}}>

    <section style={{padding:pad,background:"#fff"}}>
      <div style={{maxWidth:960,margin:"0 auto",textAlign:"center"}}>
        <Tag tone="brand">Employer pricing</Tag>
        <h1 style={{fontSize:mob?38:72,fontWeight:770,letterSpacing:"-.05em",lineHeight:1.02,margin:"22px auto 26px",maxWidth:820,color:C.text}}>
          Simple pricing. No per-applicant fees.</h1>
        <p style={{fontSize:mob?17:20,color:C.text2,lineHeight:1.55,margin:"0 auto",maxWidth:600}}>
          From your first hire to running an entire workforce. All prices in CAD. Cancel any time.</p>
      </div>
    </section>

    <section style={{padding:mob?"0 16px 56px":"0 32px 96px",background:"#fff"}}>
      <div style={{maxWidth:1200,margin:"0 auto"}}>
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(3,1fr)",gap:mob?14:20,alignItems:"stretch"}}>
          {plans.map(p=>{const isCurrent=currentPlan===p.n;
          return <div key={p.n} style={{background:"#fff",border:`${p.best?2:1}px solid ${p.best?C.brand:C.line}`,
            borderRadius:24,overflow:"hidden",boxShadow:p.best?SH.lg:"none",position:"relative",display:"flex",flexDirection:"column"}}>
            {p.best&&<div style={{background:C.brand,color:"#fff",textAlign:"center",fontSize:12,fontWeight:700,padding:"10px 12px",letterSpacing:".08em",textTransform:"uppercase"}}>{p.tag}</div>}
            <div style={{padding:mob?28:34,flex:1,display:"flex",flexDirection:"column"}}>
              {!p.best&&<div style={{fontSize:12,fontWeight:600,color:C.text3,letterSpacing:".08em",textTransform:"uppercase",marginBottom:14}}>{p.tag}</div>}
              <div style={{fontSize:mob?22:26,fontWeight:730,color:C.text,letterSpacing:"-.03em",marginBottom:8}}>{p.n}</div>
              <div style={{fontSize:14,color:C.text2,lineHeight:1.55,marginBottom:18,minHeight:mob?"auto":44}}>{p.summary}</div>
              <div style={{display:"flex",alignItems:"baseline",gap:6,marginBottom:24,paddingBottom:24,borderBottom:`1px solid ${C.lineSoft}`}}>
                <span style={{fontSize:mob?48:56,fontWeight:770,color:C.text,letterSpacing:"-.05em",lineHeight:1}}>${p.p}</span>
                <span style={{fontSize:15,color:C.text3}}>{p.p===0?"forever":"/month"}</span></div>
              <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:28,flex:1}}>
                {p.f.map((x,i)=>{if(!x)return <div key={i} style={{height:8}}/>;
                  const isHeader=x.endsWith(":");
                  if(isHeader)return <div key={x} style={{fontSize:12,fontWeight:700,color:C.brand,letterSpacing:".06em",textTransform:"uppercase",marginTop:6}}>{x.slice(0,-1)}</div>;
                  const isSubItem=x.startsWith("• ");
                  return <div key={x} style={{display:"flex",gap:11,fontSize:13.5,color:isSubItem?C.text2:C.text,lineHeight:1.5,paddingLeft:isSubItem?4:0}}>
                    {!isSubItem&&<span style={{color:C.ok,flexShrink:0,display:"flex",marginTop:2}}><I n="check" s={16} w={2.6}/></span>}
                    <span>{isSubItem?x.slice(2):x}</span></div>;})}</div>
              <Btn kind={isCurrent?"outline":p.best?"primary":"outline"} size="lg" full disabled={isCurrent} onClick={()=>A.choosePlan(p.n)}>
                {isCurrent?"Current plan":p.p===0?"Start free":"Choose "+p.n}</Btn></div></div>;})}</div>
      </div>
    </section>

    <section style={{padding:mob?"32px 16px 56px":"48px 32px 96px",background:C.bg,borderTop:`1px solid ${C.line}`}}>
      <div style={{maxWidth:1120,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:mob?28:44}}>
          <h2 style={{fontSize:mob?26:36,fontWeight:750,letterSpacing:"-.04em",color:C.text,margin:"0 0 14px",lineHeight:1.15}}>
            Compare features in detail</h2>
          <p style={{fontSize:mob?15:16.5,color:C.text2,margin:0,lineHeight:1.55}}>Everything in one table so you can pick the right fit.</p></div>
        <div style={{background:"#fff",borderRadius:20,border:`1px solid ${C.line}`,overflow:"hidden"}}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:mob?540:720}}>
              <thead><tr style={{background:C.bg,borderBottom:`1px solid ${C.line}`}}>
                <th style={{padding:mob?"14px 16px":"18px 24px",textAlign:"left",fontSize:12.5,fontWeight:700,color:C.text3,letterSpacing:".06em",textTransform:"uppercase"}}>Feature</th>
                {plans.map(p=><th key={p.n} style={{padding:mob?"14px 12px":"18px 20px",textAlign:"center",fontSize:14,fontWeight:700,color:p.best?C.brand:C.text}}>{p.n}</th>)}
              </tr></thead>
              <tbody>
                {[["Live job postings","1","10","Unlimited"],
                  ["Applications","30/mo","Unlimited","Unlimited"],
                  ["Applicant pipeline","✓","✓","✓"],
                  ["AI match scoring","✓","✓","✓"],
                  ["Analytics","Basic","Full","Full + trends"],
                  ["Recruiter seats","1","5","Unlimited"],
                  ["Direct candidate messaging","—","✓","✓"],
                  ["Interview scheduling","—","✓","✓"],
                  ["Talent pool (reverse match)","—","✓","✓"],
                  ["CSV bulk job import","—","✓","✓"],
                  ["Featured job upgrades","—","2/mo","Unlimited"],
                  ["Branded employer page","—","✓","✓ + custom colors"],
                  ["API access","—","—","✓"],
                  ["Single Sign-On (SSO)","—","—","✓"],
                  ["Dedicated account manager","—","—","✓"],
                  ["NorthHire HR Suite","—","—","✓ Full"]].map((row,i)=>
                  <tr key={row[0]} style={{borderBottom:i<15?`1px solid ${C.lineSoft}`:"none"}}>
                    <td style={{padding:mob?"12px 16px":"14px 24px",fontSize:13.5,color:C.text,fontWeight:500}}>{row[0]}</td>
                    {row.slice(1).map((v,k)=><td key={k} style={{padding:mob?"12px 12px":"14px 20px",textAlign:"center",fontSize:13.5,color:v==="—"?C.text3:C.text,fontWeight:v==="—"?400:600}}>{v==="✓"?<span style={{color:C.ok,display:"inline-flex"}}><I n="check" s={16} w={2.8}/></span>:v}</td>)}
                  </tr>)}
              </tbody></table></div></div>
      </div>
    </section>

    <section style={{padding:pad,background:"#fff"}}>
      <div style={{maxWidth:820,margin:"0 auto",background:C.ink,color:"#fff",borderRadius:24,padding:mob?"36px 24px":"56px 60px",textAlign:"center"}}>
        <Tag tone="onDark">HR Suite</Tag>
        <h2 style={{fontSize:mob?24:34,fontWeight:750,letterSpacing:"-.04em",margin:"18px 0 14px",lineHeight:1.15}}>
          One platform. From posting a role to running your entire workforce.</h2>
        <p style={{fontSize:mob?15:16.5,color:"rgba(255,255,255,.7)",lineHeight:1.65,margin:"0 auto 26px",maxWidth:520}}>
          Enterprise unlocks the full NorthHire HR Suite. Employees log in through a separate portal. Every employee's public NorthHire profile syncs with their internal record — with per-field privacy controls.</p>
        <Btn kind="onDark" size="lg" onClick={()=>A.choosePlan("Enterprise")}>Get Enterprise</Btn>
      </div>
    </section>

    <section style={{padding:pad,background:C.bg,borderTop:`1px solid ${C.line}`}}>
      <div style={{maxWidth:820,margin:"0 auto",background:"#fff",borderRadius:24,padding:mob?"40px 28px":"56px 60px",textAlign:"center",border:`1px solid ${C.line}`}}>
        <div style={{width:64,height:64,borderRadius:99,background:C.okBg,color:C.ok,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 22px"}}>
          <I n="heart" s={30}/></div>
        <h2 style={{fontSize:mob?26:36,fontWeight:750,letterSpacing:"-.04em",color:C.text,margin:"0 0 14px",lineHeight:1.15}}>
          Job seekers pay nothing. Ever.</h2>
        <p style={{fontSize:mob?15.5:17,color:C.text2,lineHeight:1.65,margin:"0 auto 32px",maxWidth:480}}>
          Full profile, unlimited applications, CV builder, free trainings and direct employer messaging. No premium tier.</p>
        <Btn kind="primary" size="lg" onClick={()=>A.go(A.user?.role==="seeker"?"profile":"signup")}>Create a free profile</Btn>
      </div>
    </section>

    <section style={{padding:pad,background:"#fff"}}>
      <div style={{maxWidth:820,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <Tag tone="brand">Questions</Tag>
          <h2 style={{fontSize:mob?26:36,fontWeight:750,letterSpacing:"-.04em",color:C.text,margin:"14px 0 0",lineHeight:1.15}}>
            Common questions.</h2></div>
        <div style={{background:"#fff",borderRadius:20,border:`1px solid ${C.line}`,overflow:"hidden"}}>
          {faq.map(([q,a],i)=><div key={q} style={{borderBottom:i<faq.length-1?`1px solid ${C.lineSoft}`:"none"}}>
            <button onClick={()=>setOpen(open===i?-1:i)} style={{width:"100%",display:"flex",justifyContent:"space-between",
              alignItems:"center",gap:14,padding:mob?"20px 22px":"24px 28px",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
              <span style={{fontSize:mob?15.5:16.5,fontWeight:650,color:C.text,lineHeight:1.4,letterSpacing:"-.015em"}}>{q}</span>
              <span style={{color:C.brand,transform:open===i?"rotate(180deg)":"none",transition:"transform .22s",flexShrink:0}}><I n="chevD" s={19} w={2.2}/></span></button>
            {open===i&&<div style={{padding:mob?"0 22px 22px":"0 28px 26px",fontSize:mob?14.5:15,color:C.text2,lineHeight:1.72}}>{a}</div>}</div>)}</div>
      </div>
    </section>

  </div>;
}


export function AccessibilityPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const secs=[
    ["Our commitment","NorthHire is committed to providing an accessible, inclusive experience for every person in Canada. We aim to meet or exceed WCAG 2.1 Level AA and comply with the Accessibility for Ontarians with Disabilities Act (AODA), the Accessible Canada Act (ACA), and provincial accessibility legislation across Canada."],
    ["What we do","Every new feature we ship goes through an accessibility review. Colours meet contrast ratios. Interactive elements are reachable by keyboard. Media includes captions or transcripts. Forms surface errors clearly with instructions on how to fix them. Alternative text is provided for meaningful images."],
    ["Assistive technology","NorthHire is tested with screen readers (NVDA, JAWS, VoiceOver), voice control (Voice Access, Dragon), and screen magnifiers (ZoomText, macOS Zoom). Text can be resized up to 200 percent without loss of function."],
    ["Documents and content","Blog articles, job postings and training materials are structured with semantic headings and reading order. Downloadable documents are provided in accessible PDF or HTML formats where possible."],
    ["Feedback","If you encounter an accessibility barrier or need content in an alternate format, please reach us at accessibility@northhire.ca or call 1-800-555-2626 (toll-free, TTY available). We aim to respond within two business days."],
    ["Multi-year plan","Our accessibility plan is reviewed annually and is available on request. Progress reports are published each October."],
  ];
  return <Page>
    <div style={{maxWidth:820,margin:"0 auto"}}>
      <Tag tone="brand" icon="shield">Accessibility</Tag>
      <h1 style={{fontSize:mob?32:44,fontWeight:750,letterSpacing:"-.04em",margin:"18px 0 12px",color:C.text}}>Accessibility statement (AODA)</h1>
      <p style={{fontSize:15,color:C.text3,marginBottom:36}}>Last reviewed: August 2026</p>
      {secs.map(([h,b])=><div key={h} style={{marginBottom:28}}>
        <h2 style={{fontSize:20,fontWeight:700,color:C.text,letterSpacing:"-.02em",margin:"0 0 10px"}}>{h}</h2>
        <p style={{fontSize:15.5,color:C.text2,lineHeight:1.75,margin:0}}>{b}</p>
      </div>)}
    </div>
  </Page>;
}

export function PipedaPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const secs=[
    ["What PIPEDA is","The Personal Information Protection and Electronic Documents Act (PIPEDA) is Canada's federal private-sector privacy law. It sets ground rules for how organisations handle personal information in the course of commercial activity."],
    ["How NorthHire complies","NorthHire is subject to PIPEDA and provincial equivalents (Quebec's Law 25, Alberta's PIPA, BC's PIPA). We collect only what we need to run the platform, we tell you why, we ask before we use your information for anything else, and we let you access, correct or delete what we hold."],
    ["Your rights","You can request a copy of everything we hold about you, ask us to correct anything that is wrong, withdraw consent for optional processing, and request deletion of your account. Requests are handled within thirty days at no cost."],
    ["Data storage","NorthHire data is stored in Canadian data centres operated by AWS in ca-central-1 (Montreal). We do not transfer personal information outside Canada without your explicit consent."],
    ["Sharing","Employer accounts see the information you choose to include in applications you send them. That copy becomes theirs under PIPEDA and their own privacy policies apply. We do not sell personal information. We do not use it for advertising."],
    ["Breach notification","If we discover a breach that poses a real risk of significant harm, we will notify affected users and the Office of the Privacy Commissioner of Canada as required by PIPEDA."],
    ["Contact","Privacy questions or requests: privacy@northhire.ca or write to Privacy Officer, NorthHire Technologies Inc., 250 Front Street West, Toronto, ON M5V 3G5."],
  ];
  return <Page>
    <div style={{maxWidth:820,margin:"0 auto"}}>
      <Tag tone="brand" icon="lock">Privacy law</Tag>
      <h1 style={{fontSize:mob?32:44,fontWeight:750,letterSpacing:"-.04em",margin:"18px 0 12px",color:C.text}}>PIPEDA compliance</h1>
      <p style={{fontSize:15,color:C.text3,marginBottom:36}}>Last reviewed: August 2026</p>
      {secs.map(([h,b])=><div key={h} style={{marginBottom:28}}>
        <h2 style={{fontSize:20,fontWeight:700,color:C.text,letterSpacing:"-.02em",margin:"0 0 10px"}}>{h}</h2>
        <p style={{fontSize:15.5,color:C.text2,lineHeight:1.75,margin:0}}>{b}</p>
      </div>)}
      <div style={{background:C.bg,border:`1px solid ${C.line}`,borderRadius:14,padding:20,marginTop:32}}>
        <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:6}}>Full privacy policy</div>
        <p style={{fontSize:13.5,color:C.text2,margin:"0 0 12px",lineHeight:1.6}}>Detailed disclosures on collection, use, retention and third-party processors are in our full policy.</p>
        <Btn kind="outline" size="sm" onClick={()=>A.go("privacy")}>Read the full privacy policy</Btn>
      </div>
    </div>
  </Page>;
}
