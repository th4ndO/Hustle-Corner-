import { test } from "node:test";
import assert from "node:assert/strict";
import { loginHref, safeNext } from "./safeNext";

test("keeps plain same-site paths", () => {
  assert.equal(safeNext("/dashboard"), "/dashboard");
  assert.equal(safeNext("/dashboard/become-seller"), "/dashboard/become-seller");
  assert.equal(safeNext("/s/campus-curls-abc123?tab=reviews"), "/s/campus-curls-abc123?tab=reviews");
});

test("falls back to / when there is nothing to go back to", () => {
  assert.equal(safeNext(null), "/");
  assert.equal(safeNext(undefined), "/");
  assert.equal(safeNext(""), "/");
});

test("refuses anything that could leave the site", () => {
  for (const bad of [
    "https://evil.com",
    "http://evil.com/dashboard",
    "evil.com",
    "javascript:alert(1)",
    "//evil.com",
    "//evil.com/dashboard",
    "/\\evil.com",
    "/\tevil.com",
    "/\nevil.com",
    "/a\\b",
  ]) {
    assert.equal(safeNext(bad), "/", `expected ${JSON.stringify(bad)} to be refused`);
  }
});

test("percent-encoded slashes stay a local path", () => {
  // URLSearchParams decodes once, so this reaches safeNext as "/%2F%2Fevil.com",
  // which the browser resolves as a path on this site, not a new host.
  assert.equal(safeNext("/%2F%2Fevil.com"), "/%2F%2Fevil.com");
});

test("loginHref encodes next and optional mode", () => {
  assert.equal(loginHref("/bookings"), "/login?next=%2Fbookings");
  assert.equal(
    loginHref("/dashboard/become-seller", "signup"),
    "/login?next=%2Fdashboard%2Fbecome-seller&mode=signup",
  );
});
