import { test } from "node:test";
import assert from "node:assert/strict";
import { CATEGORY_GROUPS, categoryIcon, groupCategories, popularCategories } from "./categoryCatalog";

const all = CATEGORY_GROUPS.flatMap((g) => g.categories);

test("slugs are unique and URL-safe", () => {
  const slugs = all.map((c) => c.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const s of slugs) assert.match(s, /^[a-z0-9]+(-[a-z0-9]+)*$/);
});

test("'Other' exists and comes last", () => {
  assert.equal(all.at(-1)?.slug, "other");
});

test("groups follow the catalogue order and skip empty groups", () => {
  const active = [
    { slug: "tutoring", name: "Tutoring" },
    { slug: "nails", name: "Nails" },
    { slug: "hair", name: "Hair & braids" },
  ];
  assert.deepEqual(
    groupCategories(active).map((g) => [g.name, g.categories.map((c) => c.slug)]),
    [["Beauty & grooming", ["hair", "nails"]], ["Study help", ["tutoring"]]],
  );
});

test("unknown database categories still show, before Other", () => {
  const groups = groupCategories([
    { slug: "other", name: "Other" },
    { slug: "pottery", name: "Pottery" },
  ]);
  assert.deepEqual(groups.map((g) => g.name), ["More", "Something else"]);
  assert.equal(categoryIcon("pottery"), "tag");
});

test("popular picks only flagged categories", () => {
  const picked = popularCategories(all.map(({ slug, name }) => ({ slug, name }))).map((c) => c.slug);
  assert.ok(picked.includes("hair") && picked.includes("tutoring"));
  assert.ok(!picked.includes("other"));
  assert.ok(picked.length <= 10);
});

test("migration 0017 seeds exactly the catalogue's slugs, in order", async () => {
  const { readFileSync } = await import("node:fs");
  const sql = readFileSync(new URL("../supabase/migrations/0017_more_categories.sql", import.meta.url), "utf8");
  const seeded = [...sql.matchAll(/\(\s*'(?:[^']|'')*',\s*'([a-z0-9-]+)',\s*true,\s*\d+\)/g)].map((m) => m[1]);
  assert.deepEqual(seeded, all.map((c) => c.slug));
});
