/**
 * cols: [{label, key | render(row), tone(row)->'positive'|'negative'|'', cls}]   (cls 'hide-on-phone' hides the column on phones)
 * rowAttrs/rowClass: per-row attributes; detail(row) -> html adds an expanded row under it.
 */
export function DataTable({cols,rows,rowAttrs=()=>'',rowClass=()=>'',detail=null}){
  const head=cols.map(c=>`<th class="${c.cls||''}">${c.label}</th>`).join('');
  const body=rows.map(r=>{
    const tds=cols.map(c=>`<td class="${[c.cls,c.tone&&c.tone(r)].filter(Boolean).join(' ')}">${c.render?c.render(r):r[c.key]}</td>`).join('');
    const d=detail&&detail(r);
    return`<tr class="${rowClass(r)}" ${rowAttrs(r)}>${tds}</tr>${d?`<tr><td colspan="${cols.length}" class="align-left row-detail">${d}</td></tr>`:''}`;
  }).join('');
  return`<div class="scroll-x"><table class="numeric"><tr>${head}</tr>${body}</table></div>`;
}
