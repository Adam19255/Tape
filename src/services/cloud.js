import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getAuth,onAuthStateChanged,signInWithPopup,GoogleAuthProvider,signOut} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {getFirestore,doc,collection,setDoc,deleteDoc,onSnapshot} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

/**
 * The only file that knows about Firebase. Swap it for another backend by keeping this shape:
 *   createCloud(config,{onUser,onSettings,onLogs,onEvents,onAdmin,onError,onSaveError}) -> {signIn,signOut,saveLogs,saveSettings,saveEvents}
 * onEvents(doc|null) and onAdmin(bool) are optional extras: if they can't be read (say the rules aren't deployed yet) the app carries on
 * without them, and never shows the "Access denied" screen that onError does for the person's own data.
 */
export function createCloud(config,h){
  const app=initializeApp(config),auth=getAuth(app),db=getFirestore(app);
  const google=new GoogleAuthProvider();
  google.setCustomParameters({prompt:'select_account'}); // always offer the account chooser
  let U=null,off=null,REM=new Set();
  const guard=p=>p.catch(h.onSaveError);
  onAuthStateChanged(auth,u=>{
    if(off){off();off=null}
    U=u;REM=new Set();h.onUser(u);if(!u)return;
    const a=onSnapshot(doc(db,'users',u.uid),x=>h.onSettings(x.data()||{}),h.onError);
    const b=onSnapshot(collection(db,'users',u.uid,'logs'),x=>{REM=new Set(x.docs.map(d=>d.id));h.onLogs(x.docs.map(d=>({id:d.id,...d.data()})))},h.onError);
    // Shared market events, and whether this person is the admin. Both are optional, so a failure means "none", never an error screen.
    const optional=(what,fallback)=>e=>{console.warn(`Couldn't read ${what}:`,e&&e.code||e);fallback()};
    const c=onSnapshot(doc(db,'shared','events'),x=>h.onEvents(x.exists()?x.data():null),optional('market events',()=>h.onEvents(null)));
    const d=onSnapshot(doc(db,'admins',u.uid),x=>h.onAdmin(x.exists()),optional('the admin flag',()=>h.onAdmin(false)));
    off=()=>{a();b();c();d()};
  });
  return{
    signIn:()=>signInWithPopup(auth,google),
    signOut:()=>signOut(auth),
    saveLogs(UP){if(!U)return;
      for(const u of UP)if(!REM.has(u.id))guard(setDoc(doc(db,'users',U.uid,'logs',u.id),{name:u.name,date:u.date,txt:u.txt||'',n:u.n||0}));
      for(const id of REM)if(!UP.some(u=>u.id===id))guard(deleteDoc(doc(db,'users',U.uid,'logs',id)));},
    saveSettings(cfg,nt){if(U)guard(setDoc(doc(db,'users',U.uid),{cfg,nt}))},
    // Admin only (the rules decide). Unlike the saves above this returns the promise: the upload screen needs to know whether it worked.
    saveEvents(data){if(!U)return Promise.reject(new Error('Not signed in'));return setDoc(doc(db,'shared','events'),data)}
  };
}
