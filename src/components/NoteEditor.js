import {esc} from '../lib/format.js';
/**
 * Tags and a free-text note, in the same markup as the Trades tab's. noteKey names the entry in the notes map;
 * main.js reads it back from [data-note-key]. data-focus lets the modal restore the cursor after it re-renders.
 */
export const NoteEditor=({noteKey,tags=[],text='',placeholder=''})=>{
  const key=`data-note-key="${esc(noteKey)}"`;
  return`<h3 class="modal-section-title">Tags</h3><div class="tag-list">${tags.map(g=>`<span class="tag">${esc(g)}<button data-rt="${esc(g)}" ${key} aria-label="Remove tag ${esc(g)}">×</button></span>`).join('')}<input data-tag ${key} data-focus="tag" maxlength="40" placeholder="New tag, Enter…" autocomplete="off"></div>`
    +`<h3 class="modal-section-title">Notes</h3><textarea data-note ${key} data-focus="note" rows="4" maxlength="2000" placeholder="${esc(placeholder)}">${esc(text)}</textarea>`;
};
