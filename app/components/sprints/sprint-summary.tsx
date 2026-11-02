"use client";

import Link from "next/link";
import { useWorkspace } from "@/app/providers/workspace-provider";

export function SprintSummary() {
  const { data, projects } = useWorkspace();
  const sprints = data.sprints.filter((sprint) =>
    projects.some((project) => project.id === sprint.projectId),
  );
  const active = sprints.filter((sprint) => sprint.state === "active");
  return (
    <section className="panel">
      <div className="section-heading">
        <h2>Active sprints</h2>
        <Link href="/sprints" className="text-button">
          Plan sprints →
        </Link>
      </div>
      {active.map((sprint) => {
        const tasks = data.tasks.filter((task) => task.sprint === sprint.id);
        const progress = tasks.length
          ? Math.round(
              (tasks.filter((task) => task.status === "Done").length /
                tasks.length) *
                100,
            )
          : 0;
        return (
          <div className="report-row" key={sprint.id}>
            <div className="progress-label">
              <strong>
                {sprint.name} ·{" "}
                {
                  projects.find((project) => project.id === sprint.projectId)
                    ?.name
                }
              </strong>
              <span>{progress}%</span>
            </div>
            <div className="progress-track">
              <span style={{ width: `${progress}%` }} />
            </div>
            <p className="field-hint">
              {tasks.length} tasks · Ends {sprint.endDate}
            </p>
          </div>
        );
      })}
      {!active.length && (
        <p className="empty">
          No active sprints.{" "}
          {sprints.filter((sprint) => sprint.state === "planned").length}{" "}
          planned sprint(s) are waiting to start.
        </p>
      )}
    </section>
  );
}
