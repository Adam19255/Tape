import {esc} from '../lib/format.js';
const SIGN_OUT_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 8l4 4-4 4M20 12H9"/></svg>';
const MOON_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>';
const initial=(name,email)=>(name||email||'?').trim().charAt(0).toUpperCase();
/**
 * Avatar button + dropdown. Open/closed is the .is-open class on the wrapping .account element (toggled in main.js),
 * so re-rendering the page never snaps an open menu shut. The initial sits under the photo as the fallback.
 * photo is only used when it is an https URL. dark is the current theme: it sets the Dark mode switch (main.js keeps it in sync).
 */
export const AccountMenu=({name='',email='',photo='',dark=true})=>`<button class="account-button" data-account-toggle aria-haspopup="menu" aria-expanded="false" aria-controls="account-menu" aria-label="Account menu for ${esc(email||name||'your account')}"><span class="avatar-initial" aria-hidden="true">${esc(initial(name,email))}</span>${/^https:\/\//.test(photo||'')?`<img class="avatar-image" src="${esc(photo)}" alt="" width="40" height="40" referrerpolicy="no-referrer">`:''}</button>
<div class="account-menu" id="account-menu"><div class="account-menu-header"><strong>${esc(name||'Signed in')}</strong><span>${esc(email)}</span></div><div role="menu" aria-label="Account"><button class="account-menu-item" role="menuitemcheckbox" aria-checked="${dark}" data-theme-toggle>${MOON_ICON}<span>Dark mode</span><span class="switch" aria-hidden="true"><span class="switch-thumb"></span></span></button><button class="account-menu-item" role="menuitem" data-act="signout">${SIGN_OUT_ICON}<span>Sign out</span></button></div></div>`;
