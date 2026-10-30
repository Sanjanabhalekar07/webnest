import type {ReactNode} from "react";
import {WorkspaceProvider} from "../providers/workspace-provider";
import {WorkspaceShell} from "../components/layout/workspace-shell";
export default function WorkspaceLayout({children}:{children:ReactNode}){return <WorkspaceProvider><WorkspaceShell>{children}</WorkspaceShell></WorkspaceProvider>;}
