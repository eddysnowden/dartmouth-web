// Dartmouth Web — articles.js
// Create + fetch articles. Body is an ordered list of blocks:
//   { type: "text", content: "..." }
//   { type: "image", url: "...", caption: "..." }
// External links are only allowed in the references array — never inline
// in a text block. This module does a best-effort client-side check for
// that before submitting; it's a courtesy, not the enforcement boundary.

import { db } from "./firebase-config.js";
import {
  collection, setDoc, getDoc, getDocs, doc, query, where, orderBy, limit,
  serverTimestamp, increment, updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { uploadImageToCloudinary } from "./cloudinary-config.js";

const URL_PATTERN = /\bhttps?:\/\/[^\s]+/i;

// Returns an array of block indices that contain something that looks
// like a URL. Empty array = looks clean. This is intentionally simple —
// catching the honest mistake, not defeating a determined workaround.
export function findLinksInBody(blocks){
  const hits = [];
  blocks.forEach((b, i) => {
    if(b.type === "text" && URL_PATTERN.test(b.content)) hits.push(i);
  });
  return hits;
}

// Article images go through Cloudinary (free, no billing account) rather
// than Firebase Storage (which now requires one, even on the free tier).
// articleId is kept in the signature for call-site consistency and future
// use (e.g. tagging/organizing uploads), but isn't required by Cloudinary
// itself the way it was required for the old Storage file path.
export function newArticleId(){
  return doc(collection(db, "articles")).id;
}

export async function uploadArticleImage(articleId, file){
  return await uploadImageToCloudinary(file);
}

export async function createArticle({ id, title, category, body, references }){
  const user = window.dartmouth.user;
  const profile = window.dartmouth.profile;
  if(!user || !profile) throw new Error("Sign in before publishing.");
  if(profile.publishingRevoked) throw new Error("Publishing is currently revoked on this account.");

  const linkHits = findLinksInBody(body);
  if(linkHits.length){
    throw new Error("Looks like a link is inside the article text — links can only go in References.");
  }

  const articleId = id || newArticleId();

  await setDoc(doc(db, "articles", articleId), {
    title,
    category,
    body,
    references: references || [],
    authorId: user.uid,
    authorName: profile.displayName,
    status: "published",
    adminNotes: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  // best-effort denormalized counter for Star User consideration later
  try {
    await updateDoc(doc(db, "users", user.uid), { articleCount: increment(1) });
  } catch(e){ /* non-fatal */ }

  return articleId;
}

export async function fetchRecentArticles(count = 20){
  const q = query(
    collection(db, "articles"),
    where("status", "==", "published"),
    orderBy("createdAt", "desc"),
    limit(count)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function fetchArticle(id){
  const snap = await getDoc(doc(db, "articles", id));
  if(!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}
