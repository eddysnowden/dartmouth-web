// Dartmouth Web — ui.js
// Wires the auth modal (sign in / sign up / Google) and keeps the nav
// bar in sync with the live auth state broadcast by auth.js.

import {
  signUpWithEmail, signInWithEmail, signInWithGoogle, signOutUser, authErrorMessage
} from "./auth.js";

function $(sel){ return document.querySelector(sel); }
function $all(sel){ return document.querySelectorAll(sel); }

function openModal(){ $('[data-auth-modal]')?.classList.add('open'); }
function closeModal(){ $('[data-auth-modal]')?.classList.remove('open'); }

document.addEventListener('DOMContentLoaded', () => {

  $all('[data-open-auth]').forEach(el => el.addEventListener('click', openModal));
  $all('[data-close-auth]').forEach(el => el.addEventListener('click', closeModal));
  $('[data-auth-modal]')?.addEventListener('click', (e) => {
    if(e.target === e.currentTarget) closeModal();
  });

  // tab switching
  $all('[data-auth-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      $all('[data-auth-tab]').forEach(t => t.classList.remove('active'));
      $all('[data-auth-pane]').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      $(`[data-auth-pane="${tab.dataset.authTab}"]`)?.classList.add('active');
    });
  });

  // sign up
  $('[data-signup-form]')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const errorEl = form.querySelector('[data-form-error]');
    errorEl.textContent = '';
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;
    try{
      await signUpWithEmail(name, email, password);
      closeModal();
    } catch(err){
      errorEl.textContent = authErrorMessage(err);
    }
  });

  // sign in
  $('[data-signin-form]')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const errorEl = form.querySelector('[data-form-error]');
    errorEl.textContent = '';
    const email = form.email.value.trim();
    const password = form.password.value;
    try{
      await signInWithEmail(email, password);
      closeModal();
    } catch(err){
      errorEl.textContent = authErrorMessage(err);
    }
  });

  // google (both panes)
  $all('[data-google-signin]').forEach(btn => {
    btn.addEventListener('click', async () => {
      try{
        await signInWithGoogle();
        closeModal();
      } catch(err){
        const errorEl = btn.closest('.authpane')?.querySelector('[data-form-error]');
        if(errorEl) errorEl.textContent = authErrorMessage(err);
      }
    });
  });

  // sign out
  $all('[data-signout]').forEach(el => el.addEventListener('click', async () => {
    await signOutUser();
  }));
});

// Keep the nav in sync with live auth state.
document.addEventListener('dartmouth:authchange', (e) => {
  const { user, profile } = e.detail;
  const signedOutEls = $all('[data-when-signed-out]');
  const signedInEls = $all('[data-when-signed-in]');
  const canPublishEls = $all('[data-when-can-publish]');
  const revokedEls = $all('[data-when-revoked]');
  const adminEls = $all('[data-when-admin]');
  const nameEls = $all('[data-user-name]');

  if(user && profile){
    signedOutEls.forEach(el => el.style.display = 'none');
    signedInEls.forEach(el => el.style.display = '');
    nameEls.forEach(el => el.textContent = profile.displayName || 'Account');

    const revoked = profile.publishingRevoked === true;
    canPublishEls.forEach(el => el.style.display = revoked ? 'none' : '');
    revokedEls.forEach(el => el.style.display = revoked ? '' : 'none');
    adminEls.forEach(el => el.style.display = profile.adminRole ? '' : 'none');
  } else {
    signedOutEls.forEach(el => el.style.display = '');
    signedInEls.forEach(el => el.style.display = 'none');
    canPublishEls.forEach(el => el.style.display = 'none');
    revokedEls.forEach(el => el.style.display = 'none');
    adminEls.forEach(el => el.style.display = 'none');
  }
});
