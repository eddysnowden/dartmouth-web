// Dartmouth Web — auth.js
// Handles account creation/sign-in/sign-out, and keeps a live-updating
// picture of the current user's role, admin role, and publishing status
// available to every page via `window.dartmouth`.

import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, getDoc, setDoc, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

window.dartmouth = window.dartmouth || {};
window.dartmouth.user = null;      // firebase auth user object, or null (Guest)
window.dartmouth.profile = null;   // users/{uid} Firestore doc, or null

let unsubscribeProfile = null;

function broadcastAuthChange(){
  document.dispatchEvent(new CustomEvent("dartmouth:authchange", {
    detail: { user: window.dartmouth.user, profile: window.dartmouth.profile }
  }));
}

// Creates the users/{uid} doc the first time someone ever signs in,
// whether that's via email/password or Google. Never overwrites an
// existing doc — role/adminRole/publishingRevoked live here and must
// only ever be touched by the admin-update path (see firestore.rules).
async function ensureUserDoc(user, displayNameFallback){
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if(snap.exists()) return;

  await setDoc(ref, {
    displayName: user.displayName || displayNameFallback || "Unnamed",
    email: user.email,
    bio: "",
    socials: { website: null, twitter: null, instagram: null, discord: null },
    role: "user",
    adminRole: null,
    publishingRevoked: false,
    revocation: null,
    articleCount: 0,
    createdAt: serverTimestamp()
  });
}

export async function signUpWithEmail(displayName, email, password){
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
  await ensureUserDoc(cred.user, displayName);
  return cred.user;
}

export async function signInWithEmail(email, password){
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signInWithGoogle(){
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  await ensureUserDoc(cred.user, cred.user.displayName);
  return cred.user;
}

export async function signOutUser(){
  await signOut(auth);
}

// Turns a Firebase auth error code into a plain-language message —
// nobody reading this site should have to parse "auth/weak-password".
export function authErrorMessage(err){
  const map = {
    "auth/email-already-in-use": "That email already has an account — try signing in instead.",
    "auth/invalid-email": "That doesn't look like a valid email address.",
    "auth/weak-password": "Password needs to be at least 6 characters.",
    "auth/wrong-password": "Wrong password. Try again.",
    "auth/user-not-found": "No account found with that email.",
    "auth/invalid-credential": "Email or password didn't match.",
    "auth/popup-closed-by-user": "Sign-in was closed before finishing.",
    "auth/too-many-requests": "Too many attempts — wait a bit and try again."
  };
  return map[err.code] || "Something went wrong. Try again.";
}

// Live auth + profile state, available to every page that includes this file.
onAuthStateChanged(auth, (user) => {
  window.dartmouth.user = user;

  if(unsubscribeProfile){ unsubscribeProfile(); unsubscribeProfile = null; }

  if(!user){
    window.dartmouth.profile = null;
    broadcastAuthChange();
    return;
  }

  const ref = doc(db, "users", user.uid);
  unsubscribeProfile = onSnapshot(ref, (snap) => {
    window.dartmouth.profile = snap.exists() ? snap.data() : null;
    broadcastAuthChange();
  });
});
