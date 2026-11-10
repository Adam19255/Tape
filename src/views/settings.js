import {Panel} from '../components/Panel.js';
import {Field,Select} from '../components/Form.js';
import {DataTable} from '../components/DataTable.js';
import {CardGrid} from '../components/StatCard.js';
import {MarketEvents} from '../components/MarketEvents.js';
import {ExportButton} from '../components/ExportButton.js';
import {esc,m,sg,cls,ymd,sum} from '../lib/format.js';

export function settings({st,trades,fills}){
  const{CFG,UP}=st,unk=[...new Set(fills.map(f=>f.vm).filter(v=>!CFG.sched[v]))];
  const logs=UP.map(u=>`<div class="list-row"><span class="list-row-label">${esc(u.name)} · ${u.n||u.fills.length} fills</span><span class="list-row-actions">${ExportButton({attrs:`data-export-log="${esc(u.id)}"`,title:u.txt?'Export '+u.name:'Re-upload this file to export it (its text was not stored)',disabled:!u.txt})}<button data-del="${esc(u.id)}">Delete</button></span></div>`).join('');
  const rate=(i,j,v)=>`<input type="number" step="0.0001" data-s="${i}|${j}" value="${v}">`;
  const sched=DataTable({rows:Object.keys(CFG.sched).map((v,i)=>({v,i,r:CFG.sched[v]})),cols:[{label:'Venue',render:x=>esc(x.v)},
    {label:'Add',render:x=>rate(x.i,0,x.r[0])},{label:'Take',render:x=>rate(x.i,1,x.r[1])},{label:'Out',render:x=>rate(x.i,2,x.r[2])}]});
  const F=CFG.funds||{start:0,entries:[]},entries=[...F.entries].sort((a,b)=>a.date<b.date?1:a.date>b.date?-1:0);
  // Moved here from the dashboard. Fees are totals over every trade: Settings has no timeframe, so they don't follow the dashboard's.
  const dep=sum(F.entries.filter(f=>f.type!=='withdrawal').map(f=>f.amount)),wd=sum(F.entries.filter(f=>f.type==='withdrawal').map(f=>f.amount)),
    rf=sum(trades.map(t=>t.rf)),cm=sum(trades.map(t=>t.cm));
  const summary=CardGrid([
    {label:'Net funds',value:m((Number(F.start)||0)+dep-wd),sub:`${m(dep)} in · ${m(wd)} out`},
    {label:'Routing fees',value:sg(rf),sub:'all time · + rebate / − cost',tone:cls(rf)},
    {label:'Commissions',value:m(-cm),sub:`all time · ${CFG.ver}`,tone:'negative'}]);
  const ledger=entries.length?DataTable({rows:entries,cols:[{label:'Date',key:'date'},{label:'Type',render:f=>f.type==='withdrawal'?'Withdrawal':'Deposit'},
    {label:'Amount',render:f=>sg(f.type==='withdrawal'?-f.amount:f.amount),tone:f=>f.type==='withdrawal'?'negative':'positive'},{label:'Note',render:f=>esc(f.note||'')},
    {label:'',render:f=>`<button data-fund-del="${esc(f.id)}" aria-label="Delete ${esc(f.date)} entry">Delete</button>`}]}):'<p class="hint">No deposits or withdrawals yet.</p>';
  const funds=Panel({title:'Account funds',hint:'drives the account value and % return on the dashboard',body:
    Field({label:'Starting balance ($)',attrs:'data-fund-start',value:F.start,step:'100'})
    +`<p class="hint">What the account held before your first imported trade. Later money in or out goes in the ledger below.</p><h3>Add a deposit or withdrawal</h3>
    <div class="fund-form">${Field({label:'Date',attrs:'data-fund-field="date"',value:ymd(new Date()),type:'date'})}
    <label class="field">Type${Select({options:[['deposit','Deposit'],['withdrawal','Withdrawal']],value:'deposit',attrs:'data-fund-field="type"',label:'Type'})}</label>
    ${Field({label:'Amount ($)',attrs:'data-fund-field="amount"',step:'0.01'})}${Field({label:'Note (optional)',attrs:'data-fund-field="note"',type:'text'})}
    <p class="negative" data-fund-error hidden></p><button class="primary" data-fund-add>Add entry</button></div>
    <h3>Ledger</h3>${ledger}`});
  const html=summary+funds+`<div class="two-column">`
    +Panel({body:`<h3>Default commissions</h3>${Field({label:'Per-share rate ($)',attrs:'data-c="cr"',value:CFG.cr,step:'0.0001'})}${Field({label:'Minimum per fill ($)',attrs:'data-c="cm"',value:CFG.cm,step:'0.01'})}
      <h3>Monthly goals</h3>${Field({label:'Net profit target ($)',attrs:'data-c="gp"',value:CFG.gp,step:'100'})}${Field({label:'Trade count target',attrs:'data-c="gt"',value:CFG.gt,step:'1'})}
      ${Field({label:'Fee schedule version',attrs:'data-c="ver"',value:CFG.ver,type:'text'})}`})
    +Panel({body:`<h3>Venue mapping</h3><textarea data-map rows="4">${Object.entries(CFG.map).map(([a,b])=>a+'='+b).join('\n')}</textarea><p class="hint">One per line: broker code = schedule venue.</p>${unk.length?`<p class="negative">No rates for: ${unk.map(esc).join(', ')}</p>`:''}<h3>Imported logs</h3><div class="scroll-list">${logs}</div>`})
    +`</div>`
    +MarketEvents({current:st.EV,admin:st.isAdmin,draft:st.evDraft})
    +Panel({title:'Fee schedule',hint:'$ per share, + rebate / − cost',body:sched+`<p class="hint">Per fill: routing = shares × Take rate; commission = max(shares × rate, minimum); net = gross + routing − commissions. Add and Out are stored but not applied.</p><button data-rs>Reset to defaults</button>`});
  return{html};
}
