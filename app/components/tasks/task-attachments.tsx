"use client";

import { useState, type ChangeEvent } from "react";
import type { Task } from "@/app/lib/model";
import { validateAttachment } from "@/app/lib/workspace-rules";

export function TaskAttachments({
  draft,
  onChange,
}: {
  draft: Task;
  onChange: (task: Task) => void;
}) {
  const [error, setError] = useState("");
  function add(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    try {
      if (draft.attachments.length + files.length > 5)
        throw new Error("Each task can have up to 5 attachments.");
      files.forEach(validateAttachment);
      onChange({
        ...draft,
        attachments: [
          ...draft.attachments,
          ...files.map((file) => ({
            id: crypto.randomUUID(),
            name: file.name,
            size: file.size,
            type: file.type || "application/octet-stream",
            date: new Date().toISOString(),
          })),
        ],
      });
      setError("");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The files could not be added.",
      );
    }
  }
  return (
    <section className="editor-section">
      <strong>
        Attachments <span className="count">{draft.attachments.length}/5</span>
      </strong>
      <p className="field-hint">
        Simulated attachments save the file name, size, and type. File contents
        are never uploaded or stored. Up to 10 MB per file.
      </p>
      <label className="attachment-picker">
        Add files
        <input
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.csv,.md,.docx,.xlsx,.pptx"
          onChange={add}
        />
      </label>
      {error && (
        <p className="validation-message" role="alert">
          {error}
        </p>
      )}
      {draft.attachments.map((file) => (
        <div className="relationship-row" key={file.id}>
          <span>
            <strong>{file.name}</strong>
            <small className="field-hint">
              {Math.ceil(file.size / 1024)} KB · {file.type}
            </small>
          </span>
          <button
            type="button"
            className="text-button"
            aria-label={`Remove ${file.name}`}
            onClick={() =>
              onChange({
                ...draft,
                attachments: draft.attachments.filter(
                  (item) => item.id !== file.id,
                ),
              })
            }
          >
            Remove
          </button>
        </div>
      ))}
    </section>
  );
}
