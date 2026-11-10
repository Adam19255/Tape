import {sg,pc,dur,sum} from './format.js';
/**
 * What a share card says. Two builders, one shape, so drawing (lib/cardDraw.js) does not care what the card is about:
 *   { tone, tag, title, note, amount, sub:{text,color}, panel:{type:'boxes'|'list',...}, footer, shareTitle, filename }
 * Pure: no DOM. Trade-level facts only (never balance or email), so a card is safe to send to anyone.
 */
const TAGS={win:'WIN',loss:'LOSS',even:'EVEN'};
const toneOf=n=>n>0?'win':n<0?'loss':'even';
const parts=date=>date.split('-').map(Number);
const hhmm=t=>String(t.s0||'').slice(0,5);
const fileName=bits=>bits.filter(Boolean).join('-').replace(/[^\w.-]+/g,'_')+'.png';

/** One trade, formatted exactly like the Trades table. */
export function tradeCardModel(t){
  const tone=toneOf(t.net),cost=t.entry*t.qty,[y,mo,d]=parts(t.date);
  return{
    tone,tag:TAGS[tone],title:t.sym,note:t.dir>0?'LONG':'SHORT',amount:sg(t.net),
    sub:{text:(cost?pc(t.net/cost*100):'—')+' return',color:'tone'},
    panel:{type:'boxes',items:[['Entry',t.entry.toFixed(4)],['Exit',t.exit.toFixed(4)],['Shares',t.qty.toLocaleString('en-US')],['Held',dur(t.t1-t.t0)]]},
    footer:new Date(y,mo-1,d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}), // always English, like the rest of the app
    shareTitle:`${t.sym} ${TAGS[tone]}`,
    filename:fileName(['tape',t.sym,t.date,hhmm(t).replace(':','')])
  };
}

/** The list panel has room for this many lines. A busier day shows the first ones in time order, then "+N more trades". */
export const DAY_CARD_ROWS=5;

/** Every trade of one day (all with the same date): net for the day, W/L count, and a mini list of the trades. */
export function dayCardModel(day){
  const trades=[...day].sort((a,b)=>a.t0-b.t0),n=trades.length,net=sum(trades.map(t=>t.net));
  const won=trades.filter(t=>t.net>0).length,lost=trades.filter(t=>t.net<0).length,tone=toneOf(net);
  const shown=n>DAY_CARD_ROWS?trades.slice(0,DAY_CARD_ROWS-1):trades;
  const date=trades[0].date,[y,mo,d]=parts(date),when=new Date(y,mo-1,d);
  return{
    tone,tag:TAGS[tone],
    title:when.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}),note:String(y),
    amount:sg(net),
    sub:{text:`${n} ${n===1?'trade':'trades'} · ${won}W ${lost}L`,color:'muted'},
    panel:{type:'list',rows:shown.map(t=>({time:hhmm(t),sym:t.sym,amount:sg(t.net),tone:toneOf(t.net)})),more:n-shown.length},
    footer:'Daily recap',
    shareTitle:`${when.toLocaleDateString('en-US',{month:'short',day:'numeric'})} ${TAGS[tone]}`,
    filename:fileName(['tape','day',date])
  };
}
