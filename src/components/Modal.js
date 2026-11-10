import {esc} from '../lib/format.js';
const CLOSE_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const step=(dir,key,noun)=>`<button class="modal-nav" data-modal-nav="${dir}" data-modal-go="${esc(key)}" data-focus="${dir}" aria-label="${dir==='prev'?'Previous':'Next'} ${noun}"${key?'':' disabled'}>${dir==='prev'?'‹':'›'}</button>`;
/**
 * The inside of the app's one <dialog id="modal">. title is plain text (escaped here); body and actions are trusted HTML from a view.
 * nav: {prev, next, noun} adds previous/next buttons in the header; prev/next are keys ('' = nothing that way), handled via [data-modal-go].
 * actions: buttons shown to the left of Close. Both close controls (the X and the footer button) carry [data-modal-close].
 * data-focus marks controls main.js puts the cursor back on after the modal re-renders.
 */
export const Modal=({title,body='',nav=null,actions='',footerNote=''})=>
  `<div class="modal-card"><div class="modal-header"><h2 class="modal-title" id="modal-title">${esc(title)}</h2>${nav?`<div class="modal-nav-group">${step('prev',nav.prev,nav.noun)}${step('next',nav.next,nav.noun)}</div>`:''}<button class="modal-close" data-modal-close aria-label="Close">${CLOSE_ICON}</button></div><div class="modal-body">${body}</div><div class="modal-footer">${footerNote?`<span class="modal-footer-note">${esc(footerNote)}</span>`:''}${actions?`<div class="modal-actions">${actions}</div>`:''}<button data-modal-close>Close</button></div></div>`;
