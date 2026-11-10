import {DataTable} from '../components/DataTable.js';
import {NoteEditor} from '../components/NoteEditor.js';
import {ShareButton} from '../components/ShareButton.js';
import {daySummary,rangeSummary,neighbours,longDate} from '../lib/daySummary.js';
import {indexByDate,kindLabel,kindTone} from '../lib/events.js';
import {fromMarketTime} from '../lib/time.js';
import {esc,sg,cls,m,ymd} from '../lib/format.js';

// The calendar's two modals. Neither is a tab, so they are not in main.js's VIEWS: they return {title, body, nav?, actions?}
// and main.js renders them into #modal (via components/Modal.js) instead of #view.

const hhmm=t=>String(t.s0||'').slice(0,5);
const plural=(n,w)=>`${n} ${w}${n===1?'':'s'}`;
const parts=date=>date.split('-').map(Number);
const dayOf=date=>{const[y,mo,d]=parts(date);return new Date(y,mo-1,d)};
const shortDay=date=>dayOf(date).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
const monthDay=date=>dayOf(date).toLocaleDateString('en-US',{month:'short',day:'numeric'});
const dateLabel=date=>dayOf(date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});

// The big number and the lines under it, shared by both modals. line is e.g. "2 trades · 1W · 1L".
const summary=(s,line)=>`<div class="modal-summary"><b class="modal-net numeric ${cls(s.net)}">${sg(s.net)}</b><span class="modal-note">${line}</span><span class="modal-note numeric">gross ${sg(s.gross)} · costs ${m(-s.cost)}</span></div>`;

function marketEvents(events){
  if(!events.length)return'';
  const rows=events.map(e=>{
    const time=e.time?(()=>{const t=fromMarketTime(e.date,e.time);const shift=t.dayShift?` (${t.dayShift>0?'+':'−'}${Math.abs(t.dayShift)} day${Math.abs(t.dayShift)===1?'':'s'})`:'';return`<span class="market-event-time">${esc(t.local)} · ${esc(t.et)} ET${shift}</span>`})():'';
    const status=e.status&&e.status!=='scheduled'?`<span class="market-event-status is-${esc(e.status)}">${esc(e.status==='rescheduled'?'Rescheduled':'Canceled')}</span>`:'';
    const was=e.was?`<span class="market-event-was">was ${esc(dateLabel(e.was))}</span>`:'';
    const title=e.url?`<a href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">${esc(e.title)}</a>`:esc(e.title);
    return`<li class="market-event-row tone-${kindTone(e.kind)}"><div class="market-event-heading"><strong>${title}</strong><span class="market-event-kind">${esc(kindLabel(e.kind))}</span>${status}</div><div class="market-event-meta">${time}${was}</div></li>`;
  }).join('');
  return`<section class="market-event-section"><h3 class="modal-section-title">Market events</h3><ul class="market-event-list">${rows}</ul><p class="market-event-legend">Times are shown in your local time, followed by New York time (ET). Badges mark rescheduled or canceled events.</p></section>`;
}

/**
 * A trading day or an event-only day: summary, trades, market events, then the day's tags and note.
 * Day notes live in the same notes map as trade notes, under the key 'day:YYYY-MM-DD', which can't collide with a trade key.
 * Returns null when the day has neither trades nor market events.
 */
export function dayModal({trades,st},date){
  const d=daySummary(trades,date),events=indexByDate(st.EV)[date]||[];
  if(!d&&!events.length)return null;
  const table=d?DataTable({rows:d.trades,cols:[
    {label:'Time',render:hhmm},
    {label:'Symbol',render:t=>`<b>${esc(t.sym)}</b>`},
    {label:'Side',render:t=>`<span class="pill ${t.dir>0?'pill-long':'pill-short'}">${t.dir>0?'LONG':'SHORT'}</span>`},
    {label:'Qty',key:'qty'},
    {label:'Net',render:t=>sg(t.net),tone:t=>cls(t.net)}]}):'<p class="hint">No trades this day.</p>';
  const key='day:'+date,nt=st.NT[key]||{};
  const eventUpdated=st.EV?.updated?`Last updated: ${dateLabel(st.EV.updated)}`:'';
  return{title:longDate(date),nav:d?{...neighbours(trades,date),noun:'day'}:null,
    body:(d?summary(d,`${plural(d.n,'trade')} · ${d.won}W · ${d.lost}L`):'')+table+marketEvents(events)
      +NoteEditor({noteKey:key,tags:nt.tags||[],text:nt.n||'',placeholder:'How the day went, what mattered, what you would repeat…'}),
    footerNote:eventUpdated,
    actions:d?ShareButton({label:'Share day',attrs:`data-share-day="${esc(date)}"`,title:`Share day: all ${plural(d.n,'trade')} from ${date} as an image`})
      +`<button data-open-trades="${esc(date)}" title="Show this day's trades in the Trades tab">Open in Trades</button>`:''};
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
