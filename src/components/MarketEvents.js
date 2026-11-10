import {Panel} from './Panel.js';
import {esc} from '../lib/format.js';
import {summarize,kindLabel} from '../lib/events.js';

const range=s=>s.n?`${s.from} to ${s.to}`:'no events';
const events=n=>`${n} event${n===1?'':'s'}`;
const counts=by=>Object.entries(by).map(([k,n])=>`${n} ${esc(kindLabel(k))}`).join(' · ');

/**
 * The market-events panel on the Settings page. current is the stored document (or null).
 * Everyone sees a one-line status, so they can tell how fresh the data is; it is hidden until something has been uploaded.
 * admin adds the controls: choose a file, a preview of what validating it found, then Replace. draft = {name, ok, errors, errorCount, summary}.
 * Every string here comes from an uploaded file or a file name, so all of it is escaped.
 * main.js handles #events-file and the [data-ev-*] buttons. Showing the controls only to the admin is cosmetic; the security rules enforce it.
 */
export const MarketEvents=({current,admin=false,draft=null})=>{
  if(!current&&!admin)return'';
  const s=summarize(current);
  const status=current?`<p class="hint">${events(s.n)}, ${range(s)}. Updated ${esc(current.updated)}.</p>`:'<p class="hint">No events uploaded yet.</p>';
  if(!admin)return Panel({title:'Market events',hint:'scheduled releases shown on the calendar',body:status});
  const preview=!draft?'':draft.ok
    ?`<div class="admin-preview"><b>${esc(draft.name)}</b> is valid: ${events(draft.summary.n)}, ${range(draft.summary)}.<p class="hint">${counts(draft.summary.byKind)||'Nothing in it.'}</p>`
      +`<p class="hint">${current?`Replaces the ${events(s.n)} live now (${range(s)}).`:'Nothing is live yet.'} Everyone sees the change straight away.</p>`
      +`<div class="admin-actions"><button class="button-primary" data-ev-upload>Replace events</button><button data-ev-cancel>Cancel</button></div></div>`
    :`<div class="admin-preview"><b class="negative">${esc(draft.name)} can’t be uploaded.</b><ul class="admin-errors">${draft.errors.map(e=>`<li>${esc(e)}</li>`).join('')}</ul>`
      +`${draft.errorCount>draft.errors.length?`<p class="hint">…and ${draft.errorCount-draft.errors.length} more.</p>`:''}<button data-ev-cancel>Dismiss</button></div>`;
  return Panel({title:'Market events',hint:'admin: only you see these controls',body:status
    +`<div class="admin-actions"><label class="button">Choose events file…<input type="file" id="events-file" accept=".json,application/json" hidden></label>${current?'<button data-ev-download>Download current file</button>':''}</div>`
    +preview});
};
