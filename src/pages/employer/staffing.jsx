import { useState } from "react";
import { use } from "../../store/context.js";
import { useMedia } from "../../helpers/hooks.js";
import { C } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";
import { Page, Btn, Tag, Stat, Card, Lbl, Empty, SmartPortrait, Modal, Banner, H1, Field, Input, Sel, Area, usePagination, Pagination, TH_CLASS, TD_CLASS, HERO_QUIET } from "../../design/primitives.jsx";
import { PROVS, PCODE } from "../../store/seed/constants.js";
import { invoiceTone, timesheetTone } from "../../helpers/statusTone.js";
import { useTranslation } from "../../i18n/i18n.jsx";
import { formatNumber } from "../../i18n/format.js";

/* Quick-action tile tones — kept as a literal lookup (not string-interpolated into a
   className) so Tailwind's static scanner can see every possible class it needs to generate. */
const TONE_CLS={
  brand:{text:"text-brand",hoverBorder:"hover:border-brand"},
  ok:{text:"text-ok",hoverBorder:"hover:border-ok"},
  warn:{text:"text-warn",hoverBorder:"hover:border-warn"},
  violet:{text:"text-violet",hoverBorder:"hover:border-violet"},
};

export function EmpStaffing(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t,locale}=useTranslation();
  const [showReq,setShowReq]=useState(false);
  const [req,setReq]=useState({title:"",positions:1,location:"",province:"Alberta",mustHave:"",urgency:"medium"});
  const client=A.staffingClientByEmployerId(A.company?.id);
  if(!client){
    /* Non-clients get a sales page with contact CTA — no redirect loop */
    return <Page wide>
      <div className={`max-w-3xl mx-auto text-center ${mob?"py-8":"py-14"}`}>
        <div className="inline-block py-1.5 px-3.5 bg-[#FEF3E2] text-[#D97706] rounded-full text-xs font-semibold tracking-wide uppercase border border-[#FCD9A8] mb-5">
          {t("employer.staffing.notEnrolledBadge")}</div>
        <h1 className={`${HERO_QUIET} mb-3.5 ${mob?"text-2xl":"text-4xl"}`}>{t("employer.staffing.heroTitle")}</h1>
        <p className={`text-text-2 leading-normal mb-7 max-w-xl mx-auto ${mob?"text-base":"text-lg"}`}>
          {t("employer.staffing.heroBody")}</p>
        <div className="flex gap-2.5 justify-center flex-wrap mb-8">
          <Btn kind="primary" onClick={()=>A.go("forEmployers")} style={{background:"#D97706",borderColor:"#D97706"}}>{t("employer.staffing.learnMoreBtn")}</Btn>
          <Btn kind="ghost" onClick={()=>A.go("contact")}>{t("employer.staffing.bookDemoBtn")}</Btn>
        </div>
        <div className="text-xs text-text-3 p-3.5 bg-bg rounded-xl max-w-lg mx-auto leading-relaxed">
          {t("employer.staffing.notEnrolledFooter")}
        </div>
      </div>
    </Page>;
  }
  const openOrders=A.jobOrders.filter(j=>j.client===client.id&&j.status==="open");
  const activeAsns=A.clientAssignments(client.id).filter(a=>a.status==="active");
  const pendingTs=A.clientTimesheets(client.id).filter(t=>t.status==="submitted");
  const invoices=A.staffingInvoices.filter(i=>i.client===client.id);
  const openInvTotal=invoices.filter(i=>i.status==="pending"||i.status==="overdue").reduce((s,i)=>s+i.total,0);
  const submitReq=async()=>{
    if(!req.title.trim()||!req.location.trim())return;
    try{
      await A.createJobOrder({client:client.id,title:req.title.trim(),positions:Math.max(1,Number(req.positions)||1),
        location:req.location.trim(),province:PCODE[req.province]||req.province,urgency:req.urgency,
        mustHave:req.mustHave.split(",").map(s=>s.trim()).filter(Boolean),niceToHave:[],
        startDate:"",endDate:null,ongoing:true,shiftPattern:"",overtimeAvailable:false,payRate:0,billRate:0,
        supervisor:A.user?.name||"",supervisorEmail:A.user?.email||"",supervisorPhone:"",ppe:"",
        notes:"Submitted via employer self-service request form."});
      setShowReq(false);
      setReq({title:"",positions:1,location:"",province:"Alberta",mustHave:"",urgency:"medium"});
    }catch(err){A.toast(err.message,"danger");}
  };

  return <Page wide>
    <div className="mb-5">
      <div className="flex gap-2 mb-1.5 flex-wrap">
        <Tag tone="brand" icon="users" sm>{t("employer.staffing.clientBadge")}</Tag>
        <Tag tone={client.signedMsa?"ok":"warn"} sm>{client.signedMsa?t("employer.staffing.msaSigned",{date:client.signedMsa}):t("employer.staffing.msaPending")}</Tag>
      </div>
      <H1 sub={t("employer.staffing.paymentTermsSub",{days:client.paymentTermsDays,markup:client.markup})} action={
        <Btn kind="primary" icon="plus" onClick={()=>setShowReq(true)}>{t("employer.staffing.requestWorkersBtn")}</Btn>
      }>{t("employer.staffing.pageTitle")}</H1>
    </div>

    <div className={`grid gap-3 mb-5 ${mob?"grid-cols-2":"grid-cols-4"}`}>
      <Stat icon="briefcase" label={t("employer.staffing.statOpenOrders")} value={openOrders.length} tone={C.warn}/>
      <Stat icon="activity" label={t("employer.staffing.statWorkersOnSite")} value={activeAsns.length} tone={C.brand}/>
      <Stat icon="clock" label={t("employer.staffing.statTimesheetsToApprove")} value={pendingTs.length} tone={pendingTs.length>0?C.warn:C.ok}/>
      <Stat icon="wallet" label={t("employer.staffing.statArOutstanding")} value={`$${(openInvTotal/1000).toFixed(1)}k`}/>
    </div>

    <div className={`grid gap-4 mb-4 ${mob?"grid-cols-1":"grid-cols-[1.4fr_1fr]"}`}>
      <Card pad={mob?18:22} style={{borderRadius:14}}>
        <Lbl>{t("employer.staffing.workersOnSiteLabel")}</Lbl>
        {activeAsns.length===0?<Empty icon="users" title={t("employer.staffing.noActiveAssignmentsTitle")} body={t("employer.staffing.noActiveAssignmentsBody")}/>
        :<div className="flex flex-col gap-2.5">
          {activeAsns.map(a=>{const w=A.worker(a.worker); const person=w?(A.people||[]).find(p=>p.id===w.personId):null;
            return <div key={a.id} className="py-3 px-3.5 bg-bg rounded-xl flex gap-3 items-center">
              <SmartPortrait seed={person?.seed||0} size={38} radius={9}/>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-text">{person?.name||"—"}</div>
                <div className="text-xs text-text-3 mt-0.5">{t("employer.staffing.startedOn",{date:a.startDate,pattern:a.shiftPattern})}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-bold text-brand">${a.billRate}/hr</div>
                <div className="text-xs text-text-3 mt-0.5">{a.site.split(" — ").pop()}</div>
              </div>
            </div>;})}
        </div>}
      </Card>

      <div className="flex flex-col gap-4">
        {pendingTs.length>0&&<Card pad={mob?18:20} style={{borderRadius:14,background:C.warnBg,border:`1px solid ${C.warnLn}`}}>
          <div className="flex gap-2.5 items-center mb-3">
            <div className="w-9 h-9 rounded-xl bg-white text-warn flex items-center justify-center"><I n="clock" s={17}/></div>
            <div>
              <div className="text-sm font-bold text-text">{t("employer.staffing.timesheetsAwaiting",{count:pendingTs.length})}</div>
              <div className="text-xs text-text-2 mt-0.5">{t("employer.staffing.approveSoWorkersPaid")}</div>
            </div>
          </div>
          <Btn kind="warn" size="sm" full onClick={()=>A.go("empStaffingTimesheets")}>{t("employer.staffing.reviewTimesheetsBtn")}</Btn>
        </Card>}

        <Card pad={mob?18:20} style={{borderRadius:14}}>
          <Lbl>{t("employer.staffing.recentInvoicesLabel")}</Lbl>
          {invoices.slice(0,3).map(inv=><div key={inv.id} className="py-2.5 px-3 bg-bg rounded-lg mb-1.5">
            <div className="flex justify-between text-sm text-text">
              <span className="font-mono">{inv.number}</span>
              <span className="font-bold text-brand">${inv.total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-text-3">{t("employer.staffing.dueDate",{date:inv.due})}</span>
              <Tag tone={invoiceTone(inv.status)} sm>{t("enums.invoiceStatus."+inv.status)}</Tag>
            </div>
          </div>)}
          {invoices.length===0&&<div className="text-xs text-text-3 p-2 text-center">{t("employer.staffing.noInvoicesYet")}</div>}
          {invoices.length>3&&<Btn kind="ghost" size="sm" full onClick={()=>A.go("empStaffingInvoices")}>{t("employer.staffing.seeAllInvoices",{count:invoices.length})}</Btn>}
        </Card>
      </div>
    </div>

    <div className={`grid gap-3 ${mob?"grid-cols-1":"grid-cols-4"}`}>
      {[[t("employer.staffing.tileRequestWorkers"),"plus","empStaffingRequests","brand"],
        [t("employer.staffing.tileActiveAssignments"),"activity","empStaffingAssignments","ok"],
        [t("employer.staffing.tileApproveTimesheets"),"clock","empStaffingTimesheets","warn"],
        [t("employer.staffing.tileInvoices"),"file","empStaffingInvoices","violet"]].map(([l,ic,go,tone])=>
        <button key={l} onClick={()=>A.go(go)}
          className={`p-3.5 rounded-xl cursor-pointer text-sm font-semibold text-text text-left bg-white border border-line flex gap-2.5 items-center ${TONE_CLS[tone].hoverBorder}`}>
          <div className={`w-8 h-8 rounded-lg bg-bg flex items-center justify-center ${TONE_CLS[tone].text}`}><I n={ic} s={16}/></div>
          {l}
        </button>)}
    </div>

    {showReq&&<Modal onClose={()=>setShowReq(false)} title={t("employer.staffing.requestWorkersModalTitle")}>
      <div className="flex flex-col gap-3.5">
        <Banner tone="brand" icon="info">
          {t("employer.staffing.requestWorkersBanner")}
        </Banner>
        <Field label={t("employer.staffing.roleLabel")} required><Input value={req.title} onChange={e=>setReq({...req,title:e.target.value})} placeholder={t("employer.staffing.rolePlaceholder")}/></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("employer.staffing.positionsLabel")} required><Input type="number" min="1" value={req.positions} onChange={e=>setReq({...req,positions:e.target.value})}/></Field>
          <Field label={t("employer.staffing.urgencyLabel")}><Sel value={req.urgency} onChange={e=>setReq({...req,urgency:e.target.value})}>
            <option value="low">{t("enums.urgency.low")}</option><option value="medium">{t("enums.urgency.medium")}</option><option value="high">{t("enums.urgency.high")}</option></Sel></Field>
        </div>
        <Field label={t("employer.staffing.siteLocationLabel")} required><Input value={req.location} onChange={e=>setReq({...req,location:e.target.value})} placeholder={t("employer.staffing.siteLocationPlaceholder")}/></Field>
        <Field label={t("employer.staffing.provinceLabel")}><Sel value={req.province} onChange={e=>setReq({...req,province:e.target.value})}>
          {PROVS.map(p=><option key={p}>{p}</option>)}</Sel></Field>
        <Field label={t("employer.staffing.mustHaveLabel")} hint={t("employer.staffing.mustHaveHint")}><Input value={req.mustHave} onChange={e=>setReq({...req,mustHave:e.target.value})} placeholder={t("employer.staffing.mustHavePlaceholder")}/></Field>
        <div className="flex gap-2.5 justify-end mt-1">
          <Btn kind="ghost" onClick={()=>setShowReq(false)}>{t("employer.staffing.cancelBtn")}</Btn>
          <Btn kind="primary" onClick={submitReq} disabled={!req.title.trim()||!req.location.trim()}>{t("employer.staffing.submitRequestBtn")}</Btn>
        </div>
      </div>
    </Modal>}
  </Page>;
}

/* ─── Client: Approve timesheets ─── */
export function EmpStaffingTimesheets(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t}=useTranslation();
  const [returning,setReturning]=useState(null); const [reason,setReason]=useState("");
  const client=A.staffingClientByEmployerId(A.company?.id);
  const asns=client?A.clientAssignments(client.id).map(a=>a.id):[];
  const list=A.timesheets.filter(t=>asns.includes(t.assignment)).sort((a,b)=>b.weekStart.localeCompare(a.weekStart));
  const pending=list.filter(t=>t.status==="submitted");
  const pg=usePagination(list,20);
  if(!client)return <Page><Empty icon="clock" title={t("employer.staffing.notClientTitle")} body={t("employer.staffing.notClientBody")}/></Page>;

  return <Page wide>
    <H1 sub={t("employer.staffing.timesheetsSummarySub",{pending:pending.length,approved:list.filter(t=>t.status==="approved").length})}>{t("employer.staffing.timesheetsToReviewTitle")}</H1>

    <Card pad={0} style={{borderRadius:14,overflow:"hidden"}}>
      <div className="overflow-x-auto"><table className="w-full border-collapse min-w-160">
        <thead><tr className="border-b-2 border-line text-left">
          {[t("employer.staffing.weekHeader"),t("employer.staffing.workerHeader"),t("employer.staffing.hoursHeader"),t("employer.staffing.detailsHeader"),t("employer.staffing.statusHeader"),t("employer.staffing.actionsHeader")].map(h=>
            <th key={h} className={TH_CLASS}>{h}</th>)}
        </tr></thead>
        <tbody>{pg.pageItems.map(ts=>{const w=A.worker(ts.worker); const person=w?(A.people||[]).find(p=>p.id===w.personId):null;
          const totalHrs=A.timesheetTotal(ts);
          return <tr key={ts.id} className="border-b border-line-soft">
            <td className={`${TD_CLASS} text-xs text-text-2 font-mono`}>{ts.weekStart}</td>
            <td className={TD_CLASS}><div className="flex gap-2.5 items-center">
              <SmartPortrait seed={person?.seed||0} size={28} radius={7}/>
              <span className="text-sm text-text font-semibold">{person?.name||"—"}</span></div></td>
            <td className={`${TD_CLASS} text-sm text-text font-bold`}>{totalHrs}h</td>
            <td className={`${TD_CLASS} text-xs text-text-3`}>
              {["mon","tue","wed","thu","fri","sat","sun"].map(k=>`${k.charAt(0).toUpperCase()}${ts.hours[k]||0}`).join(" ")}
              {ts.otHours>0&&<div>{t("employer.staffing.otSuffix",{hours:ts.otHours})}</div>}
              {ts.notes&&<div className="mt-1 italic">"{ts.notes}"</div>}
            </td>
            <td className={TD_CLASS}><Tag tone={timesheetTone(ts.status)} sm>{t("enums.timesheetStatus."+ts.status)}</Tag></td>
            <td className={TD_CLASS}>
              {ts.status==="submitted"&&<div className="flex gap-1">
                <Btn kind="dangerSoft" size="xs" onClick={()=>{setReturning(ts.id);setReason("");}}>{t("employer.staffing.returnBtn")}</Btn>
                <Btn kind="primary" size="xs" onClick={()=>A.approveTimesheet(ts.id,A.user.email)}>{t("employer.staffing.approveBtn")}</Btn>
              </div>}
            </td>
          </tr>;})}
          {list.length===0&&<tr><td colSpan={6} className="p-5"><Empty icon="clock" title={t("employer.staffing.noTimesheetsTitle")} body={t("employer.staffing.noTimesheetsBody")}/></td></tr>}
        </tbody>
      </table></div>
    </Card>
    <Pagination {...pg}/>
    {returning&&<Modal onClose={()=>setReturning(null)} title={t("employer.staffing.returnTimesheetModalTitle")}>
      <div className="flex flex-col gap-3.5">
        <Field label={t("employer.staffing.returnReasonLabel")} required>
          <Area rows={3} value={reason} onChange={e=>setReason(e.target.value)} placeholder={t("employer.staffing.returnReasonPlaceholder")}/></Field>
        <div className="flex gap-2.5 justify-end">
          <Btn kind="ghost" onClick={()=>setReturning(null)}>{t("employer.staffing.cancelBtn")}</Btn>
          <Btn kind="dangerSoft" disabled={!reason.trim()} onClick={()=>{A.rejectTimesheet(returning,reason.trim());setReturning(null);}}>{t("employer.staffing.returnTimesheetBtn")}</Btn>
        </div>
      </div>
    </Modal>}
  </Page>;
}

/* ─── Client: view invoices ─── */
export function EmpStaffingInvoices(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t}=useTranslation();
  const [fromDate,setFromDate]=useState(""); const [toDate,setToDate]=useState("");
  const client=A.staffingClientByEmployerId(A.company?.id);
  const allInvoices=client?A.staffingInvoices.filter(i=>i.client===client.id).sort((a,b)=>b.issued.localeCompare(a.issued)):[];
  const invoices=allInvoices.filter(i=>(!fromDate||i.issued>=fromDate)&&(!toDate||i.issued<=toDate));
  const rangeTotal=invoices.reduce((s,i)=>s+i.total,0);
  const pg=usePagination(invoices,20);
  if(!client)return <Page><Empty icon="file" title={t("employer.staffing.notClientTitle")} body={t("employer.staffing.notClientBody")}/></Page>;

  return <Page wide>
    <H1 sub={t("employer.staffing.invoicesSub")}>{t("employer.staffing.invoicesTitle")}</H1>

    <div className="flex gap-2.5 items-center mb-3.5 flex-wrap">
      <Input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} style={{maxWidth:170}}/>
      <span className="text-xs text-text-3">{t("employer.staffing.toLabel")}</span>
      <Input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} style={{maxWidth:170}}/>
      {(fromDate||toDate)&&<button onClick={()=>{setFromDate("");setToDate("");}} className="bg-transparent border-0 p-0 cursor-pointer text-sm text-brand font-semibold">{t("employer.staffing.clearDatesBtn")}</button>}
      {(fromDate||toDate)&&<span className="text-sm text-text-2 ml-auto">{t("employer.staffing.invoiceCountTotal",{count:invoices.length,plural:invoices.length===1?"":"s",total:`$${rangeTotal.toLocaleString()}`})}</span>}
    </div>

    <Card pad={0} style={{borderRadius:14,overflow:"hidden"}}>
      <div className="overflow-x-auto"><table className="w-full border-collapse min-w-160">
        <thead><tr className="border-b-2 border-line text-left">
          {[t("employer.staffing.numberHeader"),t("employer.staffing.weekHeader"),t("employer.staffing.subtotalHeader"),t("employer.staffing.hstHeader"),t("employer.staffing.totalHeader"),t("employer.staffing.dueHeader"),t("employer.staffing.statusHeader")].map(h=>
            <th key={h} className={TH_CLASS}>{h}</th>)}
        </tr></thead>
        <tbody>{pg.pageItems.map(inv=>{const daysOverdue=inv.status==="overdue"&&inv.due?Math.floor((Date.now()-new Date(inv.due).getTime())/864e5):0;
          return <tr key={inv.id} className="border-b border-line-soft">
            <td className={`${TD_CLASS} text-xs text-text-2 font-mono`}>{inv.number}</td>
            <td className={`${TD_CLASS} text-xs text-text-3`}>{inv.weekStart}</td>
            <td className={`${TD_CLASS} text-sm text-text`}>${inv.subtotal.toLocaleString()}</td>
            <td className={`${TD_CLASS} text-xs text-text-3`}>${inv.hst.toLocaleString()}</td>
            <td className={`${TD_CLASS} text-sm text-brand font-bold`}>${inv.total.toLocaleString()}</td>
            <td className={`${TD_CLASS} text-xs`} style={{color:daysOverdue>0?C.danger:C.text3}}>{inv.due}{daysOverdue>0?t("employer.staffing.overdueSuffix",{days:daysOverdue}):""}</td>
            <td className={TD_CLASS}><Tag tone={invoiceTone(inv.status)} sm>{t("enums.invoiceStatus."+inv.status)}</Tag></td>
          </tr>;})}
          {invoices.length===0&&<tr><td colSpan={7} className="p-5"><Empty icon="file" title={allInvoices.length?t("employer.staffing.noInvoicesInRangeTitle"):t("employer.staffing.noInvoicesYetTitle")}
            body={allInvoices.length?t("employer.staffing.tryClearingFilter"):t("employer.staffing.invoicesAppearHere")}/></td></tr>}
        </tbody>
      </table></div>
    </Card>
    <Pagination {...pg}/>
  </Page>;
}

/* ─── Client: view active assignments ─── */
export function EmpStaffingAssignments(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t}=useTranslation();
  const client=A.staffingClientByEmployerId(A.company?.id);
  const list=client?A.clientAssignments(client.id).sort((a,b)=>b.startDate.localeCompare(a.startDate)):[];
  const pg=usePagination(list,18);
  if(!client)return <Page><Empty icon="activity" title={t("employer.staffing.notClientTitle")} body={t("employer.staffing.notClientBody")}/></Page>;

  return <Page wide>
    <H1 sub={t("employer.staffing.assignmentsSub")}>{t("employer.staffing.assignmentsTitle")}</H1>
    <div className="grid gap-3" style={{gridTemplateColumns:mob?"1fr":"repeat(auto-fill,minmax(340px,1fr))"}}>
      {pg.pageItems.map(a=>{const w=A.worker(a.worker); const person=w?(A.people||[]).find(p=>p.id===w.personId):null;
        return <Card key={a.id} pad={mob?18:22} style={{borderRadius:14}}>
          <div className="flex gap-3 items-center mb-3">
            <SmartPortrait seed={person?.seed||0} size={44} radius={11}/>
            <div className="flex-1 min-w-0">
              <div className="text-base font-bold text-text">{person?.name||"—"}</div>
              <div className="text-xs text-text-3 mt-1">{t("employer.staffing.sinceDate",{date:a.startDate})}</div>
            </div>
            <Tag tone={a.status==="active"?"ok":"neutral"} sm>{t("enums.assignmentStatus."+a.status)}</Tag>
          </div>
          <div className="text-xs text-text-2 leading-relaxed">
            <div>{a.site}</div>
            <div>{t("employer.staffing.supervisorLabel",{name:a.supervisor})}</div>
            <div>{a.shiftPattern}</div>
            <div className="mt-2 pt-2 border-t border-line-soft text-brand font-bold">{t("employer.staffing.billRateSuffix",{rate:`$${a.billRate}`})}</div>
          </div>
        </Card>;})}
      {list.length===0&&<div className="col-span-full"><Empty icon="activity" title={t("employer.staffing.noAssignmentsTitle")} body={t("employer.staffing.noAssignmentsBody")}/></div>}
    </div>
    <Pagination {...pg}/>
  </Page>;
}

export function EmpStaffingRequests(){
  const A=use(); const mob=useMedia("(max-width: 900px)"); const {t}=useTranslation();
  const client=A.staffingClientByEmployerId(A.company?.id);
  const orders=client?A.jobOrders.filter(j=>j.client===client.id).sort((a,b)=>b.createdAt-a.createdAt):[];
  const pg=usePagination(orders,18);
  if(!client)return <Page><Empty icon="plus" title={t("employer.staffing.notClientTitle")} body={t("employer.staffing.notClientBody")}/></Page>;

  return <Page wide>
    <H1 sub={t("employer.staffing.requestsSub")}>{t("employer.staffing.requestsTitle")}</H1>
    <div className="grid gap-3" style={{gridTemplateColumns:mob?"1fr":"repeat(auto-fill,minmax(340px,1fr))"}}>
      {pg.pageItems.map(jo=><Card key={jo.id} pad={mob?18:22} style={{borderRadius:14}}>
        <div className="flex gap-2 mb-2.5 flex-wrap">
          <Tag tone={jo.urgency==="high"?"danger":jo.urgency==="medium"?"warn":"neutral"} sm>{t("enums.urgency."+jo.urgency)}</Tag>
          <Tag tone={jo.status==="open"?"brand":jo.status==="filled"?"ok":"neutral"} sm>{t("enums.jobOrderStatus."+jo.status)}</Tag>
        </div>
        <div className="text-base font-bold text-text tracking-tight">{jo.title}</div>
        <div className="text-xs text-text-2 mt-1">{jo.location.split(" — ").pop()} · {t("employer.staffing.startsDate",{date:jo.startDate})}</div>
        <div className="mt-3 pt-3 border-t border-line-soft flex justify-between text-xs">
          <span className="text-text-3">{t("employer.staffing.filledLabel")}</span>
          <span className="text-brand font-bold">{jo.filled} / {jo.positions}</span>
        </div>
      </Card>)}
      {orders.length===0&&<div className="col-span-full"><Empty icon="briefcase" title={t("employer.staffing.noRequestsTitle")} body={t("employer.staffing.noRequestsBody")}/></div>}
    </div>
    <Pagination {...pg}/>
  </Page>;
}
