// Market events: CPI, FOMC, holidays and so on. The admin uploads one JSON file; every user reads it. Pure logic, no DOM.
//
// File format (v1):  { "v": 1, "updated": "2026-11-09", "events": [
//   { "date": "2026-11-10", "time": "08:30", "kind": "cpi", "title": "CPI (Oct)", "status": "scheduled" } ] }
// time is a New York wall-clock time (how BLS, BEA and the Fed publish them); closed days have none, early closes use it as the closing time.
// status is "scheduled" (default), "rescheduled" or "canceled"; optional: was (the old date), url (https only).

/** Every kind of event, how it is labelled, and which filter group it belongs to. */
export const KINDS={
  cpi:{label:'CPI',group:'inflation'},ppi:{label:'PPI',group:'inflation'},pce:{label:'PCE',group:'inflation'},
  jobs:{label:'Jobs report',group:'jobs'},jolts:{label:'JOLTS',group:'jobs'},gdp:{label:'GDP',group:'gdp'},
  fomc:{label:'FOMC decision',group:'fed'},minutes:{label:'FOMC minutes',group:'fed'},
  closed:{label:'Market closed',group:'session'},'early-close':{label:'Early close',group:'session'}
};
/** Filter groups shown to the user. Sessions (closed days, early closes) are always shown, so they are not a filter. */
export const GROUPS={fed:'Fed',inflation:'Inflation',jobs:'Jobs',gdp:'GDP'};
export const STATUSES=['scheduled','rescheduled','canceled'];
/** Hard limits. The security rules enforce the event count; the rest protect the page and the 1 MiB document. */
export const LIMITS={events:3000,bytes:800000,title:120,url:300};

const EVENT_KEYS=['date','time','kind','title','status','was','url'];
const DATE=/^\d{4}-\d{2}-\d{2}$/,TIME=/^([01]\d|2[0-3]):[0-5]\d$/;
const isDate=s=>{if(typeof s!=='string'||!DATE.test(s))return false;const[y,m,d]=s.split('-').map(Number),t=new Date(Date.UTC(y,m-1,d));
  return y>=2000&&y<=2100&&t.getUTCFullYear()===y&&t.getUTCMonth()===m-1&&t.getUTCDate()===d};
const isHttps=s=>{if(typeof s!=='string'||s.length>LIMITS.url)return false;try{return new URL(s).protocol==='https:'}catch{return false}};
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
// Own keys only: "constructor" or "toString" must not count as a kind just because every object inherits them.
const isKind=k=>typeof k==='string'&&Object.prototype.hasOwnProperty.call(KINDS,k);
export const kindLabel=k=>isKind(k)?KINDS[k].label:String(k);

/** Problems with one event, as short sentences. Empty = fine. */
function eventProblems(e){
  if(!plain(e))return['is not an object'];
  const p=[],extra=Object.keys(e).filter(k=>!EVENT_KEYS.includes(k));
  if(extra.length)p.push(`has unknown field${extra.length>1?'s':''} ${extra.join(', ')}`);
  if(!isDate(e.date))p.push('needs a real date like 2026-11-10');
  if(!isKind(e.kind))p.push(`has an unknown kind "${String(e.kind).slice(0,30)}"`);
  const needsTime=e.kind!=='closed';
  if(e.time===undefined||e.time===''){if(needsTime&&isKind(e.kind))p.push('needs a time like 08:30 (New York time)')}
  else if(!TIME.test(String(e.time)))p.push('has a time that is not HH:MM');
  else if(e.kind==='closed')p.push('is a closed day, so it must not have a time');
  if(typeof e.title!=='string'||!e.title.trim())p.push('needs a title');
  else if(e.title.trim().length>LIMITS.title)p.push(`has a title over ${LIMITS.title} characters`);
  else if(/[\u0000-\u001f]/.test(e.title))p.push('has control characters in the title');
  if(e.status!==undefined&&!STATUSES.includes(e.status))p.push(`has an unknown status "${String(e.status).slice(0,20)}"`);
  if(e.was!==undefined&&!isDate(e.was))p.push('has a "was" that is not a real date');
  if(e.url!==undefined&&!isHttps(e.url))p.push('has a url that is not https');
  return p;
}

/**
 * Everything the admin's file has to pass before it is uploaded. Treats the text as hostile: strict shape, real dates, allowed values only.
 * Returns {ok, errors (the first 5), errorCount, doc, summary}. doc is the cleaned, sorted document to store (updated is stamped with today).
 */
export function validateEvents(text,today){
  const fail=list=>({ok:false,errors:list.slice(0,5),errorCount:list.length});
  if(text.length>LIMITS.bytes)return fail([`The file is ${Math.round(text.length/1000)} KB; the limit is ${Math.round(LIMITS.bytes/1000)} KB.`]);
  let raw;try{raw=JSON.parse(text)}catch(e){return fail(['This is not valid JSON: '+String(e.message).slice(0,120)])}
  if(!plain(raw))return fail(['The file must be a JSON object like {"v":1,"events":[…]}.']);
  const errors=[];
  const extra=Object.keys(raw).filter(k=>!['v','updated','events'].includes(k));
  if(extra.length)errors.push(`The file has unknown top-level field${extra.length>1?'s':''}: ${extra.join(', ')}.`);
  if(raw.v!==1)errors.push('"v" must be 1.');
  if(raw.updated!==undefined&&!isDate(raw.updated))errors.push('"updated" must be a real date like 2026-11-09 (or leave it out).');
  if(!Array.isArray(raw.events))return fail([...errors,'"events" must be a list.']);
  if(raw.events.length>LIMITS.events)errors.push(`There are ${raw.events.length} events; the limit is ${LIMITS.events}.`);
  const seen=new Set(),events=[];
  raw.events.forEach((e,i)=>{
    const where=`Event ${i+1}${plain(e)&&isDate(e.date)?` (${e.date} ${String(e.kind).slice(0,20)})`:''}`;
    const p=eventProblems(e);
    if(p.length){p.forEach(m=>errors.push(`${where} ${m}.`));return}
    const clean={date:e.date,kind:e.kind,title:e.title.trim(),status:e.status||'scheduled'};
    if(e.time)clean.time=e.time;if(e.was)clean.was=e.was;if(e.url)clean.url=e.url;
    const key=[clean.date,clean.time||'',clean.kind,clean.title].join('|');
    if(seen.has(key)){errors.push(`${where} is a duplicate of an earlier event.`);return}
    seen.add(key);events.push(clean);
  });
  if(errors.length)return fail(errors);
  events.sort((a,b)=>a.date.localeCompare(b.date)||(a.time||'').localeCompare(b.time||'')||a.kind.localeCompare(b.kind)||a.title.localeCompare(b.title));
  const doc={v:1,updated:today,events};
  if(JSON.stringify(doc).length>LIMITS.bytes)return fail([`After cleaning, the document is still over ${Math.round(LIMITS.bytes/1000)} KB.`]);
  return{ok:true,errors:[],errorCount:0,doc,summary:summarize(doc)};
}

/** {n, from, to, byKind} for a stored document; from/to are '' when it has no events. */
export function summarize(doc){
  const ev=(doc&&doc.events)||[],byKind={};
  ev.forEach(e=>{byKind[e.kind]=(byKind[e.kind]||0)+1});
  return{n:ev.length,from:ev.length?ev[0].date:'',to:ev.length?ev[ev.length-1].date:'',byKind};
}

/** {'YYYY-MM-DD': [events]} with each day's events in time order. Closed days (no time) come first. */
export function indexByDate(doc){
  const out=Object.create(null);
  for(const e of (doc&&doc.events)||[])(out[e.date]||(out[e.date]=[])).push(e);
  for(const d in out)out[d].sort((a,b)=>(a.time||'').localeCompare(b.time||'')||a.kind.localeCompare(b.kind));
  return out;
}

/** The events from one date to another, inclusive ('YYYY-MM-DD' strings). */
export const eventsBetween=(doc,from,to)=>((doc&&doc.events)||[]).filter(e=>e.date>=from&&e.date<=to);
