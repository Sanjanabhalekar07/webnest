"use client";
import { useState, type FormEvent } from "react";
import {
  defaultAssignee,
  type Task,
  type Project,
  type Status,
  type WorkspaceData,
} from "@/app/lib/model";
import { Modal } from "../ui/modal";
import { saveTask } from "@/app/lib/workspace-rules";
import { TaskRelationships } from "./task-relationships";
import { TaskAttachments } from "./task-attachments";
export default function TaskEditor({
  task,
  projects,
  onClose,
  onSave,
  onDelete,
  workspace,
  onCreateSubtask,
}: {
  task: Task;
  projects: Project[];
  onClose: () => void;
  onSave: (task: Task) => void;
  onDelete: (task: Task) => void;
  workspace: WorkspaceData;
  onCreateSubtask: (task: Task) => void;
}) {
  const [draft, setDraft] = useState(task);
  const [check, setCheck] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  function validatedSave(action: (task: Task) => void) {
    try {
      const cleaned = { ...draft, title: draft.title.trim() };
      saveTask(workspace, cleaned);
      action(cleaned);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Task could not be saved.",
      );
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    validatedSave(onSave);
  }
  return (
    <Modal title={task.title ? task.id : "Create a task"} onClose={onClose}>
      <form onSubmit={submit} className="editor">
        {error && (
          <p className="validation-message" role="alert">
            {error}
          </p>
        )}
        <label>
          Task name
          <input
            autoFocus
            required
            maxLength={160}
            value={draft.title}
            onChange={(event) =>
              setDraft({ ...draft, title: event.target.value })
            }
            placeholder="What needs to get done?"
          />
        </label>
        <label>
          Description
          <textarea
            rows={3}
            value={draft.description}
            onChange={(event) =>
              setDraft({ ...draft, description: event.target.value })
            }
            placeholder="Give your team a little context..."
          />
        </label>
        <div className="form-grid">
          <label>
            Project
            <select
              required
              value={draft.projectId}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  projectId: event.target.value,
                  assignee: defaultAssignee(
                    projects.find(
                      (project) => project.id === event.target.value,
                    ),
                  ),
                  sprint: "Backlog",
                  parentId: null,
                  dependencies: [],
                })
              }
            >
              <option value="" disabled>
                Select a project
              </option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select
              value={draft.status}
              onChange={(event) =>
                setDraft({ ...draft, status: event.target.value as Status })
              }
            >
              {workspace.columns.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select
              value={draft.priority}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  priority: event.target.value as Task["priority"],
                })
              }
            >
              {["Low", "Medium", "High", "Urgent"].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Assignee
            <select
              value={draft.assignee}
              onChange={(event) =>
                setDraft({ ...draft, assignee: event.target.value })
              }
            >
              {(
                projects.find((project) => project.id === draft.projectId)
                  ?.members || []
              )
                .filter((member) => member.role !== "Viewer")
                .map((member) => (
                  <option key={member.name} value={member.name}>
                    {member.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Start date
            <input
              required
              type="date"
              max={draft.dueDate || undefined}
              value={draft.startDate}
              onChange={(event) =>
                setDraft({ ...draft, startDate: event.target.value })
              }
            />
          </label>
          <label>
            Due date
            <input
              required
              type="date"
              min={draft.startDate || undefined}
              value={draft.dueDate}
              onChange={(event) =>
                setDraft({ ...draft, dueDate: event.target.value })
              }
            />
          </label>
          <label>
            Sprint
            <select
              value={draft.sprint}
              onChange={(event) =>
                setDraft({ ...draft, sprint: event.target.value })
              }
            >
              <option value="Backlog">Backlog</option>
              {workspace.sprints
                .filter(
                  (sprint) =>
                    sprint.projectId === draft.projectId &&
                    (sprint.state !== "completed" ||
                      sprint.id === draft.sprint),
                )
                .map((sprint) => (
                  <option
                    key={sprint.id}
                    value={sprint.id}
                    disabled={sprint.state === "completed"}
                  >
                    {sprint.name} · {sprint.state}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <label>
          Labels (comma separated)
          <input
            value={draft.labels}
            onChange={(event) =>
              setDraft({ ...draft, labels: event.target.value })
            }
          />
        </label>
        <TaskRelationships
          draft={draft}
          tasks={workspace.tasks}
          onChange={setDraft}
          onCreateSubtask={() => validatedSave(onCreateSubtask)}
        />
        <TaskAttachments draft={draft} onChange={setDraft} />
        <div className="editor-section">
          <strong>Checklist</strong>
          {draft.checklist.map((item) => (
            <label className="checklist-row" key={item.id}>
              <input
                type="checkbox"
                checked={item.done}
                onChange={() =>
                  setDraft({
                    ...draft,
                    checklist: draft.checklist.map((entry) =>
                      entry.id === item.id
                        ? { ...entry, done: !entry.done }
                        : entry,
                    ),
                  })
                }
              />
              {item.title}
            </label>
          ))}
          <div className="inline-input">
            <input
              aria-label="New checklist item"
              value={check}
              onChange={(event) => setCheck(event.target.value)}
              placeholder="Add a checklist item"
            />
            <button
              type="button"
              className="secondary"
              disabled={!check.trim()}
              onClick={() => {
                setDraft({
                  ...draft,
                  checklist: [
                    ...draft.checklist,
                    {
                      id: crypto.randomUUID(),
                      title: check.trim(),
                      done: false,
                    },
                  ],
                });
                setCheck("");
              }}
            >
              Add
            </button>
          </div>
        </div>
        <div className="editor-section">
          <strong>Comments</strong>
          {draft.comments.map((item) => (
            <div className="comment" key={item.id}>
              <small>
                Alex Morgan · {new Date(item.date).toLocaleDateString()}
              </small>
              <p>{item.text}</p>
            </div>
          ))}
          <div className="inline-input">
            <input
              aria-label="New comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Share an update..."
            />
            <button
              type="button"
              className="secondary"
              disabled={!comment.trim()}
              onClick={() => {
                setDraft({
                  ...draft,
                  comments: [
                    ...draft.comments,
                    {
                      id: crypto.randomUUID(),
                      text: comment.trim(),
                      date: new Date().toISOString(),
                    },
                  ],
                });
                setComment("");
              }}
            >
              Add
            </button>
          </div>
        </div>
        <div className="modal-footer">
          {task.title && (
            <button
              className="danger-button"
              type="button"
              onClick={() => {
                if (window.confirm("Delete this task?")) onDelete(task);
              }}
            >
              Delete task
            </button>
          )}
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" type="submit">
            Save task
          </button>
        </div>
      </form>
    </Modal>
  );
}
