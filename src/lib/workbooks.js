import {buildXlsx} from './xlsx.js';
import {analyze,pick} from './insights.js';
import {sum} from './format.js';
/**
 * Calendar and Insights as shareable workbooks. Pure: trades in, sheet specs out (see lib/xlsx.js for the cell format).
 * Money is stored as real numbers with a number format, so the recipient can sort, filter and add them up.
 */
const GREEN='0A8F5A',RED='D7263D',MUTED='76787F',GAIN_BG='E3F4EC',LOSS_BG='FBE5E8',HEAD_BG='F1F1EE';
const PNL='+"$"#,##0.00;-"$"#,##0.00;"$"0.00',USD='"$"#,##0.00',USD4='"$"#,##0.0000';
export const STYLES={
  title:{bold:true,size:14},label:{color:MUTED},labelR:{color:MUTED,align:'right'},bold:{bold:true},
  head:{bold:true,bg:HEAD_BG,line:true},headR:{bold:true,bg:HEAD_BG,line:true,align:'right'},headC:{bold:true,bg:HEAD_BG,line:true,align:'center'},
  pnl:{fmt:PNL},pnlPos:{fmt:PNL,color:GREEN},pnlNeg:{fmt:PNL,color:RED},usd:{fmt:USD},usd4:{fmt:USD4},
  int:{fmt:'#,##0'},pct:{fmt:'0%'},intL:{fmt:'#,##0',align:'left'},pctL:{fmt:'0%',align:'left'},
  sumPnl:{fmt:PNL,align:'left'},sumPnlPos:{fmt:PNL,color:GREEN,align:'left'},sumPnlNeg:{fmt:PNL,color:RED,align:'left'},ratio:{fmt:'0.00',align:'right'},date:{fmt:'yyyy-mm-dd',align:'left'},
  totLabel:{bold:true,bg:HEAD_BG},totInt:{bold:true,bg:HEAD_BG,fmt:'#,##0'},totPct:{bold:true,bg:HEAD_BG,fmt:'0%'},totPnl:{bold:true,bg:HEAD_BG,fmt:PNL},
  calGain:{bold:true,fmt:PNL,color:GREEN,bg:GAIN_BG,align:'center'},calLoss:{bold:true,fmt:PNL,color:RED,bg:LOSS_BG,align:'center'},
  calWeek:{bold:true,fmt:PNL,bg:HEAD_BG,align:'center'},calWeekPos:{bold:true,fmt:PNL,color:GREEN,bg:HEAD_BG,align:'center'},calWeekNeg:{bold:true,fmt:PNL,color:RED,bg:HEAD_BG,align:'center'}
};
// Day-number and trade-count cells take the tint of their day, so each calendar day reads as one block.
for(const[k,bg]of[['',undefined],['Gain',GAIN_BG],['Loss',LOSS_BG]]){
  STYLES['calNum'+k]={size:9,color:MUTED,bg,align:'left'};STYLES['calNote'+k]={size:9,color:MUTED,bg,align:'center'};
}
const tone=(v,base='pnl')=>v>0?base+'Pos':v<0?base+'Neg':base;
const serial=d=>{const[y,m,x]=d.split('-').map(Number);return Date.UTC(y,m-1,x)/864e5+25569}; // Excel date serial
const dow=d=>new Date(d+'T12:00').getDay();
const WEEKDAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const range=trades=>{const d=trades.map(t=>t.date).sort();return d.length?[d[0],d[d.length-1]]:['','']};
const plural=(n,w)=>n+' '+w+(n===1?'':'s');

/** One row per trading day, over every trade. */
function dailyRows(trades){
  const D={};
  trades.forEach(t=>{const d=D[t.date]||(D[t.date]={date:t.date,n:0,w:0,l:0,gross:0,cost:0,net:0});d.n++;d.gross+=t.gross;d.cost+=t.cost;d.net+=t.net;if(t.net>0)d.w++;else if(t.net<0)d.l++});
  return Object.values(D).sort((a,b)=>a.date<b.date?-1:1);
}

/** mon: 'YYYY-MM' (the month on screen). -> {name, sheets: [Calendar month grid, Daily list of every day on record]} */
export function calendarWorkbook({trades,mon}){
  const[y,mo]=mon.split('-').map(Number),all=dailyRows(trades),days=Object.fromEntries(all.filter(d=>d.date.startsWith(mon)).map(d=>[d.date,d]));
  const monthNet=sum(Object.values(days).map(d=>d.net)),n=new Date(y,mo,0).getDate(),off=new Date(y,mo-1,1).getDay();
  const cells=[...Array(off).fill(0),...Array.from({length:n},(_,i)=>i+1)];while(cells.length%7)cells.push(0);
  const grid=[[{v:new Date(y,mo-1,1).toLocaleDateString('en-US',{month:'long',year:'numeric'}),s:'title'},null,null,null,null,null,{v:'Month net P&L',s:'labelR'},{v:monthNet,s:tone(monthNet)}],[],
    [...WEEKDAYS.map(d=>({v:d,s:'headC'})),{v:'Week',s:'headC'}]];
  for(let i=0;i<cells.length;i+=7){
    const num=[],val=[],note=[];let wt=0,wn=0,wc=0;
    for(const d of cells.slice(i,i+7)){
      const x=d&&days[y+'-'+String(mo).padStart(2,'0')+'-'+String(d).padStart(2,'0')],k=x?(x.net>=0?'Gain':'Loss'):''; // a flat day counts as a gain, as on screen
      num.push(d?{v:d,s:'calNum'+k}:null);val.push(x?{v:x.net,s:'cal'+k}:null);note.push(x?{v:plural(x.n,'trade'),s:'calNote'+k}:null);
      if(x){wt+=x.net;wn++;wc+=x.n}
    }
    grid.push([...num,wn?{v:'Week',s:'calNum'}:null],[...val,wn?{v:wt,s:tone(wt,'calWeek')}:null],[...note,wn?{v:plural(wc,'trade'),s:'calNote'}:null]);
  }
  const N=all.length,last=N+1;let cum=0;
  const daily=[['Date','Day','Trades','Wins','Losses','Win %','Gross P&L','Costs','Net P&L','Cumulative net'].map((v,i)=>({v,s:i<2?'head':'headR'})),
    ...all.map((d,i)=>{cum+=d.net;return[{v:serial(d.date),s:'date'},WEEKDAYS[dow(d.date)],{v:d.n,s:'int'},{v:d.w,s:'int'},{v:d.l,s:'int'},{v:d.w/d.n,s:'pct'},
      {v:d.gross,s:tone(d.gross)},{v:-d.cost,s:tone(-d.cost)},{v:d.net,s:tone(d.net)},{v:cum,s:tone(cum)}]})];
  if(N){const T=k=>sum(all.map(d=>d[k]));
    daily.push([{v:'Total',s:'totLabel'},{s:'totLabel'},...['C','D','E'].map((c,i)=>({v:T(['n','w','l'][i]),s:'totInt',f:`SUM(${c}2:${c}${last})`})),{v:T('w')/T('n'),s:'totPct',f:`D${last+1}/C${last+1}`},
      {v:T('gross'),s:'totPnl',f:`SUM(G2:G${last})`},{v:-T('cost'),s:'totPnl',f:`SUM(H2:H${last})`},{v:T('net'),s:'totPnl',f:`SUM(I2:I${last})`},{s:'totLabel'}])}
  return{name:'tape-calendar-'+mon,sheets:[
    {name:'Calendar',rows:grid,widths:[13,13,13,13,13,13,13,13],grid:false},
    {name:'Daily',rows:daily,widths:[12,7,8,7,8,8,13,13,13,15],freeze:1,filter:1}]};
}

/** st.net picks Gross or Net, exactly as on the Insights tab. -> {name, sheets: [Summary, Breakdowns]} */
export function insightsWorkbook({st,trades,fills}){
  const{net}=st,{G,get,drivers,sh,rf,cm}=analyze({st,trades,fills}),basis=net?'Net':'Gross',[from,to]=range(trades),total=sum(trades.map(t=>net?t.net:t.gross)),wins=trades.filter(t=>(net?t.net:t.gross)>0).length;
  const h=(a,right=[])=>a.map((v,i)=>({v,s:right.includes(i)?'headR':'head'}));
  const hi=[['Best time of day','Time of day',1],['Worst time of day','Time of day',0],['Best price band','Price band',1],['Worst price band','Price band',0]]
    .map(([label,g,best])=>[label,pick(get(g),best)]).filter(x=>x[1])
    .map(([label,b])=>[label,b.l,{v:b.tot/b.n,s:tone(b.tot/b.n)},{v:b.w/b.n,s:'pct'},{v:b.n,s:'int'}]);
  const summary=[
    [{v:'Tape insights',s:'title'}],[],
    [{v:'Basis',s:'label'},basis+' P&L'+(net?' (after routing fees & commissions)':' (before costs)')],
    [{v:'Period',s:'label'},from===to?from:from+' → '+to],
    [{v:'Trades',s:'label'},{v:trades.length,s:'intL'}],
    [{v:'Win rate',s:'label'},{v:wins/trades.length,s:'pctL'}],
    [{v:'Total P&L',s:'label'},{v:total,s:tone(total,'sumPnl')}],[],
    [{v:'Highlights',s:'bold'}],h(['','Bucket','Avg per trade','Win %','Trades'],[2,3,4]),...hi,[],
    [{v:'Driver summary',s:'bold'},{v:'widest gap in avg P&L between buckets',s:'label'}],h(['Factor','','Gap'],[2]),
    ...drivers.map(([name,gap],i)=>[`${i+1}. ${name}`,null,{v:gap,s:'usd'}]),[],
    [{v:'Routing cost efficiency',s:'bold'},{v:'every fill billed at the Take rate',s:'label'}],h(['Measure','','Value'],[2]),
    ['Shares routed',null,{v:sh,s:'int'}],['Routing fees (+ rebate / − cost)',null,{v:rf,s:tone(rf)}],['Routing fees per share',null,{v:sh?rf/sh:0,s:'usd4'}],
    ['Commissions',null,{v:-cm,s:tone(-cm)}],['Break-even move per share, round trip',null,{v:sh?(cm-rf)/sh*2:0,s:'usd4'}]];
  // One flat table (not ten stacked ones) so the recipient can filter by factor or build a pivot.
  const rows=[h(['Factor','Bucket','Trades','Wins','Win %','Avg P&L','Profit factor','Total P&L'],[2,3,4,5,6,7])];
  for(const[factor,B]of G)for(const b of B)rows.push([factor,b.l,{v:b.n,s:'int'},{v:b.w,s:'int'},{v:b.w/b.n,s:'pct'},{v:b.tot/b.n,s:tone(b.tot)},
    b.gl?{v:b.gw/b.gl,s:'ratio'}:{v:b.gw?'∞':'',s:'ratio'},{v:b.tot,s:tone(b.tot)}]);
  return{name:`tape-insights-${basis.toLowerCase()}-${from}-to-${to}`,sheets:[
    {name:'Summary',rows:summary,widths:[38,34,16,10,10],grid:false},
    {name:'Breakdowns',rows,widths:[22,22,9,8,9,13,14,13],freeze:1,filter:1}]};
}

/** Workbook spec -> .xlsx bytes. */
export const toXlsx=w=>buildXlsx(w.sheets,STYLES);
export const XLSX_TYPE='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
