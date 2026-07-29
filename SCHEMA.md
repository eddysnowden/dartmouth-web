# Dartmouth Web — Data Model & Roles Reference

This is the foundation everything else (UI, security rules, admin dashboard) is
built on. Keep this file in sync with `firebase/firestore.rules` — if you
change a permission here, change it there too.

---

## 1. Account roles (who can read/write content)

Stored on `users/{uid}.role`. These are about **content participation**, not
moderation power.

| Role | Requires account? | Can read | Can publish | Can join events | Granted by |
|---|---|---|---|---|---|
| **Guest** | No | Yes | No | No | Default state for anyone not signed in — not a Firestore document at all |
| **User** | Yes | Yes | Yes | Yes | Automatic on sign-up |
| **Star User** | Yes | Yes | Yes | Yes | Manual, by any Administrator+, based on participation/article quality |
| **Certified User** | Yes | Yes | Yes | Yes | Manual, by Special Administrator+ only (this is a verification mark, not a participation reward) |

Guest is intentionally **not** a role value stored anywhere — it's just what
an unauthenticated visitor is. The moment someone signs in, they're a `User`
at minimum.

## 2. Admin roles (moderation power)

Stored separately, on `users/{uid}.adminRole` (`null` if not an admin). This
stacks on top of whatever account role the person has — an admin still has a
normal reading/writing account underneath.

| Admin role | Can do |
|---|---|
| **Administrator** | Delete articles, temporarily revoke a user's publishing rights, edit any article, add admin notes to an article, award Star/Certified status |
| **Special Administrator** | Everything Administrator can, plus: permanently revoke a user's publishing rights (see §3 — this is never account deletion), demote/remove an Administrator's admin role, create events |
| **General Administrator** | Everything. Full access, including granting/revoking Special Administrator |

Only a **General Administrator** can create or remove another General
Administrator or Special Administrator. This can't be done through the
client app at all — it's a manual change made directly in the Firebase
console, on purpose, so the highest tier of access can't be granted or
revoked by a bug or a compromised session.

## 3. Publishing revocation (not a ban on the account)

This is the mechanism behind both "temporary" and "permanent" revocation in
the table above. There is no state that deletes or locks a whole account —
only a person's ability to publish.

`users/{uid}`:
```
publishingRevoked: boolean
revocation: {
  reason: string,
  revokedBy: uid,
  revokedAt: timestamp,
  permanent: boolean        // true = only reversible by Special Admin+ / appeal
} | null
```

While `publishingRevoked` is true:
- The person can still sign in, read, edit their profile, and see their own
  past articles.
- They cannot create new articles or edit existing ones.
- They can file exactly one open appeal at a time (see below).

### Appeals

`appeals/{appealId}`:
```
userId: uid
revocationReason: string      // copied at time of filing, so it can't be edited later
appealText: string
status: "pending" | "approved" | "denied"
reviewedBy: uid | null
reviewedAt: timestamp | null
createdAt: timestamp
```

- A user with `publishingRevoked: true` can create one `appeals` doc if they
  don't already have a `pending` one.
- Any Administrator+ can review it. Approving sets `publishingRevoked: false`
  and clears `revocation`. Denying just marks the appeal `denied` — the user
  can't file a new one for the same revocation (this is a deliberate rule-side
  restriction, not just a UI nicety).

### Every revocation and reversal is logged

`banLogs/{logId}`:
```
targetUserId: uid
action: "revoked" | "restored"
performedBy: uid
reason: string
timestamp: timestamp
```
Nobody, including a General Administrator, can revoke or restore a user's
publishing rights without a matching log entry — this is enforced in the
security rules (§ see firestore.rules), not just app convention.

---

## 4. Articles

`articles/{articleId}`:
```
title: string
authorId: uid
authorName: string            // denormalized at creation time for display
category: string              // "news" | "fantasy" | "story" | "anime" | ... open-ended
body: [                       // ordered content blocks
  { type: "text", content: string } |
  { type: "image", url: string, caption: string }
]
references: [                 // the ONLY place an external link is allowed
  { label: string, url: string }
]
status: "published" | "underReview" | "removed"
createdAt: timestamp
updatedAt: timestamp
adminNotes: [                 // Administrator+ only, not shown to regular readers
  { adminId: uid, note: string, timestamp: timestamp }
]
```

Rules of content, enforced both in the UI and (where possible) in security
rules:
- No external links anywhere in `body` — only in `references`.
- Only the author can edit their own article, plus any Administrator+.
- Deleting an article (as opposed to editing) is Administrator+ only, and is
  a soft delete (`status: "removed"`) so admin notes and history survive.

## 5. Events

`events/{eventId}`:
```
title: string
description: string
date: timestamp
createdBy: uid                 // Special Administrator+ only
```

## 6. Profile

`users/{uid}` also carries the editable profile fields:
```
displayName: string
bio: string
socials: {
  website: string | null,
  twitter: string | null,
  instagram: string | null,
  discord: string | null
}
articleCount: number           // denormalized, used for Star User consideration
createdAt: timestamp
```

---

## Why it's built this way

- **Revocation is separate from the account** because losing your ability to
  publish should never mean losing your reading history, profile, or past
  work — and because a reversible, logged, appealable action is much harder
  to abuse than an irreversible one, even by someone who holds a legitimate
  admin role in good faith.
- **General Administrator creation is console-only, not app-level** because
  the single most dangerous privilege escalation path is "an app bug lets
  someone grant themselves the top role." Taking that path out of the app
  entirely removes the bug class, not just the likelihood.
- **`adminNotes` are separate from the visible article** because moderation
  reasoning (why something was flagged, what was discussed) shouldn't be
  mixed into content regular readers see, but should still exist somewhere
  auditable rather than living in someone's Discord DMs.
