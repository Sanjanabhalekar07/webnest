import assert from "node:assert/strict";
import test from "node:test";
import { accountInitials } from "../app/lib/auth";

test("account initials use the first letters of the first two name parts", () => {
  assert.equal(accountInitials("Priya Shah"), "PS");
  assert.equal(accountInitials("  Alex  Morgan  Chen "), "AM");
});
