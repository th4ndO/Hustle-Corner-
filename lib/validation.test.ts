import { test } from "node:test";
import assert from "node:assert/strict";
import { sellerOnboardingSchema } from "./validation";
import { LIMITS } from "../config";

const base = {
  businessName: "Campus Curls",
  whatsappNumber: "082 123 4567",
  services: [{ name: "Box braids", priceFrom: 300 }],
  consent: true,
};

function categoryError(categorySlugs: string[]) {
  const r = sellerOnboardingSchema.safeParse({ ...base, categorySlugs });
  return r.success ? null : r.error.issues.find((i) => i.path[0] === "categorySlugs")?.message ?? null;
}

test("a listing needs at least one category", () => {
  assert.match(categoryError([]) ?? "", /at least one/);
});

test(`a listing allows up to ${LIMITS.maxCategories} categories, enforced on the server`, () => {
  assert.equal(categoryError(["hair", "nails", "other"]), null);
  assert.match(categoryError(["hair", "nails", "makeup", "other"]) ?? "", /up to 3/);
});
