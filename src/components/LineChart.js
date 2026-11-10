import {esc} from '../lib/format.js';
let uid=0;
/**
 * Interactive line chart in the style of a brokerage portfolio graph: thin line, soft gradient under it,
 * dashed baseline, an end-point dot and a time axis along the bottom.
 * points: [{x,y}] sorted by x. x is any number (e.g. a timestamp), so spacing follows time, not the number of points.
 * baseline: y value the dashed line sits on, and what decides green or red. ticks: [{x,text}] axis labels.
 * Hover a point (one finger on touch) to see a line, a dot and a small label above it; press and drag (two fingers on touch) to compare two.
 * renderPoint(i) and renderRange(lo, hi) return the label HTML. onScrub(a, b) fires on every move (a === b for a single point, b is the one under
 * the pointer) so the page can update its own numbers; onEnd() fires when the pointer leaves or the last finger lifts.
 */
export function mountLineChart(el,{points,baseline=0,ticks=[],compact=false,label='Chart',renderPoint,renderRange,onScrub=()=>{},onEnd=()=>{}}){
  if(points.length<2)points=[points[0],{...points[0],x:points[0].x+1}];
  const W=compact?400:720,H=compact?220:230,P=6,PY=14,PT=48,N=points.length-1,ys=points.map(p=>p.y),x0=points[0].x,span=points[N].x-x0||1;
  const lo=Math.min(baseline,...ys),mx=Math.max(baseline,...ys),mn=lo-(mx-lo||1)*.12,rg=mx-mn||1; // headroom below the lowest point so the baseline floats above the bottom edge
  const Xv=x=>P+(x-x0)/span*(W-2*P),Xi=i=>Xv(points[i].x),Y=v=>H-PY-(v-mn)/rg*(H-PT-PY),col=ys[N]>=baseline?'var(--positive)':'var(--negative)',gid='chart-fill-'+(++uid);
  const d=points.map((p,i)=>(i?'L':'M')+Xi(i).toFixed(1)+' '+Y(p.y).toFixed(1)).join(''),ex=Xi(N),ey=Y(ys[N]);
  const labels=ticks.map(({x,text})=>{const pc=Xv(x)/W*100;return`<span class="${pc<8?'is-start':pc>92?'is-end':''}" style="left:${pc.toFixed(2)}%">${esc(text)}</span>`}).join('');
  el.classList.add('chart');
  el.innerHTML=`<div class="chart-tooltip" hidden></div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}"><defs><linearGradient id="${gid}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".28"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs><rect class="chart-range" y="0" height="${H}" opacity="0"/><path class="chart-fill" d="${d}L${Xi(N)} ${H}L${Xi(0)} ${H}Z" fill="url(#${gid})"/><line x1="0" x2="${W}" y1="${Y(baseline)}" y2="${Y(baseline)}" stroke="var(--muted)" stroke-opacity=".55" stroke-dasharray="3 4"/><path class="equity-line" pathLength="1" d="${d}" fill="none" stroke="${col}" stroke-width="${compact?2.2:1.7}" stroke-linejoin="round" stroke-linecap="round"/><circle class="chart-end-halo" cx="${ex}" cy="${ey}" r="10" fill="${col}" opacity=".2"/><circle class="chart-end-dot" cx="${ex}" cy="${ey}" r="4.5" fill="${col}"/><line class="chart-crosshair" y1="0" y2="${H}" stroke="var(--muted)" opacity="0"/><circle class="chart-marker-start" r="5" fill="${col}" stroke="var(--surface)" stroke-width="2.5" opacity="0"/><circle class="chart-marker-end" r="5" fill="${col}" stroke="var(--surface)" stroke-width="2.5" opacity="0"/></svg>${labels?`<div class="chart-axis">${labels}</div>`:''}`;
  const svg=el.querySelector('svg'),tip=el.querySelector('.chart-tooltip'),g=name=>svg.querySelector('.'+name),at=(n,o)=>{for(const k in o)g(n).setAttribute(k,o[k])};
  let s=0,drag=false;
  const idx=e=>{ // nearest point by x (binary search)
    const r=svg.getBoundingClientRect(),x=x0+((e.clientX-r.left)/r.width*W-P)/(W-2*P)*span;let a=0,b=N;
    while(b-a>1){const m=(a+b)>>1;points[m].x<=x?a=m:b=m}
    return x-points[a].x<=points[b].x-x?a:b};
  const tone=y=>y>=baseline?'var(--positive)':'var(--negative)'; // the dot is green above the baseline and red below it
  let live=false;
  const hide=()=>{tip.hidden=true;el.classList.remove('is-scrubbing');['chart-crosshair','chart-marker-start','chart-marker-end','chart-range'].forEach(n=>at(n,{opacity:0}));if(live){live=false;onEnd()}};
  const show=(a,b)=>{
    const lo=Math.min(a,b),hi=Math.max(a,b),one=a===b;live=true;el.classList.add('is-scrubbing');
    at('chart-crosshair',{x1:Xi(b),x2:Xi(b),opacity:1});at('chart-marker-end',{cx:Xi(b),cy:Y(ys[b]),fill:tone(ys[b]),opacity:1});at('chart-marker-start',{cx:Xi(a),cy:Y(ys[a]),fill:tone(ys[a]),opacity:one?0:1});
    at('chart-range',{x:Xi(lo),width:Xi(hi)-Xi(lo),fill:ys[hi]>=ys[lo]?'var(--positive)':'var(--negative)',opacity:one?0:.14});
    tip.innerHTML=one?renderPoint(b):renderRange(lo,hi);tip.classList.toggle('is-range',!one);tip.hidden=false;
    const cw=el.clientWidth,w=tip.offsetWidth;tip.style.left=Math.max(0,Math.min(cw-w,Xi(b)/W*cw-w/2))+'px';
    at('chart-crosshair',{y1:(tip.offsetHeight+4)*W/cw}); // the line starts just under the label, whatever its height
    onScrub(a,b);
  };
  // Touch: one finger scrubs the hover tooltip, two fingers compare two points; lifting every finger hides it.
  // Mouse and pen keep hover, plus press-and-drag to compare (there is no second finger to use).
  const fingers=new Map(); // pointerId -> point index, in the order the fingers landed
  const showFingers=()=>{const[a,b=a]=fingers.values();show(a,b)};
  svg.addEventListener('pointerdown',e=>{
    if(e.pointerType==='touch'){fingers.set(e.pointerId,idx(e));showFingers();return}
    drag=true;s=idx(e);try{svg.setPointerCapture(e.pointerId)}catch{}show(s,s)});
  svg.addEventListener('pointermove',e=>{
    if(e.pointerType==='touch'){if(fingers.has(e.pointerId)){fingers.set(e.pointerId,idx(e));showFingers()}return}
    const i=idx(e);show(drag?s:i,i)});
  const lift=e=>{
    if(e.pointerType==='touch'){fingers.delete(e.pointerId);fingers.size?showFingers():hide();return}
    drag=false;if(e.type==='pointercancel')hide()};
  svg.addEventListener('pointerup',lift);
  svg.addEventListener('pointercancel',lift); // also fires when the browser takes over to scroll the page
  svg.addEventListener('pointerleave',e=>{if(!drag&&e.pointerType==='mouse')hide()});
  svg.addEventListener('contextmenu',e=>e.preventDefault()); // long-press must not open a menu mid-scrub
}
