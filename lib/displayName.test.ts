import { test } from "node:test";
import assert from "node:assert/strict";
import { checkDisplayName } from "./displayName";

test("accepts ordinary names and tidies spaces", () => {
  assert.deepEqual(checkDisplayName("  Lerato   M "), { name: "Lerato M" });
  assert.deepEqual(checkDisplayName("Thabo-Jean O'Neill"), { name: "Thabo-Jean O'Neill" });
  assert.deepEqual(checkDisplayName("Campus Curls 2"), { name: "Campus Curls 2" });
});

test("rejects names that are too short or too long", () => {
  assert.ok("error" in checkDisplayName(" A "));
  assert.ok("error" in checkDisplayName(""));
  assert.ok("error" in checkDisplayName("x".repeat(41)));
  assert.deepEqual(checkDisplayName("x".repeat(40)), { name: "x".repeat(40) });
});

test("keeps emails, links and phone numbers out of public names", () => {
  assert.ok("error" in checkDisplayName("someone@gmail.com"));
  assert.ok("error" in checkDisplayName("visit www.example"));
  assert.ok("error" in checkDisplayName("http://x.y"));
  assert.ok("error" in checkDisplayName("Braids example.co.za"));
  assert.ok("error" in checkDisplayName("Lerato 082 123 4567"));
});

test("rejects markup and control characters", () => {
  assert.ok("error" in checkDisplayName("<b>Lerato</b>"));
  assert.ok("error" in checkDisplayName("Lerato\u0000"));
});
