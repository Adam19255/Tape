import {Panel} from '../components/Panel.js';
import {esc} from '../lib/format.js';
export const latest=T=>T.reduce((a,t)=>t.date>a?t.date:a,'');
export const OpenHint=open=>open.length?`<p class="hint">Still open: ${open.map(o=>esc(o.sym)+' '+o.q+' @ '+o.avg.toFixed(4)).join(' · ')}</p>`:'';
export const Empty=({open})=>Panel({body:`No closed round trips yet.${OpenHint(open)}`});
