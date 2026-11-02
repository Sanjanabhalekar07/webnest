"use client";
import { useWorkspace } from "@/app/providers/workspace-provider";
import { initials } from "@/app/lib/model";
import { percent } from "@/app/lib/task-utils";
import { SprintSummary } from "../sprints/sprint-summary";
import { PageHeading } from "../layout/page-heading";
export function ReportsView() {
  const { data, projects, allTasks } = useWorkspace();

  const team = [
    ...new Set(
      projects.flatMap((project) =>
        project.members.map((member) => member.name),
      ),
    ),
  ].sort();
  return (
    <>
      <PageHeading title="Reports" />
      <div className="reports-grid">
        <section className="panel">
          <h2>Project completion</h2>
          {projects.map((project) => (
            <div className="report-row" key={project.id}>
              <div className="progress-label">
                <strong>{project.name}</strong>
                <span>
                  {percent(
                    allTasks.filter((task) => task.projectId === project.id),
                  )}
                  %
                </span>
              </div>
              <div className="progress-track">
                <span
                  style={{
                    width: `${percent(allTasks.filter((task) => task.projectId === project.id))}%`,
                    background: project.color,
                  }}
                />
              </div>
            </div>
          ))}
        </section>
        <section className="panel">
          <h2>Team workload</h2>
          {team.map((member) => (
            <div className="workload-row" key={member}>
              <span className="avatar small">{initials(member)}</span>
              <span>{member}</span>
              <strong>
                {
                  allTasks.filter(
                    (task) =>
                      task.assignee === member && task.status !== "Done",
                  ).length
                }{" "}
                open tasks
              </strong>
            </div>
          ))}
        </section>
        <SprintSummary />
        <section className="panel">
          <h2>Task distribution</h2>
          {data.columns.map((status) => (
            <div className="distribution" key={status}>
              <span>{status}</span>
              <div className="progress-track">
                <span
                  style={{
                    width: `${allTasks.length ? (allTasks.filter((task) => task.status === status).length / allTasks.length) * 100 : 0}%`,
                  }}
                />
              </div>
              <strong>
                {allTasks.filter((task) => task.status === status).length}
              </strong>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
