import {esc} from '../lib/format.js';
/** items: ['a','b'] or [['value','Label']]. Buttons carry data-<attr>="value". */
export const Chips=({items,active,attr,cls=''})=>`<div class="chips${cls?' '+cls:''}">${items.map(x=>{const[v,l]=Array.isArray(x)?x:[x,x];return`<button data-${attr}="${esc(v)}" class="${String(v)===String(active)?'is-active':''}">${l}</button>`}).join('')}</div>`;
