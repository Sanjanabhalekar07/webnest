import type { ReactNode } from "react";
import { WorkspaceAccess } from "../components/auth/workspace-access";
export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <WorkspaceAccess>{children}</WorkspaceAccess>;
}
