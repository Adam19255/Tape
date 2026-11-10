import {esc} from '../lib/format.js';
import {kindTone} from '../lib/events.js';
/**
 * days: {'YYYY-MM-DD': {value, sub, label, noted}}. marks: {'YYYY-MM-DD': [event, ...]}.
 * Days with trades or market events become buttons when interactive is true. A Week total with trades becomes a button too.
 * The caller decides what a click does; this component only renders HTML from its props.
 */
const NOTE_MARK='<svg class="calendar-day-noted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h9"/></svg>';
const EVENT_CHIPS={cpi:'CPI',ppi:'PPI',pce:'PCE',jobs:'Jobs',jolts:'JOLTS',gdp:'GDP',fomc:'FOMC',minutes:'Minutes',closed:'Closed','early-close':'Early close'};
const eventDescription=e=>`${e.title}${e.time?` at ${e.time} ET`:''}${e.status&&e.status!=='scheduled'?`, ${e.status}`:''}`;
function eventMarks(events){
  const visible=events.slice(0,2).map(e=>`<span class="calendar-event-chip tone-${kindTone(e.kind)}" title="${esc(e.title)}">${esc(EVENT_CHIPS[e.kind]||e.kind)}</span>`).join('');
  const more=events.length>2?`<span class="calendar-event-more">+${events.length-2}</span>`:'';
  return`<span class="calendar-event-markers" aria-hidden="true">${visible}${more}</span><span class="calendar-event-dot tone-${kindTone(events[0]?.kind)}" aria-hidden="true"></span>`;
}
export function MonthGrid({year,month,days,marks={},fmt,weekFmt=fmt,interactive=false,weekdays=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']}){
  const key=year+'-'+String(month).padStart(2,'0'),n=new Date(year,month,0).getDate(),off=new Date(year,month-1,1).getDay();
  const C=[...Array(off).fill(0),...Array.from({length:n},(_,i)=>i+1)];while(C.length%7)C.push(0);
  const pad=d=>key+'-'+String(d).padStart(2,'0');
  let rows='';
  for(let i=0;i<C.length;i+=7){let wt=0,wn=0;
    rows+=C.slice(i,i+7).map(d=>{
      if(!d)return'<div class="calendar-day is-empty"></div>';
      const date=pad(d),x=days[date],events=marks[date]||[],hasEvents=events.length>0;
      if(x){wt+=x.value;wn++}
      const tag=interactive&&(x||hasEvents)?'button':'div';
      const descriptions=events.map(eventDescription);
      const label=[x&&x.label||new Date(year,month-1,d).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}),...descriptions].join('; ');
      const attrs=tag==='button'?` type="button" data-day="${date}" aria-label="${esc(label)}"${hasEvents?` title="${esc(descriptions.join(' · '))}"`:''}`:'';
      const tone=x?(x.value>=0?'is-gain':'is-loss'):'';
      const closed=events.some(e=>e.kind==='closed'),early=events.some(e=>e.kind==='early-close');
      const classes=['calendar-day',tone,hasEvents?'has-events':'',hasEvents&&!x?'is-event-only':'',closed?'is-market-closed':'',early?'is-early-close':''].filter(Boolean).join(' ');
      return`<${tag} class="${classes}"${attrs}><span class="calendar-day-number">${d}</span>${x?`<b class="calendar-day-value numeric">${fmt(x.value)}</b><span class="calendar-day-note">${x.sub||''}</span>${x.noted?NOTE_MARK:''}`:''}${hasEvents?eventMarks(events):''}</${tag}>`;
    }).join('')
      +weekCell(C.slice(i,i+7).filter(Boolean),{wt,wn,weekFmt,interactive,pad,year,month});}
  return`<div class="scroll-x"><div class="calendar-grid">${[...weekdays,'Total'].map(d=>`<div class="calendar-weekday">${d}</div>`).join('')}${rows}</div></div>`;
}

// The Week total at the end of a row. ds = the day numbers of that row that belong to this month.
function weekCell(ds,{wt,wn,weekFmt,interactive,pad,year,month}){
  const tone=wt>0?'positive':wt<0?'negative':'',value=wn?`<b class="calendar-day-value numeric ${tone}">${weekFmt(wt)}</b>`:'';
  const inner=`<span class="calendar-day-number">Week</span>${value}`,cls=`calendar-day calendar-week-total${wn?'':' is-blank'}`;
  if(!(interactive&&wn))return`<div class="${cls}">${inner}</div>`;
  const from=new Date(year,month-1,ds[0]).toLocaleDateString('en-US',{month:'short',day:'numeric'});
  return`<button type="button" class="${cls}" data-week="${pad(ds[0])}..${pad(ds[ds.length-1])}" aria-label="${esc(`Week of ${from}: ${weekFmt(wt)}`)}">${inner}</button>`;
}
