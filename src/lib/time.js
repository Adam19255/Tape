// Time zones, with no library and no network. Market events are published in New York time; people read them in their own.

const MARKET_ZONE='America/New_York',FALLBACK_ZONE='Asia/Jerusalem';

/** The viewer's time zone, read from the browser (their device clock settings), or Israel time if the browser can't say. */
export function userZone(){
  try{return Intl.DateTimeFormat().resolvedOptions().timeZone||FALLBACK_ZONE}catch{return FALLBACK_ZONE}
}

const fmt=(zone,opts)=>new Intl.DateTimeFormat('en-GB',{timeZone:zone,hourCycle:'h23',...opts});
const parts=(zone,at)=>Object.fromEntries(fmt(zone,{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}).formatToParts(at).map(p=>[p.type,+p.value]));
// How far a zone's wall clock is ahead of UTC at a moment, in ms (daylight saving included).
const offset=(zone,at)=>{const p=parts(zone,at);return Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second)-Math.floor(at.getTime()/1000)*1000};

/** The moment when a New York wall clock reads date ('YYYY-MM-DD') and time ('HH:MM'). */
export function marketInstant(date,time){
  const[y,mo,d]=date.split('-').map(Number),[h,mi]=time.split(':').map(Number),guess=Date.UTC(y,mo-1,d,h,mi);
  let t=guess-offset(MARKET_ZONE,new Date(guess));
  t=guess-offset(MARKET_ZONE,new Date(t)); // the offset at the corrected moment can differ right around a clock change
  return new Date(t);
}

/**
 * A New York time shown in another zone, on a 24-hour clock: {local:'15:30', et:'08:30', dayShift:0}.
 * dayShift is how many calendar days later (+1) or earlier (-1) it falls there; 0 for nearly everything the US publishes.
 */
export function fromMarketTime(date,time,zone=userZone()){
  const at=marketInstant(date,time),p=parts(zone,at),[y,mo,d]=date.split('-').map(Number);
  return{local:fmt(zone,{hour:'2-digit',minute:'2-digit'}).format(at),et:time,dayShift:Math.round((Date.UTC(p.year,p.month-1,p.day)-Date.UTC(y,mo-1,d))/864e5)};
}
