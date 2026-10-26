export function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function parseDate(value) {const [y,m,d]=value.split('-').map(Number);return new Date(y,m-1,d);}
export function occurrence(sub,offset) {
  const base=parseDate(sub.date);
  const month=base.getMonth()+offset*(sub.cycle==='yearly'?12:1);
  const end=new Date(base.getFullYear(),month+1,0);
  return new Date(end.getFullYear(),end.getMonth(),Math.min(base.getDate(),end.getDate()));
}
export function monthBills(subs,month) {
  const start=new Date(month.getFullYear(),month.getMonth(),1),end=new Date(month.getFullYear(),month.getMonth()+1,1);
  return subs.flatMap(sub=>{
    const base=parseDate(sub.date);
    const delta=(start.getFullYear()-base.getFullYear())*12+start.getMonth()-base.getMonth();
    const offset=Math.max(0,Math.floor(delta/(sub.cycle==='yearly'?12:1)));
    return [offset,offset+1].map(i=>occurrence(sub,i)).filter(d=>d>=start&&d<end).map(d=>({...sub,due:dateKey(d),key:`${sub.id}:${dateKey(d)}`}));
  }).sort((a,b)=>a.due.localeCompare(b.due));
}
export function upcoming(subs,today=new Date()) {
  const start=parseDate(dateKey(today));
  return subs.map(sub=>{
    const base=parseDate(sub.date),delta=(start.getFullYear()-base.getFullYear())*12+start.getMonth()-base.getMonth();
    let offset=Math.max(0,Math.floor(delta/(sub.cycle==='yearly'?12:1)));
    let due=occurrence(sub,offset); if(due<start) due=occurrence(sub,++offset);
    return {...sub,due:dateKey(due)};
  }).sort((a,b)=>a.due.localeCompare(b.due));
}
export function notifications(subs,today=new Date()) {
  const start=parseDate(dateKey(today));
  const prev=new Date(start.getFullYear(),start.getMonth()-1,1);
  const next=new Date(start.getFullYear(),start.getMonth()+1,1);
  return [prev,start,next].flatMap(m=>monthBills(subs,m)).filter(b=>{
    const days=Math.round((parseDate(b.due)-start)/86400000);
    return days>=-7&&days<=3;
  }).sort((a,b)=>b.due.localeCompare(a.due));
}
