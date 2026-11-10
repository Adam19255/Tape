import {DataTable} from '../components/DataTable.js';
import {daySummary,longDate} from '../lib/daySummary.js';
import {esc,sg,cls,m} from '../lib/format.js';

const hhmm=t=>String(t.s0||'').slice(0,5);
const plural=(n,w)=>`${n} ${w}${n===1?'':'s'}`;

/**
 * Content of the day modal: {title, body}, or null when nothing was traded that day.
 * A shorter cut of the Trades tab: time, symbol, side, qty and net for every trade of the day.
 * Not a tab, so it is the one view main.js does not list in VIEWS; it is rendered into #modal instead of #view.
 */
export function dayModal({trades},date){
  const d=daySummary(trades,date);if(!d)return null;
  const table=DataTable({rows:d.trades,cols:[
    {label:'Time',render:hhmm},
    {label:'Symbol',render:t=>`<b>${esc(t.sym)}</b>`},
    {label:'Side',render:t=>`<span class="pill ${t.dir>0?'pill-long':'pill-short'}">${t.dir>0?'LONG':'SHORT'}</span>`},
    {label:'Qty',key:'qty'},
    {label:'Net',render:t=>sg(t.net),tone:t=>cls(t.net)}]});
  const summary=`<div class="modal-summary"><b class="modal-net numeric ${cls(d.net)}">${sg(d.net)}</b>`
    +`<span class="modal-note">${plural(d.n,'trade')} · ${d.won}W · ${d.lost}L</span>`
    +`<span class="modal-note numeric">gross ${sg(d.gross)} · costs ${m(-d.cost)}</span></div>`;
  return{title:longDate(date),body:summary+table};
}
