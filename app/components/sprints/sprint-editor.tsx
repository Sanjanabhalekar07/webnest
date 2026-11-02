"use client";

import { useState, type FormEvent } from "react";
import type { SprintDraft } from "@/app/lib/model";
import { useWorkspace } from "@/app/providers/workspace-provider";
import { saveSprint } from "@/app/lib/sprint-rules";
import { Modal } from "../ui/modal";

export function SprintEditor({
  draft,
  onClose,
  onSaved,
}: {
  draft: SprintDraft;
  onClose: () => void;
  onSaved: (id: string, projectId: string) => void;
}) {
  const { data, projects, update } = useWorkspace();
  const [values, setValues] = useState(draft);
  const [error, setError] = useState("");
  const existing = data.sprints.find((sprint) => sprint.id === draft.id);
  const datesLocked = existing?.state === "active";
  function submit(event: FormEvent) {
    event.preventDefault();
    try {
      update(
        (previous) => saveSprint(previous, values),
        `${existing ? "Updated" : "Created"} sprint ${values.name.trim()}`,
      );
      onSaved(values.id, values.projectId);
      onClose();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The sprint could not be saved.",
      );
    }
  }
  return (
    <Modal title={existing ? "Edit sprint" : "Create sprint"} onClose={onClose}>
      <form className="editor" onSubmit={submit}>
        {error && (
          <p role="alert" className="validation-message">
            {error}
          </p>
        )}
        <label>
          Sprint name
          <input
            autoFocus
            required
            maxLength={80}
            value={values.name}
            onChange={(event) =>
              setValues({ ...values, name: event.target.value })
            }
            placeholder="e.g. Sprint 02"
          />
        </label>
        <label>
          Project
          <select
            required
            disabled={datesLocked}
            value={values.projectId}
            onChange={(event) =>
              setValues({ ...values, projectId: event.target.value })
            }
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sprint goal
          <textarea
            rows={3}
            maxLength={1000}
            value={values.goal}
            onChange={(event) =>
              setValues({ ...values, goal: event.target.value })
            }
            placeholder="What should the team achieve?"
          />
        </label>
        <div className="form-grid">
          <label>
            Start date
            <input
              required
              type="date"
              disabled={datesLocked}
              value={values.startDate}
              onChange={(event) =>
                setValues({ ...values, startDate: event.target.value })
              }
            />
          </label>
          <label>
            End date
            <input
              required
              type="date"
              disabled={datesLocked}
              min={values.startDate}
              value={values.endDate}
              onChange={(event) =>
                setValues({ ...values, endDate: event.target.value })
              }
            />
          </label>
        </div>
        <p className="field-hint">
          {datesLocked
            ? "Active sprint dates and project are fixed so the recorded baseline stays meaningful."
            : "Choose an end date after the start date, within 90 days. Each project can have one active sprint."}
        </p>
        <div className="modal-footer">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" type="submit">
            Save sprint
          </button>
        </div>
      </form>
    </Modal>
  );
}
