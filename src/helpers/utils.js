export const uid=p=>p+Math.random().toString(36).slice(2,9);
export const money=n=>"$"+n.toLocaleString();
export const pay=j=>j.unit==="yr"?`$${Math.round(j.lo/1000)}k – $${Math.round(j.hi/1000)}k`:j.unit==="mi"?`$${j.lo.toFixed(2)} – $${j.hi.toFixed(2)}`:`$${j.lo} – $${j.hi}`;
export const payUnit=j=>j.unit==="yr"?"per year":j.unit==="mi"?"per mile":"per hour";
export const payShort=j=>j.unit==="yr"?"/yr":j.unit==="mi"?"/mi":"/hr";
export const annual=j=>j.unit==="yr"?j.lo:j.unit==="hr"?Math.round(j.lo*2080):Math.round(j.lo*110000);
export const dlText=d=>d<=0?"Closed":d===1?"Closes today":d<=7?`${d} days left`:`${d} days left`;
export const _ago=ms=>Date.now()-ms;
export const _fmtDate=d=>d.toISOString().slice(0,10);
export const _weekAgo=(n)=>{const d=new Date(); d.setDate(d.getDate()-n*7); return _fmtDate(d);};
export const _dayAgo=(n)=>{const d=new Date(); d.setDate(d.getDate()-n); return _fmtDate(d);};
export const _dayFromNow=(n)=>{const d=new Date(); d.setDate(d.getDate()+n); return _fmtDate(d);};
export const _weekStart=(offsetWeeks=0)=>{const d=new Date(); d.setDate(d.getDate()-((d.getDay()+6)%7)-offsetWeeks*7); return _fmtDate(d);};
export const nowStamp=()=>{const d=new Date();return d.toLocaleTimeString("en-CA",{hour:"2-digit",minute:"2-digit"});};
/* Multi-word-tolerant text search: every word in the query must appear somewhere across the
   given text fields, in any order - a plain single .includes() call fails on word order or
   extra whitespace ("electrician red seal" wouldn't match "Red Seal Electrician"). */
export const matchesQuery=(query,...fields)=>{
  const q=query.trim().toLowerCase(); if(!q)return true;
  const haystack=fields.join(" ").toLowerCase();
  return q.split(/\s+/).every(word=>haystack.includes(word));
};
