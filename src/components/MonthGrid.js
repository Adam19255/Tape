import {esc} from '../lib/format.js';
/**
 * days: {'YYYY-MM-DD': {value, sub, label, noted}}. Colours days by sign and adds a weekly total; noted adds a small note marker.
 * interactive: days that have data become <button data-day="YYYY-MM-DD" aria-label=label>, and a Week total that has trades becomes
 * <button data-week="FIRST..LAST"> (the first and last day of that row inside this month). The caller decides what a click does.
 */
const NOTE_MARK='<svg class="calendar-day-noted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h9"/></svg>';
export function MonthGrid({year,month,days,fmt,weekFmt=fmt,interactive=false,weekdays=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']}){
  const key=year+'-'+String(month).padStart(2,'0'),n=new Date(year,month,0).getDate(),off=new Date(year,month-1,1).getDay();
  const C=[...Array(off).fill(0),...Array.from({length:n},(_,i)=>i+1)];while(C.length%7)C.push(0);
  const pad=d=>key+'-'+String(d).padStart(2,'0');
  let rows='';
  for(let i=0;i<C.length;i+=7){let wt=0,wn=0;
    rows+=C.slice(i,i+7).map(d=>{if(!d)return'<div class="calendar-day is-empty"></div>';const date=pad(d),x=days[date];if(x){wt+=x.value;wn++}
      const tag=x&&interactive?'button':'div',attrs=tag==='button'?` type="button" data-day="${date}" aria-label="${esc(x.label||date)}"`:'';
      return`<${tag} class="calendar-day ${x?(x.value>=0?'is-gain':'is-loss'):''}"${attrs}><span class="calendar-day-number">${d}</span>${x?`<b class="calendar-day-value numeric">${fmt(x.value)}</b><span class="calendar-day-note">${x.sub||''}</span>${x.noted?NOTE_MARK:''}`:''}</${tag}>`}).join('')
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
