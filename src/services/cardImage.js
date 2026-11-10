import {CARD,drawCard} from '../lib/cardDraw.js';
import {saveFile} from './download.js';
const TOKENS={surface:'--surface',ink:'--ink',muted:'--muted',positive:'--positive',negative:'--negative'};
const DARK={surface:'#16171b',ink:'#f2f2f0',muted:'#8b8d95',positive:'#2ed18a',negative:'#ff5c70'}; // only if a token is missing

/** The colours the site is using right now, so the card matches the active theme (light or dark). */
export function readTheme(el=document.documentElement){
  const style=getComputedStyle(el),theme={};
  for(const k in TOKENS)theme[k]=style.getPropertyValue(TOKENS[k]).trim()||DARK[k];
  return theme;
}

const newCanvas=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
const toBlob=c=>c.toBlob
  ?new Promise((ok,fail)=>c.toBlob(b=>b?ok(b):fail(new Error('The browser could not create the image')),'image/png'))
  :c.encode('png').then(buf=>new Blob([buf],{type:'image/png'})); // node-canvas style, used by the tests

/** Draw a card (a trade or a whole day) to a PNG Blob. make(w,h) lets tests supply a canvas without a DOM. */
export function renderCard(model,theme=readTheme(),make=newCanvas){
  const canvas=make(CARD.w*CARD.scale,CARD.h*CARD.scale),c=canvas.getContext('2d');
  c.scale(CARD.scale,CARD.scale);
  drawCard(c,model,theme);
  return toBlob(canvas);
}

/**
 * Phones get the share sheet (Save Image, WhatsApp, ...); everywhere else the PNG downloads.
 * Resolves 'shared' | 'saved' | 'cancelled'. If the share sheet refuses (older browsers, or the tap's permission ran out while drawing), it downloads instead.
 */
export async function shareCard(model,render=renderCard){
  const blob=await render(model),file=new File([blob],model.filename,{type:'image/png'});
  const touch=typeof matchMedia==='function'&&matchMedia('(pointer: coarse)').matches;
  if(touch&&navigator.canShare&&navigator.canShare({files:[file]})){
    try{await navigator.share({files:[file],title:model.shareTitle});return'shared'}
    catch(e){if(e&&e.name==='AbortError')return'cancelled'}
  }
  saveFile(model.filename,blob,'image/png');
  return'saved';
}
