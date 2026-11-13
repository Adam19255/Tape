import {Chips} from '../components/Chips.js';
import {Panel} from '../components/Panel.js';
import {CardGrid} from '../components/StatCard.js';
import {Meter} from '../components/Progress.js';
import {mountLineChart} from '../components/LineChart.js';
import {stats} from '../lib/stats.js';
import {m,sg,pc,cls,dur,sum,esc,ymd,ym} from '../lib/format.js';
import {isPhone} from '../lib/dom.js';
import {accountEvents,accountSeries,dailyPoints,returnBetween,timeTicks,startOfDay,noFunds} from '../lib/account.js';
import {latest,Empty,OpenHint} from './shared.js';

export const TIMEFRAMES=['1D','5D','1M','3M','6M','YTD','1Y','All'];
const EMPTY={'1D':'today','5D':'the last 5 days','1M':'the last month','3M':'the last 3 months','6M':'the last 6 months',YTD:'this year','1Y':'the last year'};
const TF_LABEL={'1D':'Today','5D':'Past 5 days','1M':'Past month','3M':'Past 3 months','6M':'Past 6 months',YTD:'Year to date','1Y':'Past year',All:'All time'};
/** First day (YYYY-MM-DD) of a timeframe, counted back from today. '' means "since the beginning". */
export const timeframeStart=(tf,now=new Date())=>{
  const ago=(n,mo)=>{const d=new Date(now);mo?d.setMonth(d.getMonth()-n):d.setDate(d.getDate()-n);return ymd(d)};
  return{'1D':ymd(now),'5D':ago(4),'1M':ago(1,1),'3M':ago(3,1),'6M':ago(6,1),YTD:ymd(now).slice(0,4)+'-01-01','1Y':ago(12,1),All:''}[tf];
};
const pctSigned=r=>r.pct==null?'':` (${r.pct<0?'−':''}${Math.abs(r.pct).toFixed(2)}%)`; // a loss reads −$12.00 (−1.23%)
const changeText=r=>sg(r.gain)+pctSigned(r);
// Always English, whatever the browser's language. Time is added only where a date alone cannot tell points apart.
const stamp=(t,time)=>{const d=new Date(t),day=d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  return time?day+', '+d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}):day};

export function dashboard({st,trades,fills,open}){
  const{CFG,UP,tf}=st,tabs=Chips({items:TIMEFRAMES,active:tf,attr:'tf',cls:'range-tabs'});
  if(!trades.length)return{html:Empty({view:'dash',files:UP.length,open})};
  const now=new Date(),T=trades.filter(t=>t.date>=timeframeStart(tf,now));
  // Account value over time: starting balance + deposits - withdrawals + closed-trade P&L. Always built from the full history,
  // then cut to the chosen window, so the value at the left edge is what the account really held then.
  const funds=CFG.funds||{start:0,entries:[]},events=accountEvents(trades,funds),to=+now,today0=startOfDay(ymd(now));
  const first=events.length?startOfDay(ymd(new Date(events[0].t))):today0;
  const from=Math.max(tf==='All'?first:startOfDay(timeframeStart(tf,now)),first);
  const pts=accountSeries(events,funds.start,from,to),RANGE=returnBetween(pts,0,pts.length-1);
  const dayPts=accountSeries(events,funds.start,today0,to),TODAY=returnBetween(dayPts,0,dayPts.length-1);
  const change=(r,label)=>`<div class="hero-change numeric ${cls(r.gain)}">${changeText(r)}<span class="hero-change-label">${label}</span></div>`;
  // The idle change lines and the hover line share one slot, so the page never jumps while you scrub.
  const hero=()=>`<div class="hero"><span class="hero-label">Account value</span><div class="hero-value numeric">${m(pts[pts.length-1].v)}</div><div class="hero-changes"><div class="hero-idle">${change(TODAY,'Today')}${tf==='1D'?'':change(RANGE,TF_LABEL[tf])}</div><div class="hero-change hero-scrub numeric" aria-hidden="true"></div></div>${noFunds(funds)?'<p class="hint hero-hint">Add your starting balance and deposits in <button class="link-button" data-tab="set">Settings</button> to see returns in %.</p>':''}</div>`;
  const chartPanel=Panel({cls:'chart-panel',body:`<div data-chart="equity"></div>${tabs}<p class="hint chart-hint">Hover a point, or press and drag to measure a range</p>`});
  // Inside a day or two the time is what tells points apart (same cut-off as the hourly axis labels); deposits sit at midnight, so they show the date only.
  // The chart draws one point per trading day, except on the 1D tab where a single day would collapse to nothing, so there each trade stays a point.
  // It only changes what is drawn: full(i) maps a drawn point back to the exact per-trade series, so every $ and % below is computed as before.
  const daily=tf!=='1D',DP=daily?dailyPoints(pts):null;
  const chartPts=daily?DP.points:pts.map(p=>({x:p.t,y:p.v})),full=i=>daily?DP.ref[i]:i;
  const intraday=!daily&&pts[pts.length-1].t-pts[0].t<=2*864e5,sameDay=(x,y)=>new Date(x).toDateString()===new Date(y).toDateString();
  const timed=i=>intraday&&i>0&&(!pts[i].e||pts[i].e.kind==='trade'),when=i=>stamp(chartPts[i].x,timed(i));
  const mount=root=>{
    const heroEl=root.querySelector('.hero'),value=heroEl.querySelector('.hero-value'),line=heroEl.querySelector('.hero-scrub'),idle=value.textContent;
    mountLineChart(root.querySelector('[data-chart="equity"]'),{
      points:chartPts,baseline:pts[0].v,ticks:timeTicks(chartPts[0].x,chartPts[chartPts.length-1].x,6,daily),compact:isPhone(),label:'Account value',
      renderPoint:i=>`<span>${when(i)}</span>`,
      renderRange:(lo,hi)=>{const r=returnBetween(pts,full(lo),full(hi)),end=timed(hi)&&sameDay(pts[lo].t,pts[hi].t)?new Date(pts[hi].t).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}):when(hi);
        return`<div class="tooltip-dates">${when(lo)} → ${end}</div><div class="tooltip-change ${cls(r.gain)}">${changeText(r)}</div>`},
      // The big number follows the pointer. One point: change since the start of the range. Two points: change between them.
      onScrub:(a,b)=>{const r=a===b?returnBetween(pts,0,full(b)):returnBetween(pts,full(Math.min(a,b)),full(Math.max(a,b)));
        value.textContent=m(pts[full(b)].v);line.textContent=changeText(r);line.className='hero-change hero-scrub numeric '+cls(r.gain);heroEl.classList.add('is-scrubbing')},
      onEnd:()=>{value.textContent=idle;heroEl.classList.remove('is-scrubbing')}
    });
  };
  if(!T.length)return{html:hero()+chartPanel+Panel({body:`No trades for ${EMPTY[tf]}. Your most recent trade was on ${latest(trades)}.`}),mount};
  const S=stats(T,true),g=sum(T.map(t=>t.gross));
  const D={};T.forEach(t=>D[t.date]=(D[t.date]||0)+t.net);const dv=Object.values(D);
  const mu=S.net/S.n,sd=Math.sqrt(sum(S.pl.map(x=>(x-mu)**2))/(S.n-1||1)),sqn=sd?Math.sqrt(S.n)*mu/sd:0;
  const month=ym(now),MT=trades.filter(t=>t.date.slice(0,7)===month),mp=sum(MT.map(t=>t.net));
  const goals=[CFG.gp&&Meter({label:'Net profit · '+month,text:`<b>${m(mp)}</b> / ${m(CFG.gp)}`,value:mp/CFG.gp*100}),
               CFG.gt&&Meter({label:'Trades · '+month,text:`<b>${MT.length}</b> / ${CFG.gt}`,value:MT.length/CFG.gt*100})].filter(Boolean).join('');
  const unk=[...new Set(fills.map(f=>f.vm).filter(v=>!CFG.sched[v]))];
  const cards=[
    ['Win rate',S.wr.toFixed(1)+'%',`${S.wn}W · ${S.ln}L`,S.wr>=50?'positive':'negative'],
    ['Profit factor',S.pf===Infinity?'∞':S.pf.toFixed(2),'gross profit ÷ gross loss',S.pf>=1?'positive':'negative'],
    ['Expectancy',sg(S.exp),'net per trade',cls(S.exp)],['Avg win',m(S.aw),'net','positive'],['Avg loss',S.al?m(-S.al):'—','net',S.al?'negative':''],
    ['Payoff ratio',S.pay.toFixed(2),'avg win ÷ avg loss',''],['Largest win',m(S.best),'','positive'],['Largest loss',m(S.worst),'',S.worst<0?'negative':''],
    ['SQN',S.n>1?sqn.toFixed(2):'—','√n × mean ÷ σ',''],
    ['Gross P&L',sg(g),'before costs',cls(g)],
    ['Best day',m(Math.max(...dv)),'','positive'],['Worst day',m(Math.min(...dv)),'',Math.min(...dv)<0?'negative':''],['Green days',dv.filter(x=>x>0).length+'/'+dv.length,'',''],
    ['Avg hold',dur(Math.round(S.hold)),'',''],['Avg return',pc(S.ar),'per trade',cls(S.ar)],
    ['Shares traded',S.shares.toLocaleString(),m(S.vol,0)+' notional','']
  ].map(([label,value,sub,tone])=>({label,value,sub,tone}));
  const html=hero()+chartPanel
    +(UP.some(u=>!u.txt)?'<p class="negative">Some logs were imported before the venue-matching fix. Re-upload them to recalculate fees.</p>':'')
    +(unk.length?`<p class="negative">No fee rates for ${unk.map(esc).join(', ')} — routing billed at $0. Map it in Settings.</p>`:'')
    +(goals?Panel({cls:'goal-meters',body:goals}):'')
    +CardGrid(cards)+OpenHint(open);
  return{html,mount};
}
