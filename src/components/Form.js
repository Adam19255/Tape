import {esc} from '../lib/format.js';
/** attrs is a raw attribute string, e.g. 'data-c="cr"', so any handler can find the control. */
export const Select=({options,value,attrs='',label=''})=>`<select ${attrs} aria-label="${label}">${options.map(o=>{const[v,l]=Array.isArray(o)?o:[o,o];return`<option value="${esc(v)}"${String(v)===String(value)?' selected':''}>${l}</option>`}).join('')}</select>`;
export const Field=({label,attrs='',value='',type='number',step='any'})=>`<label class="field">${label}<input ${type==='number'?`type="number" step="${step}" inputmode="decimal"`:type==='text'?'':`type="${type}"`} ${attrs} value="${esc(value||'')}"></label>`;
