import { useState } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn, Field, Input, Sel, Banner } from "../../design/primitives.jsx";
import { _fmtDate } from "../../helpers/utils.js";
import { useTranslation } from "../../i18n/i18n.jsx";

/* ═══════════════════════════════════════════════════════════════════════════
   HIRE ONBOARDING MODAL — surfaces when employer moves candidate to "Hired"
   Bridges Employer console (hiring) with HR Suite (people ops)
   ═══════════════════════════════════════════════════════════════════════════ */
export function HireOnboardingModal({payload,onClose}){
  const A=use(); const { t } = useTranslation(); const mob=useMedia("(max-width: 900px)");
  const {app,job,person}=payload;
  const company=A.company; const depts=A.hrDeptsAtCompany?.(company.id)||[];
  const defaultDept=depts[0]?.id||"d1";
  const [role,setRole]=useState("employee");
  const [dept,setDept]=useState(defaultDept);
  const [title,setTitle]=useState(job.t);
  const [manager,setManager]=useState("");
  const [salary,setSalary]=useState(job.salaryHigh||job.salaryLow||60000);
  const [startDate,setStartDate]=useState(_fmtDate(new Date(Date.now()+14*864e5)));
  const [addToHr,setAddToHr]=useState(true);
  /* Local UX state: without this the button did nothing visible even when the request was
     in flight — the user's exact complaint. `busy` disables the button + gives the
     operator a spinner while addEmployee runs; `err` renders an inline banner if the API
     rejects the create instead of silently swallowing the error and closing the modal
     (previous behavior: onClose ran unconditionally so a failure looked like nothing
     happened, and any local state the operator filled in was gone). */
  const [busy,setBusy]=useState(false);
  const [err,setErr]=useState("");

  const activeEmps=A.hrEmpsAtCompany?.(company.id).filter(e=>e.status==="active")||[];

  const finish=async()=>{
    if(busy)return;
    setErr("");
    if(!addToHr){onClose(); return;}
    setBusy(true);
    try{
      const employee=await A.addEmployee({
        companyId:company.id,
        name:person.name, email:person.email, role, dept,
        title, manager:manager||null, city:person.city||"", prov:person.prov||"ON",
        phone:person.phone||"", salary, hired:startDate,
      });
      // Toast + navigate to the new HR record so the employer sees the follow-through.
      A.toast?.(t("hireOnboarding.createdToast",{name:person.name}),"ok");
      onClose();
      // Land on the HR People page (the "someone was just added" surface) if we can't jump
      // straight to the profile — the router keys profile views by employee id in a query
      // shape that's HrShell-specific, so the safer default is the directory landing.
      if(employee?.id)A.go?.("hrPeople"); else A.go?.("hrDashboard");
    }catch(e){
      // Two common failure modes: hrAutoLogin's silent {ok:false} left no HR session so
      // the create 401'd, or a validation problem (duplicate email). Either way, surface
      // it in-modal and let the operator retry rather than closing on them.
      setErr(e?.message||t("hireOnboarding.createFailed"));
    }finally{setBusy(false);}
  };

  return <div onClick={onClose} className={`fixed inset-0 bg-[rgba(15,23,42,0.72)] z-9998 flex items-center justify-center backdrop-blur-sm ${mob?"p-4":"p-6"}`}>
    <div onClick={e=>e.stopPropagation()} className={`bg-white max-w-2xl w-full max-h-[92vh] overflow-auto shadow-[0_24px_60px_rgba(0,0,0,0.4)] ${mob?"rounded-2xl":"rounded-3xl"}`}>
      {/* Celebration header */}
      <div className={`bg-[linear-gradient(180deg,var(--color-tint)_0%,#fff_100%)] border-b border-line ${mob?"pt-6 px-6 pb-5":"pt-8 px-8 pb-6"}`}>
        <div className="flex gap-3.5 items-start">
          <div className="w-13 h-13 rounded-2xl bg-brand text-white flex items-center justify-center shrink-0">
            <I n="award" s={26}/>
          </div>
          <div className="flex-1 min-w-0">
            <div className="inline-block py-1 px-2.5 bg-ok-bg text-ok border border-ok-ln rounded-full text-xs font-bold tracking-wide uppercase mb-2">{t("hireOnboarding.hireConfirmed")}</div>
            <h2 className={`font-bold tracking-tight text-text mb-1.5 leading-tight ${mob?"text-xl":"text-2xl"}`}>{t("hireOnboarding.welcomeGreeting",{firstName:person.name.split(" ")[0],companyName:company.name})}</h2>
            <div className="text-sm text-text-2">{t("hireOnboarding.hiredForJob",{jobTitle:job.t})}</div>
          </div>
          <button onClick={onClose} aria-label={t("hireOnboarding.closeLabel")} className="bg-transparent border-0 cursor-pointer p-1.5 text-text-3 flex shrink-0"><I n="x" s={20}/></button>
        </div>
      </div>

      {/* Toggle */}
      <div className={`border-b border-line-soft ${mob?"py-5 px-6":"py-6 px-8"}`} style={{background:addToHr?C.okBg+"40":"#fff"}}>
        <label className="flex gap-3 items-start cursor-pointer">
          <input type="checkbox" checked={addToHr} onChange={e=>setAddToHr(e.target.checked)} className="w-5 h-5 mt-0.5 cursor-pointer shrink-0" style={{accentColor:C.brand}}/>
          <div className="flex-1">
            <div className="text-sm font-bold text-text mb-1">{t("hireOnboarding.addToHrTitle",{firstName:person.name.split(" ")[0]})}</div>
            <div className="text-xs text-text-3 leading-normal">{t("hireOnboarding.addToHrBody")}</div>
          </div>
        </label>
      </div>

      {addToHr&&<div className={mob?"py-5 px-6":"py-6 px-8"}>
        <div className={`grid gap-3 mb-3.5 ${mob?"grid-cols-1":"grid-cols-2"}`}>
          <Field label={t("hireOnboarding.jobTitleLabel")} required><Input value={title} onChange={e=>setTitle(e.target.value)}/></Field>
          <Field label={t("hireOnboarding.startDateLabel")} required><Input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}/></Field>
          <Field label={t("hireOnboarding.departmentLabel")} required><Sel value={dept} onChange={e=>setDept(e.target.value)}>
            {depts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
          </Sel></Field>
          <Field label={t("hireOnboarding.reportsToLabel")}><Sel value={manager} onChange={e=>setManager(e.target.value)}>
            <option value="">{t("hireOnboarding.noManagerOption")}</option>
            {activeEmps.map(e=><option key={e.id} value={e.id}>{e.name} ({e.title})</option>)}
          </Sel></Field>
          <Field label={t("hireOnboarding.roleLabel")} hint={t("hireOnboarding.roleHint")}>
            <Sel value={role} onChange={e=>setRole(e.target.value)}>
              {A.HR_ROLES.map(r=><option key={r.k} value={r.k}>{r.label} — {r.desc}</option>)}
            </Sel>
          </Field>
          <Field label={t("hireOnboarding.salaryLabel")}><Input type="number" value={salary} onChange={e=>setSalary(Number(e.target.value)||0)}/></Field>
        </div>
        <Banner tone="brand" icon="shield" title={t("hireOnboarding.dataLinkedTitle")}>
          {t("hireOnboarding.dataLinkedBody")}
        </Banner>
      </div>}

      {err&&<div className={mob?"px-6 pb-3":"px-8 pb-3"}>
        <Banner tone="danger" icon="alert" title={t("hireOnboarding.createFailed")}>
          {err}
        </Banner>
      </div>}

      {/* Footer */}
      <div className={`border-t border-line bg-bg flex gap-2.5 justify-end flex-wrap ${mob?"pt-4 px-6 pb-5":"pt-5 px-8 pb-6"}`}>
        <Btn kind="ghost" onClick={onClose} disabled={busy}>{addToHr?t("hireOnboarding.skipForNow"):t("hireOnboarding.closeLabel")}</Btn>
        {addToHr&&<Btn kind="primary" icon={busy?"clock":"check"} onClick={finish} disabled={busy}>
          {busy?t("hireOnboarding.creating"):t("hireOnboarding.createHrRecord")}
        </Btn>}
      </div>
    </div>
  </div>;
}
