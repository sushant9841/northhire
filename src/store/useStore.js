import { useState, useMemo, useEffect, useRef } from "react";
import { ROUTES } from "../routes.js";
import { uid, money, pay, payUnit, payShort, annual, nowStamp, _fmtDate } from "../helpers/utils.js";
import { sanitizeHtml } from "../helpers/sanitize.js";
import { CATM, PCODE, STAGES, PLANS as DEFAULT_PLANS, PLAN_REQUIRES, PLAN_ORDER } from "./seed/constants.js";
import { DEFAULT_PAYROLL_TAX_CONFIG } from "../helpers/payrollTax.js";
import { SEED_EMPLOYERS } from "./seed/employers.js";
import { SEED_JOBS } from "./seed/jobs.js";
import { SEED_PEOPLE } from "./seed/people.js";
import { SEED_APPS } from "./seed/applications.js";
import { SEED_BLOGS } from "./seed/blogs.js";
import { SEED_TRAININGS } from "./seed/trainings.js";
import { useHrStore } from "./useHrStore.js";
import { useStaffingStore } from "./useStaffingStore.js";
import { api, ApiUnreachableError, API_BASE } from "../helpers/api.js";
import { mapApiJob, mapApiEmployer, mapApiApplication, mapApiUser } from "../helpers/apiMap.js";
import { buildPath, matchPath, ID_STATE_FOR_ROUTE } from "../helpers/urlRouter.js";
import { parseCsvLine } from "../helpers/csv.js";
import { expandQuery } from "../helpers/synonyms.js";

export function useStore(){
  /* Real URL support: computed once at mount (this hook is only ever instantiated once at the
     app root) so every entity-id useState below can seed itself from whatever the visitor
     actually landed on - a shared link, a bookmark, or a hard refresh. */
  const initialMatch=typeof window!=="undefined"?matchPath(ROUTES,window.location.pathname):null;
  const [pg,setPg]=useState(()=>{
    /* Minimal hash entry point so "open HR Suite in a new tab" lands somewhere real —
       HrShell's own guard redirects to hrLogin if this tab has no active HR session. */
    if(typeof window!=="undefined"&&window.location.hash==="#hr")return "hrDashboard";
    return initialMatch?.pg||"home";
  });
  const [stack,setStack]=useState([]);
  /* A seeker/employer/admin `user` is now backed by a real httpOnly session cookie the browser
     manages itself - there's no client-readable token to gate on, so the app always starts
     signed-out and the /auth/me effect below fills in `user` once the cookie is checked. */
  const [user,setUser]=useState(null);
  /* Demo-account passwords for the dev sign-in shortcuts. `import.meta.env.DEV` is statically
     replaced at build time, so a production bundle ships an empty object and the plaintext
     credentials - including the administrator's - are not present in the shipped JS at all.
     The server has always been the real authority for credentials; this was only ever a
     convenience map for local development. */
  const DEMO_PASSWORDS=import.meta.env.DEV?{
    "sarah.chen@example.ca":"Password123",
    "marcus.b@example.ca":"Password123",
    "priya.r@example.ca":"Password123",
    "hr@pcl.com":"Employer123",
    "admin@northhire.ca":"Admin1234"
  }:{};
  const [passwords,setPasswords]=useState(DEMO_PASSWORDS);
  const [employers,setEmployers]=useState(SEED_EMPLOYERS);
  const [jobs,setJobs]=useState(SEED_JOBS);
  const [people,setPeople]=useState(SEED_PEOPLE);
  const [applications,setApplications]=useState(SEED_APPS);
  const [blogs,setBlogs]=useState(SEED_BLOGS);
  const [trainings,setTrainings]=useState(SEED_TRAININGS);
  const [cvs,setCvs]=useState([]);
  const [saved,setSaved]=useState(new Set());
  const [following,setFollowing]=useState(new Set());
  const [enrolled,setEnrolled]=useState(new Set());
  const [paidTrainings,setPaidTrainings]=useState(()=>new Set());
  const [trainingProgress,setTrainingProgress]=useState({});
  const [suspended,setSuspended]=useState(new Set());
  const [suspensionInfo,setSuspensionInfo]=useState({}); /* {[userId]: {reason, at}} */
  const [invitedCandidates,setInvitedCandidates]=useState(new Set()); /* `${jobId}:${candidateId}` */
  const [candidateNotes,setCandidateNotes]=useState({}); /* {[candidateId]: {note,tags,updatedAt}} - employer's own private CRM notes */
  const [notifications,setNotifications]=useState([]);
  const [savedSearches,setSavedSearches]=useState([]);
  const [messages,setMessages]=useState([]);
  const [interviews,setInterviews]=useState([]);
  const [reviews,setReviews]=useState([]);
  const [outbox,setOutbox]=useState([]);
  const [impersonating,setImpersonating]=useState(null);
  const [activity,setActivity]=useState([]);
  const [securitySignals,setSecuritySignals]=useState(null);
  const [opsHealth,setOpsHealth]=useState(null);
  const [platformConfig,setPlatformConfig]=useState(null); // {plans, payrollTax, staffingRates, staffingAgency} - fetched from the backend; null until loaded
  const [oauthProviders,setOauthProviders]=useState({google:false,github:false});
  const [turnstileSiteKey,setTurnstileSiteKey]=useState(null);
  const [settings,setSettings]=useState({employerBlogs:true,employerTrainings:true,employerFeature:true,
    autoApproveJobs:true,publicSignup:true,cvBuilder:true,matching:true,enrolments:true,payTransparency:true,maintenance:false});
  const [userSettings,setUserSettings]=useState({matchAlerts:true,appAlerts:true,marketing:false,discoverable:true,hideEmployer:false,reducedMotion:false,lang:"en"});
  const [search,setSearch]=useState({q:"",where:"",cats:[]});
  const _idFor=k=>initialMatch&&ID_STATE_FOR_ROUTE[initialMatch.pg]===k?initialMatch.id:null;
  const [jobId,setJobId]=useState(()=>_idFor("jobId")),[empId,setEmpId]=useState(()=>_idFor("empId")),[blogId,setBlogId]=useState(()=>_idFor("blogId"));
  const [trainingId,setTrainingId]=useState(()=>_idFor("trainingId")),[cvId,setCvId]=useState(()=>_idFor("cvId")),[editId,setEditId]=useState(()=>_idFor("editId"));
  const [candidateId,setCandidateId]=useState(()=>_idFor("candidateId")),[pipelineJob,setPipelineJob]=useState(null);
  const [inviteToken,setInviteToken]=useState(()=>_idFor("inviteToken"));
  const [applyDraft,setApplyDraft]=useState({job:null,avail:"Within 2 weeks",expect:"",letter:"",meets:"Yes"});
  /* Lightweight prefill for ContactPage — there's no real URL/param passing between pages, so
     this is the same pattern as applyDraft: a small piece of shared state a page reads and
     clears on mount. Used so "I'm interested in [role]" style links actually carry context. */
  const [contactPrefill,setContactPrefill]=useState(null);
  /* Clicking an author's name/avatar on a blog card or article previously did nothing - same
     carry pattern, BlogsPage reads and clears this on mount. */
  const [blogAuthorFilter,setBlogAuthorFilter]=useState(null);
  const filterBlogsByAuthor=name=>{setBlogAuthorFilter(name);go("blogs");};
  /* Same idea for the pricing-page CTAs: which tier a prospect picked before signing up,
     previously discarded entirely — every signup landed on Free regardless of the button clicked. */
  const [pendingPlan,setPendingPlan]=useState(null);
  /* Feature-gated pages a plan blocks (sidebar nav items) trigger this rich upgrade modal
     directly in DashShell; pages nested under it (e.g. EmpCompany's branded-logo editor)
     need the same modal but live outside DashShell's own local state, so it's lifted here. */
  const [upgradeModal,setUpgradeModal]=useState(null);
  /* Same carry pattern for the "Verified employers only" browse-jobs dropdown link, which
     previously called the identical A.go("employers") as "Browse all companies" - no filter
     ever actually reached the destination page. */
  const [employersPrefill,setEmployersPrefill]=useState(null);
  const [pageTitle,setPageTitle]=useState(null);

  /* --- real backend sync: every domain in this store is now API-backed, nothing persists to
     localStorage. Jobs/employers are global, so they're fetched once here; a network failure
     (server not running) is caught and swallowed so the app still renders against the seed
     data used as its initial state, same graceful-degradation behavior as before this wiring
     existed - it just won't reflect any real signed-in session until the server comes back. */
  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      try{
        const [jobsRes,employersRes]=await Promise.all([api.get("/jobs?status=all"),api.get("/employers")]);
        if(cancelled)return;
        setJobs(jobsRes.jobs.map(mapApiJob));
        setEmployers(employersRes.employers.map(mapApiEmployer));
      }catch(e){
        if(typeof console!=="undefined")console.warn(e instanceof ApiUnreachableError?`[NorthHire] ${e.message}`:`[NorthHire] API sync failed: ${e.message}`);
      }
    })();
    return ()=>{cancelled=true;};
  },[]);
  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      try{
        const {user:apiUser}=await api.get("/auth/me");
        if(!cancelled)setUser(mapApiUser(apiUser));
      }catch{
        /* No cookie, an expired one, or the server's unreachable - either way there's no session. */
      }
    })();
    return ()=>{cancelled=true;};
  },[]);
  useEffect(()=>{
    api.get("/auth/oauth/status").then(({providers})=>setOauthProviders(providers)).catch(()=>{});
    api.get("/auth/turnstile-config").then(({siteKey})=>setTurnstileSiteKey(siteKey)).catch(()=>{});
  },[]);
  const oauthStart=(provider)=>{window.location.href=`${API_BASE}/auth/oauth/${provider}/start`;};
  /* OAuth ("Sign in with Google/GitHub") lands back here via a real browser redirect (not a fetch
     call the store can await), so the outcome arrives as a query param instead - surfaced once as
     a toast, then stripped from the URL so a refresh doesn't repeat it. */
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    const err=params.get("oauthError"); const ok=params.get("oauthSuccess");
    if(!err&&!ok)return;
    if(err)toast(err,"danger"); else if(ok)toast("Signed in","ok");
    params.delete("oauthError"); params.delete("oauthSuccess");
    const qs=params.toString();
    window.history.replaceState({},"",window.location.pathname+(qs?`?${qs}`:""));
  },[]);
  /* Applications are per-user (a seeker's own, or an employer's own across their jobs), so
     unlike jobs/employers they're synced per logged-in session rather than once globally -
     otherwise an application created in one browser session (or by a different real account)
     would never appear to the other side of it (e.g. an employer's applicant count staying at
     0 after a seeker really applied), since local mutations only touch the current tab's state. */
  useEffect(()=>{
    if(!user||(user.role!=="seeker"&&user.role!=="employer"))return;
    let cancelled=false;
    (async()=>{
      try{
        const path=user.role==="seeker"?"/applications/mine":"/applications/employer/mine";
        const {applications:fresh}=await api.get(path);
        if(cancelled)return;
        setApplications(l=>{
          const freshIds=new Set(fresh.map(a=>a.id));
          return [...fresh.map(mapApiApplication),...l.filter(a=>!freshIds.has(a.id))];
        });
      }catch(e){
        if(typeof console!=="undefined")console.warn(`[NorthHire] Application sync failed: ${e.message}`);
      }
    })();
    return ()=>{cancelled=true;};
  },[user?.id,user?.role]);

  /* Published content is global, not per-session, so it's fetched once on mount alongside
     jobs/employers - the same "server is the source of truth, seed data is just the pre-fetch
     placeholder" pattern used everywhere else in this store. */
  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      try{
        const [{blogs:freshBlogs},{trainings:freshTrainings}]=await Promise.all([
          api.get("/content/blogs?status=all"),api.get("/content/trainings?status=all")]);
        if(cancelled)return;
        setBlogs(freshBlogs); setTrainings(freshTrainings);
      }catch(e){
        if(typeof console!=="undefined")console.warn(`[NorthHire] Content sync failed: ${e.message}`);
      }
    })();
    return ()=>{cancelled=true;};
  },[]);

  /* Every remaining personal domain (CVs, saved searches, messages, interviews, reviews,
     notifications, saved jobs, followed employers, enrolments, references, payment methods,
     2FA, personal settings, sent-mail outbox) used to live only in the localStorage snapshot -
     nothing server-backed kept it around. Now that each has a real table and route, they're
     fetched here per session the same way applications are, and every mutation below writes
     through the API instead of only touching local state. */
  useEffect(()=>{
    if(!user){
      setCvs([]);setSavedSearches([]);setMessages([]);setInterviews([]);setReviews([]);setNotifications([]);
      setSaved(new Set());setFollowing(new Set());setEnrolled(new Set());setTrainingProgress({});
      setReferences([]);setPaymentMethods([]);setTwoFactor({});setInvitedCandidates(new Set());setOutbox([]);setCandidateNotes({});setEmployerInvoices([]);
      return;
    }
    let cancelled=false;
    (async()=>{
      try{
        const isSeeker=user.role==="seeker", isEmployer=user.role==="employer";
        const calls=[
          api.get("/seeker/notifications"),
          api.get("/seeker/messages"),
          api.get("/seeker/user-settings"),
          api.get("/auth/outbox"),
        ];
        if(isSeeker)calls.push(
          api.get("/seeker/cvs"),api.get("/seeker/saved-searches"),api.get("/seeker/interviews"),
          api.get("/seeker/saved-jobs"),api.get("/seeker/followed-employers"),api.get("/content/enrolments/mine"),
          api.get("/seeker/references"),api.get("/seeker/payment-methods"),api.get("/seeker/two-factor"),
        );
        if(isEmployer)calls.push(api.get("/seeker/interviews"),api.get("/seeker/invited-candidates"),api.get("/employers/candidate-notes"),api.get("/billing/invoices"));
        const results=await Promise.all(calls);
        if(cancelled)return;
        const [{notifications:n},{messages:m},{userSettings:us},{outbox:ob}]=results;
        setNotifications(n);setMessages(m);setUserSettings(us);setOutbox(ob);
        let i=4;
        if(isSeeker){
          setCvs(results[i++].cvs);
          setSavedSearches(results[i++].savedSearches);
          setInterviews(results[i++].interviews);
          setSaved(new Set(results[i++].jobIds));
          setFollowing(new Set(results[i++].employerIds));
          const enrol=results[i++].enrolments;
          setEnrolled(new Set(enrol.map(e=>e.trainingId)));
          setTrainingProgress(Object.fromEntries(enrol.map(e=>[e.trainingId,e.progress])));
          setPaidTrainings(new Set(enrol.filter(e=>e.paid).map(e=>e.trainingId)));
          setReferences(results[i++].references);
          setPaymentMethods(results[i++].paymentMethods);
          const tf=results[i++].twoFactor;
          setTwoFactor(tf?{[user.id]:tf}:{});
        }
        if(isEmployer){
          setInterviews(results[i++].interviews);
          setInvitedCandidates(new Set(results[i++].invited));
          setCandidateNotes(Object.fromEntries(results[i++].notes.map(n=>[n.candidate,n])));
          setEmployerInvoices(results[i++].invoices);
        }
        /* Reviews are public per-employer, not per-user - fetched lazily by whichever employer
           profile page is open (see employers.jsx), not here. */
      }catch(e){
        if(typeof console!=="undefined")console.warn(`[NorthHire] Account data sync failed: ${e.message}`);
      }
    })();
    return ()=>{cancelled=true;};
  },[user?.id,user?.role]);

  /* Platform-wide settings and the admin activity log - fetched once (settings are public,
     used to gate features for every visitor) and re-fetched for admins so the audit log page
     shows what actually happened across sessions, not just this tab's in-memory log. */
  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      try{
        const {settings:s}=await api.get("/platform/settings");
        if(!cancelled)setSettings(s);
      }catch(e){
        if(typeof console!=="undefined")console.warn(`[NorthHire] Platform settings sync failed: ${e.message}`);
      }
    })();
    return ()=>{cancelled=true;};
  },[]);
  /* Business config (plan limits, payroll tax brackets, staffing burden rates/agency policy) -
     admin-editable on the backend now instead of hardcoded bundled constants, so every client
     fetches the live values once at load instead of trusting whatever shipped in the JS bundle. */
  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      try{
        const cfg=await api.get("/platform/config");
        if(!cancelled)setPlatformConfig(cfg);
      }catch(e){
        if(typeof console!=="undefined")console.warn(`[NorthHire] Platform config sync failed: ${e.message}`);
      }
    })();
    return ()=>{cancelled=true;};
  },[]);
  useEffect(()=>{
    if(user?.role!=="admin")return;
    let cancelled=false;
    (async()=>{
      try{
        const {activity:a}=await api.get("/platform/activity");
        if(!cancelled)setActivity(a.map(e=>({id:e.id,action:e.action,text:e.text,icon:e.icon,actor:e.actor,at:new Date(e.at).toLocaleString("en-CA")})));
      }catch(e){
        if(typeof console!=="undefined")console.warn(`[NorthHire] Activity log sync failed: ${e.message}`);
      }
    })();
    return ()=>{cancelled=true;};
  },[user?.id,user?.role]);
  useEffect(()=>{
    if(user?.role!=="admin")return;
    let cancelled=false;
    (async()=>{
      try{
        const signals=await api.get("/platform/security-signals");
        if(!cancelled)setSecuritySignals(signals);
      }catch(e){
        if(typeof console!=="undefined")console.warn(`[NorthHire] Security signals sync failed: ${e.message}`);
      }
    })();
    return ()=>{cancelled=true;};
  },[user?.id,user?.role]);
  useEffect(()=>{
    if(user?.role!=="admin")return;
    let cancelled=false;
    (async()=>{
      try{
        const health=await api.get("/platform/ops-health");
        if(!cancelled)setOpsHealth(health);
      }catch(e){
        if(typeof console!=="undefined")console.warn(`[NorthHire] Ops-health sync failed: ${e.message}`);
      }
    })();
    return ()=>{cancelled=true;};
  },[user?.id,user?.role]);

  const emp=id=>employers.find(e=>e.id===id)||employers[0];
  const job=id=>jobs.find(j=>j.id===id);
  const jobHiringType=jobId=>job(jobId)?.hiringType||"direct";
  const jobHiringLabel=jobId=>{
    const t=jobHiringType(jobId);
    if(t==="agency-contract")return "Agency contract — NorthHire Staffing";
    if(t==="agency-perm")return "Agency permanent — placed by NorthHire Staffing";
    return "Direct — hired by employer";
  };
  const person=id=>people.find(p=>p.id===id)||people[0];
  const company=user?.role==="employer"?employers.find(e=>e.owner===user.email)||employers[0]:null;
  const homePg=user?.role==="employer"?"empHome":user?.role==="admin"?"admHome":"home";

  const log=(action,text,icon)=>setActivity(a=>[{id:uid("l"),action,text,icon,
    /* Was capped at 120 — silently dropped anything older with no warning. 1000 is still a
       client-only cap (no real backend/archival exists), but it's no longer trivial to blow
       through in normal demo use. While impersonating, the acting admin (not the target whose
       account they're viewing) is the one actually responsible for the action, so the log
       attributes to them explicitly rather than silently reading as if the target did it. */
    actor:impersonating?.originalUser?`${impersonating.originalUser.name} (admin, viewing as ${user?.name})`
      :user?`${user.name} (${user.role})`:"Guest",at:nowStamp()},...a].slice(0,1000));
  const notify=(n)=>setNotifications(list=>[{id:uid("n"),read:false,at:"Just now",...n},...list]);

  /* Auto-dismissing toast/snackbar — the shared feedback primitive that never existed, which is
     why so many actions across the app reached for alert() instead. Rendered by <ToastHost/>,
     mounted once at the app root. */
  const [toasts,setToasts]=useState([]);
  const toast=(message,tone="brand")=>{
    const id=uid("toast");
    setToasts(l=>[...l,{id,message,tone}]);
    setTimeout(()=>setToasts(l=>l.filter(t=>t.id!==id)),3500);
  };
  const dismissToast=id=>setToasts(l=>l.filter(t=>t.id!==id));

  /* Real URL support, part 2: which entity id (if any) the target route needs, and the id's
     current value so `go()` can build a real path even when the caller doesn't pass one
     explicitly (idOverride exists for callers like openJob/openBlog that set the id state and
     navigate in the same tick — reading the id back from state would still see the stale
     pre-update value, since state setters don't apply mid-render). */
  const _idStateValues={jobId,empId,blogId,trainingId,candidateId,cvId,editId,inviteToken};
  const go=(p,title,idOverride)=>{
    const r=ROUTES[p];
    if(r?.roles&&(!user||!r.roles.includes(user.role))){setStack(s=>[...s,pg]);setPg("denied");setPageTitle(null);return;}
    /* Auto-provision HR session when an Enterprise employer navigates into HR modules.
       This makes HR Suite feel like a native tab inside the employer console,
       instead of demanding a separate /hr-login step. */
    if(p?.startsWith("hr")&&p!=="hrLogin"&&user?.role==="employer"&&company?.plan==="Enterprise"&&!HR?.hrCurrentEmp()){
      HR?.hrAutoLogin?.();
    }
    if(typeof window!=="undefined"){
      const idKey=ID_STATE_FOR_ROUTE[p];
      const id=idOverride!==undefined?idOverride:(idKey?_idStateValues[idKey]:null);
      const path=buildPath(ROUTES,p,id)||"/";
      const depth=(window.history.state?.depth||0)+1;
      window.history.pushState({depth,pg:p,id},"",path);
    }
    setStack(s=>[...s,pg]); setPg(p); setPageTitle(title||null);
    if(typeof window!=="undefined")window.scrollTo?.(0,0);
  };
  /* Browser-native back/forward is now the source of truth (see the popstate effect below) -
     this in-app Back button just asks the browser to go back one real entry when we've pushed
     at least one, and falls back to homePg only when there's truly nothing to unwind (e.g. a
     shared link opened with no prior in-app navigation this session). */
  const back=()=>{
    if(typeof window!=="undefined"&&(window.history.state?.depth||0)>0){window.history.back();return;}
    setStack(s=>{const c=[...s];const prev=c.pop();setPg(prev||homePg);setPageTitle(null);return c;});
    if(typeof window!=="undefined")window.scrollTo?.(0,0);
  };
  useEffect(()=>{
    if(typeof window==="undefined")return;
    /* Establishes depth:0 baseline so the very first back() press falls through to the
       homePg fallback instead of trying to unwind a history entry that doesn't carry our
       {depth,pg,id} shape (e.g. whatever the browser had before this page ever loaded). */
    if(!window.history.state)window.history.replaceState({depth:0,pg,id:null},"",window.location.pathname+window.location.search);
    const SETTER_FOR_ID_KEY={jobId:setJobId,empId:setEmpId,blogId:setBlogId,trainingId:setTrainingId,candidateId:setCandidateId,cvId:setCvId,editId:setEditId,inviteToken:setInviteToken};
    const onPopState=()=>{
      const state=window.history.state;
      let pg2,id2;
      if(state?.pg){pg2=state.pg;id2=state.id??null;}
      else{const m=matchPath(ROUTES,window.location.pathname);pg2=m?.pg||"home";id2=m?.id??null;}
      const idKey=ID_STATE_FOR_ROUTE[pg2];
      if(idKey)SETTER_FOR_ID_KEY[idKey]?.(id2);
      setPg(pg2); setPageTitle(null);
      setStack(s=>s.length?s.slice(0,-1):s);
      window.scrollTo?.(0,0);
    };
    window.addEventListener("popstate",onPopState);
    return ()=>window.removeEventListener("popstate",onPopState);
  },[]);
  /* Login/logout/signup-success and similar "fresh start" transitions used to call setPg(...)
     directly, bypassing go() entirely - the app's internal state was correct (PAGES[pg]
     re-rendered fine) but the URL was left stuck on whatever page you navigated FROM (e.g.
     still showing /login after a successful sign-in). Depth resets to 0 here since these are
     genuine new contexts, not a step deeper into the previous one - Back afterward should land
     on home, not try to unwind pre-login browsing. */
  const _hardNav=p=>{
    if(typeof window!=="undefined"){
      const path=buildPath(ROUTES,p,null)||"/";
      window.history.pushState({depth:0,pg:p,id:null},"",path);
    }
    setStack([]); setPg(p); setPageTitle(null);
  };

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
  /* Employer-side equivalent of the seeker's matchReasons()/skillsGap() breakdown - shows the
     same 4 weighted components scoreCandidate() actually uses, so "why did this candidate score
     X" isn't a bare unexplained number on the employer side the way it used to be. */
  const scoreBreakdown=(u,j)=>{
    if(!u||!j)return [];
    const req=j.skills.map(s=>s.toLowerCase()), has=(u.skills||[]).map(s=>s.toLowerCase());
    const overlap=req.filter(s=>has.includes(s)).length;
    const skill=req.length?overlap/req.length:.5;
    const expYears=typeof u.years==="number"?u.years:3;
    const exp=Math.min(1,expYears/8);
    const loc=u.prov===j.prov?1:j.mode==="Remote"?.9:.5;
    const catFit=u.cat===j.cat?1:.6;
    return [
      {label:"Skills match",detail:`${overlap} of ${req.length||0} required skills`,weight:54,pct:Math.round(skill*100)},
      {label:"Experience",detail:`${expYears} years (capped at 8)`,weight:16,pct:Math.round(exp*100)},
      {label:"Location fit",detail:u.prov===j.prov?"Same province":j.mode==="Remote"?"Remote role":"Different province, on-site",weight:14,pct:Math.round(loc*100)},
      {label:"Category fit",detail:u.cat===j.cat?"Exact category match":"Related category",weight:16,pct:Math.round(catFit*100)},
    ];
  };
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
    return r;
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
  const logout=()=>{
    api.post("/auth/logout").catch(()=>{}); /* best-effort - the cookie is cleared server-side either way */
    setUser(null);_hardNav("home");
  };
  /* hasAccount only ever sees the built-in demo emails now — real accounts created after this
     backend went live live in the server's database, not this local map. It's still useful as
     an early "that looks like a demo account" hint during signup; the real authority for
     "does this email already exist" is the API's signup response (a 409), surfaced via
     submitErr on the signup wizard's final step. */
  const hasAccount=email=>!!passwords[(email||"").toLowerCase().trim()];
  const upsertPassword=(email,pw)=>setPasswords(p=>({...p,[email.toLowerCase().trim()]:pw}));
  const loginWithPassword=async(email,pw)=>{
    try{
      const r=await api.post("/auth/login",{email:(email||"").trim(),password:pw});
      if(r.mfaRequired)return {ok:false,mfaRequired:true,email:r.email,code:r.code};
      const mapped=mapApiUser(r.user);
      setUser(mapped);
      _hardNav(mapped.role==="employer"?"empHome":mapped.role==="admin"?"admHome":"home");
      log("auth.login",`Signed in as ${mapped.name}`,"logout");
      return {ok:true};
    }catch(e){
      return {ok:false,msg:e.message};
    }
  };
  const verifyLogin2FA=async(email,code)=>{
    try{
      const {user:apiUser}=await api.post("/auth/login/verify-2fa",{email,code});
      const mapped=mapApiUser(apiUser);
      setUser(mapped);
      _hardNav(mapped.role==="employer"?"empHome":mapped.role==="admin"?"admHome":"home");
      log("auth.login",`Signed in as ${mapped.name}`,"logout");
      return {ok:true};
    }catch(e){
      return {ok:false,msg:e.message};
    }
  };
  const resetPasswordRequest=async email=>{
    const e=(email||"").toLowerCase().trim();
    try{
      const {code}=await api.post("/auth/reset/request",{email:e});
      log("auth.reset.request",`Reset code emailed to ${e}`,"mail");
      return {ok:true,code}; /* dev returns code for demo visibility */
    }catch(err){return {ok:false,msg:err.message};}
  };
  const resetPasswordConfirm=async(email,code,newPw)=>{
    const e=(email||"").toLowerCase().trim();
    try{
      await api.post("/auth/reset/confirm",{email:e,code,newPassword:newPw});
      log("auth.reset.complete",`Password reset for ${e}`,"lock");
      return {ok:true};
    }catch(err){return {ok:false,msg:err.message};}
  };

  const completeSignup=async d=>{
    const email=(d.email||"").toLowerCase().trim();
    if(!d.password||d.password.length<8)return {ok:false,msg:"Password must be at least 8 characters"};
    const yearsMap={"No experience yet":0,"Less than 1 year":1,"1-2 years":2,"3-5 years":4,"6-10 years":8,"More than 10 years":12};
    try{
      const {user:apiUser}=await api.post("/auth/signup",{
        name:`${d.first} ${d.last}`.trim(),email,password:d.password,role:"seeker",turnstileToken:d.turnstileToken,
        /* CASL consent, captured by the wizard's own unchecked-by-default box. */
        marketingConsent:!!d.alerts});
      /* The signup endpoint only takes name/email/password/role - everything else the wizard
         collected (title/cat/city/skills/pay expectations...) is a profile update on top,
         same two-step shape saveProfile already uses elsewhere. */
      const patch={title:d.title,cat:d.cat,city:d.city,prov:PCODE[d.prov],years:yearsMap[d.years]??2,phone:d.phone,
        skills:d.skills,edu:d.edu,eligible:d.eligible,payMin:Number(d.payMin)||0,payUnit:d.payUnit,
        types:d.types,modes:d.modes};
      await api.patch("/users/me",patch); /* persisted server-side so it survives a refresh, unlike before this store was cookie/API-backed */
      const u={...mapApiUser(apiUser),...patch,startWhen:d.startWhen,summary:"",defaultCv:null,joined:_fmtDate(new Date())};
      setUser(u); setPeople(p=>[u,...p]); _hardNav("welcome");
      notify({icon:"sparkle",title:"Welcome to NorthHire",body:"Your profile is live. Check Matched jobs to see what fits your skills.",for:u.id,link:"matched"});
      log("auth.signup",`New job seeker registered: ${u.name}`,"user");
      return {ok:true};
    }catch(e){
      return {ok:false,msg:e.message};
    }
  };
  const completeEmployerSignup=async d=>{
    const email=(d.email||"").toLowerCase().trim();
    if(!d.password||d.password.length<8)return {ok:false,msg:"Password must be at least 8 characters"};
    if(!d.company||!d.company.trim())return {ok:false,msg:"Company name required"};
    try{
      const {user:apiUser}=await api.post("/auth/signup",{
        name:d.name||"Hiring Team",email,password:d.password,role:"employer",companyName:d.company.trim(),turnstileToken:d.turnstileToken});
      const domain=email.split("@")[1]||"example.com";
      /* The employer record itself was created server-side by signup (its id lives on the
         returned user as employer_id) - patch in the extra profile fields the wizard collected
         that /auth/signup doesn't take. */
      const patch={industry:d.industry||"Other",city:d.city||"Toronto",prov:PCODE[d.prov||"Ontario"],
        size:d.size||"1-50",site:domain,about:d.about||`${d.company.trim()} is hiring on NorthHire.`,
        businessNumber:(d.businessNumber||"").replace(/\s/g,"")||undefined};
      const {employer}=await api.patch(`/employers/${apiUser.employer_id}`,patch);
      // A paid pendingPlan (chosen on the pricing page before signing up) can't be silently
      // granted here for free - the account is created on Free, then handed straight to real
      // Stripe checkout for the plan they actually picked. A free pendingPlan (or none) applies
      // directly, same as before.
      const wantsPaidPlan=pendingPlan&&PLANS[pendingPlan]&&PLANS[pendingPlan].price>0;
      if(!wantsPaidPlan&&pendingPlan&&PLANS[pendingPlan])await api.patch(`/employers/${apiUser.employer_id}`,{plan:pendingPlan});
      const e=mapApiEmployer({...employer,plan:(!wantsPaidPlan&&pendingPlan&&PLANS[pendingPlan])?pendingPlan:employer.plan});
      setEmployers(list=>[e,...list]);
      setUser({...mapApiUser(apiUser),name:e.ownerName,skills:[]});
      log("auth.signup.employer",`New employer registered: ${e.name}`,"building");
      notify({icon:"sparkle",title:"Welcome to NorthHire",body:"Post your first job to start receiving applicants. Verification usually takes 1 business day.",for:apiUser.id,link:"empPost"});
      if(wantsPaidPlan){
        setPendingPlan(null);
        await startCheckout(pendingPlan); // redirects the browser to Stripe - nothing after this runs
        return {ok:true};
      }
      setPendingPlan(null);
      _hardNav("welcomeEmp");
      return {ok:true};
    }catch(e){
      return {ok:false,msg:e.message};
    }
  };
  const startCheckout=async(planKey)=>{
    try{
      const {url}=await api.post("/billing/checkout",{plan:planKey});
      window.location.href=url;
      return {ok:true};
    }catch(e){return {ok:false,msg:e.message};}
  };
  const openBillingPortal=async()=>{
    try{
      const {url}=await api.post("/billing/portal");
      window.location.href=url;
      return {ok:true};
    }catch(e){return {ok:false,msg:e.message};}
  };
  const saveProfile=async d=>{
    setUser(d);setPeople(p=>p.map(x=>x.id===d.id?{...x,...d}:x));log("profile.update","Updated their profile","edit");
    try{
      await api.patch("/users/me",{title:d.title,cat:d.cat,city:d.city,prov:d.prov,years:d.years,phone:d.phone,
        skills:d.skills,edu:d.edu,eligible:d.eligible,payMin:d.payMin,payUnit:d.payUnit,types:d.types,modes:d.modes,summary:d.summary,
        visibility:d.visibility});
    }catch(err){toast(`Profile saved locally, but couldn't sync to the server: ${err.message}`,"warn");}
  };
  const deleteAccount=()=>{log("account.delete",`Deleted account ${user.name}`,"trash");setUser(null);setCvs([]);_hardNav("home");};
  const exportData=()=>downloadText(`northhire-data-${user.id}.json`,JSON.stringify({profile:user,cvs,applications:myApps,saved:[...saved]},null,2));
  const setUserSetting=(k,v)=>{
    setUserSettings(s=>({...s,[k]:v}));
    api.patch("/seeker/user-settings",{[k]:v}).catch(err=>toast(`Setting saved locally, but couldn't sync to the server: ${err.message}`,"warn"));
  };

  /* CASL consent for job-alert email. Kept separate from the local user_settings row above
     because it is the legally operative record - it gates whether the server will send a
     commercial electronic message at all, and stores when/how consent was given so it can be
     proven later. Toggling the "New matching jobs" switch is the act of giving or withdrawing it. */
  const [marketingConsent,setMarketingConsentState]=useState({consent:false,at:null,source:null});
  useEffect(()=>{
    if(!user){setMarketingConsentState({consent:false,at:null,source:null});return;}
    api.get("/consent/marketing").then(setMarketingConsentState).catch(()=>{});
  },[user?.id]);
  const setMarketingConsent=async v=>{
    setMarketingConsentState(s=>({...s,consent:v}));
    try{
      await api.patch("/consent/marketing",{consent:v});
      const fresh=await api.get("/consent/marketing");
      setMarketingConsentState(fresh);
      toast(v?"You'll get an email when a saved search matches a new job.":"Unsubscribed from job-alert emails.","ok");
    }catch(err){
      setMarketingConsentState(s=>({...s,consent:!v}));
      toast(`Couldn't update email preference: ${err.message}`,"warn");
    }
  };

  /* --- saved searches --- */
  const saveSearch=async(q,where,cats,name,filters)=>{
    if(!user||user.role!=="seeker")return;
    /* filters carries the rest of the SearchPage filter panel (type/work-setting/experience/
       min-pay) — previously only q/where/cats were saved, silently dropping everything else
       the user had just set. */
    const nm=name||(q||CATM[cats?.[0]]?.label||"Untitled search");
    try{
      const {savedSearch:s}=await api.post("/seeker/saved-searches",{name:nm,q:q||"",where:where||"",cats:cats||[],
        types:filters?.types||[],modes:filters?.modes||[],exps:filters?.exps||[],prov:filters?.prov||"",minPay:filters?.minPay||""});
      setSavedSearches(l=>[s,...l]);
      log("search.save",`Saved search "${s.name}"`,"bookmark");
      notify({icon:"bell",title:"Search saved",body:`We'll alert you when new jobs match "${s.name}".`,for:user.id,link:"savedSearches"});
      return s.id;
    }catch(err){toast(err.message,"danger");}
  };
  const deleteSavedSearch=async id=>{
    try{await api.del(`/seeker/saved-searches/${id}`);setSavedSearches(l=>l.filter(s=>s.id!==id));log("search.delete","Deleted saved search","trash");}
    catch(err){toast(err.message,"danger");}
  };
  const toggleSearchAlert=async id=>{
    const cur=savedSearches.find(s=>s.id===id); if(!cur)return;
    setSavedSearches(l=>l.map(s=>s.id===id?{...s,alerts:!s.alerts}:s));
    try{await api.patch(`/seeker/saved-searches/${id}`,{alerts:!cur.alerts});}
    catch(err){setSavedSearches(l=>l.map(s=>s.id===id?{...s,alerts:cur.alerts}:s));toast(err.message,"danger");}
  };
  /* In-place edit - previously the only way to change a saved search was delete + recreate.
     Covers a quick name/frequency edit and a full filter overwrite (from SearchPage via the
     editingSavedSearchId carry below, same "carry a bit of state to the next page" pattern as
     contactPrefill/blogAuthorFilter). */
  const updateSavedSearch=async(id,patch)=>{
    const cur=savedSearches.find(s=>s.id===id); if(!cur)return;
    setSavedSearches(l=>l.map(s=>s.id===id?{...s,...patch}:s));
    try{const {savedSearch}=await api.patch(`/seeker/saved-searches/${id}`,patch);
      setSavedSearches(l=>l.map(s=>s.id===id?savedSearch:s));}
    catch(err){setSavedSearches(l=>l.map(s=>s.id===id?cur:s));toast(err.message,"danger");}
  };
  const [editingSavedSearchId,setEditingSavedSearchId]=useState(null);

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
  const [paymentMethods,setPaymentMethods]=useState([]);
  const [employerInvoices,setEmployerInvoices]=useState([]);
  const verifyCheckout=async sessionId=>{
    try{
      const r=await api.get(`/billing/verify?session_id=${encodeURIComponent(sessionId)}`);
      if(r.paid&&r.employer)setEmployers(l=>l.map(e=>e.id===r.employer.id?mapApiEmployer(r.employer):e));
      if(r.paid&&r.invoice)setEmployerInvoices(l=>l.find(x=>x.id===r.invoice.id)?l:[r.invoice,...l]);
      return r;
    }catch(e){return {paid:false,error:e.message};}
  };
  const addPaymentMethod=async card=>{
    try{
      const {paymentMethod:pm}=await api.post("/seeker/payment-methods",{number:card.number,brand:card.brand||"Card",exp:card.exp,name:card.name});
      setPaymentMethods(l=>[pm,...l]);
      log("billing.card.add",`Added ${pm.brand} ${pm.masked}`,"wallet");
      return pm;
    }catch(err){toast(err.message,"danger");}
  };
  const removePaymentMethod=async id=>{
    try{await api.del(`/seeker/payment-methods/${id}`);setPaymentMethods(l=>l.filter(p=>p.id!==id));log("billing.card.remove","Removed a payment method","trash");}
    catch(err){toast(err.message,"danger");}
  };
  const setDefaultPayment=async id=>{
    setPaymentMethods(l=>l.map(p=>({...p,default:p.id===id})));
    try{await api.patch(`/seeker/payment-methods/${id}/default`);}catch(err){toast(err.message,"danger");}
  };

  /* --- 2FA --- */
  const [twoFactor,setTwoFactor]=useState({}); // {userId: {enabled, phone, backupCodes}}
  const enable2FA=async(phone)=>{
    if(!user)return {ok:false,msg:"Sign in first"};
    try{
      const {codes}=await api.post("/seeker/two-factor/enable",{phone});
      setTwoFactor(t=>({...t,[user.id]:{enabled:true,phone,backupCodes:codes}}));
      log("auth.2fa.enable","Enabled two-factor authentication","shield");
      return {ok:true,codes};
    }catch(err){return {ok:false,msg:err.message};}
  };
  const disable2FA=async()=>{if(!user)return;
    try{
      await api.post("/seeker/two-factor/disable");
      setTwoFactor(t=>{const n={...t};delete n[user.id];return n;});
      log("auth.2fa.disable","Disabled two-factor authentication","shield");
    }catch(err){toast(err.message,"danger");}
  };

  /* --- references --- */
  const [references,setReferences]=useState([]);
  /* --- HR SUITE store composition --- */
  const HR=useHrStore();
  const STF=useStaffingStore(user,platformConfig);

  const addReference=async(ref)=>{
    if(!user||user.role!=="seeker")return;
    try{
      const {reference}=await api.post("/seeker/references",ref);
      setReferences(l=>[reference,...l]);
      log("reference.add",`Added reference ${ref.name}`,"user");
    }catch(err){toast(err.message,"danger");}
  };
  const removeReference=async id=>{
    try{await api.del(`/seeker/references/${id}`);setReferences(l=>l.filter(r=>r.id!==id));}
    catch(err){toast(err.message,"danger");}
  };

  /* --- company reviews ---
     Public per-employer, not per-user, so they're fetched lazily by whichever employer profile
     page is open (see employers.jsx) and merged into this shared list, rather than loaded
     wholesale up front. */
  const saveCandidateNote=async(candidateId,note,tags)=>{
    try{
      const {note:saved}=await api.put(`/employers/candidate-notes/${candidateId}`,{note,tags});
      setCandidateNotes(m=>({...m,[candidateId]:saved}));
      log("talent.note",`Updated notes for ${person(candidateId).name}`,"edit");
      return {ok:true};
    }catch(err){toast(err.message,"danger");return {ok:false,msg:err.message};}
  };
  const submitContact=async(f)=>{
    try{
      const {ticket}=await api.post("/platform/contact",{name:f.name,email:f.email,topic:f.topic,message:f.msg});
      log("contact.submitted",`Contact (${f.topic}) from ${f.name} <${f.email}> — ticket ${ticket}`,"mail");
      return {ok:true,ticket};
    }catch(err){return {ok:false,msg:err.message};}
  };
  const loadContactInbox=async()=>{
    try{const {messages}=await api.get("/platform/contact");return messages;}catch{return [];}
  };
  const resolveContactMessage=async(id)=>{
    try{await api.patch(`/platform/contact/${id}`,{status:"resolved"});return {ok:true};}
    catch(err){return {ok:false,msg:err.message};}
  };
  const listAdmins=async()=>{
    try{const {admins}=await api.get("/users/admins");return admins;}catch{return [];}
  };
  const setAdminScope=async(id,scope)=>{
    try{await api.patch(`/users/${id}/admin-scope`,{scope});return {ok:true};}
    catch(err){return {ok:false,msg:err.message};}
  };
  const geocode=async(q)=>{
    if(!q?.trim())return null;
    try{const {result}=await api.get(`/platform/geocode?q=${encodeURIComponent(q)}`);return result;}
    catch{return null;}
  };
  const updatePlatformConfig=async(key,value)=>{
    try{
      const updated=await api.patch(`/platform/config/${key}`,{value});
      setPlatformConfig(c=>({...c,[key]:updated[key]}));
      log("config.change",`Updated ${key} config`,"gear");
      return {ok:true};
    }catch(err){return {ok:false,msg:err.message};}
  };
  const loadCandidateContact=async(applicationId)=>{
    try{const {candidate}=await api.get(`/applications/${applicationId}/candidate`);return candidate;}
    catch{return null;}
  };
  const loadScorecards=async(applicationId)=>{
    try{const {scorecards}=await api.get(`/applications/${applicationId}/scorecards`);return scorecards;}
    catch{return [];}
  };
  const submitScorecard=async(applicationId,rating,notes)=>{
    try{const {scorecard}=await api.post(`/applications/${applicationId}/scorecards`,{rating,notes});return {ok:true,scorecard};}
    catch(err){return {ok:false,msg:err.message};}
  };
  const loadEmployerReviews=async(employerId)=>{
    try{
      const {reviews:fresh}=await api.get(`/seeker/reviews/employer/${employerId}`);
      setReviews(l=>{const freshIds=new Set(fresh.map(r=>r.id));return [...fresh,...l.filter(r=>!freshIds.has(r.id))];});
    }catch(e){if(typeof console!=="undefined")console.warn(`[NorthHire] Review sync failed: ${e.message}`);}
  };
  const addReview=async(empId,rating,text,anon)=>{
    if(!user)return {ok:false,msg:"Sign in first"};
    try{
      const {review:rv}=await api.post("/seeker/reviews",{employerId:empId,rating,text,anon});
      setReviews(l=>[rv,...l]);
      const empRevs=[rv,...reviews.filter(r=>r.employer===empId)];
      const avg=empRevs.reduce((s,r)=>s+r.rating,0)/empRevs.length;
      setEmployers(list=>list.map(e=>e.id===empId?{...e,rating:Math.round(avg*10)/10}:e));
      log("review.add",`Reviewed ${emp(empId).name} (${rating}★)`,"star");
      return {ok:true};
    }catch(err){return {ok:false,msg:err.message};}
  };
  const deleteReview=async id=>{
    try{await api.del(`/seeker/reviews/${id}`);setReviews(l=>l.filter(r=>r.id!==id));log("review.delete","Deleted a review","trash");}
    catch(err){toast(err.message,"danger");}
  };

    /* --- admin impersonation --- */
  const impersonate=userId=>{
    if(user?.role!=="admin"){log("admin.impersonate.deny","Non-admin tried to impersonate","shield");return;}
    const target=people.find(p=>p.id===userId); if(!target)return;
    setImpersonating({originalUser:user}); /* remember admin */
    setUser({...target,role:"seeker"});
    _hardNav("home");
    log("admin.impersonate",`Admin viewing as ${target.name}`,"eye");
    notify({icon:"eye",title:"Impersonation active",body:`You are viewing as ${target.name}. Return to admin from the banner.`,for:target.id,link:null});
  };
  const stopImpersonating=()=>{
    if(!impersonating?.originalUser)return;
    setUser(impersonating.originalUser); setImpersonating(null); _hardNav("admHome");
    log("admin.impersonate.stop","Ended impersonation","shield");
  };

    /* --- messaging & interviews --- */
  const sendMessage=async(toUserId,jobId,text)=>{
    if(user?.role==="employer"&&!can("messages")){
      notify({icon:"lock",title:"Upgrade to message candidates",body:`Direct messaging is a Growth and Enterprise feature.`,for:user.id,link:"pricing"});
      return {ok:false,msg:"Messaging is a Growth+ feature — upgrade to unlock."};
    }
    try{
      const {message}=await api.post("/seeker/messages",{toUserId,jobId,text});
      setMessages(l=>[message,...l]);
      log("message.send","Sent a message","send");
      const recipUser=people.find(p=>p.id===toUserId);
      if(recipUser)notify({icon:"mail",title:"New message",body:text.slice(0,80),for:toUserId,link:"messages"});
      return {ok:true};
    }catch(err){toast(err.message,"danger");return {ok:false,msg:err.message};}
  };
  const markMessageRead=async id=>{
    setMessages(l=>l.map(m=>m.id===id?{...m,read:true}:m));
    try{await api.patch(`/seeker/messages/${id}/read`);}catch{/* best-effort */}
  };

  const scheduleInterview=async(candidateAppId,when,mode,notes)=>{
    if(user?.role==="employer"&&!can("interviews")){
      notify({icon:"lock",title:"Upgrade to schedule interviews",body:`Interview scheduling is a Growth and Enterprise feature.`,for:user.id,link:"pricing"});
      return {ok:false,msg:"Interview scheduling is a Growth+ feature."};
    }
    const app=applications.find(a=>a.id===candidateAppId); if(!app)return;
    const j=job(app.job); const e=emp(j.e);
    try{
      const {interview:iv}=await api.post("/seeker/interviews",{applicationId:candidateAppId,when,mode,notes:notes||""});
      setInterviews(l=>[iv,...l]);
      setApplications(l=>l.map(a=>a.id===candidateAppId?{...a,stage:"Interview",note:`Interview ${mode==="video"?"video call":"in-person"} scheduled for ${when}`}:a));
      notify({icon:"calendar",title:`Interview scheduled — ${e.name}`,
        body:`${mode==="video"?"Video call":"On-site interview"} on ${when} for ${j.t}.`,for:app.user,link:"status"});
      log("interview.schedule",`Scheduled interview with ${person(app.user).name}`,"calendar");
      return iv.id;
    }catch(err){toast(err.message,"danger");}
  };
  const cancelInterview=async id=>{
    try{
      await api.patch(`/seeker/interviews/${id}/cancel`);
      setInterviews(l=>l.map(iv=>iv.id===id?{...iv,status:"cancelled"}:iv));
      log("interview.cancel","Cancelled an interview","x");
    }catch(err){toast(err.message,"danger");}
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
  /* minScore was a hardcoded 65 with no way to widen or narrow the pool - now a caller-supplied
     threshold, defaulting to 65 so existing call sites are unaffected. The top-10 cap stays
     (a genuine UI-scale limit, not a data restriction) since this is a display slice, not a
     filter that would hide a strong match from a recruiter who asks to see more. */
  const reverseMatch=(jobId,minScore=65)=>{
    const j=job(jobId); if(!j)return [];
    const already=new Set(applications.filter(a=>a.job===jobId).map(a=>a.user));
    return people.filter(p=>!already.has(p.id))
      .map(p=>({p,score:scoreCandidate(p,j)}))
      .filter(x=>x.score>=minScore)
      .sort((a,b)=>b.score-a.score)
      .slice(0,10);
  };
  const inviteToApply=async(candidateId,jobId)=>{
    const j=job(jobId); const e=emp(j.e);
    try{
      await api.post("/seeker/invited-candidates",{jobId,candidateId});
      notify({icon:"target",title:`${e.name} invited you to apply`,
        body:`Your profile matches ${j.t} — ${pay(j)}${payShort(j)}`,for:candidateId,link:"job"});
      log("talent.invite",`Invited ${person(candidateId).name} to apply for ${j.t}`,"send");
      setInvitedCandidates(s=>new Set(s).add(`${jobId}:${candidateId}`));
    }catch(err){toast(err.message,"danger");}
  };
  const loadCandidateOutreach=async(candidateId)=>{
    try{const {events}=await api.get(`/employers/candidate-outreach/${candidateId}`);return events;}
    catch(err){toast(err.message,"danger");return [];}
  };

  /* --- CSV bulk job import (parses a minimal CSV; validates & creates draft jobs) --- */
  const importJobsCSV=async(csvText)=>{
    if(!company)return {ok:false,msg:"Only employers can import jobs"};
    if(!can("csvImport"))return {ok:false,msg:"CSV import is a Growth and Enterprise feature — upgrade to unlock."};
    const lines=csvText.split(/\r?\n/).filter(l=>l.trim());
    if(lines.length<2)return {ok:false,msg:"CSV must include a header row and at least one job"};
    const header=parseCsvLine(lines[0]).map(h=>h.trim().toLowerCase());
    const required=["title","city","province","type","pay_low","pay_high","pay_unit","category"];
    const missing=required.filter(r=>!header.includes(r));
    if(missing.length)return {ok:false,msg:`Missing columns: ${missing.join(", ")}`};
    const idx=Object.fromEntries(header.map((h,i)=>[h,i]));
    const toImport=[]; const errors=[];
    lines.slice(1).forEach((row,i)=>{
      const cells=parseCsvLine(row);
      const t=cells[idx.title]; if(!t){errors.push(`Row ${i+2}: missing title`);return;}
      const lo=Number(cells[idx.pay_low])||0, hi=Number(cells[idx.pay_high])||0;
      if(settings.payTransparency&&lo<=0&&hi<=0){errors.push(`Row ${i+2}: pay_low or pay_high is required`);return;}
      const prov=PCODE[cells[idx.province]]||cells[idx.province];
      toImport.push({t,cat:cells[idx.category]||"trades",city:cells[idx.city]||"",prov,
        type:cells[idx.type]||"Full Time",mode:cells[idx.mode]||"On-site",
        lo,hi,unit:cells[idx.pay_unit]||"hr",
        vac:Number(cells[idx.vacancies])||1,exp:cells[idx.experience]||"1+ years",
        edu:cells[idx.education]||"High school diploma",
        skills:(cells[idx.skills]||"").split(";").map(s=>s.trim()).filter(Boolean),
        perks:(cells[idx.perks]||"").split(";").map(s=>s.trim()).filter(Boolean),
        duties:(cells[idx.duties]||"").split(";").map(s=>s.trim()).filter(Boolean),
        reqs:(cells[idx.requirements]||"").split(";").map(s=>s.trim()).filter(Boolean),
        desc:cells[idx.description]||`Hiring ${t} in ${cells[idx.city]}.`,
        how:"Apply through NorthHire."});
    });
    if(!toImport.length)return {ok:true,imported:0,errors};
    try{
      const {jobs:created}=await api.post("/jobs/import-csv",{jobs:toImport});
      setJobs(l=>[...created.map(mapApiJob),...l]);
      log("job.import",`Imported ${created.length} jobs via CSV`,"upload");
      return {ok:true,imported:created.length,errors};
    }catch(e){
      return {ok:false,msg:e.message};
    }
  };

  /* --- employer analytics --- */
  const employerAnalytics=()=>{
    if(!company)return null;
    const myJobs=jobs.filter(j=>j.e===company.id);
    const myAppIds=myJobs.map(j=>j.id);
    const myApps=applications.filter(a=>myAppIds.includes(a.job));
    const totalViews=myJobs.reduce((s,j)=>s+j.views,0);
    const totalApps=myApps.length;
    /* A CSV-imported job can start with 0 views but nonzero applicants (views only start
       accruing after publish), which produced a nonsensical >100% conversion rate. */
    const conversion=totalViews?Math.min(100,Math.round((totalApps/totalViews)*100)):0;
    const byStage=STAGES.map(s=>({stage:s,count:myApps.filter(a=>a.stage===s).length}));
    const topJob=myJobs.map(j=>({j,apps:applications.filter(a=>a.job===j.id).length})).sort((a,b)=>b.apps-a.apps)[0];
    const avgScore=myApps.length?Math.round(myApps.map(a=>scoreCandidate(person(a.user),job(a.job)||myJobs[0])).reduce((s,x)=>s+x,0)/myApps.length):0;
    /* Real day-by-day application volume over the trailing 30 days, bucketed from each
       application's actual created_at timestamp (added specifically for this chart - the
       old `at` field was only ever a frozen "3 days ago" display string, not real enough to
       bucket by day). */
    const days=30;
    const dayKey=ms=>new Date(ms).toISOString().slice(0,10);
    const byDay={};
    for(let i=days-1;i>=0;i--){const d=new Date(Date.now()-i*86400000);byDay[dayKey(d.getTime())]=0;}
    myApps.forEach(a=>{if(a.createdAt){const k=dayKey(a.createdAt);if(k in byDay)byDay[k]++;}});
    const applicationTrend=Object.entries(byDay).map(([date,count])=>({date,count}));
    /* Work-authorization mix, for real compliance reporting - built from the seeker profile's
       actual `eligible` field (set at signup), not a fabricated demographic field. Deliberately
       does NOT add race/gender/disability self-identification - that's a real HR feature but
       needs its own voluntary, legally-reviewed collection flow, not a field bolted on here. */
    const ELIG_LABEL={citizen:"Citizen / permanent resident",permit:"Valid work permit",student:"Student permit",need:"Needs sponsorship"};
    const eligibilityCounts={};
    myApps.forEach(a=>{const el=person(a.user)?.eligible; const key=ELIG_LABEL[el]||"Not stated"; eligibilityCounts[key]=(eligibilityCounts[key]||0)+1;});
    const eligibilityMix=Object.entries(eligibilityCounts).map(([label,count])=>({label,count})).sort((a,b)=>b.count-a.count);
    const byJob=myJobs.map(j=>{
      const jApps=applications.filter(a=>a.job===j.id);
      return {id:j.id,title:j.t,status:j.status,views:j.views,applications:jApps.length,
        conversion:j.views?Math.min(100,Math.round((jApps.length/j.views)*100)):0,
        offers:jApps.filter(a=>a.stage==="Offer").length};
    }).sort((a,b)=>b.applications-a.applications);
    return {totalJobs:myJobs.length,liveJobs:myJobs.filter(j=>j.status==="live").length,totalViews,totalApps,conversion,byStage,topJob,avgScore,applicationTrend,eligibilityMix,byJob};
  };

  /* Fuzzy/synonym expansion now lives in helpers/synonyms.js so server/jobAlerts.js matches
     saved searches against new jobs using the identical logic this page's search uses. */

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


  /* Deadline reminders for saved/applied jobs - previously the only signal an approaching
     deadline existed was a colour tag on the one job's own detail page, easy to never see again
     once you'd looked at it once. Fires (this session only, like the saved-search/follow alerts
     above - there's no persisted "already reminded" flag) the first time a saved or actively-
     applied-to job is within 3 days of its deadline. */
  const remindedDeadlines=useRef(new Set());
  useEffect(()=>{
    if(!user||user.role!=="seeker")return;
    const activeAppJobIds=new Set(applications.filter(a=>a.user===user.id&&a.stage!=="Withdrawn").map(a=>a.job));
    const watched=new Set([...saved,...activeAppJobIds]);
    watched.forEach(jobId=>{
      if(remindedDeadlines.current.has(jobId))return;
      const j=jobs.find(x=>x.id===jobId);
      if(!j||j.dl==null||j.dl>3||j.dl<0)return;
      remindedDeadlines.current.add(jobId);
      notify({icon:"clock",title:`Closing ${j.dl===0?"today":`in ${j.dl} day${j.dl===1?"":"s"}`}: ${j.t}`,
        body:activeAppJobIds.has(jobId)?"Your application is in - no action needed, just a heads-up.":"Apply soon if you're still interested.",
        for:user.id,link:"job"});
    });
  },[jobs,saved,applications,user]);

  const toggleSave=async id=>{if(!user)return go("login");
    setSaved(p=>{const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n;});
    try{await api.post(`/seeker/saved-jobs/${id}/toggle`);}
    catch(err){setSaved(p=>{const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n;});toast(err.message,"danger");}
  };
  const followEmployer=async id=>{if(!user)return go("login");
    setFollowing(p=>{const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n;});
    try{await api.post(`/seeker/followed-employers/${id}/toggle`);}
    catch(err){setFollowing(p=>{const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n;});toast(err.message,"danger");}
  };

  const openJob=(id,opts)=>{setJobId(id);
    if(!opts?.preview){
      setJobs(js=>js.map(j=>j.id===id?{...j,views:j.views+1}:j));
      api.post(`/jobs/${id}/view`).catch(()=>{}); /* best-effort - a failed view-count bump shouldn't block opening the job */
    }
    const j=job(id); go("job",j?j.t:"Job details",id);};
  const openEmployer=id=>{setEmpId(id);const e=emp(id);go("employer",e?e.name:"Employer",id);};
  const openBlog=id=>{setBlogId(id);const b=blogs.find(x=>x.id===id);go("blog",b?"Article":"Article",id);};
  const openTraining=id=>{setTrainingId(id);go("training","Training",id);};
  const openCandidate=id=>{setCandidateId(id);const a=applications.find(x=>x.id===id);
    go("empCandidate",a?person(a.user).name:"Candidate",id);};

  const beginApply=id=>{setApplyDraft({job:id,avail:"Within 2 weeks",expect:"",letter:"",meets:"",screeningAnswers:{}});go("apply1");};
  const submitApply=async()=>{
    const j=job(applyDraft.job); const e=emp(j.e);
    /* rate limit: prevent duplicate application to same job */
    const existing=applications.find(a=>a.job===j.id&&a.user===user.id&&a.stage!=="Withdrawn");
    if(existing){
      notify({icon:"alert",title:"Already applied",body:`You applied to ${j.t} on ${existing.at}. Check your status page.`,for:user.id,link:"status"});
      return go("status");
    }
    try{
      const {application}=await api.post("/applications",{jobId:j.id,availability:applyDraft.avail,payExpectation:applyDraft.expect,coverLetter:applyDraft.letter,screeningAnswers:applyDraft.screeningAnswers||{}});
      setApplications(l=>[...l,mapApiApplication(application)]);
      notify({icon:"send",title:`Application sent to ${e.name}`,body:`Your application for ${j.t} is now in their pipeline.`,for:user.id,link:"status"});
      log("application.create",`Applied to ${j.t} at ${e.name}`,"send");
      go("applyDone");
    }catch(err){
      notify({icon:"alert",title:"Couldn't submit application",body:err.message,for:user.id,link:null});
      toast(err.message,"danger");
    }
  };
  const withdraw=async(id,reason)=>{
    try{
      const {application}=await api.patch(`/applications/${id}/withdraw`,{reason});
      setApplications(l=>l.map(a=>a.id===id?mapApiApplication(application):a));
      log("application.withdraw","Withdrew an application","x");
      notify({icon:"x",title:"Application withdrawn",body:"You can restore it within 7 days from My Status.",for:user?.id,link:"status"});
    }catch(err){toast(err.message,"danger");}
  };
  const restoreApp=async id=>{
    try{
      const {application}=await api.patch(`/applications/${id}/restore`);
      setApplications(l=>l.map(a=>a.id===id?mapApiApplication(application):a));
      log("application.restore","Restored a withdrawn application","refresh");
    }catch(err){toast(err.message,"danger");}
  };
  const acceptOffer=async id=>{const a=applications.find(x=>x.id===id);const j=job(a.job);
    try{
      const {application}=await api.patch(`/applications/${id}/accept-offer`);
      setApplications(l=>l.map(x=>x.id===id?mapApiApplication(application):x));
      notify({icon:"award",title:"Offer accepted",body:`You accepted the offer for ${j.t}.`,for:user.id,link:"status"});
      log("application.accept",`Accepted offer for ${j.t}`,"award");
    }catch(err){toast(err.message,"danger");}};

  const [hireOnboarding,setHireOnboarding]=useState(null); /* {app,job,person} — surfaces onboarding modal */
  const moveApp=async(id,stage)=>{
    const a=applications.find(x=>x.id===id); const j=job(a.job); const e=emp(j.e);
    try{
      const {application}=await api.patch(`/applications/${id}/stage`,{stage});
      setApplications(l=>l.map(x=>x.id===id?mapApiApplication(application):x));
      /* Filling the last opening closes the listing instead of leaving it live (and collecting
         applicants) forever — the server decrements vac/closes the job on Hire; refetch this one
         job so local state (used for badge counts, analytics) reflects it immediately. */
      if(stage==="Hired"){
        const {job:freshJob}=await api.get(`/jobs/${j.id}`);
        setJobs(js=>js.map(x=>x.id===j.id?mapApiJob(freshJob):x));
      }
      notify({icon:stage==="Hired"?"award":stage==="Offer"?"award":"activity",title:`${stage} — ${e.name}`,
        body:stage==="Hired"?`You've been hired for ${j.t}. Congratulations!`:`Your application for ${j.t} moved to ${stage}.`,for:a.user,link:"status"});
      log("pipeline.move",`Moved ${person(a.user).name} to ${stage} on ${j.t}`,"users");
      /* Trigger HR onboarding suggestion when candidate is hired at an Enterprise employer */
      if(stage==="Hired"&&user?.role==="employer"&&company?.plan==="Enterprise"){
        const p=person(a.user);
        if(p)setHireOnboarding({app:a,job:j,person:p});
      }
    }catch(err){toast(err.message,"danger");}
  };
  const rejectApp=async(id,reason)=>{const a=applications.find(x=>x.id===id);
    try{
      const {application}=await api.patch(`/applications/${id}/reject`,{reason});
      setApplications(l=>l.map(x=>x.id===id?mapApiApplication(application):x));
      log("pipeline.reject",`Rejected ${person(a.user).name}${reason?` — ${reason}`:""}`,"x");
    }catch(err){toast(err.message,"danger");}};

  const publishJob=async f=>{
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
    const payload={title:f.t.trim(),cat:f.cat,city:f.city.trim(),prov:PCODE[f.prov],type:f.type,mode:f.mode,
      lo:Number(f.lo)||0,hi:Number(f.hi)||0,unit:f.unit,vac:f.vac,exp:f.exp,edu:f.edu,
      dlDate:f.dl?new Date(Date.now()+f.dl*86400000).toISOString().slice(0,10):null,
      urgent:f.urgent,featured:f.featured&&settings.employerFeature,
      skills:f.skills.split(",").map(s=>s.trim()).filter(Boolean),
      perks:f.perks.split(",").map(s=>s.trim()).filter(Boolean),
      duties:f.duties.split("\n").map(s=>s.trim()).filter(Boolean),
      reqs:f.reqs.split("\n").map(s=>s.trim()).filter(Boolean),
      desc:f.desc.trim(),how:f.how.trim()||"Apply through NorthHire with your resume.",
      questions:f.questions||[],
      /* Ontario Bill 149 posting disclosures - the server re-validates these against the
         posting's province and the employer's size before it will accept the listing. */
      aiScreening:f.aiScreening!==false,vacancyConfirmed:!!f.vacancyConfirmed,
      status:settings.autoApproveJobs?"live":"review"};
    let nj;
    try{
      const {job:created}=await api.post("/jobs",payload);
      nj=mapApiJob(created);
    }catch(e){
      return {ok:false,msg:e.message};
    }
    setJobs(l=>[nj,...l]);
    log("job.publish",`Published "${nj.t}"`,"briefcase");
    if(nj.pendingOwnerApproval){
      /* A teammate's posting doesn't actually go out to candidates (or count toward
         followers/saved-search alerts below) until the account owner signs off. */
      const owner=team.members.find(m=>m.role==="owner");
      if(owner)notify({icon:"shield",title:`"${nj.t}" needs your approval`,body:`${user.name} posted a job that's waiting for your sign-off before it goes live.`,for:owner.id,link:"empJobs"});
    }else{
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
    }
    setPipelineJob(nj.id); go("empJobs"); return {ok:true};
  };
  const approveJob=async id=>{
    try{const {job:updated}=await api.patch(`/jobs/${id}`,{approve:true});
      setJobs(l=>l.map(x=>x.id===id?mapApiJob(updated):x));
      log("job.approve",`Approved "${updated.t}"`,"check");
      notifyFollowers(mapApiJob(updated),company);
    }catch(err){toast(err.message,"danger");}};
  const toggleJobStatus=async id=>{
    const j=job(id); const nextStatus=j.status==="live"?"paused":"live";
    try{
      const {job:updated}=await api.patch(`/jobs/${id}`,{status:nextStatus});
      setJobs(l=>l.map(x=>x.id===id?mapApiJob(updated):x));
      log("job.status",`${nextStatus==="paused"?"Paused":"Reopened"} "${j.t}"`,"briefcase");
    }catch(err){toast(err.message,"danger");}};
  const reportJob=async(id,reason)=>{
    try{await api.post(`/jobs/${id}/report`,{reason}); return {ok:true};}
    catch(err){return {ok:false,msg:err.message};}};
  const [jobReports,setJobReports]=useState([]);
  const loadJobReports=async()=>{
    try{const {reports}=await api.get("/jobs/reports");setJobReports(reports);}
    catch(err){toast(err.message,"danger");}};
  const decideJobReport=async(id,status)=>{
    try{await api.patch(`/jobs/reports/${id}`,{status});setJobReports(l=>l.map(r=>r.id===id?{...r,status}:r));}
    catch(err){toast(err.message,"danger");}};
  const flagJob=async(id,reason)=>{
    const j=job(id);
    try{
      const {job:updated}=await api.patch(`/jobs/${id}`,{flagged:!j.flagged});
      setJobs(l=>l.map(x=>x.id===id?mapApiJob(updated):x));
      log("job.flag",`${j.flagged?"Unflagged":"Flagged"} "${j.t}"${!j.flagged&&reason?` — ${reason}`:""}`,"shield");
    }catch(err){toast(err.message,"danger");}};
  const setPipelineJobFn=id=>setPipelineJob(id);

  const saveCompany=async d=>{
    try{
      const {employer}=await api.patch(`/employers/${d.id}`,{name:d.name,industry:d.industry,city:d.city,prov:d.prov,size:d.size,about:d.about,site:d.site,businessNumber:d.businessNumber});
      setEmployers(l=>l.map(e=>e.id===d.id?{...d,...mapApiEmployer(employer)}:e));
      log("company.update",`Updated ${d.name} profile`,"building");
    }catch(err){toast(err.message,"danger");}};

  /* --- teammate seats ---
     users.employer_id already allowed more than one login per company - what was actually
     missing was the invite/seat-limit application layer. */
  const [team,setTeam]=useState({members:[],invites:[],seatLimit:1,seatsUsed:0});
  const loadTeam=async()=>{
    try{const t=await api.get("/employers/team");setTeam(t);}
    catch(err){toast(err.message,"danger");}};
  const inviteTeammate=async email=>{
    try{const r=await api.post("/employers/team/invite",{email});await loadTeam();
      log("team.invite",`Invited ${email} to the team`,"mail");return {ok:true,token:r.inviteToken};}
    catch(err){toast(err.message,"danger");return {ok:false,msg:err.message};}};
  const revokeInvite=async id=>{
    try{await api.del(`/employers/team/invite/${id}`);await loadTeam();}
    catch(err){toast(err.message,"danger");}};
  const removeTeammate=async userId=>{
    try{await api.del(`/employers/team/${userId}`);await loadTeam();log("team.remove","Removed a teammate","trash");}
    catch(err){toast(err.message,"danger");}};
  const getInvite=async token=>{
    try{return {ok:true,...(await api.get(`/auth/invites/${token}`))};}
    catch(err){return {ok:false,msg:err.message};}};
  const acceptInvite=async(token,name,password)=>{
    try{const {user:apiUser}=await api.post(`/auth/invites/${token}/accept`,{name,password});
      setUser(mapApiUser(apiUser)); return {ok:true};}
    catch(err){return {ok:false,msg:err.message};}};
  useEffect(()=>{
    if(user?.role!=="employer"){setTeam({members:[],invites:[],seatLimit:1,seatsUsed:0});return;}
    loadTeam();
  },[user?.id,user?.role]);

  const [messageTemplates,setMessageTemplates]=useState([]);
  const loadMessageTemplates=async()=>{
    try{const {templates}=await api.get("/employers/templates");setMessageTemplates(templates);}
    catch(err){/* best-effort - a message can still be sent freehand if this fails */}};
  const saveMessageTemplate=async(name,body)=>{
    try{const {template}=await api.post("/employers/templates",{name,body});setMessageTemplates(l=>[template,...l]);return {ok:true};}
    catch(err){toast(err.message,"danger");return {ok:false,msg:err.message};}};
  const deleteMessageTemplate=async id=>{
    try{await api.del(`/employers/templates/${id}`);setMessageTemplates(l=>l.filter(t=>t.id!==id));}
    catch(err){toast(err.message,"danger");}};
  useEffect(()=>{
    if(user?.role!=="employer"){setMessageTemplates([]);return;}
    loadMessageTemplates();
  },[user?.id,user?.role]);
  const verifyEmployer=async(id,v)=>{
    try{
      const {employer}=await api.patch(`/employers/${id}`,{verified:v});
      setEmployers(l=>l.map(e=>e.id===id?mapApiEmployer(employer):e));
      log("employer.verify",`${v?"Verified":"Revoked verification for"} ${emp(id).name}`,"shield");
    }catch(err){toast(err.message,"danger");}};
  const holdEmployer=async(id,reason)=>{const wasHeld=!!emp(id)?.hold;
    try{
      const {employer}=await api.patch(`/employers/${id}`,{hold:!wasHeld});
      setEmployers(l=>l.map(e=>e.id===id?mapApiEmployer(employer):e));
      log("employer.hold",`${wasHeld?"Released":"Placed"} ${emp(id).name} ${wasHeld?"from":"on"} hold${!wasHeld&&reason?` — ${reason}`:""}`,"clock");
    }catch(err){toast(err.message,"danger");}};
  const eraseUser=async(id)=>{
    try{
      await api.del(`/users/${id}`);
      setPeople(l=>l.filter(p=>p.id!==id));
      log("user.erase",`Erased account ${id}`,"trash");
      return {ok:true};
    }catch(err){return {ok:false,msg:err.message};}
  };
  const toggleSuspend=async(id,reason)=>{const wasSuspended=suspended.has(id);
    try{
      await api.patch(`/users/${id}/suspend`,{reason});
      setSuspended(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
      setSuspensionInfo(p=>{const n={...p};
        if(wasSuspended)delete n[id]; else n[id]={reason:reason||"No reason given",at:nowStamp()};
        return n;});
      log("user.suspend",`${wasSuspended?"Restored":"Suspended"} ${person(id).name}${!wasSuspended&&reason?` — ${reason}`:""}`,"users");
    }catch(err){toast(err.message,"danger");}};

  /* content */
  const editBlog=id=>{setEditId(id);go("empBlogEdit",id==="new"?"New article":"Edit article",id);};
  const editTraining=id=>{setEditId(id);go("empTrainEdit",id==="new"?"New training":"Edit training",id);};
  const saveBlog=async(d,isNew)=>{
    const {bodyText,...rest}=d;
    try{
      const {blog}=isNew?await api.post("/content/blogs",rest):await api.patch(`/content/blogs/${d.id}`,rest);
      setBlogs(l=>isNew?[blog,...l]:l.map(b=>b.id===d.id?blog:b));
      log("blog.save",`${isNew?"Created":"Updated"} article "${d.title}" (${d.status})`,"book");
      go(user.role==="admin"?"admBlogs":"empContent");
    }catch(err){toast(err.message,"danger");}
  };
  const saveTraining=async(d,isNew)=>{
    const {modsText,outText,...rest}=d;
    try{
      const {training}=isNew?await api.post("/content/trainings",rest):await api.patch(`/content/trainings/${d.id}`,rest);
      setTrainings(l=>isNew?[training,...l]:l.map(t=>t.id===d.id?training:t));
      log("training.save",`${isNew?"Created":"Updated"} training "${d.title}" (${d.status})`,"cap");
      go(user.role==="admin"?"admTrainings":"empContent");
    }catch(err){toast(err.message,"danger");}
  };
  const loadContentRevisions=async(type,id)=>{
    try{const {revisions}=await api.get(`/content/${type}s/${id}/revisions`);return revisions;}
    catch(err){toast(err.message,"danger");return [];}
  };
  const restoreContentRevision=async(type,id,revisionId)=>{
    try{
      const {[type]:item}=await api.post(`/content/${type}s/${id}/restore/${revisionId}`);
      if(type==="blog")setBlogs(l=>l.map(b=>b.id===id?item:b));
      else setTrainings(l=>l.map(t=>t.id===id?item:t));
      toast("Restored — this became a new revision itself, so you can undo the undo","ok");
      return {ok:true};
    }catch(err){toast(err.message,"danger");return {ok:false,msg:err.message};}
  };
  const deleteBlog=async id=>{
    const b=blogs.find(x=>x.id===id);
    try{await api.del(`/content/blogs/${id}`);setBlogs(l=>l.filter(x=>x.id!==id));log("blog.delete",`Deleted article "${b.title}"`,"trash");}
    catch(err){toast(err.message,"danger");}
  };
  const deleteTraining=async id=>{
    const t=trainings.find(x=>x.id===id);
    try{await api.del(`/content/trainings/${id}`);setTrainings(l=>l.filter(x=>x.id!==id));log("training.delete",`Deleted training "${t.title}"`,"trash");}
    catch(err){toast(err.message,"danger");}
  };
  const toggleBlogStatus=async id=>{
    const b=blogs.find(x=>x.id===id); const nextStatus=b.status==="published"?"draft":"published";
    try{
      const {blog}=await api.patch(`/content/blogs/${id}`,{status:nextStatus});
      setBlogs(l=>l.map(x=>x.id===id?blog:x));
      log("blog.status",`${b.status==="published"?"Unpublished":"Published"} "${b.title}"`,"book");
    }catch(err){toast(err.message,"danger");}
  };
  const toggleTrainingStatus=async id=>{
    const t=trainings.find(x=>x.id===id); const nextStatus=t.status==="published"?"draft":"published";
    try{
      const {training}=await api.patch(`/content/trainings/${id}`,{status:nextStatus});
      setTrainings(l=>l.map(x=>x.id===id?training:x));
      log("training.status",`${t.status==="published"?"Unpublished":"Published"} "${t.title}"`,"cap");
    }catch(err){toast(err.message,"danger");}
  };

  /* trainings */
  const _finishEnrol=async id=>{
    try{
      await api.post(`/content/trainings/${id}/enrol`,{paid:paidTrainings.has(id)});
      setEnrolled(p=>new Set(p).add(id)); setTrainingProgress(p=>({...p,[id]:0}));
      setTrainings(l=>l.map(t=>t.id===id?{...t,enrolled:t.enrolled+1}:t));
      const t=trainings.find(x=>x.id===id);
      notify({icon:"cap",title:`Enrolled in ${t.title}`,body:"Your progress is tracked on your profile under Learning.",for:user.id,link:"profile"});
      log("training.enrol",`Enrolled in "${t.title}"`,"cap");
      return {ok:true};
    }catch(err){return {ok:false,msg:err.message};}
  };
  /* Paid trainings can't be charged synchronously behind a native confirm() — this returns a
     needsPayment flag so the caller can show a real confirm modal, then call confirmPaidEnrol. */
  const enrol=id=>{if(!user)return go("login"); if(user.role!=="seeker")return go("denied");
    if(!settings.enrolments)return {ok:false,msg:"Enrolments are currently disabled."};
    const _preT=trainings.find(x=>x.id===id);
    if(_preT&&_preT.price>0&&!paidTrainings.has(id)){
      return {ok:false,needsPayment:true,price:_preT.price,title:_preT.title};
    }
    return _finishEnrol(id);
  };
  const confirmPaidEnrol=id=>{
    const _preT=trainings.find(x=>x.id===id);
    if(_preT){setPaidTrainings(p=>new Set(p).add(id));
      notify({icon:"wallet",title:"Payment received",body:`${money(_preT.price)} charged for "${_preT.title}"`,for:user.id});}
    return _finishEnrol(id);
  };
  const advanceTraining=async id=>{
    const t=trainings.find(x=>x.id===id);
    const cur=trainingProgress[id]||0; const step=Math.ceil(100/t.mods.length);
    const nx=Math.min(100,cur+step);
    try{
      await api.patch(`/content/trainings/${id}/progress`,{progress:nx});
      setTrainingProgress(p=>({...p,[id]:nx}));
      if(nx>=100&&cur<100)notify({icon:"award",title:`Completed ${t.title}`,body:"Your certificate is ready to download.",for:user?.id,link:"profile"});
    }catch(err){toast(err.message,"danger");}
  };

  /* CVs */
  const newCv=async()=>{
    const draft={name:`${user.title} CV`,template:"classic",
      name0:user.name,title:user.title,email:user.email,phone:user.phone,city:user.city,prov:user.prov,
      summary:user.summary||"",skills:(user.skills||[]).slice(0,8),certs:[],
      exp:[{id:uid("x"),role:user.title,org:"",place:`${user.city}, ${user.prov}`,from:"",to:"Present",detail:""}],
      edu:[{id:uid("e"),qual:user.edu||"",org:"",year:""}]};
    try{
      const {cv}=await api.post("/seeker/cvs",draft);
      setCvs(l=>[cv,...l]);
      if(!user.defaultCv){await api.patch("/users/me",{defaultCv:cv.id});setUser(u=>({...u,defaultCv:cv.id}));}
      setCvId(cv.id); go("cvEdit","CV builder",cv.id); log("cv.create",`Created CV "${cv.name}"`,"file");
    }catch(err){toast(err.message,"danger");}
  };
  /* Résumé import: real PDF/DOCX text extraction (server/routes/seekerMisc.js, pdf-parse +
     mammoth) - confidently pulls name/email/phone, and pastes the full extracted text into the
     summary field for the user to redistribute into Experience/Education themselves, rather than
     pretending to reliably reconstruct arbitrary resume layouts into structured sections. */
  const importResumeToNewCv=async(file)=>{
    const dataUrl=await new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(reader.result); reader.onerror=reject; reader.readAsDataURL(file);
    });
    const {name:nameGuess,email:emailGuess,phone:phoneGuess,rawText}=await api.post("/seeker/cv/parse-resume",{dataUrl});
    const draft={name:`${nameGuess||user.title} CV (imported)`,template:"classic",
      name0:nameGuess||user.name,title:user.title,email:emailGuess||user.email,phone:phoneGuess||user.phone,city:user.city,prov:user.prov,
      summary:`<p>${(rawText||"").split("\n").filter(Boolean).slice(0,40).join("<br/>")}</p>`,
      skills:(user.skills||[]).slice(0,8),certs:[],
      exp:[{id:uid("x"),role:user.title,org:"",place:`${user.city}, ${user.prov}`,from:"",to:"Present",detail:""}],
      edu:[{id:uid("e"),qual:user.edu||"",org:"",year:""}]};
    const {cv}=await api.post("/seeker/cvs",draft);
    setCvs(l=>[cv,...l]);
    setCvId(cv.id); go("cvEdit","CV builder",cv.id);
    toast("Imported — review the summary below and move content into the right sections","ok");
  };
  const editCv=id=>{setCvId(id);go("cvEdit","CV builder",id);};
  const saveCv=async d=>{
    try{
      const {cv}=await api.patch(`/seeker/cvs/${d.id}`,d);
      setCvs(l=>l.map(c=>c.id===d.id?cv:c));
      log("cv.save",`Saved CV "${d.name}"`,"file");
    }catch(err){toast(err.message,"danger");}
  };
  const duplicateCv=async id=>{
    try{const {cv}=await api.post(`/seeker/cvs/${id}/duplicate`);setCvs(l=>[cv,...l]);}
    catch(err){toast(err.message,"danger");}
  };
  const deleteCv=async id=>{
    try{
      await api.del(`/seeker/cvs/${id}`);
      setCvs(l=>l.filter(c=>c.id!==id));
      if(user.defaultCv===id){await api.patch("/users/me",{defaultCv:null});setUser(u=>({...u,defaultCv:null}));}
      log("cv.delete","Deleted a CV","trash");
    }catch(err){toast(err.message,"danger");}
  };
  const setDefaultCv=async id=>{
    try{await api.patch("/users/me",{defaultCv:id});setUser(u=>({...u,defaultCv:id}));}
    catch(err){toast(err.message,"danger");}
  };

  /* utilities */
  const downloadText=(name,text,type="text/plain")=>{
    if(typeof document==="undefined")return;
    const blob=new Blob([text],{type}); const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download=name; a.click(); URL.revokeObjectURL(url);};
  const printCv=cv=>{
    if(typeof window==="undefined")return;
    /* Build a print-friendly page and open it. Real PDF would require a lib on server.
       Plain-text fields are escaped (matching printCert's convention); summary/detail are real
       RichText HTML, so they go through the same sanitizeHtml() every other render site uses
       instead of being escaped (which would show raw tags) or left raw (which was a real XSS gap
       - this print path was the one place RichText output skipped sanitization entirely). */
    const esc=s=>String(s??"").replace(/[<>]/g,"");
    const html=`<!DOCTYPE html><html><head><title>${esc(cv.name)}</title>
      <style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;padding:0 30px;color:#111;line-height:1.5}
        h1{font-size:26pt;margin:0;letter-spacing:-.02em}h2{font-size:12pt;text-transform:uppercase;letter-spacing:.06em;
        color:#555;border-bottom:1px solid #ccc;padding-bottom:4px;margin:24px 0 12px}h3{font-size:11pt;margin:0}
        .h{color:#555;font-size:10pt;margin-top:4px}.sm{font-size:10pt;color:#666}.chip{display:inline-block;padding:3px 9px;
        background:#eef2ff;color:#334;border-radius:99px;font-size:9pt;margin:2px 4px 2px 0}
        @media print{@page{margin:1.5cm}}</style></head><body>
      <h1>${esc(cv.name0||user?.name)}</h1>
      <div class="h">${esc(cv.title||user?.title)} — ${esc(cv.city)}, ${esc(cv.prov)}</div>
      <div class="h">${esc(cv.email)} · ${esc(cv.phone)}</div>
      ${cv.summary?`<h2>Summary</h2><p>${sanitizeHtml(cv.summary)}</p>`:""}
      ${cv.exp?.length?`<h2>Experience</h2>${cv.exp.map(x=>`<div style="margin-bottom:14px"><h3>${esc(x.role)}</h3><div class="h">${esc(x.org)} · ${esc(x.place)} · ${esc(x.from)} – ${esc(x.to)}</div>${x.detail?`<p style="margin:6px 0 0">${sanitizeHtml(x.detail)}</p>`:""}</div>`).join("")}`:""}
      ${cv.edu?.length?`<h2>Education</h2>${cv.edu.map(x=>`<div style="margin-bottom:10px"><h3>${esc(x.qual)}</h3><div class="h">${esc(x.org)} · ${esc(x.year)}</div></div>`).join("")}`:""}
      ${cv.skills?.length?`<h2>Skills</h2><div>${cv.skills.map(s=>`<span class="chip">${esc(s)}</span>`).join("")}</div>`:""}
      ${cv.certs?.length?`<h2>Certifications</h2><div>${cv.certs.map(c=>`<span class="chip">${esc(c)}</span>`).join("")}</div>`:""}
      <script>window.onload=()=>setTimeout(()=>window.print(),300);</script>
      </body></html>`;
    const w=window.open("","_blank"); if(!w){toast("Enable pop-ups to download your CV as a PDF","danger");return;}
    w.document.write(html); w.document.close();
    log("cv.print",`Printed CV "${cv.name}"`,"download");
  };
  const printCert=t=>{
    if(!user){go("login");return;}
    if(!t){toast("Course not found","danger");return;}
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
      toast("Enable pop-ups to print a professionally formatted certificate — a text version was downloaded instead.","warn");
      return;
    }
    w.document.write(html); w.document.close();
    log("training.cert",`Downloaded certificate for "${t.title}"`,"award");
  };
  /* Was a bare 3-line .txt file labelled "PDF" - real letterhead + tax breakdown via the same
     print-a-formatted-page pattern printCv/printCert already use (no PDF-generation lib exists,
     so the browser's own print-to-PDF is the honest ceiling here, same as those two). */
  const printInvoice=(id,date,amt,planName,tax,taxLabel)=>{
    if(typeof window==="undefined")return;
    // tax/taxLabel come from the real per-province rate charged at checkout (see billing.js) -
    // falls back to a flat 5% GST estimate only for the handful of pre-Stripe invoice rows that
    // predate real checkout and never recorded a real tax figure.
    const gst=tax??Math.round(amt*0.05*100)/100; const total=Math.round((amt+gst)*100)/100;
    const taxName=taxLabel||"GST (5%)";
    const html=`<!DOCTYPE html><html><head><title>${id}</title>
      <style>body{font-family:Arial,Helvetica,sans-serif;max-width:680px;margin:40px auto;padding:0 30px;color:#111;line-height:1.5}
        .brand{font-size:20pt;font-weight:700;color:#005CCC;margin-bottom:2px}.sub{font-size:9pt;color:#888;margin-bottom:30px}
        h1{font-size:16pt;margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:24px}
        th{text-align:left;font-size:9pt;text-transform:uppercase;letter-spacing:.05em;color:#888;border-bottom:2px solid #ddd;padding:8px 0}
        td{padding:10px 0;border-bottom:1px solid #eee;font-size:11pt}.right{text-align:right}
        .totals{margin-top:10px;margin-left:auto;width:260px}.totals div{display:flex;justify-content:space-between;padding:4px 0;font-size:11pt}
        .totals .grand{font-weight:700;font-size:13pt;border-top:2px solid #111;padding-top:8px;margin-top:4px}
        .meta{display:flex;justify-content:space-between;margin:24px 0;font-size:10pt;color:#555}
        @media print{@page{margin:1.5cm}}</style></head><body>
      <div class="brand">NorthHire</div><div class="sub">250 Front St W, Toronto, ON M5V 3G6 · billing@northhire.ca</div>
      <h1>Invoice ${id}</h1>
      <div class="meta"><div>Billed to<br><strong>${(company?.name||"Your company").replace(/[<>]/g,"")}</strong></div>
        <div style="text-align:right">Date: ${date}<br>Status: <strong>Paid</strong></div></div>
      <table><thead><tr><th>Description</th><th class="right">Amount</th></tr></thead>
        <tbody><tr><td>NorthHire ${planName||"subscription"} plan — monthly</td><td class="right">$${amt.toFixed(2)}</td></tr></tbody></table>
      <div class="totals"><div><span>Subtotal</span><span>$${amt.toFixed(2)}</span></div>
        <div><span>${taxName}</span><span>$${gst.toFixed(2)}</span></div>
        <div class="grand"><span>Total (CAD)</span><span>$${total.toFixed(2)}</span></div></div>
      <script>window.onload=()=>setTimeout(()=>window.print(),400);</script>
      </body></html>`;
    const w=window.open("","_blank");
    if(!w){
      downloadText(`${id}.txt`,`NorthHire invoice ${id}\nBilled to: ${company?.name||""}\nDate: ${date}\nSubtotal: $${amt.toFixed(2)}\n${taxName}: $${gst.toFixed(2)}\nTotal: $${total.toFixed(2)} CAD\nStatus: Paid`);
      toast("Enable pop-ups to print a formatted invoice — a text version was downloaded instead.","warn");
      return;
    }
    w.document.write(html); w.document.close();
    log("billing.invoice_download",`Downloaded invoice ${id}`,"file");
  };
  /* Real offer-letter generation - no e-signature (that stays blocked, real e-sig needs a
     third-party provider), but the letter itself is a genuine formatted document via the same
     browser print-to-PDF pattern printCv/printCert/printInvoice already established, not a
     one-line stage label pretending to be an offer process. */
  const printOfferLetter=(candidate,j,e,draft)=>{
    if(typeof window==="undefined")return;
    const today=new Date().toLocaleDateString("en-CA",{year:"numeric",month:"long",day:"numeric"});
    const html=`<!DOCTYPE html><html><head><title>Offer letter — ${candidate.name}</title>
      <style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;padding:0 40px;color:#111;line-height:1.65}
        .brand{font-size:14pt;font-weight:700;color:#005CCC;margin-bottom:2px}.sub{font-size:9pt;color:#888;margin-bottom:30px}
        h1{font-size:17pt;margin:0 0 18px}p{margin:0 0 14px;font-size:11.5pt}
        table{width:auto;margin:18px 0;border-collapse:collapse}td{padding:4px 16px 4px 0;font-size:11pt;vertical-align:top}
        td:first-child{color:#555;white-space:nowrap}.sig{margin-top:50px;display:flex;justify-content:space-between}
        .sig div{width:45%}.sig .line{border-top:1px solid #111;margin-top:40px;padding-top:6px;font-size:9.5pt;color:#555}
        @media print{@page{margin:2cm}}</style></head><body>
      <div class="brand">${(e?.name||"Your company").replace(/[<>]/g,"")}</div>
      <div class="sub">${today}</div>
      <h1>Offer of Employment</h1>
      <p>Dear ${candidate.name.replace(/[<>]/g,"")},</p>
      <p>We are pleased to offer you the position of <strong>${(j?.t||"").replace(/[<>]/g,"")}</strong> at ${(e?.name||"our company").replace(/[<>]/g,"")}. This letter outlines the key terms of your offer.</p>
      <table>
        <tr><td>Position</td><td><strong>${j?.t||""}</strong></td></tr>
        <tr><td>Location</td><td>${j?.city||""}, ${j?.prov||""} (${j?.mode||"On-site"})</td></tr>
        <tr><td>Employment type</td><td>${j?.type||"Full Time"}</td></tr>
        <tr><td>Start date</td><td>${draft.startDate||"To be confirmed"}</td></tr>
        <tr><td>Compensation</td><td>${draft.salary||"To be confirmed"}</td></tr>
        ${draft.manager?`<tr><td>Reporting to</td><td>${draft.manager}</td></tr>`:""}
        ${draft.deadline?`<tr><td>Offer expires</td><td>${draft.deadline}</td></tr>`:""}
      </table>
      <p>This offer is contingent on satisfactory completion of any reference or background checks required for the role, and on your eligibility to work in Canada. Full terms will be confirmed in your formal employment agreement.</p>
      <p>We're excited about the possibility of you joining our team. Please indicate your acceptance by signing below.</p>
      <div class="sig">
        <div><div class="line">${candidate.name} — Candidate signature &amp; date</div></div>
        <div><div class="line">On behalf of ${e?.name||"the company"} — date</div></div>
      </div>
      <script>window.onload=()=>setTimeout(()=>window.print(),400);</script>
      </body></html>`;
    const w=window.open("","_blank");
    if(!w){
      downloadText(`offer-letter-${candidate.name.replace(/\s+/g,"-")}.txt`,
        `Offer of Employment\n\n${today}\n\nDear ${candidate.name},\n\nWe are pleased to offer you the position of ${j?.t||""} at ${e?.name||""}.\nStart date: ${draft.startDate||"TBC"}\nCompensation: ${draft.salary||"TBC"}${draft.manager?`\nReporting to: ${draft.manager}`:""}`);
      toast("Enable pop-ups to print a formatted offer letter — a text version was downloaded instead.","warn");
      return;
    }
    w.document.write(html); w.document.close();
    log("pipeline.offer_letter",`Generated offer letter for ${candidate.name} — ${j?.t||""}`,"file");
  };
  const exportApplicants=jid=>{const j=job(jid);
    const rows=[["Name","Email","Stage","Applied","Fit"],...applications.filter(a=>a.job===jid)
      .map(a=>{const u=person(a.user);return [u.name,u.email,a.stage,a.at,scoreCandidate(u,j)];})];
    downloadText(`applicants-${jid}.csv`,rows.map(r=>r.join(",")).join("\n"),"text/csv");};
  const exportLog=(list)=>downloadText("activity-log.csv",
    ["Time,Actor,Action,Detail",...(list||activity).map(e=>`${e.at},"${e.actor}",${e.action},"${e.text}"`)].join("\n"),"text/csv");
  const exportUsers=(list)=>{const rows=[["Name","Email","Title","Category","City","Province","Years","Suspended"],
    ...(list||people).map(p=>[p.name,p.email,p.title||"",p.cat||"",p.city||"",p.prov||"",p.years||0,suspended.has(p.id)?"Yes":"No"])];
    downloadText("seekers.csv",rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n"),"text/csv");};
  const exportEmployers=(list)=>{const rows=[["Name","Industry","City","Province","Size","Plan","Verified","On hold","Rating"],
    ...(list||employers).map(e=>[e.name,e.industry||"",e.city||"",e.prov||"",e.size||"",e.plan,e.verified?"Yes":"No",e.hold?"Yes":"No",e.rating])];
    downloadText("employers.csv",rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n"),"text/csv");};
  /* Real share sheet / clipboard copy, not just a silent activity-log entry. Can't deep-link to
     this specific listing (no real per-item routing exists yet — see Systemic #8), so this
     shares the title as text rather than a URL that would just resolve to the generic home page. */
  const share=x=>{
    const title=x.t||x.title; const text=`${title} — on NorthHire`;
    if(typeof navigator!=="undefined"&&navigator.share){
      navigator.share({title,text}).catch(()=>{});
    } else if(typeof navigator!=="undefined"&&navigator.clipboard?.writeText){
      navigator.clipboard.writeText(text).then(()=>toast("Copied to clipboard")).catch(()=>toast("Couldn't copy to clipboard","danger"));
    } else toast("Sharing isn't supported in this browser","warn");
    log("share",`Shared "${title}"`,"share");
  };
  const PLANS=platformConfig?.plans||DEFAULT_PLANS;
  const payrollTaxConfig=platformConfig?.payrollTax||DEFAULT_PAYROLL_TAX_CONFIG;
  const choosePlan=async n=>{
    if(!PLANS[n])return;
    if(user?.role==="employer"){
      if(PLANS[n].price>0){
        const r=await startCheckout(n); // redirects to Stripe - nothing after this runs on success
        if(!r.ok)toast(r.msg,"danger");
        return;
      }
      try{
        const {employer}=await api.patch(`/employers/${company.id}`,{plan:n});
        setEmployers(l=>l.map(e=>e.id===company.id?mapApiEmployer(employer):e));
        log("billing.plan",`Switched to the ${n} plan`,"wallet");go("empBilling");
      }catch(err){toast(err.message,"danger");}
    }else if(!user){setPendingPlan(n);go("signup");}
    else go("denied");};

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
  const requestUpgrade=(feature,label,icon)=>setUpgradeModal({feature,requiredPlan:planRequires(feature),label,icon});
  const updateCard=()=>log("billing.card","Updated the payment method","wallet");
  const setSetting=async(k,v)=>{
    setSettings(s=>({...s,[k]:v}));
    try{await api.patch("/platform/settings",{key:k,value:v});log("settings.change",`${v?"Enabled":"Disabled"} ${k}`,"gear");}
    catch(err){setSettings(s=>({...s,[k]:!v}));toast(err.message,"danger");}
  };
  const readNotif=async(id,link)=>{
    setNotifications(l=>l.map(n=>n.id===id?{...n,read:true}:n));
    if(link)go(link);
    try{await api.patch(`/seeker/notifications/${id}/read`);}catch{/* best-effort */}
  };
  const markAllRead=async()=>{
    setNotifications(l=>l.map(n=>({...n,read:true})));
    try{await api.patch("/seeker/notifications/read-all");}catch{/* best-effort */}
  };

  const A={pg,go,back,pageTitle,homePg,history:stack,user,company,employers,jobs,people,applications,blogs,trainings,cvs,passwords,outbox,savedSearches,messages,interviews,reviews,impersonating,setImpersonating,hireOnboarding,setHireOnboarding,
    hasAccount,upsertPassword,loginWithPassword,verifyLogin2FA,resetPasswordRequest,resetPasswordConfirm,completeEmployerSignup,
    saveSearch,deleteSavedSearch,toggleSearchAlert,updateSavedSearch,editingSavedSearchId,setEditingSavedSearchId,
    salaryInsight,skillsGap,expandQuery,restoreApp,notifyFollowers,
    sendMessage,markMessageRead,scheduleInterview,cancelInterview,bulkMove,bulkReject,reverseMatch,inviteToApply,loadCandidateOutreach,importJobsCSV,employerAnalytics,
    impersonate,stopImpersonating,
    PLANS,PLAN_ORDER,payrollTaxConfig,platformConfig,currentPlan,planName,can,limitOf,planRequires,upgradeModal,setUpgradeModal,requestUpgrade,
    oauthProviders,oauthStart,turnstileSiteKey,
    paymentMethods,addPaymentMethod,removePaymentMethod,setDefaultPayment,employerInvoices,verifyCheckout,startCheckout,openBillingPortal,
    twoFactor,enable2FA,disable2FA,
    references,addReference,removeReference,
    addReview,deleteReview,loadEmployerReviews,loadCandidateContact,candidateNotes,saveCandidateNote,loadScorecards,submitScorecard,
    submitContact,loadContactInbox,resolveContactMessage,listAdmins,setAdminScope,updatePlatformConfig,geocode,
    saved,following,enrolled,trainingProgress,suspended,suspensionInfo,invitedCandidates,notifications,activity,securitySignals,opsHealth,settings,userSettings,search,setSearch,
    toasts,toast,dismissToast,
    jobId,empId,blogId,trainingId,cvId,editId,candidateId,pipelineJob,applyDraft,setApplyDraft,
    contactPrefill,setContactPrefill,pendingPlan,setPendingPlan,employersPrefill,setEmployersPrefill,
    blogAuthorFilter,setBlogAuthorFilter,filterBlogsByAuthor,
    emp,job,person,score,scoreCandidate,scoreBreakdown,matchReasons,myApps,appliedJobIds,myNotifications,defaultCv,
    jobHiringType,jobHiringLabel,
    completeness,completenessHint,tabBadges,
    logout,completeSignup,saveProfile,deleteAccount,exportData,setUserSetting,marketingConsent,setMarketingConsent,
    toggleSave,followEmployer,openJob,openEmployer,openBlog,openTraining,openCandidate,
    beginApply,submitApply,withdraw,acceptOffer,moveApp,rejectApp,
    publishJob,approveJob,toggleJobStatus,flagJob,reportJob,jobReports,loadJobReports,decideJobReport,setPipelineJob:setPipelineJobFn,saveCompany,verifyEmployer,holdEmployer,toggleSuspend,eraseUser,
    team,loadTeam,inviteTeammate,revokeInvite,removeTeammate,getInvite,acceptInvite,inviteToken,
    messageTemplates,saveMessageTemplate,deleteMessageTemplate,
    editBlog,editTraining,saveBlog,saveTraining,deleteBlog,deleteTraining,toggleBlogStatus,toggleTrainingStatus,
    loadContentRevisions,restoreContentRevision,
    enrol,confirmPaidEnrol,advanceTraining,paidTrainings,newCv,importResumeToNewCv,editCv,saveCv,duplicateCv,deleteCv,setDefaultCv,
    printCv,printCert,printInvoice,printOfferLetter,exportApplicants,exportLog,exportUsers,exportEmployers,share,choosePlan,updateCard,setSetting,
    readNotif,markAllRead,logActivity:log,
    ...HR,
    ...STF};

  return A;
}
