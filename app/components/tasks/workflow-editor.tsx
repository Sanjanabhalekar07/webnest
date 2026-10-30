"use client";

import { useState, type FormEvent } from "react";
import { useWorkspace } from "@/app/providers/workspace-provider";
import { Modal } from "../ui/modal";

export function WorkflowEditor({ onClose }: { onClose: () => void }) {
  const { data, setWorkflow } = useWorkspace();
  const [rows, setRows] = useState(
    data.columns.map((name) => ({ id: name, name })),
  );
  const [removed, setRemoved] = useState<Record<string, string>>({});
  const [destination, setDestination] = useState(rows[0].id);
  const [error, setError] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    try {
      function resolve(id: string, visited = new Set<string>()): string {
        const row = rows.find((row) => row.id === id);
        if (row) return row.name.trim();
        if (visited.has(id) || !removed[id])
          throw new Error("Choose a valid destination for removed columns.");
        visited.add(id);
        return resolve(removed[id], visited);
      }
      const mapping = Object.fromEntries(
        data.columns.map((name) => [name, resolve(name)]),
      );
      setWorkflow(
        rows.map((row) => row.name.trim()),
        mapping,
      );
      onClose();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The workflow could not be saved.",
      );
    }
  }
  function reorder(index: number, direction: number) {
    const next = [...rows];
    [next[index], next[index + direction]] = [
      next[index + direction],
      next[index],
    ];
    setRows(next);
  }
  return (
    <Modal title="Customize workflow" onClose={onClose}>
      <form className="editor" onSubmit={submit}>
        <p className="field-hint">
          This workflow is shared across all projects. Renaming a column updates
          its tasks. Done is the completion column and always stays available.
        </p>
        {error && (
          <p className="validation-message" role="alert">
            {error}
          </p>
        )}
        <label>
          Move tasks from removed columns to
          <select
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
          >
            {rows.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name || "Unnamed column"}
              </option>
            ))}
          </select>
        </label>
        {rows.map((row, index) => (
          <div className="workflow-row" key={row.id}>
            <input
              aria-label={`Column ${index + 1} name`}
              required
              maxLength={40}
              value={row.name}
              disabled={row.id === "Done"}
              onChange={(event) =>
                setRows(
                  rows.map((item) =>
                    item.id === row.id
                      ? { ...item, name: event.target.value }
                      : item,
                  ),
                )
              }
            />
            <button
              type="button"
              className="secondary"
              aria-label={`Move ${row.name} left`}
              disabled={index === 0}
              onClick={() => reorder(index, -1)}
            >
              ←
            </button>
            <button
              type="button"
              className="secondary"
              aria-label={`Move ${row.name} right`}
              disabled={index === rows.length - 1}
              onClick={() => reorder(index, 1)}
            >
              →
            </button>
            <button
              type="button"
              className="text-button"
              disabled={
                row.id === "Done" || row.id === destination || rows.length <= 2
              }
              onClick={() => {
                setRemoved({ ...removed, [row.id]: destination });
                setRows(rows.filter((item) => item.id !== row.id));
              }}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className="secondary"
          disabled={rows.length >= 10}
          onClick={() =>
            setRows([...rows, { id: crypto.randomUUID(), name: "" }])
          }
        >
          + Add column
        </button>
        <div className="modal-footer">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" type="submit">
            Save workflow
          </button>
        </div>
      </form>
    </Modal>
  );
}
