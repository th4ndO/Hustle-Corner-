import { checkPublicText } from "@/lib/publicText";

// The name shown publicly on reviews and to sellers you book with. Before
// this existed, everyone was shown as the part of their email before the @.
export const DISPLAY_NAME_MAX = 40;

// Returns the cleaned name, or an error to show the user.
export function checkDisplayName(raw: string): { name: string } | { error: string } {
  const r = checkPublicText(raw, { min: 2, max: DISPLAY_NAME_MAX, noun: "a name" });
  if ("error" in r) return { error: r.error.replace("in a name", "in your name").replace("Keep a name", "Keep your name") };
  return { name: r.text };
}
