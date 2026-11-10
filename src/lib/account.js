/**
 * Account value over time. Pure: no DOM, no Firebase.
 * funds = { start, entries: [{ id, date: 'YYYY-MM-DD', type: 'deposit' | 'withdrawal', amount > 0, note }] }  (lives in cfg.funds)
 * Account value = starting balance + deposits - withdrawals + net P&L of closed trades (after fees). Realised P&L only.
 */
import {ymd} from './format.js';
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY=864e5;
export const startOfDay=ymd=>new Date(ymd+'T00:00:00').getTime();
export const noFunds=f=>!f||(!f.start&&!(f.entries||[]).length);

/** Every change to the account, oldest first: a trade closing (P&L) or a deposit/withdrawal (cash flow). */
export function accountEvents(trades,funds){
  const ev=[];
  for(const t of trades)ev.push({t:startOfDay(t.date)+t.t1*1000,date:t.date,kind:'trade',delta:t.net,pnl:t.net,flow:0,trade:t});
  for(const f of(funds&&funds.entries)||[]){const s=f.type==='withdrawal'?-1:1;ev.push({t:startOfDay(f.date),date:f.date,kind:f.type==='withdrawal'?'withdrawal':'deposit',delta:s*f.amount,pnl:0,flow:s*f.amount,fund:f})}
  return ev.sort((a,b)=>a.t-b.t);
}

/** Chart points [{t, v, e}] for the window [from, to]: a point at `from` carrying the earlier value, one per event, one at `to`. */
export function accountSeries(events,start,from,to){
  let v=Number(start)||0,v0=v;const pts=[];
  for(const e of events){if(e.t<from){v+=e.delta;v0=v}else if(e.t<=to){v+=e.delta;pts.push({t:e.t,v,e})}}
  const last=pts.length?pts[pts.length-1].t:from;
  return[{t:from,v:v0},...pts,...(last<to?[{t:to,v}]:[])];
}

/**
 * What the chart draws when each point should be one DAY, not one trade. Takes the full per-trade series `pts` (from accountSeries) and returns
 *   points: the opening value (placed a day before the window so the first day has a line to climb from), then one point per calendar day with
 *           a trade or a deposit/withdrawal, carrying the account value at that day's close, placed at that date;
 *   ref:    ref[i] is the index into `pts` that drawn point i stands for. The last day maps to the final `pts` entry (the "now" point), so
 *           hovering it gives exactly the same figures as the range summary.
 * Returns are still computed on `pts`, through ref, so grouping changes what is drawn and never a number.
 */
export function dailyPoints(pts){
  const open=new Date(pts[0].t);open.setDate(open.getDate()-1);
  const points=[{x:+open,y:pts[0].v,date:ymd(open)}],ref=[0];
  for(let i=1;i<pts.length;i++){
    const e=pts[i].e;if(!e)continue;
    const last=points[points.length-1];
    if(points.length>1&&last.date===e.date){last.y=pts[i].v;ref[ref.length-1]=i} // same day: the later event is the close
    else{points.push({x:startOfDay(e.date),y:pts[i].v,date:e.date});ref.push(i)}
  }
  if(points.length>1)ref[ref.length-1]=pts.length-1;
  else{points.push({x:startOfDay(ymd(new Date(pts[pts.length-1].t))),y:pts[pts.length-1].v,date:ymd(new Date(pts[pts.length-1].t))});ref.push(pts.length-1)} // quiet window: a flat line
  return{points,ref};
}

/**
 * Return between chart points lo..hi (Modified Dietz, the usual portfolio method):
 * gain / (value at lo + net deposits weighted by how long they were invested). pct is null when no money is at work.
 */
export function returnBetween(pts,lo,hi){
  const a=pts[lo],b=pts[hi],span=b.t-a.t;let gain=0,flow=0,w=0;
  for(let i=lo+1;i<=hi;i++){const e=pts[i].e;if(!e)continue;gain+=e.pnl;flow+=e.flow;w+=e.flow*(span>0?(b.t-pts[i].t)/span:1)}
  const base=a.v+w;
  return{gain,flow,change:b.v-a.v,from:a.v,to:b.v,pct:base>0?gain/base*100:null};
}

/** Axis labels for [a, b] (timestamps): hours inside a day or two, days up to ~2 months, then month starts. daily: points are whole days, so never label hours. */
export function timeTicks(a,b,max=6,daily=false){
  const span=b-a,out=[];if(!(span>0))return out;
  const at=(y,mo,d,h=0)=>new Date(y,mo,d,h);
  if(span>62*DAY){
    const all=[];let d=at(new Date(a).getFullYear(),new Date(a).getMonth()+1,1);
    while(+d<=b){all.push(d);d=at(d.getFullYear(),d.getMonth()+1,1)}
    const step=Math.max(1,Math.ceil(all.length/max));
    all.forEach((d,i)=>{if(i%step===0)out.push({x:+d,text:MONTHS[d.getMonth()]+(d.getMonth()===0?' ’'+String(d.getFullYear()).slice(2):'')})});
  }else if(span>2*DAY||daily){
    const step=Math.max(1,Math.ceil(span/DAY/max)),s=new Date(a);
    for(let d=at(s.getFullYear(),s.getMonth(),s.getDate()+(span>2*DAY?1:0));+d<=b;d=at(d.getFullYear(),d.getMonth(),d.getDate()+step))out.push({x:+d,text:MONTHS[d.getMonth()]+' '+d.getDate()});
  }else{
    const hrs=span/36e5,step=[1,2,3,4,6,12].find(s=>hrs/s<=max)||12,s=new Date(a);
    let d=at(s.getFullYear(),s.getMonth(),s.getDate(),s.getHours()+1);
    while(d.getHours()%step)d=at(d.getFullYear(),d.getMonth(),d.getDate(),d.getHours()+1);
    for(;+d<=b;d=at(d.getFullYear(),d.getMonth(),d.getDate(),d.getHours()+step))out.push({x:+d,text:String(d.getHours()).padStart(2,'0')+':00'});
  }
  return out;
}
