// The name shown publicly on reviews and to sellers you book with. Before
// this existed, everyone was shown as the part of their email before the @.
export const DISPLAY_NAME_MAX = 40;

// Returns the cleaned name, or an error to show the user.
export function checkDisplayName(raw: string): { name: string } | { error: string } {
  const name = raw.replace(/\s+/g, " ").trim();
  if (name.length < 2) return { error: "Enter a name of at least 2 characters." };
  if (name.length > DISPLAY_NAME_MAX) return { error: `Keep your name under ${DISPLAY_NAME_MAX} characters.` };
  // Control characters, markup, and invisible or text-direction characters
  // (which can make a name look empty or like someone else's).
  if (/[\u0000-\u001f\u007f-\u009f<>\u00ad\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff]/.test(name)) {
    return { error: "Use letters, numbers and normal punctuation only." };
  }
  // Keep emails, links and phone numbers out of a name everyone can see.
  if (name.includes("@")) return { error: "Don't put an email address in your name." };
  if (/https?:|www\.|\.(com|co\.za|net|org)\b/i.test(name)) return { error: "Don't put a link in your name." };
  if (/\d{5,}/.test(name.replace(/[\s-]/g, ""))) return { error: "Don't put a phone number in your name." };
  return { name };
}
