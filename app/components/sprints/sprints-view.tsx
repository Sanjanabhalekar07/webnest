"use client";

import { useState } from "react";
import Link from "next/link";
import type { SprintDraft, WorkspaceData } from "@/app/lib/model";
import { useWorkspace } from "@/app/providers/workspace-provider";
import { addDays, localDay } from "@/app/lib/date-utils";
import {
  assignToSprint,
  completeSprint,
  deleteSprint,
  startSprint,
} from "@/app/lib/sprint-rules";
import { PageHeading } from "../layout/page-heading";
import { SprintEditor } from "./sprint-editor";
import { BurndownChart } from "./burndown-chart";

export function SprintsView() {
  const { data, projects, allTasks, update, setEditingTask, notice } =
    useWorkspace();
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [selectedId, setSelectedId] = useState("");
  const [checked, setChecked] = useState<string[]>([]);
  const [editor, setEditor] = useState<SprintDraft | null>(null);
  const [error, setError] = useState("");
  const activeProjectId = projects.some((project) => project.id === projectId)
    ? projectId
    : projects[0]?.id || "";
  const projectSprints = data.sprints
    .filter((sprint) => sprint.projectId === activeProjectId)
    .sort(
      (a, b) =>
        ({ active: 0, planned: 1, completed: 2 })[a.state] -
          { active: 0, planned: 1, completed: 2 }[b.state] ||
        b.startDate.localeCompare(a.startDate) ||
        a.name.localeCompare(b.name),
    );
  const sprint =
    projectSprints.find((sprint) => sprint.id === selectedId) ||
    projectSprints[0];
  const assigned = sprint
    ? allTasks.filter((task) => task.sprint === sprint.id)
    : [];
  const backlog = allTasks
    .filter(
      (task) =>
        task.projectId === activeProjectId &&
        task.sprint === "Backlog" &&
        task.status !== "Done",
    )
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const selection = checked.filter((id) =>
    backlog.some((task) => task.id === id),
  );
  const closed = sprint?.state === "completed";
  const final = closed ? sprint.snapshots.at(-1) : undefined;
  const total = final?.total ?? assigned.length;
  const remaining =
    final?.remaining ??
    assigned.filter((task) => task.status !== "Done").length;
  const progress = total ? Math.round(((total - remaining) / total) * 100) : 0;

  function run(
    change: (previous: WorkspaceData) => WorkspaceData,
    message: string,
  ) {
    try {
      update(change, message);
      setError("");
      return true;
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The sprint could not be updated.",
      );
      return false;
    }
  }
  function create() {
    setEditor({
      id: `SPR-${crypto.randomUUID()}`,
      projectId: activeProjectId,
      name: "",
      goal: "",
      startDate: localDay(),
      endDate: addDays(localDay(), 13),
    });
  }

  return (
    <>
      <PageHeading
        title="Sprint planning"
        description="Turn the backlog into a focused, achievable plan."
        projectId={activeProjectId}
      />
      {!projects.length ? (
        <section className="panel">
          <p>Create a project before planning a sprint.</p>
          <Link className="secondary" href="/projects">
            Go to projects
          </Link>
        </section>
      ) : (
        <>
          <div className="view-toolbar">
            <label className="sprint-project-picker">
              Project
              <select
                value={activeProjectId}
                onChange={(event) => {
                  setProjectId(event.target.value);
                  setSelectedId("");
                  setChecked([]);
                  setError("");
                }}
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="primary" onClick={create}>
              + Create sprint
            </button>
          </div>
          {error && (
            <p className="validation-message" role="alert">
              {error}
            </p>
          )}
          <p className="task-result-summary" role="status" aria-live="polite">
            {notice}
          </p>
          <div className="sprint-layout">
            <aside className="sprint-list" aria-label="Project sprints">
              {projectSprints.map((item) => (
                <button
                  key={item.id}
                  className={`sprint-card ${sprint?.id === item.id ? "selected" : ""}`}
                  aria-pressed={sprint?.id === item.id}
                  onClick={() => {
                    setSelectedId(item.id);
                    setChecked([]);
                    setError("");
                  }}
                >
                  <span className={`sprint-state ${item.state}`}>
                    {item.state}
                  </span>
                  <strong>{item.name}</strong>
                  <span>
                    {item.startDate} → {item.endDate}
                  </span>
                  <small>
                    {item.state === "completed"
                      ? `${item.closedTasks.length} tasks in closed report`
                      : `${allTasks.filter((task) => task.sprint === item.id).length} tasks planned`}
                  </small>
                </button>
              ))}
              {!projectSprints.length && (
                <div className="panel">
                  <p className="field-hint">
                    No sprints yet. Create one and add work from the backlog.
                  </p>
                </div>
              )}
            </aside>
            <div className="sprint-content">
              {sprint ? (
                <>
                  <section className="panel">
                    <div className="section-heading">
                      <div>
                        <span className={`sprint-state ${sprint.state}`}>
                          {sprint.state}
                        </span>
                        <h2 className="sprint-heading">{sprint.name}</h2>
                      </div>
                      <div className="filter-controls">
                        {!closed && (
                          <button
                            className="secondary"
                            onClick={() =>
                              setEditor({
                                id: sprint.id,
                                projectId: sprint.projectId,
                                name: sprint.name,
                                goal: sprint.goal,
                                startDate: sprint.startDate,
                                endDate: sprint.endDate,
                              })
                            }
                          >
                            Edit sprint
                          </button>
                        )}
                        {sprint.state === "planned" && (
                          <>
                            <button
                              className="secondary"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    "Delete this planned sprint? Its tasks will return to the backlog.",
                                  )
                                ) {
                                  if (
                                    run(
                                      (previous) =>
                                        deleteSprint(previous, sprint.id),
                                      `Deleted sprint ${sprint.name}`,
                                    )
                                  )
                                    setSelectedId("");
                                }
                              }}
                            >
                              Delete
                            </button>
                            <button
                              className="primary"
                              onClick={() =>
                                run(
                                  (previous) =>
                                    startSprint(previous, sprint.id),
                                  `Started sprint ${sprint.name}`,
                                )
                              }
                            >
                              Start sprint
                            </button>
                          </>
                        )}
                        {sprint.state === "active" && (
                          <button
                            className="primary"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Complete ${sprint.name}? ${remaining} unfinished task(s) will return to the backlog. The sprint report will be preserved.`,
                                )
                              )
                                run(
                                  (previous) =>
                                    completeSprint(previous, sprint.id),
                                  `Completed sprint ${sprint.name}`,
                                );
                            }}
                          >
                            Complete sprint
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="sprint-goal">
                      {sprint.goal || "No sprint goal added yet."}
                    </p>
                    <p className="field-hint">
                      {sprint.startDate} to {sprint.endDate}
                      {sprint.completedAt &&
                        ` · Completed ${localDay(sprint.completedAt)}`}
                    </p>
                    <div className="sprint-metrics">
                      <div>
                        <strong>{total}</strong>
                        <span>{closed ? "Final scope" : "In scope"}</span>
                      </div>
                      <div>
                        <strong>{total - remaining}</strong>
                        <span>Completed</span>
                      </div>
                      <div>
                        <strong>{remaining}</strong>
                        <span>
                          {closed ? "Returned to backlog" : "Remaining"}
                        </span>
                      </div>
                      <div>
                        <strong>{progress}%</strong>
                        <span>Completion</span>
                      </div>
                    </div>
                    <div className="progress-track">
                      <span style={{ width: `${progress}%` }} />
                    </div>
                    {closed && (
                      <p className="field-hint sprint-history-note">
                        This report is frozen at completion. Later task edits,
                        deletion, or carryover work do not rewrite it.
                      </p>
                    )}
                  </section>
                  <BurndownChart sprint={sprint} />
                  <section className="panel">
                    <div className="section-heading">
                      <h2>
                        {closed ? "Closed sprint report" : "Sprint tasks"}
                        <span className="count">{total}</span>
                      </h2>
                      {!closed && (
                        <span className="muted">
                          Changes to scope are included in snapshots
                        </span>
                      )}
                    </div>
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Task</th>
                            <th>Status</th>
                            <th>Assignee</th>
                            <th>{closed ? "Result" : "Planning"}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {closed
                            ? sprint.closedTasks.map((task) => (
                                <tr key={task.id}>
                                  <td>
                                    <strong>{task.title}</strong>
                                    <small className="field-hint">
                                      {task.id}
                                    </small>
                                  </td>
                                  <td>
                                    <span className="status-pill">
                                      {task.status}
                                    </span>
                                  </td>
                                  <td>{task.assignee}</td>
                                  <td>
                                    {task.status === "Done"
                                      ? "Completed"
                                      : "Returned to backlog"}
                                  </td>
                                </tr>
                              ))
                            : assigned.map((task) => (
                                <tr key={task.id}>
                                  <td>
                                    <button
                                      className="table-task"
                                      onClick={() => setEditingTask(task)}
                                    >
                                      <span>
                                        <strong>{task.title}</strong>
                                        <small>{task.id}</small>
                                      </span>
                                    </button>
                                  </td>
                                  <td>
                                    <span className="status-pill">
                                      {task.status}
                                    </span>
                                  </td>
                                  <td>{task.assignee}</td>
                                  <td>
                                    <button
                                      className="text-button"
                                      onClick={() =>
                                        run(
                                          (previous) =>
                                            assignToSprint(
                                              previous,
                                              [task.id],
                                              "Backlog",
                                            ),
                                          `Returned ${task.title} to the backlog`,
                                        )
                                      }
                                    >
                                      Return to backlog
                                    </button>
                                  </td>
                                </tr>
                              ))}
                        </tbody>
                      </table>
                    </div>
                    {!total && (
                      <p className="empty">
                        Add tasks from the backlog before starting.
                      </p>
                    )}
                  </section>
                </>
              ) : (
                <section className="panel">
                  <h2>Plan the next useful step</h2>
                  <p className="empty">
                    Create a sprint to choose its dates, set a goal, and add
                    backlog tasks.
                  </p>
                </section>
              )}
              <section className="panel">
                <div className="section-heading">
                  <h2>
                    Project backlog{" "}
                    <span className="count">{backlog.length}</span>
                  </h2>
                  <button
                    className="secondary"
                    disabled={!sprint || closed || !selection.length}
                    onClick={() => {
                      if (
                        sprint &&
                        run(
                          (previous) =>
                            assignToSprint(previous, selection, sprint.id),
                          `Added ${selection.length} task(s) to ${sprint.name}`,
                        )
                      )
                        setChecked([]);
                    }}
                  >
                    Add selected to sprint
                    {selection.length > 0 ? ` (${selection.length})` : ""}
                  </button>
                </div>
                <p className="field-hint">
                  Unfinished tasks that are not assigned to any sprint.
                  Completed backlog tasks remain available in the project task
                  views.
                </p>
                {backlog.length > 0 && (
                  <label className="backlog-select-all">
                    <input
                      type="checkbox"
                      checked={selection.length === backlog.length}
                      onChange={(event) =>
                        setChecked(
                          event.target.checked
                            ? backlog.map((task) => task.id)
                            : [],
                        )
                      }
                    />
                    Select all backlog tasks
                  </label>
                )}
                {backlog.map((task) => (
                  <div className="backlog-row" key={task.id}>
                    <input
                      type="checkbox"
                      aria-label={`Select ${task.title}`}
                      checked={selection.includes(task.id)}
                      onChange={(event) =>
                        setChecked(
                          event.target.checked
                            ? [...selection, task.id]
                            : selection.filter((id) => id !== task.id),
                        )
                      }
                    />
                    <button
                      className="table-task"
                      onClick={() => setEditingTask(task)}
                    >
                      <span>
                        <strong>{task.title}</strong>
                        <small>
                          {task.id} · {task.priority}
                        </small>
                      </span>
                    </button>
                    <span className="status-pill">{task.status}</span>
                  </div>
                ))}
                {!backlog.length && (
                  <p className="empty">No unfinished tasks in the backlog.</p>
                )}
              </section>
            </div>
          </div>
        </>
      )}
      {editor && (
        <SprintEditor
          key={editor.id}
          draft={editor}
          onClose={() => setEditor(null)}
          onSaved={(id, projectId) => {
            setProjectId(projectId);
            setSelectedId(id);
            setChecked([]);
          }}
        />
      )}
    </>
  );
}
