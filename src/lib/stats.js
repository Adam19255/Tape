/** Trade-list statistics and bucket aggregation. Pure. */
export function stats(T,nt){
  const n=T.length,pl=T.map(t=>nt?t.net:t.gross),W=pl.filter(x=>x>0),L=pl.filter(x=>x<0);
  const sum=a=>a.reduce((x,y)=>x+y,0),net=sum(pl),gp=sum(W),gl=-sum(L);
  let cum=0,pk=0,dd=0,sw=0,sl=0,cw=0,cl=0;const eq=[0];
  pl.forEach(x=>{cum+=x;eq.push(cum);pk=Math.max(pk,cum);dd=Math.max(dd,pk-cum);
    if(x>0){cw++;cl=0}else if(x<0){cl++;cw=0}else{cw=cl=0}sw=Math.max(sw,cw);sl=Math.max(sl,cl)});
  const aw=W.length?gp/W.length:0,al=L.length?gl/L.length:0;
  const rets=T.map((t,i)=>pl[i]/(t.entry*t.qty)*100);
  return{n,pl,net,gp,gl,eq,dd,sw,sl,wr:n?W.length/n*100:0,wn:W.length,ln:L.length,aw,al,
    pf:gl?gp/gl:(gp?Infinity:0),exp:n?net/n:0,pay:al?aw/al:0,best:Math.max(...pl,0),worst:Math.min(...pl,0),
    ar:n?sum(rets)/n:0,rets,hold:n?sum(T.map(t=>t.t1-t.t0))/n:0,shares:sum(T.map(t=>t.qty*2)),
    fees:sum(T.map(t=>t.cost)),cap:Math.max(0,...T.map(t=>t.pk*t.entry)),
    vol:sum(T.map(t=>t.qty*(t.entry+t.exit))),nl:T.filter(t=>t.dir>0).length};
}
export function agg(T,fn,nt,ord){
  const B={};
  T.forEach(t=>{const p=nt?t.net:t.gross,L=fn(t);if(L==null)return;[].concat(L).forEach(l=>{const b=B[l]||(B[l]={l,n:0,w:0,gw:0,gl:0,tot:0});b.n++;b.tot+=p;if(p>0){b.w++;b.gw+=p}else if(p<0)b.gl-=p})});
  const A=Object.values(B);return ord?A.sort((a,b)=>ord.indexOf(a.l)-ord.indexOf(b.l)):A.sort((a,b)=>b.tot-a.tot);
}
