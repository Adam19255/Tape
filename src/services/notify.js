import {$} from '../lib/dom.js';
import {Toast} from '../components/Toast.js';
// Successes can go quickly; failures stay longer because they have to be read, and maybe acted on.
const LIFETIME={positive:4000,negative:8000};
const MAX_VISIBLE=3;

// The region is a popover, which puts it in the browser's top layer. An open modal <dialog> is in the top layer too and would
// otherwise cover every toast, including "Couldn't save". The top layer stacks in the order things were opened, so it is opened
// once at start-up (always present, so screen readers hear what is added to it) and re-opened to sit above a modal that opened later.
const region0=$('#toast-region');
if(region0&&region0.showPopover)region0.showPopover();
const raise=region=>{if(region.showPopover&&region.matches(':popover-open')){region.hidePopover();region.showPopover()}};
/** Call right after opening a modal: toasts already on screen would be underneath it. */
export function liftToasts(){const r=$('#toast-region');if(r&&r.children.length)raise(r)}

/** Fade one toast out (.is-leaving) and remove it. Safe to call twice, or on a toast that is already gone. */
export function dismiss(toast){
  if(!toast||toast.classList.contains('is-leaving'))return;
  toast.classList.add('is-leaving');
  const remove=()=>toast.remove();
  toast.addEventListener('transitionend',remove,{once:true});
  setTimeout(remove,400); // no transition runs in a hidden tab, so don't rely on the event alone
}

/**
 * Show a toast: notify({tone:'positive'|'negative', title, text}).
 * It dismisses itself after a few seconds, and hovering over it or focusing it pauses that timer.
 * The close button is handled in main.js with the other delegated events.
 */
export function notify({tone='positive',title,text=''}){
  const region=$('#toast-region');if(!region)return;
  if(document.querySelector('dialog[open]'))raise(region); // a modal is open: move above it before adding
  region.insertAdjacentHTML('beforeend',Toast({tone,title,text}));
  const toast=region.lastElementChild;
  region.querySelectorAll('.toast:not(.is-leaving)').forEach((t,i,all)=>{if(i<all.length-MAX_VISIBLE)dismiss(t)});
  let timer;
  const stop=()=>clearTimeout(timer),start=()=>{stop();timer=setTimeout(()=>dismiss(toast),LIFETIME[tone]||LIFETIME.positive)};
  toast.addEventListener('pointerenter',stop);toast.addEventListener('pointerleave',start);
  toast.addEventListener('focusin',stop);toast.addEventListener('focusout',start);
  start();
}
