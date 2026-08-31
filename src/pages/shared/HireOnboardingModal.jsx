import { useState } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn, Field, Input, Sel, Banner } from "../../design/primitives.jsx";
import { _fmtDate } from "../../helpers/utils.js";

/* ═══════════════════════════════════════════════════════════════════════════
   HIRE ONBOARDING MODAL — surfaces when employer moves candidate to "Hired"
   Bridges Employer console (hiring) with HR Suite (people ops)
   ═══════════════════════════════════════════════════════════════════════════ */
export function HireOnboardingModal({payload,onClose}){
  const A=use(); const mob=useMedia("(max-width: 900px)");
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

  const activeEmps=A.hrEmpsAtCompany?.(company.id).filter(e=>e.status==="active")||[];

  const finish=()=>{
    if(addToHr){
      A.addEmployee({
        companyId:company.id,
        name:person.name, email:person.email, role, dept,
        title, manager:manager||null, city:person.city||"", prov:person.prov||"ON",
        phone:person.phone||"", salary,
        linkedNorthHireUserId:person.id, hiredFrom:job.id, startDate,
      });
    }
    onClose();
  };

  return <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(15,23,42,.72)",zIndex:9998,display:"flex",alignItems:"center",justifyContent:"center",padding:mob?16:24,backdropFilter:"blur(4px)"}}>
    <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:mob?16:20,maxWidth:640,width:"100%",maxHeight:"92vh",overflow:"auto",boxShadow:"0 24px 60px rgba(0,0,0,.4)"}}>
      {/* Celebration header */}
      <div style={{padding:mob?"24px 22px 20px":"32px 32px 24px",background:`linear-gradient(180deg, ${C.tint} 0%, #fff 100%)`,borderBottom:`1px solid ${C.line}`}}>
        <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
          <div style={{width:52,height:52,borderRadius:14,background:C.brand,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <I n="award" s={26}/>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"inline-block",padding:"3px 10px",background:C.okBg,color:C.ok,border:`1px solid ${C.okLn}`,borderRadius:99,fontSize:10.5,fontWeight:700,letterSpacing:".05em",textTransform:"uppercase",marginBottom:8}}>Hire confirmed</div>
            <h2 style={{fontSize:mob?20:24,fontWeight:730,color:C.text,letterSpacing:"-.025em",margin:"0 0 6px",lineHeight:1.2}}>Welcome {person.name.split(" ")[0]} to {company.name}</h2>
            <div style={{fontSize:13.5,color:C.text2}}>Hired for <strong>{job.t}</strong> · Set up their HR Suite profile now.</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{background:"none",border:"none",cursor:"pointer",padding:6,color:C.text3,display:"flex",flexShrink:0}}><I n="x" s={20}/></button>
        </div>
      </div>

      {/* Toggle */}
      <div style={{padding:mob?"18px 22px":"22px 32px",borderBottom:`1px solid ${C.lineSoft}`,background:addToHr?C.okBg+"40":"#fff"}}>
        <label style={{display:"flex",gap:12,alignItems:"flex-start",cursor:"pointer"}}>
          <input type="checkbox" checked={addToHr} onChange={e=>setAddToHr(e.target.checked)} style={{width:20,height:20,marginTop:2,accentColor:C.brand,cursor:"pointer",flexShrink:0}}/>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:660,color:C.text,marginBottom:3}}>Add {person.name.split(" ")[0]} to HR Suite</div>
            <div style={{fontSize:12.5,color:C.text3,lineHeight:1.5}}>Creates their employee record for attendance, leave, payroll, expenses, and reviews. They'll receive an email with sign-in details for their employee portal.</div>
          </div>
        </label>
      </div>

      {addToHr&&<div style={{padding:mob?"18px 22px":"22px 32px"}}>
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12,marginBottom:14}}>
          <Field label="Job title" required><Input value={title} onChange={e=>setTitle(e.target.value)}/></Field>
          <Field label="Start date" required><Input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}/></Field>
          <Field label="Department" required><Sel value={dept} onChange={e=>setDept(e.target.value)}>
            {depts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
          </Sel></Field>
          <Field label="Reports to"><Sel value={manager} onChange={e=>setManager(e.target.value)}>
            <option value="">— No manager (top level) —</option>
            {activeEmps.map(e=><option key={e.id} value={e.id}>{e.name} ({e.title})</option>)}
          </Sel></Field>
          <Field label="Access role" hint="What they can do in HR Suite">
            <Sel value={role} onChange={e=>setRole(e.target.value)}>
              {A.HR_ROLES.map(r=><option key={r.k} value={r.k}>{r.label} — {r.desc}</option>)}
            </Sel>
          </Field>
          <Field label="Annual salary (CAD)"><Input type="number" value={salary} onChange={e=>setSalary(Number(e.target.value)||0)}/></Field>
        </div>
        <Banner tone="brand" icon="shield" title="Data linked between products">
          Their NorthHire seeker profile stays linked to this HR record. When they update their skills or certifications on NorthHire, it syncs to HR Suite automatically. You can adjust link privacy in HR Settings.
        </Banner>
      </div>}

      {/* Footer */}
      <div style={{padding:mob?"16px 22px 20px":"18px 32px 24px",borderTop:`1px solid ${C.line}`,background:C.bg,display:"flex",gap:10,justifyContent:"flex-end",flexWrap:"wrap"}}>
        <Btn kind="ghost" onClick={onClose}>{addToHr?"Skip for now":"Close"}</Btn>
        {addToHr&&<Btn kind="primary" icon="check" onClick={finish}>Create HR record</Btn>}
      </div>
    </div>
  </div>;
}
