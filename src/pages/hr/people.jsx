import { useState } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C, SH } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Btn, Card, Tag, Field, Input, Sel, Banner, Modal, SmartPortrait, Empty, Stat } from "../../design/primitives.jsx";
import { _fmtDate } from "../../helpers/utils.js";
import { HR_ROLES } from "../../store/seed/hrCompanySettings.js";
import { HR_DEPARTMENTS } from "../../store/seed/hrDepartments.js";

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
    <div style={{display:"flex",gap:8,marginBottom:20,overflowX:"auto",borderBottom:`1px solid ${C.line}`,paddingBottom:0}}>
      {visibleTabs.map(t=><button key={t.k} onClick={()=>setTab(t.k)}
        style={{background:"none",border:"none",padding:"10px 14px",cursor:"pointer",fontFamily:"inherit",
          fontSize:13.5,fontWeight:tab===t.k?680:520,color:tab===t.k?C.brand:C.text2,
          borderBottom:tab===t.k?`2px solid ${C.brand}`:"2px solid transparent",
          marginBottom:-1,display:"flex",gap:7,alignItems:"center",flexShrink:0,transition:"color .15s"}}>
        <I n={t.icon} s={15}/>{t.label}</button>)}
    </div>
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
  return <div>
    <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
      <Input icon="search" placeholder="Search by name, title, or email" value={q} onChange={e=>setQ(e.target.value)} style={{flex:"1 1 260px"}}/>
      <Sel value={deptFilter} onChange={e=>setDeptFilter(e.target.value)} style={{minWidth:180}}>
        <option value="all">All departments</option>
        {depts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
      </Sel>
    </div>
    <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
      {filtered.map(e=>{const d=depts.find(x=>x.id===e.dept);
        const mgr=A.hrEmp(e.manager);
        return <Card key={e.id} pad={16} style={{borderRadius:12,cursor:"pointer",transition:"all .15s"}}
          onMouseEnter={ev=>{ev.currentTarget.style.borderColor=C.brand;ev.currentTarget.style.boxShadow=SH.sm;}}
          onMouseLeave={ev=>{ev.currentTarget.style.borderColor=C.line;ev.currentTarget.style.boxShadow="none";}}>
          <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:10}}>
            <SmartPortrait seed={e.seed} size={44} radius={11}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14.5,fontWeight:660,color:C.text,letterSpacing:"-.015em",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.name}</div>
              <div style={{fontSize:12.5,color:C.text3,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.title}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
            {d&&<Tag sm style={{background:d.color+"22",color:d.color,border:"1px solid "+d.color+"55"}}>{d.name}</Tag>}
            <Tag sm tone="neutral">{A.HR_ROLES.find(r=>r.k===e.role)?.label||e.role}</Tag>
          </div>
          <div style={{fontSize:11.5,color:C.text3,lineHeight:1.5}}>
            <div>📧 {e.email}</div>
            {e.phone&&<div>📞 {e.phone}</div>}
            {mgr&&<div style={{marginTop:4}}>Reports to <span style={{color:C.text2,fontWeight:600}}>{mgr.name}</span></div>}
          </div>
        </Card>;})}
      {filtered.length===0&&<div style={{gridColumn:"1/-1"}}><Empty icon="users" title="No matches" body="Try different search or filter terms."/></div>}
    </div>
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

  const Node=({e,depth=0})=>{
    const kids=children[e.id]||[];
    const d=depts.find(x=>x.id===e.dept);
    const [open,setOpen]=useState(depth<2);
    return <div style={{marginLeft:depth===0?0:mob?14:24,marginTop:depth===0?0:8,position:"relative"}}>
      {depth>0&&<div style={{position:"absolute",left:-14,top:0,bottom:kids.length&&open?"50%":"50%",width:14,borderLeft:`2px solid ${C.line}`,borderBottom:`2px solid ${C.line}`,borderBottomLeftRadius:4}}/>}
      <div style={{display:"flex",gap:10,alignItems:"center",padding:"10px 12px",background:"#fff",border:`1px solid ${C.line}`,borderRadius:10,transition:"all .15s"}}>
        {kids.length>0&&<button onClick={()=>setOpen(!open)} style={{background:"none",border:"none",padding:2,cursor:"pointer",color:C.text3,display:"flex"}}>
          <I n={open?"chevD":"chevR"} s={14}/>
        </button>}
        {kids.length===0&&<div style={{width:18,height:18}}/>}
        <SmartPortrait seed={e.seed} size={32} radius={8}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13.5,fontWeight:640,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.name}</div>
          <div style={{fontSize:11.5,color:C.text3,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.title}</div>
        </div>
        {d&&<Tag sm style={{background:d.color+"22",color:d.color,border:"1px solid "+d.color+"55",flexShrink:0}}>{d.name}</Tag>}
        {kids.length>0&&<span style={{fontSize:11,fontWeight:640,color:C.text3,marginLeft:4,padding:"2px 8px",background:C.bg,borderRadius:99,flexShrink:0}}>{kids.length}</span>}
      </div>
      {open&&kids.length>0&&<div style={{marginTop:6,paddingLeft:mob?4:14,borderLeft:`2px solid ${C.line}`}}>
        {kids.map(k=><Node key={k.id} e={k} depth={depth+1}/>)}
      </div>}
    </div>;
  };

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
      <div>
        <div style={{fontSize:16,fontWeight:660,color:C.text}}>Reporting structure</div>
        <div style={{fontSize:12.5,color:C.text3,marginTop:2}}>{all.length} people · {roots.length} report{roots.length===1?"s":""} at the top level</div>
      </div>
    </div>
    <Card pad={mob?16:24} style={{borderRadius:14}}>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {roots.map(r=><Node key={r.id} e={r}/>)}
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
  const doRemove=(d)=>{
    if(!confirm(`Remove "${d.name}"? Any employees in it must be moved first.`))return;
    const r=A.removeDepartment(d.id);
    if(!r.ok)alert(r.msg);
  };

  const colors=["#005CCC","#B45309","#0B6B3A","#5B2E8C","#0F5C8C","#D97706","#B91C1C","#0E7C86"];

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
      <div>
        <div style={{fontSize:16,fontWeight:660,color:C.text}}>{depts.length} departments</div>
        <div style={{fontSize:12.5,color:C.text3,marginTop:2}}>Group employees, set department leads, assign reporting.</div>
      </div>
      {isPriv&&<Btn kind="primary" size="sm" icon="plus" onClick={()=>setShowAdd(true)}>New department</Btn>}
    </div>

    <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
      {depts.map(d=>{const count=all.filter(e=>e.dept===d.id).length;
        const lead=d.lead?A.hrEmp(d.lead):null;
        return <Card key={d.id} pad={18} style={{borderRadius:12,borderTop:`4px solid ${d.color}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:10}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:15.5,fontWeight:670,color:C.text,letterSpacing:"-.015em"}}>{d.name}</div>
              <div style={{fontSize:12,color:C.text3,marginTop:2}}>{count} member{count===1?"":"s"}</div>
            </div>
            {isPriv&&<div style={{display:"flex",gap:4}}>
              <Btn kind="ghost" size="xs" icon="edit" onClick={()=>setEditing({...d})}>Edit</Btn>
            </div>}
          </div>
          {d.about&&<div style={{fontSize:13,color:C.text2,lineHeight:1.55,marginBottom:12}}>{d.about}</div>}
          {lead&&<div style={{padding:"10px 12px",background:C.bg,borderRadius:9,display:"flex",gap:10,alignItems:"center"}}>
            <SmartPortrait seed={lead.seed} size={30} radius={7}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:11.5,color:C.text3}}>Department lead</div>
              <div style={{fontSize:13,fontWeight:640,color:C.text,marginTop:1}}>{lead.name}</div>
            </div>
          </div>}
          {isPriv&&count===0&&<Btn kind="dangerSoft" size="xs" full style={{marginTop:10}} onClick={()=>doRemove(d)}>Remove department</Btn>}
        </Card>;})}
      {depts.length===0&&<div style={{gridColumn:"1/-1"}}><Empty icon="building" title="No departments yet" body={isPriv?"Create the first department to organize your team.":"Ask HR to set up departments."}/></div>}
    </div>

    {showAdd&&<Modal onClose={()=>setShowAdd(false)} title="New department">
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <Field label="Name" required><Input value={nd.name} onChange={e=>setNd({...nd,name:e.target.value})} placeholder="e.g. Engineering"/></Field>
        <Field label="Department lead"><Sel value={nd.lead} onChange={e=>setNd({...nd,lead:e.target.value})}>
          <option value="">— None —</option>
          {all.map(e=><option key={e.id} value={e.id}>{e.name} ({e.title})</option>)}
        </Sel></Field>
        <Field label="Color">
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {colors.map(c=><button key={c} onClick={()=>setNd({...nd,color:c})} style={{width:32,height:32,borderRadius:8,background:c,border:nd.color===c?`3px solid ${C.text}`:"3px solid transparent",cursor:"pointer",padding:0}}/>)}
          </div>
        </Field>
        <Field label="Description"><Input value={nd.about} onChange={e=>setNd({...nd,about:e.target.value})} placeholder="What this department does"/></Field>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn kind="ghost" onClick={()=>setShowAdd(false)}>Cancel</Btn>
          <Btn kind="primary" onClick={create} disabled={!nd.name.trim()}>Create department</Btn>
        </div>
      </div>
    </Modal>}

    {editing&&<Modal onClose={()=>setEditing(null)} title={`Edit ${editing.name}`}>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <Field label="Name" required><Input value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})}/></Field>
        <Field label="Department lead"><Sel value={editing.lead||""} onChange={e=>setEditing({...editing,lead:e.target.value||null})}>
          <option value="">— None —</option>
          {all.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
        </Sel></Field>
        <Field label="Color">
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {colors.map(c=><button key={c} onClick={()=>setEditing({...editing,color:c})} style={{width:32,height:32,borderRadius:8,background:c,border:editing.color===c?`3px solid ${C.text}`:"3px solid transparent",cursor:"pointer",padding:0}}/>)}
          </div>
        </Field>
        <Field label="Description"><Input value={editing.about||""} onChange={e=>setEditing({...editing,about:e.target.value})}/></Field>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn kind="ghost" onClick={()=>setEditing(null)}>Cancel</Btn>
          <Btn kind="primary" onClick={save}>Save changes</Btn>
        </div>
      </div>
    </Modal>}
  </div>;
}

/* ─── Manage: add/edit/offboard employees ─── */
function HrPeople_Manage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const [showAdd,setShowAdd]=useState(false);
  const [editing,setEditing]=useState(null);
  const [ne,setNe]=useState({name:"",email:"",role:"employee",dept:"d1",title:"",city:"",prov:"AB",phone:"",salary:60000,manager:""});
  const emp=A.hrCurrentEmp(); const company=A.hrCurrentCompany();
  if(!emp||!company)return null;
  const depts=A.hrDeptsAtCompany?.(company.id)||A.HR_DEPARTMENTS;
  const all=A.hrEmpsAtCompany(company.id);
  const active=all.filter(e=>e.status==="active");
  const submit=()=>{if(!ne.name.trim()||!ne.email.trim())return;
    A.addEmployee({...ne,companyId:company.id});
    setNe({name:"",email:"",role:"employee",dept:defaultDept,title:"",city:"",prov:"AB",phone:"",salary:60000,manager:""});
    setShowAdd(false);};
  const saveEdit=()=>{if(!editing)return;
    A.updateEmp(editing.id,{name:editing.name,title:editing.title,role:editing.role,dept:editing.dept,manager:editing.manager||null,phone:editing.phone,salary:editing.salary});
    setEditing(null);};

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
      <div>
        <div style={{fontSize:16,fontWeight:660,color:C.text}}>{active.length} active employees</div>
        <div style={{fontSize:12.5,color:C.text3,marginTop:2}}>Add hires, change roles, set reporting lines, offboard.</div>
      </div>
      <Btn kind="primary" size="sm" icon="plus" onClick={()=>setShowAdd(true)}>Add employee</Btn>
    </div>

    <Card pad={0} style={{borderRadius:14,overflow:"hidden"}}>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:820}}>
        <thead><tr style={{borderBottom:`2px solid ${C.line}`,textAlign:"left"}}>
          {["Name","Title","Department","Role","Reports to","Status","Actions"].map(h=>
            <th key={h} style={{padding:"12px 14px",fontSize:11.5,fontWeight:700,color:C.text3,letterSpacing:".05em",textTransform:"uppercase"}}>{h}</th>)}
        </tr></thead>
        <tbody>{all.map(e=>{const d=depts.find(x=>x.id===e.dept); const mgr=A.hrEmp(e.manager);
          return <tr key={e.id} style={{borderBottom:`1px solid ${C.lineSoft}`}}>
            <td style={{padding:"11px 14px"}}><div style={{display:"flex",gap:10,alignItems:"center"}}>
              <SmartPortrait seed={e.seed} size={30} radius={8}/>
              <div style={{minWidth:0}}>
                <div style={{fontSize:13.5,fontWeight:640,color:C.text}}>{e.name}</div>
                <div style={{fontSize:11.5,color:C.text3,marginTop:1}}>{e.email}</div>
              </div>
            </div></td>
            <td style={{padding:"11px 14px",fontSize:13,color:C.text2}}>{e.title}</td>
            <td style={{padding:"11px 14px"}}>{d?<Tag sm style={{background:d.color+"22",color:d.color,border:"1px solid "+d.color+"55"}}>{d.name}</Tag>:<span style={{fontSize:12,color:C.text3}}>—</span>}</td>
            <td style={{padding:"11px 14px",fontSize:12.5,color:C.text2}}>{A.HR_ROLES.find(r=>r.k===e.role)?.label||e.role}</td>
            <td style={{padding:"11px 14px",fontSize:12.5,color:C.text2}}>{mgr?.name||<span style={{color:C.text3}}>—</span>}</td>
            <td style={{padding:"11px 14px"}}><Tag tone={e.status==="active"?"ok":"neutral"} sm>{e.status}</Tag></td>
            <td style={{padding:"11px 14px"}}><div style={{display:"flex",gap:4}}>
              <Btn kind="ghost" size="xs" icon="edit" onClick={()=>setEditing({...e})}>Edit</Btn>
              {e.status==="active"&&e.id!==emp.id&&<Btn kind="dangerSoft" size="xs" onClick={()=>{if(confirm(`Offboard ${e.name}?`))A.removeEmployee(e.id);}}>Offboard</Btn>}
            </div></td>
          </tr>;})}</tbody>
      </table></div>
    </Card>

    {showAdd&&<Modal onClose={()=>setShowAdd(false)} title="Add employee" wide>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12}}>
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
          <Field label="Annual salary (CAD)"><Input type="number" value={ne.salary} onChange={e=>setNe({...ne,salary:Number(e.target.value)||0})}/></Field>
        </div>
        <Banner tone="brand" icon="mail" title="How they'll get access">The new employee will receive an email with sign-in instructions for HR Suite. Their access level is set by the role you assigned above.</Banner>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn kind="ghost" onClick={()=>setShowAdd(false)}>Cancel</Btn>
          <Btn kind="primary" icon="check" onClick={submit} disabled={!ne.name.trim()||!ne.email.trim()}>Add employee</Btn>
        </div>
      </div>
    </Modal>}

    {editing&&<Modal onClose={()=>setEditing(null)} title={`Edit ${editing.name}`} wide>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12}}>
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
            {active.filter(e=>e.id!==editing.id).map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
          </Sel></Field>
          <Field label="Phone"><Input value={editing.phone||""} onChange={e=>setEditing({...editing,phone:e.target.value})}/></Field>
          <Field label="Annual salary (CAD)"><Input type="number" value={editing.salary||0} onChange={e=>setEditing({...editing,salary:Number(e.target.value)||0})}/></Field>
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn kind="ghost" onClick={()=>setEditing(null)}>Cancel</Btn>
          <Btn kind="primary" onClick={saveEdit}>Save changes</Btn>
        </div>
      </div>
    </Modal>}
  </div>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXPENSES — reimbursement claims
   ═══════════════════════════════════════════════════════════════════════════ */

const EXPENSE_CATEGORIES=[
  {k:"Travel",icon:"globe",about:"Flights, trains, taxis, rideshare, hotel"},
  {k:"Meals",icon:"cap",about:"Client meals, per diem, working lunches"},
  {k:"Mileage",icon:"activity",about:"Personal vehicle km at CRA rate"},
  {k:"Training",icon:"cap",about:"Courses, certifications, conferences"},
  {k:"Tools & Equipment",icon:"gear",about:"Trade tools, uniforms, PPE"},
  {k:"Software",icon:"hex",about:"Licenses, subscriptions, plugins"},
  {k:"Home Office",icon:"building",about:"Furniture, monitor, internet share"},
  {k:"Other",icon:"file",about:"Anything else — describe in notes"},
];

export function HrExpensesPage(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const emp0=A.hrCurrentEmp();
  const isApprover0=emp0&&["hr","admin","owner","finance"].includes(emp0.role);
  const [tab,setTab]=useState(isApprover0?"queue":"mine");
  const [showSubmit,setShowSubmit]=useState(false);
  const [detail,setDetail]=useState(null);
  const emp=A.hrCurrentEmp(); const company=A.hrCurrentCompany();
  if(!emp||!company)return null;
  const isApprover=["hr","admin","owner","finance"].includes(emp.role);

  const myExp=A.empExpenses(emp.id);
  const allExp=isApprover?A.companyExpenses(company.id):[];
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

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12}}>
      <div>
        <div style={{fontSize:20,fontWeight:730,color:C.text,letterSpacing:"-.02em"}}>Expense claims</div>
        <div style={{fontSize:13,color:C.text3,marginTop:2}}>Submit receipts, get reimbursed on next payroll.</div>
      </div>
      <Btn kind="primary" size="sm" icon="plus" onClick={()=>setShowSubmit(true)}>Submit expense</Btn>
    </div>

    {isApprover&&allExp.length>0&&<div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"repeat(4,1fr)",gap:12,marginBottom:20}}>
      <Stat icon="clock" label="Awaiting review" value={queued.length} tone={queued.length>0?C.warn:C.ok}/>
      <Stat icon="check" label="Ready to pay" value={approved.length} tone={C.brand}/>
      <Stat icon="wallet" label="Total owed" value={`$${totalPending.toFixed(0)}`}/>
      <Stat icon="trend" label="This month" value={allExp.filter(x=>Date.now()-x.submitted<30*864e5).length}/>
    </div>}

    <div style={{display:"flex",gap:4,marginBottom:16,overflowX:"auto",borderBottom:`1px solid ${C.line}`}}>
      {tabs.map(t=><button key={t.k} onClick={()=>setTab(t.k)}
        style={{background:"none",border:"none",padding:"10px 14px",cursor:"pointer",fontFamily:"inherit",
          fontSize:13,fontWeight:tab===t.k?680:520,color:tab===t.k?C.brand:C.text2,
          borderBottom:tab===t.k?`2px solid ${C.brand}`:"2px solid transparent",
          marginBottom:-1,display:"flex",gap:7,alignItems:"center",flexShrink:0,transition:"color .15s"}}>
        <I n={t.icon} s={14}/>{t.label}
        {t.count>0&&<span style={{fontSize:10.5,fontWeight:700,color:tab===t.k?"#fff":C.text3,background:tab===t.k?C.brand:C.bg,padding:"2px 6px",borderRadius:99}}>{t.count}</span>}
      </button>)}
    </div>

    <Card pad={0} style={{borderRadius:14,overflow:"hidden"}}>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:720}}>
        <thead><tr style={{borderBottom:`2px solid ${C.line}`,textAlign:"left"}}>
          {(tab==="mine"?["Date","Category","Merchant","Amount","Status",""]:["Date","Employee","Category","Merchant","Amount","Status","Actions"]).map(h=>
            <th key={h} style={{padding:"12px 14px",fontSize:11.5,fontWeight:700,color:C.text3,letterSpacing:".05em",textTransform:"uppercase"}}>{h}</th>)}
        </tr></thead>
        <tbody>{list.map(x=>{const e=A.hrEmp(x.employee);
          return <tr key={x.id} style={{borderBottom:`1px solid ${C.lineSoft}`,cursor:"pointer"}} onClick={()=>setDetail(x)}>
            <td style={{padding:"11px 14px",fontSize:12.5,color:C.text2,fontFamily:"ui-monospace,monospace"}}>{x.date}</td>
            {tab!=="mine"&&<td style={{padding:"11px 14px"}}><div style={{display:"flex",gap:8,alignItems:"center"}}>
              <SmartPortrait seed={e?.seed||0} size={24} radius={6}/>
              <span style={{fontSize:12.5,color:C.text,fontWeight:600}}>{e?.name||"—"}</span>
            </div></td>}
            <td style={{padding:"11px 14px",fontSize:12.5,color:C.text2}}>{x.category}</td>
            <td style={{padding:"11px 14px",fontSize:13,color:C.text}}>{x.merchant}</td>
            <td style={{padding:"11px 14px",fontSize:14,fontWeight:660,color:C.text}}>${x.amount.toFixed(2)}</td>
            <td style={{padding:"11px 14px"}}><Tag tone={x.status==="paid"?"brand":x.status==="approved"?"ok":x.status==="rejected"?"danger":"warn"} sm>{x.status}</Tag></td>
            <td style={{padding:"11px 14px"}} onClick={e=>e.stopPropagation()}>
              {isApprover&&tab==="queue"&&<div style={{display:"flex",gap:4}}>
                <Btn kind="dangerSoft" size="xs" onClick={()=>{const r=prompt("Reason for rejection?"); if(r)A.decideExpense(x.id,"rejected",emp.id,r);}}>Reject</Btn>
                <Btn kind="primary" size="xs" onClick={()=>A.decideExpense(x.id,"approved",emp.id)}>Approve</Btn>
              </div>}
              {isApprover&&tab==="approved"&&<Btn kind="primary" size="xs" onClick={()=>A.payExpense(x.id)}>Mark paid</Btn>}
            </td>
          </tr>;})}
          {list.length===0&&<tr><td colSpan={tab==="mine"?6:7} style={{padding:32,textAlign:"center",color:C.text3,fontSize:13}}>No expenses in this view.</td></tr>}
        </tbody>
      </table></div>
    </Card>

    {showSubmit&&<ExpenseSubmitModal onClose={()=>setShowSubmit(false)} onSubmit={(data)=>{A.submitExpense({...data,employee:emp.id}); setShowSubmit(false);}}/>}
    {detail&&<ExpenseDetailModal expense={detail} onClose={()=>setDetail(null)} isApprover={isApprover} currentEmpId={emp.id}/>}
  </div>;
}

function ExpenseSubmitModal({onClose,onSubmit}){
  const mob=useMedia("(max-width: 900px)");
  const [cat,setCat]=useState("Travel"); const [merchant,setMerchant]=useState(""); const [amount,setAmount]=useState("");
  const [description,setDescription]=useState(""); const [date,setDate]=useState(_fmtDate(new Date()));
  const canSubmit=merchant.trim()&&Number(amount)>0&&date;
  return <Modal onClose={onClose} title="Submit an expense" wide>
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <Field label="Category" required>
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"repeat(4,1fr)",gap:8}}>
          {EXPENSE_CATEGORIES.map(c=><button key={c.k} onClick={()=>setCat(c.k)} type="button" style={{background:cat===c.k?C.tint:"#fff",border:`1.5px solid ${cat===c.k?C.brand:C.line}`,borderRadius:10,padding:"10px 12px",cursor:"pointer",fontFamily:"inherit",fontSize:12.5,fontWeight:cat===c.k?680:520,color:cat===c.k?C.brand:C.text2,textAlign:"left",display:"flex",gap:8,alignItems:"center"}}>
            <I n={c.icon} s={15}/>{c.k}
          </button>)}
        </div>
      </Field>
      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12}}>
        <Field label="Merchant" required><Input value={merchant} onChange={e=>setMerchant(e.target.value)} placeholder={cat==="Mileage"?"Personal vehicle":"Company or store name"}/></Field>
        <Field label="Amount (CAD)" required><Input type="number" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00"/></Field>
        <Field label="Date" required><Input type="date" value={date} onChange={e=>setDate(e.target.value)}/></Field>
      </div>
      <Field label="Description" required hint="Business purpose. Required for CRA compliance."><Input value={description} onChange={e=>setDescription(e.target.value)} placeholder="What was this for?"/></Field>
      <Banner tone="neutral" icon="file" title="Receipt">In production, you'd upload a photo or PDF of the receipt here. For this prototype, receipts are simulated.</Banner>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
        <Btn kind="primary" icon="check" onClick={()=>onSubmit({category:cat,merchant:merchant.trim(),amount:Number(amount),description:description.trim(),date})} disabled={!canSubmit}>Submit for review</Btn>
      </div>
    </div>
  </Modal>;
}

function ExpenseDetailModal({expense:x,onClose,isApprover,currentEmpId}){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const e=A.hrEmp(x.employee); const approver=x.approvedBy?A.hrEmp(x.approvedBy):null;
  return <Modal onClose={onClose} title={`${x.category} · $${x.amount.toFixed(2)}`} wide>
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{padding:14,background:C.bg,borderRadius:11,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <SmartPortrait seed={e?.seed||0} size={36} radius={9}/>
          <div>
            <div style={{fontSize:13.5,fontWeight:640,color:C.text}}>{e?.name}</div>
            <div style={{fontSize:11.5,color:C.text3}}>{e?.title}</div>
          </div>
        </div>
        <Tag tone={x.status==="paid"?"brand":x.status==="approved"?"ok":x.status==="rejected"?"danger":"warn"}>{x.status}</Tag>
      </div>

      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12,fontSize:13}}>
        {[["Category",x.category],["Merchant",x.merchant],["Date",x.date],["Amount",`$${x.amount.toFixed(2)} ${x.currency}`],["Reimburse via",x.reimburseVia==="next-payroll"?"Next payroll":x.reimburseVia],["Submitted",new Date(x.submitted).toLocaleDateString("en-CA")]].map(([l,v])=>
          <div key={l}><div style={{fontSize:11.5,color:C.text3,fontWeight:600,textTransform:"uppercase",letterSpacing:".04em",marginBottom:3}}>{l}</div><div style={{color:C.text,fontWeight:500}}>{v}</div></div>)}
      </div>

      {x.description&&<div>
        <div style={{fontSize:11.5,color:C.text3,fontWeight:600,textTransform:"uppercase",letterSpacing:".04em",marginBottom:6}}>Business purpose</div>
        <div style={{fontSize:13.5,color:C.text2,lineHeight:1.55,padding:12,background:C.bg,borderRadius:9}}>{x.description}</div>
      </div>}

      {x.receiptUrl&&<div style={{padding:14,background:C.bg,borderRadius:11,display:"flex",gap:10,alignItems:"center"}}>
        <I n="file" s={20} c={C.brand}/>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:640,color:C.text}}>Receipt attached</div>
          <div style={{fontSize:11.5,color:C.text3,marginTop:1}}>{x.receiptUrl}</div>
        </div>
        <Btn kind="ghost" size="xs">View</Btn>
      </div>}

      {approver&&<div style={{fontSize:12,color:C.text3,padding:"10px 12px",background:C.bg,borderRadius:9}}>
        {x.status==="approved"?"Approved":x.status==="rejected"?"Rejected":x.status==="paid"?"Approved":""} by <strong style={{color:C.text2}}>{approver.name}</strong> on {new Date(x.approvedAt).toLocaleDateString("en-CA")}
        {x.rejectReason&&<div style={{marginTop:6,color:C.danger,fontStyle:"italic"}}>Reason: {x.rejectReason}</div>}
        {x.paidAt&&<div style={{marginTop:6,color:C.ok}}>Paid on {new Date(x.paidAt).toLocaleDateString("en-CA")}</div>}
      </div>}

      {isApprover&&x.status==="submitted"&&<div style={{display:"flex",gap:10,justifyContent:"flex-end",paddingTop:12,borderTop:`1px solid ${C.line}`}}>
        <Btn kind="dangerSoft" onClick={()=>{const r=prompt("Reason for rejection?"); if(r){A.decideExpense(x.id,"rejected",currentEmpId,r); onClose();}}}>Reject</Btn>
        <Btn kind="primary" onClick={()=>{A.decideExpense(x.id,"approved",currentEmpId); onClose();}}>Approve</Btn>
      </div>}
      {isApprover&&x.status==="approved"&&<div style={{display:"flex",gap:10,justifyContent:"flex-end",paddingTop:12,borderTop:`1px solid ${C.line}`}}>
        <Btn kind="primary" icon="check" onClick={()=>{A.payExpense(x.id); onClose();}}>Mark as paid</Btn>
      </div>}
    </div>
  </Modal>;
}
