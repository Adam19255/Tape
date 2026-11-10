export const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export const sec=t=>{const[a,b,c]=t.split(':').map(Number);return a*3600+b*60+(c||0)};
export const dur=s=>s<60?s+'s':s<3600?Math.floor(s/60)+'m '+String(s%60).padStart(2,'0')+'s':Math.floor(s/3600)+'h '+Math.round(s%3600/60)+'m';
export const m=(v,d=2)=>(v<0?'−':'')+'$'+Math.abs(v).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
export const sg=v=>(v>0?'+':'')+m(v);
export const sgc=v=>(v>0?'+':v<0?'−':'')+'$'+Math.abs(Math.round(v)).toLocaleString('en-US');
/** Signed money sized for tight spots (phone calendar cells, narrow tables): cents under $100, whole dollars under $10k, then 12.3K / 833K / 1.2M. */
export const sgk=v=>{const a=Math.abs(v),s=v>0?'+':v<0?'−':'';
  if(a<100)return s+m(a);
  if(a<1e4)return s+'$'+Math.round(a).toLocaleString('en-US');
  return s+'$'+new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:a<1e5||a>=1e6?1:0}).format(a)};
export const pc=v=>(v>0?'+':v<0?'−':'')+Math.abs(v).toFixed(2)+'%';
export const cls=v=>v>0?'positive':v<0?'negative':'';
export const sum=a=>a.reduce((x,y)=>x+y,0);
export const band=(v,a)=>a.find(x=>v<x[0])[1];
export const ymd=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
export const ym=d=>ymd(d).slice(0,7);
