import {DataTable} from '../components/DataTable.js';
import {NoteEditor} from '../components/NoteEditor.js';
import {ShareButton} from '../components/ShareButton.js';
import {daySummary,rangeSummary,neighbours,longDate} from '../lib/daySummary.js';
import {esc,sg,cls,m,ymd} from '../lib/format.js';

// The calendar's two modals. Neither is a tab, so they are not in main.js's VIEWS: they return {title, body, nav?, actions?}
// and main.js renders them into #modal (via components/Modal.js) instead of #view.

const hhmm=t=>String(t.s0||'').slice(0,5);
const plural=(n,w)=>`${n} ${w}${n===1?'':'s'}`;
const parts=date=>date.split('-').map(Number);
const dayOf=date=>{const[y,mo,d]=parts(date);return new Date(y,mo-1,d)};
const shortDay=date=>dayOf(date).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
const monthDay=date=>dayOf(date).toLocaleDateString('en-US',{month:'short',day:'numeric'});

// The big number and the lines under it, shared by both modals. line is e.g. "2 trades · 1W · 1L".
const summary=(s,line)=>`<div class="modal-summary"><b class="modal-net numeric ${cls(s.net)}">${sg(s.net)}</b><span class="modal-note">${line}</span><span class="modal-note numeric">gross ${sg(s.gross)} · costs ${m(-s.cost)}</span></div>`;

/**
 * A trading day: summary, every trade (a shorter cut of the Trades tab), then the day's tags and note.
 * Day notes live in the same notes map as trade notes, under the key 'day:YYYY-MM-DD', which can't collide with a trade key.
 * Returns null when nothing was traded that day.
 */
export function dayModal({trades,st},date){
  const d=daySummary(trades,date);if(!d)return null;
  const table=DataTable({rows:d.trades,cols:[
    {label:'Time',render:hhmm},
    {label:'Symbol',render:t=>`<b>${esc(t.sym)}</b>`},
    {label:'Side',render:t=>`<span class="pill ${t.dir>0?'pill-long':'pill-short'}">${t.dir>0?'LONG':'SHORT'}</span>`},
    {label:'Qty',key:'qty'},
    {label:'Net',render:t=>sg(t.net),tone:t=>cls(t.net)}]});
  const key='day:'+date,nt=st.NT[key]||{};
  return{title:longDate(date),nav:{...neighbours(trades,date),noun:'day'},
    body:summary(d,`${plural(d.n,'trade')} · ${d.won}W · ${d.lost}L`)+table
      +NoteEditor({noteKey:key,tags:nt.tags||[],text:nt.n||'',placeholder:'How the day went, what mattered, what you would repeat…'}),
    actions:ShareButton({label:'Share day',attrs:`data-share-day="${esc(date)}"`,title:`Share day: all ${plural(d.n,'trade')} from ${date} as an image`})
      +`<button data-open-trades="${esc(date)}" title="Show this day's trades in the Trades tab">Open in Trades</button>`};
}

/**
 * A calendar week row. range is 'YYYY-MM-DD..YYYY-MM-DD': the first and last day of that row that fall inside the displayed month.
 * It covers exactly those days, so its total equals the Week cell; a partial row at a month edge says so.
 * Each day is a button that opens that day.
 */
export function weekModal({trades},range){
  const[from,to]=range.split('..'),w=rangeSummary(trades,from,to);if(!w)return null;
  const table=DataTable({rows:w.days,rowClass:()=>'row-clickable',rowAttrs:d=>`data-day="${d.date}"`,cols:[
    {label:'Day',render:d=>`<button class="modal-link" data-day="${d.date}">${shortDay(d.date)}</button>`},
    {label:'Trades',key:'n'},{label:'W / L',render:d=>`${d.won} / ${d.lost}`},
    {label:'Net',render:d=>sg(d.net),tone:d=>cls(d.net)}]});
  const start=dayOf(from);start.setDate(start.getDate()-start.getDay()); // the Sunday that row starts on
  const end=new Date(start.getFullYear(),start.getMonth(),start.getDate()+6);
  const partial=ymd(start)!==from||ymd(end)!==to;
  const month=dayOf(from).toLocaleDateString('en-US',{month:'long'});
  return{title:`${monthDay(from)}${from===to?'':'–'+dayOf(to).getDate()}, ${parts(from)[0]}`,
    body:summary(w,`${plural(w.n,'trade')} on ${plural(w.days.length,'day')} · ${w.won}W · ${w.lost}L`)
      +(partial?`<p class="hint">Only the days inside ${month}, to match the Week total on the calendar.</p>`:'')+table};
}
