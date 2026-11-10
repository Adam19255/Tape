import {esc} from '../lib/format.js';
const ICON='<svg class="export-icon" viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 11l5 5 5-5M5 20h14"/></svg>';
/** attrs is a raw attribute string (e.g. 'data-export="calendar"'). title is plain text; it doubles as the accessible name, so repeated buttons stay distinguishable. */
export const ExportButton=({attrs='',label='Export',title='',disabled=false})=>
  `<button class="export-button" ${attrs}${title?` title="${esc(title)}" aria-label="${esc(title)}"`:''}${disabled?' disabled':''}>${ICON}<span>${label}</span></button>`;
