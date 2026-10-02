import { LIMITS } from "@/config";
import { checkPublicText } from "@/lib/publicText";

export const OTHER_SLUG = "other";
export const OTHER_CATEGORY_MAX = 40;

// Checks a seller's category picks (the listing wizard and the dashboard use
// the same rules): 1 to LIMITS.maxCategories distinct slugs, and when "Other"
// is picked, a short public description of what it is. The description is
// cleared when "Other" isn't picked, so a stale one never shows.
export function checkCategorySelection(
  rawSlugs: string[],
  rawOther: string,
): { slugs: string[]; otherCategory: string | null } | { error: string } {
  const slugs = [...new Set(rawSlugs.map((s) => s.trim()).filter(Boolean))];
  if (slugs.length < 1) return { error: "Pick at least one category." };
  if (slugs.length > LIMITS.maxCategories) return { error: `Pick up to ${LIMITS.maxCategories} categories.` };
  if (!slugs.includes(OTHER_SLUG)) return { slugs, otherCategory: null };

  if (!rawOther.trim()) return { error: "You picked Other: say what you offer, e.g. Car washing." };
  const r = checkPublicText(rawOther, { min: 2, max: OTHER_CATEGORY_MAX, noun: "your Other category" });
  if ("error" in r) return r;
  return { slugs, otherCategory: r.text };
}
