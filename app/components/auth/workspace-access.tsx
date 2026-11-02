"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "../../providers/auth-provider";
import { WorkspaceProvider } from "../../providers/workspace-provider";
import { WorkspaceShell } from "../layout/workspace-shell";

export function WorkspaceAccess({ children }: { children: ReactNode }) {
  const { ready, user } = useAuth();
  const router = useRouter();
  const blocked = !ready || !user;

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, router, user]);

  return (
    <>
      <div
        className="workspace-access-content"
        aria-hidden={blocked}
        inert={blocked || undefined}
      >
        <WorkspaceProvider>
          <WorkspaceShell>{children}</WorkspaceShell>
        </WorkspaceProvider>
      </div>
      {blocked && (
        <main className="auth-loading auth-gate" aria-live="polite">
          {ready ? (
            <div>
              <strong>Taking you to sign in…</strong>
              <p>Your local projects will be waiting for you.</p>
              <Link className="auth-link" href="/login">
                Continue to sign in
              </Link>
            </div>
          ) : (
            "Opening WebNest…"
          )}
        </main>
      )}
    </>
  );
}
