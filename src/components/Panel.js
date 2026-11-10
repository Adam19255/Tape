export const Panel=({title='',hint='',cls='',titleCls='',body=''}={})=>
  `<div class="panel ${cls}">${title?`<h3 class="${titleCls}">${title}${hint?` <small>· ${hint}</small>`:''}</h3>`:''}${body}</div>`;
