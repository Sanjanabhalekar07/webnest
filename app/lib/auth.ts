export type Account = {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: string;
};

export type AuthState = {
  accounts: Account[];
  currentUserId: string | null;
};

export type AuthStorage = Pick<Storage, "getItem" | "setItem">;

export const authStorageKey = "webnest-auth";

const initialAuthState: AuthState = { accounts: [], currentUserId: null };

function isAccount(value: unknown): value is Account {
  if (!value || typeof value !== "object") return false;
  const account = value as Record<string, unknown>;
  return ["id", "name", "email", "password", "createdAt"].every(
    (key) => typeof account[key] === "string",
  );
}

export function readAuthState(storage: AuthStorage): AuthState {
  const saved = storage.getItem(authStorageKey);
  if (!saved) return initialAuthState;
  try {
    const state = JSON.parse(saved) as Partial<AuthState>;
    if (!Array.isArray(state.accounts) || !state.accounts.every(isAccount))
      return initialAuthState;
    return {
      accounts: state.accounts,
      currentUserId:
        typeof state.currentUserId === "string" ? state.currentUserId : null,
    };
  } catch {
    return initialAuthState;
  }
}

export function currentAccount(state: AuthState) {
  return (
    state.accounts.find((account) => account.id === state.currentUserId) ?? null
  );
}

function saveAuthState(storage: AuthStorage, state: AuthState) {
  storage.setItem(authStorageKey, JSON.stringify(state));
  return state;
}

function validateCredentials(name: string, email: string, password: string) {
  if (name.trim().length < 2 || name.trim().length > 60)
    throw new Error("Choose a username between 2 and 60 characters.");
  if (!/^\S+@\S+\.\S+$/.test(email))
    throw new Error("Enter a valid email address.");
  if (password.length < 8)
    throw new Error("Use a password with at least 8 characters.");
}

export function signUp(
  storage: AuthStorage,
  input: { name: string; email: string; password: string },
  id = crypto.randomUUID(),
  createdAt = new Date().toISOString(),
) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  validateCredentials(name, email, input.password);
  const state = readAuthState(storage);
  if (state.accounts.some((account) => account.email === email))
    throw new Error("An account already exists for this email address.");
  const account: Account = {
    id,
    name,
    email,
    password: input.password,
    createdAt,
  };
  return {
    state: saveAuthState(storage, {
      accounts: [...state.accounts, account],
      currentUserId: account.id,
    }),
    account,
  };
}

export function login(storage: AuthStorage, email: string, password: string) {
  const state = readAuthState(storage);
  const account = state.accounts.find(
    (candidate) => candidate.email === email.trim().toLowerCase(),
  );
  if (!account || account.password !== password)
    throw new Error("Email or password is incorrect.");
  return {
    state: saveAuthState(storage, { ...state, currentUserId: account.id }),
    account,
  };
}

export function renameAccount(storage: AuthStorage, name: string) {
  const nextName = name.trim();
  if (nextName.length < 2 || nextName.length > 60)
    throw new Error("Choose a username between 2 and 60 characters.");
  const state = readAuthState(storage);
  const account = currentAccount(state);
  if (!account) throw new Error("Sign in before changing your username.");
  const updated = { ...account, name: nextName };
  return {
    state: saveAuthState(storage, {
      ...state,
      accounts: state.accounts.map((item) =>
        item.id === updated.id ? updated : item,
      ),
    }),
    account: updated,
  };
}

export function logout(storage: AuthStorage) {
  const state = readAuthState(storage);
  return saveAuthState(storage, { ...state, currentUserId: null });
}

export const accountInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
