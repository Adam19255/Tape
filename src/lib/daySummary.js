import {sum} from './format.js';

/** 'YYYY-MM-DD' -> "Tue, Nov 3, 2026". Built from the parts so a time zone can never shift the day. */
export const longDate=date=>{const[y,mo,d]=date.split('-').map(Number);
  return new Date(y,mo-1,d).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'})};

// Totals for any list of trades.
const totals=list=>({n:list.length,net:sum(list.map(t=>t.net)),gross:sum(list.map(t=>t.gross)),cost:sum(list.map(t=>t.cost)),
  won:list.filter(t=>t.net>0).length,lost:list.filter(t=>t.net<0).length});

/** Every date that has trades, oldest first. */
export const tradingDays=trades=>[...new Set(trades.map(t=>t.date))].sort();

/** The trading days either side of date ('' at either end), across all months. */
export function neighbours(trades,date){
  const days=tradingDays(trades),i=days.indexOf(date);
  return{prev:i>0?days[i-1]:'',next:i>=0&&i<days.length-1?days[i+1]:''};
}

/**
 * One trading day, ready to show: totals plus its trades in the order they were opened.
 * trades = every trade (from buildTrades); date = 'YYYY-MM-DD'. Returns null when nothing was traded that day.
 */
export function daySummary(trades,date){
  const day=trades.filter(t=>t.date===date).sort((a,b)=>a.t0-b.t0);
  return day.length?{date,trades:day,...totals(day)}:null;
}

/**
 * Everything between two dates, inclusive: totals plus one daySummary per trading day.
 * The calendar's Week total only counts days inside the displayed month, and so does this, so the two always agree.
 */
export function rangeSummary(trades,from,to){
  const inside=trades.filter(t=>t.date>=from&&t.date<=to);
  return inside.length?{from,to,days:tradingDays(inside).map(d=>daySummary(inside,d)),...totals(inside)}:null;
}
