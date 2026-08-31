import { useState } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Page, Btn, Tag, Stat, Card, Lbl, Empty, SmartPortrait, Modal, Banner, H1 } from "../../design/primitives.jsx";

export function EmpStaffing(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const client=A.staffingClientByEmployerId(A.company?.id);
  if(!client){
    /* Non-clients get a sales page with contact CTA — no redirect loop */
    return <Page wide>
      <div style={{maxWidth:820,margin:"0 auto",textAlign:"center",padding:mob?"32px 0":"56px 0"}}>
        <div style={{display:"inline-block",padding:"6px 14px",background:"#FEF3E2",color:"#D97706",borderRadius:99,fontSize:12,fontWeight:640,letterSpacing:".04em",textTransform:"uppercase",border:"1px solid #FCD9A8",marginBottom:20}}>
          Staffing services · Not yet enrolled</div>
        <h1 style={{fontSize:mob?26:36,fontWeight:730,color:C.text,letterSpacing:"-.03em",margin:"0 0 14px"}}>Need workers fast?</h1>
        <p style={{fontSize:mob?15:17,color:C.text2,lineHeight:1.55,margin:"0 0 28px",maxWidth:600,marginLeft:"auto",marginRight:"auto"}}>
          NorthHire Staffing is a separate licensed agency service. We employ contract workers on our payroll, deploy them to your site, and invoice you weekly. Perm placement also available (fee on hire, 90-day guarantee).</p>
        <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap",marginBottom:32}}>
          <Btn kind="primary" onClick={()=>A.go("forEmployers")} style={{background:"#D97706",borderColor:"#D97706"}}>Learn more</Btn>
          <Btn kind="ghost" onClick={()=>A.go("contact")}>Book a demo</Btn>
        </div>
        <div style={{fontSize:12.5,color:C.text3,padding:14,background:C.bg,borderRadius:10,maxWidth:520,margin:"0 auto",lineHeight:1.6}}>
          Once you sign an MSA with NorthHire Staffing, this page becomes your operations dashboard — job orders, active assignments, timesheets to approve, and invoices.
        </div>
      </div>
    </Page>;
  }
  const openOrders=A.jobOrders.filter(j=>j.client===client.id&&j.status==="open");
  const activeAsns=A.clientAssignments(client.id).filter(a=>a.status==="active");
  const pendingTs=A.clientTimesheets(client.id).filter(t=>t.status==="submitted");
  const invoices=A.staffingInvoices.filter(i=>i.client===client.id);
  const openInvTotal=invoices.filter(i=>i.status==="pending"||i.status==="overdue").reduce((s,i)=>s+i.total,0);
  const [showReq,setShowReq]=useState(false);

  return <Page wide>
    <div style={{marginBottom:20}}>
      <div style={{display:"flex",gap:8,marginBottom:6,flexWrap:"wrap"}}>
        <Tag tone="brand" icon="users" sm>NorthHire Staffing client</Tag>
        <Tag tone={client.signedMsa?"ok":"warn"} sm>{client.signedMsa?`MSA signed ${client.signedMsa}`:"MSA pending"}</Tag>
      </div>
      <H1 sub={`Net ${client.paymentTermsDays} payment terms · Markup ${client.markup}%`} action={
        <Btn kind="primary" icon="plus" onClick={()=>setShowReq(true)}>Request workers</Btn>
      }>Staffing services</H1>
    </div>

    <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"repeat(4,1fr)",gap:12,marginBottom:20}}>
      <Stat icon="briefcase" label="Open orders" value={openOrders.length} tone={C.warn}/>
      <Stat icon="activity" label="Workers on site" value={activeAsns.length} tone={C.brand}/>
      <Stat icon="clock" label="Timesheets to approve" value={pendingTs.length} tone={pendingTs.length>0?C.warn:C.ok}/>
      <Stat icon="wallet" label="AR outstanding" value={`$${(openInvTotal/1000).toFixed(1)}k`}/>
    </div>

    <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1.4fr 1fr",gap:16,marginBottom:16}}>
      <Card pad={mob?18:22} style={{borderRadius:14}}>
        <Lbl>Workers on your site</Lbl>
        {activeAsns.length===0?<Empty icon="users" title="No active assignments" body="Request workers to have them start within 48 hrs."/>
        :<div style={{display:"flex",flexDirection:"column",gap:10}}>
          {activeAsns.map(a=>{const w=A.worker(a.worker); const person=w?(A.people||[]).find(p=>p.id===w.personId):null;
            return <div key={a.id} style={{padding:"12px 14px",background:C.bg,borderRadius:10,display:"flex",gap:12,alignItems:"center"}}>
              <SmartPortrait seed={person?.seed||0} size={38} radius={9}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:640,color:C.text}}>{person?.name||"—"}</div>
                <div style={{fontSize:12,color:C.text3,marginTop:2}}>Started {a.startDate} · {a.shiftPattern}</div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:13.5,fontWeight:660,color:C.brand}}>${a.billRate}/hr</div>
                <div style={{fontSize:11,color:C.text3,marginTop:2}}>{a.site.split(" — ").pop()}</div>
              </div>
            </div>;})}
        </div>}
      </Card>

      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        {pendingTs.length>0&&<Card pad={mob?18:20} style={{borderRadius:14,background:C.warnBg,border:`1px solid ${C.warnLn}`}}>
          <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:12}}>
            <div style={{width:36,height:36,borderRadius:10,background:"#fff",color:C.warn,display:"flex",alignItems:"center",justifyContent:"center"}}><I n="clock" s={17}/></div>
            <div>
              <div style={{fontSize:14,fontWeight:660,color:C.text}}>{pendingTs.length} timesheets awaiting</div>
              <div style={{fontSize:12,color:C.text2,marginTop:2}}>Approve so workers get paid Thursday.</div>
            </div>
          </div>
          <Btn kind="warn" size="sm" full onClick={()=>A.go("empStaffingTimesheets")}>Review timesheets</Btn>
        </Card>}

        <Card pad={mob?18:20} style={{borderRadius:14}}>
          <Lbl>Recent invoices</Lbl>
          {invoices.slice(0,3).map(inv=><div key={inv.id} style={{padding:"10px 11px",background:C.bg,borderRadius:9,marginBottom:6}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:C.text}}>
              <span style={{fontFamily:"ui-monospace,monospace"}}>{inv.number}</span>
              <span style={{fontWeight:700,color:C.brand}}>${inv.total.toLocaleString()}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11.5,marginTop:3}}>
              <span style={{color:C.text3}}>Due {inv.due}</span>
              <Tag tone={inv.status==="paid"?"ok":inv.status==="overdue"?"danger":"warn"} sm>{inv.status}</Tag>
            </div>
          </div>)}
          {invoices.length===0&&<div style={{fontSize:12.5,color:C.text3,padding:8,textAlign:"center"}}>No invoices yet.</div>}
          {invoices.length>3&&<Btn kind="ghost" size="sm" full onClick={()=>A.go("empStaffingInvoices")}>See all {invoices.length}</Btn>}
        </Card>
      </div>
    </div>

    <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(4,1fr)",gap:12}}>
      {[["Request workers","plus","empStaffingRequests",C.brand],
        ["Active assignments","activity","empStaffingAssignments",C.ok],
        ["Approve timesheets","clock","empStaffingTimesheets",C.warn],
        ["Invoices","file","empStaffingInvoices",C.violet]].map(([l,ic,go,tone])=>
        <button key={l} onClick={()=>A.go(go)} style={{padding:14,borderRadius:11,cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:600,color:C.text,textAlign:"left",background:"#fff",border:`1px solid ${C.line}`,display:"flex",gap:10,alignItems:"center"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=tone;}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=C.line;}}>
          <div style={{width:32,height:32,borderRadius:8,background:C.bg,color:tone,display:"flex",alignItems:"center",justifyContent:"center"}}><I n={ic} s={16}/></div>
          {l}
        </button>)}
    </div>

    {showReq&&<Modal onClose={()=>setShowReq(false)} title="Request workers">
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <Banner tone="brand" icon="info">
          Fill out the details below and we'll respond within 4 hours with matched candidates.
        </Banner>
        <div style={{fontSize:13,color:C.text2,padding:14,background:C.bg,borderRadius:10,lineHeight:1.6}}>
          For a prototype demo, this button would open the same New Job Order form the agency recruiters use — pre-filled with your company info as the client.
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn kind="ghost" onClick={()=>setShowReq(false)}>Cancel</Btn>
          <Btn kind="primary" onClick={()=>{setShowReq(false); alert("Job order submitted. Recruiter will contact you within 4 hours.");}}>Submit request</Btn>
        </div>
      </div>
    </Modal>}
  </Page>;
}

/* ─── Client: Approve timesheets ─── */
export function EmpStaffingTimesheets(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const client=A.staffingClientByEmployerId(A.company?.id);
  if(!client)return <Page><Empty icon="clock" title="Not a staffing client" body="Contact us to set up staffing services."/></Page>;
  const asns=A.clientAssignments(client.id).map(a=>a.id);
  const list=A.timesheets.filter(t=>asns.includes(t.assignment)).sort((a,b)=>b.weekStart.localeCompare(a.weekStart));
  const pending=list.filter(t=>t.status==="submitted");

  return <Page wide>
    <H1 sub={`${pending.length} submitted, ${list.filter(t=>t.status==="approved").length} approved`}>Timesheets to review</H1>

    <Card pad={0} style={{borderRadius:14,overflow:"hidden"}}>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:640}}>
        <thead><tr style={{borderBottom:`2px solid ${C.line}`,textAlign:"left"}}>
          {["Week","Worker","Hours","Details","Status","Actions"].map(h=>
            <th key={h} style={{padding:"12px 14px",fontSize:11.5,fontWeight:700,color:C.text3,letterSpacing:".05em",textTransform:"uppercase"}}>{h}</th>)}
        </tr></thead>
        <tbody>{list.map(t=>{const w=A.worker(t.worker); const person=w?(A.people||[]).find(p=>p.id===w.personId):null;
          const totalHrs=A.timesheetTotal(t);
          return <tr key={t.id} style={{borderBottom:`1px solid ${C.lineSoft}`}}>
            <td style={{padding:"11px 14px",fontSize:12.5,color:C.text2,fontFamily:"ui-monospace,monospace"}}>{t.weekStart}</td>
            <td style={{padding:"11px 14px"}}><div style={{display:"flex",gap:10,alignItems:"center"}}>
              <SmartPortrait seed={person?.seed||0} size={28} radius={7}/>
              <span style={{fontSize:13,color:C.text,fontWeight:600}}>{person?.name||"—"}</span></div></td>
            <td style={{padding:"11px 14px",fontSize:14,color:C.text,fontWeight:700}}>{totalHrs}h</td>
            <td style={{padding:"11px 14px",fontSize:11.5,color:C.text3}}>
              {["mon","tue","wed","thu","fri","sat","sun"].map(k=>`${k.charAt(0).toUpperCase()}${t.hours[k]||0}`).join(" ")}
              {t.otHours>0&&<div>OT: {t.otHours}h</div>}
              {t.notes&&<div style={{marginTop:3,fontStyle:"italic"}}>"{t.notes}"</div>}
            </td>
            <td style={{padding:"11px 14px"}}><Tag tone={t.status==="approved"?"ok":t.status==="submitted"?"warn":t.status==="paid"?"brand":"neutral"} sm>{t.status}</Tag></td>
            <td style={{padding:"11px 14px"}}>
              {t.status==="submitted"&&<div style={{display:"flex",gap:4}}>
                <Btn kind="dangerSoft" size="xs" onClick={()=>{const reason=prompt("Reason for returning?"); if(reason)A.rejectTimesheet(t.id,reason);}}>Return</Btn>
                <Btn kind="primary" size="xs" onClick={()=>A.approveTimesheet(t.id,A.user.email)}>Approve</Btn>
              </div>}
            </td>
          </tr>;})}
          {list.length===0&&<tr><td colSpan={6} style={{padding:24,textAlign:"center",color:C.text3,fontSize:13}}>No timesheets from active assignments.</td></tr>}
        </tbody>
      </table></div>
    </Card>
  </Page>;
}

/* ─── Client: view invoices ─── */
export function EmpStaffingInvoices(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const client=A.staffingClientByEmployerId(A.company?.id);
  if(!client)return <Page><Empty icon="file" title="Not a staffing client" body="Contact us to set up staffing services."/></Page>;
  const invoices=A.staffingInvoices.filter(i=>i.client===client.id).sort((a,b)=>b.issued.localeCompare(a.issued));

  return <Page wide>
    <H1 sub="From NorthHire Staffing. Weekly cycle. HST included per province.">Staffing invoices</H1>

    <Card pad={0} style={{borderRadius:14,overflow:"hidden"}}>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:640}}>
        <thead><tr style={{borderBottom:`2px solid ${C.line}`,textAlign:"left"}}>
          {["Number","Week","Subtotal","HST","Total","Due","Status"].map(h=>
            <th key={h} style={{padding:"12px 14px",fontSize:11.5,fontWeight:700,color:C.text3,letterSpacing:".05em",textTransform:"uppercase"}}>{h}</th>)}
        </tr></thead>
        <tbody>{invoices.map(inv=>{const daysOverdue=inv.status==="overdue"&&inv.due?Math.floor((Date.now()-new Date(inv.due).getTime())/864e5):0;
          return <tr key={inv.id} style={{borderBottom:`1px solid ${C.lineSoft}`}}>
            <td style={{padding:"11px 14px",fontSize:12.5,color:C.text2,fontFamily:"ui-monospace,monospace"}}>{inv.number}</td>
            <td style={{padding:"11px 14px",fontSize:12.5,color:C.text3}}>{inv.weekStart}</td>
            <td style={{padding:"11px 14px",fontSize:13,color:C.text}}>${inv.subtotal.toLocaleString()}</td>
            <td style={{padding:"11px 14px",fontSize:12.5,color:C.text3}}>${inv.hst.toLocaleString()}</td>
            <td style={{padding:"11px 14px",fontSize:14,color:C.brand,fontWeight:730}}>${inv.total.toLocaleString()}</td>
            <td style={{padding:"11px 14px",fontSize:12.5,color:daysOverdue>0?C.danger:C.text3}}>{inv.due}{daysOverdue>0?` (+${daysOverdue}d)`:""}</td>
            <td style={{padding:"11px 14px"}}><Tag tone={inv.status==="paid"?"ok":inv.status==="overdue"?"danger":"warn"} sm>{inv.status}</Tag></td>
          </tr>;})}
          {invoices.length===0&&<tr><td colSpan={7} style={{padding:24,textAlign:"center",color:C.text3,fontSize:13}}>No invoices yet.</td></tr>}
        </tbody>
      </table></div>
    </Card>
  </Page>;
}

/* ─── Client: view active assignments ─── */
export function EmpStaffingAssignments(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const client=A.staffingClientByEmployerId(A.company?.id);
  if(!client)return <Page><Empty icon="activity" title="Not a staffing client" body="Contact us to set up staffing services."/></Page>;
  const list=A.clientAssignments(client.id).sort((a,b)=>b.startDate.localeCompare(a.startDate));

  return <Page wide>
    <H1 sub="Every worker deployed to your site — active and past.">Active assignments</H1>
    <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(auto-fill,minmax(340px,1fr))",gap:12}}>
      {list.map(a=>{const w=A.worker(a.worker); const person=w?(A.people||[]).find(p=>p.id===w.personId):null;
        return <Card key={a.id} pad={mob?18:22} style={{borderRadius:14}}>
          <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:12}}>
            <SmartPortrait seed={person?.seed||0} size={44} radius={11}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:15,fontWeight:660,color:C.text}}>{person?.name||"—"}</div>
              <div style={{fontSize:12,color:C.text3,marginTop:3}}>Since {a.startDate}</div>
            </div>
            <Tag tone={a.status==="active"?"ok":"neutral"} sm>{a.status}</Tag>
          </div>
          <div style={{fontSize:12.5,color:C.text2,lineHeight:1.6}}>
            <div>{a.site}</div>
            <div>Supervisor: {a.supervisor}</div>
            <div>{a.shiftPattern}</div>
            <div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${C.lineSoft}`,color:C.brand,fontWeight:700}}>${a.billRate}/hr bill rate</div>
          </div>
        </Card>;})}
      {list.length===0&&<div style={{gridColumn:"1 / -1"}}><Empty icon="activity" title="No assignments yet" body="Request workers to start filling roles."/></div>}
    </div>
  </Page>;
}

export function EmpStaffingRequests(){
  const A=use(); const mob=useMedia("(max-width: 900px)");
  const client=A.staffingClientByEmployerId(A.company?.id);
  if(!client)return <Page><Empty icon="plus" title="Not a staffing client" body="Contact us to set up staffing services."/></Page>;
  const orders=A.jobOrders.filter(j=>j.client===client.id).sort((a,b)=>b.createdAt-a.createdAt);

  return <Page wide>
    <H1 sub="Your requests for workers. NorthHire Staffing fills these from our bench.">Job order history</H1>
    <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(auto-fill,minmax(340px,1fr))",gap:12}}>
      {orders.map(jo=><Card key={jo.id} pad={mob?18:22} style={{borderRadius:14}}>
        <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
          <Tag tone={jo.urgency==="high"?"danger":jo.urgency==="medium"?"warn":"neutral"} sm>{jo.urgency}</Tag>
          <Tag tone={jo.status==="open"?"brand":jo.status==="filled"?"ok":"neutral"} sm>{jo.status}</Tag>
        </div>
        <div style={{fontSize:15,fontWeight:660,color:C.text,letterSpacing:"-.015em"}}>{jo.title}</div>
        <div style={{fontSize:12.5,color:C.text2,marginTop:4}}>{jo.location.split(" — ").pop()} · Starts {jo.startDate}</div>
        <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${C.lineSoft}`,display:"flex",justifyContent:"space-between",fontSize:12.5}}>
          <span style={{color:C.text3}}>Filled</span>
          <span style={{color:C.brand,fontWeight:700}}>{jo.filled} / {jo.positions}</span>
        </div>
      </Card>)}
      {orders.length===0&&<div style={{gridColumn:"1 / -1"}}><Empty icon="briefcase" title="No requests yet" body="Use the 'Request workers' button on Staffing dashboard to submit your first."/></div>}
    </div>
  </Page>;
}
