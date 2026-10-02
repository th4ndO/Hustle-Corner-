import type { IconName } from "@/components/Icon";

// Icon for a category tile. Unknown categories get a plain tag.
const BY_SLUG: Record<string, IconName> = {
  hair: "scissors",
  nails: "sparkles",
  tutoring: "academic",
};

export function categoryIcon(slug: string): IconName {
  return BY_SLUG[slug] ?? "tag";
}
