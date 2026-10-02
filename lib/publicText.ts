// Rules for short text that everyone can see (a display name, the label of
// an "Other" category): tidy spaces, a length range, and no emails, links,
// phone numbers, markup or invisible characters.
export function checkPublicText(
  raw: string,
  { min, max, noun }: { min: number; max: number; noun: string },
): { text: string } | { error: string } {
  const text = raw.replace(/\s+/g, " ").trim();
  if (text.length < min) return { error: `Enter ${noun} of at least ${min} characters.` };
  if (text.length > max) return { error: `Keep ${noun} under ${max} characters.` };
  // Control characters, markup, and invisible or text-direction characters
  // (which can make text look empty or like someone else's).
  if (/[\u0000-\u001f\u007f-\u009f<>­​-‏‪-‮⁠-⁤⁦-⁩﻿]/.test(text)) {
    return { error: "Use letters, numbers and normal punctuation only." };
  }
  if (text.includes("@")) return { error: `Don't put an email address in ${noun}.` };
  if (/https?:|www\.|\.(com|co\.za|net|org)\b/i.test(text)) return { error: `Don't put a link in ${noun}.` };
  if (/\d{5,}/.test(text.replace(/[\s-]/g, ""))) return { error: `Don't put a phone number in ${noun}.` };
  return { text };
}
