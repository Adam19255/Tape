import {esc} from '../lib/format.js';
const stroke='fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
const ICONS={
  positive:`<svg viewBox="0 0 24 24" ${stroke}><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.8"/></svg>`,
  negative:`<svg viewBox="0 0 24 24" ${stroke}><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.01"/></svg>`
};
const CLOSE_ICON=`<svg viewBox="0 0 24 24" ${stroke}><path d="M6 6l12 12M18 6L6 18"/></svg>`;
/**
 * One notification. tone is 'positive' (success) or 'negative' (failure); it colours the icon.
 * Timing and dismissal live in services/notify.js, which inserts this markup into #toast-region.
 */
export const Toast=({tone='positive',title,text=''})=>`<div class="toast"><span class="toast-icon ${tone}">${ICONS[tone]||ICONS.positive}</span><div class="toast-body"><strong class="toast-title">${esc(title)}</strong>${text?`<span class="toast-text">${esc(text)}</span>`:''}</div><button class="toast-close" data-toast-close aria-label="Dismiss">${CLOSE_ICON}</button></div>`;
