import { useState, useMemo, useEffect } from "react";
import { ROUTES } from "../routes.js";
import { C } from "../design/tokens.js";
import { uid, money, pay, payUnit, payShort, annual, nowStamp } from "../helpers/utils.js";
import { CATM, PCODE, STAGES, PLANS, PLAN_REQUIRES, PLAN_ORDER } from "./seed/constants.js";
import { SEED_EMPLOYERS } from "./seed/employers.js";
import { SEED_JOBS } from "./seed/jobs.js";
import { SEED_PEOPLE } from "./seed/people.js";
import { SEED_APPS } from "./seed/applications.js";
import { SEED_BLOGS } from "./seed/blogs.js";
import { SEED_TRAININGS } from "./seed/trainings.js";
import { useHrStore } from "./useHrStore.js";
import { useStaffingStore } from "./useStaffingStore.js";

/* Real CSV field parsing (quoted fields, embedded commas, "" escaping) — a plain row.split(",")
   silently shifts every column after the first comma inside a free-text field like Description. */
function parseCsvLine(line){
  const cells=[]; let cur=""; let inQuotes=false;
  for(let i=0;i<line.length;i++){
    const c=line[i];
    if(inQuotes){
      if(c==='"'){ if(line[i+1]==='"'){cur+='"';i++;} else inQuotes=false; }
      else cur+=c;
    } else if(c==='"') inQuotes=true;
    else if(c===','){cells.push(cur);cur="";}
    else cur+=c;
  }
  cells.push(cur);
  return cells.map(c=>c.trim());
}

export function useStore(){
  const [pg,setPg]=useState(()=>{
    /* Minimal hash entry point so "open HR Suite in a new tab" lands somewhere real —
       HrShell's own guard redirects to hrLogin if this tab has no active HR session. */
    if(typeof window!=="undefined"&&window.location.hash==="#hr")return "hrDashboard";
    return "home";
  });
  const [stack,setStack]=useState([]);
  /* --- persistence: hydrate from localStorage, save on change --- */
  const LS_KEY="northhire.v4"; /* bumped: staffing agency schema — workers, clients, orders, timesheets, invoices */
  const hydrate=()=>{ if(typeof window==="undefined")return null;
    try{const raw=localStorage.getItem(LS_KEY); return raw?JSON.parse(raw):null;}catch{return null;} };
  const seed=hydrate();
  /* Migrate seeded state to current schema. Runs once per hydration. */
  if(seed?.employers){
    /* Old plan-name → new plan-name */
    const planMap={Starter:"Free",Growth:"Growth",Scale:"Enterprise"};
    seed.employers=seed.employers.map(e=>{
      let out=e.plan&&planMap[e.plan]?{...e,plan:planMap[e.plan]}:e;
      /* Guarantee PCL Construction is on Enterprise so HR Suite demo works */
      if(out.name==="PCL Construction"){out={...out,plan:"Enterprise",owner:out.owner||"hr@pcl.com"};}
      return out;
    });
  }
  const [user,setUser]=useState(seed?.user||null);
  const DEMO_PASSWORDS={
    "sarah.chen@example.ca":"Password123",
    "marcus.b@example.ca":"Password123",
    "priya.r@example.ca":"Password123",
    "hr@pcl.com":"Employer123",
    "admin@northhire.ca":"Admin1234"
  };
  /* Always merge demo passwords on top so demo accounts NEVER break regardless of stale localStorage */
  const [passwords,setPasswords]=useState({...(seed?.passwords||{}),...DEMO_PASSWORDS});
  const [resetCodes,setResetCodes]=useState(seed?.resetCodes||{});
  const [employers,setEmployers]=useState(seed?.employers||SEED_EMPLOYERS);
  const [jobs,setJobs]=useState(seed?.jobs||SEED_JOBS);
  const [people,setPeople]=useState(seed?.people||SEED_PEOPLE);
  const [applications,setApplications]=useState(seed?.applications||SEED_APPS);
  const [blogs,setBlogs]=useState(seed?.blogs||SEED_BLOGS);
  const [trainings,setTrainings]=useState(seed?.trainings||SEED_TRAININGS);
  const [cvs,setCvs]=useState(seed?.cvs||[]);
  const [saved,setSaved]=useState(new Set(seed?.saved||["j3"]));
  const [following,setFollowing]=useState(new Set(seed?.following||[]));
  const [enrolled,setEnrolled]=useState(new Set(seed?.enrolled||[]));
  const [paidTrainings,setPaidTrainings]=useState(()=>new Set());
  const [trainingProgress,setTrainingProgress]=useState(seed?.trainingProgress||{});
  const [suspended,setSuspended]=useState(new Set(seed?.suspended||[]));
  const [notifications,setNotifications]=useState(seed?.notifications||[
    {id:"n1",icon:"calendar",title:"Interview booked — PCL Construction",body:"Site interview Thursday at 9:00 AM. Bring your Red Seal certificate.",at:"2 hours ago",read:false,for:"u2",link:"status"},
    {id:"n2",icon:"target",title:"6 new jobs match your profile",body:"New trades roles in Alberta paying $42–$52 per hour.",at:"5 hours ago",read:false,for:"u2",link:"matched"},
    {id:"n3",icon:"eye",title:"An employer viewed your profile",body:"A verified construction employer opened your profile today.",at:"Yesterday",read:true,for:"u2",link:null},
  ]);
  const [savedSearches,setSavedSearches]=useState(seed?.savedSearches||[]);
  const [messages,setMessages]=useState(seed?.messages||[]);
  const [interviews,setInterviews]=useState(seed?.interviews||[]);
  const [reviews,setReviews]=useState(seed?.reviews||[]);
  const [outbox,setOutbox]=useState(seed?.outbox||[]);
  const [impersonating,setImpersonating]=useState(null);
  const [activity,setActivity]=useState(seed?.activity||[]);
  const [settings,setSettings]=useState(seed?.settings||{employerBlogs:true,employerTrainings:true,employerFeature:true,
    autoApproveJobs:true,publicSignup:true,cvBuilder:true,matching:true,enrolments:true,payTransparency:true,maintenance:false});
  const [userSettings,setUserSettings]=useState(seed?.userSettings||{matchAlerts:true,appAlerts:true,marketing:false,discoverable:true,hideEmployer:false,reducedMotion:false,lang:"en"});
  const [search,setSearch]=useState({q:"",where:"",cats:[]});
  const [jobId,setJobId]=useState(null),[empId,setEmpId]=useState(null),[blogId,setBlogId]=useState(null);
  const [trainingId,setTrainingId]=useState(null),[cvId,setCvId]=useState(null),[editId,setEditId]=useState(null);
  const [candidateId,setCandidateId]=useState(null),[pipelineJob,setPipelineJob]=useState(null);
  const [applyDraft,setApplyDraft]=useState({job:null,avail:"Within 2 weeks",expect:"",letter:"",meets:"Yes"});
  const [pageTitle,setPageTitle]=useState(null);


  const emp=id=>employers.find(e=>e.id===id)||employers[0];
  const job=id=>jobs.find(j=>j.id===id);
  const person=id=>people.find(p=>p.id===id)||people[0];
  const company=user?.role==="employer"?employers.find(e=>e.owner===user.email)||employers[0]:null;
  const homePg=user?.role==="employer"?"empHome":user?.role==="admin"?"admHome":"home";

  const log=(action,text,icon)=>setActivity(a=>[{id:uid("l"),action,text,icon,
    actor:user?`${user.name} (${user.role})`:"Guest",at:nowStamp()},...a].slice(0,120));
  const notify=(n)=>setNotifications(list=>[{id:uid("n"),read:false,at:"Just now",...n},...list]);

  const go=(p,title)=>{
    const r=ROUTES[p];
    if(r?.roles&&(!user||!r.roles.includes(user.role))){setStack(s=>[...s,pg]);setPg("denied");setPageTitle(null);return;}
    /* Auto-provision HR session when an Enterprise employer navigates into HR modules.
       This makes HR Suite feel like a native tab inside the employer console,
       instead of demanding a separate /hr-login step. */
    if(p?.startsWith("hr")&&p!=="hrLogin"&&user?.role==="employer"&&company?.plan==="Enterprise"&&!HR?.hrSession){
      const owner=HR?.hrEmpsAtCompany?.(company.id)?.find(e=>e.role==="Owner"||e.role==="Admin")||HR?.hrEmpsAtCompany?.(company.id)?.[0];
      if(owner){HR.setHrSession({employeeId:owner.id,companyId:company.id,at:Date.now()});}
    }
    setStack(s=>[...s,pg]); setPg(p); setPageTitle(title||null);
    if(typeof window!=="undefined")window.scrollTo?.(0,0);
  };
  const back=()=>{setStack(s=>{const c=[...s];const prev=c.pop();setPg(prev||homePg);setPageTitle(null);return c;});
    if(typeof window!=="undefined")window.scrollTo?.(0,0);};

  /* --- matching --- */
  const scoreCandidate=(u,j)=>{
    if(!u||!j||!settings.matching)return 70;
    const req=j.skills.map(s=>s.toLowerCase()), has=(u.skills||[]).map(s=>s.toLowerCase());
    const overlap=req.filter(s=>has.includes(s)).length;
    const skill=req.length?overlap/req.length:.5;
    const expYears=typeof u.years==="number"?u.years:3;
    const exp=Math.min(1,expYears/8);
    const loc=u.prov===j.prov?1:j.mode==="Remote"?.9:.5;
    const catFit=u.cat===j.cat?1:.6;
    return Math.max(38,Math.min(99,Math.round(skill*54+exp*16+loc*14+catFit*16)));
  };
  const score=j=>scoreCandidate(user?.role==="seeker"?user:people[1],j);
  const matchReasons=j=>{
    const u=user?.role==="seeker"?user:null; if(!u)return [];
    const r=[]; const hit=j.skills.filter(s=>(u.skills||[]).some(x=>x.toLowerCase()===s.toLowerCase()));
    if(hit.length)r.push(`${hit.length} of ${j.skills.length} skills match`);
    if(u.prov===j.prov)r.push("In your province");
    if(j.mode==="Remote"&&(u.modes||[]).includes("Remote"))r.push("Remote, as you prefer");
    if((u.types||[]).includes(j.type))r.push(`${j.type} as you wanted`);
    const target=u.payUnit===j.unit?u.payMin:u.payUnit==="hr"?u.payMin*2080:u.payMin;
    if(j.unit===u.payUnit&&j.lo>=target)r.push("Above your pay target");
    if(u.cat===j.cat)r.push("Your sector");
    return r.slice(0,4);
  };

  /* --- seeker derived --- */
  const myApps=useMemo(()=>user?.role==="seeker"?applications.filter(a=>a.user===user.id)
    .slice().sort((a,b)=>STAGES.indexOf(b.stage)-STAGES.indexOf(a.stage)):[],[applications,user]);
  const appliedJobIds=useMemo(()=>new Set(myApps.map(a=>a.job)),[myApps]);
  const myNotifications=useMemo(()=>notifications.filter(n=>!n.for||n.for===user?.id||n.for===user?.role),[notifications,user]);
  const defaultCv=cvs.find(c=>c.id===user?.defaultCv)||cvs[0]||null;
  const completeness=useMemo(()=>{
    if(user?.role!=="seeker")return 100;
    let s=30; if((user.skills||[]).length>=3)s+=20; if((user.skills||[]).length>=6)s+=10;
    if(user.summary)s+=10; if(cvs.length)s+=15; if(user.edu)s+=8; if(enrolled.size)s+=7;
    return Math.min(100,s);},[user,cvs,enrolled]);
  const completenessHint=completeness>=95?"Your profile is complete."
    :!cvs.length?"Build a CV to add 15%.":(user?.skills||[]).length<6?"Add more skills to reach 90%."
    :!user?.summary?"Add a professional summary.":"Enrol in a training to finish your profile.";

  const tabBadges=useMemo(()=>{
    if(!user)return {};
    if(user.role==="seeker")return {status:myApps.filter(a=>a.stage!=="Withdrawn").length,
      profile:cvs.length?0:1,matched:0};
    if(user.role==="employer"){const mine=jobs.filter(j=>j.e===company?.id).map(j=>j.id);
      return {empPipeline:applications.filter(a=>mine.includes(a.job)&&a.stage==="Applied").length,
        empJobs:jobs.filter(j=>j.e===company?.id&&j.status==="live").length};}
    return {admJobs:jobs.filter(j=>j.flagged).length,admUsers:employers.filter(e=>!e.verified).length,
      admBlogs:[...blogs,...trainings].filter(x=>x.status==="draft").length};
  },[user,myApps,cvs,jobs,applications,company,employers,blogs,trainings]);

  /* --- actions --- */
  const login=role=>{
    const base=role==="seeker"?{...people[1],role,defaultCv:null,seed:people[1].seed}
      :role==="employer"?{id:"emp1",role,name:"PCL Hiring Team",email:"hr@pcl.com",seed:9,skills:[]}
      :{id:"adm1",role,name:"Platform Admin",email:"admin@northhire.ca",seed:11,skills:[]};
    setUser(base); setStack([]); setPg(role==="employer"?"empHome":role==="admin"?"admHome":"home");
    log("auth.login",`Signed in as ${base.name}`,"logout");
  };
  const logout=()=>{setUser(null);setStack([]);setPg("home");setPageTitle(null);};
  const hasAccount=email=>!!passwords[(email||"").toLowerCase().trim()];
  const checkPassword=(email,pw)=>passwords[(email||"").toLowerCase().trim()]===pw;
  const upsertPassword=(email,pw)=>setPasswords(p=>({...p,[email.toLowerCase().trim()]:pw}));
  const loginWithPassword=(email,pw)=>{
    const e=(email||"").toLowerCase().trim();
    if(!passwords[e])return {ok:false,msg:"No account with that email"};
    if(passwords[e]!==pw)return {ok:false,msg:"Password does not match"};
    const seeker=people.find(p=>(p.email||"").toLowerCase()===e);
    if(seeker&&suspended.has(seeker.id))return {ok:false,msg:"This account has been suspended. Contact support for help."};
    if(seeker){setUser({...seeker,role:"seeker",defaultCv:cvs.find(c=>c.userEmail===e)?.id||null});
      setStack([]);setPg("home");log("auth.login",`Signed in as ${seeker.name}`,"logout");
      return {ok:true};}
    const emp=employers.find(x=>(x.owner||"").toLowerCase()===e);
    if(emp){setUser({id:emp.id+"_owner",role:"employer",name:emp.ownerName||"Hiring Team",email:emp.owner,seed:9,skills:[]});
      setStack([]);setPg("empHome");log("auth.login",`Signed in as ${emp.name}`,"logout");
      return {ok:true};}
    if(e==="admin@northhire.ca"){setUser({id:"adm1",role:"admin",name:"Platform Admin",email:e,seed:11,skills:[]});
      setStack([]);setPg("admHome");log("auth.login","Signed in as Admin","logout");
      return {ok:true};}
    return {ok:false,msg:"Account exists but user record missing — contact support"};
  };
  const resetPasswordRequest=email=>{
    const e=(email||"").toLowerCase().trim();
    if(!passwords[e])return {ok:false,msg:"No account with that email"};
    const code=Math.floor(100000+Math.random()*900000).toString();
    setResetCodes(c=>({...c,[e]:{code,at:Date.now()}}));
    setOutbox(o=>[{id:uid("m"),to:e,subject:"Reset your NorthHire password",
      body:`Your reset code is ${code}. It expires in 15 minutes.`,at:new Date().toLocaleString("en-CA")},...o]);
    log("auth.reset.request",`Reset code emailed to ${e}`,"mail");
    return {ok:true,code}; /* dev returns code for demo visibility */
  };
  const resetPasswordConfirm=(email,code,newPw)=>{
    const e=(email||"").toLowerCase().trim();
    const rec=resetCodes[e];
    if(!rec)return {ok:false,msg:"No pending reset for this account"};
    if(Date.now()-rec.at>15*60*1000)return {ok:false,msg:"Code expired — request a new one"};
    if(rec.code!==code)return {ok:false,msg:"Code does not match"};
    setPasswords(p=>({...p,[e]:newPw}));
    setResetCodes(c=>{const n={...c};delete n[e];return n;});
    log("auth.reset.complete",`Password reset for ${e}`,"lock");
    return {ok:true};
  };

  const completeSignup=d=>{
    const email=(d.email||"").toLowerCase().trim();
    if(passwords[email])return {ok:false,msg:"An account with that email already exists — try signing in"};
    if(!d.password||d.password.length<8)return {ok:false,msg:"Password must be at least 8 characters"};
    const yearsMap={"No experience yet":0,"Less than 1 year":1,"1-2 years":2,"3-5 years":4,"6-10 years":8,"More than 10 years":12};
    const u={id:uid("u"),role:"seeker",name:`${d.first} ${d.last}`.trim(),seed:Math.floor(Math.random()*8),
      title:d.title,cat:d.cat,city:d.city,prov:PCODE[d.prov],years:yearsMap[d.years]??2,email,phone:d.phone,
      skills:d.skills,edu:d.edu,eligible:d.eligible,payMin:Number(d.payMin)||0,payUnit:d.payUnit,
      types:d.types,modes:d.modes,startWhen:d.startWhen,summary:"",defaultCv:null};
    setPasswords(p=>({...p,[email]:d.password}));
    setUser(u); setPeople(p=>[u,...p]); setStack([]); setPg("welcome");
    notify({icon:"sparkle",title:"Welcome to NorthHire",body:"Your profile is live. Check Matched jobs to see what fits your skills.",for:u.id,link:"matched"});
    log("auth.signup",`New job seeker registered: ${u.name}`,"user");
    return {ok:true};
  };
  const completeEmployerSignup=d=>{
    const email=(d.email||"").toLowerCase().trim();
    if(passwords[email])return {ok:false,msg:"An account with that email already exists — try signing in"};
    if(!d.password||d.password.length<8)return {ok:false,msg:"Password must be at least 8 characters"};
    if(!d.company||!d.company.trim())return {ok:false,msg:"Company name required"};
    const domain=email.split("@")[1]||"example.com";
    const e={id:uid("e"),name:d.company.trim(),industry:d.industry||"Other",city:d.city||"Toronto",prov:PCODE[d.prov||"Ontario"],
      size:d.size||"1-50",founded:new Date().getFullYear(),site:domain,mark:"hex",a:C.brand,b:"#EAF2FF",
      about:d.about||`${d.company.trim()} is hiring on NorthHire.`,verified:false,rating:0,plan:"Free",
      owner:email,ownerName:d.name||"Hiring Team"};
    setEmployers(list=>[e,...list]);
    setPasswords(p=>({...p,[email]:d.password}));
    setUser({id:e.id+"_owner",role:"employer",name:e.ownerName,email,seed:9,skills:[]});
    setStack([]);setPg("welcomeEmp");
    log("auth.signup.employer",`New employer registered: ${e.name}`,"building");
    notify({icon:"sparkle",title:"Welcome to NorthHire",body:"Post your first job to start receiving applicants. Verification usually takes 1 business day.",for:e.id+"_owner",link:"empPost"});
    return {ok:true};
  };
  const clearAllData=()=>{if(typeof window!=="undefined")localStorage.removeItem(LS_KEY);window.location.reload?.();};
  const saveProfile=d=>{setUser(d);setPeople(p=>p.map(x=>x.id===d.id?{...x,...d}:x));log("profile.update","Updated their profile","edit");};
  const deleteAccount=()=>{log("account.delete",`Deleted account ${user.name}`,"trash");setUser(null);setCvs([]);setPg("home");setStack([]);};
  const exportData=()=>downloadText(`northhire-data-${user.id}.json`,JSON.stringify({profile:user,cvs,applications:myApps,saved:[...saved]},null,2));
  const setUserSetting=(k,v)=>setUserSettings(s=>({...s,[k]:v}));

  /* --- saved searches --- */
  const saveSearch=(q,where,cats,name)=>{
    if(!user||user.role!=="seeker")return;
    const s={id:uid("ss"),user:user.id,name:name||(q||CATM[cats?.[0]]?.label||"Untitled search"),
      q:q||"",where:where||"",cats:cats||[],alerts:true,createdAt:Date.now(),lastRun:Date.now(),lastCount:0};
    setSavedSearches(l=>[s,...l]);
    log("search.save",`Saved search "${s.name}"`,"bookmark");
    notify({icon:"bell",title:"Search saved",body:`We'll alert you when new jobs match "${s.name}".`,for:user.id,link:"savedSearches"});
    return s.id;
  };
  const deleteSavedSearch=id=>{setSavedSearches(l=>l.filter(s=>s.id!==id));log("search.delete","Deleted saved search","trash");};
  const toggleSearchAlert=id=>setSavedSearches(l=>l.map(s=>s.id===id?{...s,alerts:!s.alerts}:s));

  /* --- salary insights: median pay per (role keyword × province) --- */
  const salaryInsight=(title,prov)=>{
    const keys=title.toLowerCase().split(/\s+/).filter(w=>w.length>2);
    const matches=jobs.filter(j=>j.status==="live"&&(!prov||j.prov===prov)&&
      keys.some(k=>j.t.toLowerCase().includes(k)||j.skills.some(s=>s.toLowerCase().includes(k))));
    if(matches.length<3)return null;
    const salaries=matches.map(j=>annual(j)).sort((a,b)=>a-b);
    const median=salaries[Math.floor(salaries.length/2)];
    const p25=salaries[Math.floor(salaries.length*0.25)];
    const p75=salaries[Math.floor(salaries.length*0.75)];
    return {median,p25,p75,count:matches.length};
  };

  /* --- skills gap: what's missing from user's profile vs a job --- */
  const skillsGap=j=>{
    if(!user||user.role!=="seeker")return {have:[],missing:[],potential:100};
    const req=j.skills.map(s=>s.toLowerCase());
    const has=(user.skills||[]).map(s=>s.toLowerCase());
    const have=j.skills.filter(s=>has.includes(s.toLowerCase()));
    const missing=j.skills.filter(s=>!has.includes(s.toLowerCase()));
    // Compute what score would be if user had all skills
    const potentialUser={...user,skills:[...(user.skills||[]),...missing]};
    return {have,missing,current:score(j),potential:scoreCandidate(potentialUser,j)};
  };

  /* --- payment / cards --- */
  const [paymentMethods,setPaymentMethods]=useState(seed?.paymentMethods||[]);
  const addPaymentMethod=card=>{
    const masked=`•••• ${card.number.slice(-4)}`;
    const pm={id:uid("pm"),masked,brand:card.brand||"Card",exp:card.exp,name:card.name,default:paymentMethods.length===0};
    setPaymentMethods(l=>[pm,...l]);
    log("billing.card.add",`Added ${pm.brand} ${masked}`,"wallet");
    return pm;
  };
  const removePaymentMethod=id=>{setPaymentMethods(l=>l.filter(p=>p.id!==id));log("billing.card.remove","Removed a payment method","trash");};
  const setDefaultPayment=id=>setPaymentMethods(l=>l.map(p=>({...p,default:p.id===id})));

  /* --- 2FA --- */
  const [twoFactor,setTwoFactor]=useState(seed?.twoFactor||{}); // {userId: {enabled, phone, backupCodes}}
  const enable2FA=(phone)=>{
    if(!user)return {ok:false,msg:"Sign in first"};
    const codes=Array.from({length:6},()=>Math.random().toString(36).slice(2,10).toUpperCase());
    setTwoFactor(t=>({...t,[user.id]:{enabled:true,phone,backupCodes:codes}}));
    log("auth.2fa.enable","Enabled two-factor authentication","shield");
    return {ok:true,codes};
  };
  const disable2FA=()=>{if(!user)return;
    setTwoFactor(t=>{const n={...t};delete n[user.id];return n;});
    log("auth.2fa.disable","Disabled two-factor authentication","shield");
  };

  /* --- references --- */
  const [references,setReferences]=useState(seed?.references||[]);
  /* --- HR SUITE store composition --- */
  const _mainStore={employers,people,jobs,applications,notifications};
  const HR=useHrStore(seed,_mainStore);
  const STF=useStaffingStore({workers:seed?.workers,staffingClients:seed?.staffingClients,jobOrders:seed?.jobOrders,assignments:seed?.assignments,timesheets:seed?.timesheets,staffingPayruns:seed?.staffingPayruns,staffingInvoices:seed?.staffingInvoices,placements:seed?.placements,agencySession:seed?.agencySession,people});


  /* --- persist to localStorage on any change --- */
  useEffect(()=>{ if(typeof window==="undefined")return;
    try{
      const snap={user,passwords,resetCodes,employers,jobs,people,applications,blogs,trainings,cvs,
        saved:[...saved],following:[...following],enrolled:[...enrolled],trainingProgress,paymentMethods,twoFactor,references,
        suspended:[...suspended],notifications,activity,settings,userSettings,
        savedSearches,messages,interviews,reviews,outbox,
        hrEmployees:HR.hrEmployees,hrAttendance:HR.hrAttendance,hrLeave:HR.hrLeave,
        hrTasks:HR.hrTasks,hrEvents:HR.hrEvents,hrInvoices:HR.hrInvoices,
        hrChats:HR.hrChats,hrChatMsgs:HR.hrChatMsgs,hrPayruns:HR.hrPayruns,
        hrCompanySettings:HR.hrCompanySettings,hrSession:HR.hrSession,hrRemember:HR.hrRemember,
        hrDepartments:HR.hrDepartments,hrExpenses:HR.hrExpenses,
        workers:STF.workers,staffingClients:STF.staffingClients,jobOrders:STF.jobOrders,
        assignments:STF.assignments,timesheets:STF.timesheets,staffingPayruns:STF.staffingPayruns,
        staffingInvoices:STF.staffingInvoices,placements:STF.placements,agencySession:STF.agencySession};
      localStorage.setItem(LS_KEY,JSON.stringify(snap));
    }catch(e){/* quota exceeded or private mode — silently drop */}
  },[user,passwords,resetCodes,employers,jobs,people,applications,blogs,trainings,cvs,saved,following,
    enrolled,trainingProgress,suspended,notifications,activity,settings,userSettings,paymentMethods,twoFactor,references,
    savedSearches,messages,interviews,reviews,outbox,
    HR.hrEmployees,HR.hrAttendance,HR.hrLeave,HR.hrTasks,HR.hrEvents,HR.hrInvoices,HR.hrChats,HR.hrChatMsgs,HR.hrPayruns,HR.hrCompanySettings,HR.hrSession]);

  const addReference=(ref)=>{
    if(!user||user.role!=="seeker")return;
    setReferences(l=>[{id:uid("ref"),user:user.id,...ref,addedAt:Date.now()},...l]);
    log("reference.add",`Added reference ${ref.name}`,"user");
  };
  const removeReference=id=>setReferences(l=>l.filter(r=>r.id!==id));

  /* --- company reviews --- */
  const addReview=(empId,rating,text,anon)=>{
    if(!user)return {ok:false,msg:"Sign in first"};
    const rv={id:uid("rv"),employer:empId,user:user.id,rating,text,anon,at:Date.now()};
    setReviews(l=>[rv,...l]);
    /* Also update employer's rolling average rating */
    const empRevs=[rv,...reviews.filter(r=>r.employer===empId)];
    const avg=empRevs.reduce((s,r)=>s+r.rating,0)/empRevs.length;
    setEmployers(list=>list.map(e=>e.id===empId?{...e,rating:Math.round(avg*10)/10}:e));
    log("review.add",`Reviewed ${emp(empId).name} (${rating}★)`,"star");
    return {ok:true};
  };
  const deleteReview=id=>{setReviews(l=>l.filter(r=>r.id!==id));log("review.delete","Deleted a review","trash");};

    /* --- admin impersonation --- */
  const impersonate=userId=>{
    if(user?.role!=="admin"){log("admin.impersonate.deny","Non-admin tried to impersonate","shield");return;}
    const target=people.find(p=>p.id===userId); if(!target)return;
    setImpersonating({originalUser:user}); /* remember admin */
    setUser({...target,role:"seeker"});
    setStack([]); setPg("home");
    log("admin.impersonate",`Admin viewing as ${target.name}`,"eye");
    notify({icon:"eye",title:"Impersonation active",body:`You are viewing as ${target.name}. Return to admin from the banner.`,for:target.id,link:null});
  };
  const stopImpersonating=()=>{
    if(!impersonating?.originalUser)return;
    setUser(impersonating.originalUser); setImpersonating(null); setStack([]); setPg("admHome");
    log("admin.impersonate.stop","Ended impersonation","shield");
  };

    /* --- messaging & interviews --- */
  const sendMessage=(toUserId,jobId,text)=>{
    if(user?.role==="employer"&&!can("messages")){
      notify({icon:"lock",title:"Upgrade to message candidates",body:`Direct messaging is a Growth and Enterprise feature.`,for:user.id,link:"pricing"});
      return {ok:false,msg:"Messaging is a Growth+ feature — upgrade to unlock."};
    }
    const from=user?.id||"anon"; const at=Date.now();
    setMessages(l=>[{id:uid("m"),from,to:toUserId,job:jobId,text,at,read:false},...l]);
    log("message.send","Sent a message","send");
    // notify recipient
    const recipUser=people.find(p=>p.id===toUserId);
    if(recipUser){
      notify({icon:"mail",title:"New message",body:text.slice(0,80),for:toUserId,link:"messages"});
    }
  };
  const markMessageRead=id=>setMessages(l=>l.map(m=>m.id===id?{...m,read:true}:m));

  const scheduleInterview=(candidateAppId,when,mode,notes)=>{
    if(user?.role==="employer"&&!can("interviews")){
      notify({icon:"lock",title:"Upgrade to schedule interviews",body:`Interview scheduling is a Growth and Enterprise feature.`,for:user.id,link:"pricing"});
      return {ok:false,msg:"Interview scheduling is a Growth+ feature."};
    }
    const app=applications.find(a=>a.id===candidateAppId); if(!app)return;
    const j=job(app.job); const e=emp(j.e);
    const iv={id:uid("iv"),app:candidateAppId,candidate:app.user,job:app.job,employer:j.e,
      when,mode,notes:notes||"",status:"scheduled",createdAt:Date.now()};
    setInterviews(l=>[iv,...l]);
    /* auto-move app to Interview stage */
    setApplications(l=>l.map(a=>a.id===candidateAppId?{...a,stage:"Interview",note:`Interview ${mode==="video"?"video call":"in-person"} scheduled for ${when}`}:a));
    notify({icon:"calendar",title:`Interview scheduled — ${e.name}`,
      body:`${mode==="video"?"Video call":"On-site interview"} on ${when} for ${j.t}.`,for:app.user,link:"status"});
    log("interview.schedule",`Scheduled interview with ${person(app.user).name}`,"calendar");
    return iv.id;
  };
  const cancelInterview=id=>{
    setInterviews(l=>l.map(iv=>iv.id===id?{...iv,status:"cancelled"}:iv));
    log("interview.cancel","Cancelled an interview","x");
  };

  /* --- bulk pipeline actions --- */
  const bulkMove=(ids,stage)=>{
    ids.forEach(id=>moveApp(id,stage));
    log("pipeline.bulkMove",`Moved ${ids.length} to ${stage}`,"users");
  };
  const bulkReject=(ids)=>{
    ids.forEach(id=>rejectApp(id));
    log("pipeline.bulkReject",`Rejected ${ids.length} candidates`,"x");
  };

  /* --- reverse match: candidates who match an employer's job but haven't applied --- */
  const reverseMatch=jobId=>{
    const j=job(jobId); if(!j)return [];
    const already=new Set(applications.filter(a=>a.job===jobId).map(a=>a.user));
    return people.filter(p=>!already.has(p.id))
      .map(p=>({p,score:scoreCandidate(p,j)}))
      .filter(x=>x.score>=65)
      .sort((a,b)=>b.score-a.score)
      .slice(0,10);
  };
  const inviteToApply=(candidateId,jobId)=>{
    const j=job(jobId); const e=emp(j.e);
    notify({icon:"target",title:`${e.name} invited you to apply`,
      body:`Your profile matches ${j.t} — ${pay(j)}${payShort(j)}`,for:candidateId,link:"job"});
    log("talent.invite",`Invited ${person(candidateId).name} to apply for ${j.t}`,"send");
  };

  /* --- CSV bulk job import (parses a minimal CSV; validates & creates draft jobs) --- */
  const importJobsCSV=(csvText)=>{
    if(!company)return {ok:false,msg:"Only employers can import jobs"};
    if(!can("csvImport"))return {ok:false,msg:"CSV import is a Growth and Enterprise feature — upgrade to unlock."};
    const lines=csvText.split(/\r?\n/).filter(l=>l.trim());
    if(lines.length<2)return {ok:false,msg:"CSV must include a header row and at least one job"};
    const header=parseCsvLine(lines[0]).map(h=>h.trim().toLowerCase());
    const required=["title","city","province","type","pay_low","pay_high","pay_unit","category"];
    const missing=required.filter(r=>!header.includes(r));
    if(missing.length)return {ok:false,msg:`Missing columns: ${missing.join(", ")}`};
    const idx=Object.fromEntries(header.map((h,i)=>[h,i]));
    const imported=[]; const errors=[];
    lines.slice(1).forEach((row,i)=>{
      const cells=parseCsvLine(row);
      const t=cells[idx.title]; if(!t){errors.push(`Row ${i+2}: missing title`);return;}
      const lo=Number(cells[idx.pay_low])||0, hi=Number(cells[idx.pay_high])||0;
      if(settings.payTransparency&&lo<=0&&hi<=0){errors.push(`Row ${i+2}: pay_low or pay_high is required`);return;}
      const prov=PCODE[cells[idx.province]]||cells[idx.province];
      const nj={id:uid("j"),t,e:company.id,cat:cells[idx.category]||"trades",city:cells[idx.city]||"",prov,
        type:cells[idx.type]||"Full Time",mode:cells[idx.mode]||"On-site",
        lo,hi,unit:cells[idx.pay_unit]||"hr",
        vac:Number(cells[idx.vacancies])||1,exp:cells[idx.experience]||"1+ years",
        edu:cells[idx.education]||"High school diploma",dl:14,posted:"Just now",views:0,
        urgent:false,featured:false,skills:(cells[idx.skills]||"").split(";").map(s=>s.trim()).filter(Boolean),
        perks:(cells[idx.perks]||"").split(";").map(s=>s.trim()).filter(Boolean),
        duties:(cells[idx.duties]||"").split(";").map(s=>s.trim()).filter(Boolean),
        reqs:(cells[idx.requirements]||"").split(";").map(s=>s.trim()).filter(Boolean),
        desc:cells[idx.description]||`Hiring ${t} in ${cells[idx.city]}.`,
        how:"Apply through NorthHire.",status:"review",flagged:false};
      imported.push(nj);
    });
    if(imported.length)setJobs(l=>[...imported,...l]);
    log("job.import",`Imported ${imported.length} jobs via CSV`,"upload");
    return {ok:true,imported:imported.length,errors};
  };

  /* --- employer analytics --- */
  const employerAnalytics=()=>{
    if(!company)return null;
    const myJobs=jobs.filter(j=>j.e===company.id);
    const myAppIds=myJobs.map(j=>j.id);
    const myApps=applications.filter(a=>myAppIds.includes(a.job));
    const totalViews=myJobs.reduce((s,j)=>s+j.views,0);
    const totalApps=myApps.length;
    const conversion=totalViews?Math.round((totalApps/totalViews)*100):0;
    const byStage=STAGES.map(s=>({stage:s,count:myApps.filter(a=>a.stage===s).length}));
    const topJob=myJobs.map(j=>({j,apps:applications.filter(a=>a.job===j.id).length})).sort((a,b)=>b.apps-a.apps)[0];
    const avgScore=myApps.length?Math.round(myApps.map(a=>scoreCandidate(person(a.user),job(a.job)||myJobs[0])).reduce((s,x)=>s+x,0)/myApps.length):0;
    return {totalJobs:myJobs.length,liveJobs:myJobs.filter(j=>j.status==="live").length,totalViews,totalApps,conversion,byStage,topJob,avgScore};
  };

  /* --- fuzzy / synonym expansion for search queries --- */
  const SYNONYMS={
    nurse:["rn","psw","nursing","registered nurse","personal support worker"],
    rn:["nurse","nursing"],
    psw:["personal support worker","health care aide","hca"],
    electrician:["electric","electrical","journeyperson","red seal"],
    driver:["driving","truck","az","dz","hauler","operator","chauffeur"],
    cook:["cooking","kitchen","chef","line cook","prep","food"],
    welder:["welding","fabricator","fabrication"],
    plumber:["plumbing","gas fitter"],
    admin:["administrative","clerk","assistant","reception","secretary"],
    warehouse:["forklift","picker","packer","stockroom"],
    developer:["engineer","programmer","software","dev","coder"],
    accountant:["bookkeeper","accounting","cpa","finance"],
    security:["guard","officer"],
    teacher:["educator","instructor","tutor"],
  };
  const expandQuery=q=>{
    if(!q)return [];
    const base=q.toLowerCase().trim();
    const words=base.split(/\s+/);
    const set=new Set([base,...words]);
    words.forEach(w=>{
      // exact synonym match
      if(SYNONYMS[w])SYNONYMS[w].forEach(s=>set.add(s));
      // reverse lookup: is w a synonym of something?
      Object.entries(SYNONYMS).forEach(([k,vals])=>{if(vals.includes(w))set.add(k);});
      // stem: drop trailing s, ing, ed
      if(w.length>4){
        if(w.endsWith("s"))set.add(w.slice(0,-1));
        if(w.endsWith("ing"))set.add(w.slice(0,-3));
        if(w.endsWith("ed"))set.add(w.slice(0,-2));
      }
    });
    return [...set].filter(Boolean);
  };

  /* --- follow-employer notifications: fired when publishJob is called --- */
  const notifyFollowers=(job,employer)=>{
    people.forEach(p=>{
      if(following.has(employer.id)&&p.id===user?.id){
        notify({icon:"bell",title:`New job at ${employer.name}`,
          body:`${job.t} in ${job.city}, ${job.prov} — ${pay(job)}${payShort(job)}`,
          for:p.id,link:"job"});
      }
    });
  };


  const toggleSave=id=>{if(!user)return go("login");
    setSaved(p=>{const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n;});};
  const followEmployer=id=>{if(!user)return go("login");
    setFollowing(p=>{const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n;});};

  const openJob=(id,opts)=>{setJobId(id);if(!opts?.preview)setJobs(js=>js.map(j=>j.id===id?{...j,views:j.views+1}:j));
    const j=job(id); go("job",j?j.t:"Job details");};
  const openEmployer=id=>{setEmpId(id);const e=emp(id);go("employer",e?e.name:"Employer");};
  const openBlog=id=>{setBlogId(id);const b=blogs.find(x=>x.id===id);go("blog",b?"Article":"Article");};
  const openTraining=id=>{setTrainingId(id);go("training","Training");};
  const openCandidate=id=>{setCandidateId(id);const a=applications.find(x=>x.id===id);
    go("empCandidate",a?person(a.user).name:"Candidate");};

  const beginApply=id=>{setApplyDraft({job:id,avail:"Within 2 weeks",expect:"",letter:"",meets:"Yes"});go("apply1");};
  const submitApply=()=>{
    const j=job(applyDraft.job); const e=emp(j.e);
    /* rate limit: prevent duplicate application to same job */
    const existing=applications.find(a=>a.job===j.id&&a.user===user.id&&a.stage!=="Withdrawn");
    if(existing){
      notify({icon:"alert",title:"Already applied",body:`You applied to ${j.t} on ${existing.at}. Check your status page.`,for:user.id,link:"status"});
      return go("status");
    }
    setApplications(l=>[...l,{id:uid("a"),job:j.id,user:user.id,stage:"Applied",at:"Just now",
      note:"Waiting for employer review",avail:applyDraft.avail,expect:applyDraft.expect,letter:applyDraft.letter,
      withdrawnAt:null,previousStage:null}]);
    notify({icon:"send",title:`Application sent to ${e.name}`,body:`Your application for ${j.t} is now in their pipeline.`,for:user.id,link:"status"});
    log("application.create",`Applied to ${j.t} at ${e.name}`,"send");
    go("applyDone");
  };
  const withdraw=id=>{
    setApplications(l=>l.map(a=>a.id===id?{...a,previousStage:a.stage,stage:"Withdrawn",
      note:"You withdrew this application",withdrawnAt:Date.now()}:a));
    log("application.withdraw","Withdrew an application","x");
    notify({icon:"x",title:"Application withdrawn",body:"You can restore it within 7 days from My Status.",for:user?.id,link:"status"});
  };
  const restoreApp=id=>{
    setApplications(l=>l.map(a=>{if(a.id!==id)return a;
      if(!a.withdrawnAt||Date.now()-a.withdrawnAt>7*24*60*60*1000)return a;
      return {...a,stage:a.previousStage||"Applied",note:"Restored from withdrawn",withdrawnAt:null,previousStage:null};
    }));
    log("application.restore","Restored a withdrawn application","refresh");
  };
  const acceptOffer=id=>{const a=applications.find(x=>x.id===id);const j=job(a.job);
    setApplications(l=>l.map(x=>x.id===id?{...x,note:"Offer accepted — congratulations"}:x));
    notify({icon:"award",title:"Offer accepted",body:`You accepted the offer for ${j.t}.`,for:user.id,link:"status"});
    log("application.accept",`Accepted offer for ${j.t}`,"award");};

  const [hireOnboarding,setHireOnboarding]=useState(null); /* {app,job,person} — surfaces onboarding modal */
  const moveApp=(id,stage)=>{
    const a=applications.find(x=>x.id===id); const j=job(a.job); const e=emp(j.e);
    setApplications(l=>l.map(x=>x.id===id?{...x,stage,note:
      stage==="Reviewed"?"Employer reviewed your profile":stage==="Shortlisted"?"Shortlisted by the employer"
      :stage==="Interview"?"Interview stage — expect scheduling details":stage==="Offer"?"Offer extended — check your notifications"
      :stage==="Hired"?"Welcome to the team! Onboarding details coming.":"Waiting for employer review"}:x));
    /* Filling the last opening closes the listing instead of leaving it live (and collecting
       applicants) forever — vac previously was only ever set at posting time, never decremented. */
    if(stage==="Hired"){
      setJobs(js=>js.map(x=>{if(x.id!==j.id)return x;
        const vac=Math.max(0,(x.vac||1)-1);
        return {...x,vac,status:vac===0?"closed":x.status};}));
    }
    notify({icon:stage==="Hired"?"award":stage==="Offer"?"award":"activity",title:`${stage} — ${e.name}`,
      body:stage==="Hired"?`You've been hired for ${j.t}. Congratulations!`:`Your application for ${j.t} moved to ${stage}.`,for:a.user,link:"status"});
    log("pipeline.move",`Moved ${person(a.user).name} to ${stage} on ${j.t}`,"users");
    /* Trigger HR onboarding suggestion when candidate is hired at an Enterprise employer */
    if(stage==="Hired"&&user?.role==="employer"&&company?.plan==="Enterprise"){
      const p=person(a.user);
      if(p)setHireOnboarding({app:a,job:j,person:p});
    }
  };
  const rejectApp=id=>{const a=applications.find(x=>x.id===id);
    setApplications(l=>l.map(x=>x.id===id?{...x,stage:"Withdrawn",note:"The employer has decided not to move forward with your application at this time."}:x));
    log("pipeline.reject",`Rejected ${person(a.user).name}`,"x");};

  const publishJob=f=>{
    /* plan enforcement: at-or-over live job cap → surface an upgrade */
    if(!can("jobs")){
      notify({icon:"alert",title:"Upgrade to post more jobs",
        body:`Your ${planName()} plan includes ${limitOf("jobs")===Infinity?"unlimited":limitOf("jobs")} live job${limitOf("jobs")===1?"":"s"}. Pause a job or upgrade to publish this one.`,
        for:user?.id,link:"pricing"});
      log("plan.gate",`Blocked job publish — at ${planName()} cap`,"lock");
      return {ok:false,msg:`Your ${planName()} plan allows ${limitOf("jobs")} live job${limitOf("jobs")===1?"":"s"}. Pause one first, or upgrade.`};
    }
    if(settings.payTransparency&&!(Number(f.lo)>0)&&!(Number(f.hi)>0)){
      return {ok:false,msg:"This platform requires every listing to state a pay range or fixed rate."};
    }
    const nj={id:uid("j"),t:f.t.trim(),e:company.id,cat:f.cat,city:f.city.trim(),prov:PCODE[f.prov],type:f.type,mode:f.mode,
      lo:Number(f.lo)||0,hi:Number(f.hi)||0,unit:f.unit,vac:f.vac,exp:f.exp,edu:f.edu,dl:f.dl,posted:"Just now",views:0,
      urgent:f.urgent,featured:f.featured&&settings.employerFeature,
      skills:f.skills.split(",").map(s=>s.trim()).filter(Boolean),
      perks:f.perks.split(",").map(s=>s.trim()).filter(Boolean),
      duties:f.duties.split("\n").map(s=>s.trim()).filter(Boolean),
      reqs:f.reqs.split("\n").map(s=>s.trim()).filter(Boolean),
      desc:f.desc.trim(),how:f.how.trim()||"Apply through NorthHire with your resume.",
      status:settings.autoApproveJobs?"live":"review",flagged:false};
    setJobs(l=>[nj,...l]);
    log("job.publish",`Published "${nj.t}"`,"briefcase");
    notifyFollowers(nj,company);
    /* auto-alert on matching saved searches for all seekers */
    savedSearches.forEach(s=>{
      if(!s.alerts)return;
      const qHit=!s.q||nj.t.toLowerCase().includes(s.q.toLowerCase())||nj.skills.some(k=>k.toLowerCase().includes(s.q.toLowerCase()));
      const catHit=!s.cats?.length||s.cats.includes(nj.cat);
      const whereHit=!s.where||nj.city.toLowerCase().includes(s.where.toLowerCase())||nj.prov.toLowerCase()===s.where.toLowerCase();
      if(qHit&&catHit&&whereHit){
        notify({icon:"target",title:`New match: ${nj.t}`,body:`Matches your saved search "${s.name}" — ${pay(nj)}${payShort(nj)}`,for:s.user,link:"job"});
      }
    });
    setPipelineJob(nj.id); go("empJobs"); return {ok:true};
  };
  const toggleJobStatus=id=>{setJobs(l=>l.map(j=>j.id===id?{...j,status:j.status==="live"?"paused":"live"}:j));
    const j=job(id); log("job.status",`${j.status==="live"?"Paused":"Reopened"} "${j.t}"`,"briefcase");};
  const flagJob=id=>{setJobs(l=>l.map(j=>j.id===id?{...j,flagged:!j.flagged}:j));
    const j=job(id); log("job.flag",`${j.flagged?"Unflagged":"Flagged"} "${j.t}"`,"shield");};
  const setPipelineJobFn=id=>setPipelineJob(id);

  const saveCompany=d=>{setEmployers(l=>l.map(e=>e.id===d.id?d:e));log("company.update",`Updated ${d.name} profile`,"building");};
  const verifyEmployer=(id,v)=>{setEmployers(l=>l.map(e=>e.id===id?{...e,verified:v,hold:v?false:e.hold}:e));
    log("employer.verify",`${v?"Verified":"Revoked verification for"} ${emp(id).name}`,"shield");};
  const holdEmployer=id=>{const wasHeld=!!emp(id)?.hold;
    setEmployers(l=>l.map(e=>e.id===id?{...e,hold:!e.hold}:e));
    log("employer.hold",`${wasHeld?"Released":"Placed"} ${emp(id).name} ${wasHeld?"from":"on"} hold`,"clock");};
  const toggleSuspend=id=>{setSuspended(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
    log("user.suspend",`${suspended.has(id)?"Restored":"Suspended"} ${person(id).name}`,"users");};

  /* content */
  const editBlog=id=>{setEditId(id);go("empBlogEdit",id==="new"?"New article":"Edit article");};
  const editTraining=id=>{setEditId(id);go("empTrainEdit",id==="new"?"New training":"Edit training");};
  const saveBlog=(d,isNew)=>{const {bodyText,...rest}=d;
    setBlogs(l=>isNew?[{...rest},...l]:l.map(b=>b.id===d.id?{...rest}:b));
    log("blog.save",`${isNew?"Created":"Updated"} article "${d.title}" (${d.status})`,"book");
    go(user.role==="admin"?"admBlogs":"empContent");};
  const saveTraining=(d,isNew)=>{const {modsText,outText,...rest}=d;
    setTrainings(l=>isNew?[{...rest},...l]:l.map(t=>t.id===d.id?{...rest}:t));
    log("training.save",`${isNew?"Created":"Updated"} training "${d.title}" (${d.status})`,"cap");
    go(user.role==="admin"?"admTrainings":"empContent");};
  const deleteBlog=id=>{const b=blogs.find(x=>x.id===id);setBlogs(l=>l.filter(x=>x.id!==id));
    log("blog.delete",`Deleted article "${b.title}"`,"trash");};
  const deleteTraining=id=>{const t=trainings.find(x=>x.id===id);setTrainings(l=>l.filter(x=>x.id!==id));
    log("training.delete",`Deleted training "${t.title}"`,"trash");};
  const toggleBlogStatus=id=>{setBlogs(l=>l.map(b=>b.id===id?{...b,status:b.status==="published"?"draft":"published"}:b));
    const b=blogs.find(x=>x.id===id); log("blog.status",`${b.status==="published"?"Unpublished":"Published"} "${b.title}"`,"book");};
  const toggleTrainingStatus=id=>{setTrainings(l=>l.map(t=>t.id===id?{...t,status:t.status==="published"?"draft":"published"}:t));
    const t=trainings.find(x=>x.id===id); log("training.status",`${t.status==="published"?"Unpublished":"Published"} "${t.title}"`,"cap");};

  /* trainings */
  const enrol=id=>{if(!user)return go("login"); if(user.role!=="seeker")return go("denied");
    if(!settings.enrolments)return;
    /* Gate paid trainings behind purchase */
    const _preT=trainings.find(x=>x.id===id);
    if(_preT&&_preT.price>0&&!paidTrainings.has(id)){
      const ok=typeof confirm==="function"?confirm(`This training costs ${money(_preT.price)}. Enroll and charge your default payment method on file?`):true;
      if(!ok)return {ok:false,msg:"Payment cancelled"};
      setPaidTrainings(p=>new Set(p).add(id));
      notify({icon:"wallet",title:"Payment received",body:`${money(_preT.price)} charged for "${_preT.title}"`,for:user.id});
    }
    setEnrolled(p=>new Set(p).add(id)); setTrainingProgress(p=>({...p,[id]:0}));
    setTrainings(l=>l.map(t=>t.id===id?{...t,enrolled:t.enrolled+1}:t));
    const t=trainings.find(x=>x.id===id);
    notify({icon:"cap",title:`Enrolled in ${t.title}`,body:"Your progress is tracked on your profile under Learning.",for:user.id,link:"profile"});
    log("training.enrol",`Enrolled in "${t.title}"`,"cap");};
  const advanceTraining=id=>{const t=trainings.find(x=>x.id===id);
    setTrainingProgress(p=>{const cur=p[id]||0; const step=Math.ceil(100/t.mods.length);
      const nx=Math.min(100,cur+step);
      if(nx>=100&&cur<100)notify({icon:"award",title:`Completed ${t.title}`,body:"Your certificate is ready to download.",for:user?.id,link:"profile"});
      return {...p,[id]:nx};});};

  /* CVs */
  const newCv=()=>{const cv={id:uid("cv"),name:`${user.title} CV`,template:"classic",updated:"just now",
    name0:user.name,title:user.title,email:user.email,phone:user.phone,city:user.city,prov:user.prov,
    summary:user.summary||"",skills:(user.skills||[]).slice(0,8),certs:[],
    exp:[{id:uid("x"),role:user.title,org:"",place:`${user.city}, ${user.prov}`,from:"",to:"Present",detail:""}],
    edu:[{id:uid("e"),qual:user.edu||"",org:"",year:""}]};
    setCvs(l=>[cv,...l]); if(!user.defaultCv)setUser(u=>({...u,defaultCv:cv.id}));
    setCvId(cv.id); go("cvEdit","CV builder"); log("cv.create",`Created CV "${cv.name}"`,"file");};
  const editCv=id=>{setCvId(id);go("cvEdit","CV builder");};
  const saveCv=d=>{setCvs(l=>l.map(c=>c.id===d.id?{...d,updated:"just now"}:c));log("cv.save",`Saved CV "${d.name}"`,"file");};
  const duplicateCv=id=>{const c=cvs.find(x=>x.id===id);
    setCvs(l=>[{...c,id:uid("cv"),name:`${c.name} (copy)`,updated:"just now"},...l]);};
  const deleteCv=id=>{setCvs(l=>l.filter(c=>c.id!==id));
    if(user.defaultCv===id)setUser(u=>({...u,defaultCv:null}));log("cv.delete","Deleted a CV","trash");};
  const setDefaultCv=id=>setUser(u=>({...u,defaultCv:id}));

  /* utilities */
  const downloadText=(name,text,type="text/plain")=>{
    if(typeof document==="undefined")return;
    const blob=new Blob([text],{type}); const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download=name; a.click(); URL.revokeObjectURL(url);};
  const printCv=cv=>{
    if(typeof window==="undefined")return;
    /* Build a print-friendly page and open it. Real PDF would require a lib on server. */
    const html=`<!DOCTYPE html><html><head><title>${cv.name}</title>
      <style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;padding:0 30px;color:#111;line-height:1.5}
        h1{font-size:26pt;margin:0;letter-spacing:-.02em}h2{font-size:12pt;text-transform:uppercase;letter-spacing:.06em;
        color:#555;border-bottom:1px solid #ccc;padding-bottom:4px;margin:24px 0 12px}h3{font-size:11pt;margin:0}
        .h{color:#555;font-size:10pt;margin-top:4px}.sm{font-size:10pt;color:#666}.chip{display:inline-block;padding:3px 9px;
        background:#eef2ff;color:#334;border-radius:99px;font-size:9pt;margin:2px 4px 2px 0}
        @media print{@page{margin:1.5cm}}</style></head><body>
      <h1>${cv.name0||user?.name||""}</h1>
      <div class="h">${cv.title||user?.title||""} — ${cv.city||""}, ${cv.prov||""}</div>
      <div class="h">${cv.email||""} · ${cv.phone||""}</div>
      ${cv.summary?`<h2>Summary</h2><p>${cv.summary}</p>`:""}
      ${cv.exp?.length?`<h2>Experience</h2>${cv.exp.map(x=>`<div style="margin-bottom:14px"><h3>${x.role||""}</h3><div class="h">${x.org||""} · ${x.place||""} · ${x.from||""} – ${x.to||""}</div>${x.detail?`<p style="margin:6px 0 0">${x.detail}</p>`:""}</div>`).join("")}`:""}
      ${cv.edu?.length?`<h2>Education</h2>${cv.edu.map(x=>`<div style="margin-bottom:10px"><h3>${x.qual||""}</h3><div class="h">${x.org||""} · ${x.year||""}</div></div>`).join("")}`:""}
      ${cv.skills?.length?`<h2>Skills</h2><div>${cv.skills.map(s=>`<span class="chip">${s}</span>`).join("")}</div>`:""}
      ${cv.certs?.length?`<h2>Certifications</h2><div>${cv.certs.map(c=>`<span class="chip">${c}</span>`).join("")}</div>`:""}
      <script>window.onload=()=>setTimeout(()=>window.print(),300);</script>
      </body></html>`;
    const w=window.open("","_blank"); if(!w){alert("Enable pop-ups to download your CV as a PDF");return;}
    w.document.write(html); w.document.close();
    log("cv.print",`Printed CV "${cv.name}"`,"download");
  };
  const printCert=t=>{
    if(!user){go("login");return;}
    if(!t){alert("Course not found");return;}
    /* Build a proper printable certificate page rather than a text file */
    if(typeof window==="undefined"){
      downloadText(`certificate-${t.id}.txt`,
        `NorthHire Certificate of Completion\n\nAwarded to: ${user.name||"—"}\nCourse: ${t.title||"—"}\nProvider: ${t.provider||"NorthHire Learning"}\nHours: ${t.hours||0}\nDate: ${new Date().toLocaleDateString("en-CA")}`);
      return;
    }
    const html=`<!DOCTYPE html><html><head><title>Certificate — ${t.title}</title>
      <style>body{font-family:Georgia,serif;margin:0;padding:40px;background:#fff;color:#111;display:flex;align-items:center;justify-content:center;min-height:100vh}
      .cert{max-width:820px;width:100%;padding:60px 70px;border:8px double #005CCC;border-radius:8px;text-align:center;position:relative}
      .cert::before{content:"";position:absolute;inset:14px;border:1px solid #005CCC;border-radius:4px;pointer-events:none}
      .brand{font-size:14pt;color:#005CCC;letter-spacing:.14em;text-transform:uppercase;font-weight:700;margin-bottom:8px}
      h1{font-size:36pt;margin:0 0 20px;letter-spacing:-.02em;color:#111}
      .lead{font-size:13pt;color:#555;margin-bottom:30px}
      .name{font-size:32pt;margin:20px 0;color:#005CCC;font-style:italic;border-bottom:1px solid #ddd;padding-bottom:16px;display:inline-block;min-width:60%}
      .course{font-size:16pt;margin:20px 0;font-weight:600}
      .prov{font-size:11pt;color:#666;margin-bottom:40px}
      .meta{display:flex;justify-content:space-around;margin-top:40px;padding-top:24px;border-top:1px solid #eee;font-size:10pt;color:#666}
      .meta div{text-align:center}.meta .lbl{text-transform:uppercase;letter-spacing:.08em;font-size:8.5pt;color:#999;margin-bottom:4px}
      @media print{@page{size:landscape;margin:0}body{padding:0}.cert{border-color:#005CCC;padding:60px 80px}}</style></head>
      <body><div class="cert">
        <div class="brand">NorthHire — Certificate of Completion</div>
        <h1>This certifies that</h1>
        <div class="name">${(user.name||"Learner").replace(/[<>]/g,"")}</div>
        <div class="lead">has successfully completed the course</div>
        <div class="course">${(t.title||"Untitled Course").replace(/[<>]/g,"")}</div>
        <div class="prov">delivered by ${(t.provider||"NorthHire Learning").replace(/[<>]/g,"")}${t.trainerName?` · Instructor: ${t.trainerName.replace(/[<>]/g,"")}`:""}</div>
        <div class="meta">
          <div><div class="lbl">Hours</div><div>${t.hours||0}</div></div>
          <div><div class="lbl">Date issued</div><div>${new Date().toLocaleDateString("en-CA",{year:"numeric",month:"long",day:"numeric"})}</div></div>
          <div><div class="lbl">Certificate ID</div><div>NH-${t.id?.toUpperCase()}-${Date.now().toString().slice(-6)}</div></div>
        </div>
      </div>
      <script>window.onload=()=>setTimeout(()=>window.print(),400);</script>
      </body></html>`;
    const w=window.open("","_blank");
    if(!w){
      /* Popup blocked — fall back to text file */
      downloadText(`certificate-${t.id}.txt`,
        `NorthHire Certificate of Completion\n\nAwarded to: ${user.name}\nCourse: ${t.title}\nProvider: ${t.provider}\nHours: ${t.hours}\nDate: ${new Date().toLocaleDateString("en-CA")}`);
      alert("Enable pop-ups to print a professionally formatted certificate. A text version has been downloaded.");
      return;
    }
    w.document.write(html); w.document.close();
    log("training.cert",`Downloaded certificate for "${t.title}"`,"award");
  };
  const printInvoice=(id,date,amt)=>downloadText(`${id}.txt`,`NorthHire invoice ${id}\nDate: ${date}\nAmount: $${amt}.00 CAD\nStatus: Paid`);
  const exportApplicants=jid=>{const j=job(jid);
    const rows=[["Name","Email","Stage","Applied","Fit"],...applications.filter(a=>a.job===jid)
      .map(a=>{const u=person(a.user);return [u.name,u.email,a.stage,a.at,scoreCandidate(u,j)];})];
    downloadText(`applicants-${jid}.csv`,rows.map(r=>r.join(",")).join("\n"),"text/csv");};
  const exportLog=(list)=>downloadText("activity-log.csv",
    ["Time,Actor,Action,Detail",...(list||activity).map(e=>`${e.at},"${e.actor}",${e.action},"${e.text}"`)].join("\n"),"text/csv");
  const share=x=>log("share",`Shared "${x.t||x.title}"`,"share");
  const choosePlan=n=>{
    if(!PLANS[n])return;
    if(user?.role==="employer"){setEmployers(l=>l.map(e=>e.id===company.id?{...e,plan:n}:e));
      log("billing.plan",`Switched to the ${n} plan`,"wallet");go("empBilling");
    }else go(user?"denied":"login");};

  /* --- plan gating: single source of truth for feature access --- */
  const currentPlan=()=>{if(!company)return null; return PLANS[company.plan]||PLANS.Free;};
  const planName=()=>company?.plan||"Free";
  const can=(feature)=>{const p=currentPlan(); if(!p)return false;
    if(feature==="jobs")return jobs.filter(j=>j.e===company.id&&j.status==="live").length<p.jobs;
    /* messages is the one PLANS field that's sometimes a descriptive string ("limited") rather
       than a boolean — !!p.messages treated that truthy string as access-granted on Free. Every
       other feature (including numeric ones like `featured`, where 0/Infinity are meaningful) is
       correctly gated by plain truthiness. */
    if(feature==="messages")return p.messages===true;
    return !!p[feature];
  };
  const limitOf=(feature)=>{const p=currentPlan(); if(!p)return 0; return p[feature];};
  const planRequires=(feature)=>PLAN_REQUIRES[feature]||"Growth";
  const updateCard=()=>log("billing.card","Updated the payment method","wallet");
  const setSetting=(k,v)=>{setSettings(s=>({...s,[k]:v}));
    log("settings.change",`${v?"Enabled":"Disabled"} ${k}`,"gear");};
  const readNotif=(id,link)=>{setNotifications(l=>l.map(n=>n.id===id?{...n,read:true}:n)); if(link)go(link);};
  const markAllRead=()=>setNotifications(l=>l.map(n=>({...n,read:true})));

  const A={pg,go,back,pageTitle,homePg,history:stack,user,company,employers,jobs,people,applications,blogs,trainings,cvs,passwords,resetCodes,outbox,savedSearches,messages,interviews,reviews,impersonating,setImpersonating,hireOnboarding,setHireOnboarding,
    hasAccount,checkPassword,upsertPassword,loginWithPassword,resetPasswordRequest,resetPasswordConfirm,completeEmployerSignup,clearAllData,
    saveSearch,deleteSavedSearch,toggleSearchAlert,salaryInsight,skillsGap,expandQuery,restoreApp,notifyFollowers,
    sendMessage,markMessageRead,scheduleInterview,cancelInterview,bulkMove,bulkReject,reverseMatch,inviteToApply,importJobsCSV,employerAnalytics,
    impersonate,stopImpersonating,
    PLANS,PLAN_ORDER,currentPlan,planName,can,limitOf,planRequires,
    paymentMethods,addPaymentMethod,removePaymentMethod,setDefaultPayment,
    twoFactor,enable2FA,disable2FA,
    references,addReference,removeReference,
    addReview,deleteReview,
    saved,following,enrolled,trainingProgress,suspended,notifications,activity,settings,userSettings,search,setSearch,
    jobId,empId,blogId,trainingId,cvId,editId,candidateId,pipelineJob,applyDraft,setApplyDraft,
    emp,job,person,score,scoreCandidate,matchReasons,myApps,appliedJobIds,myNotifications,defaultCv,
    completeness,completenessHint,tabBadges,
    login,logout,completeSignup,saveProfile,deleteAccount,exportData,setUserSetting,
    toggleSave,followEmployer,openJob,openEmployer,openBlog,openTraining,openCandidate,
    beginApply,submitApply,withdraw,acceptOffer,moveApp,rejectApp,
    publishJob,toggleJobStatus,flagJob,setPipelineJob:setPipelineJobFn,saveCompany,verifyEmployer,holdEmployer,toggleSuspend,
    editBlog,editTraining,saveBlog,saveTraining,deleteBlog,deleteTraining,toggleBlogStatus,toggleTrainingStatus,
    enrol,advanceTraining,paidTrainings,newCv,editCv,saveCv,duplicateCv,deleteCv,setDefaultCv,
    printCv,printCert,printInvoice,exportApplicants,exportLog,share,choosePlan,updateCard,setSetting,
    readNotif,markAllRead,logActivity:log,
    ...HR,
    ...STF};

  return A;
}
