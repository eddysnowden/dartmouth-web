// Dartmouth Web — Cloudinary config
// Free image hosting — no credit card, no billing account, ever (unlike
// Firebase Storage, which now requires one even on the free tier).
//
// Setup:
// 1. Sign up at cloudinary.com (Google/GitHub/email — no card asked).
// 2. Your "cloud name" is shown on the Dashboard homepage right after
//    signup. Paste it below.
// 3. Settings (gear icon) → Upload → scroll to "Upload presets" →
//    Add upload preset:
//      - Signing mode: UNSIGNED  (required — this is what lets the
//        browser upload directly without exposing a secret key)
//      - Folder: dartmouth-web  (keeps uploads organized, optional)
//      - Under "Format and size restrictions": allowed formats → jpg,
//        png, webp, gif; max file size → 8000000 (8MB, matches what
//        the old Storage rules capped at)
//    Save it, then paste the preset name below.
//
// Free tier: 25 credits/month, where 1 credit = 1GB storage OR 1GB
// bandwidth OR 1,000 transformations, in any mix. Free forever, no
// card on file. Plenty of headroom for a small-to-medium site.

export const CLOUDINARY_CLOUD_NAME = "v4n1smr4";
export const CLOUDINARY_UPLOAD_PRESET = "dartmouth_unsigned";

export async function uploadImageToCloudinary(file){
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const res = await fetch(url, { method: "POST", body: form });
  if(!res.ok){
    const detail = await res.json().catch(() => null);
    throw new Error(detail?.error?.message || "Image upload failed.");
  }
  const data = await res.json();
  return data.secure_url; // permanent HTTPS URL to store on the article
}
