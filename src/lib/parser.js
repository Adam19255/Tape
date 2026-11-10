import {sec} from './format.js';
/** Messages log text -> array of fills. */
export function parse(txt,date){
  const R=txt.split(/\r?\n/).map(l=>l.split('\t')),ls={},out=[];let lv='UNKNOWN';
  for(const c of R){
    if(!c[1]){const v=/(?:FROM|TO)\s+([A-Z0-9-]+)/i.exec(c[5]||''),y=/SHARES\s+(\S+)/i.exec(c[5]||'');if(v&&/^\d\d:/.test(c[0])){lv=v[1];if(y)ls[y[1].toUpperCase()]=v[1]}continue}
    if((c[1]!=='OPENING'&&c[1]!=='CLOSED')||!c[3])continue;
    const mm=/\b(BOT|SLD|BUY|SELL)\s+([\d,]+)/i.exec(c[5]||'');if(!mm)continue;
    out.push({d:date,t:c[0],ts:sec(c[0]),sym:c[3],side:/^B/i.test(mm[1])?'BOT':'SLD',qty:+mm[2].replace(/,/g,''),px:parseFloat(c[4]),vr:ls[c[3].toUpperCase()]||lv,mkt:(c[7]||'').trim()});
  }
  return out;
}
export const dateFromName=n=>{const x=/(\d{4})[-_.](\d\d)[-_.](\d\d)/.exec(n||'');return x?x.slice(1).join('-'):new Date().toISOString().slice(0,10)};
