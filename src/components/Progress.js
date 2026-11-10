export const Progress=({value,title=''})=>`<div class="progress" title="${title}"><div class="progress-fill" style="width:${Math.min(100,Math.max(0,value))}%"></div></div>`;
export const Meter=({label,text,value})=>`<div><small>${label}</small><div class="numeric">${text}</div>${Progress({value})}</div>`;
