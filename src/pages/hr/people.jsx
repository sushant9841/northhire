import { useState, useEffect } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C, SH } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn, Card, Tag, Field, Input, Sel, Area, Banner, Modal, SmartPortrait, Empty, Stat, ConfirmDialog, Lbl, Switch, usePagination, Pagination, TH_CLASS, TD_CLASS } from "../../design/primitives.jsx";
import { _fmtDate } from "../../helpers/utils.js";
import { HR_ROLES } from "../../store/seed/hrCompanySettings.js";
import { HR_DEPARTMENTS } from "../../store/seed/hrDepartments.js";

/* Shared underline-style tab bar used by both the People and Expenses pages */
function _UnderlineTabs({items,value,onChange}){
  return <div className="flex gap-1 mb-5 overflow-x-auto border-b border-line">
    {items.map(t=><button key={t.k} onClick={()=>onChange(t.k)}
      className={`bg-transparent border-0 py-2.5 px-3.5 cursor-pointer text-sm flex gap-1.5 items-center shrink-0 transition-colors duration-150 -mb-px border-b-2 ${value===t.k?"font-bold text-brand border-brand":"font-medium text-text-2 border-transparent"}`}>
      <I n={t.icon} s={15}/>{t.label}
      {t.count>0&&<span className={`text-xs font-bold py-0.5 px-1.5 rounded-full ${value===t.k?"bg-brand text-white":"bg-bg text-text-3"}`}>{t.count}</span>}
    </button>)}
  </div>;
}

export function HrPeoplePage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [tab,setTab]=useState("directory");
  const emp=A.hrCurrentEmp(); const company=A.hrCurrentCompany();
  if(!emp||!company)return null;
  const tabs=[
    {k:"directory",label:"Directory",icon:"users"},
    {k:"orgchart",label:"Org chart",icon:"activity"},
    {k:"departments",label:"Departments",icon:"building"},
    {k:"manage",label:"Manage",icon:"gear"},
  ];
  const isPriv=["hr","admin","owner"].includes(emp.role);
  const visibleTabs=isPriv?tabs:tabs.filter(t=>t.k!=="manage");
  return <div>
    <_UnderlineTabs items={visibleTabs} value={tab} onChange={setTab}/>
    {tab==="directory"&&<HrPeople_Directory/>}
    {tab==="orgchart"&&<HrPeople_OrgChart/>}
    {tab==="departments"&&<HrPeople_Departments/>}
    {tab==="manage"&&isPriv&&<HrPeople_Manage/>}
  </div>;
}

/* ─── Directory: searchable list of everyone ─── */
function HrPeople_Directory(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [q,setQ]=useState(""); const [deptFilter,setDeptFilter]=useState("all");
  const emp=A.hrCurrentEmp(); const company=A.hrCurrentCompany();
  if(!emp||!company)return null;
  const all=A.hrEmpsAtCompany(company.id).filter(e=>e.status==="active");
  const depts=A.hrDeptsAtCompany?.(company.id)||A.HR_DEPARTMENTS;
  const filtered=all.filter(e=>{
    if(deptFilter!=="all"&&e.dept!==deptFilter)return false;
    if(!q.trim())return true;
    const s=q.toLowerCase();
    return e.name.toLowerCase().includes(s)||e.title?.toLowerCase().includes(s)||e.email.toLowerCase().includes(s);
  }).sort((a,b)=>a.name.localeCompare(b.name));
  const pg=usePagination(filtered,24);
  const exportDirectory=()=>{
    const rows=[["Name","Title","Department","Email","Phone","City","Province","Role","Manager","Hired"],
      ...filtered.map(e=>{const d=depts.find(x=>x.id===e.dept); const mgr=A.hrEmp(e.manager);
        return [e.name,e.title||"",d?.name||"",e.email,e.phone||"",e.city||"",e.prov||"",e.role,mgr?.name||"",e.hired||""];})];
    const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv"}); const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download="hr-directory.csv"; a.click(); URL.revokeObjectURL(url);
  };
  return <div>
    <div className="flex gap-2.5 mb-4 flex-wrap">
      <Input icon="search" placeholder="Search by name, title, or email" value={q} onChange={e=>setQ(e.target.value)} style={{flex:"1 1 260px"}}/>
      <Sel value={deptFilter} onChange={e=>setDeptFilter(e.target.value)} style={{minWidth:180}}>
        <option value="all">All departments</option>
        {depts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
      </Sel>
      <Btn kind="outline" size="sm" icon="download" onClick={exportDirectory}>Export {filtered.length<all.length?`filtered (${filtered.length})`:"CSV"}</Btn>
    </div>
    <div className="grid gap-3" style={{gridTemplateColumns:mob?"1fr":"repeat(auto-fill,minmax(280px,1fr))"}}>
      {pg.pageItems.map(e=>{const d=depts.find(x=>x.id===e.dept);
        const mgr=A.hrEmp(e.manager);
        return <Card key={e.id} pad={16} style={{borderRadius:12,cursor:"pointer",transition:"all .15s"}}
          onMouseEnter={ev=>{ev.currentTarget.style.borderColor=C.brand;ev.currentTarget.style.boxShadow=SH.sm;}}
          onMouseLeave={ev=>{ev.currentTarget.style.borderColor=C.line;ev.currentTarget.style.boxShadow="none";}}>
          <div className="flex gap-3 items-center mb-2.5">
            <SmartPortrait seed={e.seed} size={44} radius={11}/>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-text tracking-tight overflow-hidden text-ellipsis whitespace-nowrap" style={{fontSize:14.5}}>{e.name}</div>
              <div className="text-xs text-text-3 mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap">{e.title}</div>
            </div>
          </div>
          <div className="flex gap-1.5 flex-wrap mb-2.5">
            {d&&<Tag sm style={{background:d.color+"22",color:d.color,border:"1px solid "+d.color+"55"}}>{d.name}</Tag>}
            <Tag sm tone="neutral">{A.HR_ROLES.find(r=>r.k===e.role)?.label||e.role}</Tag>
          </div>
          <div className="text-xs text-text-3 leading-snug">
            <div>📧 {e.email}</div>
            {e.phone&&<div>📞 {e.phone}</div>}
            {mgr&&<div className="mt-1">Reports to <span className="text-text-2 font-semibold">{mgr.name}</span></div>}
          </div>
        </Card>;})}
      {filtered.length===0&&<div style={{gridColumn:"1/-1"}}><Empty icon="users" title="No matches" body="Try different search or filter terms."/></div>}
    </div>
    <Pagination {...pg}/>
  </div>;
}

/* ─── Org Chart: tree view of reporting lines ─── */
function HrPeople_OrgChart(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const company=A.hrCurrentCompany();
  if(!company)return null;
  const all=A.hrEmpsAtCompany(company.id).filter(e=>e.status==="active");
  const depts=A.hrDeptsAtCompany?.(company.id)||A.HR_DEPARTMENTS;
  /* Build tree — find roots (no manager or manager not in list) */
  const empMap={}; all.forEach(e=>{empMap[e.id]=e;});
  const children={}; all.forEach(e=>{
    const mid=e.manager&&empMap[e.manager]?e.manager:"__root__";
    if(!children[mid])children[mid]=[];
    children[mid].push(e);
  });
  const roots=children["__root__"]||[];
  const [q,setQ]=useState("");
  const searchActive=q.trim().length>0;
  /* Search auto-expands only the branches leading to a match, instead of forcing the whole
     (potentially large) tree open - a name search on a big org otherwise defeats its own purpose. */
  const subtreeMatches=e=>{
    if(e.name.toLowerCase().includes(q.toLowerCase()))return true;
    return (children[e.id]||[]).some(k=>subtreeMatches(k));
  };

  const Node=({e,depth=0,ancestors})=>{
    /* `ancestors` guards against a manager-reference cycle (e.g. two people accidentally set
       as each other's manager) recursing forever and crashing the tab — a bad cycle just stops
       rendering deeper instead of looping. */
    const seen=ancestors||new Set();
    const kids=(children[e.id]||[]).filter(k=>!seen.has(k.id));
    const d=depts.find(x=>x.id===e.dept);
    const [manualOpen,setManualOpen]=useState(depth<2);
    const isMatch=searchActive&&e.name.toLowerCase().includes(q.toLowerCase());
    const open=searchActive?subtreeMatches(e):manualOpen;
    if(searchActive&&!subtreeMatches(e))return null;
    return <div className="relative" style={{marginLeft:depth===0?0:mob?14:24,marginTop:depth===0?0:8}}>
      {depth>0&&<div className="absolute left-3.5 top-0 rounded-bl" style={{bottom:"50%",width:14,borderLeft:`2px solid ${C.line}`,borderBottom:`2px solid ${C.line}`}}/>}
      <div className={`flex gap-2.5 items-center py-2.5 px-3 bg-white border rounded-xl transition-all duration-150 ${isMatch?"border-brand":"border-line"}`} style={isMatch?{boxShadow:`0 0 0 2px ${C.line2}`}:undefined}>
        {kids.length>0&&<button onClick={()=>setManualOpen(!manualOpen)} className="bg-transparent border-0 p-0.5 cursor-pointer text-text-3 flex">
          <I n={open?"chevD":"chevR"} s={14}/>
        </button>}
        {kids.length===0&&<div className="w-5 h-5"/>}
        <SmartPortrait seed={e.seed} size={32} radius={8}/>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-semibold overflow-hidden text-ellipsis whitespace-nowrap ${isMatch?"text-brand":"text-text"}`}>{e.name}</div>
          <div className="text-xs text-text-3 mt-px overflow-hidden text-ellipsis whitespace-nowrap">{e.title}</div>
        </div>
        {d&&<Tag sm style={{background:d.color+"22",color:d.color,border:"1px solid "+d.color+"55",flexShrink:0}}>{d.name}</Tag>}
        {kids.length>0&&<span className="text-xs font-semibold text-text-3 ml-1 py-0.5 px-2 bg-bg rounded-full shrink-0">{kids.length}</span>}
      </div>
      {open&&kids.length>0&&<div className="mt-1.5 border-l-2 border-line" style={{paddingLeft:mob?4:14}}>
        {kids.map(k=><Node key={k.id} e={k} depth={depth+1} ancestors={new Set([...seen,e.id])}/>)}
      </div>}
    </div>;
  };

  return <div>
    <div className="flex justify-between items-center mb-4 flex-wrap gap-2.5">
      <div>
        <div className="text-base font-semibold text-text">Reporting structure</div>
        <div className="text-xs text-text-3 mt-0.5">{all.length} people · {roots.length} report{roots.length===1?"s":""} at the top level</div>
      </div>
      <Input icon="search" placeholder="Find a person" value={q} onChange={e=>setQ(e.target.value)} style={{width:220}}/>
    </div>
    <Card pad={mob?16:24} style={{borderRadius:14}}>
      <div className="flex flex-col gap-1.5">
        {roots.map(r=><Node key={r.id} e={r}/>)}
        {searchActive&&roots.every(r=>!subtreeMatches(r))&&<Empty icon="search" title="No one matches that search" body="Try a different name."/>}
        {roots.length===0&&<Empty icon="users" title="No org chart yet" body="Once employees have managers assigned, the tree appears here."/>}
      </div>
    </Card>
  </div>;
}

/* ─── Departments: CRUD ─── */
function HrPeople_Departments(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [showAdd,setShowAdd]=useState(false);
  const [nd,setNd]=useState({name:"",lead:"",color:"#6AACFF",about:""});
  const [editing,setEditing]=useState(null);
  const [removing,setRemoving]=useState(null);
  const emp=A.hrCurrentEmp(); const company=A.hrCurrentCompany();
  if(!emp||!company)return null;
  const depts=A.hrDeptsAtCompany?.(company.id)||[];
  const all=A.hrEmpsAtCompany(company.id).filter(e=>e.status==="active");
  const isPriv=["hr","admin","owner"].includes(emp.role);

  const create=()=>{if(!nd.name.trim())return;
    A.addDepartment({companyId:company.id,name:nd.name.trim(),lead:nd.lead||null,color:nd.color,about:nd.about});
    setNd({name:"",lead:"",color:"#6AACFF",about:""}); setShowAdd(false);};
  const save=()=>{if(!editing.name.trim())return;
    A.updateDepartment(editing.id,{name:editing.name.trim(),lead:editing.lead,color:editing.color,about:editing.about});
    setEditing(null);};
  const doRemove=async(d)=>{
    const r=await A.removeDepartment(d.id);
    if(!r.ok)A.toast(r.msg,"danger");
  };

  const colors=["#005CCC","#B45309","#0B6B3A","#5B2E8C","#0F5C8C","#D97706","#B91C1C","#0E7C86"];

  return <div>
    <div className="flex justify-between items-center mb-4 flex-wrap gap-2.5">
      <div>
        <div className="text-base font-semibold text-text">{depts.length} departments</div>
        <div className="text-xs text-text-3 mt-0.5">Group employees, set department leads, assign reporting.</div>
      </div>
      {isPriv&&<Btn kind="primary" size="sm" icon="plus" onClick={()=>setShowAdd(true)}>New department</Btn>}
    </div>

    <div className="grid gap-3" style={{gridTemplateColumns:mob?"1fr":"repeat(auto-fill,minmax(280px,1fr))"}}>
      {depts.map(d=>{const count=all.filter(e=>e.dept===d.id).length;
        const lead=d.lead?A.hrEmp(d.lead):null;
        return <Card key={d.id} pad={18} style={{borderRadius:12,borderTop:`4px solid ${d.color}`}}>
          <div className="flex justify-between items-start gap-2 mb-2.5">
            <div className="flex-1 min-w-0">
              <div className="font-bold text-text tracking-tight" style={{fontSize:15.5}}>{d.name}</div>
              <div className="text-xs text-text-3 mt-0.5">{count} member{count===1?"":"s"}</div>
            </div>
            {isPriv&&<div className="flex gap-1">
              <Btn kind="ghost" size="xs" icon="edit" onClick={()=>setEditing({...d})}>Edit</Btn>
            </div>}
          </div>
          {d.about&&<div className="text-sm text-text-2 leading-snug mb-3">{d.about}</div>}
          {lead&&<div className="py-2.5 px-3 bg-bg rounded-lg flex gap-2.5 items-center">
            <SmartPortrait seed={lead.seed} size={30} radius={7}/>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-text-3">Department lead</div>
              <div className="text-sm font-semibold text-text mt-px">{lead.name}</div>
            </div>
          </div>}
          {isPriv&&<Btn kind="dangerSoft" size="xs" full style={{marginTop:10}} onClick={()=>setRemoving(d)}>Remove department</Btn>}
        </Card>;})}
      {depts.length===0&&<div style={{gridColumn:"1/-1"}}><Empty icon="building" title="No departments yet" body={isPriv?"Create the first department to organize your team.":"Ask HR to set up departments."}/></div>}
    </div>

    {showAdd&&<Modal onClose={()=>setShowAdd(false)} title="New department">
      <div className="flex flex-col gap-3">
        <Field label="Name" required><Input value={nd.name} onChange={e=>setNd({...nd,name:e.target.value})} placeholder="e.g. Engineering"/></Field>
        <Field label="Department lead"><Sel value={nd.lead} onChange={e=>setNd({...nd,lead:e.target.value})}>
          <option value="">— None —</option>
          {all.map(e=><option key={e.id} value={e.id}>{e.name} ({e.title})</option>)}
        </Sel></Field>
        <Field label="Color">
          <div className="flex gap-2 flex-wrap">
            {colors.map(c=><button key={c} onClick={()=>setNd({...nd,color:c})} className="w-8 h-8 rounded-lg cursor-pointer p-0" style={{background:c,border:nd.color===c?`3px solid ${C.text}`:"3px solid transparent"}}/>)}
          </div>
        </Field>
        <Field label="Description"><Input value={nd.about} onChange={e=>setNd({...nd,about:e.target.value})} placeholder="What this department does"/></Field>
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>setShowAdd(false)}>Cancel</Btn>
          <Btn kind="primary" onClick={create} disabled={!nd.name.trim()}>Create department</Btn>
        </div>
      </div>
    </Modal>}

    {editing&&<Modal onClose={()=>setEditing(null)} title={`Edit ${editing.name}`}>
      <div className="flex flex-col gap-3">
        <Field label="Name" required><Input value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})}/></Field>
        <Field label="Department lead"><Sel value={editing.lead||""} onChange={e=>setEditing({...editing,lead:e.target.value||null})}>
          <option value="">— None —</option>
          {all.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
        </Sel></Field>
        <Field label="Color">
          <div className="flex gap-2 flex-wrap">
            {colors.map(c=><button key={c} onClick={()=>setEditing({...editing,color:c})} className="w-8 h-8 rounded-lg cursor-pointer p-0" style={{background:c,border:editing.color===c?`3px solid ${C.text}`:"3px solid transparent"}}/>)}
          </div>
        </Field>
        <Field label="Description"><Input value={editing.about||""} onChange={e=>setEditing({...editing,about:e.target.value})}/></Field>
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>setEditing(null)}>Cancel</Btn>
          <Btn kind="primary" onClick={save}>Save changes</Btn>
        </div>
      </div>
    </Modal>}

    <ConfirmDialog open={!!removing} onClose={()=>setRemoving(null)} confirmLabel="Remove department"
      title={`Remove "${removing?.name}"?`} onConfirm={()=>doRemove(removing)}>
      {removing&&(all.filter(e=>e.dept===removing.id).length>0
        ?`${all.filter(e=>e.dept===removing.id).length} employees are currently in this department — move them first, or removal will be rejected.`
        :"This department has no members. This can't be undone.")}
    </ConfirmDialog>
  </div>;
}

/* All transitive reports of `id` — used to stop the "Reports to" picker from letting
   someone assign their own subordinate as their manager, which would create a cycle. */
function descendantIds(id,all,seen=new Set()){
  for(const e of all){
    if(e.manager===id&&!seen.has(e.id)){seen.add(e.id);descendantIds(e.id,all,seen);}
  }
  return seen;
}

const MAX_DOC_BYTES=3*1024*1024;
function _EmployeeDocuments({empId}){
  const A=use();
  const [docs,setDocs]=useState(null); const [err,setErr]=useState("");
  const refresh=()=>A.loadEmployeeDocuments(empId).then(setDocs);
  useEffect(()=>{refresh();},[empId]);
  const handleFile=file=>{
    if(!file)return;
    if(file.size>MAX_DOC_BYTES){setErr("File is too large — please use one under 3 MB.");return;}
    setErr("");
    const reader=new FileReader();
    reader.onload=async()=>{
      const r=await A.uploadEmployeeDocument(empId,file.name,String(reader.result||""));
      if(r.ok)refresh(); else setErr(r.msg);
    };
    reader.readAsDataURL(file);
  };
  return <div>
    <div className="flex justify-between items-center mb-2">
      <Lbl>Documents</Lbl>
      <label className="text-xs font-semibold text-brand cursor-pointer">
        + Upload<input type="file" hidden onChange={e=>handleFile(e.target.files?.[0])}/></label>
    </div>
    {err&&<div className="text-xs text-red mb-2">{err}</div>}
    {!docs?.length?<div className="text-xs text-text-3">No documents on file.</div>
      :<div className="flex flex-col gap-1.5">
        {docs.map(d=><div key={d.id} className="flex justify-between items-center py-2 px-3 bg-bg rounded-lg">
          <button type="button" onClick={()=>A.downloadEmployeeDocument(d.id)} className="bg-transparent border-0 p-0 text-xs font-semibold text-text cursor-pointer text-left flex-1">{d.name}</button>
          <span className="text-xs text-text-3 mr-2">{(d.size/1024/1024*0.75).toFixed(1)} MB</span>
          <Btn kind="ghost" size="xs" icon="trash" onClick={async()=>{await A.deleteEmployeeDocument(d.id);refresh();}}/>
        </div>)}
      </div>}
  </div>;
}

/* ─── Manage: add/edit/offboard employees ─── */
function HrPeople_Manage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [showAdd,setShowAdd]=useState(false);
  const [editing,setEditing]=useState(null);
  const [offboarding,setOffboarding]=useState(null);
  const [erasing,setErasing]=useState(null);
  const OFFBOARD_ITEMS=[["equipment","Equipment returned (laptop, badge, tools, PPE)"],["access","System and building access revoked"],["finalPay","Final pay and any outstanding expenses processed"],["exitInterview","Exit interview completed"]];
  const [offboardChecked,setOffboardChecked]=useState({});
  const startOffboarding=e=>{setOffboarding(e);setOffboardChecked({});};
  const [ne,setNe]=useState({name:"",email:"",role:"employee",dept:"d1",title:"",city:"",prov:"AB",phone:"",salary:60000,manager:"",payType:"salary",hourlyRate:25});
  const emp=A.hrCurrentEmp(); const company=A.hrCurrentCompany();
  if(!emp||!company)return null;
  const depts=A.hrDeptsAtCompany?.(company.id)||A.HR_DEPARTMENTS;
  const all=A.hrEmpsAtCompany(company.id);
  const active=all.filter(e=>e.status==="active");
  const pg=usePagination(all,25);
  const submit=()=>{if(!ne.name.trim()||!ne.email.trim())return;
    if(ne.payType==="hourly"){if(!(Number(ne.hourlyRate)>0)){A.toast("Enter an hourly rate greater than $0.","danger");return;}}
    else if(!(Number(ne.salary)>0)){A.toast("Enter a salary greater than $0.","danger");return;}
    A.addEmployee({...ne,companyId:company.id});
    setNe({name:"",email:"",role:"employee",dept:defaultDept,title:"",city:"",prov:"AB",phone:"",salary:60000,manager:"",payType:"salary",hourlyRate:25});
    setShowAdd(false);};
  const saveEdit=()=>{if(!editing)return;
    /* A plain role dropdown with no confirmation could silently demote a company's last Owner —
       block that specific case rather than add friction to every routine role change. */
    const wasOwner=all.find(e=>e.id===editing.id)?.role==="owner";
    const ownerCount=all.filter(e=>e.role==="owner").length;
    if(wasOwner&&editing.role!=="owner"&&ownerCount<=1){
      A.toast("This is the last Owner on the account — assign another Owner first.","danger");
      return;
    }
    if(editing.payType==="hourly"){if(!(Number(editing.hourlyRate)>0)){A.toast("Enter an hourly rate greater than $0.","danger");return;}}
    else if(!(Number(editing.salary)>0)){A.toast("Enter a salary greater than $0.","danger");return;}
    A.updateEmp(editing.id,{name:editing.name,title:editing.title,role:editing.role,dept:editing.dept,manager:editing.manager||null,phone:editing.phone,salary:editing.salary,certifications:editing.certifications||[],
      td1OnFile:editing.td1OnFile,benefitsPerPay:Number(editing.benefitsPerPay)||0,benefitsPlan:editing.benefitsPlan||null,
      payType:editing.payType||"salary",hourlyRate:editing.payType==="hourly"?Number(editing.hourlyRate)||0:editing.hourlyRate});
    setEditing(null);};
  const addCert=()=>setEditing(p=>({...p,certifications:[...(p.certifications||[]),{name:"",issued:"",expires:""}]}));
  const updateCert=(i,patch)=>setEditing(p=>({...p,certifications:p.certifications.map((c,j)=>j===i?{...c,...patch}:c)}));
  const removeCert=i=>setEditing(p=>({...p,certifications:p.certifications.filter((_,j)=>j!==i)}));

  return <div>
    <div className="flex justify-between items-center mb-4 flex-wrap gap-2.5">
      <div>
        <div className="text-base font-semibold text-text">{active.length} active employees</div>
        <div className="text-xs text-text-3 mt-0.5">Add hires, change roles, set reporting lines, offboard.</div>
      </div>
      <Btn kind="primary" size="sm" icon="plus" onClick={()=>setShowAdd(true)}>Add employee</Btn>
    </div>

    <Card pad={0} style={{borderRadius:14,overflow:"hidden"}}>
      <div className="overflow-x-auto"><table className="w-full border-collapse" style={{minWidth:820}}>
        <thead><tr className="border-b-2 border-line text-left">
          {["Name","Title","Department","Role","Reports to","Status","Actions"].map(h=>
            <th key={h} className={TH_CLASS}>{h}</th>)}
        </tr></thead>
        <tbody>{pg.pageItems.map(e=>{const d=depts.find(x=>x.id===e.dept); const mgr=A.hrEmp(e.manager);
          return <tr key={e.id} className="border-b border-line-soft">
            <td className={TD_CLASS}><div className="flex gap-2.5 items-center">
              <SmartPortrait seed={e.seed} size={30} radius={8}/>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-text">{e.name}</div>
                <div className="text-xs text-text-3 mt-px">{e.email}</div>
              </div>
            </div></td>
            <td className={`${TD_CLASS} text-sm text-text-2`}>{e.title}</td>
            <td className={TD_CLASS}>{d?<Tag sm style={{background:d.color+"22",color:d.color,border:"1px solid "+d.color+"55"}}>{d.name}</Tag>:<span className="text-xs text-text-3">—</span>}</td>
            <td className={`${TD_CLASS} text-xs text-text-2`}>{A.HR_ROLES.find(r=>r.k===e.role)?.label||e.role}</td>
            <td className={`${TD_CLASS} text-xs text-text-2`}>{mgr?.name||<span className="text-text-3">—</span>}</td>
            <td className={TD_CLASS}><Tag tone={e.status==="active"?"ok":"neutral"} sm>{e.status}</Tag>{e.erased&&<Tag tone="neutral" sm style={{marginLeft:6}}>Erased</Tag>}</td>
            <td className={TD_CLASS}><div className="flex gap-1">
              {!e.erased&&<Btn kind="ghost" size="xs" icon="edit" onClick={()=>setEditing({...e})}>Edit</Btn>}
              {e.status==="active"&&e.id!==emp.id&&<Btn kind="dangerSoft" size="xs" onClick={()=>startOffboarding(e)}>Offboard</Btn>}
              {e.status==="terminated"&&!e.erased&&<Btn kind="dangerSoft" size="xs" icon="trash" onClick={()=>setErasing(e)}>Erase data</Btn>}
            </div></td>
          </tr>;})}</tbody>
      </table></div>
    </Card>
    <Pagination {...pg}/>

    {showAdd&&<Modal onClose={()=>setShowAdd(false)} title="Add employee" wide>
      <div className="flex flex-col gap-3.5">
        <div className={`grid gap-3 ${mob?"grid-cols-1":"grid-cols-2"}`}>
          <Field label="Full name" required><Input value={ne.name} onChange={e=>setNe({...ne,name:e.target.value})}/></Field>
          <Field label="Email" required><Input icon="mail" value={ne.email} onChange={e=>setNe({...ne,email:e.target.value})}/></Field>
          <Field label="Job title"><Input value={ne.title} onChange={e=>setNe({...ne,title:e.target.value})}/></Field>
          <Field label="Phone"><Input icon="phone" value={ne.phone} onChange={e=>setNe({...ne,phone:e.target.value})}/></Field>
          <Field label="Access role" hint="Controls what they can see in HR Suite">
            <Sel value={ne.role} onChange={e=>setNe({...ne,role:e.target.value})}>
              {A.HR_ROLES.map(r=><option key={r.k} value={r.k}>{r.label} — {r.desc}</option>)}</Sel>
          </Field>
          <Field label="Department"><Sel value={ne.dept} onChange={e=>setNe({...ne,dept:e.target.value})}>
            {depts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</Sel></Field>
          <Field label="Reports to"><Sel value={ne.manager} onChange={e=>setNe({...ne,manager:e.target.value})}>
            <option value="">— No manager (top level) —</option>
            {active.map(e=><option key={e.id} value={e.id}>{e.name} ({e.title})</option>)}
          </Sel></Field>
          <Field label="City"><Input icon="pin" value={ne.city} onChange={e=>setNe({...ne,city:e.target.value})}/></Field>
          <Field label="Pay type"><Sel value={ne.payType} onChange={e=>setNe({...ne,payType:e.target.value})}>
            <option value="salary">Salary</option><option value="hourly">Hourly</option>
          </Sel></Field>
          {ne.payType==="hourly"
            ?<Field label="Hourly rate (CAD)"><Input type="number" min="0" value={ne.hourlyRate} onChange={e=>setNe({...ne,hourlyRate:Number(e.target.value)||0})}/></Field>
            :<Field label="Annual salary (CAD)"><Input type="number" value={ne.salary} onChange={e=>setNe({...ne,salary:Number(e.target.value)||0})}/></Field>}
        </div>
        <Banner tone="brand" icon="mail" title="How they'll get access">The new employee will receive an email with sign-in instructions for HR Suite. Their access level is set by the role you assigned above.</Banner>
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>setShowAdd(false)}>Cancel</Btn>
          <Btn kind="primary" icon="check" onClick={submit} disabled={!ne.name.trim()||!ne.email.trim()}>Add employee</Btn>
        </div>
      </div>
    </Modal>}

    {editing&&<Modal onClose={()=>setEditing(null)} title={`Edit ${editing.name}`} wide>
      <div className="flex flex-col gap-3.5">
        <div className={`grid gap-3 ${mob?"grid-cols-1":"grid-cols-2"}`}>
          <Field label="Full name"><Input value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})}/></Field>
          <Field label="Job title"><Input value={editing.title||""} onChange={e=>setEditing({...editing,title:e.target.value})}/></Field>
          <Field label="Access role">
            <Sel value={editing.role} onChange={e=>setEditing({...editing,role:e.target.value})}>
              {A.HR_ROLES.map(r=><option key={r.k} value={r.k}>{r.label}</option>)}</Sel>
          </Field>
          <Field label="Department"><Sel value={editing.dept} onChange={e=>setEditing({...editing,dept:e.target.value})}>
            {depts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</Sel></Field>
          <Field label="Reports to"><Sel value={editing.manager||""} onChange={e=>setEditing({...editing,manager:e.target.value||null})}>
            <option value="">— No manager —</option>
            {active.filter(e=>e.id!==editing.id&&!descendantIds(editing.id,all).has(e.id)).map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
          </Sel></Field>
          <Field label="Phone"><Input value={editing.phone||""} onChange={e=>setEditing({...editing,phone:e.target.value})}/></Field>
          <Field label="Annual salary (CAD)"><Input type="number" value={editing.salary||0} onChange={e=>setEditing({...editing,salary:Number(e.target.value)||0})}/></Field>
        </div>
        <div>
          <Lbl>Payroll</Lbl>
          <div className={`grid gap-3 mb-3 ${mob?"grid-cols-1":"grid-cols-2"}`}>
            <Field label="Pay type" hint="Hourly pay is computed from clocked attendance each run, including overtime, stat-holiday, and night-shift-differential pay.">
              <Sel value={editing.payType||"salary"} onChange={e=>setEditing({...editing,payType:e.target.value})}>
                <option value="salary">Salary</option><option value="hourly">Hourly</option>
              </Sel>
            </Field>
            {editing.payType==="hourly"&&<Field label="Hourly rate (CAD)"><Input type="number" min="0" value={editing.hourlyRate||0} onChange={e=>setEditing({...editing,hourlyRate:Number(e.target.value)||0})}/></Field>}
          </div>
          <div className={`grid gap-3 ${mob?"grid-cols-1":"grid-cols-3"}`}>
            <Field label="TD1 on file" hint="No TD1 means no basic personal tax credit — higher withholding, same as CRA's real rule.">
              <Switch on={!!editing.td1OnFile} onChange={v=>setEditing({...editing,td1OnFile:v})}/>
            </Field>
            <Field label="Benefits plan">
              <Sel value={editing.benefitsPlan||""} onChange={e=>setEditing({...editing,benefitsPlan:e.target.value||null,benefitsPerPay:e.target.value?editing.benefitsPerPay||42:0})}>
                <option value="">Not enrolled</option>
                <option value="Health + Dental">Health + Dental</option>
                <option value="Health + Dental + RRSP 3% match">Health + Dental + RRSP 3% match</option>
                <option value="RRSP 3% match">RRSP 3% match</option>
              </Sel>
            </Field>
            <Field label="Benefits deduction/pay" hint="Deducted from net pay each run.">
              <Input type="number" min="0" disabled={!editing.benefitsPlan} value={editing.benefitsPerPay||0} onChange={e=>setEditing({...editing,benefitsPerPay:Number(e.target.value)||0})}/>
            </Field>
          </div>
        </div>
        <div>
          <div className="flex justify-between items-center mb-2">
            <Lbl>Certifications</Lbl>
            <Btn kind="ghost" size="xs" icon="plus" onClick={addCert}>Add</Btn>
          </div>
          {(editing.certifications||[]).length===0
            ? <div className="text-xs text-text-3">No certifications on file.</div>
            : <div className="flex flex-col gap-2">
                {editing.certifications.map((c,i)=>{const expired=c.expires&&new Date(c.expires)<new Date();
                  const soon=c.expires&&!expired&&(new Date(c.expires)-Date.now())<30*864e5;
                  return <div key={i} className={`grid gap-2 items-center ${mob?"grid-cols-1":""}`} style={{gridTemplateColumns:mob?undefined:"1.3fr 1fr 1fr auto"}}>
                    <Input value={c.name} onChange={e=>updateCert(i,{name:e.target.value})} placeholder="e.g. Red Seal, WHMIS"/>
                    <Input type="date" value={c.issued||""} onChange={e=>updateCert(i,{issued:e.target.value})}/>
                    <Input type="date" value={c.expires||""} invalid={expired} onChange={e=>updateCert(i,{expires:e.target.value})}/>
                    <div className="flex gap-1.5 items-center">
                      {expired&&<Tag tone="danger" sm>Expired</Tag>}
                      {soon&&<Tag tone="warn" sm>Expiring soon</Tag>}
                      <Btn kind="ghost" size="xs" icon="trash" onClick={()=>removeCert(i)}/></div></div>;})}
              </div>}
        </div>
        <_EmployeeDocuments empId={editing.id}/>
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>setEditing(null)}>Cancel</Btn>
          <Btn kind="primary" onClick={saveEdit}>Save changes</Btn>
        </div>
      </div>
    </Modal>}

    <ConfirmDialog open={!!erasing}
      title={erasing?`Erase ${erasing.name}'s personal data?`:""}
      confirmLabel="Erase data" kind="danger"
      onConfirm={()=>{const target=erasing; A.eraseHrEmployee(target.id).then(r=>{if(r.ok)A.toast("Employee data erased","ok"); else A.toast(r.msg,"danger");});}}
      onClose={()=>setErasing(null)}>
      This scrubs their name, contact details, birth date, skills, badges, certifications, visibility settings, and stored documents — permanently. Payroll and expense history is kept, same as this company's tax/accounting retention requirements. This can't be undone.
    </ConfirmDialog>

    {offboarding&&<Modal onClose={()=>setOffboarding(null)} title={`Offboard ${offboarding.name}`}>
      <div className="flex flex-col gap-3.5">
        <p className="text-sm text-text-2 leading-snug m-0">Confirm each step before finalizing — their direct reports will be reassigned up to their own manager once complete. This can't be undone from here.</p>
        <div className="flex flex-col gap-2">
          {OFFBOARD_ITEMS.map(([key,label])=>{const on=!!offboardChecked[key];
            return <button key={key} type="button" onClick={()=>setOffboardChecked(p=>({...p,[key]:!p[key]}))}
              className={`flex items-center gap-3 py-3 px-3.5 rounded-xl cursor-pointer text-left border-2 transition duration-150 ${on?"border-brand bg-tint":"border-line bg-white"}`}>
              <span className={`w-5 h-5 rounded-md shrink-0 border-2 flex items-center justify-center ${on?"border-brand bg-brand":"border-line"}`}>{on&&<I n="check" s={12} c="#fff" w={3}/>}</span>
              <span className={`text-sm ${on?"font-semibold text-brand":"font-medium text-text"}`}>{label}</span></button>;})}
        </div>
        <div className="flex gap-2.5 justify-end pt-1">
          <Btn kind="ghost" onClick={()=>setOffboarding(null)}>Cancel</Btn>
          <Btn kind="dangerSoft" disabled={!OFFBOARD_ITEMS.every(([key])=>offboardChecked[key])}
            onClick={()=>{A.removeEmployee(offboarding.id);setOffboarding(null);}}>Complete offboarding</Btn>
        </div>
      </div>
    </Modal>}
  </div>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXPENSES — reimbursement claims
   ═══════════════════════════════════════════════════════════════════════════ */

/* glCode is a plain label, not a real accounting-system integration (no accounting backend
   exists to integrate with) - it just makes each category export-ready for a bookkeeper to
   map into their own chart of accounts, instead of leaving that mapping entirely manual. */
const EXPENSE_CATEGORIES=[
  {k:"Travel",icon:"globe",about:"Flights, trains, taxis, rideshare, hotel",glCode:"6100"},
  {k:"Meals",icon:"cap",about:"Client meals, per diem, working lunches",glCode:"6110"},
  {k:"Mileage",icon:"activity",about:"Personal vehicle km at CRA rate",glCode:"6120"},
  {k:"Training",icon:"cap",about:"Courses, certifications, conferences",glCode:"6200"},
  {k:"Tools & Equipment",icon:"gear",about:"Trade tools, uniforms, PPE",glCode:"6300"},
  {k:"Software",icon:"hex",about:"Licenses, subscriptions, plugins",glCode:"6310"},
  {k:"Home Office",icon:"building",about:"Furniture, monitor, internet share",glCode:"6400"},
  {k:"Other",icon:"file",about:"Anything else — describe in notes",glCode:"6900"},
];
const glCodeFor=cat=>EXPENSE_CATEGORIES.find(c=>c.k===cat)?.glCode||"—";

export function HrExpensesPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const emp0=A.hrCurrentEmp();
  const isApprover0=emp0&&["hr","admin","owner","finance"].includes(emp0.role);
  const [tab,setTab]=useState(isApprover0?"queue":"mine");
  const [showSubmit,setShowSubmit]=useState(false);
  const [detail,setDetail]=useState(null);
  const emp=A.hrCurrentEmp(); const company=A.hrCurrentCompany();
  if(!emp||!company)return null;
  const isPriv=["hr","admin","owner","finance"].includes(emp.role);
  /* A plain-"employee"-role manager reviews just their own direct reports' claims - the real
     reporting chain (hr_employees.manager), previously ignored entirely in favour of a flat
     hr/admin/owner/finance role check. */
  const myReports=A.hrEmployees.filter(e=>e.manager===emp.id);
  const isApprover=isPriv||myReports.length>0;

  const myExp=A.empExpenses(emp.id);
  const allExp=isPriv?A.companyExpenses(company.id):isApprover?A.companyExpenses(company.id).filter(x=>myReports.some(r=>r.id===x.employee)):[];
  const queued=allExp.filter(x=>x.status==="submitted");
  const approved=allExp.filter(x=>x.status==="approved");

  const tabs=[{k:"mine",label:"My expenses",icon:"user",count:myExp.length}];
  if(isApprover){
    tabs.push({k:"queue",label:"Awaiting review",icon:"clock",count:queued.length});
    tabs.push({k:"approved",label:"Ready to pay",icon:"check",count:approved.length});
    tabs.push({k:"all",label:"All",icon:"file",count:allExp.length});
  }

  const list=tab==="mine"?myExp:tab==="queue"?queued:tab==="approved"?approved:allExp;
  const totalPending=allExp.filter(x=>x.status==="submitted"||x.status==="approved").reduce((s,x)=>s+x.amount,0);
  const pg=usePagination(list,20);
  useEffect(()=>{pg.setPage(1);},[tab]);

  return <div>
    <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
      <div>
        <div className="text-xl font-bold text-text tracking-tight">Expense claims</div>
        <div className="text-sm text-text-3 mt-0.5">Submit receipts, get reimbursed on next payroll.</div>
      </div>
      <div className="flex gap-2.5">
        {isApprover&&allExp.length>0&&<Btn kind="outline" size="sm" icon="download" onClick={()=>{
          const rows=[["Date","Employee","Category","GL code","Merchant","Amount","Status"],
            ...allExp.map(x=>[x.date,A.hrEmp(x.employee)?.name||"",x.category,glCodeFor(x.category),x.merchant,x.amount.toFixed(2),x.status])];
          const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
          const blob=new Blob([csv],{type:"text/csv"}); const url=URL.createObjectURL(blob);
          const a=document.createElement("a"); a.href=url; a.download="expenses.csv"; a.click(); URL.revokeObjectURL(url);
        }}>Export CSV</Btn>}
        <Btn kind="primary" size="sm" icon="plus" onClick={()=>setShowSubmit(true)}>Submit expense</Btn>
      </div>
    </div>

    {isApprover&&allExp.length>0&&<div className={`grid gap-3 mb-5 ${mob?"grid-cols-2":"grid-cols-4"}`}>
      <Stat icon="clock" label="Awaiting review" value={queued.length} tone={queued.length>0?C.warn:C.ok}/>
      <Stat icon="check" label="Ready to pay" value={approved.length} tone={C.brand}/>
      <Stat icon="wallet" label="Total owed" value={`$${totalPending.toFixed(0)}`}/>
      <Stat icon="trend" label="This month" value={allExp.filter(x=>Date.now()-x.submitted<30*864e5).length}/>
    </div>}

    <_UnderlineTabs items={tabs} value={tab} onChange={setTab}/>

    <Card pad={0} style={{borderRadius:14,overflow:"hidden"}}>
      <div className="overflow-x-auto"><table className="w-full border-collapse" style={{minWidth:720}}>
        <thead><tr className="border-b-2 border-line text-left">
          {(tab==="mine"?["Date","Category","Merchant","Amount","Status",""]:["Date","Employee","Category","Merchant","Amount","Status","Actions"]).map(h=>
            <th key={h} className={TH_CLASS}>{h}</th>)}
        </tr></thead>
        <tbody>{pg.pageItems.map(x=>{const e=A.hrEmp(x.employee);
          return <tr key={x.id} className="border-b border-line-soft cursor-pointer" onClick={()=>setDetail(x)}>
            <td className={`${TD_CLASS} text-xs text-text-2 font-mono`}>{x.date}</td>
            {tab!=="mine"&&<td className={TD_CLASS}><div className="flex gap-2 items-center">
              <SmartPortrait seed={e?.seed||0} size={24} radius={6}/>
              <span className="text-xs text-text font-semibold">{e?.name||"—"}</span>
            </div></td>}
            <td className={`${TD_CLASS} text-xs text-text-2`}>{x.category}</td>
            <td className={`${TD_CLASS} text-sm text-text`}>{x.merchant}</td>
            <td className={`${TD_CLASS} text-sm font-bold text-text`}>${x.amount.toFixed(2)}</td>
            <td className={TD_CLASS}><Tag tone={x.status==="paid"?"brand":x.status==="approved"?"ok":x.status==="rejected"?"danger":"warn"} sm>{x.status}</Tag></td>
            <td className={TD_CLASS} onClick={e=>e.stopPropagation()}>
              {isApprover&&tab==="queue"&&<div className="flex gap-1">
                <Btn kind="dangerSoft" size="xs" onClick={()=>setDetail(x)}>Reject</Btn>
                <Btn kind="primary" size="xs" onClick={()=>A.decideExpense(x.id,"approved",emp.id)}>Approve</Btn>
              </div>}
              {isPriv&&tab==="approved"&&<Btn kind="primary" size="xs" onClick={()=>A.payExpense(x.id)}>Mark paid</Btn>}
            </td>
          </tr>;})}
          {list.length===0&&<tr><td colSpan={tab==="mine"?6:7} className="p-5"><Empty icon="wallet" title="No expenses in this view" body="Submitted expense claims will show up here."/></td></tr>}
        </tbody>
      </table></div>
    </Card>
    <Pagination {...pg}/>

    {showSubmit&&<ExpenseSubmitModal onClose={()=>setShowSubmit(false)} onSubmit={(data)=>{A.submitExpense({...data,employee:emp.id}); setShowSubmit(false);}}/>}
    {detail&&<ExpenseDetailModal expense={detail} onClose={()=>setDetail(null)} isApprover={isApprover} isPriv={isPriv} currentEmpId={emp.id}/>}
  </div>;
}

function ExpenseSubmitModal({onClose,onSubmit}){
  const mob=useMedia("(max-width: 900px)");
  const [cat,setCat]=useState("Travel"); const [merchant,setMerchant]=useState(""); const [amount,setAmount]=useState("");
  const [description,setDescription]=useState(""); const [date,setDate]=useState(_fmtDate(new Date()));
  const canSubmit=merchant.trim()&&Number(amount)>0&&date;
  return <Modal onClose={onClose} title="Submit an expense" wide>
    <div className="flex flex-col gap-3.5">
      <Field label="Category" required>
        <div className={`grid gap-2 ${mob?"grid-cols-2":"grid-cols-4"}`}>
          {EXPENSE_CATEGORIES.map(c=><button key={c.k} onClick={()=>setCat(c.k)} type="button"
            className={`rounded-xl py-2.5 px-3 cursor-pointer text-xs text-left flex gap-2 items-center border-2 ${cat===c.k?"bg-tint border-brand font-bold text-brand":"bg-white border-line font-medium text-text-2"}`}>
            <I n={c.icon} s={15}/>{c.k}
          </button>)}
        </div>
      </Field>
      <div className={`grid gap-3 ${mob?"grid-cols-1":"grid-cols-2"}`}>
        <Field label="Merchant" required><Input value={merchant} onChange={e=>setMerchant(e.target.value)} placeholder={cat==="Mileage"?"Personal vehicle":"Company or store name"}/></Field>
        <Field label="Amount (CAD)" required><Input type="number" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00"/></Field>
        <Field label="Date" required><Input type="date" value={date} onChange={e=>setDate(e.target.value)}/></Field>
      </div>
      <Field label="Description" required hint="Business purpose. Required for CRA compliance."><Input value={description} onChange={e=>setDescription(e.target.value)} placeholder="What was this for?"/></Field>
      <Banner tone="neutral" icon="file" title="Receipt">In production, you'd upload a photo or PDF of the receipt here. For this prototype, receipts are simulated.</Banner>
      <div className="flex gap-2.5 justify-end">
        <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
        <Btn kind="primary" icon="check" onClick={()=>onSubmit({category:cat,merchant:merchant.trim(),amount:Number(amount),description:description.trim(),date})} disabled={!canSubmit}>Submit for review</Btn>
      </div>
    </div>
  </Modal>;
}

function ExpenseDetailModal({expense:x,onClose,isApprover,isPriv,currentEmpId}){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const e=A.hrEmp(x.employee); const approver=x.approvedBy?A.hrEmp(x.approvedBy):null;
  const [rejecting,setRejecting]=useState(false); const [reason,setReason]=useState("");
  return <Modal onClose={onClose} title={`${x.category} · $${x.amount.toFixed(2)}`} wide>
    <div className="flex flex-col gap-3.5">
      <div className="p-3.5 bg-bg rounded-xl flex justify-between items-center gap-2.5">
        <div className="flex gap-2.5 items-center">
          <SmartPortrait seed={e?.seed||0} size={36} radius={9}/>
          <div>
            <div className="text-sm font-semibold text-text">{e?.name}</div>
            <div className="text-xs text-text-3">{e?.title}</div>
          </div>
        </div>
        <Tag tone={x.status==="paid"?"brand":x.status==="approved"?"ok":x.status==="rejected"?"danger":"warn"}>{x.status}</Tag>
      </div>

      <div className={`grid gap-3 text-sm ${mob?"grid-cols-1":"grid-cols-2"}`}>
        {[["Category",x.category],["GL code",glCodeFor(x.category)],["Merchant",x.merchant],["Date",x.date],["Amount",`$${x.amount.toFixed(2)} ${x.currency}`],["Reimburse via",x.reimburseVia==="next-payroll"?"Next payroll":x.reimburseVia],["Submitted",new Date(x.submitted).toLocaleDateString("en-CA")]].map(([l,v])=>
          <div key={l}><div className="text-xs text-text-3 font-semibold uppercase tracking-wide mb-1">{l}</div><div className="text-text font-medium">{v}</div></div>)}
      </div>

      {x.description&&<div>
        <div className="text-xs text-text-3 font-semibold uppercase tracking-wide mb-1.5">Business purpose</div>
        <div className="text-sm text-text-2 leading-snug p-3 bg-bg rounded-xl">{x.description}</div>
      </div>}

      {x.receiptUrl&&<div className="p-3.5 bg-bg rounded-xl flex gap-2.5 items-center">
        <I n="file" s={20} c={C.brand}/>
        <div className="flex-1">
          <div className="text-sm font-semibold text-text">Receipt attached</div>
          <div className="text-xs text-text-3 mt-px">{x.receiptUrl}</div>
        </div>
        <Btn kind="ghost" size="xs">View</Btn>
      </div>}

      {approver&&<div className="text-xs text-text-3 py-2.5 px-3 bg-bg rounded-xl">
        {x.status==="approved"?"Approved":x.status==="rejected"?"Rejected":x.status==="paid"?"Approved":""} by <strong className="text-text-2">{approver.name}</strong> on {new Date(x.approvedAt).toLocaleDateString("en-CA")}
        {x.rejectReason&&<div className="mt-1.5 text-red italic">Reason: {x.rejectReason}</div>}
        {x.paidAt&&<div className="mt-1.5 text-ok">Paid on {new Date(x.paidAt).toLocaleDateString("en-CA")}</div>}
      </div>}

      {isApprover&&x.status==="submitted"&&!rejecting&&<div className="flex gap-2.5 justify-end pt-3 border-t border-line">
        <Btn kind="dangerSoft" onClick={()=>setRejecting(true)}>Reject</Btn>
        <Btn kind="primary" onClick={()=>{A.decideExpense(x.id,"approved",currentEmpId); onClose();}}>Approve</Btn>
      </div>}
      {isApprover&&x.status==="submitted"&&rejecting&&<div className="flex flex-col gap-2.5 pt-3 border-t border-line">
        <Field label="Reason for rejection" required><Area rows={2} value={reason} onChange={ev=>setReason(ev.target.value)} placeholder="e.g. Missing itemized receipt"/></Field>
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>{setRejecting(false);setReason("");}}>Cancel</Btn>
          <Btn kind="dangerSoft" disabled={!reason.trim()} onClick={()=>{A.decideExpense(x.id,"rejected",currentEmpId,reason.trim()); onClose();}}>Confirm reject</Btn>
        </div>
      </div>}
      {isPriv&&x.status==="approved"&&<div className="flex gap-2.5 justify-end pt-3 border-t border-line">
        <Btn kind="primary" icon="check" onClick={()=>{A.payExpense(x.id); onClose();}}>Mark as paid</Btn>
      </div>}
    </div>
  </Modal>;
}
