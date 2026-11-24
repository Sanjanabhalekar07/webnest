"use server";

import { cookies } from "next/headers";
import {
  AuthError,
  getSessionUserFromToken,
  sessionCookieName,
} from "../lib/auth-server";
import {
  loadWorkspace as loadUserWorkspace,
  saveWorkspace as saveUserWorkspace,
} from "../lib/storage";
import type { WorkspaceData } from "../lib/model";

async function currentUserId() {
  const store = await cookies();
  const user = await getSessionUserFromToken(
    store.get(sessionCookieName)?.value ?? null,
  );
  if (!user) throw new AuthError("Sign in to access your workspace.", 401);
  return user.id;
}

export async function loadWorkspace(): Promise<WorkspaceData> {
  return loadUserWorkspace(await currentUserId());
}

export async function saveWorkspace(data: WorkspaceData): Promise<void> {
  await saveUserWorkspace(await currentUserId(), data);
}
