"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  currentAccount,
  login as authenticate,
  logout as clearSession,
  readAuthState,
  renameAccount,
  signUp as createAccount,
  type Account,
  type AuthState,
} from "../lib/auth";

type AuthContextValue = {
  ready: boolean;
  user: Account | null;
  signUp: (input: { name: string; email: string; password: string }) => Account;
  login: (email: string, password: string) => Account;
  rename: (name: string) => Account;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider is required");
  return value;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    accounts: [],
    currentUserId: null,
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(readAuthState(window.localStorage));
    setReady(true);
  }, []);

  const value: AuthContextValue = {
    ready,
    user: currentAccount(state),
    signUp: (input) => {
      const result = createAccount(window.localStorage, input);
      setState(result.state);
      return result.account;
    },
    login: (email, password) => {
      const result = authenticate(window.localStorage, email, password);
      setState(result.state);
      return result.account;
    },
    rename: (name) => {
      const result = renameAccount(window.localStorage, name);
      setState(result.state);
      return result.account;
    },
    logout: () => setState(clearSession(window.localStorage)),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
