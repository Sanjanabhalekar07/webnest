"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Account } from "../lib/auth";
import {
  authenticate,
  createAccount,
  getCurrentUser,
  logoutAccount,
  updateAccountProfile,
} from "../actions/auth";

type AuthContextValue = {
  ready: boolean;
  user: Account | null;
  signUp: (input: {
    name: string;
    email: string;
    password: string;
  }) => Promise<Account>;
  login: (email: string, password: string) => Promise<Account>;
  updateProfile: (input: {
    name: string;
    email: string;
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => Promise<Account>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider is required");
  return value;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Account | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, []);

  const value: AuthContextValue = {
    ready,
    user,
    signUp: async (input) => {
      const account = await createAccount(input);
      setUser(account);
      return account;
    },
    login: async (email, password) => {
      const account = await authenticate(email, password);
      setUser(account);
      return account;
    },
    updateProfile: async (input) => {
      const account = await updateAccountProfile(input);
      setUser(account);
      return account;
    },
    logout: async () => {
      await logoutAccount();
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
