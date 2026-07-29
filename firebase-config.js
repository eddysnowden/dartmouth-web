// Dartmouth Web — Firebase config & shared init
//
// 1. Go to console.firebase.google.com → create a project (or use an
//    existing one) → Project settings → General → "Your apps" → Web app.
// 2. Copy the config object it gives you and paste the values below.
// 3. In the console, enable: Authentication → Sign-in method → Email/Password
//    and Google. Then Firestore Database → Create database.
//    (No Storage step — images go through Cloudinary instead, see
//    cloudinary-config.js. Firebase Storage now requires a linked
//    billing account even on the free tier, so we skip it entirely.)
// 4. Deploy firebase/firestore.rules from the Firestore console's
//    Rules tab (paste + publish — no CLI needed).

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC6NMsudgvJVx11h9RTz5tvN28pmEDjQrI",
  authDomain: "dartmouth-web.firebaseapp.com",
  projectId: "dartmouth-web"",
  messagingSenderId: "306120421851",
  appId: "1:306120421851:web:98166667fdbdaba37cb7fe"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
