import { test } from "node:test";
import assert from "node:assert/strict";
import { friendlyError } from "./errors";

const GENERIC = "Something went wrong on our side. Please try again in a moment.";

// friendlyError logs the raw error; keep test output quiet.
console.error = () => {};

test("hides raw database errors behind a plain message", () => {
  assert.equal(friendlyError({ code: "54001", message: "stack depth limit exceeded" }), GENERIC);
  assert.equal(
    friendlyError({ code: "23514", message: 'new row violates check constraint "sellers_bio_check"' }),
    GENERIC,
  );
  assert.equal(friendlyError({ message: "The object exceeded the maximum allowed size" }), GENERIC);
});

test("uses the caller's fallback when given", () => {
  assert.equal(friendlyError({ code: "XX000", message: "boom" }, "Couldn't upload that photo."), "Couldn't upload that photo.");
});

test("passes through our own trigger messages (P0001)", () => {
  assert.equal(
    friendlyError({ code: "P0001", message: "Only an admin can change a profile's role." }),
    "Only an admin can change a profile's role.",
  );
});

test("explains permission errors", () => {
  assert.equal(friendlyError({ code: "42501", message: "new row violates row-level security policy" }), "You don't have permission to do that.");
});

test("handles a missing error object", () => {
  assert.equal(friendlyError(null), GENERIC);
  assert.equal(friendlyError(undefined), GENERIC);
});
