import {ShareButton} from '../components/ShareButton.js';
import {Panel} from '../components/Panel.js';
import {DataTable} from '../components/DataTable.js';
import {Pager} from '../components/Pager.js';
import {m,sg,pc,cls,dur,esc} from '../lib/format.js';
import {Empty} from './shared.js';

export const PAGE_SIZES=[10,25,50,100];
/** Newest first, filtered by the search box (symbol or tag). */
export const filterTrades=(st,trades)=>{const s=st.q.toLowerCase();
  return trades.filter(t=>!s||t.sym.toLowerCase().includes(s)||t.date.includes(s)||((st.NT[t.key]||{}).tags||[]).some(g=>g.toLowerCase().includes(s))).reverse()};

const fillsTable=t=>DataTable({rows:t.fl,cols:[{label:'Time',key:'t'},{label:'Side',key:'side',tone:f=>f.side==='BOT'?'positive':'negative'},{label:'Qty',key:'qty'},{label:'Price',render:f=>f.px.toFixed(4)},
  {label:'Venue',render:f=>`<span title="${esc(f.vr)}">${esc(f.vm)}</span>`},{label:'Routing',render:f=>sg(f.rf),tone:f=>cls(f.rf)},{label:'Comm.',render:f=>m(-f.cm),tone:()=>'negative'}]});
const costBox=(t,ver)=>{const r=(l,v,c='',x='')=>`<div class="cost-row ${x}"><span>${l}</span><b class="${c}">${v}</b></div>`;
  return`<h3>Cost accounting <small>· ${esc(ver)}</small></h3>`+r('Gross P&amp;L',sg(t.gross),cls(t.gross))+r('Routing '+(t.rf>0?'(rebate)':''),sg(t.rf),cls(t.rf))+r('Commissions',m(-t.cm),'negative')+r('Net P&amp;L',sg(t.net),cls(t.net),'is-total')};
const detail=(t,{NT,CFG},dayCount=1)=>{const nt=NT[t.key]||{};
  // Accessible names start with the visible label ("Share trade", "Share day") so voice control works.
  const share=ShareButton({label:'Share trade',attrs:`data-share-trade="${esc(t.key)}"`,title:`Share trade: ${t.sym} as an image`})
    +(dayCount>1?ShareButton({label:'Share day',attrs:`data-share-day="${esc(t.date)}"`,title:`Share day: all ${dayCount} trades from ${t.date} as an image`}):'');
  return`<div class="detail-actions">${share}</div><div class="two-column"><div><h3>Execution log</h3>${fillsTable(t)}</div><div>${costBox(t,CFG.ver)}</div></div>
  <h3>Tags</h3><div class="tag-list">${(nt.tags||[]).map(g=>`<span class="tag">${esc(g)}<button data-rt="${esc(g)}" aria-label="Remove tag">×</button></span>`).join('')}<input data-tag placeholder="New tag, Enter…"></div>
  <h3>Notes</h3><textarea data-note rows="3" placeholder="Setup, mindset, what you’d do differently…">${esc(nt.n||'')}</textarea>`};

/** Paged trade log (also re-rendered alone while searching/paging). */
export function tradeList({st,trades}){
  const A=filterTrades(st,trades);if(!A.length)return'<p class="hint">No matching trades.</p>';
  const{ps}=st,pages=Math.max(1,Math.ceil(A.length/ps)),pg=Math.min(Math.max(1,st.pg),pages),a=(pg-1)*ps,rows=A.slice(a,a+ps);
  const ret=t=>pc(t.net/(t.entry*t.qty)*100);
  return DataTable({rows,rowClass:()=>'row-clickable',rowAttrs:t=>`data-exp="${esc(t.key)}"`,detail:t=>st.exp===t.key?detail(t,st,trades.filter(x=>x.date===t.date).length):'',cols:[
    {label:'Date',render:t=>`${t.date} <span class="hide-on-phone">${t.s0}</span>`},{label:'Symbol',render:t=>`<b>${esc(t.sym)}</b>`},
    {label:'Side',render:t=>`<span class="pill ${t.dir>0?'pill-long':'pill-short'}">${t.dir>0?'LONG':'SHORT'}</span>`},{label:'Qty',key:'qty',cls:'hide-on-phone'},
    {label:'Entry',render:t=>t.entry.toFixed(4),cls:'hide-on-phone'},{label:'Exit',render:t=>t.exit.toFixed(4),cls:'hide-on-phone'},{label:'Hold',render:t=>dur(t.t1-t.t0),cls:'hide-on-phone'},
    {label:'Gross',render:t=>sg(t.gross),tone:t=>cls(t.gross),cls:'hide-on-phone'},{label:'Costs',render:t=>m(-t.cost),cls:'hide-on-phone'},
    {label:'Net',render:t=>`<b>${sg(t.net)}</b>`,tone:t=>cls(t.net)},{label:'Return',render:ret,tone:t=>cls(t.net)}]})
    +Pager({page:pg,pages,size:ps,sizes:PAGE_SIZES,total:A.length,from:a+1,to:a+rows.length});
}
export function trades(ctx){
  const{st,trades:T,open}=ctx;if(!T.length)return{html:Empty({open})};
  const by={};T.forEach(t=>{const b=by[t.sym]||(by[t.sym]={sym:t.sym,n:0,w:0,p:0});b.n++;b.p+=t.net;if(t.net>0)b.w++});
  const symbols=DataTable({rows:Object.values(by).sort((a,b)=>b.p-a.p),rowAttrs:b=>`data-sym="${esc(b.sym)}"`,rowClass:b=>'row-clickable'+(st.q.toLowerCase()===b.sym.toLowerCase()?' is-selected':''),
    cols:[{label:'Symbol',render:b=>`<b>${esc(b.sym)}</b>`},{label:'Trades',key:'n'},{label:'Win %',render:b=>(b.w/b.n*100).toFixed(0)+'%'},
      {label:'Avg',render:b=>sg(b.p/b.n),tone:b=>cls(b.p)},{label:'Net',render:b=>sg(b.p),tone:b=>cls(b.p)}]});
  return{html:Panel({title:'By symbol',hint:'select a symbol to filter the log',body:`<div class="scroll-list">${symbols}</div>`})
    +Panel({body:`<input id="trade-search" class="search-input" value="${esc(st.q)}" placeholder="Search symbol, tag or date…" autocomplete="off"><div id="trade-list">${tradeList(ctx)}</div>`})};
}
