export const StatCard=({label,value,sub='',tone='',i=0})=>`<div class="stat-card" style="--index:${i}"><span class="stat-card-label">${label}</span><b class="stat-card-value numeric ${tone}">${value}</b><span class="stat-card-note">${sub}</span></div>`;
export const CardGrid=cards=>`<div class="stat-grid">${cards.filter(Boolean).map((c,i)=>StatCard({i,...c})).join('')}</div>`;
