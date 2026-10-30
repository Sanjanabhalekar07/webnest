"use client";

import Link from "next/link";
import { initials, members, type Project, type Task } from "@/app/lib/model";
import { percent } from "@/app/lib/task-utils";
import { Icon } from "../ui/app-icon";

export function ProjectCard({
  project,
  tasks,
  onEdit,
}: {
  project: Project;
  tasks: Task[];
  onEdit: (project: Project) => void;
}) {
  const completed = tasks.filter((task) => task.status === "Done").length;
  const progress = percent(tasks);
  return (
    <article className="project-card">
      <div className="project-card-top">
        <span
          className="project-symbol"
          style={{ background: `${project.color}18`, color: project.color }}
        >
          <Icon name="folder" size={23} />
        </span>
        <button
          className="more-button"
          aria-label={`Edit ${project.name}`}
          onClick={() => onEdit(project)}
        >
          ···
        </button>
      </div>
      <Link className="project-title" href={`/projects/${project.id}`}>
        {project.name}
      </Link>
      <p>{project.description}</p>
      <div className="progress-label">
        <span>Progress</span>
        <strong>{progress}%</strong>
      </div>
      <div className="progress-track">
        <span style={{ width: `${progress}%`, background: project.color }} />
      </div>
      <div className="project-card-footer">
        <div className="avatar-stack">
          {members.slice(0, 3).map((member, index) => (
            <span
              className={`avatar small avatar-${index}`}
              key={member}
              title={member}
            >
              {initials(member)}
            </span>
          ))}
          <span className="extra-members">+1</span>
        </div>
        <span>
          <Icon name="check" size={14} />
          {completed}/{tasks.length} tasks
        </span>
      </div>
    </article>
  );
}
