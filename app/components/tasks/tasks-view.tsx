"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/app/providers/workspace-provider";
import {
  members,
  defaultTaskView,
  type TaskViewPreferences,
} from "@/app/lib/model";
import { selectTasks } from "@/app/lib/workspace-rules";
import { GanttTimeline } from "./gantt-timeline";
import { ProjectMembers } from "../projects/project-members";
import { Icon } from "../ui/app-icon";
import { PageHeading } from "../layout/page-heading";
import { TaskTable } from "./task-table";
import { TaskBoard } from "./task-board";
import { WorkflowEditor } from "./workflow-editor";

export function TasksView({
  projectId: routeProjectId = "all",
  mine = false,
}: {
  projectId?: string;
  mine?: boolean;
}) {
  const {
    data,
    projects,
    allTasks,
    setEditingTask,
    setEditingProject,
    moveTask,
    setViewPreferences,
    notice,
  } = useWorkspace();
  const router = useRouter();
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const key = mine ? "my-tasks" : `project:${routeProjectId}`;
  const preferences = { ...defaultTaskView, ...data.preferences.views[key] };
  const projectId = mine
    ? projects.some((project) => project.id === preferences.project)
      ? preferences.project
      : "all"
    : routeProjectId;
  const selectedProject = projects.find(
    (project) => project.id === routeProjectId,
  );
  const scoped = allTasks.filter(
    (task) => !mine || task.assignee === members[0],
  );
  const assignees = [
    ...new Set(
      projects
        .filter((project) => projectId === "all" || project.id === projectId)
        .flatMap((project) =>
          project.members
            .filter((member) => member.role !== "Viewer")
            .map((member) => member.name),
        ),
    ),
  ].sort();
  const effective = {
    ...preferences,
    project: projectId,
    assignee:
      !mine && assignees.includes(preferences.assignee)
        ? preferences.assignee
        : "all",
    status: data.columns.includes(preferences.status)
      ? preferences.status
      : "all",
  };
  const tasks = selectTasks(
    scoped,
    effective,
    new Date().toLocaleDateString("en-CA"),
  );
  const labels = [
    ...new Set(
      scoped.flatMap((task) =>
        task.labels
          .split(",")
          .map((label) => label.trim())
          .filter(Boolean),
      ),
    ),
  ].sort();
  function set(patch: Partial<TaskViewPreferences>) {
    setViewPreferences(key, patch);
  }
  if (routeProjectId !== "all" && !selectedProject)
    return (
      <>
        <PageHeading title="Project unavailable" />
        <section className="panel">
          <p>This project may have been archived or deleted.</p>
          <Link className="secondary" href="/projects">
            Back to projects
          </Link>
        </section>
      </>
    );

  return (
    <>
      <PageHeading
        title={selectedProject?.name || (mine ? "My tasks" : "Projects")}
        description={selectedProject?.description}
        projectId={projectId === "all" ? undefined : projectId}
      />
      <div className="view-toolbar">
        <div className="tabs">
          {(["Board", "List", "Timeline"] as const).map((tab) => (
            <button
              key={tab}
              aria-pressed={preferences.layout === tab}
              className={preferences.layout === tab ? "selected" : ""}
              onClick={() => set({ layout: tab })}
            >
              <Icon
                name={
                  tab === "Board"
                    ? "board"
                    : tab === "List"
                      ? "list"
                      : "calendar"
                }
                size={16}
              />
              {tab}
            </button>
          ))}
        </div>
        <div className="filter-controls">
          {selectedProject && (
            <button className="secondary" onClick={() => setMembersOpen(true)}>
              Members ({selectedProject.members.length})
            </button>
          )}
          <button className="secondary" onClick={() => setWorkflowOpen(true)}>
            Customize workflow
          </button>
          <button
            className="secondary"
            onClick={() => setEditingProject(selectedProject || "new")}
          >
            {selectedProject ? "Edit project" : "+ Project"}
          </button>
        </div>
      </div>
      <section className="task-filter-bar" aria-label="Task filters">
        <input
          aria-label="Search this view"
          placeholder="Search these tasks..."
          value={preferences.query}
          onChange={(event) => set({ query: event.target.value })}
        />
        <select
          aria-label="Filter project"
          value={projectId}
          onChange={(event) => {
            if (mine) set({ project: event.target.value });
            else
              router.push(
                event.target.value === "all"
                  ? "/projects"
                  : `/projects/${event.target.value}`,
              );
          }}
        >
          <option value="all">All projects</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter priority"
          value={preferences.priority}
          onChange={(event) => set({ priority: event.target.value })}
        >
          <option value="all">All priorities</option>
          {["Low", "Medium", "High", "Urgent"].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select
          aria-label="Filter status"
          value={effective.status}
          onChange={(event) => set({ status: event.target.value })}
        >
          <option value="all">All statuses</option>
          {data.columns.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        {!mine && (
          <select
            aria-label="Filter assignee"
            value={effective.assignee}
            onChange={(event) => set({ assignee: event.target.value })}
          >
            <option value="all">All assignees</option>
            {assignees.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        )}
        <select
          aria-label="Filter label"
          value={preferences.label}
          onChange={(event) => set({ label: event.target.value })}
        >
          <option value="all">All labels</option>
          {labels.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select
          aria-label="Sort tasks"
          value={preferences.sort}
          onChange={(event) =>
            set({ sort: event.target.value as TaskViewPreferences["sort"] })
          }
        >
          <option value="due">Due date</option>
          <option value="priority">Priority</option>
          <option value="title">Title</option>
        </select>
        <label className="overdue-filter">
          <input
            type="checkbox"
            checked={preferences.overdue}
            onChange={(event) => set({ overdue: event.target.checked })}
          />
          Overdue only
        </label>
        <button
          className="text-button"
          onClick={() =>
            set({ ...defaultTaskView, layout: preferences.layout })
          }
        >
          Reset filters
        </button>
      </section>
      <div className="task-result-summary">
        <span>
          {tasks.length} matching task{tasks.length === 1 ? "" : "s"} · View
          preferences are saved
        </span>
        <span
          role="status"
          aria-live="polite"
          aria-label="Task movement update"
        >
          {notice}
        </span>
      </div>
      {preferences.layout === "Board" ? (
        <TaskBoard
          tasks={tasks}
          allTasks={allTasks}
          columns={data.columns}
          projectId={projectId === "all" ? projects[0]?.id || "" : projectId}
          onEdit={setEditingTask}
          onMove={moveTask}
        />
      ) : preferences.layout === "List" ? (
        <section className="panel">
          <TaskTable
            tasks={tasks}
            projects={projects}
            onEdit={setEditingTask}
          />
          {!tasks.length && (
            <p className="empty">No tasks match your filters.</p>
          )}
        </section>
      ) : (
        <GanttTimeline
          tasks={tasks}
          allTasks={allTasks}
          onEdit={setEditingTask}
        />
      )}
      {membersOpen && selectedProject && (
        <ProjectMembers
          project={selectedProject}
          onClose={() => setMembersOpen(false)}
        />
      )}
      {workflowOpen && (
        <WorkflowEditor onClose={() => setWorkflowOpen(false)} />
      )}
    </>
  );
}
