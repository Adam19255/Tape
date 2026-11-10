import {parse} from './parser.js';
/** Raw uploads + fee config -> {trades, fills, open positions}. Pure. */
const ini=(f,s)=>({q:0,dir:s,t0:f.ts,s0:f.t,d:f.d,eq:0,ec:0,xq:0,xv:0,rl:0,pk:0,rf:0,cm:0,fl:[f],f0:f});
const mk=(k,p,f)=>({key:p.d+'|'+k+'|'+p.s0,sym:k,dir:p.dir,date:p.d,t0:p.t0,t1:f.ts,s0:p.s0,s1:f.t,qty:p.eq,entry:p.ec/p.eq,exit:p.xv/p.xq,gross:p.rl,rf:p.rf,cm:p.cm,cost:p.cm-p.rf,net:p.rl+p.rf-p.cm,fl:p.fl,pk:p.pk,ven:p.f0.vm,mkt:p.f0.mkt});
export function buildTrades(UP,CFG){let trades=[],fills,open;
  const pos={};trades=[];
  fills=UP.flatMap(u=>u.txt?parse(u.txt,u.date):u.fills).map(f=>{const vm=CFG.map[f.vr]||f.vr,r=CFG.sched[vm]||[0,0,0];return{...f,vm,rf:f.qty*r[1],cm:Math.max(f.qty*CFG.cr,CFG.cm)}}).sort((a,b)=>a.d===b.d?a.ts-b.ts:a.d<b.d?-1:1);
  for(const f of fills){
    const s=f.side==='BOT'?1:-1,k=f.sym;let r=f.qty,p=pos[k];
    if(!p||!p.q)p=pos[k]=ini(f,s);else{p.fl.push(f)}
    p.rf+=f.rf;p.cm+=f.cm;
    while(r>0){
      if(p.q===0||Math.sign(p.q)===s){p.q+=s*r;p.eq+=r;p.ec+=r*f.px;p.pk=Math.max(p.pk,Math.abs(p.q));r=0}
      else{const c=Math.min(r,Math.abs(p.q)),avg=p.ec/p.eq;p.rl+=(f.px-avg)*c*p.dir;p.xq+=c;p.xv+=c*f.px;p.q+=s*c;r-=c;
        if(p.q===0){trades.push(mk(k,p,f));p=pos[k]=ini(f,s)}}
    }
  }
  open=Object.entries(pos).filter(([,p])=>p.q).map(([k,p])=>({sym:k,q:p.q,avg:p.ec/p.eq}));
  return{trades,fills,open};
}
