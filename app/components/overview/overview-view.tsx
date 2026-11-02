"use client";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/app/providers/workspace-provider";
import { percent, isOverdue } from "@/app/lib/task-utils";
import { Icon } from "../ui/app-icon";
import { TaskTable } from "../tasks/task-table";
import { ProjectCard } from "../projects/project-card";
import { PageHeading } from "../layout/page-heading";
export function OverviewView() {
  const { data, projects, allTasks, setEditingTask, setEditingProject } =
    useWorkspace();
  const router = useRouter();
  const upcoming = [...allTasks]
    .filter((task) => task.status !== "Done")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);
  return (
    <>
      <PageHeading
        title="Let's make things happen, Alex"
        description="Here's what's happening with your projects today."
        overview
      />
      <section className="stats-grid">
        {[
          {
            title: "Total projects",
            value: projects.length,
            icon: "folder",
            detail: "Across your workspace",
            color: "purple",
          },
          {
            title: "Tasks completed",
            value: allTasks.filter((task) => task.status === "Done").length,
            icon: "check",
            detail: `${percent(allTasks)}% of all tasks completed`,
            color: "green",
          },
          {
            title: "Open tasks",
            value: allTasks.filter((task) => task.status !== "Done").length,
            icon: "clock",
            detail: "Great things in the making",
            color: "blue",
          },
          {
            title: "Overdue tasks",
            value: allTasks.filter(isOverdue).length,
            icon: "flag",
            detail: "A little attention needed",
            color: "orange",
          },
        ].map((stat) => (
          <article className="stat-card" key={stat.title}>
            <span className={`stat-icon ${stat.color}`}>
              <Icon name={stat.icon} />
            </span>
            <span className="stat-title">{stat.title}</span>
            <strong>{stat.value.toString().padStart(2, "0")}</strong>
            <small>{stat.detail}</small>
          </article>
        ))}
      </section>
      <section className="section">
        <div className="section-heading">
          <h2>
            Your projects <span className="count">{projects.length}</span>
          </h2>
          <button
            className="text-button"
            onClick={() => router.push("/projects")}
          >
            View all projects <Icon name="arrow" size={16} />
          </button>
        </div>
        <div className="projects-grid">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              tasks={allTasks.filter((task) => task.projectId === project.id)}
              onEdit={setEditingProject}
            />
          ))}
        </div>
        {!projects.length && (
          <button
            className="secondary"
            onClick={() => setEditingProject("new")}
          >
            Create your first project
          </button>
        )}
      </section>
      <div className="overview-bottom">
        <section className="panel">
          <div className="section-heading">
            <h2>Coming up next</h2>
            <span className="muted">By due date</span>
          </div>
          <TaskTable
            tasks={upcoming}
            projects={projects}
            onEdit={setEditingTask}
          />
          {!upcoming.length && <p className="empty">You’re all caught up.</p>}
        </section>
        <section className="panel activity-panel">
          <div className="section-heading">
            <h2>Workspace activity</h2>
            <button
              className="text-button"
              onClick={() => router.push("/activity")}
            >
              View all
            </button>
          </div>
          {data.activity.slice(0, 4).map((event) => (
            <div className="activity-item" key={event.id}>
              <span
                className="activity-bullet"
                title={event.readAt === null ? "Unread update" : "Read update"}
              >
                <Icon name="check" size={16} />
              </span>
              <div>
                <p>{event.text}</p>
                <small>
                  {new Date(event.date).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </small>
              </div>
            </div>
          ))}
          <div className="team-note">
            <span>✦</span> Great work happens together.
          </div>
        </section>
      </div>
    </>
  );
}
