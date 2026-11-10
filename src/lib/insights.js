import {agg} from './stats.js';
import {band,sum} from './format.js';
/** Insight buckets and the analysis behind the Insights tab. Pure, so the screen and the Excel export share one source. */
const TW=[[570,'<9:30 (pre)'],[600,'9:30–10:00'],[660,'10:00–11:00'],[720,'11:00–12:00'],[840,'12:00–14:00'],[900,'14:00–15:00'],[930,'15:00–15:30'],[960,'15:30–16:00'],[1e9,'>16:00 (AH)']];
const PB=[[5,'<$5'],[10,'$5–10'],[20,'$10–20'],[50,'$20–50'],[100,'$50–100'],[1e9,'$100+']];
const DU=[[60,'<1m'],[300,'1–5m'],[900,'5–15m'],[3600,'15m–1h'],[14400,'1–4h'],[1e9,'>4h']];
const SZ=[[1e3,'<$1k'],[5e3,'$1–5k'],[1e4,'$5–10k'],[5e4,'$10–50k'],[1e5,'$50–100k'],[1e9,'>$100k']];
const SP=[[2,'Tight (≤1¢)'],[6,'Normal (2–5¢)'],[16,'Wide (6–15¢)'],[1e9,'Very wide (>15¢)']];
const DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],labels=a=>a.map(x=>x[1]);

/** Best (best=true) or worst bucket by average P&L per trade, or null when there are none. */
export const pick=(B,best)=>B&&B.length?[...B].sort((x,y)=>(best?-1:1)*(x.tot/x.n-y.tot/y.n))[0]:null;

/** -> {G: [[group name, buckets]], get(name), drivers: [[name, gap]], sh: shares, rf: routing fees, cm: commissions} */
export function analyze({st,trades,fills}){
  const{net,NT}=st,pn=t=>net?t.net:t.gross,T=[...trades].sort((a,b)=>a.date===b.date?a.t0-b.t0:a.date<b.date?-1:1),perDay={},info=new Map();
  T.forEach(t=>perDay[t.date]=(perDay[t.date]||0)+1);
  T.forEach((t,i)=>{const p=T[i-1];info.set(t,{pw:p&&pn(p)>0,pl:p&&pn(p)<0,first:!p||p.date!==t.date,dn:perDay[t.date]})});
  const spread=t=>{const[b,a]=(t.mkt||'').split('/').map(parseFloat),c=Math.round((a-b)*100);return isNaN(c)?null:band(c,SP)};
  const behavior=t=>{const i=info.get(t);return[i.pw?'Post-win':i.pl?'Post-loss':0,i.first?'First trade of day':'Later trades',i.dn<=3?'Low-volume day (1–3)':i.dn<=10?'Mid-volume day (4–10)':'High-volume day (>10)'].filter(Boolean)};
  const G=[['Time of day',t=>band(t.t0/60,TW),labels(TW)],['Price band',t=>band(t.entry,PB),labels(PB)],['Day of week',t=>DOW[new Date(t.date+'T12:00').getDay()],DOW],
    ['Trade duration',t=>band(t.t1-t.t0,DU),labels(DU)],['Position size',t=>band(t.entry*t.qty,SZ),labels(SZ)],['Long vs short',t=>t.dir>0?'Long':'Short'],
    ['Venue',t=>t.ven],['Entry spread',spread],['Strategy tags',t=>(NT[t.key]||{}).tags||[]],['Behavioral patterns',behavior]
  ].map(([n,f,o])=>[n,agg(T,f,net,o)]).filter(x=>x[1].length);
  const get=n=>(G.find(x=>x[0]===n)||[])[1];
  const drivers=G.map(([n,B])=>[n,B.length>1?Math.max(...B.map(b=>b.tot/b.n))-Math.min(...B.map(b=>b.tot/b.n)):0]).sort((a,b)=>b[1]-a[1]);
  return{G,get,drivers,sh:sum(fills.map(f=>f.qty)),rf:sum(trades.map(t=>t.rf)),cm:sum(trades.map(t=>t.cm))};
}
