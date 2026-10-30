"use client";
import { useState } from "react";
import { useWorkspace } from "@/app/providers/workspace-provider";
import { initials, members, statuses } from "@/app/lib/model";
import { percent } from "@/app/lib/task-utils";
import { Icon } from "../ui/app-icon";
import { PageHeading } from "../layout/page-heading";
export function ReportsView() {
  const {
    data,
    projects,
    allTasks: tasks,
    allTasks,
    setEditingTask,
  } = useWorkspace();

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
          {members.map((member) => (
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
        <section className="panel">
          <h2>Sprint 01</h2>
          <p className="muted">
            Current sprint ·{" "}
            {allTasks.filter((task) => task.sprint === "Sprint 01").length}{" "}
            planned tasks
          </p>
          <div className="sprint-value">
            {percent(allTasks.filter((task) => task.sprint === "Sprint 01"))}
            <small>% complete</small>
          </div>
          <div className="progress-track">
            <span
              style={{
                width: `${percent(allTasks.filter((task) => task.sprint === "Sprint 01"))}%`,
              }}
            />
          </div>
        </section>
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
