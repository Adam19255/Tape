/**
 * Draws the "Midnight" share card onto a 2D canvas context. Pure: the caller supplies the context, so this runs in a browser or in tests.
 * Coordinates are in card units (CARD.w x CARD.h); the caller scales the context by CARD.scale for a sharp image.
 * model: see lib/tradeCard.js (a trade or a whole day). theme: {surface, ink, muted, positive, negative} as #rrggbb,
 * read from the site's CSS tokens by the caller, so the card follows light/dark.
 */
export const CARD={w:360,h:450,scale:3}; // 1080 x 1350 px: 4:5 portrait
const FONT='ui-sans-serif, -apple-system, "SF Pro Text", Inter, system-ui, sans-serif';
const PAD=28,PANEL_TOP=256,BOX_H=58,GAP=8,ROW_PITCH=20;

const rgb=h=>{const m=/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(h).trim());if(!m)return[128,128,128];let s=m[1];if(s.length===3)s=[...s].map(c=>c+c).join('');const n=parseInt(s,16);return[n>>16&255,n>>8&255,n&255]};
const alpha=(h,a)=>{const[r,g,b]=rgb(h);return`rgba(${r},${g},${b},${a})`};
const round=(c,x,y,w,h,r)=>{c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()};

/** Width of a string at a size, with tracking (em). */
function measure(c,s,{size,weight=400,track=0}){
  c.font=`${weight} ${size}px ${FONT}`;
  if(!track)return c.measureText(s).width;
  let w=0;for(const ch of s)w+=c.measureText(ch).width+track*size;
  return w-track*size;
}

/** Text with tracking (em) and an optional max width: shrinks the size until it fits. Returns {w,size}. */
function text(c,s,x,y,{size,weight=400,color,align='left',track=0,max}){
  let z=size;while(max&&z>10&&measure(c,s,{size:z,weight,track})>max)z-=1;
  const w=measure(c,s,{size:z,weight,track});let cx=align==='right'?x-w:align==='center'?x-w/2:x;
  c.font=`${weight} ${z}px ${FONT}`;c.fillStyle=color;c.textAlign='left';c.textBaseline='alphabetic';
  if(!track)c.fillText(s,cx,y);else for(const ch of s){c.fillText(ch,cx,y);cx+=c.measureText(ch).width+track*z}
  return{w,size:z};
}

/** The arrow (or dash) inside the tag, drawn in a 24-unit box scaled to `s`. */
function arrow(c,tone,x,y,s,color){
  const k=s/24,P=(a,b)=>c.lineTo(x+a*k,y+b*k),M=(a,b)=>c.moveTo(x+a*k,y+b*k);
  c.beginPath();
  if(tone==='win'){M(7,17);P(17,7);M(9,7);P(17,7);P(17,15)}
  else if(tone==='loss'){M(7,7);P(17,17);M(9,17);P(17,17);P(17,9)}
  else{M(6,12);P(18,12)}
  c.strokeStyle=color;c.lineWidth=3*k;c.lineCap='round';c.lineJoin='round';c.stroke();
}

export function drawCard(c,model,theme){
  const{w:W,h:H}=CARD,TONES={win:theme.positive,loss:theme.negative,even:theme.muted},tone=TONES[model.tone];

  // Surface, with a soft glow of the result colour in the top-right corner.
  c.fillStyle=theme.surface;c.fillRect(0,0,W,H);
  const g=c.createRadialGradient(W,0,0,W,0,340);g.addColorStop(0,alpha(tone,.22));g.addColorStop(.6,alpha(tone,0));g.addColorStop(1,alpha(tone,0));
  c.fillStyle=g;c.fillRect(0,0,W,H);

  // Title (symbol or date), a small note beside it, and the WIN / LOSS tag.
  const tagW=measure(c,model.tag,{size:13,weight:700,track:.06}),pillW=10+14+6+tagW+12,pillX=W-PAD-pillW;
  const noteW=measure(c,model.note,{size:12,weight:600,track:.06});
  const title=text(c,model.title,PAD,56,{size:30,weight:700,color:theme.ink,track:-.02,max:pillX-PAD-10-noteW-8});
  text(c,model.note,PAD+title.w+10,56,{size:12,weight:600,color:theme.muted,track:.06});
  round(c,pillX,32,pillW,28,14);c.lineWidth=1.5;c.strokeStyle=tone;c.stroke();
  arrow(c,model.tone,pillX+10,39,14,tone);
  text(c,model.tag,pillX+30,50.5,{size:13,weight:700,color:tone,track:.06});

  // The number, and one line under it.
  text(c,'NET P&L',PAD,122,{size:13,weight:500,color:theme.muted,track:.08});
  text(c,model.amount,PAD,178,{size:58,weight:700,color:tone,track:-.035,max:W-2*PAD});
  text(c,model.sub.text,PAD,214,{size:17,weight:600,color:model.sub.color==='tone'?tone:theme.muted,max:W-2*PAD});

  // The panel: four stat boxes for a trade, a mini trade list for a day.
  const panel=model.panel,bw=(W-2*PAD-GAP)/2;
  if(panel.type==='boxes'){
    panel.items.forEach(([label,value],i)=>{
      const x=PAD+(i%2)*(bw+GAP),y=PANEL_TOP+Math.floor(i/2)*(BOX_H+GAP);
      round(c,x,y,bw,BOX_H,12);c.fillStyle=alpha(theme.ink,.06);c.fill();
      text(c,label.toUpperCase(),x+14,y+24,{size:11,weight:500,color:theme.muted,track:.08});
      text(c,value,x+14,y+45,{size:15,weight:600,color:theme.ink,max:bw-28});
    });
  }else{
    const x=PAD,w=W-2*PAD,h=2*BOX_H+GAP;
    round(c,x,PANEL_TOP,w,h,12);c.fillStyle=alpha(theme.ink,.06);c.fill();
    panel.rows.forEach((r,i)=>{
      const y=PANEL_TOP+12+i*ROW_PITCH+14;
      text(c,r.time,x+14,y,{size:12,weight:500,color:theme.muted});
      text(c,r.sym,x+14+42,y,{size:13,weight:700,color:theme.ink,max:100});
      text(c,r.amount,x+w-14,y,{size:13,weight:600,color:TONES[r.tone],align:'right',max:110});
    });
    if(panel.more)text(c,`+${panel.more} more trades`,x+14,PANEL_TOP+12+panel.rows.length*ROW_PITCH+14,{size:12,weight:500,color:theme.muted});
  }

  // Footer: the app mark, its name, and a caption (the trade date, or "Daily recap").
  const fy=H-PAD-22,s=22/48,pt=(a,b)=>[PAD+a*s,fy+b*s];
  round(c,PAD,fy,22,22,12*s);c.fillStyle=theme.ink;c.fill();
  c.beginPath();c.moveTo(...pt(10,33));c.lineTo(...pt(19,24));c.lineTo(...pt(25,29));c.lineTo(...pt(38,15));
  c.strokeStyle=theme.surface;c.lineWidth=4*s;c.lineCap='round';c.lineJoin='round';c.stroke();
  c.beginPath();c.arc(...pt(38,15),4.5*s,0,Math.PI*2);c.fillStyle=theme.positive;c.fill();
  text(c,'Tape',PAD+30,fy+16,{size:15,weight:700,color:theme.ink});
  text(c,model.footer,W-PAD,fy+16,{size:13,color:theme.muted,align:'right'});
}
