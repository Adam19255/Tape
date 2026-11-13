import {Panel} from './Panel.js';
import {esc} from '../lib/format.js';
const ICON='M12 16V4M7 9l5-5 5 5M4 16v4h16v-4'; // an arrow going into a tray: "add something"
/** A view with nothing to show yet. title and text are escaped; action and note are markup the caller has already built. */
export const EmptyState=({title,text='',action='',note=''})=>Panel({cls:'empty-state',body:
  `<span class="empty-state-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${ICON}"/></svg></span>`
  +`<h2 class="empty-state-title">${esc(title)}</h2>${text?`<p class="empty-state-text">${esc(text)}</p>`:''}${action}${note?`<p class="hint empty-state-note">${note}</p>`:''}`});
