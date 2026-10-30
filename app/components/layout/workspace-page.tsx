"use client";

import type { ReactNode } from "react";
import { useWorkspace } from "@/app/providers/workspace-provider";

// Guard the content inside each page so the shared layout always renders its route slot.
export function WorkspacePage({ children }: { children: ReactNode }) {
  const { ready, error } = useWorkspace();

  if (!ready) return <section className="panel" aria-busy={!error} aria-live="polite">
    <h2>Opening your workspace</h2>
    <p className="muted">Getting everything ready for a productive day...</p>
    {error && <div role="alert"><p>{error}</p><button className="primary" onClick={() => window.location.reload()}>Try again</button></div>}
  </section>;

  return children;
}
