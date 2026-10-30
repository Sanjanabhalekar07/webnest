"use client";

import { useWorkspace } from "@/app/providers/workspace-provider";
import { newTask } from "@/app/lib/task-utils";
import { Icon } from "../ui/app-icon";

export function PageHeading({ title, description = "A little clarity. A lot of forward momentum.", overview = false, projectId }: { title: string; description?: string; overview?: boolean; projectId?: string }) {
  const { projects, setEditingTask } = useWorkspace();
  return <div className="page-heading">
    <div><div className="eyebrow">{overview ? new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : "STUDIO WORKSPACE"}</div><h1>{title}{overview && <span className="greeting-dot"> ✳</span>}</h1><p>{description}</p></div>
    <button className="primary" onClick={() => setEditingTask(newTask(projectId || projects[0]?.id || ""))}><Icon name="plus" size={18}/>Create task</button>
  </div>;
}
