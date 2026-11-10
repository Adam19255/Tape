import {dflt} from './lib/fees.js';
/** The single source of truth. Views only read it; main.js changes it through set(). */
export const state={tab:'dash',tf:'All',net:true,mon:'',exp:null,q:'',pg:1,
  ps:Number(localStorage.getItem('tape-ps'))||25,
  theme:localStorage.getItem('tape-theme')==='light'?'light':'dark', // dark unless the person chose light
  modal:null, // {kind:'day'|'week', key} while the modal is open, else null
  EV:null,    // the shared market-events document {v, updated, events}, or null when none is uploaded
  isAdmin:false, // true when this person has an admins/{uid} document; only decides what is shown, the security rules decide what is allowed
  evDraft:null,  // admin only: the file picked for upload and what validating it found
  UP:[],CFG:dflt(),NT:{},user:null,loaded:false,gate:{title:'Loading…'}};
const listeners=new Set();
export const subscribe=f=>(listeners.add(f),()=>listeners.delete(f));
export const set=(patch,anim=false)=>{Object.assign(state,patch);listeners.forEach(f=>f(anim))};
