const id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(v);
const text=(v,max,required=false)=>typeof v==='string'&&v.length<=max&&(!required||v.trim().length>0);
export function validDate(v){
 if(typeof v!=='string'||!/^(20\d{2}|2100)-\d{2}-\d{2}$/.test(v))return false;
 const [y,m,d]=v.split('-').map(Number),date=new Date(Date.UTC(y,m-1,d));
 return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d;
}
export const validCard=c=>!!c&&id(c.id)&&text(c.name,60,true)&&text(c.issuer??'',60)&&typeof(c.last4??'')==='string'&&/^(?:\d{4})?$/.test(c.last4??'');
export const validSubscription=s=>!!s&&id(s.id)&&text(s.name,80,true)&&Number.isSafeInteger(s.cents)&&s.cents>0&&s.cents<=999999900&&['monthly','yearly'].includes(s.cycle)&&validDate(s.date)&&(s.card===''||id(s.card));
export function validateState(raw,fallback='en'){
 const value={lang:['th','en'].includes(raw?.lang)?raw.lang:fallback,cards:[],subs:[],paid:[],read:[]};
 let damaged=!raw||!['th','en'].includes(raw.lang);
 const collection=(key,max)=>{if(!Array.isArray(raw?.[key])||raw[key].length>max){damaged=true;return [];}return raw[key];};
 const cardIds=new Set(),subIds=new Set();
 for(const c of collection('cards',5000)){
  if(!validCard(c)||cardIds.has(c.id)){damaged=true;continue;}
  cardIds.add(c.id);value.cards.push({id:c.id,name:c.name,issuer:c.issuer??'',last4:c.last4??''});
 }
 for(const s of collection('subs',5000)){
  if(!validSubscription(s)||subIds.has(s.id)){damaged=true;continue;}
  subIds.add(s.id);if(s.card&&!cardIds.has(s.card))damaged=true;
  value.subs.push({id:s.id,name:s.name,cents:s.cents,cycle:s.cycle,date:s.date,card:cardIds.has(s.card)?s.card:''});
 }
 for(const key of ['paid','read']){
  for(const entry of collection(key,100000)){
   if(typeof entry!=='string'){damaged=true;continue;}
   const [sub,date,...rest]=entry.split(':');
   if(!id(sub)||!subIds.has(sub)||!validDate(date)||rest.length){damaged=true;continue;}
   value[key].push(entry);
  }
  value[key]=[...new Set(value[key])];
 }
 return {value,damaged};
}
