"use client";

import { useWorkspace } from "@/app/providers/workspace-provider";
import { PageHeading } from "../layout/page-heading";
import { Icon } from "../ui/app-icon";
import { ProjectCard } from "./project-card";

export function ProjectsView() {
  const { data, projects, allTasks, setEditingProject, update } =
    useWorkspace();
  const archived = data.projects.filter((project) => project.archived);
  return (
    <>
      <PageHeading
        title="Projects"
        description="A home for every idea your team is bringing to life."
      />
      <section className="section">
        <div className="section-heading">
          <h2>
            Active projects <span className="count">{projects.length}</span>
          </h2>
          <button
            className="secondary"
            onClick={() => setEditingProject("new")}
          >
            <Icon name="plus" size={15} />
            Create project
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
          <p className="empty">
            Create a project to start organizing your team’s work.
          </p>
        )}
      </section>
      {archived.length > 0 && (
        <section className="panel archived-projects">
          <h2>Archived projects</h2>
          {archived.map((project) => (
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
