import {Panel} from '../components/Panel.js';
import {Chips} from '../components/Chips.js';
import {CardGrid} from '../components/StatCard.js';
import {DataTable} from '../components/DataTable.js';
import {ExportButton} from '../components/ExportButton.js';
import {analyze,pick} from '../lib/insights.js';
import {m,sg,sgk,cls,esc} from '../lib/format.js';
import {isPhone} from '../lib/dom.js';
import {Empty} from './shared.js';

const pf=b=>b.gl?(b.gw/b.gl).toFixed(2):b.gw?'∞':'—';
const money=v=>isPhone()?sgk(v):sg(v);
const bucketTable=B=>DataTable({rows:B,cols:[{label:'Bucket',render:b=>esc(b.l)},{label:'Trades',key:'n'},{label:'Win %',render:b=>(b.w/b.n*100).toFixed(0)+'%'},
  {label:'Avg',render:b=>money(b.tot/b.n),tone:b=>cls(b.tot)},{label:'PF',render:pf},{label:'Total',render:b=>money(b.tot),tone:b=>cls(b.tot)}]});

export function insights({st,trades,fills,open}){
  if(!trades.length)return{html:Empty({view:'ins',files:st.UP.length,open})};
  const{net}=st,{G,get,drivers,sh,rf,cm}=analyze({st,trades,fills});
  const hl=(label,B,best)=>{const b=pick(B,best);if(!b)return null;
    return{label,value:esc(b.l),tone:cls(b.tot),sub:`${sg(b.tot/b.n)} avg · ${(b.w/b.n*100).toFixed(0)}% win · ${b.n} trades`}};
  const html=`<div class="view-toolbar">${Chips({items:[['0','Gross'],['1','Net']],active:net?'1':'0',attr:'net'})}${ExportButton({attrs:'data-export="insights"',title:'Export these insights to Excel'})}</div>`
    +CardGrid([hl('Best time of day',get('Time of day'),1),hl('Worst time of day',get('Time of day'),0),hl('Best price band',get('Price band'),1),hl('Worst price band',get('Price band'),0)])
    +`<div class="two-column">${G.map(([n,B])=>Panel({title:n,body:bucketTable(B)})).join('')}</div>`
    +Panel({title:'Driver summary',hint:'widest gap in avg P&amp;L between buckets',body:drivers.map((d,i)=>`<div class="list-row"><span>${i+1}. ${d[0]}</span><b class="numeric">${m(d[1])}</b></div>`).join('')})
    +Panel({title:'Routing cost efficiency',hint:'every fill billed at the Take rate',body:CardGrid([
      {label:'Shares routed',value:sh.toLocaleString()},{label:'Routing fees',value:sg(rf),tone:cls(rf),sub:m(sh?rf/sh:0,4)+' / share'},
      {label:'Commissions',value:m(-cm),tone:'negative'},{label:'Break-even move',value:m(sh?(cm-rf)/sh*2:0,4),sub:'per share, round trip'}])});
  return{html};
}
