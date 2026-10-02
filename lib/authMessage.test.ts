import { test } from "node:test";
import assert from "node:assert/strict";
import { authMessage } from "./authMessage";

test("explains the leaked-password error instead of calling it weak", () => {
  const m = authMessage("Password is known to be weak and easy to guess, please choose a different one.");
  assert.match(m, /data leak/);
  assert.doesNotMatch(m, /weak/);
});

test("rewords rate limits and existing accounts", () => {
  assert.match(authMessage("email rate limit exceeded"), /Too many attempts/);
  assert.match(authMessage("User already registered"), /Log in instead/);
});

test("passes other messages through", () => {
  assert.equal(authMessage("Invalid login credentials"), "Invalid login credentials");
});
