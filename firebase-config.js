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
  apiKey: "REPLACE_WITH_YOUR_API_KEY",
  authDomain: "REPLACE_WITH_YOUR_PROJECT.firebaseapp.com",
  projectId: "REPLACE_WITH_YOUR_PROJECT_ID",
  messagingSenderId: "REPLACE_WITH_YOUR_SENDER_ID",
  appId: "REPLACE_WITH_YOUR_APP_ID"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
