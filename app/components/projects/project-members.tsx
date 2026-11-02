"use client";

import { useState, type FormEvent } from "react";
import { initials, type Project, type ProjectMember } from "@/app/lib/model";
import { changeProjectMembers } from "@/app/lib/project-rules";
import { useWorkspace } from "@/app/providers/workspace-provider";
import { Modal } from "../ui/modal";

export function ProjectMembers({
  project,
  onClose,
}: {
  project: Project;
  onClose: () => void;
}) {
  const { data, update } = useWorkspace();
  const [roster, setRoster] = useState(
    project.members.map((member) => ({ ...member })),
  );
  const [name, setName] = useState("");
  const [role, setRole] = useState<ProjectMember["role"]>("Member");
  const [reassign, setReassign] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const eligible = roster.filter((member) => member.role !== "Viewer");
  const projectTasks = data.tasks.filter(
    (task) => task.projectId === project.id,
  );
  const reassignedNames = [
    ...new Set(
      projectTasks
        .filter(
          (task) => !eligible.some((member) => member.name === task.assignee),
        )
        .map((task) => task.assignee),
    ),
  ];
  function add() {
    const cleaned = name.trim();
    if (
      !cleaned ||
      cleaned.length > 80 ||
      roster.some((member) => member.name === cleaned)
    ) {
      setError("Enter a unique member name of up to 80 characters.");
      return;
    }
    setRoster([...roster, { name: cleaned, role }]);
    setName("");
    setError("");
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    try {
      update(
        (previous) =>
          changeProjectMembers(previous, project.id, roster, reassign),
        `Updated members for ${project.name}`,
      );
      onClose();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Project members could not be updated.",
      );
    }
  }
  return (
    <Modal title={`Members · ${project.name}`} onClose={onClose}>
      <form className="editor" onSubmit={submit}>
        <p className="field-hint">
          Keep at least one Owner. Owners and Members can receive tasks. Viewers
          are listed for visibility and cannot receive task assignments.
        </p>
        {error && (
          <p role="alert" className="validation-message">
            {error}
          </p>
        )}
        <div className="project-members-list">
          {roster.map((member) => (
            <div className="project-member-row" key={member.name}>
              <span className="avatar small">{initials(member.name)}</span>
              <span className="member-name">
                <strong>{member.name}</strong>
                <small>
                  {
                    projectTasks.filter((task) => task.assignee === member.name)
                      .length
                  }{" "}
                  assigned tasks
                </small>
              </span>
              <select
                aria-label={`Role for ${member.name}`}
                value={member.role}
                onChange={(event) =>
                  setRoster(
                    roster.map((item) =>
                      item.name === member.name
                        ? {
                            ...item,
                            role: event.target.value as ProjectMember["role"],
                          }
                        : item,
                    ),
                  )
                }
              >
                {["Owner", "Member", "Viewer"].map((role) => (
                  <option key={role}>{role}</option>
                ))}
              </select>
              <button
                type="button"
                className="text-button"
                disabled={
                  member.role === "Owner" &&
                  roster.filter((item) => item.role === "Owner").length === 1
                }
                aria-label={`Remove ${member.name}`}
                onClick={() =>
                  setRoster(roster.filter((item) => item.name !== member.name))
                }
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <section className="editor-section">
          <strong>Add a project member</strong>
          <div className="member-add-row">
            <input
              aria-label="New member name"
              maxLength={80}
              value={name}
              placeholder="Full name"
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  add();
                }
              }}
            />
            <select
              aria-label="New member role"
              value={role}
              onChange={(event) =>
                setRole(event.target.value as ProjectMember["role"])
              }
            >
              {["Owner", "Member", "Viewer"].map((role) => (
                <option key={role}>{role}</option>
              ))}
            </select>
            <button
              type="button"
              className="secondary"
              disabled={!name.trim()}
              onClick={add}
            >
              Add
            </button>
          </div>
        </section>
        {reassignedNames.length > 0 && (
          <section className="editor-section">
            <strong>Reassign affected tasks</strong>
            <p className="field-hint">
              Removing an assignee or changing them to Viewer requires a
              replacement. Existing completed-sprint reports keep their recorded
              assignees.
            </p>
            {reassignedNames.map((name) => (
              <label key={name}>
                {name} ·{" "}
                {projectTasks.filter((task) => task.assignee === name).length}{" "}
                tasks
                <select
                  required
                  value={
                    Object.prototype.hasOwnProperty.call(reassign, name)
                      ? reassign[name]
                      : ""
                  }
                  onChange={(event) =>
                    setReassign({ ...reassign, [name]: event.target.value })
                  }
                >
                  <option value="">Choose replacement</option>
                  {eligible.map((member) => (
                    <option key={member.name}>{member.name}</option>
                  ))}
                </select>
              </label>
            ))}
          </section>
        )}
        <div className="modal-footer">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary">
            Save members
          </button>
        </div>
      </form>
    </Modal>
  );
}
