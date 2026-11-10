export const $=(s,r=document)=>r.querySelector(s);
export const isPhone=()=>typeof matchMedia==='function'&&matchMedia('(max-width:640px)').matches;
