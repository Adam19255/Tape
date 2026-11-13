import {Panel} from '../components/Panel.js';
import {EmptyState} from '../components/EmptyState.js';
import {esc} from '../lib/format.js';
export const latest=T=>T.reduce((a,t)=>t.date>a?t.date:a,'');
export const OpenHint=open=>open.length?`<p class="hint">Still open: ${open.map(o=>esc(o.sym)+' '+o.q+' @ '+o.avg.toFixed(4)).join(' · ')}</p>`:'';
// Nothing uploaded yet: one prompt per tab, all with the same way to add a file (main.js opens the picker from [data-pick-file]).
const NO_FILE={
  dash:{title:'Your dashboard starts with a trade log',text:'Add a file and Tape builds your account value, win rate and daily results from it.'},
  ins:{title:'Insights start with a trade log',text:'Add a file to see which times of day and price bands work for you, and what routing costs.'},
  trd:{title:'No trades to list yet',text:'Add a file and every round trip appears here, with its fills, costs, tags and notes.'},
  cal:{title:'Your calendar is empty',text:'Add a file to see each day’s result next to market events and holidays.'}
};
const PICK='<button class="button-primary" data-pick-file>Choose file</button><input type="file" id="file-input" accept=".txt,.tsv,.csv" multiple hidden>';
const PICK_NOTE='<span class="hide-on-phone">Or drop it anywhere on this page. </span>.txt, .tsv or .csv, read in your browser and saved to your private account.';
/** view: 'dash'|'ins'|'trd'|'cal'. files: how many files are uploaded. With files but no closed trade, the problem is the data, not a missing upload. */
export const Empty=({view,files,open})=>files?Panel({body:`No closed round trips yet.${OpenHint(open)}`}):EmptyState({...NO_FILE[view],action:PICK,note:PICK_NOTE});
