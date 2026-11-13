import config from '../firebase-config.js';
import {state as st,set,subscribe} from './store.js';
import {createCloud} from './services/cloud.js';
import {buildTrades} from './lib/engine.js';
import {parse,dateFromName} from './lib/parser.js';
import {dflt} from './lib/fees.js';
import {ym,sum,ymd} from './lib/format.js';
import {validateEvents} from './lib/events.js';
import {$} from './lib/dom.js';
import {saveFile} from './services/download.js';
import {notify,dismiss,liftToasts} from './services/notify.js';
import {tradeCardModel,dayCardModel} from './lib/tradeCard.js';
import {shareCard} from './services/cardImage.js';
import {calendarWorkbook,insightsWorkbook,toXlsx,XLSX_TYPE} from './lib/workbooks.js';
import {TabBar} from './components/TabBar.js';
import {Gate} from './components/Gate.js';
import {AccountMenu} from './components/AccountMenu.js';
import {Modal} from './components/Modal.js';
import {dashboard} from './views/dashboard.js';
import {calendar} from './views/calendar.js';
import {insights} from './views/insights.js';
import {trades,tradeList,filterTrades} from './views/trades.js';
import {settings} from './views/settings.js';
import {dayModal,weekModal} from './views/calendarModal.js';
import {latest} from './views/shared.js';

const VIEWS={dash:dashboard,cal:calendar,ins:insights,trd:trades,set:settings};
const TABS=[{id:'dash',label:'Dashboard',icon:'M3 3h8v10H3zM13 3h8v6h-8zM13 11h8v10h-8zM3 15h8v6H3z'},{id:'cal',label:'Calendar',icon:'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4'},
  {id:'ins',label:'Insights',icon:'M5 20V10M12 20V4M19 20v-7'},{id:'trd',label:'Trades',icon:'M4 6h16M4 12h16M4 18h10'},
  {id:'set',label:'Settings',icon:'M4 7h9M17 7h3M4 17h3M11 17h9M15 5a2 2 0 1 0 0 4a2 2 0 1 0 0-4M9 15a2 2 0 1 0 0 4a2 2 0 1 0 0-4'}];
const SIGNED_OUT_GATE={title:'Sign in to Tape',text:'Your journal is private to your Google account and syncs across your devices. First time here? Continuing with Google creates your account.',action:'in'};
// Closing the Google popup (or clicking twice) is not an error worth showing.
const QUIET_SIGN_IN_ERRORS=new Set(['auth/popup-closed-by-user','auth/cancelled-popup-request']);
const ctx=()=>({st,...buildTrades(st.UP,st.CFG)});
const root=$('#view');

// Theme: state.theme -> <html data-theme>. Dark is the CSS default; index.html applies a saved light theme before first paint.
// The switch is not rebuilt when the theme changes (that would close the menu), so its aria-checked is synced here.
function renderTheme(){
  document.documentElement.dataset.theme=st.theme;
  const toggle=$('[data-theme-toggle]');if(toggle)toggle.setAttribute('aria-checked',String(st.theme==='dark'));
}

// Avatar in the header. Rebuilt only when the person changes, so an open menu survives every other re-render.
let accountKey='';
function renderAccount(){
  const u=st.user,key=u?[u.uid,u.displayName,u.email,u.photoURL].join('|'):'';
  $('#account').hidden=!u;
  if(key===accountKey)return;
  accountKey=key;$('#account').classList.remove('is-open');
  $('#account').innerHTML=u?AccountMenu({name:u.displayName,email:u.email,photo:u.photoURL,dark:st.theme==='dark'}):'';
}

// Modal: one <dialog id="modal"> outside #view, so the re-render after nearly every state change can't close it.
// st.modal = {kind:'day'|'week', key} says what it shows. Its content is rebuilt only when that content changes.
const modalEl=$('#modal');let modalHtml='',modalShown='';
const modalContent=cx=>{if(!cx||!st.modal)return null;const{kind,key}=st.modal;
  return kind==='day'?dayModal(cx,key):kind==='week'?weekModal(cx,key):null};
// Replace the dialog's content without losing the person's place: scroll position stays (unless it is a different day or week), and a
// focused control marked [data-focus] gets its focus, caret and unsaved text back. Without this, the re-render that follows every
// saved note would knock the cursor out of the field and drop what was being typed.
function swapModal(html,sameView){
  const a=document.activeElement,f=modalEl.contains(a)&&a.dataset.focus?{key:a.dataset.focus,value:a.value,from:a.selectionStart,to:a.selectionEnd}:null;
  const body=modalEl.querySelector('.modal-body'),top=body&&sameView?body.scrollTop:0;
  modalEl.innerHTML=html;
  const nb=modalEl.querySelector('.modal-body');if(nb)nb.scrollTop=top;
  let el=f&&modalEl.querySelector(`[data-focus="${f.key}"]`);
  // Stepping onto the last (or first) day disables that arrow, and a disabled button can't hold focus: move to the other arrow.
  if(el&&el.disabled&&(f.key==='next'||f.key==='prev'))el=modalEl.querySelector(`[data-focus="${f.key==='next'?'prev':'next'}"]`);
  if(el){if(el.matches('textarea,input'))el.value=f.value;el.focus({preventScroll:true});try{el.setSelectionRange(f.from,f.to)}catch{}}
}
function renderModal(cx){
  const c=modalContent(cx);
  if(!c){st.modal=null;modalHtml=modalShown='';if(modalEl.open)modalEl.close();return} // nothing to show (signed out, or the data vanished)
  const html=Modal(c),shown=st.modal.kind+st.modal.key;
  if(html!==modalHtml){swapModal(html,shown===modalShown);modalHtml=html;modalShown=shown}
  if(!modalEl.open){modalEl.showModal();liftToasts()}
}
// After a note is saved the field already shows what was typed. Record that as the modal's current markup, so the echo
// from the cloud (same content) doesn't rebuild the dialog under the cursor.
function syncModal(){const c=modalContent(ctx());if(c)modalHtml=Modal(c)}
// Whatever is being typed is saved (its change event) before the dialog goes away or moves to another day.
function flushModal(){const a=document.activeElement;if(modalEl.contains(a)&&a.matches('textarea,input'))a.blur()}
// Closing puts focus back on the day (or week) that opened it. #view was rebuilt in between, so look the button up again.
function closeModal(){
  flushModal();const m=st.modal;set({modal:null});
  const opener=m&&$(m.kind==='week'?`[data-week="${m.key}"]`:`[data-day="${m.key}"]`);if(opener)opener.focus({preventScroll:true});
}
// Another trading day; the calendar behind follows to that day's month so closing lands on a button that exists.
function goToDay(key){flushModal();set({modal:{kind:'day',key},mon:key.slice(0,7)})}

function render(anim=true){
  renderTheme();
  const ready=st.user&&st.loaded;
  $('#auth-gate').hidden=ready;$('#auth-gate').innerHTML=Gate(st.gate);
  renderAccount();
  $('#view').hidden=$('#toolbar').hidden=!ready; // with no files the views show their own empty state, so every tab stays reachable
  if(!ready)return renderModal(null);
  const cx=ctx(),v=VIEWS[st.tab](cx);
  root.className=anim?'':'is-static';root.innerHTML=TabBar({tabs:TABS,active:st.tab})+v.html;if(v.mount)v.mount(root);
  renderModal(cx);
}
subscribe(render);

// ---- cloud wiring ----
let gotU=false,gotL=false;
const afterData=()=>set({loaded:gotU&&gotL},!st.loaded);
const cloud=createCloud(config,{
  onUser:u=>{gotU=gotL=false;set({user:u,loaded:false,UP:[],CFG:dflt(),NT:{},exp:null,modal:null,EV:null,isAdmin:false,evDraft:null,tab:'dash',
    gate:u?{title:'Loading your journal…'}:SIGNED_OUT_GATE},true)},
  onSettings:d=>{gotU=true;st.CFG={...dflt(),...(d.cfg||{})};st.NT=d.nt||{};afterData()},
  onLogs:l=>{gotL=true;st.UP=l;afterData()},
  onEvents:d=>set({EV:d}),onAdmin:b=>set({isAdmin:b}),
  onError:e=>set({loaded:false,gate:e.code==='permission-denied'?{title:'Access denied',text:'Your account couldn’t be opened. Sign out and back in; if it keeps happening, contact the site owner.',action:'out'}:{title:'Couldn’t load your data',text:e.message,action:'out'}},true),
  onSaveError:e=>notify({tone:'negative',title:'Couldn’t save',text:String(e.code||e.message)})
});
const saveSettings=()=>cloud.saveSettings(st.CFG,st.NT),saveLogs=()=>cloud.saveLogs(st.UP);
const refreshList=()=>{$('#trade-list').innerHTML=tradeList(ctx())};

const SKIP_HINT='No executions found. Expecting tab-separated rows with “BOT/SLD qty” messages, under ~900 KB.';
// One toast per upload, so results never stack. Everything added is a success; anything skipped needs a look, so it is a failure.
function uploadToast(added,skipped){
  const files=n=>n===1?'1 file':n+' files',names=skipped.join(', ');
  if(!skipped.length){const fills=sum(added.map(a=>a.n));
    return{title:added.length===1?`Added ${added[0].name}`:`Added ${files(added.length)}`,text:`${fills} execution${fills===1?'':'s'}`}}
  return{tone:'negative',
    title:!added.length?`Skipped ${skipped.length===1?names:files(skipped.length)}`:`Added ${files(added.length)}, skipped ${skipped.length}`,
    text:(added.length||skipped.length>1?names+': ':'')+SKIP_HINT}
}
async function readFiles(files){
  // Copy first: an <input>'s FileList is live (the change handler clears the input right after calling us)
  // and dataTransfer.files is invalidated once the drop event ends.
  const picked=Array.from(files);if(!picked.length)return;
  const skipped=[],added=[];
  try{
    // Read every file BEFORE touching st.UP. A Firestore snapshot assigns st.UP wholesale (onLogs), so if one landed
    // between two awaits it used to wipe the files already queued and only the last one survived.
    const read=await Promise.all(picked.map(async f=>({f,txt:await f.text()})));
    for(const{f,txt}of read){const date=dateFromName(f.name),fl=parse(txt,date);
      if(!fl.length||txt.length>9e5){skipped.push(f.name);continue}
      added.push({id:Math.random().toString(36).slice(2),name:f.name,date,txt,n:fl.length})}
    if(added.length){ // one synchronous assignment from the current list: nothing can interleave
      st.UP=st.UP.filter(u=>!added.some(a=>a.name===u.name)).concat(added);
      set({tab:'dash',mon:''},true);saveLogs()}
  }catch(e){console.error(e);return notify({tone:'negative',title:'Couldn’t add files',text:String(e&&e.message||e)})}
  // Feedback is a toast so it shows wherever the files came from (drop zone, toolbar button or drag and drop).
  notify(uploadToast(added,skipped));
}

// ---- events (delegated; markup only carries data-* hooks) ----
const on=(type,sel,fn)=>document.addEventListener(type,e=>{const t=e.target.closest&&e.target.closest(sel);if(t)fn(t,e)});
on('click','[data-tab]',b=>set({tab:b.dataset.tab},true));
on('click','[data-tf]',b=>set({tf:b.dataset.tf}));
on('click','[data-net]',b=>set({net:b.dataset.net==='1'}));
const calendarMonth=()=>st.mon||(ctx().trades.length?latest(ctx().trades).slice(0,7):ymd(new Date()).slice(0,7));
on('click','[data-m]',b=>{const[y,mo]=calendarMonth().split('-').map(Number);set({mon:ym(new Date(y,mo-1+ +b.dataset.m,1))})});
on('click','[data-ev-filter]',b=>{const key=b.dataset.evFilter,active=st.evFilters||['fed','inflation','jobs','gdp'];set({evFilters:active.includes(key)?active.filter(x=>x!==key):[...active,key]})});
on('click','[data-day]',b=>set({modal:{kind:'day',key:b.dataset.day}}));
on('click','[data-week]',b=>set({modal:{kind:'week',key:b.dataset.week}}));
on('click','[data-modal-close]',closeModal);
on('click','[data-modal-go]',b=>{if(b.dataset.modalGo)goToDay(b.dataset.modalGo)});
on('click','[data-open-trades]',b=>{flushModal();set({modal:null,tab:'trd',q:b.dataset.openTrades,pg:1,exp:null},true)}); // the Trades search matches dates
modalEl.addEventListener('cancel',flushModal); // Esc: save what is being typed first
modalEl.addEventListener('close',()=>{if(st.modal)closeModal()}); // Esc closes the dialog natively; bring the state along
// Left/right arrows step through trading days, unless the person is typing.
addEventListener('keydown',e=>{const dir={ArrowLeft:'prev',ArrowRight:'next'}[e.key];
  if(!dir||!modalEl.open||e.altKey||e.ctrlKey||e.metaKey||e.target.closest('textarea,input,select'))return;
  const b=modalEl.querySelector(`[data-modal-nav="${dir}"]`);if(b&&!b.disabled){e.preventDefault();b.click()}});
// Backdrop click closes it, but only if the press also started on the backdrop (selecting text and letting go outside must not).
let pressedBackdrop=false;
modalEl.addEventListener('pointerdown',e=>{pressedBackdrop=e.target===modalEl});
modalEl.addEventListener('click',e=>{if(pressedBackdrop&&e.target===modalEl)closeModal()});
on('click','[data-exp]',b=>set({exp:st.exp===b.dataset.exp?null:b.dataset.exp}));
on('click','[data-pg]',b=>{const pages=Math.max(1,Math.ceil(filterTrades(st,ctx().trades).length/st.ps));st.pg=Math.min(Math.max(1,st.pg+ +b.dataset.pg),pages);refreshList();$('#trade-search').scrollIntoView({block:'nearest'})});
on('click','[data-sym]',b=>set({q:st.q===b.dataset.sym?'':b.dataset.sym,pg:1}));
// Notes: the day modal's controls name their entry in [data-note-key]; the Trades tab's rely on the expanded trade (st.exp).
const noteKey=el=>el.dataset.noteKey||st.exp;
// A day with no text and no tags has nothing to remember, so its entry is dropped (keeps the one notes document small).
const tidyNote=k=>{const n=st.NT[k];if(k.startsWith('day:')&&n&&!n.n&&!(n.tags||[]).length)delete st.NT[k]};
on('click','[data-rt]',b=>{const k=noteKey(b),n=st.NT[k];n.tags=n.tags.filter(x=>x!==b.dataset.rt);tidyNote(k);saveSettings();set({})});
// Excel exports. Calendar = the month on screen plus every day on record; Insights follows the Gross/Net toggle.
on('click','[data-export]',b=>{const c=ctx();if(!c.trades.length)return;
  const w=b.dataset.export==='calendar'?calendarWorkbook({trades:c.trades,mon:st.mon||latest(c.trades).slice(0,7)}):insightsWorkbook(c);
  saveFile(w.name+'.xlsx',toXlsx(w),XLSX_TYPE)});
// Export a stored log: name and raw text come from st.UP, which is the live Firestore snapshot of users/{uid}/logs.
on('click','[data-export-log]',b=>{const u=st.UP.find(x=>x.id===b.dataset.exportLog);if(u&&u.txt)saveFile(u.name||'messages.txt',u.txt,'text/plain;charset=utf-8')});
// Account funds live in cfg.funds, so they ride the existing settings document (no new Firestore path or rule needed).
const funds=()=>st.CFG.funds||(st.CFG.funds={start:0,entries:[]});
on('change','[data-fund-start]',t=>{funds().start=parseFloat(t.value)||0;saveSettings();set({})});
on('click','[data-fund-add]',b=>{
  const box=b.closest('.fund-form'),v=k=>box.querySelector(`[data-fund-field="${k}"]`).value,amount=parseFloat(v('amount')),date=v('date'),err=box.querySelector('[data-fund-error]');
  if(!(amount>0)||!/^\d{4}-\d\d-\d\d$/.test(date)){err.textContent='Enter a date and an amount above zero.';err.hidden=false;return}
  funds().entries.push({id:Math.random().toString(36).slice(2),date,type:v('type')==='withdrawal'?'withdrawal':'deposit',amount,note:v('note').trim().slice(0,120)});
  saveSettings();set({})});
on('click','[data-fund-del]',b=>{const f=funds();f.entries=f.entries.filter(x=>x.id!==b.dataset.fundDel);saveSettings();set({})});
on('click','[data-del]',b=>{st.UP=st.UP.filter(u=>u.id!==b.dataset.del);saveLogs();set({})});
// Admin: the market-events file (Settings, only shown to the admin). The security rules are what actually enforce who may upload.
on('change','#events-file',async t=>{const f=t.files[0];t.value=''; // reset so choosing the same file again still fires
  if(!f||!st.isAdmin)return;set({evDraft:{name:f.name,...validateEvents(await f.text(),ymd(new Date()))}})});
on('click','[data-ev-cancel]',()=>set({evDraft:null}));
on('click','[data-ev-upload]',async b=>{const d=st.evDraft;if(!st.isAdmin||!d||!d.ok||b.disabled)return;
  b.disabled=true;b.setAttribute('aria-busy','true');
  try{await cloud.saveEvents(d.doc);set({evDraft:null});notify({title:'Events updated',text:`${d.summary.n} event${d.summary.n===1?'':'s'}, live for everyone`})}
  catch(e){console.error(e);b.disabled=false;b.removeAttribute('aria-busy');notify({tone:'negative',title:'Couldn’t upload the events',text:String(e.code||e.message)})}});
on('click','[data-ev-download]',()=>{if(st.EV)saveFile('tape-events.json',JSON.stringify(st.EV,null,1),'application/json')});
on('click','[data-rs]',()=>{Object.assign(st.CFG,{sched:dflt().sched,map:dflt().map});saveSettings();set({})});
// ---- account menu: the avatar toggles a dropdown; Sign out is a row inside it ----
const accountOpen=()=>$('#account').classList.contains('is-open');
function setAccountMenu(open,focusItem=false){
  const box=$('#account'),btn=box.querySelector('[data-account-toggle]');if(!btn)return;
  box.classList.toggle('is-open',open);btn.setAttribute('aria-expanded',String(open));
  if(open&&focusItem)box.querySelector('[role^=menuitem]').focus();
}
on('click','[data-account-toggle]',(b,e)=>setAccountMenu(!accountOpen(),e.detail===0)); // detail 0 = opened from the keyboard
addEventListener('click',e=>{if(accountOpen()&&!e.target.closest('#account'))setAccountMenu(false)});
addEventListener('focusin',e=>{if(accountOpen()&&!e.target.closest('#account'))setAccountMenu(false)});
addEventListener('keydown',e=>{if(e.key==='Escape'&&accountOpen()){setAccountMenu(false);$('#account [data-account-toggle]').focus()}});
on('click','[data-theme-toggle]',()=>{
  const theme=st.theme==='dark'?'light':'dark';
  const apply=()=>{localStorage.setItem('tape-theme',theme);set({theme})};
  document.startViewTransition?document.startViewTransition(apply):apply(); // short crossfade where supported, instant otherwise
});
// Share a picture of one trade or a whole day: a download on desktop, the share sheet on phones.
// While one is being drawn, both buttons in the row are disabled so nothing is made twice.
async function shareCardFrom(b,build){
  if(b.disabled)return; // already drawing
  const card=build();if(!card)return;
  const group=[...(b.closest('.detail-actions')||b.parentNode).querySelectorAll('button')];
  group.forEach(x=>{x.disabled=true});b.setAttribute('aria-busy','true');
  try{if(await shareCard(card)==='saved')notify({title:'Card saved',text:card.filename})}
  catch(e){console.error(e);notify({tone:'negative',title:'Couldn’t create the image',text:String(e&&e.message||e)})}
  finally{group.forEach(x=>{x.disabled=false});b.removeAttribute('aria-busy')}
}
on('click','[data-share-trade]',b=>shareCardFrom(b,()=>{const t=ctx().trades.find(x=>x.key===b.dataset.shareTrade);return t&&tradeCardModel(t)}));
on('click','[data-share-day]',b=>shareCardFrom(b,()=>{const day=ctx().trades.filter(x=>x.date===b.dataset.shareDay);return day.length?dayCardModel(day):null})); // the whole day, whatever the search box or page shows
on('click','[data-toast-close]',b=>dismiss(b.closest('.toast')));
// A Google photo that fails to load is removed, which reveals the initial underneath.
document.addEventListener('error',e=>{if(e.target.classList&&e.target.classList.contains('avatar-image'))e.target.remove()},true);
on('click','[data-act]',async b=>{
  if(b.dataset.act==='signout')return cloud.signOut();
  if(st.gate.busy)return;
  set({gate:{...SIGNED_OUT_GATE,busy:true}});
  try{await cloud.signIn()}  // success is picked up by onAuthStateChanged -> onUser
  catch(e){set({gate:QUIET_SIGN_IN_ERRORS.has(e.code)?SIGNED_OUT_GATE
    :{title:'Sign-in failed',text:e.code==='auth/popup-blocked'?'Allow pop-ups for this site and try again.':e.message,action:'in'}})}
});
on('keydown','[data-tag]',(t,e)=>{const v=t.value.trim();if(e.key!=='Enter'||!v)return;const k=noteKey(t),n=st.NT[k]||(st.NT[k]={tags:[]});n.tags=n.tags||[];if(!n.tags.includes(v))n.tags.push(v);t.value='';saveSettings();set({})});
on('input','#trade-search',t=>{st.q=t.value;st.pg=1;refreshList()});
on('change','[data-ps]',t=>{st.ps=+t.value;st.pg=1;localStorage.setItem('tape-ps',st.ps);refreshList()});
on('change','[data-mm],[data-yy]',t=>{const[y,mo]=calendarMonth().split('-');set({mon:t.dataset.mm!==undefined?y+'-'+t.value.padStart(2,'0'):t.value+'-'+mo})});
on('change','[data-note]',t=>{const k=noteKey(t);(st.NT[k]||(st.NT[k]={tags:[]})).n=t.value;tidyNote(k);saveSettings();syncModal()});
on('change','[data-c]',t=>{const k=t.dataset.c;st.CFG[k]=k==='ver'?t.value:parseFloat(t.value)||0;saveSettings();set({})});
on('change','[data-s]',t=>{const[i,j]=t.dataset.s.split('|');st.CFG.sched[Object.keys(st.CFG.sched)[i]][j]=parseFloat(t.value)||0;saveSettings();set({})});
on('change','[data-map]',t=>{st.CFG.map=Object.fromEntries(t.value.split('\n').map(l=>l.split('=').map(x=>x.trim())).filter(x=>x[0]&&x[1]));saveSettings();set({})});
on('change','#file-input,#file-input-more',t=>{readFiles(t.files);t.value=''});
on('click','[data-pick-file]',()=>$('#file-input').click());
['dragenter','dragover'].forEach(v=>addEventListener(v,e=>{e.preventDefault();document.body.classList.add('is-dragging')}));
['dragleave','drop'].forEach(v=>addEventListener(v,e=>{e.preventDefault();document.body.classList.remove('is-dragging')}));
addEventListener('drop',e=>{if(e.dataTransfer.files.length)readFiles(e.dataTransfer.files)});
if(typeof matchMedia==='function')matchMedia('(max-width:640px)').addEventListener('change',()=>set({}));
render();
