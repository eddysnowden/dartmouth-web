// Dartmouth Web — admin.js
// Query + write helpers behind the admin dashboard. See docs/SCHEMA.md
// for the model this enforces (mirrored in firebase/firestore.rules —
// this file assumes those rules are deployed; it does not re-implement
// the permission checks, just calls the writes the rules will accept
// or reject).

import { db } from "./firebase-config.js";
import {
  collection, doc, getDocs, query, where, orderBy, limit, startAt, endAt,
  writeBatch, updateDoc, arrayUnion, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ---------------- users ----------------

export async function fetchRecentUsers(count = 50){
  const q = query(collection(db, "users"), orderBy("createdAt", "desc"), limit(count));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}

// Firestore range-query "starts with" trick. Case-sensitive — if this
// matters a lot later, store a lowercase displayName field to search
// against instead. Fine for a first pass.
export async function searchUsersByName(prefix, count = 50){
  const q = query(
    collection(db, "users"),
    orderBy("displayName"),
    startAt(prefix), endAt(prefix + "\uf8ff"),
    limit(count)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}

// Revoke and restore both write the user doc and a banLogs entry in the
// same batch — see the note at the top of firestore.rules about why this
// is "the app always does both together" rather than an airtight atomic
// guarantee; that would need Cloud Functions.
export async function revokePublishing(adminUid, targetUid, reason, permanent){
  const batch = writeBatch(db);
  batch.update(doc(db, "users", targetUid), {
    publishingRevoked: true,
    revocation: { reason, revokedBy: adminUid, revokedAt: serverTimestamp(), permanent: !!permanent }
  });
  batch.set(doc(collection(db, "banLogs")), {
    targetUserId: targetUid, action: "revoked", performedBy: adminUid, reason, timestamp: serverTimestamp()
  });
  await batch.commit();
}

export async function restorePublishing(adminUid, targetUid, reason){
  const batch = writeBatch(db);
  batch.update(doc(db, "users", targetUid), {
    publishingRevoked: false,
    revocation: null
  });
  batch.set(doc(collection(db, "banLogs")), {
    targetUserId: targetUid, action: "restored", performedBy: adminUid, reason: reason || "Restored by admin", timestamp: serverTimestamp()
  });
  await batch.commit();
}

// role: 'user' | 'starUser' | 'certifiedUser' — rules block certifiedUser
// unless the caller is Special Administrator+, so the dashboard hides
// that button rather than let it silently fail, but the rule is the
// real boundary either way.
export async function setUserRole(targetUid, role){
  await updateDoc(doc(db, "users", targetUid), { role });
}

// adminRole: null | 'administrator' only — rules reject anything else
// from the client, by design (see docs/SCHEMA.md).
export async function setAdminRole(targetUid, adminRole){
  await updateDoc(doc(db, "users", targetUid), { adminRole });
}

// ---------------- articles (moderation) ----------------

export async function fetchArticlesForModeration(count = 50){
  const q = query(collection(db, "articles"), orderBy("createdAt", "desc"), limit(count));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function setArticleStatus(articleId, status){
  await updateDoc(doc(db, "articles", articleId), { status, updatedAt: serverTimestamp() });
}

// Note: arrayUnion elements can't contain the serverTimestamp() sentinel
// (a Firestore restriction on values inside arrays), so this note's
// timestamp is a plain client Date instead of serverTimestamp().
export async function addAdminNote(articleId, adminId, note){
  await updateDoc(doc(db, "articles", articleId), {
    adminNotes: arrayUnion({ adminId, note, timestamp: new Date() })
  });
}
