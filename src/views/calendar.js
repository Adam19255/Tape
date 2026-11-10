import {Panel} from '../components/Panel.js';
import {Select} from '../components/Form.js';
import {MonthGrid} from '../components/MonthGrid.js';
import {ExportButton} from '../components/ExportButton.js';
import {sg,sgk,cls,sum,ymd} from '../lib/format.js';
import {isPhone} from '../lib/dom.js';
import {longDate} from '../lib/daySummary.js';
import {indexByDate} from '../lib/events.js';
import {latest,Empty} from './shared.js';

export function calendar({st,trades,open}){
  const eventIndex=indexByDate(st.EV),hasEvents=Object.keys(eventIndex).length>0;
  if(!trades.length&&!hasEvents)return{html:Empty({open})};
  const fallback=trades.length?latest(trades):ymd(new Date());
  const mon=st.mon||fallback.slice(0,7),[y,mo]=mon.split('-').map(Number),days={};
  trades.filter(t=>t.date.startsWith(mon)).forEach(t=>{const d=days[t.date]||(days[t.date]={value:0,n:0});d.value+=t.net;d.n++;d.sub=d.n+' trade'+(d.n>1?'s':'')});
  Object.entries(days).forEach(([date,d])=>{const nt=st.NT['day:'+date]||{};d.noted=!!(nt.n||(nt.tags||[]).length);
    d.label=`${longDate(date)}: ${sg(d.value)}, ${d.sub}${d.noted?', has a note':''}`});
  const mt=sum(Object.values(days).map(x=>x.value));
  const dates=[...trades.map(t=>t.date),...(st.EV?.events||[]).map(e=>e.date)];
  const years=dates.map(date=>+date.slice(0,4));
  const Y0=Math.min(y,...years),Y1=Math.max(y,...years);
  const months=Array.from({length:12},(_,i)=>[i+1,new Date(2000,i,1).toLocaleDateString('en-US',{month:'long'})]);
  const head=`<div class="calendar-header"><button data-m="-1" aria-label="Previous month">‹</button>${Select({options:months,value:mo,attrs:'data-mm',label:'Month'})}${Select({options:Array.from({length:Y1-Y0+1},(_,i)=>Y0+i),value:y,attrs:'data-yy',label:'Year'})}<button data-m="1" aria-label="Next month">›</button><div class="calendar-summary"><span class="numeric ${cls(mt)}">${mt?sg(mt):''}</span>${ExportButton({attrs:'data-export="calendar"',title:'Export this month and daily results to Excel'})}</div></div>`;
  return{html:Panel({body:head+MonthGrid({year:y,month:mo,days,marks:eventIndex,fmt:isPhone()?sgk:sg,weekFmt:sg,interactive:true})})};
}
