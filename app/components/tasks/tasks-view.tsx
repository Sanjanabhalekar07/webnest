"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/app/providers/workspace-provider";
import { members, statuses } from "@/app/lib/model";
import { formatDate, newTask } from "@/app/lib/task-utils";
import { Icon } from "../ui/app-icon";
import { PageHeading } from "../layout/page-heading";
import { TaskTable } from "./task-table";
import { TaskCard } from "./task-card";
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
    update,
    moveTask,
  } = useWorkspace();
  const router = useRouter();
  const [projectFilter, setProjectFilter] = useState("all");
  const projectId = mine ? projectFilter : routeProjectId;
  const [priority, setPriority] = useState("All priorities");
  const [layout, setLayout] = useState("Board");
  const selectedProject = projects.find(
    (project) => project.id === routeProjectId,
  );
  const tasks = allTasks.filter(
    (task) =>
      (projectId === "all" || task.projectId === projectId) &&
      (!mine || task.assignee === members[0]) &&
      (priority === "All priorities" || task.priority === priority),
  );
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
          {["Board", "List", "Timeline"].map((tab) => (
            <button
              key={tab}
              className={layout === tab ? "selected" : ""}
              onClick={() => setLayout(tab)}
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
          <select
            aria-label="Filter project"
            value={projectId}
            onChange={(event) => {
              if (mine) setProjectFilter(event.target.value);
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
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
          >
            {["All priorities", "Low", "Medium", "High", "Urgent"].map(
              (item) => (
                <option key={item}>{item}</option>
              ),
            )}
          </select>
          <button
            className="secondary"
            onClick={() => setEditingProject(selectedProject || "new")}
          >
            {selectedProject ? "Edit project" : "+ Project"}
          </button>
        </div>
      </div>
      {layout === "Board" ? (
        <div className="kanban">
          {statuses.map((status, index) => (
            <section
              className={`kanban-column column-${index}`}
              key={status}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const id = event.dataTransfer.getData("text/plain");
                if (tasks.some((task) => task.id === id)) moveTask(id, status);
              }}
            >
              <h2>
                <span className="status-dot" />
                {status}
                <span className="count">
                  {tasks.filter((task) => task.status === status).length}
                </span>
              </h2>
              {tasks
                .filter((task) => task.status === status)
                .map((task) => (
                  <TaskCard key={task.id} task={task} onEdit={setEditingTask} />
                ))}
              <button
                className="add-task"
                onClick={() =>
                  setEditingTask({
                    ...newTask(
                      projectId === "all" ? projects[0]?.id || "" : projectId,
                    ),
                    status,
                  })
                }
              >
                <Icon name="plus" size={15} /> Add task
              </button>
            </section>
          ))}
        </div>
      ) : layout === "List" ? (
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
        <section className="panel">
          <div className="section-heading">
            <h2>Delivery timeline</h2>
            <span className="muted">Tasks grouped by due date</span>
          </div>
          {[...tasks]
            .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
            .map((task) => (
              <button
                className="timeline-row"
                key={task.id}
                onClick={() => setEditingTask(task)}
              >
                <span>{formatDate(task.dueDate)}</span>
                <strong>{task.title}</strong>
                <span
                  className={`status-pill status-${task.status.replaceAll(" ", "-").toLowerCase()}`}
                >
                  {task.status}
                </span>
              </button>
            ))}
        </section>
      )}
      {!mine &&
        projectId === "all" &&
        data.projects.some((project) => project.archived) && (
          <section className="panel archived-projects">
            <h2>Archived projects</h2>
            {data.projects
              .filter((project) => project.archived)
              .map((project) => (
                <div key={project.id}>
                  <span>{project.name}</span>
                  <button
                    className="text-button"
                    onClick={() =>
                      update(
                        (previous) => ({
                          ...previous,
                          projects: previous.projects.map((item) =>
                            item.id === project.id
                              ? { ...item, archived: false }
                              : item,
                          ),
                        }),
                        `Restored ${project.name}`,
                      )
                    }
                  >
                    Restore
                  </button>
                </div>
              ))}
          </section>
        )}
    </>
  );
}
