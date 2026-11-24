"use server";

import { cookies } from "next/headers";
import {
  deleteUserSessionFromToken,
  getSessionUserFromToken,
  logIn,
  updateUserProfile,
  sessionCookieName,
  sessionLifetimeSeconds,
  signUp,
  type PublicUser,
} from "../lib/auth-server";

async function cookieStore() {
  return cookies();
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  const store = await cookieStore();
  return getSessionUserFromToken(store.get(sessionCookieName)?.value ?? null);
}

async function setSessionCookie(token: string) {
  const store = await cookieStore();
  store.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionLifetimeSeconds,
  });
}

export async function createAccount(input: {
  name: string;
  email: string;
  password: string;
}): Promise<PublicUser> {
  const result = await signUp(input);
  await setSessionCookie(result.sessionToken);
  return result.user;
}

export async function authenticate(
  email: string,
  password: string,
): Promise<PublicUser> {
  const result = await logIn(email, password);
  await setSessionCookie(result.sessionToken);
  return result.user;
}

async function authenticatedUserId() {
  const store = await cookieStore();
  const user = await getSessionUserFromToken(
    store.get(sessionCookieName)?.value ?? null,
  );
  if (!user) throw new Error("Sign in before updating your account.");
  return user.id;
}

export async function updateAccountProfile(input: {
  name: string;
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<PublicUser> {
  return updateUserProfile(await authenticatedUserId(), input);
}

export async function logoutAccount(): Promise<void> {
  const store = await cookieStore();
  await deleteUserSessionFromToken(
    store.get(sessionCookieName)?.value ?? null,
  );
  store.delete(sessionCookieName);
}
