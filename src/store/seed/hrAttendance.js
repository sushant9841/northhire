import { _fmtDate } from "../../helpers/utils.js";
import { HR_EMPLOYEES } from "./hrEmployees.js";

/* Punch-in/out records — last 14 days for a subset of employees */
const _daysBack=(n)=>{const d=new Date();d.setDate(d.getDate()-n);d.setHours(0,0,0,0);return d;};
const _makeAttendance=()=>{
  const out=[]; const wids=HR_EMPLOYEES.filter(e=>e.role==="employee"||e.role==="hr").map(e=>e.id);
  for(let day=1;day<=14;day++){
    const d=_daysBack(day);
    const dow=d.getDay();
    if(dow===0||dow===6)continue; /* skip weekends */
    wids.forEach(eid=>{
      /* 90% attendance rate */
      if(Math.random()>0.9)return;
      const inHour=7+Math.floor(Math.random()*3);
      const inMin=Math.floor(Math.random()*30);
      const outHour=15+Math.floor(Math.random()*3);
      const outMin=Math.floor(Math.random()*45);
      out.push({id:`att_${eid}_${_fmtDate(d)}`,employee:eid,date:_fmtDate(d),
        clockIn:`${String(inHour).padStart(2,"0")}:${String(inMin).padStart(2,"0")}`,
        clockOut:`${String(outHour).padStart(2,"0")}:${String(outMin).padStart(2,"0")}`,
        source:Math.random()>0.3?"web":"punch-machine",
        hours:Math.round((outHour+outMin/60-inHour-inMin/60)*100)/100,
        site:eid.endsWith("2")||eid.endsWith("4")?"Field":"Head Office"});
    });
  }
  return out;
};

export const HR_ATTENDANCE=_makeAttendance();
