import { test } from "node:test";
import assert from "node:assert/strict";
import { checkCategorySelection } from "./categorySelection";

test("needs 1 to 3 distinct categories", () => {
  assert.ok("error" in checkCategorySelection([], ""));
  assert.ok("error" in checkCategorySelection(["hair", "nails", "makeup", "barber"], ""));
  assert.deepEqual(checkCategorySelection(["hair", "hair", " nails "], ""), { slugs: ["hair", "nails"], otherCategory: null });
});

test("Other needs a description of what it is", () => {
  const r = checkCategorySelection(["other"], "   ");
  assert.ok("error" in r && /say what you offer/.test(r.error));
  assert.deepEqual(checkCategorySelection(["other"], "  Car   washing "), { slugs: ["other"], otherCategory: "Car washing" });
});

test("the description follows the public-text rules", () => {
  assert.ok("error" in checkCategorySelection(["other"], "x"));
  assert.ok("error" in checkCategorySelection(["other"], "y".repeat(41)));
  assert.ok("error" in checkCategorySelection(["other"], "call 0821234567"));
  assert.ok("error" in checkCategorySelection(["other"], "visit www.example"));
});

test("a description without Other is dropped, not stored", () => {
  assert.deepEqual(checkCategorySelection(["hair"], "Car washing"), { slugs: ["hair"], otherCategory: null });
});
