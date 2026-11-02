import assert from "node:assert/strict";
import test from "node:test";
import {
  accountInitials,
  authStorageKey,
  currentAccount,
  login,
  logout,
  readAuthState,
  renameAccount,
  signUp,
  type AuthStorage,
} from "../app/lib/auth";

function storage(): AuthStorage & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test("sign up creates a local session and normalizes its email", () => {
  const store = storage();
  const { account } = signUp(
    store,
    {
      name: "  Priya Shah  ",
      email: "PRIYA@example.com",
      password: "password1",
    },
    "account-1",
    "2026-01-01T00:00:00.000Z",
  );
  assert.equal(account.name, "Priya Shah");
  assert.equal(account.email, "priya@example.com");
  assert.equal(currentAccount(readAuthState(store))?.id, "account-1");
  assert.ok(store.values.get(authStorageKey));
});

test("login rejects invalid credentials and restores an existing session", () => {
  const store = storage();
  signUp(
    store,
    { name: "Priya", email: "priya@example.com", password: "password1" },
    "account-1",
  );
  logout(store);
  assert.throws(() => login(store, "priya@example.com", "wrong"), /incorrect/);
  assert.equal(
    login(store, "PRIYA@example.com", "password1").account.name,
    "Priya",
  );
});

test("a signed-in user can change their username and log out", () => {
  const store = storage();
  signUp(
    store,
    { name: "Priya", email: "priya@example.com", password: "password1" },
    "account-1",
  );
  assert.equal(renameAccount(store, "Priya Shah").account.name, "Priya Shah");
  assert.equal(accountInitials("Priya Shah"), "PS");
  logout(store);
  assert.equal(currentAccount(readAuthState(store)), null);
});

test("bad local auth data is safely ignored", () => {
  const store = storage();
  store.setItem(authStorageKey, "not json");
  assert.deepEqual(readAuthState(store), { accounts: [], currentUserId: null });
});
