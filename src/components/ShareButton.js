import {esc} from '../lib/format.js';
const ICON='<svg class="export-icon" viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 9H6.5A1.5 1.5 0 0 0 5 10.5v8A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 17.5 9H16M12 15V4M8.5 7.5L12 4l3.5 3.5"/></svg>';
/** Same look as ExportButton. attrs is a raw attribute string; title doubles as the accessible name. */
export const ShareButton=({attrs='',label='Share',title=''})=>
  `<button class="export-button" ${attrs}${title?` title="${esc(title)}" aria-label="${esc(title)}"`:''}>${ICON}<span>${label}</span></button>`;
