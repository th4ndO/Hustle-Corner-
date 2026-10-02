import type { IconName } from "@/components/Icon";
import type { CategoryTag } from "@/lib/sellers";

// The categories students can list under, grouped for browsing. Names and
// slugs here must match the rows in the `categories` table (migration 0017
// seeds them); this file only adds the group, the icon and "popular".
// Researched 2026-10 from SA campus side-hustle coverage: beauty, food,
// tutoring/printing, creative work, thrift, tech repair and errands.
//
// Deliberately NOT categories (and not allowed under "Other"): assignment or
// essay writing (academic misconduct), loans or cash advances (credit needs
// NCR registration), alcohol, lifts/rides for money, and resold electronics
// (stolen-goods risk).

type CatalogEntry = { slug: string; name: string; icon: IconName; popular?: boolean };
type CatalogGroup = { name: string; categories: CatalogEntry[] };

export const CATEGORY_GROUPS: CatalogGroup[] = [
  {
    name: "Beauty & grooming",
    categories: [
      { slug: "hair", name: "Hair & braids", icon: "scissors", popular: true },
      { slug: "nails", name: "Nails", icon: "sparkles", popular: true },
      { slug: "lashes-brows", name: "Lashes & brows", icon: "eye", popular: true },
      { slug: "makeup", name: "Makeup", icon: "paintBrush" },
      { slug: "barber", name: "Barber & haircuts", icon: "scissors", popular: true },
      { slug: "skincare", name: "Skincare", icon: "faceSmile" },
    ],
  },
  {
    name: "Food & treats",
    categories: [
      { slug: "meals", name: "Meals & kotas", icon: "fire", popular: true },
      { slug: "baking", name: "Baking & cakes", icon: "cake" },
      { slug: "snacks-drinks", name: "Snacks & drinks", icon: "shoppingBag" },
    ],
  },
  {
    name: "Study help",
    categories: [
      { slug: "tutoring", name: "Tutoring", icon: "academic", popular: true },
      { slug: "printing", name: "Printing & binding", icon: "printer", popular: true },
      { slug: "cv-writing", name: "CVs & cover letters", icon: "document" },
      { slug: "translation", name: "Languages & translation", icon: "language" },
    ],
  },
  {
    name: "Creative",
    categories: [
      { slug: "photography", name: "Photography", icon: "camera", popular: true },
      { slug: "video", name: "Video & editing", icon: "video" },
      { slug: "graphic-design", name: "Graphic design", icon: "swatch" },
      { slug: "social-media", name: "Social media & content", icon: "megaphone" },
      { slug: "dj-music", name: "DJ & music", icon: "music" },
      { slug: "events-decor", name: "Events & decor", icon: "gift" },
    ],
  },
  {
    name: "Fashion & handmade",
    categories: [
      { slug: "thrift", name: "Thrift & pre-loved clothes", icon: "shoppingBag" },
      { slug: "tailoring", name: "Tailoring & alterations", icon: "scissors" },
      { slug: "sneaker-cleaning", name: "Sneaker cleaning", icon: "sparkles" },
      { slug: "crafts", name: "Crafts & handmade", icon: "gift" },
    ],
  },
  {
    name: "Tech",
    categories: [
      { slug: "device-repair", name: "Phone & laptop repair", icon: "wrench" },
      { slug: "web-apps", name: "Websites & apps", icon: "code" },
      { slug: "tech-help", name: "Tech help & setup", icon: "computer" },
    ],
  },
  {
    name: "Errands & home",
    categories: [
      { slug: "laundry", name: "Laundry & ironing", icon: "home" },
      { slug: "cleaning", name: "Room cleaning", icon: "home" },
      { slug: "delivery-errands", name: "Delivery & errands", icon: "truck" },
      { slug: "moving", name: "Moving help", icon: "truck" },
    ],
  },
  {
    name: "Health & fitness",
    categories: [{ slug: "fitness", name: "Personal training", icon: "heart" }],
  },
  {
    name: "Something else",
    categories: [{ slug: "other", name: "Other", icon: "other" }],
  },
];

const BY_SLUG = new Map(CATEGORY_GROUPS.flatMap((g) => g.categories.map((c) => [c.slug, { ...c, group: g.name }])));

export function categoryIcon(slug: string): IconName {
  return BY_SLUG.get(slug)?.icon ?? "tag";
}

// Group the live (active) categories from the database. Anything active in
// the database but missing here still shows, under "More".
export function groupCategories(active: CategoryTag[]): { name: string; categories: CategoryTag[] }[] {
  const activeSlugs = new Set(active.map((c) => c.slug));
  const groups = CATEGORY_GROUPS.map((g) => ({
    name: g.name,
    categories: active.filter((c) => g.categories.some((e) => e.slug === c.slug))
      .sort((a, b) => g.categories.findIndex((e) => e.slug === a.slug) - g.categories.findIndex((e) => e.slug === b.slug)),
  })).filter((g) => g.categories.length > 0);
  const unknown = active.filter((c) => !BY_SLUG.has(c.slug));
  if (unknown.length > 0) groups.splice(groups.length - (activeSlugs.has("other") ? 1 : 0), 0, { name: "More", categories: unknown });
  return groups;
}

// The handful shown on the homepage; the rest are one tap away.
export function popularCategories(active: CategoryTag[]): CategoryTag[] {
  return active.filter((c) => BY_SLUG.get(c.slug)?.popular);
}
