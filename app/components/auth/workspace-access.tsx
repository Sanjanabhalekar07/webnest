"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "../../providers/auth-provider";
import { WorkspaceProvider } from "../../providers/workspace-provider";
import { WorkspaceShell } from "../layout/workspace-shell";

export function WorkspaceAccess({ children }: { children: ReactNode }) {
  const { ready, user } = useAuth();

  if (!ready) return <main className="auth-loading">Opening WebNest…</main>;
  if (!user)
    return (
      <main className="auth-loading">
        <div>
          <strong>Sign in to open your workspace</strong>
          <p>Your local projects will be waiting for you.</p>
          <Link className="primary auth-link" href="/login">
            Sign in or create an account
          </Link>
        </div>
      </main>
    );

  return (
    <WorkspaceProvider>
      <WorkspaceShell>{children}</WorkspaceShell>
    </WorkspaceProvider>
  );
}
