"use client";

import type { Task } from "@/app/lib/model";

export function TaskRelationships({
  draft,
  tasks,
  onChange,
  onCreateSubtask,
}: {
  draft: Task;
  tasks: Task[];
  onChange: (task: Task) => void;
  onCreateSubtask: () => void;
}) {
  const candidates = tasks.filter(
    (task) => task.projectId === draft.projectId && task.id !== draft.id,
  );
  const children = tasks.filter((task) => task.parentId === draft.id);
  const existing = tasks.some((task) => task.id === draft.id);

  return (
    <>
      <section className="editor-section">
        <label>
          Parent task
          <select
            value={draft.parentId || ""}
            onChange={(event) =>
              onChange({ ...draft, parentId: event.target.value || null })
            }
          >
            <option value="">No parent task</option>
            {candidates.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
        </label>
        <div className="section-heading">
          <strong>
            Subtasks <span className="count">{children.length}</span>
          </strong>
          {existing && (
            <button
              type="button"
              className="text-button"
              disabled={draft.status === "Done"}
              onClick={onCreateSubtask}
            >
              Save and add subtask
            </button>
          )}
        </div>
        {children.map((task) => (
          <div className="relationship-row" key={task.id}>
            <span>{task.title}</span>
            <span className="status-pill">{task.status}</span>
          </div>
        ))}
        {!children.length && (
          <p className="field-hint">
            Create a task and choose a parent, or save this task and add a
            subtask.
          </p>
        )}
        {draft.status === "Done" && (
          <p className="field-hint">
            Reopen this task before adding unfinished subtasks.
          </p>
        )}
      </section>
      <fieldset className="editor-section dependency-options">
        <legend>Depends on</legend>
        <p className="field-hint">
          These tasks must be complete before this task can be marked Done.
        </p>
        {candidates.map((task) => (
          <label className="checklist-row" key={task.id}>
            <input
              type="checkbox"
              checked={draft.dependencies.includes(task.id)}
              onChange={(event) =>
                onChange({
                  ...draft,
                  dependencies: event.target.checked
                    ? [...draft.dependencies, task.id]
                    : draft.dependencies.filter((id) => id !== task.id),
                })
              }
            />
            <span>{task.title}</span>
            <span className="status-pill">{task.status}</span>
          </label>
        ))}
        {!candidates.length && (
          <p className="field-hint">
            Add another task in this project to link a dependency.
          </p>
        )}
      </fieldset>
    </>
  );
}
